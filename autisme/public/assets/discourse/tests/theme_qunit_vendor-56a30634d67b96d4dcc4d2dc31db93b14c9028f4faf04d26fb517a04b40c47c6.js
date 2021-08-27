(function() {
  var lastReport = null;

  if (!window.Logster) {
    window.Logster = {
      enabled: true
    };
  }

  window.onerror = function(message, url, line, column, errorObj) {
    // never bother reporting more than once a minute
    if (lastReport && new Date() - lastReport < 1000 * 60) {
      return;
    }
    if (!Logster.enabled) {
      return;
    }

    lastReport = new Date();

    var err = {
      message: message,
      url: url,
      line: line,
      column: column,
      window_location: window.location && (window.location + "")
    };

    if (errorObj && errorObj.stack) {
      err.stacktrace = errorObj.stack;
    }

    $.ajax("/logs" + "/report_js_error", {
      data: err,
      type: "POST",
      cache: false
    });
  };
})();
/**!

 @license
 handlebars v4.7.7

Copyright (C) 2011-2019 by Yehuda Katz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["Handlebars"] = factory();
	else
		root["Handlebars"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireWildcard = __webpack_require__(1)['default'];

	var _interopRequireDefault = __webpack_require__(2)['default'];

	exports.__esModule = true;

	var _handlebarsBase = __webpack_require__(3);

	var base = _interopRequireWildcard(_handlebarsBase);

	// Each of these augment the Handlebars object. No need to setup here.
	// (This is done to easily share code between commonjs and browse envs)

	var _handlebarsSafeString = __webpack_require__(36);

	var _handlebarsSafeString2 = _interopRequireDefault(_handlebarsSafeString);

	var _handlebarsException = __webpack_require__(5);

	var _handlebarsException2 = _interopRequireDefault(_handlebarsException);

	var _handlebarsUtils = __webpack_require__(4);

	var Utils = _interopRequireWildcard(_handlebarsUtils);

	var _handlebarsRuntime = __webpack_require__(37);

	var runtime = _interopRequireWildcard(_handlebarsRuntime);

	var _handlebarsNoConflict = __webpack_require__(43);

	var _handlebarsNoConflict2 = _interopRequireDefault(_handlebarsNoConflict);

	// For compatibility and usage outside of module systems, make the Handlebars object a namespace
	function create() {
	  var hb = new base.HandlebarsEnvironment();

	  Utils.extend(hb, base);
	  hb.SafeString = _handlebarsSafeString2['default'];
	  hb.Exception = _handlebarsException2['default'];
	  hb.Utils = Utils;
	  hb.escapeExpression = Utils.escapeExpression;

	  hb.VM = runtime;
	  hb.template = function (spec) {
	    return runtime.template(spec, hb);
	  };

	  return hb;
	}

	var inst = create();
	inst.create = create;

	_handlebarsNoConflict2['default'](inst);

	inst['default'] = inst;

	exports['default'] = inst;
	module.exports = exports['default'];

/***/ }),
/* 1 */
/***/ (function(module, exports) {

	"use strict";

	exports["default"] = function (obj) {
	  if (obj && obj.__esModule) {
	    return obj;
	  } else {
	    var newObj = {};

	    if (obj != null) {
	      for (var key in obj) {
	        if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
	      }
	    }

	    newObj["default"] = obj;
	    return newObj;
	  }
	};

	exports.__esModule = true;

/***/ }),
/* 2 */
/***/ (function(module, exports) {

	"use strict";

	exports["default"] = function (obj) {
	  return obj && obj.__esModule ? obj : {
	    "default": obj
	  };
	};

	exports.__esModule = true;

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(2)['default'];

	exports.__esModule = true;
	exports.HandlebarsEnvironment = HandlebarsEnvironment;

	var _utils = __webpack_require__(4);

	var _exception = __webpack_require__(5);

	var _exception2 = _interopRequireDefault(_exception);

	var _helpers = __webpack_require__(9);

	var _decorators = __webpack_require__(29);

	var _logger = __webpack_require__(31);

	var _logger2 = _interopRequireDefault(_logger);

	var _internalProtoAccess = __webpack_require__(32);

	var VERSION = '4.7.7';
	exports.VERSION = VERSION;
	var COMPILER_REVISION = 8;
	exports.COMPILER_REVISION = COMPILER_REVISION;
	var LAST_COMPATIBLE_COMPILER_REVISION = 7;

	exports.LAST_COMPATIBLE_COMPILER_REVISION = LAST_COMPATIBLE_COMPILER_REVISION;
	var REVISION_CHANGES = {
	  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
	  2: '== 1.0.0-rc.3',
	  3: '== 1.0.0-rc.4',
	  4: '== 1.x.x',
	  5: '== 2.0.0-alpha.x',
	  6: '>= 2.0.0-beta.1',
	  7: '>= 4.0.0 <4.3.0',
	  8: '>= 4.3.0'
	};

	exports.REVISION_CHANGES = REVISION_CHANGES;
	var objectType = '[object Object]';

	function HandlebarsEnvironment(helpers, partials, decorators) {
	  this.helpers = helpers || {};
	  this.partials = partials || {};
	  this.decorators = decorators || {};

	  _helpers.registerDefaultHelpers(this);
	  _decorators.registerDefaultDecorators(this);
	}

	HandlebarsEnvironment.prototype = {
	  constructor: HandlebarsEnvironment,

	  logger: _logger2['default'],
	  log: _logger2['default'].log,

	  registerHelper: function registerHelper(name, fn) {
	    if (_utils.toString.call(name) === objectType) {
	      if (fn) {
	        throw new _exception2['default']('Arg not supported with multiple helpers');
	      }
	      _utils.extend(this.helpers, name);
	    } else {
	      this.helpers[name] = fn;
	    }
	  },
	  unregisterHelper: function unregisterHelper(name) {
	    delete this.helpers[name];
	  },

	  registerPartial: function registerPartial(name, partial) {
	    if (_utils.toString.call(name) === objectType) {
	      _utils.extend(this.partials, name);
	    } else {
	      if (typeof partial === 'undefined') {
	        throw new _exception2['default']('Attempting to register a partial called "' + name + '" as undefined');
	      }
	      this.partials[name] = partial;
	    }
	  },
	  unregisterPartial: function unregisterPartial(name) {
	    delete this.partials[name];
	  },

	  registerDecorator: function registerDecorator(name, fn) {
	    if (_utils.toString.call(name) === objectType) {
	      if (fn) {
	        throw new _exception2['default']('Arg not supported with multiple decorators');
	      }
	      _utils.extend(this.decorators, name);
	    } else {
	      this.decorators[name] = fn;
	    }
	  },
	  unregisterDecorator: function unregisterDecorator(name) {
	    delete this.decorators[name];
	  },
	  /**
	   * Reset the memory of illegal property accesses that have already been logged.
	   * @deprecated should only be used in handlebars test-cases
	   */
	  resetLoggedPropertyAccesses: function resetLoggedPropertyAccesses() {
	    _internalProtoAccess.resetLoggedProperties();
	  }
	};

	var log = _logger2['default'].log;

	exports.log = log;
	exports.createFrame = _utils.createFrame;
	exports.logger = _logger2['default'];

/***/ }),
/* 4 */
/***/ (function(module, exports) {

	'use strict';

	exports.__esModule = true;
	exports.extend = extend;
	exports.indexOf = indexOf;
	exports.escapeExpression = escapeExpression;
	exports.isEmpty = isEmpty;
	exports.createFrame = createFrame;
	exports.blockParams = blockParams;
	exports.appendContextPath = appendContextPath;
	var escape = {
	  '&': '&amp;',
	  '<': '&lt;',
	  '>': '&gt;',
	  '"': '&quot;',
	  "'": '&#x27;',
	  '`': '&#x60;',
	  '=': '&#x3D;'
	};

	var badChars = /[&<>"'`=]/g,
	    possible = /[&<>"'`=]/;

	function escapeChar(chr) {
	  return escape[chr];
	}

	function extend(obj /* , ...source */) {
	  for (var i = 1; i < arguments.length; i++) {
	    for (var key in arguments[i]) {
	      if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
	        obj[key] = arguments[i][key];
	      }
	    }
	  }

	  return obj;
	}

	var toString = Object.prototype.toString;

	exports.toString = toString;
	// Sourced from lodash
	// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
	/* eslint-disable func-style */
	var isFunction = function isFunction(value) {
	  return typeof value === 'function';
	};
	// fallback for older versions of Chrome and Safari
	/* istanbul ignore next */
	if (isFunction(/x/)) {
	  exports.isFunction = isFunction = function (value) {
	    return typeof value === 'function' && toString.call(value) === '[object Function]';
	  };
	}
	exports.isFunction = isFunction;

	/* eslint-enable func-style */

	/* istanbul ignore next */
	var isArray = Array.isArray || function (value) {
	  return value && typeof value === 'object' ? toString.call(value) === '[object Array]' : false;
	};

	exports.isArray = isArray;
	// Older IE versions do not directly support indexOf so we must implement our own, sadly.

	function indexOf(array, value) {
	  for (var i = 0, len = array.length; i < len; i++) {
	    if (array[i] === value) {
	      return i;
	    }
	  }
	  return -1;
	}

	function escapeExpression(string) {
	  if (typeof string !== 'string') {
	    // don't escape SafeStrings, since they're already safe
	    if (string && string.toHTML) {
	      return string.toHTML();
	    } else if (string == null) {
	      return '';
	    } else if (!string) {
	      return string + '';
	    }

	    // Force a string conversion as this will be done by the append regardless and
	    // the regex test will do this transparently behind the scenes, causing issues if
	    // an object's to string has escaped characters in it.
	    string = '' + string;
	  }

	  if (!possible.test(string)) {
	    return string;
	  }
	  return string.replace(badChars, escapeChar);
	}

	function isEmpty(value) {
	  if (!value && value !== 0) {
	    return true;
	  } else if (isArray(value) && value.length === 0) {
	    return true;
	  } else {
	    return false;
	  }
	}

	function createFrame(object) {
	  var frame = extend({}, object);
	  frame._parent = object;
	  return frame;
	}

	function blockParams(params, ids) {
	  params.path = ids;
	  return params;
	}

	function appendContextPath(contextPath, id) {
	  return (contextPath ? contextPath + '.' : '') + id;
	}

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _Object$defineProperty = __webpack_require__(6)['default'];

	exports.__esModule = true;
	var errorProps = ['description', 'fileName', 'lineNumber', 'endLineNumber', 'message', 'name', 'number', 'stack'];

	function Exception(message, node) {
	  var loc = node && node.loc,
	      line = undefined,
	      endLineNumber = undefined,
	      column = undefined,
	      endColumn = undefined;

	  if (loc) {
	    line = loc.start.line;
	    endLineNumber = loc.end.line;
	    column = loc.start.column;
	    endColumn = loc.end.column;

	    message += ' - ' + line + ':' + column;
	  }

	  var tmp = Error.prototype.constructor.call(this, message);

	  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
	  for (var idx = 0; idx < errorProps.length; idx++) {
	    this[errorProps[idx]] = tmp[errorProps[idx]];
	  }

	  /* istanbul ignore else */
	  if (Error.captureStackTrace) {
	    Error.captureStackTrace(this, Exception);
	  }

	  try {
	    if (loc) {
	      this.lineNumber = line;
	      this.endLineNumber = endLineNumber;

	      // Work around issue under safari where we can't directly set the column value
	      /* istanbul ignore next */
	      if (_Object$defineProperty) {
	        Object.defineProperty(this, 'column', {
	          value: column,
	          enumerable: true
	        });
	        Object.defineProperty(this, 'endColumn', {
	          value: endColumn,
	          enumerable: true
	        });
	      } else {
	        this.column = column;
	        this.endColumn = endColumn;
	      }
	    }
	  } catch (nop) {
	    /* Ignore if the browser is very particular */
	  }
	}

	Exception.prototype = new Error();

	exports['default'] = Exception;
	module.exports = exports['default'];

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = { "default": __webpack_require__(7), __esModule: true };

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	var $ = __webpack_require__(8);
	module.exports = function defineProperty(it, key, desc){
	  return $.setDesc(it, key, desc);
	};

/***/ }),
/* 8 */
/***/ (function(module, exports) {

	var $Object = Object;
	module.exports = {
	  create:     $Object.create,
	  getProto:   $Object.getPrototypeOf,
	  isEnum:     {}.propertyIsEnumerable,
	  getDesc:    $Object.getOwnPropertyDescriptor,
	  setDesc:    $Object.defineProperty,
	  setDescs:   $Object.defineProperties,
	  getKeys:    $Object.keys,
	  getNames:   $Object.getOwnPropertyNames,
	  getSymbols: $Object.getOwnPropertySymbols,
	  each:       [].forEach
	};

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(2)['default'];

	exports.__esModule = true;
	exports.registerDefaultHelpers = registerDefaultHelpers;
	exports.moveHelperToHooks = moveHelperToHooks;

	var _helpersBlockHelperMissing = __webpack_require__(10);

	var _helpersBlockHelperMissing2 = _interopRequireDefault(_helpersBlockHelperMissing);

	var _helpersEach = __webpack_require__(11);

	var _helpersEach2 = _interopRequireDefault(_helpersEach);

	var _helpersHelperMissing = __webpack_require__(24);

	var _helpersHelperMissing2 = _interopRequireDefault(_helpersHelperMissing);

	var _helpersIf = __webpack_require__(25);

	var _helpersIf2 = _interopRequireDefault(_helpersIf);

	var _helpersLog = __webpack_require__(26);

	var _helpersLog2 = _interopRequireDefault(_helpersLog);

	var _helpersLookup = __webpack_require__(27);

	var _helpersLookup2 = _interopRequireDefault(_helpersLookup);

	var _helpersWith = __webpack_require__(28);

	var _helpersWith2 = _interopRequireDefault(_helpersWith);

	function registerDefaultHelpers(instance) {
	  _helpersBlockHelperMissing2['default'](instance);
	  _helpersEach2['default'](instance);
	  _helpersHelperMissing2['default'](instance);
	  _helpersIf2['default'](instance);
	  _helpersLog2['default'](instance);
	  _helpersLookup2['default'](instance);
	  _helpersWith2['default'](instance);
	}

	function moveHelperToHooks(instance, helperName, keepHelper) {
	  if (instance.helpers[helperName]) {
	    instance.hooks[helperName] = instance.helpers[helperName];
	    if (!keepHelper) {
	      delete instance.helpers[helperName];
	    }
	  }
	}

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _utils = __webpack_require__(4);

	exports['default'] = function (instance) {
	  instance.registerHelper('blockHelperMissing', function (context, options) {
	    var inverse = options.inverse,
	        fn = options.fn;

	    if (context === true) {
	      return fn(this);
	    } else if (context === false || context == null) {
	      return inverse(this);
	    } else if (_utils.isArray(context)) {
	      if (context.length > 0) {
	        if (options.ids) {
	          options.ids = [options.name];
	        }

	        return instance.helpers.each(context, options);
	      } else {
	        return inverse(this);
	      }
	    } else {
	      if (options.data && options.ids) {
	        var data = _utils.createFrame(options.data);
	        data.contextPath = _utils.appendContextPath(options.data.contextPath, options.name);
	        options = { data: data };
	      }

	      return fn(context, options);
	    }
	  });
	};

	module.exports = exports['default'];

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	var _Object$keys = __webpack_require__(12)['default'];

	var _interopRequireDefault = __webpack_require__(2)['default'];

	exports.__esModule = true;

	var _utils = __webpack_require__(4);

	var _exception = __webpack_require__(5);

	var _exception2 = _interopRequireDefault(_exception);

	exports['default'] = function (instance) {
	  instance.registerHelper('each', function (context, options) {
	    if (!options) {
	      throw new _exception2['default']('Must pass iterator to #each');
	    }

	    var fn = options.fn,
	        inverse = options.inverse,
	        i = 0,
	        ret = '',
	        data = undefined,
	        contextPath = undefined;

	    if (options.data && options.ids) {
	      contextPath = _utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
	    }

	    if (_utils.isFunction(context)) {
	      context = context.call(this);
	    }

	    if (options.data) {
	      data = _utils.createFrame(options.data);
	    }

	    function execIteration(field, index, last) {
	      if (data) {
	        data.key = field;
	        data.index = index;
	        data.first = index === 0;
	        data.last = !!last;

	        if (contextPath) {
	          data.contextPath = contextPath + field;
	        }
	      }

	      ret = ret + fn(context[field], {
	        data: data,
	        blockParams: _utils.blockParams([context[field], field], [contextPath + field, null])
	      });
	    }

	    if (context && typeof context === 'object') {
	      if (_utils.isArray(context)) {
	        for (var j = context.length; i < j; i++) {
	          if (i in context) {
	            execIteration(i, i, i === context.length - 1);
	          }
	        }
	      } else if (global.Symbol && context[global.Symbol.iterator]) {
	        var newContext = [];
	        var iterator = context[global.Symbol.iterator]();
	        for (var it = iterator.next(); !it.done; it = iterator.next()) {
	          newContext.push(it.value);
	        }
	        context = newContext;
	        for (var j = context.length; i < j; i++) {
	          execIteration(i, i, i === context.length - 1);
	        }
	      } else {
	        (function () {
	          var priorKey = undefined;

	          _Object$keys(context).forEach(function (key) {
	            // We're running the iterations one step out of sync so we can detect
	            // the last iteration without have to scan the object twice and create
	            // an itermediate keys array.
	            if (priorKey !== undefined) {
	              execIteration(priorKey, i - 1);
	            }
	            priorKey = key;
	            i++;
	          });
	          if (priorKey !== undefined) {
	            execIteration(priorKey, i - 1, true);
	          }
	        })();
	      }
	    }

	    if (i === 0) {
	      ret = inverse(this);
	    }

	    return ret;
	  });
	};

	module.exports = exports['default'];
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = { "default": __webpack_require__(13), __esModule: true };

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	__webpack_require__(14);
	module.exports = __webpack_require__(20).Object.keys;

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	// 19.1.2.14 Object.keys(O)
	var toObject = __webpack_require__(15);

	__webpack_require__(17)('keys', function($keys){
	  return function keys(it){
	    return $keys(toObject(it));
	  };
	});

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	// 7.1.13 ToObject(argument)
	var defined = __webpack_require__(16);
	module.exports = function(it){
	  return Object(defined(it));
	};

/***/ }),
/* 16 */
/***/ (function(module, exports) {

	// 7.2.1 RequireObjectCoercible(argument)
	module.exports = function(it){
	  if(it == undefined)throw TypeError("Can't call method on  " + it);
	  return it;
	};

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	// most Object methods by ES6 should accept primitives
	var $export = __webpack_require__(18)
	  , core    = __webpack_require__(20)
	  , fails   = __webpack_require__(23);
	module.exports = function(KEY, exec){
	  var fn  = (core.Object || {})[KEY] || Object[KEY]
	    , exp = {};
	  exp[KEY] = exec(fn);
	  $export($export.S + $export.F * fails(function(){ fn(1); }), 'Object', exp);
	};

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

	var global    = __webpack_require__(19)
	  , core      = __webpack_require__(20)
	  , ctx       = __webpack_require__(21)
	  , PROTOTYPE = 'prototype';

	var $export = function(type, name, source){
	  var IS_FORCED = type & $export.F
	    , IS_GLOBAL = type & $export.G
	    , IS_STATIC = type & $export.S
	    , IS_PROTO  = type & $export.P
	    , IS_BIND   = type & $export.B
	    , IS_WRAP   = type & $export.W
	    , exports   = IS_GLOBAL ? core : core[name] || (core[name] = {})
	    , target    = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE]
	    , key, own, out;
	  if(IS_GLOBAL)source = name;
	  for(key in source){
	    // contains in native
	    own = !IS_FORCED && target && key in target;
	    if(own && key in exports)continue;
	    // export native or passed
	    out = own ? target[key] : source[key];
	    // prevent global pollution for namespaces
	    exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key]
	    // bind timers to global for call from export context
	    : IS_BIND && own ? ctx(out, global)
	    // wrap global constructors for prevent change them in library
	    : IS_WRAP && target[key] == out ? (function(C){
	      var F = function(param){
	        return this instanceof C ? new C(param) : C(param);
	      };
	      F[PROTOTYPE] = C[PROTOTYPE];
	      return F;
	    // make static versions for prototype methods
	    })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
	    if(IS_PROTO)(exports[PROTOTYPE] || (exports[PROTOTYPE] = {}))[key] = out;
	  }
	};
	// type bitmap
	$export.F = 1;  // forced
	$export.G = 2;  // global
	$export.S = 4;  // static
	$export.P = 8;  // proto
	$export.B = 16; // bind
	$export.W = 32; // wrap
	module.exports = $export;

/***/ }),
/* 19 */
/***/ (function(module, exports) {

	// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
	var global = module.exports = typeof window != 'undefined' && window.Math == Math
	  ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
	if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef

/***/ }),
/* 20 */
/***/ (function(module, exports) {

	var core = module.exports = {version: '1.2.6'};
	if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef

/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

	// optional / simple context binding
	var aFunction = __webpack_require__(22);
	module.exports = function(fn, that, length){
	  aFunction(fn);
	  if(that === undefined)return fn;
	  switch(length){
	    case 1: return function(a){
	      return fn.call(that, a);
	    };
	    case 2: return function(a, b){
	      return fn.call(that, a, b);
	    };
	    case 3: return function(a, b, c){
	      return fn.call(that, a, b, c);
	    };
	  }
	  return function(/* ...args */){
	    return fn.apply(that, arguments);
	  };
	};

/***/ }),
/* 22 */
/***/ (function(module, exports) {

	module.exports = function(it){
	  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
	  return it;
	};

/***/ }),
/* 23 */
/***/ (function(module, exports) {

	module.exports = function(exec){
	  try {
	    return !!exec();
	  } catch(e){
	    return true;
	  }
	};

/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(2)['default'];

	exports.__esModule = true;

	var _exception = __webpack_require__(5);

	var _exception2 = _interopRequireDefault(_exception);

	exports['default'] = function (instance) {
	  instance.registerHelper('helperMissing', function () /* [args, ]options */{
	    if (arguments.length === 1) {
	      // A missing field in a {{foo}} construct.
	      return undefined;
	    } else {
	      // Someone is actually trying to call something, blow up.
	      throw new _exception2['default']('Missing helper: "' + arguments[arguments.length - 1].name + '"');
	    }
	  });
	};

	module.exports = exports['default'];

/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(2)['default'];

	exports.__esModule = true;

	var _utils = __webpack_require__(4);

	var _exception = __webpack_require__(5);

	var _exception2 = _interopRequireDefault(_exception);

	exports['default'] = function (instance) {
	  instance.registerHelper('if', function (conditional, options) {
	    if (arguments.length != 2) {
	      throw new _exception2['default']('#if requires exactly one argument');
	    }
	    if (_utils.isFunction(conditional)) {
	      conditional = conditional.call(this);
	    }

	    // Default behavior is to render the positive path if the value is truthy and not empty.
	    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
	    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
	    if (!options.hash.includeZero && !conditional || _utils.isEmpty(conditional)) {
	      return options.inverse(this);
	    } else {
	      return options.fn(this);
	    }
	  });

	  instance.registerHelper('unless', function (conditional, options) {
	    if (arguments.length != 2) {
	      throw new _exception2['default']('#unless requires exactly one argument');
	    }
	    return instance.helpers['if'].call(this, conditional, {
	      fn: options.inverse,
	      inverse: options.fn,
	      hash: options.hash
	    });
	  });
	};

	module.exports = exports['default'];

/***/ }),
/* 26 */
/***/ (function(module, exports) {

	'use strict';

	exports.__esModule = true;

	exports['default'] = function (instance) {
	  instance.registerHelper('log', function () /* message, options */{
	    var args = [undefined],
	        options = arguments[arguments.length - 1];
	    for (var i = 0; i < arguments.length - 1; i++) {
	      args.push(arguments[i]);
	    }

	    var level = 1;
	    if (options.hash.level != null) {
	      level = options.hash.level;
	    } else if (options.data && options.data.level != null) {
	      level = options.data.level;
	    }
	    args[0] = level;

	    instance.log.apply(instance, args);
	  });
	};

	module.exports = exports['default'];

/***/ }),
/* 27 */
/***/ (function(module, exports) {

	'use strict';

	exports.__esModule = true;

	exports['default'] = function (instance) {
	  instance.registerHelper('lookup', function (obj, field, options) {
	    if (!obj) {
	      // Note for 5.0: Change to "obj == null" in 5.0
	      return obj;
	    }
	    return options.lookupProperty(obj, field);
	  });
	};

	module.exports = exports['default'];

/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(2)['default'];

	exports.__esModule = true;

	var _utils = __webpack_require__(4);

	var _exception = __webpack_require__(5);

	var _exception2 = _interopRequireDefault(_exception);

	exports['default'] = function (instance) {
	  instance.registerHelper('with', function (context, options) {
	    if (arguments.length != 2) {
	      throw new _exception2['default']('#with requires exactly one argument');
	    }
	    if (_utils.isFunction(context)) {
	      context = context.call(this);
	    }

	    var fn = options.fn;

	    if (!_utils.isEmpty(context)) {
	      var data = options.data;
	      if (options.data && options.ids) {
	        data = _utils.createFrame(options.data);
	        data.contextPath = _utils.appendContextPath(options.data.contextPath, options.ids[0]);
	      }

	      return fn(context, {
	        data: data,
	        blockParams: _utils.blockParams([context], [data && data.contextPath])
	      });
	    } else {
	      return options.inverse(this);
	    }
	  });
	};

	module.exports = exports['default'];

/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(2)['default'];

	exports.__esModule = true;
	exports.registerDefaultDecorators = registerDefaultDecorators;

	var _decoratorsInline = __webpack_require__(30);

	var _decoratorsInline2 = _interopRequireDefault(_decoratorsInline);

	function registerDefaultDecorators(instance) {
	  _decoratorsInline2['default'](instance);
	}

/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _utils = __webpack_require__(4);

	exports['default'] = function (instance) {
	  instance.registerDecorator('inline', function (fn, props, container, options) {
	    var ret = fn;
	    if (!props.partials) {
	      props.partials = {};
	      ret = function (context, options) {
	        // Create a new partials stack frame prior to exec.
	        var original = container.partials;
	        container.partials = _utils.extend({}, original, props.partials);
	        var ret = fn(context, options);
	        container.partials = original;
	        return ret;
	      };
	    }

	    props.partials[options.args[0]] = options.fn;

	    return ret;
	  });
	};

	module.exports = exports['default'];

/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _utils = __webpack_require__(4);

	var logger = {
	  methodMap: ['debug', 'info', 'warn', 'error'],
	  level: 'info',

	  // Maps a given level value to the `methodMap` indexes above.
	  lookupLevel: function lookupLevel(level) {
	    if (typeof level === 'string') {
	      var levelMap = _utils.indexOf(logger.methodMap, level.toLowerCase());
	      if (levelMap >= 0) {
	        level = levelMap;
	      } else {
	        level = parseInt(level, 10);
	      }
	    }

	    return level;
	  },

	  // Can be overridden in the host environment
	  log: function log(level) {
	    level = logger.lookupLevel(level);

	    if (typeof console !== 'undefined' && logger.lookupLevel(logger.level) <= level) {
	      var method = logger.methodMap[level];
	      // eslint-disable-next-line no-console
	      if (!console[method]) {
	        method = 'log';
	      }

	      for (var _len = arguments.length, message = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
	        message[_key - 1] = arguments[_key];
	      }

	      console[method].apply(console, message); // eslint-disable-line no-console
	    }
	  }
	};

	exports['default'] = logger;
	module.exports = exports['default'];

/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _Object$create = __webpack_require__(33)['default'];

	var _Object$keys = __webpack_require__(12)['default'];

	var _interopRequireWildcard = __webpack_require__(1)['default'];

	exports.__esModule = true;
	exports.createProtoAccessControl = createProtoAccessControl;
	exports.resultIsAllowed = resultIsAllowed;
	exports.resetLoggedProperties = resetLoggedProperties;

	var _createNewLookupObject = __webpack_require__(35);

	var _logger = __webpack_require__(31);

	var logger = _interopRequireWildcard(_logger);

	var loggedProperties = _Object$create(null);

	function createProtoAccessControl(runtimeOptions) {
	  var defaultMethodWhiteList = _Object$create(null);
	  defaultMethodWhiteList['constructor'] = false;
	  defaultMethodWhiteList['__defineGetter__'] = false;
	  defaultMethodWhiteList['__defineSetter__'] = false;
	  defaultMethodWhiteList['__lookupGetter__'] = false;

	  var defaultPropertyWhiteList = _Object$create(null);
	  // eslint-disable-next-line no-proto
	  defaultPropertyWhiteList['__proto__'] = false;

	  return {
	    properties: {
	      whitelist: _createNewLookupObject.createNewLookupObject(defaultPropertyWhiteList, runtimeOptions.allowedProtoProperties),
	      defaultValue: runtimeOptions.allowProtoPropertiesByDefault
	    },
	    methods: {
	      whitelist: _createNewLookupObject.createNewLookupObject(defaultMethodWhiteList, runtimeOptions.allowedProtoMethods),
	      defaultValue: runtimeOptions.allowProtoMethodsByDefault
	    }
	  };
	}

	function resultIsAllowed(result, protoAccessControl, propertyName) {
	  if (typeof result === 'function') {
	    return checkWhiteList(protoAccessControl.methods, propertyName);
	  } else {
	    return checkWhiteList(protoAccessControl.properties, propertyName);
	  }
	}

	function checkWhiteList(protoAccessControlForType, propertyName) {
	  if (protoAccessControlForType.whitelist[propertyName] !== undefined) {
	    return protoAccessControlForType.whitelist[propertyName] === true;
	  }
	  if (protoAccessControlForType.defaultValue !== undefined) {
	    return protoAccessControlForType.defaultValue;
	  }
	  logUnexpecedPropertyAccessOnce(propertyName);
	  return false;
	}

	function logUnexpecedPropertyAccessOnce(propertyName) {
	  if (loggedProperties[propertyName] !== true) {
	    loggedProperties[propertyName] = true;
	    logger.log('error', 'Handlebars: Access has been denied to resolve the property "' + propertyName + '" because it is not an "own property" of its parent.\n' + 'You can add a runtime option to disable the check or this warning:\n' + 'See https://handlebarsjs.com/api-reference/runtime-options.html#options-to-control-prototype-access for details');
	  }
	}

	function resetLoggedProperties() {
	  _Object$keys(loggedProperties).forEach(function (propertyName) {
	    delete loggedProperties[propertyName];
	  });
	}

/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = { "default": __webpack_require__(34), __esModule: true };

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

	var $ = __webpack_require__(8);
	module.exports = function create(P, D){
	  return $.create(P, D);
	};

/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _Object$create = __webpack_require__(33)['default'];

	exports.__esModule = true;
	exports.createNewLookupObject = createNewLookupObject;

	var _utils = __webpack_require__(4);

	/**
	 * Create a new object with "null"-prototype to avoid truthy results on prototype properties.
	 * The resulting object can be used with "object[property]" to check if a property exists
	 * @param {...object} sources a varargs parameter of source objects that will be merged
	 * @returns {object}
	 */

	function createNewLookupObject() {
	  for (var _len = arguments.length, sources = Array(_len), _key = 0; _key < _len; _key++) {
	    sources[_key] = arguments[_key];
	  }

	  return _utils.extend.apply(undefined, [_Object$create(null)].concat(sources));
	}

/***/ }),
/* 36 */
/***/ (function(module, exports) {

	// Build out our basic SafeString type
	'use strict';

	exports.__esModule = true;
	function SafeString(string) {
	  this.string = string;
	}

	SafeString.prototype.toString = SafeString.prototype.toHTML = function () {
	  return '' + this.string;
	};

	exports['default'] = SafeString;
	module.exports = exports['default'];

/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _Object$seal = __webpack_require__(38)['default'];

	var _Object$keys = __webpack_require__(12)['default'];

	var _interopRequireWildcard = __webpack_require__(1)['default'];

	var _interopRequireDefault = __webpack_require__(2)['default'];

	exports.__esModule = true;
	exports.checkRevision = checkRevision;
	exports.template = template;
	exports.wrapProgram = wrapProgram;
	exports.resolvePartial = resolvePartial;
	exports.invokePartial = invokePartial;
	exports.noop = noop;

	var _utils = __webpack_require__(4);

	var Utils = _interopRequireWildcard(_utils);

	var _exception = __webpack_require__(5);

	var _exception2 = _interopRequireDefault(_exception);

	var _base = __webpack_require__(3);

	var _helpers = __webpack_require__(9);

	var _internalWrapHelper = __webpack_require__(42);

	var _internalProtoAccess = __webpack_require__(32);

	function checkRevision(compilerInfo) {
	  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
	      currentRevision = _base.COMPILER_REVISION;

	  if (compilerRevision >= _base.LAST_COMPATIBLE_COMPILER_REVISION && compilerRevision <= _base.COMPILER_REVISION) {
	    return;
	  }

	  if (compilerRevision < _base.LAST_COMPATIBLE_COMPILER_REVISION) {
	    var runtimeVersions = _base.REVISION_CHANGES[currentRevision],
	        compilerVersions = _base.REVISION_CHANGES[compilerRevision];
	    throw new _exception2['default']('Template was precompiled with an older version of Handlebars than the current runtime. ' + 'Please update your precompiler to a newer version (' + runtimeVersions + ') or downgrade your runtime to an older version (' + compilerVersions + ').');
	  } else {
	    // Use the embedded version info since the runtime doesn't know about this revision yet
	    throw new _exception2['default']('Template was precompiled with a newer version of Handlebars than the current runtime. ' + 'Please update your runtime to a newer version (' + compilerInfo[1] + ').');
	  }
	}

	function template(templateSpec, env) {
	  /* istanbul ignore next */
	  if (!env) {
	    throw new _exception2['default']('No environment passed to template');
	  }
	  if (!templateSpec || !templateSpec.main) {
	    throw new _exception2['default']('Unknown template object: ' + typeof templateSpec);
	  }

	  templateSpec.main.decorator = templateSpec.main_d;

	  // Note: Using env.VM references rather than local var references throughout this section to allow
	  // for external users to override these as pseudo-supported APIs.
	  env.VM.checkRevision(templateSpec.compiler);

	  // backwards compatibility for precompiled templates with compiler-version 7 (<4.3.0)
	  var templateWasPrecompiledWithCompilerV7 = templateSpec.compiler && templateSpec.compiler[0] === 7;

	  function invokePartialWrapper(partial, context, options) {
	    if (options.hash) {
	      context = Utils.extend({}, context, options.hash);
	      if (options.ids) {
	        options.ids[0] = true;
	      }
	    }
	    partial = env.VM.resolvePartial.call(this, partial, context, options);

	    var extendedOptions = Utils.extend({}, options, {
	      hooks: this.hooks,
	      protoAccessControl: this.protoAccessControl
	    });

	    var result = env.VM.invokePartial.call(this, partial, context, extendedOptions);

	    if (result == null && env.compile) {
	      options.partials[options.name] = env.compile(partial, templateSpec.compilerOptions, env);
	      result = options.partials[options.name](context, extendedOptions);
	    }
	    if (result != null) {
	      if (options.indent) {
	        var lines = result.split('\n');
	        for (var i = 0, l = lines.length; i < l; i++) {
	          if (!lines[i] && i + 1 === l) {
	            break;
	          }

	          lines[i] = options.indent + lines[i];
	        }
	        result = lines.join('\n');
	      }
	      return result;
	    } else {
	      throw new _exception2['default']('The partial ' + options.name + ' could not be compiled when running in runtime-only mode');
	    }
	  }

	  // Just add water
	  var container = {
	    strict: function strict(obj, name, loc) {
	      if (!obj || !(name in obj)) {
	        throw new _exception2['default']('"' + name + '" not defined in ' + obj, {
	          loc: loc
	        });
	      }
	      return container.lookupProperty(obj, name);
	    },
	    lookupProperty: function lookupProperty(parent, propertyName) {
	      var result = parent[propertyName];
	      if (result == null) {
	        return result;
	      }
	      if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
	        return result;
	      }

	      if (_internalProtoAccess.resultIsAllowed(result, container.protoAccessControl, propertyName)) {
	        return result;
	      }
	      return undefined;
	    },
	    lookup: function lookup(depths, name) {
	      var len = depths.length;
	      for (var i = 0; i < len; i++) {
	        var result = depths[i] && container.lookupProperty(depths[i], name);
	        if (result != null) {
	          return depths[i][name];
	        }
	      }
	    },
	    lambda: function lambda(current, context) {
	      return typeof current === 'function' ? current.call(context) : current;
	    },

	    escapeExpression: Utils.escapeExpression,
	    invokePartial: invokePartialWrapper,

	    fn: function fn(i) {
	      var ret = templateSpec[i];
	      ret.decorator = templateSpec[i + '_d'];
	      return ret;
	    },

	    programs: [],
	    program: function program(i, data, declaredBlockParams, blockParams, depths) {
	      var programWrapper = this.programs[i],
	          fn = this.fn(i);
	      if (data || depths || blockParams || declaredBlockParams) {
	        programWrapper = wrapProgram(this, i, fn, data, declaredBlockParams, blockParams, depths);
	      } else if (!programWrapper) {
	        programWrapper = this.programs[i] = wrapProgram(this, i, fn);
	      }
	      return programWrapper;
	    },

	    data: function data(value, depth) {
	      while (value && depth--) {
	        value = value._parent;
	      }
	      return value;
	    },
	    mergeIfNeeded: function mergeIfNeeded(param, common) {
	      var obj = param || common;

	      if (param && common && param !== common) {
	        obj = Utils.extend({}, common, param);
	      }

	      return obj;
	    },
	    // An empty object to use as replacement for null-contexts
	    nullContext: _Object$seal({}),

	    noop: env.VM.noop,
	    compilerInfo: templateSpec.compiler
	  };

	  function ret(context) {
	    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	    var data = options.data;

	    ret._setup(options);
	    if (!options.partial && templateSpec.useData) {
	      data = initData(context, data);
	    }
	    var depths = undefined,
	        blockParams = templateSpec.useBlockParams ? [] : undefined;
	    if (templateSpec.useDepths) {
	      if (options.depths) {
	        depths = context != options.depths[0] ? [context].concat(options.depths) : options.depths;
	      } else {
	        depths = [context];
	      }
	    }

	    function main(context /*, options*/) {
	      return '' + templateSpec.main(container, context, container.helpers, container.partials, data, blockParams, depths);
	    }

	    main = executeDecorators(templateSpec.main, main, container, options.depths || [], data, blockParams);
	    return main(context, options);
	  }

	  ret.isTop = true;

	  ret._setup = function (options) {
	    if (!options.partial) {
	      var mergedHelpers = Utils.extend({}, env.helpers, options.helpers);
	      wrapHelpersToPassLookupProperty(mergedHelpers, container);
	      container.helpers = mergedHelpers;

	      if (templateSpec.usePartial) {
	        // Use mergeIfNeeded here to prevent compiling global partials multiple times
	        container.partials = container.mergeIfNeeded(options.partials, env.partials);
	      }
	      if (templateSpec.usePartial || templateSpec.useDecorators) {
	        container.decorators = Utils.extend({}, env.decorators, options.decorators);
	      }

	      container.hooks = {};
	      container.protoAccessControl = _internalProtoAccess.createProtoAccessControl(options);

	      var keepHelperInHelpers = options.allowCallsToHelperMissing || templateWasPrecompiledWithCompilerV7;
	      _helpers.moveHelperToHooks(container, 'helperMissing', keepHelperInHelpers);
	      _helpers.moveHelperToHooks(container, 'blockHelperMissing', keepHelperInHelpers);
	    } else {
	      container.protoAccessControl = options.protoAccessControl; // internal option
	      container.helpers = options.helpers;
	      container.partials = options.partials;
	      container.decorators = options.decorators;
	      container.hooks = options.hooks;
	    }
	  };

	  ret._child = function (i, data, blockParams, depths) {
	    if (templateSpec.useBlockParams && !blockParams) {
	      throw new _exception2['default']('must pass block params');
	    }
	    if (templateSpec.useDepths && !depths) {
	      throw new _exception2['default']('must pass parent depths');
	    }

	    return wrapProgram(container, i, templateSpec[i], data, 0, blockParams, depths);
	  };
	  return ret;
	}

	function wrapProgram(container, i, fn, data, declaredBlockParams, blockParams, depths) {
	  function prog(context) {
	    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	    var currentDepths = depths;
	    if (depths && context != depths[0] && !(context === container.nullContext && depths[0] === null)) {
	      currentDepths = [context].concat(depths);
	    }

	    return fn(container, context, container.helpers, container.partials, options.data || data, blockParams && [options.blockParams].concat(blockParams), currentDepths);
	  }

	  prog = executeDecorators(fn, prog, container, depths, data, blockParams);

	  prog.program = i;
	  prog.depth = depths ? depths.length : 0;
	  prog.blockParams = declaredBlockParams || 0;
	  return prog;
	}

	/**
	 * This is currently part of the official API, therefore implementation details should not be changed.
	 */

	function resolvePartial(partial, context, options) {
	  if (!partial) {
	    if (options.name === '@partial-block') {
	      partial = options.data['partial-block'];
	    } else {
	      partial = options.partials[options.name];
	    }
	  } else if (!partial.call && !options.name) {
	    // This is a dynamic partial that returned a string
	    options.name = partial;
	    partial = options.partials[partial];
	  }
	  return partial;
	}

	function invokePartial(partial, context, options) {
	  // Use the current closure context to save the partial-block if this partial
	  var currentPartialBlock = options.data && options.data['partial-block'];
	  options.partial = true;
	  if (options.ids) {
	    options.data.contextPath = options.ids[0] || options.data.contextPath;
	  }

	  var partialBlock = undefined;
	  if (options.fn && options.fn !== noop) {
	    (function () {
	      options.data = _base.createFrame(options.data);
	      // Wrapper function to get access to currentPartialBlock from the closure
	      var fn = options.fn;
	      partialBlock = options.data['partial-block'] = function partialBlockWrapper(context) {
	        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	        // Restore the partial-block from the closure for the execution of the block
	        // i.e. the part inside the block of the partial call.
	        options.data = _base.createFrame(options.data);
	        options.data['partial-block'] = currentPartialBlock;
	        return fn(context, options);
	      };
	      if (fn.partials) {
	        options.partials = Utils.extend({}, options.partials, fn.partials);
	      }
	    })();
	  }

	  if (partial === undefined && partialBlock) {
	    partial = partialBlock;
	  }

	  if (partial === undefined) {
	    throw new _exception2['default']('The partial ' + options.name + ' could not be found');
	  } else if (partial instanceof Function) {
	    return partial(context, options);
	  }
	}

	function noop() {
	  return '';
	}

	function initData(context, data) {
	  if (!data || !('root' in data)) {
	    data = data ? _base.createFrame(data) : {};
	    data.root = context;
	  }
	  return data;
	}

	function executeDecorators(fn, prog, container, depths, data, blockParams) {
	  if (fn.decorator) {
	    var props = {};
	    prog = fn.decorator(prog, props, container, depths && depths[0], data, blockParams, depths);
	    Utils.extend(prog, props);
	  }
	  return prog;
	}

	function wrapHelpersToPassLookupProperty(mergedHelpers, container) {
	  _Object$keys(mergedHelpers).forEach(function (helperName) {
	    var helper = mergedHelpers[helperName];
	    mergedHelpers[helperName] = passLookupPropertyOption(helper, container);
	  });
	}

	function passLookupPropertyOption(helper, container) {
	  var lookupProperty = container.lookupProperty;
	  return _internalWrapHelper.wrapHelper(helper, function (options) {
	    return Utils.extend({ lookupProperty: lookupProperty }, options);
	  });
	}

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = { "default": __webpack_require__(39), __esModule: true };

/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

	__webpack_require__(40);
	module.exports = __webpack_require__(20).Object.seal;

/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

	// 19.1.2.17 Object.seal(O)
	var isObject = __webpack_require__(41);

	__webpack_require__(17)('seal', function($seal){
	  return function seal(it){
	    return $seal && isObject(it) ? $seal(it) : it;
	  };
	});

/***/ }),
/* 41 */
/***/ (function(module, exports) {

	module.exports = function(it){
	  return typeof it === 'object' ? it !== null : typeof it === 'function';
	};

/***/ }),
/* 42 */
/***/ (function(module, exports) {

	'use strict';

	exports.__esModule = true;
	exports.wrapHelper = wrapHelper;

	function wrapHelper(helper, transformOptionsFn) {
	  if (typeof helper !== 'function') {
	    // This should not happen, but apparently it does in https://github.com/wycats/handlebars.js/issues/1639
	    // We try to make the wrapper least-invasive by not wrapping it, if the helper is not a function.
	    return helper;
	  }
	  var wrapper = function wrapper() /* dynamic arguments */{
	    var options = arguments[arguments.length - 1];
	    arguments[arguments.length - 1] = transformOptionsFn(options);
	    return helper.apply(this, arguments);
	  };
	  return wrapper;
	}

/***/ }),
/* 43 */
/***/ (function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	exports.__esModule = true;

	exports['default'] = function (Handlebars) {
	  /* istanbul ignore next */
	  var root = typeof global !== 'undefined' ? global : window,
	      $Handlebars = root.Handlebars;
	  /* istanbul ignore next */
	  Handlebars.noConflict = function () {
	    if (root.Handlebars === Handlebars) {
	      root.Handlebars = $Handlebars;
	    }
	    return Handlebars;
	  };
	};

	module.exports = exports['default'];
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ })
/******/ ])
});
;
// allow us to import this as a module
if (typeof define !== "undefined") {
  define("handlebars", ["exports"], function (__exports__) {
    // It might not be defined server side, which is OK for pretty-text
    if (typeof Handlebars !== "undefined") {
      // eslint-disable-next-line
      __exports__.default = Handlebars;
      __exports__.compile = function () {
        // eslint-disable-next-line
        return Handlebars.compile.apply(this, arguments);
      };
    }
  });

  define("handlebars-compiler", ["exports"], function (__exports__) {
    // eslint-disable-next-line
    __exports__.default = Handlebars.compile;
  });
}
;


/*global define, jQuery*/


(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define([], function () {
      // Also create a global in case some scripts
      // that are loaded still are looking for
      // a global even when an AMD loader is in use.
      return (root.MessageBus = factory());
    });
  } else {
    // Browser globals
    root.MessageBus = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
  var uniqueId = function () {
    return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  var me;
  var delayPollTimeout;
  var ajaxInProgress = false;
  var started = false;
  var clientId = uniqueId();
  var callbacks = [];
  var failCount = 0;
  var baseUrl = "/";
  var paused = false;
  var later = [];
  var chunkedBackoff = 0;
  var stopped;
  var pollTimeout = null;
  var totalAjaxFailures = 0;
  var totalAjaxCalls = 0;
  var lastAjax;

  var isHidden = (function () {
    var prefixes = ["", "webkit", "ms", "moz"];
    var hiddenProperty;
    for (var i = 0; i < prefixes.length; i++) {
      var prefix = prefixes[i];
      var check = prefix + (prefix === "" ? "hidden" : "Hidden");
      if (document[check] !== undefined) {
        hiddenProperty = check;
      }
    }

    return function () {
      if (hiddenProperty !== undefined) {
        return document[hiddenProperty];
      } else {
        return !document.hasFocus;
      }
    };
  })();

  var hasLocalStorage = (function () {
    try {
      localStorage.setItem("mbTestLocalStorage", Date.now());
      localStorage.removeItem("mbTestLocalStorage");
      return true;
    } catch (e) {
      return false;
    }
  })();

  var updateLastAjax = function () {
    if (hasLocalStorage) {
      localStorage.setItem("__mbLastAjax", Date.now());
    }
  };

  var hiddenTabShouldWait = function () {
    if (hasLocalStorage && isHidden()) {
      var lastAjaxCall = parseInt(localStorage.getItem("__mbLastAjax"), 10);
      var deltaAjax = Date.now() - lastAjaxCall;

      return deltaAjax >= 0 && deltaAjax < me.minHiddenPollInterval;
    }
    return false;
  };

  var hasonprogress = new XMLHttpRequest().onprogress === null;
  var allowChunked = function () {
    return me.enableChunkedEncoding && hasonprogress;
  };

  var shouldLongPoll = function () {
    return (
      me.alwaysLongPoll ||
      (me.shouldLongPollCallback ? me.shouldLongPollCallback() : !isHidden())
    );
  };

  var processMessages = function (messages) {
    if (!messages || messages.length === 0) {
      return false;
    }

    for (var i = 0; i < messages.length; i++) {
      var message = messages[i];
      for (var j = 0; j < callbacks.length; j++) {
        var callback = callbacks[j];
        if (callback.channel === message.channel) {
          callback.last_id = message.message_id;
          try {
            callback.func(message.data, message.global_id, message.message_id);
          } catch (e) {
            if (console.log) {
              console.log(
                "MESSAGE BUS FAIL: callback " +
                  callback.channel +
                  " caused exception " +
                  e.stack
              );
            }
          }
        }
        if (message.channel === "/__status") {
          if (message.data[callback.channel] !== undefined) {
            callback.last_id = message.data[callback.channel];
          }
        }
      }
    }

    return true;
  };

  var reqSuccess = function (messages) {
    failCount = 0;
    if (paused) {
      if (messages) {
        for (var i = 0; i < messages.length; i++) {
          later.push(messages[i]);
        }
      }
    } else {
      return processMessages(messages);
    }
    return false;
  };

  var longPoller = function (poll, data) {
    if (ajaxInProgress) {
      // never allow concurrent ajax reqs
      return;
    }

    var gotData = false;
    var aborted = false;
    var rateLimited = false;
    var rateLimitedSeconds;

    lastAjax = new Date();
    totalAjaxCalls += 1;
    data.__seq = totalAjaxCalls;

    var longPoll = shouldLongPoll() && me.enableLongPolling;
    var chunked = longPoll && allowChunked();
    if (chunkedBackoff > 0) {
      chunkedBackoff--;
      chunked = false;
    }

    var headers = { "X-SILENCE-LOGGER": "true" };
    for (var name in me.headers) {
      headers[name] = me.headers[name];
    }

    if (!chunked) {
      headers["Dont-Chunk"] = "true";
    }

    var dataType = chunked ? "text" : "json";

    var handle_progress = function (payload, position) {
      var separator = "\r\n|\r\n";
      var endChunk = payload.indexOf(separator, position);

      if (endChunk === -1) {
        return position;
      }

      var chunk = payload.substring(position, endChunk);
      chunk = chunk.replace(/\r\n\|\|\r\n/g, separator);

      try {
        reqSuccess(JSON.parse(chunk));
      } catch (e) {
        if (console.log) {
          console.log("FAILED TO PARSE CHUNKED REPLY");
          console.log(data);
        }
      }

      return handle_progress(payload, endChunk + separator.length);
    };

    var disableChunked = function () {
      if (me.longPoll) {
        me.longPoll.abort();
        chunkedBackoff = 30;
      }
    };

    if (!me.ajax) {
      throw new Error("Either jQuery or the ajax adapter must be loaded");
    }

    updateLastAjax();

    ajaxInProgress = true;
    var req = me.ajax({
      url:
        me.baseUrl +
        "message-bus/" +
        me.clientId +
        "/poll" +
        (!longPoll ? "?dlp=t" : ""),
      data: data,
      async: true,
      dataType: dataType,
      type: "POST",
      headers: headers,
      messageBus: {
        chunked: chunked,
        onProgressListener: function (xhr) {
          var position = 0;
          // if it takes longer than 3000 ms to get first chunk, we have some proxy
          // this is messing with us, so just backoff from using chunked for now
          var chunkedTimeout = setTimeout(disableChunked, 3000);
          return (xhr.onprogress = function () {
            clearTimeout(chunkedTimeout);
            if (
              xhr.getResponseHeader("Content-Type") ===
              "application/json; charset=utf-8"
            ) {
              chunked = false; // not chunked, we are sending json back
            } else {
              position = handle_progress(xhr.responseText, position);
            }
          });
        },
      },
      xhr: function () {
        var xhr = jQuery.ajaxSettings.xhr();
        if (!chunked) {
          return xhr;
        }
        this.messageBus.onProgressListener(xhr);
        return xhr;
      },
      success: function (messages) {
        if (!chunked) {
          // we may have requested text so jQuery will not parse
          if (typeof messages === "string") {
            messages = JSON.parse(messages);
          }
          gotData = reqSuccess(messages);
        }
      },
      error: function (xhr, textStatus) {
        if (xhr.status === 429) {
          var tryAfter =
            parseInt(
              xhr.getResponseHeader && xhr.getResponseHeader("Retry-After")
            ) || 0;
          tryAfter = tryAfter || 0;
          if (tryAfter < 15) {
            tryAfter = 15;
          }
          rateLimitedSeconds = tryAfter;
          rateLimited = true;
        } else if (textStatus === "abort") {
          aborted = true;
        } else {
          failCount += 1;
          totalAjaxFailures += 1;
        }
      },
      complete: function () {
        ajaxInProgress = false;

        var interval;
        try {
          if (rateLimited) {
            interval = Math.max(me.minPollInterval, rateLimitedSeconds * 1000);
          } else if (gotData || aborted) {
            interval = me.minPollInterval;
          } else {
            interval = me.callbackInterval;
            if (failCount > 2) {
              interval = interval * failCount;
            } else if (!shouldLongPoll()) {
              interval = me.backgroundCallbackInterval;
            }
            if (interval > me.maxPollInterval) {
              interval = me.maxPollInterval;
            }

            interval -= new Date() - lastAjax;

            if (interval < 100) {
              interval = 100;
            }
          }
        } catch (e) {
          if (console.log && e.message) {
            console.log("MESSAGE BUS FAIL: " + e.message);
          }
        }

        if (pollTimeout) {
          clearTimeout(pollTimeout);
          pollTimeout = null;
        }

        if (started) {
          pollTimeout = setTimeout(function () {
            pollTimeout = null;
            poll();
          }, interval);
        }

        me.longPoll = null;
      },
    });

    return req;
  };

  me = {
    /* shared between all tabs */
    minHiddenPollInterval: 1500,
    enableChunkedEncoding: true,
    enableLongPolling: true,
    callbackInterval: 15000,
    backgroundCallbackInterval: 60000,
    minPollInterval: 100,
    maxPollInterval: 3 * 60 * 1000,
    callbacks: callbacks,
    clientId: clientId,
    alwaysLongPoll: false,
    shouldLongPollCallback: undefined,
    baseUrl: baseUrl,
    headers: {},
    ajax: typeof jQuery !== "undefined" && jQuery.ajax,
    diagnostics: function () {
      console.log("Stopped: " + stopped + " Started: " + started);
      console.log("Current callbacks");
      console.log(callbacks);
      console.log(
        "Total ajax calls: " +
          totalAjaxCalls +
          " Recent failure count: " +
          failCount +
          " Total failures: " +
          totalAjaxFailures
      );
      console.log(
        "Last ajax call: " + (new Date() - lastAjax) / 1000 + " seconds ago"
      );
    },

    pause: function () {
      paused = true;
    },

    resume: function () {
      paused = false;
      processMessages(later);
      later = [];
    },

    stop: function () {
      stopped = true;
      started = false;
      if (delayPollTimeout) {
        clearTimeout(delayPollTimeout);
        delayPollTimeout = null;
      }
      if (pollTimeout) {
        clearTimeout(pollTimeout);
        pollTimeout = null;
      }
      if (me.longPoll) {
        me.longPoll.abort();
      }
      if (me.onVisibilityChange) {
        document.removeEventListener("visibilitychange", me.onVisibilityChange);
        me.onVisibilityChange = null;
      }
    },

    // Start polling
    start: function () {
      if (started) return;
      started = true;
      stopped = false;

      var poll = function () {
        if (stopped) {
          return;
        }

        if (callbacks.length === 0 || hiddenTabShouldWait()) {
          if (!delayPollTimeout) {
            delayPollTimeout = setTimeout(function () {
              delayPollTimeout = null;
              poll();
            }, parseInt(500 + Math.random() * 500));
          }
          return;
        }

        var data = {};
        for (var i = 0; i < callbacks.length; i++) {
          data[callbacks[i].channel] = callbacks[i].last_id;
        }

        // could possibly already be started
        // notice the delay timeout above
        if (!me.longPoll) {
          me.longPoll = longPoller(poll, data);
        }
      };

      // monitor visibility, issue a new long poll when the page shows
      if (document.addEventListener && "hidden" in document) {
        me.onVisibilityChange = function () {
          if (
            !document.hidden &&
            !me.longPoll &&
            (pollTimeout || delayPollTimeout)
          ) {
            clearTimeout(pollTimeout);
            clearTimeout(delayPollTimeout);

            delayPollTimeout = null;
            pollTimeout = null;
            poll();
          }
        };

        document.addEventListener("visibilitychange", me.onVisibilityChange);
      }

      poll();
    },

    status: function () {
      if (paused) {
        return "paused";
      } else if (started) {
        return "started";
      } else if (stopped) {
        return "stopped";
      } else {
        throw "Cannot determine current status";
      }
    },

    // Subscribe to a channel
    // if lastId is 0 or larger, it will recieve messages AFTER that id
    // if lastId is negative it will perform lookbehind
    // -1 will subscribe to all new messages
    // -2 will recieve last message + all new messages
    // -3 will recieve last 2 messages + all new messages
    // if undefined will default to -1
    subscribe: function (channel, func, lastId) {
      if (!started && !stopped) {
        me.start();
      }

      if (lastId === null || typeof lastId === "undefined") {
        lastId = -1;
      } else if (typeof lastId !== "number") {
        throw (
          "lastId has type " + typeof lastId + " but a number was expected."
        );
      }

      if (typeof channel !== "string") {
        throw "Channel name must be a string!";
      }

      callbacks.push({
        channel: channel,
        func: func,
        last_id: lastId,
      });
      if (me.longPoll) {
        me.longPoll.abort();
      }

      return func;
    },

    // Unsubscribe from a channel
    unsubscribe: function (channel, func) {
      // TODO allow for globbing in the middle of a channel name
      // like /something/*/something
      // at the moment we only support globbing /something/*
      var glob = false;
      if (channel.indexOf("*", channel.length - 1) !== -1) {
        channel = channel.substr(0, channel.length - 1);
        glob = true;
      }

      var removed = false;

      for (var i = callbacks.length - 1; i >= 0; i--) {
        var callback = callbacks[i];
        var keep;

        if (glob) {
          keep = callback.channel.substr(0, channel.length) !== channel;
        } else {
          keep = callback.channel !== channel;
        }

        if (!keep && func && callback.func !== func) {
          keep = true;
        }

        if (!keep) {
          callbacks.splice(i, 1);
          removed = true;
        }
      }

      if (removed && me.longPoll) {
        me.longPoll.abort();
      }

      return removed;
    },
  };
  return me;
});
/*! jQuery UI - v1.12.1+0b7246b6eeadfa9e2696e22f3230f6452f8129dc - 2020-02-20
 * http://jqueryui.com
 * Includes: widget.js
 * Copyright jQuery Foundation and other contributors; Licensed MIT */

/* global define, require */
/* eslint-disable no-param-reassign, new-cap, jsdoc/require-jsdoc */


(function (factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node/CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals
    factory(window.jQuery);
  }
})(function ($) {
  ('use strict');

  $.ui = $.ui || {};

  $.ui.version = '1.12.1';

  /*!
   * jQuery UI Widget 1.12.1
   * http://jqueryui.com
   *
   * Copyright jQuery Foundation and other contributors
   * Released under the MIT license.
   * http://jquery.org/license
   */

  //>>label: Widget
  //>>group: Core
  //>>description: Provides a factory for creating stateful widgets with a common API.
  //>>docs: http://api.jqueryui.com/jQuery.widget/
  //>>demos: http://jqueryui.com/widget/

  // Support: jQuery 1.9.x or older
  // $.expr[ ":" ] is deprecated.
  if (!$.expr.pseudos) {
    $.expr.pseudos = $.expr[':'];
  }

  // Support: jQuery 1.11.x or older
  // $.unique has been renamed to $.uniqueSort
  if (!$.uniqueSort) {
    $.uniqueSort = $.unique;
  }

  var widgetUuid = 0;
  var widgetHasOwnProperty = Array.prototype.hasOwnProperty;
  var widgetSlice = Array.prototype.slice;

  $.cleanData = (function (orig) {
    return function (elems) {
      var events, elem, i;
      // eslint-disable-next-line eqeqeq
      for (i = 0; (elem = elems[i]) != null; i++) {
        // Only trigger remove when necessary to save time
        events = $._data(elem, 'events');
        if (events && events.remove) {
          $(elem).triggerHandler('remove');
        }
      }
      orig(elems);
    };
  })($.cleanData);

  $.widget = function (name, base, prototype) {
    var existingConstructor, constructor, basePrototype;

    // ProxiedPrototype allows the provided prototype to remain unmodified
    // so that it can be used as a mixin for multiple widgets (#8876)
    var proxiedPrototype = {};

    var namespace = name.split('.')[0];
    name = name.split('.')[1];
    var fullName = namespace + '-' + name;

    if (!prototype) {
      prototype = base;
      base = $.Widget;
    }

    if ($.isArray(prototype)) {
      prototype = $.extend.apply(null, [{}].concat(prototype));
    }

    // Create selector for plugin
    $.expr.pseudos[fullName.toLowerCase()] = function (elem) {
      return !!$.data(elem, fullName);
    };

    $[namespace] = $[namespace] || {};
    existingConstructor = $[namespace][name];
    constructor = $[namespace][name] = function (options, element) {
      // Allow instantiation without "new" keyword
      if (!this._createWidget) {
        return new constructor(options, element);
      }

      // Allow instantiation without initializing for simple inheritance
      // must use "new" keyword (the code above always passes args)
      if (arguments.length) {
        this._createWidget(options, element);
      }
    };

    // Extend with the existing constructor to carry over any static properties
    $.extend(constructor, existingConstructor, {
      version: prototype.version,

      // Copy the object used to create the prototype in case we need to
      // redefine the widget later
      _proto: $.extend({}, prototype),

      // Track widgets that inherit from this widget in case this widget is
      // redefined after a widget inherits from it
      _childConstructors: []
    });

    basePrototype = new base();

    // We need to make the options hash a property directly on the new instance
    // otherwise we'll modify the options hash on the prototype that we're
    // inheriting from
    basePrototype.options = $.widget.extend({}, basePrototype.options);
    $.each(prototype, function (prop, value) {
      if (!$.isFunction(value)) {
        proxiedPrototype[prop] = value;
        return;
      }
      proxiedPrototype[prop] = (function () {
        function _super() {
          return base.prototype[prop].apply(this, arguments);
        }

        function _superApply(args) {
          return base.prototype[prop].apply(this, args);
        }

        return function () {
          var __super = this._super;
          var __superApply = this._superApply;
          var returnValue;

          this._super = _super;
          this._superApply = _superApply;

          returnValue = value.apply(this, arguments);

          this._super = __super;
          this._superApply = __superApply;

          return returnValue;
        };
      })();
    });
    constructor.prototype = $.widget.extend(
      basePrototype,
      {
        // TODO: remove support for widgetEventPrefix
        // always use the name + a colon as the prefix, e.g., draggable:start
        // don't prefix for widgets that aren't DOM-based
        widgetEventPrefix: existingConstructor
          ? basePrototype.widgetEventPrefix || name
          : name
      },
      proxiedPrototype,
      {
        constructor: constructor,
        namespace: namespace,
        widgetName: name,
        widgetFullName: fullName
      }
    );

    // If this widget is being redefined then we need to find all widgets that
    // are inheriting from it and redefine all of them so that they inherit from
    // the new version of this widget. We're essentially trying to replace one
    // level in the prototype chain.
    if (existingConstructor) {
      $.each(existingConstructor._childConstructors, function (i, child) {
        var childPrototype = child.prototype;

        // Redefine the child widget using the same prototype that was
        // originally used, but inherit from the new version of the base
        $.widget(
          childPrototype.namespace + '.' + childPrototype.widgetName,
          constructor,
          child._proto
        );
      });

      // Remove the list of existing child constructors from the old constructor
      // so the old child constructors can be garbage collected
      delete existingConstructor._childConstructors;
    } else {
      base._childConstructors.push(constructor);
    }

    $.widget.bridge(name, constructor);

    return constructor;
  };

  $.widget.extend = function (target) {
    var input = widgetSlice.call(arguments, 1);
    var inputIndex = 0;
    var inputLength = input.length;
    var key;
    var value;

    for (; inputIndex < inputLength; inputIndex++) {
      for (key in input[inputIndex]) {
        value = input[inputIndex][key];
        if (
          widgetHasOwnProperty.call(input[inputIndex], key) &&
          value !== undefined
        ) {
          // Clone objects
          if ($.isPlainObject(value)) {
            target[key] = $.isPlainObject(target[key])
              ? $.widget.extend({}, target[key], value)
              : // Don't extend strings, arrays, etc. with objects
                $.widget.extend({}, value);

            // Copy everything else by reference
          } else {
            target[key] = value;
          }
        }
      }
    }
    return target;
  };

  $.widget.bridge = function (name, object) {
    var fullName = object.prototype.widgetFullName || name;
    $.fn[name] = function (options) {
      var isMethodCall = typeof options === 'string';
      var args = widgetSlice.call(arguments, 1);
      var returnValue = this;

      if (isMethodCall) {
        // If this is an empty collection, we need to have the instance method
        // return undefined instead of the jQuery instance
        if (!this.length && options === 'instance') {
          returnValue = undefined;
        } else {
          this.each(function () {
            var methodValue;
            var instance = $.data(this, fullName);

            if (options === 'instance') {
              returnValue = instance;
              return false;
            }

            if (!instance) {
              return $.error(
                'cannot call methods on ' +
                  name +
                  ' prior to initialization; ' +
                  "attempted to call method '" +
                  options +
                  "'"
              );
            }

            if (!$.isFunction(instance[options]) || options.charAt(0) === '_') {
              return $.error(
                "no such method '" +
                  options +
                  "' for " +
                  name +
                  ' widget instance'
              );
            }

            methodValue = instance[options].apply(instance, args);

            if (methodValue !== instance && methodValue !== undefined) {
              returnValue =
                methodValue && methodValue.jquery
                  ? returnValue.pushStack(methodValue.get())
                  : methodValue;
              return false;
            }
          });
        }
      } else {
        // Allow multiple hashes to be passed on init
        if (args.length) {
          options = $.widget.extend.apply(null, [options].concat(args));
        }

        this.each(function () {
          var instance = $.data(this, fullName);
          if (instance) {
            instance.option(options || {});
            if (instance._init) {
              instance._init();
            }
          } else {
            $.data(this, fullName, new object(options, this));
          }
        });
      }

      return returnValue;
    };
  };

  $.Widget = function (/* options, element */) {};
  $.Widget._childConstructors = [];

  $.Widget.prototype = {
    widgetName: 'widget',
    widgetEventPrefix: '',
    defaultElement: '<div>',

    options: {
      classes: {},
      disabled: false,

      // Callbacks
      create: null
    },

    _createWidget: function (options, element) {
      element = $(element || this.defaultElement || this)[0];
      this.element = $(element);
      this.uuid = widgetUuid++;
      this.eventNamespace = '.' + this.widgetName + this.uuid;

      this.bindings = $();
      this.hoverable = $();
      this.focusable = $();
      this.classesElementLookup = {};

      if (element !== this) {
        $.data(element, this.widgetFullName, this);
        this._on(true, this.element, {
          remove: function (event) {
            if (event.target === element) {
              this.destroy();
            }
          }
        });
        this.document = $(
          element.style
            ? // Element within the document
              element.ownerDocument
            : // Element is window or document
              element.document || element
        );
        this.window = $(
          this.document[0].defaultView || this.document[0].parentWindow
        );
      }

      this.options = $.widget.extend(
        {},
        this.options,
        this._getCreateOptions(),
        options
      );

      this._create();

      if (this.options.disabled) {
        this._setOptionDisabled(this.options.disabled);
      }

      this._trigger('create', null, this._getCreateEventData());
      this._init();
    },

    _getCreateOptions: function () {
      return {};
    },

    _getCreateEventData: $.noop,

    _create: $.noop,

    _init: $.noop,

    destroy: function () {
      var that = this;

      this._destroy();
      $.each(this.classesElementLookup, function (key, value) {
        that._removeClass(value, key);
      });

      // We can probably remove the unbind calls in 2.0
      // all event bindings should go through this._on()
      this.element.off(this.eventNamespace).removeData(this.widgetFullName);
      this.widget().off(this.eventNamespace).removeAttr('aria-disabled');

      // Clean up events and states
      this.bindings.off(this.eventNamespace);
    },

    _destroy: $.noop,

    widget: function () {
      return this.element;
    },

    option: function (key, value) {
      var options = key;
      var parts;
      var curOption;
      var i;

      if (arguments.length === 0) {
        // Don't return a reference to the internal hash
        return $.widget.extend({}, this.options);
      }

      if (typeof key === 'string') {
        // Handle nested keys, e.g., "foo.bar" => { foo: { bar: ___ } }
        options = {};
        parts = key.split('.');
        key = parts.shift();
        if (parts.length) {
          curOption = options[key] = $.widget.extend({}, this.options[key]);
          for (i = 0; i < parts.length - 1; i++) {
            curOption[parts[i]] = curOption[parts[i]] || {};
            curOption = curOption[parts[i]];
          }
          key = parts.pop();
          if (arguments.length === 1) {
            return curOption[key] === undefined ? null : curOption[key];
          }
          curOption[key] = value;
        } else {
          if (arguments.length === 1) {
            return this.options[key] === undefined ? null : this.options[key];
          }
          options[key] = value;
        }
      }

      this._setOptions(options);

      return this;
    },

    _setOptions: function (options) {
      var key;

      for (key in options) {
        this._setOption(key, options[key]);
      }

      return this;
    },

    _setOption: function (key, value) {
      if (key === 'classes') {
        this._setOptionClasses(value);
      }

      this.options[key] = value;

      if (key === 'disabled') {
        this._setOptionDisabled(value);
      }

      return this;
    },

    _setOptionClasses: function (value) {
      var classKey, elements, currentElements;

      for (classKey in value) {
        currentElements = this.classesElementLookup[classKey];
        if (
          value[classKey] === this.options.classes[classKey] ||
          !currentElements ||
          !currentElements.length
        ) {
          continue;
        }

        // We are doing this to create a new jQuery object because the _removeClass() call
        // on the next line is going to destroy the reference to the current elements being
        // tracked. We need to save a copy of this collection so that we can add the new classes
        // below.
        elements = $(currentElements.get());
        this._removeClass(currentElements, classKey);

        // We don't use _addClass() here, because that uses this.options.classes
        // for generating the string of classes. We want to use the value passed in from
        // _setOption(), this is the new value of the classes option which was passed to
        // _setOption(). We pass this value directly to _classes().
        elements.addClass(
          this._classes({
            element: elements,
            keys: classKey,
            classes: value,
            add: true
          })
        );
      }
    },

    _setOptionDisabled: function (value) {
      this._toggleClass(
        this.widget(),
        this.widgetFullName + '-disabled',
        null,
        !!value
      );

      // If the widget is becoming disabled, then nothing is interactive
      if (value) {
        this._removeClass(this.hoverable, null, 'ui-state-hover');
        this._removeClass(this.focusable, null, 'ui-state-focus');
      }
    },

    enable: function () {
      return this._setOptions({ disabled: false });
    },

    disable: function () {
      return this._setOptions({ disabled: true });
    },

    _classes: function (options) {
      var full = [];
      var that = this;

      options = $.extend(
        {
          element: this.element,
          classes: this.options.classes || {}
        },
        options
      );

      function bindRemoveEvent() {
        options.element.each(function (_, element) {
          var isTracked = $.map(that.classesElementLookup, function (elements) {
            return elements;
          }).some(function (elements) {
            return elements.is(element);
          });

          if (!isTracked) {
            that._on($(element), {
              remove: '_untrackClassesElement'
            });
          }
        });
      }

      function processClassString(classes, checkOption) {
        var current, i;
        for (i = 0; i < classes.length; i++) {
          current = that.classesElementLookup[classes[i]] || $();
          if (options.add) {
            bindRemoveEvent();
            current = $(
              $.uniqueSort(current.get().concat(options.element.get()))
            );
          } else {
            current = $(current.not(options.element).get());
          }
          that.classesElementLookup[classes[i]] = current;
          full.push(classes[i]);
          if (checkOption && options.classes[classes[i]]) {
            full.push(options.classes[classes[i]]);
          }
        }
      }

      if (options.keys) {
        processClassString(options.keys.match(/\S+/g) || [], true);
      }
      if (options.extra) {
        processClassString(options.extra.match(/\S+/g) || []);
      }

      return full.join(' ');
    },

    _untrackClassesElement: function (event) {
      var that = this;
      $.each(that.classesElementLookup, function (key, value) {
        if ($.inArray(event.target, value) !== -1) {
          that.classesElementLookup[key] = $(value.not(event.target).get());
        }
      });

      this._off($(event.target));
    },

    _removeClass: function (element, keys, extra) {
      return this._toggleClass(element, keys, extra, false);
    },

    _addClass: function (element, keys, extra) {
      return this._toggleClass(element, keys, extra, true);
    },

    _toggleClass: function (element, keys, extra, add) {
      add = typeof add === 'boolean' ? add : extra;
      var shift = typeof element === 'string' || element === null,
        options = {
          extra: shift ? keys : extra,
          keys: shift ? element : keys,
          element: shift ? this.element : element,
          add: add
        };
      options.element.toggleClass(this._classes(options), add);
      return this;
    },

    _on: function (suppressDisabledCheck, element, handlers) {
      var delegateElement;
      var instance = this;

      // No suppressDisabledCheck flag, shuffle arguments
      if (typeof suppressDisabledCheck !== 'boolean') {
        handlers = element;
        element = suppressDisabledCheck;
        suppressDisabledCheck = false;
      }

      // No element argument, shuffle and use this.element
      if (!handlers) {
        handlers = element;
        element = this.element;
        delegateElement = this.widget();
      } else {
        element = delegateElement = $(element);
        this.bindings = this.bindings.add(element);
      }

      $.each(handlers, function (event, handler) {
        function handlerProxy() {
          // Allow widgets to customize the disabled handling
          // - disabled as an array instead of boolean
          // - disabled class as method for disabling individual parts
          if (
            !suppressDisabledCheck &&
            (instance.options.disabled === true ||
              $(this).hasClass('ui-state-disabled'))
          ) {
            return;
          }
          return (typeof handler === 'string'
            ? instance[handler]
            : handler
          ).apply(instance, arguments);
        }

        // Copy the guid so direct unbinding works
        if (typeof handler !== 'string') {
          handlerProxy.guid = handler.guid =
            handler.guid || handlerProxy.guid || $.guid++;
        }

        var match = event.match(/^([\w:-]*)\s*(.*)$/);
        var eventName = match[1] + instance.eventNamespace;
        var selector = match[2];

        if (selector) {
          delegateElement.on(eventName, selector, handlerProxy);
        } else {
          element.on(eventName, handlerProxy);
        }
      });
    },

    _off: function (element, eventName) {
      eventName =
        (eventName || '').split(' ').join(this.eventNamespace + ' ') +
        this.eventNamespace;
      element.off(eventName);

      // Clear the stack to avoid memory leaks (#10056)
      this.bindings = $(this.bindings.not(element).get());
      this.focusable = $(this.focusable.not(element).get());
      this.hoverable = $(this.hoverable.not(element).get());
    },

    _delay: function (handler, delay) {
      var instance = this;
      function handlerProxy() {
        return (typeof handler === 'string'
          ? instance[handler]
          : handler
        ).apply(instance, arguments);
      }
      return setTimeout(handlerProxy, delay || 0);
    },

    _hoverable: function (element) {
      this.hoverable = this.hoverable.add(element);
      this._on(element, {
        mouseenter: function (event) {
          this._addClass($(event.currentTarget), null, 'ui-state-hover');
        },
        mouseleave: function (event) {
          this._removeClass($(event.currentTarget), null, 'ui-state-hover');
        }
      });
    },

    _focusable: function (element) {
      this.focusable = this.focusable.add(element);
      this._on(element, {
        focusin: function (event) {
          this._addClass($(event.currentTarget), null, 'ui-state-focus');
        },
        focusout: function (event) {
          this._removeClass($(event.currentTarget), null, 'ui-state-focus');
        }
      });
    },

    _trigger: function (type, event, data) {
      var prop, orig;
      var callback = this.options[type];

      data = data || {};
      event = $.Event(event);
      event.type = (type === this.widgetEventPrefix
        ? type
        : this.widgetEventPrefix + type
      ).toLowerCase();

      // The original event may come from any element
      // so we need to reset the target on the new event
      event.target = this.element[0];

      // Copy original event properties over to the new event
      orig = event.originalEvent;
      if (orig) {
        for (prop in orig) {
          if (!(prop in event)) {
            event[prop] = orig[prop];
          }
        }
      }

      this.element.trigger(event, data);
      return !(
        ($.isFunction(callback) &&
          callback.apply(this.element[0], [event].concat(data)) === false) ||
        event.isDefaultPrevented()
      );
    }
  };

  $.each({ show: 'fadeIn', hide: 'fadeOut' }, function (method, defaultEffect) {
    $.Widget.prototype['_' + method] = function (element, options, callback) {
      if (typeof options === 'string') {
        options = { effect: options };
      }

      var hasOptions;
      var effectName = !options
        ? method
        : options === true || typeof options === 'number'
        ? defaultEffect
        : options.effect || defaultEffect;

      options = options || {};
      if (typeof options === 'number') {
        options = { duration: options };
      }

      hasOptions = !$.isEmptyObject(options);
      options.complete = callback;

      if (options.delay) {
        element.delay(options.delay);
      }

      if (hasOptions && $.effects && $.effects.effect[effectName]) {
        element[method](options);
      } else if (effectName !== method && element[effectName]) {
        element[effectName](options.duration, options.easing, callback);
      } else {
        element.queue(function (next) {
          $(this)[method]();
          if (callback) {
            callback.call(element[0]);
          }
          next();
        });
      }
    };
  });
});
var Markdown;

if (typeof exports === "object" && typeof require === "function") // we're in a CommonJS (e.g. Node.js) module
  Markdown = exports;
else
  Markdown = {};

/**
  This is only included so we have an interface that Pagedown can use.
**/
(function () {

    function identity(x) { return x; }
    function returnFalse(x) { return false; }

    function HookCollection() { }

    HookCollection.prototype = {

        chain: function (hookname, func) {
            var original = this[hookname];
            if (!original)
                throw new Error("unknown hook " + hookname);

            if (original === identity)
                this[hookname] = func;
            else
                this[hookname] = function (text) {
                    var args = Array.prototype.slice.call(arguments, 0);
                    args[0] = original.apply(null, args);
                    return func.apply(null, args);
                };
        },
        set: function (hookname, func) {
            if (!this[hookname])
                throw new Error("unknown hook " + hookname);
            this[hookname] = func;
        },
        addNoop: function (hookname) {
            this[hookname] = identity;
        },
        addFalse: function (hookname) {
            this[hookname] = returnFalse;
        }
    };

    Markdown.HookCollection = HookCollection;

})();
/**
 * bootbox.js v3.2.0
 *
 * http://bootboxjs.com/license.txt
 */

var bootbox =
  window.bootbox ||
  (function (document, $) {
    /*jshint scripturl:true sub:true */

    var _locale = "en",
      _defaultLocale = "en",
      _animate = true,
      _backdrop = "static",
      _defaultHref = "javascript:;",
      _classes = "",
      _btnClasses = {},
      _icons = {},
      /* last var should always be the public object we'll return */
      that = {};

    /**
     * public API
     */
    that.setLocale = function (locale) {
      for (var i in _locales) {
        if (i == locale) {
          _locale = locale;
          return;
        }
      }
      throw new Error("Invalid locale: " + locale);
    };

    that.addLocale = function (locale, translations) {
      if (typeof _locales[locale] === "undefined") {
        _locales[locale] = {};
      }
      for (var str in translations) {
        _locales[locale][str] = translations[str];
      }
    };

    that.setIcons = function (icons) {
      _icons = icons;
      if (typeof _icons !== "object" || _icons === null) {
        _icons = {};
      }
    };

    that.setBtnClasses = function (btnClasses) {
      _btnClasses = btnClasses;
      if (typeof _btnClasses !== "object" || _btnClasses === null) {
        _btnClasses = {};
      }
    };

    that.alert = function (/*str, label, cb*/) {
      var str = "",
        label = _translate("OK"),
        cb = null;

      switch (arguments.length) {
        case 1:
          // no callback, default button label
          str = arguments[0];
          break;
        case 2:
          // callback *or* custom button label dependent on type
          str = arguments[0];
          if (typeof arguments[1] == "function") {
            cb = arguments[1];
          } else {
            label = arguments[1];
          }
          break;
        case 3:
          // callback and custom button label
          str = arguments[0];
          label = arguments[1];
          cb = arguments[2];
          break;
        default:
          throw new Error("Incorrect number of arguments: expected 1-3");
      }

      return that.dialog(
        str,
        {
          // only button (ok)
          label: label,
          icon: _icons.OK,
          class: _btnClasses.OK,
          callback: cb,
        },
        {
          // ensure that the escape key works; either invoking the user's
          // callback or true to just close the dialog
          onEscape: cb || true,
        }
      );
    };

    that.confirm = function (/*str, labelCancel, labelOk, cb*/) {
      var str = "",
        labelCancel = _translate("CANCEL"),
        labelOk = _translate("CONFIRM"),
        cb = null;

      switch (arguments.length) {
        case 1:
          str = arguments[0];
          break;
        case 2:
          str = arguments[0];
          if (typeof arguments[1] == "function") {
            cb = arguments[1];
          } else {
            labelCancel = arguments[1];
          }
          break;
        case 3:
          str = arguments[0];
          labelCancel = arguments[1];
          if (typeof arguments[2] == "function") {
            cb = arguments[2];
          } else {
            labelOk = arguments[2];
          }
          break;
        case 4:
          str = arguments[0];
          labelCancel = arguments[1];
          labelOk = arguments[2];
          cb = arguments[3];
          break;
        default:
          throw new Error("Incorrect number of arguments: expected 1-4");
      }

      var cancelCallback = function () {
        if (typeof cb === "function") {
          return cb(false);
        }
      };

      var confirmCallback = function () {
        if (typeof cb === "function") {
          return cb(true);
        }
      };

      return that.dialog(
        str,
        [
          {
            // first button (cancel)
            label: labelCancel,
            icon: _icons.CANCEL,
            class: _btnClasses.CANCEL,
            callback: cancelCallback,
          },
          {
            // second button (confirm)
            label: labelOk,
            icon: _icons.CONFIRM,
            class: _btnClasses.CONFIRM,
            callback: confirmCallback,
          },
        ],
        {
          // escape key bindings
          onEscape: cancelCallback,
        }
      );
    };

    that.prompt = function (/*str, labelCancel, labelOk, cb, defaultVal*/) {
      var str = "",
        labelCancel = _translate("CANCEL"),
        labelOk = _translate("CONFIRM"),
        cb = null,
        defaultVal = "";

      switch (arguments.length) {
        case 1:
          str = arguments[0];
          break;
        case 2:
          str = arguments[0];
          if (typeof arguments[1] == "function") {
            cb = arguments[1];
          } else {
            labelCancel = arguments[1];
          }
          break;
        case 3:
          str = arguments[0];
          labelCancel = arguments[1];
          if (typeof arguments[2] == "function") {
            cb = arguments[2];
          } else {
            labelOk = arguments[2];
          }
          break;
        case 4:
          str = arguments[0];
          labelCancel = arguments[1];
          labelOk = arguments[2];
          cb = arguments[3];
          break;
        case 5:
          str = arguments[0];
          labelCancel = arguments[1];
          labelOk = arguments[2];
          cb = arguments[3];
          defaultVal = arguments[4];
          break;
        default:
          throw new Error("Incorrect number of arguments: expected 1-5");
      }

      var header = str;

      // let's keep a reference to the form object for later
      var form = $("<form></form>");
      form.append(
        "<input class='input-block-level' autocomplete=off type=text value='" +
          defaultVal +
          "' />"
      );

      var cancelCallback = function () {
        if (typeof cb === "function") {
          // yep, native prompts dismiss with null, whereas native
          // confirms dismiss with false...
          return cb(null);
        }
      };

      var confirmCallback = function () {
        if (typeof cb === "function") {
          return cb(form.find("input[type=text]").val());
        }
      };

      var div = that.dialog(
        form,
        [
          {
            // first button (cancel)
            label: labelCancel,
            icon: _icons.CANCEL,
            class: _btnClasses.CANCEL,
            callback: cancelCallback,
          },
          {
            // second button (confirm)
            label: labelOk,
            icon: _icons.CONFIRM,
            class: _btnClasses.CONFIRM,
            callback: confirmCallback,
          },
        ],
        {
          // prompts need a few extra options
          header: header,
          // explicitly tell dialog NOT to show the dialog...
          show: false,
          onEscape: cancelCallback,
        }
      );

      // ... the reason the prompt needs to be hidden is because we need
      // to bind our own "shown" handler, after creating the modal but
      // before any show(n) events are triggered
      // @see https://github.com/makeusabrew/bootbox/issues/69

      div.on("shown", function () {
        form.find("input[type=text]").focus();

        // ensure that submitting the form (e.g. with the enter key)
        // replicates the behaviour of a normal prompt()
        form.on("submit", function (e) {
          e.preventDefault();
          div.find(".btn-primary").click();
        });
      });

      div.modal("show");

      return div;
    };

    that.dialog = function (str, handlers, options) {
      var buttons = "",
        callbacks = [];

      if (!options) {
        options = {};
      }

      // check for single object and convert to array if necessary
      if (typeof handlers === "undefined") {
        handlers = [];
      } else if (typeof handlers.length == "undefined") {
        handlers = [handlers];
      }

      var i = handlers.length;
      while (i--) {
        var label = null,
          href = null,
          _class = "btn-default",
          icon = "",
          callback = null;

        if (
          typeof handlers[i]["label"] == "undefined" &&
          typeof handlers[i]["class"] == "undefined" &&
          typeof handlers[i]["callback"] == "undefined"
        ) {
          // if we've got nothing we expect, check for condensed format

          var propCount = 0, // condensed will only match if this == 1
            property = null; // save the last property we found

          // be nicer to count the properties without this, but don't think it's possible...
          for (var j in handlers[i]) {
            property = j;
            if (++propCount > 1) {
              // forget it, too many properties
              break;
            }
          }

          if (propCount == 1 && typeof handlers[i][j] == "function") {
            // matches condensed format of label -> function
            handlers[i]["label"] = property;
            handlers[i]["callback"] = handlers[i][j];
          }
        }

        if (typeof handlers[i]["callback"] == "function") {
          callback = handlers[i]["callback"];
        }

        if (handlers[i]["class"]) {
          _class = handlers[i]["class"];
        } else if (i == handlers.length - 1 && handlers.length <= 2) {
          // always add a primary to the main option in a two-button dialog
          _class = "btn-primary";
        }

        // See: https://github.com/makeusabrew/bootbox/pull/114
        // Upgrade to official bootbox release when it gets merged.
        if (handlers[i]["link"] !== true) {
          _class = "btn " + _class;
        }

        if (handlers[i]["label"]) {
          label = handlers[i]["label"];
        } else {
          label = "Option " + (i + 1);
        }

        if (handlers[i]["icon"]) {
          icon = handlers[i]["icon"];
        }

        if (handlers[i]["href"]) {
          href = handlers[i]["href"];
        } else {
          href = _defaultHref;
        }

        buttons =
          buttons +
          "<a data-handler='" +
          i +
          "' class='" +
          _class +
          "' href='" +
          href +
          "'>" +
          icon +
          "<span class='d-button-label'>" +
          label +
          "</span></a>";

        callbacks[i] = callback;
      }

      // @see https://github.com/makeusabrew/bootbox/issues/46#issuecomment-8235302
      // and https://github.com/twitter/bootstrap/issues/4474
      // for an explanation of the inline overflow: hidden
      // @see https://github.com/twitter/bootstrap/issues/4854
      // for an explanation of tabIndex=-1

      var parts = [
        "<div class='bootbox modal' tabindex='-1' style='overflow:hidden;'>",
      ];

      if (options["header"]) {
        var closeButton = "";
        if (
          typeof options["headerCloseButton"] == "undefined" ||
          options["headerCloseButton"]
        ) {
          closeButton =
            "<a href='" + _defaultHref + "' class='close'>&times;</a>";
        }

        parts.push(
          "<div class='modal-header'>" +
            closeButton +
            "<h3>" +
            options["header"] +
            "</h3></div>"
        );
      }

      // push an empty body into which we'll inject the proper content later
      parts.push("<div class='modal-body'></div>");

      if (buttons) {
        parts.push("<div class='modal-footer'>" + buttons + "</div>");
      }

      parts.push("</div>");

      var div = $(parts.join("\n"));

      // check whether we should fade in/out
      var shouldFade =
        typeof options.animate === "undefined" ? _animate : options.animate;

      if (shouldFade) {
        div.addClass("fade");
      }

      var optionalClasses =
        typeof options.classes === "undefined" ? _classes : options.classes;
      if (optionalClasses) {
        div.addClass(optionalClasses);
      }

      // now we've built up the div properly we can inject the content whether it was a string or a jQuery object
      div.find(".modal-body").html(str);

      function onCancel(source) {
        // for now source is unused, but it will be in future
        var hideModal = null;
        if (typeof options.onEscape === "function") {
          // @see https://github.com/makeusabrew/bootbox/issues/91
          hideModal = options.onEscape();
        }

        if (hideModal !== false) {
          div.modal("hide");
        }
      }

      // hook into the modal's keyup trigger to check for the escape key
      div.on("keyup.dismiss.modal", function (e) {
        // any truthy value passed to onEscape will dismiss the dialog
        // as long as the onEscape function (if defined) doesn't prevent it
        if (e.which === 27 && options.onEscape !== false) {
          onCancel("escape");
        }
      });

      // handle close buttons too
      div.on("click", "a.close", function (e) {
        e.preventDefault();
        onCancel("close");
      });

      // well, *if* we have a primary - give the first dom element focus
      div.on("shown.bs.modal", function () {
        div.find("a.btn-primary:first").focus();
      });

      div.on("hidden.bs.modal", function () {
        div.remove();
      });

      // wire up button handlers
      div.on("click", ".modal-footer a", function (e) {
        var self = this;
        Ember.run(function () {
          var handler = $(self).data("handler"),
            cb = callbacks[handler],
            hideModal = null;

          // sort of @see https://github.com/makeusabrew/bootbox/pull/68 - heavily adapted
          // if we've got a custom href attribute, all bets are off
          if (
            typeof handler !== "undefined" &&
            typeof handlers[handler]["href"] !== "undefined"
          ) {
            return;
          }

          e.preventDefault();

          if (typeof cb === "function") {
            hideModal = cb(e);
          }

          // the only way hideModal *will* be false is if a callback exists and
          // returns it as a value. in those situations, don't hide the dialog
          // @see https://github.com/makeusabrew/bootbox/pull/25
          if (hideModal !== false) {
            div.modal("hide");
          }
        });
      });

      // stick the modal right at the bottom of the main body out of the way
      (that.$body || $("body")).append(div);

      div.modal({
        // unless explicitly overridden take whatever our default backdrop value is
        backdrop:
          typeof options.backdrop === "undefined"
            ? _backdrop
            : options.backdrop,
        // ignore bootstrap's keyboard options; we'll handle this ourselves (more fine-grained control)
        keyboard: false,
        // @ see https://github.com/makeusabrew/bootbox/issues/69
        // we *never* want the modal to be shown before we can bind stuff to it
        // this method can also take a 'show' option, but we'll only use that
        // later if we need to
        show: false,
      });

      // @see https://github.com/makeusabrew/bootbox/issues/64
      // @see https://github.com/makeusabrew/bootbox/issues/60
      // ...caused by...
      // @see https://github.com/twitter/bootstrap/issues/4781
      div.on("show", function (e) {
        $(document).off("focusin.modal");
      });

      if (typeof options.show === "undefined" || options.show === true) {
        div.modal("show");
      }

      return div;
    };

    /**
     * #modal is deprecated in v3; it can still be used but no guarantees are
     * made - have never been truly convinced of its merit but perhaps just
     * needs a tidyup and some TLC
     */
    that.modal = function (/*str, label, options*/) {
      var str;
      var label;
      var options;

      var defaultOptions = {
        onEscape: null,
        keyboard: true,
        backdrop: _backdrop,
      };

      switch (arguments.length) {
        case 1:
          str = arguments[0];
          break;
        case 2:
          str = arguments[0];
          if (typeof arguments[1] == "object") {
            options = arguments[1];
          } else {
            label = arguments[1];
          }
          break;
        case 3:
          str = arguments[0];
          label = arguments[1];
          options = arguments[2];
          break;
        default:
          throw new Error("Incorrect number of arguments: expected 1-3");
      }

      defaultOptions["header"] = label;

      if (typeof options == "object") {
        options = $.extend(defaultOptions, options);
      } else {
        options = defaultOptions;
      }

      return that.dialog(str, [], options);
    };

    that.hideAll = function () {
      $(".bootbox").modal("hide");
    };

    that.animate = function (animate) {
      _animate = animate;
    };

    that.backdrop = function (backdrop) {
      _backdrop = backdrop;
    };

    that.classes = function (classes) {
      _classes = classes;
    };

    /**
     * private API
     */

    /**
     * standard locales. Please add more according to ISO 639-1 standard. Multiple language variants are
     * unlikely to be required. If this gets too large it can be split out into separate JS files.
     */
    var _locales = {
      br: {
        OK: "OK",
        CANCEL: "Cancelar",
        CONFIRM: "Sim",
      },
      da: {
        OK: "OK",
        CANCEL: "Annuller",
        CONFIRM: "Accepter",
      },
      de: {
        OK: "OK",
        CANCEL: "Abbrechen",
        CONFIRM: "Akzeptieren",
      },
      en: {
        OK: "OK",
        CANCEL: "Cancel",
        CONFIRM: "OK",
      },
      es: {
        OK: "OK",
        CANCEL: "Cancelar",
        CONFIRM: "Aceptar",
      },
      fr: {
        OK: "OK",
        CANCEL: "Annuler",
        CONFIRM: "D'accord",
      },
      it: {
        OK: "OK",
        CANCEL: "Annulla",
        CONFIRM: "Conferma",
      },
      nl: {
        OK: "OK",
        CANCEL: "Annuleren",
        CONFIRM: "Accepteren",
      },
      pl: {
        OK: "OK",
        CANCEL: "Anuluj",
        CONFIRM: "Potwierdź",
      },
      ru: {
        OK: "OK",
        CANCEL: "Отмена",
        CONFIRM: "Применить",
      },
      zh_CN: {
        OK: "OK",
        CANCEL: "取消",
        CONFIRM: "确认",
      },
      zh_TW: {
        OK: "OK",
        CANCEL: "取消",
        CONFIRM: "確認",
      },
    };

    function _translate(str, locale) {
      // we assume if no target locale is probided then we should take it from current setting
      if (typeof locale === "undefined") {
        locale = _locale;
      }
      if (typeof _locales[locale][str] === "string") {
        return _locales[locale][str];
      }

      // if we couldn't find a lookup then try and fallback to a default translation

      if (locale != _defaultLocale) {
        return _translate(str, _defaultLocale);
      }

      // if we can't do anything then bail out with whatever string was passed in - last resort
      return str;
    }

    return that;
  })(document, window.jQuery);

// @see https://github.com/makeusabrew/bootbox/issues/71
window.bootbox = bootbox;

define("bootbox", ["exports"], function (__exports__) {
  __exports__.default = window.bootbox;
});
/**
 * @popperjs/core v2.9.3 - MIT License
 */


(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Popper = {}));
}(this, (function (exports) { 'use strict';

  function getWindow(node) {
    if (node == null) {
      return window;
    }

    if (node.toString() !== '[object Window]') {
      var ownerDocument = node.ownerDocument;
      return ownerDocument ? ownerDocument.defaultView || window : window;
    }

    return node;
  }

  function isElement(node) {
    var OwnElement = getWindow(node).Element;
    return node instanceof OwnElement || node instanceof Element;
  }

  function isHTMLElement(node) {
    var OwnElement = getWindow(node).HTMLElement;
    return node instanceof OwnElement || node instanceof HTMLElement;
  }

  function isShadowRoot(node) {
    // IE 11 has no ShadowRoot
    if (typeof ShadowRoot === 'undefined') {
      return false;
    }

    var OwnElement = getWindow(node).ShadowRoot;
    return node instanceof OwnElement || node instanceof ShadowRoot;
  }

  var round$1 = Math.round;
  function getBoundingClientRect(element, includeScale) {
    if (includeScale === void 0) {
      includeScale = false;
    }

    var rect = element.getBoundingClientRect();
    var scaleX = 1;
    var scaleY = 1;

    if (isHTMLElement(element) && includeScale) {
      // Fallback to 1 in case both values are `0`
      scaleX = rect.width / element.offsetWidth || 1;
      scaleY = rect.height / element.offsetHeight || 1;
    }

    return {
      width: round$1(rect.width / scaleX),
      height: round$1(rect.height / scaleY),
      top: round$1(rect.top / scaleY),
      right: round$1(rect.right / scaleX),
      bottom: round$1(rect.bottom / scaleY),
      left: round$1(rect.left / scaleX),
      x: round$1(rect.left / scaleX),
      y: round$1(rect.top / scaleY)
    };
  }

  function getWindowScroll(node) {
    var win = getWindow(node);
    var scrollLeft = win.pageXOffset;
    var scrollTop = win.pageYOffset;
    return {
      scrollLeft: scrollLeft,
      scrollTop: scrollTop
    };
  }

  function getHTMLElementScroll(element) {
    return {
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop
    };
  }

  function getNodeScroll(node) {
    if (node === getWindow(node) || !isHTMLElement(node)) {
      return getWindowScroll(node);
    } else {
      return getHTMLElementScroll(node);
    }
  }

  function getNodeName(element) {
    return element ? (element.nodeName || '').toLowerCase() : null;
  }

  function getDocumentElement(element) {
    // $FlowFixMe[incompatible-return]: assume body is always available
    return ((isElement(element) ? element.ownerDocument : // $FlowFixMe[prop-missing]
    element.document) || window.document).documentElement;
  }

  function getWindowScrollBarX(element) {
    // If <html> has a CSS width greater than the viewport, then this will be
    // incorrect for RTL.
    // Popper 1 is broken in this case and never had a bug report so let's assume
    // it's not an issue. I don't think anyone ever specifies width on <html>
    // anyway.
    // Browsers where the left scrollbar doesn't cause an issue report `0` for
    // this (e.g. Edge 2019, IE11, Safari)
    return getBoundingClientRect(getDocumentElement(element)).left + getWindowScroll(element).scrollLeft;
  }

  function getComputedStyle(element) {
    return getWindow(element).getComputedStyle(element);
  }

  function isScrollParent(element) {
    // Firefox wants us to check `-x` and `-y` variations as well
    var _getComputedStyle = getComputedStyle(element),
        overflow = _getComputedStyle.overflow,
        overflowX = _getComputedStyle.overflowX,
        overflowY = _getComputedStyle.overflowY;

    return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
  }

  function isElementScaled(element) {
    var rect = element.getBoundingClientRect();
    var scaleX = rect.width / element.offsetWidth || 1;
    var scaleY = rect.height / element.offsetHeight || 1;
    return scaleX !== 1 || scaleY !== 1;
  } // Returns the composite rect of an element relative to its offsetParent.
  // Composite means it takes into account transforms as well as layout.


  function getCompositeRect(elementOrVirtualElement, offsetParent, isFixed) {
    if (isFixed === void 0) {
      isFixed = false;
    }

    var isOffsetParentAnElement = isHTMLElement(offsetParent);
    var offsetParentIsScaled = isHTMLElement(offsetParent) && isElementScaled(offsetParent);
    var documentElement = getDocumentElement(offsetParent);
    var rect = getBoundingClientRect(elementOrVirtualElement, offsetParentIsScaled);
    var scroll = {
      scrollLeft: 0,
      scrollTop: 0
    };
    var offsets = {
      x: 0,
      y: 0
    };

    if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
      if (getNodeName(offsetParent) !== 'body' || // https://github.com/popperjs/popper-core/issues/1078
      isScrollParent(documentElement)) {
        scroll = getNodeScroll(offsetParent);
      }

      if (isHTMLElement(offsetParent)) {
        offsets = getBoundingClientRect(offsetParent, true);
        offsets.x += offsetParent.clientLeft;
        offsets.y += offsetParent.clientTop;
      } else if (documentElement) {
        offsets.x = getWindowScrollBarX(documentElement);
      }
    }

    return {
      x: rect.left + scroll.scrollLeft - offsets.x,
      y: rect.top + scroll.scrollTop - offsets.y,
      width: rect.width,
      height: rect.height
    };
  }

  // means it doesn't take into account transforms.

  function getLayoutRect(element) {
    var clientRect = getBoundingClientRect(element); // Use the clientRect sizes if it's not been transformed.
    // Fixes https://github.com/popperjs/popper-core/issues/1223

    var width = element.offsetWidth;
    var height = element.offsetHeight;

    if (Math.abs(clientRect.width - width) <= 1) {
      width = clientRect.width;
    }

    if (Math.abs(clientRect.height - height) <= 1) {
      height = clientRect.height;
    }

    return {
      x: element.offsetLeft,
      y: element.offsetTop,
      width: width,
      height: height
    };
  }

  function getParentNode(element) {
    if (getNodeName(element) === 'html') {
      return element;
    }

    return (// this is a quicker (but less type safe) way to save quite some bytes from the bundle
      // $FlowFixMe[incompatible-return]
      // $FlowFixMe[prop-missing]
      element.assignedSlot || // step into the shadow DOM of the parent of a slotted node
      element.parentNode || ( // DOM Element detected
      isShadowRoot(element) ? element.host : null) || // ShadowRoot detected
      // $FlowFixMe[incompatible-call]: HTMLElement is a Node
      getDocumentElement(element) // fallback

    );
  }

  function getScrollParent(node) {
    if (['html', 'body', '#document'].indexOf(getNodeName(node)) >= 0) {
      // $FlowFixMe[incompatible-return]: assume body is always available
      return node.ownerDocument.body;
    }

    if (isHTMLElement(node) && isScrollParent(node)) {
      return node;
    }

    return getScrollParent(getParentNode(node));
  }

  /*
  given a DOM element, return the list of all scroll parents, up the list of ancesors
  until we get to the top window object. This list is what we attach scroll listeners
  to, because if any of these parent elements scroll, we'll need to re-calculate the
  reference element's position.
  */

  function listScrollParents(element, list) {
    var _element$ownerDocumen;

    if (list === void 0) {
      list = [];
    }

    var scrollParent = getScrollParent(element);
    var isBody = scrollParent === ((_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body);
    var win = getWindow(scrollParent);
    var target = isBody ? [win].concat(win.visualViewport || [], isScrollParent(scrollParent) ? scrollParent : []) : scrollParent;
    var updatedList = list.concat(target);
    return isBody ? updatedList : // $FlowFixMe[incompatible-call]: isBody tells us target will be an HTMLElement here
    updatedList.concat(listScrollParents(getParentNode(target)));
  }

  function isTableElement(element) {
    return ['table', 'td', 'th'].indexOf(getNodeName(element)) >= 0;
  }

  function getTrueOffsetParent(element) {
    if (!isHTMLElement(element) || // https://github.com/popperjs/popper-core/issues/837
    getComputedStyle(element).position === 'fixed') {
      return null;
    }

    return element.offsetParent;
  } // `.offsetParent` reports `null` for fixed elements, while absolute elements
  // return the containing block


  function getContainingBlock(element) {
    var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') !== -1;
    var isIE = navigator.userAgent.indexOf('Trident') !== -1;

    if (isIE && isHTMLElement(element)) {
      // In IE 9, 10 and 11 fixed elements containing block is always established by the viewport
      var elementCss = getComputedStyle(element);

      if (elementCss.position === 'fixed') {
        return null;
      }
    }

    var currentNode = getParentNode(element);

    while (isHTMLElement(currentNode) && ['html', 'body'].indexOf(getNodeName(currentNode)) < 0) {
      var css = getComputedStyle(currentNode); // This is non-exhaustive but covers the most common CSS properties that
      // create a containing block.
      // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block

      if (css.transform !== 'none' || css.perspective !== 'none' || css.contain === 'paint' || ['transform', 'perspective'].indexOf(css.willChange) !== -1 || isFirefox && css.willChange === 'filter' || isFirefox && css.filter && css.filter !== 'none') {
        return currentNode;
      } else {
        currentNode = currentNode.parentNode;
      }
    }

    return null;
  } // Gets the closest ancestor positioned element. Handles some edge cases,
  // such as table ancestors and cross browser bugs.


  function getOffsetParent(element) {
    var window = getWindow(element);
    var offsetParent = getTrueOffsetParent(element);

    while (offsetParent && isTableElement(offsetParent) && getComputedStyle(offsetParent).position === 'static') {
      offsetParent = getTrueOffsetParent(offsetParent);
    }

    if (offsetParent && (getNodeName(offsetParent) === 'html' || getNodeName(offsetParent) === 'body' && getComputedStyle(offsetParent).position === 'static')) {
      return window;
    }

    return offsetParent || getContainingBlock(element) || window;
  }

  var top = 'top';
  var bottom = 'bottom';
  var right = 'right';
  var left = 'left';
  var auto = 'auto';
  var basePlacements = [top, bottom, right, left];
  var start = 'start';
  var end = 'end';
  var clippingParents = 'clippingParents';
  var viewport = 'viewport';
  var popper = 'popper';
  var reference = 'reference';
  var variationPlacements = /*#__PURE__*/basePlacements.reduce(function (acc, placement) {
    return acc.concat([placement + "-" + start, placement + "-" + end]);
  }, []);
  var placements = /*#__PURE__*/[].concat(basePlacements, [auto]).reduce(function (acc, placement) {
    return acc.concat([placement, placement + "-" + start, placement + "-" + end]);
  }, []); // modifiers that need to read the DOM

  var beforeRead = 'beforeRead';
  var read = 'read';
  var afterRead = 'afterRead'; // pure-logic modifiers

  var beforeMain = 'beforeMain';
  var main = 'main';
  var afterMain = 'afterMain'; // modifier with the purpose to write to the DOM (or write into a framework state)

  var beforeWrite = 'beforeWrite';
  var write = 'write';
  var afterWrite = 'afterWrite';
  var modifierPhases = [beforeRead, read, afterRead, beforeMain, main, afterMain, beforeWrite, write, afterWrite];

  function order(modifiers) {
    var map = new Map();
    var visited = new Set();
    var result = [];
    modifiers.forEach(function (modifier) {
      map.set(modifier.name, modifier);
    }); // On visiting object, check for its dependencies and visit them recursively

    function sort(modifier) {
      visited.add(modifier.name);
      var requires = [].concat(modifier.requires || [], modifier.requiresIfExists || []);
      requires.forEach(function (dep) {
        if (!visited.has(dep)) {
          var depModifier = map.get(dep);

          if (depModifier) {
            sort(depModifier);
          }
        }
      });
      result.push(modifier);
    }

    modifiers.forEach(function (modifier) {
      if (!visited.has(modifier.name)) {
        // check for visited object
        sort(modifier);
      }
    });
    return result;
  }

  function orderModifiers(modifiers) {
    // order based on dependencies
    var orderedModifiers = order(modifiers); // order based on phase

    return modifierPhases.reduce(function (acc, phase) {
      return acc.concat(orderedModifiers.filter(function (modifier) {
        return modifier.phase === phase;
      }));
    }, []);
  }

  function debounce(fn) {
    var pending;
    return function () {
      if (!pending) {
        pending = new Promise(function (resolve) {
          Promise.resolve().then(function () {
            pending = undefined;
            resolve(fn());
          });
        });
      }

      return pending;
    };
  }

  function format(str) {
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    return [].concat(args).reduce(function (p, c) {
      return p.replace(/%s/, c);
    }, str);
  }

  var INVALID_MODIFIER_ERROR = 'Popper: modifier "%s" provided an invalid %s property, expected %s but got %s';
  var MISSING_DEPENDENCY_ERROR = 'Popper: modifier "%s" requires "%s", but "%s" modifier is not available';
  var VALID_PROPERTIES = ['name', 'enabled', 'phase', 'fn', 'effect', 'requires', 'options'];
  function validateModifiers(modifiers) {
    modifiers.forEach(function (modifier) {
      Object.keys(modifier).forEach(function (key) {
        switch (key) {
          case 'name':
            if (typeof modifier.name !== 'string') {
              console.error(format(INVALID_MODIFIER_ERROR, String(modifier.name), '"name"', '"string"', "\"" + String(modifier.name) + "\""));
            }

            break;

          case 'enabled':
            if (typeof modifier.enabled !== 'boolean') {
              console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"enabled"', '"boolean"', "\"" + String(modifier.enabled) + "\""));
            }

          case 'phase':
            if (modifierPhases.indexOf(modifier.phase) < 0) {
              console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"phase"', "either " + modifierPhases.join(', '), "\"" + String(modifier.phase) + "\""));
            }

            break;

          case 'fn':
            if (typeof modifier.fn !== 'function') {
              console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"fn"', '"function"', "\"" + String(modifier.fn) + "\""));
            }

            break;

          case 'effect':
            if (typeof modifier.effect !== 'function') {
              console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"effect"', '"function"', "\"" + String(modifier.fn) + "\""));
            }

            break;

          case 'requires':
            if (!Array.isArray(modifier.requires)) {
              console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requires"', '"array"', "\"" + String(modifier.requires) + "\""));
            }

            break;

          case 'requiresIfExists':
            if (!Array.isArray(modifier.requiresIfExists)) {
              console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requiresIfExists"', '"array"', "\"" + String(modifier.requiresIfExists) + "\""));
            }

            break;

          case 'options':
          case 'data':
            break;

          default:
            console.error("PopperJS: an invalid property has been provided to the \"" + modifier.name + "\" modifier, valid properties are " + VALID_PROPERTIES.map(function (s) {
              return "\"" + s + "\"";
            }).join(', ') + "; but \"" + key + "\" was provided.");
        }

        modifier.requires && modifier.requires.forEach(function (requirement) {
          if (modifiers.find(function (mod) {
            return mod.name === requirement;
          }) == null) {
            console.error(format(MISSING_DEPENDENCY_ERROR, String(modifier.name), requirement, requirement));
          }
        });
      });
    });
  }

  function uniqueBy(arr, fn) {
    var identifiers = new Set();
    return arr.filter(function (item) {
      var identifier = fn(item);

      if (!identifiers.has(identifier)) {
        identifiers.add(identifier);
        return true;
      }
    });
  }

  function getBasePlacement(placement) {
    return placement.split('-')[0];
  }

  function mergeByName(modifiers) {
    var merged = modifiers.reduce(function (merged, current) {
      var existing = merged[current.name];
      merged[current.name] = existing ? Object.assign({}, existing, current, {
        options: Object.assign({}, existing.options, current.options),
        data: Object.assign({}, existing.data, current.data)
      }) : current;
      return merged;
    }, {}); // IE11 does not support Object.values

    return Object.keys(merged).map(function (key) {
      return merged[key];
    });
  }

  function getViewportRect(element) {
    var win = getWindow(element);
    var html = getDocumentElement(element);
    var visualViewport = win.visualViewport;
    var width = html.clientWidth;
    var height = html.clientHeight;
    var x = 0;
    var y = 0; // NB: This isn't supported on iOS <= 12. If the keyboard is open, the popper
    // can be obscured underneath it.
    // Also, `html.clientHeight` adds the bottom bar height in Safari iOS, even
    // if it isn't open, so if this isn't available, the popper will be detected
    // to overflow the bottom of the screen too early.

    if (visualViewport) {
      width = visualViewport.width;
      height = visualViewport.height; // Uses Layout Viewport (like Chrome; Safari does not currently)
      // In Chrome, it returns a value very close to 0 (+/-) but contains rounding
      // errors due to floating point numbers, so we need to check precision.
      // Safari returns a number <= 0, usually < -1 when pinch-zoomed
      // Feature detection fails in mobile emulation mode in Chrome.
      // Math.abs(win.innerWidth / visualViewport.scale - visualViewport.width) <
      // 0.001
      // Fallback here: "Not Safari" userAgent

      if (!/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
        x = visualViewport.offsetLeft;
        y = visualViewport.offsetTop;
      }
    }

    return {
      width: width,
      height: height,
      x: x + getWindowScrollBarX(element),
      y: y
    };
  }

  var max = Math.max;
  var min = Math.min;
  var round = Math.round;

  // of the `<html>` and `<body>` rect bounds if horizontally scrollable

  function getDocumentRect(element) {
    var _element$ownerDocumen;

    var html = getDocumentElement(element);
    var winScroll = getWindowScroll(element);
    var body = (_element$ownerDocumen = element.ownerDocument) == null ? void 0 : _element$ownerDocumen.body;
    var width = max(html.scrollWidth, html.clientWidth, body ? body.scrollWidth : 0, body ? body.clientWidth : 0);
    var height = max(html.scrollHeight, html.clientHeight, body ? body.scrollHeight : 0, body ? body.clientHeight : 0);
    var x = -winScroll.scrollLeft + getWindowScrollBarX(element);
    var y = -winScroll.scrollTop;

    if (getComputedStyle(body || html).direction === 'rtl') {
      x += max(html.clientWidth, body ? body.clientWidth : 0) - width;
    }

    return {
      width: width,
      height: height,
      x: x,
      y: y
    };
  }

  function contains(parent, child) {
    var rootNode = child.getRootNode && child.getRootNode(); // First, attempt with faster native method

    if (parent.contains(child)) {
      return true;
    } // then fallback to custom implementation with Shadow DOM support
    else if (rootNode && isShadowRoot(rootNode)) {
        var next = child;

        do {
          if (next && parent.isSameNode(next)) {
            return true;
          } // $FlowFixMe[prop-missing]: need a better way to handle this...


          next = next.parentNode || next.host;
        } while (next);
      } // Give up, the result is false


    return false;
  }

  function rectToClientRect(rect) {
    return Object.assign({}, rect, {
      left: rect.x,
      top: rect.y,
      right: rect.x + rect.width,
      bottom: rect.y + rect.height
    });
  }

  function getInnerBoundingClientRect(element) {
    var rect = getBoundingClientRect(element);
    rect.top = rect.top + element.clientTop;
    rect.left = rect.left + element.clientLeft;
    rect.bottom = rect.top + element.clientHeight;
    rect.right = rect.left + element.clientWidth;
    rect.width = element.clientWidth;
    rect.height = element.clientHeight;
    rect.x = rect.left;
    rect.y = rect.top;
    return rect;
  }

  function getClientRectFromMixedType(element, clippingParent) {
    return clippingParent === viewport ? rectToClientRect(getViewportRect(element)) : isHTMLElement(clippingParent) ? getInnerBoundingClientRect(clippingParent) : rectToClientRect(getDocumentRect(getDocumentElement(element)));
  } // A "clipping parent" is an overflowable container with the characteristic of
  // clipping (or hiding) overflowing elements with a position different from
  // `initial`


  function getClippingParents(element) {
    var clippingParents = listScrollParents(getParentNode(element));
    var canEscapeClipping = ['absolute', 'fixed'].indexOf(getComputedStyle(element).position) >= 0;
    var clipperElement = canEscapeClipping && isHTMLElement(element) ? getOffsetParent(element) : element;

    if (!isElement(clipperElement)) {
      return [];
    } // $FlowFixMe[incompatible-return]: https://github.com/facebook/flow/issues/1414


    return clippingParents.filter(function (clippingParent) {
      return isElement(clippingParent) && contains(clippingParent, clipperElement) && getNodeName(clippingParent) !== 'body';
    });
  } // Gets the maximum area that the element is visible in due to any number of
  // clipping parents


  function getClippingRect(element, boundary, rootBoundary) {
    var mainClippingParents = boundary === 'clippingParents' ? getClippingParents(element) : [].concat(boundary);
    var clippingParents = [].concat(mainClippingParents, [rootBoundary]);
    var firstClippingParent = clippingParents[0];
    var clippingRect = clippingParents.reduce(function (accRect, clippingParent) {
      var rect = getClientRectFromMixedType(element, clippingParent);
      accRect.top = max(rect.top, accRect.top);
      accRect.right = min(rect.right, accRect.right);
      accRect.bottom = min(rect.bottom, accRect.bottom);
      accRect.left = max(rect.left, accRect.left);
      return accRect;
    }, getClientRectFromMixedType(element, firstClippingParent));
    clippingRect.width = clippingRect.right - clippingRect.left;
    clippingRect.height = clippingRect.bottom - clippingRect.top;
    clippingRect.x = clippingRect.left;
    clippingRect.y = clippingRect.top;
    return clippingRect;
  }

  function getVariation(placement) {
    return placement.split('-')[1];
  }

  function getMainAxisFromPlacement(placement) {
    return ['top', 'bottom'].indexOf(placement) >= 0 ? 'x' : 'y';
  }

  function computeOffsets(_ref) {
    var reference = _ref.reference,
        element = _ref.element,
        placement = _ref.placement;
    var basePlacement = placement ? getBasePlacement(placement) : null;
    var variation = placement ? getVariation(placement) : null;
    var commonX = reference.x + reference.width / 2 - element.width / 2;
    var commonY = reference.y + reference.height / 2 - element.height / 2;
    var offsets;

    switch (basePlacement) {
      case top:
        offsets = {
          x: commonX,
          y: reference.y - element.height
        };
        break;

      case bottom:
        offsets = {
          x: commonX,
          y: reference.y + reference.height
        };
        break;

      case right:
        offsets = {
          x: reference.x + reference.width,
          y: commonY
        };
        break;

      case left:
        offsets = {
          x: reference.x - element.width,
          y: commonY
        };
        break;

      default:
        offsets = {
          x: reference.x,
          y: reference.y
        };
    }

    var mainAxis = basePlacement ? getMainAxisFromPlacement(basePlacement) : null;

    if (mainAxis != null) {
      var len = mainAxis === 'y' ? 'height' : 'width';

      switch (variation) {
        case start:
          offsets[mainAxis] = offsets[mainAxis] - (reference[len] / 2 - element[len] / 2);
          break;

        case end:
          offsets[mainAxis] = offsets[mainAxis] + (reference[len] / 2 - element[len] / 2);
          break;
      }
    }

    return offsets;
  }

  function getFreshSideObject() {
    return {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };
  }

  function mergePaddingObject(paddingObject) {
    return Object.assign({}, getFreshSideObject(), paddingObject);
  }

  function expandToHashMap(value, keys) {
    return keys.reduce(function (hashMap, key) {
      hashMap[key] = value;
      return hashMap;
    }, {});
  }

  function detectOverflow(state, options) {
    if (options === void 0) {
      options = {};
    }

    var _options = options,
        _options$placement = _options.placement,
        placement = _options$placement === void 0 ? state.placement : _options$placement,
        _options$boundary = _options.boundary,
        boundary = _options$boundary === void 0 ? clippingParents : _options$boundary,
        _options$rootBoundary = _options.rootBoundary,
        rootBoundary = _options$rootBoundary === void 0 ? viewport : _options$rootBoundary,
        _options$elementConte = _options.elementContext,
        elementContext = _options$elementConte === void 0 ? popper : _options$elementConte,
        _options$altBoundary = _options.altBoundary,
        altBoundary = _options$altBoundary === void 0 ? false : _options$altBoundary,
        _options$padding = _options.padding,
        padding = _options$padding === void 0 ? 0 : _options$padding;
    var paddingObject = mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements));
    var altContext = elementContext === popper ? reference : popper;
    var referenceElement = state.elements.reference;
    var popperRect = state.rects.popper;
    var element = state.elements[altBoundary ? altContext : elementContext];
    var clippingClientRect = getClippingRect(isElement(element) ? element : element.contextElement || getDocumentElement(state.elements.popper), boundary, rootBoundary);
    var referenceClientRect = getBoundingClientRect(referenceElement);
    var popperOffsets = computeOffsets({
      reference: referenceClientRect,
      element: popperRect,
      strategy: 'absolute',
      placement: placement
    });
    var popperClientRect = rectToClientRect(Object.assign({}, popperRect, popperOffsets));
    var elementClientRect = elementContext === popper ? popperClientRect : referenceClientRect; // positive = overflowing the clipping rect
    // 0 or negative = within the clipping rect

    var overflowOffsets = {
      top: clippingClientRect.top - elementClientRect.top + paddingObject.top,
      bottom: elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom,
      left: clippingClientRect.left - elementClientRect.left + paddingObject.left,
      right: elementClientRect.right - clippingClientRect.right + paddingObject.right
    };
    var offsetData = state.modifiersData.offset; // Offsets can be applied only to the popper element

    if (elementContext === popper && offsetData) {
      var offset = offsetData[placement];
      Object.keys(overflowOffsets).forEach(function (key) {
        var multiply = [right, bottom].indexOf(key) >= 0 ? 1 : -1;
        var axis = [top, bottom].indexOf(key) >= 0 ? 'y' : 'x';
        overflowOffsets[key] += offset[axis] * multiply;
      });
    }

    return overflowOffsets;
  }

  var INVALID_ELEMENT_ERROR = 'Popper: Invalid reference or popper argument provided. They must be either a DOM element or virtual element.';
  var INFINITE_LOOP_ERROR = 'Popper: An infinite loop in the modifiers cycle has been detected! The cycle has been interrupted to prevent a browser crash.';
  var DEFAULT_OPTIONS = {
    placement: 'bottom',
    modifiers: [],
    strategy: 'absolute'
  };

  function areValidElements() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return !args.some(function (element) {
      return !(element && typeof element.getBoundingClientRect === 'function');
    });
  }

  function popperGenerator(generatorOptions) {
    if (generatorOptions === void 0) {
      generatorOptions = {};
    }

    var _generatorOptions = generatorOptions,
        _generatorOptions$def = _generatorOptions.defaultModifiers,
        defaultModifiers = _generatorOptions$def === void 0 ? [] : _generatorOptions$def,
        _generatorOptions$def2 = _generatorOptions.defaultOptions,
        defaultOptions = _generatorOptions$def2 === void 0 ? DEFAULT_OPTIONS : _generatorOptions$def2;
    return function createPopper(reference, popper, options) {
      if (options === void 0) {
        options = defaultOptions;
      }

      var state = {
        placement: 'bottom',
        orderedModifiers: [],
        options: Object.assign({}, DEFAULT_OPTIONS, defaultOptions),
        modifiersData: {},
        elements: {
          reference: reference,
          popper: popper
        },
        attributes: {},
        styles: {}
      };
      var effectCleanupFns = [];
      var isDestroyed = false;
      var instance = {
        state: state,
        setOptions: function setOptions(options) {
          cleanupModifierEffects();
          state.options = Object.assign({}, defaultOptions, state.options, options);
          state.scrollParents = {
            reference: isElement(reference) ? listScrollParents(reference) : reference.contextElement ? listScrollParents(reference.contextElement) : [],
            popper: listScrollParents(popper)
          }; // Orders the modifiers based on their dependencies and `phase`
          // properties

          var orderedModifiers = orderModifiers(mergeByName([].concat(defaultModifiers, state.options.modifiers))); // Strip out disabled modifiers

          state.orderedModifiers = orderedModifiers.filter(function (m) {
            return m.enabled;
          }); // Validate the provided modifiers so that the consumer will get warned
          // if one of the modifiers is invalid for any reason

          {
            var modifiers = uniqueBy([].concat(orderedModifiers, state.options.modifiers), function (_ref) {
              var name = _ref.name;
              return name;
            });
            validateModifiers(modifiers);

            if (getBasePlacement(state.options.placement) === auto) {
              var flipModifier = state.orderedModifiers.find(function (_ref2) {
                var name = _ref2.name;
                return name === 'flip';
              });

              if (!flipModifier) {
                console.error(['Popper: "auto" placements require the "flip" modifier be', 'present and enabled to work.'].join(' '));
              }
            }

            var _getComputedStyle = getComputedStyle(popper),
                marginTop = _getComputedStyle.marginTop,
                marginRight = _getComputedStyle.marginRight,
                marginBottom = _getComputedStyle.marginBottom,
                marginLeft = _getComputedStyle.marginLeft; // We no longer take into account `margins` on the popper, and it can
            // cause bugs with positioning, so we'll warn the consumer


            if ([marginTop, marginRight, marginBottom, marginLeft].some(function (margin) {
              return parseFloat(margin);
            })) {
              console.warn(['Popper: CSS "margin" styles cannot be used to apply padding', 'between the popper and its reference element or boundary.', 'To replicate margin, use the `offset` modifier, as well as', 'the `padding` option in the `preventOverflow` and `flip`', 'modifiers.'].join(' '));
            }
          }

          runModifierEffects();
          return instance.update();
        },
        // Sync update – it will always be executed, even if not necessary. This
        // is useful for low frequency updates where sync behavior simplifies the
        // logic.
        // For high frequency updates (e.g. `resize` and `scroll` events), always
        // prefer the async Popper#update method
        forceUpdate: function forceUpdate() {
          if (isDestroyed) {
            return;
          }

          var _state$elements = state.elements,
              reference = _state$elements.reference,
              popper = _state$elements.popper; // Don't proceed if `reference` or `popper` are not valid elements
          // anymore

          if (!areValidElements(reference, popper)) {
            {
              console.error(INVALID_ELEMENT_ERROR);
            }

            return;
          } // Store the reference and popper rects to be read by modifiers


          state.rects = {
            reference: getCompositeRect(reference, getOffsetParent(popper), state.options.strategy === 'fixed'),
            popper: getLayoutRect(popper)
          }; // Modifiers have the ability to reset the current update cycle. The
          // most common use case for this is the `flip` modifier changing the
          // placement, which then needs to re-run all the modifiers, because the
          // logic was previously ran for the previous placement and is therefore
          // stale/incorrect

          state.reset = false;
          state.placement = state.options.placement; // On each update cycle, the `modifiersData` property for each modifier
          // is filled with the initial data specified by the modifier. This means
          // it doesn't persist and is fresh on each update.
          // To ensure persistent data, use `${name}#persistent`

          state.orderedModifiers.forEach(function (modifier) {
            return state.modifiersData[modifier.name] = Object.assign({}, modifier.data);
          });
          var __debug_loops__ = 0;

          for (var index = 0; index < state.orderedModifiers.length; index++) {
            {
              __debug_loops__ += 1;

              if (__debug_loops__ > 100) {
                console.error(INFINITE_LOOP_ERROR);
                break;
              }
            }

            if (state.reset === true) {
              state.reset = false;
              index = -1;
              continue;
            }

            var _state$orderedModifie = state.orderedModifiers[index],
                fn = _state$orderedModifie.fn,
                _state$orderedModifie2 = _state$orderedModifie.options,
                _options = _state$orderedModifie2 === void 0 ? {} : _state$orderedModifie2,
                name = _state$orderedModifie.name;

            if (typeof fn === 'function') {
              state = fn({
                state: state,
                options: _options,
                name: name,
                instance: instance
              }) || state;
            }
          }
        },
        // Async and optimistically optimized update – it will not be executed if
        // not necessary (debounced to run at most once-per-tick)
        update: debounce(function () {
          return new Promise(function (resolve) {
            instance.forceUpdate();
            resolve(state);
          });
        }),
        destroy: function destroy() {
          cleanupModifierEffects();
          isDestroyed = true;
        }
      };

      if (!areValidElements(reference, popper)) {
        {
          console.error(INVALID_ELEMENT_ERROR);
        }

        return instance;
      }

      instance.setOptions(options).then(function (state) {
        if (!isDestroyed && options.onFirstUpdate) {
          options.onFirstUpdate(state);
        }
      }); // Modifiers have the ability to execute arbitrary code before the first
      // update cycle runs. They will be executed in the same order as the update
      // cycle. This is useful when a modifier adds some persistent data that
      // other modifiers need to use, but the modifier is run after the dependent
      // one.

      function runModifierEffects() {
        state.orderedModifiers.forEach(function (_ref3) {
          var name = _ref3.name,
              _ref3$options = _ref3.options,
              options = _ref3$options === void 0 ? {} : _ref3$options,
              effect = _ref3.effect;

          if (typeof effect === 'function') {
            var cleanupFn = effect({
              state: state,
              name: name,
              instance: instance,
              options: options
            });

            var noopFn = function noopFn() {};

            effectCleanupFns.push(cleanupFn || noopFn);
          }
        });
      }

      function cleanupModifierEffects() {
        effectCleanupFns.forEach(function (fn) {
          return fn();
        });
        effectCleanupFns = [];
      }

      return instance;
    };
  }

  var passive = {
    passive: true
  };

  function effect$2(_ref) {
    var state = _ref.state,
        instance = _ref.instance,
        options = _ref.options;
    var _options$scroll = options.scroll,
        scroll = _options$scroll === void 0 ? true : _options$scroll,
        _options$resize = options.resize,
        resize = _options$resize === void 0 ? true : _options$resize;
    var window = getWindow(state.elements.popper);
    var scrollParents = [].concat(state.scrollParents.reference, state.scrollParents.popper);

    if (scroll) {
      scrollParents.forEach(function (scrollParent) {
        scrollParent.addEventListener('scroll', instance.update, passive);
      });
    }

    if (resize) {
      window.addEventListener('resize', instance.update, passive);
    }

    return function () {
      if (scroll) {
        scrollParents.forEach(function (scrollParent) {
          scrollParent.removeEventListener('scroll', instance.update, passive);
        });
      }

      if (resize) {
        window.removeEventListener('resize', instance.update, passive);
      }
    };
  } // eslint-disable-next-line import/no-unused-modules


  var eventListeners = {
    name: 'eventListeners',
    enabled: true,
    phase: 'write',
    fn: function fn() {},
    effect: effect$2,
    data: {}
  };

  function popperOffsets(_ref) {
    var state = _ref.state,
        name = _ref.name;
    // Offsets are the actual position the popper needs to have to be
    // properly positioned near its reference element
    // This is the most basic placement, and will be adjusted by
    // the modifiers in the next step
    state.modifiersData[name] = computeOffsets({
      reference: state.rects.reference,
      element: state.rects.popper,
      strategy: 'absolute',
      placement: state.placement
    });
  } // eslint-disable-next-line import/no-unused-modules


  var popperOffsets$1 = {
    name: 'popperOffsets',
    enabled: true,
    phase: 'read',
    fn: popperOffsets,
    data: {}
  };

  var unsetSides = {
    top: 'auto',
    right: 'auto',
    bottom: 'auto',
    left: 'auto'
  }; // Round the offsets to the nearest suitable subpixel based on the DPR.
  // Zooming can change the DPR, but it seems to report a value that will
  // cleanly divide the values into the appropriate subpixels.

  function roundOffsetsByDPR(_ref) {
    var x = _ref.x,
        y = _ref.y;
    var win = window;
    var dpr = win.devicePixelRatio || 1;
    return {
      x: round(round(x * dpr) / dpr) || 0,
      y: round(round(y * dpr) / dpr) || 0
    };
  }

  function mapToStyles(_ref2) {
    var _Object$assign2;

    var popper = _ref2.popper,
        popperRect = _ref2.popperRect,
        placement = _ref2.placement,
        offsets = _ref2.offsets,
        position = _ref2.position,
        gpuAcceleration = _ref2.gpuAcceleration,
        adaptive = _ref2.adaptive,
        roundOffsets = _ref2.roundOffsets;

    var _ref3 = roundOffsets === true ? roundOffsetsByDPR(offsets) : typeof roundOffsets === 'function' ? roundOffsets(offsets) : offsets,
        _ref3$x = _ref3.x,
        x = _ref3$x === void 0 ? 0 : _ref3$x,
        _ref3$y = _ref3.y,
        y = _ref3$y === void 0 ? 0 : _ref3$y;

    var hasX = offsets.hasOwnProperty('x');
    var hasY = offsets.hasOwnProperty('y');
    var sideX = left;
    var sideY = top;
    var win = window;

    if (adaptive) {
      var offsetParent = getOffsetParent(popper);
      var heightProp = 'clientHeight';
      var widthProp = 'clientWidth';

      if (offsetParent === getWindow(popper)) {
        offsetParent = getDocumentElement(popper);

        if (getComputedStyle(offsetParent).position !== 'static') {
          heightProp = 'scrollHeight';
          widthProp = 'scrollWidth';
        }
      } // $FlowFixMe[incompatible-cast]: force type refinement, we compare offsetParent with window above, but Flow doesn't detect it


      offsetParent = offsetParent;

      if (placement === top) {
        sideY = bottom; // $FlowFixMe[prop-missing]

        y -= offsetParent[heightProp] - popperRect.height;
        y *= gpuAcceleration ? 1 : -1;
      }

      if (placement === left) {
        sideX = right; // $FlowFixMe[prop-missing]

        x -= offsetParent[widthProp] - popperRect.width;
        x *= gpuAcceleration ? 1 : -1;
      }
    }

    var commonStyles = Object.assign({
      position: position
    }, adaptive && unsetSides);

    if (gpuAcceleration) {
      var _Object$assign;

      return Object.assign({}, commonStyles, (_Object$assign = {}, _Object$assign[sideY] = hasY ? '0' : '', _Object$assign[sideX] = hasX ? '0' : '', _Object$assign.transform = (win.devicePixelRatio || 1) < 2 ? "translate(" + x + "px, " + y + "px)" : "translate3d(" + x + "px, " + y + "px, 0)", _Object$assign));
    }

    return Object.assign({}, commonStyles, (_Object$assign2 = {}, _Object$assign2[sideY] = hasY ? y + "px" : '', _Object$assign2[sideX] = hasX ? x + "px" : '', _Object$assign2.transform = '', _Object$assign2));
  }

  function computeStyles(_ref4) {
    var state = _ref4.state,
        options = _ref4.options;
    var _options$gpuAccelerat = options.gpuAcceleration,
        gpuAcceleration = _options$gpuAccelerat === void 0 ? true : _options$gpuAccelerat,
        _options$adaptive = options.adaptive,
        adaptive = _options$adaptive === void 0 ? true : _options$adaptive,
        _options$roundOffsets = options.roundOffsets,
        roundOffsets = _options$roundOffsets === void 0 ? true : _options$roundOffsets;

    {
      var transitionProperty = getComputedStyle(state.elements.popper).transitionProperty || '';

      if (adaptive && ['transform', 'top', 'right', 'bottom', 'left'].some(function (property) {
        return transitionProperty.indexOf(property) >= 0;
      })) {
        console.warn(['Popper: Detected CSS transitions on at least one of the following', 'CSS properties: "transform", "top", "right", "bottom", "left".', '\n\n', 'Disable the "computeStyles" modifier\'s `adaptive` option to allow', 'for smooth transitions, or remove these properties from the CSS', 'transition declaration on the popper element if only transitioning', 'opacity or background-color for example.', '\n\n', 'We recommend using the popper element as a wrapper around an inner', 'element that can have any CSS property transitioned for animations.'].join(' '));
      }
    }

    var commonStyles = {
      placement: getBasePlacement(state.placement),
      popper: state.elements.popper,
      popperRect: state.rects.popper,
      gpuAcceleration: gpuAcceleration
    };

    if (state.modifiersData.popperOffsets != null) {
      state.styles.popper = Object.assign({}, state.styles.popper, mapToStyles(Object.assign({}, commonStyles, {
        offsets: state.modifiersData.popperOffsets,
        position: state.options.strategy,
        adaptive: adaptive,
        roundOffsets: roundOffsets
      })));
    }

    if (state.modifiersData.arrow != null) {
      state.styles.arrow = Object.assign({}, state.styles.arrow, mapToStyles(Object.assign({}, commonStyles, {
        offsets: state.modifiersData.arrow,
        position: 'absolute',
        adaptive: false,
        roundOffsets: roundOffsets
      })));
    }

    state.attributes.popper = Object.assign({}, state.attributes.popper, {
      'data-popper-placement': state.placement
    });
  } // eslint-disable-next-line import/no-unused-modules


  var computeStyles$1 = {
    name: 'computeStyles',
    enabled: true,
    phase: 'beforeWrite',
    fn: computeStyles,
    data: {}
  };

  // and applies them to the HTMLElements such as popper and arrow

  function applyStyles(_ref) {
    var state = _ref.state;
    Object.keys(state.elements).forEach(function (name) {
      var style = state.styles[name] || {};
      var attributes = state.attributes[name] || {};
      var element = state.elements[name]; // arrow is optional + virtual elements

      if (!isHTMLElement(element) || !getNodeName(element)) {
        return;
      } // Flow doesn't support to extend this property, but it's the most
      // effective way to apply styles to an HTMLElement
      // $FlowFixMe[cannot-write]


      Object.assign(element.style, style);
      Object.keys(attributes).forEach(function (name) {
        var value = attributes[name];

        if (value === false) {
          element.removeAttribute(name);
        } else {
          element.setAttribute(name, value === true ? '' : value);
        }
      });
    });
  }

  function effect$1(_ref2) {
    var state = _ref2.state;
    var initialStyles = {
      popper: {
        position: state.options.strategy,
        left: '0',
        top: '0',
        margin: '0'
      },
      arrow: {
        position: 'absolute'
      },
      reference: {}
    };
    Object.assign(state.elements.popper.style, initialStyles.popper);
    state.styles = initialStyles;

    if (state.elements.arrow) {
      Object.assign(state.elements.arrow.style, initialStyles.arrow);
    }

    return function () {
      Object.keys(state.elements).forEach(function (name) {
        var element = state.elements[name];
        var attributes = state.attributes[name] || {};
        var styleProperties = Object.keys(state.styles.hasOwnProperty(name) ? state.styles[name] : initialStyles[name]); // Set all values to an empty string to unset them

        var style = styleProperties.reduce(function (style, property) {
          style[property] = '';
          return style;
        }, {}); // arrow is optional + virtual elements

        if (!isHTMLElement(element) || !getNodeName(element)) {
          return;
        }

        Object.assign(element.style, style);
        Object.keys(attributes).forEach(function (attribute) {
          element.removeAttribute(attribute);
        });
      });
    };
  } // eslint-disable-next-line import/no-unused-modules


  var applyStyles$1 = {
    name: 'applyStyles',
    enabled: true,
    phase: 'write',
    fn: applyStyles,
    effect: effect$1,
    requires: ['computeStyles']
  };

  function distanceAndSkiddingToXY(placement, rects, offset) {
    var basePlacement = getBasePlacement(placement);
    var invertDistance = [left, top].indexOf(basePlacement) >= 0 ? -1 : 1;

    var _ref = typeof offset === 'function' ? offset(Object.assign({}, rects, {
      placement: placement
    })) : offset,
        skidding = _ref[0],
        distance = _ref[1];

    skidding = skidding || 0;
    distance = (distance || 0) * invertDistance;
    return [left, right].indexOf(basePlacement) >= 0 ? {
      x: distance,
      y: skidding
    } : {
      x: skidding,
      y: distance
    };
  }

  function offset(_ref2) {
    var state = _ref2.state,
        options = _ref2.options,
        name = _ref2.name;
    var _options$offset = options.offset,
        offset = _options$offset === void 0 ? [0, 0] : _options$offset;
    var data = placements.reduce(function (acc, placement) {
      acc[placement] = distanceAndSkiddingToXY(placement, state.rects, offset);
      return acc;
    }, {});
    var _data$state$placement = data[state.placement],
        x = _data$state$placement.x,
        y = _data$state$placement.y;

    if (state.modifiersData.popperOffsets != null) {
      state.modifiersData.popperOffsets.x += x;
      state.modifiersData.popperOffsets.y += y;
    }

    state.modifiersData[name] = data;
  } // eslint-disable-next-line import/no-unused-modules


  var offset$1 = {
    name: 'offset',
    enabled: true,
    phase: 'main',
    requires: ['popperOffsets'],
    fn: offset
  };

  var hash$1 = {
    left: 'right',
    right: 'left',
    bottom: 'top',
    top: 'bottom'
  };
  function getOppositePlacement(placement) {
    return placement.replace(/left|right|bottom|top/g, function (matched) {
      return hash$1[matched];
    });
  }

  var hash = {
    start: 'end',
    end: 'start'
  };
  function getOppositeVariationPlacement(placement) {
    return placement.replace(/start|end/g, function (matched) {
      return hash[matched];
    });
  }

  function computeAutoPlacement(state, options) {
    if (options === void 0) {
      options = {};
    }

    var _options = options,
        placement = _options.placement,
        boundary = _options.boundary,
        rootBoundary = _options.rootBoundary,
        padding = _options.padding,
        flipVariations = _options.flipVariations,
        _options$allowedAutoP = _options.allowedAutoPlacements,
        allowedAutoPlacements = _options$allowedAutoP === void 0 ? placements : _options$allowedAutoP;
    var variation = getVariation(placement);
    var placements$1 = variation ? flipVariations ? variationPlacements : variationPlacements.filter(function (placement) {
      return getVariation(placement) === variation;
    }) : basePlacements;
    var allowedPlacements = placements$1.filter(function (placement) {
      return allowedAutoPlacements.indexOf(placement) >= 0;
    });

    if (allowedPlacements.length === 0) {
      allowedPlacements = placements$1;

      {
        console.error(['Popper: The `allowedAutoPlacements` option did not allow any', 'placements. Ensure the `placement` option matches the variation', 'of the allowed placements.', 'For example, "auto" cannot be used to allow "bottom-start".', 'Use "auto-start" instead.'].join(' '));
      }
    } // $FlowFixMe[incompatible-type]: Flow seems to have problems with two array unions...


    var overflows = allowedPlacements.reduce(function (acc, placement) {
      acc[placement] = detectOverflow(state, {
        placement: placement,
        boundary: boundary,
        rootBoundary: rootBoundary,
        padding: padding
      })[getBasePlacement(placement)];
      return acc;
    }, {});
    return Object.keys(overflows).sort(function (a, b) {
      return overflows[a] - overflows[b];
    });
  }

  function getExpandedFallbackPlacements(placement) {
    if (getBasePlacement(placement) === auto) {
      return [];
    }

    var oppositePlacement = getOppositePlacement(placement);
    return [getOppositeVariationPlacement(placement), oppositePlacement, getOppositeVariationPlacement(oppositePlacement)];
  }

  function flip(_ref) {
    var state = _ref.state,
        options = _ref.options,
        name = _ref.name;

    if (state.modifiersData[name]._skip) {
      return;
    }

    var _options$mainAxis = options.mainAxis,
        checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis,
        _options$altAxis = options.altAxis,
        checkAltAxis = _options$altAxis === void 0 ? true : _options$altAxis,
        specifiedFallbackPlacements = options.fallbackPlacements,
        padding = options.padding,
        boundary = options.boundary,
        rootBoundary = options.rootBoundary,
        altBoundary = options.altBoundary,
        _options$flipVariatio = options.flipVariations,
        flipVariations = _options$flipVariatio === void 0 ? true : _options$flipVariatio,
        allowedAutoPlacements = options.allowedAutoPlacements;
    var preferredPlacement = state.options.placement;
    var basePlacement = getBasePlacement(preferredPlacement);
    var isBasePlacement = basePlacement === preferredPlacement;
    var fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipVariations ? [getOppositePlacement(preferredPlacement)] : getExpandedFallbackPlacements(preferredPlacement));
    var placements = [preferredPlacement].concat(fallbackPlacements).reduce(function (acc, placement) {
      return acc.concat(getBasePlacement(placement) === auto ? computeAutoPlacement(state, {
        placement: placement,
        boundary: boundary,
        rootBoundary: rootBoundary,
        padding: padding,
        flipVariations: flipVariations,
        allowedAutoPlacements: allowedAutoPlacements
      }) : placement);
    }, []);
    var referenceRect = state.rects.reference;
    var popperRect = state.rects.popper;
    var checksMap = new Map();
    var makeFallbackChecks = true;
    var firstFittingPlacement = placements[0];

    for (var i = 0; i < placements.length; i++) {
      var placement = placements[i];

      var _basePlacement = getBasePlacement(placement);

      var isStartVariation = getVariation(placement) === start;
      var isVertical = [top, bottom].indexOf(_basePlacement) >= 0;
      var len = isVertical ? 'width' : 'height';
      var overflow = detectOverflow(state, {
        placement: placement,
        boundary: boundary,
        rootBoundary: rootBoundary,
        altBoundary: altBoundary,
        padding: padding
      });
      var mainVariationSide = isVertical ? isStartVariation ? right : left : isStartVariation ? bottom : top;

      if (referenceRect[len] > popperRect[len]) {
        mainVariationSide = getOppositePlacement(mainVariationSide);
      }

      var altVariationSide = getOppositePlacement(mainVariationSide);
      var checks = [];

      if (checkMainAxis) {
        checks.push(overflow[_basePlacement] <= 0);
      }

      if (checkAltAxis) {
        checks.push(overflow[mainVariationSide] <= 0, overflow[altVariationSide] <= 0);
      }

      if (checks.every(function (check) {
        return check;
      })) {
        firstFittingPlacement = placement;
        makeFallbackChecks = false;
        break;
      }

      checksMap.set(placement, checks);
    }

    if (makeFallbackChecks) {
      // `2` may be desired in some cases – research later
      var numberOfChecks = flipVariations ? 3 : 1;

      var _loop = function _loop(_i) {
        var fittingPlacement = placements.find(function (placement) {
          var checks = checksMap.get(placement);

          if (checks) {
            return checks.slice(0, _i).every(function (check) {
              return check;
            });
          }
        });

        if (fittingPlacement) {
          firstFittingPlacement = fittingPlacement;
          return "break";
        }
      };

      for (var _i = numberOfChecks; _i > 0; _i--) {
        var _ret = _loop(_i);

        if (_ret === "break") break;
      }
    }

    if (state.placement !== firstFittingPlacement) {
      state.modifiersData[name]._skip = true;
      state.placement = firstFittingPlacement;
      state.reset = true;
    }
  } // eslint-disable-next-line import/no-unused-modules


  var flip$1 = {
    name: 'flip',
    enabled: true,
    phase: 'main',
    fn: flip,
    requiresIfExists: ['offset'],
    data: {
      _skip: false
    }
  };

  function getAltAxis(axis) {
    return axis === 'x' ? 'y' : 'x';
  }

  function within(min$1, value, max$1) {
    return max(min$1, min(value, max$1));
  }

  function preventOverflow(_ref) {
    var state = _ref.state,
        options = _ref.options,
        name = _ref.name;
    var _options$mainAxis = options.mainAxis,
        checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis,
        _options$altAxis = options.altAxis,
        checkAltAxis = _options$altAxis === void 0 ? false : _options$altAxis,
        boundary = options.boundary,
        rootBoundary = options.rootBoundary,
        altBoundary = options.altBoundary,
        padding = options.padding,
        _options$tether = options.tether,
        tether = _options$tether === void 0 ? true : _options$tether,
        _options$tetherOffset = options.tetherOffset,
        tetherOffset = _options$tetherOffset === void 0 ? 0 : _options$tetherOffset;
    var overflow = detectOverflow(state, {
      boundary: boundary,
      rootBoundary: rootBoundary,
      padding: padding,
      altBoundary: altBoundary
    });
    var basePlacement = getBasePlacement(state.placement);
    var variation = getVariation(state.placement);
    var isBasePlacement = !variation;
    var mainAxis = getMainAxisFromPlacement(basePlacement);
    var altAxis = getAltAxis(mainAxis);
    var popperOffsets = state.modifiersData.popperOffsets;
    var referenceRect = state.rects.reference;
    var popperRect = state.rects.popper;
    var tetherOffsetValue = typeof tetherOffset === 'function' ? tetherOffset(Object.assign({}, state.rects, {
      placement: state.placement
    })) : tetherOffset;
    var data = {
      x: 0,
      y: 0
    };

    if (!popperOffsets) {
      return;
    }

    if (checkMainAxis || checkAltAxis) {
      var mainSide = mainAxis === 'y' ? top : left;
      var altSide = mainAxis === 'y' ? bottom : right;
      var len = mainAxis === 'y' ? 'height' : 'width';
      var offset = popperOffsets[mainAxis];
      var min$1 = popperOffsets[mainAxis] + overflow[mainSide];
      var max$1 = popperOffsets[mainAxis] - overflow[altSide];
      var additive = tether ? -popperRect[len] / 2 : 0;
      var minLen = variation === start ? referenceRect[len] : popperRect[len];
      var maxLen = variation === start ? -popperRect[len] : -referenceRect[len]; // We need to include the arrow in the calculation so the arrow doesn't go
      // outside the reference bounds

      var arrowElement = state.elements.arrow;
      var arrowRect = tether && arrowElement ? getLayoutRect(arrowElement) : {
        width: 0,
        height: 0
      };
      var arrowPaddingObject = state.modifiersData['arrow#persistent'] ? state.modifiersData['arrow#persistent'].padding : getFreshSideObject();
      var arrowPaddingMin = arrowPaddingObject[mainSide];
      var arrowPaddingMax = arrowPaddingObject[altSide]; // If the reference length is smaller than the arrow length, we don't want
      // to include its full size in the calculation. If the reference is small
      // and near the edge of a boundary, the popper can overflow even if the
      // reference is not overflowing as well (e.g. virtual elements with no
      // width or height)

      var arrowLen = within(0, referenceRect[len], arrowRect[len]);
      var minOffset = isBasePlacement ? referenceRect[len] / 2 - additive - arrowLen - arrowPaddingMin - tetherOffsetValue : minLen - arrowLen - arrowPaddingMin - tetherOffsetValue;
      var maxOffset = isBasePlacement ? -referenceRect[len] / 2 + additive + arrowLen + arrowPaddingMax + tetherOffsetValue : maxLen + arrowLen + arrowPaddingMax + tetherOffsetValue;
      var arrowOffsetParent = state.elements.arrow && getOffsetParent(state.elements.arrow);
      var clientOffset = arrowOffsetParent ? mainAxis === 'y' ? arrowOffsetParent.clientTop || 0 : arrowOffsetParent.clientLeft || 0 : 0;
      var offsetModifierValue = state.modifiersData.offset ? state.modifiersData.offset[state.placement][mainAxis] : 0;
      var tetherMin = popperOffsets[mainAxis] + minOffset - offsetModifierValue - clientOffset;
      var tetherMax = popperOffsets[mainAxis] + maxOffset - offsetModifierValue;

      if (checkMainAxis) {
        var preventedOffset = within(tether ? min(min$1, tetherMin) : min$1, offset, tether ? max(max$1, tetherMax) : max$1);
        popperOffsets[mainAxis] = preventedOffset;
        data[mainAxis] = preventedOffset - offset;
      }

      if (checkAltAxis) {
        var _mainSide = mainAxis === 'x' ? top : left;

        var _altSide = mainAxis === 'x' ? bottom : right;

        var _offset = popperOffsets[altAxis];

        var _min = _offset + overflow[_mainSide];

        var _max = _offset - overflow[_altSide];

        var _preventedOffset = within(tether ? min(_min, tetherMin) : _min, _offset, tether ? max(_max, tetherMax) : _max);

        popperOffsets[altAxis] = _preventedOffset;
        data[altAxis] = _preventedOffset - _offset;
      }
    }

    state.modifiersData[name] = data;
  } // eslint-disable-next-line import/no-unused-modules


  var preventOverflow$1 = {
    name: 'preventOverflow',
    enabled: true,
    phase: 'main',
    fn: preventOverflow,
    requiresIfExists: ['offset']
  };

  var toPaddingObject = function toPaddingObject(padding, state) {
    padding = typeof padding === 'function' ? padding(Object.assign({}, state.rects, {
      placement: state.placement
    })) : padding;
    return mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements));
  };

  function arrow(_ref) {
    var _state$modifiersData$;

    var state = _ref.state,
        name = _ref.name,
        options = _ref.options;
    var arrowElement = state.elements.arrow;
    var popperOffsets = state.modifiersData.popperOffsets;
    var basePlacement = getBasePlacement(state.placement);
    var axis = getMainAxisFromPlacement(basePlacement);
    var isVertical = [left, right].indexOf(basePlacement) >= 0;
    var len = isVertical ? 'height' : 'width';

    if (!arrowElement || !popperOffsets) {
      return;
    }

    var paddingObject = toPaddingObject(options.padding, state);
    var arrowRect = getLayoutRect(arrowElement);
    var minProp = axis === 'y' ? top : left;
    var maxProp = axis === 'y' ? bottom : right;
    var endDiff = state.rects.reference[len] + state.rects.reference[axis] - popperOffsets[axis] - state.rects.popper[len];
    var startDiff = popperOffsets[axis] - state.rects.reference[axis];
    var arrowOffsetParent = getOffsetParent(arrowElement);
    var clientSize = arrowOffsetParent ? axis === 'y' ? arrowOffsetParent.clientHeight || 0 : arrowOffsetParent.clientWidth || 0 : 0;
    var centerToReference = endDiff / 2 - startDiff / 2; // Make sure the arrow doesn't overflow the popper if the center point is
    // outside of the popper bounds

    var min = paddingObject[minProp];
    var max = clientSize - arrowRect[len] - paddingObject[maxProp];
    var center = clientSize / 2 - arrowRect[len] / 2 + centerToReference;
    var offset = within(min, center, max); // Prevents breaking syntax highlighting...

    var axisProp = axis;
    state.modifiersData[name] = (_state$modifiersData$ = {}, _state$modifiersData$[axisProp] = offset, _state$modifiersData$.centerOffset = offset - center, _state$modifiersData$);
  }

  function effect(_ref2) {
    var state = _ref2.state,
        options = _ref2.options;
    var _options$element = options.element,
        arrowElement = _options$element === void 0 ? '[data-popper-arrow]' : _options$element;

    if (arrowElement == null) {
      return;
    } // CSS selector


    if (typeof arrowElement === 'string') {
      arrowElement = state.elements.popper.querySelector(arrowElement);

      if (!arrowElement) {
        return;
      }
    }

    {
      if (!isHTMLElement(arrowElement)) {
        console.error(['Popper: "arrow" element must be an HTMLElement (not an SVGElement).', 'To use an SVG arrow, wrap it in an HTMLElement that will be used as', 'the arrow.'].join(' '));
      }
    }

    if (!contains(state.elements.popper, arrowElement)) {
      {
        console.error(['Popper: "arrow" modifier\'s `element` must be a child of the popper', 'element.'].join(' '));
      }

      return;
    }

    state.elements.arrow = arrowElement;
  } // eslint-disable-next-line import/no-unused-modules


  var arrow$1 = {
    name: 'arrow',
    enabled: true,
    phase: 'main',
    fn: arrow,
    effect: effect,
    requires: ['popperOffsets'],
    requiresIfExists: ['preventOverflow']
  };

  function getSideOffsets(overflow, rect, preventedOffsets) {
    if (preventedOffsets === void 0) {
      preventedOffsets = {
        x: 0,
        y: 0
      };
    }

    return {
      top: overflow.top - rect.height - preventedOffsets.y,
      right: overflow.right - rect.width + preventedOffsets.x,
      bottom: overflow.bottom - rect.height + preventedOffsets.y,
      left: overflow.left - rect.width - preventedOffsets.x
    };
  }

  function isAnySideFullyClipped(overflow) {
    return [top, right, bottom, left].some(function (side) {
      return overflow[side] >= 0;
    });
  }

  function hide(_ref) {
    var state = _ref.state,
        name = _ref.name;
    var referenceRect = state.rects.reference;
    var popperRect = state.rects.popper;
    var preventedOffsets = state.modifiersData.preventOverflow;
    var referenceOverflow = detectOverflow(state, {
      elementContext: 'reference'
    });
    var popperAltOverflow = detectOverflow(state, {
      altBoundary: true
    });
    var referenceClippingOffsets = getSideOffsets(referenceOverflow, referenceRect);
    var popperEscapeOffsets = getSideOffsets(popperAltOverflow, popperRect, preventedOffsets);
    var isReferenceHidden = isAnySideFullyClipped(referenceClippingOffsets);
    var hasPopperEscaped = isAnySideFullyClipped(popperEscapeOffsets);
    state.modifiersData[name] = {
      referenceClippingOffsets: referenceClippingOffsets,
      popperEscapeOffsets: popperEscapeOffsets,
      isReferenceHidden: isReferenceHidden,
      hasPopperEscaped: hasPopperEscaped
    };
    state.attributes.popper = Object.assign({}, state.attributes.popper, {
      'data-popper-reference-hidden': isReferenceHidden,
      'data-popper-escaped': hasPopperEscaped
    });
  } // eslint-disable-next-line import/no-unused-modules


  var hide$1 = {
    name: 'hide',
    enabled: true,
    phase: 'main',
    requiresIfExists: ['preventOverflow'],
    fn: hide
  };

  var defaultModifiers$1 = [eventListeners, popperOffsets$1, computeStyles$1, applyStyles$1];
  var createPopper$1 = /*#__PURE__*/popperGenerator({
    defaultModifiers: defaultModifiers$1
  }); // eslint-disable-next-line import/no-unused-modules

  var defaultModifiers = [eventListeners, popperOffsets$1, computeStyles$1, applyStyles$1, offset$1, flip$1, preventOverflow$1, arrow$1, hide$1];
  var createPopper = /*#__PURE__*/popperGenerator({
    defaultModifiers: defaultModifiers
  }); // eslint-disable-next-line import/no-unused-modules

  exports.applyStyles = applyStyles$1;
  exports.arrow = arrow$1;
  exports.computeStyles = computeStyles$1;
  exports.createPopper = createPopper;
  exports.createPopperLite = createPopper$1;
  exports.defaultModifiers = defaultModifiers;
  exports.detectOverflow = detectOverflow;
  exports.eventListeners = eventListeners;
  exports.flip = flip$1;
  exports.hide = hide$1;
  exports.offset = offset$1;
  exports.popperGenerator = popperGenerator;
  exports.popperOffsets = popperOffsets$1;
  exports.preventOverflow = preventOverflow$1;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=/popper.js.map
;
/* ========================================================================
 * Bootstrap: modal.js v3.4.1
 * https://getbootstrap.com/docs/3.4/javascript/#modals
 * ========================================================================
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */



+function ($) {
  'use strict';

  // MODAL CLASS DEFINITION
  // ======================

  var Modal = function (element, options) {
    this.options = options
    this.$body = $(document.body)
    this.$element = $(element)
    this.$dialog = this.$element.find('.modal-dialog')
    this.$backdrop = null
    this.isShown = null
    this.originalBodyPad = null
    this.scrollbarWidth = 0
    this.ignoreBackdropClick = false
    this.fixedContent = '.navbar-fixed-top, .navbar-fixed-bottom'

    if (this.options.remote) {
      this.$element
        .find('.modal-content')
        .load(this.options.remote, $.proxy(function () {
          this.$element.trigger('loaded.bs.modal')
        }, this))
    }
  }

  Modal.VERSION = '3.4.1'

  Modal.TRANSITION_DURATION = 300
  Modal.BACKDROP_TRANSITION_DURATION = 150

  Modal.DEFAULTS = {
    backdrop: true,
    keyboard: true,
    show: true
  }

  Modal.prototype.toggle = function (_relatedTarget) {
    return this.isShown ? this.hide() : this.show(_relatedTarget)
  }

  Modal.prototype.show = function (_relatedTarget) {
    var that = this
    var e = $.Event('show.bs.modal', { relatedTarget: _relatedTarget })

    this.$element.trigger(e)

    if (this.isShown || e.isDefaultPrevented()) return

    this.isShown = true

    this.checkScrollbar()
    this.setScrollbar()
    this.$body.addClass('modal-open')

    this.escape()
    this.resize()

    this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this))

    this.$dialog.on('mousedown.dismiss.bs.modal', function () {
      that.$element.one('mouseup.dismiss.bs.modal', function (e) {
        if ($(e.target).is(that.$element)) that.ignoreBackdropClick = true
      })
    })

    this.backdrop(function () {
      var transition = $.support.transition && that.$element.hasClass('fade')

      if (!that.$element.parent().length) {
        that.$element.appendTo(that.$body) // don't move modals dom position
      }

      that.$element
        .show()
        .scrollTop(0)

      that.adjustDialog()

      if (transition) {
        that.$element[0].offsetWidth // force reflow
      }

      that.$element.addClass('in')

      that.enforceFocus()

      var e = $.Event('shown.bs.modal', { relatedTarget: _relatedTarget })

      transition ?
        that.$dialog // wait for modal to slide in
          .one('bsTransitionEnd', function () {
            that.$element.trigger('focus').trigger(e)
          })
          .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
        that.$element.trigger('focus').trigger(e)
    })
  }

  Modal.prototype.hide = function (e) {
    if (e) e.preventDefault()

    e = $.Event('hide.bs.modal')

    this.$element.trigger(e)

    if (!this.isShown || e.isDefaultPrevented()) return

    this.isShown = false

    this.escape()
    this.resize()

    $(document).off('focusin.bs.modal')

    this.$element
      .removeClass('in')
      .off('click.dismiss.bs.modal')
      .off('mouseup.dismiss.bs.modal')

    this.$dialog.off('mousedown.dismiss.bs.modal')

    $.support.transition && this.$element.hasClass('fade') ?
      this.$element
        .one('bsTransitionEnd', $.proxy(this.hideModal, this))
        .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
      this.hideModal()
  }

  Modal.prototype.enforceFocus = function () {
    $(document)
      .off('focusin.bs.modal') // guard against infinite focus loop
      .on('focusin.bs.modal', $.proxy(function (e) {
        if (document !== e.target &&
          this.$element[0] !== e.target &&
          !this.$element.has(e.target).length) {
          this.$element.trigger('focus')
        }
      }, this))
  }

  Modal.prototype.escape = function () {
    if (this.isShown && this.options.keyboard) {
      this.$element.on('keydown.dismiss.bs.modal', $.proxy(function (e) {
        e.which == 27 && this.hide()
      }, this))
    } else if (!this.isShown) {
      this.$element.off('keydown.dismiss.bs.modal')
    }
  }

  Modal.prototype.resize = function () {
    if (this.isShown) {
      $(window).on('resize.bs.modal', $.proxy(this.handleUpdate, this))
    } else {
      $(window).off('resize.bs.modal')
    }
  }

  Modal.prototype.hideModal = function () {
    var that = this
    this.$element.hide()
    this.backdrop(function () {
      that.$body.removeClass('modal-open')
      that.resetAdjustments()
      that.resetScrollbar()
      that.$element.trigger('hidden.bs.modal')
    })
  }

  Modal.prototype.removeBackdrop = function () {
    this.$backdrop && this.$backdrop.remove()
    this.$backdrop = null
  }

  Modal.prototype.backdrop = function (callback) {
    var that = this
    var animate = this.$element.hasClass('fade') ? 'fade' : ''

    if (this.isShown && this.options.backdrop) {
      var doAnimate = $.support.transition && animate

      this.$backdrop = $(document.createElement('div'))
        .addClass('modal-backdrop ' + animate)
        .appendTo(this.$body)

      this.$element.on('click.dismiss.bs.modal', $.proxy(function (e) {
        if (this.ignoreBackdropClick) {
          this.ignoreBackdropClick = false
          return
        }
        if (e.target !== e.currentTarget) return
        this.options.backdrop == 'static'
          ? this.$element[0].focus()
          : this.hide()
      }, this))

      if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

      this.$backdrop.addClass('in')

      if (!callback) return

      doAnimate ?
        this.$backdrop
          .one('bsTransitionEnd', callback)
          .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
        callback()

    } else if (!this.isShown && this.$backdrop) {
      this.$backdrop.removeClass('in')

      var callbackRemove = function () {
        that.removeBackdrop()
        callback && callback()
      }
      $.support.transition && this.$element.hasClass('fade') ?
        this.$backdrop
          .one('bsTransitionEnd', callbackRemove)
          .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
        callbackRemove()

    } else if (callback) {
      callback()
    }
  }

  // these following methods are used to handle overflowing modals

  Modal.prototype.handleUpdate = function () {
    this.adjustDialog()
  }

  Modal.prototype.adjustDialog = function () {
    var modalIsOverflowing = this.$element[0].scrollHeight > document.documentElement.clientHeight

    this.$element.css({
      paddingLeft: !this.bodyIsOverflowing && modalIsOverflowing ? this.scrollbarWidth : '',
      paddingRight: this.bodyIsOverflowing && !modalIsOverflowing ? this.scrollbarWidth : ''
    })
  }

  Modal.prototype.resetAdjustments = function () {
    this.$element.css({
      paddingLeft: '',
      paddingRight: ''
    })
  }

  Modal.prototype.checkScrollbar = function () {
    var fullWindowWidth = window.innerWidth
    if (!fullWindowWidth) { // workaround for missing window.innerWidth in IE8
      var documentElementRect = document.documentElement.getBoundingClientRect()
      fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left)
    }
    this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth
    this.scrollbarWidth = this.measureScrollbar()
  }

  Modal.prototype.setScrollbar = function () {
    var bodyPad = parseInt((this.$body.css('padding-right') || 0), 10)
    this.originalBodyPad = document.body.style.paddingRight || ''
    var scrollbarWidth = this.scrollbarWidth
    if (this.bodyIsOverflowing) {
      this.$body.css('padding-right', bodyPad + scrollbarWidth)
      $(this.fixedContent).each(function (index, element) {
        var actualPadding = element.style.paddingRight
        var calculatedPadding = $(element).css('padding-right')
        $(element)
          .data('padding-right', actualPadding)
          .css('padding-right', parseFloat(calculatedPadding) + scrollbarWidth + 'px')
      })
    }
  }

  Modal.prototype.resetScrollbar = function () {
    this.$body.css('padding-right', this.originalBodyPad)
    $(this.fixedContent).each(function (index, element) {
      var padding = $(element).data('padding-right')
      $(element).removeData('padding-right')
      element.style.paddingRight = padding ? padding : ''
    })
  }

  Modal.prototype.measureScrollbar = function () { // thx walsh
    var scrollDiv = document.createElement('div')
    scrollDiv.className = 'modal-scrollbar-measure'
    this.$body.append(scrollDiv)
    var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
    this.$body[0].removeChild(scrollDiv)
    return scrollbarWidth
  }


  // MODAL PLUGIN DEFINITION
  // =======================

  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this = $(this)
      var data = $this.data('bs.modal')
      var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option)

      if (!data) $this.data('bs.modal', (data = new Modal(this, options)))
      if (typeof option == 'string') data[option](_relatedTarget)
      else if (options.show) data.show(_relatedTarget)
    })
  }

  var old = $.fn.modal

  $.fn.modal = Plugin
  $.fn.modal.Constructor = Modal


  // MODAL NO CONFLICT
  // =================

  $.fn.modal.noConflict = function () {
    $.fn.modal = old
    return this
  }


  // MODAL DATA-API
  // ==============

  $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
    var $this = $(this)
    var href = $this.attr('href')
    var target = $this.attr('data-target') ||
      (href && href.replace(/.*(?=#[^\s]+$)/, '')) // strip for ie7

    var $target = $(document).find(target)
    var option = $target.data('bs.modal') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href }, $target.data(), $this.data())

    if ($this.is('a')) e.preventDefault()

    $target.one('show.bs.modal', function (showEvent) {
      if (showEvent.isDefaultPrevented()) return // only register focus restorer if modal will actually get shown
      $target.one('hidden.bs.modal', function () {
        $this.is(':visible') && $this.trigger('focus')
      })
    })
    Plugin.call($target, option, this)
  })

}(jQuery);
// TODO: This code should be moved to lib, it was heavily modified by us over the years, and mostly written by us
// except for the little snippet from StackOverflow
//
// http://stackoverflow.com/questions/263743/how-to-get-caret-position-in-textarea
var clone = null;

$.fn.caret = function(elem) {
  var getCaret = function(el) {
    var r, rc, re;
    if (el.selectionStart) {
      return el.selectionStart;
    } else if (document.selection) {
      el.focus();
      r = document.selection.createRange();
      if (!r) return 0;
      re = el.createTextRange();
      rc = re.duplicate();
      re.moveToBookmark(r.getBookmark());
      rc.setEndPoint("EndToStart", re);
      return rc.text.length;
    }
    return 0;
  };

  return getCaret(elem || this[0]);
};

/**
  This is a jQuery plugin to retrieve the caret position in a textarea

  @module $.fn.caretPosition
**/
$.fn.caretPosition = function(options) {
  var after,
    before,
    getStyles,
    guard,
    html,
    important,
    insertSpaceAfterBefore,
    letter,
    makeCursor,
    p,
    pPos,
    pos,
    span,
    styles,
    textarea,
    val;
  if (clone) {
    clone.remove();
  }
  span = $("#pos span");
  textarea = $(this);

  getStyles = function(el) {
    if (el.currentStyle) {
      return el.currentStyle;
    } else {
      return document.defaultView.getComputedStyle(el, "");
    }
  };

  important = function(prop) {
    return styles.getPropertyValue(prop);
  };

  styles = getStyles(textarea[0]);
  clone = $("<div><p></p></div>").appendTo("body");
  p = clone.find("p");

  var isRTL = $("html").hasClass("rtl");
  clone.css({
    border: "1px solid black",
    padding: important("padding"),
    resize: important("resize"),
    "max-height": textarea.height() + "px",
    "overflow-y": "auto",
    "word-wrap": "break-word",
    position: "absolute",
    left: isRTL ? "auto" : "-7000px",
    right: isRTL ? "-7000px" : "auto"
  });

  p.css({
    margin: 0,
    padding: 0,
    "word-wrap": "break-word",
    "letter-spacing": important("letter-spacing"),
    "font-family": important("font-family"),
    "font-size": important("font-size"),
    "line-height": important("line-height")
  });

  clone.width(textarea.width());
  clone.height(textarea.height());

  pos =
    options && (options.pos || options.pos === 0)
      ? options.pos
      : $.caret(textarea[0]);

  val = textarea.val().replace("\r", "");
  if (options && options.key) {
    val = val.substring(0, pos) + options.key + val.substring(pos);
  }
  before = pos - 1;
  after = pos;
  insertSpaceAfterBefore = false;

  // if before and after are \n insert a space
  if (val[before] === "\n" && val[after] === "\n") {
    insertSpaceAfterBefore = true;
  }

  guard = function(v) {
    var buf;
    buf = v.replace(/</g, "&lt;");
    buf = buf.replace(/>/g, "&gt;");
    buf = buf.replace(/[ ]/g, "&#x200b;&nbsp;&#x200b;");
    return buf.replace(/\n/g, "<br />");
  };

  makeCursor = function(pos, klass, color) {
    var l;
    l = val.substring(pos, pos + 1);
    if (l === "\n") return "<br>";
    return (
      "<span class='" +
      klass +
      "' style='background-color:" +
      color +
      "; margin:0; padding: 0'>" +
      guard(l) +
      "</span>"
    );
  };

  html = "";

  if (before >= 0) {
    html +=
      guard(val.substring(0, pos - 1)) +
      makeCursor(before, "before", "#d0ffff");
    if (insertSpaceAfterBefore) {
      html += makeCursor(0, "post-before", "#d0ffff");
    }
  }

  if (after >= 0) {
    html += makeCursor(after, "after", "#ffd0ff");
    if (after - 1 < val.length) {
      html += guard(val.substring(after + 1));
    }
  }

  p.html(html);
  clone.scrollTop(textarea.scrollTop());
  letter = p.find("span:first");
  pos = letter.offset();
  if (letter.hasClass("before")) {
    pos.left = pos.left + letter.width();
  }

  pPos = p.offset();
  var position = {
    left: pos.left - pPos.left,
    top: pos.top - pPos.top - clone.scrollTop()
  };

  clone.remove();
  return position;
};
/*!
 * jQuery Color Animations v3.0.0-alpha.1
 * https://github.com/jquery/jquery-color
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 *
 * Date: Wed Jan 31 14:31:10 2018 +0100
 */


( function( root, factory ) {
	if ( typeof define === "function" && define.amd ) {

		// AMD. Register as an anonymous module.
		define( [ "jquery" ], factory );
	} else if ( typeof exports === "object" ) {
		module.exports = factory( require( "jquery" ) );
	} else {
		factory( root.jQuery );
	}
} )( this, function( jQuery, undefined ) {

	var stepHooks = "backgroundColor borderBottomColor borderLeftColor borderRightColor " +
		"borderTopColor color columnRuleColor outlineColor textDecorationColor textEmphasisColor",

	class2type = {},
	toString = class2type.toString,

	// plusequals test for += 100 -= 100
	rplusequals = /^([\-+])=\s*(\d+\.?\d*)/,

	// a set of RE's that can match strings and generate color tuples.
	stringParsers = [ {
			re: /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d?(?:\.\d+)?)\s*)?\)/,
			parse: function( execResult ) {
				return [
					execResult[ 1 ],
					execResult[ 2 ],
					execResult[ 3 ],
					execResult[ 4 ]
				];
			}
		}, {
			re: /rgba?\(\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d?(?:\.\d+)?)\s*)?\)/,
			parse: function( execResult ) {
				return [
					execResult[ 1 ] * 2.55,
					execResult[ 2 ] * 2.55,
					execResult[ 3 ] * 2.55,
					execResult[ 4 ]
				];
			}
		}, {

			// this regex ignores A-F because it's compared against an already lowercased string
			re: /#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/,
			parse: function( execResult ) {
				return [
					parseInt( execResult[ 1 ], 16 ),
					parseInt( execResult[ 2 ], 16 ),
					parseInt( execResult[ 3 ], 16 )
				];
			}
		}, {

			// this regex ignores A-F because it's compared against an already lowercased string
			re: /#([a-f0-9])([a-f0-9])([a-f0-9])/,
			parse: function( execResult ) {
				return [
					parseInt( execResult[ 1 ] + execResult[ 1 ], 16 ),
					parseInt( execResult[ 2 ] + execResult[ 2 ], 16 ),
					parseInt( execResult[ 3 ] + execResult[ 3 ], 16 )
				];
			}
		}, {
			re: /hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d?(?:\.\d+)?)\s*)?\)/,
			space: "hsla",
			parse: function( execResult ) {
				return [
					execResult[ 1 ],
					execResult[ 2 ] / 100,
					execResult[ 3 ] / 100,
					execResult[ 4 ]
				];
			}
		} ],

	// jQuery.Color( )
	color = jQuery.Color = function( color, green, blue, alpha ) {
		return new jQuery.Color.fn.parse( color, green, blue, alpha );
	},
	spaces = {
		rgba: {
			props: {
				red: {
					idx: 0,
					type: "byte"
				},
				green: {
					idx: 1,
					type: "byte"
				},
				blue: {
					idx: 2,
					type: "byte"
				}
			}
		},

		hsla: {
			props: {
				hue: {
					idx: 0,
					type: "degrees"
				},
				saturation: {
					idx: 1,
					type: "percent"
				},
				lightness: {
					idx: 2,
					type: "percent"
				}
			}
		}
	},
	propTypes = {
		"byte": {
			floor: true,
			max: 255
		},
		"percent": {
			max: 1
		},
		"degrees": {
			mod: 360,
			floor: true
		}
	},

	// colors = jQuery.Color.names
	colors,

	// local aliases of functions called often
	each = jQuery.each;

// define cache name and alpha properties
// for rgba and hsla spaces
each( spaces, function( spaceName, space ) {
	space.cache = "_" + spaceName;
	space.props.alpha = {
		idx: 3,
		type: "percent",
		def: 1
	};
} );

// Populate the class2type map
jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
	function( i, name ) {
		class2type[ "[object " + name + "]" ] = name.toLowerCase();
	} );

function getType( obj ) {
	if ( obj == null ) {
		return obj + "";
	}

	return typeof obj === "object" ?
		class2type[ toString.call( obj ) ] || "object" :
		typeof obj;
}

function clamp( value, prop, allowEmpty ) {
	var type = propTypes[ prop.type ] || {};

	if ( value == null ) {
		return ( allowEmpty || !prop.def ) ? null : prop.def;
	}

	// ~~ is an short way of doing floor for positive numbers
	value = type.floor ? ~~value : parseFloat( value );

	if ( type.mod ) {

		// we add mod before modding to make sure that negatives values
		// get converted properly: -10 -> 350
		return ( value + type.mod ) % type.mod;
	}

	// for now all property types without mod have min and max
	return Math.min( type.max, Math.max( 0, value ) );
}

function stringParse( string ) {
	var inst = color(),
		rgba = inst._rgba = [];

	string = string.toLowerCase();

	each( stringParsers, function( i, parser ) {
		var parsed,
			match = parser.re.exec( string ),
			values = match && parser.parse( match ),
			spaceName = parser.space || "rgba";

		if ( values ) {
			parsed = inst[ spaceName ]( values );

			// if this was an rgba parse the assignment might happen twice
			// oh well....
			inst[ spaces[ spaceName ].cache ] = parsed[ spaces[ spaceName ].cache ];
			rgba = inst._rgba = parsed._rgba;

			// exit each( stringParsers ) here because we matched
			return false;
		}
	} );

	// Found a stringParser that handled it
	if ( rgba.length ) {

		// if this came from a parsed string, force "transparent" when alpha is 0
		// chrome, (and maybe others) return "transparent" as rgba(0,0,0,0)
		if ( rgba.join() === "0,0,0,0" ) {
			jQuery.extend( rgba, colors.transparent );
		}
		return inst;
	}

	// named colors
	return colors[ string ];
}

color.fn = jQuery.extend( color.prototype, {
	parse: function( red, green, blue, alpha ) {
		if ( red === undefined ) {
			this._rgba = [ null, null, null, null ];
			return this;
		}
		if ( red.jquery || red.nodeType ) {
			red = jQuery( red ).css( green );
			green = undefined;
		}

		var inst = this,
			type = getType( red ),
			rgba = this._rgba = [];

		// more than 1 argument specified - assume ( red, green, blue, alpha )
		if ( green !== undefined ) {
			red = [ red, green, blue, alpha ];
			type = "array";
		}

		if ( type === "string" ) {
			return this.parse( stringParse( red ) || colors._default );
		}

		if ( type === "array" ) {
			each( spaces.rgba.props, function( key, prop ) {
				rgba[ prop.idx ] = clamp( red[ prop.idx ], prop );
			} );
			return this;
		}

		if ( type === "object" ) {
			if ( red instanceof color ) {
				each( spaces, function( spaceName, space ) {
					if ( red[ space.cache ] ) {
						inst[ space.cache ] = red[ space.cache ].slice();
					}
				} );
			} else {
				each( spaces, function( spaceName, space ) {
					var cache = space.cache;
					each( space.props, function( key, prop ) {

						// if the cache doesn't exist, and we know how to convert
						if ( !inst[ cache ] && space.to ) {

							// if the value was null, we don't need to copy it
							// if the key was alpha, we don't need to copy it either
							if ( key === "alpha" || red[ key ] == null ) {
								return;
							}
							inst[ cache ] = space.to( inst._rgba );
						}

						// this is the only case where we allow nulls for ALL properties.
						// call clamp with alwaysAllowEmpty
						inst[ cache ][ prop.idx ] = clamp( red[ key ], prop, true );
					} );

					// everything defined but alpha?
					if ( inst[ cache ] && jQuery.inArray( null, inst[ cache ].slice( 0, 3 ) ) < 0 ) {

						// use the default of 1
						if ( inst[ cache ][ 3 ] == null ) {
							inst[ cache ][ 3 ] = 1;
						}

						if ( space.from ) {
							inst._rgba = space.from( inst[ cache ] );
						}
					}
				} );
			}
			return this;
		}
	},
	is: function( compare ) {
		var is = color( compare ),
			same = true,
			inst = this;

		each( spaces, function( _, space ) {
			var localCache,
				isCache = is[ space.cache ];
			if ( isCache ) {
				localCache = inst[ space.cache ] || space.to && space.to( inst._rgba ) || [];
				each( space.props, function( _, prop ) {
					if ( isCache[ prop.idx ] != null ) {
						same = ( isCache[ prop.idx ] === localCache[ prop.idx ] );
						return same;
					}
				} );
			}
			return same;
		} );
		return same;
	},
	_space: function() {
		var used = [],
			inst = this;
		each( spaces, function( spaceName, space ) {
			if ( inst[ space.cache ] ) {
				used.push( spaceName );
			}
		} );
		return used.pop();
	},
	transition: function( other, distance ) {
		var end = color( other ),
			spaceName = end._space(),
			space = spaces[ spaceName ],
			startColor = this.alpha() === 0 ? color( "transparent" ) : this,
			start = startColor[ space.cache ] || space.to( startColor._rgba ),
			result = start.slice();

		end = end[ space.cache ];
		each( space.props, function( key, prop ) {
			var index = prop.idx,
				startValue = start[ index ],
				endValue = end[ index ],
				type = propTypes[ prop.type ] || {};

			// if null, don't override start value
			if ( endValue === null ) {
				return;
			}

			// if null - use end
			if ( startValue === null ) {
				result[ index ] = endValue;
			} else {
				if ( type.mod ) {
					if ( endValue - startValue > type.mod / 2 ) {
						startValue += type.mod;
					} else if ( startValue - endValue > type.mod / 2 ) {
						startValue -= type.mod;
					}
				}
				result[ index ] = clamp( ( endValue - startValue ) * distance + startValue, prop );
			}
		} );
		return this[ spaceName ]( result );
	},
	blend: function( opaque ) {

		// if we are already opaque - return ourself
		if ( this._rgba[ 3 ] === 1 ) {
			return this;
		}

		var rgb = this._rgba.slice(),
			a = rgb.pop(),
			blend = color( opaque )._rgba;

		return color( jQuery.map( rgb, function( v, i ) {
			return ( 1 - a ) * blend[ i ] + a * v;
		} ) );
	},
	toRgbaString: function() {
		var prefix = "rgba(",
			rgba = jQuery.map( this._rgba, function( v, i ) {
                if ( v != null ) {
                    return v;
                }
				return i > 2 ? 1 : 0;
			} );

		if ( rgba[ 3 ] === 1 ) {
			rgba.pop();
			prefix = "rgb(";
		}

		return prefix + rgba.join() + ")";
	},
	toHslaString: function() {
		var prefix = "hsla(",
			hsla = jQuery.map( this.hsla(), function( v, i ) {
				if ( v == null ) {
					v = i > 2 ? 1 : 0;
				}

				// catch 1 and 2
				if ( i && i < 3 ) {
					v = Math.round( v * 100 ) + "%";
				}
				return v;
			} );

		if ( hsla[ 3 ] === 1 ) {
			hsla.pop();
			prefix = "hsl(";
		}
		return prefix + hsla.join() + ")";
	},
	toHexString: function( includeAlpha ) {
		var rgba = this._rgba.slice(),
			alpha = rgba.pop();

		if ( includeAlpha ) {
			rgba.push( ~~( alpha * 255 ) );
		}

		return "#" + jQuery.map( rgba, function( v ) {

			// default to 0 when nulls exist
			return ( "0" + ( v || 0 ).toString( 16 ) ).substr( -2 );
		} ).join( "" );
	},
	toString: function() {
		return this._rgba[ 3 ] === 0 ? "transparent" : this.toRgbaString();
	}
} );
color.fn.parse.prototype = color.fn;

// hsla conversions adapted from:
// https://code.google.com/p/maashaack/source/browse/packages/graphics/trunk/src/graphics/colors/HUE2RGB.as?r=5021

function hue2rgb( p, q, h ) {
	h = ( h + 1 ) % 1;
	if ( h * 6 < 1 ) {
		return p + ( q - p ) * h * 6;
	}
	if ( h * 2 < 1 ) {
		return q;
	}
	if ( h * 3 < 2 ) {
		return p + ( q - p ) * ( ( 2 / 3 ) - h ) * 6;
	}
	return p;
}

spaces.hsla.to = function( rgba ) {
	if ( rgba[ 0 ] == null || rgba[ 1 ] == null || rgba[ 2 ] == null ) {
		return [ null, null, null, rgba[ 3 ] ];
	}
	var r = rgba[ 0 ] / 255,
		g = rgba[ 1 ] / 255,
		b = rgba[ 2 ] / 255,
		a = rgba[ 3 ],
		max = Math.max( r, g, b ),
		min = Math.min( r, g, b ),
		diff = max - min,
		add = max + min,
		l = add * 0.5,
		h, s;

	if ( min === max ) {
		h = 0;
	} else if ( r === max ) {
		h = ( 60 * ( g - b ) / diff ) + 360;
	} else if ( g === max ) {
		h = ( 60 * ( b - r ) / diff ) + 120;
	} else {
		h = ( 60 * ( r - g ) / diff ) + 240;
	}

	// chroma (diff) == 0 means greyscale which, by definition, saturation = 0%
	// otherwise, saturation is based on the ratio of chroma (diff) to lightness (add)
	if ( diff === 0 ) {
		s = 0;
	} else if ( l <= 0.5 ) {
		s = diff / add;
	} else {
		s = diff / ( 2 - add );
	}
	return [ Math.round( h ) % 360, s, l, a == null ? 1 : a ];
};

spaces.hsla.from = function( hsla ) {
	if ( hsla[ 0 ] == null || hsla[ 1 ] == null || hsla[ 2 ] == null ) {
		return [ null, null, null, hsla[ 3 ] ];
	}
	var h = hsla[ 0 ] / 360,
		s = hsla[ 1 ],
		l = hsla[ 2 ],
		a = hsla[ 3 ],
		q = l <= 0.5 ? l * ( 1 + s ) : l + s - l * s,
		p = 2 * l - q;

	return [
		Math.round( hue2rgb( p, q, h + ( 1 / 3 ) ) * 255 ),
		Math.round( hue2rgb( p, q, h ) * 255 ),
		Math.round( hue2rgb( p, q, h - ( 1 / 3 ) ) * 255 ),
		a
	];
};


each( spaces, function( spaceName, space ) {
	var props = space.props,
		cache = space.cache,
		to = space.to,
		from = space.from;

	// makes rgba() and hsla()
	color.fn[ spaceName ] = function( value ) {

		// generate a cache for this space if it doesn't exist
		if ( to && !this[ cache ] ) {
			this[ cache ] = to( this._rgba );
		}
		if ( value === undefined ) {
			return this[ cache ].slice();
		}

		var ret,
			type = getType( value ),
			arr = ( type === "array" || type === "object" ) ? value : arguments,
			local = this[ cache ].slice();

		each( props, function( key, prop ) {
			var val = arr[ type === "object" ? key : prop.idx ];
			if ( val == null ) {
				val = local[ prop.idx ];
			}
			local[ prop.idx ] = clamp( val, prop );
		} );

		if ( from ) {
			ret = color( from( local ) );
			ret[ cache ] = local;
			return ret;
		} else {
			return color( local );
		}
	};

	// makes red() green() blue() alpha() hue() saturation() lightness()
	each( props, function( key, prop ) {

		// alpha is included in more than one space
		if ( color.fn[ key ] ) {
			return;
		}
		color.fn[ key ] = function( value ) {
			var local, cur, match, fn,
				vtype = getType( value );

			if ( key === "alpha" ) {
				fn = this._hsla ? "hsla" : "rgba";
			} else {
				fn = spaceName;
			}
			local = this[ fn ]();
			cur = local[ prop.idx ];

			if ( vtype === "undefined" ) {
				return cur;
			}

			if ( vtype === "function" ) {
				value = value.call( this, cur );
				vtype = getType( value );
			}
			if ( value == null && prop.empty ) {
				return this;
			}
			if ( vtype === "string" ) {
				match = rplusequals.exec( value );
				if ( match ) {
					value = cur + parseFloat( match[ 2 ] ) * ( match[ 1 ] === "+" ? 1 : -1 );
				}
			}
			local[ prop.idx ] = value;
			return this[ fn ]( local );
		};
	} );
} );

// add cssHook and .fx.step function for each named hook.
// accept a space separated string of properties
color.hook = function( hook ) {
	var hooks = hook.split( " " );
	each( hooks, function( i, hook ) {
		jQuery.cssHooks[ hook ] = {
			set: function( elem, value ) {
				var parsed;

				if ( value !== "transparent" && ( getType( value ) !== "string" || ( parsed = stringParse( value ) ) ) ) {
					value = color( parsed || value );
					value = value.toRgbaString();
				}
				elem.style[ hook ] = value;
			}
		};
		jQuery.fx.step[ hook ] = function( fx ) {
			if ( !fx.colorInit ) {
				fx.start = color( fx.elem, hook );
				fx.end = color( fx.end );
				fx.colorInit = true;
			}
			jQuery.cssHooks[ hook ].set( fx.elem, fx.start.transition( fx.end, fx.pos ) );
		};
	} );

};

color.hook( stepHooks );

jQuery.cssHooks.borderColor = {
	expand: function( value ) {
		var expanded = {};

		each( [ "Top", "Right", "Bottom", "Left" ], function( i, part ) {
			expanded[ "border" + part + "Color" ] = value;
		} );
		return expanded;
	}
};

// Basic color names only.
// Usage of any of the other color names requires adding yourself or including
// jquery.color.svg-names.js.
colors = jQuery.Color.names = {

	// 4.1. Basic color keywords
	aqua: "#00ffff",
	black: "#000000",
	blue: "#0000ff",
	fuchsia: "#ff00ff",
	gray: "#808080",
	green: "#008000",
	lime: "#00ff00",
	maroon: "#800000",
	navy: "#000080",
	olive: "#808000",
	purple: "#800080",
	red: "#ff0000",
	silver: "#c0c0c0",
	teal: "#008080",
	white: "#ffffff",
	yellow: "#ffff00",

	// 4.2.3. "transparent" color keyword
	transparent: [ null, null, null, 0 ],

	_default: "#ffffff"
};

} );
/*
 * jQuery File Upload Plugin
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2010, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * https://opensource.org/licenses/MIT
 */

/* global define, require */
/* eslint-disable new-cap */


(function (factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    // Register as an anonymous AMD module:
    define(['jquery', 'jquery-ui/ui/widget'], factory);
  } else if (typeof exports === 'object') {
    // Node/CommonJS:
    factory(require('jquery'), require('./vendor/jquery.ui.widget'));
  } else {
    // Browser globals:
    factory(window.jQuery);
  }
})(function ($) {
  'use strict';

  // Detect file input support, based on
  // https://viljamis.com/2012/file-upload-support-on-mobile/
  $.support.fileInput = !(
    new RegExp(
      // Handle devices which give false positives for the feature detection:
      '(Android (1\\.[0156]|2\\.[01]))' +
        '|(Windows Phone (OS 7|8\\.0))|(XBLWP)|(ZuneWP)|(WPDesktop)' +
        '|(w(eb)?OSBrowser)|(webOS)' +
        '|(Kindle/(1\\.0|2\\.[05]|3\\.0))'
    ).test(window.navigator.userAgent) ||
    // Feature detection for all other devices:
    $('<input type="file"/>').prop('disabled')
  );

  // The FileReader API is not actually used, but works as feature detection,
  // as some Safari versions (5?) support XHR file uploads via the FormData API,
  // but not non-multipart XHR file uploads.
  // window.XMLHttpRequestUpload is not available on IE10, so we check for
  // window.ProgressEvent instead to detect XHR2 file upload capability:
  $.support.xhrFileUpload = !!(window.ProgressEvent && window.FileReader);
  $.support.xhrFormDataFileUpload = !!window.FormData;

  // Detect support for Blob slicing (required for chunked uploads):
  $.support.blobSlice =
    window.Blob &&
    (Blob.prototype.slice ||
      Blob.prototype.webkitSlice ||
      Blob.prototype.mozSlice);

  /**
   * Helper function to create drag handlers for dragover/dragenter/dragleave
   *
   * @param {string} type Event type
   * @returns {Function} Drag handler
   */
  function getDragHandler(type) {
    var isDragOver = type === 'dragover';
    return function (e) {
      e.dataTransfer = e.originalEvent && e.originalEvent.dataTransfer;
      var dataTransfer = e.dataTransfer;
      if (
        dataTransfer &&
        $.inArray('Files', dataTransfer.types) !== -1 &&
        this._trigger(type, $.Event(type, { delegatedEvent: e })) !== false
      ) {
        e.preventDefault();
        if (isDragOver) {
          dataTransfer.dropEffect = 'copy';
        }
      }
    };
  }

  // The fileupload widget listens for change events on file input fields defined
  // via fileInput setting and paste or drop events of the given dropZone.
  // In addition to the default jQuery Widget methods, the fileupload widget
  // exposes the "add" and "send" methods, to add or directly send files using
  // the fileupload API.
  // By default, files added via file input selection, paste, drag & drop or
  // "add" method are uploaded immediately, but it is possible to override
  // the "add" callback option to queue file uploads.
  $.widget('blueimp.fileupload', {
    options: {
      // The drop target element(s), by the default the complete document.
      // Set to null to disable drag & drop support:
      dropZone: $(document),
      // The paste target element(s), by the default undefined.
      // Set to a DOM node or jQuery object to enable file pasting:
      pasteZone: undefined,
      // The file input field(s), that are listened to for change events.
      // If undefined, it is set to the file input fields inside
      // of the widget element on plugin initialization.
      // Set to null to disable the change listener.
      fileInput: undefined,
      // By default, the file input field is replaced with a clone after
      // each input field change event. This is required for iframe transport
      // queues and allows change events to be fired for the same file
      // selection, but can be disabled by setting the following option to false:
      replaceFileInput: true,
      // The parameter name for the file form data (the request argument name).
      // If undefined or empty, the name property of the file input field is
      // used, or "files[]" if the file input name property is also empty,
      // can be a string or an array of strings:
      paramName: undefined,
      // By default, each file of a selection is uploaded using an individual
      // request for XHR type uploads. Set to false to upload file
      // selections in one request each:
      singleFileUploads: true,
      // To limit the number of files uploaded with one XHR request,
      // set the following option to an integer greater than 0:
      limitMultiFileUploads: undefined,
      // The following option limits the number of files uploaded with one
      // XHR request to keep the request size under or equal to the defined
      // limit in bytes:
      limitMultiFileUploadSize: undefined,
      // Multipart file uploads add a number of bytes to each uploaded file,
      // therefore the following option adds an overhead for each file used
      // in the limitMultiFileUploadSize configuration:
      limitMultiFileUploadSizeOverhead: 512,
      // Set the following option to true to issue all file upload requests
      // in a sequential order:
      sequentialUploads: false,
      // To limit the number of concurrent uploads,
      // set the following option to an integer greater than 0:
      limitConcurrentUploads: undefined,
      // Set the following option to true to force iframe transport uploads:
      forceIframeTransport: false,
      // Set the following option to the location of a redirect url on the
      // origin server, for cross-domain iframe transport uploads:
      redirect: undefined,
      // The parameter name for the redirect url, sent as part of the form
      // data and set to 'redirect' if this option is empty:
      redirectParamName: undefined,
      // Set the following option to the location of a postMessage window,
      // to enable postMessage transport uploads:
      postMessage: undefined,
      // By default, XHR file uploads are sent as multipart/form-data.
      // The iframe transport is always using multipart/form-data.
      // Set to false to enable non-multipart XHR uploads:
      multipart: true,
      // To upload large files in smaller chunks, set the following option
      // to a preferred maximum chunk size. If set to 0, null or undefined,
      // or the browser does not support the required Blob API, files will
      // be uploaded as a whole.
      maxChunkSize: undefined,
      // When a non-multipart upload or a chunked multipart upload has been
      // aborted, this option can be used to resume the upload by setting
      // it to the size of the already uploaded bytes. This option is most
      // useful when modifying the options object inside of the "add" or
      // "send" callbacks, as the options are cloned for each file upload.
      uploadedBytes: undefined,
      // By default, failed (abort or error) file uploads are removed from the
      // global progress calculation. Set the following option to false to
      // prevent recalculating the global progress data:
      recalculateProgress: true,
      // Interval in milliseconds to calculate and trigger progress events:
      progressInterval: 100,
      // Interval in milliseconds to calculate progress bitrate:
      bitrateInterval: 500,
      // By default, uploads are started automatically when adding files:
      autoUpload: true,
      // By default, duplicate file names are expected to be handled on
      // the server-side. If this is not possible (e.g. when uploading
      // files directly to Amazon S3), the following option can be set to
      // an empty object or an object mapping existing filenames, e.g.:
      // { "image.jpg": true, "image (1).jpg": true }
      // If it is set, all files will be uploaded with unique filenames,
      // adding increasing number suffixes if necessary, e.g.:
      // "image (2).jpg"
      uniqueFilenames: undefined,

      // Error and info messages:
      messages: {
        uploadedBytes: 'Uploaded bytes exceed file size'
      },

      // Translation function, gets the message key to be translated
      // and an object with context specific data as arguments:
      i18n: function (message, context) {
        // eslint-disable-next-line no-param-reassign
        message = this.messages[message] || message.toString();
        if (context) {
          $.each(context, function (key, value) {
            // eslint-disable-next-line no-param-reassign
            message = message.replace('{' + key + '}', value);
          });
        }
        return message;
      },

      // Additional form data to be sent along with the file uploads can be set
      // using this option, which accepts an array of objects with name and
      // value properties, a function returning such an array, a FormData
      // object (for XHR file uploads), or a simple object.
      // The form of the first fileInput is given as parameter to the function:
      formData: function (form) {
        return form.serializeArray();
      },

      // The add callback is invoked as soon as files are added to the fileupload
      // widget (via file input selection, drag & drop, paste or add API call).
      // If the singleFileUploads option is enabled, this callback will be
      // called once for each file in the selection for XHR file uploads, else
      // once for each file selection.
      //
      // The upload starts when the submit method is invoked on the data parameter.
      // The data object contains a files property holding the added files
      // and allows you to override plugin options as well as define ajax settings.
      //
      // Listeners for this callback can also be bound the following way:
      // .on('fileuploadadd', func);
      //
      // data.submit() returns a Promise object and allows to attach additional
      // handlers using jQuery's Deferred callbacks:
      // data.submit().done(func).fail(func).always(func);
      add: function (e, data) {
        if (e.isDefaultPrevented()) {
          return false;
        }
        if (
          data.autoUpload ||
          (data.autoUpload !== false &&
            $(this).fileupload('option', 'autoUpload'))
        ) {
          data.process().done(function () {
            data.submit();
          });
        }
      },

      // Other callbacks:

      // Callback for the submit event of each file upload:
      // submit: function (e, data) {}, // .on('fileuploadsubmit', func);

      // Callback for the start of each file upload request:
      // send: function (e, data) {}, // .on('fileuploadsend', func);

      // Callback for successful uploads:
      // done: function (e, data) {}, // .on('fileuploaddone', func);

      // Callback for failed (abort or error) uploads:
      // fail: function (e, data) {}, // .on('fileuploadfail', func);

      // Callback for completed (success, abort or error) requests:
      // always: function (e, data) {}, // .on('fileuploadalways', func);

      // Callback for upload progress events:
      // progress: function (e, data) {}, // .on('fileuploadprogress', func);

      // Callback for global upload progress events:
      // progressall: function (e, data) {}, // .on('fileuploadprogressall', func);

      // Callback for uploads start, equivalent to the global ajaxStart event:
      // start: function (e) {}, // .on('fileuploadstart', func);

      // Callback for uploads stop, equivalent to the global ajaxStop event:
      // stop: function (e) {}, // .on('fileuploadstop', func);

      // Callback for change events of the fileInput(s):
      // change: function (e, data) {}, // .on('fileuploadchange', func);

      // Callback for paste events to the pasteZone(s):
      // paste: function (e, data) {}, // .on('fileuploadpaste', func);

      // Callback for drop events of the dropZone(s):
      // drop: function (e, data) {}, // .on('fileuploaddrop', func);

      // Callback for dragover events of the dropZone(s):
      // dragover: function (e) {}, // .on('fileuploaddragover', func);

      // Callback before the start of each chunk upload request (before form data initialization):
      // chunkbeforesend: function (e, data) {}, // .on('fileuploadchunkbeforesend', func);

      // Callback for the start of each chunk upload request:
      // chunksend: function (e, data) {}, // .on('fileuploadchunksend', func);

      // Callback for successful chunk uploads:
      // chunkdone: function (e, data) {}, // .on('fileuploadchunkdone', func);

      // Callback for failed (abort or error) chunk uploads:
      // chunkfail: function (e, data) {}, // .on('fileuploadchunkfail', func);

      // Callback for completed (success, abort or error) chunk upload requests:
      // chunkalways: function (e, data) {}, // .on('fileuploadchunkalways', func);

      // The plugin options are used as settings object for the ajax calls.
      // The following are jQuery ajax settings required for the file uploads:
      processData: false,
      contentType: false,
      cache: false,
      timeout: 0
    },

    // A list of options that require reinitializing event listeners and/or
    // special initialization code:
    _specialOptions: [
      'fileInput',
      'dropZone',
      'pasteZone',
      'multipart',
      'forceIframeTransport'
    ],

    _blobSlice:
      $.support.blobSlice &&
      function () {
        var slice = this.slice || this.webkitSlice || this.mozSlice;
        return slice.apply(this, arguments);
      },

    _BitrateTimer: function () {
      this.timestamp = Date.now ? Date.now() : new Date().getTime();
      this.loaded = 0;
      this.bitrate = 0;
      this.getBitrate = function (now, loaded, interval) {
        var timeDiff = now - this.timestamp;
        if (!this.bitrate || !interval || timeDiff > interval) {
          this.bitrate = (loaded - this.loaded) * (1000 / timeDiff) * 8;
          this.loaded = loaded;
          this.timestamp = now;
        }
        return this.bitrate;
      };
    },

    _isXHRUpload: function (options) {
      return (
        !options.forceIframeTransport &&
        ((!options.multipart && $.support.xhrFileUpload) ||
          $.support.xhrFormDataFileUpload)
      );
    },

    _getFormData: function (options) {
      var formData;
      if ($.type(options.formData) === 'function') {
        return options.formData(options.form);
      }
      if ($.isArray(options.formData)) {
        return options.formData;
      }
      if ($.type(options.formData) === 'object') {
        formData = [];
        $.each(options.formData, function (name, value) {
          formData.push({ name: name, value: value });
        });
        return formData;
      }
      return [];
    },

    _getTotal: function (files) {
      var total = 0;
      $.each(files, function (index, file) {
        total += file.size || 1;
      });
      return total;
    },

    _initProgressObject: function (obj) {
      var progress = {
        loaded: 0,
        total: 0,
        bitrate: 0
      };
      if (obj._progress) {
        $.extend(obj._progress, progress);
      } else {
        obj._progress = progress;
      }
    },

    _initResponseObject: function (obj) {
      var prop;
      if (obj._response) {
        for (prop in obj._response) {
          if (Object.prototype.hasOwnProperty.call(obj._response, prop)) {
            delete obj._response[prop];
          }
        }
      } else {
        obj._response = {};
      }
    },

    _onProgress: function (e, data) {
      if (e.lengthComputable) {
        var now = Date.now ? Date.now() : new Date().getTime(),
          loaded;
        if (
          data._time &&
          data.progressInterval &&
          now - data._time < data.progressInterval &&
          e.loaded !== e.total
        ) {
          return;
        }
        data._time = now;
        loaded =
          Math.floor(
            (e.loaded / e.total) * (data.chunkSize || data._progress.total)
          ) + (data.uploadedBytes || 0);
        // Add the difference from the previously loaded state
        // to the global loaded counter:
        this._progress.loaded += loaded - data._progress.loaded;
        this._progress.bitrate = this._bitrateTimer.getBitrate(
          now,
          this._progress.loaded,
          data.bitrateInterval
        );
        data._progress.loaded = data.loaded = loaded;
        data._progress.bitrate = data.bitrate = data._bitrateTimer.getBitrate(
          now,
          loaded,
          data.bitrateInterval
        );
        // Trigger a custom progress event with a total data property set
        // to the file size(s) of the current upload and a loaded data
        // property calculated accordingly:
        this._trigger(
          'progress',
          $.Event('progress', { delegatedEvent: e }),
          data
        );
        // Trigger a global progress event for all current file uploads,
        // including ajax calls queued for sequential file uploads:
        this._trigger(
          'progressall',
          $.Event('progressall', { delegatedEvent: e }),
          this._progress
        );
      }
    },

    _initProgressListener: function (options) {
      var that = this,
        xhr = options.xhr ? options.xhr() : $.ajaxSettings.xhr();
      // Accesss to the native XHR object is required to add event listeners
      // for the upload progress event:
      if (xhr.upload) {
        $(xhr.upload).on('progress', function (e) {
          var oe = e.originalEvent;
          // Make sure the progress event properties get copied over:
          e.lengthComputable = oe.lengthComputable;
          e.loaded = oe.loaded;
          e.total = oe.total;
          that._onProgress(e, options);
        });
        options.xhr = function () {
          return xhr;
        };
      }
    },

    _deinitProgressListener: function (options) {
      var xhr = options.xhr ? options.xhr() : $.ajaxSettings.xhr();
      if (xhr.upload) {
        $(xhr.upload).off('progress');
      }
    },

    _isInstanceOf: function (type, obj) {
      // Cross-frame instanceof check
      return Object.prototype.toString.call(obj) === '[object ' + type + ']';
    },

    _getUniqueFilename: function (name, map) {
      // eslint-disable-next-line no-param-reassign
      name = String(name);
      if (map[name]) {
        // eslint-disable-next-line no-param-reassign
        name = name.replace(/(?: \(([\d]+)\))?(\.[^.]+)?$/, function (
          _,
          p1,
          p2
        ) {
          var index = p1 ? Number(p1) + 1 : 1;
          var ext = p2 || '';
          return ' (' + index + ')' + ext;
        });
        return this._getUniqueFilename(name, map);
      }
      map[name] = true;
      return name;
    },

    _initXHRData: function (options) {
      var that = this,
        formData,
        file = options.files[0],
        // Ignore non-multipart setting if not supported:
        multipart = options.multipart || !$.support.xhrFileUpload,
        paramName =
          $.type(options.paramName) === 'array'
            ? options.paramName[0]
            : options.paramName;
      options.headers = $.extend({}, options.headers);
      if (options.contentRange) {
        options.headers['Content-Range'] = options.contentRange;
      }
      if (!multipart || options.blob || !this._isInstanceOf('File', file)) {
        options.headers['Content-Disposition'] =
          'attachment; filename="' +
          encodeURI(file.uploadName || file.name) +
          '"';
      }
      if (!multipart) {
        options.contentType = file.type || 'application/octet-stream';
        options.data = options.blob || file;
      } else if ($.support.xhrFormDataFileUpload) {
        if (options.postMessage) {
          // window.postMessage does not allow sending FormData
          // objects, so we just add the File/Blob objects to
          // the formData array and let the postMessage window
          // create the FormData object out of this array:
          formData = this._getFormData(options);
          if (options.blob) {
            formData.push({
              name: paramName,
              value: options.blob
            });
          } else {
            $.each(options.files, function (index, file) {
              formData.push({
                name:
                  ($.type(options.paramName) === 'array' &&
                    options.paramName[index]) ||
                  paramName,
                value: file
              });
            });
          }
        } else {
          if (that._isInstanceOf('FormData', options.formData)) {
            formData = options.formData;
          } else {
            formData = new FormData();
            $.each(this._getFormData(options), function (index, field) {
              formData.append(field.name, field.value);
            });
          }
          if (options.blob) {
            formData.append(
              paramName,
              options.blob,
              file.uploadName || file.name
            );
          } else {
            $.each(options.files, function (index, file) {
              // This check allows the tests to run with
              // dummy objects:
              if (
                that._isInstanceOf('File', file) ||
                that._isInstanceOf('Blob', file)
              ) {
                var fileName = file.uploadName || file.name;
                if (options.uniqueFilenames) {
                  fileName = that._getUniqueFilename(
                    fileName,
                    options.uniqueFilenames
                  );
                }
                formData.append(
                  ($.type(options.paramName) === 'array' &&
                    options.paramName[index]) ||
                    paramName,
                  file,
                  fileName
                );
              }
            });
          }
        }
        options.data = formData;
      }
      // Blob reference is not needed anymore, free memory:
      options.blob = null;
    },

    _initIframeSettings: function (options) {
      var targetHost = $('<a></a>').prop('href', options.url).prop('host');
      // Setting the dataType to iframe enables the iframe transport:
      options.dataType = 'iframe ' + (options.dataType || '');
      // The iframe transport accepts a serialized array as form data:
      options.formData = this._getFormData(options);
      // Add redirect url to form data on cross-domain uploads:
      if (options.redirect && targetHost && targetHost !== location.host) {
        options.formData.push({
          name: options.redirectParamName || 'redirect',
          value: options.redirect
        });
      }
    },

    _initDataSettings: function (options) {
      if (this._isXHRUpload(options)) {
        if (!this._chunkedUpload(options, true)) {
          if (!options.data) {
            this._initXHRData(options);
          }
          this._initProgressListener(options);
        }
        if (options.postMessage) {
          // Setting the dataType to postmessage enables the
          // postMessage transport:
          options.dataType = 'postmessage ' + (options.dataType || '');
        }
      } else {
        this._initIframeSettings(options);
      }
    },

    _getParamName: function (options) {
      var fileInput = $(options.fileInput),
        paramName = options.paramName;
      if (!paramName) {
        paramName = [];
        fileInput.each(function () {
          var input = $(this),
            name = input.prop('name') || 'files[]',
            i = (input.prop('files') || [1]).length;
          while (i) {
            paramName.push(name);
            i -= 1;
          }
        });
        if (!paramName.length) {
          paramName = [fileInput.prop('name') || 'files[]'];
        }
      } else if (!$.isArray(paramName)) {
        paramName = [paramName];
      }
      return paramName;
    },

    _initFormSettings: function (options) {
      // Retrieve missing options from the input field and the
      // associated form, if available:
      if (!options.form || !options.form.length) {
        options.form = $(options.fileInput.prop('form'));
        // If the given file input doesn't have an associated form,
        // use the default widget file input's form:
        if (!options.form.length) {
          options.form = $(this.options.fileInput.prop('form'));
        }
      }
      options.paramName = this._getParamName(options);
      if (!options.url) {
        options.url = options.form.prop('action') || location.href;
      }
      // The HTTP request method must be "POST" or "PUT":
      options.type = (
        options.type ||
        ($.type(options.form.prop('method')) === 'string' &&
          options.form.prop('method')) ||
        ''
      ).toUpperCase();
      if (
        options.type !== 'POST' &&
        options.type !== 'PUT' &&
        options.type !== 'PATCH'
      ) {
        options.type = 'POST';
      }
      if (!options.formAcceptCharset) {
        options.formAcceptCharset = options.form.attr('accept-charset');
      }
    },

    _getAJAXSettings: function (data) {
      var options = $.extend({}, this.options, data);
      this._initFormSettings(options);
      this._initDataSettings(options);
      return options;
    },

    // jQuery 1.6 doesn't provide .state(),
    // while jQuery 1.8+ removed .isRejected() and .isResolved():
    _getDeferredState: function (deferred) {
      if (deferred.state) {
        return deferred.state();
      }
      if (deferred.isResolved()) {
        return 'resolved';
      }
      if (deferred.isRejected()) {
        return 'rejected';
      }
      return 'pending';
    },

    // Maps jqXHR callbacks to the equivalent
    // methods of the given Promise object:
    _enhancePromise: function (promise) {
      promise.success = promise.done;
      promise.error = promise.fail;
      promise.complete = promise.always;
      return promise;
    },

    // Creates and returns a Promise object enhanced with
    // the jqXHR methods abort, success, error and complete:
    _getXHRPromise: function (resolveOrReject, context, args) {
      var dfd = $.Deferred(),
        promise = dfd.promise();
      // eslint-disable-next-line no-param-reassign
      context = context || this.options.context || promise;
      if (resolveOrReject === true) {
        dfd.resolveWith(context, args);
      } else if (resolveOrReject === false) {
        dfd.rejectWith(context, args);
      }
      promise.abort = dfd.promise;
      return this._enhancePromise(promise);
    },

    // Adds convenience methods to the data callback argument:
    _addConvenienceMethods: function (e, data) {
      var that = this,
        getPromise = function (args) {
          return $.Deferred().resolveWith(that, args).promise();
        };
      data.process = function (resolveFunc, rejectFunc) {
        if (resolveFunc || rejectFunc) {
          data._processQueue = this._processQueue = (
            this._processQueue || getPromise([this])
          )
            .then(function () {
              if (data.errorThrown) {
                return $.Deferred().rejectWith(that, [data]).promise();
              }
              return getPromise(arguments);
            })
            .then(resolveFunc, rejectFunc);
        }
        return this._processQueue || getPromise([this]);
      };
      data.submit = function () {
        if (this.state() !== 'pending') {
          data.jqXHR = this.jqXHR =
            that._trigger(
              'submit',
              $.Event('submit', { delegatedEvent: e }),
              this
            ) !== false && that._onSend(e, this);
        }
        return this.jqXHR || that._getXHRPromise();
      };
      data.abort = function () {
        if (this.jqXHR) {
          return this.jqXHR.abort();
        }
        this.errorThrown = 'abort';
        that._trigger('fail', null, this);
        return that._getXHRPromise(false);
      };
      data.state = function () {
        if (this.jqXHR) {
          return that._getDeferredState(this.jqXHR);
        }
        if (this._processQueue) {
          return that._getDeferredState(this._processQueue);
        }
      };
      data.processing = function () {
        return (
          !this.jqXHR &&
          this._processQueue &&
          that._getDeferredState(this._processQueue) === 'pending'
        );
      };
      data.progress = function () {
        return this._progress;
      };
      data.response = function () {
        return this._response;
      };
    },

    // Parses the Range header from the server response
    // and returns the uploaded bytes:
    _getUploadedBytes: function (jqXHR) {
      var range = jqXHR.getResponseHeader('Range'),
        parts = range && range.split('-'),
        upperBytesPos = parts && parts.length > 1 && parseInt(parts[1], 10);
      return upperBytesPos && upperBytesPos + 1;
    },

    // Uploads a file in multiple, sequential requests
    // by splitting the file up in multiple blob chunks.
    // If the second parameter is true, only tests if the file
    // should be uploaded in chunks, but does not invoke any
    // upload requests:
    _chunkedUpload: function (options, testOnly) {
      options.uploadedBytes = options.uploadedBytes || 0;
      var that = this,
        file = options.files[0],
        fs = file.size,
        ub = options.uploadedBytes,
        mcs = options.maxChunkSize || fs,
        slice = this._blobSlice,
        dfd = $.Deferred(),
        promise = dfd.promise(),
        jqXHR,
        upload;
      if (
        !(
          this._isXHRUpload(options) &&
          slice &&
          (ub || ($.type(mcs) === 'function' ? mcs(options) : mcs) < fs)
        ) ||
        options.data
      ) {
        return false;
      }
      if (testOnly) {
        return true;
      }
      if (ub >= fs) {
        file.error = options.i18n('uploadedBytes');
        return this._getXHRPromise(false, options.context, [
          null,
          'error',
          file.error
        ]);
      }
      // The chunk upload method:
      upload = function () {
        // Clone the options object for each chunk upload:
        var o = $.extend({}, options),
          currentLoaded = o._progress.loaded;
        o.blob = slice.call(
          file,
          ub,
          ub + ($.type(mcs) === 'function' ? mcs(o) : mcs),
          file.type
        );
        // Store the current chunk size, as the blob itself
        // will be dereferenced after data processing:
        o.chunkSize = o.blob.size;
        // Expose the chunk bytes position range:
        o.contentRange =
          'bytes ' + ub + '-' + (ub + o.chunkSize - 1) + '/' + fs;
        // Trigger chunkbeforesend to allow form data to be updated for this chunk
        that._trigger('chunkbeforesend', null, o);
        // Process the upload data (the blob and potential form data):
        that._initXHRData(o);
        // Add progress listeners for this chunk upload:
        that._initProgressListener(o);
        jqXHR = (
          (that._trigger('chunksend', null, o) !== false && $.ajax(o)) ||
          that._getXHRPromise(false, o.context)
        )
          .done(function (result, textStatus, jqXHR) {
            ub = that._getUploadedBytes(jqXHR) || ub + o.chunkSize;
            // Create a progress event if no final progress event
            // with loaded equaling total has been triggered
            // for this chunk:
            if (currentLoaded + o.chunkSize - o._progress.loaded) {
              that._onProgress(
                $.Event('progress', {
                  lengthComputable: true,
                  loaded: ub - o.uploadedBytes,
                  total: ub - o.uploadedBytes
                }),
                o
              );
            }
            options.uploadedBytes = o.uploadedBytes = ub;
            o.result = result;
            o.textStatus = textStatus;
            o.jqXHR = jqXHR;
            that._trigger('chunkdone', null, o);
            that._trigger('chunkalways', null, o);
            if (ub < fs) {
              // File upload not yet complete,
              // continue with the next chunk:
              upload();
            } else {
              dfd.resolveWith(o.context, [result, textStatus, jqXHR]);
            }
          })
          .fail(function (jqXHR, textStatus, errorThrown) {
            o.jqXHR = jqXHR;
            o.textStatus = textStatus;
            o.errorThrown = errorThrown;
            that._trigger('chunkfail', null, o);
            that._trigger('chunkalways', null, o);
            dfd.rejectWith(o.context, [jqXHR, textStatus, errorThrown]);
          })
          .always(function () {
            that._deinitProgressListener(o);
          });
      };
      this._enhancePromise(promise);
      promise.abort = function () {
        return jqXHR.abort();
      };
      upload();
      return promise;
    },

    _beforeSend: function (e, data) {
      if (this._active === 0) {
        // the start callback is triggered when an upload starts
        // and no other uploads are currently running,
        // equivalent to the global ajaxStart event:
        this._trigger('start');
        // Set timer for global bitrate progress calculation:
        this._bitrateTimer = new this._BitrateTimer();
        // Reset the global progress values:
        this._progress.loaded = this._progress.total = 0;
        this._progress.bitrate = 0;
      }
      // Make sure the container objects for the .response() and
      // .progress() methods on the data object are available
      // and reset to their initial state:
      this._initResponseObject(data);
      this._initProgressObject(data);
      data._progress.loaded = data.loaded = data.uploadedBytes || 0;
      data._progress.total = data.total = this._getTotal(data.files) || 1;
      data._progress.bitrate = data.bitrate = 0;
      this._active += 1;
      // Initialize the global progress values:
      this._progress.loaded += data.loaded;
      this._progress.total += data.total;
    },

    _onDone: function (result, textStatus, jqXHR, options) {
      var total = options._progress.total,
        response = options._response;
      if (options._progress.loaded < total) {
        // Create a progress event if no final progress event
        // with loaded equaling total has been triggered:
        this._onProgress(
          $.Event('progress', {
            lengthComputable: true,
            loaded: total,
            total: total
          }),
          options
        );
      }
      response.result = options.result = result;
      response.textStatus = options.textStatus = textStatus;
      response.jqXHR = options.jqXHR = jqXHR;
      this._trigger('done', null, options);
    },

    _onFail: function (jqXHR, textStatus, errorThrown, options) {
      var response = options._response;
      if (options.recalculateProgress) {
        // Remove the failed (error or abort) file upload from
        // the global progress calculation:
        this._progress.loaded -= options._progress.loaded;
        this._progress.total -= options._progress.total;
      }
      response.jqXHR = options.jqXHR = jqXHR;
      response.textStatus = options.textStatus = textStatus;
      response.errorThrown = options.errorThrown = errorThrown;
      this._trigger('fail', null, options);
    },

    _onAlways: function (jqXHRorResult, textStatus, jqXHRorError, options) {
      // jqXHRorResult, textStatus and jqXHRorError are added to the
      // options object via done and fail callbacks
      this._trigger('always', null, options);
    },

    _onSend: function (e, data) {
      if (!data.submit) {
        this._addConvenienceMethods(e, data);
      }
      var that = this,
        jqXHR,
        aborted,
        slot,
        pipe,
        options = that._getAJAXSettings(data),
        send = function () {
          that._sending += 1;
          // Set timer for bitrate progress calculation:
          options._bitrateTimer = new that._BitrateTimer();
          jqXHR =
            jqXHR ||
            (
              ((aborted ||
                that._trigger(
                  'send',
                  $.Event('send', { delegatedEvent: e }),
                  options
                ) === false) &&
                that._getXHRPromise(false, options.context, aborted)) ||
              that._chunkedUpload(options) ||
              $.ajax(options)
            )
              .done(function (result, textStatus, jqXHR) {
                that._onDone(result, textStatus, jqXHR, options);
              })
              .fail(function (jqXHR, textStatus, errorThrown) {
                that._onFail(jqXHR, textStatus, errorThrown, options);
              })
              .always(function (jqXHRorResult, textStatus, jqXHRorError) {
                that._deinitProgressListener(options);
                that._onAlways(
                  jqXHRorResult,
                  textStatus,
                  jqXHRorError,
                  options
                );
                that._sending -= 1;
                that._active -= 1;
                if (
                  options.limitConcurrentUploads &&
                  options.limitConcurrentUploads > that._sending
                ) {
                  // Start the next queued upload,
                  // that has not been aborted:
                  var nextSlot = that._slots.shift();
                  while (nextSlot) {
                    if (that._getDeferredState(nextSlot) === 'pending') {
                      nextSlot.resolve();
                      break;
                    }
                    nextSlot = that._slots.shift();
                  }
                }
                if (that._active === 0) {
                  // The stop callback is triggered when all uploads have
                  // been completed, equivalent to the global ajaxStop event:
                  that._trigger('stop');
                }
              });
          return jqXHR;
        };
      this._beforeSend(e, options);
      if (
        this.options.sequentialUploads ||
        (this.options.limitConcurrentUploads &&
          this.options.limitConcurrentUploads <= this._sending)
      ) {
        if (this.options.limitConcurrentUploads > 1) {
          slot = $.Deferred();
          this._slots.push(slot);
          pipe = slot.then(send);
        } else {
          this._sequence = this._sequence.then(send, send);
          pipe = this._sequence;
        }
        // Return the piped Promise object, enhanced with an abort method,
        // which is delegated to the jqXHR object of the current upload,
        // and jqXHR callbacks mapped to the equivalent Promise methods:
        pipe.abort = function () {
          aborted = [undefined, 'abort', 'abort'];
          if (!jqXHR) {
            if (slot) {
              slot.rejectWith(options.context, aborted);
            }
            return send();
          }
          return jqXHR.abort();
        };
        return this._enhancePromise(pipe);
      }
      return send();
    },

    _onAdd: function (e, data) {
      var that = this,
        result = true,
        options = $.extend({}, this.options, data),
        files = data.files,
        filesLength = files.length,
        limit = options.limitMultiFileUploads,
        limitSize = options.limitMultiFileUploadSize,
        overhead = options.limitMultiFileUploadSizeOverhead,
        batchSize = 0,
        paramName = this._getParamName(options),
        paramNameSet,
        paramNameSlice,
        fileSet,
        i,
        j = 0;
      if (!filesLength) {
        return false;
      }
      if (limitSize && files[0].size === undefined) {
        limitSize = undefined;
      }
      if (
        !(options.singleFileUploads || limit || limitSize) ||
        !this._isXHRUpload(options)
      ) {
        fileSet = [files];
        paramNameSet = [paramName];
      } else if (!(options.singleFileUploads || limitSize) && limit) {
        fileSet = [];
        paramNameSet = [];
        for (i = 0; i < filesLength; i += limit) {
          fileSet.push(files.slice(i, i + limit));
          paramNameSlice = paramName.slice(i, i + limit);
          if (!paramNameSlice.length) {
            paramNameSlice = paramName;
          }
          paramNameSet.push(paramNameSlice);
        }
      } else if (!options.singleFileUploads && limitSize) {
        fileSet = [];
        paramNameSet = [];
        for (i = 0; i < filesLength; i = i + 1) {
          batchSize += files[i].size + overhead;
          if (
            i + 1 === filesLength ||
            batchSize + files[i + 1].size + overhead > limitSize ||
            (limit && i + 1 - j >= limit)
          ) {
            fileSet.push(files.slice(j, i + 1));
            paramNameSlice = paramName.slice(j, i + 1);
            if (!paramNameSlice.length) {
              paramNameSlice = paramName;
            }
            paramNameSet.push(paramNameSlice);
            j = i + 1;
            batchSize = 0;
          }
        }
      } else {
        paramNameSet = paramName;
      }
      data.originalFiles = files;
      $.each(fileSet || files, function (index, element) {
        var newData = $.extend({}, data);
        newData.files = fileSet ? element : [element];
        newData.paramName = paramNameSet[index];
        that._initResponseObject(newData);
        that._initProgressObject(newData);
        that._addConvenienceMethods(e, newData);
        result = that._trigger(
          'add',
          $.Event('add', { delegatedEvent: e }),
          newData
        );
        return result;
      });
      return result;
    },

    _replaceFileInput: function (data) {
      var input = data.fileInput,
        inputClone = input.clone(true),
        restoreFocus = input.is(document.activeElement);
      // Add a reference for the new cloned file input to the data argument:
      data.fileInputClone = inputClone;
      $('<form></form>').append(inputClone)[0].reset();
      // Detaching allows to insert the fileInput on another form
      // without loosing the file input value:
      input.after(inputClone).detach();
      // If the fileInput had focus before it was detached,
      // restore focus to the inputClone.
      if (restoreFocus) {
        inputClone.focus();
      }
      // Avoid memory leaks with the detached file input:
      $.cleanData(input.off('remove'));
      // Replace the original file input element in the fileInput
      // elements set with the clone, which has been copied including
      // event handlers:
      this.options.fileInput = this.options.fileInput.map(function (i, el) {
        if (el === input[0]) {
          return inputClone[0];
        }
        return el;
      });
      // If the widget has been initialized on the file input itself,
      // override this.element with the file input clone:
      if (input[0] === this.element[0]) {
        this.element = inputClone;
      }
    },

    _handleFileTreeEntry: function (entry, path) {
      var that = this,
        dfd = $.Deferred(),
        entries = [],
        dirReader,
        errorHandler = function (e) {
          if (e && !e.entry) {
            e.entry = entry;
          }
          // Since $.when returns immediately if one
          // Deferred is rejected, we use resolve instead.
          // This allows valid files and invalid items
          // to be returned together in one set:
          dfd.resolve([e]);
        },
        successHandler = function (entries) {
          that
            ._handleFileTreeEntries(entries, path + entry.name + '/')
            .done(function (files) {
              dfd.resolve(files);
            })
            .fail(errorHandler);
        },
        readEntries = function () {
          dirReader.readEntries(function (results) {
            if (!results.length) {
              successHandler(entries);
            } else {
              entries = entries.concat(results);
              readEntries();
            }
          }, errorHandler);
        };
      // eslint-disable-next-line no-param-reassign
      path = path || '';
      if (entry.isFile) {
        if (entry._file) {
          // Workaround for Chrome bug #149735
          entry._file.relativePath = path;
          dfd.resolve(entry._file);
        } else {
          entry.file(function (file) {
            file.relativePath = path;
            dfd.resolve(file);
          }, errorHandler);
        }
      } else if (entry.isDirectory) {
        dirReader = entry.createReader();
        readEntries();
      } else {
        // Return an empty list for file system items
        // other than files or directories:
        dfd.resolve([]);
      }
      return dfd.promise();
    },

    _handleFileTreeEntries: function (entries, path) {
      var that = this;
      return $.when
        .apply(
          $,
          $.map(entries, function (entry) {
            return that._handleFileTreeEntry(entry, path);
          })
        )
        .then(function () {
          return Array.prototype.concat.apply([], arguments);
        });
    },

    _getDroppedFiles: function (dataTransfer) {
      // eslint-disable-next-line no-param-reassign
      dataTransfer = dataTransfer || {};
      var items = dataTransfer.items;
      if (
        items &&
        items.length &&
        (items[0].webkitGetAsEntry || items[0].getAsEntry)
      ) {
        return this._handleFileTreeEntries(
          $.map(items, function (item) {
            var entry;
            if (item.webkitGetAsEntry) {
              entry = item.webkitGetAsEntry();
              if (entry) {
                // Workaround for Chrome bug #149735:
                entry._file = item.getAsFile();
              }
              return entry;
            }
            return item.getAsEntry();
          })
        );
      }
      return $.Deferred().resolve($.makeArray(dataTransfer.files)).promise();
    },

    _getSingleFileInputFiles: function (fileInput) {
      // eslint-disable-next-line no-param-reassign
      fileInput = $(fileInput);
      var entries =
          fileInput.prop('webkitEntries') || fileInput.prop('entries'),
        files,
        value;
      if (entries && entries.length) {
        return this._handleFileTreeEntries(entries);
      }
      files = $.makeArray(fileInput.prop('files'));
      if (!files.length) {
        value = fileInput.prop('value');
        if (!value) {
          return $.Deferred().resolve([]).promise();
        }
        // If the files property is not available, the browser does not
        // support the File API and we add a pseudo File object with
        // the input value as name with path information removed:
        files = [{ name: value.replace(/^.*\\/, '') }];
      } else if (files[0].name === undefined && files[0].fileName) {
        // File normalization for Safari 4 and Firefox 3:
        $.each(files, function (index, file) {
          file.name = file.fileName;
          file.size = file.fileSize;
        });
      }
      return $.Deferred().resolve(files).promise();
    },

    _getFileInputFiles: function (fileInput) {
      if (!(fileInput instanceof $) || fileInput.length === 1) {
        return this._getSingleFileInputFiles(fileInput);
      }
      return $.when
        .apply($, $.map(fileInput, this._getSingleFileInputFiles))
        .then(function () {
          return Array.prototype.concat.apply([], arguments);
        });
    },

    _onChange: function (e) {
      var that = this,
        data = {
          fileInput: $(e.target),
          form: $(e.target.form)
        };
      this._getFileInputFiles(data.fileInput).always(function (files) {
        data.files = files;
        if (that.options.replaceFileInput) {
          that._replaceFileInput(data);
        }
        if (
          that._trigger(
            'change',
            $.Event('change', { delegatedEvent: e }),
            data
          ) !== false
        ) {
          that._onAdd(e, data);
        }
      });
    },

    _onPaste: function (e) {
      var items =
          e.originalEvent &&
          e.originalEvent.clipboardData &&
          e.originalEvent.clipboardData.items,
        data = { files: [] };
      if (items && items.length) {
        $.each(items, function (index, item) {
          var file = item.getAsFile && item.getAsFile();
          if (file) {
            data.files.push(file);
          }
        });
        if (
          this._trigger(
            'paste',
            $.Event('paste', { delegatedEvent: e }),
            data
          ) !== false
        ) {
          this._onAdd(e, data);
        }
      }
    },

    _onDrop: function (e) {
      e.dataTransfer = e.originalEvent && e.originalEvent.dataTransfer;
      var that = this,
        dataTransfer = e.dataTransfer,
        data = {};
      if (dataTransfer && dataTransfer.files && dataTransfer.files.length) {
        e.preventDefault();
        this._getDroppedFiles(dataTransfer).always(function (files) {
          data.files = files;
          if (
            that._trigger(
              'drop',
              $.Event('drop', { delegatedEvent: e }),
              data
            ) !== false
          ) {
            that._onAdd(e, data);
          }
        });
      }
    },

    _onDragOver: getDragHandler('dragover'),

    _onDragEnter: getDragHandler('dragenter'),

    _onDragLeave: getDragHandler('dragleave'),

    _initEventHandlers: function () {
      if (this._isXHRUpload(this.options)) {
        this._on(this.options.dropZone, {
          dragover: this._onDragOver,
          drop: this._onDrop,
          // event.preventDefault() on dragenter is required for IE10+:
          dragenter: this._onDragEnter,
          // dragleave is not required, but added for completeness:
          dragleave: this._onDragLeave
        });
        this._on(this.options.pasteZone, {
          paste: this._onPaste
        });
      }
      if ($.support.fileInput) {
        this._on(this.options.fileInput, {
          change: this._onChange
        });
      }
    },

    _destroyEventHandlers: function () {
      this._off(this.options.dropZone, 'dragenter dragleave dragover drop');
      this._off(this.options.pasteZone, 'paste');
      this._off(this.options.fileInput, 'change');
    },

    _destroy: function () {
      this._destroyEventHandlers();
    },

    _setOption: function (key, value) {
      var reinit = $.inArray(key, this._specialOptions) !== -1;
      if (reinit) {
        this._destroyEventHandlers();
      }
      this._super(key, value);
      if (reinit) {
        this._initSpecialOptions();
        this._initEventHandlers();
      }
    },

    _initSpecialOptions: function () {
      var options = this.options;
      if (options.fileInput === undefined) {
        options.fileInput = this.element.is('input[type="file"]')
          ? this.element
          : this.element.find('input[type="file"]');
      } else if (!(options.fileInput instanceof $)) {
        options.fileInput = $(options.fileInput);
      }
      if (!(options.dropZone instanceof $)) {
        options.dropZone = $(options.dropZone);
      }
      if (!(options.pasteZone instanceof $)) {
        options.pasteZone = $(options.pasteZone);
      }
    },

    _getRegExp: function (str) {
      var parts = str.split('/'),
        modifiers = parts.pop();
      parts.shift();
      return new RegExp(parts.join('/'), modifiers);
    },

    _isRegExpOption: function (key, value) {
      return (
        key !== 'url' &&
        $.type(value) === 'string' &&
        /^\/.*\/[igm]{0,3}$/.test(value)
      );
    },

    _initDataAttributes: function () {
      var that = this,
        options = this.options,
        data = this.element.data();
      // Initialize options set via HTML5 data-attributes:
      $.each(this.element[0].attributes, function (index, attr) {
        var key = attr.name.toLowerCase(),
          value;
        if (/^data-/.test(key)) {
          // Convert hyphen-ated key to camelCase:
          key = key.slice(5).replace(/-[a-z]/g, function (str) {
            return str.charAt(1).toUpperCase();
          });
          value = data[key];
          if (that._isRegExpOption(key, value)) {
            value = that._getRegExp(value);
          }
          options[key] = value;
        }
      });
    },

    _create: function () {
      this._initDataAttributes();
      this._initSpecialOptions();
      this._slots = [];
      this._sequence = this._getXHRPromise(true);
      this._sending = this._active = 0;
      this._initProgressObject(this);
      this._initEventHandlers();
    },

    // This method is exposed to the widget API and allows to query
    // the number of active uploads:
    active: function () {
      return this._active;
    },

    // This method is exposed to the widget API and allows to query
    // the widget upload progress.
    // It returns an object with loaded, total and bitrate properties
    // for the running uploads:
    progress: function () {
      return this._progress;
    },

    // This method is exposed to the widget API and allows adding files
    // using the fileupload API. The data parameter accepts an object which
    // must have a files property and can contain additional options:
    // .fileupload('add', {files: filesList});
    add: function (data) {
      var that = this;
      if (!data || this.options.disabled) {
        return;
      }
      if (data.fileInput && !data.files) {
        this._getFileInputFiles(data.fileInput).always(function (files) {
          data.files = files;
          that._onAdd(null, data);
        });
      } else {
        data.files = $.makeArray(data.files);
        this._onAdd(null, data);
      }
    },

    // This method is exposed to the widget API and allows sending files
    // using the fileupload API. The data parameter accepts an object which
    // must have a files or fileInput property and can contain additional options:
    // .fileupload('send', {files: filesList});
    // The method returns a Promise object for the file upload call.
    send: function (data) {
      if (data && !this.options.disabled) {
        if (data.fileInput && !data.files) {
          var that = this,
            dfd = $.Deferred(),
            promise = dfd.promise(),
            jqXHR,
            aborted;
          promise.abort = function () {
            aborted = true;
            if (jqXHR) {
              return jqXHR.abort();
            }
            dfd.reject(null, 'abort', 'abort');
            return promise;
          };
          this._getFileInputFiles(data.fileInput).always(function (files) {
            if (aborted) {
              return;
            }
            if (!files.length) {
              dfd.reject();
              return;
            }
            data.files = files;
            jqXHR = that._onSend(null, data);
            jqXHR.then(
              function (result, textStatus, jqXHR) {
                dfd.resolve(result, textStatus, jqXHR);
              },
              function (jqXHR, textStatus, errorThrown) {
                dfd.reject(jqXHR, textStatus, errorThrown);
              }
            );
          });
          return this._enhancePromise(promise);
        }
        data.files = $.makeArray(data.files);
        if (data.files.length) {
          return this._onSend(null, data);
        }
      }
      return this._getXHRPromise(false, data && data.context);
    }
  });
});
/*
 * jQuery Iframe Transport Plugin
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2011, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * https://opensource.org/licenses/MIT
 */

/* global define, require */


(function (factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    // Register as an anonymous AMD module:
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node/CommonJS:
    factory(require('jquery'));
  } else {
    // Browser globals:
    factory(window.jQuery);
  }
})(function ($) {
  'use strict';

  // Helper variable to create unique names for the transport iframes:
  var counter = 0,
    jsonAPI = $,
    jsonParse = 'parseJSON';

  if ('JSON' in window && 'parse' in JSON) {
    jsonAPI = JSON;
    jsonParse = 'parse';
  }

  // The iframe transport accepts four additional options:
  // options.fileInput: a jQuery collection of file input fields
  // options.paramName: the parameter name for the file form data,
  //  overrides the name property of the file input field(s),
  //  can be a string or an array of strings.
  // options.formData: an array of objects with name and value properties,
  //  equivalent to the return data of .serializeArray(), e.g.:
  //  [{name: 'a', value: 1}, {name: 'b', value: 2}]
  // options.initialIframeSrc: the URL of the initial iframe src,
  //  by default set to "javascript:false;"
  $.ajaxTransport('iframe', function (options) {
    if (options.async) {
      // javascript:false as initial iframe src
      // prevents warning popups on HTTPS in IE6:
      // eslint-disable-next-line no-script-url
      var initialIframeSrc = options.initialIframeSrc || 'javascript:false;',
        form,
        iframe,
        addParamChar;
      return {
        send: function (_, completeCallback) {
          form = $('<form style="display:none;"></form>');
          form.attr('accept-charset', options.formAcceptCharset);
          addParamChar = /\?/.test(options.url) ? '&' : '?';
          // XDomainRequest only supports GET and POST:
          if (options.type === 'DELETE') {
            options.url = options.url + addParamChar + '_method=DELETE';
            options.type = 'POST';
          } else if (options.type === 'PUT') {
            options.url = options.url + addParamChar + '_method=PUT';
            options.type = 'POST';
          } else if (options.type === 'PATCH') {
            options.url = options.url + addParamChar + '_method=PATCH';
            options.type = 'POST';
          }
          // IE versions below IE8 cannot set the name property of
          // elements that have already been added to the DOM,
          // so we set the name along with the iframe HTML markup:
          counter += 1;
          iframe = $(
            '<iframe src="' +
              initialIframeSrc +
              '" name="iframe-transport-' +
              counter +
              '"></iframe>'
          ).on('load', function () {
            var fileInputClones,
              paramNames = $.isArray(options.paramName)
                ? options.paramName
                : [options.paramName];
            iframe.off('load').on('load', function () {
              var response;
              // Wrap in a try/catch block to catch exceptions thrown
              // when trying to access cross-domain iframe contents:
              try {
                response = iframe.contents();
                // Google Chrome and Firefox do not throw an
                // exception when calling iframe.contents() on
                // cross-domain requests, so we unify the response:
                if (!response.length || !response[0].firstChild) {
                  throw new Error();
                }
              } catch (e) {
                response = undefined;
              }
              // The complete callback returns the
              // iframe content document as response object:
              completeCallback(200, 'success', { iframe: response });
              // Fix for IE endless progress bar activity bug
              // (happens on form submits to iframe targets):
              $('<iframe src="' + initialIframeSrc + '"></iframe>').appendTo(
                form
              );
              window.setTimeout(function () {
                // Removing the form in a setTimeout call
                // allows Chrome's developer tools to display
                // the response result
                form.remove();
              }, 0);
            });
            form
              .prop('target', iframe.prop('name'))
              .prop('action', options.url)
              .prop('method', options.type);
            if (options.formData) {
              $.each(options.formData, function (index, field) {
                $('<input type="hidden"/>')
                  .prop('name', field.name)
                  .val(field.value)
                  .appendTo(form);
              });
            }
            if (
              options.fileInput &&
              options.fileInput.length &&
              options.type === 'POST'
            ) {
              fileInputClones = options.fileInput.clone();
              // Insert a clone for each file input field:
              options.fileInput.after(function (index) {
                return fileInputClones[index];
              });
              if (options.paramName) {
                options.fileInput.each(function (index) {
                  $(this).prop('name', paramNames[index] || options.paramName);
                });
              }
              // Appending the file input fields to the hidden form
              // removes them from their original location:
              form
                .append(options.fileInput)
                .prop('enctype', 'multipart/form-data')
                // enctype must be set as encoding for IE:
                .prop('encoding', 'multipart/form-data');
              // Remove the HTML5 form attribute from the input(s):
              options.fileInput.removeAttr('form');
            }
            form.submit();
            // Insert the file input fields at their original location
            // by replacing the clones with the originals:
            if (fileInputClones && fileInputClones.length) {
              options.fileInput.each(function (index, input) {
                var clone = $(fileInputClones[index]);
                // Restore the original name and form properties:
                $(input)
                  .prop('name', clone.prop('name'))
                  .attr('form', clone.attr('form'));
                clone.replaceWith(input);
              });
            }
          });
          form.append(iframe).appendTo(document.body);
        },
        abort: function () {
          if (iframe) {
            // javascript:false as iframe src aborts the request
            // and prevents warning popups on HTTPS in IE6.
            iframe.off('load').prop('src', initialIframeSrc);
          }
          if (form) {
            form.remove();
          }
        }
      };
    }
  });

  // The iframe transport returns the iframe content document as response.
  // The following adds converters from iframe to text, json, html, xml
  // and script.
  // Please note that the Content-Type for JSON responses has to be text/plain
  // or text/html, if the browser doesn't include application/json in the
  // Accept header, else IE will show a download dialog.
  // The Content-Type for XML responses on the other hand has to be always
  // application/xml or text/xml, so IE properly parses the XML response.
  // See also
  // https://github.com/blueimp/jQuery-File-Upload/wiki/Setup#content-type-negotiation
  $.ajaxSetup({
    converters: {
      'iframe text': function (iframe) {
        return iframe && $(iframe[0].body).text();
      },
      'iframe json': function (iframe) {
        return iframe && jsonAPI[jsonParse]($(iframe[0].body).text());
      },
      'iframe html': function (iframe) {
        return iframe && $(iframe[0].body).html();
      },
      'iframe xml': function (iframe) {
        var xmlDoc = iframe && iframe[0];
        return xmlDoc && $.isXMLDoc(xmlDoc)
          ? xmlDoc
          : $.parseXML(
              (xmlDoc.XMLDocument && xmlDoc.XMLDocument.xml) ||
                $(xmlDoc.body).html()
            );
      },
      'iframe script': function (iframe) {
        return iframe && $.globalEval($(iframe[0].body).text());
      }
    }
  });
});
/*
 * jQuery File Upload Processing Plugin
 * https://github.com/blueimp/jQuery-File-Upload
 *
 * Copyright 2012, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * https://opensource.org/licenses/MIT
 */

/* global define, require */


(function (factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    // Register as an anonymous AMD module:
    define(['jquery', './jquery.fileupload'], factory);
  } else if (typeof exports === 'object') {
    // Node/CommonJS:
    factory(require('jquery'), require('./jquery.fileupload'));
  } else {
    // Browser globals:
    factory(window.jQuery);
  }
})(function ($) {
  'use strict';

  var originalAdd = $.blueimp.fileupload.prototype.options.add;

  // The File Upload Processing plugin extends the fileupload widget
  // with file processing functionality:
  $.widget('blueimp.fileupload', $.blueimp.fileupload, {
    options: {
      // The list of processing actions:
      processQueue: [
        /*
                {
                    action: 'log',
                    type: 'debug'
                }
                */
      ],
      add: function (e, data) {
        var $this = $(this);
        data.process(function () {
          return $this.fileupload('process', data);
        });
        originalAdd.call(this, e, data);
      }
    },

    processActions: {
      /*
            log: function (data, options) {
                console[options.type](
                    'Processing "' + data.files[data.index].name + '"'
                );
            }
            */
    },

    _processFile: function (data, originalData) {
      var that = this,
        // eslint-disable-next-line new-cap
        dfd = $.Deferred().resolveWith(that, [data]),
        chain = dfd.promise();
      this._trigger('process', null, data);
      $.each(data.processQueue, function (i, settings) {
        var func = function (data) {
          if (originalData.errorThrown) {
            // eslint-disable-next-line new-cap
            return $.Deferred().rejectWith(that, [originalData]).promise();
          }
          return that.processActions[settings.action].call(
            that,
            data,
            settings
          );
        };
        chain = chain.then(func, settings.always && func);
      });
      chain
        .done(function () {
          that._trigger('processdone', null, data);
          that._trigger('processalways', null, data);
        })
        .fail(function () {
          that._trigger('processfail', null, data);
          that._trigger('processalways', null, data);
        });
      return chain;
    },

    // Replaces the settings of each processQueue item that
    // are strings starting with an "@", using the remaining
    // substring as key for the option map,
    // e.g. "@autoUpload" is replaced with options.autoUpload:
    _transformProcessQueue: function (options) {
      var processQueue = [];
      $.each(options.processQueue, function () {
        var settings = {},
          action = this.action,
          prefix = this.prefix === true ? action : this.prefix;
        $.each(this, function (key, value) {
          if ($.type(value) === 'string' && value.charAt(0) === '@') {
            settings[key] =
              options[
                value.slice(1) ||
                  (prefix
                    ? prefix + key.charAt(0).toUpperCase() + key.slice(1)
                    : key)
              ];
          } else {
            settings[key] = value;
          }
        });
        processQueue.push(settings);
      });
      options.processQueue = processQueue;
    },

    // Returns the number of files currently in the processsing queue:
    processing: function () {
      return this._processing;
    },

    // Processes the files given as files property of the data parameter,
    // returns a Promise object that allows to bind callbacks:
    process: function (data) {
      var that = this,
        options = $.extend({}, this.options, data);
      if (options.processQueue && options.processQueue.length) {
        this._transformProcessQueue(options);
        if (this._processing === 0) {
          this._trigger('processstart');
        }
        $.each(data.files, function (index) {
          var opts = index ? $.extend({}, options) : options,
            func = function () {
              if (data.errorThrown) {
                // eslint-disable-next-line new-cap
                return $.Deferred().rejectWith(that, [data]).promise();
              }
              return that._processFile(opts, data);
            };
          opts.index = index;
          that._processing += 1;
          that._processingQueue = that._processingQueue
            .then(func, func)
            .always(function () {
              that._processing -= 1;
              if (that._processing === 0) {
                that._trigger('processstop');
              }
            });
        });
      }
      return this._processingQueue;
    },

    _create: function () {
      this._super();
      this._processing = 0;
      // eslint-disable-next-line new-cap
      this._processingQueue = $.Deferred().resolveWith(this).promise();
    }
  });
});
/*

	jQuery Tags Input Plugin 1.3.3

	Copyright (c) 2011 XOXCO, Inc

	Documentation for this plugin lives here:
	http://xoxco.com/clickable/jquery-tags-input

	Licensed under the MIT license:
	http://www.opensource.org/licenses/mit-license.php

	ben@xoxco.com

*/


(function($) {

	var delimiter = new Array();
	var tags_callbacks = new Array();
	$.fn.doAutosize = function(o){
	    var minWidth = $(this).data('minwidth'),
	        maxWidth = $(this).data('maxwidth'),
	        val = '',
	        input = $(this),
	        testSubject = $('#'+$(this).data('tester_id'));

	    if (val === (val = input.val())) {return;}

	    // Enter new content into testSubject
	    var escaped = val.replace(/&/g, '&amp;').replace(/\s/g,' ').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	    testSubject.html(escaped);
	    // Calculate new width + whether to change
	    var testerWidth = testSubject.width(),
	        newWidth = (testerWidth + o.comfortZone) >= minWidth ? testerWidth + o.comfortZone : minWidth,
	        currentWidth = input.width(),
	        isValidWidthChange = (newWidth < currentWidth && newWidth >= minWidth)
	                             || (newWidth > minWidth && newWidth < maxWidth);

	    // Animate width
	    if (isValidWidthChange) {
	        input.width(newWidth);
	    }


  };
  $.fn.resetAutosize = function(options){
    // alert(JSON.stringify(options));
    var minWidth =  $(this).data('minwidth') || options.minInputWidth || $(this).width(),
        maxWidth = $(this).data('maxwidth') || options.maxInputWidth || ($(this).closest('.tagsinput').width() - options.inputPadding),
        val = '',
        input = $(this),
        testSubject = $('<tester/>').css({
            position: 'absolute',
            top: -9999,
            left: -9999,
            width: 'auto',
            fontSize: input.css('fontSize'),
            fontFamily: input.css('fontFamily'),
            fontWeight: input.css('fontWeight'),
            letterSpacing: input.css('letterSpacing'),
            whiteSpace: 'nowrap'
        }),
        testerId = $(this).attr('id')+'_autosize_tester';
    if(! $('#'+testerId).length > 0){
      testSubject.attr('id', testerId);
      testSubject.appendTo('body');
    }

    input.data('minwidth', minWidth);
    input.data('maxwidth', maxWidth);
    input.data('tester_id', testerId);
    input.css('width', minWidth);
  };

	$.fn.addTag = function(value,options) {
			options = jQuery.extend({focus:false,callback:true},options);
			this.each(function() {
				var id = $(this).attr('id');

				var tagslist = $(this).val().split(delimiter[id]);
				if (tagslist[0] == '') {
					tagslist = new Array();
				}

				value = jQuery.trim(value);

				if (options.unique) {
					var skipTag = $(this).tagExist(value);
					if(skipTag == true) {
					    //Marks fake input as not_valid to let styling it
    				    $('#'+id+'_tag').addClass('not_valid');
    				}
				} else {
					var skipTag = false;
				}

				if (value !='' && skipTag != true) {
                    $('<span>').addClass('tag').append(
                        $('<span>').text(value).append('&nbsp;&nbsp;'),
                        $('<a>', {
                            href  : '#',
                            title : 'Removing tag',
                            text  : 'x'
                        }).click(function () {
                            return $('#' + id).removeTag(escape(value));
                        })
                    ).insertBefore('#' + id + '_addTag');

					tagslist.push(value);

					$('#'+id+'_tag').val('');
					if (options.focus) {
						$('#'+id+'_tag').focus();
					} else {
						$('#'+id+'_tag').blur();
					}

					$.fn.tagsInput.updateTagsField(this,tagslist);

					if (options.callback && tags_callbacks[id] && tags_callbacks[id]['onAddTag']) {
						var f = tags_callbacks[id]['onAddTag'];
						f.call(this, value);
					}
					if(tags_callbacks[id] && tags_callbacks[id]['onChange'])
					{
						var i = tagslist.length;
						var f = tags_callbacks[id]['onChange'];
						f.call(this, $(this), tagslist[i-1]);
					}
				}

			});

			return false;
		};

	$.fn.removeTag = function(value) {
			value = unescape(value);
			this.each(function() {
				var id = $(this).attr('id');

				var old = $(this).val().split(delimiter[id]);

				$('#'+id+'_tagsinput .tag').remove();
				str = '';
				for (i=0; i< old.length; i++) {
					if (old[i]!=value) {
						str = str + delimiter[id] +old[i];
					}
				}

				$.fn.tagsInput.importTags(this,str);

				if (tags_callbacks[id] && tags_callbacks[id]['onRemoveTag']) {
					var f = tags_callbacks[id]['onRemoveTag'];
					f.call(this, value);
				}
			});

			return false;
		};

	$.fn.tagExist = function(val) {
		var id = $(this).attr('id');
		var tagslist = $(this).val().split(delimiter[id]);
		return (jQuery.inArray(val, tagslist) >= 0); //true when tag exists, false when not
	};

   // clear all existing tags and import new ones from a string
   $.fn.importTags = function(str) {
      var id = $(this).attr('id');
      $('#'+id+'_tagsinput .tag').remove();
      $.fn.tagsInput.importTags(this,str);
   }

	$.fn.tagsInput = function(options) {
    var settings = jQuery.extend({
      interactive:true,
      defaultText:'add a tag',
      minChars:0,
      width:'300px',
      height:'100px',
      autocomplete: {selectFirst: false },
      hide:true,
      delimiter: ',',
      unique:true,
      removeWithBackspace:true,
      placeholderColor:'#666666',
      autosize: true,
      comfortZone: 20,
      inputPadding: 6*2
    },options);

    	var uniqueIdCounter = 0;

		this.each(function() {
         // If we have already initialized the field, do not do it again
         if (typeof $(this).attr('data-tagsinput-init') !== 'undefined') {
            return;
         }

         // Mark the field as having been initialized
         $(this).attr('data-tagsinput-init', true);

			if (settings.hide) {
				$(this).hide();
			}
			var id = $(this).attr('id');
			if (!id || delimiter[$(this).attr('id')]) {
				id = $(this).attr('id', 'tags' + new Date().getTime() + (uniqueIdCounter++)).attr('id');
			}

			var data = jQuery.extend({
				pid:id,
				real_input: '#'+id,
				holder: '#'+id+'_tagsinput',
				input_wrapper: '#'+id+'_addTag',
				fake_input: '#'+id+'_tag'
			},settings);

			delimiter[id] = data.delimiter;

			if (settings.onAddTag || settings.onRemoveTag || settings.onChange) {
				tags_callbacks[id] = new Array();
				tags_callbacks[id]['onAddTag'] = settings.onAddTag;
				tags_callbacks[id]['onRemoveTag'] = settings.onRemoveTag;
				tags_callbacks[id]['onChange'] = settings.onChange;
			}

			var markup = '<div id="'+id+'_tagsinput" class="tagsinput"><div id="'+id+'_addTag">';

			if (settings.interactive) {
				markup = markup + '<input id="'+id+'_tag" value="" data-default="'+settings.defaultText+'" />';
			}

			markup = markup + '</div><div class="tags_clear"></div></div>';

			$(markup).insertAfter(this);

			$(data.holder).css('width',settings.width);
			$(data.holder).css('min-height',settings.height);
			$(data.holder).css('height',settings.height);

			if ($(data.real_input).val()!='') {
				$.fn.tagsInput.importTags($(data.real_input),$(data.real_input).val());
			}
			if (settings.interactive) {
				$(data.fake_input).val($(data.fake_input).attr('data-default'));
				$(data.fake_input).css('color',settings.placeholderColor);
		        $(data.fake_input).resetAutosize(settings);

				$(data.holder).bind('click',data,function(event) {
					$(event.data.fake_input).focus();
				});

				$(data.fake_input).bind('focus',data,function(event) {
					if ($(event.data.fake_input).val()==$(event.data.fake_input).attr('data-default')) {
						$(event.data.fake_input).val('');
					}
					$(event.data.fake_input).css('color','#000000');
				});

				if (settings.autocomplete_url != undefined) {
					autocomplete_options = {source: settings.autocomplete_url};
					for (attrname in settings.autocomplete) {
						autocomplete_options[attrname] = settings.autocomplete[attrname];
					}

					if (jQuery.Autocompleter !== undefined) {
						$(data.fake_input).autocomplete(settings.autocomplete_url, settings.autocomplete);
						$(data.fake_input).bind('result',data,function(event,data,formatted) {
							if (data) {
								$('#'+id).addTag(data[0] + "",{focus:true,unique:(settings.unique)});
							}
					  	});
					} else if (jQuery.ui.autocomplete !== undefined) {
						$(data.fake_input).autocomplete(autocomplete_options);
						$(data.fake_input).bind('autocompleteselect',data,function(event,ui) {
							$(event.data.real_input).addTag(ui.item.value,{focus:true,unique:(settings.unique)});
							return false;
						});
					}


				} else {
						// if a user tabs out of the field, create a new tag
						// this is only available if autocomplete is not used.
						$(data.fake_input).bind('blur',data,function(event) {
							var d = $(this).attr('data-default');
							if ($(event.data.fake_input).val()!='' && $(event.data.fake_input).val()!=d) {
								if( (event.data.minChars <= $(event.data.fake_input).val().length) && (!event.data.maxChars || (event.data.maxChars >= $(event.data.fake_input).val().length)) )
									$(event.data.real_input).addTag($(event.data.fake_input).val(),{focus:true,unique:(settings.unique)});
							} else {
								$(event.data.fake_input).val($(event.data.fake_input).attr('data-default'));
								$(event.data.fake_input).css('color',settings.placeholderColor);
							}
							return false;
						});

				}
				// if user types a default delimiter like comma,semicolon and then create a new tag
				$(data.fake_input).bind('keypress',data,function(event) {
					if (_checkDelimiter(event)) {
					    event.preventDefault();
						if( (event.data.minChars <= $(event.data.fake_input).val().length) && (!event.data.maxChars || (event.data.maxChars >= $(event.data.fake_input).val().length)) )
							$(event.data.real_input).addTag($(event.data.fake_input).val(),{focus:true,unique:(settings.unique)});
					  	$(event.data.fake_input).resetAutosize(settings);
						return false;
					} else if (event.data.autosize) {
			            $(event.data.fake_input).doAutosize(settings);

          			}
				});
				//Delete last tag on backspace
				data.removeWithBackspace && $(data.fake_input).bind('keydown', function(event)
				{
					if(event.keyCode == 8 && $(this).val() == '')
					{
						 event.preventDefault();
						 var last_tag = $(this).closest('.tagsinput').find('.tag:last').text();
						 var id = $(this).attr('id').replace(/_tag$/, '');
						 last_tag = last_tag.replace(/[\s]+x$/, '');
						 $('#' + id).removeTag(escape(last_tag));
						 $(this).trigger('focus');
					}
				});
				$(data.fake_input).blur();

				//Removes the not_valid class when user changes the value of the fake input
				if(data.unique) {
				    $(data.fake_input).keydown(function(event){
				        if(event.keyCode == 8 || String.fromCharCode(event.which).match(/\w+|[áéíóúÁÉÍÓÚñÑ,/]+/)) {
				            $(this).removeClass('not_valid');
				        }
				    });
				}
			} // if settings.interactive
		});

		return this;

	};

	$.fn.tagsInput.updateTagsField = function(obj,tagslist) {
		var id = $(obj).attr('id');
		$(obj).val(tagslist.join(delimiter[id]));
	};

	$.fn.tagsInput.importTags = function(obj,val) {
		$(obj).val('');
		var id = $(obj).attr('id');
		var tags = val.split(delimiter[id]);
		for (i=0; i<tags.length; i++) {
			$(obj).addTag(tags[i],{focus:false,callback:false});
		}
		if(tags_callbacks[id] && tags_callbacks[id]['onChange'])
		{
			var f = tags_callbacks[id]['onChange'];
			f.call(obj, obj, tags[i]);
		}
	};

   /**
     * check delimiter Array
     * @param event
     * @returns {boolean}
     * @private
     */
   var _checkDelimiter = function(event){
      var found = false;
      if (event.which == 13) {
         return true;
      }

      if (typeof event.data.delimiter === 'string') {
         if (event.which == event.data.delimiter.charCodeAt(0)) {
            found = true;
         }
      } else {
         $.each(event.data.delimiter, function(index, delimiter) {
            if (event.which == delimiter.charCodeAt(0)) {
               found = true;
            }
         });
      }

      return found;
   }
})(jQuery);
/*
 * HTML5 Sortable jQuery Plugin
 * http://farhadi.ir/projects/html5sortable
 * 
 * Copyright 2012, Ali Farhadi
 * Released under the MIT license.
 */

(function($) {
var dragging, placeholders = $();
$.fn.sortable = function(options) {
	var method = String(options);
	options = $.extend({
		connectWith: false
	}, options);
	return this.each(function() {
		if (/^enable|disable|destroy$/.test(method)) {
			var items = $(this).children($(this).data('items')).attr('draggable', method == 'enable');
			if (method == 'destroy') {
				items.add(this).removeData('connectWith items')
					.off('dragstart.h5s dragend.h5s selectstart.h5s dragover.h5s dragenter.h5s drop.h5s');
			}
			return;
		}
		var isHandle, index, items = $(this).children(options.items);
		var placeholder = $('<' + (/^ul|ol$/i.test(this.tagName) ? 'li' : 'div') + ' class="sortable-placeholder">');
		items.find(options.handle).mousedown(function() {
			isHandle = true;
		}).mouseup(function() {
			isHandle = false;
		});
		$(this).data('items', options.items)
		placeholders = placeholders.add(placeholder);
		if (options.connectWith) {
			$(options.connectWith).add(this).data('connectWith', options.connectWith);
		}
		items.attr('draggable', 'true').on('dragstart.h5s', function(e) {
			if (options.handle && !isHandle) {
				return false;
			}
			isHandle = false;
			var dt = e.originalEvent.dataTransfer;
			dt.effectAllowed = 'move';
			dt.setData('Text', 'dummy');
			index = (dragging = $(this)).addClass('sortable-dragging').index();
		}).on('dragend.h5s', function() {
			if (!dragging) {
				return;
			}
			dragging.removeClass('sortable-dragging').show();
			placeholders.detach();
			if (index != dragging.index()) {
				dragging.parent().trigger('sortupdate', {item: dragging});
			}
			dragging = null;
		}).not('a[href], img').on('selectstart.h5s', function() {
			this.dragDrop && this.dragDrop();
			return false;
		}).end().add([this, placeholder]).on('dragover.h5s dragenter.h5s drop.h5s', function(e) {
			if (!items.is(dragging) && options.connectWith !== $(dragging).parent().data('connectWith')) {
				return true;
			}
			if (e.type == 'drop') {
				e.stopPropagation();
				placeholders.filter(':visible').after(dragging);
				dragging.trigger('dragend.h5s');
				return false;
			}
			e.preventDefault();
			e.originalEvent.dataTransfer.dropEffect = 'move';
			if (items.is(this)) {
				if (options.forcePlaceholderSize) {
					placeholder.height(dragging.outerHeight());
				}
				dragging.hide();
				$(this)[placeholder.index() < $(this).index() ? 'after' : 'before'](placeholder);
				placeholders.not(placeholder).detach();
			} else if (!placeholders.is(this) && !$(this).children(options.items).length) {
				placeholders.detach();
				$(this).append(placeholder);
			}
			return false;
		});
	});
};
})(jQuery);
/**
 * @license
 * Lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash include="escapeRegExp,each,filter,map,range,first,isEmpty,chain,extend,every,omit,merge,union,sortBy,uniq,intersection,reject,compact,reduce,debounce,throttle,values,pick,keys,flatten,min,max,isArray,delay,isString,isEqual,without,invoke,clone,findIndex,find,groupBy" minus="template" -d -o node_modules/lodash.js`
 * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

;(function() {

  /** Used as a safe reference for `undefined` in pre-ES5 environments. */
  var undefined;

  /** Used as the semantic version number. */
  var VERSION = '4.17.21';

  /** Used as the size to enable large array optimizations. */
  var LARGE_ARRAY_SIZE = 200;

  /** Error message constants. */
  var FUNC_ERROR_TEXT = 'Expected a function';

  /** Used to stand-in for `undefined` hash values. */
  var HASH_UNDEFINED = '__lodash_hash_undefined__';

  /** Used as the maximum memoize cache size. */
  var MAX_MEMOIZE_SIZE = 500;

  /** Used as the internal argument placeholder. */
  var PLACEHOLDER = '__lodash_placeholder__';

  /** Used to compose bitmasks for cloning. */
  var CLONE_DEEP_FLAG = 1,
      CLONE_FLAT_FLAG = 2,
      CLONE_SYMBOLS_FLAG = 4;

  /** Used to compose bitmasks for value comparisons. */
  var COMPARE_PARTIAL_FLAG = 1,
      COMPARE_UNORDERED_FLAG = 2;

  /** Used to compose bitmasks for function metadata. */
  var WRAP_BIND_FLAG = 1,
      WRAP_BIND_KEY_FLAG = 2,
      WRAP_CURRY_BOUND_FLAG = 4,
      WRAP_CURRY_FLAG = 8,
      WRAP_CURRY_RIGHT_FLAG = 16,
      WRAP_PARTIAL_FLAG = 32,
      WRAP_PARTIAL_RIGHT_FLAG = 64,
      WRAP_ARY_FLAG = 128,
      WRAP_REARG_FLAG = 256,
      WRAP_FLIP_FLAG = 512;

  /** Used to detect hot functions by number of calls within a span of milliseconds. */
  var HOT_COUNT = 800,
      HOT_SPAN = 16;

  /** Used to indicate the type of lazy iteratees. */
  var LAZY_FILTER_FLAG = 1,
      LAZY_MAP_FLAG = 2,
      LAZY_WHILE_FLAG = 3;

  /** Used as references for various `Number` constants. */
  var INFINITY = 1 / 0,
      MAX_SAFE_INTEGER = 9007199254740991,
      MAX_INTEGER = 1.7976931348623157e+308,
      NAN = 0 / 0;

  /** Used as references for the maximum length and index of an array. */
  var MAX_ARRAY_LENGTH = 4294967295;

  /** Used to associate wrap methods with their bit flags. */
  var wrapFlags = [
    ['ary', WRAP_ARY_FLAG],
    ['bind', WRAP_BIND_FLAG],
    ['bindKey', WRAP_BIND_KEY_FLAG],
    ['curry', WRAP_CURRY_FLAG],
    ['curryRight', WRAP_CURRY_RIGHT_FLAG],
    ['flip', WRAP_FLIP_FLAG],
    ['partial', WRAP_PARTIAL_FLAG],
    ['partialRight', WRAP_PARTIAL_RIGHT_FLAG],
    ['rearg', WRAP_REARG_FLAG]
  ];

  /** `Object#toString` result references. */
  var argsTag = '[object Arguments]',
      arrayTag = '[object Array]',
      asyncTag = '[object AsyncFunction]',
      boolTag = '[object Boolean]',
      dateTag = '[object Date]',
      errorTag = '[object Error]',
      funcTag = '[object Function]',
      genTag = '[object GeneratorFunction]',
      mapTag = '[object Map]',
      numberTag = '[object Number]',
      nullTag = '[object Null]',
      objectTag = '[object Object]',
      promiseTag = '[object Promise]',
      proxyTag = '[object Proxy]',
      regexpTag = '[object RegExp]',
      setTag = '[object Set]',
      stringTag = '[object String]',
      symbolTag = '[object Symbol]',
      undefinedTag = '[object Undefined]',
      weakMapTag = '[object WeakMap]';

  var arrayBufferTag = '[object ArrayBuffer]',
      dataViewTag = '[object DataView]',
      float32Tag = '[object Float32Array]',
      float64Tag = '[object Float64Array]',
      int8Tag = '[object Int8Array]',
      int16Tag = '[object Int16Array]',
      int32Tag = '[object Int32Array]',
      uint8Tag = '[object Uint8Array]',
      uint8ClampedTag = '[object Uint8ClampedArray]',
      uint16Tag = '[object Uint16Array]',
      uint32Tag = '[object Uint32Array]';

  /** Used to match property names within property paths. */
  var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
      reIsPlainProp = /^\w*$/,
      rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

  /**
   * Used to match `RegExp`
   * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
   */
  var reRegExpChar = /[\\^$.*+?()[\]{}|]/g,
      reHasRegExpChar = RegExp(reRegExpChar.source);

  /** Used to match leading whitespace. */
  var reTrimStart = /^\s+/;

  /** Used to match a single whitespace character. */
  var reWhitespace = /\s/;

  /** Used to match wrap detail comments. */
  var reWrapComment = /\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/,
      reWrapDetails = /\{\n\/\* \[wrapped with (.+)\] \*/,
      reSplitDetails = /,? & /;

  /** Used to match backslashes in property paths. */
  var reEscapeChar = /\\(\\)?/g;

  /** Used to match `RegExp` flags from their coerced string values. */
  var reFlags = /\w*$/;

  /** Used to detect bad signed hexadecimal string values. */
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

  /** Used to detect binary string values. */
  var reIsBinary = /^0b[01]+$/i;

  /** Used to detect host constructors (Safari). */
  var reIsHostCtor = /^\[object .+?Constructor\]$/;

  /** Used to detect octal string values. */
  var reIsOctal = /^0o[0-7]+$/i;

  /** Used to detect unsigned integer values. */
  var reIsUint = /^(?:0|[1-9]\d*)$/;

  /** Used to compose unicode character classes. */
  var rsAstralRange = '\\ud800-\\udfff',
      rsComboMarksRange = '\\u0300-\\u036f',
      reComboHalfMarksRange = '\\ufe20-\\ufe2f',
      rsComboSymbolsRange = '\\u20d0-\\u20ff',
      rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange,
      rsVarRange = '\\ufe0e\\ufe0f';

  /** Used to compose unicode capture groups. */
  var rsAstral = '[' + rsAstralRange + ']',
      rsCombo = '[' + rsComboRange + ']',
      rsFitz = '\\ud83c[\\udffb-\\udfff]',
      rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
      rsNonAstral = '[^' + rsAstralRange + ']',
      rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
      rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
      rsZWJ = '\\u200d';

  /** Used to compose unicode regexes. */
  var reOptMod = rsModifier + '?',
      rsOptVar = '[' + rsVarRange + ']?',
      rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
      rsSeq = rsOptVar + reOptMod + rsOptJoin,
      rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';

  /** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
  var reUnicode = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

  /** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
  var reHasUnicode = RegExp('[' + rsZWJ + rsAstralRange  + rsComboRange + rsVarRange + ']');

  /** Used to identify `toStringTag` values of typed arrays. */
  var typedArrayTags = {};
  typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
  typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
  typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
  typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
  typedArrayTags[uint32Tag] = true;
  typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
  typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
  typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
  typedArrayTags[errorTag] = typedArrayTags[funcTag] =
  typedArrayTags[mapTag] = typedArrayTags[numberTag] =
  typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
  typedArrayTags[setTag] = typedArrayTags[stringTag] =
  typedArrayTags[weakMapTag] = false;

  /** Used to identify `toStringTag` values supported by `_.clone`. */
  var cloneableTags = {};
  cloneableTags[argsTag] = cloneableTags[arrayTag] =
  cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] =
  cloneableTags[boolTag] = cloneableTags[dateTag] =
  cloneableTags[float32Tag] = cloneableTags[float64Tag] =
  cloneableTags[int8Tag] = cloneableTags[int16Tag] =
  cloneableTags[int32Tag] = cloneableTags[mapTag] =
  cloneableTags[numberTag] = cloneableTags[objectTag] =
  cloneableTags[regexpTag] = cloneableTags[setTag] =
  cloneableTags[stringTag] = cloneableTags[symbolTag] =
  cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
  cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
  cloneableTags[errorTag] = cloneableTags[funcTag] =
  cloneableTags[weakMapTag] = false;

  /** Built-in method references without a dependency on `root`. */
  var freeParseInt = parseInt;

  /** Detect free variable `global` from Node.js. */
  var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

  /** Detect free variable `self`. */
  var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

  /** Used as a reference to the global object. */
  var root = freeGlobal || freeSelf || Function('return this')();

  /** Detect free variable `exports`. */
  var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

  /** Detect free variable `module`. */
  var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

  /** Detect the popular CommonJS extension `module.exports`. */
  var moduleExports = freeModule && freeModule.exports === freeExports;

  /** Detect free variable `process` from Node.js. */
  var freeProcess = moduleExports && freeGlobal.process;

  /** Used to access faster Node.js helpers. */
  var nodeUtil = (function() {
    try {
      // Use `util.types` for Node.js 10+.
      var types = freeModule && freeModule.require && freeModule.require('util').types;

      if (types) {
        return types;
      }

      // Legacy `process.binding('util')` for Node.js < 10.
      return freeProcess && freeProcess.binding && freeProcess.binding('util');
    } catch (e) {}
  }());

  /* Node.js helper references. */
  var nodeIsMap = nodeUtil && nodeUtil.isMap,
      nodeIsSet = nodeUtil && nodeUtil.isSet,
      nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

  /*--------------------------------------------------------------------------*/

  /**
   * A faster alternative to `Function#apply`, this function invokes `func`
   * with the `this` binding of `thisArg` and the arguments of `args`.
   *
   * @private
   * @param {Function} func The function to invoke.
   * @param {*} thisArg The `this` binding of `func`.
   * @param {Array} args The arguments to invoke `func` with.
   * @returns {*} Returns the result of `func`.
   */
  function apply(func, thisArg, args) {
    switch (args.length) {
      case 0: return func.call(thisArg);
      case 1: return func.call(thisArg, args[0]);
      case 2: return func.call(thisArg, args[0], args[1]);
      case 3: return func.call(thisArg, args[0], args[1], args[2]);
    }
    return func.apply(thisArg, args);
  }

  /**
   * A specialized version of `baseAggregator` for arrays.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} setter The function to set `accumulator` values.
   * @param {Function} iteratee The iteratee to transform keys.
   * @param {Object} accumulator The initial aggregated object.
   * @returns {Function} Returns `accumulator`.
   */
  function arrayAggregator(array, setter, iteratee, accumulator) {
    var index = -1,
        length = array == null ? 0 : array.length;

    while (++index < length) {
      var value = array[index];
      setter(accumulator, value, iteratee(value), array);
    }
    return accumulator;
  }

  /**
   * A specialized version of `_.forEach` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns `array`.
   */
  function arrayEach(array, iteratee) {
    var index = -1,
        length = array == null ? 0 : array.length;

    while (++index < length) {
      if (iteratee(array[index], index, array) === false) {
        break;
      }
    }
    return array;
  }

  /**
   * A specialized version of `_.every` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {boolean} Returns `true` if all elements pass the predicate check,
   *  else `false`.
   */
  function arrayEvery(array, predicate) {
    var index = -1,
        length = array == null ? 0 : array.length;

    while (++index < length) {
      if (!predicate(array[index], index, array)) {
        return false;
      }
    }
    return true;
  }

  /**
   * A specialized version of `_.filter` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {Array} Returns the new filtered array.
   */
  function arrayFilter(array, predicate) {
    var index = -1,
        length = array == null ? 0 : array.length,
        resIndex = 0,
        result = [];

    while (++index < length) {
      var value = array[index];
      if (predicate(value, index, array)) {
        result[resIndex++] = value;
      }
    }
    return result;
  }

  /**
   * A specialized version of `_.includes` for arrays without support for
   * specifying an index to search from.
   *
   * @private
   * @param {Array} [array] The array to inspect.
   * @param {*} target The value to search for.
   * @returns {boolean} Returns `true` if `target` is found, else `false`.
   */
  function arrayIncludes(array, value) {
    var length = array == null ? 0 : array.length;
    return !!length && baseIndexOf(array, value, 0) > -1;
  }

  /**
   * This function is like `arrayIncludes` except that it accepts a comparator.
   *
   * @private
   * @param {Array} [array] The array to inspect.
   * @param {*} target The value to search for.
   * @param {Function} comparator The comparator invoked per element.
   * @returns {boolean} Returns `true` if `target` is found, else `false`.
   */
  function arrayIncludesWith(array, value, comparator) {
    var index = -1,
        length = array == null ? 0 : array.length;

    while (++index < length) {
      if (comparator(value, array[index])) {
        return true;
      }
    }
    return false;
  }

  /**
   * A specialized version of `_.map` for arrays without support for iteratee
   * shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   */
  function arrayMap(array, iteratee) {
    var index = -1,
        length = array == null ? 0 : array.length,
        result = Array(length);

    while (++index < length) {
      result[index] = iteratee(array[index], index, array);
    }
    return result;
  }

  /**
   * Appends the elements of `values` to `array`.
   *
   * @private
   * @param {Array} array The array to modify.
   * @param {Array} values The values to append.
   * @returns {Array} Returns `array`.
   */
  function arrayPush(array, values) {
    var index = -1,
        length = values.length,
        offset = array.length;

    while (++index < length) {
      array[offset + index] = values[index];
    }
    return array;
  }

  /**
   * A specialized version of `_.reduce` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {*} [accumulator] The initial value.
   * @param {boolean} [initAccum] Specify using the first element of `array` as
   *  the initial value.
   * @returns {*} Returns the accumulated value.
   */
  function arrayReduce(array, iteratee, accumulator, initAccum) {
    var index = -1,
        length = array == null ? 0 : array.length;

    if (initAccum && length) {
      accumulator = array[++index];
    }
    while (++index < length) {
      accumulator = iteratee(accumulator, array[index], index, array);
    }
    return accumulator;
  }

  /**
   * A specialized version of `_.some` for arrays without support for iteratee
   * shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {boolean} Returns `true` if any element passes the predicate check,
   *  else `false`.
   */
  function arraySome(array, predicate) {
    var index = -1,
        length = array == null ? 0 : array.length;

    while (++index < length) {
      if (predicate(array[index], index, array)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Converts an ASCII `string` to an array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the converted array.
   */
  function asciiToArray(string) {
    return string.split('');
  }

  /**
   * The base implementation of `_.findIndex` and `_.findLastIndex` without
   * support for iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {Function} predicate The function invoked per iteration.
   * @param {number} fromIndex The index to search from.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function baseFindIndex(array, predicate, fromIndex, fromRight) {
    var length = array.length,
        index = fromIndex + (fromRight ? 1 : -1);

    while ((fromRight ? index-- : ++index < length)) {
      if (predicate(array[index], index, array)) {
        return index;
      }
    }
    return -1;
  }

  /**
   * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} value The value to search for.
   * @param {number} fromIndex The index to search from.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function baseIndexOf(array, value, fromIndex) {
    return value === value
      ? strictIndexOf(array, value, fromIndex)
      : baseFindIndex(array, baseIsNaN, fromIndex);
  }

  /**
   * The base implementation of `_.isNaN` without support for number objects.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
   */
  function baseIsNaN(value) {
    return value !== value;
  }

  /**
   * The base implementation of `_.property` without support for deep paths.
   *
   * @private
   * @param {string} key The key of the property to get.
   * @returns {Function} Returns the new accessor function.
   */
  function baseProperty(key) {
    return function(object) {
      return object == null ? undefined : object[key];
    };
  }

  /**
   * The base implementation of `_.reduce` and `_.reduceRight`, without support
   * for iteratee shorthands, which iterates over `collection` using `eachFunc`.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {*} accumulator The initial value.
   * @param {boolean} initAccum Specify using the first or last element of
   *  `collection` as the initial value.
   * @param {Function} eachFunc The function to iterate over `collection`.
   * @returns {*} Returns the accumulated value.
   */
  function baseReduce(collection, iteratee, accumulator, initAccum, eachFunc) {
    eachFunc(collection, function(value, index, collection) {
      accumulator = initAccum
        ? (initAccum = false, value)
        : iteratee(accumulator, value, index, collection);
    });
    return accumulator;
  }

  /**
   * The base implementation of `_.sortBy` which uses `comparer` to define the
   * sort order of `array` and replaces criteria objects with their corresponding
   * values.
   *
   * @private
   * @param {Array} array The array to sort.
   * @param {Function} comparer The function to define sort order.
   * @returns {Array} Returns `array`.
   */
  function baseSortBy(array, comparer) {
    var length = array.length;

    array.sort(comparer);
    while (length--) {
      array[length] = array[length].value;
    }
    return array;
  }

  /**
   * The base implementation of `_.times` without support for iteratee shorthands
   * or max array length checks.
   *
   * @private
   * @param {number} n The number of times to invoke `iteratee`.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the array of results.
   */
  function baseTimes(n, iteratee) {
    var index = -1,
        result = Array(n);

    while (++index < n) {
      result[index] = iteratee(index);
    }
    return result;
  }

  /**
   * The base implementation of `_.trim`.
   *
   * @private
   * @param {string} string The string to trim.
   * @returns {string} Returns the trimmed string.
   */
  function baseTrim(string) {
    return string
      ? string.slice(0, trimmedEndIndex(string) + 1).replace(reTrimStart, '')
      : string;
  }

  /**
   * The base implementation of `_.unary` without support for storing metadata.
   *
   * @private
   * @param {Function} func The function to cap arguments for.
   * @returns {Function} Returns the new capped function.
   */
  function baseUnary(func) {
    return function(value) {
      return func(value);
    };
  }

  /**
   * The base implementation of `_.values` and `_.valuesIn` which creates an
   * array of `object` property values corresponding to the property names
   * of `props`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array} props The property names to get values for.
   * @returns {Object} Returns the array of property values.
   */
  function baseValues(object, props) {
    return arrayMap(props, function(key) {
      return object[key];
    });
  }

  /**
   * Checks if a `cache` value for `key` exists.
   *
   * @private
   * @param {Object} cache The cache to query.
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function cacheHas(cache, key) {
    return cache.has(key);
  }

  /**
   * Gets the number of `placeholder` occurrences in `array`.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} placeholder The placeholder to search for.
   * @returns {number} Returns the placeholder count.
   */
  function countHolders(array, placeholder) {
    var length = array.length,
        result = 0;

    while (length--) {
      if (array[length] === placeholder) {
        ++result;
      }
    }
    return result;
  }

  /**
   * Gets the value at `key` of `object`.
   *
   * @private
   * @param {Object} [object] The object to query.
   * @param {string} key The key of the property to get.
   * @returns {*} Returns the property value.
   */
  function getValue(object, key) {
    return object == null ? undefined : object[key];
  }

  /**
   * Checks if `string` contains Unicode symbols.
   *
   * @private
   * @param {string} string The string to inspect.
   * @returns {boolean} Returns `true` if a symbol is found, else `false`.
   */
  function hasUnicode(string) {
    return reHasUnicode.test(string);
  }

  /**
   * Converts `iterator` to an array.
   *
   * @private
   * @param {Object} iterator The iterator to convert.
   * @returns {Array} Returns the converted array.
   */
  function iteratorToArray(iterator) {
    var data,
        result = [];

    while (!(data = iterator.next()).done) {
      result.push(data.value);
    }
    return result;
  }

  /**
   * Converts `map` to its key-value pairs.
   *
   * @private
   * @param {Object} map The map to convert.
   * @returns {Array} Returns the key-value pairs.
   */
  function mapToArray(map) {
    var index = -1,
        result = Array(map.size);

    map.forEach(function(value, key) {
      result[++index] = [key, value];
    });
    return result;
  }

  /**
   * Creates a unary function that invokes `func` with its argument transformed.
   *
   * @private
   * @param {Function} func The function to wrap.
   * @param {Function} transform The argument transform.
   * @returns {Function} Returns the new function.
   */
  function overArg(func, transform) {
    return function(arg) {
      return func(transform(arg));
    };
  }

  /**
   * Replaces all `placeholder` elements in `array` with an internal placeholder
   * and returns an array of their indexes.
   *
   * @private
   * @param {Array} array The array to modify.
   * @param {*} placeholder The placeholder to replace.
   * @returns {Array} Returns the new array of placeholder indexes.
   */
  function replaceHolders(array, placeholder) {
    var index = -1,
        length = array.length,
        resIndex = 0,
        result = [];

    while (++index < length) {
      var value = array[index];
      if (value === placeholder || value === PLACEHOLDER) {
        array[index] = PLACEHOLDER;
        result[resIndex++] = index;
      }
    }
    return result;
  }

  /**
   * Converts `set` to an array of its values.
   *
   * @private
   * @param {Object} set The set to convert.
   * @returns {Array} Returns the values.
   */
  function setToArray(set) {
    var index = -1,
        result = Array(set.size);

    set.forEach(function(value) {
      result[++index] = value;
    });
    return result;
  }

  /**
   * A specialized version of `_.indexOf` which performs strict equality
   * comparisons of values, i.e. `===`.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} value The value to search for.
   * @param {number} fromIndex The index to search from.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function strictIndexOf(array, value, fromIndex) {
    var index = fromIndex - 1,
        length = array.length;

    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Converts `string` to an array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the converted array.
   */
  function stringToArray(string) {
    return hasUnicode(string)
      ? unicodeToArray(string)
      : asciiToArray(string);
  }

  /**
   * Used by `_.trim` and `_.trimEnd` to get the index of the last non-whitespace
   * character of `string`.
   *
   * @private
   * @param {string} string The string to inspect.
   * @returns {number} Returns the index of the last non-whitespace character.
   */
  function trimmedEndIndex(string) {
    var index = string.length;

    while (index-- && reWhitespace.test(string.charAt(index))) {}
    return index;
  }

  /**
   * Converts a Unicode `string` to an array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the converted array.
   */
  function unicodeToArray(string) {
    return string.match(reUnicode) || [];
  }

  /*--------------------------------------------------------------------------*/

  /** Used for built-in method references. */
  var arrayProto = Array.prototype,
      funcProto = Function.prototype,
      objectProto = Object.prototype;

  /** Used to detect overreaching core-js shims. */
  var coreJsData = root['__core-js_shared__'];

  /** Used to resolve the decompiled source of functions. */
  var funcToString = funcProto.toString;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /** Used to detect methods masquerading as native. */
  var maskSrcKey = (function() {
    var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
    return uid ? ('Symbol(src)_1.' + uid) : '';
  }());

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
   * of values.
   */
  var nativeObjectToString = objectProto.toString;

  /** Used to infer the `Object` constructor. */
  var objectCtorString = funcToString.call(Object);

  /** Used to detect if a method is native. */
  var reIsNative = RegExp('^' +
    funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
    .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
  );

  /** Built-in value references. */
  var Buffer = moduleExports ? root.Buffer : undefined,
      Symbol = root.Symbol,
      Uint8Array = root.Uint8Array,
      allocUnsafe = Buffer ? Buffer.allocUnsafe : undefined,
      getPrototype = overArg(Object.getPrototypeOf, Object),
      objectCreate = Object.create,
      propertyIsEnumerable = objectProto.propertyIsEnumerable,
      splice = arrayProto.splice,
      spreadableSymbol = Symbol ? Symbol.isConcatSpreadable : undefined,
      symIterator = Symbol ? Symbol.iterator : undefined,
      symToStringTag = Symbol ? Symbol.toStringTag : undefined;

  var defineProperty = (function() {
    try {
      var func = getNative(Object, 'defineProperty');
      func({}, '', {});
      return func;
    } catch (e) {}
  }());

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeCeil = Math.ceil,
      nativeGetSymbols = Object.getOwnPropertySymbols,
      nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined,
      nativeKeys = overArg(Object.keys, Object),
      nativeMax = Math.max,
      nativeMin = Math.min,
      nativeNow = Date.now,
      nativeReverse = arrayProto.reverse;

  /* Built-in method references that are verified to be native. */
  var DataView = getNative(root, 'DataView'),
      Map = getNative(root, 'Map'),
      Promise = getNative(root, 'Promise'),
      Set = getNative(root, 'Set'),
      WeakMap = getNative(root, 'WeakMap'),
      nativeCreate = getNative(Object, 'create');

  /** Used to store function metadata. */
  var metaMap = WeakMap && new WeakMap;

  /** Used to lookup unminified function names. */
  var realNames = {};

  /** Used to detect maps, sets, and weakmaps. */
  var dataViewCtorString = toSource(DataView),
      mapCtorString = toSource(Map),
      promiseCtorString = toSource(Promise),
      setCtorString = toSource(Set),
      weakMapCtorString = toSource(WeakMap);

  /** Used to convert symbols to primitives and strings. */
  var symbolProto = Symbol ? Symbol.prototype : undefined,
      symbolValueOf = symbolProto ? symbolProto.valueOf : undefined,
      symbolToString = symbolProto ? symbolProto.toString : undefined;

  /*------------------------------------------------------------------------*/

  /**
   * Creates a `lodash` object which wraps `value` to enable implicit method
   * chain sequences. Methods that operate on and return arrays, collections,
   * and functions can be chained together. Methods that retrieve a single value
   * or may return a primitive value will automatically end the chain sequence
   * and return the unwrapped value. Otherwise, the value must be unwrapped
   * with `_#value`.
   *
   * Explicit chain sequences, which must be unwrapped with `_#value`, may be
   * enabled using `_.chain`.
   *
   * The execution of chained methods is lazy, that is, it's deferred until
   * `_#value` is implicitly or explicitly called.
   *
   * Lazy evaluation allows several methods to support shortcut fusion.
   * Shortcut fusion is an optimization to merge iteratee calls; this avoids
   * the creation of intermediate arrays and can greatly reduce the number of
   * iteratee executions. Sections of a chain sequence qualify for shortcut
   * fusion if the section is applied to an array and iteratees accept only
   * one argument. The heuristic for whether a section qualifies for shortcut
   * fusion is subject to change.
   *
   * Chaining is supported in custom builds as long as the `_#value` method is
   * directly or indirectly included in the build.
   *
   * In addition to lodash methods, wrappers have `Array` and `String` methods.
   *
   * The wrapper `Array` methods are:
   * `concat`, `join`, `pop`, `push`, `shift`, `sort`, `splice`, and `unshift`
   *
   * The wrapper `String` methods are:
   * `replace` and `split`
   *
   * The wrapper methods that support shortcut fusion are:
   * `at`, `compact`, `drop`, `dropRight`, `dropWhile`, `filter`, `find`,
   * `findLast`, `head`, `initial`, `last`, `map`, `reject`, `reverse`, `slice`,
   * `tail`, `take`, `takeRight`, `takeRightWhile`, `takeWhile`, and `toArray`
   *
   * The chainable wrapper methods are:
   * `after`, `ary`, `assign`, `assignIn`, `assignInWith`, `assignWith`, `at`,
   * `before`, `bind`, `bindAll`, `bindKey`, `castArray`, `chain`, `chunk`,
   * `commit`, `compact`, `concat`, `conforms`, `constant`, `countBy`, `create`,
   * `curry`, `debounce`, `defaults`, `defaultsDeep`, `defer`, `delay`,
   * `difference`, `differenceBy`, `differenceWith`, `drop`, `dropRight`,
   * `dropRightWhile`, `dropWhile`, `extend`, `extendWith`, `fill`, `filter`,
   * `flatMap`, `flatMapDeep`, `flatMapDepth`, `flatten`, `flattenDeep`,
   * `flattenDepth`, `flip`, `flow`, `flowRight`, `fromPairs`, `functions`,
   * `functionsIn`, `groupBy`, `initial`, `intersection`, `intersectionBy`,
   * `intersectionWith`, `invert`, `invertBy`, `invokeMap`, `iteratee`, `keyBy`,
   * `keys`, `keysIn`, `map`, `mapKeys`, `mapValues`, `matches`, `matchesProperty`,
   * `memoize`, `merge`, `mergeWith`, `method`, `methodOf`, `mixin`, `negate`,
   * `nthArg`, `omit`, `omitBy`, `once`, `orderBy`, `over`, `overArgs`,
   * `overEvery`, `overSome`, `partial`, `partialRight`, `partition`, `pick`,
   * `pickBy`, `plant`, `property`, `propertyOf`, `pull`, `pullAll`, `pullAllBy`,
   * `pullAllWith`, `pullAt`, `push`, `range`, `rangeRight`, `rearg`, `reject`,
   * `remove`, `rest`, `reverse`, `sampleSize`, `set`, `setWith`, `shuffle`,
   * `slice`, `sort`, `sortBy`, `splice`, `spread`, `tail`, `take`, `takeRight`,
   * `takeRightWhile`, `takeWhile`, `tap`, `throttle`, `thru`, `toArray`,
   * `toPairs`, `toPairsIn`, `toPath`, `toPlainObject`, `transform`, `unary`,
   * `union`, `unionBy`, `unionWith`, `uniq`, `uniqBy`, `uniqWith`, `unset`,
   * `unshift`, `unzip`, `unzipWith`, `update`, `updateWith`, `values`,
   * `valuesIn`, `without`, `wrap`, `xor`, `xorBy`, `xorWith`, `zip`,
   * `zipObject`, `zipObjectDeep`, and `zipWith`
   *
   * The wrapper methods that are **not** chainable by default are:
   * `add`, `attempt`, `camelCase`, `capitalize`, `ceil`, `clamp`, `clone`,
   * `cloneDeep`, `cloneDeepWith`, `cloneWith`, `conformsTo`, `deburr`,
   * `defaultTo`, `divide`, `each`, `eachRight`, `endsWith`, `eq`, `escape`,
   * `escapeRegExp`, `every`, `find`, `findIndex`, `findKey`, `findLast`,
   * `findLastIndex`, `findLastKey`, `first`, `floor`, `forEach`, `forEachRight`,
   * `forIn`, `forInRight`, `forOwn`, `forOwnRight`, `get`, `gt`, `gte`, `has`,
   * `hasIn`, `head`, `identity`, `includes`, `indexOf`, `inRange`, `invoke`,
   * `isArguments`, `isArray`, `isArrayBuffer`, `isArrayLike`, `isArrayLikeObject`,
   * `isBoolean`, `isBuffer`, `isDate`, `isElement`, `isEmpty`, `isEqual`,
   * `isEqualWith`, `isError`, `isFinite`, `isFunction`, `isInteger`, `isLength`,
   * `isMap`, `isMatch`, `isMatchWith`, `isNaN`, `isNative`, `isNil`, `isNull`,
   * `isNumber`, `isObject`, `isObjectLike`, `isPlainObject`, `isRegExp`,
   * `isSafeInteger`, `isSet`, `isString`, `isUndefined`, `isTypedArray`,
   * `isWeakMap`, `isWeakSet`, `join`, `kebabCase`, `last`, `lastIndexOf`,
   * `lowerCase`, `lowerFirst`, `lt`, `lte`, `max`, `maxBy`, `mean`, `meanBy`,
   * `min`, `minBy`, `multiply`, `noConflict`, `noop`, `now`, `nth`, `pad`,
   * `padEnd`, `padStart`, `parseInt`, `pop`, `random`, `reduce`, `reduceRight`,
   * `repeat`, `result`, `round`, `runInContext`, `sample`, `shift`, `size`,
   * `snakeCase`, `some`, `sortedIndex`, `sortedIndexBy`, `sortedLastIndex`,
   * `sortedLastIndexBy`, `startCase`, `startsWith`, `stubArray`, `stubFalse`,
   * `stubObject`, `stubString`, `stubTrue`, `subtract`, `sum`, `sumBy`,
   * `template`, `times`, `toFinite`, `toInteger`, `toJSON`, `toLength`,
   * `toLower`, `toNumber`, `toSafeInteger`, `toString`, `toUpper`, `trim`,
   * `trimEnd`, `trimStart`, `truncate`, `unescape`, `uniqueId`, `upperCase`,
   * `upperFirst`, `value`, and `words`
   *
   * @name _
   * @constructor
   * @category Seq
   * @param {*} value The value to wrap in a `lodash` instance.
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * function square(n) {
   *   return n * n;
   * }
   *
   * var wrapped = _([1, 2, 3]);
   *
   * // Returns an unwrapped value.
   * wrapped.reduce(_.add);
   * // => 6
   *
   * // Returns a wrapped value.
   * var squares = wrapped.map(square);
   *
   * _.isArray(squares);
   * // => false
   *
   * _.isArray(squares.value());
   * // => true
   */
  function lodash(value) {
    if (isObjectLike(value) && !isArray(value) && !(value instanceof LazyWrapper)) {
      if (value instanceof LodashWrapper) {
        return value;
      }
      if (hasOwnProperty.call(value, '__wrapped__')) {
        return wrapperClone(value);
      }
    }
    return new LodashWrapper(value);
  }

  /**
   * The base implementation of `_.create` without support for assigning
   * properties to the created object.
   *
   * @private
   * @param {Object} proto The object to inherit from.
   * @returns {Object} Returns the new object.
   */
  var baseCreate = (function() {
    function object() {}
    return function(proto) {
      if (!isObject(proto)) {
        return {};
      }
      if (objectCreate) {
        return objectCreate(proto);
      }
      object.prototype = proto;
      var result = new object;
      object.prototype = undefined;
      return result;
    };
  }());

  /**
   * The function whose prototype chain sequence wrappers inherit from.
   *
   * @private
   */
  function baseLodash() {
    // No operation performed.
  }

  /**
   * The base constructor for creating `lodash` wrapper objects.
   *
   * @private
   * @param {*} value The value to wrap.
   * @param {boolean} [chainAll] Enable explicit method chain sequences.
   */
  function LodashWrapper(value, chainAll) {
    this.__wrapped__ = value;
    this.__actions__ = [];
    this.__chain__ = !!chainAll;
    this.__index__ = 0;
    this.__values__ = undefined;
  }

  // Ensure wrappers are instances of `baseLodash`.
  lodash.prototype = baseLodash.prototype;
  lodash.prototype.constructor = lodash;

  LodashWrapper.prototype = baseCreate(baseLodash.prototype);
  LodashWrapper.prototype.constructor = LodashWrapper;

  /*------------------------------------------------------------------------*/

  /**
   * Creates a lazy wrapper object which wraps `value` to enable lazy evaluation.
   *
   * @private
   * @constructor
   * @param {*} value The value to wrap.
   */
  function LazyWrapper(value) {
    this.__wrapped__ = value;
    this.__actions__ = [];
    this.__dir__ = 1;
    this.__filtered__ = false;
    this.__iteratees__ = [];
    this.__takeCount__ = MAX_ARRAY_LENGTH;
    this.__views__ = [];
  }

  /**
   * Creates a clone of the lazy wrapper object.
   *
   * @private
   * @name clone
   * @memberOf LazyWrapper
   * @returns {Object} Returns the cloned `LazyWrapper` object.
   */
  function lazyClone() {
    var result = new LazyWrapper(this.__wrapped__);
    result.__actions__ = copyArray(this.__actions__);
    result.__dir__ = this.__dir__;
    result.__filtered__ = this.__filtered__;
    result.__iteratees__ = copyArray(this.__iteratees__);
    result.__takeCount__ = this.__takeCount__;
    result.__views__ = copyArray(this.__views__);
    return result;
  }

  /**
   * Reverses the direction of lazy iteration.
   *
   * @private
   * @name reverse
   * @memberOf LazyWrapper
   * @returns {Object} Returns the new reversed `LazyWrapper` object.
   */
  function lazyReverse() {
    if (this.__filtered__) {
      var result = new LazyWrapper(this);
      result.__dir__ = -1;
      result.__filtered__ = true;
    } else {
      result = this.clone();
      result.__dir__ *= -1;
    }
    return result;
  }

  /**
   * Extracts the unwrapped value from its lazy wrapper.
   *
   * @private
   * @name value
   * @memberOf LazyWrapper
   * @returns {*} Returns the unwrapped value.
   */
  function lazyValue() {
    var array = this.__wrapped__.value(),
        dir = this.__dir__,
        isArr = isArray(array),
        isRight = dir < 0,
        arrLength = isArr ? array.length : 0,
        view = getView(0, arrLength, this.__views__),
        start = view.start,
        end = view.end,
        length = end - start,
        index = isRight ? end : (start - 1),
        iteratees = this.__iteratees__,
        iterLength = iteratees.length,
        resIndex = 0,
        takeCount = nativeMin(length, this.__takeCount__);

    if (!isArr || (!isRight && arrLength == length && takeCount == length)) {
      return baseWrapperValue(array, this.__actions__);
    }
    var result = [];

    outer:
    while (length-- && resIndex < takeCount) {
      index += dir;

      var iterIndex = -1,
          value = array[index];

      while (++iterIndex < iterLength) {
        var data = iteratees[iterIndex],
            iteratee = data.iteratee,
            type = data.type,
            computed = iteratee(value);

        if (type == LAZY_MAP_FLAG) {
          value = computed;
        } else if (!computed) {
          if (type == LAZY_FILTER_FLAG) {
            continue outer;
          } else {
            break outer;
          }
        }
      }
      result[resIndex++] = value;
    }
    return result;
  }

  // Ensure `LazyWrapper` is an instance of `baseLodash`.
  LazyWrapper.prototype = baseCreate(baseLodash.prototype);
  LazyWrapper.prototype.constructor = LazyWrapper;

  /*------------------------------------------------------------------------*/

  /**
   * Creates a hash object.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function Hash(entries) {
    var index = -1,
        length = entries == null ? 0 : entries.length;

    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  /**
   * Removes all key-value entries from the hash.
   *
   * @private
   * @name clear
   * @memberOf Hash
   */
  function hashClear() {
    this.__data__ = nativeCreate ? nativeCreate(null) : {};
    this.size = 0;
  }

  /**
   * Removes `key` and its value from the hash.
   *
   * @private
   * @name delete
   * @memberOf Hash
   * @param {Object} hash The hash to modify.
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function hashDelete(key) {
    var result = this.has(key) && delete this.__data__[key];
    this.size -= result ? 1 : 0;
    return result;
  }

  /**
   * Gets the hash value for `key`.
   *
   * @private
   * @name get
   * @memberOf Hash
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function hashGet(key) {
    var data = this.__data__;
    if (nativeCreate) {
      var result = data[key];
      return result === HASH_UNDEFINED ? undefined : result;
    }
    return hasOwnProperty.call(data, key) ? data[key] : undefined;
  }

  /**
   * Checks if a hash value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf Hash
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function hashHas(key) {
    var data = this.__data__;
    return nativeCreate ? (data[key] !== undefined) : hasOwnProperty.call(data, key);
  }

  /**
   * Sets the hash `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf Hash
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the hash instance.
   */
  function hashSet(key, value) {
    var data = this.__data__;
    this.size += this.has(key) ? 0 : 1;
    data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
    return this;
  }

  // Add methods to `Hash`.
  Hash.prototype.clear = hashClear;
  Hash.prototype['delete'] = hashDelete;
  Hash.prototype.get = hashGet;
  Hash.prototype.has = hashHas;
  Hash.prototype.set = hashSet;

  /*------------------------------------------------------------------------*/

  /**
   * Creates an list cache object.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function ListCache(entries) {
    var index = -1,
        length = entries == null ? 0 : entries.length;

    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  /**
   * Removes all key-value entries from the list cache.
   *
   * @private
   * @name clear
   * @memberOf ListCache
   */
  function listCacheClear() {
    this.__data__ = [];
    this.size = 0;
  }

  /**
   * Removes `key` and its value from the list cache.
   *
   * @private
   * @name delete
   * @memberOf ListCache
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function listCacheDelete(key) {
    var data = this.__data__,
        index = assocIndexOf(data, key);

    if (index < 0) {
      return false;
    }
    var lastIndex = data.length - 1;
    if (index == lastIndex) {
      data.pop();
    } else {
      splice.call(data, index, 1);
    }
    --this.size;
    return true;
  }

  /**
   * Gets the list cache value for `key`.
   *
   * @private
   * @name get
   * @memberOf ListCache
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function listCacheGet(key) {
    var data = this.__data__,
        index = assocIndexOf(data, key);

    return index < 0 ? undefined : data[index][1];
  }

  /**
   * Checks if a list cache value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf ListCache
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function listCacheHas(key) {
    return assocIndexOf(this.__data__, key) > -1;
  }

  /**
   * Sets the list cache `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf ListCache
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the list cache instance.
   */
  function listCacheSet(key, value) {
    var data = this.__data__,
        index = assocIndexOf(data, key);

    if (index < 0) {
      ++this.size;
      data.push([key, value]);
    } else {
      data[index][1] = value;
    }
    return this;
  }

  // Add methods to `ListCache`.
  ListCache.prototype.clear = listCacheClear;
  ListCache.prototype['delete'] = listCacheDelete;
  ListCache.prototype.get = listCacheGet;
  ListCache.prototype.has = listCacheHas;
  ListCache.prototype.set = listCacheSet;

  /*------------------------------------------------------------------------*/

  /**
   * Creates a map cache object to store key-value pairs.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function MapCache(entries) {
    var index = -1,
        length = entries == null ? 0 : entries.length;

    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  /**
   * Removes all key-value entries from the map.
   *
   * @private
   * @name clear
   * @memberOf MapCache
   */
  function mapCacheClear() {
    this.size = 0;
    this.__data__ = {
      'hash': new Hash,
      'map': new (Map || ListCache),
      'string': new Hash
    };
  }

  /**
   * Removes `key` and its value from the map.
   *
   * @private
   * @name delete
   * @memberOf MapCache
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function mapCacheDelete(key) {
    var result = getMapData(this, key)['delete'](key);
    this.size -= result ? 1 : 0;
    return result;
  }

  /**
   * Gets the map value for `key`.
   *
   * @private
   * @name get
   * @memberOf MapCache
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function mapCacheGet(key) {
    return getMapData(this, key).get(key);
  }

  /**
   * Checks if a map value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf MapCache
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function mapCacheHas(key) {
    return getMapData(this, key).has(key);
  }

  /**
   * Sets the map `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf MapCache
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the map cache instance.
   */
  function mapCacheSet(key, value) {
    var data = getMapData(this, key),
        size = data.size;

    data.set(key, value);
    this.size += data.size == size ? 0 : 1;
    return this;
  }

  // Add methods to `MapCache`.
  MapCache.prototype.clear = mapCacheClear;
  MapCache.prototype['delete'] = mapCacheDelete;
  MapCache.prototype.get = mapCacheGet;
  MapCache.prototype.has = mapCacheHas;
  MapCache.prototype.set = mapCacheSet;

  /*------------------------------------------------------------------------*/

  /**
   *
   * Creates an array cache object to store unique values.
   *
   * @private
   * @constructor
   * @param {Array} [values] The values to cache.
   */
  function SetCache(values) {
    var index = -1,
        length = values == null ? 0 : values.length;

    this.__data__ = new MapCache;
    while (++index < length) {
      this.add(values[index]);
    }
  }

  /**
   * Adds `value` to the array cache.
   *
   * @private
   * @name add
   * @memberOf SetCache
   * @alias push
   * @param {*} value The value to cache.
   * @returns {Object} Returns the cache instance.
   */
  function setCacheAdd(value) {
    this.__data__.set(value, HASH_UNDEFINED);
    return this;
  }

  /**
   * Checks if `value` is in the array cache.
   *
   * @private
   * @name has
   * @memberOf SetCache
   * @param {*} value The value to search for.
   * @returns {number} Returns `true` if `value` is found, else `false`.
   */
  function setCacheHas(value) {
    return this.__data__.has(value);
  }

  // Add methods to `SetCache`.
  SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
  SetCache.prototype.has = setCacheHas;

  /*------------------------------------------------------------------------*/

  /**
   * Creates a stack cache object to store key-value pairs.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function Stack(entries) {
    var data = this.__data__ = new ListCache(entries);
    this.size = data.size;
  }

  /**
   * Removes all key-value entries from the stack.
   *
   * @private
   * @name clear
   * @memberOf Stack
   */
  function stackClear() {
    this.__data__ = new ListCache;
    this.size = 0;
  }

  /**
   * Removes `key` and its value from the stack.
   *
   * @private
   * @name delete
   * @memberOf Stack
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function stackDelete(key) {
    var data = this.__data__,
        result = data['delete'](key);

    this.size = data.size;
    return result;
  }

  /**
   * Gets the stack value for `key`.
   *
   * @private
   * @name get
   * @memberOf Stack
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function stackGet(key) {
    return this.__data__.get(key);
  }

  /**
   * Checks if a stack value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf Stack
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function stackHas(key) {
    return this.__data__.has(key);
  }

  /**
   * Sets the stack `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf Stack
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the stack cache instance.
   */
  function stackSet(key, value) {
    var data = this.__data__;
    if (data instanceof ListCache) {
      var pairs = data.__data__;
      if (!Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
        pairs.push([key, value]);
        this.size = ++data.size;
        return this;
      }
      data = this.__data__ = new MapCache(pairs);
    }
    data.set(key, value);
    this.size = data.size;
    return this;
  }

  // Add methods to `Stack`.
  Stack.prototype.clear = stackClear;
  Stack.prototype['delete'] = stackDelete;
  Stack.prototype.get = stackGet;
  Stack.prototype.has = stackHas;
  Stack.prototype.set = stackSet;

  /*------------------------------------------------------------------------*/

  /**
   * Creates an array of the enumerable property names of the array-like `value`.
   *
   * @private
   * @param {*} value The value to query.
   * @param {boolean} inherited Specify returning inherited property names.
   * @returns {Array} Returns the array of property names.
   */
  function arrayLikeKeys(value, inherited) {
    var isArr = isArray(value),
        isArg = !isArr && isArguments(value),
        isBuff = !isArr && !isArg && isBuffer(value),
        isType = !isArr && !isArg && !isBuff && isTypedArray(value),
        skipIndexes = isArr || isArg || isBuff || isType,
        result = skipIndexes ? baseTimes(value.length, String) : [],
        length = result.length;

    for (var key in value) {
      if ((inherited || hasOwnProperty.call(value, key)) &&
          !(skipIndexes && (
             // Safari 9 has enumerable `arguments.length` in strict mode.
             key == 'length' ||
             // Node.js 0.10 has enumerable non-index properties on buffers.
             (isBuff && (key == 'offset' || key == 'parent')) ||
             // PhantomJS 2 has enumerable non-index properties on typed arrays.
             (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
             // Skip index properties.
             isIndex(key, length)
          ))) {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * This function is like `assignValue` except that it doesn't assign
   * `undefined` values.
   *
   * @private
   * @param {Object} object The object to modify.
   * @param {string} key The key of the property to assign.
   * @param {*} value The value to assign.
   */
  function assignMergeValue(object, key, value) {
    if ((value !== undefined && !eq(object[key], value)) ||
        (value === undefined && !(key in object))) {
      baseAssignValue(object, key, value);
    }
  }

  /**
   * Assigns `value` to `key` of `object` if the existing value is not equivalent
   * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
   * for equality comparisons.
   *
   * @private
   * @param {Object} object The object to modify.
   * @param {string} key The key of the property to assign.
   * @param {*} value The value to assign.
   */
  function assignValue(object, key, value) {
    var objValue = object[key];
    if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) ||
        (value === undefined && !(key in object))) {
      baseAssignValue(object, key, value);
    }
  }

  /**
   * Gets the index at which the `key` is found in `array` of key-value pairs.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} key The key to search for.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function assocIndexOf(array, key) {
    var length = array.length;
    while (length--) {
      if (eq(array[length][0], key)) {
        return length;
      }
    }
    return -1;
  }

  /**
   * Aggregates elements of `collection` on `accumulator` with keys transformed
   * by `iteratee` and values set by `setter`.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} setter The function to set `accumulator` values.
   * @param {Function} iteratee The iteratee to transform keys.
   * @param {Object} accumulator The initial aggregated object.
   * @returns {Function} Returns `accumulator`.
   */
  function baseAggregator(collection, setter, iteratee, accumulator) {
    baseEach(collection, function(value, key, collection) {
      setter(accumulator, value, iteratee(value), collection);
    });
    return accumulator;
  }

  /**
   * The base implementation of `_.assign` without support for multiple sources
   * or `customizer` functions.
   *
   * @private
   * @param {Object} object The destination object.
   * @param {Object} source The source object.
   * @returns {Object} Returns `object`.
   */
  function baseAssign(object, source) {
    return object && copyObject(source, keys(source), object);
  }

  /**
   * The base implementation of `_.assignIn` without support for multiple sources
   * or `customizer` functions.
   *
   * @private
   * @param {Object} object The destination object.
   * @param {Object} source The source object.
   * @returns {Object} Returns `object`.
   */
  function baseAssignIn(object, source) {
    return object && copyObject(source, keysIn(source), object);
  }

  /**
   * The base implementation of `assignValue` and `assignMergeValue` without
   * value checks.
   *
   * @private
   * @param {Object} object The object to modify.
   * @param {string} key The key of the property to assign.
   * @param {*} value The value to assign.
   */
  function baseAssignValue(object, key, value) {
    if (key == '__proto__' && defineProperty) {
      defineProperty(object, key, {
        'configurable': true,
        'enumerable': true,
        'value': value,
        'writable': true
      });
    } else {
      object[key] = value;
    }
  }

  /**
   * The base implementation of `_.at` without support for individual paths.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {string[]} paths The property paths to pick.
   * @returns {Array} Returns the picked elements.
   */
  function baseAt(object, paths) {
    var index = -1,
        length = paths.length,
        result = Array(length),
        skip = object == null;

    while (++index < length) {
      result[index] = skip ? undefined : get(object, paths[index]);
    }
    return result;
  }

  /**
   * The base implementation of `_.clone` and `_.cloneDeep` which tracks
   * traversed objects.
   *
   * @private
   * @param {*} value The value to clone.
   * @param {boolean} bitmask The bitmask flags.
   *  1 - Deep clone
   *  2 - Flatten inherited properties
   *  4 - Clone symbols
   * @param {Function} [customizer] The function to customize cloning.
   * @param {string} [key] The key of `value`.
   * @param {Object} [object] The parent object of `value`.
   * @param {Object} [stack] Tracks traversed objects and their clone counterparts.
   * @returns {*} Returns the cloned value.
   */
  function baseClone(value, bitmask, customizer, key, object, stack) {
    var result,
        isDeep = bitmask & CLONE_DEEP_FLAG,
        isFlat = bitmask & CLONE_FLAT_FLAG,
        isFull = bitmask & CLONE_SYMBOLS_FLAG;

    if (customizer) {
      result = object ? customizer(value, key, object, stack) : customizer(value);
    }
    if (result !== undefined) {
      return result;
    }
    if (!isObject(value)) {
      return value;
    }
    var isArr = isArray(value);
    if (isArr) {
      result = initCloneArray(value);
      if (!isDeep) {
        return copyArray(value, result);
      }
    } else {
      var tag = getTag(value),
          isFunc = tag == funcTag || tag == genTag;

      if (isBuffer(value)) {
        return cloneBuffer(value, isDeep);
      }
      if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
        result = (isFlat || isFunc) ? {} : initCloneObject(value);
        if (!isDeep) {
          return isFlat
            ? copySymbolsIn(value, baseAssignIn(result, value))
            : copySymbols(value, baseAssign(result, value));
        }
      } else {
        if (!cloneableTags[tag]) {
          return object ? value : {};
        }
        result = initCloneByTag(value, tag, isDeep);
      }
    }
    // Check for circular references and return its corresponding clone.
    stack || (stack = new Stack);
    var stacked = stack.get(value);
    if (stacked) {
      return stacked;
    }
    stack.set(value, result);

    if (isSet(value)) {
      value.forEach(function(subValue) {
        result.add(baseClone(subValue, bitmask, customizer, subValue, value, stack));
      });
    } else if (isMap(value)) {
      value.forEach(function(subValue, key) {
        result.set(key, baseClone(subValue, bitmask, customizer, key, value, stack));
      });
    }

    var keysFunc = isFull
      ? (isFlat ? getAllKeysIn : getAllKeys)
      : (isFlat ? keysIn : keys);

    var props = isArr ? undefined : keysFunc(value);
    arrayEach(props || value, function(subValue, key) {
      if (props) {
        key = subValue;
        subValue = value[key];
      }
      // Recursively populate clone (susceptible to call stack limits).
      assignValue(result, key, baseClone(subValue, bitmask, customizer, key, value, stack));
    });
    return result;
  }

  /**
   * The base implementation of `_.delay` and `_.defer` which accepts `args`
   * to provide to `func`.
   *
   * @private
   * @param {Function} func The function to delay.
   * @param {number} wait The number of milliseconds to delay invocation.
   * @param {Array} args The arguments to provide to `func`.
   * @returns {number|Object} Returns the timer id or timeout object.
   */
  function baseDelay(func, wait, args) {
    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    return setTimeout(function() { func.apply(undefined, args); }, wait);
  }

  /**
   * The base implementation of methods like `_.difference` without support
   * for excluding multiple arrays or iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {Array} values The values to exclude.
   * @param {Function} [iteratee] The iteratee invoked per element.
   * @param {Function} [comparator] The comparator invoked per element.
   * @returns {Array} Returns the new array of filtered values.
   */
  function baseDifference(array, values, iteratee, comparator) {
    var index = -1,
        includes = arrayIncludes,
        isCommon = true,
        length = array.length,
        result = [],
        valuesLength = values.length;

    if (!length) {
      return result;
    }
    if (iteratee) {
      values = arrayMap(values, baseUnary(iteratee));
    }
    if (comparator) {
      includes = arrayIncludesWith;
      isCommon = false;
    }
    else if (values.length >= LARGE_ARRAY_SIZE) {
      includes = cacheHas;
      isCommon = false;
      values = new SetCache(values);
    }
    outer:
    while (++index < length) {
      var value = array[index],
          computed = iteratee == null ? value : iteratee(value);

      value = (comparator || value !== 0) ? value : 0;
      if (isCommon && computed === computed) {
        var valuesIndex = valuesLength;
        while (valuesIndex--) {
          if (values[valuesIndex] === computed) {
            continue outer;
          }
        }
        result.push(value);
      }
      else if (!includes(values, computed, comparator)) {
        result.push(value);
      }
    }
    return result;
  }

  /**
   * The base implementation of `_.forEach` without support for iteratee shorthands.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array|Object} Returns `collection`.
   */
  var baseEach = createBaseEach(baseForOwn);

  /**
   * The base implementation of `_.every` without support for iteratee shorthands.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {boolean} Returns `true` if all elements pass the predicate check,
   *  else `false`
   */
  function baseEvery(collection, predicate) {
    var result = true;
    baseEach(collection, function(value, index, collection) {
      result = !!predicate(value, index, collection);
      return result;
    });
    return result;
  }

  /**
   * The base implementation of methods like `_.max` and `_.min` which accepts a
   * `comparator` to determine the extremum value.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The iteratee invoked per iteration.
   * @param {Function} comparator The comparator used to compare values.
   * @returns {*} Returns the extremum value.
   */
  function baseExtremum(array, iteratee, comparator) {
    var index = -1,
        length = array.length;

    while (++index < length) {
      var value = array[index],
          current = iteratee(value);

      if (current != null && (computed === undefined
            ? (current === current && !isSymbol(current))
            : comparator(current, computed)
          )) {
        var computed = current,
            result = value;
      }
    }
    return result;
  }

  /**
   * The base implementation of `_.filter` without support for iteratee shorthands.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {Array} Returns the new filtered array.
   */
  function baseFilter(collection, predicate) {
    var result = [];
    baseEach(collection, function(value, index, collection) {
      if (predicate(value, index, collection)) {
        result.push(value);
      }
    });
    return result;
  }

  /**
   * The base implementation of `_.flatten` with support for restricting flattening.
   *
   * @private
   * @param {Array} array The array to flatten.
   * @param {number} depth The maximum recursion depth.
   * @param {boolean} [predicate=isFlattenable] The function invoked per iteration.
   * @param {boolean} [isStrict] Restrict to values that pass `predicate` checks.
   * @param {Array} [result=[]] The initial result value.
   * @returns {Array} Returns the new flattened array.
   */
  function baseFlatten(array, depth, predicate, isStrict, result) {
    var index = -1,
        length = array.length;

    predicate || (predicate = isFlattenable);
    result || (result = []);

    while (++index < length) {
      var value = array[index];
      if (depth > 0 && predicate(value)) {
        if (depth > 1) {
          // Recursively flatten arrays (susceptible to call stack limits).
          baseFlatten(value, depth - 1, predicate, isStrict, result);
        } else {
          arrayPush(result, value);
        }
      } else if (!isStrict) {
        result[result.length] = value;
      }
    }
    return result;
  }

  /**
   * The base implementation of `baseForOwn` which iterates over `object`
   * properties returned by `keysFunc` and invokes `iteratee` for each property.
   * Iteratee functions may exit iteration early by explicitly returning `false`.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {Function} keysFunc The function to get the keys of `object`.
   * @returns {Object} Returns `object`.
   */
  var baseFor = createBaseFor();

  /**
   * The base implementation of `_.forOwn` without support for iteratee shorthands.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Object} Returns `object`.
   */
  function baseForOwn(object, iteratee) {
    return object && baseFor(object, iteratee, keys);
  }

  /**
   * The base implementation of `_.functions` which creates an array of
   * `object` function property names filtered from `props`.
   *
   * @private
   * @param {Object} object The object to inspect.
   * @param {Array} props The property names to filter.
   * @returns {Array} Returns the function names.
   */
  function baseFunctions(object, props) {
    return arrayFilter(props, function(key) {
      return isFunction(object[key]);
    });
  }

  /**
   * The base implementation of `_.get` without support for default values.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array|string} path The path of the property to get.
   * @returns {*} Returns the resolved value.
   */
  function baseGet(object, path) {
    path = castPath(path, object);

    var index = 0,
        length = path.length;

    while (object != null && index < length) {
      object = object[toKey(path[index++])];
    }
    return (index && index == length) ? object : undefined;
  }

  /**
   * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
   * `keysFunc` and `symbolsFunc` to get the enumerable property names and
   * symbols of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Function} keysFunc The function to get the keys of `object`.
   * @param {Function} symbolsFunc The function to get the symbols of `object`.
   * @returns {Array} Returns the array of property names and symbols.
   */
  function baseGetAllKeys(object, keysFunc, symbolsFunc) {
    var result = keysFunc(object);
    return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
  }

  /**
   * The base implementation of `getTag` without fallbacks for buggy environments.
   *
   * @private
   * @param {*} value The value to query.
   * @returns {string} Returns the `toStringTag`.
   */
  function baseGetTag(value) {
    if (value == null) {
      return value === undefined ? undefinedTag : nullTag;
    }
    return (symToStringTag && symToStringTag in Object(value))
      ? getRawTag(value)
      : objectToString(value);
  }

  /**
   * The base implementation of `_.gt` which doesn't coerce arguments.
   *
   * @private
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {boolean} Returns `true` if `value` is greater than `other`,
   *  else `false`.
   */
  function baseGt(value, other) {
    return value > other;
  }

  /**
   * The base implementation of `_.hasIn` without support for deep paths.
   *
   * @private
   * @param {Object} [object] The object to query.
   * @param {Array|string} key The key to check.
   * @returns {boolean} Returns `true` if `key` exists, else `false`.
   */
  function baseHasIn(object, key) {
    return object != null && key in Object(object);
  }

  /**
   * The base implementation of methods like `_.intersection`, without support
   * for iteratee shorthands, that accepts an array of arrays to inspect.
   *
   * @private
   * @param {Array} arrays The arrays to inspect.
   * @param {Function} [iteratee] The iteratee invoked per element.
   * @param {Function} [comparator] The comparator invoked per element.
   * @returns {Array} Returns the new array of shared values.
   */
  function baseIntersection(arrays, iteratee, comparator) {
    var includes = comparator ? arrayIncludesWith : arrayIncludes,
        length = arrays[0].length,
        othLength = arrays.length,
        othIndex = othLength,
        caches = Array(othLength),
        maxLength = Infinity,
        result = [];

    while (othIndex--) {
      var array = arrays[othIndex];
      if (othIndex && iteratee) {
        array = arrayMap(array, baseUnary(iteratee));
      }
      maxLength = nativeMin(array.length, maxLength);
      caches[othIndex] = !comparator && (iteratee || (length >= 120 && array.length >= 120))
        ? new SetCache(othIndex && array)
        : undefined;
    }
    array = arrays[0];

    var index = -1,
        seen = caches[0];

    outer:
    while (++index < length && result.length < maxLength) {
      var value = array[index],
          computed = iteratee ? iteratee(value) : value;

      value = (comparator || value !== 0) ? value : 0;
      if (!(seen
            ? cacheHas(seen, computed)
            : includes(result, computed, comparator)
          )) {
        othIndex = othLength;
        while (--othIndex) {
          var cache = caches[othIndex];
          if (!(cache
                ? cacheHas(cache, computed)
                : includes(arrays[othIndex], computed, comparator))
              ) {
            continue outer;
          }
        }
        if (seen) {
          seen.push(computed);
        }
        result.push(value);
      }
    }
    return result;
  }

  /**
   * The base implementation of `_.invoke` without support for individual
   * method arguments.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array|string} path The path of the method to invoke.
   * @param {Array} args The arguments to invoke the method with.
   * @returns {*} Returns the result of the invoked method.
   */
  function baseInvoke(object, path, args) {
    path = castPath(path, object);
    object = parent(object, path);
    var func = object == null ? object : object[toKey(last(path))];
    return func == null ? undefined : apply(func, object, args);
  }

  /**
   * The base implementation of `_.isArguments`.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an `arguments` object,
   */
  function baseIsArguments(value) {
    return isObjectLike(value) && baseGetTag(value) == argsTag;
  }

  /**
   * The base implementation of `_.isEqual` which supports partial comparisons
   * and tracks traversed objects.
   *
   * @private
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @param {boolean} bitmask The bitmask flags.
   *  1 - Unordered comparison
   *  2 - Partial comparison
   * @param {Function} [customizer] The function to customize comparisons.
   * @param {Object} [stack] Tracks traversed `value` and `other` objects.
   * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
   */
  function baseIsEqual(value, other, bitmask, customizer, stack) {
    if (value === other) {
      return true;
    }
    if (value == null || other == null || (!isObjectLike(value) && !isObjectLike(other))) {
      return value !== value && other !== other;
    }
    return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
  }

  /**
   * A specialized version of `baseIsEqual` for arrays and objects which performs
   * deep comparisons and tracks traversed objects enabling objects with circular
   * references to be compared.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
   * @param {Function} customizer The function to customize comparisons.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Object} [stack] Tracks traversed `object` and `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
    var objIsArr = isArray(object),
        othIsArr = isArray(other),
        objTag = objIsArr ? arrayTag : getTag(object),
        othTag = othIsArr ? arrayTag : getTag(other);

    objTag = objTag == argsTag ? objectTag : objTag;
    othTag = othTag == argsTag ? objectTag : othTag;

    var objIsObj = objTag == objectTag,
        othIsObj = othTag == objectTag,
        isSameTag = objTag == othTag;

    if (isSameTag && isBuffer(object)) {
      if (!isBuffer(other)) {
        return false;
      }
      objIsArr = true;
      objIsObj = false;
    }
    if (isSameTag && !objIsObj) {
      stack || (stack = new Stack);
      return (objIsArr || isTypedArray(object))
        ? equalArrays(object, other, bitmask, customizer, equalFunc, stack)
        : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
    }
    if (!(bitmask & COMPARE_PARTIAL_FLAG)) {
      var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
          othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

      if (objIsWrapped || othIsWrapped) {
        var objUnwrapped = objIsWrapped ? object.value() : object,
            othUnwrapped = othIsWrapped ? other.value() : other;

        stack || (stack = new Stack);
        return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
      }
    }
    if (!isSameTag) {
      return false;
    }
    stack || (stack = new Stack);
    return equalObjects(object, other, bitmask, customizer, equalFunc, stack);
  }

  /**
   * The base implementation of `_.isMap` without Node.js optimizations.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a map, else `false`.
   */
  function baseIsMap(value) {
    return isObjectLike(value) && getTag(value) == mapTag;
  }

  /**
   * The base implementation of `_.isMatch` without support for iteratee shorthands.
   *
   * @private
   * @param {Object} object The object to inspect.
   * @param {Object} source The object of property values to match.
   * @param {Array} matchData The property names, values, and compare flags to match.
   * @param {Function} [customizer] The function to customize comparisons.
   * @returns {boolean} Returns `true` if `object` is a match, else `false`.
   */
  function baseIsMatch(object, source, matchData, customizer) {
    var index = matchData.length,
        length = index,
        noCustomizer = !customizer;

    if (object == null) {
      return !length;
    }
    object = Object(object);
    while (index--) {
      var data = matchData[index];
      if ((noCustomizer && data[2])
            ? data[1] !== object[data[0]]
            : !(data[0] in object)
          ) {
        return false;
      }
    }
    while (++index < length) {
      data = matchData[index];
      var key = data[0],
          objValue = object[key],
          srcValue = data[1];

      if (noCustomizer && data[2]) {
        if (objValue === undefined && !(key in object)) {
          return false;
        }
      } else {
        var stack = new Stack;
        if (customizer) {
          var result = customizer(objValue, srcValue, key, object, source, stack);
        }
        if (!(result === undefined
              ? baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG, customizer, stack)
              : result
            )) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * The base implementation of `_.isNative` without bad shim checks.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a native function,
   *  else `false`.
   */
  function baseIsNative(value) {
    if (!isObject(value) || isMasked(value)) {
      return false;
    }
    var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
    return pattern.test(toSource(value));
  }

  /**
   * The base implementation of `_.isSet` without Node.js optimizations.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a set, else `false`.
   */
  function baseIsSet(value) {
    return isObjectLike(value) && getTag(value) == setTag;
  }

  /**
   * The base implementation of `_.isTypedArray` without Node.js optimizations.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
   */
  function baseIsTypedArray(value) {
    return isObjectLike(value) &&
      isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
  }

  /**
   * The base implementation of `_.iteratee`.
   *
   * @private
   * @param {*} [value=_.identity] The value to convert to an iteratee.
   * @returns {Function} Returns the iteratee.
   */
  function baseIteratee(value) {
    // Don't store the `typeof` result in a variable to avoid a JIT bug in Safari 9.
    // See https://bugs.webkit.org/show_bug.cgi?id=156034 for more details.
    if (typeof value == 'function') {
      return value;
    }
    if (value == null) {
      return identity;
    }
    if (typeof value == 'object') {
      return isArray(value)
        ? baseMatchesProperty(value[0], value[1])
        : baseMatches(value);
    }
    return property(value);
  }

  /**
   * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   */
  function baseKeys(object) {
    if (!isPrototype(object)) {
      return nativeKeys(object);
    }
    var result = [];
    for (var key in Object(object)) {
      if (hasOwnProperty.call(object, key) && key != 'constructor') {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * The base implementation of `_.keysIn` which doesn't treat sparse arrays as dense.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   */
  function baseKeysIn(object) {
    if (!isObject(object)) {
      return nativeKeysIn(object);
    }
    var isProto = isPrototype(object),
        result = [];

    for (var key in object) {
      if (!(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * The base implementation of `_.lt` which doesn't coerce arguments.
   *
   * @private
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {boolean} Returns `true` if `value` is less than `other`,
   *  else `false`.
   */
  function baseLt(value, other) {
    return value < other;
  }

  /**
   * The base implementation of `_.map` without support for iteratee shorthands.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   */
  function baseMap(collection, iteratee) {
    var index = -1,
        result = isArrayLike(collection) ? Array(collection.length) : [];

    baseEach(collection, function(value, key, collection) {
      result[++index] = iteratee(value, key, collection);
    });
    return result;
  }

  /**
   * The base implementation of `_.matches` which doesn't clone `source`.
   *
   * @private
   * @param {Object} source The object of property values to match.
   * @returns {Function} Returns the new spec function.
   */
  function baseMatches(source) {
    var matchData = getMatchData(source);
    if (matchData.length == 1 && matchData[0][2]) {
      return matchesStrictComparable(matchData[0][0], matchData[0][1]);
    }
    return function(object) {
      return object === source || baseIsMatch(object, source, matchData);
    };
  }

  /**
   * The base implementation of `_.matchesProperty` which doesn't clone `srcValue`.
   *
   * @private
   * @param {string} path The path of the property to get.
   * @param {*} srcValue The value to match.
   * @returns {Function} Returns the new spec function.
   */
  function baseMatchesProperty(path, srcValue) {
    if (isKey(path) && isStrictComparable(srcValue)) {
      return matchesStrictComparable(toKey(path), srcValue);
    }
    return function(object) {
      var objValue = get(object, path);
      return (objValue === undefined && objValue === srcValue)
        ? hasIn(object, path)
        : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
    };
  }

  /**
   * The base implementation of `_.merge` without support for multiple sources.
   *
   * @private
   * @param {Object} object The destination object.
   * @param {Object} source The source object.
   * @param {number} srcIndex The index of `source`.
   * @param {Function} [customizer] The function to customize merged values.
   * @param {Object} [stack] Tracks traversed source values and their merged
   *  counterparts.
   */
  function baseMerge(object, source, srcIndex, customizer, stack) {
    if (object === source) {
      return;
    }
    baseFor(source, function(srcValue, key) {
      stack || (stack = new Stack);
      if (isObject(srcValue)) {
        baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack);
      }
      else {
        var newValue = customizer
          ? customizer(safeGet(object, key), srcValue, (key + ''), object, source, stack)
          : undefined;

        if (newValue === undefined) {
          newValue = srcValue;
        }
        assignMergeValue(object, key, newValue);
      }
    }, keysIn);
  }

  /**
   * A specialized version of `baseMerge` for arrays and objects which performs
   * deep merges and tracks traversed objects enabling objects with circular
   * references to be merged.
   *
   * @private
   * @param {Object} object The destination object.
   * @param {Object} source The source object.
   * @param {string} key The key of the value to merge.
   * @param {number} srcIndex The index of `source`.
   * @param {Function} mergeFunc The function to merge values.
   * @param {Function} [customizer] The function to customize assigned values.
   * @param {Object} [stack] Tracks traversed source values and their merged
   *  counterparts.
   */
  function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
    var objValue = safeGet(object, key),
        srcValue = safeGet(source, key),
        stacked = stack.get(srcValue);

    if (stacked) {
      assignMergeValue(object, key, stacked);
      return;
    }
    var newValue = customizer
      ? customizer(objValue, srcValue, (key + ''), object, source, stack)
      : undefined;

    var isCommon = newValue === undefined;

    if (isCommon) {
      var isArr = isArray(srcValue),
          isBuff = !isArr && isBuffer(srcValue),
          isTyped = !isArr && !isBuff && isTypedArray(srcValue);

      newValue = srcValue;
      if (isArr || isBuff || isTyped) {
        if (isArray(objValue)) {
          newValue = objValue;
        }
        else if (isArrayLikeObject(objValue)) {
          newValue = copyArray(objValue);
        }
        else if (isBuff) {
          isCommon = false;
          newValue = cloneBuffer(srcValue, true);
        }
        else if (isTyped) {
          isCommon = false;
          newValue = cloneTypedArray(srcValue, true);
        }
        else {
          newValue = [];
        }
      }
      else if (isPlainObject(srcValue) || isArguments(srcValue)) {
        newValue = objValue;
        if (isArguments(objValue)) {
          newValue = toPlainObject(objValue);
        }
        else if (!isObject(objValue) || isFunction(objValue)) {
          newValue = initCloneObject(srcValue);
        }
      }
      else {
        isCommon = false;
      }
    }
    if (isCommon) {
      // Recursively merge objects and arrays (susceptible to call stack limits).
      stack.set(srcValue, newValue);
      mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
      stack['delete'](srcValue);
    }
    assignMergeValue(object, key, newValue);
  }

  /**
   * The base implementation of `_.orderBy` without param guards.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function[]|Object[]|string[]} iteratees The iteratees to sort by.
   * @param {string[]} orders The sort orders of `iteratees`.
   * @returns {Array} Returns the new sorted array.
   */
  function baseOrderBy(collection, iteratees, orders) {
    if (iteratees.length) {
      iteratees = arrayMap(iteratees, function(iteratee) {
        if (isArray(iteratee)) {
          return function(value) {
            return baseGet(value, iteratee.length === 1 ? iteratee[0] : iteratee);
          }
        }
        return iteratee;
      });
    } else {
      iteratees = [identity];
    }

    var index = -1;
    iteratees = arrayMap(iteratees, baseUnary(getIteratee()));

    var result = baseMap(collection, function(value, key, collection) {
      var criteria = arrayMap(iteratees, function(iteratee) {
        return iteratee(value);
      });
      return { 'criteria': criteria, 'index': ++index, 'value': value };
    });

    return baseSortBy(result, function(object, other) {
      return compareMultiple(object, other, orders);
    });
  }

  /**
   * The base implementation of `_.pick` without support for individual
   * property identifiers.
   *
   * @private
   * @param {Object} object The source object.
   * @param {string[]} paths The property paths to pick.
   * @returns {Object} Returns the new object.
   */
  function basePick(object, paths) {
    return basePickBy(object, paths, function(value, path) {
      return hasIn(object, path);
    });
  }

  /**
   * The base implementation of  `_.pickBy` without support for iteratee shorthands.
   *
   * @private
   * @param {Object} object The source object.
   * @param {string[]} paths The property paths to pick.
   * @param {Function} predicate The function invoked per property.
   * @returns {Object} Returns the new object.
   */
  function basePickBy(object, paths, predicate) {
    var index = -1,
        length = paths.length,
        result = {};

    while (++index < length) {
      var path = paths[index],
          value = baseGet(object, path);

      if (predicate(value, path)) {
        baseSet(result, castPath(path, object), value);
      }
    }
    return result;
  }

  /**
   * A specialized version of `baseProperty` which supports deep paths.
   *
   * @private
   * @param {Array|string} path The path of the property to get.
   * @returns {Function} Returns the new accessor function.
   */
  function basePropertyDeep(path) {
    return function(object) {
      return baseGet(object, path);
    };
  }

  /**
   * The base implementation of `_.range` and `_.rangeRight` which doesn't
   * coerce arguments.
   *
   * @private
   * @param {number} start The start of the range.
   * @param {number} end The end of the range.
   * @param {number} step The value to increment or decrement by.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Array} Returns the range of numbers.
   */
  function baseRange(start, end, step, fromRight) {
    var index = -1,
        length = nativeMax(nativeCeil((end - start) / (step || 1)), 0),
        result = Array(length);

    while (length--) {
      result[fromRight ? length : ++index] = start;
      start += step;
    }
    return result;
  }

  /**
   * The base implementation of `_.rest` which doesn't validate or coerce arguments.
   *
   * @private
   * @param {Function} func The function to apply a rest parameter to.
   * @param {number} [start=func.length-1] The start position of the rest parameter.
   * @returns {Function} Returns the new function.
   */
  function baseRest(func, start) {
    return setToString(overRest(func, start, identity), func + '');
  }

  /**
   * The base implementation of `_.set`.
   *
   * @private
   * @param {Object} object The object to modify.
   * @param {Array|string} path The path of the property to set.
   * @param {*} value The value to set.
   * @param {Function} [customizer] The function to customize path creation.
   * @returns {Object} Returns `object`.
   */
  function baseSet(object, path, value, customizer) {
    if (!isObject(object)) {
      return object;
    }
    path = castPath(path, object);

    var index = -1,
        length = path.length,
        lastIndex = length - 1,
        nested = object;

    while (nested != null && ++index < length) {
      var key = toKey(path[index]),
          newValue = value;

      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return object;
      }

      if (index != lastIndex) {
        var objValue = nested[key];
        newValue = customizer ? customizer(objValue, key, nested) : undefined;
        if (newValue === undefined) {
          newValue = isObject(objValue)
            ? objValue
            : (isIndex(path[index + 1]) ? [] : {});
        }
      }
      assignValue(nested, key, newValue);
      nested = nested[key];
    }
    return object;
  }

  /**
   * The base implementation of `setData` without support for hot loop shorting.
   *
   * @private
   * @param {Function} func The function to associate metadata with.
   * @param {*} data The metadata.
   * @returns {Function} Returns `func`.
   */
  var baseSetData = !metaMap ? identity : function(func, data) {
    metaMap.set(func, data);
    return func;
  };

  /**
   * The base implementation of `setToString` without support for hot loop shorting.
   *
   * @private
   * @param {Function} func The function to modify.
   * @param {Function} string The `toString` result.
   * @returns {Function} Returns `func`.
   */
  var baseSetToString = !defineProperty ? identity : function(func, string) {
    return defineProperty(func, 'toString', {
      'configurable': true,
      'enumerable': false,
      'value': constant(string),
      'writable': true
    });
  };

  /**
   * The base implementation of `_.slice` without an iteratee call guard.
   *
   * @private
   * @param {Array} array The array to slice.
   * @param {number} [start=0] The start position.
   * @param {number} [end=array.length] The end position.
   * @returns {Array} Returns the slice of `array`.
   */
  function baseSlice(array, start, end) {
    var index = -1,
        length = array.length;

    if (start < 0) {
      start = -start > length ? 0 : (length + start);
    }
    end = end > length ? length : end;
    if (end < 0) {
      end += length;
    }
    length = start > end ? 0 : ((end - start) >>> 0);
    start >>>= 0;

    var result = Array(length);
    while (++index < length) {
      result[index] = array[index + start];
    }
    return result;
  }

  /**
   * The base implementation of `_.toString` which doesn't convert nullish
   * values to empty strings.
   *
   * @private
   * @param {*} value The value to process.
   * @returns {string} Returns the string.
   */
  function baseToString(value) {
    // Exit early for strings to avoid a performance hit in some environments.
    if (typeof value == 'string') {
      return value;
    }
    if (isArray(value)) {
      // Recursively convert values (susceptible to call stack limits).
      return arrayMap(value, baseToString) + '';
    }
    if (isSymbol(value)) {
      return symbolToString ? symbolToString.call(value) : '';
    }
    var result = (value + '');
    return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
  }

  /**
   * The base implementation of `_.uniqBy` without support for iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {Function} [iteratee] The iteratee invoked per element.
   * @param {Function} [comparator] The comparator invoked per element.
   * @returns {Array} Returns the new duplicate free array.
   */
  function baseUniq(array, iteratee, comparator) {
    var index = -1,
        includes = arrayIncludes,
        length = array.length,
        isCommon = true,
        result = [],
        seen = result;

    if (comparator) {
      isCommon = false;
      includes = arrayIncludesWith;
    }
    else if (length >= LARGE_ARRAY_SIZE) {
      var set = iteratee ? null : createSet(array);
      if (set) {
        return setToArray(set);
      }
      isCommon = false;
      includes = cacheHas;
      seen = new SetCache;
    }
    else {
      seen = iteratee ? [] : result;
    }
    outer:
    while (++index < length) {
      var value = array[index],
          computed = iteratee ? iteratee(value) : value;

      value = (comparator || value !== 0) ? value : 0;
      if (isCommon && computed === computed) {
        var seenIndex = seen.length;
        while (seenIndex--) {
          if (seen[seenIndex] === computed) {
            continue outer;
          }
        }
        if (iteratee) {
          seen.push(computed);
        }
        result.push(value);
      }
      else if (!includes(seen, computed, comparator)) {
        if (seen !== result) {
          seen.push(computed);
        }
        result.push(value);
      }
    }
    return result;
  }

  /**
   * The base implementation of `_.unset`.
   *
   * @private
   * @param {Object} object The object to modify.
   * @param {Array|string} path The property path to unset.
   * @returns {boolean} Returns `true` if the property is deleted, else `false`.
   */
  function baseUnset(object, path) {
    path = castPath(path, object);
    object = parent(object, path);
    return object == null || delete object[toKey(last(path))];
  }

  /**
   * The base implementation of `wrapperValue` which returns the result of
   * performing a sequence of actions on the unwrapped `value`, where each
   * successive action is supplied the return value of the previous.
   *
   * @private
   * @param {*} value The unwrapped value.
   * @param {Array} actions Actions to perform to resolve the unwrapped value.
   * @returns {*} Returns the resolved value.
   */
  function baseWrapperValue(value, actions) {
    var result = value;
    if (result instanceof LazyWrapper) {
      result = result.value();
    }
    return arrayReduce(actions, function(result, action) {
      return action.func.apply(action.thisArg, arrayPush([result], action.args));
    }, result);
  }

  /**
   * Casts `value` to an empty array if it's not an array like object.
   *
   * @private
   * @param {*} value The value to inspect.
   * @returns {Array|Object} Returns the cast array-like object.
   */
  function castArrayLikeObject(value) {
    return isArrayLikeObject(value) ? value : [];
  }

  /**
   * Casts `value` to a path array if it's not one.
   *
   * @private
   * @param {*} value The value to inspect.
   * @param {Object} [object] The object to query keys on.
   * @returns {Array} Returns the cast property path array.
   */
  function castPath(value, object) {
    if (isArray(value)) {
      return value;
    }
    return isKey(value, object) ? [value] : stringToPath(toString(value));
  }

  /**
   * Creates a clone of  `buffer`.
   *
   * @private
   * @param {Buffer} buffer The buffer to clone.
   * @param {boolean} [isDeep] Specify a deep clone.
   * @returns {Buffer} Returns the cloned buffer.
   */
  function cloneBuffer(buffer, isDeep) {
    if (isDeep) {
      return buffer.slice();
    }
    var length = buffer.length,
        result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);

    buffer.copy(result);
    return result;
  }

  /**
   * Creates a clone of `arrayBuffer`.
   *
   * @private
   * @param {ArrayBuffer} arrayBuffer The array buffer to clone.
   * @returns {ArrayBuffer} Returns the cloned array buffer.
   */
  function cloneArrayBuffer(arrayBuffer) {
    var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
    new Uint8Array(result).set(new Uint8Array(arrayBuffer));
    return result;
  }

  /**
   * Creates a clone of `dataView`.
   *
   * @private
   * @param {Object} dataView The data view to clone.
   * @param {boolean} [isDeep] Specify a deep clone.
   * @returns {Object} Returns the cloned data view.
   */
  function cloneDataView(dataView, isDeep) {
    var buffer = isDeep ? cloneArrayBuffer(dataView.buffer) : dataView.buffer;
    return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
  }

  /**
   * Creates a clone of `regexp`.
   *
   * @private
   * @param {Object} regexp The regexp to clone.
   * @returns {Object} Returns the cloned regexp.
   */
  function cloneRegExp(regexp) {
    var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
    result.lastIndex = regexp.lastIndex;
    return result;
  }

  /**
   * Creates a clone of the `symbol` object.
   *
   * @private
   * @param {Object} symbol The symbol object to clone.
   * @returns {Object} Returns the cloned symbol object.
   */
  function cloneSymbol(symbol) {
    return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
  }

  /**
   * Creates a clone of `typedArray`.
   *
   * @private
   * @param {Object} typedArray The typed array to clone.
   * @param {boolean} [isDeep] Specify a deep clone.
   * @returns {Object} Returns the cloned typed array.
   */
  function cloneTypedArray(typedArray, isDeep) {
    var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
    return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
  }

  /**
   * Compares values to sort them in ascending order.
   *
   * @private
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {number} Returns the sort order indicator for `value`.
   */
  function compareAscending(value, other) {
    if (value !== other) {
      var valIsDefined = value !== undefined,
          valIsNull = value === null,
          valIsReflexive = value === value,
          valIsSymbol = isSymbol(value);

      var othIsDefined = other !== undefined,
          othIsNull = other === null,
          othIsReflexive = other === other,
          othIsSymbol = isSymbol(other);

      if ((!othIsNull && !othIsSymbol && !valIsSymbol && value > other) ||
          (valIsSymbol && othIsDefined && othIsReflexive && !othIsNull && !othIsSymbol) ||
          (valIsNull && othIsDefined && othIsReflexive) ||
          (!valIsDefined && othIsReflexive) ||
          !valIsReflexive) {
        return 1;
      }
      if ((!valIsNull && !valIsSymbol && !othIsSymbol && value < other) ||
          (othIsSymbol && valIsDefined && valIsReflexive && !valIsNull && !valIsSymbol) ||
          (othIsNull && valIsDefined && valIsReflexive) ||
          (!othIsDefined && valIsReflexive) ||
          !othIsReflexive) {
        return -1;
      }
    }
    return 0;
  }

  /**
   * Used by `_.orderBy` to compare multiple properties of a value to another
   * and stable sort them.
   *
   * If `orders` is unspecified, all values are sorted in ascending order. Otherwise,
   * specify an order of "desc" for descending or "asc" for ascending sort order
   * of corresponding values.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {boolean[]|string[]} orders The order to sort by for each property.
   * @returns {number} Returns the sort order indicator for `object`.
   */
  function compareMultiple(object, other, orders) {
    var index = -1,
        objCriteria = object.criteria,
        othCriteria = other.criteria,
        length = objCriteria.length,
        ordersLength = orders.length;

    while (++index < length) {
      var result = compareAscending(objCriteria[index], othCriteria[index]);
      if (result) {
        if (index >= ordersLength) {
          return result;
        }
        var order = orders[index];
        return result * (order == 'desc' ? -1 : 1);
      }
    }
    // Fixes an `Array#sort` bug in the JS engine embedded in Adobe applications
    // that causes it, under certain circumstances, to provide the same value for
    // `object` and `other`. See https://github.com/jashkenas/underscore/pull/1247
    // for more details.
    //
    // This also ensures a stable sort in V8 and other engines.
    // See https://bugs.chromium.org/p/v8/issues/detail?id=90 for more details.
    return object.index - other.index;
  }

  /**
   * Creates an array that is the composition of partially applied arguments,
   * placeholders, and provided arguments into a single array of arguments.
   *
   * @private
   * @param {Array} args The provided arguments.
   * @param {Array} partials The arguments to prepend to those provided.
   * @param {Array} holders The `partials` placeholder indexes.
   * @params {boolean} [isCurried] Specify composing for a curried function.
   * @returns {Array} Returns the new array of composed arguments.
   */
  function composeArgs(args, partials, holders, isCurried) {
    var argsIndex = -1,
        argsLength = args.length,
        holdersLength = holders.length,
        leftIndex = -1,
        leftLength = partials.length,
        rangeLength = nativeMax(argsLength - holdersLength, 0),
        result = Array(leftLength + rangeLength),
        isUncurried = !isCurried;

    while (++leftIndex < leftLength) {
      result[leftIndex] = partials[leftIndex];
    }
    while (++argsIndex < holdersLength) {
      if (isUncurried || argsIndex < argsLength) {
        result[holders[argsIndex]] = args[argsIndex];
      }
    }
    while (rangeLength--) {
      result[leftIndex++] = args[argsIndex++];
    }
    return result;
  }

  /**
   * This function is like `composeArgs` except that the arguments composition
   * is tailored for `_.partialRight`.
   *
   * @private
   * @param {Array} args The provided arguments.
   * @param {Array} partials The arguments to append to those provided.
   * @param {Array} holders The `partials` placeholder indexes.
   * @params {boolean} [isCurried] Specify composing for a curried function.
   * @returns {Array} Returns the new array of composed arguments.
   */
  function composeArgsRight(args, partials, holders, isCurried) {
    var argsIndex = -1,
        argsLength = args.length,
        holdersIndex = -1,
        holdersLength = holders.length,
        rightIndex = -1,
        rightLength = partials.length,
        rangeLength = nativeMax(argsLength - holdersLength, 0),
        result = Array(rangeLength + rightLength),
        isUncurried = !isCurried;

    while (++argsIndex < rangeLength) {
      result[argsIndex] = args[argsIndex];
    }
    var offset = argsIndex;
    while (++rightIndex < rightLength) {
      result[offset + rightIndex] = partials[rightIndex];
    }
    while (++holdersIndex < holdersLength) {
      if (isUncurried || argsIndex < argsLength) {
        result[offset + holders[holdersIndex]] = args[argsIndex++];
      }
    }
    return result;
  }

  /**
   * Copies the values of `source` to `array`.
   *
   * @private
   * @param {Array} source The array to copy values from.
   * @param {Array} [array=[]] The array to copy values to.
   * @returns {Array} Returns `array`.
   */
  function copyArray(source, array) {
    var index = -1,
        length = source.length;

    array || (array = Array(length));
    while (++index < length) {
      array[index] = source[index];
    }
    return array;
  }

  /**
   * Copies properties of `source` to `object`.
   *
   * @private
   * @param {Object} source The object to copy properties from.
   * @param {Array} props The property identifiers to copy.
   * @param {Object} [object={}] The object to copy properties to.
   * @param {Function} [customizer] The function to customize copied values.
   * @returns {Object} Returns `object`.
   */
  function copyObject(source, props, object, customizer) {
    var isNew = !object;
    object || (object = {});

    var index = -1,
        length = props.length;

    while (++index < length) {
      var key = props[index];

      var newValue = customizer
        ? customizer(object[key], source[key], key, object, source)
        : undefined;

      if (newValue === undefined) {
        newValue = source[key];
      }
      if (isNew) {
        baseAssignValue(object, key, newValue);
      } else {
        assignValue(object, key, newValue);
      }
    }
    return object;
  }

  /**
   * Copies own symbols of `source` to `object`.
   *
   * @private
   * @param {Object} source The object to copy symbols from.
   * @param {Object} [object={}] The object to copy symbols to.
   * @returns {Object} Returns `object`.
   */
  function copySymbols(source, object) {
    return copyObject(source, getSymbols(source), object);
  }

  /**
   * Copies own and inherited symbols of `source` to `object`.
   *
   * @private
   * @param {Object} source The object to copy symbols from.
   * @param {Object} [object={}] The object to copy symbols to.
   * @returns {Object} Returns `object`.
   */
  function copySymbolsIn(source, object) {
    return copyObject(source, getSymbolsIn(source), object);
  }

  /**
   * Creates a function like `_.groupBy`.
   *
   * @private
   * @param {Function} setter The function to set accumulator values.
   * @param {Function} [initializer] The accumulator object initializer.
   * @returns {Function} Returns the new aggregator function.
   */
  function createAggregator(setter, initializer) {
    return function(collection, iteratee) {
      var func = isArray(collection) ? arrayAggregator : baseAggregator,
          accumulator = initializer ? initializer() : {};

      return func(collection, setter, getIteratee(iteratee, 2), accumulator);
    };
  }

  /**
   * Creates a function like `_.assign`.
   *
   * @private
   * @param {Function} assigner The function to assign values.
   * @returns {Function} Returns the new assigner function.
   */
  function createAssigner(assigner) {
    return baseRest(function(object, sources) {
      var index = -1,
          length = sources.length,
          customizer = length > 1 ? sources[length - 1] : undefined,
          guard = length > 2 ? sources[2] : undefined;

      customizer = (assigner.length > 3 && typeof customizer == 'function')
        ? (length--, customizer)
        : undefined;

      if (guard && isIterateeCall(sources[0], sources[1], guard)) {
        customizer = length < 3 ? undefined : customizer;
        length = 1;
      }
      object = Object(object);
      while (++index < length) {
        var source = sources[index];
        if (source) {
          assigner(object, source, index, customizer);
        }
      }
      return object;
    });
  }

  /**
   * Creates a `baseEach` or `baseEachRight` function.
   *
   * @private
   * @param {Function} eachFunc The function to iterate over a collection.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new base function.
   */
  function createBaseEach(eachFunc, fromRight) {
    return function(collection, iteratee) {
      if (collection == null) {
        return collection;
      }
      if (!isArrayLike(collection)) {
        return eachFunc(collection, iteratee);
      }
      var length = collection.length,
          index = fromRight ? length : -1,
          iterable = Object(collection);

      while ((fromRight ? index-- : ++index < length)) {
        if (iteratee(iterable[index], index, iterable) === false) {
          break;
        }
      }
      return collection;
    };
  }

  /**
   * Creates a base function for methods like `_.forIn` and `_.forOwn`.
   *
   * @private
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new base function.
   */
  function createBaseFor(fromRight) {
    return function(object, iteratee, keysFunc) {
      var index = -1,
          iterable = Object(object),
          props = keysFunc(object),
          length = props.length;

      while (length--) {
        var key = props[fromRight ? length : ++index];
        if (iteratee(iterable[key], key, iterable) === false) {
          break;
        }
      }
      return object;
    };
  }

  /**
   * Creates a function that produces an instance of `Ctor` regardless of
   * whether it was invoked as part of a `new` expression or by `call` or `apply`.
   *
   * @private
   * @param {Function} Ctor The constructor to wrap.
   * @returns {Function} Returns the new wrapped function.
   */
  function createCtor(Ctor) {
    return function() {
      // Use a `switch` statement to work with class constructors. See
      // http://ecma-international.org/ecma-262/7.0/#sec-ecmascript-function-objects-call-thisargument-argumentslist
      // for more details.
      var args = arguments;
      switch (args.length) {
        case 0: return new Ctor;
        case 1: return new Ctor(args[0]);
        case 2: return new Ctor(args[0], args[1]);
        case 3: return new Ctor(args[0], args[1], args[2]);
        case 4: return new Ctor(args[0], args[1], args[2], args[3]);
        case 5: return new Ctor(args[0], args[1], args[2], args[3], args[4]);
        case 6: return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5]);
        case 7: return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
      }
      var thisBinding = baseCreate(Ctor.prototype),
          result = Ctor.apply(thisBinding, args);

      // Mimic the constructor's `return` behavior.
      // See https://es5.github.io/#x13.2.2 for more details.
      return isObject(result) ? result : thisBinding;
    };
  }

  /**
   * Creates a `_.find` or `_.findLast` function.
   *
   * @private
   * @param {Function} findIndexFunc The function to find the collection index.
   * @returns {Function} Returns the new find function.
   */
  function createFind(findIndexFunc) {
    return function(collection, predicate, fromIndex) {
      var iterable = Object(collection);
      if (!isArrayLike(collection)) {
        var iteratee = getIteratee(predicate, 3);
        collection = keys(collection);
        predicate = function(key) { return iteratee(iterable[key], key, iterable); };
      }
      var index = findIndexFunc(collection, predicate, fromIndex);
      return index > -1 ? iterable[iteratee ? collection[index] : index] : undefined;
    };
  }

  /**
   * Creates a function that wraps `func` to invoke it with optional `this`
   * binding of `thisArg`, partial application, and currying.
   *
   * @private
   * @param {Function|string} func The function or method name to wrap.
   * @param {number} bitmask The bitmask flags. See `createWrap` for more details.
   * @param {*} [thisArg] The `this` binding of `func`.
   * @param {Array} [partials] The arguments to prepend to those provided to
   *  the new function.
   * @param {Array} [holders] The `partials` placeholder indexes.
   * @param {Array} [partialsRight] The arguments to append to those provided
   *  to the new function.
   * @param {Array} [holdersRight] The `partialsRight` placeholder indexes.
   * @param {Array} [argPos] The argument positions of the new function.
   * @param {number} [ary] The arity cap of `func`.
   * @param {number} [arity] The arity of `func`.
   * @returns {Function} Returns the new wrapped function.
   */
  function createHybrid(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary, arity) {
    var isAry = bitmask & WRAP_ARY_FLAG,
        isBind = bitmask & WRAP_BIND_FLAG,
        isBindKey = bitmask & WRAP_BIND_KEY_FLAG,
        isCurried = bitmask & (WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG),
        isFlip = bitmask & WRAP_FLIP_FLAG,
        Ctor = isBindKey ? undefined : createCtor(func);

    function wrapper() {
      var length = arguments.length,
          args = Array(length),
          index = length;

      while (index--) {
        args[index] = arguments[index];
      }
      if (isCurried) {
        var placeholder = getHolder(wrapper),
            holdersCount = countHolders(args, placeholder);
      }
      if (partials) {
        args = composeArgs(args, partials, holders, isCurried);
      }
      if (partialsRight) {
        args = composeArgsRight(args, partialsRight, holdersRight, isCurried);
      }
      length -= holdersCount;
      if (isCurried && length < arity) {
        var newHolders = replaceHolders(args, placeholder);
        return createRecurry(
          func, bitmask, createHybrid, wrapper.placeholder, thisArg,
          args, newHolders, argPos, ary, arity - length
        );
      }
      var thisBinding = isBind ? thisArg : this,
          fn = isBindKey ? thisBinding[func] : func;

      length = args.length;
      if (argPos) {
        args = reorder(args, argPos);
      } else if (isFlip && length > 1) {
        args.reverse();
      }
      if (isAry && ary < length) {
        args.length = ary;
      }
      if (this && this !== root && this instanceof wrapper) {
        fn = Ctor || createCtor(fn);
      }
      return fn.apply(thisBinding, args);
    }
    return wrapper;
  }

  /**
   * Creates a `_.range` or `_.rangeRight` function.
   *
   * @private
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new range function.
   */
  function createRange(fromRight) {
    return function(start, end, step) {
      if (step && typeof step != 'number' && isIterateeCall(start, end, step)) {
        end = step = undefined;
      }
      // Ensure the sign of `-0` is preserved.
      start = toFinite(start);
      if (end === undefined) {
        end = start;
        start = 0;
      } else {
        end = toFinite(end);
      }
      step = step === undefined ? (start < end ? 1 : -1) : toFinite(step);
      return baseRange(start, end, step, fromRight);
    };
  }

  /**
   * Creates a function that wraps `func` to continue currying.
   *
   * @private
   * @param {Function} func The function to wrap.
   * @param {number} bitmask The bitmask flags. See `createWrap` for more details.
   * @param {Function} wrapFunc The function to create the `func` wrapper.
   * @param {*} placeholder The placeholder value.
   * @param {*} [thisArg] The `this` binding of `func`.
   * @param {Array} [partials] The arguments to prepend to those provided to
   *  the new function.
   * @param {Array} [holders] The `partials` placeholder indexes.
   * @param {Array} [argPos] The argument positions of the new function.
   * @param {number} [ary] The arity cap of `func`.
   * @param {number} [arity] The arity of `func`.
   * @returns {Function} Returns the new wrapped function.
   */
  function createRecurry(func, bitmask, wrapFunc, placeholder, thisArg, partials, holders, argPos, ary, arity) {
    var isCurry = bitmask & WRAP_CURRY_FLAG,
        newHolders = isCurry ? holders : undefined,
        newHoldersRight = isCurry ? undefined : holders,
        newPartials = isCurry ? partials : undefined,
        newPartialsRight = isCurry ? undefined : partials;

    bitmask |= (isCurry ? WRAP_PARTIAL_FLAG : WRAP_PARTIAL_RIGHT_FLAG);
    bitmask &= ~(isCurry ? WRAP_PARTIAL_RIGHT_FLAG : WRAP_PARTIAL_FLAG);

    if (!(bitmask & WRAP_CURRY_BOUND_FLAG)) {
      bitmask &= ~(WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG);
    }
    var newData = [
      func, bitmask, thisArg, newPartials, newHolders, newPartialsRight,
      newHoldersRight, argPos, ary, arity
    ];

    var result = wrapFunc.apply(undefined, newData);
    if (isLaziable(func)) {
      setData(result, newData);
    }
    result.placeholder = placeholder;
    return setWrapToString(result, func, bitmask);
  }

  /**
   * Creates a set object of `values`.
   *
   * @private
   * @param {Array} values The values to add to the set.
   * @returns {Object} Returns the new set.
   */
  var createSet = !(Set && (1 / setToArray(new Set([,-0]))[1]) == INFINITY) ? noop : function(values) {
    return new Set(values);
  };

  /**
   * Used by `_.omit` to customize its `_.cloneDeep` use to only clone plain
   * objects.
   *
   * @private
   * @param {*} value The value to inspect.
   * @param {string} key The key of the property to inspect.
   * @returns {*} Returns the uncloned value or `undefined` to defer cloning to `_.cloneDeep`.
   */
  function customOmitClone(value) {
    return isPlainObject(value) ? undefined : value;
  }

  /**
   * A specialized version of `baseIsEqualDeep` for arrays with support for
   * partial deep comparisons.
   *
   * @private
   * @param {Array} array The array to compare.
   * @param {Array} other The other array to compare.
   * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
   * @param {Function} customizer The function to customize comparisons.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Object} stack Tracks traversed `array` and `other` objects.
   * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
   */
  function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
    var isPartial = bitmask & COMPARE_PARTIAL_FLAG,
        arrLength = array.length,
        othLength = other.length;

    if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
      return false;
    }
    // Check that cyclic values are equal.
    var arrStacked = stack.get(array);
    var othStacked = stack.get(other);
    if (arrStacked && othStacked) {
      return arrStacked == other && othStacked == array;
    }
    var index = -1,
        result = true,
        seen = (bitmask & COMPARE_UNORDERED_FLAG) ? new SetCache : undefined;

    stack.set(array, other);
    stack.set(other, array);

    // Ignore non-index properties.
    while (++index < arrLength) {
      var arrValue = array[index],
          othValue = other[index];

      if (customizer) {
        var compared = isPartial
          ? customizer(othValue, arrValue, index, other, array, stack)
          : customizer(arrValue, othValue, index, array, other, stack);
      }
      if (compared !== undefined) {
        if (compared) {
          continue;
        }
        result = false;
        break;
      }
      // Recursively compare arrays (susceptible to call stack limits).
      if (seen) {
        if (!arraySome(other, function(othValue, othIndex) {
              if (!cacheHas(seen, othIndex) &&
                  (arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
                return seen.push(othIndex);
              }
            })) {
          result = false;
          break;
        }
      } else if (!(
            arrValue === othValue ||
              equalFunc(arrValue, othValue, bitmask, customizer, stack)
          )) {
        result = false;
        break;
      }
    }
    stack['delete'](array);
    stack['delete'](other);
    return result;
  }

  /**
   * A specialized version of `baseIsEqualDeep` for comparing objects of
   * the same `toStringTag`.
   *
   * **Note:** This function only supports comparing values with tags of
   * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {string} tag The `toStringTag` of the objects to compare.
   * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
   * @param {Function} customizer The function to customize comparisons.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Object} stack Tracks traversed `object` and `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
    switch (tag) {
      case dataViewTag:
        if ((object.byteLength != other.byteLength) ||
            (object.byteOffset != other.byteOffset)) {
          return false;
        }
        object = object.buffer;
        other = other.buffer;

      case arrayBufferTag:
        if ((object.byteLength != other.byteLength) ||
            !equalFunc(new Uint8Array(object), new Uint8Array(other))) {
          return false;
        }
        return true;

      case boolTag:
      case dateTag:
      case numberTag:
        // Coerce booleans to `1` or `0` and dates to milliseconds.
        // Invalid dates are coerced to `NaN`.
        return eq(+object, +other);

      case errorTag:
        return object.name == other.name && object.message == other.message;

      case regexpTag:
      case stringTag:
        // Coerce regexes to strings and treat strings, primitives and objects,
        // as equal. See http://www.ecma-international.org/ecma-262/7.0/#sec-regexp.prototype.tostring
        // for more details.
        return object == (other + '');

      case mapTag:
        var convert = mapToArray;

      case setTag:
        var isPartial = bitmask & COMPARE_PARTIAL_FLAG;
        convert || (convert = setToArray);

        if (object.size != other.size && !isPartial) {
          return false;
        }
        // Assume cyclic values are equal.
        var stacked = stack.get(object);
        if (stacked) {
          return stacked == other;
        }
        bitmask |= COMPARE_UNORDERED_FLAG;

        // Recursively compare objects (susceptible to call stack limits).
        stack.set(object, other);
        var result = equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
        stack['delete'](object);
        return result;

      case symbolTag:
        if (symbolValueOf) {
          return symbolValueOf.call(object) == symbolValueOf.call(other);
        }
    }
    return false;
  }

  /**
   * A specialized version of `baseIsEqualDeep` for objects with support for
   * partial deep comparisons.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
   * @param {Function} customizer The function to customize comparisons.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Object} stack Tracks traversed `object` and `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
    var isPartial = bitmask & COMPARE_PARTIAL_FLAG,
        objProps = getAllKeys(object),
        objLength = objProps.length,
        othProps = getAllKeys(other),
        othLength = othProps.length;

    if (objLength != othLength && !isPartial) {
      return false;
    }
    var index = objLength;
    while (index--) {
      var key = objProps[index];
      if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
        return false;
      }
    }
    // Check that cyclic values are equal.
    var objStacked = stack.get(object);
    var othStacked = stack.get(other);
    if (objStacked && othStacked) {
      return objStacked == other && othStacked == object;
    }
    var result = true;
    stack.set(object, other);
    stack.set(other, object);

    var skipCtor = isPartial;
    while (++index < objLength) {
      key = objProps[index];
      var objValue = object[key],
          othValue = other[key];

      if (customizer) {
        var compared = isPartial
          ? customizer(othValue, objValue, key, other, object, stack)
          : customizer(objValue, othValue, key, object, other, stack);
      }
      // Recursively compare objects (susceptible to call stack limits).
      if (!(compared === undefined
            ? (objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack))
            : compared
          )) {
        result = false;
        break;
      }
      skipCtor || (skipCtor = key == 'constructor');
    }
    if (result && !skipCtor) {
      var objCtor = object.constructor,
          othCtor = other.constructor;

      // Non `Object` object instances with different constructors are not equal.
      if (objCtor != othCtor &&
          ('constructor' in object && 'constructor' in other) &&
          !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
            typeof othCtor == 'function' && othCtor instanceof othCtor)) {
        result = false;
      }
    }
    stack['delete'](object);
    stack['delete'](other);
    return result;
  }

  /**
   * A specialized version of `baseRest` which flattens the rest array.
   *
   * @private
   * @param {Function} func The function to apply a rest parameter to.
   * @returns {Function} Returns the new function.
   */
  function flatRest(func) {
    return setToString(overRest(func, undefined, flatten), func + '');
  }

  /**
   * Creates an array of own enumerable property names and symbols of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names and symbols.
   */
  function getAllKeys(object) {
    return baseGetAllKeys(object, keys, getSymbols);
  }

  /**
   * Creates an array of own and inherited enumerable property names and
   * symbols of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names and symbols.
   */
  function getAllKeysIn(object) {
    return baseGetAllKeys(object, keysIn, getSymbolsIn);
  }

  /**
   * Gets metadata for `func`.
   *
   * @private
   * @param {Function} func The function to query.
   * @returns {*} Returns the metadata for `func`.
   */
  var getData = !metaMap ? noop : function(func) {
    return metaMap.get(func);
  };

  /**
   * Gets the name of `func`.
   *
   * @private
   * @param {Function} func The function to query.
   * @returns {string} Returns the function name.
   */
  function getFuncName(func) {
    var result = (func.name + ''),
        array = realNames[result],
        length = hasOwnProperty.call(realNames, result) ? array.length : 0;

    while (length--) {
      var data = array[length],
          otherFunc = data.func;
      if (otherFunc == null || otherFunc == func) {
        return data.name;
      }
    }
    return result;
  }

  /**
   * Gets the argument placeholder value for `func`.
   *
   * @private
   * @param {Function} func The function to inspect.
   * @returns {*} Returns the placeholder value.
   */
  function getHolder(func) {
    var object = hasOwnProperty.call(lodash, 'placeholder') ? lodash : func;
    return object.placeholder;
  }

  /**
   * Gets the appropriate "iteratee" function. If `_.iteratee` is customized,
   * this function returns the custom method, otherwise it returns `baseIteratee`.
   * If arguments are provided, the chosen function is invoked with them and
   * its result is returned.
   *
   * @private
   * @param {*} [value] The value to convert to an iteratee.
   * @param {number} [arity] The arity of the created iteratee.
   * @returns {Function} Returns the chosen function or its result.
   */
  function getIteratee() {
    var result = lodash.iteratee || iteratee;
    result = result === iteratee ? baseIteratee : result;
    return arguments.length ? result(arguments[0], arguments[1]) : result;
  }

  /**
   * Gets the data for `map`.
   *
   * @private
   * @param {Object} map The map to query.
   * @param {string} key The reference key.
   * @returns {*} Returns the map data.
   */
  function getMapData(map, key) {
    var data = map.__data__;
    return isKeyable(key)
      ? data[typeof key == 'string' ? 'string' : 'hash']
      : data.map;
  }

  /**
   * Gets the property names, values, and compare flags of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the match data of `object`.
   */
  function getMatchData(object) {
    var result = keys(object),
        length = result.length;

    while (length--) {
      var key = result[length],
          value = object[key];

      result[length] = [key, value, isStrictComparable(value)];
    }
    return result;
  }

  /**
   * Gets the native function at `key` of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {string} key The key of the method to get.
   * @returns {*} Returns the function if it's native, else `undefined`.
   */
  function getNative(object, key) {
    var value = getValue(object, key);
    return baseIsNative(value) ? value : undefined;
  }

  /**
   * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
   *
   * @private
   * @param {*} value The value to query.
   * @returns {string} Returns the raw `toStringTag`.
   */
  function getRawTag(value) {
    var isOwn = hasOwnProperty.call(value, symToStringTag),
        tag = value[symToStringTag];

    try {
      value[symToStringTag] = undefined;
      var unmasked = true;
    } catch (e) {}

    var result = nativeObjectToString.call(value);
    if (unmasked) {
      if (isOwn) {
        value[symToStringTag] = tag;
      } else {
        delete value[symToStringTag];
      }
    }
    return result;
  }

  /**
   * Creates an array of the own enumerable symbols of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of symbols.
   */
  var getSymbols = !nativeGetSymbols ? stubArray : function(object) {
    if (object == null) {
      return [];
    }
    object = Object(object);
    return arrayFilter(nativeGetSymbols(object), function(symbol) {
      return propertyIsEnumerable.call(object, symbol);
    });
  };

  /**
   * Creates an array of the own and inherited enumerable symbols of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of symbols.
   */
  var getSymbolsIn = !nativeGetSymbols ? stubArray : function(object) {
    var result = [];
    while (object) {
      arrayPush(result, getSymbols(object));
      object = getPrototype(object);
    }
    return result;
  };

  /**
   * Gets the `toStringTag` of `value`.
   *
   * @private
   * @param {*} value The value to query.
   * @returns {string} Returns the `toStringTag`.
   */
  var getTag = baseGetTag;

  // Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
  if ((DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag) ||
      (Map && getTag(new Map) != mapTag) ||
      (Promise && getTag(Promise.resolve()) != promiseTag) ||
      (Set && getTag(new Set) != setTag) ||
      (WeakMap && getTag(new WeakMap) != weakMapTag)) {
    getTag = function(value) {
      var result = baseGetTag(value),
          Ctor = result == objectTag ? value.constructor : undefined,
          ctorString = Ctor ? toSource(Ctor) : '';

      if (ctorString) {
        switch (ctorString) {
          case dataViewCtorString: return dataViewTag;
          case mapCtorString: return mapTag;
          case promiseCtorString: return promiseTag;
          case setCtorString: return setTag;
          case weakMapCtorString: return weakMapTag;
        }
      }
      return result;
    };
  }

  /**
   * Gets the view, applying any `transforms` to the `start` and `end` positions.
   *
   * @private
   * @param {number} start The start of the view.
   * @param {number} end The end of the view.
   * @param {Array} transforms The transformations to apply to the view.
   * @returns {Object} Returns an object containing the `start` and `end`
   *  positions of the view.
   */
  function getView(start, end, transforms) {
    var index = -1,
        length = transforms.length;

    while (++index < length) {
      var data = transforms[index],
          size = data.size;

      switch (data.type) {
        case 'drop':      start += size; break;
        case 'dropRight': end -= size; break;
        case 'take':      end = nativeMin(end, start + size); break;
        case 'takeRight': start = nativeMax(start, end - size); break;
      }
    }
    return { 'start': start, 'end': end };
  }

  /**
   * Extracts wrapper details from the `source` body comment.
   *
   * @private
   * @param {string} source The source to inspect.
   * @returns {Array} Returns the wrapper details.
   */
  function getWrapDetails(source) {
    var match = source.match(reWrapDetails);
    return match ? match[1].split(reSplitDetails) : [];
  }

  /**
   * Checks if `path` exists on `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array|string} path The path to check.
   * @param {Function} hasFunc The function to check properties.
   * @returns {boolean} Returns `true` if `path` exists, else `false`.
   */
  function hasPath(object, path, hasFunc) {
    path = castPath(path, object);

    var index = -1,
        length = path.length,
        result = false;

    while (++index < length) {
      var key = toKey(path[index]);
      if (!(result = object != null && hasFunc(object, key))) {
        break;
      }
      object = object[key];
    }
    if (result || ++index != length) {
      return result;
    }
    length = object == null ? 0 : object.length;
    return !!length && isLength(length) && isIndex(key, length) &&
      (isArray(object) || isArguments(object));
  }

  /**
   * Initializes an array clone.
   *
   * @private
   * @param {Array} array The array to clone.
   * @returns {Array} Returns the initialized clone.
   */
  function initCloneArray(array) {
    var length = array.length,
        result = new array.constructor(length);

    // Add properties assigned by `RegExp#exec`.
    if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
      result.index = array.index;
      result.input = array.input;
    }
    return result;
  }

  /**
   * Initializes an object clone.
   *
   * @private
   * @param {Object} object The object to clone.
   * @returns {Object} Returns the initialized clone.
   */
  function initCloneObject(object) {
    return (typeof object.constructor == 'function' && !isPrototype(object))
      ? baseCreate(getPrototype(object))
      : {};
  }

  /**
   * Initializes an object clone based on its `toStringTag`.
   *
   * **Note:** This function only supports cloning values with tags of
   * `Boolean`, `Date`, `Error`, `Map`, `Number`, `RegExp`, `Set`, or `String`.
   *
   * @private
   * @param {Object} object The object to clone.
   * @param {string} tag The `toStringTag` of the object to clone.
   * @param {boolean} [isDeep] Specify a deep clone.
   * @returns {Object} Returns the initialized clone.
   */
  function initCloneByTag(object, tag, isDeep) {
    var Ctor = object.constructor;
    switch (tag) {
      case arrayBufferTag:
        return cloneArrayBuffer(object);

      case boolTag:
      case dateTag:
        return new Ctor(+object);

      case dataViewTag:
        return cloneDataView(object, isDeep);

      case float32Tag: case float64Tag:
      case int8Tag: case int16Tag: case int32Tag:
      case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
        return cloneTypedArray(object, isDeep);

      case mapTag:
        return new Ctor;

      case numberTag:
      case stringTag:
        return new Ctor(object);

      case regexpTag:
        return cloneRegExp(object);

      case setTag:
        return new Ctor;

      case symbolTag:
        return cloneSymbol(object);
    }
  }

  /**
   * Inserts wrapper `details` in a comment at the top of the `source` body.
   *
   * @private
   * @param {string} source The source to modify.
   * @returns {Array} details The details to insert.
   * @returns {string} Returns the modified source.
   */
  function insertWrapDetails(source, details) {
    var length = details.length;
    if (!length) {
      return source;
    }
    var lastIndex = length - 1;
    details[lastIndex] = (length > 1 ? '& ' : '') + details[lastIndex];
    details = details.join(length > 2 ? ', ' : ' ');
    return source.replace(reWrapComment, '{\n/* [wrapped with ' + details + '] */\n');
  }

  /**
   * Checks if `value` is a flattenable `arguments` object or array.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is flattenable, else `false`.
   */
  function isFlattenable(value) {
    return isArray(value) || isArguments(value) ||
      !!(spreadableSymbol && value && value[spreadableSymbol]);
  }

  /**
   * Checks if `value` is a valid array-like index.
   *
   * @private
   * @param {*} value The value to check.
   * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
   * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
   */
  function isIndex(value, length) {
    var type = typeof value;
    length = length == null ? MAX_SAFE_INTEGER : length;

    return !!length &&
      (type == 'number' ||
        (type != 'symbol' && reIsUint.test(value))) &&
          (value > -1 && value % 1 == 0 && value < length);
  }

  /**
   * Checks if the given arguments are from an iteratee call.
   *
   * @private
   * @param {*} value The potential iteratee value argument.
   * @param {*} index The potential iteratee index or key argument.
   * @param {*} object The potential iteratee object argument.
   * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
   *  else `false`.
   */
  function isIterateeCall(value, index, object) {
    if (!isObject(object)) {
      return false;
    }
    var type = typeof index;
    if (type == 'number'
          ? (isArrayLike(object) && isIndex(index, object.length))
          : (type == 'string' && index in object)
        ) {
      return eq(object[index], value);
    }
    return false;
  }

  /**
   * Checks if `value` is a property name and not a property path.
   *
   * @private
   * @param {*} value The value to check.
   * @param {Object} [object] The object to query keys on.
   * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
   */
  function isKey(value, object) {
    if (isArray(value)) {
      return false;
    }
    var type = typeof value;
    if (type == 'number' || type == 'symbol' || type == 'boolean' ||
        value == null || isSymbol(value)) {
      return true;
    }
    return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
      (object != null && value in Object(object));
  }

  /**
   * Checks if `value` is suitable for use as unique object key.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
   */
  function isKeyable(value) {
    var type = typeof value;
    return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
      ? (value !== '__proto__')
      : (value === null);
  }

  /**
   * Checks if `func` has a lazy counterpart.
   *
   * @private
   * @param {Function} func The function to check.
   * @returns {boolean} Returns `true` if `func` has a lazy counterpart,
   *  else `false`.
   */
  function isLaziable(func) {
    var funcName = getFuncName(func),
        other = lodash[funcName];

    if (typeof other != 'function' || !(funcName in LazyWrapper.prototype)) {
      return false;
    }
    if (func === other) {
      return true;
    }
    var data = getData(other);
    return !!data && func === data[0];
  }

  /**
   * Checks if `func` has its source masked.
   *
   * @private
   * @param {Function} func The function to check.
   * @returns {boolean} Returns `true` if `func` is masked, else `false`.
   */
  function isMasked(func) {
    return !!maskSrcKey && (maskSrcKey in func);
  }

  /**
   * Checks if `value` is likely a prototype object.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
   */
  function isPrototype(value) {
    var Ctor = value && value.constructor,
        proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

    return value === proto;
  }

  /**
   * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` if suitable for strict
   *  equality comparisons, else `false`.
   */
  function isStrictComparable(value) {
    return value === value && !isObject(value);
  }

  /**
   * A specialized version of `matchesProperty` for source values suitable
   * for strict equality comparisons, i.e. `===`.
   *
   * @private
   * @param {string} key The key of the property to get.
   * @param {*} srcValue The value to match.
   * @returns {Function} Returns the new spec function.
   */
  function matchesStrictComparable(key, srcValue) {
    return function(object) {
      if (object == null) {
        return false;
      }
      return object[key] === srcValue &&
        (srcValue !== undefined || (key in Object(object)));
    };
  }

  /**
   * A specialized version of `_.memoize` which clears the memoized function's
   * cache when it exceeds `MAX_MEMOIZE_SIZE`.
   *
   * @private
   * @param {Function} func The function to have its output memoized.
   * @returns {Function} Returns the new memoized function.
   */
  function memoizeCapped(func) {
    var result = memoize(func, function(key) {
      if (cache.size === MAX_MEMOIZE_SIZE) {
        cache.clear();
      }
      return key;
    });

    var cache = result.cache;
    return result;
  }

  /**
   * This function is like
   * [`Object.keys`](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
   * except that it includes inherited enumerable properties.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   */
  function nativeKeysIn(object) {
    var result = [];
    if (object != null) {
      for (var key in Object(object)) {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * Converts `value` to a string using `Object.prototype.toString`.
   *
   * @private
   * @param {*} value The value to convert.
   * @returns {string} Returns the converted string.
   */
  function objectToString(value) {
    return nativeObjectToString.call(value);
  }

  /**
   * A specialized version of `baseRest` which transforms the rest array.
   *
   * @private
   * @param {Function} func The function to apply a rest parameter to.
   * @param {number} [start=func.length-1] The start position of the rest parameter.
   * @param {Function} transform The rest array transform.
   * @returns {Function} Returns the new function.
   */
  function overRest(func, start, transform) {
    start = nativeMax(start === undefined ? (func.length - 1) : start, 0);
    return function() {
      var args = arguments,
          index = -1,
          length = nativeMax(args.length - start, 0),
          array = Array(length);

      while (++index < length) {
        array[index] = args[start + index];
      }
      index = -1;
      var otherArgs = Array(start + 1);
      while (++index < start) {
        otherArgs[index] = args[index];
      }
      otherArgs[start] = transform(array);
      return apply(func, this, otherArgs);
    };
  }

  /**
   * Gets the parent value at `path` of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array} path The path to get the parent value of.
   * @returns {*} Returns the parent value.
   */
  function parent(object, path) {
    return path.length < 2 ? object : baseGet(object, baseSlice(path, 0, -1));
  }

  /**
   * Reorder `array` according to the specified indexes where the element at
   * the first index is assigned as the first element, the element at
   * the second index is assigned as the second element, and so on.
   *
   * @private
   * @param {Array} array The array to reorder.
   * @param {Array} indexes The arranged array indexes.
   * @returns {Array} Returns `array`.
   */
  function reorder(array, indexes) {
    var arrLength = array.length,
        length = nativeMin(indexes.length, arrLength),
        oldArray = copyArray(array);

    while (length--) {
      var index = indexes[length];
      array[length] = isIndex(index, arrLength) ? oldArray[index] : undefined;
    }
    return array;
  }

  /**
   * Gets the value at `key`, unless `key` is "__proto__" or "constructor".
   *
   * @private
   * @param {Object} object The object to query.
   * @param {string} key The key of the property to get.
   * @returns {*} Returns the property value.
   */
  function safeGet(object, key) {
    if (key === 'constructor' && typeof object[key] === 'function') {
      return;
    }

    if (key == '__proto__') {
      return;
    }

    return object[key];
  }

  /**
   * Sets metadata for `func`.
   *
   * **Note:** If this function becomes hot, i.e. is invoked a lot in a short
   * period of time, it will trip its breaker and transition to an identity
   * function to avoid garbage collection pauses in V8. See
   * [V8 issue 2070](https://bugs.chromium.org/p/v8/issues/detail?id=2070)
   * for more details.
   *
   * @private
   * @param {Function} func The function to associate metadata with.
   * @param {*} data The metadata.
   * @returns {Function} Returns `func`.
   */
  var setData = shortOut(baseSetData);

  /**
   * Sets the `toString` method of `func` to return `string`.
   *
   * @private
   * @param {Function} func The function to modify.
   * @param {Function} string The `toString` result.
   * @returns {Function} Returns `func`.
   */
  var setToString = shortOut(baseSetToString);

  /**
   * Sets the `toString` method of `wrapper` to mimic the source of `reference`
   * with wrapper details in a comment at the top of the source body.
   *
   * @private
   * @param {Function} wrapper The function to modify.
   * @param {Function} reference The reference function.
   * @param {number} bitmask The bitmask flags. See `createWrap` for more details.
   * @returns {Function} Returns `wrapper`.
   */
  function setWrapToString(wrapper, reference, bitmask) {
    var source = (reference + '');
    return setToString(wrapper, insertWrapDetails(source, updateWrapDetails(getWrapDetails(source), bitmask)));
  }

  /**
   * Creates a function that'll short out and invoke `identity` instead
   * of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
   * milliseconds.
   *
   * @private
   * @param {Function} func The function to restrict.
   * @returns {Function} Returns the new shortable function.
   */
  function shortOut(func) {
    var count = 0,
        lastCalled = 0;

    return function() {
      var stamp = nativeNow(),
          remaining = HOT_SPAN - (stamp - lastCalled);

      lastCalled = stamp;
      if (remaining > 0) {
        if (++count >= HOT_COUNT) {
          return arguments[0];
        }
      } else {
        count = 0;
      }
      return func.apply(undefined, arguments);
    };
  }

  /**
   * Converts `string` to a property path array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the property path array.
   */
  var stringToPath = memoizeCapped(function(string) {
    var result = [];
    if (string.charCodeAt(0) === 46 /* . */) {
      result.push('');
    }
    string.replace(rePropName, function(match, number, quote, subString) {
      result.push(quote ? subString.replace(reEscapeChar, '$1') : (number || match));
    });
    return result;
  });

  /**
   * Converts `value` to a string key if it's not a string or symbol.
   *
   * @private
   * @param {*} value The value to inspect.
   * @returns {string|symbol} Returns the key.
   */
  function toKey(value) {
    if (typeof value == 'string' || isSymbol(value)) {
      return value;
    }
    var result = (value + '');
    return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
  }

  /**
   * Converts `func` to its source code.
   *
   * @private
   * @param {Function} func The function to convert.
   * @returns {string} Returns the source code.
   */
  function toSource(func) {
    if (func != null) {
      try {
        return funcToString.call(func);
      } catch (e) {}
      try {
        return (func + '');
      } catch (e) {}
    }
    return '';
  }

  /**
   * Updates wrapper `details` based on `bitmask` flags.
   *
   * @private
   * @returns {Array} details The details to modify.
   * @param {number} bitmask The bitmask flags. See `createWrap` for more details.
   * @returns {Array} Returns `details`.
   */
  function updateWrapDetails(details, bitmask) {
    arrayEach(wrapFlags, function(pair) {
      var value = '_.' + pair[0];
      if ((bitmask & pair[1]) && !arrayIncludes(details, value)) {
        details.push(value);
      }
    });
    return details.sort();
  }

  /**
   * Creates a clone of `wrapper`.
   *
   * @private
   * @param {Object} wrapper The wrapper to clone.
   * @returns {Object} Returns the cloned wrapper.
   */
  function wrapperClone(wrapper) {
    if (wrapper instanceof LazyWrapper) {
      return wrapper.clone();
    }
    var result = new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__);
    result.__actions__ = copyArray(wrapper.__actions__);
    result.__index__  = wrapper.__index__;
    result.__values__ = wrapper.__values__;
    return result;
  }

  /*------------------------------------------------------------------------*/

  /**
   * Creates an array with all falsey values removed. The values `false`, `null`,
   * `0`, `""`, `undefined`, and `NaN` are falsey.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Array
   * @param {Array} array The array to compact.
   * @returns {Array} Returns the new array of filtered values.
   * @example
   *
   * _.compact([0, 1, false, 2, '', 3]);
   * // => [1, 2, 3]
   */
  function compact(array) {
    var index = -1,
        length = array == null ? 0 : array.length,
        resIndex = 0,
        result = [];

    while (++index < length) {
      var value = array[index];
      if (value) {
        result[resIndex++] = value;
      }
    }
    return result;
  }

  /**
   * This method is like `_.find` except that it returns the index of the first
   * element `predicate` returns truthy for instead of the element itself.
   *
   * @static
   * @memberOf _
   * @since 1.1.0
   * @category Array
   * @param {Array} array The array to inspect.
   * @param {Function} [predicate=_.identity] The function invoked per iteration.
   * @param {number} [fromIndex=0] The index to search from.
   * @returns {number} Returns the index of the found element, else `-1`.
   * @example
   *
   * var users = [
   *   { 'user': 'barney',  'active': false },
   *   { 'user': 'fred',    'active': false },
   *   { 'user': 'pebbles', 'active': true }
   * ];
   *
   * _.findIndex(users, function(o) { return o.user == 'barney'; });
   * // => 0
   *
   * // The `_.matches` iteratee shorthand.
   * _.findIndex(users, { 'user': 'fred', 'active': false });
   * // => 1
   *
   * // The `_.matchesProperty` iteratee shorthand.
   * _.findIndex(users, ['active', false]);
   * // => 0
   *
   * // The `_.property` iteratee shorthand.
   * _.findIndex(users, 'active');
   * // => 2
   */
  function findIndex(array, predicate, fromIndex) {
    var length = array == null ? 0 : array.length;
    if (!length) {
      return -1;
    }
    var index = fromIndex == null ? 0 : toInteger(fromIndex);
    if (index < 0) {
      index = nativeMax(length + index, 0);
    }
    return baseFindIndex(array, getIteratee(predicate, 3), index);
  }

  /**
   * Flattens `array` a single level deep.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Array
   * @param {Array} array The array to flatten.
   * @returns {Array} Returns the new flattened array.
   * @example
   *
   * _.flatten([1, [2, [3, [4]], 5]]);
   * // => [1, 2, [3, [4]], 5]
   */
  function flatten(array) {
    var length = array == null ? 0 : array.length;
    return length ? baseFlatten(array, 1) : [];
  }

  /**
   * Gets the first element of `array`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @alias first
   * @category Array
   * @param {Array} array The array to query.
   * @returns {*} Returns the first element of `array`.
   * @example
   *
   * _.head([1, 2, 3]);
   * // => 1
   *
   * _.head([]);
   * // => undefined
   */
  function head(array) {
    return (array && array.length) ? array[0] : undefined;
  }

  /**
   * Creates an array of unique values that are included in all given arrays
   * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
   * for equality comparisons. The order and references of result values are
   * determined by the first array.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Array
   * @param {...Array} [arrays] The arrays to inspect.
   * @returns {Array} Returns the new array of intersecting values.
   * @example
   *
   * _.intersection([2, 1], [2, 3]);
   * // => [2]
   */
  var intersection = baseRest(function(arrays) {
    var mapped = arrayMap(arrays, castArrayLikeObject);
    return (mapped.length && mapped[0] === arrays[0])
      ? baseIntersection(mapped)
      : [];
  });

  /**
   * Gets the last element of `array`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Array
   * @param {Array} array The array to query.
   * @returns {*} Returns the last element of `array`.
   * @example
   *
   * _.last([1, 2, 3]);
   * // => 3
   */
  function last(array) {
    var length = array == null ? 0 : array.length;
    return length ? array[length - 1] : undefined;
  }

  /**
   * Reverses `array` so that the first element becomes the last, the second
   * element becomes the second to last, and so on.
   *
   * **Note:** This method mutates `array` and is based on
   * [`Array#reverse`](https://mdn.io/Array/reverse).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Array
   * @param {Array} array The array to modify.
   * @returns {Array} Returns `array`.
   * @example
   *
   * var array = [1, 2, 3];
   *
   * _.reverse(array);
   * // => [3, 2, 1]
   *
   * console.log(array);
   * // => [3, 2, 1]
   */
  function reverse(array) {
    return array == null ? array : nativeReverse.call(array);
  }

  /**
   * Creates an array of unique values, in order, from all given arrays using
   * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
   * for equality comparisons.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Array
   * @param {...Array} [arrays] The arrays to inspect.
   * @returns {Array} Returns the new array of combined values.
   * @example
   *
   * _.union([2], [1, 2]);
   * // => [2, 1]
   */
  var union = baseRest(function(arrays) {
    return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true));
  });

  /**
   * Creates a duplicate-free version of an array, using
   * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
   * for equality comparisons, in which only the first occurrence of each element
   * is kept. The order of result values is determined by the order they occur
   * in the array.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Array
   * @param {Array} array The array to inspect.
   * @returns {Array} Returns the new duplicate free array.
   * @example
   *
   * _.uniq([2, 1, 2]);
   * // => [2, 1]
   */
  function uniq(array) {
    return (array && array.length) ? baseUniq(array) : [];
  }

  /**
   * Creates an array excluding all given values using
   * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
   * for equality comparisons.
   *
   * **Note:** Unlike `_.pull`, this method returns a new array.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Array
   * @param {Array} array The array to inspect.
   * @param {...*} [values] The values to exclude.
   * @returns {Array} Returns the new array of filtered values.
   * @see _.difference, _.xor
   * @example
   *
   * _.without([2, 1, 2, 3], 1, 2);
   * // => [3]
   */
  var without = baseRest(function(array, values) {
    return isArrayLikeObject(array)
      ? baseDifference(array, values)
      : [];
  });

  /*------------------------------------------------------------------------*/

  /**
   * Creates a `lodash` wrapper instance that wraps `value` with explicit method
   * chain sequences enabled. The result of such sequences must be unwrapped
   * with `_#value`.
   *
   * @static
   * @memberOf _
   * @since 1.3.0
   * @category Seq
   * @param {*} value The value to wrap.
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * var users = [
   *   { 'user': 'barney',  'age': 36 },
   *   { 'user': 'fred',    'age': 40 },
   *   { 'user': 'pebbles', 'age': 1 }
   * ];
   *
   * var youngest = _
   *   .chain(users)
   *   .sortBy('age')
   *   .map(function(o) {
   *     return o.user + ' is ' + o.age;
   *   })
   *   .head()
   *   .value();
   * // => 'pebbles is 1'
   */
  function chain(value) {
    var result = lodash(value);
    result.__chain__ = true;
    return result;
  }

  /**
   * This method invokes `interceptor` and returns `value`. The interceptor
   * is invoked with one argument; (value). The purpose of this method is to
   * "tap into" a method chain sequence in order to modify intermediate results.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Seq
   * @param {*} value The value to provide to `interceptor`.
   * @param {Function} interceptor The function to invoke.
   * @returns {*} Returns `value`.
   * @example
   *
   * _([1, 2, 3])
   *  .tap(function(array) {
   *    // Mutate input array.
   *    array.pop();
   *  })
   *  .reverse()
   *  .value();
   * // => [2, 1]
   */
  function tap(value, interceptor) {
    interceptor(value);
    return value;
  }

  /**
   * This method is like `_.tap` except that it returns the result of `interceptor`.
   * The purpose of this method is to "pass thru" values replacing intermediate
   * results in a method chain sequence.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Seq
   * @param {*} value The value to provide to `interceptor`.
   * @param {Function} interceptor The function to invoke.
   * @returns {*} Returns the result of `interceptor`.
   * @example
   *
   * _('  abc  ')
   *  .chain()
   *  .trim()
   *  .thru(function(value) {
   *    return [value];
   *  })
   *  .value();
   * // => ['abc']
   */
  function thru(value, interceptor) {
    return interceptor(value);
  }

  /**
   * This method is the wrapper version of `_.at`.
   *
   * @name at
   * @memberOf _
   * @since 1.0.0
   * @category Seq
   * @param {...(string|string[])} [paths] The property paths to pick.
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * var object = { 'a': [{ 'b': { 'c': 3 } }, 4] };
   *
   * _(object).at(['a[0].b.c', 'a[1]']).value();
   * // => [3, 4]
   */
  var wrapperAt = flatRest(function(paths) {
    var length = paths.length,
        start = length ? paths[0] : 0,
        value = this.__wrapped__,
        interceptor = function(object) { return baseAt(object, paths); };

    if (length > 1 || this.__actions__.length ||
        !(value instanceof LazyWrapper) || !isIndex(start)) {
      return this.thru(interceptor);
    }
    value = value.slice(start, +start + (length ? 1 : 0));
    value.__actions__.push({
      'func': thru,
      'args': [interceptor],
      'thisArg': undefined
    });
    return new LodashWrapper(value, this.__chain__).thru(function(array) {
      if (length && !array.length) {
        array.push(undefined);
      }
      return array;
    });
  });

  /**
   * Creates a `lodash` wrapper instance with explicit method chain sequences enabled.
   *
   * @name chain
   * @memberOf _
   * @since 0.1.0
   * @category Seq
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36 },
   *   { 'user': 'fred',   'age': 40 }
   * ];
   *
   * // A sequence without explicit chaining.
   * _(users).head();
   * // => { 'user': 'barney', 'age': 36 }
   *
   * // A sequence with explicit chaining.
   * _(users)
   *   .chain()
   *   .head()
   *   .pick('user')
   *   .value();
   * // => { 'user': 'barney' }
   */
  function wrapperChain() {
    return chain(this);
  }

  /**
   * Executes the chain sequence and returns the wrapped result.
   *
   * @name commit
   * @memberOf _
   * @since 3.2.0
   * @category Seq
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * var array = [1, 2];
   * var wrapped = _(array).push(3);
   *
   * console.log(array);
   * // => [1, 2]
   *
   * wrapped = wrapped.commit();
   * console.log(array);
   * // => [1, 2, 3]
   *
   * wrapped.last();
   * // => 3
   *
   * console.log(array);
   * // => [1, 2, 3]
   */
  function wrapperCommit() {
    return new LodashWrapper(this.value(), this.__chain__);
  }

  /**
   * Gets the next value on a wrapped object following the
   * [iterator protocol](https://mdn.io/iteration_protocols#iterator).
   *
   * @name next
   * @memberOf _
   * @since 4.0.0
   * @category Seq
   * @returns {Object} Returns the next iterator value.
   * @example
   *
   * var wrapped = _([1, 2]);
   *
   * wrapped.next();
   * // => { 'done': false, 'value': 1 }
   *
   * wrapped.next();
   * // => { 'done': false, 'value': 2 }
   *
   * wrapped.next();
   * // => { 'done': true, 'value': undefined }
   */
  function wrapperNext() {
    if (this.__values__ === undefined) {
      this.__values__ = toArray(this.value());
    }
    var done = this.__index__ >= this.__values__.length,
        value = done ? undefined : this.__values__[this.__index__++];

    return { 'done': done, 'value': value };
  }

  /**
   * Enables the wrapper to be iterable.
   *
   * @name Symbol.iterator
   * @memberOf _
   * @since 4.0.0
   * @category Seq
   * @returns {Object} Returns the wrapper object.
   * @example
   *
   * var wrapped = _([1, 2]);
   *
   * wrapped[Symbol.iterator]() === wrapped;
   * // => true
   *
   * Array.from(wrapped);
   * // => [1, 2]
   */
  function wrapperToIterator() {
    return this;
  }

  /**
   * Creates a clone of the chain sequence planting `value` as the wrapped value.
   *
   * @name plant
   * @memberOf _
   * @since 3.2.0
   * @category Seq
   * @param {*} value The value to plant.
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * function square(n) {
   *   return n * n;
   * }
   *
   * var wrapped = _([1, 2]).map(square);
   * var other = wrapped.plant([3, 4]);
   *
   * other.value();
   * // => [9, 16]
   *
   * wrapped.value();
   * // => [1, 4]
   */
  function wrapperPlant(value) {
    var result,
        parent = this;

    while (parent instanceof baseLodash) {
      var clone = wrapperClone(parent);
      clone.__index__ = 0;
      clone.__values__ = undefined;
      if (result) {
        previous.__wrapped__ = clone;
      } else {
        result = clone;
      }
      var previous = clone;
      parent = parent.__wrapped__;
    }
    previous.__wrapped__ = value;
    return result;
  }

  /**
   * This method is the wrapper version of `_.reverse`.
   *
   * **Note:** This method mutates the wrapped array.
   *
   * @name reverse
   * @memberOf _
   * @since 0.1.0
   * @category Seq
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * var array = [1, 2, 3];
   *
   * _(array).reverse().value()
   * // => [3, 2, 1]
   *
   * console.log(array);
   * // => [3, 2, 1]
   */
  function wrapperReverse() {
    var value = this.__wrapped__;
    if (value instanceof LazyWrapper) {
      var wrapped = value;
      if (this.__actions__.length) {
        wrapped = new LazyWrapper(this);
      }
      wrapped = wrapped.reverse();
      wrapped.__actions__.push({
        'func': thru,
        'args': [reverse],
        'thisArg': undefined
      });
      return new LodashWrapper(wrapped, this.__chain__);
    }
    return this.thru(reverse);
  }

  /**
   * Executes the chain sequence to resolve the unwrapped value.
   *
   * @name value
   * @memberOf _
   * @since 0.1.0
   * @alias toJSON, valueOf
   * @category Seq
   * @returns {*} Returns the resolved unwrapped value.
   * @example
   *
   * _([1, 2, 3]).value();
   * // => [1, 2, 3]
   */
  function wrapperValue() {
    return baseWrapperValue(this.__wrapped__, this.__actions__);
  }

  /*------------------------------------------------------------------------*/

  /**
   * Checks if `predicate` returns truthy for **all** elements of `collection`.
   * Iteration is stopped once `predicate` returns falsey. The predicate is
   * invoked with three arguments: (value, index|key, collection).
   *
   * **Note:** This method returns `true` for
   * [empty collections](https://en.wikipedia.org/wiki/Empty_set) because
   * [everything is true](https://en.wikipedia.org/wiki/Vacuous_truth) of
   * elements of empty collections.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} [predicate=_.identity] The function invoked per iteration.
   * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
   * @returns {boolean} Returns `true` if all elements pass the predicate check,
   *  else `false`.
   * @example
   *
   * _.every([true, 1, null, 'yes'], Boolean);
   * // => false
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36, 'active': false },
   *   { 'user': 'fred',   'age': 40, 'active': false }
   * ];
   *
   * // The `_.matches` iteratee shorthand.
   * _.every(users, { 'user': 'barney', 'active': false });
   * // => false
   *
   * // The `_.matchesProperty` iteratee shorthand.
   * _.every(users, ['active', false]);
   * // => true
   *
   * // The `_.property` iteratee shorthand.
   * _.every(users, 'active');
   * // => false
   */
  function every(collection, predicate, guard) {
    var func = isArray(collection) ? arrayEvery : baseEvery;
    if (guard && isIterateeCall(collection, predicate, guard)) {
      predicate = undefined;
    }
    return func(collection, getIteratee(predicate, 3));
  }

  /**
   * Iterates over elements of `collection`, returning an array of all elements
   * `predicate` returns truthy for. The predicate is invoked with three
   * arguments: (value, index|key, collection).
   *
   * **Note:** Unlike `_.remove`, this method returns a new array.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} [predicate=_.identity] The function invoked per iteration.
   * @returns {Array} Returns the new filtered array.
   * @see _.reject
   * @example
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36, 'active': true },
   *   { 'user': 'fred',   'age': 40, 'active': false }
   * ];
   *
   * _.filter(users, function(o) { return !o.active; });
   * // => objects for ['fred']
   *
   * // The `_.matches` iteratee shorthand.
   * _.filter(users, { 'age': 36, 'active': true });
   * // => objects for ['barney']
   *
   * // The `_.matchesProperty` iteratee shorthand.
   * _.filter(users, ['active', false]);
   * // => objects for ['fred']
   *
   * // The `_.property` iteratee shorthand.
   * _.filter(users, 'active');
   * // => objects for ['barney']
   *
   * // Combining several predicates using `_.overEvery` or `_.overSome`.
   * _.filter(users, _.overSome([{ 'age': 36 }, ['age', 40]]));
   * // => objects for ['fred', 'barney']
   */
  function filter(collection, predicate) {
    var func = isArray(collection) ? arrayFilter : baseFilter;
    return func(collection, getIteratee(predicate, 3));
  }

  /**
   * Iterates over elements of `collection`, returning the first element
   * `predicate` returns truthy for. The predicate is invoked with three
   * arguments: (value, index|key, collection).
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to inspect.
   * @param {Function} [predicate=_.identity] The function invoked per iteration.
   * @param {number} [fromIndex=0] The index to search from.
   * @returns {*} Returns the matched element, else `undefined`.
   * @example
   *
   * var users = [
   *   { 'user': 'barney',  'age': 36, 'active': true },
   *   { 'user': 'fred',    'age': 40, 'active': false },
   *   { 'user': 'pebbles', 'age': 1,  'active': true }
   * ];
   *
   * _.find(users, function(o) { return o.age < 40; });
   * // => object for 'barney'
   *
   * // The `_.matches` iteratee shorthand.
   * _.find(users, { 'age': 1, 'active': true });
   * // => object for 'pebbles'
   *
   * // The `_.matchesProperty` iteratee shorthand.
   * _.find(users, ['active', false]);
   * // => object for 'fred'
   *
   * // The `_.property` iteratee shorthand.
   * _.find(users, 'active');
   * // => object for 'barney'
   */
  var find = createFind(findIndex);

  /**
   * Iterates over elements of `collection` and invokes `iteratee` for each element.
   * The iteratee is invoked with three arguments: (value, index|key, collection).
   * Iteratee functions may exit iteration early by explicitly returning `false`.
   *
   * **Note:** As with other "Collections" methods, objects with a "length"
   * property are iterated like arrays. To avoid this behavior use `_.forIn`
   * or `_.forOwn` for object iteration.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @alias each
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} [iteratee=_.identity] The function invoked per iteration.
   * @returns {Array|Object} Returns `collection`.
   * @see _.forEachRight
   * @example
   *
   * _.forEach([1, 2], function(value) {
   *   console.log(value);
   * });
   * // => Logs `1` then `2`.
   *
   * _.forEach({ 'a': 1, 'b': 2 }, function(value, key) {
   *   console.log(key);
   * });
   * // => Logs 'a' then 'b' (iteration order is not guaranteed).
   */
  function forEach(collection, iteratee) {
    var func = isArray(collection) ? arrayEach : baseEach;
    return func(collection, getIteratee(iteratee, 3));
  }

  /**
   * Creates an object composed of keys generated from the results of running
   * each element of `collection` thru `iteratee`. The order of grouped values
   * is determined by the order they occur in `collection`. The corresponding
   * value of each key is an array of elements responsible for generating the
   * key. The iteratee is invoked with one argument: (value).
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} [iteratee=_.identity] The iteratee to transform keys.
   * @returns {Object} Returns the composed aggregate object.
   * @example
   *
   * _.groupBy([6.1, 4.2, 6.3], Math.floor);
   * // => { '4': [4.2], '6': [6.1, 6.3] }
   *
   * // The `_.property` iteratee shorthand.
   * _.groupBy(['one', 'two', 'three'], 'length');
   * // => { '3': ['one', 'two'], '5': ['three'] }
   */
  var groupBy = createAggregator(function(result, value, key) {
    if (hasOwnProperty.call(result, key)) {
      result[key].push(value);
    } else {
      baseAssignValue(result, key, [value]);
    }
  });

  /**
   * Creates an array of values by running each element in `collection` thru
   * `iteratee`. The iteratee is invoked with three arguments:
   * (value, index|key, collection).
   *
   * Many lodash methods are guarded to work as iteratees for methods like
   * `_.every`, `_.filter`, `_.map`, `_.mapValues`, `_.reject`, and `_.some`.
   *
   * The guarded methods are:
   * `ary`, `chunk`, `curry`, `curryRight`, `drop`, `dropRight`, `every`,
   * `fill`, `invert`, `parseInt`, `random`, `range`, `rangeRight`, `repeat`,
   * `sampleSize`, `slice`, `some`, `sortBy`, `split`, `take`, `takeRight`,
   * `template`, `trim`, `trimEnd`, `trimStart`, and `words`
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} [iteratee=_.identity] The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   * @example
   *
   * function square(n) {
   *   return n * n;
   * }
   *
   * _.map([4, 8], square);
   * // => [16, 64]
   *
   * _.map({ 'a': 4, 'b': 8 }, square);
   * // => [16, 64] (iteration order is not guaranteed)
   *
   * var users = [
   *   { 'user': 'barney' },
   *   { 'user': 'fred' }
   * ];
   *
   * // The `_.property` iteratee shorthand.
   * _.map(users, 'user');
   * // => ['barney', 'fred']
   */
  function map(collection, iteratee) {
    var func = isArray(collection) ? arrayMap : baseMap;
    return func(collection, getIteratee(iteratee, 3));
  }

  /**
   * Reduces `collection` to a value which is the accumulated result of running
   * each element in `collection` thru `iteratee`, where each successive
   * invocation is supplied the return value of the previous. If `accumulator`
   * is not given, the first element of `collection` is used as the initial
   * value. The iteratee is invoked with four arguments:
   * (accumulator, value, index|key, collection).
   *
   * Many lodash methods are guarded to work as iteratees for methods like
   * `_.reduce`, `_.reduceRight`, and `_.transform`.
   *
   * The guarded methods are:
   * `assign`, `defaults`, `defaultsDeep`, `includes`, `merge`, `orderBy`,
   * and `sortBy`
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} [iteratee=_.identity] The function invoked per iteration.
   * @param {*} [accumulator] The initial value.
   * @returns {*} Returns the accumulated value.
   * @see _.reduceRight
   * @example
   *
   * _.reduce([1, 2], function(sum, n) {
   *   return sum + n;
   * }, 0);
   * // => 3
   *
   * _.reduce({ 'a': 1, 'b': 2, 'c': 1 }, function(result, value, key) {
   *   (result[value] || (result[value] = [])).push(key);
   *   return result;
   * }, {});
   * // => { '1': ['a', 'c'], '2': ['b'] } (iteration order is not guaranteed)
   */
  function reduce(collection, iteratee, accumulator) {
    var func = isArray(collection) ? arrayReduce : baseReduce,
        initAccum = arguments.length < 3;

    return func(collection, getIteratee(iteratee, 4), accumulator, initAccum, baseEach);
  }

  /**
   * The opposite of `_.filter`; this method returns the elements of `collection`
   * that `predicate` does **not** return truthy for.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} [predicate=_.identity] The function invoked per iteration.
   * @returns {Array} Returns the new filtered array.
   * @see _.filter
   * @example
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36, 'active': false },
   *   { 'user': 'fred',   'age': 40, 'active': true }
   * ];
   *
   * _.reject(users, function(o) { return !o.active; });
   * // => objects for ['fred']
   *
   * // The `_.matches` iteratee shorthand.
   * _.reject(users, { 'age': 40, 'active': true });
   * // => objects for ['barney']
   *
   * // The `_.matchesProperty` iteratee shorthand.
   * _.reject(users, ['active', false]);
   * // => objects for ['fred']
   *
   * // The `_.property` iteratee shorthand.
   * _.reject(users, 'active');
   * // => objects for ['barney']
   */
  function reject(collection, predicate) {
    var func = isArray(collection) ? arrayFilter : baseFilter;
    return func(collection, negate(getIteratee(predicate, 3)));
  }

  /**
   * Creates an array of elements, sorted in ascending order by the results of
   * running each element in a collection thru each iteratee. This method
   * performs a stable sort, that is, it preserves the original sort order of
   * equal elements. The iteratees are invoked with one argument: (value).
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {...(Function|Function[])} [iteratees=[_.identity]]
   *  The iteratees to sort by.
   * @returns {Array} Returns the new sorted array.
   * @example
   *
   * var users = [
   *   { 'user': 'fred',   'age': 48 },
   *   { 'user': 'barney', 'age': 36 },
   *   { 'user': 'fred',   'age': 30 },
   *   { 'user': 'barney', 'age': 34 }
   * ];
   *
   * _.sortBy(users, [function(o) { return o.user; }]);
   * // => objects for [['barney', 36], ['barney', 34], ['fred', 48], ['fred', 30]]
   *
   * _.sortBy(users, ['user', 'age']);
   * // => objects for [['barney', 34], ['barney', 36], ['fred', 30], ['fred', 48]]
   */
  var sortBy = baseRest(function(collection, iteratees) {
    if (collection == null) {
      return [];
    }
    var length = iteratees.length;
    if (length > 1 && isIterateeCall(collection, iteratees[0], iteratees[1])) {
      iteratees = [];
    } else if (length > 2 && isIterateeCall(iteratees[0], iteratees[1], iteratees[2])) {
      iteratees = [iteratees[0]];
    }
    return baseOrderBy(collection, baseFlatten(iteratees, 1), []);
  });

  /*------------------------------------------------------------------------*/

  /**
   * Gets the timestamp of the number of milliseconds that have elapsed since
   * the Unix epoch (1 January 1970 00:00:00 UTC).
   *
   * @static
   * @memberOf _
   * @since 2.4.0
   * @category Date
   * @returns {number} Returns the timestamp.
   * @example
   *
   * _.defer(function(stamp) {
   *   console.log(_.now() - stamp);
   * }, _.now());
   * // => Logs the number of milliseconds it took for the deferred invocation.
   */
  var now = function() {
    return root.Date.now();
  };

  /*------------------------------------------------------------------------*/

  /**
   * Creates a debounced function that delays invoking `func` until after `wait`
   * milliseconds have elapsed since the last time the debounced function was
   * invoked. The debounced function comes with a `cancel` method to cancel
   * delayed `func` invocations and a `flush` method to immediately invoke them.
   * Provide `options` to indicate whether `func` should be invoked on the
   * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
   * with the last arguments provided to the debounced function. Subsequent
   * calls to the debounced function return the result of the last `func`
   * invocation.
   *
   * **Note:** If `leading` and `trailing` options are `true`, `func` is
   * invoked on the trailing edge of the timeout only if the debounced function
   * is invoked more than once during the `wait` timeout.
   *
   * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
   * until to the next tick, similar to `setTimeout` with a timeout of `0`.
   *
   * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
   * for details over the differences between `_.debounce` and `_.throttle`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to debounce.
   * @param {number} [wait=0] The number of milliseconds to delay.
   * @param {Object} [options={}] The options object.
   * @param {boolean} [options.leading=false]
   *  Specify invoking on the leading edge of the timeout.
   * @param {number} [options.maxWait]
   *  The maximum time `func` is allowed to be delayed before it's invoked.
   * @param {boolean} [options.trailing=true]
   *  Specify invoking on the trailing edge of the timeout.
   * @returns {Function} Returns the new debounced function.
   * @example
   *
   * // Avoid costly calculations while the window size is in flux.
   * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
   *
   * // Invoke `sendMail` when clicked, debouncing subsequent calls.
   * jQuery(element).on('click', _.debounce(sendMail, 300, {
   *   'leading': true,
   *   'trailing': false
   * }));
   *
   * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
   * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
   * var source = new EventSource('/stream');
   * jQuery(source).on('message', debounced);
   *
   * // Cancel the trailing debounced invocation.
   * jQuery(window).on('popstate', debounced.cancel);
   */
  function debounce(func, wait, options) {
    var lastArgs,
        lastThis,
        maxWait,
        result,
        timerId,
        lastCallTime,
        lastInvokeTime = 0,
        leading = false,
        maxing = false,
        trailing = true;

    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    wait = toNumber(wait) || 0;
    if (isObject(options)) {
      leading = !!options.leading;
      maxing = 'maxWait' in options;
      maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
      trailing = 'trailing' in options ? !!options.trailing : trailing;
    }

    function invokeFunc(time) {
      var args = lastArgs,
          thisArg = lastThis;

      lastArgs = lastThis = undefined;
      lastInvokeTime = time;
      result = func.apply(thisArg, args);
      return result;
    }

    function leadingEdge(time) {
      // Reset any `maxWait` timer.
      lastInvokeTime = time;
      // Start the timer for the trailing edge.
      timerId = setTimeout(timerExpired, wait);
      // Invoke the leading edge.
      return leading ? invokeFunc(time) : result;
    }

    function remainingWait(time) {
      var timeSinceLastCall = time - lastCallTime,
          timeSinceLastInvoke = time - lastInvokeTime,
          timeWaiting = wait - timeSinceLastCall;

      return maxing
        ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke)
        : timeWaiting;
    }

    function shouldInvoke(time) {
      var timeSinceLastCall = time - lastCallTime,
          timeSinceLastInvoke = time - lastInvokeTime;

      // Either this is the first call, activity has stopped and we're at the
      // trailing edge, the system time has gone backwards and we're treating
      // it as the trailing edge, or we've hit the `maxWait` limit.
      return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
        (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
    }

    function timerExpired() {
      var time = now();
      if (shouldInvoke(time)) {
        return trailingEdge(time);
      }
      // Restart the timer.
      timerId = setTimeout(timerExpired, remainingWait(time));
    }

    function trailingEdge(time) {
      timerId = undefined;

      // Only invoke if we have `lastArgs` which means `func` has been
      // debounced at least once.
      if (trailing && lastArgs) {
        return invokeFunc(time);
      }
      lastArgs = lastThis = undefined;
      return result;
    }

    function cancel() {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
      lastInvokeTime = 0;
      lastArgs = lastCallTime = lastThis = timerId = undefined;
    }

    function flush() {
      return timerId === undefined ? result : trailingEdge(now());
    }

    function debounced() {
      var time = now(),
          isInvoking = shouldInvoke(time);

      lastArgs = arguments;
      lastThis = this;
      lastCallTime = time;

      if (isInvoking) {
        if (timerId === undefined) {
          return leadingEdge(lastCallTime);
        }
        if (maxing) {
          // Handle invocations in a tight loop.
          clearTimeout(timerId);
          timerId = setTimeout(timerExpired, wait);
          return invokeFunc(lastCallTime);
        }
      }
      if (timerId === undefined) {
        timerId = setTimeout(timerExpired, wait);
      }
      return result;
    }
    debounced.cancel = cancel;
    debounced.flush = flush;
    return debounced;
  }

  /**
   * Invokes `func` after `wait` milliseconds. Any additional arguments are
   * provided to `func` when it's invoked.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to delay.
   * @param {number} wait The number of milliseconds to delay invocation.
   * @param {...*} [args] The arguments to invoke `func` with.
   * @returns {number} Returns the timer id.
   * @example
   *
   * _.delay(function(text) {
   *   console.log(text);
   * }, 1000, 'later');
   * // => Logs 'later' after one second.
   */
  var delay = baseRest(function(func, wait, args) {
    return baseDelay(func, toNumber(wait) || 0, args);
  });

  /**
   * Creates a function that memoizes the result of `func`. If `resolver` is
   * provided, it determines the cache key for storing the result based on the
   * arguments provided to the memoized function. By default, the first argument
   * provided to the memoized function is used as the map cache key. The `func`
   * is invoked with the `this` binding of the memoized function.
   *
   * **Note:** The cache is exposed as the `cache` property on the memoized
   * function. Its creation may be customized by replacing the `_.memoize.Cache`
   * constructor with one whose instances implement the
   * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
   * method interface of `clear`, `delete`, `get`, `has`, and `set`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to have its output memoized.
   * @param {Function} [resolver] The function to resolve the cache key.
   * @returns {Function} Returns the new memoized function.
   * @example
   *
   * var object = { 'a': 1, 'b': 2 };
   * var other = { 'c': 3, 'd': 4 };
   *
   * var values = _.memoize(_.values);
   * values(object);
   * // => [1, 2]
   *
   * values(other);
   * // => [3, 4]
   *
   * object.a = 2;
   * values(object);
   * // => [1, 2]
   *
   * // Modify the result cache.
   * values.cache.set(object, ['a', 'b']);
   * values(object);
   * // => ['a', 'b']
   *
   * // Replace `_.memoize.Cache`.
   * _.memoize.Cache = WeakMap;
   */
  function memoize(func, resolver) {
    if (typeof func != 'function' || (resolver != null && typeof resolver != 'function')) {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    var memoized = function() {
      var args = arguments,
          key = resolver ? resolver.apply(this, args) : args[0],
          cache = memoized.cache;

      if (cache.has(key)) {
        return cache.get(key);
      }
      var result = func.apply(this, args);
      memoized.cache = cache.set(key, result) || cache;
      return result;
    };
    memoized.cache = new (memoize.Cache || MapCache);
    return memoized;
  }

  // Expose `MapCache`.
  memoize.Cache = MapCache;

  /**
   * Creates a function that negates the result of the predicate `func`. The
   * `func` predicate is invoked with the `this` binding and arguments of the
   * created function.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Function
   * @param {Function} predicate The predicate to negate.
   * @returns {Function} Returns the new negated function.
   * @example
   *
   * function isEven(n) {
   *   return n % 2 == 0;
   * }
   *
   * _.filter([1, 2, 3, 4, 5, 6], _.negate(isEven));
   * // => [1, 3, 5]
   */
  function negate(predicate) {
    if (typeof predicate != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    return function() {
      var args = arguments;
      switch (args.length) {
        case 0: return !predicate.call(this);
        case 1: return !predicate.call(this, args[0]);
        case 2: return !predicate.call(this, args[0], args[1]);
        case 3: return !predicate.call(this, args[0], args[1], args[2]);
      }
      return !predicate.apply(this, args);
    };
  }

  /**
   * Creates a throttled function that only invokes `func` at most once per
   * every `wait` milliseconds. The throttled function comes with a `cancel`
   * method to cancel delayed `func` invocations and a `flush` method to
   * immediately invoke them. Provide `options` to indicate whether `func`
   * should be invoked on the leading and/or trailing edge of the `wait`
   * timeout. The `func` is invoked with the last arguments provided to the
   * throttled function. Subsequent calls to the throttled function return the
   * result of the last `func` invocation.
   *
   * **Note:** If `leading` and `trailing` options are `true`, `func` is
   * invoked on the trailing edge of the timeout only if the throttled function
   * is invoked more than once during the `wait` timeout.
   *
   * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
   * until to the next tick, similar to `setTimeout` with a timeout of `0`.
   *
   * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
   * for details over the differences between `_.throttle` and `_.debounce`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to throttle.
   * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
   * @param {Object} [options={}] The options object.
   * @param {boolean} [options.leading=true]
   *  Specify invoking on the leading edge of the timeout.
   * @param {boolean} [options.trailing=true]
   *  Specify invoking on the trailing edge of the timeout.
   * @returns {Function} Returns the new throttled function.
   * @example
   *
   * // Avoid excessively updating the position while scrolling.
   * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
   *
   * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
   * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
   * jQuery(element).on('click', throttled);
   *
   * // Cancel the trailing throttled invocation.
   * jQuery(window).on('popstate', throttled.cancel);
   */
  function throttle(func, wait, options) {
    var leading = true,
        trailing = true;

    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    if (isObject(options)) {
      leading = 'leading' in options ? !!options.leading : leading;
      trailing = 'trailing' in options ? !!options.trailing : trailing;
    }
    return debounce(func, wait, {
      'leading': leading,
      'maxWait': wait,
      'trailing': trailing
    });
  }

  /*------------------------------------------------------------------------*/

  /**
   * Creates a shallow clone of `value`.
   *
   * **Note:** This method is loosely based on the
   * [structured clone algorithm](https://mdn.io/Structured_clone_algorithm)
   * and supports cloning arrays, array buffers, booleans, date objects, maps,
   * numbers, `Object` objects, regexes, sets, strings, symbols, and typed
   * arrays. The own enumerable properties of `arguments` objects are cloned
   * as plain objects. An empty object is returned for uncloneable values such
   * as error objects, functions, DOM nodes, and WeakMaps.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to clone.
   * @returns {*} Returns the cloned value.
   * @see _.cloneDeep
   * @example
   *
   * var objects = [{ 'a': 1 }, { 'b': 2 }];
   *
   * var shallow = _.clone(objects);
   * console.log(shallow[0] === objects[0]);
   * // => true
   */
  function clone(value) {
    return baseClone(value, CLONE_SYMBOLS_FLAG);
  }

  /**
   * Performs a
   * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
   * comparison between two values to determine if they are equivalent.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
   * @example
   *
   * var object = { 'a': 1 };
   * var other = { 'a': 1 };
   *
   * _.eq(object, object);
   * // => true
   *
   * _.eq(object, other);
   * // => false
   *
   * _.eq('a', 'a');
   * // => true
   *
   * _.eq('a', Object('a'));
   * // => false
   *
   * _.eq(NaN, NaN);
   * // => true
   */
  function eq(value, other) {
    return value === other || (value !== value && other !== other);
  }

  /**
   * Checks if `value` is likely an `arguments` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an `arguments` object,
   *  else `false`.
   * @example
   *
   * _.isArguments(function() { return arguments; }());
   * // => true
   *
   * _.isArguments([1, 2, 3]);
   * // => false
   */
  var isArguments = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
    return isObjectLike(value) && hasOwnProperty.call(value, 'callee') &&
      !propertyIsEnumerable.call(value, 'callee');
  };

  /**
   * Checks if `value` is classified as an `Array` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an array, else `false`.
   * @example
   *
   * _.isArray([1, 2, 3]);
   * // => true
   *
   * _.isArray(document.body.children);
   * // => false
   *
   * _.isArray('abc');
   * // => false
   *
   * _.isArray(_.noop);
   * // => false
   */
  var isArray = Array.isArray;

  /**
   * Checks if `value` is array-like. A value is considered array-like if it's
   * not a function and has a `value.length` that's an integer greater than or
   * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
   * @example
   *
   * _.isArrayLike([1, 2, 3]);
   * // => true
   *
   * _.isArrayLike(document.body.children);
   * // => true
   *
   * _.isArrayLike('abc');
   * // => true
   *
   * _.isArrayLike(_.noop);
   * // => false
   */
  function isArrayLike(value) {
    return value != null && isLength(value.length) && !isFunction(value);
  }

  /**
   * This method is like `_.isArrayLike` except that it also checks if `value`
   * is an object.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an array-like object,
   *  else `false`.
   * @example
   *
   * _.isArrayLikeObject([1, 2, 3]);
   * // => true
   *
   * _.isArrayLikeObject(document.body.children);
   * // => true
   *
   * _.isArrayLikeObject('abc');
   * // => false
   *
   * _.isArrayLikeObject(_.noop);
   * // => false
   */
  function isArrayLikeObject(value) {
    return isObjectLike(value) && isArrayLike(value);
  }

  /**
   * Checks if `value` is a buffer.
   *
   * @static
   * @memberOf _
   * @since 4.3.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
   * @example
   *
   * _.isBuffer(new Buffer(2));
   * // => true
   *
   * _.isBuffer(new Uint8Array(2));
   * // => false
   */
  var isBuffer = nativeIsBuffer || stubFalse;

  /**
   * Checks if `value` is an empty object, collection, map, or set.
   *
   * Objects are considered empty if they have no own enumerable string keyed
   * properties.
   *
   * Array-like values such as `arguments` objects, arrays, buffers, strings, or
   * jQuery-like collections are considered empty if they have a `length` of `0`.
   * Similarly, maps and sets are considered empty if they have a `size` of `0`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is empty, else `false`.
   * @example
   *
   * _.isEmpty(null);
   * // => true
   *
   * _.isEmpty(true);
   * // => true
   *
   * _.isEmpty(1);
   * // => true
   *
   * _.isEmpty([1, 2, 3]);
   * // => false
   *
   * _.isEmpty({ 'a': 1 });
   * // => false
   */
  function isEmpty(value) {
    if (value == null) {
      return true;
    }
    if (isArrayLike(value) &&
        (isArray(value) || typeof value == 'string' || typeof value.splice == 'function' ||
          isBuffer(value) || isTypedArray(value) || isArguments(value))) {
      return !value.length;
    }
    var tag = getTag(value);
    if (tag == mapTag || tag == setTag) {
      return !value.size;
    }
    if (isPrototype(value)) {
      return !baseKeys(value).length;
    }
    for (var key in value) {
      if (hasOwnProperty.call(value, key)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Performs a deep comparison between two values to determine if they are
   * equivalent.
   *
   * **Note:** This method supports comparing arrays, array buffers, booleans,
   * date objects, error objects, maps, numbers, `Object` objects, regexes,
   * sets, strings, symbols, and typed arrays. `Object` objects are compared
   * by their own, not inherited, enumerable properties. Functions and DOM
   * nodes are compared by strict equality, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
   * @example
   *
   * var object = { 'a': 1 };
   * var other = { 'a': 1 };
   *
   * _.isEqual(object, other);
   * // => true
   *
   * object === other;
   * // => false
   */
  function isEqual(value, other) {
    return baseIsEqual(value, other);
  }

  /**
   * Checks if `value` is classified as a `Function` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a function, else `false`.
   * @example
   *
   * _.isFunction(_);
   * // => true
   *
   * _.isFunction(/abc/);
   * // => false
   */
  function isFunction(value) {
    if (!isObject(value)) {
      return false;
    }
    // The use of `Object#toString` avoids issues with the `typeof` operator
    // in Safari 9 which returns 'object' for typed arrays and other constructors.
    var tag = baseGetTag(value);
    return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
  }

  /**
   * Checks if `value` is a valid array-like length.
   *
   * **Note:** This method is loosely based on
   * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
   * @example
   *
   * _.isLength(3);
   * // => true
   *
   * _.isLength(Number.MIN_VALUE);
   * // => false
   *
   * _.isLength(Infinity);
   * // => false
   *
   * _.isLength('3');
   * // => false
   */
  function isLength(value) {
    return typeof value == 'number' &&
      value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
  }

  /**
   * Checks if `value` is the
   * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
   * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(_.noop);
   * // => true
   *
   * _.isObject(null);
   * // => false
   */
  function isObject(value) {
    var type = typeof value;
    return value != null && (type == 'object' || type == 'function');
  }

  /**
   * Checks if `value` is object-like. A value is object-like if it's not `null`
   * and has a `typeof` result of "object".
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
   * @example
   *
   * _.isObjectLike({});
   * // => true
   *
   * _.isObjectLike([1, 2, 3]);
   * // => true
   *
   * _.isObjectLike(_.noop);
   * // => false
   *
   * _.isObjectLike(null);
   * // => false
   */
  function isObjectLike(value) {
    return value != null && typeof value == 'object';
  }

  /**
   * Checks if `value` is classified as a `Map` object.
   *
   * @static
   * @memberOf _
   * @since 4.3.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a map, else `false`.
   * @example
   *
   * _.isMap(new Map);
   * // => true
   *
   * _.isMap(new WeakMap);
   * // => false
   */
  var isMap = nodeIsMap ? baseUnary(nodeIsMap) : baseIsMap;

  /**
   * Checks if `value` is a plain object, that is, an object created by the
   * `Object` constructor or one with a `[[Prototype]]` of `null`.
   *
   * @static
   * @memberOf _
   * @since 0.8.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   * }
   *
   * _.isPlainObject(new Foo);
   * // => false
   *
   * _.isPlainObject([1, 2, 3]);
   * // => false
   *
   * _.isPlainObject({ 'x': 0, 'y': 0 });
   * // => true
   *
   * _.isPlainObject(Object.create(null));
   * // => true
   */
  function isPlainObject(value) {
    if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
      return false;
    }
    var proto = getPrototype(value);
    if (proto === null) {
      return true;
    }
    var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
    return typeof Ctor == 'function' && Ctor instanceof Ctor &&
      funcToString.call(Ctor) == objectCtorString;
  }

  /**
   * Checks if `value` is classified as a `Set` object.
   *
   * @static
   * @memberOf _
   * @since 4.3.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a set, else `false`.
   * @example
   *
   * _.isSet(new Set);
   * // => true
   *
   * _.isSet(new WeakSet);
   * // => false
   */
  var isSet = nodeIsSet ? baseUnary(nodeIsSet) : baseIsSet;

  /**
   * Checks if `value` is classified as a `String` primitive or object.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a string, else `false`.
   * @example
   *
   * _.isString('abc');
   * // => true
   *
   * _.isString(1);
   * // => false
   */
  function isString(value) {
    return typeof value == 'string' ||
      (!isArray(value) && isObjectLike(value) && baseGetTag(value) == stringTag);
  }

  /**
   * Checks if `value` is classified as a `Symbol` primitive or object.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
   * @example
   *
   * _.isSymbol(Symbol.iterator);
   * // => true
   *
   * _.isSymbol('abc');
   * // => false
   */
  function isSymbol(value) {
    return typeof value == 'symbol' ||
      (isObjectLike(value) && baseGetTag(value) == symbolTag);
  }

  /**
   * Checks if `value` is classified as a typed array.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
   * @example
   *
   * _.isTypedArray(new Uint8Array);
   * // => true
   *
   * _.isTypedArray([]);
   * // => false
   */
  var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

  /**
   * Converts `value` to an array.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {Array} Returns the converted array.
   * @example
   *
   * _.toArray({ 'a': 1, 'b': 2 });
   * // => [1, 2]
   *
   * _.toArray('abc');
   * // => ['a', 'b', 'c']
   *
   * _.toArray(1);
   * // => []
   *
   * _.toArray(null);
   * // => []
   */
  function toArray(value) {
    if (!value) {
      return [];
    }
    if (isArrayLike(value)) {
      return isString(value) ? stringToArray(value) : copyArray(value);
    }
    if (symIterator && value[symIterator]) {
      return iteratorToArray(value[symIterator]());
    }
    var tag = getTag(value),
        func = tag == mapTag ? mapToArray : (tag == setTag ? setToArray : values);

    return func(value);
  }

  /**
   * Converts `value` to a finite number.
   *
   * @static
   * @memberOf _
   * @since 4.12.0
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {number} Returns the converted number.
   * @example
   *
   * _.toFinite(3.2);
   * // => 3.2
   *
   * _.toFinite(Number.MIN_VALUE);
   * // => 5e-324
   *
   * _.toFinite(Infinity);
   * // => 1.7976931348623157e+308
   *
   * _.toFinite('3.2');
   * // => 3.2
   */
  function toFinite(value) {
    if (!value) {
      return value === 0 ? value : 0;
    }
    value = toNumber(value);
    if (value === INFINITY || value === -INFINITY) {
      var sign = (value < 0 ? -1 : 1);
      return sign * MAX_INTEGER;
    }
    return value === value ? value : 0;
  }

  /**
   * Converts `value` to an integer.
   *
   * **Note:** This method is loosely based on
   * [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {number} Returns the converted integer.
   * @example
   *
   * _.toInteger(3.2);
   * // => 3
   *
   * _.toInteger(Number.MIN_VALUE);
   * // => 0
   *
   * _.toInteger(Infinity);
   * // => 1.7976931348623157e+308
   *
   * _.toInteger('3.2');
   * // => 3
   */
  function toInteger(value) {
    var result = toFinite(value),
        remainder = result % 1;

    return result === result ? (remainder ? result - remainder : result) : 0;
  }

  /**
   * Converts `value` to a number.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to process.
   * @returns {number} Returns the number.
   * @example
   *
   * _.toNumber(3.2);
   * // => 3.2
   *
   * _.toNumber(Number.MIN_VALUE);
   * // => 5e-324
   *
   * _.toNumber(Infinity);
   * // => Infinity
   *
   * _.toNumber('3.2');
   * // => 3.2
   */
  function toNumber(value) {
    if (typeof value == 'number') {
      return value;
    }
    if (isSymbol(value)) {
      return NAN;
    }
    if (isObject(value)) {
      var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
      value = isObject(other) ? (other + '') : other;
    }
    if (typeof value != 'string') {
      return value === 0 ? value : +value;
    }
    value = baseTrim(value);
    var isBinary = reIsBinary.test(value);
    return (isBinary || reIsOctal.test(value))
      ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
      : (reIsBadHex.test(value) ? NAN : +value);
  }

  /**
   * Converts `value` to a plain object flattening inherited enumerable string
   * keyed properties of `value` to own properties of the plain object.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {Object} Returns the converted plain object.
   * @example
   *
   * function Foo() {
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.assign({ 'a': 1 }, new Foo);
   * // => { 'a': 1, 'b': 2 }
   *
   * _.assign({ 'a': 1 }, _.toPlainObject(new Foo));
   * // => { 'a': 1, 'b': 2, 'c': 3 }
   */
  function toPlainObject(value) {
    return copyObject(value, keysIn(value));
  }

  /**
   * Converts `value` to a string. An empty string is returned for `null`
   * and `undefined` values. The sign of `-0` is preserved.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {string} Returns the converted string.
   * @example
   *
   * _.toString(null);
   * // => ''
   *
   * _.toString(-0);
   * // => '-0'
   *
   * _.toString([1, 2, 3]);
   * // => '1,2,3'
   */
  function toString(value) {
    return value == null ? '' : baseToString(value);
  }

  /*------------------------------------------------------------------------*/

  /**
   * This method is like `_.assign` except that it iterates over own and
   * inherited source properties.
   *
   * **Note:** This method mutates `object`.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @alias extend
   * @category Object
   * @param {Object} object The destination object.
   * @param {...Object} [sources] The source objects.
   * @returns {Object} Returns `object`.
   * @see _.assign
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   * }
   *
   * function Bar() {
   *   this.c = 3;
   * }
   *
   * Foo.prototype.b = 2;
   * Bar.prototype.d = 4;
   *
   * _.assignIn({ 'a': 0 }, new Foo, new Bar);
   * // => { 'a': 1, 'b': 2, 'c': 3, 'd': 4 }
   */
  var assignIn = createAssigner(function(object, source) {
    copyObject(source, keysIn(source), object);
  });

  /**
   * Gets the value at `path` of `object`. If the resolved value is
   * `undefined`, the `defaultValue` is returned in its place.
   *
   * @static
   * @memberOf _
   * @since 3.7.0
   * @category Object
   * @param {Object} object The object to query.
   * @param {Array|string} path The path of the property to get.
   * @param {*} [defaultValue] The value returned for `undefined` resolved values.
   * @returns {*} Returns the resolved value.
   * @example
   *
   * var object = { 'a': [{ 'b': { 'c': 3 } }] };
   *
   * _.get(object, 'a[0].b.c');
   * // => 3
   *
   * _.get(object, ['a', '0', 'b', 'c']);
   * // => 3
   *
   * _.get(object, 'a.b.c', 'default');
   * // => 'default'
   */
  function get(object, path, defaultValue) {
    var result = object == null ? undefined : baseGet(object, path);
    return result === undefined ? defaultValue : result;
  }

  /**
   * Checks if `path` is a direct or inherited property of `object`.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Object
   * @param {Object} object The object to query.
   * @param {Array|string} path The path to check.
   * @returns {boolean} Returns `true` if `path` exists, else `false`.
   * @example
   *
   * var object = _.create({ 'a': _.create({ 'b': 2 }) });
   *
   * _.hasIn(object, 'a');
   * // => true
   *
   * _.hasIn(object, 'a.b');
   * // => true
   *
   * _.hasIn(object, ['a', 'b']);
   * // => true
   *
   * _.hasIn(object, 'b');
   * // => false
   */
  function hasIn(object, path) {
    return object != null && hasPath(object, path, baseHasIn);
  }

  /**
   * Invokes the method at `path` of `object`.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Object
   * @param {Object} object The object to query.
   * @param {Array|string} path The path of the method to invoke.
   * @param {...*} [args] The arguments to invoke the method with.
   * @returns {*} Returns the result of the invoked method.
   * @example
   *
   * var object = { 'a': [{ 'b': { 'c': [1, 2, 3, 4] } }] };
   *
   * _.invoke(object, 'a[0].b.c.slice', 1, 3);
   * // => [2, 3]
   */
  var invoke = baseRest(baseInvoke);

  /**
   * Creates an array of the own enumerable property names of `object`.
   *
   * **Note:** Non-object values are coerced to objects. See the
   * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
   * for more details.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.keys(new Foo);
   * // => ['a', 'b'] (iteration order is not guaranteed)
   *
   * _.keys('hi');
   * // => ['0', '1']
   */
  function keys(object) {
    return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
  }

  /**
   * Creates an array of the own and inherited enumerable property names of `object`.
   *
   * **Note:** Non-object values are coerced to objects.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.keysIn(new Foo);
   * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
   */
  function keysIn(object) {
    return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
  }

  /**
   * This method is like `_.assign` except that it recursively merges own and
   * inherited enumerable string keyed properties of source objects into the
   * destination object. Source properties that resolve to `undefined` are
   * skipped if a destination value exists. Array and plain object properties
   * are merged recursively. Other objects and value types are overridden by
   * assignment. Source objects are applied from left to right. Subsequent
   * sources overwrite property assignments of previous sources.
   *
   * **Note:** This method mutates `object`.
   *
   * @static
   * @memberOf _
   * @since 0.5.0
   * @category Object
   * @param {Object} object The destination object.
   * @param {...Object} [sources] The source objects.
   * @returns {Object} Returns `object`.
   * @example
   *
   * var object = {
   *   'a': [{ 'b': 2 }, { 'd': 4 }]
   * };
   *
   * var other = {
   *   'a': [{ 'c': 3 }, { 'e': 5 }]
   * };
   *
   * _.merge(object, other);
   * // => { 'a': [{ 'b': 2, 'c': 3 }, { 'd': 4, 'e': 5 }] }
   */
  var merge = createAssigner(function(object, source, srcIndex) {
    baseMerge(object, source, srcIndex);
  });

  /**
   * The opposite of `_.pick`; this method creates an object composed of the
   * own and inherited enumerable property paths of `object` that are not omitted.
   *
   * **Note:** This method is considerably slower than `_.pick`.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The source object.
   * @param {...(string|string[])} [paths] The property paths to omit.
   * @returns {Object} Returns the new object.
   * @example
   *
   * var object = { 'a': 1, 'b': '2', 'c': 3 };
   *
   * _.omit(object, ['a', 'c']);
   * // => { 'b': '2' }
   */
  var omit = flatRest(function(object, paths) {
    var result = {};
    if (object == null) {
      return result;
    }
    var isDeep = false;
    paths = arrayMap(paths, function(path) {
      path = castPath(path, object);
      isDeep || (isDeep = path.length > 1);
      return path;
    });
    copyObject(object, getAllKeysIn(object), result);
    if (isDeep) {
      result = baseClone(result, CLONE_DEEP_FLAG | CLONE_FLAT_FLAG | CLONE_SYMBOLS_FLAG, customOmitClone);
    }
    var length = paths.length;
    while (length--) {
      baseUnset(result, paths[length]);
    }
    return result;
  });

  /**
   * Creates an object composed of the picked `object` properties.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The source object.
   * @param {...(string|string[])} [paths] The property paths to pick.
   * @returns {Object} Returns the new object.
   * @example
   *
   * var object = { 'a': 1, 'b': '2', 'c': 3 };
   *
   * _.pick(object, ['a', 'c']);
   * // => { 'a': 1, 'c': 3 }
   */
  var pick = flatRest(function(object, paths) {
    return object == null ? {} : basePick(object, paths);
  });

  /**
   * Creates an array of the own enumerable string keyed property values of `object`.
   *
   * **Note:** Non-object values are coerced to objects.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property values.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.values(new Foo);
   * // => [1, 2] (iteration order is not guaranteed)
   *
   * _.values('hi');
   * // => ['h', 'i']
   */
  function values(object) {
    return object == null ? [] : baseValues(object, keys(object));
  }

  /*------------------------------------------------------------------------*/

  /**
   * Escapes the `RegExp` special characters "^", "$", "\", ".", "*", "+",
   * "?", "(", ")", "[", "]", "{", "}", and "|" in `string`.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category String
   * @param {string} [string=''] The string to escape.
   * @returns {string} Returns the escaped string.
   * @example
   *
   * _.escapeRegExp('[lodash](https://lodash.com/)');
   * // => '\[lodash\]\(https://lodash\.com/\)'
   */
  function escapeRegExp(string) {
    string = toString(string);
    return (string && reHasRegExpChar.test(string))
      ? string.replace(reRegExpChar, '\\$&')
      : string;
  }

  /*------------------------------------------------------------------------*/

  /**
   * Creates a function that returns `value`.
   *
   * @static
   * @memberOf _
   * @since 2.4.0
   * @category Util
   * @param {*} value The value to return from the new function.
   * @returns {Function} Returns the new constant function.
   * @example
   *
   * var objects = _.times(2, _.constant({ 'a': 1 }));
   *
   * console.log(objects);
   * // => [{ 'a': 1 }, { 'a': 1 }]
   *
   * console.log(objects[0] === objects[1]);
   * // => true
   */
  function constant(value) {
    return function() {
      return value;
    };
  }

  /**
   * This method returns the first argument it receives.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Util
   * @param {*} value Any value.
   * @returns {*} Returns `value`.
   * @example
   *
   * var object = { 'a': 1 };
   *
   * console.log(_.identity(object) === object);
   * // => true
   */
  function identity(value) {
    return value;
  }

  /**
   * Creates a function that invokes `func` with the arguments of the created
   * function. If `func` is a property name, the created function returns the
   * property value for a given element. If `func` is an array or object, the
   * created function returns `true` for elements that contain the equivalent
   * source properties, otherwise it returns `false`.
   *
   * @static
   * @since 4.0.0
   * @memberOf _
   * @category Util
   * @param {*} [func=_.identity] The value to convert to a callback.
   * @returns {Function} Returns the callback.
   * @example
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36, 'active': true },
   *   { 'user': 'fred',   'age': 40, 'active': false }
   * ];
   *
   * // The `_.matches` iteratee shorthand.
   * _.filter(users, _.iteratee({ 'user': 'barney', 'active': true }));
   * // => [{ 'user': 'barney', 'age': 36, 'active': true }]
   *
   * // The `_.matchesProperty` iteratee shorthand.
   * _.filter(users, _.iteratee(['user', 'fred']));
   * // => [{ 'user': 'fred', 'age': 40 }]
   *
   * // The `_.property` iteratee shorthand.
   * _.map(users, _.iteratee('user'));
   * // => ['barney', 'fred']
   *
   * // Create custom iteratee shorthands.
   * _.iteratee = _.wrap(_.iteratee, function(iteratee, func) {
   *   return !_.isRegExp(func) ? iteratee(func) : function(string) {
   *     return func.test(string);
   *   };
   * });
   *
   * _.filter(['abc', 'def'], /ef/);
   * // => ['def']
   */
  function iteratee(func) {
    return baseIteratee(typeof func == 'function' ? func : baseClone(func, CLONE_DEEP_FLAG));
  }

  /**
   * Adds all own enumerable string keyed function properties of a source
   * object to the destination object. If `object` is a function, then methods
   * are added to its prototype as well.
   *
   * **Note:** Use `_.runInContext` to create a pristine `lodash` function to
   * avoid conflicts caused by modifying the original.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Util
   * @param {Function|Object} [object=lodash] The destination object.
   * @param {Object} source The object of functions to add.
   * @param {Object} [options={}] The options object.
   * @param {boolean} [options.chain=true] Specify whether mixins are chainable.
   * @returns {Function|Object} Returns `object`.
   * @example
   *
   * function vowels(string) {
   *   return _.filter(string, function(v) {
   *     return /[aeiou]/i.test(v);
   *   });
   * }
   *
   * _.mixin({ 'vowels': vowels });
   * _.vowels('fred');
   * // => ['e']
   *
   * _('fred').vowels().value();
   * // => ['e']
   *
   * _.mixin({ 'vowels': vowels }, { 'chain': false });
   * _('fred').vowels();
   * // => ['e']
   */
  function mixin(object, source, options) {
    var props = keys(source),
        methodNames = baseFunctions(source, props);

    if (options == null &&
        !(isObject(source) && (methodNames.length || !props.length))) {
      options = source;
      source = object;
      object = this;
      methodNames = baseFunctions(source, keys(source));
    }
    var chain = !(isObject(options) && 'chain' in options) || !!options.chain,
        isFunc = isFunction(object);

    arrayEach(methodNames, function(methodName) {
      var func = source[methodName];
      object[methodName] = func;
      if (isFunc) {
        object.prototype[methodName] = function() {
          var chainAll = this.__chain__;
          if (chain || chainAll) {
            var result = object(this.__wrapped__),
                actions = result.__actions__ = copyArray(this.__actions__);

            actions.push({ 'func': func, 'args': arguments, 'thisArg': object });
            result.__chain__ = chainAll;
            return result;
          }
          return func.apply(object, arrayPush([this.value()], arguments));
        };
      }
    });

    return object;
  }

  /**
   * This method returns `undefined`.
   *
   * @static
   * @memberOf _
   * @since 2.3.0
   * @category Util
   * @example
   *
   * _.times(2, _.noop);
   * // => [undefined, undefined]
   */
  function noop() {
    // No operation performed.
  }

  /**
   * Creates a function that returns the value at `path` of a given object.
   *
   * @static
   * @memberOf _
   * @since 2.4.0
   * @category Util
   * @param {Array|string} path The path of the property to get.
   * @returns {Function} Returns the new accessor function.
   * @example
   *
   * var objects = [
   *   { 'a': { 'b': 2 } },
   *   { 'a': { 'b': 1 } }
   * ];
   *
   * _.map(objects, _.property('a.b'));
   * // => [2, 1]
   *
   * _.map(_.sortBy(objects, _.property(['a', 'b'])), 'a.b');
   * // => [1, 2]
   */
  function property(path) {
    return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
  }

  /**
   * Creates an array of numbers (positive and/or negative) progressing from
   * `start` up to, but not including, `end`. A step of `-1` is used if a negative
   * `start` is specified without an `end` or `step`. If `end` is not specified,
   * it's set to `start` with `start` then set to `0`.
   *
   * **Note:** JavaScript follows the IEEE-754 standard for resolving
   * floating-point values which can produce unexpected results.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Util
   * @param {number} [start=0] The start of the range.
   * @param {number} end The end of the range.
   * @param {number} [step=1] The value to increment or decrement by.
   * @returns {Array} Returns the range of numbers.
   * @see _.inRange, _.rangeRight
   * @example
   *
   * _.range(4);
   * // => [0, 1, 2, 3]
   *
   * _.range(-4);
   * // => [0, -1, -2, -3]
   *
   * _.range(1, 5);
   * // => [1, 2, 3, 4]
   *
   * _.range(0, 20, 5);
   * // => [0, 5, 10, 15]
   *
   * _.range(0, -4, -1);
   * // => [0, -1, -2, -3]
   *
   * _.range(1, 4, 0);
   * // => [1, 1, 1]
   *
   * _.range(0);
   * // => []
   */
  var range = createRange();

  /**
   * This method returns a new empty array.
   *
   * @static
   * @memberOf _
   * @since 4.13.0
   * @category Util
   * @returns {Array} Returns the new empty array.
   * @example
   *
   * var arrays = _.times(2, _.stubArray);
   *
   * console.log(arrays);
   * // => [[], []]
   *
   * console.log(arrays[0] === arrays[1]);
   * // => false
   */
  function stubArray() {
    return [];
  }

  /**
   * This method returns `false`.
   *
   * @static
   * @memberOf _
   * @since 4.13.0
   * @category Util
   * @returns {boolean} Returns `false`.
   * @example
   *
   * _.times(2, _.stubFalse);
   * // => [false, false]
   */
  function stubFalse() {
    return false;
  }

  /*------------------------------------------------------------------------*/

  /**
   * Computes the maximum value of `array`. If `array` is empty or falsey,
   * `undefined` is returned.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Math
   * @param {Array} array The array to iterate over.
   * @returns {*} Returns the maximum value.
   * @example
   *
   * _.max([4, 2, 8, 6]);
   * // => 8
   *
   * _.max([]);
   * // => undefined
   */
  function max(array) {
    return (array && array.length)
      ? baseExtremum(array, identity, baseGt)
      : undefined;
  }

  /**
   * Computes the minimum value of `array`. If `array` is empty or falsey,
   * `undefined` is returned.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Math
   * @param {Array} array The array to iterate over.
   * @returns {*} Returns the minimum value.
   * @example
   *
   * _.min([4, 2, 8, 6]);
   * // => 2
   *
   * _.min([]);
   * // => undefined
   */
  function min(array) {
    return (array && array.length)
      ? baseExtremum(array, identity, baseLt)
      : undefined;
  }

  /*------------------------------------------------------------------------*/

  // Add methods that return wrapped values in chain sequences.
  lodash.assignIn = assignIn;
  lodash.chain = chain;
  lodash.compact = compact;
  lodash.constant = constant;
  lodash.debounce = debounce;
  lodash.delay = delay;
  lodash.filter = filter;
  lodash.flatten = flatten;
  lodash.groupBy = groupBy;
  lodash.intersection = intersection;
  lodash.iteratee = iteratee;
  lodash.keys = keys;
  lodash.keysIn = keysIn;
  lodash.map = map;
  lodash.memoize = memoize;
  lodash.merge = merge;
  lodash.mixin = mixin;
  lodash.negate = negate;
  lodash.omit = omit;
  lodash.pick = pick;
  lodash.property = property;
  lodash.range = range;
  lodash.reject = reject;
  lodash.reverse = reverse;
  lodash.sortBy = sortBy;
  lodash.tap = tap;
  lodash.throttle = throttle;
  lodash.thru = thru;
  lodash.toArray = toArray;
  lodash.toPlainObject = toPlainObject;
  lodash.union = union;
  lodash.uniq = uniq;
  lodash.values = values;
  lodash.without = without;

  // Add aliases.
  lodash.extend = assignIn;

  // Add methods to `lodash.prototype`.
  mixin(lodash, lodash);

  /*------------------------------------------------------------------------*/

  // Add methods that return unwrapped values in chain sequences.
  lodash.clone = clone;
  lodash.eq = eq;
  lodash.escapeRegExp = escapeRegExp;
  lodash.every = every;
  lodash.find = find;
  lodash.findIndex = findIndex;
  lodash.forEach = forEach;
  lodash.get = get;
  lodash.hasIn = hasIn;
  lodash.head = head;
  lodash.identity = identity;
  lodash.invoke = invoke;
  lodash.isArguments = isArguments;
  lodash.isArray = isArray;
  lodash.isArrayLike = isArrayLike;
  lodash.isArrayLikeObject = isArrayLikeObject;
  lodash.isBuffer = isBuffer;
  lodash.isEmpty = isEmpty;
  lodash.isEqual = isEqual;
  lodash.isFunction = isFunction;
  lodash.isLength = isLength;
  lodash.isMap = isMap;
  lodash.isObject = isObject;
  lodash.isObjectLike = isObjectLike;
  lodash.isPlainObject = isPlainObject;
  lodash.isSet = isSet;
  lodash.isString = isString;
  lodash.isSymbol = isSymbol;
  lodash.isTypedArray = isTypedArray;
  lodash.last = last;
  lodash.max = max;
  lodash.min = min;
  lodash.stubArray = stubArray;
  lodash.stubFalse = stubFalse;
  lodash.noop = noop;
  lodash.now = now;
  lodash.reduce = reduce;
  lodash.toFinite = toFinite;
  lodash.toInteger = toInteger;
  lodash.toNumber = toNumber;
  lodash.toString = toString;

  // Add aliases.
  lodash.each = forEach;
  lodash.first = head;

  mixin(lodash, (function() {
    var source = {};
    baseForOwn(lodash, function(func, methodName) {
      if (!hasOwnProperty.call(lodash.prototype, methodName)) {
        source[methodName] = func;
      }
    });
    return source;
  }()), { 'chain': false });

  /*------------------------------------------------------------------------*/

  /**
   * The semantic version number.
   *
   * @static
   * @memberOf _
   * @type {string}
   */
  lodash.VERSION = VERSION;

  // Add `LazyWrapper` methods for `_.drop` and `_.take` variants.
  arrayEach(['drop', 'take'], function(methodName, index) {
    LazyWrapper.prototype[methodName] = function(n) {
      n = n === undefined ? 1 : nativeMax(toInteger(n), 0);

      var result = (this.__filtered__ && !index)
        ? new LazyWrapper(this)
        : this.clone();

      if (result.__filtered__) {
        result.__takeCount__ = nativeMin(n, result.__takeCount__);
      } else {
        result.__views__.push({
          'size': nativeMin(n, MAX_ARRAY_LENGTH),
          'type': methodName + (result.__dir__ < 0 ? 'Right' : '')
        });
      }
      return result;
    };

    LazyWrapper.prototype[methodName + 'Right'] = function(n) {
      return this.reverse()[methodName](n).reverse();
    };
  });

  // Add `LazyWrapper` methods that accept an `iteratee` value.
  arrayEach(['filter', 'map', 'takeWhile'], function(methodName, index) {
    var type = index + 1,
        isFilter = type == LAZY_FILTER_FLAG || type == LAZY_WHILE_FLAG;

    LazyWrapper.prototype[methodName] = function(iteratee) {
      var result = this.clone();
      result.__iteratees__.push({
        'iteratee': getIteratee(iteratee, 3),
        'type': type
      });
      result.__filtered__ = result.__filtered__ || isFilter;
      return result;
    };
  });

  // Add `LazyWrapper` methods for `_.head` and `_.last`.
  arrayEach(['head', 'last'], function(methodName, index) {
    var takeName = 'take' + (index ? 'Right' : '');

    LazyWrapper.prototype[methodName] = function() {
      return this[takeName](1).value()[0];
    };
  });

  // Add `LazyWrapper` methods for `_.initial` and `_.tail`.
  arrayEach(['initial', 'tail'], function(methodName, index) {
    var dropName = 'drop' + (index ? '' : 'Right');

    LazyWrapper.prototype[methodName] = function() {
      return this.__filtered__ ? new LazyWrapper(this) : this[dropName](1);
    };
  });

  LazyWrapper.prototype.compact = function() {
    return this.filter(identity);
  };

  LazyWrapper.prototype.find = function(predicate) {
    return this.filter(predicate).head();
  };

  LazyWrapper.prototype.findLast = function(predicate) {
    return this.reverse().find(predicate);
  };

  LazyWrapper.prototype.invokeMap = baseRest(function(path, args) {
    if (typeof path == 'function') {
      return new LazyWrapper(this);
    }
    return this.map(function(value) {
      return baseInvoke(value, path, args);
    });
  });

  LazyWrapper.prototype.reject = function(predicate) {
    return this.filter(negate(getIteratee(predicate)));
  };

  LazyWrapper.prototype.slice = function(start, end) {
    start = toInteger(start);

    var result = this;
    if (result.__filtered__ && (start > 0 || end < 0)) {
      return new LazyWrapper(result);
    }
    if (start < 0) {
      result = result.takeRight(-start);
    } else if (start) {
      result = result.drop(start);
    }
    if (end !== undefined) {
      end = toInteger(end);
      result = end < 0 ? result.dropRight(-end) : result.take(end - start);
    }
    return result;
  };

  LazyWrapper.prototype.takeRightWhile = function(predicate) {
    return this.reverse().takeWhile(predicate).reverse();
  };

  LazyWrapper.prototype.toArray = function() {
    return this.take(MAX_ARRAY_LENGTH);
  };

  // Add `LazyWrapper` methods to `lodash.prototype`.
  baseForOwn(LazyWrapper.prototype, function(func, methodName) {
    var checkIteratee = /^(?:filter|find|map|reject)|While$/.test(methodName),
        isTaker = /^(?:head|last)$/.test(methodName),
        lodashFunc = lodash[isTaker ? ('take' + (methodName == 'last' ? 'Right' : '')) : methodName],
        retUnwrapped = isTaker || /^find/.test(methodName);

    if (!lodashFunc) {
      return;
    }
    lodash.prototype[methodName] = function() {
      var value = this.__wrapped__,
          args = isTaker ? [1] : arguments,
          isLazy = value instanceof LazyWrapper,
          iteratee = args[0],
          useLazy = isLazy || isArray(value);

      var interceptor = function(value) {
        var result = lodashFunc.apply(lodash, arrayPush([value], args));
        return (isTaker && chainAll) ? result[0] : result;
      };

      if (useLazy && checkIteratee && typeof iteratee == 'function' && iteratee.length != 1) {
        // Avoid lazy use if the iteratee has a "length" value other than `1`.
        isLazy = useLazy = false;
      }
      var chainAll = this.__chain__,
          isHybrid = !!this.__actions__.length,
          isUnwrapped = retUnwrapped && !chainAll,
          onlyLazy = isLazy && !isHybrid;

      if (!retUnwrapped && useLazy) {
        value = onlyLazy ? value : new LazyWrapper(this);
        var result = func.apply(value, args);
        result.__actions__.push({ 'func': thru, 'args': [interceptor], 'thisArg': undefined });
        return new LodashWrapper(result, chainAll);
      }
      if (isUnwrapped && onlyLazy) {
        return func.apply(this, args);
      }
      result = this.thru(interceptor);
      return isUnwrapped ? (isTaker ? result.value()[0] : result.value()) : result;
    };
  });

  // Add `Array` methods to `lodash.prototype`.
  arrayEach(['pop', 'push', 'shift', 'sort', 'splice', 'unshift'], function(methodName) {
    var func = arrayProto[methodName],
        chainName = /^(?:push|sort|unshift)$/.test(methodName) ? 'tap' : 'thru',
        retUnwrapped = /^(?:pop|shift)$/.test(methodName);

    lodash.prototype[methodName] = function() {
      var args = arguments;
      if (retUnwrapped && !this.__chain__) {
        var value = this.value();
        return func.apply(isArray(value) ? value : [], args);
      }
      return this[chainName](function(value) {
        return func.apply(isArray(value) ? value : [], args);
      });
    };
  });

  // Map minified method names to their real names.
  baseForOwn(LazyWrapper.prototype, function(func, methodName) {
    var lodashFunc = lodash[methodName];
    if (lodashFunc) {
      var key = lodashFunc.name + '';
      if (!hasOwnProperty.call(realNames, key)) {
        realNames[key] = [];
      }
      realNames[key].push({ 'name': methodName, 'func': lodashFunc });
    }
  });

  realNames[createHybrid(undefined, WRAP_BIND_KEY_FLAG).name] = [{
    'name': 'wrapper',
    'func': undefined
  }];

  // Add methods to `LazyWrapper`.
  LazyWrapper.prototype.clone = lazyClone;
  LazyWrapper.prototype.reverse = lazyReverse;
  LazyWrapper.prototype.value = lazyValue;

  // Add chain sequence methods to the `lodash` wrapper.
  lodash.prototype.chain = wrapperChain;
  lodash.prototype.commit = wrapperCommit;
  lodash.prototype.next = wrapperNext;
  lodash.prototype.plant = wrapperPlant;
  lodash.prototype.reverse = wrapperReverse;
  lodash.prototype.toJSON = lodash.prototype.valueOf = lodash.prototype.value = wrapperValue;

  // Add lazy aliases.
  lodash.prototype.first = lodash.prototype.head;

  if (symIterator) {
    lodash.prototype[symIterator] = wrapperToIterator;
  }

  /*--------------------------------------------------------------------------*/

  // Some AMD build optimizers, like r.js, check for condition patterns like:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose Lodash on the global object to prevent errors when Lodash is
    // loaded by a script tag in the presence of an AMD loader.
    // See http://requirejs.org/docs/errors.html#mismatch for more details.
    // Use `_.noConflict` to remove Lodash from the global object.
    root._ = lodash;

    // Define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module.
    define(function() {
      return lodash;
    });
  }
  // Check for `exports` after `define` in case a build optimizer adds it.
  else if (freeModule) {
    // Export for Node.js.
    (freeModule.exports = lodash)._ = lodash;
    // Export for CommonJS support.
    freeExports._ = lodash;
  }
  else {
    // Export to the global object.
    root._ = lodash;
  }
}.call(this));
/*global define:false */
/**
 * Copyright 2012-2017 Craig Campbell
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Mousetrap is a simple keyboard shortcut library for Javascript with
 * no external dependencies
 *
 * @version 1.6.5
 * @url craig.is/killing/mice
 */

(function(window, document, undefined) {

    // Check if mousetrap is used inside browser, if not, return
    if (!window) {
        return;
    }

    /**
     * mapping of special keycodes to their corresponding keys
     *
     * everything in this dictionary cannot use keypress events
     * so it has to be here to map to the correct keycodes for
     * keyup/keydown events
     *
     * @type {Object}
     */
    var _MAP = {
        8: 'backspace',
        9: 'tab',
        13: 'enter',
        16: 'shift',
        17: 'ctrl',
        18: 'alt',
        20: 'capslock',
        27: 'esc',
        32: 'space',
        33: 'pageup',
        34: 'pagedown',
        35: 'end',
        36: 'home',
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down',
        45: 'ins',
        46: 'del',
        91: 'meta',
        93: 'meta',
        224: 'meta'
    };

    /**
     * mapping for special characters so they can support
     *
     * this dictionary is only used incase you want to bind a
     * keyup or keydown event to one of these keys
     *
     * @type {Object}
     */
    var _KEYCODE_MAP = {
        106: '*',
        107: '+',
        109: '-',
        110: '.',
        111 : '/',
        186: ';',
        187: '=',
        188: ',',
        189: '-',
        190: '.',
        191: '/',
        192: '`',
        219: '[',
        220: '\\',
        221: ']',
        222: '\''
    };

    /**
     * this is a mapping of keys that require shift on a US keypad
     * back to the non shift equivelents
     *
     * this is so you can use keyup events with these keys
     *
     * note that this will only work reliably on US keyboards
     *
     * @type {Object}
     */
    var _SHIFT_MAP = {
        '~': '`',
        '!': '1',
        '@': '2',
        '#': '3',
        '$': '4',
        '%': '5',
        '^': '6',
        '&': '7',
        '*': '8',
        '(': '9',
        ')': '0',
        '_': '-',
        '+': '=',
        ':': ';',
        '\"': '\'',
        '<': ',',
        '>': '.',
        '?': '/',
        '|': '\\'
    };

    /**
     * this is a list of special strings you can use to map
     * to modifier keys when you specify your keyboard shortcuts
     *
     * @type {Object}
     */
    var _SPECIAL_ALIASES = {
        'option': 'alt',
        'command': 'meta',
        'return': 'enter',
        'escape': 'esc',
        'plus': '+',
        'mod': /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? 'meta' : 'ctrl'
    };

    /**
     * variable to store the flipped version of _MAP from above
     * needed to check if we should use keypress or not when no action
     * is specified
     *
     * @type {Object|undefined}
     */
    var _REVERSE_MAP;

    /**
     * loop through the f keys, f1 to f19 and add them to the map
     * programatically
     */
    for (var i = 1; i < 20; ++i) {
        _MAP[111 + i] = 'f' + i;
    }

    /**
     * loop through to map numbers on the numeric keypad
     */
    for (i = 0; i <= 9; ++i) {

        // This needs to use a string cause otherwise since 0 is falsey
        // mousetrap will never fire for numpad 0 pressed as part of a keydown
        // event.
        //
        // @see https://github.com/ccampbell/mousetrap/pull/258
        _MAP[i + 96] = i.toString();
    }

    /**
     * cross browser add event method
     *
     * @param {Element|HTMLDocument} object
     * @param {string} type
     * @param {Function} callback
     * @returns void
     */
    function _addEvent(object, type, callback) {
        if (object.addEventListener) {
            object.addEventListener(type, callback, false);
            return;
        }

        object.attachEvent('on' + type, callback);
    }

    /**
     * takes the event and returns the key character
     *
     * @param {Event} e
     * @return {string}
     */
    function _characterFromEvent(e) {

        // for keypress events we should return the character as is
        if (e.type == 'keypress') {
            var character = String.fromCharCode(e.which);

            // if the shift key is not pressed then it is safe to assume
            // that we want the character to be lowercase.  this means if
            // you accidentally have caps lock on then your key bindings
            // will continue to work
            //
            // the only side effect that might not be desired is if you
            // bind something like 'A' cause you want to trigger an
            // event when capital A is pressed caps lock will no longer
            // trigger the event.  shift+a will though.
            if (!e.shiftKey) {
                character = character.toLowerCase();
            }

            return character;
        }

        // for non keypress events the special maps are needed
        if (_MAP[e.which]) {
            return _MAP[e.which];
        }

        if (_KEYCODE_MAP[e.which]) {
            return _KEYCODE_MAP[e.which];
        }

        // if it is not in the special map

        // with keydown and keyup events the character seems to always
        // come in as an uppercase character whether you are pressing shift
        // or not.  we should make sure it is always lowercase for comparisons
        return String.fromCharCode(e.which).toLowerCase();
    }

    /**
     * checks if two arrays are equal
     *
     * @param {Array} modifiers1
     * @param {Array} modifiers2
     * @returns {boolean}
     */
    function _modifiersMatch(modifiers1, modifiers2) {
        return modifiers1.sort().join(',') === modifiers2.sort().join(',');
    }

    /**
     * takes a key event and figures out what the modifiers are
     *
     * @param {Event} e
     * @returns {Array}
     */
    function _eventModifiers(e) {
        var modifiers = [];

        if (e.shiftKey) {
            modifiers.push('shift');
        }

        if (e.altKey) {
            modifiers.push('alt');
        }

        if (e.ctrlKey) {
            modifiers.push('ctrl');
        }

        if (e.metaKey) {
            modifiers.push('meta');
        }

        return modifiers;
    }

    /**
     * prevents default for this event
     *
     * @param {Event} e
     * @returns void
     */
    function _preventDefault(e) {
        if (e.preventDefault) {
            e.preventDefault();
            return;
        }

        e.returnValue = false;
    }

    /**
     * stops propogation for this event
     *
     * @param {Event} e
     * @returns void
     */
    function _stopPropagation(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
            return;
        }

        e.cancelBubble = true;
    }

    /**
     * determines if the keycode specified is a modifier key or not
     *
     * @param {string} key
     * @returns {boolean}
     */
    function _isModifier(key) {
        return key == 'shift' || key == 'ctrl' || key == 'alt' || key == 'meta';
    }

    /**
     * reverses the map lookup so that we can look for specific keys
     * to see what can and can't use keypress
     *
     * @return {Object}
     */
    function _getReverseMap() {
        if (!_REVERSE_MAP) {
            _REVERSE_MAP = {};
            for (var key in _MAP) {

                // pull out the numeric keypad from here cause keypress should
                // be able to detect the keys from the character
                if (key > 95 && key < 112) {
                    continue;
                }

                if (_MAP.hasOwnProperty(key)) {
                    _REVERSE_MAP[_MAP[key]] = key;
                }
            }
        }
        return _REVERSE_MAP;
    }

    /**
     * picks the best action based on the key combination
     *
     * @param {string} key - character for key
     * @param {Array} modifiers
     * @param {string=} action passed in
     */
    function _pickBestAction(key, modifiers, action) {

        // if no action was picked in we should try to pick the one
        // that we think would work best for this key
        if (!action) {
            action = _getReverseMap()[key] ? 'keydown' : 'keypress';
        }

        // modifier keys don't work as expected with keypress,
        // switch to keydown
        if (action == 'keypress' && modifiers.length) {
            action = 'keydown';
        }

        return action;
    }

    /**
     * Converts from a string key combination to an array
     *
     * @param  {string} combination like "command+shift+l"
     * @return {Array}
     */
    function _keysFromString(combination) {
        if (combination === '+') {
            return ['+'];
        }

        combination = combination.replace(/\+{2}/g, '+plus');
        return combination.split('+');
    }

    /**
     * Gets info for a specific key combination
     *
     * @param  {string} combination key combination ("command+s" or "a" or "*")
     * @param  {string=} action
     * @returns {Object}
     */
    function _getKeyInfo(combination, action) {
        var keys;
        var key;
        var i;
        var modifiers = [];

        // take the keys from this pattern and figure out what the actual
        // pattern is all about
        keys = _keysFromString(combination);

        for (i = 0; i < keys.length; ++i) {
            key = keys[i];

            // normalize key names
            if (_SPECIAL_ALIASES[key]) {
                key = _SPECIAL_ALIASES[key];
            }

            // if this is not a keypress event then we should
            // be smart about using shift keys
            // this will only work for US keyboards however
            if (action && action != 'keypress' && _SHIFT_MAP[key]) {
                key = _SHIFT_MAP[key];
                modifiers.push('shift');
            }

            // if this key is a modifier then add it to the list of modifiers
            if (_isModifier(key)) {
                modifiers.push(key);
            }
        }

        // depending on what the key combination is
        // we will try to pick the best event for it
        action = _pickBestAction(key, modifiers, action);

        return {
            key: key,
            modifiers: modifiers,
            action: action
        };
    }

    function _belongsTo(element, ancestor) {
        if (element === null || element === document) {
            return false;
        }

        if (element === ancestor) {
            return true;
        }

        return _belongsTo(element.parentNode, ancestor);
    }

    function Mousetrap(targetElement) {
        var self = this;

        targetElement = targetElement || document;

        if (!(self instanceof Mousetrap)) {
            return new Mousetrap(targetElement);
        }

        /**
         * element to attach key events to
         *
         * @type {Element}
         */
        self.target = targetElement;

        /**
         * a list of all the callbacks setup via Mousetrap.bind()
         *
         * @type {Object}
         */
        self._callbacks = {};

        /**
         * direct map of string combinations to callbacks used for trigger()
         *
         * @type {Object}
         */
        self._directMap = {};

        /**
         * keeps track of what level each sequence is at since multiple
         * sequences can start out with the same sequence
         *
         * @type {Object}
         */
        var _sequenceLevels = {};

        /**
         * variable to store the setTimeout call
         *
         * @type {null|number}
         */
        var _resetTimer;

        /**
         * temporary state where we will ignore the next keyup
         *
         * @type {boolean|string}
         */
        var _ignoreNextKeyup = false;

        /**
         * temporary state where we will ignore the next keypress
         *
         * @type {boolean}
         */
        var _ignoreNextKeypress = false;

        /**
         * are we currently inside of a sequence?
         * type of action ("keyup" or "keydown" or "keypress") or false
         *
         * @type {boolean|string}
         */
        var _nextExpectedAction = false;

        /**
         * resets all sequence counters except for the ones passed in
         *
         * @param {Object} doNotReset
         * @returns void
         */
        function _resetSequences(doNotReset) {
            doNotReset = doNotReset || {};

            var activeSequences = false,
                key;

            for (key in _sequenceLevels) {
                if (doNotReset[key]) {
                    activeSequences = true;
                    continue;
                }
                _sequenceLevels[key] = 0;
            }

            if (!activeSequences) {
                _nextExpectedAction = false;
            }
        }

        /**
         * finds all callbacks that match based on the keycode, modifiers,
         * and action
         *
         * @param {string} character
         * @param {Array} modifiers
         * @param {Event|Object} e
         * @param {string=} sequenceName - name of the sequence we are looking for
         * @param {string=} combination
         * @param {number=} level
         * @returns {Array}
         */
        function _getMatches(character, modifiers, e, sequenceName, combination, level) {
            var i;
            var callback;
            var matches = [];
            var action = e.type;

            // if there are no events related to this keycode
            if (!self._callbacks[character]) {
                return [];
            }

            // if a modifier key is coming up on its own we should allow it
            if (action == 'keyup' && _isModifier(character)) {
                modifiers = [character];
            }

            // loop through all callbacks for the key that was pressed
            // and see if any of them match
            for (i = 0; i < self._callbacks[character].length; ++i) {
                callback = self._callbacks[character][i];

                // if a sequence name is not specified, but this is a sequence at
                // the wrong level then move onto the next match
                if (!sequenceName && callback.seq && _sequenceLevels[callback.seq] != callback.level) {
                    continue;
                }

                // if the action we are looking for doesn't match the action we got
                // then we should keep going
                if (action != callback.action) {
                    continue;
                }

                // if this is a keypress event and the meta key and control key
                // are not pressed that means that we need to only look at the
                // character, otherwise check the modifiers as well
                //
                // chrome will not fire a keypress if meta or control is down
                // safari will fire a keypress if meta or meta+shift is down
                // firefox will fire a keypress if meta, alt or control is down
                if ((action == 'keypress' && !e.metaKey && !e.altKey && !e.ctrlKey) || _modifiersMatch(modifiers, callback.modifiers)) {

                    // when you bind a combination or sequence a second time it
                    // should overwrite the first one.  if a sequenceName or
                    // combination is specified in this call it does just that
                    //
                    // @todo make deleting its own method?
                    var deleteCombo = !sequenceName && callback.combo == combination;
                    var deleteSequence = sequenceName && callback.seq == sequenceName && callback.level == level;
                    if (deleteCombo || deleteSequence) {
                        self._callbacks[character].splice(i, 1);
                    }

                    matches.push(callback);
                }
            }

            return matches;
        }

        /**
         * actually calls the callback function
         *
         * if your callback function returns false this will use the jquery
         * convention - prevent default and stop propogation on the event
         *
         * @param {Function} callback
         * @param {Event} e
         * @returns void
         */
        function _fireCallback(callback, e, combo, sequence) {

            // if this event should not happen stop here
            if (self.stopCallback(e, e.target || e.srcElement, combo, sequence)) {
                return;
            }

            if (callback(e, combo) === false) {
                _preventDefault(e);
                _stopPropagation(e);
            }
        }

        /**
         * handles a character key event
         *
         * @param {string} character
         * @param {Array} modifiers
         * @param {Event} e
         * @returns void
         */
        self._handleKey = function(character, modifiers, e) {
            var callbacks = _getMatches(character, modifiers, e);
            var i;
            var doNotReset = {};
            var maxLevel = 0;
            var processedSequenceCallback = false;

            // Calculate the maxLevel for sequences so we can only execute the longest callback sequence
            for (i = 0; i < callbacks.length; ++i) {
                if (callbacks[i].seq) {
                    maxLevel = Math.max(maxLevel, callbacks[i].level);
                }
            }

            // loop through matching callbacks for this key event
            for (i = 0; i < callbacks.length; ++i) {

                // fire for all sequence callbacks
                // this is because if for example you have multiple sequences
                // bound such as "g i" and "g t" they both need to fire the
                // callback for matching g cause otherwise you can only ever
                // match the first one
                if (callbacks[i].seq) {

                    // only fire callbacks for the maxLevel to prevent
                    // subsequences from also firing
                    //
                    // for example 'a option b' should not cause 'option b' to fire
                    // even though 'option b' is part of the other sequence
                    //
                    // any sequences that do not match here will be discarded
                    // below by the _resetSequences call
                    if (callbacks[i].level != maxLevel) {
                        continue;
                    }

                    processedSequenceCallback = true;

                    // keep a list of which sequences were matches for later
                    doNotReset[callbacks[i].seq] = 1;
                    _fireCallback(callbacks[i].callback, e, callbacks[i].combo, callbacks[i].seq);
                    continue;
                }

                // if there were no sequence matches but we are still here
                // that means this is a regular match so we should fire that
                if (!processedSequenceCallback) {
                    _fireCallback(callbacks[i].callback, e, callbacks[i].combo);
                }
            }

            // if the key you pressed matches the type of sequence without
            // being a modifier (ie "keyup" or "keypress") then we should
            // reset all sequences that were not matched by this event
            //
            // this is so, for example, if you have the sequence "h a t" and you
            // type "h e a r t" it does not match.  in this case the "e" will
            // cause the sequence to reset
            //
            // modifier keys are ignored because you can have a sequence
            // that contains modifiers such as "enter ctrl+space" and in most
            // cases the modifier key will be pressed before the next key
            //
            // also if you have a sequence such as "ctrl+b a" then pressing the
            // "b" key will trigger a "keypress" and a "keydown"
            //
            // the "keydown" is expected when there is a modifier, but the
            // "keypress" ends up matching the _nextExpectedAction since it occurs
            // after and that causes the sequence to reset
            //
            // we ignore keypresses in a sequence that directly follow a keydown
            // for the same character
            var ignoreThisKeypress = e.type == 'keypress' && _ignoreNextKeypress;
            if (e.type == _nextExpectedAction && !_isModifier(character) && !ignoreThisKeypress) {
                _resetSequences(doNotReset);
            }

            _ignoreNextKeypress = processedSequenceCallback && e.type == 'keydown';
        };

        /**
         * handles a keydown event
         *
         * @param {Event} e
         * @returns void
         */
        function _handleKeyEvent(e) {

            // normalize e.which for key events
            // @see http://stackoverflow.com/questions/4285627/javascript-keycode-vs-charcode-utter-confusion
            if (typeof e.which !== 'number') {
                e.which = e.keyCode;
            }

            var character = _characterFromEvent(e);

            // no character found then stop
            if (!character) {
                return;
            }

            // need to use === for the character check because the character can be 0
            if (e.type == 'keyup' && _ignoreNextKeyup === character) {
                _ignoreNextKeyup = false;
                return;
            }

            self.handleKey(character, _eventModifiers(e), e);
        }

        /**
         * called to set a 1 second timeout on the specified sequence
         *
         * this is so after each key press in the sequence you have 1 second
         * to press the next key before you have to start over
         *
         * @returns void
         */
        function _resetSequenceTimer() {
            clearTimeout(_resetTimer);
            _resetTimer = setTimeout(_resetSequences, 1000);
        }

        /**
         * binds a key sequence to an event
         *
         * @param {string} combo - combo specified in bind call
         * @param {Array} keys
         * @param {Function} callback
         * @param {string=} action
         * @returns void
         */
        function _bindSequence(combo, keys, callback, action) {

            // start off by adding a sequence level record for this combination
            // and setting the level to 0
            _sequenceLevels[combo] = 0;

            /**
             * callback to increase the sequence level for this sequence and reset
             * all other sequences that were active
             *
             * @param {string} nextAction
             * @returns {Function}
             */
            function _increaseSequence(nextAction) {
                return function() {
                    _nextExpectedAction = nextAction;
                    ++_sequenceLevels[combo];
                    _resetSequenceTimer();
                };
            }

            /**
             * wraps the specified callback inside of another function in order
             * to reset all sequence counters as soon as this sequence is done
             *
             * @param {Event} e
             * @returns void
             */
            function _callbackAndReset(e) {
                _fireCallback(callback, e, combo);

                // we should ignore the next key up if the action is key down
                // or keypress.  this is so if you finish a sequence and
                // release the key the final key will not trigger a keyup
                if (action !== 'keyup') {
                    _ignoreNextKeyup = _characterFromEvent(e);
                }

                // weird race condition if a sequence ends with the key
                // another sequence begins with
                setTimeout(_resetSequences, 10);
            }

            // loop through keys one at a time and bind the appropriate callback
            // function.  for any key leading up to the final one it should
            // increase the sequence. after the final, it should reset all sequences
            //
            // if an action is specified in the original bind call then that will
            // be used throughout.  otherwise we will pass the action that the
            // next key in the sequence should match.  this allows a sequence
            // to mix and match keypress and keydown events depending on which
            // ones are better suited to the key provided
            for (var i = 0; i < keys.length; ++i) {
                var isFinal = i + 1 === keys.length;
                var wrappedCallback = isFinal ? _callbackAndReset : _increaseSequence(action || _getKeyInfo(keys[i + 1]).action);
                _bindSingle(keys[i], wrappedCallback, action, combo, i);
            }
        }

        /**
         * binds a single keyboard combination
         *
         * @param {string} combination
         * @param {Function} callback
         * @param {string=} action
         * @param {string=} sequenceName - name of sequence if part of sequence
         * @param {number=} level - what part of the sequence the command is
         * @returns void
         */
        function _bindSingle(combination, callback, action, sequenceName, level) {

            // store a direct mapped reference for use with Mousetrap.trigger
            self._directMap[combination + ':' + action] = callback;

            // make sure multiple spaces in a row become a single space
            combination = combination.replace(/\s+/g, ' ');

            var sequence = combination.split(' ');
            var info;

            // if this pattern is a sequence of keys then run through this method
            // to reprocess each pattern one key at a time
            if (sequence.length > 1) {
                _bindSequence(combination, sequence, callback, action);
                return;
            }

            info = _getKeyInfo(combination, action);

            // make sure to initialize array if this is the first time
            // a callback is added for this key
            self._callbacks[info.key] = self._callbacks[info.key] || [];

            // remove an existing match if there is one
            _getMatches(info.key, info.modifiers, {type: info.action}, sequenceName, combination, level);

            // add this call back to the array
            // if it is a sequence put it at the beginning
            // if not put it at the end
            //
            // this is important because the way these are processed expects
            // the sequence ones to come first
            self._callbacks[info.key][sequenceName ? 'unshift' : 'push']({
                callback: callback,
                modifiers: info.modifiers,
                action: info.action,
                seq: sequenceName,
                level: level,
                combo: combination
            });
        }

        /**
         * binds multiple combinations to the same callback
         *
         * @param {Array} combinations
         * @param {Function} callback
         * @param {string|undefined} action
         * @returns void
         */
        self._bindMultiple = function(combinations, callback, action) {
            for (var i = 0; i < combinations.length; ++i) {
                _bindSingle(combinations[i], callback, action);
            }
        };

        // start!
        _addEvent(targetElement, 'keypress', _handleKeyEvent);
        _addEvent(targetElement, 'keydown', _handleKeyEvent);
        _addEvent(targetElement, 'keyup', _handleKeyEvent);
    }

    /**
     * binds an event to mousetrap
     *
     * can be a single key, a combination of keys separated with +,
     * an array of keys, or a sequence of keys separated by spaces
     *
     * be sure to list the modifier keys first to make sure that the
     * correct key ends up getting bound (the last key in the pattern)
     *
     * @param {string|Array} keys
     * @param {Function} callback
     * @param {string=} action - 'keypress', 'keydown', or 'keyup'
     * @returns void
     */
    Mousetrap.prototype.bind = function(keys, callback, action) {
        var self = this;
        keys = keys instanceof Array ? keys : [keys];
        self._bindMultiple.call(self, keys, callback, action);
        return self;
    };

    /**
     * unbinds an event to mousetrap
     *
     * the unbinding sets the callback function of the specified key combo
     * to an empty function and deletes the corresponding key in the
     * _directMap dict.
     *
     * TODO: actually remove this from the _callbacks dictionary instead
     * of binding an empty function
     *
     * the keycombo+action has to be exactly the same as
     * it was defined in the bind method
     *
     * @param {string|Array} keys
     * @param {string} action
     * @returns void
     */
    Mousetrap.prototype.unbind = function(keys, action) {
        var self = this;
        return self.bind.call(self, keys, function() {}, action);
    };

    /**
     * triggers an event that has already been bound
     *
     * @param {string} keys
     * @param {string=} action
     * @returns void
     */
    Mousetrap.prototype.trigger = function(keys, action) {
        var self = this;
        if (self._directMap[keys + ':' + action]) {
            self._directMap[keys + ':' + action]({}, keys);
        }
        return self;
    };

    /**
     * resets the library back to its initial state.  this is useful
     * if you want to clear out the current keyboard shortcuts and bind
     * new ones - for example if you switch to another page
     *
     * @returns void
     */
    Mousetrap.prototype.reset = function() {
        var self = this;
        self._callbacks = {};
        self._directMap = {};
        return self;
    };

    /**
     * should we stop this event before firing off callbacks
     *
     * @param {Event} e
     * @param {Element} element
     * @return {boolean}
     */
    Mousetrap.prototype.stopCallback = function(e, element) {
        var self = this;

        // if the element has the class "mousetrap" then no need to stop
        if ((' ' + element.className + ' ').indexOf(' mousetrap ') > -1) {
            return false;
        }

        if (_belongsTo(element, self.target)) {
            return false;
        }

        // Events originating from a shadow DOM are re-targetted and `e.target` is the shadow host,
        // not the initial event target in the shadow tree. Note that not all events cross the
        // shadow boundary.
        // For shadow trees with `mode: 'open'`, the initial event target is the first element in
        // the event’s composed path. For shadow trees with `mode: 'closed'`, the initial event
        // target cannot be obtained.
        if ('composedPath' in e && typeof e.composedPath === 'function') {
            // For open shadow trees, update `element` so that the following check works.
            var initialEventTarget = e.composedPath()[0];
            if (initialEventTarget !== e.target) {
                element = initialEventTarget;
            }
        }

        // stop for input, select, and textarea
        return element.tagName == 'INPUT' || element.tagName == 'SELECT' || element.tagName == 'TEXTAREA' || element.isContentEditable;
    };

    /**
     * exposes _handleKey publicly so it can be overwritten by extensions
     */
    Mousetrap.prototype.handleKey = function() {
        var self = this;
        return self._handleKey.apply(self, arguments);
    };

    /**
     * allow custom key mappings
     */
    Mousetrap.addKeycodes = function(object) {
        for (var key in object) {
            if (object.hasOwnProperty(key)) {
                _MAP[key] = object[key];
            }
        }
        _REVERSE_MAP = null;
    };

    /**
     * Init the global mousetrap functions
     *
     * This method is needed to allow the global mousetrap functions to work
     * now that mousetrap is a constructor function.
     */
    Mousetrap.init = function() {
        var documentMousetrap = Mousetrap(document);
        for (var method in documentMousetrap) {
            if (method.charAt(0) !== '_') {
                Mousetrap[method] = (function(method) {
                    return function() {
                        return documentMousetrap[method].apply(documentMousetrap, arguments);
                    };
                } (method));
            }
        }
    };

    Mousetrap.init();

    // expose mousetrap to the global object
    window.Mousetrap = Mousetrap;

    // expose as a common js module
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Mousetrap;
    }

    // expose mousetrap as an AMD module
    if (typeof define === 'function' && define.amd) {
        define(function() {
            return Mousetrap;
        });
    }
}) (typeof window !== 'undefined' ? window : null, typeof  window !== 'undefined' ? document : null);
/**
 * adds a bindGlobal method to Mousetrap that allows you to
 * bind specific keyboard shortcuts that will still work
 * inside a text input field
 *
 * usage:
 * Mousetrap.bindGlobal('ctrl+s', _saveChanges);
 */
/* global Mousetrap:true */

(function(Mousetrap) {
    if (! Mousetrap) {
        return;
    }
    var _globalCallbacks = {};
    var _originalStopCallback = Mousetrap.prototype.stopCallback;

    Mousetrap.prototype.stopCallback = function(e, element, combo, sequence) {
        var self = this;

        if (self.paused) {
            return true;
        }

        if (_globalCallbacks[combo] || _globalCallbacks[sequence]) {
            return false;
        }

        return _originalStopCallback.call(self, e, element, combo);
    };

    Mousetrap.prototype.bindGlobal = function(keys, callback, action) {
        var self = this;
        self.bind(keys, callback, action);

        if (keys instanceof Array) {
            for (var i = 0; i < keys.length; i++) {
                _globalCallbacks[keys[i]] = true;
            }
            return;
        }

        _globalCallbacks[keys] = true;
    };

    Mousetrap.init();
}) (typeof Mousetrap !== "undefined" ? Mousetrap : undefined);
(function(exports) {
  "use strict";
  var config = {};

  var browserGlobal = (typeof window !== 'undefined') ? window : {};

  var MutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
  var RSVP;

  if (typeof process !== 'undefined' &&
    {}.toString.call(process) === '[object process]') {
    config.async = function(callback, binding) {
      process.nextTick(function() {
        callback.call(binding);
      });
    };
  } else if (MutationObserver) {
    var queue = [];

    var observer = new MutationObserver(function() {
      var toProcess = queue.slice();
      queue = [];

      toProcess.forEach(function(tuple) {
        var callback = tuple[0], binding = tuple[1];
        callback.call(binding);
      });
    });

    var element = document.createElement('div');
    observer.observe(element, { attributes: true });

    // Chrome Memory Leak: https://bugs.webkit.org/show_bug.cgi?id=93661
    window.addEventListener('unload', function(){
      observer.disconnect();
      observer = null;
    });

    config.async = function(callback, binding) {
      queue.push([callback, binding]);
      element.setAttribute('drainQueue', 'drainQueue');
    };
  } else {
    config.async = function(callback, binding) {
      setTimeout(function() {
        callback.call(binding);
      }, 1);
    };
  }

  var Event = function(type, options) {
    this.type = type;

    for (var option in options) {
      if (!options.hasOwnProperty(option)) { continue; }

      this[option] = options[option];
    }
  };

  var indexOf = function(callbacks, callback) {
    for (var i=0, l=callbacks.length; i<l; i++) {
      if (callbacks[i][0] === callback) { return i; }
    }

    return -1;
  };

  var callbacksFor = function(object) {
    var callbacks = object._promiseCallbacks;

    if (!callbacks) {
      callbacks = object._promiseCallbacks = {};
    }

    return callbacks;
  };

  var EventTarget = {
    mixin: function(object) {
      object.on = this.on;
      object.off = this.off;
      object.trigger = this.trigger;
      return object;
    },

    on: function(eventNames, callback, binding) {
      var allCallbacks = callbacksFor(this), callbacks, eventName;
      eventNames = eventNames.split(/\s+/);
      binding = binding || this;

      while (eventName = eventNames.shift()) {
        callbacks = allCallbacks[eventName];

        if (!callbacks) {
          callbacks = allCallbacks[eventName] = [];
        }

        if (indexOf(callbacks, callback) === -1) {
          callbacks.push([callback, binding]);
        }
      }
    },

    off: function(eventNames, callback) {
      var allCallbacks = callbacksFor(this), callbacks, eventName, index;
      eventNames = eventNames.split(/\s+/);

      while (eventName = eventNames.shift()) {
        if (!callback) {
          allCallbacks[eventName] = [];
          continue;
        }

        callbacks = allCallbacks[eventName];

        index = indexOf(callbacks, callback);

        if (index !== -1) { callbacks.splice(index, 1); }
      }
    },

    trigger: function(eventName, options) {
      var allCallbacks = callbacksFor(this),
          callbacks, callbackTuple, callback, binding, event;

      if (callbacks = allCallbacks[eventName]) {
        for (var i=0, l=callbacks.length; i<l; i++) {
          callbackTuple = callbacks[i];
          callback = callbackTuple[0];
          binding = callbackTuple[1];

          if (typeof options !== 'object') {
            options = { detail: options };
          }

          event = new Event(eventName, options);
          callback.call(binding, event);
        }
      }
    }
  };

  var Promise = function() {
    this.on('promise:resolved', function(event) {
      this.trigger('success', { detail: event.detail });
    }, this);

    this.on('promise:failed', function(event) {
      this.trigger('error', { detail: event.detail });
    }, this);
  };

  var noop = function() {};

  var invokeCallback = function(type, promise, callback, event) {
    var hasCallback = typeof callback === 'function',
        value, error, succeeded, failed;

    if (hasCallback) {
      try {
        value = callback(event.detail);
        succeeded = true;
      } catch(e) {
        failed = true;
        error = e;
      }
    } else {
      value = event.detail;
      succeeded = true;
    }

    if (value && typeof value.then === 'function') {
      value.then(function(value) {
        promise.resolve(value);
      }, function(error) {
        promise.reject(error);
      });
    } else if (hasCallback && succeeded) {
      promise.resolve(value);
    } else if (failed) {
      promise.reject(error);
    } else {
      promise[type](value);
    }
  };

  Promise.prototype = {
    then: function(done, fail) {
      var thenPromise = new Promise();

      if (this.isResolved) {
        config.async(function() {
          invokeCallback('resolve', thenPromise, done, { detail: this.resolvedValue });
        }, this);
      }

      if (this.isRejected) {
        config.async(function() {
          invokeCallback('reject', thenPromise, fail, { detail: this.rejectedValue });
        }, this);
      }

      this.on('promise:resolved', function(event) {
        invokeCallback('resolve', thenPromise, done, event);
      });

      this.on('promise:failed', function(event) {
        invokeCallback('reject', thenPromise, fail, event);
      });

      return thenPromise;
    },

    resolve: function(value) {
      resolve(this, value);

      this.resolve = noop;
      this.reject = noop;
    },

    reject: function(value) {
      reject(this, value);

      this.resolve = noop;
      this.reject = noop;
    }
  };

  function resolve(promise, value) {
    config.async(function() {
      promise.trigger('promise:resolved', { detail: value });
      promise.isResolved = true;
      promise.resolvedValue = value;
    });
  }

  function reject(promise, value) {
    config.async(function() {
      promise.trigger('promise:failed', { detail: value });
      promise.isRejected = true;
      promise.rejectedValue = value;
    });
  }

  function all(promises) {
    var i, results = [];
    var allPromise = new Promise();
    var remaining = promises.length;

    if (remaining === 0) {
      allPromise.resolve([]);
    }

    var resolver = function(index) {
      return function(value) {
        resolve(index, value);
      };
    };

    var resolve = function(index, value) {
      results[index] = value;
      if (--remaining === 0) {
        allPromise.resolve(results);
      }
    };

    var reject = function(error) {
      allPromise.reject(error);
    };

    for (i = 0; i < remaining; i++) {
      promises[i].then(resolver(i), reject);
    }
    return allPromise;
  }

  EventTarget.mixin(Promise.prototype);

  function configure(name, value) {
    config[name] = value;
  }

  exports.Promise = Promise;
  exports.Event = Event;
  exports.EventTarget = EventTarget;
  exports.all = all;
  exports.configure = configure;
})(window.RSVP = {});
// Animates the dimensional changes resulting from altering element contents
// Usage examples:
//    $("#myElement").showHtml("new HTML contents");
//    $("div").showHtml("new HTML contents", 400);
//    $(".className").showHtml("new HTML contents", 400,
//                    function() {/* on completion */});
(function($)
{
   $.fn.showHtml = function(html, speed, callback)
   {
      return this.each(function()
      {
         // The element to be modified
         var el = $(this);

         // Preserve the original values of width and height - they'll need
         // to be modified during the animation, but can be restored once
         // the animation has completed.
         var finish = {width: this.style.width, height: this.style.height};

         // The original width and height represented as pixel values.
         // These will only be the same as `finish` if this element had its
         // dimensions specified explicitly and in pixels. Of course, if that
         // was done then this entire routine is pointless, as the dimensions
         // won't change when the content is changed.
         var cur = {width: el.width()+'px', height: el.height()+'px'};

         // Modify the element's contents. Element will resize.
         el.html(html);

         // Capture the final dimensions of the element
         // (with initial style settings still in effect)
         var next = {width: el.width()+'px', height: el.height()+'px'};

         el .css(cur) // restore initial dimensions
            .animate(next, speed, function()  // animate to final dimensions
            {
               el.css(finish); // restore initial style settings
               if ( $.isFunction(callback) ) callback();
            });
      });
   };


})(jQuery);
(function (global) {
  "use strict";

  function aliasMethod(methodName) {
    return function() {
      return this[methodName].apply(this, arguments);
    };
  }

  function empty(obj) {
    var key;
    for (key in obj) if (obj.hasOwnProperty(key)) return false;
    return true;
  }

  var Ember = global.Ember,
      get = Ember.get, set = Ember.set,
      isArray = Ember.isArray, getProperties = Ember.getProperties,
      notifyPropertyChange = Ember.notifyPropertyChange,
      meta = Ember.meta, defineProperty = Ember.defineProperty;

  var hasOwnProp = Object.prototype.hasOwnProperty;

  var BufferedProxyMixin = Ember.Mixin.create({
    buffer: null,
    hasBufferedChanges: false,

    hasChanges: Ember.computed.readOnly('hasBufferedChanges'),

    applyChanges: function() {
      return this.applyBufferedChanges(...arguments);
    },

    discardChanges: function() {
      return this.discardBufferedChanges(...arguments);
    },

    init: function() {
      this.initializeBuffer();
      set(this, 'hasBufferedChanges', false);
      this._super(...arguments);
    },

    initializeBuffer: function(onlyTheseKeys) {
      if(isArray(onlyTheseKeys) && !empty(onlyTheseKeys)) {
        onlyTheseKeys.forEach((key) => delete this.buffer[key]);
      }
      else {
        set(this, 'buffer', Object.create(null));
      }
    },

    unknownProperty: function(key) {
      var buffer = get(this, 'buffer');
      return (hasOwnProp.call(buffer, key)) ? buffer[key] : this._super(key);
    },

    setUnknownProperty: function(key, value) {
      var m = meta(this);

      if (m.proto === this || (m.isInitializing && m.isInitializing())) {
        defineProperty(this, key, null, value);
        return value;
      }

      var props = getProperties(this, ['buffer', 'content']),
          buffer = props.buffer,
          content = props.content,
          current,
          previous;

      if (content != null) {
        current = get(content, key);
      }

      previous = hasOwnProp.call(buffer, key) ? buffer[key] : current;

      if (previous === value) {
        return;
      }

      if (current === value) {
        delete buffer[key];
        if (empty(buffer)) {
          set(this, 'hasBufferedChanges', false);
        }
      } else {
        buffer[key] = value;
        set(this, 'hasBufferedChanges', true);
      }

      notifyPropertyChange(content, key);

      return value;
    },

    applyBufferedChanges: function(onlyTheseKeys) {
      var props = getProperties(this, ['buffer', 'content']),
          buffer = props.buffer,
          content = props.content,
          key;

      Object.keys(buffer).forEach((key) => {
        if (isArray(onlyTheseKeys) && onlyTheseKeys.indexOf(key) === -1) {
          return;
        }

        set(content, key, buffer[key]);
      });

      this.initializeBuffer(onlyTheseKeys);

      if (empty(get(this, 'buffer'))) {
        set(this, 'hasBufferedChanges', false);
      }
    },

    discardBufferedChanges: function(onlyTheseKeys) {
      var props = getProperties(this, ['buffer', 'content']),
          buffer = props.buffer,
          content = props.content,
          key;

      this.initializeBuffer(onlyTheseKeys);

      Object.keys(buffer).forEach((key) => {
        if (isArray(onlyTheseKeys) && onlyTheseKeys.indexOf(key) === -1) {
          return;
        }

        notifyPropertyChange(content, key);
      });

      if (empty(get(this, 'buffer'))) {
        set(this, 'hasBufferedChanges', false);
      }
    },

    hasChanged: function(key) {
      var props = getProperties(this, ['buffer', 'content']),
          buffer = props.buffer,
          content = props.content,
          key;

      if (typeof key !== 'string' || typeof get(buffer, key) === 'undefined') {
        return false;
      }

      if (get(buffer, key) !== get(content, key)) {
        return true;
      }

      return false;
    }
  });

  var BufferedProxy = Ember.ObjectProxy.extend(BufferedProxyMixin);

  // CommonJS module
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BufferedProxy;
  } else if (typeof define === "function" && define.amd) {
    define("ember-buffered-proxy/proxy", function (require, exports, module) {
      return BufferedProxy;
    });
  } else {
    global.BufferedProxy = BufferedProxy;
  }
}(this));
/*!

    Copyright (c) 2011 Peter van der Spek

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
    
 */



(function($) {

    /**
     * Hash containing mapping of selectors to settings hashes for target selectors that should be live updated.
     *
     * @type {Object.<string, Object>}
     * @private
     */
    var liveUpdatingTargetSelectors = {};

    /**
     * Interval ID for live updater. Contains interval ID when the live updater interval is active, or is undefined
     * otherwise.
     *
     * @type {number}
     * @private
     */
    var liveUpdaterIntervalId;

    /**
     * Boolean indicating whether the live updater is running.
     *
     * @type {boolean}
     * @private
     */
    var liveUpdaterRunning = false;

    /**
     * Set of default settings.
     *
     * @type {Object.<string, string>}
     * @private
     */
    var defaultSettings = {
                ellipsis: '...',
                setTitle: 'never',
                live: false
            };

    /**
     * Perform ellipsis on selected elements.
     *
     * @param {string} selector the inner selector of elements that ellipsis may work on. Inner elements not referred to by this
     *      selector are left untouched.
     * @param {Object.<string, string>=} options optional options to override default settings.
     * @return {jQuery} the current jQuery object for chaining purposes.
     * @this {jQuery} the current jQuery object.
     */
    $.fn.ellipsis = function(selector, options) {
        var subjectElements, settings;

        subjectElements = $(this);

        // Check for options argument only.
        if (typeof selector !== 'string') {
            options = selector;
            selector = undefined;
        }

        // Create the settings from the given options and the default settings.
        settings = $.extend({}, defaultSettings, options);

        // If selector is not set, work on immediate children (default behaviour).
        settings.selector = selector;

        // Do ellipsis on each subject element.
        subjectElements.each(function() {
            var elem = $(this);

            // Do ellipsis on subject element.
            ellipsisOnElement(elem, settings);
        });

        // If live option is enabled, add subject elements to live updater. Otherwise remove from live updater.
        if (settings.live) {
            addToLiveUpdater(subjectElements.selector, settings);

        } else {
            removeFromLiveUpdater(subjectElements.selector);
        }

        // Return jQuery object for chaining.
        return this;
    };


    /**
     * Perform ellipsis on the given container.
     *
     * @param {jQuery} containerElement jQuery object containing one DOM element to perform ellipsis on.
     * @param {Object.<string, string>} settings the settings for this ellipsis operation.
     * @private
     */
    function ellipsisOnElement(containerElement, settings) {
        var containerData = containerElement.data('jqae');
        if (!containerData) containerData = {};

        // Check if wrapper div was already created and bound to the container element.
        var wrapperElement = containerData.wrapperElement;

        // If not, create wrapper element.
        if (!wrapperElement) {
            wrapperElement = containerElement.wrapInner('<div/>').find('>div');

            // Wrapper div should not add extra size.
            wrapperElement.css({
                margin: 0,
                padding: 0,
                border: 0
            });
        }

        // Check if the original wrapper element content was already bound to the wrapper element.
        var wrapperElementData = wrapperElement.data('jqae');
        if (!wrapperElementData) wrapperElementData = {};

        var wrapperOriginalContent = wrapperElementData.originalContent;

        // If so, clone the original content, re-bind the original wrapper content to the clone, and replace the
        // wrapper with the clone.
        if (wrapperOriginalContent) {
            wrapperElement = wrapperElementData.originalContent.clone(true)
                    .data('jqae', {originalContent: wrapperOriginalContent}).replaceAll(wrapperElement);

        } else {
            // Otherwise, clone the current wrapper element and bind it as original content to the wrapper element.

            wrapperElement.data('jqae', {originalContent: wrapperElement.clone(true)});
        }

        // Bind the wrapper element and current container width and height to the container element. Current container
        // width and height are stored to detect changes to the container size.
        containerElement.data('jqae', {
            wrapperElement: wrapperElement,
            containerWidth: containerElement.width(),
            containerHeight: containerElement.height()
        });

        // Calculate with current container element height.
        var containerElementHeight = containerElement.height();

        // Calculate wrapper offset.
        var wrapperOffset = (parseInt(containerElement.css('padding-top'), 10) || 0) + (parseInt(containerElement.css('border-top-width'), 10) || 0) - (wrapperElement.offset().top - containerElement.offset().top);

        // Normally the ellipsis characters are applied to the last non-empty text-node in the selected element. If the
        // selected element becomes empty during ellipsis iteration, the ellipsis characters cannot be applied to that
        // selected element, and must be deferred to the previous selected element. This parameter keeps track of that.
        var deferAppendEllipsis = false;

        // Loop through all selected elements in reverse order.
        var selectedElements = wrapperElement;
        if (settings.selector) selectedElements = $(wrapperElement.find(settings.selector).get().reverse());

        selectedElements.each(function() {
            var selectedElement = $(this),
                    originalText = selectedElement.text(),
                    ellipsisApplied = false;

            // Check if we can safely remove the selected element. This saves a lot of unnecessary iterations.
            if (wrapperElement.innerHeight() - selectedElement.innerHeight() > containerElementHeight + wrapperOffset) {
                selectedElement.remove();

            } else {
                // Reverse recursively remove empty elements, until the element that contains a non-empty text-node.
                removeLastEmptyElements(selectedElement);

                // If the selected element has not become empty, start ellipsis iterations on the selected element.
                if (selectedElement.contents().length) {

                    // If a deffered ellipsis is still pending, apply it now to the last text-node.
                    if (deferAppendEllipsis) {
                        getLastTextNode(selectedElement).get(0).nodeValue += settings.ellipsis;
                        deferAppendEllipsis = false;
                    }

                    // Iterate until wrapper element height is less than or equal to the original container element
                    // height plus possible wrapperOffset.
                    while (wrapperElement.innerHeight() > containerElementHeight + wrapperOffset) {
                        // Apply ellipsis on last text node, by removing one word.
                        ellipsisApplied = ellipsisOnLastTextNode(selectedElement);

                        // If ellipsis was succesfully applied, remove any remaining empty last elements and append the
                        // ellipsis characters.
                        if (ellipsisApplied) {
                            removeLastEmptyElements(selectedElement);

                            // If the selected element is not empty, append the ellipsis characters.
                            if (selectedElement.contents().length) {
                                getLastTextNode(selectedElement).get(0).nodeValue += settings.ellipsis;

                            } else {
                                // If the selected element has become empty, defer the appending of the ellipsis characters
                                // to the previous selected element.
                                deferAppendEllipsis = true;
                                selectedElement.remove();
                                break;
                            }

                        } else {
                            // If ellipsis could not be applied, defer the appending of the ellipsis characters to the
                            // previous selected element.
                            deferAppendEllipsis = true;
                            selectedElement.remove();
                            break;
                        }
                    }

                    // If the "setTitle" property is set to "onEllipsis" and the ellipsis has been applied, or if the
                    // property is set to "always", the add the "title" attribute with the original text. Else remove the
                    // "title" attribute. When the "setTitle" property is set to "never" we do not touch the "title"
                    // attribute.
                    if (((settings.setTitle == 'onEllipsis') && ellipsisApplied) || (settings.setTitle == 'always')) {
                        selectedElement.attr('title', originalText);

                    } else if (settings.setTitle != 'never') {
                        selectedElement.removeAttr('title');
                    }
                }
            }
        });
    }

    /**
     * Performs ellipsis on the last text node of the given element. Ellipsis is done by removing a full word.
     *
     * @param {jQuery} element jQuery object containing a single DOM element.
     * @return {boolean} true when ellipsis has been done, false otherwise.
     * @private
     */
    function ellipsisOnLastTextNode(element) {
        var lastTextNode = getLastTextNode(element);

        // If the last text node is found, do ellipsis on that node.
        if (lastTextNode.length) {
            var text = lastTextNode.get(0).nodeValue;

            // Find last space character, and remove text from there. If no space is found the full remaining text is
            // removed.
            var pos = text.lastIndexOf(' ');
            if (pos > -1) {
                text = $.trim(text.substring(0, pos));
                lastTextNode.get(0).nodeValue = text;

            } else {
                lastTextNode.get(0).nodeValue = '';
            }

            return true;
        }

        return false;
    }

    /**
     * Get last text node of the given element.
     *
     * @param {jQuery} element jQuery object containing a single element.
     * @return {jQuery} jQuery object containing a single text node.
     * @private
     */
    function getLastTextNode(element) {
        if (element.contents().length) {

            // Get last child node.
            var contents = element.contents();
            var lastNode = contents.eq(contents.length - 1);

            // If last node is a text node, return it.
            if (lastNode.filter(textNodeFilter).length) {
                return lastNode;

            } else {
                // Else it is an element node, and we recurse into it.

                return getLastTextNode(lastNode);
            }

        } else {
            // If there is no last child node, we append an empty text node and return that. Normally this should not
            // happen, as we test for emptiness before calling getLastTextNode.

            element.append('');
            var contents = element.contents();
            return contents.eq(contents.length - 1);
        }
    }

    /**
     * Remove last empty elements. This is done recursively until the last element contains a non-empty text node.
     *
     * @param {jQuery} element jQuery object containing a single element.
     * @return {boolean} true when elements have been removed, false otherwise.
     * @private
     */
    function removeLastEmptyElements(element) {
        if (element.contents().length) {

            // Get last child node.
            var contents = element.contents();
            var lastNode = contents.eq(contents.length - 1);

            // If last child node is a text node, check for emptiness.
            if (lastNode.filter(textNodeFilter).length) {
                var text = lastNode.get(0).nodeValue;
                text = $.trim(text);

                if (text == '') {
                    // If empty, remove the text node.
                    lastNode.remove();

                    return true;

                } else {
                    return false;
                }

            } else {
                // If the last child node is an element node, remove the last empty child nodes on that node.
                while (removeLastEmptyElements(lastNode)) {
                }

                // If the last child node contains no more child nodes, remove the last child node.
                if (lastNode.contents().length) {
                    return false;

                } else {
                    lastNode.remove();

                    return true;
                }
            }
        }   

        return false;
    }

    /**
     * Filter for testing on text nodes.
     *
     * @return {boolean} true when this node is a text node, false otherwise.
     * @this {Node}
     * @private
     */
    function textNodeFilter() {
        return this.nodeType === 3;
    }

    /**
     * Add target selector to hash of target selectors. If this is the first target selector added, start the live
     * updater.
     *
     * @param {string} targetSelector the target selector to run the live updater for.
     * @param {Object.<string, string>} settings the settings to apply on this target selector.
     * @private
     */
    function addToLiveUpdater(targetSelector, settings) {
        // Store target selector with its settings.
        liveUpdatingTargetSelectors[targetSelector] = settings;

        // If the live updater has not yet been started, start it now.
        if (!liveUpdaterIntervalId) {
            liveUpdaterIntervalId = window.setInterval(function() {
                doLiveUpdater();
            }, 200);
        }
    }

    /**
     * Remove the target selector from the hash of target selectors. It this is the last remaining target selector
     * being removed, stop the live updater.
     *
     * @param {string} targetSelector the target selector to stop running the live updater for.
     * @private
     */
    function removeFromLiveUpdater(targetSelector) {
        // If the hash contains the target selector, remove it.
        if (liveUpdatingTargetSelectors[targetSelector]) {
            delete liveUpdatingTargetSelectors[targetSelector];

            // If no more target selectors are in the hash, stop the live updater.
            if (!liveUpdatingTargetSelectors.length) {
                if (liveUpdaterIntervalId) {
                    window.clearInterval(liveUpdaterIntervalId);
                    liveUpdaterIntervalId = undefined;
                }
            }
        }
    };

    /**
     * Run the live updater. The live updater is periodically run to check if its monitored target selectors require
     * re-applying of the ellipsis.
     *
     * @private
     */
    function doLiveUpdater() {
        // If the live updater is already running, skip this time. We only want one instance running at a time.
        if (!liveUpdaterRunning) {
            liveUpdaterRunning = true;

            // Loop through target selectors.
            for (var targetSelector in liveUpdatingTargetSelectors) {
                $(targetSelector).each(function() {
                    var containerElement, containerData;

                    containerElement = $(this);
                    containerData = containerElement.data('jqae');

                    // If container element dimensions have changed, or the container element is new, run ellipsis on
                    // that container element.
                    if ((containerData.containerWidth != containerElement.width()) ||
                            (containerData.containerHeight != containerElement.height())) {
                        ellipsisOnElement(containerElement, liveUpdatingTargetSelectors[targetSelector]);
                    }
                });
            }

            liveUpdaterRunning = false;
        }
    };

})(jQuery);
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.virtualDom=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var createElement = require("./vdom/create-element.js")

module.exports = createElement

},{"./vdom/create-element.js":15}],2:[function(require,module,exports){
var diff = require("./vtree/diff.js")

module.exports = diff

},{"./vtree/diff.js":35}],3:[function(require,module,exports){
var h = require("./virtual-hyperscript/index.js")

module.exports = h

},{"./virtual-hyperscript/index.js":22}],4:[function(require,module,exports){
var diff = require("./diff.js")
var patch = require("./patch.js")
var h = require("./h.js")
var create = require("./create-element.js")
var VNode = require('./vnode/vnode.js')
var VText = require('./vnode/vtext.js')

module.exports = {
    diff: diff,
    patch: patch,
    h: h,
    create: create,
    VNode: VNode,
    VText: VText
}

},{"./create-element.js":1,"./diff.js":2,"./h.js":3,"./patch.js":13,"./vnode/vnode.js":31,"./vnode/vtext.js":33}],5:[function(require,module,exports){
/*!
 * Cross-Browser Split 1.1.1
 * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 * Available under the MIT License
 * ECMAScript compliant, uniform cross-browser split method
 */

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * split('a b c d', ' ');
 * // -> ['a', 'b', 'c', 'd']
 *
 * // With limit
 * split('a b c d', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * split('..word1 word2..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', ' ', 'word', '2', '..']
 */
module.exports = (function split(undef) {

  var nativeSplit = String.prototype.split,
    compliantExecNpcg = /()??/.exec("")[1] === undef,
    // NPCG: nonparticipating capturing group
    self;

  self = function(str, separator, limit) {
    // If `separator` is not a regex, use `nativeSplit`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
      return nativeSplit.call(str, separator, limit);
    }
    var output = [],
      flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.extended ? "x" : "") + // Proposed for ES6
      (separator.sticky ? "y" : ""),
      // Firefox 3+
      lastLastIndex = 0,
      // Make `global` and avoid `lastIndex` issues by working with a copy
      separator = new RegExp(separator.source, flags + "g"),
      separator2, match, lastIndex, lastLength;
    str += ""; // Type-convert
    if (!compliantExecNpcg) {
      // Doesn't need flags gy, but they don't hurt
      separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
    }
    /* Values for `limit`, per the spec:
     * If undefined: 4294967295 // Math.pow(2, 32) - 1
     * If 0, Infinity, or NaN: 0
     * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
     * If negative number: 4294967296 - Math.floor(Math.abs(limit))
     * If other: Type-convert, then use the above rules
     */
    limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1
    limit >>> 0; // ToUint32(limit)
    while (match = separator.exec(str)) {
      // `separator.lastIndex` is not reliable cross-browser
      lastIndex = match.index + match[0].length;
      if (lastIndex > lastLastIndex) {
        output.push(str.slice(lastLastIndex, match.index));
        // Fix browsers whose `exec` methods don't consistently return `undefined` for
        // nonparticipating capturing groups
        if (!compliantExecNpcg && match.length > 1) {
          match[0].replace(separator2, function() {
            for (var i = 1; i < arguments.length - 2; i++) {
              if (arguments[i] === undef) {
                match[i] = undef;
              }
            }
          });
        }
        if (match.length > 1 && match.index < str.length) {
          Array.prototype.push.apply(output, match.slice(1));
        }
        lastLength = match[0].length;
        lastLastIndex = lastIndex;
        if (output.length >= limit) {
          break;
        }
      }
      if (separator.lastIndex === match.index) {
        separator.lastIndex++; // Avoid an infinite loop
      }
    }
    if (lastLastIndex === str.length) {
      if (lastLength || !separator.test("")) {
        output.push("");
      }
    } else {
      output.push(str.slice(lastLastIndex));
    }
    return output.length > limit ? output.slice(0, limit) : output;
  };

  return self;
})();

},{}],6:[function(require,module,exports){

},{}],7:[function(require,module,exports){
'use strict';

var OneVersionConstraint = require('individual/one-version');

var MY_VERSION = '7';
OneVersionConstraint('ev-store', MY_VERSION);

var hashKey = '__EV_STORE_KEY@' + MY_VERSION;

module.exports = EvStore;

function EvStore(elem) {
    var hash = elem[hashKey];

    if (!hash) {
        hash = elem[hashKey] = {};
    }

    return hash;
}

},{"individual/one-version":9}],8:[function(require,module,exports){
(function (global){
'use strict';

/*global window, global*/

var root = typeof window !== 'undefined' ?
    window : typeof global !== 'undefined' ?
    global : {};

module.exports = Individual;

function Individual(key, value) {
    if (key in root) {
        return root[key];
    }

    root[key] = value;

    return value;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],9:[function(require,module,exports){
'use strict';

var Individual = require('./index.js');

module.exports = OneVersion;

function OneVersion(moduleName, version, defaultValue) {
    var key = '__INDIVIDUAL_ONE_VERSION_' + moduleName;
    var enforceKey = key + '_ENFORCE_SINGLETON';

    var versionValue = Individual(enforceKey, version);

    if (versionValue !== version) {
        throw new Error('Can only have one copy of ' +
            moduleName + '.\n' +
            'You already have version ' + versionValue +
            ' installed.\n' +
            'This means you cannot install version ' + version);
    }

    return Individual(key, defaultValue);
}

},{"./index.js":8}],10:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":6}],11:[function(require,module,exports){
"use strict";

module.exports = function isObject(x) {
	return typeof x === "object" && x !== null;
};

},{}],12:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],13:[function(require,module,exports){
var patch = require("./vdom/patch.js")

module.exports = patch

},{"./vdom/patch.js":18}],14:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook.js")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, propName, propValue, previous);
        } else if (isHook(propValue)) {
            removeProperty(node, propName, propValue, previous)
            if (propValue.hook) {
                propValue.hook(node,
                    propName,
                    previous ? previous[propName] : undefined)
            }
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else {
                node[propName] = propValue
            }
        }
    }
}

function removeProperty(node, propName, propValue, previous) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        } else if (previousValue.unhook) {
            previousValue.unhook(node, propName, propValue)
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

},{"../vnode/is-vhook.js":26,"is-object":11}],15:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("../vnode/is-vnode.js")
var isVText = require("../vnode/is-vtext.js")
var isWidget = require("../vnode/is-widget.js")
var handleThunk = require("../vnode/handle-thunk.js")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"../vnode/handle-thunk.js":24,"../vnode/is-vnode.js":27,"../vnode/is-vtext.js":28,"../vnode/is-widget.js":29,"./apply-properties":14,"global/document":10}],16:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],17:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("../vnode/is-widget.js")
var VPatch = require("../vnode/vpatch.js")

var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = renderOptions.render(vText, renderOptions)

        if (parentNode && newNode !== domNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    var updating = updateWidget(leftVNode, widget)
    var newNode

    if (updating) {
        newNode = widget.update(leftVNode, domNode) || domNode
    } else {
        newNode = renderOptions.render(widget, renderOptions)
    }

    var parentNode = domNode.parentNode

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    if (!updating) {
        destroyWidget(domNode, leftVNode)
    }

    return newNode
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, moves) {
    var childNodes = domNode.childNodes
    var keyMap = {}
    var node
    var remove
    var insert

    for (var i = 0; i < moves.removes.length; i++) {
        remove = moves.removes[i]
        node = childNodes[remove.from]
        if (remove.key) {
            keyMap[remove.key] = node
        }
        domNode.removeChild(node)
    }

    var length = childNodes.length
    for (var j = 0; j < moves.inserts.length; j++) {
        insert = moves.inserts[j]
        node = keyMap[insert.key]
        // this is the weirdest bug i've ever seen in webkit
        domNode.insertBefore(node, insert.to >= length++ ? null : childNodes[insert.to])
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"../vnode/is-widget.js":29,"../vnode/vpatch.js":32,"./apply-properties":14,"./update-widget":19}],18:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var render = require("./create-element")
var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches, renderOptions) {
    renderOptions = renderOptions || {}
    renderOptions.patch = renderOptions.patch && renderOptions.patch !== patch
        ? renderOptions.patch
        : patchRecursive
    renderOptions.render = renderOptions.render || render

    return renderOptions.patch(rootNode, patches, renderOptions)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions.document && ownerDocument !== document) {
        renderOptions.document = ownerDocument
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./create-element":15,"./dom-index":16,"./patch-op":17,"global/document":10,"x-is-array":12}],19:[function(require,module,exports){
var isWidget = require("../vnode/is-widget.js")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"../vnode/is-widget.js":29}],20:[function(require,module,exports){
'use strict';

var EvStore = require('ev-store');

module.exports = EvHook;

function EvHook(value) {
    if (!(this instanceof EvHook)) {
        return new EvHook(value);
    }

    this.value = value;
}

EvHook.prototype.hook = function (node, propertyName) {
    var es = EvStore(node);
    var propName = propertyName.substr(3);

    es[propName] = this.value;
};

EvHook.prototype.unhook = function(node, propertyName) {
    var es = EvStore(node);
    var propName = propertyName.substr(3);

    es[propName] = undefined;
};

},{"ev-store":7}],21:[function(require,module,exports){
'use strict';

module.exports = SoftSetHook;

function SoftSetHook(value) {
    if (!(this instanceof SoftSetHook)) {
        return new SoftSetHook(value);
    }

    this.value = value;
}

SoftSetHook.prototype.hook = function (node, propertyName) {
    if (node[propertyName] !== this.value) {
        node[propertyName] = this.value;
    }
};

},{}],22:[function(require,module,exports){
'use strict';

var isArray = require('x-is-array');

var VNode = require('../vnode/vnode.js');
var VText = require('../vnode/vtext.js');
var isVNode = require('../vnode/is-vnode');
var isVText = require('../vnode/is-vtext');
var isWidget = require('../vnode/is-widget');
var isHook = require('../vnode/is-vhook');
var isVThunk = require('../vnode/is-thunk');

var parseTag = require('./parse-tag.js');
var softSetHook = require('./hooks/soft-set-hook.js');
var evHook = require('./hooks/ev-hook.js');

module.exports = h;

function h(tagName, properties, children) {
    var childNodes = [];
    var tag, props, key, namespace;

    if (!children && isChildren(properties)) {
        children = properties;
        props = {};
    }

    props = props || properties || {};
    tag = parseTag(tagName, props);

    // support keys
    if (props.hasOwnProperty('key')) {
        key = props.key;
        props.key = undefined;
    }

    // support namespace
    if (props.hasOwnProperty('namespace')) {
        namespace = props.namespace;
        props.namespace = undefined;
    }

    // fix cursor bug
    if (tag === 'INPUT' &&
        !namespace &&
        props.hasOwnProperty('value') &&
        props.value !== undefined &&
        !isHook(props.value)
    ) {
        props.value = softSetHook(props.value);
    }

    transformProperties(props);

    if (children !== undefined && children !== null) {
        addChild(children, childNodes, tag, props);
    }


    return new VNode(tag, props, childNodes, key, namespace);
}

function addChild(c, childNodes, tag, props) {
    if (typeof c === 'string') {
        childNodes.push(new VText(c));
    } else if (typeof c === 'number') {
        childNodes.push(new VText(String(c)));
    } else if (isChild(c)) {
        childNodes.push(c);
    } else if (isArray(c)) {
        for (var i = 0; i < c.length; i++) {
            addChild(c[i], childNodes, tag, props);
        }
    } else if (c === null || c === undefined) {
        return;
    } else {
        throw UnexpectedVirtualElement({
            foreignObject: c,
            parentVnode: {
                tagName: tag,
                properties: props
            }
        });
    }
}

function transformProperties(props) {
    for (var propName in props) {
        if (props.hasOwnProperty(propName)) {
            var value = props[propName];

            if (isHook(value)) {
                continue;
            }

            if (propName.substr(0, 3) === 'ev-') {
                // add ev-foo support
                props[propName] = evHook(value);
            }
        }
    }
}

function isChild(x) {
    return isVNode(x) || isVText(x) || isWidget(x) || isVThunk(x);
}

function isChildren(x) {
    return typeof x === 'string' || isArray(x) || isChild(x);
}

function UnexpectedVirtualElement(data) {
    var err = new Error();

    err.type = 'virtual-hyperscript.unexpected.virtual-element';
    err.message = 'Unexpected virtual child passed to h().\n' +
        'Expected a VNode / Vthunk / VWidget / string but:\n' +
        'got:\n' +
        errorString(data.foreignObject) +
        '.\n' +
        'The parent vnode is:\n' +
        errorString(data.parentVnode)
        '\n' +
        'Suggested fix: change your `h(..., [ ... ])` callsite.';
    err.foreignObject = data.foreignObject;
    err.parentVnode = data.parentVnode;

    return err;
}

function errorString(obj) {
    try {
        return JSON.stringify(obj, null, '    ');
    } catch (e) {
        return String(obj);
    }
}

},{"../vnode/is-thunk":25,"../vnode/is-vhook":26,"../vnode/is-vnode":27,"../vnode/is-vtext":28,"../vnode/is-widget":29,"../vnode/vnode.js":31,"../vnode/vtext.js":33,"./hooks/ev-hook.js":20,"./hooks/soft-set-hook.js":21,"./parse-tag.js":23,"x-is-array":12}],23:[function(require,module,exports){
'use strict';

var split = require('browser-split');

var classIdSplit = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/;
var notClassId = /^\.|#/;

module.exports = parseTag;

function parseTag(tag, props) {
    if (!tag) {
        return 'DIV';
    }

    var noId = !(props.hasOwnProperty('id'));

    var tagParts = split(tag, classIdSplit);
    var tagName = null;

    if (notClassId.test(tagParts[1])) {
        tagName = 'DIV';
    }

    var classes, part, type, i;

    for (i = 0; i < tagParts.length; i++) {
        part = tagParts[i];

        if (!part) {
            continue;
        }

        type = part.charAt(0);

        if (!tagName) {
            tagName = part;
        } else if (type === '.') {
            classes = classes || [];
            classes.push(part.substring(1, part.length));
        } else if (type === '#' && noId) {
            props.id = part.substring(1, part.length);
        }
    }

    if (classes) {
        if (props.className) {
            classes.push(props.className);
        }

        props.className = classes.join(' ');
    }

    return props.namespace ? tagName : tagName.toUpperCase();
}

},{"browser-split":5}],24:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":25,"./is-vnode":27,"./is-vtext":28,"./is-widget":29}],25:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],26:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook &&
      (typeof hook.hook === "function" && !hook.hasOwnProperty("hook") ||
       typeof hook.unhook === "function" && !hook.hasOwnProperty("unhook"))
}

},{}],27:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":30}],28:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":30}],29:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],30:[function(require,module,exports){
module.exports = "2"

},{}],31:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var hasThunks = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property) && property.unhook) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!hasThunks && child.hasThunks) {
                hasThunks = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        } else if (!hasThunks && isThunk(child)) {
            hasThunks = true;
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hasThunks = hasThunks
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-thunk":25,"./is-vhook":26,"./is-vnode":27,"./is-widget":29,"./version":30}],32:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":30}],33:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":30}],34:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook")

module.exports = diffProps

function diffProps(a, b) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (aValue === bValue) {
            continue
        } else if (isObject(aValue) && isObject(bValue)) {
            if (getPrototype(bValue) !== getPrototype(aValue)) {
                diff = diff || {}
                diff[aKey] = bValue
            } else if (isHook(bValue)) {
                 diff = diff || {}
                 diff[aKey] = bValue
            } else {
                var objectDiff = diffProps(aValue, bValue)
                if (objectDiff) {
                    diff = diff || {}
                    diff[aKey] = objectDiff
                }
            }
        } else {
            diff = diff || {}
            diff[aKey] = bValue
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
  if (Object.getPrototypeOf) {
    return Object.getPrototypeOf(value)
  } else if (value.__proto__) {
    return value.__proto__
  } else if (value.constructor) {
    return value.constructor.prototype
  }
}

},{"../vnode/is-vhook":26,"is-object":11}],35:[function(require,module,exports){
var isArray = require("x-is-array")

var VPatch = require("../vnode/vpatch")
var isVNode = require("../vnode/is-vnode")
var isVText = require("../vnode/is-vtext")
var isWidget = require("../vnode/is-widget")
var isThunk = require("../vnode/is-thunk")
var handleThunk = require("../vnode/handle-thunk")

var diffProps = require("./diff-props")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        return
    }

    var apply = patch[index]
    var applyClear = false

    if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (b == null) {

        // If a is a widget we will add a remove patch for it
        // Otherwise any child widgets/hooks must be destroyed.
        // This prevents adding two remove patches for a widget.
        if (!isWidget(a)) {
            clearState(a, patch, index)
            apply = patch[index]
        }

        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
                apply = diffChildren(a, b, patch, apply, index)
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                applyClear = true
            }
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            applyClear = true
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            applyClear = true
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        if (!isWidget(a)) {
            applyClear = true
        }

        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))
    }

    if (apply) {
        patch[index] = apply
    }

    if (applyClear) {
        clearState(a, patch, index)
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var orderedSet = reorder(aChildren, b.children)
    var bChildren = orderedSet.children

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (orderedSet.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(
            VPatch.ORDER,
            a,
            orderedSet.moves
        ))
    }

    return apply
}

function clearState(vNode, patch, index) {
    // TODO: Make this a single walk, not two
    unhook(vNode, patch, index)
    destroyWidgets(vNode, patch, index)
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(VPatch.REMOVE, vNode, null)
            )
        }
    } else if (isVNode(vNode) && (vNode.hasWidgets || vNode.hasThunks)) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b)
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true
        }
    }

    return false
}

// Execute hooks when two nodes are identical
function unhook(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(
                    VPatch.PROPS,
                    vNode,
                    undefinedKeys(vNode.hooks)
                )
            )
        }

        if (vNode.descendantHooks || vNode.hasThunks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                unhook(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

function undefinedKeys(obj) {
    var result = {}

    for (var key in obj) {
        result[key] = undefined
    }

    return result
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {
    // O(M) time, O(M) memory
    var bChildIndex = keyIndex(bChildren)
    var bKeys = bChildIndex.keys
    var bFree = bChildIndex.free

    if (bFree.length === bChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(N) time, O(N) memory
    var aChildIndex = keyIndex(aChildren)
    var aKeys = aChildIndex.keys
    var aFree = aChildIndex.free

    if (aFree.length === aChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(MAX(N, M)) memory
    var newChildren = []

    var freeIndex = 0
    var freeCount = bFree.length
    var deletedItems = 0

    // Iterate through a and match a node in b
    // O(N) time,
    for (var i = 0 ; i < aChildren.length; i++) {
        var aItem = aChildren[i]
        var itemIndex

        if (aItem.key) {
            if (bKeys.hasOwnProperty(aItem.key)) {
                // Match up the old keys
                itemIndex = bKeys[aItem.key]
                newChildren.push(bChildren[itemIndex])

            } else {
                // Remove old keyed items
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        } else {
            // Match the item in a with the next free item in b
            if (freeIndex < freeCount) {
                itemIndex = bFree[freeIndex++]
                newChildren.push(bChildren[itemIndex])
            } else {
                // There are no free items in b to match with
                // the free items in a, so the extra free nodes
                // are deleted.
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        }
    }

    var lastFreeIndex = freeIndex >= bFree.length ?
        bChildren.length :
        bFree[freeIndex]

    // Iterate through b and append any new keys
    // O(M) time
    for (var j = 0; j < bChildren.length; j++) {
        var newItem = bChildren[j]

        if (newItem.key) {
            if (!aKeys.hasOwnProperty(newItem.key)) {
                // Add any new keyed items
                // We are adding new items to the end and then sorting them
                // in place. In future we should insert new items in place.
                newChildren.push(newItem)
            }
        } else if (j >= lastFreeIndex) {
            // Add any leftover non-keyed items
            newChildren.push(newItem)
        }
    }

    var simulate = newChildren.slice()
    var simulateIndex = 0
    var removes = []
    var inserts = []
    var simulateItem

    for (var k = 0; k < bChildren.length;) {
        var wantedItem = bChildren[k]
        simulateItem = simulate[simulateIndex]

        // remove items
        while (simulateItem === null && simulate.length) {
            removes.push(remove(simulate, simulateIndex, null))
            simulateItem = simulate[simulateIndex]
        }

        if (!simulateItem || simulateItem.key !== wantedItem.key) {
            // if we need a key in this position...
            if (wantedItem.key) {
                if (simulateItem && simulateItem.key) {
                    // if an insert doesn't put this key in place, it needs to move
                    if (bKeys[simulateItem.key] !== k + 1) {
                        removes.push(remove(simulate, simulateIndex, simulateItem.key))
                        simulateItem = simulate[simulateIndex]
                        // if the remove didn't put the wanted item in place, we need to insert it
                        if (!simulateItem || simulateItem.key !== wantedItem.key) {
                            inserts.push({key: wantedItem.key, to: k})
                        }
                        // items are matching, so skip ahead
                        else {
                            simulateIndex++
                        }
                    }
                    else {
                        inserts.push({key: wantedItem.key, to: k})
                    }
                }
                else {
                    inserts.push({key: wantedItem.key, to: k})
                }
                k++
            }
            // a key in simulate has no matching wanted key, remove it
            else if (simulateItem && simulateItem.key) {
                removes.push(remove(simulate, simulateIndex, simulateItem.key))
            }
        }
        else {
            simulateIndex++
            k++
        }
    }

    // remove all the remaining nodes from simulate
    while(simulateIndex < simulate.length) {
        simulateItem = simulate[simulateIndex]
        removes.push(remove(simulate, simulateIndex, simulateItem && simulateItem.key))
    }

    // If the only moves we have are deletes then we can just
    // let the delete patch remove these items.
    if (removes.length === deletedItems && !inserts.length) {
        return {
            children: newChildren,
            moves: null
        }
    }

    return {
        children: newChildren,
        moves: {
            removes: removes,
            inserts: inserts
        }
    }
}

function remove(arr, index, key) {
    arr.splice(index, 1)

    return {
        from: index,
        key: key
    }
}

function keyIndex(children) {
    var keys = {}
    var free = []
    var length = children.length

    for (var i = 0; i < length; i++) {
        var child = children[i]

        if (child.key) {
            keys[child.key] = i
        } else {
            free.push(i)
        }
    }

    return {
        keys: keys,     // A hash of key name to index
        free: free      // An array of unkeyed item indices
    }
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"../vnode/handle-thunk":24,"../vnode/is-thunk":25,"../vnode/is-vnode":27,"../vnode/is-vtext":28,"../vnode/is-widget":29,"../vnode/vpatch":32,"./diff-props":34,"x-is-array":12}]},{},[4])(4)
});
// Just a wrapper from the standalone browserified virtual-dom
define("virtual-dom", [], function() {
  return virtualDom;
});
define("message-bus-client", ["exports"], function (__exports__) {
  __exports__.default = window.MessageBus;
});

define("mousetrap-global-bind", ["exports"], function (__exports__) {
  // In the Rails app it's applied from the vendored file
  __exports__.default = {};
});

define("ember-buffered-proxy/proxy", ["exports"], function (__exports__) {
  __exports__.default = window.BufferedProxy;
});

define("bootbox", ["exports"], function (__exports__) {
  __exports__.default = window.bootbox;
});

define("xss", ["exports"], function (__exports__) {
  __exports__.default = window.filterXSS;
});

define("mousetrap", ["exports"], function (__exports__) {
  __exports__.default = window.Mousetrap;
});

define("@popperjs/core", ["exports"], function (__exports__) {
  __exports__.default = window.Popper;
  __exports__.createPopper = window.Popper.createPopper;
  __exports__.defaultModifiers = window.Popper.defaultModifiers;
  __exports__.popperGenerator = window.Popper.popperGenerator;
});

define("@uppy/core", ["exports"], function (__exports__) {
  __exports__.default = window.Uppy.Core;
  __exports__.BasePlugin = window.Uppy.Core.BasePlugin;
});

define("@uppy/aws-s3", ["exports"], function (__exports__) {
  __exports__.default = window.Uppy.AwsS3;
});

define("@uppy/aws-s3-multipart", ["exports"], function (__exports__) {
  __exports__.default = window.Uppy.AwsS3Multipart;
});

define("@uppy/xhr-upload", ["exports"], function (__exports__) {
  __exports__.default = window.Uppy.XHRUpload;
});

define("@uppy/drop-target", ["exports"], function (__exports__) {
  __exports__.default = window.Uppy.DropTarget;
});
define("pretty-text/pretty-text", ["exports", "pretty-text/engines/discourse-markdown-it", "discourse-common/lib/object"], function (_exports, _discourseMarkdownIt, _object) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.registerOption = registerOption;
  _exports.buildOptions = buildOptions;
  _exports.default = void 0;

  function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

  function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  function registerOption() {// TODO next major version deprecate this
    // if (window.console) {
    //   window.console.log("registerOption is deprecated");
    // }
  }

  function buildOptions(state) {
    var siteSettings = state.siteSettings,
        getURL = state.getURL,
        lookupAvatar = state.lookupAvatar,
        lookupPrimaryUserGroup = state.lookupPrimaryUserGroup,
        getTopicInfo = state.getTopicInfo,
        topicId = state.topicId,
        categoryHashtagLookup = state.categoryHashtagLookup,
        userId = state.userId,
        getCurrentUser = state.getCurrentUser,
        currentUser = state.currentUser,
        lookupAvatarByPostNumber = state.lookupAvatarByPostNumber,
        lookupPrimaryUserGroupByPostNumber = state.lookupPrimaryUserGroupByPostNumber,
        formatUsername = state.formatUsername,
        emojiUnicodeReplacer = state.emojiUnicodeReplacer,
        lookupUploadUrls = state.lookupUploadUrls,
        previewing = state.previewing,
        linkify = state.linkify,
        censoredRegexp = state.censoredRegexp,
        disableEmojis = state.disableEmojis,
        customEmojiTranslation = state.customEmojiTranslation,
        watchedWordsReplace = state.watchedWordsReplace,
        watchedWordsLink = state.watchedWordsLink;
    var features = {
      "bold-italics": true,
      "auto-link": true,
      mentions: true,
      bbcode: true,
      quote: true,
      html: true,
      "category-hashtag": true,
      onebox: true,
      linkify: linkify !== false,
      newline: !siteSettings.traditional_markdown_linebreaks
    };

    if (state.features) {
      features = (0, _object.deepMerge)(features, state.features);
    }

    var options = {
      sanitize: true,
      getURL: getURL,
      features: features,
      lookupAvatar: lookupAvatar,
      lookupPrimaryUserGroup: lookupPrimaryUserGroup,
      getTopicInfo: getTopicInfo,
      topicId: topicId,
      categoryHashtagLookup: categoryHashtagLookup,
      userId: userId,
      getCurrentUser: getCurrentUser,
      currentUser: currentUser,
      lookupAvatarByPostNumber: lookupAvatarByPostNumber,
      lookupPrimaryUserGroupByPostNumber: lookupPrimaryUserGroupByPostNumber,
      formatUsername: formatUsername,
      emojiUnicodeReplacer: emojiUnicodeReplacer,
      lookupUploadUrls: lookupUploadUrls,
      censoredRegexp: censoredRegexp,
      customEmojiTranslation: customEmojiTranslation,
      allowedHrefSchemes: siteSettings.allowed_href_schemes ? siteSettings.allowed_href_schemes.split("|") : null,
      allowedIframes: siteSettings.allowed_iframes ? siteSettings.allowed_iframes.split("|") : [],
      markdownIt: true,
      injectLineNumbersToPreview: siteSettings.enable_advanced_editor_preview_sync,
      previewing: previewing,
      disableEmojis: disableEmojis,
      watchedWordsReplace: watchedWordsReplace,
      watchedWordsLink: watchedWordsLink
    }; // note, this will mutate options due to the way the API is designed
    // may need a refactor

    (0, _discourseMarkdownIt.setup)(options, siteSettings, state);
    return options;
  }

  var _default = /*#__PURE__*/function () {
    function _default(opts) {
      _classCallCheck(this, _default);

      if (!opts) {
        opts = buildOptions({
          siteSettings: {}
        });
      }

      this.opts = opts;
    }

    _createClass(_default, [{
      key: "disableSanitizer",
      value: function disableSanitizer() {
        this.opts.sanitizer = this.opts.discourse.sanitizer = function (ident) {
          return ident;
        };
      }
    }, {
      key: "cook",
      value: function cook(raw) {
        if (!raw || raw.length === 0) {
          return "";
        }

        var result;
        result = (0, _discourseMarkdownIt.cook)(raw, this.opts);
        return result ? result : "";
      }
    }, {
      key: "sanitize",
      value: function sanitize(html) {
        return this.opts.sanitizer(html).trim();
      }
    }]);

    return _default;
  }();

  _exports.default = _default;
});
define("pretty-text/guid", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _default;

  /*eslint no-bitwise:0 */
  // http://stackoverflow.com/a/8809472/17174
  function _default() {
    var d = new Date().getTime();

    if (window.performance && typeof window.performance.now === "function") {
      d += performance.now(); //use high-precision timer if available
    }

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === "x" ? r : r & 0x3 | 0x8).toString(16);
    });
  }
});
define("pretty-text/censored-words", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.censorFn = censorFn;
  _exports.censor = censor;

  function censorFn(regexpString, replacementLetter) {
    if (regexpString) {
      var censorRegexp = new RegExp(regexpString, "ig");
      replacementLetter = replacementLetter || "&#9632;";
      return function (text) {
        text = text.replace(censorRegexp, function (fullMatch) {
          for (var _len = arguments.length, groupMatches = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            groupMatches[_key - 1] = arguments[_key];
          }

          var stringMatch = groupMatches.find(function (g) {
            return typeof g === "string";
          });
          return fullMatch.replace(stringMatch, new Array(stringMatch.length + 1).join(replacementLetter));
        });
        return text;
      };
    }

    return function (t) {
      return t;
    };
  }

  function censor(text, censoredRegexp, replacementLetter) {
    return censorFn(censoredRegexp, replacementLetter)(text);
  }
});
define("pretty-text/emoji/data", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.replacements = _exports.translations = _exports.searchAliases = _exports.aliases = _exports.tonableEmojis = _exports.emojis = void 0;
  // DO NOT EDIT THIS FILE!!!
  // Update it by running `rake javascript:update_constants`
  var emojis = ["grinning", "grimacing", "grin", "joy", "rofl", "smiley", "grinning_face_with_smiling_eyes", "sweat_smile", "laughing", "innocent", "wink", "blush", "slightly_smiling_face", "upside_down_face", "relaxed", "yum", "relieved", "heart_eyes", "kissing_heart", "kissing", "kissing_smiling_eyes", "kissing_closed_eyes", "stuck_out_tongue_winking_eye", "stuck_out_tongue_closed_eyes", "stuck_out_tongue", "money_mouth_face", "nerd_face", "sunglasses", "clown_face", "cowboy_hat_face", "hugs", "smirk", "no_mouth", "neutral_face", "expressionless", "unamused", "roll_eyes", "thinking", "lying_face", "flushed", "disappointed", "worried", "angry", "rage", "pensive", "confused", "frowning", "persevere", "confounded", "tired_face", "weary", "triumph", "open_mouth", "scream", "fearful", "cold_sweat", "hushed", "slightly_frowning_face", "frowning_face_with_open_mouth", "anguished", "cry", "disappointed_relieved", "drooling_face", "sleepy", "sweat", "sob", "dizzy_face", "astonished", "zipper_mouth_face", "nauseated_face", "sneezing_face", "mask", "face_with_thermometer", "face_with_head_bandage", "sleeping", "zzz", "poop", "smiling_imp", "imp", "japanese_ogre", "japanese_goblin", "skull", "ghost", "alien", "robot", "smiley_cat", "smile_cat", "joy_cat", "heart_eyes_cat", "smirk_cat", "kissing_cat", "scream_cat", "crying_cat_face", "pouting_cat", "raised_hands", "clap", "wave", "call_me_hand", "+1", "-1", "facepunch", "fist", "fist_left", "fist_right", "v", "ok_hand", "raised_hand", "raised_back_of_hand", "open_hands", "muscle", "pray", "handshake", "point_up", "point_up_2", "point_down", "point_left", "point_right", "fu", "raised_hand_with_fingers_splayed", "metal", "crossed_fingers", "vulcan_salute", "writing_hand", "selfie", "nail_care", "lips", "tongue", "ear", "nose", "eye", "eyes", "bust_in_silhouette", "busts_in_silhouette", "speaking_head", "baby", "boy", "girl", "man", "woman", "blonde_woman", "blonde_man", "older_man", "older_woman", "man_with_gua_pi_mao", "woman_with_turban", "man_with_turban", "policewoman", "policeman", "construction_worker_woman", "construction_worker_man", "guardswoman", "guardsman", "female_detective", "male_detective", "woman_health_worker", "man_health_worker", "woman_farmer", "man_farmer", "woman_cook", "man_cook", "woman_student", "man_student", "woman_singer", "man_singer", "woman_teacher", "man_teacher", "woman_factory_worker", "man_factory_worker", "woman_technologist", "man_technologist", "woman_office_worker", "man_office_worker", "woman_mechanic", "man_mechanic", "woman_scientist", "man_scientist", "woman_artist", "man_artist", "woman_firefighter", "man_firefighter", "woman_pilot", "man_pilot", "woman_astronaut", "man_astronaut", "woman_judge", "man_judge", "mrs_claus", "santa", "angel", "pregnant_woman", "princess", "prince", "bride_with_veil", "man_in_tuxedo", "running_woman", "running_man", "walking_woman", "walking_man", "dancer", "man_dancing", "dancing_women", "dancing_men", "couple", "two_men_holding_hands", "two_women_holding_hands", "bowing_woman", "bowing_man", "man_facepalming", "woman_facepalming", "woman_shrugging", "man_shrugging", "tipping_hand_woman", "tipping_hand_man", "no_good_woman", "no_good_man", "ok_woman", "ok_man", "raising_hand_woman", "raising_hand_man", "pouting_woman", "pouting_man", "frowning_woman", "frowning_man", "haircut_woman", "haircut_man", "massage_woman", "massage_man", "couple_with_heart_woman_man", "couple_with_heart_woman_woman", "couple_with_heart_man_man", "couplekiss_man_woman", "couplekiss_woman_woman", "couplekiss_man_man", "family_man_woman_boy", "family_man_woman_girl", "family_man_woman_girl_boy", "family_man_woman_boy_boy", "family_man_woman_girl_girl", "family_woman_woman_boy", "family_woman_woman_girl", "family_woman_woman_girl_boy", "family_woman_woman_boy_boy", "family_woman_woman_girl_girl", "family_man_man_boy", "family_man_man_girl", "family_man_man_girl_boy", "family_man_man_boy_boy", "family_man_man_girl_girl", "family_woman_boy", "family_woman_girl", "family_woman_girl_boy", "family_woman_boy_boy", "family_woman_girl_girl", "family_man_boy", "family_man_girl", "family_man_girl_boy", "family_man_boy_boy", "family_man_girl_girl", "womans_clothes", "tshirt", "jeans", "necktie", "dress", "bikini", "kimono", "lipstick", "kiss", "footprints", "high_heel", "sandal", "boot", "mans_shoe", "athletic_shoe", "womans_hat", "tophat", "rescue_worker_helmet", "mortar_board", "crown", "school_satchel", "pouch", "purse", "handbag", "briefcase", "eyeglasses", "dark_sunglasses", "ring", "closed_umbrella", "dog", "cat", "mouse", "hamster", "rabbit", "fox_face", "bear", "panda_face", "koala", "tiger", "lion", "cow", "pig", "pig_nose", "frog", "squid", "octopus", "shrimp", "monkey_face", "gorilla", "see_no_evil", "hear_no_evil", "speak_no_evil", "monkey", "chicken", "penguin", "bird", "baby_chick", "hatching_chick", "hatched_chick", "duck", "eagle", "owl", "bat", "wolf", "boar", "horse", "unicorn", "honeybee", "bug", "butterfly", "snail", "beetle", "ant", "spider", "scorpion", "crab", "snake", "lizard", "turtle", "tropical_fish", "fish", "blowfish", "dolphin", "shark", "whale", "whale2", "crocodile", "leopard", "tiger2", "water_buffalo", "ox", "cow2", "deer", "dromedary_camel", "camel", "elephant", "rhinoceros", "goat", "ram", "sheep", "racehorse", "pig2", "rat", "mouse2", "rooster", "turkey", "dove", "dog2", "poodle", "cat2", "rabbit2", "chipmunk", "paw_prints", "dragon", "dragon_face", "cactus", "christmas_tree", "evergreen_tree", "deciduous_tree", "palm_tree", "seedling", "herb", "shamrock", "four_leaf_clover", "bamboo", "tanabata_tree", "leaves", "fallen_leaf", "maple_leaf", "ear_of_rice", "hibiscus", "sunflower", "rose", "wilted_flower", "tulip", "blossom", "cherry_blossom", "bouquet", "mushroom", "chestnut", "jack_o_lantern", "shell", "spider_web", "earth_americas", "earth_africa", "earth_asia", "full_moon", "waning_gibbous_moon", "last_quarter_moon", "waning_crescent_moon", "new_moon", "waxing_crescent_moon", "first_quarter_moon", "waxing_gibbous_moon", "new_moon_with_face", "full_moon_with_face", "first_quarter_moon_with_face", "last_quarter_moon_with_face", "sun_with_face", "crescent_moon", "star", "star2", "dizzy", "sparkles", "comet", "sunny", "sun_behind_small_cloud", "partly_sunny", "sun_behind_large_cloud", "sun_behind_rain_cloud", "cloud", "cloud_with_rain", "cloud_with_lightning_and_rain", "cloud_with_lightning", "zap", "fire", "boom", "snowflake", "cloud_with_snow", "snowman", "snowman_with_snow", "wind_face", "dash", "tornado", "fog", "open_umbrella", "umbrella", "droplet", "sweat_drops", "ocean", "green_apple", "apple", "pear", "tangerine", "lemon", "banana", "watermelon", "grapes", "strawberry", "melon", "cherries", "peach", "pineapple", "kiwi_fruit", "avocado", "tomato", "eggplant", "cucumber", "carrot", "hot_pepper", "potato", "corn", "sweet_potato", "peanuts", "honey_pot", "croissant", "bread", "baguette_bread", "cheese", "egg", "bacon", "pancakes", "poultry_leg", "meat_on_bone", "fried_shrimp", "fried_egg", "hamburger", "fries", "stuffed_flatbread", "hotdog", "pizza", "spaghetti", "taco", "burrito", "green_salad", "shallow_pan_of_food", "ramen", "stew", "fish_cake", "sushi", "bento", "curry", "rice_ball", "rice", "rice_cracker", "oden", "dango", "shaved_ice", "ice_cream", "icecream", "cake", "birthday", "custard", "candy", "lollipop", "chocolate_bar", "popcorn", "doughnut", "cookie", "milk_glass", "beer", "beers", "clinking_glasses", "wine_glass", "tumbler_glass", "cocktail", "tropical_drink", "champagne", "sake", "tea", "coffee", "baby_bottle", "spoon", "fork_and_knife", "plate_with_cutlery", "soccer", "basketball", "football", "baseball", "tennis", "volleyball", "rugby_football", "8ball", "golf", "golfing_woman", "golfing_man", "ping_pong", "badminton", "goal_net", "ice_hockey", "field_hockey", "cricket_bat_and_ball", "ski", "skier", "snowboarder", "person_fencing", "women_wrestling", "men_wrestling", "woman_cartwheeling", "man_cartwheeling", "woman_playing_handball", "man_playing_handball", "ice_skate", "bow_and_arrow", "fishing_pole_and_fish", "boxing_glove", "martial_arts_uniform", "rowing_woman", "rowing_man", "swimming_woman", "swimming_man", "woman_playing_water_polo", "man_playing_water_polo", "surfing_woman", "surfing_man", "bath", "basketball_woman", "basketball_man", "weight_lifting_woman", "weight_lifting_man", "biking_woman", "biking_man", "mountain_biking_woman", "mountain_biking_man", "horse_racing", "business_suit_levitating", "trophy", "running_shirt_with_sash", "medal_sports", "medal_military", "1st_place_medal", "2nd_place_medal", "3rd_place_medal", "reminder_ribbon", "rosette", "ticket", "tickets", "performing_arts", "art", "circus_tent", "woman_juggling", "man_juggling", "microphone", "headphones", "musical_score", "musical_keyboard", "drum", "saxophone", "trumpet", "guitar", "violin", "clapper", "video_game", "space_invader", "dart", "game_die", "slot_machine", "bowling", "red_car", "taxi", "blue_car", "bus", "trolleybus", "racing_car", "police_car", "ambulance", "fire_engine", "minibus", "truck", "articulated_lorry", "tractor", "kick_scooter", "motorcycle", "bike", "motor_scooter", "rotating_light", "oncoming_police_car", "oncoming_bus", "oncoming_automobile", "oncoming_taxi", "aerial_tramway", "mountain_cableway", "suspension_railway", "railway_car", "train", "monorail", "bullettrain_side", "bullettrain_front", "light_rail", "mountain_railway", "steam_locomotive", "train2", "metro", "tram", "station", "helicopter", "small_airplane", "airplane", "flight_departure", "flight_arrival", "sailboat", "motor_boat", "speedboat", "ferry", "passenger_ship", "rocket", "artificial_satellite", "seat", "canoe", "anchor", "construction", "fuelpump", "busstop", "vertical_traffic_light", "traffic_light", "checkered_flag", "ship", "ferris_wheel", "roller_coaster", "carousel_horse", "building_construction", "foggy", "tokyo_tower", "factory", "fountain", "rice_scene", "mountain", "mountain_snow", "mount_fuji", "volcano", "japan", "camping", "tent", "national_park", "motorway", "railway_track", "sunrise", "sunrise_over_mountains", "desert", "beach_umbrella", "desert_island", "city_sunrise", "city_sunset", "cityscape", "night_with_stars", "bridge_at_night", "milky_way", "stars", "sparkler", "fireworks", "rainbow", "houses", "european_castle", "japanese_castle", "stadium", "statue_of_liberty", "house", "house_with_garden", "derelict_house", "office", "department_store", "post_office", "european_post_office", "hospital", "bank", "hotel", "convenience_store", "school", "love_hotel", "wedding", "classical_building", "church", "mosque", "synagogue", "kaaba", "shinto_shrine", "watch", "iphone", "calling", "computer", "keyboard", "desktop_computer", "printer", "computer_mouse", "trackball", "joystick", "clamp", "minidisc", "floppy_disk", "cd", "dvd", "vhs", "camera", "camera_flash", "video_camera", "movie_camera", "film_projector", "film_strip", "telephone_receiver", "phone", "pager", "fax", "tv", "radio", "studio_microphone", "level_slider", "control_knobs", "stopwatch", "timer_clock", "alarm_clock", "mantelpiece_clock", "hourglass_flowing_sand", "hourglass", "satellite", "battery", "electric_plug", "bulb", "flashlight", "candle", "wastebasket", "oil_drum", "money_with_wings", "dollar", "yen", "euro", "pound", "moneybag", "credit_card", "gem", "balance_scale", "wrench", "hammer", "hammer_and_pick", "hammer_and_wrench", "pick", "nut_and_bolt", "gear", "chains", "gun", "bomb", "hocho", "dagger", "crossed_swords", "shield", "smoking", "skull_and_crossbones", "coffin", "funeral_urn", "amphora", "crystal_ball", "prayer_beads", "barber", "alembic", "telescope", "microscope", "hole", "pill", "syringe", "thermometer", "label", "bookmark", "toilet", "shower", "bathtub", "key", "old_key", "couch_and_lamp", "sleeping_bed", "bed", "door", "bellhop_bell", "framed_picture", "world_map", "parasol_on_ground", "moyai", "shopping", "shopping_cart", "balloon", "flags", "ribbon", "gift", "confetti_ball", "tada", "dolls", "wind_chime", "crossed_flags", "izakaya_lantern", "email", "envelope_with_arrow", "incoming_envelope", "e-mail", "love_letter", "postbox", "mailbox_closed", "mailbox", "mailbox_with_mail", "mailbox_with_no_mail", "package", "postal_horn", "inbox_tray", "outbox_tray", "scroll", "page_with_curl", "bookmark_tabs", "bar_chart", "chart_with_upwards_trend", "chart_with_downwards_trend", "page_facing_up", "date", "calendar", "spiral_calendar", "card_index", "card_file_box", "ballot_box", "file_cabinet", "clipboard", "spiral_notepad", "file_folder", "open_file_folder", "card_index_dividers", "newspaper_roll", "newspaper", "notebook", "closed_book", "green_book", "blue_book", "orange_book", "notebook_with_decorative_cover", "ledger", "books", "open_book", "link", "paperclip", "paperclips", "scissors", "triangular_ruler", "straight_ruler", "pushpin", "round_pushpin", "triangular_flag_on_post", "white_flag", "black_flag", "rainbow_flag", "closed_lock_with_key", "lock", "unlock", "lock_with_ink_pen", "pen", "fountain_pen", "black_nib", "memo", "pencil2", "crayon", "paintbrush", "mag", "mag_right", "heart", "yellow_heart", "green_heart", "blue_heart", "purple_heart", "black_heart", "broken_heart", "heavy_heart_exclamation", "two_hearts", "revolving_hearts", "heartbeat", "heartpulse", "sparkling_heart", "cupid", "gift_heart", "heart_decoration", "peace_symbol", "latin_cross", "star_and_crescent", "om", "wheel_of_dharma", "star_of_david", "six_pointed_star", "menorah", "yin_yang", "orthodox_cross", "place_of_worship", "ophiuchus", "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpius", "sagittarius", "capricorn", "aquarius", "pisces", "id", "atom_symbol", "u7a7a", "u5272", "radioactive", "biohazard", "mobile_phone_off", "vibration_mode", "u6709", "u7121", "u7533", "u55b6", "u6708", "eight_pointed_black_star", "vs", "accept", "white_flower", "ideograph_advantage", "secret", "congratulations", "u5408", "u6e80", "u7981", "a", "b", "ab", "cl", "o2", "sos", "no_entry", "name_badge", "no_entry_sign", "x", "o", "stop_sign", "anger", "hotsprings", "no_pedestrians", "do_not_litter", "no_bicycles", "non-potable_water", "underage", "no_mobile_phones", "exclamation", "grey_exclamation", "question", "grey_question", "bangbang", "interrobang", "100", "low_brightness", "high_brightness", "trident", "fleur_de_lis", "part_alternation_mark", "warning", "children_crossing", "beginner", "recycle", "u6307", "chart", "sparkle", "eight_spoked_asterisk", "negative_squared_cross_mark", "white_check_mark", "diamond_shape_with_a_dot_inside", "cyclone", "loop", "globe_with_meridians", "m", "atm", "sa", "passport_control", "customs", "baggage_claim", "left_luggage", "wheelchair", "no_smoking", "wc", "parking", "potable_water", "mens", "womens", "baby_symbol", "restroom", "put_litter_in_its_place", "cinema", "signal_strength", "koko", "ng", "ok", "up", "cool", "new", "free", "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "keycap_ten", "asterisk", "1234", "arrow_forward", "pause_button", "next_track_button", "stop_button", "record_button", "play_or_pause_button", "previous_track_button", "fast_forward", "rewind", "twisted_rightwards_arrows", "repeat", "repeat_one", "arrow_backward", "arrow_up_small", "arrow_down_small", "arrow_double_up", "arrow_double_down", "arrow_right", "arrow_left", "arrow_up", "arrow_down", "arrow_upper_right", "arrow_lower_right", "arrow_lower_left", "arrow_upper_left", "arrow_up_down", "left_right_arrow", "arrows_counterclockwise", "arrow_right_hook", "leftwards_arrow_with_hook", "arrow_heading_up", "arrow_heading_down", "hash", "information_source", "abc", "abcd", "capital_abcd", "symbols", "musical_note", "notes", "wavy_dash", "curly_loop", "heavy_check_mark", "arrows_clockwise", "heavy_plus_sign", "heavy_minus_sign", "heavy_division_sign", "heavy_multiplication_x", "heavy_dollar_sign", "currency_exchange", "copyright", "registered", "tm", "end", "back", "on", "top", "soon", "ballot_box_with_check", "radio_button", "white_circle", "black_circle", "red_circle", "large_blue_circle", "small_orange_diamond", "small_blue_diamond", "large_orange_diamond", "large_blue_diamond", "small_red_triangle", "black_small_square", "white_small_square", "black_large_square", "white_large_square", "small_red_triangle_down", "black_medium_square", "white_medium_square", "black_medium_small_square", "white_medium_small_square", "black_square_button", "white_square_button", "speaker", "sound", "loud_sound", "mute", "mega", "loudspeaker", "bell", "no_bell", "black_joker", "mahjong", "spades", "clubs", "hearts", "diamonds", "flower_playing_cards", "thought_balloon", "right_anger_bubble", "speech_balloon", "left_speech_bubble", "clock1", "clock2", "clock3", "clock4", "clock5", "clock6", "clock7", "clock8", "clock9", "clock10", "clock11", "clock12", "clock130", "clock230", "clock330", "clock430", "clock530", "clock630", "clock730", "clock830", "clock930", "clock1030", "clock1130", "clock1230", "afghanistan", "aland_islands", "albania", "algeria", "american_samoa", "andorra", "angola", "anguilla", "antarctica", "antigua_barbuda", "argentina", "armenia", "aruba", "australia", "austria", "azerbaijan", "bahamas", "bahrain", "bangladesh", "barbados", "belarus", "belgium", "belize", "benin", "bermuda", "bhutan", "bolivia", "caribbean_netherlands", "bosnia_herzegovina", "botswana", "brazil", "british_indian_ocean_territory", "british_virgin_islands", "brunei", "bulgaria", "burkina_faso", "burundi", "cape_verde", "cambodia", "cameroon", "canada", "canary_islands", "cayman_islands", "central_african_republic", "chad", "chile", "cn", "christmas_island", "cocos_islands", "colombia", "comoros", "congo_brazzaville", "congo_kinshasa", "cook_islands", "costa_rica", "croatia", "cuba", "curacao", "cyprus", "czech_republic", "denmark", "djibouti", "dominica", "dominican_republic", "ecuador", "egypt", "el_salvador", "equatorial_guinea", "eritrea", "estonia", "ethiopia", "eu", "falkland_islands", "faroe_islands", "fiji", "finland", "fr", "french_guiana", "french_polynesia", "french_southern_territories", "gabon", "gambia", "georgia", "de", "ghana", "gibraltar", "greece", "greenland", "grenada", "guadeloupe", "guam", "guatemala", "guernsey", "guinea", "guinea_bissau", "guyana", "haiti", "honduras", "hong_kong", "hungary", "iceland", "india", "indonesia", "iran", "iraq", "ireland", "isle_of_man", "israel", "it", "cote_divoire", "jamaica", "jp", "jersey", "jordan", "kazakhstan", "kenya", "kiribati", "kosovo", "kuwait", "kyrgyzstan", "laos", "latvia", "lebanon", "lesotho", "liberia", "libya", "liechtenstein", "lithuania", "luxembourg", "macau", "macedonia", "madagascar", "malawi", "malaysia", "maldives", "mali", "malta", "marshall_islands", "martinique", "mauritania", "mauritius", "mayotte", "mexico", "micronesia", "moldova", "monaco", "mongolia", "montenegro", "montserrat", "morocco", "mozambique", "myanmar", "namibia", "nauru", "nepal", "netherlands", "new_caledonia", "new_zealand", "nicaragua", "niger", "nigeria", "niue", "norfolk_island", "northern_mariana_islands", "north_korea", "norway", "oman", "pakistan", "palau", "palestinian_territories", "panama", "papua_new_guinea", "paraguay", "peru", "philippines", "pitcairn_islands", "poland", "portugal", "puerto_rico", "qatar", "reunion", "romania", "ru", "rwanda", "st_barthelemy", "st_helena", "st_kitts_nevis", "st_lucia", "st_pierre_miquelon", "st_vincent_grenadines", "samoa", "san_marino", "sao_tome_principe", "saudi_arabia", "senegal", "serbia", "seychelles", "sierra_leone", "singapore", "sint_maarten", "slovakia", "slovenia", "solomon_islands", "somalia", "south_africa", "south_georgia_south_sandwich_islands", "kr", "south_sudan", "es", "sri_lanka", "sudan", "suriname", "swaziland", "sweden", "switzerland", "syria", "taiwan", "tajikistan", "tanzania", "thailand", "timor_leste", "togo", "tokelau", "tonga", "trinidad_tobago", "tunisia", "tr", "turkmenistan", "turks_caicos_islands", "tuvalu", "uganda", "ukraine", "united_arab_emirates", "uk", "us", "us_virgin_islands", "uruguay", "uzbekistan", "vanuatu", "vatican_city", "venezuela", "vietnam", "wallis_futuna", "western_sahara", "yemen", "zambia", "zimbabwe", "star_struck", "face_with_raised_eyebrow", "exploding_head", "crazy_face", "face_with_symbols_over_mouth", "face_vomiting", "shushing_face", "face_with_hand_over_mouth", "face_with_monocle", "child", "adult", "older_adult", "woman_with_headscarf", "bearded_person", "breast_feeding", "mage", "woman_mage", "fairy", "vampire", "mermaid", "merman", "elf", "genie", "woman_genie", "zombie", "woman_zombie", "person_in_steamy_room", "woman_in_steamy_room", "person_climbing", "woman_climbing", "person_in_lotus_position", "woman_in_lotus_position", "love_you_gesture", "palms_up_together", "brain", "orange_heart", "scarf", "gloves", "coat", "socks", "billed_cap", "zebra", "giraffe", "hedgehog", "sauropod", "t_rex", "cricket", "coconut", "broccoli", "pretzel", "cut_of_meat", "sandwich", "bowl_with_spoon", "canned_food", "dumpling", "fortune_cookie", "takeout_box", "pie", "cup_with_straw", "chopsticks", "flying_saucer", "sled", "curling_stone", "svalbard_and_jan_mayen", "st_martin", "us_outlying_islands", "tristan_da_cunha", "heard_and_mc_donald_islands", "ceuta_and_melilla", "diego_garcia", "ascension_island", "bouvet_island", "clipperton_island", "united_nations", "smiling_face_with_three_hearts", "hot_face", "cold_face", "partying_face", "woozy_face", "pleading_face", "man_red_haired", "man_curly_haired", "man_white_haired", "man_bald", "woman_red_haired", "woman_curly_haired", "woman_white_haired", "woman_bald", "superhero", "man_superhero", "woman_superhero", "supervillain", "woman_supervillain", "man_supervillain", "leg", "foot", "bone", "tooth", "goggles", "lab_coat", "hiking_boot", "flat_shoe", "raccoon", "llama", "hippopotamus", "kangaroo", "badger", "swan", "peacock", "parrot", "lobster", "mosquito", "microbe", "mango", "leafy_green", "bagel", "salt", "moon_cake", "cupcake", "compass", "brick", "skateboard", "luggage", "firecracker", "red_gift_envelope", "softball", "flying_disc", "lacrosse", "nazar_amulet", "jigsaw", "teddy_bear", "chess_pawn", "thread", "yarn", "abacus", "receipt", "toolbox", "magnet", "test_tube", "petri_dish", "dna", "lotion_bottle", "safety_pin", "broom", "basket", "roll_of_toilet_paper", "soap", "sponge", "fire_extinguisher", "infinity", "pirate_flag", "waffle", "otter", "sloth", "ice_cube", "ringer_planet", "flamingo", "yawning_face", "pinching_hand", "service_dog", "orangutan", "auto_rickshaw", "parachute", "yo-yo", "kite", "brown_square", "purple_square", "blue_square", "green_square", "yellow_square", "orange_square", "red_square", "brown_circle", "purple_circle", "green_circle", "yellow_circle", "orange_circle", "razor", "chair", "stethoscope", "adhesive_bandage", "drop_of_blood", "probing_cane", "axe", "diya_lamp", "banjo", "ballet_shoes", "shorts", "briefs", "one_piece_swimsuit", "sari", "safety_vest", "diving_mask", "motorized_wheelchair", "manual_wheelchair", "hindu_temple", "maté", "beverage_box", "oyster", "butter", "falafel", "onion", "garlic", "skunk", "guide_dog", "people_holding_hands", "woman_in_manual_wheelchair", "man_in_manual_wheelchair", "woman_in_motorized_wheelchair", "man_in_motorized_wheelchair", "woman_with_probing_cane", "man_with_probing_cane", "woman_kneeling", "man_kneeling", "man_standing", "woman_standing", "deaf_woman", "deaf_man", "hear_with_hearing_aid", "mechanical_leg", "mechanical_arm", "white_heart", "brown_heart", "transgender_flag"];
  _exports.emojis = emojis;
  var tonableEmojis = ["raised_hands", "clap", "wave", "call_me_hand", "+1", "-1", "facepunch", "fist", "fist_left", "fist_right", "v", "ok_hand", "raised_hand", "raised_back_of_hand", "open_hands", "muscle", "pray", "point_up", "point_up_2", "point_down", "point_left", "point_right", "fu", "raised_hand_with_fingers_splayed", "metal", "crossed_fingers", "vulcan_salute", "writing_hand", "selfie", "nail_care", "ear", "nose", "baby", "boy", "girl", "man", "woman", "blonde_woman", "blonde_man", "older_man", "older_woman", "man_with_gua_pi_mao", "woman_with_turban", "man_with_turban", "policewoman", "policeman", "construction_worker_woman", "construction_worker_man", "guardswoman", "guardsman", "male_detective", "woman_health_worker", "man_health_worker", "woman_farmer", "man_farmer", "woman_cook", "man_cook", "woman_student", "man_student", "woman_singer", "man_singer", "woman_teacher", "man_teacher", "woman_factory_worker", "man_factory_worker", "woman_technologist", "man_technologist", "woman_office_worker", "man_office_worker", "woman_mechanic", "man_mechanic", "woman_scientist", "man_scientist", "woman_artist", "man_artist", "woman_firefighter", "man_firefighter", "woman_pilot", "man_pilot", "woman_astronaut", "man_astronaut", "woman_judge", "man_judge", "mrs_claus", "santa", "angel", "pregnant_woman", "princess", "prince", "bride_with_veil", "man_in_tuxedo", "running_woman", "running_man", "walking_woman", "walking_man", "dancer", "man_dancing", "bowing_woman", "bowing_man", "man_facepalming", "woman_facepalming", "woman_shrugging", "man_shrugging", "tipping_hand_woman", "tipping_hand_man", "no_good_woman", "no_good_man", "ok_woman", "ok_man", "raising_hand_woman", "raising_hand_man", "pouting_woman", "pouting_man", "frowning_woman", "frowning_man", "haircut_woman", "haircut_man", "massage_woman", "massage_man", "golfing_man", "snowboarder", "woman_cartwheeling", "man_cartwheeling", "woman_playing_handball", "man_playing_handball", "rowing_woman", "rowing_man", "swimming_woman", "swimming_man", "woman_playing_water_polo", "man_playing_water_polo", "surfing_woman", "surfing_man", "bath", "basketball_man", "weight_lifting_man", "biking_woman", "biking_man", "mountain_biking_woman", "mountain_biking_man", "horse_racing", "business_suit_levitating", "woman_juggling", "man_juggling", "sleeping_bed", "child", "adult", "older_adult", "woman_with_headscarf", "bearded_person", "breast_feeding", "mage", "woman_mage", "fairy", "vampire", "mermaid", "merman", "elf", "person_in_steamy_room", "woman_in_steamy_room", "person_climbing", "woman_climbing", "person_in_lotus_position", "woman_in_lotus_position", "love_you_gesture", "palms_up_together"];
  _exports.tonableEmojis = tonableEmojis;
  var aliases = {
    grinning_face_with_smiling_eyes: ["smile"],
    right_anger_bubble: ["anger_right"],
    ballot_box: ["ballot_box_with_ballot"],
    basketball_man: ["basketball_player", "person_with_ball"],
    beach_umbrella: ["umbrella_on_ground", "beach", "beach_with_umbrella"],
    parasol_on_ground: ["umbrella_on_ground"],
    bellhop_bell: ["bellhop"],
    biohazard: ["biohazard_sign"],
    bow_and_arrow: ["archery"],
    spiral_calendar: ["calendar_spiral", "spiral_calendar_pad"],
    card_file_box: ["card_box"],
    champagne: ["bottle_with_popping_cork"],
    cheese: ["cheese_wedge"],
    city_sunset: ["city_dusk"],
    couch_and_lamp: ["couch"],
    crayon: ["lower_left_crayon"],
    cricket_bat_and_ball: ["cricket_bat_ball"],
    latin_cross: ["cross"],
    dagger: ["dagger_knife"],
    desktop_computer: ["desktop"],
    card_index_dividers: ["dividers"],
    dove: ["dove_of_peace"],
    footprints: ["feet"],
    fire: ["flame"],
    black_flag: ["flag_black", "waving_black_flag"],
    cn: ["flag_cn"],
    de: ["flag_de"],
    es: ["flag_es"],
    fr: ["flag_fr"],
    uk: ["gb", "flag_gb"],
    it: ["flag_it"],
    jp: ["flag_jp"],
    kr: ["flag_kr"],
    ru: ["flag_ru"],
    us: ["flag_us"],
    white_flag: ["flag_white", "waving_white_flag"],
    plate_with_cutlery: ["fork_knife_plate", "fork_and_knife_with_plate"],
    framed_picture: ["frame_photo", "frame_with_picture"],
    hammer_and_pick: ["hammer_pick"],
    heavy_heart_exclamation: ["heart_exclamation", "heavy_heart_exclamation_mark_ornament"],
    houses: ["homes", "house_buildings"],
    hotdog: ["hot_dog"],
    derelict_house: ["house_abandoned", "derelict_house_building"],
    desert_island: ["island"],
    old_key: ["key2"],
    laughing: ["satisfied"],
    business_suit_levitating: ["levitate", "man_in_business_suit_levitating"],
    weight_lifting_man: ["lifter", "weight_lifter"],
    medal_sports: ["medal", "sports_medal"],
    metal: ["sign_of_the_horns"],
    fu: ["middle_finger", "reversed_hand_with_middle_finger_extended"],
    motorcycle: ["racing_motorcycle"],
    mountain_snow: ["snow_capped_mountain"],
    newspaper_roll: ["newspaper2", "rolled_up_newspaper"],
    spiral_notepad: ["notepad_spiral", "spiral_note_pad"],
    oil_drum: ["oil"],
    older_woman: ["grandma"],
    paintbrush: ["lower_left_paintbrush"],
    paperclips: ["linked_paperclips"],
    pause_button: ["double_vertical_bar"],
    peace_symbol: ["peace"],
    fountain_pen: ["pen_fountain", "lower_left_fountain_pen"],
    ping_pong: ["table_tennis"],
    place_of_worship: ["worship_symbol"],
    poop: ["shit", "hankey", "poo"],
    radioactive: ["radioactive_sign"],
    railway_track: ["railroad_track"],
    robot: ["robot_face"],
    skull: ["skeleton"],
    skull_and_crossbones: ["skull_crossbones"],
    speaking_head: ["speaking_head_in_silhouette"],
    male_detective: ["spy", "sleuth_or_spy"],
    thinking: ["thinking_face"],
    "-1": ["thumbsdown"],
    "+1": ["thumbsup"],
    cloud_with_lightning_and_rain: ["thunder_cloud_rain", "thunder_cloud_and_rain"],
    tickets: ["admission_tickets"],
    next_track_button: ["track_next", "next_track"],
    previous_track_button: ["track_previous", "previous_track"],
    unicorn: ["unicorn_face"],
    funeral_urn: ["urn"],
    sun_behind_large_cloud: ["white_sun_cloud", "white_sun_behind_cloud"],
    sun_behind_rain_cloud: ["white_sun_rain_cloud", "white_sun_behind_cloud_with_rain"],
    partly_sunny: ["white_sun_small_cloud", "white_sun_with_small_cloud"],
    open_umbrella: ["umbrella2"],
    hammer_and_wrench: ["tools"],
    face_with_thermometer: ["thermometer_face"],
    timer_clock: ["timer"],
    keycap_ten: ["ten"],
    memo: ["pencil"],
    rescue_worker_helmet: ["helmet_with_cross", "helmet_with_white_cross"],
    slightly_smiling_face: ["slightly_smiling", "slight_smile"],
    construction_worker_man: ["construction_worker"],
    upside_down_face: ["upside_down"],
    money_mouth_face: ["money_mouth"],
    nerd_face: ["nerd"],
    hugs: ["hugging", "hugging_face"],
    roll_eyes: ["rolling_eyes", "face_with_rolling_eyes"],
    slightly_frowning_face: ["slight_frown", "slightly_frowning"],
    frowning: ["frowning2", "white_frowning_face", "frowning_face"],
    zipper_mouth_face: ["zipper_mouth"],
    face_with_head_bandage: ["head_bandage"],
    raised_hand_with_fingers_splayed: ["hand_splayed"],
    raised_hand: ["hand"],
    vulcan_salute: ["vulcan", "raised_hand_with_part_between_middle_and_ring_fingers"],
    policeman: ["cop"],
    running_man: ["runner"],
    walking_man: ["walking"],
    bowing_man: ["bow"],
    no_good_woman: ["no_good"],
    raising_hand_woman: ["raising_hand"],
    pouting_woman: ["person_with_pouting_face"],
    frowning_woman: ["person_frowning"],
    haircut_woman: ["haircut"],
    massage_woman: ["massage"],
    tshirt: ["shirt"],
    biking_man: ["bicyclist"],
    mountain_biking_man: ["mountain_bicyclist"],
    passenger_ship: ["cruise_ship"],
    motor_boat: ["motorboat", "boat"],
    flight_arrival: ["airplane_arriving"],
    flight_departure: ["airplane_departure"],
    small_airplane: ["airplane_small"],
    racing_car: ["race_car"],
    family_man_woman_boy_boy: ["family_man_woman_boys"],
    family_man_woman_girl_girl: ["family_man_woman_girls"],
    family_woman_woman_boy: ["family_women_boy"],
    family_woman_woman_girl: ["family_women_girl"],
    family_woman_woman_girl_boy: ["family_women_girl_boy"],
    family_woman_woman_boy_boy: ["family_women_boys"],
    family_woman_woman_girl_girl: ["family_women_girls"],
    family_man_man_boy: ["family_men_boy"],
    family_man_man_girl: ["family_men_girl"],
    family_man_man_girl_boy: ["family_men_girl_boy"],
    family_man_man_boy_boy: ["family_men_boys"],
    family_man_man_girl_girl: ["family_men_girls"],
    cloud_with_lightning: ["cloud_lightning"],
    tornado: ["cloud_tornado", "cloud_with_tornado"],
    cloud_with_rain: ["cloud_rain"],
    cloud_with_snow: ["cloud_snow"],
    asterisk: ["keycap_star"],
    studio_microphone: ["microphone2"],
    medal_military: ["military_medal"],
    couple_with_heart_woman_woman: ["female_couple_with_heart"],
    couple_with_heart_man_man: ["male_couple_with_heart"],
    couplekiss_woman_woman: ["female_couplekiss"],
    couplekiss_man_man: ["male_couplekiss"],
    honeybee: ["bee"],
    lion: ["lion_face"],
    artificial_satellite: ["satellite_orbital"],
    computer_mouse: ["mouse_three_button", "three_button_mouse"],
    hocho: ["knife"],
    swimming_man: ["swimmer"],
    wind_face: ["wind_blowing_face"],
    golfing_man: ["golfer"],
    facepunch: ["punch"],
    building_construction: ["construction_site"],
    family_man_woman_girl_boy: ["family"],
    ice_hockey: ["hockey"],
    snowman_with_snow: ["snowman2"],
    play_or_pause_button: ["play_pause"],
    film_projector: ["projector"],
    shopping: ["shopping_bags"],
    open_book: ["book"],
    national_park: ["park"],
    world_map: ["map"],
    pen: ["pen_ballpoint", "lower_left_ballpoint_pen"],
    email: ["envelope", "e-mail"],
    phone: ["telephone"],
    atom_symbol: ["atom"],
    mantelpiece_clock: ["clock"],
    camera_flash: ["camera_with_flash"],
    film_strip: ["film_frames"],
    balance_scale: ["scales"],
    surfing_man: ["surfer"],
    couplekiss_man_woman: ["couplekiss"],
    couple_with_heart_woman_man: ["couple_with_heart"],
    clamp: ["compression"],
    dancing_women: ["dancers"],
    blonde_man: ["person_with_blond_hair"],
    sleeping_bed: ["sleeping_accommodation"],
    om: ["om_symbol"],
    tipping_hand_woman: ["information_desk_person"],
    rowing_man: ["rowboat"],
    new_moon: ["moon"],
    oncoming_automobile: ["car", "automobile"],
    fleur_de_lis: ["fleur-de-lis"],
    face_vomiting: ["puke"]
  };
  _exports.aliases = aliases;
  var searchAliases = {
    sad: ["frowning_face", "slightly_frowning_face", "sob", "crying_cat_face", "cry"],
    cry: ["sob"]
  };
  _exports.searchAliases = searchAliases;
  var translations = {
    ":)": "slight_smile",
    ":-)": "slight_smile",
    "^_^": "slight_smile",
    "^__^": "slight_smile",
    ":(": "frowning",
    ":-(": "frowning",
    ";)": "wink",
    ";-)": "wink",
    ":'(": "cry",
    ":'-(": "cry",
    ":-'(": "cry",
    ":p": "stuck_out_tongue",
    ":P": "stuck_out_tongue",
    ":-P": "stuck_out_tongue",
    ":O": "open_mouth",
    ":-O": "open_mouth",
    ":D": "smiley",
    ":-D": "smiley",
    ":|": "expressionless",
    ":-|": "expressionless",
    ":/": "confused",
    "8-)": "sunglasses",
    ";P": "stuck_out_tongue_winking_eye",
    ";-P": "stuck_out_tongue_winking_eye",
    ":$": "blush",
    ":-$": "blush"
  };
  _exports.translations = translations;
  var replacements = {
    "😀": "grinning",
    "😬": "grimacing",
    "😁": "grin",
    "😂": "joy",
    "🤣": "rofl",
    "😃": "smiley",
    "😄": "grinning_face_with_smiling_eyes",
    "😅": "sweat_smile",
    "😆": "laughing",
    "😇": "innocent",
    "😉": "wink",
    "😊": "blush",
    "🙂": "slightly_smiling_face",
    "🙃": "upside_down_face",
    "☺": "relaxed",
    "😋": "yum",
    "😌": "relieved",
    "😍": "heart_eyes",
    "😘": "kissing_heart",
    "😗": "kissing",
    "😙": "kissing_smiling_eyes",
    "😚": "kissing_closed_eyes",
    "😜": "stuck_out_tongue_winking_eye",
    "😝": "stuck_out_tongue_closed_eyes",
    "😛": "stuck_out_tongue",
    "🤑": "money_mouth_face",
    "🤓": "nerd_face",
    "😎": "sunglasses",
    "🤡": "clown_face",
    "🤠": "cowboy_hat_face",
    "🤗": "hugs",
    "😏": "smirk",
    "😶": "no_mouth",
    "😐": "neutral_face",
    "😑": "expressionless",
    "😒": "unamused",
    "🙄": "roll_eyes",
    "🤔": "thinking",
    "🤥": "lying_face",
    "😳": "flushed",
    "😞": "disappointed",
    "😟": "worried",
    "😠": "angry",
    "😡": "rage",
    "😔": "pensive",
    "😕": "confused",
    "🙁": "slightly_frowning_face",
    "😣": "persevere",
    "😖": "confounded",
    "😫": "tired_face",
    "😩": "weary",
    "😤": "triumph",
    "😮": "open_mouth",
    "😱": "scream",
    "😨": "fearful",
    "😰": "cold_sweat",
    "😯": "hushed",
    "😦": "frowning_face_with_open_mouth",
    "😧": "anguished",
    "😢": "cry",
    "😥": "disappointed_relieved",
    "🤤": "drooling_face",
    "😪": "sleepy",
    "😓": "sweat",
    "😭": "sob",
    "😵": "dizzy_face",
    "😲": "astonished",
    "🤐": "zipper_mouth_face",
    "🤢": "nauseated_face",
    "🤧": "sneezing_face",
    "😷": "mask",
    "🤒": "face_with_thermometer",
    "🤕": "face_with_head_bandage",
    "😴": "sleeping",
    "💤": "zzz",
    "💩": "poop",
    "😈": "smiling_imp",
    "👿": "imp",
    "👹": "japanese_ogre",
    "👺": "japanese_goblin",
    "💀": "skull",
    "👻": "ghost",
    "👽": "alien",
    "🤖": "robot",
    "😺": "smiley_cat",
    "😸": "smile_cat",
    "😹": "joy_cat",
    "😻": "heart_eyes_cat",
    "😼": "smirk_cat",
    "😽": "kissing_cat",
    "🙀": "scream_cat",
    "😿": "crying_cat_face",
    "😾": "pouting_cat",
    "🙌": "raised_hands",
    "🙌🏻": "raised_hands:t2",
    "🙌🏼": "raised_hands:t3",
    "🙌🏽": "raised_hands:t4",
    "🙌🏾": "raised_hands:t5",
    "🙌🏿": "raised_hands:t6",
    "👏": "clap",
    "👏🏻": "clap:t2",
    "👏🏼": "clap:t3",
    "👏🏽": "clap:t4",
    "👏🏾": "clap:t5",
    "👏🏿": "clap:t6",
    "👋": "wave",
    "👋🏻": "wave:t2",
    "👋🏼": "wave:t3",
    "👋🏽": "wave:t4",
    "👋🏾": "wave:t5",
    "👋🏿": "wave:t6",
    "🤙": "call_me_hand",
    "🤙🏻": "call_me_hand:t2",
    "🤙🏼": "call_me_hand:t3",
    "🤙🏽": "call_me_hand:t4",
    "🤙🏾": "call_me_hand:t5",
    "🤙🏿": "call_me_hand:t6",
    "👍": "+1",
    "👍🏻": "+1:t2",
    "👍🏼": "+1:t3",
    "👍🏽": "+1:t4",
    "👍🏾": "+1:t5",
    "👍🏿": "+1:t6",
    "👎": "-1",
    "👎🏻": "-1:t2",
    "👎🏼": "-1:t3",
    "👎🏽": "-1:t4",
    "👎🏾": "-1:t5",
    "👎🏿": "-1:t6",
    "👊": "facepunch",
    "👊🏻": "facepunch:t2",
    "👊🏼": "facepunch:t3",
    "👊🏽": "facepunch:t4",
    "👊🏾": "facepunch:t5",
    "👊🏿": "facepunch:t6",
    "✊": "fist",
    "✊🏻": "fist:t2",
    "✊🏼": "fist:t3",
    "✊🏽": "fist:t4",
    "✊🏾": "fist:t5",
    "✊🏿": "fist:t6",
    "🤛": "fist_left",
    "🤛🏻": "fist_left:t2",
    "🤛🏼": "fist_left:t3",
    "🤛🏽": "fist_left:t4",
    "🤛🏾": "fist_left:t5",
    "🤛🏿": "fist_left:t6",
    "🤜": "fist_right",
    "🤜🏻": "fist_right:t2",
    "🤜🏼": "fist_right:t3",
    "🤜🏽": "fist_right:t4",
    "🤜🏾": "fist_right:t5",
    "🤜🏿": "fist_right:t6",
    "✌": "v",
    "✌🏻": "v:t2",
    "✌🏼": "v:t3",
    "✌🏽": "v:t4",
    "✌🏾": "v:t5",
    "✌🏿": "v:t6",
    "👌": "ok_hand",
    "👌🏻": "ok_hand:t2",
    "👌🏼": "ok_hand:t3",
    "👌🏽": "ok_hand:t4",
    "👌🏾": "ok_hand:t5",
    "👌🏿": "ok_hand:t6",
    "✋": "raised_hand",
    "✋🏻": "raised_hand:t2",
    "✋🏼": "raised_hand:t3",
    "✋🏽": "raised_hand:t4",
    "✋🏾": "raised_hand:t5",
    "✋🏿": "raised_hand:t6",
    "🤚": "raised_back_of_hand",
    "🤚🏻": "raised_back_of_hand:t2",
    "🤚🏼": "raised_back_of_hand:t3",
    "🤚🏽": "raised_back_of_hand:t4",
    "🤚🏾": "raised_back_of_hand:t5",
    "🤚🏿": "raised_back_of_hand:t6",
    "👐": "open_hands",
    "👐🏻": "open_hands:t2",
    "👐🏼": "open_hands:t3",
    "👐🏽": "open_hands:t4",
    "👐🏾": "open_hands:t5",
    "👐🏿": "open_hands:t6",
    "💪": "muscle",
    "💪🏻": "muscle:t2",
    "💪🏼": "muscle:t3",
    "💪🏽": "muscle:t4",
    "💪🏾": "muscle:t5",
    "💪🏿": "muscle:t6",
    "🙏": "pray",
    "🙏🏻": "pray:t2",
    "🙏🏼": "pray:t3",
    "🙏🏽": "pray:t4",
    "🙏🏾": "pray:t5",
    "🙏🏿": "pray:t6",
    "🤝": "handshake",
    "☝": "point_up",
    "☝🏻": "point_up:t2",
    "☝🏼": "point_up:t3",
    "☝🏽": "point_up:t4",
    "☝🏾": "point_up:t5",
    "☝🏿": "point_up:t6",
    "👆": "point_up_2",
    "👆🏻": "point_up_2:t2",
    "👆🏼": "point_up_2:t3",
    "👆🏽": "point_up_2:t4",
    "👆🏾": "point_up_2:t5",
    "👆🏿": "point_up_2:t6",
    "👇": "point_down",
    "👇🏻": "point_down:t2",
    "👇🏼": "point_down:t3",
    "👇🏽": "point_down:t4",
    "👇🏾": "point_down:t5",
    "👇🏿": "point_down:t6",
    "👈": "point_left",
    "👈🏻": "point_left:t2",
    "👈🏼": "point_left:t3",
    "👈🏽": "point_left:t4",
    "👈🏾": "point_left:t5",
    "👈🏿": "point_left:t6",
    "👉": "point_right",
    "👉🏻": "point_right:t2",
    "👉🏼": "point_right:t3",
    "👉🏽": "point_right:t4",
    "👉🏾": "point_right:t5",
    "👉🏿": "point_right:t6",
    "🖕": "fu",
    "🖕🏻": "fu:t2",
    "🖕🏼": "fu:t3",
    "🖕🏽": "fu:t4",
    "🖕🏾": "fu:t5",
    "🖕🏿": "fu:t6",
    "🖐": "raised_hand_with_fingers_splayed",
    "🖐🏻": "raised_hand_with_fingers_splayed:t2",
    "🖐🏼": "raised_hand_with_fingers_splayed:t3",
    "🖐🏽": "raised_hand_with_fingers_splayed:t4",
    "🖐🏾": "raised_hand_with_fingers_splayed:t5",
    "🖐🏿": "raised_hand_with_fingers_splayed:t6",
    "🤘": "metal",
    "🤘🏻": "metal:t2",
    "🤘🏼": "metal:t3",
    "🤘🏽": "metal:t4",
    "🤘🏾": "metal:t5",
    "🤘🏿": "metal:t6",
    "🤞": "crossed_fingers",
    "🤞🏻": "crossed_fingers:t2",
    "🤞🏼": "crossed_fingers:t3",
    "🤞🏽": "crossed_fingers:t4",
    "🤞🏾": "crossed_fingers:t5",
    "🤞🏿": "crossed_fingers:t6",
    "🖖": "vulcan_salute",
    "🖖🏻": "vulcan_salute:t2",
    "🖖🏼": "vulcan_salute:t3",
    "🖖🏽": "vulcan_salute:t4",
    "🖖🏾": "vulcan_salute:t5",
    "🖖🏿": "vulcan_salute:t6",
    "✍": "writing_hand",
    "✍🏻": "writing_hand:t2",
    "✍🏼": "writing_hand:t3",
    "✍🏽": "writing_hand:t4",
    "✍🏾": "writing_hand:t5",
    "✍🏿": "writing_hand:t6",
    "🤳": "selfie",
    "🤳🏻": "selfie:t2",
    "🤳🏼": "selfie:t3",
    "🤳🏽": "selfie:t4",
    "🤳🏾": "selfie:t5",
    "🤳🏿": "selfie:t6",
    "💅": "nail_care",
    "💅🏻": "nail_care:t2",
    "💅🏼": "nail_care:t3",
    "💅🏽": "nail_care:t4",
    "💅🏾": "nail_care:t5",
    "💅🏿": "nail_care:t6",
    "👄": "lips",
    "👅": "tongue",
    "👂": "ear",
    "👂🏻": "ear:t2",
    "👂🏼": "ear:t3",
    "👂🏽": "ear:t4",
    "👂🏾": "ear:t5",
    "👂🏿": "ear:t6",
    "👃": "nose",
    "👃🏻": "nose:t2",
    "👃🏼": "nose:t3",
    "👃🏽": "nose:t4",
    "👃🏾": "nose:t5",
    "👃🏿": "nose:t6",
    "👁": "eye",
    "👀": "eyes",
    "👤": "bust_in_silhouette",
    "👥": "busts_in_silhouette",
    "🗣": "speaking_head",
    "👶": "baby",
    "👶🏻": "baby:t2",
    "👶🏼": "baby:t3",
    "👶🏽": "baby:t4",
    "👶🏾": "baby:t5",
    "👶🏿": "baby:t6",
    "👦": "boy",
    "👦🏻": "boy:t2",
    "👦🏼": "boy:t3",
    "👦🏽": "boy:t4",
    "👦🏾": "boy:t5",
    "👦🏿": "boy:t6",
    "👧": "girl",
    "👧🏻": "girl:t2",
    "👧🏼": "girl:t3",
    "👧🏽": "girl:t4",
    "👧🏾": "girl:t5",
    "👧🏿": "girl:t6",
    "👨": "man",
    "👨🏻": "man:t2",
    "👨🏼": "man:t3",
    "👨🏽": "man:t4",
    "👨🏾": "man:t5",
    "👨🏿": "man:t6",
    "👩": "woman",
    "👩🏻": "woman:t2",
    "👩🏼": "woman:t3",
    "👩🏽": "woman:t4",
    "👩🏾": "woman:t5",
    "👩🏿": "woman:t6",
    "👱‍♀️": "blonde_woman",
    "👱🏻‍♀️": "blonde_woman:t2",
    "👱🏼‍♀️": "blonde_woman:t3",
    "👱🏽‍♀️": "blonde_woman:t4",
    "👱🏾‍♀️": "blonde_woman:t5",
    "👱🏿‍♀️": "blonde_woman:t6",
    "👱": "blonde_man",
    "👱🏻": "blonde_man:t2",
    "👱🏼": "blonde_man:t3",
    "👱🏽": "blonde_man:t4",
    "👱🏾": "blonde_man:t5",
    "👱🏿": "blonde_man:t6",
    "👴": "older_man",
    "👴🏻": "older_man:t2",
    "👴🏼": "older_man:t3",
    "👴🏽": "older_man:t4",
    "👴🏾": "older_man:t5",
    "👴🏿": "older_man:t6",
    "👵": "older_woman",
    "👵🏻": "older_woman:t2",
    "👵🏼": "older_woman:t3",
    "👵🏽": "older_woman:t4",
    "👵🏾": "older_woman:t5",
    "👵🏿": "older_woman:t6",
    "👲": "man_with_gua_pi_mao",
    "👲🏻": "man_with_gua_pi_mao:t2",
    "👲🏼": "man_with_gua_pi_mao:t3",
    "👲🏽": "man_with_gua_pi_mao:t4",
    "👲🏾": "man_with_gua_pi_mao:t5",
    "👲🏿": "man_with_gua_pi_mao:t6",
    "👳‍♀️": "woman_with_turban",
    "👳🏻‍♀️": "woman_with_turban:t2",
    "👳🏼‍♀️": "woman_with_turban:t3",
    "👳🏽‍♀️": "woman_with_turban:t4",
    "👳🏾‍♀️": "woman_with_turban:t5",
    "👳🏿‍♀️": "woman_with_turban:t6",
    "👳": "man_with_turban",
    "👳🏻": "man_with_turban:t2",
    "👳🏼": "man_with_turban:t3",
    "👳🏽": "man_with_turban:t4",
    "👳🏾": "man_with_turban:t5",
    "👳🏿": "man_with_turban:t6",
    "👮‍♀️": "policewoman",
    "👮🏻‍♀️": "policewoman:t2",
    "👮🏼‍♀️": "policewoman:t3",
    "👮🏽‍♀️": "policewoman:t4",
    "👮🏾‍♀️": "policewoman:t5",
    "👮🏿‍♀️": "policewoman:t6",
    "👮": "policeman",
    "👮🏻": "policeman:t2",
    "👮🏼": "policeman:t3",
    "👮🏽": "policeman:t4",
    "👮🏾": "policeman:t5",
    "👮🏿": "policeman:t6",
    "👷‍♀️": "construction_worker_woman",
    "👷🏻‍♀️": "construction_worker_woman:t2",
    "👷🏼‍♀️": "construction_worker_woman:t3",
    "👷🏽‍♀️": "construction_worker_woman:t4",
    "👷🏾‍♀️": "construction_worker_woman:t5",
    "👷🏿‍♀️": "construction_worker_woman:t6",
    "👷": "construction_worker_man",
    "👷🏻": "construction_worker_man:t2",
    "👷🏼": "construction_worker_man:t3",
    "👷🏽": "construction_worker_man:t4",
    "👷🏾": "construction_worker_man:t5",
    "👷🏿": "construction_worker_man:t6",
    "💂‍♀️": "guardswoman",
    "💂🏻‍♀️": "guardswoman:t2",
    "💂🏼‍♀️": "guardswoman:t3",
    "💂🏽‍♀️": "guardswoman:t4",
    "💂🏾‍♀️": "guardswoman:t5",
    "💂🏿‍♀️": "guardswoman:t6",
    "💂": "guardsman",
    "💂🏻": "guardsman:t2",
    "💂🏼": "guardsman:t3",
    "💂🏽": "guardsman:t4",
    "💂🏾": "guardsman:t5",
    "💂🏿": "guardsman:t6",
    "🕵️‍♀": "female_detective",
    "🕵": "male_detective",
    "🕵🏻": "male_detective:t2",
    "🕵🏼": "male_detective:t3",
    "🕵🏽": "male_detective:t4",
    "🕵🏾": "male_detective:t5",
    "🕵🏿": "male_detective:t6",
    "👩‍⚕️": "woman_health_worker",
    "👩🏻‍⚕️": "woman_health_worker:t2",
    "👩🏼‍⚕️": "woman_health_worker:t3",
    "👩🏽‍⚕️": "woman_health_worker:t4",
    "👩🏾‍⚕️": "woman_health_worker:t5",
    "👩🏿‍⚕️": "woman_health_worker:t6",
    "👨‍⚕️": "man_health_worker",
    "👨🏻‍⚕️": "man_health_worker:t2",
    "👨🏼‍⚕️": "man_health_worker:t3",
    "👨🏽‍⚕️": "man_health_worker:t4",
    "👨🏾‍⚕️": "man_health_worker:t5",
    "👨🏿‍⚕️": "man_health_worker:t6",
    "👩‍🌾": "woman_farmer",
    "👩🏻‍🌾": "woman_farmer:t2",
    "👩🏼‍🌾": "woman_farmer:t3",
    "👩🏽‍🌾": "woman_farmer:t4",
    "👩🏾‍🌾": "woman_farmer:t5",
    "👩🏿‍🌾": "woman_farmer:t6",
    "👨‍🌾": "man_farmer",
    "👨🏻‍🌾": "man_farmer:t2",
    "👨🏼‍🌾": "man_farmer:t3",
    "👨🏽‍🌾": "man_farmer:t4",
    "👨🏾‍🌾": "man_farmer:t5",
    "👨🏿‍🌾": "man_farmer:t6",
    "👩‍🍳": "woman_cook",
    "👩🏻‍🍳": "woman_cook:t2",
    "👩🏼‍🍳": "woman_cook:t3",
    "👩🏽‍🍳": "woman_cook:t4",
    "👩🏾‍🍳": "woman_cook:t5",
    "👩🏿‍🍳": "woman_cook:t6",
    "👨‍🍳": "man_cook",
    "👨🏻‍🍳": "man_cook:t2",
    "👨🏼‍🍳": "man_cook:t3",
    "👨🏽‍🍳": "man_cook:t4",
    "👨🏾‍🍳": "man_cook:t5",
    "👨🏿‍🍳": "man_cook:t6",
    "👩‍🎓": "woman_student",
    "👩🏻‍🎓": "woman_student:t2",
    "👩🏼‍🎓": "woman_student:t3",
    "👩🏽‍🎓": "woman_student:t4",
    "👩🏾‍🎓": "woman_student:t5",
    "👩🏿‍🎓": "woman_student:t6",
    "👨‍🎓": "man_student",
    "👨🏻‍🎓": "man_student:t2",
    "👨🏼‍🎓": "man_student:t3",
    "👨🏽‍🎓": "man_student:t4",
    "👨🏾‍🎓": "man_student:t5",
    "👨🏿‍🎓": "man_student:t6",
    "👩‍🎤": "woman_singer",
    "👩🏻‍🎤": "woman_singer:t2",
    "👩🏼‍🎤": "woman_singer:t3",
    "👩🏽‍🎤": "woman_singer:t4",
    "👩🏾‍🎤": "woman_singer:t5",
    "👩🏿‍🎤": "woman_singer:t6",
    "👨‍🎤": "man_singer",
    "👨🏻‍🎤": "man_singer:t2",
    "👨🏼‍🎤": "man_singer:t3",
    "👨🏽‍🎤": "man_singer:t4",
    "👨🏾‍🎤": "man_singer:t5",
    "👨🏿‍🎤": "man_singer:t6",
    "👩‍🏫": "woman_teacher",
    "👩🏻‍🏫": "woman_teacher:t2",
    "👩🏼‍🏫": "woman_teacher:t3",
    "👩🏽‍🏫": "woman_teacher:t4",
    "👩🏾‍🏫": "woman_teacher:t5",
    "👩🏿‍🏫": "woman_teacher:t6",
    "👨‍🏫": "man_teacher",
    "👨🏻‍🏫": "man_teacher:t2",
    "👨🏼‍🏫": "man_teacher:t3",
    "👨🏽‍🏫": "man_teacher:t4",
    "👨🏾‍🏫": "man_teacher:t5",
    "👨🏿‍🏫": "man_teacher:t6",
    "👩‍🏭": "woman_factory_worker",
    "👩🏻‍🏭": "woman_factory_worker:t2",
    "👩🏼‍🏭": "woman_factory_worker:t3",
    "👩🏽‍🏭": "woman_factory_worker:t4",
    "👩🏾‍🏭": "woman_factory_worker:t5",
    "👩🏿‍🏭": "woman_factory_worker:t6",
    "👨‍🏭": "man_factory_worker",
    "👨🏻‍🏭": "man_factory_worker:t2",
    "👨🏼‍🏭": "man_factory_worker:t3",
    "👨🏽‍🏭": "man_factory_worker:t4",
    "👨🏾‍🏭": "man_factory_worker:t5",
    "👨🏿‍🏭": "man_factory_worker:t6",
    "👩‍💻": "woman_technologist",
    "👩🏻‍💻": "woman_technologist:t2",
    "👩🏼‍💻": "woman_technologist:t3",
    "👩🏽‍💻": "woman_technologist:t4",
    "👩🏾‍💻": "woman_technologist:t5",
    "👩🏿‍💻": "woman_technologist:t6",
    "👨‍💻": "man_technologist",
    "👨🏻‍💻": "man_technologist:t2",
    "👨🏼‍💻": "man_technologist:t3",
    "👨🏽‍💻": "man_technologist:t4",
    "👨🏾‍💻": "man_technologist:t5",
    "👨🏿‍💻": "man_technologist:t6",
    "👩‍💼": "woman_office_worker",
    "👩🏻‍💼": "woman_office_worker:t2",
    "👩🏼‍💼": "woman_office_worker:t3",
    "👩🏽‍💼": "woman_office_worker:t4",
    "👩🏾‍💼": "woman_office_worker:t5",
    "👩🏿‍💼": "woman_office_worker:t6",
    "👨‍💼": "man_office_worker",
    "👨🏻‍💼": "man_office_worker:t2",
    "👨🏼‍💼": "man_office_worker:t3",
    "👨🏽‍💼": "man_office_worker:t4",
    "👨🏾‍💼": "man_office_worker:t5",
    "👨🏿‍💼": "man_office_worker:t6",
    "👩‍🔧": "woman_mechanic",
    "👩🏻‍🔧": "woman_mechanic:t2",
    "👩🏼‍🔧": "woman_mechanic:t3",
    "👩🏽‍🔧": "woman_mechanic:t4",
    "👩🏾‍🔧": "woman_mechanic:t5",
    "👩🏿‍🔧": "woman_mechanic:t6",
    "👨‍🔧": "man_mechanic",
    "👨🏻‍🔧": "man_mechanic:t2",
    "👨🏼‍🔧": "man_mechanic:t3",
    "👨🏽‍🔧": "man_mechanic:t4",
    "👨🏾‍🔧": "man_mechanic:t5",
    "👨🏿‍🔧": "man_mechanic:t6",
    "👩‍🔬": "woman_scientist",
    "👩🏻‍🔬": "woman_scientist:t2",
    "👩🏼‍🔬": "woman_scientist:t3",
    "👩🏽‍🔬": "woman_scientist:t4",
    "👩🏾‍🔬": "woman_scientist:t5",
    "👩🏿‍🔬": "woman_scientist:t6",
    "👨‍🔬": "man_scientist",
    "👨🏻‍🔬": "man_scientist:t2",
    "👨🏼‍🔬": "man_scientist:t3",
    "👨🏽‍🔬": "man_scientist:t4",
    "👨🏾‍🔬": "man_scientist:t5",
    "👨🏿‍🔬": "man_scientist:t6",
    "👩‍🎨": "woman_artist",
    "👩🏻‍🎨": "woman_artist:t2",
    "👩🏼‍🎨": "woman_artist:t3",
    "👩🏽‍🎨": "woman_artist:t4",
    "👩🏾‍🎨": "woman_artist:t5",
    "👩🏿‍🎨": "woman_artist:t6",
    "👨‍🎨": "man_artist",
    "👨🏻‍🎨": "man_artist:t2",
    "👨🏼‍🎨": "man_artist:t3",
    "👨🏽‍🎨": "man_artist:t4",
    "👨🏾‍🎨": "man_artist:t5",
    "👨🏿‍🎨": "man_artist:t6",
    "👩‍🚒": "woman_firefighter",
    "👩🏻‍🚒": "woman_firefighter:t2",
    "👩🏼‍🚒": "woman_firefighter:t3",
    "👩🏽‍🚒": "woman_firefighter:t4",
    "👩🏾‍🚒": "woman_firefighter:t5",
    "👩🏿‍🚒": "woman_firefighter:t6",
    "👨‍🚒": "man_firefighter",
    "👨🏻‍🚒": "man_firefighter:t2",
    "👨🏼‍🚒": "man_firefighter:t3",
    "👨🏽‍🚒": "man_firefighter:t4",
    "👨🏾‍🚒": "man_firefighter:t5",
    "👨🏿‍🚒": "man_firefighter:t6",
    "👩‍✈️": "woman_pilot",
    "👩🏻‍✈️": "woman_pilot:t2",
    "👩🏼‍✈️": "woman_pilot:t3",
    "👩🏽‍✈️": "woman_pilot:t4",
    "👩🏾‍✈️": "woman_pilot:t5",
    "👩🏿‍✈️": "woman_pilot:t6",
    "👨‍✈️": "man_pilot",
    "👨🏻‍✈️": "man_pilot:t2",
    "👨🏼‍✈️": "man_pilot:t3",
    "👨🏽‍✈️": "man_pilot:t4",
    "👨🏾‍✈️": "man_pilot:t5",
    "👨🏿‍✈️": "man_pilot:t6",
    "👩‍🚀": "woman_astronaut",
    "👩🏻‍🚀": "woman_astronaut:t2",
    "👩🏼‍🚀": "woman_astronaut:t3",
    "👩🏽‍🚀": "woman_astronaut:t4",
    "👩🏾‍🚀": "woman_astronaut:t5",
    "👩🏿‍🚀": "woman_astronaut:t6",
    "👨‍🚀": "man_astronaut",
    "👨🏻‍🚀": "man_astronaut:t2",
    "👨🏼‍🚀": "man_astronaut:t3",
    "👨🏽‍🚀": "man_astronaut:t4",
    "👨🏾‍🚀": "man_astronaut:t5",
    "👨🏿‍🚀": "man_astronaut:t6",
    "👩‍⚖️": "woman_judge",
    "👩🏻‍⚖️": "woman_judge:t2",
    "👩🏼‍⚖️": "woman_judge:t3",
    "👩🏽‍⚖️": "woman_judge:t4",
    "👩🏾‍⚖️": "woman_judge:t5",
    "👩🏿‍⚖️": "woman_judge:t6",
    "👨‍⚖️": "man_judge",
    "👨🏻‍⚖️": "man_judge:t2",
    "👨🏼‍⚖️": "man_judge:t3",
    "👨🏽‍⚖️": "man_judge:t4",
    "👨🏾‍⚖️": "man_judge:t5",
    "👨🏿‍⚖️": "man_judge:t6",
    "🤶": "mrs_claus",
    "🤶🏻": "mrs_claus:t2",
    "🤶🏼": "mrs_claus:t3",
    "🤶🏽": "mrs_claus:t4",
    "🤶🏾": "mrs_claus:t5",
    "🤶🏿": "mrs_claus:t6",
    "🎅": "santa",
    "🎅🏻": "santa:t2",
    "🎅🏼": "santa:t3",
    "🎅🏽": "santa:t4",
    "🎅🏾": "santa:t5",
    "🎅🏿": "santa:t6",
    "👼": "angel",
    "👼🏻": "angel:t2",
    "👼🏼": "angel:t3",
    "👼🏽": "angel:t4",
    "👼🏾": "angel:t5",
    "👼🏿": "angel:t6",
    "🤰": "pregnant_woman",
    "🤰🏻": "pregnant_woman:t2",
    "🤰🏼": "pregnant_woman:t3",
    "🤰🏽": "pregnant_woman:t4",
    "🤰🏾": "pregnant_woman:t5",
    "🤰🏿": "pregnant_woman:t6",
    "👸": "princess",
    "👸🏻": "princess:t2",
    "👸🏼": "princess:t3",
    "👸🏽": "princess:t4",
    "👸🏾": "princess:t5",
    "👸🏿": "princess:t6",
    "🤴": "prince",
    "🤴🏻": "prince:t2",
    "🤴🏼": "prince:t3",
    "🤴🏽": "prince:t4",
    "🤴🏾": "prince:t5",
    "🤴🏿": "prince:t6",
    "👰": "bride_with_veil",
    "👰🏻": "bride_with_veil:t2",
    "👰🏼": "bride_with_veil:t3",
    "👰🏽": "bride_with_veil:t4",
    "👰🏾": "bride_with_veil:t5",
    "👰🏿": "bride_with_veil:t6",
    "🤵": "man_in_tuxedo",
    "🤵🏻": "man_in_tuxedo:t2",
    "🤵🏼": "man_in_tuxedo:t3",
    "🤵🏽": "man_in_tuxedo:t4",
    "🤵🏾": "man_in_tuxedo:t5",
    "🤵🏿": "man_in_tuxedo:t6",
    "🏃‍♀️": "running_woman",
    "🏃🏻‍♀️": "running_woman:t2",
    "🏃🏼‍♀️": "running_woman:t3",
    "🏃🏽‍♀️": "running_woman:t4",
    "🏃🏾‍♀️": "running_woman:t5",
    "🏃🏿‍♀️": "running_woman:t6",
    "🏃": "running_man",
    "🏃🏻": "running_man:t2",
    "🏃🏼": "running_man:t3",
    "🏃🏽": "running_man:t4",
    "🏃🏾": "running_man:t5",
    "🏃🏿": "running_man:t6",
    "🚶‍♀️": "walking_woman",
    "🚶🏻‍♀️": "walking_woman:t2",
    "🚶🏼‍♀️": "walking_woman:t3",
    "🚶🏽‍♀️": "walking_woman:t4",
    "🚶🏾‍♀️": "walking_woman:t5",
    "🚶🏿‍♀️": "walking_woman:t6",
    "🚶": "walking_man",
    "🚶🏻": "walking_man:t2",
    "🚶🏼": "walking_man:t3",
    "🚶🏽": "walking_man:t4",
    "🚶🏾": "walking_man:t5",
    "🚶🏿": "walking_man:t6",
    "💃": "dancer",
    "💃🏻": "dancer:t2",
    "💃🏼": "dancer:t3",
    "💃🏽": "dancer:t4",
    "💃🏾": "dancer:t5",
    "💃🏿": "dancer:t6",
    "🕺": "man_dancing",
    "🕺🏻": "man_dancing:t2",
    "🕺🏼": "man_dancing:t3",
    "🕺🏽": "man_dancing:t4",
    "🕺🏾": "man_dancing:t5",
    "🕺🏿": "man_dancing:t6",
    "👯": "dancing_women",
    "👯‍♂": "dancing_men",
    "👫": "couple",
    "👬": "two_men_holding_hands",
    "👭": "two_women_holding_hands",
    "🙇‍♀️": "bowing_woman",
    "🙇🏻‍♀️": "bowing_woman:t2",
    "🙇🏼‍♀️": "bowing_woman:t3",
    "🙇🏽‍♀️": "bowing_woman:t4",
    "🙇🏾‍♀️": "bowing_woman:t5",
    "🙇🏿‍♀️": "bowing_woman:t6",
    "🙇": "bowing_man",
    "🙇🏻": "bowing_man:t2",
    "🙇🏼": "bowing_man:t3",
    "🙇🏽": "bowing_man:t4",
    "🙇🏾": "bowing_man:t5",
    "🙇🏿": "bowing_man:t6",
    "🤦‍♂️": "man_facepalming",
    "🤦🏻‍♂️": "man_facepalming:t2",
    "🤦🏼‍♂️": "man_facepalming:t3",
    "🤦🏽‍♂️": "man_facepalming:t4",
    "🤦🏾‍♂️": "man_facepalming:t5",
    "🤦🏿‍♂️": "man_facepalming:t6",
    "🤦‍♀️": "woman_facepalming",
    "🤦🏻‍♀️": "woman_facepalming:t2",
    "🤦🏼‍♀️": "woman_facepalming:t3",
    "🤦🏽‍♀️": "woman_facepalming:t4",
    "🤦🏾‍♀️": "woman_facepalming:t5",
    "🤦🏿‍♀️": "woman_facepalming:t6",
    "🤷‍♀️": "woman_shrugging",
    "🤷🏻‍♀️": "woman_shrugging:t2",
    "🤷🏼‍♀️": "woman_shrugging:t3",
    "🤷🏽‍♀️": "woman_shrugging:t4",
    "🤷🏾‍♀️": "woman_shrugging:t5",
    "🤷🏿‍♀️": "woman_shrugging:t6",
    "🤷‍♂️": "man_shrugging",
    "🤷🏻‍♂️": "man_shrugging:t2",
    "🤷🏼‍♂️": "man_shrugging:t3",
    "🤷🏽‍♂️": "man_shrugging:t4",
    "🤷🏾‍♂️": "man_shrugging:t5",
    "🤷🏿‍♂️": "man_shrugging:t6",
    "💁‍♀️": "tipping_hand_woman",
    "💁🏻‍♀️": "tipping_hand_woman:t2",
    "💁🏼‍♀️": "tipping_hand_woman:t3",
    "💁🏽‍♀️": "tipping_hand_woman:t4",
    "💁🏾‍♀️": "tipping_hand_woman:t5",
    "💁🏿‍♀️": "tipping_hand_woman:t6",
    "💁‍♂️": "tipping_hand_man",
    "💁🏻‍♂️": "tipping_hand_man:t2",
    "💁🏼‍♂️": "tipping_hand_man:t3",
    "💁🏽‍♂️": "tipping_hand_man:t4",
    "💁🏾‍♂️": "tipping_hand_man:t5",
    "💁🏿‍♂️": "tipping_hand_man:t6",
    "🙅‍♀️": "no_good_woman",
    "🙅🏻‍♀️": "no_good_woman:t2",
    "🙅🏼‍♀️": "no_good_woman:t3",
    "🙅🏽‍♀️": "no_good_woman:t4",
    "🙅🏾‍♀️": "no_good_woman:t5",
    "🙅🏿‍♀️": "no_good_woman:t6",
    "🙅‍♂️": "no_good_man",
    "🙅🏻‍♂️": "no_good_man:t2",
    "🙅🏼‍♂️": "no_good_man:t3",
    "🙅🏽‍♂️": "no_good_man:t4",
    "🙅🏾‍♂️": "no_good_man:t5",
    "🙅🏿‍♂️": "no_good_man:t6",
    "🙆‍♀️": "ok_woman",
    "🙆🏻‍♀️": "ok_woman:t2",
    "🙆🏼‍♀️": "ok_woman:t3",
    "🙆🏽‍♀️": "ok_woman:t4",
    "🙆🏾‍♀️": "ok_woman:t5",
    "🙆🏿‍♀️": "ok_woman:t6",
    "🙆‍♂️": "ok_man",
    "🙆🏻‍♂️": "ok_man:t2",
    "🙆🏼‍♂️": "ok_man:t3",
    "🙆🏽‍♂️": "ok_man:t4",
    "🙆🏾‍♂️": "ok_man:t5",
    "🙆🏿‍♂️": "ok_man:t6",
    "🙋‍♀️": "raising_hand_woman",
    "🙋🏻‍♀️": "raising_hand_woman:t2",
    "🙋🏼‍♀️": "raising_hand_woman:t3",
    "🙋🏽‍♀️": "raising_hand_woman:t4",
    "🙋🏾‍♀️": "raising_hand_woman:t5",
    "🙋🏿‍♀️": "raising_hand_woman:t6",
    "🙋‍♂️": "raising_hand_man",
    "🙋🏻‍♂️": "raising_hand_man:t2",
    "🙋🏼‍♂️": "raising_hand_man:t3",
    "🙋🏽‍♂️": "raising_hand_man:t4",
    "🙋🏾‍♂️": "raising_hand_man:t5",
    "🙋🏿‍♂️": "raising_hand_man:t6",
    "🙎‍♀️": "pouting_woman",
    "🙎🏻‍♀️": "pouting_woman:t2",
    "🙎🏼‍♀️": "pouting_woman:t3",
    "🙎🏽‍♀️": "pouting_woman:t4",
    "🙎🏾‍♀️": "pouting_woman:t5",
    "🙎🏿‍♀️": "pouting_woman:t6",
    "🙎‍♂️": "pouting_man",
    "🙎🏻‍♂️": "pouting_man:t2",
    "🙎🏼‍♂️": "pouting_man:t3",
    "🙎🏽‍♂️": "pouting_man:t4",
    "🙎🏾‍♂️": "pouting_man:t5",
    "🙎🏿‍♂️": "pouting_man:t6",
    "🙍‍♀️": "frowning_woman",
    "🙍🏻‍♀️": "frowning_woman:t2",
    "🙍🏼‍♀️": "frowning_woman:t3",
    "🙍🏽‍♀️": "frowning_woman:t4",
    "🙍🏾‍♀️": "frowning_woman:t5",
    "🙍🏿‍♀️": "frowning_woman:t6",
    "🙍‍♂️": "frowning_man",
    "🙍🏻‍♂️": "frowning_man:t2",
    "🙍🏼‍♂️": "frowning_man:t3",
    "🙍🏽‍♂️": "frowning_man:t4",
    "🙍🏾‍♂️": "frowning_man:t5",
    "🙍🏿‍♂️": "frowning_man:t6",
    "💇‍♀️": "haircut_woman",
    "💇🏻‍♀️": "haircut_woman:t2",
    "💇🏼‍♀️": "haircut_woman:t3",
    "💇🏽‍♀️": "haircut_woman:t4",
    "💇🏾‍♀️": "haircut_woman:t5",
    "💇🏿‍♀️": "haircut_woman:t6",
    "💇‍♂️": "haircut_man",
    "💇🏻‍♂️": "haircut_man:t2",
    "💇🏼‍♂️": "haircut_man:t3",
    "💇🏽‍♂️": "haircut_man:t4",
    "💇🏾‍♂️": "haircut_man:t5",
    "💇🏿‍♂️": "haircut_man:t6",
    "💆‍♀️": "massage_woman",
    "💆🏻‍♀️": "massage_woman:t2",
    "💆🏼‍♀️": "massage_woman:t3",
    "💆🏽‍♀️": "massage_woman:t4",
    "💆🏾‍♀️": "massage_woman:t5",
    "💆🏿‍♀️": "massage_woman:t6",
    "💆‍♂️": "massage_man",
    "💆🏻‍♂️": "massage_man:t2",
    "💆🏼‍♂️": "massage_man:t3",
    "💆🏽‍♂️": "massage_man:t4",
    "💆🏾‍♂️": "massage_man:t5",
    "💆🏿‍♂️": "massage_man:t6",
    "💑": "couple_with_heart_woman_man",
    "👩‍❤️‍👩": "couple_with_heart_woman_woman",
    "👨‍❤️‍👨": "couple_with_heart_man_man",
    "💏": "couplekiss_man_woman",
    "👩‍❤️‍💋‍👩": "couplekiss_woman_woman",
    "👨‍❤️‍💋‍👨": "couplekiss_man_man",
    "👪": "family_man_woman_boy",
    "👨‍👩‍👧": "family_man_woman_girl",
    "👨‍👩‍👧‍👦": "family_man_woman_girl_boy",
    "👨‍👩‍👦‍👦": "family_man_woman_boy_boy",
    "👨‍👩‍👧‍👧": "family_man_woman_girl_girl",
    "👩‍👩‍👦": "family_woman_woman_boy",
    "👩‍👩‍👧": "family_woman_woman_girl",
    "👩‍👩‍👧‍👦": "family_woman_woman_girl_boy",
    "👩‍👩‍👦‍👦": "family_woman_woman_boy_boy",
    "👩‍👩‍👧‍👧": "family_woman_woman_girl_girl",
    "👨‍👨‍👦": "family_man_man_boy",
    "👨‍👨‍👧": "family_man_man_girl",
    "👨‍👨‍👧‍👦": "family_man_man_girl_boy",
    "👨‍👨‍👦‍👦": "family_man_man_boy_boy",
    "👨‍👨‍👧‍👧": "family_man_man_girl_girl",
    "👩‍👦": "family_woman_boy",
    "👩‍👧": "family_woman_girl",
    "👩‍👧‍👦": "family_woman_girl_boy",
    "👩‍👦‍👦": "family_woman_boy_boy",
    "👩‍👧‍👧": "family_woman_girl_girl",
    "👨‍👦": "family_man_boy",
    "👨‍👧": "family_man_girl",
    "👨‍👧‍👦": "family_man_girl_boy",
    "👨‍👦‍👦": "family_man_boy_boy",
    "👨‍👧‍👧": "family_man_girl_girl",
    "👚": "womans_clothes",
    "👕": "tshirt",
    "👖": "jeans",
    "👔": "necktie",
    "👗": "dress",
    "👙": "bikini",
    "👘": "kimono",
    "💄": "lipstick",
    "💋": "kiss",
    "👣": "footprints",
    "👠": "high_heel",
    "👡": "sandal",
    "👢": "boot",
    "👞": "mans_shoe",
    "👟": "athletic_shoe",
    "👒": "womans_hat",
    "🎩": "tophat",
    "⛑": "rescue_worker_helmet",
    "🎓": "mortar_board",
    "👑": "crown",
    "🎒": "school_satchel",
    "👝": "pouch",
    "👛": "purse",
    "👜": "handbag",
    "💼": "briefcase",
    "👓": "eyeglasses",
    "🕶": "dark_sunglasses",
    "💍": "ring",
    "🌂": "closed_umbrella",
    "🐶": "dog",
    "🐱": "cat",
    "🐭": "mouse",
    "🐹": "hamster",
    "🐰": "rabbit",
    "🦊": "fox_face",
    "🐻": "bear",
    "🐼": "panda_face",
    "🐨": "koala",
    "🐯": "tiger",
    "🦁": "lion",
    "🐮": "cow",
    "🐷": "pig",
    "🐽": "pig_nose",
    "🐸": "frog",
    "🦑": "squid",
    "🐙": "octopus",
    "🦐": "shrimp",
    "🐵": "monkey_face",
    "🦍": "gorilla",
    "🙈": "see_no_evil",
    "🙉": "hear_no_evil",
    "🙊": "speak_no_evil",
    "🐒": "monkey",
    "🐔": "chicken",
    "🐧": "penguin",
    "🐦": "bird",
    "🐤": "baby_chick",
    "🐣": "hatching_chick",
    "🐥": "hatched_chick",
    "🦆": "duck",
    "🦅": "eagle",
    "🦉": "owl",
    "🦇": "bat",
    "🐺": "wolf",
    "🐗": "boar",
    "🐴": "horse",
    "🦄": "unicorn",
    "🐝": "honeybee",
    "🐛": "bug",
    "🦋": "butterfly",
    "🐌": "snail",
    "🐞": "beetle",
    "🐜": "ant",
    "🕷": "spider",
    "🦂": "scorpion",
    "🦀": "crab",
    "🐍": "snake",
    "🦎": "lizard",
    "🐢": "turtle",
    "🐠": "tropical_fish",
    "🐟": "fish",
    "🐡": "blowfish",
    "🐬": "dolphin",
    "🦈": "shark",
    "🐳": "whale",
    "🐋": "whale2",
    "🐊": "crocodile",
    "🐆": "leopard",
    "🐅": "tiger2",
    "🐃": "water_buffalo",
    "🐂": "ox",
    "🐄": "cow2",
    "🦌": "deer",
    "🐪": "dromedary_camel",
    "🐫": "camel",
    "🐘": "elephant",
    "🦏": "rhinoceros",
    "🐐": "goat",
    "🐏": "ram",
    "🐑": "sheep",
    "🐎": "racehorse",
    "🐖": "pig2",
    "🐀": "rat",
    "🐁": "mouse2",
    "🐓": "rooster",
    "🦃": "turkey",
    "🕊": "dove",
    "🐕": "dog2",
    "🐩": "poodle",
    "🐈": "cat2",
    "🐇": "rabbit2",
    "🐿": "chipmunk",
    "🐾": "paw_prints",
    "🐉": "dragon",
    "🐲": "dragon_face",
    "🌵": "cactus",
    "🎄": "christmas_tree",
    "🌲": "evergreen_tree",
    "🌳": "deciduous_tree",
    "🌴": "palm_tree",
    "🌱": "seedling",
    "🌿": "herb",
    "☘": "shamrock",
    "🍀": "four_leaf_clover",
    "🎍": "bamboo",
    "🎋": "tanabata_tree",
    "🍃": "leaves",
    "🍂": "fallen_leaf",
    "🍁": "maple_leaf",
    "🌾": "ear_of_rice",
    "🌺": "hibiscus",
    "🌻": "sunflower",
    "🌹": "rose",
    "🥀": "wilted_flower",
    "🌷": "tulip",
    "🌼": "blossom",
    "🌸": "cherry_blossom",
    "💐": "bouquet",
    "🍄": "mushroom",
    "🌰": "chestnut",
    "🎃": "jack_o_lantern",
    "🐚": "shell",
    "🕸": "spider_web",
    "🌎": "earth_americas",
    "🌍": "earth_africa",
    "🌏": "earth_asia",
    "🌕": "full_moon",
    "🌖": "waning_gibbous_moon",
    "🌗": "last_quarter_moon",
    "🌘": "waning_crescent_moon",
    "🌑": "new_moon",
    "🌒": "waxing_crescent_moon",
    "🌓": "first_quarter_moon",
    "🌔": "waxing_gibbous_moon",
    "🌚": "new_moon_with_face",
    "🌝": "full_moon_with_face",
    "🌛": "first_quarter_moon_with_face",
    "🌜": "last_quarter_moon_with_face",
    "🌞": "sun_with_face",
    "🌙": "crescent_moon",
    "⭐": "star",
    "🌟": "star2",
    "💫": "dizzy",
    "✨": "sparkles",
    "☄": "comet",
    "☀": "sunny",
    "🌤": "sun_behind_small_cloud",
    "⛅": "partly_sunny",
    "🌥": "sun_behind_large_cloud",
    "🌦": "sun_behind_rain_cloud",
    "☁": "cloud",
    "🌧": "cloud_with_rain",
    "⛈": "cloud_with_lightning_and_rain",
    "🌩": "cloud_with_lightning",
    "⚡": "zap",
    "🔥": "fire",
    "💥": "boom",
    "❄": "snowflake",
    "🌨": "cloud_with_snow",
    "⛄": "snowman",
    "☃": "snowman_with_snow",
    "🌬": "wind_face",
    "💨": "dash",
    "🌪": "tornado",
    "🌫": "fog",
    "☂": "open_umbrella",
    "☔": "umbrella",
    "💧": "droplet",
    "💦": "sweat_drops",
    "🌊": "ocean",
    "🍏": "green_apple",
    "🍎": "apple",
    "🍐": "pear",
    "🍊": "tangerine",
    "🍋": "lemon",
    "🍌": "banana",
    "🍉": "watermelon",
    "🍇": "grapes",
    "🍓": "strawberry",
    "🍈": "melon",
    "🍒": "cherries",
    "🍑": "peach",
    "🍍": "pineapple",
    "🥝": "kiwi_fruit",
    "🥑": "avocado",
    "🍅": "tomato",
    "🍆": "eggplant",
    "🥒": "cucumber",
    "🥕": "carrot",
    "🌶": "hot_pepper",
    "🥔": "potato",
    "🌽": "corn",
    "🍠": "sweet_potato",
    "🥜": "peanuts",
    "🍯": "honey_pot",
    "🥐": "croissant",
    "🍞": "bread",
    "🥖": "baguette_bread",
    "🧀": "cheese",
    "🥚": "egg",
    "🥓": "bacon",
    "🥞": "pancakes",
    "🍗": "poultry_leg",
    "🍖": "meat_on_bone",
    "🍤": "fried_shrimp",
    "🍳": "fried_egg",
    "🍔": "hamburger",
    "🍟": "fries",
    "🥙": "stuffed_flatbread",
    "🌭": "hotdog",
    "🍕": "pizza",
    "🍝": "spaghetti",
    "🌮": "taco",
    "🌯": "burrito",
    "🥗": "green_salad",
    "🥘": "shallow_pan_of_food",
    "🍜": "ramen",
    "🍲": "stew",
    "🍥": "fish_cake",
    "🍣": "sushi",
    "🍱": "bento",
    "🍛": "curry",
    "🍙": "rice_ball",
    "🍚": "rice",
    "🍘": "rice_cracker",
    "🍢": "oden",
    "🍡": "dango",
    "🍧": "shaved_ice",
    "🍨": "ice_cream",
    "🍦": "icecream",
    "🍰": "cake",
    "🎂": "birthday",
    "🍮": "custard",
    "🍬": "candy",
    "🍭": "lollipop",
    "🍫": "chocolate_bar",
    "🍿": "popcorn",
    "🍩": "doughnut",
    "🍪": "cookie",
    "🥛": "milk_glass",
    "🍺": "beer",
    "🍻": "beers",
    "🥂": "clinking_glasses",
    "🍷": "wine_glass",
    "🥃": "tumbler_glass",
    "🍸": "cocktail",
    "🍹": "tropical_drink",
    "🍾": "champagne",
    "🍶": "sake",
    "🍵": "tea",
    "☕": "coffee",
    "🍼": "baby_bottle",
    "🥄": "spoon",
    "🍴": "fork_and_knife",
    "🍽": "plate_with_cutlery",
    "⚽": "soccer",
    "🏀": "basketball",
    "🏈": "football",
    "⚾": "baseball",
    "🎾": "tennis",
    "🏐": "volleyball",
    "🏉": "rugby_football",
    "🎱": "8ball",
    "⛳": "golf",
    "🏌️‍♀": "golfing_woman",
    "🏌": "golfing_man",
    "🏌🏻": "golfing_man:t2",
    "🏌🏼": "golfing_man:t3",
    "🏌🏽": "golfing_man:t4",
    "🏌🏾": "golfing_man:t5",
    "🏌🏿": "golfing_man:t6",
    "🏓": "ping_pong",
    "🏸": "badminton",
    "🥅": "goal_net",
    "🏒": "ice_hockey",
    "🏑": "field_hockey",
    "🏏": "cricket_bat_and_ball",
    "🎿": "ski",
    "⛷": "skier",
    "🏂": "snowboarder",
    "🏂🏻": "snowboarder:t2",
    "🏂🏼": "snowboarder:t3",
    "🏂🏽": "snowboarder:t4",
    "🏂🏾": "snowboarder:t5",
    "🏂🏿": "snowboarder:t6",
    "🤺": "person_fencing",
    "🤼‍♀": "women_wrestling",
    "🤼‍♂": "men_wrestling",
    "🤸‍♀️": "woman_cartwheeling",
    "🤸🏻‍♀️": "woman_cartwheeling:t2",
    "🤸🏼‍♀️": "woman_cartwheeling:t3",
    "🤸🏽‍♀️": "woman_cartwheeling:t4",
    "🤸🏾‍♀️": "woman_cartwheeling:t5",
    "🤸🏿‍♀️": "woman_cartwheeling:t6",
    "🤸‍♂️": "man_cartwheeling",
    "🤸🏻‍♂️": "man_cartwheeling:t2",
    "🤸🏼‍♂️": "man_cartwheeling:t3",
    "🤸🏽‍♂️": "man_cartwheeling:t4",
    "🤸🏾‍♂️": "man_cartwheeling:t5",
    "🤸🏿‍♂️": "man_cartwheeling:t6",
    "🤾‍♀️": "woman_playing_handball",
    "🤾🏻‍♀️": "woman_playing_handball:t2",
    "🤾🏼‍♀️": "woman_playing_handball:t3",
    "🤾🏽‍♀️": "woman_playing_handball:t4",
    "🤾🏾‍♀️": "woman_playing_handball:t5",
    "🤾🏿‍♀️": "woman_playing_handball:t6",
    "🤾‍♂️": "man_playing_handball",
    "🤾🏻‍♂️": "man_playing_handball:t2",
    "🤾🏼‍♂️": "man_playing_handball:t3",
    "🤾🏽‍♂️": "man_playing_handball:t4",
    "🤾🏾‍♂️": "man_playing_handball:t5",
    "🤾🏿‍♂️": "man_playing_handball:t6",
    "⛸": "ice_skate",
    "🏹": "bow_and_arrow",
    "🎣": "fishing_pole_and_fish",
    "🥊": "boxing_glove",
    "🥋": "martial_arts_uniform",
    "🚣‍♀️": "rowing_woman",
    "🚣🏻‍♀️": "rowing_woman:t2",
    "🚣🏼‍♀️": "rowing_woman:t3",
    "🚣🏽‍♀️": "rowing_woman:t4",
    "🚣🏾‍♀️": "rowing_woman:t5",
    "🚣🏿‍♀️": "rowing_woman:t6",
    "🚣": "rowing_man",
    "🚣🏻": "rowing_man:t2",
    "🚣🏼": "rowing_man:t3",
    "🚣🏽": "rowing_man:t4",
    "🚣🏾": "rowing_man:t5",
    "🚣🏿": "rowing_man:t6",
    "🏊‍♀️": "swimming_woman",
    "🏊🏻‍♀️": "swimming_woman:t2",
    "🏊🏼‍♀️": "swimming_woman:t3",
    "🏊🏽‍♀️": "swimming_woman:t4",
    "🏊🏾‍♀️": "swimming_woman:t5",
    "🏊🏿‍♀️": "swimming_woman:t6",
    "🏊": "swimming_man",
    "🏊🏻": "swimming_man:t2",
    "🏊🏼": "swimming_man:t3",
    "🏊🏽": "swimming_man:t4",
    "🏊🏾": "swimming_man:t5",
    "🏊🏿": "swimming_man:t6",
    "🤽‍♀️": "woman_playing_water_polo",
    "🤽🏻‍♀️": "woman_playing_water_polo:t2",
    "🤽🏼‍♀️": "woman_playing_water_polo:t3",
    "🤽🏽‍♀️": "woman_playing_water_polo:t4",
    "🤽🏾‍♀️": "woman_playing_water_polo:t5",
    "🤽🏿‍♀️": "woman_playing_water_polo:t6",
    "🤽‍♂️": "man_playing_water_polo",
    "🤽🏻‍♂️": "man_playing_water_polo:t2",
    "🤽🏼‍♂️": "man_playing_water_polo:t3",
    "🤽🏽‍♂️": "man_playing_water_polo:t4",
    "🤽🏾‍♂️": "man_playing_water_polo:t5",
    "🤽🏿‍♂️": "man_playing_water_polo:t6",
    "🏄‍♀️": "surfing_woman",
    "🏄🏻‍♀️": "surfing_woman:t2",
    "🏄🏼‍♀️": "surfing_woman:t3",
    "🏄🏽‍♀️": "surfing_woman:t4",
    "🏄🏾‍♀️": "surfing_woman:t5",
    "🏄🏿‍♀️": "surfing_woman:t6",
    "🏄": "surfing_man",
    "🏄🏻": "surfing_man:t2",
    "🏄🏼": "surfing_man:t3",
    "🏄🏽": "surfing_man:t4",
    "🏄🏾": "surfing_man:t5",
    "🏄🏿": "surfing_man:t6",
    "🛀": "bath",
    "🛀🏻": "bath:t2",
    "🛀🏼": "bath:t3",
    "🛀🏽": "bath:t4",
    "🛀🏾": "bath:t5",
    "🛀🏿": "bath:t6",
    "⛹️‍♀": "basketball_woman",
    "⛹": "basketball_man",
    "⛹🏻": "basketball_man:t2",
    "⛹🏼": "basketball_man:t3",
    "⛹🏽": "basketball_man:t4",
    "⛹🏾": "basketball_man:t5",
    "⛹🏿": "basketball_man:t6",
    "🏋️‍♀": "weight_lifting_woman",
    "🏋": "weight_lifting_man",
    "🏋🏻": "weight_lifting_man:t2",
    "🏋🏼": "weight_lifting_man:t3",
    "🏋🏽": "weight_lifting_man:t4",
    "🏋🏾": "weight_lifting_man:t5",
    "🏋🏿": "weight_lifting_man:t6",
    "🚴‍♀️": "biking_woman",
    "🚴🏻‍♀️": "biking_woman:t2",
    "🚴🏼‍♀️": "biking_woman:t3",
    "🚴🏽‍♀️": "biking_woman:t4",
    "🚴🏾‍♀️": "biking_woman:t5",
    "🚴🏿‍♀️": "biking_woman:t6",
    "🚴": "biking_man",
    "🚴🏻": "biking_man:t2",
    "🚴🏼": "biking_man:t3",
    "🚴🏽": "biking_man:t4",
    "🚴🏾": "biking_man:t5",
    "🚴🏿": "biking_man:t6",
    "🚵‍♀️": "mountain_biking_woman",
    "🚵🏻‍♀️": "mountain_biking_woman:t2",
    "🚵🏼‍♀️": "mountain_biking_woman:t3",
    "🚵🏽‍♀️": "mountain_biking_woman:t4",
    "🚵🏾‍♀️": "mountain_biking_woman:t5",
    "🚵🏿‍♀️": "mountain_biking_woman:t6",
    "🚵": "mountain_biking_man",
    "🚵🏻": "mountain_biking_man:t2",
    "🚵🏼": "mountain_biking_man:t3",
    "🚵🏽": "mountain_biking_man:t4",
    "🚵🏾": "mountain_biking_man:t5",
    "🚵🏿": "mountain_biking_man:t6",
    "🏇": "horse_racing",
    "🏇🏻": "horse_racing:t2",
    "🏇🏼": "horse_racing:t3",
    "🏇🏽": "horse_racing:t4",
    "🏇🏾": "horse_racing:t5",
    "🏇🏿": "horse_racing:t6",
    "🕴": "business_suit_levitating",
    "🕴🏻": "business_suit_levitating:t2",
    "🕴🏼": "business_suit_levitating:t3",
    "🕴🏽": "business_suit_levitating:t4",
    "🕴🏾": "business_suit_levitating:t5",
    "🕴🏿": "business_suit_levitating:t6",
    "🏆": "trophy",
    "🎽": "running_shirt_with_sash",
    "🏅": "medal_sports",
    "🎖": "medal_military",
    "🥇": "1st_place_medal",
    "🥈": "2nd_place_medal",
    "🥉": "3rd_place_medal",
    "🎗": "reminder_ribbon",
    "🏵": "rosette",
    "🎫": "ticket",
    "🎟": "tickets",
    "🎭": "performing_arts",
    "🎨": "art",
    "🎪": "circus_tent",
    "🤹‍♀️": "woman_juggling",
    "🤹🏻‍♀️": "woman_juggling:t2",
    "🤹🏼‍♀️": "woman_juggling:t3",
    "🤹🏽‍♀️": "woman_juggling:t4",
    "🤹🏾‍♀️": "woman_juggling:t5",
    "🤹🏿‍♀️": "woman_juggling:t6",
    "🤹‍♂️": "man_juggling",
    "🤹🏻‍♂️": "man_juggling:t2",
    "🤹🏼‍♂️": "man_juggling:t3",
    "🤹🏽‍♂️": "man_juggling:t4",
    "🤹🏾‍♂️": "man_juggling:t5",
    "🤹🏿‍♂️": "man_juggling:t6",
    "🎤": "microphone",
    "🎧": "headphones",
    "🎼": "musical_score",
    "🎹": "musical_keyboard",
    "🥁": "drum",
    "🎷": "saxophone",
    "🎺": "trumpet",
    "🎸": "guitar",
    "🎻": "violin",
    "🎬": "clapper",
    "🎮": "video_game",
    "👾": "space_invader",
    "🎯": "dart",
    "🎲": "game_die",
    "🎰": "slot_machine",
    "🎳": "bowling",
    "🚗": "red_car",
    "🚕": "taxi",
    "🚙": "blue_car",
    "🚌": "bus",
    "🚎": "trolleybus",
    "🏎": "racing_car",
    "🚓": "police_car",
    "🚑": "ambulance",
    "🚒": "fire_engine",
    "🚐": "minibus",
    "🚚": "truck",
    "🚛": "articulated_lorry",
    "🚜": "tractor",
    "🛴": "kick_scooter",
    "🏍": "motorcycle",
    "🚲": "bike",
    "🛵": "motor_scooter",
    "🚨": "rotating_light",
    "🚔": "oncoming_police_car",
    "🚍": "oncoming_bus",
    "🚘": "oncoming_automobile",
    "🚖": "oncoming_taxi",
    "🚡": "aerial_tramway",
    "🚠": "mountain_cableway",
    "🚟": "suspension_railway",
    "🚃": "railway_car",
    "🚋": "train",
    "🚝": "monorail",
    "🚄": "bullettrain_side",
    "🚅": "bullettrain_front",
    "🚈": "light_rail",
    "🚞": "mountain_railway",
    "🚂": "steam_locomotive",
    "🚆": "train2",
    "🚇": "metro",
    "🚊": "tram",
    "🚉": "station",
    "🚁": "helicopter",
    "🛩": "small_airplane",
    "✈": "airplane",
    "🛫": "flight_departure",
    "🛬": "flight_arrival",
    "⛵": "sailboat",
    "🛥": "motor_boat",
    "🚤": "speedboat",
    "⛴": "ferry",
    "🛳": "passenger_ship",
    "🚀": "rocket",
    "🛰": "artificial_satellite",
    "💺": "seat",
    "🛶": "canoe",
    "⚓": "anchor",
    "🚧": "construction",
    "⛽": "fuelpump",
    "🚏": "busstop",
    "🚦": "vertical_traffic_light",
    "🚥": "traffic_light",
    "🏁": "checkered_flag",
    "🚢": "ship",
    "🎡": "ferris_wheel",
    "🎢": "roller_coaster",
    "🎠": "carousel_horse",
    "🏗": "building_construction",
    "🌁": "foggy",
    "🗼": "tokyo_tower",
    "🏭": "factory",
    "⛲": "fountain",
    "🎑": "rice_scene",
    "⛰": "mountain",
    "🏔": "mountain_snow",
    "🗻": "mount_fuji",
    "🌋": "volcano",
    "🗾": "japan",
    "🏕": "camping",
    "⛺": "tent",
    "🏞": "national_park",
    "🛣": "motorway",
    "🛤": "railway_track",
    "🌅": "sunrise",
    "🌄": "sunrise_over_mountains",
    "🏜": "desert",
    "🏖": "beach_umbrella",
    "🏝": "desert_island",
    "🌇": "city_sunrise",
    "🌆": "city_sunset",
    "🏙": "cityscape",
    "🌃": "night_with_stars",
    "🌉": "bridge_at_night",
    "🌌": "milky_way",
    "🌠": "stars",
    "🎇": "sparkler",
    "🎆": "fireworks",
    "🌈": "rainbow",
    "🏘": "houses",
    "🏰": "european_castle",
    "🏯": "japanese_castle",
    "🏟": "stadium",
    "🗽": "statue_of_liberty",
    "🏠": "house",
    "🏡": "house_with_garden",
    "🏚": "derelict_house",
    "🏢": "office",
    "🏬": "department_store",
    "🏣": "post_office",
    "🏤": "european_post_office",
    "🏥": "hospital",
    "🏦": "bank",
    "🏨": "hotel",
    "🏪": "convenience_store",
    "🏫": "school",
    "🏩": "love_hotel",
    "💒": "wedding",
    "🏛": "classical_building",
    "⛪": "church",
    "🕌": "mosque",
    "🕍": "synagogue",
    "🕋": "kaaba",
    "⛩": "shinto_shrine",
    "⌚": "watch",
    "📱": "iphone",
    "📲": "calling",
    "💻": "computer",
    "⌨": "keyboard",
    "🖥": "desktop_computer",
    "🖨": "printer",
    "🖱": "computer_mouse",
    "🖲": "trackball",
    "🕹": "joystick",
    "🗜": "clamp",
    "💽": "minidisc",
    "💾": "floppy_disk",
    "💿": "cd",
    "📀": "dvd",
    "📼": "vhs",
    "📷": "camera",
    "📸": "camera_flash",
    "📹": "video_camera",
    "🎥": "movie_camera",
    "📽": "film_projector",
    "🎞": "film_strip",
    "📞": "telephone_receiver",
    "☎": "phone",
    "📟": "pager",
    "📠": "fax",
    "📺": "tv",
    "📻": "radio",
    "🎙": "studio_microphone",
    "🎚": "level_slider",
    "🎛": "control_knobs",
    "⏱": "stopwatch",
    "⏲": "timer_clock",
    "⏰": "alarm_clock",
    "🕰": "mantelpiece_clock",
    "⏳": "hourglass_flowing_sand",
    "⌛": "hourglass",
    "📡": "satellite",
    "🔋": "battery",
    "🔌": "electric_plug",
    "💡": "bulb",
    "🔦": "flashlight",
    "🕯": "candle",
    "🗑": "wastebasket",
    "🛢": "oil_drum",
    "💸": "money_with_wings",
    "💵": "dollar",
    "💴": "yen",
    "💶": "euro",
    "💷": "pound",
    "💰": "moneybag",
    "💳": "credit_card",
    "💎": "gem",
    "⚖": "balance_scale",
    "🔧": "wrench",
    "🔨": "hammer",
    "⚒": "hammer_and_pick",
    "🛠": "hammer_and_wrench",
    "⛏": "pick",
    "🔩": "nut_and_bolt",
    "⚙": "gear",
    "⛓": "chains",
    "🔫": "gun",
    "💣": "bomb",
    "🔪": "hocho",
    "🗡": "dagger",
    "⚔": "crossed_swords",
    "🛡": "shield",
    "🚬": "smoking",
    "☠": "skull_and_crossbones",
    "⚰": "coffin",
    "⚱": "funeral_urn",
    "🏺": "amphora",
    "🔮": "crystal_ball",
    "📿": "prayer_beads",
    "💈": "barber",
    "⚗": "alembic",
    "🔭": "telescope",
    "🔬": "microscope",
    "🕳": "hole",
    "💊": "pill",
    "💉": "syringe",
    "🌡": "thermometer",
    "🏷": "label",
    "🔖": "bookmark",
    "🚽": "toilet",
    "🚿": "shower",
    "🛁": "bathtub",
    "🔑": "key",
    "🗝": "old_key",
    "🛋": "couch_and_lamp",
    "🛌": "sleeping_bed",
    "🛌🏻": "sleeping_bed:t2",
    "🛌🏼": "sleeping_bed:t3",
    "🛌🏽": "sleeping_bed:t4",
    "🛌🏾": "sleeping_bed:t5",
    "🛌🏿": "sleeping_bed:t6",
    "🛏": "bed",
    "🚪": "door",
    "🛎": "bellhop_bell",
    "🖼": "framed_picture",
    "🗺": "world_map",
    "⛱": "parasol_on_ground",
    "🗿": "moyai",
    "🛍": "shopping",
    "🛒": "shopping_cart",
    "🎈": "balloon",
    "🎏": "flags",
    "🎀": "ribbon",
    "🎁": "gift",
    "🎊": "confetti_ball",
    "🎉": "tada",
    "🎎": "dolls",
    "🎐": "wind_chime",
    "🎌": "crossed_flags",
    "🏮": "izakaya_lantern",
    "✉": "email",
    "📩": "envelope_with_arrow",
    "📨": "incoming_envelope",
    "📧": "e-mail",
    "💌": "love_letter",
    "📮": "postbox",
    "📪": "mailbox_closed",
    "📫": "mailbox",
    "📬": "mailbox_with_mail",
    "📭": "mailbox_with_no_mail",
    "📦": "package",
    "📯": "postal_horn",
    "📥": "inbox_tray",
    "📤": "outbox_tray",
    "📜": "scroll",
    "📃": "page_with_curl",
    "📑": "bookmark_tabs",
    "📊": "bar_chart",
    "📈": "chart_with_upwards_trend",
    "📉": "chart_with_downwards_trend",
    "📄": "page_facing_up",
    "📅": "date",
    "📆": "calendar",
    "🗓": "spiral_calendar",
    "📇": "card_index",
    "🗃": "card_file_box",
    "🗳": "ballot_box",
    "🗄": "file_cabinet",
    "📋": "clipboard",
    "🗒": "spiral_notepad",
    "📁": "file_folder",
    "📂": "open_file_folder",
    "🗂": "card_index_dividers",
    "🗞": "newspaper_roll",
    "📰": "newspaper",
    "📓": "notebook",
    "📕": "closed_book",
    "📗": "green_book",
    "📘": "blue_book",
    "📙": "orange_book",
    "📔": "notebook_with_decorative_cover",
    "📒": "ledger",
    "📚": "books",
    "📖": "open_book",
    "🔗": "link",
    "📎": "paperclip",
    "🖇": "paperclips",
    "✂": "scissors",
    "📐": "triangular_ruler",
    "📏": "straight_ruler",
    "📌": "pushpin",
    "📍": "round_pushpin",
    "🚩": "triangular_flag_on_post",
    "🏳": "white_flag",
    "🏴": "black_flag",
    "🏳️‍🌈": "rainbow_flag",
    "🔐": "closed_lock_with_key",
    "🔒": "lock",
    "🔓": "unlock",
    "🔏": "lock_with_ink_pen",
    "🖊": "pen",
    "🖋": "fountain_pen",
    "✒": "black_nib",
    "📝": "memo",
    "✏": "pencil2",
    "🖍": "crayon",
    "🖌": "paintbrush",
    "🔍": "mag",
    "🔎": "mag_right",
    "❤️": "heart",
    "💛": "yellow_heart",
    "💚": "green_heart",
    "💙": "blue_heart",
    "💜": "purple_heart",
    "🖤": "black_heart",
    "💔": "broken_heart",
    "❣": "heavy_heart_exclamation",
    "💕": "two_hearts",
    "💞": "revolving_hearts",
    "💓": "heartbeat",
    "💗": "heartpulse",
    "💖": "sparkling_heart",
    "💘": "cupid",
    "💝": "gift_heart",
    "💟": "heart_decoration",
    "☮": "peace_symbol",
    "✝": "latin_cross",
    "☪": "star_and_crescent",
    "🕉": "om",
    "☸": "wheel_of_dharma",
    "✡": "star_of_david",
    "🔯": "six_pointed_star",
    "🕎": "menorah",
    "☯": "yin_yang",
    "☦": "orthodox_cross",
    "🛐": "place_of_worship",
    "⛎": "ophiuchus",
    "♈": "aries",
    "♉": "taurus",
    "♊": "gemini",
    "♋": "cancer",
    "♌": "leo",
    "♍": "virgo",
    "♎": "libra",
    "♏": "scorpius",
    "♐": "sagittarius",
    "♑": "capricorn",
    "♒": "aquarius",
    "♓": "pisces",
    "🆔": "id",
    "⚛": "atom_symbol",
    "🈳": "u7a7a",
    "🈹": "u5272",
    "☢": "radioactive",
    "☣": "biohazard",
    "📴": "mobile_phone_off",
    "📳": "vibration_mode",
    "🈶": "u6709",
    "🈚": "u7121",
    "🈸": "u7533",
    "🈺": "u55b6",
    "🈷": "u6708",
    "✴": "eight_pointed_black_star",
    "🆚": "vs",
    "🉑": "accept",
    "💮": "white_flower",
    "🉐": "ideograph_advantage",
    "㊙": "secret",
    "㊗": "congratulations",
    "🈴": "u5408",
    "🈵": "u6e80",
    "🈲": "u7981",
    "🅰": "a",
    "🅱": "b",
    "🆎": "ab",
    "🆑": "cl",
    "🅾": "o2",
    "🆘": "sos",
    "⛔": "no_entry",
    "📛": "name_badge",
    "🚫": "no_entry_sign",
    "❌": "x",
    "⭕": "o",
    "🛑": "stop_sign",
    "💢": "anger",
    "♨": "hotsprings",
    "🚷": "no_pedestrians",
    "🚯": "do_not_litter",
    "🚳": "no_bicycles",
    "🚱": "non-potable_water",
    "🔞": "underage",
    "📵": "no_mobile_phones",
    "❗": "exclamation",
    "❕": "grey_exclamation",
    "❓": "question",
    "❔": "grey_question",
    "‼": "bangbang",
    "⁉": "interrobang",
    "💯": "100",
    "🔅": "low_brightness",
    "🔆": "high_brightness",
    "🔱": "trident",
    "⚜": "fleur_de_lis",
    "〽": "part_alternation_mark",
    "⚠": "warning",
    "🚸": "children_crossing",
    "🔰": "beginner",
    "♻": "recycle",
    "🈯": "u6307",
    "💹": "chart",
    "❇": "sparkle",
    "✳": "eight_spoked_asterisk",
    "❎": "negative_squared_cross_mark",
    "✅": "white_check_mark",
    "💠": "diamond_shape_with_a_dot_inside",
    "🌀": "cyclone",
    "➿": "loop",
    "🌐": "globe_with_meridians",
    "Ⓜ": "m",
    "🏧": "atm",
    "🈂": "sa",
    "🛂": "passport_control",
    "🛃": "customs",
    "🛄": "baggage_claim",
    "🛅": "left_luggage",
    "♿": "wheelchair",
    "🚭": "no_smoking",
    "🚾": "wc",
    "🅿": "parking",
    "🚰": "potable_water",
    "🚹": "mens",
    "🚺": "womens",
    "🚼": "baby_symbol",
    "🚻": "restroom",
    "🚮": "put_litter_in_its_place",
    "🎦": "cinema",
    "📶": "signal_strength",
    "🈁": "koko",
    "🆖": "ng",
    "🆗": "ok",
    "🆙": "up",
    "🆒": "cool",
    "🆕": "new",
    "🆓": "free",
    "0️⃣": "zero",
    "1️⃣": "one",
    "2️⃣": "two",
    "3️⃣": "three",
    "4️⃣": "four",
    "5️⃣": "five",
    "6️⃣": "six",
    "7️⃣": "seven",
    "8️⃣": "eight",
    "9️⃣": "nine",
    "🔟": "keycap_ten",
    "*️⃣": "asterisk",
    "🔢": "1234",
    "▶": "arrow_forward",
    "⏸": "pause_button",
    "⏭": "next_track_button",
    "⏹": "stop_button",
    "⏺": "record_button",
    "⏯": "play_or_pause_button",
    "⏮": "previous_track_button",
    "⏩": "fast_forward",
    "⏪": "rewind",
    "🔀": "twisted_rightwards_arrows",
    "🔁": "repeat",
    "🔂": "repeat_one",
    "◀": "arrow_backward",
    "🔼": "arrow_up_small",
    "🔽": "arrow_down_small",
    "⏫": "arrow_double_up",
    "⏬": "arrow_double_down",
    "➡": "arrow_right",
    "⬅": "arrow_left",
    "⬆": "arrow_up",
    "⬇": "arrow_down",
    "↗": "arrow_upper_right",
    "↘": "arrow_lower_right",
    "↙": "arrow_lower_left",
    "↖": "arrow_upper_left",
    "↕": "arrow_up_down",
    "🔄": "arrows_counterclockwise",
    "↪": "arrow_right_hook",
    "↩": "leftwards_arrow_with_hook",
    "⤴": "arrow_heading_up",
    "⤵": "arrow_heading_down",
    "#️⃣": "hash",
    ℹ: "information_source",
    "🔤": "abc",
    "🔡": "abcd",
    "🔠": "capital_abcd",
    "🔣": "symbols",
    "🎵": "musical_note",
    "🎶": "notes",
    "〰": "wavy_dash",
    "➰": "curly_loop",
    "✔": "heavy_check_mark",
    "🔃": "arrows_clockwise",
    "➕": "heavy_plus_sign",
    "➖": "heavy_minus_sign",
    "➗": "heavy_division_sign",
    "✖": "heavy_multiplication_x",
    "💲": "heavy_dollar_sign",
    "💱": "currency_exchange",
    "🔚": "end",
    "🔙": "back",
    "🔛": "on",
    "🔝": "top",
    "🔜": "soon",
    "☑": "ballot_box_with_check",
    "🔘": "radio_button",
    "⚪": "white_circle",
    "⚫": "black_circle",
    "🔴": "red_circle",
    "🔵": "large_blue_circle",
    "🔸": "small_orange_diamond",
    "🔹": "small_blue_diamond",
    "🔶": "large_orange_diamond",
    "🔷": "large_blue_diamond",
    "🔺": "small_red_triangle",
    "▪": "black_small_square",
    "▫": "white_small_square",
    "⬛": "black_large_square",
    "⬜": "white_large_square",
    "🔻": "small_red_triangle_down",
    "◼": "black_medium_square",
    "◻": "white_medium_square",
    "◾": "black_medium_small_square",
    "◽": "white_medium_small_square",
    "🔲": "black_square_button",
    "🔳": "white_square_button",
    "🔈": "speaker",
    "🔉": "sound",
    "🔊": "loud_sound",
    "🔇": "mute",
    "📣": "mega",
    "📢": "loudspeaker",
    "🔔": "bell",
    "🔕": "no_bell",
    "🃏": "black_joker",
    "🀄": "mahjong",
    "♠": "spades",
    "♣": "clubs",
    "♦": "diamonds",
    "🎴": "flower_playing_cards",
    "💭": "thought_balloon",
    "🗯": "right_anger_bubble",
    "💬": "speech_balloon",
    "🗨": "left_speech_bubble",
    "🕐": "clock1",
    "🕑": "clock2",
    "🕒": "clock3",
    "🕓": "clock4",
    "🕔": "clock5",
    "🕕": "clock6",
    "🕖": "clock7",
    "🕗": "clock8",
    "🕘": "clock9",
    "🕙": "clock10",
    "🕚": "clock11",
    "🕛": "clock12",
    "🕜": "clock130",
    "🕝": "clock230",
    "🕞": "clock330",
    "🕟": "clock430",
    "🕠": "clock530",
    "🕡": "clock630",
    "🕢": "clock730",
    "🕣": "clock830",
    "🕤": "clock930",
    "🕥": "clock1030",
    "🕦": "clock1130",
    "🕧": "clock1230",
    "🇦🇫": "afghanistan",
    "🇦🇽": "aland_islands",
    "🇦🇱": "albania",
    "🇩🇿": "algeria",
    "🇦🇸": "american_samoa",
    "🇦🇩": "andorra",
    "🇦🇴": "angola",
    "🇦🇮": "anguilla",
    "🇦🇶": "antarctica",
    "🇦🇬": "antigua_barbuda",
    "🇦🇷": "argentina",
    "🇦🇲": "armenia",
    "🇦🇼": "aruba",
    "🇦🇺": "australia",
    "🇦🇹": "austria",
    "🇦🇿": "azerbaijan",
    "🇧🇸": "bahamas",
    "🇧🇭": "bahrain",
    "🇧🇩": "bangladesh",
    "🇧🇧": "barbados",
    "🇧🇾": "belarus",
    "🇧🇪": "belgium",
    "🇧🇿": "belize",
    "🇧🇯": "benin",
    "🇧🇲": "bermuda",
    "🇧🇹": "bhutan",
    "🇧🇴": "bolivia",
    "🇧🇶": "caribbean_netherlands",
    "🇧🇦": "bosnia_herzegovina",
    "🇧🇼": "botswana",
    "🇧🇷": "brazil",
    "🇮🇴": "british_indian_ocean_territory",
    "🇻🇬": "british_virgin_islands",
    "🇧🇳": "brunei",
    "🇧🇬": "bulgaria",
    "🇧🇫": "burkina_faso",
    "🇧🇮": "burundi",
    "🇨🇻": "cape_verde",
    "🇰🇭": "cambodia",
    "🇨🇲": "cameroon",
    "🇨🇦": "canada",
    "🇮🇨": "canary_islands",
    "🇰🇾": "cayman_islands",
    "🇨🇫": "central_african_republic",
    "🇹🇩": "chad",
    "🇨🇱": "chile",
    "🇨🇳": "cn",
    "🇨🇽": "christmas_island",
    "🇨🇨": "cocos_islands",
    "🇨🇴": "colombia",
    "🇰🇲": "comoros",
    "🇨🇬": "congo_brazzaville",
    "🇨🇩": "congo_kinshasa",
    "🇨🇰": "cook_islands",
    "🇨🇷": "costa_rica",
    "🇭🇷": "croatia",
    "🇨🇺": "cuba",
    "🇨🇼": "curacao",
    "🇨🇾": "cyprus",
    "🇨🇿": "czech_republic",
    "🇩🇰": "denmark",
    "🇩🇯": "djibouti",
    "🇩🇲": "dominica",
    "🇩🇴": "dominican_republic",
    "🇪🇨": "ecuador",
    "🇪🇬": "egypt",
    "🇸🇻": "el_salvador",
    "🇬🇶": "equatorial_guinea",
    "🇪🇷": "eritrea",
    "🇪🇪": "estonia",
    "🇪🇹": "ethiopia",
    "🇪🇺": "eu",
    "🇫🇰": "falkland_islands",
    "🇫🇴": "faroe_islands",
    "🇫🇯": "fiji",
    "🇫🇮": "finland",
    "🇫🇷": "fr",
    "🇬🇫": "french_guiana",
    "🇵🇫": "french_polynesia",
    "🇹🇫": "french_southern_territories",
    "🇬🇦": "gabon",
    "🇬🇲": "gambia",
    "🇬🇪": "georgia",
    "🇩🇪": "de",
    "🇬🇭": "ghana",
    "🇬🇮": "gibraltar",
    "🇬🇷": "greece",
    "🇬🇱": "greenland",
    "🇬🇩": "grenada",
    "🇬🇵": "guadeloupe",
    "🇬🇺": "guam",
    "🇬🇹": "guatemala",
    "🇬🇬": "guernsey",
    "🇬🇳": "guinea",
    "🇬🇼": "guinea_bissau",
    "🇬🇾": "guyana",
    "🇭🇹": "haiti",
    "🇭🇳": "honduras",
    "🇭🇰": "hong_kong",
    "🇭🇺": "hungary",
    "🇮🇸": "iceland",
    "🇮🇳": "india",
    "🇮🇩": "indonesia",
    "🇮🇷": "iran",
    "🇮🇶": "iraq",
    "🇮🇪": "ireland",
    "🇮🇲": "isle_of_man",
    "🇮🇱": "israel",
    "🇮🇹": "it",
    "🇨🇮": "cote_divoire",
    "🇯🇲": "jamaica",
    "🇯🇵": "jp",
    "🇯🇪": "jersey",
    "🇯🇴": "jordan",
    "🇰🇿": "kazakhstan",
    "🇰🇪": "kenya",
    "🇰🇮": "kiribati",
    "🇽🇰": "kosovo",
    "🇰🇼": "kuwait",
    "🇰🇬": "kyrgyzstan",
    "🇱🇦": "laos",
    "🇱🇻": "latvia",
    "🇱🇧": "lebanon",
    "🇱🇸": "lesotho",
    "🇱🇷": "liberia",
    "🇱🇾": "libya",
    "🇱🇮": "liechtenstein",
    "🇱🇹": "lithuania",
    "🇱🇺": "luxembourg",
    "🇲🇴": "macau",
    "🇲🇰": "macedonia",
    "🇲🇬": "madagascar",
    "🇲🇼": "malawi",
    "🇲🇾": "malaysia",
    "🇲🇻": "maldives",
    "🇲🇱": "mali",
    "🇲🇹": "malta",
    "🇲🇭": "marshall_islands",
    "🇲🇶": "martinique",
    "🇲🇷": "mauritania",
    "🇲🇺": "mauritius",
    "🇾🇹": "mayotte",
    "🇲🇽": "mexico",
    "🇫🇲": "micronesia",
    "🇲🇩": "moldova",
    "🇲🇨": "monaco",
    "🇲🇳": "mongolia",
    "🇲🇪": "montenegro",
    "🇲🇸": "montserrat",
    "🇲🇦": "morocco",
    "🇲🇿": "mozambique",
    "🇲🇲": "myanmar",
    "🇳🇦": "namibia",
    "🇳🇷": "nauru",
    "🇳🇵": "nepal",
    "🇳🇱": "netherlands",
    "🇳🇨": "new_caledonia",
    "🇳🇿": "new_zealand",
    "🇳🇮": "nicaragua",
    "🇳🇪": "niger",
    "🇳🇬": "nigeria",
    "🇳🇺": "niue",
    "🇳🇫": "norfolk_island",
    "🇲🇵": "northern_mariana_islands",
    "🇰🇵": "north_korea",
    "🇳🇴": "norway",
    "🇴🇲": "oman",
    "🇵🇰": "pakistan",
    "🇵🇼": "palau",
    "🇵🇸": "palestinian_territories",
    "🇵🇦": "panama",
    "🇵🇬": "papua_new_guinea",
    "🇵🇾": "paraguay",
    "🇵🇪": "peru",
    "🇵🇭": "philippines",
    "🇵🇳": "pitcairn_islands",
    "🇵🇱": "poland",
    "🇵🇹": "portugal",
    "🇵🇷": "puerto_rico",
    "🇶🇦": "qatar",
    "🇷🇪": "reunion",
    "🇷🇴": "romania",
    "🇷🇺": "ru",
    "🇷🇼": "rwanda",
    "🇧🇱": "st_barthelemy",
    "🇸🇭": "st_helena",
    "🇰🇳": "st_kitts_nevis",
    "🇱🇨": "st_lucia",
    "🇵🇲": "st_pierre_miquelon",
    "🇻🇨": "st_vincent_grenadines",
    "🇼🇸": "samoa",
    "🇸🇲": "san_marino",
    "🇸🇹": "sao_tome_principe",
    "🇸🇦": "saudi_arabia",
    "🇸🇳": "senegal",
    "🇷🇸": "serbia",
    "🇸🇨": "seychelles",
    "🇸🇱": "sierra_leone",
    "🇸🇬": "singapore",
    "🇸🇽": "sint_maarten",
    "🇸🇰": "slovakia",
    "🇸🇮": "slovenia",
    "🇸🇧": "solomon_islands",
    "🇸🇴": "somalia",
    "🇿🇦": "south_africa",
    "🇬🇸": "south_georgia_south_sandwich_islands",
    "🇰🇷": "kr",
    "🇸🇸": "south_sudan",
    "🇪🇸": "es",
    "🇱🇰": "sri_lanka",
    "🇸🇩": "sudan",
    "🇸🇷": "suriname",
    "🇸🇿": "swaziland",
    "🇸🇪": "sweden",
    "🇨🇭": "switzerland",
    "🇸🇾": "syria",
    "🇹🇼": "taiwan",
    "🇹🇯": "tajikistan",
    "🇹🇿": "tanzania",
    "🇹🇭": "thailand",
    "🇹🇱": "timor_leste",
    "🇹🇬": "togo",
    "🇹🇰": "tokelau",
    "🇹🇴": "tonga",
    "🇹🇹": "trinidad_tobago",
    "🇹🇳": "tunisia",
    "🇹🇷": "tr",
    "🇹🇲": "turkmenistan",
    "🇹🇨": "turks_caicos_islands",
    "🇹🇻": "tuvalu",
    "🇺🇬": "uganda",
    "🇺🇦": "ukraine",
    "🇦🇪": "united_arab_emirates",
    "🇬🇧": "uk",
    "🇺🇸": "us",
    "🇻🇮": "us_virgin_islands",
    "🇺🇾": "uruguay",
    "🇺🇿": "uzbekistan",
    "🇻🇺": "vanuatu",
    "🇻🇦": "vatican_city",
    "🇻🇪": "venezuela",
    "🇻🇳": "vietnam",
    "🇼🇫": "wallis_futuna",
    "🇪🇭": "western_sahara",
    "🇾🇪": "yemen",
    "🇿🇲": "zambia",
    "🇿🇼": "zimbabwe",
    "🤩": "star_struck",
    "🤨": "face_with_raised_eyebrow",
    "🤯": "exploding_head",
    "🤪": "crazy_face",
    "🤬": "face_with_symbols_over_mouth",
    "🤮": "face_vomiting",
    "🤫": "shushing_face",
    "🤭": "face_with_hand_over_mouth",
    "🧐": "face_with_monocle",
    "🧒": "child",
    "🧒🏻": "child:t2",
    "🧒🏼": "child:t3",
    "🧒🏽": "child:t4",
    "🧒🏾": "child:t5",
    "🧒🏿": "child:t6",
    "🧑": "adult",
    "🧑🏻": "adult:t2",
    "🧑🏼": "adult:t3",
    "🧑🏽": "adult:t4",
    "🧑🏾": "adult:t5",
    "🧑🏿": "adult:t6",
    "🧓": "older_adult",
    "🧓🏻": "older_adult:t2",
    "🧓🏼": "older_adult:t3",
    "🧓🏽": "older_adult:t4",
    "🧓🏾": "older_adult:t5",
    "🧓🏿": "older_adult:t6",
    "🧕": "woman_with_headscarf",
    "🧕🏻": "woman_with_headscarf:t2",
    "🧕🏼": "woman_with_headscarf:t3",
    "🧕🏽": "woman_with_headscarf:t4",
    "🧕🏾": "woman_with_headscarf:t5",
    "🧕🏿": "woman_with_headscarf:t6",
    "🧔": "bearded_person",
    "🧔🏻": "bearded_person:t2",
    "🧔🏼": "bearded_person:t3",
    "🧔🏽": "bearded_person:t4",
    "🧔🏾": "bearded_person:t5",
    "🧔🏿": "bearded_person:t6",
    "🤱": "breast_feeding",
    "🤱🏻": "breast_feeding:t2",
    "🤱🏼": "breast_feeding:t3",
    "🤱🏽": "breast_feeding:t4",
    "🤱🏾": "breast_feeding:t5",
    "🤱🏿": "breast_feeding:t6",
    "🧙": "mage",
    "🧙🏻": "mage:t2",
    "🧙🏼": "mage:t3",
    "🧙🏽": "mage:t4",
    "🧙🏾": "mage:t5",
    "🧙🏿": "mage:t6",
    "🧙‍♀️": "woman_mage",
    "🧙🏻‍♀️": "woman_mage:t2",
    "🧙🏼‍♀️": "woman_mage:t3",
    "🧙🏽‍♀️": "woman_mage:t4",
    "🧙🏾‍♀️": "woman_mage:t5",
    "🧙🏿‍♀️": "woman_mage:t6",
    "🧚": "fairy",
    "🧚🏻": "fairy:t2",
    "🧚🏼": "fairy:t3",
    "🧚🏽": "fairy:t4",
    "🧚🏾": "fairy:t5",
    "🧚🏿": "fairy:t6",
    "🧛": "vampire",
    "🧛🏻": "vampire:t2",
    "🧛🏼": "vampire:t3",
    "🧛🏽": "vampire:t4",
    "🧛🏾": "vampire:t5",
    "🧛🏿": "vampire:t6",
    "🧜": "mermaid",
    "🧜🏻": "mermaid:t2",
    "🧜🏼": "mermaid:t3",
    "🧜🏽": "mermaid:t4",
    "🧜🏾": "mermaid:t5",
    "🧜🏿": "mermaid:t6",
    "🧜‍♂️": "merman",
    "🧜🏻‍♂️": "merman:t2",
    "🧜🏼‍♂️": "merman:t3",
    "🧜🏽‍♂️": "merman:t4",
    "🧜🏾‍♂️": "merman:t5",
    "🧜🏿‍♂️": "merman:t6",
    "🧝": "elf",
    "🧝🏻": "elf:t2",
    "🧝🏼": "elf:t3",
    "🧝🏽": "elf:t4",
    "🧝🏾": "elf:t5",
    "🧝🏿": "elf:t6",
    "🧞": "genie",
    "🧞‍♀": "woman_genie",
    "🧟": "zombie",
    "🧟‍♀": "woman_zombie",
    "🧖": "person_in_steamy_room",
    "🧖🏻": "person_in_steamy_room:t2",
    "🧖🏼": "person_in_steamy_room:t3",
    "🧖🏽": "person_in_steamy_room:t4",
    "🧖🏾": "person_in_steamy_room:t5",
    "🧖🏿": "person_in_steamy_room:t6",
    "🧖‍♀️": "woman_in_steamy_room",
    "🧖🏻‍♀️": "woman_in_steamy_room:t2",
    "🧖🏼‍♀️": "woman_in_steamy_room:t3",
    "🧖🏽‍♀️": "woman_in_steamy_room:t4",
    "🧖🏾‍♀️": "woman_in_steamy_room:t5",
    "🧖🏿‍♀️": "woman_in_steamy_room:t6",
    "🧗": "person_climbing",
    "🧗🏻": "person_climbing:t2",
    "🧗🏼": "person_climbing:t3",
    "🧗🏽": "person_climbing:t4",
    "🧗🏾": "person_climbing:t5",
    "🧗🏿": "person_climbing:t6",
    "🧗‍♀️": "woman_climbing",
    "🧗🏻‍♀️": "woman_climbing:t2",
    "🧗🏼‍♀️": "woman_climbing:t3",
    "🧗🏽‍♀️": "woman_climbing:t4",
    "🧗🏾‍♀️": "woman_climbing:t5",
    "🧗🏿‍♀️": "woman_climbing:t6",
    "🧘": "person_in_lotus_position",
    "🧘🏻": "person_in_lotus_position:t2",
    "🧘🏼": "person_in_lotus_position:t3",
    "🧘🏽": "person_in_lotus_position:t4",
    "🧘🏾": "person_in_lotus_position:t5",
    "🧘🏿": "person_in_lotus_position:t6",
    "🧘‍♀️": "woman_in_lotus_position",
    "🧘🏻‍♀️": "woman_in_lotus_position:t2",
    "🧘🏼‍♀️": "woman_in_lotus_position:t3",
    "🧘🏽‍♀️": "woman_in_lotus_position:t4",
    "🧘🏾‍♀️": "woman_in_lotus_position:t5",
    "🧘🏿‍♀️": "woman_in_lotus_position:t6",
    "🤟": "love_you_gesture",
    "🤟🏻": "love_you_gesture:t2",
    "🤟🏼": "love_you_gesture:t3",
    "🤟🏽": "love_you_gesture:t4",
    "🤟🏾": "love_you_gesture:t5",
    "🤟🏿": "love_you_gesture:t6",
    "🤲": "palms_up_together",
    "🤲🏻": "palms_up_together:t2",
    "🤲🏼": "palms_up_together:t3",
    "🤲🏽": "palms_up_together:t4",
    "🤲🏾": "palms_up_together:t5",
    "🤲🏿": "palms_up_together:t6",
    "🧠": "brain",
    "🧡": "orange_heart",
    "🧣": "scarf",
    "🧤": "gloves",
    "🧥": "coat",
    "🧦": "socks",
    "🧢": "billed_cap",
    "🦓": "zebra",
    "🦒": "giraffe",
    "🦔": "hedgehog",
    "🦕": "sauropod",
    "🦖": "t_rex",
    "🦗": "cricket",
    "🥥": "coconut",
    "🥦": "broccoli",
    "🥨": "pretzel",
    "🥩": "cut_of_meat",
    "🥪": "sandwich",
    "🥣": "bowl_with_spoon",
    "🥫": "canned_food",
    "🥟": "dumpling",
    "🥠": "fortune_cookie",
    "🥡": "takeout_box",
    "🥧": "pie",
    "🥤": "cup_with_straw",
    "🥢": "chopsticks",
    "🛸": "flying_saucer",
    "🛷": "sled",
    "🥌": "curling_stone",
    "🇸🇯": "svalbard_and_jan_mayen",
    "🇲🇫": "st_martin",
    "🇺🇲": "us_outlying_islands",
    "🇹🇦": "tristan_da_cunha",
    "🇭🇲": "heard_and_mc_donald_islands",
    "🇪🇦": "ceuta_and_melilla",
    "🇩🇬": "diego_garcia",
    "🇦🇨": "ascension_island",
    "🇧🇻": "bouvet_island",
    "🇨🇵": "clipperton_island",
    "🇺🇳": "united_nations",
    "🥰": "smiling_face_with_three_hearts",
    "🥵": "hot_face",
    "🥶": "cold_face",
    "🥳": "partying_face",
    "🥴": "woozy_face",
    "🥺": "pleading_face",
    "👨‍🦰": "man_red_haired",
    "👨‍🦱": "man_curly_haired",
    "👨‍🦳": "man_white_haired",
    "👨‍🦲": "man_bald",
    "👩‍🦰": "woman_red_haired",
    "👩‍🦱": "woman_curly_haired",
    "👩‍🦳": "woman_white_haired",
    "👩‍🦲": "woman_bald",
    "🦸": "superhero",
    "🦸‍♂": "man_superhero",
    "🦸‍♀": "woman_superhero",
    "🦹": "supervillain",
    "🦹‍♀": "woman_supervillain",
    "🦹‍♂": "man_supervillain",
    "🦵": "leg",
    "🦶": "foot",
    "🦴": "bone",
    "🦷": "tooth",
    "🥽": "goggles",
    "🥼": "lab_coat",
    "🥾": "hiking_boot",
    "🥿": "flat_shoe",
    "🦝": "raccoon",
    "🦙": "llama",
    "🦛": "hippopotamus",
    "🦘": "kangaroo",
    "🦡": "badger",
    "🦢": "swan",
    "🦚": "peacock",
    "🦜": "parrot",
    "🦞": "lobster",
    "🦟": "mosquito",
    "🦠": "microbe",
    "🥭": "mango",
    "🥬": "leafy_green",
    "🥯": "bagel",
    "🧂": "salt",
    "🥮": "moon_cake",
    "🧁": "cupcake",
    "🧭": "compass",
    "🧱": "brick",
    "🛹": "skateboard",
    "🧳": "luggage",
    "🧨": "firecracker",
    "🧧": "red_gift_envelope",
    "🥎": "softball",
    "🥏": "flying_disc",
    "🥍": "lacrosse",
    "🧿": "nazar_amulet",
    "🧩": "jigsaw",
    "🧸": "teddy_bear",
    "♟": "chess_pawn",
    "🧵": "thread",
    "🧶": "yarn",
    "🧮": "abacus",
    "🧾": "receipt",
    "🧰": "toolbox",
    "🧲": "magnet",
    "🧪": "test_tube",
    "🧫": "petri_dish",
    "🧬": "dna",
    "🧴": "lotion_bottle",
    "🧷": "safety_pin",
    "🧹": "broom",
    "🧺": "basket",
    "🧻": "roll_of_toilet_paper",
    "🧼": "soap",
    "🧽": "sponge",
    "🧯": "fire_extinguisher",
    "♾": "infinity",
    "🏴‍☠": "pirate_flag",
    "🧇": "waffle",
    "🦦": "otter",
    "🦥": "sloth",
    "🧊": "ice_cube",
    "🪐": "ringer_planet",
    "🦩": "flamingo",
    "🥱": "yawning_face",
    "🤏": "pinching_hand",
    "🐕‍🦺": "service_dog",
    "🦧": "orangutan",
    "🛺": "auto_rickshaw",
    "🪂": "parachute",
    "🪀": "yo-yo",
    "🪁": "kite",
    "🟫": "brown_square",
    "🟪": "purple_square",
    "🟦": "blue_square",
    "🟩": "green_square",
    "🟨": "yellow_square",
    "🟧": "orange_square",
    "🟥": "red_square",
    "🟤": "brown_circle",
    "🟣": "purple_circle",
    "🟢": "green_circle",
    "🟡": "yellow_circle",
    "🟠": "orange_circle",
    "🪒": "razor",
    "🪑": "chair",
    "🩺": "stethoscope",
    "🩹": "adhesive_bandage",
    "🩸": "drop_of_blood",
    "🦯": "probing_cane",
    "🪓": "axe",
    "🪔": "diya_lamp",
    "🪕": "banjo",
    "🩰": "ballet_shoes",
    "🩳": "shorts",
    "🩲": "briefs",
    "🩱": "one_piece_swimsuit",
    "🥻": "sari",
    "🦺": "safety_vest",
    "🤿": "diving_mask",
    "🦼": "motorized_wheelchair",
    "🦽": "manual_wheelchair",
    "🛕": "hindu_temple",
    "🧉": "maté",
    "🧃": "beverage_box",
    "🦪": "oyster",
    "🧈": "butter",
    "🧆": "falafel",
    "🧅": "onion",
    "🧄": "garlic",
    "🦨": "skunk",
    "🦮": "guide_dog",
    "🧑‍🤝‍🧑": "people_holding_hands",
    "👩‍🦽": "woman_in_manual_wheelchair",
    "👨‍🦽": "man_in_manual_wheelchair",
    "👩‍🦼": "woman_in_motorized_wheelchair",
    "👨‍🦼": "man_in_motorized_wheelchair",
    "👩‍🦯": "woman_with_probing_cane",
    "👨‍🦯": "man_with_probing_cane",
    "🧎‍♀️": "woman_kneeling",
    "🧎‍♂️": "man_kneeling",
    "🧍‍♂️": "man_standing",
    "🧍‍♀️": "woman_standing",
    "🧏‍♀️": "deaf_woman",
    "🧏‍♂️": "deaf_man",
    "🦻": "hear_with_hearing_aid",
    "🦿": "mechanical_leg",
    "🦾": "mechanical_arm",
    "🤍": "white_heart",
    "🤎": "brown_heart",
    "🏳️‍⚧️": "transgender_flag",
    "☹️": "frowning",
    "☻": "slight_smile"
  };
  _exports.replacements = replacements;
});
define("pretty-text/emoji/version", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.IMAGE_VERSION = void 0;
  // DO NOT EDIT THIS FILE!!!
  // Update it by running `rake javascript:update_constants`
  var IMAGE_VERSION = "10";
  _exports.IMAGE_VERSION = IMAGE_VERSION;
});
define("pretty-text/emoji", ["exports", "pretty-text/emoji/data", "pretty-text/emoji/version"], function (_exports, _data, _version) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.registerEmoji = registerEmoji;
  _exports.extendedEmojiList = extendedEmojiList;
  _exports.performEmojiUnescape = performEmojiUnescape;
  _exports.performEmojiEscape = performEmojiEscape;
  _exports.isCustomEmoji = isCustomEmoji;
  _exports.buildEmojiUrl = buildEmojiUrl;
  _exports.emojiExists = emojiExists;
  _exports.emojiSearch = emojiSearch;
  _exports.isSkinTonableEmoji = isSkinTonableEmoji;
  _exports.emojiReplacementRegex = void 0;

  function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

  function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  var extendedEmoji = {};

  function registerEmoji(code, url, group) {
    code = code.toLowerCase();
    extendedEmoji[code] = {
      url: url,
      group: group
    };
  }

  function extendedEmojiList() {
    return extendedEmoji;
  }

  var emojiHash = {}; // https://github.com/mathiasbynens/emoji-regex/blob/main/text.js

  var emojiReplacementRegex = "\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67)\uDB40\uDC7F|(?:\uD83E\uDDD1\uD83C\uDFFF\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFC-\uDFFF])|\uD83D\uDC68(?:\uD83C\uDFFB(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|[\u2695\u2696\u2708]\uFE0F|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))?|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])\uFE0F|\u200D(?:(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D[\uDC66\uDC67])|\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC)?|(?:\uD83D\uDC69(?:\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69]))|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC69(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83E\uDDD1(?:\u200D(?:\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDE36\u200D\uD83C\uDF2B|\uD83C\uDFF3\uFE0F\u200D\u26A7|\uD83D\uDC3B\u200D\u2744|(?:(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\uD83C\uDFF4\u200D\u2620|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])\u200D[\u2640\u2642]|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u2600-\u2604\u260E\u2611\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26B0\u26B1\u26C8\u26CF\u26D1\u26D3\u26E9\u26F0\u26F1\u26F4\u26F7\u26F8\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u3030\u303D\u3297\u3299]|\uD83C[\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]|\uD83D[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3])\uFE0F|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDE35\u200D\uD83D\uDCAB|\uD83D\uDE2E\u200D\uD83D\uDCA8|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83E\uDDD1(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83D\uDC69(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF6\uD83C\uDDE6|\uD83C\uDDF4\uD83C\uDDF2|\uD83D\uDC08\u200D\u2B1B|\u2764\uFE0F\u200D(?:\uD83D\uDD25|\uD83E\uDE79)|\uD83D\uDC41\uFE0F|\uD83C\uDFF3\uFE0F|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|[#*0-9]\uFE0F\u20E3|\u2764\uFE0F|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|\uD83C\uDFF4|(?:[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270C\u270D]|\uD83D[\uDD74\uDD90])(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC08\uDC15\uDC3B\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE2E\uDE35\uDE36\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5]|\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD]|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF]|[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0D\uDD0E\uDD10-\uDD17\uDD1D\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78\uDD7A-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCB\uDDD0\uDDE0-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6]|(?:[#*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26A7\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5-\uDED7\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6]|\u263B|\u2661)\uFE0F?";
  _exports.emojiReplacementRegex = emojiReplacementRegex;

  function textEmojiRegex(inlineEmoji) {
    return inlineEmoji ? /:[^\s:]+(?::t\d)?:?/g : /\B:[^\s:]+(?::t\d)?:?\B/g;
  } // add all default emojis


  _data.emojis.forEach(function (code) {
    return emojiHash[code] = true;
  }); // and their aliases


  var aliasHash = {};
  Object.keys(_data.aliases).forEach(function (name) {
    _data.aliases[name].forEach(function (alias) {
      return aliasHash[alias] = name;
    });
  });

  function isReplacableInlineEmoji(string, index, inlineEmoji) {
    if (inlineEmoji) {
      return true;
    } // index depends on regex; when `inlineEmoji` is false, the regex starts
    // with a `\B` character, so there's no need to subtract from the index


    var beforeEmoji = string.slice(0, index);
    return beforeEmoji.length === 0 || /(?:\s|[>.,\/#!$%^&*;:{}=\-_`~()])$/.test(beforeEmoji) || new RegExp("(?:".concat(emojiReplacementRegex, ")$"), "g").test(beforeEmoji);
  }

  function performEmojiUnescape(string, opts) {
    if (!string) {
      return;
    }

    var allTranslations = Object.assign({}, _data.translations, opts.customEmojiTranslation || {});

    var replacementFunction = function replacementFunction(m, index) {
      var isEmoticon = opts.enableEmojiShortcuts && !!allTranslations[m];
      var isUnicodeEmoticon = !!_data.replacements[m];
      var emojiVal;

      if (isEmoticon) {
        emojiVal = allTranslations[m];
      } else if (isUnicodeEmoticon) {
        emojiVal = _data.replacements[m];
      } else {
        emojiVal = m.slice(1, m.length - 1);
      }

      var hasEndingColon = m.lastIndexOf(":") === m.length - 1;
      var url = buildEmojiUrl(emojiVal, opts);
      var classes = isCustomEmoji(emojiVal, opts) ? "emoji emoji-custom" : "emoji";

      if (opts.class) {
        classes = "".concat(classes, " ").concat(opts.class);
      }

      var isReplacable = (isEmoticon || hasEndingColon || isUnicodeEmoticon) && isReplacableInlineEmoji(string, index, opts.inlineEmoji);
      return url && isReplacable ? "<img width=\"20\" height=\"20\" src='".concat(url, "' ").concat(opts.skipTitle ? "" : "title='".concat(emojiVal, "'"), " ").concat(opts.lazy ? "loading='lazy' " : "", "alt='").concat(emojiVal, "' class='").concat(classes, "'>") : m;
    };

    return string.replace(new RegExp(emojiReplacementRegex, "g"), replacementFunction).replace(textEmojiRegex(opts.inlineEmoji), replacementFunction);
  }

  function performEmojiEscape(string, opts) {
    var allTranslations = Object.assign({}, _data.translations, opts.customEmojiTranslation || {});

    var replacementFunction = function replacementFunction(m, index) {
      if (isReplacableInlineEmoji(string, index, opts.inlineEmoji)) {
        if (!!allTranslations[m]) {
          return opts.emojiShortcuts ? ":".concat(allTranslations[m], ":") : m;
        } else if (!!_data.replacements[m]) {
          return ":".concat(_data.replacements[m], ":");
        }
      }

      return m;
    };

    return string.replace(new RegExp(emojiReplacementRegex, "g"), replacementFunction).replace(textEmojiRegex(opts.inlineEmoji), replacementFunction);
  }

  function isCustomEmoji(code, opts) {
    code = code.toLowerCase();

    if (extendedEmoji.hasOwnProperty(code)) {
      return true;
    }

    if (opts && opts.customEmoji && opts.customEmoji.hasOwnProperty(code)) {
      return true;
    }

    return false;
  }

  function buildEmojiUrl(code, opts) {
    var url;
    code = String(code).toLowerCase();

    if (extendedEmoji.hasOwnProperty(code)) {
      url = extendedEmoji[code].url;
    }

    if (opts && opts.customEmoji && opts.customEmoji[code]) {
      url = opts.customEmoji[code].url || opts.customEmoji[code];
    }

    var noToneMatch = code.match(/([^:]+):?/);
    var emojiBasePath = "/images/emoji";

    if (opts.emojiCDNUrl) {
      emojiBasePath = opts.emojiCDNUrl;
    }

    if (noToneMatch && !url && (emojiHash.hasOwnProperty(noToneMatch[1]) || aliasHash.hasOwnProperty(noToneMatch[1]))) {
      url = opts.getURL("".concat(emojiBasePath, "/").concat(opts.emojiSet, "/").concat(code.replace(/:t/, "/"), ".png"));
    }

    if (url) {
      url = url + "?v=" + _version.IMAGE_VERSION;
    }

    return url;
  }

  function emojiExists(code) {
    code = code.toLowerCase();
    return !!(extendedEmoji.hasOwnProperty(code) || emojiHash.hasOwnProperty(code) || aliasHash.hasOwnProperty(code));
  }

  var toSearch;

  function emojiSearch(term, options) {
    var maxResults = options && options["maxResults"] || -1;
    var diversity = options && options.diversity;

    if (maxResults === 0) {
      return [];
    }

    toSearch = toSearch || [].concat(_toConsumableArray(Object.keys(emojiHash)), _toConsumableArray(Object.keys(extendedEmoji)), _toConsumableArray(Object.keys(aliasHash))).sort();
    var results = [];

    function addResult(t) {
      var val = aliasHash[t] || t;

      if (results.indexOf(val) === -1) {
        if (diversity && diversity > 1 && isSkinTonableEmoji(val)) {
          results.push("".concat(val, ":t").concat(diversity));
        } else {
          results.push(val);
        }
      }
    } // if term matches from beginning


    for (var i = 0; i < toSearch.length; i++) {
      var item = toSearch[i];

      if (item.indexOf(term) === 0) {
        addResult(item);
      }
    }

    if (_data.searchAliases[term]) {
      results.push.apply(results, _data.searchAliases[term]);
    }

    for (var _i = 0; _i < toSearch.length; _i++) {
      var _item = toSearch[_i];

      if (_item.indexOf(term) > 0) {
        addResult(_item);
      }
    }

    if (maxResults === -1) {
      return results;
    } else {
      return results.slice(0, maxResults);
    }
  }

  function isSkinTonableEmoji(term) {
    var match = term.split(":").filter(Boolean)[0];

    if (match) {
      return _data.tonableEmojis.indexOf(match) !== -1;
    }

    return false;
  }
});
define("pretty-text/engines/discourse-markdown-it", ["exports", "pretty-text/allow-lister", "discourse-common/lib/deprecated", "pretty-text/guid", "pretty-text/sanitizer"], function (_exports, _allowLister, _deprecated, _guid, _sanitizer) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.extractDataAttribute = extractDataAttribute;
  _exports.setup = setup;
  _exports.cook = cook;
  _exports.ATTACHMENT_CSS_CLASS = void 0;

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

  function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  var ATTACHMENT_CSS_CLASS = "attachment";
  _exports.ATTACHMENT_CSS_CLASS = ATTACHMENT_CSS_CLASS;

  function deprecate(feature, name) {
    return function () {
      if (window.console && window.console.log) {
        window.console.log(feature + ": " + name + " is deprecated, please use the new markdown it APIs");
      }
    };
  }

  function createHelper(featureName, opts, optionCallbacks, pluginCallbacks, getOptions, allowListed) {
    var helper = {};
    helper.markdownIt = true;

    helper.allowList = function (info) {
      return allowListed.push([featureName, info]);
    };

    helper.whiteList = function (info) {
      (0, _deprecated.default)("`whiteList` has been replaced with `allowList`", {
        since: "2.6.0.beta.4",
        dropFrom: "2.7.0"
      });
      helper.allowList(info);
    };

    helper.registerInline = deprecate(featureName, "registerInline");
    helper.replaceBlock = deprecate(featureName, "replaceBlock");
    helper.addPreProcessor = deprecate(featureName, "addPreProcessor");
    helper.inlineReplace = deprecate(featureName, "inlineReplace");
    helper.postProcessTag = deprecate(featureName, "postProcessTag");
    helper.inlineRegexp = deprecate(featureName, "inlineRegexp");
    helper.inlineBetween = deprecate(featureName, "inlineBetween");
    helper.postProcessText = deprecate(featureName, "postProcessText");
    helper.onParseNode = deprecate(featureName, "onParseNode");
    helper.registerBlock = deprecate(featureName, "registerBlock"); // hack to allow moving of getOptions

    helper.getOptions = function () {
      return getOptions.f();
    };

    helper.registerOptions = function (callback) {
      optionCallbacks.push([featureName, callback]);
    };

    helper.registerPlugin = function (callback) {
      pluginCallbacks.push([featureName, callback]);
    };

    return helper;
  } // TODO we may just use a proper ruler from markdown it... this is a basic proxy


  var Ruler = /*#__PURE__*/function () {
    function Ruler() {
      _classCallCheck(this, Ruler);

      this.rules = [];
    }

    _createClass(Ruler, [{
      key: "getRules",
      value: function getRules() {
        return this.rules;
      }
    }, {
      key: "getRuleForTag",
      value: function getRuleForTag(tag) {
        this.ensureCache();

        if (this.cache.hasOwnProperty(tag)) {
          return this.cache[tag];
        }
      }
    }, {
      key: "ensureCache",
      value: function ensureCache() {
        if (this.cache) {
          return;
        }

        this.cache = {};

        for (var i = this.rules.length - 1; i >= 0; i--) {
          var info = this.rules[i];
          this.cache[info.rule.tag] = info;
        }
      }
    }, {
      key: "push",
      value: function push(name, rule) {
        this.rules.push({
          name: name,
          rule: rule
        });
        this.cache = null;
      }
    }]);

    return Ruler;
  }(); // block bb code ruler for parsing of quotes / code / polls


  function setupBlockBBCode(md) {
    md.block.bbcode = {
      ruler: new Ruler()
    };
  }

  function setupInlineBBCode(md) {
    md.inline.bbcode = {
      ruler: new Ruler()
    };
  }

  function setupTextPostProcessRuler(md) {
    var TextPostProcessRuler = requirejs("pretty-text/engines/discourse-markdown/text-post-process").TextPostProcessRuler;
    md.core.textPostProcess = {
      ruler: new TextPostProcessRuler()
    };
  }

  function renderHoisted(tokens, idx, options) {
    var content = tokens[idx].content;

    if (content && content.length > 0) {
      var id = (0, _guid.default)();
      options.discourse.hoisted[id] = tokens[idx].content;
      return id;
    } else {
      return "";
    }
  }

  function setupUrlDecoding(md) {
    // this fixed a subtle issue where %20 is decoded as space in
    // automatic urls
    md.utils.lib.mdurl.decode.defaultChars = ";/?:@&=+$,# ";
  }

  function setupHoister(md) {
    md.renderer.rules.html_raw = renderHoisted;
  }

  function extractDataAttribute(str) {
    var sep = str.indexOf("=");

    if (sep === -1) {
      return null;
    }

    var key = "data-".concat(str.substr(0, sep)).toLowerCase();

    if (!/^[A-Za-z]+[\w\-\:\.]*$/.test(key)) {
      return null;
    }

    var value = str.substr(sep + 1);
    return [key, value];
  } // videoHTML and audioHTML follow the same HTML syntax
  // as oneboxer.rb when dealing with these formats


  function videoHTML(token) {
    var src = token.attrGet("src");
    var origSrc = token.attrGet("data-orig-src");
    var dataOrigSrcAttr = origSrc !== null ? "data-orig-src=\"".concat(origSrc, "\"") : "";
    return "<div class=\"video-container\">\n    <video width=\"100%\" height=\"100%\" preload=\"metadata\" controls>\n      <source src=\"".concat(src, "\" ").concat(dataOrigSrcAttr, ">\n      <a href=\"").concat(src, "\">").concat(src, "</a>\n    </video>\n  </div>");
  }

  function audioHTML(token) {
    var src = token.attrGet("src");
    var origSrc = token.attrGet("data-orig-src");
    var dataOrigSrcAttr = origSrc !== null ? "data-orig-src=\"".concat(origSrc, "\"") : "";
    return "<audio preload=\"metadata\" controls>\n    <source src=\"".concat(src, "\" ").concat(dataOrigSrcAttr, ">\n    <a href=\"").concat(src, "\">").concat(src, "</a>\n  </audio>");
  }

  var IMG_SIZE_REGEX = /^([1-9]+[0-9]*)x([1-9]+[0-9]*)(\s*,\s*(x?)([1-9][0-9]{0,2}?)([%x]?))?$/;

  function renderImageOrPlayableMedia(tokens, idx, options, env, slf) {
    var token = tokens[idx];
    var alt = slf.renderInlineAsText(token.children, options, env);
    var split = alt.split("|");
    var altSplit = [split[0]]; // markdown-it supports returning HTML instead of continuing to render the current token
    // see https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md#renderer
    // handles |video and |audio alt transformations for image tags

    if (split[1] === "video") {
      if (options.discourse.previewing) {
        return "<div class=\"onebox-placeholder-container\">\n        <span class=\"placeholder-icon video\"></span>\n      </div>";
      } else {
        return videoHTML(token);
      }
    } else if (split[1] === "audio") {
      return audioHTML(token);
    } // parsing ![myimage|500x300]() or ![myimage|75%]() or ![myimage|500x300, 75%]


    for (var i = 1, match, data; i < split.length; ++i) {
      if ((match = split[i].match(IMG_SIZE_REGEX)) && match[1] && match[2]) {
        var width = match[1];
        var height = match[2]; // calculate using percentage

        if (match[5] && match[6] && match[6] === "%") {
          var percent = parseFloat(match[5]) / 100.0;
          width = parseInt(width * percent, 10);
          height = parseInt(height * percent, 10);
        } // calculate using only given width


        if (match[5] && match[6] && match[6] === "x") {
          var wr = parseFloat(match[5]) / width;
          width = parseInt(match[5], 10);
          height = parseInt(height * wr, 10);
        } // calculate using only given height


        if (match[5] && match[4] && match[4] === "x" && !match[6]) {
          var hr = parseFloat(match[5]) / height;
          height = parseInt(match[5], 10);
          width = parseInt(width * hr, 10);
        }

        if (token.attrIndex("width") === -1) {
          token.attrs.push(["width", width]);
        }

        if (token.attrIndex("height") === -1) {
          token.attrs.push(["height", height]);
        }

        if (options.discourse.previewing && match[6] !== "x" && match[4] !== "x") {
          token.attrs.push(["class", "resizable"]);
        }
      } else if (data = extractDataAttribute(split[i])) {
        token.attrs.push(data);
      } else if (split[i] === "thumbnail") {
        token.attrs.push(["data-thumbnail", "true"]);
      } else {
        altSplit.push(split[i]);
      }
    }

    token.attrs[token.attrIndex("alt")][1] = altSplit.join("|");
    return slf.renderToken(tokens, idx, options);
  } // we have taken over the ![]() syntax in markdown to
  // be able to render a video or audio URL as well as the
  // image using |video and |audio in the text inside []


  function setupImageAndPlayableMediaRenderer(md) {
    md.renderer.rules.image = renderImageOrPlayableMedia;
  }

  function renderAttachment(tokens, idx, options, env, slf) {
    var linkToken = tokens[idx];
    var textToken = tokens[idx + 1];
    var split = textToken.content.split("|");
    var contentSplit = [];

    for (var i = 0, data; i < split.length; ++i) {
      if (split[i] === ATTACHMENT_CSS_CLASS) {
        linkToken.attrs.unshift(["class", split[i]]);
      } else if (data = extractDataAttribute(split[i])) {
        linkToken.attrs.push(data);
      } else {
        contentSplit.push(split[i]);
      }
    }

    if (contentSplit.length > 0) {
      textToken.content = contentSplit.join("|");
    }

    return slf.renderToken(tokens, idx, options);
  }

  function setupAttachments(md) {
    md.renderer.rules.link_open = renderAttachment;
  }

  var Helpers;

  function setup(opts, siteSettings, state) {
    if (opts.setup) {
      return;
    } // we got to require this late cause bundle is not loaded in pretty-text


    Helpers = Helpers || requirejs("pretty-text/engines/discourse-markdown/helpers");
    opts.markdownIt = true;
    var optionCallbacks = [];
    var pluginCallbacks = []; // ideally I would like to change the top level API a bit, but in the mean time this will do

    var getOptions = {
      f: function f() {
        return opts;
      }
    };
    var check = /discourse-markdown\/|markdown-it\//;
    var features = [];
    var allowListed = [];
    Object.keys(require._eak_seen).forEach(function (entry) {
      if (check.test(entry)) {
        var module = requirejs(entry);

        if (module && module.setup) {
          var id = entry.split("/").reverse()[0];
          var priority = module.priority || 0;
          features.unshift({
            id: id,
            setup: module.setup,
            priority: priority
          });
        }
      }
    });
    features.sort(function (a, b) {
      return a.priority - b.priority;
    }).forEach(function (f) {
      f.setup(createHelper(f.id, opts, optionCallbacks, pluginCallbacks, getOptions, allowListed));
    });
    Object.entries(state.allowListed || {}).forEach(function (entry) {
      allowListed.push(entry);
    });
    optionCallbacks.forEach(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
          callback = _ref2[1];

      callback(opts, siteSettings, state);
    }); // enable all features by default

    features.forEach(function (feature) {
      if (!opts.features.hasOwnProperty(feature.id)) {
        opts.features[feature.id] = true;
      }
    });
    var copy = {};
    Object.keys(opts).forEach(function (entry) {
      copy[entry] = opts[entry];
      delete opts[entry];
    });
    copy.helpers = {
      textReplace: Helpers.textReplace
    };
    opts.discourse = copy;

    getOptions.f = function () {
      return opts.discourse;
    };

    opts.discourse.limitedSiteSettings = {
      secureMedia: siteSettings.secure_media
    };
    opts.engine = window.markdownit({
      discourse: opts.discourse,
      html: true,
      breaks: opts.discourse.features.newline,
      xhtmlOut: false,
      linkify: siteSettings.enable_markdown_linkify,
      typographer: siteSettings.enable_markdown_typographer
    });
    var quotation_marks = siteSettings.markdown_typographer_quotation_marks;

    if (quotation_marks) {
      opts.engine.options.quotes = quotation_marks.split("|");
    }

    opts.engine.linkify.tlds((siteSettings.markdown_linkify_tlds || "").split("|"));
    setupUrlDecoding(opts.engine);
    setupHoister(opts.engine);
    setupImageAndPlayableMediaRenderer(opts.engine);
    setupAttachments(opts.engine);
    setupBlockBBCode(opts.engine);
    setupInlineBBCode(opts.engine);
    setupTextPostProcessRuler(opts.engine);
    pluginCallbacks.forEach(function (_ref3) {
      var _ref4 = _slicedToArray(_ref3, 2),
          feature = _ref4[0],
          callback = _ref4[1];

      if (opts.discourse.features[feature]) {
        opts.engine.use(callback);
      }
    }); // top level markdown it notifier

    opts.markdownIt = true;
    opts.setup = true;

    if (!opts.discourse.sanitizer || !opts.sanitizer) {
      var allowLister = new _allowLister.default(opts.discourse);
      allowListed.forEach(function (_ref5) {
        var _ref6 = _slicedToArray(_ref5, 2),
            feature = _ref6[0],
            info = _ref6[1];

        allowLister.allowListFeature(feature, info);
      });
      opts.sanitizer = opts.discourse.sanitizer = !!opts.discourse.sanitize ? function (a) {
        return (0, _sanitizer.sanitize)(a, allowLister);
      } : function (a) {
        return a;
      };
    }
  }

  function cook(raw, opts) {
    // we still have to hoist html_raw nodes so they bypass the allowlister
    // this is the case for oneboxes
    var hoisted = {};
    opts.discourse.hoisted = hoisted;
    var rendered = opts.engine.render(raw);
    var cooked = opts.discourse.sanitizer(rendered).trim();
    var keys = Object.keys(hoisted);

    if (keys.length) {
      var found = true;

      var unhoist = function unhoist(key) {
        cooked = cooked.replace(new RegExp(key, "g"), function () {
          found = true;
          return hoisted[key];
        });
      };

      while (found) {
        found = false;
        keys.forEach(unhoist);
      }
    }

    delete opts.discourse.hoisted;
    return cooked;
  }
});
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){var FilterCSS=require("cssfilter").FilterCSS;var _=require("./util");function getDefaultWhiteList(){return{a:["target","href","title"],abbr:["title"],address:[],area:["shape","coords","href","alt"],article:[],aside:[],audio:["autoplay","controls","loop","preload","src"],b:[],bdi:["dir"],bdo:["dir"],big:[],blockquote:["cite"],br:[],caption:[],center:[],cite:[],code:[],col:["align","valign","span","width"],colgroup:["align","valign","span","width"],dd:[],del:["datetime"],details:["open"],div:[],dl:[],dt:[],em:[],font:["color","size","face"],footer:[],h1:[],h2:[],h3:[],h4:[],h5:[],h6:[],header:[],hr:[],i:[],img:["src","alt","title","width","height"],ins:["datetime"],li:[],mark:[],nav:[],ol:[],p:[],pre:[],s:[],section:[],small:[],span:[],sub:[],sup:[],strong:[],table:["width","border","align","valign"],tbody:["align","valign"],td:["width","rowspan","colspan","align","valign"],tfoot:["align","valign"],th:["width","rowspan","colspan","align","valign"],thead:["align","valign"],tr:["rowspan","align","valign"],tt:[],u:[],ul:[],video:["autoplay","controls","loop","preload","src","height","width"]}}var defaultCSSFilter=new FilterCSS;function onTag(tag,html,options){}function onIgnoreTag(tag,html,options){}function onTagAttr(tag,name,value){}function onIgnoreTagAttr(tag,name,value){}function escapeHtml(html){return html.replace(REGEXP_LT,"&lt;").replace(REGEXP_GT,"&gt;")}function safeAttrValue(tag,name,value,cssFilter){cssFilter=cssFilter||defaultCSSFilter;value=friendlyAttrValue(value);if(name==="href"||name==="src"){value=_.trim(value);if(value==="#")return"#";if(!(value.substr(0,7)==="http://"||value.substr(0,8)==="https://"||value.substr(0,7)==="mailto:"||value[0]==="#"||value[0]==="/")){return""}}else if(name==="background"){REGEXP_DEFAULT_ON_TAG_ATTR_4.lastIndex=0;if(REGEXP_DEFAULT_ON_TAG_ATTR_4.test(value)){return""}}else if(name==="style"){REGEXP_DEFAULT_ON_TAG_ATTR_7.lastIndex=0;if(REGEXP_DEFAULT_ON_TAG_ATTR_7.test(value)){return""}REGEXP_DEFAULT_ON_TAG_ATTR_8.lastIndex=0;if(REGEXP_DEFAULT_ON_TAG_ATTR_8.test(value)){REGEXP_DEFAULT_ON_TAG_ATTR_4.lastIndex=0;if(REGEXP_DEFAULT_ON_TAG_ATTR_4.test(value)){return""}}value=cssFilter.process(value)}value=escapeAttrValue(value);return value}var REGEXP_LT=/</g;var REGEXP_GT=/>/g;var REGEXP_QUOTE=/"/g;var REGEXP_QUOTE_2=/&quot;/g;var REGEXP_ATTR_VALUE_1=/&#([a-zA-Z0-9]*);?/gim;var REGEXP_ATTR_VALUE_COLON=/&colon;?/gim;var REGEXP_ATTR_VALUE_NEWLINE=/&newline;?/gim;var REGEXP_DEFAULT_ON_TAG_ATTR_3=/\/\*|\*\//gm;var REGEXP_DEFAULT_ON_TAG_ATTR_4=/((j\s*a\s*v\s*a|v\s*b|l\s*i\s*v\s*e)\s*s\s*c\s*r\s*i\s*p\s*t\s*|m\s*o\s*c\s*h\s*a)\:/gi;var REGEXP_DEFAULT_ON_TAG_ATTR_5=/^[\s"'`]*(d\s*a\s*t\s*a\s*)\:/gi;var REGEXP_DEFAULT_ON_TAG_ATTR_6=/^[\s"'`]*(d\s*a\s*t\s*a\s*)\:\s*image\//gi;var REGEXP_DEFAULT_ON_TAG_ATTR_7=/e\s*x\s*p\s*r\s*e\s*s\s*s\s*i\s*o\s*n\s*\(.*/gi;var REGEXP_DEFAULT_ON_TAG_ATTR_8=/u\s*r\s*l\s*\(.*/gi;function escapeQuote(str){return str.replace(REGEXP_QUOTE,"&quot;")}function unescapeQuote(str){return str.replace(REGEXP_QUOTE_2,'"')}function escapeHtmlEntities(str){return str.replace(REGEXP_ATTR_VALUE_1,function replaceUnicode(str,code){return code[0]==="x"||code[0]==="X"?String.fromCharCode(parseInt(code.substr(1),16)):String.fromCharCode(parseInt(code,10))})}function escapeDangerHtml5Entities(str){return str.replace(REGEXP_ATTR_VALUE_COLON,":").replace(REGEXP_ATTR_VALUE_NEWLINE," ")}function clearNonPrintableCharacter(str){var str2="";for(var i=0,len=str.length;i<len;i++){str2+=str.charCodeAt(i)<32?" ":str.charAt(i)}return _.trim(str2)}function friendlyAttrValue(str){str=unescapeQuote(str);str=escapeHtmlEntities(str);str=escapeDangerHtml5Entities(str);str=clearNonPrintableCharacter(str);return str}function escapeAttrValue(str){str=escapeQuote(str);str=escapeHtml(str);return str}function onIgnoreTagStripAll(){return""}function StripTagBody(tags,next){if(typeof next!=="function"){next=function(){}}var isRemoveAllTag=!Array.isArray(tags);function isRemoveTag(tag){if(isRemoveAllTag)return true;return _.indexOf(tags,tag)!==-1}var removeList=[];var posStart=false;return{onIgnoreTag:function(tag,html,options){if(isRemoveTag(tag)){if(options.isClosing){var ret="[/removed]";var end=options.position+ret.length;removeList.push([posStart!==false?posStart:options.position,end]);posStart=false;return ret}else{if(!posStart){posStart=options.position}return"[removed]"}}else{return next(tag,html,options)}},remove:function(html){var rethtml="";var lastPos=0;_.forEach(removeList,function(pos){rethtml+=html.slice(lastPos,pos[0]);lastPos=pos[1]});rethtml+=html.slice(lastPos);return rethtml}}}function stripCommentTag(html){return html.replace(STRIP_COMMENT_TAG_REGEXP,"")}var STRIP_COMMENT_TAG_REGEXP=/<!--[\s\S]*?-->/g;function stripBlankChar(html){var chars=html.split("");chars=chars.filter(function(char){var c=char.charCodeAt(0);if(c===127)return false;if(c<=31){if(c===10||c===13)return true;return false}return true});return chars.join("")}exports.whiteList=getDefaultWhiteList();exports.getDefaultWhiteList=getDefaultWhiteList;exports.onTag=onTag;exports.onIgnoreTag=onIgnoreTag;exports.onTagAttr=onTagAttr;exports.onIgnoreTagAttr=onIgnoreTagAttr;exports.safeAttrValue=safeAttrValue;exports.escapeHtml=escapeHtml;exports.escapeQuote=escapeQuote;exports.unescapeQuote=unescapeQuote;exports.escapeHtmlEntities=escapeHtmlEntities;exports.escapeDangerHtml5Entities=escapeDangerHtml5Entities;exports.clearNonPrintableCharacter=clearNonPrintableCharacter;exports.friendlyAttrValue=friendlyAttrValue;exports.escapeAttrValue=escapeAttrValue;exports.onIgnoreTagStripAll=onIgnoreTagStripAll;exports.StripTagBody=StripTagBody;exports.stripCommentTag=stripCommentTag;exports.stripBlankChar=stripBlankChar;exports.cssFilter=defaultCSSFilter},{"./util":4,cssfilter:8}],2:[function(require,module,exports){var DEFAULT=require("./default");var parser=require("./parser");var FilterXSS=require("./xss");function filterXSS(html,options){var xss=new FilterXSS(options);return xss.process(html)}exports=module.exports=filterXSS;exports.FilterXSS=FilterXSS;for(var i in DEFAULT)exports[i]=DEFAULT[i];for(var i in parser)exports[i]=parser[i];if(typeof window!=="undefined"){window.filterXSS=module.exports}},{"./default":1,"./parser":3,"./xss":5}],3:[function(require,module,exports){var _=require("./util");function getTagName(html){var i=html.indexOf(" ");if(i===-1){var tagName=html.slice(1,-1)}else{var tagName=html.slice(1,i+1)}tagName=_.trim(tagName).toLowerCase();if(tagName.slice(0,1)==="/")tagName=tagName.slice(1);if(tagName.slice(-1)==="/")tagName=tagName.slice(0,-1);return tagName}function isClosing(html){return html.slice(0,2)==="</"}function parseTag(html,onTag,escapeHtml){"user strict";var rethtml="";var lastPos=0;var tagStart=false;var quoteStart=false;var currentPos=0;var len=html.length;var currentHtml="";var currentTagName="";for(currentPos=0;currentPos<len;currentPos++){var c=html.charAt(currentPos);if(tagStart===false){if(c==="<"){tagStart=currentPos;continue}}else{if(quoteStart===false){if(c==="<"){rethtml+=escapeHtml(html.slice(lastPos,currentPos));tagStart=currentPos;lastPos=currentPos;continue}if(c===">"){rethtml+=escapeHtml(html.slice(lastPos,tagStart));currentHtml=html.slice(tagStart,currentPos+1);currentTagName=getTagName(currentHtml);rethtml+=onTag(tagStart,rethtml.length,currentTagName,currentHtml,isClosing(currentHtml));lastPos=currentPos+1;tagStart=false;continue}if((c==='"'||c==="'")&&html.charAt(currentPos-1)==="="){quoteStart=c;continue}}else{if(c===quoteStart){quoteStart=false;continue}}}}if(lastPos<html.length){rethtml+=escapeHtml(html.substr(lastPos))}return rethtml}var REGEXP_ATTR_NAME=/[^a-zA-Z0-9_:\.\-]/gim;function parseAttr(html,onAttr){"user strict";var lastPos=0;var retAttrs=[];var tmpName=false;var len=html.length;function addAttr(name,value){name=_.trim(name);name=name.replace(REGEXP_ATTR_NAME,"").toLowerCase();if(name.length<1)return;var ret=onAttr(name,value||"");if(ret)retAttrs.push(ret)}for(var i=0;i<len;i++){var c=html.charAt(i);var v,j;if(tmpName===false&&c==="="){tmpName=html.slice(lastPos,i);lastPos=i+1;continue}if(tmpName!==false){if(i===lastPos&&(c==='"'||c==="'")&&html.charAt(i-1)==="="){j=html.indexOf(c,i+1);if(j===-1){break}else{v=_.trim(html.slice(lastPos+1,j));addAttr(tmpName,v);tmpName=false;i=j;lastPos=i+1;continue}}}if(c===" "){if(tmpName===false){j=findNextEqual(html,i);if(j===-1){v=_.trim(html.slice(lastPos,i));addAttr(v);tmpName=false;lastPos=i+1;continue}else{i=j-1;continue}}else{j=findBeforeEqual(html,i-1);if(j===-1){v=_.trim(html.slice(lastPos,i));v=stripQuoteWrap(v);addAttr(tmpName,v);tmpName=false;lastPos=i+1;continue}else{continue}}}}if(lastPos<html.length){if(tmpName===false){addAttr(html.slice(lastPos))}else{addAttr(tmpName,stripQuoteWrap(_.trim(html.slice(lastPos))))}}return _.trim(retAttrs.join(" "))}function findNextEqual(str,i){for(;i<str.length;i++){var c=str[i];if(c===" ")continue;if(c==="=")return i;return-1}}function findBeforeEqual(str,i){for(;i>0;i--){var c=str[i];if(c===" ")continue;if(c==="=")return i;return-1}}function isQuoteWrapString(text){if(text[0]==='"'&&text[text.length-1]==='"'||text[0]==="'"&&text[text.length-1]==="'"){return true}else{return false}}function stripQuoteWrap(text){if(isQuoteWrapString(text)){return text.substr(1,text.length-2)}else{return text}}exports.parseTag=parseTag;exports.parseAttr=parseAttr},{"./util":4}],4:[function(require,module,exports){module.exports={indexOf:function(arr,item){var i,j;if(Array.prototype.indexOf){return arr.indexOf(item)}for(i=0,j=arr.length;i<j;i++){if(arr[i]===item){return i}}return-1},forEach:function(arr,fn,scope){var i,j;if(Array.prototype.forEach){return arr.forEach(fn,scope)}for(i=0,j=arr.length;i<j;i++){fn.call(scope,arr[i],i,arr)}},trim:function(str){if(String.prototype.trim){return str.trim()}return str.replace(/(^\s*)|(\s*$)/g,"")}}},{}],5:[function(require,module,exports){var FilterCSS=require("cssfilter").FilterCSS;var DEFAULT=require("./default");var parser=require("./parser");var parseTag=parser.parseTag;var parseAttr=parser.parseAttr;var _=require("./util");function isNull(obj){return obj===undefined||obj===null}function getAttrs(html){var i=html.indexOf(" ");if(i===-1){return{html:"",closing:html[html.length-2]==="/"}}html=_.trim(html.slice(i+1,-1));var isClosing=html[html.length-1]==="/";if(isClosing)html=_.trim(html.slice(0,-1));return{html:html,closing:isClosing}}function FilterXSS(options){options=options||{};if(options.stripIgnoreTag){if(options.onIgnoreTag){console.error('Notes: cannot use these two options "stripIgnoreTag" and "onIgnoreTag" at the same time')}options.onIgnoreTag=DEFAULT.onIgnoreTagStripAll}options.whiteList=options.whiteList||DEFAULT.whiteList;options.onTag=options.onTag||DEFAULT.onTag;options.onTagAttr=options.onTagAttr||DEFAULT.onTagAttr;options.onIgnoreTag=options.onIgnoreTag||DEFAULT.onIgnoreTag;options.onIgnoreTagAttr=options.onIgnoreTagAttr||DEFAULT.onIgnoreTagAttr;options.safeAttrValue=options.safeAttrValue||DEFAULT.safeAttrValue;options.escapeHtml=options.escapeHtml||DEFAULT.escapeHtml;options.css=options.css||{};this.options=options;this.cssFilter=new FilterCSS(options.css)}FilterXSS.prototype.process=function(html){html=html||"";html=html.toString();if(!html)return"";var me=this;var options=me.options;var whiteList=options.whiteList;var onTag=options.onTag;var onIgnoreTag=options.onIgnoreTag;var onTagAttr=options.onTagAttr;var onIgnoreTagAttr=options.onIgnoreTagAttr;var safeAttrValue=options.safeAttrValue;var escapeHtml=options.escapeHtml;var cssFilter=me.cssFilter;if(options.stripBlankChar){html=DEFAULT.stripBlankChar(html)}if(!options.allowCommentTag){html=DEFAULT.stripCommentTag(html)}var stripIgnoreTagBody=false;if(options.stripIgnoreTagBody){var stripIgnoreTagBody=DEFAULT.StripTagBody(options.stripIgnoreTagBody,onIgnoreTag);onIgnoreTag=stripIgnoreTagBody.onIgnoreTag}var retHtml=parseTag(html,function(sourcePosition,position,tag,html,isClosing){var info={sourcePosition:sourcePosition,position:position,isClosing:isClosing,isWhite:tag in whiteList};var ret=onTag(tag,html,info);if(!isNull(ret))return ret;if(info.isWhite){if(info.isClosing){return"</"+tag+">"}var attrs=getAttrs(html);var whiteAttrList=whiteList[tag];var attrsHtml=parseAttr(attrs.html,function(name,value){var isWhiteAttr=_.indexOf(whiteAttrList,name)!==-1;var ret=onTagAttr(tag,name,value,isWhiteAttr);if(!isNull(ret))return ret;if(isWhiteAttr){value=safeAttrValue(tag,name,value,cssFilter);if(value){return name+'="'+value+'"'}else{return name}}else{var ret=onIgnoreTagAttr(tag,name,value,isWhiteAttr);if(!isNull(ret))return ret;return}});var html="<"+tag;if(attrsHtml)html+=" "+attrsHtml;if(attrs.closing)html+=" /";html+=">";return html}else{var ret=onIgnoreTag(tag,html,info);if(!isNull(ret))return ret;return escapeHtml(html)}},escapeHtml);if(stripIgnoreTagBody){retHtml=stripIgnoreTagBody.remove(retHtml)}return retHtml};module.exports=FilterXSS},{"./default":1,"./parser":3,"./util":4,cssfilter:8}],6:[function(require,module,exports){var DEFAULT=require("./default");var parseStyle=require("./parser");var _=require("./util");function isNull(obj){return obj===undefined||obj===null}function FilterCSS(options){options=options||{};options.whiteList=options.whiteList||DEFAULT.whiteList;options.onAttr=options.onAttr||DEFAULT.onAttr;options.onIgnoreAttr=options.onIgnoreAttr||DEFAULT.onIgnoreAttr;this.options=options}FilterCSS.prototype.process=function(css){css=css||"";css=css.toString();if(!css)return"";var me=this;var options=me.options;var whiteList=options.whiteList;var onAttr=options.onAttr;var onIgnoreAttr=options.onIgnoreAttr;var retCSS=parseStyle(css,function(sourcePosition,position,name,value,source){var check=whiteList[name];var isWhite=false;if(check===true)isWhite=check;else if(typeof check==="function")isWhite=check(value);else if(check instanceof RegExp)isWhite=check.test(value);if(isWhite!==true)isWhite=false;var opts={position:position,sourcePosition:sourcePosition,source:source,isWhite:isWhite};if(isWhite){var ret=onAttr(name,value,opts);if(isNull(ret)){return name+":"+value}else{return ret}}else{var ret=onIgnoreAttr(name,value,opts);if(!isNull(ret)){return ret}}});return retCSS};module.exports=FilterCSS},{"./default":7,"./parser":9,"./util":10}],7:[function(require,module,exports){function getDefaultWhiteList(){var whiteList={};whiteList["align-content"]=false;whiteList["align-items"]=false;whiteList["align-self"]=false;whiteList["alignment-adjust"]=false;whiteList["alignment-baseline"]=false;whiteList["all"]=false;whiteList["anchor-point"]=false;whiteList["animation"]=false;whiteList["animation-delay"]=false;whiteList["animation-direction"]=false;whiteList["animation-duration"]=false;whiteList["animation-fill-mode"]=false;whiteList["animation-iteration-count"]=false;whiteList["animation-name"]=false;whiteList["animation-play-state"]=false;whiteList["animation-timing-function"]=false;whiteList["azimuth"]=false;whiteList["backface-visibility"]=false;whiteList["background"]=true;whiteList["background-attachment"]=true;whiteList["background-clip"]=true;whiteList["background-color"]=true;whiteList["background-image"]=true;whiteList["background-origin"]=true;whiteList["background-position"]=true;whiteList["background-repeat"]=true;whiteList["background-size"]=true;whiteList["baseline-shift"]=false;whiteList["binding"]=false;whiteList["bleed"]=false;whiteList["bookmark-label"]=false;whiteList["bookmark-level"]=false;whiteList["bookmark-state"]=false;whiteList["border"]=true;whiteList["border-bottom"]=true;whiteList["border-bottom-color"]=true;whiteList["border-bottom-left-radius"]=true;whiteList["border-bottom-right-radius"]=true;whiteList["border-bottom-style"]=true;whiteList["border-bottom-width"]=true;whiteList["border-collapse"]=true;whiteList["border-color"]=true;whiteList["border-image"]=true;whiteList["border-image-outset"]=true;whiteList["border-image-repeat"]=true;whiteList["border-image-slice"]=true;whiteList["border-image-source"]=true;whiteList["border-image-width"]=true;whiteList["border-left"]=true;whiteList["border-left-color"]=true;whiteList["border-left-style"]=true;whiteList["border-left-width"]=true;whiteList["border-radius"]=true;whiteList["border-right"]=true;whiteList["border-right-color"]=true;whiteList["border-right-style"]=true;whiteList["border-right-width"]=true;whiteList["border-spacing"]=true;whiteList["border-style"]=true;whiteList["border-top"]=true;whiteList["border-top-color"]=true;whiteList["border-top-left-radius"]=true;whiteList["border-top-right-radius"]=true;whiteList["border-top-style"]=true;whiteList["border-top-width"]=true;whiteList["border-width"]=true;whiteList["bottom"]=false;whiteList["box-decoration-break"]=true;whiteList["box-shadow"]=true;whiteList["box-sizing"]=true;whiteList["box-snap"]=true;whiteList["box-suppress"]=true;whiteList["break-after"]=true;whiteList["break-before"]=true;whiteList["break-inside"]=true;whiteList["caption-side"]=false;whiteList["chains"]=false;whiteList["clear"]=true;whiteList["clip"]=false;whiteList["clip-path"]=false;whiteList["clip-rule"]=false;whiteList["color"]=true;whiteList["color-interpolation-filters"]=true;whiteList["column-count"]=false;whiteList["column-fill"]=false;whiteList["column-gap"]=false;whiteList["column-rule"]=false;whiteList["column-rule-color"]=false;whiteList["column-rule-style"]=false;whiteList["column-rule-width"]=false;whiteList["column-span"]=false;whiteList["column-width"]=false;whiteList["columns"]=false;whiteList["contain"]=false;whiteList["content"]=false;whiteList["counter-increment"]=false;whiteList["counter-reset"]=false;whiteList["counter-set"]=false;whiteList["crop"]=false;whiteList["cue"]=false;whiteList["cue-after"]=false;whiteList["cue-before"]=false;whiteList["cursor"]=false;whiteList["direction"]=false;whiteList["display"]=true;whiteList["display-inside"]=true;whiteList["display-list"]=true;whiteList["display-outside"]=true;whiteList["dominant-baseline"]=false;whiteList["elevation"]=false;whiteList["empty-cells"]=false;whiteList["filter"]=false;whiteList["flex"]=false;whiteList["flex-basis"]=false;whiteList["flex-direction"]=false;whiteList["flex-flow"]=false;whiteList["flex-grow"]=false;whiteList["flex-shrink"]=false;whiteList["flex-wrap"]=false;whiteList["float"]=false;whiteList["float-offset"]=false;whiteList["flood-color"]=false;whiteList["flood-opacity"]=false;whiteList["flow-from"]=false;whiteList["flow-into"]=false;whiteList["font"]=true;whiteList["font-family"]=true;whiteList["font-feature-settings"]=true;whiteList["font-kerning"]=true;whiteList["font-language-override"]=true;whiteList["font-size"]=true;whiteList["font-size-adjust"]=true;whiteList["font-stretch"]=true;whiteList["font-style"]=true;whiteList["font-synthesis"]=true;whiteList["font-variant"]=true;whiteList["font-variant-alternates"]=true;whiteList["font-variant-caps"]=true;whiteList["font-variant-east-asian"]=true;whiteList["font-variant-ligatures"]=true;whiteList["font-variant-numeric"]=true;whiteList["font-variant-position"]=true;whiteList["font-weight"]=true;whiteList["grid"]=false;whiteList["grid-area"]=false;whiteList["grid-auto-columns"]=false;whiteList["grid-auto-flow"]=false;whiteList["grid-auto-rows"]=false;whiteList["grid-column"]=false;whiteList["grid-column-end"]=false;whiteList["grid-column-start"]=false;whiteList["grid-row"]=false;whiteList["grid-row-end"]=false;whiteList["grid-row-start"]=false;whiteList["grid-template"]=false;whiteList["grid-template-areas"]=false;whiteList["grid-template-columns"]=false;whiteList["grid-template-rows"]=false;whiteList["hanging-punctuation"]=false;whiteList["height"]=true;whiteList["hyphens"]=false;whiteList["icon"]=false;whiteList["image-orientation"]=false;whiteList["image-resolution"]=false;whiteList["ime-mode"]=false;whiteList["initial-letters"]=false;whiteList["inline-box-align"]=false;whiteList["justify-content"]=false;whiteList["justify-items"]=false;whiteList["justify-self"]=false;whiteList["left"]=false;whiteList["letter-spacing"]=true;whiteList["lighting-color"]=true;whiteList["line-box-contain"]=false;whiteList["line-break"]=false;whiteList["line-grid"]=false;whiteList["line-height"]=false;whiteList["line-snap"]=false;whiteList["line-stacking"]=false;whiteList["line-stacking-ruby"]=false;whiteList["line-stacking-shift"]=false;whiteList["line-stacking-strategy"]=false;whiteList["list-style"]=true;whiteList["list-style-image"]=true;whiteList["list-style-position"]=true;whiteList["list-style-type"]=true;whiteList["margin"]=true;whiteList["margin-bottom"]=true;whiteList["margin-left"]=true;whiteList["margin-right"]=true;whiteList["margin-top"]=true;whiteList["marker-offset"]=false;whiteList["marker-side"]=false;whiteList["marks"]=false;whiteList["mask"]=false;whiteList["mask-box"]=false;whiteList["mask-box-outset"]=false;whiteList["mask-box-repeat"]=false;whiteList["mask-box-slice"]=false;whiteList["mask-box-source"]=false;whiteList["mask-box-width"]=false;whiteList["mask-clip"]=false;whiteList["mask-image"]=false;whiteList["mask-origin"]=false;whiteList["mask-position"]=false;whiteList["mask-repeat"]=false;whiteList["mask-size"]=false;whiteList["mask-source-type"]=false;whiteList["mask-type"]=false;whiteList["max-height"]=true;whiteList["max-lines"]=false;whiteList["max-width"]=true;whiteList["min-height"]=true;whiteList["min-width"]=true;whiteList["move-to"]=false;whiteList["nav-down"]=false;whiteList["nav-index"]=false;whiteList["nav-left"]=false;whiteList["nav-right"]=false;whiteList["nav-up"]=false;whiteList["object-fit"]=false;whiteList["object-position"]=false;whiteList["opacity"]=false;whiteList["order"]=false;whiteList["orphans"]=false;whiteList["outline"]=false;whiteList["outline-color"]=false;whiteList["outline-offset"]=false;whiteList["outline-style"]=false;whiteList["outline-width"]=false;whiteList["overflow"]=false;whiteList["overflow-wrap"]=false;whiteList["overflow-x"]=false;whiteList["overflow-y"]=false;whiteList["padding"]=true;whiteList["padding-bottom"]=true;whiteList["padding-left"]=true;whiteList["padding-right"]=true;whiteList["padding-top"]=true;whiteList["page"]=false;whiteList["page-break-after"]=false;whiteList["page-break-before"]=false;whiteList["page-break-inside"]=false;whiteList["page-policy"]=false;whiteList["pause"]=false;whiteList["pause-after"]=false;whiteList["pause-before"]=false;whiteList["perspective"]=false;whiteList["perspective-origin"]=false;whiteList["pitch"]=false;whiteList["pitch-range"]=false;whiteList["play-during"]=false;whiteList["position"]=false;whiteList["presentation-level"]=false;whiteList["quotes"]=false;whiteList["region-fragment"]=false;whiteList["resize"]=false;whiteList["rest"]=false;whiteList["rest-after"]=false;whiteList["rest-before"]=false;whiteList["richness"]=false;whiteList["right"]=false;whiteList["rotation"]=false;whiteList["rotation-point"]=false;whiteList["ruby-align"]=false;whiteList["ruby-merge"]=false;whiteList["ruby-position"]=false;whiteList["shape-image-threshold"]=false;whiteList["shape-outside"]=false;whiteList["shape-margin"]=false;whiteList["size"]=false;whiteList["speak"]=false;whiteList["speak-as"]=false;whiteList["speak-header"]=false;whiteList["speak-numeral"]=false;whiteList["speak-punctuation"]=false;whiteList["speech-rate"]=false;whiteList["stress"]=false;whiteList["string-set"]=false;whiteList["tab-size"]=false;whiteList["table-layout"]=false;whiteList["text-align"]=true;whiteList["text-align-last"]=true;whiteList["text-combine-upright"]=true;whiteList["text-decoration"]=true;whiteList["text-decoration-color"]=true;whiteList["text-decoration-line"]=true;whiteList["text-decoration-skip"]=true;whiteList["text-decoration-style"]=true;whiteList["text-emphasis"]=true;whiteList["text-emphasis-color"]=true;whiteList["text-emphasis-position"]=true;whiteList["text-emphasis-style"]=true;whiteList["text-height"]=true;whiteList["text-indent"]=true;whiteList["text-justify"]=true;whiteList["text-orientation"]=true;whiteList["text-overflow"]=true;whiteList["text-shadow"]=true;whiteList["text-space-collapse"]=true;whiteList["text-transform"]=true;whiteList["text-underline-position"]=true;whiteList["text-wrap"]=true;whiteList["top"]=false;whiteList["transform"]=false;whiteList["transform-origin"]=false;whiteList["transform-style"]=false;whiteList["transition"]=false;whiteList["transition-delay"]=false;whiteList["transition-duration"]=false;whiteList["transition-property"]=false;whiteList["transition-timing-function"]=false;whiteList["unicode-bidi"]=false;whiteList["vertical-align"]=false;whiteList["visibility"]=false;whiteList["voice-balance"]=false;whiteList["voice-duration"]=false;whiteList["voice-family"]=false;whiteList["voice-pitch"]=false;whiteList["voice-range"]=false;whiteList["voice-rate"]=false;whiteList["voice-stress"]=false;whiteList["voice-volume"]=false;whiteList["volume"]=false;whiteList["white-space"]=false;whiteList["widows"]=false;whiteList["width"]=true;whiteList["will-change"]=false;whiteList["word-break"]=true;whiteList["word-spacing"]=true;whiteList["word-wrap"]=true;whiteList["wrap-flow"]=false;whiteList["wrap-through"]=false;whiteList["writing-mode"]=false;whiteList["z-index"]=false;return whiteList}function onAttr(name,value,options){}function onIgnoreAttr(name,value,options){}exports.whiteList=getDefaultWhiteList();exports.getDefaultWhiteList=getDefaultWhiteList;exports.onAttr=onAttr;exports.onIgnoreAttr=onIgnoreAttr},{}],8:[function(require,module,exports){var DEFAULT=require("./default");var FilterCSS=require("./css");function filterCSS(html,options){var xss=new FilterCSS(options);return xss.process(html)}exports=module.exports=filterCSS;exports.FilterCSS=FilterCSS;for(var i in DEFAULT)exports[i]=DEFAULT[i];if(typeof window!=="undefined"){window.filterCSS=module.exports}},{"./css":6,"./default":7}],9:[function(require,module,exports){var _=require("./util");function parseStyle(css,onAttr){css=_.trimRight(css);if(css[css.length-1]!==";")css+=";";var cssLength=css.length;var isParenthesisOpen=false;var lastPos=0;var i=0;var retCSS="";function addNewAttr(){if(!isParenthesisOpen){var source=_.trim(css.slice(lastPos,i));var j=source.indexOf(":");if(j!==-1){var name=_.trim(source.slice(0,j));var value=_.trim(source.slice(j+1));if(name){var ret=onAttr(lastPos,retCSS.length,name,value,source);if(ret)retCSS+=ret+"; "}}}lastPos=i+1}for(;i<cssLength;i++){var c=css[i];if(c==="/"&&css[i+1]==="*"){var j=css.indexOf("*/",i+2);if(j===-1)break;i=j+1;lastPos=i+1;isParenthesisOpen=false}else if(c==="("){isParenthesisOpen=true}else if(c===")"){isParenthesisOpen=false}else if(c===";"){if(isParenthesisOpen){}else{addNewAttr()}}else if(c==="\n"){addNewAttr()}}return _.trim(retCSS)}module.exports=parseStyle},{"./util":10}],10:[function(require,module,exports){module.exports={indexOf:function(arr,item){var i,j;if(Array.prototype.indexOf){return arr.indexOf(item)}for(i=0,j=arr.length;i<j;i++){if(arr[i]===item){return i}}return-1},forEach:function(arr,fn,scope){var i,j;if(Array.prototype.forEach){return arr.forEach(fn,scope)}for(i=0,j=arr.length;i<j;i++){fn.call(scope,arr[i],i,arr)}},trim:function(str){if(String.prototype.trim){return str.trim()}return str.replace(/(^\s*)|(\s*$)/g,"")},trimRight:function(str){if(String.prototype.trimRight){return str.trimRight()}return str.replace(/(\s*$)/g,"")}}},{}]},{},[2]);
define("pretty-text/allow-lister", ["exports", "discourse-common/lib/deprecated"], function (_exports, _deprecated) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.DEFAULT_LIST = _exports.default = void 0;

  function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  // to match:
  // abcd
  // abcd[test]
  // abcd[test=bob]
  var ALLOWLIST_REGEX = /([^\[]+)(\[([^=]+)(=(.*))?\])?/;

  var AllowLister = /*#__PURE__*/function () {
    function AllowLister(options) {
      var _this = this;

      _classCallCheck(this, AllowLister);

      this._enabled = {
        default: true
      };
      this._allowedHrefSchemes = options && options.allowedHrefSchemes || [];
      this._allowedIframes = options && options.allowedIframes || [];
      this._rawFeatures = [["default", DEFAULT_LIST]];
      this._cache = null;

      if (options && options.features) {
        Object.keys(options.features).forEach(function (f) {
          if (options.features[f]) {
            _this._enabled[f] = true;
          }
        });
      }
    }

    _createClass(AllowLister, [{
      key: "allowListFeature",
      value: function allowListFeature(feature, info) {
        this._rawFeatures.push([feature, info]);
      }
    }, {
      key: "whiteListFeature",
      value: function whiteListFeature(feature, info) {
        (0, _deprecated.default)("`whiteListFeature` has been replaced with `allowListFeature`", {
          since: "2.6.0.beta.4",
          dropFrom: "2.7.0"
        });
        this.allowListFeature(feature, info);
      }
    }, {
      key: "disable",
      value: function disable(feature) {
        this._enabled[feature] = false;
        this._cache = null;
      }
    }, {
      key: "enable",
      value: function enable(feature) {
        this._enabled[feature] = true;
        this._cache = null;
      }
    }, {
      key: "_buildCache",
      value: function _buildCache() {
        var _this2 = this;

        var tagList = {};
        var attrList = {};
        var custom = [];

        this._rawFeatures.forEach(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              name = _ref2[0],
              info = _ref2[1];

          if (!_this2._enabled[name]) {
            return;
          }

          if (info.custom) {
            custom.push(info.custom);
            return;
          }

          if (typeof info === "string") {
            info = [info];
          }

          (info || []).forEach(function (tag) {
            var classes = tag.split(".");
            var tagWithAttr = classes.shift();
            var m = ALLOWLIST_REGEX.exec(tagWithAttr);

            if (m) {
              var _m = _slicedToArray(m, 6),
                  tagname = _m[1],
                  attr = _m[3],
                  val = _m[5];

              tagList[tagname] = [];
              var attrs = attrList[tagname] = attrList[tagname] || {};

              if (classes.length > 0) {
                attrs["class"] = (attrs["class"] || []).concat(classes);
              }

              if (attr) {
                var attrInfo = attrs[attr] = attrs[attr] || [];

                if (val) {
                  attrInfo.push(val);
                } else {
                  attrs[attr] = ["*"];
                }
              }
            }
          });
        });

        this._cache = {
          custom: custom,
          allowList: {
            tagList: tagList,
            attrList: attrList
          }
        };
      }
    }, {
      key: "_ensureCache",
      value: function _ensureCache() {
        if (!this._cache) {
          this._buildCache();
        }
      }
    }, {
      key: "getAllowList",
      value: function getAllowList() {
        this._ensureCache();

        return this._cache.allowList;
      }
    }, {
      key: "getWhiteList",
      value: function getWhiteList() {
        (0, _deprecated.default)("`getWhiteList` has been replaced with `getAllowList`", {
          since: "2.6.0.beta.4",
          dropFrom: "2.7.0"
        });
        return this.getAllowList();
      }
    }, {
      key: "getCustom",
      value: function getCustom() {
        this._ensureCache();

        return this._cache.custom;
      }
    }, {
      key: "getAllowedHrefSchemes",
      value: function getAllowedHrefSchemes() {
        return this._allowedHrefSchemes;
      }
    }, {
      key: "getAllowedIframes",
      value: function getAllowedIframes() {
        return this._allowedIframes;
      }
    }]);

    return AllowLister;
  }(); // Only add to `default` when you always want your allowlist to occur. In other words,
  // don't change this for a plugin or a feature that can be disabled


  _exports.default = AllowLister;
  var DEFAULT_LIST = ["a.anchor", "a.attachment", "a.hashtag", "a.mention", "a.mention-group", "a.onebox", "a.inline-onebox", "a.inline-onebox-loading", "a[data-bbcode]", "a[name]", "a[rel=nofollow]", "a[rel=ugc]", "a[target=_blank]", "a[title]", "abbr[title]", "aside.quote", "aside[data-*]", "audio", "audio[controls]", "audio[preload]", "b", "big", "blockquote", "br", "code", "dd", "del", "div", "div.quote-controls", "div.title", "div[align]", "div[lang]", "div[data-*]"
  /* This may seem a bit much but polls does
      it anyway and this is needed for themes,
      special code in sanitizer handles data-*
      nothing exists for data-theme-* and we
      don't want to slow sanitize for this case
    */
  , "div[dir]", "dl", "dt", "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "iframe", "iframe[frameborder]", "iframe[height]", "iframe[marginheight]", "iframe[marginwidth]", "iframe[width]", "iframe[allowfullscreen]", "img[alt]", "img[height]", "img[title]", "img[width]", "img[data-thumbnail]", "ins", "kbd", "li", "mark", "ol", "ol[start]", "p", "p[lang]", "picture", "pre", "s", "small", "span[lang]", "span.excerpt", "div.excerpt", "div.video-container", "div.onebox-placeholder-container", "span.placeholder-icon video", "span.hashtag", "span.mention", "strike", "strong", "sub", "sup", "source[data-orig-src]", "source[src]", "source[srcset]", "source[type]", "track", "track[default]", "track[label]", "track[kind]", "track[src]", "track[srclang]", "ul", "video", // video[autoplay] handled by sanitizer.js
  "video[controls]", "video[controlslist]", "video[crossorigin]", "video[height]", "video[loop]", "video[muted]", "video[playsinline]", "video[poster]", "video[preload]", "video[width]", "ruby", "ruby[lang]", "rb", "rb[lang]", "rp", "rt", "rt[lang]"];
  _exports.DEFAULT_LIST = DEFAULT_LIST;
});
define("pretty-text/white-lister", ["exports", "pretty-text/allow-lister", "discourse-common/lib/deprecated"], function (_exports, _allowLister, _deprecated) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.DEFAULT_LIST = _exports.default = void 0;

  function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

  function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

  function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

  function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

  function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

  function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

  function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

  function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

  var WhiteLister = /*#__PURE__*/function (_AllowLister) {
    _inherits(WhiteLister, _AllowLister);

    var _super = _createSuper(WhiteLister);

    function WhiteLister(options) {
      _classCallCheck(this, WhiteLister);

      (0, _deprecated.default)("`WhiteLister` has been replaced with `AllowLister`", {
        since: "2.6.0.beta.4",
        dropFrom: "2.7.0"
      });
      return _super.call(this, options);
    }

    return WhiteLister;
  }(_allowLister.default);

  _exports.default = WhiteLister;
  var DEFAULT_LIST = _allowLister.DEFAULT_LIST;
  _exports.DEFAULT_LIST = DEFAULT_LIST;
});
define("pretty-text/sanitizer", ["exports", "xss", "discourse-common/lib/escape"], function (_exports, _xss, _escape) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.hrefAllowed = hrefAllowed;
  _exports.sanitize = sanitize;
  Object.defineProperty(_exports, "escape", {
    enumerable: true,
    get: function get() {
      return _escape.default;
    }
  });

  function attr(name, value) {
    if (value) {
      return "".concat(name, "=\"").concat(_xss.default.escapeAttrValue(value), "\"");
    }

    return name;
  }

  function hrefAllowed(href, extraHrefMatchers) {
    // escape single quotes
    href = href.replace(/'/g, "%27"); // absolute urls

    if (/^(https?:)?\/\/[\w\.\-]+/i.test(href)) {
      return href;
    } // relative urls


    if (/^\/[\w\.\-]+/i.test(href)) {
      return href;
    } // anchors


    if (/^#[\w\.\-]+/i.test(href)) {
      return href;
    } // mailtos


    if (/^mailto:[\w\.\-@]+/i.test(href)) {
      return href;
    }

    if (extraHrefMatchers && extraHrefMatchers.length > 0) {
      for (var i = 0; i < extraHrefMatchers.length; i++) {
        if (extraHrefMatchers[i].test(href)) {
          return href;
        }
      }
    }
  }

  function sanitize(text, allowLister) {
    if (!text) {
      return "";
    } // Allow things like <3 and <_<


    text = text.replace(/<([^A-Za-z\/\!]|$)/g, "&lt;$1");
    var allowList = allowLister.getAllowList(),
        allowedHrefSchemes = allowLister.getAllowedHrefSchemes(),
        allowedIframes = allowLister.getAllowedIframes();
    var extraHrefMatchers = null;

    if (allowedHrefSchemes && allowedHrefSchemes.length > 0) {
      extraHrefMatchers = [new RegExp("^(" + allowedHrefSchemes.join("|") + ")://[\\w\\.\\-]+", "i")];

      if (allowedHrefSchemes.includes("tel")) {
        extraHrefMatchers.push(new RegExp("^tel://\\+?[\\w\\.\\-]+", "i"));
      }
    }

    var result = (0, _xss.default)(text, {
      whiteList: allowList.tagList,
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script", "table"],
      onIgnoreTagAttr: function onIgnoreTagAttr(tag, name, value) {
        var forTag = allowList.attrList[tag];

        if (forTag) {
          var forAttr = forTag[name];

          if (forAttr && (forAttr.indexOf("*") !== -1 || forAttr.indexOf(value) !== -1) || name.indexOf("data-html-") === -1 && name.indexOf("data-") === 0 && forTag["data-*"] || tag === "a" && name === "href" && hrefAllowed(value, extraHrefMatchers) || tag === "img" && name === "src" && (/^data:image.*$/i.test(value) || hrefAllowed(value, extraHrefMatchers)) || tag === "iframe" && name === "src" && allowedIframes.some(function (i) {
            return value.toLowerCase().indexOf((i || "").toLowerCase()) === 0;
          })) {
            return attr(name, value);
          }

          if (tag === "iframe" && name === "src") {
            return "-STRIP-";
          }

          if (tag === "video" && name === "autoplay") {
            // This might give us duplicate 'muted' attributes
            // but they will be deduped by later processing
            return "autoplay muted";
          } // Heading ids must begin with `heading--`


          if (["h1", "h2", "h3", "h4", "h5", "h6"].indexOf(tag) !== -1 && value.match(/^heading\-\-[a-zA-Z0-9\-\_]+$/)) {
            return attr(name, value);
          }

          var custom = allowLister.getCustom();

          for (var i = 0; i < custom.length; i++) {
            var fn = custom[i];

            if (fn(tag, name, value)) {
              return attr(name, value);
            }
          }
        }
      }
    });
    return result.replace(/\[removed\]/g, "").replace(/\<iframe[^>]+\-STRIP\-[^>]*>[^<]*<\/iframe>/g, "").replace(/&(?![#\w]+;)/g, "&amp;").replace(/&#39;/g, "'").replace(/ \/>/g, ">");
  }
});
define("pretty-text/oneboxer", ["exports", "pretty-text/oneboxer-cache", "@ember/runloop"], function (_exports, _oneboxerCache, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.resetCache = resetCache;
  _exports.load = load;
  _exports.LOADING_ONEBOX_CSS_CLASS = void 0;
  var timeout;
  var loadingQueue = [];
  var LOADING_ONEBOX_CSS_CLASS = "loading-onebox";
  _exports.LOADING_ONEBOX_CSS_CLASS = LOADING_ONEBOX_CSS_CLASS;

  function resetCache() {
    loadingQueue.clear();
    (0, _oneboxerCache.resetLocalCache)();
    (0, _oneboxerCache.resetFailedCache)();
  }

  function resolveSize(img) {
    $(img).addClass("size-resolved");

    if (img.width > 0 && img.width === img.height) {
      $(img).addClass("onebox-avatar");
    }
  } // Detect square images and apply smaller onebox-avatar class


  function applySquareGenericOnebox($elem) {
    if (!$elem.hasClass("allowlistedgeneric")) {
      return;
    }

    var $img = $elem.find(".onebox-body img.thumbnail");
    var img = $img[0]; // already resolved... skip

    if ($img.length !== 1 || $img.hasClass("size-resolved")) {
      return;
    }

    if (img.complete) {
      resolveSize(img);
    } else {
      $img.on("load.onebox", function () {
        resolveSize(img);
        $img.off("load.onebox");
      });
    }
  }

  function loadNext(ajax) {
    if (loadingQueue.length === 0) {
      timeout = null;
      return;
    }

    var timeoutMs = 150;
    var removeLoading = true;

    var _loadingQueue$shift = loadingQueue.shift(),
        url = _loadingQueue$shift.url,
        refresh = _loadingQueue$shift.refresh,
        $elem = _loadingQueue$shift.$elem,
        categoryId = _loadingQueue$shift.categoryId,
        topicId = _loadingQueue$shift.topicId; // Retrieve the onebox


    return ajax("/onebox", {
      dataType: "html",
      data: {
        url: url,
        refresh: refresh,
        category_id: categoryId,
        topic_id: topicId
      }
    }).then(function (html) {
      var $html = $(html);
      (0, _oneboxerCache.setLocalCache)((0, _oneboxerCache.normalize)(url), $html);
      $elem.replaceWith($html);
      applySquareGenericOnebox($html);
    }, function (result) {
      if (result && result.jqXHR && result.jqXHR.status === 429) {
        timeoutMs = 2000;
        removeLoading = false;
        loadingQueue.unshift({
          url: url,
          refresh: refresh,
          $elem: $elem,
          categoryId: categoryId,
          topicId: topicId
        });
      } else {
        (0, _oneboxerCache.setFailedCache)((0, _oneboxerCache.normalize)(url), true);
      }
    }).finally(function () {
      timeout = (0, _runloop.later)(function () {
        return loadNext(ajax);
      }, timeoutMs);

      if (removeLoading) {
        $elem.removeClass(LOADING_ONEBOX_CSS_CLASS);
        $elem.data("onebox-loaded");
      }
    });
  } // Perform a lookup of a onebox based an anchor $element.
  // It will insert a loading indicator and remove it when the loading is complete or fails.


  function load(_ref) {
    var elem = _ref.elem,
        ajax = _ref.ajax,
        topicId = _ref.topicId,
        categoryId = _ref.categoryId,
        _ref$refresh = _ref.refresh,
        refresh = _ref$refresh === void 0 ? true : _ref$refresh,
        _ref$offline = _ref.offline,
        offline = _ref$offline === void 0 ? false : _ref$offline,
        _ref$synchronous = _ref.synchronous,
        synchronous = _ref$synchronous === void 0 ? false : _ref$synchronous;
    var $elem = $(elem); // If the onebox has loaded or is loading, return

    if ($elem.data("onebox-loaded")) {
      return;
    }

    if ($elem.hasClass(LOADING_ONEBOX_CSS_CLASS)) {
      return;
    }

    var url = elem.href; // Unless we're forcing a refresh...

    if (!refresh) {
      // If we have it in our cache, return it.
      var cached = _oneboxerCache.localCache[(0, _oneboxerCache.normalize)(url)];

      if (cached) {
        return cached.prop("outerHTML");
      } // If the request failed, don't do anything


      var failed = _oneboxerCache.failedCache[(0, _oneboxerCache.normalize)(url)];

      if (failed) {
        return;
      }

      if (offline) {
        return;
      }
    } // Add the loading CSS class


    $elem.addClass(LOADING_ONEBOX_CSS_CLASS); // Add to the loading queue

    loadingQueue.push({
      url: url,
      refresh: refresh,
      $elem: $elem,
      categoryId: categoryId,
      topicId: topicId
    }); // Load next url in queue

    if (synchronous) {
      return loadNext(ajax);
    } else {
      timeout = timeout || (0, _runloop.later)(function () {
        return loadNext(ajax);
      }, 150);
    }
  }
});
define("pretty-text/oneboxer-cache", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.resetLocalCache = resetLocalCache;
  _exports.resetFailedCache = resetFailedCache;
  _exports.setLocalCache = setLocalCache;
  _exports.setFailedCache = setFailedCache;
  _exports.normalize = normalize;
  _exports.lookupCache = lookupCache;
  _exports.failedCache = _exports.localCache = void 0;
  var localCache = {};
  _exports.localCache = localCache;
  var failedCache = {}; // Sometimes jQuery will return URLs with trailing slashes when the
  // `href` didn't have them.

  _exports.failedCache = failedCache;

  function resetLocalCache() {
    _exports.localCache = localCache = {};
  }

  function resetFailedCache() {
    _exports.failedCache = failedCache = {};
  }

  function setLocalCache(key, value) {
    localCache[key] = value;
  }

  function setFailedCache(key, value) {
    failedCache[key] = value;
  }

  function normalize(url) {
    return url.replace(/\/$/, "");
  }

  function lookupCache(url) {
    var cached = localCache[normalize(url)];
    return cached && cached.prop("outerHTML");
  }
});
define("pretty-text/inline-oneboxer", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.applyInlineOneboxes = applyInlineOneboxes;
  _exports.cachedInlineOnebox = cachedInlineOnebox;
  _exports.applyCachedInlineOnebox = applyCachedInlineOnebox;
  _exports.deleteCachedInlineOnebox = deleteCachedInlineOnebox;
  var _cache = {};

  function applyInlineOneboxes(inline, ajax, opts) {
    opts = opts || {};
    var urls = Object.keys(inline).filter(function (url) {
      return !_cache[url];
    });
    urls.forEach(function (url) {
      // cache a blank locally, so we never trigger a lookup
      _cache[url] = {};
    });

    if (urls.length === 0) {
      return;
    }

    ajax("/inline-onebox", {
      data: {
        urls: urls,
        category_id: opts.categoryId,
        topic_id: opts.topicId
      }
    }).then(function (result) {
      result["inline-oneboxes"].forEach(function (onebox) {
        if (onebox.title) {
          _cache[onebox.url] = onebox;
          var links = inline[onebox.url] || [];
          links.forEach(function (link) {
            $(link).text(onebox.title).addClass("inline-onebox").removeClass("inline-onebox-loading");
          });
        }
      });
    });
  }

  function cachedInlineOnebox(url) {
    return _cache[url];
  }

  function applyCachedInlineOnebox(url, onebox) {
    return _cache[url] = onebox;
  }

  function deleteCachedInlineOnebox(url) {
    return delete _cache[url];
  }
});
define("pretty-text/upload-short-url", ["exports", "I18n", "discourse-common/lib/debounce"], function (_exports, _I18n, _debounce) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.lookupCachedUploadUrl = lookupCachedUploadUrl;
  _exports.lookupUncachedUploadUrls = lookupUncachedUploadUrls;
  _exports.cacheShortUploadUrl = cacheShortUploadUrl;
  _exports.resetCache = resetCache;
  _exports.resolveCachedShortUrls = resolveCachedShortUrls;
  _exports.resolveAllShortUrls = resolveAllShortUrls;

  function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

  function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  var _cache = {};

  function lookupCachedUploadUrl(shortUrl) {
    return _cache[shortUrl] || {};
  }

  var MISSING = "missing";

  function lookupUncachedUploadUrls(urls, ajax) {
    urls = urls.filter(Boolean);

    if (urls.length === 0) {
      return;
    }

    return ajax("/uploads/lookup-urls", {
      type: "POST",
      data: {
        short_urls: urls
      }
    }).then(function (uploads) {
      uploads.forEach(function (upload) {
        cacheShortUploadUrl(upload.short_url, {
          url: upload.url,
          short_path: upload.short_path
        });
      });
      urls.forEach(function (url) {
        return cacheShortUploadUrl(url, {
          url: lookupCachedUploadUrl(url).url || MISSING,
          short_path: lookupCachedUploadUrl(url).short_path || MISSING
        });
      });
      return uploads;
    });
  }

  function cacheShortUploadUrl(shortUrl, value) {
    _cache[shortUrl] = value;
  }

  function resetCache() {
    _cache = {};
  }

  function retrieveCachedUrl(upload, siteSettings, dataAttribute, opts, callback) {
    var cachedUpload = lookupCachedUploadUrl(upload.getAttribute("data-".concat(dataAttribute)));
    var url = getAttributeBasedUrl(dataAttribute, cachedUpload, siteSettings);

    if (url) {
      upload.removeAttribute("data-".concat(dataAttribute));

      if (url !== MISSING) {
        callback(url);
      } else if (opts && opts.removeMissing) {
        var style = getComputedStyle(document.body);
        var canvas = document.createElement("canvas");
        canvas.width = upload.width;
        canvas.height = upload.height;
        var context = canvas.getContext("2d"); // Draw background

        context.fillStyle = getComputedStyle(document.body).backgroundColor;
        context.strokeRect(0, 0, canvas.width, canvas.height); // Draw border

        context.lineWidth = 2;
        context.strokeStyle = getComputedStyle(document.body).color;
        context.strokeRect(0, 0, canvas.width, canvas.height);
        var fontSize = 25;

        var text = _I18n.default.t("image_removed"); // Fill text size to fit the canvas


        var textSize;

        do {
          --fontSize;
          context.font = "".concat(fontSize, "px ").concat(style.fontFamily);
          textSize = context.measureText(text);
        } while (textSize.width > canvas.width);

        context.fillStyle = getComputedStyle(document.body).color;
        context.fillText(text, (canvas.width - textSize.width) / 2, (canvas.height + fontSize) / 2);
        upload.parentNode.replaceChild(canvas, upload);
      }
    }
  }

  function getAttributeBasedUrl(dataAttribute, cachedUpload, siteSettings) {
    if (!cachedUpload.url) {
      return;
    } // non-attachments always use the full URL


    if (dataAttribute !== "orig-href") {
      return cachedUpload.url;
    } // attachments should use the full /secure-media-uploads/ URL
    // in this case for permission checks


    if (siteSettings.secure_media && cachedUpload.url.indexOf("secure-media-uploads") > -1) {
      return cachedUpload.url;
    }

    return cachedUpload.short_path;
  }

  function _loadCachedShortUrls(uploadElements, siteSettings, opts) {
    uploadElements.forEach(function (upload) {
      switch (upload.tagName) {
        case "A":
          retrieveCachedUrl(upload, siteSettings, "orig-href", opts, function (url) {
            upload.href = url;
          });
          break;

        case "IMG":
          retrieveCachedUrl(upload, siteSettings, "orig-src", opts, function (url) {
            upload.src = url;
          });
          break;

        case "SOURCE":
          // video/audio tag > source tag
          retrieveCachedUrl(upload, siteSettings, "orig-src", opts, function (url) {
            if (url.startsWith("//".concat(window.location.host))) {
              var hostRegex = new RegExp("//" + window.location.host, "g");
              url = url.replace(hostRegex, "");
            }

            upload.src = url; // set the url and text for the <a> tag within the <video/audio> tag

            var link = upload.parentElement.querySelector("a");

            if (link) {
              link.href = url;
              link.textContent = url;
            }
          });
          break;
      }
    });
  }

  function _loadShortUrls(uploads, ajax, siteSettings, opts) {
    var urls = _toConsumableArray(uploads).map(function (upload) {
      return upload.getAttribute("data-orig-src") || upload.getAttribute("data-orig-href");
    });

    return lookupUncachedUploadUrls(urls, ajax).then(function () {
      return _loadCachedShortUrls(uploads, siteSettings, opts);
    });
  }

  var SHORT_URL_ATTRIBUTES = "img[data-orig-src], a[data-orig-href], source[data-orig-src]";

  function resolveCachedShortUrls(siteSettings, scope, opts) {
    var shortUploadElements = scope.querySelectorAll(SHORT_URL_ATTRIBUTES);

    if (shortUploadElements.length > 0) {
      _loadCachedShortUrls(shortUploadElements, siteSettings, opts);
    }
  }

  function resolveAllShortUrls(ajax, siteSettings, scope, opts) {
    var shortUploadElements = scope.querySelectorAll(SHORT_URL_ATTRIBUTES);

    if (shortUploadElements.length > 0) {
      _loadCachedShortUrls(shortUploadElements, siteSettings, opts);

      shortUploadElements = scope.querySelectorAll(SHORT_URL_ATTRIBUTES);

      if (shortUploadElements.length > 0) {
        // this is carefully batched so we can do a leading debounce (trigger right away)
        return (0, _debounce.default)(null, _loadShortUrls, shortUploadElements, ajax, siteSettings, opts, 450, true);
      }
    }
  }
});















// This bundle contains the same dependencies as app/assets/javascripts/vendor.js
// minus ember_jquery.
// ember_jquery doesn't work with theme tests in production because it
// contains production builds of Ember and jQuery, so we have a separate bundle
// caled theme_qunit_ember_jquery which contains a debug build for Ember and jQuery.
// We don't put theme_qunit_ember_jquery in this bundle because it would make the
// bundle too big and cause OOM exceptions during rebuilds for self-hosters on
// low-end machines.
define("discourse/tests/theme_qunit_vendor", [], function () {
  "use strict";
});

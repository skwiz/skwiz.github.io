define("discourse-common/config/environment", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.setEnvironment = setEnvironment;
  _exports.isTesting = isTesting;
  _exports.isLegacyEmber = isLegacyEmber;
  _exports.isDevelopment = isDevelopment;
  _exports.isProduction = isProduction;
  _exports.INPUT_DELAY = void 0;
  var INPUT_DELAY = 250;
  _exports.INPUT_DELAY = INPUT_DELAY;
  var environment = "unknown";

  function setEnvironment(e) {
    if (isTesting()) {
      environment = "testing";
    } else {
      environment = e;
    }
  }

  function isTesting() {
    return Ember.testing || environment === "testing";
  } // Generally means "before we migrated to Ember CLI"


  var _isLegacy = Ember.VERSION.startsWith("3.12");

  function isLegacyEmber() {
    return _isLegacy;
  }

  function isDevelopment() {
    return environment === "development";
  }

  function isProduction() {
    return environment === "production";
  }
});
define("discourse-common/helpers/bound-i18n", ["exports", "I18n", "discourse-common/lib/helpers"], function (_exports, _I18n, _helpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _helpers.htmlHelper)(function (key, params) {
    return _I18n.default.t(key, params.hash);
  });

  _exports.default = _default;
});
define("discourse-common/helpers/component-for-collection", ["discourse-common/lib/helpers"], function (_helpers) {
  "use strict";

  (0, _helpers.registerUnbound)("component-for-collection", function (collectionIdentifier, selectKit) {
    return selectKit.modifyComponentForCollection(collectionIdentifier);
  });
});
define("discourse-common/helpers/component-for-row", ["discourse-common/lib/helpers"], function (_helpers) {
  "use strict";

  (0, _helpers.registerUnbound)("component-for-row", function (collectionForIdentifier, item, selectKit) {
    return selectKit.modifyComponentForRow(collectionForIdentifier, item);
  });
});
define("discourse-common/helpers/d-icon", ["@ember/template", "discourse-common/lib/helpers", "discourse-common/lib/icon-library"], function (_template, _helpers, _iconLibrary) {
  "use strict";

  (0, _helpers.registerUnbound)("d-icon", function (id, params) {
    return (0, _template.htmlSafe)((0, _iconLibrary.renderIcon)("string", id, params));
  });
});
define("discourse-common/helpers/fa-icon", ["exports", "discourse-common/lib/deprecated", "@ember/template", "discourse-common/lib/helpers", "discourse-common/lib/icon-library"], function (_exports, _deprecated, _template, _helpers, _iconLibrary) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.iconHTML = iconHTML;

  function iconHTML(id, params) {
    return (0, _iconLibrary.renderIcon)("string", id, params);
  }

  (0, _helpers.registerUnbound)("fa-icon", function (icon, params) {
    (0, _deprecated.default)("Use `{{d-icon}}` instead of `{{fa-icon}}");
    return (0, _template.htmlSafe)(iconHTML(icon, params));
  });
});
define("discourse-common/helpers/get-url", ["discourse-common/lib/deprecated", "discourse-common/lib/get-url", "discourse-common/lib/helpers"], function (_deprecated, _getUrl, _helpers) {
  "use strict";

  (0, _helpers.registerUnbound)("get-url", function (value) {
    return (0, _getUrl.default)(value);
  });
  (0, _helpers.registerUnbound)("base-url", function () {
    (0, _deprecated.default)("Use `{{base-path}}` instead of `{{base-url}}`");
    return (0, _getUrl.default)("");
  });
  (0, _helpers.registerUnbound)("base-path", function () {
    return (0, _getUrl.default)("");
  });
});
define("discourse-common/helpers/html-safe", ["@ember/template", "discourse-common/lib/helpers"], function (_template, _helpers) {
  "use strict";

  (0, _helpers.registerUnbound)("html-safe", function (string) {
    return (0, _template.htmlSafe)(string);
  });
});
define("discourse-common/helpers/i18n", ["I18n", "discourse-common/lib/helpers"], function (_I18n, _helpers) {
  "use strict";

  (0, _helpers.registerUnbound)("i18n", function (key, params) {
    return _I18n.default.t(key, params);
  });
  (0, _helpers.registerUnbound)("i18n-yes-no", function (value, params) {
    return _I18n.default.t(value ? "yes_value" : "no_value", params);
  });
});
define("discourse-common/helpers/popular-themes", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.POPULAR_THEMES = void 0;
  var POPULAR_THEMES = [{
    name: "Graceful",
    value: "https://github.com/discourse/graceful",
    preview: "https://theme-creator.discourse.org/theme/awesomerobot/graceful",
    description: "A light and graceful theme for Discourse.",
    meta_url: "https://meta.discourse.org/t/a-graceful-theme-for-discourse/93040"
  }, {
    name: "Material Design Theme",
    value: "https://github.com/discourse/material-design-stock-theme",
    preview: "https://theme-creator.discourse.org/theme/tshenry/material-design",
    description: "Inspired by Material Design, this theme comes with several color palettes (incl. a dark one).",
    meta_url: "https://meta.discourse.org/t/material-design-stock-theme/47142"
  }, {
    name: "Minima",
    value: "https://github.com/discourse/minima",
    preview: "https://theme-creator.discourse.org/theme/awesomerobot/minima",
    description: "A minimal theme with reduced UI elements and focus on text.",
    meta_url: "https://meta.discourse.org/t/minima-a-minimal-theme-for-discourse/108178"
  }, {
    name: "Sam's Simple Theme",
    value: "https://github.com/discourse/discourse-simple-theme",
    preview: "https://theme-creator.discourse.org/theme/sam/simple",
    description: "Simplified front page design with classic colors and typography.",
    meta_url: "https://meta.discourse.org/t/sams-personal-minimal-topic-list-design/23552"
  }, {
    name: "Brand Header",
    value: "https://github.com/discourse/discourse-brand-header",
    description: "Add an extra top header with your logo, navigation links and social icons.",
    meta_url: "https://meta.discourse.org/t/brand-header-theme-component/77977",
    component: true
  }, {
    name: "Custom Header Links",
    value: "https://github.com/discourse/discourse-custom-header-links",
    preview: "https://theme-creator.discourse.org/theme/Johani/custom-header-links",
    description: "Easily add custom text-based links to the header.",
    meta_url: "https://meta.discourse.org/t/custom-header-links/90588",
    component: true
  }, {
    name: "Gifs Search",
    value: "https://github.com/discourse/discourse-gifs",
    description: "Adds a button to easily search and insert GIFs in posts.",
    meta_url: "https://meta.discourse.org/t/discourse-gifs-component/158738",
    component: true
  }, {
    name: "Category Banners",
    value: "https://github.com/discourse/discourse-category-banners",
    preview: "https://theme-creator.discourse.org/theme/awesomerobot/discourse-category-banners",
    description: "Show banners on category pages using your existing category details.",
    meta_url: "https://meta.discourse.org/t/discourse-category-banners/86241",
    component: true
  }, {
    name: "Kanban Board",
    value: "https://github.com/discourse/discourse-kanban-theme",
    preview: "https://theme-creator.discourse.org/theme/david/kanban",
    description: "Display and organize topics using a Kanban board interface.",
    meta_url: "https://meta.discourse.org/t/kanban-board-theme-component/118164",
    component: true
  }, {
    name: "Hamburger Theme Selector",
    value: "https://github.com/discourse/discourse-hamburger-theme-selector",
    description: "Displays a theme selector in the hamburger menu provided there is more than one user-selectable theme.",
    meta_url: "https://meta.discourse.org/t/hamburger-theme-selector/61210",
    component: true
  }, {
    name: "Header Submenus",
    value: "https://github.com/discourse/discourse-header-submenus",
    preview: "https://theme-creator.discourse.org/theme/Johani/header-submenus",
    description: "Lets you build a header menu with submenus (dropdowns).",
    meta_url: "https://meta.discourse.org/t/header-submenus/94584",
    component: true
  }, {
    name: "Automatic Table of Contents",
    value: "https://github.com/discourse/DiscoTOC",
    description: "Generates an interactive table of contents on the sidebar of your topic with a simple click in the composer.",
    meta_url: "https://meta.discourse.org/t/discotoc-automatic-table-of-contents/111143",
    component: true
  }, {
    name: "Easy Responsive Footer",
    value: "https://github.com/discourse/Discourse-easy-footer",
    preview: "https://theme-creator.discourse.org/theme/Johani/easy-footer",
    description: "Add a fully responsive footer without writing any HTML.",
    meta_url: "https://meta.discourse.org/t/easy-responsive-footer/95818",
    component: true
  }];
  _exports.POPULAR_THEMES = POPULAR_THEMES;
});
define("discourse-common/lib/attribute-hook", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

  // FROM: https://github.com/Matt-Esch/virtual-dom
  // License: MIT
  function AttributeHook(namespace, value) {
    if (!_instanceof(this, AttributeHook)) {
      return new AttributeHook(namespace, value);
    }

    this.namespace = namespace;
    this.value = value;
  }

  AttributeHook.prototype.hook = function (node, prop, prev) {
    if (prev && prev.type === "AttributeHook" && prev.value === this.value && prev.namespace === this.namespace) {
      return;
    }

    node.setAttributeNS(this.namespace, prop, this.value);
  };

  AttributeHook.prototype.unhook = function (node, prop, next) {
    if (next && next.type === "AttributeHook" && next.namespace === this.namespace) {
      return;
    }

    var colonPosition = prop.indexOf(":");
    var localName = colonPosition > -1 ? prop.substr(colonPosition + 1) : prop;
    node.removeAttributeNS(this.namespace, localName);
  };

  AttributeHook.prototype.type = "AttributeHook";
  var _default = AttributeHook;
  _exports.default = _default;
});
define("discourse-common/lib/debounce", ["exports", "@ember/runloop", "discourse-common/config/environment"], function (_exports, _runloop, _environment) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _default;

  /**
    Debounce a Javascript function. This means if it's called many times in a time limit it
    should only be executed once (at the end of the limit counted from the last call made).
    Original function will be called with the context and arguments from the last call made.
  **/
  var testingFunc = (0, _environment.isLegacyEmber)() ? _runloop.run : _runloop.next;

  function _default() {
    if ((0, _environment.isTesting)()) {
      return testingFunc.apply(void 0, arguments);
    } else {
      return _runloop.debounce.apply(void 0, arguments);
    }
  }
});
define("discourse-common/lib/deprecated", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = deprecated;

  function deprecated(msg) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    msg = ["Deprecation notice:", msg];

    if (opts.since) {
      msg.push("(deprecated since Discourse ".concat(opts.since, ")"));
    }

    if (opts.dropFrom) {
      msg.push("(removal in Discourse ".concat(opts.dropFrom, ")"));
    }

    msg = msg.join(" ");

    if (opts.raiseError) {
      throw msg;
    }

    console.warn(msg); // eslint-disable-line no-console
  }
});
define("discourse-common/lib/get-owner", ["exports", "@ember/application", "discourse-common/lib/deprecated"], function (_exports, _application, _deprecated) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.getOwner = getOwner;
  _exports.setDefaultOwner = setDefaultOwner;
  _exports.getRegister = getRegister;
  var _default = {};

  function getOwner(obj) {
    if (_application.getOwner) {
      return (0, _application.getOwner)(obj || _default) || (0, _application.getOwner)(_default);
    }

    return obj.container;
  }

  function setDefaultOwner(container) {
    (0, _application.setOwner)(_default, container);
  } // `this.container` is deprecated, but we can still build a container-like
  // object for components to use


  function getRegister(obj) {
    var owner = getOwner(obj);
    var register = {
      lookup: function lookup() {
        return owner.lookup.apply(owner, arguments);
      },
      lookupFactory: function lookupFactory() {
        if (owner.factoryFor) {
          return owner.factoryFor.apply(owner, arguments);
        } else if (owner._lookupFactory) {
          return owner._lookupFactory.apply(owner, arguments);
        }
      },
      deprecateContainer: function deprecateContainer(target) {
        Object.defineProperty(target, "container", {
          get: function get() {
            (0, _deprecated.default)("Use `this.register` or `getOwner` instead of `this.container`");
            return register;
          }
        });
      }
    };
    return register;
  }
});
define("discourse-common/lib/get-url", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = getURL;
  _exports.getURLWithCDN = getURLWithCDN;
  _exports.getAbsoluteURL = getAbsoluteURL;
  _exports.isAbsoluteURL = isAbsoluteURL;
  _exports.withoutPrefix = withoutPrefix;
  _exports.setPrefix = setPrefix;
  _exports.setupURL = setupURL;
  _exports.setupS3CDN = setupS3CDN;
  var cdn, baseUrl, baseUri;
  var S3BaseUrl, S3CDN;

  function getURL(url) {
    if (baseUri === undefined) {
      baseUri = $('meta[name="discourse-base-uri"]').attr("content") || "";
    }

    if (!url) {
      return baseUri === "/" ? "" : baseUri;
    } // if it's a non relative URL, return it.


    if (url !== "/" && !/^\/[^\/]/.test(url)) {
      return url;
    }

    var found = url.startsWith(baseUri);

    if (found) {
      return url;
    }

    if (url[0] !== "/") {
      url = "/" + url;
    }

    return baseUri + url;
  }

  function getURLWithCDN(url) {
    url = getURL(url); // only relative urls

    if (cdn && /^\/[^\/]/.test(url)) {
      url = cdn + url;
    } else if (S3CDN) {
      url = url.replace(S3BaseUrl, S3CDN);
    }

    return url;
  }

  function getAbsoluteURL(path) {
    return baseUrl + path;
  }

  function isAbsoluteURL(url) {
    return url.startsWith(baseUrl);
  }

  function withoutPrefix(path) {
    var rootURL = (!baseUri ? "/" : baseUri).replace(/\/$/, "");
    return path.replace(rootURL, "");
  }

  function setPrefix(configBaseUri) {
    baseUri = configBaseUri;
  }

  function setupURL(configCdn, configBaseUrl, configBaseUri) {
    cdn = configCdn;
    baseUrl = configBaseUrl;
    baseUri = configBaseUri;
  }

  function setupS3CDN(configS3BaseUrl, configS3CDN) {
    S3BaseUrl = configS3BaseUrl;
    S3CDN = configS3CDN;
  }
});
define("discourse-common/lib/helpers", ["exports", "@ember/component/helper", "discourse-common/lib/raw-handlebars", "@ember/object", "@ember/template"], function (_exports, _helper, _rawHandlebars, _object, _template) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.makeArray = makeArray;
  _exports.htmlHelper = htmlHelper;
  _exports.registerHelper = registerHelper;
  _exports.findHelper = findHelper;
  _exports.registerHelpers = registerHelpers;
  _exports.createHelperContext = createHelperContext;
  _exports.helperContext = helperContext;
  _exports.registerUnbound = registerUnbound;

  function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

  function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  function makeArray(obj) {
    if (obj === null || obj === undefined) {
      return [];
    }

    return Array.isArray(obj) ? obj : [obj];
  }

  function htmlHelper(fn) {
    return _helper.default.helper(function () {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      args = args.length > 1 ? args[0].concat({
        hash: args[args.length - 1]
      }) : args;
      return (0, _template.htmlSafe)(fn.apply(this, args) || "");
    });
  }

  var _helpers = {};

  function rawGet(ctx, property, options) {
    if (options.types && options.data.view) {
      var view = options.data.view;
      return view.getStream ? view.getStream(property).value() : view.getAttr(property);
    } else {
      return (0, _object.get)(ctx, property);
    }
  }

  function registerHelper(name, fn) {
    _helpers[name] = _helper.default.helper(fn);
  }

  function findHelper(name) {
    return _helpers[name] || _helpers[name.dasherize()];
  }

  function registerHelpers(registry) {
    Object.keys(_helpers).forEach(function (name) {
      registry.register("helper:".concat(name), _helpers[name], {
        singleton: false
      });
    });
  }

  var _helperContext;

  function createHelperContext(ctx) {
    _helperContext = ctx;
  } // This can be used by a helper to get the SiteSettings. Note you should not
  // be using it outside of helpers (or lib code that helpers use!)


  function helperContext() {
    return _helperContext;
  }

  function resolveParams(ctx, options) {
    var params = {};
    var hash = options.hash;

    if (hash) {
      if (options.hashTypes) {
        Object.keys(hash).forEach(function (k) {
          var type = options.hashTypes[k];

          if (type === "STRING" || type === "StringLiteral" || type === "SubExpression") {
            params[k] = hash[k];
          } else if (type === "ID" || type === "PathExpression") {
            params[k] = rawGet(ctx, hash[k], options);
          }
        });
      } else {
        params = hash;
      }
    }

    return params;
  }

  function registerUnbound(name, fn) {
    var func = function func() {
      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      var options = args.pop();
      var properties = args;

      for (var i = 0; i < properties.length; i++) {
        if (options.types && (options.types[i] === "ID" || options.types[i] === "PathExpression")) {
          properties[i] = rawGet(this, properties[i], options);
        }
      }

      return fn.call.apply(fn, [this].concat(properties, [resolveParams(this, options)]));
    };

    _helpers[name] = _helper.default.extend({
      compute: function compute(params, args) {
        return fn.apply(void 0, _toConsumableArray(params).concat([args]));
      }
    });

    _rawHandlebars.default.registerHelper(name, func);
  }
});
define("discourse-common/lib/icon-library", ["exports", "I18n", "discourse-common/lib/attribute-hook", "virtual-dom", "discourse-common/config/environment"], function (_exports, _I18n, _attributeHook, _virtualDom, _environment) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.replaceIcon = replaceIcon;
  _exports.disableMissingIconWarning = disableMissingIconWarning;
  _exports.enableMissingIconWarning = enableMissingIconWarning;
  _exports.renderIcon = renderIcon;
  _exports.iconHTML = iconHTML;
  _exports.iconNode = iconNode;
  _exports.convertIconClass = convertIconClass;
  _exports.registerIconRenderer = registerIconRenderer;
  _exports.setIconList = setIconList;
  _exports.isExistingIconId = isExistingIconId;
  var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  var _renderers = [];
  var warnMissingIcons = true;

  var _iconList;

  var REPLACEMENTS = {
    "d-tracking": "bell",
    "d-muted": "discourse-bell-slash",
    "d-regular": "far-bell",
    "d-watching": "discourse-bell-exclamation",
    "d-watching-first": "discourse-bell-one",
    "d-drop-expanded": "caret-down",
    "d-drop-collapsed": "caret-right",
    "d-unliked": "far-heart",
    "d-liked": "heart",
    "notification.mentioned": "at",
    "notification.group_mentioned": "users",
    "notification.quoted": "quote-right",
    "notification.replied": "reply",
    "notification.posted": "reply",
    "notification.edited": "pencil-alt",
    "notification.bookmark_reminder": "discourse-bookmark-clock",
    "notification.liked": "heart",
    "notification.liked_2": "heart",
    "notification.liked_many": "heart",
    "notification.liked_consolidated": "heart",
    "notification.private_message": "far-envelope",
    "notification.invited_to_private_message": "far-envelope",
    "notification.invited_to_topic": "hand-point-right",
    "notification.invitee_accepted": "user",
    "notification.moved_post": "sign-out-alt",
    "notification.linked": "link",
    "notification.granted_badge": "certificate",
    "notification.topic_reminder": "far-clock",
    "notification.watching_first_post": "discourse-bell-one",
    "notification.group_message_summary": "users",
    "notification.post_approved": "check",
    "notification.membership_request_accepted": "user-plus",
    "notification.membership_request_consolidated": "users",
    "notification.reaction": "bell",
    "notification.votes_released": "plus"
  };

  function replaceIcon(source, destination) {
    REPLACEMENTS[source] = destination;
  }

  function disableMissingIconWarning() {
    warnMissingIcons = false;
  }

  function enableMissingIconWarning() {
    warnMissingIcons = false;
  }

  function renderIcon(renderType, id, params) {
    for (var i = 0; i < _renderers.length; i++) {
      var renderer = _renderers[i];
      var rendererForType = renderer[renderType];

      if (rendererForType) {
        var icon = {
          id: id,
          replacementId: REPLACEMENTS[id]
        };
        var result = rendererForType(icon, params || {});

        if (result) {
          return result;
        }
      }
    }
  }

  function iconHTML(id, params) {
    return renderIcon("string", id, params);
  }

  function iconNode(id, params) {
    return renderIcon("node", id, params);
  }

  function convertIconClass(icon) {
    return icon.replace("far fa-", "far-").replace("fab fa-", "fab-").replace("fas fa-", "").replace("fa-", "").trim();
  }

  function registerIconRenderer(renderer) {
    _renderers.unshift(renderer);
  }

  function iconClasses(icon, params) {
    // "notification." is invalid syntax for classes, use replacement instead
    var dClass = icon.replacementId && icon.id.indexOf("notification.") > -1 ? icon.replacementId : icon.id;
    var classNames = "fa d-icon d-icon-".concat(dClass, " svg-icon");

    if (params && params["class"]) {
      classNames += " " + params["class"];
    }

    return classNames;
  }

  function setIconList(iconList) {
    _iconList = iconList;
  }

  function isExistingIconId(id) {
    return _iconList && _iconList.indexOf(id) >= 0;
  }

  function warnIfMissing(id) {
    if (warnMissingIcons && (0, _environment.isDevelopment)() && !isExistingIconId(id)) {
      console.warn("The icon \"".concat(id, "\" is missing from the SVG subset.")); // eslint-disable-line no-console
    }
  }

  function handleIconId(icon) {
    var id = icon.replacementId || icon.id || ""; // TODO: clean up "thumbtack unpinned" at source instead of here

    id = id.replace(" unpinned", "");
    warnIfMissing(id);
    return id;
  } // default resolver is font awesome


  registerIconRenderer({
    name: "font-awesome",
    string: function string(icon, params) {
      var id = handleIconId(icon);
      var html = "<svg class='".concat(iconClasses(icon, params), " svg-string'");

      if (params.label) {
        html += " aria-hidden='true'";
      }

      html += " xmlns=\"".concat(SVG_NAMESPACE, "\"><use xlink:href=\"#").concat(id, "\" /></svg>");

      if (params.label) {
        html += "<span class='sr-only'>".concat(params.label, "</span>");
      }

      if (params.title) {
        html = "<span class=\"svg-icon-title\" title='".concat(_I18n.default.t(params.title).replace(/'/g, "&#39;"), "'>").concat(html, "</span>");
      }

      if (params.translatedtitle) {
        html = "<span class=\"svg-icon-title\" title='".concat(params.translatedtitle.replace(/'/g, "&#39;"), "'>").concat(html, "</span>");
      }

      return html;
    },
    node: function node(icon, params) {
      var id = handleIconId(icon);
      var classes = iconClasses(icon, params) + " svg-node";
      var svg = (0, _virtualDom.h)("svg", {
        attributes: {
          class: classes,
          "aria-hidden": true
        },
        namespace: SVG_NAMESPACE
      }, [(0, _virtualDom.h)("use", {
        "xlink:href": (0, _attributeHook.default)("http://www.w3.org/1999/xlink", "#".concat(id)),
        namespace: SVG_NAMESPACE
      })]);

      if (params.title) {
        return (0, _virtualDom.h)("span", {
          title: params.title,
          attributes: {
            class: "svg-icon-title"
          }
        }, [svg]);
      } else {
        return svg;
      }
    }
  });
});
define("discourse-common/lib/object", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.deepMerge = deepMerge;
  _exports.deepEqual = deepEqual;
  _exports.cloneJSON = cloneJSON;

  function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

  function isObject(obj) {
    return obj && _typeof(obj) === "object";
  } // a fairly simple deep merge based on: https://gist.github.com/ahtcx/0cd94e62691f539160b32ecda18af3d6
  // note: this approach might reference the original object. If you mutate an object once you've deep
  // cloned it, say in a test, it might remain modified. Consider `cloneJSON` instead.


  function deepMerge() {
    function deepMergeInner(target, source) {
      Object.keys(source).forEach(function (key) {
        var targetValue = target[key];
        var sourceValue = source[key];

        if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
          target[key] = targetValue.concat(sourceValue);
        } else if (isObject(targetValue) && isObject(sourceValue)) {
          target[key] = deepMergeInner(Object.assign({}, targetValue), sourceValue);
        } else {
          target[key] = sourceValue;
        }
      });
      return target;
    }

    for (var _len = arguments.length, objects = new Array(_len), _key = 0; _key < _len; _key++) {
      objects[_key] = arguments[_key];
    }

    if (objects.some(function (object) {
      return object && !isObject(object);
    })) {
      throw new Error('deepMerge: all values should be of type "object"');
    }

    var target = objects.shift();
    var source;

    while (source = objects.shift()) {
      deepMergeInner(target, source || {});
    }

    return target;
  }

  function deepEqual(obj1, obj2) {
    if (obj1 === obj2) {
      return true;
    } else if (isObject(obj1) && isObject(obj2)) {
      if (Object.keys(obj1).length !== Object.keys(obj2).length) {
        return false;
      }

      for (var prop in obj1) {
        if (!deepEqual(obj1[prop], obj2[prop])) {
          return false;
        }
      }

      return true;
    }
  }

  function cloneJSON(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
});
define("discourse-common/lib/raw-handlebars-helpers", ["exports", "@ember/object"], function (_exports, _object) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.registerRawHelpers = registerRawHelpers;
  _exports.RUNTIME_OPTIONS = void 0;
  var RUNTIME_OPTIONS = {
    allowProtoPropertiesByDefault: true
  };
  _exports.RUNTIME_OPTIONS = RUNTIME_OPTIONS;

  function registerRawHelpers(hbs, handlebarsClass) {
    if (!hbs.helpers) {
      hbs.helpers = Object.create(handlebarsClass.helpers);
    }

    hbs.helpers["get"] = function (context, options) {
      if (!context || !options.contexts) {
        return;
      }

      if (typeof context !== "string") {
        return context;
      }

      var firstContext = options.contexts[0];
      var val = firstContext[context];

      if (context.toString().indexOf("controller.") === 0) {
        context = context.slice(context.indexOf(".") + 1);
      }

      return val === undefined ? (0, _object.get)(firstContext, context) : val;
    }; // #each .. in support (as format is transformed to this)


    hbs.registerHelper("each", function (localName, inKeyword, contextName, options) {
      if (typeof contextName === "undefined") {
        return;
      }

      var list = (0, _object.get)(this, contextName);
      var output = [];

      for (var i = 0; i < list.length; i++) {
        var innerContext = {};
        innerContext[localName] = list[i];
        output.push(options.fn(innerContext));
      }

      return output.join("");
    });

    function stringCompatHelper(fn) {
      var old = hbs.helpers[fn];

      hbs.helpers[fn] = function (context, options) {
        return old.apply(this, [hbs.helpers.get(context, options), options]);
      };
    } // HACK: Ensure that the variable is resolved only once.
    // The "get" function will be called twice because both `if` and `unless`
    // helpers are patched to resolve the variable and `unless` is implemented
    // as not `if`. For example, for {{#unless var}} will generate a stack
    // trace like:
    //
    // - patched-unless("var")  "var" is resolved to its value, val
    // - unless(val)            unless is implemented as !if
    // - !patched-if(val)       val is already resolved, but it is resolved again
    // - !if(???)               at this point, ??? usually stands for undefined
    //
    // The following code ensures that patched-unless will call `if` directly,
    // `patched-unless("var")` will return `!if(val)`.


    var oldIf = hbs.helpers["if"];

    hbs.helpers["unless"] = function (context, options) {
      return oldIf.apply(this, [hbs.helpers.get(context, options), {
        fn: options.inverse,
        inverse: options.fn,
        hash: options.hash
      }]);
    };

    stringCompatHelper("if");
    stringCompatHelper("with");
  }
});
define("discourse-common/lib/raw-handlebars", ["exports", "handlebars"], function (_exports, _handlebars) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.template = template;
  _exports.precompile = precompile;
  _exports.compile = compile;
  _exports.default = void 0;

  // This is a mechanism for quickly rendering templates which is Ember aware
  // templates are highly compatible with Ember so you don't need to worry about calling "get"
  // and discourseComputed properties function, additionally it uses stringParams like Ember does
  var RawHandlebars = _handlebars.default.create();

  function buildPath(blk, args) {
    var result = {
      type: "PathExpression",
      data: false,
      depth: blk.path.depth,
      loc: blk.path.loc
    }; // Server side precompile doesn't have jquery.extend

    Object.keys(args).forEach(function (a) {
      result[a] = args[a];
    });
    return result;
  }

  function replaceGet(ast) {
    var visitor = new _handlebars.default.Visitor();
    visitor.mutating = true;

    visitor.MustacheStatement = function (mustache) {
      if (!(mustache.params.length || mustache.hash)) {
        mustache.params[0] = mustache.path;
        mustache.path = buildPath(mustache, {
          parts: ["get"],
          original: "get",
          strict: true,
          falsy: true
        });
      }

      return _handlebars.default.Visitor.prototype.MustacheStatement.call(this, mustache);
    }; // rewrite `each x as |y|` as each y in x`
    // This allows us to use the same syntax in all templates


    visitor.BlockStatement = function (block) {
      if (block.path.original === "each" && block.params.length === 1) {
        var paramName = block.program.blockParams[0];
        block.params = [buildPath(block, {
          original: paramName
        }), {
          type: "CommentStatement",
          value: "in"
        }, block.params[0]];
        delete block.program.blockParams;
      }

      return _handlebars.default.Visitor.prototype.BlockStatement.call(this, block);
    };

    visitor.accept(ast);
  }

  if (_handlebars.default.Compiler) {
    RawHandlebars.Compiler = function () {};

    RawHandlebars.Compiler.prototype = Object.create(_handlebars.default.Compiler.prototype);
    RawHandlebars.Compiler.prototype.compiler = RawHandlebars.Compiler;

    RawHandlebars.JavaScriptCompiler = function () {};

    RawHandlebars.JavaScriptCompiler.prototype = Object.create(_handlebars.default.JavaScriptCompiler.prototype);
    RawHandlebars.JavaScriptCompiler.prototype.compiler = RawHandlebars.JavaScriptCompiler;
    RawHandlebars.JavaScriptCompiler.prototype.namespace = "RawHandlebars";

    RawHandlebars.precompile = function (value, asObject) {
      var ast = _handlebars.default.parse(value);

      replaceGet(ast);
      var options = {
        knownHelpers: {
          get: true
        },
        data: true,
        stringParams: true
      };
      asObject = asObject === undefined ? true : asObject;
      var environment = new RawHandlebars.Compiler().compile(ast, options);
      return new RawHandlebars.JavaScriptCompiler().compile(environment, options, undefined, asObject);
    };

    RawHandlebars.compile = function (string) {
      var ast = _handlebars.default.parse(string);

      replaceGet(ast); // this forces us to rewrite helpers

      var options = {
        data: true,
        stringParams: true
      };
      var environment = new RawHandlebars.Compiler().compile(ast, options);
      var templateSpec = new RawHandlebars.JavaScriptCompiler().compile(environment, options, undefined, true);
      var t = RawHandlebars.template(templateSpec);
      t.isMethod = false;
      return t;
    };
  }

  function template() {
    return RawHandlebars.template.apply(this, arguments);
  }

  function precompile() {
    return RawHandlebars.precompile.apply(this, arguments);
  }

  function compile() {
    return RawHandlebars.compile.apply(this, arguments);
  }

  var _default = RawHandlebars;
  _exports.default = _default;
});
define("discourse-common/lib/raw-templates", ["exports", "discourse-common/resolver"], function (_exports, _resolver) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.addRawTemplate = addRawTemplate;
  _exports.removeRawTemplate = removeRawTemplate;
  _exports.findRawTemplate = findRawTemplate;
  _exports.buildRawConnectorCache = buildRawConnectorCache;
  _exports.__DISCOURSE_RAW_TEMPLATES = void 0;
  var __DISCOURSE_RAW_TEMPLATES = {};
  _exports.__DISCOURSE_RAW_TEMPLATES = __DISCOURSE_RAW_TEMPLATES;

  function addRawTemplate(name, template) {
    __DISCOURSE_RAW_TEMPLATES[name] = template;
  }

  function removeRawTemplate(name) {
    delete __DISCOURSE_RAW_TEMPLATES[name];
  }

  function findRawTemplate(name) {
    if ((0, _resolver.getResolverOption)("mobileView")) {
      return __DISCOURSE_RAW_TEMPLATES["javascripts/mobile/".concat(name)] || __DISCOURSE_RAW_TEMPLATES["javascripts/".concat(name)] || __DISCOURSE_RAW_TEMPLATES["mobile/".concat(name)] || __DISCOURSE_RAW_TEMPLATES[name];
    }

    return __DISCOURSE_RAW_TEMPLATES["javascripts/".concat(name)] || __DISCOURSE_RAW_TEMPLATES[name];
  }

  function buildRawConnectorCache(findOutlets) {
    var result = {};
    findOutlets(__DISCOURSE_RAW_TEMPLATES, function (outletName, resource) {
      result[outletName] = result[outletName] || [];
      result[outletName].push({
        template: __DISCOURSE_RAW_TEMPLATES[resource]
      });
    });
    return result;
  }
});
define("discourse-common/resolver", ["exports", "@ember/string", "discourse-common/lib/deprecated", "discourse-common/lib/helpers", "@ember/object"], function (_exports, _string, _deprecated, _helpers, _object) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.setResolverOption = setResolverOption;
  _exports.getResolverOption = getResolverOption;
  _exports.buildResolver = buildResolver;

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  var _options = {};

  function setResolverOption(name, value) {
    _options[name] = value;
  }

  function getResolverOption(name) {
    return _options[name];
  }

  function parseName(fullName) {
    var nameParts = fullName.split(":");
    var type = nameParts[0];
    var fullNameWithoutType = nameParts[1];
    var namespace = (0, _object.get)(this, "namespace");
    var root = namespace;
    return {
      fullName: fullName,
      type: type,
      fullNameWithoutType: fullNameWithoutType,
      name: fullNameWithoutType,
      root: root,
      resolveMethodName: "resolve" + (0, _string.classify)(type)
    };
  }

  function buildResolver(baseName) {
    return Ember.DefaultResolver.extend({
      parseName: parseName,
      resolveRouter: function resolveRouter(parsedName) {
        var routerPath = "".concat(baseName, "/router");

        if (requirejs.entries[routerPath]) {
          var module = requirejs(routerPath, null, null, true);
          return module.default;
        }

        return this._super(parsedName);
      },
      normalize: function normalize(fullName) {
        if (fullName === "app-events:main") {
          (0, _deprecated.default)("`app-events:main` has been replaced with `service:app-events`", {
            since: "2.4.0"
          });
          return "service:app-events";
        }

        for (var _i = 0, _Object$entries = Object.entries({
          "controller:discovery.categoryWithID": "controller:discovery.category",
          "controller:discovery.parentCategory": "controller:discovery.category",
          "controller:tags-show": "controller:tag-show",
          "controller:tags.show": "controller:tag.show",
          "controller:tagsShow": "controller:tagShow",
          "route:discovery.categoryWithID": "route:discovery.category",
          "route:discovery.parentCategory": "route:discovery.category",
          "route:tags-show": "route:tag-show",
          "route:tags.show": "route:tag.show",
          "route:tagsShow": "route:tagShow"
        }); _i < _Object$entries.length; _i++) {
          var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
              key = _Object$entries$_i[0],
              value = _Object$entries$_i[1];

          if (fullName === key) {
            (0, _deprecated.default)("".concat(key, " was replaced with ").concat(value), {
              since: "2.6.0"
            });
            return value;
          }
        }

        var split = fullName.split(":");

        if (split.length > 1) {
          var appBase = "".concat(baseName, "/").concat(split[0], "s/");
          var adminBase = "admin/" + split[0] + "s/"; // Allow render 'admin/templates/xyz' too

          split[1] = split[1].replace(".templates", "").replace("/templates", ""); // Try slashes

          var dashed = (0, _string.dasherize)(split[1].replace(/\./g, "/"));

          if (requirejs.entries[appBase + dashed] || requirejs.entries[adminBase + dashed]) {
            return split[0] + ":" + dashed;
          } // Try with dashes instead of slashes


          dashed = (0, _string.dasherize)(split[1].replace(/\./g, "-"));

          if (requirejs.entries[appBase + dashed] || requirejs.entries[adminBase + dashed]) {
            return split[0] + ":" + dashed;
          }
        }

        return this._super(fullName);
      },
      customResolve: function customResolve(parsedName) {
        // If we end with the name we want, use it. This allows us to define components within plugins.
        var suffix = parsedName.type + "s/" + parsedName.fullNameWithoutType,
            dashed = (0, _string.dasherize)(suffix),
            moduleName = Object.keys(requirejs.entries).find(function (e) {
          return e.indexOf("/templates/") === -1 && (e.indexOf(suffix, e.length - suffix.length) !== -1 || e.indexOf(dashed, e.length - dashed.length) !== -1);
        });
        var module;

        if (moduleName) {
          module = requirejs(moduleName, null, null, true
          /* force sync */
          );

          if (module && module["default"]) {
            module = module["default"];
          }
        }

        return module;
      },
      resolveWidget: function resolveWidget(parsedName) {
        return this.customResolve(parsedName) || this._super(parsedName);
      },
      resolveAdapter: function resolveAdapter(parsedName) {
        return this.customResolve(parsedName) || this._super(parsedName);
      },
      resolveModel: function resolveModel(parsedName) {
        return this.customResolve(parsedName) || this._super(parsedName);
      },
      resolveView: function resolveView(parsedName) {
        return this.customResolve(parsedName) || this._super(parsedName);
      },
      resolveHelper: function resolveHelper(parsedName) {
        return (0, _helpers.findHelper)(parsedName.fullNameWithoutType) || this.customResolve(parsedName) || this._super(parsedName);
      },
      resolveController: function resolveController(parsedName) {
        return this.customResolve(parsedName) || this._super(parsedName);
      },
      resolveComponent: function resolveComponent(parsedName) {
        return this.customResolve(parsedName) || this._super(parsedName);
      },
      resolveService: function resolveService(parsedName) {
        return this.customResolve(parsedName) || this._super(parsedName);
      },
      resolveRoute: function resolveRoute(parsedName) {
        if (parsedName.fullNameWithoutType === "basic") {
          return requirejs("discourse/routes/discourse", null, null, true).default;
        }

        return this.customResolve(parsedName) || this._super(parsedName);
      },
      findLoadingTemplate: function findLoadingTemplate(parsedName) {
        if (parsedName.fullNameWithoutType.match(/loading$/)) {
          return Ember.TEMPLATES.loading;
        }
      },
      findConnectorTemplate: function findConnectorTemplate(parsedName) {
        var full = parsedName.fullNameWithoutType.replace("components/", "");

        if (full.indexOf("connectors") === 0) {
          return Ember.TEMPLATES["javascripts/".concat(full)];
        }
      },
      resolveTemplate: function resolveTemplate(parsedName) {
        return this.findPluginMobileTemplate(parsedName) || this.findPluginTemplate(parsedName) || this.findMobileTemplate(parsedName) || this.findTemplate(parsedName) || this.findLoadingTemplate(parsedName) || this.findConnectorTemplate(parsedName) || Ember.TEMPLATES.not_found;
      },
      findPluginTemplate: function findPluginTemplate(parsedName) {
        var pluginParsedName = this.parseName(parsedName.fullName.replace("template:", "template:javascripts/"));
        return this.findTemplate(pluginParsedName);
      },
      findPluginMobileTemplate: function findPluginMobileTemplate(parsedName) {
        if (_options.mobileView) {
          var pluginParsedName = this.parseName(parsedName.fullName.replace("template:", "template:javascripts/mobile/"));
          return this.findTemplate(pluginParsedName);
        }
      },
      findMobileTemplate: function findMobileTemplate(parsedName) {
        if (_options.mobileView) {
          var mobileParsedName = this.parseName(parsedName.fullName.replace("template:", "template:mobile/"));
          return this.findTemplate(mobileParsedName);
        }
      },
      findTemplate: function findTemplate(parsedName) {
        var withoutType = parsedName.fullNameWithoutType,
            slashedType = withoutType.replace(/\./g, "/"),
            decamelized = withoutType.decamelize(),
            dashed = decamelized.replace(/\./g, "-").replace(/\_/g, "-"),
            templates = Ember.TEMPLATES;
        return this._super(parsedName) || templates[slashedType] || templates[withoutType] || templates[withoutType.replace(/\.raw$/, "")] || templates[dashed] || templates[decamelized.replace(/\./, "/")] || templates[decamelized.replace(/\_/, "/")] || templates["".concat(baseName, "/templates/").concat(withoutType)] || this.findAdminTemplate(parsedName) || this.findUnderscoredTemplate(parsedName);
      },
      findUnderscoredTemplate: function findUnderscoredTemplate(parsedName) {
        var decamelized = parsedName.fullNameWithoutType.decamelize();
        var underscored = decamelized.replace(/\-/g, "_");
        return Ember.TEMPLATES[underscored];
      },
      // Try to find a template within a special admin namespace, e.g. adminEmail => admin/templates/email
      // (similar to how discourse lays out templates)
      findAdminTemplate: function findAdminTemplate(parsedName) {
        var decamelized = parsedName.fullNameWithoutType.decamelize();

        if (decamelized.indexOf("components") === 0) {
          var comPath = "admin/templates/".concat(decamelized);
          var compTemplate = Ember.TEMPLATES["javascripts/".concat(comPath)] || Ember.TEMPLATES[comPath];

          if (compTemplate) {
            return compTemplate;
          }
        }

        if (decamelized === "javascripts/admin") {
          return Ember.TEMPLATES["admin/templates/admin"];
        }

        if (decamelized.indexOf("admin") === 0 || decamelized.indexOf("javascripts/admin") === 0) {
          decamelized = decamelized.replace(/^admin\_/, "admin/templates/");
          decamelized = decamelized.replace(/^admin\./, "admin/templates/");
          decamelized = decamelized.replace(/\./g, "_");
          var dashed = decamelized.replace(/_/g, "-");
          return Ember.TEMPLATES[decamelized] || Ember.TEMPLATES[dashed] || Ember.TEMPLATES[dashed.replace("admin-", "admin/")];
        }
      }
    });
  }
});
define("discourse-common/utils/decorator-alias", ["exports", "discourse-common/utils/extract-value"], function (_exports, _extractValue) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = decoratorAlias;

  function decoratorAlias(fn, errorMessage) {
    return function () {
      for (var _len = arguments.length, params = new Array(_len), _key = 0; _key < _len; _key++) {
        params[_key] = arguments[_key];
      }

      // determine if user called as @discourseComputed('blah', 'blah') or @discourseComputed
      if (params.length === 0) {
        throw new Error(errorMessage);
      } else {
        return function (target, key, desc) {
          return {
            enumerable: desc.enumerable,
            configurable: desc.configurable,
            writable: desc.writable,
            initializer: function initializer() {
              var value = (0, _extractValue.default)(desc);
              return fn.apply(null, params.concat(value));
            }
          };
        };
      }
    };
  }
});
define("discourse-common/utils/decorators", ["exports", "@ember/runloop", "discourse-common/utils/decorator-alias", "discourse-common/utils/extract-value", "discourse-common/utils/handle-descriptor", "discourse-common/utils/is-descriptor", "discourse-common/utils/macro-alias"], function (_exports, _runloop, _decoratorAlias, _extractValue, _handleDescriptor, _isDescriptor, _macroAlias) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = discourseComputedDecorator;
  _exports.afterRender = afterRender;
  _exports.bind = bind;
  _exports.readOnly = readOnly;
  _exports.uniq = _exports.union = _exports.sum = _exports.sort = _exports.setDiff = _exports.reads = _exports.or = _exports.oneWay = _exports.notEmpty = _exports.not = _exports.none = _exports.min = _exports.max = _exports.match = _exports.mapBy = _exports.map = _exports.lte = _exports.lt = _exports.gte = _exports.gt = _exports.filterBy = _exports.filter = _exports.equal = _exports.empty = _exports.collect = _exports.bool = _exports.and = _exports.alias = _exports.observes = _exports.on = void 0;

  function discourseComputedDecorator() {
    for (var _len = arguments.length, params = new Array(_len), _key = 0; _key < _len; _key++) {
      params[_key] = arguments[_key];
    }

    // determine if user called as @discourseComputed('blah', 'blah') or @discourseComputed
    if ((0, _isDescriptor.default)(params[params.length - 1])) {
      return _handleDescriptor.default.apply(void 0, arguments);
    } else {
      return function ()
      /* target, key, desc */
      {
        return _handleDescriptor.default.apply(void 0, Array.prototype.slice.call(arguments).concat([params]));
      };
    }
  }

  function afterRender(target, name, descriptor) {
    var originalFunction = descriptor.value;

    descriptor.value = function () {
      var _arguments = arguments,
          _this = this;

      (0, _runloop.next)(function () {
        (0, _runloop.schedule)("afterRender", function () {
          if (_this.element && !_this.isDestroying && !_this.isDestroyed) {
            return originalFunction.apply(_this, _arguments);
          }
        });
      });
    };
  }

  function bind(target, name, descriptor) {
    return {
      configurable: true,
      get: function get() {
        var bound = (0, _runloop.bind)(this, descriptor.value);
        var attributes = Object.assign({}, descriptor, {
          value: bound
        });
        Object.defineProperty(this, name, attributes);
        return bound;
      }
    };
  }

  function readOnly(target, name, desc) {
    return {
      writable: false,
      enumerable: desc.enumerable,
      configurable: desc.configurable,
      initializer: function initializer() {
        var value = (0, _extractValue.default)(desc);
        return value.readOnly();
      }
    };
  }
  /* eslint-disable */


  var on = (0, _decoratorAlias.default)(Ember.on, "Can not `on` without event names");
  _exports.on = on;
  var observes = (0, _decoratorAlias.default)(Ember.observer, "Can not `observe` without property names");
  _exports.observes = observes;
  var alias = (0, _macroAlias.default)(Ember.computed.alias);
  _exports.alias = alias;
  var and = (0, _macroAlias.default)(Ember.computed.and);
  _exports.and = and;
  var bool = (0, _macroAlias.default)(Ember.computed.bool);
  _exports.bool = bool;
  var collect = (0, _macroAlias.default)(Ember.computed.collect);
  _exports.collect = collect;
  var empty = (0, _macroAlias.default)(Ember.computed.empty);
  _exports.empty = empty;
  var equal = (0, _macroAlias.default)(Ember.computed.equal);
  _exports.equal = equal;
  var filter = (0, _macroAlias.default)(Ember.computed.filter);
  _exports.filter = filter;
  var filterBy = (0, _macroAlias.default)(Ember.computed.filterBy);
  _exports.filterBy = filterBy;
  var gt = (0, _macroAlias.default)(Ember.computed.gt);
  _exports.gt = gt;
  var gte = (0, _macroAlias.default)(Ember.computed.gte);
  _exports.gte = gte;
  var lt = (0, _macroAlias.default)(Ember.computed.lt);
  _exports.lt = lt;
  var lte = (0, _macroAlias.default)(Ember.computed.lte);
  _exports.lte = lte;
  var map = (0, _macroAlias.default)(Ember.computed.map);
  _exports.map = map;
  var mapBy = (0, _macroAlias.default)(Ember.computed.mapBy);
  _exports.mapBy = mapBy;
  var match = (0, _macroAlias.default)(Ember.computed.match);
  _exports.match = match;
  var max = (0, _macroAlias.default)(Ember.computed.max);
  _exports.max = max;
  var min = (0, _macroAlias.default)(Ember.computed.min);
  _exports.min = min;
  var none = (0, _macroAlias.default)(Ember.computed.none);
  _exports.none = none;
  var not = (0, _macroAlias.default)(Ember.computed.not);
  _exports.not = not;
  var notEmpty = (0, _macroAlias.default)(Ember.computed.notEmpty);
  _exports.notEmpty = notEmpty;
  var oneWay = (0, _macroAlias.default)(Ember.computed.oneWay);
  _exports.oneWay = oneWay;
  var or = (0, _macroAlias.default)(Ember.computed.or);
  _exports.or = or;
  var reads = (0, _macroAlias.default)(Ember.computed.reads);
  _exports.reads = reads;
  var setDiff = (0, _macroAlias.default)(Ember.computed.setDiff);
  _exports.setDiff = setDiff;
  var sort = (0, _macroAlias.default)(Ember.computed.sort);
  _exports.sort = sort;
  var sum = (0, _macroAlias.default)(Ember.computed.sum);
  _exports.sum = sum;
  var union = (0, _macroAlias.default)(Ember.computed.union);
  _exports.union = union;
  var uniq = (0, _macroAlias.default)(Ember.computed.uniq);
  _exports.uniq = uniq;
});
define("discourse-common/utils/extract-value", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = extractValue;

  function extractValue(desc) {
    return desc.value || typeof desc.initializer === "function" && desc.initializer();
  }
});
define("discourse-common/utils/handle-descriptor", ["exports", "@ember/object", "./extract-value"], function (_exports, _object, _extractValue) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = handleDescriptor;

  function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

  function handleDescriptor(target, key, desc) {
    var params = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
    return {
      enumerable: desc.enumerable,
      configurable: desc.configurable,
      writeable: desc.writeable,
      initializer: function initializer() {
        var computedDescriptor;

        if (desc.writable) {
          var val = (0, _extractValue.default)(desc);

          if (_typeof(val) === "object") {
            var value = {};

            if (val.get) {
              value.get = callUserSuppliedGet(params, val.get);
            }

            if (val.set) {
              value.set = callUserSuppliedSet(params, val.set);
            }

            computedDescriptor = value;
          } else {
            computedDescriptor = callUserSuppliedGet(params, val);
          }
        } else {
          throw new Error("ember-computed-decorators does not support using getters and setters");
        }

        return _object.computed.apply(null, params.concat(computedDescriptor));
      }
    };
  }

  function niceAttr(attr) {
    var parts = attr.split(".");
    var i;

    for (i = 0; i < parts.length; i++) {
      if (parts[i] === "@each" || parts[i] === "[]" || parts[i].indexOf("{") !== -1) {
        break;
      }
    }

    return parts.slice(0, i).join(".");
  }

  function callUserSuppliedGet(params, func) {
    params = params.map(niceAttr);
    return function () {
      var _this = this;

      var paramValues = params.map(function (p) {
        return (0, _object.get)(_this, p);
      });
      return func.apply(this, paramValues);
    };
  }

  function callUserSuppliedSet(params, func) {
    params = params.map(niceAttr);
    return function (key, value) {
      var _this2 = this;

      var paramValues = params.map(function (p) {
        return (0, _object.get)(_this2, p);
      });
      paramValues.unshift(value);
      return func.apply(this, paramValues);
    };
  }
});
define("discourse-common/utils/is-descriptor", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = isDescriptor;

  function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

  function isDescriptor(item) {
    return item && _typeof(item) === "object" && "writable" in item && "enumerable" in item && "configurable" in item;
  }
});
define("discourse-common/utils/macro-alias", ["exports", "discourse-common/utils/is-descriptor"], function (_exports, _isDescriptor) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = macroAlias;

  function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

  function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  function handleDescriptor(target, property, desc, fn) {
    var params = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : [];
    return {
      enumerable: desc.enumerable,
      configurable: desc.configurable,
      writable: desc.writable,
      initializer: function initializer() {
        return fn.apply(void 0, _toConsumableArray(params));
      }
    };
  }

  function macroAlias(fn) {
    return function () {
      for (var _len = arguments.length, params = new Array(_len), _key = 0; _key < _len; _key++) {
        params[_key] = arguments[_key];
      }

      if ((0, _isDescriptor.default)(params[params.length - 1])) {
        return handleDescriptor.apply(void 0, params.concat([fn]));
      } else {
        return function (target, property, desc) {
          return handleDescriptor(target, property, desc, fn, params);
        };
      }
    };
  }
});
define("select-kit/components/categories-admin-dropdown", ["exports", "select-kit/components/dropdown-select-box", "I18n", "@ember/object", "discourse/lib/computed"], function (_exports, _dropdownSelectBox, _I18n, _object, _computed) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _dropdownSelectBox.default.extend({
    pluginApiIdentifiers: ["categories-admin-dropdown"],
    classNames: ["categories-admin-dropdown"],
    fixedCateoryPositions: (0, _computed.setting)("fixed_category_positions"),
    selectKitOptions: {
      icon: "bars",
      showFullTitle: false,
      autoFilterable: false,
      filterable: false,
      none: "select_kit.components.categories_admin_dropdown.title"
    },
    content: (0, _object.computed)(function () {
      var items = [{
        id: "create",
        name: _I18n.default.t("category.create"),
        description: _I18n.default.t("category.create_long"),
        icon: "plus"
      }];

      if (this.fixedCateoryPositions) {
        items.push({
          id: "reorder",
          name: _I18n.default.t("categories.reorder.title"),
          description: _I18n.default.t("categories.reorder.title_long"),
          icon: "random"
        });
      }

      return items;
    }),
    _onChange: function _onChange(value, item) {
      if (item.onChange) {
        item.onChange(value, item);
      } else if (this.attrs.onChange) {
        this.attrs.onChange(value, item);
      }
    }
  });

  _exports.default = _default;
});
define("select-kit/components/category-chooser", ["exports", "@ember/object", "discourse/models/category", "select-kit/components/combo-box", "I18n", "discourse/models/permission-type", "discourse/helpers/category-link", "@ember/utils", "discourse/lib/computed"], function (_exports, _object, _category, _comboBox, _I18n, _permissionType, _categoryLink, _utils, _computed) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _comboBox.default.extend({
    pluginApiIdentifiers: ["category-chooser"],
    classNames: ["category-chooser"],
    allowUncategorizedTopics: (0, _computed.setting)("allow_uncategorized_topics"),
    fixedCategoryPositionsOnCreate: (0, _computed.setting)("fixed_category_positions_on_create"),
    selectKitOptions: {
      filterable: true,
      allowUncategorized: false,
      allowSubCategories: true,
      permissionType: _permissionType.default.FULL,
      excludeCategoryId: null,
      scopedCategoryId: null
    },
    modifyComponentForRow: function modifyComponentForRow() {
      return "category-row";
    },
    modifyNoSelection: function modifyNoSelection() {
      if (!(0, _utils.isNone)(this.selectKit.options.none)) {
        var none = this.selectKit.options.none;
        var isString = typeof none === "string";
        return this.defaultItem(null, _I18n.default.t(isString ? this.selectKit.options.none : "category.none").htmlSafe());
      } else if (this.allowUncategorizedTopics || this.selectKit.options.allowUncategorized) {
        return _category.default.findUncategorized();
      } else {
        return this.defaultItem(null, _I18n.default.t("category.choose").htmlSafe());
      }
    },
    modifySelection: function modifySelection(content) {
      if (this.selectKit.hasSelection) {
        var category = _category.default.findById(this.value);

        (0, _object.set)(content, "label", (0, _categoryLink.categoryBadgeHTML)(category, {
          link: false,
          hideParent: category ? !!category.parent_category_id : true,
          allowUncategorized: true,
          recursive: true
        }).htmlSafe());
      }

      return content;
    },
    search: function search(filter) {
      var _this = this;

      if (filter) {
        filter = this._normalize(filter);
        return this.content.filter(function (item) {
          var category = _category.default.findById(_this.getValue(item));

          var categoryName = _this.getName(item);

          if (category && category.parentCategory) {
            var parentCategoryName = _this.getName(category.parentCategory);

            return _this._matchCategory(filter, categoryName) || _this._matchCategory(filter, parentCategoryName);
          } else {
            return _this._matchCategory(filter, categoryName);
          }
        });
      } else {
        return this.content;
      }
    },
    content: (0, _object.computed)("selectKit.filter", "selectKit.options.scopedCategoryId", function () {
      if (!this.selectKit.filter && this.selectKit.options.scopedCategoryId) {
        return this.categoriesByScope(this.selectKit.options.scopedCategoryId);
      } else {
        return this.categoriesByScope();
      }
    }),
    categoriesByScope: function categoriesByScope() {
      var _this2 = this;

      var scopedCategoryId = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var categories = this.fixedCategoryPositionsOnCreate ? _category.default.list() : _category.default.listByActivity();

      if (scopedCategoryId) {
        var scopedCat = _category.default.findById(scopedCategoryId);

        scopedCategoryId = scopedCat.parent_category_id || scopedCat.id;
      }

      var excludeCategoryId = this.selectKit.options.excludeCategoryId;
      return categories.filter(function (category) {
        var categoryId = _this2.getValue(category);

        if (scopedCategoryId && categoryId !== scopedCategoryId && category.parent_category_id !== scopedCategoryId) {
          return false;
        }

        if (_this2.selectKit.options.allowSubCategories === false && category.parentCategory) {
          return false;
        }

        if (_this2.selectKit.options.allowUncategorized === false && category.isUncategorizedCategory || excludeCategoryId === categoryId) {
          return false;
        }

        var permissionType = _this2.selectKit.options.permissionType;

        if (permissionType && !_this2.allowRestrictedCategories) {
          return permissionType === category.permission;
        }

        return true;
      });
    },
    _matchCategory: function _matchCategory(filter, categoryName) {
      return this._normalize(categoryName).indexOf(filter) > -1;
    }
  });

  _exports.default = _default;
});
define("select-kit/components/category-drop", ["exports", "discourse/models/category", "select-kit/components/combo-box", "discourse/lib/url", "I18n", "discourse/helpers/category-link", "@ember/object", "discourse-common/lib/get-url", "@ember/object/computed"], function (_exports, _category2, _comboBox, _url, _I18n, _categoryLink, _object, _getUrl, _computed) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _exports.ALL_CATEGORIES_ID = _exports.NO_CATEGORIES_ID = void 0;
  var NO_CATEGORIES_ID = "no-categories";
  _exports.NO_CATEGORIES_ID = NO_CATEGORIES_ID;
  var ALL_CATEGORIES_ID = "all-categories";
  _exports.ALL_CATEGORIES_ID = ALL_CATEGORIES_ID;

  var _default = _comboBox.default.extend({
    pluginApiIdentifiers: ["category-drop"],
    classNameBindings: ["categoryStyle"],
    classNames: ["category-drop"],
    value: (0, _computed.readOnly)("category.id"),
    content: (0, _computed.readOnly)("categoriesWithShortcuts.[]"),
    tagName: "li",
    categoryStyle: (0, _computed.readOnly)("siteSettings.category_style"),
    noCategoriesLabel: _I18n.default.t("categories.no_subcategory"),
    selectKitOptions: {
      filterable: true,
      none: "category.all",
      caretDownIcon: "caret-right",
      caretUpIcon: "caret-down",
      fullWidthOnMobile: true,
      noSubcategories: false,
      subCategory: false,
      clearable: false,
      hideParentCategory: "hideParentCategory",
      countSubcategories: false,
      autoInsertNoneItem: false,
      displayCategoryDescription: "displayCategoryDescription",
      headerComponent: "category-drop/category-drop-header"
    },
    modifyComponentForRow: function modifyComponentForRow() {
      return "category-row";
    },
    displayCategoryDescription: (0, _object.computed)(function () {
      return !(this.get("currentUser.staff") || this.get("currentUser.trust_level") > 0);
    }),
    hideParentCategory: (0, _object.computed)(function () {
      return this.options.subCategory || false;
    }),
    categoriesWithShortcuts: (0, _object.computed)("categories.[]", "value", "selectKit.options.{subCategory,noSubcategories}", function () {
      var shortcuts = [];

      if (this.value || this.selectKit.options.noSubcategories && this.selectKit.options.subCategory) {
        shortcuts.push({
          id: ALL_CATEGORIES_ID,
          name: this.allCategoriesLabel
        });
      }

      if (this.selectKit.options.subCategory && (this.value || !this.selectKit.options.noSubcategories)) {
        shortcuts.push({
          id: NO_CATEGORIES_ID,
          name: this.noCategoriesLabel
        });
      }

      var results = this._filterUncategorized(this.categories || []);

      return shortcuts.concat(results);
    }),
    modifyNoSelection: function modifyNoSelection() {
      if (this.selectKit.options.noSubcategories) {
        return this.defaultItem(NO_CATEGORIES_ID, this.noCategoriesLabel);
      } else {
        return this.defaultItem(ALL_CATEGORIES_ID, this.allCategoriesLabel);
      }
    },
    modifySelection: function modifySelection(content) {
      if (this.value) {
        var category = _category2.default.findById(this.value);

        content.title = category.title;
        content.label = (0, _categoryLink.categoryBadgeHTML)(category, {
          link: false,
          allowUncategorized: true,
          hideParent: true
        }).htmlSafe();
      }

      return content;
    },
    parentCategoryName: (0, _computed.readOnly)("selectKit.options.parentCategory.name"),
    parentCategoryUrl: (0, _computed.readOnly)("selectKit.options.parentCategory.url"),
    allCategoriesLabel: (0, _object.computed)("parentCategoryName", "selectKit.options.subCategory", function () {
      if (this.selectKit.options.subCategory) {
        return _I18n.default.t("categories.all_subcategories", {
          categoryName: this.parentCategoryName
        });
      }

      return _I18n.default.t("categories.all");
    }),
    allCategoriesUrl: (0, _object.computed)("parentCategoryUrl", "selectKit.options.subCategory", function () {
      return (0, _getUrl.default)(this.selectKit.options.subCategory ? "".concat(this.parentCategoryUrl, "/all") || "/" : "/");
    }),
    noCategoriesUrl: (0, _object.computed)("parentCategoryUrl", function () {
      return (0, _getUrl.default)("".concat(this.parentCategoryUrl, "/none"));
    }),
    search: function search(filter) {
      if (filter) {
        var results = _category2.default.search(filter);

        results = this._filterUncategorized(results).sort(function (a, b) {
          if (a.parent_category_id && !b.parent_category_id) {
            return 1;
          } else if (!a.parent_category_id && b.parent_category_id) {
            return -1;
          } else {
            return 0;
          }
        });
        return results;
      } else {
        return this._filterUncategorized(this.content);
      }
    },
    actions: {
      onChange: function onChange(categoryId) {
        var categoryURL;

        if (this.tagId && !this.category) {
          var category = _category2.default.findById(parseInt(categoryId, 10));

          categoryURL = (0, _getUrl.default)("/tags/c/".concat(_category2.default.slugFor(category), "/").concat(category.id, "/").concat(this.tagId.toLowerCase()));
        } else if (categoryId === ALL_CATEGORIES_ID) {
          categoryURL = this.allCategoriesUrl;
        } else if (categoryId === NO_CATEGORIES_ID) {
          categoryURL = this.noCategoriesUrl;
        } else {
          var _category = _category2.default.findById(parseInt(categoryId, 10));

          categoryURL = _category.url;
        }

        _url.default.routeToUrl(categoryURL);

        return false;
      }
    },
    _filterUncategorized: function _filterUncategorized(content) {
      var _this = this;

      if (!this.siteSettings.allow_uncategorized_topics) {
        content = content.filter(function (c) {
          return c.id !== _this.site.uncategorized_category_id;
        });
      }

      return content;
    }
  });

  _exports.default = _default;
});
define("select-kit/components/category-drop/category-drop-header", ["exports", "select-kit/components/combo-box/combo-box-header", "discourse-common/utils/decorators", "select-kit/templates/components/category-drop/category-drop-header", "@ember/object/computed", "@ember/runloop"], function (_exports, _comboBoxHeader, _decorators, _categoryDropHeader, _computed, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _dec3, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _comboBoxHeader.default.extend((_dec = (0, _decorators.default)("selectedContent.color"), _dec2 = (0, _decorators.default)("selectedContent.text_color"), _dec3 = (0, _decorators.default)("selectedContent", "categoryBackgroundColor", "categoryTextColor"), (_obj = {
    layout: _categoryDropHeader.default,
    classNames: ["category-drop-header"],
    classNameBindings: ["categoryStyleClass"],
    categoryStyleClass: (0, _computed.readOnly)("site.category_style"),
    categoryBackgroundColor: function categoryBackgroundColor(categoryColor) {
      return categoryColor || "#e9e9e9";
    },
    categoryTextColor: function categoryTextColor(_categoryTextColor) {
      return _categoryTextColor || "#333";
    },
    categoryStyle: function categoryStyle(category, categoryBackgroundColor, categoryTextColor) {
      var categoryStyle = this.siteSettings.category_style;

      if (categoryStyle === "bullet") {
        return;
      }

      if (category) {
        if (categoryBackgroundColor || categoryTextColor) {
          var style = "";

          if (categoryBackgroundColor) {
            if (categoryStyle === "box") {
              style += "border-color: #".concat(categoryBackgroundColor, "; background-color: #").concat(categoryBackgroundColor, ";");

              if (categoryTextColor) {
                style += "color: #".concat(categoryTextColor, ";");
              }
            }
          }

          return style.htmlSafe();
        }
      }
    },
    didInsertElement: function didInsertElement() {
      var _this = this;

      this._super.apply(this, arguments);

      (0, _runloop.schedule)("afterRender", function () {
        if (_this.categoryStyle) {
          _this.element.setAttribute("style", _this.categoryStyle);

          _this.element.querySelector(".caret-icon").setAttribute("style", _this.categoryStyle);
        }
      });
    }
  }, (_applyDecoratedDescriptor(_obj, "categoryBackgroundColor", [_dec], Object.getOwnPropertyDescriptor(_obj, "categoryBackgroundColor"), _obj), _applyDecoratedDescriptor(_obj, "categoryTextColor", [_dec2], Object.getOwnPropertyDescriptor(_obj, "categoryTextColor"), _obj), _applyDecoratedDescriptor(_obj, "categoryStyle", [_dec3], Object.getOwnPropertyDescriptor(_obj, "categoryStyle"), _obj)), _obj)));

  _exports.default = _default;
});
define("select-kit/components/category-notifications-button", ["exports", "select-kit/components/notifications-button", "@ember/object/computed"], function (_exports, _notificationsButton, _computed) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _notificationsButton.default.extend({
    pluginApiIdentifiers: ["category-notifications-button"],
    classNames: ["category-notifications-button"],
    isHidden: (0, _computed.or)("category.deleted"),
    selectKitOptions: {
      i18nPrefix: "category.notifications",
      showFullTitle: false
    }
  });

  _exports.default = _default;
});
define("select-kit/components/category-row", ["exports", "@ember/object/computed", "@ember/utils", "discourse/models/category", "select-kit/components/select-kit/select-kit-row", "discourse/helpers/category-link", "@ember/object", "select-kit/templates/components/category-row", "discourse/lib/computed"], function (_exports, _computed, _utils, _category, _selectKitRow, _categoryLink, _object, _categoryRow, _computed2) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function htmlToText(encodedString) {
    var elem = document.createElement("textarea");
    elem.innerHTML = encodedString;
    return elem.value;
  }

  var _default = _selectKitRow.default.extend({
    layout: _categoryRow.default,
    classNames: ["category-row"],
    hideParentCategory: (0, _computed.bool)("selectKit.options.hideParentCategory"),
    allowUncategorized: (0, _computed.bool)("selectKit.options.allowUncategorized"),
    categoryLink: (0, _computed.bool)("selectKit.options.categoryLink"),
    countSubcategories: (0, _computed.bool)("selectKit.options.countSubcategories"),
    allowUncategorizedTopics: (0, _computed2.setting)("allow_uncategorized_topics"),
    displayCategoryDescription: (0, _object.computed)("selectKit.options.displayCategoryDescription", function () {
      var option = this.selectKit.options.displayCategoryDescription;

      if ((0, _utils.isNone)(option)) {
        return true;
      }

      return option;
    }),
    title: (0, _object.computed)("descriptionText", "description", "categoryName", function () {
      if (this.category) {
        return htmlToText(this.descriptionText || this.description || this.categoryName);
      }
    }),
    categoryName: (0, _computed.reads)("category.name"),
    categoryDescription: (0, _computed.reads)("category.description"),
    categoryDescriptionText: (0, _computed.reads)("category.description_text"),
    category: (0, _object.computed)("rowValue", "rowName", function () {
      if ((0, _utils.isEmpty)(this.rowValue)) {
        var uncat = _category.default.findUncategorized();

        if (uncat && uncat.name === this.rowName) {
          return uncat;
        }
      } else {
        return _category.default.findById(parseInt(this.rowValue, 10));
      }
    }),
    badgeForCategory: (0, _object.computed)("category", "parentCategory", function () {
      return (0, _categoryLink.categoryBadgeHTML)(this.category, {
        link: this.categoryLink,
        allowUncategorized: this.allowUncategorizedTopics || this.allowUncategorized,
        hideParent: !!this.parentCategory,
        topicCount: this.topicCount
      }).htmlSafe();
    }),
    badgeForParentCategory: (0, _object.computed)("parentCategory", function () {
      return (0, _categoryLink.categoryBadgeHTML)(this.parentCategory, {
        link: this.categoryLink,
        allowUncategorized: this.allowUncategorizedTopics || this.allowUncategorized,
        recursive: true
      }).htmlSafe();
    }),
    parentCategory: (0, _object.computed)("parentCategoryId", function () {
      return _category.default.findById(this.parentCategoryId);
    }),
    hasParentCategory: (0, _computed.bool)("parentCategoryId"),
    parentCategoryId: (0, _computed.reads)("category.parent_category_id"),
    categoryTotalTopicCount: (0, _computed.reads)("category.totalTopicCount"),
    categoryTopicCount: (0, _computed.reads)("category.topic_count"),
    topicCount: (0, _object.computed)("categoryTotalTopicCount", "categoryTopicCount", "countSubcategories", function () {
      return this.countSubcategories ? this.categoryTotalTopicCount : this.categoryTopicCount;
    }),
    shouldDisplayDescription: (0, _object.computed)("displayCategoryDescription", "categoryDescription", function () {
      return this.displayCategoryDescription && this.categoryDescription && this.categoryDescription !== "null";
    }),
    descriptionText: (0, _object.computed)("categoryDescriptionText", function () {
      if (this.categoryDescriptionText) {
        return this._formatDescription(this.categoryDescriptionText);
      }
    }),
    description: (0, _object.computed)("categoryDescription", function () {
      if (this.categoryDescription) {
        return this._formatDescription(this.categoryDescription);
      }
    }),
    _formatDescription: function _formatDescription(description) {
      var limit = 200;
      return "".concat(description.substr(0, limit)).concat(description.length > limit ? "&hellip;" : "");
    }
  });

  _exports.default = _default;
});
define("select-kit/components/category-selector", ["exports", "@ember/object", "discourse/models/category", "I18n", "select-kit/components/multi-select", "discourse/helpers/category-link", "discourse-common/lib/helpers", "@ember/object/computed"], function (_exports, _object, _category, _I18n, _multiSelect, _categoryLink, _helpers, _computed) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

  function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  var _default = _multiSelect.default.extend({
    pluginApiIdentifiers: ["category-selector"],
    classNames: ["category-selector"],
    categories: null,
    blockedCategories: null,
    selectKitOptions: {
      filterable: true,
      allowAny: false,
      allowUncategorized: "allowUncategorized",
      displayCategoryDescription: false,
      selectedNameComponent: "multi-select/selected-category"
    },
    init: function init() {
      this._super.apply(this, arguments);

      if (!this.categories) {
        this.set("categories", []);
      }

      if (!this.blockedCategories) {
        this.set("blockedCategories", []);
      }
    },
    content: (0, _object.computed)("categories.[]", "blockedCategories.[]", function () {
      var _this = this;

      var blockedCategories = (0, _helpers.makeArray)(this.blockedCategories);
      return _category.default.list().filter(function (category) {
        return _this.categories.includes(category) || !blockedCategories.includes(category);
      });
    }),
    value: (0, _computed.mapBy)("categories", "id"),
    filterComputedContent: function filterComputedContent(computedContent, filter) {
      var _this2 = this;

      var regex = new RegExp(filter, "i");
      return computedContent.filter(function (category) {
        return _this2._normalize((0, _object.get)(category, "name")).match(regex);
      });
    },
    modifyComponentForRow: function modifyComponentForRow() {
      return "category-row";
    },
    search: function search(filter) {
      var _this3 = this;

      var result = this._super(filter);

      if (result.length === 1) {
        (function () {
          var subcategoryIds = new Set([result[0].id]);

          for (var i = 0; i < _this3.siteSettings.max_category_nesting; ++i) {
            subcategoryIds.forEach(function (categoryId) {
              _this3.content.forEach(function (category) {
                if (category.parent_category_id === categoryId) {
                  subcategoryIds.add(category.id);
                }
              });
            });
          }

          if (subcategoryIds.size > 1) {
            result.push(_object.default.create({
              multicategory: _toConsumableArray(subcategoryIds),
              category: result[0],
              title: _I18n.default.t("category_row.plus_subcategories_title", {
                name: result[0].name,
                count: subcategoryIds.size - 1
              }),
              label: (0, _categoryLink.categoryBadgeHTML)(result[0], {
                link: false,
                recursive: true,
                plusSubcategories: subcategoryIds.size - 1
              }).htmlSafe()
            }));
          }
        })();
      }

      return result;
    },
    select: function select(value, item) {
      if (item.multicategory) {
        var items = item.multicategory.map(function (id) {
          return _category.default.findById(parseInt(id, 10));
        });
        var newValues = (0, _helpers.makeArray)(this.value).concat(items.map(function (i) {
          return i.id;
        }));
        var newContent = (0, _helpers.makeArray)(this.selectedContent).concat(items);
        this.selectKit.change(newValues, newContent);
      } else {
        this._super(value, item);
      }
    },
    actions: {
      onChange: function onChange(values) {
        this.attrs.onChange(values.map(function (v) {
          return _category.default.findById(v);
        }).filter(Boolean));
        return false;
      }
    }
  });

  _exports.default = _default;
});
define("select-kit/components/color-palettes", ["exports", "select-kit/components/combo-box", "I18n"], function (_exports, _comboBox, _I18n) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _comboBox.default.extend({
    pluginApiIdentifiers: ["color-palettes"],
    classNames: ["color-palettes"],
    modifyComponentForRow: function modifyComponentForRow() {
      return "color-palettes/color-palettes-row";
    },
    selectKitOptions: {
      translatedNone: _I18n.default.t("admin.customize.theme.default_light_scheme")
    }
  });

  _exports.default = _default;
});
define("select-kit/components/color-palettes/color-palettes-row", ["exports", "select-kit/components/select-kit/select-kit-row", "@ember/object", "discourse/lib/utilities", "select-kit/templates/components/color-palettes/color-palettes-row"], function (_exports, _selectKitRow, _object, _utilities, _colorPalettesRow) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _selectKitRow.default.extend({
    classNames: ["color-palettes-row"],
    layout: _colorPalettesRow.default,
    palettes: (0, _object.computed)("item.colors.[]", function () {
      return (this.item.colors || []).filter(function (color) {
        return color.name !== "secondary";
      }).map(function (color) {
        return "#".concat((0, _utilities.escapeExpression)(color.hex));
      }).map(function (hex) {
        return "<span class=\"palette\" style=\"background-color:".concat(hex, "\"></span>");
      }).join("").htmlSafe();
    }),
    backgroundColor: (0, _object.computed)("item.colors.[]", function () {
      var secondary = (this.item.colors || []).findBy("name", "secondary");

      if (secondary && secondary.hex) {
        return "background-color:#".concat((0, _utilities.escapeExpression)(secondary.hex)).htmlSafe();
      } else {
        return "";
      }
    })
  });

  _exports.default = _default;
});
define("select-kit/components/combo-box", ["exports", "select-kit/components/single-select", "@ember/object"], function (_exports, _singleSelect, _object) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _singleSelect.default.extend({
    pluginApiIdentifiers: ["combo-box"],
    classNames: ["combobox", "combo-box"],
    selectKitOptions: {
      caretUpIcon: "caret-up",
      caretDownIcon: "caret-down",
      autoFilterable: "autoFilterable",
      clearable: false,
      headerComponent: "combo-box/combo-box-header"
    },
    autoFilterable: _object.computed.gte("content.length", 10)
  });

  _exports.default = _default;
});
define("select-kit/components/combo-box/combo-box-header", ["exports", "@ember/object/computed", "select-kit/components/select-kit/single-select-header", "@ember/object", "select-kit/templates/components/combo-box/combo-box-header"], function (_exports, _computed, _singleSelectHeader, _object, _comboBoxHeader) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _singleSelectHeader.default.extend({
    layout: _comboBoxHeader.default,
    classNames: ["combo-box-header"],
    clearable: (0, _computed.reads)("selectKit.options.clearable"),
    caretUpIcon: (0, _computed.reads)("selectKit.options.caretUpIcon"),
    caretDownIcon: (0, _computed.reads)("selectKit.options.caretDownIcon"),
    shouldDisplayClearableButton: (0, _computed.and)("clearable", "value"),
    caretIcon: (0, _object.computed)("selectKit.isExpanded", "caretUpIcon", "caretDownIcon", function () {
      return this.selectKit.isExpanded ? this.caretUpIcon : this.caretDownIcon;
    })
  });

  _exports.default = _default;
});
define("select-kit/components/composer-actions", ["exports", "discourse/models/composer", "discourse/models/draft", "select-kit/components/dropdown-select-box", "I18n", "bootbox", "@ember/string", "@ember/object", "@ember/object/computed", "@ember/utils"], function (_exports, _composer, _draft, _dropdownSelectBox, _I18n, _bootbox, _string, _object, _computed, _utils) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports._clearSnapshots = _clearSnapshots;
  _exports.default = void 0;
  // Component can get destroyed and lose state
  var _topicSnapshot = null;
  var _postSnapshot = null;
  var _actionSnapshot = null;

  function _clearSnapshots() {
    _topicSnapshot = null;
    _postSnapshot = null;
    _actionSnapshot = null;
  }

  var _default = _dropdownSelectBox.default.extend({
    seq: 0,
    pluginApiIdentifiers: ["composer-actions"],
    classNames: ["composer-actions"],
    isEditing: (0, _computed.equal)("action", _composer.EDIT),
    selectKitOptions: {
      icon: "iconForComposerAction",
      filterable: false,
      showFullTitle: false
    },
    iconForComposerAction: (0, _object.computed)("action", function () {
      if (this.isEditing) {
        return "pencil-alt";
      } else if (this.action === _composer.CREATE_TOPIC) {
        return "plus";
      } else {
        return "share";
      }
    }),
    contentChanged: function contentChanged() {
      this.set("seq", this.seq + 1);
    },
    didReceiveAttrs: function didReceiveAttrs() {
      this._super.apply(this, arguments);

      var changeContent = false; // if we change topic we want to change both snapshots

      if (this.topic && (!_topicSnapshot || this.topic.id !== _topicSnapshot.id)) {
        _topicSnapshot = this.topic;
        _postSnapshot = this.post;
        changeContent = true;
      } // if we hit reply on a different post we want to change postSnapshot


      if (this.post && (!_postSnapshot || this.post.id !== _postSnapshot.id)) {
        _postSnapshot = this.post;
        changeContent = true;
      }

      if (this.action !== _actionSnapshot) {
        _actionSnapshot = this.action;
        changeContent = true;
      }

      if (changeContent) {
        this.contentChanged();
      }

      this.set("selectKit.isHidden", (0, _utils.isEmpty)(this.content));
    },
    modifySelection: function modifySelection() {
      return {};
    },
    content: (0, _object.computed)("seq", function () {
      var items = [];

      if (this.action === _composer.REPLY && this.topic && this.topic.isPrivateMessage && this.topic.details && (this.topic.details.allowed_users.length > 1 || this.topic.details.allowed_groups.length > 0) && !this.isEditing && _topicSnapshot) {
        items.push({
          name: _I18n.default.t("composer.composer_actions.reply_as_new_group_message.label"),
          description: _I18n.default.t("composer.composer_actions.reply_as_new_group_message.desc"),
          icon: "plus",
          id: "reply_as_new_group_message"
        });
      }

      if (this.action !== _composer.CREATE_TOPIC && this.action !== _composer.CREATE_SHARED_DRAFT && !(this.action === _composer.REPLY && this.topic && this.topic.isPrivateMessage) && !this.isEditing && _topicSnapshot) {
        items.push({
          name: _I18n.default.t("composer.composer_actions.reply_as_new_topic.label"),
          description: _I18n.default.t("composer.composer_actions.reply_as_new_topic.desc"),
          icon: "plus",
          id: "reply_as_new_topic"
        });
      }

      if (this.action !== _composer.REPLY && _postSnapshot || this.action === _composer.REPLY && _postSnapshot && !(this.replyOptions.userAvatar && this.replyOptions.userLink)) {
        items.push({
          name: _I18n.default.t("composer.composer_actions.reply_to_post.label", {
            postUsername: _postSnapshot.username
          }),
          description: _I18n.default.t("composer.composer_actions.reply_to_post.desc"),
          icon: "share",
          id: "reply_to_post"
        });
      }

      if (this.siteSettings.enable_personal_messages && this.action !== _composer.PRIVATE_MESSAGE && !this.isEditing) {
        items.push({
          name: _I18n.default.t("composer.composer_actions.reply_as_private_message.label"),
          description: _I18n.default.t("composer.composer_actions.reply_as_private_message.desc"),
          icon: "envelope",
          id: "reply_as_private_message"
        });
      }

      if (!this.isEditing && (this.action !== _composer.REPLY && _topicSnapshot || this.action === _composer.REPLY && _topicSnapshot && this.replyOptions.userAvatar && this.replyOptions.userLink && this.replyOptions.topicLink)) {
        items.push({
          name: _I18n.default.t("composer.composer_actions.reply_to_topic.label"),
          description: _I18n.default.t("composer.composer_actions.reply_to_topic.desc"),
          icon: "share",
          id: "reply_to_topic"
        });
      } // if answered post is a whisper, we can only answer with a whisper so no need for toggle


      if (this.canWhisper && (!_postSnapshot || _postSnapshot.post_type !== this.site.post_types.whisper)) {
        items.push({
          name: _I18n.default.t("composer.composer_actions.toggle_whisper.label"),
          description: _I18n.default.t("composer.composer_actions.toggle_whisper.desc"),
          icon: "far-eye-slash",
          id: "toggle_whisper"
        });
      }

      var showCreateTopic = false;

      if (this.action === _composer.CREATE_SHARED_DRAFT) {
        showCreateTopic = true;
      }

      if (this.action === _composer.CREATE_TOPIC) {
        if (this.site.shared_drafts_category_id) {
          // Shared Drafts Choice
          items.push({
            name: _I18n.default.t("composer.composer_actions.shared_draft.label"),
            description: _I18n.default.t("composer.composer_actions.shared_draft.desc"),
            icon: "far-clipboard",
            id: "shared_draft"
          });
        } // Edge case: If personal messages are disabled, it is possible to have
        // no items which stil renders a button that pops up nothing. In this
        // case, add an option for what you're currently doing.


        if (items.length === 0) {
          showCreateTopic = true;
        }
      }

      if (showCreateTopic) {
        items.push({
          name: _I18n.default.t("composer.composer_actions.create_topic.label"),
          description: _I18n.default.t("composer.composer_actions.reply_as_new_topic.desc"),
          icon: "share",
          id: "create_topic"
        });
      }

      var showToggleTopicBump = this.get("currentUser.staff") || this.get("currentUser.trust_level") === 4;

      if (this.action === _composer.REPLY && showToggleTopicBump) {
        items.push({
          name: _I18n.default.t("composer.composer_actions.toggle_topic_bump.label"),
          description: _I18n.default.t("composer.composer_actions.toggle_topic_bump.desc"),
          icon: "anchor",
          id: "toggle_topic_bump"
        });
      }

      return items;
    }),
    _replyFromExisting: function _replyFromExisting(options, post, topic) {
      this.closeComposer();
      this.openComposer(options, post, topic);
    },
    _openComposer: function _openComposer(options) {
      this.closeComposer();
      this.openComposer(options);
    },
    toggleWhisperSelected: function toggleWhisperSelected(options, model) {
      model.toggleProperty("whisper");
    },
    toggleTopicBumpSelected: function toggleTopicBumpSelected(options, model) {
      model.toggleProperty("noBump");
    },
    replyAsNewGroupMessageSelected: function replyAsNewGroupMessageSelected(options) {
      var recipients = [];
      var details = this.topic.details;
      details.allowed_users.forEach(function (u) {
        return recipients.push(u.username);
      });
      details.allowed_groups.forEach(function (g) {
        return recipients.push(g.name);
      });
      options.action = _composer.PRIVATE_MESSAGE;
      options.recipients = recipients.join(",");
      options.archetypeId = "private_message";
      options.skipDraftCheck = true;

      this._replyFromExisting(options, _postSnapshot, _topicSnapshot);
    },
    replyToTopicSelected: function replyToTopicSelected(options) {
      options.action = _composer.REPLY;
      options.topic = _topicSnapshot;
      options.skipDraftCheck = true;

      this._openComposer(options);
    },
    replyToPostSelected: function replyToPostSelected(options) {
      options.action = _composer.REPLY;
      options.post = _postSnapshot;
      options.skipDraftCheck = true;

      this._openComposer(options);
    },
    replyAsNewTopicSelected: function replyAsNewTopicSelected(options) {
      var _this = this;

      _draft.default.get("new_topic").then(function (response) {
        if (response.draft) {
          _bootbox.default.confirm(_I18n.default.t("composer.composer_actions.reply_as_new_topic.confirm"), function (result) {
            if (result) {
              _this._replyAsNewTopicSelect(options);
            }
          });
        } else {
          _this._replyAsNewTopicSelect(options);
        }
      });
    },
    _replyAsNewTopicSelect: function _replyAsNewTopicSelect(options) {
      options.action = _composer.CREATE_TOPIC;
      options.categoryId = this.get("composerModel.topic.category.id");
      options.disableScopedCategory = true;
      options.skipDraftCheck = true;

      this._replyFromExisting(options, _postSnapshot, _topicSnapshot);
    },
    replyAsPrivateMessageSelected: function replyAsPrivateMessageSelected(options) {
      var usernames;

      if (_postSnapshot && !_postSnapshot.get("yours")) {
        var postUsername = _postSnapshot.get("username");

        if (postUsername) {
          usernames = postUsername;
        }
      } else if (this.get("composerModel.topic")) {
        var stream = this.get("composerModel.topic.postStream");

        if (stream.get("firstPostPresent")) {
          var post = stream.get("posts.firstObject");

          if (post && !post.get("yours") && post.get("username")) {
            usernames = post.get("username");
          }
        }
      }

      options.action = _composer.PRIVATE_MESSAGE;
      options.recipients = usernames;
      options.archetypeId = "private_message";
      options.skipDraftCheck = true;

      this._replyFromExisting(options, _postSnapshot, _topicSnapshot);
    },
    _switchCreate: function _switchCreate(options, action) {
      options.action = action;
      options.categoryId = this.get("composerModel.categoryId");
      options.topicTitle = this.get("composerModel.title");
      options.tags = this.get("composerModel.tags");
      options.skipDraftCheck = true;

      this._openComposer(options);
    },
    createTopicSelected: function createTopicSelected(options) {
      this._switchCreate(options, _composer.CREATE_TOPIC);
    },
    sharedDraftSelected: function sharedDraftSelected(options) {
      this._switchCreate(options, _composer.CREATE_SHARED_DRAFT);
    },
    actions: {
      onChange: function onChange(value) {
        var action = "".concat((0, _string.camelize)(value), "Selected");

        if (this[action]) {
          this[action](this.composerModel.getProperties("draftKey", "draftSequence", "title", "reply", "disableScopedCategory"), this.composerModel);
          this.contentChanged();
        } else {
          // eslint-disable-next-line no-console
          console.error("No method '".concat(action, "' found"));
        }
      }
    }
  });

  _exports.default = _default;
});
define("select-kit/components/create-color-row", ["exports", "select-kit/components/select-kit/select-kit-row", "discourse/lib/utilities", "select-kit/templates/components/create-color-row", "@ember/runloop"], function (_exports, _selectKitRow, _utilities, _createColorRow, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _selectKitRow.default.extend({
    layout: _createColorRow.default,
    classNames: ["create-color-row"],
    didReceiveAttrs: function didReceiveAttrs() {
      var _this = this;

      this._super.apply(this, arguments);

      (0, _runloop.schedule)("afterRender", function () {
        var color = (0, _utilities.escapeExpression)(_this.rowValue);
        _this.element.style.borderLeftColor = "#".concat(color);
      });
    }
  });

  _exports.default = _default;
});
define("select-kit/components/dropdown-select-box", ["exports", "select-kit/components/single-select"], function (_exports, _singleSelect) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _singleSelect.default.extend({
    pluginApiIdentifiers: ["dropdown-select-box"],
    classNames: ["dropdown-select-box"],
    selectKitOptions: {
      autoFilterable: false,
      filterable: false,
      showFullTitle: true,
      headerComponent: "dropdown-select-box/dropdown-select-box-header",
      caretUpIcon: "caret-up",
      caretDownIcon: "caret-down",
      showCaret: false
    },
    modifyComponentForRow: function modifyComponentForRow() {
      return "dropdown-select-box/dropdown-select-box-row";
    }
  });

  _exports.default = _default;
});
define("select-kit/components/dropdown-select-box/dropdown-select-box-header", ["exports", "select-kit/components/select-kit/single-select-header", "@ember/object", "select-kit/templates/components/dropdown-select-box/dropdown-select-box-header", "@ember/object/computed"], function (_exports, _singleSelectHeader, _object, _dropdownSelectBoxHeader, _computed) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _singleSelectHeader.default.extend({
    layout: _dropdownSelectBoxHeader.default,
    classNames: ["btn-default", "dropdown-select-box-header"],
    tagName: "button",
    classNameBindings: ["btnClassName"],
    showFullTitle: (0, _computed.readOnly)("selectKit.options.showFullTitle"),
    attributeBindings: ["buttonType:type"],
    buttonType: "button",
    btnClassName: (0, _object.computed)("showFullTitle", function () {
      return "btn ".concat(this.showFullTitle ? "btn-icon-text" : "no-text btn-icon");
    }),
    caretUpIcon: (0, _computed.readOnly)("selectKit.options.caretUpIcon"),
    caretDownIcon: (0, _computed.readOnly)("selectKit.options.caretDownIcon"),
    caretIcon: (0, _object.computed)("selectKit.isExpanded", "caretUpIcon", "caretDownIcon", function () {
      return this.selectKit.isExpanded ? this.caretUpIcon : this.caretDownIcon;
    })
  });

  _exports.default = _default;
});
define("select-kit/components/dropdown-select-box/dropdown-select-box-row", ["exports", "select-kit/components/select-kit/select-kit-row", "select-kit/templates/components/dropdown-select-box/dropdown-select-box-row", "@ember/object/computed"], function (_exports, _selectKitRow, _dropdownSelectBoxRow, _computed) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _selectKitRow.default.extend({
    layout: _dropdownSelectBoxRow.default,
    classNames: ["dropdown-select-box-row"],
    description: (0, _computed.readOnly)("item.description")
  });

  _exports.default = _default;
});
define("select-kit/components/future-date-input-selector", ["exports", "discourse/controllers/edit-topic-timer", "select-kit/components/combo-box", "select-kit/components/future-date-input-selector/mixin", "I18n", "@ember/object", "@ember/object/computed", "@ember/utils"], function (_exports, _editTopicTimer, _comboBox, _mixin, _I18n, _object, _computed, _utils) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.timeframeDetails = timeframeDetails;
  _exports.default = _exports.FORMAT = _exports.TIMEFRAMES = void 0;
  var TIMEFRAME_BASE = {
    enabled: function enabled() {
      return true;
    },
    when: function when() {
      return null;
    },
    icon: "briefcase",
    displayWhen: true
  };

  function buildTimeframe(opts) {
    return jQuery.extend({}, TIMEFRAME_BASE, opts);
  }

  var TIMEFRAMES = [buildTimeframe({
    id: "now",
    format: "h:mm a",
    enabled: function enabled(opts) {
      return opts.canScheduleNow;
    },
    when: function when(time) {
      return time.add(1, "minute");
    },
    icon: "magic"
  }), buildTimeframe({
    id: "later_today",
    format: "h a",
    enabled: function enabled(opts) {
      return opts.canScheduleToday;
    },
    when: function when(time) {
      return time.hour(18).minute(0);
    },
    icon: "far-moon"
  }), buildTimeframe({
    id: "tomorrow",
    format: "ddd, h a",
    when: function when(time, timeOfDay) {
      return time.add(1, "day").hour(timeOfDay).minute(0);
    },
    icon: "far-sun"
  }), buildTimeframe({
    id: "later_this_week",
    format: "ddd, h a",
    enabled: function enabled(opts) {
      return !opts.canScheduleToday && opts.day < 4;
    },
    when: function when(time, timeOfDay) {
      return time.add(2, "day").hour(timeOfDay).minute(0);
    }
  }), buildTimeframe({
    id: "this_weekend",
    format: "ddd, h a",
    enabled: function enabled(opts) {
      return opts.day < 5 && opts.includeWeekend;
    },
    when: function when(time, timeOfDay) {
      return time.day(6).hour(timeOfDay).minute(0);
    },
    icon: "bed"
  }), buildTimeframe({
    id: "next_week",
    format: "ddd, h a",
    enabled: function enabled(opts) {
      return opts.day !== 7;
    },
    when: function when(time, timeOfDay) {
      return time.add(1, "week").day(1).hour(timeOfDay).minute(0);
    },
    icon: "briefcase"
  }), buildTimeframe({
    id: "two_weeks",
    format: "MMM D",
    when: function when(time, timeOfDay) {
      return time.add(2, "week").hour(timeOfDay).minute(0);
    },
    icon: "briefcase"
  }), buildTimeframe({
    id: "next_month",
    format: "MMM D",
    enabled: function enabled(opts) {
      return opts.now.date() !== moment().endOf("month").date();
    },
    when: function when(time, timeOfDay) {
      return time.add(1, "month").startOf("month").hour(timeOfDay).minute(0);
    },
    icon: "briefcase"
  }), buildTimeframe({
    id: "two_months",
    format: "MMM D",
    enabled: function enabled(opts) {
      return opts.includeMidFuture;
    },
    when: function when(time, timeOfDay) {
      return time.add(2, "month").startOf("month").hour(timeOfDay).minute(0);
    },
    icon: "briefcase"
  }), buildTimeframe({
    id: "three_months",
    format: "MMM D",
    enabled: function enabled(opts) {
      return opts.includeMidFuture;
    },
    when: function when(time, timeOfDay) {
      return time.add(3, "month").startOf("month").hour(timeOfDay).minute(0);
    },
    icon: "briefcase"
  }), buildTimeframe({
    id: "four_months",
    format: "MMM D",
    enabled: function enabled(opts) {
      return opts.includeMidFuture;
    },
    when: function when(time, timeOfDay) {
      return time.add(4, "month").startOf("month").hour(timeOfDay).minute(0);
    },
    icon: "briefcase"
  }), buildTimeframe({
    id: "six_months",
    format: "MMM D",
    enabled: function enabled(opts) {
      return opts.includeMidFuture;
    },
    when: function when(time, timeOfDay) {
      return time.add(6, "month").startOf("month").hour(timeOfDay).minute(0);
    },
    icon: "briefcase"
  }), buildTimeframe({
    id: "one_year",
    format: "MMM D",
    enabled: function enabled(opts) {
      return opts.includeFarFuture;
    },
    when: function when(time, timeOfDay) {
      return time.add(1, "year").startOf("day").hour(timeOfDay).minute(0);
    },
    icon: "briefcase"
  }), buildTimeframe({
    id: "forever",
    enabled: function enabled(opts) {
      return opts.includeFarFuture;
    },
    when: function when(time, timeOfDay) {
      return time.add(1000, "year").hour(timeOfDay).minute(0);
    },
    icon: "gavel",
    displayWhen: false
  }), buildTimeframe({
    id: "pick_date_and_time",
    enabled: function enabled(opts) {
      return opts.includeDateTime;
    },
    icon: "far-calendar-plus"
  }), buildTimeframe({
    id: "set_based_on_last_post",
    enabled: function enabled(opts) {
      return opts.includeBasedOnLastPost;
    },
    icon: "far-clock"
  })];
  _exports.TIMEFRAMES = TIMEFRAMES;
  var _timeframeById = null;

  function timeframeDetails(id) {
    if (!_timeframeById) {
      _timeframeById = {};
      TIMEFRAMES.forEach(function (t) {
        return _timeframeById[t.id] = t;
      });
    }

    return _timeframeById[id];
  }

  var FORMAT = "YYYY-MM-DD HH:mmZ";
  _exports.FORMAT = FORMAT;

  var _default = _comboBox.default.extend(_mixin.default, {
    pluginApiIdentifiers: ["future-date-input-selector"],
    classNames: ["future-date-input-selector"],
    isCustom: (0, _computed.equal)("value", "pick_date_and_time"),
    isBasedOnLastPost: (0, _computed.equal)("value", "set_based_on_last_post"),
    selectKitOptions: {
      autoInsertNoneItem: false,
      headerComponent: "future-date-input-selector/future-date-input-selector-header"
    },
    modifyComponentForRow: function modifyComponentForRow() {
      return "future-date-input-selector/future-date-input-selector-row";
    },
    content: (0, _object.computed)("statusType", function () {
      var _this = this;

      var now = moment();
      var opts = {
        now: now,
        day: now.day(),
        includeWeekend: this.includeWeekend,
        includeMidFuture: this.includeMidFuture || true,
        includeFarFuture: this.includeFarFuture,
        includeDateTime: this.includeDateTime,
        includeBasedOnLastPost: this.statusType === _editTopicTimer.CLOSE_STATUS_TYPE,
        canScheduleNow: this.includeNow || false,
        canScheduleToday: 24 - now.hour() > 6
      };
      return TIMEFRAMES.filter(function (tf) {
        return tf.enabled(opts);
      }).map(function (tf) {
        return {
          id: tf.id,
          name: _I18n.default.t("topic.auto_update_input.".concat(tf.id)),
          datetime: _this._computeDatetimeForValue(tf.id),
          icons: _this._computeIconsForValue(tf.id)
        };
      });
    }),
    actions: {
      onChange: function onChange(value) {
        if (value !== "pick_date_and_time" || !this.isBasedOnLastPost) {
          var _this$_updateAt = this._updateAt(value),
              time = _this$_updateAt.time;

          if (time && !(0, _utils.isEmpty)(value)) {
            this.attrs.onChangeInput && this.attrs.onChangeInput(time.locale("en").format(FORMAT));
          }
        }

        this.attrs.onChange && this.attrs.onChange(value);
      }
    }
  });

  _exports.default = _default;
});
define("select-kit/components/future-date-input-selector/future-date-input-selector-header", ["exports", "select-kit/components/combo-box/combo-box-header", "select-kit/templates/components/future-date-input-selector/future-date-input-selector-header"], function (_exports, _comboBoxHeader, _futureDateInputSelectorHeader) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _comboBoxHeader.default.extend({
    layout: _futureDateInputSelectorHeader.default,
    classNames: "future-date-input-selector-header"
  });

  _exports.default = _default;
});
define("select-kit/components/future-date-input-selector/future-date-input-selector-row", ["exports", "select-kit/components/select-kit/select-kit-row", "select-kit/templates/components/future-date-input-selector/future-date-input-selector-row"], function (_exports, _selectKitRow, _futureDateInputSelectorRow) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _selectKitRow.default.extend({
    layout: _futureDateInputSelectorRow.default,
    classNames: ["future-date-input-selector-row"]
  });

  _exports.default = _default;
});
define("select-kit/components/future-date-input-selector/mixin", ["exports", "discourse/controllers/edit-topic-timer", "@ember/object/mixin", "@ember/utils", "select-kit/components/future-date-input-selector"], function (_exports, _editTopicTimer, _mixin, _utils, _futureDateInputSelector) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _mixin.default.create({
    _computeIconsForValue: function _computeIconsForValue(value) {
      var _this$_updateAt = this._updateAt(value),
          icon = _this$_updateAt.icon;

      if (icon) {
        return icon.split(",");
      }

      return [];
    },
    _computeDatetimeForValue: function _computeDatetimeForValue(value) {
      if ((0, _utils.isNone)(value)) {
        return null;
      }

      var _this$_updateAt2 = this._updateAt(value),
          time = _this$_updateAt2.time;

      if (time) {
        var details = (0, _futureDateInputSelector.timeframeDetails)(value);

        if (!details.displayWhen) {
          time = null;
        }

        if (time && details.format) {
          return time.format(details.format);
        }
      }

      return time;
    },
    _updateAt: function _updateAt(selection) {
      var details = (0, _futureDateInputSelector.timeframeDetails)(selection);

      if (details) {
        return {
          time: details.when(moment(), this.statusType !== _editTopicTimer.CLOSE_STATUS_TYPE ? 8 : 18),
          icon: details.icon
        };
      }

      return {
        time: moment()
      };
    }
  });

  _exports.default = _default;
});
define("select-kit/components/group-chooser", ["exports", "select-kit/components/multi-select"], function (_exports, _multiSelect) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _multiSelect.default.extend({
    pluginApiIdentifiers: ["group-chooser"],
    classNames: ["group-chooser"],
    selectKitOptions: {
      allowAny: false
    }
  });

  _exports.default = _default;
});
define("select-kit/components/group-dropdown", ["exports", "@ember/object/computed", "select-kit/components/combo-box", "discourse/lib/url", "I18n", "@ember/object", "discourse/lib/computed"], function (_exports, _computed, _comboBox, _url, _I18n, _object, _computed2) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _comboBox.default.extend({
    pluginApiIdentifiers: ["group-dropdown"],
    classNames: ["group-dropdown"],
    content: (0, _computed.reads)("groupsWithShortcut"),
    tagName: "li",
    valueProperty: null,
    nameProperty: null,
    hasManyGroups: (0, _computed.gte)("content.length", 10),
    enableGroupDirectory: (0, _computed2.setting)("enable_group_directory"),
    selectKitOptions: {
      caretDownIcon: "caret-right",
      caretUpIcon: "caret-down",
      filterable: "hasManyGroups"
    },
    groupsWithShortcut: (0, _object.computed)("groups.[]", function () {
      var shortcuts = [];

      if (this.enableGroupDirectory || this.get("currentUser.staff")) {
        shortcuts.push(_I18n.default.t("groups.index.all").toLowerCase());
      }

      return shortcuts.concat(this.groups);
    }),
    actions: {
      onChange: function onChange(groupName) {
        if ((this.groups || []).includes(groupName)) {
          _url.default.routeToUrl("/g/".concat(groupName));
        } else {
          _url.default.routeToUrl("/g");
        }
      }
    }
  });

  _exports.default = _default;
});
define("select-kit/components/group-members-dropdown", ["exports", "@ember/object", "select-kit/components/dropdown-select-box", "I18n"], function (_exports, _object, _dropdownSelectBox, _I18n) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _dropdownSelectBox.default.extend((_obj = {
    classNames: ["group-members-dropdown"],
    selectKitOptions: {
      icon: "bars",
      showFullTitle: false
    },
    content: (0, _object.computed)(function () {
      var items = [{
        id: "showAddMembersModal",
        name: _I18n.default.t("groups.add_members.title", {
          group_name: this.groupName
        }),
        icon: "user-plus"
      }];
      return items;
    }),
    onChange: function onChange(id) {
      this.attrs && this.attrs[id] && this.attrs[id]();
    }
  }, (_applyDecoratedDescriptor(_obj, "onChange", [_object.action], Object.getOwnPropertyDescriptor(_obj, "onChange"), _obj)), _obj));

  _exports.default = _default;
});
define("select-kit/components/group-notifications-button", ["exports", "select-kit/components/notifications-button"], function (_exports, _notificationsButton) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _notificationsButton.default.extend({
    pluginApiIdentifiers: ["group-notifications-button"],
    classNames: ["group-notifications-button"],
    selectKitOptions: {
      i18nPrefix: "groups.notifications"
    }
  });

  _exports.default = _default;
});
define("select-kit/components/icon-picker", ["exports", "discourse-common/lib/icon-library", "select-kit/components/multi-select", "discourse/lib/ajax", "@ember/object", "discourse-common/config/environment", "discourse-common/lib/helpers"], function (_exports, _iconLibrary, _multiSelect, _ajax, _object, _environment, _helpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

  var _default = _multiSelect.default.extend({
    pluginApiIdentifiers: ["icon-picker"],
    classNames: ["icon-picker"],
    init: function init() {
      this._super.apply(this, arguments);

      this._cachedIconsList = null;

      if ((0, _environment.isDevelopment)()) {
        (0, _iconLibrary.disableMissingIconWarning)();
      }
    },
    content: (0, _object.computed)("value.[]", function () {
      return (0, _helpers.makeArray)(this.value).map(this._processIcon);
    }),
    search: function search() {
      var _this = this;

      var filter = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";

      if (filter === "" && this._cachedIconsList && this._cachedIconsList.length) {
        return this._cachedIconsList;
      } else {
        return (0, _ajax.ajax)("/svg-sprite/picker-search", {
          data: {
            filter: filter
          }
        }).then(function (icons) {
          icons = icons.map(_this._processIcon);

          if (filter === "") {
            _this._cachedIconsList = icons;
          }

          return icons;
        });
      }
    },
    _processIcon: function _processIcon(icon) {
      var iconName = _typeof(icon) === "object" ? icon.id : icon,
          strippedIconName = (0, _iconLibrary.convertIconClass)(iconName);
      var spriteEl = "#svg-sprites",
          holder = "ajax-icon-holder";

      if (_typeof(icon) === "object") {
        if ($("".concat(spriteEl, " .").concat(holder)).length === 0) {
          $(spriteEl).append("<div class=\"".concat(holder, "\" style='display: none;'></div>"));
        }

        if (!$("".concat(spriteEl, " symbol#").concat(strippedIconName)).length) {
          $("".concat(spriteEl, " .").concat(holder)).append("<svg xmlns='http://www.w3.org/2000/svg'>".concat(icon.symbol, "</svg>"));
        }
      }

      return {
        id: iconName,
        name: iconName,
        icon: strippedIconName
      };
    },
    willDestroyElement: function willDestroyElement() {
      $("#svg-sprites .ajax-icon-holder").remove();

      this._super.apply(this, arguments);

      this._cachedIconsList = null;

      if ((0, _environment.isDevelopment)()) {
        (0, _iconLibrary.enableMissingIconWarning)();
      }
    },
    actions: {
      onChange: function onChange(value, item) {
        if (this.selectKit.options.maximum === 1) {
          value = value.length ? value[0] : null;
          item = item.length ? item[0] : null;
        }

        this.attrs.onChange && this.attrs.onChange(value, item);
      }
    }
  });

  _exports.default = _default;
});
define("select-kit/components/list-setting", ["exports", "select-kit/components/select-kit", "select-kit/components/multi-select", "@ember/object", "discourse-common/lib/helpers", "@ember/object/computed"], function (_exports, _selectKit, _multiSelect, _object, _helpers, _computed) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

  function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  var _default = _multiSelect.default.extend({
    pluginApiIdentifiers: ["list-setting"],
    classNames: ["list-setting"],
    choices: null,
    nameProperty: null,
    valueProperty: null,
    content: (0, _computed.readOnly)("choices"),
    selectKitOptions: {
      filterable: true,
      selectedNameComponent: "selectedNameComponent"
    },
    modifyComponentForRow: function modifyComponentForRow(collection) {
      if (collection === _selectKit.MAIN_COLLECTION && this.settingName && this.settingName.indexOf("color") > -1) {
        return "create-color-row";
      }
    },
    selectedNameComponent: (0, _object.computed)("settingName", function () {
      if (this.settingName && this.settingName.indexOf("color") > -1) {
        return "selected-color";
      } else {
        return "selected-name";
      }
    }),
    deselect: function deselect(value) {
      this.onChangeChoices && this.onChangeChoices(_toConsumableArray(new Set([value].concat(_toConsumableArray((0, _helpers.makeArray)(this.choices))))));

      this._super.apply(this, arguments);
    }
  });

  _exports.default = _default;
});
define("select-kit/components/mini-tag-chooser", ["exports", "@ember/object/computed", "select-kit/components/combo-box", "select-kit/components/select-kit", "I18n", "select-kit/mixins/tags", "@ember/object", "discourse-common/lib/helpers", "discourse/lib/computed"], function (_exports, _computed, _comboBox, _selectKit, _I18n, _tags, _object, _helpers, _computed2) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

  function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  var SELECTED_TAGS_COLLECTION = "MINI_TAG_CHOOSER_SELECTED_TAGS";

  var _default = _comboBox.default.extend(_tags.default, {
    pluginApiIdentifiers: ["mini-tag-chooser"],
    attributeBindings: ["selectKit.options.categoryId:category-id"],
    classNames: ["mini-tag-chooser"],
    classNameBindings: ["noTags"],
    noTags: (0, _computed.empty)("value"),
    maxTagSearchResults: (0, _computed2.setting)("max_tag_search_results"),
    maxTagsPerTopic: (0, _computed2.setting)("max_tags_per_topic"),
    highlightedTag: null,
    singleSelect: false,
    collections: (0, _object.computed)("mainCollection.[]", "errorsCollection.[]", "highlightedTag", function () {
      return this._super.apply(this, arguments);
    }),
    selectKitOptions: {
      headerComponent: "mini-tag-chooser/mini-tag-chooser-header",
      fullWidthOnMobile: true,
      filterable: true,
      caretDownIcon: "caretIcon",
      caretUpIcon: "caretIcon",
      termMatchesForbidden: false,
      categoryId: null,
      everyTag: false,
      none: "tagging.choose_for_topic",
      closeOnChange: false,
      maximum: "maximumSelectedTags",
      autoInsertNoneItem: false
    },
    modifyComponentForRow: function modifyComponentForRow(collection, item) {
      if (this.getValue(item) === this.selectKit.filter && !item.count) {
        return "select-kit/select-kit-row";
      }

      return "tag-row";
    },
    modifyComponentForCollection: function modifyComponentForCollection(collection) {
      if (collection === SELECTED_TAGS_COLLECTION) {
        return "mini-tag-chooser/selected-collection";
      }
    },
    modifyContentForCollection: function modifyContentForCollection(collection) {
      if (collection === SELECTED_TAGS_COLLECTION) {
        return {
          selectedTags: this.value,
          highlightedTag: this.highlightedTag
        };
      }
    },
    allowAnyTag: (0, _computed.or)("allowCreate", "site.can_create_tag"),
    maximumSelectedTags: (0, _object.computed)(function () {
      return parseInt(this.options.limit || this.selectKit.options.maximum || this.maxTagsPerTopic, 10);
    }),
    modifyNoSelection: function modifyNoSelection() {
      if (this.selectKit.options.minimum) {
        var minimum = parseInt(this.selectKit.options.minimum, 10);

        if (minimum > 0) {
          return this.defaultItem(null, _I18n.default.t("select_kit.min_content_not_reached", {
            count: minimum
          }));
        }
      }

      return this._super.apply(this, arguments);
    },
    init: function init() {
      this._super.apply(this, arguments);

      this.insertAfterCollection(_selectKit.ERRORS_COLLECTION, SELECTED_TAGS_COLLECTION);
    },
    caretIcon: (0, _object.computed)("value.[]", function () {
      var maximum = this.selectKit.options.maximum;
      return maximum && (0, _helpers.makeArray)(this.value).length >= parseInt(maximum, 10) ? null : "plus";
    }),
    modifySelection: function modifySelection(content) {
      var minimum = this.selectKit.options.minimum;

      if (minimum && (0, _helpers.makeArray)(this.value).length < parseInt(minimum, 10)) {
        var key = this.selectKit.options.minimumLabel || "select_kit.min_content_not_reached";

        var label = _I18n.default.t(key, {
          count: this.selectKit.options.minimum
        });

        content.title = content.name = content.label = label;
      } else {
        content.name = content.value = (0, _helpers.makeArray)(this.value).join(",");
        content.title = content.label = (0, _helpers.makeArray)(this.value).join(", ");

        if (content.label.length > 32) {
          content.label = "".concat(content.label.slice(0, 32), "...");
        }
      }

      return content;
    },
    search: function search(filter) {
      var data = {
        q: filter || "",
        limit: this.maxTagSearchResults,
        categoryId: this.selectKit.options.categoryId
      };

      if (this.value) {
        data.selected_tags = this.value.slice(0, 100);
      }

      if (!this.selectKit.options.everyTag) {
        data.filterForInput = true;
      }

      return this.searchTags("/tags/filter/search", data, this._transformJson);
    },
    _transformJson: function _transformJson(context, json) {
      var results = json.results;
      context.setProperties({
        termMatchesForbidden: json.forbidden ? true : false,
        termMatchErrorMessage: json.forbidden_message
      });

      if (context.get("siteSettings.tags_sort_alphabetically")) {
        results = results.sort(function (a, b) {
          return a.text.localeCompare(b.text);
        });
      }

      results = results.filter(function (r) {
        return !(0, _helpers.makeArray)(context.tags).includes(r.id);
      }).map(function (result) {
        return {
          id: result.text,
          name: result.text,
          count: result.count
        };
      });
      return results;
    },
    select: function select(value) {
      this._reset();

      if (!this.validateSelect(value)) {
        return;
      }

      var tags = _toConsumableArray(new Set((0, _helpers.makeArray)(this.value).concat(value)));

      this.selectKit.change(tags, tags);
    },
    deselect: function deselect(value) {
      this._reset();

      var tags = _toConsumableArray(new Set((0, _helpers.makeArray)(this.value).removeObject(value)));

      this.selectKit.change(tags, tags);
    },
    _reset: function _reset() {
      this.clearErrors();
      this.set("highlightedTag", null);
    },
    _onKeydown: function _onKeydown(event) {
      var value = (0, _helpers.makeArray)(this.value);

      if (event.keyCode === 8) {
        if (!this.selectKit.filter) {
          this._onBackspace(this.value, this.highlightedTag);
        }
      } else if (event.keyCode === 37) {
        if (this.highlightedTag) {
          var index = value.indexOf(this.highlightedTag);
          var highlightedTag = value[index - 1] ? value[index - 1] : value.lastObject;
          this.set("highlightedTag", highlightedTag);
        } else {
          this.set("highlightedTag", value.lastObject);
        }
      } else if (event.keyCode === 39) {
        if (this.highlightedTag) {
          var _index = value.indexOf(this.highlightedTag);

          var _highlightedTag = value[_index + 1] ? value[_index + 1] : value.firstObject;

          this.set("highlightedTag", _highlightedTag);
        } else {
          this.set("highlightedTag", value.firstObject);
        }
      } else {
        this.set("highlightedTag", null);
      }

      return true;
    },
    _onBackspace: function _onBackspace(value, highlightedTag) {
      if (value && value.length) {
        if (!highlightedTag) {
          this.set("highlightedTag", value.lastObject);
        } else {
          this.deselect(highlightedTag);
        }
      }
    }
  });

  _exports.default = _default;
});
define("select-kit/components/mini-tag-chooser/mini-tag-chooser-header", ["exports", "select-kit/components/combo-box/combo-box-header", "select-kit/templates/components/mini-tag-chooser/mini-tag-chooser-header"], function (_exports, _comboBoxHeader, _miniTagChooserHeader) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _comboBoxHeader.default.extend({
    layout: _miniTagChooserHeader.default,
    classNames: ["mini-tag-chooser-header"]
  });

  _exports.default = _default;
});
define("select-kit/components/mini-tag-chooser/selected-collection", ["exports", "@ember/object/computed", "@ember/component", "@ember/object", "select-kit/templates/components/mini-tag-chooser/selected-collection"], function (_exports, _computed, _component, _object, _selectedCollection) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _component.default.extend({
    layout: _selectedCollection.default,
    classNames: ["mini-tag-chooser-selected-collection", "selected-tags", "shouldHide:hidden"],
    shouldHide: (0, _computed.empty)("selectedTags.[]"),
    selectedTags: (0, _computed.reads)("collection.content.selectedTags.[]"),
    highlightedTag: (0, _computed.reads)("collection.content.highlightedTag"),
    tags: (0, _object.computed)("selectedTags.[]", "highlightedTag", "selectKit.filter", function () {
      var _this = this;

      if (!this.selectedTags) {
        return [];
      }

      var tags = this.selectedTags;

      if (tags.length >= 20 && this.selectKit.filter) {
        tags = tags.filter(function (t) {
          return t.indexOf(_this.selectKit.filter) >= 0;
        });
      } else if (tags.length >= 20) {
        tags = tags.slice(0, 20);
      }

      tags = tags.map(function (selectedTag) {
        var classNames = ["selected-tag"];

        if (selectedTag === _this.highlightedTag) {
          classNames.push("is-highlighted");
        }

        return {
          value: selectedTag,
          classNames: classNames.join(" ")
        };
      });
      return tags;
    }),
    actions: {
      deselectTag: function deselectTag(tag) {
        return this.selectKit.deselect(tag);
      }
    }
  });

  _exports.default = _default;
});
define("select-kit/components/multi-select", ["exports", "select-kit/components/select-kit", "@ember/object", "discourse-common/lib/deprecated", "@ember/utils", "select-kit/templates/components/multi-select", "discourse-common/lib/helpers"], function (_exports, _selectKit, _object, _deprecated, _utils, _multiSelect, _helpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _selectKit.default.extend({
    pluginApiIdentifiers: ["multi-select"],
    layout: _multiSelect.default,
    classNames: ["multi-select"],
    multiSelect: true,
    selectKitOptions: {
      none: "select_kit.default_header_text",
      clearable: true,
      filterable: true,
      filterIcon: null,
      clearOnClick: true,
      closeOnChange: false,
      autoInsertNoneItem: false,
      headerComponent: "multi-select/multi-select-header",
      filterComponent: "multi-select/multi-select-filter"
    },
    search: function search(filter) {
      var _this = this;

      return this._super(filter).filter(function (content) {
        return !(0, _helpers.makeArray)(_this.selectedContent).includes(content);
      });
    },
    append: function append(values) {
      var _this2 = this;

      var existingItems = values.map(function (value) {
        var defaultItem = _this2.defaultItem(value, value);

        var existingItem = _this2.findValue(_this2.mainCollection, defaultItem) || _this2.findName(_this2.mainCollection, defaultItem);

        if (!existingItem) {
          if (_this2.validateCreate(value, _this2.content)) {
            return value;
          }
        } else if (_this2.validateSelect(existingItem)) {
          return _this2.getValue(existingItem);
        }
      }).filter(Boolean);
      var newValues = (0, _helpers.makeArray)(this.value).concat(existingItems);
      var newContent = (0, _helpers.makeArray)(this.selectedContent).concat((0, _helpers.makeArray)(existingItems));
      this.selectKit.change(newValues, newContent);
    },
    deselect: function deselect(item) {
      var _this3 = this;

      this.clearErrors();
      var newContent = this.selectedContent.filter(function (content) {
        return _this3.getValue(item) !== _this3.getValue(content);
      });
      this.selectKit.change(this.valueProperty ? newContent.mapBy(this.valueProperty) : newContent, newContent);
    },
    select: function select(value, item) {
      if (!(0, _utils.isPresent)(value)) {
        if (!this.validateSelect(this.selectKit.highlighted)) {
          return;
        }

        this.selectKit.change((0, _helpers.makeArray)(this.value).concat((0, _helpers.makeArray)(this.getValue(this.selectKit.highlighted))), (0, _helpers.makeArray)(this.selectedContent).concat((0, _helpers.makeArray)(this.selectKit.highlighted)));
      } else {
        var existingItem = this.findValue(this.mainCollection, this.selectKit.valueProperty ? item : value);

        if (existingItem) {
          if (!this.validateSelect(item)) {
            return;
          }
        }

        var newValues = (0, _helpers.makeArray)(this.value).concat((0, _helpers.makeArray)(value));
        var newContent = (0, _helpers.makeArray)(this.selectedContent).concat((0, _helpers.makeArray)(item));
        this.selectKit.change(newValues, newContent.length ? newContent : (0, _helpers.makeArray)(this.defaultItem(value, value)));
      }
    },
    selectedContent: (0, _object.computed)("value.[]", "content.[]", function () {
      var _this4 = this;

      var value = (0, _helpers.makeArray)(this.value).map(function (v) {
        return _this4.selectKit.options.castInteger && _this4._isNumeric(v) ? Number(v) : v;
      });

      if (value.length) {
        var content = [];
        value.forEach(function (v) {
          if (_this4.selectKit.valueProperty) {
            var c = (0, _helpers.makeArray)(_this4.content).findBy(_this4.selectKit.valueProperty, v);

            if (c) {
              content.push(c);
            }
          } else {
            if ((0, _helpers.makeArray)(_this4.content).includes(v)) {
              content.push(v);
            }
          }
        });
        return this.selectKit.modifySelection(content);
      } else {
        return this.selectKit.noneItem;
      }
    }),
    _onKeydown: function _onKeydown(event) {
      if (event.keyCode === 8) {
        event.stopPropagation();
        var input = this.getFilterInput();

        if (input && input.value.length === 0) {
          var selected = this.element.querySelectorAll(".select-kit-header .choice.select-kit-selected-name");

          if (selected.length) {
            var lastSelected = selected[selected.length - 1];

            if (lastSelected) {
              if (lastSelected.classList.contains("is-highlighted")) {
                this.deselect(this.selectedContent.lastObject);
              } else {
                lastSelected.classList.add("is-highlighted");
              }
            }
          }
        }
      } else {
        var _selected = this.element.querySelectorAll(".select-kit-header .choice.select-kit-selected-name");

        _selected.forEach(function (s) {
          return s.classList.remove("is-highlighted");
        });
      }

      return true;
    },
    handleDeprecations: function handleDeprecations() {
      this._super.apply(this, arguments);

      this._deprecateValues();
    },
    _deprecateValues: function _deprecateValues() {
      if (this.values && !this.value) {
        (0, _deprecated.default)("The `values` property is deprecated for multi-select. Use `value` instead", {
          since: "v2.4.0"
        });
        this.set("value", this.values);
      }
    }
  });

  _exports.default = _default;
});
define("select-kit/components/multi-select/multi-select-filter", ["exports", "I18n", "select-kit/components/select-kit/select-kit-filter", "discourse-common/utils/decorators", "select-kit/templates/components/select-kit/select-kit-filter"], function (_exports, _I18n, _selectKitFilter, _decorators, _selectKitFilter2) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _Ember = Ember,
      isEmpty = _Ember.isEmpty;

  var _default = _selectKitFilter.default.extend((_dec = (0, _decorators.default)("placeholder", "selectKit.hasSelection"), (_obj = {
    layout: _selectKitFilter2.default,
    classNames: ["multi-select-filter"],
    computedPlaceholder: function computedPlaceholder(placeholder, hasSelection) {
      if (hasSelection) {
        return "";
      }

      return isEmpty(placeholder) ? "" : _I18n.default.t(placeholder);
    },
    actions: {
      onPaste: function onPaste(event) {
        var data = event.originalEvent.clipboardData;

        if (!data) {
          return;
        }

        var parts = data.getData("text").split("|").filter(Boolean);

        if (parts.length > 1) {
          event.stopPropagation();
          event.preventDefault();
          this.selectKit.append(parts);
          return false;
        }
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "computedPlaceholder", [_dec], Object.getOwnPropertyDescriptor(_obj, "computedPlaceholder"), _obj)), _obj)));

  _exports.default = _default;
});
define("select-kit/components/multi-select/multi-select-header", ["exports", "select-kit/components/select-kit/select-kit-header", "@ember/object", "select-kit/templates/components/multi-select/multi-select-header", "discourse-common/lib/helpers"], function (_exports, _selectKitHeader, _object, _multiSelectHeader, _helpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _selectKitHeader.default.extend({
    classNames: ["multi-select-header"],
    layout: _multiSelectHeader.default,
    selectedNames: (0, _object.computed)("selectedContent", function () {
      var _this = this;

      return (0, _helpers.makeArray)(this.selectedContent).map(function (c) {
        return _this.getName(c);
      });
    }),
    hasReachedMaximumSelection: (0, _object.computed)("selectedValue", function () {
      if (!this.selectKit.options.maximum) {
        return false;
      }

      return this.selectedValue.length >= this.selectKit.options.maximum;
    }),
    selectedValue: (0, _object.computed)("selectedContent", function () {
      var _this2 = this;

      return (0, _helpers.makeArray)(this.selectedContent).map(function (c) {
        if (_this2.getName(c) !== _this2.getName(_this2.selectKit.noneItem)) {
          return _this2.getValue(c);
        }

        return null;
      }).filter(Boolean);
    })
  });

  _exports.default = _default;
});
define("select-kit/components/multi-select/selected-category", ["exports", "select-kit/components/selected-name", "discourse/helpers/category-link", "@ember/object", "select-kit/templates/components/multi-select/selected-category"], function (_exports, _selectedName, _categoryLink, _object, _selectedCategory) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _selectedName.default.extend({
    classNames: ["selected-category"],
    layout: _selectedCategory.default,
    badge: (0, _object.computed)("item", function () {
      return (0, _categoryLink.categoryBadgeHTML)(this.item, {
        allowUncategorized: true,
        link: false
      }).htmlSafe();
    })
  });

  _exports.default = _default;
});
define("select-kit/components/multi-select/selected-color", ["exports", "select-kit/components/selected-name", "discourse-common/utils/decorators"], function (_exports, _selectedName, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _selectedName.default.extend((_dec = (0, _decorators.default)("name"), (_obj = {
    classNames: ["select-kit-selected-color"],
    footerContent: function footerContent(name) {
      return "<span class=\"color-preview\" style=\"background:#".concat(name, "\"></span>").htmlSafe();
    }
  }, (_applyDecoratedDescriptor(_obj, "footerContent", [_dec], Object.getOwnPropertyDescriptor(_obj, "footerContent"), _obj)), _obj)));

  _exports.default = _default;
});
define("select-kit/components/none-category-row", ["exports", "select-kit/components/category-row", "discourse/helpers/category-link", "discourse-common/utils/decorators", "select-kit/templates/components/category-row"], function (_exports, _categoryRow, _categoryLink, _decorators, _categoryRow2) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _categoryRow.default.extend((_dec = (0, _decorators.default)("category"), (_obj = {
    layout: _categoryRow2.default,
    classNames: "none category-row",
    badgeForCategory: function badgeForCategory(category) {
      return (0, _categoryLink.categoryBadgeHTML)(category, {
        link: this.categoryLink,
        allowUncategorized: true,
        hideParent: true
      }).htmlSafe();
    }
  }, (_applyDecoratedDescriptor(_obj, "badgeForCategory", [_dec], Object.getOwnPropertyDescriptor(_obj, "badgeForCategory"), _obj)), _obj)));

  _exports.default = _default;
});
define("select-kit/components/notifications-button", ["exports", "discourse/lib/notification-levels", "@ember/object", "select-kit/components/dropdown-select-box", "I18n"], function (_exports, _notificationLevels, _object, _dropdownSelectBox, _I18n) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _dropdownSelectBox.default.extend({
    pluginApiIdentifiers: ["notifications-button"],
    classNames: ["notifications-button"],
    content: _notificationLevels.allLevels,
    nameProperty: "key",
    selectKitOptions: {
      autoFilterable: false,
      filterable: false,
      i18nPrefix: "",
      i18nPostfix: ""
    },
    modifyComponentForRow: function modifyComponentForRow() {
      return "notifications-button/notifications-button-row";
    },
    modifySelection: function modifySelection(content) {
      content = content || {};
      var _this$selectKit$optio = this.selectKit.options,
          i18nPrefix = _this$selectKit$optio.i18nPrefix,
          i18nPostfix = _this$selectKit$optio.i18nPostfix;

      var title = _I18n.default.t("".concat(i18nPrefix, ".").concat(this.buttonForValue.key).concat(i18nPostfix, ".title"));

      (0, _object.setProperties)(content, {
        title: title,
        label: title,
        icon: this.buttonForValue.icon
      });
      return content;
    },
    buttonForValue: (0, _object.computed)("value", function () {
      return (0, _notificationLevels.buttonDetails)(this.value);
    })
  });

  _exports.default = _default;
});
define("select-kit/components/notifications-button/notifications-button-row", ["exports", "select-kit/components/dropdown-select-box/dropdown-select-box-row", "I18n", "@ember/object", "discourse/lib/utilities", "@ember/object/computed"], function (_exports, _dropdownSelectBoxRow, _I18n, _object, _utilities, _computed) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _dropdownSelectBoxRow.default.extend({
    classNames: ["notifications-button-row"],
    i18nPrefix: (0, _computed.readOnly)("selectKit.options.i18nPrefix"),
    i18nPostfix: (0, _computed.readOnly)("selectKit.options.i18nPostfix"),
    label: (0, _object.computed)("_start", function () {
      return (0, _utilities.escapeExpression)(_I18n.default.t("".concat(this._start, ".title")));
    }),
    title: (0, _computed.readOnly)("label"),
    icons: (0, _object.computed)("title", "item.icon", function () {
      return [(0, _utilities.escapeExpression)(this.item.icon)];
    }),
    description: (0, _object.computed)("_start", function () {
      if (this.site && this.site.mobileView) {
        return null;
      }

      return (0, _utilities.escapeExpression)(_I18n.default.t("".concat(this._start, ".description")));
    }),
    _start: (0, _object.computed)("i18nPrefix", "i18nPostfix", "rowName", function () {
      return "".concat(this.i18nPrefix, ".").concat(this.rowName).concat(this.i18nPostfix);
    })
  });

  _exports.default = _default;
});
define("select-kit/components/notifications-filter", ["exports", "select-kit/components/dropdown-select-box", "I18n", "@ember/object"], function (_exports, _dropdownSelectBox, _I18n, _object) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _dropdownSelectBox.default.extend({
    classNames: ["notifications-filter"],
    content: (0, _object.computed)(function () {
      return [{
        id: "all",
        label: _I18n.default.t("user.user_notifications.filters.all")
      }, {
        id: "read",
        label: _I18n.default.t("user.user_notifications.filters.read")
      }, {
        id: "unread",
        label: _I18n.default.t("user.user_notifications.filters.unread")
      }];
    }),
    selectKitOptions: {
      headerComponent: "notifications-filter/notifications-filter-header"
    }
  });

  _exports.default = _default;
});
define("select-kit/components/notifications-filter/notifications-filter-header", ["exports", "select-kit/components/dropdown-select-box/dropdown-select-box-header", "discourse-common/utils/decorators", "discourse/lib/computed", "select-kit/templates/components/notifications-filter/notifications-filter-header"], function (_exports, _dropdownSelectBoxHeader, _decorators, _computed, _notificationsFilterHeader) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _dropdownSelectBoxHeader.default.extend((_dec = (0, _decorators.default)("selectKit.isExpanded"), (_obj = {
    layout: _notificationsFilterHeader.default,
    classNames: ["notifications-filter-header"],
    label: (0, _computed.fmt)("value", "user.user_notifications.filters.%@"),
    caretIcon: function caretIcon(isExpanded) {
      return isExpanded ? "caret-up" : "caret-down";
    }
  }, (_applyDecoratedDescriptor(_obj, "caretIcon", [_dec], Object.getOwnPropertyDescriptor(_obj, "caretIcon"), _obj)), _obj)));

  _exports.default = _default;
});
define("select-kit/components/period-chooser", ["exports", "@ember/object/computed", "select-kit/components/dropdown-select-box"], function (_exports, _computed, _dropdownSelectBox) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _dropdownSelectBox.default.extend({
    classNames: ["period-chooser"],
    classNameBindings: ["showPeriods::hidden"],
    content: (0, _computed.oneWay)("site.periods"),
    value: (0, _computed.readOnly)("period"),
    valueProperty: null,
    nameProperty: null,
    showPeriods: true,
    modifyComponentForRow: function modifyComponentForRow() {
      return "period-chooser/period-chooser-row";
    },
    selectKitOptions: {
      filterable: false,
      autoFilterable: false,
      fullDay: "fullDay",
      headerComponent: "period-chooser/period-chooser-header"
    },
    actions: {
      onChange: function onChange(value) {
        if (this.action) {
          this.action(value);
        } else {
          this.attrs.onChange && this.attrs.onChange(value);
        }
      }
    }
  });

  _exports.default = _default;
});
define("select-kit/components/period-chooser/period-chooser-header", ["exports", "select-kit/components/dropdown-select-box/dropdown-select-box-header", "discourse-common/utils/decorators", "select-kit/templates/components/period-chooser/period-chooser-header"], function (_exports, _dropdownSelectBoxHeader, _decorators, _periodChooserHeader) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _dropdownSelectBoxHeader.default.extend((_dec = (0, _decorators.default)("selectKit.isExpanded"), (_obj = {
    layout: _periodChooserHeader.default,
    classNames: ["period-chooser-header"],
    caretIcon: function caretIcon(isExpanded) {
      return isExpanded ? "caret-up" : "caret-down";
    }
  }, (_applyDecoratedDescriptor(_obj, "caretIcon", [_dec], Object.getOwnPropertyDescriptor(_obj, "caretIcon"), _obj)), _obj)));

  _exports.default = _default;
});
define("select-kit/components/period-chooser/period-chooser-row", ["exports", "select-kit/components/dropdown-select-box/dropdown-select-box-row", "I18n", "discourse-common/utils/decorators", "select-kit/templates/components/period-chooser/period-chooser-row"], function (_exports, _dropdownSelectBoxRow, _I18n, _decorators, _periodChooserRow) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _dropdownSelectBoxRow.default.extend((_dec = (0, _decorators.default)("rowName"), (_obj = {
    layout: _periodChooserRow.default,
    classNames: ["period-chooser-row"],
    title: function title(rowName) {
      return _I18n.default.t("filters.top.".concat(rowName || "this_week")).title;
    }
  }, (_applyDecoratedDescriptor(_obj, "title", [_dec], Object.getOwnPropertyDescriptor(_obj, "title"), _obj)), _obj)));

  _exports.default = _default;
});
define("select-kit/components/pinned-button", ["exports", "@ember/component", "I18n", "discourse-common/utils/decorators", "select-kit/templates/components/pinned-button"], function (_exports, _component, _I18n, _decorators, _pinnedButton) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_dec = (0, _decorators.default)("topic.pinned_globally", "pinned"), _dec2 = (0, _decorators.default)("pinned", "topic.deleted", "topic.unpinned"), (_obj = {
    pluginApiIdentifiers: ["pinned-button"],
    descriptionKey: "help",
    classNames: "pinned-button",
    classNameBindings: ["isHidden"],
    layout: _pinnedButton.default,
    reasonText: function reasonText(pinnedGlobally, pinned) {
      var globally = pinnedGlobally ? "_globally" : "";
      var pinnedKey = pinned ? "pinned".concat(globally) : "unpinned";
      var key = "topic_statuses.".concat(pinnedKey, ".help");
      return _I18n.default.t(key);
    },
    isHidden: function isHidden(pinned, deleted, unpinned) {
      return deleted || !pinned && !unpinned;
    }
  }, (_applyDecoratedDescriptor(_obj, "reasonText", [_dec], Object.getOwnPropertyDescriptor(_obj, "reasonText"), _obj), _applyDecoratedDescriptor(_obj, "isHidden", [_dec2], Object.getOwnPropertyDescriptor(_obj, "isHidden"), _obj)), _obj)));

  _exports.default = _default;
});
define("select-kit/components/pinned-options", ["exports", "@ember/object", "select-kit/components/dropdown-select-box", "I18n"], function (_exports, _object, _dropdownSelectBox, _I18n) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var UNPINNED = "unpinned";
  var PINNED = "pinned";

  var _default = _dropdownSelectBox.default.extend((_obj = {
    pluginApiIdentifiers: ["pinned-options"],
    classNames: ["pinned-options"],
    selectKitOptions: {
      showCaret: true
    },
    modifySelection: function modifySelection(content) {
      var pinnedGlobally = this.get("topic.pinned_globally");
      var pinned = this.value;
      var globally = pinnedGlobally ? "_globally" : "";
      var state = pinned ? "pinned".concat(globally) : UNPINNED;

      var title = _I18n.default.t("topic_statuses.".concat(state, ".title"));

      content.label = "<span>".concat(title, "</span>").htmlSafe();
      content.title = title;
      content.name = state;
      content.icon = "thumbtack".concat(state === UNPINNED ? " unpinned" : "");
      return content;
    },
    content: (0, _object.computed)(function () {
      var globally = this.topic.pinned_globally ? "_globally" : "";
      return [{
        id: PINNED,
        name: _I18n.default.t("topic_statuses.pinned".concat(globally, ".title")),
        description: this.site.mobileView ? null : _I18n.default.t("topic_statuses.pinned".concat(globally, ".help")),
        icon: "thumbtack"
      }, {
        id: UNPINNED,
        name: _I18n.default.t("topic_statuses.unpinned.title"),
        icon: "thumbtack unpinned",
        description: this.site.mobileView ? null : _I18n.default.t("topic_statuses.unpinned.help")
      }];
    }),
    onChange: function onChange(value) {
      var topic = this.topic;

      if (value === UNPINNED) {
        return topic.clearPin();
      } else {
        return topic.rePin();
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "onChange", [_object.action], Object.getOwnPropertyDescriptor(_obj, "onChange"), _obj)), _obj));

  _exports.default = _default;
});
define("select-kit/components/search-advanced-category-chooser", ["exports", "select-kit/components/category-chooser"], function (_exports, _categoryChooser) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _categoryChooser.default.extend({
    pluginApiIdentifiers: ["search-advanced-category-chooser"],
    classNames: ["search-advanced-category-chooser"],
    selectKitOptions: {
      allowUncategorized: true,
      clearable: true,
      none: "category.all",
      displayCategoryDescription: false,
      permissionType: null
    }
  });

  _exports.default = _default;
});
define("select-kit/components/select-kit", ["exports", "@ember/object", "select-kit/mixins/plugin-api", "@ember/runloop", "@ember/utils", "@ember/component", "I18n", "@ember/object/mixin", "rsvp", "select-kit/mixins/utils", "@popperjs/core", "discourse-common/lib/deprecated", "discourse-common/lib/debounce", "@ember/object/internals", "discourse-common/lib/helpers"], function (_exports, _object, _pluginApi, _runloop, _utils, _component, _I18n, _mixin, _rsvp, _utils2, _core, _deprecated2, _debounce, _internals, _helpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _exports.ERRORS_COLLECTION = _exports.MAIN_COLLECTION = void 0;

  function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

  var MAIN_COLLECTION = "MAIN_COLLECTION";
  _exports.MAIN_COLLECTION = MAIN_COLLECTION;
  var ERRORS_COLLECTION = "ERRORS_COLLECTION";
  _exports.ERRORS_COLLECTION = ERRORS_COLLECTION;
  var EMPTY_OBJECT = Object.freeze({});

  var SELECT_KIT_OPTIONS = _mixin.default.create({
    mergedProperties: ["selectKitOptions"],
    selectKitOptions: EMPTY_OBJECT
  });

  function isDocumentRTL() {
    return window.getComputedStyle(document.querySelector("html")).direction === "rtl";
  }

  var _default = _component.default.extend(SELECT_KIT_OPTIONS, _pluginApi.default, _utils2.default, {
    pluginApiIdentifiers: ["select-kit"],
    classNames: ["select-kit"],
    classNameBindings: ["selectKit.isLoading:is-loading", "selectKit.isExpanded:is-expanded", "selectKit.options.disabled:is-disabled", "selectKit.isHidden:is-hidden", "selectKit.hasSelection:has-selection"],
    tabindex: 0,
    content: null,
    value: null,
    selectKit: null,
    mainCollection: null,
    errorsCollection: null,
    options: null,
    valueProperty: "id",
    nameProperty: "name",
    singleSelect: false,
    multiSelect: false,
    labelProperty: null,
    titleProperty: null,
    langProperty: null,
    init: function init() {
      this._super.apply(this, arguments);

      this._searchPromise = null;
      this.set("errorsCollection", []);
      this._collections = [ERRORS_COLLECTION, MAIN_COLLECTION];
      !this.options && this.set("options", _object.default.create({}));
      this.handleDeprecations();
      this.set("selectKit", _object.default.create({
        uniqueID: (0, _internals.guidFor)(this),
        valueProperty: this.valueProperty,
        nameProperty: this.nameProperty,
        labelProperty: this.labelProperty,
        titleProperty: this.titleProperty,
        langProperty: this.langProperty,
        options: _object.default.create(),
        isLoading: false,
        isHidden: false,
        isExpanded: false,
        isFilterExpanded: false,
        hasSelection: false,
        hasNoContent: true,
        highlighted: null,
        noneItem: null,
        newItem: null,
        filter: null,
        modifyContent: (0, _runloop.bind)(this, this._modifyContentWrapper),
        modifySelection: (0, _runloop.bind)(this, this._modifySelectionWrapper),
        modifyComponentForRow: (0, _runloop.bind)(this, this._modifyComponentForRowWrapper),
        modifyContentForCollection: (0, _runloop.bind)(this, this._modifyContentForCollectionWrapper),
        modifyComponentForCollection: (0, _runloop.bind)(this, this._modifyComponentForCollectionWrapper),
        toggle: (0, _runloop.bind)(this, this._toggle),
        close: (0, _runloop.bind)(this, this._close),
        open: (0, _runloop.bind)(this, this._open),
        highlightNext: (0, _runloop.bind)(this, this._highlightNext),
        highlightPrevious: (0, _runloop.bind)(this, this._highlightPrevious),
        change: (0, _runloop.bind)(this, this._onChangeWrapper),
        select: (0, _runloop.bind)(this, this.select),
        deselect: (0, _runloop.bind)(this, this.deselect),
        append: (0, _runloop.bind)(this, this.append),
        onOpen: (0, _runloop.bind)(this, this._onOpenWrapper),
        onClose: (0, _runloop.bind)(this, this._onCloseWrapper),
        onInput: (0, _runloop.bind)(this, this._onInput),
        onClearSelection: (0, _runloop.bind)(this, this._onClearSelection),
        onHover: (0, _runloop.bind)(this, this._onHover),
        onKeydown: (0, _runloop.bind)(this, this._onKeydownWrapper)
      }));
    },
    click: function click(event) {
      if (this.selectKit.options.preventsClickPropagation) {
        event.stopPropagation();
      }
    },
    _modifyComponentForRowWrapper: function _modifyComponentForRowWrapper(collection, item) {
      var component = this.modifyComponentForRow(collection, item);
      return component || "select-kit/select-kit-row";
    },
    modifyComponentForRow: function modifyComponentForRow() {},
    _modifyContentForCollectionWrapper: function _modifyContentForCollectionWrapper(identifier) {
      var collection = this.modifyContentForCollection(identifier);

      if (!collection) {
        switch (identifier) {
          case ERRORS_COLLECTION:
            collection = this.errorsCollection;
            break;

          default:
            collection = this.mainCollection;
            break;
        }
      }

      return collection;
    },
    modifyContentForCollection: function modifyContentForCollection() {},
    _modifyComponentForCollectionWrapper: function _modifyComponentForCollectionWrapper(identifier) {
      var component = this.modifyComponentForCollection(identifier);

      if (!component) {
        switch (identifier) {
          case ERRORS_COLLECTION:
            component = "select-kit/errors-collection";
            break;

          default:
            component = "select-kit/select-kit-collection";
            break;
        }
      }

      return component;
    },
    modifyComponentForCollection: function modifyComponentForCollection() {},
    didUpdateAttrs: function didUpdateAttrs() {
      this._super.apply(this, arguments);

      this.handleDeprecations();
    },
    willDestroyElement: function willDestroyElement() {
      this._super.apply(this, arguments);

      this._searchPromise && (0, _runloop.cancel)(this._searchPromise);

      if (this.popper) {
        this.popper.destroy();
        this.popper = null;
      }
    },
    didReceiveAttrs: function didReceiveAttrs() {
      var _this = this;

      this._super.apply(this, arguments);

      var computedOptions = {};
      Object.keys(this.selectKitOptions).forEach(function (key) {
        var value = _this.selectKitOptions[key];

        if (key === "componentForRow" || key === "contentForCollection" || key === "componentForCollection") {
          if (typeof value === "string") {
            computedOptions[key] = function () {
              return value;
            };
          } else {
            computedOptions[key] = (0, _runloop.bind)(_this, value);
          }

          return;
        }

        if (typeof value === "string" && value.indexOf(".") < 0 && value in _this) {
          var computedValue = (0, _object.get)(_this, value);

          if (typeof computedValue !== "function") {
            computedOptions[key] = (0, _object.get)(_this, value);
            return;
          }
        }

        computedOptions[key] = value;
      });
      this.selectKit.options.setProperties(Object.assign(computedOptions, this.options || {}));
      this.selectKit.setProperties({
        hasSelection: !(0, _utils.isEmpty)(this.value),
        noneItem: this._modifyNoSelectionWrapper(),
        newItem: null
      });

      if (this.selectKit.isExpanded) {
        this.triggerSearch();
      }

      if (this.computeContent) {
        this._deprecated("The `computeContent()` function is deprecated pass a `content` attribute or define a `content` computed property in your component.");

        this.set("content", this.computeContent());
      }
    },
    selectKitOptions: {
      showFullTitle: true,
      none: null,
      translatedNone: null,
      filterable: false,
      autoFilterable: "autoFilterable",
      filterIcon: "search",
      filterPlaceholder: "filterPlaceholder",
      translatedFilterPlaceholder: null,
      icon: null,
      icons: null,
      maximum: null,
      maximumLabel: null,
      minimum: null,
      minimumLabel: null,
      autoInsertNoneItem: true,
      clearOnClick: false,
      closeOnChange: true,
      limitMatches: null,
      placement: isDocumentRTL() ? "bottom-end" : "bottom-start",
      placementStrategy: null,
      filterComponent: "select-kit/select-kit-filter",
      selectedNameComponent: "selected-name",
      castInteger: false,
      preventsClickPropagation: false,
      focusAfterOnChange: true,
      triggerOnChangeOnTab: true
    },
    autoFilterable: (0, _object.computed)("content.[]", "selectKit.filter", function () {
      return this.selectKit.filter && this.options.autoFilterable && this.content.length > 15;
    }),
    filterPlaceholder: (0, _object.computed)("options.allowAny", function () {
      return this.options.allowAny ? "select_kit.filter_placeholder_with_any" : "select_kit.filter_placeholder";
    }),
    collections: (0, _object.computed)("selectedContent.[]", "mainCollection.[]", "errorsCollection.[]", function () {
      var _this2 = this;

      return this._collections.map(function (identifier) {
        return {
          identifier: identifier,
          content: _this2.selectKit.modifyContentForCollection(identifier)
        };
      });
    }),
    createContentFromInput: function createContentFromInput(input) {
      return input;
    },
    validateCreate: function validateCreate(filter, content) {
      var _this3 = this;

      this.clearErrors();
      return filter.length > 0 && content && !content.map(function (c) {
        return _this3.getValue(c);
      }).includes(filter) && !(0, _helpers.makeArray)(this.value).includes(filter);
    },
    validateSelect: function validateSelect() {
      this.clearErrors();
      var selection = (0, _helpers.makeArray)(this.value);
      var maximum = this.selectKit.options.maximum;

      if (maximum && selection.length >= maximum) {
        var key = this.selectKit.options.maximumLabel || "select_kit.max_content_reached";
        this.addError(_I18n.default.t(key, {
          count: maximum
        }));
        return false;
      }

      return true;
    },
    addError: function addError(error) {
      var _this4 = this;

      this.errorsCollection.pushObject(error);

      this._safeAfterRender(function () {
        return _this4.popper && _this4.popper.update();
      });
    },
    clearErrors: function clearErrors() {
      if (!this.element || this.isDestroyed || this.isDestroying) {
        return;
      }

      this.set("errorsCollection", []);
    },
    prependCollection: function prependCollection(identifier) {
      this._collections.unshift(identifier);
    },
    appendCollection: function appendCollection(identifier) {
      this._collections.push(identifier);
    },
    insertCollectionAtIndex: function insertCollectionAtIndex(identifier, index) {
      this._collections.insertAt(index, identifier);
    },
    insertBeforeCollection: function insertBeforeCollection(identifier, insertedIdentifier) {
      var index = this._collections.indexOf(identifier);

      this.insertCollectionAtIndex(insertedIdentifier, index - 1);
    },
    insertAfterCollection: function insertAfterCollection(identifier, insertedIdentifier) {
      var index = this._collections.indexOf(identifier);

      this.insertCollectionAtIndex(insertedIdentifier, index + 1);
    },
    _onInput: function _onInput(event) {
      this.popper && this.popper.update();

      if (this._searchPromise) {
        (0, _runloop.cancel)(this._searchPromise);
      }

      (0, _debounce.default)(this, this._debouncedInput, event.target.value, 200);
    },
    _debouncedInput: function _debouncedInput(filter) {
      this.selectKit.setProperties({
        filter: filter,
        isLoading: true
      });
      this.triggerSearch(filter);
    },
    _onChangeWrapper: function _onChangeWrapper(value, items) {
      var _this5 = this;

      this.selectKit.set("filter", null);
      return new _rsvp.Promise(function (resolve) {
        if (!_this5.selectKit.valueProperty && _this5.selectKit.noneItem === value) {
          value = null;
          items = [];
        }

        value = (0, _helpers.makeArray)(value);
        items = (0, _helpers.makeArray)(items);

        if (_this5.multiSelect) {
          items = items.filter(function (i) {
            return i !== _this5.newItem && i !== _this5.noneItem && _this5.getValue(i) !== null;
          });

          if (_this5.selectKit.options.maximum === 1) {
            value = value.slice(0, 1);
            items = items.slice(0, 1);
          }
        }

        if (_this5.singleSelect) {
          value = (0, _utils.isPresent)(value.firstObject) ? value.firstObject : null;
          items = (0, _utils.isPresent)(items.firstObject) ? items.firstObject : null;
        }

        _this5._boundaryActionHandler("onChange", value, items);

        (0, _pluginApi.applyOnChangePluginApiCallbacks)(value, items, _this5);
        resolve(items);
      }).finally(function () {
        if (!_this5.isDestroying && !_this5.isDestroyed) {
          if (_this5.selectKit.options.closeOnChange) {
            _this5.selectKit.close();
          }

          if (_this5.selectKit.options.focusAfterOnChange) {
            _this5._safeAfterRender(function () {
              _this5._focusFilter();

              _this5.popper && _this5.popper.update();
            });
          }
        }
      });
    },
    _modifyContentWrapper: function _modifyContentWrapper(content) {
      content = this.modifyContent(content);
      return (0, _pluginApi.applyContentPluginApiCallbacks)(content, this);
    },
    modifyContent: function modifyContent(content) {
      return content;
    },
    _modifyNoSelectionWrapper: function _modifyNoSelectionWrapper() {
      return this.modifyNoSelection();
    },
    modifyNoSelection: function modifyNoSelection() {
      if (this.selectKit.options.translatedNone) {
        return this.defaultItem(null, this.selectKit.options.translatedNone);
      }

      var none = this.selectKit.options.none;

      if ((0, _utils.isNone)(none) && !this.selectKit.options.allowAny) {
        return null;
      }

      if ((0, _utils.isNone)(none) && this.selectKit.options.allowAny && !this.selectKit.isExpanded) {
        return null;
      }

      var item;

      switch (_typeof(none)) {
        case "string":
          item = this.defaultItem(null, _I18n.default.t(none));
          break;

        default:
          item = none;
      }

      return item;
    },
    _modifySelectionWrapper: function _modifySelectionWrapper(item) {
      return this.modifySelection(item);
    },
    modifySelection: function modifySelection(item) {
      return item;
    },
    _onKeydownWrapper: function _onKeydownWrapper(event) {
      return this._boundaryActionHandler("onKeydown", event);
    },
    _onHover: function _onHover(value, item) {
      (0, _runloop.throttle)(this, this._highlight, item, 25, true);
    },
    _highlight: function _highlight(item) {
      this.selectKit.set("highlighted", item);
    },
    _boundaryActionHandler: function _boundaryActionHandler(actionName) {
      if (!this.element || this.isDestroying || this.isDestroyed) {
        return;
      }

      var boundaryAction = true;
      var privateActionName = "_".concat(actionName);
      var privateAction = (0, _object.get)(this, privateActionName);

      for (var _len = arguments.length, params = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        params[_key - 1] = arguments[_key];
      }

      if (privateAction) {
        boundaryAction = privateAction.call.apply(privateAction, [this].concat(params));
      }

      if (this.actions) {
        var componentAction = (0, _object.get)(this.actions, actionName);

        if (boundaryAction && componentAction) {
          boundaryAction = componentAction.call.apply(componentAction, [this].concat(params));
        }
      }

      var action = (0, _object.get)(this, actionName);

      if (boundaryAction && action) {
        boundaryAction = action.call.apply(action, [this].concat(params));
      }

      return boundaryAction;
    },
    deselect: function deselect() {
      this.clearErrors();
      this.selectKit.change(null, null);
    },
    append: function append() {// do nothing on general case
    },
    search: function search(filter) {
      var _this6 = this;

      var content = this.content || [];

      if (filter) {
        filter = this._normalize(filter);
        content = content.filter(function (c) {
          var name = _this6._normalize(_this6.getName(c));

          return name && name.indexOf(filter) > -1;
        });
      }

      return content;
    },
    triggerSearch: function triggerSearch(filter) {
      if (this._searchPromise) {
        (0, _runloop.cancel)(this._searchPromise);
      }

      this._searchPromise = this._searchWrapper(filter || this.selectKit.filter);
    },
    _searchWrapper: function _searchWrapper(filter) {
      var _this7 = this;

      this.clearErrors();
      this.setProperties({
        mainCollection: [],
        "selectKit.isLoading": true
      });

      this._safeAfterRender(function () {
        return _this7.popper && _this7.popper.update();
      });

      var content = [];
      return _rsvp.Promise.resolve(this.search(filter)).then(function (result) {
        content = content.concat((0, _helpers.makeArray)(result));
        content = _this7.selectKit.modifyContent(content).filter(Boolean);

        if (_this7.selectKit.valueProperty) {
          content = content.uniqBy(_this7.selectKit.valueProperty);
        } else {
          content = content.uniq();
        }

        if (_this7.selectKit.options.limitMatches) {
          content = content.slice(0, _this7.selectKit.options.limitMatches);
        }

        var noneItem = _this7.selectKit.noneItem;

        if (_this7.selectKit.options.allowAny && filter && _this7.getName(noneItem) !== filter) {
          filter = _this7.createContentFromInput(filter);

          if (_this7.validateCreate(filter, content)) {
            _this7.selectKit.set("newItem", _this7.defaultItem(filter, filter));

            content.unshift(_this7.selectKit.newItem);
          }
        }

        var hasNoContent = (0, _utils.isEmpty)(content);

        if (_this7.selectKit.hasSelection && noneItem && _this7.selectKit.options.autoInsertNoneItem) {
          content.unshift(noneItem);
        }

        _this7.set("mainCollection", content);

        _this7.selectKit.setProperties({
          highlighted: _this7.singleSelect && _this7.value ? _this7.itemForValue(_this7.value, _this7.mainCollection) : _this7.mainCollection.firstObject,
          isLoading: false,
          hasNoContent: hasNoContent
        });

        _this7._safeAfterRender(function () {
          _this7.popper && _this7.popper.update();

          _this7._focusFilter();
        });
      });
    },
    _safeAfterRender: function _safeAfterRender(fn) {
      var _this8 = this;

      (0, _runloop.next)(function () {
        (0, _runloop.schedule)("afterRender", function () {
          if (!_this8.element || _this8.isDestroyed || _this8.isDestroying) {
            return;
          }

          fn();
        });
      });
    },
    _scrollToRow: function _scrollToRow(rowItem) {
      var value = this.getValue(rowItem);
      var rowContainer = this.element.querySelector(".select-kit-row[data-value=\"".concat(value, "\"]"));

      if (rowContainer) {
        var collectionContainer = rowContainer.parentNode;
        collectionContainer.scrollTop = rowContainer.offsetTop - collectionContainer.offsetTop;
      }
    },
    _highlightNext: function _highlightNext() {
      var highlightedIndex = this.mainCollection.indexOf(this.selectKit.highlighted);
      var count = this.mainCollection.length;

      if (highlightedIndex < count - 1) {
        highlightedIndex = highlightedIndex + 1;
      } else {
        highlightedIndex = 0;
      }

      var highlighted = this.mainCollection.objectAt(highlightedIndex);

      if (highlighted) {
        this._scrollToRow(highlighted);

        this.set("selectKit.highlighted", highlighted);
      }
    },
    _highlightPrevious: function _highlightPrevious() {
      var highlightedIndex = this.mainCollection.indexOf(this.selectKit.highlighted);
      var count = this.mainCollection.length;

      if (highlightedIndex > 0) {
        highlightedIndex = highlightedIndex - 1;
      } else {
        highlightedIndex = count - 1;
      }

      var highlighted = this.mainCollection.objectAt(highlightedIndex);

      if (highlighted) {
        this._scrollToRow(highlighted);

        this.set("selectKit.highlighted", highlighted);
      }
    },
    select: function select(value, item) {
      if (!(0, _utils.isPresent)(value)) {
        if (!this.validateSelect(this.selectKit.highlighted)) {
          return;
        }

        this.selectKit.change(this.getValue(this.selectKit.highlighted), this.selectKit.highlighted);
      } else {
        var existingItem = this.findValue(this.mainCollection, item);

        if (existingItem) {
          if (!this.validateSelect(item)) {
            return;
          }
        }

        this.selectKit.change(value, item || this.defaultItem(value, value));
      }
    },
    _onClearSelection: function _onClearSelection() {
      this.selectKit.change(null, null);
    },
    _onOpenWrapper: function _onOpenWrapper() {
      return this._boundaryActionHandler("onOpen");
    },
    _onCloseWrapper: function _onCloseWrapper() {
      this.set("selectKit.highlighted", null);
      return this._boundaryActionHandler("onClose");
    },
    _toggle: function _toggle(event) {
      if (this.selectKit.isExpanded) {
        this._close(event);
      } else {
        this._open(event);
      }
    },
    _close: function _close(event) {
      if (!this.selectKit.isExpanded) {
        return;
      }

      this.clearErrors();
      this.selectKit.onClose(event);
      this.selectKit.setProperties({
        isExpanded: false,
        filter: null
      });
    },
    _open: function _open(event) {
      var _this9 = this;

      if (this.selectKit.isExpanded) {
        return;
      }

      this.clearErrors();
      this.selectKit.onOpen(event);

      if (!this.popper) {
        var anchor = document.querySelector("[data-select-kit-id=".concat(this.selectKit.uniqueID, "-header]"));
        var popper = document.querySelector("[data-select-kit-id=".concat(this.selectKit.uniqueID, "-body]"));
        var inModal = $(this.element).parents("#discourse-modal").length;
        var placementStrategy = this.selectKit.options.placementStrategy;

        if (!placementStrategy) {
          placementStrategy = inModal ? "fixed" : "absolute";
        }

        var verticalOffset = this.multiSelect ? 0 : 3;
        this.popper = (0, _core.createPopper)(anchor, popper, {
          eventsEnabled: false,
          strategy: placementStrategy,
          placement: this.selectKit.options.placement,
          modifiers: [{
            name: "offset",
            options: {
              offset: [0, verticalOffset]
            }
          }, {
            name: "applySmallScreenOffset",
            enabled: window.innerWidth <= 450,
            phase: "main",
            fn: function fn(_ref) {
              var state = _ref.state;

              if (!inModal) {
                var _state$elements$refer = state.elements.reference.getBoundingClientRect(),
                    x = _state$elements$refer.x;

                state.modifiersData.popperOffsets.x = -x + 10;
              }
            }
          }, {
            name: "applySmallScreenMaxWidth",
            enabled: window.innerWidth <= 450,
            phase: "beforeWrite",
            fn: function fn(_ref2) {
              var state = _ref2.state;

              if (inModal) {
                var innerModal = document.querySelector("#discourse-modal div.modal-inner-container");

                if (innerModal) {
                  if (_this9.multiSelect) {
                    state.styles.popper.width = "".concat(_this9.element.offsetWidth, "px");
                  } else {
                    state.styles.popper.width = "".concat(innerModal.clientWidth - 20, "px");
                  }
                }
              } else {
                state.styles.popper.width = "".concat(window.innerWidth - 20, "px");
              }
            }
          }, {
            name: "sameWidth",
            enabled: window.innerWidth > 450,
            phase: "beforeWrite",
            requires: ["computeStyles"],
            fn: function fn(_ref3) {
              var state = _ref3.state;
              state.styles.popper.minWidth = "".concat(state.rects.reference.width, "px");
            },
            effect: function effect(_ref4) {
              var state = _ref4.state;
              state.elements.popper.style.minWidth = "".concat(state.elements.reference.offsetWidth, "px");
            }
          }, {
            name: "positionWrapper",
            phase: "afterWrite",
            enabled: true,
            fn: function fn(data) {
              var wrapper = _this9.element.querySelector(".select-kit-wrapper");

              if (wrapper) {
                var height = _this9.element.offsetHeight + verticalOffset;

                var body = _this9.element.querySelector(".select-kit-body");

                if (body) {
                  height += body.offsetHeight;
                }

                var popperElement = data.state.elements.popper;

                if (popperElement && popperElement.getAttribute("data-popper-placement") === "top-start") {
                  _this9.element.classList.remove("is-under");

                  _this9.element.classList.add("is-above");
                } else {
                  _this9.element.classList.remove("is-above");

                  _this9.element.classList.add("is-under");
                }

                wrapper.style.width = "".concat(_this9.element.offsetWidth, "px");
                wrapper.style.height = "".concat(height, "px");
              }
            }
          }]
        });
      }

      this.selectKit.setProperties({
        isExpanded: true,
        isFilterExpanded: this.selectKit.options.filterable || this.selectKit.options.allowAny
      });
      this.triggerSearch();

      this._safeAfterRender(function () {
        _this9._focusFilter();

        _this9._scrollToCurrent();

        _this9.popper && _this9.popper.update();
      });
    },
    _scrollToCurrent: function _scrollToCurrent() {
      if (this.value && this.mainCollection) {
        var highlighted;

        if (this.valueProperty) {
          highlighted = this.mainCollection.findBy(this.valueProperty, this.value);
        } else {
          var index = this.mainCollection.indexOf(this.value);
          highlighted = this.mainCollection.objectAt(index);
        }

        if (highlighted) {
          this._scrollToRow(highlighted);

          this.set("selectKit.highlighted", highlighted);
        }
      }
    },
    _focusFilter: function _focusFilter() {
      var _this10 = this;

      var forceHeader = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

      this._safeAfterRender(function () {
        var input = _this10.getFilterInput();

        if (!forceHeader && input) {
          input.focus({
            preventScroll: true
          });
        } else {
          var headerContainer = _this10.getHeader();

          headerContainer && headerContainer.focus({
            preventScroll: true
          });
        }
      });
    },
    getFilterInput: function getFilterInput() {
      return document.querySelector("[data-select-kit-id=".concat(this.selectKit.uniqueID, "-filter] input"));
    },
    getHeader: function getHeader() {
      return document.querySelector("[data-select-kit-id=".concat(this.selectKit.uniqueID, "-header]"));
    },
    handleDeprecations: function handleDeprecations() {
      this._deprecateValueAttribute();

      this._deprecateMutations();

      this._deprecateOptions();
    },
    _deprecated: function _deprecated(text) {
      var discourseSetup = document.getElementById("data-discourse-setup");

      if (discourseSetup && discourseSetup.getAttribute("data-environment") === "development") {
        (0, _deprecated2.default)(text, {
          since: "v2.4.0"
        });
      }
    },
    _deprecateValueAttribute: function _deprecateValueAttribute() {
      if (this.valueAttribute || this.valueAttribute === null) {
        this._deprecated("The `valueAttribute` is deprecated. Use `valueProperty` instead");

        this.set("valueProperty", this.valueAttribute);
      }
    },
    _deprecateMutations: function _deprecateMutations() {
      var _this11 = this;

      this.actions = this.actions || {};
      this.attrs = this.attrs || {};

      if (!this.attrs.onChange && !this.actions.onChange) {
        this._deprecated("Implicit mutation has been deprecated, please use `onChange` handler");

        this.actions.onChange = this.attrs.onSelect || this.actions.onSelect || function (value) {
          return _this11.set("value", value);
        };
      }
    },
    _deprecateOptions: function _deprecateOptions() {
      var _this12 = this;

      var migrations = {
        headerIcon: "icon",
        onExpand: "onOpen",
        onCollapse: "onClose",
        allowAny: "options.allowAny",
        allowCreate: "options.allowAny",
        filterable: "options.filterable",
        excludeCategoryId: "options.excludeCategoryId",
        scopedCategoryId: "options.scopedCategoryId",
        allowUncategorized: "options.allowUncategorized",
        none: "options.none",
        rootNone: "options.none",
        disabled: "options.disabled",
        rootNoneLabel: "options.none",
        showFullTitle: "options.showFullTitle",
        title: "options.translatedNone",
        maximum: "options.maximum",
        minimum: "options.minimum",
        i18nPostfix: "options.i18nPostfix",
        i18nPrefix: "options.i18nPrefix",
        castInteger: "options.castInteger"
      };
      Object.keys(migrations).forEach(function (from) {
        var to = migrations[from];

        if (_this12.get(from) && !_this12.get(to)) {
          _this12._deprecated("The `".concat(from, "` attribute is deprecated. Use `").concat(to, "` instead"));

          _this12.set(to, _this12.get(from));
        }
      });
    }
  });

  _exports.default = _default;
});
define("select-kit/components/select-kit/errors-collection", ["exports", "@ember/component", "@ember/object/computed", "select-kit/templates/components/select-kit/errors-collection"], function (_exports, _component, _computed, _errorsCollection) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _component.default.extend({
    layout: _errorsCollection.default,
    classNames: ["select-kit-errors-collection"],
    classNameBindings: ["shouldHide:hidden"],
    tagName: "ul",
    shouldHide: (0, _computed.empty)("collection.content")
  });

  _exports.default = _default;
});
define("select-kit/components/select-kit/select-kit-body", ["exports", "@ember/component", "@ember/runloop", "@ember/object", "select-kit/templates/components/select-kit/select-kit-body"], function (_exports, _component, _runloop, _object, _selectKitBody) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _component.default.extend({
    layout: _selectKitBody.default,
    classNames: ["select-kit-body"],
    attributeBindings: ["role", "selectKitId:data-select-kit-id"],
    selectKitId: (0, _object.computed)("selectKit.uniqueID", function () {
      return "".concat(this.selectKit.uniqueID, "-body");
    }),
    rootEventType: "click",
    role: "listbox",
    init: function init() {
      this._super.apply(this, arguments);

      this.handleRootMouseDownHandler = (0, _runloop.bind)(this, this.handleRootMouseDown);
    },
    didInsertElement: function didInsertElement() {
      this._super.apply(this, arguments);

      document.addEventListener(this.rootEventType, this.handleRootMouseDownHandler, true);
    },
    willDestroyElement: function willDestroyElement() {
      this._super.apply(this, arguments);

      document.removeEventListener(this.rootEventType, this.handleRootMouseDownHandler, true);
    },
    handleRootMouseDown: function handleRootMouseDown(event) {
      if (!this.selectKit.isExpanded) {
        return;
      }

      var headerElement = document.querySelector("[data-select-kit-id=".concat(this.selectKit.uniqueID, "-header]"));

      if (headerElement && headerElement.contains(event.target)) {
        return;
      }

      if (this.element.contains(event.target)) {
        return;
      }

      this.selectKit.close(event);
    }
  });

  _exports.default = _default;
});
define("select-kit/components/select-kit/select-kit-collection", ["exports", "@ember/component", "@ember/object/computed", "select-kit/templates/components/select-kit/select-kit-collection"], function (_exports, _component, _computed, _selectKitCollection) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _component.default.extend({
    layout: _selectKitCollection.default,
    classNames: ["select-kit-collection"],
    classNameBindings: ["shouldHide:hidden"],
    tagName: "ul",
    shouldHide: (0, _computed.empty)("collection")
  });

  _exports.default = _default;
});
define("select-kit/components/select-kit/select-kit-create-row", ["exports", "select-kit/components/select-kit/select-kit-row", "select-kit/templates/components/select-kit/select-kit-row"], function (_exports, _selectKitRow, _selectKitRow2) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _selectKitRow.default.extend({
    layout: _selectKitRow2.default,
    classNames: "create"
  });

  _exports.default = _default;
});
define("select-kit/components/select-kit/select-kit-filter", ["exports", "@ember/component", "I18n", "select-kit/mixins/utils", "@ember/object", "discourse-common/utils/decorators", "@ember/utils", "select-kit/templates/components/select-kit/select-kit-filter", "@ember/object/computed"], function (_exports, _component, _I18n, _utils, _object, _decorators, _utils2, _selectKitFilter, _computed) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend(_utils.default, (_dec = (0, _decorators.default)("selectKit.options.filterPlaceholder", "selectKit.options.translatedFilterPlaceholder"), (_obj = {
    layout: _selectKitFilter.default,
    classNames: ["select-kit-filter"],
    classNameBindings: ["isExpanded:is-expanded"],
    attributeBindings: ["role", "selectKitId:data-select-kit-id"],
    selectKitId: (0, _object.computed)("selectKit.uniqueID", function () {
      return "".concat(this.selectKit.uniqueID, "-filter");
    }),
    role: "searchbox",
    isHidden: (0, _object.computed)("selectKit.options.{filterable,allowAny,autoFilterable}", "content.[]", function () {
      return !this.selectKit.options.filterable && !this.selectKit.options.allowAny && !this.selectKit.options.autoFilterable;
    }),
    isExpanded: (0, _computed.not)("isHidden"),
    placeholder: function placeholder(_placeholder, translatedPlaceholder) {
      if ((0, _utils2.isPresent)(translatedPlaceholder)) {
        return translatedPlaceholder;
      }

      if ((0, _utils2.isPresent)(_placeholder)) {
        return _I18n.default.t(_placeholder);
      }

      return "";
    },
    actions: {
      onPaste: function onPaste() {},
      onInput: function onInput(event) {
        this.selectKit.onInput(event);
        return true;
      },
      onKeydown: function onKeydown(event) {
        if (!this.selectKit.onKeydown(event)) {
          return false;
        } // Do nothing for left/right arrow


        if (event.keyCode === 37 || event.keyCode === 39) {
          return true;
        } // Up arrow


        if (event.keyCode === 38) {
          this.selectKit.highlightPrevious();
          return false;
        } // Down arrow


        if (event.keyCode === 40) {
          this.selectKit.highlightNext();
          return false;
        } // Escape


        if (event.keyCode === 27) {
          this.selectKit.close(event);
          return false;
        } // Enter


        if (event.keyCode === 13 && this.selectKit.highlighted) {
          this.selectKit.select(this.getValue(this.selectKit.highlighted), this.selectKit.highlighted);
          return false;
        }

        if (event.keyCode === 13 && !this.selectKit.highlighted) {
          this.element.querySelector("input").focus();
          return false;
        } // Tab


        if (event.keyCode === 9) {
          if (this.selectKit.highlighted && this.selectKit.isExpanded) {
            this.selectKit.select(this.getValue(this.selectKit.highlighted), this.selectKit.highlighted);
          }

          this.selectKit.close(event);
          return;
        }
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "placeholder", [_dec], Object.getOwnPropertyDescriptor(_obj, "placeholder"), _obj)), _obj)));

  _exports.default = _default;
});
define("select-kit/components/select-kit/select-kit-header", ["exports", "@ember/component", "select-kit/mixins/utils", "@ember/object", "discourse-common/lib/helpers", "@ember/runloop"], function (_exports, _component, _utils, _object, _helpers, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _component.default.extend(_utils.default, {
    eventType: "click",
    click: function click(event) {
      if (typeof document === "undefined") {
        return;
      }

      if (this.isDestroyed || !this.selectKit || this.selectKit.isDisabled) {
        return;
      }

      if (this.eventType !== "click" || event.button !== 0) {
        return;
      }

      this.selectKit.toggle(event);
      event.preventDefault();
    },
    classNames: ["select-kit-header"],
    classNameBindings: ["isFocused"],
    attributeBindings: ["tabindex", "ariaOwns:aria-owns", "ariaHasPopup:aria-haspopup", "ariaIsExpanded:aria-expanded", "selectKitId:data-select-kit-id", "roleButton:role", "selectedValue:data-value", "selectedNames:data-name", "buttonTitle:title"],
    selectedValue: (0, _object.computed)("value", function () {
      return this.value === this.getValue(this.selectKit.noneItem) ? null : (0, _helpers.makeArray)(this.value).join(",");
    }),
    selectedNames: (0, _object.computed)("selectedContent.[]", function () {
      var _this = this;

      return (0, _helpers.makeArray)(this.selectedContent).map(function (s) {
        return _this.getName(s);
      }).join(",");
    }),
    buttonTitle: (0, _object.computed)("value", "selectKit.noneItem", function () {
      if (!this.value && this.selectKit.noneItem && !this.selectKit.options.showFullTitle) {
        return this.selectKit.noneItem.title || this.selectKit.noneItem.name;
      }
    }),
    icons: (0, _object.computed)("selectKit.options.{icon,icons}", function () {
      var icon = (0, _helpers.makeArray)(this.selectKit.options.icon);
      var icons = (0, _helpers.makeArray)(this.selectKit.options.icons);
      return icon.concat(icons).filter(Boolean);
    }),
    selectKitId: (0, _object.computed)("selectKit.uniqueID", function () {
      return "".concat(this.selectKit.uniqueID, "-header");
    }),
    ariaIsExpanded: (0, _object.computed)("selectKit.isExpanded", function () {
      return this.selectKit.isExpanded ? "true" : "false";
    }),
    ariaHasPopup: true,
    ariaOwns: (0, _object.computed)("selectKit.uniqueID", function () {
      return "[data-select-kit-id=".concat(this.selectKit.uniqueID, "-body]");
    }),
    roleButton: "button",
    tabindex: 0,
    keyUp: function keyUp(event) {
      if (event.keyCode === 32) {
        event.preventDefault();
      }
    },
    keyDown: function keyDown(event) {
      var _this2 = this;

      if (this.selectKit.isDisabled) {
        return;
      }

      if (!this.selectKit.onKeydown(event)) {
        return false;
      }

      var onlyShiftKey = event.shiftKey && event.keyCode === 16;

      if (event.metaKey || onlyShiftKey) {
        return;
      }

      if (event.keyCode === 13) {
        // Enter
        if (this.selectKit.isExpanded) {
          if (this.selectKit.highlighted) {
            this.selectKit.select(this.getValue(this.selectKit.highlighted), this.selectKit.highlighted);
            return false;
          }
        } else {
          this.selectKit.close(event);
        }
      } else if (event.keyCode === 38) {
        // Up arrow
        if (this.selectKit.isExpanded) {
          this.selectKit.highlightPrevious();
        } else {
          this.selectKit.open(event);
        }

        return false;
      } else if (event.keyCode === 40) {
        // Down arrow
        if (this.selectKit.isExpanded) {
          this.selectKit.highlightNext();
        } else {
          this.selectKit.open(event);
        }

        return false;
      } else if (event.keyCode === 37 || event.keyCode === 39) {
        // Do nothing for left/right arrow
        return true;
      } else if (event.keyCode === 32) {
        // Space
        event.preventDefault(); // prevents the space to trigger a scroll page-next

        this.selectKit.toggle(event);
      } else if (event.keyCode === 27) {
        // Escape
        this.selectKit.close(event);
      } else if (event.keyCode === 8) {
        // Backspace
        this._focusFilterInput();
      } else if (event.keyCode === 9) {
        // Tab
        if (this.selectKit.highlighted && this.selectKit.isExpanded && this.selectKit.options.triggerOnChangeOnTab) {
          this.selectKit.select(this.getValue(this.selectKit.highlighted), this.selectKit.highlighted);
        }

        this.selectKit.close(event);
      } else if (this.selectKit.options.filterable || this.selectKit.options.autoFilterable || this.selectKit.options.allowAny) {
        if (this.selectKit.isExpanded) {
          this._focusFilterInput();
        } else {
          this.selectKit.open(event);
          (0, _runloop.schedule)("afterRender", function () {
            return _this2._focusFilterInput();
          });
        }
      } else {
        if (this.selectKit.isExpanded) {
          return false;
        } else {
          return true;
        }
      }
    },
    _focusFilterInput: function _focusFilterInput() {
      var filterContainer = document.querySelector("[data-select-kit-id=".concat(this.selectKit.uniqueID, "-filter]"));

      if (filterContainer) {
        filterContainer.style.display = "flex";
        var filterInput = filterContainer.querySelector(".filter-input");
        filterInput && filterInput.focus();
      }
    }
  });

  _exports.default = _default;
});
define("select-kit/components/select-kit/select-kit-none-row", ["exports", "select-kit/components/select-kit/select-kit-row", "select-kit/templates/components/select-kit/select-kit-row"], function (_exports, _selectKitRow, _selectKitRow2) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _selectKitRow.default.extend({
    layout: _selectKitRow2.default,
    classNames: "none"
  });

  _exports.default = _default;
});
define("select-kit/components/select-kit/select-kit-row", ["exports", "@ember/object", "@ember/component", "I18n", "select-kit/mixins/utils", "@ember/object/internals", "select-kit/templates/components/select-kit/select-kit-row", "discourse-common/lib/helpers", "@ember/object/computed"], function (_exports, _object, _component, _I18n, _utils, _internals, _selectKitRow, _helpers, _computed) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend(_utils.default, (_obj = {
    layout: _selectKitRow.default,
    classNames: ["select-kit-row"],
    tagName: "li",
    tabIndex: -1,
    attributeBindings: ["tabIndex", "title", "rowValue:data-value", "rowName:data-name", "ariaLabel:aria-label", "ariaSelected:aria-selected", "guid:data-guid", "rowLang:lang", "role"],
    classNameBindings: ["isHighlighted", "isSelected", "isNone", "isNone:none", "item.classNames"],
    didInsertElement: function didInsertElement() {
      this._super.apply(this, arguments);

      this.element.addEventListener("mouseenter", this.handleMouseEnter);
    },
    willDestroyElement: function willDestroyElement() {
      this._super.apply(this, arguments);

      if (this.element) {
        this.element.removeEventListener("mouseenter", this.handleMouseEnter);
      }
    },
    isNone: (0, _object.computed)("rowValue", function () {
      return this.rowValue === this.getValue(this.selectKit.noneItem);
    }),
    role: "option",
    guid: (0, _object.computed)("item", function () {
      return (0, _internals.guidFor)(this.item);
    }),
    lang: (0, _computed.reads)("item.lang"),
    ariaLabel: (0, _object.computed)("item.ariaLabel", "title", function () {
      return this.getProperty(this.item, "ariaLabel") || this.title;
    }),
    ariaSelected: (0, _object.computed)("isSelected", function () {
      return this.isSelected ? "true" : "false";
    }),
    title: (0, _object.computed)("rowTitle", "item.title", "rowName", function () {
      return this.rowTitle || this.getProperty(this.item, "title") || this.rowName;
    }),
    label: (0, _object.computed)("rowLabel", "item.label", "title", "rowName", function () {
      var label = this.rowLabel || this.getProperty(this.item, "label") || this.title || this.rowName;

      if (this.selectKit.options.allowAny && this.rowValue === this.selectKit.filter && this.getName(this.selectKit.noneItem) !== this.rowName && this.getName(this.selectKit.newItem) === this.rowName) {
        return _I18n.default.t("select_kit.create", {
          content: label
        });
      }

      return label;
    }),
    didReceiveAttrs: function didReceiveAttrs() {
      this._super.apply(this, arguments);

      this.setProperties({
        rowName: this.getName(this.item),
        rowValue: this.getValue(this.item),
        rowLabel: this.getProperty(this.item, "labelProperty"),
        rowTitle: this.getProperty(this.item, "titleProperty"),
        rowLang: this.getProperty(this.item, "langProperty")
      });
    },
    icons: (0, _object.computed)("item.{icon,icons}", function () {
      var icon = (0, _helpers.makeArray)(this.getProperty(this.item, "icon"));
      var icons = (0, _helpers.makeArray)(this.getProperty(this.item, "icons"));
      return icon.concat(icons).filter(Boolean);
    }),
    highlightedValue: (0, _object.computed)("selectKit.highlighted", function () {
      return this.getValue(this.selectKit.highlighted);
    }),
    isHighlighted: (0, _object.computed)("rowValue", "highlightedValue", function () {
      return this.rowValue === this.highlightedValue;
    }),
    isSelected: (0, _object.computed)("rowValue", "value", function () {
      return this.rowValue === this.value;
    }),
    handleMouseEnter: function handleMouseEnter() {
      if (!this.isDestroying || !this.isDestroyed) {
        this.selectKit.onHover(this.rowValue, this.item);
      }

      return false;
    },
    click: function click() {
      this.selectKit.select(this.rowValue, this.item);
      return false;
    }
  }, (_applyDecoratedDescriptor(_obj, "handleMouseEnter", [_object.action], Object.getOwnPropertyDescriptor(_obj, "handleMouseEnter"), _obj)), _obj));

  _exports.default = _default;
});
define("select-kit/components/select-kit/single-select-header", ["exports", "select-kit/components/select-kit/select-kit-header", "select-kit/mixins/utils", "select-kit/templates/components/select-kit/single-select-header"], function (_exports, _selectKitHeader, _utils, _singleSelectHeader) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _selectKitHeader.default.extend(_utils.default, {
    layout: _singleSelectHeader.default,
    classNames: ["single-select-header"],
    attributeBindings: ["role"],
    role: "combobox"
  });

  _exports.default = _default;
});
define("select-kit/components/selected-color", ["exports", "select-kit/components/selected-name", "discourse/lib/utilities", "@ember/runloop"], function (_exports, _selectedName, _utilities, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _selectedName.default.extend({
    classNames: ["select-kit-selected-color"],
    didInsertElement: function didInsertElement() {
      var _this = this;

      this._super.apply(this, arguments);

      (0, _runloop.schedule)("afterRender", function () {
        var color = (0, _utilities.escapeExpression)(_this.name),
            el = document.querySelector("[data-value=\"".concat(color, "\"]"));

        if (el) {
          el.style.borderBottomColor = "#".concat(color);
        }
      });
    }
  });

  _exports.default = _default;
});
define("select-kit/components/selected-name", ["exports", "@ember/object", "@ember/component", "select-kit/mixins/utils", "select-kit/templates/components/selected-name", "discourse-common/lib/helpers", "@ember/object/computed"], function (_exports, _object, _component, _utils, _selectedName, _helpers, _computed) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend(_utils.default, (_obj = {
    tagName: "",
    layout: _selectedName.default,
    name: null,
    value: null,
    headerTitle: null,
    headerLang: null,
    headerLabel: null,
    onSelectedNameClick: function onSelectedNameClick() {
      if (this.selectKit.options.clearOnClick) {
        this.selectKit.deselect(this.item);
        return false;
      }
    },
    didReceiveAttrs: function didReceiveAttrs() {
      this._super.apply(this, arguments); // we can't listen on `item.nameProperty` given it's variable


      this.setProperties({
        headerLabel: this.getProperty(this.item, "labelProperty"),
        headerTitle: this.getProperty(this.item, "titleProperty"),
        headerLang: this.getProperty(this.item, "langProperty"),
        name: this.getName(this.item),
        value: this.item === this.selectKit.noneItem ? null : this.getValue(this.item)
      });
    },
    lang: (0, _computed.reads)("headerLang"),
    ariaLabel: (0, _object.computed)("item", "sanitizedTitle", function () {
      return this._safeProperty("ariaLabel", this.item) || this.sanitizedTitle;
    }),
    // this might need a more advanced solution
    // but atm it's the only case we have to handle
    sanitizedTitle: (0, _object.computed)("title", function () {
      return String(this.title).replace("&hellip;", "");
    }),
    title: (0, _object.computed)("headerTitle", "item", function () {
      return this.headerTitle || this._safeProperty("title", this.item) || this.name || "";
    }),
    label: (0, _object.computed)("headerLabel", "title", "name", function () {
      return this.headerLabel || this._safeProperty("label", this.item) || this.title || this.name;
    }),
    icons: (0, _object.computed)("item.{icon,icons}", function () {
      var icon = (0, _helpers.makeArray)(this._safeProperty("icon", this.item));
      var icons = (0, _helpers.makeArray)(this._safeProperty("icons", this.item));
      return icon.concat(icons).filter(Boolean);
    }),
    _safeProperty: function _safeProperty(name, content) {
      if (!content) {
        return null;
      }

      return (0, _object.get)(content, name);
    }
  }, (_applyDecoratedDescriptor(_obj, "onSelectedNameClick", [_object.action], Object.getOwnPropertyDescriptor(_obj, "onSelectedNameClick"), _obj)), _obj));

  _exports.default = _default;
});
define("select-kit/components/single-select", ["exports", "select-kit/components/select-kit", "@ember/object", "@ember/utils", "select-kit/templates/components/single-select"], function (_exports, _selectKit, _object, _utils, _singleSelect) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _selectKit.default.extend({
    pluginApiIdentifiers: ["single-select"],
    layout: _singleSelect.default,
    classNames: ["single-select"],
    singleSelect: true,
    selectKitOptions: {
      headerComponent: "select-kit/single-select-header"
    },
    selectedContent: (0, _object.computed)("value", "content.[]", "selectKit.noneItem", function () {
      if (!(0, _utils.isEmpty)(this.value)) {
        var content;
        var value = this.selectKit.options.castInteger && this._isNumeric(this.value) ? Number(this.value) : this.value;

        if (this.selectKit.valueProperty) {
          content = (this.content || []).findBy(this.selectKit.valueProperty, value);
          return this.selectKit.modifySelection(content || this.defaultItem(value, value));
        } else {
          return this.selectKit.modifySelection((this.content || []).filter(function (c) {
            return c === value;
          }));
        }
      } else {
        return this.selectKit.noneItem;
      }
    })
  });

  _exports.default = _default;
});
define("select-kit/components/tag-chooser-row", ["exports", "select-kit/components/select-kit/select-kit-row", "select-kit/templates/components/tag-chooser-row"], function (_exports, _selectKitRow, _tagChooserRow) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _selectKitRow.default.extend({
    layout: _tagChooserRow.default,
    classNames: ["tag-chooser-row"]
  });

  _exports.default = _default;
});
define("select-kit/components/tag-chooser", ["exports", "select-kit/components/multi-select", "select-kit/mixins/tags", "@ember/object", "discourse-common/lib/helpers"], function (_exports, _multiSelect, _tags, _object, _helpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _multiSelect.default.extend(_tags.default, {
    pluginApiIdentifiers: ["tag-chooser"],
    classNames: ["tag-chooser"],
    selectKitOptions: {
      filterable: true,
      filterPlaceholder: "tagging.choose_for_topic",
      limit: null,
      allowAny: "canCreateTag",
      maximum: "maximumTagCount"
    },
    modifyComponentForRow: function modifyComponentForRow() {
      return "tag-chooser-row";
    },
    blockedTags: null,
    attributeBindings: ["categoryId"],
    excludeSynonyms: false,
    excludeHasSynonyms: false,
    canCreateTag: (0, _object.computed)("site.can_create_tag", "allowCreate", function () {
      return this.allowCreate && this.site.can_create_tag;
    }),
    maximumTagCount: (0, _object.computed)("siteSettings.max_tags_per_topic", "unlimitedTagCount", function () {
      if (!this.unlimitedTagCount) {
        return parseInt(this.options.limit || this.options.maximum || this.get("siteSettings.max_tags_per_topic"), 10);
      }

      return null;
    }),
    init: function init() {
      this._super.apply(this, arguments);

      this.setProperties({
        blockedTags: this.blockedTags || [],
        termMatchesForbidden: false,
        termMatchErrorMessage: null
      });
    },
    value: (0, _object.computed)("tags.[]", function () {
      return (0, _helpers.makeArray)(this.tags).uniq();
    }),
    content: (0, _object.computed)("tags.[]", function () {
      var _this = this;

      return (0, _helpers.makeArray)(this.tags).uniq().map(function (t) {
        return _this.defaultItem(t, t);
      });
    }),
    actions: {
      onChange: function onChange(value, items) {
        if (this.attrs.onChange) {
          this.attrs.onChange(value, items);
        } else {
          this.set("tags", value);
        }
      }
    },
    search: function search(query) {
      var selectedTags = (0, _helpers.makeArray)(this.tags).filter(Boolean);
      var data = {
        q: query,
        limit: this.get("siteSettings.max_tag_search_results"),
        categoryId: this.categoryId
      };

      if (selectedTags.length || this.blockedTags.length) {
        data.selected_tags = selectedTags.concat(this.blockedTags).uniq().slice(0, 100);
      }

      if (!this.everyTag) {
        data.filterForInput = true;
      }

      if (this.excludeSynonyms) {
        data.excludeSynonyms = true;
      }

      if (this.excludeHasSynonyms) {
        data.excludeHasSynonyms = true;
      }

      return this.searchTags("/tags/filter/search", data, this._transformJson);
    },
    _transformJson: function _transformJson(context, json) {
      var results = json.results;
      context.setProperties({
        termMatchesForbidden: json.forbidden ? true : false,
        termMatchErrorMessage: json.forbidden_message
      });

      if (context.blockedTags) {
        results = results.filter(function (result) {
          return !context.blockedTags.includes(result.id);
        });
      }

      if (context.get("siteSettings.tags_sort_alphabetically")) {
        results = results.sort(function (a, b) {
          return a.id > b.id;
        });
      }

      return results.uniqBy("text").map(function (result) {
        return {
          id: result.text,
          name: result.text,
          count: result.count
        };
      });
    }
  });

  _exports.default = _default;
});
define("select-kit/components/tag-drop", ["exports", "@ember/object/computed", "discourse/lib/computed", "discourse/models/category", "select-kit/components/combo-box", "discourse/lib/url", "select-kit/mixins/tags", "@ember/object", "discourse-common/lib/get-url", "@ember/utils", "discourse-common/lib/helpers"], function (_exports, _computed, _computed2, _category, _comboBox, _url, _tags, _object, _getUrl, _utils, _helpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _exports.NONE_TAG_ID = _exports.ALL_TAGS_ID = _exports.NO_TAG_ID = void 0;
  var NO_TAG_ID = "no-tags";
  _exports.NO_TAG_ID = NO_TAG_ID;
  var ALL_TAGS_ID = "all-tags";
  _exports.ALL_TAGS_ID = ALL_TAGS_ID;
  var NONE_TAG_ID = "none";
  _exports.NONE_TAG_ID = NONE_TAG_ID;

  var _default = _comboBox.default.extend(_tags.default, {
    pluginApiIdentifiers: ["tag-drop"],
    classNameBindings: ["categoryStyle", "tagClass", "shouldHide:hidden"],
    classNames: ["tag-drop"],
    value: (0, _computed.readOnly)("tagId"),
    tagName: "li",
    currentCategory: (0, _computed.or)("secondCategory", "firstCategory"),
    showFilterByTag: (0, _computed2.setting)("show_filter_by_tag"),
    categoryStyle: (0, _computed2.setting)("category_style"),
    maxTagSearchResults: (0, _computed2.setting)("max_tag_search_results"),
    sortTagsAlphabetically: (0, _computed2.setting)("tags_sort_alphabetically"),
    shouldHide: (0, _object.computed)("showFilterByTag", "content.[]", function () {
      if (this.showFilterByTag && !(0, _utils.isEmpty)(this.content)) {
        return false;
      }

      return true;
    }),
    selectKitOptions: {
      allowAny: false,
      caretDownIcon: "caret-right",
      caretUpIcon: "caret-down",
      fullWidthOnMobile: true,
      filterable: true,
      headerComponent: "tag-drop/tag-drop-header",
      autoInsertNoneItem: false
    },
    noTagsSelected: (0, _computed.equal)("tagId", NONE_TAG_ID),
    filterable: (0, _computed.gte)("content.length", 15),
    modifyNoSelection: function modifyNoSelection() {
      if (this.noTagsSelected) {
        return this.defaultItem(NO_TAG_ID, this.noTagsLabel);
      } else {
        return this.defaultItem(ALL_TAGS_ID, this.allTagsLabel);
      }
    },
    modifySelection: function modifySelection(content) {
      if (this.tagId) {
        if (this.noTagsSelected) {
          content = this.defaultItem(NO_TAG_ID, this.noTagsLabel);
        } else {
          content = this.defaultItem(this.tagId, this.tagId);
        }
      }

      return content;
    },
    tagClass: (0, _object.computed)("tagId", function () {
      return this.tagId ? "tag-".concat(this.tagId) : "tag_all";
    }),
    currentCategoryUrl: (0, _computed.readOnly)("currentCategory.url"),
    allTagsUrl: (0, _object.computed)("firstCategory", "secondCategory", function () {
      if (this.currentCategory) {
        return (0, _getUrl.default)("".concat(this.currentCategoryUrl, "?allTags=1"));
      } else {
        return (0, _getUrl.default)("/");
      }
    }),
    noTagsUrl: (0, _object.computed)("firstCategory", "secondCategory", function () {
      var url;

      if (this.currentCategory) {
        url = "/tags/c/".concat(_category.default.slugFor(this.currentCategory), "/").concat(this.currentCategory.id);
      } else {
        url = "/tag";
      }

      return (0, _getUrl.default)("".concat(url, "/").concat(NONE_TAG_ID));
    }),
    allTagsLabel: (0, _computed2.i18n)("tagging.selector_all_tags"),
    noTagsLabel: (0, _computed2.i18n)("tagging.selector_no_tags"),
    modifyComponentForRow: function modifyComponentForRow() {
      return "tag-row";
    },
    shortcuts: (0, _object.computed)("tagId", function () {
      var shortcuts = [];

      if (this.tagId !== NONE_TAG_ID) {
        shortcuts.push({
          id: NO_TAG_ID,
          name: this.noTagsLabel
        });
      }

      if (this.tagId) {
        shortcuts.push({
          id: ALL_TAGS_ID,
          name: this.allTagsLabel
        });
      }

      return shortcuts;
    }),
    topTags: (0, _object.computed)("firstCategory", "secondCategory", "site.category_top_tags.[]", "site.top_tags.[]", function () {
      if (this.currentCategory && this.site.category_top_tags) {
        return this.site.category_top_tags;
      }

      return this.site.top_tags;
    }),
    content: (0, _object.computed)("topTags.[]", "shortcuts.[]", function () {
      if (this.sortTagsAlphabetically && this.topTags) {
        return this.shortcuts.concat(this.topTags.sort());
      } else {
        return this.shortcuts.concat((0, _helpers.makeArray)(this.topTags));
      }
    }),
    search: function search(filter) {
      var _this = this;

      if (filter) {
        var data = {
          q: filter,
          limit: this.maxTagSearchResults
        };
        return this.searchTags("/tags/filter/search", data, this._transformJson);
      } else {
        return (this.content || []).map(function (tag) {
          if (tag.id && tag.name) {
            return tag;
          }

          return _this.defaultItem(tag, tag);
        });
      }
    },
    _transformJson: function _transformJson(context, json) {
      return json.results.sort(function (a, b) {
        return a.id > b.id;
      }).map(function (r) {
        var content = context.defaultItem(r.id, r.text);
        content.targetTagId = r.target_tag || r.id;
        content.count = r.count;
        content.pmCount = r.pm_count;
        return content;
      });
    },
    actions: {
      onChange: function onChange(tagId, tag) {
        var url;

        switch (tagId) {
          case ALL_TAGS_ID:
            url = this.allTagsUrl;
            break;

          case NO_TAG_ID:
            url = this.noTagsUrl;
            break;

          default:
            if (this.currentCategory) {
              url = "/tags/c/".concat(_category.default.slugFor(this.currentCategory), "/").concat(this.currentCategory.id);
            } else {
              url = "/tag";
            }

            if (tag && tag.targetTagId) {
              url += "/".concat(tag.targetTagId.toLowerCase());
            } else {
              url += "/".concat(tagId.toLowerCase());
            }

        }

        _url.default.routeTo((0, _getUrl.default)(url));
      }
    }
  });

  _exports.default = _default;
});
define("select-kit/components/tag-drop/tag-drop-header", ["exports", "select-kit/components/combo-box/combo-box-header", "select-kit/templates/components/tag-drop/tag-drop-header"], function (_exports, _comboBoxHeader, _tagDropHeader) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _comboBoxHeader.default.extend({
    layout: _tagDropHeader.default,
    classNames: "tag-drop-header"
  });

  _exports.default = _default;
});
define("select-kit/components/tag-group-chooser", ["exports", "select-kit/components/multi-select", "select-kit/mixins/tags", "@ember/object", "discourse-common/lib/helpers"], function (_exports, _multiSelect, _tags, _object, _helpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _multiSelect.default.extend(_tags.default, {
    pluginApiIdentifiers: ["tag-group-chooser"],
    classNames: ["tag-group-chooser", "tag-chooser"],
    selectKitOptions: {
      allowAny: false,
      filterable: true,
      filterPlaceholder: "category.tag_groups_placeholder",
      limit: null
    },
    modifyComponentForRow: function modifyComponentForRow() {
      return "tag-chooser-row";
    },
    value: (0, _object.computed)("tagGroups.[]", function () {
      return (0, _helpers.makeArray)(this.tagGroups).uniq();
    }),
    content: (0, _object.computed)("tagGroups.[]", function () {
      var _this = this;

      return (0, _helpers.makeArray)(this.tagGroups).uniq().map(function (t) {
        return _this.defaultItem(t, t);
      });
    }),
    actions: {
      onChange: function onChange(value) {
        this.set("tagGroups", value);
      }
    },
    search: function search(query) {
      var _this2 = this;

      var data = {
        q: query,
        limit: this.get("siteSettings.max_tag_search_results")
      };
      return this.searchTags("/tag_groups/filter/search", data, this._transformJson).then(function (results) {
        if (results && results.length) {
          return results.filter(function (r) {
            return !(0, _helpers.makeArray)(_this2.tagGroups).includes(_this2.getValue(r));
          });
        }
      });
    },
    _transformJson: function _transformJson(context, json) {
      return json.results.sort(function (a, b) {
        return a.id > b.id;
      }).map(function (result) {
        return {
          id: result.text,
          name: result.text,
          count: result.count
        };
      });
    }
  });

  _exports.default = _default;
});
define("select-kit/components/tag-notifications-button", ["exports", "select-kit/components/notifications-button"], function (_exports, _notificationsButton) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _notificationsButton.default.extend({
    pluginApiIdentifiers: ["tag-notifications-button"],
    classNames: ["tag-notifications-button"],
    selectKitOptions: {
      showFullTitle: false,
      i18nPrefix: "tagging.notifications"
    }
  });

  _exports.default = _default;
});
define("select-kit/components/tag-row", ["exports", "select-kit/components/select-kit/select-kit-row", "select-kit/templates/components/tag-row"], function (_exports, _selectKitRow, _tagRow) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _selectKitRow.default.extend({
    layout: _tagRow.default,
    classNames: ["tag-row"]
  });

  _exports.default = _default;
});
define("select-kit/components/timezone-input", ["exports", "select-kit/components/combo-box", "@ember/object"], function (_exports, _comboBox, _object) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _comboBox.default.extend({
    pluginApiIdentifiers: ["timezone-input"],
    classNames: ["timezone-input"],
    nameProperty: null,
    valueProperty: null,
    selectKitOptions: {
      filterable: true,
      allowAny: false
    },
    content: (0, _object.computed)(function () {
      if (moment.locale() !== "en" && typeof moment.tz.localizedNames === "function") {
        return moment.tz.localizedNames().mapBy("value");
      } else {
        return moment.tz.names();
      }
    })
  });

  _exports.default = _default;
});
define("select-kit/components/toolbar-popup-menu-options", ["exports", "select-kit/components/dropdown-select-box", "I18n"], function (_exports, _dropdownSelectBox, _I18n) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _dropdownSelectBox.default.extend({
    pluginApiIdentifiers: ["toolbar-popup-menu-options"],
    classNames: ["toolbar-popup-menu-options"],
    selectKitOptions: {
      showFullTitle: false,
      filterable: false,
      autoFilterable: false
    },
    modifyContent: function modifyContent(contents) {
      return contents.map(function (content) {
        if (content.condition) {
          return {
            icon: content.icon,
            name: _I18n.default.t(content.label),
            id: content.action
          };
        }
      }).filter(Boolean);
    }
  });

  _exports.default = _default;
});
define("select-kit/components/topic-footer-mobile-dropdown", ["exports", "select-kit/components/combo-box"], function (_exports, _comboBox) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _comboBox.default.extend({
    pluginApiIdentifiers: ["topic-footer-mobile-dropdown"],
    classNames: ["topic-footer-mobile-dropdown"],
    selectKitOptions: {
      none: "topic.controls",
      filterable: false,
      autoFilterable: false
    },
    actions: {
      onChange: function onChange(value, item) {
        item.action && item.action();
      }
    }
  });

  _exports.default = _default;
});
define("select-kit/components/topic-notifications-button", ["exports", "@ember/object", "@ember/component", "select-kit/templates/components/topic-notifications-button"], function (_exports, _object, _component, _topicNotificationsButton) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_obj = {
    layout: _topicNotificationsButton.default,
    classNames: ["topic-notifications-button"],
    classNameBindings: ["isLoading"],
    appendReason: true,
    showFullTitle: true,
    notificationLevel: null,
    topic: null,
    showCaret: true,
    isLoading: false,
    icon: (0, _object.computed)("isLoading", function () {
      return this.isLoading ? "spinner" : null;
    }),
    changeTopicNotificationLevel: function changeTopicNotificationLevel(levelId) {
      var _this = this;

      if (levelId !== this.notificationLevel) {
        this.set("isLoading", true);
        this.topic.details.updateNotifications(levelId).finally(function () {
          return _this.set("isLoading", false);
        });
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "changeTopicNotificationLevel", [_object.action], Object.getOwnPropertyDescriptor(_obj, "changeTopicNotificationLevel"), _obj)), _obj));

  _exports.default = _default;
});
define("select-kit/components/topic-notifications-options", ["exports", "select-kit/components/notifications-button", "@ember/object", "discourse/lib/notification-levels"], function (_exports, _notificationsButton, _object, _notificationLevels) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _notificationsButton.default.extend({
    pluginApiIdentifiers: ["topic-notifications-options"],
    classNames: ["topic-notifications-options"],
    content: _notificationLevels.topicLevels,
    selectKitOptions: {
      i18nPrefix: "topic.notifications",
      i18nPostfix: "i18nPostfix",
      showCaret: true
    },
    i18nPostfix: (0, _object.computed)("topic.archetype", function () {
      return this.topic.archetype === "private_message" ? "_pm" : "";
    })
  });

  _exports.default = _default;
});
define("select-kit/components/user-chooser", ["exports", "discourse/lib/user-search", "select-kit/components/multi-select", "@ember/object", "discourse-common/lib/helpers"], function (_exports, _userSearch, _multiSelect, _object, _helpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _multiSelect.default.extend({
    pluginApiIdentifiers: ["user-chooser"],
    classNames: ["user-chooser"],
    valueProperty: "username",
    modifyComponentForRow: function modifyComponentForRow() {
      return "user-chooser/user-row";
    },
    selectKitOptions: {
      topicId: undefined,
      categoryId: undefined,
      includeGroups: false,
      allowedUsers: false,
      includeMentionableGroups: false,
      includeMessageableGroups: false,
      allowEmails: false,
      groupMembersOf: undefined
    },
    content: (0, _object.computed)("value.[]", function () {
      var _this = this;

      return (0, _helpers.makeArray)(this.value).map(function (x) {
        return _this.defaultItem(x, x);
      });
    }),
    excludedUsers: (0, _object.computed)("value", "currentUser", "selectKit.options.{excludeCurrentUser,excludedUsernames}", {
      get: function get() {
        var options = this.selectKit.options;
        var usernames = (0, _helpers.makeArray)(this.value);

        if (this.currentUser && options.excludeCurrentUser) {
          usernames = usernames.concat([this.currentUser.username]);
        }

        return usernames.concat(options.excludedUsernames || []);
      }
    }),
    search: function search() {
      var filter = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      filter = filter || "";
      var options = this.selectKit.options; // prevents doing ajax request for nothing

      var skippedSearch = (0, _userSearch.skipSearch)(filter, options.allowEmails);
      var eagerComplete = (0, _userSearch.eagerCompleteSearch)(filter, options.topicId || options.categoryId);

      if (skippedSearch || filter === "" && !eagerComplete) {
        return;
      }

      return (0, _userSearch.default)({
        term: filter,
        topicId: options.topicId,
        categoryId: options.categoryId,
        exclude: this.excludedUsers,
        includeGroups: options.includeGroups,
        allowedUsers: options.allowedUsers,
        includeMentionableGroups: options.includeMentionableGroups,
        includeMessageableGroups: options.includeMessageableGroups,
        groupMembersOf: options.groupMembersOf,
        allowEmails: options.allowEmails
      }).then(function (result) {
        if (typeof result === "string") {// do nothing promise probably got cancelled
        } else {
          return result;
        }
      });
    }
  });

  _exports.default = _default;
});
define("select-kit/components/user-chooser/user-row", ["exports", "select-kit/components/select-kit/select-kit-row", "select-kit/templates/components/user-chooser/user-row"], function (_exports, _selectKitRow, _userRow) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _selectKitRow.default.extend({
    layout: _userRow.default,
    classNames: ["user-row"]
  });

  _exports.default = _default;
});
define("select-kit/components/user-notifications-dropdown", ["exports", "select-kit/components/dropdown-select-box", "I18n", "@ember/object", "discourse/lib/ajax-error", "discourse/lib/show-modal"], function (_exports, _dropdownSelectBox, _I18n, _object, _ajaxError, _showModal) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _dropdownSelectBox.default.extend({
    classNames: ["user-notifications", "user-notifications-dropdown"],
    selectKitOptions: {
      headerIcon: "userNotificationicon"
    },
    userNotificationicon: (0, _object.computed)("mainCollection.[]", "value", function () {
      var _this = this;

      return this.mainCollection && this.mainCollection.find(function (row) {
        return row.id === _this.value;
      }).icon;
    }),
    content: (0, _object.computed)(function () {
      var content = [];
      content.push({
        icon: "user",
        id: "changeToNormal",
        description: _I18n.default.t("user.user_notifications.normal_option_title"),
        name: _I18n.default.t("user.user_notifications.normal_option")
      });
      content.push({
        icon: "times-circle",
        id: "changeToMuted",
        description: _I18n.default.t("user.user_notifications.mute_option_title"),
        name: _I18n.default.t("user.user_notifications.mute_option")
      });

      if (this.get("user.can_ignore_user")) {
        content.push({
          icon: "far-eye-slash",
          id: "changeToIgnored",
          description: _I18n.default.t("user.user_notifications.ignore_option_title"),
          name: _I18n.default.t("user.user_notifications.ignore_option")
        });
      }

      return content;
    }),
    changeToNormal: function changeToNormal() {
      this.updateNotificationLevel("normal").catch(_ajaxError.popupAjaxError);
    },
    changeToMuted: function changeToMuted() {
      this.updateNotificationLevel("mute").catch(_ajaxError.popupAjaxError);
    },
    changeToIgnored: function changeToIgnored() {
      (0, _showModal.default)("ignore-duration", {
        model: this.user
      });
    },
    actions: {
      onChange: function onChange(level) {
        this[level](); // hack but model.ignored/muted is not
        // getting updated after updateNotificationLevel

        this.set("value", level);
      }
    }
  });

  _exports.default = _default;
});
define("select-kit/mixins/plugin-api", ["exports", "@ember/object/mixin", "@ember/utils", "discourse-common/lib/helpers"], function (_exports, _mixin, _utils, _helpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.applyContentPluginApiCallbacks = applyContentPluginApiCallbacks;
  _exports.applyOnChangePluginApiCallbacks = applyOnChangePluginApiCallbacks;
  _exports.modifySelectKit = modifySelectKit;
  _exports.clearCallbacks = clearCallbacks;
  _exports.default = void 0;
  var _appendContentCallbacks = {};

  function _appendContent(pluginApiIdentifiers, contentFunction) {
    if ((0, _utils.isNone)(_appendContentCallbacks[pluginApiIdentifiers])) {
      _appendContentCallbacks[pluginApiIdentifiers] = [];
    }

    _appendContentCallbacks[pluginApiIdentifiers].push(contentFunction);
  }

  var _prependContentCallbacks = {};

  function _prependContent(targetedIdentifier, contentFunction) {
    if ((0, _utils.isNone)(_prependContentCallbacks[targetedIdentifier])) {
      _prependContentCallbacks[targetedIdentifier] = [];
    }

    _prependContentCallbacks[targetedIdentifier].push(contentFunction);
  }

  var _onChangeCallbacks = {};

  function _onChange(pluginApiIdentifiers, mutationFunction) {
    if ((0, _utils.isNone)(_onChangeCallbacks[pluginApiIdentifiers])) {
      _onChangeCallbacks[pluginApiIdentifiers] = [];
    }

    _onChangeCallbacks[pluginApiIdentifiers].push(mutationFunction);
  }

  function applyContentPluginApiCallbacks(content, component) {
    (0, _helpers.makeArray)(component.pluginApiIdentifiers).forEach(function (key) {
      (_prependContentCallbacks[key] || []).forEach(function (c) {
        var prependedContent = c(component, content);

        if (prependedContent) {
          content = (0, _helpers.makeArray)(prependedContent).concat(content);
        }
      });
      (_appendContentCallbacks[key] || []).forEach(function (c) {
        var appendedContent = c(component, content);

        if (appendedContent) {
          content = content.concat((0, _helpers.makeArray)(appendedContent));
        }
      });
    });
    return content;
  }

  function applyOnChangePluginApiCallbacks(value, items, component) {
    (0, _helpers.makeArray)(component.pluginApiIdentifiers).forEach(function (key) {
      (_onChangeCallbacks[key] || []).forEach(function (c) {
        return c(component, value, items);
      });
    });
  }

  function modifySelectKit(targetedIdentifier) {
    return {
      appendContent: function appendContent(callback) {
        _appendContent(targetedIdentifier, callback);

        return modifySelectKit(targetedIdentifier);
      },
      prependContent: function prependContent(callback) {
        _prependContent(targetedIdentifier, callback);

        return modifySelectKit(targetedIdentifier);
      },
      onChange: function onChange(callback) {
        _onChange(targetedIdentifier, callback);

        return modifySelectKit(targetedIdentifier);
      }
    };
  }

  function clearCallbacks() {
    _appendContentCallbacks = {};
    _prependContentCallbacks = {};
    _onChangeCallbacks = {};
  }

  var EMPTY_ARRAY = Object.freeze([]);

  var _default = _mixin.default.create({
    concatenatedProperties: ["pluginApiIdentifiers"],
    pluginApiIdentifiers: EMPTY_ARRAY
  });

  _exports.default = _default;
});
define("select-kit/mixins/tags", ["exports", "I18n", "@ember/object/mixin", "discourse/lib/ajax", "discourse-common/lib/get-url", "@ember/utils", "discourse-common/lib/helpers", "discourse/lib/ajax-error", "@ember/object/computed"], function (_exports, _I18n, _mixin, _ajax, _getUrl, _utils, _helpers, _ajaxError, _computed) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _mixin.default.create({
    searchTags: function searchTags(url, data, callback) {
      var _this = this;

      return (0, _ajax.ajax)((0, _getUrl.default)(url), {
        quietMillis: 200,
        cache: true,
        dataType: "json",
        data: data
      }).then(function (json) {
        return callback(_this, json);
      }).catch(_ajaxError.popupAjaxError);
    },
    selectKitOptions: {
      allowAny: "allowAnyTag"
    },
    allowAnyTag: (0, _computed.reads)("site.can_create_tag"),
    validateCreate: function validateCreate(filter, content) {
      var _this2 = this;

      var maximum = this.selectKit.options.maximum;

      if (maximum && (0, _helpers.makeArray)(this.value).length >= parseInt(maximum, 10)) {
        this.addError(_I18n.default.t("select_kit.max_content_reached", {
          count: this.selectKit.limit
        }));
        return false;
      }

      var filterRegexp = new RegExp(this.site.tags_filter_regexp, "g");
      filter = filter.replace(filterRegexp, "").trim().toLowerCase();

      if (this.termMatchesForbidden) {
        return false;
      }

      if (!filter.length || this.get("siteSettings.max_tag_length") < filter.length) {
        this.addError(_I18n.default.t("select_kit.invalid_selection_length", {
          count: "[1 - ".concat(this.get("siteSettings.max_tag_length"), "]")
        }));
        return false;
      }

      var toLowerCaseOrUndefined = function toLowerCaseOrUndefined(string) {
        return (0, _utils.isEmpty)(string) ? undefined : string.toLowerCase();
      };

      var inCollection = content.map(function (c) {
        return toLowerCaseOrUndefined(_this2.getValue(c));
      }).filter(Boolean).includes(filter);
      var inSelection = (this.value || []).map(function (s) {
        return toLowerCaseOrUndefined(s);
      }).filter(Boolean).includes(filter);

      if (inCollection || inSelection) {
        return false;
      }

      return true;
    },
    createContentFromInput: function createContentFromInput(input) {
      // See lib/discourse_tagging#clean_tag.
      input = input.trim().replace(/\s+/g, "-").replace(/[\/\?#\[\]@!\$&'\(\)\*\+,;=\.%\\`^\s|\{\}"<>]+/g, "").substring(0, this.siteSettings.max_tag_length);

      if (this.siteSettings.force_lowercase_tags) {
        input = input.toLowerCase();
      }

      return input;
    }
  });

  _exports.default = _default;
});
define("select-kit/mixins/utils", ["exports", "@ember/object/mixin", "@ember/object"], function (_exports, _mixin, _object) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _mixin.default.create({
    defaultItem: function defaultItem(value, name) {
      if (this.selectKit.valueProperty) {
        var item = {};
        item[this.selectKit.valueProperty] = value;
        item[this.selectKit.nameProperty] = name;
        return item;
      } else {
        return name || value;
      }
    },
    itemForValue: function itemForValue(value, content) {
      if (this.selectKit.valueProperty) {
        return content.findBy(this.selectKit.valueProperty, value);
      } else {
        return value;
      }
    },
    getProperty: function getProperty(item, property) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
        definedOnly: true
      };
      var definedOnly = options.definedOnly;

      if (item && typeof property === "string") {
        var attempt = (0, _object.get)(item, property);

        if (attempt) {
          return attempt;
        }
      }

      property = (0, _object.get)(this.selectKit, property);

      if (!item) {
        return null;
      }

      if (!property && definedOnly) {
        return null;
      } else if (!property) {
        return item;
      } else if (typeof property === "string") {
        return (0, _object.get)(item, property);
      } else {
        return property(item);
      }
    },
    getValue: function getValue(item) {
      return this.getProperty(item, "valueProperty", {
        definedOnly: false
      });
    },
    getName: function getName(item) {
      return this.getProperty(item, "nameProperty", {
        definedOnly: false
      });
    },
    findValue: function findValue(content, item) {
      return this._findInContent(content, item, "valueProperty", "getValue");
    },
    findName: function findName(content, item) {
      return this._findInContent(content, item, "nameProperty", "getName");
    },
    _findInContent: function _findInContent(content, item, type, getter) {
      var _this = this;

      var property = (0, _object.get)(this.selectKit, type);

      if (!property) {
        if (content.indexOf(item) > -1) {
          return item;
        }
      } else if (typeof property === "string") {
        return content.findBy(property, this[getter](item));
      } else {
        var name = this[getter](item);
        return content.find(function (contentItem) {
          return _this[getter](contentItem) === name;
        });
      }
    },
    _isNumeric: function _isNumeric(input) {
      return !isNaN(parseFloat(input)) && isFinite(input);
    },
    _normalize: function _normalize(input) {
      if (input) {
        input = input.toLowerCase();

        if (typeof input.normalize === "function") {
          input = input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }
      }

      return input;
    }
  });

  _exports.default = _default;
});
Ember.TEMPLATES["select-kit/templates/components/category-drop/category-drop-header"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"component\",[[24,[\"selectKit\",\"options\",\"selectedNameComponent\"]]],[[\"tabindex\",\"item\",\"selectKit\",\"shouldDisplayClearableButton\"],[[24,[\"tabindex\"]],[24,[\"selectedContent\"]],[24,[\"selectKit\"]],[24,[\"shouldDisplayClearableButton\"]]]]],false],[0,\"\\n\\n\"],[1,[28,\"d-icon\",[[24,[\"caretIcon\"]]],[[\"class\"],[\"caret-icon\"]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/category-drop/category-drop-header"}});
Ember.TEMPLATES["select-kit/templates/components/category-row"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"if\",[[24,[\"category\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"category-status\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"hasParentCategory\"]]],null,{\"statements\":[[4,\"unless\",[[24,[\"hideParentCategory\"]]],null,{\"statements\":[[0,\"        \"],[1,[22,\"badgeForParentCategory\"],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"    \"],[1,[22,\"badgeForCategory\"],false],[0,\"\\n  \"],[9],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"shouldDisplayDescription\"]]],null,{\"statements\":[[0,\"    \"],[7,\"div\",true],[10,\"class\",\"category-desc\"],[8],[1,[28,\"dir-span\",[[24,[\"description\"]]],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},{\"statements\":[[0,\"  \"],[1,[28,\"html-safe\",[[24,[\"label\"]]],null],false],[0,\"\\n\"]],\"parameters\":[]}]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/category-row"}});
Ember.TEMPLATES["select-kit/templates/components/color-palettes/color-palettes-row"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"span\",true],[10,\"class\",\"name\"],[8],[0,\"\\n  \"],[1,[22,\"label\"],false],[0,\"\\n\"],[9],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"item\",\"colors\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"palettes\"],[11,\"style\",[22,\"backgroundColor\"]],[8],[0,\"\\n    \"],[1,[22,\"palettes\"],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/color-palettes/color-palettes-row"}});
Ember.TEMPLATES["select-kit/templates/components/combo-box/combo-box-header"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"icon\"],\"statements\":[[4,\"each\",[[24,[\"icons\"]]],null,{\"statements\":[[0,\" \"],[1,[28,\"d-icon\",[[23,1,[]]],null],false],[0,\" \"]],\"parameters\":[1]},null],[0,\"\\n\\n\"],[1,[28,\"component\",[[24,[\"selectKit\",\"options\",\"selectedNameComponent\"]]],[[\"tabindex\",\"item\",\"selectKit\"],[[24,[\"tabindex\"]],[24,[\"selectedContent\"]],[24,[\"selectKit\"]]]]],false],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"shouldDisplayClearableButton\"]]],null,{\"statements\":[[0,\"  \"],[1,[28,\"d-button\",null,[[\"class\",\"icon\",\"action\",\"ariaLabel\"],[\"btn-clear\",\"times\",[24,[\"selectKit\",\"onClearSelection\"]],\"clear_input\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[1,[28,\"d-icon\",[[24,[\"caretIcon\"]]],[[\"class\"],[\"caret-icon\"]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/combo-box/combo-box-header"}});
Ember.TEMPLATES["select-kit/templates/components/create-color-row"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"span\",true],[8],[1,[22,\"label\"],false],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/create-color-row"}});
Ember.TEMPLATES["select-kit/templates/components/dropdown-select-box/dropdown-select-box-header"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"icon\"],\"statements\":[[4,\"each\",[[24,[\"icons\"]]],null,{\"statements\":[[0,\" \"],[1,[28,\"d-icon\",[[23,1,[]]],null],false],[0,\" \"]],\"parameters\":[1]},null],[0,\"\\n\\n\"],[1,[28,\"component\",[[24,[\"selectKit\",\"options\",\"selectedNameComponent\"]]],[[\"tabindex\",\"item\",\"selectKit\",\"shouldDisplayClearableButton\"],[[24,[\"tabindex\"]],[24,[\"selectedContent\"]],[24,[\"selectKit\"]],[24,[\"shouldDisplayClearableButton\"]]]]],false],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"selectKit\",\"options\",\"showCaret\"]]],null,{\"statements\":[[0,\"  \"],[1,[28,\"d-icon\",[[24,[\"caretIcon\"]]],[[\"class\"],[\"caret-icon\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/dropdown-select-box/dropdown-select-box-header"}});
Ember.TEMPLATES["select-kit/templates/components/dropdown-select-box/dropdown-select-box-row"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"icon\"],\"statements\":[[4,\"if\",[[24,[\"icons\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"icons\"],[8],[0,\"\\n    \"],[7,\"span\",true],[10,\"class\",\"selection-indicator\"],[8],[9],[0,\"\\n\"],[4,\"each\",[[24,[\"icons\"]]],null,{\"statements\":[[0,\"      \"],[1,[28,\"d-icon\",[[23,1,[]]],[[\"translatedtitle\"],[[28,\"dasherize\",[[24,[\"title\"]]],null]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[7,\"div\",true],[10,\"class\",\"texts\"],[8],[0,\"\\n  \"],[7,\"span\",true],[10,\"class\",\"name\"],[8],[1,[28,\"html-safe\",[[24,[\"label\"]]],null],false],[9],[0,\"\\n  \"],[7,\"span\",true],[10,\"class\",\"desc\"],[8],[1,[28,\"html-safe\",[[24,[\"description\"]]],null],false],[9],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/dropdown-select-box/dropdown-select-box-row"}});
Ember.TEMPLATES["select-kit/templates/components/future-date-input-selector/future-date-input-selector-header"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"icon\"],\"statements\":[[4,\"if\",[[24,[\"icons\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"future-date-input-selector-icons\"],[8],[0,\"\\n    \"],[4,\"each\",[[24,[\"icons\"]]],null,{\"statements\":[[0,\" \"],[1,[28,\"d-icon\",[[23,1,[]]],null],false],[0,\" \"]],\"parameters\":[1]},null],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[1,[28,\"component\",[[24,[\"selectKit\",\"options\",\"selectedNameComponent\"]]],[[\"tabindex\",\"item\",\"selectKit\"],[[24,[\"tabindex\"]],[24,[\"selectedContent\"]],[24,[\"selectKit\"]]]]],false],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"selectedContent\",\"datetime\"]]],null,{\"statements\":[[0,\"  \"],[7,\"span\",true],[10,\"class\",\"future-date-input-selector-datetime\"],[8],[0,\"\\n    \"],[1,[24,[\"selectedContent\",\"datetime\"]],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[1,[28,\"d-icon\",[[24,[\"caretIcon\"]]],[[\"class\"],[\"caret-icon\"]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/future-date-input-selector/future-date-input-selector-header"}});
Ember.TEMPLATES["select-kit/templates/components/future-date-input-selector/future-date-input-selector-row"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"icon\"],\"statements\":[[4,\"if\",[[24,[\"item\",\"icons\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"future-date-input-selector-icons\"],[8],[0,\"\\n    \"],[4,\"each\",[[24,[\"item\",\"icons\"]]],null,{\"statements\":[[0,\" \"],[1,[28,\"d-icon\",[[23,1,[]]],null],false],[0,\" \"]],\"parameters\":[1]},null],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[7,\"span\",true],[10,\"class\",\"name\"],[8],[1,[22,\"label\"],false],[9],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"item\",\"datetime\"]]],null,{\"statements\":[[0,\"  \"],[7,\"span\",true],[10,\"class\",\"future-date-input-selector-datetime\"],[8],[0,\"\\n    \"],[1,[24,[\"item\",\"datetime\"]],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/future-date-input-selector/future-date-input-selector-row"}});
Ember.TEMPLATES["select-kit/templates/components/mini-tag-chooser/mini-tag-chooser-header"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"component\",[[24,[\"selectKit\",\"options\",\"selectedNameComponent\"]]],[[\"tabindex\",\"item\",\"selectKit\"],[[24,[\"tabindex\"]],[24,[\"selectedContent\"]],[24,[\"selectKit\"]]]]],false],[0,\"\\n\\n\"],[1,[28,\"d-icon\",[[24,[\"caretIcon\"]]],[[\"class\"],[\"caret-icon\"]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/mini-tag-chooser/mini-tag-chooser-header"}});
Ember.TEMPLATES["select-kit/templates/components/mini-tag-chooser/selected-collection"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"tag\"],\"statements\":[[4,\"each\",[[24,[\"tags\"]]],null,{\"statements\":[[4,\"d-button\",null,[[\"translatedTitle\",\"icon\",\"action\",\"actionParam\",\"class\"],[[23,1,[\"value\"]],\"times\",[28,\"action\",[[23,0,[]],\"deselectTag\"],null],[23,1,[\"value\"]],[23,1,[\"classNames\"]]]],{\"statements\":[[0,\"    \"],[1,[28,\"discourse-tag\",[[23,1,[\"value\"]]],[[\"noHref\"],[true]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[1]},null]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/mini-tag-chooser/selected-collection"}});
Ember.TEMPLATES["select-kit/templates/components/multi-select"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"collection\"],\"statements\":[[4,\"unless\",[[24,[\"selectKit\",\"isHidden\"]]],null,{\"statements\":[[0,\"  \"],[1,[28,\"component\",[[24,[\"selectKit\",\"options\",\"headerComponent\"]]],[[\"tabindex\",\"value\",\"selectedContent\",\"selectKit\"],[[24,[\"tabindex\"]],[24,[\"value\"]],[24,[\"selectedContent\"]],[24,[\"selectKit\"]]]]],false],[0,\"\\n\\n\"],[4,\"select-kit/select-kit-body\",null,[[\"selectKit\"],[[24,[\"selectKit\"]]]],{\"statements\":[[4,\"if\",[[24,[\"selectKit\",\"isLoading\"]]],null,{\"statements\":[[0,\"      \"],[7,\"span\",true],[10,\"class\",\"is-loading\"],[8],[0,\"\\n        \"],[1,[28,\"loading-spinner\",null,[[\"size\"],[\"small\"]]],false],[0,\"\\n      \"],[9],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[4,\"if\",[[24,[\"selectKit\",\"filter\"]]],null,{\"statements\":[[4,\"if\",[[24,[\"selectKit\",\"hasNoContent\"]]],null,{\"statements\":[[0,\"          \"],[7,\"span\",true],[10,\"class\",\"no-content\"],[8],[0,\"\\n            \"],[1,[28,\"i18n\",[\"select_kit.no_content\"],null],false],[0,\"\\n          \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"each\",[[24,[\"collections\"]]],null,{\"statements\":[[0,\"        \"],[1,[28,\"component\",[[28,\"component-for-collection\",[[23,1,[\"identifier\"]],[24,[\"selectKit\"]]],null]],[[\"collection\",\"selectKit\",\"value\"],[[23,1,[]],[24,[\"selectKit\"]],[24,[\"value\"]]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null]],\"parameters\":[]}]],\"parameters\":[]},null],[0,\"\\n  \"],[7,\"div\",true],[10,\"class\",\"select-kit-wrapper\"],[8],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/multi-select"}});
Ember.TEMPLATES["select-kit/templates/components/multi-select/multi-select-header"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"item\"],\"statements\":[[7,\"div\",true],[10,\"class\",\"choices\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"selectedContent\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"component\",[[24,[\"selectKit\",\"options\",\"selectedNameComponent\"]]],[[\"tabindex\",\"item\",\"selectKit\"],[[24,[\"tabindex\"]],[23,1,[]],[24,[\"selectKit\"]]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"\\n\"],[4,\"unless\",[[24,[\"hasReachedMaximumSelection\"]]],null,{\"statements\":[[0,\"    \"],[7,\"div\",true],[10,\"class\",\"choice input-wrapper\"],[8],[0,\"\\n      \"],[1,[28,\"component\",[[24,[\"selectKit\",\"options\",\"filterComponent\"]]],[[\"selectKit\"],[[24,[\"selectKit\"]]]]],false],[0,\"\\n    \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/multi-select/multi-select-header"}});
Ember.TEMPLATES["select-kit/templates/components/multi-select/selected-category"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"div\",false],[12,\"tabindex\",\"0\"],[12,\"title\",[22,\"title\"]],[12,\"data-value\",[22,\"value\"]],[12,\"data-name\",[22,\"name\"]],[12,\"class\",\"select-kit-selected-name selected-name choice\"],[3,\"action\",[[23,0,[]],\"onSelectedNameClick\"]],[8],[0,\"\\n  \"],[7,\"div\",true],[10,\"class\",\"body\"],[8],[0,\"\\n    \"],[1,[22,\"badge\"],false],[0,\"\\n    \"],[1,[28,\"d-icon\",[\"times\"],null],false],[0,\"\\n  \"],[9],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/multi-select/selected-category"}});
Ember.TEMPLATES["select-kit/templates/components/notifications-filter/notifications-filter-header"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"label\",true],[10,\"class\",\"filter-text\"],[8],[0,\"\\n  \"],[1,[28,\"i18n\",[\"user.user_notifications.filters.filter_by\"],null],false],[0,\"\\n\"],[9],[0,\"\\n\"],[7,\"label\",true],[10,\"class\",\"header-text\"],[8],[0,\"\\n  \"],[1,[28,\"i18n\",[[24,[\"label\"]]],null],false],[0,\"\\n\"],[9],[0,\"\\n\"],[1,[28,\"d-icon\",[[24,[\"caretIcon\"]]],[[\"class\"],[\"caret-icon\"]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/notifications-filter/notifications-filter-header"}});
Ember.TEMPLATES["select-kit/templates/components/period-chooser/period-chooser-header"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"h2\",true],[10,\"class\",\"selected-name\"],[11,\"title\",[22,\"title\"]],[8],[0,\"\\n  \"],[1,[28,\"period-title\",[[24,[\"value\"]]],[[\"showDateRange\",\"fullDay\"],[true,[24,[\"selectKit\",\"options\",\"fullDay\"]]]]],false],[0,\"\\n\"],[9],[0,\"\\n\\n\"],[1,[28,\"d-icon\",[[24,[\"caretIcon\"]]],[[\"class\"],[\"caret-icon\"]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/period-chooser/period-chooser-header"}});
Ember.TEMPLATES["select-kit/templates/components/period-chooser/period-chooser-row"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"span\",true],[10,\"class\",\"selection-indicator\"],[8],[9],[0,\"\\n\\n\"],[7,\"span\",true],[10,\"class\",\"period-title\"],[8],[0,\"\\n  \"],[1,[28,\"period-title\",[[24,[\"rowValue\"]]],[[\"showDateRange\",\"fullDay\"],[true,[24,[\"selectKit\",\"options\",\"fullDay\"]]]]],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/period-chooser/period-chooser-row"}});
Ember.TEMPLATES["select-kit/templates/components/pinned-button"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"p\",true],[10,\"class\",\"reason\"],[8],[0,\"\\n  \"],[1,[28,\"pinned-options\",null,[[\"value\",\"topic\"],[[24,[\"pinned\"]],[24,[\"topic\"]]]]],false],[0,\"\\n  \"],[7,\"span\",true],[10,\"class\",\"text\"],[8],[1,[28,\"html-safe\",[[24,[\"reasonText\"]]],null],false],[9],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/pinned-button"}});
Ember.TEMPLATES["select-kit/templates/components/select-kit/errors-collection"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"item\"],\"statements\":[[4,\"if\",[[24,[\"collection\"]]],null,{\"statements\":[[4,\"each\",[[24,[\"collection\",\"content\"]]],null,{\"statements\":[[0,\"    \"],[7,\"li\",true],[10,\"class\",\"select-kit-error\"],[8],[1,[23,1,[]],false],[9],[0,\"\\n\"]],\"parameters\":[1]},null]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/select-kit/errors-collection"}});
Ember.TEMPLATES["select-kit/templates/components/select-kit/select-kit-body"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"&default\"],\"statements\":[[4,\"if\",[[24,[\"selectKit\",\"isExpanded\"]]],null,{\"statements\":[[0,\"  \"],[14,1],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/select-kit/select-kit-body"}});
Ember.TEMPLATES["select-kit/templates/components/select-kit/select-kit-collection"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"item\"],\"statements\":[[4,\"each\",[[24,[\"collection\",\"content\"]]],null,{\"statements\":[[0,\"  \"],[1,[28,\"component\",[[28,\"component-for-row\",[[24,[\"collection\",\"identifier\"]],[23,1,[]],[24,[\"selectKit\"]]],null]],[[\"item\",\"value\",\"selectKit\"],[[23,1,[]],[24,[\"value\"]],[24,[\"selectKit\"]]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/select-kit/select-kit-collection"}});
Ember.TEMPLATES["select-kit/templates/components/select-kit/select-kit-filter"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"unless\",[[24,[\"isHidden\"]]],null,{\"statements\":[[0,\"  \"],[1,[28,\"input\",null,[[\"tabindex\",\"class\",\"placeholder\",\"autocomplete\",\"autocorrect\",\"autocapitalize\",\"spellcheck\",\"value\",\"input\",\"paste\",\"keyDown\"],[-1,\"filter-input\",[24,[\"placeholder\"]],\"off\",\"off\",\"off\",false,[28,\"readonly\",[[24,[\"selectKit\",\"filter\"]]],null],[28,\"action\",[[23,0,[]],\"onInput\"],null],[28,\"action\",[[23,0,[]],\"onPaste\"],null],[28,\"action\",[[23,0,[]],\"onKeydown\"],null]]]],false],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"selectKit\",\"options\",\"filterIcon\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"d-icon\",[[24,[\"selectKit\",\"options\",\"filterIcon\"]]],[[\"class\"],[\"filter-icon\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/select-kit/select-kit-filter"}});
Ember.TEMPLATES["select-kit/templates/components/select-kit/select-kit-row"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"icon\"],\"statements\":[[4,\"each\",[[24,[\"icons\"]]],null,{\"statements\":[[0,\"  \"],[1,[28,\"d-icon\",[[23,1,[]]],[[\"translatedtitle\"],[[28,\"dasherize\",[[24,[\"title\"]]],null]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"\\n\"],[7,\"span\",true],[10,\"class\",\"name\"],[8],[0,\"\\n  \"],[1,[22,\"label\"],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/select-kit/select-kit-row"}});
Ember.TEMPLATES["select-kit/templates/components/select-kit/single-select-header"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"icon\"],\"statements\":[[4,\"each\",[[24,[\"icons\"]]],null,{\"statements\":[[0,\" \"],[1,[28,\"d-icon\",[[23,1,[]]],null],false],[0,\" \"]],\"parameters\":[1]},null],[0,\"\\n\\n\"],[1,[28,\"component\",[[24,[\"selectKit\",\"options\",\"selectedNameComponent\"]]],[[\"tabindex\",\"item\",\"selectKit\"],[[24,[\"tabindex\"]],[24,[\"selectedContent\"]],[24,[\"selectKit\"]]]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/select-kit/single-select-header"}});
Ember.TEMPLATES["select-kit/templates/components/selected-name"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"if\",[[24,[\"selectKit\",\"options\",\"showFullTitle\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",false],[12,\"role\",\"button\"],[12,\"lang\",[22,\"lang\"]],[12,\"tabindex\",\"0\"],[12,\"title\",[22,\"title\"]],[12,\"data-value\",[22,\"value\"]],[12,\"data-name\",[22,\"name\"]],[12,\"class\",\"select-kit-selected-name selected-name choice\"],[3,\"action\",[[23,0,[]],\"onSelectedNameClick\"]],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"item\",\"icon\"]]],null,{\"statements\":[[0,\"      \"],[1,[28,\"d-icon\",[[24,[\"item\",\"icon\"]]],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n    \"],[7,\"span\",true],[10,\"class\",\"name\"],[8],[0,\"\\n      \"],[1,[22,\"label\"],false],[0,\"\\n    \"],[9],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"selectKit\",\"options\",\"clearOnClick\"]]],null,{\"statements\":[[0,\"      \"],[1,[28,\"d-icon\",[\"times\"],null],false],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[4,\"if\",[[24,[\"shouldDisplayClearableButton\"]]],null,{\"statements\":[[0,\"        \"],[1,[28,\"d-button\",null,[[\"class\",\"icon\",\"action\",\"actionParam\",\"ariaLabel\"],[\"btn-clear\",\"times\",[24,[\"selectKit\",\"deselect\"]],[24,[\"item\"]],\"clear_input\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]}],[0,\"  \"],[9],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[4,\"if\",[[24,[\"item\",\"icon\"]]],null,{\"statements\":[[0,\"    \"],[7,\"div\",true],[10,\"role\",\"textbox\"],[11,\"lang\",[22,\"lang\"]],[10,\"tabindex\",\"0\"],[10,\"class\",\"select-kit-selected-name selected-name choice\"],[8],[0,\"\\n      \"],[1,[28,\"d-icon\",[[24,[\"item\",\"icon\"]]],null],false],[0,\"\\n    \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]}]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/selected-name"}});
Ember.TEMPLATES["select-kit/templates/components/single-select"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"collection\"],\"statements\":[[4,\"unless\",[[24,[\"selectKit\",\"isHidden\"]]],null,{\"statements\":[[0,\"  \"],[1,[28,\"component\",[[24,[\"selectKit\",\"options\",\"headerComponent\"]]],[[\"tabindex\",\"value\",\"selectedContent\",\"selectKit\"],[[24,[\"tabindex\"]],[24,[\"value\"]],[24,[\"selectedContent\"]],[24,[\"selectKit\"]]]]],false],[0,\"\\n\\n\"],[4,\"select-kit/select-kit-body\",null,[[\"selectKit\"],[[24,[\"selectKit\"]]]],{\"statements\":[[0,\"    \"],[1,[28,\"component\",[[24,[\"selectKit\",\"options\",\"filterComponent\"]]],[[\"selectKit\"],[[24,[\"selectKit\"]]]]],false],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"selectKit\",\"isLoading\"]]],null,{\"statements\":[[0,\"      \"],[7,\"span\",true],[10,\"class\",\"is-loading\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"site\"]]],null,{\"statements\":[[0,\"          \"],[1,[28,\"loading-spinner\",null,[[\"size\"],[\"small\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"      \"],[9],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[4,\"if\",[[24,[\"selectKit\",\"filter\"]]],null,{\"statements\":[[4,\"if\",[[24,[\"selectKit\",\"hasNoContent\"]]],null,{\"statements\":[[0,\"          \"],[7,\"span\",true],[10,\"class\",\"no-content\"],[8],[0,\"\\n            \"],[1,[28,\"i18n\",[\"select_kit.no_content\"],null],false],[0,\"\\n          \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"each\",[[24,[\"collections\"]]],null,{\"statements\":[[0,\"        \"],[1,[28,\"component\",[[28,\"component-for-collection\",[[23,1,[\"identifier\"]],[24,[\"selectKit\"]]],null]],[[\"collection\",\"selectKit\",\"value\"],[[23,1,[]],[24,[\"selectKit\"]],[24,[\"value\"]]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null]],\"parameters\":[]}]],\"parameters\":[]},null],[0,\"\\n  \"],[7,\"div\",true],[10,\"class\",\"select-kit-wrapper\"],[8],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/single-select"}});
Ember.TEMPLATES["select-kit/templates/components/tag-chooser-row"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"discourse-tag\",[[24,[\"rowValue\"]]],[[\"count\",\"noHref\"],[[24,[\"item\",\"count\"]],true]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/tag-chooser-row"}});
Ember.TEMPLATES["select-kit/templates/components/tag-drop/tag-drop-header"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"component\",[[24,[\"selectKit\",\"options\",\"selectedNameComponent\"]]],[[\"tabindex\",\"item\",\"selectKit\",\"shouldDisplayClearableButton\"],[[24,[\"tabindex\"]],[24,[\"selectedContent\"]],[24,[\"selectKit\"]],[24,[\"shouldDisplayClearableButton\"]]]]],false],[0,\"\\n\\n\"],[1,[28,\"d-icon\",[[24,[\"caretIcon\"]]],[[\"class\"],[\"caret-icon\"]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/tag-drop/tag-drop-header"}});
Ember.TEMPLATES["select-kit/templates/components/tag-row"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"discourse-tag\",[[24,[\"rowValue\"]]],[[\"noHref\",\"count\"],[true,[24,[\"item\",\"count\"]]]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/tag-row"}});
Ember.TEMPLATES["select-kit/templates/components/toolbar-popup-menu-options/toolbar-popup-menu-options-heading"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[22,\"heading\"],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/toolbar-popup-menu-options/toolbar-popup-menu-options-heading"}});
Ember.TEMPLATES["select-kit/templates/components/topic-notifications-button"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"if\",[[24,[\"appendReason\"]]],null,{\"statements\":[[0,\"  \"],[7,\"p\",true],[10,\"class\",\"reason\"],[8],[0,\"\\n    \"],[1,[28,\"topic-notifications-options\",null,[[\"value\",\"topic\",\"onChange\",\"options\"],[[24,[\"notificationLevel\"]],[24,[\"topic\"]],[28,\"action\",[[23,0,[]],\"changeTopicNotificationLevel\"],null],[28,\"hash\",null,[[\"icon\",\"showFullTitle\",\"preventsClickPropagation\",\"showCaret\"],[[24,[\"icon\"]],[24,[\"showFullTitle\"]],true,[24,[\"showCaret\"]]]]]]]],false],[0,\"\\n    \"],[7,\"span\",true],[10,\"class\",\"text\"],[8],[1,[28,\"html-safe\",[[24,[\"topic\",\"details\",\"notificationReasonText\"]]],null],false],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"  \"],[1,[28,\"topic-notifications-options\",null,[[\"value\",\"topic\",\"onChange\",\"options\"],[[24,[\"notificationLevel\"]],[24,[\"topic\"]],[28,\"action\",[[23,0,[]],\"changeTopicNotificationLevel\"],null],[28,\"hash\",null,[[\"icon\",\"showFullTitle\",\"preventsClickPropagation\",\"showCaret\"],[[24,[\"icon\"]],[24,[\"showFullTitle\"]],true,[24,[\"showCaret\"]]]]]]]],false],[0,\"\\n\"]],\"parameters\":[]}]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/topic-notifications-button"}});
Ember.TEMPLATES["select-kit/templates/components/user-chooser/user-row"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"avatar\",[[24,[\"item\"]]],[[\"imageSize\"],[\"tiny\"]]],false],[0,\"\\n\"],[7,\"span\",true],[10,\"class\",\"username\"],[8],[1,[28,\"format-username\",[[24,[\"item\",\"username\"]]],null],false],[9],[0,\"\\n\"],[7,\"span\",true],[10,\"class\",\"name\"],[8],[1,[24,[\"item\",\"name\"]],false],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"select-kit/templates/components/user-chooser/user-row"}});
define("wizard/router", ["exports", "@ember/routing/router", "discourse-common/lib/get-url", "discourse-common/config/environment"], function (_exports, _router, _getUrl, _environment) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var Router = _router.default.extend({
    rootURL: (0, _getUrl.default)("/wizard/"),
    location: (0, _environment.isTesting)() ? "none" : "history"
  });

  Router.map(function () {
    this.route("step", {
      path: "/steps/:step_id"
    });
  });
  var _default = Router;
  _exports.default = _default;
});
define("wizard/wizard", ["exports", "@ember/application", "discourse-common/resolver"], function (_exports, _application, _resolver) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _application.default.extend({
    rootElement: "#wizard-main",
    Resolver: (0, _resolver.buildResolver)("wizard"),
    start: function start() {
      var _this = this;

      // required for select kit to work without Ember CLI
      Object.keys(Ember.TEMPLATES).forEach(function (k) {
        if (k.indexOf("select-kit") === 0) {
          var template = Ember.TEMPLATES[k];
          define(k, function () {
            return template;
          });
        }
      });
      Object.keys(requirejs._eak_seen).forEach(function (key) {
        if (/\/initializers\//.test(key)) {
          var module = requirejs(key, null, null, true);

          if (!module) {
            throw new Error(key + " must export an initializer.");
          }

          _this.initializer(module.default);
        }
      });
    }
  });

  _exports.default = _default;
});
Ember.TEMPLATES["wizard/templates/application"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"fontClass\"],\"statements\":[[4,\"if\",[[24,[\"showCanvas\"]]],null,{\"statements\":[[0,\"  \"],[1,[22,\"wizard-canvas\"],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[7,\"div\",true],[10,\"class\",\"wizard-column\"],[8],[0,\"\\n  \"],[7,\"div\",true],[10,\"class\",\"wizard-column-contents\"],[8],[0,\"\\n    \"],[1,[22,\"outlet\"],false],[0,\"\\n\\n\"],[0,\"    \"],[7,\"div\",true],[10,\"class\",\"preloaded-font-styles\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"fontClasses\"]]],null,{\"statements\":[[0,\"        \"],[7,\"span\",true],[11,\"class\",[23,1,[]]],[8],[0,\" \"],[9],[0,\"\\n        \"],[7,\"strong\",true],[11,\"class\",[23,1,[]]],[8],[0,\" \"],[9],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n  \"],[7,\"div\",true],[10,\"class\",\"wizard-footer\"],[8],[0,\"\\n    \"],[7,\"div\",true],[10,\"class\",\"discourse-logo\"],[8],[0,\"\\n      \"],[7,\"svg\",true],[10,\"xmlns\",\"http://www.w3.org/2000/svg\",\"http://www.w3.org/2000/xmlns/\"],[10,\"width\",\"110\"],[10,\"height\",\"30\"],[10,\"viewBox\",\"0 0 385 104\"],[8],[0,\"\\n        \"],[7,\"g\",true],[10,\"id\",\"discourse-logo-large\"],[10,\"fill\",\"none\"],[10,\"fill-rule\",\"nonzero\"],[8],[0,\"\\n          \"],[7,\"path\",true],[10,\"class\",\"logo-contour\"],[10,\"fill\",\"#000\"],[10,\"d\",\"M117.4 22.22c1.649399-.0222812 3.233299.6446239 4.37 1.84 1.192379 1.1784439 1.850092 2.7938161 1.82 4.47.02983 1.6575188-.620685 3.2548933-1.8 4.42-1.119242 1.1834351-2.681214 1.8466391-4.31 1.83-1.662331.023056-3.258247-.6515814-4.4-1.86-1.195146-1.1971019-1.852129-2.8287301-1.82-4.52-.000018-3.3998017 2.750216-6.1589796 6.15-6.17l-.01-.01zm-4.84 21.05h9.68v40.36h-9.68V43.27zm42.1 6.39l-6 6C146.22 53.22 144 52 142 52c-.902316-.0524313-1.79724.1897247-2.55.69-.573152.3850847-.91784 1.0295007-.92 1.72.003314.536265.210697 1.0511472.58 1.44.861614.7548917 1.836939 1.3691103 2.89 1.82l3.55 1.77c3.733333 1.8466667 6.3 3.7266667 7.7 5.64 3.339481 4.8109001 2.622713 11.3471474-1.68 15.32-2.52 2.2933333-5.896667 3.44-10.13 3.44-5.290881.1460857-10.315591-2.3176674-13.44-6.59l6-6.49c1.120876 1.3107131 2.47767 2.3995407 4 3.21 1.21567.7242383 2.587439 1.1460572 4 1.23 1.104873.0554814 2.195409-.2692091 3.09-.92.709238-.481083 1.144441-1.2733748 1.17-2.13 0-1.4933333-1.406667-2.9466667-4.22-4.36l-3.26-1.63c-6.24-3.1466667-9.36-7.0833333-9.36-11.81-.023382-2.9974288 1.266494-5.8548879 3.53-7.82 2.467571-2.2051994 5.69282-3.3698724 9-3.25 5.010194-.0274064 9.731027 2.3441612 12.7 6.38h.01zm45.1 2.41l-8.06 4.43c-1.254605-1.396184-2.782926-2.5194486-4.49-3.3-1.65594-.6457398-3.423024-.9583778-5.2-.92-3.245832-.1417919-6.412693 1.0255155-8.79 3.24-2.246347 2.1649992-3.467702 5.1820368-3.36 8.3-.097501 3.0024572 1.075175 5.9069195 3.23 8 2.288229 2.1569486 5.347819 3.3029432 8.49 3.18 4.333333 0 7.706667-1.4766667 10.12-4.43l7.64 5.23c-4.14 5.38-9.98 8.07-17.52 8.07-6.786667 0-12.1-2-15.94-6-4.48358-4.5067211-6.564271-10.8726791-5.60785-17.1574451C161.22857 54.4277889 165.108765 48.968963 170.73 46c3.46735-1.8431696 7.343542-2.7821229 11.27-2.73 3.572088-.0575569 7.107523.7269532 10.32 2.29 2.995764 1.4982625 5.557329 3.739632 7.44 6.51zm23.85-8.8c3.604029-.010417 7.146863.9313491 10.27 2.73 6.327234 3.5564862 10.231011 10.261796 10.2 17.52.015895 3.5831575-.919258 7.106371-2.71 10.21-1.735583 3.1031601-4.283385 5.6751605-7.37 7.44-3.142134 1.7910684-6.703421 2.7158986-10.32 2.68-5.33854.0803277-10.470647-2.0601629-14.17-5.91-3.845791-3.7732443-5.968786-8.9631898-5.87-14.35-.050183-11.1185605 8.882044-20.1937022 20-20.32h-.03zm.16 9.12c-2.835339-.0656442-5.565196 1.0757341-7.51 3.14-2.022565 2.1625471-3.101902 5.0407776-3 8-.123784 3.0105402.955639 5.946572 3 8.16 1.941671 2.0665463 4.675583 3.202339 7.51 3.12 2.859128.0777168 5.61469-1.0725573 7.57-3.16 2.041067-2.199383 3.120812-5.1218929 3-8.12.116275-2.9824439-.963763-5.8877463-3-8.07-1.971249-2.0543004-4.724691-3.1709538-7.57-3.07zM250 44.27h9.79v18.58c-.125272 2.5360436.124076 5.0766997.74 7.54.433835 1.3191993 1.273923 2.467319 2.4 3.28 1.199326.8094698 2.623894 1.2189893 4.07 1.17 1.455597.0478904 2.890629-.3536395 4.11-1.15 1.176822-.8333654 2.056319-2.0212119 2.51-3.39.4-1.1133333.6-3.49.6-7.13v-18.9h9.68v16.35c0 6.74-.533333 11.35-1.6 13.83-1.155092 2.8668191-3.162099 5.3101316-5.75 7-2.915931 1.72144-6.266549 2.5651706-9.65 2.43-4.233333 0-7.656667-.9466667-10.27-2.84-2.656958-1.9585935-4.593682-4.7388994-5.51-7.91-.746667-2.36-1.12-6.6266667-1.12-12.8V44.27zm40.31 0h8.3v4.86c.767489-1.7562415 2.006682-3.2654259 3.58-4.36 1.442665-.9779714 3.147113-1.4973227 4.89-1.49 1.372409.0285016 2.720114.3705587 3.94 1l-3 8.34c-.858779-.4874025-1.815195-.7777428-2.8-.85-1.493333 0-2.753333.9233333-3.78 2.77-1.026667 1.8466667-1.54 5.4633333-1.54 10.85v17.47h-9.61l.02-38.59zm48.12 5.39l-6 6c-2.433333-2.44-4.643333-3.66-6.63-3.66-.902316-.0524313-1.79724.1897247-2.55.69-.573152.3850847-.91784 1.0295007-.92 1.72.003314.536265.210697 1.0511472.58 1.44.86418.7436068 1.839282 1.3475632 2.89 1.79l3.55 1.77c3.733333 1.8466667 6.3 3.7266667 7.7 5.64 3.334996 4.8120386 2.618581 11.3450638-1.68 15.32-2.52 2.2933333-5.896667 3.44-10.13 3.44-5.306684.1570903-10.34968-2.3120323-13.48-6.6l6-6.49c1.120544 1.311055 2.477408 2.3999384 4 3.21 1.234508.7295857 2.627813 1.1482637 4.06 1.22 1.104873.0554814 2.195409-.2692091 3.09-.92.665094-.487764 1.067432-1.2555276 1.09-2.08 0-1.4933333-1.406667-2.9466667-4.22-4.36l-3.26-1.63c-6.24-3.1466667-9.36-7.0833333-9.36-11.81-.023382-2.9974288 1.266494-5.8548879 3.53-7.82 2.468114-2.2042903 5.692983-3.3688266 9-3.25 5.010194-.0274064 9.731027 2.3441612 12.7 6.38h.04zm45.99 16.7h-31.1c.344633 2.5519358 1.628201 4.8837517 3.6 6.54 2.119278 1.6772588 4.769524 2.5393871 7.47 2.43 3.495035.0528887 6.861918-1.3147949 9.33-3.79l8.16 3.83c-1.849704 2.7229701-4.366447 4.9264112-7.31 6.4-3.168167 1.4515868-6.626273 2.1596264-10.11 2.07-6.053333 0-10.983333-1.91-14.79-5.73-3.778418-3.794868-5.828939-8.9772248-5.67-14.33-.169883-5.4590569 1.883549-10.7532295 5.69-14.67 3.730211-3.86226 8.912541-5.978015 14.28-5.83 6.073333 0 11.016667 1.9433333 14.83 5.83s5.716667 9.0233333 5.71 15.41l-.09 1.84zm-9.68-7.63c-.614521-2.121145-1.933733-3.9694522-3.74-5.24-1.914891-1.3466635-4.209472-2.0472991-6.55-2-2.555466-.0480087-5.055132.7500564-7.11 2.27-1.575496 1.3502917-2.794648 3.0674061-3.55 5l20.95-.03zM51.87 0C23.71 0 0 22.83 0 51v52.81l51.86-.05c28.16 0 51-23.71 51-51.87C102.86 23.73 80 0 51.87 0z\"],[8],[0,\"\\n          \"],[9],[0,\"\\n          \"],[7,\"path\",true],[10,\"fill\",\"#FFF9AE\"],[10,\"d\",\"M52.37 19.74c-11.1380058.0065739-21.451097 5.8725864-27.1495582 15.4424743C19.5219805 44.7523623 19.2787009 56.6145192 24.58 66.41l-5.72 18.4 20.54-4.64c11.7619991 5.29926 25.5640682 2.9191757 34.8718647-6.0134445 9.3077965-8.9326201 12.2534008-22.6251484 7.4422692-34.5951021C76.9030023 27.5914997 65.3006488 19.7462906 52.4 19.74h-.03z\"],[8],[0,\"\\n          \"],[9],[0,\"\\n          \"],[7,\"path\",true],[10,\"fill\",\"#00AEEF\"],[10,\"d\",\"M77.0874282 70.9138623C68.1087341 82.2404672 52.5895354 86.0314364 39.4 80.12l-20.54 4.7 20.91-2.47c13.8618885 8.120188 31.6101861 4.5474373 41.2505109-8.3037707C90.6608357 61.1950214 89.1246004 43.1559917 77.45 32.12c8.7654246 11.4924434 8.6161222 27.4672575-.3625718 38.7938623z\"],[8],[0,\"\\n          \"],[9],[0,\"\\n          \"],[7,\"path\",true],[10,\"fill\",\"#00A94F\"],[10,\"d\",\"M75.3191226 64.9088434C67.572355 77.1106513 52.5344195 82.5013605 38.8 78l-19.94 6.82 20.54-4.65c14.6285181 6.6078894 31.8869319 1.1988304 40.1270438-12.5764482C87.7671557 53.8182732 84.370682 36.05385 71.63 26.29c9.9167741 10.5144718 11.4358902 26.4170355 3.6891226 38.6188434z\"],[8],[0,\"\\n          \"],[9],[0,\"\\n          \"],[7,\"path\",true],[10,\"fill\",\"#F15D22\"],[10,\"d\",\"M26.47 67.11c-5.7247169-13.7992006-1.0069753-29.722128 11.3108878-38.1755635C50.0987509 20.4810011 66.6529755 21.8055203 77.47 32.11c-10.0181769-13.1470907-28.4736729-16.3561915-42.3417564-7.3625203C21.26016 33.7411508 16.6624984 51.9005882 24.58 66.41l-5.72 18.4 7.61-17.7z\"],[8],[0,\"\\n          \"],[9],[0,\"\\n          \"],[7,\"path\",true],[10,\"fill\",\"#D0232B\"],[10,\"d\",\"M24.58 66.41c-7.1032817-13.1205259-4.0652056-29.4212778 7.2876929-39.1020065C43.2205913 17.6272648 59.7966078 17.2028861 71.63 26.29c-11.3513195-11.9524832-29.9818586-13.1756566-42.7984647-2.8098996C16.0149293 33.8458575 13.3153477 52.3203102 22.63 65.92l-3.76 18.9 5.71-18.41z\"],[8],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n      \"],[9],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/application"}});
Ember.TEMPLATES["wizard/templates/components/font-preview"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"div\",true],[10,\"class\",\"preview-area\"],[8],[0,\"\\n  \"],[7,\"canvas\",true],[11,\"width\",[22,\"elementWidth\"]],[11,\"height\",[22,\"elementHeight\"]],[11,\"style\",[22,\"canvasStyle\"]],[8],[0,\"\\n  \"],[9],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/font-preview"}});
Ember.TEMPLATES["wizard/templates/components/invite-list-user"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"span\",true],[10,\"class\",\"email\"],[8],[1,[24,[\"user\",\"email\"]],false],[9],[0,\"\\n\"],[7,\"span\",true],[10,\"class\",\"role\"],[8],[1,[22,\"roleName\"],false],[9],[0,\"\\n\\n\"],[7,\"button\",false],[12,\"class\",\"wizard-btn small danger remove-user\"],[12,\"type\",\"button\"],[3,\"action\",[[23,0,[]],[24,[\"removeUser\"]],[24,[\"user\"]]]],[8],[0,\"\\n  \"],[1,[28,\"d-icon\",[\"times\"],null],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/invite-list-user"}});
Ember.TEMPLATES["wizard/templates/components/invite-list"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"user\"],\"statements\":[[0,\"\\n\"],[4,\"if\",[[24,[\"users\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"users-list\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"users\"]]],null,{\"statements\":[[0,\"      \"],[1,[28,\"invite-list-user\",null,[[\"user\",\"roles\",\"removeUser\"],[[23,1,[]],[24,[\"roles\"]],[28,\"action\",[[23,0,[]],\"removeUser\"],null]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[7,\"div\",true],[10,\"class\",\"new-user\"],[8],[0,\"\\n  \"],[7,\"div\",true],[11,\"class\",[29,[\"text-field \",[28,\"if\",[[24,[\"invalid\"]],\"invalid\"],null]]]],[8],[0,\"\\n    \"],[1,[28,\"input\",null,[[\"class\",\"value\",\"placeholder\",\"tabindex\"],[\"invite-email wizard-focusable\",[24,[\"inviteEmail\"]],\"user@example.com\",\"9\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\\n  \"],[1,[28,\"combo-box\",null,[[\"value\",\"content\",\"nameProperty\",\"onChange\"],[[24,[\"inviteRole\"]],[24,[\"roles\"]],\"label\",[28,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"inviteRole\"]]],null]],null]]]],false],[0,\"\\n\\n  \"],[7,\"button\",false],[12,\"class\",\"wizard-btn small add-user\"],[12,\"type\",\"button\"],[3,\"action\",[[23,0,[]],\"addUser\"]],[8],[0,\"\\n    \"],[1,[28,\"d-icon\",[\"plus\"],null],false],[1,[28,\"i18n\",[\"wizard.invites.add_user\"],null],false],[0,\"\\n  \"],[9],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/invite-list"}});
Ember.TEMPLATES["wizard/templates/components/radio-button"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"div\",true],[10,\"class\",\"radio-area\"],[8],[0,\"\\n  \"],[7,\"input\",true],[11,\"name\",[22,\"label\"]],[10,\"type\",\"radio\"],[8],[9],[0,\"\\n  \"],[7,\"span\",true],[10,\"class\",\"radio-label\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"icon\"]]],null,{\"statements\":[[0,\"      \"],[1,[28,\"d-icon\",[[24,[\"icon\"]]],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[1,[22,\"label\"],false],[0,\"\\n  \"],[9],[0,\"\\n\"],[4,\"if\",[[24,[\"extraLabel\"]]],null,{\"statements\":[[0,\"    \"],[7,\"span\",true],[10,\"class\",\"extra-label\"],[8],[0,\"\\n      \"],[1,[28,\"html-safe\",[[24,[\"extraLabel\"]]],null],false],[0,\"\\n    \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[9],[0,\"\\n\"],[7,\"div\",true],[10,\"class\",\"radio-description\"],[8],[0,\"\\n  \"],[1,[22,\"description\"],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/radio-button"}});
Ember.TEMPLATES["wizard/templates/components/staff-count"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"if\",[[24,[\"showStaffCount\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"staff-count\"],[8],[0,\"\\n    \"],[1,[28,\"i18n\",[\"wizard.staff_count\"],[[\"count\"],[[24,[\"field\",\"value\"]]]]],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/staff-count"}});
Ember.TEMPLATES["wizard/templates/components/theme-preview"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"div\",true],[10,\"class\",\"preview-area\"],[8],[0,\"\\n  \"],[7,\"canvas\",true],[11,\"width\",[22,\"elementWidth\"]],[11,\"height\",[22,\"elementHeight\"]],[11,\"style\",[22,\"canvasStyle\"]],[8],[0,\"\\n  \"],[9],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/theme-preview"}});
Ember.TEMPLATES["wizard/templates/components/theme-previews"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"choice\"],\"statements\":[[7,\"ul\",true],[10,\"class\",\"grid\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"field\",\"choices\"]]],null,{\"statements\":[[0,\"    \"],[7,\"li\",true],[8],[0,\"\\n      \"],[1,[28,\"theme-preview\",null,[[\"colorsId\",\"wizard\",\"selectedId\",\"onChange\"],[[23,1,[\"id\"]],[24,[\"wizard\"]],[24,[\"field\",\"value\"]],[28,\"action\",[[23,0,[]],\"changed\"],null]]]],false],[0,\"\\n      \"],[1,[28,\"radio-button\",null,[[\"radioValue\",\"label\",\"value\",\"onChange\"],[[23,1,[\"id\"]],[23,1,[\"id\"]],[24,[\"field\",\"value\"]],[28,\"action\",[[23,0,[]],\"changed\"],null]]]],false],[0,\"\\n    \"],[9],[0,\"\\n\"]],\"parameters\":[1]},null],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/theme-previews"}});
Ember.TEMPLATES["wizard/templates/components/wizard-field-checkbox"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"label\",true],[8],[0,\"\\n  \"],[1,[28,\"input\",null,[[\"type\",\"class\",\"checked\"],[\"checkbox\",\"wizard-checkbox\",[24,[\"field\",\"value\"]]]]],false],[0,\"\\n  \"],[1,[24,[\"field\",\"placeholder\"]],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/wizard-field-checkbox"}});
Ember.TEMPLATES["wizard/templates/components/wizard-field-checkboxes"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"c\"],\"statements\":[[4,\"each\",[[24,[\"field\",\"choices\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[11,\"class\",[29,[\"checkbox-field-choice \",[22,\"fieldClass\"]]]],[8],[0,\"\\n    \"],[7,\"label\",true],[11,\"id\",[23,1,[\"id\"]]],[11,\"value\",[23,1,[\"label\"]]],[8],[0,\"\\n      \"],[1,[28,\"input\",null,[[\"type\",\"class\",\"click\",\"checked\"],[\"checkbox\",\"wizard-checkbox\",[28,\"action\",[[23,0,[]],\"changed\"],[[\"value\"],[\"target\"]]],[23,1,[\"checked\"]]]]],false],[0,\"\\n\"],[4,\"if\",[[23,1,[\"icon\"]]],null,{\"statements\":[[0,\"        \"],[1,[28,\"d-icon\",[[23,1,[\"icon\"]]],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"      \"],[1,[23,1,[\"label\"]],false],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[1]},null]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/wizard-field-checkboxes"}});
Ember.TEMPLATES["wizard/templates/components/wizard-field-dropdown"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"combo-box\",null,[[\"id\",\"class\",\"value\",\"content\",\"nameProperty\",\"tabindex\",\"onChange\"],[[24,[\"field\",\"id\"]],[24,[\"fieldClass\"]],[24,[\"field\",\"value\"]],[24,[\"field\",\"choices\"]],\"label\",\"9\",[28,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"field\",\"value\"]]],null]],null]]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/wizard-field-dropdown"}});
Ember.TEMPLATES["wizard/templates/components/wizard-field-image"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"if\",[[24,[\"field\",\"value\"]]],null,{\"statements\":[[0,\"  \"],[1,[28,\"component\",[[24,[\"previewComponent\"]]],[[\"field\",\"fieldClass\",\"wizard\"],[[24,[\"field\"]],[24,[\"fieldClass\"]],[24,[\"wizard\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[7,\"label\",true],[11,\"class\",[29,[\"wizard-btn wizard-btn-upload \",[28,\"if\",[[24,[\"uploading\"]],\"disabled\"],null]]]],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"uploading\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"i18n\",[\"wizard.uploading\"],null],false],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"    \"],[1,[28,\"i18n\",[\"wizard.upload\"],null],false],[0,\"\\n    \"],[1,[28,\"d-icon\",[\"far-image\"],null],false],[0,\"\\n\"]],\"parameters\":[]}],[0,\"\\n  \"],[7,\"input\",true],[10,\"class\",\"wizard-hidden-upload-field\"],[11,\"disabled\",[22,\"uploading\"]],[10,\"accept\",\"image/*\"],[10,\"type\",\"file\"],[8],[9],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/wizard-field-image"}});
Ember.TEMPLATES["wizard/templates/components/wizard-field-radio"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"c\"],\"statements\":[[4,\"each\",[[24,[\"field\",\"choices\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[11,\"class\",[29,[\"radio-field-choice \",[22,\"fieldClass\"]]]],[8],[0,\"\\n    \"],[1,[28,\"radio-button\",null,[[\"value\",\"radioValue\",\"label\",\"extraLabel\",\"icon\",\"description\",\"onChange\"],[[24,[\"field\",\"value\"]],[23,1,[\"id\"]],[23,1,[\"label\"]],[23,1,[\"extra_label\"]],[23,1,[\"icon\"]],[23,1,[\"description\"]],[28,\"action\",[[23,0,[]],\"changed\"],null]]]],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[1]},null]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/wizard-field-radio"}});
Ember.TEMPLATES["wizard/templates/components/wizard-field-text"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"input\",null,[[\"id\",\"value\",\"class\",\"placeholder\",\"tabindex\"],[[24,[\"field\",\"id\"]],[24,[\"field\",\"value\"]],[24,[\"fieldClass\"]],[24,[\"field\",\"placeholder\"]],\"9\"]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/wizard-field-text"}});
Ember.TEMPLATES["wizard/templates/components/wizard-field-textarea"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"textarea\",null,[[\"id\",\"value\",\"class\",\"placeholder\",\"tabindex\"],[[24,[\"field\",\"id\"]],[24,[\"field\",\"value\"]],[24,[\"fieldClass\"]],[24,[\"field\",\"placeholder\"]],\"9\"]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/wizard-field-textarea"}});
Ember.TEMPLATES["wizard/templates/components/wizard-field"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"label\",true],[11,\"for\",[24,[\"field\",\"id\"]]],[8],[0,\"\\n  \"],[7,\"span\",true],[10,\"class\",\"label-value\"],[8],[0,\"\\n    \"],[1,[24,[\"field\",\"label\"]],false],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"field\",\"required\"]]],null,{\"statements\":[[0,\"      \"],[7,\"span\",true],[10,\"class\",\"field-required\"],[8],[0,\"*\"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"  \"],[9],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"field\",\"description\"]]],null,{\"statements\":[[0,\"    \"],[7,\"div\",true],[10,\"class\",\"field-description\"],[8],[1,[28,\"html-safe\",[[24,[\"field\",\"description\"]]],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[9],[0,\"\\n\\n\"],[7,\"div\",true],[10,\"class\",\"input-area\"],[8],[0,\"\\n  \"],[1,[28,\"component\",[[24,[\"inputComponentName\"]]],[[\"field\",\"step\",\"fieldClass\",\"wizard\"],[[24,[\"field\"]],[24,[\"step\"]],[24,[\"fieldClass\"]],[24,[\"wizard\"]]]]],false],[0,\"\\n\"],[9],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"field\",\"errorDescription\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"field-error-description\"],[8],[1,[28,\"html-safe\",[[24,[\"field\",\"errorDescription\"]]],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"if\",[[24,[\"field\",\"extra_description\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"field-extra-description\"],[8],[1,[28,\"html-safe\",[[24,[\"field\",\"extra_description\"]]],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/wizard-field"}});
Ember.TEMPLATES["wizard/templates/components/wizard-image-preview"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"img\",true],[11,\"src\",[24,[\"field\",\"value\"]]],[11,\"class\",[22,\"fieldClass\"]],[8],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/wizard-image-preview"}});
Ember.TEMPLATES["wizard/templates/components/wizard-step"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"field\"],\"statements\":[[7,\"div\",true],[10,\"class\",\"wizard-step-contents\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"step\",\"title\"]]],null,{\"statements\":[[0,\"    \"],[7,\"h1\",true],[10,\"class\",\"wizard-step-title\"],[8],[1,[24,[\"step\",\"title\"]],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n  \"],[7,\"div\",true],[11,\"class\",[22,\"bannerAndDescriptionClass\"]],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"bannerImage\"]]],null,{\"statements\":[[0,\"      \"],[7,\"img\",true],[11,\"src\",[22,\"bannerImage\"]],[10,\"class\",\"wizard-step-banner\"],[8],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"if\",[[24,[\"step\",\"description\"]]],null,{\"statements\":[[0,\"      \"],[7,\"p\",true],[10,\"class\",\"wizard-step-description\"],[8],[1,[28,\"html-safe\",[[24,[\"step\",\"description\"]]],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"  \"],[9],[0,\"\\n\\n\"],[4,\"wizard-step-form\",null,[[\"step\"],[[24,[\"step\"]]]],{\"statements\":[[4,\"each\",[[24,[\"step\",\"fields\"]]],null,{\"statements\":[[0,\"      \"],[1,[28,\"wizard-field\",null,[[\"field\",\"step\",\"wizard\"],[[23,1,[]],[24,[\"step\"]],[24,[\"wizard\"]]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null]],\"parameters\":[]},null],[9],[0,\"\\n\\n\"],[7,\"div\",true],[10,\"class\",\"wizard-step-footer\"],[8],[0,\"\\n\\n  \"],[7,\"div\",true],[10,\"class\",\"wizard-progress\"],[8],[0,\"\\n    \"],[7,\"div\",true],[10,\"class\",\"white\"],[8],[9],[0,\"\\n    \"],[7,\"div\",true],[11,\"style\",[22,\"barStyle\"]],[10,\"class\",\"black\"],[8],[9],[0,\"\\n    \"],[7,\"div\",true],[10,\"class\",\"screen\"],[8],[9],[0,\"\\n    \"],[7,\"span\",true],[8],[1,[28,\"bound-i18n\",[\"wizard.step\"],[[\"current\",\"total\"],[[24,[\"step\",\"displayIndex\"]],[24,[\"wizard\",\"totalSteps\"]]]]],false],[9],[0,\"\\n  \"],[9],[0,\"\\n\\n  \"],[7,\"div\",true],[10,\"class\",\"wizard-buttons\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"showQuitButton\"]]],null,{\"statements\":[[0,\"      \"],[7,\"a\",false],[12,\"href\",\"\"],[12,\"tabindex\",\"11\"],[12,\"class\",\"action-link quit\"],[3,\"action\",[[23,0,[]],\"quit\"]],[8],[1,[28,\"i18n\",[\"wizard.quit\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"if\",[[24,[\"showFinishButton\"]]],null,{\"statements\":[[0,\"      \"],[7,\"button\",false],[12,\"disabled\",[22,\"saving\"]],[12,\"tabindex\",\"10\"],[12,\"class\",\"wizard-btn finish\"],[12,\"type\",\"button\"],[3,\"action\",[[23,0,[]],\"exitEarly\"]],[8],[0,\"\\n        \"],[1,[28,\"i18n\",[\"wizard.finish\"],null],false],[0,\"\\n      \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"if\",[[24,[\"showBackButton\"]]],null,{\"statements\":[[0,\"      \"],[7,\"a\",false],[12,\"href\",\"\"],[12,\"tabindex\",\"11\"],[12,\"class\",\"action-link back\"],[3,\"action\",[[23,0,[]],\"backStep\"]],[8],[1,[28,\"i18n\",[\"wizard.back\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"if\",[[24,[\"showNextButton\"]]],null,{\"statements\":[[0,\"      \"],[7,\"button\",false],[12,\"disabled\",[22,\"saving\"]],[12,\"tabindex\",\"10\"],[12,\"class\",\"wizard-btn next primary\"],[12,\"type\",\"button\"],[3,\"action\",[[23,0,[]],\"nextStep\"]],[8],[0,\"\\n        \"],[1,[28,\"i18n\",[\"wizard.next\"],null],false],[0,\"\\n        \"],[1,[28,\"d-icon\",[\"chevron-right\"],null],false],[0,\"\\n      \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"if\",[[24,[\"showDoneButton\"]]],null,{\"statements\":[[0,\"      \"],[7,\"button\",false],[12,\"disabled\",[22,\"saving\"]],[12,\"tabindex\",\"10\"],[12,\"class\",\"wizard-btn done\"],[12,\"type\",\"button\"],[3,\"action\",[[23,0,[]],\"quit\"]],[8],[0,\"\\n        \"],[1,[28,\"i18n\",[\"wizard.done\"],null],false],[0,\"\\n      \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"  \"],[9],[0,\"\\n\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/components/wizard-step"}});
Ember.TEMPLATES["wizard/templates/step"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"wizard-step\",null,[[\"step\",\"wizard\",\"goNext\",\"goBack\"],[[24,[\"step\"]],[24,[\"wizard\"]],[28,\"action\",[[23,0,[]],\"goNext\"],null],[28,\"action\",[[23,0,[]],\"goBack\"],null]]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"wizard/templates/step"}});
define("wizard/components/font-preview", ["exports", "wizard/lib/preview", "I18n", "discourse-common/utils/decorators"], function (_exports, _preview, _I18n, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var LOREM = "\nLorem ipsum dolor sit amet, consectetur adipiscing.\nNullam eget sem non elit tincidunt rhoncus. Fusce\nvelit nisl, porttitor sed nisl ac, consectetur interdum\nmetus. Fusce in consequat augue, vel facilisis felis.";

  var _default = (0, _preview.createPreviewComponent)(659, 320, (_dec = (0, _decorators.observes)("step.fieldsById.body_font.value", "step.fieldsById.heading_font.value"), (_obj = {
    logo: null,
    avatar: null,
    fontChanged: function fontChanged() {
      this.triggerRepaint();
    },
    images: function images() {
      return {
        logo: this.wizard.getLogoUrl(),
        avatar: "/images/wizard/trout.png"
      };
    },
    paint: function paint(_ref) {
      var ctx = _ref.ctx,
          colors = _ref.colors,
          font = _ref.font,
          headingFont = _ref.headingFont,
          width = _ref.width,
          height = _ref.height;
      var headerHeight = height * 0.3;

      if (this.logo) {
        this.drawFullHeader(colors, headingFont, this.logo);
      }

      var margin = 20;
      var avatarSize = height * 0.2;
      var lineHeight = height / 11; // Draw a fake topic

      this.scaleImage(this.avatar, margin, headerHeight + height * 0.11, avatarSize, avatarSize);
      var titleFontSize = headerHeight / 55;
      ctx.beginPath();
      ctx.fillStyle = colors.primary;
      ctx.font = "bold ".concat(titleFontSize, "em '").concat(headingFont, "'");
      ctx.fillText(_I18n.default.t("wizard.previews.topic_title"), margin, height * 0.3);
      var bodyFontSize = height / 330.0;
      ctx.font = "".concat(bodyFontSize, "em '").concat(font, "'");
      var line = 0;
      var lines = LOREM.split("\n");

      for (var i = 0; i < 5; i++) {
        line = height * 0.35 + i * lineHeight;
        ctx.fillText(lines[i], margin + avatarSize + margin, line);
      } // Share Button


      var shareButtonWidth = _I18n.default.t("wizard.previews.share_button").length * 11;
      ctx.beginPath();
      ctx.rect(margin, line + lineHeight, shareButtonWidth, height * 0.1);
      ctx.fillStyle = (0, _preview.darkLightDiff)(colors.primary, colors.secondary, 90, 65);
      ctx.fill();
      ctx.fillStyle = (0, _preview.chooseDarker)(colors.primary, colors.secondary);
      ctx.font = "".concat(bodyFontSize, "em '").concat(font, "'");
      ctx.fillText(_I18n.default.t("wizard.previews.share_button"), margin + 10, line + lineHeight * 1.7); // Reply Button

      var replyButtonWidth = _I18n.default.t("wizard.previews.reply_button").length * 11;
      ctx.beginPath();
      ctx.rect(shareButtonWidth + margin + 10, line + lineHeight, replyButtonWidth, height * 0.1);
      ctx.fillStyle = colors.tertiary;
      ctx.fill();
      ctx.fillStyle = colors.secondary;
      ctx.font = "".concat(bodyFontSize, "em '").concat(font, "'");
      ctx.fillText(_I18n.default.t("wizard.previews.reply_button"), shareButtonWidth + margin + 20, line + lineHeight * 1.7); // Draw Timeline

      var timelineX = width * 0.86;
      ctx.beginPath();
      ctx.strokeStyle = colors.tertiary;
      ctx.lineWidth = 0.5;
      ctx.moveTo(timelineX, height * 0.3);
      ctx.lineTo(timelineX, height * 0.7);
      ctx.stroke(); // Timeline

      ctx.beginPath();
      ctx.strokeStyle = colors.tertiary;
      ctx.lineWidth = 2;
      ctx.moveTo(timelineX, height * 0.3);
      ctx.lineTo(timelineX, height * 0.4);
      ctx.stroke();
      ctx.font = "Bold ".concat(bodyFontSize, "em ").concat(font);
      ctx.fillStyle = colors.primary;
      ctx.fillText("1 / 20", timelineX + margin, height * 0.3 + margin * 1.5);
    }
  }, (_applyDecoratedDescriptor(_obj, "fontChanged", [_dec], Object.getOwnPropertyDescriptor(_obj, "fontChanged"), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/components/homepage-preview", ["exports", "wizard/lib/preview", "discourse-common/utils/decorators"], function (_exports, _preview, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = (0, _preview.createPreviewComponent)(659, 320, (_dec = (0, _decorators.observes)("step.fieldsById.homepage_style.value"), (_obj = {
    logo: null,
    avatar: null,
    styleChanged: function styleChanged() {
      this.triggerRepaint();
    },
    images: function images() {
      return {
        logo: this.wizard.getLogoUrl(),
        avatar: "/images/wizard/trout.png"
      };
    },
    paint: function paint(_ref) {
      var ctx = _ref.ctx,
          colors = _ref.colors,
          font = _ref.font,
          width = _ref.width,
          height = _ref.height;
      this.drawFullHeader(colors, font, this.logo);

      if (this.get("step.fieldsById.homepage_style.value") === "latest") {
        this.drawPills(colors, font, height * 0.15);
        this.renderLatest(ctx, colors, font, width, height);
      } else if (["categories_only", "categories_with_featured_topics"].includes(this.get("step.fieldsById.homepage_style.value"))) {
        this.drawPills(colors, font, height * 0.15, {
          categories: true
        });
        this.renderCategories(ctx, colors, font, width, height);
      } else if (["categories_boxes", "categories_boxes_with_topics"].includes(this.get("step.fieldsById.homepage_style.value"))) {
        this.drawPills(colors, font, height * 0.15, {
          categories: true
        });
        var topics = this.get("step.fieldsById.homepage_style.value") === "categories_boxes_with_topics";
        this.renderCategoriesBoxes(ctx, colors, font, width, height, {
          topics: topics
        });
      } else {
        this.drawPills(colors, font, height * 0.15, {
          categories: true
        });
        this.renderCategoriesWithTopics(ctx, colors, font, width, height);
      }
    },
    renderCategoriesBoxes: function renderCategoriesBoxes(ctx, colors, font, width, height, opts) {
      var _this = this;

      opts = opts || {};
      var borderColor = (0, _preview.darkLightDiff)(colors.primary, colors.secondary, 90, -75);
      var textColor = (0, _preview.darkLightDiff)(colors.primary, colors.secondary, 50, 50);
      var margin = height * 0.03;
      var bodyFontSize = height / 440.0;
      var boxHeight = height * 0.7 - margin * 2;
      var descriptions = this.getDescriptions();
      var boxesSpacing = 15;
      var boxWidth = (width - margin * 2 - boxesSpacing * 2) / 3;
      this.categories().forEach(function (category, index) {
        var boxStartX = margin + index * boxWidth + index * boxesSpacing;
        var boxStartY = height * 0.33;

        _this.drawSquare(ctx, {
          x: boxStartX,
          y: boxStartY
        }, {
          x: boxStartX + boxWidth,
          y: boxStartY + boxHeight
        }, [{
          color: borderColor
        }, {
          color: borderColor
        }, {
          color: borderColor
        }, {
          color: category.color,
          width: 5
        }]);

        ctx.font = "Bold ".concat(bodyFontSize * 1.3, "em '").concat(font, "'");
        ctx.fillStyle = colors.primary;
        ctx.textAlign = "center";
        ctx.fillText(category.name, boxStartX + boxWidth / 2, boxStartY + 25);
        ctx.textAlign = "left";

        if (opts.topics) {
          var startY = boxStartY + 60;

          _this.getTitles().forEach(function (title) {
            ctx.font = "".concat(bodyFontSize * 1, "em '").concat(font, "'");
            ctx.fillStyle = colors.tertiary;
            startY += _this.fillTextMultiLine(ctx, title.split("\n").join(" "), boxStartX + 10, startY, 13, boxWidth * 0.95) + 8;
          });
        } else {
          ctx.font = "".concat(bodyFontSize * 1, "em '").concat(font, "'");
          ctx.fillStyle = textColor;
          ctx.textAlign = "center";

          _this.fillTextMultiLine(ctx, descriptions[index], boxStartX + boxWidth / 2, boxStartY + 60, 13, boxWidth * 0.8);

          ctx.textAlign = "left";
        }
      });
    },
    renderCategories: function renderCategories(ctx, colors, font, width, height) {
      var _this2 = this;

      var textColor = (0, _preview.darkLightDiff)(colors.primary, colors.secondary, 50, 50);
      var margin = height * 0.03;
      var bodyFontSize = height / 440.0;
      var titles = this.getTitles();
      var categoryHeight = height / 6;

      var drawLine = function drawLine(x, y) {
        ctx.beginPath();
        ctx.strokeStyle = (0, _preview.darkLightDiff)(colors.primary, colors.secondary, 90, -75);
        ctx.moveTo(margin + x, y);
        ctx.lineTo(width - margin, y);
        ctx.stroke();
      };

      var cols = [0.025, 0.45, 0.53, 0.58, 0.94, 0.96].map(function (c) {
        return c * width;
      });
      var headingY = height * 0.33;
      ctx.font = "".concat(bodyFontSize * 0.9, "em '").concat(font, "'");
      ctx.fillStyle = textColor;
      ctx.fillText("Category", cols[0], headingY);

      if (this.get("step.fieldsById.homepage_style.value") === "categories_only") {
        ctx.fillText("Topics", cols[4], headingY);
      } else {
        ctx.fillText("Topics", cols[1], headingY);
        ctx.fillText("Latest", cols[2], headingY);
        categoryHeight = height / 5;
      }

      var y = headingY + bodyFontSize * 12;
      ctx.lineWidth = 2;
      drawLine(0, y);
      drawLine(width / 2, y); // Categories

      this.categories().forEach(function (category) {
        var textPos = y + categoryHeight * 0.35;
        ctx.font = "Bold ".concat(bodyFontSize * 1.1, "em '").concat(font, "'");
        ctx.fillStyle = colors.primary;
        ctx.fillText(category.name, cols[0], textPos);
        ctx.font = "".concat(bodyFontSize * 0.8, "em '").concat(font, "'");
        ctx.fillStyle = textColor;
        ctx.fillText(titles[0], cols[0] - margin * 0.25, textPos + categoryHeight * 0.36);
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.strokeStyle = category.color;
        ctx.lineWidth = 3.5;
        ctx.lineTo(margin, y + categoryHeight);
        ctx.stroke();

        if (_this2.get("step.fieldsById.homepage_style.value") === "categories_with_featured_topics") {
          ctx.font = "".concat(bodyFontSize, "em '").concat(font, "'");
          ctx.fillText(Math.floor(Math.random() * 90) + 10, cols[1] + 15, textPos);
        } else {
          ctx.font = "".concat(bodyFontSize, "em '").concat(font, "'");
          ctx.fillText(Math.floor(Math.random() * 90) + 10, cols[5], textPos);
        }

        y += categoryHeight;
        ctx.lineWidth = 1;
        drawLine(0, y);
      }); // Featured Topics

      if (this.get("step.fieldsById.homepage_style.value") === "categories_with_featured_topics") {
        var topicHeight = height / 15;
        y = headingY + bodyFontSize * 22;
        ctx.lineWidth = 1;
        ctx.fillStyle = colors.tertiary;
        titles.forEach(function (title) {
          ctx.font = "".concat(bodyFontSize, "em '").concat(font, "'");
          var textPos = y + topicHeight * 0.35;
          ctx.fillStyle = colors.tertiary;
          ctx.fillText("".concat(title), cols[2], textPos);
          y += topicHeight;
        });
      }
    },
    renderCategoriesWithTopics: function renderCategoriesWithTopics(ctx, colors, font, width, height) {
      var _this3 = this;

      var textColor = (0, _preview.darkLightDiff)(colors.primary, colors.secondary, 50, 50);
      var margin = height * 0.03;
      var bodyFontSize = height / 440.0;

      var drawLine = function drawLine(x, y) {
        ctx.beginPath();
        ctx.strokeStyle = (0, _preview.darkLightDiff)(colors.primary, colors.secondary, 90, -75);
        ctx.moveTo(margin + x, y);
        ctx.lineTo(margin + x + width * 0.9 / 2, y);
        ctx.stroke();
      };

      var cols = [0.025, 0.42, 0.53, 0.58, 0.94].map(function (c) {
        return c * width;
      });
      var headingY = height * 0.33;
      ctx.font = "".concat(bodyFontSize * 0.9, "em '").concat(font, "'");
      ctx.fillStyle = textColor;
      ctx.fillText("Category", cols[0], headingY);
      ctx.fillText("Topics", cols[1], headingY);

      if (this.get("step.fieldsById.homepage_style.value") === "categories_and_latest_topics") {
        ctx.fillText("Latest", cols[2], headingY);
      } else {
        ctx.fillText("Top", cols[2], headingY);
      }

      var y = headingY + bodyFontSize * 12;
      ctx.lineWidth = 2;
      drawLine(0, y);
      drawLine(width / 2, y);
      var categoryHeight = height / 6;
      var titles = this.getTitles(); // Categories

      this.categories().forEach(function (category) {
        var textPos = y + categoryHeight * 0.35;
        ctx.font = "Bold ".concat(bodyFontSize * 1.1, "em '").concat(font, "'");
        ctx.fillStyle = colors.primary;
        ctx.fillText(category.name, cols[0], textPos);
        ctx.font = "".concat(bodyFontSize * 0.8, "em '").concat(font, "'");
        ctx.fillStyle = textColor;
        ctx.fillText(titles[0], cols[0] - margin * 0.25, textPos + categoryHeight * 0.36);
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.strokeStyle = category.color;
        ctx.lineWidth = 3.5;
        ctx.lineTo(margin, y + categoryHeight);
        ctx.stroke();
        ctx.font = "".concat(bodyFontSize, "em '").concat(font, "'");
        ctx.fillText(Math.floor(Math.random() * 90) + 10, cols[1] + 15, textPos);
        y += categoryHeight;
        ctx.lineWidth = 1;
        drawLine(0, y);
      }); // Latest/Top Topics

      var topicHeight = height / 8;
      var avatarSize = topicHeight * 0.7;
      y = headingY + bodyFontSize * 12;
      ctx.lineWidth = 1;
      ctx.fillStyle = textColor;
      titles.forEach(function (title) {
        var category = _this3.categories()[0];

        ctx.font = "".concat(bodyFontSize, "em '").concat(font, "'");
        var textPos = y + topicHeight * 0.45;
        ctx.fillStyle = textColor;

        _this3.scaleImage(_this3.avatar, cols[2], y + margin * 0.6, avatarSize, avatarSize);

        ctx.fillText(title, cols[3], textPos);
        ctx.font = "Bold ".concat(bodyFontSize, "em '").concat(font, "'");
        ctx.fillText(Math.floor(Math.random() * 90) + 10, cols[4], textPos);
        ctx.font = "".concat(bodyFontSize, "em '").concat(font, "'");
        ctx.fillText("1h", cols[4], textPos + topicHeight * 0.4);
        ctx.beginPath();
        ctx.fillStyle = category.color;
        var badgeSize = topicHeight * 0.1;
        ctx.font = "Bold ".concat(bodyFontSize * 0.5, "em '").concat(font, "'");
        ctx.rect(cols[3] + margin * 0.5, y + topicHeight * 0.65, badgeSize, badgeSize);
        ctx.fill();
        ctx.fillStyle = colors.primary;
        ctx.fillText(category.name, cols[3] + badgeSize * 3, y + topicHeight * 0.76);
        y += topicHeight;
        drawLine(width / 2, y);
      });
    },
    getTitles: function getTitles() {
      return _preview.LOREM.split(".").slice(0, 8).map(function (t) {
        return t.substring(0, 40);
      });
    },
    getDescriptions: function getDescriptions() {
      return _preview.LOREM.split(".");
    },
    renderLatest: function renderLatest(ctx, colors, font, width, height) {
      var _this4 = this;

      var rowHeight = height / 6.6;
      var textColor = (0, _preview.darkLightDiff)(colors.primary, colors.secondary, 50, 50);
      var bodyFontSize = height / 440.0;
      ctx.font = "".concat(bodyFontSize, "em '").concat(font, "'");
      var margin = height * 0.03;

      var drawLine = function drawLine(y) {
        ctx.beginPath();
        ctx.strokeStyle = (0, _preview.darkLightDiff)(colors.primary, colors.secondary, 90, -75);
        ctx.moveTo(margin, y);
        ctx.lineTo(width - margin, y);
        ctx.stroke();
      };

      var cols = [0.02, 0.66, 0.8, 0.87, 0.93].map(function (c) {
        return c * width;
      }); // Headings

      var headingY = height * 0.33;
      ctx.fillStyle = textColor;
      ctx.font = "".concat(bodyFontSize * 0.9, "em '").concat(font, "'");
      ctx.fillText("Topic", cols[0], headingY);
      ctx.fillText("Replies", cols[2], headingY);
      ctx.fillText("Views", cols[3], headingY);
      ctx.fillText("Activity", cols[4], headingY); // Topics

      var y = headingY + rowHeight / 2.6;
      ctx.lineWidth = 2;
      drawLine(y);
      ctx.font = "".concat(bodyFontSize, "em '").concat(font, "'");
      ctx.lineWidth = 1;
      this.getTitles().forEach(function (title) {
        var textPos = y + rowHeight * 0.4;
        ctx.fillStyle = textColor;
        ctx.fillText(title, cols[0], textPos);

        var category = _this4.categories()[0];

        ctx.beginPath();
        ctx.fillStyle = category.color;
        var badgeSize = rowHeight * 0.15;
        ctx.font = "Bold ".concat(bodyFontSize * 0.75, "em '").concat(font, "'");
        ctx.rect(cols[0] + 4, y + rowHeight * 0.6, badgeSize, badgeSize);
        ctx.fill();
        ctx.fillStyle = colors.primary;
        ctx.fillText(category.name, cols[0] + badgeSize * 2, y + rowHeight * 0.73);

        _this4.scaleImage(_this4.avatar, cols[1], y + rowHeight * 0.25, rowHeight * 0.5, rowHeight * 0.5);

        ctx.fillStyle = textColor;
        ctx.font = "".concat(bodyFontSize, "em '").concat(font, "'");

        for (var j = 2; j <= 4; j++) {
          ctx.fillText(j === 4 ? "1h" : Math.floor(Math.random() * 90) + 10, cols[j] + margin, y + rowHeight * 0.6);
        }

        drawLine(y + rowHeight * 1);
        y += rowHeight;
      });
    },
    fillTextMultiLine: function fillTextMultiLine(ctx, text, x, y, lineHeight, maxWidth) {
      var words = text.split(" ").filter(function (f) {
        return f;
      });
      var line = "";
      var totalHeight = 0;
      words.forEach(function (word) {
        if (ctx.measureText("".concat(line, " ").concat(word, " ")).width >= maxWidth) {
          ctx.fillText(line, x, y + totalHeight);
          totalHeight += lineHeight;
          line = word.trim();
        } else {
          line = "".concat(line, " ").concat(word).trim();
        }
      });
      ctx.fillText(line, x, y + totalHeight);
      totalHeight += lineHeight;
      return totalHeight;
    },
    // Edges expected in this order: NW to NE -> NE to SE -> SE to SW -> SW to NW
    drawSquare: function drawSquare(ctx, from, to) {
      var edges = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

      var edgeConfiguration = function edgeConfiguration(index) {
        var edge = edges[index] || {};
        return {
          width: edge.width || 1,
          color: edge.color || "#333"
        };
      };

      [{
        from: {
          x: from.x,
          y: from.y
        },
        to: {
          x: to.x,
          y: from.y
        }
      }, {
        from: {
          x: to.x,
          y: from.y
        },
        to: {
          x: to.x,
          y: to.y
        }
      }, {
        from: {
          x: to.x,
          y: to.y
        },
        to: {
          x: from.x,
          y: to.y
        }
      }, {
        from: {
          x: from.x,
          y: to.y
        },
        to: {
          x: from.x,
          y: from.y
        }
      }].forEach(function (path, index) {
        var configuration = edgeConfiguration(index);
        ctx.beginPath();
        ctx.moveTo(path.from.x, path.from.y);
        ctx.strokeStyle = configuration.color;
        ctx.lineWidth = configuration.width;
        ctx.lineTo(path.to.x, path.to.y);
        ctx.stroke();
      });
    }
  }, (_applyDecoratedDescriptor(_obj, "styleChanged", [_dec], Object.getOwnPropertyDescriptor(_obj, "styleChanged"), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/components/image-preview-favicon", ["exports", "wizard/lib/preview", "discourse-common/utils/decorators"], function (_exports, _preview, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = (0, _preview.createPreviewComponent)(371, 124, (_dec = (0, _decorators.observes)("field.value"), (_obj = {
    tab: null,
    image: null,
    imageChanged: function imageChanged() {
      this.reload();
    },
    images: function images() {
      return {
        tab: "/images/wizard/tab.png",
        image: this.get("field.value")
      };
    },
    paint: function paint(options) {
      var ctx = options.ctx,
          width = options.width,
          height = options.height;
      this.scaleImage(this.tab, 0, 0, width, height);
      this.scaleImage(this.image, 40, 25, 30, 30);
      ctx.font = "20px 'Arial'";
      ctx.fillStyle = "#000";
      var title = this.wizard.getTitle();

      if (title.length > 20) {
        title = title.substring(0, 20) + "...";
      }

      ctx.fillText(title, 80, 48);
    }
  }, (_applyDecoratedDescriptor(_obj, "imageChanged", [_dec], Object.getOwnPropertyDescriptor(_obj, "imageChanged"), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/components/image-preview-large-icon", ["exports", "wizard/lib/preview", "discourse-common/utils/decorators"], function (_exports, _preview, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = (0, _preview.createPreviewComponent)(325, 125, (_dec = (0, _decorators.observes)("field.value"), (_obj = {
    ios: null,
    image: null,
    imageChanged: function imageChanged() {
      this.reload();
    },
    images: function images() {
      return {
        ios: "/images/wizard/apple-mask.png",
        image: this.get("field.value")
      };
    },
    paint: function paint(options) {
      var width = options.width,
          height = options.height;
      this.scaleImage(this.image, 10, 8, 87, 87);
      this.scaleImage(this.ios, 0, 0, width, height);
    }
  }, (_applyDecoratedDescriptor(_obj, "imageChanged", [_dec], Object.getOwnPropertyDescriptor(_obj, "imageChanged"), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/components/image-preview-logo-small", ["exports", "wizard/lib/preview", "discourse-common/utils/decorators"], function (_exports, _preview, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = (0, _preview.createPreviewComponent)(375, 100, (_dec = (0, _decorators.observes)("field.value"), (_obj = {
    image: null,
    imageChanged: function imageChanged() {
      this.reload();
    },
    images: function images() {
      return {
        image: this.get("field.value")
      };
    },
    paint: function paint(options) {
      var ctx = options.ctx,
          colors = options.colors,
          font = options.font,
          headingFont = options.headingFont,
          width = options.width,
          height = options.height;
      var headerHeight = height / 2;
      (0, _preview.drawHeader)(ctx, colors, width, headerHeight);
      var image = this.image;
      var headerMargin = headerHeight * 0.2;
      var maxWidth = headerHeight - headerMargin * 2.0;
      var imageWidth = image.width;
      var ratio = 1.0;

      if (imageWidth > maxWidth) {
        ratio = maxWidth / imageWidth;
        imageWidth = maxWidth;
      }

      this.scaleImage(image, headerMargin, headerMargin, imageWidth, image.height * ratio);
      var afterLogo = headerMargin * 1.7 + imageWidth;
      var fontSize = Math.round(headerHeight * 0.4);
      ctx.font = "Bold ".concat(fontSize, "px '").concat(headingFont, "'");
      ctx.fillStyle = colors.primary;

      var title = _preview.LOREM.substring(0, 27);

      ctx.fillText(title, headerMargin + imageWidth, headerHeight - fontSize * 1.1);
      var category = this.categories()[0];
      var badgeSize = height / 13.0;
      ctx.beginPath();
      ctx.fillStyle = category.color;
      ctx.rect(afterLogo, headerHeight * 0.7, badgeSize, badgeSize);
      ctx.fill();
      ctx.font = "Bold ".concat(badgeSize * 1.2, "px '").concat(font, "'");
      ctx.fillStyle = colors.primary;
      ctx.fillText(category.name, afterLogo + badgeSize * 1.5, headerHeight * 0.7 + badgeSize * 0.9);
      var LINE_HEIGHT = 12;
      ctx.font = "".concat(LINE_HEIGHT, "px '").concat(font, "'");

      var lines = _preview.LOREM.split("\n");

      for (var i = 0; i < 10; i++) {
        var line = height * 0.55 + i * (LINE_HEIGHT * 1.5);
        ctx.fillText(lines[i], afterLogo, line);
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "imageChanged", [_dec], Object.getOwnPropertyDescriptor(_obj, "imageChanged"), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/components/image-preview-logo", ["exports", "wizard/lib/preview", "discourse-common/utils/decorators"], function (_exports, _preview, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = (0, _preview.createPreviewComponent)(400, 100, (_dec = (0, _decorators.observes)("field.value"), (_obj = {
    image: null,
    imageChanged: function imageChanged() {
      this.reload();
    },
    images: function images() {
      return {
        image: this.get("field.value")
      };
    },
    paint: function paint(_ref) {
      var ctx = _ref.ctx,
          colors = _ref.colors,
          font = _ref.font,
          width = _ref.width,
          height = _ref.height;
      var headerHeight = height / 2;
      (0, _preview.drawHeader)(ctx, colors, width, headerHeight);
      var image = this.image;
      var headerMargin = headerHeight * 0.2;
      var imageHeight = headerHeight - headerMargin * 2;
      var ratio = imageHeight / image.height;
      this.scaleImage(image, headerMargin, headerMargin, image.width * ratio, imageHeight);
      this.drawPills(colors, font, height / 2);
    }
  }, (_applyDecoratedDescriptor(_obj, "imageChanged", [_dec], Object.getOwnPropertyDescriptor(_obj, "imageChanged"), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/components/invite-list-user", ["exports", "@ember/component", "discourse-common/utils/decorators"], function (_exports, _component, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_dec = (0, _decorators.default)("user.role"), (_obj = {
    classNames: ["invite-list-user"],
    roleName: function roleName(role) {
      return this.roles.findBy("id", role).label;
    }
  }, (_applyDecoratedDescriptor(_obj, "roleName", [_dec], Object.getOwnPropertyDescriptor(_obj, "roleName"), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/components/invite-list", ["exports", "@ember/component", "I18n", "@ember/runloop"], function (_exports, _component, _I18n, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _component.default.extend({
    classNames: ["invite-list"],
    users: null,
    inviteEmail: "",
    inviteRole: "",
    invalid: false,
    init: function init() {
      this._super.apply(this, arguments);

      this.set("users", []);
      this.set("roles", [{
        id: "moderator",
        label: _I18n.default.t("wizard.invites.roles.moderator")
      }, {
        id: "regular",
        label: _I18n.default.t("wizard.invites.roles.regular")
      }]);
      this.set("inviteRole", this.get("roles.0.id"));
      this.updateField();
    },
    keyPress: function keyPress(e) {
      if (e.keyCode === 13) {
        e.preventDefault();
        e.stopPropagation();
        this.send("addUser");
      }
    },
    updateField: function updateField() {
      var users = this.users;
      this.set("field.value", JSON.stringify(users));
      var staffCount = this.get("step.fieldsById.staff_count.value") || 1;
      var showWarning = staffCount < 3 && users.length === 0;
      this.set("field.warning", showWarning ? "invites.none_added" : null);
    },
    actions: {
      addUser: function addUser() {
        var _this = this;

        var user = {
          email: this.inviteEmail || "",
          role: this.inviteRole
        };

        if (!/(.+)@(.+){2,}\.(.+){2,}/.test(user.email)) {
          return this.set("invalid", true);
        }

        var users = this.users;

        if (users.findBy("email", user.email)) {
          return this.set("invalid", true);
        }

        this.set("invalid", false);
        users.pushObject(user);
        this.updateField();
        this.set("inviteEmail", "");
        (0, _runloop.schedule)("afterRender", function () {
          return _this.element.querySelector(".invite-email").focus();
        });
      },
      removeUser: function removeUser(user) {
        this.users.removeObject(user);
        this.updateField();
      }
    }
  });

  _exports.default = _default;
});
define("wizard/components/radio-button", ["exports", "discourse-common/utils/decorators", "@ember/component", "@ember/runloop"], function (_exports, _decorators, _component, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_dec = (0, _decorators.observes)("value"), _dec2 = (0, _decorators.on)("init"), (_obj = {
    tagName: "label",
    click: function click(e) {
      e.preventDefault();
      this.onChange(this.radioValue);
    },
    updateVal: function updateVal() {
      var _this = this;

      var checked = this.value === this.radioValue;
      (0, _runloop.next)(function () {
        return _this.element.querySelector("input[type=radio]").checked = checked;
      });
    }
  }, (_applyDecoratedDescriptor(_obj, "updateVal", [_dec, _dec2], Object.getOwnPropertyDescriptor(_obj, "updateVal"), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/components/staff-count", ["exports", "@ember/component", "discourse-common/utils/decorators"], function (_exports, _component, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj, _init;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_dec = (0, _decorators.default)("field.value"), (_obj = {
    showStaffCount: function showStaffCount(staffCount) {
      return staffCount > 1;
    }
  }, (_applyDecoratedDescriptor(_obj, "showStaffCount", [_dec], (_init = Object.getOwnPropertyDescriptor(_obj, "showStaffCount"), _init = _init ? _init.value : undefined, {
    enumerable: true,
    configurable: true,
    writable: true,
    initializer: function initializer() {
      return _init;
    }
  }), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/components/theme-preview", ["exports", "wizard/lib/preview", "discourse-common/utils/decorators", "I18n"], function (_exports, _preview, _decorators, _I18n) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = (0, _preview.createPreviewComponent)(305, 165, (_dec = (0, _decorators.default)("selectedId", "colorsId"), _dec2 = (0, _decorators.observes)("step.fieldsById.base_scheme_id.value"), (_obj = {
    logo: null,
    avatar: null,
    classNameBindings: ["isSelected"],
    isSelected: function isSelected(selectedId, colorsId) {
      return selectedId === colorsId;
    },
    click: function click() {
      this.onChange(this.colorsId);
    },
    themeChanged: function themeChanged() {
      this.triggerRepaint();
    },
    images: function images() {
      return {
        logo: this.wizard.getLogoUrl(),
        avatar: "/images/wizard/trout.png"
      };
    },
    paint: function paint(_ref) {
      var ctx = _ref.ctx,
          colors = _ref.colors,
          font = _ref.font,
          headingFont = _ref.headingFont,
          width = _ref.width,
          height = _ref.height;
      var headerHeight = height * 0.3;
      this.drawFullHeader(colors, headingFont, this.logo);
      var margin = width * 0.04;
      var avatarSize = height * 0.2;
      var lineHeight = height / 9.5; // Draw a fake topic

      this.scaleImage(this.avatar, margin, headerHeight + height * 0.085, avatarSize, avatarSize);
      var titleFontSize = headerHeight / 44;
      ctx.beginPath();
      ctx.fillStyle = colors.primary;
      ctx.font = "bold ".concat(titleFontSize, "em '").concat(headingFont, "'");
      ctx.fillText(_I18n.default.t("wizard.previews.topic_title"), margin, height * 0.3);
      var bodyFontSize = height / 220.0;
      ctx.font = "".concat(bodyFontSize, "em '").concat(font, "'");
      var line = 0;

      var lines = _preview.LOREM.split("\n");

      for (var i = 0; i < 4; i++) {
        line = height * 0.35 + i * lineHeight;
        ctx.fillText(lines[i], margin + avatarSize + margin, line);
      } // Share Button


      var shareButtonWidth = _I18n.default.t("wizard.previews.share_button").length * 9;
      ctx.beginPath();
      ctx.rect(margin, line + lineHeight, shareButtonWidth, height * 0.14);
      ctx.fillStyle = (0, _preview.darkLightDiff)(colors.primary, colors.secondary, 90, 65);
      ctx.fill();
      ctx.fillStyle = (0, _preview.chooseDarker)(colors.primary, colors.secondary);
      ctx.font = "".concat(bodyFontSize, "em '").concat(font, "'");
      ctx.fillText(_I18n.default.t("wizard.previews.share_button"), margin + 8, line + lineHeight * 1.85); // Reply Button

      var replyButtonWidth = _I18n.default.t("wizard.previews.reply_button").length * 9;
      ctx.beginPath();
      ctx.rect(shareButtonWidth + margin + 10, line + lineHeight, replyButtonWidth, height * 0.14);
      ctx.fillStyle = colors.tertiary;
      ctx.fill();
      ctx.fillStyle = colors.secondary;
      ctx.font = "".concat(bodyFontSize, "em '").concat(font, "'");
      ctx.fillText(_I18n.default.t("wizard.previews.reply_button"), shareButtonWidth + margin + 18, line + lineHeight * 1.85); // Draw Timeline

      var timelineX = width * 0.8;
      ctx.beginPath();
      ctx.strokeStyle = colors.tertiary;
      ctx.lineWidth = 0.5;
      ctx.moveTo(timelineX, height * 0.3);
      ctx.lineTo(timelineX, height * 0.7);
      ctx.stroke(); // Timeline

      ctx.beginPath();
      ctx.strokeStyle = colors.tertiary;
      ctx.lineWidth = 2;
      ctx.moveTo(timelineX, height * 0.3);
      ctx.lineTo(timelineX, height * 0.4);
      ctx.stroke();
      ctx.font = "Bold ".concat(bodyFontSize, "em ").concat(font);
      ctx.fillStyle = colors.primary;
      ctx.fillText("1 / 20", timelineX + margin, height * 0.3 + margin * 1.5);
    }
  }, (_applyDecoratedDescriptor(_obj, "isSelected", [_dec], Object.getOwnPropertyDescriptor(_obj, "isSelected"), _obj), _applyDecoratedDescriptor(_obj, "themeChanged", [_dec2], Object.getOwnPropertyDescriptor(_obj, "themeChanged"), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/components/theme-previews", ["exports", "@ember/component"], function (_exports, _component) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _component.default.extend({
    actions: {
      changed: function changed(value) {
        this.set("field.value", value);
      }
    }
  });

  _exports.default = _default;
});
define("wizard/components/wizard-canvas", ["exports", "@ember/component"], function (_exports, _component) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

  function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  var MAX_PARTICLES = 150;
  var SIZE = 144;
  var width, height;
  var COLORS = ["#BF1E2E", "#F1592A", "#F7941D", "#9EB83B", "#3AB54A", "#12A89D", "#25AAE2", "#0E76BD", "#652D90", "#92278F", "#ED207B", "#8C6238"];

  var Particle = /*#__PURE__*/function () {
    function Particle() {
      _classCallCheck(this, Particle);

      this.reset();
      this.y = Math.random() * (height + SIZE) - SIZE;
    }

    _createClass(Particle, [{
      key: "reset",
      value: function reset() {
        this.y = -SIZE;
        this.origX = Math.random() * (width + SIZE);
        this.speed = 1 + Math.random();
        this.ang = Math.random() * 2 * Math.PI;
        this.scale = Math.random() * 0.4 + 0.2;
        this.radius = Math.random() * 25 + 25;
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.flipped = Math.random() > 0.5 ? 1 : -1;
      }
    }, {
      key: "move",
      value: function move() {
        this.y += this.speed;

        if (this.y > height + SIZE) {
          this.reset();
        }

        this.ang += this.speed / 30.0;

        if (this.ang > 2 * Math.PI) {
          this.ang = 0;
        }

        this.x = this.origX + this.radius * Math.sin(this.ang);
      }
    }]);

    return Particle;
  }();

  var _default = _component.default.extend({
    classNames: ["wizard-canvas"],
    tagName: "canvas",
    ctx: null,
    ready: false,
    particles: null,
    didInsertElement: function didInsertElement() {
      var _this = this;

      this._super.apply(this, arguments);

      var canvas = this.element;
      this.ctx = canvas.getContext("2d");
      this.resized();
      this.particles = [];

      for (var i = 0; i < MAX_PARTICLES; i++) {
        this.particles.push(new Particle());
      }

      this.ready = true;
      this.paint();
      $(window).on("resize.wizard", function () {
        return _this.resized();
      });
    },
    willDestroyElement: function willDestroyElement() {
      this._super.apply(this, arguments);

      $(window).off("resize.wizard");
    },
    resized: function resized() {
      width = $(window).width();
      height = $(window).height();
      var canvas = this.element;
      canvas.width = width;
      canvas.height = height;
    },
    paint: function paint() {
      var _this2 = this;

      if (this.isDestroying || this.isDestroyed || !this.ready) {
        return;
      }

      var ctx = this.ctx;
      ctx.clearRect(0, 0, width, height);
      this.particles.forEach(function (particle) {
        particle.move();

        _this2.drawParticle(particle);
      });
      window.requestAnimationFrame(function () {
        return _this2.paint();
      });
    },
    drawParticle: function drawParticle(p) {
      var c = this.ctx;
      c.save();
      c.translate(p.x - SIZE, p.y - SIZE);
      c.scale(p.scale * p.flipped, p.scale);
      c.fillStyle = p.color;
      c.strokeStyle = p.color;
      c.globalAlpha = "1.0";
      c.lineWidth = "1";
      c.lineCap = "butt";
      c.lineJoin = "round";
      c.mitterLimit = "1";
      c.beginPath();
      c.moveTo(97.9, 194.9);
      c.lineTo(103.5, 162.9);
      c.bezierCurveTo(88.7, 152, 84.2, 139.7, 90.2, 126.3);
      c.bezierCurveTo(99.5, 105.6, 124.6, 89.6, 159.7, 100.4);
      c.lineTo(159.7, 100.4);
      c.bezierCurveTo(175.9, 105.4, 186.4, 111.2, 192.6, 118.5);
      c.bezierCurveTo(200, 127.2, 201.6, 138.4, 197.5, 152.7);
      c.bezierCurveTo(194, 165, 187.4, 173.6, 177.9, 178.3);
      c.bezierCurveTo(165.6, 184.4, 148.4, 183.7, 129.4, 176.3);
      c.bezierCurveTo(127.7, 175.6, 126, 174.9, 124.4, 174.2);
      c.lineTo(97.9, 194.9);
      c.closePath();
      c.moveTo(138, 99.3);
      c.bezierCurveTo(115.4, 99.3, 99.3, 111.9, 92.4, 127.3);
      c.bezierCurveTo(86.8, 139.7, 91.2, 151.2, 105.5, 161.5);
      c.lineTo(106.1, 161.9);
      c.lineTo(101.2, 189.4);
      c.lineTo(124, 171.7);
      c.lineTo(124.6, 172);
      c.bezierCurveTo(126.4, 172.8, 128.3, 173.6, 130.2, 174.3);
      c.bezierCurveTo(148.6, 181.4, 165.1, 182.2, 176.8, 176.4);
      c.bezierCurveTo(185.7, 172, 191.9, 163.9, 195.2, 152.2);
      c.bezierCurveTo(202.4, 127.2, 191.9, 112.8, 159, 102.7);
      c.lineTo(159, 102.7);
      c.bezierCurveTo(151.6, 100.3, 144.5, 99.3, 138, 99.3);
      c.closePath();
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(115.7, 136.2);
      c.bezierCurveTo(115.7, 137.9, 115, 139.3, 113.3, 139.3);
      c.bezierCurveTo(111.6, 139.3, 110.2, 137.9, 110.2, 136.2);
      c.bezierCurveTo(110.2, 134.5, 111.6, 133.1, 113.3, 133.1);
      c.bezierCurveTo(115, 133, 115.7, 134.4, 115.7, 136.2);
      c.closePath();
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(145.8, 141.6);
      c.bezierCurveTo(145.8, 143.3, 144.4, 144.1, 142.7, 144.1);
      c.bezierCurveTo(141, 144.1, 139.6, 143.4, 139.6, 141.6);
      c.bezierCurveTo(139.6, 141.6, 141, 138.5, 142.7, 138.5);
      c.bezierCurveTo(144.4, 138.5, 145.8, 139.9, 145.8, 141.6);
      c.closePath();
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(171.6, 146.8);
      c.bezierCurveTo(171.6, 148.5, 171, 149.9, 169.2, 149.9);
      c.bezierCurveTo(167.5, 149.9, 166.1, 148.5, 166.1, 146.8);
      c.bezierCurveTo(166.1, 145.1, 167.5, 143.7, 169.2, 143.7);
      c.bezierCurveTo(171, 143.6, 171.6, 145, 171.6, 146.8);
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
    }
  });

  _exports.default = _default;
});
define("wizard/components/wizard-field-checkboxes", ["exports", "@ember/component", "@ember/object"], function (_exports, _component, _object) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  var _default = _component.default.extend({
    init: function init() {
      this._super.apply(this, arguments);

      this.set("field.value", this.field.value || []);

      var _iterator = _createForOfIteratorHelper(this.field.choices),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var choice = _step.value;

          if (this.field.value.includes(choice.id)) {
            (0, _object.set)(choice, "checked", true);
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    },
    actions: {
      changed: function changed(checkbox) {
        var newFieldValue = this.field.value;
        var checkboxValue = checkbox.parentElement.getAttribute("value").toLowerCase();

        if (checkbox.checked) {
          newFieldValue.push(checkboxValue);
        } else {
          var index = newFieldValue.indexOf(checkboxValue);

          if (index > -1) {
            newFieldValue.splice(index, 1);
          }
        }

        this.set("field.value", newFieldValue);
      }
    }
  });

  _exports.default = _default;
});
define("wizard/components/wizard-field-dropdown", ["exports", "@ember/component"], function (_exports, _component) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _component.default.extend({
    keyPress: function keyPress(e) {
      e.stopPropagation();
    }
  });

  _exports.default = _default;
});
define("wizard/components/wizard-field-image", ["exports", "@ember/component", "I18n", "@ember/string", "discourse-common/utils/decorators", "discourse-common/lib/get-owner", "wizard/lib/ajax", "discourse-common/lib/get-url"], function (_exports, _component, _I18n, _string, _decorators, _getOwner, _ajax, _getUrl) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_dec = (0, _decorators.default)("field.id"), (_obj = {
    classNames: ["wizard-image-row"],
    uploading: false,
    previewComponent: function previewComponent(id) {
      var componentName = "image-preview-".concat((0, _string.dasherize)(id));
      var exists = (0, _getOwner.getOwner)(this).lookup("component:".concat(componentName));
      return exists ? componentName : "wizard-image-preview";
    },
    didInsertElement: function didInsertElement() {
      var _this = this;

      this._super.apply(this, arguments);

      var $upload = $(this.element);
      var id = this.get("field.id");
      $upload.fileupload({
        url: (0, _getUrl.default)("/uploads.json"),
        formData: {
          synchronous: true,
          type: "wizard_".concat(id),
          authenticity_token: (0, _ajax.getToken)()
        },
        dataType: "json",
        dropZone: $upload
      });
      $upload.on("fileuploadsubmit", function () {
        return _this.set("uploading", true);
      });
      $upload.on("fileuploaddone", function (e, response) {
        _this.set("field.value", response.result.url);

        _this.set("uploading", false);
      });
      $upload.on("fileuploadfail", function (e, response) {
        var message = _I18n.default.t("wizard.upload_error");

        if (response.jqXHR.responseJSON && response.jqXHR.responseJSON.errors) {
          message = response.jqXHR.responseJSON.errors.join("\n");
        }

        window.bootbox.alert(message);

        _this.set("uploading", false);
      });
    }
  }, (_applyDecoratedDescriptor(_obj, "previewComponent", [_dec], Object.getOwnPropertyDescriptor(_obj, "previewComponent"), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/components/wizard-field-radio", ["exports", "@ember/component"], function (_exports, _component) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _component.default.extend({
    actions: {
      changed: function changed(value) {
        this.set("field.value", value);
      }
    }
  });

  _exports.default = _default;
});
define("wizard/components/wizard-field-textarea", ["exports", "@ember/component"], function (_exports, _component) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _component.default.extend({
    keyPress: function keyPress(e) {
      e.stopPropagation();
    }
  });

  _exports.default = _default;
});
define("wizard/components/wizard-field", ["exports", "@ember/component", "@ember/string", "discourse-common/utils/decorators"], function (_exports, _component, _string, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _dec3, _obj, _init, _init2;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_dec = (0, _decorators.default)("field.type"), _dec2 = (0, _decorators.default)("field.id"), _dec3 = (0, _decorators.default)("field.type", "field.id"), (_obj = {
    classNameBindings: [":wizard-field", "typeClass", "field.invalid"],
    typeClass: function typeClass(type) {
      return "".concat((0, _string.dasherize)(type), "-field");
    },
    fieldClass: function fieldClass(id) {
      return "field-".concat((0, _string.dasherize)(id), " wizard-focusable");
    },
    inputComponentName: function inputComponentName(type, id) {
      return type === "component" ? (0, _string.dasherize)(id) : "wizard-field-".concat(type);
    }
  }, (_applyDecoratedDescriptor(_obj, "typeClass", [_dec], (_init = Object.getOwnPropertyDescriptor(_obj, "typeClass"), _init = _init ? _init.value : undefined, {
    enumerable: true,
    configurable: true,
    writable: true,
    initializer: function initializer() {
      return _init;
    }
  }), _obj), _applyDecoratedDescriptor(_obj, "fieldClass", [_dec2], (_init2 = Object.getOwnPropertyDescriptor(_obj, "fieldClass"), _init2 = _init2 ? _init2.value : undefined, {
    enumerable: true,
    configurable: true,
    writable: true,
    initializer: function initializer() {
      return _init2;
    }
  }), _obj), _applyDecoratedDescriptor(_obj, "inputComponentName", [_dec3], Object.getOwnPropertyDescriptor(_obj, "inputComponentName"), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/components/wizard-image-preview", ["exports", "@ember/component"], function (_exports, _component) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _component.default.extend({
    classNameBindings: [":wizard-image-preview", "fieldClass"]
  });

  _exports.default = _default;
});
define("wizard/components/wizard-step-form", ["exports", "@ember/component", "discourse-common/utils/decorators"], function (_exports, _component, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj, _init;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_dec = (0, _decorators.default)("step.id"), (_obj = {
    classNameBindings: [":wizard-step-form", "customStepClass"],
    customStepClass: function customStepClass(stepId) {
      return "wizard-step-".concat(stepId);
    }
  }, (_applyDecoratedDescriptor(_obj, "customStepClass", [_dec], (_init = Object.getOwnPropertyDescriptor(_obj, "customStepClass"), _init = _init ? _init.value : undefined, {
    enumerable: true,
    configurable: true,
    writable: true,
    initializer: function initializer() {
      return _init;
    }
  }), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/components/wizard-step", ["exports", "discourse-common/utils/decorators", "@ember/component", "I18n", "discourse-common/lib/get-url", "@ember/template", "@ember/runloop"], function (_exports, _decorators, _component, _I18n, _getUrl, _template, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _obj, _init, _init2, _init3, _init4, _init5;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  jQuery.fn.wiggle = function (times, duration) {
    var _this = this;

    if (times > 0) {
      this.animate({
        marginLeft: times-- % 2 === 0 ? -15 : 15
      }, duration, 0, function () {
        return _this.wiggle(times, duration);
      });
    } else {
      this.animate({
        marginLeft: 0
      }, duration, 0);
    }

    return this;
  };

  var alreadyWarned = {};

  var _default = _component.default.extend((_dec = (0, _decorators.default)("step.index"), _dec2 = (0, _decorators.default)("step.displayIndex", "wizard.totalSteps"), _dec3 = (0, _decorators.default)("step.displayIndex", "wizard.totalSteps"), _dec4 = (0, _decorators.default)("step.index", "step.displayIndex", "wizard.totalSteps", "wizard.completed"), _dec5 = (0, _decorators.default)("step.index"), _dec6 = (0, _decorators.default)("step.banner"), _dec7 = (0, _decorators.default)("step.id"), _dec8 = (0, _decorators.observes)("step.id"), _dec9 = (0, _decorators.default)("step.index", "wizard.totalSteps"), (_obj = {
    classNames: ["wizard-step"],
    saving: null,
    didInsertElement: function didInsertElement() {
      this._super.apply(this, arguments);

      this.autoFocus();
    },
    showQuitButton: function showQuitButton(index) {
      return index === 0;
    },
    showNextButton: function showNextButton(current, total) {
      return current < total;
    },
    showDoneButton: function showDoneButton(current, total) {
      return current === total;
    },
    showFinishButton: function showFinishButton(index, displayIndex, total, completed) {
      return index !== 0 && displayIndex !== total && completed;
    },
    showBackButton: function showBackButton(index) {
      return index > 0;
    },
    bannerImage: function bannerImage(src) {
      if (!src) {
        return;
      }

      return (0, _getUrl.default)("/images/wizard/".concat(src));
    },
    bannerAndDescriptionClass: function bannerAndDescriptionClass(id) {
      return "wizard-banner-and-description wizard-banner-and-description-".concat(id);
    },
    _stepChanged: function _stepChanged() {
      this.set("saving", false);
      this.autoFocus();
    },
    keyPress: function keyPress(key) {
      if (key.keyCode === 13) {
        if (this.showDoneButton) {
          this.send("quit");
        } else {
          this.send("nextStep");
        }
      }
    },
    barStyle: function barStyle(displayIndex, totalSteps) {
      var ratio = parseFloat(displayIndex) / parseFloat(totalSteps - 1);

      if (ratio < 0) {
        ratio = 0;
      }

      if (ratio > 1) {
        ratio = 1;
      }

      return (0, _template.htmlSafe)("width: ".concat(ratio * 200, "px"));
    },
    autoFocus: function autoFocus() {
      (0, _runloop.schedule)("afterRender", function () {
        var $invalid = $(".wizard-field.invalid:nth-of-type(1) .wizard-focusable");

        if ($invalid.length) {
          return $invalid.focus();
        }

        $(".wizard-focusable:nth-of-type(1)").focus();
      });
    },
    animateInvalidFields: function animateInvalidFields() {
      (0, _runloop.schedule)("afterRender", function () {
        return $(".invalid input[type=text], .invalid textarea").wiggle(2, 100);
      });
    },
    advance: function advance() {
      var _this2 = this;

      this.set("saving", true);
      this.step.save().then(function (response) {
        return _this2.goNext(response);
      }).catch(function () {
        return _this2.animateInvalidFields();
      }).finally(function () {
        return _this2.set("saving", false);
      });
    },
    actions: {
      quit: function quit() {
        document.location = (0, _getUrl.default)("/");
      },
      exitEarly: function exitEarly() {
        var _this3 = this;

        var step = this.step;
        step.validate();

        if (step.get("valid")) {
          this.set("saving", true);
          step.save().then(function () {
            return _this3.send("quit");
          }).catch(function () {
            return _this3.animateInvalidFields();
          }).finally(function () {
            return _this3.set("saving", false);
          });
        } else {
          this.animateInvalidFields();
          this.autoFocus();
        }
      },
      backStep: function backStep() {
        if (this.saving) {
          return;
        }

        this.goBack();
      },
      nextStep: function nextStep() {
        var _this4 = this;

        if (this.saving) {
          return;
        }

        var step = this.step;
        var result = step.validate();

        if (result.warnings.length) {
          var unwarned = result.warnings.filter(function (w) {
            return !alreadyWarned[w];
          });

          if (unwarned.length) {
            unwarned.forEach(function (w) {
              return alreadyWarned[w] = true;
            });
            return window.bootbox.confirm(unwarned.map(function (w) {
              return _I18n.default.t("wizard.".concat(w));
            }).join("\n"), _I18n.default.t("no_value"), _I18n.default.t("yes_value"), function (confirmed) {
              if (confirmed) {
                _this4.advance();
              }
            });
          }
        }

        if (step.get("valid")) {
          this.advance();
        } else {
          this.animateInvalidFields();
          this.autoFocus();
        }
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "showQuitButton", [_dec], (_init = Object.getOwnPropertyDescriptor(_obj, "showQuitButton"), _init = _init ? _init.value : undefined, {
    enumerable: true,
    configurable: true,
    writable: true,
    initializer: function initializer() {
      return _init;
    }
  }), _obj), _applyDecoratedDescriptor(_obj, "showNextButton", [_dec2], (_init2 = Object.getOwnPropertyDescriptor(_obj, "showNextButton"), _init2 = _init2 ? _init2.value : undefined, {
    enumerable: true,
    configurable: true,
    writable: true,
    initializer: function initializer() {
      return _init2;
    }
  }), _obj), _applyDecoratedDescriptor(_obj, "showDoneButton", [_dec3], (_init3 = Object.getOwnPropertyDescriptor(_obj, "showDoneButton"), _init3 = _init3 ? _init3.value : undefined, {
    enumerable: true,
    configurable: true,
    writable: true,
    initializer: function initializer() {
      return _init3;
    }
  }), _obj), _applyDecoratedDescriptor(_obj, "showFinishButton", [_dec4], (_init4 = Object.getOwnPropertyDescriptor(_obj, "showFinishButton"), _init4 = _init4 ? _init4.value : undefined, {
    enumerable: true,
    configurable: true,
    writable: true,
    initializer: function initializer() {
      return _init4;
    }
  }), _obj), _applyDecoratedDescriptor(_obj, "showBackButton", [_dec5], (_init5 = Object.getOwnPropertyDescriptor(_obj, "showBackButton"), _init5 = _init5 ? _init5.value : undefined, {
    enumerable: true,
    configurable: true,
    writable: true,
    initializer: function initializer() {
      return _init5;
    }
  }), _obj), _applyDecoratedDescriptor(_obj, "bannerImage", [_dec6], Object.getOwnPropertyDescriptor(_obj, "bannerImage"), _obj), _applyDecoratedDescriptor(_obj, "bannerAndDescriptionClass", [_dec7], Object.getOwnPropertyDescriptor(_obj, "bannerAndDescriptionClass"), _obj), _applyDecoratedDescriptor(_obj, "_stepChanged", [_dec8], Object.getOwnPropertyDescriptor(_obj, "_stepChanged"), _obj), _applyDecoratedDescriptor(_obj, "barStyle", [_dec9], Object.getOwnPropertyDescriptor(_obj, "barStyle"), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/models/step", ["exports", "@ember/object", "wizard/mixins/valid-state", "wizard/lib/ajax", "discourse-common/utils/decorators"], function (_exports, _object, _validState, _ajax, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _obj, _init;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _object.default.extend(_validState.default, (_dec = (0, _decorators.default)("index"), _dec2 = (0, _decorators.default)("fields.[]"), (_obj = {
    id: null,
    displayIndex: function displayIndex(index) {
      return index + 1;
    },
    fieldsById: function fieldsById(fields) {
      var lookup = {};
      fields.forEach(function (field) {
        return lookup[field.get("id")] = field;
      });
      return lookup;
    },
    validate: function validate() {
      var allValid = true;
      var result = {
        warnings: []
      };
      this.fields.forEach(function (field) {
        allValid = allValid && field.check();
        var warning = field.get("warning");

        if (warning) {
          result.warnings.push(warning);
        }
      });
      this.setValid(allValid);
      return result;
    },
    fieldError: function fieldError(id, description) {
      var field = this.fields.findBy("id", id);

      if (field) {
        field.setValid(false, description);
      }
    },
    save: function save() {
      var _this = this;

      var fields = {};
      this.fields.forEach(function (f) {
        return fields[f.id] = f.value;
      });
      return (0, _ajax.ajax)({
        url: "/wizard/steps/".concat(this.id),
        type: "PUT",
        data: {
          fields: fields
        }
      }).catch(function (response) {
        response.responseJSON.errors.forEach(function (err) {
          return _this.fieldError(err.field, err.description);
        });
        throw new Error(response);
      });
    }
  }, (_applyDecoratedDescriptor(_obj, "displayIndex", [_dec], (_init = Object.getOwnPropertyDescriptor(_obj, "displayIndex"), _init = _init ? _init.value : undefined, {
    enumerable: true,
    configurable: true,
    writable: true,
    initializer: function initializer() {
      return _init;
    }
  }), _obj), _applyDecoratedDescriptor(_obj, "fieldsById", [_dec2], Object.getOwnPropertyDescriptor(_obj, "fieldsById"), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/models/wizard-field", ["exports", "@ember/object", "wizard/mixins/valid-state"], function (_exports, _object, _validState) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _object.default.extend(_validState.default, {
    id: null,
    type: null,
    value: null,
    required: null,
    warning: null,
    check: function check() {
      if (!this.required) {
        this.setValid(true);
        return true;
      }

      var val = this.value;
      var valid = val && val.length > 0;
      this.setValid(valid);
      return valid;
    }
  });

  _exports.default = _default;
});
define("wizard/models/wizard", ["exports", "@ember/object", "wizard/models/step", "wizard/models/wizard-field", "wizard/lib/ajax", "discourse-common/utils/decorators"], function (_exports, _object, _step, _wizardField, _ajax, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.findWizard = findWizard;

  var _dec, _obj, _init;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var Wizard = _object.default.extend((_dec = (0, _decorators.default)("steps.length"), (_obj = {
    totalSteps: function totalSteps(length) {
      return length;
    },
    getTitle: function getTitle() {
      var titleStep = this.steps.findBy("id", "forum-title");

      if (!titleStep) {
        return;
      }

      return titleStep.get("fieldsById.title.value");
    },
    getLogoUrl: function getLogoUrl() {
      var logoStep = this.steps.findBy("id", "logos");

      if (!logoStep) {
        return;
      }

      return logoStep.get("fieldsById.logo.value");
    },
    // A bit clunky, but get the current colors from the appropriate step
    getCurrentColors: function getCurrentColors(schemeId) {
      var colorStep = this.steps.findBy("id", "colors");

      if (!colorStep) {
        return this.current_color_scheme;
      }

      var themeChoice = colorStep.get("fieldsById.theme_previews");

      if (!themeChoice) {
        return;
      }

      var themeId = schemeId ? schemeId : themeChoice.get("value");

      if (!themeId) {
        return;
      }

      var choices = themeChoice.get("choices");

      if (!choices) {
        return;
      }

      var option = choices.findBy("id", themeId);

      if (!option) {
        return;
      }

      return option.data.colors;
    },
    getCurrentFont: function getCurrentFont(fontId) {
      var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "body_font";
      var fontsStep = this.steps.findBy("id", "fonts");

      if (!fontsStep) {
        return;
      }

      var fontChoice = fontsStep.get("fieldsById.".concat(type));

      if (!fontChoice) {
        return;
      }

      var choiceId = fontId ? fontId : fontChoice.get("value");

      if (!choiceId) {
        return;
      }

      var choices = fontChoice.get("choices");

      if (!choices) {
        return;
      }

      var option = choices.findBy("id", choiceId);

      if (!option) {
        return;
      }

      return option.label;
    }
  }, (_applyDecoratedDescriptor(_obj, "totalSteps", [_dec], (_init = Object.getOwnPropertyDescriptor(_obj, "totalSteps"), _init = _init ? _init.value : undefined, {
    enumerable: true,
    configurable: true,
    writable: true,
    initializer: function initializer() {
      return _init;
    }
  }), _obj)), _obj)));

  function findWizard() {
    return (0, _ajax.ajax)({
      url: "/wizard.json"
    }).then(function (response) {
      var wizard = response.wizard;
      wizard.steps = wizard.steps.map(function (step) {
        var stepObj = _step.default.create(step);

        stepObj.fields = stepObj.fields.map(function (f) {
          return _wizardField.default.create(f);
        });
        return stepObj;
      });
      return Wizard.create(wizard);
    });
  }
});
define("wizard/routes/application", ["exports", "@ember/routing/route", "wizard/models/wizard"], function (_exports, _route, _wizard) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _route.default.extend({
    model: function model() {
      return (0, _wizard.findWizard)();
    },
    actions: {
      refresh: function refresh() {
        this.refresh();
      }
    }
  });

  _exports.default = _default;
});
define("wizard/routes/index", ["exports", "@ember/routing/route"], function (_exports, _route) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _route.default.extend({
    beforeModel: function beforeModel() {
      var appModel = this.modelFor("application");
      this.replaceWith("step", appModel.start);
    }
  });

  _exports.default = _default;
});
define("wizard/routes/step", ["exports", "@ember/routing/route"], function (_exports, _route) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _route.default.extend({
    model: function model(params) {
      var allSteps = this.modelFor("application").steps;
      var step = allSteps.findBy("id", params.step_id);
      return step ? step : allSteps[0];
    },
    setupController: function setupController(controller, step) {
      this.controllerFor("application").set("currentStepId", step.get("id"));
      controller.setProperties({
        step: step,
        wizard: this.modelFor("application")
      });
    }
  });

  _exports.default = _default;
});
define("wizard/controllers/application", ["exports", "@ember/controller", "@ember/string", "discourse-common/utils/decorators"], function (_exports, _controller, _string, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _controller.default.extend((_dec = (0, _decorators.default)("currentStepId"), _dec2 = (0, _decorators.default)("model"), (_obj = {
    currentStepId: null,
    showCanvas: function showCanvas(currentStepId) {
      return currentStepId === "finished";
    },
    fontClasses: function fontClasses(model) {
      var fontsStep = model.steps.findBy("id", "fonts");

      if (!fontsStep) {
        return [];
      }

      var fontField = fontsStep.get("fieldsById.body_font");
      return fontField.choices.map(function (choice) {
        return "body-font-".concat((0, _string.dasherize)(choice.id));
      });
    }
  }, (_applyDecoratedDescriptor(_obj, "showCanvas", [_dec], Object.getOwnPropertyDescriptor(_obj, "showCanvas"), _obj), _applyDecoratedDescriptor(_obj, "fontClasses", [_dec2], Object.getOwnPropertyDescriptor(_obj, "fontClasses"), _obj)), _obj)));

  _exports.default = _default;
});
define("wizard/controllers/step", ["exports", "@ember/controller"], function (_exports, _controller) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _controller.default.extend({
    wizard: null,
    step: null,
    actions: {
      goNext: function goNext(response) {
        var next = this.get("step.next");

        if (response.refresh_required) {
          this.send("refresh");
        }

        this.transitionToRoute("step", next);
      },
      goBack: function goBack() {
        this.transitionToRoute("step", this.get("step.previous"));
      }
    }
  });

  _exports.default = _default;
});
define("wizard/lib/ajax", ["exports", "rsvp", "discourse-common/lib/get-url", "jquery", "@ember/runloop"], function (_exports, _rsvp, _getUrl, _jquery, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.getToken = getToken;
  _exports.ajax = ajax;
  var token;

  function getToken() {
    if (!token) {
      token = $('meta[name="csrf-token"]').attr("content");
    }

    return token;
  }

  function ajax(args) {
    return new _rsvp.Promise(function (resolve, reject) {
      args.headers = {
        "X-CSRF-Token": getToken()
      };

      args.success = function (data) {
        return (0, _runloop.run)(null, resolve, data);
      };

      args.error = function (xhr) {
        return (0, _runloop.run)(null, reject, xhr);
      };

      args.url = (0, _getUrl.default)(args.url);

      _jquery.default.ajax(args);
    });
  }
});
define("wizard/lib/preview", ["exports", "@ember/component", "rsvp", "discourse-common/lib/get-url", "@ember/runloop"], function (_exports, _component, _rsvp, _getUrl, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.createPreviewComponent = createPreviewComponent;
  _exports.parseColor = parseColor;
  _exports.brightness = brightness;
  _exports.lighten = lighten;
  _exports.chooseBrighter = chooseBrighter;
  _exports.chooseDarker = chooseDarker;
  _exports.darkLightDiff = darkLightDiff;
  _exports.drawHeader = drawHeader;
  _exports.LOREM = void 0;

  /*eslint no-bitwise:0 */
  var LOREM = "\nLorem ipsum dolor sit amet,\nconsectetur adipiscing elit.\nNullam eget sem non elit\ntincidunt rhoncus. Fusce\nvelit nisl, porttitor sed\nnisl ac, consectetur interdum\nmetus. Fusce in consequat\naugue, vel facilisis felis.";
  _exports.LOREM = LOREM;
  var scaled = {};

  function canvasFor(image, w, h) {
    w = Math.ceil(w);
    h = Math.ceil(h);
    var scale = window.devicePixelRatio;
    var can = document.createElement("canvas");
    can.width = w * scale;
    can.height = h * scale;
    var ctx = can.getContext("2d");
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0, w, h);
    return can;
  }

  function createPreviewComponent(width, height, obj) {
    var scale = window.devicePixelRatio;
    return _component.default.extend({
      layoutName: "components/theme-preview",
      width: width,
      height: height,
      elementWidth: width * scale,
      elementHeight: height * scale,
      canvasStyle: "width:".concat(width, "px;height:").concat(height, "px"),
      ctx: null,
      loaded: false,
      didInsertElement: function didInsertElement() {
        this._super.apply(this, arguments);

        var c = this.element.querySelector("canvas");
        this.ctx = c.getContext("2d");
        this.ctx.scale(scale, scale);
        this.reload();
      },
      images: function images() {},
      loadFonts: function loadFonts() {
        return document.fonts.ready;
      },
      loadImages: function loadImages() {
        var _this = this;

        var images = this.images();

        if (images) {
          return _rsvp.Promise.all(Object.keys(images).map(function (id) {
            return loadImage(images[id]).then(function (img) {
              return _this[id] = img;
            });
          }));
        }

        return _rsvp.Promise.resolve();
      },
      reload: function reload() {
        var _this2 = this;

        _rsvp.Promise.all([this.loadFonts(), this.loadImages()]).then(function () {
          _this2.loaded = true;

          _this2.triggerRepaint();
        });
      },
      triggerRepaint: function triggerRepaint() {
        (0, _runloop.scheduleOnce)("afterRender", this, "repaint");
      },
      repaint: function repaint() {
        if (!this.loaded) {
          return false;
        }

        var colors = this.wizard.getCurrentColors(this.colorsId);

        if (!colors) {
          return;
        }

        var font = this.wizard.getCurrentFont(this.fontId);
        var headingFont = this.wizard.getCurrentFont(this.fontId, "heading_font");

        if (!font) {
          return;
        }

        var ctx = this.ctx;
        ctx.fillStyle = colors.secondary;
        ctx.fillRect(0, 0, width, height);
        var options = {
          ctx: ctx,
          colors: colors,
          font: font,
          headingFont: headingFont,
          width: this.width,
          height: this.height
        };
        this.paint(options); // draw border

        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
        ctx.rect(0, 0, width, height);
        ctx.stroke();
      },
      categories: function categories() {
        return [{
          name: "consecteteur",
          color: "#652D90"
        }, {
          name: "ultrices",
          color: "#3AB54A"
        }, {
          name: "placerat",
          color: "#25AAE2"
        }];
      },
      scaleImage: function scaleImage(image, x, y, w, h) {
        w = Math.floor(w);
        h = Math.floor(h);
        var ctx = this.ctx;
        var key = "".concat(image.src, "-").concat(w, "-").concat(h);

        if (!scaled[key]) {
          var copy = image;
          var ratio = copy.width / copy.height;
          var newH = copy.height * 0.5;

          while (newH > h) {
            copy = canvasFor(copy, ratio * newH, newH);
            newH = newH * 0.5;
          }

          scaled[key] = copy;
        }

        ctx.drawImage(scaled[key], x, y, w, h);
      },
      drawFullHeader: function drawFullHeader(colors, font, logo) {
        var ctx = this.ctx;
        var headerHeight = height * 0.15;
        drawHeader(ctx, colors, width, headerHeight);
        var avatarSize = height * 0.1;
        var headerMargin = headerHeight * 0.2;

        if (logo) {
          var logoHeight = headerHeight - headerMargin * 2;
          var ratio = logoHeight / logo.height;
          this.scaleImage(logo, headerMargin, headerMargin, logo.width * ratio, logoHeight);
          this.scaleImage(logo, width, headerMargin);
        } // Top right menu


        this.scaleImage(this.avatar, width - avatarSize - headerMargin, headerMargin, avatarSize, avatarSize);
        ctx.fillStyle = darkLightDiff(colors.primary, colors.secondary, 45, 55);
        var pathScale = headerHeight / 1200; // search icon SVG path

        var searchIcon = new Path2D("M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z"); // hamburger icon

        var hamburgerIcon = new Path2D("M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z");
        ctx.save(); // Save the previous state for translation and scale

        ctx.translate(width - avatarSize * 3 - headerMargin * 0.5, avatarSize / 2); // need to scale paths otherwise they're too large

        ctx.scale(pathScale, pathScale);
        ctx.fill(searchIcon);
        ctx.restore();
        ctx.save();
        ctx.translate(width - avatarSize * 2 - headerMargin * 0.5, avatarSize / 2);
        ctx.scale(pathScale, pathScale);
        ctx.fill(hamburgerIcon);
        ctx.restore();
      },
      drawPills: function drawPills(colors, font, headerHeight, opts) {
        opts = opts || {};
        var ctx = this.ctx;
        var categoriesSize = headerHeight * 2;
        var badgeHeight = categoriesSize * 0.25;
        var headerMargin = headerHeight * 0.2;
        ctx.beginPath();
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 0.5;
        ctx.rect(headerMargin, headerHeight + headerMargin, categoriesSize, badgeHeight);
        ctx.stroke();
        var fontSize = Math.round(badgeHeight * 0.5);
        ctx.font = "".concat(fontSize, "px '").concat(font, "'");
        ctx.fillStyle = colors.primary;
        ctx.fillText("all categories", headerMargin * 1.5, headerHeight + headerMargin * 1.4 + fontSize);
        var pathScale = badgeHeight / 1000; // caret icon

        var caretIcon = new Path2D("M0 384.662V127.338c0-17.818 21.543-26.741 34.142-14.142l128.662 128.662c7.81 7.81 7.81 20.474 0 28.284L34.142 398.804C21.543 411.404 0 402.48 0 384.662z");
        ctx.save();
        ctx.translate(categoriesSize - headerMargin / 4, headerHeight + headerMargin + badgeHeight / 4);
        ctx.scale(pathScale, pathScale);
        ctx.fill(caretIcon);
        ctx.restore();
        var text = opts.categories ? "Categories" : "Latest";
        var activeWidth = categoriesSize * (opts.categories ? 0.8 : 0.55);
        ctx.beginPath();
        ctx.fillStyle = colors.quaternary;
        ctx.rect(headerMargin * 2 + categoriesSize, headerHeight + headerMargin, activeWidth, badgeHeight);
        ctx.fill();
        ctx.font = "".concat(fontSize, "px '").concat(font, "'");
        ctx.fillStyle = colors.secondary;
        var x = headerMargin * 3.0 + categoriesSize;
        ctx.fillText(text, x - headerMargin * 0.1, headerHeight + headerMargin * 1.5 + fontSize);
        ctx.fillStyle = colors.primary;
        x += categoriesSize * (opts.categories ? 0.8 : 0.6);
        ctx.fillText("New", x, headerHeight + headerMargin * 1.5 + fontSize);
        x += categoriesSize * 0.4;
        ctx.fillText("Unread", x, headerHeight + headerMargin * 1.5 + fontSize);
        x += categoriesSize * 0.6;
        ctx.fillText("Top", x, headerHeight + headerMargin * 1.5 + fontSize);
      }
    }, obj);
  }

  function loadImage(src) {
    if (!src) {
      return _rsvp.Promise.resolve();
    }

    var img = new Image();
    img.src = (0, _getUrl.default)(src);
    return new _rsvp.Promise(function (resolve) {
      return img.onload = function () {
        return resolve(img);
      };
    });
  }

  function parseColor(color) {
    var m = color.match(/^#([0-9a-f]{6})$/i);

    if (m) {
      var c = m[1];
      return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)];
    }

    return [0, 0, 0];
  }

  function brightness(color) {
    return color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114;
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    var h,
        s,
        l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;

        case g:
          h = (b - r) / d + 2;
          break;

        case b:
          h = (r - g) / d + 4;
          break;
      }

      h /= 6;
    }

    return [h, s, l];
  }

  function hue2rgb(p, q, t) {
    if (t < 0) {
      t += 1;
    }

    if (t > 1) {
      t -= 1;
    }

    if (t < 1 / 6) {
      return p + (q - p) * 6 * t;
    }

    if (t < 1 / 2) {
      return q;
    }

    if (t < 2 / 3) {
      return p + (q - p) * (2 / 3 - t) * 6;
    }

    return p;
  }

  function hslToRgb(h, s, l) {
    var r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [r * 255, g * 255, b * 255];
  }

  function lighten(color, percent) {
    var hsl = rgbToHsl(color[0], color[1], color[2]);
    var scale = percent / 100.0;
    var diff = scale > 0 ? 1.0 - hsl[2] : hsl[2];
    hsl[2] = hsl[2] + diff * scale;
    color = hslToRgb(hsl[0], hsl[1], hsl[2]);
    return "#" + (0 | (1 << 8) + color[0]).toString(16).substr(1) + (0 | (1 << 8) + color[1]).toString(16).substr(1) + (0 | (1 << 8) + color[2]).toString(16).substr(1);
  }

  function chooseBrighter(primary, secondary) {
    var primaryCol = parseColor(primary);
    var secondaryCol = parseColor(secondary);
    return brightness(primaryCol) < brightness(secondaryCol) ? secondary : primary;
  }

  function chooseDarker(primary, secondary) {
    if (chooseBrighter(primary, secondary) === primary) {
      return secondary;
    } else {
      return primary;
    }
  }

  function darkLightDiff(adjusted, comparison, lightness, darkness) {
    var adjustedCol = parseColor(adjusted);
    var comparisonCol = parseColor(comparison);
    return lighten(adjustedCol, brightness(adjustedCol) < brightness(comparisonCol) ? lightness : darkness);
  }

  function drawHeader(ctx, colors, width, headerHeight) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, headerHeight);
    ctx.fillStyle = colors.header_background;
    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.restore();
  }
});
define("wizard/mixins/valid-state", ["exports", "discourse-common/utils/decorators"], function (_exports, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _exports.States = void 0;

  var _dec, _dec2, _dec3, _obj, _init, _init2, _init3;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var States = {
    UNCHECKED: 0,
    INVALID: 1,
    VALID: 2
  };
  _exports.States = States;

  var _default = (_dec = (0, _decorators.default)("_validState"), _dec2 = (0, _decorators.default)("_validState"), _dec3 = (0, _decorators.default)("_validState"), (_obj = {
    _validState: null,
    errorDescription: null,
    init: function init() {
      this._super.apply(this, arguments);

      this.set("_validState", States.UNCHECKED);
    },
    valid: function valid(state) {
      return state === States.VALID;
    },
    invalid: function invalid(state) {
      return state === States.INVALID;
    },
    unchecked: function unchecked(state) {
      return state === States.UNCHECKED;
    },
    setValid: function setValid(valid, description) {
      this.set("_validState", valid ? States.VALID : States.INVALID);

      if (!valid && description && description.length) {
        this.set("errorDescription", description);
      } else {
        this.set("errorDescription", null);
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "valid", [_dec], (_init = Object.getOwnPropertyDescriptor(_obj, "valid"), _init = _init ? _init.value : undefined, {
    enumerable: true,
    configurable: true,
    writable: true,
    initializer: function initializer() {
      return _init;
    }
  }), _obj), _applyDecoratedDescriptor(_obj, "invalid", [_dec2], (_init2 = Object.getOwnPropertyDescriptor(_obj, "invalid"), _init2 = _init2 ? _init2.value : undefined, {
    enumerable: true,
    configurable: true,
    writable: true,
    initializer: function initializer() {
      return _init2;
    }
  }), _obj), _applyDecoratedDescriptor(_obj, "unchecked", [_dec3], (_init3 = Object.getOwnPropertyDescriptor(_obj, "unchecked"), _init3 = _init3 ? _init3.value : undefined, {
    enumerable: true,
    configurable: true,
    writable: true,
    initializer: function initializer() {
      return _init3;
    }
  }), _obj)), _obj));

  _exports.default = _default;
});
define("wizard/initializers/load-helpers", ["exports", "discourse-common/lib/helpers"], function (_exports, _helpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    name: "load-helpers",
    initialize: function initialize(application) {
      Object.keys(requirejs.entries).forEach(function (entry) {
        if (/\/helpers\//.test(entry)) {
          requirejs(entry, null, null, true);
        }
      });
      (0, _helpers.registerHelpers)(application);
    }
  };
  _exports.default = _default;
});













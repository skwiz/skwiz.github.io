define("discourse/plugins/discourse-cakeday/discourse/adapters/anniversary", ["exports", "discourse/plugins/discourse-cakeday/discourse/adapters/cakeday"], function (_exports, _cakeday) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = _cakeday.default;
  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/adapters/birthday", ["exports", "discourse/plugins/discourse-cakeday/discourse/adapters/cakeday"], function (_exports, _cakeday) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = _cakeday.default;
  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/adapters/cakeday", ["exports", "discourse/adapters/rest"], function (_exports, _rest) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _rest.default.extend({
    basePath: function basePath() {
      return "/cakeday/";
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/components/emoji-images", ["exports", "discourse-common/utils/decorators", "discourse/lib/text", "I18n"], function (_exports, _decorators, _text, _I18n) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Component.extend((_dec = (0, _decorators.default)("list"), _dec2 = (0, _decorators.default)("title"), (_obj = {
    classNames: ["emoji-images"],
    emojiHTML: function emojiHTML(list) {
      return list.split("|").map(function (et) {
        return (0, _text.emojiUnescape)(":".concat(et, ":"), {
          skipTitle: true
        });
      });
    },
    titleText: function titleText(title) {
      return _I18n.default.t(title);
    }
  }, (_applyDecoratedDescriptor(_obj, "emojiHTML", [_dec], Object.getOwnPropertyDescriptor(_obj, "emojiHTML"), _obj), _applyDecoratedDescriptor(_obj, "titleText", [_dec2], Object.getOwnPropertyDescriptor(_obj, "titleText"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/connectors/user-card-post-names/user-card-cakeday", ["exports", "discourse/plugins/discourse-cakeday/discourse/lib/cakeday"], function (_exports, _cakeday) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    setupComponent: function setupComponent(args, component) {
      component.set("isCakeday", (0, _cakeday.cakeday)(args.user.get("created_at")));
      component.set("isUserBirthday", (0, _cakeday.cakedayBirthday)(args.user.get("date_of_birth")));
      component.set("cakedayTitle", (0, _cakeday.cakedayTitle)(args.user, this.currentUser));
      component.set("cakedayBirthdayTitle", (0, _cakeday.cakedayBirthdayTitle)(args.user, this.currentUser));
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/connectors/user-custom-preferences/user-date-of-birth-input", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    setupComponent: function setupComponent(args, component) {
      var months = moment.months().map(function (month, index) {
        return {
          name: month,
          value: index + 1
        };
      });
      var days = Array.from(Array(31).keys()).map(function (x) {
        return (x + 1).toString();
      });
      var dateOfBirth = args.model.get("date_of_birth");
      var userBirthdayMonth = dateOfBirth ? moment(dateOfBirth, "YYYY-MM-DD").month() + 1 : null;
      var userBirthdayDay = dateOfBirth ? moment(dateOfBirth, "YYYY-MM-DD").date().toString() : null;
      component.setProperties({
        months: months,
        days: days,
        userBirthdayMonth: userBirthdayMonth,
        userBirthdayDay: userBirthdayDay
      });

      var updateBirthday = function updateBirthday() {
        var date = "";

        if (component.userBirthdayMonth && component.userBirthdayDay) {
          date = "1904-".concat(component.userBirthdayMonth, "-").concat(component.userBirthdayDay);
        }

        args.model.set("date_of_birth", date);
      };

      component.addObserver("userBirthdayMonth", updateBirthday);
      component.addObserver("userBirthdayDay", updateBirthday);
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/connectors/user-post-names/user-cakeday", ["exports", "discourse/plugins/discourse-cakeday/discourse/lib/cakeday"], function (_exports, _cakeday) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    setupComponent: function setupComponent(args, component) {
      component.set("isCakeday", (0, _cakeday.cakeday)(args.model.get("created_at")));
      component.set("isUserBirthday", (0, _cakeday.cakedayBirthday)(args.model.get("date_of_birth")));
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/controllers/cakeday-anniversaries-all", ["exports", "discourse-common/utils/decorators"], function (_exports, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Controller.extend((_obj = {
    queryParams: ["month"],
    month: moment().month() + 1,
    months: function months() {
      return moment.months().map(function (month, index) {
        return {
          name: month,
          value: index + 1
        };
      });
    },
    actions: {
      loadMore: function loadMore() {
        this.get("model").loadMore();
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "months", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "months"), _obj)), _obj));

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/controllers/cakeday-anniversaries-today", ["exports", "I18n", "discourse-common/utils/decorators"], function (_exports, _I18n, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Controller.extend((_obj = {
    title: function title() {
      return _I18n.default.t("anniversaries.today.title", {
        date: moment().format(_I18n.default.t("dates.full_no_year_no_time"))
      });
    },
    actions: {
      loadMore: function loadMore() {
        this.get("model").loadMore();
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "title", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "title"), _obj)), _obj));

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/controllers/cakeday-anniversaries-tomorrow", ["exports", "I18n", "discourse-common/utils/decorators"], function (_exports, _I18n, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Controller.extend((_obj = {
    title: function title() {
      return _I18n.default.t("anniversaries.today.title", {
        date: moment().add(1, "day").format(_I18n.default.t("dates.full_no_year_no_time"))
      });
    },
    actions: {
      loadMore: function loadMore() {
        this.get("model").loadMore();
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "title", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "title"), _obj)), _obj));

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/controllers/cakeday-anniversaries-upcoming", ["exports", "I18n", "discourse-common/utils/decorators"], function (_exports, _I18n, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Controller.extend((_obj = {
    title: function title() {
      var date = moment();

      var dateFormat = _I18n.default.t("dates.full_no_year_no_time");

      return _I18n.default.t("anniversaries.upcoming.title", {
        start_date: date.add(2, "days").format(dateFormat),
        end_date: date.add(7, "days").format(dateFormat)
      });
    },
    actions: {
      loadMore: function loadMore() {
        this.get("model").loadMore();
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "title", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "title"), _obj)), _obj));

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/controllers/cakeday-birthdays-all", ["exports", "discourse-common/utils/decorators"], function (_exports, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Controller.extend((_obj = {
    queryParams: ["month"],
    month: moment().month() + 1,
    months: function months() {
      return moment.months().map(function (month, index) {
        return {
          name: month,
          value: index + 1
        };
      });
    },
    actions: {
      loadMore: function loadMore() {
        this.get("model").loadMore();
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "months", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "months"), _obj)), _obj));

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/controllers/cakeday-birthdays-today", ["exports", "I18n", "discourse-common/utils/decorators"], function (_exports, _I18n, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Controller.extend((_obj = {
    title: function title() {
      return _I18n.default.t("birthdays.today.title", {
        date: moment().format(_I18n.default.t("dates.full_no_year_no_time"))
      });
    },
    actions: {
      loadMore: function loadMore() {
        this.get("model").loadMore();
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "title", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "title"), _obj)), _obj));

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/controllers/cakeday-birthdays-tomorrow", ["exports", "I18n", "discourse-common/utils/decorators"], function (_exports, _I18n, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Controller.extend((_obj = {
    title: function title() {
      return _I18n.default.t("birthdays.today.title", {
        date: moment().add(1, "day").format(_I18n.default.t("dates.full_no_year_no_time"))
      });
    },
    actions: {
      loadMore: function loadMore() {
        this.get("model").loadMore();
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "title", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "title"), _obj)), _obj));

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/controllers/cakeday-birthdays-upcoming", ["exports", "I18n", "discourse-common/utils/decorators"], function (_exports, _I18n, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Controller.extend((_obj = {
    title: function title() {
      var date = moment();

      var dateFormat = _I18n.default.t("dates.full_no_year_no_time");

      return _I18n.default.t("birthdays.upcoming.title", {
        start_date: date.add(2, "days").format(dateFormat),
        end_date: date.add(7, "days").format(dateFormat)
      });
    },
    actions: {
      loadMore: function loadMore() {
        this.get("model").loadMore();
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "title", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "title"), _obj)), _obj));

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/controllers/cakeday", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Controller.extend({
    cakedayEnabled: Ember.computed.alias("siteSettings.cakeday_enabled"),
    cakedayBirthdayEnabled: Ember.computed.alias("siteSettings.cakeday_birthday_enabled")
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/discourse-cakeday-route-map", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _default;

  function _default() {
    this.route("cakeday", {
      path: "/cakeday",
      resetNamespace: true
    }, function () {
      this.route("birthdays", {
        path: "/birthdays"
      }, function () {
        this.route("today", {
          path: "/today"
        });
        this.route("tomorrow", {
          path: "/tomorrow"
        });
        this.route("upcoming", {
          path: "/upcoming"
        });
        this.route("all", {
          path: "/all"
        });
      });
      this.route("anniversaries", {
        path: "/anniversaries"
      }, function () {
        this.route("today", {
          path: "/today"
        });
        this.route("tomorrow", {
          path: "/tomorrow"
        });
        this.route("upcoming", {
          path: "/upcoming"
        });
        this.route("all", {
          path: "/all"
        });
      });
    });
  }
});
define("discourse/plugins/discourse-cakeday/discourse/initializers/cakeday", ["exports", "I18n", "discourse-common/utils/decorators", "discourse/controllers/preferences", "discourse/controllers/user-card", "discourse/controllers/user", "discourse/lib/plugin-api", "discourse/plugins/discourse-cakeday/discourse/lib/cakeday", "discourse-common/lib/helpers"], function (_exports, _I18n, _decorators, _preferences, _userCard, _user, _pluginApi, _cakeday, _helpers) {
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

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function initializeCakeday(api, siteSettings) {
    var emojiEnabled = siteSettings.enable_emoji;
    var cakedayEnabled = siteSettings.cakeday_enabled;
    var cakedayBirthdayEnabled = siteSettings.cakeday_birthday_enabled;

    if (cakedayEnabled) {
      api.includePostAttributes("user_created_at");
      api.includePostAttributes("user_date_of_birth");
      api.addPosterIcon(function (cfs, attrs) {
        var createdAt = attrs.user_created_at;

        if (!Ember.isEmpty(createdAt) && (0, _cakeday.isSameDay)(createdAt, {
          anniversary: true
        })) {
          var result = {};

          if (emojiEnabled) {
            result.emoji = siteSettings.cakeday_emoji;
          } else {
            result.icon = "birthday-cake";
          }

          var currentUser = api.getCurrentUser();

          if (currentUser && attrs.user_id === currentUser.get("id")) {
            result.title = _I18n.default.t("user.anniversary.user_title");
          } else {
            result.title = _I18n.default.t("user.anniversary.title");
          }

          result.emojiTitle = false;
          return result;
        }
      });
    }

    if (cakedayBirthdayEnabled) {
      api.addPosterIcon(function (cfs, attrs) {
        var dob = attrs.user_date_of_birth;

        if (!Ember.isEmpty(dob) && (0, _cakeday.isSameDay)(dob)) {
          var result = {};

          if (emojiEnabled) {
            result.emoji = siteSettings.cakeday_birthday_emoji;
          } else {
            result.icon = "birthday-cake";
          }

          var currentUser = api.getCurrentUser();

          if (currentUser && attrs.user_id === currentUser.get("id")) {
            result.title = _I18n.default.t("user.date_of_birth.user_title");
          } else {
            result.title = _I18n.default.t("user.date_of_birth.title");
          }

          result.emojiTitle = false;
          return result;
        }
      });
    }

    if (cakedayEnabled || cakedayBirthdayEnabled) {
      (0, _helpers.registerUnbound)("cakeday-date", function (val, params) {
        var date = moment(val);

        if (params.isBirthday) {
          return date.format(_I18n.default.t("dates.full_no_year_no_time"));
        } else {
          return date.format(_I18n.default.t("dates.full_with_year_no_time"));
        }
      });
      api.decorateWidget("hamburger-menu:generalLinks", function () {
        var route;

        if (cakedayEnabled) {
          route = "cakeday.anniversaries.today";
        } else if (cakedayBirthdayEnabled) {
          route = "cakeday.birthdays.today";
        }

        return {
          route: route,
          label: "cakeday.title",
          className: "cakeday-link"
        };
      });
    }
  }

  var _default = {
    name: "cakeday",
    initialize: function initialize(container) {
      var _dec, _dec2, _dec3, _obj, _dec4, _dec5, _obj2, _dec6, _dec7, _obj3;

      var currentUser = container.lookup("current-user:main");

      if (!currentUser) {
        return;
      }

      var siteSettings = container.lookup("site-settings:main");
      var store = container.lookup("store:main");
      store.addPluralization("anniversary", "anniversaries");

      _preferences.default.reopen((_dec = (0, _decorators.observes)("userBirthdayMonth", "userBirthdayDay"), _dec2 = (0, _decorators.default)("model.date_of_birth"), _dec3 = (0, _decorators.default)("model.date_of_birth"), (_obj = {
        days: _toConsumableArray(Array(32).keys()).splice(1),
        months: function months() {
          return moment.months().map(function (month, index) {
            return {
              name: month,
              value: index + 1
            };
          });
        },
        _setUserDateOfBirth: function _setUserDateOfBirth() {
          var userBirthdayMonth = this.get("userBirthdayMonth");
          var userBirthdayDay = this.get("userBirthdayDay");
          var user = this.get("model");
          var date = "";

          if (userBirthdayMonth !== "" && userBirthdayDay !== "") {
            date = "1904-".concat(this.get("userBirthdayMonth"), "-").concat(this.get("userBirthdayDay"));
          }

          user.set("date_of_birth", date);
        },
        userBirthdayMonth: function userBirthdayMonth(dateOfBirth) {
          return moment(dateOfBirth, "YYYY-MM-DD").month() + 1;
        },
        userBirthdayDay: function userBirthdayDay(dateOfBirth) {
          return moment(dateOfBirth, "YYYY-MM-DD").date();
        }
      }, (_applyDecoratedDescriptor(_obj, "months", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "months"), _obj), _applyDecoratedDescriptor(_obj, "_setUserDateOfBirth", [_dec], Object.getOwnPropertyDescriptor(_obj, "_setUserDateOfBirth"), _obj), _applyDecoratedDescriptor(_obj, "userBirthdayMonth", [_dec2], Object.getOwnPropertyDescriptor(_obj, "userBirthdayMonth"), _obj), _applyDecoratedDescriptor(_obj, "userBirthdayDay", [_dec3], Object.getOwnPropertyDescriptor(_obj, "userBirthdayDay"), _obj)), _obj)));

      _userCard.default.reopen((_dec4 = (0, _decorators.default)("model.created_at"), _dec5 = (0, _decorators.default)("model.date_of_birth"), (_obj2 = {
        isCakeday: function isCakeday(createdAt) {
          return (0, _cakeday.cakeday)(createdAt);
        },
        isUserBirthday: function isUserBirthday(dateOfBirth) {
          return (0, _cakeday.cakedayBirthday)(dateOfBirth);
        }
      }, (_applyDecoratedDescriptor(_obj2, "isCakeday", [_dec4], Object.getOwnPropertyDescriptor(_obj2, "isCakeday"), _obj2), _applyDecoratedDescriptor(_obj2, "isUserBirthday", [_dec5], Object.getOwnPropertyDescriptor(_obj2, "isUserBirthday"), _obj2)), _obj2)));

      _user.default.reopen((_dec6 = (0, _decorators.default)("model.created_at"), _dec7 = (0, _decorators.default)("model.date_of_birth"), (_obj3 = {
        isCakeday: function isCakeday(createdAt) {
          return (0, _cakeday.cakeday)(createdAt);
        },
        isUserBirthday: function isUserBirthday(dateOfBirth) {
          return (0, _cakeday.cakedayBirthday)(dateOfBirth);
        }
      }, (_applyDecoratedDescriptor(_obj3, "isCakeday", [_dec6], Object.getOwnPropertyDescriptor(_obj3, "isCakeday"), _obj3), _applyDecoratedDescriptor(_obj3, "isUserBirthday", [_dec7], Object.getOwnPropertyDescriptor(_obj3, "isUserBirthday"), _obj3)), _obj3)));

      (0, _pluginApi.withPluginApi)("0.1", function (api) {
        return initializeCakeday(api, siteSettings);
      });
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/lib/cakeday", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.isSameDay = isSameDay;
  _exports.cakeday = cakeday;
  _exports.cakedayBirthday = cakedayBirthday;
  _exports.cakedayTitle = cakedayTitle;
  _exports.cakedayBirthdayTitle = cakedayBirthdayTitle;

  function isSameDay(date, opts) {
    var formatString = "YYYY";
    var current = moment();
    var currentDate = moment(date);

    if (opts && opts.anniversary) {
      if (current.format(formatString) <= currentDate.format(formatString)) {
        return false;
      }
    }

    formatString = "MMDD";
    return current.format(formatString) === currentDate.format(formatString);
  }

  function cakeday(createdAt) {
    if (Ember.isEmpty(createdAt)) {
      return false;
    }

    return isSameDay(createdAt, {
      anniversary: true
    });
  }

  function cakedayBirthday(dateOfBirth) {
    if (Ember.isEmpty(dateOfBirth)) {
      return false;
    }

    return isSameDay(dateOfBirth);
  }

  function cakedayTitle(user, currentUser) {
    if (isSameUser(user, currentUser)) {
      return "user.anniversary.user_title";
    } else {
      return "user.anniversary.title";
    }
  }

  function cakedayBirthdayTitle(user, currentUser) {
    if (isSameUser(user, currentUser)) {
      return "user.date_of_birth.user_title";
    } else {
      return "user.date_of_birth.title";
    }
  }

  function isSameUser(user, currentUser) {
    if (!currentUser) {
      return false;
    }

    return user.get("id") === currentUser.get("id");
  }
});
define("discourse/plugins/discourse-cakeday/discourse/routes/build-cakeday-route", ["exports", "discourse/routes/discourse"], function (_exports, _discourse) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = function _default(storeName, filter) {
    return _discourse.default.extend({
      model: function model(params) {
        params.timezone_offset = new Date().getTimezoneOffset();

        if (filter) {
          params.filter = filter;
        }

        return this.store.find(storeName, params);
      }
    });
  };

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/routes/cakeday-anniversaries-all", ["exports", "discourse/plugins/discourse-cakeday/discourse/routes/build-cakeday-route"], function (_exports, _buildCakedayRoute) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _buildCakedayRoute.default)("anniversary").extend({
    queryParams: {
      month: {
        refreshModel: true
      }
    },
    refreshQueryWithoutTransition: true
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/routes/cakeday-anniversaries-index", ["exports", "discourse/routes/discourse"], function (_exports, _discourse) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _discourse.default.extend({
    beforeModel: function beforeModel() {
      this.replaceWith("cakeday.anniversaries.today");
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/routes/cakeday-anniversaries-today", ["exports", "discourse/plugins/discourse-cakeday/discourse/routes/build-cakeday-route"], function (_exports, _buildCakedayRoute) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _buildCakedayRoute.default)("anniversary", "today");

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/routes/cakeday-anniversaries-tomorrow", ["exports", "discourse/plugins/discourse-cakeday/discourse/routes/build-cakeday-route"], function (_exports, _buildCakedayRoute) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _buildCakedayRoute.default)("anniversary", "tomorrow");

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/routes/cakeday-anniversaries-upcoming", ["exports", "discourse/plugins/discourse-cakeday/discourse/routes/build-cakeday-route"], function (_exports, _buildCakedayRoute) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _buildCakedayRoute.default)("anniversary", "upcoming");

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/routes/cakeday-anniversaries", ["exports", "I18n", "discourse/routes/discourse"], function (_exports, _I18n, _discourse) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _discourse.default.extend({
    beforeModel: function beforeModel() {
      if (!this.siteSettings.cakeday_enabled) {
        this.transitionTo("unknown", window.location.pathname.replace(/^\//, ""));
      }
    },
    titleToken: function titleToken() {
      return _I18n.default.t("anniversaries.title");
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/routes/cakeday-birthdays-all", ["exports", "discourse/plugins/discourse-cakeday/discourse/routes/build-cakeday-route"], function (_exports, _buildCakedayRoute) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _buildCakedayRoute.default)("birthday").extend({
    queryParams: {
      month: {
        refreshModel: true
      }
    },
    refreshQueryWithoutTransition: true
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/routes/cakeday-birthdays-index", ["exports", "discourse/routes/discourse"], function (_exports, _discourse) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _discourse.default.extend({
    beforeModel: function beforeModel() {
      this.replaceWith("cakeday.birthdays.today");
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/routes/cakeday-birthdays-today", ["exports", "discourse/plugins/discourse-cakeday/discourse/routes/build-cakeday-route"], function (_exports, _buildCakedayRoute) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _buildCakedayRoute.default)("birthday", "today");

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/routes/cakeday-birthdays-tomorrow", ["exports", "discourse/plugins/discourse-cakeday/discourse/routes/build-cakeday-route"], function (_exports, _buildCakedayRoute) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _buildCakedayRoute.default)("birthday", "tomorrow");

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/routes/cakeday-birthdays-upcoming", ["exports", "discourse/plugins/discourse-cakeday/discourse/routes/build-cakeday-route"], function (_exports, _buildCakedayRoute) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _buildCakedayRoute.default)("birthday", "upcoming");

  _exports.default = _default;
});
define("discourse/plugins/discourse-cakeday/discourse/routes/cakeday-birthdays", ["exports", "I18n", "discourse/routes/discourse"], function (_exports, _I18n, _discourse) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _discourse.default.extend({
    beforeModel: function beforeModel() {
      if (!this.siteSettings.cakeday_birthday_enabled) {
        this.transitionTo("unknown", window.location.pathname.replace(/^\//, ""));
      }
    },
    titleToken: function titleToken() {
      return _I18n.default.t("birthdays.title");
    }
  });

  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/cakeday/anniversaries/all"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"load-more\",null,[[\"selector\",\"action\"],[\".user-info\",[28,\"action\",[[23,0,[]],\"loadMore\"],null]]],{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"cakeday-months\"],[8],[0,\"\\n    \"],[7,\"h2\",true],[10,\"class\",\"cakeday-header\"],[8],[1,[28,\"i18n\",[\"anniversaries.month.title\"],null],false],[9],[0,\"\\n    \"],[1,[28,\"combo-box\",null,[[\"content\",\"value\",\"valueAttribute\",\"none\"],[[24,[\"months\"]],[24,[\"month\"]],\"value\",\"cakeday.none\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\\n\"],[4,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loading\"]]]],{\"statements\":[[4,\"user-info-list\",null,[[\"users\"],[[24,[\"model\"]]]],{\"statements\":[[0,\"      \"],[1,[28,\"i18n\",[\"anniversaries.month.empty\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n  \"],[1,[28,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loadingMore\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/cakeday/anniversaries/all"}});
Ember.TEMPLATES["javascripts/cakeday/anniversaries/today"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"h2\",true],[10,\"class\",\"cakeday-header\"],[8],[1,[22,\"title\"],false],[9],[0,\"\\n\\n\"],[4,\"load-more\",null,[[\"selector\",\"action\"],[\".user-info\",[28,\"action\",[[23,0,[]],\"loadMore\"],null]]],{\"statements\":[[4,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loading\"]]]],{\"statements\":[[4,\"user-info-list\",null,[[\"users\"],[[24,[\"model\"]]]],{\"statements\":[[0,\"      \"],[1,[28,\"i18n\",[\"anniversaries.today.empty\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n  \"],[1,[28,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loadingMore\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/cakeday/anniversaries/today"}});
Ember.TEMPLATES["javascripts/cakeday/anniversaries/tomorrow"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"h2\",true],[10,\"class\",\"cakeday-header\"],[8],[1,[22,\"title\"],false],[9],[0,\"\\n\\n\"],[4,\"load-more\",null,[[\"selector\",\"action\"],[\".user-info\",[28,\"action\",[[23,0,[]],\"loadMore\"],null]]],{\"statements\":[[4,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loading\"]]]],{\"statements\":[[4,\"user-info-list\",null,[[\"users\"],[[24,[\"model\"]]]],{\"statements\":[[0,\"      \"],[1,[28,\"i18n\",[\"anniversaries.tomorrow.empty\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n  \"],[1,[28,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loadingMore\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/cakeday/anniversaries/tomorrow"}});
Ember.TEMPLATES["javascripts/cakeday/anniversaries/upcoming"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"h2\",true],[10,\"class\",\"cakeday-header\"],[8],[1,[22,\"title\"],false],[9],[0,\"\\n\\n\"],[4,\"load-more\",null,[[\"selector\",\"action\"],[\".user-info\",[28,\"action\",[[23,0,[]],\"loadMore\"],null]]],{\"statements\":[[4,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loading\"]]]],{\"statements\":[[4,\"user-info-list\",null,[[\"users\"],[[24,[\"model\"]]]],{\"statements\":[[0,\"      \"],[1,[28,\"i18n\",[\"anniversaries.upcoming.empty\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n  \"],[1,[28,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loadingMore\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/cakeday/anniversaries/upcoming"}});
Ember.TEMPLATES["javascripts/cakeday/anniversaries"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"div\",true],[10,\"class\",\"anniversaries\"],[8],[0,\"\\n  \"],[7,\"ul\",true],[10,\"class\",\"nav-pills\"],[8],[0,\"\\n    \"],[7,\"li\",true],[8],[0,\"\\n\"],[4,\"link-to\",null,[[\"route\"],[\"cakeday.anniversaries.today\"]],{\"statements\":[[0,\"        \"],[1,[28,\"i18n\",[\"cakeday.today\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[9],[0,\"\\n\\n    \"],[7,\"li\",true],[8],[0,\"\\n\"],[4,\"link-to\",null,[[\"route\"],[\"cakeday.anniversaries.tomorrow\"]],{\"statements\":[[0,\"        \"],[1,[28,\"i18n\",[\"cakeday.tomorrow\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[9],[0,\"\\n\\n    \"],[7,\"li\",true],[8],[0,\"\\n\"],[4,\"link-to\",null,[[\"route\"],[\"cakeday.anniversaries.upcoming\"]],{\"statements\":[[0,\"        \"],[1,[28,\"i18n\",[\"cakeday.upcoming\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[9],[0,\"\\n\\n    \"],[7,\"li\",true],[8],[0,\"\\n\"],[4,\"link-to\",null,[[\"route\"],[\"cakeday.anniversaries.all\"]],{\"statements\":[[0,\"        \"],[1,[28,\"i18n\",[\"cakeday.all\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\\n  \"],[1,[22,\"outlet\"],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/cakeday/anniversaries"}});
Ember.TEMPLATES["javascripts/cakeday/birthdays/all"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"load-more\",null,[[\"selector\",\"action\"],[\".user-info\",[28,\"action\",[[23,0,[]],\"loadMore\"],null]]],{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"cakeday-months\"],[8],[0,\"\\n    \"],[7,\"h2\",true],[10,\"class\",\"cakeday-header\"],[8],[1,[28,\"i18n\",[\"birthdays.month.title\"],null],false],[9],[0,\"\\n    \"],[1,[28,\"combo-box\",null,[[\"content\",\"value\",\"valueAttribute\",\"none\"],[[24,[\"months\"]],[24,[\"month\"]],\"value\",\"cakeday.none\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\\n\"],[4,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loading\"]]]],{\"statements\":[[4,\"user-info-list\",null,[[\"users\",\"isBirthday\"],[[24,[\"model\"]],true]],{\"statements\":[[0,\"      \"],[1,[28,\"i18n\",[\"birthdays.month.empty\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n  \"],[1,[28,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loadingMore\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/cakeday/birthdays/all"}});
Ember.TEMPLATES["javascripts/cakeday/birthdays/today"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"h2\",true],[10,\"class\",\"cakeday-header\"],[8],[1,[22,\"title\"],false],[9],[0,\"\\n\\n\"],[4,\"load-more\",null,[[\"selector\",\"action\"],[\".user-info\",[28,\"action\",[[23,0,[]],\"loadMore\"],null]]],{\"statements\":[[4,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loading\"]]]],{\"statements\":[[4,\"user-info-list\",null,[[\"users\",\"isBirthday\"],[[24,[\"model\"]],true]],{\"statements\":[[0,\"      \"],[1,[28,\"i18n\",[\"birthdays.today.empty\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n  \"],[1,[28,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loadingMore\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/cakeday/birthdays/today"}});
Ember.TEMPLATES["javascripts/cakeday/birthdays/tomorrow"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"h2\",true],[10,\"class\",\"cakeday-header\"],[8],[1,[22,\"title\"],false],[9],[0,\"\\n\\n\"],[4,\"load-more\",null,[[\"selector\",\"action\"],[\".user-info\",[28,\"action\",[[23,0,[]],\"loadMore\"],null]]],{\"statements\":[[4,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loading\"]]]],{\"statements\":[[4,\"user-info-list\",null,[[\"users\",\"isBirthday\"],[[24,[\"model\"]],true]],{\"statements\":[[0,\"      \"],[1,[28,\"i18n\",[\"birthdays.tomorrow.empty\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n  \"],[1,[28,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loadingMore\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/cakeday/birthdays/tomorrow"}});
Ember.TEMPLATES["javascripts/cakeday/birthdays/upcoming"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"h2\",true],[10,\"class\",\"cakeday-header\"],[8],[1,[22,\"title\"],false],[9],[0,\"\\n\\n\"],[4,\"load-more\",null,[[\"selector\",\"action\"],[\".user-info\",[28,\"action\",[[23,0,[]],\"loadMore\"],null]]],{\"statements\":[[4,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loading\"]]]],{\"statements\":[[4,\"user-info-list\",null,[[\"users\",\"isBirthday\"],[[24,[\"model\"]],true]],{\"statements\":[[0,\"      \"],[1,[28,\"i18n\",[\"birthdays.upcoming.empty\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n  \"],[1,[28,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"model\",\"loadingMore\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/cakeday/birthdays/upcoming"}});
Ember.TEMPLATES["javascripts/cakeday/birthdays"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"div\",true],[10,\"class\",\"birthdays\"],[8],[0,\"\\n  \"],[7,\"ul\",true],[10,\"class\",\"nav-pills\"],[8],[0,\"\\n    \"],[7,\"li\",true],[8],[0,\"\\n\"],[4,\"link-to\",null,[[\"route\"],[\"cakeday.birthdays.today\"]],{\"statements\":[[0,\"        \"],[1,[28,\"i18n\",[\"cakeday.today\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[9],[0,\"\\n\\n    \"],[7,\"li\",true],[8],[0,\"\\n\"],[4,\"link-to\",null,[[\"route\"],[\"cakeday.birthdays.tomorrow\"]],{\"statements\":[[0,\"        \"],[1,[28,\"i18n\",[\"cakeday.tomorrow\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[9],[0,\"\\n\\n    \"],[7,\"li\",true],[8],[0,\"\\n\"],[4,\"link-to\",null,[[\"route\"],[\"cakeday.birthdays.upcoming\"]],{\"statements\":[[0,\"        \"],[1,[28,\"i18n\",[\"cakeday.upcoming\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[9],[0,\"\\n\\n    \"],[7,\"li\",true],[8],[0,\"\\n\"],[4,\"link-to\",null,[[\"route\"],[\"cakeday.birthdays.all\"]],{\"statements\":[[0,\"        \"],[1,[28,\"i18n\",[\"cakeday.all\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\\n  \"],[1,[22,\"outlet\"],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/cakeday/birthdays"}});
Ember.TEMPLATES["javascripts/cakeday"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"div\",true],[10,\"class\",\"container cakeday\"],[8],[0,\"\\n  \"],[7,\"ul\",true],[10,\"class\",\"nav-pills\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"cakedayEnabled\"]]],null,{\"statements\":[[0,\"      \"],[7,\"li\",true],[10,\"class\",\"nav-item-anniversaries\"],[8],[0,\"\\n\"],[4,\"link-to\",null,[[\"route\"],[\"cakeday.anniversaries\"]],{\"statements\":[[0,\"          \"],[1,[28,\"i18n\",[\"anniversaries.title\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"      \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"if\",[[24,[\"cakedayBirthdayEnabled\"]]],null,{\"statements\":[[0,\"      \"],[7,\"li\",true],[10,\"class\",\"nav-item-birthdays\"],[8],[0,\"\\n\"],[4,\"link-to\",null,[[\"route\"],[\"cakeday.birthdays\"]],{\"statements\":[[0,\"          \"],[1,[28,\"i18n\",[\"birthdays.title\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"      \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"  \"],[9],[0,\"\\n\\n  \"],[1,[22,\"outlet\"],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/cakeday"}});
Ember.TEMPLATES["javascripts/components/emoji-images"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"html\"],\"statements\":[[4,\"if\",[[24,[\"siteSettings\",\"enable_emoji\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[11,\"title\",[22,\"titleText\"]],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"emojiHTML\"]]],null,{\"statements\":[[0,\"      \"],[1,[23,1,[]],true],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"  \"],[9],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"  \"],[1,[28,\"fa-icon\",[\"birthday-cake\"],[[\"title\"],[[24,[\"titleText\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]}]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/emoji-images"}});
Ember.TEMPLATES["javascripts/components/user-info-list"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"user\",\"&default\"],\"statements\":[[7,\"ul\",true],[10,\"class\",\"user-info-list\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"users\"]]],null,{\"statements\":[[0,\"    \"],[7,\"li\",true],[10,\"class\",\"user-info-item\"],[8],[0,\"\\n\"],[4,\"user-info\",null,[[\"user\"],[[23,1,[]]]],{\"statements\":[[0,\"        \"],[7,\"div\",true],[8],[1,[28,\"cakeday-date\",[[23,1,[\"cakeday_date\"]]],[[\"isBirthday\"],[[24,[\"isBirthday\"]]]]],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[9],[0,\"\\n\"]],\"parameters\":[1]},{\"statements\":[[0,\"    \"],[7,\"div\",true],[10,\"class\",\"user-info-empty-message\"],[8],[7,\"h4\",true],[8],[14,2],[9],[9],[0,\"\\n\"]],\"parameters\":[]}],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/user-info-list"}});
Ember.TEMPLATES["javascripts/connectors/user-card-post-names/user-card-cakeday"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"if\",[[24,[\"siteSettings\",\"cakeday_birthday_enabled\"]]],null,{\"statements\":[[4,\"if\",[[24,[\"isUserBirthday\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"emoji-images\",null,[[\"list\",\"title\"],[[24,[\"siteSettings\",\"cakeday_birthday_emoji\"]],[24,[\"cakedayBirthdayTitle\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"if\",[[24,[\"siteSettings\",\"cakeday_enabled\"]]],null,{\"statements\":[[4,\"if\",[[24,[\"isCakeday\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"emoji-images\",null,[[\"list\",\"title\"],[[24,[\"siteSettings\",\"cakeday_emoji\"]],[24,[\"cakedayTitle\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/connectors/user-card-post-names/user-card-cakeday"}});
Ember.TEMPLATES["javascripts/connectors/user-custom-preferences/user-date-of-birth-input"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"if\",[[24,[\"siteSettings\",\"cakeday_birthday_enabled\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"control-group\"],[8],[0,\"\\n    \"],[7,\"label\",true],[10,\"class\",\"control-label\"],[8],[1,[28,\"i18n\",[\"user.date_of_birth.label\"],null],false],[9],[0,\"\\n    \"],[7,\"div\",true],[10,\"class\",\"controls\"],[8],[0,\"\\n      \"],[1,[28,\"combo-box\",null,[[\"content\",\"value\",\"valueAttribute\",\"valueProperty\",\"none\",\"options\",\"onChange\"],[[24,[\"months\"]],[24,[\"userBirthdayMonth\"]],\"value\",\"value\",\"cakeday.none\",[28,\"hash\",null,[[\"clearable\",\"autoInsertNoneItem\"],[true,false]]],[28,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"userBirthdayMonth\"]]],null]],null]]]],false],[0,\"\\n\\n      \"],[1,[28,\"combo-box\",null,[[\"content\",\"value\",\"valueProperty\",\"nameProperty\",\"none\",\"options\",\"onChange\"],[[24,[\"days\"]],[24,[\"userBirthdayDay\"]],null,null,\"cakeday.none\",[28,\"hash\",null,[[\"clearable\",\"autoInsertNoneItem\"],[true,false]]],[28,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"userBirthdayDay\"]]],null]],null]]]],false],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/connectors/user-custom-preferences/user-date-of-birth-input"}});
Ember.TEMPLATES["javascripts/connectors/user-post-names/user-cakeday"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"if\",[[24,[\"siteSettings\",\"cakeday_birthday_enabled\"]]],null,{\"statements\":[[4,\"if\",[[24,[\"isUserBirthday\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"emoji-images\",null,[[\"list\",\"title\"],[[24,[\"siteSettings\",\"cakeday_birthday_emoji\"]],\"birthdays.title\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"if\",[[24,[\"siteSettings\",\"cakeday_enabled\"]]],null,{\"statements\":[[4,\"if\",[[24,[\"isCakeday\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"emoji-images\",null,[[\"list\",\"title\"],[[24,[\"siteSettings\",\"cakeday_emoji\"]],\"anniversaries.title\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/connectors/user-post-names/user-cakeday"}});


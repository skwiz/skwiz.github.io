define("discourse/plugins/discourse-chat-integration/discourse/routes/transcript", ["exports", "discourse/lib/ajax", "discourse/lib/ajax-error", "discourse/routes/discourse"], function (_exports, _ajax, _ajaxError, _discourse) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _discourse.default.extend({
    model: function model(params) {
      var _this = this;

      if (this.currentUser) {
        var secret = params.secret;
        this.replaceWith("discovery.latest").then(function (e) {
          if (_this.controllerFor("navigation/default").get("canCreateTopic")) {
            Ember.run.next(function () {
              (0, _ajax.ajax)("chat-transcript/".concat(secret)).then(function (result) {
                e.send("createNewTopicViaParams", null, result["content"], null, null, null);
              }, _ajaxError.popupAjaxError);
            });
          }
        });
      } else {
        this.session.set("shouldRedirectToUrl", window.location.href);
        this.replaceWith("login");
      }
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/discourse/public-route-map", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _default;

  function _default() {
    this.route("transcript", {
      path: "/chat-transcript/:secret"
    });
  }
});
Ember.TEMPLATES["javascripts/components/channel-data"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"param\"],\"statements\":[[4,\"each\",[[24,[\"provider\",\"channel_parameters\"]]],null,{\"statements\":[[4,\"unless\",[[23,1,[\"hidden\"]]],null,{\"statements\":[[0,\"    \"],[7,\"span\",true],[10,\"class\",\"field-name\"],[8],[0,\"\\n      \"],[1,[28,\"i18n\",[[28,\"concat\",[\"chat_integration.provider.\",[24,[\"channel\",\"provider\"]],\".param.\",[23,1,[\"key\"]],\".title\"],null]],null],false],[0,\":\\n    \"],[9],[0,\"\\n    \"],[7,\"span\",true],[10,\"class\",\"field-value\"],[8],[1,[28,\"get\",[[24,[\"channel\",\"data\"]],[23,1,[\"key\"]]],null],false],[9],[0,\"\\n    \"],[7,\"br\",true],[8],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[1]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/channel-data"}});
Ember.TEMPLATES["javascripts/components/rule-row"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"td\",true],[8],[0,\"\\n  \"],[1,[24,[\"rule\",\"filterName\"]],false],[0,\"\\n\"],[9],[0,\"\\n\\n\"],[7,\"td\",true],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"isCategory\"]]],null,{\"statements\":[[4,\"if\",[[24,[\"rule\",\"category\"]]],null,{\"statements\":[[0,\"      \"],[1,[28,\"category-link\",[[24,[\"rule\",\"category\"]]],[[\"allowUncategorized\",\"link\"],[\"true\",\"false\"]]],false],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"      \"],[1,[28,\"i18n\",[\"chat_integration.all_categories\"],null],false],[0,\"\\n\"]],\"parameters\":[]}]],\"parameters\":[]},{\"statements\":[[4,\"if\",[[24,[\"isMention\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"i18n\",[\"chat_integration.group_mention_template\"],[[\"name\"],[[24,[\"rule\",\"group_name\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[4,\"if\",[[24,[\"isMessage\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"i18n\",[\"chat_integration.group_message_template\"],[[\"name\"],[[24,[\"rule\",\"group_name\"]]]]],false],[0,\"\\n  \"]],\"parameters\":[]},null]],\"parameters\":[]}]],\"parameters\":[]}],[9],[0,\"\\n\\n\\n\"],[4,\"if\",[[24,[\"siteSettings\",\"tagging_enabled\"]]],null,{\"statements\":[[0,\"  \"],[7,\"td\",true],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"rule\",\"tags\"]]],null,{\"statements\":[[0,\"      \"],[1,[24,[\"rule\",\"tags\"]],false],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"      \"],[1,[28,\"i18n\",[\"chat_integration.all_tags\"],null],false],[0,\"\\n\"]],\"parameters\":[]}],[0,\"  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[7,\"td\",true],[8],[0,\"\\n  \"],[1,[28,\"d-button\",null,[[\"action\",\"actionParam\",\"icon\",\"class\",\"title\"],[[24,[\"edit\"]],[24,[\"rule\"]],\"pencil-alt\",\"edit\",\"chat_integration.rule_table.edit_rule\"]]],false],[0,\"\\n\\n  \"],[1,[28,\"d-button\",null,[[\"action\",\"actionParam\",\"icon\",\"class\",\"title\"],[[28,\"action\",[[23,0,[]],\"delete\"],null],[24,[\"rule\"]],\"far-trash-alt\",\"delete\",\"chat_integration.rule_table.delete_rule\"]]],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/rule-row"}});
Ember.TEMPLATES["javascripts/components/channel-details"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"rule\"],\"statements\":[[7,\"div\",true],[10,\"class\",\"channel-header\"],[8],[0,\"\\n  \"],[7,\"div\",true],[10,\"class\",\"pull-right\"],[8],[0,\"\\n    \"],[1,[28,\"d-button\",null,[[\"action\",\"actionParam\",\"icon\",\"title\",\"label\"],[[24,[\"editChannel\"]],[24,[\"channel\"]],\"pencil-alt\",\"chat_integration.edit_channel\",\"chat_integration.edit_channel\"]]],false],[0,\"\\n\\n    \"],[1,[28,\"d-button\",null,[[\"action\",\"actionParam\",\"icon\",\"title\",\"label\",\"class\"],[[24,[\"test\"]],[24,[\"channel\"]],\"rocket\",\"chat_integration.test_channel\",\"chat_integration.test_channel\",\"btn-chat-test\"]]],false],[0,\"\\n\\n    \"],[1,[28,\"d-button\",null,[[\"class\",\"action\",\"actionParam\",\"icon\",\"title\",\"label\"],[\"cancel\",[28,\"action\",[[23,0,[]],\"deleteChannel\"],null],[24,[\"channel\"]],\"trash-alt\",\"chat_integration.delete_channel\",\"chat_integration.delete_channel\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\\n  \"],[7,\"span\",true],[10,\"class\",\"channel-title\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"channel\",\"error_key\"]]],null,{\"statements\":[[0,\"      \"],[1,[28,\"d-button\",null,[[\"action\",\"actionParam\",\"class\",\"icon\"],[[24,[\"showError\"]],[24,[\"channel\"]],\"delete btn-danger\",\"exclamation-triangle\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n    \"],[1,[28,\"channel-data\",null,[[\"provider\",\"channel\"],[[24,[\"provider\"]],[24,[\"channel\"]]]]],false],[0,\"\\n  \"],[9],[0,\"\\n\"],[9],[0,\"\\n\\n\"],[7,\"div\",true],[10,\"class\",\"channel-body\"],[8],[0,\"\\n  \"],[7,\"table\",true],[8],[0,\"\\n    \"],[7,\"tr\",true],[8],[0,\"\\n      \"],[7,\"th\",true],[8],[1,[28,\"i18n\",[\"chat_integration.rule_table.filter\"],null],false],[9],[0,\"\\n      \"],[7,\"th\",true],[8],[1,[28,\"i18n\",[\"chat_integration.rule_table.category\"],null],false],[9],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"siteSettings\",\"tagging_enabled\"]]],null,{\"statements\":[[0,\"        \"],[7,\"th\",true],[8],[1,[28,\"i18n\",[\"chat_integration.rule_table.tags\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n      \"],[7,\"th\",true],[8],[9],[0,\"\\n    \"],[9],[0,\"\\n\\n\"],[4,\"each\",[[24,[\"channel\",\"rules\"]]],null,{\"statements\":[[0,\"      \"],[1,[28,\"rule-row\",null,[[\"rule\",\"edit\",\"refresh\"],[[23,1,[]],[28,\"action\",[[23,0,[]],\"editRule\"],null],[24,[\"refresh\"]]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"  \"],[9],[0,\"\\n\"],[9],[0,\"\\n\\n\"],[7,\"div\",true],[10,\"class\",\"channel-footer\"],[8],[0,\"\\n  \"],[7,\"div\",true],[10,\"class\",\"pull-right\"],[8],[0,\"\\n   \"],[1,[28,\"d-button\",null,[[\"action\",\"actionParam\",\"icon\",\"title\",\"label\"],[[24,[\"createRule\"]],[24,[\"channel\"]],\"plus\",\"chat_integration.create_rule\",\"chat_integration.create_rule\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/channel-details"}});
Ember.TEMPLATES["javascripts/admin/plugins-chat"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"provider\"],\"statements\":[[7,\"div\",true],[10,\"id\",\"admin-plugin-chat\"],[8],[0,\"\\n  \"],[7,\"div\",true],[10,\"class\",\"admin-controls\"],[8],[0,\"\\n    \"],[7,\"div\",true],[10,\"class\",\"span15\"],[8],[0,\"\\n      \"],[7,\"ul\",true],[10,\"class\",\"nav nav-pills\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"model\"]]],null,{\"statements\":[[0,\"          \"],[1,[28,\"nav-item\",null,[[\"route\",\"routeParam\",\"label\"],[\"adminPlugins.chat.provider\",[23,1,[\"name\"]],[28,\"concat\",[\"chat_integration.provider.\",[23,1,[\"name\"]],\".title\"],null]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"      \"],[9],[0,\"\\n    \"],[9],[0,\"\\n\\n    \"],[7,\"div\",true],[10,\"class\",\"pull-right\"],[8],[0,\"\\n      \"],[1,[28,\"d-button\",null,[[\"action\",\"icon\",\"title\",\"label\"],[[28,\"route-action\",[\"showSettings\"],null],\"cog\",\"chat_integration.settings\",\"chat_integration.settings\"]]],false],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\\n\"],[4,\"unless\",[[24,[\"model\",\"totalRows\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"i18n\",[\"chat_integration.no_providers\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n  \"],[1,[22,\"outlet\"],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/admin/plugins-chat"}});
Ember.TEMPLATES["javascripts/admin/plugins-chat-provider"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"channel\"],\"statements\":[[4,\"if\",[[24,[\"anyErrors\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"error\"],[8],[0,\"\\n    \"],[1,[28,\"d-icon\",[\"exclamation-triangle\"],null],false],[0,\"\\n    \"],[7,\"span\",true],[10,\"class\",\"error-message\"],[8],[1,[28,\"i18n\",[\"chat_integration.channels_with_errors\"],null],false],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"each\",[[24,[\"model\",\"channels\"]]],null,{\"statements\":[[0,\"  \"],[1,[28,\"channel-details\",null,[[\"channel\",\"provider\",\"refresh\",\"editChannel\",\"test\",\"createRule\",\"editRuleWithChannel\",\"showError\"],[[23,1,[]],[24,[\"model\",\"provider\"]],[28,\"route-action\",[\"refreshProvider\"],null],[28,\"action\",[[23,0,[]],\"editChannel\"],null],[28,\"action\",[[23,0,[]],\"testChannel\"],null],[28,\"action\",[[23,0,[]],\"createRule\"],null],[28,\"action\",[[23,0,[]],\"editRuleWithChannel\"],null],[28,\"action\",[[23,0,[]],\"showError\"],null]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"\\n\"],[7,\"div\",true],[10,\"class\",\"table-footer\"],[8],[0,\"\\n  \"],[7,\"div\",true],[10,\"class\",\"pull-right\"],[8],[0,\"\\n    \"],[1,[28,\"d-button\",null,[[\"id\",\"action\",\"actionParam\",\"icon\",\"title\",\"label\"],[\"create-channel\",[28,\"action\",[[23,0,[]],\"createChannel\"],null],[24,[\"model\",\"provider\"]],\"plus\",\"chat_integration.create_channel\",\"chat_integration.create_channel\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/admin/plugins-chat-provider"}});
define("discourse/plugins/discourse-chat-integration/admin/models/channel", ["exports", "discourse/models/rest"], function (_exports, _rest) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _rest.default.extend({
    updateProperties: function updateProperties() {
      return this.getProperties(["data"]);
    },
    createProperties: function createProperties() {
      return this.getProperties(["provider", "data"]);
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/models/provider", ["exports", "discourse/models/rest"], function (_exports, _rest) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _rest.default.extend({});

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/models/rule", ["exports", "I18n", "discourse/models/rest", "discourse/models/category", "discourse-common/utils/decorators"], function (_exports, _I18n, _rest, _category, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _dec3, _dec4, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _rest.default.extend((_dec = (0, _decorators.default)("channel.provider"), _dec2 = (0, _decorators.observes)("type"), _dec3 = (0, _decorators.default)("category_id"), _dec4 = (0, _decorators.default)("filter"), (_obj = {
    available_filters: function available_filters(provider) {
      var available = [];

      if (provider === "slack") {
        available.push({
          id: "thread",
          name: _I18n.default.t("chat_integration.filter.thread"),
          icon: "chevron-right"
        });
      }

      available.push({
        id: "watch",
        name: _I18n.default.t("chat_integration.filter.watch"),
        icon: "exclamation-circle"
      }, {
        id: "follow",
        name: _I18n.default.t("chat_integration.filter.follow"),
        icon: "circle"
      }, {
        id: "mute",
        name: _I18n.default.t("chat_integration.filter.mute"),
        icon: "times-circle"
      });
      return available;
    },
    available_types: [{
      id: "normal",
      name: _I18n.default.t("chat_integration.type.normal")
    }, {
      id: "group_message",
      name: _I18n.default.t("chat_integration.type.group_message")
    }, {
      id: "group_mention",
      name: _I18n.default.t("chat_integration.type.group_mention")
    }],
    category_id: null,
    tags: null,
    channel_id: null,
    filter: "watch",
    type: "normal",
    error_key: null,
    removeUnneededInfo: function removeUnneededInfo() {
      var type = this.get("type");

      if (type === "normal") {
        this.set("group_id", null);
      } else {
        this.set("category_id", null);
      }
    },
    category: function category(categoryId) {
      if (categoryId) {
        return _category.default.findById(categoryId);
      } else {
        return false;
      }
    },
    filterName: function filterName(filter) {
      return _I18n.default.t("chat_integration.filter.".concat(filter));
    },
    updateProperties: function updateProperties() {
      return this.getProperties(["type", "category_id", "group_id", "tags", "filter"]);
    },
    createProperties: function createProperties() {
      return this.getProperties(["type", "channel_id", "category_id", "group_id", "tags", "filter"]);
    }
  }, (_applyDecoratedDescriptor(_obj, "available_filters", [_dec], Object.getOwnPropertyDescriptor(_obj, "available_filters"), _obj), _applyDecoratedDescriptor(_obj, "removeUnneededInfo", [_dec2], Object.getOwnPropertyDescriptor(_obj, "removeUnneededInfo"), _obj), _applyDecoratedDescriptor(_obj, "category", [_dec3], Object.getOwnPropertyDescriptor(_obj, "category"), _obj), _applyDecoratedDescriptor(_obj, "filterName", [_dec4], Object.getOwnPropertyDescriptor(_obj, "filterName"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/routes/admin-plugins-chat-provider", ["exports", "discourse/routes/discourse", "discourse/models/group"], function (_exports, _discourse, _group) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _discourse.default.extend({
    model: function model(params) {
      var _this = this;

      return Ember.RSVP.hash({
        channels: this.store.findAll("channel", {
          provider: params.provider
        }),
        provider: this.modelFor("admin-plugins-chat").findBy("id", params.provider),
        groups: _group.default.findAll().then(function (groups) {
          return groups.filter(function (g) {
            return !g.get("automatic");
          });
        })
      }).then(function (value) {
        value.channels.forEach(function (channel) {
          channel.set("rules", channel.rules.map(function (rule) {
            rule = _this.store.createRecord("rule", rule);
            rule.set("channel", channel);
            return rule;
          }));
        });
        return value;
      });
    },
    serialize: function serialize(model) {
      return {
        provider: model["provider"].get("id")
      };
    },
    actions: {
      closeModal: function closeModal() {
        if (this.get("controller.modalShowing")) {
          this.refresh();
          this.set("controller.modalShowing", false);
        }

        return true; // Continue bubbling up, so the modal actually closes
      },
      refreshProvider: function refreshProvider() {
        this.refresh();
      }
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/routes/admin-plugins-chat-index", ["exports", "discourse/routes/discourse"], function (_exports, _discourse) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _discourse.default.extend({
    afterModel: function afterModel(model) {
      if (model.totalRows > 0) {
        this.transitionTo("adminPlugins.chat.provider", model.get("firstObject").name);
      }
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/routes/admin-plugins-chat", ["exports", "discourse/routes/discourse"], function (_exports, _discourse) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _discourse.default.extend({
    model: function model() {
      return this.store.findAll("provider");
    },
    actions: {
      showSettings: function showSettings() {
        this.transitionTo("adminSiteSettingsCategory", "plugins", {
          queryParams: {
            filter: "chat_integration"
          }
        });
      }
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/adapters/channel", ["exports", "admin/adapters/build-plugin"], function (_exports, _buildPlugin) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _buildPlugin.default)("chat");

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/adapters/provider", ["exports", "admin/adapters/build-plugin"], function (_exports, _buildPlugin) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _buildPlugin.default)("chat");

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/adapters/rule", ["exports", "admin/adapters/build-plugin"], function (_exports, _buildPlugin) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _buildPlugin.default)("chat");

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/components/channel-details", ["exports", "discourse/lib/ajax-error", "I18n"], function (_exports, _ajaxError, _I18n) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Component.extend({
    classNames: ["channel-details"],
    actions: {
      deleteChannel: function deleteChannel(channel) {
        var _this = this;

        bootbox.confirm(_I18n.default.t("chat_integration.channel_delete_confirm"), _I18n.default.t("no_value"), _I18n.default.t("yes_value"), function (result) {
          if (result) {
            channel.destroyRecord().then(function () {
              return _this.refresh();
            }).catch(_ajaxError.popupAjaxError);
          }
        });
      },
      editRule: function editRule(rule) {
        this.editRuleWithChannel(rule, this.get("channel"));
      }
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/components/rule-row", ["exports", "discourse/lib/ajax-error", "discourse-common/utils/decorators"], function (_exports, _ajaxError, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _dec3, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Component.extend((_dec = (0, _decorators.default)("rule.type"), _dec2 = (0, _decorators.default)("rule.type"), _dec3 = (0, _decorators.default)("rule.type"), (_obj = {
    tagName: "tr",
    isCategory: function isCategory(type) {
      return type === "normal";
    },
    isMessage: function isMessage(type) {
      return type === "group_message";
    },
    isMention: function isMention(type) {
      return type === "group_mention";
    },
    actions: {
      delete: function _delete(rule) {
        var _this = this;

        rule.destroyRecord().then(function () {
          return _this.refresh();
        }).catch(_ajaxError.popupAjaxError);
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "isCategory", [_dec], Object.getOwnPropertyDescriptor(_obj, "isCategory"), _obj), _applyDecoratedDescriptor(_obj, "isMessage", [_dec2], Object.getOwnPropertyDescriptor(_obj, "isMessage"), _obj), _applyDecoratedDescriptor(_obj, "isMention", [_dec3], Object.getOwnPropertyDescriptor(_obj, "isMention"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/components/channel-data", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Component.extend({
    classNames: ["channel-info"]
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/chat-route-map", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    resource: "admin.adminPlugins",
    path: "/plugins",
    map: function map() {
      this.route("chat", function () {
        this.route("provider", {
          path: "/:provider"
        });
      });
    }
  };
  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/admin/templates/modal/admin-plugins-chat-edit-channel"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"param\"],\"statements\":[[4,\"d-modal-body\",null,[[\"id\",\"title\"],[\"chat-integration-edit-channel-modal\",\"chat_integration.edit_channel_modal.title\"]],{\"statements\":[[0,\"  \"],[7,\"div\",true],[8],[0,\"\\n    \"],[7,\"form\",false],[3,\"action\",[[23,0,[]],\"save\"],[[\"on\"],[\"submit\"]]],[8],[0,\"\\n      \"],[7,\"table\",true],[8],[0,\"\\n\\n        \"],[7,\"tr\",true],[10,\"class\",\"input\"],[8],[0,\"\\n          \"],[7,\"td\",true],[10,\"class\",\"label\"],[8],[7,\"label\",true],[10,\"for\",\"provider\"],[8],[1,[28,\"i18n\",[\"chat_integration.edit_channel_modal.provider\"],null],false],[9],[9],[0,\"\\n          \"],[7,\"td\",true],[8],[0,\"\\n            \"],[1,[28,\"i18n\",[[28,\"concat\",[\"chat_integration.provider.\",[24,[\"model\",\"channel\",\"provider\"]],\".title\"],null]],null],false],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"tr\",true],[10,\"class\",\"chat-instructions\"],[8],[0,\"\\n          \"],[7,\"td\",true],[8],[9],[0,\"\\n          \"],[7,\"td\",true],[8],[9],[0,\"\\n        \"],[9],[0,\"\\n\\n\"],[4,\"each\",[[24,[\"model\",\"provider\",\"channel_parameters\"]]],null,{\"statements\":[[0,\"          \"],[7,\"tr\",true],[10,\"class\",\"input\"],[8],[0,\"\\n            \"],[7,\"td\",true],[10,\"class\",\"label\"],[8],[7,\"label\",true],[11,\"for\",[29,[\"param-\",[23,1,[\"key\"]]]]],[8],[1,[28,\"i18n\",[[28,\"concat\",[\"chat_integration.provider.\",[24,[\"model\",\"channel\",\"provider\"]],\".param.\",[23,1,[\"key\"]],\".title\"],null]],null],false],[9],[9],[0,\"\\n            \"],[7,\"td\",true],[8],[0,\"\\n              \"],[1,[28,\"text-field\",null,[[\"name\",\"value\"],[[28,\"concat\",[\"param-\",[23,1,[\"key\"]]],null],[28,\"mut\",[[28,\"get\",[[24,[\"model\",\"channel\",\"data\"]],[23,1,[\"key\"]]],null]],null]]]],false],[0,\"\\n\\n               \\n\"],[4,\"if\",[[28,\"get\",[[24,[\"model\",\"channel\",\"data\"]],[23,1,[\"key\"]]],null]],null,{\"statements\":[[0,\"                \"],[1,[28,\"input-tip\",null,[[\"validation\"],[[28,\"get\",[[24,[\"paramValidation\"]],[23,1,[\"key\"]]],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"            \"],[9],[0,\"\\n          \"],[9],[0,\"\\n          \"],[7,\"tr\",true],[10,\"class\",\"chat-instructions\"],[8],[0,\"\\n            \"],[7,\"td\",true],[8],[9],[0,\"\\n            \"],[7,\"td\",true],[8],[7,\"label\",true],[8],[1,[28,\"i18n\",[[28,\"concat\",[\"chat_integration.provider.\",[24,[\"model\",\"channel\",\"provider\"]],\".param.\",[23,1,[\"key\"]],\".help\"],null]],null],false],[9],[9],[0,\"\\n          \"],[9],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"      \"],[9],[0,\"\\n\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[7,\"div\",true],[10,\"class\",\"modal-footer\"],[8],[0,\"\\n  \"],[1,[28,\"d-button\",null,[[\"id\",\"class\",\"action\",\"title\",\"label\",\"disabled\"],[\"save-channel\",\"btn-primary btn-large\",\"save\",\"chat_integration.edit_channel_modal.save\",\"chat_integration.edit_channel_modal.save\",[24,[\"saveDisabled\"]]]]],false],[0,\"\\n\\n  \"],[1,[28,\"d-button\",null,[[\"class\",\"action\",\"title\",\"label\"],[\"btn-large\",\"cancel\",\"chat_integration.edit_channel_modal.cancel\",\"chat_integration.edit_channel_modal.cancel\"]]],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/admin/templates/modal/admin-plugins-chat-edit-channel"}});
Ember.TEMPLATES["javascripts/admin/templates/modal/admin-plugins-chat-test"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"d-modal-body\",null,[[\"id\",\"title\"],[\"chat_integration_test_modal\",\"chat_integration.test_modal.title\"]],{\"statements\":[[0,\"  \"],[7,\"div\",true],[8],[0,\"\\n    \"],[7,\"form\",false],[3,\"action\",[[23,0,[]],\"send\"],[[\"on\"],[\"submit\"]]],[8],[0,\"\\n      \"],[7,\"table\",true],[8],[0,\"\\n        \"],[7,\"tr\",true],[10,\"class\",\"input\"],[8],[0,\"\\n          \"],[7,\"td\",true],[10,\"class\",\"label\"],[8],[7,\"label\",true],[10,\"for\",\"channel\"],[8],[1,[28,\"i18n\",[\"chat_integration.test_modal.topic\"],null],false],[9],[9],[0,\"\\n          \"],[7,\"td\",true],[8],[0,\"\\n            \"],[1,[28,\"choose-topic\",null,[[\"selectedTopicId\"],[[24,[\"model\",\"topic_id\"]]]]],false],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n      \"],[9],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[7,\"div\",true],[10,\"class\",\"modal-footer\"],[8],[0,\"\\n\"],[4,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"loading\"]]]],{\"statements\":[[0,\"    \"],[1,[28,\"d-button\",null,[[\"id\",\"class\",\"action\",\"title\",\"label\",\"disabled\"],[\"send-test\",\"btn-primary btn-large\",[28,\"action\",[[23,0,[]],\"send\"],null],\"chat_integration.test_modal.send\",\"chat_integration.test_modal.send\",[24,[\"sendDisabled\"]]]]],false],[0,\"\\n\\n    \"],[1,[28,\"d-button\",null,[[\"class\",\"action\",\"title\",\"label\"],[\"btn-large\",[28,\"route-action\",[\"closeModal\"],null],\"chat_integration.test_modal.close\",\"chat_integration.test_modal.close\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/admin/templates/modal/admin-plugins-chat-test"}});
Ember.TEMPLATES["javascripts/admin/templates/modal/admin-plugins-chat-channel-error"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"d-modal-body\",null,[[\"id\"],[\"chat_integration_error_modal\"]],{\"statements\":[[0,\"    \"],[7,\"h4\",true],[8],[1,[28,\"i18n\",[[24,[\"model\",\"error_key\"]]],null],false],[9],[0,\"\\n    \"],[7,\"pre\",true],[8],[1,[24,[\"model\",\"error_info\"]],false],[9],[0,\"\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/admin/templates/modal/admin-plugins-chat-channel-error"}});
Ember.TEMPLATES["javascripts/admin/templates/modal/admin-plugins-chat-edit-rule"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"d-modal-body\",null,[[\"id\",\"title\"],[\"chat-integration-edit-rule_modal\",\"chat_integration.edit_rule_modal.title\"]],{\"statements\":[[0,\"  \"],[7,\"div\",true],[8],[0,\"\\n    \"],[7,\"form\",false],[3,\"action\",[[23,0,[]],\"save\"],[[\"on\"],[\"submit\"]]],[8],[0,\"\\n      \"],[7,\"table\",true],[8],[0,\"\\n\\n        \"],[7,\"tr\",true],[10,\"class\",\"input\"],[8],[0,\"\\n          \"],[7,\"td\",true],[10,\"class\",\"label\"],[8],[7,\"label\",true],[10,\"for\",\"provider\"],[8],[1,[28,\"i18n\",[\"chat_integration.edit_rule_modal.provider\"],null],false],[9],[9],[0,\"\\n          \"],[7,\"td\",true],[8],[0,\"\\n            \"],[1,[28,\"i18n\",[[28,\"concat\",[\"chat_integration.provider.\",[24,[\"model\",\"channel\",\"provider\"]],\".title\"],null]],null],false],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"tr\",true],[10,\"class\",\"chat-instructions\"],[8],[0,\"\\n          \"],[7,\"td\",true],[8],[9],[0,\"\\n          \"],[7,\"td\",true],[8],[9],[0,\"\\n        \"],[9],[0,\"\\n\\n        \"],[7,\"tr\",true],[10,\"class\",\"input\"],[8],[0,\"\\n          \"],[7,\"td\",true],[10,\"class\",\"label\"],[8],[7,\"label\",true],[10,\"for\",\"channel\"],[8],[1,[28,\"i18n\",[\"chat_integration.edit_rule_modal.channel\"],null],false],[9],[9],[0,\"\\n          \"],[7,\"td\",true],[8],[0,\"\\n            \"],[1,[28,\"channel-data\",null,[[\"provider\",\"channel\"],[[24,[\"model\",\"provider\"]],[24,[\"model\",\"channel\"]]]]],false],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"tr\",true],[10,\"class\",\"chat-instructions\"],[8],[0,\"\\n          \"],[7,\"td\",true],[8],[9],[0,\"\\n          \"],[7,\"td\",true],[8],[9],[0,\"\\n        \"],[9],[0,\"\\n\\n        \"],[7,\"tr\",true],[10,\"class\",\"input\"],[8],[0,\"\\n          \"],[7,\"td\",true],[10,\"class\",\"label\"],[8],[7,\"label\",true],[10,\"for\",\"filter\"],[8],[1,[28,\"i18n\",[\"chat_integration.edit_rule_modal.type\"],null],false],[9],[9],[0,\"\\n          \"],[7,\"td\",true],[8],[0,\"\\n            \"],[1,[28,\"combo-box\",null,[[\"name\",\"content\",\"value\"],[\"type\",[24,[\"model\",\"rule\",\"available_types\"]],[24,[\"model\",\"rule\",\"type\"]]]]],false],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"tr\",true],[10,\"class\",\"chat-instructions\"],[8],[0,\"\\n          \"],[7,\"td\",true],[8],[9],[0,\"\\n          \"],[7,\"td\",true],[8],[7,\"label\",true],[8],[1,[28,\"i18n\",[\"chat_integration.edit_rule_modal.instructions.type\"],null],false],[9],[9],[0,\"\\n        \"],[9],[0,\"\\n\\n        \"],[7,\"tr\",true],[10,\"class\",\"input\"],[8],[0,\"\\n          \"],[7,\"td\",true],[10,\"class\",\"label\"],[8],[7,\"label\",true],[10,\"for\",\"filter\"],[8],[1,[28,\"i18n\",[\"chat_integration.edit_rule_modal.filter\"],null],false],[9],[9],[0,\"\\n          \"],[7,\"td\",true],[8],[0,\"\\n            \"],[1,[28,\"combo-box\",null,[[\"name\",\"content\",\"value\"],[\"filter\",[24,[\"model\",\"rule\",\"available_filters\"]],[24,[\"model\",\"rule\",\"filter\"]]]]],false],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"tr\",true],[10,\"class\",\"chat-instructions\"],[8],[0,\"\\n          \"],[7,\"td\",true],[8],[9],[0,\"\\n          \"],[7,\"td\",true],[8],[7,\"label\",true],[8],[1,[28,\"i18n\",[\"chat_integration.edit_rule_modal.instructions.filter\"],null],false],[9],[9],[0,\"\\n        \"],[9],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"showCategory\"]]],null,{\"statements\":[[0,\"          \"],[7,\"tr\",true],[10,\"class\",\"input\"],[8],[0,\"\\n            \"],[7,\"td\",true],[10,\"class\",\"label\"],[8],[7,\"label\",true],[10,\"for\",\"category\"],[8],[1,[28,\"i18n\",[\"chat_integration.edit_rule_modal.category\"],null],false],[9],[9],[0,\"\\n            \"],[7,\"td\",true],[8],[0,\"\\n              \"],[1,[28,\"category-chooser\",null,[[\"name\",\"value\",\"rootNoneLabel\",\"rootNone\",\"overrideWidths\"],[\"category\",[24,[\"model\",\"rule\",\"category_id\"]],\"chat_integration.all_categories\",true,false]]],false],[0,\"\\n            \"],[9],[0,\"\\n          \"],[9],[0,\"\\n          \"],[7,\"tr\",true],[10,\"class\",\"chat-instructions\"],[8],[0,\"\\n            \"],[7,\"td\",true],[8],[9],[0,\"\\n            \"],[7,\"td\",true],[8],[7,\"label\",true],[8],[1,[28,\"i18n\",[\"chat_integration.edit_rule_modal.instructions.category\"],null],false],[9],[9],[0,\"\\n          \"],[9],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"          \"],[7,\"tr\",true],[10,\"class\",\"input\"],[8],[0,\"\\n            \"],[7,\"td\",true],[10,\"class\",\"label\"],[8],[7,\"label\",true],[10,\"for\",\"group\"],[8],[1,[28,\"i18n\",[\"chat_integration.edit_rule_modal.group\"],null],false],[9],[9],[0,\"\\n            \"],[7,\"td\",true],[8],[0,\"\\n              \"],[1,[28,\"combo-box\",null,[[\"content\",\"valueAttribute\",\"value\",\"none\"],[[24,[\"model\",\"groups\"]],\"id\",[24,[\"model\",\"rule\",\"group_id\"]],\"chat_integration.choose_group\"]]],false],[0,\"\\n            \"],[9],[0,\"\\n          \"],[9],[0,\"\\n          \"],[7,\"tr\",true],[10,\"class\",\"chat-instructions\"],[8],[0,\"\\n            \"],[7,\"td\",true],[8],[9],[0,\"\\n            \"],[7,\"td\",true],[8],[7,\"label\",true],[8],[1,[28,\"i18n\",[\"chat_integration.edit_rule_modal.instructions.group\"],null],false],[9],[9],[0,\"\\n          \"],[9],[0,\"\\n\"]],\"parameters\":[]}],[0,\"\\n\"],[4,\"if\",[[24,[\"siteSettings\",\"tagging_enabled\"]]],null,{\"statements\":[[0,\"          \"],[7,\"tr\",true],[10,\"class\",\"input\"],[8],[0,\"\\n            \"],[7,\"td\",true],[10,\"class\",\"label\"],[8],[7,\"label\",true],[10,\"for\",\"tags\"],[8],[1,[28,\"i18n\",[\"chat_integration.edit_rule_modal.tags\"],null],false],[9],[9],[0,\"\\n            \"],[7,\"td\",true],[8],[0,\"\\n              \"],[1,[28,\"tag-chooser\",null,[[\"placeholderKey\",\"name\",\"tags\",\"everyTag\"],[\"chat_integration.all_tags\",\"tags\",[24,[\"model\",\"rule\",\"tags\"]],true]]],false],[0,\"\\n            \"],[9],[0,\"\\n          \"],[9],[0,\"\\n          \"],[7,\"tr\",true],[10,\"class\",\"chat-instructions\"],[8],[0,\"\\n            \"],[7,\"td\",true],[8],[9],[0,\"\\n            \"],[7,\"td\",true],[8],[7,\"label\",true],[8],[1,[28,\"i18n\",[\"chat_integration.edit_rule_modal.instructions.tags\"],null],false],[9],[9],[0,\"\\n          \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n      \"],[9],[0,\"\\n\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[7,\"div\",true],[10,\"class\",\"modal-footer\"],[8],[0,\"\\n  \"],[1,[28,\"d-button\",null,[[\"id\",\"class\",\"action\",\"actionParam\",\"title\",\"label\",\"disabled\"],[\"save-rule\",\"btn-primary btn-large\",\"save\",[24,[\"model\",\"rule\"]],\"chat_integration.edit_rule_modal.save\",\"chat_integration.edit_rule_modal.save\",[24,[\"saveDisabled\"]]]]],false],[0,\"\\n\\n  \"],[1,[28,\"d-button\",null,[[\"class\",\"action\",\"title\",\"label\"],[\"btn-large\",[28,\"route-action\",[\"closeModal\"],null],\"chat_integration.edit_rule_modal.cancel\",\"chat_integration.edit_rule_modal.cancel\"]]],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/admin/templates/modal/admin-plugins-chat-edit-rule"}});
define("discourse/plugins/discourse-chat-integration/admin/controllers/admin-plugins-chat-provider", ["exports", "discourse/lib/show-modal", "discourse-common/utils/decorators"], function (_exports, _showModal, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Controller.extend((_dec = (0, _decorators.default)("model.channels"), (_obj = {
    modalShowing: false,
    anyErrors: function anyErrors(channels) {
      var anyErrors = false;
      channels.forEach(function (channel) {
        if (channel.error_key) {
          anyErrors = true;
        }
      });
      return anyErrors;
    },
    actions: {
      createChannel: function createChannel() {
        this.set("modalShowing", true);
        var model = {
          channel: this.store.createRecord("channel", {
            provider: this.get("model.provider.id"),
            data: {}
          }),
          provider: this.get("model.provider")
        };
        (0, _showModal.default)("admin-plugins-chat-edit-channel", {
          model: model,
          admin: true
        });
      },
      editChannel: function editChannel(channel) {
        this.set("modalShowing", true);
        var model = {
          channel: channel,
          provider: this.get("model.provider")
        };
        (0, _showModal.default)("admin-plugins-chat-edit-channel", {
          model: model,
          admin: true
        });
      },
      testChannel: function testChannel(channel) {
        this.set("modalShowing", true);
        (0, _showModal.default)("admin-plugins-chat-test", {
          model: {
            channel: channel
          },
          admin: true
        });
      },
      createRule: function createRule(channel) {
        this.set("modalShowing", true);
        var model = {
          rule: this.store.createRecord("rule", {
            channel_id: channel.id,
            channel: channel
          }),
          channel: channel,
          provider: this.get("model.provider"),
          groups: this.get("model.groups")
        };
        (0, _showModal.default)("admin-plugins-chat-edit-rule", {
          model: model,
          admin: true
        });
      },
      editRuleWithChannel: function editRuleWithChannel(rule, channel) {
        this.set("modalShowing", true);
        var model = {
          rule: rule,
          channel: channel,
          provider: this.get("model.provider"),
          groups: this.get("model.groups")
        };
        (0, _showModal.default)("admin-plugins-chat-edit-rule", {
          model: model,
          admin: true
        });
      },
      showError: function showError(channel) {
        this.set("modalShowing", true);
        (0, _showModal.default)("admin-plugins-chat-channel-error", {
          model: channel,
          admin: true
        });
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "anyErrors", [_dec], Object.getOwnPropertyDescriptor(_obj, "anyErrors"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/controllers/modals/admin-plugins-chat-test", ["exports", "I18n", "discourse/mixins/modal-functionality", "discourse/lib/ajax", "discourse/lib/ajax-error", "discourse-common/utils/decorators"], function (_exports, _I18n, _modalFunctionality, _ajax, _ajaxError, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Controller.extend(_modalFunctionality.default, (_dec = (0, _decorators.on)("init"), _dec2 = (0, _decorators.default)("model.topic_id"), (_obj = {
    setupKeydown: function setupKeydown() {
      var _this = this;

      Ember.run.schedule("afterRender", function () {
        $("#chat_integration_test_modal").keydown(function (e) {
          if (e.keyCode === 13) {
            _this.send("send");
          }
        });
      });
    },
    sendDisabled: function sendDisabled(topicId) {
      return !topicId;
    },
    actions: {
      send: function send() {
        var _this2 = this;

        if (this.get("sendDisabled")) {
          return;
        }

        this.set("loading", true);
        (0, _ajax.ajax)("/admin/plugins/chat/test", {
          data: {
            channel_id: this.get("model.channel.id"),
            topic_id: this.get("model.topic_id")
          },
          type: "POST"
        }).then(function () {
          _this2.set("loading", false);

          _this2.flash(_I18n.default.t("chat_integration.test_modal.success"), "success");
        }).catch(_ajaxError.popupAjaxError);
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "setupKeydown", [_dec], Object.getOwnPropertyDescriptor(_obj, "setupKeydown"), _obj), _applyDecoratedDescriptor(_obj, "sendDisabled", [_dec2], Object.getOwnPropertyDescriptor(_obj, "sendDisabled"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/controllers/modals/admin-plugins-chat-edit-channel", ["exports", "I18n", "discourse/mixins/modal-functionality", "discourse/lib/ajax-error", "discourse/models/input-validation", "discourse-common/utils/decorators"], function (_exports, _I18n, _modalFunctionality, _ajaxError, _inputValidation, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _dec3, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Controller.extend(_modalFunctionality.default, (_dec = (0, _decorators.on)("init"), _dec2 = (0, _decorators.observes)("model"), _dec3 = (0, _decorators.default)("paramValidation"), (_obj = {
    setupKeydown: function setupKeydown() {
      var _this = this;

      Ember.run.schedule("afterRender", function () {
        $("#chat-integration-edit-channel-modal").keydown(function (e) {
          if (e.keyCode === 13) {
            _this.send("save");
          }
        });
      });
    },
    setupValidations: function setupValidations() {
      if (this.get("model.provider")) {
        var theKeys = this.get("model.provider.channel_parameters").map(function (param) {
          return param["key"];
        });
        Ember.defineProperty(this, "paramValidation", Ember.computed("model.channel.data.{".concat(theKeys.join(","), "}"), this._paramValidation));
      }
    },
    validate: function validate(parameter) {
      var regString = parameter.regex;
      var regex = new RegExp(regString);
      var val = this.get("model.channel.data.".concat(parameter.key));

      if (val === undefined) {
        val = "";
      }

      if (val === "") {
        // Fail silently if field blank
        return _inputValidation.default.create({
          failed: true
        });
      } else if (!regString) {
        // Pass silently if no regex available for provider
        return _inputValidation.default.create({
          ok: true
        });
      } else if (regex.test(val)) {
        // Test against regex
        return _inputValidation.default.create({
          ok: true,
          reason: _I18n.default.t("chat_integration.edit_channel_modal.channel_validation.ok")
        });
      } else {
        // Failed regex
        return _inputValidation.default.create({
          failed: true,
          reason: _I18n.default.t("chat_integration.edit_channel_modal.channel_validation.fail")
        });
      }
    },
    _paramValidation: function _paramValidation() {
      var _this2 = this;

      var response = {};
      var parameters = this.get("model.provider.channel_parameters");
      parameters.forEach(function (parameter) {
        response[parameter.key] = _this2.validate(parameter);
      });
      return response;
    },
    saveDisabled: function saveDisabled(paramValidation) {
      if (!paramValidation) {
        return true;
      }

      var invalid = false;
      Object.keys(paramValidation).forEach(function (key) {
        if (!paramValidation[key]) {
          invalid = true;
        }

        if (!paramValidation[key]["ok"]) {
          invalid = true;
        }
      });
      return invalid;
    },
    actions: {
      cancel: function cancel() {
        this.send("closeModal");
      },
      save: function save() {
        var _this3 = this;

        if (this.get("saveDisabled")) {
          return;
        }

        this.get("model.channel").save().then(function () {
          _this3.send("closeModal");
        }).catch(_ajaxError.popupAjaxError);
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "setupKeydown", [_dec], Object.getOwnPropertyDescriptor(_obj, "setupKeydown"), _obj), _applyDecoratedDescriptor(_obj, "setupValidations", [_dec2], Object.getOwnPropertyDescriptor(_obj, "setupValidations"), _obj), _applyDecoratedDescriptor(_obj, "saveDisabled", [_dec3], Object.getOwnPropertyDescriptor(_obj, "saveDisabled"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/controllers/modals/admin-plugins-chat-edit-rule", ["exports", "discourse/mixins/modal-functionality", "discourse/lib/ajax-error", "discourse-common/utils/decorators"], function (_exports, _modalFunctionality, _ajaxError, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Controller.extend(_modalFunctionality.default, (_dec = (0, _decorators.on)("init"), _dec2 = (0, _decorators.default)("model.rule.type"), (_obj = {
    saveDisabled: false,
    setupKeydown: function setupKeydown() {
      var _this = this;

      Ember.run.schedule("afterRender", function () {
        $("#chat-integration-edit-channel-modal").keydown(function (e) {
          if (e.keyCode === 13) {
            _this.send("save");
          }
        });
      });
    },
    showCategory: function showCategory(type) {
      return type === "normal";
    },
    actions: {
      save: function save(rule) {
        var _this2 = this;

        if (this.get("saveDisabled")) {
          return;
        }

        rule.save().then(function () {
          return _this2.send("closeModal");
        }).catch(_ajaxError.popupAjaxError);
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "setupKeydown", [_dec], Object.getOwnPropertyDescriptor(_obj, "setupKeydown"), _obj), _applyDecoratedDescriptor(_obj, "showCategory", [_dec2], Object.getOwnPropertyDescriptor(_obj, "showCategory"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/discourse-chat-integration/admin/controllers/admin-plugins-chat", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Controller.extend({});

  _exports.default = _default;
});


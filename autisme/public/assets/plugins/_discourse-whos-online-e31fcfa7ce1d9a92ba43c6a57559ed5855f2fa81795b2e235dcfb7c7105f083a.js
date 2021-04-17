define("discourse/plugins/discourse-whos-online/discourse/components/whos-online-avatar", ["exports", "ember"], function (_exports, _ember) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _ember.default.Component.extend({
    tagName: "a",
    attributeBindings: ["user.username:data-user-card", "user.path:href"]
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-whos-online/discourse/components/whos-online", ["exports", "ember"], function (_exports, _ember) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var inject = _ember.default.inject;

  var _default = _ember.default.Component.extend({
    showWhosOnline: function () {
      // If the number of users is less than the minimum, and it's set to hide, hide it
      if (this.get("online").users.length < this.siteSettings.whos_online_minimum_display && this.siteSettings.whos_online_hide_below_minimum_display) {
        return false;
      }

      return this.get("online").get("shouldDisplay");
    }.property(),
    online: inject.service("online-service"),
    users: function () {
      return this.get("online").users.slice(0, this.siteSettings.whos_online_maximum_display);
    }.property("online.users.@each"),
    isLong: function () {
      return this.get("online").users.length >= this.siteSettings.whos_online_collapse_threshold;
    }.property("online.users.length"),
    isUsers: function () {
      return this.get("online").users.length >= this.siteSettings.whos_online_minimum_display;
    }.property("online.users.length")
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-whos-online/discourse/initializers/start-whos-online", ["exports", "discourse/lib/plugin-api", "discourse-common/utils/decorators"], function (_exports, _pluginApi, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var inject = Ember.inject;
  var _default = {
    name: "start-whos-online",
    initialize: function initialize(container) {
      var onlineService = container.lookup("service:online-service");
      var siteSettings = container.lookup("site-settings:main"); // If user not allowed, don't display

      if (!onlineService.get("shouldDisplay")) {
        return;
      }

      var indicatorType = siteSettings.whos_online_avatar_indicator; // If feature disabled, don't display

      if (indicatorType === "none") {
        return;
      } // Set the html class accordingly


      $("html").addClass("whos-online-".concat(indicatorType));
      (0, _pluginApi.withPluginApi)("0.2", function (api) {
        var _dec, _obj;

        api.modifyClass("component:user-card-contents", (_dec = (0, _decorators.default)("user", "onlineService.users.@each"), (_obj = {
          onlineService: inject.service("online-service"),
          classNameBindings: ["isOnline:user-online"],
          isOnline: function isOnline(user) {
            if (!user) {
              return false;
            }

            return this.onlineService.isUserOnline(user.id);
          }
        }, (_applyDecoratedDescriptor(_obj, "isOnline", [_dec], Object.getOwnPropertyDescriptor(_obj, "isOnline"), _obj)), _obj))); // This is a bit hacky, since the user page doesn't currently
        // use components

        api.modifyClass("route:user", {
          onlineService: inject.service("online-service"),
          afterModel: function afterModel() {
            this.updateBodyClass();
            return this._super();
          },
          updateBodyClass: function () {
            var user_id = this.modelFor("user").id;
            var isOnline = this.get("onlineService").isUserOnline(user_id);

            if (isOnline) {
              Ember.$("body").addClass("user-page-online");
            } else {
              Ember.$("body").removeClass("user-page-online");
            }
          }.observes("onlineService.users.@each"),
          deactivate: function deactivate() {
            this._super();

            Ember.$("body").removeClass("user-page-online");
          }
        });

        if (siteSettings.whos_online_avatar_indicator_topic_lists) {
          var _dec2, _obj2, _dec3, _obj3;

          api.modifyClass("component:topic-list-item", (_dec2 = (0, _decorators.default)("topic.lastPoster.id", "topic.lastPosterUser.id", "onlineService.users.@each"), (_obj2 = {
            onlineService: inject.service("online-service"),
            classNameBindings: ["isOnline:last-poster-online"],
            isOnline: function isOnline(lastPosterId, lastPosterUserId) {
              return this.get("onlineService").isUserOnline(lastPosterId || lastPosterUserId);
            }
          }, (_applyDecoratedDescriptor(_obj2, "isOnline", [_dec2], Object.getOwnPropertyDescriptor(_obj2, "isOnline"), _obj2)), _obj2)));
          api.modifyClass("component:latest-topic-list-item", (_dec3 = (0, _decorators.default)("topic.lastPoster.id", "topic.lastPosterUser.id", "onlineService.users.@each"), (_obj3 = {
            onlineService: inject.service("online-service"),
            classNameBindings: ["isOnline:last-poster-online"],
            isOnline: function isOnline(lastPosterId, lastPosterUserId) {
              return this.get("onlineService").isUserOnline(lastPosterId || lastPosterUserId);
            }
          }, (_applyDecoratedDescriptor(_obj3, "isOnline", [_dec3], Object.getOwnPropertyDescriptor(_obj3, "isOnline"), _obj3)), _obj3)));
        }

        api.modifyClass("component:scrolling-post-stream", {
          didInsertElement: function didInsertElement() {
            var _this = this;

            this._super();

            this.appEvents.on("whosonline:changed", function (changedUserIds) {
              changedUserIds.forEach(function (id) {
                var postIds = _this.get("attrs").posts.value.posts.filter(function (_ref) {
                  var user_id = _ref.user_id;
                  return user_id === id;
                }).map(function (post) {
                  return post.id;
                });

                postIds.forEach(function (postId) {
                  _this.dirtyKeys.keyDirty("post-".concat(postId));

                  _this.dirtyKeys.keyDirty("post-".concat(postId, "-avatar-").concat(id), {
                    onRefresh: "updateOnline"
                  });
                });
              });

              _this.queueRerender();
            });
          },
          willDestroyElement: function willDestroyElement() {
            this.appEvents.off("whosonline:changed");
          }
        });
        api.reopenWidget("post-avatar", {
          buildKey: function buildKey(attrs) {
            return "post-".concat(attrs.id, "-avatar-").concat(attrs.user_id);
          },
          defaultState: function defaultState(attrs) {
            return {
              online: onlineService.isUserOnline(attrs.user_id)
            };
          },
          updateOnline: function updateOnline() {
            this.state.online = onlineService.isUserOnline(this.attrs.user_id);
          },
          buildClasses: function buildClasses(attrs, state) {
            if (state.online) {
              return "user-online";
            }

            return [];
          }
        });
      });
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-whos-online/discourse/services/online-service", ["exports", "ember", "discourse/lib/ajax", "discourse/models/user", "discourse/models/site"], function (_exports, _ember, _ajax, _user, _site) {
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

  var _default = _ember.default.Service.extend({
    after: "message-bus",
    messageBus: window.MessageBus,
    users: [],
    appEvents: Discourse.__container__.lookup("service:app-events"),
    siteSettings: Discourse.__container__.lookup("site-settings:main"),
    _lastMessageId: null,
    isUserOnline: function isUserOnline(user_id) {
      var matchById = function matchById(element) {
        return element.id === this;
      };

      var found = this.get("users").find(matchById, user_id);

      if (found !== undefined) {
        return true;
      }

      return false;
    },
    messageProcessor: function messageProcessor() {
      var onlineService = this;
      return function (data, global_id, message_id) {
        var currentUsers = onlineService.get("users");
        var last_message_id = onlineService.get("_lastMessageId");

        if (message_id !== last_message_id + 1) {
          // If not the next message
          onlineService.messageBus.unsubscribe("/whos-online", this.func); // Fetch up to date data

          (0, _ajax.ajax)("/whosonline/get.json", {
            method: "GET"
          }).then(function (result) {
            var oldUserIds = currentUsers.map(function (user) {
              return user.get("id");
            });
            onlineService.set("users", result["users"].map(function (user) {
              return _user.default.create(user);
            }));
            var newUserIds = onlineService.get("users").map(function (user) {
              return user.get("id");
            });
            onlineService.set("_lastMessageId", result["messagebus_id"]);
            onlineService.messageBus.subscribe("/whos-online", onlineService.messageProcessor(), result["messagebus_id"]);
            var changedUsers = [].concat(_toConsumableArray(oldUserIds), _toConsumableArray(newUserIds));
            onlineService.appEvents.trigger("whosonline:changed", changedUsers);
          }, function (msg) {
            console.log(msg); // eslint-disable-line no-console
          });
          return;
        }

        onlineService.set("_lastMessageId", message_id);

        switch (data["message_type"]) {
          case "going_online":
            var user = _user.default.create(data["user"]);

            currentUsers.pushObject(user);
            onlineService.appEvents.trigger("whosonline:changed", [user.get("id")]);
            break;

          case "going_offline":
            var matchById = function matchById(element) {
              return element.get("id") === this;
            };

            data["users"].forEach(function (user_id) {
              var found = currentUsers.find(matchById, user_id);

              if (found !== undefined) {
                currentUsers.removeObject(found);
              }
            });
            onlineService.appEvents.trigger("whosonline:changed", data["users"]);
            break;

          default:
            console.error("Unknown message type sent to /whos-online"); // eslint-disable-line no-console

            break;
        }
      };
    },
    init: function init() {
      var startingData = _site.default.currentProp("users_online");

      if (startingData) {
        this.set("users", startingData["users"].map(function (user) {
          return _user.default.create(user);
        }));
        this.set("_lastMessageId", startingData["messagebus_id"]);
        this.appEvents.trigger("whosonline:changed", startingData["users"].map(function (_ref) {
          var id = _ref.id;
          return id;
        }));
        this.messageBus.subscribe("/whos-online", this.messageProcessor(), startingData["messagebus_id"]);
      }

      this._super.apply(this, arguments);
    },
    shouldDisplay: function () {
      // If the plugin is disabled, return false
      if (!this.siteSettings.whos_online_enabled) {
        return false;
      } // If it's visible to the public, always make visible


      if (this.siteSettings.whos_online_display_public) {
        return true;
      } // Check user trust levels


      var currentUser = Discourse.User.current();

      if (currentUser === null) {
        return false;
      } else {
        return currentUser.trust_level >= this.siteSettings.whos_online_display_min_trust_level;
      }
    }.property()
  });

  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/components/whos-online-avatar"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"avatar\",[[24,[\"user\"]]],[[\"avatarTemplatePath\",\"title\",\"imageSize\"],[\"avatar_template\",[24,[\"user\",\"username\"]],\"small\"]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/whos-online-avatar"}});
Ember.TEMPLATES["javascripts/components/whos-online"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"user\"],\"statements\":[[4,\"if\",[[24,[\"showWhosOnline\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"id\",\"whos-online\"],[11,\"class\",[28,\"if\",[[24,[\"isLong\"]],\"collapsed\"],null]],[8],[0,\"\\n    \"],[7,\"span\",true],[11,\"title\",[28,\"i18n\",[\"whos_online.tooltip\"],null]],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"isUsers\"]]],null,{\"statements\":[[0,\"        \"],[1,[28,\"i18n\",[\"whos_online.title\"],[[\"count\"],[[24,[\"online\",\"users\",\"length\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"        \"],[1,[28,\"i18n\",[\"whos_online.no_users\"],null],false],[0,\"\\n\"]],\"parameters\":[]}],[0,\"    \"],[9],[0,\"\\n\"],[4,\"if\",[[24,[\"isUsers\"]]],null,{\"statements\":[[4,\"each\",[[24,[\"users\"]]],null,{\"statements\":[[0,\"        \"],[1,[28,\"whos-online-avatar\",null,[[\"user\"],[[23,1,[]]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null]],\"parameters\":[]},null],[0,\"  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/whos-online"}});
Ember.TEMPLATES["javascripts/connectors/discovery-list-container-top/online_users_widget"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[22,\"whos-online\"],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/connectors/discovery-list-container-top/online_users_widget"}});


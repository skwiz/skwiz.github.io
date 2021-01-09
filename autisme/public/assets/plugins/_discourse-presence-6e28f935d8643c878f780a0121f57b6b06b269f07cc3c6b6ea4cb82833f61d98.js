define("discourse/plugins/discourse-presence/discourse/lib/presence", ["exports", "@ember/runloop", "@ember/object", "discourse/lib/ajax", "discourse-common/utils/decorators"], function (_exports, _runloop, _object, _ajax, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _exports.COMPOSER_TYPE = _exports.TOPIC_TYPE = _exports.CLOSED = _exports.EDITING = _exports.REPLYING = _exports.KEEP_ALIVE_DURATION_SECONDS = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  // The durations chosen here determines the accuracy of the presence feature and
  // is tied closely with the server side implementation. Decreasing the duration
  // to increase the accuracy will come at the expense of having to more network
  // calls to publish the client's state.
  //
  // Logic walk through of our heuristic implementation:
  // - When client A is typing, a message is published every KEEP_ALIVE_DURATION_SECONDS.
  // - Client B receives the message and stores each user in an array and marks
  //   the user with a client-side timestamp of when the user was seen.
  // - If client A continues to type, client B will continue to receive messages to
  //   update the client-side timestamp of when client A was last seen.
  // - If client A disconnects or becomes inactive, the state of client A will be
  //   cleaned up on client B by a scheduler that runs every TIMER_INTERVAL_MILLISECONDS
  var KEEP_ALIVE_DURATION_SECONDS = 10;
  _exports.KEEP_ALIVE_DURATION_SECONDS = KEEP_ALIVE_DURATION_SECONDS;
  var BUFFER_DURATION_SECONDS = KEEP_ALIVE_DURATION_SECONDS + 2;
  var MESSAGE_BUS_LAST_ID = 0;
  var TIMER_INTERVAL_MILLISECONDS = 2000;
  var REPLYING = "replying";
  _exports.REPLYING = REPLYING;
  var EDITING = "editing";
  _exports.EDITING = EDITING;
  var CLOSED = "closed";
  _exports.CLOSED = CLOSED;
  var TOPIC_TYPE = "topic";
  _exports.TOPIC_TYPE = TOPIC_TYPE;
  var COMPOSER_TYPE = "composer";
  _exports.COMPOSER_TYPE = COMPOSER_TYPE;

  var Presence = _object.default.extend((_dec = (0, _decorators.default)("topicId"), (_obj = {
    users: null,
    editingUsers: null,
    subscribers: null,
    topicId: null,
    currentUser: null,
    messageBus: null,
    siteSettings: null,
    init: function init() {
      this._super.apply(this, arguments);

      this.setProperties({
        users: [],
        editingUsers: [],
        subscribers: new Set()
      });
    },
    subscribe: function subscribe(type) {
      var _this = this;

      if (this.subscribers.size === 0) {
        this.messageBus.subscribe(this.channel, function (message) {
          var user = message.user,
              state = message.state;

          if (_this.get("currentUser.id") === user.id) {
            return;
          }

          switch (state) {
            case REPLYING:
              _this._appendUser(_this.users, user);

              break;

            case EDITING:
              _this._appendUser(_this.editingUsers, user, {
                post_id: parseInt(message.post_id, 10)
              });

              break;

            case CLOSED:
              _this._removeUser(user);

              break;
          }
        }, MESSAGE_BUS_LAST_ID);
      }

      this.subscribers.add(type);
    },
    unsubscribe: function unsubscribe(type) {
      this.subscribers.delete(type);
      var noSubscribers = this.subscribers.size === 0;

      if (noSubscribers) {
        this.messageBus.unsubscribe(this.channel);

        this._stopTimer();

        this.setProperties({
          users: [],
          editingUsers: []
        });
      }

      return noSubscribers;
    },
    channel: function channel(topicId) {
      return "/presence/".concat(topicId);
    },
    publish: function publish(state, whisper, postId, staffOnly) {
      // NOTE: `user_option` is the correct place to get this value from, but
      //       it may not have been set yet. It will always have been set directly
      //       on the currentUser, via the preloaded_json payload.
      // TODO: Remove this when preloaded_json is refactored.
      var hiddenProfile = this.get("currentUser.user_option.hide_profile_and_presence");

      if (hiddenProfile === undefined) {
        hiddenProfile = this.get("currentUser.hide_profile_and_presence");
      }

      if (hiddenProfile && this.get("siteSettings.allow_users_to_hide_profile")) {
        return;
      }

      var data = {
        state: state,
        topic_id: this.topicId
      };

      if (whisper) {
        data.is_whisper = true;
      }

      if (postId && state === EDITING) {
        data.post_id = postId;
      }

      if (staffOnly) {
        data.staff_only = true;
      }

      return (0, _ajax.ajax)("/presence/publish", {
        type: "POST",
        data: data
      });
    },
    _removeUser: function _removeUser(user) {
      [this.users, this.editingUsers].forEach(function (users) {
        var existingUser = users.findBy("id", user.id);

        if (existingUser) {
          users.removeObject(existingUser);
        }
      });
    },
    _cleanUpUsers: function _cleanUpUsers() {
      [this.users, this.editingUsers].forEach(function (users) {
        var staleUsers = [];
        users.forEach(function (user) {
          if (user.last_seen <= Date.now() - BUFFER_DURATION_SECONDS * 1000) {
            staleUsers.push(user);
          }
        });
        users.removeObjects(staleUsers);
      });
      return this.users.length === 0 && this.editingUsers.length === 0;
    },
    _appendUser: function _appendUser(users, user, attrs) {
      var _this2 = this;

      var existingUser;
      var usersLength = 0;
      users.forEach(function (u) {
        if (u.id === user.id) {
          existingUser = u;
        }

        if (attrs && attrs.post_id) {
          if (u.post_id === attrs.post_id) {
            usersLength++;
          }
        } else {
          usersLength++;
        }
      });
      var props = attrs || {};
      props.last_seen = Date.now();

      if (existingUser) {
        existingUser.setProperties(props);
      } else {
        var limit = this.get("siteSettings.presence_max_users_shown");

        if (usersLength < limit) {
          users.pushObject(_object.default.create(Object.assign(user, props)));
        }
      }

      this._startTimer(function () {
        _this2._cleanUpUsers();
      });
    },
    _scheduleTimer: function _scheduleTimer(callback) {
      var _this3 = this;

      return (0, _runloop.later)(this, function () {
        var stop = callback();

        if (!stop) {
          _this3.set("_timer", _this3._scheduleTimer(callback));
        }
      }, TIMER_INTERVAL_MILLISECONDS);
    },
    _stopTimer: function _stopTimer() {
      (0, _runloop.cancel)(this._timer);
    },
    _startTimer: function _startTimer(callback) {
      if (!this._timer) {
        this.set("_timer", this._scheduleTimer(callback));
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "channel", [_dec], Object.getOwnPropertyDescriptor(_obj, "channel"), _obj)), _obj)));

  var _default = Presence;
  _exports.default = _default;
});
define("discourse/plugins/discourse-presence/discourse/services/presence-manager", ["exports", "discourse/plugins/discourse-presence/discourse/lib/presence", "@ember/service"], function (_exports, _presence, _service) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var PresenceManager = _service.default.extend({
    presences: null,
    init: function init() {
      this._super.apply(this, arguments);

      this.setProperties({
        presences: {}
      });
    },
    subscribe: function subscribe(topicId, type) {
      if (!topicId) {
        return;
      }

      this._getPresence(topicId).subscribe(type);
    },
    unsubscribe: function unsubscribe(topicId, type) {
      if (!topicId) {
        return;
      }

      var presence = this._getPresence(topicId);

      if (presence.unsubscribe(type)) {
        delete this.presences[topicId];
      }
    },
    users: function users(topicId) {
      if (!topicId) {
        return [];
      }

      return this._getPresence(topicId).users;
    },
    editingUsers: function editingUsers(topicId) {
      if (!topicId) {
        return [];
      }

      return this._getPresence(topicId).editingUsers;
    },
    publish: function publish(topicId, state, whisper, postId, staffOnly) {
      if (!topicId) {
        return;
      }

      return this._getPresence(topicId).publish(state, whisper, postId, staffOnly);
    },
    cleanUpPresence: function cleanUpPresence(type) {
      var _this = this;

      Object.keys(this.presences).forEach(function (key) {
        _this.publish(key, _presence.CLOSED);

        _this.unsubscribe(key, type);
      });
    },
    _getPresence: function _getPresence(topicId) {
      if (!this.presences[topicId]) {
        this.presences[topicId] = _presence.default.create({
          messageBus: this.messageBus,
          siteSettings: this.siteSettings,
          currentUser: this.currentUser,
          topicId: topicId
        });
      }

      return this.presences[topicId];
    }
  });

  var _default = PresenceManager;
  _exports.default = _default;
});
define("discourse/plugins/discourse-presence/discourse/components/composer-presence-display", ["exports", "discourse/plugins/discourse-presence/discourse/lib/presence", "@ember/runloop", "discourse-common/utils/decorators", "@ember/object/computed", "@ember/component", "@ember/service"], function (_exports, _presence, _runloop, _decorators, _computed, _component, _service) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_dec = (0, _decorators.default)("model.topic.id"), _dec2 = (0, _decorators.default)("model.topic.id"), _dec3 = (0, _decorators.on)("didInsertElement"), _dec4 = (0, _decorators.default)("model.post.id", "editingUsers.@each.last_seen", "users.@each.last_seen", "isReply", "isEdit"), _dec5 = (0, _decorators.observes)("model.reply", "model.title"), _dec6 = (0, _decorators.observes)("model.whisper"), _dec7 = (0, _decorators.observes)("model.action", "model.topic.id"), _dec8 = (0, _decorators.on)("willDestroyElement"), (_obj = {
    // Passed in variables
    presenceManager: (0, _service.inject)(),
    users: function users(topicId) {
      return this.presenceManager.users(topicId);
    },
    editingUsers: function editingUsers(topicId) {
      return this.presenceManager.editingUsers(topicId);
    },
    isReply: (0, _computed.readOnly)("model.replyingToTopic"),
    isEdit: (0, _computed.readOnly)("model.editingPost"),
    subscribe: function subscribe() {
      this.presenceManager.subscribe(this.get("model.topic.id"), _presence.COMPOSER_TYPE);
    },
    presenceUsers: function presenceUsers(postId, editingUsers, users, isReply, isEdit) {
      if (isEdit) {
        return editingUsers.filterBy("post_id", postId);
      } else if (isReply) {
        return users;
      }

      return [];
    },
    shouldDisplay: (0, _computed.gt)("presenceUsers.length", 0),
    typing: function typing() {
      (0, _runloop.throttle)(this, this._typing, _presence.KEEP_ALIVE_DURATION_SECONDS * 1000);
    },
    _typing: function _typing() {
      if (!this.isReply && !this.isEdit || !this.get("model.composerOpened")) {
        return;
      }

      var data = {
        topicId: this.get("model.topic.id"),
        state: this.isEdit ? _presence.EDITING : _presence.REPLYING,
        whisper: this.get("model.whisper"),
        postId: this.get("model.post.id"),
        presenceStaffOnly: this.get("model._presenceStaffOnly")
      };
      this._prevPublishData = data;
      this._throttle = this.presenceManager.publish(data.topicId, data.state, data.whisper, data.postId, data.presenceStaffOnly);
    },
    cancelThrottle: function cancelThrottle() {
      this._cancelThrottle();
    },
    composerState: function composerState() {
      if (this._prevPublishData) {
        this.presenceManager.publish(this._prevPublishData.topicId, _presence.CLOSED, this._prevPublishData.whisper, this._prevPublishData.postId);
        this._prevPublishData = null;
      }
    },
    closeComposer: function closeComposer() {
      this._cancelThrottle();

      this._prevPublishData = null;
      this.presenceManager.cleanUpPresence(_presence.COMPOSER_TYPE);
    },
    _cancelThrottle: function _cancelThrottle() {
      if (this._throttle) {
        (0, _runloop.cancel)(this._throttle);
        this._throttle = null;
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "users", [_dec], Object.getOwnPropertyDescriptor(_obj, "users"), _obj), _applyDecoratedDescriptor(_obj, "editingUsers", [_dec2], Object.getOwnPropertyDescriptor(_obj, "editingUsers"), _obj), _applyDecoratedDescriptor(_obj, "subscribe", [_dec3], Object.getOwnPropertyDescriptor(_obj, "subscribe"), _obj), _applyDecoratedDescriptor(_obj, "presenceUsers", [_dec4], Object.getOwnPropertyDescriptor(_obj, "presenceUsers"), _obj), _applyDecoratedDescriptor(_obj, "typing", [_dec5], Object.getOwnPropertyDescriptor(_obj, "typing"), _obj), _applyDecoratedDescriptor(_obj, "cancelThrottle", [_dec6], Object.getOwnPropertyDescriptor(_obj, "cancelThrottle"), _obj), _applyDecoratedDescriptor(_obj, "composerState", [_dec7], Object.getOwnPropertyDescriptor(_obj, "composerState"), _obj), _applyDecoratedDescriptor(_obj, "closeComposer", [_dec8], Object.getOwnPropertyDescriptor(_obj, "closeComposer"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/discourse-presence/discourse/components/topic-presence-display", ["exports", "discourse-common/utils/decorators", "@ember/component", "discourse/plugins/discourse-presence/discourse/lib/presence", "@ember/object/computed", "@ember/service"], function (_exports, _decorators, _component, _presence, _computed, _service) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _dec3, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_dec = (0, _decorators.default)("topic.id"), _dec2 = (0, _decorators.on)("didInsertElement"), _dec3 = (0, _decorators.on)("willDestroyElement"), (_obj = {
    topic: null,
    presenceManager: (0, _service.inject)(),
    users: function users(topicId) {
      return this.presenceManager.users(topicId);
    },
    shouldDisplay: (0, _computed.gt)("users.length", 0),
    subscribe: function subscribe() {
      this.presenceManager.subscribe(this.get("topic.id"), _presence.TOPIC_TYPE);
    },
    _destroyed: function _destroyed() {
      this.presenceManager.unsubscribe(this.get("topic.id"), _presence.TOPIC_TYPE);
    }
  }, (_applyDecoratedDescriptor(_obj, "users", [_dec], Object.getOwnPropertyDescriptor(_obj, "users"), _obj), _applyDecoratedDescriptor(_obj, "subscribe", [_dec2], Object.getOwnPropertyDescriptor(_obj, "subscribe"), _obj), _applyDecoratedDescriptor(_obj, "_destroyed", [_dec3], Object.getOwnPropertyDescriptor(_obj, "_destroyed"), _obj)), _obj)));

  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/connectors/topic-above-footer-buttons/presence"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"topic-presence-display\",null,[[\"topic\"],[[24,[\"model\"]]]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/connectors/topic-above-footer-buttons/presence"}});
define("discourse/plugins/discourse-presence/discourse/templates/connectors/topic-above-footer-buttons/presence", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    shouldRender: function shouldRender(_, component) {
      return component.siteSettings.presence_enabled;
    }
  };
  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/connectors/composer-fields/presence"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"composer-presence-display\",null,[[\"model\"],[[24,[\"model\"]]]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/connectors/composer-fields/presence"}});
define("discourse/plugins/discourse-presence/discourse/templates/connectors/composer-fields/presence", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    shouldRender: function shouldRender(_, component) {
      return component.siteSettings.presence_enabled;
    }
  };
  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/components/topic-presence-display"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"user\"],\"statements\":[[4,\"if\",[[24,[\"shouldDisplay\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"presence-users\"],[8],[0,\"\\n    \"],[7,\"div\",true],[10,\"class\",\"presence-avatars\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"users\"]]],null,{\"statements\":[[0,\"        \"],[1,[28,\"avatar\",[[23,1,[]]],[[\"avatarTemplatePath\",\"usernamePath\",\"imageSize\"],[\"avatar_template\",\"username\",\"small\"]]],false],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"    \"],[9],[0,\"\\n    \"],[7,\"span\",true],[10,\"class\",\"presence-text\"],[8],[0,\"\\n      \"],[7,\"span\",true],[10,\"class\",\"description\"],[8],[1,[28,\"i18n\",[\"presence.replying_to_topic\"],[[\"count\"],[[24,[\"users\",\"length\"]]]]],false],[9],[7,\"span\",true],[10,\"class\",\"wave\"],[8],[7,\"span\",true],[10,\"class\",\"dot\"],[8],[0,\".\"],[9],[7,\"span\",true],[10,\"class\",\"dot\"],[8],[0,\".\"],[9],[7,\"span\",true],[10,\"class\",\"dot\"],[8],[0,\".\"],[9],[9],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/topic-presence-display"}});
Ember.TEMPLATES["javascripts/components/composer-presence-display"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"user\"],\"statements\":[[4,\"if\",[[24,[\"shouldDisplay\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"presence-users\"],[8],[0,\"\\n    \"],[7,\"div\",true],[10,\"class\",\"presence-avatars\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"presenceUsers\"]]],null,{\"statements\":[[0,\"        \"],[1,[28,\"avatar\",[[23,1,[]]],[[\"avatarTemplatePath\",\"usernamePath\",\"imageSize\"],[\"avatar_template\",\"username\",\"small\"]]],false],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"    \"],[9],[0,\"\\n    \"],[7,\"span\",true],[10,\"class\",\"presence-text\"],[8],[0,\"\\n      \"],[7,\"span\",true],[10,\"class\",\"description\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"isReply\"]]],null,{\"statements\":[[1,[28,\"i18n\",[\"presence.replying\"],[[\"count\"],[[24,[\"presenceUsers\",\"length\"]]]]],false]],\"parameters\":[]},{\"statements\":[[1,[28,\"i18n\",[\"presence.editing\"],[[\"count\"],[[24,[\"presenceUsers\",\"length\"]]]]],false]],\"parameters\":[]}],[0,\"      \"],[9],[9],[7,\"span\",true],[10,\"class\",\"wave\"],[8],[0,\"\\n      \"],[7,\"span\",true],[10,\"class\",\"dot\"],[8],[0,\".\"],[9],[7,\"span\",true],[10,\"class\",\"dot\"],[8],[0,\".\"],[9],[7,\"span\",true],[10,\"class\",\"dot\"],[8],[0,\".\"],[9],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/composer-presence-display"}});


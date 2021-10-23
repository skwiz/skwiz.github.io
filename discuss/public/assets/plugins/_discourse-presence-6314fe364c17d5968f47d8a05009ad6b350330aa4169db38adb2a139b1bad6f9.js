define("discourse/plugins/discourse-presence/discourse/components/composer-presence-display", ["exports", "discourse-common/utils/decorators", "@ember/object/computed", "@ember/component", "@ember/service"], function (_exports, _decorators, _computed, _component, _service) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_dec = (0, _decorators.default)("model.replyingToTopic", "model.editingPost", "model.whisper", "model.composerOpened", "isDestroying"), _dec2 = (0, _decorators.default)("model.topic.id", "isReply", "isWhisper"), _dec3 = (0, _decorators.default)("model.topic.id", "isReply", "isWhisper"), _dec4 = (0, _decorators.default)("isEdit", "model.post.id"), _dec5 = (0, _decorators.observes)("replyChannelName", "whisperChannelName", "editChannelName"), _dec6 = (0, _decorators.default)("isReply", "replyingUsers.[]", "editingUsers.[]"), _dec7 = (0, _decorators.on)("didInsertElement"), _dec8 = (0, _decorators.observes)("model.reply", "state", "model.post.id", "model.topic.id"), _dec9 = (0, _decorators.on)("willDestroyElement"), (_obj = {
    presence: (0, _service.inject)(),
    composerPresenceManager: (0, _service.inject)(),
    state: function state(replyingToTopic, editingPost, whisper, composerOpen, isDestroying) {
      if (!composerOpen || isDestroying) {
        return;
      } else if (editingPost) {
        return "edit";
      } else if (whisper) {
        return "whisper";
      } else if (replyingToTopic) {
        return "reply";
      }
    },
    isReply: (0, _computed.equal)("state", "reply"),
    isEdit: (0, _computed.equal)("state", "edit"),
    isWhisper: (0, _computed.equal)("state", "whisper"),
    replyChannelName: function replyChannelName(topicId, isReply, isWhisper) {
      if (topicId && (isReply || isWhisper)) {
        return "/discourse-presence/reply/".concat(topicId);
      }
    },
    whisperChannelName: function whisperChannelName(topicId, isReply, isWhisper) {
      if (topicId && this.currentUser.staff && (isReply || isWhisper)) {
        return "/discourse-presence/whisper/".concat(topicId);
      }
    },
    editChannelName: function editChannelName(isEdit, postId) {
      if (isEdit) {
        return "/discourse-presence/edit/".concat(postId);
      }
    },
    _setupChannel: function _setupChannel(channelKey, name) {
      var _this$channelKey;

      if (((_this$channelKey = this[channelKey]) === null || _this$channelKey === void 0 ? void 0 : _this$channelKey.name) !== name) {
        var _this$channelKey2;

        (_this$channelKey2 = this[channelKey]) === null || _this$channelKey2 === void 0 ? void 0 : _this$channelKey2.unsubscribe();

        if (name) {
          this.set(channelKey, this.presence.getChannel(name));
          this[channelKey].subscribe();
        } else if (this[channelKey]) {
          this.set(channelKey, null);
        }
      }
    },
    _setupChannels: function _setupChannels() {
      this._setupChannel("replyChannel", this.replyChannelName);

      this._setupChannel("whisperChannel", this.whisperChannelName);

      this._setupChannel("editChannel", this.editChannelName);
    },
    replyingUsers: (0, _computed.union)("replyChannel.users", "whisperChannel.users"),
    editingUsers: (0, _computed.readOnly)("editChannel.users"),
    presenceUsers: function presenceUsers(isReply, replyingUsers, editingUsers) {
      var _users$filter,
          _this = this;

      var users = isReply ? replyingUsers : editingUsers;
      return users === null || users === void 0 ? void 0 : (_users$filter = users.filter(function (u) {
        return u.id !== _this.currentUser.id;
      })) === null || _users$filter === void 0 ? void 0 : _users$filter.slice(0, this.siteSettings.presence_max_users_shown);
    },
    shouldDisplay: (0, _computed.gt)("presenceUsers.length", 0),
    subscribe: function subscribe() {
      this._setupChannels();
    },
    _contentChanged: function _contentChanged() {
      var _this$model, _this$model2;

      if (this.model.reply === "") {
        return;
      }

      var entity = this.state === "edit" ? (_this$model = this.model) === null || _this$model === void 0 ? void 0 : _this$model.post : (_this$model2 = this.model) === null || _this$model2 === void 0 ? void 0 : _this$model2.topic;
      this.composerPresenceManager.notifyState(this.state, entity === null || entity === void 0 ? void 0 : entity.id);
    },
    closeComposer: function closeComposer() {
      this._setupChannels();

      this.composerPresenceManager.leave();
    }
  }, (_applyDecoratedDescriptor(_obj, "state", [_dec], Object.getOwnPropertyDescriptor(_obj, "state"), _obj), _applyDecoratedDescriptor(_obj, "replyChannelName", [_dec2], Object.getOwnPropertyDescriptor(_obj, "replyChannelName"), _obj), _applyDecoratedDescriptor(_obj, "whisperChannelName", [_dec3], Object.getOwnPropertyDescriptor(_obj, "whisperChannelName"), _obj), _applyDecoratedDescriptor(_obj, "editChannelName", [_dec4], Object.getOwnPropertyDescriptor(_obj, "editChannelName"), _obj), _applyDecoratedDescriptor(_obj, "_setupChannels", [_dec5], Object.getOwnPropertyDescriptor(_obj, "_setupChannels"), _obj), _applyDecoratedDescriptor(_obj, "presenceUsers", [_dec6], Object.getOwnPropertyDescriptor(_obj, "presenceUsers"), _obj), _applyDecoratedDescriptor(_obj, "subscribe", [_dec7], Object.getOwnPropertyDescriptor(_obj, "subscribe"), _obj), _applyDecoratedDescriptor(_obj, "_contentChanged", [_dec8], Object.getOwnPropertyDescriptor(_obj, "_contentChanged"), _obj), _applyDecoratedDescriptor(_obj, "closeComposer", [_dec9], Object.getOwnPropertyDescriptor(_obj, "closeComposer"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/discourse-presence/discourse/components/topic-presence-display", ["exports", "discourse-common/utils/decorators", "@ember/component", "@ember/object/computed", "@ember/service"], function (_exports, _decorators, _component, _computed, _service) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _dec3, _dec4, _dec5, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_dec = (0, _decorators.default)("replyChannel.users.[]"), _dec2 = (0, _decorators.default)("whisperChannel.users.[]"), _dec3 = (0, _decorators.default)("topic.id"), _dec4 = (0, _decorators.default)("topic.id"), _dec5 = (0, _decorators.on)("willDestroyElement"), (_obj = {
    topic: null,
    presence: (0, _service.inject)(),
    replyChannel: null,
    whisperChannel: null,
    replyUsers: function replyUsers(users) {
      var _this = this;

      return users === null || users === void 0 ? void 0 : users.filter(function (u) {
        return u.id !== _this.currentUser.id;
      });
    },
    whisperUsers: function whisperUsers(users) {
      var _this2 = this;

      return users === null || users === void 0 ? void 0 : users.filter(function (u) {
        return u.id !== _this2.currentUser.id;
      });
    },
    users: (0, _computed.union)("replyUsers", "whisperUsers"),
    replyChannelName: function replyChannelName(id) {
      return "/discourse-presence/reply/".concat(id);
    },
    whisperChannelName: function whisperChannelName(id) {
      return "/discourse-presence/whisper/".concat(id);
    },
    shouldDisplay: (0, _computed.gt)("users.length", 0),
    didReceiveAttrs: function didReceiveAttrs() {
      var _this$replyChannel, _this$whisperChannel;

      this._super.apply(this, arguments);

      if (((_this$replyChannel = this.replyChannel) === null || _this$replyChannel === void 0 ? void 0 : _this$replyChannel.name) !== this.replyChannelName) {
        var _this$replyChannel2;

        (_this$replyChannel2 = this.replyChannel) === null || _this$replyChannel2 === void 0 ? void 0 : _this$replyChannel2.unsubscribe();
        this.set("replyChannel", this.presence.getChannel(this.replyChannelName));
        this.replyChannel.subscribe();
      }

      if (this.currentUser.staff && ((_this$whisperChannel = this.whisperChannel) === null || _this$whisperChannel === void 0 ? void 0 : _this$whisperChannel.name) !== this.whisperChannelName) {
        var _this$whisperChannel2;

        (_this$whisperChannel2 = this.whisperChannel) === null || _this$whisperChannel2 === void 0 ? void 0 : _this$whisperChannel2.unsubscribe();
        this.set("whisperChannel", this.presence.getChannel(this.whisperChannelName));
        this.whisperChannel.subscribe();
      }
    },
    _destroyed: function _destroyed() {
      var _this$replyChannel3, _this$whisperChannel3;

      (_this$replyChannel3 = this.replyChannel) === null || _this$replyChannel3 === void 0 ? void 0 : _this$replyChannel3.unsubscribe();
      (_this$whisperChannel3 = this.whisperChannel) === null || _this$whisperChannel3 === void 0 ? void 0 : _this$whisperChannel3.unsubscribe();
    }
  }, (_applyDecoratedDescriptor(_obj, "replyUsers", [_dec], Object.getOwnPropertyDescriptor(_obj, "replyUsers"), _obj), _applyDecoratedDescriptor(_obj, "whisperUsers", [_dec2], Object.getOwnPropertyDescriptor(_obj, "whisperUsers"), _obj), _applyDecoratedDescriptor(_obj, "replyChannelName", [_dec3], Object.getOwnPropertyDescriptor(_obj, "replyChannelName"), _obj), _applyDecoratedDescriptor(_obj, "whisperChannelName", [_dec4], Object.getOwnPropertyDescriptor(_obj, "whisperChannelName"), _obj), _applyDecoratedDescriptor(_obj, "_destroyed", [_dec5], Object.getOwnPropertyDescriptor(_obj, "_destroyed"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/discourse-presence/discourse/services/composer-presence-manager", ["exports", "@ember/service", "@ember/runloop", "discourse-common/config/environment"], function (_exports, _service, _runloop, _environment) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _class, _descriptor, _temp;

  function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

  function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

  function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

  function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

  function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

  function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

  function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

  function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'proposal-class-properties is enabled and runs after the decorators transform.'); }

  var PRESENCE_CHANNEL_PREFIX = "/discourse-presence";
  var KEEP_ALIVE_DURATION_SECONDS = 10;
  var ComposerPresenceManager = (_class = (_temp = /*#__PURE__*/function (_Service) {
    _inherits(ComposerPresenceManager, _Service);

    var _super = _createSuper(ComposerPresenceManager);

    function ComposerPresenceManager() {
      var _this;

      _classCallCheck(this, ComposerPresenceManager);

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      _this = _super.call.apply(_super, [this].concat(args));

      _initializerDefineProperty(_assertThisInitialized(_this), "presence", _descriptor, _assertThisInitialized(_this));

      return _this;
    }

    _createClass(ComposerPresenceManager, [{
      key: "notifyState",
      value: function notifyState(intent, id) {
        if (this.siteSettings.allow_users_to_hide_profile && this.currentUser.hide_profile_and_presence) {
          return;
        }

        if (intent === undefined) {
          return this.leave();
        }

        if (!["reply", "whisper", "edit"].includes(intent)) {
          throw "Unknown intent ".concat(intent);
        }

        var state = "".concat(intent, "/").concat(id);

        if (this._state !== state) {
          this._enter(intent, id);

          this._state = state;
        }

        if (!(0, _environment.isTesting)()) {
          this._autoLeaveTimer = (0, _runloop.debounce)(this, this.leave, KEEP_ALIVE_DURATION_SECONDS * 1000);
        }
      }
    }, {
      key: "leave",
      value: function leave() {
        var _this$_presentChannel;

        (_this$_presentChannel = this._presentChannel) === null || _this$_presentChannel === void 0 ? void 0 : _this$_presentChannel.leave();
        this._presentChannel = null;
        this._state = null;

        if (this._autoLeaveTimer) {
          (0, _runloop.cancel)(this._autoLeaveTimer);
          this._autoLeaveTimer = null;
        }
      }
    }, {
      key: "_enter",
      value: function _enter(intent, id) {
        this.leave();
        var channelName = "".concat(PRESENCE_CHANNEL_PREFIX, "/").concat(intent, "/").concat(id);
        this._presentChannel = this.presence.getChannel(channelName);

        this._presentChannel.enter();
      }
    }, {
      key: "willDestroy",
      value: function willDestroy() {
        this.leave();
      }
    }]);

    return ComposerPresenceManager;
  }(_service.default), _temp), (_descriptor = _applyDecoratedDescriptor(_class.prototype, "presence", [_service.inject], {
    configurable: true,
    enumerable: true,
    writable: true,
    initializer: null
  })), _class);
  _exports.default = ComposerPresenceManager;
});
Ember.TEMPLATES["javascripts/components/composer-presence-display"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"user\"],\"statements\":[[4,\"if\",[[24,[\"shouldDisplay\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"presence-users\"],[8],[0,\"\\n    \"],[7,\"div\",true],[10,\"class\",\"presence-avatars\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"presenceUsers\"]]],null,{\"statements\":[[0,\"        \"],[1,[28,\"avatar\",[[23,1,[]]],[[\"avatarTemplatePath\",\"usernamePath\",\"imageSize\"],[\"avatar_template\",\"username\",\"small\"]]],false],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"    \"],[9],[0,\"\\n    \"],[7,\"span\",true],[10,\"class\",\"presence-text\"],[8],[0,\"\\n      \"],[7,\"span\",true],[10,\"class\",\"description\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"isReply\"]]],null,{\"statements\":[[1,[28,\"i18n\",[\"presence.replying\"],[[\"count\"],[[24,[\"presenceUsers\",\"length\"]]]]],false]],\"parameters\":[]},{\"statements\":[[1,[28,\"i18n\",[\"presence.editing\"],[[\"count\"],[[24,[\"presenceUsers\",\"length\"]]]]],false]],\"parameters\":[]}],[0,\"      \"],[9],[9],[7,\"span\",true],[10,\"class\",\"wave\"],[8],[0,\"\\n      \"],[7,\"span\",true],[10,\"class\",\"dot\"],[8],[0,\".\"],[9],[7,\"span\",true],[10,\"class\",\"dot\"],[8],[0,\".\"],[9],[7,\"span\",true],[10,\"class\",\"dot\"],[8],[0,\".\"],[9],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/composer-presence-display"}});
Ember.TEMPLATES["javascripts/components/topic-presence-display"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"user\"],\"statements\":[[4,\"if\",[[24,[\"shouldDisplay\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"presence-users\"],[8],[0,\"\\n    \"],[7,\"div\",true],[10,\"class\",\"presence-avatars\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"users\"]]],null,{\"statements\":[[0,\"        \"],[1,[28,\"avatar\",[[23,1,[]]],[[\"avatarTemplatePath\",\"usernamePath\",\"imageSize\"],[\"avatar_template\",\"username\",\"small\"]]],false],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"    \"],[9],[0,\"\\n    \"],[7,\"span\",true],[10,\"class\",\"presence-text\"],[8],[0,\"\\n      \"],[7,\"span\",true],[10,\"class\",\"description\"],[8],[1,[28,\"i18n\",[\"presence.replying_to_topic\"],[[\"count\"],[[24,[\"users\",\"length\"]]]]],false],[9],[7,\"span\",true],[10,\"class\",\"wave\"],[8],[7,\"span\",true],[10,\"class\",\"dot\"],[8],[0,\".\"],[9],[7,\"span\",true],[10,\"class\",\"dot\"],[8],[0,\".\"],[9],[7,\"span\",true],[10,\"class\",\"dot\"],[8],[0,\".\"],[9],[9],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/topic-presence-display"}});
Ember.TEMPLATES["javascripts/connectors/composer-fields/presence"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"composer-presence-display\",null,[[\"model\"],[[24,[\"model\"]]]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/connectors/composer-fields/presence"}});
Ember.TEMPLATES["javascripts/connectors/topic-above-footer-buttons/presence"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"topic-presence-display\",null,[[\"topic\"],[[24,[\"model\"]]]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/connectors/topic-above-footer-buttons/presence"}});


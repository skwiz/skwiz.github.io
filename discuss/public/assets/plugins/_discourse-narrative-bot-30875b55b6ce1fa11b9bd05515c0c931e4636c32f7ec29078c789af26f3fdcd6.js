define("discourse/plugins/discourse-narrative-bot/initializers/new-user-narrative", ["exports", "discourse/lib/ajax", "discourse/lib/plugin-api"], function (_exports, _ajax, _pluginApi) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var PLUGIN_ID = "new-user-narrative";

  function _initialize(api) {
    var messageBus = api.container.lookup("message-bus:main");
    var currentUser = api.getCurrentUser();
    var appEvents = api.container.lookup("service:app-events");
    api.modifyClass("component:site-header", {
      pluginId: PLUGIN_ID,
      didInsertElement: function didInsertElement() {
        this._super.apply(this, arguments);

        this.dispatch("header:search-context-trigger", "header");
      }
    });
    api.modifyClass("controller:topic", {
      pluginId: PLUGIN_ID,
      _modifyBookmark: function _modifyBookmark(bookmark, post) {
        var _this = this;

        // if we are talking to discobot then any bookmarks should just
        // be created without reminder options, to streamline the new user
        // narrative.
        var discobotUserId = -2;

        if (post && post.user_id === discobotUserId && !post.bookmarked) {
          return (0, _ajax.ajax)("/bookmarks", {
            type: "POST",
            data: {
              post_id: post.id
            }
          }).then(function (response) {
            post.setProperties({
              "topic.bookmarked": true,
              bookmarked: true,
              bookmark_id: response.id
            });
            post.appEvents.trigger("post-stream:refresh", {
              id: _this.id
            });
          });
        }

        return this._super(bookmark, post);
      }
    });
    api.attachWidgetAction("header", "headerSearchContextTrigger", function () {
      if (this.site.mobileView) {
        this.state.skipSearchContext = false;
      } else {
        this.state.contextEnabled = true;
        this.state.searchContextType = "topic";
      }
    });

    if (messageBus && currentUser) {
      messageBus.subscribe("/new_user_narrative/tutorial_search", function () {
        appEvents.trigger("header:search-context-trigger");
      });
    }
  }

  var _default = {
    name: "new-user-narratve",
    initialize: function initialize(container) {
      var siteSettings = container.lookup("site-settings:main");

      if (siteSettings.discourse_narrative_bot_enabled) {
        (0, _pluginApi.withPluginApi)("0.8.7", _initialize);
      }
    }
  };
  _exports.default = _default;
});


define("discourse/plugins/discourse-details/initializers/apply-details", ["exports", "I18n", "discourse/lib/plugin-api"], function (_exports, _I18n, _pluginApi) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function initializeDetails(api) {
    api.decorateCooked(function ($elem) {
      return $("details", $elem);
    }, {
      id: "discourse-details"
    });
    api.addToolbarPopupMenuOptionsCallback(function () {
      return {
        action: "insertDetails",
        icon: "caret-right",
        label: "details.title"
      };
    });
    api.modifyClass("controller:composer", {
      actions: {
        insertDetails: function insertDetails() {
          this.toolbarEvent.applySurround("\n" + "[details=\"".concat(_I18n.default.t("composer.details_title"), "\"]") + "\n", "\n[/details]\n", "details_text", {
            multiline: false
          });
        }
      }
    });
  }

  var _default = {
    name: "apply-details",
    initialize: function initialize() {
      (0, _pluginApi.withPluginApi)("0.8.7", initializeDetails);
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-details/lib/discourse-markdown/details", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.setup = setup;
  var rule = {
    tag: "details",
    before: function before(state, tagInfo) {
      var attrs = tagInfo.attrs;
      state.push("bbcode_open", "details", 1);
      state.push("bbcode_open", "summary", 1);
      var token = state.push("text", "", 0);
      token.content = attrs["_default"] || "";
      state.push("bbcode_close", "summary", -1);
    },
    after: function after(state) {
      state.push("bbcode_close", "details", -1);
    }
  };

  function setup(helper) {
    helper.allowList(["summary", "summary[title]", "details", "details[open]", "details.elided"]);
    helper.registerPlugin(function (md) {
      md.block.bbcode.ruler.push("details", rule);
    });
  }
});


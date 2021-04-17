define("discourse/plugins/styleguide/discourse/components/color-example", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Component.extend({
    tagName: "section",
    classNameBindings: [":color-example"]
  });

  _exports.default = _default;
});
define("discourse/plugins/styleguide/discourse/components/styleguide-example", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Component.extend({
    tagName: "section",
    classNames: ["styleguide-example"],
    value: null,
    init: function init() {
      this._super.apply(this, arguments);

      this.value = this.initialValue;
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/styleguide/discourse/components/styleguide-icons", ["exports", "discourse-common/utils/decorators"], function (_exports, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Component.extend((_obj = {
    tagName: "section",
    classNames: ["styleguide-icons"],
    iconIds: [],
    init: function init() {
      this._super.apply(this, arguments);

      this.setIconIds();
    },
    setIconIds: function setIconIds() {
      var symbols = document.querySelectorAll("#svg-sprites symbol");
      var ids = Array.from(symbols).mapBy("id");
      this.set("iconIds", ids);
    }
  }, (_applyDecoratedDescriptor(_obj, "setIconIds", [_decorators.afterRender], Object.getOwnPropertyDescriptor(_obj, "setIconIds"), _obj)), _obj));

  _exports.default = _default;
});
define("discourse/plugins/styleguide/discourse/components/styleguide-link", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Component.extend({
    tagName: ""
  });

  _exports.default = _default;
});
define("discourse/plugins/styleguide/discourse/components/styleguide-markdown", ["exports", "discourse/lib/text"], function (_exports, _text) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Component.extend({
    didInsertElement: function didInsertElement() {
      var _this = this;

      this._super.apply(this, arguments);

      var contents = $(this.element).html();
      (0, _text.cookAsync)(contents).then(function (cooked) {
        return $(_this.element).html(cooked.string);
      });
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/styleguide/discourse/components/styleguide-section", ["exports", "discourse-common/utils/decorators"], function (_exports, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Component.extend((_dec = (0, _decorators.default)("section"), (_obj = {
    tagName: "section",
    classNameBindings: [":styleguide-section", "sectionClass"],
    didReceiveAttrs: function didReceiveAttrs() {
      this._super.apply(this, arguments);

      window.scrollTo(0, 0);
    },
    sectionClass: function sectionClass(section) {
      if (section) {
        return "".concat(section.id, "-examples");
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "sectionClass", [_dec], Object.getOwnPropertyDescriptor(_obj, "sectionClass"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/styleguide/discourse/controllers/styleguide-show", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Controller.extend({
    actions: {
      dummy: function dummy() {}
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/styleguide/discourse/controllers/styleguide", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Controller.extend({
    sections: null
  });

  _exports.default = _default;
});
define("discourse/plugins/styleguide/discourse/helpers/section-title", ["exports", "I18n"], function (_exports, _I18n) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Helper.helper(function (params) {
    return _I18n.default.t("styleguide.sections.".concat(params[0].replace(/\-/g, "_"), ".title"));
  });

  _exports.default = _default;
});
define("discourse/plugins/styleguide/discourse/lib/dummy-data", ["exports", "discourse/models/nav-item"], function (_exports, _navItem) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.createData = createData;
  var topicId = 2000000;
  var userId = 1000000;

  var _data;

  function createData(store) {
    if (_data) {
      return _data;
    }

    var categories = [{
      id: 1234,
      name: "Fruit",
      description_excerpt: "All about various kinds of fruit",
      color: "ff0",
      slug: "fruit"
    }, {
      id: 2345,
      name: "Vegetables",
      description_excerpt: "Full of delicious vitamins",
      color: "f00",
      slug: "vegetables"
    }, {
      id: 3456,
      name: "Beverages",
      description_excerpt: "Thirsty?",
      color: "99f",
      slug: "beverages",
      read_restricted: true
    }].map(function (c) {
      return store.createRecord("category", c);
    });

    var createUser = function createUser(attrs) {
      userId++;
      var userData = {
        id: userId,
        username: "user_".concat(userId),
        name: "John Doe",
        avatar_template: "/images/avatar.png",
        website: "discourse.com",
        website_name: "My Website is Discourse",
        location: "Toronto",
        suspend_reason: "Some reason",
        groups: [{
          name: "Group 1"
        }, {
          name: "Group 2"
        }],
        created_at: moment().subtract(10, "days"),
        last_posted_at: moment().subtract(3, "days"),
        last_seen_at: moment().subtract(1, "days"),
        profile_view_count: 378,
        invited_by: {
          username: "user_2"
        },
        trust_level: 1,
        publicUserFields: [{
          field: {
            dasherized_name: "puf_1",
            name: "Public User Field 1"
          },
          value: "Some value 1"
        }, {
          field: {
            dasherized_name: "puf_2",
            name: "Public User Field 2"
          },
          value: "Some value 2"
        }]
      };
      Object.assign(userData, attrs || {});
      return store.createRecord("user", userData);
    }; // This bg image is public domain: http://hubblesite.org/image/3999/gallery


    var user = createUser({
      profile_background: "/plugins/styleguide/images/hubble-orion-nebula-bg.jpg",
      has_profile_background: true
    });

    var createTopic = function createTopic(attrs) {
      topicId++;
      return store.createRecord("topic", $.extend({
        id: topicId,
        title: "Example Topic Title ".concat(topicId),
        fancy_title: "Example Topic Title ".concat(topicId),
        slug: "example-topic-title-".concat(topicId),
        posts_count: topicId * 1234 % 100 + 1,
        views: topicId * 123 % 1000 + 1,
        like_count: topicId % 3,
        created_at: "2017-03-".concat(topicId),
        visible: true,
        posters: [{
          extras: "latest",
          user: user
        }, {
          user: createUser()
        }, {
          user: createUser()
        }, {
          user: createUser()
        }, {
          user: createUser()
        }]
      }, attrs || {}));
    };

    var topic = createTopic({
      tags: ["example", "apple"]
    });
    topic.details.updateFromJson({
      can_create_post: true,
      can_invite_to: false,
      can_delete: false,
      can_close_topic: false
    });
    topic.setProperties({
      category_id: categories[0].id,
      suggested_topics: [topic, topic, topic]
    });
    var invisibleTopic = createTopic({
      visible: false
    });
    var closedTopic = createTopic({
      closed: true
    });
    closedTopic.set("category_id", categories[1].id);
    var archivedTopic = createTopic({
      archived: true
    });
    var pinnedTopic = createTopic({
      pinned: true
    });
    pinnedTopic.set("clearPin", function () {
      return pinnedTopic.set("pinned", "unpinned");
    });
    pinnedTopic.set("rePin", function () {
      return pinnedTopic.set("pinned", "pinned");
    });
    pinnedTopic.set("category_id", categories[2].id);
    var unpinnedTopic = createTopic({
      unpinned: true
    });
    var warningTopic = createTopic({
      is_warning: true
    });
    var bunchOfTopics = [topic, invisibleTopic, closedTopic, archivedTopic, pinnedTopic, unpinnedTopic, warningTopic];
    var sentence = "Donec viverra lacus id sapien aliquam, tempus tincidunt urna porttitor.";
    var cooked = "<p>Lorem ipsum dolor sit amet, et nec quis viderer prompta, ex omnium ponderum insolens eos, sed discere invenire principes in. Fuisset constituto per ad. Est no scripta propriae facilisis, viderer impedit deserunt in mel. Quot debet facilisis ne vix, nam in detracto tacimates. At quidam petentium vulputate pro. Alia iudico repudiandae ad vel, erat omnis epicuri eos id. Et illum dolor graeci vel, quo feugiat consulatu ei.</p>\n\n    <p>Case everti equidem ius ea, ubique veritus vim id. Eros omnium conclusionemque qui te, usu error alienum imperdiet ut, ex ius meis adipisci. Libris reprehendunt eos ex, mea at nisl suavitate. Altera virtute democritum pro cu, melius latine in ius.</p>";
    var transformedPost = {
      id: 1234,
      cooked: cooked,
      created_at: moment().subtract(3, "days"),
      user_id: user.get("id"),
      username: user.get("username"),
      avatar_template: user.get("avatar_template"),
      showLike: true,
      canToggleLike: true,
      canFlag: true,
      canEdit: false,
      canCreatePost: true,
      canBookmark: true,
      canManage: true,
      canDelete: true,
      createdByUsername: user.get("username"),
      createdByAvatarTemplate: user.get("avatar_template"),
      lastPostUsername: user.get("username"),
      lastPostAvatarTemplate: user.get("avatar_template"),
      topicReplyCount: 123,
      topicViews: 3456,
      participantCount: 10,
      topicLikeCount: 14,
      topicLinkLength: 5,
      topicPostsCount: 4,
      participants: [createUser(), createUser(), createUser(), createUser()],
      topicLinks: [{
        title: "Evil Trout",
        url: "https://eviltrout.com",
        domain: "eviltrout.com",
        clicks: 1024
      }, {
        title: "Cool Site",
        url: "http://coolsite.example.com",
        domain: "coolsite.example.com",
        clicks: 512
      }]
    };
    _data = {
      options: [{
        id: 1,
        name: "Orange"
      }, {
        id: 2,
        name: "Blue"
      }, {
        id: 3,
        name: "Red"
      }, {
        id: 4,
        name: "Yellow"
      }],
      categories: categories,
      buttonSizes: [{
        class: "btn-large",
        text: "large"
      }, {
        class: "btn-default",
        text: "default"
      }],
      buttonStates: [{
        class: "btn-hover",
        text: "hover"
      }, {
        class: "btn-active",
        text: "active"
      }, {
        disabled: true,
        text: "disabled"
      }],
      navItems: ["latest", "categories", "top"].map(function (name) {
        var item = _navItem.default.fromText(name); // item.set("href", "#");


        if (name === "categories") {
          item.set("styleGuideActive", true);
        }

        return item;
      }),
      topic: topic,
      invisibleTopic: invisibleTopic,
      closedTopic: closedTopic,
      archivedTopic: archivedTopic,
      pinnedTopic: pinnedTopic,
      unpinnedTopic: unpinnedTopic,
      warningTopic: warningTopic,
      topics: bunchOfTopics,
      sentence: sentence,
      short_sentence: "Lorem ipsum dolor sit amet.",
      soon: moment().add(2, "days"),
      transformedPost: transformedPost,
      user: user,
      userWithUnread: createUser({
        unread_notifications: 3,
        unread_private_messages: 7
      }),
      lorem: cooked,
      topicTimerUpdateDate: "2017-10-18 18:00",
      groups: [{
        name: "staff",
        id: 1,
        automatic: false
      }, {
        name: "lounge",
        id: 2,
        automatic: true
      }, {
        name: "admin",
        id: 3,
        automatic: false
      }],
      selectedGroups: [1, 2],
      settings: "bold|italic|strike|underline",
      colors: "f49|c89|564897"
    };
    return _data;
  }
});
define("discourse/plugins/styleguide/discourse/lib/styleguide", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.sectionById = sectionById;
  _exports.allCategories = allCategories;
  _exports.findNote = findNote;
  _exports.CATEGORIES = void 0;
  var _allCategories = null;
  var _sectionsById = {};
  var _notes = {};
  var CATEGORIES = ["atoms", "molecules", "organisms"];
  _exports.CATEGORIES = CATEGORIES;

  function sectionById(id) {
    // prime cache
    allCategories();
    return _sectionsById[id];
  }

  function sortSections(a, b) {
    var result = a.priority - b.priority;

    if (result === 0) {
      return a.id < b.id ? -1 : 1;
    }

    return result;
  }

  function allCategories() {
    if (_allCategories) {
      return _allCategories;
    }

    var categories = {};
    var paths = CATEGORIES.join("|"); // Find a list of sections based on what templates are available

    Object.keys(Ember.TEMPLATES).forEach(function (e) {
      var regexp = new RegExp("styleguide/(".concat(paths, ")/(\\d+)?\\-?([^\\/]+)$"));
      var matches = e.match(regexp);

      if (matches) {
        var section = {
          id: matches[3],
          priority: parseInt(matches[2] || "100", 10),
          category: matches[1],
          templateName: e.replace(/^.*styleguide\//, "")
        };

        if (!categories[section.category]) {
          categories[section.category] = [];
        }

        categories[section.category].push(section);
        _sectionsById[section.id] = section;
      } // Look for notes


      regexp = new RegExp("components/notes/(\\d+)?\\-?([^\\/]+)$");
      matches = e.match(regexp);

      if (matches) {
        _notes[matches[2]] = e.replace(/^.*notes\//, "");
      }
    });
    _allCategories = [];
    CATEGORIES.forEach(function (c) {
      var sections = categories[c];

      if (sections) {
        _allCategories.push({
          id: c,
          sections: sections.sort(sortSections)
        });
      }
    });
    return _allCategories;
  }

  function findNote(section) {
    return _notes[section.id];
  }
});
define("discourse/plugins/styleguide/discourse/routes/styleguide-show", ["exports", "discourse/plugins/styleguide/discourse/lib/styleguide", "discourse/plugins/styleguide/discourse/lib/dummy-data"], function (_exports, _styleguide, _dummyData) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Route.extend({
    model: function model(params) {
      return (0, _styleguide.sectionById)(params.section);
    },
    setupController: function setupController(controller, section) {
      var note = (0, _styleguide.findNote)(section);
      controller.setProperties({
        section: section,
        note: note,
        dummy: (0, _dummyData.createData)(this.store)
      });
    },
    renderTemplate: function renderTemplate(controller, section) {
      this.render("styleguide.show");
      this.render("styleguide/".concat(section.templateName), {
        into: "styleguide.show"
      });
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/styleguide/discourse/routes/styleguide", ["exports", "discourse/plugins/styleguide/discourse/lib/styleguide"], function (_exports, _styleguide) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Route.extend({
    model: function model() {
      return (0, _styleguide.allCategories)();
    },
    setupController: function setupController(controller, categories) {
      controller.set("categories", categories);
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/styleguide/discourse/styleguide-route-map", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _default;

  function _default() {
    var _this$site$disabled_p = this.site.disabled_plugins,
        disabled_plugins = _this$site$disabled_p === void 0 ? [] : _this$site$disabled_p;

    if (disabled_plugins.indexOf("styleguide") !== -1) {
      return;
    }

    this.route("styleguide", function () {
      this.route("show", {
        path: ":category/:section"
      });
    });
  }
});
Ember.TEMPLATES["javascripts/components/color-example"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"div\",true],[11,\"class\",[29,[\"color-bg \",[22,\"color\"]]]],[8],[9],[0,\"\\n\"],[7,\"div\",true],[10,\"class\",\"color-name\"],[8],[0,\"$\"],[1,[22,\"color\"],false],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/color-example"}});
Ember.TEMPLATES["javascripts/components/styleguide-example"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"&default\"],\"statements\":[[7,\"div\",true],[10,\"class\",\"example-title\"],[8],[1,[22,\"title\"],false],[9],[0,\"\\n\"],[7,\"section\",true],[10,\"class\",\"rendered\"],[8],[14,1,[[23,0,[\"value\"]]]],[9],[0,\"\\n\"],[7,\"div\",true],[10,\"class\",\"clearfix\"],[8],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/styleguide-example"}});
Ember.TEMPLATES["javascripts/components/styleguide-icons"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"id\"],\"statements\":[[4,\"each\",[[24,[\"iconIds\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"styleguide-icon\"],[8],[0,\"\\n    \"],[1,[28,\"d-icon\",[[23,1,[]]],null],false],[0,\"\\n    \"],[7,\"span\",true],[8],[1,[23,1,[]],false],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[1]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/styleguide-icons"}});
Ember.TEMPLATES["javascripts/components/styleguide-link"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"link-to\",null,[[\"route\",\"models\"],[\"styleguide.show\",[28,\"array\",[[24,[\"section\",\"category\"]],[24,[\"section\",\"id\"]]],null]]],{\"statements\":[[0,\"  \"],[1,[28,\"section-title\",[[24,[\"section\",\"id\"]]],null],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/styleguide-link"}});
Ember.TEMPLATES["javascripts/components/styleguide-section"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"&default\"],\"statements\":[[7,\"h1\",true],[10,\"class\",\"section-title\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"section\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"section-title\",[[24,[\"section\",\"id\"]]],null],false],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"    \"],[1,[28,\"i18n\",[[24,[\"title\"]]],null],false],[0,\"\\n\"]],\"parameters\":[]}],[9],[0,\"\\n\\n\"],[7,\"div\",true],[10,\"class\",\"styleguide-section-contents\"],[8],[0,\"\\n  \"],[14,1],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/styleguide-section"}});
Ember.TEMPLATES["javascripts/styleguide/atoms/00-typography"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"h1\"]],{\"statements\":[[0,\"  \"],[7,\"h1\",true],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"h2\"]],{\"statements\":[[0,\"  \"],[7,\"h2\",true],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"h3\"]],{\"statements\":[[0,\"  \"],[7,\"h3\",true],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"h4\"]],{\"statements\":[[0,\"  \"],[7,\"h4\",true],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"h5\"]],{\"statements\":[[0,\"  \"],[7,\"h5\",true],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"h6\"]],{\"statements\":[[0,\"  \"],[7,\"h6\",true],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"p\"]],{\"statements\":[[0,\"  \"],[7,\"p\",true],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.paragraph\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/atoms/00-typography"}});
Ember.TEMPLATES["javascripts/styleguide/atoms/01-font-scale"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[0,\"\\n\"],[7,\"div\",true],[10,\"class\",\"section-description\"],[8],[0,\"\\n  \"],[7,\"p\",true],[8],[0,\"\\n    Discourse users can select from 4 different text sizes in their user settings, by default these are:\\n    \"],[7,\"pre\",true],[8],[0,\"      Smaller: 14px\\n      Normal: 15px \"],[7,\"span\",true],[8],[0,\"(default)\"],[9],[0,\"\\n      Larger: 17px\\n      Largest: 19px\\n    \"],[9],[0,\"  \"],[9],[0,\"\\n\\n  \"],[7,\"p\",true],[8],[0,\"\\n    If you'd like to increase the font size of your entire Discourse community, you can override the font-size of the HTML element. You can also provide different font sizes for the user text size settings defined above. The example below increases all text size options by 1px.\\n    \"],[7,\"pre\",true],[8],[0,\"      html {\\n        \"],[7,\"span\",true],[10,\"class\",\"hljs-attribute\"],[8],[0,\"font-size\"],[9],[0,\": 16px; \"],[7,\"span\",true],[8],[0,\"// default font-size  \"],[9],[0,\"\\n        &.text-size-smaller {\\n          \"],[7,\"span\",true],[10,\"class\",\"hljs-attribute\"],[8],[0,\"font-size\"],[9],[0,\": 15px;\\n        }\\n        &.text-size-larger {\\n          \"],[7,\"span\",true],[10,\"class\",\"hljs-attribute\"],[8],[0,\"font-size\"],[9],[0,\": 18px;\\n        }\\n        &.text-size-largest {\\n          \"],[7,\"span\",true],[10,\"class\",\"hljs-attribute\"],[8],[0,\"font-size\"],[9],[0,\": 20px;\\n        }\\n      }\\n    \"],[9],[0,\"  \"],[9],[0,\"\\n  \"],[7,\"p\",true],[8],[0,\"\\n    If you want to scale the fonts of a specific element, you can use Discourse's font scaling variables. Using the variable system ensures you're using a consistent set of font-sizes throughout your community.\\n    \"],[7,\"p\",true],[8],[0,\"\\n      Changing the font-size of a parent element will proportionately scale the font sizes of all its children.\\n    \"],[9],[0,\"\\n    \"],[7,\"pre\",true],[8],[0,\"      .parent {\\n        \"],[7,\"span\",true],[10,\"class\",\"hljs-attribute\"],[8],[0,\"font-size\"],[9],[0,\": $font-up-3;\\n        \"],[7,\"span\",true],[8],[0,\"// Increases the relative font-size of this element and its children by 3 steps in the scale\"],[9],[0,\"\\n        .child {\\n          \"],[7,\"span\",true],[8],[0,\"// If this is set to $font-down-3 in Discourse's default CSS,\\n             the parent font-size increase above would make this equivilant to $font-0\\n             ($font-down-3 + $font-up-3 = $font-0)\"],[9],[0,\"\\n        }\\n      }\\n    \"],[9],[0,\"  \"],[9],[0,\"\\n\"],[9],[0,\"\\n\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$font-up-6, 2.296em\"]],{\"statements\":[[0,\"  \"],[7,\"p\",true],[10,\"class\",\"font-up-6\"],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$font-up-5, 2em\"]],{\"statements\":[[0,\"  \"],[7,\"p\",true],[10,\"class\",\"font-up-5\"],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$font-up-4, 1.7511em\"]],{\"statements\":[[0,\"  \"],[7,\"p\",true],[10,\"class\",\"font-up-4\"],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$font-up-3, 1.5157em\"]],{\"statements\":[[0,\"  \"],[7,\"p\",true],[10,\"class\",\"font-up-3\"],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$font-up-2, 1.3195em\"]],{\"statements\":[[0,\"  \"],[7,\"p\",true],[10,\"class\",\"font-up-2\"],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$font-up-1, 1.1487em\"]],{\"statements\":[[0,\"  \"],[7,\"p\",true],[10,\"class\",\"font-up-1\"],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$font-0, 1em — base font\"]],{\"statements\":[[0,\"  \"],[7,\"p\",true],[10,\"class\",\"font-0\"],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$font-down-1, 0.8706em\"]],{\"statements\":[[0,\"  \"],[7,\"p\",true],[10,\"class\",\"font-down-1\"],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$font-down-2, 0.7579em\"]],{\"statements\":[[0,\"  \"],[7,\"p\",true],[10,\"class\",\"font-down-2\"],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$font-down-3, 0.6599em\"]],{\"statements\":[[0,\"  \"],[7,\"p\",true],[10,\"class\",\"font-down-3\"],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$font-down-4, 0.5745em\"]],{\"statements\":[[0,\"  \"],[7,\"p\",true],[10,\"class\",\"font-down-4\"],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$font-down-5, 0.5em\"]],{\"statements\":[[0,\"  \"],[7,\"p\",true],[10,\"class\",\"font-down-5\"],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$font-down-6, 0.4355em\"]],{\"statements\":[[0,\"  \"],[7,\"p\",true],[10,\"class\",\"font-down-6\"],[8],[1,[28,\"i18n\",[\"styleguide.sections.typography.example\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/atoms/01-font-scale"}});
Ember.TEMPLATES["javascripts/styleguide/atoms/02-buttons"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"bs\",\"bs\",\"bs\",\"bs\",\"bs\",\"bs\",\"bs\",\"bs\",\"bs\",\"bs\",\"bs\",\"bs\"],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\".btn-icon - sizes\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"buttonSizes\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"d-button\",null,[[\"icon\",\"translatedTitle\",\"class\",\"disabled\"],[\"times\",[23,12,[\"text\"]],[23,12,[\"class\"]],[23,12,[\"disabled\"]]]]],false],[0,\"\\n\"]],\"parameters\":[12]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\".btn-icon - states\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"buttonStates\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"d-button\",null,[[\"icon\",\"translatedTitle\",\"class\",\"disabled\"],[\"times\",[23,11,[\"text\"]],[23,11,[\"class\"]],[23,11,[\"disabled\"]]]]],false],[0,\"\\n\"]],\"parameters\":[11]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\".btn-text - sizes\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"buttonSizes\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"d-button\",null,[[\"translatedLabel\",\"class\",\"disabled\"],[[23,10,[\"text\"]],[23,10,[\"class\"]],[23,10,[\"disabled\"]]]]],false],[0,\"\\n\"]],\"parameters\":[10]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\".btn-text - states\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"buttonStates\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"d-button\",null,[[\"translatedLabel\",\"class\",\"disabled\"],[[23,9,[\"text\"]],[23,9,[\"class\"]],[23,9,[\"disabled\"]]]]],false],[0,\"\\n\"]],\"parameters\":[9]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\".btn-default .btn-icon-text - sizes\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"buttonSizes\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"d-button\",null,[[\"icon\",\"translatedLabel\",\"class\",\"disabled\"],[\"plus\",[23,8,[\"text\"]],[23,8,[\"class\"]],[23,8,[\"disabled\"]]]]],false],[0,\"\\n\"]],\"parameters\":[8]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\".btn-default .btn-icon-text - states\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"buttonStates\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"d-button\",null,[[\"icon\",\"translatedLabel\",\"class\",\"disabled\"],[\"plus\",[23,7,[\"text\"]],[23,7,[\"class\"]],[23,7,[\"disabled\"]]]]],false],[0,\"\\n\"]],\"parameters\":[7]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\".btn-primary .btn-icon-text\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"buttonSizes\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"d-button\",null,[[\"class\",\"icon\",\"translatedLabel\",\"disabled\"],[[28,\"concat\",[\"btn-primary \",[23,6,[\"class\"]]],null],\"plus\",[23,6,[\"text\"]],[23,6,[\"disabled\"]]]]],false],[0,\"\\n\"]],\"parameters\":[6]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\".btn-primary .btn-icon-text - states\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"buttonStates\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"d-button\",null,[[\"class\",\"icon\",\"translatedLabel\",\"disabled\"],[[28,\"concat\",[\"btn-primary \",[23,5,[\"class\"]]],null],\"plus\",[23,5,[\"text\"]],[23,5,[\"disabled\"]]]]],false],[0,\"\\n\"]],\"parameters\":[5]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\".btn-danger .btn-icon-text - sizes\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"buttonSizes\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"d-button\",null,[[\"class\",\"icon\",\"translatedLabel\",\"disabled\"],[[28,\"concat\",[\"btn-danger \",[23,4,[\"class\"]]],null],\"trash-alt\",[23,4,[\"text\"]],[23,4,[\"disabled\"]]]]],false],[0,\"\\n\"]],\"parameters\":[4]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\".btn-danger .btn-icon-text - states\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"buttonStates\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"d-button\",null,[[\"class\",\"icon\",\"translatedLabel\",\"disabled\"],[[28,\"concat\",[\"btn-danger \",[23,3,[\"class\"]]],null],\"trash-alt\",[23,3,[\"text\"]],[23,3,[\"disabled\"]]]]],false],[0,\"\\n\"]],\"parameters\":[3]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\".btn-flat - sizes\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"buttonSizes\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"flat-button\",null,[[\"icon\",\"disabled\",\"transaltedTitle\"],[\"trash-alt\",[23,2,[\"disabled\"]],[23,2,[\"title\"]]]]],false],[0,\"\\n\"]],\"parameters\":[2]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\".btn-flat - states\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"buttonStates\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"flat-button\",null,[[\"icon\",\"disabled\",\"transaltedTitle\"],[\"trash-alt\",[23,1,[\"disabled\"]],[23,1,[\"title\"]]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/atoms/02-buttons"}});
Ember.TEMPLATES["javascripts/styleguide/atoms/03-colors"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"$primary\"]],{\"statements\":[[0,\"  \"],[7,\"section\",true],[10,\"class\",\"color-row\"],[8],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"primary-very-low\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"primary-low\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"primary-low-mid\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n  \"],[7,\"section\",true],[10,\"class\",\"color-row\"],[8],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"primary-medium\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"primary-high\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"primary\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$secondary\"]],{\"statements\":[[0,\"  \"],[7,\"section\",true],[10,\"class\",\"color-row\"],[8],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"secondary-low\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"secondary-medium\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"secondary-high\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"secondary\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$tertiary\"]],{\"statements\":[[0,\"  \"],[7,\"section\",true],[10,\"class\",\"color-row\"],[8],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"tertiary-low\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"tertiary-medium\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"tertiary-high\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"tertiary\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$quaternary\"]],{\"statements\":[[0,\"  \"],[7,\"section\",true],[10,\"class\",\"color-row\"],[8],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"quaternary-low\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"quaternary\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$highlight\"]],{\"statements\":[[0,\"  \"],[7,\"section\",true],[10,\"class\",\"color-row\"],[8],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"highlight-low\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"highlight-medium\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"highlight\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"highlight-high\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$danger\"]],{\"statements\":[[0,\"  \"],[7,\"section\",true],[10,\"class\",\"color-row\"],[8],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"danger-low\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"danger-low-mid\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"danger-medium\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"danger\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$success\"]],{\"statements\":[[0,\"  \"],[7,\"section\",true],[10,\"class\",\"color-row\"],[8],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"success-low\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"success-medium\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"success\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$love\"]],{\"statements\":[[0,\"  \"],[7,\"section\",true],[10,\"class\",\"color-row\"],[8],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"love-low\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"love\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"$header\"]],{\"statements\":[[0,\"  \"],[7,\"section\",true],[10,\"class\",\"color-row\"],[8],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"header_background\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n  \"],[7,\"section\",true],[10,\"class\",\"color-row\"],[8],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"header_primary\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"header_primary-very-high\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"header_primary-high\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n  \"],[7,\"section\",true],[10,\"class\",\"color-row\"],[8],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"header_primary-medium\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"header_primary-low-mid\"]]],false],[0,\"\\n    \"],[1,[28,\"color-example\",null,[[\"color\"],[\"header_primary-low\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/atoms/03-colors"}});
Ember.TEMPLATES["javascripts/styleguide/atoms/04-icons"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"div\",true],[10,\"class\",\"section-description\"],[8],[0,\"\\n  \"],[7,\"p\",true],[8],[0,\"Discourse uses a free set of SVG icons from Font Awesome (\"],[7,\"a\",true],[10,\"href\",\"https://fontawesome.com/icons?d=gallery&m=free\"],[8],[1,[28,\"i18n\",[\"styleguide.sections.icons.full_list\"],null],false],[9],[0,\").\"],[9],[0,\"\\n  \"],[7,\"p\",true],[8],[0,\"Plugins and themes can add SVG icons to the SVG spritesheet, or replace existing icons entirely.\"],[9],[0,\"\\n  \"],[7,\"p\",true],[8],[0,\"\\n    \"],[7,\"ul\",true],[8],[0,\"\\n      \"],[7,\"li\",true],[8],[7,\"a\",true],[10,\"href\",\"https://meta.discourse.org/t/introducing-font-awesome-5-and-svg-icons/101643\"],[8],[0,\"How to use SVG icons in your plugin or theme\"],[9],[9],[0,\"\\n      \"],[7,\"li\",true],[8],[7,\"a\",true],[10,\"href\",\"https://meta.discourse.org/t/replace-discourses-default-svg-icons-with-custom-icons-in-a-theme/115736/1\"],[8],[0,\"How to replace Discourse's default icons in a theme\"],[9],[9],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n  \"],[7,\"p\",true],[8],[0,\"By default, all icons have the \"],[7,\"pre\",true],[10,\"class\",\"pre-inline\"],[8],[0,\".d-icon\"],[9],[0,\" class applied along with a class containing the name of the icon (e.g., \"],[7,\"pre\",true],[10,\"class\",\"pre-inline\"],[8],[0,\".d-icon-link\"],[9],[0,\")\"],[9],[0,\"\\n\"],[9],[0,\"\\n\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"d-icon - all available icons\"]],{\"statements\":[[0,\"  \"],[1,[22,\"styleguide-icons\"],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/atoms/04-icons"}});
Ember.TEMPLATES["javascripts/styleguide/atoms/05-input-fields"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"text-field\"]],{\"statements\":[[0,\"  \"],[1,[28,\"text-field\",null,[[\"placeholder\"],[\"Placeholder\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"password\"]],{\"statements\":[[0,\"  \"],[1,[28,\"password-field\",null,[[\"type\",\"placeholder\"],[\"password\",\"Placeholder\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"text-field search\"]],{\"statements\":[[0,\"  \"],[1,[28,\"text-field\",null,[[\"type\",\"placeholder\"],[\"search\",\"Placeholder\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"textarea\"]],{\"statements\":[[0,\"  \"],[1,[28,\"textarea\",null,[[\"placeholder\"],[\"Placeholder\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/atoms/05-input-fields"}});
Ember.TEMPLATES["javascripts/styleguide/atoms/06-spinners"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"spinner - small\"]],{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"spinner small\"],[8],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"spinner - regular\"]],{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"spinner\"],[8],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/atoms/06-spinners"}});
Ember.TEMPLATES["javascripts/styleguide/atoms/date-time-inputs"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"time-input\"]],{\"statements\":[[0,\"  \"],[1,[22,\"time-input\"],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"date-input\"]],{\"statements\":[[0,\"  \"],[1,[22,\"date-input\"],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"date-time-input\"]],{\"statements\":[[0,\"  \"],[1,[22,\"date-time-input\"],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"date-time-input-range\"]],{\"statements\":[[0,\"  \"],[1,[22,\"date-time-input-range\"],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/atoms/date-time-inputs"}});
Ember.TEMPLATES["javascripts/styleguide/atoms/dropdowns"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"value\",\"value\",\"value\",\"value\",\"value\",\"value\"],\"statements\":[[4,\"styleguide-example\",null,[[\"title\",\"initialValue\"],[\"combo-box\",[24,[\"dummy\",\"options\",\"0\",\"name\"]]]],{\"statements\":[[0,\"  \"],[1,[28,\"combo-box\",null,[[\"content\",\"value\",\"onChange\"],[[24,[\"dummy\",\"options\"]],[23,6,[]],[28,\"fn\",[[28,\"mut\",[[23,6,[]]],null]],null]]]],false],[0,\"\\n\"]],\"parameters\":[6]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\",\"initialValue\"],[\"filterable combo-box\",[24,[\"dummy\",\"categories\",\"0\",\"name\"]]]],{\"statements\":[[0,\"  \"],[1,[28,\"combo-box\",null,[[\"content\",\"value\",\"options\",\"onChange\"],[[24,[\"dummy\",\"categories\"]],[23,5,[]],[28,\"hash\",null,[[\"filterable\"],[true]]],[28,\"fn\",[[28,\"mut\",[[23,5,[]]],null]],null]]]],false],[0,\"\\n\"]],\"parameters\":[5]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\",\"initialValue\"],[\"combo-box with a default state\",[24,[\"dummy\",\"options\",\"0\",\"name\"]]]],{\"statements\":[[0,\"  \"],[1,[28,\"combo-box\",null,[[\"content\",\"value\",\"options\",\"onChange\"],[[24,[\"dummy\",\"options\"]],[23,4,[]],[28,\"hash\",null,[[\"none\"],[\"category.none\"]]],[28,\"fn\",[[28,\"mut\",[[23,4,[]]],null]],null]]]],false],[0,\"\\n\"]],\"parameters\":[4]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\",\"initialValue\"],[\"combo-box clearable\",[24,[\"dummy\",\"options\",\"0\",\"name\"]]]],{\"statements\":[[0,\"  \"],[1,[28,\"combo-box\",null,[[\"content\",\"clearable\",\"value\",\"options\",\"onChange\"],[[24,[\"dummy\",\"options\"]],true,[23,3,[]],[28,\"hash\",null,[[\"none\"],[\"category.none\"]]],[28,\"fn\",[[28,\"mut\",[[23,3,[]]],null]],null]]]],false],[0,\"\\n\"]],\"parameters\":[3]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\",\"initialValue\"],[\"topic-notifications-options\",1]],{\"statements\":[[0,\"  \"],[1,[28,\"topic-notifications-options\",null,[[\"topic\",\"value\",\"onChange\"],[[24,[\"dummy\",\"topic\"]],[23,2,[]],[28,\"fn\",[[28,\"mut\",[[23,2,[]]],null]],null]]]],false],[0,\"\\n\"]],\"parameters\":[2]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"topic-footer-mobile-dropdown\"]],{\"statements\":[[0,\"  \"],[1,[28,\"topic-footer-mobile-dropdown\",null,[[\"topic\"],[[24,[\"dummy\",\"topic\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\",\"initialValue\"],[\"category-chooser\",[24,[\"categories\",\"0\",\"name\"]]]],{\"statements\":[[0,\"  \"],[1,[28,\"category-chooser\",null,[[\"value\",\"onChange\"],[[23,1,[]],[28,\"fn\",[[28,\"mut\",[[23,1,[]]],null]],null]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"pinned-button\"]],{\"statements\":[[0,\"  \"],[1,[28,\"pinned-button\",null,[[\"topic\"],[[24,[\"dummy\",\"pinnedTopic\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"pinned-options\"]],{\"statements\":[[0,\"  \"],[1,[28,\"pinned-options\",null,[[\"topic\"],[[24,[\"dummy\",\"pinnedTopic\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"categories-admin-dropdown\"]],{\"statements\":[[0,\"  \"],[1,[28,\"categories-admin-dropdown\",null,[[\"onChange\"],[[28,\"action\",[[23,0,[]],\"dummy\"],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"category-notifications-button\"]],{\"statements\":[[0,\"  \"],[1,[28,\"category-notifications-button\",null,[[\"category\",\"value\",\"onChange\"],[[24,[\"dummy\",\"categories\",\"0\"]],1,[28,\"action\",[[23,0,[]],\"dummy\"],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"notifications-button\"]],{\"statements\":[[0,\"  \"],[1,[28,\"notifications-button\",null,[[\"options\",\"value\",\"onChange\"],[[28,\"hash\",null,[[\"i18nPrefix\"],[\"groups.notifications\"]]],2,[28,\"action\",[[23,0,[]],\"dummy\"],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"dropdown-select-box\"]],{\"statements\":[[0,\"  \"],[1,[28,\"dropdown-select-box\",null,[[\"content\",\"onChange\"],[[24,[\"dummy\",\"options\"]],[28,\"action\",[[23,0,[]],\"dummy\"],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"future-date-input-selector\"]],{\"statements\":[[0,\"  \"],[1,[28,\"future-date-input-selector\",null,[[\"minimumResultsForSearch\",\"statusType\",\"input\",\"includeWeekend\",\"includeForever\",\"options\"],[-1,\"open\",[24,[\"dummy\",\"topicTimerUpdateDate\"]],true,true,[28,\"hash\",null,[[\"none\"],[\"topic.auto_update_input.none\"]]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"multi-select\"]],{\"statements\":[[0,\"  \"],[1,[28,\"multi-select\",null,[[\"content\",\"options\",\"onChange\"],[[24,[\"dummy\",\"options\"]],[28,\"hash\",null,[[\"none\"],[\"test.none\"]]],[28,\"action\",[[23,0,[]],\"dummy\"],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"admin group-chooser\"]],{\"statements\":[[0,\"  \"],[1,[28,\"group-chooser\",null,[[\"selected\",\"content\",\"onChange\"],[[24,[\"dummy\",\"selectedGroups\"]],[24,[\"dummy\",\"groups\"]],[28,\"action\",[[23,0,[]],\"dummy\"],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"list-setting\"]],{\"statements\":[[0,\"  \"],[1,[28,\"list-setting\",null,[[\"settingValue\",\"onChange\"],[[24,[\"dummy\",\"settings\"]],[28,\"action\",[[23,0,[]],\"dummy\"],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"list-setting with colors\"]],{\"statements\":[[0,\"  \"],[1,[28,\"list-setting\",null,[[\"settingValue\",\"nameProperty\",\"onChange\"],[[24,[\"dummy\",\"colors\"]],\"color\",[28,\"action\",[[23,0,[]],\"dummy\"],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/atoms/dropdowns"}});
Ember.TEMPLATES["javascripts/styleguide/atoms/topic-link"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"topic-link\"]],{\"statements\":[[0,\"  \"],[1,[28,\"topic-link\",[[24,[\"dummy\",\"topic\"]]],null],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/atoms/topic-link"}});
Ember.TEMPLATES["javascripts/styleguide/atoms/topic-statuses"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"invisible\"]],{\"statements\":[[0,\"  \"],[1,[28,\"topic-status\",null,[[\"topic\"],[[24,[\"dummy\",\"invisibleTopic\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"closed\"]],{\"statements\":[[0,\"  \"],[1,[28,\"topic-status\",null,[[\"topic\"],[[24,[\"dummy\",\"closedTopic\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"pinned\"]],{\"statements\":[[0,\"  \"],[1,[28,\"topic-status\",null,[[\"topic\"],[[24,[\"dummy\",\"pinnedTopic\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"unpinned\"]],{\"statements\":[[0,\"  \"],[1,[28,\"topic-status\",null,[[\"topic\"],[[24,[\"dummy\",\"unpinnedTopic\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"archived\"]],{\"statements\":[[0,\"  \"],[1,[28,\"topic-status\",null,[[\"topic\"],[[24,[\"dummy\",\"archivedTopic\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"warning\"]],{\"statements\":[[0,\"  \"],[1,[28,\"topic-status\",null,[[\"topic\"],[[24,[\"dummy\",\"warningTopic\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"no status\"]],{\"statements\":[[0,\"  \"],[1,[28,\"topic-status\",null,[[\"topic\"],[[24,[\"dummy\",\"topic\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/atoms/topic-statuses"}});
Ember.TEMPLATES["javascripts/styleguide/index"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-section\",null,[[\"title\"],[\"styleguide.title\"]],{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"description\"],[8],[0,\"\\n    \"],[1,[28,\"i18n\",[\"styleguide.welcome\"],null],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/index"}});
Ember.TEMPLATES["javascripts/styleguide/molecules/bread-crumbs"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"category-breadcrumbs\"]],{\"statements\":[[0,\"  \"],[1,[28,\"bread-crumbs\",null,[[\"categories\",\"showTags\"],[[24,[\"dummy\",\"categories\"]],false]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"if\",[[24,[\"siteSettings\",\"tagging_enabled\"]]],null,{\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"category-breadcrumbs - tags\"]],{\"statements\":[[0,\"    \"],[1,[28,\"bread-crumbs\",null,[[\"categories\",\"showTags\"],[[24,[\"dummy\",\"categories\"]],true]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/molecules/bread-crumbs"}});
Ember.TEMPLATES["javascripts/styleguide/molecules/categories"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"c\",\"c\",\"c\",\"c\"],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"category-badge - bullet\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"categories\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"category-badge\",[[23,4,[]]],[[\"categoryStyle\"],[\"bullet\"]]],false],[0,\"\\n\"]],\"parameters\":[4]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"category-badge - bar\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"categories\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"category-badge\",[[23,3,[]]],[[\"categoryStyle\"],[\"bar\"]]],false],[0,\"\\n\"]],\"parameters\":[3]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"category-badge - box\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"categories\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"category-badge\",[[23,2,[]]],[[\"categoryStyle\"],[\"box\"]]],false],[0,\"\\n\"]],\"parameters\":[2]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"category-badge - none\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"categories\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"category-badge\",[[23,1,[]]],[[\"categoryStyle\"],[\"none\"]]],false],[0,\"\\n\"]],\"parameters\":[1]},null]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/molecules/categories"}});
Ember.TEMPLATES["javascripts/styleguide/molecules/footer-message"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"footer-message - default\"]],{\"statements\":[[0,\"  \"],[1,[28,\"footer-message\",null,[[\"education\",\"message\"],[[24,[\"dummy\",\"sentence\"]],[24,[\"dummy\",\"short_sentence\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"footer-message - latest\"]],{\"statements\":[[0,\"  \"],[1,[28,\"footer-message\",null,[[\"education\",\"message\",\"latest\",\"canCreateTopicOnCategory\",\"createTopic\"],[[24,[\"dummy\",\"sentence\"]],[24,[\"dummy\",\"short_sentence\"]],true,true,[28,\"action\",[[23,0,[]],\"dummy\"],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"footer-message - top\"]],{\"statements\":[[0,\"  \"],[1,[28,\"footer-message\",null,[[\"education\",\"message\",\"top\",\"changePeriod\"],[[24,[\"dummy\",\"sentence\"]],[24,[\"dummy\",\"short_sentence\"]],true,[28,\"action\",[[23,0,[]],\"dummy\"],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/molecules/footer-message"}});
Ember.TEMPLATES["javascripts/styleguide/molecules/header-icons"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"header-icons\"]],{\"statements\":[[0,\"  \"],[1,[28,\"mount-widget\",null,[[\"widget\"],[\"header-icons\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"header-icons - user\"]],{\"statements\":[[0,\"  \"],[1,[28,\"mount-widget\",null,[[\"widget\",\"args\"],[\"header-icons\",[28,\"hash\",null,[[\"user\"],[[24,[\"dummy\",\"user\"]]]]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"header-icons - notifications\"]],{\"statements\":[[0,\"  \"],[1,[28,\"mount-widget\",null,[[\"widget\",\"args\"],[\"header-icons\",[28,\"hash\",null,[[\"user\",\"flagCount\"],[[24,[\"dummy\",\"userWithUnread\"]],5]]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/molecules/header-icons"}});
Ember.TEMPLATES["javascripts/styleguide/molecules/navigation-bar"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"ni\"],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"navigation-bar\"]],{\"statements\":[[0,\"  \"],[1,[28,\"navigation-bar\",null,[[\"navItems\",\"filterMode\"],[[24,[\"dummy\",\"navItems\"]],\"latest\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\".user-main .nav-pills\"]],{\"statements\":[[4,\"mobile-nav\",null,[[\"class\",\"desktopClass\"],[\"main-nav\",\"nav nav-pills user-nav\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"navItems\"]]],null,{\"statements\":[[0,\"      \"],[7,\"li\",true],[8],[7,\"a\",true],[11,\"href\",[23,1,[\"href\"]]],[11,\"class\",[28,\"if\",[[23,1,[\"styleGuideActive\"]],\"active\"],null]],[8],[1,[23,1,[\"displayName\"]],false],[9],[9],[0,\"\\n\"]],\"parameters\":[1]},null]],\"parameters\":[]},null]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/molecules/navigation-bar"}});
Ember.TEMPLATES["javascripts/styleguide/molecules/navigation-stacked"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"ni\",\"ni\"],\"statements\":[[4,\"styleguide-example\",null,[[\"title\",\"class\"],[\".nav-stacked\",\"half-size\"]],{\"statements\":[[4,\"mobile-nav\",null,[[\"class\",\"desktopClass\"],[\"preferences-nav\",\"preferences-list action-list nav-stacked\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"navItems\"]]],null,{\"statements\":[[0,\"      \"],[7,\"li\",true],[8],[7,\"a\",true],[11,\"href\",[23,2,[\"href\"]]],[11,\"class\",[28,\"if\",[[23,2,[\"styleGuideActive\"]],\"active\"],null]],[8],[1,[23,2,[\"displayName\"]],false],[9],[9],[0,\"\\n\"]],\"parameters\":[2]},null]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\",\"class\"],[\".user-navigation .nav-stacked\",\"half-size\"]],{\"statements\":[[4,\"d-section\",null,[[\"class\"],[\"user-navigation\"]],{\"statements\":[[4,\"mobile-nav\",null,[[\"class\",\"desktopClass\"],[\"preferences-nav\",\"preferences-list action-list nav-stacked\"]],{\"statements\":[[4,\"each\",[[24,[\"dummy\",\"navItems\"]]],null,{\"statements\":[[0,\"        \"],[7,\"li\",true],[8],[7,\"a\",true],[11,\"href\",[23,1,[\"href\"]]],[11,\"class\",[28,\"if\",[[23,1,[\"styleGuideActive\"]],\"active\"],null]],[8],[1,[23,1,[\"displayName\"]],false],[9],[9],[0,\"\\n\"]],\"parameters\":[1]},null]],\"parameters\":[]},null]],\"parameters\":[]},null]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/molecules/navigation-stacked"}});
Ember.TEMPLATES["javascripts/styleguide/molecules/post-menu"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"post-menu\"]],{\"statements\":[[0,\"  \"],[1,[28,\"mount-widget\",null,[[\"widget\",\"args\"],[\"post-menu\",[24,[\"dummy\",\"transformedPost\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/molecules/post-menu"}});
Ember.TEMPLATES["javascripts/styleguide/molecules/signup-cta"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"signup-cta\"]],{\"statements\":[[0,\"  \"],[1,[22,\"signup-cta\"],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/molecules/signup-cta"}});
Ember.TEMPLATES["javascripts/styleguide/molecules/topic-list-item"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"topic list item\"]],{\"statements\":[[0,\"  \"],[7,\"table\",true],[10,\"class\",\"topic-list\"],[8],[0,\"\\n    \"],[7,\"tbody\",true],[8],[0,\"\\n      \"],[1,[28,\"topic-list-item\",null,[[\"topic\",\"showPosters\"],[[24,[\"dummy\",\"topic\"]],true]]],false],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"topic list item - hide category\"]],{\"statements\":[[0,\"  \"],[7,\"table\",true],[10,\"class\",\"topic-list\"],[8],[0,\"\\n    \"],[7,\"tbody\",true],[8],[0,\"\\n      \"],[1,[28,\"topic-list-item\",null,[[\"topic\",\"hideCategory\",\"showPosters\"],[[24,[\"dummy\",\"topic\"]],true,true]]],false],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"topic list item - show likes\"]],{\"statements\":[[0,\"  \"],[7,\"table\",true],[10,\"class\",\"topic-list\"],[8],[0,\"\\n    \"],[7,\"tbody\",true],[8],[0,\"\\n      \"],[1,[28,\"topic-list-item\",null,[[\"topic\",\"showLikes\",\"showPosters\"],[[24,[\"dummy\",\"topic\"]],true,true]]],false],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\",\"class\"],[\"topic list item - latest\",\"half-size\"]],{\"statements\":[[0,\"  \"],[1,[28,\"latest-topic-list-item\",null,[[\"topic\"],[[24,[\"dummy\",\"topic\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/molecules/topic-list-item"}});
Ember.TEMPLATES["javascripts/styleguide/molecules/topic-notifications"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"topic-notifications-button\"]],{\"statements\":[[0,\"  \"],[1,[28,\"topic-notifications-button\",null,[[\"topic\"],[[24,[\"dummy\",\"topic\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/molecules/topic-notifications"}});
Ember.TEMPLATES["javascripts/styleguide/molecules/topic-timer-info"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"topic-timer-info\"]],{\"statements\":[[0,\"  \"],[1,[28,\"topic-timer-info\",null,[[\"statusType\",\"executeAt\"],[\"reminder\",[24,[\"dummy\",\"soon\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/molecules/topic-timer-info"}});
Ember.TEMPLATES["javascripts/styleguide/organisms/00-post"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"post\"]],{\"statements\":[[0,\"  \"],[1,[28,\"mount-widget\",null,[[\"widget\",\"args\"],[\"post\",[24,[\"dummy\",\"transformedPost\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/organisms/00-post"}});
Ember.TEMPLATES["javascripts/styleguide/organisms/01-topic-map"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"topic-map\"]],{\"statements\":[[0,\"  \"],[1,[28,\"mount-widget\",null,[[\"widget\",\"args\"],[\"topic-map\",[24,[\"dummy\",\"transformedPost\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/organisms/01-topic-map"}});
Ember.TEMPLATES["javascripts/styleguide/organisms/03-topic-footer-buttons"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"topic-footer-buttons - logged in\"]],{\"statements\":[[0,\"  \"],[1,[28,\"topic-footer-buttons\",null,[[\"topic\"],[[24,[\"dummy\",\"topic\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"topic-footer-buttons - anonymous\"]],{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"id\",\"topic-footer-buttons\"],[8],[0,\"\\n    \"],[1,[28,\"d-button\",null,[[\"icon\",\"class\",\"label\"],[\"reply\",\"btn-primary pull-right\",\"topic.reply.title\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/organisms/03-topic-footer-buttons"}});
Ember.TEMPLATES["javascripts/styleguide/organisms/04-topic-list"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"topic-list\"]],{\"statements\":[[0,\"  \"],[1,[28,\"topic-list\",null,[[\"topics\",\"showPosters\"],[[24,[\"dummy\",\"topics\"]],true]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\"topic-list - hide posters\"]],{\"statements\":[[0,\"  \"],[1,[28,\"topic-list\",null,[[\"topics\",\"showPosters\"],[[24,[\"dummy\",\"topics\"]],false]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/organisms/04-topic-list"}});
Ember.TEMPLATES["javascripts/styleguide/organisms/basic-topic-list"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\",\"class\"],[\"basic-topic-list\",\"half-size\"]],{\"statements\":[[0,\"  \"],[1,[28,\"basic-topic-list\",null,[[\"topics\"],[[24,[\"dummy\",\"topics\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/organisms/basic-topic-list"}});
Ember.TEMPLATES["javascripts/styleguide/organisms/categories-list"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"categories-only\"]],{\"statements\":[[0,\"  \"],[1,[28,\"categories-only\",null,[[\"categories\"],[[24,[\"dummy\",\"categories\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/organisms/categories-list"}});
Ember.TEMPLATES["javascripts/styleguide/organisms/modal"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"d-modal\"]],{\"statements\":[[4,\"d-modal\",null,[[\"closeModal\",\"modalStyle\",\"title\"],[[28,\"action\",[[23,0,[]],\"dummy\"],null],\"inline-modal\",[28,\"i18n\",[\"styleguide.sections.modal.header\"],null]]],{\"statements\":[[4,\"d-modal-body\",null,null,{\"statements\":[[0,\"      \"],[1,[28,\"html-safe\",[[24,[\"dummy\",\"lorem\"]]],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[7,\"div\",true],[10,\"class\",\"modal-footer\"],[8],[0,\"\\n      \"],[1,[28,\"i18n\",[\"styleguide.sections.modal.footer\"],null],false],[0,\"\\n    \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/organisms/modal"}});
Ember.TEMPLATES["javascripts/styleguide/organisms/navigation"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"navigation\"]],{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"list-controls\"],[8],[0,\"\\n    \"],[7,\"div\",true],[10,\"class\",\"container\"],[8],[0,\"\\n\"],[4,\"d-section\",null,[[\"class\"],[\"navigation-container\"]],{\"statements\":[[0,\"        \"],[1,[28,\"bread-crumbs\",null,[[\"categories\"],[[24,[\"dummy\",\"categories\"]]]]],false],[0,\"\\n        \"],[1,[28,\"navigation-bar\",null,[[\"navItems\",\"filterMode\"],[[24,[\"dummy\",\"navItems\"]],\"latest\"]]],false],[0,\"\\n        \"],[1,[22,\"categories-admin-dropdown\"],false],[0,\"\\n        \"],[1,[28,\"create-topic-button\",null,[[\"canCreateTopic\"],[true]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/organisms/navigation"}});
Ember.TEMPLATES["javascripts/styleguide/organisms/site-header"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"site header - in topic - scrolled\"]],{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"d-header-wrap\"],[8],[0,\"\\n    \"],[7,\"header\",true],[10,\"class\",\"d-header\"],[8],[0,\"\\n      \"],[7,\"div\",true],[10,\"class\",\"wrap\"],[8],[0,\"\\n        \"],[7,\"div\",true],[10,\"class\",\"contents\"],[8],[0,\"\\n          \"],[1,[28,\"mount-widget\",null,[[\"widget\",\"args\"],[\"home-logo\",[28,\"hash\",null,[[\"minimized\"],[true]]]]]],false],[0,\"\\n          \"],[1,[28,\"mount-widget\",null,[[\"widget\",\"args\"],[\"header-topic-info\",[24,[\"dummy\"]]]]],false],[0,\"\\n          \"],[7,\"div\",true],[10,\"class\",\"panel clearfix\"],[8],[0,\"\\n            \"],[1,[28,\"mount-widget\",null,[[\"widget\",\"args\"],[\"header-icons\",[28,\"hash\",null,[[\"user\"],[[24,[\"dummy\",\"user\"]]]]]]]],false],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n      \"],[9],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/organisms/site-header"}});
Ember.TEMPLATES["javascripts/styleguide/organisms/suggested-topics"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\"suggested-topics\"]],{\"statements\":[[0,\"  \"],[1,[28,\"suggested-topics\",null,[[\"topic\"],[[24,[\"dummy\",\"topic\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/organisms/suggested-topics"}});
Ember.TEMPLATES["javascripts/styleguide/organisms/user-about"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"group\",\"uf\",\"group\",\"uf\"],\"statements\":[[4,\"styleguide-example\",null,[[\"title\"],[\".user-main .about.collapsed-info.no-background\"]],{\"statements\":[[4,\"d-section\",null,[[\"class\"],[\"user-main\"]],{\"statements\":[[0,\"    \"],[7,\"section\",true],[10,\"class\",\"collapsed-info about no-background\"],[8],[0,\"\\n      \"],[7,\"div\",true],[10,\"class\",\"profile-image\"],[8],[9],[0,\"\\n      \"],[7,\"div\",true],[10,\"class\",\"details\"],[8],[0,\"\\n        \"],[7,\"div\",true],[10,\"class\",\"primary\"],[8],[0,\"\\n          \"],[1,[28,\"bound-avatar\",[[24,[\"dummy\",\"user\"]],\"huge\"],null],false],[0,\"\\n          \"],[7,\"section\",true],[10,\"class\",\"controls\"],[8],[0,\"\\n            \"],[7,\"ul\",true],[8],[0,\"\\n              \"],[7,\"li\",true],[8],[0,\"\\n                \"],[7,\"a\",true],[10,\"class\",\"btn btn-primary\"],[8],[0,\"\\n                  \"],[1,[28,\"d-icon\",[\"envelope\"],null],false],[0,\"\\n                  \"],[1,[28,\"i18n\",[\"user.private_message\"],null],false],[0,\"\\n                \"],[9],[0,\"\\n              \"],[9],[0,\"\\n              \"],[7,\"li\",true],[8],[7,\"a\",true],[11,\"href\",[24,[\"dummy\",\"user\",\"adminPath\"]]],[10,\"class\",\"btn\"],[8],[1,[28,\"d-icon\",[\"wrench\"],null],false],[1,[28,\"i18n\",[\"admin.user.show_admin_profile\"],null],false],[9],[9],[0,\"\\n              \"],[7,\"li\",true],[8],[7,\"a\",true],[10,\"href\",\"#\"],[10,\"class\",\"btn\"],[8],[1,[28,\"d-icon\",[\"angle-double-down\"],null],false],[1,[28,\"i18n\",[\"user.expand_profile\"],null],false],[9],[9],[0,\"\\n            \"],[9],[0,\"\\n          \"],[9],[0,\"\\n\\n          \"],[7,\"div\",true],[10,\"class\",\"primary-textual\"],[8],[0,\"\\n            \"],[7,\"h1\",true],[10,\"class\",\"username\"],[8],[1,[24,[\"dummy\",\"user\",\"username\"]],false],[0,\" \"],[1,[28,\"d-icon\",[\"shield-alt\"],null],false],[9],[0,\"\\n            \"],[7,\"h2\",true],[10,\"class\",\"full-name\"],[8],[1,[24,[\"dummy\",\"user\",\"name\"]],false],[9],[0,\"\\n            \"],[7,\"h3\",true],[8],[1,[24,[\"dummy\",\"user\",\"title\"]],false],[9],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"div\",true],[10,\"style\",\"clear: both\"],[8],[9],[0,\"\\n      \"],[9],[0,\"\\n    \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\".user-main .about.collapsed-info.has-background\"]],{\"statements\":[[4,\"d-section\",null,[[\"class\"],[\"user-main\"]],{\"statements\":[[0,\"    \"],[7,\"section\",true],[10,\"class\",\"collapsed-info about has-background\"],[11,\"style\",[24,[\"dummy\",\"user\",\"profileBackground\"]]],[8],[0,\"\\n      \"],[7,\"div\",true],[10,\"class\",\"profile-image\"],[8],[9],[0,\"\\n      \"],[7,\"div\",true],[10,\"class\",\"details\"],[8],[0,\"\\n        \"],[7,\"div\",true],[10,\"class\",\"primary\"],[8],[0,\"\\n          \"],[1,[28,\"bound-avatar\",[[24,[\"dummy\",\"user\"]],\"huge\"],null],false],[0,\"\\n          \"],[7,\"section\",true],[10,\"class\",\"controls\"],[8],[0,\"\\n            \"],[7,\"ul\",true],[8],[0,\"\\n              \"],[7,\"li\",true],[8],[0,\"\\n                \"],[7,\"a\",true],[10,\"class\",\"btn btn-primary\"],[8],[0,\"\\n                  \"],[1,[28,\"d-icon\",[\"envelope\"],null],false],[0,\"\\n                  \"],[1,[28,\"i18n\",[\"user.private_message\"],null],false],[0,\"\\n                \"],[9],[0,\"\\n              \"],[9],[0,\"\\n              \"],[7,\"li\",true],[8],[7,\"a\",true],[11,\"href\",[24,[\"dummy\",\"user\",\"adminPath\"]]],[10,\"class\",\"btn\"],[8],[1,[28,\"d-icon\",[\"wrench\"],null],false],[1,[28,\"i18n\",[\"admin.user.show_admin_profile\"],null],false],[9],[9],[0,\"\\n              \"],[7,\"li\",true],[8],[7,\"a\",true],[10,\"href\",\"#\"],[10,\"class\",\"btn\"],[8],[1,[28,\"d-icon\",[\"angle-double-down\"],null],false],[1,[28,\"i18n\",[\"user.expand_profile\"],null],false],[9],[9],[0,\"\\n            \"],[9],[0,\"\\n          \"],[9],[0,\"\\n\\n          \"],[7,\"div\",true],[10,\"class\",\"primary-textual\"],[8],[0,\"\\n            \"],[7,\"h1\",true],[10,\"class\",\"username\"],[8],[1,[24,[\"dummy\",\"user\",\"username\"]],false],[0,\" \"],[1,[28,\"d-icon\",[\"shield-alt\"],null],false],[9],[0,\"\\n            \"],[7,\"h2\",true],[10,\"class\",\"full-name\"],[8],[1,[24,[\"dummy\",\"user\",\"name\"]],false],[9],[0,\"\\n            \"],[7,\"h3\",true],[8],[1,[24,[\"dummy\",\"user\",\"title\"]],false],[9],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"div\",true],[10,\"style\",\"clear: both\"],[8],[9],[0,\"\\n      \"],[9],[0,\"\\n    \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\".user-main .about.no-background\"]],{\"statements\":[[4,\"d-section\",null,[[\"class\"],[\"user-main\"]],{\"statements\":[[0,\"    \"],[7,\"section\",true],[10,\"class\",\"about no-background\"],[8],[0,\"\\n\\n      \"],[7,\"div\",true],[10,\"class\",\"staff-counters\"],[8],[0,\"\\n        \"],[7,\"div\",true],[8],[7,\"span\",true],[10,\"class\",\"helpful-flags\"],[8],[1,[24,[\"dummy\",\"user\",\"number_of_flags_given\"]],false],[9],[0,\" \"],[1,[28,\"i18n\",[\"user.staff_counters.flags_given\"],null],false],[9],[0,\"\\n        \"],[7,\"div\",true],[8],[0,\"\\n          \"],[7,\"a\",true],[10,\"href\",\"#\"],[8],[0,\"\\n            \"],[7,\"span\",true],[10,\"class\",\"flagged-posts\"],[8],[1,[24,[\"dummy\",\"user\",\"number_of_flagged_posts\"]],false],[9],[0,\" \"],[1,[28,\"i18n\",[\"user.staff_counters.flagged_posts\"],null],false],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"div\",true],[8],[0,\"\\n          \"],[7,\"a\",true],[10,\"href\",\"#\"],[8],[0,\"\\n            \"],[7,\"span\",true],[10,\"class\",\"deleted-posts\"],[8],[1,[24,[\"dummy\",\"user\",\"number_of_deleted_posts\"]],false],[9],[0,\" \"],[1,[28,\"i18n\",[\"user.staff_counters.deleted_posts\"],null],false],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"div\",true],[8],[7,\"span\",true],[10,\"class\",\"suspensions\"],[8],[1,[24,[\"dummy\",\"user\",\"number_of_suspensions\"]],false],[9],[0,\" \"],[1,[28,\"i18n\",[\"user.staff_counters.suspensions\"],null],false],[9],[0,\"\\n        \"],[7,\"div\",true],[8],[7,\"span\",true],[10,\"class\",\"warnings-received\"],[8],[1,[24,[\"dummy\",\"user\",\"warnings_received_count\"]],false],[9],[0,\" \"],[1,[28,\"i18n\",[\"user.staff_counters.warnings_received\"],null],false],[9],[0,\"\\n      \"],[9],[0,\"\\n\\n      \"],[7,\"div\",true],[10,\"class\",\"profile-image\"],[8],[9],[0,\"\\n      \"],[7,\"div\",true],[10,\"class\",\"details\"],[8],[0,\"\\n        \"],[7,\"div\",true],[10,\"class\",\"primary\"],[8],[0,\"\\n          \"],[1,[28,\"bound-avatar\",[[24,[\"dummy\",\"user\"]],\"huge\"],null],false],[0,\"\\n          \"],[7,\"section\",true],[10,\"class\",\"controls\"],[8],[0,\"\\n            \"],[7,\"ul\",true],[8],[0,\"\\n              \"],[7,\"li\",true],[8],[0,\"\\n                \"],[7,\"a\",true],[10,\"class\",\"btn btn-primary\"],[8],[0,\"\\n                  \"],[1,[28,\"d-icon\",[\"envelope\"],null],false],[0,\"\\n                  \"],[1,[28,\"i18n\",[\"user.private_message\"],null],false],[0,\"\\n                \"],[9],[0,\"\\n              \"],[9],[0,\"\\n              \"],[7,\"li\",true],[8],[7,\"a\",true],[11,\"href\",[24,[\"dummy\",\"user\",\"adminPath\"]]],[10,\"class\",\"btn\"],[8],[1,[28,\"d-icon\",[\"wrench\"],null],false],[1,[28,\"i18n\",[\"admin.user.show_admin_profile\"],null],false],[9],[9],[0,\"\\n            \"],[9],[0,\"\\n          \"],[9],[0,\"\\n\\n          \"],[7,\"div\",true],[10,\"class\",\"primary-textual\"],[8],[0,\"\\n            \"],[7,\"h1\",true],[10,\"class\",\"username\"],[8],[1,[24,[\"dummy\",\"user\",\"username\"]],false],[0,\" \"],[1,[28,\"d-icon\",[\"shield-alt\"],null],false],[9],[0,\"\\n            \"],[7,\"h2\",true],[10,\"class\",\"full-name\"],[8],[1,[24,[\"dummy\",\"user\",\"name\"]],false],[9],[0,\"\\n            \"],[7,\"h3\",true],[8],[1,[24,[\"dummy\",\"user\",\"title\"]],false],[9],[0,\"\\n            \"],[7,\"h3\",true],[8],[0,\"\\n              \"],[1,[28,\"d-icon\",[\"map-marker-alt\"],null],false],[0,\" \"],[1,[24,[\"dummy\",\"user\",\"location\"]],false],[0,\"\\n              \"],[1,[28,\"d-icon\",[\"globe\"],null],false],[0,\"\\n              \"],[7,\"a\",true],[11,\"href\",[24,[\"dummy\",\"user\",\"website\"]]],[10,\"rel\",\"nofollow noopener noreferrer\"],[10,\"target\",\"_blank\"],[8],[1,[24,[\"dummy\",\"user\",\"website_name\"]],false],[9],[0,\"\\n            \"],[9],[0,\"\\n\\n            \"],[7,\"div\",true],[10,\"class\",\"bio\"],[8],[0,\"\\n              \"],[7,\"div\",true],[10,\"class\",\"suspended\"],[8],[0,\"\\n                \"],[1,[28,\"d-icon\",[\"ban\"],null],false],[0,\"\\n                \"],[7,\"b\",true],[8],[1,[28,\"i18n\",[\"user.suspended_notice\"],[[\"date\"],[[24,[\"dummy\",\"user\",\"suspendedTillDate\"]]]]],false],[9],[7,\"br\",true],[8],[9],[0,\"\\n                \"],[7,\"b\",true],[8],[1,[28,\"i18n\",[\"user.suspended_reason\"],null],false],[9],[0,\" \"],[1,[24,[\"dummy\",\"user\",\"suspend_reason\"]],false],[0,\"\\n              \"],[9],[0,\"\\n              \"],[1,[28,\"html-safe\",[[24,[\"dummy\",\"user\",\"bio_cooked\"]]],null],false],[0,\"\\n            \"],[9],[0,\"\\n\\n            \"],[7,\"div\",true],[10,\"class\",\"public-user-fields\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"dummy\",\"user\",\"publicUserFields\"]]],null,{\"statements\":[[4,\"if\",[[23,4,[\"value\"]]],null,{\"statements\":[[0,\"                  \"],[7,\"div\",true],[11,\"class\",[29,[\"public-user-field \",[23,4,[\"field\",\"dasherized_name\"]]]]],[8],[0,\"\\n                    \"],[7,\"span\",true],[10,\"class\",\"user-field-name\"],[8],[1,[23,4,[\"field\",\"name\"]],false],[9],[0,\":\\n                    \"],[7,\"span\",true],[10,\"class\",\"user-field-value\"],[8],[1,[23,4,[\"value\"]],false],[9],[0,\"\\n                  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[4]},null],[0,\"            \"],[9],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"div\",true],[10,\"style\",\"clear: both\"],[8],[9],[0,\"\\n      \"],[9],[0,\"\\n\\n      \"],[7,\"div\",true],[10,\"class\",\"secondary\"],[8],[0,\"\\n        \"],[7,\"dl\",true],[8],[0,\"\\n          \"],[7,\"dt\",true],[8],[1,[28,\"i18n\",[\"user.created\"],null],false],[9],[7,\"dd\",true],[8],[1,[28,\"bound-date\",[[24,[\"dummy\",\"user\",\"created_at\"]]],null],false],[9],[0,\"\\n          \"],[7,\"dt\",true],[8],[1,[28,\"i18n\",[\"user.last_posted\"],null],false],[9],[7,\"dd\",true],[8],[1,[28,\"bound-date\",[[24,[\"dummy\",\"user\",\"last_posted_at\"]]],null],false],[9],[0,\"\\n          \"],[7,\"dt\",true],[8],[1,[28,\"i18n\",[\"user.last_seen\"],null],false],[9],[7,\"dd\",true],[8],[1,[28,\"bound-date\",[[24,[\"dummy\",\"user\",\"last_seen_at\"]]],null],false],[9],[0,\"\\n          \"],[7,\"dt\",true],[8],[1,[28,\"i18n\",[\"views\"],null],false],[9],[7,\"dd\",true],[8],[1,[24,[\"dummy\",\"user\",\"profile_view_count\"]],false],[9],[0,\"\\n          \"],[7,\"dt\",true],[10,\"class\",\"invited-by\"],[8],[1,[28,\"i18n\",[\"user.invited_by\"],null],false],[9],[7,\"dd\",true],[10,\"class\",\"invited-by\"],[8],[7,\"a\",true],[10,\"href\",\"#\"],[8],[1,[24,[\"dummy\",\"user\",\"invited_by\",\"username\"]],false],[9],[9],[0,\"\\n          \"],[7,\"dt\",true],[10,\"class\",\"trust-level\"],[8],[1,[28,\"i18n\",[\"user.trust_level\"],null],false],[9],[7,\"dd\",true],[10,\"class\",\"trust-level\"],[8],[1,[24,[\"dummy\",\"user\",\"trustLevel\",\"name\"]],false],[9],[0,\"\\n          \"],[7,\"dt\",true],[8],[1,[28,\"i18n\",[\"user.email.title\"],null],false],[9],[0,\"\\n          \"],[7,\"dd\",true],[11,\"title\",[24,[\"dummy\",\"user\",\"email\"]]],[8],[0,\"\\n            \"],[1,[28,\"d-button\",null,[[\"icon\",\"label\",\"class\"],[\"far-envelope\",\"admin.users.check_email.text\",\"btn-primary\"]]],false],[0,\"\\n          \"],[9],[0,\"\\n          \"],[7,\"dt\",true],[10,\"class\",\"groups\"],[8],[1,[28,\"i18n\",[\"groups.title\"],[[\"count\"],[[24,[\"dummy\",\"user\",\"displayGroups\",\"length\"]]]]],false],[9],[0,\"\\n          \"],[7,\"dd\",true],[10,\"class\",\"groups\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"dummy\",\"user\",\"displayGroups\"]]],null,{\"statements\":[[0,\"              \"],[7,\"span\",true],[8],[7,\"a\",true],[10,\"href\",\"#\"],[10,\"class\",\"group-link\"],[8],[1,[23,3,[\"name\"]],false],[9],[9],[0,\"\\n\"]],\"parameters\":[3]},null],[0,\"          \"],[9],[0,\"\\n          \"],[1,[28,\"d-button\",null,[[\"icon\",\"label\",\"class\"],[\"exclamation-triangle\",\"user.admin_delete\",\"btn-danger\"]]],false],[0,\"\\n        \"],[9],[0,\"\\n      \"],[9],[0,\"\\n    \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"styleguide-example\",null,[[\"title\"],[\".user-main .about.has-background\"]],{\"statements\":[[4,\"d-section\",null,[[\"class\"],[\"user-main\"]],{\"statements\":[[0,\"    \"],[7,\"section\",true],[10,\"class\",\"about has-background\"],[11,\"style\",[24,[\"dummy\",\"user\",\"profileBackground\"]]],[8],[0,\"\\n      \"],[7,\"div\",true],[10,\"class\",\"staff-counters\"],[8],[0,\"\\n        \"],[7,\"div\",true],[8],[7,\"span\",true],[10,\"class\",\"helpful-flags\"],[8],[1,[24,[\"dummy\",\"user\",\"number_of_flags_given\"]],false],[9],[0,\" \"],[1,[28,\"i18n\",[\"user.staff_counters.flags_given\"],null],false],[9],[0,\"\\n        \"],[7,\"div\",true],[8],[0,\"\\n          \"],[7,\"a\",true],[10,\"href\",\"#\"],[8],[0,\"\\n            \"],[7,\"span\",true],[10,\"class\",\"flagged-posts\"],[8],[1,[24,[\"dummy\",\"user\",\"number_of_flagged_posts\"]],false],[9],[0,\" \"],[1,[28,\"i18n\",[\"user.staff_counters.flagged_posts\"],null],false],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"div\",true],[8],[0,\"\\n          \"],[7,\"a\",true],[10,\"href\",\"#\"],[8],[0,\"\\n            \"],[7,\"span\",true],[10,\"class\",\"deleted-posts\"],[8],[1,[24,[\"dummy\",\"user\",\"number_of_deleted_posts\"]],false],[9],[0,\" \"],[1,[28,\"i18n\",[\"user.staff_counters.deleted_posts\"],null],false],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"div\",true],[8],[7,\"span\",true],[10,\"class\",\"suspensions\"],[8],[1,[24,[\"dummy\",\"user\",\"number_of_suspensions\"]],false],[9],[0,\" \"],[1,[28,\"i18n\",[\"user.staff_counters.suspensions\"],null],false],[9],[0,\"\\n        \"],[7,\"div\",true],[8],[7,\"span\",true],[10,\"class\",\"warnings-received\"],[8],[1,[24,[\"dummy\",\"user\",\"warnings_received_count\"]],false],[9],[0,\" \"],[1,[28,\"i18n\",[\"user.staff_counters.warnings_received\"],null],false],[9],[0,\"\\n      \"],[9],[0,\"\\n\\n      \"],[7,\"div\",true],[10,\"class\",\"profile-image\"],[8],[9],[0,\"\\n      \"],[7,\"div\",true],[10,\"class\",\"details\"],[8],[0,\"\\n        \"],[7,\"div\",true],[10,\"class\",\"primary\"],[8],[0,\"\\n          \"],[1,[28,\"bound-avatar\",[[24,[\"dummy\",\"user\"]],\"huge\"],null],false],[0,\"\\n          \"],[7,\"section\",true],[10,\"class\",\"controls\"],[8],[0,\"\\n            \"],[7,\"ul\",true],[8],[0,\"\\n              \"],[7,\"li\",true],[8],[0,\"\\n                \"],[7,\"a\",true],[10,\"class\",\"btn btn-primary\"],[8],[0,\"\\n                  \"],[1,[28,\"d-icon\",[\"envelope\"],null],false],[0,\"\\n                  \"],[1,[28,\"i18n\",[\"user.private_message\"],null],false],[0,\"\\n                \"],[9],[0,\"\\n              \"],[9],[0,\"\\n              \"],[7,\"li\",true],[8],[7,\"a\",true],[11,\"href\",[24,[\"dummy\",\"user\",\"adminPath\"]]],[10,\"class\",\"btn\"],[8],[1,[28,\"d-icon\",[\"wrench\"],null],false],[1,[28,\"i18n\",[\"admin.user.show_admin_profile\"],null],false],[9],[9],[0,\"\\n            \"],[9],[0,\"\\n          \"],[9],[0,\"\\n\\n          \"],[7,\"div\",true],[10,\"class\",\"primary-textual\"],[8],[0,\"\\n            \"],[7,\"h1\",true],[10,\"class\",\"username\"],[8],[1,[24,[\"dummy\",\"user\",\"username\"]],false],[0,\" \"],[1,[28,\"d-icon\",[\"shield-alt\"],null],false],[9],[0,\"\\n            \"],[7,\"h2\",true],[10,\"class\",\"full-name\"],[8],[1,[24,[\"dummy\",\"user\",\"name\"]],false],[9],[0,\"\\n            \"],[7,\"h3\",true],[8],[1,[24,[\"dummy\",\"user\",\"title\"]],false],[9],[0,\"\\n            \"],[7,\"h3\",true],[8],[0,\"\\n              \"],[1,[28,\"d-icon\",[\"map-marker-alt\"],null],false],[0,\" \"],[1,[24,[\"dummy\",\"user\",\"location\"]],false],[0,\"\\n              \"],[1,[28,\"d-icon\",[\"globe\"],null],false],[0,\"\\n              \"],[7,\"a\",true],[11,\"href\",[24,[\"dummy\",\"user\",\"website\"]]],[10,\"rel\",\"nofollow noopener noreferrer\"],[10,\"target\",\"_blank\"],[8],[1,[24,[\"dummy\",\"user\",\"website_name\"]],false],[9],[0,\"\\n            \"],[9],[0,\"\\n\\n            \"],[7,\"div\",true],[10,\"class\",\"bio\"],[8],[0,\"\\n              \"],[7,\"div\",true],[10,\"class\",\"suspended\"],[8],[0,\"\\n                \"],[1,[28,\"d-icon\",[\"ban\"],null],false],[0,\"\\n                \"],[7,\"b\",true],[8],[1,[28,\"i18n\",[\"user.suspended_notice\"],[[\"date\"],[[24,[\"dummy\",\"user\",\"suspendedTillDate\"]]]]],false],[9],[7,\"br\",true],[8],[9],[0,\"\\n                \"],[7,\"b\",true],[8],[1,[28,\"i18n\",[\"user.suspended_reason\"],null],false],[9],[0,\" \"],[1,[24,[\"dummy\",\"user\",\"suspend_reason\"]],false],[0,\"\\n              \"],[9],[0,\"\\n              \"],[1,[28,\"html-safe\",[[24,[\"dummy\",\"user\",\"bio_cooked\"]]],null],false],[0,\"\\n            \"],[9],[0,\"\\n\\n            \"],[7,\"div\",true],[10,\"class\",\"public-user-fields\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"dummy\",\"user\",\"publicUserFields\"]]],null,{\"statements\":[[4,\"if\",[[23,2,[\"value\"]]],null,{\"statements\":[[0,\"                  \"],[7,\"div\",true],[11,\"class\",[29,[\"public-user-field \",[23,2,[\"field\",\"dasherized_name\"]]]]],[8],[0,\"\\n                    \"],[7,\"span\",true],[10,\"class\",\"user-field-name\"],[8],[1,[23,2,[\"field\",\"name\"]],false],[9],[0,\":\\n                    \"],[7,\"span\",true],[10,\"class\",\"user-field-value\"],[8],[1,[23,2,[\"value\"]],false],[9],[0,\"\\n                  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[2]},null],[0,\"            \"],[9],[0,\"\\n\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"div\",true],[10,\"style\",\"clear: both\"],[8],[9],[0,\"\\n      \"],[9],[0,\"\\n\\n      \"],[7,\"div\",true],[10,\"class\",\"secondary\"],[8],[0,\"\\n        \"],[7,\"dl\",true],[8],[0,\"\\n          \"],[7,\"dt\",true],[8],[1,[28,\"i18n\",[\"user.created\"],null],false],[9],[7,\"dd\",true],[8],[1,[28,\"bound-date\",[[24,[\"dummy\",\"user\",\"created_at\"]]],null],false],[9],[0,\"\\n          \"],[7,\"dt\",true],[8],[1,[28,\"i18n\",[\"user.last_posted\"],null],false],[9],[7,\"dd\",true],[8],[1,[28,\"bound-date\",[[24,[\"dummy\",\"user\",\"last_posted_at\"]]],null],false],[9],[0,\"\\n          \"],[7,\"dt\",true],[8],[1,[28,\"i18n\",[\"user.last_seen\"],null],false],[9],[7,\"dd\",true],[8],[1,[28,\"bound-date\",[[24,[\"dummy\",\"user\",\"last_seen_at\"]]],null],false],[9],[0,\"\\n          \"],[7,\"dt\",true],[8],[1,[28,\"i18n\",[\"views\"],null],false],[9],[7,\"dd\",true],[8],[1,[24,[\"dummy\",\"user\",\"profile_view_count\"]],false],[9],[0,\"\\n          \"],[7,\"dt\",true],[10,\"class\",\"invited-by\"],[8],[1,[28,\"i18n\",[\"user.invited_by\"],null],false],[9],[7,\"dd\",true],[10,\"class\",\"invited-by\"],[8],[7,\"a\",true],[10,\"href\",\"#\"],[8],[1,[24,[\"dummy\",\"user\",\"invited_by\",\"username\"]],false],[9],[9],[0,\"\\n          \"],[7,\"dt\",true],[10,\"class\",\"trust-level\"],[8],[1,[28,\"i18n\",[\"user.trust_level\"],null],false],[9],[7,\"dd\",true],[10,\"class\",\"trust-level\"],[8],[1,[24,[\"dummy\",\"user\",\"trustLevel\",\"name\"]],false],[9],[0,\"\\n          \"],[7,\"dt\",true],[8],[1,[28,\"i18n\",[\"user.email.title\"],null],false],[9],[0,\"\\n          \"],[7,\"dd\",true],[11,\"title\",[24,[\"dummy\",\"user\",\"email\"]]],[8],[0,\"\\n            \"],[1,[28,\"d-button\",null,[[\"icon\",\"label\",\"class\"],[\"far-envelope\",\"admin.users.check_email.text\",\"btn-primary\"]]],false],[0,\"\\n          \"],[9],[0,\"\\n          \"],[7,\"dt\",true],[10,\"class\",\"groups\"],[8],[1,[28,\"i18n\",[\"groups.title\"],[[\"count\"],[[24,[\"dummy\",\"user\",\"displayGroups\",\"length\"]]]]],false],[9],[0,\"\\n          \"],[7,\"dd\",true],[10,\"class\",\"groups\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"dummy\",\"user\",\"displayGroups\"]]],null,{\"statements\":[[0,\"              \"],[7,\"span\",true],[8],[7,\"a\",true],[10,\"href\",\"#\"],[10,\"class\",\"group-link\"],[8],[1,[23,1,[\"name\"]],false],[9],[9],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"          \"],[9],[0,\"\\n          \"],[1,[28,\"d-button\",null,[[\"icon\",\"label\",\"class\"],[\"exclamation-triangle\",\"user.admin_delete\",\"btn-danger\"]]],false],[0,\"\\n        \"],[9],[0,\"\\n      \"],[9],[0,\"\\n    \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/organisms/user-about"}});
Ember.TEMPLATES["javascripts/styleguide/show"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"styleguide-section\",null,[[\"section\"],[[24,[\"section\"]]]],{\"statements\":[[4,\"if\",[[24,[\"note\"]]],null,{\"statements\":[[0,\"    \"],[7,\"div\",true],[10,\"class\",\"styleguide-note\"],[8],[0,\"\\n      \"],[1,[28,\"component\",[[28,\"concat\",[\"notes/\",[24,[\"note\"]]],null]],null],false],[0,\"\\n    \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n  \"],[1,[22,\"outlet\"],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide/show"}});
Ember.TEMPLATES["javascripts/styleguide"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"c\",\"s\"],\"statements\":[[7,\"section\",true],[10,\"class\",\"styleguide\"],[8],[0,\"\\n  \"],[7,\"section\",true],[10,\"class\",\"styleguide-menu\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"categories\"]]],null,{\"statements\":[[0,\"      \"],[7,\"ul\",true],[8],[0,\"\\n        \"],[7,\"li\",true],[10,\"class\",\"styleguide-heading\"],[8],[1,[28,\"i18n\",[[28,\"concat\",[\"styleguide.categories.\",[23,1,[\"id\"]]],null]],null],false],[9],[0,\"\\n\"],[4,\"each\",[[23,1,[\"sections\"]]],null,{\"statements\":[[0,\"          \"],[7,\"li\",true],[8],[1,[28,\"styleguide-link\",null,[[\"section\"],[[23,2,[]]]]],false],[9],[0,\"\\n\"]],\"parameters\":[2]},null],[0,\"      \"],[9],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"  \"],[9],[0,\"\\n  \"],[7,\"section\",true],[10,\"class\",\"styleguide-contents\"],[8],[0,\"\\n    \"],[1,[22,\"outlet\"],false],[0,\"\\n  \"],[9],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/styleguide"}});


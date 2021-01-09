define("discourse/plugins/discourse-calendar/initializers/event-relative-date", ["exports", "discourse-common/config/environment", "@ember/runloop", "discourse/plugins/discourse-calendar/lib/event-relative-date"], function (_exports, _environment, _runloop, _eventRelativeDate) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function computeRelativeEventDates() {
    document.querySelectorAll(".event-relative-date.topic-list").forEach(function (dateContainer) {
      return (0, _eventRelativeDate.default)(dateContainer);
    });
  }

  var _default = {
    name: "event-future-date",
    initialize: function initialize() {
      computeRelativeEventDates();

      if (!(0, _environment.isTesting)()) {
        this._tick();
      }
    },
    teardown: function teardown() {
      if (this._interval) {
        (0, _runloop.cancel)(this._interval);
        this._interval = null;
      }
    },
    _tick: function _tick() {
      var _this = this;

      this._interval && (0, _runloop.cancel)(this._interval);
      this._interval = (0, _runloop.later)(function () {
        computeRelativeEventDates();

        _this._tick();
      }, 60 * 1000);
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/initializers/discourse-post-event-decorator", ["exports", "I18n", "discourse/plugins/discourse-calendar/lib/guess-best-date-format", "discourse/lib/text", "discourse/widgets/glue", "discourse-common/lib/get-owner", "discourse/lib/plugin-api", "@ember/runloop"], function (_exports, _I18n, _guessBestDateFormat, _text, _glue, _getOwner, _pluginApi, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _decorateEvent(api, cooked, post) {
    _attachWidget(api, cooked, post);
  }

  function _validEventPreview(eventContainer) {
    eventContainer.innerHTML = "";
    eventContainer.classList.add("discourse-post-event-preview");
    var statusLocaleKey = "discourse_post_event.models.event.status.".concat(eventContainer.dataset.status || "public", ".title");

    if (_I18n.default.lookup(statusLocaleKey, {
      locale: "en"
    })) {
      var statusContainer = document.createElement("div");
      statusContainer.classList.add("event-preview-status");
      statusContainer.innerText = _I18n.default.t(statusLocaleKey);
      eventContainer.appendChild(statusContainer);
    }

    var datesContainer = document.createElement("div");
    datesContainer.classList.add("event-preview-dates");
    var startsAt = moment.utc(eventContainer.dataset.start).tz(moment.tz.guess());
    var endsAtValue = eventContainer.dataset.end;
    var format = (0, _guessBestDateFormat.default)(startsAt, endsAtValue && moment.utc(endsAtValue).tz(moment.tz.guess()));
    var datesString = "<span class='start'>".concat(startsAt.format(format), "</span>");

    if (endsAtValue) {
      datesString += " \u2192 <span class='end'>".concat(moment.utc(endsAtValue).tz(moment.tz.guess()).format(format), "</span>");
    }

    datesContainer.innerHTML = datesString;
    eventContainer.appendChild(datesContainer);
  }

  function _invalidEventPreview(eventContainer) {
    eventContainer.classList.add("discourse-post-event-preview", "alert", "alert-error");
    eventContainer.classList.remove("discourse-post-event");
    eventContainer.innerText = _I18n.default.t("discourse_post_event.preview.more_than_one_event");
  }

  function _decorateEventPreview(api, cooked) {
    var eventContainers = cooked.querySelectorAll(".discourse-post-event");
    eventContainers.forEach(function (eventContainer, index) {
      if (index > 0) {
        _invalidEventPreview(eventContainer);
      } else {
        _validEventPreview(eventContainer);
      }
    });
  }

  var _glued = [];

  function cleanUp() {
    _glued.forEach(function (g) {
      return g.cleanUp();
    });

    _glued = [];
  }

  function _attachWidget(api, cooked, eventModel) {
    var eventContainer = cooked.querySelector(".discourse-post-event");

    if (eventModel && eventContainer) {
      eventContainer.innerHTML = "";
      var datesHeight = 50;
      var urlHeight = 50;
      var headerHeight = 75;
      var bordersHeight = 10;
      var separatorsHeight = 4;
      var margins = 10;
      var widgetHeight = datesHeight + headerHeight + bordersHeight + separatorsHeight + margins;

      if (eventModel.should_display_invitees) {
        widgetHeight += 110;
      }

      if (eventModel.can_update_attendance) {
        widgetHeight += 60;
      }

      if (eventModel.url) {
        widgetHeight += urlHeight;
      }

      eventContainer.classList.add("is-loading");
      eventContainer.style.height = "".concat(widgetHeight, "px");
      var glueContainer = document.createElement("div");
      glueContainer.innerHTML = '<div class="spinner medium"></div>';
      eventContainer.appendChild(glueContainer);
      var startsAt = moment(eventModel.starts_at);
      var format = (0, _guessBestDateFormat.default)(startsAt, eventModel.ends_at && moment(eventModel.ends_at));
      var siteSettings = api.container.lookup("site-settings:main");

      if (siteSettings.discourse_local_dates_enabled) {
        var dates = [];
        dates.push("[date=".concat(moment.utc(eventModel.starts_at).format("YYYY-MM-DD"), " time=").concat(moment.utc(eventModel.starts_at).format("HH:mm"), " format=").concat(format, "]"));

        if (eventModel.ends_at) {
          var endsAt = moment.utc(eventModel.ends_at);
          dates.push("[date=".concat(endsAt.format("YYYY-MM-DD"), " time=").concat(endsAt.format("HH:mm"), " format=").concat(format, "]"));
        }

        (0, _text.cookAsync)(dates.join("<span> → </span>")).then(function (result) {
          eventContainer.classList.remove("is-loading");
          eventContainer.classList.add("is-loaded");
          var glue = new _glue.default("discourse-post-event", (0, _getOwner.getRegister)(api), {
            eventModel: eventModel,
            widgetHeight: widgetHeight,
            localDates: $(result.string).html()
          });
          glue.appendTo(glueContainer);

          _glued.push(glue);

          (0, _runloop.schedule)("afterRender", function () {
            return $(".discourse-local-date", $("[data-post-id=\"".concat(eventModel.id, "\"]"))).applyLocalDates();
          });
        });
      } else {
        var localDates = "".concat(startsAt.format(format));

        if (eventModel.ends_at) {
          localDates += " \u2192 ".concat(moment(eventModel.ends_at).format(format));
        }

        var glue = new _glue.default("discourse-post-event", (0, _getOwner.getRegister)(api), {
          eventModel: eventModel,
          widgetHeight: widgetHeight,
          localDates: localDates
        });
        glue.appendTo(glueContainer);

        _glued.push(glue);
      }
    } else if (!eventModel) {
      var loadedEventContainer = cooked.querySelector(".discourse-post-event");
      loadedEventContainer && loadedEventContainer.remove();
    }
  }

  function initializeDiscoursePostEventDecorator(api) {
    api.cleanupStream(cleanUp);
    api.decorateCookedElement(function (cooked, helper) {
      if (cooked.classList.contains("d-editor-preview")) {
        _decorateEventPreview(api, cooked);

        return;
      }

      if (helper) {
        var post = helper.getModel();

        if (post && post.event) {
          _decorateEvent(api, cooked, post.event);
        }
      }
    }, {
      id: "discourse-post-event-decorator"
    });
    api.replaceIcon("notification.discourse_post_event.notifications.invite_user_notification", "calendar-day");
    api.replaceIcon("notification.discourse_post_event.notifications.invite_user_auto_notification", "calendar-day");
    api.replaceIcon("notification.discourse_calendar.invite_user_notification", "calendar-day");
    api.replaceIcon("notification.discourse_post_event.notifications.invite_user_predefined_attendance_notification", "calendar-day");
    api.replaceIcon("notification.discourse_post_event.notifications.before_event_reminder", "calendar-day");
    api.replaceIcon("notification.discourse_post_event.notifications.after_event_reminder", "calendar-day");
    api.replaceIcon("notification.discourse_post_event.notifications.ongoing_event_reminder", "calendar-day");
    api.modifyClass("controller:topic", {
      subscribe: function subscribe() {
        var _this = this;

        this._super.apply(this, arguments);

        this.messageBus.subscribe("/discourse-post-event/" + this.get("model.id"), function (msg) {
          var postNode = document.querySelector(".onscreen-post[data-post-id=\"".concat(msg.id, "\"] .cooked"));

          if (postNode) {
            _this.store.find("discourse-post-event-event", msg.id).then(function (eventModel) {
              return _decorateEvent(api, postNode, eventModel);
            }).catch(function () {
              return _decorateEvent(api, postNode);
            });
          }
        });
      },
      unsubscribe: function unsubscribe() {
        this.messageBus.unsubscribe("/discourse-post-event/*");

        this._super.apply(this, arguments);
      }
    });
  }

  var _default = {
    name: "discourse-post-event-decorator",
    initialize: function initialize(container) {
      var siteSettings = container.lookup("site-settings:main");

      if (siteSettings.discourse_post_event_enabled) {
        (0, _pluginApi.withPluginApi)("0.8.7", initializeDiscoursePostEventDecorator);
      }
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/initializers/add-holiday-flair", ["exports", "I18n", "discourse/lib/plugin-api", "discourse-common/lib/icon-library", "@ember/runloop", "discourse-common/lib/get-url"], function (_exports, _I18n, _pluginApi, _iconLibrary, _runloop, _getUrl) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function applyFlairOnMention(element, username) {
    if (!element) {
      return;
    }

    var href = (0, _getUrl.default)("/u/".concat(username.toLowerCase()));
    var mentions = element.querySelectorAll("a.mention[href=\"".concat(href, "\"]"));
    mentions.forEach(function (mention) {
      if (!mention.querySelector(".d-icon-calendar-alt")) {
        mention.insertAdjacentHTML("beforeend", (0, _iconLibrary.iconHTML)("calendar-alt"));
      }

      mention.classList.add("on-holiday");
    });
  }

  var _default = {
    name: "add-holiday-flair",
    initialize: function initialize() {
      (0, _pluginApi.withPluginApi)("0.10.1", function (api) {
        var usernames = api.container.lookup("site:main").users_on_holiday;

        if (usernames && usernames.length > 0) {
          api.addUsernameSelectorDecorator(function (username) {
            if (usernames.includes(username)) {
              return "<span class=\"on-holiday\">".concat((0, _iconLibrary.iconHTML)("calendar-alt"), "</span>");
            }
          });
        }
      });
      (0, _pluginApi.withPluginApi)("0.8", function (api) {
        var usernames = api.container.lookup("site:main").users_on_holiday;

        if (usernames && usernames.length > 0) {
          var flairHandler;
          api.cleanupStream(function () {
            return flairHandler && (0, _runloop.cancel)(flairHandler);
          });
          api.decorateCooked(function ($el, helper) {
            if (helper) {
              // decorating a post
              usernames.forEach(function (username) {
                return applyFlairOnMention($el[0], username);
              });
            } else {
              // decorating preview
              flairHandler && (0, _runloop.cancel)(flairHandler);
              flairHandler = (0, _runloop.later)(function () {
                return usernames.forEach(function (username) {
                  return applyFlairOnMention($el[0], username);
                });
              }, 1000);
            }
          }, {
            id: "discourse-calendar-holiday-flair"
          });
          api.addPosterIcon(function (cfs) {
            if (cfs.on_holiday) {
              return {
                emoji: "desert_island",
                className: "holiday",
                title: _I18n.default.t("discourse_calendar.on_holiday")
              };
            }
          });
        }
      });
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/initializers/add-event-ui-builder", ["exports", "discourse/lib/plugin-api", "discourse/lib/show-modal"], function (_exports, _pluginApi, _showModal) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function initializeEventBuilder(api) {
    var currentUser = api.getCurrentUser();
    api.addToolbarPopupMenuOptionsCallback(function (composerController) {
      if (!currentUser || !currentUser.can_create_discourse_post_event) {
        return;
      }

      var composerModel = composerController.model;

      if (composerModel && !composerModel.replyingToTopic && (composerModel.topicFirstPost || composerModel.creatingPrivateMessage || composerModel.editingPost && composerModel.post && composerModel.post.post_number === 1)) {
        return {
          label: "discourse_post_event.builder_modal.attach",
          id: "insertEvent",
          group: "insertions",
          icon: "calendar-day",
          action: "insertEvent"
        };
      }
    });
    api.modifyClass("controller:composer", {
      actions: {
        insertEvent: function insertEvent() {
          var eventModel = this.store.createRecord("discourse-post-event-event");
          eventModel.set("status", "public");
          eventModel.set("custom_fields", {});
          (0, _showModal.default)("discourse-post-event-builder").setProperties({
            toolbarEvent: this.toolbarEvent,
            model: {
              eventModel: eventModel
            }
          });
        }
      }
    });
  }

  var _default = {
    name: "add-discourse-post-event-builder",
    initialize: function initialize(container) {
      var siteSettings = container.lookup("site-settings:main");

      if (siteSettings.discourse_post_event_enabled) {
        (0, _pluginApi.withPluginApi)("0.8.7", initializeEventBuilder);
      }
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/initializers/add-hamburger-menu-action", ["exports", "discourse/lib/plugin-api"], function (_exports, _pluginApi) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function initializeHamburgerMenu(api) {
    api.decorateWidget("hamburger-menu:generalLinks", function () {
      return {
        icon: "calendar-day",
        route: "discourse-post-event-upcoming-events",
        label: "discourse_post_event.upcoming_events.title"
      };
    });
  }

  var _default = {
    name: "add-hamburger-menu-action",
    initialize: function initialize(container) {
      var siteSettings = container.lookup("site-settings:main");

      if (siteSettings.discourse_post_event_enabled) {
        (0, _pluginApi.withPluginApi)("0.8.7", initializeHamburgerMenu);
      }
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/initializers/discourse-group-timezones", ["exports", "discourse/widgets/glue", "discourse-common/lib/get-owner", "discourse/lib/plugin-api"], function (_exports, _glue, _getOwner, _pluginApi) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    name: "discourse-group-timezones",
    initialize: function initialize() {
      (0, _pluginApi.withPluginApi)("0.8.7", function (api) {
        var _glued = [];

        function cleanUp() {
          _glued.forEach(function (g) {
            return g.cleanUp();
          });

          _glued = [];
        }

        function _attachWidget(container, options) {
          var glue = new _glue.default("discourse-group-timezones", (0, _getOwner.getRegister)(api), options);
          glue.appendTo(container);

          _glued.push(glue);
        }

        function _attachGroupTimezones($elem, post) {
          var $groupTimezones = $(".group-timezones", $elem);

          if (!$groupTimezones.length) {
            return;
          }

          $groupTimezones.each(function (idx, groupTimezone) {
            var group = groupTimezone.getAttribute("data-group");

            if (!group) {
              throw "[group] attribute is necessary when using timezones.";
            }

            var members = (post.get("group_timezones") || {})[group] || [];

            _attachWidget(groupTimezone, {
              id: "".concat(post.id, "-").concat(idx),
              members: members,
              group: group,
              usersOnHoliday: api.container.lookup("site:main").users_on_holiday || [],
              size: groupTimezone.getAttribute("data-size") || "medium"
            });
          });
        }

        function _attachPostWithGroupTimezones($elem, helper) {
          if (helper) {
            var post = helper.getModel();

            if (post) {
              api.preventCloak(post.id);

              _attachGroupTimezones($elem, post);
            }
          }
        }

        api.decorateCooked(_attachPostWithGroupTimezones, {
          id: "discourse-group-timezones"
        });
        api.cleanupStream(cleanUp);
      });
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/initializers/decorate-topic-title", ["exports", "discourse/lib/plugin-api", "discourse/plugins/discourse-calendar/lib/event-relative-date"], function (_exports, _pluginApi, _eventRelativeDate) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function initializeDecorateTopicTitle(api) {
    api.decorateTopicTitle(function (topic, node, topicTitleType) {
      var container = node.querySelector(".event-date-container");
      container && container.remove();

      if (!topic.event_starts_at || !topic.event_ends_at) {
        return;
      }

      if (topicTitleType === "topic-list-item-title" || topicTitleType === "header-title") {
        var eventdateContainer = document.createElement("div");
        eventdateContainer.classList.add("event-date-container");
        var eventDate = document.createElement("span");
        eventDate.classList.add("event-date", "event-relative-date");
        eventDate.dataset.starts_at = topic.event_starts_at;
        eventDate.dataset.ends_at = topic.event_ends_at;
        eventdateContainer.appendChild(eventDate);
        node.appendChild(eventdateContainer); // we force a first computation, as waiting for the auto update might take time

        (0, _eventRelativeDate.default)(eventDate);
      }
    });
  }

  var _default = {
    name: "decorate-topic-title",
    initialize: function initialize(container) {
      var siteSettings = container.lookup("site-settings:main");

      if (siteSettings.discourse_post_event_enabled) {
        (0, _pluginApi.withPluginApi)("0.8.40", initializeDecorateTopicTitle);
      }
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/initializers/discourse-calendar", ["exports", "rsvp", "@ember/utils", "discourse/lib/url", "discourse/lib/text", "discourse/lib/utilities", "discourse/lib/load-script", "discourse/lib/plugin-api", "discourse/lib/ajax", "discourse/lib/d-popover", "discourse/models/category"], function (_exports, _rsvp, _utils, _url, _text, _utilities, _loadScript, _pluginApi, _ajax, _dPopover, _category) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  // https://stackoverflow.com/a/16348977

  /* eslint-disable */
  // prettier-ignore
  function stringToHexColor(str) {
    var hash = 0;

    for (var i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    var hex = "#";

    for (var _i = 0; _i < 3; _i++) {
      var value = hash >> _i * 8 & 0xff;
      hex += ("00" + value.toString(16)).substr(-2);
    }

    return hex;
  }

  function loadFullCalendar() {
    return (0, _loadScript.default)("/plugins/discourse-calendar/javascripts/fullcalendar-with-moment-timezone.min.js");
  }

  function initializeDiscourseCalendar(api) {
    var _topicController;

    var outletName = Discourse.SiteSettings.calendar_categories_outlet;
    var site = api.container.lookup("site:main");
    var isMobileView = site && site.mobileView;
    var selector = ".".concat(outletName, "-outlet");

    if (outletName === "before-topic-list-body") {
      selector = ".topic-list:not(.shared-drafts) .".concat(outletName, "-outlet");
    }

    api.onPageChange(function (url, title) {
      var $calendarContainer = $("".concat(selector, ".category-calendar"));
      if (!$calendarContainer.length) return;
      $calendarContainer.hide();

      var browsedCategory = _category.default.findBySlugPathWithID(url);

      if (browsedCategory) {
        var settings = Discourse.SiteSettings.calendar_categories.split("|").filter(Boolean).map(function (stringSetting) {
          var data = {};
          stringSetting.split(";").filter(Boolean).forEach(function (s) {
            var parts = s.split("=");
            data[parts[0]] = parts[1];
          });
          return data;
        });
        var categorySetting = settings.findBy("categoryId", browsedCategory.id.toString());

        if (categorySetting && categorySetting.postId) {
          $calendarContainer.show();
          var postId = categorySetting.postId;
          var $spinner = $('<div class="calendar"><div class="spinner medium"></div></div>');
          $calendarContainer.html($spinner);
          loadFullCalendar().then(function () {
            var options = ["postId=".concat(postId)];
            var optionals = ["weekends", "tzPicker", "defaultView"];
            optionals.forEach(function (optional) {
              if ((0, _utils.isPresent)(categorySetting[optional])) {
                options.push("".concat(optional, "=").concat((0, _utilities.escapeExpression)(categorySetting[optional])));
              }
            });
            var rawCalendar = "[calendar ".concat(options.join(" "), "]\n[/calendar]");
            var cookRaw = (0, _text.cookAsync)(rawCalendar);
            var loadPost = (0, _ajax.ajax)("/posts/".concat(postId, ".json"));

            _rsvp.Promise.all([cookRaw, loadPost]).then(function (results) {
              var cooked = results[0];
              var post = results[1];
              var $cooked = $(cooked.string);
              $calendarContainer.html($cooked);
              render($(".calendar", $cooked), post);
            });
          });
        }
      }
    });
    api.decorateCooked(attachCalendar, {
      onlyStream: true,
      id: "discourse-calendar"
    });
    api.cleanupStream(cleanUp);
    api.registerCustomPostMessageCallback("calendar_change", function (topicController) {
      var stream = topicController.get("model.postStream");
      var post = stream.findLoadedPost(stream.get("firstPostId"));
      var $op = $(".topic-post article#post_1");
      var $calendar = $op.find(".calendar").first();

      if (post && $calendar.length > 0) {
        (0, _ajax.ajax)("/posts/".concat(post.id, ".json")).then(function (post) {
          return loadFullCalendar().then(function () {
            return render($calendar, post);
          });
        });
      }
    });

    function render($calendar, post) {
      $calendar = $calendar.empty();

      var timezone = _getTimeZone($calendar, api.getCurrentUser());

      var calendar = _buildCalendar($calendar, timezone);

      var isStatic = $calendar.attr("data-calendar-type") === "static";

      if (isStatic) {
        calendar.render();

        _setStaticCalendarEvents(calendar, $calendar, post);
      } else {
        _setDynamicCalendarEvents(calendar, post);

        calendar.render();

        _setDynamicCalendarOptions(calendar, $calendar);
      }

      _setupTimezonePicker(calendar, timezone);
    }

    function cleanUp() {
      window.removeEventListener("scroll", _dPopover.hidePopover);
    }

    function attachCalendar($elem, helper) {
      window.addEventListener("scroll", _dPopover.hidePopover);
      var $calendar = $(".calendar", $elem);

      if ($calendar.length === 0) {
        return;
      }

      loadFullCalendar().then(function () {
        return render($calendar, helper.getModel());
      });
    }

    function _buildCalendar($calendar, timeZone) {
      var $calendarTitle = document.querySelector(".discourse-calendar-header > .discourse-calendar-title");
      var defaultView = (0, _utilities.escapeExpression)($calendar.attr("data-calendar-default-view") || (isMobileView ? "listNextYear" : "month"));
      var showAddToCalendar = $calendar.attr("data-calendar-show-add-to-calendar") !== "false";
      return new window.FullCalendar.Calendar($calendar[0], {
        timeZone: timeZone,
        timeZoneImpl: "moment-timezone",
        nextDayThreshold: "06:00:00",
        displayEventEnd: true,
        height: 650,
        firstDay: 1,
        defaultView: defaultView,
        views: {
          listNextYear: {
            type: "list",
            duration: {
              days: 365
            },
            buttonText: "list",
            listDayFormat: {
              month: "long",
              year: "numeric",
              day: "numeric",
              weekday: "long"
            }
          }
        },
        header: {
          left: "prev,next today",
          center: "title",
          right: "month,basicWeek,listNextYear"
        },
        datesRender: function datesRender(info) {
          if (showAddToCalendar) {
            _insertAddToCalendarLinks(info);

            $calendarTitle.innerText = info.view.title;
          }
        }
      });
    }

    function _convertHtmlToDate(html) {
      var date = html.attr("data-date");

      if (!date) {
        return null;
      }

      var time = html.attr("data-time");
      var timezone = html.attr("data-timezone");
      var dateTime = date;

      if (time) {
        dateTime = "".concat(dateTime, " ").concat(time);
      }

      return {
        weeklyRecurring: html.attr("data-recurring") === "1.weeks",
        dateTime: moment.tz(dateTime, timezone || "Etc/UTC")
      };
    }

    function _buildEventObject(from, to) {
      var hasTimeSpecified = function hasTimeSpecified(d) {
        return d.hours() !== 0 || d.minutes() !== 0 || d.seconds() !== 0;
      };

      var event = {
        start: from.dateTime.toDate(),
        allDay: false
      };

      if (to) {
        if (hasTimeSpecified(to.dateTime) || hasTimeSpecified(from.dateTime)) {
          event.end = to.dateTime.toDate();
        } else {
          event.end = to.dateTime.add(1, "days").toDate();
          event.allDay = true;
        }
      } else {
        event.allDay = true;
      }

      if (from.weeklyRecurring) {
        event.startTime = {
          hours: from.dateTime.hours(),
          minutes: from.dateTime.minutes(),
          seconds: from.dateTime.seconds()
        };
        event.daysOfWeek = [from.dateTime.day()];
      }

      return event;
    }

    function _setStaticCalendarEvents(calendar, $calendar, post) {
      $("<div>".concat(post.cooked, "</div>")).find('.calendar[data-calendar-type="static"] p').html().trim().split("<br>").forEach(function (line) {
        var html = $.parseHTML(line);
        var htmlDates = html.filter(function (h) {
          return $(h).hasClass("discourse-local-date");
        });

        var from = _convertHtmlToDate($(htmlDates[0]));

        var to = _convertHtmlToDate($(htmlDates[1]));

        var event = _buildEventObject(from, to);

        event.title = html[0].textContent.trim();
        calendar.addEvent(event);
      });
    }

    function _setDynamicCalendarOptions(calendar, $calendar) {
      var skipWeekends = $calendar.attr("data-weekends") === "false";
      var hiddenDays = $calendar.attr("data-hidden-days");

      if (skipWeekends) {
        calendar.setOption("weekends", false);
      }

      if (hiddenDays) {
        calendar.setOption("hiddenDays", hiddenDays.split(",").map(function (d) {
          return parseInt(d);
        }));
      }

      calendar.setOption("eventClick", function (_ref) {
        var event = _ref.event,
            jsEvent = _ref.jsEvent;
        (0, _dPopover.hidePopover)(jsEvent);
        var _event$extendedProps = event.extendedProps,
            htmlContent = _event$extendedProps.htmlContent,
            postNumber = _event$extendedProps.postNumber,
            postUrl = _event$extendedProps.postUrl;

        if (postUrl) {
          _url.default.routeTo(postUrl);
        } else if (postNumber) {
          _topicController = _topicController || api.container.lookup("controller:topic");

          _topicController.send("jumpToPost", postNumber);
        } else if (isMobileView && htmlContent) {
          (0, _dPopover.showPopover)(jsEvent, {
            htmlContent: htmlContent
          });
        }
      });
      calendar.setOption("eventMouseEnter", function (_ref2) {
        var event = _ref2.event,
            jsEvent = _ref2.jsEvent;
        var htmlContent = event.extendedProps.htmlContent;
        if (!htmlContent) return;
        (0, _dPopover.showPopover)(jsEvent, {
          htmlContent: htmlContent
        });
      });
      calendar.setOption("eventMouseLeave", function (_ref3) {
        var jsEvent = _ref3.jsEvent;
        (0, _dPopover.hidePopover)(jsEvent);
      });
    }

    function _buildEvent(detail) {
      var event = _buildEventObject(detail.from ? {
        dateTime: moment(detail.from),
        weeklyRecurring: detail.recurring === "1.weeks"
      } : null, detail.to ? {
        dateTime: moment(detail.to),
        weeklyRecurring: detail.recurring === "1.weeks"
      } : null);

      event.extendedProps = {};

      if (detail.post_url) {
        event.extendedProps.postUrl = detail.post_url;
      } else if (detail.post_number) {
        event.extendedProps.postNumber = detail.post_number;
      } else {
        event.classNames = ["holiday"];
      }

      return event;
    }

    function _addStandaloneEvent(calendar, post, detail) {
      var event = _buildEvent(detail);

      var holidayCalendarTopicId = parseInt(Discourse.SiteSettings.holiday_calendar_topic_id, 10);
      var text = detail.message.split("\n").filter(function (e) {
        return e;
      });

      if (text.length && post.topic_id && holidayCalendarTopicId !== post.topic_id) {
        event.title = text[0];
        event.extendedProps.description = text.slice(1).join(" ");
      } else {
        event.title = detail.username;
        event.backgroundColor = stringToHexColor(detail.username);
      }

      var popupText = detail.message.substr(0, 50);

      if (detail.message.length > 50) {
        popupText = popupText + "...";
      }

      event.extendedProps.htmlContent = popupText;
      event.title = event.title.replace(/<img[^>]*>/g, "");
      calendar.addEvent(event);
    }

    function _addGroupedEvent(calendar, post, detail) {
      var htmlContent = "";
      var usernames = [];
      var localEventNames = [];
      Object.keys(detail.localEvents).sort().forEach(function (key) {
        var localEvent = detail.localEvents[key];
        htmlContent += "<b>".concat(key, "</b>: ").concat(localEvent.usernames.sort().join(", "), "<br>");
        usernames = usernames.concat(localEvent.usernames);
        localEventNames.push(key);
      });

      var event = _buildEvent(detail);

      event.classNames = ["grouped-event"];

      if (usernames.length > 3) {
        event.title = isMobileView ? usernames.length : "(".concat(usernames.length, ") ") + I18n.t("discourse_calendar.holiday");
      } else if (usernames.length === 1) {
        event.title = usernames[0];
      } else {
        event.title = isMobileView ? usernames.length : "(".concat(usernames.length, ") ") + usernames.slice(0, 3).join(", ");
      }

      if (localEventNames.length > 1) {
        event.extendedProps.htmlContent = htmlContent;
      } else {
        if (usernames.length > 1) {
          event.extendedProps.htmlContent = htmlContent;
        } else {
          event.extendedProps.htmlContent = localEventNames[0];
        }
      }

      calendar.addEvent(event);
    }

    function _setDynamicCalendarEvents(calendar, post) {
      var groupedEvents = [];
      (post.calendar_details || []).forEach(function (detail) {
        switch (detail.type) {
          case "grouped":
            groupedEvents.push(detail);
            break;

          case "standalone":
            _addStandaloneEvent(calendar, post, detail);

            break;
        }
      });
      var formatedGroupedEvents = {};
      groupedEvents.forEach(function (groupedEvent) {
        var minDate = moment(groupedEvent.from).utc().startOf("day").toISOString();
        var maxDate = moment(groupedEvent.to || groupedEvent.from).utc().endOf("day").toISOString();
        var identifier = "".concat(minDate, "-").concat(maxDate);
        formatedGroupedEvents[identifier] = formatedGroupedEvents[identifier] || {
          from: minDate,
          to: maxDate || minDate,
          localEvents: {}
        };
        formatedGroupedEvents[identifier].localEvents[groupedEvent.name] = formatedGroupedEvents[identifier].localEvents[groupedEvent.name] || {
          usernames: []
        };
        formatedGroupedEvents[identifier].localEvents[groupedEvent.name].usernames.push.apply(formatedGroupedEvents[identifier].localEvents[groupedEvent.name].usernames, groupedEvent.usernames);
      });
      Object.keys(formatedGroupedEvents).forEach(function (key) {
        var formatedGroupedEvent = formatedGroupedEvents[key];

        _addGroupedEvent(calendar, post, formatedGroupedEvent);
      });
    }

    function _getTimeZone($calendar, currentUser) {
      var defaultTimezone = $calendar.attr("data-calendar-default-timezone");
      var isValidDefaultTimezone = !!moment.tz.zone(defaultTimezone);

      if (!isValidDefaultTimezone) {
        defaultTimezone = null;
      }

      return defaultTimezone || currentUser && currentUser.timezone || moment.tz.guess();
    }

    function _setupTimezonePicker(calendar, timezone) {
      var $timezonePicker = $(".discourse-calendar-timezone-picker");

      if ($timezonePicker.length) {
        $timezonePicker.on("change", function (event) {
          calendar.setOption("timeZone", event.target.value);

          _insertAddToCalendarLinks(calendar);
        });
        moment.tz.names().forEach(function (timezone) {
          $timezonePicker.append(new Option(timezone, timezone));
        });
        $timezonePicker.val(timezone);
      } else {
        $(".discourse-calendar-timezone-wrap").text(timezone);
      }
    }

    function _insertAddToCalendarLinks(info) {
      if (info.view.type !== "listNextYear") return;
      var eventSegments = info.view.eventRenderer.segs;

      var eventSegmentDefMap = _eventSegmentDefMap(info);

      var _iterator = _createForOfIteratorHelper(eventSegments),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var event = _step.value;

          _insertAddToCalendarLinkForEvent(event, eventSegmentDefMap);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }

    function _insertAddToCalendarLinkForEvent(event, eventSegmentDefMap) {
      var eventTitle = event.eventRange.def.title;
      var map = eventSegmentDefMap[event.eventRange.def.defId];
      var startDate = map.start;
      var endDate = map.end;
      endDate = endDate ? _formatDateForGoogleApi(endDate, event.eventRange.def.allDay) : _endDateForAllDayEvent(startDate, event.eventRange.def.allDay);
      startDate = _formatDateForGoogleApi(startDate, event.eventRange.def.allDay);
      var link = document.createElement("a");
      var title = I18n.t("discourse_calendar.add_to_calendar");
      link.title = title;
      link.appendChild(document.createTextNode(title));
      link.href = "\n      http://www.google.com/calendar/event?action=TEMPLATE&text=".concat(encodeURIComponent(eventTitle), "&dates=").concat(startDate, "/").concat(endDate, "&details=").concat(encodeURIComponent(event.eventRange.def.extendedProps.description));
      link.target = "_blank";
      link.classList.add("fc-list-item-add-to-calendar");
      event.el.querySelector(".fc-list-item-title").appendChild(link);
    }

    function _formatDateForGoogleApi(date) {
      var allDay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      if (!allDay) return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
      return moment(date).utc().format("YYYYMMDD");
    }

    function _endDateForAllDayEvent(startDate, allDay) {
      var unit = allDay ? "days" : "hours";
      return _formatDateForGoogleApi(moment(startDate).add(1, unit).toDate(), allDay);
    }

    function _eventSegmentDefMap(info) {
      var map = {};

      var _iterator2 = _createForOfIteratorHelper(info.view.calendar.getEvents()),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var event = _step2.value;
          map[event._instance.defId] = {
            start: event.start,
            end: event.end
          };
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      return map;
    }
  }

  var _default = {
    name: "discourse-calendar",
    initialize: function initialize(container) {
      var siteSettings = container.lookup("site-settings:main");

      if (siteSettings.calendar_enabled) {
        (0, _pluginApi.withPluginApi)("0.8.22", initializeDiscourseCalendar);
      }
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/helpers/render-invitee", ["exports", "discourse/helpers/user-avatar", "discourse/lib/url", "discourse-common/lib/helpers", "@ember/template", "discourse/lib/utilities"], function (_exports, _userAvatar, _url, _helpers, _template, _utilities) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _helpers.htmlHelper)(function (invitee) {
    var path = (0, _url.userPath)(invitee.user.username);
    var template = "\n    <a href=\"".concat(path, "\" data-user-card=\"").concat(invitee.user.username, "\">\n      <span class=\"user\">\n        ").concat((0, _userAvatar.renderAvatar)(invitee.user, {
      imageSize: "medium"
    }), "\n        <span class=\"username\">\n         ").concat((0, _utilities.formatUsername)(invitee.user.username), "\n        </span>\n      </span>\n    </a>\n  ");
    return (0, _template.htmlSafe)(template);
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/helpers/format-future-date", ["exports", "discourse/plugins/discourse-calendar/lib/guess-best-date-format", "discourse-common/lib/helpers"], function (_exports, _guessBestDateFormat, _helpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _helpers.htmlHelper)(function (date) {
    date = moment.utc(date).tz(moment.tz.guess());
    var format = (0, _guessBestDateFormat.default)(date);
    return date.format(format);
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/helpers/format-event-name", ["exports", "discourse-common/lib/helpers"], function (_exports, _helpers) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.formatEventName = formatEventName;
  _exports.default = void 0;

  function formatEventName(event) {
    return event.name || event.post.topic.title;
  }

  var _default = (0, _helpers.htmlHelper)(function (event) {
    return formatEventName(event);
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/lib/round-time", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = roundTime;

  // https://github.com/WebDevTmas/moment-round
  if (typeof moment.fn.round !== "function") {
    moment.fn.round = function (precision, key, direction) {
      direction = direction || "round";

      var _this = this; //cache of this


      var methods = {
        hours: {
          name: "Hours",
          maxValue: 24
        },
        minutes: {
          name: "Minutes",
          maxValue: 60
        },
        seconds: {
          name: "Seconds",
          maxValue: 60
        },
        milliseconds: {
          name: "Milliseconds",
          maxValue: 1000
        }
      };
      var keys = {
        mm: methods.milliseconds.name,
        milliseconds: methods.milliseconds.name,
        Milliseconds: methods.milliseconds.name,
        s: methods.seconds.name,
        seconds: methods.seconds.name,
        Seconds: methods.seconds.name,
        m: methods.minutes.name,
        minutes: methods.minutes.name,
        Minutes: methods.minutes.name,
        H: methods.hours.name,
        h: methods.hours.name,
        hours: methods.hours.name,
        Hours: methods.hours.name
      };
      var value = 0;
      var rounded = false;
      var subRatio = 1;
      var maxValue; // make sure key is plural

      if (key.length > 1 && key !== "mm" && key.slice(-1) !== "s") {
        key += "s";
      }

      key = keys[key].toLowerCase(); //control

      if (!methods[key]) {
        throw new Error('The value to round is not valid. Possibles ["hours", "minutes", "seconds", "milliseconds"]');
      }

      var get = "get" + methods[key].name;
      var set = "set" + methods[key].name;

      for (var k in methods) {
        if (k === key) {
          value = _this._d[get]();
          maxValue = methods[k].maxValue;
          rounded = true;
        } else if (rounded) {
          subRatio *= methods[k].maxValue;
          value += _this._d["get" + methods[k].name]() / subRatio;

          _this._d["set" + methods[k].name](0);
        }
      }

      value = Math[direction](value / precision) * precision;
      value = Math.min(value, maxValue);

      _this._d[set](value);

      return _this;
    };
  }

  if (typeof moment.fn.ceil !== "function") {
    moment.fn.ceil = function (precision, key) {
      return this.round(precision, key, "ceil");
    };
  }

  if (typeof moment.fn.floor !== "function") {
    moment.fn.floor = function (precision, key) {
      return this.round(precision, key, "floor");
    };
  }

  var STEP = 15;

  function roundTime(date) {
    return date.round(STEP, "minutes");
  }
});
define("discourse/plugins/discourse-calendar/lib/guess-best-date-format", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.isNotFullDayEvent = isNotFullDayEvent;
  _exports.default = guessDateFormat;

  function isNotFullDayEvent(startsAt, endsAt) {
    return startsAt.hours() > 0 || startsAt.minutes() > 0 || endsAt && (moment(endsAt).hours() > 0 || moment(endsAt).minutes() > 0);
  }

  function guessDateFormat(startsAt, endsAt) {
    var format;

    if (!isNotFullDayEvent(startsAt, endsAt)) {
      format = "LL";
    } else {
      format = "LLL";
    }

    return format;
  }
});
define("discourse/plugins/discourse-calendar/lib/regions", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.TIME_ZONE_TO_REGION = _exports.HOLIDAY_REGIONS = void 0;
  // DO NOT EDIT THIS FILE!!!
  // Update it by running `rake javascript:update_constants`
  var HOLIDAY_REGIONS = ["ar", "at", "au", "au_nsw", "au_vic", "au_qld", "au_nt", "au_act", "au_sa", "au_wa", "au_tas", "au_tas_south", "au_qld_cairns", "au_qld_brisbane", "au_tas_north", "au_vic_melbourne", "be_fr", "be_nl", "br", "bg_en", "bg_bg", "ca", "ca_qc", "ca_ab", "ca_sk", "ca_on", "ca_bc", "ca_nb", "ca_mb", "ca_ns", "ca_pe", "ca_nl", "ca_nt", "ca_nu", "ca_yt", "us", "ch_zh", "ch_be", "ch_lu", "ch_ur", "ch_sz", "ch_ow", "ch_nw", "ch_gl", "ch_zg", "ch_fr", "ch_so", "ch_bs", "ch_bl", "ch_sh", "ch_ar", "ch_ai", "ch_sg", "ch_gr", "ch_ag", "ch_tg", "ch_ti", "ch_vd", "ch_ne", "ch_ge", "ch_ju", "ch_vs", "ch", "cl", "co", "cr", "cz", "dk", "de", "de_bw", "de_by", "de_he", "de_nw", "de_rp", "de_sl", "de_sn_sorbian", "de_th_cath", "de_sn", "de_st", "de_be", "de_by_cath", "de_by_augsburg", "de_bb", "de_mv", "de_th", "de_hb", "de_hh", "de_ni", "de_sh", "ee", "el", "es_pv", "es_na", "es_an", "es_ib", "es_cm", "es_mu", "es_m", "es_ar", "es_cl", "es_cn", "es_lo", "es_ga", "es_ce", "es_o", "es_ex", "es", "es_ct", "es_v", "es_vc", "fi", "fr_a", "fr_m", "fr", "gb", "gb_eng", "gb_wls", "gb_eaw", "gb_nir", "je", "gb_jsy", "gg", "gb_gsy", "gb_sct", "gb_con", "im", "gb_iom", "ge", "hr", "hk", "hu", "ie", "is", "it", "it_ve", "it_tv", "it_vr", "it_pd", "it_fi", "it_ge", "it_to", "it_rm", "it_vi", "it_bl", "it_ro", "kr", "li", "lt", "lv", "ma", "mt_mt", "mt_en", "mx", "mx_pue", "nl", "lu", "no", "nz", "nz_sl", "nz_we", "nz_ak", "nz_nl", "nz_ne", "nz_ot", "nz_ta", "nz_sc", "nz_hb", "nz_mb", "nz_ca", "nz_ch", "nz_wl", "pe", "ph", "pl", "pt", "pt_li", "pt_po", "ro", "rs_cyrl", "rs_la", "ru", "se", "tn", "tr", "ua", "us_fl", "us_la", "us_ct", "us_de", "us_gu", "us_hi", "us_in", "us_ky", "us_nj", "us_nc", "us_nd", "us_pr", "us_tn", "us_ms", "us_id", "us_ar", "us_tx", "us_dc", "us_md", "us_va", "us_vt", "us_ak", "us_ca", "us_me", "us_ma", "us_al", "us_ga", "us_ne", "us_mo", "us_sc", "us_wv", "us_vi", "us_ut", "us_ri", "us_az", "us_co", "us_il", "us_mt", "us_nm", "us_ny", "us_oh", "us_pa", "us_mi", "us_mn", "us_nv", "us_or", "us_sd", "us_wa", "us_wi", "us_wy", "us_ia", "us_ks", "us_nh", "us_ok", "za", "ve", "sk", "si", "jp", "vi", "sg", "my", "th", "ng"];
  _exports.HOLIDAY_REGIONS = HOLIDAY_REGIONS;
  var TIME_ZONE_TO_REGION = {
    "America/Argentina/Buenos_Aires": "ar",
    "America/Argentina/Cordoba": "ar",
    "America/Argentina/Salta": "ar",
    "America/Argentina/Jujuy": "ar",
    "America/Argentina/Tucuman": "ar",
    "America/Argentina/Catamarca": "ar",
    "America/Argentina/La_Rioja": "ar",
    "America/Argentina/San_Juan": "ar",
    "America/Argentina/Mendoza": "ar",
    "America/Argentina/San_Luis": "ar",
    "America/Argentina/Rio_Gallegos": "ar",
    "America/Argentina/Ushuaia": "ar",
    "Europe/Vienna": "at",
    "Australia/Lord_Howe": "au",
    "Antarctica/Macquarie": "au",
    "Australia/Hobart": "au",
    "Australia/Currie": "au",
    "Australia/Melbourne": "au",
    "Australia/Sydney": "au",
    "Australia/Broken_Hill": "au",
    "Australia/Brisbane": "au",
    "Australia/Lindeman": "au",
    "Australia/Adelaide": "au",
    "Australia/Darwin": "au",
    "Australia/Perth": "au",
    "Australia/Eucla": "au",
    "America/Noronha": "br",
    "America/Belem": "br",
    "America/Fortaleza": "br",
    "America/Recife": "br",
    "America/Araguaina": "br",
    "America/Maceio": "br",
    "America/Bahia": "br",
    "America/Sao_Paulo": "br",
    "America/Campo_Grande": "br",
    "America/Cuiaba": "br",
    "America/Santarem": "br",
    "America/Porto_Velho": "br",
    "America/Boa_Vista": "br",
    "America/Manaus": "br",
    "America/Eirunepe": "br",
    "America/Rio_Branco": "br",
    "America/St_Johns": "ca",
    "America/Halifax": "ca",
    "America/Glace_Bay": "ca",
    "America/Moncton": "ca",
    "America/Goose_Bay": "ca",
    "America/Blanc-Sablon": "ca",
    "America/Toronto": "ca",
    "America/Nipigon": "ca",
    "America/Thunder_Bay": "ca",
    "America/Iqaluit": "ca",
    "America/Pangnirtung": "ca",
    "America/Atikokan": "ca",
    "America/Winnipeg": "ca",
    "America/Rainy_River": "ca",
    "America/Resolute": "ca",
    "America/Rankin_Inlet": "ca",
    "America/Regina": "ca",
    "America/Swift_Current": "ca",
    "America/Edmonton": "ca",
    "America/Cambridge_Bay": "ca",
    "America/Yellowknife": "ca",
    "America/Inuvik": "ca",
    "America/Creston": "ca",
    "America/Dawson_Creek": "ca",
    "America/Fort_Nelson": "ca",
    "America/Vancouver": "ca",
    "America/Whitehorse": "ca",
    "America/Dawson": "ca",
    "Europe/Zurich": "ch",
    "America/Santiago": "cl",
    "America/Punta_Arenas": "cl",
    "Pacific/Easter": "cl",
    "America/Bogota": "co",
    "America/Costa_Rica": "cr",
    "Europe/Prague": "cz",
    "Europe/Berlin": "de",
    "Europe/Copenhagen": "dk",
    "Europe/Tallinn": "ee",
    "Europe/Madrid": "es",
    "Africa/Ceuta": "es",
    "Atlantic/Canary": "es",
    "Europe/Helsinki": "fi",
    "Europe/Paris": "fr",
    "Europe/London": "gb",
    "Asia/Tbilisi": "ge",
    "Europe/Athens": "el",
    "Asia/Hong_Kong": "hk",
    "Europe/Budapest": "hu",
    "Europe/Dublin": "ie",
    "Atlantic/Reykjavik": "is",
    "Europe/Rome": "it",
    "Asia/Tokyo": "jp",
    "Asia/Seoul": "kr",
    "Europe/Vilnius": "lt",
    "Europe/Luxembourg": "lu",
    "Europe/Riga": "lv",
    "Africa/Casablanca": "ma",
    "America/Mexico_City": "mx",
    "America/Cancun": "mx",
    "America/Merida": "mx",
    "America/Monterrey": "mx",
    "America/Matamoros": "mx",
    "America/Mazatlan": "mx",
    "America/Chihuahua": "mx",
    "America/Ojinaga": "mx",
    "America/Hermosillo": "mx",
    "America/Tijuana": "mx",
    "America/Bahia_Banderas": "mx",
    "Asia/Kuala_Lumpur": "my",
    "Asia/Kuching": "my",
    "Africa/Lagos": "ng",
    "Europe/Amsterdam": "nl",
    "Europe/Oslo": "no",
    "Pacific/Auckland": "nz",
    "Pacific/Chatham": "nz",
    "America/Lima": "pe",
    "Asia/Manila": "ph",
    "Europe/Warsaw": "pl",
    "Europe/Lisbon": "pt",
    "Atlantic/Madeira": "pt",
    "Atlantic/Azores": "pt",
    "Europe/Bucharest": "ro",
    "Europe/Kaliningrad": "ru",
    "Europe/Moscow": "ru",
    "Europe/Simferopol": "ru",
    "Europe/Kirov": "ru",
    "Europe/Astrakhan": "ru",
    "Europe/Volgograd": "ru",
    "Europe/Saratov": "ru",
    "Europe/Ulyanovsk": "ru",
    "Europe/Samara": "ru",
    "Asia/Yekaterinburg": "ru",
    "Asia/Omsk": "ru",
    "Asia/Novosibirsk": "ru",
    "Asia/Barnaul": "ru",
    "Asia/Tomsk": "ru",
    "Asia/Novokuznetsk": "ru",
    "Asia/Krasnoyarsk": "ru",
    "Asia/Irkutsk": "ru",
    "Asia/Chita": "ru",
    "Asia/Yakutsk": "ru",
    "Asia/Khandyga": "ru",
    "Asia/Vladivostok": "ru",
    "Asia/Ust-Nera": "ru",
    "Asia/Magadan": "ru",
    "Asia/Sakhalin": "ru",
    "Asia/Srednekolymsk": "ru",
    "Asia/Kamchatka": "ru",
    "Asia/Anadyr": "ru",
    "Europe/Stockholm": "se",
    "Asia/Singapore": "sg",
    "Asia/Bangkok": "th",
    "Africa/Tunis": "tn",
    "Europe/Istanbul": "tr",
    "Europe/Kiev": "ua",
    "Europe/Uzhgorod": "ua",
    "Europe/Zaporozhye": "ua",
    "America/New_York": "us",
    "America/Detroit": "us",
    "America/Kentucky/Louisville": "us",
    "America/Kentucky/Monticello": "us",
    "America/Indiana/Indianapolis": "us",
    "America/Indiana/Vincennes": "us",
    "America/Indiana/Winamac": "us",
    "America/Indiana/Marengo": "us",
    "America/Indiana/Petersburg": "us",
    "America/Indiana/Vevay": "us",
    "America/Chicago": "us",
    "America/Indiana/Tell_City": "us",
    "America/Indiana/Knox": "us",
    "America/Menominee": "us",
    "America/North_Dakota/Center": "us",
    "America/North_Dakota/New_Salem": "us",
    "America/North_Dakota/Beulah": "us",
    "America/Denver": "us",
    "America/Boise": "us",
    "America/Phoenix": "us",
    "America/Los_Angeles": "us",
    "America/Anchorage": "us",
    "America/Juneau": "us",
    "America/Sitka": "us",
    "America/Metlakatla": "us",
    "America/Yakutat": "us",
    "America/Nome": "us",
    "America/Adak": "us",
    "Pacific/Honolulu": "us",
    "America/Caracas": "ve",
    "Africa/Johannesburg": "za",
    "Europe/Busingen": "de",
    "Europe/Guernsey": "gg",
    "Europe/Zagreb": "hr",
    "Europe/Isle_of_Man": "im",
    "Europe/Jersey": "je",
    "Europe/Vaduz": "li",
    "Europe/Ljubljana": "si",
    "Europe/Bratislava": "sk",
    "America/St_Thomas": "vi"
  };
  _exports.TIME_ZONE_TO_REGION = TIME_ZONE_TO_REGION;
});
define("discourse/plugins/discourse-calendar/lib/event-relative-date", ["exports", "I18n"], function (_exports, _I18n) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = eventRelativeDate;

  function _computeCurrentEvent(container, endsAt) {
    var indicator = document.createElement("div");
    indicator.classList.add("indicator");
    container.appendChild(indicator);
    var text = document.createElement("span");
    text.classList.add("text");
    text.innerText = _I18n.default.t("discourse_post_event.topic_title.ends_in_duration", {
      duration: endsAt.from(moment())
    });
    container.appendChild(text);
  }

  function _computePastEvent(container, endsAt) {
    container.innerText = endsAt.from(moment());
  }

  function _computeFutureEvent(container, startsAt) {
    container.innerText = startsAt.from(moment());
  }

  function eventRelativeDate(container) {
    container.classList.remove("past", "current", "future");
    container.innerHTML = "";
    var startsAt = moment.utc(container.dataset.starts_at).tz(moment.tz.guess());
    var endsAt = moment.utc(container.dataset.ends_at).tz(moment.tz.guess());

    if (startsAt.isAfter(moment()) && endsAt.isAfter(moment())) {
      container.classList.add("future");

      _computeFutureEvent(container, startsAt);

      return;
    }

    if (startsAt.isBefore(moment()) && endsAt.isAfter(moment())) {
      container.classList.add("current");

      _computeCurrentEvent(container, endsAt);

      return;
    }

    if (startsAt.isBefore(moment()) && endsAt.isBefore(moment())) {
      container.classList.add("past");

      _computePastEvent(container, endsAt);

      return;
    }
  }
});
define("discourse/plugins/discourse-calendar/lib/raw-event-helper", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.buildParams = buildParams;
  _exports.replaceRaw = replaceRaw;

  function buildParams(startsAt, endsAt, eventModel, siteSettings) {
    var params = {};

    if (startsAt) {
      params.start = moment(startsAt).utc().format("YYYY-MM-DD HH:mm");
    } else {
      params.start = moment().utc().format("YYYY-MM-DD HH:mm");
    }

    if (eventModel.status) {
      params.status = eventModel.status;
    }

    if (eventModel.name) {
      params.name = eventModel.name;
    }

    if (eventModel.url) {
      params.url = eventModel.url;
    }

    if (eventModel.recurrence) {
      params.recurrence = eventModel.recurrence;
    }

    if (endsAt) {
      params.end = moment(endsAt).utc().format("YYYY-MM-DD HH:mm");
    }

    if (eventModel.status === "private") {
      params.allowedGroups = (eventModel.raw_invitees || []).join(",");
    }

    if (eventModel.status === "public") {
      params.allowedGroups = "trust_level_0";
    }

    if (eventModel.reminders && eventModel.reminders.length) {
      params.reminders = eventModel.reminders.map(function (r) {
        // we create a new intermediate object to avoid changes in the UI while
        // we prepare the values for request
        var reminder = Object.assign({}, r);

        if (reminder.period === "after") {
          reminder.value = "-".concat(Math.abs(parseInt(reminder.value, 10)));
        }

        if (reminder.period === "before") {
          reminder.value = Math.abs(parseInt("".concat(reminder.value), 10));
        }

        return "".concat(reminder.value, ".").concat(reminder.unit);
      }).join(",");
    }

    siteSettings.discourse_post_event_allowed_custom_fields.split("|").filter(Boolean).forEach(function (setting) {
      var param = camelCase(setting);

      if (typeof eventModel.custom_fields[setting] !== "undefined") {
        params[param] = eventModel.custom_fields[setting];
      }
    });
    return params;
  }

  function replaceRaw(params, raw) {
    var eventRegex = new RegExp("\\[event\\s(.*?)\\]", "m");
    var eventMatches = raw.match(eventRegex);

    if (eventMatches && eventMatches[1]) {
      var markdownParams = [];
      Object.keys(params).forEach(function (param) {
        var value = params[param];

        if (value && value.length) {
          markdownParams.push("".concat(param, "=\"").concat(params[param], "\""));
        }
      });
      return raw.replace(eventRegex, "[event ".concat(markdownParams.join(" "), "]"));
    }

    return false;
  }

  function camelCase(input) {
    return input.toLowerCase().replace(/-/g, "_").replace(/_(.)/g, function (match, group1) {
      return group1.toUpperCase();
    });
  }
});
define("discourse/plugins/discourse-calendar/lib/clean-title", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = cleanTitle;
  var DATE_SEPARATOR = "[-/]";
  var DATE_TIME_REGEX = new RegExp("[^|\\s](\\d{1,2}".concat(DATE_SEPARATOR, "\\d{1,2}").concat(DATE_SEPARATOR, "\\d{2,4}(?:\\s\\d{1,2}:\\d{2})?)$"), "g");

  function cleanTitle(title, startsAt) {
    if (!title || !startsAt) {
      return;
    }

    var match = title.trim().match(DATE_TIME_REGEX);
    return match && match[0];
  }
});
define("discourse/plugins/discourse-calendar/lib/discourse-markdown/discourse-post-event-block", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.setup = setup;
  var rule = {
    tag: "event",
    wrap: function wrap(token, info) {
      if (!info.attrs.start) {
        return false;
      }

      token.attrs = [["class", "discourse-post-event"]];
      Object.keys(info.attrs).forEach(function (key) {
        var value = info.attrs[key];

        if (typeof value !== "undefined") {
          token.attrs.push(["data-".concat(dasherize(key)), value]);
        }
      });
      return true;
    }
  };

  function dasherize(input) {
    return input.replace(/[A-Z]/g, function (char, index) {
      return (index !== 0 ? "-" : "") + char.toLowerCase();
    });
  }

  function setup(helper) {
    helper.whiteList(["div.discourse-post-event"]);
    helper.registerOptions(function (opts, siteSettings) {
      opts.features.discourse_post_event = siteSettings.calendar_enabled && siteSettings.discourse_post_event_enabled;
    });
    helper.registerPlugin(function (md) {
      return md.block.bbcode.ruler.push("discourse-post-event", rule);
    });
  }
});
define("discourse/plugins/discourse-calendar/lib/discourse-markdown/discourse-calendar", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.setup = setup;
  var calendarRule = {
    tag: "calendar",
    before: function before(state, info) {
      var wrapperDivToken = state.push("div_calendar_wrap", "div", 1);
      wrapperDivToken.attrs = [["class", "discourse-calendar-wrap"]];
      var headerDivToken = state.push("div_calendar_header", "div", 1);
      headerDivToken.attrs = [["class", "discourse-calendar-header"]];
      var titleH2Token = state.push("h2_open", "h2", 1);
      titleH2Token.attrs = [["class", "discourse-calendar-title"]];
      state.push("h2_close", "h2", -1);
      var timezoneWrapToken = state.push("span_open", "span", 1);
      timezoneWrapToken.attrs = [["class", "discourse-calendar-timezone-wrap"]];

      if (info.attrs.tzPicker === "true") {
        _renderTimezonePicker(state);
      }

      state.push("span_close", "span", -1);
      state.push("div_calendar_header", "div", -1);
      var mainCalendarDivToken = state.push("div_calendar", "div", 1);
      mainCalendarDivToken.attrs = [["class", "calendar"], ["data-calendar-type", info.attrs.type || "dynamic"], ["data-calendar-default-timezone", info.attrs.defaultTimezone]];

      if (info.attrs.defaultView) {
        mainCalendarDivToken.attrs.push(["data-calendar-default-view", info.attrs.defaultView]);
      }

      if (info.attrs.weekends) {
        mainCalendarDivToken.attrs.push(["data-weekends", info.attrs.weekends]);
      }

      if (info.attrs.showAddToCalendar) {
        mainCalendarDivToken.attrs.push(["data-calendar-show-add-to-calendar", info.attrs.showAddToCalendar === "true"]);
      }

      if (info.attrs.hiddenDays) {
        mainCalendarDivToken.attrs.push(["data-hidden-days", info.attrs.hiddenDays]);
      }
    },
    after: function after(state) {
      state.push("div_calendar", "div", -1);
      state.push("div_calendar_wrap", "div", -1);
    }
  };
  var groupTimezoneRule = {
    tag: "timezones",
    before: function before(state, info) {
      var wrapperDivToken = state.push("div_group_timezones", "div", 1);
      wrapperDivToken.attrs = [["class", "group-timezones"], ["data-group", info.attrs.group], ["data-size", info.attrs.size || "medium"]];
    },
    after: function after(state) {
      state.push("div_group_timezones", "div", -1);
    }
  };

  function _renderTimezonePicker(state) {
    var timezoneSelectToken = state.push("select_open", "select", 1);
    timezoneSelectToken.attrs = [["class", "discourse-calendar-timezone-picker"]];
    state.push("select_close", "select", -1);
  }

  function setup(helper) {
    helper.whiteList(["div.calendar", "div.discourse-calendar-header", "div.discourse-calendar-wrap", "select.discourse-calendar-timezone-picker", "span.discourse-calendar-timezone-wrap", "h2.discourse-calendar-title", "div[data-calendar-type]", "div[data-calendar-default-view]", "div[data-calendar-default-timezone]", "div[data-weekends]", "div[data-hidden-days]", "div.group-timezones", "div[data-group]", "div[data-size]"]);
    helper.registerOptions(function (opts, siteSettings) {
      opts.features["discourse-calendar-enabled"] = !!siteSettings.calendar_enabled;
    });
    helper.registerPlugin(function (md) {
      var features = md.options.discourse.features;

      if (features["discourse-calendar-enabled"]) {
        md.block.bbcode.ruler.push("discourse-calendar", calendarRule);
        md.block.bbcode.ruler.push("discourse-group-timezones", groupTimezoneRule);
      }
    });
  }
});
define("discourse/plugins/discourse-calendar/discourse/models/discourse-post-event-event", ["exports", "discourse/models/rest", "discourse/lib/ajax"], function (_exports, _rest, _ajax) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var ATTRIBUTES = {
    id: {},
    name: {},
    starts_at: {},
    ends_at: {},
    raw_invitees: {},
    url: {},
    status: {
      transform: function transform(value) {
        return STATUSES[value];
      }
    }
  };
  var STATUSES = {
    standalone: 0,
    public: 1,
    private: 2
  };

  var Event = _rest.default.extend({
    init: function init() {
      this._super.apply(this, arguments);

      this.__type = "discourse-post-event-event";
    },
    update: function update(data) {
      return (0, _ajax.ajax)("/discourse-post-event/events/".concat(this.id, ".json"), {
        type: "PUT",
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify({
          event: data
        })
      });
    },
    updateProperties: function updateProperties() {
      var attributesKeys = Object.keys(ATTRIBUTES);
      return this.getProperties(attributesKeys);
    },
    createProperties: function createProperties() {
      var attributesKeys = Object.keys(ATTRIBUTES);
      return this.getProperties(attributesKeys);
    },
    _transformProps: function _transformProps(props) {
      var attributesKeys = Object.keys(ATTRIBUTES);
      attributesKeys.forEach(function (key) {
        var attribute = ATTRIBUTES[key];

        if (attribute.transform) {
          props[key] = attribute.transform(props[key]);
        }
      });
    },
    beforeUpdate: function beforeUpdate(props) {
      this._transformProps(props);
    },
    beforeCreate: function beforeCreate(props) {
      this._transformProps(props);
    }
  });

  var _default = Event;
  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/models/discourse-post-event-reminder", ["exports", "discourse/models/rest"], function (_exports, _rest) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _rest.default.extend({
    init: function init() {
      this._super.apply(this, arguments);

      this.__type = "discourse-post-event-reminder";
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/models/discourse-post-event-invitee", ["exports", "discourse/models/rest"], function (_exports, _rest) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _rest.default.extend({
    init: function init() {
      this._super.apply(this, arguments);

      this.__type = "discourse-post-event-invitee";
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-group-timezone", ["exports", "discourse/widgets/widget"], function (_exports, _widget) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("discourse-group-timezone", {
    tagName: "div.group-timezone",
    buildClasses: function buildClasses(attrs) {
      var classes = [];

      if (attrs.groupedTimezone.closeToWorkingHours) {
        classes.push("close-to-working-hours");
      }

      if (attrs.groupedTimezone.inWorkingHours) {
        classes.push("in-working-hours");
      }

      return classes.join(" ");
    },
    transform: function transform(attrs) {
      return {
        formatedTime: attrs.groupedTimezone.nowWithOffset.format("LT")
      };
    },
    template: function template(attrs, state) {
      var _this = this;

      var __h1 = __widget_helpers.rawHtml;
      var _r = [];

      _r.push("\n    ");

      var _a0 = [];

      _a0.push("\n      ");

      var _a1 = [];

      _a1.push("\n        ");

      _a1.push(this.transformed.formatedTime);

      _a1.push("\n      ");

      _a0.push(virtualDom.h('span', {
        "className": "time",
        "attributes": {}
      }, _a1));

      _a0.push("\n      ");

      var _a2 = [];

      _a2.push("\n        ");

      _a2.push(new __h1({
        html: '<span>' + attrs.groupedTimezone.utcOffset + '</span>'
      }));

      _a2.push("\n      ");

      _a0.push(virtualDom.h('span', {
        "className": "offset",
        "attributes": {
          "title": "UTC offset"
        }
      }, _a2));

      _a0.push("\n    ");

      _r.push(virtualDom.h('div', {
        "className": "info",
        "attributes": {}
      }, _a0));

      _r.push("\n    ");

      var _a3 = [];

      _a3.push("\n");

      if (attrs.groupedTimezone.members && attrs.groupedTimezone.members.length) {
        attrs.groupedTimezone.members.forEach(function (member) {
          _a3.push("        ");

          _a3.push(_this.attach("discourse-group-timezones-member", {
            "usersOnHoliday": attrs.usersOnHoliday,
            "member": member
          }));

          _a3.push("\n");
        });
      }

      _a3.push("    ");

      _r.push(virtualDom.h('ul', {
        "className": "group-timezones-members",
        "attributes": {}
      }, _a3));

      _r.push("\n  ");

      return _r;
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/event-reminder-notification-item", ["I18n", "discourse/widgets/widget", "discourse/widgets/default-notification-item", "discourse/lib/utilities", "discourse-common/lib/icon-library"], function (_I18n, _widget, _defaultNotificationItem, _utilities, _iconLibrary) {
  "use strict";

  (0, _widget.createWidgetFrom)(_defaultNotificationItem.DefaultNotificationItem, "event-reminder-notification-item", {
    notificationTitle: function notificationTitle(notificationName, data) {
      return data.title ? _I18n.default.t(data.title) : "";
    },
    text: function text(notificationName, data) {
      var username = (0, _utilities.formatUsername)(data.display_username);
      var description;

      if (data.topic_title) {
        description = "<span data-topic-id=\"".concat(this.attrs.topic_id, "\">").concat(data.topic_title, "</span>");
      } else {
        description = this.description(data);
      }

      return _I18n.default.t(data.message, {
        description: description,
        username: username
      });
    },
    icon: function icon(notificationName, data) {
      return (0, _iconLibrary.iconNode)("notification.".concat(data.message));
    }
  });
});
define("discourse/plugins/discourse-calendar/discourse/widgets/going-button", ["exports", "discourse/widgets/widget"], function (_exports, _widget) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("going-button", {
    tagName: "button.going-button.btn.btn-default",
    click: function click() {
      this.sendWidgetAction("changeWatchingInviteeStatus", "going");
    },
    template: function template(attrs, state) {
      var __h1 = __widget_helpers.iconNode;
      var _r = [];

      _r.push("\n    ");

      _r.push(__h1("check"));

      _r.push("\n    ");

      var _a0 = [];

      _a0.push("\n      ");

      _a0.push(I18n.t("discourse_post_event.models.invitee.status.going"));

      _a0.push("\n    ");

      _r.push(virtualDom.h('span', {
        "className": "label",
        "attributes": {}
      }, _a0));

      _r.push("\n  ");

      return _r;
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/more-dropdown", ["exports", "I18n", "discourse/widgets/widget"], function (_exports, _I18n, _widget) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("more-dropdown", {
    tagName: "div.more-dropdown",
    buildKey: function buildKey() {
      return "more-dropdown";
    },
    transform: function transform(attrs) {
      var _this = this;

      return {
        content: this._buildContent(attrs),
        onChange: function onChange(item) {
          return _this.sendWidgetAction(item.id, item.param);
        },
        options: {}
      };
    },
    template: function template(attrs, state) {
      var _r = [];

      _r.push("\n    ");

      _r.push(this.attach("widget-dropdown", {
        "id": "more-dropdown",
        "translatedLabel": "More",
        "icon": "ellipsis-h",
        "content": this.transformed.content,
        "onChange": this.transformed.onChange,
        "options": this.transformed.options
      }));

      _r.push("\n  ");

      return _r;
    },
    buildClasses: function buildClasses(attrs) {
      var content = this._buildContent(attrs);

      if (!content.length) {
        return ["has-no-actions"];
      }
    },
    _buildContent: function _buildContent(attrs) {
      var content = [];

      if (!attrs.eventModel.is_expired) {
        content.push({
          id: "addToCalendar",
          icon: "file",
          label: "discourse_post_event.event_ui.add_to_calendar"
        });
      }

      if (this.currentUser) {
        content.push({
          id: "sendPMToCreator",
          icon: "envelope",
          translatedLabel: _I18n.default.t("discourse_post_event.event_ui.send_pm_to_creator", {
            username: attrs.eventModel.creator.username
          })
        });
      }

      if (!attrs.is_expired && attrs.canActOnEvent && attrs.isPublicEvent) {
        content.push({
          id: "inviteUserOrGroup",
          icon: "user-plus",
          label: "discourse_post_event.event_ui.invite",
          param: attrs.eventModel.id
        });
      }

      if (attrs.canActOnEvent) {
        content.push("separator");
        content.push({
          icon: "file-csv",
          id: "exportPostEvent",
          label: "discourse_post_event.event_ui.export_event",
          param: attrs.eventModel.id
        });

        if (!attrs.eventModel.is_expired && !attrs.eventModel.is_standalone) {
          content.push({
            icon: "file-upload",
            id: "bulkInvite",
            label: "discourse_post_event.event_ui.bulk_invite",
            param: attrs.eventModel
          });
        }

        content.push({
          icon: "pencil-alt",
          id: "editPostEvent",
          label: "discourse_post_event.event_ui.edit_event",
          param: attrs.eventModel.id
        });

        if (!attrs.eventModel.is_expired) {
          content.push({
            icon: "times",
            id: "closeEvent",
            label: "discourse_post_event.event_ui.close_event",
            class: "danger",
            param: attrs.eventModel
          });
        }
      }

      return content;
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-post-event-url", ["exports", "discourse-common/lib/icon-library", "virtual-dom", "discourse/widgets/widget"], function (_exports, _iconLibrary, _virtualDom, _widget) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function prefixProtocol(url) {
    return url.indexOf("://") === -1 && url.indexOf("mailto:") === -1 ? "https://" + url : url;
  }

  var _default = (0, _widget.createWidget)("discourse-post-event-url", {
    tagName: "section.event-url",
    html: function html(attrs) {
      return [(0, _iconLibrary.iconNode)("link"), (0, _virtualDom.h)("a.url", {
        attributes: {
          href: prefixProtocol(attrs.url),
          target: "_blank",
          rel: "noopener noreferrer"
        }
      }, attrs.url)];
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-post-event", ["exports", "I18n", "discourse/lib/text", "discourse/lib/export-csv", "discourse/plugins/discourse-calendar/lib/clean-title", "@ember/string", "@ember/object", "discourse/lib/show-modal", "discourse/widgets/widget", "discourse/helpers/route-action", "discourse-common/lib/get-url", "../../lib/raw-event-helper"], function (_exports, _I18n, _text, _exportCsv, _cleanTitle, _string, _object, _showModal, _widget, _routeAction, _getUrl, _rawEventHelper) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("discourse-post-event", {
    tagName: "div.discourse-post-event-widget",
    buildKey: function buildKey(attrs) {
      return "discourse-post-event-".concat(attrs.id);
    },
    buildClasses: function buildClasses() {
      if (this.state.event) {
        return ["has-discourse-post-event"];
      }
    },
    inviteUserOrGroup: function inviteUserOrGroup(postId) {
      this.store.find("discourse-post-event-event", postId).then(function (eventModel) {
        (0, _showModal.default)("discourse-post-event-invite-user-or-group", {
          model: eventModel
        });
      });
    },
    showAllInvitees: function showAllInvitees(params) {
      var postId = params.postId;
      var title = params.title || "title_invited";
      var extraClass = params.extraClass || "invited";
      var name = "discourse-post-event-invitees";
      this.store.find("discourse-post-event-event", postId).then(function (eventModel) {
        (0, _showModal.default)(name, {
          model: eventModel,
          title: "discourse_post_event.invitees_modal.".concat(title),
          modalClass: ["".concat((0, _string.dasherize)(name).toLowerCase(), "-modal"), extraClass].join(" ")
        });
      });
    },
    editPostEvent: function editPostEvent(postId) {
      this.store.find("discourse-post-event-event", postId).then(function (eventModel) {
        (0, _showModal.default)("discourse-post-event-builder", {
          model: {
            eventModel: eventModel,
            topicId: eventModel.post.topic.id
          }
        });
      });
    },
    closeEvent: function closeEvent(eventModel) {
      var _this = this;

      bootbox.confirm(_I18n.default.t("discourse_post_event.builder_modal.confirm_close"), _I18n.default.t("no_value"), _I18n.default.t("yes_value"), function (confirmed) {
        if (confirmed) {
          return _this.store.find("post", eventModel.id).then(function (post) {
            var raw = post.raw;
            var startsAt = eventModel.starts_at ? moment(eventModel.starts_at) : moment();
            var eventParams = (0, _rawEventHelper.buildParams)(moment().isBefore(startsAt) ? moment() : startsAt, moment().isBefore(startsAt) ? moment().add(1, "minute") : moment(), eventModel, _this.siteSettings);
            var newRaw = (0, _rawEventHelper.replaceRaw)(eventParams, raw);

            if (newRaw) {
              var props = {
                raw: newRaw,
                edit_reason: _I18n.default.t("discourse_post_event.edit_reason")
              };
              return _text.default.cookAsync(newRaw).then(function (cooked) {
                props.cooked = cooked.string;
                return post.save(props);
              });
            }
          });
        }
      });
    },
    changeWatchingInviteeStatus: function changeWatchingInviteeStatus(status) {
      if (this.state.eventModel.watching_invitee) {
        this.store.update("discourse-post-event-invitee", this.state.eventModel.watching_invitee.id, {
          status: status,
          post_id: this.state.eventModel.id
        });
      } else {
        this.store.createRecord("discourse-post-event-invitee").save({
          post_id: this.state.eventModel.id,
          status: status
        });
      }
    },
    defaultState: function defaultState(attrs) {
      return {
        eventModel: attrs.eventModel
      };
    },
    exportPostEvent: function exportPostEvent(postId) {
      (0, _exportCsv.exportEntity)("post_event", {
        name: "post_event",
        id: postId
      });
    },
    bulkInvite: function bulkInvite(eventModel) {
      (0, _showModal.default)("discourse-post-event-bulk-invite", {
        model: {
          eventModel: eventModel
        }
      });
    },
    sendPMToCreator: function sendPMToCreator() {
      var router = this.register.lookup("service:router")._router;

      (0, _routeAction.routeAction)("composePrivateMessage", router, _object.default.create(this.state.eventModel.creator), _object.default.create(this.state.eventModel.post)).call();
    },
    addToCalendar: function addToCalendar() {
      var link = (0, _getUrl.default)("/discourse-post-event/events.ics?post_id=".concat(this.state.eventModel.id));
      window.open(link, "_blank", "noopener");
    },
    transform: function transform() {
      var eventModel = this.state.eventModel;
      return {
        eventStatusLabel: _I18n.default.t("discourse_post_event.models.event.status.".concat(eventModel.status, ".title")),
        eventStatusDescription: _I18n.default.t("discourse_post_event.models.event.status.".concat(eventModel.status, ".description")),
        startsAtMonth: moment(eventModel.starts_at).format("MMM"),
        startsAtDay: moment(eventModel.starts_at).format("D"),
        eventName: (0, _text.emojiUnescape)(eventModel.name || this._cleanTopicTitle(eventModel.post.topic.title, eventModel.starts_at)),
        statusClass: "status ".concat(eventModel.status),
        isPublicEvent: eventModel.status === "public",
        isStandaloneEvent: eventModel.status === "standalone",
        canActOnEvent: this.currentUser && this.state.eventModel.can_act_on_discourse_post_event
      };
    },
    template: function template(attrs, state) {
      var __h1 = __widget_helpers.rawHtml;
      var _r = [];

      _r.push("\n");

      if (state.eventModel) {
        _r.push("      ");

        var _a0 = [];

        _a0.push("\n        ");

        var _a1 = [];

        _a1.push("\n          ");

        var _a2 = [];

        _a2.push(this.transformed.startsAtMonth);

        _a1.push(virtualDom.h('div', {
          "className": "month",
          "attributes": {}
        }, _a2));

        _a1.push("\n          ");

        var _a3 = [];

        _a3.push(this.transformed.startsAtDay);

        _a1.push(virtualDom.h('div', {
          "className": "day",
          "attributes": {}
        }, _a3));

        _a1.push("\n        ");

        _a0.push(virtualDom.h('div', {
          "className": "event-date",
          "attributes": {}
        }, _a1));

        _a0.push("\n        ");

        var _a4 = [];

        _a4.push("\n          ");

        var _a5 = [];

        _a5.push("\n            ");

        _a5.push(new __h1({
          html: '<span>' + this.transformed.eventName + '</span>'
        }));

        _a5.push("\n          ");

        _a4.push(virtualDom.h('span', {
          "className": "name",
          "attributes": {}
        }, _a5));

        _a4.push("\n          ");

        var _a6 = [];

        _a6.push("\n");

        if (!this.transformed.isStandaloneEvent) {
          if (state.eventModel.is_expired) {
            _a6.push("                ");

            var _a7 = [];

            _a7.push("\n                  ");

            _a7.push(_I18n.default.t("discourse_post_event.models.event.expired"));

            _a7.push("\n                ");

            _a6.push(virtualDom.h('span', {
              "className": "status expired",
              "attributes": {}
            }, _a7));

            _a6.push("\n");
          } else {
            _a6.push("                ");

            var _a8 = [];

            _a8.push("\n                  ");

            _a8.push(this.transformed.eventStatusLabel);

            _a8.push("\n                ");

            _a6.push(virtualDom.h('span', {
              "className": this.transformed.statusClass,
              "attributes": {
                "title": this.transformed.eventStatusDescription
              }
            }, _a8));

            _a6.push("\n");
          }

          _a6.push("              ");

          var _a9 = [];

          _a9.push("·");

          _a6.push(virtualDom.h('span', {
            "className": "separator",
            "attributes": {}
          }, _a9));

          _a6.push("\n");
        }

        _a6.push("            ");

        var _a10 = [];

        _a10.push("\n              ");

        var _a11 = [];

        _a11.push(_I18n.default.t("discourse_post_event.event_ui.created_by"));

        _a10.push(virtualDom.h('span', {
          "className": "created-by",
          "attributes": {}
        }, _a11));

        _a10.push("\n              ");

        _a10.push(this.attach("discourse-post-event-creator", {
          "user": state.eventModel.creator
        }));

        _a10.push("\n            ");

        _a6.push(virtualDom.h('span', {
          "className": "creators",
          "attributes": {}
        }, _a10));

        _a6.push("\n          ");

        _a4.push(virtualDom.h('div', {
          "className": "status-and-creators",
          "attributes": {}
        }, _a6));

        _a4.push("\n        ");

        _a0.push(virtualDom.h('div', {
          "className": "event-info",
          "attributes": {}
        }, _a4));

        _a0.push("\n\n        ");

        _a0.push(this.attach("more-dropdown", {
          "canActOnEvent": this.transformed.canActOnEvent,
          "isPublicEvent": this.transformed.isPublicEvent,
          "eventModel": state.eventModel
        }));

        _a0.push("\n      ");

        _r.push(virtualDom.h('header', {
          "className": "event-header",
          "attributes": {}
        }, _a0));

        _r.push("\n\n");

        if (state.eventModel.can_update_attendance) {
          _r.push("        ");

          var _a12 = [];

          _a12.push("\n          ");

          _a12.push(this.attach("discourse-post-event-status", {
            "watchingInvitee": this.state.eventModel.watching_invitee
          }));

          _a12.push("\n        ");

          _r.push(virtualDom.h('section', {
            "className": "event-actions",
            "attributes": {}
          }, _a12));

          _r.push("\n");
        }

        _r.push("\n");

        if (this.state.eventModel.url) {
          _r.push("        ");

          var _a13 = [];

          _r.push(virtualDom.h('hr', _a13));

          _r.push("\n\n        ");

          _r.push(this.attach("discourse-post-event-url", {
            "url": this.state.eventModel.url
          }));

          _r.push("\n");
        }

        _r.push("\n      ");

        var _a14 = [];

        _r.push(virtualDom.h('hr', _a14));

        _r.push("\n\n      ");

        _r.push(this.attach("discourse-post-event-dates", {
          "localDates": attrs.localDates,
          "eventModel": state.eventModel
        }));

        _r.push("\n\n");

        if (state.eventModel.should_display_invitees) {
          _r.push("        ");

          var _a15 = [];

          _r.push(virtualDom.h('hr', _a15));

          _r.push("\n\n        ");

          _r.push(this.attach("discourse-post-event-invitees", {
            "eventModel": state.eventModel
          }));

          _r.push("\n");
        }
      }

      _r.push("  ");

      return _r;
    },
    _cleanTopicTitle: function _cleanTopicTitle(topicTitle, startsAt) {
      var cleaned = (0, _cleanTitle.default)(topicTitle, startsAt);

      if (cleaned) {
        return topicTitle.replace(cleaned, "");
      }

      return topicTitle;
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-group-timezones-member", ["exports", "virtual-dom", "discourse/widgets/post", "discourse/widgets/widget", "discourse/lib/utilities"], function (_exports, _virtualDom, _post, _widget, _utilities) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("discourse-group-timezones-member", {
    tagName: "li.group-timezones-member",
    buildClasses: function buildClasses(attrs) {
      return attrs.usersOnHoliday.includes(attrs.member.username) ? "on-holiday" : "not-on-holiday";
    },
    html: function html(attrs) {
      var _attrs$member = attrs.member,
          name = _attrs$member.name,
          username = _attrs$member.username,
          avatar_template = _attrs$member.avatar_template;
      return (0, _virtualDom.h)("a", {
        attributes: {
          class: "group-timezones-member-avatar",
          "data-user-card": username
        }
      }, (0, _post.avatarImg)("small", {
        template: avatar_template,
        username: name || (0, _utilities.formatUsername)(username)
      }));
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/not-going-button", ["exports", "discourse/widgets/widget"], function (_exports, _widget) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("not-going-button", {
    tagName: "button.not-going-button.btn.btn-default",
    click: function click() {
      this.sendWidgetAction("changeWatchingInviteeStatus", "not_going");
    },
    template: function template(attrs, state) {
      var __h1 = __widget_helpers.iconNode;
      var _r = [];

      _r.push("\n    ");

      _r.push(__h1("times"));

      _r.push("\n    ");

      var _a0 = [];

      _a0.push("\n      ");

      _a0.push(I18n.t("discourse_post_event.models.invitee.status.not_going"));

      _a0.push("\n    ");

      _r.push(virtualDom.h('span', {
        "className": "label",
        "attributes": {}
      }, _a0));

      _r.push("\n  ");

      return _r;
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-post-event-dates", ["exports", "I18n", "discourse/widgets/raw-html", "discourse-common/lib/icon-library", "virtual-dom", "discourse/widgets/widget"], function (_exports, _I18n, _rawHtml, _iconLibrary, _virtualDom, _widget) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("discourse-post-event-dates", {
    tagName: "section.event-dates",
    showAllParticipatingInvitees: function showAllParticipatingInvitees(postId) {
      this.sendWidgetAction("showAllInvitees", {
        postId: postId,
        title: "title_participated",
        extraClass: "participated"
      });
    },
    html: function html(attrs) {
      var content = [(0, _iconLibrary.iconNode)("clock"), (0, _virtualDom.h)("span.date", new _rawHtml.default({
        html: "<span>".concat(attrs.localDates, "</span>")
      }))];

      if (attrs.eventModel.is_expired && attrs.eventModel.status !== "standalone") {
        var participants;

        var label = _I18n.default.t("discourse_post_event.event_ui.participants", {
          count: attrs.eventModel.stats.going
        });

        if (attrs.eventModel.stats.going > 0) {
          participants = this.attach("link", {
            action: "showAllParticipatingInvitees",
            actionParam: attrs.eventModel.id,
            contents: function contents() {
              return label;
            }
          });
        } else {
          participants = label;
        }

        content.push((0, _virtualDom.h)("span.participants", [(0, _virtualDom.h)("span", " - "), participants]));
      }

      return content;
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-group-timezones-reset", ["exports", "discourse/widgets/widget"], function (_exports, _widget) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("discourse-group-timezones-reset", {
    tagName: "div.group-timezones-reset",
    onResetOffset: function onResetOffset() {
      this.sendWidgetAction("onChangeCurrentUserTimeOffset", 0);
      var container = document.getElementById(this.attrs.id);
      var slider = container.querySelector("input[type=range].group-timezones-slider");

      if (slider) {
        slider.value = 0;
      }
    },
    transform: function transform(attrs) {
      return {
        isDisabled: attrs.localTimeOffset === 0
      };
    },
    template: function template(attrs, state) {
      var _r = [];

      _r.push("\n    ");

      _r.push(this.attach("button", {
        "disabled": this.transformed.isDisabled,
        "action": "onResetOffset",
        "icon": "undo"
      }));

      _r.push("\n  ");

      return _r;
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-group-timezone-new-day", ["exports", "discourse/widgets/widget"], function (_exports, _widget) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("discourse-group-timezone-new-day", {
    tagName: "div.group-timezone-new-day",
    template: function template(attrs, state) {
      var __h1 = __widget_helpers.iconNode;
      var _r = [];

      _r.push("\n    ");

      var _a0 = [];

      _a0.push("\n      ");

      _a0.push(__h1("chevron-left"));

      _a0.push("\n      ");

      _a0.push(this.attrs.groupedTimezone.beforeDate);

      _a0.push("\n    ");

      _r.push(virtualDom.h('span', {
        "className": "before",
        "attributes": {}
      }, _a0));

      _r.push("\n    ");

      var _a1 = [];

      _a1.push("\n      ");

      _a1.push(this.attrs.groupedTimezone.afterDate);

      _a1.push("\n      ");

      _a1.push(__h1("chevron-right"));

      _a1.push("\n    ");

      _r.push(virtualDom.h('span', {
        "className": "after",
        "attributes": {}
      }, _a1));

      _r.push("\n  ");

      return _r;
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-group-timezones-slider", ["exports", "discourse/widgets/widget", "@ember/runloop"], function (_exports, _widget, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("discourse-group-timezones-slider", {
    tagName: "input.group-timezones-slider",
    input: function input(event) {
      this._handleSliderEvent(event);
    },
    change: function change(event) {
      this._handleSliderEvent(event);
    },
    changeOffsetThrottler: function changeOffsetThrottler(offset) {
      (0, _runloop.throttle)(this, function () {
        this.sendWidgetAction("onChangeCurrentUserTimeOffset", offset);
      }, 75);
    },
    buildAttributes: function buildAttributes() {
      return {
        step: 1,
        value: 0,
        min: -48,
        max: 48,
        type: "range"
      };
    },
    _handleSliderEvent: function _handleSliderEvent(event) {
      var value = parseInt(event.target.value, 10);
      var offset = value * 15;
      this.changeOffsetThrottler(offset);
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-group-timezones", ["exports", "discourse/widgets/widget", "discourse/plugins/discourse-calendar/lib/round-time"], function (_exports, _widget, _roundTime) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("discourse-group-timezones", {
    tagName: "div.group-timezones",
    buildKey: function buildKey(attrs) {
      return "group-timezones-".concat(attrs.id);
    },
    buildClasses: function buildClasses(attrs) {
      return attrs.size;
    },
    buildAttributes: function buildAttributes(attrs) {
      return {
        id: attrs.id
      };
    },
    defaultState: function defaultState() {
      return {
        localTimeOffset: 0
      };
    },
    onChangeCurrentUserTimeOffset: function onChangeCurrentUserTimeOffset(offset) {
      this.state.localTimeOffset = offset;
    },
    transform: function transform(attrs, state) {
      var _this = this;

      var members = attrs.members || [];
      var groupedTimezones = [];
      members.filterBy("timezone").forEach(function (member) {
        if (_this._shouldAddMemberToGroup(_this.state.filter, member)) {
          var timezone = member.timezone;
          var identifier = parseInt(moment.tz(timezone).format("YYYYMDHm"), 10);
          var groupedTimezone = groupedTimezones.findBy("identifier", identifier);

          if (groupedTimezone) {
            groupedTimezone.members.push(member);
          } else {
            var now = _this._roundMoment(moment.tz(timezone));

            var workingDays = _this._workingDays();

            var offset = moment.tz(moment.utc(), timezone).utcOffset();
            groupedTimezone = {
              identifier: identifier,
              offset: offset,
              type: "discourse-group-timezone",
              nowWithOffset: now.add(state.localTimeOffset, "minutes"),
              closeToWorkingHours: _this._closeToWorkingHours(now, workingDays),
              inWorkingHours: _this._inWorkingHours(now, workingDays),
              utcOffset: _this._utcOffset(offset),
              members: [member]
            };
            groupedTimezones.push(groupedTimezone);
          }
        }
      });
      groupedTimezones = groupedTimezones.sortBy("offset").filter(function (g) {
        return g.members.length;
      });
      var newDayIndex;
      groupedTimezones.forEach(function (groupedTimezone, index) {
        if (index > 0) {
          if (groupedTimezones[index - 1].nowWithOffset.format("dddd") !== groupedTimezone.nowWithOffset.format("dddd")) {
            newDayIndex = index;
          }
        }
      });

      if (newDayIndex) {
        groupedTimezones.splice(newDayIndex, 0, {
          type: "discourse-group-timezone-new-day",
          beforeDate: groupedTimezones[newDayIndex - 1].nowWithOffset.format("dddd"),
          afterDate: groupedTimezones[newDayIndex].nowWithOffset.format("dddd")
        });
      }

      return {
        groupedTimezones: groupedTimezones
      };
    },
    onChangeFilter: function onChangeFilter(filter) {
      this.state.filter = filter && filter.length ? filter : null;
    },
    template: function template(attrs, state) {
      var _this2 = this;

      var _r = [];

      _r.push("\n    ");

      _r.push(this.attach("discourse-group-timezones-header", {
        "id": attrs.id,
        "group": attrs.group,
        "localTimeOffset": state.localTimeOffset
      }));

      _r.push("\n    ");

      var _a0 = [];

      _a0.push("\n");

      if (this.transformed.groupedTimezones && this.transformed.groupedTimezones.length) {
        this.transformed.groupedTimezones.forEach(function (groupedTimezone) {
          _a0.push("        ");

          _a0.push(_this2.attach(groupedTimezone.type, {
            "usersOnHoliday": attrs.usersOnHoliday,
            "groupedTimezone": groupedTimezone
          }));

          _a0.push("\n");
        });
      }

      _a0.push("    ");

      _r.push(virtualDom.h('div', {
        "className": "group-timezones-body",
        "attributes": {}
      }, _a0));

      _r.push("\n  ");

      return _r;
    },
    _shouldAddMemberToGroup: function _shouldAddMemberToGroup(filter, member) {
      if (filter) {
        filter = filter.toLowerCase();

        if (member.username.toLowerCase().indexOf(filter) > -1 || member.name && member.name.toLowerCase().indexOf(filter) > -1) {
          return true;
        }
      } else {
        return true;
      }

      return false;
    },
    _roundMoment: function _roundMoment(date) {
      if (this.state.localTimeOffset) {
        date = (0, _roundTime.default)(date);
      }

      return date;
    },
    _closeToWorkingHours: function _closeToWorkingHours(moment, workingDays) {
      var hours = moment.hours();
      var startHour = this.siteSettings.working_day_start_hour;
      var endHour = this.siteSettings.working_day_end_hour;
      var extension = this.siteSettings.close_to_working_day_hours_extension;
      return (hours >= Math.max(startHour - extension, 0) && hours <= startHour || hours <= Math.min(endHour + extension, 23) && hours >= endHour) && workingDays.includes(moment.isoWeekday());
    },
    _inWorkingHours: function _inWorkingHours(moment, workingDays) {
      var hours = moment.hours();
      return hours > this.siteSettings.working_day_start_hour && hours < this.siteSettings.working_day_end_hour && workingDays.includes(moment.isoWeekday());
    },
    _utcOffset: function _utcOffset(offset) {
      var sign = Math.sign(offset) === 1 ? "+" : "-";
      offset = Math.abs(offset);
      var hours = Math.floor(offset / 60).toString();
      hours = hours.length === 1 ? "0".concat(hours) : hours;
      var minutes = (offset % 60).toString();
      minutes = minutes.length === 1 ? ":".concat(minutes, "0") : ":".concat(minutes);
      return "".concat(sign).concat(hours.replace(/^0(\d)/, "$1")).concat(minutes.replace(/:00$/, "")).replace(/-0/, "&nbsp;");
    },
    _workingDays: function _workingDays() {
      var enMoment = moment().locale("en");

      var getIsoWeekday = function getIsoWeekday(day) {
        return enMoment.localeData()._weekdays.indexOf(day) || 7;
      };

      return this.siteSettings.working_days.split("|").filter(Boolean).map(function (x) {
        return getIsoWeekday(x);
      });
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-group-timezones-header", ["exports", "I18n", "discourse/widgets/widget"], function (_exports, _I18n, _widget) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("discourse-group-timezones-header", {
    tagName: "div.group-timezones-header",
    transform: function transform(attrs) {
      return {
        title: _I18n.default.t("group_timezones.group_availability", {
          group: attrs.group
        })
      };
    },
    template: function template(attrs, state) {
      var _r = [];

      _r.push("\n    ");

      _r.push(this.attach("discourse-group-timezones-time-traveler", {
        "id": attrs.id,
        "localTimeOffset": attrs.localTimeOffset
      }));

      _r.push("\n    ");

      var _a0 = [];

      _a0.push("\n      ");

      _a0.push(this.transformed.title);

      _a0.push("\n    ");

      _r.push(virtualDom.h('span', {
        "className": "title",
        "attributes": {}
      }, _a0));

      _r.push("\n    ");

      _r.push(this.attach("discourse-group-timezones-filter", attrs));

      _r.push("\n  ");

      return _r;
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-group-timezones-filter", ["exports", "I18n", "discourse/widgets/widget", "@ember/runloop"], function (_exports, _I18n, _widget, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("discourse-group-timezones-filter", {
    tagName: "input.group-timezones-filter",
    input: function input(event) {
      this.changeFilterThrottler(event.target.value);
    },
    changeFilterThrottler: function changeFilterThrottler(filter) {
      (0, _runloop.throttle)(this, function () {
        this.sendWidgetAction("onChangeFilter", filter);
      }, 100);
    },
    buildAttributes: function buildAttributes() {
      return {
        type: "text",
        placeholder: _I18n.default.t("group_timezones.search")
      };
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/event-invitation-notification-item", ["I18n", "discourse/widgets/widget", "discourse/widgets/default-notification-item", "discourse/lib/utilities", "discourse-common/lib/icon-library"], function (_I18n, _widget, _defaultNotificationItem, _utilities, _iconLibrary) {
  "use strict";

  (0, _widget.createWidgetFrom)(_defaultNotificationItem.DefaultNotificationItem, "event-invitation-notification-item", {
    notificationTitle: function notificationTitle(notificationName, data) {
      return data.title ? _I18n.default.t(data.title) : "";
    },
    text: function text(notificationName, data) {
      var username = (0, _utilities.formatUsername)(data.display_username);
      var description;

      if (data.topic_title) {
        description = "<span data-topic-id=\"".concat(this.attrs.topic_id, "\">").concat(data.topic_title, "</span>");
      } else {
        description = this.description(data);
      }

      return _I18n.default.t(data.message, {
        description: description,
        username: username
      });
    },
    icon: function icon(notificationName, data) {
      return (0, _iconLibrary.iconNode)("notification.".concat(data.message));
    }
  });
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-group-timezones-time-traveler", ["exports", "discourse/widgets/widget", "discourse/plugins/discourse-calendar/lib/round-time"], function (_exports, _widget, _roundTime) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("discourse-group-timezones-time-traveler", {
    tagName: "div.group-timezones-time-traveler",
    transform: function transform(attrs) {
      var date = moment().add(attrs.localTimeOffset, "minutes");

      if (attrs.localTimeOffset) {
        date = (0, _roundTime.default)(date);
      }

      return {
        localTimeWithOffset: date.format("HH:mm")
      };
    },
    template: function template(attrs, state) {
      var _r = [];

      _r.push("\n    ");

      var _a0 = [];

      _a0.push("\n      ");

      _a0.push(this.transformed.localTimeWithOffset);

      _a0.push("\n    ");

      _r.push(virtualDom.h('span', {
        "className": "time",
        "attributes": {}
      }, _a0));

      _r.push("\n    ");

      _r.push(this.attach("discourse-group-timezones-slider", attrs));

      _r.push("\n    ");

      _r.push(this.attach("discourse-group-timezones-reset", {
        "id": attrs.id,
        "localTimeOffset": attrs.localTimeOffset
      }));

      _r.push("\n  ");

      return _r;
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-post-event-host", ["exports", "virtual-dom", "discourse/widgets/post", "discourse/widgets/widget", "discourse/lib/utilities"], function (_exports, _virtualDom, _post, _widget, _utilities) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("discourse-post-event-creator", {
    tagName: "span.event-creator",
    html: function html(attrs) {
      var _attrs$user = attrs.user,
          name = _attrs$user.name,
          username = _attrs$user.username,
          avatar_template = _attrs$user.avatar_template;
      return (0, _virtualDom.h)("a", {
        attributes: {
          class: "topic-invitee-avatar",
          "data-user-card": username
        }
      }, [(0, _post.avatarImg)("tiny", {
        template: avatar_template,
        username: name || (0, _utilities.formatUsername)(username)
      }), (0, _virtualDom.h)("span", {
        attributes: {
          class: "username"
        }
      }, name || (0, _utilities.formatUsername)(username))]);
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-post-event-invitees", ["exports", "discourse/widgets/widget"], function (_exports, _widget) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("discourse-post-event-invitees", {
    tagName: "section.event-invitees",
    transform: function transform(attrs) {
      return {
        isPrivateEvent: attrs.eventModel.status === "private"
      };
    },
    template: function template(attrs, state) {
      var _this = this;

      var _r = [];

      _r.push("\n    ");

      var _a0 = [];

      _a0.push("\n      ");

      var _a1 = [];

      _a1.push("\n        ");

      var _a2 = [];

      _a2.push(attrs.eventModel.stats.going);

      _a2.push(" ");

      _a2.push(I18n.t("discourse_post_event.models.invitee.status.going"));

      _a2.push(" -");

      _a1.push(virtualDom.h('span', _a2));

      _a1.push("\n        ");

      var _a3 = [];

      _a3.push(attrs.eventModel.stats.interested);

      _a3.push(" ");

      _a3.push(I18n.t("discourse_post_event.models.invitee.status.interested"));

      _a3.push(" -");

      _a1.push(virtualDom.h('span', _a3));

      _a1.push("\n        ");

      var _a4 = [];

      _a4.push(attrs.eventModel.stats.not_going);

      _a4.push(" ");

      _a4.push(I18n.t("discourse_post_event.models.invitee.status.not_going"));

      _a1.push(virtualDom.h('span', _a4));

      _a1.push("\n");

      if (this.transformed.isPrivateEvent) {
        _a1.push("          ");

        var _a5 = [];

        _a5.push("- on ");

        _a5.push(attrs.eventModel.stats.invited);

        _a5.push(" users invited");

        _a1.push(virtualDom.h('span', {
          "className": "invited",
          "attributes": {}
        }, _a5));

        _a1.push("\n");
      }

      _a1.push("      ");

      _a0.push(virtualDom.h('div', {
        "className": "event-invitees-status",
        "attributes": {}
      }, _a1));

      _a0.push("\n\n      ");

      _a0.push(this.attach("button", {
        "className": "show-all btn-small",
        "label": "discourse_post_event.event_ui.show_all",
        "action": "showAllInvitees",
        "actionParam": {
          "postId": attrs.eventModel.id
        }
      }));

      _a0.push("\n    ");

      _r.push(virtualDom.h('div', {
        "className": "header",
        "attributes": {}
      }, _a0));

      _r.push("\n    ");

      var _a6 = [];

      _a6.push("\n");

      if (attrs.eventModel.sample_invitees && attrs.eventModel.sample_invitees.length) {
        attrs.eventModel.sample_invitees.forEach(function (invitee) {
          _a6.push("        ");

          _a6.push(_this.attach("discourse-post-event-invitee", {
            "invitee": invitee
          }));

          _a6.push("\n");
        });
      }

      _a6.push("    ");

      _r.push(virtualDom.h('ul', {
        "className": "event-invitees-avatars",
        "attributes": {}
      }, _a6));

      _r.push("\n  ");

      return _r;
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-post-event-status", ["exports", "discourse/widgets/widget"], function (_exports, _widget) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("discourse-post-event-status", {
    tagName: "div.event-status",
    buildKey: function buildKey(attrs) {
      return "discourse-post-event-status-".concat(attrs.id);
    },
    buildClasses: function buildClasses(attrs) {
      if (attrs.watchingInvitee) {
        return "status-".concat(attrs.watchingInvitee.status);
      }
    },
    template: function template(attrs, state) {
      var _r = [];

      _r.push("\n    ");

      _r.push(this.attach("going-button", attrs));

      _r.push("\n    ");

      _r.push(this.attach("interested-button", attrs));

      _r.push("\n    ");

      _r.push(this.attach("not-going-button", attrs));

      _r.push("\n  ");

      return _r;
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/discourse-post-event-invitee", ["exports", "I18n", "@ember/utils", "virtual-dom", "discourse/widgets/post", "discourse/widgets/widget", "discourse/lib/utilities"], function (_exports, _I18n, _utils, _virtualDom, _post, _widget, _utilities) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("discourse-post-event-invitee", {
    tagName: "li.event-invitee",
    buildClasses: function buildClasses(attrs) {
      var classes = [];

      if ((0, _utils.isPresent)(attrs.invitee.status)) {
        classes.push("status-".concat(attrs.invitee.status));
      }

      if (this.currentUser && this.currentUser.username === attrs.invitee.user.username) {
        classes.push("is-current-user");
      }

      return classes;
    },
    html: function html(attrs) {
      var _attrs$invitee$user = attrs.invitee.user,
          name = _attrs$invitee$user.name,
          username = _attrs$invitee$user.username,
          avatar_template = _attrs$invitee$user.avatar_template;
      var statusIcon;

      switch (attrs.invitee.status) {
        case "going":
          statusIcon = "fa-check";
          break;

        case "interested":
          statusIcon = "fa-star";
          break;

        case "not_going":
          statusIcon = "fa-times";
          break;
      }

      var avatarContent = [(0, _post.avatarImg)(this.site.mobileView ? "tiny" : "large", {
        template: avatar_template,
        username: name || (0, _utilities.formatUsername)(username)
      })];

      if (statusIcon) {
        avatarContent.push(this.attach("avatar-flair", {
          primary_group_name: _I18n.default.t("discourse_post_event.models.invitee.status.".concat(attrs.invitee.status)),
          primary_group_flair_url: statusIcon
        }));
      }

      return (0, _virtualDom.h)("a", {
        attributes: {
          class: "topic-invitee-avatar",
          "data-user-card": username
        }
      }, avatarContent);
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/widgets/interested-button", ["exports", "discourse/widgets/widget"], function (_exports, _widget) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = (0, _widget.createWidget)("interested-button", {
    tagName: "button.interested-button.btn.btn-default",
    click: function click() {
      this.sendWidgetAction("changeWatchingInviteeStatus", "interested");
    },
    template: function template(attrs, state) {
      var __h1 = __widget_helpers.iconNode;
      var _r = [];

      _r.push("\n    ");

      _r.push(__h1("star"));

      _r.push("\n    ");

      var _a0 = [];

      _a0.push("\n      ");

      _a0.push(I18n.t("discourse_post_event.models.invitee.status.interested"));

      _a0.push("\n    ");

      _r.push(virtualDom.h('span', {
        "className": "label",
        "attributes": {}
      }, _a0));

      _r.push("\n  ");

      return _r;
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/routes/discourse-post-event-upcoming-events-index", ["exports", "discourse/lib/url", "@ember/routing/route", "@ember/object/evented"], function (_exports, _url, _route, _evented) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _route.default.extend({
    enforcePostEventEnabled: (0, _evented.on)("activate", function () {
      if (!this.siteSettings.discourse_post_event_enabled) {
        _url.default.redirectTo("/404");
      }
    }),
    model: function model(params) {
      return this.store.findAll("discourse-post-event-event", params);
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/adapters/discourse-post-event-event", ["exports", "./discourse-post-event-adapter", "@ember/string"], function (_exports, _discoursePostEventAdapter, _string) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _discoursePostEventAdapter.default.extend({
    pathFor: function pathFor(store, type, findArgs) {
      var path = this.basePath(store, type, findArgs) + (0, _string.underscore)(store.pluralize(this.apiNameFor(type)));
      return this.appendQueryParams(path, findArgs) + ".json";
    },
    apiNameFor: function apiNameFor() {
      return "event";
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/adapters/discourse-post-event-adapter", ["exports", "discourse/adapters/rest"], function (_exports, _rest) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _rest.default.extend({
    basePath: function basePath() {
      return "/discourse-post-event/";
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/adapters/discourse-post-event-nested-adapter", ["exports", "./discourse-post-event-adapter", "@ember/string", "discourse/adapters/rest", "discourse/lib/ajax"], function (_exports, _discoursePostEventAdapter, _string, _rest, _ajax) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _discoursePostEventAdapter.default.extend({
    // TODO: destroy/update/create should be improved in core to allow for nested models
    destroyRecord: function destroyRecord(store, type, record) {
      return (0, _ajax.ajax)(this.pathFor(store, type, {
        post_id: record.post_id,
        id: record.id
      }), {
        type: "DELETE"
      });
    },
    update: function update(store, type, id, attrs) {
      var data = {};
      var typeField = (0, _string.underscore)(this.apiNameFor(type));
      data[typeField] = attrs;
      return (0, _ajax.ajax)(this.pathFor(store, type, {
        id: id,
        post_id: attrs.post_id
      }), this.getPayload("PUT", data)).then(function (json) {
        return new _rest.Result(json[typeField], json);
      });
    },
    createRecord: function createRecord(store, type, attrs) {
      var data = {};
      var typeField = (0, _string.underscore)(this.apiNameFor(type));
      data[typeField] = attrs;
      return (0, _ajax.ajax)(this.pathFor(store, type, attrs), this.getPayload("POST", data)).then(function (json) {
        return new _rest.Result(json[typeField], json);
      });
    },
    pathFor: function pathFor(store, type, findArgs) {
      var post_id = findArgs["post_id"];
      delete findArgs["post_id"];
      var id = findArgs["id"];
      delete findArgs["id"];
      var path = this.basePath(store, type, {}) + "events/" + post_id + "/" + (0, _string.underscore)(store.pluralize(this.apiNameFor()));

      if (id) {
        path += "/".concat(id);
      }

      return this.appendQueryParams(path, findArgs);
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/adapters/discourse-post-event-reminder", ["exports", "./discourse-post-event-nested-adapter"], function (_exports, _discoursePostEventNestedAdapter) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _discoursePostEventNestedAdapter.default.extend({
    apiNameFor: function apiNameFor() {
      return "reminder";
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/adapters/discourse-post-event-invitee", ["exports", "./discourse-post-event-nested-adapter"], function (_exports, _discoursePostEventNestedAdapter) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _discoursePostEventNestedAdapter.default.extend({
    apiNameFor: function apiNameFor() {
      return "invitee";
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/discourse-event-upcoming-events-route-map", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _default;

  function _default() {
    this.route("discourse-post-event-upcoming-events", {
      path: "/upcoming-events"
    }, function () {
      this.route("index", {
        path: "/"
      });
    });
  }
});
define("discourse/plugins/discourse-calendar/discourse/components/upcoming-events-calendar", ["exports", "rsvp", "discourse/plugins/discourse-calendar/lib/guess-best-date-format", "discourse/plugins/discourse-calendar/helpers/format-event-name", "discourse/lib/load-script", "@ember/component", "@ember/runloop", "discourse-common/lib/get-url"], function (_exports, _rsvp, _guessBestDateFormat, _formatEventName, _loadScript, _component, _runloop, _getUrl) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _component.default.extend({
    tagName: "",
    events: null,
    init: function init() {
      this._super.apply(this, arguments);

      this._calendar = null;
    },
    willDestroyElement: function willDestroyElement() {
      this._super.apply(this, arguments);

      this._calendar && this._calendar.destroy();
      this._calendar = null;
    },
    didInsertElement: function didInsertElement() {
      this._super.apply(this, arguments);

      this._renderCalendar();
    },
    _renderCalendar: function _renderCalendar() {
      var _this = this;

      var calendarNode = document.getElementById("upcoming-events-calendar");

      if (!calendarNode) {
        return;
      }

      calendarNode.innerHTML = "";

      this._loadCalendar().then(function () {
        _this._calendar = new window.FullCalendar.Calendar(calendarNode, {});
        (_this.events || []).forEach(function (event) {
          var starts_at = event.starts_at,
              ends_at = event.ends_at,
              post = event.post;

          _this._calendar.addEvent({
            title: (0, _formatEventName.formatEventName)(event),
            start: starts_at,
            end: ends_at || starts_at,
            allDay: !(0, _guessBestDateFormat.isNotFullDayEvent)(moment(starts_at), moment(ends_at)),
            url: (0, _getUrl.default)("/t/-/".concat(post.topic.id, "/").concat(post.post_number))
          });
        });

        _this._calendar.render();
      });
    },
    _loadCalendar: function _loadCalendar() {
      var _this2 = this;

      return new _rsvp.Promise(function (resolve) {
        (0, _loadScript.default)("/plugins/discourse-calendar/javascripts/fullcalendar-with-moment-timezone.min.js").then(function () {
          (0, _runloop.schedule)("afterRender", function () {
            if (_this2.isDestroying || _this2.isDestroyed) {
              return;
            }

            resolve();
          });
        });
      });
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/components/event-field", ["exports", "@ember/component"], function (_exports, _component) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _component.default.extend({
    enabled: true,
    class: null
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/components/region-input", ["exports", "@ember/object", "discourse/plugins/discourse-calendar/lib/regions", "I18n", "select-kit/components/combo-box"], function (_exports, _object, _regions, _I18n, _comboBox) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _comboBox.default.extend({
    pluginApiIdentifiers: ["timezone-input"],
    classNames: ["timezone-input"],
    selectKitOptions: {
      filterable: true,
      allowAny: false
    },
    content: (0, _object.computed)(function () {
      var localeNames = {};
      JSON.parse(this.siteSettings.available_locales).forEach(function (locale) {
        localeNames[locale.value] = locale.name;
      });
      return _regions.HOLIDAY_REGIONS.map(function (region) {
        return {
          name: _I18n.default.t("discourse_calendar.region.names.".concat(region)),
          id: region
        };
      }).sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
    })
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/components/bulk-invite-sample-csv-file", ["exports", "@ember/component", "@ember/object"], function (_exports, _component, _object) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_obj = {
    downloadSampleCsv: function downloadSampleCsv() {
      var sampleData = [["my_awesome_group", "going"], ["lucy", "interested"], ["mark", "not_going"], ["sam", "unknown"]];
      var csv = "";
      sampleData.forEach(function (row) {
        csv += row.join(",");
        csv += "\n";
      });
      var btn = document.createElement("a");
      btn.href = "data:text/csv;charset=utf-8,".concat(encodeURI(csv));
      btn.target = "_blank";
      btn.rel = "noopener noreferrer";
      btn.download = "bulk-invite-sample.csv";
      btn.click();
    }
  }, (_applyDecoratedDescriptor(_obj, "downloadSampleCsv", [_object.action], Object.getOwnPropertyDescriptor(_obj, "downloadSampleCsv"), _obj)), _obj));

  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/modal/discourse-post-event-invite-user-or-group"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"d-modal-body\",null,[[\"title\",\"class\"],[\"discourse_post_event.invite_user_or_group.title\",\"invite-user-or-group-modal\"]],{\"statements\":[[0,\"  \"],[7,\"form\",true],[8],[0,\"\\n\"],[4,\"event-field\",null,null,{\"statements\":[[0,\"      \"],[1,[28,\"user-selector\",null,[[\"single\",\"onChangeCallback\",\"fullWidthWrap\",\"allowAny\",\"includeMessageableGroups\",\"placeholderKey\",\"tabindex\",\"usernames\",\"hasGroups\",\"autocomplete\",\"excludeCurrentUser\"],[false,[28,\"action\",[[23,0,[]],\"setInvitedNames\"],null],true,false,true,\"composer.users_placeholder\",\"1\",[24,[\"invitedNames\"]],true,\"discourse\",true]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[7,\"div\",true],[10,\"class\",\"modal-footer\"],[8],[0,\"\\n  \"],[1,[28,\"d-button\",null,[[\"type\",\"class\",\"label\",\"action\"],[\"button\",\"btn-primary\",\"discourse_post_event.invite_user_or_group.invite\",[28,\"action\",[[23,0,[]],\"invite\"],null]]]],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/modal/discourse-post-event-invite-user-or-group"}});
Ember.TEMPLATES["javascripts/modal/discourse-post-event-invitees"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"invitee\"],\"statements\":[[4,\"d-modal-body\",null,null,{\"statements\":[[0,\"  \"],[1,[28,\"input\",null,[[\"value\",\"input\",\"class\",\"placeholderKey\"],[[28,\"readonly\",[[24,[\"filter\"]]],null],[28,\"action\",[[23,0,[]],\"onFilterChanged\"],[[\"value\"],[\"target.value\"]]],\"filter\",\"discourse_post_event.invitees_modal.filter_placeholder\"]]],false],[0,\"\\n\\n\"],[4,\"conditional-loading-spinner\",null,[[\"condition\"],[[24,[\"isLoading\"]]]],{\"statements\":[[0,\"  \"],[7,\"ul\",true],[10,\"class\",\"invitees\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"invitees\"]]],null,{\"statements\":[[0,\"      \"],[7,\"li\",true],[10,\"class\",\"invitee\"],[8],[0,\"\\n        \"],[1,[28,\"render-invitee\",[[23,1,[]]],null],false],[0,\"\\n\\n\"],[4,\"if\",[[23,1,[\"status\"]]],null,{\"statements\":[[0,\"          \"],[7,\"span\",true],[11,\"class\",[29,[\"status \",[23,1,[\"status\"]]]]],[8],[0,\"\\n            \"],[1,[28,\"i18n\",[[28,\"concat\",[\"discourse_post_event.models.invitee.status.\",[23,1,[\"status\"]]],null]],null],false],[0,\"\\n          \"],[9],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"          \"],[7,\"span\",true],[10,\"class\",\"status\"],[8],[0,\"\\n            -\\n          \"],[9],[0,\"\\n\"]],\"parameters\":[]}],[0,\"\\n\"],[4,\"if\",[[24,[\"model\",\"can_act_on_discourse_post_event\"]]],null,{\"statements\":[[0,\"          \"],[1,[28,\"d-button\",null,[[\"icon\",\"action\"],[\"trash-alt\",[28,\"action\",[[23,0,[]],\"removeInvitee\",[23,1,[]]],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"      \"],[9],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/modal/discourse-post-event-invitees"}});
Ember.TEMPLATES["javascripts/modal/discourse-post-event-bulk-invite"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"bulkInvite\"],\"statements\":[[4,\"d-modal-body\",null,[[\"title\",\"class\"],[[28,\"concat\",[\"discourse_post_event.bulk_invite_modal.title\"],null],\"discourse-post-event-bulk-invite\"]],{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"bulk-invites\"],[8],[0,\"\\n    \"],[7,\"p\",true],[10,\"class\",\"bulk-event-help\"],[8],[1,[28,\"i18n\",[[28,\"concat\",[\"discourse_post_event.bulk_invite_modal.description_\",[24,[\"model\",\"eventModel\",\"status\"]]],null]],null],false],[9],[0,\"\\n    \"],[7,\"h3\",true],[8],[1,[28,\"i18n\",[\"discourse_post_event.bulk_invite_modal.inline_title\"],null],false],[9],[0,\"\\n\\n    \"],[7,\"div\",true],[10,\"class\",\"bulk-invite-rows\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"bulkInvites\"]]],null,{\"statements\":[[0,\"        \"],[7,\"div\",true],[10,\"class\",\"bulk-invite-row\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"model\",\"eventModel\",\"is_private\"]]],null,{\"statements\":[[0,\"            \"],[1,[28,\"group-selector\",null,[[\"class\",\"single\",\"groupFinder\",\"groupNames\",\"placeholderKey\"],[\"bulk-invite-identifier\",true,[24,[\"groupFinder\"]],[23,1,[\"identifier\"]],\"discourse_post_event.bulk_invite_modal.group_selector_placeholder\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[4,\"if\",[[24,[\"model\",\"eventModel\",\"is_public\"]]],null,{\"statements\":[[0,\"            \"],[1,[28,\"user-selector\",null,[[\"class\",\"single\",\"placeholderKey\",\"usernames\",\"autocomplete\"],[\"bulk-invite-identifier\",true,\"discourse_post_event.bulk_invite_modal.user_selector_placeholder\",[23,1,[\"identifier\"]],\"discourse\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n          \"],[1,[28,\"combo-box\",null,[[\"class\",\"value\",\"content\",\"nameProperty\",\"valueProperty\",\"onChange\"],[\"bulk-invite-attendance\",[23,1,[\"attendance\"]],[24,[\"bulkInviteStatuses\"]],\"name\",\"name\",[28,\"action\",[[23,0,[]],[28,\"mut\",[[23,1,[\"attendance\"]]],null]],null]]]],false],[0,\"\\n\\n          \"],[1,[28,\"d-button\",null,[[\"icon\",\"action\",\"class\"],[\"trash-alt\",[28,\"action\",[[23,0,[]],\"removeBulkInvite\",[23,1,[]]],null],\"remove-bulk-invite\"]]],false],[0,\"\\n        \"],[9],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"    \"],[9],[0,\"\\n\\n    \"],[7,\"div\",true],[10,\"class\",\"bulk-invite-actions\"],[8],[0,\"\\n      \"],[1,[28,\"d-button\",null,[[\"class\",\"label\",\"action\",\"disabled\"],[\"send-bulk-invites btn-primary\",\"discourse_post_event.bulk_invite_modal.send_bulk_invites\",[28,\"action\",[[23,0,[]],\"sendBulkInvites\"],null],[24,[\"bulkInviteDisabled\"]]]]],false],[0,\"\\n      \"],[1,[28,\"d-button\",null,[[\"class\",\"icon\",\"action\"],[\"add-bulk-invite\",\"plus\",[28,\"action\",[[23,0,[]],\"addBulkInvite\"],null]]]],false],[0,\"\\n    \"],[9],[0,\"\\n\\n  \"],[9],[0,\"\\n\\n  \"],[7,\"div\",true],[10,\"class\",\"csv-bulk-invites\"],[8],[0,\"\\n    \"],[7,\"h3\",true],[8],[1,[28,\"i18n\",[\"discourse_post_event.bulk_invite_modal.csv_title\"],null],false],[9],[0,\"\\n\\n    \"],[7,\"div\",true],[10,\"class\",\"bulk-invite-actions\"],[8],[0,\"\\n      \"],[1,[22,\"bulk-invite-sample-csv-file\"],false],[0,\"\\n\\n      \"],[1,[28,\"csv-uploader\",null,[[\"uploadUrl\",\"i18nPrefix\",\"uploading\",\"uploadDone\"],[[28,\"concat\",[\"/discourse-post-event/events/\",[24,[\"model\",\"id\"]],\"/csv-bulk-invite\"],null],\"discourse_post_event.bulk_invite_modal\",[24,[\"uploading\"]],[28,\"action\",[[23,0,[]],\"uploadDone\"],null]]]],false],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/modal/discourse-post-event-bulk-invite"}});
Ember.TEMPLATES["javascripts/modal/discourse-post-event-builder"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"allowedCustomField\",\"reminder\"],\"statements\":[[4,\"d-modal-body\",null,[[\"title\",\"class\"],[[28,\"concat\",[\"discourse_post_event.builder_modal.\",[24,[\"modalTitle\"]]],null],\"discourse-post-event-builder\"]],{\"statements\":[[4,\"conditional-loading-section\",null,[[\"isLoading\"],[[24,[\"model\",\"eventModel\",\"isSaving\"]]]],{\"statements\":[[0,\"    \"],[7,\"form\",true],[8],[0,\"\\n      \"],[1,[28,\"date-time-input-range\",null,[[\"from\",\"to\",\"toTimeFirst\",\"clearable\",\"onChange\"],[[24,[\"startsAt\"]],[24,[\"endsAt\"]],true,true,[28,\"action\",[[23,0,[]],\"onChangeDates\"],null]]]],false],[0,\"\\n\\n\"],[4,\"event-field\",null,[[\"class\",\"label\"],[\"name\",\"discourse_post_event.builder_modal.name.label\"]],{\"statements\":[[0,\"        \"],[1,[28,\"input\",null,[[\"value\",\"placeholderKey\",\"input\"],[[28,\"readonly\",[[24,[\"model\",\"eventModel\",\"name\"]]],null],\"discourse_post_event.builder_modal.name.placeholder\",[28,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"model\",\"eventModel\",\"name\"]]],null]],[[\"value\"],[\"target.value\"]]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"event-field\",null,[[\"class\",\"label\"],[\"url\",\"discourse_post_event.builder_modal.url.label\"]],{\"statements\":[[0,\"        \"],[1,[28,\"input\",null,[[\"value\",\"placeholderKey\",\"input\"],[[28,\"readonly\",[[24,[\"model\",\"eventModel\",\"url\"]]],null],\"discourse_post_event.builder_modal.url.placeholder\",[28,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"model\",\"eventModel\",\"url\"]]],null]],[[\"value\"],[\"target.value\"]]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"event-field\",null,[[\"label\"],[\"discourse_post_event.builder_modal.status.label\"]],{\"statements\":[[0,\"        \"],[7,\"label\",true],[10,\"class\",\"radio-label\"],[8],[0,\"\\n          \"],[1,[28,\"radio-button\",null,[[\"name\",\"value\",\"selection\",\"onChange\"],[\"status\",\"public\",[24,[\"model\",\"eventModel\",\"status\"]],[28,\"action\",[[23,0,[]],\"onChangeStatus\"],null]]]],false],[0,\"\\n          \"],[7,\"span\",true],[10,\"class\",\"message\"],[8],[0,\"\\n            \"],[7,\"span\",true],[10,\"class\",\"title\"],[8],[1,[28,\"i18n\",[\"discourse_post_event.models.event.status.public.title\"],null],false],[9],[0,\"\\n            \"],[7,\"span\",true],[10,\"class\",\"description\"],[8],[1,[28,\"i18n\",[\"discourse_post_event.models.event.status.public.description\"],null],false],[9],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"label\",true],[10,\"class\",\"radio-label\"],[8],[0,\"\\n          \"],[1,[28,\"radio-button\",null,[[\"name\",\"value\",\"selection\",\"onChange\"],[\"status\",\"private\",[24,[\"model\",\"eventModel\",\"status\"]],[28,\"action\",[[23,0,[]],\"onChangeStatus\"],null]]]],false],[0,\"\\n          \"],[7,\"span\",true],[10,\"class\",\"message\"],[8],[0,\"\\n            \"],[7,\"span\",true],[10,\"class\",\"title\"],[8],[1,[28,\"i18n\",[\"discourse_post_event.models.event.status.private.title\"],null],false],[9],[0,\"\\n            \"],[7,\"span\",true],[10,\"class\",\"description\"],[8],[1,[28,\"i18n\",[\"discourse_post_event.models.event.status.private.description\"],null],false],[9],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"label\",true],[10,\"class\",\"radio-label\"],[8],[0,\"\\n          \"],[1,[28,\"radio-button\",null,[[\"name\",\"value\",\"selection\",\"onChange\"],[\"status\",\"standalone\",[24,[\"model\",\"eventModel\",\"status\"]],[28,\"action\",[[23,0,[]],\"onChangeStatus\"],null]]]],false],[0,\"\\n          \"],[7,\"span\",true],[10,\"class\",\"message\"],[8],[0,\"\\n            \"],[7,\"span\",true],[10,\"class\",\"title\"],[8],[1,[28,\"i18n\",[\"discourse_post_event.models.event.status.standalone.title\"],null],false],[9],[0,\"\\n            \"],[7,\"span\",true],[10,\"class\",\"description\"],[8],[1,[28,\"i18n\",[\"discourse_post_event.models.event.status.standalone.description\"],null],false],[9],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"event-field\",null,[[\"enabled\",\"label\"],[[24,[\"allowsInvitees\"]],\"discourse_post_event.builder_modal.invitees.label\"]],{\"statements\":[[0,\"        \"],[1,[28,\"group-selector\",null,[[\"fullWidthWrap\",\"groupFinder\",\"groupNames\",\"onChangeCallback\",\"placeholderKey\"],[true,[24,[\"groupFinder\"]],[24,[\"model\",\"eventModel\",\"raw_invitees\"]],[28,\"action\",[[23,0,[]],\"setRawInvitees\"],null],\"topic.invite_private.group_name\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"event-field\",null,[[\"class\",\"label\"],[\"reminders\",\"discourse_post_event.builder_modal.reminders.label\"]],{\"statements\":[[0,\"        \"],[7,\"div\",true],[10,\"class\",\"reminders-list\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"model\",\"eventModel\",\"reminders\"]]],null,{\"statements\":[[0,\"            \"],[7,\"div\",true],[10,\"class\",\"reminder-item\"],[8],[0,\"\\n              \"],[1,[28,\"input\",null,[[\"class\",\"min\",\"value\",\"placeholderKey\",\"input\"],[\"reminder-value\",0,[28,\"readonly\",[[23,2,[\"value\"]]],null],\"discourse_post_event.builder_modal.name.placeholder\",[28,\"action\",[[23,0,[]],[28,\"mut\",[[23,2,[\"value\"]]],null]],[[\"value\"],[\"target.value\"]]]]]],false],[0,\"\\n\\n              \"],[1,[28,\"combo-box\",null,[[\"class\",\"value\",\"nameProperty\",\"valueProperty\",\"content\",\"onChange\"],[\"reminder-unit\",[23,2,[\"unit\"]],null,null,[24,[\"reminderUnits\"]],[28,\"action\",[[23,0,[]],[28,\"mut\",[[23,2,[\"unit\"]]],null]],null]]]],false],[0,\"\\n\\n              \"],[1,[28,\"combo-box\",null,[[\"class\",\"value\",\"nameProperty\",\"valueProperty\",\"content\",\"onChange\"],[\"reminder-period\",[23,2,[\"period\"]],null,null,[24,[\"reminderPeriods\"]],[28,\"action\",[[23,0,[]],[28,\"mut\",[[23,2,[\"period\"]]],null]],null]]]],false],[0,\"\\n\\n              \"],[1,[28,\"d-button\",null,[[\"class\",\"icon\",\"action\",\"disabled\"],[\"remove-reminder\",\"times\",[28,\"action\",[[23,0,[]],\"removeReminder\",[23,2,[]]],null],[24,[\"isLoadingReminders\"]]]]],false],[0,\"\\n            \"],[9],[0,\"\\n\"]],\"parameters\":[2]},null],[0,\"        \"],[9],[0,\"\\n\\n        \"],[1,[28,\"d-button\",null,[[\"class\",\"disabled\",\"icon\",\"label\",\"action\"],[\"add-reminder\",[24,[\"addReminderDisabled\"]],\"plus\",\"discourse_post_event.builder_modal.add_reminder\",[28,\"action\",[[23,0,[]],\"addReminder\"],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"event-field\",null,[[\"class\",\"label\"],[\"recurrence\",\"discourse_post_event.builder_modal.recurrence.label\"]],{\"statements\":[[0,\"        \"],[1,[28,\"combo-box\",null,[[\"class\",\"value\",\"content\",\"onChange\",\"options\"],[\"available-recurrences\",[28,\"readonly\",[[24,[\"model\",\"eventModel\",\"recurrence\"]]],null],[24,[\"availableRecurrences\"]],[28,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"model\",\"eventModel\",\"recurrence\"]]],null]],null],[28,\"hash\",null,[[\"none\"],[\"discourse_post_event.builder_modal.recurrence.none\"]]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"if\",[[24,[\"allowedCustomFields\",\"length\"]]],null,{\"statements\":[[4,\"event-field\",null,[[\"label\"],[\"discourse_post_event.builder_modal.custom_fields.label\"]],{\"statements\":[[0,\"          \"],[7,\"p\",true],[10,\"class\",\"event-field-description\"],[8],[1,[28,\"i18n\",[\"discourse_post_event.builder_modal.custom_fields.description\"],null],false],[9],[0,\"\\n\"],[4,\"each\",[[24,[\"allowedCustomFields\"]]],null,{\"statements\":[[0,\"            \"],[7,\"span\",true],[10,\"class\",\"label custom-field-label\"],[8],[1,[23,1,[]],false],[9],[0,\"\\n            \"],[1,[28,\"input\",null,[[\"class\",\"value\",\"placeholderKey\",\"input\"],[\"custom-field-input\",[28,\"readonly\",[[28,\"get\",[[24,[\"model\",\"eventModel\",\"custom_fields\"]],[23,1,[]]],null]],null],\"discourse_post_event.builder_modal.custom_fields.placeholder\",[28,\"action\",[[23,0,[]],\"onChangeCustomField\",[23,1,[]]],null]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"    \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n\"],[7,\"div\",true],[10,\"class\",\"modal-footer\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"model\",\"eventModel\",\"isNew\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"d-button\",null,[[\"type\",\"class\",\"label\",\"icon\",\"action\"],[\"button\",\"btn-primary\",\"discourse_post_event.builder_modal.create\",\"calendar-day\",[28,\"action\",[[23,0,[]],\"createEvent\"],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"    \"],[1,[28,\"d-button\",null,[[\"type\",\"class\",\"label\",\"icon\",\"action\"],[\"button\",\"btn-primary\",\"discourse_post_event.builder_modal.update\",\"calendar-day\",[28,\"action\",[[23,0,[]],\"updateEvent\"],null]]]],false],[0,\"\\n\\n    \"],[1,[28,\"d-button\",null,[[\"icon\",\"class\",\"action\"],[\"trash-alt\",\"btn-danger\",\"destroyPostEvent\"]]],false],[0,\"\\n\"]],\"parameters\":[]}],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/modal/discourse-post-event-builder"}});
Ember.TEMPLATES["javascripts/discourse-post-event-upcoming-events"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[22,\"outlet\"],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/discourse-post-event-upcoming-events"}});
Ember.TEMPLATES["javascripts/components/event-field"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"&default\"],\"statements\":[[4,\"if\",[[24,[\"enabled\"]]],null,{\"statements\":[[0,\"  \"],[7,\"div\",true],[11,\"class\",[29,[\"event-field \",[22,\"class\"]]]],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"label\"]]],null,{\"statements\":[[0,\"      \"],[7,\"div\",true],[10,\"class\",\"event-field-label\"],[8],[0,\"\\n        \"],[7,\"span\",true],[10,\"class\",\"label\"],[8],[1,[28,\"i18n\",[[24,[\"label\"]]],null],false],[9],[0,\"\\n      \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[7,\"div\",true],[10,\"class\",\"event-field-control\"],[8],[0,\"\\n      \"],[14,1],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/event-field"}});
Ember.TEMPLATES["javascripts/components/bulk-invite-sample-csv-file"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"d-button\",null,[[\"label\",\"action\"],[\"discourse_post_event.bulk_invite_modal.download_sample_csv\",[28,\"action\",[[23,0,[]],\"downloadSampleCsv\"],null]]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/bulk-invite-sample-csv-file"}});
Ember.TEMPLATES["javascripts/components/upcoming-events-calendar"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"div\",true],[10,\"id\",\"upcoming-events-calendar\"],[8],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/upcoming-events-calendar"}});
Ember.TEMPLATES["javascripts/discourse-post-event-upcoming-events-index"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"div\",true],[10,\"class\",\"discourse-post-event-upcoming-events\"],[8],[0,\"\\n  \"],[1,[28,\"upcoming-events-calendar\",null,[[\"events\"],[[24,[\"model\"]]]]],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/discourse-post-event-upcoming-events-index"}});
define("discourse/plugins/discourse-calendar/discourse/controllers/discourse-post-event-bulk-invite", ["exports", "@ember/utils", "discourse/lib/ajax", "discourse/lib/ajax-error", "@ember/object", "discourse-common/utils/decorators", "discourse/mixins/modal-functionality", "@ember/controller", "discourse/models/group", "I18n"], function (_exports, _utils, _ajax, _ajaxError, _object, _decorators, _modalFunctionality, _controller, _group, _I18n) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _controller.default.extend(_modalFunctionality.default, (_dec = (0, _decorators.observes)("bulkInvites.@each.identifier"), (_obj = {
    bulkInvites: null,
    bulkInviteStatuses: null,
    bulkInviteDisabled: true,
    init: function init() {
      this._super.apply(this, arguments);

      this.set("bulkInviteStatuses", [{
        label: _I18n.default.t("discourse_post_event.models.invitee.status.unknown"),
        name: "unknown"
      }, {
        label: _I18n.default.t("discourse_post_event.models.invitee.status.going"),
        name: "going"
      }, {
        label: _I18n.default.t("discourse_post_event.models.invitee.status.not_going"),
        name: "not_going"
      }, {
        label: _I18n.default.t("discourse_post_event.models.invitee.status.interested"),
        name: "interested"
      }]);
    },
    onShow: function onShow() {
      this.set("bulkInvites", [_object.default.create({
        identifier: null,
        attendance: "unknown"
      })]);
    },
    groupFinder: function groupFinder(term) {
      return _group.default.findAll({
        term: term,
        ignore_automatic: true
      });
    },
    setBulkInviteDisabled: function setBulkInviteDisabled() {
      this.set("bulkInviteDisabled", this.bulkInvites.filter(function (x) {
        return (0, _utils.isPresent)(x.identifier);
      }).length === 0);
    },
    sendBulkInvites: function sendBulkInvites() {
      var _this = this;

      return (0, _ajax.ajax)("/discourse-post-event/events/".concat(this.model.eventModel.id, "/bulk-invite.json"), {
        type: "POST",
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify({
          invitees: this.bulkInvites.filter(function (x) {
            return (0, _utils.isPresent)(x.identifier);
          })
        })
      }).then(function (data) {
        if (data.success) {
          _this.send("closeModal");
        }
      }).catch(function (e) {
        return _this.flash((0, _ajaxError.extractError)(e), "error");
      });
    },
    removeBulkInvite: function removeBulkInvite(bulkInvite) {
      this.bulkInvites.removeObject(bulkInvite);

      if (!this.bulkInvites.length) {
        this.set("bulkInvites", [_object.default.create({
          identifier: null,
          attendance: "unknown"
        })]);
      }
    },
    addBulkInvite: function addBulkInvite() {
      var attendance = this.bulkInvites.get("lastObject.attendance") || "unknown";
      this.bulkInvites.pushObject({
        identifier: null,
        attendance: attendance
      });
    },
    uploadDone: function uploadDone() {
      var _this2 = this;

      bootbox.alert(_I18n.default.t("discourse_post_event.bulk_invite_modal.success"), function () {
        _this2.send("closeModal");
      });
    }
  }, (_applyDecoratedDescriptor(_obj, "groupFinder", [_object.action], Object.getOwnPropertyDescriptor(_obj, "groupFinder"), _obj), _applyDecoratedDescriptor(_obj, "setBulkInviteDisabled", [_dec], Object.getOwnPropertyDescriptor(_obj, "setBulkInviteDisabled"), _obj), _applyDecoratedDescriptor(_obj, "sendBulkInvites", [_object.action], Object.getOwnPropertyDescriptor(_obj, "sendBulkInvites"), _obj), _applyDecoratedDescriptor(_obj, "removeBulkInvite", [_object.action], Object.getOwnPropertyDescriptor(_obj, "removeBulkInvite"), _obj), _applyDecoratedDescriptor(_obj, "addBulkInvite", [_object.action], Object.getOwnPropertyDescriptor(_obj, "addBulkInvite"), _obj), _applyDecoratedDescriptor(_obj, "uploadDone", [_object.action], Object.getOwnPropertyDescriptor(_obj, "uploadDone"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/controllers/discourse-post-event-builder", ["exports", "I18n", "discourse/lib/text", "discourse/models/group", "discourse/mixins/modal-functionality", "@ember/controller", "@ember/object", "@ember/object/computed", "discourse/lib/ajax-error", "../../lib/raw-event-helper"], function (_exports, _I18n, _text, _group, _modalFunctionality, _controller, _object, _computed, _ajaxError, _rawEventHelper) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var DEFAULT_REMINDER = {
    value: 15,
    unit: "minutes",
    period: "before"
  };

  var _default = _controller.default.extend(_modalFunctionality.default, (_obj = {
    reminders: null,
    isLoadingReminders: false,
    init: function init() {
      this._super.apply(this, arguments);

      this.set("reminderUnits", ["minutes", "hours", "days", "weeks"]);
      this.set("reminderPeriods", ["before", "after"]);
      this.set("availableRecurrences", [{
        id: "every_day",
        name: _I18n.default.t("discourse_post_event.builder_modal.recurrence.every_day")
      }, {
        id: "every_month",
        name: _I18n.default.t("discourse_post_event.builder_modal.recurrence.every_month")
      }, {
        id: "every_weekday",
        name: _I18n.default.t("discourse_post_event.builder_modal.recurrence.every_weekday")
      }, {
        id: "every_week",
        name: _I18n.default.t("discourse_post_event.builder_modal.recurrence.every_week")
      }]);
    },
    modalTitle: (0, _object.computed)("model.eventModel.isNew", {
      get: function get() {
        return this.model.eventModel.isNew ? "create_event_title" : "update_event_title";
      }
    }),
    allowedCustomFields: (0, _object.computed)("siteSettings.discourse_post_event_allowed_custom_fields", function () {
      return this.siteSettings.discourse_post_event_allowed_custom_fields.split("|").filter(Boolean);
    }),
    groupFinder: function groupFinder(term) {
      return _group.default.findAll({
        term: term,
        ignore_automatic: true
      });
    },
    allowsInvitees: (0, _computed.equal)("model.eventModel.status", "private"),
    addReminderDisabled: (0, _computed.gte)("model.eventModel.reminders.length", 5),
    onChangeCustomField: function onChangeCustomField(field, event) {
      var value = event.target.value;
      (0, _object.set)(this.model.eventModel.custom_fields, field, value);
    },
    onChangeStatus: function onChangeStatus(newStatus) {
      this.model.eventModel.set("raw_invitees", []);

      if (newStatus === "private") {
        this.setRawInvitees(null, this.model.eventModel.raw_invitees.filter(function (x) {
          return x !== "trust_level_0";
        }));
      }

      this.set("model.eventModel.status", newStatus);
    },
    setRawInvitees: function setRawInvitees(_, newInvitees) {
      this.set("model.eventModel.raw_invitees", newInvitees);
    },
    removeReminder: function removeReminder(reminder) {
      this.model.eventModel.reminders.removeObject(reminder);
    },
    addReminder: function addReminder() {
      if (!this.model.eventModel.reminders) {
        this.model.eventModel.set("reminders", []);
      }

      this.model.eventModel.reminders.pushObject(Object.assign({}, DEFAULT_REMINDER));
    },
    startsAt: (0, _object.computed)("model.eventModel.starts_at", {
      get: function get() {
        return this.model.eventModel.starts_at ? moment(this.model.eventModel.starts_at) : moment();
      }
    }),
    endsAt: (0, _object.computed)("model.eventModel.ends_at", {
      get: function get() {
        return this.model.eventModel.ends_at && moment(this.model.eventModel.ends_at);
      }
    }),
    standaloneEvent: (0, _computed.equal)("model.eventModel.status", "standalone"),
    publicEvent: (0, _computed.equal)("model.eventModel.status", "public"),
    privateEvent: (0, _computed.equal)("model.eventModel.status", "private"),
    onChangeDates: function onChangeDates(changes) {
      this.model.eventModel.setProperties({
        starts_at: changes.from,
        ends_at: changes.to
      });
    },
    destroyPostEvent: function destroyPostEvent() {
      var _this = this;

      bootbox.confirm(_I18n.default.t("discourse_post_event.builder_modal.confirm_delete"), _I18n.default.t("no_value"), _I18n.default.t("yes_value"), function (confirmed) {
        if (confirmed) {
          return _this.store.find("post", _this.model.eventModel.id).then(function (post) {
            var raw = post.raw;

            var newRaw = _this._removeRawEvent(raw);

            var props = {
              raw: newRaw,
              edit_reason: _I18n.default.t("discourse_post_event.destroy_event")
            };
            return _text.default.cookAsync(newRaw).then(function (cooked) {
              props.cooked = cooked.string;
              return post.save(props).catch(function (e) {
                return _this.flash((0, _ajaxError.extractError)(e), "error");
              }).then(function (result) {
                return result && _this.send("closeModal");
              });
            });
          }).catch(function (e) {
            return _this.flash((0, _ajaxError.extractError)(e), "error");
          });
        }
      });
    },
    createEvent: function createEvent() {
      if (!this.startsAt) {
        this.send("closeModal");
        return;
      }

      var eventParams = (0, _rawEventHelper.buildParams)(this.startsAt, this.endsAt, this.model.eventModel, this.siteSettings);
      var markdownParams = [];
      Object.keys(eventParams).forEach(function (key) {
        var value = eventParams[key];
        markdownParams.push("".concat(key, "=\"").concat(value, "\""));
      });
      this.toolbarEvent.addText("[event ".concat(markdownParams.join(" "), "]\n[/event]"));
      this.send("closeModal");
    },
    updateEvent: function updateEvent() {
      var _this2 = this;

      return this.store.find("post", this.model.eventModel.id).then(function (post) {
        var raw = post.raw;
        var eventParams = (0, _rawEventHelper.buildParams)(_this2.startsAt, _this2.endsAt, _this2.model.eventModel, _this2.siteSettings);
        var newRaw = (0, _rawEventHelper.replaceRaw)(eventParams, raw);

        if (newRaw) {
          var props = {
            raw: newRaw,
            edit_reason: _I18n.default.t("discourse_post_event.edit_reason")
          };
          return _text.default.cookAsync(newRaw).then(function (cooked) {
            props.cooked = cooked.string;
            return post.save(props).catch(function (e) {
              return _this2.flash((0, _ajaxError.extractError)(e), "error");
            }).then(function (result) {
              return result && _this2.send("closeModal");
            });
          });
        }
      });
    },
    _removeRawEvent: function _removeRawEvent(raw) {
      var eventRegex = new RegExp("\\[event\\s(.*?)\\]\\n\\[\\/event\\]", "m");
      return raw.replace(eventRegex, "");
    }
  }, (_applyDecoratedDescriptor(_obj, "onChangeCustomField", [_object.action], Object.getOwnPropertyDescriptor(_obj, "onChangeCustomField"), _obj), _applyDecoratedDescriptor(_obj, "onChangeStatus", [_object.action], Object.getOwnPropertyDescriptor(_obj, "onChangeStatus"), _obj), _applyDecoratedDescriptor(_obj, "setRawInvitees", [_object.action], Object.getOwnPropertyDescriptor(_obj, "setRawInvitees"), _obj), _applyDecoratedDescriptor(_obj, "removeReminder", [_object.action], Object.getOwnPropertyDescriptor(_obj, "removeReminder"), _obj), _applyDecoratedDescriptor(_obj, "addReminder", [_object.action], Object.getOwnPropertyDescriptor(_obj, "addReminder"), _obj), _applyDecoratedDescriptor(_obj, "onChangeDates", [_object.action], Object.getOwnPropertyDescriptor(_obj, "onChangeDates"), _obj), _applyDecoratedDescriptor(_obj, "destroyPostEvent", [_object.action], Object.getOwnPropertyDescriptor(_obj, "destroyPostEvent"), _obj), _applyDecoratedDescriptor(_obj, "createEvent", [_object.action], Object.getOwnPropertyDescriptor(_obj, "createEvent"), _obj), _applyDecoratedDescriptor(_obj, "updateEvent", [_object.action], Object.getOwnPropertyDescriptor(_obj, "updateEvent"), _obj)), _obj));

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/controllers/discourse-post-event-upcoming-events-index", ["exports", "@ember/controller"], function (_exports, _controller) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _controller.default.extend({});

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/controllers/discourse-post-event-invite-user-or-group", ["exports", "discourse/mixins/modal-functionality", "@ember/controller", "@ember/object", "discourse/lib/ajax-error", "discourse/lib/ajax"], function (_exports, _modalFunctionality, _controller, _object, _ajaxError, _ajax) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _controller.default.extend(_modalFunctionality.default, (_obj = {
    invitedNames: null,
    setInvitedNames: function setInvitedNames(_, invitedNames) {
      this.set("invitedNames", invitedNames);
    },
    onClose: function onClose() {
      this.set("invitedNames", null);
    },
    invite: function invite() {
      var _this = this;

      return (0, _ajax.ajax)("/discourse-post-event/events/".concat(this.model.id, "/invite.json"), {
        data: {
          invites: this.invitedNames || []
        },
        type: "POST"
      }).then(function () {
        return _this.send("closeModal");
      }).catch(function (e) {
        return _this.flash((0, _ajaxError.extractError)(e), "error");
      });
    }
  }, (_applyDecoratedDescriptor(_obj, "setInvitedNames", [_object.action], Object.getOwnPropertyDescriptor(_obj, "setInvitedNames"), _obj), _applyDecoratedDescriptor(_obj, "invite", [_object.action], Object.getOwnPropertyDescriptor(_obj, "invite"), _obj)), _obj));

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/discourse/controllers/discourse-post-event-invitees", ["exports", "discourse/mixins/modal-functionality", "@ember/controller", "@ember/object", "discourse-common/lib/debounce", "@ember/runloop"], function (_exports, _modalFunctionality, _controller, _object, _debounce, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _controller.default.extend(_modalFunctionality.default, (_obj = {
    invitees: null,
    filter: null,
    isLoading: false,
    onShow: function onShow() {
      this._fetchInvitees();
    },
    onFilterChanged: function onFilterChanged(filter) {
      // TODO: Use discouseDebounce after the 2.7 release.
      var debounceFunc = _debounce.default || _runloop.debounce;
      debounceFunc(this, this._fetchInvitees, filter, 250);
    },
    removeInvitee: function removeInvitee(invitee) {
      var _this = this;

      invitee.destroyRecord().then(function () {
        return _this._fetchInvitees();
      });
    },
    _fetchInvitees: function _fetchInvitees(filter) {
      var _this2 = this;

      this.set("isLoading", true);
      this.store.findAll("discourse-post-event-invitee", {
        filter: filter,
        post_id: this.model.id
      }).then(function (invitees) {
        return _this2.set("invitees", invitees);
      }).finally(function () {
        return _this2.set("isLoading", false);
      });
    }
  }, (_applyDecoratedDescriptor(_obj, "onFilterChanged", [_object.action], Object.getOwnPropertyDescriptor(_obj, "onFilterChanged"), _obj), _applyDecoratedDescriptor(_obj, "removeInvitee", [_object.action], Object.getOwnPropertyDescriptor(_obj, "removeInvitee"), _obj)), _obj));

  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/connectors/user-custom-preferences/region", ["exports", "@ember/object", "discourse/plugins/discourse-calendar/lib/regions"], function (_exports, _object, _regions) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = {
    setupComponent: function setupComponent(args, component) {
      var _obj;

      component.setProperties((_obj = {
        onChange: function onChange(value) {
          this.model.set("custom_fields.holidays-region", value);
        },
        useCurrentRegion: function useCurrentRegion() {
          this.model.set("custom_fields.holidays-region", _regions.TIME_ZONE_TO_REGION[moment.tz.guess()] || "us");
        }
      }, (_applyDecoratedDescriptor(_obj, "onChange", [_object.action], Object.getOwnPropertyDescriptor(_obj, "onChange"), _obj), _applyDecoratedDescriptor(_obj, "useCurrentRegion", [_object.action], Object.getOwnPropertyDescriptor(_obj, "useCurrentRegion"), _obj)), _obj));
    },
    shouldRender: function shouldRender(args, component) {
      return component.siteSettings.calendar_enabled;
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/connectors/discovery-list-container-top/category-calendar", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    shouldRender: function shouldRender(_, ctx) {
      return ctx.siteSettings.calendar_categories_outlet === ctx.name;
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/connectors/before-topic-list-body/category-calendar", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    shouldRender: function shouldRender(_, ctx) {
      return ctx.siteSettings.calendar_categories_outlet === ctx.name;
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-calendar/connectors/after-user-name/holiday-flair", ["exports", "discourse/lib/text"], function (_exports, _text) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var HOLIDAY_EMOJI_NAME = "desert_island";
  var _default = {
    shouldRender: function shouldRender(args, context) {
      return context.siteSettings.calendar_enabled && context.site.users_on_holiday && context.site.users_on_holiday.includes(args.user.username);
    },
    setupComponent: function setupComponent(args, component) {
      component.setProperties({
        holidayEmojiName: ":".concat(HOLIDAY_EMOJI_NAME, ":"),
        holidayEmoji: (0, _text.emojiUrlFor)(HOLIDAY_EMOJI_NAME)
      });
    }
  };
  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/templates/connectors/user-custom-preferences/region"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"div\",true],[10,\"class\",\"control-group\"],[8],[0,\"\\n  \"],[7,\"label\",true],[10,\"class\",\"control-label\"],[8],[1,[28,\"i18n\",[\"discourse_calendar.region.title\"],null],false],[9],[0,\"\\n  \"],[7,\"div\",true],[10,\"class\",\"controls\"],[8],[0,\"\\n    \"],[1,[28,\"region-input\",null,[[\"value\",\"onChange\",\"class\"],[[24,[\"model\",\"custom_fields\",\"holidays-region\"]],[28,\"action\",[[23,0,[]],\"onChange\"],null],\"input-xxlarge\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n  \"],[1,[28,\"d-button\",null,[[\"icon\",\"label\",\"action\"],[\"globe\",\"discourse_calendar.region.use_current_region\",[28,\"action\",[[23,0,[]],\"useCurrentRegion\"],null]]]],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/templates/connectors/user-custom-preferences/region"}});
Ember.TEMPLATES["javascripts/templates/connectors/discovery-list-container-top/category-calendar"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[],\"hasEval\":false}","meta":{"moduleName":"javascripts/templates/connectors/discovery-list-container-top/category-calendar"}});
Ember.TEMPLATES["javascripts/templates/connectors/before-topic-list-body/category-calendar"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"div\",true],[10,\"class\",\"before-topic-list-body-outlet category-calendar\"],[8],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/templates/connectors/before-topic-list-body/category-calendar"}});
Ember.TEMPLATES["javascripts/templates/connectors/after-user-name/holiday-flair"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"img\",true],[11,\"src\",[22,\"holidayEmoji\"]],[10,\"class\",\"emoji\"],[11,\"alt\",[22,\"holidayEmojiName\"]],[8],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/templates/connectors/after-user-name/holiday-flair"}});


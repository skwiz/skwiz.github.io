define("discourse/plugins/discourse-local-dates/initializers/discourse-local-dates", ["exports", "../lib/local-date-builder", "discourse/lib/show-modal", "discourse/lib/plugin-api"], function (_exports, _localDateBuilder, _showModal, _pluginApi) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var DATE_TEMPLATE = "\n  <span>\n    <svg class=\"fa d-icon d-icon-globe-americas svg-icon\" xmlns=\"http://www.w3.org/2000/svg\">\n      <use xlink:href=\"#globe-americas\"></use>\n    </svg>\n    <span class=\"relative-time\"></span>\n  </span>\n";

  function initializeDiscourseLocalDates(api) {
    api.decorateCooked(function ($elem) {
      return $(".discourse-local-date", $elem).applyLocalDates();
    }, {
      id: "discourse-local-date"
    });
    api.onToolbarCreate(function (toolbar) {
      toolbar.addButton({
        title: "discourse_local_dates.title",
        id: "local-dates",
        group: "extras",
        icon: "calendar-alt",
        sendAction: function sendAction(event) {
          return toolbar.context.send("insertDiscourseLocalDate", event);
        }
      });
    });
    api.modifyClass("component:d-editor", {
      actions: {
        insertDiscourseLocalDate: function insertDiscourseLocalDate(toolbarEvent) {
          (0, _showModal.default)("discourse-local-dates-create-modal").setProperties({
            toolbarEvent: toolbarEvent
          });
        }
      }
    });
  }

  var _default = {
    name: "discourse-local-dates",
    initialize: function initialize(container) {
      var siteSettings = container.lookup("site-settings:main");

      if (siteSettings.discourse_local_dates_enabled) {
        $.fn.applyLocalDates = function () {
          return this.each(function () {
            var opts = {};
            var dataset = this.dataset;
            opts.time = dataset.time;
            opts.date = dataset.date;
            opts.recurring = dataset.recurring;
            opts.timezones = (dataset.timezones || siteSettings.discourse_local_dates_default_timezones || "Etc/UTC").split("|").filter(Boolean);
            opts.timezone = dataset.timezone;
            opts.calendar = (dataset.calendar || "on") === "on";
            opts.displayedTimezone = dataset.displayedTimezone;
            opts.format = dataset.format || (opts.time ? "LLL" : "LL");
            opts.countdown = dataset.countdown;
            var localDateBuilder = new _localDateBuilder.default(opts, moment.tz.guess()).build();
            var htmlPreviews = localDateBuilder.previews.map(function (preview) {
              var previewNode = document.createElement("div");
              previewNode.classList.add("preview");

              if (preview.current) {
                previewNode.classList.add("current");
              }

              var timezoneNode = document.createElement("span");
              timezoneNode.classList.add("timezone");
              timezoneNode.innerText = preview.timezone;
              previewNode.appendChild(timezoneNode);
              var dateTimeNode = document.createElement("span");
              dateTimeNode.classList.add("date-time");
              dateTimeNode.innerText = preview.formated;
              previewNode.appendChild(dateTimeNode);
              return previewNode;
            });
            var previewsNode = document.createElement("div");
            previewsNode.classList.add("locale-dates-previews");
            htmlPreviews.forEach(function (htmlPreview) {
              return previewsNode.appendChild(htmlPreview);
            });
            this.innerHTML = DATE_TEMPLATE;
            this.setAttribute("aria-label", localDateBuilder.textPreview);
            this.dataset.htmlTooltip = previewsNode.outerHTML;
            this.classList.add("cooked-date");

            if (localDateBuilder.pastEvent) {
              this.classList.add("past");
            }

            var relativeTime = this.querySelector(".relative-time");
            relativeTime.innerText = localDateBuilder.formated;
          });
        };

        (0, _pluginApi.withPluginApi)("0.8.8", initializeDiscourseLocalDates);
      }
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-local-dates/lib/local-date-builder", ["exports", "./date-with-zone-helper", "I18n"], function (_exports, _dateWithZoneHelper, _I18n) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  var TIME_FORMAT = "LLL";
  var DATE_FORMAT = "LL";
  var RANGE_SEPARATOR = "→";

  var LocalDateBuilder = /*#__PURE__*/function () {
    function LocalDateBuilder() {
      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var localTimezone = arguments.length > 1 ? arguments[1] : undefined;

      _classCallCheck(this, LocalDateBuilder);

      this.time = params.time;
      this.date = params.date;
      this.recurring = params.recurring;
      this.timezones = Array.from(new Set((params.timezones || []).filter(Boolean)));
      this.timezone = params.timezone || "UTC";
      this.calendar = typeof params.calendar === "undefined" ? true : params.calendar;
      this.displayedTimezone = params.displayedTimezone;
      this.format = params.format || (this.time ? TIME_FORMAT : DATE_FORMAT);
      this.countdown = params.countdown;
      this.localTimezone = localTimezone;
    }

    _createClass(LocalDateBuilder, [{
      key: "build",
      value: function build() {
        var _this$date$split$map = this.date.split("-").map(function (x) {
          return parseInt(x, 10);
        }),
            _this$date$split$map2 = _slicedToArray(_this$date$split$map, 3),
            year = _this$date$split$map2[0],
            month = _this$date$split$map2[1],
            day = _this$date$split$map2[2];

        var _split$map = (this.time || "").split(":").map(function (x) {
          return x ? parseInt(x, 10) : undefined;
        }),
            _split$map2 = _slicedToArray(_split$map, 3),
            hour = _split$map2[0],
            minute = _split$map2[1],
            second = _split$map2[2];

        var displayedTimezone;

        if (this.time) {
          displayedTimezone = this.displayedTimezone || this.localTimezone;
        } else {
          displayedTimezone = this.displayedTimezone || this.timezone || this.localTimezone;
        }

        var localDate = new _dateWithZoneHelper.default({
          year: year,
          month: month ? month - 1 : null,
          day: day,
          hour: hour,
          minute: minute,
          second: second,
          timezone: this.timezone,
          localTimezone: this.localTimezone
        });

        if (this.recurring && moment().isAfter(localDate.datetime)) {
          var _this$recurring$split = this.recurring.split("."),
              _this$recurring$split2 = _slicedToArray(_this$recurring$split, 2),
              count = _this$recurring$split2[0],
              type = _this$recurring$split2[1];

          var repetitionsForType = localDate.repetitionsBetweenDates(this.recurring, moment.tz(this.localTimezone));
          localDate = localDate.add(repetitionsForType + parseInt(count, 10), type);
        }

        var previews = this._generatePreviews(localDate, displayedTimezone);

        return {
          pastEvent: !this.recurring && moment.tz(this.localTimezone).isAfter(localDate.datetime),
          formated: this._applyFormatting(localDate, displayedTimezone),
          previews: previews,
          textPreview: this._generateTextPreviews(previews)
        };
      }
    }, {
      key: "_generateTextPreviews",
      value: function _generateTextPreviews(previews) {
        var _this = this;

        return previews.map(function (preview) {
          var formatedZone = _this._zoneWithoutPrefix(preview.timezone);

          return "".concat(formatedZone, " ").concat(preview.formated);
        }).join(", ");
      }
    }, {
      key: "_generatePreviews",
      value: function _generatePreviews(localDate, displayedTimezone) {
        var _this2 = this;

        var previewedTimezones = [];
        var timezones = this.timezones.filter(function (timezone) {
          return !_this2._isEqualZones(timezone, _this2.localTimezone);
        });
        previewedTimezones.push({
          timezone: this._zoneWithoutPrefix(this.localTimezone),
          current: true,
          formated: this._createDateTimeRange(_dateWithZoneHelper.default.fromDatetime(localDate.datetime, localDate.timezone, this.localTimezone), this.time)
        });

        if (this.timezone && displayedTimezone === this.localTimezone && this.timezone !== displayedTimezone && !this._isEqualZones(displayedTimezone, this.timezone) && !this.timezones.any(function (t) {
          return _this2._isEqualZones(t, _this2.timezone);
        })) {
          timezones.unshift(this.timezone);
        }

        timezones.forEach(function (timezone) {
          if (_this2._isEqualZones(timezone, displayedTimezone)) {
            return;
          }

          if (_this2._isEqualZones(timezone, _this2.localTimezone)) {
            timezone = _this2.localTimezone;
          }

          previewedTimezones.push({
            timezone: _this2._zoneWithoutPrefix(timezone),
            formated: _this2._createDateTimeRange(_dateWithZoneHelper.default.fromDatetime(localDate.datetime, localDate.timezone, timezone), _this2.time)
          });
        });
        return previewedTimezones.uniqBy("timezone");
      }
    }, {
      key: "_isEqualZones",
      value: function _isEqualZones(timezoneA, timezoneB) {
        if ((timezoneA || timezoneB) && (!timezoneA || !timezoneB)) {
          return false;
        }

        if (timezoneA.includes(timezoneB) || timezoneB.includes(timezoneA)) {
          return true;
        }

        return moment.tz(timezoneA).utcOffset() === moment.tz(timezoneB).utcOffset();
      }
    }, {
      key: "_createDateTimeRange",
      value: function _createDateTimeRange(startRange, time) {
        // if a time has been given we do not attempt to automatically create a range
        // instead we show only one date with a format showing the time
        if (time) {
          return startRange.format(TIME_FORMAT);
        } else {
          var endRange = startRange.add(24, "hours");
          return [startRange.format("LLLL"), RANGE_SEPARATOR, endRange.format("LLLL")].join(" ");
        }
      }
    }, {
      key: "_applyFormatting",
      value: function _applyFormatting(localDate, displayedTimezone) {
        if (this.countdown) {
          var diffTime = moment.tz(this.localTimezone).diff(localDate.datetime);

          if (diffTime < 0) {
            return moment.duration(diffTime).humanize();
          } else {
            return _I18n.default.t("discourse_local_dates.relative_dates.countdown.passed");
          }
        }

        var sameTimezone = this._isEqualZones(displayedTimezone, this.localTimezone);

        if (this.calendar) {
          var inCalendarRange = moment.tz(this.localTimezone).isBetween(localDate.subtract(2, "day").datetime, localDate.add(1, "day").datetime.endOf("day"));

          if (inCalendarRange && sameTimezone) {
            var date = localDate.datetimeWithZone(this.localTimezone);

            if (date.hours() === 0 && date.minutes() === 0) {
              return date.format("dddd");
            }

            return date.calendar(moment.tz(localDate.timezone), this._calendarFormats(this.time ? this.time : null));
          }
        }

        if (!sameTimezone) {
          return this._formatWithZone(localDate, displayedTimezone, this.format);
        }

        return localDate.format(this.format);
      }
    }, {
      key: "_calendarFormats",
      value: function _calendarFormats(time) {
        return {
          sameDay: this._translateCalendarKey(time, "today"),
          nextDay: this._translateCalendarKey(time, "tomorrow"),
          lastDay: this._translateCalendarKey(time, "yesterday"),
          sameElse: "L"
        };
      }
    }, {
      key: "_translateCalendarKey",
      value: function _translateCalendarKey(time, key) {
        var translated = _I18n.default.t("discourse_local_dates.relative_dates.".concat(key), {
          time: "LT"
        });

        if (time) {
          return translated.split("LT").map(function (w) {
            return "[".concat(w, "]");
          }).join("LT");
        } else {
          return "[".concat(translated.replace(" LT", ""), "]");
        }
      }
    }, {
      key: "_formatTimezone",
      value: function _formatTimezone(timezone) {
        return timezone.replace("_", " ").replace("Etc/", "").split("/");
      }
    }, {
      key: "_zoneWithoutPrefix",
      value: function _zoneWithoutPrefix(timezone) {
        var _this$_formatTimezone = this._formatTimezone(timezone),
            _this$_formatTimezone2 = _slicedToArray(_this$_formatTimezone, 2),
            part1 = _this$_formatTimezone2[0],
            part2 = _this$_formatTimezone2[1];

        return part2 || part1;
      }
    }, {
      key: "_formatWithZone",
      value: function _formatWithZone(localDate, displayedTimezone, format) {
        var formated = localDate.datetimeWithZone(displayedTimezone).format(format);
        return "".concat(formated, " (").concat(this._zoneWithoutPrefix(displayedTimezone), ")");
      }
    }]);

    return LocalDateBuilder;
  }();

  _exports.default = LocalDateBuilder;
});
define("discourse/plugins/discourse-local-dates/lib/discourse-markdown/discourse-local-dates", ["exports", "pretty-text/engines/discourse-markdown/bbcode-block"], function (_exports, _bbcodeBlock) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.setup = setup;

  function addLocalDate(buffer, matches, state) {
    var token;
    var config = {
      date: null,
      time: null,
      timezone: null,
      format: null,
      timezones: null,
      displayedTimezone: null,
      countdown: null
    };
    var matchString = matches[1].replace(/‘|’|„|“|«|»|”/g, '"');
    var parsed = (0, _bbcodeBlock.parseBBCodeTag)("[date date" + matchString + "]", 0, matchString.length + 11);
    config.date = parsed.attrs.date;
    config.format = parsed.attrs.format;
    config.calendar = parsed.attrs.calendar;
    config.time = parsed.attrs.time;
    config.timezone = (parsed.attrs.timezone || "").trim();
    config.recurring = parsed.attrs.recurring;
    config.timezones = parsed.attrs.timezones;
    config.displayedTimezone = parsed.attrs.displayedTimezone;
    config.countdown = parsed.attrs.countdown;
    token = new state.Token("span_open", "span", 1);
    token.attrs = [["data-date", state.md.utils.escapeHtml(config.date)]];

    if (!config.date.match(/\d{4}-\d{2}-\d{2}/)) {
      closeBuffer(buffer, state, moment.invalid().format());
      return;
    }

    if (config.time && !config.time.match(/\d{2}:\d{2}(?::\d{2})?/)) {
      closeBuffer(buffer, state, moment.invalid().format());
      return;
    }

    var dateTime = config.date;

    if (config.time) {
      token.attrs.push(["data-time", state.md.utils.escapeHtml(config.time)]);
      dateTime = "".concat(dateTime, " ").concat(config.time);
    }

    if (!moment(dateTime).isValid()) {
      closeBuffer(buffer, state, moment.invalid().format());
      return;
    }

    token.attrs.push(["class", "discourse-local-date"]);

    if (config.format) {
      token.attrs.push(["data-format", state.md.utils.escapeHtml(config.format)]);
    }

    if (config.countdown) {
      token.attrs.push(["data-countdown", state.md.utils.escapeHtml(config.countdown)]);
    }

    if (config.calendar) {
      token.attrs.push(["data-calendar", state.md.utils.escapeHtml(config.calendar)]);
    }

    if (config.displayedTimezone && moment.tz.names().includes(config.displayedTimezone)) {
      token.attrs.push(["data-displayed-timezone", state.md.utils.escapeHtml(config.displayedTimezone)]);
    }

    if (config.timezones) {
      var timezones = config.timezones.split("|").filter(function (timezone) {
        return moment.tz.names().includes(timezone);
      });
      token.attrs.push(["data-timezones", state.md.utils.escapeHtml(timezones.join("|"))]);
    }

    if (config.timezone && moment.tz.names().includes(config.timezone)) {
      token.attrs.push(["data-timezone", state.md.utils.escapeHtml(config.timezone)]);
      dateTime = moment.tz(dateTime, config.timezone);
    } else {
      dateTime = moment.utc(dateTime);
    }

    if (config.recurring) {
      token.attrs.push(["data-recurring", state.md.utils.escapeHtml(config.recurring)]);
    }

    buffer.push(token);
    var formattedDateTime = dateTime.tz("Etc/UTC").format(state.md.options.discourse.datesEmailFormat || moment.defaultFormat);
    token.attrs.push(["data-email-preview", "".concat(formattedDateTime, " UTC")]);
    closeBuffer(buffer, state, dateTime.utc().format(config.format));
  }

  function closeBuffer(buffer, state, text) {
    var token;
    token = new state.Token("text", "", 0);
    token.content = text;
    buffer.push(token);
    token = new state.Token("span_close", "span", -1);
    buffer.push(token);
  }

  function setup(helper) {
    helper.allowList(["span.discourse-local-date", "span[data-*]", "span[aria-label]"]);
    helper.registerOptions(function (opts, siteSettings) {
      opts.datesEmailFormat = siteSettings.discourse_local_dates_email_format;
      opts.features["discourse-local-dates"] = !!siteSettings.discourse_local_dates_enabled;
    });
    helper.registerPlugin(function (md) {
      var rule = {
        matcher: /\[date(=.+?)\]/,
        onMatch: addLocalDate
      };
      md.core.textPostProcess.ruler.push("discourse-local-dates", rule);
    });
  }
});
define("discourse/plugins/discourse-local-dates/lib/date-with-zone-helper", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

  function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

  function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

  function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

  function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  var _Ember = Ember,
      getProperties = _Ember.getProperties;
  /*
    DateWithZoneHelper provides a limited list of helpers
    to manipulate a moment object with timezones
  
    - add(count unit) adds a COUNT of UNITS to a date
    - subtract(count unit) subtracts a COUNT of UNITS to a date
    - format(format) formats a date with zone in a consitent way, optional moment format
    - isDST() allows to know if a date in a specified timezone is currently under DST
    - datetimeWithZone(timezone) returns a new moment object with timezone applied
    - datetime returns the moment object
    - repetitionsBetweenDates(duration, date) return the number of repertitions of
    duration between two dates, eg for duration: "1.weeks", "2.months"...
  */

  var DateWithZoneHelper = /*#__PURE__*/function () {
    function DateWithZoneHelper() {
      var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      _classCallCheck(this, DateWithZoneHelper);

      this.timezone = params.timezone || "UTC";
      this.localTimezone = params.localTimezone || moment.tz.guess();
      this.datetime = moment.tz(getProperties(params, ["year", "month", "day", "hour", "minute", "second"]), this.timezone);
    }

    _createClass(DateWithZoneHelper, [{
      key: "isDST",
      value: function isDST() {
        return this.datetime.tz(this.localTimezone).isDST();
      }
    }, {
      key: "repetitionsBetweenDates",
      value: function repetitionsBetweenDates(duration, date) {
        var _duration$split = duration.split("."),
            _duration$split2 = _slicedToArray(_duration$split, 2),
            count = _duration$split2[0],
            unit = _duration$split2[1];

        var diff = this.datetime.diff(date, unit);
        var repetitions = diff / parseInt(count, 10);
        return Math.abs((Math.round(repetitions * 10) / 10).toFixed(1));
      }
    }, {
      key: "add",
      value: function add(count, unit) {
        return this._fromDatetime(this.datetime.clone().add(count, unit), this.timezone, this.localTimezone);
      }
    }, {
      key: "subtract",
      value: function subtract(count, unit) {
        return this._fromDatetime(this.datetime.clone().subtract(count, unit), this.timezone, this.localTimezone);
      }
    }, {
      key: "datetimeWithZone",
      value: function datetimeWithZone(timezone) {
        return this.datetime.clone().tz(timezone);
      }
    }, {
      key: "format",
      value: function format(_format) {
        if (_format) {
          return this.datetime.tz(this.localTimezone).format(_format);
        }

        return this.datetime.tz(this.localTimezone).toISOString(true);
      }
    }, {
      key: "_fromDatetime",
      value: function _fromDatetime(datetime, timezone, localTimezone) {
        return DateWithZoneHelper.fromDatetime(datetime, timezone, localTimezone);
      }
    }], [{
      key: "fromDatetime",
      value: function fromDatetime(datetime, timezone, localTimezone) {
        return new DateWithZoneHelper({
          year: datetime.year(),
          month: datetime.month(),
          day: datetime.date(),
          hour: datetime.hour(),
          minute: datetime.minute(),
          second: datetime.second(),
          timezone: timezone,
          localTimezone: localTimezone
        });
      }
    }]);

    return DateWithZoneHelper;
  }();

  _exports.default = DateWithZoneHelper;
});
define("discourse/plugins/discourse-local-dates/discourse/components/discourse-local-dates-create-form", ["exports", "discourse-common/utils/decorators", "@ember/component", "@ember/object", "I18n", "discourse-common/config/environment", "rsvp", "discourse/lib/text", "discourse-common/lib/debounce", "@ember/utils", "discourse/lib/load-script", "@ember/object/computed", "discourse/lib/computed", "@ember/runloop"], function (_exports, _decorators, _component, _object, _I18n, _environment, _rsvp, _text, _debounce, _utils, _loadScript, _computed, _computed2, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _dec10, _dec11, _dec12, _dec13, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_dec = (0, _decorators.observes)("markup"), _dec2 = (0, _decorators.default)("date", "toDate", "toTime"), _dec3 = (0, _decorators.default)("computedConfig", "isRange"), _dec4 = (0, _decorators.default)("date", "time", "isRange", "options.{format,timezone}"), _dec5 = (0, _decorators.default)("toDate", "toTime", "isRange", "options.{timezone,format}"), _dec6 = (0, _decorators.default)("recurring", "timezones", "timezone", "format"), _dec7 = (0, _decorators.default)("fromConfig.{date}", "toConfig.{date}", "options.{recurring,timezones,timezone,format}"), _dec8 = (0, _decorators.default)("currentUserTimezone"), _dec9 = (0, _decorators.default)("formats"), _dec10 = (0, _decorators.default)("advancedMode"), _dec11 = (0, _decorators.default)("computedConfig.{from,to,options}", "options", "isValid", "isRange"), _dec12 = (0, _decorators.default)("fromConfig.dateTime"), _dec13 = (0, _decorators.default)("toConfig.dateTime", "toSelected"), (_obj = {
    timeFormat: "HH:mm:ss",
    dateFormat: "YYYY-MM-DD",
    dateTimeFormat: "YYYY-MM-DD HH:mm:ss",
    date: null,
    toDate: null,
    time: null,
    toTime: null,
    format: null,
    formats: null,
    recurring: null,
    advancedMode: false,
    timezone: null,
    fromSelected: null,
    fromFilled: (0, _computed.notEmpty)("date"),
    toSelected: null,
    toFilled: (0, _computed.notEmpty)("toDate"),
    init: function init() {
      this._super.apply(this, arguments);

      this._picker = null;
      this.setProperties({
        timezones: [],
        formats: (this.siteSettings.discourse_local_dates_default_formats || "").split("|").filter(function (f) {
          return f;
        }),
        timezone: moment.tz.guess(),
        date: moment().format(this.dateFormat)
      });
    },
    didInsertElement: function didInsertElement() {
      var _this = this;

      this._super.apply(this, arguments);

      this._setupPicker().then(function (picker) {
        _this._picker = picker;

        _this.send("focusFrom");
      });
    },
    _renderPreview: function _renderPreview() {
      (0, _debounce.default)(this, function () {
        var _this2 = this;

        var markup = this.markup;

        if (markup) {
          (0, _text.cookAsync)(markup).then(function (result) {
            _this2.set("currentPreview", result);

            (0, _runloop.schedule)("afterRender", function () {
              return _this2.$(".preview .discourse-local-date").applyLocalDates();
            });
          });
        }
      }, _environment.INPUT_DELAY);
    },
    isRange: function isRange(date, toDate, toTime) {
      return date && (toDate || toTime);
    },
    isValid: function isValid(config, isRange) {
      var fromConfig = config.from;

      if (!config.from.dateTime || !config.from.dateTime.isValid()) {
        return false;
      }

      if (isRange) {
        var toConfig = config.to;

        if (!toConfig.dateTime || !toConfig.dateTime.isValid() || toConfig.dateTime.diff(fromConfig.dateTime) < 0) {
          return false;
        }
      }

      return true;
    },
    fromConfig: function fromConfig(date, time, isRange) {
      var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
      var timeInferred = time ? false : true;
      var dateTime;

      if (!timeInferred) {
        dateTime = moment.tz("".concat(date, " ").concat(time), options.timezone);
      } else {
        dateTime = moment.tz(date, options.timezone);
      }

      if (!timeInferred) {
        time = dateTime.format(this.timeFormat);
      }

      var format = options.format;

      if (timeInferred && this.formats.includes(format)) {
        format = "LL";
      }

      return _object.default.create({
        date: dateTime.format(this.dateFormat),
        time: time,
        dateTime: dateTime,
        format: format,
        range: isRange ? "start" : false
      });
    },
    toConfig: function toConfig(date, time, isRange) {
      var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
      var timeInferred = time ? false : true;

      if (time && !date) {
        date = moment().format(this.dateFormat);
      }

      var dateTime;

      if (!timeInferred) {
        dateTime = moment.tz("".concat(date, " ").concat(time), options.timezone);
      } else {
        dateTime = moment.tz(date, options.timezone).endOf("day");
      }

      if (!timeInferred) {
        time = dateTime.format(this.timeFormat);
      }

      var format = options.format;

      if (timeInferred && this.formats.includes(format)) {
        format = "LL";
      }

      return _object.default.create({
        date: dateTime.format(this.dateFormat),
        time: time,
        dateTime: dateTime,
        format: format,
        range: isRange ? "end" : false
      });
    },
    options: function options(recurring, timezones, timezone, format) {
      return _object.default.create({
        recurring: recurring,
        timezones: timezones,
        timezone: timezone,
        format: format
      });
    },
    computedConfig: function computedConfig(fromConfig, toConfig, options) {
      return _object.default.create({
        from: fromConfig,
        to: toConfig,
        options: options
      });
    },
    currentUserTimezone: function currentUserTimezone() {
      return moment.tz.guess();
    },
    allTimezones: function allTimezones() {
      return moment.tz.names();
    },
    timezoneIsDifferentFromUserTimezone: (0, _computed2.propertyNotEqual)("currentUserTimezone", "options.timezone"),
    formatedCurrentUserTimezone: function formatedCurrentUserTimezone(timezone) {
      return timezone.replace("_", " ").replace("Etc/", "").split("/");
    },
    previewedFormats: function previewedFormats(formats) {
      return formats.map(function (format) {
        return {
          format: format,
          preview: moment().format(format)
        };
      });
    },
    recurringOptions: function recurringOptions() {
      var key = "discourse_local_dates.create.form.recurring";
      return [{
        name: _I18n.default.t("".concat(key, ".every_day")),
        id: "1.days"
      }, {
        name: _I18n.default.t("".concat(key, ".every_week")),
        id: "1.weeks"
      }, {
        name: _I18n.default.t("".concat(key, ".every_two_weeks")),
        id: "2.weeks"
      }, {
        name: _I18n.default.t("".concat(key, ".every_month")),
        id: "1.months"
      }, {
        name: _I18n.default.t("".concat(key, ".every_two_months")),
        id: "2.months"
      }, {
        name: _I18n.default.t("".concat(key, ".every_three_months")),
        id: "3.months"
      }, {
        name: _I18n.default.t("".concat(key, ".every_six_months")),
        id: "6.months"
      }, {
        name: _I18n.default.t("".concat(key, ".every_year")),
        id: "1.years"
      }];
    },
    _generateDateMarkup: function _generateDateMarkup(config, options, isRange) {
      var text = "[date=".concat(config.date);

      if (config.time) {
        text += " time=".concat(config.time);
      }

      if (config.format && config.format.length) {
        text += " format=\"".concat(config.format, "\"");
      }

      if (options.timezone) {
        text += " timezone=\"".concat(options.timezone, "\"");
      }

      if (options.timezones && options.timezones.length) {
        text += " timezones=\"".concat(options.timezones.join("|"), "\"");
      }

      if (options.recurring && !isRange) {
        text += " recurring=\"".concat(options.recurring, "\"");
      }

      text += "]";
      return text;
    },
    toggleModeBtnLabel: function toggleModeBtnLabel(advancedMode) {
      return advancedMode ? "discourse_local_dates.create.form.simple_mode" : "discourse_local_dates.create.form.advanced_mode";
    },
    markup: function markup(config, options, isValid, isRange) {
      var text;

      if (isValid && config.from) {
        text = this._generateDateMarkup(config.from, options, isRange);

        if (config.to && config.to.range) {
          text += " \u2192 ";
          text += this._generateDateMarkup(config.to, options, isRange);
        }
      }

      return text;
    },
    formattedFrom: function formattedFrom(dateTime) {
      return dateTime.format("LLLL");
    },
    formattedTo: function formattedTo(dateTime, toSelected) {
      var emptyText = toSelected ? "&nbsp;" : _I18n.default.t("discourse_local_dates.create.form.until");
      return dateTime.isValid() ? dateTime.format("LLLL") : emptyText;
    },
    actions: {
      setTime: function setTime(event) {
        this._setTimeIfValid(event.target.value, "time");
      },
      setToTime: function setToTime(event) {
        this._setTimeIfValid(event.target.value, "toTime");
      },
      eraseToDateTime: function eraseToDateTime() {
        this.setProperties({
          toDate: null,
          toTime: null
        });

        this._setPickerDate(null);
      },
      focusFrom: function focusFrom() {
        this.setProperties({
          fromSelected: true,
          toSelected: false
        });

        this._setPickerDate(this.get("fromConfig.date"));

        this._setPickerMinDate(null);
      },
      focusTo: function focusTo() {
        this.setProperties({
          toSelected: true,
          fromSelected: false
        });

        this._setPickerDate(this.get("toConfig.date"));

        this._setPickerMinDate(this.get("fromConfig.date"));
      },
      advancedMode: function advancedMode() {
        this.toggleProperty("advancedMode");
      },
      save: function save() {
        var markup = this.markup;

        if (markup) {
          this._closeModal();

          this.toolbarEvent.addText(markup);
        }
      },
      cancel: function cancel() {
        this._closeModal();
      }
    },
    _setTimeIfValid: function _setTimeIfValid(time, key) {
      if ((0, _utils.isEmpty)(time)) {
        this.set(key, null);
        return;
      }

      if (/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
        this.set(key, time);
      }
    },
    _setupPicker: function _setupPicker() {
      var _this3 = this;

      return new _rsvp.Promise(function (resolve) {
        (0, _loadScript.default)("/javascripts/pikaday.js").then(function () {
          var options = {
            field: _this3.$(".fake-input")[0],
            container: _this3.$("#picker-container-".concat(_this3.elementId))[0],
            bound: false,
            format: "YYYY-MM-DD",
            reposition: false,
            firstDay: 1,
            setDefaultDate: true,
            keyboardInput: false,
            i18n: {
              previousMonth: _I18n.default.t("dates.previous_month"),
              nextMonth: _I18n.default.t("dates.next_month"),
              months: moment.months(),
              weekdays: moment.weekdays(),
              weekdaysShort: moment.weekdaysMin()
            },
            onSelect: function onSelect(date) {
              var formattedDate = moment(date).format("YYYY-MM-DD");

              if (_this3.fromSelected) {
                _this3.set("date", formattedDate);
              }

              if (_this3.toSelected) {
                _this3.set("toDate", formattedDate);
              }
            }
          };
          resolve(new Pikaday(options));
        });
      });
    },
    _setPickerMinDate: function _setPickerMinDate(date) {
      var _this4 = this;

      if (date && !moment(date, this.dateFormat).isValid()) {
        date = null;
      }

      (0, _runloop.schedule)("afterRender", function () {
        _this4._picker.setMinDate(moment(date, _this4.dateFormat).toDate());
      });
    },
    _setPickerDate: function _setPickerDate(date) {
      var _this5 = this;

      if (date && !moment(date, this.dateFormat).isValid()) {
        date = null;
      }

      (0, _runloop.schedule)("afterRender", function () {
        _this5._picker.setDate(moment.utc(date), true);
      });
    },
    _closeModal: function _closeModal() {
      var composer = Discourse.__container__.lookup("controller:composer");

      composer.send("closeModal");
    }
  }, (_applyDecoratedDescriptor(_obj, "_renderPreview", [_dec], Object.getOwnPropertyDescriptor(_obj, "_renderPreview"), _obj), _applyDecoratedDescriptor(_obj, "isRange", [_dec2], Object.getOwnPropertyDescriptor(_obj, "isRange"), _obj), _applyDecoratedDescriptor(_obj, "isValid", [_dec3], Object.getOwnPropertyDescriptor(_obj, "isValid"), _obj), _applyDecoratedDescriptor(_obj, "fromConfig", [_dec4], Object.getOwnPropertyDescriptor(_obj, "fromConfig"), _obj), _applyDecoratedDescriptor(_obj, "toConfig", [_dec5], Object.getOwnPropertyDescriptor(_obj, "toConfig"), _obj), _applyDecoratedDescriptor(_obj, "options", [_dec6], Object.getOwnPropertyDescriptor(_obj, "options"), _obj), _applyDecoratedDescriptor(_obj, "computedConfig", [_dec7], Object.getOwnPropertyDescriptor(_obj, "computedConfig"), _obj), _applyDecoratedDescriptor(_obj, "currentUserTimezone", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "currentUserTimezone"), _obj), _applyDecoratedDescriptor(_obj, "allTimezones", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "allTimezones"), _obj), _applyDecoratedDescriptor(_obj, "formatedCurrentUserTimezone", [_dec8], Object.getOwnPropertyDescriptor(_obj, "formatedCurrentUserTimezone"), _obj), _applyDecoratedDescriptor(_obj, "previewedFormats", [_dec9], Object.getOwnPropertyDescriptor(_obj, "previewedFormats"), _obj), _applyDecoratedDescriptor(_obj, "recurringOptions", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "recurringOptions"), _obj), _applyDecoratedDescriptor(_obj, "toggleModeBtnLabel", [_dec10], Object.getOwnPropertyDescriptor(_obj, "toggleModeBtnLabel"), _obj), _applyDecoratedDescriptor(_obj, "markup", [_dec11], Object.getOwnPropertyDescriptor(_obj, "markup"), _obj), _applyDecoratedDescriptor(_obj, "formattedFrom", [_dec12], Object.getOwnPropertyDescriptor(_obj, "formattedFrom"), _obj), _applyDecoratedDescriptor(_obj, "formattedTo", [_dec13], Object.getOwnPropertyDescriptor(_obj, "formattedTo"), _obj)), _obj)));

  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/modal/discourse-local-dates-create-modal"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"discourse-local-dates-create-form\",null,[[\"config\",\"toolbarEvent\"],[[24,[\"config\"]],[24,[\"toolbarEvent\"]]]]],false],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/modal/discourse-local-dates-create-modal"}});
Ember.TEMPLATES["javascripts/components/discourse-local-dates-create-form"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"previewedFormat\"],\"statements\":[[4,\"d-modal-body\",null,[[\"title\",\"class\",\"style\"],[\"discourse_local_dates.title\",\"discourse-local-dates-create-modal\",\"overflow: auto\"]],{\"statements\":[[0,\"\\n  \"],[7,\"div\",true],[10,\"class\",\"form\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"isValid\"]]],null,{\"statements\":[[4,\"if\",[[24,[\"timezoneIsDifferentFromUserTimezone\"]]],null,{\"statements\":[[0,\"        \"],[7,\"div\",true],[10,\"class\",\"preview alert alert-info\"],[8],[0,\"\\n          \"],[7,\"b\",true],[8],[1,[22,\"formatedCurrentUserTimezone\"],false],[0,\" \"],[9],[1,[22,\"currentPreview\"],false],[0,\"\\n        \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},{\"statements\":[[0,\"      \"],[7,\"div\",true],[10,\"class\",\"validation-error alert alert-error\"],[8],[0,\"\\n        \"],[1,[28,\"i18n\",[\"discourse_local_dates.create.form.invalid_date\"],null],false],[0,\"\\n      \"],[9],[0,\"\\n\"]],\"parameters\":[]}],[0,\"\\n    \"],[1,[22,\"computeDate\"],false],[0,\"\\n\\n    \"],[7,\"div\",true],[10,\"class\",\"date-time-configuration\"],[8],[0,\"\\n      \"],[7,\"div\",true],[10,\"class\",\"inputs-panel\"],[8],[0,\"\\n        \"],[7,\"div\",true],[11,\"class\",[29,[\"date-time-control from \",[28,\"if\",[[24,[\"fromSelected\"]],\"is-selected\"],null],\" \",[28,\"if\",[[24,[\"fromFilled\"]],\"is-filled\"],null]]]],[8],[0,\"\\n          \"],[1,[28,\"d-icon\",[\"calendar-alt\"],null],false],[0,\"\\n          \"],[1,[28,\"d-button\",null,[[\"id\",\"action\",\"translatedLabel\",\"class\"],[\"from-date-time\",[28,\"action\",[[23,0,[]],\"focusFrom\"],null],[24,[\"formattedFrom\"]],\"date-time\"]]],false],[0,\"\\n        \"],[9],[0,\"\\n\\n        \"],[7,\"div\",true],[11,\"class\",[29,[\"date-time-control to \",[28,\"if\",[[24,[\"toSelected\"]],\"is-selected\"],null],\" \",[28,\"if\",[[24,[\"toFilled\"]],\"is-filled\"],null]]]],[8],[0,\"\\n          \"],[1,[28,\"d-icon\",[\"calendar-alt\"],null],false],[0,\"\\n          \"],[1,[28,\"d-button\",null,[[\"action\",\"translatedLabel\",\"class\"],[[28,\"action\",[[23,0,[]],\"focusTo\"],null],[24,[\"formattedTo\"]],\"date-time\"]]],false],[0,\"\\n\"],[4,\"if\",[[24,[\"toFilled\"]]],null,{\"statements\":[[0,\"            \"],[1,[28,\"d-button\",null,[[\"icon\",\"action\",\"class\"],[\"times\",[28,\"action\",[[23,0,[]],\"eraseToDateTime\"],null],\"delete-to-date\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"        \"],[9],[0,\"\\n\\n\"],[4,\"unless\",[[24,[\"site\",\"mobileView\"]]],null,{\"statements\":[[0,\"          \"],[1,[28,\"timezone-input\",null,[[\"options\",\"value\",\"onChange\"],[[28,\"hash\",null,[[\"icon\"],[\"globe\"]]],[24,[\"timezone\"]],[28,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"timezone\"]]],null]],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"      \"],[9],[0,\"\\n\\n      \"],[7,\"div\",true],[10,\"class\",\"picker-panel\"],[8],[0,\"\\n        \"],[1,[28,\"input\",null,[[\"class\"],[\"fake-input\"]]],false],[0,\"\\n        \"],[7,\"div\",true],[10,\"class\",\"date-picker\"],[11,\"id\",[29,[\"picker-container-\",[22,\"elementId\"]]]],[8],[9],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"fromSelected\"]]],null,{\"statements\":[[0,\"          \"],[7,\"div\",true],[10,\"class\",\"time-pickers\"],[8],[0,\"\\n            \"],[1,[28,\"d-icon\",[\"far-clock\"],null],false],[0,\"\\n            \"],[1,[28,\"input\",null,[[\"maxlength\",\"placeholder\",\"input\",\"type\",\"value\",\"class\"],[5,\"hh:mm\",[28,\"action\",[[23,0,[]],\"setTime\"],null],\"time\",[24,[\"time\"]],\"time-picker\"]]],false],[0,\"\\n          \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"if\",[[24,[\"toSelected\"]]],null,{\"statements\":[[4,\"if\",[[24,[\"toDate\"]]],null,{\"statements\":[[0,\"            \"],[7,\"div\",true],[10,\"class\",\"time-pickers\"],[8],[0,\"\\n              \"],[1,[28,\"d-icon\",[\"far-clock\"],null],false],[0,\"\\n              \"],[1,[28,\"input\",null,[[\"maxlength\",\"placeholder\",\"input\",\"type\",\"value\",\"class\"],[5,\"hh:mm\",[28,\"action\",[[23,0,[]],\"setToTime\"],null],\"time\",[24,[\"toTime\"]],\"time-picker\"]]],false],[0,\"\\n            \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"      \"],[9],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"site\",\"mobileView\"]]],null,{\"statements\":[[0,\"        \"],[1,[28,\"timezone-input\",null,[[\"value\",\"options\",\"onChange\"],[[24,[\"timezone\"]],[28,\"hash\",null,[[\"icon\"],[\"globe\"]]],[28,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"timezone\"]]],null]],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[9],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"advancedMode\"]]],null,{\"statements\":[[0,\"      \"],[7,\"div\",true],[10,\"class\",\"advanced-options\"],[8],[0,\"\\n\"],[4,\"unless\",[[24,[\"isRange\"]]],null,{\"statements\":[[0,\"          \"],[7,\"div\",true],[10,\"class\",\"control-group recurrence\"],[8],[0,\"\\n            \"],[7,\"label\",true],[10,\"class\",\"control-label\"],[8],[0,\"\\n              \"],[1,[28,\"i18n\",[\"discourse_local_dates.create.form.recurring_title\"],null],false],[0,\"\\n            \"],[9],[0,\"\\n            \"],[7,\"p\",true],[8],[1,[28,\"html-safe\",[[28,\"i18n\",[\"discourse_local_dates.create.form.recurring_description\"],null]],null],false],[9],[0,\"\\n            \"],[7,\"div\",true],[10,\"class\",\"controls\"],[8],[0,\"\\n              \"],[1,[28,\"combo-box\",null,[[\"content\",\"class\",\"value\",\"onChange\",\"none\"],[[24,[\"recurringOptions\"]],\"recurrence-input\",[24,[\"recurring\"]],[28,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"recurring\"]]],null]],null],\"discourse_local_dates.create.form.recurring_none\"]]],false],[0,\"\\n            \"],[9],[0,\"\\n          \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n        \"],[7,\"div\",true],[10,\"class\",\"control-group format\"],[8],[0,\"\\n          \"],[7,\"label\",true],[8],[1,[28,\"i18n\",[\"discourse_local_dates.create.form.format_title\"],null],false],[9],[0,\"\\n          \"],[7,\"p\",true],[8],[0,\"\\n            \"],[1,[28,\"i18n\",[\"discourse_local_dates.create.form.format_description\"],null],false],[0,\"\\n            \"],[7,\"a\",true],[10,\"target\",\"_blank\"],[10,\"href\",\"https://momentjs.com/docs/#/parsing/string-format/\"],[10,\"rel\",\"noopener noreferrer\"],[8],[0,\"\\n              \"],[1,[28,\"d-icon\",[\"question-circle\"],null],false],[0,\"\\n            \"],[9],[0,\"\\n          \"],[9],[0,\"\\n          \"],[7,\"div\",true],[10,\"class\",\"controls\"],[8],[0,\"\\n            \"],[1,[28,\"text-field\",null,[[\"value\",\"class\"],[[24,[\"format\"]],\"format-input\"]]],false],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n        \"],[7,\"div\",true],[10,\"class\",\"control-group\"],[8],[0,\"\\n          \"],[7,\"ul\",true],[10,\"class\",\"formats\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"previewedFormats\"]]],null,{\"statements\":[[0,\"              \"],[7,\"li\",true],[10,\"class\",\"format\"],[8],[0,\"\\n                \"],[7,\"a\",false],[12,\"class\",\"moment-format\"],[12,\"href\",\"\"],[3,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"format\"]]],null],[23,1,[\"format\"]]]],[8],[0,\"\\n                  \"],[1,[23,1,[\"format\"]],false],[0,\"\\n                \"],[9],[0,\"\\n                \"],[7,\"span\",true],[10,\"class\",\"previewed-format\"],[8],[0,\"\\n                  \"],[1,[23,1,[\"preview\"]],false],[0,\"\\n                \"],[9],[0,\"\\n              \"],[9],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n\\n        \"],[7,\"div\",true],[10,\"class\",\"control-group timezones\"],[8],[0,\"\\n          \"],[7,\"label\",true],[8],[1,[28,\"i18n\",[\"discourse_local_dates.create.form.timezones_title\"],null],false],[9],[0,\"\\n          \"],[7,\"p\",true],[8],[1,[28,\"i18n\",[\"discourse_local_dates.create.form.timezones_description\"],null],false],[9],[0,\"\\n          \"],[7,\"div\",true],[10,\"class\",\"controls\"],[8],[0,\"\\n            \"],[1,[28,\"multi-select\",null,[[\"valueProperty\",\"nameProperty\",\"class\",\"allowAny\",\"maximum\",\"content\",\"value\"],[null,null,\"timezones-input\",false,5,[24,[\"allTimezones\"]],[24,[\"timezones\"]]]]],false],[0,\"\\n          \"],[9],[0,\"\\n        \"],[9],[0,\"\\n      \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[7,\"div\",true],[10,\"class\",\"modal-footer discourse-local-dates-create-modal-footer\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"isValid\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"d-button\",null,[[\"class\",\"action\",\"label\"],[\"btn-primary\",[28,\"action\",[[23,0,[]],\"save\"],null],\"discourse_local_dates.create.form.insert\"]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n  \"],[7,\"a\",false],[12,\"class\",\"cancel-action\"],[12,\"href\",\"\"],[3,\"action\",[[23,0,[]],\"cancel\"]],[8],[0,\"\\n    \"],[1,[28,\"i18n\",[\"cancel\"],null],false],[0,\"\\n  \"],[9],[0,\"\\n\\n  \"],[1,[28,\"d-button\",null,[[\"class\",\"action\",\"icon\",\"label\"],[\"btn-default advanced-mode-btn\",[28,\"action\",[[23,0,[]],\"advancedMode\"],null],\"cog\",[24,[\"toggleModeBtnLabel\"]]]]],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/discourse-local-dates-create-form"}});
define("discourse/plugins/discourse-local-dates/discourse/controllers/discourse-local-dates-create-modal", ["exports", "@ember/controller", "discourse/mixins/modal-functionality", "@ember/runloop"], function (_exports, _controller, _modalFunctionality, _runloop) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = _controller.default.extend(_modalFunctionality.default, {
    onShow: function onShow() {
      (0, _runloop.schedule)("afterRender", function () {
        var fromButton = document.getElementById("from-date-time");
        fromButton && fromButton.focus();
      });
    },
    onClose: function onClose() {
      (0, _runloop.schedule)("afterRender", function () {
        var localDatesBtn = document.querySelector(".d-editor-button-bar .local-dates.btn");
        localDatesBtn && localDatesBtn.focus();
      });
    }
  });

  _exports.default = _default;
});


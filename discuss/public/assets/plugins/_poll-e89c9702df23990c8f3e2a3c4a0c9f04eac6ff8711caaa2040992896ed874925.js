define("discourse/plugins/poll/components/poll-breakdown-chart", ["exports", "@ember/component", "I18n", "discourse/plugins/poll/controllers/poll-ui-builder", "discourse-common/utils/decorators", "discourse/plugins/poll/lib/chart-colors", "@ember/template", "@ember/object/computed"], function (_exports, _component, _I18n, _pollUiBuilder, _decorators, _chartColors, _template, _computed) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_dec = (0, _decorators.default)("optionColors", "index"), _dec2 = (0, _decorators.default)("data", "displayMode"), (_obj = {
    // Arguments:
    group: null,
    options: null,
    displayMode: null,
    highlightedOption: null,
    setHighlightedOption: null,
    classNames: "poll-breakdown-chart-container",
    _optionToSlice: null,
    _previousHighlightedSliceIndex: null,
    _previousDisplayMode: null,
    data: (0, _computed.mapBy)("options", "votes"),
    init: function init() {
      this._super.apply(this, arguments);

      this._optionToSlice = {};
    },
    didInsertElement: function didInsertElement() {
      this._super.apply(this, arguments);

      var canvas = this.element.querySelector("canvas");
      this._chart = new window.Chart(canvas.getContext("2d"), this.chartConfig);
    },
    didReceiveAttrs: function didReceiveAttrs() {
      this._super.apply(this, arguments);

      if (this._chart) {
        this._updateDisplayMode();

        this._updateHighlight();
      }
    },
    willDestroy: function willDestroy() {
      this._super.apply(this, arguments);

      if (this._chart) {
        this._chart.destroy();
      }
    },
    colorStyle: function colorStyle(optionColors, index) {
      return (0, _template.htmlSafe)("background: ".concat(optionColors[index], ";"));
    },
    chartConfig: function chartConfig(data, displayMode) {
      var _this = this;

      var transformedData = [];
      var counter = 0;
      this._optionToSlice = {};
      data.forEach(function (votes, index) {
        if (votes > 0) {
          transformedData.push(votes);
          _this._optionToSlice[index] = counter++;
        }
      });
      var totalVotes = transformedData.reduce(function (sum, votes) {
        return sum + votes;
      }, 0);
      var colors = (0, _chartColors.getColors)(data.length).filter(function (color, index) {
        return data[index] > 0;
      });
      return {
        type: _pollUiBuilder.PIE_CHART_TYPE,
        plugins: [window.ChartDataLabels],
        data: {
          datasets: [{
            data: transformedData,
            backgroundColor: colors,
            // TODO: It's a workaround for Chart.js' terrible hover styling.
            // It will break on non-white backgrounds.
            // Should be updated after #10341 lands
            hoverBorderColor: "#fff"
          }]
        },
        options: {
          plugins: {
            datalabels: {
              color: "#333",
              backgroundColor: "rgba(255, 255, 255, 0.5)",
              borderRadius: 2,
              font: {
                family: getComputedStyle(document.body).fontFamily,
                size: 16
              },
              padding: {
                top: 2,
                right: 6,
                bottom: 2,
                left: 6
              },
              formatter: function formatter(votes) {
                if (displayMode !== "percentage") {
                  return votes;
                }

                var percent = _I18n.default.toNumber(votes / totalVotes * 100.0, {
                  precision: 1
                });

                return "".concat(percent, "%");
              }
            }
          },
          responsive: true,
          aspectRatio: 1.1,
          animation: {
            duration: 0
          },
          tooltips: false,
          onHover: function onHover(event, activeElements) {
            if (!activeElements.length) {
              _this.setHighlightedOption(null);

              return;
            }

            var sliceIndex = activeElements[0]._index;
            var optionIndex = Object.keys(_this._optionToSlice).find(function (option) {
              return _this._optionToSlice[option] === sliceIndex;
            }); // Clear the array to avoid issues in Chart.js

            activeElements.length = 0;

            _this.setHighlightedOption(Number(optionIndex));
          }
        }
      };
    },
    _updateDisplayMode: function _updateDisplayMode() {
      if (this.displayMode !== this._previousDisplayMode) {
        var config = this.chartConfig;
        this._chart.data.datasets = config.data.datasets;
        this._chart.options = config.options;

        this._chart.update();

        this._previousDisplayMode = this.displayMode;
      }
    },
    _updateHighlight: function _updateHighlight() {
      var meta = this._chart.getDatasetMeta(0);

      if (this._previousHighlightedSliceIndex !== null) {
        var _slice = meta.data[this._previousHighlightedSliceIndex];
        meta.controller.removeHoverStyle(_slice);

        this._chart.draw();
      }

      if (this.highlightedOption === null) {
        this._previousHighlightedSliceIndex = null;
        return;
      }

      var sliceIndex = this._optionToSlice[this.highlightedOption];

      if (typeof sliceIndex === "undefined") {
        this._previousHighlightedSliceIndex = null;
        return;
      }

      var slice = meta.data[sliceIndex];
      this._previousHighlightedSliceIndex = sliceIndex;
      meta.controller.setHoverStyle(slice);

      this._chart.draw();
    }
  }, (_applyDecoratedDescriptor(_obj, "colorStyle", [_dec], Object.getOwnPropertyDescriptor(_obj, "colorStyle"), _obj), _applyDecoratedDescriptor(_obj, "chartConfig", [_dec2], Object.getOwnPropertyDescriptor(_obj, "chartConfig"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/poll/components/poll-breakdown-option", ["exports", "@ember/component", "I18n", "@ember/object", "discourse-common/utils/decorators", "@ember/object/computed", "discourse/plugins/poll/lib/chart-colors", "@ember/template", "discourse/lib/computed"], function (_exports, _component, _I18n, _object, _decorators, _computed, _chartColors, _template, _computed2) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _dec3, _dec4, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _component.default.extend((_dec = (0, _decorators.default)("option.votes", "totalVotes"), _dec2 = (0, _decorators.default)("optionsCount"), _dec3 = (0, _decorators.default)("highlighted"), _dec4 = (0, _decorators.default)("highlighted", "optionColors", "index"), (_obj = {
    // Arguments:
    option: null,
    index: null,
    totalVotes: null,
    optionsCount: null,
    displayMode: null,
    highlightedOption: null,
    onMouseOver: null,
    onMouseOut: null,
    tagName: "",
    highlighted: (0, _computed2.propertyEqual)("highlightedOption", "index"),
    showPercentage: (0, _computed.equal)("displayMode", "percentage"),
    percent: function percent(votes, total) {
      return _I18n.default.toNumber(votes / total * 100.0, {
        precision: 1
      });
    },
    optionColors: function optionColors(optionsCount) {
      return (0, _chartColors.getColors)(optionsCount);
    },
    colorBackgroundStyle: function colorBackgroundStyle(highlighted) {
      if (highlighted) {
        // TODO: Use CSS variables (#10341)
        return (0, _template.htmlSafe)("background: rgba(0, 0, 0, 0.1);");
      }
    },
    colorPreviewStyle: function colorPreviewStyle(highlighted, optionColors, index) {
      var color = highlighted ? window.Chart.helpers.getHoverColor(optionColors[index]) : optionColors[index];
      return (0, _template.htmlSafe)("background: ".concat(color, ";"));
    },
    onHover: function onHover(active) {
      if (active) {
        this.onMouseOver();
      } else {
        this.onMouseOut();
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "percent", [_dec], Object.getOwnPropertyDescriptor(_obj, "percent"), _obj), _applyDecoratedDescriptor(_obj, "optionColors", [_dec2], Object.getOwnPropertyDescriptor(_obj, "optionColors"), _obj), _applyDecoratedDescriptor(_obj, "colorBackgroundStyle", [_dec3], Object.getOwnPropertyDescriptor(_obj, "colorBackgroundStyle"), _obj), _applyDecoratedDescriptor(_obj, "colorPreviewStyle", [_dec4], Object.getOwnPropertyDescriptor(_obj, "colorPreviewStyle"), _obj), _applyDecoratedDescriptor(_obj, "onHover", [_object.action], Object.getOwnPropertyDescriptor(_obj, "onHover"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/poll/controllers/poll-breakdown", ["exports", "@ember/controller", "I18n", "discourse/mixins/modal-functionality", "@ember/object", "discourse/lib/ajax", "@ember/string", "discourse-common/utils/decorators", "@ember/template", "discourse/lib/load-script", "discourse/lib/ajax-error"], function (_exports, _controller, _I18n, _modalFunctionality, _object, _ajax, _string, _decorators, _template, _loadScript, _ajaxError) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _dec3, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = _controller.default.extend(_modalFunctionality.default, (_dec = (0, _decorators.default)("model.poll.title", "model.post.topic.title"), _dec2 = (0, _decorators.default)("model.groupableUserFields"), _dec3 = (0, _decorators.default)("model.poll.options"), (_obj = {
    model: null,
    charts: null,
    groupedBy: null,
    highlightedOption: null,
    displayMode: "percentage",
    title: function title(pollTitle, topicTitle) {
      return pollTitle ? (0, _template.htmlSafe)(pollTitle) : topicTitle;
    },
    groupableUserFields: function groupableUserFields(fields) {
      return fields.map(function (field) {
        var transformed = field.split("_").filter(Boolean);

        if (transformed.length > 1) {
          transformed[0] = (0, _string.classify)(transformed[0]);
        }

        return {
          id: field,
          label: transformed.join(" ")
        };
      });
    },
    totalVotes: function totalVotes(options) {
      return options.reduce(function (sum, option) {
        return sum + option.votes;
      }, 0);
    },
    onShow: function onShow() {
      var _this = this;

      this.set("charts", null);
      this.set("displayMode", "percentage");
      this.set("groupedBy", this.model.groupableUserFields[0]);
      (0, _loadScript.default)("/javascripts/Chart.min.js").then(function () {
        return (0, _loadScript.default)("/javascripts/chartjs-plugin-datalabels.min.js");
      }).then(function () {
        window.Chart.plugins.unregister(window.ChartDataLabels);

        _this.fetchGroupedPollData();
      });
    },
    fetchGroupedPollData: function fetchGroupedPollData() {
      var _this2 = this;

      return (0, _ajax.ajax)("/polls/grouped_poll_results.json", {
        data: {
          post_id: this.model.post.id,
          poll_name: this.model.poll.name,
          user_field_name: this.groupedBy
        }
      }).catch(function (error) {
        if (error) {
          (0, _ajaxError.popupAjaxError)(error);
        } else {
          bootbox.alert(_I18n.default.t("poll.error_while_fetching_voters"));
        }
      }).then(function (result) {
        if (_this2.isDestroying || _this2.isDestroyed) {
          return;
        }

        _this2.set("charts", result.grouped_results);
      });
    },
    setGrouping: function setGrouping(value) {
      this.set("groupedBy", value);
      this.fetchGroupedPollData();
    },
    onSelectPanel: function onSelectPanel(panel) {
      this.set("displayMode", panel.id);
    }
  }, (_applyDecoratedDescriptor(_obj, "title", [_dec], Object.getOwnPropertyDescriptor(_obj, "title"), _obj), _applyDecoratedDescriptor(_obj, "groupableUserFields", [_dec2], Object.getOwnPropertyDescriptor(_obj, "groupableUserFields"), _obj), _applyDecoratedDescriptor(_obj, "totalVotes", [_dec3], Object.getOwnPropertyDescriptor(_obj, "totalVotes"), _obj), _applyDecoratedDescriptor(_obj, "setGrouping", [_object.action], Object.getOwnPropertyDescriptor(_obj, "setGrouping"), _obj), _applyDecoratedDescriptor(_obj, "onSelectPanel", [_object.action], Object.getOwnPropertyDescriptor(_obj, "onSelectPanel"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/poll/controllers/poll-ui-builder", ["exports", "@ember/controller", "@ember/object", "@ember/object/computed", "@ember/runloop", "discourse-common/utils/decorators", "discourse/mixins/modal-functionality", "I18n"], function (_exports, _controller, _object, _computed, _runloop, _decorators, _modalFunctionality, _I18n) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _exports.MULTIPLE_POLL_TYPE = _exports.NUMBER_POLL_TYPE = _exports.REGULAR_POLL_TYPE = _exports.PIE_CHART_TYPE = _exports.BAR_CHART_TYPE = void 0;

  var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _dec10, _dec11, _dec12, _obj;

  function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

  function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var BAR_CHART_TYPE = "bar";
  _exports.BAR_CHART_TYPE = BAR_CHART_TYPE;
  var PIE_CHART_TYPE = "pie";
  _exports.PIE_CHART_TYPE = PIE_CHART_TYPE;
  var REGULAR_POLL_TYPE = "regular";
  _exports.REGULAR_POLL_TYPE = REGULAR_POLL_TYPE;
  var NUMBER_POLL_TYPE = "number";
  _exports.NUMBER_POLL_TYPE = NUMBER_POLL_TYPE;
  var MULTIPLE_POLL_TYPE = "multiple";
  _exports.MULTIPLE_POLL_TYPE = MULTIPLE_POLL_TYPE;
  var ALWAYS_POLL_RESULT = "always";
  var VOTE_POLL_RESULT = "on_vote";
  var CLOSED_POLL_RESULT = "on_close";
  var STAFF_POLL_RESULT = "staff_only";

  var _default = _controller.default.extend(_modalFunctionality.default, (_dec = (0, _decorators.default)("pollType"), _dec2 = (0, _decorators.default)("pollType"), _dec3 = (0, _decorators.default)("pollType"), _dec4 = (0, _decorators.default)("pollOptions.@each.value"), _dec5 = (0, _decorators.default)("site.groups"), _dec6 = (0, _decorators.default)("chartType", "pollType"), _dec7 = (0, _decorators.observes)("pollType", "pollOptionsCount"), _dec8 = (0, _decorators.default)("pollType", "pollResult", "publicPoll", "pollTitle", "pollOptions.@each.value", "pollMin", "pollMax", "pollStep", "pollGroups", "pollAutoClose", "chartType"), _dec9 = (0, _decorators.default)("isNumber", "pollOptionsCount"), _dec10 = (0, _decorators.default)("pollOptions.@each.value"), _dec11 = (0, _decorators.default)("isMultiple", "pollOptionsCount", "isNumber", "pollMin", "pollMax", "pollStep"), _dec12 = (0, _decorators.default)("minMaxValueValidation", "minNumOfOptionsValidation"), (_obj = {
    showAdvanced: false,
    pollType: REGULAR_POLL_TYPE,
    pollTitle: "",
    pollOptions: null,
    pollOptionsText: null,
    pollMin: 1,
    pollMax: 2,
    pollStep: 1,
    pollGroups: null,
    pollAutoClose: null,
    pollResult: ALWAYS_POLL_RESULT,
    chartType: BAR_CHART_TYPE,
    publicPoll: null,
    onShow: function onShow() {
      this.setProperties({
        showAdvanced: false,
        pollType: REGULAR_POLL_TYPE,
        pollTitle: null,
        pollOptions: [_object.default.create({
          value: ""
        })],
        pollOptionsText: "",
        pollMin: 1,
        pollMax: 2,
        pollStep: 1,
        pollGroups: null,
        pollAutoClose: null,
        pollResult: ALWAYS_POLL_RESULT,
        chartType: BAR_CHART_TYPE,
        publicPoll: false
      });
    },
    pollResults: function pollResults() {
      var options = [{
        name: _I18n.default.t("poll.ui_builder.poll_result.always"),
        value: ALWAYS_POLL_RESULT
      }, {
        name: _I18n.default.t("poll.ui_builder.poll_result.vote"),
        value: VOTE_POLL_RESULT
      }, {
        name: _I18n.default.t("poll.ui_builder.poll_result.closed"),
        value: CLOSED_POLL_RESULT
      }];

      if (this.get("currentUser.staff")) {
        options.push({
          name: _I18n.default.t("poll.ui_builder.poll_result.staff"),
          value: STAFF_POLL_RESULT
        });
      }

      return options;
    },
    isRegular: function isRegular(pollType) {
      return pollType === REGULAR_POLL_TYPE;
    },
    isNumber: function isNumber(pollType) {
      return pollType === NUMBER_POLL_TYPE;
    },
    isMultiple: function isMultiple(pollType) {
      return pollType === MULTIPLE_POLL_TYPE;
    },
    showNumber: (0, _computed.or)("showAdvanced", "isNumber"),
    pollOptionsCount: function pollOptionsCount(pollOptions) {
      return pollOptions.filter(function (option) {
        return option.value.length > 0;
      }).length;
    },
    siteGroups: function siteGroups(groups) {
      // prevents group "everyone" to be listed
      return groups.filter(function (g) {
        return g.id !== 0;
      });
    },
    isPie: function isPie(chartType, pollType) {
      return pollType !== NUMBER_POLL_TYPE && chartType === PIE_CHART_TYPE;
    },
    canRemoveOption: (0, _computed.gt)("pollOptions.length", 1),
    _setPollMinMax: function _setPollMinMax() {
      if (this.isMultiple) {
        if (this.pollMin <= 0 || this.pollMin >= this.pollMax || this.pollMin >= this.pollOptionsCount) {
          this.set("pollMin", this.pollOptionsCount > 0 ? 1 : 0);
        }

        if (this.pollMax <= 0 || this.pollMin >= this.pollMax || this.pollMax > this.pollOptionsCount) {
          this.set("pollMax", this.pollOptionsCount);
        }
      } else if (this.isNumber) {
        this.set("pollMax", this.siteSettings.poll_maximum_options);
      }
    },
    pollOutput: function pollOutput(pollType, pollResult, publicPoll, pollTitle, pollOptions, pollMin, pollMax, pollStep, pollGroups, pollAutoClose, chartType) {
      var pollHeader = "[poll";
      var output = "";
      var match = this.toolbarEvent.getText().match(/\[poll(\s+name=[^\s\]]+)*.*\]/gim);

      if (match) {
        pollHeader += " name=poll".concat(match.length + 1);
      }

      var step = pollStep;

      if (step < 1) {
        step = 1;
      }

      if (pollType) {
        pollHeader += " type=".concat(pollType);
      }

      if (pollResult) {
        pollHeader += " results=".concat(pollResult);
      }

      if (pollMin && pollType !== REGULAR_POLL_TYPE) {
        pollHeader += " min=".concat(pollMin);
      }

      if (pollMax && pollType !== REGULAR_POLL_TYPE) {
        pollHeader += " max=".concat(pollMax);
      }

      if (pollType === NUMBER_POLL_TYPE) {
        pollHeader += " step=".concat(step);
      }

      if (publicPoll) {
        pollHeader += " public=true";
      }

      if (chartType && pollType !== NUMBER_POLL_TYPE) {
        pollHeader += " chartType=".concat(chartType);
      }

      if (pollGroups && pollGroups.length > 0) {
        pollHeader += " groups=".concat(pollGroups);
      }

      if (pollAutoClose) {
        pollHeader += " close=".concat(pollAutoClose.toISOString());
      }

      pollHeader += "]";
      output += "".concat(pollHeader, "\n");

      if (pollTitle) {
        output += "# ".concat(pollTitle.trim(), "\n");
      }

      if (pollOptions.length > 0 && pollType !== NUMBER_POLL_TYPE) {
        pollOptions.forEach(function (option) {
          if (option.value.length > 0) {
            output += "* ".concat(option.value.trim(), "\n");
          }
        });
      }

      output += "[/poll]\n";
      return output;
    },
    minNumOfOptionsValidation: function minNumOfOptionsValidation(isNumber, pollOptionsCount) {
      var options = {
        ok: true
      };

      if (!isNumber) {
        if (pollOptionsCount < 1) {
          return _object.default.create({
            failed: true,
            reason: _I18n.default.t("poll.ui_builder.help.options_min_count")
          });
        }

        if (pollOptionsCount > this.siteSettings.poll_maximum_options) {
          return _object.default.create({
            failed: true,
            reason: _I18n.default.t("poll.ui_builder.help.options_max_count", {
              count: this.siteSettings.poll_maximum_options
            })
          });
        }
      }

      return _object.default.create(options);
    },
    showMinNumOfOptionsValidation: function showMinNumOfOptionsValidation(pollOptions) {
      return pollOptions.length !== 1 || pollOptions[0].value !== "";
    },
    minMaxValueValidation: function minMaxValueValidation(isMultiple, pollOptionsCount, isNumber, pollMin, pollMax, pollStep) {
      pollMin = parseInt(pollMin, 10) || 0;
      pollMax = parseInt(pollMax, 10) || 0;
      pollStep = parseInt(pollStep, 10) || 0;

      if (pollMin < 0) {
        return _object.default.create({
          failed: true,
          reason: _I18n.default.t("poll.ui_builder.help.invalid_min_value")
        });
      }

      if (pollMax < 0 || isMultiple && pollMax > pollOptionsCount) {
        return _object.default.create({
          failed: true,
          reason: _I18n.default.t("poll.ui_builder.help.invalid_max_value")
        });
      }

      if (pollMin > pollMax) {
        return _object.default.create({
          failed: true,
          reason: _I18n.default.t("poll.ui_builder.help.invalid_values")
        });
      }

      if (isNumber) {
        if (pollStep < 1) {
          return _object.default.create({
            failed: true,
            reason: _I18n.default.t("poll.ui_builder.help.min_step_value")
          });
        }

        var optionsCount = (pollMax - pollMin + 1) / pollStep;

        if (optionsCount < 1) {
          return _object.default.create({
            failed: true,
            reason: _I18n.default.t("poll.ui_builder.help.options_min_count")
          });
        }

        if (optionsCount > this.siteSettings.poll_maximum_options) {
          return _object.default.create({
            failed: true,
            reason: _I18n.default.t("poll.ui_builder.help.options_max_count", {
              count: this.siteSettings.poll_maximum_options
            })
          });
        }
      }

      return _object.default.create({
        ok: true
      });
    },
    disableInsert: function disableInsert(minMaxValueValidation, minNumOfOptionsValidation) {
      return !minMaxValueValidation.ok || !minNumOfOptionsValidation.ok;
    },
    _comboboxOptions: function _comboboxOptions(startIndex, endIndex) {
      return _toConsumableArray(Array(endIndex - startIndex).keys()).map(function (number) {
        return {
          value: number + startIndex,
          name: number + startIndex
        };
      });
    },
    onOptionsTextChange: function onOptionsTextChange(e) {
      var idx = 0;
      this.set("pollOptions", e.target.value.split("\n").map(function (value) {
        return _object.default.create({
          idx: idx++,
          value: value
        });
      }));
    },
    insertPoll: function insertPoll() {
      this.toolbarEvent.addText(this.pollOutput);
      this.send("closeModal");
    },
    toggleAdvanced: function toggleAdvanced() {
      this.toggleProperty("showAdvanced");

      if (this.showAdvanced) {
        this.set("pollOptionsText", this.pollOptions.map(function (x) {
          return x.value;
        }).join("\n"));
      }
    },
    addOption: function addOption(beforeOption, value, e) {
      if (value !== "") {
        var idx = this.pollOptions.indexOf(beforeOption) + 1;

        var option = _object.default.create({
          value: ""
        });

        this.pollOptions.insertAt(idx, option);
        var lastOptionIdx = 0;
        this.pollOptions.forEach(function (o) {
          return o.set("idx", lastOptionIdx++);
        });
        (0, _runloop.next)(function () {
          var pollOptions = document.getElementsByClassName("poll-options");

          if (pollOptions) {
            var inputs = pollOptions[0].getElementsByTagName("input");

            if (option.idx < inputs.length) {
              inputs[option.idx].focus();
            }
          }
        });
      }

      if (e) {
        e.preventDefault();
      }
    },
    removeOption: function removeOption(option) {
      this.pollOptions.removeObject(option);
    }
  }, (_applyDecoratedDescriptor(_obj, "pollResults", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "pollResults"), _obj), _applyDecoratedDescriptor(_obj, "isRegular", [_dec], Object.getOwnPropertyDescriptor(_obj, "isRegular"), _obj), _applyDecoratedDescriptor(_obj, "isNumber", [_dec2], Object.getOwnPropertyDescriptor(_obj, "isNumber"), _obj), _applyDecoratedDescriptor(_obj, "isMultiple", [_dec3], Object.getOwnPropertyDescriptor(_obj, "isMultiple"), _obj), _applyDecoratedDescriptor(_obj, "pollOptionsCount", [_dec4], Object.getOwnPropertyDescriptor(_obj, "pollOptionsCount"), _obj), _applyDecoratedDescriptor(_obj, "siteGroups", [_dec5], Object.getOwnPropertyDescriptor(_obj, "siteGroups"), _obj), _applyDecoratedDescriptor(_obj, "isPie", [_dec6], Object.getOwnPropertyDescriptor(_obj, "isPie"), _obj), _applyDecoratedDescriptor(_obj, "_setPollMinMax", [_dec7], Object.getOwnPropertyDescriptor(_obj, "_setPollMinMax"), _obj), _applyDecoratedDescriptor(_obj, "pollOutput", [_dec8], Object.getOwnPropertyDescriptor(_obj, "pollOutput"), _obj), _applyDecoratedDescriptor(_obj, "minNumOfOptionsValidation", [_dec9], Object.getOwnPropertyDescriptor(_obj, "minNumOfOptionsValidation"), _obj), _applyDecoratedDescriptor(_obj, "showMinNumOfOptionsValidation", [_dec10], Object.getOwnPropertyDescriptor(_obj, "showMinNumOfOptionsValidation"), _obj), _applyDecoratedDescriptor(_obj, "minMaxValueValidation", [_dec11], Object.getOwnPropertyDescriptor(_obj, "minMaxValueValidation"), _obj), _applyDecoratedDescriptor(_obj, "disableInsert", [_dec12], Object.getOwnPropertyDescriptor(_obj, "disableInsert"), _obj), _applyDecoratedDescriptor(_obj, "onOptionsTextChange", [_object.action], Object.getOwnPropertyDescriptor(_obj, "onOptionsTextChange"), _obj), _applyDecoratedDescriptor(_obj, "insertPoll", [_object.action], Object.getOwnPropertyDescriptor(_obj, "insertPoll"), _obj), _applyDecoratedDescriptor(_obj, "toggleAdvanced", [_object.action], Object.getOwnPropertyDescriptor(_obj, "toggleAdvanced"), _obj), _applyDecoratedDescriptor(_obj, "addOption", [_object.action], Object.getOwnPropertyDescriptor(_obj, "addOption"), _obj), _applyDecoratedDescriptor(_obj, "removeOption", [_object.action], Object.getOwnPropertyDescriptor(_obj, "removeOption"), _obj)), _obj)));

  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/components/poll-breakdown-chart"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"@group\"],\"statements\":[[7,\"label\",true],[10,\"class\",\"poll-breakdown-chart-label\"],[8],[1,[23,1,[]],false],[9],[0,\"\\n\"],[7,\"canvas\",true],[10,\"class\",\"poll-breakdown-chart-chart\"],[8],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/poll-breakdown-chart"}});
Ember.TEMPLATES["javascripts/components/poll-breakdown-option"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"@option\",\"@onMouseOver\",\"@onMouseOut\"],\"statements\":[[7,\"li\",false],[12,\"class\",\"poll-breakdown-option\"],[12,\"style\",[23,0,[\"colorBackgroundStyle\"]]],[12,\"role\",\"button\"],[3,\"on\",[\"mouseover\",[23,2,[]]]],[3,\"on\",[\"mouseout\",[23,3,[]]]],[8],[0,\"\\n  \"],[7,\"span\",true],[10,\"class\",\"poll-breakdown-option-color\"],[11,\"style\",[23,0,[\"colorPreviewStyle\"]]],[8],[9],[0,\"\\n\\n  \"],[7,\"span\",true],[10,\"class\",\"poll-breakdown-option-count\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"showPercentage\"]]],null,{\"statements\":[[0,\"      \"],[1,[23,0,[\"percent\"]],false],[0,\"%\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"      \"],[1,[23,1,[\"votes\"]],false],[0,\"\\n\"]],\"parameters\":[]}],[0,\"  \"],[9],[0,\"\\n  \"],[7,\"span\",true],[10,\"class\",\"poll-breakdown-option-text\"],[8],[1,[28,\"html-safe\",[[23,1,[\"html\"]]],null],false],[9],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/poll-breakdown-option"}});
Ember.TEMPLATES["javascripts/modal/poll-breakdown"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"chart\",\"option\",\"index\"],\"statements\":[[4,\"d-modal-body\",null,[[\"title\"],[\"poll.breakdown.title\"]],{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"poll-breakdown-sidebar\"],[8],[0,\"\\n    \"],[7,\"p\",true],[10,\"class\",\"poll-breakdown-title\"],[8],[0,\"\\n      \"],[1,[23,0,[\"title\"]],false],[0,\"\\n    \"],[9],[0,\"\\n\\n    \"],[7,\"div\",true],[10,\"class\",\"poll-breakdown-total-votes\"],[8],[1,[28,\"i18n\",[\"poll.breakdown.votes\"],[[\"count\"],[[23,0,[\"model\",\"poll\",\"voters\"]]]]],false],[9],[0,\"\\n\\n    \"],[7,\"ul\",true],[10,\"class\",\"poll-breakdown-options\"],[8],[0,\"\\n\"],[4,\"each\",[[23,0,[\"model\",\"poll\",\"options\"]]],null,{\"statements\":[[0,\"        \"],[1,[28,\"poll-breakdown-option\",null,[[\"option\",\"index\",\"totalVotes\",\"optionsCount\",\"displayMode\",\"highlightedOption\",\"onMouseOver\",\"onMouseOut\"],[[23,2,[]],[23,3,[]],[23,0,[\"totalVotes\"]],[23,0,[\"model\",\"poll\",\"options\",\"length\"]],[23,0,[\"displayMode\"]],[23,0,[\"highlightedOption\"]],[28,\"fn\",[[28,\"mut\",[[23,0,[\"highlightedOption\"]]],null],[23,3,[]]],null],[28,\"fn\",[[28,\"mut\",[[23,0,[\"highlightedOption\"]]],null],null],null]]]],false],[0,\"\\n\"]],\"parameters\":[2,3]},null],[0,\"    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\\n  \"],[7,\"div\",true],[10,\"class\",\"poll-breakdown-body\"],[8],[0,\"\\n    \"],[7,\"div\",true],[10,\"class\",\"poll-breakdown-body-header\"],[8],[0,\"\\n      \"],[7,\"label\",true],[10,\"class\",\"poll-breakdown-body-header-label\"],[8],[1,[28,\"i18n\",[\"poll.breakdown.breakdown\"],null],false],[9],[0,\"\\n\\n      \"],[1,[28,\"combo-box\",null,[[\"content\",\"value\",\"nameProperty\",\"class\",\"onChange\"],[[23,0,[\"groupableUserFields\"]],[23,0,[\"groupedBy\"]],\"label\",\"poll-breakdown-dropdown\",[28,\"action\",[[23,0,[]],[23,0,[\"setGrouping\"]]],null]]]],false],[0,\"\\n    \"],[9],[0,\"\\n\\n    \"],[7,\"div\",true],[10,\"class\",\"poll-breakdown-charts\"],[8],[0,\"\\n\"],[4,\"each\",[[23,0,[\"charts\"]]],null,{\"statements\":[[0,\"        \"],[1,[28,\"poll-breakdown-chart\",null,[[\"group\",\"options\",\"displayMode\",\"highlightedOption\",\"setHighlightedOption\"],[[28,\"get\",[[23,1,[]],\"group\"],null],[28,\"get\",[[23,1,[]],\"options\"],null],[23,0,[\"displayMode\"]],[23,0,[\"highlightedOption\"]],[28,\"fn\",[[28,\"mut\",[[23,0,[\"highlightedOption\"]]],null]],null]]]],false],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/modal/poll-breakdown"}});
Ember.TEMPLATES["javascripts/modal/poll-ui-builder"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"option\"],\"statements\":[[4,\"d-modal-body\",null,[[\"title\",\"class\"],[\"poll.ui_builder.title\",\"poll-ui-builder\"]],{\"statements\":[[0,\"  \"],[7,\"div\",true],[10,\"class\",\"input-group poll-type\"],[8],[0,\"\\n    \"],[7,\"a\",false],[12,\"href\",\"\"],[12,\"class\",[29,[\"poll-type-value \",[28,\"if\",[[24,[\"isRegular\"]],\"active\"],null]]]],[3,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"pollType\"]]],null],\"regular\"]],[8],[0,\"\\n      \"],[1,[28,\"i18n\",[\"poll.ui_builder.poll_type.regular\"],null],false],[0,\"\\n    \"],[9],[0,\"\\n\\n    \"],[7,\"a\",false],[12,\"href\",\"\"],[12,\"class\",[29,[\"poll-type-value \",[28,\"if\",[[24,[\"isMultiple\"]],\"active\"],null]]]],[3,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"pollType\"]]],null],\"multiple\"]],[8],[0,\"\\n      \"],[1,[28,\"i18n\",[\"poll.ui_builder.poll_type.multiple\"],null],false],[0,\"\\n    \"],[9],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"showNumber\"]]],null,{\"statements\":[[0,\"      \"],[7,\"a\",false],[12,\"href\",\"\"],[12,\"class\",[29,[\"poll-type-value \",[28,\"if\",[[24,[\"isNumber\"]],\"active\"],null]]]],[3,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"pollType\"]]],null],\"number\"]],[8],[0,\"\\n        \"],[1,[28,\"i18n\",[\"poll.ui_builder.poll_type.number\"],null],false],[0,\"\\n      \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"  \"],[9],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"showAdvanced\"]]],null,{\"statements\":[[0,\"    \"],[7,\"div\",true],[10,\"class\",\"input-group poll-title\"],[8],[0,\"\\n      \"],[7,\"label\",true],[10,\"class\",\"input-group-label\"],[8],[1,[28,\"i18n\",[\"poll.ui_builder.poll_title.label\"],null],false],[9],[0,\"\\n      \"],[1,[28,\"input\",null,[[\"value\"],[[24,[\"pollTitle\"]]]]],false],[0,\"\\n    \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"unless\",[[24,[\"isNumber\"]]],null,{\"statements\":[[0,\"    \"],[7,\"div\",true],[10,\"class\",\"poll-options\"],[8],[0,\"\\n\"],[4,\"if\",[[24,[\"showAdvanced\"]]],null,{\"statements\":[[0,\"        \"],[7,\"label\",true],[10,\"class\",\"input-group-label\"],[8],[1,[28,\"i18n\",[\"poll.ui_builder.poll_options.label\"],null],false],[9],[0,\"\\n        \"],[1,[28,\"textarea\",null,[[\"value\",\"input\"],[[24,[\"pollOptionsText\"]],[28,\"action\",[[23,0,[]],\"onOptionsTextChange\"],null]]]],false],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"showMinNumOfOptionsValidation\"]]],null,{\"statements\":[[4,\"unless\",[[24,[\"minNumOfOptionsValidation\",\"ok\"]]],null,{\"statements\":[[0,\"            \"],[1,[28,\"input-tip\",null,[[\"validation\"],[[24,[\"minNumOfOptionsValidation\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null]],\"parameters\":[]},{\"statements\":[[4,\"each\",[[24,[\"pollOptions\"]]],null,{\"statements\":[[0,\"          \"],[7,\"div\",true],[10,\"class\",\"input-group poll-option-value\"],[8],[0,\"\\n            \"],[1,[28,\"input\",null,[[\"value\",\"enter\"],[[23,1,[\"value\"]],[28,\"action\",[[23,0,[]],\"addOption\",[23,1,[]]],null]]]],false],[0,\"\\n\"],[4,\"if\",[[24,[\"canRemoveOption\"]]],null,{\"statements\":[[0,\"              \"],[1,[28,\"d-button\",null,[[\"icon\",\"action\"],[\"trash-alt\",[28,\"action\",[[23,0,[]],\"removeOption\",[23,1,[]]],null]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"          \"],[9],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"\\n        \"],[7,\"div\",true],[10,\"class\",\"poll-option-controls\"],[8],[0,\"\\n          \"],[1,[28,\"d-button\",null,[[\"class\",\"icon\",\"label\",\"action\"],[\"btn-default\",\"plus\",\"poll.ui_builder.poll_options.add\",[28,\"action\",[[23,0,[]],\"addOption\",[24,[\"pollOptions\",\"lastObject\"]]],null]]]],false],[0,\"\\n\"],[4,\"if\",[[28,\"and\",[[24,[\"showMinNumOfOptionsValidation\"]],[28,\"not\",[[24,[\"minNumOfOptionsValidation\",\"ok\"]]],null]],null]],null,{\"statements\":[[0,\"            \"],[1,[28,\"input-tip\",null,[[\"validation\"],[[24,[\"minNumOfOptionsValidation\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"        \"],[9],[0,\"\\n\"]],\"parameters\":[]}],[0,\"    \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"unless\",[[24,[\"isRegular\"]]],null,{\"statements\":[[0,\"    \"],[7,\"div\",true],[10,\"class\",\"options\"],[8],[0,\"\\n      \"],[7,\"div\",true],[10,\"class\",\"input-group poll-number\"],[8],[0,\"\\n        \"],[7,\"label\",true],[10,\"class\",\"input-group-label\"],[8],[1,[28,\"i18n\",[\"poll.ui_builder.poll_config.min\"],null],false],[9],[0,\"\\n        \"],[1,[28,\"input\",null,[[\"type\",\"value\",\"valueProperty\",\"class\",\"min\"],[\"number\",[24,[\"pollMin\"]],\"value\",\"poll-options-min\",1]]],false],[0,\"\\n      \"],[9],[0,\"\\n\\n      \"],[7,\"div\",true],[10,\"class\",\"input-group poll-number\"],[8],[0,\"\\n        \"],[7,\"label\",true],[10,\"class\",\"input-group-label\"],[8],[1,[28,\"i18n\",[\"poll.ui_builder.poll_config.max\"],null],false],[9],[0,\"\\n        \"],[1,[28,\"input\",null,[[\"type\",\"value\",\"valueProperty\",\"class\",\"min\"],[\"number\",[24,[\"pollMax\"]],\"value\",\"poll-options-max\",1]]],false],[0,\"\\n      \"],[9],[0,\"\\n\\n\"],[4,\"if\",[[24,[\"isNumber\"]]],null,{\"statements\":[[0,\"        \"],[7,\"div\",true],[10,\"class\",\"input-group poll-number\"],[8],[0,\"\\n          \"],[7,\"label\",true],[10,\"class\",\"input-group-label\"],[8],[1,[28,\"i18n\",[\"poll.ui_builder.poll_config.step\"],null],false],[9],[0,\"\\n          \"],[1,[28,\"input\",null,[[\"type\",\"value\",\"valueProperty\",\"min\",\"class\"],[\"number\",[24,[\"pollStep\"]],\"value\",\"1\",\"poll-options-step\"]]],false],[0,\"\\n        \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[9],[0,\"\\n\\n\"],[4,\"unless\",[[24,[\"minMaxValueValidation\",\"ok\"]]],null,{\"statements\":[[0,\"      \"],[1,[28,\"input-tip\",null,[[\"validation\"],[[24,[\"minMaxValueValidation\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"if\",[[24,[\"showAdvanced\"]]],null,{\"statements\":[[0,\"    \"],[7,\"div\",true],[10,\"class\",\"input-group poll-allowed-groups\"],[8],[0,\"\\n      \"],[7,\"label\",true],[10,\"class\",\"input-group-label\"],[8],[1,[28,\"i18n\",[\"poll.ui_builder.poll_groups.label\"],null],false],[9],[0,\"\\n      \"],[1,[28,\"group-chooser\",null,[[\"content\",\"value\",\"onChange\",\"labelProperty\",\"valueProperty\"],[[24,[\"siteGroups\"]],[24,[\"pollGroups\"]],[28,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"pollGroups\"]]],null]],null],\"name\",\"name\"]]],false],[0,\"\\n    \"],[9],[0,\"\\n\\n    \"],[7,\"div\",true],[10,\"class\",\"input-group poll-date\"],[8],[0,\"\\n      \"],[7,\"label\",true],[10,\"class\",\"input-group-label\"],[8],[1,[28,\"i18n\",[\"poll.ui_builder.automatic_close.label\"],null],false],[9],[0,\"\\n      \"],[1,[28,\"date-time-input\",null,[[\"date\",\"onChange\",\"clearable\",\"useGlobalPickerContainer\"],[[24,[\"pollAutoClose\"]],[28,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"pollAutoClose\"]]],null]],null],true,true]]],false],[0,\"\\n    \"],[9],[0,\"\\n\\n    \"],[7,\"div\",true],[10,\"class\",\"input-group poll-select\"],[8],[0,\"\\n      \"],[7,\"label\",true],[10,\"class\",\"input-group-label\"],[8],[1,[28,\"i18n\",[\"poll.ui_builder.poll_result.label\"],null],false],[9],[0,\"\\n      \"],[1,[28,\"combo-box\",null,[[\"content\",\"value\",\"class\",\"valueProperty\",\"onChange\"],[[24,[\"pollResults\"]],[24,[\"pollResult\"]],\"poll-result\",\"value\",[28,\"action\",[[23,0,[]],[28,\"mut\",[[24,[\"pollResult\"]]],null]],null]]]],false],[0,\"\\n    \"],[9],[0,\"\\n\\n\"],[4,\"unless\",[[24,[\"isNumber\"]]],null,{\"statements\":[[0,\"      \"],[7,\"div\",true],[10,\"class\",\"input-group poll-select column\"],[8],[0,\"\\n        \"],[7,\"label\",true],[10,\"class\",\"input-group-label\"],[8],[1,[28,\"i18n\",[\"poll.ui_builder.poll_chart_type.label\"],null],false],[9],[0,\"\\n\\n        \"],[7,\"div\",true],[10,\"class\",\"radio-group\"],[8],[0,\"\\n          \"],[1,[28,\"radio-button\",null,[[\"id\",\"name\",\"value\",\"selection\"],[\"poll-chart-type-bar\",\"poll-chart-type\",\"bar\",[24,[\"chartType\"]]]]],false],[0,\"\\n          \"],[7,\"label\",true],[10,\"for\",\"poll-chart-type-bar\"],[8],[1,[28,\"d-icon\",[\"chart-bar\"],null],false],[0,\" \"],[1,[28,\"i18n\",[\"poll.ui_builder.poll_chart_type.bar\"],null],false],[9],[0,\"\\n        \"],[9],[0,\"\\n\\n        \"],[7,\"div\",true],[10,\"class\",\"radio-group\"],[8],[0,\"\\n          \"],[1,[28,\"radio-button\",null,[[\"id\",\"name\",\"value\",\"selection\"],[\"poll-chart-type-pie\",\"poll-chart-type\",\"pie\",[24,[\"chartType\"]]]]],false],[0,\"\\n          \"],[7,\"label\",true],[10,\"for\",\"poll-chart-type-pie\"],[8],[1,[28,\"d-icon\",[\"chart-pie\"],null],false],[0,\" \"],[1,[28,\"i18n\",[\"poll.ui_builder.poll_chart_type.pie\"],null],false],[9],[0,\"\\n        \"],[9],[0,\"\\n      \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"\\n\"],[4,\"unless\",[[24,[\"isPie\"]]],null,{\"statements\":[[0,\"      \"],[7,\"div\",true],[10,\"class\",\"input-group poll-checkbox column\"],[8],[0,\"\\n        \"],[7,\"label\",true],[8],[0,\"\\n          \"],[1,[28,\"input\",null,[[\"type\",\"checked\"],[\"checkbox\",[24,[\"publicPoll\"]]]]],false],[0,\"\\n          \"],[1,[28,\"i18n\",[\"poll.ui_builder.poll_public.label\"],null],false],[0,\"\\n        \"],[9],[0,\"\\n      \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null]],\"parameters\":[]},null],[0,\"\\n\"],[7,\"div\",true],[10,\"class\",\"modal-footer\"],[8],[0,\"\\n  \"],[1,[28,\"d-button\",null,[[\"action\",\"icon\",\"class\",\"label\",\"disabled\"],[[28,\"action\",[[23,0,[]],\"insertPoll\"],null],\"chart-bar\",\"btn-primary\",\"poll.ui_builder.insert\",[24,[\"disableInsert\"]]]]],false],[0,\"\\n\\n  \"],[1,[28,\"d-button\",null,[[\"label\",\"class\",\"action\"],[\"cancel\",\"btn-flat\",[28,\"route-action\",[\"closeModal\"],null]]]],false],[0,\"\\n\\n  \"],[1,[28,\"d-button\",null,[[\"action\",\"class\",\"icon\",\"title\"],[[28,\"action\",[[23,0,[]],\"toggleAdvanced\"],null],\"btn-default show-advanced\",\"cog\",[28,\"if\",[[24,[\"showAdvanced\"]],\"poll.ui_builder.hide_advanced\",\"poll.ui_builder.show_advanced\"],null]]]],false],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/modal/poll-ui-builder"}});
define("discourse/plugins/poll/initializers/add-poll-ui-builder", ["exports", "discourse-common/utils/decorators", "discourse/lib/show-modal", "discourse/lib/plugin-api"], function (_exports, _decorators, _showModal, _pluginApi) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function initializePollUIBuilder(api) {
    var _dec, _obj;

    api.modifyClass("controller:composer", (_dec = (0, _decorators.default)("siteSettings.poll_enabled", "siteSettings.poll_minimum_trust_level_to_create", "model.topic.pm_with_non_human_user"), (_obj = {
      canBuildPoll: function canBuildPoll(pollEnabled, minimumTrustLevel, pmWithNonHumanUser) {
        return pollEnabled && (pmWithNonHumanUser || this.currentUser && (this.currentUser.staff || this.currentUser.trust_level >= minimumTrustLevel));
      },
      actions: {
        showPollBuilder: function showPollBuilder() {
          (0, _showModal.default)("poll-ui-builder").set("toolbarEvent", this.toolbarEvent);
        }
      }
    }, (_applyDecoratedDescriptor(_obj, "canBuildPoll", [_dec], Object.getOwnPropertyDescriptor(_obj, "canBuildPoll"), _obj)), _obj)));
    api.addToolbarPopupMenuOptionsCallback(function () {
      return {
        action: "showPollBuilder",
        icon: "chart-bar",
        label: "poll.ui_builder.title",
        condition: "canBuildPoll"
      };
    });
  }

  var _default = {
    name: "add-poll-ui-builder",
    initialize: function initialize() {
      (0, _pluginApi.withPluginApi)("0.8.7", initializePollUIBuilder);
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/poll/initializers/extend-for-poll", ["exports", "@ember/object", "discourse/widgets/glue", "discourse-common/lib/get-owner", "discourse-common/utils/decorators", "discourse/lib/plugin-api"], function (_exports, _object, _glue, _getOwner, _decorators, _pluginApi) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function initializePolls(api) {
    var _dec, _obj;

    var register = (0, _getOwner.getRegister)(api);
    api.modifyClass("controller:topic", {
      subscribe: function subscribe() {
        var _this = this;

        this._super.apply(this, arguments);

        this.messageBus.subscribe("/polls/" + this.get("model.id"), function (msg) {
          var post = _this.get("model.postStream").findLoadedPost(msg.post_id);

          if (post) {
            post.set("polls", msg.polls);
          }
        });
      },
      unsubscribe: function unsubscribe() {
        this.messageBus.unsubscribe("/polls/*");

        this._super.apply(this, arguments);
      }
    });
    var _glued = [];
    var _interval = null;

    function rerender() {
      _glued.forEach(function (g) {
        return g.queueRerender();
      });
    }

    api.modifyClass("model:post", (_dec = (0, _decorators.observes)("polls"), (_obj = {
      _polls: null,
      pollsObject: null,
      pollsChanged: function pollsChanged() {
        var _this2 = this;

        var polls = this.polls;

        if (polls) {
          this._polls = this._polls || {};
          polls.forEach(function (p) {
            var existing = _this2._polls[p.name];

            if (existing) {
              _this2._polls[p.name].setProperties(p);
            } else {
              _this2._polls[p.name] = _object.default.create(p);
            }
          });
          this.set("pollsObject", this._polls);
          rerender();
        }
      }
    }, (_applyDecoratedDescriptor(_obj, "pollsChanged", [_dec], Object.getOwnPropertyDescriptor(_obj, "pollsChanged"), _obj)), _obj)));

    function attachPolls($elem, helper) {
      var $polls = $(".poll", $elem);

      if (!$polls.length || !helper) {
        return;
      }

      var post = helper.getModel();
      api.preventCloak(post.id);
      post.pollsChanged();
      var polls = post.pollsObject || {};
      var votes = post.polls_votes || {};
      _interval = _interval || setInterval(rerender, 30000);
      $polls.each(function (idx, pollElem) {
        var $poll = $(pollElem);
        var pollName = $poll.data("poll-name");
        var poll = polls[pollName];
        var pollPost = post;
        var vote = votes[pollName] || [];
        var quotedId = $poll.parent(".expanded-quote").data("post-id");

        if (quotedId && post.quoted[quotedId]) {
          pollPost = post.quoted[quotedId];
          pollPost = _object.default.create(pollPost);
          poll = _object.default.create(pollPost.polls.find(function (p) {
            return p.name === pollName;
          }));
          vote = pollPost.polls_votes || {};
          vote = vote[pollName] || [];
        }

        if (poll) {
          var titleElement = pollElem.querySelector(".poll-title");
          var attrs = {
            id: "".concat(pollName, "-").concat(pollPost.id),
            post: pollPost,
            poll: poll,
            vote: vote,
            titleHTML: titleElement && titleElement.outerHTML,
            groupableUserFields: (api.container.lookup("site-settings:main").poll_groupable_user_fields || "").split("|").filter(Boolean)
          };
          var glue = new _glue.default("discourse-poll", register, attrs);
          glue.appendTo(pollElem);

          _glued.push(glue);
        }
      });
    }

    function cleanUpPolls() {
      if (_interval) {
        clearInterval(_interval);
        _interval = null;
      }

      _glued.forEach(function (g) {
        return g.cleanUp();
      });

      _glued = [];
    }

    api.includePostAttributes("polls", "polls_votes");
    api.decorateCooked(attachPolls, {
      onlyStream: true,
      id: "discourse-poll"
    });
    api.cleanupStream(cleanUpPolls);
  }

  var _default = {
    name: "extend-for-poll",
    initialize: function initialize() {
      (0, _pluginApi.withPluginApi)("0.8.7", initializePolls);
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/poll/lib/chart-colors", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.getColors = getColors;

  function getColors(count, palette) {
    palette = palette || "cool";
    var gradient;

    switch (palette) {
      case "cool":
        gradient = {
          0: [255, 255, 255],
          25: [220, 237, 200],
          50: [66, 179, 213],
          75: [26, 39, 62],
          100: [0, 0, 0]
        };
        break;

      case "warm":
        gradient = {
          0: [255, 255, 255],
          25: [254, 235, 101],
          50: [228, 82, 27],
          75: [77, 52, 47],
          100: [0, 0, 0]
        };
        break;
    }

    var gradientKeys = Object.keys(gradient);
    var colors = [];
    var currentGradientValue;
    var previousGradientIndex;

    for (var colorIndex = 0; colorIndex < count; colorIndex++) {
      currentGradientValue = (colorIndex + 1) * (100 / (count + 1));
      previousGradientIndex = previousGradientIndex || 0;
      var baseGradientKeyIndex = void 0;

      for (var y = previousGradientIndex; y < gradientKeys.length; y++) {
        if (!gradientKeys[y + 1]) {
          baseGradientKeyIndex = y - 1;
          break;
        } else if (currentGradientValue >= gradientKeys[y] && currentGradientValue < gradientKeys[y + 1]) {
          baseGradientKeyIndex = y;
          break;
        }
      }

      var differenceMultiplier = (currentGradientValue - gradientKeys[baseGradientKeyIndex]) / (gradientKeys[baseGradientKeyIndex + 1] - gradientKeys[baseGradientKeyIndex]);
      var color = [];

      for (var k = 0; k < 3; k++) {
        color.push(Math.round(gradient[gradientKeys[baseGradientKeyIndex]][k] - (gradient[gradientKeys[baseGradientKeyIndex]][k] - gradient[gradientKeys[baseGradientKeyIndex + 1]][k]) * differenceMultiplier));
      }

      colors.push("rgb(".concat(color.toString(), ")"));
      previousGradientIndex = baseGradientKeyIndex;
    }

    return colors;
  }
});
define("discourse/plugins/poll/lib/discourse-markdown/poll", ["exports", "I18n"], function (_exports, _I18n) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.setup = setup;

  function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

  function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

  function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

  var DATA_PREFIX = "data-poll-";
  var DEFAULT_POLL_NAME = "poll";
  var ALLOWED_ATTRIBUTES = ["close", "max", "min", "name", "order", "public", "results", "chartType", "groups", "status", "step", "type"];

  function replaceToken(tokens, target, list) {
    var pos = tokens.indexOf(target);
    var level = tokens[pos].level;
    tokens.splice.apply(tokens, [pos, 1].concat(_toConsumableArray(list)));
    list[0].map = target.map; // resequence levels

    for (; pos < tokens.length; pos++) {
      var nesting = tokens[pos].nesting;

      if (nesting < 0) {
        level--;
      }

      tokens[pos].level = level;

      if (nesting > 0) {
        level++;
      }
    }
  } // analyzes the block to that we have poll options


  function getListItems(tokens, startToken) {
    var i = tokens.length - 1;
    var listItems = [];
    var buffer = [];

    for (; tokens[i] !== startToken; i--) {
      if (i === 0) {
        return;
      }

      var token = tokens[i];

      if (token.level === 0) {
        if (token.tag !== "ol" && token.tag !== "ul") {
          return;
        }
      }

      if (token.level === 1 && token.nesting === 1) {
        if (token.tag === "li") {
          listItems.push([token, buffer.reverse().join(" ")]);
        } else {
          return;
        }
      }

      if (token.level === 1 && token.nesting === 1 && token.tag === "li") {
        buffer = [];
      } else {
        if (token.type === "text" || token.type === "inline") {
          buffer.push(token.content);
        }
      }
    }

    return listItems.reverse();
  }

  function invalidPoll(state, tag) {
    var token = state.push("text", "", 0);
    token.content = "[/" + tag + "]";
  }

  function getTitle(tokens, startToken) {
    var startIndex = tokens.indexOf(startToken);

    if (startIndex === -1) {
      return;
    }

    var pollTokens = tokens.slice(startIndex);
    var open = pollTokens.findIndex(function (token) {
      return token.type === "heading_open";
    });
    var close = pollTokens.findIndex(function (token) {
      return token.type === "heading_close";
    });

    if (open === -1 || close === -1) {
      return;
    }

    var titleTokens = pollTokens.slice(open + 1, close); // Remove the heading element

    tokens.splice(startIndex + open, close - open + 1);
    return titleTokens;
  }

  var rule = {
    tag: "poll",
    before: function before(state, tagInfo, raw) {
      var token = state.push("text", "", 0);
      token.content = raw;
      token.bbcode_attrs = tagInfo.attrs;
      token.bbcode_type = "poll_open";
    },
    after: function after(state, openToken, raw) {
      var titleTokens = getTitle(state.tokens, openToken);
      var items = getListItems(state.tokens, openToken);

      if (!items) {
        return invalidPoll(state, raw);
      }

      var attrs = openToken.bbcode_attrs; // default poll attributes

      var attributes = [["class", "poll"]];

      if (!attrs["status"]) {
        attributes.push([DATA_PREFIX + "status", "open"]);
      }

      ALLOWED_ATTRIBUTES.forEach(function (name) {
        if (attrs[name]) {
          attributes.push([DATA_PREFIX + name, attrs[name]]);
        }
      });

      if (!attrs.name) {
        attributes.push([DATA_PREFIX + "name", DEFAULT_POLL_NAME]);
      } // we might need these values later...


      var min = parseInt(attrs["min"], 10);
      var max = parseInt(attrs["max"], 10);
      var step = parseInt(attrs["step"], 10); // infinite loop if step < 1

      if (step < 1) {
        step = 1;
      }

      var header = [];
      var token = new state.Token("poll_open", "div", 1);
      token.block = true;
      token.attrs = attributes;
      header.push(token);
      token = new state.Token("poll_open", "div", 1);
      token.block = true;
      header.push(token);
      token = new state.Token("poll_open", "div", 1);
      token.attrs = [["class", "poll-container"]];
      header.push(token);

      if (titleTokens) {
        token = new state.Token("title_open", "div", 1);
        token.attrs = [["class", "poll-title"]];
        header.push(token);
        header.push.apply(header, _toConsumableArray(titleTokens));
        token = new state.Token("title_close", "div", -1);
        header.push(token);
      } // generate the options when the type is "number"


      if (attrs["type"] === "number") {
        // default values
        if (isNaN(min)) {
          min = 1;
        }

        if (isNaN(max)) {
          max = state.md.options.discourse.pollMaximumOptions;
        }

        if (isNaN(step)) {
          step = 1;
        }

        if (items.length > 0) {
          return invalidPoll(state, raw);
        } // dynamically generate options


        token = new state.Token("bullet_list_open", "ul", 1);
        header.push(token);

        for (var o = min; o <= max; o += step) {
          token = new state.Token("list_item_open", "li", 1);
          items.push([token, String(o)]);
          header.push(token);
          token = new state.Token("text", "", 0);
          token.content = String(o);
          header.push(token);
          token = new state.Token("list_item_close", "li", -1);
          header.push(token);
        }

        token = new state.Token("bullet_item_close", "", -1);
        header.push(token);
      } // flag items so we add hashes


      for (var _o = 0; _o < items.length; _o++) {
        token = items[_o][0];
        var text = items[_o][1];
        token.attrs = token.attrs || [];
        var md5Hash = md5(JSON.stringify([text]));
        token.attrs.push([DATA_PREFIX + "option-id", md5Hash]);
      }

      replaceToken(state.tokens, openToken, header); // we got to correct the level on the state
      // we just resequenced

      state.level = state.tokens[state.tokens.length - 1].level;
      state.push("poll_close", "div", -1);
      token = state.push("poll_open", "div", 1);
      token.attrs = [["class", "poll-info"]];
      state.push("paragraph_open", "p", 1);
      token = state.push("span_open", "span", 1);
      token.block = false;
      token.attrs = [["class", "info-number"]];
      token = state.push("text", "", 0);
      token.content = "0";
      state.push("span_close", "span", -1);
      token = state.push("span_open", "span", 1);
      token.block = false;
      token.attrs = [["class", "info-label"]];
      token = state.push("text", "", 0);
      token.content = _I18n.default.t("poll.voters", {
        count: 0
      });
      state.push("span_close", "span", -1);
      state.push("paragraph_close", "p", -1);
      state.push("poll_close", "div", -1);
      state.push("poll_close", "div", -1);
      state.push("poll_close", "div", -1);
    }
  };

  function newApiInit(helper) {
    helper.registerOptions(function (opts, siteSettings) {
      opts.features.poll = !!siteSettings.poll_enabled;
      opts.pollMaximumOptions = siteSettings.poll_maximum_options;
    });
    helper.registerPlugin(function (md) {
      md.block.bbcode.ruler.push("poll", rule);
    });
  }

  function setup(helper) {
    helper.allowList(["div.poll", "div.poll-info", "div.poll-container", "div.poll-title", "div.poll-buttons", "div[data-*]", "span.info-number", "span.info-text", "span.info-label", "a.button.cast-votes", "a.button.toggle-results", "li[data-*]"]);
    newApiInit(helper);
  }
  /*!
   * Joseph Myer's md5() algorithm wrapped in a self-invoked function to prevent
   * global namespace polution, modified to hash unicode characters as UTF-8.
   *
   * Copyright 1999-2010, Joseph Myers, Paul Johnston, Greg Holt, Will Bond <will@wbond.net>
   * http://www.myersdaily.org/joseph/javascript/md5-text.html
   * http://pajhome.org.uk/crypt/md5
   *
   * Released under the BSD license
   * http://www.opensource.org/licenses/bsd-license
   */


  function md5cycle(x, k) {
    var a = x[0],
        b = x[1],
        c = x[2],
        d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32(a << s | a >>> 32 - s, b);
  }

  function ff(a, b, c, d, x, s, t) {
    return cmn(b & c | ~b & d, a, b, x, s, t);
  }

  function gg(a, b, c, d, x, s, t) {
    return cmn(b & d | c & ~d, a, b, x, s, t);
  }

  function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  function md51(s) {
    // Converts the string to UTF-8 "bytes"
    s = unescape(encodeURI(s));
    var n = s.length,
        state = [1732584193, -271733879, -1732584194, 271733878],
        i;

    for (i = 64; i <= s.length; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }

    s = s.substring(i - 64);
    var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    for (i = 0; i < s.length; i++) {
      tail[i >> 2] |= s.charCodeAt(i) << (i % 4 << 3);
    }

    tail[i >> 2] |= 0x80 << (i % 4 << 3);

    if (i > 55) {
      md5cycle(state, tail);

      for (i = 0; i < 16; i++) {
        tail[i] = 0;
      }
    }

    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function md5blk(s) {
    /* I figured global was faster.   */
    var md5blks = [],
        i;
    /* Andy King said do it this way. */

    for (i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }

    return md5blks;
  }

  var hex_chr = "0123456789abcdef".split("");

  function rhex(n) {
    var s = "",
        j = 0;

    for (; j < 4; j++) {
      s += hex_chr[n >> j * 8 + 4 & 0x0f] + hex_chr[n >> j * 8 & 0x0f];
    }

    return s;
  }

  function hex(x) {
    for (var i = 0; i < x.length; i++) {
      x[i] = rhex(x[i]);
    }

    return x.join("");
  }

  function add32(a, b) {
    return a + b & 0xffffffff;
  }

  function md5(s) {
    return hex(md51(s));
  }
});
define("discourse/plugins/poll/lib/even-round", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _default;

  // works as described on http://stackoverflow.com/a/13483710
  function sumsUpTo100(percentages) {
    return percentages.map(function (p) {
      return Math.floor(p);
    }).reduce(function (a, b) {
      return a + b;
    }) === 100;
  }

  function _default(percentages) {
    var decimals = percentages.map(function (a) {
      return a % 1;
    });
    var sumOfDecimals = Math.ceil(decimals.reduce(function (a, b) {
      return a + b;
    })); // compensate error by adding 1 to n items with the greatest decimal part

    for (var i = 0, max = decimals.length; i < sumOfDecimals && i < max; i++) {
      // find the greatest item in the decimals array, set it to 0,
      // and increase the corresponding item in the percentages array by 1
      var greatest = 0;
      var index = 0;

      for (var j = 0; j < decimals.length; j++) {
        if (decimals[j] > greatest) {
          index = j;
          greatest = decimals[j];
        }
      }

      ++percentages[index];
      decimals[index] = 0; // quit early when there is a rounding issue

      if (sumsUpTo100(percentages)) {
        break;
      }
    }

    return percentages.map(function (p) {
      return Math.floor(p);
    });
  }
});
define("discourse/plugins/poll/widgets/discourse-poll", ["exports", "I18n", "discourse/plugins/poll/controllers/poll-ui-builder", "discourse/widgets/raw-html", "discourse/lib/ajax", "discourse/widgets/post", "discourse/widgets/widget", "discourse/plugins/poll/lib/even-round", "discourse/plugins/poll/lib/chart-colors", "virtual-dom", "discourse-common/lib/icon-library", "discourse/lib/load-script", "discourse/lib/ajax-error", "discourse/lib/formatter", "discourse/lib/round", "discourse/lib/show-modal"], function (_exports, _I18n, _pollUiBuilder, _rawHtml, _ajax, _post, _widget, _evenRound, _chartColors, _virtualDom, _iconLibrary, _loadScript, _ajaxError, _formatter, _round, _showModal) {
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

  function optionHtml(option) {
    var $node = $("<span>".concat(option.html, "</span>"));
    $node.find(".discourse-local-date").each(function (_index, elem) {
      $(elem).applyLocalDates();
    });
    return new _rawHtml.default({
      html: "<span>".concat($node.html(), "</span>")
    });
  }

  function infoTextHtml(text) {
    return new _rawHtml.default({
      html: "<span class=\"info-text\">".concat(text, "</span>")
    });
  }

  function _fetchVoters(data) {
    return (0, _ajax.ajax)("/polls/voters.json", {
      data: data
    }).catch(function (error) {
      if (error) {
        (0, _ajaxError.popupAjaxError)(error);
      } else {
        bootbox.alert(_I18n.default.t("poll.error_while_fetching_voters"));
      }
    });
  }

  function checkUserGroups(user, poll) {
    var pollGroups = poll && poll.groups && poll.groups.split(",").map(function (g) {
      return g.toLowerCase();
    });

    if (!pollGroups) {
      return true;
    }

    var userGroups = user && user.groups && user.groups.map(function (g) {
      return g.name.toLowerCase();
    });
    return userGroups && pollGroups.some(function (g) {
      return userGroups.includes(g);
    });
  }

  (0, _widget.createWidget)("discourse-poll-option", {
    tagName: "li",
    buildAttributes: function buildAttributes(attrs) {
      return {
        "data-poll-option-id": attrs.option.id
      };
    },
    html: function html(attrs) {
      var contents = [];
      var option = attrs.option,
          vote = attrs.vote;
      var chosen = vote.includes(option.id);

      if (attrs.isMultiple) {
        contents.push((0, _iconLibrary.iconNode)(chosen ? "far-check-square" : "far-square"));
      } else {
        contents.push((0, _iconLibrary.iconNode)(chosen ? "circle" : "far-circle"));
      }

      contents.push(" ");
      contents.push(optionHtml(option));
      return contents;
    },
    click: function click(e) {
      if ($(e.target).closest("a").length === 0) {
        this.sendWidgetAction("toggleOption", this.attrs.option);
      }
    }
  });
  (0, _widget.createWidget)("discourse-poll-load-more", {
    tagName: "div.poll-voters-toggle-expand",
    buildKey: function buildKey(attrs) {
      return "load-more-".concat(attrs.optionId);
    },
    defaultState: function defaultState() {
      return {
        loading: false
      };
    },
    html: function html(attrs, state) {
      return state.loading ? (0, _virtualDom.h)("div.spinner.small") : (0, _virtualDom.h)("a", (0, _iconLibrary.iconNode)("chevron-down"));
    },
    click: function click() {
      var state = this.state;

      if (state.loading) {
        return;
      }

      state.loading = true;
      return this.sendWidgetAction("loadMore").finally(function () {
        return state.loading = false;
      });
    }
  });
  (0, _widget.createWidget)("discourse-poll-voters", {
    tagName: "ul.poll-voters-list",
    buildKey: function buildKey(attrs) {
      return "poll-voters-".concat(attrs.optionId);
    },
    defaultState: function defaultState() {
      return {
        loaded: "new",
        voters: [],
        page: 1
      };
    },
    fetchVoters: function fetchVoters() {
      var _this = this;

      var attrs = this.attrs,
          state = this.state;

      if (state.loaded === "loading") {
        return;
      }

      state.loaded = "loading";
      return _fetchVoters({
        post_id: attrs.postId,
        poll_name: attrs.pollName,
        option_id: attrs.optionId,
        page: state.page
      }).then(function (result) {
        state.loaded = "loaded";
        state.page += 1;
        var newVoters = attrs.pollType === "number" ? result.voters : result.voters[attrs.optionId];
        var existingVoters = new Set(state.voters.map(function (voter) {
          return voter.username;
        }));
        newVoters.forEach(function (voter) {
          if (!existingVoters.has(voter.username)) {
            existingVoters.add(voter.username);
            state.voters.push(voter);
          }
        });

        _this.scheduleRerender();
      });
    },
    loadMore: function loadMore() {
      return this.fetchVoters();
    },
    html: function html(attrs, state) {
      if (attrs.voters && state.loaded === "new") {
        state.voters = attrs.voters;
      }

      var contents = state.voters.map(function (user) {
        return (0, _virtualDom.h)("li", [(0, _post.avatarFor)("tiny", {
          username: user.username,
          template: user.avatar_template
        }), " "]);
      });

      if (state.voters.length < attrs.totalVotes) {
        contents.push(this.attach("discourse-poll-load-more", attrs));
      }

      return (0, _virtualDom.h)("div.poll-voters", contents);
    }
  });
  (0, _widget.createWidget)("discourse-poll-standard-results", {
    tagName: "ul.results",
    buildKey: function buildKey(attrs) {
      return "poll-standard-results-".concat(attrs.id);
    },
    defaultState: function defaultState() {
      return {
        loaded: false
      };
    },
    fetchVoters: function fetchVoters() {
      var _this2 = this;

      var attrs = this.attrs,
          state = this.state;
      return _fetchVoters({
        post_id: attrs.post.id,
        poll_name: attrs.poll.get("name")
      }).then(function (result) {
        state.voters = result.voters;

        _this2.scheduleRerender();
      });
    },
    html: function html(attrs, state) {
      var _this3 = this;

      var poll = attrs.poll;
      var options = poll.get("options");

      if (options) {
        var voters = poll.get("voters");
        var isPublic = poll.get("public");

        var ordered = _toConsumableArray(options).sort(function (a, b) {
          if (a.votes < b.votes) {
            return 1;
          } else if (a.votes === b.votes) {
            if (a.html < b.html) {
              return -1;
            } else {
              return 1;
            }
          } else {
            return -1;
          }
        });

        if (isPublic && !state.loaded) {
          state.voters = poll.get("preloaded_voters");
          state.loaded = true;
        }

        var percentages = voters === 0 ? Array(ordered.length).fill(0) : ordered.map(function (o) {
          return 100 * o.votes / voters;
        });
        var rounded = attrs.isMultiple ? percentages.map(Math.floor) : (0, _evenRound.default)(percentages);
        return ordered.map(function (option, idx) {
          var contents = [];
          var per = rounded[idx].toString();
          var chosen = (attrs.vote || []).includes(option.id);
          contents.push((0, _virtualDom.h)("div.option", (0, _virtualDom.h)("p", [(0, _virtualDom.h)("span.percentage", "".concat(per, "%")), optionHtml(option)])));
          contents.push((0, _virtualDom.h)("div.bar-back", (0, _virtualDom.h)("div.bar", {
            attributes: {
              style: "width:".concat(per, "%")
            }
          })));

          if (isPublic) {
            contents.push(_this3.attach("discourse-poll-voters", {
              postId: attrs.post.id,
              optionId: option.id,
              pollName: poll.get("name"),
              totalVotes: option.votes,
              voters: state.voters && state.voters[option.id] || []
            }));
          }

          return (0, _virtualDom.h)("li", {
            className: "".concat(chosen ? "chosen" : "")
          }, contents);
        });
      }
    }
  });
  (0, _widget.createWidget)("discourse-poll-number-results", {
    buildKey: function buildKey(attrs) {
      return "poll-number-results-".concat(attrs.id);
    },
    defaultState: function defaultState() {
      return {
        loaded: false
      };
    },
    fetchVoters: function fetchVoters() {
      var _this4 = this;

      var attrs = this.attrs,
          state = this.state;
      return _fetchVoters({
        post_id: attrs.post.id,
        poll_name: attrs.poll.get("name")
      }).then(function (result) {
        state.voters = result.voters;

        _this4.scheduleRerender();
      });
    },
    html: function html(attrs, state) {
      var poll = attrs.poll;
      var totalScore = poll.get("options").reduce(function (total, o) {
        return total + parseInt(o.html, 10) * parseInt(o.votes, 10);
      }, 0);
      var voters = poll.get("voters");
      var average = voters === 0 ? 0 : (0, _round.default)(totalScore / voters, -2);

      var averageRating = _I18n.default.t("poll.average_rating", {
        average: average
      });

      var contents = [(0, _virtualDom.h)("div.poll-results-number-rating", new _rawHtml.default({
        html: "<span>".concat(averageRating, "</span>")
      }))];

      if (poll.get("public")) {
        if (!state.loaded) {
          state.voters = poll.get("preloaded_voters");
          state.loaded = true;
        }

        contents.push(this.attach("discourse-poll-voters", {
          totalVotes: poll.get("voters"),
          voters: state.voters || [],
          postId: attrs.post.id,
          pollName: poll.get("name"),
          pollType: poll.get("type")
        }));
      }

      return contents;
    }
  });
  (0, _widget.createWidget)("discourse-poll-container", {
    tagName: "div.poll-container",
    html: function html(attrs) {
      var _this5 = this;

      var poll = attrs.poll;
      var options = poll.get("options");

      if (attrs.showResults) {
        var contents = [];

        if (attrs.titleHTML) {
          contents.push(new _rawHtml.default({
            html: attrs.titleHTML
          }));
        }

        var type = poll.get("type") === "number" ? "number" : "standard";
        var resultsWidget = type === "number" || attrs.poll.chart_type !== _pollUiBuilder.PIE_CHART_TYPE ? "discourse-poll-".concat(type, "-results") : "discourse-poll-pie-chart";
        contents.push(this.attach(resultsWidget, attrs));
        return contents;
      } else if (options) {
        var _contents = [];

        if (attrs.titleHTML) {
          _contents.push(new _rawHtml.default({
            html: attrs.titleHTML
          }));
        }

        if (!checkUserGroups(this.currentUser, poll)) {
          _contents.push((0, _virtualDom.h)("div.alert.alert-danger", _I18n.default.t("poll.results.groups.title", {
            groups: poll.groups
          })));
        }

        _contents.push((0, _virtualDom.h)("ul", options.map(function (option) {
          return _this5.attach("discourse-poll-option", {
            option: option,
            isMultiple: attrs.isMultiple,
            vote: attrs.vote
          });
        })));

        return _contents;
      }
    }
  });
  (0, _widget.createWidget)("discourse-poll-info", {
    tagName: "div.poll-info",
    multipleHelpText: function multipleHelpText(min, max, options) {
      if (max > 0) {
        if (min === max) {
          if (min > 1) {
            return _I18n.default.t("poll.multiple.help.x_options", {
              count: min
            });
          }
        } else if (min > 1) {
          if (max < options) {
            return _I18n.default.t("poll.multiple.help.between_min_and_max_options", {
              min: min,
              max: max
            });
          } else {
            return _I18n.default.t("poll.multiple.help.at_least_min_options", {
              count: min
            });
          }
        } else if (max <= options) {
          return _I18n.default.t("poll.multiple.help.up_to_max_options", {
            count: max
          });
        }
      }
    },
    html: function html(attrs) {
      var poll = attrs.poll;
      var count = poll.get("voters");
      var contents = [(0, _virtualDom.h)("p", [(0, _virtualDom.h)("span.info-number", count.toString()), (0, _virtualDom.h)("span.info-label", _I18n.default.t("poll.voters", {
        count: count
      }))])];

      if (attrs.isMultiple) {
        if (attrs.showResults || attrs.isClosed) {
          var totalVotes = poll.get("options").reduce(function (total, o) {
            return total + parseInt(o.votes, 10);
          }, 0);
          contents.push((0, _virtualDom.h)("p", [(0, _virtualDom.h)("span.info-number", totalVotes.toString()), (0, _virtualDom.h)("span.info-label", _I18n.default.t("poll.total_votes", {
            count: totalVotes
          }))]));
        } else {
          var help = this.multipleHelpText(attrs.min, attrs.max, poll.get("options.length"));

          if (help) {
            contents.push(infoTextHtml(help));
          }
        }
      }

      if (!attrs.isClosed && !attrs.showResults && poll.public && poll.results !== "staff_only") {
        contents.push(infoTextHtml(_I18n.default.t("poll.public.title")));
      }

      return contents;
    }
  });

  function clearPieChart(id) {
    var el = document.querySelector("#poll-results-chart-".concat(id));
    el && el.parentNode.removeChild(el);
  }

  (0, _widget.createWidget)("discourse-poll-pie-canvas", {
    tagName: "canvas.poll-results-canvas",
    init: function init(attrs) {
      (0, _loadScript.default)("/javascripts/Chart.min.js").then(function () {
        var data = attrs.poll.options.mapBy("votes");
        var labels = attrs.poll.options.mapBy("html");
        var config = pieChartConfig(data, labels);
        var el = document.getElementById("poll-results-chart-".concat(attrs.id)); // eslint-disable-next-line

        var chart = new Chart(el.getContext("2d"), config);
        document.getElementById("poll-results-legend-".concat(attrs.id)).innerHTML = chart.generateLegend();
      });
    },
    buildAttributes: function buildAttributes(attrs) {
      return {
        id: "poll-results-chart-".concat(attrs.id)
      };
    }
  });
  (0, _widget.createWidget)("discourse-poll-pie-chart", {
    tagName: "div.poll-results-chart",
    html: function html(attrs) {
      var contents = [];

      if (!attrs.showResults) {
        clearPieChart(attrs.id);
        return contents;
      }

      var chart = this.attach("discourse-poll-pie-canvas", attrs);
      contents.push(chart);
      contents.push((0, _virtualDom.h)("div#poll-results-legend-".concat(attrs.id, ".pie-chart-legends")));
      return contents;
    }
  });

  function pieChartConfig(data, labels) {
    var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var aspectRatio = "aspectRatio" in opts ? opts.aspectRatio : 2.2;
    var strippedLabels = labels.map(function (l) {
      return stripHtml(l);
    });
    return {
      type: _pollUiBuilder.PIE_CHART_TYPE,
      data: {
        datasets: [{
          data: data,
          backgroundColor: (0, _chartColors.getColors)(data.length)
        }],
        labels: strippedLabels
      },
      options: {
        responsive: true,
        aspectRatio: aspectRatio,
        animation: {
          duration: 0
        },
        legend: {
          display: false
        },
        legendCallback: function legendCallback(chart) {
          var legends = "";

          for (var i = 0; i < labels.length; i++) {
            legends += "<div class=\"legend\"><span class=\"swatch\" style=\"background-color:\n            ".concat(chart.data.datasets[0].backgroundColor[i], "\"></span>").concat(labels[i], "</div>");
          }

          return legends;
        }
      }
    };
  }

  function stripHtml(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  }

  (0, _widget.createWidget)("discourse-poll-buttons", {
    tagName: "div.poll-buttons",
    html: function html(attrs) {
      var contents = [];
      var poll = attrs.poll,
          post = attrs.post;
      var topicArchived = post.get("topic.archived");
      var closed = attrs.isClosed;
      var staffOnly = poll.results === "staff_only";
      var isStaff = this.currentUser && this.currentUser.staff;
      var isAdmin = this.currentUser && this.currentUser.admin;
      var isMe = this.currentUser && post.user_id === this.currentUser.id;
      var dataExplorerEnabled = this.siteSettings.data_explorer_enabled;
      var hideResultsDisabled = !staffOnly && (closed || topicArchived);
      var exportQueryID = this.siteSettings.poll_export_data_explorer_query_id;

      if (attrs.isMultiple && !hideResultsDisabled) {
        var castVotesDisabled = !attrs.canCastVotes;
        contents.push(this.attach("button", {
          className: "cast-votes ".concat(castVotesDisabled ? "btn-default" : "btn-primary"),
          label: "poll.cast-votes.label",
          title: "poll.cast-votes.title",
          disabled: castVotesDisabled,
          action: "castVotes"
        }));
        contents.push(" ");
      }

      if (attrs.showResults || hideResultsDisabled) {
        contents.push(this.attach("button", {
          className: "btn-default toggle-results",
          label: "poll.hide-results.label",
          title: "poll.hide-results.title",
          icon: "far-eye-slash",
          disabled: hideResultsDisabled,
          action: "toggleResults"
        }));
      } else {
        if (poll.get("results") === "on_vote" && !attrs.hasVoted && !isMe) {
          contents.push(infoTextHtml(_I18n.default.t("poll.results.vote.title")));
        } else if (poll.get("results") === "on_close" && !closed) {
          contents.push(infoTextHtml(_I18n.default.t("poll.results.closed.title")));
        } else if (poll.results === "staff_only" && !isStaff) {
          contents.push(infoTextHtml(_I18n.default.t("poll.results.staff.title")));
        } else {
          contents.push(this.attach("button", {
            className: "btn-default toggle-results",
            label: "poll.show-results.label",
            title: "poll.show-results.title",
            icon: "far-eye",
            disabled: poll.get("voters") === 0,
            action: "toggleResults"
          }));
        }
      }

      if (attrs.groupableUserFields.length && poll.voters > 0) {
        var button = this.attach("button", {
          className: "btn-default poll-show-breakdown",
          label: "poll.group-results.label",
          title: "poll.group-results.title",
          icon: "far-eye",
          action: "showBreakdown"
        });
        contents.push(button);
      }

      if (isAdmin && dataExplorerEnabled && poll.voters > 0 && exportQueryID) {
        contents.push(this.attach("button", {
          className: "btn btn-default export-results",
          label: "poll.export-results.label",
          title: "poll.export-results.title",
          icon: "download",
          disabled: poll.voters === 0,
          action: "exportResults"
        }));
      }

      if (poll.get("close")) {
        var closeDate = moment(poll.get("close"));

        if (closeDate.isValid()) {
          var title = closeDate.format("LLL");
          var label;

          if (attrs.isAutomaticallyClosed) {
            var age = (0, _formatter.relativeAge)(closeDate.toDate(), {
              addAgo: true
            });
            label = _I18n.default.t("poll.automatic_close.age", {
              age: age
            });
          } else {
            var timeLeft = moment().to(closeDate, true);
            label = _I18n.default.t("poll.automatic_close.closes_in", {
              timeLeft: timeLeft
            });
          }

          contents.push(new _rawHtml.default({
            html: "<span class=\"info-text\" title=\"".concat(title, "\">").concat(label, "</span>")
          }));
        }
      }

      if (this.currentUser && (this.currentUser.get("id") === post.get("user_id") || isStaff) && !topicArchived) {
        if (closed) {
          if (!attrs.isAutomaticallyClosed) {
            contents.push(this.attach("button", {
              className: "btn-default toggle-status",
              label: "poll.open.label",
              title: "poll.open.title",
              icon: "unlock-alt",
              action: "toggleStatus"
            }));
          }
        } else {
          contents.push(this.attach("button", {
            className: "toggle-status btn-danger",
            label: "poll.close.label",
            title: "poll.close.title",
            icon: "lock",
            action: "toggleStatus"
          }));
        }
      }

      return contents;
    }
  });

  var _default = (0, _widget.createWidget)("discourse-poll", {
    tagName: "div",
    buildKey: function buildKey(attrs) {
      return "poll-".concat(attrs.id);
    },
    buildAttributes: function buildAttributes(attrs) {
      var cssClasses = "poll";

      if (attrs.poll.chart_type === _pollUiBuilder.PIE_CHART_TYPE) {
        cssClasses += " pie";
      }

      return {
        class: cssClasses,
        "data-poll-name": attrs.poll.get("name"),
        "data-poll-type": attrs.poll.get("type")
      };
    },
    defaultState: function defaultState(attrs) {
      var post = attrs.post,
          poll = attrs.poll;
      var staffOnly = attrs.poll.results === "staff_only";
      var showResults = post.get("topic.archived") && !staffOnly || this.isClosed() && !staffOnly || poll.results !== "on_close" && this.hasVoted() && !staffOnly;
      return {
        loading: false,
        showResults: showResults
      };
    },
    html: function html(attrs, state) {
      var staffOnly = attrs.poll.results === "staff_only";
      var showResults = state.showResults || attrs.post.get("topic.archived") && !staffOnly || this.isClosed() && !staffOnly;
      var newAttrs = jQuery.extend({}, attrs, {
        canCastVotes: this.canCastVotes(),
        hasVoted: this.hasVoted(),
        isAutomaticallyClosed: this.isAutomaticallyClosed(),
        isClosed: this.isClosed(),
        isMultiple: this.isMultiple(),
        max: this.max(),
        min: this.min(),
        showResults: showResults
      });
      return (0, _virtualDom.h)("div", [this.attach("discourse-poll-container", newAttrs), this.attach("discourse-poll-info", newAttrs), this.attach("discourse-poll-buttons", newAttrs)]);
    },
    min: function min() {
      var min = parseInt(this.attrs.poll.get("min"), 10);

      if (isNaN(min) || min < 0) {
        min = 0;
      }

      return min;
    },
    max: function max() {
      var max = parseInt(this.attrs.poll.get("max"), 10);
      var numOptions = this.attrs.poll.get("options.length");

      if (isNaN(max) || max > numOptions) {
        max = numOptions;
      }

      return max;
    },
    isAutomaticallyClosed: function isAutomaticallyClosed() {
      var poll = this.attrs.poll;
      return poll.get("close") && moment.utc(poll.get("close")) <= moment();
    },
    isClosed: function isClosed() {
      var poll = this.attrs.poll;
      return poll.get("status") === "closed" || this.isAutomaticallyClosed();
    },
    isMultiple: function isMultiple() {
      var poll = this.attrs.poll;
      return poll.get("type") === "multiple";
    },
    hasVoted: function hasVoted() {
      var vote = this.attrs.vote;
      return vote && vote.length > 0;
    },
    canCastVotes: function canCastVotes() {
      var state = this.state,
          attrs = this.attrs;

      if (this.isClosed() || state.showResults || state.loading) {
        return false;
      }

      var selectedOptionCount = attrs.vote.length;

      if (this.isMultiple()) {
        return selectedOptionCount >= this.min() && selectedOptionCount <= this.max();
      }

      return selectedOptionCount > 0;
    },
    toggleStatus: function toggleStatus() {
      var _this6 = this;

      var state = this.state,
          attrs = this.attrs;
      var post = attrs.post,
          poll = attrs.poll;

      if (this.isAutomaticallyClosed()) {
        return;
      }

      bootbox.confirm(_I18n.default.t(this.isClosed() ? "poll.open.confirm" : "poll.close.confirm"), _I18n.default.t("no_value"), _I18n.default.t("yes_value"), function (confirmed) {
        if (confirmed) {
          state.loading = true;
          var status = _this6.isClosed() ? "open" : "closed";
          (0, _ajax.ajax)("/polls/toggle_status", {
            type: "PUT",
            data: {
              post_id: post.get("id"),
              poll_name: poll.get("name"),
              status: status
            }
          }).then(function () {
            poll.set("status", status);

            if (poll.get("results") === "on_close") {
              state.showResults = status === "closed";
            }

            _this6.scheduleRerender();
          }).catch(function (error) {
            if (error) {
              (0, _ajaxError.popupAjaxError)(error);
            } else {
              bootbox.alert(_I18n.default.t("poll.error_while_toggling_status"));
            }
          }).finally(function () {
            state.loading = false;
          });
        }
      });
    },
    toggleResults: function toggleResults() {
      this.state.showResults = !this.state.showResults;
    },
    exportResults: function exportResults() {
      var attrs = this.attrs;
      var queryID = this.siteSettings.poll_export_data_explorer_query_id; // This uses the Data Explorer plugin export as CSV route
      // There is detection to check if the plugin is enabled before showing the button

      (0, _ajax.ajax)("/admin/plugins/explorer/queries/".concat(queryID, "/run.csv"), {
        type: "POST",
        data: {
          // needed for data-explorer route compatibility
          params: JSON.stringify({
            poll_name: attrs.poll.name,
            post_id: attrs.post.id.toString() // needed for data-explorer route compatibility

          }),
          explain: false,
          limit: 1000000,
          download: 1
        }
      }).then(function (csvContent) {
        var downloadLink = document.createElement("a");
        var blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;"
        });
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.setAttribute("download", "poll-export-".concat(attrs.poll.name, "-").concat(attrs.post.id, ".csv"));
        downloadLink.click();
        downloadLink.remove();
      }).catch(function (error) {
        if (error) {
          (0, _ajaxError.popupAjaxError)(error);
        } else {
          bootbox.alert(_I18n.default.t("poll.error_while_exporting_results"));
        }
      });
    },
    showLogin: function showLogin() {
      this.register.lookup("route:application").send("showLogin");
    },
    _toggleOption: function _toggleOption(option) {
      var vote = this.attrs.vote;
      var chosenIdx = vote.indexOf(option.id);

      if (chosenIdx !== -1) {
        vote.splice(chosenIdx, 1);
      } else {
        vote.push(option.id);
      }
    },
    toggleOption: function toggleOption(option) {
      var _this7 = this;

      var attrs = this.attrs;

      if (this.isClosed()) {
        return;
      }

      if (!this.currentUser) {
        return this.showLogin();
      }

      if (!checkUserGroups(this.currentUser, this.attrs.poll)) {
        return;
      }

      var vote = attrs.vote;

      if (!this.isMultiple()) {
        vote.length = 0;
      }

      this._toggleOption(option);

      if (!this.isMultiple()) {
        return this.castVotes().catch(function () {
          return _this7._toggleOption(option);
        });
      }
    },
    castVotes: function castVotes() {
      var _this8 = this;

      if (!this.canCastVotes()) {
        return;
      }

      if (!this.currentUser) {
        return this.showLogin();
      }

      var attrs = this.attrs,
          state = this.state;
      state.loading = true;
      return (0, _ajax.ajax)("/polls/vote", {
        type: "PUT",
        data: {
          post_id: attrs.post.id,
          poll_name: attrs.poll.get("name"),
          options: attrs.vote
        }
      }).then(function (_ref) {
        var poll = _ref.poll;
        attrs.poll.setProperties(poll);

        _this8.appEvents.trigger("poll:voted", poll, attrs.post, attrs.vote);

        if (attrs.poll.get("results") !== "on_close") {
          state.showResults = true;
        }

        if (attrs.poll.results === "staff_only") {
          if (_this8.currentUser && _this8.currentUser.get("staff")) {
            state.showResults = true;
          } else {
            state.showResults = false;
          }
        }
      }).catch(function (error) {
        if (error) {
          (0, _ajaxError.popupAjaxError)(error);
        } else {
          bootbox.alert(_I18n.default.t("poll.error_while_casting_votes"));
        }
      }).finally(function () {
        state.loading = false;
      });
    },
    showBreakdown: function showBreakdown() {
      (0, _showModal.default)("poll-breakdown", {
        model: this.attrs,
        panels: [{
          id: "percentage",
          title: "poll.breakdown.percentage"
        }, {
          id: "count",
          title: "poll.breakdown.count"
        }]
      });
    }
  });

  _exports.default = _default;
});


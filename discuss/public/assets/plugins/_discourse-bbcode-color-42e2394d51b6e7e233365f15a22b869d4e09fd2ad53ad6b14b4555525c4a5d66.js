define("discourse/plugins/discourse-bbcode-color/lib/discourse-markdown/bbcode-color", ["exports", "pretty-text/pretty-text"], function (_exports, _prettyText) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.setup = setup;
  (0, _prettyText.registerOption)(function (siteSettings, opts) {
    opts.features["bbcode-color"] = true;
  });

  function replaceFontColor(text) {
    text = text || "";

    while (text !== (text = text.replace(/\[color=([^\]]+)\]((?:(?!\[color=[^\]]+\]|\[\/color\])[\S\s])*)\[\/color\]/gi, function (match, p1, p2) {
      return "<font color='".concat(p1, "'>").concat(p2, "</font>");
    }))) {}

    return text;
  }

  function replaceFontBgColor(text) {
    text = text || "";

    while (text !== (text = text.replace(/\[bgcolor=([^\]]+)\]((?:(?!\[bgcolor=[^\]]+\]|\[\/bgcolor\])[\S\s])*)\[\/bgcolor\]/gi, function (match, p1, p2) {
      return "<span style='background-color:".concat(p1, "'>").concat(p2, "</span>");
    }))) {}

    return text;
  }

  function setup(helper) {
    helper.whiteList(["font[color]"]);
    helper.whiteList({
      custom: function custom(tag, name, value) {
        if (tag === "span" && name === "style") {
          return /^background-color:#?[a-zA-Z0-9]+$/.exec(value);
        }
      }
    });

    if (helper.markdownIt) {
      helper.registerPlugin(function (md) {
        var ruler = md.inline.bbcode.ruler;
        ruler.push("bgcolor", {
          tag: "bgcolor",
          wrap: function wrap(token, endToken, tagInfo) {
            token.type = "span_open";
            token.tag = "span";
            token.attrs = [["style", "background-color:" + tagInfo.attrs._default.trim()]];
            token.content = "";
            token.nesting = 1;
            endToken.type = "span_close";
            endToken.tag = "span";
            endToken.nesting = -1;
            endToken.content = "";
          }
        });
        ruler.push("color", {
          tag: "color",
          wrap: function wrap(token, endToken, tagInfo) {
            token.type = "font_open";
            token.tag = "font";
            token.attrs = [["color", tagInfo.attrs._default]];
            token.content = "";
            token.nesting = 1;
            endToken.type = "font_close";
            endToken.tag = "font";
            endToken.nesting = -1;
            endToken.content = "";
          }
        });
      });
    } else {
      helper.addPreProcessor(function (text) {
        return replaceFontColor(text);
      });
      helper.addPreProcessor(function (text) {
        return replaceFontBgColor(text);
      });
    }
  }
});


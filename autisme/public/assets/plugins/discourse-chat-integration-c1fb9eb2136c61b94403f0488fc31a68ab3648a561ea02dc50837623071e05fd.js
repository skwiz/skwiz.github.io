define("discourse/plugins/discourse-chat-integration/discourse/routes/transcript",["exports","discourse/lib/ajax","discourse/lib/ajax-error","discourse/routes/discourse"],function(e,i,l,t){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;t=t.default.extend({model:function(e){var n,a=this;this.currentUser?(n=e.secret,this.replaceWith("discovery.latest").then(function(t){a.controllerFor("navigation/default").get("canCreateTopic")&&Ember.run.next(function(){(0,i.ajax)("chat-transcript/".concat(n)).then(function(e){t.send("createNewTopicViaParams",null,e.content,null,null,null)},l.popupAjaxError)})})):(this.session.set("shouldRedirectToUrl",window.location.href),this.replaceWith("login"))}});e.default=t}),define("discourse/plugins/discourse-chat-integration/discourse/public-route-map",["exports"],function(e){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=function(){this.route("transcript",{path:"/chat-transcript/:secret"})}}),Ember.TEMPLATES["javascripts/components/channel-data"]=Ember.HTMLBars.template({id:null,block:'{"symbols":["param"],"statements":[[4,"each",[[24,["provider","channel_parameters"]]],null,{"statements":[[4,"unless",[[23,1,["hidden"]]],null,{"statements":[[0,"    "],[7,"span",true],[10,"class","field-name"],[8],[0,"\\n      "],[1,[28,"i18n",[[28,"concat",["chat_integration.provider.",[24,["channel","provider"]],".param.",[23,1,["key"]],".title"],null]],null],false],[0,":\\n    "],[9],[0,"\\n    "],[7,"span",true],[10,"class","field-value"],[8],[1,[28,"get",[[24,["channel","data"]],[23,1,["key"]]],null],false],[9],[0,"\\n    "],[7,"br",true],[8],[9],[0,"\\n"]],"parameters":[]},null]],"parameters":[1]},null]],"hasEval":false}',meta:{moduleName:"javascripts/discourse/templates/components/channel-data"}}),Ember.TEMPLATES["javascripts/components/rule-row"]=Ember.HTMLBars.template({id:null,block:'{"symbols":[],"statements":[[7,"td",true],[8],[0,"\\n  "],[1,[24,["rule","filterName"]],false],[0,"\\n"],[9],[0,"\\n\\n"],[7,"td",true],[8],[0,"\\n"],[4,"if",[[24,["isCategory"]]],null,{"statements":[[4,"if",[[24,["rule","category"]]],null,{"statements":[[0,"      "],[1,[28,"category-link",[[24,["rule","category"]]],[["allowUncategorized","link"],["true","false"]]],false],[0,"\\n"]],"parameters":[]},{"statements":[[0,"      "],[1,[28,"i18n",["chat_integration.all_categories"],null],false],[0,"\\n"]],"parameters":[]}]],"parameters":[]},{"statements":[[4,"if",[[24,["isMention"]]],null,{"statements":[[0,"    "],[1,[28,"i18n",["chat_integration.group_mention_template"],[["name"],[[24,["rule","group_name"]]]]],false],[0,"\\n"]],"parameters":[]},{"statements":[[4,"if",[[24,["isMessage"]]],null,{"statements":[[0,"    "],[1,[28,"i18n",["chat_integration.group_message_template"],[["name"],[[24,["rule","group_name"]]]]],false],[0,"\\n  "]],"parameters":[]},null]],"parameters":[]}]],"parameters":[]}],[9],[0,"\\n\\n\\n"],[4,"if",[[24,["siteSettings","tagging_enabled"]]],null,{"statements":[[0,"  "],[7,"td",true],[8],[0,"\\n"],[4,"if",[[24,["rule","tags"]]],null,{"statements":[[0,"      "],[1,[24,["rule","tags"]],false],[0,"\\n"]],"parameters":[]},{"statements":[[0,"      "],[1,[28,"i18n",["chat_integration.all_tags"],null],false],[0,"\\n"]],"parameters":[]}],[0,"  "],[9],[0,"\\n"]],"parameters":[]},null],[0,"\\n"],[7,"td",true],[8],[0,"\\n  "],[1,[28,"d-button",null,[["action","actionParam","icon","class","title"],[[24,["edit"]],[24,["rule"]],"pencil-alt","edit","chat_integration.rule_table.edit_rule"]]],false],[0,"\\n\\n  "],[1,[28,"d-button",null,[["action","actionParam","icon","class","title"],[[28,"action",[[23,0,[]],"delete"],null],[24,["rule"]],"far-trash-alt","delete","chat_integration.rule_table.delete_rule"]]],false],[0,"\\n"],[9],[0,"\\n"]],"hasEval":false}',meta:{moduleName:"javascripts/discourse/templates/components/rule-row"}}),Ember.TEMPLATES["javascripts/components/channel-details"]=Ember.HTMLBars.template({id:null,block:'{"symbols":["rule"],"statements":[[7,"div",true],[10,"class","channel-header"],[8],[0,"\\n  "],[7,"div",true],[10,"class","pull-right"],[8],[0,"\\n    "],[1,[28,"d-button",null,[["action","actionParam","icon","title","label"],[[24,["editChannel"]],[24,["channel"]],"pencil-alt","chat_integration.edit_channel","chat_integration.edit_channel"]]],false],[0,"\\n\\n    "],[1,[28,"d-button",null,[["action","actionParam","icon","title","label","class"],[[24,["test"]],[24,["channel"]],"rocket","chat_integration.test_channel","chat_integration.test_channel","btn-chat-test"]]],false],[0,"\\n\\n    "],[1,[28,"d-button",null,[["class","action","actionParam","icon","title","label"],["cancel",[28,"action",[[23,0,[]],"deleteChannel"],null],[24,["channel"]],"trash-alt","chat_integration.delete_channel","chat_integration.delete_channel"]]],false],[0,"\\n  "],[9],[0,"\\n\\n  "],[7,"span",true],[10,"class","channel-title"],[8],[0,"\\n"],[4,"if",[[24,["channel","error_key"]]],null,{"statements":[[0,"      "],[1,[28,"d-button",null,[["action","actionParam","class","icon"],[[24,["showError"]],[24,["channel"]],"delete btn-danger","exclamation-triangle"]]],false],[0,"\\n"]],"parameters":[]},null],[0,"\\n    "],[1,[28,"channel-data",null,[["provider","channel"],[[24,["provider"]],[24,["channel"]]]]],false],[0,"\\n  "],[9],[0,"\\n"],[9],[0,"\\n\\n"],[7,"div",true],[10,"class","channel-body"],[8],[0,"\\n  "],[7,"table",true],[8],[0,"\\n    "],[7,"tr",true],[8],[0,"\\n      "],[7,"th",true],[8],[1,[28,"i18n",["chat_integration.rule_table.filter"],null],false],[9],[0,"\\n      "],[7,"th",true],[8],[1,[28,"i18n",["chat_integration.rule_table.category"],null],false],[9],[0,"\\n\\n"],[4,"if",[[24,["siteSettings","tagging_enabled"]]],null,{"statements":[[0,"        "],[7,"th",true],[8],[1,[28,"i18n",["chat_integration.rule_table.tags"],null],false],[9],[0,"\\n"]],"parameters":[]},null],[0,"\\n      "],[7,"th",true],[8],[9],[0,"\\n    "],[9],[0,"\\n\\n"],[4,"each",[[24,["channel","rules"]]],null,{"statements":[[0,"      "],[1,[28,"rule-row",null,[["rule","edit","refresh"],[[23,1,[]],[28,"action",[[23,0,[]],"editRule"],null],[24,["refresh"]]]]],false],[0,"\\n"]],"parameters":[1]},null],[0,"  "],[9],[0,"\\n"],[9],[0,"\\n\\n"],[7,"div",true],[10,"class","channel-footer"],[8],[0,"\\n  "],[7,"div",true],[10,"class","pull-right"],[8],[0,"\\n   "],[1,[28,"d-button",null,[["action","actionParam","icon","title","label"],[[24,["createRule"]],[24,["channel"]],"plus","chat_integration.create_rule","chat_integration.create_rule"]]],false],[0,"\\n  "],[9],[0,"\\n"],[9],[0,"\\n"]],"hasEval":false}',meta:{moduleName:"javascripts/discourse/templates/components/channel-details"}}),Ember.TEMPLATES["javascripts/admin/plugins-chat"]=Ember.HTMLBars.template({id:null,block:'{"symbols":["provider"],"statements":[[7,"div",true],[10,"id","admin-plugin-chat"],[8],[0,"\\n  "],[7,"div",true],[10,"class","admin-controls"],[8],[0,"\\n    "],[7,"div",true],[10,"class","span15"],[8],[0,"\\n      "],[7,"ul",true],[10,"class","nav nav-pills"],[8],[0,"\\n"],[4,"each",[[24,["model"]]],null,{"statements":[[0,"          "],[1,[28,"nav-item",null,[["route","routeParam","label"],["adminPlugins.chat.provider",[23,1,["name"]],[28,"concat",["chat_integration.provider.",[23,1,["name"]],".title"],null]]]],false],[0,"\\n"]],"parameters":[1]},null],[0,"      "],[9],[0,"\\n    "],[9],[0,"\\n\\n    "],[7,"div",true],[10,"class","pull-right"],[8],[0,"\\n      "],[1,[28,"d-button",null,[["action","icon","title","label"],[[28,"route-action",["showSettings"],null],"cog","chat_integration.settings","chat_integration.settings"]]],false],[0,"\\n    "],[9],[0,"\\n  "],[9],[0,"\\n\\n"],[4,"unless",[[24,["model","totalRows"]]],null,{"statements":[[0,"    "],[1,[28,"i18n",["chat_integration.no_providers"],null],false],[0,"\\n"]],"parameters":[]},null],[0,"\\n  "],[1,[22,"outlet"],false],[0,"\\n"],[9],[0,"\\n"]],"hasEval":false}',meta:{moduleName:"javascripts/discourse/templates/admin/plugins-chat"}}),Ember.TEMPLATES["javascripts/admin/plugins-chat-provider"]=Ember.HTMLBars.template({id:null,block:'{"symbols":["channel"],"statements":[[4,"if",[[24,["anyErrors"]]],null,{"statements":[[0,"  "],[7,"div",true],[10,"class","error"],[8],[0,"\\n    "],[1,[28,"d-icon",["exclamation-triangle"],null],false],[0,"\\n    "],[7,"span",true],[10,"class","error-message"],[8],[1,[28,"i18n",["chat_integration.channels_with_errors"],null],false],[9],[0,"\\n  "],[9],[0,"\\n"]],"parameters":[]},null],[0,"\\n"],[4,"each",[[24,["model","channels"]]],null,{"statements":[[0,"  "],[1,[28,"channel-details",null,[["channel","provider","refresh","editChannel","test","createRule","editRuleWithChannel","showError"],[[23,1,[]],[24,["model","provider"]],[28,"route-action",["refreshProvider"],null],[28,"action",[[23,0,[]],"editChannel"],null],[28,"action",[[23,0,[]],"testChannel"],null],[28,"action",[[23,0,[]],"createRule"],null],[28,"action",[[23,0,[]],"editRuleWithChannel"],null],[28,"action",[[23,0,[]],"showError"],null]]]],false],[0,"\\n"]],"parameters":[1]},null],[0,"\\n"],[7,"div",true],[10,"class","table-footer"],[8],[0,"\\n  "],[7,"div",true],[10,"class","pull-right"],[8],[0,"\\n    "],[1,[28,"d-button",null,[["id","action","actionParam","icon","title","label"],["create-channel",[28,"action",[[23,0,[]],"createChannel"],null],[24,["model","provider"]],"plus","chat_integration.create_channel","chat_integration.create_channel"]]],false],[0,"\\n  "],[9],[0,"\\n"],[9],[0,"\\n"]],"hasEval":false}',meta:{moduleName:"javascripts/discourse/templates/admin/plugins-chat-provider"}}),define("discourse/plugins/discourse-chat-integration/admin/models/channel",["exports","discourse/models/rest"],function(e,t){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;t=t.default.extend({updateProperties:function(){return this.getProperties(["data"])},createProperties:function(){return this.getProperties(["provider","data"])}});e.default=t}),define("discourse/plugins/discourse-chat-integration/admin/models/provider",["exports","discourse/models/rest"],function(e,t){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;t=t.default.extend({});e.default=t}),define("discourse/plugins/discourse-chat-integration/admin/models/rule",["exports","I18n","discourse/models/rest","discourse/models/category","discourse-common/utils/decorators"],function(e,n,t,a,i){"use strict";var l,r,o;function s(n,a,e,t,i){var l={};return Object.keys(t).forEach(function(e){l[e]=t[e]}),l.enumerable=!!l.enumerable,l.configurable=!!l.configurable,("value"in l||l.initializer)&&(l.writable=!0),l=e.slice().reverse().reduce(function(e,t){return t(n,a,e)||e},l),i&&void 0!==l.initializer&&(l.value=l.initializer?l.initializer.call(i):void 0,l.initializer=void 0),void 0===l.initializer&&(Object.defineProperty(n,a,l),l=null),l}Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;i=t.default.extend((l=(0,i.default)("channel.provider"),r=(0,i.observes)("type"),o=(0,i.default)("category_id"),t=(0,i.default)("filter"),s(i={available_filters:function(e){var t=[];return"slack"===e&&t.push({id:"thread",name:n.default.t("chat_integration.filter.thread"),icon:"chevron-right"}),t.push({id:"watch",name:n.default.t("chat_integration.filter.watch"),icon:"exclamation-circle"},{id:"follow",name:n.default.t("chat_integration.filter.follow"),icon:"circle"},{id:"mute",name:n.default.t("chat_integration.filter.mute"),icon:"times-circle"}),t},available_types:[{id:"normal",name:n.default.t("chat_integration.type.normal")},{id:"group_message",name:n.default.t("chat_integration.type.group_message")},{id:"group_mention",name:n.default.t("chat_integration.type.group_mention")}],category_id:null,tags:null,channel_id:null,filter:"watch",type:"normal",error_key:null,removeUnneededInfo:function(){"normal"===this.get("type")?this.set("group_id",null):this.set("category_id",null)},category:function(e){return!!e&&a.default.findById(e)},filterName:function(e){return n.default.t("chat_integration.filter.".concat(e))},updateProperties:function(){return this.getProperties(["type","category_id","group_id","tags","filter"])},createProperties:function(){return this.getProperties(["type","channel_id","category_id","group_id","tags","filter"])}},"available_filters",[l],Object.getOwnPropertyDescriptor(i,"available_filters"),i),s(i,"removeUnneededInfo",[r],Object.getOwnPropertyDescriptor(i,"removeUnneededInfo"),i),s(i,"category",[o],Object.getOwnPropertyDescriptor(i,"category"),i),s(i,"filterName",[t],Object.getOwnPropertyDescriptor(i,"filterName"),i),i));e.default=i}),define("discourse/plugins/discourse-chat-integration/admin/routes/admin-plugins-chat-provider",["exports","discourse/routes/discourse","discourse/models/group"],function(e,t,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;t=t.default.extend({model:function(e){var n=this;return Ember.RSVP.hash({channels:this.store.findAll("channel",{provider:e.provider}),provider:this.modelFor("admin-plugins-chat").findBy("id",e.provider),groups:a.default.findAll().then(function(e){return e.filter(function(e){return!e.get("automatic")})})}).then(function(e){return e.channels.forEach(function(t){t.set("rules",t.rules.map(function(e){return(e=n.store.createRecord("rule",e)).set("channel",t),e}))}),e})},serialize:function(e){return{provider:e.provider.get("id")}},actions:{closeModal:function(){return this.get("controller.modalShowing")&&(this.refresh(),this.set("controller.modalShowing",!1)),!0},refreshProvider:function(){this.refresh()}}});e.default=t}),define("discourse/plugins/discourse-chat-integration/admin/routes/admin-plugins-chat-index",["exports","discourse/routes/discourse"],function(e,t){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;t=t.default.extend({afterModel:function(e){0<e.totalRows&&this.transitionTo("adminPlugins.chat.provider",e.get("firstObject").name)}});e.default=t}),define("discourse/plugins/discourse-chat-integration/admin/routes/admin-plugins-chat",["exports","discourse/routes/discourse"],function(e,t){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;t=t.default.extend({model:function(){return this.store.findAll("provider")},actions:{showSettings:function(){this.transitionTo("adminSiteSettingsCategory","plugins",{queryParams:{filter:"chat_integration"}})}}});e.default=t}),define("discourse/plugins/discourse-chat-integration/admin/adapters/channel",["exports","admin/adapters/build-plugin"],function(e,t){"use strict";Object.defineProperty(e,"__esModule",{value:!0});t=(e.default=void 0,t.default)("chat");e.default=t}),define("discourse/plugins/discourse-chat-integration/admin/adapters/provider",["exports","admin/adapters/build-plugin"],function(e,t){"use strict";Object.defineProperty(e,"__esModule",{value:!0});t=(e.default=void 0,t.default)("chat");e.default=t}),define("discourse/plugins/discourse-chat-integration/admin/adapters/rule",["exports","admin/adapters/build-plugin"],function(e,t){"use strict";Object.defineProperty(e,"__esModule",{value:!0});t=(e.default=void 0,t.default)("chat");e.default=t}),define("discourse/plugins/discourse-chat-integration/admin/components/channel-details",["exports","discourse/lib/ajax-error","I18n"],function(e,a,i){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;var t=Ember.Component.extend({classNames:["channel-details"],actions:{deleteChannel:function(t){var n=this;bootbox.confirm(i.default.t("chat_integration.channel_delete_confirm"),i.default.t("no_value"),i.default.t("yes_value"),function(e){e&&t.destroyRecord().then(function(){return n.refresh()}).catch(a.popupAjaxError)})},editRule:function(e){this.editRuleWithChannel(e,this.get("channel"))}}});e.default=t}),define("discourse/plugins/discourse-chat-integration/admin/components/rule-row",["exports","discourse/lib/ajax-error","discourse-common/utils/decorators"],function(e,n,t){"use strict";var a,i,l;function r(n,a,e,t,i){var l={};return Object.keys(t).forEach(function(e){l[e]=t[e]}),l.enumerable=!!l.enumerable,l.configurable=!!l.configurable,("value"in l||l.initializer)&&(l.writable=!0),l=e.slice().reverse().reduce(function(e,t){return t(n,a,e)||e},l),i&&void 0!==l.initializer&&(l.value=l.initializer?l.initializer.call(i):void 0,l.initializer=void 0),void 0===l.initializer&&(Object.defineProperty(n,a,l),l=null),l}Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;t=Ember.Component.extend((a=(0,t.default)("rule.type"),i=(0,t.default)("rule.type"),l=(0,t.default)("rule.type"),r(t={tagName:"tr",isCategory:function(e){return"normal"===e},isMessage:function(e){return"group_message"===e},isMention:function(e){return"group_mention"===e},actions:{delete:function(e){var t=this;e.destroyRecord().then(function(){return t.refresh()}).catch(n.popupAjaxError)}}},"isCategory",[a],Object.getOwnPropertyDescriptor(t,"isCategory"),t),r(t,"isMessage",[i],Object.getOwnPropertyDescriptor(t,"isMessage"),t),r(t,"isMention",[l],Object.getOwnPropertyDescriptor(t,"isMention"),t),t));e.default=t}),define("discourse/plugins/discourse-chat-integration/admin/components/channel-data",["exports"],function(e){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;var t=Ember.Component.extend({classNames:["channel-info"]});e.default=t}),define("discourse/plugins/discourse-chat-integration/admin/chat-route-map",["exports"],function(e){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;e.default={resource:"admin.adminPlugins",path:"/plugins",map:function(){this.route("chat",function(){this.route("provider",{path:"/:provider"})})}}}),Ember.TEMPLATES["javascripts/admin/templates/modal/admin-plugins-chat-edit-channel"]=Ember.HTMLBars.template({id:null,block:'{"symbols":["param"],"statements":[[4,"d-modal-body",null,[["id","title"],["chat-integration-edit-channel-modal","chat_integration.edit_channel_modal.title"]],{"statements":[[0,"  "],[7,"div",true],[8],[0,"\\n    "],[7,"form",false],[3,"action",[[23,0,[]],"save"],[["on"],["submit"]]],[8],[0,"\\n      "],[7,"table",true],[8],[0,"\\n\\n        "],[7,"tr",true],[10,"class","input"],[8],[0,"\\n          "],[7,"td",true],[10,"class","label"],[8],[7,"label",true],[10,"for","provider"],[8],[1,[28,"i18n",["chat_integration.edit_channel_modal.provider"],null],false],[9],[9],[0,"\\n          "],[7,"td",true],[8],[0,"\\n            "],[1,[28,"i18n",[[28,"concat",["chat_integration.provider.",[24,["model","channel","provider"]],".title"],null]],null],false],[0,"\\n          "],[9],[0,"\\n        "],[9],[0,"\\n        "],[7,"tr",true],[10,"class","instructions"],[8],[0,"\\n          "],[7,"td",true],[8],[9],[0,"\\n          "],[7,"td",true],[8],[9],[0,"\\n        "],[9],[0,"\\n\\n"],[4,"each",[[24,["model","provider","channel_parameters"]]],null,{"statements":[[0,"          "],[7,"tr",true],[10,"class","input"],[8],[0,"\\n            "],[7,"td",true],[10,"class","label"],[8],[7,"label",true],[11,"for",[29,["param-",[23,1,["key"]]]]],[8],[1,[28,"i18n",[[28,"concat",["chat_integration.provider.",[24,["model","channel","provider"]],".param.",[23,1,["key"]],".title"],null]],null],false],[9],[9],[0,"\\n            "],[7,"td",true],[8],[0,"\\n              "],[1,[28,"text-field",null,[["name","value"],[[28,"concat",["param-",[23,1,["key"]]],null],[28,"mut",[[28,"get",[[24,["model","channel","data"]],[23,1,["key"]]],null]],null]]]],false],[0,"\\n\\n               \\n"],[4,"if",[[28,"get",[[24,["model","channel","data"]],[23,1,["key"]]],null]],null,{"statements":[[0,"                "],[1,[28,"input-tip",null,[["validation"],[[28,"get",[[24,["paramValidation"]],[23,1,["key"]]],null]]]],false],[0,"\\n"]],"parameters":[]},null],[0,"            "],[9],[0,"\\n          "],[9],[0,"\\n          "],[7,"tr",true],[10,"class","instructions"],[8],[0,"\\n            "],[7,"td",true],[8],[9],[0,"\\n            "],[7,"td",true],[8],[7,"label",true],[8],[1,[28,"i18n",[[28,"concat",["chat_integration.provider.",[24,["model","channel","provider"]],".param.",[23,1,["key"]],".help"],null]],null],false],[9],[9],[0,"\\n          "],[9],[0,"\\n"]],"parameters":[1]},null],[0,"      "],[9],[0,"\\n\\n    "],[9],[0,"\\n  "],[9],[0,"\\n"]],"parameters":[]},null],[0,"\\n"],[7,"div",true],[10,"class","modal-footer"],[8],[0,"\\n  "],[1,[28,"d-button",null,[["id","class","action","title","label","disabled"],["save-channel","btn-primary btn-large","save","chat_integration.edit_channel_modal.save","chat_integration.edit_channel_modal.save",[24,["saveDisabled"]]]]],false],[0,"\\n\\n  "],[1,[28,"d-button",null,[["class","action","title","label"],["btn-large","cancel","chat_integration.edit_channel_modal.cancel","chat_integration.edit_channel_modal.cancel"]]],false],[0,"\\n"],[9],[0,"\\n"]],"hasEval":false}',meta:{moduleName:"javascripts/admin/templates/modal/admin-plugins-chat-edit-channel"}}),Ember.TEMPLATES["javascripts/admin/templates/modal/admin-plugins-chat-test"]=Ember.HTMLBars.template({id:null,block:'{"symbols":[],"statements":[[4,"d-modal-body",null,[["id","title"],["chat_integration_test_modal","chat_integration.test_modal.title"]],{"statements":[[0,"  "],[7,"div",true],[8],[0,"\\n    "],[7,"form",false],[3,"action",[[23,0,[]],"send"],[["on"],["submit"]]],[8],[0,"\\n      "],[7,"table",true],[8],[0,"\\n        "],[7,"tr",true],[10,"class","input"],[8],[0,"\\n          "],[7,"td",true],[10,"class","label"],[8],[7,"label",true],[10,"for","channel"],[8],[1,[28,"i18n",["chat_integration.test_modal.topic"],null],false],[9],[9],[0,"\\n          "],[7,"td",true],[8],[0,"\\n            "],[1,[28,"choose-topic",null,[["selectedTopicId"],[[24,["model","topic_id"]]]]],false],[0,"\\n          "],[9],[0,"\\n        "],[9],[0,"\\n      "],[9],[0,"\\n    "],[9],[0,"\\n  "],[9],[0,"\\n"]],"parameters":[]},null],[0,"\\n"],[7,"div",true],[10,"class","modal-footer"],[8],[0,"\\n"],[4,"conditional-loading-spinner",null,[["condition"],[[24,["loading"]]]],{"statements":[[0,"    "],[1,[28,"d-button",null,[["id","class","action","title","label","disabled"],["send-test","btn-primary btn-large",[28,"action",[[23,0,[]],"send"],null],"chat_integration.test_modal.send","chat_integration.test_modal.send",[24,["sendDisabled"]]]]],false],[0,"\\n\\n    "],[1,[28,"d-button",null,[["class","action","title","label"],["btn-large",[28,"route-action",["closeModal"],null],"chat_integration.test_modal.close","chat_integration.test_modal.close"]]],false],[0,"\\n"]],"parameters":[]},null],[9],[0,"\\n"]],"hasEval":false}',meta:{moduleName:"javascripts/admin/templates/modal/admin-plugins-chat-test"}}),Ember.TEMPLATES["javascripts/admin/templates/modal/admin-plugins-chat-channel-error"]=Ember.HTMLBars.template({id:null,block:'{"symbols":[],"statements":[[4,"d-modal-body",null,[["id"],["chat_integration_error_modal"]],{"statements":[[0,"    "],[7,"h4",true],[8],[1,[28,"i18n",[[24,["model","error_key"]]],null],false],[9],[0,"\\n    "],[7,"pre",true],[8],[1,[24,["model","error_info"]],false],[9],[0,""]],"parameters":[]},null]],"hasEval":false}',meta:{moduleName:"javascripts/admin/templates/modal/admin-plugins-chat-channel-error"}}),Ember.TEMPLATES["javascripts/admin/templates/modal/admin-plugins-chat-edit-rule"]=Ember.HTMLBars.template({id:null,block:'{"symbols":[],"statements":[[4,"d-modal-body",null,[["id","title"],["chat-integration-edit-rule_modal","chat_integration.edit_rule_modal.title"]],{"statements":[[0,"  "],[7,"div",true],[8],[0,"\\n    "],[7,"form",false],[3,"action",[[23,0,[]],"save"],[["on"],["submit"]]],[8],[0,"\\n      "],[7,"table",true],[8],[0,"\\n\\n        "],[7,"tr",true],[10,"class","input"],[8],[0,"\\n          "],[7,"td",true],[10,"class","label"],[8],[7,"label",true],[10,"for","provider"],[8],[1,[28,"i18n",["chat_integration.edit_rule_modal.provider"],null],false],[9],[9],[0,"\\n          "],[7,"td",true],[8],[0,"\\n            "],[1,[28,"i18n",[[28,"concat",["chat_integration.provider.",[24,["model","channel","provider"]],".title"],null]],null],false],[0,"\\n          "],[9],[0,"\\n        "],[9],[0,"\\n        "],[7,"tr",true],[10,"class","instructions"],[8],[0,"\\n          "],[7,"td",true],[8],[9],[0,"\\n          "],[7,"td",true],[8],[9],[0,"\\n        "],[9],[0,"\\n\\n        "],[7,"tr",true],[10,"class","input"],[8],[0,"\\n          "],[7,"td",true],[10,"class","label"],[8],[7,"label",true],[10,"for","channel"],[8],[1,[28,"i18n",["chat_integration.edit_rule_modal.channel"],null],false],[9],[9],[0,"\\n          "],[7,"td",true],[8],[0,"\\n            "],[1,[28,"channel-data",null,[["provider","channel"],[[24,["model","provider"]],[24,["model","channel"]]]]],false],[0,"\\n          "],[9],[0,"\\n        "],[9],[0,"\\n        "],[7,"tr",true],[10,"class","instructions"],[8],[0,"\\n          "],[7,"td",true],[8],[9],[0,"\\n          "],[7,"td",true],[8],[9],[0,"\\n        "],[9],[0,"\\n\\n        "],[7,"tr",true],[10,"class","input"],[8],[0,"\\n          "],[7,"td",true],[10,"class","label"],[8],[7,"label",true],[10,"for","filter"],[8],[1,[28,"i18n",["chat_integration.edit_rule_modal.type"],null],false],[9],[9],[0,"\\n          "],[7,"td",true],[8],[0,"\\n            "],[1,[28,"combo-box",null,[["name","content","value"],["type",[24,["model","rule","available_types"]],[24,["model","rule","type"]]]]],false],[0,"\\n          "],[9],[0,"\\n        "],[9],[0,"\\n        "],[7,"tr",true],[10,"class","instructions"],[8],[0,"\\n          "],[7,"td",true],[8],[9],[0,"\\n          "],[7,"td",true],[8],[7,"label",true],[8],[1,[28,"i18n",["chat_integration.edit_rule_modal.instructions.type"],null],false],[9],[9],[0,"\\n        "],[9],[0,"\\n\\n        "],[7,"tr",true],[10,"class","input"],[8],[0,"\\n          "],[7,"td",true],[10,"class","label"],[8],[7,"label",true],[10,"for","filter"],[8],[1,[28,"i18n",["chat_integration.edit_rule_modal.filter"],null],false],[9],[9],[0,"\\n          "],[7,"td",true],[8],[0,"\\n            "],[1,[28,"combo-box",null,[["name","content","value"],["filter",[24,["model","rule","available_filters"]],[24,["model","rule","filter"]]]]],false],[0,"\\n          "],[9],[0,"\\n        "],[9],[0,"\\n        "],[7,"tr",true],[10,"class","instructions"],[8],[0,"\\n          "],[7,"td",true],[8],[9],[0,"\\n          "],[7,"td",true],[8],[7,"label",true],[8],[1,[28,"i18n",["chat_integration.edit_rule_modal.instructions.filter"],null],false],[9],[9],[0,"\\n        "],[9],[0,"\\n\\n"],[4,"if",[[24,["showCategory"]]],null,{"statements":[[0,"          "],[7,"tr",true],[10,"class","input"],[8],[0,"\\n            "],[7,"td",true],[10,"class","label"],[8],[7,"label",true],[10,"for","category"],[8],[1,[28,"i18n",["chat_integration.edit_rule_modal.category"],null],false],[9],[9],[0,"\\n            "],[7,"td",true],[8],[0,"\\n              "],[1,[28,"category-chooser",null,[["name","value","rootNoneLabel","rootNone","overrideWidths"],["category",[24,["model","rule","category_id"]],"chat_integration.all_categories",true,false]]],false],[0,"\\n            "],[9],[0,"\\n          "],[9],[0,"\\n          "],[7,"tr",true],[10,"class","instructions"],[8],[0,"\\n            "],[7,"td",true],[8],[9],[0,"\\n            "],[7,"td",true],[8],[7,"label",true],[8],[1,[28,"i18n",["chat_integration.edit_rule_modal.instructions.category"],null],false],[9],[9],[0,"\\n          "],[9],[0,"\\n"]],"parameters":[]},{"statements":[[0,"          "],[7,"tr",true],[10,"class","input"],[8],[0,"\\n            "],[7,"td",true],[10,"class","label"],[8],[7,"label",true],[10,"for","group"],[8],[1,[28,"i18n",["chat_integration.edit_rule_modal.group"],null],false],[9],[9],[0,"\\n            "],[7,"td",true],[8],[0,"\\n              "],[1,[28,"combo-box",null,[["content","valueAttribute","value","none"],[[24,["model","groups"]],"id",[24,["model","rule","group_id"]],"chat_integration.choose_group"]]],false],[0,"\\n            "],[9],[0,"\\n          "],[9],[0,"\\n          "],[7,"tr",true],[10,"class","instructions"],[8],[0,"\\n            "],[7,"td",true],[8],[9],[0,"\\n            "],[7,"td",true],[8],[7,"label",true],[8],[1,[28,"i18n",["chat_integration.edit_rule_modal.instructions.group"],null],false],[9],[9],[0,"\\n          "],[9],[0,"\\n"]],"parameters":[]}],[0,"\\n"],[4,"if",[[24,["siteSettings","tagging_enabled"]]],null,{"statements":[[0,"          "],[7,"tr",true],[10,"class","input"],[8],[0,"\\n            "],[7,"td",true],[10,"class","label"],[8],[7,"label",true],[10,"for","tags"],[8],[1,[28,"i18n",["chat_integration.edit_rule_modal.tags"],null],false],[9],[9],[0,"\\n            "],[7,"td",true],[8],[0,"\\n              "],[1,[28,"tag-chooser",null,[["placeholderKey","name","tags","everyTag"],["chat_integration.all_tags","tags",[24,["model","rule","tags"]],true]]],false],[0,"\\n            "],[9],[0,"\\n          "],[9],[0,"\\n          "],[7,"tr",true],[10,"class","instructions"],[8],[0,"\\n            "],[7,"td",true],[8],[9],[0,"\\n            "],[7,"td",true],[8],[7,"label",true],[8],[1,[28,"i18n",["chat_integration.edit_rule_modal.instructions.tags"],null],false],[9],[9],[0,"\\n          "],[9],[0,"\\n"]],"parameters":[]},null],[0,"\\n      "],[9],[0,"\\n\\n    "],[9],[0,"\\n  "],[9],[0,"\\n"]],"parameters":[]},null],[0,"\\n"],[7,"div",true],[10,"class","modal-footer"],[8],[0,"\\n  "],[1,[28,"d-button",null,[["id","class","action","actionParam","title","label","disabled"],["save-rule","btn-primary btn-large","save",[24,["model","rule"]],"chat_integration.edit_rule_modal.save","chat_integration.edit_rule_modal.save",[24,["saveDisabled"]]]]],false],[0,"\\n\\n  "],[1,[28,"d-button",null,[["class","action","title","label"],["btn-large",[28,"route-action",["closeModal"],null],"chat_integration.edit_rule_modal.cancel","chat_integration.edit_rule_modal.cancel"]]],false],[0,"\\n"],[9],[0,"\\n"]],"hasEval":false}',meta:{moduleName:"javascripts/admin/templates/modal/admin-plugins-chat-edit-rule"}}),define("discourse/plugins/discourse-chat-integration/admin/controllers/admin-plugins-chat-provider",["exports","discourse/lib/show-modal","discourse-common/utils/decorators"],function(e,n,t){"use strict";var a;Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;var i,l,r,o,s,u,t=Ember.Controller.extend((a=(0,t.default)("model.channels"),i=t={modalShowing:!1,anyErrors:function(e){var t=!1;return e.forEach(function(e){e.error_key&&(t=!0)}),t},actions:{createChannel:function(){this.set("modalShowing",!0);var e={channel:this.store.createRecord("channel",{provider:this.get("model.provider.id"),data:{}}),provider:this.get("model.provider")};(0,n.default)("admin-plugins-chat-edit-channel",{model:e,admin:!0})},editChannel:function(e){this.set("modalShowing",!0);e={channel:e,provider:this.get("model.provider")};(0,n.default)("admin-plugins-chat-edit-channel",{model:e,admin:!0})},testChannel:function(e){this.set("modalShowing",!0),(0,n.default)("admin-plugins-chat-test",{model:{channel:e},admin:!0})},createRule:function(e){this.set("modalShowing",!0);e={rule:this.store.createRecord("rule",{channel_id:e.id,channel:e}),channel:e,provider:this.get("model.provider"),groups:this.get("model.groups")};(0,n.default)("admin-plugins-chat-edit-rule",{model:e,admin:!0})},editRuleWithChannel:function(e,t){this.set("modalShowing",!0);t={rule:e,channel:t,provider:this.get("model.provider"),groups:this.get("model.groups")};(0,n.default)("admin-plugins-chat-edit-rule",{model:t,admin:!0})},showError:function(e){this.set("modalShowing",!0),(0,n.default)("admin-plugins-chat-channel-error",{model:e,admin:!0})}}},l="anyErrors",r=[a],o=Object.getOwnPropertyDescriptor(t,"anyErrors"),s=t,u={},Object.keys(o).forEach(function(e){u[e]=o[e]}),u.enumerable=!!u.enumerable,u.configurable=!!u.configurable,("value"in u||u.initializer)&&(u.writable=!0),u=r.slice().reverse().reduce(function(e,t){return t(i,l,e)||e},u),s&&void 0!==u.initializer&&(u.value=u.initializer?u.initializer.call(s):void 0,u.initializer=void 0),void 0===u.initializer&&(Object.defineProperty(i,l,u),u=null),t));e.default=t}),define("discourse/plugins/discourse-chat-integration/admin/controllers/modals/admin-plugins-chat-test",["exports","I18n","discourse/mixins/modal-functionality","discourse/lib/ajax","discourse/lib/ajax-error","discourse-common/utils/decorators"],function(e,t,n,a,i,l){"use strict";var r;function o(n,a,e,t,i){var l={};return Object.keys(t).forEach(function(e){l[e]=t[e]}),l.enumerable=!!l.enumerable,l.configurable=!!l.configurable,("value"in l||l.initializer)&&(l.writable=!0),l=e.slice().reverse().reduce(function(e,t){return t(n,a,e)||e},l),i&&void 0!==l.initializer&&(l.value=l.initializer?l.initializer.call(i):void 0,l.initializer=void 0),void 0===l.initializer&&(Object.defineProperty(n,a,l),l=null),l}Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;l=Ember.Controller.extend(n.default,(r=(0,l.on)("init"),n=(0,l.default)("model.topic_id"),o(l={setupKeydown:function(){var t=this;Ember.run.schedule("afterRender",function(){$("#chat_integration_test_modal").keydown(function(e){13===e.keyCode&&t.send("send")})})},sendDisabled:function(e){return!e},actions:{send:function(){var e=this;this.get("sendDisabled")||(this.set("loading",!0),(0,a.ajax)("/admin/plugins/chat/test",{data:{channel_id:this.get("model.channel.id"),topic_id:this.get("model.topic_id")},type:"POST"}).then(function(){e.set("loading",!1),e.flash(t.default.t("chat_integration.test_modal.success"),"success")}).catch(i.popupAjaxError))}}},"setupKeydown",[r],Object.getOwnPropertyDescriptor(l,"setupKeydown"),l),o(l,"sendDisabled",[n],Object.getOwnPropertyDescriptor(l,"sendDisabled"),l),l));e.default=l}),define("discourse/plugins/discourse-chat-integration/admin/controllers/modals/admin-plugins-chat-edit-channel",["exports","I18n","discourse/mixins/modal-functionality","discourse/lib/ajax-error","discourse/models/input-validation","discourse-common/utils/decorators"],function(e,a,t,n,i,l){"use strict";var r,o;function s(n,a,e,t,i){var l={};return Object.keys(t).forEach(function(e){l[e]=t[e]}),l.enumerable=!!l.enumerable,l.configurable=!!l.configurable,("value"in l||l.initializer)&&(l.writable=!0),l=e.slice().reverse().reduce(function(e,t){return t(n,a,e)||e},l),i&&void 0!==l.initializer&&(l.value=l.initializer?l.initializer.call(i):void 0,l.initializer=void 0),void 0===l.initializer&&(Object.defineProperty(n,a,l),l=null),l}Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;l=Ember.Controller.extend(t.default,(r=(0,l.on)("init"),o=(0,l.observes)("model"),t=(0,l.default)("paramValidation"),s(l={setupKeydown:function(){var t=this;Ember.run.schedule("afterRender",function(){$("#chat-integration-edit-channel-modal").keydown(function(e){13===e.keyCode&&t.send("save")})})},setupValidations:function(){var e;this.get("model.provider")&&(e=this.get("model.provider.channel_parameters").map(function(e){return e.key}),Ember.defineProperty(this,"paramValidation",Ember.computed("model.channel.data.{".concat(e.join(","),"}"),this._paramValidation)))},validate:function(e){var t=e.regex,n=new RegExp(t),e=this.get("model.channel.data.".concat(e.key));return void 0===e&&(e=""),""===e?i.default.create({failed:!0}):t?n.test(e)?i.default.create({ok:!0,reason:a.default.t("chat_integration.edit_channel_modal.channel_validation.ok")}):i.default.create({failed:!0,reason:a.default.t("chat_integration.edit_channel_modal.channel_validation.fail")}):i.default.create({ok:!0})},_paramValidation:function(){var t=this,n={};return this.get("model.provider.channel_parameters").forEach(function(e){n[e.key]=t.validate(e)}),n},saveDisabled:function(t){if(!t)return!0;var n=!1;return Object.keys(t).forEach(function(e){t[e]||(n=!0),t[e].ok||(n=!0)}),n},actions:{cancel:function(){this.send("closeModal")},save:function(){var e=this;this.get("saveDisabled")||this.get("model.channel").save().then(function(){e.send("closeModal")}).catch(n.popupAjaxError)}}},"setupKeydown",[r],Object.getOwnPropertyDescriptor(l,"setupKeydown"),l),s(l,"setupValidations",[o],Object.getOwnPropertyDescriptor(l,"setupValidations"),l),s(l,"saveDisabled",[t],Object.getOwnPropertyDescriptor(l,"saveDisabled"),l),l));e.default=l}),define("discourse/plugins/discourse-chat-integration/admin/controllers/modals/admin-plugins-chat-edit-rule",["exports","discourse/mixins/modal-functionality","discourse/lib/ajax-error","discourse-common/utils/decorators"],function(e,t,n,a){"use strict";var i;function l(n,a,e,t,i){var l={};return Object.keys(t).forEach(function(e){l[e]=t[e]}),l.enumerable=!!l.enumerable,l.configurable=!!l.configurable,("value"in l||l.initializer)&&(l.writable=!0),l=e.slice().reverse().reduce(function(e,t){return t(n,a,e)||e},l),i&&void 0!==l.initializer&&(l.value=l.initializer?l.initializer.call(i):void 0,l.initializer=void 0),void 0===l.initializer&&(Object.defineProperty(n,a,l),l=null),l}Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;a=Ember.Controller.extend(t.default,(i=(0,a.on)("init"),t=(0,a.default)("model.rule.type"),l(a={saveDisabled:!1,setupKeydown:function(){var t=this;Ember.run.schedule("afterRender",function(){$("#chat-integration-edit-channel-modal").keydown(function(e){13===e.keyCode&&t.send("save")})})},showCategory:function(e){return"normal"===e},actions:{save:function(e){var t=this;this.get("saveDisabled")||e.save().then(function(){return t.send("closeModal")}).catch(n.popupAjaxError)}}},"setupKeydown",[i],Object.getOwnPropertyDescriptor(a,"setupKeydown"),a),l(a,"showCategory",[t],Object.getOwnPropertyDescriptor(a,"showCategory"),a),a));e.default=a}),define("discourse/plugins/discourse-chat-integration/admin/controllers/admin-plugins-chat",["exports"],function(e){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;var t=Ember.Controller.extend({});e.default=t});
//# sourceMappingURL=/assets/plugins/discourse-chat-integration-c1fb9eb2136c61b94403f0488fc31a68ab3648a561ea02dc50837623071e05fd.js.map
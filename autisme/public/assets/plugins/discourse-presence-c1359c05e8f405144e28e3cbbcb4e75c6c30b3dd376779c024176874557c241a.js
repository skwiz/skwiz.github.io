define("discourse/plugins/discourse-presence/discourse/components/composer-presence-display",["exports","discourse-common/utils/decorators","@ember/object/computed","@ember/component","@ember/service"],(function(e,t,n,r,s){"use strict";var i,l,a,o,c,u,p,h,d,m;function f(e,t,n,r,s){var i={};return Object.keys(r).forEach((function(e){i[e]=r[e]})),i.enumerable=!!i.enumerable,i.configurable=!!i.configurable,("value"in i||i.initializer)&&(i.writable=!0),i=n.slice().reverse().reduce((function(n,r){return r(e,t,n)||n}),i),s&&void 0!==i.initializer&&(i.value=i.initializer?i.initializer.call(s):void 0,i.initializer=void 0),void 0===i.initializer&&(Object.defineProperty(e,t,i),i=null),i}Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;var v=r.default.extend((i=(0,t.default)("model.replyingToTopic","model.editingPost","model.whisper","model.composerOpened"),l=(0,t.default)("model.topic.id","isReply","isWhisper"),a=(0,t.default)("model.topic.id","isReply","isWhisper"),o=(0,t.default)("isEdit","model.post.id"),c=(0,t.observes)("replyChannelName","whisperChannelName","editChannelName"),u=(0,t.default)("isReply","replyingUsers.[]","editingUsers.[]"),p=(0,t.on)("didInsertElement"),h=(0,t.observes)("model.reply","state","model.post.id","model.topic.id"),d=(0,t.on)("willDestroyElement"),f(m={presence:(0,s.inject)(),composerPresenceManager:(0,s.inject)(),state:function(e,t,n,r){if(r)return t?"edit":n?"whisper":e?"reply":void 0},isReply:(0,n.equal)("state","reply"),isEdit:(0,n.equal)("state","edit"),isWhisper:(0,n.equal)("state","whisper"),replyChannelName:function(e,t,n){if(e&&(t||n))return"/discourse-presence/reply/".concat(e)},whisperChannelName:function(e,t,n){if(e&&this.currentUser.staff&&(t||n))return"/discourse-presence/whisper/".concat(e)},editChannelName:function(e,t){if(e)return"/discourse-presence/edit/".concat(t)},_setupChannel:function(e,t){var n,r;(null===(n=this[e])||void 0===n?void 0:n.name)!==t&&(null===(r=this[e])||void 0===r||r.unsubscribe(),t?(this.set(e,this.presence.getChannel(t)),this[e].subscribe()):this[e]&&this.set(e,null))},_setupChannels:function(){this._setupChannel("replyChannel",this.replyChannelName),this._setupChannel("whisperChannel",this.whisperChannelName),this._setupChannel("editChannel",this.editChannelName)},_cleanupChannels:function(){this._setupChannel("replyChannel",null),this._setupChannel("whisperChannel",null),this._setupChannel("editChannel",null)},replyingUsers:(0,n.union)("replyChannel.users","whisperChannel.users"),editingUsers:(0,n.readOnly)("editChannel.users"),presenceUsers:function(e,t,n){var r,s=this,i=e?t:n;return null==i||null===(r=i.filter((function(e){return e.id!==s.currentUser.id})))||void 0===r?void 0:r.slice(0,this.siteSettings.presence_max_users_shown)},shouldDisplay:(0,n.gt)("presenceUsers.length",0),subscribe:function(){this._setupChannels()},_contentChanged:function(){var e,t;if(""!==this.model.reply){var n="edit"===this.state?null===(e=this.model)||void 0===e?void 0:e.post:null===(t=this.model)||void 0===t?void 0:t.topic;this.composerPresenceManager.notifyState(this.state,null==n?void 0:n.id)}},closeComposer:function(){this._cleanupChannels(),this.composerPresenceManager.leave()}},"state",[i],Object.getOwnPropertyDescriptor(m,"state"),m),f(m,"replyChannelName",[l],Object.getOwnPropertyDescriptor(m,"replyChannelName"),m),f(m,"whisperChannelName",[a],Object.getOwnPropertyDescriptor(m,"whisperChannelName"),m),f(m,"editChannelName",[o],Object.getOwnPropertyDescriptor(m,"editChannelName"),m),f(m,"_setupChannels",[c],Object.getOwnPropertyDescriptor(m,"_setupChannels"),m),f(m,"presenceUsers",[u],Object.getOwnPropertyDescriptor(m,"presenceUsers"),m),f(m,"subscribe",[p],Object.getOwnPropertyDescriptor(m,"subscribe"),m),f(m,"_contentChanged",[h],Object.getOwnPropertyDescriptor(m,"_contentChanged"),m),f(m,"closeComposer",[d],Object.getOwnPropertyDescriptor(m,"closeComposer"),m),m));e.default=v})),define("discourse/plugins/discourse-presence/discourse/components/topic-presence-display",["exports","discourse-common/utils/decorators","@ember/component","@ember/object/computed","@ember/service"],(function(e,t,n,r,s){"use strict";var i,l,a,o,c,u;function p(e,t,n,r,s){var i={};return Object.keys(r).forEach((function(e){i[e]=r[e]})),i.enumerable=!!i.enumerable,i.configurable=!!i.configurable,("value"in i||i.initializer)&&(i.writable=!0),i=n.slice().reverse().reduce((function(n,r){return r(e,t,n)||n}),i),s&&void 0!==i.initializer&&(i.value=i.initializer?i.initializer.call(s):void 0,i.initializer=void 0),void 0===i.initializer&&(Object.defineProperty(e,t,i),i=null),i}Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;var h=n.default.extend((i=(0,t.default)("replyChannel.users.[]"),l=(0,t.default)("whisperChannel.users.[]"),a=(0,t.default)("topic.id"),o=(0,t.default)("topic.id"),c=(0,t.on)("willDestroyElement"),u={topic:null,presence:(0,s.inject)(),replyChannel:null,whisperChannel:null,replyUsers:function(e){var t=this;return null==e?void 0:e.filter((function(e){return e.id!==t.currentUser.id}))},whisperUsers:function(e){var t=this;return null==e?void 0:e.filter((function(e){return e.id!==t.currentUser.id}))},users:(0,r.union)("replyUsers","whisperUsers"),replyChannelName:function(e){return"/discourse-presence/reply/".concat(e)},whisperChannelName:function(e){return"/discourse-presence/whisper/".concat(e)},shouldDisplay:(0,r.gt)("users.length",0),didReceiveAttrs:function(){var e,t,n,r;(this._super.apply(this,arguments),(null===(e=this.replyChannel)||void 0===e?void 0:e.name)!==this.replyChannelName)&&(null===(n=this.replyChannel)||void 0===n||n.unsubscribe(),this.set("replyChannel",this.presence.getChannel(this.replyChannelName)),this.replyChannel.subscribe());this.currentUser.staff&&(null===(t=this.whisperChannel)||void 0===t?void 0:t.name)!==this.whisperChannelName&&(null===(r=this.whisperChannel)||void 0===r||r.unsubscribe(),this.set("whisperChannel",this.presence.getChannel(this.whisperChannelName)),this.whisperChannel.subscribe())},_destroyed:function(){var e,t;null===(e=this.replyChannel)||void 0===e||e.unsubscribe(),null===(t=this.whisperChannel)||void 0===t||t.unsubscribe()}},p(u,"replyUsers",[i],Object.getOwnPropertyDescriptor(u,"replyUsers"),u),p(u,"whisperUsers",[l],Object.getOwnPropertyDescriptor(u,"whisperUsers"),u),p(u,"replyChannelName",[a],Object.getOwnPropertyDescriptor(u,"replyChannelName"),u),p(u,"whisperChannelName",[o],Object.getOwnPropertyDescriptor(u,"whisperChannelName"),u),p(u,"_destroyed",[c],Object.getOwnPropertyDescriptor(u,"_destroyed"),u),u));e.default=h})),define("discourse/plugins/discourse-presence/discourse/services/composer-presence-manager",["exports","@ember/service","@ember/runloop","discourse-common/config/environment"],(function(e,t,n,r){"use strict";var s,i,l;function a(e){return a="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},a(e)}function o(e,t,n,r){n&&Object.defineProperty(e,t,{enumerable:n.enumerable,configurable:n.configurable,writable:n.writable,value:n.initializer?n.initializer.call(r):void 0})}function c(e,t){if(n=e,!(null!=(r=t)&&"undefined"!=typeof Symbol&&r[Symbol.hasInstance]?r[Symbol.hasInstance](n):n instanceof r))throw new TypeError("Cannot call a class as a function");var n,r}function u(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function p(e,t){return p=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e},p(e,t)}function h(e){var t=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],(function(){}))),!0}catch(e){return!1}}();return function(){var n,r=f(e);if(t){var s=f(this).constructor;n=Reflect.construct(r,arguments,s)}else n=r.apply(this,arguments);return d(this,n)}}function d(e,t){return!t||"object"!==a(t)&&"function"!=typeof t?m(e):t}function m(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function f(e){return f=Object.setPrototypeOf?Object.getPrototypeOf:function(e){return e.__proto__||Object.getPrototypeOf(e)},f(e)}Object.defineProperty(e,"__esModule",{value:!0}),e.default=void 0;var v,y,b,C,w,g,_=(l=function(e){!function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),t&&p(e,t)}(d,e);var t,s,l,a=h(d);function d(){var e;c(this,d);for(var t=arguments.length,n=new Array(t),r=0;r<t;r++)n[r]=arguments[r];return o(m(e=a.call.apply(a,[this].concat(n))),"presence",i,m(e)),e}return t=d,(s=[{key:"notifyState",value:function(e,t){if(!this.siteSettings.allow_users_to_hide_profile||!this.currentUser.hide_profile_and_presence){if(void 0===e)return this.leave();if(!["reply","whisper","edit"].includes(e))throw"Unknown intent ".concat(e);var s="".concat(e,"/").concat(t);this._state!==s&&(this._enter(e,t),this._state=s),(0,r.isTesting)()||(this._autoLeaveTimer=(0,n.debounce)(this,this.leave,1e4))}}},{key:"leave",value:function(){var e;null===(e=this._presentChannel)||void 0===e||e.leave(),this._presentChannel=null,this._state=null,this._autoLeaveTimer&&((0,n.cancel)(this._autoLeaveTimer),this._autoLeaveTimer=null)}},{key:"_enter",value:function(e,t){this.leave();var n="".concat("/discourse-presence","/").concat(e,"/").concat(t);this._presentChannel=this.presence.getChannel(n),this._presentChannel.enter()}},{key:"willDestroy",value:function(){this.leave()}}])&&u(t.prototype,s),l&&u(t,l),d}(t.default),v=(s=l).prototype,y="presence",b=[t.inject],C={configurable:!0,enumerable:!0,writable:!0,initializer:null},g={},Object.keys(C).forEach((function(e){g[e]=C[e]})),g.enumerable=!!g.enumerable,g.configurable=!!g.configurable,("value"in g||g.initializer)&&(g.writable=!0),g=b.slice().reverse().reduce((function(e,t){return t(v,y,e)||e}),g),w&&void 0!==g.initializer&&(g.value=g.initializer?g.initializer.call(w):void 0,g.initializer=void 0),void 0===g.initializer&&(Object.defineProperty(v,y,g),g=null),i=g,s);e.default=_})),Ember.TEMPLATES["javascripts/components/composer-presence-display"]=Ember.HTMLBars.template({id:null,block:'{"symbols":["user"],"statements":[[4,"if",[[24,["shouldDisplay"]]],null,{"statements":[[0,"  "],[7,"div",true],[10,"class","presence-users"],[8],[0,"\\n    "],[7,"div",true],[10,"class","presence-avatars"],[8],[0,"\\n"],[4,"each",[[24,["presenceUsers"]]],null,{"statements":[[0,"        "],[1,[28,"avatar",[[23,1,[]]],[["avatarTemplatePath","usernamePath","imageSize"],["avatar_template","username","small"]]],false],[0,"\\n"]],"parameters":[1]},null],[0,"    "],[9],[0,"\\n    "],[7,"span",true],[10,"class","presence-text"],[8],[0,"\\n      "],[7,"span",true],[10,"class","description"],[8],[0,"\\n"],[4,"if",[[24,["isReply"]]],null,{"statements":[[1,[28,"i18n",["presence.replying"],[["count"],[[24,["presenceUsers","length"]]]]],false]],"parameters":[]},{"statements":[[1,[28,"i18n",["presence.editing"],[["count"],[[24,["presenceUsers","length"]]]]],false]],"parameters":[]}],[0,"      "],[9],[9],[7,"span",true],[10,"class","wave"],[8],[0,"\\n      "],[7,"span",true],[10,"class","dot"],[8],[0,"."],[9],[7,"span",true],[10,"class","dot"],[8],[0,"."],[9],[7,"span",true],[10,"class","dot"],[8],[0,"."],[9],[0,"\\n    "],[9],[0,"\\n  "],[9],[0,"\\n"]],"parameters":[]},null]],"hasEval":false}',meta:{moduleName:"javascripts/discourse/templates/components/composer-presence-display"}}),Ember.TEMPLATES["javascripts/components/topic-presence-display"]=Ember.HTMLBars.template({id:null,block:'{"symbols":["user"],"statements":[[4,"if",[[24,["shouldDisplay"]]],null,{"statements":[[0,"  "],[7,"div",true],[10,"class","presence-users"],[8],[0,"\\n    "],[7,"div",true],[10,"class","presence-avatars"],[8],[0,"\\n"],[4,"each",[[24,["users"]]],null,{"statements":[[0,"        "],[1,[28,"avatar",[[23,1,[]]],[["avatarTemplatePath","usernamePath","imageSize"],["avatar_template","username","small"]]],false],[0,"\\n"]],"parameters":[1]},null],[0,"    "],[9],[0,"\\n    "],[7,"span",true],[10,"class","presence-text"],[8],[0,"\\n      "],[7,"span",true],[10,"class","description"],[8],[1,[28,"i18n",["presence.replying_to_topic"],[["count"],[[24,["users","length"]]]]],false],[9],[7,"span",true],[10,"class","wave"],[8],[7,"span",true],[10,"class","dot"],[8],[0,"."],[9],[7,"span",true],[10,"class","dot"],[8],[0,"."],[9],[7,"span",true],[10,"class","dot"],[8],[0,"."],[9],[9],[0,"\\n    "],[9],[0,"\\n  "],[9],[0,"\\n"]],"parameters":[]},null]],"hasEval":false}',meta:{moduleName:"javascripts/discourse/templates/components/topic-presence-display"}}),Ember.TEMPLATES["javascripts/connectors/composer-fields/presence"]=Ember.HTMLBars.template({id:null,block:'{"symbols":[],"statements":[[1,[28,"composer-presence-display",null,[["model"],[[24,["model"]]]]],false],[0,"\\n"]],"hasEval":false}',meta:{moduleName:"javascripts/discourse/templates/connectors/composer-fields/presence"}}),Ember.TEMPLATES["javascripts/connectors/topic-above-footer-buttons/presence"]=Ember.HTMLBars.template({id:null,block:'{"symbols":[],"statements":[[1,[28,"topic-presence-display",null,[["topic"],[[24,["model"]]]]],false],[0,"\\n"]],"hasEval":false}',meta:{moduleName:"javascripts/discourse/templates/connectors/topic-above-footer-buttons/presence"}});
//# sourceMappingURL=/assets/plugins/discourse-presence-c1359c05e8f405144e28e3cbbcb4e75c6c30b3dd376779c024176874557c241a.js.map
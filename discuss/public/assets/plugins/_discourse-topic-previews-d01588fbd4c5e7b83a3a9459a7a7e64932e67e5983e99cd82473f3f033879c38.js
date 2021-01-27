/*!
 * Masonry PACKAGED v4.2.2
 * Cascading grid layout library
 * https://masonry.desandro.com
 * MIT License
 * by David DeSandro
 */


!function(t,e){"function"==typeof define&&define.amd?define("jquery-bridget/jquery-bridget",["jquery"],function(i){return e(t,i)}):"object"==typeof module&&module.exports?module.exports=e(t,require("jquery")):t.jQueryBridget=e(t,t.jQuery)}(window,function(t,e){"use strict";function i(i,r,a){function h(t,e,n){var o,r="$()."+i+'("'+e+'")';return t.each(function(t,h){var u=a.data(h,i);if(!u)return void s(i+" not initialized. Cannot call methods, i.e. "+r);var d=u[e];if(!d||"_"==e.charAt(0))return void s(r+" is not a valid method");var l=d.apply(u,n);o=void 0===o?l:o}),void 0!==o?o:t}function u(t,e){t.each(function(t,n){var o=a.data(n,i);o?(o.option(e),o._init()):(o=new r(n,e),a.data(n,i,o))})}a=a||e||t.jQuery,a&&(r.prototype.option||(r.prototype.option=function(t){a.isPlainObject(t)&&(this.options=a.extend(!0,this.options,t))}),a.fn[i]=function(t){if("string"==typeof t){var e=o.call(arguments,1);return h(this,t,e)}return u(this,t),this},n(a))}function n(t){!t||t&&t.bridget||(t.bridget=i)}var o=Array.prototype.slice,r=t.console,s="undefined"==typeof r?function(){}:function(t){r.error(t)};return n(e||t.jQuery),i}),function(t,e){"function"==typeof define&&define.amd?define("ev-emitter/ev-emitter",e):"object"==typeof module&&module.exports?module.exports=e():t.EvEmitter=e()}("undefined"!=typeof window?window:this,function(){function t(){}var e=t.prototype;return e.on=function(t,e){if(t&&e){var i=this._events=this._events||{},n=i[t]=i[t]||[];return-1==n.indexOf(e)&&n.push(e),this}},e.once=function(t,e){if(t&&e){this.on(t,e);var i=this._onceEvents=this._onceEvents||{},n=i[t]=i[t]||{};return n[e]=!0,this}},e.off=function(t,e){var i=this._events&&this._events[t];if(i&&i.length){var n=i.indexOf(e);return-1!=n&&i.splice(n,1),this}},e.emitEvent=function(t,e){var i=this._events&&this._events[t];if(i&&i.length){i=i.slice(0),e=e||[];for(var n=this._onceEvents&&this._onceEvents[t],o=0;o<i.length;o++){var r=i[o],s=n&&n[r];s&&(this.off(t,r),delete n[r]),r.apply(this,e)}return this}},e.allOff=function(){delete this._events,delete this._onceEvents},t}),function(t,e){"function"==typeof define&&define.amd?define("get-size/get-size",e):"object"==typeof module&&module.exports?module.exports=e():t.getSize=e()}(window,function(){"use strict";function t(t){var e=parseFloat(t),i=-1==t.indexOf("%")&&!isNaN(e);return i&&e}function e(){}function i(){for(var t={width:0,height:0,innerWidth:0,innerHeight:0,outerWidth:0,outerHeight:0},e=0;u>e;e++){var i=h[e];t[i]=0}return t}function n(t){var e=getComputedStyle(t);return e||a("Style returned "+e+". Are you running this code in a hidden iframe on Firefox? See https://bit.ly/getsizebug1"),e}function o(){if(!d){d=!0;var e=document.createElement("div");e.style.width="200px",e.style.padding="1px 2px 3px 4px",e.style.borderStyle="solid",e.style.borderWidth="1px 2px 3px 4px",e.style.boxSizing="border-box";var i=document.body||document.documentElement;i.appendChild(e);var o=n(e);s=200==Math.round(t(o.width)),r.isBoxSizeOuter=s,i.removeChild(e)}}function r(e){if(o(),"string"==typeof e&&(e=document.querySelector(e)),e&&"object"==typeof e&&e.nodeType){var r=n(e);if("none"==r.display)return i();var a={};a.width=e.offsetWidth,a.height=e.offsetHeight;for(var d=a.isBorderBox="border-box"==r.boxSizing,l=0;u>l;l++){var c=h[l],f=r[c],m=parseFloat(f);a[c]=isNaN(m)?0:m}var p=a.paddingLeft+a.paddingRight,g=a.paddingTop+a.paddingBottom,y=a.marginLeft+a.marginRight,v=a.marginTop+a.marginBottom,_=a.borderLeftWidth+a.borderRightWidth,z=a.borderTopWidth+a.borderBottomWidth,E=d&&s,b=t(r.width);b!==!1&&(a.width=b+(E?0:p+_));var x=t(r.height);return x!==!1&&(a.height=x+(E?0:g+z)),a.innerWidth=a.width-(p+_),a.innerHeight=a.height-(g+z),a.outerWidth=a.width+y,a.outerHeight=a.height+v,a}}var s,a="undefined"==typeof console?e:function(t){console.error(t)},h=["paddingLeft","paddingRight","paddingTop","paddingBottom","marginLeft","marginRight","marginTop","marginBottom","borderLeftWidth","borderRightWidth","borderTopWidth","borderBottomWidth"],u=h.length,d=!1;return r}),function(t,e){"use strict";"function"==typeof define&&define.amd?define("desandro-matches-selector/matches-selector",e):"object"==typeof module&&module.exports?module.exports=e():t.matchesSelector=e()}(window,function(){"use strict";var t=function(){var t=window.Element.prototype;if(t.matches)return"matches";if(t.matchesSelector)return"matchesSelector";for(var e=["webkit","moz","ms","o"],i=0;i<e.length;i++){var n=e[i],o=n+"MatchesSelector";if(t[o])return o}}();return function(e,i){return e[t](i)}}),function(t,e){"function"==typeof define&&define.amd?define("fizzy-ui-utils/utils",["desandro-matches-selector/matches-selector"],function(i){return e(t,i)}):"object"==typeof module&&module.exports?module.exports=e(t,require("desandro-matches-selector")):t.fizzyUIUtils=e(t,t.matchesSelector)}(window,function(t,e){var i={};i.extend=function(t,e){for(var i in e)t[i]=e[i];return t},i.modulo=function(t,e){return(t%e+e)%e};var n=Array.prototype.slice;i.makeArray=function(t){if(Array.isArray(t))return t;if(null===t||void 0===t)return[];var e="object"==typeof t&&"number"==typeof t.length;return e?n.call(t):[t]},i.removeFrom=function(t,e){var i=t.indexOf(e);-1!=i&&t.splice(i,1)},i.getParent=function(t,i){for(;t.parentNode&&t!=document.body;)if(t=t.parentNode,e(t,i))return t},i.getQueryElement=function(t){return"string"==typeof t?document.querySelector(t):t},i.handleEvent=function(t){var e="on"+t.type;this[e]&&this[e](t)},i.filterFindElements=function(t,n){t=i.makeArray(t);var o=[];return t.forEach(function(t){if(t instanceof HTMLElement){if(!n)return void o.push(t);e(t,n)&&o.push(t);for(var i=t.querySelectorAll(n),r=0;r<i.length;r++)o.push(i[r])}}),o},i.debounceMethod=function(t,e,i){i=i||100;var n=t.prototype[e],o=e+"Timeout";t.prototype[e]=function(){var t=this[o];clearTimeout(t);var e=arguments,r=this;this[o]=setTimeout(function(){n.apply(r,e),delete r[o]},i)}},i.docReady=function(t){var e=document.readyState;"complete"==e||"interactive"==e?setTimeout(t):document.addEventListener("DOMContentLoaded",t)},i.toDashed=function(t){return t.replace(/(.)([A-Z])/g,function(t,e,i){return e+"-"+i}).toLowerCase()};var o=t.console;return i.htmlInit=function(e,n){i.docReady(function(){var r=i.toDashed(n),s="data-"+r,a=document.querySelectorAll("["+s+"]"),h=document.querySelectorAll(".js-"+r),u=i.makeArray(a).concat(i.makeArray(h)),d=s+"-options",l=t.jQuery;u.forEach(function(t){var i,r=t.getAttribute(s)||t.getAttribute(d);try{i=r&&JSON.parse(r)}catch(a){return void(o&&o.error("Error parsing "+s+" on "+t.className+": "+a))}var h=new e(t,i);l&&l.data(t,n,h)})})},i}),function(t,e){"function"==typeof define&&define.amd?define("outlayer/item",["ev-emitter/ev-emitter","get-size/get-size"],e):"object"==typeof module&&module.exports?module.exports=e(require("ev-emitter"),require("get-size")):(t.Outlayer={},t.Outlayer.Item=e(t.EvEmitter,t.getSize))}(window,function(t,e){"use strict";function i(t){for(var e in t)return!1;return e=null,!0}function n(t,e){t&&(this.element=t,this.layout=e,this.position={x:0,y:0},this._create())}function o(t){return t.replace(/([A-Z])/g,function(t){return"-"+t.toLowerCase()})}var r=document.documentElement.style,s="string"==typeof r.transition?"transition":"WebkitTransition",a="string"==typeof r.transform?"transform":"WebkitTransform",h={WebkitTransition:"webkitTransitionEnd",transition:"transitionend"}[s],u={transform:a,transition:s,transitionDuration:s+"Duration",transitionProperty:s+"Property",transitionDelay:s+"Delay"},d=n.prototype=Object.create(t.prototype);d.constructor=n,d._create=function(){this._transn={ingProperties:{},clean:{},onEnd:{}},this.css({position:"absolute"})},d.handleEvent=function(t){var e="on"+t.type;this[e]&&this[e](t)},d.getSize=function(){this.size=e(this.element)},d.css=function(t){var e=this.element.style;for(var i in t){var n=u[i]||i;e[n]=t[i]}},d.getPosition=function(){var t=getComputedStyle(this.element),e=this.layout._getOption("originLeft"),i=this.layout._getOption("originTop"),n=t[e?"left":"right"],o=t[i?"top":"bottom"],r=parseFloat(n),s=parseFloat(o),a=this.layout.size;-1!=n.indexOf("%")&&(r=r/100*a.width),-1!=o.indexOf("%")&&(s=s/100*a.height),r=isNaN(r)?0:r,s=isNaN(s)?0:s,r-=e?a.paddingLeft:a.paddingRight,s-=i?a.paddingTop:a.paddingBottom,this.position.x=r,this.position.y=s},d.layoutPosition=function(){var t=this.layout.size,e={},i=this.layout._getOption("originLeft"),n=this.layout._getOption("originTop"),o=i?"paddingLeft":"paddingRight",r=i?"left":"right",s=i?"right":"left",a=this.position.x+t[o];e[r]=this.getXValue(a),e[s]="";var h=n?"paddingTop":"paddingBottom",u=n?"top":"bottom",d=n?"bottom":"top",l=this.position.y+t[h];e[u]=this.getYValue(l),e[d]="",this.css(e),this.emitEvent("layout",[this])},d.getXValue=function(t){var e=this.layout._getOption("horizontal");return this.layout.options.percentPosition&&!e?t/this.layout.size.width*100+"%":t+"px"},d.getYValue=function(t){var e=this.layout._getOption("horizontal");return this.layout.options.percentPosition&&e?t/this.layout.size.height*100+"%":t+"px"},d._transitionTo=function(t,e){this.getPosition();var i=this.position.x,n=this.position.y,o=t==this.position.x&&e==this.position.y;if(this.setPosition(t,e),o&&!this.isTransitioning)return void this.layoutPosition();var r=t-i,s=e-n,a={};a.transform=this.getTranslate(r,s),this.transition({to:a,onTransitionEnd:{transform:this.layoutPosition},isCleaning:!0})},d.getTranslate=function(t,e){var i=this.layout._getOption("originLeft"),n=this.layout._getOption("originTop");return t=i?t:-t,e=n?e:-e,"translate3d("+t+"px, "+e+"px, 0)"},d.goTo=function(t,e){this.setPosition(t,e),this.layoutPosition()},d.moveTo=d._transitionTo,d.setPosition=function(t,e){this.position.x=parseFloat(t),this.position.y=parseFloat(e)},d._nonTransition=function(t){this.css(t.to),t.isCleaning&&this._removeStyles(t.to);for(var e in t.onTransitionEnd)t.onTransitionEnd[e].call(this)},d.transition=function(t){if(!parseFloat(this.layout.options.transitionDuration))return void this._nonTransition(t);var e=this._transn;for(var i in t.onTransitionEnd)e.onEnd[i]=t.onTransitionEnd[i];for(i in t.to)e.ingProperties[i]=!0,t.isCleaning&&(e.clean[i]=!0);if(t.from){this.css(t.from);var n=this.element.offsetHeight;n=null}this.enableTransition(t.to),this.css(t.to),this.isTransitioning=!0};var l="opacity,"+o(a);d.enableTransition=function(){if(!this.isTransitioning){var t=this.layout.options.transitionDuration;t="number"==typeof t?t+"ms":t,this.css({transitionProperty:l,transitionDuration:t,transitionDelay:this.staggerDelay||0}),this.element.addEventListener(h,this,!1)}},d.onwebkitTransitionEnd=function(t){this.ontransitionend(t)},d.onotransitionend=function(t){this.ontransitionend(t)};var c={"-webkit-transform":"transform"};d.ontransitionend=function(t){if(t.target===this.element){var e=this._transn,n=c[t.propertyName]||t.propertyName;if(delete e.ingProperties[n],i(e.ingProperties)&&this.disableTransition(),n in e.clean&&(this.element.style[t.propertyName]="",delete e.clean[n]),n in e.onEnd){var o=e.onEnd[n];o.call(this),delete e.onEnd[n]}this.emitEvent("transitionEnd",[this])}},d.disableTransition=function(){this.removeTransitionStyles(),this.element.removeEventListener(h,this,!1),this.isTransitioning=!1},d._removeStyles=function(t){var e={};for(var i in t)e[i]="";this.css(e)};var f={transitionProperty:"",transitionDuration:"",transitionDelay:""};return d.removeTransitionStyles=function(){this.css(f)},d.stagger=function(t){t=isNaN(t)?0:t,this.staggerDelay=t+"ms"},d.removeElem=function(){this.element.parentNode.removeChild(this.element),this.css({display:""}),this.emitEvent("remove",[this])},d.remove=function(){return s&&parseFloat(this.layout.options.transitionDuration)?(this.once("transitionEnd",function(){this.removeElem()}),void this.hide()):void this.removeElem()},d.reveal=function(){delete this.isHidden,this.css({display:""});var t=this.layout.options,e={},i=this.getHideRevealTransitionEndProperty("visibleStyle");e[i]=this.onRevealTransitionEnd,this.transition({from:t.hiddenStyle,to:t.visibleStyle,isCleaning:!0,onTransitionEnd:e})},d.onRevealTransitionEnd=function(){this.isHidden||this.emitEvent("reveal")},d.getHideRevealTransitionEndProperty=function(t){var e=this.layout.options[t];if(e.opacity)return"opacity";for(var i in e)return i},d.hide=function(){this.isHidden=!0,this.css({display:""});var t=this.layout.options,e={},i=this.getHideRevealTransitionEndProperty("hiddenStyle");e[i]=this.onHideTransitionEnd,this.transition({from:t.visibleStyle,to:t.hiddenStyle,isCleaning:!0,onTransitionEnd:e})},d.onHideTransitionEnd=function(){this.isHidden&&(this.css({display:"none"}),this.emitEvent("hide"))},d.destroy=function(){this.css({position:"",left:"",right:"",top:"",bottom:"",transition:"",transform:""})},n}),function(t,e){"use strict";"function"==typeof define&&define.amd?define("outlayer/outlayer",["ev-emitter/ev-emitter","get-size/get-size","fizzy-ui-utils/utils","./item"],function(i,n,o,r){return e(t,i,n,o,r)}):"object"==typeof module&&module.exports?module.exports=e(t,require("ev-emitter"),require("get-size"),require("fizzy-ui-utils"),require("./item")):t.Outlayer=e(t,t.EvEmitter,t.getSize,t.fizzyUIUtils,t.Outlayer.Item)}(window,function(t,e,i,n,o){"use strict";function r(t,e){var i=n.getQueryElement(t);if(!i)return void(h&&h.error("Bad element for "+this.constructor.namespace+": "+(i||t)));this.element=i,u&&(this.$element=u(this.element)),this.options=n.extend({},this.constructor.defaults),this.option(e);var o=++l;this.element.outlayerGUID=o,c[o]=this,this._create();var r=this._getOption("initLayout");r&&this.layout()}function s(t){function e(){t.apply(this,arguments)}return e.prototype=Object.create(t.prototype),e.prototype.constructor=e,e}function a(t){if("number"==typeof t)return t;var e=t.match(/(^\d*\.?\d*)(\w*)/),i=e&&e[1],n=e&&e[2];if(!i.length)return 0;i=parseFloat(i);var o=m[n]||1;return i*o}var h=t.console,u=t.jQuery,d=function(){},l=0,c={};r.namespace="outlayer",r.Item=o,r.defaults={containerStyle:{position:"relative"},initLayout:!0,originLeft:!0,originTop:!0,resize:!0,resizeContainer:!0,transitionDuration:"0.4s",hiddenStyle:{opacity:0,transform:"scale(0.001)"},visibleStyle:{opacity:1,transform:"scale(1)"}};var f=r.prototype;n.extend(f,e.prototype),f.option=function(t){n.extend(this.options,t)},f._getOption=function(t){var e=this.constructor.compatOptions[t];return e&&void 0!==this.options[e]?this.options[e]:this.options[t]},r.compatOptions={initLayout:"isInitLayout",horizontal:"isHorizontal",layoutInstant:"isLayoutInstant",originLeft:"isOriginLeft",originTop:"isOriginTop",resize:"isResizeBound",resizeContainer:"isResizingContainer"},f._create=function(){this.reloadItems(),this.stamps=[],this.stamp(this.options.stamp),n.extend(this.element.style,this.options.containerStyle);var t=this._getOption("resize");t&&this.bindResize()},f.reloadItems=function(){this.items=this._itemize(this.element.children)},f._itemize=function(t){for(var e=this._filterFindItemElements(t),i=this.constructor.Item,n=[],o=0;o<e.length;o++){var r=e[o],s=new i(r,this);n.push(s)}return n},f._filterFindItemElements=function(t){return n.filterFindElements(t,this.options.itemSelector)},f.getItemElements=function(){return this.items.map(function(t){return t.element})},f.layout=function(){this._resetLayout(),this._manageStamps();var t=this._getOption("layoutInstant"),e=void 0!==t?t:!this._isLayoutInited;this.layoutItems(this.items,e),this._isLayoutInited=!0},f._init=f.layout,f._resetLayout=function(){this.getSize()},f.getSize=function(){this.size=i(this.element)},f._getMeasurement=function(t,e){var n,o=this.options[t];o?("string"==typeof o?n=this.element.querySelector(o):o instanceof HTMLElement&&(n=o),this[t]=n?i(n)[e]:o):this[t]=0},f.layoutItems=function(t,e){t=this._getItemsForLayout(t),this._layoutItems(t,e),this._postLayout()},f._getItemsForLayout=function(t){return t.filter(function(t){return!t.isIgnored})},f._layoutItems=function(t,e){if(this._emitCompleteOnItems("layout",t),t&&t.length){var i=[];t.forEach(function(t){var n=this._getItemLayoutPosition(t);n.item=t,n.isInstant=e||t.isLayoutInstant,i.push(n)},this),this._processLayoutQueue(i)}},f._getItemLayoutPosition=function(){return{x:0,y:0}},f._processLayoutQueue=function(t){this.updateStagger(),t.forEach(function(t,e){this._positionItem(t.item,t.x,t.y,t.isInstant,e)},this)},f.updateStagger=function(){var t=this.options.stagger;return null===t||void 0===t?void(this.stagger=0):(this.stagger=a(t),this.stagger)},f._positionItem=function(t,e,i,n,o){n?t.goTo(e,i):(t.stagger(o*this.stagger),t.moveTo(e,i))},f._postLayout=function(){this.resizeContainer()},f.resizeContainer=function(){var t=this._getOption("resizeContainer");if(t){var e=this._getContainerSize();e&&(this._setContainerMeasure(e.width,!0),this._setContainerMeasure(e.height,!1))}},f._getContainerSize=d,f._setContainerMeasure=function(t,e){if(void 0!==t){var i=this.size;i.isBorderBox&&(t+=e?i.paddingLeft+i.paddingRight+i.borderLeftWidth+i.borderRightWidth:i.paddingBottom+i.paddingTop+i.borderTopWidth+i.borderBottomWidth),t=Math.max(t,0),this.element.style[e?"width":"height"]=t+"px"}},f._emitCompleteOnItems=function(t,e){function i(){o.dispatchEvent(t+"Complete",null,[e])}function n(){s++,s==r&&i()}var o=this,r=e.length;if(!e||!r)return void i();var s=0;e.forEach(function(e){e.once(t,n)})},f.dispatchEvent=function(t,e,i){var n=e?[e].concat(i):i;if(this.emitEvent(t,n),u)if(this.$element=this.$element||u(this.element),e){var o=u.Event(e);o.type=t,this.$element.trigger(o,i)}else this.$element.trigger(t,i)},f.ignore=function(t){var e=this.getItem(t);e&&(e.isIgnored=!0)},f.unignore=function(t){var e=this.getItem(t);e&&delete e.isIgnored},f.stamp=function(t){t=this._find(t),t&&(this.stamps=this.stamps.concat(t),t.forEach(this.ignore,this))},f.unstamp=function(t){t=this._find(t),t&&t.forEach(function(t){n.removeFrom(this.stamps,t),this.unignore(t)},this)},f._find=function(t){return t?("string"==typeof t&&(t=this.element.querySelectorAll(t)),t=n.makeArray(t)):void 0},f._manageStamps=function(){this.stamps&&this.stamps.length&&(this._getBoundingRect(),this.stamps.forEach(this._manageStamp,this))},f._getBoundingRect=function(){var t=this.element.getBoundingClientRect(),e=this.size;this._boundingRect={left:t.left+e.paddingLeft+e.borderLeftWidth,top:t.top+e.paddingTop+e.borderTopWidth,right:t.right-(e.paddingRight+e.borderRightWidth),bottom:t.bottom-(e.paddingBottom+e.borderBottomWidth)}},f._manageStamp=d,f._getElementOffset=function(t){var e=t.getBoundingClientRect(),n=this._boundingRect,o=i(t),r={left:e.left-n.left-o.marginLeft,top:e.top-n.top-o.marginTop,right:n.right-e.right-o.marginRight,bottom:n.bottom-e.bottom-o.marginBottom};return r},f.handleEvent=n.handleEvent,f.bindResize=function(){t.addEventListener("resize",this),this.isResizeBound=!0},f.unbindResize=function(){t.removeEventListener("resize",this),this.isResizeBound=!1},f.onresize=function(){this.resize()},n.debounceMethod(r,"onresize",100),f.resize=function(){this.isResizeBound&&this.needsResizeLayout()&&this.layout()},f.needsResizeLayout=function(){var t=i(this.element),e=this.size&&t;return e&&t.innerWidth!==this.size.innerWidth},f.addItems=function(t){var e=this._itemize(t);return e.length&&(this.items=this.items.concat(e)),e},f.appended=function(t){var e=this.addItems(t);e.length&&(this.layoutItems(e,!0),this.reveal(e))},f.prepended=function(t){var e=this._itemize(t);if(e.length){var i=this.items.slice(0);this.items=e.concat(i),this._resetLayout(),this._manageStamps(),this.layoutItems(e,!0),this.reveal(e),this.layoutItems(i)}},f.reveal=function(t){if(this._emitCompleteOnItems("reveal",t),t&&t.length){var e=this.updateStagger();t.forEach(function(t,i){t.stagger(i*e),t.reveal()})}},f.hide=function(t){if(this._emitCompleteOnItems("hide",t),t&&t.length){var e=this.updateStagger();t.forEach(function(t,i){t.stagger(i*e),t.hide()})}},f.revealItemElements=function(t){var e=this.getItems(t);this.reveal(e)},f.hideItemElements=function(t){var e=this.getItems(t);this.hide(e)},f.getItem=function(t){for(var e=0;e<this.items.length;e++){var i=this.items[e];if(i.element==t)return i}},f.getItems=function(t){t=n.makeArray(t);var e=[];return t.forEach(function(t){var i=this.getItem(t);i&&e.push(i)},this),e},f.remove=function(t){var e=this.getItems(t);this._emitCompleteOnItems("remove",e),e&&e.length&&e.forEach(function(t){t.remove(),n.removeFrom(this.items,t)},this)},f.destroy=function(){var t=this.element.style;t.height="",t.position="",t.width="",this.items.forEach(function(t){t.destroy()}),this.unbindResize();var e=this.element.outlayerGUID;delete c[e],delete this.element.outlayerGUID,u&&u.removeData(this.element,this.constructor.namespace)},r.data=function(t){t=n.getQueryElement(t);var e=t&&t.outlayerGUID;return e&&c[e]},r.create=function(t,e){var i=s(r);return i.defaults=n.extend({},r.defaults),n.extend(i.defaults,e),i.compatOptions=n.extend({},r.compatOptions),i.namespace=t,i.data=r.data,i.Item=s(o),n.htmlInit(i,t),u&&u.bridget&&u.bridget(t,i),i};var m={ms:1,s:1e3};return r.Item=o,r}),function(t,e){"function"==typeof define&&define.amd?define(["outlayer/outlayer","get-size/get-size"],e):"object"==typeof module&&module.exports?module.exports=e(require("outlayer"),require("get-size")):t.Masonry=e(t.Outlayer,t.getSize)}(window,function(t,e){var i=t.create("masonry");i.compatOptions.fitWidth="isFitWidth";var n=i.prototype;return n._resetLayout=function(){this.getSize(),this._getMeasurement("columnWidth","outerWidth"),this._getMeasurement("gutter","outerWidth"),this.measureColumns(),this.colYs=[];for(var t=0;t<this.cols;t++)this.colYs.push(0);this.maxY=0,this.horizontalColIndex=0},n.measureColumns=function(){if(this.getContainerWidth(),!this.columnWidth){var t=this.items[0],i=t&&t.element;this.columnWidth=i&&e(i).outerWidth||this.containerWidth}var n=this.columnWidth+=this.gutter,o=this.containerWidth+this.gutter,r=o/n,s=n-o%n,a=s&&1>s?"round":"floor";r=Math[a](r),this.cols=Math.max(r,1)},n.getContainerWidth=function(){var t=this._getOption("fitWidth"),i=t?this.element.parentNode:this.element,n=e(i);this.containerWidth=n&&n.innerWidth},n._getItemLayoutPosition=function(t){t.getSize();var e=t.size.outerWidth%this.columnWidth,i=e&&1>e?"round":"ceil",n=Math[i](t.size.outerWidth/this.columnWidth);n=Math.min(n,this.cols);for(var o=this.options.horizontalOrder?"_getHorizontalColPosition":"_getTopColPosition",r=this[o](n,t),s={x:this.columnWidth*r.col,y:r.y},a=r.y+t.size.outerHeight,h=n+r.col,u=r.col;h>u;u++)this.colYs[u]=a;return s},n._getTopColPosition=function(t){var e=this._getTopColGroup(t),i=Math.min.apply(Math,e);return{col:e.indexOf(i),y:i}},n._getTopColGroup=function(t){if(2>t)return this.colYs;for(var e=[],i=this.cols+1-t,n=0;i>n;n++)e[n]=this._getColGroupY(n,t);return e},n._getColGroupY=function(t,e){if(2>e)return this.colYs[t];var i=this.colYs.slice(t,t+e);return Math.max.apply(Math,i)},n._getHorizontalColPosition=function(t,e){var i=this.horizontalColIndex%this.cols,n=t>1&&i+t>this.cols;i=n?0:i;var o=e.size.outerWidth&&e.size.outerHeight;return this.horizontalColIndex=o?i+t:this.horizontalColIndex,{col:i,y:this._getColGroupY(i,t)}},n._manageStamp=function(t){var i=e(t),n=this._getElementOffset(t),o=this._getOption("originLeft"),r=o?n.left:n.right,s=r+i.outerWidth,a=Math.floor(r/this.columnWidth);a=Math.max(0,a);var h=Math.floor(s/this.columnWidth);h-=s%this.columnWidth?0:1,h=Math.min(this.cols-1,h);for(var u=this._getOption("originTop"),d=(u?n.top:n.bottom)+i.outerHeight,l=a;h>=l;l++)this.colYs[l]=Math.max(d,this.colYs[l])},n._getContainerSize=function(){this.maxY=Math.max.apply(Math,this.colYs);var t={height:this.maxY};return this._getOption("fitWidth")&&(t.width=this._getContainerFitWidth()),t},n._getContainerFitWidth=function(){for(var t=0,e=this.cols;--e&&0===this.colYs[e];)t++;return(this.cols-t)*this.columnWidth-this.gutter},n.needsResizeLayout=function(){var t=this.containerWidth;return this.getContainerWidth(),t!=this.containerWidth},i});
/*!
 * imagesLoaded PACKAGED v4.1.4
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */


!function(e,t){"function"==typeof define&&define.amd?define("ev-emitter/ev-emitter",t):"object"==typeof module&&module.exports?module.exports=t():e.EvEmitter=t()}("undefined"!=typeof window?window:this,function(){function e(){}var t=e.prototype;return t.on=function(e,t){if(e&&t){var i=this._events=this._events||{},n=i[e]=i[e]||[];return n.indexOf(t)==-1&&n.push(t),this}},t.once=function(e,t){if(e&&t){this.on(e,t);var i=this._onceEvents=this._onceEvents||{},n=i[e]=i[e]||{};return n[t]=!0,this}},t.off=function(e,t){var i=this._events&&this._events[e];if(i&&i.length){var n=i.indexOf(t);return n!=-1&&i.splice(n,1),this}},t.emitEvent=function(e,t){var i=this._events&&this._events[e];if(i&&i.length){i=i.slice(0),t=t||[];for(var n=this._onceEvents&&this._onceEvents[e],o=0;o<i.length;o++){var r=i[o],s=n&&n[r];s&&(this.off(e,r),delete n[r]),r.apply(this,t)}return this}},t.allOff=function(){delete this._events,delete this._onceEvents},e}),function(e,t){"use strict";"function"==typeof define&&define.amd?define(["ev-emitter/ev-emitter"],function(i){return t(e,i)}):"object"==typeof module&&module.exports?module.exports=t(e,require("ev-emitter")):e.imagesLoaded=t(e,e.EvEmitter)}("undefined"!=typeof window?window:this,function(e,t){function i(e,t){for(var i in t)e[i]=t[i];return e}function n(e){if(Array.isArray(e))return e;var t="object"==typeof e&&"number"==typeof e.length;return t?d.call(e):[e]}function o(e,t,r){if(!(this instanceof o))return new o(e,t,r);var s=e;return"string"==typeof e&&(s=document.querySelectorAll(e)),s?(this.elements=n(s),this.options=i({},this.options),"function"==typeof t?r=t:i(this.options,t),r&&this.on("always",r),this.getImages(),h&&(this.jqDeferred=new h.Deferred),void setTimeout(this.check.bind(this))):void a.error("Bad element for imagesLoaded "+(s||e))}function r(e){this.img=e}function s(e,t){this.url=e,this.element=t,this.img=new Image}var h=e.jQuery,a=e.console,d=Array.prototype.slice;o.prototype=Object.create(t.prototype),o.prototype.options={},o.prototype.getImages=function(){this.images=[],this.elements.forEach(this.addElementImages,this)},o.prototype.addElementImages=function(e){"IMG"==e.nodeName&&this.addImage(e),this.options.background===!0&&this.addElementBackgroundImages(e);var t=e.nodeType;if(t&&u[t]){for(var i=e.querySelectorAll("img"),n=0;n<i.length;n++){var o=i[n];this.addImage(o)}if("string"==typeof this.options.background){var r=e.querySelectorAll(this.options.background);for(n=0;n<r.length;n++){var s=r[n];this.addElementBackgroundImages(s)}}}};var u={1:!0,9:!0,11:!0};return o.prototype.addElementBackgroundImages=function(e){var t=getComputedStyle(e);if(t)for(var i=/url\((['"])?(.*?)\1\)/gi,n=i.exec(t.backgroundImage);null!==n;){var o=n&&n[2];o&&this.addBackground(o,e),n=i.exec(t.backgroundImage)}},o.prototype.addImage=function(e){var t=new r(e);this.images.push(t)},o.prototype.addBackground=function(e,t){var i=new s(e,t);this.images.push(i)},o.prototype.check=function(){function e(e,i,n){setTimeout(function(){t.progress(e,i,n)})}var t=this;return this.progressedCount=0,this.hasAnyBroken=!1,this.images.length?void this.images.forEach(function(t){t.once("progress",e),t.check()}):void this.complete()},o.prototype.progress=function(e,t,i){this.progressedCount++,this.hasAnyBroken=this.hasAnyBroken||!e.isLoaded,this.emitEvent("progress",[this,e,t]),this.jqDeferred&&this.jqDeferred.notify&&this.jqDeferred.notify(this,e),this.progressedCount==this.images.length&&this.complete(),this.options.debug&&a&&a.log("progress: "+i,e,t)},o.prototype.complete=function(){var e=this.hasAnyBroken?"fail":"done";if(this.isComplete=!0,this.emitEvent(e,[this]),this.emitEvent("always",[this]),this.jqDeferred){var t=this.hasAnyBroken?"reject":"resolve";this.jqDeferred[t](this)}},r.prototype=Object.create(t.prototype),r.prototype.check=function(){var e=this.getIsImageComplete();return e?void this.confirm(0!==this.img.naturalWidth,"naturalWidth"):(this.proxyImage=new Image,this.proxyImage.addEventListener("load",this),this.proxyImage.addEventListener("error",this),this.img.addEventListener("load",this),this.img.addEventListener("error",this),void(this.proxyImage.src=this.img.src))},r.prototype.getIsImageComplete=function(){return this.img.complete&&this.img.naturalWidth},r.prototype.confirm=function(e,t){this.isLoaded=e,this.emitEvent("progress",[this,this.img,t])},r.prototype.handleEvent=function(e){var t="on"+e.type;this[t]&&this[t](e)},r.prototype.onload=function(){this.confirm(!0,"onload"),this.unbindEvents()},r.prototype.onerror=function(){this.confirm(!1,"onerror"),this.unbindEvents()},r.prototype.unbindEvents=function(){this.proxyImage.removeEventListener("load",this),this.proxyImage.removeEventListener("error",this),this.img.removeEventListener("load",this),this.img.removeEventListener("error",this)},s.prototype=Object.create(r.prototype),s.prototype.check=function(){this.img.addEventListener("load",this),this.img.addEventListener("error",this),this.img.src=this.url;var e=this.getIsImageComplete();e&&(this.confirm(0!==this.img.naturalWidth,"naturalWidth"),this.unbindEvents())},s.prototype.unbindEvents=function(){this.img.removeEventListener("load",this),this.img.removeEventListener("error",this)},s.prototype.confirm=function(e,t){this.isLoaded=e,this.emitEvent("progress",[this,this.element,t])},o.makeJQueryPlugin=function(t){t=t||e.jQuery,t&&(h=t,h.fn.imagesLoaded=function(e,t){var i=new o(this,e,t);return i.jqDeferred.promise(h(this))})},o.makeJQueryPlugin(),o});
define("discourse/plugins/discourse-topic-list-previews/discourse/initializers/preview-route-edits", ["exports", "../lib/utilities", "discourse/lib/ajax", "discourse/lib/plugin-api", "preload-store", "discourse/models/category-list", "discourse/models/topic-list"], function (_exports, _utilities, _ajax, _pluginApi, _preloadStore, _categoryList, _topicList) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    name: 'preview-route-edits',
    initialize: function initialize(container) {
      var site = container.lookup('site:main');
      var discoveryTopicRoutes = [];
      var discoveryCategoryRoutes = ['Category', 'CategoryNone'];
      var filters = site.get('filters');
      filters.push('top');
      filters.forEach(function (filter) {
        var filterCapitalized = filter.capitalize();
        discoveryTopicRoutes.push(filterCapitalized);
        discoveryCategoryRoutes.push.apply(discoveryCategoryRoutes, ["".concat(filterCapitalized, "Category"), "".concat(filterCapitalized, "CategoryNone")]);
      });
      site.get('periods').forEach(function (period) {
        var periodCapitalized = period.capitalize();
        discoveryTopicRoutes.push("Top".concat(periodCapitalized));
        discoveryCategoryRoutes.push.apply(discoveryCategoryRoutes, ["Top".concat(periodCapitalized, "Category"), "Top".concat(periodCapitalized, "CategoryNone")]);
      });
      discoveryTopicRoutes.forEach(function (route) {
        var route = container.lookup("route:discovery.".concat(route));
        route.reopen({
          model: function model(data, transition) {
            var _this = this;

            return this._super(data, transition).then(function (result) {
              var featuredTopics = null;

              if (result && result.topic_list && result.topic_list.featured_topics) {
                featuredTopics = result.topic_list.featured_topics;
              }

              _this.controllerFor('discovery').set('featuredTopics', featuredTopics);

              return result;
            });
          }
        });
      });
      discoveryCategoryRoutes.forEach(function (route) {
        var route = container.lookup("route:discovery.".concat(route));
        route.reopen({
          afterModel: function afterModel(model, transition) {
            var _this2 = this;

            return this._super(model, transition).then(function (result) {
              var featuredTopics = null;

              if (result[1] && result[1].topic_list && result[1].topic_list.featured_topics) {
                featuredTopics = result[1].topic_list.featured_topics;
              }

              _this2.controllerFor('discovery').set('featuredTopics', featuredTopics);

              return result;
            });
          }
        });
      });
      (0, _pluginApi.withPluginApi)('0.8.12', function (api) {
        api.modifyClass("route:discovery-categories", {
          setFeaturedTopics: function setFeaturedTopics(topicList) {
            var featuredTopics = null;

            if (topicList && topicList.topic_list && topicList.topic_list.featured_topics) {
              featuredTopics = topicList.topic_list.featured_topics;
            }

            this.controllerFor('discovery').set('featuredTopics', featuredTopics);
          },
          // unfortunately we have to override this whole method to extract the featured topics
          _findCategoriesAndTopics: function _findCategoriesAndTopics(filter) {
            var _this3 = this;

            return Ember.RSVP.hash({
              wrappedCategoriesList: _preloadStore.default.getAndRemove("categories_list"),
              topicsList: _preloadStore.default.getAndRemove("topic_list_".concat(filter))
            }).then(function (hash) {
              var wrappedCategoriesList = hash.wrappedCategoriesList,
                  topicsList = hash.topicsList;
              var categoriesList = wrappedCategoriesList && wrappedCategoriesList.category_list;

              if (categoriesList && topicsList) {
                _this3.setFeaturedTopics(topicsList);

                return Ember.Object.create({
                  categories: _categoryList.default.categoriesFrom(_this3.store, wrappedCategoriesList),
                  topics: _topicList.default.topicsFrom(_this3.store, topicsList),
                  can_create_category: categoriesList.can_create_category,
                  can_create_topic: categoriesList.can_create_topic,
                  draft_key: categoriesList.draft_key,
                  draft: categoriesList.draft,
                  draft_sequence: categoriesList.draft_sequence
                });
              } // Otherwise, return the ajax result


              return (0, _ajax.ajax)("/categories_and_".concat(filter)).then(function (result) {
                _this3.setFeaturedTopics(result);

                return Ember.Object.create({
                  categories: _categoryList.default.categoriesFrom(_this3.store, result),
                  topics: _topicList.default.topicsFrom(_this3.store, result),
                  can_create_category: result.category_list.can_create_category,
                  can_create_topic: result.category_list.can_create_topic,
                  draft_key: result.category_list.draft_key,
                  draft: result.category_list.draft,
                  draft_sequence: result.category_list.draft_sequence
                });
              });
            });
          }
        });
      });
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-topic-list-previews/discourse/initializers/preview-edits", ["exports", "discourse-common/utils/decorators", "@ember/object/computed", "discourse/lib/url", "../lib/utilities", "../lib/actions", "discourse/lib/plugin-api", "discourse/raw-views/list/posts-count-column", "../mixins/settings", "discourse/models/topic", "discourse/lib/text", "@ember/service"], function (_exports, _decorators, _computed, _url, _utilities, _actions, _pluginApi, _postsCountColumn, _settings, _topic, _text, _service) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = {
    name: 'preview-edits',
    initialize: function initialize(container) {
      var siteSettings = container.lookup('site-settings:main');
      if (!siteSettings.topic_list_previews_enabled) return;
      (0, _pluginApi.withPluginApi)('0.8.12', function (api) {
        var _dec, _obj, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _dec10, _dec11, _dec12, _dec13, _dec14, _dec15, _dec16, _dec17, _obj2, _dec18, _dec19, _dec20, _dec21, _dec22, _dec23, _dec24, _dec25, _dec26, _dec27, _dec28, _dec29, _dec30, _obj3, _dec31, _dec32, _obj4;

        api.modifyClass('component:load-more', {
          init: function init() {
            this._super.apply(this, arguments);

            if (this.class == 'paginated-topics-list') {
              this.set('eyelineSelector', '.topic-list-item');
            } else {
              this.set('eyelineSelector', this.selector);
            }
          }
        });
        api.modifyClass('component:basic-topic-list', _settings.default);
        api.modifyClass('component:basic-topic-list', (_dec = (0, _decorators.default)('listChanged'), (_obj = {
          router: (0, _service.inject)('router'),
          classNameBindings: ['showThumbnail', 'showExcerpt', 'showActions', 'tilesStyle'],
          currentRoute: (0, _computed.alias)('router.currentRouteName'),
          listChanged: false,
          skipHeader: function skipHeader() {
            this.get('tilesStyle') || this.get('site.mobileView');
          },
          tilesStyle: function tilesStyle() {
            this._settingEnabled('topic_list_tiles');
          }
        }, (_applyDecoratedDescriptor(_obj, "tilesStyle", [_dec], Object.getOwnPropertyDescriptor(_obj, "tilesStyle"), _obj)), _obj)));
        api.modifyClass('component:topic-list', _settings.default);
        api.modifyClass('component:topic-list', (_dec2 = (0, _decorators.on)('init'), _dec3 = (0, _decorators.on)('didRender'), _dec4 = (0, _decorators.on)('didInsertElement'), _dec5 = (0, _decorators.observes)('currentRoute'), _dec6 = (0, _decorators.on)('didInsertElement'), _dec7 = (0, _decorators.observes)('tilesStyle'), _dec8 = (0, _decorators.default)('listChanged'), _dec9 = (0, _decorators.default)('routeShortName'), _dec10 = (0, _decorators.default)('routeShortName'), _dec11 = (0, _decorators.on)('willDestroyElement'), _dec12 = (0, _decorators.default)('listChanged'), _dec13 = (0, _decorators.default)('listChanged'), _dec14 = (0, _decorators.default)('listChanged'), _dec15 = (0, _decorators.default)('listChanged'), _dec16 = (0, _decorators.default)('listChanged'), _dec17 = (0, _decorators.default)('listChanged'), (_obj2 = {
          router: (0, _service.inject)('router'),
          currentRoute: (0, _computed.alias)('router.currentRouteName'),
          classNameBindings: ['showThumbnail', 'showExcerpt', 'showActions', 'tilesStyle'],
          listChanged: false,
          setup: function setup() {
            var suggestedList = this.get('suggestedList');

            if (suggestedList) {
              var category = this.get('parentView.parentView.parentView.topic.category');
              this.set('category', category);
            }

            if (this.siteSettings.topic_list_fade_in_time) {
              $('#list-area').fadeOut(0);
            }
          },
          completeRender: function completeRender() {
            if (this.get('tilesStyle') && !this.site.mobileView) {
              Ember.run.scheduleOnce('afterRender', this, this.applyMasonry);
            }

            if (this.siteSettings.topic_list_fade_in_time) {
              $('#list-area').fadeIn(this.siteSettings.topic_list_fade_in_time);
            }
          },
          setupListChanged: function setupListChanged() {
            this.toggleProperty('listChanged');
          },
          setupListStyle: function setupListStyle() {
            if (!this.$()) {
              return;
            }

            if (this.get('tilesStyle')) {
              this.$().parents('#list-area').toggleClass('tiles-style', true);
              this.$('tbody').toggleClass('tiles-grid', true);

              if (!this.$('.tiles-grid-sizer').length) {
                this.$('.tiles-grid').prepend("<div class='tiles-grid-sizer'></div><div class='tiles-gutter-sizer'></div>");
              }
            }
          },
          routeShortName: function routeShortName() {
            return this.get('router').currentRouteName.split('.')[0];
          },
          discoveryList: function discoveryList() {
            return this.get('routeShortName') == 'discovery';
          },
          suggestedList: function suggestedList() {
            return this.get('routeShortName') == 'topic';
          },
          _tearDown: function _tearDown() {
            this.$().parents('#list-area').removeClass('tiles-style');
            this.$('tbody').removeClass('tiles-grid');
          },
          tilesStyle: function tilesStyle() {
            return this._settingEnabled('topic_list_tiles');
          },
          showThumbnail: function showThumbnail() {
            return this._settingEnabled('topic_list_thumbnail');
          },
          showExcerpt: function showExcerpt() {
            return this._settingEnabled('topic_list_excerpt');
          },
          showActions: function showActions() {
            return this._settingEnabled('topic_list_action');
          },
          skipHeader: function skipHeader() {
            return this.get('tilesStyle') || this.get('site.mobileView');
          },
          thumbnailFirstXRows: function thumbnailFirstXRows() {
            return this.siteSettings.topic_list_thumbnail_first_x_rows;
          },
          applyMasonry: function applyMasonry() {
            // initialize
            var msnry = this.$('.tiles-grid').data('masonry');

            if (msnry) {
              msnry.reloadItems(); //disable transition

              var transitionDuration = msnry.options.transitionDuration;
              msnry.options.transitionDuration = 0;
              $('.tiles-grid').imagesLoaded(function () {
                msnry.layout();
              }); //reset transition

              msnry.options.transitionDuration = transitionDuration;
            } else {
              // init masonry
              // transition set to zero on mobile due to undesirable behaviour on mobile safari if > 0
              var transDuration = this.get('site.mobileView') ? 0 : this.siteSettings.topic_list_tiles_transition_time;
              this.$('.tiles-grid').masonry({
                itemSelector: '.tiles-grid-item',
                transitionDuration: "".concat(transDuration, "s"),
                percentPosition: true,
                columnWidth: '.tiles-grid-sizer',
                gutter: '.tiles-gutter-sizer'
              });
              msnry = this.$('.tiles-grid').data('masonry');
              $('.tiles-grid').imagesLoaded(function () {
                msnry.layout();
              });
            }
          }
        }, (_applyDecoratedDescriptor(_obj2, "setup", [_dec2], Object.getOwnPropertyDescriptor(_obj2, "setup"), _obj2), _applyDecoratedDescriptor(_obj2, "completeRender", [_dec3], Object.getOwnPropertyDescriptor(_obj2, "completeRender"), _obj2), _applyDecoratedDescriptor(_obj2, "setupListChanged", [_dec4, _dec5], Object.getOwnPropertyDescriptor(_obj2, "setupListChanged"), _obj2), _applyDecoratedDescriptor(_obj2, "setupListStyle", [_dec6, _dec7], Object.getOwnPropertyDescriptor(_obj2, "setupListStyle"), _obj2), _applyDecoratedDescriptor(_obj2, "routeShortName", [_dec8], Object.getOwnPropertyDescriptor(_obj2, "routeShortName"), _obj2), _applyDecoratedDescriptor(_obj2, "discoveryList", [_dec9], Object.getOwnPropertyDescriptor(_obj2, "discoveryList"), _obj2), _applyDecoratedDescriptor(_obj2, "suggestedList", [_dec10], Object.getOwnPropertyDescriptor(_obj2, "suggestedList"), _obj2), _applyDecoratedDescriptor(_obj2, "_tearDown", [_dec11], Object.getOwnPropertyDescriptor(_obj2, "_tearDown"), _obj2), _applyDecoratedDescriptor(_obj2, "tilesStyle", [_dec12], Object.getOwnPropertyDescriptor(_obj2, "tilesStyle"), _obj2), _applyDecoratedDescriptor(_obj2, "showThumbnail", [_dec13], Object.getOwnPropertyDescriptor(_obj2, "showThumbnail"), _obj2), _applyDecoratedDescriptor(_obj2, "showExcerpt", [_dec14], Object.getOwnPropertyDescriptor(_obj2, "showExcerpt"), _obj2), _applyDecoratedDescriptor(_obj2, "showActions", [_dec15], Object.getOwnPropertyDescriptor(_obj2, "showActions"), _obj2), _applyDecoratedDescriptor(_obj2, "skipHeader", [_dec16], Object.getOwnPropertyDescriptor(_obj2, "skipHeader"), _obj2), _applyDecoratedDescriptor(_obj2, "thumbnailFirstXRows", [_dec17], Object.getOwnPropertyDescriptor(_obj2, "thumbnailFirstXRows"), _obj2)), _obj2)));
        api.modifyClass('component:topic-list-item', (_dec18 = (0, _decorators.on)('init'), _dec19 = (0, _decorators.on)('didInsertElement'), _dec20 = (0, _decorators.observes)('thumbnails'), _dec21 = (0, _decorators.on)('willDestroyElement'), _dec22 = (0, _decorators.default)(), _dec23 = (0, _decorators.default)(), _dec24 = (0, _decorators.default)('topic.thumbnails'), _dec25 = (0, _decorators.default)('topic.category'), _dec26 = (0, _decorators.default)('tilesStyle', 'thumbnailWidth', 'thumbnailHeight'), _dec27 = (0, _decorators.default)('likeCount'), _dec28 = (0, _decorators.default)('likeDifference'), _dec29 = (0, _decorators.default)('hasLiked'), _dec30 = (0, _decorators.default)('category', 'topic.isPinnedUncategorized'), (_obj3 = {
          canBookmark: Ember.computed.bool('currentUser'),
          rerenderTriggers: ['bulkSelectEnabled', 'topic.pinned', 'likeDifference', 'topic.thumbnails'],
          tilesStyle: (0, _computed.alias)('parentView.tilesStyle'),
          notTilesStyle: (0, _computed.not)('parentView.tilesStyle'),
          showThumbnail: (0, _computed.and)('thumbnails', 'parentView.showThumbnail'),
          showExcerpt: (0, _computed.and)('topic.excerpt', 'parentView.showExcerpt'),
          showActions: (0, _computed.alias)('parentView.showActions'),
          thumbnailFirstXRows: (0, _computed.alias)('parentView.thumbnailFirstXRows'),
          category: (0, _computed.alias)('parentView.category'),
          currentRoute: (0, _computed.alias)('parentView.currentRoute'),
          _setupProperties: function _setupProperties() {
            var _this = this;

            var topic = this.get('topic');
            var thumbnails = topic.get('thumbnails');
            var defaultThumbnail = this.get('defaultThumbnail');

            if (this.get('tilesStyle')) {
              // needs 'div's for masonry
              this.set('tagName', 'div');
              this.classNames = ['tiles-grid-item'];

              if (this.siteSettings.topic_list_tiles_larger_featured_tiles && topic.tags) {
                if (topic.tags.filter(function (tag) {
                  return _this.get('featuredTags').indexOf(tag) > -1;
                })[0]) {
                  this.classNames.push('tiles-grid-item-width2');
                }
              }

              var raw = topic.excerpt;
              (0, _text.cookAsync)(raw).then(function (cooked) {
                return _this.set('excerpt', cooked);
              });
            }

            if (thumbnails) {
              (0, _utilities.testImageUrl)(thumbnails, function (imageLoaded) {
                if (!imageLoaded) {
                  Ember.run.scheduleOnce('afterRender', _this, function () {
                    if (defaultThumbnail) {
                      var $thumbnail = _this.$('img.thumbnail');

                      if ($thumbnail) $thumbnail.attr('src', defaultThumbnail);
                    } else {
                      var $container = _this.$('.topic-thumbnail');

                      if ($container) $container.hide();
                    }
                  });
                }
              });
            } else if (defaultThumbnail && this.siteSettings.topic_list_default_thumbnail_fallback) {
              this.set('thumbnails', [{
                url: defaultThumbnail
              }]);
            }

            var obj = _postsCountColumn.default.create({
              topic: topic
            });

            obj.siteSettings = this.siteSettings;
            this.set('likesHeat', obj.get('likesHeat'));
          },
          _setupDOM: function _setupDOM() {
            var topic = this.get('topic');

            if (topic.get('thumbnails') && this.get('thumbnailFirstXRows') && this.$().index() > this.get('thumbnailFirstXRows')) {
              this.set('showThumbnail', false);
            }

            this._afterRender();
          },
          _afterRender: function _afterRender() {
            var _this2 = this;

            Ember.run.scheduleOnce('afterRender', this, function () {
              _this2._setupTitleCSS();

              if (_this2.get('showExcerpt') && !_this2.get('tilesStyle')) {
                _this2._setupExcerptClick();
              }

              if (_this2.get('showActions')) {
                _this2._setupActions();
              }
            });
          },
          featuredTags: function featuredTags() {
            return this.siteSettings.topic_list_featured_images_tag.split('|');
          },
          _setupTitleCSS: function _setupTitleCSS() {
            var $el = this.$('.topic-title a.visited');

            if ($el) {
              $el.closest('.topic-details').addClass('visited');
            }
          },
          _setupExcerptClick: function _setupExcerptClick() {
            var _this3 = this;

            this.$('.topic-excerpt').on('click.topic-excerpt', function () {
              _url.default.routeTo(_this3.get('topic.lastReadUrl'));
            });
          },
          click: function click(e) {
            if (this.get('tilesStyle')) {
              if ($(e.target).parents('.list-button').length == 0) {
                _url.default.routeTo(this.get('topic.lastReadUrl'));
              }
            }

            this._super(e);
          },
          _sizeThumbnails: function _sizeThumbnails() {
            this.$('.topic-thumbnail img').on('load', function () {
              $(this).css({
                width: $(this)[0].naturalWidth
              });
            });
          },
          _setupActions: function _setupActions() {
            var _this4 = this;

            var postId = this.get('topic.topic_post_id'),
                $bookmark = this.$('.topic-bookmark'),
                $like = this.$('.topic-like');
            $bookmark.on('click.topic-bookmark', function () {
              _this4.toggleBookmark($bookmark);
            });
            $like.on('click.topic-like', function () {
              if (_this4.get('currentUser')) {
                _this4.toggleLike($like, postId);
              } else {
                var controller = container.lookup('controller:application');
                controller.send('showLogin');
              }
            });
          },
          _tearDown: function _tearDown() {
            this.$('.topic-excerpt').off('click.topic-excerpt');
            this.$('.topic-bookmark').off('click.topic-bookmark');
            this.$('.topic-like').off('click.topic-like');
          },
          expandPinned: function expandPinned() {
            if (this.get('showExcerpt')) {
              return true;
            }

            return this._super();
          },
          posterNames: function posterNames() {
            var posters = this.get('topic.posters');
            var posterNames = '';
            posters.forEach(function (poster, i) {
              var name = poster.user.name ? poster.user.name : poster.user.username;
              posterNames += '<a href="' + poster.user.path + '" data-user-card="' + poster.user.username + '" + class="' + poster.extras + '">' + name + '</a>';

              if (i === posters.length - 2) {
                posterNames += '<span> & </span>';
              } else if (i !== posters.length - 1) {
                posterNames += '<span>, </span>';
              }
            });
            return posterNames;
          },
          thumbnails: function thumbnails() {
            return this.get('topic.thumbnails');
          },
          defaultThumbnail: function defaultThumbnail(category) {
            return (0, _utilities.getDefaultThumbnail)(category);
          },
          thumbnailOpts: function thumbnailOpts(tilesStyle, thumbnailWidth, thumbnailHeight) {
            var opts = {
              tilesStyle: tilesStyle
            };

            if (thumbnailWidth) {
              opts['thumbnailWidth'] = thumbnailWidth;
            }

            if (thumbnailHeight) {
              opts['thumbnailHeight'] = thumbnailHeight;
            }

            return opts;
          },
          topicActions: function topicActions(likeCount) {
            var _this5 = this;

            var actions = [];

            if (likeCount || this.get('topic.topic_post_can_like') || !this.get('currentUser') || this.siteSettings.topic_list_show_like_on_current_users_posts) {
              actions.push(this._likeButton());
            }

            if (this.get('canBookmark')) {
              actions.push(this._bookmarkButton());
              Ember.run.scheduleOnce('afterRender', this, function () {
                var $bookmarkStatus = _this5.$('.topic-statuses .op-bookmark');

                if ($bookmarkStatus) {
                  $bookmarkStatus.hide();
                }
              });
            }

            return actions;
          },
          likeCount: function likeCount(likeDifference) {
            return (likeDifference == null ? this.get('topic.topic_post_like_count') : likeDifference) || 0;
          },
          hasLikedDisplay: function hasLikedDisplay() {
            var hasLiked = this.get('hasLiked');
            return hasLiked == null ? this.get('topic.topic_post_liked') : hasLiked;
          },
          showCategoryBadge: function showCategoryBadge(category, isPinnedUncategorized) {
            var isTopic = typeof topic !== 'undefined';
            return (isTopic || !category || category.has_children) && !isPinnedUncategorized;
          },
          changeLikeCount: function changeLikeCount(change) {
            var count = this.get('likeCount'),
                newCount = count + (change || 0);
            this.set('hasLiked', Boolean(change > 0));
            this.set('likeDifference', newCount);
            this.renderTopicListItem();

            this._afterRender();
          },
          _likeButton: function _likeButton() {
            var classes = 'topic-like';
            var disabled = this.get('topic.topic_post_is_current_users');

            if (this.get('hasLikedDisplay')) {
              classes += ' has-like';
              var unlikeDisabled = this.get('topic.topic_post_can_unlike') ? false : this.get('likeDifference') == null;
              disabled = disabled ? true : unlikeDisabled;
            }

            return {
              class: classes,
              title: 'post.controls.like',
              icon: 'heart',
              disabled: disabled
            };
          },
          _bookmarkButton: function _bookmarkButton() {
            var classes = 'topic-bookmark',
                title = 'bookmarks.not_bookmarked';

            if (this.get('topic.topic_post_bookmarked')) {
              classes += ' bookmarked';
              title = 'bookmarks.created';
            }

            return {
              class: classes,
              title: title,
              icon: 'bookmark'
            };
          },
          // Action toggles and server methods
          toggleBookmark: function toggleBookmark($bookmark) {
            (0, _actions.sendBookmark)(this.topic, !$bookmark.hasClass('bookmarked'));
            $bookmark.toggleClass('bookmarked');
          },
          toggleLike: function toggleLike($like, postId) {
            var _this6 = this;

            if (this.get('hasLikedDisplay')) {
              (0, _actions.removeLike)(postId);
              this.changeLikeCount(-1);
            } else {
              var scale = [1.0, 1.5];
              return new Ember.RSVP.Promise(function (resolve) {
                (0, _utilities.animateHeart)($like, scale[0], scale[1], function () {
                  (0, _utilities.animateHeart)($like, scale[1], scale[0], function () {
                    (0, _actions.addLike)(postId);

                    _this6.changeLikeCount(1);

                    resolve();
                  });
                });
              });
            }
          }
        }, (_applyDecoratedDescriptor(_obj3, "_setupProperties", [_dec18], Object.getOwnPropertyDescriptor(_obj3, "_setupProperties"), _obj3), _applyDecoratedDescriptor(_obj3, "_setupDOM", [_dec19], Object.getOwnPropertyDescriptor(_obj3, "_setupDOM"), _obj3), _applyDecoratedDescriptor(_obj3, "_afterRender", [_dec20], Object.getOwnPropertyDescriptor(_obj3, "_afterRender"), _obj3), _applyDecoratedDescriptor(_obj3, "featuredTags", [_decorators.default], Object.getOwnPropertyDescriptor(_obj3, "featuredTags"), _obj3), _applyDecoratedDescriptor(_obj3, "_tearDown", [_dec21], Object.getOwnPropertyDescriptor(_obj3, "_tearDown"), _obj3), _applyDecoratedDescriptor(_obj3, "expandPinned", [_dec22], Object.getOwnPropertyDescriptor(_obj3, "expandPinned"), _obj3), _applyDecoratedDescriptor(_obj3, "posterNames", [_dec23], Object.getOwnPropertyDescriptor(_obj3, "posterNames"), _obj3), _applyDecoratedDescriptor(_obj3, "thumbnails", [_dec24], Object.getOwnPropertyDescriptor(_obj3, "thumbnails"), _obj3), _applyDecoratedDescriptor(_obj3, "defaultThumbnail", [_dec25], Object.getOwnPropertyDescriptor(_obj3, "defaultThumbnail"), _obj3), _applyDecoratedDescriptor(_obj3, "thumbnailOpts", [_dec26], Object.getOwnPropertyDescriptor(_obj3, "thumbnailOpts"), _obj3), _applyDecoratedDescriptor(_obj3, "topicActions", [_dec27], Object.getOwnPropertyDescriptor(_obj3, "topicActions"), _obj3), _applyDecoratedDescriptor(_obj3, "likeCount", [_dec28], Object.getOwnPropertyDescriptor(_obj3, "likeCount"), _obj3), _applyDecoratedDescriptor(_obj3, "hasLikedDisplay", [_dec29], Object.getOwnPropertyDescriptor(_obj3, "hasLikedDisplay"), _obj3), _applyDecoratedDescriptor(_obj3, "showCategoryBadge", [_dec30], Object.getOwnPropertyDescriptor(_obj3, "showCategoryBadge"), _obj3)), _obj3)));
        api.modifyClass('component:topic-timeline', (_dec31 = (0, _decorators.on)('didInsertElement'), _dec32 = (0, _decorators.on)('willDestroyElement'), (_obj4 = {
          refreshTimelinePosition: function refreshTimelinePosition() {
            var _this7 = this;

            this.appEvents.on('topic:refresh-timeline-position', this, function () {
              return _this7.queueDockCheck();
            });
          },
          removeRefreshTimelinePosition: function removeRefreshTimelinePosition() {
            var _this8 = this;

            try {
              this.appEvents.off('topic:refresh-timeline-position', this, function () {
                return _this8.queueDockCheck();
              });
            } catch (err) {
              console.log(err.message);
            }
          }
        }, (_applyDecoratedDescriptor(_obj4, "refreshTimelinePosition", [_dec31], Object.getOwnPropertyDescriptor(_obj4, "refreshTimelinePosition"), _obj4), _applyDecoratedDescriptor(_obj4, "removeRefreshTimelinePosition", [_dec32], Object.getOwnPropertyDescriptor(_obj4, "removeRefreshTimelinePosition"), _obj4)), _obj4)));
      });
    }
  };
  _exports.default = _default;
});
define("discourse/plugins/discourse-topic-list-previews/discourse/helpers/featured-images-enabled", ["exports", "../lib/utilities"], function (_exports, _utilities) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Helper.helper(function (params) {
    return (0, _utilities.featuredImagesEnabled)(params[0], params[1]);
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-topic-list-previews/discourse/helpers/preview-helpers", ["discourse-common/lib/helpers", "../lib/utilities"], function (_helpers, _utilities) {
  "use strict";

  (0, _helpers.registerUnbound)('preview-unbound', function (thumbnails, params) {
    return new Handlebars.SafeString((0, _utilities.renderUnboundPreview)(thumbnails, params));
  });
  (0, _helpers.registerUnbound)('list-button', function (button, params) {
    return new Handlebars.SafeString((0, _utilities.buttonHTML)(button, params));
  });
});
define("discourse/plugins/discourse-topic-list-previews/discourse/routes/user-activity-portfolio", ["exports", "discourse/routes/user-topic-list", "discourse/models/user-action"], function (_exports, _userTopicList, _userAction) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

  var _default = _userTopicList.default.extend({
    userActionType: _userAction.default.TYPES.topics,
    model: function model() {
      var filter_type = Discourse.SiteSettings.topic_list_portfolio_filter_type;
      var filter_parameter = Discourse.SiteSettings.topic_list_portfolio_filter_parameter;

      if (filter_type == 'tag') {
        filter_type = 'tags';
      }

      return this.store.findFiltered("topicList", {
        filter: "topics/created-by/" + this.modelFor("user").get("username_lower"),
        params: _defineProperty({}, filter_type, filter_parameter)
      });
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-topic-list-previews/discourse/lib/actions", ["exports", "discourse/lib/ajax", "discourse/lib/ajax-error"], function (_exports, _ajax, _ajaxError) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.removeLike = _exports.sendBookmark = _exports.addLike = void 0;

  var addLike = function addLike(postId) {
    (0, _ajax.ajax)('/post_actions', {
      type: 'POST',
      data: {
        id: postId,
        post_action_type_id: 2
      },
      returnXHR: true
    }).catch(function (error) {
      (0, _ajaxError.popupAjaxError)(error);
    });
  };

  _exports.addLike = addLike;

  var sendBookmark = function sendBookmark(topic, bookmarked) {
    if (bookmarked) {
      var data = {
        reminder_type: null,
        reminder_at: null,
        name: null,
        post_id: topic.topic_post_id
      };
      return (0, _ajax.ajax)('/bookmarks', {
        type: 'POST',
        data: data
      }).catch(function (error) {
        (0, _ajaxError.popupAjaxError)(error);
      });
    } else {
      return (0, _ajax.ajax)("/t/".concat(topic.id, "/remove_bookmarks"), {
        type: 'PUT'
      }).then(topic.firstPost().then(function (firstPost) {
        topic.toggleProperty('bookmarked');
        topic.set('bookmark_reminder_at', null);
        var clearedBookmarkProps = {
          bookmarked: false,
          bookmark_id: null,
          bookmark_name: null,
          bookmark_reminder_at: null
        };
        firstPost.setProperties(clearedBookmarkProps);
      })).catch(function (error) {
        (0, _ajaxError.popupAjaxError)(error);
      });
    }
  };

  _exports.sendBookmark = sendBookmark;

  var removeLike = function removeLike(postId) {
    (0, _ajax.ajax)('/post_actions/' + postId, {
      type: 'DELETE',
      data: {
        post_action_type_id: 2
      }
    }).catch(function (error) {
      (0, _ajaxError.popupAjaxError)(error);
    });
  };

  _exports.removeLike = removeLike;
});
define("discourse/plugins/discourse-topic-list-previews/discourse/lib/utilities", ["exports", "discourse-common/lib/icon-library"], function (_exports, _iconLibrary) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.getDefaultThumbnail = _exports.featuredImagesEnabled = _exports.animateHeart = _exports.buttonHTML = _exports.testImageUrl = _exports.renderUnboundPreview = void 0;

  var isThumbnail = function isThumbnail(path) {
    return typeof path === 'string' && path !== 'false' && path !== 'nil' && path !== 'null' && path !== '';
  };

  var previewUrl = function previewUrl(thumbnails) {
    var featured = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    var preferLowRes = Discourse.User._current === null ? false : Discourse.User._current.custom_fields.tlp_user_prefs_prefer_low_res_thumbnails;

    if (thumbnails) {
      var resLevel = featured ? Discourse.SiteSettings.topic_list_featured_images_resolution_level : Discourse.SiteSettings.topic_list_thumbnail_resolution_level;
      resLevel = Math.round((thumbnails.length - 1) / 6 * resLevel);

      if (preferLowRes) {
        resLevel++;
      }

      ;

      if (window.devicePixelRatio && resLevel > 0) {
        resLevel--;
      }

      ;
      return resLevel <= thumbnails.length - 1 ? thumbnails[resLevel].url : thumbnails[thumbnails.length - 1].url;
    } else {
      return false;
    }
  };

  var renderUnboundPreview = function renderUnboundPreview(thumbnails, params) {
    var url = previewUrl(thumbnails, params.opts.featured);
    if (!url) return '';
    var opts = params.opts || {};

    if (!opts.tilesStyle && !opts.featured && Discourse.Site.currentProp('mobileView')) {
      return "<img class=\"thumbnail\" src=\"".concat(url, "\" loading=\"lazy\"/>");
    }

    var settings = Discourse.SiteSettings;
    var attrWidthSuffix = opts.tilesStyle ? '%' : 'px';
    var attrHeightSuffix = opts.tilesStyle ? '' : 'px';
    var css_classes = opts.tilesStyle ? 'thumbnail tiles-thumbnail' : 'thumbnail';
    var category_width = params.category ? params.category.topic_list_thumbnail_width : false;
    var category_height = params.category ? params.category.topic_list_thumbnail_height : false;
    var featured_width = opts.featured ? settings.topic_list_featured_width ? settings.topic_list_featured_width : 'auto' : false;
    var featured_height = opts.featured ? settings.topic_list_featured_height : false;
    var tiles_width = opts.tilesStyle ? '100' : false;
    var tiles_height = opts.tilesStyle ? 'auto' : false;
    var custom_width = opts.thumbnailWidth ? opts.thumbnailWidth : false;
    var custom_height = opts.thumbnailHeight ? opts.thumbnailHeight : false;
    var height = custom_height || tiles_height || featured_height || category_height || settings.topic_list_thumbnail_height;
    var width = custom_width || tiles_width || featured_width || category_width || settings.topic_list_thumbnail_width;
    var height_style = height ? "height:".concat(height).concat(attrHeightSuffix, ";") : "";
    var style = "".concat(height_style, "width:").concat(width).concat(attrWidthSuffix);
    return "<img class=\"".concat(css_classes, "\" src=\"").concat(url, "\" style=\"").concat(style, "\"/>");
  };

  _exports.renderUnboundPreview = renderUnboundPreview;

  var testImageUrl = function testImageUrl(thumbnails, callback) {
    var url = previewUrl(thumbnails);
    var timeout = Discourse.SiteSettings.topic_list_test_image_url_timeout;
    var timer,
        img = new Image();

    img.onerror = img.onabort = function () {
      clearTimeout(timer);
      callback(false);
    };

    img.onload = function () {
      clearTimeout(timer);
      callback(true);
    };

    timer = setTimeout(function () {
      callback(false);
    }, timeout);
    img.src = url;
  };

  _exports.testImageUrl = testImageUrl;

  var getDefaultThumbnail = function getDefaultThumbnail(category) {
    var catThumb = category ? category.topic_list_default_thumbnail : false;
    var defaultThumbnail = catThumb || Discourse.SiteSettings.topic_list_default_thumbnail;
    return defaultThumbnail ? defaultThumbnail : false;
  };

  _exports.getDefaultThumbnail = getDefaultThumbnail;

  var buttonHTML = function buttonHTML(action) {
    action = action || {};
    var html = "<button class='list-button " + action.class + "'";

    if (action.title) {
      html += 'title="' + I18n.t(action.title) + '"';
    }

    if (action.disabled) {
      html += ' disabled';
    }

    html += ">".concat((0, _iconLibrary.iconHTML)(action.icon));
    html += "</button>";
    return html;
  };

  _exports.buttonHTML = buttonHTML;

  var animateHeart = function animateHeart($elem, start, end, complete) {
    if (Ember.testing) {
      return Ember.run(this, complete);
    }

    $elem.stop().css('textIndent', start).animate({
      textIndent: end
    }, {
      complete: complete,
      step: function step(now) {
        $(this).css('transform', 'scale(' + now + ')');
      },
      duration: 150
    }, 'linear');
  };

  _exports.animateHeart = animateHeart;

  var featuredImagesEnabled = function featuredImagesEnabled() {
    var category = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var isTopic = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    if (isTopic && !Discourse.SiteSettings.topic_list_featured_images_topic) {
      return false;
    }

    if (!category || Discourse.SiteSettings.topic_list_featured_images_category) {
      return Discourse.SiteSettings.topic_list_featured_images;
    } else {
      return category.topic_list_featured_images;
    }
  };

  _exports.featuredImagesEnabled = featuredImagesEnabled;
});
define("discourse/plugins/discourse-topic-list-previews/discourse/mixins/settings", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Mixin.create({
    _settingEnabled: function _settingEnabled(setting) {
      var routeEnabled = this.get('routeEnabled');

      if (routeEnabled) {
        return routeEnabled.indexOf(setting) > -1;
      }

      var filter = this._filter();

      var discoveryList = this.get('discoveryList');
      var suggestedList = this.get('suggestedList');
      var currentRoute = this.get('currentRoute');
      if (!discoveryList && !suggestedList && !(currentRoute.indexOf('userActivity') > -1) && !(currentRoute.indexOf('tag') > -1)) return false;
      var category = this.get('category');
      var catSetting = category ? category.get(setting) : false;
      var siteSetting = Discourse.SiteSettings[setting] ? Discourse.SiteSettings[setting].toString() : false;
      var filterArr = filter ? filter.split('/') : [];
      var filterType = filterArr[filterArr.length - 1];
      var catEnabled = catSetting && catSetting.split('|').indexOf(filterType) > -1;
      var siteEnabled = siteSetting && siteSetting.split('|').indexOf(filterType) > -1;
      var siteDefaults = Discourse.SiteSettings.topic_list_set_category_defaults;
      var isTopic = ['suggested', 'suggested-mobile'].includes(filterType);
      return isTopic ? siteEnabled : category ? catEnabled || siteDefaults && siteEnabled : siteEnabled;
    },
    _filter: function _filter() {
      var filter = this.get('parentView.model.filter');
      var currentRoute = this.get('currentRoute');
      if (currentRoute.indexOf('tag') > -1) filter = 'tags';
      if (currentRoute.indexOf('top') > -1) filter = 'top';
      if (currentRoute.indexOf('topic') > -1) filter = 'suggested';
      if (currentRoute == 'userActivity.portfolio') filter = 'activity-portfolio';
      if (currentRoute == 'userActivity.topics') filter = 'activity-topics';
      var mobile = this.get('site.mobileView');
      if (mobile) filter += '-mobile';
      return filter;
    }
  });

  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/discourse/connectors/user-custom-preferences/tlp-user-preferences"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"if\",[[24,[\"siteSettings\",\"topic_list_previews_enabled\"]]],null,{\"statements\":[[0,\"  \"],[1,[28,\"tlp-user-preferences\",null,[[\"model\"],[[24,[\"model\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/connectors/user-custom-preferences/tlp-user-preferences"}});
Ember.TEMPLATES["javascripts/discourse/connectors/edit-topic/select-thumbnail-connector"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"select-thumbnail\",null,[[\"topic_id\",\"topic_title\",\"buffered\"],[[24,[\"model\",\"id\"]],[24,[\"model\",\"title\"]],[24,[\"buffered\"]]]]],false]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/connectors/edit-topic/select-thumbnail-connector"}});
define("discourse/plugins/discourse-topic-list-previews/discourse/connectors/discovery-list-container-top/featured-topics-discovery", ["exports", "discourse-common/lib/get-owner"], function (_exports, _getOwner) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    setupComponent: function setupComponent(attrs, component) {
      var _this = this;

      var controller = (0, _getOwner.getOwner)(this).lookup('controller:discovery');
      component.set('featuredTopics', controller.get('featuredTopics'));
      controller.addObserver('featuredTopics', function () {
        if (_this._state === 'destroying') return;
        var featuredTopics = controller.get('featuredTopics');
        component.set('featuredTopics', featuredTopics);
      });
    }
  };
  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/discourse/connectors/discovery-list-container-top/featured-topics-discovery"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"if\",[[24,[\"featuredTopics\"]]],null,{\"statements\":[[0,\"  \"],[1,[28,\"tlp-featured-topics\",null,[[\"featuredTopics\"],[[24,[\"featuredTopics\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/connectors/discovery-list-container-top/featured-topics-discovery"}});
define("discourse/plugins/discourse-topic-list-previews/discourse/connectors/user-card-additional-controls/portfolio-button", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    setupComponent: function setupComponent(attrs, component) {
      component.set('portfolioEnabled', component.siteSettings.topic_list_portfolio);
    }
  };
  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/discourse/connectors/user-card-additional-controls/portfolio-button"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"if\",[[24,[\"portfolioEnabled\"]]],null,{\"statements\":[[0,\"    \"],[7,\"div\",true],[10,\"class\",\"portfolio-button-inner\"],[8],[0,\"\\n\"],[4,\"link-to\",null,[[\"route\",\"model\"],[\"userActivity.portfolio\",[24,[\"user\"]]]],{\"statements\":[[0,\"        \"],[7,\"svg\",true],[10,\"class\",\"fa d-icon d-icon-images svg-icon svg-string\"],[10,\"xmlns\",\"http://www.w3.org/2000/svg\",\"http://www.w3.org/2000/xmlns/\"],[8],[7,\"use\",true],[10,\"xlink:href\",\"#images\",\"http://www.w3.org/1999/xlink\"],[8],[9],[9],[0,\"\\n        \"],[7,\"label\",true],[8],[1,[28,\"i18n\",[\"user_activity_portfolio.title\"],null],false],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/connectors/user-card-additional-controls/portfolio-button"}});
Ember.TEMPLATES["javascripts/discourse/connectors/user-activity-bottom/portfolio-list"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"if\",[[24,[\"portfolioEnabled\"]]],null,{\"statements\":[[4,\"link-to\",null,[[\"route\"],[\"userActivity.portfolio\"]],{\"statements\":[[0,\"    \"],[1,[28,\"d-icon\",[\"images\"],null],false],[0,\" \"],[1,[28,\"i18n\",[\"user_activity_portfolio.title\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/connectors/user-activity-bottom/portfolio-list"}});
define("discourse/plugins/discourse-topic-list-previews/discourse/connectors/user-activity-bottom/portfolio-list", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    setupComponent: function setupComponent(attrs, component) {
      component.set('portfolioEnabled', component.siteSettings.topic_list_portfolio);
    }
  };
  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/discourse/connectors/category-custom-settings/category-list-settings"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"if\",[[24,[\"siteSettings\",\"topic_list_previews_enabled\"]]],null,{\"statements\":[[7,\"h3\",true],[8],[1,[28,\"i18n\",[\"category.topic_list_previews_settings_heading\"],null],false],[9],[0,\"\\n  \"],[7,\"section\",true],[10,\"class\",\"field\"],[8],[0,\"\\n    \"],[7,\"label\",true],[8],[1,[28,\"i18n\",[\"category.topic_list_tiles\"],null],false],[9],[0,\"\\n    \"],[1,[28,\"list-setting\",null,[[\"value\",\"choices\",\"settingName\",\"onChange\"],[[24,[\"tiles\"]],[24,[\"filteredChoices\"]],\"category.custom_fields.topic_list_tiles\",[28,\"action\",[[23,0,[]],\"onChangeCategoryListSetting\",\"tiles\"],null]]]],false],[0,\"\\n  \"],[9],[0,\"\\n\\n  \"],[7,\"section\",true],[10,\"class\",\"field\"],[8],[0,\"\\n    \"],[7,\"label\",true],[8],[1,[28,\"i18n\",[\"category.topic_list_thumbnail\"],null],false],[9],[0,\"\\n    \"],[1,[28,\"list-setting\",null,[[\"value\",\"choices\",\"settingName\",\"onChange\"],[[24,[\"thumbnail\"]],[24,[\"choices\"]],\"category.topic_list_thumbnail\",[28,\"action\",[[23,0,[]],\"onChangeCategoryListSetting\",\"thumbnail\"],null]]]],false],[0,\"\\n  \"],[9],[0,\"\\n\\n  \"],[7,\"section\",true],[10,\"class\",\"field\"],[8],[0,\"\\n    \"],[7,\"label\",true],[8],[1,[28,\"i18n\",[\"category.topic_list_excerpt\"],null],false],[9],[0,\"\\n    \"],[1,[28,\"list-setting\",null,[[\"value\",\"choices\",\"settingName\",\"onChange\"],[[24,[\"excerpt\"]],[24,[\"choices\"]],\"category.topic_list_excerpt\",[28,\"action\",[[23,0,[]],\"onChangeCategoryListSetting\",\"excerpt\"],null]]]],false],[0,\"\\n  \"],[9],[0,\"\\n\\n  \"],[7,\"section\",true],[10,\"class\",\"field\"],[8],[0,\"\\n    \"],[7,\"label\",true],[8],[1,[28,\"i18n\",[\"category.topic_list_action\"],null],false],[9],[0,\"\\n    \"],[1,[28,\"list-setting\",null,[[\"value\",\"choices\",\"settingName\",\"onChange\"],[[24,[\"action\"]],[24,[\"choices\"]],\"category.topic_list_action\",[28,\"action\",[[23,0,[]],\"onChangeCategoryListSetting\",\"action\"],null]]]],false],[0,\"\\n  \"],[9],[0,\"\\n\\n  \"],[7,\"section\",true],[10,\"class\",\"field\"],[8],[0,\"\\n    \"],[7,\"label\",true],[8],[1,[28,\"i18n\",[\"category.topic_list_default_thumbnail\"],null],false],[9],[0,\"\\n    \"],[1,[28,\"text-field\",null,[[\"value\",\"placeholderKey\"],[[24,[\"category\",\"custom_fields\",\"topic_list_default_thumbnail\"]],\"category.topic_list_default_thumbnail_placeholder\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\\n  \"],[7,\"section\",true],[10,\"class\",\"field\"],[8],[0,\"\\n    \"],[7,\"label\",true],[8],[1,[28,\"i18n\",[\"category.topic_list_thumbnail_width\"],null],false],[9],[0,\"\\n    \"],[1,[28,\"input\",null,[[\"type\",\"class\",\"value\",\"placeholderKey\"],[\"integer\",\"input-small\",[24,[\"category\",\"custom_fields\",\"topic_list_thumbnail_width\"]],\"category.topic_list_thumbnail_width_placeholder\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\\n  \"],[7,\"section\",true],[10,\"class\",\"field\"],[8],[0,\"\\n    \"],[7,\"label\",true],[8],[1,[28,\"i18n\",[\"category.topic_list_thumbnail_height\"],null],false],[9],[0,\"\\n    \"],[1,[28,\"input\",null,[[\"type\",\"class\",\"value\",\"placeholderKey\"],[\"integer\",\"input-small\",[24,[\"category\",\"custom_fields\",\"topic_list_thumbnail_height\"]],\"category.topic_list_thumbnail_height_placeholder\"]]],false],[0,\"\\n  \"],[9],[0,\"\\n\\n  \"],[7,\"section\",true],[10,\"class\",\"field\"],[8],[0,\"\\n    \"],[1,[28,\"input\",null,[[\"type\",\"checked\"],[\"checkbox\",[24,[\"category\",\"custom_fields\",\"topic_list_featured_images\"]]]]],false],[0,\"\\n    \"],[7,\"span\",true],[8],[1,[28,\"i18n\",[\"category.topic_list_featured_images\"],null],false],[9],[0,\"\\n  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/connectors/category-custom-settings/category-list-settings"}});
define("discourse/plugins/discourse-topic-list-previews/discourse/connectors/category-custom-settings/category-list-settings", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var listChoices = ['latest', 'new', 'unread', 'top', 'suggested', 'agenda', 'latest-mobile', 'new-mobile', 'unread-mobile', 'top-mobile', 'agenda-mobile'];
  var filterChoices = ['suggested'];
  var listSettings = ['tiles', 'thumbnail', 'excerpt', 'action'];
  var _default = {
    setupComponent: function setupComponent(args, component) {
      var _this = this;

      component.set('tokenSeparator', "|");
      var category = args.category;

      if (!category.custom_fields) {
        category.custom_fields = {};
      }

      ;
      listSettings.forEach(function (s) {
        if (typeof category.custom_fields["topic_list_".concat(s)] !== 'string') {
          category.custom_fields["topic_list_".concat(s)] = '';
        }

        component.set(s, category.custom_fields["topic_list_".concat(s)].toString().split(_this.tokenSeparator));
      });
      component.set('choices', listChoices);
      var filteredChoices = listChoices.filter(function (c) {
        return filterChoices.indexOf(c) === -1;
      });
      component.set('filteredChoices', filteredChoices);
    },
    actions: {
      onChangeCategoryListSetting: function onChangeCategoryListSetting(type, value) {
        this.set(type, value);
        this.set("category.custom_fields.topic_list_".concat(type), value.join(this.tokenSeparator));
      }
    }
  };
  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/discourse/connectors/topic-above-post-stream/featured-topics-topic"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[4,\"unless\",[[24,[\"site\",\"mobileView\"]]],null,{\"statements\":[[4,\"if\",[[24,[\"model\",\"featured_topics\"]]],null,{\"statements\":[[0,\"    \"],[1,[28,\"tlp-featured-topics\",null,[[\"featuredTopics\"],[[24,[\"model\",\"featured_topics\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/connectors/topic-above-post-stream/featured-topics-topic"}});
define("discourse/plugins/discourse-topic-list-previews/discourse/components/tlp-featured-topics", ["exports", "discourse-common/utils/decorators", "discourse/lib/text"], function (_exports, _decorators, _text) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _dec3, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Component.extend((_dec = (0, _decorators.on)('init'), _dec2 = (0, _decorators.observes)('featuredTopics'), _dec3 = (0, _decorators.on)('init'), (_obj = {
    classNameBindings: [':tlp-featured-topics', 'hasTopics'],
    hasTopics: Ember.computed.notEmpty('featuredTopics'),
    featuredTopics: null,
    setup: function setup() {
      this.appEvents.trigger('topic:refresh-timeline-position');
    },
    setupTitle: function setupTitle() {
      var _this = this;

      var showFeaturedTitle = this.get('showFeaturedTitle');

      if (showFeaturedTitle) {
        var raw = this.siteSettings.topic_list_featured_title;
        (0, _text.cookAsync)(raw).then(function (cooked) {
          return _this.set('featuredTitle', cooked);
        });
      }
    },
    showFeaturedTitle: function showFeaturedTitle() {
      return this.siteSettings.topic_list_featured_title;
    },
    featuredTags: function featuredTags() {
      return this.siteSettings.topic_list_featured_images_tag.split('|');
    },
    showFeaturedTags: function showFeaturedTags() {
      return this.get('featuredTags') && this.siteSettings.topic_list_featured_images_tag_show;
    }
  }, (_applyDecoratedDescriptor(_obj, "setup", [_dec, _dec2], Object.getOwnPropertyDescriptor(_obj, "setup"), _obj), _applyDecoratedDescriptor(_obj, "setupTitle", [_dec3], Object.getOwnPropertyDescriptor(_obj, "setupTitle"), _obj), _applyDecoratedDescriptor(_obj, "showFeaturedTitle", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "showFeaturedTitle"), _obj), _applyDecoratedDescriptor(_obj, "featuredTags", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "featuredTags"), _obj), _applyDecoratedDescriptor(_obj, "showFeaturedTags", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "showFeaturedTags"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/discourse-topic-list-previews/discourse/components/tlp-featured-topic", ["exports", "discourse/lib/url", "discourse-common/utils/decorators", "../lib/utilities"], function (_exports, _url, _decorators, _utilities) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _dec, _dec2, _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Component.extend((_dec = (0, _decorators.default)('topic.tags'), _dec2 = (0, _decorators.default)('topic.id'), (_obj = {
    tagName: 'a',
    attributeBindings: ['href'],
    classNameBindings: [':tlp-featured-topic', "showDetails", 'featuredTag'],
    didInsertElement: function didInsertElement() {
      var _this = this;

      var topic = this.get('topic');

      if (topic) {
        var defaultThumbnail = (0, _utilities.getDefaultThumbnail)();
        (0, _utilities.testImageUrl)(topic.thumbnails, function (imageLoaded) {
          if (!imageLoaded) {
            Ember.run.scheduleOnce('afterRender', _this, function () {
              if (defaultThumbnail) {
                var $thumbnail = _this.$("img.thumbnail");

                if ($thumbnail) {
                  _this.$('img.thumbnail').attr('src', defaultThumbnail);
                }
              } else {
                _this.$().hide();
              }
            });
          }
        });
      }
    },
    featuredTags: function featuredTags() {
      return this.siteSettings.topic_list_featured_images_tag.split('|');
    },
    featuredTag: function featuredTag(tags) {
      var _this2 = this;

      return tags.filter(function (tag) {
        return _this2.get('featuredTags').indexOf(tag) > -1;
      })[0];
    },
    mouseEnter: function mouseEnter() {
      this.set('showDetails', true);
    },
    mouseLeave: function mouseLeave() {
      this.set('showDetails', false);
    },
    href: function href(topicId) {
      return "/t/".concat(topicId);
    },
    click: function click(e) {
      e.preventDefault();

      _url.default.routeTo(this.get('href'));
    }
  }, (_applyDecoratedDescriptor(_obj, "featuredTags", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "featuredTags"), _obj), _applyDecoratedDescriptor(_obj, "featuredTag", [_dec], Object.getOwnPropertyDescriptor(_obj, "featuredTag"), _obj), _applyDecoratedDescriptor(_obj, "href", [_dec2], Object.getOwnPropertyDescriptor(_obj, "href"), _obj)), _obj)));

  _exports.default = _default;
});
define("discourse/plugins/discourse-topic-list-previews/discourse/components/select-thumbnail", ["exports", "discourse/lib/ajax", "discourse/lib/ajax-error", "discourse/lib/show-modal", "discourse-common/utils/decorators"], function (_exports, _ajax, _ajaxError, _showModal, _decorators) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _obj;

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  var _default = Ember.Component.extend((_obj = {
    classNames: 'select-thumbnail',
    showSelected: function showSelected() {
      return this.get('buffered.user_chosen_thumbnail_url') ? true : false;
    },
    actions: {
      showThumbnailSelector: function showThumbnailSelector() {
        var _this = this;

        (0, _ajax.ajax)("/topic-previews/thumbnail-selection.json?topic=".concat(this.get('topic_id'))).then(function (result) {
          var controller = (0, _showModal.default)('tlp-thumbnail-selector', {
            model: {
              thumbnails: result,
              topic_id: _this.get('topic_id'),
              topic_title: _this.get('topic_title'),
              buffered: _this.get('buffered')
            }
          });
        }).catch(function (error) {
          (0, _ajaxError.popupAjaxError)(error);
        });
      }
    }
  }, (_applyDecoratedDescriptor(_obj, "showSelected", [_decorators.default], Object.getOwnPropertyDescriptor(_obj, "showSelected"), _obj)), _obj));

  _exports.default = _default;
});
Ember.TEMPLATES["javascripts/modal/tlp-thumbnail-selector"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"thumbnail\"],\"statements\":[[4,\"d-modal-body\",null,[[\"class\",\"title\"],[\"select-thumbnail\",[24,[\"modal_title\"]]]],{\"statements\":[[0,\"  \"],[7,\"h3\",true],[8],[1,[28,\"i18n\",[\"thumbnail_selector.topic_title_prefix\"],null],false],[0,\" \\\"\"],[1,[22,\"modal_topic_title\"],false],[0,\"\\\"\"],[9],[0,\"\\n  \"],[7,\"span\",true],[10,\"class\",\"select-thumbnail\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"thumbnailList\",\"thumbnailselection\"]]],null,{\"statements\":[[0,\"    \"],[7,\"img\",false],[12,\"class\",\"select-thumbnail-options\"],[12,\"src\",[23,1,[\"image_url\"]]],[3,\"action\",[[23,0,[]],\"selectThumbnail\",[23,1,[\"image_url\"]],[23,1,[\"upload_id\"]]]],[8],[9],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"  \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/modal/tlp-thumbnail-selector"}});
__DISCOURSE_RAW_TEMPLATES["javascripts/mobile/list/topic-list-item"] = requirejs('discourse-common/lib/raw-handlebars').template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <div class=\"topic-header-grid\">\n      "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.topic-list-title",{"name":"raw","hash":{"mobileView":"site.mobileView","tilesStyle":"tilesStyle","topic":"topic"},"hashTypes":{"mobileView":"PathExpression","tilesStyle":"PathExpression","topic":"PathExpression"},"hashContexts":{"mobileView":depth0,"tilesStyle":depth0,"topic":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":4,"column":6},"end":{"line":4,"column":98}}}))
    + "\n      <div class=\"topic-category\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showCategoryBadge",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(2, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":6,"column":8},"end":{"line":8,"column":15}}})) != null ? stack1 : "")
    + "      </div>\n    </div>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showThumbnail",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(4, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":11,"column":4},"end":{"line":13,"column":11}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "          "
    + container.escapeExpression((lookupProperty(helpers,"category-link")||(depth0 && lookupProperty(depth0,"category-link"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.category",{"name":"category-link","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":7,"column":10},"end":{"line":7,"column":42}}}))
    + "\n";
},"4":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.topic-thumbnail",{"name":"raw","hash":{"opts":"thumbnailOpts","category":"category","thumbnails":"thumbnails","topic":"topic"},"hashTypes":{"opts":"PathExpression","category":"PathExpression","thumbnails":"PathExpression","topic":"PathExpression"},"hashContexts":{"opts":depth0,"category":depth0,"thumbnails":depth0,"topic":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":12,"column":6},"end":{"line":12,"column":107}}}))
    + "\n";
},"6":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showThumbnail",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":15,"column":4},"end":{"line":21,"column":11}}})) != null ? stack1 : "");
},"7":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      <div class='pull-left'>\n        <a href=\""
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.lastPostUrl",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":19,"column":17},"end":{"line":19,"column":38}}}))
    + "\" data-user-card=\""
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.last_poster_username",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":19,"column":56},"end":{"line":19,"column":86}}}))
    + "\">"
    + container.escapeExpression((lookupProperty(helpers,"avatar")||(depth0 && lookupProperty(depth0,"avatar"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.lastPosterUser",{"name":"avatar","hash":{"imageSize":"large"},"hashTypes":{"imageSize":"StringLiteral"},"hashContexts":{"imageSize":depth0},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":19,"column":88},"end":{"line":19,"column":137}}}))
    + "</a>\n      </div>\n";
},"9":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      <div class='main-link'>\n        "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.topic-list-title",{"name":"raw","hash":{"mobileView":"site.mobileView","suggested":"parentView.suggestedList","homepage":"parentView.homepage","showTopicPostBadges":"showTopicPostBadges","topic":"topic"},"hashTypes":{"mobileView":"PathExpression","suggested":"PathExpression","homepage":"PathExpression","showTopicPostBadges":"PathExpression","topic":"PathExpression"},"hashContexts":{"mobileView":depth0,"suggested":depth0,"homepage":depth0,"showTopicPostBadges":depth0,"topic":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":27,"column":8},"end":{"line":32,"column":38}}}))
    + "\n      </div>\n      <div class='pull-right'>\n        "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.post-count-or-badges",{"name":"raw","hash":{"postBadgesEnabled":"showTopicPostBadges","topic":"topic"},"hashTypes":{"postBadgesEnabled":"PathExpression","topic":"PathExpression"},"hashContexts":{"postBadgesEnabled":depth0,"topic":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":35,"column":8},"end":{"line":35,"column":93}}}))
    + "\n      </div>\n";
},"11":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.topic-excerpt",{"name":"raw","hash":{"topic":"topic"},"hashTypes":{"topic":"PathExpression"},"hashContexts":{"topic":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":40,"column":6},"end":{"line":40,"column":46}}}))
    + "\n";
},"13":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showCategoryBadge",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(14, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":44,"column":6},"end":{"line":48,"column":13}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.tags",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(16, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":50,"column":6},"end":{"line":56,"column":13}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showActions",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(19, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":58,"column":6},"end":{"line":60,"column":13}}})) != null ? stack1 : "")
    + "\n      <div class='num activity last'>\n        <span class=\"age activity\" title=\""
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.bumpedAtTitle",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":63,"column":42},"end":{"line":63,"column":65}}}))
    + "\"><a href=\""
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.lastPostUrl",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":63,"column":76},"end":{"line":63,"column":97}}}))
    + "\">"
    + container.escapeExpression((lookupProperty(helpers,"format-date")||(depth0 && lookupProperty(depth0,"format-date"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.bumpedAt",{"name":"format-date","hash":{"noTitle":"true","format":"tiny"},"hashTypes":{"noTitle":"StringLiteral","format":"StringLiteral"},"hashContexts":{"noTitle":depth0,"format":depth0},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":63,"column":99},"end":{"line":63,"column":158}}}))
    + "</a></span>\n      </div>\n";
},"14":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <div class='topic-category'>\n          "
    + container.escapeExpression((lookupProperty(helpers,"category-link")||(depth0 && lookupProperty(depth0,"category-link"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.category",{"name":"category-link","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":46,"column":10},"end":{"line":46,"column":42}}}))
    + "\n        </div>\n";
},"16":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <div class='discourse-tags'>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),"tag","in","topic.visibleListTags",{"name":"each","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(17, data, 0),"inverse":container.noop,"types":["PathExpression","CommentStatement","PathExpression"],"contexts":[depth0,depth0,depth0],"data":data,"loc":{"start":{"line":52,"column":8},"end":{"line":54,"column":17}}})) != null ? stack1 : "")
    + "        </div>\n";
},"17":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "          "
    + container.escapeExpression((lookupProperty(helpers,"discourse-tag")||(depth0 && lookupProperty(depth0,"discourse-tag"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"tag",{"name":"discourse-tag","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":53,"column":10},"end":{"line":53,"column":31}}}))
    + "\n";
},"19":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.topic-actions",{"name":"raw","hash":{"topicActions":"topicActions","likeCount":"likeCount"},"hashTypes":{"topicActions":"PathExpression","likeCount":"PathExpression"},"hashContexts":{"topicActions":depth0,"likeCount":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":59,"column":8},"end":{"line":59,"column":82}}}))
    + "\n";
},"21":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.topic-meta",{"name":"raw","hash":{"topic":"topic","title":"view.title","likesHeat":"likesHeat"},"hashTypes":{"topic":"PathExpression","title":"PathExpression","likesHeat":"PathExpression"},"hashContexts":{"topic":depth0,"title":depth0,"likesHeat":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":69,"column":4},"end":{"line":69,"column":78}}}))
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showActions",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(22, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":70,"column":4},"end":{"line":72,"column":11}}})) != null ? stack1 : "");
},"22":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.topic-actions",{"name":"raw","hash":{"topicActions":"topicActions","likeCount":"likeCount"},"hashTypes":{"topicActions":"PathExpression","likeCount":"PathExpression"},"hashContexts":{"topicActions":depth0,"likeCount":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":71,"column":6},"end":{"line":71,"column":80}}}))
    + "\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<td>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"tilesStyle",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(1, data, 0),"inverse":container.program(6, data, 0),"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":2,"column":2},"end":{"line":22,"column":9}}})) != null ? stack1 : "")
    + "\n  <div class='topic-details'>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"notTilesStyle",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(9, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":25,"column":4},"end":{"line":37,"column":11}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"expandPinned",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(11, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":39,"column":4},"end":{"line":41,"column":11}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"notTilesStyle",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(13, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":43,"column":4},"end":{"line":65,"column":11}}})) != null ? stack1 : "")
    + "  </div>\n\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"tilesStyle",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(21, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":68,"column":2},"end":{"line":73,"column":9}}})) != null ? stack1 : "")
    + "</td>\n";
},"useData":true});
Ember.TEMPLATES["javascripts/components/tlp-featured-topics"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[\"tag\",\"t\"],\"statements\":[[4,\"if\",[[24,[\"hasTopics\"]]],null,{\"statements\":[[4,\"if\",[[24,[\"showFeaturedTitle\"]]],null,{\"statements\":[[0,\"    \"],[7,\"div\",true],[10,\"class\",\"featured-title\"],[8],[0,\"\\n      \"],[1,[22,\"featuredTitle\"],false],[0,\"\\n    \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"  \"],[7,\"div\",true],[10,\"class\",\"topics\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"featuredTopics\"]]],null,{\"statements\":[[0,\"      \"],[1,[28,\"tlp-featured-topic\",null,[[\"topic\"],[[23,2,[]]]]],false],[0,\"\\n\"]],\"parameters\":[2]},null],[0,\"  \"],[9],[0,\"\\n\"],[4,\"if\",[[24,[\"showFeaturedTags\"]]],null,{\"statements\":[[0,\"    \"],[7,\"div\",true],[10,\"class\",\"featured-tags\"],[8],[0,\"\\n\"],[4,\"each\",[[24,[\"featuredTags\"]]],null,{\"statements\":[[0,\"        \"],[1,[28,\"discourse-tag\",[[23,1,[]]],null],false],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"    \"],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/tlp-featured-topics"}});
Ember.TEMPLATES["javascripts/components/select-thumbnail"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[1,[28,\"d-button\",null,[[\"id\",\"class\",\"action\",\"icon\",\"label\"],[\"select-thumbnail-button\",\"btn-default select-thumbnail\",[28,\"action\",[[23,0,[]],\"showThumbnailSelector\"],null],\"id-card\",\"thumbnail_selector.select_preview_button\"]]],false],[0,\"\\n\"],[4,\"if\",[[24,[\"showSelected\"]]],null,{\"statements\":[[0,\"    \"],[7,\"br\",true],[8],[9],[7,\"img\",true],[11,\"src\",[24,[\"buffered\",\"user_chosen_thumbnail_url\"]]],[10,\"class\",\"select-thumbnail-preview\"],[8],[9],[0,\"\\n\"]],\"parameters\":[]},null]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/select-thumbnail"}});
Ember.TEMPLATES["javascripts/components/tlp-user-preferences"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"label\",true],[10,\"class\",\"control-label\"],[8],[1,[28,\"i18n\",[\"tlp.user_prefs.title\"],null],false],[9],[0,\"\\n\"],[1,[28,\"preference-checkbox\",null,[[\"labelKey\",\"checked\"],[\"tlp.user_prefs.prefer_low_res_thumbnail\",[24,[\"model\",\"custom_fields\",\"tlp_user_prefs_prefer_low_res_thumbnails\"]]]]],false]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/tlp-user-preferences"}});
Ember.TEMPLATES["javascripts/components/tlp-featured-topic"] = Ember.HTMLBars.template({"id":null,"block":"{\"symbols\":[],\"statements\":[[7,\"div\",true],[10,\"class\",\"featured-details\"],[8],[0,\"\\n  \"],[1,[28,\"preview-unbound\",[[24,[\"topic\",\"thumbnails\"]]],[[\"opts\"],[[28,\"hash\",null,[[\"featured\"],[true]]]]]],false],[0,\"\\n  \"],[7,\"div\",true],[10,\"class\",\"content\"],[8],[0,\"\\n    \"],[7,\"div\",true],[10,\"class\",\"title\"],[8],[0,\"\\n      \"],[1,[24,[\"topic\",\"title\"]],false],[0,\"\\n    \"],[9],[0,\"\\n\"],[4,\"if\",[[24,[\"siteSettings\",\"topic_list_featured_excerpt\"]]],null,{\"statements\":[[0,\"      \"],[7,\"div\",true],[10,\"class\",\"excerpt\"],[8],[0,\"\\n        \"],[1,[24,[\"topic\",\"excerpt\"]],true],[0,\"\\n      \"],[9],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[7,\"span\",true],[10,\"class\",\"user\"],[8],[0,\"\\n      \"],[1,[24,[\"topic\",\"topic_post_user\",\"username\"]],false],[0,\"\\n      \"],[1,[28,\"avatar\",[[24,[\"topic\",\"topic_post_user\"]]],[[\"imageSize\"],[\"small\"]]],false],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}","meta":{"moduleName":"javascripts/discourse/templates/components/tlp-featured-topic"}});
__DISCOURSE_RAW_TEMPLATES["javascripts/list/topic-list-item"] = requirejs('discourse-common/lib/raw-handlebars').template({"1":function(container,depth0,helpers,partials,data) {
    return "  <td class='star'>\n    <input type=\"checkbox\" class=\"bulk-select\">\n  </td>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <div class=\"topic-header-grid\">\n      "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.topic-list-title",{"name":"raw","hash":{"showTopicPostBadges":"showTopicPostBadges","tilesStyle":"tilesStyle","topic":"topic"},"hashTypes":{"showTopicPostBadges":"PathExpression","tilesStyle":"PathExpression","topic":"PathExpression"},"hashContexts":{"showTopicPostBadges":depth0,"tilesStyle":depth0,"topic":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":10,"column":6},"end":{"line":10,"column":111}}}))
    + "\n      <div class=\"topic-category\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showCategoryBadge",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(4, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":12,"column":8},"end":{"line":14,"column":15}}})) != null ? stack1 : "")
    + "      </div>\n    </div>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "          "
    + container.escapeExpression((lookupProperty(helpers,"category-link")||(depth0 && lookupProperty(depth0,"category-link"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.category",{"name":"category-link","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":13,"column":10},"end":{"line":13,"column":42}}}))
    + "\n";
},"6":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.topic-thumbnail",{"name":"raw","hash":{"opts":"thumbnailOpts","category":"category","thumbnails":"thumbnails","topic":"topic"},"hashTypes":{"opts":"PathExpression","category":"PathExpression","thumbnails":"PathExpression","topic":"PathExpression"},"hashContexts":{"opts":depth0,"category":depth0,"thumbnails":depth0,"topic":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":20,"column":4},"end":{"line":20,"column":105}}}))
    + "\n";
},"8":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.topic-list-title",{"name":"raw","hash":{"suggested":"parentView.suggestedList","homepage":"parentView.homepage","showTopicPostBadges":"showTopicPostBadges","tilesStyle":"tilesStyle","topic":"topic"},"hashTypes":{"suggested":"PathExpression","homepage":"PathExpression","showTopicPostBadges":"PathExpression","tilesStyle":"PathExpression","topic":"PathExpression"},"hashContexts":{"suggested":depth0,"homepage":depth0,"showTopicPostBadges":depth0,"tilesStyle":depth0,"topic":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":25,"column":6},"end":{"line":30,"column":44}}}))
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showCategoryBadge",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(9, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":31,"column":6},"end":{"line":35,"column":13}}})) != null ? stack1 : "")
    + "      "
    + container.escapeExpression((lookupProperty(helpers,"discourse-tags")||(depth0 && lookupProperty(depth0,"discourse-tags"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic",{"name":"discourse-tags","hash":{"tagsForUser":"tagsForUser","mode":"list"},"hashTypes":{"tagsForUser":"PathExpression","mode":"StringLiteral"},"hashContexts":{"tagsForUser":depth0,"mode":depth0},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":36,"column":6},"end":{"line":36,"column":66}}}))
    + "\n";
},"9":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <div class='topic-category'>\n          "
    + container.escapeExpression((lookupProperty(helpers,"category-link")||(depth0 && lookupProperty(depth0,"category-link"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.category",{"name":"category-link","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":33,"column":10},"end":{"line":33,"column":42}}}))
    + "\n        </div>\n";
},"11":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.topic-excerpt",{"name":"raw","hash":{"topic":"topic"},"hashTypes":{"topic":"PathExpression"},"hashContexts":{"topic":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":40,"column":6},"end":{"line":40,"column":46}}}))
    + "\n";
},"13":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      <div class=\"actions-and-meta-data\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showActions",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(14, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":45,"column":8},"end":{"line":47,"column":15}}})) != null ? stack1 : "")
    + "        "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.action-list",{"name":"raw","hash":{"icon":"heart","className":"likes","postNumbers":"topic.liked_post_numbers","topic":"topic"},"hashTypes":{"icon":"StringLiteral","className":"StringLiteral","postNumbers":"PathExpression","topic":"PathExpression"},"hashContexts":{"icon":depth0,"className":depth0,"postNumbers":depth0,"topic":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":48,"column":8},"end":{"line":48,"column":114}}}))
    + "\n      </div>\n";
},"14":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "          "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.topic-actions",{"name":"raw","hash":{"topicActions":"topicActions","likeCount":"likeCount"},"hashTypes":{"topicActions":"PathExpression","likeCount":"PathExpression"},"hashContexts":{"topicActions":depth0,"likeCount":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":46,"column":10},"end":{"line":46,"column":84}}}))
    + "\n";
},"16":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      </div>\n      "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.topic-meta",{"name":"raw","hash":{"topic":"topic","title":"view.title","likesHeat":"likesHeat"},"hashTypes":{"topic":"PathExpression","title":"PathExpression","likesHeat":"PathExpression"},"hashContexts":{"topic":depth0,"title":depth0,"likesHeat":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":54,"column":6},"end":{"line":54,"column":80}}}))
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showActions",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(17, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":55,"column":6},"end":{"line":57,"column":13}}})) != null ? stack1 : "");
},"17":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.topic-actions",{"name":"raw","hash":{"topicActions":"topicActions","likeCount":"likeCount"},"hashTypes":{"topicActions":"PathExpression","likeCount":"PathExpression"},"hashContexts":{"topicActions":depth0,"likeCount":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":56,"column":8},"end":{"line":56,"column":82}}}))
    + "\n";
},"19":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showPosters",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(20, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":63,"column":2},"end":{"line":65,"column":9}}})) != null ? stack1 : "")
    + "\n  "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.posts-count-column",{"name":"raw","hash":{"topic":"topic"},"hashTypes":{"topic":"PathExpression"},"hashContexts":{"topic":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":67,"column":2},"end":{"line":67,"column":47}}}))
    + "\n\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showParticipants",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(22, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":69,"column":2},"end":{"line":71,"column":9}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showLikes",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(24, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":73,"column":2},"end":{"line":81,"column":9}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showOpLikes",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(27, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":83,"column":2},"end":{"line":91,"column":9}}})) != null ? stack1 : "")
    + "\n  <td class=\"num views "
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.viewsHeat",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":93,"column":23},"end":{"line":93,"column":42}}}))
    + "\">"
    + container.escapeExpression((lookupProperty(helpers,"number")||(depth0 && lookupProperty(depth0,"number"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.views",{"name":"number","hash":{"numberKey":"views_long"},"hashTypes":{"numberKey":"StringLiteral"},"hashContexts":{"numberKey":depth0},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":93,"column":44},"end":{"line":93,"column":89}}}))
    + "</td>\n  "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.activity-column",{"name":"raw","hash":{"tagName":"td","class":"num","topic":"topic"},"hashTypes":{"tagName":"StringLiteral","class":"StringLiteral","topic":"PathExpression"},"hashContexts":{"tagName":depth0,"class":depth0,"topic":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":94,"column":2},"end":{"line":94,"column":69}}}))
    + "\n";
},"20":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.posters-column",{"name":"raw","hash":{"posters":"topic.posters"},"hashTypes":{"posters":"PathExpression"},"hashContexts":{"posters":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":64,"column":4},"end":{"line":64,"column":55}}}))
    + "\n";
},"22":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.posters-column",{"name":"raw","hash":{"posters":"topic.participants"},"hashTypes":{"posters":"PathExpression"},"hashContexts":{"posters":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":70,"column":4},"end":{"line":70,"column":60}}}))
    + "\n";
},"24":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <td class=\"num likes\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"hasLikes",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(25, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":75,"column":6},"end":{"line":79,"column":13}}})) != null ? stack1 : "")
    + "    </td>\n";
},"25":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <a href='"
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.summaryUrl",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":76,"column":17},"end":{"line":76,"column":37}}}))
    + "'>\n          "
    + container.escapeExpression((lookupProperty(helpers,"number")||(depth0 && lookupProperty(depth0,"number"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.like_count",{"name":"number","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":77,"column":10},"end":{"line":77,"column":37}}}))
    + " "
    + container.escapeExpression((lookupProperty(helpers,"d-icon")||(depth0 && lookupProperty(depth0,"d-icon"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"heart",{"name":"d-icon","hash":{},"hashTypes":{},"hashContexts":{},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":77,"column":38},"end":{"line":77,"column":56}}}))
    + "\n        </a>\n";
},"27":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <td class=\"num likes\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"hasOpLikes",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(28, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":85,"column":6},"end":{"line":89,"column":13}}})) != null ? stack1 : "")
    + "    </td>\n";
},"28":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <a href='"
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.summaryUrl",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":86,"column":17},"end":{"line":86,"column":37}}}))
    + "'>\n          "
    + container.escapeExpression((lookupProperty(helpers,"number")||(depth0 && lookupProperty(depth0,"number"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.op_like_count",{"name":"number","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":87,"column":10},"end":{"line":87,"column":40}}}))
    + " "
    + container.escapeExpression((lookupProperty(helpers,"d-icon")||(depth0 && lookupProperty(depth0,"d-icon"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"heart",{"name":"d-icon","hash":{},"hashTypes":{},"hashContexts":{},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":87,"column":41},"end":{"line":87,"column":59}}}))
    + "\n        </a>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"bulkSelectEnabled",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(1, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":5,"column":7}}})) != null ? stack1 : "")
    + "\n<td class='main-link clearfix' colspan=\""
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"titleColSpan",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":7,"column":40},"end":{"line":7,"column":56}}}))
    + "\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"tilesStyle",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(3, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":8,"column":2},"end":{"line":17,"column":9}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showThumbnail",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(6, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":19,"column":2},"end":{"line":21,"column":9}}})) != null ? stack1 : "")
    + "\n  <div class=\"topic-details\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"notTilesStyle",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(8, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":24,"column":4},"end":{"line":37,"column":11}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"expandPinned",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(11, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":39,"column":4},"end":{"line":41,"column":11}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"notTilesStyle",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(13, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":43,"column":4},"end":{"line":50,"column":11}}})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"tilesStyle",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(16, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":52,"column":4},"end":{"line":58,"column":11}}})) != null ? stack1 : "")
    + "</td>\n\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"notTilesStyle",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(19, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":61,"column":0},"end":{"line":95,"column":7}}})) != null ? stack1 : "");
},"useData":true});
__DISCOURSE_RAW_TEMPLATES["javascripts/list/topic-actions"] = requirejs('discourse-common/lib/raw-handlebars').template({"1":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <div class=\"like-count\">"
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"likeCount",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":3,"column":28},"end":{"line":3,"column":41}}}))
    + "</div>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    "
    + container.escapeExpression((lookupProperty(helpers,"list-button")||(depth0 && lookupProperty(depth0,"list-button"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"action",{"name":"list-button","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":6,"column":4},"end":{"line":6,"column":26}}}))
    + "\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"topic-actions\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"likeCount",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(1, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":2,"column":2},"end":{"line":4,"column":9}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),"action","in","topicActions",{"name":"each","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(3, data, 0),"inverse":container.noop,"types":["PathExpression","CommentStatement","PathExpression"],"contexts":[depth0,depth0,depth0],"data":data,"loc":{"start":{"line":5,"column":2},"end":{"line":7,"column":11}}})) != null ? stack1 : "")
    + "</div>\n";
},"useData":true});
__DISCOURSE_RAW_TEMPLATES["javascripts/list/topic-users"] = requirejs('discourse-common/lib/raw-handlebars').template({"1":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "      <a href=\""
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"poster.user.path",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":4,"column":15},"end":{"line":4,"column":35}}}))
    + "\" data-user-card=\""
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"poster.user.username",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":4,"column":53},"end":{"line":4,"column":77}}}))
    + "\" class=\""
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"poster.extras",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":4,"column":86},"end":{"line":4,"column":103}}}))
    + "\">\n        "
    + container.escapeExpression((lookupProperty(helpers,"avatar")||(depth0 && lookupProperty(depth0,"avatar"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"poster",{"name":"avatar","hash":{"imageSize":"small","usernamePath":"user.username","avatarTemplatePath":"user.avatar_template"},"hashTypes":{"imageSize":"StringLiteral","usernamePath":"StringLiteral","avatarTemplatePath":"StringLiteral"},"hashContexts":{"imageSize":depth0,"usernamePath":depth0,"avatarTemplatePath":depth0},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":5,"column":8},"end":{"line":5,"column":114}}}))
    + "\n      </a>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class='topic-users'>\n  <div class=\"inline\">\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),"poster","in","topic.posters",{"name":"each","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(1, data, 0),"inverse":container.noop,"types":["PathExpression","CommentStatement","PathExpression"],"contexts":[depth0,depth0,depth0],"data":data,"loc":{"start":{"line":3,"column":4},"end":{"line":7,"column":13}}})) != null ? stack1 : "")
    + "  </div>\n</div>\n";
},"useData":true});
__DISCOURSE_RAW_TEMPLATES["javascripts/list/topic-meta"] = requirejs('discourse-common/lib/raw-handlebars').template({"1":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  <div class=\"topic-tags\">\n    "
    + container.escapeExpression((lookupProperty(helpers,"discourse-tags")||(depth0 && lookupProperty(depth0,"discourse-tags"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic",{"name":"discourse-tags","hash":{"mode":"list"},"hashTypes":{"mode":"StringLiteral"},"hashContexts":{"mode":depth0},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":3,"column":4},"end":{"line":3,"column":40}}}))
    + "\n  </div>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.tags",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(1, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":5,"column":7}}})) != null ? stack1 : "")
    + "<div class=\"topic-meta\">\n  "
    + container.escapeExpression((lookupProperty(helpers,"raw-plugin-outlet")||(depth0 && lookupProperty(depth0,"raw-plugin-outlet"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"raw-plugin-outlet","hash":{"name":"topic-list-tiles-meta"},"hashTypes":{"name":"StringLiteral"},"hashContexts":{"name":depth0},"types":[],"contexts":[],"data":data,"loc":{"start":{"line":7,"column":2},"end":{"line":7,"column":52}}}))
    + "\n  <div class=\"topic-views "
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.viewsHeat",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":8,"column":26},"end":{"line":8,"column":45}}}))
    + " inline sub\">\n    "
    + container.escapeExpression((lookupProperty(helpers,"d-icon")||(depth0 && lookupProperty(depth0,"d-icon"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"far-eye",{"name":"d-icon","hash":{},"hashTypes":{},"hashContexts":{},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":9,"column":4},"end":{"line":9,"column":24}}}))
    + "\n    "
    + container.escapeExpression((lookupProperty(helpers,"number")||(depth0 && lookupProperty(depth0,"number"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.views",{"name":"number","hash":{"numberKey":"views_long"},"hashTypes":{"numberKey":"StringLiteral"},"hashContexts":{"numberKey":depth0},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":10,"column":4},"end":{"line":10,"column":49}}}))
    + "\n  </div>\n  <span class=\"middot inline sub\"></span>\n  <div class='topic-replies posts-map "
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"likesHeat",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":13,"column":38},"end":{"line":13,"column":51}}}))
    + " inline sub' title='"
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"title",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":13,"column":71},"end":{"line":13,"column":80}}}))
    + "'>\n    <a href class='posts-map badge-posts "
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"likesHeat",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":14,"column":41},"end":{"line":14,"column":54}}}))
    + "'>"
    + container.escapeExpression((lookupProperty(helpers,"d-icon")||(depth0 && lookupProperty(depth0,"d-icon"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"far-comment",{"name":"d-icon","hash":{},"hashTypes":{},"hashContexts":{},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":14,"column":56},"end":{"line":14,"column":80}}}))
    + container.escapeExpression((lookupProperty(helpers,"number")||(depth0 && lookupProperty(depth0,"number"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.replyCount",{"name":"number","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":14,"column":80},"end":{"line":14,"column":107}}}))
    + "</a>\n  </div>\n  <span class=\"middot inline sub\"></span>\n  <div class=\""
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"class",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":17,"column":14},"end":{"line":17,"column":23}}}))
    + " "
    + container.escapeExpression((lookupProperty(helpers,"cold-age-class")||(depth0 && lookupProperty(depth0,"cold-age-class"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.createdAt",{"name":"cold-age-class","hash":{"class":"","startDate":"topic.bumpedAt"},"hashTypes":{"class":"StringLiteral","startDate":"PathExpression"},"hashContexts":{"class":depth0,"startDate":depth0},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":17,"column":24},"end":{"line":17,"column":92}}}))
    + " activity inline sub\" title=\""
    + ((stack1 = lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.bumpedAtTitle",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":17,"column":121},"end":{"line":17,"column":146}}})) != null ? stack1 : "")
    + "\">\n    <a href=\""
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.lastPostUrl",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":18,"column":13},"end":{"line":18,"column":34}}}))
    + "\">"
    + container.escapeExpression((lookupProperty(helpers,"format-date")||(depth0 && lookupProperty(depth0,"format-date"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.bumpedAt",{"name":"format-date","hash":{"noTitle":"true","format":"medium-with-ago"},"hashTypes":{"noTitle":"StringLiteral","format":"StringLiteral"},"hashContexts":{"noTitle":depth0,"format":depth0},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":18,"column":36},"end":{"line":18,"column":106}}}))
    + "</a>\n  </div>\n</div>\n";
},"useData":true});
__DISCOURSE_RAW_TEMPLATES["javascripts/list/topic-thumbnail"] = requirejs('discourse-common/lib/raw-handlebars').template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"topic-thumbnail\">\n  <a href='"
    + container.escapeExpression(lookupProperty(helpers,"get").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.url",{"name":"get","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":2,"column":11},"end":{"line":2,"column":24}}}))
    + "'>\n    "
    + container.escapeExpression((lookupProperty(helpers,"preview-unbound")||(depth0 && lookupProperty(depth0,"preview-unbound"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"thumbnails",{"name":"preview-unbound","hash":{"opts":"opts","category":"category"},"hashTypes":{"opts":"PathExpression","category":"PathExpression"},"hashContexts":{"opts":depth0,"category":depth0},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":3,"column":4},"end":{"line":3,"column":62}}}))
    + "\n  </a>\n</div>\n";
},"useData":true});
__DISCOURSE_RAW_TEMPLATES["javascripts/list/topic-list-title"] = requirejs('discourse-common/lib/raw-handlebars').template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"mobileView",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(2, data, 0),"inverse":container.program(5, data, 0),"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":7,"column":6},"end":{"line":15,"column":13}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.featured_link",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(8, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":16,"column":6},"end":{"line":18,"column":13}}})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.unseen",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(3, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":8,"column":8},"end":{"line":10,"column":15}}})) != null ? stack1 : "");
},"3":function(container,depth0,helpers,partials,data) {
    return "          <span class=\"badge-notification new-topic\"></span>\n";
},"5":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"showTopicPostBadges",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(6, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":12,"column":8},"end":{"line":14,"column":15}}})) != null ? stack1 : "");
},"6":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "          "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic-post-badges",{"name":"raw","hash":{"url":"topic.lastUnreadUrl","unseen":"topic.unseen","newPosts":"topic.displayNewPosts","unread":"topic.unread"},"hashTypes":{"url":"PathExpression","unseen":"PathExpression","newPosts":"PathExpression","unread":"PathExpression"},"hashContexts":{"url":depth0,"unseen":depth0,"newPosts":depth0,"unread":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":13,"column":10},"end":{"line":13,"column":132}}}))
    + "\n";
},"8":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        "
    + container.escapeExpression((lookupProperty(helpers,"topic-featured-link")||(depth0 && lookupProperty(depth0,"topic-featured-link"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic",{"name":"topic-featured-link","hash":{},"hashTypes":{},"hashContexts":{},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":17,"column":8},"end":{"line":17,"column":37}}}))
    + "\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"topic.featured_link",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(8, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":20,"column":6},"end":{"line":22,"column":13}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"mobileView",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(2, data, 0),"inverse":container.program(5, data, 0),"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":23,"column":6},"end":{"line":31,"column":13}}})) != null ? stack1 : "");
},"12":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "  "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"list.topic-users",{"name":"raw","hash":{"posterNames":"posterNames","topic":"topic","tilesStyle":"tilesStyle"},"hashTypes":{"posterNames":"PathExpression","topic":"PathExpression","tilesStyle":"PathExpression"},"hashContexts":{"posterNames":depth0,"topic":depth0,"tilesStyle":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":38,"column":2},"end":{"line":38,"column":86}}}))
    + "\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"topic-title\">\n  <span class='link-top-line'>\n    "
    + container.escapeExpression((lookupProperty(helpers,"raw-plugin-outlet")||(depth0 && lookupProperty(depth0,"raw-plugin-outlet"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"raw-plugin-outlet","hash":{"name":"topic-list-before-status"},"hashTypes":{"name":"StringLiteral"},"hashContexts":{"name":depth0},"types":[],"contexts":[],"data":data,"loc":{"start":{"line":3,"column":4},"end":{"line":3,"column":57}}}))
    + "\n    "
    + container.escapeExpression((lookupProperty(helpers,"raw")||(depth0 && lookupProperty(depth0,"raw"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic-status",{"name":"raw","hash":{"topic":"topic"},"hashTypes":{"topic":"PathExpression"},"hashContexts":{"topic":depth0},"types":["StringLiteral"],"contexts":[depth0],"data":data,"loc":{"start":{"line":4,"column":4},"end":{"line":4,"column":38}}}))
    + container.escapeExpression((lookupProperty(helpers,"topic-link")||(depth0 && lookupProperty(depth0,"topic-link"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),"topic",{"name":"topic-link","hash":{"class":"raw-link raw-topic-link"},"hashTypes":{"class":"StringLiteral"},"hashContexts":{"class":depth0},"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":5,"column":4},"end":{"line":5,"column":57}}}))
    + "\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"tilesStyle",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(1, data, 0),"inverse":container.program(10, data, 0),"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":6,"column":4},"end":{"line":32,"column":11}}})) != null ? stack1 : "")
    + "\n    "
    + container.escapeExpression((lookupProperty(helpers,"raw-plugin-outlet")||(depth0 && lookupProperty(depth0,"raw-plugin-outlet"))||container.hooks.helperMissing).call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"raw-plugin-outlet","hash":{"name":"topic-list-after-title"},"hashTypes":{"name":"StringLiteral"},"hashContexts":{"name":depth0},"types":[],"contexts":[],"data":data,"loc":{"start":{"line":34,"column":4},"end":{"line":34,"column":55}}}))
    + "\n  </span>\n</div>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),"tilesStyle",{"name":"if","hash":{},"hashTypes":{},"hashContexts":{},"fn":container.program(12, data, 0),"inverse":container.noop,"types":["PathExpression"],"contexts":[depth0],"data":data,"loc":{"start":{"line":37,"column":0},"end":{"line":39,"column":7}}})) != null ? stack1 : "");
},"useData":true});
define("discourse/plugins/discourse-topic-list-previews/discourse/controllers/tlp-thumbnail-selector", ["exports", "ember-addons/ember-computed-decorators", "discourse/mixins/modal-functionality", "discourse/mixins/buffered-content"], function (_exports, _emberComputedDecorators, _modalFunctionality, _bufferedContent) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  var _default = Ember.Controller.extend(_modalFunctionality.default, (0, _bufferedContent.bufferedProperty)("model"), {
    thumbnailList: Ember.computed.oneWay('model.thumbnails'),
    modal_topic_title: Ember.computed.oneWay('model.topic_title'),
    buffered: Ember.computed.alias('model.buffered'),
    modal_title: 'thumbnail_selector.title',
    actions: {
      selectThumbnail: function selectThumbnail(image_url, image_upload_id) {
        var buffered = this.get('buffered');
        this.set("buffered.user_chosen_thumbnail_url", image_url);
        this.set("buffered.image_upload_id", image_upload_id);
        this.send('closeModal');
      }
    }
  });

  _exports.default = _default;
});
define("discourse/plugins/discourse-topic-list-previews/discourse/previews-route-map", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  var _default = {
    resource: "user.userActivity",
    map: function map() {
      this.route("portfolio");
    }
  };
  _exports.default = _default;
});


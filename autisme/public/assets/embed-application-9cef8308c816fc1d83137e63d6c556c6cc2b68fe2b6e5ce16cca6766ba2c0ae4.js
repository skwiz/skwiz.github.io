!function(){var t=document.getElementById("data-embedded").dataset.referer;function u(e){parent&&parent.postMessage(e,t)}function i(e){var t=e.target.getAttribute("data-link-to-post");if(t){t=document.getElementById("post-"+t);if(t){t=t.getBoundingClientRect();if(t&&t.top)return u({type:"discourse-scroll",top:t.top}),e.preventDefault(),!1}}}window.onload=function(){var e=document.querySelector("[data-embed-state]"),t="unknown",n=null;e&&(t=e.getAttribute("data-embed-state"),n=e.getAttribute("data-embed-id")),u({type:"discourse-resize",height:document.body.offsetHeight,state:t,embedId:n});for(var r=document.querySelectorAll("a[data-link-to-post]"),o=0;o<r.length;o++)r[o].onclick=i;var a=document.querySelectorAll(".cooked a");for(o=0;o<a.length;o++)a[o].target="_blank";var d=document.querySelectorAll(".username a");for(o=0;o<d.length;o++){var l=d[o].innerHTML;l&&(d[o].innerHTML=new BreakString(l).break())}}}();
//# sourceMappingURL=/assets/embed-application-9cef8308c816fc1d83137e63d6c556c6cc2b68fe2b6e5ce16cca6766ba2c0ae4.js.map
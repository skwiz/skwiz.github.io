// discourse-skip-module
(function () {
  var gaDataElement = document.getElementById("data-ga-universal-analytics");
  window.dataLayer = window.dataLayer || [];

  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  var autoLinkConfig = {};

  if (gaDataElement.dataset.autoLinkDomains.length) {
    var autoLinkDomains = gaDataElement.dataset.autoLinkDomains.split("|");
    autoLinkConfig = {
      linker: {
        accept_incoming: true,
        domains: autoLinkDomains
      }
    };
  }

  window.gtag("config", gaDataElement.dataset.trackingCode, {
    send_page_view: false,
    autoLinkConfig: autoLinkConfig
  });
})();

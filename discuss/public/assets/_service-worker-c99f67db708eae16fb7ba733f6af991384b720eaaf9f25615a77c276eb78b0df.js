'use strict';

importScripts("/javascripts/workbox/workbox-sw.js");

workbox.setConfig({
  modulePathPrefix: "/javascripts/workbox",
  debug: false
});

var authUrl = "/auth/";

var cacheVersion = "1";
var discourseCacheName = "discourse-" + cacheVersion;
var externalCacheName = "external-" + cacheVersion;

// Cache all GET requests, so Discourse can be used while offline

workbox.routing.registerRoute(
  function(args) {
    return args.url.origin === location.origin && !args.url.pathname.startsWith(authUrl);
  }, // Match all except auth routes
  new workbox.strategies.NetworkFirst({ // This will only use the cache when a network request fails
    cacheName: discourseCacheName,
    plugins: [
      new workbox.cacheableResponse.Plugin({
        statuses: [200] // opaque responses will return status code '0'
      }), // for s3 secure media signed urls
      new workbox.expiration.Plugin({
        maxAgeSeconds: 7* 24 * 60 * 60, // 7 days
        maxEntries: 250,
        purgeOnQuotaError: true, // safe to automatically delete if exceeding the available storage
      }),
    ],
  })
);

var cdnUrls = [];


workbox.routing.registerRoute(
  function(args) {
    if (args.url.origin === location.origin) {
      return false;
    }

    var matching = cdnUrls.filter(
      function(url) {
        return args.url.href.startsWith(url);
      }
    );
    return matching.length === 0;
  }, // Match all other external resources
  new workbox.strategies.NetworkFirst({ // This will only use the cache when a network request fails
    cacheName: externalCacheName,
    plugins: [
      new workbox.cacheableResponse.Plugin({
        statuses: [200] // opaque responses will return status code '0'
      }),
      new workbox.expiration.Plugin({
        maxAgeSeconds: 7* 24 * 60 * 60, // 7 days
        maxEntries: 250,
        purgeOnQuotaError: true, // safe to automatically delete if exceeding the available storage
      }),
    ],
  })
);

var idleThresholdTime = 1000 * 10; // 10 seconds
var lastAction = -1;

function isIdle() {
  return lastAction + idleThresholdTime < Date.now();
}

function showNotification(title, body, icon, badge, tag, baseUrl, url) {
  var notificationOptions = {
    body: body,
    icon: icon,
    badge: badge,
    data: { url: url, baseUrl: baseUrl },
    tag: tag
  }

  return self.registration.showNotification(title, notificationOptions);
}

self.addEventListener('push', function(event) {
  var payload = event.data.json();
  if(!isIdle() && payload.hide_when_active) {
    return false;
  }

  event.waitUntil(
    self.registration.getNotifications({ tag: payload.tag }).then(function(notifications) {
      if (notifications && notifications.length > 0) {
        notifications.forEach(function(notification) {
          notification.close();
        });
      }

      return showNotification(payload.title, payload.body, payload.icon, payload.badge, payload.tag, payload.base_url, payload.url);
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  // Android doesn't close the notification when you click on it
  // See: http://crbug.com/463146
  event.notification.close();
  var url = event.notification.data.url;
  var baseUrl = event.notification.data.baseUrl;

  // This looks to see if the current window is already open and
  // focuses if it is
  event.waitUntil(
    clients.matchAll({ type: "window" })
      .then(function(clientList) {
        var reusedClientWindow = clientList.some(function(client) {
          if (client.url === baseUrl + url && 'focus' in client) {
            client.focus();
            return true;
          }

          if ('postMessage' in client && 'focus' in client) {
            client.focus();
            client.postMessage({ url: url });
            return true;
          }
          return false;
        });

        if (!reusedClientWindow && clients.openWindow) return clients.openWindow(baseUrl + url);
      })
  );
});

self.addEventListener('message', function(event) {
  if('lastAction' in event.data){
    lastAction = event.data.lastAction;
  }
});

self.addEventListener('pushsubscriptionchange', function(event) {
  event.waitUntil(
    Promise.all(
      fetch('https://discuss.confais.org/push_notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: new URLSearchParams({
          "subscription[endpoint]": event.newSubscription.endpoint,
          "subscription[keys][auth]": event.newSubscription.toJSON().keys.auth,
          "subscription[keys][p256dh]": event.newSubscription.toJSON().keys.p256dh,
          "send_confirmation": false
        })
      }),
      fetch('https://discuss.confais.org/push_notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: new URLSearchParams({
          "subscription[endpoint]": event.oldSubscription.endpoint,
          "subscription[keys][auth]": event.oldSubscription.toJSON().keys.auth,
          "subscription[keys][p256dh]": event.oldSubscription.toJSON().keys.p256dh
        })
      })
    )
  );
});


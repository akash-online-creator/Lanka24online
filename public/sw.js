const CACHE_NAME = 'sahaya-sewa-v5';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.jpg',
  '/mixkit-manual-siren-fire-alert-1652.wav'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==============================================================
// 🚨 24/7 BACKGROUND PUSH & EMERGENCY DISASTER ALERT HANDLERS
// ==============================================================

// 1. Push Event (FCM / Web Push alerts when app is in background or screen is OFF)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: '🚨 සහය සේවා හදිසි දැනුම්දීම', body: event.data.text() };
    }
  }

  const payload = data.data || data;
  const category = payload.category || 'admin_broadcast';
  const title = payload.title || data.notification?.title || data.title || '🚨 සහය සේවා (Sahaya Seva)';
  const body = payload.body || payload.message || data.notification?.body || data.body || 'හදිසි ආපදාවක් හෝ නව ප්‍රජා ඉල්ලීමක් ඇත.';
  const locationName = payload.locationName || '';

  // Determine category-specific vibration patterns and action buttons
  let vibrationPattern = [300, 100, 300];
  let requireInteraction = false;
  let actions = [
    { action: 'open', title: '👁️ විස්තර බලන්න (Open)' },
    { action: 'dismiss', title: 'ඉවත් කරන්න' }
  ];

  if (category === 'red_alert') {
    // Continuous SOS Emergency Vibration pattern to wake up sleeping user
    vibrationPattern = [1000, 200, 1000, 200, 1500, 300, 2000];
    requireInteraction = true;
    actions = [
      { action: 'open_red_alert', title: '🚨 රතු එළිය බලන්න' },
      { action: 'stop', title: '🔇 ශබ්දය නවත්වන්න' }
    ];
  } else if (category === 'sos_live') {
    vibrationPattern = [500, 150, 500, 150, 800];
    requireInteraction = true;
    actions = [
      { action: 'open_sos', title: '📡 SOS සජීවී සිතියම' },
      { action: 'dismiss', title: 'ඉවත් කරන්න' }
    ];
  } else if (category === 'quick_service') {
    vibrationPattern = [250, 100, 250];
    actions = [
      { action: 'open_quick_service', title: '⚡ ක්ෂණික සේවය බලන්න' },
      { action: 'dismiss', title: 'පසුවට' }
    ];
  } else if (category === 'group_work') {
    vibrationPattern = [200, 100, 200];
    actions = [
      { action: 'open_group_work', title: '👥 ශ්‍රමදානයට එක්වන්න' },
      { action: 'dismiss', title: 'පසුවට' }
    ];
  }

  const fullBody = `${body}${locationName ? ` • 📍 ${locationName}` : ''}`;

  const options = {
    body: fullBody,
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    image: payload.image || undefined,
    tag: payload.tag || `sahaya-${category}-${Date.now()}`,
    data: {
      url: '/',
      category,
      alertId: payload.alertId,
      postId: payload.postId,
      groupId: payload.groupId,
      targetModal: category === 'red_alert' ? 'red_alert' : category === 'sos_live' ? 'red_alert' : category === 'quick_service' ? 'quick_service' : category === 'group_work' ? 'group_work' : 'admin'
    },
    vibrate: vibrationPattern,
    requireInteraction,
    actions
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Broadcast to any open windows/tabs
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({
            type: 'PUSH_NOTIFICATION_RECEIVED',
            payload: { category, title, body: fullBody, ...payload }
          });
        }
      });
    })
  );
});

// 2. Notification Click Event (Wakes up and opens App on click or stops siren)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'stop' || event.action === 'dismiss') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'STOP_ALERT_AUDIO',
            action: 'stop'
          });
        }
      })
    );
    return;
  }

  const targetData = event.notification.data || {};
  const targetUrl = targetData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and dispatch modal navigation
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NAVIGATE_TO_MODAL',
            targetModal: targetData.targetModal,
            targetPostId: targetData.alertId || targetData.postId || targetData.groupId,
          });
          return;
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. Network Fetch Handler with Offline Cache Fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exclude API requests and Firebase WebSockets from caching
  if (url.pathname.startsWith('/api') || url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        // Cache static audio and images
        if (url.pathname.endsWith('.wav') || url.pathname.endsWith('.mp3') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

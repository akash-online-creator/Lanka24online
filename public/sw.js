const CACHE_NAME = 'sahaya-sewa-v6';

// අත්‍යවශ්‍ය මූලික ගොනු පමණක් Precache කිරීම
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.jpg',
  '/mixkit-manual-siren-fire-alert-1652.wav',
  '/siren.wav'
];

// ==============================================================
// 1. Service Worker Lifecycle (Safe Precache & Instant Activation)
// ==============================================================

self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Promise.allSettled මඟින් එක් ගොනුවක් හෝ අස්ථානගත වුවහොත් Install වීම අසාර්ථක වීම වළක්වයි
      const results = await Promise.allSettled(
        PRECACHE_ASSETS.map((asset) => cache.add(asset))
      );
      results.forEach((res, idx) => {
        if (res.status === 'rejected') {
          console.warn(`[SW] Precache skipped for: ${PRECACHE_ASSETS[idx]}`);
        }
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`[SW] Deleting legacy cache: ${key}`);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==============================================================
// 2. Intelligent Network-First Strategy (Stale-Cache Trap වැළැක්වීම)
// ==============================================================

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // API calls, Firebase සහ WebSocket ඉල්ලීම් කිසිවිටෙකත් Cache නොකිරීම (Always Live Network)
  if (
    url.pathname.startsWith('/api') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firebase')
  ) {
    return;
  }

  // 1. Navigation (HTML පිටු): Network First - අලුත්ම කේතය ක්ෂණිකව ලබාගැනීම සඳහා
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // අන්තර්ජාලය නොමැති (Offline) අවස්ථාවකදී පමණක් Cache එකෙන් index.html ලබාදීම
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // 2. Static Assets (ශ්‍රව්‍ය ගොනු, පින්තූර, අකුරු): Cache First with Background Update
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        if (
          url.pathname.endsWith('.wav') ||
          url.pathname.endsWith('.mp3') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.jpg') ||
          url.pathname.endsWith('.svg') ||
          url.pathname.endsWith('.woff2')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
// ==============================================================
// 3. 🚨 24/7 Background Push Notification & Siren Broadcast Engine
// ==============================================================

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
  const title = payload.title || data.notification?.title || data.title || '🚨 සහය සේවා (Sahaya Sewa)';
  const body = payload.body || payload.message || data.notification?.body || data.body || 'හදිසි ආපදාවක් හෝ නව ප්‍රජා ඉල්ලීමක් ඇත.';
  const locationName = payload.locationName || '';

  // ආපදා සහ හදිසි අවස්ථා සඳහා සයිරන් කම්පන රටාව (Continuous SOS Vibration Pattern)
  let vibrationPattern = [300, 100, 300];
  let requireInteraction = false;
  let actions = [
    { action: 'open', title: '👁️ විස්තර බලන්න' },
    { action: 'dismiss', title: 'ඉවත් කරන්න' }
  ];

  if (category === 'red_alert') {
    // පරිශීලකයා නිදා සිටියත් අවදි වන තීව්‍ර SOS Vibration රටාව
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
      { action: 'open_quick_service', title: '⚡ සේවය බලන්න' },
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
      targetModal: category === 'red_alert' ? 'red_alert' : category === 'sos_live' ? 'red_alert' : category === 'quick_service' ? 'quick_service' : 'admin'
    },
    vibrate: vibrationPattern,
    requireInteraction,
    actions
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // දැනට විවෘතව ඇති Tabs / Windows වෙත සංඥා කිරීම
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

// ==============================================================
// 4. Notification Click & Audio Dismiss Handlers
// ==============================================================

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // සයිරන් ශබ්දය නැවැත්වීමේ ක්‍රියාව (Mute Action)
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
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Window/Tab වෙතින් එන පණිවුඩ හසුරුවන්නා
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || '🚨 සහය සේවා', {
      icon: '/logo.jpg',
      badge: '/logo.jpg',
      vibrate: [300, 100, 300],
      ...options
    });
  }
});

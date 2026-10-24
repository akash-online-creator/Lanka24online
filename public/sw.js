const CACHE_NAME = 'sahaya-sewa-v7';

const PRECACHE_ASSETS = [

  '/',

  '/index.html',

  '/manifest.json',

  '/logo.jpg',

  '/mixkit-manual-siren-fire-alert-1652.wav',

  '/siren.wav'

];

self.addEventListener('install', (event) => {

  self.skipWaiting();

  event.waitUntil(

    caches.open(CACHE_NAME).then(async (cache) => {

      await Promise.allSettled(PRECACHE_ASSETS.map((asset) => cache.add(asset)));

    })

  );

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

self.addEventListener('fetch', (event) => {

  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  const isLiveRequest = [

    url.pathname.startsWith('/api'),

    url.hostname.includes('firestore'),

    url.hostname.includes('googleapis'),

    url.hostname.includes('firebase')

  ].some(Boolean);

  if (isLiveRequest) {

    return;
  }

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

          return caches.match('/index.html') || caches.match('/');

        })

    );

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

async function showHighPriorityEmergencyNotification(payload) {

  const category = payload.category || 'red_alert';

  const disasterTitle = payload.disasterTitleSi || payload.title || 'හදිසි ආපදා අනතුරු ඇඟවීමක්';

  const locationName = payload.locationName || payload.location || 'ශ්‍රී ලංකාව';

  const distanceStr = payload.distanceKm ? ` (ඔබට දුර: කි.මී. ${payload.distanceKm})` : '';

  const desc = payload.description || payload.body || payload.message || 'වහාම ආරක්ෂිත පියවර ගන්න. සම්පූර්ණ විස්තර බැලීමට සහ සයිරන් නැවැත්වීමට මෙය ක්ලික් කරන්න.';

  const alertCode = payload.alertCode ? ` [${payload.alertCode}]` : '';

  const notifTitle = category === 'red_alert'

    ? `🚨 රතු එළිය හදිසි ආපදාවක්: ${disasterTitle}${alertCode}`

    : (payload.title || '🚨 සහය සේවා හදිසි දැනුම්දීම');

  const notifBody = `📍 ස්ථානය: ${locationName}${distanceStr}\n⚠️ ආපදාව: ${disasterTitle}\n📝 විස්තරය: ${desc}`;

  const vibrationPattern = category === 'red_alert'

    ? [1000, 200, 1000, 200, 1500, 200, 2000, 200, 2500]

    : [400, 150, 400, 150, 600];

  const actions = category === 'red_alert'

    ? [

        { action: 'open_red_alert', title: '🚨 ආපදා විස්තරය බලන්න' },

        { action: 'stop', title: '🔇 සයිරන් නවත්වන්න' }

      ]

    : [

        { action: 'open', title: '👁️ විස්තර බලන්න' },

        { action: 'dismiss', title: 'ඉවත් කරන්න' }

      ];

  const tagId = payload.alertId

    ? `sahaya-red-alert-${payload.alertId}`

    : (payload.tag || `sahaya-${category}-${Date.now()}`);

  const options = {

    body: notifBody,

    icon: '/logo.jpg',

    badge: '/logo.jpg',

    tag: tagId,

    renotify: true,

    requireInteraction: true,

    silent: false,

    vibrate: vibrationPattern,

    data: {

      url: '/',

      category,

      alertId: payload.alertId,

      postId: payload.postId,

      groupId: payload.groupId,

      targetModal: 'red_alert',

      payload

    },

    actions

  };

  await self.registration.showNotification(notifTitle, options);

  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

  for (const client of clients) {

    client.postMessage({

      type: 'PUSH_NOTIFICATION_RECEIVED',

      payload: {

        ...payload,

        category,

        title: notifTitle,

        body: notifBody,

        locationName

      }

    });

  }

}

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

  event.waitUntil(showHighPriorityEmergencyNotification(payload));

});

self.addEventListener('notificationclick', (event) => {

  event.notification.close();

  const targetData = event.notification.data || {};

  if (event.action === 'stop' || event.action === 'dismiss') {

    event.waitUntil(

      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {

        for (const client of clientList) {

          client.postMessage({

            type: 'STOP_ALERT_AUDIO',

            action: 'stop',

            alertId: targetData.alertId

          });

        }

      })

    );

    return;

  }

  const targetUrl = targetData.url || '/';

  event.waitUntil(

    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {

      for (const client of clientList) {

        if (client.url && 'focus' in client) {

          client.focus();

          client.postMessage({

            type: 'NAVIGATE_TO_MODAL',

            targetModal: 'red_alert',

            targetPostId: targetData.alertId || targetData.postId,

            payload: targetData.payload

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

self.addEventListener('message', (event) => {

  if (!event.data) return;

  if (event.data.type === 'TRIGGER_EMERGENCY_RED_ALERT') {

    event.waitUntil(showHighPriorityEmergencyNotification(event.data.payload || {}));

  } else if (event.data.type === 'TRIGGER_NOTIFICATION') {

    const title = event.data.title || '🚨 සහය සේවා';

    const options = event.data.options || {};

    event.waitUntil(

      self.registration.showNotification(title, {

        icon: '/logo.jpg',

        badge: '/logo.jpg',

        renotify: true,

        requireInteraction: true,

        silent: false,

        vibrate: [1000, 200, 1000, 200, 1500],

        ...options

      })

    );

  }

});


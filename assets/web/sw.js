const CACHE_NAME = 'sahaya-sewa-v4';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.jpg'
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
// 🚨 BACKGROUND PUSH & SYSTEM NOTIFICATION HANDLERS
// ==============================================================

// 1. Push Event (Web Push notifications when app is closed)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: '🚨 සහය සේවා හදිසි දැනුම්දීම', body: event.data.text() };
    }
  }

  const title = data.title || '🚨 සහය සේවා (Sahaya Seva)';
  const options = {
    body: data.body || data.message || 'හදිසි ආපදාවක් හෝ නව ප්‍රජා ඉල්ලීමක් ඇත.',
    icon: data.icon || '/logo.jpg',
    badge: '/logo.jpg',
    image: data.image || undefined,
    tag: data.tag || `sahaya-notif-${Date.now()}`,
    data: data.data || { url: '/', targetModal: data.targetModal, alertId: data.alertId },
    vibrate: [300, 100, 300, 100, 500],
    requireInteraction: data.requireInteraction !== false,
    actions: [
      { action: 'open', title: '👁️ විස්තර බලන්න (Open App)' },
      { action: 'dismiss', title: 'ඉවත් කරන්න (Dismiss)' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 2. Notification Click Event (Opens / focuses the App on click or stops audio)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // If user clicked Stop Sound button in notification
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

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and dispatch navigation
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            payload: event.notification.data
          });
          client.postMessage({
            type: 'STOP_ALERT_AUDIO',
            action: 'stop'
          });
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. Post Message handler from web page (for trigger background notification directly via SW)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || '🚨 සහය සේවා', {
      icon: '/logo.jpg',
      badge: '/logo.jpg',
      vibrate: [300, 100, 300, 100, 500],
      ...options
    });
  }
});

// 4. Background Sync / Periodic Background Sync for critical alerts
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-emergency-alerts') {
    event.waitUntil(Promise.resolve());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-urgent-alerts') {
    event.waitUntil(Promise.resolve());
  }
});

// ==============================================================
// 🌐 CACHING & OFFLINE ASSETS
// ==============================================================
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);

  // Exclude API calls, Firestore, and Vite development module requests completely from SW cache
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('vite') ||
    url.hostname.includes('firestore') || 
    url.hostname.includes('googleapis') || 
    url.hostname.includes('firebase')
  ) {
    return;
  }

  // Network First for HTML navigation to ensure fresh code loads immediately after updates
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html') || caches.match(event.request))
    );
    return;
  }

  // Network First for any JS/CSS scripts so code updates are never trapped in cache
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.tsx') || url.pathname.endsWith('.ts')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache First for static media assets (icons, images, logos)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
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

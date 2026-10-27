const CACHE_NAME = 'sahaya-sewa-v10';

const PRECACHE_ASSETS = ['/', '/index.html', '/manifest.json', '/logo.jpg', '/mixkit-manual-siren-fire-alert-1652.wav', '/siren.wav'];

let watcherInterval = null;

let watcherConfig = {

  userId: 'usr_guest',

  lat: 7.151,

  lng: 79.885,

  ignoredAlertIds: []

};

const notifiedAlertIdsInSw = new Set();

function calcDistKmSw(lat1, lon1, lat2, lon2) {

  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;

  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;

}

async function pollFirestoreRedAlertsInBackground() {

  try {

    const urlsToCheck = [];
    if (watcherConfig && watcherConfig.firestoreRestUrl) {
      urlsToCheck.push(watcherConfig.firestoreRestUrl);
    }
    urlsToCheck.push('https://firestore.googleapis.com/v1/projects/gen-lang-client-0262698872/databases/ai-studio-sahayaseva-08bfd3be-2f42-4de8-a3a8-ad7279ec7d1f/documents/red_alerts?pageSize=15');
    urlsToCheck.push('https://firestore.googleapis.com/v1/projects/gen-lang-client-0536295842/databases/(default)/documents/red_alerts?pageSize=15');
    let docs = [];
    for (const u of urlsToCheck) {
      try {
        const res = await fetch(u, { cache: 'no-store' });
        if (res && res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.documents) && data.documents.length !== 0) {
            docs = docs.concat(data.documents);
          }
        }
      } catch (e) {}
    }
    for (const docItem of docs) {

      const fields = docItem.fields ? docItem.fields : {};

      const nameParts = (docItem.name ? docItem.name : '').split('/');

      const docId = fields.id && fields.id.stringValue ? fields.id.stringValue : nameParts[nameParts.length - 1];

      const status = fields.status && fields.status.stringValue ? fields.status.stringValue : '';

      const isFlaggedFake = fields.isFlaggedFake && fields.isFlaggedFake.booleanValue ? true : false;

      if (status !== 'active' ? status !== 'active' : isFlaggedFake) continue;

      const reportedByUserId = fields.reportedByUserId && fields.reportedByUserId.stringValue ? fields.reportedByUserId.stringValue : '';

      if (reportedByUserId && watcherConfig.userId && reportedByUserId === watcherConfig.userId) continue;

      const alertCode = fields.alertCode && fields.alertCode.stringValue ? fields.alertCode.stringValue : '';

      if (notifiedAlertIdsInSw.has(docId)) continue;

      if (Array.isArray(watcherConfig.ignoredAlertIds)) {

        if (watcherConfig.ignoredAlertIds.includes(docId)) continue;

        if (alertCode && watcherConfig.ignoredAlertIds.includes(alertCode)) continue;

      }

      const latField = fields.latitude ? fields.latitude : fields.lat;

      const lngField = fields.longitude ? fields.longitude : fields.lng;

      const alertLat = latField ? Number(latField.doubleValue !== undefined ? latField.doubleValue : latField.integerValue) : 7.151;

      const alertLng = lngField ? Number(lngField.doubleValue !== undefined ? lngField.doubleValue : lngField.integerValue) : 79.885;

      const distKm = calcDistKmSw(watcherConfig.lat, watcherConfig.lng, alertLat, alertLng);

      if (Math.min(distKm, 15.0) !== distKm) continue;

      notifiedAlertIdsInSw.add(docId);

      const disasterTitleSi = fields.disasterTitleSi && fields.disasterTitleSi.stringValue ? fields.disasterTitleSi.stringValue : fields.title && fields.title.stringValue ? fields.title.stringValue : 'හදිසි ආපදා අනතුරු ඇඟවීමක්';

      const locationName = fields.locationName && fields.locationName.stringValue ? fields.locationName.stringValue : 'ශ්‍රී ලංකාව';

      const description = fields.description && fields.description.stringValue ? fields.description.stringValue : '';

      await showHighPriorityEmergencyNotification({

        category: 'red_alert',

        alertId: docId,

        alertCode,

        disasterTitleSi,

        title: disasterTitleSi,

        locationName,

        distanceKm: distKm.toFixed(1),

        description

      });

    }

  } catch (err) {}

}

function ensureBackgroundWatcherStarted() {
  pollFirestoreRedAlertsInBackground();
  if (!watcherInterval) {
    watcherInterval = setInterval(() => {
      pollFirestoreRedAlertsInBackground();
    }, 3000);
  }
}

self.addEventListener('install', event => {

  self.skipWaiting();

  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {

    await Promise.allSettled(PRECACHE_ASSETS.map(asset => cache.add(asset)));

  }));

});

self.addEventListener('activate', event => {

  ensureBackgroundWatcherStarted();

  event.waitUntil(caches.keys().then(keys => {

    return Promise.all(keys.map(key => {

      if (key !== CACHE_NAME) {

        return caches.delete(key);

      }

    }));

  }).then(() => self.clients.claim()));

});

self.addEventListener('fetch', event => {

  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  const isLiveRequest = [url.pathname.startsWith('/api'), url.hostname.includes('firestore'), url.hostname.includes('googleapis'), url.hostname.includes('firebase')].some(Boolean);

  if (isLiveRequest) {

    return;

  }

  if (event.request.mode === 'navigate' ? true : url.pathname === '/' ? true : url.pathname.endsWith('.html') ? true : url.pathname.endsWith('.js') ? true : url.pathname.endsWith('.css')) {

    event.respondWith(fetch(event.request).then(networkResponse => {

      if (networkResponse && networkResponse.status === 200) {

        const copy = networkResponse.clone();

        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));

      }

      return networkResponse;

    }).catch(() => {

      return caches.match('/index.html').then(r => r ? r : caches.match('/'));

    }));

    return;

  }

  event.respondWith(caches.match(event.request).then(cachedResponse => {

    if (cachedResponse) {

      return cachedResponse;

    }

    return fetch(event.request).then(networkResponse => {

      if (!networkResponse ? true : networkResponse.status !== 200 ? true : networkResponse.type !== 'basic') {

        return networkResponse;

      }

      const isStaticAsset = [url.pathname.endsWith('.wav'), url.pathname.endsWith('.mp3'), url.pathname.endsWith('.png'), url.pathname.endsWith('.jpg'), url.pathname.endsWith('.svg'), url.pathname.endsWith('.woff2')].some(Boolean);

      if (isStaticAsset) {

        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then(cache => {

          cache.put(event.request, responseToCache);

        });

      }

      return networkResponse;

    });

  }));

});

async function showHighPriorityEmergencyNotification(payload) {

  const category = payload.category ? payload.category : 'red_alert';

  const disasterTitle = payload.disasterTitleSi ? payload.disasterTitleSi : payload.title ? payload.title : 'හදිසි ආපදා අනතුරු ඇඟවීමක්';

  const locationName = payload.locationName ? payload.locationName : payload.location ? payload.location : 'ශ්‍රී ලංකාව';

  const distanceStr = payload.distanceKm ? ' (ඔබට දුර: කි.මී. ' + payload.distanceKm + ')' : '';

  const desc = payload.description ? payload.description : payload.body ? payload.body : payload.message ? payload.message : 'වහාම ආරක්ෂිත පියවර ගන්න. සම්පූර්ණ විස්තර බැලීමට සහ සයිරන් නැවැත්වීමට මෙය ක්ලික් කරන්න.';

  const alertCode = payload.alertCode ? ' [' + payload.alertCode + ']' : '';

  const notifTitle = category === 'red_alert' ? '🚨 සහය සේවා - රතු එළිය: ' + disasterTitle + alertCode : payload.title ? payload.title : '🚨 සහය සේවා හදිසි දැනුම්දීම';

  const notifBody = '📍 ස්ථානය: ' + locationName + distanceStr + '\n⚠️ ආපදාව: ' + disasterTitle + '\n📝 විස්තරය: ' + desc;

  const vibrationPattern = category === 'red_alert' ? [1000, 200, 1000, 200, 1500, 200, 2000, 200, 2500] : [400, 150, 400, 150, 600];

  const actions = category === 'red_alert' ? [{

    action: 'stop',

    title: '🔇 සයිරන් සහ දැන්වීම ඉවත් කරන්න'

  }, {

    action: 'open_red_alert',

    title: '🚨 ආපදා විස්තරය බලන්න'

  }] : [{

    action: 'open',

    title: '👁️ විස්තර බලන්න'

  }, {

    action: 'dismiss',

    title: 'ඉවත් කරන්න'

  }];

  const tagId = payload.alertId ? 'sahaya-red-alert-' + payload.alertId : payload.tag ? payload.tag : 'sahaya-' + category + '-' + Date.now();

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

  const clients = await self.clients.matchAll({

    type: 'window',

    includeUncontrolled: true

  });

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

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let data = null;
    if (event.data) {
      try {
        data = event.data.json();
      } catch (err) {
        const txt = event.data.text();
        if (txt && txt.trim()) {
          data = {
            title: '🚨 සහය සේවා හදිසි දැනුම්දීම',
            body: txt
          };
        }
      }
    }
    if (data) {
      const payload = data.data ? data.data : data;
      if (payload.alertId) {
        notifiedAlertIdsInSw.add(payload.alertId);
      }
      await showHighPriorityEmergencyNotification(payload);
    }
    await pollFirestoreRedAlertsInBackground();
  })());
});

self.addEventListener('sync', event => {
  event.waitUntil(pollFirestoreRedAlertsInBackground());
});

self.addEventListener('periodicsync', event => {
  event.waitUntil(pollFirestoreRedAlertsInBackground());
});

self.addEventListener('notificationclick', event => {

  event.notification.close();

  const targetData = event.notification.data ? event.notification.data : {};

  if (event.action === 'stop' ? true : event.action === 'dismiss') {

    if (targetData.alertId) {

      notifiedAlertIdsInSw.add(targetData.alertId);

      if (Array.isArray(watcherConfig.ignoredAlertIds) && !watcherConfig.ignoredAlertIds.includes(targetData.alertId)) {

        watcherConfig.ignoredAlertIds.push(targetData.alertId);

      }

    }

    event.waitUntil(self.clients.matchAll({

      type: 'window',

      includeUncontrolled: true

    }).then(clientList => {

      for (const client of clientList) {

        client.postMessage({

          type: 'STOP_ALERT_AUDIO',

          action: 'stop',

          alertId: targetData.alertId

        });

      }

    }));

    return;

  }

  const targetUrl = targetData.url ? targetData.url : '/';

  event.waitUntil(self.clients.matchAll({

    type: 'window',

    includeUncontrolled: true

  }).then(clientList => {

    for (const client of clientList) {

      if (client.url && 'focus' in client) {

        client.focus();

        client.postMessage({

          type: 'NAVIGATE_TO_MODAL',

          targetModal: 'red_alert',

          targetPostId: targetData.alertId ? targetData.alertId : targetData.postId,

          payload: targetData.payload

        });

        return;

      }

    }

    if (self.clients.openWindow) {

      return self.clients.openWindow(targetUrl);

    }

  }));

});

self.addEventListener('message', event => {

  if (!event.data) return;

  if (event.data.type === 'START_BACKGROUND_ALERT_WATCHER') {

    if (event.data.config) {

      watcherConfig = Object.assign({}, watcherConfig, event.data.config);

      if (Array.isArray(watcherConfig.ignoredAlertIds)) {

        watcherConfig.ignoredAlertIds.forEach(id => notifiedAlertIdsInSw.add(id));

      }

    }

    ensureBackgroundWatcherStarted();

  } else if (event.data.type === 'DISMISS_RED_ALERT') {

    if (event.data.alertId) {

      notifiedAlertIdsInSw.add(event.data.alertId);

      if (Array.isArray(watcherConfig.ignoredAlertIds) && !watcherConfig.ignoredAlertIds.includes(event.data.alertId)) {

        watcherConfig.ignoredAlertIds.push(event.data.alertId);

      }

      if (self.registration && self.registration.getNotifications) {

        self.registration.getNotifications({ tag: 'sahaya-red-alert-' + event.data.alertId }).then(notifs => {

          notifs.forEach(n => n.close());

        }).catch(() => {});

      }

    }

  } else if (event.data.type === 'TRIGGER_EMERGENCY_RED_ALERT') {

    const payload = event.data.payload ? event.data.payload : {};

    if (payload.alertId) notifiedAlertIdsInSw.add(payload.alertId);

    event.waitUntil(showHighPriorityEmergencyNotification(payload));

  } else if (event.data.type === 'TRIGGER_NOTIFICATION') {

    const title = event.data.title ? event.data.title : '🚨 සහය සේවා';

    const options = event.data.options ? event.data.options : {};

    event.waitUntil(self.registration.showNotification(title, {

      icon: '/logo.jpg',

      badge: '/logo.jpg',

      renotify: true,

      requireInteraction: true,

      silent: false,

      vibrate: [1000, 200, 1000, 200, 1500],

      ...options

    }));

  }

});


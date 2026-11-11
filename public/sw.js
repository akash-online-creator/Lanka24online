const CACHE_NAME = 'sahaya-sewa-v13';

const PRECACHE_ASSETS = ['/', '/index.html', '/manifest.json', '/logo.jpg', '/mixkit-manual-siren-fire-alert-1652.wav', '/siren.wav'];

let watcherInterval = null;
let isFirstPollInSw = true;

let watcherConfig = {
  userId: 'usr_guest',
  lat: 7.151,
  lng: 79.885,
  ignoredAlertIds: [],
  firestoreBaseUrls: [
    'https://firestore.googleapis.com/v1/projects/gen-lang-client-0262698872/databases/ai-studio-sahayaseva-08bfd3be-2f42-4de8-a3a8-ad7279ec7d1f/documents'
  ]
};

const notifiedAlertIdsInSw = new Set();
const notifiedBroadcastIdsInSw = new Set();

function calcDistKmSw(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getStringField(fields, key, fallback = '') {
  if (!fields || !fields[key]) return fallback;
  if (fields[key].stringValue !== undefined) return String(fields[key].stringValue);
  if (fields[key].integerValue !== undefined) return String(fields[key].integerValue);
  if (fields[key].doubleValue !== undefined) return String(fields[key].doubleValue);
  return fallback;
}

function getNumberField(fields, key, fallback = null) {
  if (!fields || !fields[key]) return fallback;
  if (fields[key].doubleValue !== undefined) return Number(fields[key].doubleValue);
  if (fields[key].integerValue !== undefined) return Number(fields[key].integerValue);
  if (fields[key].stringValue !== undefined) {
    const n = Number(fields[key].stringValue);
    return isNaN(n) ? fallback : n;
  }
  return fallback;
}

function getBoolField(fields, key) {
  if (!fields || !fields[key]) return false;
  return Boolean(fields[key].booleanValue);
}

async function pollFirestoreCollection(colName, pageSize = 15) {
  const baseUrls = Array.isArray(watcherConfig.firestoreBaseUrls) && watcherConfig.firestoreBaseUrls.length > 0
    ? watcherConfig.firestoreBaseUrls
    : [
        'https://firestore.googleapis.com/v1/projects/gen-lang-client-0262698872/databases/ai-studio-sahayaseva-08bfd3be-2f42-4de8-a3a8-ad7279ec7d1f/documents'
      ];
  let docs = [];
  for (const base of baseUrls) {
    try {
      const url = `${base}/${colName}?pageSize=${pageSize}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res && res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.documents) && data.documents.length !== 0) {
          docs = docs.concat(data.documents);
        }
      }
    } catch (e) {}
  }
  return docs;
}

async function pollFirestoreAllAlertsInBackground() {
  try {
    const isInitialSeed = isFirstPollInSw;
    const nowMs = Date.now();

    // 1. Poll Red Alerts (රතු එළිය - 15km Siren & Screen Wake)
    const redDocs = await pollFirestoreCollection('red_alerts', 15);
    for (const docItem of redDocs) {
      const fields = docItem.fields ? docItem.fields : {};
      const nameParts = (docItem.name ? docItem.name : '').split('/');
      const docId = getStringField(fields, 'id', nameParts[nameParts.length - 1]);
      if (!docId || notifiedAlertIdsInSw.has(docId)) continue;

      const status = getStringField(fields, 'status', '');
      const isFlaggedFake = getBoolField(fields, 'isFlaggedFake');
      const isDeleted = getBoolField(fields, 'isDeleted');
      const isRemovedAsFake = getBoolField(fields, 'isRemovedAsFake');
      const confidenceStatus = getStringField(fields, 'confidenceStatus', '');
      if (status !== 'active' || isFlaggedFake || isDeleted || isRemovedAsFake || confidenceStatus === 'removed') {
        notifiedAlertIdsInSw.add(docId);
        continue;
      }

      const createdAtMs = getNumberField(fields, 'createdAtMs', 0);
      if (isInitialSeed && createdAtMs > 0 && (nowMs - createdAtMs) > 60000) {
        notifiedAlertIdsInSw.add(docId);
        continue;
      }
      if (createdAtMs > 0 && (nowMs - createdAtMs) > 24 * 60 * 60 * 1000) {
        notifiedAlertIdsInSw.add(docId);
        continue;
      }

      const reportedByUserId = getStringField(fields, 'reportedByUserId', '');
      if (reportedByUserId && watcherConfig.userId && reportedByUserId === watcherConfig.userId) {
        notifiedAlertIdsInSw.add(docId);
        continue;
      }

      const alertCode = getStringField(fields, 'alertCode', '');
      if (Array.isArray(watcherConfig.ignoredAlertIds)) {
        if (watcherConfig.ignoredAlertIds.includes(docId)) {
          notifiedAlertIdsInSw.add(docId);
          continue;
        }
        if (alertCode && watcherConfig.ignoredAlertIds.includes(alertCode)) {
          notifiedAlertIdsInSw.add(docId);
          continue;
        }
      }

      const alertLat = getNumberField(fields, 'latitude', getNumberField(fields, 'lat', 7.151));
      const alertLng = getNumberField(fields, 'longitude', getNumberField(fields, 'lng', 79.885));
      const distKm = calcDistKmSw(watcherConfig.lat, watcherConfig.lng, alertLat, alertLng);
      if (distKm > 15.0) continue;

      notifiedAlertIdsInSw.add(docId);

      const disasterTitleSi = getStringField(fields, 'disasterTitleSi', getStringField(fields, 'title', 'හදිසි ආපදා අනතුරු ඇඟවීමක්'));
      const locationName = getStringField(fields, 'locationName', 'ශ්‍රී ලංකාව');
      const description = getStringField(fields, 'description', '');

      await showHighPriorityEmergencyNotification({
        category: 'red_alert',
        alertId: docId,
        alertCode,
        disasterTitleSi,
        title: disasterTitleSi,
        locationName,
        distanceKm: distKm.toFixed(1),
        description,
        targetModal: 'red_alert',
        targetPostId: docId
      });
    }

    // 2. Poll Push Broadcast Queue (Real-time push queue for Quick Service, Blood, Aid Ledger, Help Requests, Red Alert)
    const queueDocs = await pollFirestoreCollection('push_broadcast_queue', 20);
    for (const docItem of queueDocs) {
      const fields = docItem.fields ? docItem.fields : {};
      const nameParts = (docItem.name ? docItem.name : '').split('/');
      const docId = nameParts[nameParts.length - 1];
      if (!docId || notifiedBroadcastIdsInSw.has(docId)) continue;

      const createdAtMs = getNumberField(fields, 'createdAtMs', 0);
      // Only fire for recent broadcasts (within last 60 seconds)
      if (isInitialSeed || (createdAtMs > 0 && (nowMs - createdAtMs) > 60000)) {
        notifiedBroadcastIdsInSw.add(docId);
        continue;
      }

      const senderId = getStringField(fields, 'senderId', '');
      if (senderId && watcherConfig.userId && senderId === watcherConfig.userId) {
        notifiedBroadcastIdsInSw.add(docId);
        continue;
      }

      const category = getStringField(fields, 'category', 'quick_service');
      const alertId = getStringField(fields, 'alertId', '');
      const alertCode = getStringField(fields, 'alertCode', '');
      const postId = getStringField(fields, 'postId', '');
      const uniqueRefId = alertId || postId || docId;

      if (
        notifiedAlertIdsInSw.has(uniqueRefId) ||
        (Array.isArray(watcherConfig.ignoredAlertIds) &&
          ((alertId && watcherConfig.ignoredAlertIds.includes(alertId)) ||
            (alertCode && watcherConfig.ignoredAlertIds.includes(alertCode)) ||
            watcherConfig.ignoredAlertIds.includes(uniqueRefId)))
      ) {
        notifiedBroadcastIdsInSw.add(docId);
        continue;
      }

      const itemLat = getNumberField(fields, 'latitude', getNumberField(fields, 'lat', null));
      const itemLng = getNumberField(fields, 'longitude', getNumberField(fields, 'lng', null));
      const radiusKm = getNumberField(fields, 'radiusKm', 15.0);
      let distKm = 0;

      if (itemLat !== null && itemLng !== null) {
        distKm = calcDistKmSw(watcherConfig.lat, watcherConfig.lng, itemLat, itemLng);
        if (distKm > radiusKm) {
          notifiedBroadcastIdsInSw.add(docId);
          continue;
        }
      }

      notifiedBroadcastIdsInSw.add(docId);
      notifiedAlertIdsInSw.add(uniqueRefId);

      const title = getStringField(fields, 'title', '🚨 සහය සේවා හදිසි දැනුම්දීම');
      const body = getStringField(fields, 'body', getStringField(fields, 'message', 'නව දැනුම්දීමක් ලැබී ඇත.'));
      const locationName = getStringField(fields, 'locationName', 'ශ්‍රී ලංකාව');
      const targetModal = getStringField(fields, 'targetModal', category === 'red_alert' ? 'red_alert' : category === 'emergency_blood' ? 'blood' : category === 'aid_ledger' ? 'aid_ledger' : category === 'quick_service' ? 'quick_service' : 'detail');

      await showHighPriorityEmergencyNotification({
        category,
        alertId: alertId || undefined,
        postId: postId || undefined,
        title,
        body,
        description: body,
        locationName,
        distanceKm: distKm > 0 ? distKm.toFixed(1) : undefined,
        targetModal,
        targetPostId: alertId || postId || docId
      });
    }

    // 3. Poll Blood Requests (ලේ ඉල්ලීම් - blood_requests collection)
    const bloodDocs = await pollFirestoreCollection('blood_requests', 15);
    for (const docItem of bloodDocs) {
      const fields = docItem.fields ? docItem.fields : {};
      const nameParts = (docItem.name ? docItem.name : '').split('/');
      const docId = getStringField(fields, 'id', nameParts[nameParts.length - 1]);
      if (!docId || notifiedAlertIdsInSw.has(docId)) continue;

      const status = getStringField(fields, 'status', 'active');
      if (status !== 'active') {
        notifiedAlertIdsInSw.add(docId);
        continue;
      }

      const createdAtMs = getNumberField(fields, 'createdAtMs', 0);
      if (isInitialSeed && (createdAtMs === 0 || (nowMs - createdAtMs) > 60000)) {
        notifiedAlertIdsInSw.add(docId);
        continue;
      }

      const authorId = getStringField(fields, 'userId', '');
      if (authorId && watcherConfig.userId && authorId === watcherConfig.userId) {
        notifiedAlertIdsInSw.add(docId);
        continue;
      }

      notifiedAlertIdsInSw.add(docId);
      const bloodGroup = getStringField(fields, 'bloodGroup', '');
      const hospitalName = getStringField(fields, 'hospitalName', '');
      const patientName = getStringField(fields, 'patientName', '');
      const unitsNeeded = getStringField(fields, 'unitsNeeded', '1');
      const district = getStringField(fields, 'district', 'ශ්‍රී ලංකාව');

      await showHighPriorityEmergencyNotification({
        category: 'emergency_blood',
        postId: docId,
        title: `🩸 හදිසි ${bloodGroup} ලේ ඉල්ලීමක්!`,
        body: `${hospitalName} - ${patientName} වෙනුවෙන් ${bloodGroup} ලේ ඒකක ${unitsNeeded}ක් හදිසියේ අවශ්‍යයි.`,
        description: `${hospitalName} (${district}) - ${patientName} වෙනුවෙන් ${bloodGroup} ලේ ඒකක ${unitsNeeded}ක් හදිසියේ අවශ්‍යයි.`,
        locationName: `${hospitalName}, ${district}`,
        targetModal: 'blood',
        targetPostId: docId
      });
    }

    // 4. Poll Disaster Relief Requests (සහන සේවා ඉල්ලීම් - disaster_relief collection)
    const reliefDocs = await pollFirestoreCollection('disaster_relief', 15);
    for (const docItem of reliefDocs) {
      const fields = docItem.fields ? docItem.fields : {};
      const nameParts = (docItem.name ? docItem.name : '').split('/');
      const docId = getStringField(fields, 'id', nameParts[nameParts.length - 1]);
      if (!docId || notifiedAlertIdsInSw.has(docId)) continue;

      const createdAtMs = getNumberField(fields, 'createdAtMs', 0);
      if (isInitialSeed && (createdAtMs === 0 || (nowMs - createdAtMs) > 60000)) {
        notifiedAlertIdsInSw.add(docId);
        continue;
      }

      const authorId = getStringField(fields, 'userId', '');
      if (authorId && watcherConfig.userId && authorId === watcherConfig.userId) {
        notifiedAlertIdsInSw.add(docId);
        continue;
      }

      notifiedAlertIdsInSw.add(docId);
      const rTitle = getStringField(fields, 'title', 'හදිසි ආපදා සහන ඉල්ලීමක්');
      const rLoc = getStringField(fields, 'locationName', '');
      const rDist = getStringField(fields, 'district', 'ශ්‍රී ලංකාව');
      const rDesc = getStringField(fields, 'description', 'ආපදා සහනාධාර ද්‍රව්‍ය කඩිනමින් අවශ්‍යයි.');

      await showHighPriorityEmergencyNotification({
        category: 'aid_ledger',
        postId: docId,
        title: `📦 සහන සේවා ඉල්ලීමක්: ${rTitle}`,
        body: `${rLoc} (${rDist}) - ${rDesc}`,
        description: `${rLoc} (${rDist}) - ${rDesc}`,
        locationName: `${rLoc}, ${rDist}`,
        targetModal: 'aid_ledger',
        targetPostId: docId
      });
    }

    // 5. Poll Help Posts (ඉක්මන් සේවා / ලේ ඉල්ලීම් / සහන සේවා ඉල්ලීම් in posts collection)
    const postDocs = await pollFirestoreCollection('posts', 20);
    for (const docItem of postDocs) {
      const fields = docItem.fields ? docItem.fields : {};
      const nameParts = (docItem.name ? docItem.name : '').split('/');
      const docId = getStringField(fields, 'id', nameParts[nameParts.length - 1]);
      if (!docId || notifiedAlertIdsInSw.has(docId)) continue;

      const status = getStringField(fields, 'status', 'active');
      const isDeleted = getBoolField(fields, 'isDeleted');
      if (isDeleted || (status !== 'active' && status !== 'open')) {
        notifiedAlertIdsInSw.add(docId);
        continue;
      }

      const createdAtMs = getNumberField(fields, 'createdAtMs', 0);
      if (isInitialSeed && (createdAtMs === 0 || (nowMs - createdAtMs) > 60000)) {
        notifiedAlertIdsInSw.add(docId);
        continue;
      }

      const authorId = getStringField(fields, 'userId', getStringField(fields, 'authorId', ''));
      if (authorId && watcherConfig.userId && authorId === watcherConfig.userId) {
        notifiedAlertIdsInSw.add(docId);
        continue;
      }

      const pLat = getNumberField(fields, 'latitude', getNumberField(fields, 'lat', null));
      const pLng = getNumberField(fields, 'longitude', getNumberField(fields, 'lng', null));
      let distKm = 0;
      if (pLat !== null && pLng !== null) {
        distKm = calcDistKmSw(watcherConfig.lat, watcherConfig.lng, pLat, pLng);
        if (distKm > 15.0) {
          notifiedAlertIdsInSw.add(docId);
          continue;
        }
      }

      notifiedAlertIdsInSw.add(docId);

      const postCat = getStringField(fields, 'category', 'quick_services');
      const postType = getStringField(fields, 'postType', '');
      const postCode = getStringField(fields, 'postCode', '');
      const headline = getStringField(fields, 'headline', getStringField(fields, 'title', getStringField(fields, 'whatHappened', 'නව සහන සේවා දැන්වීමක්')));
      const whatIsNeeded = getStringField(fields, 'whatIsNeeded', getStringField(fields, 'content', headline));
      const locName = getStringField(fields, 'locationName', 'ශ්‍රී ලංකාව');

      let notifCat = 'help_request';
      let targetModal = 'detail';
      let displayTitle = `🤝 නව සහන සේවා ඉල්ලීමක්: ${headline}`;

      if (postCode.startsWith('#BLD-') || postCat === 'blood_disaster' || headline.includes('ලේ') || headline.includes('🩸')) {
        notifCat = 'emergency_blood';
        targetModal = 'blood';
        displayTitle = `🩸 හදිසි ලේ ඉල්ලීමක්: ${headline}`;
      } else if (postCode.startsWith('#EMG-') || postCat === 'emergency') {
        notifCat = 'aid_ledger';
        targetModal = 'aid_ledger';
        displayTitle = `📦 හදිසි සහන සේවා ඉල්ලීමක්: ${headline}`;
      } else if (postCat === 'quick_services' || postType === 'quick_service') {
        notifCat = 'quick_service';
        targetModal = 'quick_service';
        displayTitle = `⚡ ඉක්මන් සේවා ඉල්ලීමක්: ${headline}`;
      }

      await showHighPriorityEmergencyNotification({
        category: notifCat,
        postId: docId,
        title: displayTitle,
        body: whatIsNeeded,
        description: whatIsNeeded,
        locationName: locName,
        distanceKm: distKm > 0 ? distKm.toFixed(1) : undefined,
        targetModal,
        targetPostId: docId
      });
    }

    isFirstPollInSw = false;
  } catch (err) {}
}

function ensureBackgroundWatcherStarted() {
  pollFirestoreAllAlertsInBackground();
  if (!watcherInterval) {
    watcherInterval = setInterval(() => {
      pollFirestoreAllAlertsInBackground();
    }, 12000);
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
  const isLiveRequest = [
    url.pathname.startsWith('/api'),
    url.hostname.includes('firestore'),
    url.hostname.includes('googleapis'),
    url.hostname.includes('firebase')
  ].some(Boolean);

  if (isLiveRequest) {
    return;
  }

  if (
    event.request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html').then(r => (r ? r : caches.match('/')));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const isStaticAsset = [
          url.pathname.endsWith('.wav'),
          url.pathname.endsWith('.mp3'),
          url.pathname.endsWith('.png'),
          url.pathname.endsWith('.jpg'),
          url.pathname.endsWith('.svg'),
          url.pathname.endsWith('.woff2')
        ].some(Boolean);

        if (isStaticAsset) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

async function showHighPriorityEmergencyNotification(payload, notifyClients = true) {
  if (
    Array.isArray(watcherConfig.ignoredAlertIds) &&
    ((payload.alertId && watcherConfig.ignoredAlertIds.includes(payload.alertId)) ||
      (payload.alertCode && watcherConfig.ignoredAlertIds.includes(payload.alertCode)))
  ) {
    return;
  }
  const category = payload.category ? payload.category : 'red_alert';
  const isRedAlert = category === 'red_alert';
  const disasterTitle = payload.disasterTitleSi
    ? payload.disasterTitleSi
    : payload.title
    ? payload.title
    : isRedAlert
    ? 'හදිසි ආපදා අනතුරු ඇඟවීමක්'
    : 'සහය සේවා දැනුම්දීමක්';
  const locationName = payload.locationName
    ? payload.locationName
    : payload.location
    ? payload.location
    : 'ශ්‍රී ලංකාව';
  const distanceStr = payload.distanceKm ? ' (ඔබට දුර: කි.මී. ' + payload.distanceKm + ')' : '';
  const desc = payload.description
    ? payload.description
    : payload.body
    ? payload.body
    : payload.message
    ? payload.message
    : isRedAlert
    ? 'වහාම ආරක්ෂිත පියවර ගන්න. සම්පූර්ණ විස්තර බැලීමට සහ සයිරන් නැවැත්වීමට මෙය ක්ලික් කරන්න.'
    : 'සම්පූර්ණ විස්තර බැලීමට මෙය ක්ලික් කරන්න.';
  const alertCode = payload.alertCode ? ' [' + payload.alertCode + ']' : '';

  let notifTitle = disasterTitle;
  if (isRedAlert) {
    notifTitle = disasterTitle.startsWith('🚨')
      ? disasterTitle + alertCode
      : '🚨 සහය සේවා - රතු එළිය: ' + disasterTitle + alertCode;
  } else if (category === 'quick_service') {
    notifTitle = disasterTitle.startsWith('⚡') ? disasterTitle : '⚡ ඉක්මන් සේවා: ' + disasterTitle;
  } else if (category === 'emergency_blood') {
    notifTitle = disasterTitle.startsWith('🩸') ? disasterTitle : '🩸 හදිසි ලේ ඉල්ලීමක්: ' + disasterTitle;
  } else if (category === 'aid_ledger' || category === 'disaster_relief') {
    notifTitle = disasterTitle.startsWith('📦') ? disasterTitle : '📦 සහන සේවා ඉල්ලීමක්: ' + disasterTitle;
  } else if (category === 'help_request') {
    notifTitle = disasterTitle.startsWith('🤝') ? disasterTitle : '🤝 සහන සේවා ඉල්ලීමක්: ' + disasterTitle;
  }

  const notifBody = isRedAlert
    ? '📍 ස්ථානය: ' + locationName + distanceStr + '\n⚠️ ආපදාව: ' + disasterTitle + '\n📝 විස්තරය: ' + desc
    : '📍 ස්ථානය: ' + locationName + distanceStr + '\n📝 ' + desc;

  const vibrationPattern = isRedAlert
    ? [1000, 200, 1000, 200, 1500, 200, 2000, 200, 2500]
    : [500, 150, 500, 150, 700];

  const actions = isRedAlert
    ? [
        {
          action: 'stop',
          title: '🔇 සයිරන් සහ දැන්වීම ඉවත් කරන්න'
        },
        {
          action: 'open_red_alert',
          title: '🚨 ආපදා විස්තරය බලන්න'
        }
      ]
    : [
        {
          action: 'open',
          title: '👁️ විස්තර බලන්න'
        },
        {
          action: 'dismiss',
          title: 'ඉවත් කරන්න'
        }
      ];

  const tagId = payload.alertId
    ? 'sahaya-red-alert-' + payload.alertId
    : payload.postId
    ? 'sahaya-post-' + payload.postId
    : payload.tag
    ? payload.tag
    : 'sahaya-' + category + '-' + Date.now();

  const resolvedTargetModal = payload.targetModal
    ? payload.targetModal
    : isRedAlert
    ? 'red_alert'
    : category === 'emergency_blood'
    ? 'blood'
    : category === 'aid_ledger' || category === 'disaster_relief'
    ? 'aid_ledger'
    : category === 'quick_service'
    ? 'quick_service'
    : 'detail';

  const options = {
    body: notifBody,
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    tag: tagId,
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: vibrationPattern,
    actions,
    data: {
      url: '/',
      category,
      alertId: payload.alertId,
      postId: payload.postId,
      groupId: payload.groupId,
      targetModal: resolvedTargetModal,
      targetPostId: payload.targetPostId || payload.alertId || payload.postId,
      payload
    }
  };

  await self.registration.showNotification(notifTitle, options);

  if (!notifyClients) return;

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
        locationName,
        targetModal: resolvedTargetModal,
        targetPostId: payload.targetPostId || payload.alertId || payload.postId
      }
    });
  }
}

self.addEventListener('push', event => {
  event.waitUntil(
    (async () => {
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
        const payload = data.data ? { ...data.notification, ...data.data } : data;
        const uniqueId = payload.alertId || payload.postId;
        if (uniqueId) {
          notifiedAlertIdsInSw.add(uniqueId);
        }
        await showHighPriorityEmergencyNotification(payload);
      }
      await pollFirestoreAllAlertsInBackground();
    })()
  );
});

self.addEventListener('sync', event => {
  event.waitUntil(pollFirestoreAllAlertsInBackground());
});

self.addEventListener('periodicsync', event => {
  event.waitUntil(pollFirestoreAllAlertsInBackground());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetData = event.notification.data ? event.notification.data : {};

  if (event.action === 'stop' || event.action === 'dismiss') {
    if (targetData.alertId) {
      notifiedAlertIdsInSw.add(targetData.alertId);
      if (
        Array.isArray(watcherConfig.ignoredAlertIds) &&
        !watcherConfig.ignoredAlertIds.includes(targetData.alertId)
      ) {
        watcherConfig.ignoredAlertIds.push(targetData.alertId);
      }
    }

    event.waitUntil(
      self.clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true
        })
        .then(clientList => {
          for (const client of clientList) {
            client.postMessage({
              type: 'STOP_ALERT_AUDIO',
              action: 'stop',
              alertId: targetData.alertId,
              postId: targetData.postId
            });
          }
        })
    );
    return;
  }

  const targetUrl = targetData.url ? targetData.url : '/';

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true
      })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NAVIGATE_TO_MODAL',
              targetModal: targetData.targetModal || (targetData.alertId ? 'red_alert' : 'detail'),
              targetPostId: targetData.targetPostId || targetData.alertId || targetData.postId,
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
    const idsToIgnore = [event.data.alertId, event.data.alertCode].filter(Boolean);
    idsToIgnore.forEach(idVal => {
      notifiedAlertIdsInSw.add(idVal);
      if (
        Array.isArray(watcherConfig.ignoredAlertIds) &&
        !watcherConfig.ignoredAlertIds.includes(idVal)
      ) {
        watcherConfig.ignoredAlertIds.push(idVal);
      }
    });
    if (self.registration && self.registration.getNotifications) {
      self.registration
        .getNotifications()
        .then(notifs => {
          notifs.forEach(n => {
            if (
              event.data.stopAll ||
              (event.data.alertId && n.tag === 'sahaya-red-alert-' + event.data.alertId) ||
              (n.tag && String(n.tag).startsWith('sahaya-red-alert-'))
            ) {
              n.close();
            }
          });
        })
        .catch(() => {});
    }
  } else if (event.data.type === 'TRIGGER_EMERGENCY_RED_ALERT' || event.data.type === 'TRIGGER_BACKGROUND_PUSH_ALERT') {
    const payload = event.data.payload ? event.data.payload : {};
    const uniqueId = payload.alertId || payload.postId;
    if (uniqueId) notifiedAlertIdsInSw.add(uniqueId);
    event.waitUntil(showHighPriorityEmergencyNotification(payload, false));
  } else if (event.data.type === 'TRIGGER_NOTIFICATION') {
    const title = event.data.title ? event.data.title : '🚨 සහය සේවා';
    const options = event.data.options ? event.data.options : {};
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

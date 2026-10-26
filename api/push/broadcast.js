import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (admin.apps.length === 0) {
try {
const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (serviceAccountEnv) {
const serviceAccount = JSON.parse(serviceAccountEnv);
admin.initializeApp({
credential: admin.credential.cert(serviceAccount),
projectId: serviceAccount.project_id ? serviceAccount.project_id : 'gen-lang-client-0262698872',
});
} else {
admin.initializeApp({
projectId: process.env.FIREBASE_PROJECT_ID ? process.env.FIREBASE_PROJECT_ID : 'gen-lang-client-0262698872',
});
}
} catch (err) {
console.warn('Firebase Admin init warning:', err);
}
}

export default async function handler(req, res) {
if (req.method !== 'POST') {
return res.status(405).json({ error: 'Method Not Allowed' });
}

try {
const bodyData = req.body ? req.body : {};
const category = bodyData.category ? String(bodyData.category) : 'red_alert';
const title = bodyData.title ? String(bodyData.title) : '🚨 සහය සේවා - රතු එළිය';
const body = bodyData.body ? String(bodyData.body) : 'හදිසි ආපදා අනතුරු ඇඟවීමක් වාර්තා වී ඇත.';
const alertId = bodyData.alertId ? String(bodyData.alertId) : '';
const postId = bodyData.postId ? String(bodyData.postId) : '';
const groupId = bodyData.groupId ? String(bodyData.groupId) : '';
const locationName = bodyData.locationName ? String(bodyData.locationName) : 'ශ්‍රී ලංකාව';
const latitude = bodyData.latitude !== undefined ? String(bodyData.latitude) : '';
const longitude = bodyData.longitude !== undefined ? String(bodyData.longitude) : '';
const radiusKm = bodyData.radiusKm !== undefined ? String(bodyData.radiusKm) : '15.0';
const urgency = bodyData.urgency ? String(bodyData.urgency) : 'high';
const senderName = bodyData.senderName ? String(bodyData.senderName) : '';
const actionUrl = bodyData.actionUrl ? String(bodyData.actionUrl) : '/';const isRedAlert = category === 'red_alert';

const targetChannelId = isRedAlert ? 'sahaya_emergency_red_alert' : 'sahaya_general';

const messagePayload = {

  notification: {

    title: title,

    body: body,

  },

  data: {

    category: category,

    title: title,

    body: body,

    disasterTitleSi: title,

    description: body,

    alertId: alertId,

    postId: postId,

    groupId: groupId,

    locationName: locationName,

    latitude: latitude,

    longitude: longitude,

    radiusKm: radiusKm,

    urgency: urgency,

    senderName: senderName,

    actionUrl: actionUrl,

    isEmergencySiren: isRedAlert ? 'true' : 'false',

  },

  webpush: {

    headers: {

      Urgency: 'high',

      TTL: '86400',

    },

    notification: {

      title: title,

      body: body,

      icon: '/logo.jpg',

      badge: '/logo.jpg',

      requireInteraction: true,

      renotify: true,

      tag: alertId ? 'sahaya-red-alert-' + alertId : 'sahaya-alert',

      vibrate: [1000, 200, 1000, 200, 1500, 200, 2000],

    },

    fcmOptions: {

      link: actionUrl,

    },

  },

  android: {

    priority: 'high',

    ttl: 0,

    notification: {

      channelId: targetChannelId,

      sound: isRedAlert ? 'siren' : 'default',

      defaultSound: !isRedAlert,

      defaultVibrateTimings: true,

      priority: 'max',

      visibility: 'public',

    },

  },

};

const messaging = admin.apps.length !== 0 ? admin.messaging() : null;

if (!messaging) {

  return res.status(200).json({ success: false, note: 'Firebase Admin Messaging not configured' });

}

let successCount = 0;

const tokens = [];

try {

  const namedDb = getFirestore(admin.app(), 'ai-studio-sahayaseva-08bfd3be-2f42-4de8-a3a8-ad7279ec7d1f');

  const snapNamed = await namedDb.collection('device_push_tokens').get();

  snapNamed.forEach((docSnap) => {

    const d = docSnap.data();

    if (d && d.token && !tokens.includes(d.token)) {

      tokens.push(d.token);

    }

  });

} catch (e) {}

try {

  const defaultDb = admin.firestore();

  const snapDef = await defaultDb.collection('device_push_tokens').get();

  snapDef.forEach((docSnap) => {

    const d = docSnap.data();

    if (d && d.token && !tokens.includes(d.token)) {

      tokens.push(d.token);

    }

  });

} catch (e) {}

if (tokens.length !== 0) {

  const response = await messaging.sendEachForMulticast({

    ...messagePayload,

    tokens: tokens.slice(0, 500),

  });

  successCount = response.successCount;

}

return res.status(200).json({

  success: true,

  dispatchedCount: successCount,

  totalTokens: tokens.length,

})
;
  } catch (err) {
    console.error('Vercel Push Broadcast Error:', err);
    return res.status(500).json({ error: 'Failed to broadcast push notification' });
  }
}

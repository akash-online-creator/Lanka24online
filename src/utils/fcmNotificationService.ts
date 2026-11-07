import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

import { getApps, getApp } from 'firebase/app';

import { doc, setDoc, collection, addDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';

import { db } from '../lib/firebase';

import { startEmergencySiren, stopEmergencySiren, setEmergencySirenLock } from './sirenAudio';

import { broadcastAppNotification, triggerBrowserNotification, playNotificationSound, AppNotification } from './notificationManager';

import { calculateDistanceKm } from './geoUtils';

import { Capacitor } from '@capacitor/core';

import { PushNotifications } from '@capacitor/push-notifications';

import firebaseConfigJson from '../../firebase-applet-config.json';

export type PushCategory = any;

export interface FcmPayloadData {
  category: any;
  title: string;
  body?: string;
  message?: string;
  lat?: any;
  lng?: any;
  targetModal?: string;
  alertId?: string;
  postId?: string;

  groupId?: string;

  locationName?: string;

  latitude?: any;

  longitude?: any;

  radiusKm?: number;

  badgeText?: string;

  urgency?: any;

  senderName?: string;

  senderId?: string;

  actionUrl?: string;

  createdAtMs?: number;

}

let messagingInstance: any = null;

let isFcmInitialized = false;

function getLocalCoordinates(): { lat: number; lng: number; isFallback?: boolean } {

  try {

    const nativeGps = (window as any).__sahaya_native_gps || (window as any).sahayaNativeLocation;

    if (nativeGps && typeof nativeGps.lat === 'number' && typeof nativeGps.lng === 'number' && nativeGps.lat !== 0) {

      return { lat: nativeGps.lat, lng: nativeGps.lng };

    }

    const raw = localStorage.getItem('sahaya_current_location');

    if (raw) {

      const parsed = JSON.parse(raw);

      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {

        return { lat: parsed.lat, lng: parsed.lng };

      }

    }

  } catch {}

  return { lat: 7.151, lng: 79.885, isFallback: true };

}

export async function isMessagingSupported() {

  if (typeof window === 'undefined') return false;

  if (!('serviceWorker' in navigator)) return false;

  if (!('Notification' in window)) return false;

  try {

    return await isSupported();

  } catch {

    return false;

  }

}

export async function initializeAllNativePushChannels() {

  if (Capacitor.isNativePlatform()) {

    try {

      await PushNotifications.createChannel({

        id: 'sahaya_emergency_red_alert',

        name: '🚨 රතු එළිය ආපදා සයිරනය (Red Alert Siren)',

        description: 'හදිසි ආපදා තත්ත්වයන් සඳහා වන අතිශය හදිසි අනතුරු ඇඟවීම්',

        importance: 5,

        sound: 'siren',

        visibility: 1,

        vibration: true,

        lights: true,

        lightColor: '#ef4444'

      });

      await PushNotifications.createChannel({

        id: 'sos_live_channel',

        name: '📡 SOS Live හදිසි ආපදා (SOS Emergency)',

        description: 'හදිසි ජීවිතාරක්ෂක සහ සජීවී පිහිට ඉල්ලීම්',

        importance: 5,

        sound: 'emergency_blood',

        visibility: 1,

        vibration: true,

        lights: true,

        lightColor: '#dc2626'

      });

      await PushNotifications.createChannel({

        id: 'quick_service_channel',

        name: '⚡ ක්ෂණික සේවා (Quick Urgent Services)',

        description: 'හදිසි කාර්මික, ජල, විදුලි හා තාක්ෂණික සේවා ඉල්ලීම්',

        importance: 4,

        sound: 'quick_service',

        visibility: 1,

        vibration: true,

        lights: true,

        lightColor: '#10b981'

      });

      await PushNotifications.createChannel({

        id: 'group_work_channel',

        name: '👥 කණ්ඩායම් වැඩ සහ ශ්‍රමදාන (Group Work)',

        description: 'ප්‍රජා කණ්ඩායම් ක්‍රියාකාරකම් හා සාමූහික දැනුම්දීම්',

        importance: 4,

        sound: 'group_work',

        visibility: 1,

        vibration: true,

        lights: true,

        lightColor: '#3b82f6'

      });

    } catch (e) {

      console.warn('Native notification channels initialization note:', e);

    }

  }

}

const SAHAYA_VAPID_PUBLIC_KEY = 'BCCmGXeIae2pqzekOU9_6I7hhrYhfntoUIqviG3ik-rLzvzKeEep2TCLeJVjFX0NOHydP-hN1946MQ47wtXetcs';

function urlBase64ToUint8Array(base64String: string): Uint8Array {

  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);

  return Uint8Array.from(rawData, (ch) => ch.charCodeAt(0));

}

export async function registerFcmToken(currentUserId?: string) {

  try {

    await initializeAllNativePushChannels();

    if (typeof window === 'undefined' ? true : !('serviceWorker' in navigator) ? true : !('Notification' in window)) {

      return null;

    }

    let permission = Notification.permission;

    if (permission !== 'granted') {

      permission = await Notification.requestPermission();

    }

    if (permission !== 'granted') {

      return null;

    }

    const swRegistration = await navigator.serviceWorker.ready;

    let endpoint = '';

    let p256dh = '';

    let auth = '';

    if (swRegistration && swRegistration.pushManager) {

      try {

        let vapidPubKey = SAHAYA_VAPID_PUBLIC_KEY;
        try {
          const keyRes = await fetch('/api/webpush/vapid-public-key');
          if (keyRes.ok) {
            const keyData = await keyRes.json();
            if (keyData?.publicKey) vapidPubKey = keyData.publicKey;
          }
        } catch {}

        let sub = await swRegistration.pushManager.getSubscription();

        if (!sub) {

          sub = await swRegistration.pushManager.subscribe({

            userVisibleOnly: true,

            applicationServerKey: urlBase64ToUint8Array(vapidPubKey) as any

          });

        }

        if (sub) {

          const subJson: any = sub.toJSON ? sub.toJSON() : {};

          endpoint = sub.endpoint ? sub.endpoint : subJson.endpoint ? subJson.endpoint : '';

          p256dh = subJson.keys && subJson.keys.p256dh ? subJson.keys.p256dh : '';

          auth = subJson.keys && subJson.keys.auth ? subJson.keys.auth : '';

          const coords = getLocalCoordinates();
          fetch('/api/webpush/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Sahaya-Client-Guard': 'sahaya_v1_secure',
            },
            body: JSON.stringify({
              userId: currentUserId || 'usr_guest',
              subscription: subJson,
              lat: coords.lat,
              lng: coords.lng,
              radiusKm: 15,
              categories: ['all', 'red_alert'],
            }),
          }).catch(() => {});

        }

      } catch (subErr) {

        console.warn('WebPush VAPID subscribe note:', subErr);

      }

    }

    let token = endpoint;

    if (!token) {

      try {

        const app = getApps().length !== 0 ? getApp() : undefined;

        if (app) {

          if (!messagingInstance) {

            messagingInstance = getMessaging(app);

          }

          token = await getToken(messagingInstance, {

            serviceWorkerRegistration: swRegistration,

            vapidKey: (firebaseConfigJson as any).vapidKey ? (firebaseConfigJson as any).vapidKey : SAHAYA_VAPID_PUBLIC_KEY

          });

        }

      } catch (e) {}

    }

    if (token) {

      localStorage.setItem('sahaya_fcm_token', token);

      const coords = getLocalCoordinates();

      const sanitizedTokenId = token.slice(-28).replace(/[^a-zA-Z0-9]/g, '_');

      if (db) {

        try {

          const globalTokenRef = doc(db, 'device_push_tokens', sanitizedTokenId);

          await setDoc(globalTokenRef, {

            token,

            endpoint: endpoint ? endpoint : token,

            p256dh,

            auth,

            userId: currentUserId ? currentUserId : 'usr_guest',

            lat: coords.lat,

            lng: coords.lng,

            platform: Capacitor.isNativePlatform() ? 'android_native' : 'web_pwa',
            updatedAtMs: Date.now(),
            serverTimestamp: serverTimestamp()
          }, { merge: true });
        } catch (e) {}
      }

      // 📢 Auto-subscribe token to red alerts, district, and island-wide topics
      try {
        const storedDistrict = (typeof localStorage !== 'undefined' ? localStorage.getItem('sahaya_user_district') : '') || 'colombo';
        const cleanDist = storedDistrict.toLowerCase().replace(/\s+/g, '_');
        subscribeDeviceToTopic(token, 'sahaya_red_alerts');
        subscribeDeviceToTopic(token, `alert_${cleanDist}`);
        subscribeDeviceToTopic(token, 'alert_all_island');
      } catch {}

      return token;
    }
  } catch (error) {

    console.warn('FCM registration status:', error);

  }

  return null;

}

const processedRedAlertPushIds = new Set<string>();

export function processIncomingPushAlert(payload: FcmPayloadData) {

  const category = payload.category || 'admin_broadcast';

  const title = payload.title || '🚨 සහය සේවා දැනුම්දීම';

  const message = payload.body || payload.message || 'නව හදිසි ආපදා යාවත්කාලීනයක් ඇත.';

  const locationName = payload.locationName || '';

  const notifId = payload.alertId ? `red-alert-${payload.alertId}` : `push-${Date.now()}`;

  if (category === 'red_alert') {

    const dedupeKey = payload.alertId || `${title}_${locationName}`;
    if (dedupeKey && processedRedAlertPushIds.has(dedupeKey)) {
      return;
    }

    try {

      const myAlerts = JSON.parse(localStorage.getItem('sahaya_my_created_alerts') || '[]');

      const stoppedSirens = JSON.parse(localStorage.getItem('sahaya_siren_stopped_alerts') || '[]');

      const dismissed = JSON.parse(localStorage.getItem('sahaya_dismissed_alerts') || '[]');

      if (
        payload.alertId &&
        ((Array.isArray(myAlerts) && myAlerts.includes(payload.alertId)) ||
          (Array.isArray(stoppedSirens) && stoppedSirens.includes(payload.alertId)) ||
          (Array.isArray(dismissed) && dismissed.includes(payload.alertId)))
      ) {

        return;

      }

    } catch {}

    let distanceKm = 0;

    const radiusLimit = payload.radiusKm || 15.0;

    if (payload.latitude !== undefined && payload.longitude !== undefined && payload.latitude !== '' && payload.longitude !== '') {

      const alertLat = Number(payload.latitude);

      const alertLng = Number(payload.longitude);

      if (!isNaN(alertLat) && !isNaN(alertLng)) {
        const userCoords = getLocalCoordinates();

        distanceKm = calculateDistanceKm(userCoords.lat, userCoords.lng, alertLat, alertLng);

        if (!userCoords.isFallback && distanceKm > radiusLimit) {

          return;

        }
      }

    }

    if (dedupeKey) {
      processedRedAlertPushIds.add(dedupeKey);
    }

    // Store in notification center without calling triggerPickMeAlert('emergency_blood') which would stop the emergency siren
    try {
      const storageKey = 'sahaya_live_notifications';
      const existingRaw = localStorage.getItem(storageKey);
      const existingList = existingRaw ? JSON.parse(existingRaw) : [];
      const redNotif: AppNotification = {
        id: notifId,
        type: 'emergency_blood',
        title: title.startsWith('🚨') ? title : '🚨 සහය සේවා (රතු එළිය): ' + title,
        message: message + (distanceKm > 0 ? ' (ඔබට දුර: කි.මී. ' + distanceKm.toFixed(1) + ')' : ''),
        locationName,
        timestamp: new Date().toISOString(),
        isRead: false,
        badgeText: 'රතු එළිය 15KM',
        targetModal: 'red_alert',
        targetPostId: payload.alertId
      };
      const updatedList = [redNotif, ...(Array.isArray(existingList) ? existingList.filter((n: any) => n && n.id !== notifId) : [])].slice(0, 50);
      localStorage.setItem(storageKey, JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent('sahaya_new_notification', { detail: redNotif }));
    } catch {}

    setEmergencySirenLock(true);
    startEmergencySiren();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sahaya_red_alert_received', { detail: payload }));
    }

    if (typeof window !== 'undefined' && (window as any).SahayaNativeAlertChannel) {

      try {

        (window as any).SahayaNativeAlertChannel.postMessage('WAKE_SCREEN_AND_SHOW_NOTIFICATION:' + JSON.stringify(payload));

        (window as any).SahayaNativeAlertChannel.postMessage('TRIGGER_RED_ALERT:' + JSON.stringify(payload));

      } catch {}

    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {

      navigator.serviceWorker.ready.then((reg: any) => {

        if (reg && reg.active) {

          reg.active.postMessage({

            type: 'TRIGGER_EMERGENCY_RED_ALERT',

            payload: {

              ...payload,

              category: 'red_alert',

              disasterTitleSi: title,

              locationName,

              distanceKm: distanceKm.toFixed(1),

              description: message

            }

          });

        }

      }).catch(() => {});

    }

    triggerBrowserNotification({

      id: notifId,

      type: 'emergency_blood',

      title: title.startsWith('🚨') ? title : `🚨 ${title}`,

      message: `${message}${distanceKm > 0 ? ` (ඔබට දුර: කි.මී. ${distanceKm.toFixed(1)})` : ''}`,

      locationName,

      timestamp: new Date().toISOString(),

      isRead: false,

      badgeText: 'රතු එළිය 15KM',

      targetModal: 'red_alert',

      targetPostId: payload.alertId,

    });

    return;

  }

  // 📲 Bridge to Native Android Alert Channel for Background & Lockscreen Notifications
  if (typeof window !== 'undefined' && (window as any).SahayaNativeAlertChannel) {
    try {
      (window as any).SahayaNativeAlertChannel.postMessage(
        'SHOW_BACKGROUND_NOTIFICATION:' +
          JSON.stringify({
            category,
            title,
            body: message,
            locationName,
            postId: payload.postId || payload.alertId,
            targetModal: payload.targetModal || category,
          })
      );
    } catch {}
  }

  switch (category) {
    case 'sos_live': {
      playNotificationSound('emergency_blood');
      const notif: AppNotification = {
        id: notifId,
        type: 'emergency_blood',
        title: `📡 SOS LIVE: ${title}`,
        message,
        locationName,
        timestamp: new Date().toISOString(),
        isRead: false,
        badgeText: 'SOS',
        targetModal: 'red_alert',
        targetPostId: payload.alertId,
      };
      broadcastAppNotification(notif);
      triggerBrowserNotification(notif);
      break;
    }

    case 'emergency_blood':
    case 'blood': {
      playNotificationSound('emergency_blood');
      const notif: AppNotification = {
        id: notifId,
        type: 'emergency_blood',
        title: title.startsWith('🩸') ? title : `🩸 හදිසි ලේ ඉල්ලීමක්: ${title}`,
        message,
        locationName,
        timestamp: new Date().toISOString(),
        isRead: false,
        badgeText: payload.badgeText || 'හදිසි ලේ',
        targetModal: 'blood',
        targetPostId: payload.postId || payload.alertId,
      };
      broadcastAppNotification(notif);
      triggerBrowserNotification(notif);
      break;
    }

    case 'aid_ledger':
    case 'disaster_relief': {
      playNotificationSound('emergency_blood');
      const notif: AppNotification = {
        id: notifId,
        type: 'aid_ledger',
        title: title.startsWith('📦') ? title : `📦 සහන සේවා ඉල්ලීමක්: ${title}`,
        message,
        locationName,
        timestamp: new Date().toISOString(),
        isRead: false,
        badgeText: payload.badgeText || 'ආපදා සහන',
        targetModal: 'aid_ledger',
        targetPostId: payload.postId || payload.alertId,
      };
      broadcastAppNotification(notif);
      triggerBrowserNotification(notif);
      break;
    }

    case 'quick_service':
    case 'quick_services': {
      playNotificationSound('quick_service');
      const notif: AppNotification = {
        id: notifId,
        type: 'quick_service',
        title: title.startsWith('⚡') ? title : `⚡ ඉක්මන් සේවය: ${title}`,
        message,
        locationName,
        timestamp: new Date().toISOString(),
        isRead: false,
        badgeText: payload.badgeText || 'ඉක්මන් සේවා',
        targetModal: 'quick_service',
        targetPostId: payload.postId,
      };
      broadcastAppNotification(notif);
      triggerBrowserNotification(notif);
      break;
    }

    case 'help_request':
    case 'normal_services': {
      playNotificationSound('quick_service');
      const notif: AppNotification = {
        id: notifId,
        type: 'quick_service',
        title: title.startsWith('🤝') ? title : `🤝 සහන සේවා ඉල්ලීමක්: ${title}`,
        message,
        locationName,
        timestamp: new Date().toISOString(),
        isRead: false,
        badgeText: payload.badgeText || 'සහන සේවා',
        targetModal: (payload.targetModal as any) || 'detail',
        targetPostId: payload.postId,
      };
      broadcastAppNotification(notif);
      triggerBrowserNotification(notif);
      break;
    }

    default: {
      playNotificationSound('admin_broadcast');
      const notif: AppNotification = {
        id: notifId,
        type: 'admin_broadcast',
        title,
        message,
        locationName,
        timestamp: new Date().toISOString(),
        isRead: false,
        badgeText: 'නිවේදන',
        targetModal: 'admin',
      };
      broadcastAppNotification(notif);
      triggerBrowserNotification(notif);
      break;
    }
  }
}

export function initFcmNotificationService(currentUserId?: string) {

  if (typeof window === 'undefined') return () => {};

  if (isFcmInitialized) return () => {};

  isFcmInitialized = true;

  registerFcmToken(currentUserId).catch(() => {});

  isMessagingSupported().then((supported) => {

    if (!supported) return;

    try {

      const app = getApps().length !== 0 ? getApp() : undefined;

      if (!app) return;

      const messaging = getMessaging(app);

      onMessage(messaging, (payload) => {

        const data = (payload.data || {}) as any;

        const notification = payload.notification || {};

        processIncomingPushAlert({

          category: data.category || 'red_alert',

          title: notification.title || data.title || '🚨 සහය සේවා හදිසි ආපදා අනතුරු ඇඟවීම',

          body: notification.body || data.body || data.message || '',

          alertId: data.alertId,

          postId: data.postId,

          groupId: data.groupId,

          locationName: data.locationName,

          latitude: data.latitude,

          longitude: data.longitude,

          radiusKm: data.radiusKm ? Number(data.radiusKm) : 15.0,

          badgeText: data.badgeText,

          urgency: data.urgency,

          senderName: data.senderName,

          actionUrl: data.actionUrl

        });

      });

    } catch {}

  });

  let unsubscribeQueue: any = null;

  if (db) {

    try {

      const startTime = Date.now() - 15000;

      const q = query(

        collection(db, 'push_broadcast_queue'),

        where('createdAtMs', '>=', startTime)

      );

      unsubscribeQueue = onSnapshot(q, (snapshot) => {

        snapshot.docChanges().forEach((change) => {

          if (change.type === 'added') {

            const data = change.doc.data() as FcmPayloadData;

            const isSelf = data.senderId && currentUserId && data.senderId === currentUserId;

            if (!isSelf) {

              processIncomingPushAlert(data);

            }

          }

        });

      }, () => {});

    } catch {}

  }

  const handleSwMessage = (event: MessageEvent) => {

    if (!event.data) return;

    if (event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {

      processIncomingPushAlert(event.data.payload);
    } else if (event.data.type === 'STOP_ALERT_AUDIO') {
      setEmergencySirenLock(false);
      stopEmergencySiren(true);
      if (event.data.alertId) {
        try {
          ['sahaya_siren_stopped_alerts', 'sahaya_dismissed_alerts'].forEach((k) => {
            const list = JSON.parse(localStorage.getItem(k) ? (localStorage.getItem(k) as string) : '[]');
            if (Array.isArray(list) && !list.includes(event.data.alertId)) {
              list.push(event.data.alertId);
              localStorage.setItem(k, JSON.stringify(list));
            }
          });
        } catch (err) {}
      }
    } else if (event.data.type === 'NAVIGATE_TO_MODAL') {

      window.dispatchEvent(new CustomEvent('sahaya_notification_clicked', { detail: event.data }));

    }

  };

  navigator.serviceWorker?.addEventListener('message', handleSwMessage);

  return () => {

    if (unsubscribeQueue) unsubscribeQueue();

    navigator.serviceWorker?.removeEventListener('message', handleSwMessage);

  };

}

export async function broadcastPushNotification(payload: FcmPayloadData) {

  const enrichedPayload: FcmPayloadData = {

    ...payload,

    radiusKm: payload.radiusKm || 15.0,

    createdAtMs: Date.now(),

  };

  if (db) {

    try {

      await addDoc(collection(db, 'push_broadcast_queue'), {

        ...enrichedPayload,

        serverTimestamp: serverTimestamp(),

      });

    } catch {}

  }

  try {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('sahaya_auth_session_token') : null;
    fetch('/api/push/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sahaya-Client-Guard': 'sahaya_v1_secure',
        ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
      },
      body: JSON.stringify(enrichedPayload),
    }).catch(() => {});
  } catch {}
}

/**
 * 📢 Subscribe Device to FCM Topic (e.g., /topics/alert_colombo, /topics/alert_all_island)
 * Enables single-API-call broadcast to 1M+ users in <1s with 0 database reads.
 */
export async function subscribeDeviceToTopic(token: string, topicName: string): Promise<boolean> {
  if (!token || !topicName) return false;
  const cleanTopic = topicName.replace(/^\/topics\//, '').trim().toLowerCase();
  try {
    const res = await fetch('/api/fcm/subscribe-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sahaya-Client-Guard': 'sahaya_v1_secure',
      },
      body: JSON.stringify({ token, topic: cleanTopic }),
    });
    if (res.ok) {
      console.log(`✅ Subscribed device to FCM Topic: /topics/${cleanTopic}`);
      return true;
    }
  } catch (err) {
    console.warn('FCM topic subscription note:', err);
  }
  return false;
}

/**
 * 🔕 Unsubscribe Device from FCM Topic
 */
export async function unsubscribeDeviceFromTopic(token: string, topicName: string): Promise<boolean> {
  if (!token || !topicName) return false;
  const cleanTopic = topicName.replace(/^\/topics\//, '').trim().toLowerCase();
  try {
    const res = await fetch('/api/fcm/unsubscribe-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sahaya-Client-Guard': 'sahaya_v1_secure',
      },
      body: JSON.stringify({ token, topic: cleanTopic }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 🔄 Sync User's District FCM Topic Subscription
 */
export async function syncUserDistrictTopic(newDistrict: string, oldDistrict?: string): Promise<void> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sahaya_fcm_token') : null;
  if (!token) return;

  const cleanNew = (newDistrict || 'colombo').trim().toLowerCase().replace(/\s+/g, '_');
  if (oldDistrict) {
    const cleanOld = oldDistrict.trim().toLowerCase().replace(/\s+/g, '_');
    if (cleanOld !== cleanNew) {
      await unsubscribeDeviceFromTopic(token, `alert_${cleanOld}`);
    }
  }

  await subscribeDeviceToTopic(token, `alert_${cleanNew}`);
  await subscribeDeviceToTopic(token, 'alert_all_island');
}



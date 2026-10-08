/**
 * Sahaya Sewa - FCM & 24/7 Universal Background Push Notification Engine
 * 
 * Powered for:
 * 1. 🚨 රතු එළිය (Red Alert & Emergency Siren - 5km Proximity Geofenced)
 * 2. 📡 SOS Live (Realtime GPS Tracking & Emergency Rescue Broadcasts)
 * 3. ⚡ ක්ෂණික සේවා (Quick Urgent Services)
 * 4. 👥 කණ්ඩායම් වැඩ (Group Work / Shramadana Collaborative Initiatives)
 * 5. 🛡️ ඇඩ්මින් දැනුවත්කිරීම් (Admin Broadcasts & System Notices)
 */

import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { getApps, getApp } from 'firebase/app';
import { doc, setDoc, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { startEmergencySiren, stopEmergencySiren } from './sirenAudio';
import { broadcastAppNotification, triggerBrowserNotification, playNotificationSound, AppNotification } from './notificationManager';
import { calculateDistanceKm } from './geoUtils';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import firebaseConfigJson from '../../firebase-applet-config.json';

export type PushCategory = 'red_alert' | 'sos_live' | 'quick_service' | 'group_work' | 'admin_broadcast';

export interface FcmPayloadData {
  category: PushCategory;
  title: string;
  body: string;
  alertId?: string;
  postId?: string;
  groupId?: string;
  locationName?: string;
  latitude?: string | number;
  longitude?: string | number;
  radiusKm?: number; // e.g. 5km for Red Alert
  badgeText?: string;
  urgency?: 'critical' | 'high' | 'normal';
  senderName?: string;
  senderId?: string;
  actionUrl?: string;
  createdAtMs?: number;
}

let messagingInstance: Messaging | null = null;
let isFcmInitialized = false;
let currentDeviceToken: string | null = null;

// Get current saved user coordinates
function getLocalCoordinates(): { lat: number; lng: number } {
  try {
    const raw = localStorage.getItem('sahaya_current_location');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        return { lat: parsed.lat, lng: parsed.lng };
      }
    }
  } catch {}
  return { lat: 7.151, lng: 79.885 }; // Katunayake / Colombo default
}

/**
 * Check if Firebase Messaging is supported in current environment
 */
export async function isMessagingSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!('Notification' in window)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

/**
 * Initialize all Android Native Notification Channels (Capacitor)
 * Ensures display wakes up on lockscreen and rings loud custom sounds 24/7
 */
export async function initializeAllNativePushChannels() {
  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Red Alert Siren Channel (Max Importance, Lockscreen visibility, custom siren sound)
      await PushNotifications.createChannel({
        id: 'rathuweliya_siren_channel',
        name: '🚨 රතුවෙලිය ආපදා සයිරනය (Red Alert Siren)',
        description: 'හදිසි ආපදා තත්ත්වයන් සඳහා වන අතිශය හදිසි අනතුරු ඇඟවීම්',
        importance: 5, // IMPORTANCE_HIGH / MAX: Lights up display & heads-up notification
        sound: 'siren', // Maps to res/raw/siren.wav in Android APK
        visibility: 1,  // VISIBILITY_PUBLIC: Shows on Lockscreen even when phone is locked
        vibration: true,
        lights: true,
        lightColor: '#ef4444'
      });

      // 2. SOS Live Channel (Max Importance, Emergency Chime)
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

      // 3. Quick Urgent Services Channel (High Importance)
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

      // 4. Group Work Channel (Shramadana & Group Tasks)
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

      console.log('✅ All Native Android Notification Channels initialized successfully (Lockscreen & Sound enabled)');
    } catch (e) {
      console.warn('Native notification channels initialization note:', e);
    }
  }
}

/**
 * Request Push Permission & Register Device FCM Token into Global Registry
 */
export async function registerFcmToken(currentUserId?: string): Promise<string | null> {
  try {
    // Also initialize native Android channels if running in Capacitor
    await initializeAllNativePushChannels();

    const supported = await isMessagingSupported();
    if (!supported) {
      console.log('ℹ️ Push Messaging not supported or running in desktop browser');
      return null;
    }

    // Check / Request Notification Permission
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      console.log('⚠️ Notification permission not granted by user');
      return null;
    }

    const app = getApps().length > 0 ? getApp() : undefined;
    if (!app) return null;

    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
    }

    const swRegistration = await navigator.serviceWorker.ready;

    // Get FCM Token
    const token = await getToken(messagingInstance, {
      serviceWorkerRegistration: swRegistration,
      vapidKey: (firebaseConfigJson as any).vapidKey || undefined
    });

    if (token) {
      currentDeviceToken = token;
      localStorage.setItem('sahaya_fcm_token', token);
      console.log('✅ FCM Push Token generated and registered');

      // Save token in Central Global Device Registry with GPS coordinates for Geofencing
      const coords = getLocalCoordinates();
      const sanitizedTokenId = token.slice(-28).replace(/[^a-zA-Z0-9]/g, '_');

      if (db) {
        try {
          // 1. Save in Global Device Registry
          const globalTokenRef = doc(db, 'device_push_tokens', sanitizedTokenId);
          await setDoc(globalTokenRef, {
            token,
            userId: currentUserId || 'usr_guest',
            lat: coords.lat,
            lng: coords.lng,
            platform: Capacitor.isNativePlatform() ? 'android_native' : 'web_pwa',
            updatedAtMs: Date.now(),
            serverTimestamp: serverTimestamp()
          }, { merge: true });

          // 2. Also save under user's profile if authenticated
          if (currentUserId) {
            const userTokenRef = doc(db, 'users', currentUserId, 'fcm_tokens', sanitizedTokenId);
            await setDoc(userTokenRef, {
              token,
              updatedAtMs: Date.now(),
              platform: Capacitor.isNativePlatform() ? 'android_native' : 'web_pwa'
            }, { merge: true });
          }
        } catch (e) {
          console.debug('FCM token database synchronization note:', e);
        }
      }

      return token;
    }
  } catch (error) {
    console.warn('FCM registration status:', error);
  }
  return null;
}

/**
 * Handle incoming FCM or Background Alert
 * Enforces 5km Geofence for Red Alerts and category-specific sounds & vibration
 */
export function processIncomingPushAlert(payload: FcmPayloadData) {
  const category = payload.category || 'admin_broadcast';
  const title = payload.title || '🚨 සහය සේවා දැනුම්දීම';
  const message = payload.body || 'නව යාවත්කාලීනයක් ඇත.';
  const locationName = payload.locationName || '';
  const notifId = `push-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // 1. GEOFENCE FILTER for Red Alert (5km Radius)
  if (category === 'red_alert' && payload.latitude !== undefined && payload.longitude !== undefined) {
    const alertLat = Number(payload.latitude);
    const alertLng = Number(payload.longitude);
    const userCoords = getLocalCoordinates();
    const distanceKm = calculateDistanceKm(userCoords.lat, userCoords.lng, alertLat, alertLng);
    const radiusLimit = payload.radiusKm || 5.0;

    // If outside 5km radius, do not sound emergency alarm (prevent disturbance to distant towns)
    if (distanceKm > radiusLimit) {
      console.log(`ℹ️ Red Alert outside ${radiusLimit}km proximity (${distanceKm.toFixed(1)}km away). Silent notice.`);
      // Just record quiet background notification without sounding siren
      triggerBrowserNotification({
        id: notifId,
        type: 'red_alert',
        title: `🚨 දුරස්ථ ආපදාවක්: ${title}`,
        message: `📍 ${locationName} (${distanceKm.toFixed(1)} km දුරින්)`,
        locationName,
        timestamp: new Date().toISOString(),
        isRead: false,
        badgeText: 'SOS',
        targetModal: 'red_alert',
        targetPostId: payload.alertId,
      });
      return;
    }
  }

  console.log(`📡 Processing High-Priority Push [${category}]:`, payload);

  // 2. Route Alert Actions & High Importance Sound / Vibration
  switch (category) {
    case 'red_alert': {
      // Start emergency siren immediately in continuous loop
      startEmergencySiren();

      // Emergency SOS Vibration (1000ms vibrate, 200ms pause...)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([1000, 200, 1000, 200, 1500, 300, 2000]); } catch {}
      }

      const notif: AppNotification = {
        id: notifId,
        type: 'red_alert',
        title: `🚨 ${title}`,
        message,
        locationName,
        timestamp: new Date().toISOString(),
        isRead: false,
        badgeText: 'රතු එළිය',
        targetModal: 'red_alert',
        targetPostId: payload.alertId,
      };
      broadcastAppNotification(notif);
      triggerBrowserNotification(notif);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sahaya_red_alert_received', { detail: payload }));
      }
      break;
    }

    case 'sos_live': {
      // High urgency rescue alert
      playNotificationSound('emergency_blood');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([500, 150, 500, 150, 800]); } catch {}
      }

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

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sahaya_sos_live_received', { detail: payload }));
      }
      break;
    }

    case 'quick_service': {
      // Pleasant melodic chime
      playNotificationSound('quick_service');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([250, 100, 250]); } catch {}
      }

      const notif: AppNotification = {
        id: notifId,
        type: 'quick_service',
        title: `⚡ ක්ෂණික සේවය: ${title}`,
        message,
        locationName,
        timestamp: new Date().toISOString(),
        isRead: false,
        badgeText: 'ඉක්මන්',
        targetModal: 'quick_service',
        targetPostId: payload.postId,
      };
      broadcastAppNotification(notif);
      triggerBrowserNotification(notif);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sahaya_quick_service_received', { detail: payload }));
      }
      break;
    }

    case 'group_work': {
      // Shramadana & Group work reminder
      playNotificationSound('group_work');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([200, 100, 200]); } catch {}
      }

      const notif: AppNotification = {
        id: notifId,
        type: 'admin_broadcast',
        title: `👥 කණ්ඩායම් වැඩ: ${title}`,
        message,
        locationName,
        timestamp: new Date().toISOString(),
        isRead: false,
        badgeText: 'ශ්‍රමදාන',
        targetModal: 'group_work',
        targetPostId: payload.groupId,
      };
      broadcastAppNotification(notif);
      triggerBrowserNotification(notif);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sahaya_group_work_received', { detail: payload }));
      }
      break;
    }

    case 'admin_broadcast':
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

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sahaya_admin_broadcast_received', { detail: payload }));
      }
      break;
    }
  }
}

/**
 * Initialize Foreground FCM Listener, Background Worker Receiver,
 * and Real-Time Firestore Broadcast Relay
 */
export function initFcmNotificationService(currentUserId?: string): () => void {
  if (typeof window === 'undefined') return () => {};
  if (isFcmInitialized) return () => {};
  isFcmInitialized = true;

  // 1. Attempt token registration and native channel creation
  registerFcmToken(currentUserId).catch(() => {});

  // 2. Setup Foreground Messaging Listener
  isMessagingSupported().then((supported) => {
    if (!supported) return;

    try {
      const app = getApps().length > 0 ? getApp() : undefined;
      if (!app) return;
      const messaging = getMessaging(app);

      onMessage(messaging, (payload) => {
        console.log('🔔 Foreground FCM Push Message received:', payload);
        const data = (payload.data || {}) as any;
        const notification = payload.notification || {};

        processIncomingPushAlert({
          category: data.category || 'admin_broadcast',
          title: notification.title || data.title || '🚨 සහය සේවා',
          body: notification.body || data.body || data.message || '',
          alertId: data.alertId,
          postId: data.postId,
          groupId: data.groupId,
          locationName: data.locationName,
          latitude: data.latitude,
          longitude: data.longitude,
          radiusKm: data.radiusKm ? Number(data.radiusKm) : 5.0,
          badgeText: data.badgeText,
          urgency: data.urgency,
          senderName: data.senderName,
          actionUrl: data.actionUrl
        });
      });
    } catch (err) {
      console.warn('FCM foreground listener initialization note:', err);
    }
  });

  // 3. Real-time Push Broadcast Queue Listener
  // Relays notifications instantaneously across all devices via Firestore
  let unsubscribeQueue: (() => void) | null = null;
  if (db) {
    try {
      const startTime = Date.now() - 5000;
      const q = query(
        collection(db, 'push_broadcast_queue'),
        where('createdAtMs', '>', startTime)
      );

      unsubscribeQueue = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data() as FcmPayloadData;
            // Ignore alerts sent by self to prevent duplicate alerts
            const isSelf = data.senderId && currentUserId && data.senderId === currentUserId;
            if (!isSelf) {
              processIncomingPushAlert(data);
            }
          }
        });
      }, (err) => {
        console.debug('Push broadcast queue listener notice:', err);
      });
    } catch (e) {
      console.debug('Broadcast queue initialization notice:', e);
    }
  }

  // 4. Service Worker PostMessage Listener for Background / WorkManager events
  const handleSwMessage = (event: MessageEvent) => {
    if (!event.data) return;

    if (event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
      processIncomingPushAlert(event.data.payload);
    } else if (event.data.type === 'STOP_ALERT_AUDIO') {
      stopEmergencySiren(true);
    }
  };

  navigator.serviceWorker?.addEventListener('message', handleSwMessage);

  return () => {
    if (unsubscribeQueue) unsubscribeQueue();
    navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
  };
}

/**
 * 📡 Broadcast Push Notification to ALL devices across network
 * Sends to Server FCM endpoint AND writes to real-time Firestore Broadcast Queue
 */
export async function broadcastPushNotification(payload: FcmPayloadData) {
  // 1. Process locally on publisher device
  processIncomingPushAlert(payload);

  const enrichedPayload: FcmPayloadData = {
    ...payload,
    radiusKm: payload.radiusKm || 5.0, // Default 5km radius for emergency Red Alert
    createdAtMs: Date.now(),
  };

  // 2. Broadcast via Firestore real-time queue (Instantaneous cross-device relay)
  if (db) {
    try {
      await addDoc(collection(db, 'push_broadcast_queue'), {
        ...enrichedPayload,
        serverTimestamp: serverTimestamp(),
      });
      console.log('✅ Push broadcast written to Firestore relay queue');
    } catch (e) {
      console.debug('Firestore push broadcast queue note:', e);
    }
  }

  // 3. Dispatch to Server Backend FCM Push Broadcaster
  try {
    fetch('/api/push/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrichedPayload),
    }).then((res) => {
      if (res.ok) {
        console.log('✅ Server FCM push broadcast dispatched successfully');
      }
    }).catch(() => {});
  } catch {}
}

/**
 * Sahaya Sewa - FCM (Firebase Cloud Messaging) & Background Push Notification Engine
 * 
 * Powered for:
 * 1. 🚨 රතු එළිය (Red Alert & Emergency Siren)
 * 2. 📡 SOS Live (Realtime GPS Tracking & Rescue Broadcasts)
 * 3. ⚡ ක්ෂණික සේවා (Quick Urgent Services)
 * 4. 👥 කණ්ඩායම් වැඩ (Group Work / Shramadana Initiatives)
 * 5. 🛡️ ඇඩ්මින් දැනුවත්කිරීම් (Admin Broadcasts & System Notices)
 */

import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { getApps, getApp } from 'firebase/app';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { startEmergencySiren, stopEmergencySiren } from './sirenAudio';
import { broadcastAppNotification, triggerBrowserNotification, playNotificationSound, AppNotification } from './notificationManager';
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
  badgeText?: string;
  urgency?: 'critical' | 'high' | 'normal';
  senderName?: string;
  actionUrl?: string;
}

let messagingInstance: Messaging | null = null;
let isFcmInitialized = false;

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
 * Request Push Permission & Register Device FCM Token
 */
export async function registerFcmToken(currentUserId?: string): Promise<string | null> {
  try {
    const supported = await isMessagingSupported();
    if (!supported) {
      console.log('ℹ️ Push Messaging not supported or running in unsupported browser');
      return null;
    }

    // Check / Request Notification Permission
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      console.log('⚠️ Notification permission not granted');
      return null;
    }

    const app = getApps().length > 0 ? getApp() : undefined;
    if (!app) return null;

    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
    }

    // Register Service Worker if needed
    const swRegistration = await navigator.serviceWorker.ready;

    // Get FCM Token
    const token = await getToken(messagingInstance, {
      serviceWorkerRegistration: swRegistration,
      vapidKey: (firebaseConfigJson as any).vapidKey || undefined
    });

    if (token) {
      console.log('✅ FCM Token generated successfully');
      localStorage.setItem('sahaya_fcm_token', token);

      // Save token to Firestore if user is authenticated
      if (currentUserId && db) {
        try {
          const tokenDocRef = doc(db, 'users', currentUserId, 'fcm_tokens', token.slice(0, 30));
          await setDoc(tokenDocRef, {
            token,
            updatedAt: serverTimestamp(),
            platform: 'web_pwa',
            userAgent: navigator.userAgent
          }, { merge: true });
        } catch (e) {
          console.debug('FCM token firestore sync notice:', e);
        }
      }

      return token;
    }
  } catch (error) {
    console.warn('FCM registration notice:', error);
  }
  return null;
}

/**
 * Handle incoming FCM or Background Worker Message
 */
export function processIncomingPushAlert(payload: FcmPayloadData) {
  const category = payload.category || 'admin_broadcast';
  const title = payload.title || '🚨 සහය සේවා දැනුම්දීම';
  const message = payload.body || 'නව යාවත්කාලීනයක් ඇත.';
  const locationName = payload.locationName || '';
  const notifId = `push-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  console.log(`📡 Processing Incoming Push [${category}]:`, payload);

  // 1. Route actions per Category
  switch (category) {
    case 'red_alert': {
      // Start emergency siren immediately
      startEmergencySiren();

      // Trigger strong vibration
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([1000, 200, 1000, 200, 1500]); } catch {}
      }

      // Add to notifications
      const notif: AppNotification = {
        id: notifId,
        type: 'emergency_blood',
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

      // Dispatch global window event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sahaya_red_alert_received', { detail: payload }));
      }
      break;
    }

    case 'sos_live': {
      // High urgency alert
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
        try { navigator.vibrate([200, 100, 200]); } catch {}
      }

      const notif: AppNotification = {
        id: notifId,
        type: 'quick_service',
        title: `⚡ ${title}`,
        message,
        locationName,
        timestamp: new Date().toISOString(),
        isRead: false,
        badgeText: 'ක්ෂණික සේවා',
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
      // Team / Shramadana announcement
      playNotificationSound('general');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([150, 100, 150]); } catch {}
      }

      const notif: AppNotification = {
        id: notifId,
        type: 'group_work',
        title: `👥 ${title}`,
        message,
        locationName,
        timestamp: new Date().toISOString(),
        isRead: false,
        badgeText: 'කණ්ඩායම් වැඩ',
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
      playNotificationSound('general');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([300, 100, 300]); } catch {}
      }

      const notif: AppNotification = {
        id: notifId,
        type: 'admin_broadcast',
        title: `🛡️ ${title}`,
        message,
        locationName,
        timestamp: new Date().toISOString(),
        isRead: false,
        badgeText: 'ඇඩ්මින් නිවේදන',
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
 * Initialize Foreground FCM Listener & Background Worker Receiver
 */
export function initFcmNotificationService(currentUserId?: string): () => void {
  if (typeof window === 'undefined') return () => {};
  if (isFcmInitialized) return () => {};
  isFcmInitialized = true;

  // 1. Attempt token registration
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

  // 3. Service Worker PostMessage Listener for Background / WorkManager events
  const handleSwMessage = (event: MessageEvent) => {
    if (!event.data) return;

    if (event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
      processIncomingPushAlert(event.data.payload);
    } else if (event.data.type === 'STOP_ALERT_AUDIO') {
      stopEmergencySiren();
    }
  };

  navigator.serviceWorker?.addEventListener('message', handleSwMessage);

  // 4. Register Periodic Background Sync (WorkManager / Background Worker equivalent for Web)
  registerPeriodicAlertSync();

  return () => {
    navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
  };
}

/**
 * Register Background Sync & Periodic Sync (WorkManager for Web PWA)
 */
export async function registerPeriodicAlertSync() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;

    // 1. One-shot Background Sync
    if ('sync' in registration) {
      try {
        await (registration as any).sync.register('sync-emergency-alerts');
        console.log('✅ Background Sync Worker registered for emergency alerts');
      } catch (e) {
        console.debug('Background Sync registration:', e);
      }
    }

    // 2. Periodic Background Sync (runs periodically even when app is closed)
    if ('periodicSync' in registration) {
      try {
        const status = await navigator.permissions?.query({
          name: 'periodic-background-sync' as any
        });

        if (status && status.state === 'granted') {
          await (registration as any).periodicSync.register('check-urgent-alerts', {
            minInterval: 12 * 60 * 1000 // 12 minutes
          });
          console.log('✅ Periodic Background Worker (WorkManager) registered (12 min interval)');
        }
      } catch (e) {
        console.debug('Periodic Sync registration notice:', e);
      }
    }
  } catch (err) {
    console.debug('Worker registration status:', err);
  }
}

/**
 * Dispatch Local or Remote Push Notification to all users
 */
export function broadcastPushNotification(payload: FcmPayloadData) {
  processIncomingPushAlert(payload);
}

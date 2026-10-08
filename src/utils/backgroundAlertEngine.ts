// 🚨 24/7 Background Notification & Emergency Alert Engine for Sahaya Sewa
// Operates 24/7 in background via Capacitor Native Push, Service Worker, and Background Sync
// Uses classic emergency siren for Red Alerts and pleasant gentle chimes for general notifications

import { activateBackgroundWakeLock } from './notificationManager';
import { startEmergencySiren, stopEmergencySiren } from './sirenAudio';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export type AlertKind = 'quick_service' | 'red_alert' | 'emergency_blood' | 'disaster_relief' | 'general';

export interface BackgroundAlertSettings {
  backgroundAlertsEnabled: boolean;
  volume: number; // 0.0 - 1.0
  vibrationEnabled: boolean;
  notificationPushEnabled: boolean;
  soundTypes: {
    quick_service: boolean;
    red_alert: boolean;
    emergency_blood: boolean;
    disaster_relief: boolean;
  };
}

export type PickMeAlertSettings = BackgroundAlertSettings; // Backwards compatibility

export interface ActiveRingtoneState {
  isRinging: boolean;
  kind: AlertKind;
  title: string;
  message: string;
  disasterType?: string;
  locationName?: string;
  targetModal?: 'blood' | 'aid_ledger' | 'quick_service' | 'find_for_me' | 'marketplace' | 'group_work' | 'from_me_to_you' | 'detail' | 'red_alert';
  targetPostId?: string;
  startedAt: number;
}

const SETTINGS_STORAGE_KEY = 'sahaya_24h_background_alert_settings';
const DEFAULT_SETTINGS: BackgroundAlertSettings = {
  backgroundAlertsEnabled: true,
  volume: 0.8,
  vibrationEnabled: true,
  notificationPushEnabled: true,
  soundTypes: {
    quick_service: true,
    red_alert: true,
    emergency_blood: true,
    disaster_relief: true,
  },
};

// Global active alert state
let currentRingtoneState: ActiveRingtoneState | null = null;
let originalDocumentTitle = typeof document !== 'undefined' ? document.title : 'සහය සේවා';
let titleBlinkInterval: any = null;
let autoDismissTimeout: any = null;
let audioCtx: AudioContext | null = null;

const stateListeners = new Set<(state: ActiveRingtoneState | null) => void>();

export function subscribeToActiveRingtone(cb: (state: ActiveRingtoneState | null) => void): () => void {
  stateListeners.add(cb);
  cb(currentRingtoneState);
  return () => {
    stateListeners.delete(cb);
  };
}

function notifyStateChange() {
  stateListeners.forEach((cb) => {
    try {
      cb(currentRingtoneState);
    } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sahaya_active_ringtone_changed', { detail: currentRingtoneState }));
  }
}

// Read settings
export function getPickMeAlertSettings(): BackgroundAlertSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY) || localStorage.getItem('sahaya_pickme_alert_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

// Save settings
export function savePickMeAlertSettings(settings: Partial<BackgroundAlertSettings>) {
  try {
    const current = getPickMeAlertSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem('sahaya_pickme_alert_settings', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sahaya_pickme_settings_updated', { detail: updated }));
    }
  } catch {}
}

// Soft pleasant notification chime (single tone, non-annoying)
function playGentleNotificationChime(vol: number) {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.12); // A5

    const safeVol = Math.max(0.05, Math.min(vol * 0.3, 0.4));
    gain.gain.setValueAtTime(safeVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {
    // silently catch if browser policy blocks audio before user interaction
  }
}

// 📱 Initialize Capacitor Native Emergency Siren Channel (Respects Silent Mode)
export async function initializeNativeSirenChannel() {
  if (Capacitor.isNativePlatform()) {
    try {
      await PushNotifications.createChannel({
        id: 'rathuweliya_siren_channel',
        name: 'රතුවෙලිය ආපදා අනතුරු ඇඟවීම (Rathuweliya Alerts)',
        description: 'හදිසි ආපදා තත්ත්වයන් සඳහා වන අනතුරු ඇඟවීම්',
        importance: 5, // High Importance
        sound: 'siren', // Play sound if phone is in Ring mode
        visibility: 1,  // Show on Lockscreen
        vibration: true // Vibrate when phone is in Silent/Vibrate mode
      });
      console.log('✅ Native Rathuweliya Siren Channel Configured');
    } catch (e) {
      console.error('❌ Failed to create native siren channel:', e);
    }
  }
}

// 🚨 Main 24/7 Trigger Function
export function triggerPickMeAlert(params: {
  kind: AlertKind;
  title: string;
  message: string;
  disasterType?: string;
  locationName?: string;
  targetModal?: 'blood' | 'aid_ledger' | 'quick_service' | 'find_for_me' | 'marketplace' | 'group_work' | 'from_me_to_you' | 'detail' | 'red_alert';
  targetPostId?: string;
  forceRingtone?: boolean;
}): boolean {
  const settings = getPickMeAlertSettings();

  // Check if background notifications are enabled
  if (!settings.backgroundAlertsEnabled && !params.forceRingtone) return false;
  if (params.kind === 'quick_service' && !settings.soundTypes.quick_service && !params.forceRingtone) return false;
  if (params.kind === 'red_alert' && !settings.soundTypes.red_alert && !params.forceRingtone) return false;
  if (params.kind === 'emergency_blood' && !settings.soundTypes.emergency_blood && !params.forceRingtone) return false;
  if (params.kind === 'disaster_relief' && !settings.soundTypes.disaster_relief && !params.forceRingtone) return false;

  // Stop any previous state
  stopPickMeAlert();

  currentRingtoneState = {
    isRinging: true,
    kind: params.kind,
    title: params.title,
    message: params.message,
    disasterType: params.disasterType,
    locationName: params.locationName,
    targetModal: params.targetModal,
    targetPostId: params.targetPostId,
    startedAt: Date.now(),
  };
  notifyStateChange();

  // 1. Activate Background Wake Lock
  activateBackgroundWakeLock().catch(() => {});

  // 2. Play Audio & Smart Vibration Handling
  if (params.kind === 'red_alert') {
    try {
      startEmergencySiren();
    } catch {}

    // Emergency SOS Vibration Pattern (1000ms vibrate, 300ms pause...)
    if (settings.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([1000, 300, 1000, 300, 1000, 300, 1500]);
      } catch {}
    }
  } else {
    playGentleNotificationChime(settings.volume);
    if (settings.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {}
    }
  }

  // 3. Auto dismiss banner after 12 seconds
  if (autoDismissTimeout) clearTimeout(autoDismissTimeout);
  autoDismissTimeout = setTimeout(() => {
    stopPickMeAlert();
  }, 12000);

  // 4. Document Title Notification
  if (typeof document !== 'undefined') {
    originalDocumentTitle = document.title;
    let isBlink = false;
    const alertPrefix = params.kind === 'red_alert' ? '🚨 [හදිසි ආපදාවක්!]' : '📢 [නව දැනුම්දීමක්!]';

    if (titleBlinkInterval) clearInterval(titleBlinkInterval);
    titleBlinkInterval = setInterval(() => {
      document.title = isBlink ? `${alertPrefix} සහය සේවා` : originalDocumentTitle;
      isBlink = !isBlink;
    }, 1000);
  }

  // 5. Push System 24/7 OS Notification (works even when tab/screen is closed)
  fireBackgroundPushNotification(params);

  return true;
}

export const triggerBackgroundAlert = triggerPickMeAlert;

// 24/7 Background System OS Push Notification
async function fireBackgroundPushNotification(params: {
  kind: AlertKind;
  title: string;
  message: string;
  locationName?: string;
  targetModal?: string;
  targetPostId?: string;
}) {
  const fullBody = `${params.message}${params.locationName ? ` • 📍 ${params.locationName}` : ''}`;
  const tagId = `sahaya-24h-alert-${params.kind}-${Date.now()}`;

  // Native Platform Push handled via FCM Server Channel Trigger
  if (Capacitor.isNativePlatform()) {
    return;
  }

  // Web Browser Push Trigger
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && (reg as any).showNotification) {
        await (reg as any).showNotification(params.title, {
          body: fullBody,
          icon: '/logo.jpg',
          badge: '/logo.jpg',
          tag: tagId,
          vibrate: params.kind === 'red_alert' ? [1000, 300, 1000, 300] : [300, 100, 300],
          requireInteraction: params.kind === 'red_alert',
          data: {
            url: '/',
            targetModal: params.targetModal,
            targetPostId: params.targetPostId,
            kind: params.kind,
          },
          actions: [
            { action: 'open', title: '👁️ විස්තර බලන්න (Open)' },
            { action: 'dismiss', title: 'ඉවත් කරන්න (Dismiss)' },
          ],
        });
        return;
      }
    } catch {}
  }

  try {
    const notif = new Notification(params.title, {
      body: fullBody,
      icon: '/logo.jpg',
      badge: '/logo.jpg',
      tag: tagId,
    });
    notif.onclick = () => {
      window.focus();
      stopPickMeAlert();
      window.dispatchEvent(
        new CustomEvent('sahaya_notification_clicked', {
          detail: {
            targetModal: params.targetModal,
            targetPostId: params.targetPostId,
          },
        })
      );
      notif.close();
    };
  } catch {}
}

// ⏹️ Stop Siren & Banner
export function stopPickMeAlert(): void {
  try {
    stopEmergencySiren();
  } catch {}

  if (autoDismissTimeout) {
    clearTimeout(autoDismissTimeout);
    autoDismissTimeout = null;
  }
  if (titleBlinkInterval) {
    clearInterval(titleBlinkInterval);
    titleBlinkInterval = null;
    if (typeof document !== 'undefined') {
      document.title = originalDocumentTitle;
    }
  }

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(0);
    } catch {}
  }

  currentRingtoneState = null;
  notifyStateChange();
}

export const stopAlertAudio = stopPickMeAlert;

export function isPickMeAlertRinging(): boolean {
  return currentRingtoneState !== null && currentRingtoneState.isRinging;
}

export function getCurrentRingtoneState(): ActiveRingtoneState | null {
  return currentRingtoneState;
}

// Preview / Test
export function previewPickMeSound(kind: AlertKind): Promise<void> {
  return new Promise((resolve) => {
    triggerPickMeAlert({
      kind,
      title: kind === 'red_alert' ? '🚨 රතු අනතුරු ඇඟවීමේ නාදය' : '🔔 සහය සේවා පණිවිඩ නාදය',
      message: '24/7 පසුබිම් දැනුම්දීම් පරීක්ෂාව සාර්ථකයි.',
      locationName: 'කොළඹ / ශ්‍රී ලංකාව',
      forceRingtone: true,
    });

    setTimeout(() => {
      stopPickMeAlert();
      resolve();
    }, 4000);
  });
}

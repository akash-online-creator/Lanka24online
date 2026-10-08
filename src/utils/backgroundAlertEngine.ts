// 🚨 24/7 Background Notification & Emergency Alert Engine for Sahaya Sewa
// Operates 24/7 in background via Capacitor Native Push, Service Worker, and Background Sync
// Uses classic emergency siren for Red Alerts and pleasant chimes for general notifications

import { activateBackgroundWakeLock } from './notificationManager';
import { startEmergencySiren, stopEmergencySiren } from './sirenAudio';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export type AlertKind = 'quick_service' | 'red_alert' | 'emergency_blood' | 'disaster_relief' | 'general' | 'group_work';

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
    group_work: boolean;
  };
}

export type PickMeAlertSettings = BackgroundAlertSettings;

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
  volume: 0.9,
  vibrationEnabled: true,
  notificationPushEnabled: true,
  soundTypes: {
    quick_service: true,
    red_alert: true,
    emergency_blood: true,
    disaster_relief: true,
    group_work: true,
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

// Soft pleasant notification chime
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

    const safeVol = Math.max(0.05, Math.min(vol * 0.35, 0.5));
    gain.gain.setValueAtTime(safeVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch {}
}

// 📱 Initialize Native Android Notification Channels (Capacitor)
export async function initializeNativeSirenChannel() {
  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Red Alert Siren Channel (Max Importance, Lockscreen visibility, custom siren sound)
      await PushNotifications.createChannel({
        id: 'rathuweliya_siren_channel',
        name: '🚨 රතුවෙලිය ආපදා සයිරනය (Red Alert Siren)',
        description: 'හදිසි ආපදා තත්ත්වයන් සඳහා වන අතිශය හදිසි අනතුරු ඇඟවීම්',
        importance: 5, // Lights up display & shows lockscreen heads-up banner
        sound: 'siren', // Maps to res/raw/siren.wav in Android APK
        visibility: 1,  // VISIBILITY_PUBLIC (Shows on Lockscreen)
        vibration: true,
        lights: true,
        lightColor: '#ef4444'
      });

      // 2. SOS Live Channel
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

      // 3. Quick Urgent Services Channel
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

      // 4. Group Work Channel
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

      console.log('✅ Native Android Push Channels created successfully');
    } catch (e) {
      console.warn('Native notification channel creation note:', e);
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

  if (!settings.backgroundAlertsEnabled && !params.forceRingtone) return false;

  // Set active state
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

  // 1. Activate Background Wake Lock (Keeps CPU awake)
  activateBackgroundWakeLock().catch(() => {});

  // 2. Play Audio & Vibration
  if (params.kind === 'red_alert') {
    try {
      startEmergencySiren();
    } catch {}

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

  // 3. Document Title Notification
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

  // 4. Fire OS Level Background Push Notification
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

  // 1. Send via Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(params.title, {
          body: fullBody,
          icon: '/logo.jpg',
          badge: '/logo.jpg',
          tag: tagId,
          vibrate: params.kind === 'red_alert' ? [1000, 200, 1000, 200, 1500] : [200, 100, 200],
          requireInteraction: params.kind === 'red_alert' || params.kind === 'emergency_blood',
          data: {
            url: '/',
            targetModal: params.targetModal,
            targetPostId: params.targetPostId,
          },
          actions: params.kind === 'red_alert' ? [
            { action: 'open_red_alert', title: '🚨 රතු එළිය බලන්න' },
            { action: 'stop', title: '🔇 ශබ්දය නවත්වන්න' }
          ] : [
            { action: 'open', title: '👁️ බලන්න (View)' }
          ]
        });
        return;
      }
    } catch {}
  }

  // 2. Direct Window Notification Fallback
  if ('Notification' in window && Notification.permission === 'granted') {
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
        notif.close();
      };
    } catch {}
  }
}

// ⏹️ Stop Siren & Banner
export function stopPickMeAlert(): void {
  try {
    stopEmergencySiren(true);
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

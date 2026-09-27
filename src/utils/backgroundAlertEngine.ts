// 🚨 PickMe-Style Background Audio & Alert Engine for Sahaya Sewa
// Plays urgent audio ringtones and pushes background notifications even when minimized or app is closed

import { activateBackgroundWakeLock } from './notificationManager';

export type AlertKind = 'quick_service' | 'red_alert' | 'emergency_blood' | 'disaster_relief' | 'general';

export interface PickMeAlertSettings {
  backgroundAlertsEnabled: boolean;
  volume: number; // 0.0 - 1.0
  vibrationEnabled: boolean;
  repeatDurationSeconds: number; // 15, 30, 60, 0 (infinite until dismiss)
  soundTypes: {
    quick_service: boolean;
    red_alert: boolean;
    emergency_blood: boolean;
    disaster_relief: boolean;
  };
}

export interface ActiveRingtoneState {
  isRinging: boolean;
  kind: AlertKind;
  title: string;
  message: string;
  locationName?: string;
  targetModal?: 'blood' | 'aid_ledger' | 'quick_service' | 'find_for_me' | 'marketplace' | 'group_work' | 'from_me_to_you' | 'detail' | 'red_alert';
  targetPostId?: string;
  startedAt: number;
}

const SETTINGS_STORAGE_KEY = 'sahaya_pickme_alert_settings';
const DEFAULT_SETTINGS: PickMeAlertSettings = {
  backgroundAlertsEnabled: true,
  volume: 0.9,
  vibrationEnabled: true,
  repeatDurationSeconds: 30,
  soundTypes: {
    quick_service: true,
    red_alert: true,
    emergency_blood: true,
    disaster_relief: true,
  },
};

// Global audio state
let audioCtx: AudioContext | null = null;
let ringInterval: any = null;
let autoStopTimeout: any = null;
let currentRingtoneState: ActiveRingtoneState | null = null;
let originalDocumentTitle = typeof document !== 'undefined' ? document.title : 'සහය සේවා';
let titleBlinkInterval: any = null;

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
export function getPickMeAlertSettings(): PickMeAlertSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

// Save settings
export function savePickMeAlertSettings(settings: Partial<PickMeAlertSettings>) {
  try {
    const current = getPickMeAlertSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sahaya_pickme_settings_updated', { detail: updated }));
    }
  } catch {}
}

// Initialize Web Audio Context (must be triggered or unlocked by user gesture)
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Unlock audio on first user touch / click
if (typeof window !== 'undefined') {
  const unlock = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch {}
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('click', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  // Listen to ServiceWorker stop command
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && (event.data.type === 'STOP_ALERT_AUDIO' || event.data.action === 'stop')) {
        stopPickMeAlert();
      }
    });
  }
}

// 🎵 Individual Sound Pattern Synthesizers
function playQuickServiceTone(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  // PickMe-like high tempo melodic sequence: C5 -> E5 -> G5 -> C6 -> E6
  const notes = [
    { freq: 523.25, time: 0.00, dur: 0.12, type: 'triangle' },
    { freq: 659.25, time: 0.12, dur: 0.12, type: 'triangle' },
    { freq: 783.99, time: 0.24, dur: 0.14, type: 'triangle' },
    { freq: 1046.50, time: 0.38, dur: 0.20, type: 'sine' },
    { freq: 1318.51, time: 0.58, dur: 0.35, type: 'sine' },
  ];

  notes.forEach((n) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + n.time;

    osc.type = n.type as OscillatorType;
    osc.frequency.setValueAtTime(n.freq, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(vol * 0.45, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + n.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + n.dur + 0.05);
  });
}

function playRedAlertSirenTone(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  // Siren pitch modulation (wailing emergency tone)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  // Rapid pitch sweep up and down
  osc.frequency.setValueAtTime(650, now);
  osc.frequency.exponentialRampToValueAtTime(1300, now + 0.4);
  osc.frequency.exponentialRampToValueAtTime(650, now + 0.8);

  gain.gain.setValueAtTime(vol * 0.5, now);
  gain.gain.linearRampToValueAtTime(vol * 0.55, now + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.9);
}

function playEmergencyBloodTone(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  // Urgent triple medical telemetry beep
  const beeps = [0, 0.22, 0.44];

  beeps.forEach((offset, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + offset;
    const freq = idx === 2 ? 1568 : 1174.66; // High peak at end

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(vol * 0.4, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + 0.18);
  });
}

function playDisasterReliefTone(ctx: AudioContext, vol: number) {
  const now = ctx.currentTime;
  // Deep multi-tone dispatch chime: A4 -> C#5 -> E5 -> A5
  const notes = [440, 554.37, 659.25, 880];

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + idx * 0.12;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.01, start);
    gain.gain.linearRampToValueAtTime(vol * 0.38, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + 0.4);
  });
}

// 🚨 Main Trigger Function (PickMe Style Looping Background Audio & Notifications)
export function triggerPickMeAlert(params: {
  kind: AlertKind;
  title: string;
  message: string;
  locationName?: string;
  targetModal?: 'blood' | 'aid_ledger' | 'quick_service' | 'find_for_me' | 'marketplace' | 'group_work' | 'from_me_to_you' | 'detail' | 'red_alert';
  targetPostId?: string;
  forceRingtone?: boolean;
}): boolean {
  const settings = getPickMeAlertSettings();

  // Check if specific sound is enabled
  if (!settings.backgroundAlertsEnabled && !params.forceRingtone) return false;
  if (params.kind === 'quick_service' && !settings.soundTypes.quick_service && !params.forceRingtone) return false;
  if (params.kind === 'red_alert' && !settings.soundTypes.red_alert && !params.forceRingtone) return false;
  if (params.kind === 'emergency_blood' && !settings.soundTypes.emergency_blood && !params.forceRingtone) return false;
  if (params.kind === 'disaster_relief' && !settings.soundTypes.disaster_relief && !params.forceRingtone) return false;

  // Stop any currently playing ringtone first
  stopPickMeAlert();

  // Update State
  currentRingtoneState = {
    isRinging: true,
    kind: params.kind,
    title: params.title,
    message: params.message,
    locationName: params.locationName,
    targetModal: params.targetModal,
    targetPostId: params.targetPostId,
    startedAt: Date.now(),
  };
  notifyStateChange();

  // 1. Wake Lock to keep processor / audio awake in mobile background
  activateBackgroundWakeLock().catch(() => {});

  // 2. Play initial sound pattern
  const ctx = getAudioContext();
  const vol = settings.volume || 0.9;

  const playStep = () => {
    if (!currentRingtoneState?.isRinging) return;
    const activeCtx = getAudioContext();
    if (!activeCtx) return;

    if (params.kind === 'quick_service') {
      playQuickServiceTone(activeCtx, vol);
      if (settings.vibrationEnabled && navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 200, 500]);
      }
    } else if (params.kind === 'red_alert') {
      playRedAlertSirenTone(activeCtx, vol);
      if (settings.vibrationEnabled && navigator.vibrate) {
        navigator.vibrate([600, 200, 600, 200, 900]);
      }
    } else if (params.kind === 'emergency_blood') {
      playEmergencyBloodTone(activeCtx, vol);
      if (settings.vibrationEnabled && navigator.vibrate) {
        navigator.vibrate([250, 100, 250, 100, 400]);
      }
    } else {
      playDisasterReliefTone(activeCtx, vol);
      if (settings.vibrationEnabled && navigator.vibrate) {
        navigator.vibrate([400, 150, 400]);
      }
    }
  };

  if (ctx) {
    playStep();
  }

  // Set recurring loop interval (PickMe style continuous ringtone)
  const loopIntervalMs = params.kind === 'red_alert' ? 950 : params.kind === 'quick_service' ? 1600 : 1800;
  ringInterval = setInterval(playStep, loopIntervalMs);

  // Set auto-stop timer if configured (e.g. 30 seconds)
  const durationSec = settings.repeatDurationSeconds > 0 ? settings.repeatDurationSeconds : 45;
  autoStopTimeout = setTimeout(() => {
    stopPickMeAlert();
  }, durationSec * 1000);

  // 3. Document Title Blinking Alert
  if (typeof document !== 'undefined') {
    originalDocumentTitle = document.title;
    let isBlink = false;
    const alertPrefix = params.kind === 'red_alert' 
      ? '🚨 [හදිසි ආපදාවක්!]' 
      : params.kind === 'quick_service' 
      ? '⚡ [නව ඉක්මන් සේවාවක්!]' 
      : params.kind === 'emergency_blood' 
      ? '🩸 [හදිසි ලේ ඉල්ලීමක්!]' 
      : '📢 [නව දැනුම්දීමක්!]';

    if (titleBlinkInterval) clearInterval(titleBlinkInterval);
    titleBlinkInterval = setInterval(() => {
      document.title = isBlink ? `${alertPrefix} සහය සේවා` : originalDocumentTitle;
      isBlink = !isBlink;
    }, 800);
  }

  // 4. Fire System Background Notification via Service Worker
  fireBackgroundPushNotification(params);

  return true;
}

// Helper for Browser & Service Worker Push Notification
async function fireBackgroundPushNotification(params: {
  kind: AlertKind;
  title: string;
  message: string;
  locationName?: string;
  targetModal?: string;
  targetPostId?: string;
}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const fullBody = `${params.message}${params.locationName ? ` • 📍 ${params.locationName}` : ''}`;
  const tagId = `pickme-alert-${params.kind}-${Date.now()}`;

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && (reg as any).showNotification) {
        await (reg as any).showNotification(params.title, {
          body: fullBody,
          icon: '/logo.jpg',
          badge: '/logo.jpg',
          tag: tagId,
          vibrate: [400, 150, 400, 150, 600],
          requireInteraction: true,
          data: {
            url: '/',
            targetModal: params.targetModal,
            targetPostId: params.targetPostId,
            kind: params.kind,
          },
          actions: [
            { action: 'open', title: '👁️ විස්තර බලන්න (Open)' },
            { action: 'stop', title: '⏹️ ශබ්දය නවත්වන්න (Stop Sound)' },
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
      requireInteraction: true,
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

// ⏹️ Stop Ringtone & Audio Alert immediately
export function stopPickMeAlert(): void {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  if (autoStopTimeout) {
    clearTimeout(autoStopTimeout);
    autoStopTimeout = null;
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

export function isPickMeAlertRinging(): boolean {
  return currentRingtoneState !== null && currentRingtoneState.isRinging;
}

export function getCurrentRingtoneState(): ActiveRingtoneState | null {
  return currentRingtoneState;
}

// Test / Preview helper
export function previewPickMeSound(kind: AlertKind): Promise<void> {
  return new Promise((resolve) => {
    triggerPickMeAlert({
      kind,
      title: kind === 'quick_service' 
        ? '⚡ ඉක්මන් සේවා පණිවිඩ නාදය (PickMe Style)' 
        : kind === 'red_alert' 
        ? '🚨 රතු එළිය ආපදා සිරන් නාදය' 
        : kind === 'emergency_blood' 
        ? '🩸 හදිසි ලේ ඉල්ලීම් නාදය' 
        : '📦 ආපදා සහන නිවේදන නාදය',
      message: 'පසුබිමේ නාද වන ශබ්දය නිවැරදිව පරීක්ෂා කෙරේ.',
      locationName: 'කොළඹ / ශ්‍රී ලංකාව',
      forceRingtone: true,
    });

    setTimeout(() => {
      stopPickMeAlert();
      resolve();
    }, 6000);
  });
}

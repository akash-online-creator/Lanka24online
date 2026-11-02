/**
 * Continuous Support Offer Bell Ringtone Engine
 * Rings a continuous, pleasant telephone / doorbell chime when someone offers support
 * on a posted advertisement, and stops immediately when the poster clicks to view helper details.
 */

export interface SupportAlertInfo {
  postId: string;
  postAuthorId?: string;
  postTitle: string;
  helperName: string;
  helperPhone?: string;
  helperMsg?: string;
  timestamp?: number;
}

let audioCtx: AudioContext | null = null;
let isRinging = false;
let ringInterval: any = null;
let currentAlertInfo: SupportAlertInfo | null = null;
let vibrationInterval: any = null;
let wakeLockSentinel: any = null;

function getOrCreateAudioContext(): AudioContext | null {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Synthesizes a crisp, melodic bell / chime sound ("Ding-Dong-Ding")
 */
function playSingleBellChime(): void {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Pleasant melodic triad bell frequencies: C6 (1046Hz), E6 (1318Hz), G6 (1568Hz)
    const bellNotes = [
      { freq: 1046.5, timeOffset: 0.0, duration: 0.45 },
      { freq: 1318.5, timeOffset: 0.15, duration: 0.5 },
      { freq: 1568.0, timeOffset: 0.32, duration: 0.65 },
    ];

    bellNotes.forEach(({ freq, timeOffset, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Triangle + sine gives a warm metallic bell resonance
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + timeOffset);

      // Bell envelope: instant sharp attack, natural exponential decay
      gain.gain.setValueAtTime(0.001, now + timeOffset);
      gain.gain.linearRampToValueAtTime(0.35, now + timeOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + timeOffset);
      osc.stop(now + timeOffset + duration + 0.05);
    });
  } catch (err) {
    console.debug('Bell audio chime error:', err);
  }
}

function startVibration(): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([250, 150, 250, 1000]);
      if (!vibrationInterval) {
        vibrationInterval = setInterval(() => {
          if (!isRinging) {
            stopVibration();
            return;
          }
          try {
            navigator.vibrate([250, 150, 250, 1000]);
          } catch {}
        }, 1650);
      }
    } catch {}
  }
}

function stopVibration(): void {
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(0);
    } catch {}
  }
}

/**
 * Starts continuous, looping bell ringing for incoming support offer
 */
export function startContinuousSupportBell(info?: SupportAlertInfo): void {
  if (info) {
    currentAlertInfo = info;
  }

  if (isRinging) {
    // Already ringing, update alert info
    notifyStateChange();
    return;
  }

  isRinging = true;

  // Try to wake screen if supported
  try {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLockSentinel) {
      (navigator as any).wakeLock.request('screen').then((lock: any) => {
        wakeLockSentinel = lock;
      }).catch(() => {});
    }
  } catch {}

  // Play immediately
  playSingleBellChime();
  startVibration();

  // Loop continuously every 1.65 seconds until stopped
  if (ringInterval) clearInterval(ringInterval);
  ringInterval = setInterval(() => {
    if (!isRinging) {
      stopContinuousSupportBell();
      return;
    }
    playSingleBellChime();
  }, 1650);

  notifyStateChange();
}

/**
 * STOPS the continuous bell sound immediately.
 * Called when the ad poster clicks to view helper details or opens helper modal.
 */
export function stopContinuousSupportBell(): void {
  isRinging = false;
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }

  stopVibration();

  if (wakeLockSentinel) {
    try {
      wakeLockSentinel.release();
    } catch {}
    wakeLockSentinel = null;
  }

  notifyStateChange();
}

/**
 * Checks if the support bell is currently actively ringing
 */
export function isSupportBellRinging(): boolean {
  return isRinging;
}

/**
 * Gets currently ringing support offer info
 */
export function getActiveSupportAlert(): SupportAlertInfo | null {
  return currentAlertInfo;
}

/**
 * Broadcasts an incoming support offer alert and rings the bell
 */
export function triggerSupportOfferAlert(info: SupportAlertInfo): void {
  startContinuousSupportBell(info);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sahaya_support_offer_alert', { detail: info }));
  }
}

function notifyStateChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sahaya_support_bell_state', {
        detail: {
          isRinging,
          alertInfo: currentAlertInfo,
        },
      })
    );
  }
}

/**
 * Unlock Web Audio on first user gesture
 */
if (typeof window !== 'undefined') {
  const unlockAudioGesture = () => {
    getOrCreateAudioContext();
    window.removeEventListener('click', unlockAudioGesture);
    window.removeEventListener('touchstart', unlockAudioGesture);
  };
  window.addEventListener('click', unlockAudioGesture, { passive: true });
  window.addEventListener('touchstart', unlockAudioGesture, { passive: true });
}

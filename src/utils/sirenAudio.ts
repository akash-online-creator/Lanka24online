// Emergency Siren Audio Engine for Sahaya Sewa Red Alert System
// Highly resilient multi-frequency oscillating emergency warning siren
// Handles browser autoplay policies, mobile WebKit unlocking, and manual testing

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let carrierOsc1: OscillatorNode | null = null;
let carrierOsc2: OscillatorNode | null = null;
let sweepIntervalId: any = null;
let isSirenActive = false;
let isAudioUnlocked = false;

/**
 * Initializes and unlocks the Web Audio API context.
 * Called automatically on user gestures (click/tap) and on siren trigger.
 */
export function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtxClass) {
      console.warn('Web Audio API not supported on this browser.');
      return null;
    }

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioCtxClass();
    }

    // Attempt to resume if suspended
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch((e) => {
        console.warn('AudioContext resume deferred until user interaction:', e);
      });
    }

    return audioCtx;
  } catch (err) {
    console.warn('Error obtaining AudioContext:', err);
    return null;
  }
}

/**
 * Unlocks audio context on mobile and desktop browsers via silent buffer
 */
export function unlockAudio(): boolean {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        isAudioUnlocked = true;
      }).catch(() => {});
    } else {
      isAudioUnlocked = true;
    }

    // Play a 1-sample silent buffer to unlock iOS Safari audio engine
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {}

    return true;
  } catch {
    return false;
  }
}

// Auto-register unlock listeners on first user gesture
if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    unlockAudio();
    window.removeEventListener('click', handleFirstInteraction, true);
    window.removeEventListener('touchstart', handleFirstInteraction, true);
    window.removeEventListener('keydown', handleFirstInteraction, true);
  };

  window.addEventListener('click', handleFirstInteraction, { capture: true, once: true });
  window.addEventListener('touchstart', handleFirstInteraction, { capture: true, once: true });
  window.addEventListener('keydown', handleFirstInteraction, { capture: true, once: true });
}

/**
 * Starts the emergency disaster siren wail (650Hz to 1250Hz oscillating two-tone wail).
 * Returns a cleanup function that stops the siren.
 */
export function startEmergencySiren(): () => void {
  try {
    stopEmergencySiren();

    const ctx = getOrCreateAudioContext();
    if (!ctx) return () => {};

    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        if (isSirenActive) {
          // Already running or scheduled
        }
      }).catch((e) => {
        console.warn('Could not auto-resume audio context (autoplay restriction):', e);
      });
    }

    const now = ctx.currentTime;

    // Master Gain for safe volume ramping without popping
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.75, now + 0.15); // piercing audible volume
    gain.connect(ctx.destination);
    masterGain = gain;

    // Primary Siren Oscillator: Sawtooth wave for rich, cutting emergency siren harmonics
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(700, now);
    osc1.connect(gain);

    // Secondary Siren Oscillator: Triangle wave slightly detuned for deep civil-defense wail body
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(705, now);
    osc2.connect(gain);

    osc1.start(now);
    osc2.start(now);

    carrierOsc1 = osc1;
    carrierOsc2 = osc2;
    isSirenActive = true;

    // Siren Pitch Modulation Loop (Sweeps between 650Hz and 1250Hz every 1.5 seconds)
    let isRising = true;
    const cycleTimeMs = 750; // 0.75s rise, 0.75s fall -> 1.5s per full wail cycle

    const scheduleSweep = () => {
      if (!isSirenActive || !audioCtx || audioCtx.state === 'closed') return;

      const currentTime = audioCtx.currentTime;
      const targetFreq = isRising ? 1250 : 650;
      const rampDuration = 0.72;

      try {
        if (carrierOsc1) {
          carrierOsc1.frequency.cancelScheduledValues(currentTime);
          carrierOsc1.frequency.setValueAtTime(carrierOsc1.frequency.value, currentTime);
          carrierOsc1.frequency.linearRampToValueAtTime(targetFreq, currentTime + rampDuration);
        }
        if (carrierOsc2) {
          carrierOsc2.frequency.cancelScheduledValues(currentTime);
          carrierOsc2.frequency.setValueAtTime(carrierOsc2.frequency.value, currentTime);
          carrierOsc2.frequency.linearRampToValueAtTime(targetFreq + 5, currentTime + rampDuration);
        }
      } catch (err) {
        console.warn('Frequency ramp error:', err);
      }

      isRising = !isRising;
    };

    // Schedule initial rise immediately
    scheduleSweep();

    // Schedule continuous frequency sweeping
    sweepIntervalId = setInterval(scheduleSweep, cycleTimeMs);

    // Trigger physical device vibration pattern if supported on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([600, 200, 600, 200, 900, 300, 600, 200]);
      } catch {}
    }
  } catch (err) {
    console.error('Failed to start emergency siren:', err);
  }

  return stopEmergencySiren;
}

/**
 * Stops any playing emergency siren audio immediately with a soft fade-out.
 */
export function stopEmergencySiren(): void {
  try {
    isSirenActive = false;

    if (sweepIntervalId) {
      clearInterval(sweepIntervalId);
      sweepIntervalId = null;
    }

    if (masterGain && audioCtx && audioCtx.state === 'running') {
      const now = audioCtx.currentTime;
      try {
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.1);
      } catch {}
    }

    setTimeout(() => {
      if (carrierOsc1) {
        try {
          carrierOsc1.stop();
          carrierOsc1.disconnect();
        } catch {}
        carrierOsc1 = null;
      }
      if (carrierOsc2) {
        try {
          carrierOsc2.stop();
          carrierOsc2.disconnect();
        } catch {}
        carrierOsc2 = null;
      }
      if (masterGain) {
        try {
          masterGain.disconnect();
        } catch {}
        masterGain = null;
      }
    }, 120);

    // Cancel mobile vibration
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  } catch (err) {
    console.warn('Error stopping emergency siren:', err);
  }
}

/**
 * Tests the emergency siren for a specified number of seconds (default 4 seconds).
 */
export function testEmergencySiren(durationSeconds = 4): Promise<void> {
  return new Promise((resolve) => {
    unlockAudio();
    startEmergencySiren();
    setTimeout(() => {
      stopEmergencySiren();
      resolve();
    }, durationSeconds * 1000);
  });
}

/**
 * Checks if the emergency siren is currently sounding.
 */
export function isEmergencySirenPlaying(): boolean {
  return isSirenActive;
}

/**
 * Checks if AudioContext is ready or if it needs a user gesture to resume.
 */
export function isAudioContextSuspended(): boolean {
  return Boolean(audioCtx && audioCtx.state === 'suspended');
}

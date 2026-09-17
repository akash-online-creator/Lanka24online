// Emergency Siren Audio Engine for Sahaya Sewa Red Alert System
// Uses Web Audio API oscillator frequency modulation for 100% reliable loud emergency siren, with custom audio support and Firestore cloud sync

import { 
  saveSirenSettingsToFirestore, 
  subscribeToSirenSettings, 
  fetchSirenSettingsFromFirestore 
} from '../lib/firebase';

let isSirenActive = false;
let htmlAudioElement: HTMLAudioElement | null = null;
let cachedCustomAudio: string | null = null;
let cachedSirenFileName: string = 'Air Raid Siren (Preset)';
let audioCtx: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let sirenInterval: any = null;
let isInitialized = false;

// Device-level local volume & mute states
let cachedVolume: number = 0.9;
let cachedIsMuted: boolean = false;

// Event listeners for siren state changes across the UI
type SirenChangeListener = () => void;
const listeners = new Set<SirenChangeListener>();

export function subscribeToLocalSirenChanges(cb: SirenChangeListener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notifyLocalChanges() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sahaya_siren_settings_changed'));
  }
}

/**
 * Gets the current device-level siren volume (0.0 to 1.0)
 */
export function getSirenVolume(): number {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('sahaya_siren_volume');
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        cachedVolume = parsed;
        return parsed;
      }
    }
  }
  return cachedVolume;
}

/**
 * Sets the device-level siren volume (0.0 to 1.0) and adjusts playing sound in real-time
 */
export function setSirenVolume(vol: number): void {
  const clamped = Math.max(0, Math.min(1, vol));
  cachedVolume = clamped;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sahaya_siren_volume', clamped.toString());
    }
  } catch {}

  // Apply real-time volume change to actively playing siren
  applyLiveVolume();
  notifyLocalChanges();
}

/**
 * Checks if the siren is muted on this specific device
 */
export function isDeviceSirenMuted(): boolean {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('sahaya_siren_device_muted');
    if (saved !== null) {
      cachedIsMuted = saved === 'true';
      return cachedIsMuted;
    }
  }
  return cachedIsMuted;
}

/**
 * Mutes or unmutes the siren on this specific device only
 */
export function setDeviceSirenMuted(muted: boolean): void {
  cachedIsMuted = muted;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sahaya_siren_device_muted', muted ? 'true' : 'false');
    }
  } catch {}

  // Apply real-time mute change to actively playing siren
  applyLiveVolume();
  notifyLocalChanges();
}

/**
 * Applies current volume and mute states to active AudioContext GainNode and HTMLAudioElement
 */
function applyLiveVolume(): void {
  const effectiveVolume = isDeviceSirenMuted() ? 0 : getSirenVolume();

  if (gainNode && audioCtx) {
    try {
      gainNode.gain.setValueAtTime(effectiveVolume, audioCtx.currentTime);
    } catch {}
  }

  if (htmlAudioElement) {
    try {
      htmlAudioElement.volume = effectiveVolume;
    } catch {}
  }
}

// Initialize and sync with Firestore in real-time
export function initSirenSettings(): () => void {
  if (isInitialized) return () => {};
  isInitialized = true;

  // 1. Initial hydration from local storage
  try {
    if (typeof window !== 'undefined') {
      const storedAudio = localStorage.getItem('sahaya_custom_siren_audio') || localStorage.getItem('sahaya_default_siren_audio');
      if (storedAudio) cachedCustomAudio = storedAudio;
      const storedName = localStorage.getItem('sahaya_siren_filename');
      if (storedName) cachedSirenFileName = storedName;
      
      const storedVol = localStorage.getItem('sahaya_siren_volume');
      if (storedVol) cachedVolume = parseFloat(storedVol);
      
      const storedMute = localStorage.getItem('sahaya_siren_device_muted');
      if (storedMute !== null) cachedIsMuted = storedMute === 'true';
    }
  } catch {}

  // 2. Fetch from Firestore initially
  fetchSirenSettingsFromFirestore().then((remoteSettings) => {
    if (remoteSettings) {
      cachedCustomAudio = remoteSettings.audioUrl || null;
      cachedSirenFileName = remoteSettings.fileName || 'Air Raid Siren (Preset)';
      try {
        if (typeof window !== 'undefined') {
          if (remoteSettings.audioUrl) {
            localStorage.setItem('sahaya_custom_siren_audio', remoteSettings.audioUrl);
            localStorage.setItem('sahaya_default_siren_audio', remoteSettings.audioUrl);
          } else {
            localStorage.removeItem('sahaya_custom_siren_audio');
            localStorage.removeItem('sahaya_default_siren_audio');
          }
          localStorage.setItem('sahaya_siren_filename', cachedSirenFileName);
        }
      } catch {}
    }
  }).catch(() => {});

  // 3. Subscribe to real-time changes
  return subscribeToSirenSettings((settings) => {
    cachedCustomAudio = settings.audioUrl || null;
    cachedSirenFileName = settings.fileName || 'Air Raid Siren (Preset)';
    try {
      if (typeof window !== 'undefined') {
        if (settings.audioUrl) {
          localStorage.setItem('sahaya_custom_siren_audio', settings.audioUrl);
          localStorage.setItem('sahaya_default_siren_audio', settings.audioUrl);
        } else {
          localStorage.removeItem('sahaya_custom_siren_audio');
          localStorage.removeItem('sahaya_default_siren_audio');
        }
        localStorage.setItem('sahaya_siren_filename', cachedSirenFileName);
      }
    } catch {}
  });
}

// Auto-boot listener when running in browser
if (typeof window !== 'undefined') {
  try {
    initSirenSettings();
  } catch {}
}

/**
 * Persists siren settings to both Firestore Cloud Database and Local Storage
 */
export async function persistSirenSettings(
  audioUrl: string | null,
  fileName: string,
  presetType?: string
): Promise<void> {
  cachedCustomAudio = audioUrl;
  cachedSirenFileName = fileName;

  try {
    if (typeof window !== 'undefined') {
      if (audioUrl) {
        localStorage.setItem('sahaya_custom_siren_audio', audioUrl);
        localStorage.setItem('sahaya_default_siren_audio', audioUrl);
      } else {
        localStorage.removeItem('sahaya_custom_siren_audio');
        localStorage.removeItem('sahaya_default_siren_audio');
      }
      localStorage.setItem('sahaya_siren_filename', fileName);
    }
  } catch (err) {
    console.warn('LocalStorage save notice:', err);
  }

  // Save to Firestore
  try {
    await saveSirenSettingsToFirestore({
      audioUrl,
      fileName,
      presetType,
    });
  } catch (err) {
    console.warn('Failed to sync siren settings to Firestore:', err);
  }
}

export function setCustomSirenAudio(dataUri: string): void {
  persistSirenSettings(dataUri, 'Uploaded Custom Audio Tone');
}

export function getCustomSirenAudio(): string | null {
  if (cachedCustomAudio) return cachedCustomAudio;
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sahaya_custom_siren_audio') || localStorage.getItem('sahaya_default_siren_audio');
      if (stored) {
        cachedCustomAudio = stored;
        return stored;
      }
    }
  } catch {}
  return null;
}

export function getSirenFileName(): string {
  if (cachedSirenFileName) return cachedSirenFileName;
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sahaya_siren_filename');
      if (stored) {
        cachedSirenFileName = stored;
        return stored;
      }
    }
  } catch {}
  return 'Air Raid Siren (Preset)';
}

export function unlockAudio(): boolean {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
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

export function startEmergencySiren(): () => void {
  try {
    stopEmergencySiren();
    isSirenActive = true;

    const customAudioUrl = getCustomSirenAudio();
    const sirenName = getSirenFileName();

    const effectiveVolume = isDeviceSirenMuted() ? 0 : getSirenVolume();

    // If a real custom audio URL (http or actual custom data uri) is provided, try playing it first
    if (customAudioUrl && !sirenName.includes('Preset') && (customAudioUrl.startsWith('http://') || customAudioUrl.startsWith('https://') || (customAudioUrl.startsWith('data:audio') && customAudioUrl.length > 200))) {
      try {
        htmlAudioElement = new Audio();
        htmlAudioElement.crossOrigin = 'anonymous';
        htmlAudioElement.src = customAudioUrl;
        htmlAudioElement.loop = true;
        htmlAudioElement.volume = effectiveVolume;
        
        const playPromise = htmlAudioElement.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Custom audio playback blocked or failed, falling back to Web Audio Siren:', err);
            playWebAudioSiren();
          });
        }
      } catch (audioErr) {
        console.warn('Error initializing custom audio element:', audioErr);
        playWebAudioSiren();
      }
    } else {
      playWebAudioSiren();
    }

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

function playWebAudioSiren() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    let sirenName = getSirenFileName();
    const effectiveVolume = isDeviceSirenMuted() ? 0 : getSirenVolume();

    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(effectiveVolume, audioCtx.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (sirenName.includes('Police')) {
      // Police Siren: Fast alternating high-pitch wail (European/US Hi-Lo)
      oscillator.type = 'sawtooth';
      let high = false;
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.start();

      sirenInterval = setInterval(() => {
        if (!audioCtx || !oscillator) return;
        high = !high;
        try {
          oscillator.frequency.setValueAtTime(high ? 1100 : 700, audioCtx.currentTime);
        } catch {}
      }, 220);
    } else if (sirenName.includes('Tsunami')) {
      // Tsunami Alarm: Deep pulsing electronic foghorn alarm
      oscillator.type = 'square';
      let toggle = false;
      oscillator.frequency.setValueAtTime(350, audioCtx.currentTime);
      oscillator.start();

      sirenInterval = setInterval(() => {
        if (!audioCtx || !oscillator) return;
        toggle = !toggle;
        try {
          oscillator.frequency.setValueAtTime(toggle ? 650 : 350, audioCtx.currentTime);
        } catch {}
      }, 400);
    } else if (sirenName.includes('Fire') || sirenName.includes('Horn')) {
      // Fire & Disaster Horn: Urgent pulsing strobe alarm
      oscillator.type = 'sawtooth';
      let toggle = false;
      oscillator.frequency.setValueAtTime(520, audioCtx.currentTime);
      oscillator.start();

      sirenInterval = setInterval(() => {
        if (!audioCtx || !oscillator) return;
        toggle = !toggle;
        try {
          oscillator.frequency.setValueAtTime(toggle ? 980 : 520, audioCtx.currentTime);
        } catch {}
      }, 150);
    } else {
      // Air Raid Siren (Default): Slow rising and falling wail
      oscillator.type = 'sine';
      let goingUp = true;
      let freq = 350;
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
      oscillator.start();

      sirenInterval = setInterval(() => {
        if (!audioCtx || !oscillator) return;
        if (goingUp) {
          freq += 25;
          if (freq >= 900) goingUp = false;
        } else {
          freq -= 25;
          if (freq <= 350) goingUp = true;
        }
        try {
          oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        } catch {}
      }, 50);
    }
  } catch (e) {
    console.warn('Web Audio siren generation error:', e);
  }
}

export function stopEmergencySiren(): void {
  try {
    isSirenActive = false;
    if (sirenInterval) {
      clearInterval(sirenInterval);
      sirenInterval = null;
    }
    if (oscillator) {
      try {
        oscillator.stop();
        oscillator.disconnect();
      } catch {}
      oscillator = null;
    }
    if (audioCtx) {
      try {
        audioCtx.close();
      } catch {}
      audioCtx = null;
    }
    if (htmlAudioElement) {
      try {
        htmlAudioElement.pause();
        htmlAudioElement.currentTime = 0;
      } catch {}
      htmlAudioElement = null;
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  } catch (err) {
    console.warn('Error stopping emergency siren:', err);
  }
}

export function testEmergencySiren(durationSeconds = 37): Promise<void> {
  return new Promise((resolve) => {
    startEmergencySiren();
    setTimeout(() => {
      stopEmergencySiren();
      resolve();
    }, durationSeconds * 1000);
  });
}

export function isEmergencySirenPlaying(): boolean {
  return isSirenActive;
}

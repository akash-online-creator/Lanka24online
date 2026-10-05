// Emergency Siren Audio Engine for Sahaya Sewa Red Alert System
import defaultSirenSound from '../assets/mixkit-manual-siren-fire-alert-1652.wav';

let isSirenActive = false;
let htmlAudioElement: HTMLAudioElement | null = null;
let cachedVolume: number = 0.9;
let cachedIsMuted: boolean = false;
let audioUnlocked = false;

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
    try { cb(); } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sahaya_siren_settings_changed'));
  }
}

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

export function setSirenVolume(vol: number): void {
  const clamped = Math.max(0, Math.min(1, vol));
  cachedVolume = clamped;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sahaya_siren_volume', clamped.toString());
    }
  } catch {}

  applyLiveVolume();
  notifyLocalChanges();
}

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

export function setDeviceSirenMuted(muted: boolean): void {
  cachedIsMuted = muted;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sahaya_siren_device_muted', muted ? 'true' : 'false');
    }
  } catch {}

  applyLiveVolume();
  notifyLocalChanges();
}

function applyLiveVolume(): void {
  const effectiveVolume = isDeviceSirenMuted() ? 0 : getSirenVolume();
  if (htmlAudioElement) {
    try {
      htmlAudioElement.volume = effectiveVolume;
    } catch {}
  }
}

export function initSirenSettings(): () => void {
  return () => {};
}

export async function persistSirenSettings(audioUrl?: string | null, fileName?: string, ...rest: any[]): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      if (audioUrl !== undefined) {
        if (audioUrl) {
          localStorage.setItem('sahaya_custom_siren_url', audioUrl);
        } else {
          localStorage.removeItem('sahaya_custom_siren_url');
        }
      }
      if (fileName) {
        localStorage.setItem('sahaya_custom_siren_name', fileName);
      }
      window.dispatchEvent(new CustomEvent('sahaya_siren_settings_changed'));
    }
  } catch {}
}

export function setCustomSirenAudio(audioUrl?: string, ...rest: any[]): void {
  if (audioUrl) {
    persistSirenSettings(audioUrl);
  }
}

export function getCustomSirenAudio(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('sahaya_custom_siren_url');
    if (custom) return custom;
  }
  const resolvedDefault = typeof defaultSirenSound === 'string' ? defaultSirenSound : (defaultSirenSound as any)?.default || defaultSirenSound;
  return resolvedDefault || '/assets/mixkit-manual-siren-fire-alert-1652.wav';
}

export function getSirenFileName(): string {
  if (typeof window !== 'undefined') {
    const name = localStorage.getItem('sahaya_custom_siren_name');
    if (name) return name;
  }
  return 'Fire Alert Siren (WAV)';
}

// 🔓 Mobile Autoplay Unlock Helper
export function unlockAudio(): boolean {
  if (audioUnlocked) return true;
  try {
    const dummyAudio = new Audio();
    dummyAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
    dummyAudio.volume = 0.01;
    dummyAudio.play().then(() => {
      audioUnlocked = true;
      dummyAudio.pause();
    }).catch(() => {});
  } catch {}
  return true;
}

// 🚨 ප්‍රධාන සිරන් ක්‍රියාත්මක කිරීම 🚨
export function startEmergencySiren(): () => void {
  try {
    stopEmergencySiren();
    isSirenActive = true;

    const effectiveVolume = isDeviceSirenMuted() ? 0 : getSirenVolume();
    const soundUrl = getCustomSirenAudio();

    console.log('🚨 Playing Emergency Siren File:', soundUrl);

    htmlAudioElement = new Audio(soundUrl);
    htmlAudioElement.loop = true;
    htmlAudioElement.volume = effectiveVolume;
    
    const playPromise = htmlAudioElement.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('⚠️ Siren Audio Playback Blocked/Delayed by Browser Rules:', err);
      });
    }

    // High Impact Emergency Vibration
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([1000, 300, 1000, 300, 1000, 300, 1500]);
      } catch {}
    }
  } catch (err) {
    console.error('Failed to start emergency siren:', err);
  }

  return stopEmergencySiren;
}

export function stopEmergencySiren(): void {
  try {
    isSirenActive = false;
    
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

export function testEmergencySiren(durationSeconds = 15): Promise<void> {
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

export const playSirenSound = startEmergencySiren;

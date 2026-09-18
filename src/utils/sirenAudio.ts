// Emergency Siren Audio Engine for Sahaya Sewa Red Alert System
import defaultSirenSound from '../assets/mixkit-manual-siren-fire-alert-1652.wav';

let isSirenActive = false;
let htmlAudioElement: HTMLAudioElement | null = null;
let cachedVolume: number = 0.9;
let cachedIsMuted: boolean = false;

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

export async function persistSirenSettings(): Promise<void> {}

export function setCustomSirenAudio(): void {}

export function getCustomSirenAudio(): string {
  return typeof defaultSirenSound === 'string' ? defaultSirenSound : (defaultSirenSound as any)?.default || defaultSirenSound;
}

export function getSirenFileName(): string {
  return 'Fire Alert Siren (WAV)';
}

export function unlockAudio(): boolean {
  return true;
}

// 🚨 ප්‍රධාන සිරන් ක්‍රියාත්මක කිරීම 🚨
export function startEmergencySiren(): () => void {
  try {
    stopEmergencySiren();
    isSirenActive = true;

    const effectiveVolume = isDeviceSirenMuted() ? 0 : getSirenVolume();
    const soundUrl = getCustomSirenAudio();

    // Debugging Console Log - මෙය Console එකේ පෙන්නයිදැයි බලන්න
    console.log('🚨 Playing Default Siren File:', soundUrl);

    htmlAudioElement = new Audio(soundUrl);
    htmlAudioElement.loop = true;
    htmlAudioElement.volume = effectiveVolume;
    
    const playPromise = htmlAudioElement.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Siren Play Blocked by Browser:', err);
      });
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

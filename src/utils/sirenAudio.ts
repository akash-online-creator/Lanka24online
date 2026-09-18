// Emergency Siren Audio Engine for Sahaya Sewa Red Alert System
// Modified to exclusively use the custom .wav file across the entire application

import { 
  saveSirenSettingsToFirestore, 
  subscribeToSirenSettings, 
  fetchSirenSettingsFromFirestore 
} from '../lib/firebase';
import defaultSirenSound from '../assets/mixkit-manual-siren-fire-alert-1652.wav';

let isSirenActive = false;
let htmlAudioElement: HTMLAudioElement | null = null;
let cachedCustomAudio: string | null = null;
let cachedSirenFileName: string = 'Custom Fire Alert (WAV)';
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
  if (isInitialized) return () => {};
  isInitialized = true;

  try {
    if (typeof window !== 'undefined') {
      const storedVol = localStorage.getItem('sahaya_siren_volume');
      if (storedVol) cachedVolume = parseFloat(storedVol);
      
      const storedMute = localStorage.getItem('sahaya_siren_device_muted');
      if (storedMute !== null) cachedIsMuted = storedMute === 'true';
    }
  } catch {}

  fetchSirenSettingsFromFirestore().then((remoteSettings) => {
    if (remoteSettings) {
      cachedCustomAudio = remoteSettings.audioUrl || null;
      cachedSirenFileName = remoteSettings.fileName || 'Custom Fire Alert (WAV)';
    }
  }).catch(() => {});

  return subscribeToSirenSettings((settings) => {
    cachedCustomAudio = settings.audioUrl || null;
    cachedSirenFileName = settings.fileName || 'Custom Fire Alert (WAV)';
  });
}

if (typeof window !== 'undefined') {
  try {
    initSirenSettings();
  } catch {}
}

export async function persistSirenSettings(
  audioUrl: string | null,
  fileName: string,
  presetType?: string
): Promise<void> {
  cachedCustomAudio = audioUrl;
  cachedSirenFileName = fileName;

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
  return cachedCustomAudio;
}

export function getSirenFileName(): string {
  return cachedSirenFileName;
}

export function unlockAudio(): boolean {
  return true; // Web Audio API ඉවත් කළ බැවින් මෙය තවදුරටත් අත්‍යවශ්‍ය නොවේ
}

// 🚨 ප්‍රධාන සිරන් ක්‍රියාත්මක කිරීමේ කොටස 🚨
export function startEmergencySiren(): () => void {
  try {
    stopEmergencySiren();
    isSirenActive = true;

    const effectiveVolume = isDeviceSirenMuted() ? 0 : getSirenVolume();

    // ඍජුවම .wav ගොනුව භාවිතා කිරීම
    htmlAudioElement = new Audio(defaultSirenSound);
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

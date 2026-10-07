// Emergency Siren Audio Engine for Sahaya Sewa Red Alert System
// Exclusively configured for: mixkit-manual-siren-fire-alert-1652.wav
import defaultSirenSound from '../assets/mixkit-manual-siren-fire-alert-1652.wav';

let isSirenActive = false;
let htmlAudioElement: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let activeSourceNode: AudioBufferSourceNode | null = null;
let activeGainNode: GainNode | null = null;
let isPreloading = false;
let vibrationInterval: any = null;
let wakeLockSentinel: any = null;

let cachedVolume: number = 1.0;
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
  if (activeGainNode && audioContext) {
    try {
      activeGainNode.gain.setValueAtTime(effectiveVolume, audioContext.currentTime);
    } catch {}
  }
}

/**
 * Exclusively returns the mixkit-manual-siren-fire-alert-1652.wav audio URL
 */
export function getCustomSirenAudio(): string {
  const resolvedDefault = typeof defaultSirenSound === 'string' ? defaultSirenSound : (defaultSirenSound as any)?.default || defaultSirenSound;
  return resolvedDefault || '/mixkit-manual-siren-fire-alert-1652.wav';
}

export function getSirenFileName(): string {
  return 'mixkit-manual-siren-fire-alert-1652.wav';
}

export async function persistSirenSettings(audioUrl?: string | null, fileName?: string, ...rest: any[]): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
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

// 🔓 Preload Audio Buffer for 0-Latency Playback
export async function preloadSirenBuffer(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (audioBuffer) return;
  if (isPreloading) return;
  isPreloading = true;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    const soundUrl = getCustomSirenAudio();
    const response = await fetch(soundUrl, { cache: 'force-cache' });
    const arrayBuf = await response.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuf);
    console.log('✅ Siren WAV Buffer successfully preloaded into RAM memory');
  } catch (err) {
    console.warn('Siren buffer preload note:', err);
  } finally {
    isPreloading = false;
  }
}

// 🔓 Mobile Autoplay Audio Unlock Helper
export function unlockAudio(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass && !audioContext) {
      audioContext = new AudioContextClass();
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }

    if (!htmlAudioElement) {
      htmlAudioElement = new Audio(getCustomSirenAudio());
      htmlAudioElement.preload = 'auto';
      htmlAudioElement.loop = true;
      htmlAudioElement.volume = getSirenVolume();
      htmlAudioElement.load();
    }

    audioUnlocked = true;
    preloadSirenBuffer();
  } catch {}
  return true;
}

// 📳 Continuous Pulsating Vibration Loop
function startContinuousVibration() {
  stopContinuousVibration();
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      // Immediate strong vibration burst (1000ms vibrate, 200ms pause, 1000ms vibrate, 200ms pause, 1500ms vibrate)
      navigator.vibrate([1000, 200, 1000, 200, 1500]);
      
      // Continuous periodic vibration repeating every 2.5 seconds while siren is active
      vibrationInterval = setInterval(() => {
        if (!isSirenActive) {
          stopContinuousVibration();
          return;
        }
        try {
          if (navigator.vibrate) {
            navigator.vibrate([1000, 200, 1000, 200, 1500]);
          }
        } catch {}
      }, 2500);
    } catch {}
  }
}

function stopContinuousVibration() {
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

// 📱 Keep Display / CPU Active via WakeLock API and MediaSession
async function acquireScreenWakeLock() {
  try {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
    }
  } catch {}

  // Keep background audio active when screen is turned off or locked via MediaSession API
  try {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new (window as any).MediaMetadata({
        title: '🚨 රතු එළිය - හදිසි ආපදා සයිරන් අනතුරු ඇඟවීම',
        artist: 'සහය සේවා (Sahaya Sewa Emergency Siren)',
        album: 'RED ALERT - Fire & Disaster Emergency',
        artwork: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      });
      navigator.mediaSession.playbackState = 'playing';
      navigator.mediaSession.setActionHandler('pause', () => {
        stopEmergencySiren();
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        stopEmergencySiren();
      });
    }
  } catch {}
}

function releaseScreenWakeLock() {
  try {
    if (wakeLockSentinel) {
      wakeLockSentinel.release().catch(() => {});
      wakeLockSentinel = null;
    }
  } catch {}

  try {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  } catch {}
}

export function initSirenSettings(): () => void {
  if (typeof window !== 'undefined') {
    const unlocker = () => {
      unlockAudio();
      // Also unlock vibration if supported
      try {
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      } catch {}
    };

    window.addEventListener('click', unlocker, { passive: true });
    window.addEventListener('touchstart', unlocker, { passive: true });
    window.addEventListener('pointerdown', unlocker, { passive: true });
    window.addEventListener('keydown', unlocker, { passive: true });

    // Preload audio and initialize audio element immediately
    unlockAudio();
    setTimeout(() => {
      preloadSirenBuffer();
    }, 100);
  }
  return () => {};
}

// 🚨 ප්‍රධාන සිරන් ක්‍රියාත්මක කිරීම (Exclusively mixkit-manual-siren-fire-alert-1652.wav) 🚨
export function startEmergencySiren(): () => void {
  try {
    stopEmergencySiren();
    isSirenActive = true;
    unlockAudio();
    acquireScreenWakeLock();

    const effectiveVolume = isDeviceSirenMuted() ? 0 : getSirenVolume();
    const soundUrl = getCustomSirenAudio();

    console.log('🚨 Playing Emergency Fire Siren Immediately:', soundUrl);

    // 1. High-Performance Web Audio Buffer Playback (Instant, Zero Latency)
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        if (!audioContext) audioContext = new AudioContextClass();
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
        }

        if (audioBuffer) {
          activeSourceNode = audioContext.createBufferSource();
          activeSourceNode.buffer = audioBuffer;
          activeSourceNode.loop = true;

          activeGainNode = audioContext.createGain();
          activeGainNode.gain.setValueAtTime(effectiveVolume, audioContext.currentTime);

          activeSourceNode.connect(activeGainNode);
          activeGainNode.connect(audioContext.destination);
          activeSourceNode.start(0);
        }
      }
    } catch (e) {
      console.warn('Web Audio buffer playback note:', e);
    }

    // 2. HTML5 Audio Player (Tandem & Fallback for Background / Screen-Off Persistence)
    try {
      if (!htmlAudioElement) {
        htmlAudioElement = new Audio(soundUrl);
        htmlAudioElement.preload = 'auto';
        htmlAudioElement.loop = true;
      }
      htmlAudioElement.volume = effectiveVolume;
      htmlAudioElement.currentTime = 0;

      const playPromise = htmlAudioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('⚠️ Siren Audio Playback Pending User Interaction:', err);
          const retryOnInteraction = () => {
            if (isSirenActive && htmlAudioElement) {
              htmlAudioElement.play().catch(() => {});
            }
            window.removeEventListener('click', retryOnInteraction);
            window.removeEventListener('touchstart', retryOnInteraction);
            window.removeEventListener('pointerdown', retryOnInteraction);
          };
          window.addEventListener('click', retryOnInteraction, { once: true, passive: true });
          window.addEventListener('touchstart', retryOnInteraction, { once: true, passive: true });
          window.addEventListener('pointerdown', retryOnInteraction, { once: true, passive: true });
        });
      }
    } catch (e) {
      console.warn('HTML Audio player note:', e);
    }

    // 3. Continuous Emergency Vibration
    startContinuousVibration();

  } catch (err) {
    console.error('Failed to start emergency siren:', err);
  }

  return stopEmergencySiren;
}

export function stopEmergencySiren(): void {
  try {
    isSirenActive = false;
    
    // Stop Web Audio Buffer
    if (activeSourceNode) {
      try { activeSourceNode.stop(); } catch {}
      try { activeSourceNode.disconnect(); } catch {}
      activeSourceNode = null;
    }
    if (activeGainNode) {
      try { activeGainNode.disconnect(); } catch {}
      activeGainNode = null;
    }

    // Stop HTML Audio
    if (htmlAudioElement) {
      try {
        htmlAudioElement.pause();
        htmlAudioElement.currentTime = 0;
      } catch {}
    }

    // Stop Vibration
    stopContinuousVibration();

    // Release Screen WakeLock & MediaSession
    releaseScreenWakeLock();

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


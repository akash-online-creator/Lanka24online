// Emergency Siren Audio Engine for Sahaya Sewa Red Alert System
// Exclusively configured for: mixkit-manual-siren-fire-alert-1652.wav
// Designed with universal DOM Audio element + Web Audio buffer for bulletproof mobile & desktop playback

const SIREN_WAV_FILENAME = 'mixkit-manual-siren-fire-alert-1652.wav';

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

function getSirenWavUrls(): string[] {
  if (typeof window === 'undefined') return [`/${SIREN_WAV_FILENAME}`];
  const origin = window.location.origin || '';
  const pathname = (window.location.pathname || '/').replace(/\/[^/]*$/, '');
  return [
    `/${SIREN_WAV_FILENAME}`,
    `${origin}/${SIREN_WAV_FILENAME}`,
    `${pathname}/${SIREN_WAV_FILENAME}`.replace(/\/\//g, '/'),
    `./${SIREN_WAV_FILENAME}`,
    SIREN_WAV_FILENAME
  ];
}

export function getCustomSirenAudio(): string {
  return `/${SIREN_WAV_FILENAME}`;
}

export function getSirenFileName(): string {
  return SIREN_WAV_FILENAME;
}

export async function persistSirenSettings(_audioUrl?: string | null, _fileName?: string, ..._rest: any[]): Promise<void> {
  notifyLocalChanges();
}

export function setCustomSirenAudio(_audioUrl?: string, ..._rest: any[]): void {
  notifyLocalChanges();
}

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass && !audioContext) {
      audioContext = new AudioContextClass();
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
  } catch {}
  return audioContext;
}

function getAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  if (!htmlAudioElement) {
    htmlAudioElement = document.getElementById('sahaya-siren-audio-player') as HTMLAudioElement;
    if (!htmlAudioElement) {
      htmlAudioElement = document.createElement('audio');
      htmlAudioElement.id = 'sahaya-siren-audio-player';
      htmlAudioElement.preload = 'auto';
      htmlAudioElement.loop = true;
      htmlAudioElement.src = `/${SIREN_WAV_FILENAME}`;
      document.body.appendChild(htmlAudioElement);
    }
  }
  return htmlAudioElement;
}

// 🔓 Preload mixkit-manual-siren-fire-alert-1652.wav into RAM
export async function preloadSirenBuffer(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (audioBuffer) return;
  if (isPreloading) return;
  isPreloading = true;

  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    const urls = getSirenWavUrls();
    let arrayBuf: ArrayBuffer | null = null;

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          arrayBuf = await res.arrayBuffer();
          break;
        }
      } catch {}
    }

    if (arrayBuf && ctx) {
      audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        const decoded = ctx.decodeAudioData(arrayBuf!, resolve, reject);
        if (decoded && typeof (decoded as any).then === 'function') {
          (decoded as any).then(resolve).catch(reject);
        }
      });
      console.log('✅ Siren WAV Buffer loaded into Web Audio RAM');
    }
  } catch (err) {
    console.warn('Siren buffer preload note:', err);
  } finally {
    isPreloading = false;
  }
}

// 🔓 Mobile Audio Engine Unlock Helper (User Touch / Keypad / Click)
export function unlockAudio(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const audio = getAudioElement();
    if (audio) {
      audio.volume = getSirenVolume();
      const p = audio.play();
      if (p !== undefined) {
        p.then(() => {
          if (!isSirenActive) {
            audio.pause();
            audio.currentTime = 0;
          }
        }).catch(() => {});
      }
    }

    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    preloadSirenBuffer().catch(() => {});
  } catch {}
  return true;
}

// 📳 Continuous Emergency Vibration
function startContinuousVibration() {
  stopContinuousVibration();
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([1000, 200, 1000, 200, 1500]);
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
    try { navigator.vibrate(0); } catch {}
  }
}

// 📱 Keep Display & CPU active via WakeLock and MediaSession API
async function acquireScreenWakeLock() {
  try {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
    }
  } catch {}

  try {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new (window as any).MediaMetadata({
        title: '🚨 රතු එළිය - හදිසි ආපදා සයිරන් අනතුරු ඇඟවීම',
        artist: 'සහය සේවා (Sahaya Sewa Emergency Siren)',
        album: 'mixkit-manual-siren-fire-alert-1652',
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      });
      navigator.mediaSession.playbackState = 'playing';
      navigator.mediaSession.setActionHandler('pause', () => stopEmergencySiren());
      navigator.mediaSession.setActionHandler('stop', () => stopEmergencySiren());
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
    };

    window.addEventListener('click', unlocker, { passive: true });
    window.addEventListener('touchstart', unlocker, { passive: true });
    window.addEventListener('pointerdown', unlocker, { passive: true });
    window.addEventListener('keydown', unlocker, { passive: true });

    setTimeout(() => {
      preloadSirenBuffer().catch(() => {});
    }, 200);
  }
  return () => {};
}

/**
 * 🚨 ප්‍රධාන සයිරන් ක්‍රියාත්මක කිරීම
 * Exclusively plays 'mixkit-manual-siren-fire-alert-1652.wav' in a continuous loop.
 */
export function startEmergencySiren(): () => void {
  try {
    isSirenActive = true;
    acquireScreenWakeLock();

    const effectiveVolume = isDeviceSirenMuted() ? 0 : getSirenVolume();
    const ctx = getOrCreateAudioContext();

    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    console.log('🚨 Playing Emergency Siren: mixkit-manual-siren-fire-alert-1652.wav at volume:', effectiveVolume);

    // 1. Play HTML5 Audio Element (Universal support across Chrome, Android WebView, iOS)
    const audio = getAudioElement();
    if (audio) {
      audio.volume = effectiveVolume;
      audio.loop = true;

      const urls = getSirenWavUrls();
      let started = false;

      const tryPlayNextUrl = (index: number) => {
        if (index >= urls.length || !isSirenActive || started) return;
        const targetUrl = urls[index];
        audio.src = targetUrl;
        const p = audio.play();
        if (p !== undefined) {
          p.then(() => {
            started = true;
            console.log('✅ HTML Audio playing siren from:', targetUrl);
          }).catch((err) => {
            console.warn(`HTML Audio failed for ${targetUrl}:`, err);
            tryPlayNextUrl(index + 1);
          });
        }
      };

      tryPlayNextUrl(0);
    }

    // 2. Play Web Audio API buffer if ready (for zero-latency instant start)
    if (ctx && ctx.state === 'running' && audioBuffer) {
      try {
        if (activeSourceNode) {
          try { activeSourceNode.stop(); } catch {}
          try { activeSourceNode.disconnect(); } catch {}
        }
        activeSourceNode = ctx.createBufferSource();
        activeSourceNode.buffer = audioBuffer;
        activeSourceNode.loop = true;

        if (!activeGainNode) {
          activeGainNode = ctx.createGain();
          activeGainNode.connect(ctx.destination);
        }
        activeGainNode.gain.setValueAtTime(effectiveVolume, ctx.currentTime);
        activeSourceNode.connect(activeGainNode);
        activeSourceNode.start(0);
      } catch (e) {
        console.warn('Web Audio buffer playback note:', e);
      }
    } else {
      preloadSirenBuffer().catch(() => {});
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

    // Stop HTML Audio
    if (htmlAudioElement) {
      try {
        htmlAudioElement.pause();
        htmlAudioElement.currentTime = 0;
      } catch {}
    }

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

    // Stop Vibration
    stopContinuousVibration();

    // Release Screen WakeLock & MediaSession
    releaseScreenWakeLock();

  } catch (err) {
    console.warn('Error stopping emergency siren:', err);
  }
}

export function testEmergencySiren(durationSeconds = 10): Promise<void> {
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

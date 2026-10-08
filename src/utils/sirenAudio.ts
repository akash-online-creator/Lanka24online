// Emergency Siren Audio Engine for Sahaya Sewa Red Alert System
// Exclusively configured for: mixkit-manual-siren-fire-alert-1652.wav
// Bulletproof multi-engine architecture (Web Audio API Buffer + HTML5 Audio Element fallback)
// Prevents autoplay blocking, cascading aborts, and premature cancellations.

const SIREN_WAV_FILENAME = 'mixkit-manual-siren-fire-alert-1652.wav';
const SIREN_MP3_FILENAME = 'mixkit-manual-siren-fire-alert-1652.mp3';

let isSirenActive = false;
let htmlAudioElement: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let activeSourceNode: AudioBufferSourceNode | null = null;
let activeGainNode: GainNode | null = null;
let isPreloading = false;
let isWebAudioPlaying = false;
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
  return false; // Default: Never muted
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
  const effectiveVolume = isDeviceSirenMuted() ? 0 : (getSirenVolume() || 1.0);
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

function getCandidateUrls(): string[] {
  if (typeof window === 'undefined') return [`/${SIREN_WAV_FILENAME}`];
  const origin = window.location.origin || '';
  const pathname = (window.location.pathname || '/').replace(/\/[^/]*$/, '');
  
  return [
    `/${SIREN_WAV_FILENAME}`,
    `./${SIREN_WAV_FILENAME}`,
    SIREN_WAV_FILENAME,
    `${origin}/${SIREN_WAV_FILENAME}`,
    `${pathname}/${SIREN_WAV_FILENAME}`.replace(/\/\//g, '/'),
    `/${SIREN_MP3_FILENAME}`,
    `./${SIREN_MP3_FILENAME}`,
    SIREN_MP3_FILENAME
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
      htmlAudioElement.playsInline = true;
      (htmlAudioElement as any).webkitPlaysInline = true;
      htmlAudioElement.src = `/${SIREN_WAV_FILENAME}`;
      document.body.appendChild(htmlAudioElement);
    }
  }
  return htmlAudioElement;
}

// 🔓 Preload mixkit-manual-siren-fire-alert-1652 into RAM buffer
export async function preloadSirenBuffer(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (audioBuffer) return;
  if (isPreloading) return;
  isPreloading = true;

  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    const urls = getCandidateUrls();
    let arrayBuf: ArrayBuffer | null = null;

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          arrayBuf = await res.arrayBuffer();
          console.log('✅ Fetched siren audio file from:', url);
          break;
        }
      } catch {}
    }

    if (arrayBuf && ctx) {
      audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        ctx.decodeAudioData(
          arrayBuf!,
          (decoded) => resolve(decoded),
          (err) => reject(err)
        );
      });
      console.log('✅ Siren WAV Buffer successfully decoded into Web Audio RAM');
      
      if (isSirenActive && !isWebAudioPlaying) {
        startWebAudioPlayback();
      }
    }
  } catch (err) {
    console.warn('Siren buffer preload note:', err);
  } finally {
    isPreloading = false;
  }
}

// 🔓 Mobile Audio Engine Hardware Unlock (User Gesture: Touch / Keypad / Click)
export function unlockAudio(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const ctx = getOrCreateAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
        osc.stop(ctx.currentTime + 0.02);
      } catch {}
    }

    const audio = getAudioElement();
    if (audio) {
      audio.load();
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
      navigator.mediaSession.setActionHandler('pause', () => stopEmergencySiren(true));
      navigator.mediaSession.setActionHandler('stop', () => stopEmergencySiren(true));
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

// Helper: Play Web Audio buffer safely
function startWebAudioPlayback() {
  const ctx = getOrCreateAudioContext();
  if (!ctx || !audioBuffer || !isSirenActive) return;

  try {
    if (activeSourceNode) {
      try { activeSourceNode.stop(); } catch {}
      try { activeSourceNode.disconnect(); } catch {}
      activeSourceNode = null;
    }

    const effectiveVolume = isDeviceSirenMuted() ? 0 : (getSirenVolume() || 1.0);
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
    isWebAudioPlaying = true;
    console.log('🚨 Web Audio playing siren buffer (loop=true)');
  } catch (err) {
    console.warn('Web Audio buffer playback note:', err);
  }
}

let isEmergencyLocked = false;

export function setEmergencySirenLock(locked: boolean): void {
  isEmergencyLocked = locked;
}

/**
 * 🚨 ප්‍රධාන සයිරන් ක්‍රියාත්මක කිරීම
 * Exclusively plays 'mixkit-manual-siren-fire-alert-1652.wav' in a continuous loop.
 */
export function startEmergencySiren(): () => void {
  try {
    // If siren is already actively playing, ensure volume and return
    if (isSirenActive && (isWebAudioPlaying || (htmlAudioElement && !htmlAudioElement.paused))) {
      applyLiveVolume();
      return () => stopEmergencySiren(true);
    }

    isSirenActive = true;
    acquireScreenWakeLock();

    const effectiveVolume = isDeviceSirenMuted() ? 0 : (getSirenVolume() || 1.0);
    const ctx = getOrCreateAudioContext();

    console.log('🚨 Playing Emergency Siren: mixkit-manual-siren-fire-alert-1652.wav at volume:', effectiveVolume);

    // 1. Web Audio API Engine (Zero-latency instant audio)
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          if (isSirenActive) {
            startWebAudioPlayback();
          }
        }).catch(() => {});
      } else {
        startWebAudioPlayback();
      }
    }

    // 2. HTML5 Audio Element Fallback / Dual Engine
    const audio = getAudioElement();
    if (audio) {
      audio.volume = effectiveVolume;
      audio.loop = true;

      if (!isWebAudioPlaying || audio.paused) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('✅ HTML Audio playing siren element successfully');
          }).catch((err) => {
            console.warn('HTML Audio play note:', err);
            if (isSirenActive && audio.paused) {
              const fallbackUrl = `./${SIREN_WAV_FILENAME}`;
              if (audio.src !== fallbackUrl) {
                audio.src = fallbackUrl;
                audio.play().catch(() => {});
              }
            }
          });
        }
      }
    }

    // 3. Initiate preload if buffer not ready
    if (!audioBuffer) {
      preloadSirenBuffer().catch(() => {});
    }

    // 4. Continuous Emergency Vibration
    startContinuousVibration();

  } catch (err) {
    console.error('Failed to start emergency siren:', err);
  }

  return () => stopEmergencySiren(true);
}

export function stopEmergencySiren(force: boolean = false): void {
  try {
    if (isEmergencyLocked && !force) {
      console.log('🛡️ Emergency Siren is locked active during critical disaster event. Ignoring non-forced stop.');
      return;
    }
    isEmergencyLocked = false;
    isSirenActive = false;
    isWebAudioPlaying = false;

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
      stopEmergencySiren(true);
      resolve();
    }, durationSeconds * 1000);
  });
}

export function isEmergencySirenPlaying(): boolean {
  return isSirenActive;
}

export const playSirenSound = startEmergencySiren;

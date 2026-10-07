// Emergency Siren Audio Engine for Sahaya Sewa Red Alert System
// Exclusively configured for: mixkit-manual-siren-fire-alert-1652.mp3 & mixkit-manual-siren-fire-alert-1652.wav

const SIREN_MP3_URL = '/mixkit-manual-siren-fire-alert-1652.mp3';
const SIREN_WAV_URL = '/mixkit-manual-siren-fire-alert-1652.wav';

let isSirenActive = false;
let htmlAudioElement: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let activeSourceNode: AudioBufferSourceNode | null = null;
let activeGainNode: GainNode | null = null;
let syntheticOscillator: OscillatorNode | null = null;
let syntheticLfo: OscillatorNode | null = null;
let syntheticGainNode: GainNode | null = null;
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
  if (syntheticGainNode && audioContext) {
    try {
      syntheticGainNode.gain.setValueAtTime(effectiveVolume * 0.8, audioContext.currentTime);
    } catch {}
  }
}

export function getCustomSirenAudio(): string {
  return SIREN_MP3_URL;
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

// 🔓 Preload Audio Buffer into RAM for instant zero-latency playback
export async function preloadSirenBuffer(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (audioBuffer) return;
  if (isPreloading) return;
  isPreloading = true;

  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    // Try MP3 first (579KB, fast), then WAV (1.5MB)
    let arrayBuf: ArrayBuffer | null = null;
    try {
      const res = await fetch(SIREN_MP3_URL);
      if (res.ok) {
        arrayBuf = await res.arrayBuffer();
      }
    } catch {
      const res = await fetch(SIREN_WAV_URL);
      if (res.ok) {
        arrayBuf = await res.arrayBuffer();
      }
    }

    if (arrayBuf && ctx) {
      audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        const decoded = ctx.decodeAudioData(arrayBuf!, resolve, reject);
        if (decoded && typeof (decoded as any).then === 'function') {
          (decoded as any).then(resolve).catch(reject);
        }
      });
      console.log('✅ Siren Audio Buffer loaded into Web Audio RAM');
    }
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
    const ctx = getOrCreateAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Play a tiny 0.001s silent buffer to permanently unlock iOS / Android audio engine
    if (ctx && ctx.state === 'running') {
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch {}
    }

    if (!htmlAudioElement) {
      htmlAudioElement = new Audio();
      htmlAudioElement.preload = 'auto';
      htmlAudioElement.loop = true;
      htmlAudioElement.src = SIREN_MP3_URL;
      htmlAudioElement.volume = getSirenVolume();
      htmlAudioElement.load();
    }

    audioUnlocked = true;
    preloadSirenBuffer().catch(() => {});
  } catch {}
  return true;
}

// 📳 Continuous Pulsating Emergency Vibration
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
        album: 'RED ALERT - Fire & Disaster Emergency',
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

// 📢 Fail-Safe Web Audio Synthetic Siren Tone Generator
// Starts instantaneously in 0ms offline or while audio file is buffering
function startSyntheticEmergencySiren(ctx: AudioContext, vol: number) {
  try {
    stopSyntheticEmergencySiren();
    if (!ctx) return;

    // Main carrier oscillator (sweeps frequency)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, ctx.currentTime);

    // LFO modulator for authentic fire/disaster warble (0.45 Hz sweep between 650Hz and 950Hz)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.45, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(300, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.min(1, vol * 0.75), ctx.currentTime);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    lfo.start();

    syntheticOscillator = osc;
    syntheticLfo = lfo;
    syntheticGainNode = gain;
  } catch (err) {
    console.warn('Synthetic siren note:', err);
  }
}

function stopSyntheticEmergencySiren() {
  if (syntheticOscillator) {
    try { syntheticOscillator.stop(); } catch {}
    try { syntheticOscillator.disconnect(); } catch {}
    syntheticOscillator = null;
  }
  if (syntheticLfo) {
    try { syntheticLfo.stop(); } catch {}
    try { syntheticLfo.disconnect(); } catch {}
    syntheticLfo = null;
  }
  if (syntheticGainNode) {
    try { syntheticGainNode.disconnect(); } catch {}
    syntheticGainNode = null;
  }
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

    // Initial preload
    setTimeout(() => {
      preloadSirenBuffer().catch(() => {});
    }, 200);
  }
  return () => {};
}

// 🚨 ප්‍රධාන සයිරන් ක්‍රියාත්මක කිරීම (Exclusively mixkit-manual-siren-fire-alert-1652) 🚨
export function startEmergencySiren(): () => void {
  try {
    isSirenActive = true;
    unlockAudio();
    acquireScreenWakeLock();

    const effectiveVolume = isDeviceSirenMuted() ? 0 : getSirenVolume();
    const ctx = getOrCreateAudioContext();

    console.log('🚨 Playing Emergency Fire Siren at volume:', effectiveVolume);

    let webAudioStarted = false;

    // 1. Web Audio Preloaded RAM Playback (Zero Latency Instant Start)
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
        webAudioStarted = true;
      } catch (e) {
        console.warn('Web Audio buffer start note:', e);
      }
    }

    // 2. HTML5 Audio Element Playback (Supports Background / Screen-off Playback)
    try {
      if (!htmlAudioElement) {
        htmlAudioElement = new Audio();
        htmlAudioElement.preload = 'auto';
        htmlAudioElement.loop = true;
      }
      
      if (!htmlAudioElement.src || !htmlAudioElement.src.includes('mixkit-manual-siren-fire-alert-1652')) {
        htmlAudioElement.src = SIREN_MP3_URL;
      }

      htmlAudioElement.volume = effectiveVolume;
      htmlAudioElement.currentTime = 0;

      const p = htmlAudioElement.play();
      if (p !== undefined) {
        p.then(() => {
          // If HTML audio started successfully, stop synthetic oscillator if active
          stopSyntheticEmergencySiren();
        }).catch((err) => {
          console.warn('HTML5 Audio play note:', err);
          // Try WAV URL fallback
          if (htmlAudioElement && isSirenActive) {
            htmlAudioElement.src = SIREN_WAV_URL;
            htmlAudioElement.play().catch(() => {});
          }
        });
      }
    } catch (e) {
      console.warn('HTML Audio player note:', e);
    }

    // 3. Fail-Safe Synthetic Siren if file buffer isn't loaded yet
    if (!webAudioStarted && ctx && ctx.state === 'running' && !htmlAudioElement?.currentTime) {
      startSyntheticEmergencySiren(ctx, effectiveVolume);
    }

    // 4. Continuous Emergency Vibration
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

    // Stop Synthetic Generator
    stopSyntheticEmergencySiren();

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

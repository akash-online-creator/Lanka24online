const SIREN_WAV_FILENAME = 'mixkit-manual-siren-fire-alert-1652.wav';

const SIREN_MP3_FILENAME = 'mixkit-manual-siren-fire-alert-1652.mp3';

let isSirenActive = false;

let htmlAudioElement: any = null;

let audioContext: any = null;

let audioBuffer: any = null;

let activeSourceNode: any = null;

let activeGainNode: any = null;

let synthOscillator: any = null;

let synthGainNode: any = null;

let synthInterval: any = null;

let keepAliveOscillator: any = null;

let keepAliveGain: any = null;

let isPreloading = false;

let isWebAudioPlaying = false;

let vibrationInterval: any = null;

let wakeLockSentinel: any = null;

let webLockHeld = false;

let cachedVolume: number = 1.0;

let cachedIsMuted: boolean = false;

const listeners = new Set();

export function subscribeToLocalSirenChanges(cb: any) {

  listeners.add(cb);

  return () => {

    listeners.delete(cb);

  };

}

function notifyLocalChanges() {

  listeners.forEach((cb: any) => {

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

      if (!isNaN(parsed) && Math.max(0, Math.min(1, parsed)) === parsed) {

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

  if (synthGainNode && audioContext) {

    try {

      synthGainNode.gain.setValueAtTime(effectiveVolume * 0.65, audioContext.currentTime);

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

export async function persistSirenSettings(_audioUrl?: any, _fileName?: any, ..._rest: any[]) {

  notifyLocalChanges();

}

export function setCustomSirenAudio(_audioUrl?: any, ..._rest: any[]): void {

  notifyLocalChanges();

}

function acquirePersistentWebLock() {

  if (webLockHeld || typeof navigator === 'undefined') return;

  try {

    const navAny = navigator as any;

    if (navAny.locks && typeof navAny.locks.request === 'function') {

      webLockHeld = true;

      navAny.locks.request('sahaya_24_7_red_alert_audio_lock', () => new Promise(() => {})).catch(() => {

        webLockHeld = false;

      });

    }

  } catch {}

}

function getOrCreateAudioContext(): any {

  if (typeof window === 'undefined') return null;

  try {

    const winAny = window as any;

    const AudioContextClass = winAny.AudioContext || winAny.webkitAudioContext;

    if (AudioContextClass && !audioContext) {

      audioContext = new AudioContextClass();

    }

    if (audioContext && audioContext.state === 'suspended') {

      audioContext.resume().catch(() => {});

    }

  } catch {}

  return audioContext;

}

function startSubAudibleKeepAlive() {

  try {

    const ctx = getOrCreateAudioContext();

    if (!ctx || keepAliveOscillator) return;

    keepAliveOscillator = ctx.createOscillator();

    keepAliveGain = ctx.createGain();

    keepAliveOscillator.type = 'sine';

    keepAliveOscillator.frequency.setValueAtTime(20, ctx.currentTime);

    keepAliveGain.gain.setValueAtTime(0.00001, ctx.currentTime);

    keepAliveOscillator.connect(keepAliveGain);

    keepAliveGain.connect(ctx.destination);

    keepAliveOscillator.start(0);

  } catch {}

}

function getAudioElement(): any {

  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  if (!htmlAudioElement) {

    htmlAudioElement = document.getElementById('sahaya-siren-audio-player');

    if (!htmlAudioElement) {

      htmlAudioElement = document.createElement('audio');

      htmlAudioElement.id = 'sahaya-siren-audio-player';

      htmlAudioElement.preload = 'auto';

      htmlAudioElement.loop = true;

      htmlAudioElement.playsInline = true;

      htmlAudioElement.webkitPlaysInline = true;

      htmlAudioElement.src = `/${SIREN_WAV_FILENAME}`;

      document.body.appendChild(htmlAudioElement);

    }

  }

  return htmlAudioElement;

}

export async function preloadSirenBuffer() {

  if (typeof window === 'undefined') return;

  if (audioBuffer) return;

  if (isPreloading) return;

  isPreloading = true;

  try {

    const ctx = getOrCreateAudioContext();

    if (!ctx) return;

    const urls = getCandidateUrls();

    let arrayBuf: any = null;

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

      audioBuffer = await new Promise((resolve, reject) => {

        ctx.decodeAudioData(

          arrayBuf,

          (decoded: any) => resolve(decoded),

          (err: any) => reject(err)

        );

      });

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

export function unlockAudio(): boolean {

  if (typeof window === 'undefined') return false;

  try {

    acquirePersistentWebLock();

    const ctx = getOrCreateAudioContext();

    if (ctx) {

      if (ctx.state === 'suspended') {

        ctx.resume().catch(() => {});

      }

      startSubAudibleKeepAlive();

    }

    const audio = getAudioElement();

    if (audio) {

      audio.load();

    }

    preloadSirenBuffer().catch(() => {});

  } catch {}

  return true;

}

function startSynthEmergencyBackup() {

  stopSynthEmergencyBackup();

  try {

    const ctx = getOrCreateAudioContext();

    if (!ctx || !isSirenActive) return;

    const effectiveVolume = isDeviceSirenMuted() ? 0 : (getSirenVolume() || 1.0);

    synthOscillator = ctx.createOscillator();

    synthGainNode = ctx.createGain();

    synthOscillator.type = 'sawtooth';

    synthOscillator.frequency.setValueAtTime(880, ctx.currentTime);

    synthGainNode.gain.setValueAtTime(effectiveVolume * 0.65, ctx.currentTime);

    synthOscillator.connect(synthGainNode);

    synthGainNode.connect(ctx.destination);

    synthOscillator.start(0);

    let highTone = false;

    synthInterval = setInterval(() => {

      if (!isSirenActive || !synthOscillator || !audioContext) {

        stopSynthEmergencyBackup();

        return;

      }

      try {

        const now = audioContext.currentTime;

        const targetFreq = highTone ? 1320 : 860;

        synthOscillator.frequency.linearRampToValueAtTime(targetFreq, now + 0.35);

        highTone = !highTone;

      } catch {}

    }, 400);

  } catch {}

}

function stopSynthEmergencyBackup() {

  if (synthInterval) {

    clearInterval(synthInterval);

    synthInterval = null;

  }

  if (synthOscillator) {

    try { synthOscillator.stop(); } catch {}

    try { synthOscillator.disconnect(); } catch {}

    synthOscillator = null;

  }

  if (synthGainNode) {

    try { synthGainNode.disconnect(); } catch {}

    synthGainNode = null;

  }

}

function startContinuousVibration() {

  stopContinuousVibration();

  if (typeof navigator !== 'undefined' && navigator.vibrate) {

    try {

      navigator.vibrate([1000, 200, 1000, 200, 1500, 200, 2000]);

      vibrationInterval = setInterval(() => {

        if (!isSirenActive) {

          stopContinuousVibration();

          return;

        }

        try {

          if (navigator.vibrate) {

            navigator.vibrate([1000, 200, 1000, 200, 1500, 200, 2000]);

          }

        } catch {}

      }, 2800);

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

async function acquireScreenWakeLock() {

  try {

    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {

      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');

    }

  } catch {}

  try {

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {

      const winAny = window as any;

      if (winAny.MediaMetadata) {

        navigator.mediaSession.metadata = new winAny.MediaMetadata({

          title: '🚨 රතු එළිය - හදිසි ආපදා සයිරන් අනතුරු ඇඟවීම',

          artist: 'සහය සේවා (Sahaya Sewa Emergency Siren)',

          album: '15km Emergency Alert',

          artwork: [

            { src: '/logo.jpg', sizes: '192x192', type: 'image/jpeg' }

          ]

        });

      }

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

export function initSirenSettings() {

  if (typeof window !== 'undefined') {

    acquirePersistentWebLock();

    const unlocker = () => {

      unlockAudio();

    };

    window.addEventListener('click', unlocker, { passive: true });

    window.addEventListener('touchstart', unlocker, { passive: true });

    window.addEventListener('pointerdown', unlocker, { passive: true });

    window.addEventListener('keydown', unlocker, { passive: true });

    document.addEventListener('visibilitychange', () => {

      const ctx = getOrCreateAudioContext();

      if (ctx && ctx.state === 'suspended') {

        ctx.resume().catch(() => {});

      }

    });

    setTimeout(() => {

      preloadSirenBuffer().catch(() => {});

    }, 200);

  }

  return () => {};

}

function startWebAudioPlayback() {

  const ctx = getOrCreateAudioContext();

  if (!ctx || !audioBuffer || !isSirenActive) return;

  try {

    if (activeSourceNode) {

      try { activeSourceNode.stop(); } catch {}

      try { activeSourceNode.disconnect(); } catch {}

      activeSourceNode = null;

    }

    const effectiveVolume = isDeviceSirenMuted() ? 0 : getSirenVolume();

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

    stopSynthEmergencyBackup();

  } catch (err) {

    console.warn('Web Audio buffer playback note:', err);

  }

}

export function startEmergencySiren() {

  try {

    if (isSirenActive && (isWebAudioPlaying || (htmlAudioElement && !htmlAudioElement.paused))) {

      applyLiveVolume();

      return stopEmergencySiren;

    }

    isSirenActive = true;

    acquirePersistentWebLock();

    acquireScreenWakeLock();

    const effectiveVolume = isDeviceSirenMuted() ? 0 : (getSirenVolume() || 1.0);

    const ctx = getOrCreateAudioContext();

    if (ctx) {

      if (ctx.state === 'suspended') {

        ctx.resume().then(() => {

          if (isSirenActive) {

            if (audioBuffer) startWebAudioPlayback();

            else startSynthEmergencyBackup();

          }

        }).catch(() => {});

      } else {

        if (audioBuffer) startWebAudioPlayback();

        else startSynthEmergencyBackup();

      }

    }

    const audio = getAudioElement();

    if (audio) {

      audio.volume = effectiveVolume;

      audio.loop = true;

      if (!isWebAudioPlaying || audio.paused) {

        const playPromise = audio.play();

        if (playPromise !== undefined) {

          playPromise.catch(() => {

            if (isSirenActive) {

              startSynthEmergencyBackup();

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

    if (!audioBuffer) {

      preloadSirenBuffer().catch(() => {});

    }

    startContinuousVibration();

  } catch (err) {

    console.error('Failed to start emergency siren:', err);

  }

  return stopEmergencySiren;

}

let isEmergencyLocked = false;

export function setEmergencySirenLock(locked: boolean): void {

  isEmergencyLocked = locked;

}

export function stopEmergencySiren(force: boolean = false): void {

  try {

    if (isEmergencyLocked && !force) {

      return;

    }

    isEmergencyLocked = false;

    isSirenActive = false;

    isWebAudioPlaying = false;

    if (htmlAudioElement) {

      try {

        htmlAudioElement.pause();

        htmlAudioElement.currentTime = 0;

      } catch {}

    }

    if (activeSourceNode) {

      try { activeSourceNode.stop(); } catch {}

      try { activeSourceNode.disconnect(); } catch {}

      activeSourceNode = null;

    }

    if (activeGainNode) {

      try { activeGainNode.disconnect(); } catch {}

      activeGainNode = null;

    }

    stopSynthEmergencyBackup();

    stopContinuousVibration();

    releaseScreenWakeLock();

  } catch (err) {

    console.warn('Error stopping emergency siren:', err);

  }

}

export function testEmergencySiren(durationSeconds = 10) {

  return new Promise((resolve) => {

    startEmergencySiren();

    setTimeout(() => {

      stopEmergencySiren(true);

      resolve(undefined);

    }, durationSeconds * 1000);

  });

}

export function isEmergencySirenPlaying(): boolean {

  return isSirenActive;

}

export const playSirenSound = startEmergencySiren;


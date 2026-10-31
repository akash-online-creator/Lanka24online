const SIREN_WAV_FILENAME = 'mixkit-manual-siren-fire-alert-1652.wav';

const SIREN_MP3_FILENAME = 'mixkit-manual-siren-fire-alert-1652.mp3';

const SILENT_WAV_DATA_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

let isSirenActive = false;

let htmlAudioElement: any = null;

let silentKeepAliveAudio: any = null;

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

    try {

      cb();

    } catch (err) {}

  });

  if (typeof window !== 'undefined') {

    window.dispatchEvent(new CustomEvent('sahaya_siren_settings_changed', {

      detail: { isPlaying: isSirenActive }

    }));

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

  } catch (err) {}

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

  } catch (err) {}

  applyLiveVolume();

  notifyLocalChanges();

}

function applyLiveVolume(): void {

  const effectiveVolume = isDeviceSirenMuted() ? 0 : getSirenVolume();

  if (htmlAudioElement) {

    try {

      htmlAudioElement.volume = effectiveVolume;

    } catch (err) {}

  }

  if (activeGainNode && audioContext) {

    try {

      activeGainNode.gain.setValueAtTime(effectiveVolume, audioContext.currentTime);

    } catch (err) {}

  }

  if (synthGainNode && audioContext) {

    try {

      synthGainNode.gain.setValueAtTime(effectiveVolume * 0.65, audioContext.currentTime);

    } catch (err) {}

  }

}

function getCandidateUrls(): string[] {

  if (typeof window === 'undefined') return ['/' + SIREN_WAV_FILENAME];

  const origin = window.location.origin ? window.location.origin : '';

  const pathname = (window.location.pathname ? window.location.pathname : '/').replace(/\/[^/]*$/, '');

  return ['/' + SIREN_WAV_FILENAME, './' + SIREN_WAV_FILENAME, SIREN_WAV_FILENAME, origin + '/' + SIREN_WAV_FILENAME, (pathname + '/' + SIREN_WAV_FILENAME).replace(/\/\//g, '/'), '/' + SIREN_MP3_FILENAME, './' + SIREN_MP3_FILENAME, SIREN_MP3_FILENAME];

}

export function getCustomSirenAudio(): string {

  return '/' + SIREN_WAV_FILENAME;

}

export function getSirenFileName(): string {

  return SIREN_WAV_FILENAME;

}

export async function persistSirenSettings(audioUrl?: any, fileName?: any, ...rest: any) {

  notifyLocalChanges();

}

export function setCustomSirenAudio(audioUrl?: any, ...rest: any): void {

  notifyLocalChanges();

}

function acquirePersistentWebLock() {

  if (webLockHeld) return;

  if (typeof navigator === 'undefined') return;

  try {

    const navAny = (navigator as any);

    if (navAny.locks && typeof navAny.locks.request === 'function') {

      webLockHeld = true;

      navAny.locks.request('sahaya_24_7_red_alert_audio_lock', () => new Promise(() => {})).catch(() => {

        webLockHeld = false;

      });

    }

  } catch (err) {}

}

function getOrCreateAudioContext(): any {

  if (typeof window === 'undefined') return null;

  try {

    const winAny = (window as any);

    const AudioContextClass = winAny.AudioContext ? winAny.AudioContext : winAny.webkitAudioContext;

    if (AudioContextClass && !audioContext) {

      audioContext = new AudioContextClass();

    }

    if (audioContext && audioContext.state === 'suspended') {

      audioContext.resume().catch(() => {});

    }

  } catch (err) {}

  return audioContext;

}

let keepAliveBlobUrl: any = null;

function getKeepAliveWavUrl(): string {

  if (keepAliveBlobUrl) return keepAliveBlobUrl;

  try {

    const sampleRate = 8000;

    const numSamples = sampleRate * 2;

    const buffer = new ArrayBuffer(44 + numSamples * 2);

    const view = new DataView(buffer);

    const writeStr = (offset: number, str: string) => {

      for (let i = 0; i !== str.length; i++) {

        view.setUint8(offset + i, str.charCodeAt(i));

      }

    };

    writeStr(0, 'RIFF');

    view.setUint32(4, 36 + numSamples * 2, true);

    writeStr(8, 'WAVE');

    writeStr(12, 'fmt ');

    view.setUint32(16, 16, true);

    view.setUint16(20, 1, true);

    view.setUint16(22, 1, true);

    view.setUint32(24, sampleRate, true);

    view.setUint32(28, sampleRate * 2, true);

    view.setUint16(32, 2, true);

    view.setUint16(34, 16, true);

    writeStr(36, 'data');

    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i !== numSamples; i++) {

      const sample = Math.round(Math.sin((2 * Math.PI * 18 * i) / sampleRate) * 4);

      view.setInt16(44 + i * 2, sample, true);

    }

    const blob = new Blob([buffer], { type: 'audio/wav' });

    keepAliveBlobUrl = URL.createObjectURL(blob);

    return keepAliveBlobUrl;

  } catch (err) {

    return SILENT_WAV_DATA_URI;

  }

}

function startSubAudibleKeepAlive() {

  try {

    const ctx = getOrCreateAudioContext();

    if (ctx && !keepAliveOscillator) {

      keepAliveOscillator = ctx.createOscillator();

      keepAliveGain = ctx.createGain();

      keepAliveOscillator.type = 'sine';

      keepAliveOscillator.frequency.setValueAtTime(18, ctx.currentTime);

      keepAliveGain.gain.setValueAtTime(0.0005, ctx.currentTime);

      keepAliveOscillator.connect(keepAliveGain);

      keepAliveGain.connect(ctx.destination);

      keepAliveOscillator.start(0);

    }

  } catch (err) {}

  try {

    if (typeof document !== 'undefined' && !silentKeepAliveAudio) {

      silentKeepAliveAudio = document.getElementById('sahaya-silent-keepalive-audio');

      if (!silentKeepAliveAudio) {

        silentKeepAliveAudio = document.createElement('audio');

        silentKeepAliveAudio.id = 'sahaya-silent-keepalive-audio';

        silentKeepAliveAudio.loop = true;

        silentKeepAliveAudio.preload = 'auto';

        silentKeepAliveAudio.playsInline = true;

        silentKeepAliveAudio.webkitPlaysInline = true;

        silentKeepAliveAudio.volume = 0.01;

        silentKeepAliveAudio.src = getKeepAliveWavUrl();

        silentKeepAliveAudio.addEventListener('pause', () => {

          if (silentKeepAliveAudio && silentKeepAliveAudio.paused) {

            silentKeepAliveAudio.play().catch(() => {});

          }

        });

        document.body.appendChild(silentKeepAliveAudio);

      }

    }

    if (silentKeepAliveAudio && silentKeepAliveAudio.paused) {

      silentKeepAliveAudio.play().catch(() => {});

    }

  } catch (err) {}

}

function getAudioElement(): any {

  if (typeof window === 'undefined') return null;

  if (typeof document === 'undefined') return null;

  if (!htmlAudioElement) {

    htmlAudioElement = document.getElementById('sahaya-siren-audio-player');

    if (!htmlAudioElement) {

      htmlAudioElement = document.createElement('audio');

      htmlAudioElement.id = 'sahaya-siren-audio-player';

      htmlAudioElement.preload = 'auto';

      htmlAudioElement.loop = true;

      htmlAudioElement.playsInline = true;

      htmlAudioElement.webkitPlaysInline = true;

      htmlAudioElement.src = '/' + SIREN_WAV_FILENAME;

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

      } catch (err) {}

    }

    if (arrayBuf && ctx) {

      audioBuffer = await new Promise((resolve, reject) => {

        ctx.decodeAudioData(arrayBuf, (decoded: any) => resolve(decoded), (err: any) => reject(err));

      });

    }

  } catch (err) {

    console.warn('Siren buffer preload note:', err);

  } finally {

    isPreloading = false;

  }

}

let isAudioUnlockedOnce = false;

export function unlockAudio(): boolean {

  if (typeof window === 'undefined') return false;
  if (isAudioUnlockedOnce) return true;

  try {
    isAudioUnlockedOnce = true;

    acquirePersistentWebLock();

    const ctx = getOrCreateAudioContext();

    if (ctx) {

      if (ctx.state === 'suspended') {

        ctx.resume().catch(() => {});

      }

      startSubAudibleKeepAlive();

    }

    const audio = getAudioElement();

    if (audio && audio.paused && !isSirenActive) {

      audio.load();

    }

    preloadSirenBuffer().catch(() => {});

  } catch (err) {}

  return true;

}

function stopSynthEmergencyBackup() {

  if (synthInterval) {

    clearInterval(synthInterval);

    synthInterval = null;

  }

  if (synthOscillator) {

    try {

      synthOscillator.stop();

    } catch (err) {}

    try {

      synthOscillator.disconnect();

    } catch (err) {}

    synthOscillator = null;

  }

  if (synthGainNode) {

    try {

      synthGainNode.disconnect();

    } catch (err) {}

    synthGainNode = null;

  }

}

function startSynthEmergencyBackup() {

  if (isWebAudioPlaying) return;

  if (htmlAudioElement && !htmlAudioElement.paused) return;

  if (synthOscillator) return;

  stopSynthEmergencyBackup();

  try {

    const ctx = getOrCreateAudioContext();

    if (!ctx) return;

    if (!isSirenActive) return;

    const effectiveVolume = isDeviceSirenMuted() ? 0 : getSirenVolume() ? getSirenVolume() : 1.0;

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

      if (!isSirenActive) {

        stopSynthEmergencyBackup();

        return;

      }

      if (!synthOscillator) {

        stopSynthEmergencyBackup();

        return;

      }

      if (!audioContext) {

        stopSynthEmergencyBackup();

        return;

      }

      try {

        const now = audioContext.currentTime;

        const targetFreq = highTone ? 1320 : 860;

        synthOscillator.frequency.linearRampToValueAtTime(targetFreq, now + 0.35);

        highTone = !highTone;

      } catch (err) {}

    }, 400);

  } catch (err) {}

}

function stopContinuousVibration() {

  if (vibrationInterval) {

    clearInterval(vibrationInterval);

    vibrationInterval = null;

  }

  if (typeof navigator !== 'undefined' && navigator.vibrate) {

    try {

      navigator.vibrate(0);

    } catch (err) {}

  }

}

function startContinuousVibration() {

  if (vibrationInterval) return;

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

        } catch (err) {}

      }, 2800);

    } catch (err) {}

  }

}

async function acquireScreenWakeLock() {

  try {

    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLockSentinel) {

      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');

    }

  } catch (err) {}

  try {

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {

      const winAny = (window as any);

      if (winAny.MediaMetadata) {

        navigator.mediaSession.metadata = new winAny.MediaMetadata({

          title: '🚨 රතු එළිය - හදිසි ආපදා සයිරන් අනතුරු ඇඟවීම',

          artist: 'සහය සේවා (Sahaya Sewa Emergency Siren)',

          album: '15km Emergency Alert',

          artwork: [{

            src: '/logo.jpg',

            sizes: '192x192',

            type: 'image/jpeg'

          }]

        });

      }

      navigator.mediaSession.playbackState = 'playing';

      navigator.mediaSession.setActionHandler('pause', () => stopEmergencySiren(true));

      navigator.mediaSession.setActionHandler('stop', () => stopEmergencySiren(true));

    }

  } catch (err) {}

}

function releaseScreenWakeLock() {

  try {

    if (wakeLockSentinel) {

      wakeLockSentinel.release().catch(() => {});

      wakeLockSentinel = null;

    }

  } catch (err) {}

  try {

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {

      navigator.mediaSession.playbackState = 'paused';

    }

  } catch (err) {}

}

export function initSirenSettings() {

  if (typeof window !== 'undefined') {

    acquirePersistentWebLock();

    const unlocker = (ev?: any) => {
      const tag = ev && ev.target && ev.target.tagName ? String(ev.target.tagName).toUpperCase() : '';
      if (tag === 'INPUT' ? true : tag === 'TEXTAREA' ? true : tag === 'SELECT') return;
      unlockAudio();
      window.removeEventListener('click', unlocker);
      window.removeEventListener('touchstart', unlocker);
      window.removeEventListener('pointerdown', unlocker);
    };
    window.addEventListener('click', unlocker, { passive: true });

    window.addEventListener('touchstart', unlocker, { passive: true });

    window.addEventListener('pointerdown', unlocker, { passive: true });

    document.addEventListener('visibilitychange', () => {

      const ctx = getOrCreateAudioContext();

      if (ctx && ctx.state === 'suspended') {

        ctx.resume().catch(() => {});

      }

      startSubAudibleKeepAlive();

    });

    setTimeout(() => {

      preloadSirenBuffer().catch(() => {});

    }, 200);

  }

  return () => {};

}

function stopAllPlaybackEnginesOnly() {

  isWebAudioPlaying = false;

  if (activeSourceNode) {

    try {

      activeSourceNode.stop();

    } catch (err) {}

    try {

      activeSourceNode.disconnect();

    } catch (err) {}

    activeSourceNode = null;

  }

  if (htmlAudioElement) {

    try {

      htmlAudioElement.pause();

      htmlAudioElement.currentTime = 0;

    } catch (err) {}

  }

  stopSynthEmergencyBackup();

}

function startWebAudioPlayback(): boolean {

  const ctx = getOrCreateAudioContext();

  if (!ctx) return false;

  if (!audioBuffer) return false;

  if (!isSirenActive) return false;

  try {

    stopAllPlaybackEnginesOnly();

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

    return true;

  } catch (err) {

    console.warn('Web Audio buffer playback note:', err);

    isWebAudioPlaying = false;

    return false;

  }

}

export function startEmergencySiren() {

  try {

    const isHtmlPlaying = Boolean(htmlAudioElement && !htmlAudioElement.paused);

    const isSynthPlaying = Boolean(synthOscillator);

    if (isSirenActive && (isWebAudioPlaying ? true : isHtmlPlaying ? true : isSynthPlaying)) {

      applyLiveVolume();

      notifyLocalChanges();

      return stopEmergencySiren;

    }

    isSirenActive = true;

    acquirePersistentWebLock();

    acquireScreenWakeLock();

    startSubAudibleKeepAlive();

    const effectiveVolume = isDeviceSirenMuted() ? 0 : getSirenVolume() ? getSirenVolume() : 1.0;

    const ctx = getOrCreateAudioContext();

    stopAllPlaybackEnginesOnly();

    let startedSingleStream = false;

    if (ctx && audioBuffer && ctx.state === 'running') {

      startedSingleStream = startWebAudioPlayback();

    }

    if (!startedSingleStream) {

      const audio = getAudioElement();

      if (audio) {

        audio.volume = effectiveVolume;

        audio.loop = true;

        const playPromise = audio.play();

        if (playPromise !== undefined) {

          startedSingleStream = true;

          playPromise.catch(() => {

            if (!isSirenActive) return;

            if (isWebAudioPlaying) return;

            if (audioBuffer && ctx) {

              ctx.resume().then(() => {

                if (isSirenActive && !isWebAudioPlaying && (!htmlAudioElement ? !htmlAudioElement : htmlAudioElement.paused)) {

                  const ok = startWebAudioPlayback();

                  if (!ok) startSynthEmergencyBackup();

                }

              }).catch(() => {

                startSynthEmergencyBackup();

              });

            } else {

              startSynthEmergencyBackup();

            }

          });

        }

      }

    }

    if (!startedSingleStream) {

      if (ctx && ctx.state === 'suspended') {

        ctx.resume().then(() => {

          if (isSirenActive && !isWebAudioPlaying && (!htmlAudioElement ? !htmlAudioElement : htmlAudioElement.paused)) {

            if (audioBuffer) {

              const ok = startWebAudioPlayback();

              if (!ok) startSynthEmergencyBackup();

            } else {

              startSynthEmergencyBackup();

            }

          }

        }).catch(() => {

          startSynthEmergencyBackup();

        });

      } else {

        startSynthEmergencyBackup();

      }

    }

    if (!audioBuffer) {

      preloadSirenBuffer().catch(() => {});

    }

    startContinuousVibration();

    notifyLocalChanges();

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

    stopAllPlaybackEnginesOnly();

    if (activeGainNode) {

      try {

        activeGainNode.disconnect();

      } catch (err) {}

      activeGainNode = null;

    }

    stopContinuousVibration();

    releaseScreenWakeLock();

    notifyLocalChanges();

  } catch (err) {

    console.warn('Error stopping emergency siren:', err);

  }

}

export function testEmergencySiren(durationSeconds = 10) {

  return new Promise(resolve => {

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

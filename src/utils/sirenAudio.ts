// Emergency Siren Audio Engine for Sahaya Sewa Red Alert System
// Uses Web Audio API oscillator frequency modulation for 100% reliable loud emergency siren, with custom audio support

let isSirenActive = false;
let htmlAudioElement: HTMLAudioElement | null = null;
let cachedCustomAudio: string | null = null;
let audioCtx: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let sirenInterval: any = null;

export function setCustomSirenAudio(dataUri: string): void {
  cachedCustomAudio = dataUri;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sahaya_custom_siren_audio', dataUri);
      localStorage.setItem('sahaya_default_siren_audio', dataUri);
    }
  } catch (err) {
    console.warn('Failed to save custom siren audio to localStorage:', err);
  }
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
    const sirenName = (() => {
      try {
        return localStorage.getItem('sahaya_siren_filename') || '';
      } catch {
        return '';
      }
    })();

    // If a real custom audio URL (http or actual custom data uri) is provided, try playing it first
    if (customAudioUrl && !sirenName.includes('Preset') && (customAudioUrl.startsWith('http://') || customAudioUrl.startsWith('https://') || (customAudioUrl.startsWith('data:audio') && customAudioUrl.length > 200))) {
      try {
        htmlAudioElement = new Audio();
        htmlAudioElement.crossOrigin = 'anonymous';
        htmlAudioElement.src = customAudioUrl;
        htmlAudioElement.loop = true;
        htmlAudioElement.volume = 1.0;
        
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

    let sirenName = '';
    try {
      if (typeof window !== 'undefined') {
        sirenName = localStorage.getItem('sahaya_siren_filename') || '';
      }
    } catch {}

    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.9, audioCtx.currentTime);
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

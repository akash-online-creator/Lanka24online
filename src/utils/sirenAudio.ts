// Emergency Siren Audio Engine for Sahaya Sewa Red Alert System
// Plays exact user-uploaded custom audio file stored in localStorage, with robust HTML5 audio playback

let isSirenActive = false;
let htmlAudioElement: HTMLAudioElement | null = null;
let cachedCustomAudio: string | null = null;

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
    const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
    audio.volume = 0.01;
    audio.play().catch(() => {});
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
    if (customAudioUrl && customAudioUrl.startsWith('data:audio')) {
      try {
        htmlAudioElement = new Audio();
        htmlAudioElement.src = customAudioUrl;
        htmlAudioElement.loop = true;
        htmlAudioElement.volume = 1.0;
        htmlAudioElement.preload = 'auto';
        htmlAudioElement.load();
        
        const playPromise = htmlAudioElement.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Custom audio playback blocked or error, trying fallback tone:', err);
            playFallbackSiren();
          });
        }
      } catch (audioErr) {
        console.warn('Error initializing custom audio element:', audioErr);
        playFallbackSiren();
      }
    } else {
      playFallbackSiren();
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

function playFallbackSiren() {
  try {
    const defaultSirenDataUri = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1d';
    htmlAudioElement = new Audio(defaultSirenDataUri);
    htmlAudioElement.loop = true;
    htmlAudioElement.volume = 1.0;
    htmlAudioElement.preload = 'auto';
    htmlAudioElement.play().catch((err) => {
      console.warn('Fallback audio play deferred or blocked:', err);
    });
  } catch (e) {
    console.warn('Fallback siren error:', e);
  }
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

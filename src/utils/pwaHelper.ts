/**
 * PWA & Fullscreen Helper Utilities for Sahaya Sewa
 * Manages standalone app state, installation prompts, and fullscreen presentation.
 */

let deferredInstallPrompt: any = null;
const installListeners: Array<(canInstall: boolean) => void> = [];

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    notifyInstallListeners(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    notifyInstallListeners(false);
    try {
      localStorage.setItem('sahaya_pwa_installed', 'true');
    } catch {}
  });
}

function notifyInstallListeners(canInstall: boolean) {
  installListeners.forEach((fn) => {
    try {
      fn(canInstall);
    } catch {}
  });
}

export function subscribeToInstallPrompt(callback: (canInstall: boolean) => void): () => void {
  installListeners.push(callback);
  callback(Boolean(deferredInstallPrompt));
  return () => {
    const idx = installListeners.indexOf(callback);
    if (idx !== -1) installListeners.splice(idx, 1);
  };
}

/**
 * Returns true if the app is currently running as an installed PWA (no browser address bar).
 */
export function isRunningInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const isMatchMediaStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  const isMatchMediaFullscreen = window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches;
  const isNavigatorStandalone = (window.navigator as any)?.standalone === true;
  const isAndroidWebview = typeof document !== 'undefined' && document.referrer.includes('android-app://');
  
  return Boolean(isMatchMediaStandalone || isMatchMediaFullscreen || isNavigatorStandalone || isAndroidWebview);
}

/**
 * Returns true if the browser can trigger a 1-click install prompt.
 */
export function canPromptInstall(): boolean {
  return Boolean(deferredInstallPrompt);
}

/**
 * Triggers the native browser PWA install dialog.
 */
export async function triggerNativeInstallPrompt(): Promise<{ outcome: 'accepted' | 'dismissed' | 'unsupported' }> {
  if (!deferredInstallPrompt) {
    return { outcome: 'unsupported' };
  }

  try {
    await deferredInstallPrompt.prompt();
    const choiceResult = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    notifyInstallListeners(false);
    return { outcome: choiceResult?.outcome || 'accepted' };
  } catch (err) {
    console.warn('Install prompt failed:', err);
    return { outcome: 'unsupported' };
  }
}

/**
 * Returns true if the device is iOS (iPhone/iPad).
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

/**
 * Toggles browser fullscreen mode to hide browser toolbars.
 */
export async function toggleFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  try {
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen();
      }
      return true;
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
      return false;
    }
  } catch (err) {
    console.warn('Fullscreen toggle notice:', err);
    return false;
  }
}

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
}

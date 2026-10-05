/**
 * APK Download & Update Helper for Sahaya Sewa Mobile Application
 */

export interface AppVersionInfo {
  appName: string;
  versionName: string;
  versionCode: number;
  fileName: string;
  downloadPath: string;
  releaseNotes: string;
  updatedAt: string;
}

export const LATEST_APK_PATH = '/apk/sahayasewa-latest.apk';

/**
 * Checks if the current browser is running on an Android device
 */
export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined' || !navigator) return false;
  const userAgent = navigator.userAgent || (navigator as any).vendor || (window as any).opera || '';
  return /android/i.test(userAgent);
}

/**
 * Checks if the current browser is running on an iOS device (iPhone/iPad)
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined' || !navigator) return false;
  const ua = navigator.userAgent || '';
  const isApple = /iPad|iPhone|iPod/.test(ua);
  const isMacWithTouch = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return isApple || isMacWithTouch;
}

/**
 * Initiates direct 1-click APK download to the user's phone or computer.
 * Returns true if download was successfully initiated, or false if iOS (which requires PWA flow).
 */
export function triggerApkDownload(apkUrl: string = LATEST_APK_PATH): { success: boolean; isIOS: boolean } {
  if (isIOSDevice()) {
    return { success: false, isIOS: true };
  }

  try {
    const link = document.createElement('a');
    link.href = apkUrl;
    link.setAttribute('download', 'sahayasewa-latest.apk');
    link.setAttribute('target', '_blank');
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true, isIOS: false };
  } catch (error) {
    console.warn('Direct link click failed, falling back to window.location:', error);
    try {
      window.location.href = apkUrl;
      return { success: true, isIOS: false };
    } catch {
      return { success: false, isIOS: false };
    }
  }
}

/**
 * Fetches latest version details from the server/public folder
 */
export async function fetchLatestAppVersion(): Promise<AppVersionInfo | null> {
  try {
    const res = await fetch('/api/app/version');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.debug('Failed to fetch app version from API:', err);
  }
  return null;
}

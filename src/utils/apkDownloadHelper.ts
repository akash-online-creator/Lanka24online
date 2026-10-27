export interface LatestReleaseInfo {
  tagName?: string;
  apkDownloadUrl: string;
  name?: string;
  publishedAt?: string;
  body?: string;
}

export interface AppUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseTitle?: string;
  releaseNotes?: string;
  downloadUrl: string;
  publishedAt?: string;
}

export const CURRENT_APP_VERSION = '1.0.0';
export const FALLBACK_APK_DIRECT_URL = '';
export const RELEASES_PAGE_URL = '';

export function compareVersions(_vA: string, _vB: string): number {
  return 0;
}

export async function fetchLatestApkDownloadUrl(): Promise<LatestReleaseInfo> {
  return {
    apkDownloadUrl: '',
    tagName: CURRENT_APP_VERSION,
  };
}

export async function checkForAppUpdate(): Promise<AppUpdateInfo> {
  return {
    hasUpdate: false,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: CURRENT_APP_VERSION,
    downloadUrl: '',
  };
}

export async function triggerDirectApkDownload(_explicitUrl?: string): Promise<void> {
  return Promise.resolve();
}

export async function getAppUpdateSettings() {
  return {
    enabled: false,
    showOnWeb: false,
    targetVersion: CURRENT_APP_VERSION,
    releaseNotes: '',
    downloadUrl: '',
  };
}

export async function saveAppUpdateSettings(_settings: any) {
  return Promise.resolve();
}

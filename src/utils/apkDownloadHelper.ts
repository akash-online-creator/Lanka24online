/**

 * APK Direct Download & In-App Update Helper

 * Dynamically resolves the latest release APK from GitHub Releases for Lanka24online

 */

export const GITHUB_REPO_OWNER = 'akash-online-creator';

export const GITHUB_REPO_NAME = 'Lanka24online';

/**

 * The current version of the installed app.

 * Set to match the latest release and disable unwanted update alerts.

 */

export const CURRENT_APP_VERSION = 'v1.0.8';

export const FALLBACK_APK_DIRECT_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest/download/app-release.apk`;

export const RELEASES_PAGE_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;

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

/**

 * Compares two semantic version strings or tag names (e.g. 'v1.1' vs 'v1.0')

 * Returns 1 if vA > vB, -1 if vA < vB, 0 if equal

 */

export function compareVersions(vA: string, vB: string): number {

  const cleanA = (vA || '').replace(/^v/i, '').trim();

  const cleanB = (vA || '').replace(/^v/i, '').trim();


  if (!cleanA && !cleanB) return 0;

  if (!cleanA) return -1;

  if (!cleanB) return 1;

  const partsA = cleanA.split('.').map((p) => parseInt(p, 10) || 0);

  const partsB = cleanB.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {

    const numA = partsA[i] || 0;

    const numB = partsB[i] || 0;

    if (numA > numB) return 1;

    if (numA < numB) return -1;

  }

  return 0;

}

/**

 * Fetches the exact direct download URL for the latest APK from GitHub API

 */

export async function fetchLatestApkDownloadUrl(): Promise<LatestReleaseInfo> {

  try {

    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`, {

      headers: {

        Accept: 'application/vnd.github.v3+json',

      },

    });

    if (response.ok) {

      const data = await response.json();

      const assets = data.assets || [];

      

      const apkAsset = assets.find((a: any) => a.name && a.name.toLowerCase().endsWith('.apk')) || assets[0];

      

      return {

        tagName: data.tag_name || 'v1.0.8',

        apkDownloadUrl: apkAsset?.browser_download_url || `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download/${data.tag_name}/app-release.apk`,

        name: data.name || data.tag_name,

        publishedAt: data.published_at,

        body: data.body || '',

      };

    }

  } catch (err) {

    console.warn('Could not fetch latest release from GitHub API, falling back to direct release download:', err);

  }

  return {

    apkDownloadUrl: FALLBACK_APK_DIRECT_URL,

    tagName: 'v1.0.8',

  };

}

/**

 * Checks if a newer version of the application is available.

 * Set to always return hasUpdate: false to completely disable the popup.

 */

export async function checkForAppUpdate(): Promise<AppUpdateInfo> {
  try {
    const latest = await fetchLatestApkDownloadUrl();
    const latestTag = latest.tagName || CURRENT_APP_VERSION;
    const isNewer = compareVersions(latestTag, CURRENT_APP_VERSION) > 0;
    return {
      hasUpdate: isNewer,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: latestTag,
      releaseTitle: latest.name || ,
      releaseNotes: latest.body || '',
      downloadUrl: latest.apkDownloadUrl || FALLBACK_APK_DIRECT_URL,
      publishedAt: latest.publishedAt,
    };
  } catch (err) {
    console.warn('Update check failed:', err);
    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      downloadUrl: FALLBACK_APK_DIRECT_URL,
    };
  }
}

/**

 * Triggers direct APK download in the user's browser/phone

 */

export async function triggerDirectApkDownload(explicitUrl?: string): Promise<void> {

  try {

    const downloadUrl = explicitUrl || (await fetchLatestApkDownloadUrl()).apkDownloadUrl || FALLBACK_APK_DIRECT_URL;

    const link = document.createElement('a');

    link.href = downloadUrl;

    link.setAttribute('download', 'සහය සේවා.apk');

    link.setAttribute('target', '_blank');

    link.setAttribute('rel', 'noopener noreferrer');

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  } catch (err) {

    console.error('APK direct download trigger failed:', err);

    window.location.href = explicitUrl || FALLBACK_APK_DIRECT_URL;

  }

}

/**

 * Compatibility exports for AdminPanel update settings

 */

export async function getAppUpdateSettings() {

  const settings = {

    enabled: false,

    showOnWeb: false,

    targetVersion: 'v1.0.8',

    releaseNotes: '',

    downloadUrl: FALLBACK_APK_DIRECT_URL,

  };

  return settings;

}

if (typeof window !== 'undefined') {

  (window as any).getAppUpdateSettings = getAppUpdateSettings;

}

export async function saveAppUpdateSettings(_settings: any) {

  return Promise.resolve();

}

if (typeof window !== 'undefined') {

  (window as any).saveAppUpdateSettings = saveAppUpdateSettings;

}



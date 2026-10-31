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

export const GITHUB_REPO_OWNER = 'akash-online-creator';
export const GITHUB_REPO_NAME = 'Lanka24online';

export const CURRENT_APP_VERSION = 'v1.1.894';
export const FALLBACK_APK_DIRECT_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest/download/Support%20Service.apk`;
export const RELEASES_PAGE_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`;

export function compareVersions(vA: string, vB: string): number {
  const cleanA = vA.replace(/^v/, '').split('.').map(Number);
  const cleanB = vB.replace(/^v/, '').split('.').map(Number);
  const maxLen = Math.max(cleanA.length, cleanB.length);
  for (let i = 0; i < maxLen; i++) {
    const numA = cleanA[i] || 0;
    const numB = cleanB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

export async function fetchLatestApkDownloadUrl(): Promise<LatestReleaseInfo> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (res.ok) {
      const data = await res.json();
      const assets = Array.isArray(data.assets) ? data.assets : [];
      // Prioritize Support Service.apk, then any APK
      const apkAsset =
        assets.find((a: any) => a.name && a.name.toLowerCase().includes('support') && a.name.endsWith('.apk')) ||
        assets.find((a: any) => a.name && a.name.endsWith('.apk')) ||
        null;

      if (apkAsset && apkAsset.browser_download_url) {
        return {
          apkDownloadUrl: apkAsset.browser_download_url,
          tagName: data.tag_name || CURRENT_APP_VERSION,
          name: data.name || '1+ සහය සේවා (Support Service)',
          publishedAt: data.published_at,
          body: data.body || '',
        };
      }
    }
  } catch (err) {
    console.warn('Failed to fetch latest APK release from GitHub API:', err);
  }

  return {
    apkDownloadUrl: FALLBACK_APK_DIRECT_URL,
    tagName: CURRENT_APP_VERSION,
    name: '1+ සහය සේවා (Support Service)',
  };
}

export async function checkForAppUpdate(): Promise<AppUpdateInfo> {
  try {
    const latest = await fetchLatestApkDownloadUrl();
    const hasUpdate = Boolean(latest.tagName && compareVersions(latest.tagName, CURRENT_APP_VERSION) > 0);
    return {
      hasUpdate,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: latest.tagName || CURRENT_APP_VERSION,
      releaseTitle: latest.name,
      releaseNotes: latest.body,
      downloadUrl: latest.apkDownloadUrl || FALLBACK_APK_DIRECT_URL,
      publishedAt: latest.publishedAt,
    };
  } catch (err) {
    console.warn('Check for app update error:', err);
    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      downloadUrl: FALLBACK_APK_DIRECT_URL,
    };
  }
}

export async function triggerDirectApkDownload(explicitUrl?: string): Promise<void> {
  let targetUrl = explicitUrl;
  if (!targetUrl) {
    const info = await fetchLatestApkDownloadUrl();
    targetUrl = info.apkDownloadUrl || FALLBACK_APK_DIRECT_URL;
  }

  if (typeof window !== 'undefined' && targetUrl) {
    const link = document.createElement('a');
    link.href = targetUrl;
    link.setAttribute('download', 'Support Service.apk');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export async function getAppUpdateSettings() {
  return {
    enabled: true,
    showOnWeb: true,
    targetVersion: CURRENT_APP_VERSION,
    releaseNotes: 'නවතම ආරක්ෂක යාවත්කාලීන කිරීම් සහ දෝෂ නිවැරදි කිරීම්.',
    downloadUrl: FALLBACK_APK_DIRECT_URL,
  };
}

export async function saveAppUpdateSettings(_settings: any) {
  return Promise.resolve();
}

/**
 * APK Direct Download Helper
 * Dynamically resolves the latest release APK from GitHub Releases for Lanka24online
 */

export const GITHUB_REPO_OWNER = 'akash-online-creator';
export const GITHUB_REPO_NAME = 'Lanka24online';

export const FALLBACK_APK_DIRECT_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest/download/app-release.apk`;
export const RELEASES_PAGE_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;

export interface LatestReleaseInfo {
  tagName?: string;
  apkDownloadUrl: string;
  name?: string;
  publishedAt?: string;
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
      
      // Find asset that ends with .apk
      const apkAsset = assets.find((a: any) => a.name && a.name.toLowerCase().endsWith('.apk')) || assets[0];
      
      if (apkAsset && apkAsset.browser_download_url) {
        return {
          tagName: data.tag_name,
          apkDownloadUrl: apkAsset.browser_download_url,
          name: data.name || apkAsset.name,
          publishedAt: data.published_at,
        };
      }
    }
  } catch (err) {
    console.warn('Could not fetch latest release from GitHub API, falling back to direct release download:', err);
  }

  // Fallback to standard GitHub latest direct download endpoint
  return {
    apkDownloadUrl: FALLBACK_APK_DIRECT_URL,
  };
}

/**
 * Triggers direct APK download in the user's browser/phone
 */
export async function triggerDirectApkDownload(): Promise<void> {
  try {
    const info = await fetchLatestApkDownloadUrl();
    const downloadUrl = info.apkDownloadUrl || FALLBACK_APK_DIRECT_URL;

    // Trigger direct file download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'SahayaSewa.apk');
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('APK direct download trigger failed:', err);
    window.location.href = FALLBACK_APK_DIRECT_URL;
  }
}

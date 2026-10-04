/**
 * Device Fingerprint & Anti-Abuse Manager
 * 
 * Prevents multiple Rs. 100 welcome sign-up bonuses on the same physical phone / device,
 * even if multiple fake accounts or phone numbers are registered.
 */

// Generate a deterministic hash string from a string
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Generate client device fingerprint using Canvas, Audio, Screen, and Hardware cues
export async function getDeviceFingerprint(): Promise<string> {
  try {
    const components: string[] = [];

    // 1. Screen resolution & color depth
    if (typeof window !== 'undefined' && window.screen) {
      components.push(`${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);
      components.push(`avail:${window.screen.availWidth}x${window.screen.availHeight}`);
    }

    // 2. Navigator properties
    if (typeof navigator !== 'undefined') {
      components.push(navigator.userAgent || '');
      components.push(navigator.language || '');
      components.push(String(navigator.hardwareConcurrency || 4));
      components.push(String((navigator as any).deviceMemory || 4));
    }

    // 3. Timezone offset
    components.push(String(new Date().getTimezoneOffset()));

    // 4. Canvas Fingerprinting
    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.textBaseline = 'top';
          ctx.font = '14px "Arial"';
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = '#f60';
          ctx.fillRect(125, 1, 62, 20);
          ctx.fillStyle = '#069';
          ctx.fillText('SahayaSewa,🔒100Rs', 2, 15);
          ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
          ctx.fillText('SahayaSewa,🔒100Rs', 4, 17);
          components.push(canvas.toDataURL());
        }
      } catch (e) {
        components.push('canvas_error');
      }
    }

    const rawString = components.join('###');
    return 'dev_' + simpleHash(rawString);
  } catch (err) {
    return 'dev_fallback_' + Math.floor(Math.random() * 1000000);
  }
}

const DEVICE_BONUS_CLAIMED_KEY = 'sahaya_device_bonus_claimed_v1';

/**
 * Checks if the current physical device has already received the 1-time Rs. 100 Sign-Up Bonus.
 */
export async function hasDeviceClaimedWelcomeBonus(): Promise<boolean> {
  const localClaim = localStorage.getItem(DEVICE_BONUS_CLAIMED_KEY);
  if (localClaim === 'true') {
    return true;
  }
  const deviceId = await getDeviceFingerprint();
  const claimedDevicesStr = localStorage.getItem('sahaya_claimed_device_ids') || '[]';
  try {
    const claimedDevices: string[] = JSON.parse(claimedDevicesStr);
    return claimedDevices.includes(deviceId);
  } catch {
    return false;
  }
}

/**
 * Marks the current physical device as having received the Rs. 100 Sign-Up Bonus.
 */
export async function markDeviceClaimedWelcomeBonus(userId: string): Promise<void> {
  localStorage.setItem(DEVICE_BONUS_CLAIMED_KEY, 'true');
  const deviceId = await getDeviceFingerprint();
  const claimedDevicesStr = localStorage.getItem('sahaya_claimed_device_ids') || '[]';
  try {
    const claimedDevices: string[] = JSON.parse(claimedDevicesStr);
    if (!claimedDevices.includes(deviceId)) {
      claimedDevices.push(deviceId);
    }
    localStorage.setItem('sahaya_claimed_device_ids', JSON.stringify(claimedDevices));
    localStorage.setItem(`sahaya_bonus_user_${deviceId}`, userId);
  } catch {
    // Ignore JSON error
  }
}

import { User } from '../types';

export interface StoredDevicePinData {
  userId: string;
  nicNumber: string;
  userName: string;
  userPhoto?: string;
  userPhone?: string;
  deviceId: string;
  pinHash: string;
  salt: string;
  deviceSessionToken: string;
  createdAt: string;
}

const DEVICE_ID_KEY = 'sahaya_device_uuid';
const DEVICE_PIN_KEY = 'sahaya_device_pin_record';

/**
 * Generates or retrieves a unique, persistent identifier for this specific device/browser.
 */
export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id || id.trim().length < 8) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        id = crypto.randomUUID();
      } else {
        id = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      }
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'default-browser-device';
  }
}

/**
 * Computes a SHA-256 hash of the 4-digit PIN combined with a random salt.
 */
export async function hashPinWithSalt(pin: string, salt: string): Promise<string> {
  const combined = `${salt}::${pin.trim()}::sahaya_pin_secret_v1`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple hash
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}_${salt}`;
}

/**
 * Retrieves the stored PIN record on this specific device.
 */
export function getStoredDevicePin(): StoredDevicePinData | null {
  try {
    const data = localStorage.getItem(DEVICE_PIN_KEY);
    if (!data) return null;
    const parsed: StoredDevicePinData = JSON.parse(data);
    const currentDeviceId = getOrCreateDeviceId();
    if (!parsed || parsed.deviceId !== currentDeviceId || !parsed.pinHash || !parsed.userId) {
      return null;
    }
    return parsed;
  } catch (e) {
    console.warn('Error reading device PIN record:', e);
    return null;
  }
}

/**
 * Saves a 4-digit PIN for the user on this device.
 * Returns the generated deviceId and deviceSessionToken to be saved in Firestore/User profile.
 */
export async function saveDevicePin(
  user: User,
  pin: string
): Promise<{ deviceId: string; deviceSessionToken: string }> {
  if (!user) throw new Error('User is required to save device PIN');
  const cleanPin = (pin || '').trim();
  if (!/^\d{4}$/.test(cleanPin)) {
    throw new Error('PIN අංකය අංක 4කින් පමණක් සමන්විත විය යුතුය (Must be 4 digits)');
  }

  const deviceId = getOrCreateDeviceId();
  const salt = Math.random().toString(36).substring(2, 12);
  const pinHash = await hashPinWithSalt(cleanPin, salt);
  const deviceSessionToken = `token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const pinRecord: StoredDevicePinData = {
    userId: user.id || user.userId || user.nicNumber,
    nicNumber: user.nicNumber || user.userId,
    userName: user?.name || 'පරිශීලක',
    userPhoto: user.photoUrl || user.facePhotoUrl,
    userPhone: user.phone || user.whatsappNumber,
    deviceId,
    pinHash,
    salt,
    deviceSessionToken,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(DEVICE_PIN_KEY, JSON.stringify(pinRecord));
  return { deviceId, deviceSessionToken };
}

/**
 * Clears the PIN configuration from this device.
 */
export function clearDevicePin(): void {
  try {
    localStorage.removeItem(DEVICE_PIN_KEY);
  } catch (e) {
    console.warn('Error clearing device PIN:', e);
  }
}

export interface VerifyPinResult {
  success: boolean;
  reason?: 'no_pin' | 'wrong_pin' | 'device_mismatch' | 'user_blocked' | 'user_not_found';
  message?: string;
  matchedUser?: User;
}

/**
 * Verifies the entered 4-digit PIN.
 * If user switched to another device, automatically resets this device's PIN and informs the user.
 */
export async function verifyDevicePin(
  enteredPin: string,
  allUsers: User[],
  fetchLatestUserFn?: (userNicOrId: string) => Promise<User | null>
): Promise<VerifyPinResult> {
  const stored = getStoredDevicePin();
  if (!stored) {
    return {
      success: false,
      reason: 'no_pin',
      message: 'මෙම Device එක සඳහා PIN අංකයක් සකසා නොමැත.',
    };
  }

  const cleanPin = (enteredPin || '').trim();
  if (!/^\d{4}$/.test(cleanPin)) {
    return {
      success: false,
      reason: 'wrong_pin',
      message: 'කරුණාකර අංක 4ක PIN අංකයක් ඇතුළත් කරන්න.',
    };
  }

  // Find user locally first
  let user = allUsers.find(
    (u) =>
      u &&
      (u.id === stored.userId ||
        u.userId === stored.userId ||
        u.nicNumber === stored.nicNumber ||
        (stored.nicNumber && u.nicNumber && u.nicNumber.toUpperCase() === stored.nicNumber.toUpperCase()))
  );

  // If async fetcher provided, try fetching latest to check if activeDeviceId changed remotely
  if (fetchLatestUserFn) {
    try {
      const latest = await fetchLatestUserFn(stored.nicNumber || stored.userId);
      if (latest) user = latest;
    } catch (e) {
      console.warn('Latest user fetch during PIN verify notice:', e);
    }
  }

  if (!user) {
    return {
      success: false,
      reason: 'user_not_found',
      message: 'පරිශීලක ගිණුම හමු නොවීය. කරුණාකර හැඳුනුම්පත් අංකය මඟින් ලොග් වන්න.',
    };
  }

  if (user.status === 'blocked' || user.isBlocked) {
    return {
      success: false,
      reason: 'user_blocked',
      message: 'මෙම ගිණුම පරිපාලක විසින් අවහිර කර ඇත.',
    };
  }

  const currentDeviceId = getOrCreateDeviceId();

  // 🚨 CRITICAL RULE: If user logged in from another device, reset PIN on this device!
  if (user.activeDeviceId && user.activeDeviceId !== currentDeviceId) {
    clearDevicePin();
    return {
      success: false,
      reason: 'device_mismatch',
      message:
        '⚠️ ඔබ වෙනත් Device එකකින් Login වී ඇති බැවින් මෙම Device එකෙහි PIN අංකය Reset විය. කරුණාකර ඔබගේ හැඳුනුම්පත් අංකය හා මුරපදය මඟින් නැවත ඇතුල් වන්න.',
    };
  }

  // Verify PIN Hash
  const computedHash = await hashPinWithSalt(cleanPin, stored.salt);
  if (computedHash !== stored.pinHash) {
    return {
      success: false,
      reason: 'wrong_pin',
      message: 'ඇතුළත් කළ PIN අංකය වැරදියි. කරුණාකර නැවත උත්සාහ කරන්න.',
    };
  }

  return {
    success: true,
    matchedUser: user,
  };
}

/**
 * Verifies if the entered PIN matches the device PIN for the current user.
 * Returns { success: boolean; message?: string; needsSetup?: boolean; deviceMismatch?: boolean }
 */
export async function verifyCurrentUserPin(
  enteredPin: string,
  currentUser: User | null
): Promise<{ success: boolean; message?: string; needsSetup?: boolean; deviceMismatch?: boolean }> {
  const cleanPin = (enteredPin || '').trim();
  if (!cleanPin || !/^\d{4}$/.test(cleanPin)) {
    return { success: false, message: 'කරුණාකර අංක 4ක PIN අංකයක් ඇතුළත් කරන්න (Must be 4 digits).' };
  }

  const stored = getStoredDevicePin();
  if (!stored) {
    return { success: false, needsSetup: true, message: 'මෙම Device එක සඳහා තවමත් PIN අංකයක් සකසා නොමැත.' };
  }

  const currentDeviceId = getOrCreateDeviceId();
  if (currentUser?.activeDeviceId && currentUser.activeDeviceId !== currentDeviceId) {
    clearDevicePin();
    return {
      success: false,
      deviceMismatch: true,
      message: '⚠️ ඔබ වෙනත් Device එකකින් Login වී ඇති බැවින් මෙම Device එකෙහි PIN අංකය Reset විය. කරුණාකර නැවත PIN එකක් සකසන්න.',
    };
  }

  const computedHash = await hashPinWithSalt(cleanPin, stored.salt);
  if (computedHash !== stored.pinHash) {
    return {
      success: false,
      message: 'ඇතුළත් කළ PIN අංකය වැරදියි. කරුණාකර නැවත උත්සාහ කරන්න.',
    };
  }

  return { success: true };
}

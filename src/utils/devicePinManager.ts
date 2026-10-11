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
 * මෙම Device එක/Browser එක සඳහා අනන්‍ය වූ ස්ථිර Device ID එකක් ජනනය කිරීම හෝ ලබා ගැනීම.
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
 * අංක 4ක PIN අංකය Random Salt එකක් සමඟ SHA-256 මඟින් ආරක්ෂිතව Hash කිරීම.
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
  // Fallback hash (Crypto Subtle නොමැති පැරණි බ්‍රවුසර සඳහා)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}_${salt}`;
}

/**
 * මෙම Device එක තුළ LocalStorage හි සුරකින ලද PIN දත්ත වාර්තාව ලබා ගැනීම.
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
 * මෙම Device එක සඳහා පරිශීලකයාගේ අංක 4ක PIN අංකය සුරැකීම.
 * Firestore හි සටහන් කිරීම සඳහා Device ID එක සහ Session Token එක ආපසු ලබා දෙයි.
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
 * මෙම Device එකෙහි ඇති PIN දත්ත වාර්තාව ඉවත් කිරීම (Reset).
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
 * PIN Login View එකේදී ඇතුළත් කළ අංක 4ක PIN අංකය සත්‍යාපනය කිරීම.
 * පරිශීලකයා වෙනත් දුරකථනයකින් Login වී ඇත්නම්, මෙම ඩිවයිස් එකේ PIN එක Reset කර NIC සහ මුරපදය ඉල්ලයි.
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

  // 1. PIN Hash එක නිවැරදි දැයි ප්‍රථමයෙන් පරීක්ෂා කිරීම
  const computedHash = await hashPinWithSalt(cleanPin, stored.salt);
  if (computedHash !== stored.pinHash) {
    return {
      success: false,
      reason: 'wrong_pin',
      message: 'ඇතුළත් කළ PIN අංකය වැරදියි. කරුණාකර නැවත උත්සාහ කරන්න.',
    };
  }

  // 2. අදාළ පරිශීලකයා හඳුනා ගැනීම
  let user = allUsers.find(
    (u) =>
      u &&
      (u.id === stored.userId ||
        u.userId === stored.userId ||
        u.nicNumber === stored.nicNumber ||
        (stored.nicNumber && u.nicNumber && u.nicNumber.toUpperCase() === stored.nicNumber.toUpperCase()))
  );

  // Firestore වෙතින් අලුත්ම User දත්ත ලබා ගැනීමට උත්සාහ කිරීම
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

  // 3. ⚠️ වෙනත් දුරකථනයකින් Login වී ඇත්නම්, මෙම ඩිවයිස් එකේ PIN එක ඉවත් කර NIC/මුරපදය ඉල්ලීම
  if (user.activeDeviceId && user.activeDeviceId !== currentDeviceId) {
    clearDevicePin();
    return {
      success: false,
      reason: 'device_mismatch',
      message:
        '⚠️ ඔබගේ ගිණුමට වෙනත් Device එකකින් Login වී ඇති බැවින් මෙම Device එකෙහි PIN අංකය ඉවත් විය. කරුණාකර ඔබගේ හැඳුනුම්පත් අංකය හා මුරපදය මඟින් නැවත ඇතුල් වන්න.',
    };
  }

  // 4. මෙම Device එකෙහිම වලංගු PIN එකක් නම් Login වීමට ඉඩ දීම
  if (stored.deviceId === currentDeviceId) {
    return {
      success: true,
      matchedUser: user,
    };
  }

  return {
    success: true,
    matchedUser: user,
  };
}

/**
 * යෙදුම තුළදී (උදා: Red Alert හෝ වෙනත් වැදගත් අවස්ථාවල) PIN අංකය සත්‍යාපනය කිරීම.
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

  // 1. PIN Hash අගය නිවැරදි දැයි තහවුරු කිරීම
  const computedHash = await hashPinWithSalt(cleanPin, stored.salt);
  if (computedHash !== stored.pinHash) {
    return {
      success: false,
      message: 'ඇතුළත් කළ PIN අංකය වැරදියි. කරුණාකර නැවත උත්සාහ කරන්න.',
    };
  }

  const currentDeviceId = getOrCreateDeviceId();

  // 2. වෙනත් Device එකකින් Login වී ඇති අවස්ථාවක් නම් Reset කිරීම
  // මෙම ඩිවයිස් එකෙහිම වලංගු PIN එකක් පවතී නම් (stored.deviceId === currentDeviceId), memory එකෙහි ඇති පැරණි state එකක් නිසා PIN එක මැකී යාම වළක්වයි
  if (
    currentUser?.activeDeviceId &&
    currentUser.activeDeviceId !== currentDeviceId &&
    stored.deviceId !== currentDeviceId
  ) {
    clearDevicePin();
    return {
      success: false,
      deviceMismatch: true,
      message: '⚠️ ඔබ වෙනත් Device එකකින් Login වී ඇති බැවින් මෙම Device එකෙහි PIN අංකය Reset විය. කරුණාකර නැවත PIN එකක් සකසන්න.',
    };
  }

  // 3. මෙම Device එකෙහි PIN එක නිවැරදි නම්
  if (stored.deviceId === currentDeviceId) {
    return { success: true };
  }

  return { success: true };
}

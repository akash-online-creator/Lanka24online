import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SystemSettings {
  enableQrPay: boolean;
  maintenanceMode: boolean;
  enableDisasterSirens: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  enableQrPay: true,
  maintenanceMode: false,
  enableDisasterSirens: true,
};

const STORAGE_KEY = 'sahaya_system_settings';

/**
 * LocalStorage Cache Helper (Zero-delay and Offline fallback)
 */
function getCachedSettings(): SystemSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('[SystemSettings] Error reading cache:', e);
  }
  return DEFAULT_SETTINGS;
}

function saveCachedSettings(settings: SystemSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('sahaya:system_settings_updated', { detail: settings }));
  } catch (e) {
    console.warn('[SystemSettings] Error saving cache:', e);
  }
}

/**
 * Real-time listener for System Settings (QR Pay toggle ආදිය සඳහා)
 */
export function subscribeToSystemSettings(callback: (settings: SystemSettings) => void) {
  // 1. තිරය මත ක්ෂණිකව පෙන්වීමට Cache එකෙන් මුලින්ම ලබා දීම
  const cached = getCachedSettings();
  callback(cached);

  if (typeof window === 'undefined' || !db) {
    return () => {};
  }

  // 2. යෙදුම තුළ සිදුවන ක්ෂණික වෙනස්කම්වලට සවන් දීම
  const handleLocalUpdate = (e: any) => {
    if (e.detail) {
      callback(e.detail);
    }
  };
  window.addEventListener('sahaya:system_settings_updated', handleLocalUpdate);

  // 3. Real-time Firestore sync
  try {
    const settingsDocRef = doc(db, 'system_settings', 'general');
    const unsubscribe = onSnapshot(
      settingsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const merged: SystemSettings = { ...DEFAULT_SETTINGS, ...snapshot.data() };
          saveCachedSettings(merged);
          callback(merged);
        } else {
          callback(cached);
        }
      },
      (error) => {
        console.warn('System settings Firestore sync notice (falling back to cache):', error);
        callback(getCachedSettings());
      }
    );

    return () => {
      window.removeEventListener('sahaya:system_settings_updated', handleLocalUpdate);
      unsubscribe();
    };
  } catch (err) {
    console.error('Subscription error in systemSettingsManager:', err);
    return () => {
      window.removeEventListener('sahaya:system_settings_updated', handleLocalUpdate);
    };
  }
}

/**
 * Single-fetch for System Settings
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  const cached = getCachedSettings();
  if (typeof window === 'undefined' || !db) {
    return cached;
  }

  try {
    const settingsDocRef = doc(db, 'system_settings', 'general');
    const snapshot = await getDoc(settingsDocRef);
    if (snapshot.exists()) {
      const merged: SystemSettings = { ...DEFAULT_SETTINGS, ...snapshot.data() };
      saveCachedSettings(merged);
      return merged;
    }
  } catch (error) {
    console.warn('Failed to fetch system settings from Firestore, using cache:', error);
  }
  return cached;
}

/**
 * Admin Updates System Settings (QR Pay සක්‍රිය/අක්‍රිය කිරීම)
 * Supports both Firestore and instant LocalStorage persistence
 */
export async function updateSystemSettings(
  newSettings: Partial<SystemSettings>, 
  adminUid?: string | null
): Promise<SystemSettings> {
  const current = getCachedSettings();
  // undefined වීම වැළැක්වීම සඳහා ආරක්ෂිත fallback අගයක් යෙදීම
  const safeAdminId = adminUid || 'admin_user';
  const nowIso = new Date().toISOString();

  const updated: SystemSettings = {
    ...current,
    ...newSettings,
    updatedAt: nowIso,
    updatedBy: safeAdminId,
  };

  // 1. ප්‍රථමයෙන් ක්ෂණිකව LocalStorage තුළ සුරැකීම (බටනය වහාම Off වේ)
  saveCachedSettings(updated);

  // 2. Cloud Firestore සමඟ සමමුහුර්ත කිරීම (undefined fields සම්පූර්ණයෙන්ම ඉවත් කර)
  if (db) {
    try {
      const settingsDocRef = doc(db, 'system_settings', 'general');
      const cleanPayload: Record<string, any> = {
        updatedAt: nowIso,
        updatedBy: safeAdminId,
      };

      if (newSettings.enableQrPay !== undefined) cleanPayload.enableQrPay = Boolean(newSettings.enableQrPay);
      if (newSettings.maintenanceMode !== undefined) cleanPayload.maintenanceMode = Boolean(newSettings.maintenanceMode);
      if (newSettings.enableDisasterSirens !== undefined) cleanPayload.enableDisasterSirens = Boolean(newSettings.enableDisasterSirens);

      await setDoc(settingsDocRef, cleanPayload, { merge: true });
    } catch (error: any) {
      console.warn('Firestore settings sync notice:', error);
      throw error;
    }
  }

  return updated;
}

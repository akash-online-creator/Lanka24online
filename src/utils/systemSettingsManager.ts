import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SystemSettings {
  enableQrPay: boolean;
  qrPayExplicitlyEnabledByAdmin?: boolean;
  enableDemoLogin: boolean;
  maintenanceMode: boolean;
  enableDisasterSirens: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  enableQrPay: false,
  qrPayExplicitlyEnabledByAdmin: false,
  enableDemoLogin: false,
  maintenanceMode: false,
  enableDisasterSirens: true,
};

const STORAGE_KEY = 'sahaya_system_settings_v2';

export function getCachedSettings(): SystemSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        enableQrPay: Boolean(parsed.enableQrPay && parsed.qrPayExplicitlyEnabledByAdmin),
      };
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

export function subscribeToSystemSettings(callback: (settings: SystemSettings) => void) {
  const cached = getCachedSettings();
  callback(cached);

  if (typeof window === 'undefined') {
    return () => {};
  }
  if (!db) {
    return () => {};
  }

  const handleLocalUpdate = (e: any) => {
    if (e.detail) {
      callback(e.detail);
    }
  };
  window.addEventListener('sahaya:system_settings_updated', handleLocalUpdate);

  try {
    const settingsDocRef = doc(db, 'system_settings', 'general');
    const unsubscribe = onSnapshot(
      settingsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data: any = snapshot.data() ? snapshot.data() : {};
          const merged: SystemSettings = {
            ...DEFAULT_SETTINGS,
            ...data,
            enableQrPay: Boolean(data.enableQrPay && data.qrPayExplicitlyEnabledByAdmin),
          };
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

export async function getSystemSettings() {
  const cached = getCachedSettings();
  if (typeof window === 'undefined') {
    return cached;
  }
  if (!db) {
    return cached;
  }

  try {
    const settingsDocRef = doc(db, 'system_settings', 'general');
    const snapshot = await getDoc(settingsDocRef);
    if (snapshot.exists()) {
      const data: any = snapshot.data() ? snapshot.data() : {};
      const merged: SystemSettings = {
        ...DEFAULT_SETTINGS,
        ...data,
        enableQrPay: Boolean(data.enableQrPay && data.qrPayExplicitlyEnabledByAdmin),
      };
      saveCachedSettings(merged);
      return merged;
    }
  } catch (error) {
    console.warn('Failed to fetch system settings from Firestore, using cache:', error);
  }
  return cached;
}

export async function updateSystemSettings(
  newSettings: any,
  adminUid?: any
) {
  const current = getCachedSettings();
  const safeAdminId = adminUid ? String(adminUid) : 'admin_user';
  const nowIso = new Date().toISOString();

  const nextEnableQrPay = newSettings.enableQrPay !== undefined ? Boolean(newSettings.enableQrPay) : current.enableQrPay;

  const updated: SystemSettings = {
    ...current,
    ...newSettings,
    enableQrPay: nextEnableQrPay,
    qrPayExplicitlyEnabledByAdmin: nextEnableQrPay,
    updatedAt: nowIso,
    updatedBy: safeAdminId,
  };

  saveCachedSettings(updated);

  if (db) {
    try {
      const settingsDocRef = doc(db, 'system_settings', 'general');
      const cleanPayload: any = {
        updatedAt: nowIso,
        updatedBy: safeAdminId,
      };

      if (newSettings.enableQrPay !== undefined) {
        cleanPayload.enableQrPay = Boolean(newSettings.enableQrPay);
        cleanPayload.qrPayExplicitlyEnabledByAdmin = Boolean(newSettings.enableQrPay);
      }
      if (newSettings.enableDemoLogin !== undefined) cleanPayload.enableDemoLogin = Boolean(newSettings.enableDemoLogin);
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

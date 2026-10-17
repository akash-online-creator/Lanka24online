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

// Real-time Settings Listen කිරීම
export function subscribeToSystemSettings(callback: (settings: SystemSettings) => void) {
  try {
    const settingsDocRef = doc(db, 'system_settings', 'general');
    return onSnapshot(
      settingsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback({ ...DEFAULT_SETTINGS, ...snapshot.data() } as SystemSettings);
        } else {
          callback(DEFAULT_SETTINGS);
        }
      },
      (error) => {
        console.warn('System settings fetch error, using defaults:', error);
        callback(DEFAULT_SETTINGS);
      }
    );
  } catch (err) {
    console.error('Subscription error in systemSettingsManager:', err);
    callback(DEFAULT_SETTINGS);
    return () => {};
  }
}

// Single-fetch
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const settingsDocRef = doc(db, 'system_settings', 'general');
    const snapshot = await getDoc(settingsDocRef);
    if (snapshot.exists()) {
      return { ...DEFAULT_SETTINGS, ...snapshot.data() } as SystemSettings;
    }
  } catch (error) {
    console.warn('Failed to get system settings, using default:', error);
  }
  return DEFAULT_SETTINGS;
}

// Admin විසින් Settings Update කිරීම (QR Pay On/Off)
export async function updateSystemSettings(newSettings: Partial<SystemSettings>, adminUid: string) {
  const settingsDocRef = doc(db, 'system_settings', 'general');
  await setDoc(
    settingsDocRef,
    {
      ...newSettings,
      updatedAt: new Date().toISOString(),
      updatedBy: adminUid,
    },
    { merge: true }
  );
}

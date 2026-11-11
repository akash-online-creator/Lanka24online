import { useState, useEffect } from 'react';

const DATA_SAVER_KEY = 'sahaya_data_saver';
const DATA_SAVER_EVENT = 'sahaya_data_saver_changed';

/**
 * Check if Data Saver mode is enabled
 */
export const isDataSaverEnabled = (): boolean => {
  try {
    return localStorage.getItem(DATA_SAVER_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Set Data Saver mode and dispatch event
 */
export const setDataSaverEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(DATA_SAVER_KEY, enabled ? 'true' : 'false');
    if (typeof document !== 'undefined') {
      if (enabled) {
        document.documentElement.dataset.dataSaver = 'true';
      } else {
        delete document.documentElement.dataset.dataSaver;
      }
    }
    window.dispatchEvent(new CustomEvent(DATA_SAVER_EVENT, { detail: { enabled } }));
  } catch (err) {
    console.warn('Failed to save data saver setting:', err);
  }
};

/**
 * React Hook to subscribe and toggle Data Saver mode
 */
export const useDataSaver = (): [boolean, (enabled: boolean) => void] => {
  const [dataSaver, setDataSaverState] = useState<boolean>(() => isDataSaverEnabled());

  useEffect(() => {
    // Initial sync with DOM dataset
    if (typeof document !== 'undefined') {
      if (dataSaver) {
        document.documentElement.dataset.dataSaver = 'true';
      } else {
        delete document.documentElement.dataset.dataSaver;
      }
    }

    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.enabled === 'boolean') {
        setDataSaverState(customEvent.detail.enabled);
      } else {
        setDataSaverState(isDataSaverEnabled());
      }
    };

    window.addEventListener(DATA_SAVER_EVENT, handleEvent);
    window.addEventListener('storage', handleEvent);

    return () => {
      window.removeEventListener(DATA_SAVER_EVENT, handleEvent);
      window.removeEventListener('storage', handleEvent);
    };
  }, [dataSaver]);

  const toggleDataSaver = (enabled: boolean) => {
    setDataSaverEnabled(enabled);
    setDataSaverState(enabled);
  };

  return [dataSaver, toggleDataSaver];
};

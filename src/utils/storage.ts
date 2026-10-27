// Safe in-memory and LocalStorage wrapper for restrictive WebViews and browsers
const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('LocalStorage read restricted, falling back to memory:', e);
    }
    return memoryStorage[key] || null;
  },

  setItem: (key: string, value: string): void => {
    memoryStorage[key] = value;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('LocalStorage write restricted, saved to memory:', e);
    }
  },

  removeItem: (key: string): void => {
    delete memoryStorage[key];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('LocalStorage remove restricted:', e);
    }
  }
};

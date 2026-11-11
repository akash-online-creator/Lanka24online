import localforage from 'localforage';

/**
 * 💾 Sahaya Sewa High-Capacity IndexedDB Storage Manager (LocalForage)
 * Replaces restrictive localStorage (~5MB) with high-capacity browser IndexedDB (50MB - 500MB+).
 * Features:
 * - Asynchronous non-blocking storage for large payloads (posts, offline maps, cached media, bulletins)
 * - In-memory synchronous cache for lightning-fast synchronous reads (startup auth & themes)
 * - Automatic quota estimation via navigator.storage
 */

const STORAGE_STORE_NAME = 'sahaya_sewa_indexed_store';

// Configure localforage instance
localforage.config({
  name: 'SahayaSewaDB',
  storeName: STORAGE_STORE_NAME,
  description: '1+ සහය සේවා High-Capacity IndexedDB Cache (50MB - 500MB)',
  driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
});

// Fast in-memory sync mirror for instant synchronous checks
const syncCache = new Map<string, any>();
let isInitialized = false;

// Preload common keys from IndexedDB into synchronous memory cache
export async function initIndexedDbStorage(): Promise<void> {
  if (isInitialized) return;
  try {
    const keys = await localforage.keys();
    for (const key of keys) {
      const val = await localforage.getItem(key);
      if (val !== null && val !== undefined) {
        syncCache.set(key, val);
      }
    }
    isInitialized = true;
    console.log(`✅ IndexedDB Storage Initialized (${keys.length} items preloaded in RAM)`);
  } catch (err) {
    console.warn('⚠️ IndexedDB initialization notice:', err);
    isInitialized = true;
  }
}

// Fire preloading immediately
if (typeof window !== 'undefined') {
  initIndexedDbStorage().catch(() => {});
}

/**
 * Get item from IndexedDB (Async)
 */
export async function getIndexedItem<T = any>(key: string): Promise<T | null> {
  try {
    const value = await localforage.getItem<T>(key);
    if (value !== null && value !== undefined) {
      syncCache.set(key, value);
      return value;
    }
    // Fallback to sync cache or localStorage migration
    if (syncCache.has(key)) {
      return syncCache.get(key) as T;
    }
    if (typeof localStorage !== 'undefined') {
      const legacy = localStorage.getItem(key);
      if (legacy !== null) {
        try {
          const parsed = JSON.parse(legacy);
          await setIndexedItem(key, parsed);
          return parsed;
        } catch {
          await setIndexedItem(key, legacy);
          return legacy as unknown as T;
        }
      }
    }
    return null;
  } catch (err) {
    console.warn(`IndexedDB read error for ${key}:`, err);
    return syncCache.has(key) ? (syncCache.get(key) as T) : null;
  }
}

/**
 * Set item in IndexedDB (Async)
 */
export async function setIndexedItem<T = any>(key: string, value: T): Promise<T> {
  syncCache.set(key, value);
  try {
    await localforage.setItem(key, value);
    return value;
  } catch (err) {
    console.warn(`IndexedDB write error for ${key}:`, err);
    return value;
  }
}

/**
 * Remove item from IndexedDB
 */
export async function removeIndexedItem(key: string): Promise<void> {
  syncCache.delete(key);
  try {
    await localforage.removeItem(key);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn(`IndexedDB remove error for ${key}:`, err);
  }
}

/**
 * Synchronous read from RAM mirror (for instant React state initializers)
 */
export function getIndexedItemSync<T = any>(key: string, fallback: T | null = null): T | null {
  if (syncCache.has(key)) {
    return syncCache.get(key) as T;
  }
  if (typeof localStorage !== 'undefined') {
    const legacy = localStorage.getItem(key);
    if (legacy !== null) {
      try {
        const parsed = JSON.parse(legacy);
        syncCache.set(key, parsed);
        return parsed as T;
      } catch {
        syncCache.set(key, legacy);
        return legacy as unknown as T;
      }
    }
  }
  return fallback;
}

/**
 * Synchronous write to RAM mirror + async flush to IndexedDB
 */
export function setIndexedItemSync<T = any>(key: string, value: T): void {
  syncCache.set(key, value);
  setIndexedItem(key, value).catch(() => {});
}

/**
 * Estimate browser storage quota & usage
 */
export async function getStorageQuotaEstimate(): Promise<{
  usageMb: number;
  quotaMb: number;
  percentage: number;
  type: string;
}> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usageMb = Number(((estimate.usage || 0) / (1024 * 1024)).toFixed(2));
      const quotaMb = Number(((estimate.quota || 0) / (1024 * 1024)).toFixed(2));
      const percentage = quotaMb > 0 ? Number(((usageMb / quotaMb) * 100).toFixed(1)) : 0;
      return {
        usageMb,
        quotaMb,
        percentage,
        type: 'IndexedDB (LocalForage)',
      };
    }
  } catch {}
  return {
    usageMb: 1.2,
    quotaMb: 500,
    percentage: 0.24,
    type: 'IndexedDB (Standard)',
  };
}

export default {
  getItem: getIndexedItem,
  setItem: setIndexedItem,
  removeItem: removeIndexedItem,
  getItemSync: getIndexedItemSync,
  setItemSync: setIndexedItemSync,
  getStorageQuotaEstimate,
};

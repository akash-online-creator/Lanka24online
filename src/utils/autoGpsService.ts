/**
 * Sahaya Sewa Auto GPS & Pre-fetch Service
 * 
 * Automatically captures and caches device GPS location on user interaction (clicks/taps)
 * with smart throttling to protect battery life and prevent device overheating.
 * Enables zero-delay instant location readiness for SOS Tracking and Red Alerts.
 */

export interface AutoGpsLocation {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
  source: 'gps' | 'flutter_native' | 'cache';
}

const STORAGE_KEY = 'sahaya_last_known_location';
const CURRENT_LOC_STORAGE_KEY = 'sahaya_current_location';
const THROTTLE_INTERVAL_MS = 90 * 1000; // තත්පර 90ක ස්මාර්ට් කාල පරතරය (Battery Safe Throttling)

let memoryCache: AutoGpsLocation | null = null;
let isFetching = false;
let isInitialized = false;

/**
 * Synchronously retrieves the last known GPS location from Memory or LocalStorage.
 * Guarantees 0ms immediate availability for SOS and Red Alert modals.
 */
export function getLastKnownLocation(): AutoGpsLocation | null {
  if (memoryCache) {
    return memoryCache;
  }

  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(CURRENT_LOC_STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: any = JSON.parse(raw);
      const ts = parsed.timestamp || parsed.updatedAt || Date.now();
      // පසුගිය පැය 24 තුළ ලබාගත් එකක් නම් වලංගුයි
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number' && Date.now() - ts < 24 * 60 * 60 * 1000) {
        memoryCache = {
          lat: parsed.lat,
          lng: parsed.lng,
          accuracy: parsed.accuracy || 15,
          speed: parsed.speed ?? null,
          heading: parsed.heading ?? null,
          timestamp: ts,
          source: parsed.source || 'cache',
        };
        return memoryCache;
      }
    }
  } catch (err) {
    console.warn('[AutoGps] Error reading cached location:', err);
  }

  return null;
}

/**
 * Saves a new GPS location to both memory and localStorage,
 * and notifies active components via a CustomEvent.
 */
export function saveKnownLocation(
  location: Omit<AutoGpsLocation, 'source'>,
  source: 'gps' | 'flutter_native' = 'gps'
): void {
  const now = location.timestamp || Date.now();
  const loc: AutoGpsLocation = {
    ...location,
    source,
    timestamp: now,
  };

  memoryCache = loc;

  if (typeof window !== 'undefined') {
    try {
      (window as any).__sahaya_native_gps = {
        lat: loc.lat,
        lng: loc.lng,
        accuracy: loc.accuracy,
        updatedAt: now,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
      // Sync with sahaya_current_location while preserving any resolved address fields
      let existingCurrent: any = {};
      try {
        const rawCur = localStorage.getItem(CURRENT_LOC_STORAGE_KEY);
        if (rawCur) existingCurrent = JSON.parse(rawCur);
      } catch {}
      localStorage.setItem(
        CURRENT_LOC_STORAGE_KEY,
        JSON.stringify({
          ...existingCurrent,
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy,
          updatedAt: now,
          timestamp: now,
        })
      );
      window.dispatchEvent(new CustomEvent('sahaya:location_updated', { detail: loc }));
    } catch (err) {
      console.warn('[AutoGps] Error caching location:', err);
    }
  }
}

/**
 * Triggers a background GPS query if the current cached location is older
 * than the throttle interval, or if forced.
 */
export function triggerGpsRefresh(force = false): Promise<AutoGpsLocation | null> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  const cached = getLastKnownLocation();
  const now = Date.now();

  // Request fresh coordinates from Flutter Native bridge if available
  try {
    if ((window as any).SahayaGpsChannel && typeof (window as any).SahayaGpsChannel.postMessage === 'function') {
      (window as any).SahayaGpsChannel.postMessage('GET_GPS');
    }
  } catch {}

  // දැනටමත් දත්ත ලබාගනිමින් පවතී නම් හෝ පසුගිය තත්පර 90 ඇතුළත ලබාගත් එකක් තිබේ නම්
  if (isFetching) {
    return Promise.resolve(cached);
  }

  if (!force && cached && now - cached.timestamp < THROTTLE_INTERVAL_MS) {
    return Promise.resolve(cached);
  }

  isFetching = true;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        isFetching = false;
        const loc: AutoGpsLocation = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 10,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : null,
          heading: pos.coords.heading ? Math.round(pos.coords.heading) : null,
          timestamp: pos.timestamp || Date.now(),
          source: 'gps',
        };

        saveKnownLocation(loc, 'gps');
        resolve(loc);
      },
      (error) => {
        isFetching = false;
        // GPS දෝෂයකදී තිබෙන පැරණි ලොකේෂන් එක රඳවා ගනී
        resolve(getLastKnownLocation());
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Initializes global touch & click listeners across the application.
 * Must be invoked once at the root level (App.tsx).
 */
export function initAutoGps(): () => void {
  if (isInitialized || typeof window === 'undefined') {
    return () => {};
  }

  isInitialized = true;

  // 1. ඇප් එක විවෘත වන විටම පළමු ලොකේෂන් එක ලබා ගැනීම
  triggerGpsRefresh(false);

  // 2. පරිශීලකයා ඇප් එකේ කොතැන හෝ Touch / Click කරන විට ස්වයංක්‍රීයව අලුත් වීම
  const handleUserInteraction = () => {
    triggerGpsRefresh(false);
  };

  window.addEventListener('click', handleUserInteraction, { passive: true });
  window.addEventListener('touchstart', handleUserInteraction, { passive: true });

  // 3. Android WebView (Flutter) Native GPS පාලකය සමඟ සබඳතාවය
  const handleFlutterNativeGps = (event: any) => {
    const detail = event?.detail;
    const lat = Number(detail?.latitude ?? detail?.lat);
    const lng = Number(detail?.longitude ?? detail?.lng);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      saveKnownLocation({
        lat,
        lng,
        accuracy: Number(detail?.accuracy || 10),
        speed: detail?.speed || null,
        heading: detail?.heading || null,
        timestamp: Date.now(),
      }, 'flutter_native');
    }
  };

  const prevOnGpsUpdated = (window as any).onGpsLocationUpdated;
  (window as any).onGpsLocationUpdated = (lat: number, lng: number, acc?: number) => {
    if (typeof lat === 'number' && typeof lng === 'number' && lat !== 0 && lng !== 0) {
      saveKnownLocation({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        accuracy: acc ? Math.round(acc) : 10,
        speed: null,
        heading: null,
        timestamp: Date.now(),
      }, 'flutter_native');
    }
    if (typeof prevOnGpsUpdated === 'function') {
      try { prevOnGpsUpdated(lat, lng, acc); } catch {}
    }
  };

  window.addEventListener('flutter_gps_update', handleFlutterNativeGps as EventListener);

  return () => {
    window.removeEventListener('click', handleUserInteraction);
    window.removeEventListener('touchstart', handleUserInteraction);
    window.removeEventListener('flutter_gps_update', handleFlutterNativeGps as EventListener);
    isInitialized = false;
  };
}

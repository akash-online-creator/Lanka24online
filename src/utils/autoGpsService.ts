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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: AutoGpsLocation = JSON.parse(raw);
      // පසුගිය පැය 24 තුළ ලබාගත් එකක් නම් වලංගුයි
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        memoryCache = parsed;
        return parsed;
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
  const loc: AutoGpsLocation = {
    ...location,
    source,
    timestamp: location.timestamp || Date.now(),
  };

  memoryCache = loc;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
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
    if (event.detail && event.detail.latitude && event.detail.longitude) {
      saveKnownLocation({
        lat: Number(event.detail.latitude),
        lng: Number(event.detail.longitude),
        accuracy: event.detail.accuracy || 10,
        speed: event.detail.speed || null,
        heading: event.detail.heading || null,
        timestamp: Date.now(),
      }, 'flutter_native');
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

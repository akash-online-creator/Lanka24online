// High Accuracy GPS Satellite Navigation Utility for Sahaya Sewa
// Supports Meter-level satellite precision, Fused Location Provider, and zero-stale GPS caching.

export interface HighAccuracyGpsResult {
  lat: number;
  lng: number;
  accuracyMeters: number;
  altitudeMeters?: number | null;
  speedMps?: number | null;
  headingDegrees?: number | null;
  timestamp: number;
  provider: 'capacitor_native' | 'browser_satellite' | 'cached_fallback';
}

/**
 * Hardware GPS චන්ද්‍රිකා හරහා ඉහළම නිරවද්‍යතාවයකින් යුත් සජීවී ඛණ්ඩාංක ලබාගනී.
 * තත්පර කිහිපයක් තුළ සාම්පල කිහිපයක් එකතු කර අවම මීටර් දෝෂයක් (Best Accuracy) ඇති fix එක තෝරාගනු ලබයි.
 */
export async function getHighAccuracyLocation(timeoutMs = 10000): Promise<HighAccuracyGpsResult> {
  // 1. Android Capacitor Native Environment හරහා උත්සාහ කිරීම
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: Math.min(timeoutMs, 8000),
        maximumAge: 0, // Cache කළ පරණ දත්ත ප්‍රතික්ෂේප කිරීම
      });

      if (pos && pos.coords) {
        const acc = Math.round(pos.coords.accuracy || 10);
        const result: HighAccuracyGpsResult = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracyMeters: acc,
          altitudeMeters: pos.coords.altitude,
          speedMps: pos.coords.speed,
          headingDegrees: pos.coords.heading,
          timestamp: pos.timestamp || Date.now(),
          provider: 'capacitor_native',
        };

        // නිරවද්‍යතාවය මීටර් 8 හෝ ඊට අඩු නම් ක්ෂණිකව භාරගැනීම
        if (acc <= 8) {
          saveGpsCache(result.lat, result.lng, result.accuracyMeters);
          return result;
        }
      }
    }
  } catch (err) {
    console.debug('Native Capacitor GPS check notice:', err);
  }

  // 2. High Accuracy Web Geolocation (චන්ද්‍රිකා සංඥා එකතු කර Best Fix එක තෝරාගැනීම)
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    return new Promise<HighAccuracyGpsResult>((resolve, reject) => {
      let bestFix: HighAccuracyGpsResult | null = null;
      let watchId: number | null = null;

      const cleanup = () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
      };

      const finish = (result: HighAccuracyGpsResult) => {
        cleanup();
        saveGpsCache(result.lat, result.lng, result.accuracyMeters);
        resolve(result);
      };

      // තත්පර 6-8ක් තුළ චන්ද්‍රිකා සංඥා කියවා වඩාත්ම නිවැරදි එක ලබාගැනීම
      const timer = setTimeout(() => {
        if (bestFix) {
          finish(bestFix);
        } else {
          // Watcher මඟින් ප්‍රතිචාරයක් නොලැබුණහොත් single-shot fallback
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              finish({
                lat: Number(pos.coords.latitude.toFixed(6)),
                lng: Number(pos.coords.longitude.toFixed(6)),
                accuracyMeters: Math.round(pos.coords.accuracy || 15),
                altitudeMeters: pos.coords.altitude,
                speedMps: pos.coords.speed,
                headingDegrees: pos.coords.heading,
                timestamp: pos.timestamp || Date.now(),
                provider: 'browser_satellite',
              });
            },
            (error) => {
              cleanup();
              const fallback = getSavedGpsCache();
              if (fallback) {
                resolve(fallback);
              } else {
                reject(error);
              }
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
          );
        }
      }, Math.min(timeoutMs, 7000));

      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const currentAccuracy = Math.round(pos.coords.accuracy || 20);
            const currentFix: HighAccuracyGpsResult = {
              lat: Number(pos.coords.latitude.toFixed(6)),
              lng: Number(pos.coords.longitude.toFixed(6)),
              accuracyMeters: currentAccuracy,
              altitudeMeters: pos.coords.altitude,
              speedMps: pos.coords.speed,
              headingDegrees: pos.coords.heading,
              timestamp: pos.timestamp || Date.now(),
              provider: 'browser_satellite',
            };

            // වඩාත් හොඳ නිරවද්‍යතාවයක් ලැබෙන සෑම විටම යාවත්කාලීන කිරීම
            if (!bestFix || currentAccuracy < bestFix.accuracyMeters) {
              bestFix = currentFix;
            }

            // මීටර් 5 හෝ ඊට අඩු ඉහළ නිරවද්‍යතාවයක් ලැබුණු වහාම timer එක නවතා return කිරීම
            if (currentAccuracy <= 5) {
              clearTimeout(timer);
              finish(currentFix);
            }
          },
          (err) => {
            console.debug('GPS watchPosition warning:', err);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: timeoutMs,
          }
        );
      } catch (e) {
        clearTimeout(timer);
        cleanup();
        const fallback = getSavedGpsCache();
        if (fallback) resolve(fallback);
        else reject(e);
      }
    });
  }

  // 3. Geolocation කිසිසේත්ම නොමැති නම් Cache අගය භාවිත කිරීම
  const fallback = getSavedGpsCache();
  if (fallback) return fallback;

  throw new Error('මෙම උපාංගයේ GPS දෘඩාංග සහාය නොදක්වයි.');
}

function saveGpsCache(lat: number, lng: number, accuracy: number): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        'sahaya_current_location',
        JSON.stringify({ lat, lng, accuracy, updatedAt: Date.now() })
      );
    }
  } catch {}
}

export function getSavedGpsCache(): HighAccuracyGpsResult | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('sahaya_current_location');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          return {
            lat: parsed.lat,
            lng: parsed.lng,
            accuracyMeters: parsed.accuracy || 25,
            timestamp: parsed.updatedAt || Date.now(),
            provider: 'cached_fallback',
          };
        }
      }
    }
  } catch {}
  return null;
}

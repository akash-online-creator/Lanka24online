/**
 * Sahaya Sewa - Universal Centralized API Configuration & Client
 * 
 * Ensures seamless communication for BOTH:
 * 1. Web Browser (Direct Relative or Proxy Requests)
 * 2. Mobile APK (Flutter / Capacitor Loopback to Live Cloud Server)
 * 
 * Prevents "Unexpected token '<', '<!doctype html>' is not valid JSON" errors.
 */

// ==============================================================
// 1. Base URL Detection & Resolution
// ==============================================================

// සජීවී Production Backend Server Domain එක (ඔබගේ Live Cloud Server එක)
const DEFAULT_REMOTE_BACKEND = 'https://supporservice.online';

/**
 * යෙදුම ජංගම දුරකථනයක (Mobile APK) ධාවනය වන්නේදැයි හඳුනාගැනීම
 */
export function isMobileNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Flutter LocalAssetServer (127.0.0.1) හෝ Capacitor (localhost / capacitor:)
  return (
    hostname === '127.0.0.1' ||
    hostname === 'localhost' ||
    protocol === 'capacitor:' ||
    protocol === 'file:'
  );
}

/**
 * නිවැරදි API Base URL එක ලබාගැනීම
 */
export function getApiBaseUrl(): string {
  // 1. .env ගොනුවේ VITE_API_URL අර්ථ දක්වා ඇත්නම් එය ප්‍රමුඛ වේ
  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (envApiUrl && typeof envApiUrl === 'string' && envApiUrl.trim().length > 0) {
    return envApiUrl.trim().replace(/\/$/, '');
  }

  // 2. ජංගම දුරකථනයක (APK) ධාවනය වන විට සජීවී Cloud Backend එකට යොමු කිරීම
  if (isMobileNativeApp()) {
    return DEFAULT_REMOTE_BACKEND;
  }

  // 3. සාමාන්‍ය Web Browser එකකදී වත්මන් domain එක (relative path) භාවිතා කිරීම
  return '';
}

/**
 * ඕනෑම API Endpoint එකක් සඳහා සම්පූර්ණ නිවැරදි URL එක සකස් කිරීම
 */
export function resolveApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * ආරක්ෂිත Core apiFetch Wrapper එක (Timeout සහ Content-Type සහිතව)
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 15000
): Promise<Response> {
  const url = resolveApiUrl(endpoint);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
  };

  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);
    return response;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`API call timed out after ${timeoutMs}ms: ${endpoint}`);
    }
    throw err;
  }
}

/**
 * JSON Response එක ආරක්ෂිතව Parse කිරීම (HTML වැරදියට ලැබුණහොත් Crash වීම වළක්වයි)
 */
export async function safeParseJsonResponse<T = any>(
  response: Response,
  fallbackData: T
): Promise<{ success: boolean; data: T; isHtmlError?: boolean }> {
  try {
    const contentType = response.headers.get('content-type') || '';

    // Backend එක වෙනුවට HTML පිටුවක් (<!DOCTYPE html>) ලැබී ඇත්නම්
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')) {
        console.warn('Expected JSON but received HTML response from endpoint. Route may not exist on server.');
        return { success: false, data: fallbackData, isHtmlError: true };
      }
      try {
        return { success: true, data: JSON.parse(text) };
      } catch {
        return { success: false, data: fallbackData };
      }
    }

    const data = await response.json();
    return { success: response.ok, data };
  } catch (e) {
    console.warn('JSON parsing error:', e);
    return { success: false, data: fallbackData };
  }
}
// ==============================================================
// 2. High-Level Typed API Methods
// ==============================================================

/**
 * 1. Gemini AI සහකාර සංවාදය (/api/chat)
 */
export async function fetchAiChat(params: {
  message: string;
  language?: string;
  conversationHistory?: Array<{ role: string; text: string }>;
  locationContext?: string;
}): Promise<{ success: boolean; reply: string; fallback?: boolean }> {
  try {
    const res = await apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    }, 12000);

    const parsed = await safeParseJsonResponse(res, { success: false, reply: '', fallback: true });
    return parsed.data;
  } catch (err: any) {
    console.warn('AI Chat API error, using fallback:', err.message);
    return { success: false, reply: '', fallback: true };
  }
}

/**
 * 2. ශ්‍රී ලංකා GPS ලිපින සෙවීම (/api/reverse-geocode)
 */
export async function fetchReverseGeocode(lat: number, lng: number): Promise<{
  success: boolean;
  displayName?: string;
  rawVillage?: string;
  rawRoad?: string;
  rawTown?: string;
  rawDistrict?: string;
}> {
  try {
    const res = await apiFetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`, {
      method: 'GET',
    }, 8000);

    const parsed = await safeParseJsonResponse(res, { success: false });
    return parsed.data;
  } catch (err: any) {
    console.warn('Reverse geocoding error:', err.message);
    return { success: false };
  }
}

/**
 * 3. භාෂා පරිවර්තනය (/api/translate)
 */
export async function fetchTranslation(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<string | null> {
  try {
    const res = await apiFetch('/api/translate', {
      method: 'POST',
      body: JSON.stringify({
        text,
        targetLanguage: targetLang,
        sourceLanguage: sourceLang,
      }),
    }, 8000);

    const parsed = await safeParseJsonResponse(res, { translatedText: null });
    return parsed.data.translatedText || null;
  } catch {
    return null;
  }
}

/**
 * 4. මාධ්‍ය ගොනු Cloudflare R2 / S3 වෙත Upload කිරීම (/api/storage/upload)
 */
export async function uploadMediaFile(
  file: File | Blob,
  mediaType: 'image' | 'voice' | 'video' | 'document' = 'image'
): Promise<{ success: boolean; url?: string; fileId?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaType', mediaType);

    const res = await apiFetch('/api/storage/upload', {
      method: 'POST',
      body: formData,
    }, 30000);

    const parsed = await safeParseJsonResponse(res, { success: false, error: 'Upload failed' });
    return parsed.data;
  } catch (err: any) {
    console.warn('Media upload error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 5. Base64 දත්ත Upload කිරීම (/api/storage/upload)
 */
export async function uploadBase64Media(
  fileBase64: string,
  fileName: string,
  mediaType: 'image' | 'voice' | 'video' | 'document' = 'image'
): Promise<{ success: boolean; url?: string; fileId?: string; error?: string }> {
  try {
    const res = await apiFetch('/api/storage/upload', {
      method: 'POST',
      body: JSON.stringify({
        fileBase64,
        fileName,
        mediaType,
      }),
    }, 25000);

    const parsed = await safeParseJsonResponse(res, { success: false, error: 'Upload failed' });
    return parsed.data;
  } catch (err: any) {
    console.warn('Base64 upload error:', err.message);
    return { success: false, error: err.message };
  }
}

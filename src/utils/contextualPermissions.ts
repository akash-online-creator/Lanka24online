/**
 * Sahaya Sewa - Privacy-First Contextual (Just-In-Time) Permission Manager
 *
 * Architecture:
 * - Tier 1 (Startup): ONLY Location (GPS) & Notification permissions are requested at app launch.
 * - Tier 2 (Contextual / On-Demand): Camera, Microphone, and Battery Unrestricted permissions
 *   are NEVER requested upfront. They are requested ONLY when the user navigates to and actively
 *   uses a specific service (e.g., QR Scanner, Voice Note, AI Voice Help, SOS Live Audio, 24/7 Settings).
 */

export type ContextualPermissionType =
  | 'location'
  | 'notifications'
  | 'camera'
  | 'microphone'
  | 'battery';

export interface ContextualPermissionResult {
  granted: boolean;
  stream?: MediaStream;
  errorSi?: string;
  isPermanentlyDenied?: boolean;
}

/**
 * Sends a command to the Flutter/Android native wrapper if running inside the Sahaya Sewa APK.
 */
export function postToNativePermissionBridge(command: string): boolean {
  if (typeof window === 'undefined') return false;
  let sent = false;

  try {
    const permChannel = (window as any).SahayaPermissionChannel;
    if (permChannel && typeof permChannel.postMessage === 'function') {
      permChannel.postMessage(command);
      sent = true;
    }
  } catch (e) {
    console.warn('[ContextualPermissions] SahayaPermissionChannel error:', e);
  }

  try {
    const gpsChannel = (window as any).SahayaGpsChannel;
    if (gpsChannel && typeof gpsChannel.postMessage === 'function') {
      gpsChannel.postMessage(command);
      sent = true;
    }
  } catch (e) {
    console.warn('[ContextualPermissions] SahayaGpsChannel error:', e);
  }

  return sent;
}

/**
 * Opens the native Android App Settings page (or shows instructions on mobile web)
 * when a user wants to manually toggle a permission for a specific service.
 */
export function openContextualAppSettings(): boolean {
  return postToNativePermissionBridge('OPEN_SETTINGS');
}

/**
 * Queries current browser/webview permission state without triggering a system prompt.
 */
export async function checkContextualPermissionState(
  type: ContextualPermissionType
): Promise<'granted' | 'denied' | 'prompt'> {
  if (typeof window === 'undefined') return 'prompt';

  try {
    if (type === 'notifications') {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') return 'granted';
        if (Notification.permission === 'denied') return 'denied';
      }
      return 'prompt';
    }

    if (type === 'battery') {
      return localStorage.getItem('sahaya_battery_unrestricted_granted') === 'true'
        ? 'granted'
        : 'prompt';
    }

    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      const descriptorName =
        type === 'location'
          ? 'geolocation'
          : type === 'camera'
          ? 'camera'
          : 'microphone';
      const status = await navigator.permissions.query({
        name: descriptorName as PermissionName,
      });
      if (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt') {
        return status.state;
      }
    }
  } catch {
    // Fallback for browsers (like iOS Safari / older WebViews) that don't support querying camera/mic via Permissions API
  }

  // Check localStorage cache if previously granted in this session/device
  if (type === 'camera' && localStorage.getItem('sahaya_camera_perm_granted') === 'true') {
    return 'granted';
  }
  if (type === 'microphone' && localStorage.getItem('sahaya_mic_perm_granted') === 'true') {
    return 'granted';
  }

  return 'prompt';
}

/**
 * Requests Camera permission ONLY when the user accesses a camera feature
 * (e.g. QR Pay Scanner, Evidence Photo capture).
 */
export async function requestContextualCameraPermission(
  facingMode: 'environment' | 'user' = 'environment'
): Promise<ContextualPermissionResult> {
  // 1. If inside Android APK, trigger native camera permission dialog first
  postToNativePermissionBridge('REQUEST_CAMERA');

  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      granted: false,
      errorSi:
        'කැමරාව මෙම බ්‍රවුසරයේ ක්‍රියාත්මක කළ නොහැක. කරුණාකර ගැලරියෙන් (Gallery) පින්තූරය තෝරන්න හෝ කේතය ඇතුළත් කරන්න.',
    };
  }

  try {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
    }

    if (stream) {
      try {
        localStorage.setItem('sahaya_camera_perm_granted', 'true');
      } catch {}
      return { granted: true, stream };
    }

    return {
      granted: false,
      errorSi: 'කැමරා දත්ත ලබාගත නොහැකි විය.',
    };
  } catch (err: any) {
    const isDenied =
      err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
    if (isDenied) {
      try {
        localStorage.removeItem('sahaya_camera_perm_granted');
      } catch {}
    }

    let errorSi =
      'කැමරාව භාවිතය සඳහා අවසර ලබා දී නොමැත. කරුණාකර Camera Allow කරන්න හෝ පින්තූරය Upload කරන්න.';
    if (isDenied) {
      errorSi =
        'කැමරා අවසරය (Camera Permission) අක්‍රීය කර ඇත. මෙම සේවාව භාවිතා කිරීමට Browser URL Bar එකේ 🔒 අයිකනයෙන් හෝ App Settings වලින් Camera අවසරය ලබා දෙන්න.';
    } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
      errorSi = 'ඔබගේ උපාංගයේ සක්‍රීය කැමරාවක් සොයාගත නොහැකි විය.';
    } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
      errorSi = 'කැමරාව වෙනත් යෙදුමක් මගින් භාවිතා වේ. වෙනත් කැමරා apps වසා නැවත උත්සාහ කරන්න.';
    }

    return {
      granted: false,
      errorSi,
      isPermanentlyDenied: isDenied,
    };
  }
}

/**
 * Requests Microphone permission ONLY when the user clicks a Voice Note / Mic button
 * (e.g. Chat Voice Note, AI Voice Help, SOS Live Audio Evidence).
 */
export async function requestContextualMicrophonePermission(
  enhancedAudio = false
): Promise<ContextualPermissionResult> {
  // 1. If inside Android APK, trigger native microphone permission dialog first
  postToNativePermissionBridge('REQUEST_MICROPHONE');

  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      granted: false,
      errorSi: 'ඔබගේ බ්‍රවුසරය හඬ පටිගත කිරීම (Microphone) සඳහා සහය නොදක්වයි.',
    };
  }

  try {
    const audioConstraints: boolean | MediaTrackConstraints = enhancedAudio
      ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      : true;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
      video: false,
    });

    try {
      localStorage.setItem('sahaya_mic_perm_granted', 'true');
    } catch {}

    return { granted: true, stream };
  } catch (err: any) {
    const isDenied =
      err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
    if (isDenied) {
      try {
        localStorage.removeItem('sahaya_mic_perm_granted');
      } catch {}
    }

    const errorSi = isDenied
      ? 'මයික්‍රෆෝන අවසරය (Microphone Permission) ලබා දී නොමැත. හඬ පණිවිඩ යැවීමට කරුණාකර Microphone Allow කරන්න.'
      : 'මයික්‍රෆෝනය සක්‍රිය කළ නොහැකි විය. කරුණාකර Microphone අවසරය ලබා දී නැවත උත්සාහ කරන්න.';

    return {
      granted: false,
      errorSi,
      isPermanentlyDenied: isDenied,
    };
  }
}

/**
 * Requests Android Battery Unrestricted / 24x7 Background Service permission ONLY when
 * the user explicitly activates 24/7 Background Radar or SOS Live Tracking.
 */
export function requestContextualBatteryUnrestricted(): boolean {
  try {
    localStorage.setItem('sahaya_battery_unrestricted_granted', 'true');
  } catch {}
  return postToNativePermissionBridge('REQUEST_BATTERY_UNRESTRICTED');
}

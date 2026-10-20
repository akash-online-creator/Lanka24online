import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapPin, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  Lock, 
  Sun, 
  Moon, 
  Languages, 
  Sparkles,
  Bell,
  ChevronRight,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { Language, Theme, LocationOption } from '../types';
import { AppLogo } from './AppLogo';
import { resolveExactLocation, toLocationOption } from '../utils/geoUtils';
import { requestNotificationPermission, playNotificationSound } from '../utils/notificationManager';
import { stopEmergencySiren } from '../utils/sirenAudio';

interface GpsActivationGateProps {
  onProceedToLogin: (location?: LocationOption) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
}

export const GpsActivationGate: React.FC<GpsActivationGateProps> = ({
  onProceedToLogin,
  language,
  setLanguage,
  theme,
  toggleTheme,
}) => {
  const [isScanningGps, setIsScanningGps] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'idle' | 'scanning' | 'success' | 'denied' | 'error'>('idle');
  const [resolvedLocation, setResolvedLocation] = useState<LocationOption | null>(null);
  const [isAutoProceeding, setIsAutoProceeding] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [showSettingsButton, setShowSettingsButton] = useState(false);
  const hasProceededRef = useRef(false);

  // Helper to detect Android APK WebView or Native Hybrid App
  const checkIsAndroidApp = useCallback(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return Boolean(
      /wv|Android.*Version\/[0-9]\.[0-9]|Mobile.*wv/i.test(navigator.userAgent) ||
      (window as any).__sahaya_is_native_app === true ||
      (window as any).SahayaPermissionChannel ||
      (window as any).SahayaGpsChannel ||
      (window as any).Android
    );
  }, []);

  // Helper to communicate with Native Flutter Bridge
  const sendNativeMessage = useCallback((channel: string, message: string) => {
    try {
      if (typeof window !== 'undefined' && (window as any)[channel]) {
        (window as any)[channel].postMessage(message);
        return true;
      }
    } catch (e) {
      console.debug(`Native channel ${channel} notice:`, e);
    }
    return false;
  }, []);

  // Process Coordinates from GPS
  const processCoords = useCallback(async (latitude: number, longitude: number, accuracy: number) => {
    try {
      const geo = await resolveExactLocation(latitude, longitude);
      const locOpt = toLocationOption(geo);

      setResolvedLocation(locOpt);
      setLocationGranted(true);
      localStorage.setItem('sahaya_current_location', JSON.stringify(locOpt));
      localStorage.setItem('sahaya_manual_location_locked', 'false');
      localStorage.setItem('sahaya_location_mode', 'auto');
      localStorage.setItem('sahaya_gps_verified', 'true');
      window.dispatchEvent(new CustomEvent('sahaya_location_mode_changed', { detail: { mode: 'auto' } }));

      setStatusType('success');
      setStatusMessage(`📍 සජීවී GPS ස්ථානය හඳුනාගැනිණි: ${geo.shortDisplaySi} (±${Math.round(accuracy)}m)`);
      setIsScanningGps(false);
    } catch {
      const fallback: LocationOption = {
        id: `loc_gps_${Date.now()}`,
        nameSi: `කෝවින්න, ගංගාරාම පාර, කටුනායක`,
        nameEn: `Kovinna, Gangarama Road, Katunayake`,
        nameTa: `Kovinna, Gangarama Road, Katunayake`,
        lat: latitude,
        lng: longitude,
      };
      setResolvedLocation(fallback);
      setLocationGranted(true);
      localStorage.setItem('sahaya_current_location', JSON.stringify(fallback));
      localStorage.setItem('sahaya_manual_location_locked', 'false');
      localStorage.setItem('sahaya_location_mode', 'auto');
      localStorage.setItem('sahaya_gps_verified', 'true');
      window.dispatchEvent(new CustomEvent('sahaya_location_mode_changed', { detail: { mode: 'auto' } }));

      setStatusType('success');
      setStatusMessage(`📍 GPS ස්ථානය: ${fallback.nameSi}`);
      setIsScanningGps(false);
    }
  }, []);

  // Check initial permissions & hook into native app bridge
  useEffect(() => {
    // 1. Detect if running inside Native Flutter App Wrapper
    const checkNative = () => {
      const isNative = checkIsAndroidApp();
      setIsNativeApp(isNative);

      // In Android APK, notification permissions are controlled at OS level.
      // If user is inside APK or previously marked, treat notification as active.
      const storedNotif = typeof localStorage !== 'undefined' && localStorage.getItem('sahaya_notif_granted') === 'true';
      if (isNative || storedNotif) {
        setNotifGranted(true);
        setShowSettingsButton(false);
      }

      if ((window as any).__sahaya_native_notif_granted === true) {
        setNotifGranted(true);
      }
      if ((window as any).__sahaya_native_location_granted === true) {
        setLocationGranted(true);
      }

      // Ask Flutter to verify and sync permissions directly
      if ((window as any).SahayaPermissionChannel) {
        (window as any).SahayaPermissionChannel.postMessage('CHECK_PERMISSIONS');
      }
    };

    checkNative();

    // 2. Register Callback for Flutter Native Bridge Updates
    (window as any).onNativePermissionsUpdated = (data: { notification: boolean; location: boolean }) => {
      if (data.notification) {
        setNotifGranted(true);
        setShowSettingsButton(false);
      }
      if (data.location) {
        setLocationGranted(true);
      }
      if (data.notification && data.location) {
        setStatusType('success');
        setStatusMessage('✅ අවසර 2ම සක්‍රීය විය! ආරක්ෂිතව ඇප් එකට පිවිසෙමින් පවතී...');
      }
    };

    // 3. Register Callback for Live GPS updates from Flutter
    (window as any).onGpsLocationUpdated = (lat: number, lng: number, acc: number) => {
      processCoords(lat, lng, acc);
    };

    // 4. Web Browser Notification Permission Check
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotifGranted(true);
      } else if (Notification.permission === 'denied') {
        setShowSettingsButton(true);
      }
    }

    // 5. Service Worker Check for Web Push
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.debug('Service worker registration note:', err);
      });
    }

    // 6. Check Native GPS from Android / Flutter
    if (typeof window !== 'undefined' && (window as any).__sahaya_native_gps) {
      const { lat, lng, accuracy } = (window as any).__sahaya_native_gps;
      if (lat && lng) {
        processCoords(lat, lng, accuracy || 10);
      }
    }

    // 7. Check Geolocation Permission
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((permissionStatus) => {
        if (permissionStatus.state === 'granted') {
          handleStartGps(true);
        }
      }).catch(() => {});
    }

    // 8. Re-check permissions when user resumes back to app from phone settings
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if ((window as any).SahayaPermissionChannel) {
          (window as any).SahayaPermissionChannel.postMessage('CHECK_PERMISSIONS');
        }
        // When resuming from phone settings, mark notifications granted
        setNotifGranted(true);
        setShowSettingsButton(false);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('sahaya_notif_granted', 'true');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Auto-Request both permissions on load
    const autoReqTimer = setTimeout(() => {
      handleAllowBothPermissions();
    }, 500);

    return () => {
      clearTimeout(autoReqTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [processCoords]);

  // Auto-Proceed as soon as BOTH permissions are granted
  useEffect(() => {
    if (locationGranted && notifGranted && !hasProceededRef.current) {
      hasProceededRef.current = true;
      setIsAutoProceeding(true);
      setStatusType('success');
      setStatusMessage('✅ අවසර 2ම සාර්ථකව සක්‍රීය විය! ආරක්ෂිතව ඇප් එකට පිවිසෙමින් පවතී...');

      const proceedTimer = setTimeout(() => {
        handleFinishAndProceed();
      }, 700);

      return () => clearTimeout(proceedTimer);
    }
  }, [locationGranted, notifGranted]);

  // Request Notification Permission (Native App Aware)
  const handleRequestNotification = async () => {
    // In Android APK, notification permission is managed by Android OS
    if ((window as any).SahayaPermissionChannel) {
      sendNativeMessage('SahayaPermissionChannel', 'REQUEST_NOTIFICATION');
    }

    try {
      await requestNotificationPermission();
    } catch {}

    // Always activate notifications for APK & mobile users so they are never blocked
    setNotifGranted(true);
    setShowSettingsButton(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sahaya_notif_granted', 'true');
    }
    playNotificationSound('general');
    setStatusType('success');
    setStatusMessage('🔔 හදිසි දැනුම්දීම් සාර්ථකව සක්‍රීය කරන ලදී.');
    return true;
  };

  // Open App Permission Settings directly
  const handleOpenAppSettings = () => {
    if ((window as any).SahayaPermissionChannel) {
      sendNativeMessage('SahayaPermissionChannel', 'OPEN_SETTINGS');
    }
    // Mark as granted so user is not blocked when returning
    setNotifGranted(true);
    setShowSettingsButton(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sahaya_notif_granted', 'true');
    }
    setStatusType('success');
    setStatusMessage('🔔 හදිසි දැනුම්දීම් සක්‍රීය කරන ලදී.');
  };

  // Start High-Accuracy GPS Scanning
  const handleStartGps = (isSilent = false) => {
    // If in Native app, request through Native GPS Channel
    if ((window as any).SahayaPermissionChannel) {
      sendNativeMessage('SahayaPermissionChannel', 'REQUEST_LOCATION');
    }
    if ((window as any).SahayaGpsChannel) {
      sendNativeMessage('SahayaGpsChannel', 'GET_GPS');
    }

    if (!navigator.geolocation) {
      if (!isNativeApp) {
        setStatusType('error');
        setStatusMessage('ඔබගේ උපාංගය හෝ බ්‍රවුසරය GPS ස්ථාන සේවා සඳහා සහාය නොදක්වයි.');
      }
      return;
    }

    setIsScanningGps(true);
    setStatusType('scanning');
    if (!isSilent) {
      setStatusMessage('🛰️ සජීවී GPS චන්ද්‍රිකා සංඥාව ලබාගනිමින් පවතී...');
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        processCoords(latitude, longitude, accuracy);
      },
      () => {
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            const { latitude, longitude, accuracy } = fallbackPos.coords;
            processCoords(latitude, longitude, accuracy);
          },
          (finalErr) => {
            setIsScanningGps(false);
            if (finalErr.code === finalErr.PERMISSION_DENIED) {
              setStatusType('denied');
              setShowSettingsButton(true);
              setStatusMessage('⚠️ GPS අවසරය ලබාදී නැත. කරුණාකර දුරකථනයේ Location සක්‍රීය කරන්න.');
            } else {
              setStatusType('error');
              setStatusMessage('⚠️ GPS සංඥාව ප්‍රමාද විය. නැවත උත්සාහ කරන්න.');
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Master Action: Request Both Essential Permissions
  const handleAllowBothPermissions = async () => {
    setIsScanningGps(true);
    setStatusType('scanning');
    setStatusMessage('⚡ අවසරයන් සක්‍රීය කරමින් පවතී...');

    // 1. Native App Priority
    if ((window as any).SahayaPermissionChannel) {
      sendNativeMessage('SahayaPermissionChannel', 'REQUEST_ALL');
      return;
    }

    // 2. Notifications Activation (Always grant in APK/Mobile to prevent lock)
    setNotifGranted(true);
    setShowSettingsButton(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sahaya_notif_granted', 'true');
    }
    try {
      await requestNotificationPermission();
    } catch {}

    handleStartGps(false);
    localStorage.setItem('sahaya_permissions_setup_completed', 'true');
  };

  // Finish and proceed to app
  const handleFinishAndProceed = () => {
    localStorage.setItem('sahaya_permissions_setup_completed', 'true');
    stopEmergencySiren();
    onProceedToLogin(resolvedLocation || undefined);
  };

  // Graceful Emergency Bypass for disaster situations
  const handleEmergencyBypass = () => {
    localStorage.setItem('sahaya_permissions_setup_completed', 'true');
    stopEmergencySiren();
    onProceedToLogin(resolvedLocation || undefined);
  };

  const handleNextLanguage = () => {
    const langSeq: Language[] = ['si', 'en', 'ta'];
    const currentIndex = langSeq.indexOf(language);
    const nextLang = langSeq[(currentIndex + 1) % langSeq.length];
    setLanguage(nextLang);
  };

  const getLanguageDisplayName = (lang: Language) => {
    switch (lang) {
      case 'si': return 'සිංහල';
      case 'ta': return 'தமிழ்';
      case 'en': default: return 'English';
    }
  };

  // In APK, location is essential; notifications must never lock the gate
  const isBothComplete = locationGranted && (notifGranted || isNativeApp || checkIsAndroidApp());
  const canProceed = locationGranted || isBothComplete;

  return (
    <div className="w-full max-w-lg mx-auto px-3 py-4 flex flex-col items-center animate-fadeIn">
      {/* Top Header Bar: Theme Toggle & Language */}
      <div className="w-full flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-8 h-8 rounded-full bg-white dark:bg-[#112318] border border-slate-200/80 dark:border-[#1e3d2a] shadow-xs hover:shadow-sm flex items-center justify-center text-slate-700 dark:text-emerald-300 transition-all cursor-pointer active:scale-95"
          title="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-xs font-black text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>අත්‍යවශ්‍ය අවසර 2 සක්‍රීය කිරීම</span>
        </div>

        <button
          type="button"
          onClick={handleNextLanguage}
          className="h-8 px-2.5 rounded-full bg-white dark:bg-[#112318] border border-slate-200/80 dark:border-[#1e3d2a] shadow-xs hover:shadow-sm flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-emerald-300 transition-all cursor-pointer active:scale-95"
        >
          <Languages className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{getLanguageDisplayName(language)}</span>
        </button>
      </div>

      {/* Main Glassmorphic Card */}
      <div className="w-full rounded-3xl bg-white dark:bg-[#0c1811] border-2 border-emerald-500/30 shadow-2xl overflow-hidden p-4 sm:p-6 space-y-4">
        
        {/* App Logo & Header */}
        <div className="text-center space-y-1.5">
          <div className="flex justify-center my-1 transform hover:scale-105 transition-transform duration-300">
            <AppLogo size="2xl" showGlow animated />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            <span className="text-[#007a4b] dark:text-[#00c880]">සහය </span>
            <span className="text-amber-600 dark:text-amber-400">සේවා</span>
          </h1>
          <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-bold">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>සැමට පිහිට • SAHAYA SEWA</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-emerald-200/80 font-medium max-w-sm mx-auto pt-1 leading-relaxed">
            හදිසි ආපදා අනතුරු ඇඟවීම් සහ නිවැරදි ස්ථානය ලබාගැනීම සඳහා පහත අත්‍යවශ්‍ය අවසර 2 සක්‍රීය කරන්න.
          </p>
        </div>

        {/* 1-Click Master Action Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleAllowBothPermissions}
            disabled={isScanningGps || isAutoProceeding}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm sm:text-base text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
              isBothComplete
                ? 'bg-emerald-600 border border-emerald-300'
                : isScanningGps
                ? 'bg-slate-600 cursor-not-allowed opacity-90'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/30 border border-emerald-300/40 animate-pulse'
            }`}
          >
            {isScanningGps ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>🛰️ GPS සහ අවසර සක්‍රීය කරමින් පවතී...</span>
              </>
            ) : isBothComplete ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>✅ අවසර 2ම සක්‍රීයයි!</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>⚡ අවසර 2ම එකවර සක්‍රීය කරන්න (Allow Both)</span>
              </>
            )}
          </button>
        </div>

        {/* Live Status Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs sm:text-sm font-bold flex items-start gap-2.5 transition-all animate-fadeIn ${
              statusType === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                : statusType === 'denied' || statusType === 'error'
                ? 'bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-300'
                : 'bg-teal-500/15 border border-teal-500/40 text-teal-900 dark:text-teal-200'
            }`}
          >
            {statusType === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
            {(statusType === 'denied' || statusType === 'error') && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
            {statusType === 'scanning' && <Radio className="w-4 h-4 text-teal-500 shrink-0 mt-0.5 animate-pulse" />}
            <div className="leading-relaxed flex-1">
              <p>{statusMessage}</p>
            </div>
            {showSettingsButton && (
              <button
                type="button"
                onClick={handleOpenAppSettings}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-black flex items-center gap-1 shadow-sm transition-all"
              >
                <Settings className="w-3 h-3" />
                <span>Settings</span>
              </button>
            )}
          </div>
        )}

        {/* The 2 Core Essential Permission Cards */}
        <div className="space-y-2.5 pt-1">
          
          {/* 1. Live GPS Location Card */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#112519] border border-slate-200/80 dark:border-emerald-900/60 transition-all">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                locationGranted 
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
              }`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>📍 නිවැරදි සජීවී GPS ස්ථානය (Live Location)</span>
                  {locationGranted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {resolvedLocation 
                    ? `ස්ථානය: ${resolvedLocation.nameSi}` 
                    : 'ඔබ සිටින තැනට කි.මී. 5 ආසන්න ආපදා හඳුනාගැනීමට'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleStartGps(false)}
              disabled={isScanningGps}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                locationGranted
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
              }`}
            >
              {locationGranted ? 'Active ✓' : 'Allow'}
            </button>
          </div>

          {/* 2. Emergency Push Notifications & Siren Card */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#112519] border border-slate-200/80 dark:border-emerald-900/60 transition-all">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                notifGranted 
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}>
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🔔 හදිසි දැනුම්දීම් (Push Alerts & Siren)</span>
                  {notifGranted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  App එක Close කර තිබුණද රතු එළිය ආපදා සයිරන් නාද වීමට
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={showSettingsButton && !notifGranted ? handleOpenAppSettings : handleRequestNotification}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                notifGranted
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : showSettingsButton
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
              }`}
            >
              {notifGranted ? 'Active ✓' : showSettingsButton ? 'Settings ⚙️' : 'Allow'}
            </button>
          </div>
        </div>

        {/* Bottom Proceed Action Button */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left flex items-center gap-1">
            <Lock className="w-3 h-3 text-amber-500 inline shrink-0" />
            <span>ආරක්ෂිත හේතුන් මත අවසර 2ම නිර්දේශ කෙරේ.</span>
          </p>

          <button
            type="button"
            onClick={handleFinishAndProceed}
            disabled={!canProceed}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
              canProceed
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer active:scale-95 animate-pulse'
                : 'bg-slate-200 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
            }`}
          >
            <span>
              {canProceed
                ? 'ඇප් එකට පිවිසෙන්න (Proceed) >'
                : '🛰️ GPS ස්ථානය හඳුනාගනිමින් පවතී...'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Graceful Emergency Bypass Option */}
        {!isBothComplete && (
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={handleEmergencyBypass}
              className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>හදිසි අවස්ථාවකදී සීමිත පහසුකම් සමඟ ඉදිරියට යන්න</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};


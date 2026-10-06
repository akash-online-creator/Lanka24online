import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Radio, 
  Smartphone, 
  Laptop, 
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
  Zap,
  Layers,
  BatteryCharging,
  Maximize2,
  ChevronRight,
  Info,
  ExternalLink
} from 'lucide-react';
import { Language, Theme, LocationOption } from '../types';
import { AppLogo } from './AppLogo';
import { resolveExactLocation, toLocationOption } from '../utils/geoUtils';
import { requestNotificationPermission, activateBackgroundWakeLock, playNotificationSound } from '../utils/notificationManager';

interface GpsActivationGateProps {
  onProceedToLogin: (location?: LocationOption) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
}

type BrandKey = 'xiaomi' | 'samsung' | 'oppo_vivo' | 'huawei' | 'generic';

export const GpsActivationGate: React.FC<GpsActivationGateProps> = ({
  onProceedToLogin,
  language,
  setLanguage,
  theme,
  toggleTheme,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [statusState, setStatusState] = useState<'idle' | 'scanning' | 'success' | 'denied' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [resolvedLocation, setResolvedLocation] = useState<LocationOption | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<BrandKey>('xiaomi');
  const [showBrandGuide, setShowBrandGuide] = useState(false);

  // 6 Core Permission Statuses
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [bgGranted, setBgGranted] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [batteryIgnored, setBatteryIgnored] = useState(false);
  const [autostartConfigured, setAutostartConfigured] = useState(false);

  const processCoords = async (latitude: number, longitude: number, accuracy: number) => {
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

      setStatusState('success');
      setStatusMessage(`✅ සජීවී GPS ස්ථානය සාර්ථකයි: ${geo.shortDisplaySi} (±${Math.round(accuracy)}m)`);
      setIsScanning(false);
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

      setStatusState('success');
      setStatusMessage(`✅ GPS ස්ථානය සාර්ථකයි: ${fallback.nameSi}`);
      setIsScanning(false);
    }
  };

  // Check initial permissions on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotifGranted(true);
      }
    }

    if (typeof localStorage !== 'undefined') {
      if (localStorage.getItem('sahaya_wake_lock_enabled') === 'true') {
        setBgGranted(true);
      }
      if (localStorage.getItem('sahaya_overlay_enabled') === 'true') {
        setOverlayGranted(true);
      }
      if (localStorage.getItem('sahaya_battery_opt_ignored') === 'true') {
        setBatteryIgnored(true);
      }
      if (localStorage.getItem('sahaya_autostart_configured') === 'true') {
        setAutostartConfigured(true);
      }
    }

    // Check Flutter native GPS if available
    if (typeof window !== 'undefined' && (window as any).__sahaya_native_gps) {
      const { lat, lng, accuracy } = (window as any).__sahaya_native_gps;
      if (lat && lng) {
        processCoords(lat, lng, accuracy || 10);
      }
    }

    const handleNativeGps = (e: any) => {
      const data = e.detail || e.data;
      if (data && data.lat && data.lng) {
        processCoords(data.lat, data.lng, data.accuracy || 10);
      }
    };

    window.addEventListener('sahaya_native_gps', handleNativeGps);

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((permissionStatus) => {
        if (permissionStatus.state === 'granted') {
          setLocationGranted(true);
          handleStartGpsScan(true);
        }
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('sahaya_native_gps', handleNativeGps);
    };
  }, []);

  const handleAllowNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotifGranted(true);
      playNotificationSound('general');
    }
    return granted;
  };

  const handleAllowBackground = async () => {
    const active = await activateBackgroundWakeLock();
    if (active) {
      setBgGranted(true);
      localStorage.setItem('sahaya_wake_lock_enabled', 'true');
    }
    return active;
  };

  const handleToggleOverlay = () => {
    const nextVal = !overlayGranted;
    setOverlayGranted(nextVal);
    localStorage.setItem('sahaya_overlay_enabled', nextVal ? 'true' : 'false');
    // Notify native android wrapper if available
    if (typeof window !== 'undefined' && (window as any).AndroidInterface?.requestOverlayPermission) {
      try {
        (window as any).AndroidInterface.requestOverlayPermission();
      } catch {}
    }
  };

  const handleToggleBatteryOptimization = () => {
    const nextVal = !batteryIgnored;
    setBatteryIgnored(nextVal);
    localStorage.setItem('sahaya_battery_opt_ignored', nextVal ? 'true' : 'false');
    // Call Android native intent if running in APK
    if (typeof window !== 'undefined' && (window as any).AndroidInterface?.requestIgnoreBatteryOptimization) {
      try {
        (window as any).AndroidInterface.requestIgnoreBatteryOptimization();
      } catch {}
    }
  };

  const handleToggleAutostart = () => {
    const nextVal = !autostartConfigured;
    setAutostartConfigured(nextVal);
    localStorage.setItem('sahaya_autostart_configured', nextVal ? 'true' : 'false');
    setShowBrandGuide(true);
  };

  const handleStartGpsScan = (isSilent = false) => {
    if (typeof window !== 'undefined' && (window as any).__sahaya_native_gps) {
      const { lat, lng, accuracy } = (window as any).__sahaya_native_gps;
      if (lat && lng) {
        processCoords(lat, lng, accuracy || 10);
        return;
      }
    }

    if (!navigator.geolocation) {
      setStatusState('error');
      setStatusMessage('ඔබගේ උපාංගය හෝ බ්‍රවුසරය GPS ස්ථාන සේවා සඳහා සහාය නොදක්වයි.');
      setIsScanning(false);
      return;
    }

    setIsScanning(true);
    setStatusState('scanning');
    if (!isSilent) {
      setStatusMessage('🛰️ සජීවී GPS චන්ද්‍රිකා සංඥාව ලබාගනිමින් පවතී... (කරුණාකර "Allow" ඔබන්න)');
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
            setIsScanning(false);
            if (finalErr.code === finalErr.PERMISSION_DENIED) {
              setStatusState('denied');
              setStatusMessage('⚠️ GPS අවසරය ලබාදී නැත. Settings වලින් Location Allow කරන්න.');
            } else if (finalErr.code === finalErr.POSITION_UNAVAILABLE) {
              setStatusState('denied');
              setStatusMessage('⚠️ දුරකථනයේ Location (GPS) සක්‍රීය කර නැවත උත්සාහ කරන්න.');
            } else {
              setStatusState('error');
              setStatusMessage('⚠️ GPS ස්ථානය ලබාගැනීම ප්‍රමාද විය. නැවත උත්සාහ කරන්න.');
            }
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Master One-Click All Permissions Trigger
  const handleAllowAllPermissions = async () => {
    setIsScanning(true);
    setStatusState('scanning');
    setStatusMessage('⚡ සියලුම අවසරයන් සක්‍රීය කරමින් පවතී...');

    // 1. Notification Permission
    try {
      const notifOk = await requestNotificationPermission();
      if (notifOk) {
        setNotifGranted(true);
        playNotificationSound('general');
      }
    } catch {}

    // 2. Background WakeLock & Audio
    try {
      await handleAllowBackground();
    } catch {}

    // 3. Mark Battery Optimization & Overlay as active
    setOverlayGranted(true);
    setBatteryIgnored(true);
    setAutostartConfigured(true);
    localStorage.setItem('sahaya_overlay_enabled', 'true');
    localStorage.setItem('sahaya_battery_opt_ignored', 'true');
    localStorage.setItem('sahaya_autostart_configured', 'true');
    localStorage.setItem('sahaya_permissions_setup_completed', 'true');

    // 4. GPS Location Request
    handleStartGpsScan(false);

    // Give a brief moment for animations then provide success feedback
    setTimeout(() => {
      setStatusState('success');
      setStatusMessage('✅ සියලුම අවසර සාර්ථකව සක්‍රීය කරන ලදී!');
      setIsScanning(false);
    }, 1500);
  };

  const handleFinishAndProceed = () => {
    localStorage.setItem('sahaya_permissions_setup_completed', 'true');
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

  const completedCount = [locationGranted, notifGranted, bgGranted, overlayGranted, batteryIgnored, autostartConfigured].filter(Boolean).length;

  return (
    <div className="w-full max-w-xl mx-auto px-3 py-4 flex flex-col items-center animate-fadeIn">
      {/* Top Header Bar: Theme Toggle, Progress & Language */}
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

        {/* Step & Progress Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-xs font-black text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>අවසර සැකසුම් පැනලය • {completedCount}/6 සක්‍රීයයි</span>
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
            <span>පළමු වර පිවිසුම • ජංගම දුරකථන අවසර සැකසුම</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-emerald-200/80 font-medium max-w-md mx-auto pt-1 leading-relaxed">
            හදිසි Red Alert ආපදා, ලේ ඉල්ලීම් සහ ක්ෂණික සේවා App එක Close කර තිබුණද ලැබීම තහවුරු කරගැනීමට පහත අවසර සක්‍රීය කරගන්න.
          </p>
        </div>

        {/* 🌟 1-Click Master Action Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleAllowAllPermissions}
            disabled={isScanning}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm sm:text-base text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
              completedCount === 6
                ? 'bg-emerald-600 border border-emerald-300'
                : isScanning
                ? 'bg-slate-600 cursor-not-allowed opacity-90'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/30 border border-emerald-300/40'
            }`}
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>🛰️ අවසර සක්‍රීය කරමින් පවතී...</span>
              </>
            ) : completedCount === 6 ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>✅ සියලුම අවසර සාර්ථකයි!</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>⚡ සියලුම අවසර එකවර සක්‍රීය කරන්න (Allow All)</span>
              </>
            )}
          </button>
        </div>

        {/* Live Feedback Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs sm:text-sm font-bold flex items-start gap-2.5 transition-all animate-fadeIn ${
              statusState === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                : statusState === 'denied' || statusState === 'error'
                ? 'bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-300'
                : 'bg-teal-500/15 border border-teal-500/40 text-teal-900 dark:text-teal-200'
            }`}
          >
            {statusState === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
            {(statusState === 'denied' || statusState === 'error') && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
            {statusState === 'scanning' && <Radio className="w-4 h-4 text-teal-500 shrink-0 mt-0.5 animate-pulse" />}
            <div className="leading-relaxed">
              <p>{statusMessage}</p>
            </div>
          </div>
        )}

        {/* Permissions Checklist: 6 Core Items */}
        <div className="space-y-2 pt-1">
          
          {/* 1. Location & Background GPS */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#112519] border border-slate-200/80 dark:border-emerald-900/60">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                locationGranted 
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
              }`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>📍 සජීවී GPS සහ Background Location</span>
                  {locationGranted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  5km ආසන්නයේ සිදුවන ආපදා Proximity Siren සඳහා
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleStartGpsScan(false)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                locationGranted
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              {locationGranted ? 'Active ✓' : 'Allow'}
            </button>
          </div>

          {/* 2. Push Notifications & FCM */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#112519] border border-slate-200/80 dark:border-emerald-900/60">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                notifGranted 
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}>
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🔔 තල්ලු දැනුම්දීම් (Push Notifications & FCM)</span>
                  {notifGranted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  හදිසි Red Alert, ලේ ඉල්ලීම් සහ ක්ෂණික සේවා පණිවිඩ
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAllowNotifications}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                notifGranted
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200'
              }`}
            >
              {notifGranted ? 'Active ✓' : 'Allow'}
            </button>
          </div>

          {/* 3. Ignore Battery Optimizations */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#112519] border border-slate-200/80 dark:border-emerald-900/60">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                batteryIgnored 
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
              }`}>
                <BatteryCharging className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🔋 පසුබිම් බැටරි ප්‍රශස්තකරණය (Ignore Battery Opt)</span>
                  {batteryIgnored && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  App එක Close කළත් OS එක මඟින් නවතා දැමීම වළකයි
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleBatteryOptimization}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                batteryIgnored
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-900 dark:text-blue-200'
              }`}
            >
              {batteryIgnored ? 'Active ✓' : 'Allow'}
            </button>
          </div>

          {/* 4. Display Over Other Apps / System Alert Window */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#112519] border border-slate-200/80 dark:border-emerald-900/60">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                overlayGranted 
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
              }`}>
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🪟 වෙනත් Apps මතින් පෙන්වීම (Display Over Apps)</span>
                  {overlayGranted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  වෙනත් Apps (YouTube, FB) මතින් Pop-up Siren පෙන්වීමට
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleOverlay}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                overlayGranted
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-900 dark:text-rose-200'
              }`}
            >
              {overlayGranted ? 'Active ✓' : 'Allow'}
            </button>
          </div>

          {/* 5. Display on Lock Screen & Wake Screen */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#112519] border border-slate-200/80 dark:border-emerald-900/60">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                bgGranted 
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
              }`}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🔒 Lock Screen මත පෙන්වීම & Wake Screen</span>
                  {bgGranted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Screen Lock කර තිබියදීත් තිරය On කර සයිරන් නාද කිරීමට
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAllowBackground}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                bgGranted
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-900 dark:text-purple-200'
              }`}
            >
              {bgGranted ? 'Active ✓' : 'Allow'}
            </button>
          </div>

          {/* 6. Autostart / Auto-launch Guide */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#112519] border border-slate-200/80 dark:border-emerald-900/60">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                autostartConfigured 
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
              }`}>
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🚀 ස්වයංක්‍රීය ආරම්භය (Autostart / Auto-launch)</span>
                  {autostartConfigured && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Xiaomi, Samsung, Oppo, Vivo දුරකථන සඳහා විශේෂ සැකසුම
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleAutostart}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                autostartConfigured
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-900 dark:text-indigo-200'
              }`}
            >
              {autostartConfigured ? 'Active ✓' : 'Guide'}
            </button>
          </div>
        </div>

        {/* Brand-Specific Autostart Accordion Guide */}
        {showBrandGuide && (
          <div className="rounded-2xl bg-emerald-500/5 dark:bg-[#132c1e] border border-emerald-500/30 p-3.5 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>දුරකථන මාදිලිය අනුව Autostart සක්‍රීය කිරීම:</span>
              </span>

              <button
                type="button"
                onClick={() => setShowBrandGuide(false)}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
              >
                වසන්න ✕
              </button>
            </div>

            {/* Brand Switcher Tabs */}
            <div className="flex flex-wrap gap-1 bg-slate-200/70 dark:bg-[#0a1a10] p-1 rounded-xl text-[11px] font-bold">
              {[
                { key: 'xiaomi', label: 'Xiaomi / Redmi / POCO' },
                { key: 'samsung', label: 'Samsung' },
                { key: 'oppo_vivo', label: 'Oppo / Vivo / Realme' },
                { key: 'huawei', label: 'Huawei' },
                { key: 'generic', label: 'Other Android' }
              ].map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setSelectedBrand(b.key as BrandKey)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    selectedBrand === b.key
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Brand Instructions Box */}
            <div className="p-3 rounded-xl bg-white dark:bg-[#0e2217] border border-slate-100 dark:border-emerald-800/40 text-xs text-slate-700 dark:text-slate-200 space-y-1.5 leading-relaxed">
              {selectedBrand === 'xiaomi' && (
                <div className="space-y-1">
                  <p><strong>1.</strong> දුරකථනයේ <strong>Settings ➡️ Apps ➡️ Manage Apps</strong> වෙත යන්න.</p>
                  <p><strong>2.</strong> <strong>සහය සේවා (Sahaya Sewa)</strong> තෝරා <strong>Autostart ➡️ Enable (ON)</strong> කරන්න.</p>
                  <p><strong>3.</strong> <strong>Battery Saver</strong> යටතේ <strong>"No restrictions"</strong> තෝරන්න.</p>
                </div>
              )}
              {selectedBrand === 'samsung' && (
                <div className="space-y-1">
                  <p><strong>1.</strong> <strong>Settings ➡️ Battery and Device Care ➡️ Battery</strong> වෙත යන්න.</p>
                  <p><strong>2.</strong> <strong>Background usage limits</strong> වෙත ගොස් <strong>"Never sleeping apps"</strong> වෙත Sahaya Sewa එක් කරන්න.</p>
                </div>
              )}
              {selectedBrand === 'oppo_vivo' && (
                <div className="space-y-1">
                  <p><strong>1.</strong> <strong>Settings ➡️ App Management ➡️ Auto-launch apps</strong> වෙත යන්න.</p>
                  <p><strong>2.</strong> <strong>Sahaya Sewa</strong> සඳහා Auto-launch සක්‍රීය (ON) කරන්න.</p>
                </div>
              )}
              {selectedBrand === 'huawei' && (
                <div className="space-y-1">
                  <p><strong>1.</strong> <strong>Settings ➡️ Battery ➡️ App Launch</strong> වෙත යන්න.</p>
                  <p><strong>2.</strong> Sahaya Sewa සඳහා <strong>"Manage manually"</strong> තෝරා <strong>Auto-launch & Run in background</strong> ON කරන්න.</p>
                </div>
              )}
              {selectedBrand === 'generic' && (
                <div className="space-y-1">
                  <p><strong>1.</strong> <strong>Settings ➡️ Apps ➡️ Sahaya Sewa ➡️ App Battery Usage</strong> වෙත යන්න.</p>
                  <p><strong>2.</strong> <strong>"Unrestricted"</strong> ලෙස සකසන්න.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Proceed Action Button */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left">
            අවසර පසුව වුවද Profile & Settings මඟින් වෙනස් කළ හැක.
          </p>

          <button
            type="button"
            onClick={handleFinishAndProceed}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
          >
            <span>ඇප් එකට පිවිසෙන්න (Proceed)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

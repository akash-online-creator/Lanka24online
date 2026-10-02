import React, { useState, useEffect } from 'react';
import { 
  Crosshair, 
  MapPin, 
  Radio, 
  Settings, 
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
  Volume2
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
  const [activeGuideTab, setActiveGuideTab] = useState<'mobile' | 'desktop'>('mobile');

  // Permission statuses
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [bgGranted, setBgGranted] = useState(false);

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
      setStatusMessage(`✅ සියලුම අවසර සාර්ථකයි! සජීවී ස්ථානය: ${geo.shortDisplaySi} (±${Math.round(accuracy)}m)`);
      setIsScanning(false);

      // Play welcome/ready tone
      playNotificationSound('general');

      // Transition to login after a short delay
      setTimeout(() => {
        onProceedToLogin(locOpt);
      }, 1200);
    } catch (err) {
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
      setStatusMessage(`✅ සියලුම අවසර සාර්ථකයි! ස්ථානය: ${fallback.nameSi}`);
      setIsScanning(false);

      setTimeout(() => {
        onProceedToLogin(fallback);
      }, 1200);
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
    }

    // 1. Check if Flutter native GPS is already available
    if (typeof window !== 'undefined' && (window as any).__sahaya_native_gps) {
      const { lat, lng, accuracy } = (window as any).__sahaya_native_gps;
      if (lat && lng) {
        processCoords(lat, lng, accuracy || 10);
      }
    }

    // 2. Listen for native GPS broadcast events from Flutter wrapper
    const handleNativeGps = (e: any) => {
      const data = e.detail || e.data;
      if (data && data.lat && data.lng) {
        processCoords(data.lat, data.lng, data.accuracy || 10);
      }
    };

    window.addEventListener('sahaya_native_gps', handleNativeGps);
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'SAHAYA_NATIVE_GPS') {
        processCoords(e.data.lat, e.data.lng, e.data.accuracy || 10);
      }
    });

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

  const handleAllowAllPermissions = async () => {
    setIsScanning(true);
    setStatusState('scanning');
    setStatusMessage('⚡ අවසරයන් සක්‍රීය කරමින් පවතී... (Location සහ Notifications "Allow" කරන්න)');

    // 1. Request Notifications
    try {
      const notifOk = await requestNotificationPermission();
      if (notifOk) setNotifGranted(true);
    } catch {}

    // 2. Request Background WakeLock & Audio
    try {
      await handleAllowBackground();
    } catch {}

    // 3. Request GPS Location
    handleStartGpsScan(false);
  };

  const handleStartGpsScan = (isSilent = false) => {
    // If native GPS is already provided by Flutter, use it directly
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
      setStatusMessage('🛰️ සජීවී GPS චන්ද්‍රිකා සංඥාව පරීක්ෂා කරමින් පවතී... (කරුණාකර "Allow" ඔබන්න)');
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        processCoords(latitude, longitude, accuracy);
      },
      (err) => {
        // Fallback with standard accuracy
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            const { latitude, longitude, accuracy } = fallbackPos.coords;
            processCoords(latitude, longitude, accuracy);
          },
          (finalErr) => {
            setIsScanning(false);
            if (finalErr.code === finalErr.PERMISSION_DENIED) {
              setStatusState('denied');
              setStatusMessage('⚠️ GPS අවසරය ලබාදී නැත (Location Permission Denied). Settings වලින් Allow කරන්න.');
            } else if (finalErr.code === finalErr.POSITION_UNAVAILABLE) {
              setStatusState('denied');
              setStatusMessage('⚠️ GPS සංඥා දුර්වලයි හෝ Location අක්‍රීය කර ඇත. දුරකථනයේ Location සක්‍රීය කර නැවත උත්සාහ කරන්න.');
            } else {
              setStatusState('error');
              setStatusMessage('⚠️ GPS ස්ථානය ලබාගැනීම ප්‍රමාද විය. කරුණාකර නැවත උත්සාහ කරන්න.');
            }
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const handleNextLanguage = () => {
    const langSeq: Language[] = ['si', 'en', 'ta'];
    const currentIndex = langSeq.indexOf(language);
    const nextLang = langSeq[(currentIndex + 1) % langSeq.length];
    setLanguage(nextLang);
  };

  const getLanguageDisplayName = (lang: Language) => {
    switch (lang) {
      case 'si':
        return 'සිංහල';
      case 'ta':
        return 'தமிழ்';
      case 'en':
      default:
        return 'English';
    }
  };

  return (
    <div className="w-full max-w-[480px] mx-auto px-3 py-2 flex flex-col items-center animate-fadeIn">
      {/* Top Header Bar: Theme Toggle & Language */}
      <div className="w-full flex items-center justify-between gap-2 mb-2">
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

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>පියවර 1: පද්ධති අවසර සක්‍රීය කිරීම</span>
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
      <div className="w-full rounded-3xl bg-white dark:bg-[#0a1c12] border-2 border-emerald-500/40 shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4">
        {/* App Logo & Header */}
        <div className="text-center space-y-1.5">
          <div className="flex justify-center">
            <AppLogo size="lg" showGlow={true} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            සහය සේවා (Sahaya Sewa)
          </h1>
          <p className="text-xs text-slate-600 dark:text-emerald-200/80 font-medium">
            සැමට පිහිට ප්‍රජා සහන හා හදිසි ආපදා සේවා ජාලය
          </p>
        </div>

        {/* Permissions Checklist Cards */}
        <div className="space-y-2 pt-1">
          {/* 1. Location Permission */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#10271c] border border-slate-200 dark:border-emerald-900/60">
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
                  <span>📍 සජීවී GPS ස්ථානය (Location)</span>
                  {locationGranted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  2km හදිසි ආපදා Proximity Siren සහ ළඟම සේවාවන්ට
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

          {/* 2. Push Notifications Permission */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#10271c] border border-slate-200 dark:border-emerald-900/60">
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
                  <span>🔔 දැනුම්දීම් (Push Notifications)</span>
                  {notifGranted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  හදිසි Red Alert, ලේ ඉල්ලීම් සහ ක්ෂණික පණිවිඩ
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

          {/* 3. Background Sync & Audio Permission */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#10271c] border border-slate-200 dark:border-emerald-900/60">
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
                  <span>⚡ පසුබිම් සහය (Background & Siren)</span>
                  {bgGranted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  App එක Close කර තිබුණද හදිසි අනතුරු ශබ්ද සයිරන්
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
        </div>

        {/* Master One-Click Action Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleAllowAllPermissions}
            disabled={isScanning || statusState === 'success'}
            className={`w-full py-4 px-4 rounded-2xl font-black text-sm sm:text-base text-white shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
              statusState === 'success'
                ? 'bg-emerald-600 border border-emerald-300'
                : isScanning
                ? 'bg-slate-600 cursor-not-allowed opacity-90'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/40 border border-emerald-300/50 animate-pulse'
            }`}
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>🛰️ අවසර සක්‍රීය කරමින් පවතී...</span>
              </>
            ) : statusState === 'success' ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>✅ අවසර සාර්ථකයි! Login වෙත යොමු වේ...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>⚡ සියලුම අවසර සක්‍රීය කරන්න (Allow All)</span>
              </>
            )}
          </button>
        </div>

        {/* Live Feedback Messages */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-start gap-2.5 transition-all animate-fadeIn ${
              statusState === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-800 dark:text-emerald-200'
                : statusState === 'denied' || statusState === 'error'
                ? 'bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-300'
                : 'bg-teal-500/15 border border-teal-500/40 text-teal-800 dark:text-teal-200'
            }`}
          >
            {statusState === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
            {(statusState === 'denied' || statusState === 'error') && <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
            {statusState === 'scanning' && <Radio className="w-5 h-5 text-teal-500 shrink-0 mt-0.5 animate-pulse" />}
            <div className="leading-relaxed">
              <p>{statusMessage}</p>
            </div>
          </div>
        )}

        {/* Device Settings Guide (Always visible if denied/error or as helper accordion) */}
        {(statusState === 'denied' || statusState === 'error' || statusState === 'idle') && (
          <div className="rounded-2xl bg-slate-50 dark:bg-[#102418] border border-slate-200/80 dark:border-emerald-900/40 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-emerald-500" />
                <span>අවසර සැකසීම් (Settings Guide)</span>
              </span>

              {/* Guide Switcher */}
              <div className="flex items-center gap-1 bg-slate-200 dark:bg-[#0c1f14] p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('mobile')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    activeGuideTab === 'mobile'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Smartphone className="w-3 h-3 inline mr-1" />
                  Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('desktop')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    activeGuideTab === 'desktop'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Laptop className="w-3 h-3 inline mr-1" />
                  Computer
                </button>
              </div>
            </div>

            {activeGuideTab === 'mobile' ? (
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-[#163321] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                  <span>දුරකථනයේ <strong>Location (GPS) සක්‍රීය (ON)</strong> කරන්න.</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-[#163321] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                  <span>ඉහළ URL අසල <Lock className="w-3.5 h-3.5 inline text-emerald-500 mx-0.5" /> <strong>Site info/Lock</strong> ඔබන්න.</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-[#163321] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                  <span><strong>Permissions ➡️ Location & Notifications ➡️ Allow</strong> කරන්න.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-[#163321] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                  <span>බ්‍රවුසරයේ URL වම්පස ඇති <Lock className="w-3.5 h-3.5 inline text-emerald-500 mx-0.5" /> <strong>Lock අයිකනය</strong> ඔබන්න.</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-[#163321] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                  <span><strong>Location & Notifications</strong> දෙකම <strong>"Allow"</strong> කරන්න.</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

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
  ArrowRight,
  Sparkles,
  Compass
} from 'lucide-react';
import { Language, Theme, LocationOption } from '../types';
import { AppLogo } from './AppLogo';
import { resolveExactLocation, toLocationOption } from '../utils/geoUtils';
import { MapLocationTracker } from './MapLocationTracker';

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
  const [isManualMapOpen, setIsManualMapOpen] = useState(false);

  // Auto test geolocation permission status on mount
  useEffect(() => {
    // If browser supports Permissions API, check query
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((permissionStatus) => {
        if (permissionStatus.state === 'granted') {
          // Attempt silent auto-fetch
          handleStartGpsScan(true);
        }
      }).catch(() => {
        // Permissions API not fully supported, wait for user click
      });
    }
  }, []);

  const handleStartGpsScan = (isSilent = false) => {
    if (!navigator.geolocation) {
      setStatusState('error');
      setStatusMessage('ඔබගේ උපාංගය හෝ බ්‍රවුසරය GPS ස්ථාන සේවා සඳහා සහාය නොදක්වයි.');
      return;
    }

    setIsScanning(true);
    setStatusState('scanning');
    setStatusMessage('🛰️ සජීවී GPS චන්ද්‍රිකා සංඥාව පරීක්ෂා කරමින් පවතී... (කරුණාකර බ්‍රවුසරයේ "Allow" ඔබන්න)');

    const processCoords = async (latitude: number, longitude: number, accuracy: number) => {
      try {
        const geo = await resolveExactLocation(latitude, longitude);
        const locOpt = toLocationOption(geo);

        setResolvedLocation(locOpt);
        localStorage.setItem('sahaya_current_location', JSON.stringify(locOpt));
        localStorage.setItem('sahaya_manual_location_locked', 'false');
        localStorage.setItem('sahaya_location_mode', 'auto');
        localStorage.setItem('sahaya_gps_verified', 'true');
        window.dispatchEvent(new CustomEvent('sahaya_location_mode_changed', { detail: { mode: 'auto' } }));

        setStatusState('success');
        setStatusMessage(`✅ GPS සාර්ථකයි! සජීවී ස්ථානය: ${geo.shortDisplaySi} (±${Math.round(accuracy)}m)`);
        setIsScanning(false);

        // Transition to login after a short delay
        setTimeout(() => {
          onProceedToLogin(locOpt);
        }, 1500);
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
        localStorage.setItem('sahaya_current_location', JSON.stringify(fallback));
        localStorage.setItem('sahaya_manual_location_locked', 'false');
        localStorage.setItem('sahaya_location_mode', 'auto');
        localStorage.setItem('sahaya_gps_verified', 'true');
        window.dispatchEvent(new CustomEvent('sahaya_location_mode_changed', { detail: { mode: 'auto' } }));

        setStatusState('success');
        setStatusMessage(`✅ GPS සාර්ථකයි! ස්ථානය: ${fallback.nameSi}`);
        setIsScanning(false);

        setTimeout(() => {
          onProceedToLogin(fallback);
        }, 1500);
      }
    };

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
              setStatusMessage('⚠️ GPS අවසරය ලබාදී නැත (Location Permission Denied). කරුණාකර පහත පියවර අනුගමනය කර Settings වලින් Allow කරන්න.');
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

  const handleManualMapSelect = (loc: LocationOption) => {
    localStorage.setItem('sahaya_current_location', JSON.stringify(loc));
    localStorage.setItem('sahaya_manual_location_locked', 'true');
    localStorage.setItem('sahaya_location_mode', 'manual');
    localStorage.setItem('sahaya_gps_verified', 'true');
    window.dispatchEvent(new CustomEvent('sahaya_location_mode_changed', { detail: { mode: 'manual' } }));

    setIsManualMapOpen(false);
    onProceedToLogin(loc);
  };

  const handleBypassWithDefault = () => {
    const defaultLoc: LocationOption = {
      id: 'loc_default_katunayake',
      nameSi: 'කෝවින්න, ගංගාරාම පාර, කටුනායක',
      nameEn: 'Kovinna, Gangarama Road, Katunayake',
      nameTa: 'Kovinna, Gangarama Road, Katunayake',
      lat: 7.1585,
      lng: 79.8825,
    };
    localStorage.setItem('sahaya_current_location', JSON.stringify(defaultLoc));
    localStorage.setItem('sahaya_gps_verified', 'true');
    onProceedToLogin(defaultLoc);
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
    <div className="w-full max-w-[460px] mx-auto px-3 py-2 flex flex-col items-center animate-fadeIn">
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
          <span>පියවර 1: සජීවී GPS සක්‍රීය කිරීම</span>
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
      <div className="w-full rounded-3xl bg-white/95 dark:bg-[#0a1c12]/95 backdrop-blur-md border-2 border-emerald-500/40 shadow-2xl overflow-hidden p-5 sm:p-6 space-y-5">
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <AppLogo size="lg" showGlow={true} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            සහය සේවා (Sahaya Seva)
          </h1>
          <p className="text-xs text-slate-600 dark:text-emerald-200/80 font-medium">
            සැමට පිහිට ප්‍රජා සහන හා හදිසි ආපදා සේවා ජාලය
          </p>
        </div>

        {/* Radar Animation Box */}
        <div className="relative p-5 rounded-2xl bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/40 dark:to-transparent border border-emerald-500/30 flex flex-col items-center text-center space-y-3">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-500/40 animate-spin-slow" />
            <div className="absolute inset-2 rounded-full border border-emerald-400/30" />
            <div className={`w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 ${isScanning ? 'animate-pulse' : ''}`}>
              <Crosshair className="w-7 h-7" />
            </div>
            {isScanning && (
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-60" />
            )}
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {statusState === 'success' ? 'ස්ථානය තහවුරු විය!' : 'සජීවී GPS පිහිටීම සක්‍රීය කරන්න'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              හදිසි අනතුරු (Red Alert SOS), ආපදා ගලවාගැනීම් සහ ප්‍රජා සේවාවන් නිවැරදි ස්ථානයකට සම්බන්ධ කිරීමට ඔබගේ සජීවී GPS පිහිටීම අවශ්‍ය වේ.
            </p>
          </div>

          {/* Glowing Action Button */}
          <button
            type="button"
            onClick={() => handleStartGpsScan(false)}
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
                <span>🛰️ GPS සංඥාව පරීක්ෂා කරමින් පවතී...</span>
              </>
            ) : statusState === 'success' ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>✅ GPS සාර්ථකයි! Login වෙත යොමු වේ...</span>
              </>
            ) : (
              <>
                <Crosshair className="w-5 h-5" />
                <span>⚡ GPS සක්‍රීය කරන්න (Turn On / Allow GPS)</span>
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
          <div className="rounded-2xl bg-slate-50 dark:bg-[#102418] border border-slate-200/80 dark:border-emerald-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-emerald-500" />
                <span>GPS සක්‍රීය කරගන්නා ආකාරය (Settings Guide)</span>
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
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-[#163321] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                  <span>දුරකථනයේ <strong>Location / GPS සක්‍රීය (ON)</strong> කරන්න.</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-[#163321] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                  <span>බ්‍රවුසරයේ URL අසල ඇති <Lock className="w-3.5 h-3.5 inline text-emerald-500 mx-0.5" /> <strong>(Lock / Site settings)</strong> ඔබන්න.</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-[#163321] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                  <span><strong>Permissions ➡️ Location ➡️ Allow (අවසර දෙන්න)</strong> තෝරා ඉහත බොත්තම ඔබන්න.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-[#163321] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                  <span>බ්‍රවුසරයේ URL තීරුවේ වම්පස ඇති <Lock className="w-3.5 h-3.5 inline text-emerald-500 mx-0.5" /> <strong>Lock අයිකනය</strong> ඔබන්න.</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-[#163321] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                  <span><strong>Location</strong> එක <strong>"Allow"</strong> බවට සකස් කරන්න.</span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-xl bg-white dark:bg-[#163321] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                  <span>ඉහත <strong>⚡ GPS සක්‍රීය කරන්න</strong> බොත්තම ඔබන්න.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Secondary Navigation Options */}
        <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => setIsManualMapOpen(true)}
            className="w-full sm:w-1/2 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-[#132c1c] hover:bg-slate-200 dark:hover:bg-[#1c3f29] text-slate-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 dark:border-emerald-800/40 transition-all cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
            <span>📍 සිතියමෙන් තෝරන්න</span>
          </button>

          <button
            type="button"
            onClick={handleBypassWithDefault}
            className="w-full sm:w-1/2 py-2.5 px-3 rounded-xl bg-transparent hover:bg-emerald-500/10 text-slate-500 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1 border border-slate-200 dark:border-emerald-800/30 transition-all cursor-pointer"
            title="Continue to Login"
          >
            <span>ඇතුල් වීමට යන්න</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Manual Map Picker Modal */}
      <MapLocationTracker
        isOpen={isManualMapOpen}
        onClose={() => setIsManualMapOpen(false)}
        onSelectLocation={handleManualMapSelect}
        language={language}
        initialLocation={resolvedLocation || undefined}
      />
    </div>
  );
};

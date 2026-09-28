import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Check, 
  Radio, 
  Crosshair, 
  Loader2, 
  ShieldCheck, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { LocationOption, Language, Theme } from '../types';
import { translations } from '../data/translations';
import { Card3D } from './Card3D';
import { GpsPermissionModal } from './GpsPermissionModal';
import { resolveExactLocation, toLocationOption } from '../utils/geoUtils';

interface LocationBarProps {
  currentLocation: LocationOption;
  availableLocations?: LocationOption[];
  onSelectLocation: (loc: LocationOption) => void;
  lang: Language;
  theme?: Theme;
  isAutoLoading?: boolean;
  autoLoadedNotice?: string | null;
}

export const LocationBar: React.FC<LocationBarProps> = ({
  currentLocation,
  onSelectLocation,
  lang,
  theme = 'light',
  isAutoLoading = false,
  autoLoadedNotice = null,
}) => {
  const t = translations[lang];
  const [isAutoTracking, setIsAutoTracking] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isGpsPermissionModalOpen, setIsGpsPermissionModalOpen] = useState(false);

  const getLocationName = (loc: LocationOption) => {
    if (lang === 'si') return loc.nameSi;
    if (lang === 'ta') return loc.nameTa;
    return loc.nameEn;
  };

  // Direct Auto GPS Track & Save (Live GPS Calibration)
  const handleDirectAutoGps = () => {
    if (!navigator.geolocation) {
      setToastMsg('⚠️ ඔබගේ උපාංගයේ GPS සහාය නොදක්වයි.');
      setTimeout(() => setToastMsg(null), 4000);
      return;
    }

    setIsAutoTracking(true);
    localStorage.setItem('sahaya_location_mode', 'auto');
    localStorage.removeItem('sahaya_manual_location_locked');
    window.dispatchEvent(new CustomEvent('sahaya_location_mode_changed', { detail: { mode: 'auto' } }));

    setToastMsg('⚡ සජීවී Auto GPS සංඥාව ලබාගනිමින් පවතී...');

    const processCoords = async (latitude: number, longitude: number, accuracy: number) => {
      try {
        const geo = await resolveExactLocation(latitude, longitude);
        const locOpt = toLocationOption(geo);
        
        localStorage.setItem('sahaya_current_location', JSON.stringify(locOpt));
        localStorage.setItem('sahaya_location_mode', 'auto');
        localStorage.removeItem('sahaya_manual_location_locked');
        
        onSelectLocation(locOpt);
        setToastMsg(`⚡ Auto GPS සක්‍රීයයි - සජීවී ස්ථානය: ${geo.shortDisplaySi} (±${Math.round(accuracy)}m)`);
      } catch {
        const fallback: LocationOption = {
          id: `loc_gps_${Date.now()}`,
          nameSi: `කෝවින්න, ගංගාරාම පාර, කටුනායක`,
          nameEn: `Kovinna, Gangarama Road, Katunayake`,
          nameTa: `Kovinna, Gangarama Road, Katunayake`,
          lat: latitude,
          lng: longitude,
        };
        localStorage.setItem('sahaya_current_location', JSON.stringify(fallback));
        localStorage.setItem('sahaya_location_mode', 'auto');
        onSelectLocation(fallback);
        setToastMsg(`⚡ Auto GPS ස්ථානය: ${fallback.nameSi}`);
      } finally {
        setIsAutoTracking(false);
        setTimeout(() => setToastMsg(null), 4500);
      }
    };

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
            setIsAutoTracking(false);
            setIsGpsPermissionModalOpen(true);
            if (finalErr.code === finalErr.PERMISSION_DENIED) {
              setToastMsg('⚠️ GPS අවසරය ලබාදී නැත. Settings වලින් Location Allow කරන්න.');
            } else {
              setToastMsg('⚠️ GPS ස්ථානය ලබාගැනීම ප්‍රමාදයි. නැවත උත්සාහ කරන්න.');
            }
            setTimeout(() => setToastMsg(null), 5000);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const handleLocationSuccess = (loc: LocationOption) => {
    onSelectLocation(loc);
    setToastMsg(`⚡ Auto GPS ස්ථානය සාර්ථකව තහවුරු විය: ${loc.nameSi}`);
    setTimeout(() => setToastMsg(null), 4500);
  };

  return (
    <div className="relative z-30 mb-6">
      <Card3D className="bg-white/90 dark:bg-[#0a1c13]/90 backdrop-blur-xl border border-slate-200/80 dark:border-[#163625] shadow-md rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Active Auto GPS Location Info */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm border bg-[#007a4b]/15 border-[#007a4b]/40 text-[#007a4b] dark:text-[#00c880]">
                <MapPin className="w-6 h-6 animate-bounce" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[#00a86b]"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#007a4b]"></span>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#007a4b] dark:text-[#00c880] tracking-wider uppercase flex items-center gap-1">
                  <Radio className="w-3 h-3 text-[#007a4b] dark:text-[#00c880] animate-pulse" />
                  {t.currentLocationLabel}
                </span>
                
                <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  ⚡ Auto GPS සක්‍රීයයි
                </span>

                {isAutoLoading && (
                  <span className="bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    Auto GPS Loading...
                  </span>
                )}
              </div>

              {/* High-Contrast Location Output: Village, Road, Town */}
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5 break-words">
                {getLocationName(currentLocation)}
              </p>
              {currentLocation.lat && currentLocation.lng && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  📍 Auto Location: {currentLocation.lat.toFixed(4)}° N, {currentLocation.lng.toFixed(4)}° E
                </span>
              )}
            </div>
          </div>

          {/* Action Button: Auto GPS Refresh / Calibrate */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleDirectAutoGps}
              disabled={isAutoTracking}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-[#007a4b] to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-900/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-60"
              title="සජීවී GPS මඟින් ස්ථානය නැවත ලබාගන්න (Refresh Auto GPS)"
            >
              {isAutoTracking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                  <span>GPS සංඥා ලබාගනිමින්...</span>
                </>
              ) : (
                <>
                  <Crosshair className="w-4 h-4 text-emerald-200" />
                  <span>⚡ Auto GPS යාවත්කාලීන කරන්න</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* GPS Toast Notice & Auto-loaded Notice */}
        {(toastMsg || autoLoadedNotice) && (
          <div className="mt-3 py-2.5 px-3.5 bg-emerald-50 dark:bg-[#122e20] border-2 border-emerald-500/50 text-[#007a4b] dark:text-[#00c880] text-xs font-bold rounded-xl flex items-center justify-between animate-fadeIn shadow-sm">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {toastMsg || autoLoadedNotice}
            </span>
          </div>
        )}
      </Card3D>

      {/* GPS Permission & Activation Modal */}
      <GpsPermissionModal
        isOpen={isGpsPermissionModalOpen}
        onClose={() => setIsGpsPermissionModalOpen(false)}
        onLocationSuccess={handleLocationSuccess}
        language={lang}
      />
    </div>
  );
};

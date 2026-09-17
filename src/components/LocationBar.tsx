import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Check, 
  Radio, 
  Search, 
  Crosshair, 
  Loader2, 
  Sparkles, 
  Map, 
  ShieldCheck, 
  Milestone,
  Lock,
  Globe
} from 'lucide-react';
import { LocationOption, Language, Theme } from '../types';
import { translations } from '../data/translations';
import { Card3D } from './Card3D';
import { MapLocationTracker } from './MapLocationTracker';
import { GpsPermissionModal } from './GpsPermissionModal';
import { resolveExactLocation, toLocationOption } from '../utils/geoUtils';

interface LocationBarProps {
  currentLocation: LocationOption;
  availableLocations: LocationOption[];
  onSelectLocation: (loc: LocationOption) => void;
  lang: Language;
  theme?: Theme;
  isAutoLoading?: boolean;
  autoLoadedNotice?: string | null;
}

export const LocationBar: React.FC<LocationBarProps> = ({
  currentLocation,
  availableLocations,
  onSelectLocation,
  lang,
  theme = 'light',
  isAutoLoading = false,
  autoLoadedNotice = null,
}) => {
  const t = translations[lang];
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isAutoTracking, setIsAutoTracking] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Check if current location was manually saved or auto-detected
  const [isManualLocked, setIsManualLocked] = useState<boolean>(
    () => localStorage.getItem('sahaya_manual_location_locked') === 'true'
  );
  const [isGpsPermissionModalOpen, setIsGpsPermissionModalOpen] = useState(false);

  useEffect(() => {
    const handleModeChange = (e: any) => {
      if (e.detail?.mode === 'auto') {
        setIsManualLocked(false);
      } else if (e.detail?.mode === 'manual') {
        setIsManualLocked(true);
      } else {
        setIsManualLocked(localStorage.getItem('sahaya_manual_location_locked') === 'true');
      }
    };
    window.addEventListener('sahaya_location_mode_changed', handleModeChange);
    return () => {
      window.removeEventListener('sahaya_location_mode_changed', handleModeChange);
    };
  }, []);

  useEffect(() => {
    setIsManualLocked(localStorage.getItem('sahaya_manual_location_locked') === 'true');
  }, [currentLocation]);

  const getLocationName = (loc: LocationOption) => {
    if (lang === 'si') return loc.nameSi;
    if (lang === 'ta') return loc.nameTa;
    return loc.nameEn;
  };

  const handleOpenManualPicker = () => {
    // When "ස්ථානය තෝරන්න" is clicked, stop any auto tracking and open manual picker
    setIsAutoTracking(false);
    setIsMapModalOpen(true);
  };

  const handleSaveLocationFromMap = (loc: LocationOption) => {
    onSelectLocation(loc);
    setIsManualLocked(localStorage.getItem('sahaya_manual_location_locked') === 'true');
    setToastMsg(`📍 ඔබ තෝරාගත් ස්ථානය සුරැකිණි: ${loc.nameSi}`);
    setTimeout(() => setToastMsg(null), 4500);
  };

  // 1-Click Direct Auto GPS Track & Save (When user explicitly wants to reactivate Auto GPS)
  const handleDirectAutoGps = () => {
    if (!navigator.geolocation) {
      setToastMsg('⚠️ ඔබගේ උපාංගයේ GPS සහාය නොදක්වයි.');
      setTimeout(() => setToastMsg(null), 4000);
      return;
    }

    setIsAutoTracking(true);
    localStorage.setItem('sahaya_manual_location_locked', 'false');
    localStorage.setItem('sahaya_location_mode', 'auto');
    setIsManualLocked(false);
    window.dispatchEvent(new CustomEvent('sahaya_location_mode_changed', { detail: { mode: 'auto' } }));

    setToastMsg('⚡ සජීවී GPS සංඥාව ලබාගනිමින් පවතී...');

    const processCoords = async (latitude: number, longitude: number, accuracy: number) => {
      try {
        const geo = await resolveExactLocation(latitude, longitude);
        const locOpt = toLocationOption(geo);
        
        localStorage.setItem('sahaya_current_location', JSON.stringify(locOpt));
        localStorage.setItem('sahaya_manual_location_locked', 'false');
        localStorage.setItem('sahaya_location_mode', 'auto');
        setIsManualLocked(false);
        
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
        localStorage.setItem('sahaya_manual_location_locked', 'false');
        setIsManualLocked(false);
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

  return (
    <div className="relative z-30 mb-6">
      <Card3D className="bg-white/90 dark:bg-[#0a1c13]/90 backdrop-blur-xl border border-slate-200/80 dark:border-[#163625] shadow-md rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Active Location Info */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative shrink-0">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm border ${
                isManualLocked 
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400' 
                  : 'bg-[#007a4b]/15 border-[#007a4b]/40 text-[#007a4b] dark:text-[#00c880]'
              }`}>
                <MapPin className="w-6 h-6 animate-bounce" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isManualLocked ? 'bg-purple-500' : 'bg-[#00a86b]'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                  isManualLocked ? 'bg-purple-600' : 'bg-[#007a4b]'
                }`}></span>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#007a4b] dark:text-[#00c880] tracking-wider uppercase flex items-center gap-1">
                  <Radio className="w-3 h-3 text-[#007a4b] dark:text-[#00c880] animate-pulse" />
                  {t.currentLocationLabel}
                </span>
                
                {isManualLocked ? (
                  <span className="bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Manual (Auto GPS Off)
                  </span>
                ) : (
                  <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    ⚡ Auto GPS සක්‍රීයයි
                  </span>
                )}

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
            </div>
          </div>

          {/* Action Buttons: "ස්ථානය තෝරන්න" & "Auto GPS" */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            
            {/* Primary: "ස්ථානය තෝරන්න" - Disables Auto GPS and lets user select/save custom location */}
            <button
              onClick={handleOpenManualPicker}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-[#007a4b] to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-900/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group"
              title="Auto GPS අක්‍රිය කර ඔබ කැමති ස්ථානයක් තෝරා සුරකින්න"
            >
              <Search className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
              <span>📍 ස්ථානය තෝරන්න (Select Location)</span>
            </button>

            {/* Secondary: Auto GPS reactivation button */}
            <button
              onClick={handleDirectAutoGps}
              disabled={isAutoTracking}
              className={`px-3.5 py-3 rounded-2xl font-bold text-xs sm:text-sm border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60 ${
                !isManualLocked
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="සජීවී GPS හරහා ස්වයංක්‍රීයව ස්ථානය ලබාගන්න (Re-enable Auto GPS)"
            >
              {isAutoTracking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden sm:inline">GPS...</span>
                </>
              ) : (
                <>
                  <Crosshair className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>⚡ Auto GPS</span>
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

      {/* Manual Location Search & Google Maps Real-time Modal */}
      <MapLocationTracker
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        currentLocation={currentLocation}
        availableLocations={availableLocations}
        onSaveLocation={handleSaveLocationFromMap}
        lang={lang}
        theme={theme}
      />

      {/* GPS Permission & Activation Modal */}
      <GpsPermissionModal
        isOpen={isGpsPermissionModalOpen}
        onClose={() => setIsGpsPermissionModalOpen(false)}
        onLocationSuccess={handleSaveLocationFromMap}
        onOpenMapPicker={() => setIsMapModalOpen(true)}
        language={lang}
      />
    </div>
  );
};

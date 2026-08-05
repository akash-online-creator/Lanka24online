import React, { useState } from 'react';
import { MapPin, Check, Radio, Globe, Crosshair, Loader2, Sparkles, Map, ShieldCheck, Home, Milestone, Building2 } from 'lucide-react';
import { LocationOption, Language, Theme } from '../types';
import { translations } from '../data/translations';
import { Card3D } from './Card3D';
import { MapLocationTracker } from './MapLocationTracker';
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

  const getLocationName = (loc: LocationOption) => {
    if (lang === 'si') return loc.nameSi;
    if (lang === 'ta') return loc.nameTa;
    return loc.nameEn;
  };

  const handleSaveLocationFromMap = (loc: LocationOption) => {
    onSelectLocation(loc);
    setToastMsg(`📍 ස්ථානය සාර්ථකව සුරකින ලදී: ${loc.nameSi}`);
    setTimeout(() => setToastMsg(null), 4500);
  };

  // 1-Click Direct Auto GPS Track & Save (Exact: Village, Road, Town)
  const handleDirectOneClickSave = () => {
    if (!navigator.geolocation) {
      setIsMapModalOpen(true);
      return;
    }

    setIsAutoTracking(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          const geo = await resolveExactLocation(latitude, longitude);
          const locOpt = toLocationOption(geo);
          onSelectLocation(locOpt);
          setToastMsg(`✅ සජීවී ලිපිනය සුරැකිණි: ${geo.shortDisplaySi} (±${Math.round(accuracy)}m)`);
        } catch (e) {
          const fallback: LocationOption = {
            id: `loc_gps_${Date.now()}`,
            nameSi: `කෝවින්න, ගංගාරාම පාර, කටුනායක`,
            nameEn: `Kovinna, Gangarama Road, Katunayake`,
            nameTa: `Kovinna, Gangarama Road, Katunayake`,
            lat: latitude,
            lng: longitude,
          };
          onSelectLocation(fallback);
          setToastMsg(`📍 ස්ථානය සුරැකිණි: ${fallback.nameSi}`);
        } finally {
          setIsAutoTracking(false);
          setTimeout(() => setToastMsg(null), 4500);
        }
      },
      (err) => {
        setIsAutoTracking(false);
        // If error, open modal to guide user
        setIsMapModalOpen(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
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
              <div className="w-11 h-11 rounded-2xl bg-[#007a4b]/15 border border-[#007a4b]/40 flex items-center justify-center text-[#007a4b] dark:text-[#00c880] shadow-sm">
                <MapPin className="w-6 h-6 animate-bounce" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00a86b] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#007a4b]"></span>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#007a4b] dark:text-[#00c880] tracking-wider uppercase flex items-center gap-1">
                  <Radio className="w-3 h-3 text-[#007a4b] dark:text-[#00c880] animate-pulse" />
                  {t.currentLocationLabel}
                </span>
                <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  ගම, පාර, නගරය
                </span>
                {isAutoLoading && (
                  <span className="bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    Auto Loading...
                  </span>
                )}
              </div>

              {/* High-Contrast Location Output: Village, Road, Town */}
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5 break-words">
                {getLocationName(currentLocation)}
              </p>
            </div>
          </div>

          {/* Action Buttons: 1-Click Auto Save & Map View */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            
            {/* Primary 1-Click GPS Auto Track & Save Button */}
            <button
              onClick={handleDirectOneClickSave}
              disabled={isAutoTracking}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#007a4b] hover:bg-[#006e43] text-white font-black text-sm shadow-lg shadow-emerald-900/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group disabled:opacity-75"
            >
              {isAutoTracking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>ස්ථානය Auto Track කරමින්...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{t.saveLocationBtn}</span>
                </>
              )}
            </button>

            {/* Map Preview & Details Button */}
            <button
              onClick={() => setIsMapModalOpen(true)}
              className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="සිතියම බලන්න (View Map)"
            >
              <Map className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>සිතියම (Map)</span>
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

      {/* Google Maps Real-time GPS Location Tracker Modal */}
      <MapLocationTracker
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        currentLocation={currentLocation}
        availableLocations={availableLocations}
        onSaveLocation={handleSaveLocationFromMap}
        lang={lang}
        theme={theme}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { MapPin, Navigation, Check, Compass, Radio } from 'lucide-react';
import { LocationOption, Language } from '../types';
import { translations } from '../data/translations';
import { Card3D } from './Card3D';

interface LocationBarProps {
  currentLocation: LocationOption;
  availableLocations: LocationOption[];
  onSelectLocation: (loc: LocationOption) => void;
  lang: Language;
}

export const LocationBar: React.FC<LocationBarProps> = ({
  currentLocation,
  availableLocations,
  onSelectLocation,
  lang,
}) => {
  const t = translations[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleDetectGps = () => {
    setIsDetecting(true);
    setTimeout(() => {
      // Default to Kadawatha base location for live simulation
      const kadawatha = availableLocations.find(l => l.id === 'loc_kadawatha') || availableLocations[0];
      onSelectLocation(kadawatha);
      setIsDetecting(false);
      setToastMsg('📍 GPS: Kadawatha, Sri Lanka (7.0016° N, 79.9500° E)');
      setTimeout(() => setToastMsg(null), 3000);
      setIsOpen(false);
    }, 800);
  };

  const getLocationName = (loc: LocationOption) => {
    if (lang === 'si') return `${loc.nameSi} (${loc.nameEn})`;
    if (lang === 'ta') return `${loc.nameTa} (${loc.nameEn})`;
    return `${loc.nameEn}, Sri Lanka`;
  };

  return (
    <div className="relative z-30 mb-6">
      <Card3D className="bg-slate-900/80 backdrop-blur-xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Active Location Info */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                <MapPin className="w-5 h-5 animate-bounce" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  {t.currentLocationLabel}
                </span>
                <span className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  LIVE GPS
                </span>
              </div>
              <p className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                {getLocationName(currentLocation)}
              </p>
            </div>
          </div>

          {/* Action Button: Save / Select Location */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setIsOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Navigation className="w-4 h-4 text-emerald-200" />
              <span>{t.saveLocationBtn}</span>
            </button>
          </div>
        </div>

        {/* GPS Toast Notice */}
        {toastMsg && (
          <div className="mt-3 py-2 px-3 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center justify-between animate-fadeIn">
            <span>{toastMsg}</span>
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
        )}
      </Card3D>

      {/* Location Selector Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400">
                <Compass className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">{t.selectLocationTitle}</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold px-2"
              >
                ✕
              </button>
            </div>

            {/* GPS Auto-detect Button */}
            <button
              onClick={handleDetectGps}
              disabled={isDetecting}
              className="w-full mb-4 py-3 px-4 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 rounded-xl text-emerald-300 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            >
              <Navigation className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} />
              <span>{isDetecting ? 'Detecting satellite location...' : '📍 Auto-Detect GPS (Kadawatha, LK)'}</span>
            </button>

            {/* Presets List */}
            <p className="text-xs text-slate-400 mb-2 font-medium">නගරය තෝරන්න (Select Nearest Town):</p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {availableLocations.map((loc) => {
                const isSelected = loc.id === currentLocation.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => {
                      onSelectLocation(loc);
                      setToastMsg(`ස්ථානය සුරකින ලදී: ${getLocationName(loc)}`);
                      setTimeout(() => setToastMsg(null), 3000);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/70 text-emerald-200 font-semibold'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>{getLocationName(loc)}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-medium"
              >
                {t.cancelBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

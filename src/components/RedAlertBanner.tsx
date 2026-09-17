import React, { useState } from 'react';
import { Radio, ArrowRight, X, AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-react';
import { RedAlertItem, LocationOption } from '../types';
import { getDisasterConfig } from '../data/redAlertData';
import { calculateDistanceKm } from '../utils/geoUtils';

interface RedAlertBannerProps {
  alerts: RedAlertItem[];
  currentLocation?: LocationOption;
  onOpenAlertDetail: (alert: RedAlertItem) => void;
  onOpenCreate: () => void;
}

export const RedAlertBanner: React.FC<RedAlertBannerProps> = ({
  alerts = [],
  currentLocation,
  onOpenAlertDetail,
  onOpenCreate,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter only active, non-false alarm alerts
  const activeAlerts = alerts.filter(
    (a) => a.status === 'active' && !a.isFlaggedFake
  );

  if (dismissed || activeAlerts.length === 0) {
    return null;
  }

  const currentAlert = activeAlerts[currentIndex % activeAlerts.length];
  const config = getDisasterConfig(currentAlert.disasterType);

  let distanceKm = 0;
  if (
    currentLocation &&
    typeof currentLocation.lat === 'number' &&
    typeof currentLocation.lng === 'number' &&
    typeof currentAlert?.latitude === 'number' &&
    typeof currentAlert?.longitude === 'number'
  ) {
    distanceKm = calculateDistanceKm(
      currentLocation.lat,
      currentLocation.lng,
      currentAlert.latitude,
      currentAlert.longitude
    );
  }

  const distanceDisplay = distanceKm < 1 
    ? `මීටර් ${Math.round(distanceKm * 1000)}` 
    : `කි.මී. ${distanceKm.toFixed(1)}`;

  return (
    <div className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 shadow-lg border-b-2 border-red-400/80 relative z-30 animate-fadeIn">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        
        {/* Left Indicator & Incident summary */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative flex items-center justify-center shrink-0">
            <span className="w-4 h-4 rounded-full bg-white/40 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-white relative" />
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="bg-black/30 px-2 py-0.5 rounded-full font-black text-[10px] tracking-wide flex items-center gap-1 text-yellow-300 border border-yellow-300/30">
              <span className="animate-pulse">🚨</span>
              <span>රතු එළිය (හදිසි දැනුම්දීම)</span>
              {activeAlerts.length > 1 && (
                <span className="bg-white/20 px-1 rounded text-white ml-0.5">
                  {currentIndex + 1}/{activeAlerts.length}
                </span>
              )}
            </span>

            <p className="font-bold truncate text-[11px] sm:text-xs">
              <strong>{currentAlert.locationName}</strong>: {config.icon} {currentAlert.disasterTitleSi}
              {distanceKm > 0 && (
                <span className="opacity-90 font-mono ml-1.5 bg-black/20 px-1.5 py-0.5 rounded">
                  (දුර: {distanceDisplay})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeAlerts.length > 1 && (
            <div className="hidden sm:flex items-center gap-1 mr-1">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev - 1 + activeAlerts.length) % activeAlerts.length)}
                className="w-6 h-6 rounded-md bg-black/20 hover:bg-black/40 flex items-center justify-center text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev + 1) % activeAlerts.length)}
                className="w-6 h-6 rounded-md bg-black/20 hover:bg-black/40 flex items-center justify-center text-white"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => onOpenAlertDetail(currentAlert)}
            className="px-3 py-1 bg-white text-red-700 hover:bg-red-50 font-black rounded-lg text-xs flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
          >
            <span>විස්තර බලන්න</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="w-6 h-6 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center font-bold ml-1"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};

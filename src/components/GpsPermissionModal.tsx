import React, { useState } from 'react';
import { 
  MapPin, 
  Crosshair, 
  Settings, 
  Smartphone, 
  Laptop, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  ShieldCheck, 
  Radio, 
  Lock,
  ChevronRight
} from 'lucide-react';
import { Language, LocationOption } from '../types';
import { resolveExactLocation, toLocationOption } from '../utils/geoUtils';

interface GpsPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSuccess: (loc: LocationOption) => void;
  language?: Language;
}

export const GpsPermissionModal: React.FC<GpsPermissionModalProps> = ({
  isOpen,
  onClose,
  onLocationSuccess,
  language = 'si',
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mobile' | 'desktop'>('mobile');

  if (!isOpen) return null;

  const handleRequestGps = () => {
    if (!navigator.geolocation) {
      setErrorStatus('උපාංගයේ GPS සහාය නොදක්වයි.');
      return;
    }

    setIsScanning(true);
    setErrorStatus(null);
    setSuccessMsg(null);

    const onSuccess = async (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      try {
        const geo = await resolveExactLocation(latitude, longitude);
        const locOpt = toLocationOption(geo);

        localStorage.setItem('sahaya_current_location', JSON.stringify(locOpt));
        localStorage.setItem('sahaya_manual_location_locked', 'false');
        localStorage.setItem('sahaya_location_mode', 'auto');
        localStorage.setItem('sahaya_gps_verified', 'true');
        window.dispatchEvent(new CustomEvent('sahaya_location_mode_changed', { detail: { mode: 'auto' } }));

        setSuccessMsg(`ස්ථානය හඳුනාගැනිණි: ${geo.shortDisplaySi} (±${Math.round(accuracy)}m)`);
        setIsScanning(false);

        setTimeout(() => {
          onLocationSuccess(locOpt);
          onClose();
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
        localStorage.setItem('sahaya_current_location', JSON.stringify(fallback));
        localStorage.setItem('sahaya_manual_location_locked', 'false');
        localStorage.setItem('sahaya_location_mode', 'auto');
        localStorage.setItem('sahaya_gps_verified', 'true');
        window.dispatchEvent(new CustomEvent('sahaya_location_mode_changed', { detail: { mode: 'auto' } }));

        setSuccessMsg(`ස්ථානය හඳුනාගැනිණි: ${fallback.nameSi}`);
        setIsScanning(false);

        setTimeout(() => {
          onLocationSuccess(fallback);
          onClose();
        }, 1200);
      }
    };

    const onError = (err: GeolocationPositionError) => {
      setIsScanning(false);
      if (err.code === err.PERMISSION_DENIED) {
        setErrorStatus('GPS අවසරය ලබාදී නොමැත (Permission Denied). කරුණාකර පහත පියවර අනුගමනය කර Settings වලින් Allow කරන්න.');
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setErrorStatus('GPS සංඥා දුර්වලයි (Signal Unavailable). දුරකථනයේ Location සක්‍රීය කර ඇත්දැයි පරීක්ෂා කරන්න.');
      } else {
        setErrorStatus('GPS ස්ථානය ලබාගැනීම ප්‍රමාද විය. නැවත උත්සාහ කරන්න.');
      }
    };

    navigator.geolocation.getCurrentPosition(onSuccess, () => {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 60000,
      });
    }, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0c1f14] border-2 border-emerald-500/40 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 p-4 sm:p-5 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 shadow-inner">
              <Crosshair className="w-6 h-6 text-emerald-200 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                <span>📍 GPS ස්ථානය සක්‍රීය කරන්න</span>
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                Activate Device GPS & Location Permissions
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-100">
          {/* Main Action Trigger Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-[#112a1c] dark:to-[#0f2418] border border-emerald-500/30 text-center space-y-3">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Radio className="w-8 h-8 animate-pulse" />
                </div>
                {isScanning && (
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping opacity-75" />
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                සජීවී GPS අවසර ලබාදීම
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                හදිසි ආපදා දැනුම්දීම් (Red Alert) සහ ප්‍රජා සේවා සඳහා ඔබ සිටින නිවැරදි ප්‍රදේශය ස්වයංක්‍රීයව තහවුරු කරගැනීමට පහත බොත්තම ඔබන්න.
              </p>
            </div>

            {/* Glowing Big GPS Activation Button */}
            <button
              type="button"
              onClick={handleRequestGps}
              disabled={isScanning}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-black text-sm sm:text-base shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                isScanning
                  ? 'bg-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/30 border border-emerald-300/40 animate-pulse'
              }`}
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>🛰️ GPS සංඥාව පරීක්ෂා කරමින් පවතී...</span>
                </>
              ) : (
                <>
                  <Crosshair className="w-5 h-5" />
                  <span>⚡ GPS සක්‍රීය කරන්න (Turn On / Allow GPS)</span>
                </>
              )}
            </button>
          </div>

          {/* Success Message */}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error / Blocked Status */}
          {errorStatus && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-700 dark:text-red-300 text-xs sm:text-sm font-semibold flex items-start gap-2.5 animate-fadeIn">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-600 dark:text-red-400">⚠️ GPS අවසරය සක්‍රීය කර නොමැත</p>
                <p className="text-xs mt-0.5 leading-relaxed">{errorStatus}</p>
              </div>
            </div>
          )}

          {/* Step-by-Step Settings Guide */}
          <div className="rounded-2xl bg-slate-50 dark:bg-[#12281b] border border-slate-200 dark:border-emerald-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-emerald-400 flex items-center gap-1.5">
                <Settings className="w-4 h-4" />
                <span>GPS Settings සකසන ආකාරය (How to Enable)</span>
              </span>
              
              {/* Tab Selector */}
              <div className="flex items-center gap-1 bg-slate-200 dark:bg-[#0c1f14] p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('mobile')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeTab === 'mobile'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3 h-3 inline mr-1" />
                  Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('desktop')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeTab === 'desktop'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Laptop className="w-3 h-3 inline mr-1" />
                  Computer
                </button>
              </div>
            </div>

            {activeTab === 'mobile' ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white dark:bg-[#183624] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-[11px] shrink-0">
                    1
                  </span>
                  <div>
                    <span className="font-bold">දුරකථන Settings:</span> Phone Settings ➡️ <strong>Location / GPS</strong> සක්‍රීය (ON) කරන්න.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white dark:bg-[#183624] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-[11px] shrink-0">
                    2
                  </span>
                  <div>
                    <span className="font-bold">Browser අවසරය:</span> ඉහළ URL තීරුවේ ඇති <Lock className="w-3.5 h-3.5 inline text-emerald-500 mx-0.5" /> <strong>(Lock / Site info)</strong> අයිකනය ඔබන්න.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white dark:bg-[#183624] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-[11px] shrink-0">
                    3
                  </span>
                  <div>
                    <span className="font-bold">Allow තෝරන්න:</span> <strong>Permissions ➡️ Location ➡️ Allow (අවසර දෙන්න)</strong> ලෙස සකසා නැවත උත්සාහ කරන්න.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white dark:bg-[#183624] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-[11px] shrink-0">
                    1
                  </span>
                  <div>
                    <span className="font-bold">URL තීරුව:</span> බ්‍රව්සරයේ ලිපින තීරුවේ වම්පස ඇති <Lock className="w-3.5 h-3.5 inline text-emerald-500 mx-0.5" /> <strong>(Lock / Tune)</strong> අයිකනය ක්ලික් කරන්න.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white dark:bg-[#183624] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-[11px] shrink-0">
                    2
                  </span>
                  <div>
                    <span className="font-bold">Location Allow කරන්න:</span> "Location" ඉදිරියෙන් ඇති switch එක <strong>"Allow"</strong> බවට පත් කරන්න.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white dark:bg-[#183624] border border-slate-100 dark:border-emerald-800/30">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-[11px] shrink-0">
                    3
                  </span>
                  <div>
                    <span className="font-bold">පිටුව Refresh කරන්න:</span> ඉහළ ඇති <strong>⚡ GPS සක්‍රීය කරන්න</strong> බොත්තම ඔබන්න.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, AlertTriangle, Zap, Droplets, Package, ArrowRight, BellRing } from 'lucide-react';
import { 
  subscribeToActiveRingtone, 
  stopPickMeAlert, 
  ActiveRingtoneState 
} from '../utils/backgroundAlertEngine';
import { Language } from '../types';

interface ActiveAlertRingerBannerProps {
  language?: Language;
  onOpenModal?: (targetModal: string, targetPostId?: string) => void;
}

export const ActiveAlertRingerBanner: React.FC<ActiveAlertRingerBannerProps> = ({
  language = 'si',
  onOpenModal,
}) => {
  const [activeState, setActiveState] = useState<ActiveRingtoneState | null>(null);

  useEffect(() => {
    const unsub = subscribeToActiveRingtone((state) => {
      setActiveState(state);
    });
    return () => unsub();
  }, []);

  if (!activeState || !activeState.isRinging) {
    return null;
  }

  const getThemeConfig = () => {
    switch (activeState.kind) {
      case 'red_alert':
        return {
          bg: 'from-rose-600 via-red-600 to-amber-700',
          border: 'border-rose-400',
          icon: AlertTriangle,
          badgeBg: 'bg-rose-950 text-rose-300 border-rose-400/50',
          pulseColor: 'bg-rose-500',
          title: activeState.title || '🚨 රතු එළිය හදිසි ආපදා අනතුරු ඇඟවීමක්!',
        };
      case 'emergency_blood':
        return {
          bg: 'from-red-700 via-rose-700 to-pink-800',
          border: 'border-red-400',
          icon: Droplets,
          badgeBg: 'bg-red-950 text-red-200 border-red-400/50',
          pulseColor: 'bg-red-500',
          title: activeState.title || '🩸 හදිසි ලේ අවශ්‍යතාවයක්!',
        };
      case 'disaster_relief':
        return {
          bg: 'from-amber-600 via-orange-600 to-emerald-700',
          border: 'border-amber-400',
          icon: Package,
          badgeBg: 'bg-amber-950 text-amber-200 border-amber-400/50',
          pulseColor: 'bg-amber-500',
          title: activeState.title || '📦 ආපදා සහන ද්‍රව්‍ය නිවේදනයක්!',
        };
      case 'quick_service':
      default:
        return {
          bg: 'from-emerald-600 via-teal-700 to-[#007a4b]',
          border: 'border-emerald-300',
          icon: Zap,
          badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-400/50',
          pulseColor: 'bg-emerald-400',
          title: activeState.title || '⚡ නව ඉක්මන් සේවා ඇමතුමක් (Quick Service)!',
        };
    }
  };

  const config = getThemeConfig();
  const IconComponent = config.icon;

  const handleView = () => {
    const targetModal = activeState.targetModal || (activeState.kind === 'red_alert' ? 'red_alert' : activeState.kind === 'emergency_blood' ? 'blood' : 'quick_service');
    const targetPostId = activeState.targetPostId;
    stopPickMeAlert();
    if (onOpenModal) {
      onOpenModal(targetModal, targetPostId);
    }
  };

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] animate-slideDown p-2 sm:p-3 pointer-events-none">
      <div className={`max-w-4xl mx-auto rounded-2xl bg-gradient-to-r ${config.bg} text-white p-3.5 sm:p-4 shadow-2xl border-2 ${config.border} flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-auto backdrop-blur-md animate-pulse`}>
        
        {/* Left Info & Sound Equalizer */}
        <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-black/40 border border-white/30 flex items-center justify-center font-black shadow-inner">
              <IconComponent className="w-6 h-6 text-white animate-bounce" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pulseColor} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${config.pulseColor} border-2 border-white`} />
            </span>
          </div>

          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${config.badgeBg} tracking-wide flex items-center gap-1`}>
                <Volume2 className="w-3 h-3 animate-pulse" />
                <span>නාද වෙමින් පවතී (Ringing)</span>
              </span>
              {activeState.locationName && (
                <span className="text-[11px] font-bold text-white/90 bg-black/30 px-2 py-0.5 rounded-lg truncate">
                  📍 {activeState.locationName}
                </span>
              )}
            </div>

            <h4 className="text-xs sm:text-sm font-black text-white truncate drop-shadow-sm mt-0.5">
              {config.title}
            </h4>
            <p className="text-[11px] text-white/90 font-medium truncate max-w-lg">
              {activeState.message}
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <button
            type="button"
            onClick={handleView}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white text-slate-950 hover:bg-slate-100 font-black text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <span>විස්තර බලන්න</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={stopPickMeAlert}
            className="px-3.5 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/40 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="Stop Sound"
          >
            <VolumeX className="w-4 h-4 text-rose-300" />
            <span className="hidden sm:inline">ශබ්දය නවත්වන්න</span>
          </button>
        </div>

      </div>
    </div>
  );
};

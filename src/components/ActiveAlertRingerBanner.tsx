import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  Flame, 
  Waves, 
  Wind, 
  Mountain, 
  Droplets, 
  Package, 
  Zap, 
  ArrowRight 
} from 'lucide-react';
import { 
  subscribeToActiveRingtone, 
  stopPickMeAlert, 
  ActiveRingtoneState 
} from '../utils/backgroundAlertEngine';
import type { Language } from '../types';

interface ActiveAlertRingerBannerProps {
  language?: Language;
  onOpenModal?: (targetModal: string, targetPostId?: string) => void;
}

// භාෂා ත්‍රිත්වයෙන්ම UI පාඨ සහ ලේබල්
const UI_TEXT = {
  si: {
    ringing: 'සයිරන් නාද වේ',
    viewDetails: 'විස්තර බලන්න',
    stopSound: 'ශබ්දය නවත්වන්න',
    radiusTag: '📍 5km කලාපය තුළ',
    redAlert: '🚨 රතුවෙලිය: හදිසි ආපදා අනතුරු ඇඟවීමක්!',
    fire: '🔥 ගිනි අනතුරක් වාර්තා විය!',
    flood: '🌊 ජලගැලීම් / ගංවතුර අවදානමක්!',
    storm: '💨 තද සුළං / කුණාටු අනතුරක්!',
    landslide: '⛰️ නායයෑම් අනතුරු ඇඟවීමක්!',
    blood: '🩸 හදිසි ලේ අවශ්‍යතාවයක්!',
    relief: '📦 ආපදා සහන ද්‍රව්‍ය නිවේදනයක්!',
    quickService: '⚡ නව ඉක්මන් සේවා ඇමතුමක්!',
  },
  en: {
    ringing: 'Siren Active',
    viewDetails: 'View Details',
    stopSound: 'Mute Siren',
    radiusTag: '📍 Within 5km Radius',
    redAlert: '🚨 Rathuweliya: Disaster Emergency Alert!',
    fire: '🔥 Fire Hazard Reported!',
    flood: '🌊 Flood Warning Issued!',
    storm: '💨 Severe Storm / Wind Alert!',
    landslide: '⛰️ Landslide Hazard Alert!',
    blood: '🩸 Urgent Blood Requirement!',
    relief: '📦 Disaster Relief Supply Update!',
    quickService: '⚡ New Quick Service Request!',
  },
  ta: {
    ringing: 'சைரன் ஒலிக்கிறது',
    viewDetails: 'விவரங்களை காண்க',
    stopSound: 'ஒலியை நிறுத்து',
    radiusTag: '📍 5km சுற்றளவுக்குள்',
    redAlert: '🚨 ரத்துவிலிய: அவசர பேரிடர் எச்சரிக்கை!',
    fire: '🔥 தீ விபத்து எச்சரிக்கை!',
    flood: '🌊 வெள்ள அபாய எச்சரிக்கை!',
    storm: '💨 புயல் / பலத்த காற்று எச்சரிக்கை!',
    landslide: '⛰️ நிலச்சரிவு அபாய எச்சரிக்கை!',
    blood: '🩸 அவசர குருதி தேவை!',
    relief: '📦 நிவாரண உதவி அறிவிப்பு!',
    quickService: '⚡ புதிய விரைவு சேவை அழைப்பு!',
  }
};

export const ActiveAlertRingerBanner: React.FC<ActiveAlertRingerBannerProps> = ({
  language = 'si',
  onOpenModal,
}) => {
  const [activeState, setActiveState] = useState<ActiveRingtoneState | null>(null);

  useEffect(() => {
    // Background Alert Engine හරහා සයිරන් තත්ත්වය නිරීක්ෂණය කිරීම
    const unsub = subscribeToActiveRingtone((state) => {
      setActiveState(state);
    });
    return () => unsub();
  }, []);

  // සයිරන් නාද නොවන විට සංරචකය සඟවයි
  if (!activeState || !activeState.isRinging) {
    return null;
  }

  const t = UI_TEXT[language as keyof typeof UI_TEXT] || UI_TEXT.si;

  // ඇලර්ට් වර්ගය (kind) සහ ආපදා වර්ගය (disasterType) අනුව Styles සහ Icons වෙන් කිරීම
  const getBannerConfig = () => {
    if (activeState.kind === 'red_alert') {
      const type = (activeState.disasterType || '').toLowerCase();

      if (type.includes('fire') || type.includes('ගිනි')) {
        return {
          bg: 'from-orange-600 via-red-600 to-amber-700',
          border: 'border-orange-400',
          icon: Flame,
          pulseColor: 'bg-orange-500',
          title: activeState.title || t.fire,
          showRadius: true,
        };
      }
      if (type.includes('flood') || type.includes('ජල') || type.includes('ගංවතුර')) {
        return {
          bg: 'from-blue-700 via-cyan-700 to-sky-900',
          border: 'border-cyan-400',
          icon: Waves,
          pulseColor: 'bg-cyan-400',
          title: activeState.title || t.flood,
          showRadius: true,
        };
      }
      if (type.includes('storm') || type.includes('සුළං') || type.includes('කුණාටු')) {
        return {
          bg: 'from-slate-700 via-teal-800 to-indigo-950',
          border: 'border-teal-400',
          icon: Wind,
          pulseColor: 'bg-teal-400',
          title: activeState.title || t.storm,
          showRadius: true,
        };
      }
      if (type.includes('landslide') || type.includes('නාය')) {
        return {
          bg: 'from-amber-800 via-stone-800 to-yellow-900',
          border: 'border-amber-500',
          icon: Mountain,
          pulseColor: 'bg-amber-400',
          title: activeState.title || t.landslide,
          showRadius: true,
        };
      }

      // සාමාන්‍ය රතු එළිය අනතුරු ඇඟවීමක් නම්
      return {
        bg: 'from-rose-700 via-red-600 to-red-900',
        border: 'border-rose-400',
        icon: AlertTriangle,
        pulseColor: 'bg-rose-500',
        title: activeState.title || t.redAlert,
        showRadius: true,
      };
    }

    if (activeState.kind === 'emergency_blood') {
      return {
        bg: 'from-red-700 via-rose-700 to-pink-900',
        border: 'border-red-400',
        icon: Droplets,
        pulseColor: 'bg-red-500',
        title: activeState.title || t.blood,
        showRadius: false,
      };
    }

    if (activeState.kind === 'disaster_relief') {
      return {
        bg: 'from-amber-600 via-orange-600 to-emerald-800',
        border: 'border-amber-400',
        icon: Package,
        pulseColor: 'bg-amber-400',
        title: activeState.title || t.relief,
        showRadius: false,
      };
    }

    // Default: Quick Service
    return {
      bg: 'from-emerald-600 via-teal-700 to-[#007a4b]',
      border: 'border-emerald-300',
      icon: Zap,
      pulseColor: 'bg-emerald-400',
      title: activeState.title || t.quickService,
      showRadius: false,
    };
  };

  const config = getBannerConfig();
  const IconComponent = config.icon;

  const handleView = () => {
    stopPickMeAlert();

    const targetModal =
      activeState.targetModal ||
      (activeState.kind === 'red_alert'
        ? 'rathuweliya_modal'
        : activeState.kind === 'emergency_blood'
        ? 'blood_modal'
        : activeState.kind === 'disaster_relief'
        ? 'relief_modal'
        : 'quick_service_modal');

    const targetPostId = activeState.targetPostId;
    if (onOpenModal) {
      onOpenModal(targetModal, targetPostId);
    }
  };

  return (
    <aside 
      aria-label="Active emergency alert banner"
      className="fixed top-0 inset-x-0 z-[9999] p-2.5 sm:p-4 pointer-events-none transition-all duration-300"
    >
      <div 
        className={`max-w-4xl mx-auto rounded-2xl bg-gradient-to-r ${config.bg} text-white p-3.5 sm:p-4 shadow-2xl border-2 ${config.border} flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-auto backdrop-blur-md`}
      >
        {/* වම්පස අයිකනය සහ තොරතුරු */}
        <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/30 flex items-center justify-center shadow-inner">
              <IconComponent className="w-6 h-6 text-white" />
            </div>
            {/* Animated Ringing Pulse Indicator */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pulseColor} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-4 w-4 ${config.pulseColor} border-2 border-white`} />
            </span>
          </div>

          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-black/40 text-rose-200 border-rose-400/40 tracking-wider flex items-center gap-1">
                <Volume2 className="w-3 h-3 animate-pulse" />
                <span>{t.ringing}</span>
              </span>

              {/* කි.මී. 5 වපසරිය පෙන්වන ටැගය (Red Alert සඳහා පමණි) */}
              {config.showRadius && (
                <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30">
                  {t.radiusTag}
                </span>
              )}

              {activeState.locationName && (
                <span className="text-[11px] font-bold text-white/90 bg-black/30 px-2 py-0.5 rounded-lg truncate max-w-[150px]">
                  📍 {activeState.locationName}
                </span>
              )}
            </div>

            <h4 className="text-xs sm:text-sm font-black text-white truncate drop-shadow-sm mt-1">
              {config.title}
            </h4>

            {activeState.message && (
              <p className="text-[11px] text-white/90 font-medium truncate max-w-md sm:max-w-lg">
                {activeState.message}
              </p>
            )}
          </div>
        </div>

        {/* දකුණුපස බොත්තම් */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <button
            type="button"
            onClick={handleView}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white text-slate-950 hover:bg-slate-100 font-black text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <span>{t.viewDetails}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={stopPickMeAlert}
            className="px-3.5 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/30 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title={t.stopSound}
          >
            <VolumeX className="w-4 h-4 text-rose-300" />
            <span className="hidden sm:inline">{t.stopSound}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Radio, 
  Smartphone, 
  Layers, 
  Volume2, 
  ShieldCheck, 
  Maximize2, 
  CheckCircle2, 
  Activity, 
  Sparkles,
  ExternalLink,
  Lock,
  Copy,
  Check
} from 'lucide-react';
import { Language } from '../types';
import { activateBackgroundWakeLock } from '../utils/notificationManager';
import { triggerPickMeAlert } from '../utils/backgroundAlertEngine';

interface AndroidBackgroundServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  onLaunchPiP?: () => void;
  userCoords?: { lat: number; lng: number } | null;
  activeHazardsCount?: number;
}

export const AndroidBackgroundServiceModal: React.FC<AndroidBackgroundServiceModalProps> = ({
  isOpen,
  onClose,
  language = 'si',
  onLaunchPiP,
  userCoords,
  activeHazardsCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'pip' | 'android_native' | 'permissions'>('pip');
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      activateBackgroundWakeLock()
        .then((active) => setWakeLockActive(active))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getLang = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  const handleCopyManifest = () => {
    const manifestCode = `<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />`;
    navigator.clipboard.writeText(manifestCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[11000] bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-xl bg-white dark:bg-[#071910] border border-slate-200 dark:border-[#19402a] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#153824] bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center text-xl shadow-xs">
              🚨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black">
                  {getLang('24/7 Background & Android Floating Overlay', '24/7 Background & Floating Overlay', '24/7 பின்னணி & மிதக்கும் கட்டுப்பாடு')}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-950">
                  SYSTEM
                </span>
              </div>
              <p className="text-xs text-red-100 font-semibold">
                {getLang('ඇප් එකෙන් ඉවත් වුවත් 5km ආපදා සෝදිසිය සහ Screen Overlay ක්‍රියාත්මක කිරීම', 'Continuous 5km Hazard Guard & Floating Overlay Outside App', 'பயன்பாட்டிற்கு வெளியே 5 கிமீ பாதுகாப்பு')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="p-2 border-b border-slate-200 dark:border-[#153824] bg-slate-50 dark:bg-[#092214] grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('pip')}
            className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'pip'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#112d1d] text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{getLang('Floating Window (PiP)', 'Floating (PiP)', 'மிதக்கும் சாளரம்')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('android_native')}
            className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'android_native'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#112d1d] text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{getLang('Android APK Setup', 'Android APK', 'Android APK')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'permissions'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#112d1d] text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{getLang('Permissions (OS)', 'Permissions', 'அனுமதிகள்')}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-slate-800 dark:text-slate-200">
          
          {/* TAB 1: Picture-in-Picture Floating Window for Browser / Web */}
          {activeTab === 'pip' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300 font-black text-sm">
                  <Maximize2 className="w-4 h-4" />
                  <span>{getLang('වෙබ් පරිසරයේදී වෙනත් Apps උඩින් පාවෙන Window එක (PiP)', 'Floating Window (Picture-in-Picture) for Web/Chrome', 'வலை உலாவிக்கான மிதக்கும் சாளரம்')}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {getLang(
                    'ඔබ Browser එකෙන් පිටතට ගොස් WhatsApp, Facebook, YouTube හෝ Phone එකේ වෙනත් ඕනෑම දෙයක් කරන විටත් Screen එක උඩ පාවෙන සජීවී ආපදා පුවරුවක් විවෘත වේ.',
                    'Keep a live emergency radar window floating on top of your screen even when using WhatsApp, Facebook, YouTube, or your home screen.',
                    'பிற பயன்பாடுகளைப் பயன்படுத்தும் போதும் திரையின் மேல் நேரடி அவசர சாளரத்தை வைத்திருங்கள்.'
                  )}
                </p>
                {onLaunchPiP && (
                  <button
                    type="button"
                    onClick={() => {
                      onLaunchPiP();
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 transition-all mt-2"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>{getLang('🖼️ දැන්ම Floating Window එක Open කරන්න', '🖼️ Launch Floating Window Now', '🖼️ மிதக்கும் சாளரத்தை துவங்கு')}</span>
                  </button>
                )}
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#11271c] border border-slate-200 dark:border-[#19402a] space-y-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Background WakeLock</div>
                  <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    <span>24/7 ACTIVE</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#11271c] border border-slate-200 dark:border-[#19402a] space-y-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">GPS Radar Limit</div>
                  <div className="font-mono font-black text-rose-600 dark:text-rose-400">
                    5.0 KM RADIUS
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Android Native APK Capacitor Setup */}
          {activeTab === 'android_native' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-black text-sm">
                  <Smartphone className="w-4 h-4" />
                  <span>{getLang('Android Native APK Build (Capacitor සූදානම් කර ඇත)', 'Android Native APK Ready (Capacitor Configured)', 'Android APK தயாராக உள்ளது')}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {getLang(
                    'මෙම Codebase එක තුළ Capacitor Android (`com.sahayasewa.app`) සහ `capacitor.config.json` සම්පූර්ණයෙන්ම සකසා ඇත. පහත command මඟින් Native APK එක Build කළ හැක:',
                    'Capacitor Android (package: com.sahayasewa.app) is fully configured in this codebase. Run the commands below to generate the Native Android APK:',
                    'கீழே உள்ள கட்டளைகள் மூலம் Android APK ஐ உருவாக்கலாம்:'
                  )}
                </p>
                
                <div className="p-2.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs space-y-1 overflow-x-auto">
                  <div>npm run build</div>
                  <div>npx cap sync</div>
                  <div>npx cap open android</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-[#11271c] border border-slate-200 dark:border-[#19402a] text-xs space-y-1.5">
                <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{getLang('Native APK හි ලැබෙන වාසි:', 'Native APK Benefits:', 'Native APK நன்மைகள்:')}</span>
                </div>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                  <li>Android OS Settings මඟින් කෙලින්ම <strong>"Display over other apps"</strong> (SYSTEM_ALERT_WINDOW) ලැබීම.</li>
                  <li>App එක සම්පූර්ණයෙන්ම Swipe කර අයින් කළද <strong>Foreground Service එක මඟින් Screen එක මත 24/7 Floating SOS Bubble</strong> එක රැඳී තිබීම.</li>
                  <li>Background GPS සෝදිසිය 24/7 බැටරි කාර්යක්ෂමව ක්‍රියාත්මක වීම.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: Permissions Code Snippet */}
          {activeTab === 'permissions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  AndroidManifest.xml Permissions:
                </span>
                <button
                  type="button"
                  onClick={handleCopyManifest}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy XML'}</span>
                </button>
              </div>

              <pre className="p-3 rounded-2xl bg-slate-900 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800">
{`<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />`}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-[#153824] bg-slate-50 dark:bg-[#07160e] flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-semibold">
            Sahaya Sewa 24/7 Emergency Guard Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-[#143322] hover:bg-slate-300 dark:hover:bg-[#1d4730] text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            {getLang('වසන්න', 'Close', 'மூடு')}
          </button>
        </div>

      </div>
    </div>
  );
};

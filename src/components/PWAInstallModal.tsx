import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  Download, 
  Maximize, 
  Minimize, 
  CheckCircle2, 
  Sparkles, 
  Share, 
  MoreVertical, 
  PlusSquare, 
  ShieldCheck,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { 
  canPromptInstall, 
  triggerNativeInstallPrompt, 
  isIOSDevice, 
  isRunningInStandaloneMode, 
  toggleFullscreen, 
  isFullscreenActive, 
  subscribeToInstallPrompt 
} from '../utils/pwaHelper';
import { Language } from '../types';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  language = 'si',
}) => {
  const [canInstall, setCanInstall] = useState(canPromptInstall());
  const [isStandalone, setIsStandalone] = useState(isRunningInStandaloneMode());
  const [isFullscreen, setIsFullscreen] = useState(isFullscreenActive());
  const [isIOS, setIsIOS] = useState(isIOSDevice());
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    setIsStandalone(isRunningInStandaloneMode());
    setIsIOS(isIOSDevice());
    setIsFullscreen(isFullscreenActive());

    const unsubscribe = subscribeToInstallPrompt((available) => {
      setCanInstall(available);
    });

    const handleFullscreenChange = () => {
      setIsFullscreen(isFullscreenActive());
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      unsubscribe();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    setIsInstalling(true);
    const res = await triggerNativeInstallPrompt();
    setIsInstalling(false);
    if (res.outcome === 'accepted') {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    }
  };

  const handleToggleFullscreen = async () => {
    const active = await toggleFullscreen();
    setIsFullscreen(active);
  };

  const getLang = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-[#07190f] border-2 border-emerald-500 rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.35)] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-[#022818] p-4 sm:p-5 text-white flex items-center justify-between border-b border-emerald-700/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 font-black flex items-center justify-center text-xl shadow-md shrink-0">
              📱
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-wide truncate">
                {getLang('ඇප් එකක් ලෙස Install කරගන්න', 'Install as Mobile App', 'செயலியாக நிறுவுக')}
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-200 font-medium truncate">
                {getLang('ලින්ක් එක (URL Bar) ඉවත් කර Fullscreen භාවිතා කරන්න', 'Hide browser URL bar & run in full screen', 'முழு திரையில் பயன்பாட்டை இயக்கவும்')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2"
            title="වසන්න (Close)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">

          {/* Success State */}
          {installSuccess ? (
            <div className="p-6 text-center space-y-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border-2 border-emerald-500">
              <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-emerald-950 dark:text-emerald-200">
                {getLang('ස්ථාපනය සාර්ථකයි!', 'Installation Successful!', 'நிறுவல் வெற்றிகரமானது!')}
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-300">
                {getLang(
                  'දැන් ඔබගේ දුරකථනයේ ඇති "සහය සේවා" App Icon එකෙන් open කළ විට කිසිදු ලින්ක් එකක් නැතිව සැබෑ App එකක් මෙන් විවෘත වේ.',
                  'Now open Sahaya Sewa directly from your home screen without any URL bar.',
                  'முகப்புத் திரையில் இருந்து செயலியை திறக்கவும்.'
                )}
              </p>
            </div>
          ) : (
            <>
              {/* Highlight Explanation Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-emerald-500/10 to-transparent border border-amber-400/40 dark:border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-900 dark:text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{getLang('ලින්ක් එක සහ Browser තීරුව ඉවත් කරන්නේ කෙසේද?', 'How to hide the top URL link bar?', 'URL பட்டியை மறைப்பது எப்படி?')}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-zinc-200 leading-relaxed">
                  {getLang(
                    'වෙබ් බ්‍රවුසරයකින් (Chrome / Safari) වෙබ් අඩවියක් විවෘත කළ විට ඉහළින් ලින්ක් එක (Domain Name) දිස්වීම සාමාන්‍ය බ්‍රවුසර් ක්‍රියාවලියකි. මෙම පද්ධතිය ඔබගේ දුරකථනයේ App එකක් ලෙස **(Add to Home Screen / Install)** ස්ථාපනය කරගත් පසු, එය **ලින්ක් එකක් හෝ බ්‍රවුසර් තීරුවක් නොමැතිව 100% Fullscreen Native App** එකක් ලෙස ක්‍රියා කරයි.',
                    'When opened in a regular web browser, the top link bar is shown by default. Installing it as a Mobile App (PWA) on your home screen completely removes the address bar, giving you a full-screen native app experience.',
                    'உங்கள் தொலைபேசியில் செயலியை நிறுவுவதன் மூலம் முகவரி பட்டி இல்லாமல் முழு திரையில் இயக்கலாம்.'
                  )}
                </p>
              </div>

              {/* 1. Fast One-Click Install Button (When Supported on Chrome / Android / Edge) */}
              {canInstall && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white space-y-2 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                      {getLang('ක්ෂණික ස්ථාපනය (1-Click Install)', 'Instant Install', 'உடனடி நிறுவல்')}
                    </span>
                    <span className="text-xs font-mono">PWA App</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-black">
                    {getLang('දුරකථනයේ App එකක් ලෙස Install කරන්න', 'Install Directly on Your Phone', 'தொலைபேசியில் நிறுவவும்')}
                  </h4>
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    disabled={isInstalling}
                    className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-amber-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer mt-1"
                  >
                    <Download className="w-4 h-4" />
                    <span>{getLang('📲 දැන්ම App එක Install කරන්න (Install Now)', '📲 Install App Now', '📲 இப்போது நிறுவவும்')}</span>
                  </button>
                </div>
              )}

              {/* 2. Step-by-Step Manual Guidance for Android Chrome */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0c2419] border border-slate-200 dark:border-[#143d28] space-y-3 text-xs">
                <div className="flex items-center gap-2 font-black text-slate-900 dark:text-emerald-200">
                  <span className="text-base">🤖</span>
                  <span>{getLang('Android / Google Chrome භාවිතා කරන්නන් සඳහා:', 'For Android / Google Chrome Users:', 'Android / Chrome பயனர்களுக்கு:')}</span>
                </div>

                <div className="space-y-2 text-slate-700 dark:text-zinc-300">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white dark:bg-[#07170e] border border-slate-200 dark:border-[#1a4730]">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      බ්‍රවුසරයේ ඉහළ දකුණු කෙළවරේ ඇති තිත් තුන (<MoreVertical className="w-3.5 h-3.5 inline text-slate-600 dark:text-zinc-400" />) ඔබන්න.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white dark:bg-[#07170e] border border-slate-200 dark:border-[#1a4730]">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      මෙනුවෙන් <strong>"Install app"</strong> හෝ <strong>"Add to Home screen" (මුල් තිරයට එක් කරන්න)</strong> තෝරන්න.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white dark:bg-[#07170e] border border-slate-200 dark:border-[#1a4730]">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
                      3
                    </div>
                    <div>
                      දුරකථනයේ මුල් තිරයට ලැබෙන <strong>"සහය සේවා" App Icon එකෙන්</strong> ඇතුල් වන්න. (එවිට ඉහළ ලින්ක් බාර් එක කිසිසේත් නොපෙන්වයි).
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Step-by-Step for iOS Safari (iPhone / iPad) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0c2419] border border-slate-200 dark:border-[#143d28] space-y-3 text-xs">
                <div className="flex items-center gap-2 font-black text-slate-900 dark:text-emerald-200">
                  <span className="text-base">🍎</span>
                  <span>{getLang('iPhone / Apple Safari භාවිතා කරන්නන් සඳහා:', 'For iPhone / Safari Users:', 'iPhone / Safari பயனர்களுக்கு:')}</span>
                </div>

                <div className="space-y-2 text-slate-700 dark:text-zinc-300">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white dark:bg-[#07170e] border border-slate-200 dark:border-[#1a4730]">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      Safari බ්‍රවුසරයේ පහළ ඇති <strong>Share (<Share className="w-3.5 h-3.5 inline text-sky-500" />)</strong> බොත්තම ඔබන්න.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white dark:bg-[#07170e] border border-slate-200 dark:border-[#1a4730]">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      පහළට scroll කර <strong>"Add to Home Screen" (<PlusSquare className="w-3.5 h-3.5 inline text-emerald-500" />)</strong> තෝරා <strong>Add</strong> ඔබන්න.
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Instant In-Browser Fullscreen Feature */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <Maximize className="w-4 h-4 text-emerald-600" />
                    <span>{getLang('පූර්ණ තිර මාදිලිය (Fullscreen Mode)', 'Fullscreen Mode', 'முழுத்திரை பயன்முறை')}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-300 truncate">
                    {getLang('දැනටමත් ඇති තිරය ක්ෂණිකව Fullscreen කරගන්න', 'Toggle instant browser fullscreen', 'முழு திரையை உடனடியாக இயக்குக')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  {isFullscreen ? (
                    <>
                      <Minimize className="w-3.5 h-3.5" />
                      <span>{getLang('සාමාන්‍ය තිරය', 'Exit Fullscreen', 'வெளியேறு')}</span>
                    </>
                  ) : (
                    <>
                      <Maximize className="w-3.5 h-3.5" />
                      <span>{getLang('Fullscreen යන්න', 'Enter Fullscreen', 'முழுத்திரை')}</span>
                    </>
                  )}
                </button>
              </div>

            </>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer transition-all"
            >
              {getLang('තේරුම් ගත්තා (Close)', 'Got it (Close)', 'புரிந்தது')}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

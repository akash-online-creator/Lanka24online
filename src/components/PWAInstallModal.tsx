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
  ExternalLink,
  Copy,
  Check,
  Globe,
  Compass
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
  const [isCopied, setIsCopied] = useState(false);

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

  const directUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-arugkwlbojbp6jxjcd24un-234713481275.asia-southeast1.run.app';

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(directUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
      }
    } catch {
      // fallback
    }
  };

  const handleOpenInBrowser = () => {
    window.open(directUrl, '_blank');
  };

  const getLang = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/80 overflow-y-auto animate-fadeIn"
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
                {getLang('ඇප් එකක් ලෙස Download / Install කරන්න', 'Install as Mobile App (PWA)', 'செயலியாக பதிவிறக்குக')}
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-200 font-medium truncate">
                {getLang('තිත් 3 (3-Dots) මෙනුව නැතිව හෝ කෙලින්ම Install කරගන්න', 'Direct install or open in standard browser', 'நேரடி நிறுவல்')}
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
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-slate-800 dark:text-slate-100">

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
              {/* Solution 1: Direct 1-Click Install Button (When supported) */}
              {canInstall ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      {getLang('ක්‍රමය 01: ක්ෂණික 1-Click Install', 'Method 01: 1-Click Install', 'உடனடி நிறுவல்')}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300">PWA Native</span>
                  </div>
                  <p className="text-xs text-emerald-100 leading-relaxed">
                    {getLang(
                      'බ්‍රවුසරයේ Dot 3 මෙනුව සෙවීම අවශ්‍ය නොවේ. පහත බොත්තම එබූ සැනින් ඔබගේ දුරකථනයටම App එක Install වේ.',
                      'No need to search for 3 dots. Click below to install directly to your device.',
                      'கீழே கிளிக் செய்து நேரடியாக நிறுவவும்.'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    disabled={isInstalling}
                    className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-amber-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer mt-1"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isInstalling ? 'Install වෙමින් පවතී...' : getLang('📲 ක්ෂණිකව App එක Install කරන්න (Install Now)', '📲 Install App Now', '📲 இப்போது நிறுவவும்')}</span>
                  </button>
                </div>
              ) : null}

              {/* Solution 2: Open in Standard Chrome Browser (Takes user outside of preview/fullscreen iframe) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0c2419] border-2 border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-slate-900 dark:text-emerald-200">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    <span>{getLang('ක්‍රමය 02: සෘජු බ්‍රවුසරයෙන් (Chrome) විවෘත කරන්න', 'Method 02: Open in Chrome / Safari', 'Chrome உலாவியில் திறக்கவும்')}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                  {getLang(
                    'Preview / Full Screen තුළ සිටින විට බ්‍රවුසරයේ තිත් 3 (3-Dots) මෙනුව නොපෙනේ. පහත බොත්තම ඔබා Chrome බ්‍රවුසරයෙන් විවෘත කළ විට, දකුණුපස Dot 3 මෙනුව හා "Install app" විකල්පය දිස්වේ.',
                    'The 3-dot menu is hidden when inside full screen or preview. Click below to open directly in Chrome/Safari to see the install option.',
                    'நேரடியாக Chrome இல் திறந்து Dot 3 மெனு மூலம் நிறுவவும்.'
                  )}
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleOpenInBrowser}
                    className="flex-1 py-3 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{getLang('🌐 Chrome හි විවෘත කරන්න', 'Open in Chrome', 'Chrome இல் திறக்கவும்')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="py-3 px-3.5 rounded-xl bg-white dark:bg-[#133022] hover:bg-slate-100 dark:hover:bg-[#1a402d] text-slate-800 dark:text-emerald-200 border border-slate-300 dark:border-emerald-800 font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Link එක Copy විය!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500 dark:text-emerald-400" />
                        <span>Link එක Copy කරන්න</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Solution 3: Fullscreen exit / toggle */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-[#1a1c0d] border border-amber-300 dark:border-[#3a3d1b] flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <Maximize className="w-4 h-4 text-amber-600" />
                    <span>{getLang('Full Screen පාලනය (Toggle Fullscreen)', 'Toggle Fullscreen', 'முழுத்திரை நிலை')}</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 truncate">
                    {getLang('Full screen ඉවත් කළ විට බ්‍රවුසර් තීරුව දිස්වේ', 'Exit fullscreen to reveal browser UI', 'உலாவியின் பட்டியை காட்ட வெளியேறுக')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs shadow-sm transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  {isFullscreen ? (
                    <>
                      <Minimize className="w-3.5 h-3.5" />
                      <span>{getLang('Fullscreen ඉවත් කරන්න', 'Exit Fullscreen', 'வெளியேறு')}</span>
                    </>
                  ) : (
                    <>
                      <Maximize className="w-3.5 h-3.5" />
                      <span>{getLang('Fullscreen යන්න', 'Fullscreen', 'முழுத்திரை')}</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4. Step-by-Step for Android Chrome & iOS */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0c2419] border border-slate-200 dark:border-[#143d28] space-y-3 text-xs">
                <div className="flex items-center gap-2 font-black text-slate-900 dark:text-emerald-200">
                  <span className="text-base">📋</span>
                  <span>{getLang('Chrome / Safari හි පියවරෙන් පියවර:', 'Step-by-step in Browser:', 'உலாவியில் படிப்படியான வழிகாட்டல்:')}</span>
                </div>

                <div className="space-y-2 text-slate-700 dark:text-zinc-300">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white dark:bg-[#07170e] border border-slate-200 dark:border-[#1a4730]">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      <strong>Android (Chrome):</strong> ඉහළ තිත් තුන (<MoreVertical className="w-3.5 h-3.5 inline text-slate-600 dark:text-zinc-400" />) ඔබා <strong>"Install app"</strong> හෝ <strong>"Add to Home screen"</strong> තෝරන්න.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white dark:bg-[#07170e] border border-slate-200 dark:border-[#1a4730]">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <strong>iPhone (Safari):</strong> පහළ ඇති <strong>Share (<Share className="w-3.5 h-3.5 inline text-sky-500" />)</strong> ඔබා <strong>"Add to Home Screen" (<PlusSquare className="w-3.5 h-3.5 inline text-emerald-500" />)</strong> ඔබන්න.
                    </div>
                  </div>
                </div>
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

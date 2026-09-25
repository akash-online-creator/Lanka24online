import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Maximize, Sparkles } from 'lucide-react';
import { isRunningInStandaloneMode, subscribeToInstallPrompt, triggerNativeInstallPrompt } from '../utils/pwaHelper';
import { Language } from '../types';

interface PWAInstallBannerProps {
  onOpenInstallGuide?: () => void;
  onOpenDetails?: () => void;
  language?: Language;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  onOpenInstallGuide,
  onOpenDetails,
  language = 'si',
}) => {
  const handleOpen = onOpenInstallGuide || onOpenDetails || (() => {});
  const [isStandalone, setIsStandalone] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [canDirectInstall, setCanDirectInstall] = useState(false);

  useEffect(() => {
    const standalone = isRunningInStandaloneMode();
    setIsStandalone(standalone);

    const dismissed = sessionStorage.getItem('sahaya_pwa_banner_dismissed') === 'true';
    setIsDismissed(dismissed);

    const unsubscribe = subscribeToInstallPrompt((available) => {
      setCanDirectInstall(available);
    });

    return () => unsubscribe();
  }, []);

  // Don't show if already running as installed standalone app or if dismissed this session
  if (isStandalone || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('sahaya_pwa_banner_dismissed', 'true');
    } catch {}
  };

  const getLang = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  return (
    <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 text-white px-3 py-2 border-b border-emerald-500/40 shadow-md animate-fadeIn text-xs">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2.5">
        
        <div 
          onClick={handleOpen}
          className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="w-7 h-7 rounded-xl bg-amber-400 text-amber-950 font-black flex items-center justify-center shrink-0 shadow-xs">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-black text-amber-300 flex items-center gap-1.5 truncate">
              <span>{getLang('ලින්ක් එක නොපෙනී App එකක් ලෙස භාවිතා කරන්න', 'Install App to hide top link bar', 'முழு திரையில் பயன்பாட்டை இயக்கவும்')}</span>
              <span className="bg-amber-400/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full border border-amber-400/30">
                100% Fullscreen
              </span>
            </div>
            <p className="text-[10px] text-emerald-200/90 truncate hidden xs:block">
              {getLang('Phone එකට Install කරගෙන Address Bar එක නැතිව පිරිසිදුව විවෘත කරන්න', 'Add to home screen for true standalone native app mode', 'முகப்புத் திரையில் சேர்க்கவும்')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleOpen}
            className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-[11px] shadow-sm flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>{getLang('Install Guide', 'Install', 'நிறுவுக')}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-6 h-6 rounded-lg bg-black/20 hover:bg-black/40 text-white/80 flex items-center justify-center cursor-pointer transition-all"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};

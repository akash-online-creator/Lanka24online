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
  QrCode,
  Store,
  Loader2
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
import { triggerDirectApkDownload } from '../utils/apkDownloadHelper';
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
  
  // Direct APK Download State
  const [isDownloadingApk, setIsDownloadingApk] = useState(false);
  const [apkDownloadNotice, setApkDownloadNotice] = useState(false);

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

  const getLang = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  // Direct APK Download Handler
  const handleDirectApkDownload = async () => {
    setIsDownloadingApk(true);
    try {
      await triggerDirectApkDownload();
      setApkDownloadNotice(true);
    } catch (err) {
      console.error('Direct APK download trigger failed:', err);
      window.location.href = '/apk/sahayasewa-latest.apk';
    } finally {
      setIsDownloadingApk(false);
    }
  };

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

  const directUrl = typeof window !== 'undefined' ? window.location.origin : 'https://supporservice.online';

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(directUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
      }
    } catch {}
  };

  const handleOpenInBrowser = () => {
    window.open(directUrl, '_blank');
  };

  // QR Code URL & Download
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(directUrl)}&color=064e3b&bgcolor=ffffff&margin=1`;

  const handleDownloadQr = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 600, 600);
        ctx.drawImage(img, 20, 20, 560, 560);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = 'sahaya-sewa-qr-code.png';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    img.src = qrApiUrl;
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
              📲
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-wide truncate">
                {getLang('App එක Download & Update කරගන්න', 'Download & Update Sahaya Sewa', 'செயலியை பதிவிறக்குக')}
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-200 font-medium truncate">
                {getLang('Direct APK • QR Code Scan • Chrome / PWA Install', 'Direct APK • QR Code Scan • Chrome / PWA Install', 'நேரடி APK • QR குறியீடு • PWA நிறுவல்')}
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
          {installSuccess && (
            <div className="p-6 text-center space-y-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border-2 border-emerald-500 animate-fadeIn">
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
          )}

          {/* 🌟 METHOD 01: Direct APK Download & Update (ඉහළින්ම Direct APK එක බාගත කර Update කරගැනීම) */}
          <div className="p-4 sm:p-4.5 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 text-white space-y-3 shadow-xl border-2 border-emerald-400/60 relative overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-inner">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>{getLang('ක්‍රමය 01: සෘජු APK Download & Update', 'Method 01: Direct APK Download & Update', 'முறை 01: நேரடி APK பதிவிறக்கம்')}</span>
              </span>
              <span className="text-xs font-mono font-black text-amber-300 bg-black/20 px-2 py-0.5 rounded-lg">
                Android APK
              </span>
            </div>

            <p className="text-xs text-emerald-50 leading-relaxed font-medium">
              {getLang(
                'නවතම Android APK ගොනුව කෙලින්ම ඔබගේ දුරකථනයට Download කරගන්න. දැනටමත් App එක ඇත්නම්, මෙම APK එක install කළ සැණින් කිසිදු දත්තයක් නොමැකී නවතම අනුවාදයට Update වේ.',
                'Download the latest Android APK directly. If already installed, installing this APK will update the app without losing any data.',
                'சமீபத்திய Android APK ஐ நேரடியாக பதிவிறக்கவும். இது ஏற்கனவே உள்ள பயன்பாட்டை புதுப்பிக்கும்.'
              )}
            </p>

            {/* Direct APK Download Button */}
            <button
              type="button"
              disabled={isDownloadingApk}
              onClick={handleDirectApkDownload}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isDownloadingApk ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-950" />
                  <span>{getLang('APK එක බාගත වෙමින් පවතී...', 'Downloading APK...', 'பதிவிறக்குகிறது...')}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-amber-950 animate-bounce" />
                  <span>{getLang('📲 සෘජුවම APK එක Download කරගන්න / Update කරන්න', '📲 Download APK / Update App Now', '📲 APK பதிவிறக்கு / புதுப்பி')}</span>
                </>
              )}
            </button>

            {/* Download notice */}
            {apkDownloadNotice && (
              <div className="p-2.5 rounded-xl bg-black/30 border border-emerald-300/40 text-[11px] flex items-center gap-2 font-bold text-amber-200 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>{getLang('APK එක Download වෙමින් පවතී. Download අවසන් වූ පසු Notification එකෙන් Open කර Install (Update) කරන්න.', 'APK downloading started. Tap the notification to install and update.', 'APK பதிவிறக்கம் தொடங்கியது.')}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-[10px] text-emerald-100/90 font-medium pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>{getLang('ආරක්ෂිතයි • ඔබගේ පිවිසුම් (Login) හෝ දත්ත කිසිවක් මැකී නොයයි.', 'Safe • No login sessions or saved data will be lost.', 'பாதுகாப்பானது • தரவுகள் அழியாது.')}</span>
            </div>
          </div>

          {/* 🌟 METHOD 02: QR Code Scan මඟින් වෙනත් දුරකථනයකට Download කරගැනීම */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#0c2419] border-2 border-emerald-500/50 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-slate-900 dark:text-emerald-200">
                <QrCode className="w-4 h-4 text-emerald-500" />
                <span>{getLang('ක්‍රමය 02: QR Code Scan මඟින් පිවිසීම / Download', 'Method 02: Scan QR Code to Download', 'முறை 02: QR குறியீட்டை ஸ்கேன் செய்து பதிவிறக்குக')}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-400/50">
                Instant Scan
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-medium">
              {getLang(
                'වෙනත් ඕනෑම දුරකථනයක කැමරාවෙන් මෙම QR Code එක Scan කර ක්ෂණිකව සහය සේවා වෙබ් අඩවියට පිවිසීමට හෝ App එක බාගත කරගත හැක.',
                'Scan this QR code with any smartphone camera to instantly access or download Sahaya Sewa.',
                'ஸ்மார்ட்போன் கேமரா மூலம் ஸ்கேன் செய்து உடனடியாக பயன்பாட்டை பதிவிறக்கவும்.'
              )}
            </p>

            {/* QR Graphic Box */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-1">
              <div className="relative p-2.5 bg-white rounded-2xl shadow-md border-2 border-emerald-400 max-w-[150px] aspect-square flex items-center justify-center shrink-0">
                <img 
                  src={qrApiUrl} 
                  alt="Sahaya Sewa Download QR Code" 
                  className="w-full h-full object-contain rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="px-1 py-0.5 bg-white rounded-md shadow-xs border border-emerald-600">
                    <span className="text-[9px] font-black text-emerald-800">🇱🇰 සහය</span>
                  </div>
                </div>
              </div>

              {/* QR Action Buttons */}
              <div className="flex flex-col gap-2 w-full sm:w-auto flex-1">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{getLang('QR පින්තූරය Save කරගන්න', 'Save QR Image', 'QR ஐ சேமி')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-2 px-3 rounded-xl bg-white dark:bg-[#133022] hover:bg-slate-100 dark:hover:bg-[#1a402d] text-slate-800 dark:text-emerald-200 border border-slate-300 dark:border-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{getLang('Link එක Copy විය!', 'Copied!', 'நகலெடுக்கப்பட்டது!')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-emerald-400" />
                      <span>{getLang('App Link එක Copy කරන්න', 'Copy App Link', 'இணைப்பை நகலெடு')}</span>
                    </>
                  )}
                </button>

                <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate font-mono bg-slate-100 dark:bg-zinc-900/60 p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800">
                  {directUrl}
                </div>
              </div>
            </div>
          </div>

          {/* 🌟 METHOD 03: Chrome / Browser මඟින් PWA Install කිරීම */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#0c2419] border border-slate-200 dark:border-emerald-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-slate-900 dark:text-emerald-200">
                <Globe className="w-4 h-4 text-emerald-500" />
                <span>{getLang('ක්‍රමය 03: Chrome / Safari මඟින් Install කිරීම (PWA)', 'Method 03: Install via Chrome / Safari (PWA)', 'முறை 03: உலாவி மூலம் நிறுவுக')}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-medium">
              {getLang(
                'Chrome බ්‍රවුසරයේ දකුණුපස ඇති තිත් 3 (3-Dots) මෙනුව ඔබා "Install app" හෝ "Add to Home screen" තෝරාගෙන දුරකථනයේ මුල් තිරයට එක් කරගත හැක.',
                'Use Chrome / Safari menu to install the web app directly to your home screen.',
                'உலாவியின் மெனு மூலம் முகப்புத் திரையில் சேர்க்கவும்.'
              )}
            </p>

            {canInstall && (
              <button
                type="button"
                onClick={handleNativeInstall}
                disabled={isInstalling}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isInstalling ? 'Install වෙමින් පවතී...' : getLang('📲 1-Click PWA Install', '📲 1-Click PWA Install', '📲 1-கிளிக் நிறுவல்')}</span>
              </button>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenInBrowser}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{getLang('Chrome හි Open කරන්න', 'Open in Chrome', 'Chrome இல் திறக்கவும்')}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
              </button>
            </div>
          </div>

          {/* Close button at bottom */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer transition-all"
            >
              {getLang('වසන්න (Close)', 'Close', 'மூடு')}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

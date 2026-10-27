import React, { useState } from 'react';
import {
  Rocket,
  Download,
  X,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Smartphone
} from 'lucide-react';
import { Language } from '../types';
import { AppUpdateInfo, triggerDirectApkDownload } from '../utils/apkDownloadHelper';

interface AppUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: AppUpdateInfo;
  language?: Language;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  language = 'si',
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!isOpen || !updateInfo) return null;

  const getLang = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  const handleDownloadUpdate = async () => {
    setIsDownloading(true);
    try {
      await triggerDirectApkDownload(updateInfo.downloadUrl);
      setDownloadStarted(true);
    } catch (e) {
      console.error('Download update failed:', e);
      window.open(updateInfo.downloadUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#07170e] text-slate-900 dark:text-zinc-100 rounded-3xl shadow-2xl border-2 border-emerald-500/70 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Rocket className="w-6 h-6 text-amber-300 animate-bounce" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                <span>{getLang('🚀 නව යාවත්කාලීන කිරීමක් ඇත!', 'New Update Available!', 'புதிய புதுப்பிப்பு உள்ளது!')}</span>
              </h2>
              <p className="text-[11px] text-emerald-100 font-medium">
                {getLang(
                  'නවතම විශේෂාංග හා කාර්යක්ෂමතාව සඳහා ඇප් එක Update කරගන්න',
                  'Update the app for new features and performance improvements',
                  'புதிய அம்சங்களுக்கு பயன்பாட்டைப் புதுப்பிக்கவும்'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Version Badge Bar */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400 block">
                {getLang('වත්මන් අනුවාදය', 'Current Version', 'தற்போதைய பதிப்பு')}
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-zinc-300">
                {updateInfo.currentVersion}
              </span>
            </div>

            <div className="flex items-center justify-center px-2">
              <ArrowRight className="w-5 h-5 text-emerald-600 animate-pulse" />
            </div>

            <div className="space-y-0.5 text-right">
              <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 block">
                {getLang('නවතම අනුවාදය', 'New Version', 'புதிய பதிப்பு')}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-black bg-emerald-600 text-white shadow-xs">
                <Sparkles className="w-3 h-3 text-amber-300" />
                {updateInfo.latestVersion}
              </span>
            </div>
          </div>

          {/* Release Notes Card */}
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              {getLang("අලුතින් එක් කළ විශේෂාංග (What's New):", "What's New in this Update:", "புதிய மாற்றங்கள்:")}
            </span>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-line font-medium">
              {updateInfo.releaseNotes?.trim() ? (
                updateInfo.releaseNotes
              ) : (
                <div className="space-y-1">
                  <p>• {getLang('ස්ථාන සුරැකීමේ සහ කළමනාකරණ පහසුකම් (Saved Places & Admin Tools)', 'Saved Places with Edit & Delete management', 'இடங்களை சேமித்து திருத்தும் வசதி')}</p>
                  <p>• {getLang('පද්ධතියේ වේගය සහ සජීවී GPS නිරවද්‍යතාව ඉහළ නැංවීම', 'High-accuracy live GPS and performance optimizations', 'மேம்பட்ட ஜிபிஎஸ் துல்லியம்')}</p>
                  <p>• {getLang('ආරක්ෂක හා ස්ථායීතා වැඩිදියුණු කිරීම්', 'Stability and security improvements', 'பாதுகாப்பு மேம்பாடுகள்')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Download Started Notice Banner */}
          {downloadStarted && (
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs font-bold animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="block font-black text-emerald-800 dark:text-emerald-300">
                  {getLang('✅ APK ගොනුව බාගත වෙමින් පවතී!', '✅ APK downloading started!', '✅ APK பதிவிறக்கம் தொடங்கப்பட்டது!')}
                </span>
                <p className="text-[11px] font-normal leading-snug">
                  {getLang(
                    'Download සම්පූර්ණ වූ පසු Notification එක හෝ Downloads Folder එකෙන් APK එක Open කර Install කරගන්න.',
                    'Once download is complete, tap the notification or open APK from Downloads to install.',
                    'பதிவிறக்கம் முடிந்ததும் APK-ஐ திறந்து நிறுவவும்.'
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Data Safety Assurance */}
          <div className="flex items-center gap-2 px-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {getLang(
                'යාවත්කාලීන කිරීමේදී ඔබගේ ගිණුමේ දත්ත හෝ Login කිසිවක් මැකී නොයයි.',
                'Updating will preserve all your account data, posts, and login session.',
                'உங்கள் கணக்கு தரவு மற்றும் உள்நுழைவு பாதுகாக்கப்படும்.'
              )}
            </span>
          </div>

        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 bg-slate-100 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer transition-all order-2 sm:order-1 text-center"
          >
            {getLang('පසුව මතක් කරන්න (Later)', 'Remind Me Later', 'பிறகு')}
          </button>

          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownloadUpdate}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black shadow-lg cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 order-1 sm:order-2"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{getLang('බාගත වෙමින් පවතී...', 'Downloading...', 'பதிவிறக்குகிறது...')}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 animate-bounce" />
                <span>{getLang('🚀 දැන්ම Update කරගන්න (Update Now)', 'Update Now', 'இப்போது புதுப்பிக்கவும்')}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

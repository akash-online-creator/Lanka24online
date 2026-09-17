import React, { useState, useEffect } from 'react';
import { Language, Theme } from '../types';
import { translations } from '../data/translations';
import { resolveExactLocation, toLocationOption } from '../utils/geoUtils';
import { 
  Moon, 
  Sun, 
  Languages, 
  Heart, 
  KeyRound, 
  Contact2,
  Sparkles
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { FontSizeController } from './FontSizeController';

interface LoginFormProps {
  onLogin: (userId: string, key: string) => void;
  onUserDemoLogin?: () => void;
  onNavigateToRegister: () => void;
  onNavigateToIssues: () => void;
  language: Language;
  setLanguage?: (lang: Language) => void;
  theme?: Theme;
  toggleTheme?: () => void;
  showDemoUserLogin?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onUserDemoLogin,
  onNavigateToRegister,
  onNavigateToIssues,
  language,
  setLanguage,
  theme = 'light',
  toggleTheme,
  showDemoUserLogin = true,
}) => {
  const [userId, setUserId] = useState('');
  const [key, setKey] = useState('');
  const [savedLocation, setSavedLocation] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('sahaya_current_location');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const t = (translations[language] || translations.si) as any;

  // Background Auto-load Location prefetching so it's ready upon login
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const geo = await resolveExactLocation(latitude, longitude);
            const locOpt = toLocationOption(geo);
            localStorage.setItem('sahaya_current_location', JSON.stringify(locOpt));
          } catch (e) {
            // Ignore prefetch error
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(userId.trim(), key.trim());
  };

  const handleNextLanguage = () => {
    if (!setLanguage) return;
    const langSeq: Language[] = ['si', 'en', 'ta'];
    const currentIndex = langSeq.indexOf(language);
    const nextLang = langSeq[(currentIndex + 1) % langSeq.length];
    setLanguage(nextLang);
  };

  const getLanguageDisplayName = (lang: Language) => {
    switch (lang) {
      case 'si':
        return 'සිංහල';
      case 'ta':
        return 'தமிழ்';
      case 'en':
      default:
        return 'English';
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto px-3 py-1 flex flex-col items-center">
      {/* Top Bar Controls (Moon Icon + Language Selector Pill) */}
      <div className="w-full flex items-center justify-start gap-2 mb-1.5">
        {toggleTheme && (
          <button
            type="button"
            onClick={toggleTheme}
            className="w-7 h-7 rounded-full bg-white dark:bg-[#112318] border border-slate-200/80 dark:border-[#1e3d2a] shadow-xs hover:shadow-sm flex items-center justify-center text-slate-700 dark:text-emerald-300 transition-all cursor-pointer active:scale-95"
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-700" />
            )}
          </button>
        )}

        {setLanguage && (
          <button
            type="button"
            onClick={handleNextLanguage}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-[#112318] border border-slate-200/80 dark:border-[#1e3d2a] shadow-xs hover:shadow-sm text-slate-800 dark:text-slate-200 transition-all text-xs font-semibold cursor-pointer active:scale-95"
            title="Change language"
          >
            <Languages className="w-3 h-3 text-slate-600 dark:text-emerald-400" />
            <span>{getLanguageDisplayName(language)}</span>
          </button>
        )}

        <FontSizeController language={language} className="ml-auto" />
      </div>

      {/* App Branding Header */}
      <div className="text-center mb-2 flex flex-col items-center">
        <div className="mb-1 transform hover:scale-105 transition-transform duration-300">
          <AppLogo size="md" showGlow animated />
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-0.5 flex items-center justify-center gap-1">
          <span className="text-[#007a4b] dark:text-[#00c880]">සහය</span>
          <span className="text-amber-600 dark:text-amber-400">සේවා</span>
        </h1>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-black mb-0.5">
          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
          <span>සැමට පිහිට • SAHAYA SEWA</span>
        </div>
        <p className="text-slate-500 dark:text-[#8ba294] text-[11px] font-medium max-w-xs leading-tight">
          {t.loginSubtitle || 'ලේඛනගත සාමාජිකයන් සඳහා ආරක්ෂිත ප්‍රවේශය'}
        </p>

        {/* Verified Location Status Badge */}
        {savedLocation && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="truncate max-w-[260px]">📍 {savedLocation.nameSi || savedLocation.nameEn}</span>
          </div>
        )}
      </div>

      {/* Main Login Card */}
      <div className="w-full bg-white dark:bg-[#0c1811] rounded-2xl p-3.5 sm:p-4 shadow-md shadow-emerald-950/5 dark:shadow-black/50 border border-slate-100 dark:border-[#173222] backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-2.5">
          {/* Field 1: Identity Card / NIC */}
          <div className="space-y-0.5">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              {t.nicLabel || 'හැඳුනුම්පත් අංකය'}
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 pointer-events-none text-slate-400 dark:text-[#3d5d48]">
                <Contact2 className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                placeholder="XXXXXXXXXV"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full bg-white dark:bg-[#07120c] border border-slate-200/90 dark:border-[#162e20] rounded-xl py-2 pl-9 pr-3 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-[#3d5a47] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/30 focus:border-[#00a86b] transition-all text-xs sm:text-sm font-medium"
              />
            </div>
          </div>

          {/* Field 2: Security Code / Password */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                {t.securityCodeLabel || 'ආරක්ෂක කේතය'}
              </label>
              <button
                type="button"
                onClick={onNavigateToIssues}
                className="text-[#00a86b] hover:text-[#008d5a] text-[11px] font-semibold hover:underline cursor-pointer transition-colors"
              >
                {t.forgotCode || 'කේතය වෙනස් කිරීම'}
              </button>
            </div>
            <div className="relative flex items-center">
              <div className="absolute left-3 pointer-events-none text-slate-400 dark:text-[#3d5d48]">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-white dark:bg-[#07120c] border border-slate-200/90 dark:border-[#162e20] rounded-xl py-2 pl-9 pr-3 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-[#3d5a47] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/30 focus:border-[#00a86b] transition-all text-xs sm:text-sm font-medium"
              />
            </div>
          </div>

          {/* Primary Submit Button */}
          <div className="pt-0.5">
            <button
              type="submit"
              className="w-full bg-[#00a86b] hover:bg-[#00925c] active:bg-[#008050] text-white font-bold py-2 px-4 rounded-xl shadow-sm transition-all cursor-pointer text-xs sm:text-sm active:scale-[0.99] flex items-center justify-center"
            >
              <span>{t.loginBtn || 'ඇතුළුවන්න'}</span>
            </button>
          </div>

          {/* Divider with "හෝ" (OR) */}
          <div className="flex items-center my-1.5">
            <div className="flex-1 border-t border-slate-200/80 dark:border-[#162e20]" />
            <span className="px-2 text-slate-400 dark:text-[#52735e] text-[10px] font-medium">
              {t.orDivider || 'හෝ'}
            </span>
            <div className="flex-1 border-t border-slate-200/80 dark:border-[#162e20]" />
          </div>

          {/* Secondary Register Button */}
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="w-full bg-white dark:bg-transparent hover:bg-emerald-50/40 dark:hover:bg-[#0d1f14] text-[#00a86b] font-bold py-2 px-4 rounded-xl border border-[#00a86b] transition-all text-xs sm:text-sm cursor-pointer flex items-center justify-center"
          >
            <span>{t.registerBtn || 'රෙජිස්ටර්වීමට'}</span>
          </button>
        </form>

        {/* Quick Demo Access Bar - Only User Demo (Admin togglable) */}
        {showDemoUserLogin && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-[#173222]">
            <button
              type="button"
              onClick={() => {
                if (onUserDemoLogin) {
                  onUserDemoLogin();
                } else {
                  onLogin('demo_user', 'demo');
                }
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 hover:from-emerald-500/25 hover:to-teal-500/20 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200 text-[11px] sm:text-xs font-black transition-all border border-emerald-300/80 dark:border-emerald-700/80 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                {language === 'en'
                  ? '👤 Sign In as Visitor (User Demo)'
                  : language === 'ta'
                  ? '👤 பார்வையாளராக நுழைக (User Demo)'
                  : '👤 නරඹන්නා ලෙස පිවිසෙන්න (User Demo)'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Footer link for Issues/Help */}
      <div className="mt-1.5 text-center pb-0.5">
        <button
          type="button"
          onClick={onNavigateToIssues}
          className="text-[#00a86b] hover:text-[#008f5b] font-semibold text-xs hover:underline cursor-pointer transition-colors"
        >
          <span>{t.issuesHelpBtn || 'ගැටලු සඳහා'}</span>
        </button>
      </div>
    </div>
  );
};

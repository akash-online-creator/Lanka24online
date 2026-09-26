import React, { useState, useEffect } from 'react';
import { User, Language, Theme } from '../types';
import { translations } from '../data/translations';
import { 
  Moon, 
  Sun, 
  Languages, 
  KeyRound, 
  Contact2,
  Sparkles,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Smartphone
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { FontSizeController } from './FontSizeController';
import { StoredDevicePinData, getStoredDevicePin, clearDevicePin } from '../utils/devicePinManager';
import { DevicePinLoginView } from './DevicePinLoginView';
import { NotificationPermissionBanner } from './NotificationPermissionBanner';
import { requestNotificationPermission } from '../utils/notificationManager';

interface LoginFormProps {
  onLogin: (userId: string, key: string) => Promise<void> | void;
  onUserDemoLogin?: () => void;
  onNavigateToRegister: () => void;
  onNavigateToIssues: () => void;
  language: Language;
  setLanguage?: (lang: Language) => void;
  theme?: Theme;
  toggleTheme?: () => void;
  showDemoUserLogin?: boolean;
  users?: User[];
  onSuccessfulPinLogin?: (user: User) => void;
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
  users = [],
  onSuccessfulPinLogin,
}) => {
  const [userId, setUserId] = useState('');
  const [key, setKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Device PIN state
  const [storedPinData, setStoredPinData] = useState<StoredDevicePinData | null>(() => getStoredDevicePin());
  const [authMode, setAuthMode] = useState<'pin' | 'password'>(() => {
    const pinData = getStoredDevicePin();
    return pinData ? 'pin' : 'password';
  });

  useEffect(() => {
    const currentPin = getStoredDevicePin();
    setStoredPinData(currentPin);
    if (!currentPin && authMode === 'pin') {
      setAuthMode('password');
    }
  }, [authMode]);

  const handleClearPin = () => {
    clearDevicePin();
    setStoredPinData(null);
    setAuthMode('password');
  };

  const t = (translations[language] || translations.si) as any;

  // If user has a valid PIN stored on this device and is in PIN mode, render DevicePinLoginView
  if (storedPinData && authMode === 'pin' && onSuccessfulPinLogin) {
    return (
      <DevicePinLoginView
        storedPinData={storedPinData}
        users={users}
        onSuccessfulPinLogin={onSuccessfulPinLogin}
        onSwitchToPasswordLogin={() => setAuthMode('password')}
        onClearDevicePin={handleClearPin}
        onNavigateToIssues={onNavigateToIssues}
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  // ශ්‍රී ලාංකික NIC අංක සහ Login Identifier Validation
  const validateIdentifier = (inputVal: string) => {
    const clean = inputVal.trim().replace(/\s+/g, '').toUpperCase();
    if (clean === 'ADMIN' || clean.toLowerCase() === 'demo' || clean.toLowerCase() === 'demo_user') return true;
    const oldNicRegex = /^[0-9]{9}[VVXX]$/;
    const newNicRegex = /^[0-9]{12}$/;
    const phoneRegex = /^(0|\+94)?[0-9]{9,10}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return oldNicRegex.test(clean) || newNicRegex.test(clean) || phoneRegex.test(clean) || emailRegex.test(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanIdentifier = userId.trim().replace(/\s+/g, '');

    // 1. Identifier පරීක්ෂාව
    if (!cleanIdentifier || !validateIdentifier(cleanIdentifier)) {
      setError(
        language === 'en'
          ? "Please enter a valid Sri Lankan NIC number (e.g. 912345678V or 199123456789)"
          : language === 'ta'
          ? "செல்லுபடியாகும் NIC எண்ணை உள்ளிடவும் (எ.கா: 912345678V)"
          : "කරුණාකර නිවැරදි NIC අංකයක් ඇතුළත් කරන්න (උදා: 912345678V හෝ 199123456789)"
      );
      return;
    }

    // 2. මුරපද පරීක්ෂාව
    if (!key.trim()) {
      setError(
        language === 'en'
          ? "Please enter your password / security code"
          : "කරුණාකර මුරපදය ඇතුළත් කරන්න"
      );
      return;
    }

    setIsLoading(true);
    try {
      // Auto-trigger notification request on login attempt if not yet asked
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        requestNotificationPermission().catch(() => {});
      }
      await onLogin(cleanIdentifier, key.trim());
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(
        err?.message || 
        (language === 'en'
          ? "Login failed. Please check your credentials."
          : "ලොග් වීමේදී දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.")
      );
    } finally {
      setIsLoading(false);
    }
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
      </div>

      {/* Notification Permission Card (If not yet enabled) */}
      <div className="w-full mb-2">
        <NotificationPermissionBanner language={language} variant="card" />
      </div>

      {/* Main Login Card */}
      <div className="w-full bg-white dark:bg-[#0c1811] rounded-2xl p-3.5 sm:p-4 shadow-md shadow-emerald-950/5 dark:shadow-black/50 border border-slate-100 dark:border-[#173222] backdrop-blur-sm">
        
        {/* Switch back to PIN button if PIN is configured */}
        {storedPinData && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setAuthMode('pin')}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>
                {language === 'en'
                  ? `Switch to PIN Unlock (${storedPinData.userName})`
                  : `🔢 PIN අංකය මඟින් පිවිසෙන්න (${storedPinData.userName})`}
              </span>
            </button>
          </div>
        )}

        {/* Error Alert Box */}
        {error && (
          <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
            <span className="font-medium leading-tight">{error}</span>
          </div>
        )}

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
                disabled={isLoading}
                placeholder="912345678V / 199123456789"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full bg-white dark:bg-[#07120c] border border-slate-200/90 dark:border-[#162e20] rounded-xl py-2 pl-9 pr-3 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-[#3d5a47] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/30 focus:border-[#00a86b] transition-all text-xs sm:text-sm font-mono font-medium uppercase disabled:opacity-50"
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
                type={showPassword ? "text" : "password"}
                required
                disabled={isLoading}
                placeholder="••••••••"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full bg-white dark:bg-[#07120c] border border-slate-200/90 dark:border-[#162e20] rounded-xl py-2 pl-9 pr-9 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-[#3d5a47] focus:outline-none focus:ring-2 focus:ring-[#00a86b]/30 focus:border-[#00a86b] transition-all text-xs sm:text-sm font-medium disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 dark:text-[#3d5d48] hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Primary Submit Button */}
          <div className="pt-0.5">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-[#00a86b] hover:bg-[#00925c] active:bg-[#008050] text-white font-bold py-2 px-4 rounded-xl shadow-sm transition-all text-xs sm:text-sm active:scale-[0.99] flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>කරුණාකර රැඳී සිටින්න...</span>
                </>
              ) : (
                <span>{t.loginBtn || 'ඇතුළුවන්න'}</span>
              )}
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
            disabled={isLoading}
            onClick={onNavigateToRegister}
            className="w-full bg-white dark:bg-transparent hover:bg-emerald-50/40 dark:hover:bg-[#0d1f14] text-[#00a86b] font-bold py-2 px-4 rounded-xl border border-[#00a86b] transition-all text-xs sm:text-sm cursor-pointer flex items-center justify-center disabled:opacity-50"
          >
            <span>{t.registerBtn || 'රෙජිස්ටර්වීමට'}</span>
          </button>
        </form>

        {/* Quick Demo Access Bar - Only User Demo (Admin togglable) */}
        {showDemoUserLogin && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-[#173222]">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                if (onUserDemoLogin) {
                  onUserDemoLogin();
                } else {
                  onLogin('demo_user', 'demo');
                }
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 hover:from-emerald-500/25 hover:to-teal-500/20 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200 text-[11px] sm:text-xs font-black transition-all border border-emerald-300/80 dark:border-emerald-700/80 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
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
          disabled={isLoading}
          onClick={onNavigateToIssues}
          className="text-[#00a86b] hover:text-[#008f5b] font-semibold text-xs hover:underline cursor-pointer transition-colors disabled:opacity-50"
        >
          <span>{t.issuesHelpBtn || 'ගැටලු සඳහා'}</span>
        </button>
      </div>
    </div>
  );
};

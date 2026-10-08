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
  Smartphone,
  Download
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { FontSizeController } from './FontSizeController';
import { StoredDevicePinData, getStoredDevicePin, clearDevicePin } from '../utils/devicePinManager';
import { DevicePinLoginView } from './DevicePinLoginView';
import { NotificationPermissionBanner } from './NotificationPermissionBanner';
import { requestNotificationPermission } from '../utils/notificationManager';
import { triggerDirectApkDownload } from '../utils/apkDownloadHelper';
import { QuickRegistrationHubModal } from './QuickRegistrationHubModal';
import { MarketplaceAddShopModal } from './MarketplaceAddShopModal';
import { MarketShop } from '../types';
import { initialTags } from '../data/initialData';
import { getStoredMarketShops, saveMarketShopsToStorage } from '../data/marketplaceData';

interface LoginFormProps {
  onLogin: (userId: string, key: string) => Promise<void> | void;
  onUserDemoLogin?: () => void;
  onNavigateToRegister: () => void;
  onNavigateToIssues: () => void;
  onNavigateToPermissions?: () => void;
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
  onNavigateToPermissions,
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuickRegistrationHubOpen, setIsQuickRegistrationHubOpen] = useState(false);
  const [isMarketplaceAddShopModalOpen, setIsMarketplaceAddShopModalOpen] = useState(false);
  const [marketplaceShopModalType, setMarketplaceShopModalType] = useState<'shop' | 'business'>('shop');

  const handleSaveMarketShop = (newShop: MarketShop) => {
    const currentShops = getStoredMarketShops();
    const updated = [newShop, ...currentShops.filter((s) => s && s.id !== newShop.id)];
    saveMarketShopsToStorage(updated);
    setIsMarketplaceAddShopModalOpen(false);
    alert(
      marketplaceShopModalType === 'business'
        ? (language === 'en' ? '✅ Your business / enterprise has been successfully registered!' : language === 'ta' ? '✅ உங்கள் வணிகம் வெற்றிகரமாக பதிவு செய்யப்பட்டது!' : '✅ ඔබගේ ව්‍යාපාරය/ආයතනය සාර්ථකව ලියාපදිංචි කරන ලදී!')
        : (language === 'en' ? '✅ Your shop / store has been successfully registered!' : language === 'ta' ? '✅ உங்கள் கடை வெற்றிகரமாக பதிவு செய்யப்பட்டது!' : '✅ ඔබගේ වෙළඳසැල/අලෙවිසැල සාර්ථකව ලියාපදිංචි කරන ලදී!')
    );
  };

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

  // Render PIN login view if conditions match
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

  // Validate Identifier (NIC / Phone / Email / Demo / Admin)
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

  const handleDirectAPKDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await triggerDirectApkDownload();
    } catch (err) {
      console.error('APK Download trigger error:', err);
    } finally {
      setTimeout(() => setIsDownloading(false), 3000);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto px-3 py-1 flex flex-col items-center">
      {/* Top Controls */}
      <div className="w-full flex items-center justify-start gap-2 mb-1.5">
        {toggleTheme && (
          <button
            type="button"
            onClick={toggleTheme}
            className="w-7 h-7 rounded-full bg-white dark:bg-[#112318] border border-slate-200/80 dark:border-[#1e3d2a] shadow-xs hover:shadow-sm flex items-center justify-center text-slate-700 dark:text-emerald-300 transition-all cursor-pointer active:scale-95"
            title="Toggle theme"
            aria-label="Toggle theme"
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
            aria-label="Change language"
          >
            <Languages className="w-3 h-3 text-slate-600 dark:text-emerald-400" />
            <span>{getLanguageDisplayName(language)}</span>
          </button>
        )}

        <FontSizeController language={language} className="ml-auto" />
      </div>

      {/* App Branding Header */}
      <div className="text-center mb-3 flex flex-col items-center">
        <div className="mb-2 transform hover:scale-105 transition-transform duration-300">
          <AppLogo size="2xl" showGlow animated />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1 flex items-center justify-center gap-1.5">
          <span className="text-[#007a4b] dark:text-[#00c880]">සහය</span>
          <span className="text-amber-600 dark:text-amber-400">සේවා</span>
        </h1>
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-black mb-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>සැමට පිහිට • SAHAYA SEWA</span>
        </div>
        <p className="text-slate-500 dark:text-[#8ba294] text-xs font-medium max-w-xs leading-tight">
          {t.loginSubtitle || 'ලේඛනගත සාමාජිකයන් සඳහා ආරක්ෂිත ප්‍රවේශය'}
        </p>
      </div>

      {/* Form Container */}
      <div className="w-full bg-white dark:bg-[#0c1811] rounded-2xl p-3.5 sm:p-4 shadow-md shadow-emerald-950/5 dark:shadow-black/50 border border-slate-100 dark:border-[#173222]">
        
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

        {error && (
          <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
            <span className="font-medium leading-tight">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5">
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
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

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

          <div className="flex items-center my-1.5">
            <div className="flex-1 border-t border-slate-200/80 dark:border-[#162e20]" />
            <span className="px-2 text-slate-400 dark:text-[#52735e] text-[10px] font-medium">
              {t.orDivider || 'හෝ'}
            </span>
            <div className="flex-1 border-t border-slate-200/80 dark:border-[#162e20]" />
          </div>

          {/* ✨ Universal Multi-Category Registration Hub Button */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setIsQuickRegistrationHubOpen(true)}
            className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black py-2.5 px-4 rounded-xl shadow-md hover:scale-[1.01] active:scale-98 transition-all text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2 border border-emerald-400/50"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>{language === 'en' ? '✨ Register Now (Registration Hub)' : language === 'ta' ? '✨ பதிவு செய்க (பதிவு மையம்)' : '✨ ලියාපදිංචි වන්න (ලියාපදිංචි හබ් එක)'}</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onNavigateToRegister}
            className="w-full text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer pt-1"
          >
            {language === 'en' ? 'Or register directly as a new member →' : language === 'ta' ? 'அல்லது புதிய உறுப்பினராக பதிவு செய்யவும் →' : 'හෝ සෘජුවම නව සාමාජිකයෙකු ලෙස ලියාපදිංචි වීමට →'}
          </button>
        </form>

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

        {/* 📲 Direct GitHub Release APK Download Button */}
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-[#173222]">
          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDirectAPKDownload}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] hover:from-emerald-700 hover:to-[#00663e] text-white text-xs font-black shadow-md shadow-emerald-950/20 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-80"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                <span>
                  {language === 'en'
                    ? '⏳ Downloading APK File...'
                    : language === 'ta'
                    ? '⏳ செயலி பதிவிறக்கம் செய்யப்படுகிறது...'
                    : '⏳ APK ගොනුව බාගත වෙමින් පවතී...'}
                </span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-amber-300" />
                <span>
                  {language === 'en'
                    ? '📲 Download & Install Mobile App (APK)'
                    : language === 'ta'
                    ? '📲 செயலியை பதிவிறக்கம் செய்க (Download APK)'
                    : '📲 සහය සේවා App එක Phone එකට Download කරගන්න'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-2 text-center pb-1 flex items-center justify-center gap-3 text-xs">
        {onNavigateToPermissions && (
          <>
            <button
              type="button"
              disabled={isLoading}
              onClick={onNavigateToPermissions}
              className="text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-300 font-semibold hover:underline cursor-pointer transition-colors disabled:opacity-50"
            >
              <span>🔒 අවසර සැකසුම් (Permissions)</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
          </>
        )}
        <button
          type="button"
          disabled={isLoading}
          onClick={onNavigateToIssues}
          className="text-[#00a86b] hover:text-[#008f5b] font-semibold hover:underline cursor-pointer transition-colors disabled:opacity-50"
        >
          <span>{t.issuesHelpBtn || 'ගැටලු සඳහා'}</span>
        </button>
      </div>

      {/* ✨ Universal Multi-Category Registration Hub Modal for New Users */}
      <QuickRegistrationHubModal
        isOpen={isQuickRegistrationHubOpen}
        onClose={() => setIsQuickRegistrationHubOpen(false)}
        language={language}
        onSelectUserRegistration={() => {
          setIsQuickRegistrationHubOpen(false);
          onNavigateToRegister();
        }}
        onSelectBusinessRegistration={() => {
          setIsQuickRegistrationHubOpen(false);
          setMarketplaceShopModalType('business');
          setIsMarketplaceAddShopModalOpen(true);
        }}
        onSelectShopRegistration={() => {
          setIsQuickRegistrationHubOpen(false);
          setMarketplaceShopModalType('shop');
          setIsMarketplaceAddShopModalOpen(true);
        }}
      />

      {/* 🏪 / 🏢 Direct Business & Shop Registration Modal for New Users */}
      <MarketplaceAddShopModal
        isOpen={isMarketplaceAddShopModalOpen}
        onClose={() => setIsMarketplaceAddShopModalOpen(false)}
        currentUser={null}
        allTags={initialTags}
        defaultType={marketplaceShopModalType}
        onSaveShop={handleSaveMarketShop}
      />
    </div>
  );
};

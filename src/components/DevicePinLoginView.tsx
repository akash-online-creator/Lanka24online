import React, { useState, useEffect } from 'react';
import { User, Language, Theme } from '../types';
import { translations } from '../data/translations';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  User as UserIcon,
  RotateCcw,
  Languages,
  Sun,
  Moon,
  LogOut,
  HelpCircle,
  Smartphone
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { FontSizeController } from './FontSizeController';
import { StoredDevicePinData, verifyDevicePin, clearDevicePin } from '../utils/devicePinManager';
import { getUserFromFirestore } from '../lib/user';
import { PWAInstallModal } from './PWAInstallModal';
import { triggerNativeInstallPrompt } from '../utils/pwaHelper';
import { Download } from 'lucide-react';

interface DevicePinLoginViewProps {
  storedPinData: StoredDevicePinData;
  users: User[];
  onSuccessfulPinLogin: (authenticatedUser: User) => void;
  onSwitchToPasswordLogin: () => void;
  onClearDevicePin: () => void;
  onNavigateToIssues: () => void;
  language: Language;
  setLanguage?: (lang: Language) => void;
  theme?: Theme;
  toggleTheme?: () => void;
}

export const DevicePinLoginView: React.FC<DevicePinLoginViewProps> = ({
  storedPinData,
  users,
  onSuccessfulPinLogin,
  onSwitchToPasswordLogin,
  onClearDevicePin,
  onNavigateToIssues,
  language,
  setLanguage,
  theme = 'light',
  toggleTheme,
}) => {
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShake, setIsShake] = useState(false);
  const [isPWAInstallOpen, setIsPWAInstallOpen] = useState(false);

  const t = (translations[language] || translations.si) as any;

  // Mask NIC for privacy e.g. "970185472V" -> "97018****V"
  const getMaskedNic = (nic: string) => {
    if (!nic) return '';
    const clean = nic.trim();
    if (clean.length <= 6) return clean;
    const start = clean.slice(0, 4);
    const end = clean.slice(-2);
    return `${start}****${end}`;
  };

  const handleDigit = (digit: string) => {
    if (isVerifying) return;
    setError(null);
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        submitPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (isVerifying) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isVerifying) return;
    setPin('');
    setError(null);
  };

  // Keyboard listener for physical numeric keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isVerifying) return;
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isVerifying]);

  const submitPin = async (pinToVerify: string) => {
    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyDevicePin(pinToVerify, users, getUserFromFirestore);
      
      if (result.success && result.matchedUser) {
        onSuccessfulPinLogin(result.matchedUser);
      } else {
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
        setPin('');
        
        if (result.reason === 'device_mismatch') {
          alert(result.message || 'වෙනත් Device එකකින් Login වී ඇති බැවින් මෙම Device එකෙහි PIN අංකය Reset කර ඇත.');
          onClearDevicePin();
          onSwitchToPasswordLogin();
          return;
        }

        setError(
          result.message ||
            (language === 'en'
              ? 'Incorrect PIN. Please try again.'
              : language === 'ta'
              ? 'தவறான PIN. மீண்டும் முயற்சிக்கவும்.'
              : 'ඇතුළත් කළ PIN අංකය වැරදියි. කරුණාකර නැවත උත්සාහ කරන්න.')
        );
      }
    } catch (err: any) {
      console.error('PIN verification error:', err);
      setError('සත්‍යාපනය කිරීමේදී දෝෂයක් සිදු විය.');
      setPin('');
    } finally {
      setIsVerifying(false);
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
    <div className="w-full max-w-[400px] mx-auto px-3 py-1 flex flex-col items-center">
      {/* Top Bar Controls */}
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

      {/* Main PIN Unlock Card */}
      <div className="w-full bg-white dark:bg-[#0c1811] rounded-3xl p-4 sm:p-5 shadow-xl shadow-emerald-950/10 dark:shadow-black/60 border border-slate-100 dark:border-[#173222] backdrop-blur-sm flex flex-col items-center">
        
        {/* User Info Capsule */}
        <div className="flex flex-col items-center mb-3">
          <div className="relative mb-2">
            {storedPinData.userPhoto ? (
              <img
                src={storedPinData.userPhoto}
                alt={storedPinData.userName}
                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md text-xl font-black">
                {storedPinData.userName?.charAt(0) || <UserIcon className="w-8 h-8" />}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs border-2 border-white dark:border-[#0c1811]">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
          </div>

          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white text-center leading-tight">
            {storedPinData.userName}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-emerald-400/90 bg-slate-100 dark:bg-[#12281b] px-2 py-0.5 rounded-full border border-slate-200 dark:border-[#1e422c]">
              NIC: {getMaskedNic(storedPinData.nicNumber)}
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-300/80 font-semibold mt-1">
            🔒 {language === 'en' ? 'Quick Device Unlock' : 'Device Quick PIN මඟින් පිවිසෙන්න'}
          </span>
        </div>

        {/* 4 Digit Circles with Shake Animation */}
        <div
          className={`flex items-center justify-center gap-3.5 my-2 transition-transform ${
            isShake ? 'animate-bounce text-red-500' : ''
          }`}
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                  isFilled
                    ? 'bg-emerald-600 border-2 border-emerald-400 scale-105 shadow-md shadow-emerald-500/25'
                    : 'bg-slate-100 dark:bg-[#0e2215] border-2 border-slate-200 dark:border-[#1b3d27]'
                }`}
              >
                {isFilled && <div className="w-3.5 h-3.5 rounded-full bg-white animate-in zoom-in-50" />}
              </div>
            );
          })}
        </div>

        {/* Verifying Indicator or Error */}
        {isVerifying ? (
          <div className="my-1.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>සත්‍යාපනය කරමින්...</span>
          </div>
        ) : error ? (
          <div className="my-1.5 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5 max-w-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="leading-tight">{error}</span>
          </div>
        ) : (
          <p className="my-1 text-[11px] text-slate-400 dark:text-slate-400 font-medium">
            අංක 4ක PIN අංකය ඇතුළත් කරන්න
          </p>
        )}

        {/* Numeric Keypad (1 - 9, 0) */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-[260px] my-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isVerifying}
              onClick={() => handleDigit(digit)}
              className="h-12 rounded-2xl bg-slate-50 dark:bg-[#102417] hover:bg-emerald-50 dark:hover:bg-[#183925] border border-slate-200/90 dark:border-[#1d442c] text-slate-800 dark:text-white text-lg font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={isVerifying || pin.length === 0}
            onClick={handleClear}
            className="h-12 rounded-2xl bg-slate-50 dark:bg-[#102417] hover:bg-slate-100 dark:hover:bg-[#183925] border border-slate-200/90 dark:border-[#1d442c] text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-30 shadow-2xs"
            title="මුල සිට (Clear)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleDigit('0')}
            className="h-12 rounded-2xl bg-slate-50 dark:bg-[#102417] hover:bg-emerald-50 dark:hover:bg-[#183925] border border-slate-200/90 dark:border-[#1d442c] text-slate-800 dark:text-white text-lg font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            0
          </button>
          <button
            type="button"
            disabled={isVerifying || pin.length === 0}
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-slate-50 dark:bg-[#102417] hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/90 dark:border-[#1d442c] text-slate-600 dark:text-slate-300 text-sm font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-30 shadow-2xs"
            title="මකන්න (Delete)"
          >
            ⌫
          </button>
        </div>

        {/* Action Switches (Full Login, Switch Account, Forgot PIN) */}
        <div className="w-full mt-2 pt-2.5 border-t border-slate-100 dark:border-[#173222] space-y-1.5 flex flex-col items-center">
          <button
            type="button"
            disabled={isVerifying}
            onClick={onSwitchToPasswordLogin}
            className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold border border-emerald-300/80 dark:border-emerald-700/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Use NIC & Password instead' : 'හැඳුනුම්පත හා මුරපදය මඟින් පිවිසෙන්න'}</span>
          </button>

          <div className="flex items-center justify-between w-full text-[11px] px-1">
            <button
              type="button"
              disabled={isVerifying}
              onClick={() => {
                if (confirm('මෙම Device එකෙන් PIN අංකය ඉවත් කර වෙනත් ගිණුමකට මාරුවීමට අවශ්‍ය බව තහවුරු කරන්න ද?')) {
                  onClearDevicePin();
                  onSwitchToPasswordLogin();
                }
              }}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-semibold hover:underline cursor-pointer transition-colors"
            >
              👤 වෙනත් ගිණුමක්
            </button>

            <button
              type="button"
              disabled={isVerifying}
              onClick={onNavigateToIssues}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-700 font-semibold hover:underline cursor-pointer transition-colors"
            >
              PIN අංකය අමතකද?
            </button>
          </div>

          {/* 📲 Download & Install App Direct Button */}
          <button
            type="button"
            onClick={async () => {
              const res = await triggerNativeInstallPrompt();
              if (res.outcome !== 'accepted') {
                setIsPWAInstallOpen(true);
              }
            }}
            className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] hover:from-emerald-700 hover:to-[#00663e] text-white text-xs font-black shadow-md shadow-emerald-900/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all animate-pulse"
          >
            <Download className="w-4 h-4 text-amber-300" />
            <span>📲 {language === 'en' ? 'Download Sahaya App' : 'සහය සේවා App එක Phone එකට Download කරගන්න'}</span>
          </button>
        </div>
      </div>

      {/* PWA Install Modal */}
      {isPWAInstallOpen && (
        <PWAInstallModal
          isOpen={isPWAInstallOpen}
          onClose={() => setIsPWAInstallOpen(false)}
          language={language}
        />
      )}
    </div>
  );
};

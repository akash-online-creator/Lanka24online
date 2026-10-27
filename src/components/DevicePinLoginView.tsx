import React, { useState, useEffect } from 'react';
import { User, Language, Theme } from '../types';
import { translations } from '../data/translations';
import { ShieldCheck, Lock, KeyRound, Sparkles, Loader2, AlertCircle, User as UserIcon, RotateCcw, Languages, Sun, Moon, LogOut, HelpCircle, Smartphone } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { FontSizeController } from './FontSizeController';
import { StoredDevicePinData, verifyDevicePin, clearDevicePin } from '../utils/devicePinManager';
import { getUserFromFirestore } from '../lib/user';
export interface DevicePinLoginViewProps {
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
const h = React.createElement;
export const DevicePinLoginView = ({
  storedPinData,
  users,
  onSuccessfulPinLogin,
  onSwitchToPasswordLogin,
  onClearDevicePin,
  onNavigateToIssues,
  language,
  setLanguage,
  theme = 'light',
  toggleTheme
}: DevicePinLoginViewProps) => {
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null as any);
  const [isShake, setIsShake] = useState(false);
  const t = ((translations as any)[language] ? (translations as any)[language] : translations.si);

  const getMaskedNic = (nic: string) => {
    if (!nic) return '';
    const clean = nic.trim();
    if (!(clean.length > 6)) return clean;
    const start = clean.slice(0, 4);
    const end = clean.slice(-2);
    return start + '****' + end;
  };
  const handleDigit = (digit: string) => {
    if (isVerifying) return;
    setError(null);
    if (pin.length !== 4 && !(pin.length > 4)) {
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
    setPin(prev => prev.slice(0, -1));
  };
  const handleClear = () => {
    if (isVerifying) return;
    setPin('');
    setError(null);
  };

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
          alert(result.message ? result.message : 'වෙනත් Device එකකින් Login වී ඇති බැවින් මෙම Device එකෙහි PIN අංකය Reset කර ඇත.');
          onClearDevicePin();
          onSwitchToPasswordLogin();
          return;
        }
        setError((result.message ? result.message : (language === 'en' ? 'Incorrect PIN. Please try again.' : language === 'ta' ? 'தவறான PIN. மீண்டும் முயற்சிக்கவும்.' : 'ඇතුළත් කළ PIN අංකය වැරදියි. කරුණාකර නැවත උත්සාහ කරන්න.')));
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
  return h("div", {
    className: "w-full max-w-[400px] mx-auto px-3 py-1 flex flex-col items-center"
  }, h("div", {
    className: "w-full flex items-center justify-start gap-2 mb-1.5"
  }, toggleTheme && h("button", {
    type: "button",
    onClick: toggleTheme,
    className: "w-7 h-7 rounded-full bg-white dark:bg-[#112318] border border-slate-200/80 dark:border-[#1e3d2a] shadow-xs hover:shadow-sm flex items-center justify-center text-slate-700 dark:text-emerald-300 transition-all cursor-pointer active:scale-95",
    title: "Toggle theme"
  }, theme === 'dark' ? h(Sun, {
    className: "w-3.5 h-3.5 text-emerald-400"
  }) : h(Moon, {
    className: "w-3.5 h-3.5 text-slate-700"
  })), setLanguage && h("button", {
    type: "button",
    onClick: handleNextLanguage,
    className: "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-[#112318] border border-slate-200/80 dark:border-[#1e3d2a] shadow-xs hover:shadow-sm text-slate-800 dark:text-slate-200 transition-all text-xs font-semibold cursor-pointer active:scale-95",
    title: "Change language"
  }, h(Languages, {
    className: "w-3 h-3 text-slate-600 dark:text-emerald-400"
  }), h("span", null, getLanguageDisplayName(language))), h(FontSizeController, {
    language: language,
    className: "ml-auto"
  })), h("div", {
    className: "w-full bg-white dark:bg-[#0c1811] rounded-3xl p-4 sm:p-5 shadow-xl shadow-emerald-950/10 dark:shadow-black/60 border border-slate-100 dark:border-[#173222] backdrop-blur-sm flex flex-col items-center"
  }, h("div", {
    className: "flex flex-col items-center mb-3"
  }, h("div", {
    className: "relative mb-2"
  }, storedPinData.userPhoto ? h("img", {
    src: storedPinData.userPhoto,
    alt: storedPinData.userName,
    className: "w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-md"
  }) : h("div", {
    className: "w-16 h-16 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md text-xl font-black"
  }, storedPinData.userName ? storedPinData.userName.charAt(0) : h(UserIcon, {
    className: "w-8 h-8"
  })), h("div", {
    className: "absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs border-2 border-white dark:border-[#0c1811]"
  }, h(Smartphone, {
    className: "w-3.5 h-3.5"
  }))), h("h2", {
    className: "text-base sm:text-lg font-black text-slate-900 dark:text-white text-center leading-tight"
  }, storedPinData.userName), h("div", {
    className: "flex items-center gap-1.5 mt-0.5"
  }, h("span", {
    className: "text-[11px] font-mono font-bold text-slate-500 dark:text-emerald-400/90 bg-slate-100 dark:bg-[#12281b] px-2 py-0.5 rounded-full border border-slate-200 dark:border-[#1e422c]"
  }, "NIC: ", getMaskedNic(storedPinData.nicNumber))), h("span", {
    className: "text-[10px] text-emerald-700 dark:text-emerald-300/80 font-semibold mt-1"
  }, "🔒 ", language === 'en' ? 'Quick Device Unlock' : 'Device Quick PIN මඟින් පිවිසෙන්න')), h("div", {
    className: 'flex items-center justify-center gap-3.5 my-2 transition-transform ' + (isShake ? 'animate-bounce text-red-500' : '')
  }, [0, 1, 2, 3].map(idx => {
    const isFilled = !(idx >= pin.length);
    return h("div", {
      key: idx,
      className: 'w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ' + (isFilled ? 'bg-emerald-600 border-2 border-emerald-400 scale-105 shadow-md shadow-emerald-500/25' : 'bg-slate-100 dark:bg-[#0e2215] border-2 border-slate-200 dark:border-[#1b3d27]')
    }, isFilled && h("div", {
      className: "w-3.5 h-3.5 rounded-full bg-white animate-in zoom-in-50"
    }));
  })), isVerifying ? h("div", {
    className: "my-1.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold"
  }, h(Loader2, {
    className: "w-4 h-4 animate-spin"
  }), h("span", null, "සත්‍යාපනය කරමින්...")) : error ? h("div", {
    className: "my-1.5 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs font-semibold text-center flex items-center justify-center gap-1.5 max-w-xs"
  }, h(AlertCircle, {
    className: "w-4 h-4 shrink-0 text-red-500"
  }), h("span", {
    className: "leading-tight"
  }, error)) : h("p", {
    className: "my-1 text-[11px] text-slate-400 dark:text-slate-400 font-medium"
  }, "අංක 4ක PIN අංකය ඇතුළත් කරන්න"), h("div", {
    className: "grid grid-cols-3 gap-3 sm:gap-3.5 w-full max-w-[320px] sm:max-w-[340px] my-3"
  }, ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => h("button", {
    key: digit,
    type: "button",
    disabled: isVerifying,
    onClick: () => handleDigit(digit),
    className: "h-14 sm:h-16 rounded-2xl bg-slate-50 dark:bg-[#102417] hover:bg-emerald-100 dark:hover:bg-[#183925] active:bg-emerald-600 active:text-white border-2 border-slate-200/90 dark:border-[#1d442c] text-slate-900 dark:text-white text-2xl sm:text-3xl font-black flex items-center justify-center active:scale-90 transition-all cursor-pointer disabled:opacity-40 shadow-sm touch-manipulation select-none"
  }, digit)), h("button", {
    type: "button",
    disabled: Boolean(isVerifying ? true : pin.length === 0),
    onClick: handleClear,
    className: "h-14 sm:h-16 rounded-2xl bg-slate-50 dark:bg-[#102417] hover:bg-slate-100 dark:hover:bg-[#183925] border-2 border-slate-200/90 dark:border-[#1d442c] text-slate-500 dark:text-slate-400 text-xs font-bold flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-all cursor-pointer disabled:opacity-30 shadow-sm touch-manipulation select-none",
    title: "මුල සිට (Clear)"
  }, h(RotateCcw, {
    className: "w-5 h-5"
  }), h("span", {
    className: "text-[10px] font-bold"
  }, "Clear")), h("button", {
    type: "button",
    disabled: isVerifying,
    onClick: () => handleDigit('0'),
    className: "h-14 sm:h-16 rounded-2xl bg-slate-50 dark:bg-[#102417] hover:bg-emerald-100 dark:hover:bg-[#183925] active:bg-emerald-600 active:text-white border-2 border-slate-200/90 dark:border-[#1d442c] text-slate-900 dark:text-white text-2xl sm:text-3xl font-black flex items-center justify-center active:scale-90 transition-all cursor-pointer disabled:opacity-40 shadow-sm touch-manipulation select-none"
  }, "0"), h("button", {
    type: "button",
    disabled: Boolean(isVerifying ? true : pin.length === 0),
    onClick: handleBackspace,
    className: "h-14 sm:h-16 rounded-2xl bg-slate-50 dark:bg-[#102417] hover:bg-rose-100 dark:hover:bg-rose-950/60 active:bg-rose-600 active:text-white border-2 border-slate-200/90 dark:border-[#1d442c] text-rose-600 dark:text-rose-400 text-xl font-black flex items-center justify-center active:scale-90 transition-all cursor-pointer disabled:opacity-30 shadow-sm touch-manipulation select-none",
    title: "මකන්න (Delete)"
  }, "⌫")), h("div", {
    className: "w-full mt-2 pt-2.5 border-t border-slate-100 dark:border-[#173222] space-y-1.5 flex flex-col items-center"
  }, h("button", {
    type: "button",
    disabled: isVerifying,
    onClick: onSwitchToPasswordLogin,
    className: "w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold border border-emerald-300/80 dark:border-emerald-700/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
  }, h(KeyRound, {
    className: "w-3.5 h-3.5"
  }), h("span", null, language === 'en' ? 'Use NIC & Password instead' : 'හැඳුනුම්පත හා මුරපදය මඟින් පිවිසෙන්න')), h("div", {
    className: "flex items-center justify-between w-full text-[11px] px-1"
  }, h("button", {
    type: "button",
    disabled: isVerifying,
    onClick: () => {
      if (confirm('මෙම Device එකෙන් PIN අංකය ඉවත් කර වෙනත් ගිණුමකට මාරුවීමට අවශ්‍ය බව තහවුරු කරන්න ද?')) {
        onClearDevicePin();
        onSwitchToPasswordLogin();
      }
    },
    className: "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-semibold hover:underline cursor-pointer transition-colors"
  }, "👤 වෙනත් ගිණුමක්"), h("button", {
    type: "button",
    disabled: isVerifying,
    onClick: onNavigateToIssues,
    className: "text-amber-600 dark:text-amber-400 hover:text-amber-700 font-semibold hover:underline cursor-pointer transition-colors"
  }, "PIN අංකය අමතකද?")))));
};

import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, Lock, ArrowRight, X } from 'lucide-react';
import { verifyTotpToken } from '../utils/totpManager';
import { Language } from '../types';

interface GoogleAuthVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifySuccess: () => void;
  secretBase32: string;
  userName?: string;
  language: Language;
}

export const GoogleAuthVerifyModal: React.FC<GoogleAuthVerifyModalProps> = ({
  isOpen,
  onClose,
  onVerifySuccess,
  secretBase32,
  userName,
  language,
}) => {
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCode = code.replace(/\s+/g, '').trim();
    if (cleanCode.length !== 6) {
      setErrorMsg(
        language === 'en'
          ? 'Please enter the 6-digit code from Google Authenticator.'
          : 'කරුණාකර Google Authenticator හි ඇති 6-digit අංකය ඇතුළත් කරන්න.'
      );
      return;
    }

    setIsSubmitting(true);
    const isValid = verifyTotpToken(secretBase32, cleanCode);

    if (isValid) {
      onVerifySuccess();
      setCode('');
      setErrorMsg('');
    } else {
      setErrorMsg(
        language === 'en'
          ? 'Invalid or expired code. Please enter the current code from your authenticator app.'
          : 'අංකය වැරදියි හෝ කල් ඉකුත් වී ඇත! කරුණාකර Google Authenticator ඇප් එකේ ඇති නවතම 6-digit අංකය නැවත බලන්න.'
      );
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-[#0c1811] border-2 border-emerald-500 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,122,75,0.3)] relative overflow-hidden text-left transform transition-all">
        {/* Top Decorative Line */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-600" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/40 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Google Authenticator (2FA)
              </h3>
              <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                දෙපියවර ආරක්ෂක තහවුරු කිරීම
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#162e20] dark:hover:bg-rose-950/50 text-slate-500 hover:text-slate-800 dark:text-slate-400 flex items-center justify-center font-black text-sm transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-zinc-300 mb-4 leading-relaxed">
          {userName ? <strong>{userName}</strong> : 'ඔබගේ'} ගිණුම සඳහා Google Authenticator සක්‍රීය කර ඇත. කරුණාකර ඔබගේ දුරකථනයේ Authenticator ඇප් එක විවෘත කර එහි දිස්වන <strong>6-digit අංකය</strong> ඇතුළත් කරන්න.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                setErrorMsg('');
              }}
              className="w-full bg-white dark:bg-[#07120a] border-2 border-emerald-500 dark:border-emerald-600 rounded-2xl py-3.5 px-4 text-center font-mono font-black text-2xl tracking-[0.35em] text-emerald-900 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-inner"
              autoFocus
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-zinc-300 font-bold text-xs transition-all cursor-pointer"
            >
              අවලංගු කරන්න
            </button>
            <button
              type="submit"
              disabled={isSubmitting || code.replace(/\s+/g, '').length !== 6}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'තහවුරු කරමින්...' : 'ලොග් වීම තහවුරු කරන්න'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

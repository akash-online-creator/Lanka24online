import React, { useState, useEffect } from 'react';
import { ShieldCheck, Copy, Check, Lock, Smartphone, AlertCircle, RefreshCw, X } from 'lucide-react';
import { generateTotpSetup, verifyTotpToken, TotpSetupData } from '../utils/totpManager';
import { Language } from '../types';

interface GoogleAuthSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnableSuccess: (secret: string) => void;
  userLabel: string;
  language: Language;
}

export const GoogleAuthSetupModal: React.FC<GoogleAuthSetupModalProps> = ({
  isOpen,
  onClose,
  onEnableSuccess,
  userLabel,
  language,
}) => {
  const [setupData, setSetupData] = useState<TotpSetupData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSetup();
    } else {
      setSetupData(null);
      setVerificationCode('');
      setErrorMsg('');
      setCopiedKey(false);
    }
  }, [isOpen]);

  const loadSetup = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await generateTotpSetup(userLabel || 'SahayaUser');
      setSetupData(data);
    } catch (err) {
      console.error('Failed to generate TOTP setup:', err);
      setErrorMsg('Google Authenticator සැකසීම ජනනය කිරීමේදී දෝෂයක් ඇතිවිය.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleVerifyAndEnable = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!setupData) return;
    if (!verificationCode.trim() || verificationCode.trim().length !== 6) {
      setErrorMsg(
        language === 'en'
          ? 'Please enter the 6-digit code from Google Authenticator.'
          : 'කරුණාකර Google Authenticator ඇප් එකේ ඇති 6-digit අංකය ඇතුළත් කරන්න.'
      );
      return;
    }

    setIsVerifying(true);
    const isValid = verifyTotpToken(setupData.secret, verificationCode.trim());

    if (isValid) {
      onEnableSuccess(setupData.secret);
      onClose();
    } else {
      setErrorMsg(
        language === 'en'
          ? 'Invalid verification code. Please check your authenticator app and try again.'
          : 'වලංගු නොවන අංකයකි! කරුණාකර ඔබගේ Google Authenticator ඇප් එකේ දිස්වන නවතම 6-digit අංකය නිවැරදිව ඇතුළත් කරන්න.'
      );
    }
    setIsVerifying(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-[#0c1811] border-2 border-emerald-500 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,122,75,0.25)] relative overflow-hidden text-left transform transition-all">
        {/* Top Decorative Line */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-600" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/40 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Google Authenticator (2FA) සක්‍රීය කරන්න
              </h3>
              <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                2-Step Verification Security
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

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">
              QR Code සහ ආරක්ෂක යතුර සකසමින් පවතී...
            </p>
          </div>
        ) : setupData ? (
          <div className="space-y-4 text-xs">
            {/* Step 1: Scan QR */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-emerald-300 shrink-0">
                <img
                  src={setupData.qrCodeDataUrl}
                  alt="Google Authenticator QR Code"
                  className="w-36 h-36 object-contain"
                />
              </div>
              <div className="space-y-2 text-slate-700 dark:text-zinc-300">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600 text-white font-black text-[10px]">
                  <Smartphone className="w-3 h-3" />
                  <span>පියවර 1: QR Code එක Scan කරන්න</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  ඔබගේ දුරකථනයේ <strong>Google Authenticator</strong> හෝ ඕනෑම TOTP ඇප් එකකින් මෙම QR Code එක Scan කරන්න.
                </p>
              </div>
            </div>

            {/* Step 2: Manual Key Option */}
            <div className="bg-slate-50 dark:bg-[#112318] border border-slate-200 dark:border-emerald-900/40 p-3.5 rounded-2xl space-y-1.5">
              <div className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                හෝ අතින් ඇතුළත් කිරීමට මෙම ආරක්ෂිත යතුර (Secret Key) භාවිතා කරන්න:
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white dark:bg-[#07120a] border border-slate-300 dark:border-emerald-800 px-3 py-2 rounded-xl font-mono font-black text-xs text-emerald-800 dark:text-emerald-300 tracking-wider truncate select-all">
                  {setupData.secret}
                </div>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-emerald-900/60 dark:hover:bg-emerald-800 text-slate-800 dark:text-emerald-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Key</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 3: Enter 6-digit Code to Confirm */}
            <form onSubmit={handleVerifyAndEnable} className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-800 dark:text-zinc-200">
                  පියවර 2: Google Authenticator ඇප් එකේ දිස්වන 6-digit අංකය මෙහි ඇතුළත් කරන්න:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                      setErrorMsg('');
                    }}
                    className="w-full bg-white dark:bg-[#07120a] border-2 border-emerald-500 dark:border-emerald-600 rounded-2xl py-3 px-4 text-center font-mono font-black text-xl tracking-[0.3em] text-emerald-900 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-inner"
                    autoFocus
                  />
                </div>
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
                  disabled={isVerifying || verificationCode.trim().length !== 6}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isVerifying ? 'පරීක්ෂා කරමින්...' : 'තහවුරු කර සක්‍රීය කරන්න'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePassword: (newPassword: string, tempPassword?: string) => void;
  userName?: string;
  nicNumber?: string;
  currentTempPassword?: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSavePassword,
  userName,
  nicNumber,
  currentTempPassword = '',
}) => {
  const [tempPassword, setTempPassword] = useState(currentTempPassword);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Sync initial temp password when modal opens
  React.useEffect(() => {
    if (isOpen && currentTempPassword) {
      setTempPassword(currentTempPassword);
    }
  }, [isOpen, currentTempPassword]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanTemp = tempPassword.trim();
    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanNew) {
      setErrorMessage('කරුණාකර නව මුරපදය ඇතුළත් කරන්න.');
      return;
    }

    if (cleanNew.length < 4) {
      setErrorMessage('මුරපදය සඳහා අවම වශයෙන් අක්ෂර 4ක් හෝ ඊට වැඩි ගණනක් ඇතුළත් කරන්න.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setErrorMessage('ඇතුළත් කළ මුරපද දෙක නොගැළපේ. කරුණාකර නැවත පරීක්ෂා කරන්න.');
      return;
    }

    setIsSuccess(true);
    setTimeout(() => {
      onSavePassword(cleanNew, cleanTemp);
      setIsSuccess(false);
      setNewPassword('');
      setConfirmPassword('');
    }, 600);
  };

  return (
    <div
      id="change-password-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#0c1811] border-2 border-emerald-500/80 dark:border-emerald-600/60 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,122,75,0.25)] relative overflow-hidden text-left transform transition-all animate-scaleUp">
        
        {/* Top Emerald Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-[#007a4b] via-emerald-400 to-[#007a4b]" />

        {/* Header with Title and Close '×' button */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#173222] mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-[#007a4b] dark:text-emerald-400 shadow-sm">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              නව මුරපදයක් එකතු කරන්න.
            </h3>
          </div>

          {/* Close '×' Button (Directs to Home page) */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 dark:bg-[#162e20] dark:hover:bg-rose-950/50 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center justify-center font-black text-lg transition-all cursor-pointer shadow-sm active:scale-90"
            title="Close and continue to Home"
          >
            ✕
          </button>
        </div>

        {/* Helpful Info Tip */}
        <div className="bg-emerald-50/80 dark:bg-[#112318] border border-emerald-200 dark:border-[#1e3d2a] rounded-2xl p-3 mb-5 text-xs text-slate-700 dark:text-emerald-200/90 flex items-start gap-2.5 shadow-inner">
          <ShieldCheck className="w-4 h-4 text-[#007a4b] dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">
            ඔබගේ ගිණුමේ ආරක්ෂාව සඳහා තාවකාලික කේතය වෙනුවට ඔබ කැමති නව ස්ථීර මුරපදයක් (Password) ඇතුළත් කරන්න.
          </p>
        </div>

        {/* Error Alert Message */}
        {errorMessage && (
          <div className="mb-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-bold">{errorMessage}</span>
          </div>
        )}

        {/* Success Alert Message */}
        {isSuccess && (
          <div className="mb-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold">මුරපදය සාර්ථකව යාවත්කාලීන විය...!</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Field 0: Current / Temporary Password (දැනට ඇති තාවකාලික මුරපදය) */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">
              දැනට ඇති තාවකාලික මුරපදය (Temporary Password)
            </label>
            <div className="relative flex items-center">
              <input
                type={showTempPassword ? 'text' : 'password'}
                placeholder="දැනට ලැබී ඇති තාවකාලික මුරපදය"
                value={tempPassword}
                onChange={(e) => {
                  setTempPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                className="w-full bg-slate-50 dark:bg-[#07120c] border-2 border-slate-200 dark:border-[#162e20] focus:border-[#007a4b] dark:focus:border-emerald-500 rounded-2xl py-3 pl-4 pr-11 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium focus:outline-none transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowTempPassword(!showTempPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 cursor-pointer"
                title={showTempPassword ? 'Hide password' : 'Show password'}
              >
                {showTempPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Field 1: New Password (නව මුරපදය) */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">
              නව මුරපදය
            </label>
            <div className="relative flex items-center">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                placeholder="නව මුරපදය ඇතුළත් කරන්න"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                className="w-full bg-slate-50 dark:bg-[#07120c] border-2 border-slate-200 dark:border-[#162e20] focus:border-[#007a4b] dark:focus:border-emerald-500 rounded-2xl py-3 pl-4 pr-11 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium focus:outline-none transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 cursor-pointer"
                title={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Field 2: Re-enter Password (නැවත වරක් ඇතුලත් කරන්න) */}
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">
              නැවත වරක් ඇතුලත් කරන්න
            </label>
            <div className="relative flex items-center">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="මුරපදය නැවත ඇතුළත් කරන්න"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                className="w-full bg-slate-50 dark:bg-[#07120c] border-2 border-slate-200 dark:border-[#162e20] focus:border-[#007a4b] dark:focus:border-emerald-500 rounded-2xl py-3 pl-4 pr-11 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium focus:outline-none transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 cursor-pointer"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Action Button: Confirm / Conform */}
          <div className="pt-3">
            <button
              type="submit"
              className="w-full bg-[#00a86b] hover:bg-[#00925c] active:bg-[#007a4b] text-white font-black py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-600/25 border-b-4 border-[#006e43] transition-all cursor-pointer text-base active:translate-y-0.5 active:border-b-0 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Confirm</span>
            </button>
          </div>

          {/* Skip Notice */}
          <p className="text-center text-[11px] text-slate-400 dark:text-[#6a8574] pt-1">
            (දකුණුපස ඇති <strong>✕</strong> ක්ලික් කර පසුව මුරපදය වෙනස් කළ හැක)
          </p>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { User, Language } from '../types';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, X, Sparkles, Smartphone, ArrowRight, RotateCcw } from 'lucide-react';
import { saveDevicePin } from '../utils/devicePinManager';
import { updateUserInFirestore } from '../lib/firebase';

interface DevicePinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  language: Language;
  onPinConfigured: (updatedUser: User) => void;
  isChangeMode?: boolean;
}

export const DevicePinSetupModal: React.FC<DevicePinSetupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  language,
  onPinConfigured,
  isChangeMode = false,
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDigitClick = (digit: string) => {
    setError(null);
    if (step === 'enter') {
      if (pin.length < 4) {
        const nextPin = pin + digit;
        setPin(nextPin);
        if (nextPin.length === 4) {
          setTimeout(() => {
            setStep('confirm');
          }, 200);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const nextConfirm = confirmPin + digit;
        setConfirmPin(nextConfirm);
        if (nextConfirm.length === 4) {
          handleFinalizePin(pin, nextConfirm);
        }
      }
    }
  };

  const handleBackspace = () => {
    setError(null);
    if (step === 'enter') {
      setPin((prev) => prev.slice(0, -1));
    } else {
      if (confirmPin.length === 0) {
        setStep('enter');
      } else {
        setConfirmPin((prev) => prev.slice(0, -1));
      }
    }
  };

  const handleReset = () => {
    setPin('');
    setConfirmPin('');
    setStep('enter');
    setError(null);
  };

  const handleFinalizePin = async (firstPin: string, secondPin: string) => {
    if (firstPin !== secondPin) {
      setError(
        language === 'en'
          ? 'PIN codes do not match. Please try again.'
          : language === 'ta'
          ? 'PIN எண்கள் பொருந்தவில்லை. மீண்டும் முயற்சிக்கவும்.'
          : 'PIN අංක දෙක එකිනෙක නොගැළපේ. කරුණාකර නැවත උත්සාහ කරන්න.'
      );
      setConfirmPin('');
      setStep('enter');
      setPin('');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { deviceId, deviceSessionToken } = await saveDevicePin(currentUser, firstPin);
      
      const updatedUserData: Partial<User> = {
        activeDeviceId: deviceId,
        deviceSessionToken,
        devicePinUpdatedAt: new Date().toISOString(),
      };

      if (currentUser.id) {
        await updateUserInFirestore(currentUser.id, updatedUserData).catch((e) => {
          console.warn('Firestore device PIN sync notice:', e);
        });
      }

      const updatedUser: User = {
        ...currentUser,
        ...updatedUserData,
      };

      setIsSuccess(true);
      setTimeout(() => {
        onPinConfigured(updatedUser);
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Save PIN error:', err);
      setError(err?.message || 'PIN අංකය සුරැකීමේදී දෝෂයක් සිදු විය.');
      setIsSaving(false);
    }
  };

  const currentDisplayPin = step === 'enter' ? pin : confirmPin;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-white dark:bg-[#091810] border-2 border-emerald-500/40 dark:border-emerald-600/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-800 via-teal-900 to-[#022818] text-white relative text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all cursor-pointer"
            title="වසන්න (Close)"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 flex items-center justify-center mx-auto mb-2 shadow-lg">
            <Smartphone className="w-6 h-6" />
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase tracking-wider mb-1">
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            <span>{isChangeMode ? 'PIN අංකය වෙනස් කිරීම' : 'Device Quick PIN Setup'}</span>
          </div>

          <h2 className="text-base sm:text-lg font-black tracking-tight">
            {language === 'en'
              ? 'Set 4-Digit Quick PIN'
              : language === 'ta'
              ? '4 இலக்க விரைவு PIN அமைக்கவும்'
              : 'අංක 4ක ඉක්මන් PIN අංකයක් සකසන්න'}
          </h2>
          <p className="text-[11px] text-emerald-100/80 font-medium mt-0.5 max-w-xs mx-auto leading-tight">
            {language === 'en'
              ? 'Log in instantly on this device next time without typing your full NIC & password'
              : 'මීළඟ වතාවේදී හැඳුනුම්පත් අංකය හා මුරපදය නැවත නැවත ඇතුළත් නොකර මෙම Device එකෙන් ක්ෂණිකව පිවිසෙන්න'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex flex-col items-center">
          {/* Status Instruction */}
          <div className="text-center mb-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {step === 'enter' ? (
                <span>
                  🔹 {language === 'en' ? 'Enter 4-digit PIN:' : 'කැමති අංක 4ක PIN අංකය ඇතුළත් කරන්න:'}
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                  <ArrowRight className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Re-enter PIN to confirm:' : 'තහවුරු කිරීමට එම PIN අංකය නැවත ඇතුළත් කරන්න:'}
                </span>
              )}
            </span>
          </div>

          {/* 4 Digit Circles */}
          <div className="flex items-center justify-center gap-3 my-2">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = index < currentDisplayPin.length;
              return (
                <div
                  key={index}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isFilled
                      ? 'bg-emerald-600 border-2 border-emerald-500 scale-105 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-100 dark:bg-[#112419] border-2 border-slate-300 dark:border-[#1e422c]'
                  }`}
                >
                  {isFilled && <div className="w-3 h-3 rounded-full bg-white animate-in zoom-in-50" />}
                </div>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="w-full my-2 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs text-center flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Success State */}
          {isSuccess && (
            <div className="w-full my-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>PIN අංකය සාර්ථකව සක්‍රිය කරන ලදී!</span>
            </div>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-[260px] my-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                disabled={isSaving || isSuccess}
                onClick={() => handleDigitClick(digit)}
                className="h-11 rounded-2xl bg-slate-50 dark:bg-[#0e2115] hover:bg-emerald-50 dark:hover:bg-[#153422] border border-slate-200 dark:border-[#1a3f29] text-slate-800 dark:text-white text-base font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              disabled={isSaving || isSuccess}
              onClick={handleReset}
              className="h-11 rounded-2xl bg-slate-50 dark:bg-[#0e2115] hover:bg-slate-100 dark:hover:bg-[#153422] border border-slate-200 dark:border-[#1a3f29] text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="නැවත මුල සිට (Reset)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={isSaving || isSuccess}
              onClick={() => handleDigitClick('0')}
              className="h-11 rounded-2xl bg-slate-50 dark:bg-[#0e2115] hover:bg-emerald-50 dark:hover:bg-[#153422] border border-slate-200 dark:border-[#1a3f29] text-slate-800 dark:text-white text-base font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              0
            </button>
            <button
              type="button"
              disabled={isSaving || isSuccess}
              onClick={handleBackspace}
              className="h-11 rounded-2xl bg-slate-50 dark:bg-[#0e2115] hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-[#1a3f29] text-slate-600 dark:text-slate-300 text-xs font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="මකන්න (Delete)"
            >
              ⌫
            </button>
          </div>

          {/* Footer Controls */}
          <div className="w-full pt-2 border-t border-slate-100 dark:border-[#142e1f] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold transition-colors cursor-pointer py-1 px-2"
            >
              {isChangeMode ? 'අවලංගු කරන්න' : 'පසුව සකසන්න (Skip)'}
            </button>

            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
              🔒 මෙම Device එකට පමණි
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

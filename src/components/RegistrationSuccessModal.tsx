import React from 'react';
import { CheckCircle2, MessageSquare, ArrowRight, ShieldCheck, PhoneCall } from 'lucide-react';
import { MedicalPlusBadge } from './MedicalPlusBadge';

interface RegistrationSuccessModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  whatsappNumber?: string;
  userName?: string;
}

export const RegistrationSuccessModal: React.FC<RegistrationSuccessModalProps> = ({
  isOpen,
  onConfirm,
  whatsappNumber,
  userName,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="registration-success-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        className="bg-white border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_25px_60px_rgba(16,185,129,0.3)] relative overflow-hidden text-center transform transition-all animate-scaleUp"
      >
        {/* Top Decorative Emerald Header Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600" />

        {/* 3D Medical Plus Badge Icon */}
        <div className="flex justify-center mb-5 mt-2">
          <div className="relative">
            <MedicalPlusBadge size="lg" showGlow animated />
            <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-1.5 shadow-md border-2 border-white">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-black text-emerald-950 mb-2 tracking-tight">
          ලියාපදිංචිය සාර්ථකව යොමු විය!
        </h3>

        {/* Subtitle / Verification Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black mb-4">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>තොරතුරු පරීක්ෂාව සඳහා යොමු කෙරිණි</span>
        </div>

        {/* Target Message Prompt (Exact Requirement) */}
        <div className="bg-emerald-50/80 border-2 border-emerald-200/80 rounded-2xl p-4 sm:p-5 text-slate-800 text-xs sm:text-sm leading-relaxed text-center space-y-2.5 mb-4 shadow-inner">
          <p className="font-extrabold text-emerald-950 text-[14px] sm:text-[15px] leading-relaxed">
            ලියාපදිංචිය සාර්ථකයි. Admin වරයා පරික්ෂාකර ඔබගේ වට්සැප් ගිණුමට දැනුම්දෙනතුරු මොහොතක් රෑදිසිටින්න.
          </p>
          <div className="pt-2 border-t border-emerald-200/60 font-black text-emerald-800 text-[12px] sm:text-[13px]">
            සහය සේවය සමඟ සම්බන්ධ වූ ඔබට ස්තුතියි....!
          </div>
        </div>

        {/* Free Tier Model Welcome Gift Pill */}
        <div className="bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-teal-500/20 border border-amber-400/40 rounded-2xl p-3 mb-4 text-xs font-bold text-emerald-950 flex items-center justify-center gap-2">
          <span>🎁</span>
          <span>ඔබගේ ගිණුම අනුමත වූ පසු <strong>රු. 100 නොමිලේ (Welcome Bonus)</strong> ස්වයංක්‍රීයව හිමිවේ!</span>
        </div>

        {/* User Context Details Pill */}
        {whatsappNumber && (
          <div className="flex items-center justify-center gap-2 bg-slate-100 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 mb-5 border border-slate-200">
            <PhoneCall className="w-4 h-4 text-emerald-600" />
            <span>වට්ස්ඇප් අංකය:</span>
            <span className="font-mono font-black text-emerald-800">{whatsappNumber}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          id="btn-confirm-registration-notification"
          onClick={onConfirm}
          className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-black py-3.5 px-6 rounded-2xl shadow-[0_10px_25px_rgba(16,185,129,0.35)] border-b-4 border-emerald-950 transition-all cursor-pointer text-sm sm:text-base flex items-center justify-center gap-2"
        >
          <span>හරි (Ok) ✔️</span>
        </button>
      </div>
    </div>
  );
};

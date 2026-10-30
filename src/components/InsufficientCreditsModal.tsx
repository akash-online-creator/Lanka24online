import React from 'react';
import { Coins, PlusCircle, AlertTriangle, X, Building, ArrowRight } from 'lucide-react';
import { User, Language } from '../types';
import { extractNumericId, getUserCreditBalance } from '../utils/creditManager';

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTopUp?: () => void;
  onOpenWallet?: () => void;
  requiredFee?: number;
  requiredAmount?: number;
  currentBalance?: number;
  categoryNameSi?: string;
  categoryName?: string;
  user?: User | null;
  currentUser?: User | null;
  language?: Language;
}

export const InsufficientCreditsModal: React.FC<InsufficientCreditsModalProps> = ({
  isOpen,
  onClose,
  onOpenTopUp,
  onOpenWallet,
  requiredFee: propFee,
  requiredAmount,
  currentBalance: propBalance,
  categoryNameSi: propCatSi,
  categoryName,
  user,
}) => {
  if (!isOpen || !user) return null;

  const requiredFee = propFee ?? requiredAmount ?? 1;
  const categoryNameSi = propCatSi || categoryName || 'සේවාව';
  const handleTopUp = onOpenTopUp || onOpenWallet || (() => {});
  const currentBalance = propBalance !== undefined ? propBalance : getUserCreditBalance(user);
  const shortfall = Math.max(0, requiredFee - currentBalance);
  const numericId = extractNumericId(user?.nicNumber || user?.userId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-[#0a1c12] border-2 border-amber-500 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl transition-all relative">
        
        {/* Top Warning Accent */}
        <div className="h-2.5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />

        <div className="p-5 sm:p-6 text-center space-y-4">
          
          <div className="w-14 h-14 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-inner">
            <Coins className="w-7 h-7 animate-bounce" />
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              ක්‍රෙඩිට් ශේෂය ප්‍රමාණවත් නොවේ!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-1">
              {categoryNameSi} දැන්වීම පළකිරීම සඳහා ගිණුමේ ප්‍රමාණවත් ක්‍රෙඩිට් ශේෂයක් නොමැත.
            </p>
          </div>

          {/* Fee vs Balance Comparison Box */}
          <div className="bg-slate-50 dark:bg-[#06140c] border border-slate-200 dark:border-[#163824] rounded-2xl p-4 text-left space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
              <span>අවශ්‍ය දැන්වීම් ගාස්තුව:</span>
              <span className="text-rose-600 dark:text-rose-400 font-mono font-black text-sm">
                රු. {requiredFee.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
              <span>ඔබගේ වත්මන් ශේෂය:</span>
              <span className="text-slate-900 dark:text-slate-200 font-mono font-black text-sm">
                රු. {currentBalance.toFixed(2)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-[#163824] flex items-center justify-between text-xs font-extrabold text-amber-700 dark:text-amber-300">
              <span>අවම එකතු කළ යුතු මුදල:</span>
              <span className="font-mono font-black text-sm bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                රු. {shortfall > 0 ? shortfall.toFixed(2) : '0.00'}
              </span>
            </div>
          </div>

          {/* Prompt info */}
          <div className="bg-emerald-50 dark:bg-[#0c2418] border border-emerald-300 dark:border-[#1b4a30] p-3 rounded-2xl text-[11px] text-emerald-900 dark:text-emerald-200 font-semibold text-left flex items-start gap-2">
            <Building className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              ලංකා බැංකු (BOC) ගිණුමට මුදල් තැන්පත් කර <span className="font-black underline font-mono text-emerald-950 dark:text-white">{numericId}</span> සටහන් කිරීමෙන් ක්ෂණිකව ශේෂය වැඩි කරගත හැක.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              onClick={() => {
                onClose();
                handleTopUp();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-[#007a4b] hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>ගිණුමට මුදල් එකතු කිරීමට (Top-Up)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#11271b] dark:hover:bg-[#183927] text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              අවලංගු කරන්න (Cancel)
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

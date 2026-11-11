import React from 'react';
import { ShieldAlert, AlertTriangle, Lock, HelpCircle, ArrowRight, X } from 'lucide-react';
import { POLICY_WARNING_MESSAGE, POLICY_BLOCKED_MESSAGE } from '../utils/policyGuard';

interface PolicyViolationModalProps {
  isOpen: boolean;
  onClose: () => void;
  strikes: number;
  isBlocked: boolean;
  onNavigateToIssues?: () => void;
  detectedTypes?: ('phone' | 'link' | 'address')[];
}

export const PolicyViolationModal: React.FC<PolicyViolationModalProps> = ({
  isOpen,
  onClose,
  strikes,
  isBlocked,
  onNavigateToIssues,
  detectedTypes = [],
}) => {
  if (!isOpen) return null;

  const typeLabels = {
    phone: 'දුරකථන / WhatsApp අංක (Phone/WhatsApp)',
    link: 'වෙබ් ලින්ක් (Web Links/URLs)',
    address: 'ලිපිනය / ස්ථාන තොරතුරු (Address/Location)',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative border-2 p-5 sm:p-6 transition-all ${
        isBlocked 
          ? 'bg-gradient-to-b from-rose-950/90 via-slate-900 to-slate-950 border-rose-600 shadow-rose-950/50 text-white' 
          : 'bg-white dark:bg-[#071710] border-amber-500/80 shadow-amber-950/20 text-slate-900 dark:text-slate-100'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md ${
              isBlocked
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
            }`}>
              {isBlocked ? <Lock className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <h3 className={`text-base sm:text-lg font-black flex items-center gap-2 ${
                isBlocked ? 'text-rose-400' : 'text-amber-800 dark:text-amber-300'
              }`}>
                <span>{isBlocked ? 'ගිණුම අවහිර කර ඇත (Blocked)' : 'ආරක්ෂිත ප්‍රතිපත්ති අනතුරු ඇඟවීමයි'}</span>
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-full ${
                  isBlocked
                    ? 'bg-rose-600/40 text-rose-200 border border-rose-500'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                }`}>
                  {isBlocked ? 'උල්ලංඝන වාර 3 ඉක්මවා ඇත (3+ Strikes)' : `අවවාදය: ${Math.min(strikes, 3)}/3`}
                </span>
              </div>
            </div>
          </div>

          {!isBlocked && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="space-y-4">
          
          {/* Exact Sinhala Statement requested */}
          <div className={`p-4 rounded-2xl border text-xs sm:text-sm font-bold leading-relaxed shadow-sm ${
            isBlocked
              ? 'bg-rose-950/50 border-rose-700/60 text-rose-100'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60 text-amber-950 dark:text-amber-100'
          }`}>
            <div className="flex items-start gap-2.5">
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isBlocked ? 'text-rose-400' : 'text-amber-600'}`} />
              <p className="font-semibold text-[13px] sm:text-sm">
                {isBlocked ? POLICY_BLOCKED_MESSAGE : POLICY_WARNING_MESSAGE}
              </p>
            </div>
          </div>

          {/* Details on what was detected & removed */}
          {!isBlocked && detectedTypes.length > 0 && (
            <div className="bg-slate-50 dark:bg-[#0c2217] p-3.5 rounded-2xl border border-slate-200 dark:border-[#19422d] space-y-1.5 text-xs">
              <span className="font-extrabold text-slate-700 dark:text-slate-300 block">
                🛡️ පද්ධතිය මඟින් හඳුනාගත් සහ ඉවත් කරන ලද තොරතුරු:
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 font-medium">
                {detectedTypes.map((type) => (
                  <li key={type} className="text-[12px]">
                    <span className="font-bold text-amber-700 dark:text-amber-400">{typeLabels[type] || type}</span> - අනික් පාර්ශ්වයට නොපෙනෙන පරිදි ඉවත් කරන ලදී.
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold pt-1">
                ✅ දැන්වීම CONFIRM කිරීමෙන් අනතුරුව දුරකථන අංක හා ලිපින සෘජුවම ලබාගත හැක.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            {isBlocked ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onNavigateToIssues) onNavigateToIssues();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer border border-rose-400"
              >
                <HelpCircle className="w-4 h-4" />
                <span>සහය සේවයේ ගැටලු සදහා වන බොත්තම (Issues & Help)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 text-white font-black text-sm shadow-md active:scale-98 transition-all cursor-pointer"
              >
                තේරුම් ගතිමි (I Understand)
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

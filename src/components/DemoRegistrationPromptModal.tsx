import React from 'react';
import { ShieldCheck, UserPlus, X, Sparkles, Lock } from 'lucide-react';
import { Language } from '../types';

interface DemoRegistrationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: () => void;
  customTitle?: string;
  language?: Language;
}

export const DemoRegistrationPromptModal: React.FC<DemoRegistrationPromptModalProps> = ({
  isOpen,
  onClose,
  onRegister,
  customTitle,
  language = 'si',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-[#07190f] border-2 border-emerald-500/80 rounded-3xl shadow-2xl shadow-emerald-950/40 overflow-hidden transform transition-all animate-scaleUp">
        {/* Modal Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-900 p-5 text-white flex items-center justify-between border-b border-emerald-500/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-emerald-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>නරඹන්නාගේ ප්‍රවේශය (Demo Mode)</span>
              </span>
              <h3 className="text-sm sm:text-base font-black">
                ලියාපදිංචිය අවශ්‍යයි
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
              {customTitle || 'මෙම සේවා ලබාගැනිම සදහා ඔබගේ විස්තර ලබාදී ලියාපදිංචි වන්න'}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-sm mx-auto">
              ඔබ දැනට නරඹන්නේ පෙරදසුන් (Demo) ගිණුමකි. සෘජුවම සාමාජිකයන් ඇමතීමට, Chat පණිවිඩ යැවීමට, දැන්වීම් පළකිරීමට සහ සහය ලබාගැනීමට කරුණාකර ඔබගේ විස්තර ඇතුළත් කර ලියාපදිංචි වන්න.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onRegister();
              }}
              className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-lg shadow-emerald-700/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>ලියාපදිංචි වන්න</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 font-bold text-sm border border-slate-200 dark:border-zinc-700 active:scale-95 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

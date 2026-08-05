import React from 'react';
import { AlertCircle, PlusCircle, HeartHandshake } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../data/translations';

interface GlowingNeedHelpBtnProps {
  onClick: () => void;
  lang: Language;
}

export const GlowingNeedHelpBtn: React.FC<GlowingNeedHelpBtnProps> = ({ onClick, lang }) => {
  const t = translations[lang];

  return (
    <div className="my-8 flex flex-col items-center justify-center text-center">
      <div className="relative group cursor-pointer" onClick={onClick}>
        
        {/* Pulsing Outer Glowing Rings - Soft Mint & Green Glow */}
        <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-green-500 opacity-50 blur-xl group-hover:opacity-80 animate-pulse transition duration-1000 group-hover:duration-200"></div>
        <div className="absolute -inset-2 rounded-full bg-emerald-500/30 opacity-70 blur-md animate-ping"></div>

        {/* Central Circular Glowing Button - Forest Green Theme */}
        <button
          className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-[#007a4b] hover:bg-[#006e43] text-white p-4 shadow-[0_15px_35px_rgba(0,122,75,0.4)] group-hover:shadow-[0_20px_50px_rgba(0,122,75,0.6)] flex flex-col items-center justify-center border-4 border-[#009b5e]/40 transform transition-all duration-300 group-hover:scale-105 active:scale-95 cursor-pointer"
        >
          {/* Icon Badge */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#1e9d65] dark:bg-[#1a8c59] flex items-center justify-center mb-2 shadow-inner border border-white/20">
            <HeartHandshake className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-bounce" />
          </div>

          <span className="text-xl sm:text-2xl font-extrabold tracking-wide uppercase drop-shadow-md text-white">
            {t.needHelpGlowingBtn}
          </span>
          
          <div className="mt-1 flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/30">
            <PlusCircle className="w-3.5 h-3.5 text-white" />
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">
              {lang === 'si' ? 'නව ඉල්ලීමක්' : 'POST REQUEST'}
            </span>
          </div>
        </button>
      </div>

      <p className="mt-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 max-w-sm font-medium flex items-center justify-center gap-1.5 bg-white/90 dark:bg-[#0c2217] px-4 py-1.5 rounded-full border border-slate-200 dark:border-[#1a3f2c] shadow-sm">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
        <span>{t.needHelpGlowingSub}</span>
      </p>
    </div>
  );
};

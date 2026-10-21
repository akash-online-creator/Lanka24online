import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';

interface NicSpecimenCardProps {
  customImage?: string | null;
  compact?: boolean;
}

export const NicSpecimenCard: React.FC<NicSpecimenCardProps> = ({ customImage, compact = false }) => {
  return (
    <div className="flex justify-center select-none">
      {/* 1. Laminated Protective Card Outer Sleeve */}
      <div className={`relative bg-white/95 rounded-2xl border-4 border-slate-300 shadow-xl overflow-hidden transition-all duration-300 ${compact ? 'max-w-[280px] p-2' : 'max-w-[340px] p-3'}`}>
        
        {/* Lamination Corner Notch / Sheen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-white/60 pointer-events-none" />
        
        {/* 2. Physical Card Body */}
        <div className="relative bg-[#fafbfa] border border-slate-300 rounded-xl p-3 sm:p-4 text-slate-900 shadow-inner flex flex-col items-center">
          
          {/* Top Header Grid */}
          <div className="w-full flex items-start justify-between gap-1 mb-1">
            {/* Left Country Titles */}
            <div className="text-left leading-tight">
              <div className="text-xs sm:text-sm font-black font-sinhala tracking-tight text-slate-900">
                ශ්‍රී ලංකා/இலங்கை
              </div>
              <div className="text-[10px] sm:text-xs font-black tracking-widest text-slate-900 font-sans uppercase">
                SRI LANKA
              </div>
            </div>

            {/* Center State Lion Emblem */}
            <div className="flex flex-col items-center justify-center -mt-1">
              <div className="w-9 h-11 relative flex items-center justify-center">
                {/* State Crest Emblem Vector */}
                <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-xs" aria-label="Sri Lanka State Emblem">
                  {/* Outer Aureole */}
                  <circle cx="50" cy="50" r="42" fill="#d97706" stroke="#78350f" strokeWidth="3" />
                  <circle cx="50" cy="50" r="37" fill="#fef3c7" stroke="#b45309" strokeWidth="2" strokeDasharray="3 2" />
                  <circle cx="50" cy="28" fill="#854d0e" />
                  
                  {/* Golden Lion with Sword */}
                  <path d="M42 45 Q50 35 58 45 Q58 55 50 58 Q42 55 42 45 Z" fill="#fbbf24" />
                  <rect x="47" y="36" width="16" height="3" fill="#fbbf24" />
                  <line x1="58" y1="33" x2="58" y2="42" stroke="#fbbf24" strokeWidth="2" />
                  
                  {/* Punkalasa Base */}
                  <path d="M30 92 L70 92 L62 108 L38 108 Z" fill="#b45309" stroke="#78350f" strokeWidth="2" />
                  <ellipse cx="50" cy="92" rx="16" ry="6" fill="#f59e0b" />
                  <circle cx="50" cy="84" r="5" fill="#fde68a" />
                  
                  {/* Sun and Moon Symbols */}
                  <circle cx="28" cy="85" r="4" fill="#fbbf24" />
                  <path d="M70 82 A 5 5 0 0 0 74 88 A 4 4 0 1 1 70 82 Z" fill="#fbbf24" />
                </svg>
              </div>
            </div>

            {/* Right Series Number "3" */}
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-slate-700 font-sans leading-none block">
                3
              </span>
            </div>
          </div>

          {/* 1. Prominent NIC Number (හැඳුනුම්පත් අංකය) - Specimen */}
          <div className="w-full flex items-center justify-between px-2.5 py-1 mb-1.5 bg-amber-50/90 border border-amber-300/80 rounded-lg">
            <span className="text-[9px] sm:text-[10px] font-black text-slate-700 font-sinhala">
              හැඳුනුම්පත් අංකය:
            </span>
            <span className="text-[11px] sm:text-xs font-black text-slate-950 font-mono tracking-wider">
              199012345678 / 901234567V
            </span>
          </div>

          {/* 2. Central Portrait Photo with Golden Decorative Border */}
          <div className="my-1 flex justify-center">
            <div className="p-1 rounded bg-gradient-to-b from-amber-400 via-amber-200 to-amber-500 border-2 border-amber-600 shadow-md">
              <div className="w-24 h-32 sm:w-28 sm:h-36 bg-slate-200 overflow-hidden relative flex flex-col items-center justify-center border border-amber-800/40">
                {customImage ? (
                  <img
                    src={customImage}
                    alt="ID Card Photo Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 flex flex-col items-center justify-center p-2 text-center relative">
                    {/* Silhouette Specimen Avatar */}
                    <div className="w-12 h-12 rounded-full bg-slate-400/80 mb-1 border-2 border-slate-300 shadow-inner" />
                    <div className="w-18 h-10 rounded-t-full bg-slate-500/80 shadow-inner" />
                    <span className="absolute bottom-1 bg-amber-500/95 text-slate-950 font-black text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider shadow-xs">
                      හැඳුනුම්පත් ඡායාරූපය
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Date on Left, Signature & Seal on Right */}
          <div className="w-full grid grid-cols-2 gap-1 items-end pt-1 pb-1.5 text-slate-900">
            {/* Left: Issue Date */}
            <div className="text-left">
              <div className="text-[11px] sm:text-xs font-black font-mono tracking-tight text-slate-900">
                2015/09/02
              </div>
              <div className="text-[9px] sm:text-[10px] font-black font-sinhala tracking-tight text-slate-800 flex items-center gap-1">
                <span>දිනය</span>
                <span className="text-[8px] font-sans">திகதி</span>
              </div>
            </div>

            {/* Right: Signature & Commissioner General Title */}
            <div className="text-right flex flex-col items-end">
              {/* Handwritten Blue Signature Vector */}
              <div className="h-4 w-20 relative flex items-center justify-end">
                <svg viewBox="0 0 100 25" className="w-full h-full text-blue-800 stroke-current fill-none stroke-2">
                  <path d="M5 18 Q 20 2, 35 15 T 60 8 T 85 18 T 95 10" />
                  <path d="M25 22 Q 55 5, 80 20" strokeWidth="1.5" />
                </svg>
              </div>
              
              <div className="text-[8px] sm:text-[9px] font-bold font-sinhala leading-tight text-slate-900">
                පුද්ගලයන් ලියාපදිංචි කිරීමේ
              </div>
              <div className="text-[8px] sm:text-[9px] font-bold font-sinhala leading-tight text-slate-900">
                කොමසාරිස් ජනරාල්
              </div>
              <div className="text-[7px] sm:text-[8px] font-medium leading-none text-slate-700 mt-0.5">
                ஆட்களைப் பதிவு செய்யும்
              </div>
              <div className="text-[7px] sm:text-[8px] font-medium leading-none text-slate-700">
                ஆணையாளர் நாயகம்
              </div>
            </div>
          </div>

          {/* Bottom Legal Statutory Footer Box */}
          <div className="w-full border border-slate-900 rounded p-1 text-center bg-white/50">
            <div className="text-[8px] sm:text-[9px] font-black font-sinhala leading-tight text-slate-900">
              1968 අංක 32 දරණ පුද්ගලයන් ලියාපදිංචි කිරීමේ පනත
            </div>
            <div className="text-[7px] sm:text-[8px] font-medium leading-tight text-slate-700 mt-0.5">
              1968 ஆம் ஆண்டு 32 ஆம் இலக்க ஆட்களைப் பதிவு செய்யும் சட்டம்
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};


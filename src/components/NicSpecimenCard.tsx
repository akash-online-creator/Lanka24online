import React from 'react';
import { Shield, Sparkles, CheckCircle2, QrCode } from 'lucide-react';

interface NicSpecimenCardProps {
  customImage?: string | null;
  compact?: boolean;
}

export const NicSpecimenCard: React.FC<NicSpecimenCardProps> = ({ customImage, compact = false }) => {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50/90 via-sky-50/80 to-emerald-50/90 border border-amber-200/80 shadow-xl text-slate-800 font-sans select-none transition-all duration-300 ${compact ? 'p-3 text-xs' : 'p-5'}`}>
      
      {/* Security Background Guilloche Watermark Patterns */}
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none bg-[radial-gradient(#0284c7_1px,transparent_1px)] [background-size:12px_12px]" />
      <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-amber-300/20 blur-2xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-cyan-300/20 blur-2xl pointer-events-none" />
      
      {/* Top Header with Lion Emblem & Tricolor Republic Header */}
      <div className="flex items-center justify-between border-b border-amber-900/10 pb-2.5 mb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          {/* Official Emblem Emblem Graphic */}
          <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-600/30 flex items-center justify-center shadow-sm shrink-0">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-amber-700 fill-current" aria-label="Sri Lanka Emblem">
              <path d="M12 2L9 9H15L12 2Z" fill="#b45309" />
              <circle cx="12" cy="13" r="5" fill="#f59e0b" />
              <path d="M7 13C7 10.2 9.2 8 12 8C14.8 8 17 10.2 17 13C17 15.8 14.8 18 12 18C9.2 18 7 15.8 7 13Z" fill="#b45309" opacity="0.4" />
              <path d="M10 12h4v2h-4z" fill="#78350f" />
            </svg>
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-tight text-amber-950 font-sinhala leading-tight">
              ශ්‍රී ලංකා ප්‍රජාතාන්ත්‍රික සමාජවාදී ජනරජය
            </div>
            <div className="text-[9px] font-semibold text-amber-900/80 tracking-tight leading-none mt-0.5">
              இலங்கை சனநாயக சோசலிசக் குடியரசு · SRI LANKA
            </div>
            <div className="text-[10px] font-black text-sky-900 tracking-wider uppercase font-sinhala mt-0.5">
              ජාතික හැඳුනුම්පත · NATIONAL IDENTITY CARD
            </div>
          </div>
        </div>

        {/* Specimen Tag */}
        <div className="px-2.5 py-1 bg-red-600 text-white font-black text-[10px] tracking-widest rounded-md uppercase shadow-sm border border-red-700 shrink-0">
          ආදර්ශය / SPECIMEN
        </div>
      </div>

      {/* Main Body with User Photo & Specimen Information */}
      <div className="grid grid-cols-12 gap-3.5 relative z-10 items-center">
        
        {/* Photo Box */}
        <div className="col-span-4 flex flex-col items-center">
          <div className="w-full aspect-[3/4] max-h-36 rounded-xl overflow-hidden bg-slate-200 border-2 border-amber-600/40 shadow-inner relative flex items-center justify-center group">
            {customImage ? (
              <img 
                src={customImage} 
                alt="ID Card Photo Preview" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-slate-200 to-slate-300 flex flex-col items-center justify-center p-2 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-400/50 flex items-center justify-center mb-1.5 shadow-sm">
                  <svg className="w-8 h-8 text-slate-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                  ආදර්ශ ඡායාරූපය
                </span>
                <span className="text-[8px] text-slate-500 font-medium">SPECIMEN PHOTO</span>
              </div>
            )}

            {/* Holographic Security Overlay Chip */}
            <div className="absolute bottom-1 right-1 w-6 h-6 rounded-md bg-gradient-to-tr from-amber-400 via-rose-300 to-cyan-300 opacity-90 shadow-sm border border-white/60 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-amber-900" />
            </div>
          </div>

          <div className="mt-1 text-[9px] font-mono font-bold text-amber-900/70 tracking-widest text-center">
            SL-NIC 2026
          </div>
        </div>

        {/* Identity Details Fields */}
        <div className="col-span-8 space-y-1.5 text-left">
          
          {/* NIC Number */}
          <div className="bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-amber-300/60 shadow-xs">
            <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">
              හැඳුනුම්පත් අංකය / NIC NO.
            </span>
            <div className="text-sm font-mono font-extrabold text-blue-950 tracking-wider">
              199508241234 <span className="text-xs font-semibold text-slate-400">(හෝ 952371234V)</span>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <span className="text-[9px] font-bold text-slate-500 block uppercase">
              සම්පූර්ණ නම / FULL NAME
            </span>
            <div className="text-xs font-bold text-slate-900 font-sinhala leading-tight">
              කරුණාරත්න මුදියන්සේලාගේ අසංක
            </div>
            <div className="text-[10px] font-semibold text-slate-700 tracking-tight">
              KARUNARATHNA M. ASANKA
            </div>
          </div>

          {/* Date of Birth & Gender */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[8px] font-bold text-slate-500 block">උපන් දිනය / D.O.B</span>
              <span className="text-[11px] font-mono font-bold text-slate-800">1995.08.24</span>
            </div>
            <div>
              <span className="text-[8px] font-bold text-slate-500 block">ස්ත්‍රී/පුරුෂ / GENDER</span>
              <span className="text-[11px] font-bold text-slate-800 font-sinhala">පුරුෂ / M</span>
            </div>
          </div>

          {/* Address / Location Specimen */}
          <div>
            <span className="text-[8px] font-bold text-slate-500 block">ලිපිනය / ADDRESS</span>
            <span className="text-[10px] font-semibold text-slate-800 font-sinhala line-clamp-1">
              නො. 124, ප්‍රධාන පාර, මහනුවර (Kandy)
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Security Bar with Microprint and Signature line */}
      <div className="mt-3 pt-2 border-t border-amber-900/10 flex items-center justify-between text-[8px] font-mono text-slate-500 relative z-10">
        <div className="flex items-center gap-1.5 font-bold text-amber-950">
          <Shield className="w-3 h-3 text-emerald-600" />
          <span>රජයේ නිල හැඳුනුම්පත් සම්මතය · SRI LANKA DRP</span>
        </div>
        <div className="flex items-center gap-1 font-mono tracking-tighter">
          <span>&lt;&lt;&lt;LKA199508241234&lt;&lt;&lt;&lt;9508248M2601015LKA&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;4</span>
        </div>
      </div>
    </div>
  );
};

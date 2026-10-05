import React from 'react';
import { Phone, Shield, Flame, HeartPulse, Radio, UserCheck, AlertTriangle } from 'lucide-react';
import { EmergencyContactItem } from '../types';

export const EmergencyDirectory: React.FC = () => {
  const emergencyList: EmergencyContactItem[] = [
    {
      id: '119',
      nameSi: 'ශ්‍රී ලංකා පොලිස් හදිසි ඇමතුම්',
      nameEn: 'Police Emergency Response',
      number: '119',
      category: 'ආරක්ෂක',
      badge: 'POLICE 119',
      description: 'හදිසි අපරාධ, අනතුරු හා මහජන ආරක්ෂක සහය සඳහා'
    },
    {
      id: '1990',
      nameSi: '1990 සුවසැරිය ගිලන්රථ සේවය',
      nameEn: 'Suwa Seriya Free Ambulance Service',
      number: '1990',
      category: 'වෛද්‍ය',
      badge: 'AMBULANCE 1990',
      description: 'නොමිලේ 24/7 හදිසි ගිලන්රථ හා පූර්ව රෝහල් ප්‍රතිකාර'
    },
    {
      id: '117',
      nameSi: 'ආපදා කළමනාකරණ මධ්‍යස්ථානය (DMC)',
      nameEn: 'Disaster Management Centre Hotline',
      number: '117',
      category: 'ආපදා',
      badge: 'DISASTER 117',
      description: 'ගංවතුර, නායයෑම්, සුළිසුළං හා ස්වභාවික විපත් දැනුම්දීම්'
    },
    {
      id: '110',
      nameSi: 'ගිනි නිවන හා ගලවාගැනීමේ හමුදාව',
      nameEn: 'Fire & Rescue Service',
      number: '110',
      category: 'ගිනි නිවීම',
      badge: 'FIRE 110',
      description: 'හදිසි ගිනිගැනීම්, සුන්බුන් අතර සිරවීම් හා ගලවාගැනීම්'
    },
    {
      id: '1919',
      nameSi: 'රාජ්‍ය තොරතුරු කේන්ද්‍රය (GIC)',
      nameEn: 'Government Information Centre',
      number: '1919',
      category: 'රාජ්‍ය සේවා',
      badge: 'GIC 1919',
      description: 'සියලුම රාජ්‍ය සේවා හා හදිසි ආධාර සම්බන්ධීකරණ තොරතුරු'
    },
    {
      id: '1938',
      nameSi: 'කාන්තා හා ළමා හදිසි උපකාරක සේවය',
      nameEn: 'Women & Child Abuse Helpline',
      number: '1938',
      category: 'ආරක්ෂක',
      badge: 'HELPLINE 1938',
      description: 'කාන්තා හා ළමා හදිසි ආරක්ෂාව හා සහන සේවාවන්'
    }
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Phone className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-sinhala">
              ජාතික හදිසි දුරකථන අංක (National Helplines)
            </h3>
            <p className="text-xs text-slate-400 font-sinhala">
              එක් ක්ලික් කිරීමකින් සෘජුවම අදාළ හදිසි සේවාවන් අමතන්න
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {emergencyList.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
                  {item.badge}
                </span>
                <span className="text-xs font-semibold text-slate-400 font-sinhala">{item.category}</span>
              </div>

              <h4 className="text-sm font-bold text-white font-sinhala leading-tight">
                {item.nameSi}
              </h4>
              <p className="text-[11px] text-slate-400 font-sinhala mt-1 line-clamp-2">
                {item.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-lg font-mono font-extrabold text-amber-400">
                {item.number}
              </span>
              <a
                href={`tel:${item.number}`}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-sinhala flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-transform active:scale-95"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>අමතන්න</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

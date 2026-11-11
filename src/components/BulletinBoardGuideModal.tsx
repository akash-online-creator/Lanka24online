import React, { useState } from 'react';
import {
  X,
  Lightbulb,
  Sparkles,
  Megaphone,
  Zap,
  Wrench,
  Search,
  Gift,
  Briefcase,
  Store,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Clock,
  PhoneCall,
  DollarSign
} from 'lucide-react';
import { Language } from '../types';

interface BulletinBoardGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  initialSection?: string;
  onSelectSection?: (sectionKey: string) => void;
}

export const BulletinBoardGuideModal: React.FC<BulletinBoardGuideModalProps> = ({
  isOpen,
  onClose,
  language = 'si',
  initialSection = 'all',
  onSelectSection
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialSection || 'all');

  if (!isOpen) return null;

  const getLang = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  const sections = [
    {
      id: 'all',
      titleSi: 'සියලු දැන්වීම් (All Feed)',
      titleEn: 'All Posts Stream',
      titleTa: 'அனைத்து இடுகைகள்',
      icon: Megaphone,
      color: 'from-emerald-600 to-teal-700',
    },
    {
      id: 'quick_services',
      titleSi: '⚡ ඉක්මන් සේවා (Quick Services)',
      titleEn: '⚡ Quick Services',
      titleTa: '⚡ விரைவு சேவை',
      icon: Zap,
      color: 'from-amber-500 to-amber-600',
    },
    {
      id: 'normal_services',
      titleSi: '🛠️ සාමාන්‍ය සේවා (General Services)',
      titleEn: '🛠️ General Services',
      titleTa: '🛠️ பொதுவான சேவைகள்',
      icon: Wrench,
      color: 'from-blue-600 to-indigo-700',
    },
    {
      id: 'find_for_me',
      titleSi: '🔍 සොයාදෙන්න (Find for Me)',
      titleEn: '🔍 Find For Me',
      titleTa: '🔍 கண்டுபிடி',
      icon: Search,
      color: 'from-sky-600 to-cyan-700',
    },
    {
      id: 'from_me_to_you',
      titleSi: '🎁 මගෙන් ඔබට (From Me to You)',
      titleEn: '🎁 From Me to You',
      titleTa: '🎁 என்னிடமிருந்து உங்களுக்கு',
      icon: Gift,
      color: 'from-teal-600 to-emerald-700',
    },
    {
      id: 'professional_services',
      titleSi: '💼 වෘත්තීය සේවා (Professional)',
      titleEn: '💼 Professional Services',
      titleTa: '💼 தொழில்முறை சேவைகள்',
      icon: Briefcase,
      color: 'from-purple-600 to-indigo-700',
    },
    {
      id: 'group_work',
      titleSi: '👥 කණ්ඩායම් වැඩ (Group Work)',
      titleEn: '👥 Group Work & Shramadana',
      titleTa: '👥 கூட்டு வேலை',
      icon: Users,
      color: 'from-indigo-600 to-violet-700',
    },
    {
      id: 'marketplace',
      titleSi: '🏪 සහය වෙළඳපොළ (Marketplace)',
      titleEn: '🏪 Marketplace',
      titleTa: '🏪 சந்தை',
      icon: Store,
      color: 'from-emerald-700 to-teal-800',
    },
  ];

  const handleGoTo = (secId: string) => {
    if (onSelectSection) {
      onSelectSection(secId);
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-zinc-900 border-2 border-emerald-500/50 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-900 text-white shrink-0 shadow-md">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-2xl bg-black/30 hover:bg-black/50 text-white transition-all cursor-pointer shadow-sm active:scale-95"
            title="වසන්න (Close)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 pr-10">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-lg shrink-0">
              <Lightbulb className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-amber-950 uppercase tracking-wider shadow-xs">
                  {getLang('පිටු මාර්ගෝපදේශය හා උදාහරණ', 'Page Guide & Examples', 'வழிகாட்டி & உதாரணங்கள்')}
                </span>
                <span className="text-xs text-emerald-200 font-bold hidden sm:inline">
                  • සහය සේවා පද්ධතිය
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight">
                {getLang('සෑම අංශයක්ම ක්‍රියාත්මක වන ආකාරය', 'How Each Section Operates', 'ஒவ்வொரு பிரிவும் எவ்வாறு செயல்படுகிறது')}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-0.5">
                {getLang(
                  'දැන්වීම් පළකිරීම, සහයවීම, වෙළඳපොළ හා අනෙකුත් සේවාවන් පහසුවෙන් භාවිතා කිරීමට උපදෙස්',
                  'Step-by-step instructions and live scenarios for using every section with confidence',
                  'அனைத்து பிரிவுகளையும் எளிதாகப் பயன்படுத்துவதற்கான விரிவான வழிகாட்டி'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-100 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto scrollbar-none shrink-0">
          {sections.map((sec, sIdx) => {
            const Icon = sec.icon;
            const isActive = activeTab === sec.id;
            return (
              <button
                key={`bulletin_sec_${sec.id}_${sIdx}`}
                type="button"
                onClick={() => setActiveTab(sec.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm scale-105'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{language === 'en' ? sec.titleEn : language === 'ta' ? sec.titleTa : sec.titleSi}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-slate-800 dark:text-zinc-200">
          
          {/* TAB 1: ALL POSTS */}
          {activeTab === 'all' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <h3 className="text-base font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-2 mb-2">
                  <Megaphone className="w-5 h-5 text-emerald-600" />
                  <span>සහය පුවරුව (Live Support Board) යනු කුමක්ද?</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                  ශ්‍රී ලංකාවේ ඔබේ ප්‍රදේශයේ (&lt;15 KM) හෝ මුළු රට පුරාම පළවන සියලුම හදිසි උපකාර, කාර්මික සේවා, පරිත්‍යාග සහ ඉල්ලීම් තත්‍ය කාලීනව (Real-Time) දැකබලා ගැනීමට ඇති ප්‍රධාන සජීවී ප්‍රවාහයයි.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-2">
                  <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ප්‍රධාන ක්‍රියාකාරකම්:</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-slate-600 dark:text-zinc-300 list-disc list-inside">
                    <li>දුර අනුව පෙරහන් කිරීම (&lt;15 KM හෝ සමස්ත ලංකා).</li>
                    <li>දැන්වීම් Save කර පසුව බැලීම.</li>
                    <li>"සහය වන්න" බොත්තම මඟින් උදව් කිරීමට කැමැත්ත පළකිරීම.</li>
                    <li>දැන්වීම් හිමිකරු සමඟ ක්ෂණික Chat කිරීම.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-2">
                  <div className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>සැබෑ උදාහරණයක් (Live Scenario):</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed italic">
                    "කෝවින්න ප්‍රදේශයේ කෙනෙකුගේ වාහනයක් කාර්මික දෝෂයකට ලක්ව ඇති බව සහය පුවරුවේ දිස්වේ. ඔබ අසල සිටින කාර්මිකයෙක් නම්, 'සහය වන්න' ක්ලික් කර දුරකථන අංකය හෝ පණිවිඩයක් යවා ඔහුට උදව් කළ හැක."
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QUICK SERVICES */}
          {activeTab === 'quick_services' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                <h3 className="text-base font-black text-amber-950 dark:text-amber-200 flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-amber-600" />
                  <span>⚡ ඉක්මන් සේවා (Quick Services) ක්‍රියාත්මක වන ආකාරය</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                  හදිසි වාහන අලුත්වැඩියා, වහල කාන්දු, ජලනල හා විදුලි කාර්මික දෝෂ, සෞඛ්‍ය උපකාර වැනි ක්ෂණික සහය අවශ්‍ය අවස්ථාවන් සඳහා වෙන්වූ ප්‍රමුඛතා අංශයයි.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-extrabold text-slate-700 dark:text-zinc-300">පියවර 4ක ක්‍රියාවලිය:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs">
                    <span className="font-black text-amber-600">1. ඉල්ලීම පළකරන්න:</span> සිදු වූ දේ, අවශ්‍ය උදව්ව සහ ස්ථානය ඇතුළත් කරන්න.
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs">
                    <span className="font-black text-amber-600">2. සහයකයන්ගේ ප්‍රතිචාර:</span> අසල සිටින අය උදව් කිරීමට ඉදිරිපත් වේ.
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs">
                    <span className="font-black text-amber-600">3. තහවුරු කිරීම:</span> සුදුසු සහයකයාව තෝරාගෙන Chat හරහා සම්බන්ධ වන්න.
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs">
                    <span className="font-black text-amber-600">4. විසඳුම හා සමාලෝචනය:</span> වැඩ නිම වූ පසු Post එක විසඳුන ලෙස සලකුණු කරන්න.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FIND FOR ME */}
          {activeTab === 'find_for_me' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60">
                <h3 className="text-base font-black text-sky-950 dark:text-sky-200 flex items-center gap-2 mb-2">
                  <Search className="w-5 h-5 text-sky-600" />
                  <span>🔍 සොයාදෙන්න (Find for Me) අංශය</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                  ඔබට සොයාගැනීමට අපහසු ඕනෑම දුර්ලභ භාණ්ඩයක්, අමතර කොටසක්, ඖෂධයක්, කුලී නිවසක් හෝ විශේෂඥ සේවාවක් සොයාගැනීමට ප්‍රජාවේ සහය ලබාගැනීමේ අංශයයි.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-xs space-y-2">
                <div className="font-black text-sky-700 dark:text-sky-300">💡 ප්‍රයෝජනවත් උදාහරණ:</div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                  <strong>උදාහරණ 1:</strong> "1998 Toyota Corolla වාහනයේ වම්පස Side Mirror එකක් සාධාරණ මිලකට සොයාදෙන්න."
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                  <strong>උදාහරණ 2:</strong> "ගම්පහ නගරයට ආසන්නයෙන් මාසිකව රු. 25,000කට අඩුවෙන් ඇනෙක්සියක් සොයාදෙන්න."
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FROM ME TO YOU */}
          {activeTab === 'from_me_to_you' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60">
                <h3 className="text-base font-black text-teal-950 dark:text-teal-200 flex items-center gap-2 mb-2">
                  <Gift className="w-5 h-5 text-teal-600" />
                  <span>🎁 මගෙන් ඔබට (From Me to You) - පරිත්‍යාග හා හුවමාරු</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                  ඔබ සතුව ඇති අමතර පොත්පත්, ඇඳුම් පැළඳුම්, ගෘහභාණ්ඩ හෝ උපකරණ අවශ්‍ය කෙනෙකුට නොමිලේ පරිත්‍යාග කිරීමට, ඉවත් කිරීමට හෝ හුවමාරු කරගැනීමට මෙම අංශය භාවිතා කරන්න.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-teal-100/60 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-800 text-xs">
                  <div className="font-black text-teal-900 dark:text-teal-200 mb-1">🎁 නොමිලේ පරිත්‍යාග</div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400">අවශ්‍ය ඕනෑම අයෙකුට නොමිලේ ලබාදීමට.</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-100/60 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs">
                  <div className="font-black text-emerald-900 dark:text-emerald-200 mb-1">♻️ ඉවත්කිරීම්</div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400">නිවසේ ඉඩකඩ සඳහා රැගෙන යාමට දෙන භාණ්ඩ.</p>
                </div>
                <div className="p-3 rounded-xl bg-cyan-100/60 dark:bg-cyan-950/50 border border-cyan-300 dark:border-cyan-800 text-xs">
                  <div className="font-black text-cyan-900 dark:text-cyan-200 mb-1">🔄 හුවමාරු (Exchange)</div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400">වෙනත් භාණ්ඩයකට මාරු කරගැනීමට.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MARKETPLACE */}
          {activeTab === 'marketplace' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <h3 className="text-base font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-2 mb-2">
                  <Store className="w-5 h-5 text-emerald-600" />
                  <span>🏪 සහය වෙළඳපොළ (Marketplace) ප්‍රධාන අංශ 4</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                  වෙළෙන්දන්, ගැණුම්කරුවන්, දේශීය කඩසාප්පු සහ ව්‍යාපාරික ස්ථාන එකම තැනකට ගෙන එන සම්පූර්ණ වාණිජ වේදිකාවයි.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                  <div className="font-black text-emerald-700 dark:text-emerald-300 mb-1">1. වෙළෙන්දන් (Sellers):</div>
                  <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                    තොග හෝ සිල්ලර බඩු, එළවළු, පළතුරු, නිෂ්පාදන විකිණීමට දැන්වීම් පළකරන්න.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                  <div className="font-black text-teal-700 dark:text-teal-300 mb-1">2. ගැණුම්කරුවන් (Buyers):</div>
                  <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                    තමන්ට මිලදී ගැනීමට අවශ්‍ය තොග හෝ සිල්ලර ද්‍රව්‍ය ගැන ඉල්ලීම් පළකරන්න.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                  <div className="font-black text-cyan-700 dark:text-cyan-300 mb-1">3. අලෙවිසැල් (Shops):</div>
                  <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                    ඔබගේ කඩ සාප්පුව ලියාපදිංචි කර පාරිභෝගිකයින්ට සිතියම හා විස්තර පෙන්වන්න.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                  <div className="font-black text-indigo-700 dark:text-indigo-300 mb-1">4. ව්‍යාපාරික ස්ථාන (Business Places):</div>
                  <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
                    ගරාජ්, සේවා මධ්‍යස්ථාන, හෝටල් හා ආයතන ලියාපදිංචි කර ප්‍රචාරය කරන්න.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PROFESSIONAL SERVICES */}
          {activeTab === 'professional_services' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
                <h3 className="text-base font-black text-purple-950 dark:text-purple-200 flex items-center gap-2 mb-2">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                  <span>💼 වෘත්තීය සේවා (Professional Services) අංශය</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                  සුදුසුකම්ලත් විදුලි කාර්මිකයන්, මේසන්වරුන්, නීතිඥයින්, ගණකාධිකාරීවරුන් සහ අනෙකුත් ප්‍රවීණයන් සොයාගැනීමට සහ ඔබේ වෘත්තීය සේවාව ලියාපදිංචි කිරීමට.
                </p>
              </div>
            </div>
          )}

          {/* TAB 7: GROUP WORK */}
          {activeTab === 'group_work' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60">
                <h3 className="text-base font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>👥 කණ්ඩායම් වැඩ සහ ශ්‍රමදාන (Group Work)</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                  ගමේ පන්සල, පාසල, මංමාවත් පිරිසිදු කිරීම් හෝ ගංවතුර ආපදා සහන කටයුතු වැනි සාමූහික ශ්‍රම දායකත්වයන් සංවිධානය කිරීමට.
                </p>
              </div>
            </div>
          )}

          {/* Direct Jump Button to Current Tab */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold cursor-pointer"
            >
              වසන්න (Close)
            </button>
            <button
              type="button"
              onClick={() => handleGoTo(activeTab)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>මෙම අංශයට යන්න (Open Section)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

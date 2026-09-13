import React, { useState, useEffect } from 'react';
import { MarketSection } from '../types';
import {
  X,
  Store,
  ShoppingCart,
  Building2,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Flame,
  ArrowRight,
  Phone,
  MessageSquare,
  MapPin,
  Layers,
  Clock,
  ShieldCheck,
  Tag,
  Search,
  PlusCircle,
  Eye,
  Lightbulb,
  DollarSign,
  TrendingDown,
  Truck,
  Package,
  BookOpen
} from 'lucide-react';

interface MarketplaceGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: MarketSection;
  onNavigateSection?: (section: MarketSection) => void;
}

export const MarketplaceGuideModal: React.FC<MarketplaceGuideModalProps> = ({
  isOpen,
  onClose,
  initialSection = 'sellers',
  onNavigateSection
}) => {
  const [activeTab, setActiveTab] = useState<MarketSection>(initialSection);

  useEffect(() => {
    if (isOpen && initialSection) {
      setActiveTab(initialSection);
    }
  }, [isOpen, initialSection]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoToSection = (section: MarketSection) => {
    if (onNavigateSection) {
      onNavigateSection(section);
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
                  පරිශීලක මාර්ගෝපදේශය
                </span>
                <span className="text-xs text-emerald-200 font-bold hidden sm:inline">
                  (How It Works & Practical Examples)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black leading-snug">
                සහය වෙළඳපොළ ක්‍රියාත්මක වන ආකාරය සහ උදාහරණ
              </h2>
            </div>
          </div>
        </div>

        {/* 4 Section Navigation Tabs */}
        <div className="p-3 bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-200 dark:border-zinc-700 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                id: 'sellers' as MarketSection,
                label: '1. වෙළෙන්දන්',
                sub: 'තොග / සිල්ලර / හුවමාරු',
                icon: Store,
                activeColor: 'bg-emerald-600 text-white shadow-emerald-600/30'
              },
              {
                id: 'buyers' as MarketSection,
                label: '2. ගැණුම්කරුවන්',
                sub: 'භාණ්ඩ ඉල්ලීම් පළකිරීම',
                icon: ShoppingCart,
                activeColor: 'bg-indigo-600 text-white shadow-indigo-600/30'
              },
              {
                id: 'shops' as MarketSection,
                label: '3. අලෙවිසැල්',
                sub: 'සාප්පු හා නාමාවලි',
                icon: Store,
                activeColor: 'bg-teal-600 text-white shadow-teal-600/30'
              },
              {
                id: 'businesses' as MarketSection,
                label: '4. ව්‍යාපාරික ස්ථාන',
                sub: 'සේවා මධ්‍යස්ථාන & ගරාජ්',
                icon: Building2,
                activeColor: 'bg-amber-600 text-white shadow-amber-600/30'
              }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-2.5 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer border ${
                    isActive
                      ? `${tab.activeColor} border-transparent shadow-md font-black scale-[1.02]`
                      : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 font-bold'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs">{tab.label}</span>
                  </div>
                  <span className={`text-[10px] mt-0.5 truncate max-w-full ${isActive ? 'text-white/90' : 'text-zinc-400'}`}>
                    {tab.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-zinc-100">
          {/* ========================================================================= */}
          {/* 1. SELLERS (වෙළෙන්දන්) GUIDE */}
          {/* ========================================================================= */}
          {activeTab === 'sellers' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Introduction Banner */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-start gap-3.5">
                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shrink-0 mt-0.5 shadow-sm">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-emerald-950 dark:text-emerald-200">
                    වෙළෙන්දන් අංශය ක්‍රියාත්මක වන ආකාරය (Sellers & Deals Guide)
                  </h3>
                  <p className="text-xs text-emerald-900/90 dark:text-emerald-300/90 mt-1 leading-relaxed font-medium">
                    ඔබ නිෂ්පාදකයෙකු, තොග හෝ සිල්ලර වෙළෙන්දෙකු නම් ඔබේ භාණ්ඩ <strong>තොග (Wholesale)</strong>, <strong>සිල්ලර (Retail)</strong> හෝ <strong>හුවමාරු (Barter Exchange)</strong> ලෙස ඉතා පහසුවෙන් පළකර ගැණුම්කරුවන් වෙත සෘජුව අලෙවි කළ හැක.
                  </p>
                </div>
              </div>

              {/* Step by Step Flow */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>පියවරෙන් පියවර ක්‍රියාත්මක වන ආකාරය (Step-by-Step Flow)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-2 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      1
                    </div>
                    <h4 className="font-black text-xs text-slate-900 dark:text-zinc-100">
                      භාණ්ඩයක් එකතු කරන්න
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      "භාණ්ඩයක් එකතු කරන්න" ඔබා නම, Tag, ප්‍රමාණය, විකිණුම් මිල හෝ හුවමාරුවට අවශ්‍ය දේ සටහන් කරන්න.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-2 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      2
                    </div>
                    <h4 className="font-black text-xs text-slate-900 dark:text-zinc-100">
                      අවම මිල පුවරුවේ දිස්වීම
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      ඔබේ භාණ්ඩයේ මිල අඩුම නම්, එය ඉහළින්ම ඇති "අවම විකුණුම් මිල ගනුදෙනු" (Hot Deals) පුවරුවේ ස්වයංක්‍රීයව පෙන්වයි.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-2 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      3
                    </div>
                    <h4 className="font-black text-xs text-slate-900 dark:text-zinc-100">
                      සෘජු ඇමතුම් & WhatsApp
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      ගැණුම්කරුවන් ඔබට WhatsApp හෝ ඇමතුම් මගින් කෙලින්ම සම්බන්ධ වී ඇණවුම් ලබාගනු ඇත.
                    </p>
                  </div>
                </div>
              </div>

              {/* Price Comparison Feature Explanation */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-950 dark:text-amber-200">
                  <TrendingDown className="w-4 h-4 text-amber-600" />
                  <span>අවම විකුණුම් මිල සංසන්දනය (Lowest Price Comparison) ක්‍රියාත්මක වන ආකාරය:</span>
                </div>
                <p className="text-xs text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
                  පුවරුවේ <strong>"බලන්න"</strong> ක්ලික් කල විට එම කාණ්ඩයේ අවම මිල සහ භාණ්ඩය දිස්වේ. එහි <strong>"වැඩි විස්තර"</strong> ක්ලික් කල විට, එම භාණ්ඩ වර්ගය අඩුම මිලේ සිට ඉහළම මිලට (Ascending Order) පෙලගස්වා සියලු වෙළෙන්දන්ගේ නම් සහ දුර ප්‍රමාණයන් සමග සවිස්තරාත්මකව බලාගත හැක.
                </p>
              </div>

              {/* Practical Examples */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>ප්‍රායෝගික උදාහරණ (Practical Examples)</span>
                </div>

                <div className="space-y-3">
                  {/* Example 1: Wholesale */}
                  <div className="p-4 bg-white dark:bg-zinc-800 border-2 border-emerald-500/30 rounded-2xl space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg text-[10px] font-black">
                        උදාහරණය 1 : තොග අලෙවිය (Wholesale Deal)
                      </span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        රු. 235 / kg
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                      නැවුම් කීරි සම්බා සහල් (Keeri Samba Rice) - තොග 500 kg
                    </h4>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/60 p-2.5 rounded-xl">
                      <strong>වෙළෙන්දාගේ සටහන:</strong> "පොළොන්නරුවෙන් ගෙනා නැවුම් සහල් තොග. කඩවත සහ කැලණිය අවට නොමිලේ ගෙනවිත් දෙනු ලැබේ. 50kg මිටි."
                    </div>
                  </div>

                  {/* Example 2: Barter Exchange */}
                  <div className="p-4 bg-white dark:bg-zinc-800 border-2 border-teal-500/30 rounded-2xl space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 rounded-lg text-[10px] font-black">
                        උදාහරණය 2 : භාණ්ඩ හුවමාරුව (Barter Exchange)
                      </span>
                      <span className="text-xs font-black text-teal-600 dark:text-teal-400">
                        හුවමාරුවට (Exchange)
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                      තේ කුඩු පැකට් 50 ක් (Pure Ceylon Tea 400g)
                    </h4>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/60 p-2.5 rounded-xl">
                      <strong>හුවමාරුවට අවශ්‍ය දේ:</strong> "සීනි හෝ පොල්තෙල් තොග සමග හුවමාරු කර ගැනීමට කැමැත්තෙමු."
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleGoToSection('sellers')}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>වෙළෙන්දන් අංශයට යන්න (Go to Sellers Section)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. BUYERS (ගැණුම්කරුවන්) GUIDE */}
          {/* ========================================================================= */}
          {activeTab === 'buyers' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Introduction Banner */}
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-300 dark:border-indigo-800 rounded-2xl flex items-start gap-3.5">
                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shrink-0 mt-0.5 shadow-sm">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-indigo-950 dark:text-indigo-200">
                    ගැණුම්කරුවන් අංශය ක්‍රියාත්මක වන ආකාරය (Buyer Requests Guide)
                  </h3>
                  <p className="text-xs text-indigo-900/90 dark:text-indigo-300/90 mt-1 leading-relaxed font-medium">
                    ඔබට හෝ ඔබේ ව්‍යාපාරයට අවශ්‍ය ඕනෑම භාණ්ඩයක්, අමුද්‍රව්‍යයක් හෝ උපකරණයක් පිළිබඳ <strong>ඉල්ලීමක් (Buyer Request)</strong> පළ කරන්න. වෙළඳපොළේ සිටින සැපයුම්කරුවන් ඔබේ ඉල්ලීම දැක අඩුම මිල ගණන් සමග ඔබව සෘජුවම සම්බන්ධ කරගනු ඇත.
                  </p>
                </div>
              </div>

              {/* Step by Step Flow */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase text-indigo-800 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>ඉල්ලීමක් පළකිරීමේ පියවර (How to Post a Buyer Request)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-2 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      1
                    </div>
                    <h4 className="font-black text-xs text-slate-900 dark:text-zinc-100">
                      ඉල්ලීමක් පළකරන්න
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      "ඉල්ලීමක් එකතු කරන්න" ඔබා ඔබට අවශ්‍ය භාණ්ඩය, ප්‍රමාණය සහ අවශ්‍ය දිනය (අදම හෝ ඉදිරි දිනයක්) සටහන් කරන්න.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-2 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      2
                    </div>
                    <h4 className="font-black text-xs text-slate-900 dark:text-zinc-100">
                      සැපයුම්කරුවන්ගේ අවධානය
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      අවට ප්‍රදේශයේ සිටින වෙළෙන්දන් සහ තොග ගබඩා හිමිකරුවන් ඔබේ ඉල්ලීම ක්ෂණිකව දකී.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-2 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      3
                    </div>
                    <h4 className="font-black text-xs text-slate-900 dark:text-zinc-100">
                      හොඳම මිල තෝරාගන්න
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      ඔබ වෙත ලැබෙන ඇමතුම් සහ WhatsApp පණිවිඩ අතරින් වඩාත්ම වාසිදායක මිල ගණන් සහ ප්‍රවාහන පහසුකම් තෝරාගන්න.
                    </p>
                  </div>
                </div>
              </div>

              {/* Practical Examples */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>ප්‍රායෝගික උදාහරණ (Buyer Request Examples)</span>
                </div>

                <div className="space-y-3">
                  {/* Example 1 */}
                  <div className="p-4 bg-white dark:bg-zinc-800 border-2 border-indigo-500/30 rounded-2xl space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 rounded-lg text-[10px] font-black">
                        උදාහරණය 1 : හදිසි අවශ්‍යතාවයක් (Urgent Requirement)
                      </span>
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md">
                        අදම අවශ්‍යයි
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                      අඩි 20 කන්ටේනර් පෙට්ටියක් (20ft Used Storage Container)
                    </h4>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/60 p-2.5 rounded-xl">
                      <strong>ඉල්ලුම්කරුගේ සටහන:</strong> "ගබඩා කටයුතු සඳහා හොඳ තත්ත්වයේ අඩි 20 කන්ටේනරයක් අවශ්‍යයි. ප්‍රවාහනය කර කඩවතට බස්සවා දිය හැකි අය පමණක් අමතන්න."
                    </div>
                  </div>

                  {/* Example 2 */}
                  <div className="p-4 bg-white dark:bg-zinc-800 border-2 border-violet-500/30 rounded-2xl space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 rounded-lg text-[10px] font-black">
                        උදාහරණය 2 : ව්‍යාපාරික අමුද්‍රව්‍ය (Business Supply)
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        සතියකට 100 kg
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                      පොල්තෙල් ලීටර් 100 ක් සහ කුළුබඩු තොග
                    </h4>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/60 p-2.5 rounded-xl">
                      <strong>ඉල්ලුම්කරුගේ සටහන:</strong> "ආපනශාලාවක් සඳහා පිරිසිදු පොල්තෙල් සහ වියළි මිරිස් තොග මිලට සපයන අය අමතන්න."
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleGoToSection('buyers')}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>ගැණුම්කරුවන් අංශයට යන්න (Go to Buyers Section)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. SHOPS & STORES (අලෙවිසැල්) GUIDE */}
          {/* ========================================================================= */}
          {activeTab === 'shops' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Introduction Banner */}
              <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border-2 border-teal-300 dark:border-teal-800 rounded-2xl flex items-start gap-3.5">
                <div className="p-2.5 bg-teal-600 text-white rounded-2xl shrink-0 mt-0.5 shadow-sm">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-teal-950 dark:text-teal-200">
                    අලෙවිසැල් අංශය ක්‍රියාත්මක වන ආකාරය (Shops & Stores Guide)
                  </h3>
                  <p className="text-xs text-teal-900/90 dark:text-teal-300/90 mt-1 leading-relaxed font-medium">
                    ඔබට සාප්පුවක්, සුපිරි වෙළඳසැලක්, ෆාමසියක්, දෘඩාංග (Hardware) හෝ <strong>Online Store</strong> එකක් තිබේද? ඔබේ අලෙවිසැල සහ එහි ඇති ප්‍රධාන භාණ්ඩ ලැයිස්තුව (Inventory) මෙහි ඇතුළත් කර ගනුදෙනුකරුවන්ට පහසුවෙන් සොයාගැනීමට ඉඩ දෙන්න.
                  </p>
                </div>
              </div>

              {/* Step by Step Flow */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase text-teal-800 dark:text-teal-400 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>අලෙවිසැලක් ඇතුළත් කිරීමේ පියවර (How to Register a Shop)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-2 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-teal-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      1
                    </div>
                    <h4 className="font-black text-xs text-slate-900 dark:text-zinc-100">
                      සාප්පුවේ විස්තර ඇතුළත් කරන්න
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      සාප්පුවේ නම, භෞතික (Physical) ද නැතහොත් Online ද යන්න, විවෘත වේලාවන් සහ ලිපිනය සටහන් කරන්න.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-2 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-teal-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      2
                    </div>
                    <h4 className="font-black text-xs text-slate-900 dark:text-zinc-100">
                      භාණ්ඩ නාමාවලිය (Inventory)
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      ඔබ සතු ප්‍රධාන භාණ්ඩවල නම්, මිල ගණන් සහ ප්‍රමාණ එකතු කරන්න.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-2 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-teal-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      3
                    </div>
                    <h4 className="font-black text-xs text-slate-900 dark:text-zinc-100">
                      Preview, Edit & Manage
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      "මගේ අලෙවිසැල" තුළින් Preview බැලීම, භාණ්ඩ වෙනස් කිරීම (Edit) හෝ ඉවත් කිරීම (Delete) කළ හැක.
                    </p>
                  </div>
                </div>
              </div>

              {/* Practical Examples */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>ප්‍රායෝගික උදාහරණ (Registered Shop Example)</span>
                </div>

                <div className="p-4 bg-white dark:bg-zinc-800 border-2 border-teal-500/30 rounded-2xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 rounded-lg text-[10px] font-black">
                      🏪 භෞතික අලෙවිසැල (Physical Store)
                    </span>
                    <span className="text-[11px] font-bold text-zinc-500">
                      විවෘතයි: පෙ.ව. 8.00 - ප.ව. 9.30
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                    කඩවත සුපර් මාර්ට් (Kadawatha Super Mart)
                  </h4>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/60 p-2.5 rounded-xl space-y-1">
                    <div className="font-bold text-slate-800 dark:text-zinc-200">
                      සාප්පුවේ ප්‍රධාන භාණ්ඩ (Inventory):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                      <div>• සම්බා සහල් 10kg - රු. 2,600</div>
                      <div>• සුදු සීනි 1kg - රු. 240</div>
                      <div>• පොල්තෙල් 1L - රු. 820</div>
                      <div>• තේ කොළ 400g - රු. 550</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleGoToSection('shops')}
                  className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>අලෙවිසැල් අංශයට යන්න (Go to Shops Section)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. BUSINESS PLACES (ව්‍යාපාරික ස්ථාන) GUIDE */}
          {/* ========================================================================= */}
          {activeTab === 'businesses' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Introduction Banner */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-3.5">
                <div className="p-2.5 bg-amber-600 text-white rounded-2xl shrink-0 mt-0.5 shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-950 dark:text-amber-200">
                    ව්‍යාපාරික ස්ථාන අංශය ක්‍රියාත්මක වන ආකාරය (Business Places Guide)
                  </h3>
                  <p className="text-xs text-amber-900/90 dark:text-amber-300/90 mt-1 leading-relaxed font-medium">
                    ඔබේ ගරාජය, වාහන සේවා මධ්‍යස්ථානය, මුද්‍රණාලය, ලී බඩු වැඩපළ, රෙදි සෝදන සේවාව, ශාලාව හෝ කර්මාන්තශාලාව මෙහි ලියාපදිංචි කරන්න. පාරිභෝගිකයින්ට ඔබගේ සේවාවන්, ගාස්තු, විවෘත වේලාවන් සහ Google Maps පිහිටීම පහසුවෙන්ම බලාගත හැක.
                  </p>
                </div>
              </div>

              {/* Step by Step Flow */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase text-amber-800 dark:text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>ව්‍යාපාරයක් ලියාපදිංචි කිරීමේ පියවර (How to Register a Business)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-2 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-amber-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      1
                    </div>
                    <h4 className="font-black text-xs text-slate-900 dark:text-zinc-100">
                      ව්‍යාපාර තොරතුරු ඇතුළත් කරන්න
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      "නව ව්‍යාපාරයක් එකතු කරන්න" ඔබා ආයතනයේ නම, ලිපිනය, සේවාවන් සහ දුරකථන අංක ඇතුළත් කරන්න.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-2 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-amber-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      2
                    </div>
                    <h4 className="font-black text-xs text-slate-900 dark:text-zinc-100">
                      සේවාවන් සහ ගාස්තු
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      ඔබ සපයන ප්‍රධාන සේවා වර්ග (Services/Tariffs) මිල ගණන් සහිතව ලැයිස්තුගත කරන්න.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl space-y-2 shadow-xs">
                    <div className="w-8 h-8 rounded-xl bg-amber-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                      3
                    </div>
                    <h4 className="font-black text-xs text-slate-900 dark:text-zinc-100">
                      සිතියම (Map) සහ Booking
                    </h4>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      ගනුදෙනුකරුවන්ට සිතියමෙන් පිහිටීම බලා පැමිණීමට සහ WhatsApp මගින් වේලාවක් වෙන්කර ගැනීමට අවස්ථාව ලැබේ.
                    </p>
                  </div>
                </div>
              </div>

              {/* Practical Examples */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>ප්‍රායෝගික උදාහරණ (Registered Business Example)</span>
                </div>

                <div className="p-4 bg-white dark:bg-zinc-800 border-2 border-amber-500/30 rounded-2xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-lg text-[10px] font-black">
                      🚗 වාහන අලුත්වැඩියා සේවා (Auto Care Service)
                    </span>
                    <span className="text-[11px] font-bold text-zinc-500">
                      කඩවත, මහනුවර පාර
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                    City Auto Care & Hybrid Hub
                  </h4>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/60 p-2.5 rounded-xl space-y-1">
                    <div className="font-bold text-slate-800 dark:text-zinc-200">
                      සපයන සේවාවන් (Services):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                      <div>• Full Computer Scan - රු. 2,500</div>
                      <div>• Hybrid Battery Recondition - රු. 45,000</div>
                      <div>• Dual Clutch Calibration - රු. 8,500</div>
                      <div>• Brake & Suspension Service - රු. 4,000</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleGoToSection('businesses')}
                  className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>ව්‍යාපාරික ස්ථාන අංශයට යන්න (Go to Businesses Section)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


import React, { useState, useMemo } from 'react';
import { User, Language, ProfessionalService, ServiceReview } from '../types';
import { professionalServiceCategories } from '../data/professionalServicesData';
import { 
  Briefcase, 
  Search, 
  Layers, 
  Sparkles, 
  ArrowLeft, 
  Filter, 
  ShieldCheck, 
  Star,
  ChevronRight,
  PlusCircle,
  Award,
  Coins,
  Flame,
  Zap
} from 'lucide-react';
import { RegisterProfessionalServiceModal } from './RegisterProfessionalServiceModal';
import { ProfessionalServiceDetailModal } from './ProfessionalServiceDetailModal';
import { findSynonymSuggestionPrompt, getExpandedSearchKeywords } from '../data/searchDictionary';
import { SmartSearchSynonymPrompt } from './SmartSearchSynonymPrompt';
import { calculateProviderReputation, PROVIDER_LEVELS, ProviderLevelId } from '../utils/reputationSystem';
import { ProviderReputationModal } from './ProviderReputationModal';
import { checkIsAdmin } from '../utils/postOwnerHelper';
import { addDeletedProServiceId } from '../utils/deletedPostsManager';
import { deleteProfessionalServiceFromFirestore } from '../lib/firebase';
import { Trash2 } from 'lucide-react';

interface ProfessionalServicesViewProps {
  user: User;
  language: Language;
  currentLocationName?: string;
  professionalServices: ProfessionalService[];
  onAddService: (service: ProfessionalService) => void;
  onAddReview: (serviceId: string, review: ServiceReview) => void;
  onDeleteService?: (serviceId: string) => void;
  onBack: () => void;
}

export const ProfessionalServicesView: React.FC<ProfessionalServicesViewProps> = ({
  user,
  language,
  currentLocationName = 'කඩවත',
  professionalServices,
  onAddService,
  onAddReview,
  onDeleteService,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'categories'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dismissedSynonyms, setDismissedSynonyms] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<ProviderLevelId | 'all'>('all');

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<ProfessionalService | null>(null);
  const [showReputationModal, setShowReputationModal] = useState<boolean>(false);
  const [reputationModalService, setReputationModalService] = useState<ProfessionalService | null>(null);

  const [localServices, setLocalServices] = useState<ProfessionalService[]>(professionalServices || []);

  React.useEffect(() => {
    setLocalServices(professionalServices || []);
  }, [professionalServices]);

  const isAdmin = checkIsAdmin(user) || user?.role === 'admin' || (user as any)?.isAdmin === true;

  const canDeleteService = (srv: ProfessionalService) => {
    if (isAdmin) return true;
    if (!srv || !user) return false;
    const uPhone = (user.phone || user.whatsappNumber || '').replace(/\D/g, '');
    const pPhone = (srv.providerPhone || srv.providerWhatsapp || '').replace(/\D/g, '');
    return Boolean(
      (user.userId && (srv.userId === user.userId || srv.userId === user.id)) ||
      (user.id && (srv.userId === user.id || srv.userId === user.userId)) ||
      (user.nicNumber && (srv.userId === user.nicNumber || srv.providerNic === user.nicNumber)) ||
      (uPhone && pPhone && uPhone === pPhone)
    );
  };

  const handleDeleteService = (serviceId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!serviceId) return;
    const confirmMsg = isAdmin
      ? 'පරිපාලක (Admin) ලෙස මෙම වෘත්තිකයාගේ සේවා දැන්වීම පද්ධතියෙන් ස්ථිරවම ඉවත් කිරීමට (Delete) අවශ්‍ය බව තහවුරු කරන්න ද?'
      : 'මෙම සේවාදායක දැන්වීම පද්ධතියෙන් ස්ථිරවම ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්න ද?';
    if (!window.confirm(confirmMsg)) return;

    const updated = localServices.filter((s) => s.id !== serviceId);
    setLocalServices(updated);
    addDeletedProServiceId(serviceId);
    try {
      localStorage.setItem('sahaya_professional_services', JSON.stringify(updated));
    } catch (e) {}
    deleteProfessionalServiceFromFirestore(serviceId).catch((err) => {
      console.warn('Professional service delete from firestore notice:', err);
    });
    if (onDeleteService) onDeleteService(serviceId);
    if (selectedServiceForDetail?.id === serviceId) {
      setSelectedServiceForDetail(null);
    }
    try {
      window.dispatchEvent(new CustomEvent('sahaya_sync_all_services'));
    } catch {}
  };

  // Smart Synonym Suggestion Prompt for Pro Services
  const proSynonymPrompt = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2 || dismissedSynonyms.includes(q)) return null;

    return findSynonymSuggestionPrompt<ProfessionalService>(
      searchQuery,
      localServices,
      (srv: ProfessionalService) => `${srv.serviceTitle} ${srv.categoryName} ${srv.subCategoryName} ${srv.providerName} ${srv.qualifications || ''}`
    );
  }, [searchQuery, localServices, dismissedSynonyms]);

  // Filtered Services List
  const filteredServices = useMemo(() => {
    return (localServices || []).filter((srv) => {
      if (!srv) return false;

      // Category filter
      if (selectedCategoryId && srv.categoryId !== selectedCategoryId) {
        return false;
      }

      // Subcategory filter
      if (selectedSubCategoryName && srv.subCategoryName !== selectedSubCategoryName) {
        return false;
      }

      // Level filter
      if (selectedLevel !== 'all') {
        const rep = calculateProviderReputation(srv.userId, srv, localServices);
        if (rep.level !== selectedLevel) return false;
      }

      // Search query filter with synonym expansion
      if (searchQuery.trim()) {
        const keywords = getExpandedSearchKeywords(searchQuery);
        const srvText = `${srv.providerName || ''} ${srv.serviceTitle || ''} ${srv.categoryName || ''} ${srv.subCategoryName || ''} ${srv.locationName || ''} ${srv.qualifications || ''}`.toLowerCase();
        const matches = keywords.some((kw) => srvText.includes(kw));
        if (!matches) return false;
      }

      return true;
    });
  }, [localServices, selectedCategoryId, selectedSubCategoryName, selectedLevel, searchQuery]);

  const activeCategoryObj = professionalServiceCategories.find((c) => c.category_id === selectedCategoryId);

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* 1. Header Navigation with Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/90 dark:bg-[#07130c]/90 border border-slate-200/80 dark:border-[#132a1d] rounded-3xl p-4 sm:p-5 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#12281b] hover:bg-slate-200 dark:hover:bg-[#1a3826] text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            title="ආපසු යන්න"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#007a4b] dark:text-[#00c880] bg-[#007a4b]/10 dark:bg-[#00c880]/15 px-2.5 py-0.5 rounded-full border border-[#007a4b]/30">
                PRO SERVICES
              </span>
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-[#789d87]">
                ({professionalServices.length} {language === 'en' ? 'Providers' : 'වෘත්තිකයන්'})
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {language === 'en' ? 'Professional Services' : language === 'ta' ? 'தொழில்முறை சேவைகள்' : 'වෘත්තීය සේවා'}
            </h2>
          </div>
        </div>

        {/* 01. Register as Service Provider Button */}
        <button
          type="button"
          onClick={() => setIsRegisterModalOpen(true)}
          className="relative group overflow-hidden px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] hover:from-emerald-700 hover:to-[#00603a] text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-emerald-400/40"
        >
          <PlusCircle className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>ඔබගේ වෘත්තිය යටතේ සේවා සැපයීමට කැමතිනම් ක්ලික් කරන්න</span>
        </button>
      </div>

      {/* Free Tier Model & Reputation Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-900 via-[#004d2e] to-teal-950 border-2 border-emerald-500/40 text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-2xl shrink-0 shadow-md animate-bounce">
            🎁
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">
                "රුපියල් 100 නොමිලේ" (Free Tier Model) & 5-Star Reputation
              </h3>
              <span className="px-2 py-0.5 bg-amber-400/30 text-amber-300 text-[10px] font-bold rounded-full border border-amber-400/40">
                0% Risk
              </span>
            </div>
            <p className="text-xs text-emerald-200 font-medium mt-0.5">
              නොමිලේ සම්බන්ධ වන්න • වැඩි වැඩ කර හොඳ Reviews ලබාගන්න • ඉහළම ශ්‍රේණිගත කිරීම් (5-Star Verified) මඟින් ස්වයංක්‍රීයව පාරිභෝගිකයන් ලබාගන්න!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setReputationModalService(null);
            setShowReputationModal(true);
          }}
          className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black rounded-2xl text-xs sm:text-sm shadow-md transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1.5"
        >
          <Award className="w-4 h-4" />
          <span>ශ්‍රේණිගත කිරීම් සහ ප්‍රතිලාභ</span>
        </button>
      </div>

      {/* 🛡️ Trust & Insurance Platform Guarantee & Community Mission Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Card 1: Platform Guarantee Notice */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950/90 via-[#072417] to-slate-950 border-2 border-emerald-500/50 text-white shadow-md space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-950" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                <span>🛡️ Trust & Insurance වගකීම් සහතිකය</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/30">Platform Protected</span>
              </h4>
              <p className="text-[11px] text-emerald-100 font-medium leading-tight mt-0.5">
                ඇප් එක හරහා සම්බන්ධ වන ගනුදෙනුවලට පමණක් සහය සේවා පාරිභෝගික ආරක්ෂාව සහ සහතිකය හිමිවේ.
              </p>
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-black/40 border border-emerald-500/20 text-[10px] sm:text-[11px] text-emerald-200/90 leading-relaxed space-y-1">
            <p>
              ⚠️ <strong>වැදගත් අවධාරණය:</strong> ඇප් එකෙන් බාහිරව කරන සෘජු මුදල් ගනුදෙනු, වංචා හෝ සේවා බාලවීම් සඳහා වේදිකාවේ කිසිදු වගකීමක් හෝ මැදිහත්වීමක් නොමැත.
            </p>
            <p className="text-amber-200/90">
              ✓ යම් සේවයක් බාල වුවහොත් හෝ අනතුරක් සිදුවුවහොත්, ඇප් එක හරහා සිදු වූ ඇණවුම්වලට පමණක් අපගේ පරිපාලන මැදිහත්වීම සහ සහතිකය හිමිවේ.
            </p>
          </div>
        </div>

        {/* Card 2: Community Social Mission Pledge */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-teal-950/90 via-[#062920] to-emerald-950 border-2 border-teal-500/40 text-white shadow-md space-y-2 flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-400 text-teal-950 flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
              🤝
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-teal-200">
                අපේම ප්‍රජාව වෙනුවෙන් විශ්වාසනීය සමාජ සත්කාරයක්
              </h4>
              <p className="text-[11px] text-teal-100/90 font-medium leading-tight mt-0.5">
                මෙය හුදු ව්‍යාපාරයකට වඩා එකිනෙකාට අත්වැලක් වන සහන සේවා එකමුතුවකි.
              </p>
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-teal-900/30 border border-teal-500/20 text-[10px] sm:text-[11px] text-teal-100/90 leading-relaxed">
            <p>
              "මෙම ඇප් එක නඩත්තු වන්නේ ඔබ භාවිතා කරන සේවයෙන් ලැබෙන ඉතා කුඩා ක්ෂුද්‍ර දායකත්වයෙන් බැවින්, බලහත්කාරයෙන් මුදල් අය කිරීමක් නැත. ඔබ ලබාදෙන සහයෝගයට සහ අවංකත්වයට ස්තූතියි!"
            </p>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs (02. සියලුම වෘත්තීය සේවා / වෘත්තීය වර්ග) */}
      <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-[#09180f] rounded-2xl border border-slate-200 dark:border-[#132a1d]">
        <button
          type="button"
          onClick={() => {
            setActiveTab('all');
            setSelectedCategoryId(null);
            setSelectedSubCategoryName(null);
          }}
          className={`py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'all' && !selectedCategoryId && !selectedSubCategoryName
              ? 'bg-[#007a4b] text-white shadow-md'
              : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-[#12281b]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>සියලුම වෘත්තීය සේවා</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'categories' || selectedCategoryId !== null
              ? 'bg-[#007a4b] text-white shadow-md'
              : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-[#12281b]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>වෘත්තීය වර්ග (කාණ්ඩ / Tags)</span>
        </button>
      </div>

      {/* Level Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
        <span className="text-slate-500 dark:text-slate-400 text-xs shrink-0 flex items-center gap-1 font-bold">
          <Filter className="w-3.5 h-3.5 text-emerald-500" />
          <span>ශ්‍රේණිය (Level):</span>
        </span>

        <button
          type="button"
          onClick={() => setSelectedLevel('all')}
          className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
            selectedLevel === 'all'
              ? 'bg-emerald-600 text-white shadow-xs font-black'
              : 'bg-white dark:bg-[#0c1a12] border border-slate-200 dark:border-[#173222] text-slate-700 dark:text-slate-300'
          }`}
        >
          සියල්ල ({professionalServices.length})
        </button>

        {([5, 4, 3, 2, 1] as ProviderLevelId[]).map((lvl) => {
          const conf = PROVIDER_LEVELS[lvl];
          const count = professionalServices.filter(s => calculateProviderReputation(s.userId, s, professionalServices).level === lvl).length;
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => setSelectedLevel(lvl)}
              className={`px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                selectedLevel === lvl
                  ? `bg-gradient-to-r ${conf.bgGradient} text-white shadow-md font-black border ${conf.borderColor}`
                  : 'bg-white dark:bg-[#0c1a12] border border-slate-200 dark:border-[#173222] text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>{conf.icon}</span>
              <span>{conf.nameSi.split('(')[0].trim()}</span>
              <span className="opacity-75 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* 3. Search Bar */}
      <div className="relative space-y-2">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="වෘත්තිය, සේවාව, සේවාදායකයාගේ නම හෝ නගරය අනුව සොයන්න..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#0c1a12] border border-slate-200 dark:border-[#173222] rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Smart Synonym Suggestion Prompt: "ඔබ සොයන්නේ [පෙදරේරු / Mason] නේද? [ඔව්] [නැත]" */}
        {proSynonymPrompt && (
          <SmartSearchSynonymPrompt
            prompt={proSynonymPrompt}
            onAcceptSuggestion={(suggested) => setSearchQuery(suggested)}
            onDismiss={() => {
              if (searchQuery.trim()) {
                setDismissedSynonyms((prev) => [...prev, searchQuery.trim().toLowerCase()]);
              }
            }}
          />
        )}
      </div>

      {/* 4. Category / Tag Selector View (If in categories mode or category is selected) */}
      {activeTab === 'categories' && (
        <div className="space-y-4 p-5 rounded-3xl bg-white dark:bg-[#0c1811] border border-slate-200 dark:border-[#162e20] shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span>වෘත්තීය කාණ්ඩ තෝරන්න (9 Categories)</span>
            </h3>
            {(selectedCategoryId || selectedSubCategoryName) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryId(null);
                  setSelectedSubCategoryName(null);
                }}
                className="text-xs font-bold text-rose-500 hover:underline"
              >
                සියල්ල ඉවත් කරන්න
              </button>
            )}
          </div>

          {/* Main 9 Categories Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5">
            {professionalServiceCategories.map((cat, cIdx) => {
              const isSelected = selectedCategoryId === cat.category_id;
              const matchingCount = professionalServices.filter((s) => s.categoryId === cat.category_id).length;

              return (
                <button
                  key={`pro_cat_${cat.category_id}_${cIdx}`}
                  type="button"
                  onClick={() => {
                    if (selectedCategoryId === cat.category_id) {
                      setSelectedCategoryId(null);
                      setSelectedSubCategoryName(null);
                    } else {
                      setSelectedCategoryId(cat.category_id);
                      setSelectedSubCategoryName(null);
                    }
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-[#eaf8f1] dark:bg-[#0e291c] border-[#00a86b] shadow-sm'
                      : 'bg-slate-50 dark:bg-[#102419] border-slate-200 dark:border-[#173222] hover:bg-slate-100 dark:hover:bg-[#163223]'
                  }`}
                >
                  <span className="text-xl shrink-0">{cat.category_icon}</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1 block">
                      {cat.category_name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {matchingCount} {matchingCount === 1 ? 'සේවාවක්' : 'සේවා'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Subcategories / Tags of the Selected Category */}
          {activeCategoryObj && (
            <div className="pt-3 border-t border-slate-200 dark:border-[#173222] space-y-2">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">
                {activeCategoryObj.category_icon} {activeCategoryObj.category_name} යටතේ Tags:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeCategoryObj.sub_categories.map((sub, sIdx) => {
                  const isSubSelected = selectedSubCategoryName === sub.name;
                  return (
                    <button
                      key={`pro_sub_${sub.name}_${sIdx}`}
                      type="button"
                      onClick={() => {
                        setSelectedSubCategoryName(isSubSelected ? null : sub.name);
                      }}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                        isSubSelected
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-100 dark:bg-[#132a1d] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1a3826] hover:bg-slate-200'
                      }`}
                    >
                      <span>{sub.icon}</span>
                      <span>{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Indicator */}
      {(selectedCategoryId || selectedSubCategoryName) && (
        <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-emerald-50 dark:bg-[#0e2417] border border-emerald-300/60 dark:border-[#1a402a] text-xs text-emerald-900 dark:text-emerald-300">
          <Filter className="w-3.5 h-3.5 text-emerald-600" />
          <span>පෙරහන: <strong>{activeCategoryObj?.category_name}</strong> {selectedSubCategoryName ? `> ${selectedSubCategoryName}` : ''}</span>
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryId(null);
              setSelectedSubCategoryName(null);
            }}
            className="ml-auto font-black text-rose-500 hover:underline cursor-pointer"
          >
            ඉවත් කරන්න
          </button>
        </div>
      )}

      {/* 4.5 Featured Top Rated & Gold Verified Professionals List (Requirement: ඇප් එකේ ඉදිරියෙන්ම පෙනෙන Featured List කොටසේ ඔවුන්ගේ පැතිකඩ නොමිලේ ප්‍රදර්ශනය කරන්න) */}
      {(() => {
        const topRatedProviders = professionalServices
          .filter(s => {
            const rep = calculateProviderReputation(s.userId, s, professionalServices);
            return rep.level >= 4 || (s.reviews && s.reviews.length >= 3 && (s.avgRating || 5) >= 4.7);
          })
          .slice(0, 4);

        if (topRatedProviders.length === 0) return null;

        return (
          <div className="space-y-2.5 p-4 rounded-3xl bg-gradient-to-br from-amber-500/10 via-emerald-500/10 to-teal-500/10 border-2 border-amber-400/40 dark:border-amber-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-400 text-amber-950 font-black shadow-xs">
                  <Star className="w-4 h-4 fill-amber-950" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>🌟 ඉහළම ශ්‍රේණිගත ප්‍රවීණයන් (Featured Top Rated)</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold border border-amber-400/50">
                      Gold Verified
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-[#88ad97] font-medium">
                    හොඳම Reviews සහ 5-Star Reputation ලබාගත් විශිෂ්ට සේවා ශිල්පීන්
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {topRatedProviders.map((service, idx) => {
                const rep = calculateProviderReputation(service.userId, service, professionalServices);
                return (
                  <div
                    key={`featured_${service.id || idx}`}
                    onClick={() => setSelectedServiceForDetail(service)}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#0c1811] border-2 border-amber-400/50 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3 active:scale-95 group"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-400 shrink-0 bg-slate-100 dark:bg-slate-800">
                        {service.providerPhotoUrl ? (
                          <img src={service.providerPhotoUrl} alt={service.providerName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-amber-700 bg-amber-100">
                            {service.providerName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-amber-400 text-amber-950 text-[9px] font-black shadow-xs">
                        ⭐
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {service.providerName}
                        </span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold truncate">
                        {service.profession}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="text-amber-500 font-bold">★ {service.avgRating?.toFixed(1) || '5.0'}</span>
                        <span>•</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{rep.points} pts</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 5. Professional Service Providers Grid (Requirement 03) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-500" />
            <span>සේවා වෘත්තිකයන් ({filteredServices.length})</span>
          </h3>
        </div>

        {filteredServices.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#0c1811] rounded-3xl border border-slate-200 dark:border-[#162e20] p-6 space-y-3">
            <Briefcase className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
              මෙම කාණ්ඩය හෝ සෙවුම යටතේ සේවාදායකයන් හමු නොවීය
            </h4>
            <p className="text-xs text-slate-500 dark:text-[#789d87]">
              ඔබ මෙම ක්ෂේත්‍රයේ සේවා සපයන්නේ නම්, පහත බොත්තම ක්ලික් කර ඔබගේ සේවාව ලියාපදිංචි කරන්න.
            </p>
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="mt-2 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              සේවාවක් ලියාපදිංචි කරන්න
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service, sIdx) => {
              const reviewsList = service.reviews || [];
              const avg = reviewsList.length > 0
                ? (reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length).toFixed(1)
                : service.avgRating?.toFixed(1) || '5.0';

              return (
                /* Requirement 03: Profile Card with Avatar, Name, Profession */
                <div
                  key={`pro_srv_${service.id || 'srv'}_${sIdx}`}
                  onClick={() => setSelectedServiceForDetail(service)}
                  className="group bg-white dark:bg-[#0c1811] hover:bg-slate-50/80 dark:hover:bg-[#112318] border border-slate-200/90 dark:border-[#173222] hover:border-emerald-500/50 rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between active:scale-[0.99]"
                >
                  <div className="space-y-3">
                    {/* Top Row: Avatar + Name + Profession */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-sm flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                        {service.providerPhotoUrl && service.providerPhotoUrl.trim() !== '' ? (
                          <img
                            src={service.providerPhotoUrl}
                            alt={service.providerName || 'Provider'}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xl">
                            {(service.providerName || 'P').charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {service.providerName}
                          </h4>
                          {service.isVerified && (
                            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                        </div>

                        {/* Profession Title */}
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate">
                          <span>{service.subCategoryIcon}</span>
                          <span className="truncate">{service.subCategoryName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Brief Service Title */}
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#0e2116] border border-slate-100 dark:border-[#162e20]">
                      <p className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2 font-medium leading-relaxed">
                        {service.serviceTitle}
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-[#142a1d] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-[#789d87]">
                    {/* Level & Reviews */}
                    {(() => {
                      const rep = calculateProviderReputation(service.userId, service, professionalServices);
                      return (
                        <div className="flex items-center gap-1.5">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setReputationModalService(service);
                              setShowReputationModal(true);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r ${rep.levelConfig.bgGradient} text-white shadow-xs cursor-pointer hover:scale-105 transition-transform`}
                            title={rep.levelConfig.nameSi}
                          >
                            <span>{rep.levelConfig.icon}</span>
                            <span>Level {rep.level}</span>
                          </span>
                          <div className="flex items-center gap-1 text-amber-500 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{avg}</span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center gap-2">
                      {canDeleteService(service) && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteService(service.id, e)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                          title={isAdmin ? "පරිපාලක ලෙස ඉවත් කරන්න (Admin Delete)" : "ඉවත් කරන්න (Delete)"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">
                        <span>විස්තර බලන්න</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Provider Reputation Modal */}
      <ProviderReputationModal
        isOpen={showReputationModal}
        onClose={() => {
          setShowReputationModal(false);
          setReputationModalService(null);
        }}
        user={user}
        service={reputationModalService}
        allServices={localServices}
        language={language}
        onAddReview={(serviceId, review) => {
          onAddReview(serviceId, review);
        }}
      />

      {/* Registration Modal */}
      <RegisterProfessionalServiceModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        user={user}
        language={language}
        currentLocationName={currentLocationName}
        onRegisterService={(newSrv) => {
          setLocalServices((prev) => [newSrv, ...prev]);
          onAddService(newSrv);
        }}
      />

      {/* Provider Details & Comments Modal */}
      <ProfessionalServiceDetailModal
        isOpen={Boolean(selectedServiceForDetail)}
        onClose={() => setSelectedServiceForDetail(null)}
        service={selectedServiceForDetail}
        currentUser={user}
        language={language}
        onDeleteService={handleDeleteService}
        onAddReview={(serviceId, review) => {
          onAddReview(serviceId, review);
          if (selectedServiceForDetail && selectedServiceForDetail.id === serviceId) {
            setSelectedServiceForDetail({
              ...selectedServiceForDetail,
              reviews: [review, ...(selectedServiceForDetail.reviews || [])],
            });
          }
        }}
      />
    </div>
  );
};

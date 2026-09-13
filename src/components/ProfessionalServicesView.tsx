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
  PlusCircle
} from 'lucide-react';
import { RegisterProfessionalServiceModal } from './RegisterProfessionalServiceModal';
import { ProfessionalServiceDetailModal } from './ProfessionalServiceDetailModal';
import { findSynonymSuggestionPrompt, getExpandedSearchKeywords } from '../data/searchDictionary';
import { SmartSearchSynonymPrompt } from './SmartSearchSynonymPrompt';

interface ProfessionalServicesViewProps {
  user: User;
  language: Language;
  currentLocationName?: string;
  professionalServices: ProfessionalService[];
  onAddService: (service: ProfessionalService) => void;
  onAddReview: (serviceId: string, review: ServiceReview) => void;
  onBack: () => void;
}

export const ProfessionalServicesView: React.FC<ProfessionalServicesViewProps> = ({
  user,
  language,
  currentLocationName = 'කඩවත',
  professionalServices,
  onAddService,
  onAddReview,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'categories'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dismissedSynonyms, setDismissedSynonyms] = useState<string[]>([]);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<ProfessionalService | null>(null);

  // Smart Synonym Suggestion Prompt for Pro Services
  const proSynonymPrompt = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2 || dismissedSynonyms.includes(q)) return null;

    return findSynonymSuggestionPrompt<ProfessionalService>(
      searchQuery,
      professionalServices,
      (srv: ProfessionalService) => `${srv.serviceTitle} ${srv.categoryName} ${srv.subCategoryName} ${srv.providerName} ${srv.qualifications || ''}`
    );
  }, [searchQuery, professionalServices, dismissedSynonyms]);

  // Filtered Services List
  const filteredServices = useMemo(() => {
    return (professionalServices || []).filter((srv) => {
      if (!srv) return false;

      // Category filter
      if (selectedCategoryId && srv.categoryId !== selectedCategoryId) {
        return false;
      }

      // Subcategory filter
      if (selectedSubCategoryName && srv.subCategoryName !== selectedSubCategoryName) {
        return false;
      }

      // Search query filter with synonym expansion
      if (searchQuery.trim()) {
        const keywords = getExpandedSearchKeywords(searchQuery);
        const srvText = `${srv.providerName} ${srv.serviceTitle} ${srv.categoryName} ${srv.subCategoryName} ${srv.locationName || ''} ${srv.qualifications || ''}`.toLowerCase();
        const matches = keywords.some((kw) => srvText.includes(kw));
        if (!matches) return false;
      }

      return true;
    });
  }, [professionalServices, selectedCategoryId, selectedSubCategoryName, searchQuery]);

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
            {professionalServiceCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.category_id;
              const matchingCount = professionalServices.filter((s) => s.categoryId === cat.category_id).length;

              return (
                <button
                  key={cat.category_id}
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
                {activeCategoryObj.sub_categories.map((sub) => {
                  const isSubSelected = selectedSubCategoryName === sub.name;
                  return (
                    <button
                      key={sub.name}
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
            {filteredServices.map((service) => {
              const reviewsList = service.reviews || [];
              const avg = reviewsList.length > 0
                ? (reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length).toFixed(1)
                : service.avgRating?.toFixed(1) || '5.0';

              return (
                /* Requirement 03: Profile Card with Avatar, Name, Profession */
                <div
                  key={service.id}
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
                            alt={service.providerName}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xl">
                            {service.providerName.charAt(0)}
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
                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-[#142a1d] flex items-center justify-between text-xs text-slate-500 dark:text-[#789d87]">
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{avg} ({reviewsList.length})</span>
                    </div>

                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">
                      <span>විස්තර බලන්න</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Registration Modal */}
      <RegisterProfessionalServiceModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        user={user}
        language={language}
        currentLocationName={currentLocationName}
        onRegisterService={(newSrv) => {
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

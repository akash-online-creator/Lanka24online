import React from 'react';
import { HelpPost, User, Language, LocationOption, TagItem, CategoryItem, ProfessionalService, ServiceReview } from '../types';
import { CategoryGrid } from './CategoryGrid';
import { TagSearchBar } from './TagSearchBar';
import { PostCard } from './PostCard';
import { ProfessionalServicesView } from './ProfessionalServicesView';
import { 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  MapPin, 
  Globe, 
  Megaphone, 
  Layers,
  HeartHandshake,
  Sliders,
  Briefcase
} from 'lucide-react';

interface HelpRequestsPageProps {
  user: User;
  language: Language;
  helpPosts: HelpPost[];
  filteredPosts: HelpPost[];
  currentLocation: LocationOption;
  feedDistanceTab: 'local' | 'all_sl';
  setFeedDistanceTab: (tab: 'local' | 'all_sl') => void;
  boardCategoryFilter: string;
  setBoardCategoryFilter: (catKey: string) => void;
  setSelectedCategoryTitle: (title: string) => void;
  maxDistanceRadius: number;
  setMaxDistanceRadius: (r: number) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  allTags: TagItem[];
  selectedTagFilter: TagItem | null;
  setSelectedTagFilter: (tag: TagItem | null) => void;
  getPostDistance: (post: HelpPost) => number;
  onOfferSupport: (post: HelpPost) => void;
  onEditPost: (post: HelpPost) => void;
  onViewPost: (post: HelpPost) => void;
  onDeletePost: (post: HelpPost) => void;
  onOpenChat: (post: HelpPost) => void;
  onOpenSupportOffers: (post: HelpPost) => void;
  onOpenCreateModal: () => void;
  onBackToHome: () => void;
  professionalServices?: ProfessionalService[];
  onAddProfessionalService?: (service: ProfessionalService) => void;
  onAddProfessionalReview?: (serviceId: string, review: ServiceReview) => void;
}

export const HelpRequestsPage: React.FC<HelpRequestsPageProps> = ({
  user,
  language,
  helpPosts = [],
  filteredPosts = [],
  currentLocation,
  feedDistanceTab,
  setFeedDistanceTab,
  boardCategoryFilter,
  setBoardCategoryFilter,
  setSelectedCategoryTitle,
  maxDistanceRadius,
  setMaxDistanceRadius,
  searchQuery,
  setSearchQuery,
  allTags = [],
  selectedTagFilter,
  setSelectedTagFilter,
  getPostDistance,
  onOfferSupport,
  onEditPost,
  onViewPost,
  onDeletePost,
  onOpenChat,
  onOpenSupportOffers,
  onOpenCreateModal,
  onBackToHome,
  professionalServices = [],
  onAddProfessionalService,
  onAddProfessionalReview,
}) => {
  const getLangText = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 space-y-6 animate-fadeIn">
      {/* Page Header Bar with Back Button */}
      <div className="bg-white/95 dark:bg-[#07130c]/95 border border-slate-200/80 dark:border-[#132a1d] rounded-3xl p-4 sm:p-5 shadow-lg backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-xs border border-slate-300 dark:border-slate-700"
            title="ආපසු මුල් පිටුවට"
          >
            <ArrowLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs sm:text-sm">ආපසු</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
              <Megaphone className="w-5 h-5 text-amber-300 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {getLangText('දැන්වීම් පුවරුව', 'Notices Feed', 'அறிவிப்பு பலகை')}
                </span>
                <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                  ● LIVE
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {getLangText('උපකාර ඉල්ලීම්', 'Help Requests', 'உதவி கோரிக்கைகள்')}
              </h1>
            </div>
          </div>
        </div>

        {/* Action Buttons: Publish New Request */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95 border border-emerald-400/40"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>{getLangText('අලුත් ඉල්ලීමක් පළ කරන්න', 'Publish Request', 'புதிய கோரிக்கை')}</span>
          </button>
        </div>
      </div>

      {/* Bulletin Board Section with Category Grid */}
      <div className="bg-white/90 dark:bg-[#07130c]/90 border border-slate-200/80 dark:border-[#132a1d] rounded-[2.2rem] p-5 sm:p-7 shadow-xl space-y-5 backdrop-blur-md">
        
        {/* Board Header: Title & LIVE Badge */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{getLangText('සේවා වර්ග අනුව තෝරන්න', 'Select by Service Category', 'வகை அடிப்படையில் தேர்ந்தெடுக்கவும்')}</span>
          </h2>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#dff7eb] dark:bg-[#123120] border border-[#a1ebd0] dark:border-[#1c402b] text-[#00a86b] dark:text-[#00c880] text-xs font-extrabold tracking-wider uppercase">
            <span>{boardCategoryFilter === 'professional_services' ? professionalServices.length : filteredPosts.length} {getLangText(boardCategoryFilter === 'professional_services' ? 'වෘත්තිකයන්' : 'ඉල්ලීම්', 'Items', 'உருப்படிகள்')}</span>
          </div>
        </div>

        {/* Top Notice Card Box */}
        <div className="w-full min-h-[46px] rounded-2xl bg-[#faf5ef] dark:bg-[#121c16] border border-[#f5e6d3] dark:border-[#223629] p-3.5 flex items-center justify-between text-xs text-slate-700 dark:text-[#8ba294]">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-medium">
              {getLangText(
                'පහතින් සේවා වර්ගයක් තෝරා දැන්වීම් බලන්න හෝ අලුතින් උපකාර ඉල්ලීමක් එක් කරන්න.',
                'Select a category below to explore or post new requests.',
                'வேண்டுகோள்களைக் காண அல்லது இடுகையிட வகையைத் தேர்ந்தெடுக்கவும்.'
              )}
            </span>
          </div>
        </div>

        {/* Category Grid Component */}
        <CategoryGrid
          selectedCategory={boardCategoryFilter}
          onSelectCategory={(catKey, catTitle) => {
            setBoardCategoryFilter(catKey);
            setSelectedCategoryTitle(catTitle);
          }}
          language={language}
        />
      </div>

      {/* When Professional Services is Selected, render the rich Professional Services View */}
      {boardCategoryFilter === 'professional_services' ? (
        <ProfessionalServicesView
          user={user}
          language={language}
          currentLocationName={currentLocation.nameSi}
          professionalServices={professionalServices}
          onAddService={(srv) => {
            if (onAddProfessionalService) onAddProfessionalService(srv);
          }}
          onAddReview={(sId, rev) => {
            if (onAddProfessionalReview) onAddProfessionalReview(sId, rev);
          }}
          onBack={() => {
            setBoardCategoryFilter('');
            setSelectedCategoryTitle('');
          }}
        />
      ) : (
        /* Feed Distance Tabs & Tag Search Bar */
        <div className="space-y-5">
          <div className="flex items-center justify-between bg-white/90 dark:bg-[#07130c]/90 border border-slate-200/80 dark:border-[#132a1d] p-3 sm:p-4 rounded-3xl shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                {getLangText('ස්ථානය:', 'Location:', 'இடம்:')} <strong className="text-emerald-700 dark:text-emerald-300">{currentLocation.nameSi}</strong>
              </span>
            </div>

            {/* Distance Tabs: <15 km vs >15 km (All Sri Lanka) */}
            <div className="flex items-center p-1.5 bg-slate-100 dark:bg-[#0a1c13] border border-slate-200 dark:border-[#132a1d] rounded-2xl w-full sm:w-auto">
              <button
                onClick={() => setFeedDistanceTab('local')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  feedDistanceTab === 'local'
                    ? 'bg-[#007a4b] text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{getLangText('මගේ ප්‍රදේශය (<15 KM)', 'My Area (<15 KM)', 'என் பகுதி (<15 KM)')}</span>
              </button>

              <button
                onClick={() => setFeedDistanceTab('all_sl')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  feedDistanceTab === 'all_sl'
                    ? 'bg-[#007a4b] text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{getLangText('සමස්ත ශ්‍රී ලංකාවම', 'All Sri Lanka', 'அனைத்து இலங்கை')}</span>
              </button>
            </div>
          </div>

          {/* TAG SEARCH BAR WITH LIVE AUTOCOMPLETE & FILTER */}
          <TagSearchBar
            allTags={allTags}
            selectedTagFilter={selectedTagFilter}
            onSelectTagFilter={(tag) => setSelectedTagFilter(tag)}
            searchQuery={searchQuery}
            onSearchQueryChange={(query) => setSearchQuery(query)}
            totalPostsCount={helpPosts.length}
            filteredPostsCount={filteredPosts.length}
          />

          {/* Feed Posts List */}
          {(filteredPosts || []).length === 0 ? (
            <div className="w-full bg-white/80 dark:bg-[#07130c]/80 border border-slate-200/80 dark:border-[#132a1d] rounded-[1.8rem] p-8 text-center space-y-3 shadow-sm">
              <p className="text-sm sm:text-base font-bold text-slate-600 dark:text-[#8ba294]">
                {getLangText('තවම පල කළ දැන්වීම් නොමැත', 'No posts published yet', 'இன்னும் இடுகைகள் எதுவும் வெளியிடப்படவில்லை')}
              </p>
              <button
                onClick={onOpenCreateModal}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-[#00a86b] hover:bg-[#008f5a] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{getLangText('දැන්වීමක් පල කරන්න', 'Publish Request', 'கோரிக்கையை வெளியිடு')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(filteredPosts || []).map((post) => (
                <div 
                  key={post.id}
                  className="cursor-pointer"
                >
                  <PostCard
                    post={{
                      ...post,
                      distanceKm: getPostDistance(post),
                    }}
                    lang={language}
                    onOfferSupport={(p) => onOfferSupport(p)}
                    viewerLocation={currentLocation}
                    currentUser={user}
                    onEditPost={(p) => onEditPost(p)}
                    onViewPost={(p) => onViewPost(p)}
                    onDeletePost={(p) => onDeletePost(p)}
                    onOpenChat={(p) => onOpenChat(p)}
                    onOpenSupportOffers={(p) => onOpenSupportOffers(p)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};


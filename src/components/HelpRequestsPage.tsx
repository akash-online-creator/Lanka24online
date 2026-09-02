import React, { useState, useEffect, useMemo } from 'react';
import { 
  HelpPost, 
  User, 
  Language, 
  LocationOption, 
  TagItem, 
  CategoryItem, 
  ProfessionalService, 
  ServiceReview 
} from '../types';
import { TagSearchBar } from './TagSearchBar';
import { PostCard } from './PostCard';
import { CategoryGrid } from './CategoryGrid';
import { ProfessionalServicesView } from './ProfessionalServicesView';
import { GroupWorkView } from './GroupWorkView';
import { MarketplaceView } from './MarketplaceView';
import { BulletinBoardGuideModal } from './BulletinBoardGuideModal';
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
  Briefcase,
  Zap,
  Bookmark,
  BookmarkCheck,
  Search,
  Filter,
  CheckCircle2,
  TrendingUp,
  MessageCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Wrench,
  Store,
  Users,
  HelpCircle,
  Lightbulb
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
  selectedCategoryTitle?: string;
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
  registeredUsers?: User[];
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
  selectedCategoryTitle = '',
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
  registeredUsers = [],
}) => {
  // Feed Filter Tab: 'all' | 'quick_services' | 'saved'
  const [activeFeedTab, setActiveFeedTab] = useState<'all' | 'quick_services' | 'saved'>('all');
  
  // Show / Hide Category Grid toggle
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);

  // Saved Posts State (Persisted in localStorage per user)
  const savedStorageKey = `sahaya_saved_posts_${user?.userId || user?.id || user?.phone || 'guest'}`;
  const [savedPostIds, setSavedPostIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(savedStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Toast message state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBoardGuideOpen, setIsBoardGuideOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  // Toggle Save Post
  const handleToggleSavePost = (post: HelpPost) => {
    setSavedPostIds((prev) => {
      const isAlreadySaved = prev.includes(post.id);
      let next: string[];
      if (isAlreadySaved) {
        next = prev.filter((id) => id !== post.id);
        showToast('🗑️ දැන්වීම සුරැකි ලැයිස්තුවෙන් ඉවත් කරන ලදී.');
      } else {
        next = [...prev, post.id];
        showToast('🔖 දැන්වීම සාර්ථකව සුරකින ලදී! ඔබට ඕනෑම වේලාවක "සුරකින ලද දැන්වීම්" ටැබ් එකෙන් මෙය නැරඹිය හැක.');
      }
      try {
        localStorage.setItem(savedStorageKey, JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save to local storage', err);
      }
      return next;
    });
  };

  const getLangText = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  // Helper to determine if a post is a quick service
  const isQuickService = (post: HelpPost): boolean => {
    if (!post) return false;
    if (post.category === 'quick_services' || post.category === 'quick') return true;
    if (post.tagCategory === 'ඉක්මන් සේවා' || post.tagName?.toLowerCase().includes('quick') || post.tagName?.includes('හදිසි')) return true;
    if (post.customFieldValues?.f_urgency?.toString().includes('Immediate') || post.customFieldValues?.f_urgency?.toString().includes('හදිසි')) return true;
    return false;
  };

  // Parse time for accurate chronological sorting
  const getPostTimestamp = (post: HelpPost): number => {
    if (post.createdAtMs && !isNaN(post.createdAtMs)) {
      return post.createdAtMs;
    }
    if (post.createdAt) {
      const parsed = new Date(post.createdAt).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 0;
  };

  // Process and sort News Feed posts:
  // 1. Quick Services ALWAYS come to the top
  // 2. All other posts are sorted chronologically (newest first)
  // 3. Tab filter applied (All / Quick Services only / Saved posts only)
  const newsFeedSortedPosts = useMemo(() => {
    const sourceList = [...(filteredPosts || [])];

    let result = sourceList;

    // Apply active feed tab filter
    if (activeFeedTab === 'quick_services') {
      result = result.filter((p) => isQuickService(p));
    } else if (activeFeedTab === 'saved') {
      result = result.filter((p) => savedPostIds.includes(p.id));
    }

    // Sort: Quick Services first, then chronological newest first
    return result.sort((a, b) => {
      const aIsQuick = isQuickService(a);
      const bIsQuick = isQuickService(b);

      if (aIsQuick && !bIsQuick) return -1;
      if (!aIsQuick && bIsQuick) return 1;

      // If both are quick or neither is quick, sort by post time (descending)
      const timeA = getPostTimestamp(a);
      const timeB = getPostTimestamp(b);
      return timeB - timeA;
    });
  }, [filteredPosts, activeFeedTab, savedPostIds]);

  const quickServicesCount = useMemo(() => {
    return (filteredPosts || []).filter((p) => isQuickService(p)).length;
  }, [filteredPosts]);

  return (
    <div className="w-full max-w-3xl mx-auto py-3 sm:py-5 space-y-4 sm:space-y-6 animate-fadeIn pb-16">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-950/95 dark:bg-emerald-950 text-white font-extrabold text-xs sm:text-sm shadow-2xl border border-emerald-500/60 backdrop-blur-md flex items-center gap-2.5 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar with Back Button & Guide Trigger */}
      <div className="bg-white/95 dark:bg-[#07130c]/95 border border-slate-200/90 dark:border-[#132a1d] rounded-3xl p-4 sm:p-5 shadow-lg backdrop-blur-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-300 dark:border-slate-700"
            title="ආපසු මුල් පිටුවට"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs sm:text-sm font-extrabold">{getLangText('ආපසු', 'Back', 'பின்செல்')}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
              <Megaphone className="w-5 h-5 text-amber-300 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-rose-500 animate-pulse bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                  ● LIVE
                </span>
              </div>
              <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                {getLangText('දැන්වීම් පුවරුව', 'Bulletin Board', 'அறிவிப்பு பலகை')}
              </h1>
            </div>
          </div>
        </div>

        {/* Universal Guide & Examples Button */}
        <button
          type="button"
          onClick={() => setIsBoardGuideOpen(true)}
          className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-amber-950 font-black text-xs sm:text-sm transition-all cursor-pointer shadow-md shadow-amber-500/20 flex items-center gap-2 border-2 border-amber-300/80 active:scale-95 hover:scale-105"
        >
          <Lightbulb className="w-4 h-4 text-amber-950 fill-amber-300 animate-bounce" />
          <span>{getLangText('💡 පිටුව ක්‍රියාත්මක වන ආකාරය (උදාහරණ)', '💡 Guide & Examples', '💡 வழிகாட்டி & உதாரணங்கள்')}</span>
        </button>
      </div>

      {/* Compact Quick Category & Feed Filter Tabs (Horizontal Scrollable + Sleek) */}
      <div className="bg-white/95 dark:bg-[#071710]/95 border border-slate-200/90 dark:border-[#132a1d] rounded-3xl p-3 sm:p-3.5 shadow-sm backdrop-blur-md space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{getLangText('දැන්වීම් පෙරහන් සහ කාණ්ඩ', 'Filter Posts & Categories', 'வடிகட்டிகள் மற்றும் வகைகள்')}</span>
          </div>
          {(boardCategoryFilter || activeFeedTab !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setBoardCategoryFilter('');
                setSelectedCategoryTitle('');
                setActiveFeedTab('all');
              }}
              className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              {getLangText('පෙරහන් ඉවත් කරන්න', 'Reset Filter', 'மீட்டமை')}
            </button>
          )}
        </div>

        {/* Horizontal Scrollable Sleek Filter Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {/* 1. All Posts */}
          <button
            type="button"
            onClick={() => {
              setBoardCategoryFilter('');
              setSelectedCategoryTitle('');
              setActiveFeedTab('all');
            }}
            className={`shrink-0 px-3.5 py-2 rounded-2xl font-black text-xs transition-all duration-200 cursor-pointer flex items-center gap-2 border shadow-2xs ${
              !boardCategoryFilter && activeFeedTab === 'all'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-500 shadow-md shadow-emerald-600/20 scale-[1.02]'
                : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>{getLangText('සියල්ල', 'All Posts', 'அனைத்தும்')}</span>
            <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${
              !boardCategoryFilter && activeFeedTab === 'all' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {helpPosts.length}
            </span>
          </button>

          {/* 2. Quick Services */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('quick_services');
              setBoardCategoryFilter('quick_services');
              setSelectedCategoryTitle(getLangText('ඉක්මන් සේවා', 'Quick Services', 'விரைவு சேவை'));
            }}
            className={`shrink-0 px-3.5 py-2 rounded-2xl font-black text-xs transition-all duration-200 cursor-pointer flex items-center gap-2 border shadow-2xs ${
              activeFeedTab === 'quick_services' || boardCategoryFilter === 'quick_services'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/20 scale-[1.02]'
                : 'bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 text-amber-950 dark:text-amber-200 border-amber-200/80 dark:border-amber-900/40'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{getLangText('⚡ ඉක්මන් සේවා', '⚡ Quick Services', '⚡ விரைவு சேவை')}</span>
            <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${
              activeFeedTab === 'quick_services' || boardCategoryFilter === 'quick_services' ? 'bg-white/25 text-white' : 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200'
            }`}>
              {quickServicesCount}
            </span>
          </button>

          {/* 3. Saved Posts */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('saved');
              setBoardCategoryFilter('');
              setSelectedCategoryTitle(getLangText('සුරැකි දැන්වීම්', 'Saved Posts', 'சேமித்தவை'));
            }}
            className={`shrink-0 px-3.5 py-2 rounded-2xl font-black text-xs transition-all duration-200 cursor-pointer flex items-center gap-2 border shadow-2xs ${
              activeFeedTab === 'saved'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-400 shadow-md shadow-amber-600/20 scale-[1.02]'
                : 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 text-amber-950 dark:text-amber-200 border-amber-200/60 dark:border-amber-900/40'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{getLangText('⭐ සුරැකි', '⭐ Saved', '⭐ சேமித்தவை')}</span>
            <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${
              activeFeedTab === 'saved' ? 'bg-white/25 text-white' : 'bg-amber-200/70 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200'
            }`}>
              {savedPostIds.length}
            </span>
          </button>

          {/* 4. General Services (සාමාන්‍ය සේවා) */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('normal_services');
              setSelectedCategoryTitle(getLangText('සාමාන්‍ය සේවා', 'General Services', 'பொதுவான சேவைகள்'));
            }}
            className={`shrink-0 px-3.5 py-2 rounded-2xl font-black text-xs transition-all duration-200 cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
              boardCategoryFilter === 'normal_services'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-blue-400 shadow-md shadow-blue-600/20 scale-[1.02]'
                : 'bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-100/70 dark:hover:bg-blue-950/40 text-blue-950 dark:text-blue-200 border-blue-200/80 dark:border-blue-900/40'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{getLangText('🛠️ සාමාන්‍ය සේවා', '🛠️ General Services', '🛠️ பொது சேவைகள்')}</span>
          </button>

          {/* 5. Marketplace */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('marketplace');
              setSelectedCategoryTitle(getLangText('වෙළඳපොල', 'Marketplace', 'சந்தை'));
            }}
            className={`shrink-0 px-3.5 py-2 rounded-2xl font-black text-xs transition-all duration-200 cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
              boardCategoryFilter === 'marketplace'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-md shadow-emerald-600/20 scale-[1.02]'
                : 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 border-emerald-200/60 dark:border-emerald-900/40'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>{getLangText('🏪 වෙළඳපොල', '🏪 Marketplace', '🏪 சந்தை')}</span>
          </button>

          {/* 6. Professional Services */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('professional_services');
              setSelectedCategoryTitle(getLangText('වෘත්තීය සේවා', 'Professional Services', 'தொழில்முறை'));
            }}
            className={`shrink-0 px-3.5 py-2 rounded-2xl font-black text-xs transition-all duration-200 cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
              boardCategoryFilter === 'professional_services'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white border-purple-400 shadow-md shadow-purple-600/20 scale-[1.02]'
                : 'bg-purple-50/60 dark:bg-purple-950/20 hover:bg-purple-100/70 dark:hover:bg-purple-950/40 text-purple-950 dark:text-purple-200 border-purple-200/80 dark:border-purple-900/40'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>{getLangText('💼 වෘත්තීය සේවා', '💼 Professional', '💼 தொழில்முறை')}</span>
          </button>

          {/* 7. Group Work */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('group_work');
              setSelectedCategoryTitle(getLangText('කණ්ඩායම් වැඩ', 'Group Work', 'குழு வேலை'));
            }}
            className={`shrink-0 px-3.5 py-2 rounded-2xl font-black text-xs transition-all duration-200 cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
              boardCategoryFilter === 'group_work'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white border-indigo-400 shadow-md shadow-indigo-600/20 scale-[1.02]'
                : 'bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 border-indigo-200/60 dark:border-indigo-900/40'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{getLangText('👥 කණ්ඩායම් වැඩ', '👥 Group Work', '👥 குழு வேலை')}</span>
          </button>

          {/* 8. Find For Me */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('find_for_me');
              setSelectedCategoryTitle(getLangText('සොයාදෙන්න', 'Find for Me', 'கண்டுபிடி'));
            }}
            className={`shrink-0 px-3.5 py-2 rounded-2xl font-black text-xs transition-all duration-200 cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
              boardCategoryFilter === 'find_for_me'
                ? 'bg-gradient-to-r from-sky-600 to-cyan-700 text-white border-sky-400 shadow-md shadow-sky-600/20 scale-[1.02]'
                : 'bg-sky-50/60 dark:bg-sky-950/20 hover:bg-sky-100/70 dark:hover:bg-sky-950/40 text-sky-950 dark:text-sky-200 border-sky-200/80 dark:border-sky-900/40'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>{getLangText('🔍 සොයාදෙන්න', '🔍 Find For Me', '🔍 கண்டுபிடி')}</span>
          </button>

          {/* 9. From Me to You */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('from_me_to_you');
              setSelectedCategoryTitle(getLangText('මගෙන් ඔබට', 'From Me to You', 'பரிசு'));
            }}
            className={`shrink-0 px-3.5 py-2 rounded-2xl font-black text-xs transition-all duration-200 cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
              boardCategoryFilter === 'from_me_to_you'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-700 text-white border-teal-400 shadow-md shadow-teal-600/20 scale-[1.02]'
                : 'bg-teal-50/60 dark:bg-teal-950/20 hover:bg-teal-100/70 dark:hover:bg-teal-950/40 text-teal-950 dark:text-teal-200 border-teal-200/80 dark:border-teal-900/40'
            }`}
          >
            <span>🎁</span>
            <span>{getLangText('මගෙන් ඔබට', 'From Me to You', 'பரிசு')}</span>
          </button>
        </div>
      </div>

      {/* Search, Categories Drawer & Distance Filter Controls */}
      <div className="bg-white dark:bg-[#071710] border border-slate-200/90 dark:border-[#132a1d] rounded-3xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Active Filter Badge / Search description */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedCategoryTitle ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 text-xs font-bold border border-emerald-300 dark:border-emerald-800">
                <span>{getLangText('තෝරාගත් කාණ්ඩය:', 'Active Category:', 'தேர்ந்தெடுக்கப்பட்ட வகை:')}</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-300">{selectedCategoryTitle}</span>
                <button
                  type="button"
                  onClick={() => {
                    setBoardCategoryFilter('');
                    setSelectedCategoryTitle('');
                  }}
                  className="ml-1 text-emerald-600 hover:text-rose-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{filteredPosts.length} {getLangText('දැන්වීම් සක්‍රීයව පවතී', 'Active Posts', 'செயலில் உள்ள பதிவுகள்')}</span>
              </div>
            )}
          </div>

          {/* Category Drawer & Distance Filter Switcher */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setShowCategoryGrid(!showCategoryGrid)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                showCategoryGrid || boardCategoryFilter
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{getLangText('සියලු සේවා වර්ග (24+)', 'All Categories (24+)', 'அனைத்து வகைகள்')}</span>
              {showCategoryGrid ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Distance Toggle (<15 KM vs All SL) */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-[#0c2217] rounded-xl border border-slate-200 dark:border-[#132a1d]">
              <button
                onClick={() => setFeedDistanceTab('local')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  feedDistanceTab === 'local'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="මගේ ප්‍රදේශය (<15 KM)"
              >
                <MapPin className="w-3 h-3" />
                <span className="hidden sm:inline">{'<15 KM'}</span>
              </button>

              <button
                onClick={() => setFeedDistanceTab('all_sl')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  feedDistanceTab === 'all_sl'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="සමස්ත ශ්‍රී ලංකාවම"
              >
                <Globe className="w-3 h-3" />
                <span className="hidden sm:inline">{getLangText('සමස්ත ලංකා', 'All SL', 'இலங்கை')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Category Grid Container */}
        {showCategoryGrid && (
          <div className="pt-2 border-t border-slate-100 dark:border-[#132a1d] animate-fadeIn space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                {getLangText('සේවා වර්ගය අනුව දැන්වීම් පෙරහන් කරන්න:', 'Filter by Category:', 'வகை அடிப்படையில் வடிகட்டவும்:')}
              </span>
              {boardCategoryFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setBoardCategoryFilter('');
                    setSelectedCategoryTitle('');
                  }}
                  className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{getLangText('පෙරහන ඉවත් කරන්න', 'Clear Filter', 'வடிகட்டியை அகற்று')}</span>
                </button>
              )}
            </div>

            <CategoryGrid
              selectedCategory={boardCategoryFilter}
              onSelectCategory={(catKey, catTitle) => {
                setBoardCategoryFilter(catKey);
                setSelectedCategoryTitle(catTitle);
                if (catKey !== 'professional_services') {
                  setShowCategoryGrid(false);
                }
              }}
              language={language}
            />
          </div>
        )}

        {/* Active Category Filter Chip (if active) */}
        {boardCategoryFilter && 
         boardCategoryFilter !== 'professional_services' && 
         boardCategoryFilter !== 'group_work' && 
         boardCategoryFilter !== 'marketplace' && 
         !showCategoryGrid && (
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
                🏷️ පෙරහන:
              </span>
              <span>{boardCategoryFilter}</span>
            </div>
            <button
              onClick={() => {
                setBoardCategoryFilter('');
                setSelectedCategoryTitle('');
              }}
              className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
            >
              ඉවත් කරන්න ✕
            </button>
          </div>
        )}
      </div>

      {/* Live Tag Search Bar (only for main feed) */}
      {!boardCategoryFilter || (boardCategoryFilter !== 'professional_services' && boardCategoryFilter !== 'group_work' && boardCategoryFilter !== 'marketplace') ? (
        <TagSearchBar
          allTags={allTags}
          selectedTagFilter={selectedTagFilter}
          onSelectTagFilter={(tag) => setSelectedTagFilter(tag)}
          searchQuery={searchQuery}
          onSearchQueryChange={(query) => setSearchQuery(query)}
          totalPostsCount={helpPosts.length}
          filteredPostsCount={newsFeedSortedPosts.length}
        />
      ) : null}

      {/* Professional Services View (if active) */}
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
      ) : boardCategoryFilter === 'group_work' ? (
        <GroupWorkView
          currentUser={user}
          language={language}
          registeredUsers={registeredUsers}
          onBackToBoard={() => {
            setBoardCategoryFilter('');
            setSelectedCategoryTitle('');
          }}
        />
      ) : boardCategoryFilter === 'marketplace' ? (
        <MarketplaceView
          currentUser={user}
          language={language}
          allTags={allTags}
          currentLocationName={currentLocation.nameSi}
          onBackToBoard={() => {
            setBoardCategoryFilter('');
            setSelectedCategoryTitle('');
          }}
        />
      ) : (
        /* The Facebook-Style News Feed Stream */
        <div className="space-y-4">
          {newsFeedSortedPosts.length === 0 ? (
            <div className="w-full bg-white dark:bg-[#071710] border border-slate-200/90 dark:border-[#132a1d] rounded-3xl p-8 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                {activeFeedTab === 'saved' ? (
                  <Bookmark className="w-7 h-7 text-amber-500" />
                ) : (
                  <Megaphone className="w-7 h-7 text-emerald-600" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {activeFeedTab === 'saved'
                    ? getLangText('සුරැකි දැන්වීම් කිසිවක් නැත', 'No Saved Posts Found', 'சேமிக்கப்பட்ட இடுகைகள் இல்லை')
                    : getLangText('දැන්වීම් කිසිවක් හමු නොවීය', 'No Posts Found', 'இடுகைகள் எதுவும் கிடைக்கவில்லை')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  {activeFeedTab === 'saved'
                    ? getLangText(
                        'ඔබ තවම කිසිදු දැන්වීමක් සුරැකී නැත. ඔබට අවශ්‍ය ඕනෑම දැන්වීමක ඇති "Save" බොත්තම ක්ලික් කර මෙහි තබාගත හැක.',
                        'You have not saved any posts yet. Click the "Save" button on any post to view it later here.',
                        'நீங்கள் இன்னும் எந்த இடுகையையும் சேமிக்கவில்லை. பின்னர் பார்க்க எந்த இடுகையிலும் உள்ள "சேமி" பொத்தானைக் கிளிக் செய்யவும்.'
                      )
                    : getLangText(
                        'ඔබගේ සෙවුමට හෝ පෙරහනට අදාළ දැන්වීම් නොමැත. අලුත් දැන්වීමක් පළ කරන්න හෝ පෙරහන් වෙනස් කරන්න.',
                        'No posts match your search or filter. Try clearing filters or publish a new request.',
                        'உங்கள் தேடலுக்கு ஏற்ற இடுகைகள் இல்லை.'
                      )}
                </p>
              </div>

              {activeFeedTab === 'saved' ? (
                <button
                  type="button"
                  onClick={() => setActiveFeedTab('all')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>{getLangText('සියලු දැන්වීම් බලන්න', 'Browse All Posts', 'அனைத்து இடுகைகளையும் பார்க்கவும்')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenCreateModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{getLangText('අලුත් දැන්වීමක් පළ කරන්න', 'Publish Request', 'கோரிக்கையை வெளியிடு')}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {newsFeedSortedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={{
                    ...post,
                    distanceKm: getPostDistance(post),
                  }}
                  lang={language}
                  viewerLocation={currentLocation}
                  currentUser={user}
                  isSaved={savedPostIds.includes(post.id)}
                  onToggleSave={(p) => handleToggleSavePost(p)}
                  onOfferSupport={(p) => onOfferSupport(p)}
                  onEditPost={(p) => onEditPost(p)}
                  onViewPost={(p) => onViewPost(p)}
                  onDeletePost={(p) => onDeletePost(p)}
                  onOpenChat={(p) => onOpenChat(p)}
                  onOpenSupportOffers={(p) => onOpenSupportOffers(p)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Guide & Examples Modal */}
      <BulletinBoardGuideModal
        isOpen={isBoardGuideOpen}
        onClose={() => setIsBoardGuideOpen(false)}
        language={language}
        initialSection={boardCategoryFilter || activeFeedTab || 'all'}
        onSelectSection={(sec) => {
          if (sec === 'marketplace') {
            setBoardCategoryFilter('marketplace');
            setSelectedCategoryTitle(getLangText('වෙළඳපොල', 'Marketplace', 'சந்தை'));
          } else if (sec === 'professional_services') {
            setBoardCategoryFilter('professional_services');
            setSelectedCategoryTitle(getLangText('වෘත්තීය සේවා', 'Professional Services', 'தொழில்முறை'));
          } else if (sec === 'group_work') {
            setBoardCategoryFilter('group_work');
            setSelectedCategoryTitle(getLangText('කණ්ඩායම් වැඩ', 'Group Work', 'கூட்டு வேலை'));
          } else if (sec === 'quick_services') {
            setActiveFeedTab('quick_services');
            setBoardCategoryFilter('quick_services');
            setSelectedCategoryTitle(getLangText('ඉක්මන් සේවා', 'Quick Services', 'விரைவு சேவை'));
          } else if (sec === 'normal_services' || sec === 'find_for_me' || sec === 'from_me_to_you') {
            setActiveFeedTab('all');
            setBoardCategoryFilter(sec);
          } else {
            setBoardCategoryFilter('');
            setSelectedCategoryTitle('');
            setActiveFeedTab('all');
          }
        }}
      />
    </div>
  );
};

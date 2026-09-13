import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { BoostPostModal } from './BoostPostModal';
import { subscribeToUserSavedPosts, toggleSavePostInFirestore } from '../lib/firebase';
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
  Gift,
  HelpCircle,
  Lightbulb,
  Loader2,
  Rocket
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
  onRequireRegistration?: () => void;
  onBoostPost?: (post: HelpPost) => void;
  onUpdatePost?: (post: HelpPost) => void;
  onAdminModerate?: (post: HelpPost) => void;
  onPosterRespondIssue?: (post: HelpPost) => void;
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
  onRequireRegistration,
  onBoostPost,
  onUpdatePost,
  onAdminModerate,
  onPosterRespondIssue,
  professionalServices = [],
  onAddProfessionalService,
  onAddProfessionalReview,
  registeredUsers = [],
}) => {
  // Boost Modal State
  const [boostingPost, setBoostingPost] = useState<HelpPost | null>(null);

  // Feed Filter Tab: 'all' | 'quick_services' | 'saved'
  const [activeFeedTab, setActiveFeedTab] = useState<'all' | 'quick_services' | 'saved'>('all');
  
  // Show / Hide Category Grid toggle (strictly closed by default so user always lands directly on Posts Feed)
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);

  // Guarantee that on mount or when boardCategoryFilter is cleared, category grid is closed and activeFeedTab is 'all'
  useEffect(() => {
    if (!boardCategoryFilter) {
      setShowCategoryGrid(false);
      setActiveFeedTab('all');
    }
  }, [boardCategoryFilter]);

  // Pagination / Auto Infinite Scroll (8 items per batch; loads next 8 as soon as reaching the last 2 items)
  const PAGE_SIZE = 8;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  // Reset pagination when category, tag or tab filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [boardCategoryFilter, selectedTagFilter, searchQuery, activeFeedTab, feedDistanceTab]);

  // Saved Posts State (Synced with Firestore in real-time + localStorage cache fallback)
  const userIdentifier = user?.userId || user?.id || user?.phone || '';
  const savedStorageKey = `sahaya_saved_posts_${userIdentifier || 'guest'}`;
  const [savedPostIds, setSavedPostIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(savedStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Subscribe to real-time Firestore saved posts
  useEffect(() => {
    if (!userIdentifier) return;
    const unsubscribe = subscribeToUserSavedPosts(userIdentifier, (cloudPostIds) => {
      if (cloudPostIds && cloudPostIds.length > 0) {
        setSavedPostIds((prev) => {
          const combined = Array.from(new Set([...prev, ...cloudPostIds]));
          try {
            localStorage.setItem(savedStorageKey, JSON.stringify(combined));
          } catch {}
          return combined;
        });
      }
    });
    return () => unsubscribe();
  }, [userIdentifier, savedStorageKey]);

  // Toast message state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBoardGuideOpen, setIsBoardGuideOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  // Toggle Save Post with Firestore sync
  const handleToggleSavePost = (post: HelpPost) => {
    const isAlreadySaved = savedPostIds.includes(post.id);
    const nextSavedState = !isAlreadySaved;

    setSavedPostIds((prev) => {
      const next = isAlreadySaved
        ? prev.filter((id) => id !== post.id)
        : [...prev, post.id];

      if (isAlreadySaved) {
        showToast('🗑️ දැන්වීම සුරැකි ලැයිස්තුවෙන් ඉවත් කරන ලදී.');
      } else {
        showToast('🔖 දැන්වීම සාර්ථකව සුරකින ලදී! ඔබට ඕනෑම වේලාවක "සුරකින ලද දැන්වීම්" ටැබ් එකෙන් මෙය නැරඹිය හැක.');
      }

      try {
        localStorage.setItem(savedStorageKey, JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save to local storage', err);
      }
      return next;
    });

    if (userIdentifier) {
      toggleSavePostInFirestore(userIdentifier, post.id, nextSavedState);
    }
  };

  const handleLoadMore = useCallback(() => {
    setIsLoadingMore((currentlyLoading) => {
      if (currentlyLoading) return true;
      setTimeout(() => {
        setVisibleCount((prev) => prev + PAGE_SIZE);
        setIsLoadingMore(false);
      }, 200);
      return true;
    });
  }, []);

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

    // Sort: Boosted posts first (within category & feed), then Quick Services, then chronological newest first
    return result.sort((a, b) => {
      const aIsBoosted = Boolean(a.isBoosted);
      const bIsBoosted = Boolean(b.isBoosted);

      if (aIsBoosted && !bIsBoosted) return -1;
      if (!aIsBoosted && bIsBoosted) return 1;

      const aIsQuick = isQuickService(a);
      const bIsQuick = isQuickService(b);

      if (aIsQuick && !bIsQuick) return -1;
      if (!aIsQuick && bIsQuick) return 1;

      // If both or neither, sort by post time (descending)
      const timeA = getPostTimestamp(a);
      const timeB = getPostTimestamp(b);
      return timeB - timeA;
    });
  }, [filteredPosts, activeFeedTab, savedPostIds]);

  // Automatic Infinite Scroll: Auto-load next 8 posts as soon as user views the last 2 posts
  useEffect(() => {
    if (visibleCount >= newsFeedSortedPosts.length) return;

    const target = observerTargetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '120px',
        threshold: 0.1,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [visibleCount, newsFeedSortedPosts.length, handleLoadMore]);

  const categoryCounts = useMemo(() => {
    const posts = helpPosts || [];
    return {
      all: posts.length,
      quick_services: posts.filter((p) => isQuickService(p)).length,
      normal_services: posts.filter((p) => !isQuickService(p) && (p.category === 'normal_services' || p.category === 'services' || p.category === 'general' || !p.category || p.serviceType === 'normal_services')).length,
      professional_services: posts.filter((p) => p.category === 'professional_services' || p.serviceType === 'professional_services').length,
      group_work: posts.filter((p) => p.category === 'group_work' || p.serviceType === 'group_work').length,
      marketplace: posts.filter((p) => p.category === 'marketplace' || p.serviceType === 'marketplace').length,
      find_for_me: posts.filter((p) => p.category === 'find_for_me' || p.serviceType === 'find_for_me').length,
      from_me_to_you: posts.filter((p) => p.category === 'from_me_to_you' || p.serviceType === 'from_me_to_you').length,
      saved: savedPostIds.length,
    };
  }, [helpPosts, savedPostIds]);

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

      {/* Compact Feed Filter Tabs & Controls */}
      <div className="bg-white/95 dark:bg-[#071710]/95 border border-slate-200/90 dark:border-[#132a1d] rounded-3xl p-3 sm:p-4 shadow-sm backdrop-blur-md space-y-3">
        {/* Main Feed Category Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {/* Tab 1: All Posts */}
          <button
            type="button"
            onClick={() => {
              setBoardCategoryFilter('');
              setSelectedCategoryTitle('');
              setActiveFeedTab('all');
            }}
            className={`px-3 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-between gap-1.5 border shadow-2xs ${
              !boardCategoryFilter && activeFeedTab === 'all'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-500 shadow-md shadow-emerald-600/20 scale-[1.01]'
                : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Megaphone className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="truncate">{getLangText('සියලු දැන්වීම්', 'All Posts', 'அனைத்து')}</span>
            </div>
            <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-black shrink-0 ${
              !boardCategoryFilter && activeFeedTab === 'all' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
            }`}>
              {categoryCounts.all}
            </span>
          </button>

          {/* Tab 2: Quick Services */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('quick_services');
              setBoardCategoryFilter('quick_services');
              setSelectedCategoryTitle(getLangText('ඉක්මන් සේවා', 'Quick Services', 'விரைவு சேவை'));
            }}
            className={`px-3 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-between gap-1.5 border shadow-2xs ${
              activeFeedTab === 'quick_services' || boardCategoryFilter === 'quick_services'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/20 scale-[1.01]'
                : 'bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-950/50 text-amber-950 dark:text-amber-200 border-amber-200/90 dark:border-amber-900/50'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Zap className="w-3.5 h-3.5 fill-current shrink-0 text-amber-500 dark:text-amber-300" />
              <span className="truncate">{getLangText('ඉක්මන් සේවා', 'Quick Services', 'விரைவு')}</span>
            </div>
            <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-black shrink-0 ${
              activeFeedTab === 'quick_services' || boardCategoryFilter === 'quick_services' ? 'bg-white/25 text-white' : 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200'
            }`}>
              {categoryCounts.quick_services}
            </span>
          </button>

          {/* Tab 3: Normal / General Services */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('normal_services');
              setSelectedCategoryTitle(getLangText('සාමාන්‍ය සේවා', 'General Services', 'பொதுவான சேவைகள்'));
            }}
            className={`px-3 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-between gap-1.5 border shadow-2xs ${
              boardCategoryFilter === 'normal_services'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-md shadow-blue-500/20 scale-[1.01]'
                : 'bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100/80 dark:hover:bg-blue-950/50 text-blue-950 dark:text-blue-200 border-blue-200/90 dark:border-blue-900/50'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Wrench className="w-3.5 h-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
              <span className="truncate">{getLangText('සාමාන්‍ය සේවා', 'General Services', 'பொதுவான')}</span>
            </div>
            <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-black shrink-0 ${
              boardCategoryFilter === 'normal_services' ? 'bg-white/25 text-white' : 'bg-blue-200/70 dark:bg-blue-900/60 text-blue-950 dark:text-blue-200'
            }`}>
              {categoryCounts.normal_services}
            </span>
          </button>

          {/* Tab 4: Professional Services */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('professional_services');
              setSelectedCategoryTitle(getLangText('වෘත්තීය සේවා', 'Professional Services', 'தொழில்முறை'));
            }}
            className={`px-3 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-between gap-1.5 border shadow-2xs ${
              boardCategoryFilter === 'professional_services'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white border-purple-400 shadow-md shadow-purple-500/20 scale-[1.01]'
                : 'bg-purple-50/70 dark:bg-purple-950/30 hover:bg-purple-100/80 dark:hover:bg-purple-950/50 text-purple-950 dark:text-purple-200 border-purple-200/90 dark:border-purple-900/50'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Briefcase className="w-3.5 h-3.5 shrink-0 text-purple-500 dark:text-purple-400" />
              <span className="truncate">{getLangText('වෘත්තීය සේවා', 'Professional', 'தொழில்முறை')}</span>
            </div>
            <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-black shrink-0 ${
              boardCategoryFilter === 'professional_services' ? 'bg-white/25 text-white' : 'bg-purple-200/70 dark:bg-purple-900/60 text-purple-950 dark:text-purple-200'
            }`}>
              {categoryCounts.professional_services}
            </span>
          </button>

          {/* Tab 5: Group Work */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('group_work');
              setSelectedCategoryTitle(getLangText('කණ්ඩායම් වැඩ', 'Group Work', 'குழு வேலை'));
            }}
            className={`px-3 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-between gap-1.5 border shadow-2xs ${
              boardCategoryFilter === 'group_work'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-700 text-white border-teal-400 shadow-md shadow-teal-500/20 scale-[1.01]'
                : 'bg-teal-50/70 dark:bg-teal-950/30 hover:bg-teal-100/80 dark:hover:bg-teal-950/50 text-teal-950 dark:text-teal-200 border-teal-200/90 dark:border-teal-900/50'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Users className="w-3.5 h-3.5 shrink-0 text-teal-500 dark:text-teal-400" />
              <span className="truncate">{getLangText('කණ්ඩායම් වැඩ', 'Group Work', 'குழு வேலை')}</span>
            </div>
            <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-black shrink-0 ${
              boardCategoryFilter === 'group_work' ? 'bg-white/25 text-white' : 'bg-teal-200/70 dark:bg-teal-900/60 text-teal-950 dark:text-teal-200'
            }`}>
              {categoryCounts.group_work}
            </span>
          </button>

          {/* Tab 6: Marketplace */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('marketplace');
              setSelectedCategoryTitle(getLangText('වෙළඳපොල', 'Marketplace', 'சந்தை'));
            }}
            className={`px-3 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-between gap-1.5 border shadow-2xs ${
              boardCategoryFilter === 'marketplace'
                ? 'bg-gradient-to-r from-rose-600 to-orange-600 text-white border-rose-400 shadow-md shadow-rose-500/20 scale-[1.01]'
                : 'bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100/80 dark:hover:bg-rose-950/50 text-rose-950 dark:text-rose-200 border-rose-200/90 dark:border-rose-900/50'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Store className="w-3.5 h-3.5 shrink-0 text-rose-500 dark:text-rose-400" />
              <span className="truncate">{getLangText('වෙළඳපොල', 'Marketplace', 'சந்தை')}</span>
            </div>
            <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-black shrink-0 ${
              boardCategoryFilter === 'marketplace' ? 'bg-white/25 text-white' : 'bg-rose-200/70 dark:bg-rose-900/60 text-rose-950 dark:text-rose-200'
            }`}>
              {categoryCounts.marketplace}
            </span>
          </button>

          {/* Tab 7: Find For Me */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('find_for_me');
              setSelectedCategoryTitle(getLangText('සොයාදෙන්න', 'Find For Me', 'கண்டுபிடித்துத் தருக'));
            }}
            className={`px-3 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-between gap-1.5 border shadow-2xs ${
              boardCategoryFilter === 'find_for_me'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.01]'
                : 'bg-cyan-50/70 dark:bg-cyan-950/30 hover:bg-cyan-100/80 dark:hover:bg-cyan-950/50 text-cyan-950 dark:text-cyan-200 border-cyan-200/90 dark:border-cyan-900/50'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Search className="w-3.5 h-3.5 shrink-0 text-cyan-500 dark:text-cyan-400" />
              <span className="truncate">{getLangText('සොයාදෙන්න', 'Find For Me', 'கண்டுபிடிக்க')}</span>
            </div>
            <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-black shrink-0 ${
              boardCategoryFilter === 'find_for_me' ? 'bg-white/25 text-white' : 'bg-cyan-200/70 dark:bg-cyan-900/60 text-cyan-950 dark:text-cyan-200'
            }`}>
              {categoryCounts.find_for_me}
            </span>
          </button>

          {/* Tab 8: From Me To You */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('from_me_to_you');
              setSelectedCategoryTitle(getLangText('මගෙන් ඔබට', 'From Me To You', 'என்னிடமிருந்து ನಿಮಗೆ'));
            }}
            className={`px-3 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-between gap-1.5 border shadow-2xs ${
              boardCategoryFilter === 'from_me_to_you'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-400 shadow-md shadow-pink-500/20 scale-[1.01]'
                : 'bg-pink-50/70 dark:bg-pink-950/30 hover:bg-pink-100/80 dark:hover:bg-pink-950/50 text-pink-950 dark:text-pink-200 border-pink-200/90 dark:border-pink-900/50'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Gift className="w-3.5 h-3.5 shrink-0 text-pink-500 dark:text-pink-400" />
              <span className="truncate">{getLangText('මගෙන් ඔබට', 'From Me To You', 'பரிසுகள்')}</span>
            </div>
            <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-black shrink-0 ${
              boardCategoryFilter === 'from_me_to_you' ? 'bg-white/25 text-white' : 'bg-pink-200/70 dark:bg-pink-900/60 text-pink-950 dark:text-pink-200'
            }`}>
              {categoryCounts.from_me_to_you}
            </span>
          </button>

          {/* Tab 9: Saved Posts */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('saved');
              setBoardCategoryFilter('');
              setSelectedCategoryTitle(getLangText('සුරැකි දැන්වීම්', 'Saved Posts', 'சேமித்தவை'));
            }}
            className={`px-3 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-between gap-1.5 border shadow-2xs ${
              activeFeedTab === 'saved'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-400 shadow-md shadow-amber-600/20 scale-[1.01]'
                : 'bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-950/50 text-amber-950 dark:text-amber-200 border-amber-200/80 dark:border-amber-900/50'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Bookmark className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="truncate">{getLangText('සුරැකි', 'Saved', 'சேமித்தவை')}</span>
            </div>
            <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] font-black shrink-0 ${
              activeFeedTab === 'saved' ? 'bg-white/25 text-white' : 'bg-amber-200/70 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200'
            }`}>
              {categoryCounts.saved}
            </span>
          </button>
        </div>

        {/* Action Toolbar: Category Filter Drawer Trigger & Distance Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#132a1d]">
          {/* Category Filter Trigger */}
          <button
            type="button"
            onClick={() => setShowCategoryGrid(!showCategoryGrid)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
              showCategoryGrid || (boardCategoryFilter && boardCategoryFilter !== 'quick_services')
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span>{getLangText('කාණ්ඩ පෙරහන්', 'Category Filter', 'வகை வடிகட்டி')}</span>
            {showCategoryGrid ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Distance Toggle (<15 KM vs All SL) */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-[#0c2217] rounded-xl border border-slate-200 dark:border-[#132a1d]">
            <button
              type="button"
              onClick={() => setFeedDistanceTab('local')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
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
              type="button"
              onClick={() => setFeedDistanceTab('all_sl')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
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

        {/* Expandable Category Selection Drawer */}
        {showCategoryGrid && (
          <div className="pt-3 border-t border-slate-100 dark:border-[#132a1d] animate-fadeIn space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>{getLangText('සේවා කාණ්ඩය තෝරන්න:', 'Select Service Category:', 'வகை தெரிவு:')}</span>
              </span>
              {boardCategoryFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setBoardCategoryFilter('');
                    setSelectedCategoryTitle('');
                    setShowCategoryGrid(false);
                  }}
                  className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{getLangText('සියල්ල පෙන්වන්න', 'Show All', 'அனைத்தையும் காட்டு')}</span>
                </button>
              )}
            </div>

            <CategoryGrid
              selectedCategory={boardCategoryFilter}
              onSelectCategory={(catKey, catTitle) => {
                setBoardCategoryFilter(catKey);
                setSelectedCategoryTitle(catTitle);
                setShowCategoryGrid(false);
              }}
              language={language}
            />
          </div>
        )}

        {/* Active Category Filter Chip (if active) */}
        {boardCategoryFilter && 
         boardCategoryFilter !== 'quick_services' && 
         boardCategoryFilter !== 'professional_services' && 
         boardCategoryFilter !== 'group_work' && 
         boardCategoryFilter !== 'marketplace' && (
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
                🏷️ පෙරහන:
              </span>
              <span>{selectedCategoryTitle || boardCategoryFilter}</span>
            </div>
            <button
              type="button"
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
          posts={helpPosts}
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
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBoardCategoryFilter('');
                      setSelectedCategoryTitle('');
                      setSelectedTagFilter(null);
                      setSearchQuery('');
                      setActiveFeedTab('all');
                      setFeedDistanceTab('all_sl');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-extrabold text-xs rounded-2xl border border-slate-300 dark:border-slate-700 shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{getLangText('සියලු දැන්වීම් පෙන්වන්න (පෙරහන් ඉවත් කරන්න)', 'Show All Posts (Reset Filters)', 'அனைத்தையும் காட்டு (வடிகட்டியை நீக்கு)')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenCreateModal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{getLangText('අලුත් දැන්වීමක් පළ කරන්න', 'Publish Request', 'கோரிக்கையை வெளியිடு')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {/* Pagination Info Badge */}
              <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span>
                  {getLangText('දැන්වීම් ලැයිස්තුව', 'Posts Feed', 'இடுகைகள் பட்டியல்')}
                </span>
                <span className="bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                  {Math.min(visibleCount, newsFeedSortedPosts.length)} / {newsFeedSortedPosts.length} {getLangText('පෙන්වයි', 'shown', 'காட்டப்படுகிறது')}
                </span>
              </div>

              {newsFeedSortedPosts.slice(0, visibleCount).map((post, idx, arr) => {
                // Attach the observer trigger ref to the 2nd-to-last item in the current batch
                const isTrigger = idx === Math.max(0, arr.length - 2);

                return (
                  <div
                    key={post.id}
                    ref={isTrigger ? observerTargetRef : null}
                    className="transition-all duration-300"
                  >
                    <PostCard
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
                      onRequireRegistration={onRequireRegistration}
                      onBoostPost={(p) => {
                        if (onBoostPost) {
                          onBoostPost(p);
                        } else {
                          setBoostingPost(p);
                        }
                      }}
                      onAdminModerate={onAdminModerate}
                      onPosterRespondIssue={onPosterRespondIssue}
                    />
                  </div>
                );
              })}

              {/* Automatic Infinite Scroll Status Indicator */}
              {visibleCount < newsFeedSortedPosts.length && (
                <div className="pt-2 pb-1 text-center">
                  {isLoadingMore ? (
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs shadow-xs animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                      <span>{getLangText('ඊළඟ දැන්වීම් 8 ස්වයංක්‍රීයව පූරණය වෙමින් පවතී...', 'Auto-loading next 8 posts...', 'அடுத்த 8 இடுகைகள் தானாகவே ஏற்றப்படுகின்றன...')}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-emerald-500" />
                      <span>
                        {getLangText(
                          `තව පෙන්වන්න (+${Math.min(PAGE_SIZE, newsFeedSortedPosts.length - visibleCount)})`,
                          `Load More (+${Math.min(PAGE_SIZE, newsFeedSortedPosts.length - visibleCount)})`,
                          `மேலும் காட்டவும் (+${Math.min(PAGE_SIZE, newsFeedSortedPosts.length - visibleCount)})`
                        )}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* All Posts Loaded Notice */}
              {visibleCount >= newsFeedSortedPosts.length && newsFeedSortedPosts.length > PAGE_SIZE && (
                <div className="py-3 text-center text-xs text-slate-600 dark:text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{getLangText('සියලු දැන්වීම් පෙන්වා අවසන්', 'All posts loaded', 'அனைத்து இடுகைகளும் ஏற்றப்பட்டன')}</span>
                </div>
              )}
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

      {/* Boost Ad Modal (Rs. 250 Top Priority) */}
      <BoostPostModal
        isOpen={Boolean(boostingPost)}
        onClose={() => setBoostingPost(null)}
        post={boostingPost}
        currentUser={user}
        language={language}
        onBoostSuccess={(updatedPost) => {
          if (onUpdatePost) {
            onUpdatePost(updatedPost);
          }
        }}
      />
    </div>
  );
};

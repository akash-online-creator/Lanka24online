import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  HelpPost, 
  User, 
  Language, 
  LocationOption, 
  TagItem, 
  CategoryItem, 
  ProfessionalService, 
  ServiceReview,
  RedAlertItem
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
import { checkIsPostOwner } from '../utils/postOwnerHelper';
import { getDisasterConfig } from '../data/redAlertData';
import { calculateDistanceKm } from '../utils/geoUtils';
import { isPostPermanentlyDeleted } from '../utils/deletedPostsManager';
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
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Wrench,
  Store,
  Users,
  Gift,
  HelpCircle,
  Lightbulb,
  Loader2,
  Rocket,
  AlertTriangle,
  Radio,
  ArrowRight,
  ShieldAlert,
  Volume2,
  Navigation,
  Camera,
  Mic,
  ArrowLeftRight
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
  onToggleHidePost?: (post: HelpPost) => void;
  onViewPost: (post: HelpPost) => void;
  onDeletePost: (post: HelpPost) => void;
  onOpenChat: (post: HelpPost) => void;
  onOpenConfirm?: (post: HelpPost) => void;
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
  onDeleteProfessionalService?: (serviceId: string) => void;
  registeredUsers?: User[];
  redAlerts?: RedAlertItem[];
  onViewRedAlertDetail?: (alert: RedAlertItem) => void;
  onOpenRedAlert?: () => void;
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
  onToggleHidePost,
  onViewPost,
  onDeletePost,
  onOpenChat,
  onOpenConfirm,
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
  onDeleteProfessionalService,
  registeredUsers = [],
  redAlerts = [],
  onViewRedAlertDetail,
  onOpenRedAlert,
}) => {
  // Boost Modal State
  const [boostingPost, setBoostingPost] = useState<HelpPost | null>(null);

  // Feed Filter Tab: 'all' | 'emergency' | 'quick_services' | 'saved'
  const [activeFeedTab, setActiveFeedTab] = useState<'all' | 'emergency' | 'quick_services' | 'saved'>('all');
  
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

  // Real-time listener for newly submitted posts across users: Auto focus directly to Notice Board
  useEffect(() => {
    const handleNewPostEvent = (e: any) => {
      setVisibleCount((prev) => Math.max(prev, PAGE_SIZE));
      const el = document.getElementById('help-notices-feed');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      showToast('✨ නව දැන්වීමක් දැන්වීම් පුවරුවේ ඉහළින්ම පූරණය විය!');
    };

    window.addEventListener('sahaya_new_post_published', handleNewPostEvent);
    return () => {
      window.removeEventListener('sahaya_new_post_published', handleNewPostEvent);
    };
  }, []);

  // Toggle Save Post with Firestore sync
  const handleToggleSavePost = (post: HelpPost) => {
    if (!post || !post.id) return;
    if (user?.isDemo) {
      if (onRequireRegistration) onRequireRegistration();
      return;
    }
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

    if (userIdentifier && post?.id) {
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

  // Helper to determine if a post is a high-priority / emergency community alert
  const isEmergencyOrHighPriority = (post: HelpPost): boolean => {
    if (!post) return false;
    if (post.isPinnedEmergency) return true;
    if (post.priorityLevel === 'emergency' || post.priorityLevel === 'high') return true;
    if (post.postCode?.startsWith('#BLD-') || post.postCode?.startsWith('#EMG-')) return true;
    if (post.category === 'emergency' || post.category === 'blood_disaster' || post.tagCategory === 'හදිසි / ආපදා') return true;
    const text = `${post.whatHappened || ''} ${post.whatIsNeeded || ''} ${post.tagName || ''} ${post.category || ''} ${post.tagCategory || ''}`.toLowerCase();
    if (
      text.includes('හදිසි අනතුර') ||
      text.includes('රුධිර') ||
      text.includes('ලේ') ||
      text.includes('blood') ||
      text.includes('emergency') ||
      text.includes('ජල ගැලීම්') ||
      text.includes('ගංවතුර') ||
      text.includes('නැතිවූ දරුවා') ||
      text.includes('ආපදා') ||
      text.includes('icu')
    ) {
      return true;
    }
    return false;
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
    if (post.createdAtMs && !isNaN(Number(post.createdAtMs)) && Number(post.createdAtMs) > 0) {
      return Number(post.createdAtMs);
    }
    if ((post as any).createdAtIso) {
      const parsed = new Date((post as any).createdAtIso).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (post.createdAt) {
      const parsed = new Date(post.createdAt).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (post.id && typeof post.id === 'string' && post.id.startsWith('post_')) {
      const parts = post.id.split('_');
      const num = parseInt(parts[1]);
      if (!isNaN(num) && num > 1000000000) return num;
    }
    return 0;
  };

  // Process and sort News Feed posts:
  // 1. Pinned Emergency & High Priority Community Alerts ALWAYS come first
  // 2. Boosted Top Ads come next
  // 3. Quick Services come next
  // 4. All other posts are sorted chronologically (newest first)
  // 5. Tab filter applied (All / Emergency only / Quick Services only / Saved posts only)
  const newsFeedSortedPosts = useMemo(() => {
    const isAdminUser = Boolean(user && (user.role === 'admin' || user.role === 'super_admin'));
    const sourceList = (filteredPosts || []).filter((p): p is HelpPost => {
      if (!p || typeof p !== 'object' || !p.id || p.isDeleted || p.status === 'deleted' || isPostPermanentlyDeleted(p.id)) {
        return false;
      }
      const isHidden = Boolean(p.isHidden || p.isHiddenByAdmin || p.status === 'hidden');
      if (isHidden) {
        const isOwner = checkIsPostOwner(user, p);
        if (!isAdminUser && !isOwner) {
          return false;
        }
      }
      return true;
    });

    let result = sourceList;

    // Apply active feed tab filter
    if (activeFeedTab === 'emergency') {
      result = result.filter((p) => isEmergencyOrHighPriority(p));
    } else if (activeFeedTab === 'quick_services') {
      result = result.filter((p) => isQuickService(p));
    } else if (activeFeedTab === 'saved') {
      result = result.filter((p) => p?.id && savedPostIds.includes(p.id));
    }

    // Sort: Emergency & Pinned first, then Boosted, then Quick Services, then chronological newest first
    return result.sort((a, b) => {
      if (!a || !b) return 0;
      const aIsEmerg = isEmergencyOrHighPriority(a);
      const bIsEmerg = isEmergencyOrHighPriority(b);
      if (aIsEmerg && !bIsEmerg) return -1;
      if (!aIsEmerg && bIsEmerg) return 1;

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
      emergency: posts.filter((p) => isEmergencyOrHighPriority(p)).length,
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

  const activeRedAlerts = useMemo(() => {
    return (redAlerts || []).filter((a) => a.status === 'active' && !a.isFlaggedFake);
  }, [redAlerts]);

  // 🚨 Dynamic Cycling Carousel state for multiple Red Alerts
  const [activeAlertIndex, setActiveAlertIndex] = useState(0);
  const [isAlertCarouselPaused, setIsAlertCarouselPaused] = useState(false);

  // Auto-advance through alerts every 5.5 seconds if multiple exist
  useEffect(() => {
    if (activeRedAlerts.length <= 1 || isAlertCarouselPaused) return;
    const interval = setInterval(() => {
      setActiveAlertIndex((prev) => (prev + 1) % activeRedAlerts.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [activeRedAlerts.length, isAlertCarouselPaused]);

  // Reset index if out of bounds
  useEffect(() => {
    if (activeAlertIndex >= activeRedAlerts.length && activeRedAlerts.length > 0) {
      setActiveAlertIndex(0);
    }
  }, [activeRedAlerts.length, activeAlertIndex]);

  const currentRedAlert = activeRedAlerts.length > 0
    ? activeRedAlerts[activeAlertIndex % activeRedAlerts.length]
    : null;

  const getAlertDistanceDisplay = useCallback((alert: RedAlertItem) => {
    if (
      !currentLocation ||
      typeof currentLocation.lat !== 'number' ||
      typeof currentLocation.lng !== 'number' ||
      typeof alert?.latitude !== 'number' ||
      typeof alert?.longitude !== 'number'
    ) return null;
    const distanceKm = calculateDistanceKm(
      currentLocation.lat,
      currentLocation.lng,
      alert.latitude,
      alert.longitude
    );
    if (distanceKm < 1) {
      return `මීටර් ${Math.round(distanceKm * 1000)}`;
    }
    return `කි.මී. ${distanceKm.toFixed(1)}`;
  }, [currentLocation]);

  return (
    <div className="w-full max-w-3xl mx-auto py-3 sm:py-5 space-y-4 sm:space-y-6 animate-fadeIn pb-16">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-950/95 dark:bg-emerald-950 text-white font-extrabold text-xs sm:text-sm shadow-2xl border border-emerald-500/60 backdrop-blur-md flex items-center gap-2.5 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 🚨 Emergency Disaster Red Alert Compact Rotating Carousel at the Top of Notice Board */}
      {currentRedAlert && (
        <div 
          onMouseEnter={() => setIsAlertCarouselPaused(true)}
          onMouseLeave={() => setIsAlertCarouselPaused(false)}
          className="relative rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-800 text-white shadow-xl shadow-red-600/30 border-2 border-red-400/90 overflow-hidden transition-all duration-300 animate-fadeIn cursor-pointer group"
          onClick={() => {
            if (onViewRedAlertDetail && currentRedAlert) {
              onViewRedAlertDetail(currentRedAlert);
            }
          }}
        >
          {/* Visual Ambient Light Effect */}
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 bg-white/15 rounded-full blur-2xl pointer-events-none" />

          {/* Animated Progress Timer Line for active cycling */}
          {activeRedAlerts.length > 1 && !isAlertCarouselPaused && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 overflow-hidden z-20">
              <div 
                key={`progress-${activeAlertIndex}`} 
                className="h-full bg-yellow-300 transition-all"
                style={{
                  animation: 'shrinkWidth 5.5s linear forwards'
                }}
              />
            </div>
          )}

          <div className="p-4 sm:p-5 relative z-10 space-y-2.5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {/* 3D Animated Disaster Icon Beacon */}
                <div className="w-12 h-12 rounded-2xl bg-white text-red-600 flex items-center justify-center shrink-0 shadow-lg font-black text-2xl animate-pulse group-hover:scale-105 transition-transform">
                  {getDisasterConfig(currentRedAlert.disasterType).icon || '🚨'}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  {/* Top Badges & Multi-Alert Indicator */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white text-red-700 uppercase tracking-wide flex items-center gap-1 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                      <span>{getLangText('හදිසි ආපදා අනතුරු ඇඟවීම (රතු එළිය)', 'Emergency Disaster Alert', 'சிவப்பு எச்சரிக்கை')}</span>
                    </span>

                    {activeRedAlerts.length > 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-black/40 text-yellow-300 font-mono border border-yellow-300/40 flex items-center gap-1">
                        <span>🚨 {(activeAlertIndex % activeRedAlerts.length) + 1} / {activeRedAlerts.length}</span>
                        <span className="text-[9px] text-red-200">({getLangText('මාරු වේ', 'Rotating', 'சுழலும்')})</span>
                      </span>
                    )}

                    {currentRedAlert.alertCode && (
                      <span className="text-[10px] font-mono text-red-100 font-bold bg-black/25 px-2 py-0.5 rounded-md">
                        {currentRedAlert.alertCode}
                      </span>
                    )}
                  </div>

                  {/* Incident Title */}
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight flex items-center gap-1.5 flex-wrap">
                    <span>{currentRedAlert.disasterTitleSi || getDisasterConfig(currentRedAlert.disasterType).titleSi}</span>
                  </h3>

                  {/* Location & Distance Pills */}
                  <div className="flex items-center gap-2 text-xs text-red-100 flex-wrap font-medium pt-0.5">
                    <span className="flex items-center gap-1 font-bold text-white bg-black/25 px-2.5 py-1 rounded-lg">
                      <MapPin className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                      <span>{currentRedAlert.locationName}</span>
                    </span>

                    {getAlertDistanceDisplay(currentRedAlert) && (
                      <span className="bg-white/20 px-2.5 py-1 rounded-lg font-mono font-bold text-white flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-amber-200" />
                        <span>{getLangText(`ඔබේ දුර: ${getAlertDistanceDisplay(currentRedAlert)}`, `Distance: ${getAlertDistanceDisplay(currentRedAlert)}`, `தூரம்: ${getAlertDistanceDisplay(currentRedAlert)}`)}</span>
                      </span>
                    )}

                    {currentRedAlert.incidentTime && (
                      <span className="bg-black/20 px-2 py-1 rounded-lg font-mono text-[11px] text-red-100 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-yellow-300" />
                        <span>{currentRedAlert.incidentDate} • {currentRedAlert.incidentTime}</span>
                      </span>
                    )}
                  </div>

                  {currentRedAlert.description && (
                    <p className="text-xs text-red-50 line-clamp-1 mt-1 leading-relaxed bg-black/20 p-1.5 rounded-xl border border-white/10">
                      {currentRedAlert.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Controls: View Details CTA & Carousel Navigation Buttons */}
              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onViewRedAlertDetail && currentRedAlert) {
                      onViewRedAlertDetail(currentRedAlert);
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-red-50 text-red-700 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 hover:shadow-red-500/30"
                >
                  <span>{getLangText('විස්තර සහ උපදෙස් බලන්න', 'View Safety Details', 'பாதுகாப்பு விவரங்கள்')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Carousel Interactive Controls for Multiple Alerts */}
                {activeRedAlerts.length > 1 && (
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="flex items-center gap-1.5 bg-black/30 backdrop-blur-xs px-2 py-1 rounded-xl border border-white/15"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveAlertIndex((prev) => (prev - 1 + activeRedAlerts.length) % activeRedAlerts.length)}
                      className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                      title="පෙර ආපදාව (Previous Alert)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Clickable indicator dots */}
                    <div className="flex items-center gap-1 px-1">
                      {activeRedAlerts.map((_, dotIdx) => (
                        <button
                          key={`alert-dot-${dotIdx}`}
                          type="button"
                          onClick={() => setActiveAlertIndex(dotIdx)}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            (activeAlertIndex % activeRedAlerts.length) === dotIdx
                              ? 'w-5 bg-yellow-300 shadow-xs'
                              : 'w-2 bg-white/40 hover:bg-white/70'
                          }`}
                          title={`ආපදා ඇඟවීම ${dotIdx + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveAlertIndex((prev) => (prev + 1) % activeRedAlerts.length)}
                      className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                      title="ඊළඟ ආපදාව (Next Alert)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAlertCarouselPaused(!isAlertCarouselPaused)}
                      className="p-1 rounded-lg hover:bg-white/20 text-yellow-300 ml-0.5 transition-colors cursor-pointer"
                      title={isAlertCarouselPaused ? "ස්වයංක්‍රීයව මාරු වීම අරඹන්න (Play)" : "මාරු වීම නවත්වන්න (Pause)"}
                    >
                      {isAlertCarouselPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar with Back Button & Guide Trigger */}
      <div className="bg-white dark:bg-[#07130c] border border-slate-200/90 dark:border-[#132a1d] rounded-3xl p-4 sm:p-5 shadow-md flex flex-wrap items-center justify-between gap-3">
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
                {getLangText('සහය පුවරුව', 'Support Board', 'உதவி பலகை')}
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
      <div className="bg-white dark:bg-[#071710] border-2 border-slate-200 dark:border-[#132a1d] rounded-3xl p-3.5 sm:p-4.5 shadow-sm space-y-3.5">
        
        {/* Tier 1: 4 Core Primary Feed Tabs (Large, High-Contrast, Crisp, Zero Blur) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Tab 1: සියලු දැන්වීම් (All Posts) */}
          <button
            type="button"
            onClick={() => {
              setBoardCategoryFilter('');
              setSelectedCategoryTitle('');
              setActiveFeedTab('all');
            }}
            className={`p-3 sm:p-4 rounded-2xl font-black text-xs sm:text-sm md:text-base transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 border-2 shadow-sm text-left active:scale-[0.98] ${
              !boardCategoryFilter && activeFeedTab === 'all'
                ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-500 shadow-md shadow-emerald-600/25 scale-[1.01]'
                : 'bg-slate-50 dark:bg-[#0d1e15] hover:bg-emerald-50/70 dark:hover:bg-[#122b1e] text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${
                !boardCategoryFilter && activeFeedTab === 'all' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
              }`}>
                <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className={`px-2 py-0.5 rounded-full font-mono text-xs font-black shrink-0 ${
                !boardCategoryFilter && activeFeedTab === 'all' ? 'bg-white text-emerald-900 shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
              }`}>
                {categoryCounts.all}
              </span>
            </div>
            <div className="min-w-0">
              <span className="block font-black leading-tight tracking-tight">
                {getLangText('සියලු දැන්වීම්', 'All Posts', 'அனைத்து விளம்பரங்கள்')}
              </span>
            </div>
          </button>

          {/* Tab 2: වෙළඳපොල (Marketplace) */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('marketplace');
              setSelectedCategoryTitle(getLangText('වෙළඳපොල', 'Marketplace', 'சந்தை'));
            }}
            className={`p-3 sm:p-4 rounded-2xl font-black text-xs sm:text-sm md:text-base transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 border-2 shadow-sm text-left active:scale-[0.98] ${
              boardCategoryFilter === 'marketplace'
                ? 'bg-gradient-to-br from-rose-600 to-red-700 text-white border-rose-500 shadow-md shadow-rose-600/25 scale-[1.01]'
                : 'bg-slate-50 dark:bg-[#0d1e15] hover:bg-rose-50/70 dark:hover:bg-[#201015] text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${
                boardCategoryFilter === 'marketplace' ? 'bg-white/20 text-white' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
              }`}>
                <Store className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className={`px-2 py-0.5 rounded-full font-mono text-xs font-black shrink-0 ${
                boardCategoryFilter === 'marketplace' ? 'bg-white text-rose-900 shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
              }`}>
                {categoryCounts.marketplace}
              </span>
            </div>
            <div className="min-w-0">
              <span className="block font-black leading-tight tracking-tight">
                {getLangText('වෙළඳපොල', 'Marketplace', 'சந்தை')}
              </span>
            </div>
          </button>

          {/* Tab 3: කණ්ඩායම් වැඩ (Group Work) */}
          <button
            type="button"
            onClick={() => {
              if (user?.isDemo) {
                if (onRequireRegistration) onRequireRegistration();
                return;
              }
              setActiveFeedTab('all');
              setBoardCategoryFilter('group_work');
              setSelectedCategoryTitle(getLangText('කණ්ඩායම් වැඩ', 'Group Work', 'குழு வேலை'));
            }}
            className={`p-3 sm:p-4 rounded-2xl font-black text-xs sm:text-sm md:text-base transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 border-2 shadow-sm text-left active:scale-[0.98] ${
              boardCategoryFilter === 'group_work'
                ? 'bg-gradient-to-br from-teal-600 to-emerald-700 text-white border-teal-500 shadow-md shadow-teal-600/25 scale-[1.01]'
                : 'bg-slate-50 dark:bg-[#0d1e15] hover:bg-teal-50/70 dark:hover:bg-[#0f2820] text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${
                boardCategoryFilter === 'group_work' ? 'bg-white/20 text-white' : 'bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300'
              }`}>
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className={`px-2 py-0.5 rounded-full font-mono text-xs font-black shrink-0 ${
                boardCategoryFilter === 'group_work' ? 'bg-white text-teal-900 shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
              }`}>
                {categoryCounts.group_work}
              </span>
            </div>
            <div className="min-w-0">
              <span className="block font-black leading-tight tracking-tight">
                {getLangText('කණ්ඩායම් වැඩ', 'Group Work', 'குழு வேலை')}
              </span>
            </div>
          </button>

          {/* Tab 4: ක්ෂණික සේවා (Quick Services) */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('quick_services');
              setBoardCategoryFilter('quick_services');
              setSelectedCategoryTitle(getLangText('ක්ෂණික සේවා', 'Quick Services', 'விரைவு சேவை'));
            }}
            className={`p-3 sm:p-4 rounded-2xl font-black text-xs sm:text-sm md:text-base transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 border-2 shadow-sm text-left active:scale-[0.98] ${
              activeFeedTab === 'quick_services' || boardCategoryFilter === 'quick_services'
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-400 shadow-md shadow-amber-500/25 scale-[1.01]'
                : 'bg-slate-50 dark:bg-[#0d1e15] hover:bg-amber-50/70 dark:hover:bg-[#251d08] text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${
                activeFeedTab === 'quick_services' || boardCategoryFilter === 'quick_services' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
              }`}>
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              </div>
              <span className={`px-2 py-0.5 rounded-full font-mono text-xs font-black shrink-0 ${
                activeFeedTab === 'quick_services' || boardCategoryFilter === 'quick_services' ? 'bg-white text-amber-900 shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
              }`}>
                {categoryCounts.quick_services}
              </span>
            </div>
            <div className="min-w-0">
              <span className="block font-black leading-tight tracking-tight">
                {getLangText('ක්ෂණික සේවා', 'Quick Services', 'விரைவு சேவைகள்')}
              </span>
            </div>
          </button>
        </div>

        {/* Category Selection Header & Distance Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-200 dark:border-[#132a1d]">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{getLangText('අනෙකුත් සේවා කාණ්ඩ', 'More Categories', 'மற்ற பிரிவுகள்')}</span>
          </div>

          {/* Distance Toggle (<15 KM vs All SL) */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-[#0c2217] rounded-2xl border border-slate-300 dark:border-[#132a1d]">
            <button
              type="button"
              onClick={() => setFeedDistanceTab('local')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                feedDistanceTab === 'local'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="මගේ ප්‍රදේශය (<15 KM)"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{'<15 KM'}</span>
            </button>

            <button
              type="button"
              onClick={() => setFeedDistanceTab('all_sl')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                feedDistanceTab === 'all_sl'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="සමස්ත ශ්‍රී ලංකාවම"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{getLangText('සමස්ත ලංකා', 'All SL', 'இலங்கை')}</span>
            </button>
          </div>
        </div>

        {/* 6 Category Buttons - Permanently Displayed on Screen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Category 1: 🚨 හදිසි / ආපදා */}
          <button
            type="button"
            onClick={() => {
              setBoardCategoryFilter('');
              setSelectedCategoryTitle(getLangText('🚨 හදිසි / ප්‍රමුඛතා දැන්වීම්', '🚨 Emergency Alerts', '🚨 அவசர அறிவிப்புகள்'));
              setActiveFeedTab('emergency');
            }}
            className={`p-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between gap-2 border-2 shadow-2xs ${
              activeFeedTab === 'emergency'
                ? 'bg-red-600 text-white border-red-500 shadow-md'
                : 'bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-950 dark:text-red-200 border-red-200 dark:border-red-900/60'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              <span className="truncate">{getLangText('හදිසි / ආපදා', 'Emergency', 'அவசரம்')}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-black bg-white/30 dark:bg-red-900 text-red-950 dark:text-red-100">
              {categoryCounts.emergency}
            </span>
          </button>

          {/* Category 2: 🔧 සාමාන්‍ය සේවා */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('normal_services');
              setSelectedCategoryTitle(getLangText('සාමාන්‍ය සේවා', 'General Services', 'பொதுவான சேவைகள்'));
            }}
            className={`p-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between gap-2 border-2 shadow-2xs ${
              boardCategoryFilter === 'normal_services'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                : 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-950 dark:text-blue-200 border-blue-200 dark:border-blue-900/60'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Wrench className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="truncate">{getLangText('සාමාන්‍ය සේවා', 'General Services', 'பொதுவான')}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-black bg-white/30 dark:bg-blue-900 text-blue-950 dark:text-blue-100">
              {categoryCounts.normal_services}
            </span>
          </button>

          {/* Category 3: 💼 වෘත්තීය සේවා */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('professional_services');
              setSelectedCategoryTitle(getLangText('වෘත්තීය සේවා', 'Professional Services', 'தொழில்முறை'));
            }}
            className={`p-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between gap-2 border-2 shadow-2xs ${
              boardCategoryFilter === 'professional_services'
                ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                : 'bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-950 dark:text-purple-200 border-purple-200 dark:border-purple-900/60'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Briefcase className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
              <span className="truncate">{getLangText('වෘත්තීය සේවා', 'Professional', 'தொழில்முறை')}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-black bg-white/30 dark:bg-purple-900 text-purple-950 dark:text-purple-100">
              {categoryCounts.professional_services}
            </span>
          </button>

          {/* Category 4: 🔍 සොයාදෙන්න */}
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('all');
              setBoardCategoryFilter('find_for_me');
              setSelectedCategoryTitle(getLangText('සොයාදෙන්න', 'Find For Me', 'கண்டுபிடித்துத் தருக'));
            }}
            className={`p-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between gap-2 border-2 shadow-2xs ${
              boardCategoryFilter === 'find_for_me'
                ? 'bg-cyan-600 text-white border-cyan-500 shadow-md'
                : 'bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 text-cyan-950 dark:text-cyan-200 border-cyan-200 dark:border-cyan-900/60'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-4 h-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
              <span className="truncate">{getLangText('සොයාදෙන්න', 'Find For Me', 'கண்டுபிடிக்க')}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-black bg-white/30 dark:bg-cyan-900 text-cyan-950 dark:text-cyan-100">
              {categoryCounts.find_for_me}
            </span>
          </button>

          {/* Category 5: 🎁 මගෙන් ඔබට */}
          <button
            type="button"
            onClick={() => {
              if (user?.isDemo) {
                if (onRequireRegistration) onRequireRegistration();
                return;
              }
              setActiveFeedTab('all');
              setBoardCategoryFilter('from_me_to_you');
              setSelectedCategoryTitle(getLangText('මගෙන් ඔබට', 'From Me To You', 'என்னிடமிருந்து உங்களுக்கு'));
            }}
            className={`p-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between gap-2 border-2 shadow-2xs ${
              boardCategoryFilter === 'from_me_to_you'
                ? 'bg-pink-600 text-white border-pink-500 shadow-md'
                : 'bg-pink-50 dark:bg-pink-950/40 hover:bg-pink-100 text-pink-950 dark:text-pink-200 border-pink-200 dark:border-pink-900/60'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Gift className="w-4 h-4 shrink-0 text-pink-600 dark:text-pink-400" />
              <span className="truncate">{getLangText('මගෙන් ඔබට', 'From Me To You', 'பரிசுகள்')}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-black bg-white/30 dark:bg-pink-900 text-pink-950 dark:text-pink-100">
              {categoryCounts.from_me_to_you}
            </span>
          </button>

          {/* Category 6: 🔖 සුරැකි දැන්වීම් */}
          <button
            type="button"
            onClick={() => {
              if (user?.isDemo) {
                if (onRequireRegistration) onRequireRegistration();
                return;
              }
              setActiveFeedTab('saved');
              setBoardCategoryFilter('');
              setSelectedCategoryTitle(getLangText('සුරැකි දැන්වීම්', 'Saved Posts', 'சேமித்தவை'));
            }}
            className={`p-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between gap-2 border-2 shadow-2xs ${
              activeFeedTab === 'saved'
                ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-950 dark:text-amber-200 border-amber-200 dark:border-amber-900/60'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Bookmark className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="truncate">{getLangText('සුරැකි දැන්වීම්', 'Saved Posts', 'சேமித்தவை')}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-black bg-white/30 dark:bg-amber-900 text-amber-950 dark:text-amber-100">
              {categoryCounts.saved}
            </span>
          </button>
        </div>

        {/* Active Category Filter Chip (if active) */}
        {boardCategoryFilter && 
         boardCategoryFilter !== 'quick_services' && 
         boardCategoryFilter !== 'professional_services' && 
         boardCategoryFilter !== 'group_work' && 
         boardCategoryFilter !== 'marketplace' && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-300 dark:border-emerald-700 text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-100 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-200 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-50 font-black">
                🏷️ සක්‍රීය පෙරහන:
              </span>
              <span className="font-extrabold">{selectedCategoryTitle || boardCategoryFilter}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setBoardCategoryFilter('');
                setSelectedCategoryTitle('');
                setActiveFeedTab('all');
              }}
              className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 font-black hover:underline cursor-pointer px-2 py-1 bg-white dark:bg-slate-900 rounded-lg border border-rose-200 dark:border-rose-900"
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
          language={language}
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
          onDeleteService={(sId) => {
            if (onDeleteProfessionalService) onDeleteProfessionalService(sId);
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
          onRequireRegistration={onRequireRegistration}
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
              {/* Active Red Alert Emergency Cards Pinned at Top of Feed */}
              {activeRedAlerts.length > 0 && (
                <div className="space-y-3 pb-1">
                  {activeRedAlerts.map((alert, aIdx) => {
                    const config = getDisasterConfig(alert.disasterType);
                    const distStr = getAlertDistanceDisplay(alert);
                    return (
                      <div
                        key={`feed-top-alert-${alert.id || 'alt'}_${aIdx}`}
                        className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-800 text-white shadow-xl shadow-red-600/30 border-2 border-red-400 relative overflow-hidden animate-fadeIn"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-white text-red-600 flex items-center justify-center shrink-0 shadow-lg font-black text-2xl animate-pulse">
                              {config.icon || '🚨'}
                            </div>
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white text-red-700 uppercase tracking-wide flex items-center gap-1 shadow-xs">
                                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                                  <span>{getLangText('හදිසි ආපදා අනතුරු ඇඟවීම (රතු එළිය)', 'Emergency Disaster Alert', 'சிவப்பு எச்சரிக்கை')}</span>
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-black/30 text-yellow-300 font-mono border border-yellow-300/30">
                                  SIREN 5KM ACTIVE
                                </span>
                                {alert.alertCode && (
                                  <span className="text-[10px] font-mono text-red-100 font-bold bg-black/20 px-2 py-0.5 rounded-md">
                                    {alert.alertCode}
                                  </span>
                                )}
                              </div>

                              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                                {alert.disasterTitleSi || config.titleSi}
                              </h3>

                              <div className="flex items-center gap-2.5 text-xs text-red-100 flex-wrap font-medium pt-0.5">
                                <span className="flex items-center gap-1 font-bold text-white bg-black/20 px-2.5 py-1 rounded-lg">
                                  <MapPin className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                                  <span>{alert.locationName}</span>
                                </span>
                                {distStr && (
                                  <span className="bg-white/20 px-2.5 py-1 rounded-lg font-mono font-bold text-white flex items-center gap-1">
                                    <Navigation className="w-3 h-3 text-amber-200" />
                                    <span>{getLangText(`ඔබේ දුර: ${distStr}`, `Distance: ${distStr}`, `தூரம்: ${distStr}`)}</span>
                                  </span>
                                )}
                              </div>

                              {alert.description && (
                                <p className="text-xs text-red-50 line-clamp-2 mt-1 leading-relaxed bg-black/20 p-2 rounded-xl border border-white/10">
                                  {alert.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (onViewRedAlertDetail) {
                                  onViewRedAlertDetail(alert);
                                }
                              }}
                              className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-red-50 text-red-700 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span>{getLangText('විස්තර සහ ආරක්ෂිත උපදෙස්', 'View Safety Details', 'பாதுகாப்பு விவரங்கள்')}</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

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

                const isPostOwner = checkIsPostOwner(user, post);

                return (
                  <div
                    key={`feed_post_${post.id || 'p'}_${idx}`}
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
                      isOwner={isPostOwner}
                      isSaved={savedPostIds.includes(post.id)}
                      onToggleSave={(p) => handleToggleSavePost(p)}
                      onOfferSupport={(p) => onOfferSupport(p)}
                      onEditPost={(p) => onEditPost(p)}
                      onToggleHidePost={(p) => onToggleHidePost ? onToggleHidePost(p) : undefined}
                      onViewPost={(p) => onViewPost(p)}
                      onDeletePost={(p) => onDeletePost(p)}
                      onOpenChat={(p) => onOpenChat(p)}
                      onOpenConfirm={(p) => onOpenConfirm ? onOpenConfirm(p) : onOfferSupport(p)}
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

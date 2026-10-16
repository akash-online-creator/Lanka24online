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
import { AccommodationView } from './AccommodationView';
import { JobsView } from './JobsView';
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
  
  // Show / Hide Category Grid toggle
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);
  
  // Guarantee that on mount or when boardCategoryFilter is cleared, category grid is closed and activeFeedTab is 'all'
  useEffect(() => {
    if (!boardCategoryFilter) {
      setShowCategoryGrid(false);
      setActiveFeedTab('all');
    }
  }, [boardCategoryFilter]);
  
  // Pagination / Auto Infinite Scroll (8 items per batch)
  const PAGE_SIZE = 8;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);
  
  // Reset pagination when category, tag or tab filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [boardCategoryFilter, selectedTagFilter, searchQuery, activeFeedTab, feedDistanceTab]);
  
  // Saved Posts State
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
  
  // Real-time listener for newly submitted posts
  useEffect(() => {
    const handleNewPostEvent = () => {
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
  
  const isQuickService = (post: HelpPost): boolean => {
    if (!post) return false;
    if (post.category === 'quick_services' || post.category === 'quick') return true;
    if (post.tagCategory === 'ඉක්මන් සේවා' || post.tagName?.toLowerCase().includes('quick') || post.tagName?.includes('හදිසි')) return true;
    if (post.customFieldValues?.f_urgency?.toString().includes('Immediate') || post.customFieldValues?.f_urgency?.toString().includes('හදිසි')) return true;
    return false;
  };
  
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
  
    if (activeFeedTab === 'emergency') {
      result = result.filter((p) => isEmergencyOrHighPriority(p));
    } else if (activeFeedTab === 'quick_services') {
      result = result.filter((p) => isQuickService(p));
    } else if (activeFeedTab === 'saved') {
      result = result.filter((p) => p?.id && savedPostIds.includes(p.id));
    }
  
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
  
      const timeA = getPostTimestamp(a);
      const timeB = getPostTimestamp(b);
      return timeB - timeA;
    });
  }, [filteredPosts, activeFeedTab, savedPostIds]);
  
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
      { root: null, rootMargin: '120px', threshold: 0.1 }
    );
  
    observer.observe(target);
    return () => observer.disconnect();
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
  
  const [activeAlertIndex, setActiveAlertIndex] = useState(0);
  const [isAlertCarouselPaused, setIsAlertCarouselPaused] = useState(false);
  
  useEffect(() => {
    if (activeRedAlerts.length <= 1 || isAlertCarouselPaused) return;
    const interval = setInterval(() => {
      setActiveAlertIndex((prev) => (prev + 1) % activeRedAlerts.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [activeRedAlerts.length, isAlertCarouselPaused]);
  
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

  // Real-time listener for direct #රැකියා and #නවාතැන click events
  useEffect(() => {
    const handleOpenJobsEvent = () => {
      setBoardCategoryFilter('jobs');
      if (setSelectedCategoryTitle) setSelectedCategoryTitle(getLangText('රැකියා', 'Jobs', 'வேலைகள்'));
    };
    const handleOpenAccEvent = () => {
      setBoardCategoryFilter('accommodation');
      if (setSelectedCategoryTitle) setSelectedCategoryTitle(getLangText('නවාතැන', 'Accommodation', 'தங்குமிடம்'));
    };
    window.addEventListener('sahaya_open_jobs_view', handleOpenJobsEvent);
    window.addEventListener('sahaya_open_accommodation_view', handleOpenAccEvent);
    return () => {
      window.removeEventListener('sahaya_open_jobs_view', handleOpenJobsEvent);
      window.removeEventListener('sahaya_open_accommodation_view', handleOpenAccEvent);
    };
  }, []);

  // If #රැකියා is active, display the full JobsView page immediately!
  if (boardCategoryFilter === 'jobs') {
    return (
      <JobsView
        userLat={currentLocation?.lat}
        userLng={currentLocation?.lng}
        userCityName={currentLocation?.nameSi}
        onBackToBoard={() => {
          setBoardCategoryFilter('');
          if (setSelectedCategoryTitle) setSelectedCategoryTitle('');
        }}
        language={language}
      />
    );
  }

  // If #නවාතැන is active, display AccommodationView immediately!
  if (boardCategoryFilter === 'accommodation') {
    return (
      <AccommodationView
        userLat={currentLocation?.lat}
        userLng={currentLocation?.lng}
        userCityName={currentLocation?.nameSi}
        onBackToBoard={() => {
          setBoardCategoryFilter('');
          if (setSelectedCategoryTitle) setSelectedCategoryTitle('');
        }}
      />
    );
  }

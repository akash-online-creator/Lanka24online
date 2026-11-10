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
import { ProximityAlertBanner } from './ProximityAlertBanner';
import { PostCard } from './PostCard';
import { CategoryGrid } from './CategoryGrid';
import { ProfessionalServicesView } from './ProfessionalServicesView';
import { GroupWorkView } from './GroupWorkView';
import { MarketplaceView } from './MarketplaceView';
import { AccommodationView } from './AccommodationView';
import { JobsView } from './JobsView';
import { BulletinBoardGuideModal } from './BulletinBoardGuideModal';
import { BoostPostModal } from './BoostPostModal';
import {
  subscribeToUserSavedPosts,
  toggleSavePostInFirestore,
  subscribeToMarketplaceItems,
  subscribeToMarketShops,
  subscribeToGroups,
  subscribeToAccommodationsFromFirestore,
} from '../lib/firebase';
import { getStoredMarketItems, getStoredMarketShops } from '../data/marketplaceData';
import { getStoredBloodRequests, getStoredDisasterReliefItems } from '../data/bloodAndDisasterData';
import { getStoredGroups } from '../data/groupWorkData';
import { getStoredJobs } from '../utils/jobStorage';
import { getStoredAccommodations } from '../utils/accommodationStorage';
import { checkIsPostOwner } from '../utils/postOwnerHelper';
import { getDisasterConfig } from '../data/redAlertData';
import { calculateDistanceKm } from '../utils/geoUtils';
import {
  isPostPermanentlyDeleted,
  filterNonDeletedJobs,
  filterNonDeletedAccommodations,
} from '../utils/deletedPostsManager';
import { isPostHelpersSatisfiedOrFilled } from '../utils/serviceWorkflowManager';
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
  onOpenCreateModal: (categoryKey?: string) => void;
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
  
  // Real-time synchronization tick for blood requests & disaster relief items
  const [bloodDisasterSyncTick, setBloodDisasterSyncTick] = useState(0);
  useEffect(() => {
    const handleSync = () => setBloodDisasterSyncTick((t) => t + 1);
    window.addEventListener('sahaya_blood_disaster_updated', handleSync);
    window.addEventListener('sahaya_sync_all_services', handleSync);
    return () => {
      window.removeEventListener('sahaya_blood_disaster_updated', handleSync);
      window.removeEventListener('sahaya_sync_all_services', handleSync);
    };
  }, []);

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
      const userStored = userIdentifier ? localStorage.getItem(`sahaya_saved_posts_${userIdentifier}`) : null;
      const guestStored = localStorage.getItem("sahaya_saved_posts_guest");
      const uList = userStored ? JSON.parse(userStored) : [];
      const gList = guestStored ? JSON.parse(guestStored) : [];
      return Array.from(new Set([...(Array.isArray(uList) ? uList : []), ...(Array.isArray(gList) ? gList : [])]));
    } catch {
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

  // 1. රතු එළිය (ආපදා දැනුවත් කිරීම්) දැන්වීම් හඳුනාගැනීම
  const isRedAlertDisasterPost = (post: HelpPost): boolean => {
    if (!post) return false;
    const anyPost = post as any;
    const code = String(post.postCode ? post.postCode : anyPost.alertCode ? anyPost.alertCode : '');
    if (code.startsWith('#RED-') ? true : code.startsWith('#EMG-')) return true;
    if (post.category === 'red_alert' ? true : anyPost.postType === 'red_alert' ? true : anyPost.serviceType === 'red_alert') return true;
    const text = `${post.title ? post.title : ''} ${post.whatHappened ? post.whatHappened : ''} ${post.whatIsNeeded ? post.whatIsNeeded : ''} ${post.tagName ? post.tagName : ''} ${post.tagCategory ? post.tagCategory : ''}`.toLowerCase();
    const hasBloodKeyword = text.includes('රුධිර') ? true : text.includes('ලේ') ? true : text.includes('blood') ? true : code.startsWith('#BLD-');
    if (hasBloodKeyword) return false;
    if (
      text.includes('රතු එළිය')
        ? true
        : text.includes('red alert')
        ? true
        : text.includes('ආපදා')
        ? true
        : text.includes('හදිසි අනතුර')
        ? true
        : text.includes('ජල ගැලීම්')
        ? true
        : text.includes('ගංවතුර')
        ? true
        : text.includes('නායයෑම්')
        ? true
        : text.includes('නැතිවූ දරුවා')
    ) {
      return true;
    }
    if ((post.category === 'emergency' ? true : post.tagCategory === 'හදිසි / ආපදා') && !hasBloodKeyword) {
      return true;
    }
    return false;
  };

  // 2. ලේ ඉල්ලීම් දැන්වීම් හඳුනාගැනීම
  const isBloodRequestPost = (post: HelpPost): boolean => {
    if (!post) return false;
    const anyPost = post as any;
    const code = String(post.postCode ? post.postCode : '');
    if (code.startsWith('#BLD-')) return true;
    if (post.category === 'blood_disaster' ? true : anyPost.bloodGroup ? true : anyPost.postType === 'blood_request' ? true : anyPost.serviceType === 'blood_donation') return true;
    const text = `${post.title ? post.title : ''} ${post.whatHappened ? post.whatHappened : ''} ${post.whatIsNeeded ? post.whatIsNeeded : ''} ${post.tagName ? post.tagName : ''}`.toLowerCase();
    if (
      text.includes('රුධිර')
        ? true
        : text.includes('ලේ අවශ්‍ය')
        ? true
        : text.includes('ලේ ඉල්ලී')
        ? true
        : text.includes('ලේ පරිත්‍යාග')
        ? true
        : text.includes('blood')
        ? true
        : text.includes('🩸')
    ) {
      return true;
    }
    return false;
  };

  // Helper to determine if a post is a high-priority / emergency community alert (Red Alert or Blood Request)
  const isEmergencyOrHighPriority = (post: HelpPost): boolean => {
    if (!post) return false;
    if (isRedAlertDisasterPost(post) ? true : isBloodRequestPost(post)) return true;
    if (post.isPinnedEmergency) return true;
    if (post.priorityLevel === 'emergency' ? true : post.priorityLevel === 'high') return true;
    return false;
  };

  // 4. ඉක්මන් සේවා දැන්වීම් හඳුනාගැනීම
  const isQuickService = (post: HelpPost): boolean => {
    if (!post) return false;
    const anyPost = post as any;
    if (post.category === 'quick_services' ? true : post.category === 'quick' ? true : anyPost.postType === 'quick_service' ? true : anyPost.serviceType === 'quick_services') return true;
    if (post.tagCategory === 'ඉක්මන් සේවා' ? true : post.tagName?.toLowerCase().includes('quick') ? true : post.tagName?.includes('ඉක්මන්')) return true;
    if (post.customFieldValues?.f_urgency?.toString().includes('Immediate') ? true : post.customFieldValues?.f_urgency?.toString().includes('හදිසි')) return true;
    return false;
  };

  // 5. දැන්වීමට ඇති දුර ගණනය කිරීම (ළඟම දැන්වීම් පළමුව පෙන්වීම සඳහා)
  const getSafePostDistanceKm = (post: HelpPost): number => {
    if (!post) return 999999;
    try {
      if (typeof getPostDistance === 'function') {
        const d = getPostDistance(post);
        if (typeof d === 'number' && !isNaN(d) && d >= 0) return d;
      }
    } catch (e) {}
    const anyPost = post as any;
    const pLat = typeof post.latitude === 'number' ? post.latitude : typeof post.lat === 'number' ? post.lat : typeof anyPost.locationLat === 'number' ? anyPost.locationLat : null;
    const pLng = typeof post.longitude === 'number' ? post.longitude : typeof post.lng === 'number' ? post.lng : typeof anyPost.locationLng === 'number' ? anyPost.locationLng : null;
    if (currentLocation && typeof currentLocation.lat === 'number' && typeof currentLocation.lng === 'number' && pLat !== null && pLng !== null) {
      return calculateDistanceKm(currentLocation.lat, currentLocation.lng, pLat, pLng);
    }
    if (typeof post.distanceKm === 'number' && !isNaN(post.distanceKm)) return post.distanceKm;
    if (typeof anyPost.actualDistanceKm === 'number' && !isNaN(anyPost.actualDistanceKm)) return anyPost.actualDistanceKm;
    return 999999;
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

  // සේවාවන් අනුව දැන්වීම් පුවරුවේ දැන්වීම් පෙන්විය යුතු පිළිවෙල:
  // 1. රතු එළිය (ආපදා දැනුවත් කිරීම්) දැන්වීම්
  // 2. ලේ ඉල්ලීම් දැන්වීම්
  // 3. Boost දැන්වීම්
  // 4. ඉක්මන් සේවා දැන්වීම්
  // 5. දුර අනුව දැන්වීම් (ආසන්නතම දැන්වීම් පළමුව)
  const getPostServicePriorityRank = (post: HelpPost): number => {
    if (isRedAlertDisasterPost(post)) return 1;
    if (isBloodRequestPost(post)) return 2;
    if (Boolean(post.isBoosted ? true : (post as any).boosted)) return 3;
    if (isQuickService(post)) return 4;
    return 5;
  };

  const activeRedAlerts = useMemo(() => {
    return (redAlerts ? redAlerts : []).filter((a) => Boolean(a)).map((a) => {
      const anyA = a as any;
      const baseTitle = anyA.disasterTitleSi ? anyA.disasterTitleSi : a.title ? a.title : 'හදිසි ආපදා දැන්වීම';
      const baseDesc = a.description ? a.description : '';
      const fakeCount = (Array.isArray(a.fakeReports) ? a.fakeReports.length : 0) ? (Array.isArray(a.fakeReports) ? a.fakeReports.length : 0) : a.fakeReportsCount ? a.fakeReportsCount : 0;
      const isFake = Boolean(anyA.isFlaggedFake ? true : a.status === 'fake' ? true : Math.max(fakeCount, 4) === fakeCount);
      const isRemoved = Boolean(a.status === 'cancelled' ? true : anyA.isDeleted);
      const isResolved = Boolean(a.status === 'resolved');
      const delTime = anyA.deletedAtDisplay ? anyA.deletedAtDisplay : a.cancelledAt ? a.cancelledAt : anyA.deletedAt ? anyA.deletedAt : '';
      const resTime = anyA.resolvedAtDisplay ? anyA.resolvedAtDisplay : a.resolvedAt ? a.resolvedAt : '';

      if (isRemoved) {
        return {
          ...a,
          disasterTitleSi: `🗑️ [ඉවත් කරන ලදී: ${delTime}] ${baseTitle}`,
          description: `🗑️ මෙම දැන්වීම ඉවත් කරන ලදී (දිනය සහ වේලාව: ${delTime}) • ${baseDesc}`,
        };
      }
      if (isFake) {
        return {
          ...a,
          disasterTitleSi: '⚠️ [මෙය අසත්‍ය ලෙස පළකරන ලද දැන්වීමකි] ' + baseTitle,
          description: '🚨 මෙය අසත්‍ය ලෙස පළකරන ලද දැන්වීමකි (පරිශීලකයන් ' + fakeCount + ' දෙනෙකු අසත්‍යයක් ලෙස වාර්තා කර ඇත) • ' + baseDesc,
        };
      }
      if (isResolved) {
        return {
          ...a,
          disasterTitleSi: `✅ [විසඳන ලදී: ${resTime}] ${baseTitle}`,
          description: `✅ මෙම ආපදා දැන්වීම විසඳන ලදී (${resTime}) • ${baseDesc}`,
        };
      }
      return a;
    });
  }, [redAlerts]);

  const [liveMarketItemsCount, setLiveMarketItemsCount] = useState(() => getStoredMarketItems().length);
  const [liveMarketShopsCount, setLiveMarketShopsCount] = useState(() => getStoredMarketShops().length);
  const [liveGroupsCount, setLiveGroupsCount] = useState(() => getStoredGroups().length);
  const [liveJobs, setLiveJobs] = useState<any[]>(() => filterNonDeletedJobs(getStoredJobs()));
  const [liveAccommodations, setLiveAccommodations] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('sahaya_accommodations_data_v1');
      if (cached) return filterNonDeletedAccommodations(JSON.parse(cached));
    } catch {}
    return [];
  });

  useEffect(() => {
    const refreshLocalMarket = () => {
      setLiveMarketItemsCount(getStoredMarketItems().length);
      setLiveMarketShopsCount(getStoredMarketShops().length);
    };
    const refreshLocalJobs = () => {
      setLiveJobs(filterNonDeletedJobs(getStoredJobs()));
    };
    const refreshLocalAccommodations = async () => {
      try {
        const items = await getStoredAccommodations();
        if (Array.isArray(items)) {
          setLiveAccommodations(filterNonDeletedAccommodations(items));
        }
      } catch {}
    };
    refreshLocalAccommodations();

    window.addEventListener('sahaya_marketplace_updated', refreshLocalMarket);
    window.addEventListener('sahaya_jobs_updated', refreshLocalJobs);
    window.addEventListener('sahaya_accommodations_updated', refreshLocalAccommodations);

    const unsubItems = subscribeToMarketplaceItems((remoteItems) => {
      if (Array.isArray(remoteItems) && remoteItems.length >= 1) {
        setLiveMarketItemsCount(remoteItems.length);
      } else {
        setLiveMarketItemsCount(getStoredMarketItems().length);
      }
    });
    const unsubShops = subscribeToMarketShops((remoteShops) => {
      if (Array.isArray(remoteShops) && remoteShops.length >= 1) {
        setLiveMarketShopsCount(remoteShops.length);
      } else {
        setLiveMarketShopsCount(getStoredMarketShops().length);
      }
    });
    const unsubGroups = subscribeToGroups((remoteGroups) => {
      if (Array.isArray(remoteGroups) && remoteGroups.length >= 1) {
        setLiveGroupsCount(getStoredGroups().length || remoteGroups.length);
      } else {
        setLiveGroupsCount(getStoredGroups().length);
      }
    });
    const unsubAccommodations = subscribeToAccommodationsFromFirestore((remoteAcc) => {
      if (Array.isArray(remoteAcc)) {
        setLiveAccommodations(filterNonDeletedAccommodations(remoteAcc));
      }
    });
    return () => {
      window.removeEventListener('sahaya_marketplace_updated', refreshLocalMarket);
      window.removeEventListener('sahaya_jobs_updated', refreshLocalJobs);
      window.removeEventListener('sahaya_accommodations_updated', refreshLocalAccommodations);
      unsubItems();
      unsubShops();
      unsubGroups();
      if (typeof unsubAccommodations === 'function') unsubAccommodations();
    };
  }, []);

  const newsFeedSortedPosts = useMemo(() => {
    const isAdminUser = Boolean(user && (user.role === 'admin' ? true : user.role === 'super_admin'));
    const sourceList = (filteredPosts ? filteredPosts : []).filter((p): p is HelpPost => {
      if (!p ? true : typeof p !== 'object' ? true : !p.id ? true : p.isDeleted ? true : p.status === 'deleted' ? true : isPostPermanentlyDeleted(p.id)) {
        return false;
      }
      const isHidden = Boolean(p.isHidden ? true : p.isHiddenByAdmin ? true : p.status === 'hidden');
      if (isHidden) {
        const isOwner = checkIsPostOwner(user, p);
        if (!isAdminUser && !isOwner) {
          return false;
        }
      }
      // 01. දැන්වීමට අවශ්‍ය සහයකයින් ගණන තෝරාගත් පසු හෝ සේවාව අවසන් වූ පසු දැන්වීම ප්‍රධාන පුවරුවෙන් ඉවත් කිරීම
      if (boardCategoryFilter !== 'resolved') {
        if (isPostHelpersSatisfiedOrFilled(p)) {
          return false;
        }
      }
      return true;
    });

    const existingCodes = new Set(sourceList.map((p) => String(p.postCode ? p.postCode : p.id)));
    sourceList.forEach((p) => {
      if (p?.id) existingCodes.add(String(p.id));
    });

    const isRedAlertCategoryView = Boolean(
      !boardCategoryFilter ||
      boardCategoryFilter === 'emergency' ||
      boardCategoryFilter === 'red_alert' ||
      boardCategoryFilter === 'urgent' ||
      boardCategoryFilter === 'resolved' ||
      activeFeedTab === 'emergency'
    );

    const mappedRedAlertPosts: HelpPost[] = isRedAlertCategoryView
      ? (activeRedAlerts || [])
          .filter((a: any) => {
            if (!a || !a.id) return false;
            const alertCodeStr = String(a.alertCode || a.id);
            if (existingCodes.has(alertCodeStr) || existingCodes.has(String(a.id))) return false;
            const isRemoved = Boolean(a.status === 'cancelled' || a.isDeleted || isPostPermanentlyDeleted(a.id));
            if (isRemoved) return false;
            if (boardCategoryFilter === 'resolved') {
              return a.status === 'resolved';
            }
            if (a.status === 'resolved') return false;

            // Search query filter if active
            if (searchQuery && searchQuery.trim()) {
              const q = searchQuery.trim().toLowerCase();
              const hay = `${a.disasterTitleSi || ''} ${a.title || ''} ${a.description || ''} ${a.locationName || ''} ${a.alertCode || ''}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }

            // Distance filter on general 'all' feed when local (<15km) tab is active (under explicit 'emergency' category, show all active Red Alerts)
            const isExplicitEmergencyFilter = Boolean(
              boardCategoryFilter === 'emergency' ||
              boardCategoryFilter === 'red_alert' ||
              boardCategoryFilter === 'urgent' ||
              activeFeedTab === 'emergency'
            );
            if (!isExplicitEmergencyFilter && feedDistanceTab === 'local' && currentLocation && typeof a.latitude === 'number' && typeof a.longitude === 'number') {
              const myUid = String(user?.userId || user?.id || user?.nic || '');
              const isMyAlert = Boolean(myUid && a.reportedByUserId && String(a.reportedByUserId) === myUid);
              if (!isMyAlert) {
                const dist = calculateDistanceKm(currentLocation.lat, currentLocation.lng, a.latitude, a.longitude);
                if (dist > (maxDistanceRadius || 15)) return false;
              }
            }
            return true;
          })
          .map((a: any) => {
            const dConfig: any = getDisasterConfig(a.disasterType);
            const alertCode = a.alertCode ? String(a.alertCode) : `#RED-${String(a.id).slice(-4)}`;
            const baseTitle = a.disasterTitleSi || a.title || dConfig?.titleSi || dConfig?.labelSi || 'හදිසි ආපදා දැන්වීම';
            const rTitle =
              baseTitle.startsWith('🚨') || baseTitle.startsWith('⚠️') || baseTitle.startsWith('✅') || baseTitle.startsWith('🗑️')
                ? baseTitle
                : `🚨 රතු එළිය: ${baseTitle}`;
            const confScore =
              typeof a.score === 'number'
                ? a.score
                : typeof a.confidenceScore === 'number'
                ? a.confidenceScore
                : (Array.isArray(a.confirmations) ? a.confirmations.length : a.confirmationsCount || 0) -
                  (Array.isArray(a.fakeReports) ? a.fakeReports.length : a.fakeReportsCount || 0);
            const confStatusText =
              confScore >= 10
                ? '✅ ප්‍රජාව තහවුරු කළ සත්‍ය ආපදාවකි'
                : confScore >= 4
                ? '🟢 බොහෝ දුරට සත්‍ය විය හැක'
                : confScore <= -10
                ? '❌ අසත්‍ය බවට තහවුරු විය'
                : confScore <= -4
                ? '🟠 අසත්‍ය විය හැක'
                : '🟡 සැක සහිත (තහවුරු වෙමින් පවතී)';
            const rDetails = `${a.description || 'ආරක්ෂිත ස්ථානයක රැඳී සිටින්න. වැඩිදුර තොරතුරු බලාපොරොත්තු වන්න.'}\n📍 ස්ථානය: ${a.locationName || 'ශ්‍රී ලංකාව'} • 📊 ප්‍රජා විශ්වාස මිනුම: ${confStatusText} (ලකුණු: ${confScore > 0 ? `+${confScore}` : confScore}/±10)`;
            const showRep = a.showReporterInfo !== false;
            const reporterName = showRep
              ? a.reportedByName || a.contactName || 'රතු එළිය වාර්තාකරු'
              : 'නිර්නාමික වාර්තාකරු (රතු එළිය)';
            const reporterPhone = showRep ? a.reportedByPhone || a.contactPhone || '' : '';
            const imgUrl =
              a.photoEvidenceUrl ||
              a.imageUrl ||
              a.photoUrl ||
              (Array.isArray(a.mediaUrls) && a.mediaUrls.length > 0 ? a.mediaUrls[0] : undefined);

            return {
              id: a.id,
              postCode: alertCode,
              category: 'red_alert',
              serviceType: 'red_alert',
              postType: 'red_alert',
              disasterType: a.disasterType,
              tagCategory: 'හදිසි / ආපදා',
              tagName: `🚨 රතු එළිය • ${dConfig?.titleSi || dConfig?.labelSi || 'හදිසි ආපදා'}`,
              headline: rTitle,
              title: rTitle,
              whatHappened: rDetails,
              whatIsNeeded: `📊 ප්‍රජා විශ්වාස මිනුම: ${confStatusText} • සම්පූර්ණ රතු එළිය විස්තරය, සයිරන් පාලනය සහ සත්‍ය/අසත්‍ය ලකුණු ලබාදීමට මෙම දැන්වීම මත ක්ලික් කරන්න.`,
              content: rDetails,
              locationName: a.locationName || 'ශ්‍රී ලංකාව',
              lat: typeof a.latitude === 'number' ? a.latitude : currentLocation?.lat || 6.9271,
              lng: typeof a.longitude === 'number' ? a.longitude : currentLocation?.lng || 79.8612,
              latitude: typeof a.latitude === 'number' ? a.latitude : currentLocation?.lat || 6.9271,
              longitude: typeof a.longitude === 'number' ? a.longitude : currentLocation?.lng || 79.8612,
              imageUrl: imgUrl,
              photoUrl: imgUrl,
              priorityLevel: 'emergency',
              isPinnedEmergency: true,
              userId: a.reportedByUserId || 'red_alert_reporter',
              actualAuthorId: a.reportedByUserId || 'red_alert_reporter',
              actualAuthorName: a.reportedByName || reporterName,
              userName: reporterName,
              isAnonymous: !showRep,
              userPhone: reporterPhone,
              contactNumber: reporterPhone,
              contactPersonName: reporterName,
              status: a.status === 'resolved' ? 'resolved' : 'active',
              createdAt: a.createdAt || new Date().toISOString(),
              createdAtMs: a.createdAtMs || (a.createdAt ? new Date(a.createdAt).getTime() : Date.now()),
              rawRedAlert: a,
            } as unknown as HelpPost;
          })
      : [];

    const storedBloodPosts: HelpPost[] = (!boardCategoryFilter ? true : boardCategoryFilter === 'emergency' ? true : boardCategoryFilter === 'blood_disaster')
      ? (getStoredBloodRequests() ? getStoredBloodRequests() : [])
          .filter((b: any) => Boolean(b && b.id && !existingCodes.has(String(b.postCode ? b.postCode : b.id))))
          .map((b: any) => {
            const bTitle = `🩸 ${b.bloodGroup} රුධිරය හදිසියේ අවශ්‍යයි: ${b.hospitalName} (${b.district})`;
            const bDetails = `රෝගී නම: ${b.patientName} • ලේ වර්ගය: ${b.bloodGroup} • අවශ්‍ය ඒකක: ${b.unitsNeeded} • රෝහල: ${b.hospitalName} • දිස්ත්‍රික්කය: ${b.district} • අවශ්‍ය දිනය: ${b.neededDate ? b.neededDate : 'කඩිනමින්'} • සම්බන්ධීකාරක: ${b.contactName ? b.contactName : 'සම්බන්ධීකාරක'} (${b.contactPhone})${b.additionalNotes ? ` • සටහන්: ${b.additionalNotes}` : ''}`;
            return {
              id: b.id,
              postCode: b.postCode ? b.postCode : '#BLD-100',
              category: 'blood_disaster',
              serviceType: 'blood_donation',
              postType: 'blood_request',
              bloodGroup: b.bloodGroup,
              tagCategory: 'හදිසි / ආපදා',
              tagName: `🩸 හදිසි ${b.bloodGroup} ලේ අවශ්‍යතාවය`,
              headline: bTitle,
              title: bTitle,
              whatHappened: bTitle,
              whatIsNeeded: bDetails,
              content: bDetails,
              locationName: `${b.hospitalName}, ${b.district}`,
              district: b.district,
              lat: currentLocation?.lat ? currentLocation.lat : 7.171,
              lng: currentLocation?.lng ? currentLocation.lng : 79.8986,
              latitude: currentLocation?.lat ? currentLocation.lat : 7.171,
              longitude: currentLocation?.lng ? currentLocation.lng : 79.8986,
              priorityLevel: 'emergency',
              isPinnedEmergency: true,
              userId: b.userId ? b.userId : 'blood_requester',
              userName: b.contactName ? b.contactName : 'සම්බන්ධීකාරක',
              userPhone: b.contactPhone ? b.contactPhone : '',
              contactNumber: b.contactPhone ? b.contactPhone : '',
              contactPersonName: b.contactName ? b.contactName : 'සම්බන්ධීකාරක',
              status: 'active',
              createdAt: b.createdAt ? b.createdAt : new Date().toISOString(),
              createdAtMs: b.createdAtMs ? b.createdAtMs : Date.now(),
            } as unknown as HelpPost;
          })
      : [];

    const storedDisasterPosts: HelpPost[] = (!boardCategoryFilter ? true : boardCategoryFilter === 'emergency' ? true : boardCategoryFilter === 'blood_disaster' ? true : boardCategoryFilter === 'aid_ledger')
      ? (getStoredDisasterReliefItems() ? getStoredDisasterReliefItems() : [])
          .filter((d: any) => Boolean(d && d.id && !existingCodes.has(String(d.id))))
          .map((d: any) => {
            const dTitle = `📦 ${d.title || 'හදිසි ආපදා සහනාධාර අවශ්‍යතාවය'}: ${d.locationName || d.district}`;
            const dDetails = `ස්ථානය: ${d.locationName || d.district} • දිස්ත්‍රික්කය: ${d.district} • අවශ්‍ය ප්‍රමාණය: ${d.targetQuantity || 'අවශ්‍ය පරිදි'} • විස්තර: ${d.description || ''} • සම්බන්ධීකාරක: ${d.contactPerson || 'සම්බන්ධීකාරක'} (${d.contactPhone || ''})`;
            return {
              id: d.id,
              postCode: `#EMG-${String(d.id).slice(-4)}`,
              category: 'emergency',
              serviceType: 'disaster_relief',
              postType: 'disaster_relief',
              tagCategory: 'හදිසි / ආපදා',
              tagName: `📦 හදිසි ආපදා සහන: ${d.type || 'අත්‍යවශ්‍ය'}`,
              headline: dTitle,
              title: dTitle,
              whatHappened: dTitle,
              whatIsNeeded: dDetails,
              content: dDetails,
              locationName: `${d.locationName || d.district}, ${d.district}`,
              district: d.district,
              lat: currentLocation?.lat ? currentLocation.lat : 7.171,
              lng: currentLocation?.lng ? currentLocation.lng : 79.8986,
              latitude: currentLocation?.lat ? currentLocation.lat : 7.171,
              longitude: currentLocation?.lng ? currentLocation.lng : 79.8986,
              priorityLevel: 'emergency',
              isPinnedEmergency: true,
              userId: d.userId ? d.userId : 'disaster_requester',
              userName: d.contactPerson ? d.contactPerson : 'සම්බන්ධීකාරක',
              userPhone: d.contactPhone ? d.contactPhone : '',
              contactNumber: d.contactPhone ? d.contactPhone : '',
              contactPersonName: d.contactPerson ? d.contactPerson : 'සම්බන්ධීකාරක',
              status: 'active',
              createdAt: d.createdAt ? d.createdAt : new Date().toISOString(),
              createdAtMs: d.createdAtMs ? d.createdAtMs : Date.now(),
            } as unknown as HelpPost;
          })
      : [];

    const mappedJobPosts: HelpPost[] = !boardCategoryFilter
      ? (Array.isArray(liveJobs) ? liveJobs : [])
          .filter((j: any) => {
            if (!j || !j.id) return false;
            if (existingCodes.has(String(j.id)) || existingCodes.has(String(j.jobCode || ''))) return false;
            if (searchQuery && searchQuery.trim()) {
              const q = searchQuery.trim().toLowerCase();
              const hay = `${j.title || ''} ${j.companyName || ''} ${j.description || ''} ${j.city || ''} ${j.country || ''}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            if (feedDistanceTab === 'local' && j.scope === 'local' && currentLocation && typeof j.lat === 'number' && typeof j.lng === 'number') {
              const dist = calculateDistanceKm(currentLocation.lat, currentLocation.lng, j.lat, j.lng);
              if (dist > (maxDistanceRadius || 15)) return false;
            }
            return true;
          })
          .map((j: any) => {
            const jTitle = `💼 රැකියා අවස්ථාව: ${j.title || 'රැකියා ඇබෑර්තු'} (${j.companyName || j.city || 'ශ්‍රී ලංකාව'})`;
            const jSalary = j.salaryDisplay || (j.salaryAmount ? `රු. ${Number(j.salaryAmount).toLocaleString()}` : 'සාකච්ඡා කරගත හැක');
            const jDetails = `ආයතනය: ${j.companyName || '-'} • ස්ථානය: ${j.city || j.country || 'ශ්‍රී ලංකාව'} • වැටුප: ${jSalary} • ${j.description || ''}`;
            return {
              id: j.id,
              postCode: j.jobCode || `#JOB-${String(j.id).slice(-4)}`,
              category: 'jobs',
              serviceType: 'jobs',
              postType: 'job_listing',
              tagCategory: 'රැකියා',
              tagName: '💼 රැකියා',
              headline: jTitle,
              title: jTitle,
              whatHappened: jDetails,
              whatIsNeeded: `වැටුප: ${jSalary} • සම්පූර්ණ රැකියා විස්තරය බැලීමට ක්ලික් කරන්න.`,
              content: jDetails,
              locationName: j.city || j.country || 'ශ්‍රී ලංකාව',
              lat: typeof j.lat === 'number' ? j.lat : currentLocation?.lat || 6.9271,
              lng: typeof j.lng === 'number' ? j.lng : currentLocation?.lng || 79.8612,
              latitude: typeof j.lat === 'number' ? j.lat : currentLocation?.lat || 6.9271,
              longitude: typeof j.lng === 'number' ? j.lng : currentLocation?.lng || 79.8612,
              imageUrl: j.imageUrl || (Array.isArray(j.photos) && j.photos[0]) || undefined,
              photoUrl: j.imageUrl || (Array.isArray(j.photos) && j.photos[0]) || undefined,
              userId: j.postedByUserId || j.userId || 'job_poster',
              userName: j.contactName || j.companyName || 'රැකියා දැන්වීම්කරු',
              userPhone: j.contactPhone || j.phone || '',
              contactNumber: j.contactPhone || j.phone || '',
              contactPersonName: j.contactName || j.companyName || 'රැකියා දැන්වීම්කරු',
              status: 'active',
              createdAt: j.createdAt || new Date().toISOString(),
              createdAtMs: j.createdAtMs || Date.now(),
              rawJobListing: j,
            } as unknown as HelpPost;
          })
      : [];

    const mappedAccommodationPosts: HelpPost[] = !boardCategoryFilter
      ? (Array.isArray(liveAccommodations) ? liveAccommodations : [])
          .filter((acc: any) => {
            if (!acc || !acc.id) return false;
            if (existingCodes.has(String(acc.id))) return false;
            if (searchQuery && searchQuery.trim()) {
              const q = searchQuery.trim().toLowerCase();
              const hay = `${acc.title || ''} ${acc.description || ''} ${acc.city || ''} ${acc.address || ''}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            if (feedDistanceTab === 'local' && currentLocation && typeof acc.lat === 'number' && typeof acc.lng === 'number') {
              const dist = calculateDistanceKm(currentLocation.lat, currentLocation.lng, acc.lat, acc.lng);
              if (dist > (maxDistanceRadius || 15)) return false;
            }
            return true;
          })
          .map((acc: any) => {
            const accTitle = `🏠 නවාතැන් පහසුකම්: ${acc.title || 'නවාතැනක්'} (${acc.city || 'ශ්‍රී ලංකාව'})`;
            const accRent = acc.monthlyRent ? `මසකට රු. ${Number(acc.monthlyRent).toLocaleString()}` : acc.priceDisplay || 'සාකච්ඡා කරගත හැක';
            const accDetails = `ස්ථානය: ${acc.city || acc.address || 'ශ්‍රී ලංකාව'} • ගාස්තුව: ${accRent} • ${acc.description || ''}`;
            const accImg = acc.imageUrl || (Array.isArray(acc.images) && acc.images[0]) || (Array.isArray(acc.photos) && acc.photos[0]) || undefined;
            return {
              id: acc.id,
              postCode: `#ACC-${String(acc.id).slice(-4)}`,
              category: 'accommodation',
              serviceType: 'accommodation',
              postType: 'accommodation_listing',
              tagCategory: 'නවාතැන',
              tagName: '🏠 නවාතැන',
              headline: accTitle,
              title: accTitle,
              whatHappened: accDetails,
              whatIsNeeded: `ගාස්තුව: ${accRent} • සම්පූර්ණ නවාතැන් විස්තරය බැලීමට ක්ලික් කරන්න.`,
              content: accDetails,
              locationName: acc.city || acc.address || 'ශ්‍රී ලංකාව',
              lat: typeof acc.lat === 'number' ? acc.lat : currentLocation?.lat || 6.9271,
              lng: typeof acc.lng === 'number' ? acc.lng : currentLocation?.lng || 79.8612,
              latitude: typeof acc.lat === 'number' ? acc.lat : currentLocation?.lat || 6.9271,
              longitude: typeof acc.lng === 'number' ? acc.lng : currentLocation?.lng || 79.8612,
              imageUrl: accImg,
              photoUrl: accImg,
              userId: acc.ownerId || acc.userId || 'acc_poster',
              userName: acc.ownerName || acc.contactName || 'නවාතැන් හිමිකරු',
              userPhone: acc.contactPhone || acc.phone || '',
              contactNumber: acc.contactPhone || acc.phone || '',
              contactPersonName: acc.ownerName || acc.contactName || 'නවාතැන් හිමිකරු',
              status: 'active',
              createdAt: acc.createdAt || new Date().toISOString(),
              createdAtMs: acc.createdAtMs || Date.now(),
              rawAccommodationListing: acc,
            } as unknown as HelpPost;
          })
      : [];

    let result = [...mappedRedAlertPosts, ...sourceList, ...storedBloodPosts, ...storedDisasterPosts, ...mappedJobPosts, ...mappedAccommodationPosts];

    // Apply active feed tab filter
    if (activeFeedTab === 'emergency') {
      result = result.filter((p) => isEmergencyOrHighPriority(p));
    } else if (activeFeedTab === 'quick_services') {
      result = result.filter((p) => isQuickService(p));
    } else if (activeFeedTab === 'saved' || boardCategoryFilter === 'saved') {
      // 📌 සුරැකි / ගබඩාකල දැන්වීම්: සියලුම සුරැකි දැන්වීම් සම්පූර්ණයෙන්ම ආරක්ෂිතව පෙන්වීම
      const savedSet = new Set(savedPostIds);
      result = [...mappedRedAlertPosts, ...(helpPosts || []), ...mappedJobPosts, ...mappedAccommodationPosts].filter(
        (p) => p && p.id && savedSet.has(p.id) && !isPostPermanentlyDeleted(p.id) && !p.isDeleted && p.status !== 'deleted'
      );
    }

    // Sort strictly by:
    // 1. රතු එළිය (ආපදා දැනුවත් කිරීම්) දැන්වීම්
    // 2. ලේ ඉල්ලීම් දැන්වීම්
    // 3. Boost දැන්වීම්
    // 4. ඉක්මන් සේවා දැන්වීම්
    // 5. දුර අනුව දැන්වීම් (ළඟම දැන්වීම් පළමුව)
    return result.sort((a, b) => {
      if (!a ? true : !b) return 0;
      const rankA = getPostServicePriorityRank(a);
      const rankB = getPostServicePriorityRank(b);
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // 5. දුර අනුව දැන්වීම් (එකම කාණ්ඩය තුළ හෝ සාමාන්‍ය දැන්වීම් අතර ආසන්නතම දැන්වීම පළමුව)
      const distA = getSafePostDistanceKm(a);
      const distB = getSafePostDistanceKm(b);
      if (Math.abs(distA - distB) > 0.05) {
        return distA - distB;
      }

      // දුර සමාන නම් නවතම දැන්වීම පළමුව
      const timeA = getPostTimestamp(a);
      const timeB = getPostTimestamp(b);
      return timeB - timeA;
    });
  }, [filteredPosts, activeRedAlerts, liveJobs, liveAccommodations, activeFeedTab, savedPostIds, currentLocation, boardCategoryFilter, bloodDisasterSyncTick, searchQuery, feedDistanceTab, maxDistanceRadius, user, helpPosts]);
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
    const isAdminUser = Boolean(user && (user.role === 'admin' ? true : user.role === 'super_admin'));
    const posts = (Array.isArray(helpPosts) ? helpPosts : []).filter((p: any) => {
      if (!p ? true : !p.id ? true : p.isDeleted ? true : p.status === 'deleted' ? true : isPostPermanentlyDeleted(p.id)) return false;
      const isOwner = checkIsPostOwner(user, p);
      if ((p.isHidden ? true : p.isHiddenByAdmin ? true : p.status === 'hidden') && !isAdminUser && !isOwner) return false;
      if ((p.visibilityMode === 'private' ? true : p.isPrivate) && !isAdminUser && !isOwner) return false;
      if (p.visibilityMode === 'schedule' && p.scheduledPublishAt && Date.parse(p.scheduledPublishAt) > Date.now() && !isAdminUser && !isOwner) return false;
      return true;
    });
    const existingIds = new Set(posts.map((p: any) => String(p.postCode ? p.postCode : p.id)));
    posts.forEach((p: any) => {
      if (p?.id) existingIds.add(String(p.id));
    });
    const validRedAlertsCount = (Array.isArray(redAlerts) ? redAlerts : []).filter((a: any) => {
      if (!a || !a.id) return false;
      if (a.status === 'cancelled' || a.status === 'resolved' || a.isDeleted || isPostPermanentlyDeleted(a.id)) return false;
      if (existingIds.has(String(a.alertCode || a.id)) || existingIds.has(String(a.id))) return false;
      return true;
    }).length;
    const extraBloodCount = (getStoredBloodRequests() || []).filter((b: any) => b && b.id && !existingIds.has(String(b.postCode || b.id))).length;
    const extraDisasterCount = (getStoredDisasterReliefItems() || []).filter((d: any) => d && d.id && !existingIds.has(String(d.id))).length;
    const extraJobsCount = (Array.isArray(liveJobs) ? liveJobs : []).filter((j: any) => j && j.id && !existingIds.has(String(j.id))).length;
    const extraAccCount = (Array.isArray(liveAccommodations) ? liveAccommodations : []).filter((acc: any) => acc && acc.id && !existingIds.has(String(acc.id))).length;
    const extraProServicesCount = (Array.isArray(professionalServices) ? professionalServices : []).filter((s: any) => s && s.id && !existingIds.has(String(s.id))).length;
    const proPostsCount = posts.filter((p) => Boolean(p && (p.category === 'professional_services' ? true : p.serviceType === 'professional_services'))).length;
    const grpPostsCount = posts.filter((p) => Boolean(p && (p.category === 'group_work' ? true : p.serviceType === 'group_work'))).length;
    const mktPostsCount = posts.filter((p) => Boolean(p && (p.category === 'marketplace' ? true : p.serviceType === 'marketplace'))).length;
    return {
      all: posts.length + validRedAlertsCount + extraBloodCount + extraDisasterCount + extraJobsCount + extraAccCount,
      emergency: posts.filter((p) => isEmergencyOrHighPriority(p)).length + validRedAlertsCount + extraBloodCount + extraDisasterCount,
      quick_services: posts.filter((p) => isQuickService(p)).length,
      normal_services: posts.filter((p) => {
        if (!p) return false;
        if (isQuickService(p)) return false;
        if (isEmergencyOrHighPriority(p)) return false;
        const isOtherSpecial = Boolean(
          p.category === 'find_for_me'
            ? true
            : p.category === 'from_me_to_you'
            ? true
            : p.category === 'professional_services'
            ? true
            : p.category === 'group_work'
            ? true
            : p.category === 'marketplace'
            ? true
            : p.category === 'emergency'
            ? true
            : p.category === 'blood_disaster'
            ? true
            : p.category === 'red_alert'
            ? true
            : p.findForMeType
            ? true
            : p.fromMeToYouType
        );
        if (isOtherSpecial) return false;
        return true;
      }).length,
      professional_services: proPostsCount + extraProServicesCount,
      group_work: grpPostsCount + liveGroupsCount,
      marketplace: mktPostsCount + liveMarketItemsCount + liveMarketShopsCount,
      find_for_me: posts.filter((p) => Boolean(p && (p.category === 'find_for_me' ? true : p.serviceType === 'find_for_me'))).length,
      from_me_to_you: posts.filter((p) => Boolean(p && (p.category === 'from_me_to_you' ? true : p.serviceType === 'from_me_to_you'))).length,
      saved: savedPostIds.length,
    };
  }, [helpPosts, redAlerts, bloodDisasterSyncTick, savedPostIds, liveMarketItemsCount, liveMarketShopsCount, liveGroupsCount, liveJobs, liveAccommodations, professionalServices, user]);
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

  const liveTopBannerAlerts = useMemo(() => {
    return (redAlerts || []).filter((a) => {
      if (!a) return false;
      const anyA = a as any;
      const fakeCount = (Array.isArray(a.fakeReports) ? a.fakeReports.length : 0) || a.fakeReportsCount || 0;
      const isFake = Boolean(anyA.isFlaggedFake || a.status === 'fake' || Math.max(fakeCount, 4) === fakeCount);
      const isRemoved = Boolean(a.status === 'cancelled' || anyA.isDeleted || a.cancelledAt || anyA.deletedAt);
      const isResolved = Boolean(a.status === 'resolved' || a.resolvedAt);
      return a.status === 'active' && !isRemoved && !isResolved && !isFake;
    });
  }, [redAlerts]);

  const currentRedAlert = liveTopBannerAlerts.length !== 0
    ? liveTopBannerAlerts[activeAlertIndex % liveTopBannerAlerts.length]
    : null;

  const getAlertDistanceDisplay = useCallback((alert: RedAlertItem) => {

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

  if (boardCategoryFilter === 'jobs') {
    return React.createElement(JobsView, {
      userLat: currentLocation?.lat,
      userLng: currentLocation?.lng,
      userCityName: currentLocation?.nameSi,
      onBackToBoard: () => {
        setBoardCategoryFilter('');
        if (setSelectedCategoryTitle) setSelectedCategoryTitle('');
      },
      language: language,
    });
  }

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
              setBoardCategoryFilter('emergency');
              setSelectedCategoryTitle(getLangText('🚨 හදිසි / ආපදා (රතු එළිය)', '🚨 Emergency Alerts', '🚨 அவசர அறிவிப்புகள்'));
              setActiveFeedTab('emergency');
            }}
            className={`p-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between gap-2 border-2 shadow-2xs ${
              activeFeedTab === 'emergency' || boardCategoryFilter === 'emergency'
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
              setBoardCategoryFilter('saved');
              setSelectedCategoryTitle(getLangText('සුරැකි දැන්වීම්', 'Saved Posts', 'சேமித்தவை'));
            }}
            className={`p-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between gap-2 border-2 shadow-2xs ${
              activeFeedTab === 'saved' || boardCategoryFilter === 'saved'
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
            {boardCategoryFilter !== 'saved' &&
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    if (boardCategoryFilter === 'emergency' || activeFeedTab === 'emergency') {
                      if (onOpenRedAlert) onOpenRedAlert();
                      else onOpenCreateModal('emergency');
                    } else {
                      onOpenCreateModal(boardCategoryFilter);
                    }
                  },
                  className:
                    'px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all cursor-pointer active:scale-95',
                },
                boardCategoryFilter === 'emergency'
                  ? getLangText('+ 🚨 රතු එළිය දැන්වීමක් පළ කරන්න', '+ 🚨 Post Red Alert', '+ 🚨 சிவப்பு எச்சரிக்கை')
                  : getLangText('+ දැන්වීමක් පළ කරන්න', '+ Post Ad', '+ விளம்பரம் இடுக')
              )}
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
      {!boardCategoryFilter || (boardCategoryFilter !== 'professional_services' && boardCategoryFilter !== 'group_work' && boardCategoryFilter !== 'marketplace' && boardCategoryFilter !== 'accommodation') ? (
        <TagSearchBar
          allTags={allTags}
          selectedTagFilter={selectedTagFilter}
          onSelectTagFilter={(tag) => setSelectedTagFilter(tag)}
          searchQuery={searchQuery}
          onSearchQueryChange={(query) => setSearchQuery(query)}
          totalPostsCount={helpPosts.length}
          filteredPostsCount={newsFeedSortedPosts.length}
          posts={helpPosts}
          shops={getStoredMarketShops()}
          professionals={professionalServices}
          users={registeredUsers}
          onSelectEntityMatch={(match: any) => {
            if (!match) return;
            if (match.entityType === 'post' && match.rawEntity) {
              onViewPost(match.rawEntity);
            } else if (match.entityType === 'shop' ? true : match.entityType === 'business') {
              setBoardCategoryFilter('marketplace');
              setSelectedCategoryTitle(getLangText('වෙළඳපොල', 'Marketplace', 'සන්‍දයි'));
            } else if (match.entityType === 'professional') {
              setBoardCategoryFilter('professional_services');
              setSelectedCategoryTitle(getLangText('වෘත්තීය සේවා', 'Professional Services', 'තො me ්‍යිල්මු \u0bb1ෛ'));
            } else {
              setSearchQuery(match.atTag ? match.atTag : '');
            }
          }}
          language={language}
          onOpenAccommodation={() => {
            setBoardCategoryFilter('accommodation');
            setSelectedCategoryTitle(getLangText('නවාතැන', 'Accommodation', 'தங்குமிடம்'));
          }}
          onOpenJobs={() => {
            setBoardCategoryFilter('jobs');
            setSelectedCategoryTitle(getLangText('රැකියා', 'Jobs', 'வேலைகள்'));
          }}
        />
      ) : null}

      {/* 📢 Live Proximity Alert / Service Notice Banner (Placed directly below #නවාතැන & #රැකියා buttons) */}
      {!boardCategoryFilter && (
        <ProximityAlertBanner
          posts={helpPosts}
          userLocation={currentLocation}
          onViewPost={(post) => {
            if (user?.isDemo) {
              if (onRequireRegistration) onRequireRegistration();
              return;
            }
            onViewPost(post);
          }}
          className="my-3 rounded-2xl shadow-md border-2"
        />
      )}

      {/* Accommodation View (if active) */}
      {boardCategoryFilter === 'accommodation' ? (
        <AccommodationView
          userLat={currentLocation?.lat}
          userLng={currentLocation?.lng}
          userCityName={currentLocation?.nameSi}
          onBackToBoard={() => {
            setBoardCategoryFilter('');
            setSelectedCategoryTitle('');
          }}
        />
      ) : boardCategoryFilter === 'professional_services' ? (
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
                    onClick={() => {
                      if (activeFeedTab === 'emergency' || boardCategoryFilter === 'emergency') {
                        if (onOpenRedAlert) onOpenRedAlert();
                        else onOpenCreateModal('emergency');
                      } else {
                        onOpenCreateModal(boardCategoryFilter || undefined);
                      }
                    }}
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
              <div id="notices-board-section" className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold scroll-mt-6">
                <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Megaphone className="w-4 h-4 text-emerald-600" />
                  {getLangText('දැන්වීම් ලැයිස්තුව (Notices Feed)', 'Posts & Notices Feed', 'இடுகைகள் பட்டியல்')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                    <Zap className="w-3 h-3 text-emerald-600" />
                    {getLangText('Lazy Loading සක්‍රීයයි', 'Lazy Loading Active', 'Lazy Loading செயலில்')}
                  </span>
                  <span className="bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                    {Math.min(visibleCount, newsFeedSortedPosts.length)} / {newsFeedSortedPosts.length} {getLangText('පෙන්වයි', 'shown', 'காட்டப்படுகிறது')}
                  </span>
                </div>
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
                      onOfferSupport={(p) => {
                        if ((p as any)?.rawRedAlert && onViewRedAlertDetail) {
                          onViewRedAlertDetail((p as any).rawRedAlert);
                          return;
                        }
                        if ((p as any)?.rawJobListing) {
                          setBoardCategoryFilter('jobs');
                          setSelectedCategoryTitle(getLangText('රැකියා', 'Jobs', 'வேலைகள்'));
                          return;
                        }
                        if ((p as any)?.rawAccommodationListing) {
                          setBoardCategoryFilter('accommodation');
                          setSelectedCategoryTitle(getLangText('නවාතැන', 'Accommodation', 'தங்குமிடம்'));
                          return;
                        }
                        onOfferSupport(p);
                      }}
                      onEditPost={(p) => onEditPost(p)}
                      onToggleHidePost={(p) => onToggleHidePost ? onToggleHidePost(p) : undefined}
                      onViewPost={(p) => {
                        if ((p as any)?.rawRedAlert && onViewRedAlertDetail) {
                          onViewRedAlertDetail((p as any).rawRedAlert);
                          return;
                        }
                        if ((p as any)?.rawJobListing) {
                          setBoardCategoryFilter('jobs');
                          setSelectedCategoryTitle(getLangText('රැකියා', 'Jobs', 'வேலைகள்'));
                          return;
                        }
                        if ((p as any)?.rawAccommodationListing) {
                          setBoardCategoryFilter('accommodation');
                          setSelectedCategoryTitle(getLangText('නවාතැන', 'Accommodation', 'தங்குமிடம்'));
                          return;
                        }
                        onViewPost(p);
                      }}
                      onDeletePost={(p) => onDeletePost(p)}
                      onOpenChat={(p) => {
                        if ((p as any)?.rawRedAlert && onViewRedAlertDetail) {
                          onViewRedAlertDetail((p as any).rawRedAlert);
                          return;
                        }
                        onOpenChat(p);
                      }}
                      onOpenConfirm={(p) => {
                        if ((p as any)?.rawRedAlert && onViewRedAlertDetail) {
                          onViewRedAlertDetail((p as any).rawRedAlert);
                          return;
                        }
                        return onOpenConfirm ? onOpenConfirm(p) : onOfferSupport(p);
                      }}
                      onOpenSupportOffers={(p) => {
                        if ((p as any)?.rawRedAlert && onViewRedAlertDetail) {
                          onViewRedAlertDetail((p as any).rawRedAlert);
                          return;
                        }
                        onOpenSupportOffers(p);
                      }}
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


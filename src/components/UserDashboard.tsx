import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User, Language, LocationOption, HelpPost, PostReply, Theme, CategoryItem, TagItem, ProfessionalService, ServiceReview, RedAlertItem, Issue } from '../types';
import { translations } from '../data/translations';
import { initialLocations, initialUsers, initialHelpPosts } from '../data/initialData';
import { getStoredProfessionalServices, saveProfessionalServicesToStorage } from '../data/professionalServicesData';
import { UnifiedDashboardHeader } from './UnifiedDashboardHeader';
import { GlowingNeedHelpBtn } from './GlowingNeedHelpBtn';
import { PostCard } from './PostCard';
import { HelpPostModal } from './HelpPostModal';
import { OfferSupportModal } from './OfferSupportModal';
import { LeaderboardModal } from './LeaderboardModal';
import { QuickServiceModal } from './QuickServiceModal';
import { FindForMeModal } from './FindForMeModal';
import { FromMeToYouModal } from './FromMeToYouModal';
import { QuickServiceDetailModal } from './QuickServiceDetailModal';
import { QuickServiceChatModal } from './QuickServiceChatModal';
import { QuickServiceConfirmWorkflow } from './QuickServiceConfirmWorkflow';
import { AiVoiceHelpModal } from './AiVoiceHelpModal';
import { CategorySelectionModal } from './CategorySelectionModal';
import { CategoryGrid } from './CategoryGrid';
import { TagSearchBar } from './TagSearchBar';
import { getExpandedSearchKeywords } from '../data/searchDictionary';
import { EditHelpPostModal } from './EditHelpPostModal';
import { ViewHelpPostModal } from './ViewHelpPostModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { MessageInboxBubble } from './MessageInboxBubble';
import { MessageInboxModal } from './MessageInboxModal';
import { SupportOffersModal } from './SupportOffersModal';
import { VolunteerSupportModal } from './VolunteerSupportModal';
import { ResolutionPromptModal } from './ResolutionPromptModal';
import { HelpRequestsPage } from './HelpRequestsPage';
import { UserSettingsModal } from './UserSettingsModal';
import { BloodAndDisasterModal } from './BloodAndDisasterModal';
import { TransparentAidLedgerModal } from './TransparentAidLedgerModal';
import { EmergencyDirectoryModal } from './EmergencyDirectoryModal';
import { DemoRegistrationPromptModal } from './DemoRegistrationPromptModal';
import { ProximityAlertBanner } from './ProximityAlertBanner';
import { RedAlertBanner } from './RedAlertBanner';
import { TrustBadge } from './TrustBadge';
import { calculateTrustProfile } from '../utils/trustScore';
import { getStoredTags } from '../utils/tagUtils';
import { filterNonDeletedPosts, addDeletedPostId, isPostPermanentlyDeleted, addDeletedProServiceId, downloadPostBackupJson } from '../utils/deletedPostsManager';
import { deleteProfessionalServiceFromFirestore } from '../lib/firebase';
import { isAuthorBlocked } from '../utils/blockedCredentialsManager';
import { deduplicateUsers } from '../utils/userUtils';
import { checkIsPostOwner } from '../utils/postOwnerHelper';
import { InsufficientCreditsModal } from './InsufficientCreditsModal';
import { UserWalletModal } from './UserWalletModal';
import { BarterExchangeModal } from './BarterExchangeModal';
import { UserQrPayModal } from './UserQrPayModal';
import { AdminModerationModal } from './AdminModerationModal';
import { PosterIssueResponseModal } from './PosterIssueResponseModal';
import { NotificationCenterModal } from './NotificationCenterModal';
import { PickMeAlertSettingsModal } from './PickMeAlertSettingsModal';
import { MarketplaceLowestPricesModal } from './MarketplaceLowestPricesModal';
import { SosLiveTrackerModal } from './SosLiveTrackerModal';
import { SahayaSewaFeaturesPostModal } from './SahayaSewaFeaturesPostModal';
import { PWAInstallModal } from './PWAInstallModal';
import { QuickRegistrationHubModal } from './QuickRegistrationHubModal';
import { SavedPlacesModal } from './SavedPlacesModal';
import { AppQrShareModal } from './AppQrShareModal';
import { RegisterProfessionalServiceModal } from './RegisterProfessionalServiceModal';
import { MarketplaceAddShopModal } from './MarketplaceAddShopModal';
import { RedAlertCreateModal } from './RedAlertCreateModal';
import { RedAlertDetailModal } from './RedAlertDetailModal';
import { RedAlertFloatingTrigger } from './RedAlertFloatingTrigger';
import { initialMarketItems, getStoredMarketShops, saveMarketShopsToStorage } from '../data/marketplaceData';
import { UniversalEntityMatch, getEntitySerialNumber } from '../utils/entitySerialNumberHelper';
import { MarketShop } from '../types';
import { OmniAssistantChatBox } from './OmniAssistantChatBox';
import { broadcastAppNotification, AppNotification } from '../utils/notificationManager';
import { 
  getUserCreditBalance, 
  deductPostingFee, 
  getCategoryFee 
} from '../utils/creditManager';
import { 
  subscribeToHelpPosts, 
  addHelpPostToFirestore, 
  addReplyToFirestore,
  updateHelpPostInFirestore, 
  deleteHelpPostFromFirestore,
  sendChatMessageToFirestore
} from '../lib/firebase';
import { resolveExactLocation, toLocationOption, calculateDistanceKm } from '../utils/geoUtils';
import { checkIsAdmin } from '../utils/postOwnerHelper';
import { PaginatedHelpPostList } from './PaginatedHelpPostList';

// JSX තුළ පැරණි Help Posts list එක වෙනුවට:
<PaginatedHelpPostList 
  onSelectPost={(post) => console.log('Selected:', post)}
/>
import { 
  ShieldCheck, 
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
  Pencil,
  HelpCircle, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  Check, 
  X, 
  Clock, 
  MapPin, 
  Navigation, 
  Sliders, 
  Filter, 
  MessageCircle, 
  Users, 
  HeartHandshake, 
  Wrench, 
  Store, 
  Gift, 
  Droplet, 
  PhoneCall, 
  ChevronRight, 
  UserCheck, 
  Plus, 
  Radio, 
  RefreshCw, 
  Trash2, 
  Eye, 
  Layers, 
  ArrowLeft, 
  CheckCircle, 
  Info, 
  Shield, 
  Share2, 
  ExternalLink, 
  TrendingUp, 
  Zap, 
  Mic 
} from 'lucide-react';

export interface UserDashboardProps {
  user?: User;
  currentUser?: User | null;
  setCurrentUser?: React.Dispatch<React.SetStateAction<User | null>>;
  users?: User[];
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
  setHelpPosts?: React.Dispatch<React.SetStateAction<HelpPost[]>>;
  issues?: Issue[];
  setIssues?: React.Dispatch<React.SetStateAction<Issue[]>>;
  setRedAlerts?: React.Dispatch<React.SetStateAction<RedAlertItem[]>>;
  setTheme?: React.Dispatch<React.SetStateAction<Theme>>;
  onOpenAdminPanel?: () => void;
  onNavigateToIssues?: () => void;
  language: Language;
  setLanguage?: (lang: Language) => void;
  theme?: Theme;
  toggleTheme?: () => void;
  categories?: CategoryItem[];
  helpPosts?: HelpPost[];
  onAddPost?: (newPost: HelpPost) => void;
  onDeletePost?: (postId: string) => void;
  onPermanentDeletePost?: (postId: string) => void;
  onUpdatePost?: (updatedPost: HelpPost) => void;
  onUpdateUser?: (updatedUser: User) => void;
  onLogout?: () => void;
  activeRoleView?: any;
  setActiveRoleView?: any;
  onNavigate?: (view: any) => void;
  onOpenRedAlert?: () => void;
  redAlerts?: RedAlertItem[];
  onViewRedAlertDetail?: (alert: RedAlertItem) => void;
  activeRedAlertsCount?: number;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user: propUser,
  currentUser,
  setCurrentUser,
  users = [],
  setUsers,
  setHelpPosts,
  issues: propIssues,
  setIssues,
  setRedAlerts,
  setTheme,
  onOpenAdminPanel,
  onNavigateToIssues,
  language,
  setLanguage,
  theme,
  toggleTheme,
  categories,
  helpPosts: propHelpPosts,
  onAddPost,
  onDeletePost: propOnDeletePost,
  onPermanentDeletePost: propOnPermanentDeletePost,
  onUpdatePost: propOnUpdatePost,
  onUpdateUser,
  onLogout,
  activeRoleView,
  setActiveRoleView,
  onNavigate,
  onOpenRedAlert,
  redAlerts = [],
  onViewRedAlertDetail,
  activeRedAlertsCount = 0,
}) => {
  const user = propUser || currentUser || ({
    id: 'usr_guest',
    name: 'පරිශීලක (User)',
    nic: '000000000V',
    whatsappPhone: '0770000000',
    address: 'ශ්‍රී ලංකාව',
    district: 'කොළඹ',
    policeDivision: 'කොටුව',
    status: 'approved',
    role: 'user',
    trustScore: 85,
    creditBalance: 50,
  } as unknown as User);
  const t = translations[language];

  // Active Location State (Defaults to Kadawatha or saved location)
  const [currentLocation, setCurrentLocation] = useState<LocationOption>(() => {
    const saved = localStorage.getItem('sahaya_current_location');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return initialLocations[0]; // Kadawatha
  });

  const [isAutoLoadingLocation, setIsAutoLoadingLocation] = useState(false);
  const [autoLocationMsg, setAutoLocationMsg] = useState<string | null>(null);

  // Auto Load Live Location on Login / Dashboard Mount and on Mode Change
  useEffect(() => {
    let isMounted = true;

    const autoFetchLiveLocation = () => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return;

      setIsAutoLoadingLocation(true);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!isMounted) return;
          try {
            const { latitude, longitude, accuracy } = position.coords;
            const resolved = await resolveExactLocation(latitude, longitude);
            const locOpt = toLocationOption(resolved);

            if (isMounted) {
              setCurrentLocation(locOpt);
              localStorage.setItem('sahaya_current_location', JSON.stringify(locOpt));
              setAutoLocationMsg(`📍 සජීවී ස්ථානය ස්වයංක්‍රීයව හඳුනාගන්නා ලදී: ${resolved.shortDisplaySi}`);
              setTimeout(() => {
                if (isMounted) setAutoLocationMsg(null);
              }, 6000);
            }
          } catch (err) {
            console.warn('Auto location resolution error:', err);
          } finally {
            if (isMounted) setIsAutoLoadingLocation(false);
          }
        },
        (error) => {
          if (isMounted) setIsAutoLoadingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        }
      );
    };

    autoFetchLiveLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronize local help posts with incoming props
  const [localHelpPosts, setLocalHelpPosts] = useState<HelpPost[]>(() => {
    return filterNonDeletedPosts(propHelpPosts || initialHelpPosts);
  });

  useEffect(() => {
    if (propHelpPosts) {
      setLocalHelpPosts(filterNonDeletedPosts(propHelpPosts));
    }
  }, [propHelpPosts]);

  const helpPosts = localHelpPosts;

  // Professional Services State (Synced with localStorage and initial data)
  const [professionalServices, setProfessionalServices] = useState<ProfessionalService[]>(() => {
    return getStoredProfessionalServices();
  });

  // 🔄 20-Second Auto-Sync Listener for all services in UserDashboard
  useEffect(() => {
    const handleSync = () => {
      try {
        const latestServices = getStoredProfessionalServices();
        setProfessionalServices(latestServices);
      } catch (err) {
        console.warn('Sync handler error:', err);
      }
    };

    window.addEventListener('sahaya_sync_all_services', handleSync);
    return () => window.removeEventListener('sahaya_sync_all_services', handleSync);
  }, []);

  const handleAddProfessionalService = (newService: ProfessionalService) => {
    const updated = [newService, ...professionalServices];
    setProfessionalServices(updated);
    saveProfessionalServicesToStorage(updated);
  };

  const handleDeleteProfessionalService = (serviceId: string) => {
    if (!serviceId) return;
    const updated = (professionalServices || []).filter((s) => s && s.id !== serviceId);
    setProfessionalServices(updated);
    saveProfessionalServicesToStorage(updated);
    addDeletedProServiceId(serviceId);
    deleteProfessionalServiceFromFirestore(serviceId).catch((err) => {
      console.warn('Professional service delete from firestore notice:', err);
    });
    try {
      window.dispatchEvent(new CustomEvent('sahaya_sync_all_services'));
    } catch {}
  };

  const handleAddProfessionalReview = (serviceId: string, review: ServiceReview) => {
    const updated = (professionalServices || []).map((srv) => {
      if (srv && srv.id === serviceId) {
        const currentReviews = srv.reviews || [];
        const newReviews = [review, ...currentReviews];
        const newAvg = Number((newReviews.reduce((sum, r) => sum + r.rating, 0) / newReviews.length).toFixed(1));
        return {
          ...srv,
          reviews: newReviews,
          avgRating: newAvg,
        };
      }
      return srv;
    });
    setProfessionalServices(updated);
    saveProfessionalServicesToStorage(updated);
  };

  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isHelpPostModalOpen, setIsHelpPostModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [selectedCategoryTitle, setSelectedCategoryTitle] = useState<string>('');
  const [selectedCategoryObj, setSelectedCategoryObj] = useState<CategoryItem | null>(null);
  const [isVolunteerSupportModalOpen, setIsVolunteerSupportModalOpen] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
  const [isFindForMeModalOpen, setIsFindForMeModalOpen] = useState(false);
  const [isFromMeToYouModalOpen, setIsFromMeToYouModalOpen] = useState(false);
  const [isAiVoiceModalOpen, setIsAiVoiceModalOpen] = useState(false);
  const [isEmergencyDirectoryModalOpen, setIsEmergencyDirectoryModalOpen] = useState(false);
  const [isBloodAndDisasterModalOpen, setIsBloodAndDisasterModalOpen] = useState(false);
  const [bloodModalInitialTab, setBloodModalInitialTab] = useState<'blood_requests' | 'volunteer_donors'>('blood_requests');
  const [isAidLedgerModalOpen, setIsAidLedgerModalOpen] = useState(false);
  const [selectedPostForDetail, setSelectedPostForDetail] = useState<HelpPost | null>(null);
  const [selectedPostForChat, setSelectedPostForChat] = useState<HelpPost | null>(null);
  const [selectedPostForConfirm, setSelectedPostForConfirm] = useState<HelpPost | null>(null);
  const [selectedPostForOffer, setSelectedPostForOffer] = useState<HelpPost | null>(null);
  const [isSupportOffersModalOpen, setIsSupportOffersModalOpen] = useState(false);
  const [targetPostForOffers, setTargetPostForOffers] = useState<HelpPost | null>(null);
  const [editingPost, setEditingPost] = useState<HelpPost | null>(null);
  const [editingQuickServicePost, setEditingQuickServicePost] = useState<HelpPost | null>(null);
  const [editingFindForMePost, setEditingFindForMePost] = useState<HelpPost | null>(null);
  const [editingFromMeToYouPost, setEditingFromMeToYouPost] = useState<HelpPost | null>(null);
  const [viewingPost, setViewingPost] = useState<HelpPost | null>(null);
  const [deletingPost, setDeletingPost] = useState<HelpPost | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'security' | 'pickme_alerts' | 'notifications'>('profile');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isBarterModalOpen, setIsBarterModalOpen] = useState(false);
  const [isQrPayModalOpen, setIsQrPayModalOpen] = useState(false);
  const [isAppQrModalOpen, setIsAppQrModalOpen] = useState(false);
  const [isSavedPlacesModalOpen, setIsSavedPlacesModalOpen] = useState(false);
  const [isQuickRegistrationHubOpen, setIsQuickRegistrationHubOpen] = useState(false);
  const [isInsufficientCreditsModalOpen, setIsInsufficientCreditsModalOpen] = useState(false);
  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
  const [moderatingPost, setModeratingPost] = useState<HelpPost | null>(null);
  const [isPosterResponseModalOpen, setIsPosterResponseModalOpen] = useState(false);
  const [posterRespondingPost, setPosterRespondingPost] = useState<HelpPost | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isPickMeAlertModalOpen, setIsPickMeAlertModalOpen] = useState(false);
  const [isMarketplaceLowestModalOpen, setIsMarketplaceLowestModalOpen] = useState(false);
  const [isSosLiveModalOpen, setIsSosLiveModalOpen] = useState(false);
  const [isFeaturesPostModalOpen, setIsFeaturesPostModalOpen] = useState(false);
  const [isAssistantChatOpen, setIsAssistantChatOpen] = useState(false);
  const [isRedAlertCreateOpen, setIsRedAlertCreateOpen] = useState(false);
  const [selectedAlertForDetail, setSelectedAlertForDetail] = useState<RedAlertItem | null>(null);
  const [marketplaceShopModalType, setMarketplaceShopModalType] = useState<'retail_shop' | 'wholesale_shop' | 'direct_importer' | 'manufacturer_factory'>('retail_shop');
  const [isMarketplaceAddShopModalOpen, setIsMarketplaceAddShopModalOpen] = useState(false);
  const [isRegisterProfessionalServiceModalOpen, setIsRegisterProfessionalServiceModalOpen] = useState(false);
  const [isInboxModalOpen, setIsInboxModalOpen] = useState(false);

  // Resolution Prompt Logic (Post-Help Confirmation System)
  const [resolutionPromptPost, setResolutionPromptPost] = useState<HelpPost | null>(null);
  const [postponedResolutionPostIds, setPostponedResolutionPostIds] = useState<string[]>([]);

  const [qrPayInitialTab, setQrPayInitialTab] = useState<'my_qr' | 'scan_pay'>('scan_pay');
  const [qrPayTargetRecipient, setQrPayTargetRecipient] = useState<{
    userId: string;
    name: string;
    phone?: string;
    fixedAmount?: number;
  } | undefined>(undefined);

  // Navigation handler when user clicks a notification toast or modal item
  const handleOpenFromNotification = (notif: AppNotification) => {
    setIsNotificationModalOpen(false);
    if (notif.relatedPostId) {
      const target = (helpPosts || []).find((p) => p && p.id === notif.relatedPostId);
      if (target) {
        setSelectedPostForDetail(target);
      }
    }
  };

  const handleClearAllNotifications = () => {
    // Local clear
  };

  // Trust Score calculation profile
  const trustProfile = useMemo(() => {
    return calculateTrustProfile(user, helpPosts);
  }, [user, helpPosts]);

  // Total replies / conversations count for user (as poster or responder)
  const inboxRepliesCount = useMemo(() => {
    const normalizePhone = (phone?: string) => (phone ? phone.replace(/\D/g, '') : '');
    const userPhoneNorm = normalizePhone(user?.whatsappPhone || user?.phone);

    let count = 0;
    (helpPosts || []).forEach((post) => {
      if (!post || isPostPermanentlyDeleted(post.id)) return;
      const isOwner = checkIsPostOwner(post, user);

      (post.replies || []).forEach((rep) => {
        if (!rep) return;
        const repPhoneNorm = normalizePhone(rep.responderPhone);
        const isResponder = rep.responderId === user.id || (userPhoneNorm && repPhoneNorm === userPhoneNorm);

        if (isOwner || isResponder) {
          count++;
        }
      });
    });

    return count;
  }, [helpPosts, user]);

  // Posts where the current user was selected as confirmed helper
  const postsWhereIWasSelected = useMemo(() => {
    const normalizePhone = (phone?: string) => (phone ? phone.replace(/\D/g, '') : '');
    const userPhoneNorm = normalizePhone(user?.whatsappPhone || user?.phone);

    return (helpPosts || []).filter((post) => {
      if (!post || (!post.isResolved && !post.confirmedHelperId)) return false;
      if (post.confirmedHelperId === user.id) return true;
      if (userPhoneNorm && post.confirmedHelperPhone && normalizePhone(post.confirmedHelperPhone) === userPhoneNorm) {
        return true;
      }
      return false;
    });
  }, [helpPosts, user]);

  // All active tags extracted across all visible posts
  const allTags = useMemo<TagItem[]>(() => {
    const tagsFromPosts = (helpPosts || []).map((p) => (p ? p.tagName : undefined)).filter(Boolean) as string[];
    const staticTags = getStoredTags().map((t) => t.nameSi);
    const combined = Array.from(new Set([...tagsFromPosts, ...staticTags]));
    return combined.map((name, i) => ({
      id: `tag_${i}`,
      nameSi: name,
      nameEn: name,
      nameTa: name,
      category: 'general',
    }));
  }, [helpPosts]);

  // Automatic scrolling to community notices upon viewport readiness
  useEffect(() => {
    const scrollToNotices = () => {
      const feed = document.getElementById('help-notices-feed');
      if (feed) {
        feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    const timer = setTimeout(scrollToNotices, 350);
    return () => clearTimeout(timer);
  }, []);

  // Active Feed Tab: 'local' (<15km) vs 'all_sl' (>15km or all)
  const [dashboardView, setDashboardView] = useState<'home' | 'requests'>('requests');
  const [feedDistanceTab, setFeedDistanceTab] = useState<'local' | 'all_sl'>('all_sl');
  const [boardCategoryFilter, setBoardCategoryFilter] = useState<string>('');
  const [maxDistanceRadius, setMaxDistanceRadius] = useState<number>(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDemoRegisterPrompt, setShowDemoRegisterPrompt] = useState(false);
  const [isPwaInstallModalOpen, setIsPwaInstallModalOpen] = useState(false);

  // Selected tag filter
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');

  // Core Post Creation Handler (addHelpPostToFirestore)
  const handleCreatePost = async (newPost: Omit<HelpPost, 'id' | 'createdAt' | 'createdAtIso'>) => {
    const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullPost: HelpPost = {
      ...newPost,
      id: postId,
      createdAt: new Date().toISOString(),
      createdAtIso: new Date().toISOString(),
      userId: user?.userId || user?.id || 'anonymous_user',
      userName: user?.name || 'Anonymous User',
      userPhone: user?.whatsappPhone || user?.phone || '',
      status: 'active',
      isResolved: false,
    };

    setLocalHelpPosts((prev) => [fullPost, ...(prev || [])]);
    if (propOnAddPost) {
      propOnAddPost(fullPost);
    }

    try {
      await addHelpPostToFirestore(fullPost);
    } catch (err) {
      console.warn('Post saved locally, cloud sync notice:', err);
    }

    setIsHelpPostModalOpen(false);
    setIsQuickServiceModalOpen(false);
    setIsFindForMeModalOpen(false);
    setIsFromMeToYouModalOpen(false);
    setIsAiVoiceModalOpen(false);
  };

  // Core Post Edit & Save Handler
  const handleSaveUpdatedPost = async (updatedPost: HelpPost) => {
    setLocalHelpPosts((prev) => (prev || []).map((p) => (p && p.id === updatedPost.id ? updatedPost : p)));
    if (propOnUpdatePost) {
      propOnUpdatePost(updatedPost);
    }
    if (selectedPostForDetail?.id === updatedPost.id) {
      setSelectedPostForDetail(updatedPost);
    }
    if (selectedPostForChat?.id === updatedPost.id) {
      setSelectedPostForChat(updatedPost);
    }
    try {
      await updateHelpPostInFirestore(updatedPost.id, updatedPost);
    } catch (err) {
      console.warn('Updated locally, cloud notice:', err);
    }
    setEditingQuickServicePost(null);
    setEditingFindForMePost(null);
    setEditingFromMeToYouPost(null);
    setEditingPost(null);
  };
  const handleConfirmDeletePost = async (postId: string) => {
    if (!postId) return;
    const postToDelete = (helpPosts || []).find((p) => p && p.id === postId) || (localHelpPosts || []).find((p) => p && p.id === postId) || deletingPost;

    // 1 & 2. Automatic Backup Preparation & Auto JSON File Download (Admin සඳහා පමණි)
    if (postToDelete && checkIsAdmin(user)) {
      downloadPostBackupJson(postToDelete, user);
    }

    // 3. LocalStorage Blacklist & Purge local memory
    addDeletedPostId(postId);
    try {
      localStorage.removeItem('sahaya_help_posts');
    } catch {}

    // 4. Immediately remove from local state
    setLocalHelpPosts((prev) => (prev || []).filter((p) => p && p.id !== postId));

    if (propOnDeletePost) {
      propOnDeletePost(postId);
    }
    if (propOnPermanentDeletePost) {
      propOnPermanentDeletePost(postId);
    }

    // 5. Delete from Firestore permanently
    try {
      await deleteHelpPostFromFirestore(postId);
    } catch (err) {
      console.warn('Backend permanent deletion note:', err);
    }

    setDeletingPost(null);
  };

  const handleEditPost = (post: HelpPost) => {
    if (!post) return;
    if (post.postType === 'quick_service') {
      setEditingQuickServicePost(post);
    } else if (post.postType === 'find_for_me') {
      setEditingFindForMePost(post);
    } else if (post.postType === 'from_me_to_you') {
      setEditingFromMeToYouPost(post);
    } else {
      setEditingPost(post);
    }
  };

  const handleToggleHidePost = async (post: HelpPost) => {
    if (!post || !post.id) return;
    const isCurrentlyHidden = Boolean(post.isHidden || post.status === 'hidden');
    const nextHidden = !isCurrentlyHidden;
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';

    const updated: HelpPost = {
      ...post,
      isHidden: nextHidden,
      isHiddenByAdmin: isAdmin ? nextHidden : Boolean(post.isHiddenByAdmin),
      status: nextHidden ? 'hidden' : 'active',
      hiddenAt: nextHidden ? new Date().toISOString() : undefined,
      hiddenBy: nextHidden ? (user.name || 'Admin') : undefined,
    };

    if (propOnUpdatePost) {
      propOnUpdatePost(updated);
    } else {
      setLocalHelpPosts((prev) => (prev || []).map((p) => (p && p.id === post.id ? updated : p)));
    }

    if (selectedPostForDetail?.id === post.id) setSelectedPostForDetail(updated);
    if (selectedPostForChat?.id === post.id) setSelectedPostForChat(updated);

    try {
      await updateHelpPostInFirestore(post.id, {
        isHidden: nextHidden,
        isHiddenByAdmin: isAdmin ? nextHidden : Boolean(post.isHiddenByAdmin),
        status: nextHidden ? 'hidden' : 'active',
        hiddenAt: nextHidden ? new Date().toISOString() : null,
        hiddenBy: nextHidden ? (user.name || 'Admin') : null,
      });
    } catch (err) {
      console.warn('Failed to update hidden status in Firestore:', err);
    }
  };

  const handleSaveEditedPost = async (updatedPost: HelpPost) => {
    if (!updatedPost || !updatedPost.id) return;
    if (propOnUpdatePost) {
      propOnUpdatePost(updatedPost);
    } else {
      setLocalHelpPosts((prev) => (prev || []).map((p) => (p && p.id === updatedPost.id ? updatedPost : p)));
    }
    if (selectedPostForDetail?.id === updatedPost.id) {
      setSelectedPostForDetail(updatedPost);
    }
    if (selectedPostForChat?.id === updatedPost.id) {
      setSelectedPostForChat(updatedPost);
    }
    try {
      await updateHelpPostInFirestore(updatedPost.id, updatedPost);
    } catch (err) {
      console.warn('Updated locally, cloud notice:', err);
    }
    setEditingQuickServicePost(null);
    setEditingFindForMePost(null);
    setEditingFromMeToYouPost(null);
    setEditingPost(null);
  };

  const isAuthorBlockedStatus = (post: HelpPost): boolean => {
    if (!post) return false;
    const authorId = post.userId || post.authorId;
    const authorPhone = post.userPhone || post.contactPhone;

    const matchedUser = (users || []).find((u) => {
      if (!u) return false;
      if (authorId && (u.id === authorId || u.userId === authorId)) return true;
      if (authorPhone && (u.whatsappPhone === authorPhone || u.phone === authorPhone)) return true;
      return false;
    });

    return matchedUser?.status === 'blocked';
  };

  const isHelpersNeededSatisfied = (post: HelpPost): boolean => {
    if (!post) return false;
    const neededHelpers = post.helpersNeeded || 0;
    if (neededHelpers <= 0) return false;

    const acceptedCount = (post.replies || []).filter((r) => r && (r.isAccepted || r.isConfirmed)).length;
    return acceptedCount >= neededHelpers;
  };

  // Recalculate distance from current active location
  const getPostDistance = (post: HelpPost) => {
    const curLat = currentLocation?.lat;
    const curLng = currentLocation?.lng;
    if (!post?.lat || !post?.lng || typeof curLat !== 'number' || typeof curLng !== 'number') {
      return post?.distanceKm || 20;
    }
    return calculateDistanceKm(curLat, curLng, post.lat, post.lng);
  };

  // Category & Distance & Tag Filtering Logic
  const filteredPosts = (helpPosts || []).filter((post) => {
    if (!post || !post.id || post.isDeleted || post.status === 'deleted' || isPostPermanentlyDeleted(post.id)) return false;

    // Check if post author is blocked
    if (isAuthorBlockedStatus(post)) {
      const isViewerAdmin = checkIsAdmin(user);
      if (!isViewerAdmin) return false;
    }

    // Role-based Feed view filtering (Need Help vs Can Help)
    if (activeRoleView === 'need_help' && post.roleType === 'can_help') return false;
    if (activeRoleView === 'can_help' && post.roleType === 'need_help') return false;

    // Hidden posts visibility
    if (post.isHidden) {
      const isOwner = checkIsPostOwner(post, user);
      const isViewerAdmin = checkIsAdmin(user);
      if (!isOwner && !isViewerAdmin) return false;
    }

    // 1. Distance Radius Filter (<15km local vs all_sl)
    if (feedDistanceTab === 'local' && currentLocation && post.latitude && post.longitude) {
      const dist = calculateDistanceKm(
        currentLocation.lat,
        currentLocation.lng,
        post.latitude,
        post.longitude
      );
      if (dist > maxDistanceRadius) return false;
    }

    // 2. Category Board Filter
    if (boardCategoryFilter) {
      if (boardCategoryFilter === 'resolved') {
        if (!post.isResolved && post.status !== 'resolved') return false;
      } else if (boardCategoryFilter === 'urgent') {
        if (!post.isUrgent && !post.urgencyLevel) return false;
      } else if (boardCategoryFilter === 'group_work') {
        if (post.category !== 'group_work' && post.postType !== 'group_work') return false;
      } else if (boardCategoryFilter === 'marketplace') {
        if (post.category !== 'marketplace' && post.postType !== 'marketplace') return false;
      } else if (boardCategoryFilter === 'quick_services') {
        if (post.postType !== 'quick_service') return false;
      } else if (post.category !== boardCategoryFilter && post.tagCategory !== boardCategoryFilter) {
        return false;
      }
    }

    // 3. Tag Filter
    if (selectedTagFilter) {
      if (post.tagName !== selectedTagFilter) return false;
    }

    // 4. Search Query Filter (Expanded search keywords)
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const keywords = getExpandedSearchKeywords(query);

      const postContent = `
        ${post.title || ''} 
        ${post.whatHappened || ''} 
        ${post.content || ''} 
        ${post.whatIsNeeded || ''} 
        ${post.userName || ''} 
        ${post.locationName || ''} 
        ${post.city || ''} 
        ${post.tagName || ''}
      `.toLowerCase();

      const matchesDirect = postContent.includes(query);
      const matchesKeyword = keywords.some((k) => postContent.includes(k.toLowerCase()));

      if (!matchesDirect && !matchesKeyword) return false;
    }

    return true;
  });

  // Check for posts needing resolution confirmation prompt
  useEffect(() => {
    if (!user || !user.id || !helpPosts) return;

    const postNeedingResolution = (helpPosts || []).find((post) => {
      if (!post || post.isResolved || post.status === 'resolved') return false;
      if (!checkIsPostOwner(post, user)) return false;
      if (postponedResolutionPostIds.includes(post.id)) return false;

      // Has accepted replies or satisfied helper count
      const hasAcceptedHelper = (post.replies || []).some((r) => r && (r.isAccepted || r.isConfirmed));
      return hasAcceptedHelper;
    });

    if (postNeedingResolution && !resolutionPromptPost) {
      setResolutionPromptPost(postNeedingResolution);
    }
  }, [helpPosts, user, postponedResolutionPostIds]);

  const handleConfirmPost = async (confirmedPost: HelpPost, confirmedReplyId?: string) => {
    const matchedReply = (confirmedPost.replies || []).find((r) =>
      r && (confirmedReplyId ? r.id === confirmedReplyId : r.isAccepted || r.isConfirmed)
    );

    const updatedReplies = (confirmedPost.replies || []).map((rep) => {
      if (!rep) return rep;
      if (confirmedReplyId) {
        if (rep.id === confirmedReplyId) {
          return { ...rep, isAccepted: true, isConfirmed: true };
        }
        return rep;
      }
      return { ...rep, isAccepted: true, isConfirmed: true };
    });

    const helperName = matchedReply?.responderName || confirmedPost.confirmedHelperName || confirmedPost.confirmedBy || user.name;
    const helperPhone = matchedReply?.responderPhone || confirmedPost.confirmedHelperPhone || '';

    const resolvedPost: HelpPost = {
      ...confirmedPost,
      isResolved: true,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      confirmedHelperId: matchedReply?.responderId || confirmedPost.confirmedHelperId || '',
      confirmedHelperName: helperName,
      confirmedHelperPhone: helperPhone,
      replies: updatedReplies,
    };

    handleSaveUpdatedPost(resolvedPost);
    setResolutionPromptPost(null);
  };

  const handlePostponeResolution = (postId: string) => {
    setPostponedResolutionPostIds((prev) => [...prev, postId]);
    setResolutionPromptPost(null);
  };

  const handleAddProfessionalServiceFromForm = (newService: Omit<ProfessionalService, 'id' | 'createdAt' | 'rating' | 'reviewsCount' | 'reviews'>) => {
    const service: ProfessionalService = {
      ...newService,
      id: `service_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      rating: 5.0,
      reviewsCount: 1,
      reviews: [
        {
          id: `rev_${Date.now()}`,
          userId: user.id,
          userName: user.name,
          rating: 5,
          comment: 'විශිෂ්ට සේවාවක්! සහය සේවා පද්ධතිය මඟින් සහතික කරන ලදී.',
          createdAt: new Date().toISOString(),
        }
      ],
    };

    const updated = [service, ...professionalServices];
    setProfessionalServices(updated);
    saveProfessionalServicesToStorage(updated);
  };

  const quickServices = [
    {
      id: 'emergency',
      title: t.emergencyHelp,
      desc: language === 'en' ? 'Get immediate assistance for life-threatening situations.' : language === 'ta' ? 'உயிருக்கு ஆபத்தான சூழ்நிலைகளுக்கு உடனடி உதவி பெறுங்கள்.' : 'ක්ෂණිකව ජීවිතාරක්ෂක හා හදිසි ආපදා සහය ලබාගන්න.',
      icon: ShieldAlert,
      color: 'from-red-600 to-rose-700',
      badge: language === 'en' ? '24/7 Urgent' : language === 'ta' ? '24/7 அவசரம்' : '24/7 හදිසි',
    },
    {
      id: 'quick_service',
      title: t.quickService,
      desc: language === 'en' ? 'Find skilled workers, drivers, and daily laborers instantly.' : language === 'ta' ? 'திறமையான தொழிலாளர்கள், ஓட்டுநர்களை உடனடியாகக் கண்டறியவும்.' : 'කාර්මිකයින්, රියදුරන් සහ දෛනික සේවකයින් ක්ෂණිකව සොයාගන්න.',
      icon: Wrench,
      color: 'from-amber-500 to-orange-600',
      badge: language === 'en' ? 'Local Help' : language === 'ta' ? 'உள்ளூர் உதவி' : 'ප්‍රදේශයේ සහය',
    },
    {
      id: 'find_for_me',
      title: t.findForMe,
      desc: language === 'en' ? 'Lost an item, pet, or vehicle? Let the community help you search.' : language === 'ta' ? 'பொருளையோ செல்லப்பிராணியையோ இழந்தீர்களா? சமூகம் தேட உதவட்டும்.' : 'නැතිවූ භාණ්ඩ, සුරතලුන් හෝ වාහන සොයා ගැනීමට ප්‍රජා සහය ලබාගන්න.',
      icon: Search,
      color: 'from-blue-600 to-indigo-700',
      badge: language === 'en' ? 'Lost & Found' : language === 'ta' ? 'இழந்ததும் கண்டதும்' : 'සොයාගැනීම්',
    },
    {
      id: 'from_me_to_you',
      title: t.fromMeToYou,
      desc: language === 'en' ? 'Donate unused goods, books, medicine, or exchange items.' : language === 'ta' ? 'பயன்படுத்தப்படாத பொருட்கள், புத்தகங்களை நன்கொடையாக வழங்கவும்.' : 'භාවිතා නොකරන ද්‍රව්‍ය, පොත්පත්, බෙහෙත් පරිත්‍යාග කරන්න හෝ හුවමාරු කරගන්න.',
      icon: HeartHandshake,
      color: 'from-emerald-600 to-teal-700',
      badge: language === 'en' ? 'Free Aid / Barter' : language === 'ta' ? 'இலவச உதவி' : 'පරිත්‍යාග / හුවමාරු',
    },
    {
      id: 'blood_donation',
      title: t.bloodDonationService,
      desc: language === 'en' ? 'Emergency blood requests and volunteer donor network.' : language === 'ta' ? 'அவசர இரத்தக் கோரிக்கைகள் மற்றும் தன்னார்வ நன்கொடையாளர் நெட்வொர்க்.' : 'හදිසි ලේ අවශ්‍යතා සහ ස්වේච්ඡා ලේ පරිත්‍යාගශීලීන්ගේ එකමුතුව.',
      icon: Droplet,
      color: 'from-rose-600 to-red-800',
      badge: language === 'en' ? 'Lifesaver' : language === 'ta' ? 'உயிர்காப்பாளர்' : 'ජීවිතාරක්ෂක',
    },
    {
      id: 'chat',
      title: t.directChatService,
      desc: language === 'en' ? 'Chat directly with a support services officer.' : language === 'ta' ? 'ஆதரவு சேவை அதிகாரியுடன் நேரடியாக அரட்டையடிக்கவும்.' : 'සහය සේවා නිලධාරියෙකු සමඟ සෘජුව සංවාදයේ යෙදෙන්න.',
      icon: MessageCircle,
      color: 'from-purple-500 to-indigo-600',
      badge: language === 'en' ? 'Direct Support' : language === 'ta' ? 'நேரடி ஆதரவு' : 'සෘජු සහය',
    },
  ];

  const getLangText = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };
  return (
    <div className="w-full max-w-5xl mx-auto py-2 sm:py-4 space-y-4 sm:space-y-6 animate-fadeIn">
      {/* 🚨 Active Red Alert Ticker Banner at the Very Top of Notice Board */}
      {redAlerts && redAlerts.length > 0 && (
        <RedAlertBanner
          alerts={redAlerts}
          currentLocation={currentLocation}
          currentUser={user}
          onOpenAlertDetail={(a) => {
            if (user?.isDemo) {
              setShowDemoRegisterPrompt(true);
              return;
            }
            if (onViewRedAlertDetail) onViewRedAlertDetail(a);
            else setSelectedAlertForDetail(a);
          }}
          onOpenCreate={() => {
            if (user?.isDemo) {
              setShowDemoRegisterPrompt(true);
              return;
            }
            if (onOpenRedAlert) onOpenRedAlert();
            else setIsRedAlertCreateOpen(true);
          }}
        />
      )}

      {/* 1. Integrated Unified Top Header Card (Combines Logo, User Info, Location/Address, App Help, and Controls) */}
      <UnifiedDashboardHeader
        user={user}
        currentLocation={currentLocation}
        availableLocations={initialLocations}
        onSelectLocation={setCurrentLocation}
        language={language}
        setLanguage={setLanguage || (() => {})}
        theme={theme || 'light'}
        toggleTheme={toggleTheme || (() => {})}
        onNavigateToIssues={onNavigateToIssues}
        onOpenSettings={() => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setSettingsInitialTab('profile');
          setIsSettingsModalOpen(true);
        }}
        onOpenWallet={() => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setIsWalletModalOpen(true);
        }}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        onOpenPickMeAlertSettings={() => setIsPickMeAlertModalOpen(true)}
        onOpenInbox={() => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setIsInboxModalOpen(true);
        }}
        inboxCount={inboxRepliesCount}
        onOpenAssistant={() => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setIsAssistantChatOpen(true);
        }}
        onLogout={onLogout}
        activeRoleView={activeRoleView}
        setActiveRoleView={setActiveRoleView}
        onNavigate={onNavigate}
        isAutoLoadingLocation={isAutoLoadingLocation}
        autoLoadedNotice={autoLocationMsg}
        onOpenRedAlert={() => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          if (onOpenRedAlert) onOpenRedAlert();
          else setIsRedAlertCreateOpen(true);
        }}
        activeRedAlertsCount={activeRedAlertsCount || redAlerts.filter(a => a && a.status === 'active').length}
        onOpenBarterExchange={() => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setIsBarterModalOpen(true);
        }}
        onOpenQrPay={(tab: 'my_qr' | 'scan_pay' = 'scan_pay') => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setQrPayTargetRecipient(undefined);
          setQrPayInitialTab(tab);
          setIsQrPayModalOpen(true);
        }}
        onOpenInstallApp={() => setIsPwaInstallModalOpen(true)}
        onOpenSavedPlaces={() => setIsSavedPlacesModalOpen(true)}
        onOpenQuickRegisterHub={() => setIsQuickRegistrationHubOpen(true)}
        onOpenAppQr={() => setIsAppQrModalOpen(true)}
      />

      {/* 1.1 Live Proximity Urgent Alert Radar Banner */}
      <ProximityAlertBanner
        posts={helpPosts}
        userLocation={currentLocation}
        onViewPost={(post) => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setSelectedPostForDetail(post);
        }}
      />

      {/* Confirmed Helper Notice Banner */}
      {postsWhereIWasSelected.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] text-white shadow-xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn border-2 border-emerald-400/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{getLangText('ඔබව සහය සඳහා තෝරාගෙන ඇත!', 'You have been selected to help!', 'உதவி செய்ய நீங்கள் தேர்ந்தெடுக்கப்பட்டுள்ளீர்கள்!')}</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                "{postsWhereIWasSelected[0].userName || getLangText('ගැටලුව සිදුවූ පුද්ගලයා', 'The Poster', 'பதிவு செய்தவர்')}" {getLangText(
                  'සහය සදහා ඔබ තොරාගෙන ඇත. ඔබ දෙදෙනා අතර ගැටලුවක් ඇති නොවන පරිදි සුහදශිලිව සහයවිමට වගබලාගන්න. ස්තුතියි ...!!!',
                  'has selected you for support. Please coordinate politely and assist carefully. Thank you!',
                  'உங்களை உதவிக்கு தேர்வு செய்துள்ளார். கவனமாக உதவவும். நன்றி!'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsVolunteerSupportModalOpen(true)}
            className="px-4 py-2.5 bg-white text-emerald-950 font-black text-xs rounded-xl hover:bg-emerald-50 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
          >
            {getLangText('විස්තර බලන්න', 'View Details', 'விவரங்களை காண்க')}
          </button>
        </div>
      )}

      {/* User's Own Active Post Quick Actions Floating Strip */}
      {(() => {
        const myActivePost = (helpPosts || []).find((p) => p && !p.isResolved && checkIsPostOwner(p, user));
        if (!myActivePost) return null;
        return (
          <div className="p-3.5 sm:p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 shadow-md flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-black text-amber-950 dark:text-amber-200 truncate">
                  {getLangText('ඔබගේ සක්‍රිය දැන්වීම:', 'Your Active Post:', 'உங்கள் செயலில் உள்ள இடுகை:')} {myActivePost.title || myActivePost.whatHappened || myActivePost.whatIsNeeded}
                </h5>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                  {myActivePost.replies?.length || 0} {getLangText('සහායකයින් ප්‍රතිචාර දක්වා ඇත', 'helpers responded', 'உதவியாளர்கள் பதிலளித்துள்ளனர்')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTargetPostForOffers(myActivePost);
                  setIsSupportOffersModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
              >
                {getLangText('සහායකයින්', 'Helpers', 'உதவியாளர்கள்')}
              </button>

              <button
                type="button"
                onClick={() => handleEditPost(myActivePost)}
                className="p-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* 1.2 Community Hubs: Fast Emergency & Community Action Cards (Top Section) */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          
          {/* Button 1: Blood & Disaster Relief Hub */}
          <button
            type="button"
            onClick={() => {
              if (user?.isDemo) {
                setShowDemoRegisterPrompt(true);
                return;
              }
              setBloodModalInitialTab('blood_requests');
              setIsBloodAndDisasterModalOpen(true);
            }}
            className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-700 text-white shadow-lg hover:shadow-xl shadow-red-600/30 border-2 border-red-300/80 active:scale-95 transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[96px] sm:min-h-[108px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                <Droplet className="w-5 h-5 fill-white" />
              </div>
              <span className="px-2 py-0.5 rounded-full font-mono text-[9px] sm:text-[10px] font-black bg-white text-red-700 shadow-md animate-pulse">
                LIVE
              </span>
            </div>
            <div className="min-w-0 mt-2">
              <h4 className="text-xs sm:text-sm md:text-base font-black text-white leading-tight">
                {getLangText('හදිසි ලේ අවශ්ෂතා', 'Emergency Blood Needs', 'அவசர இரத்தத் தேவைகள்')}
              </h4>
            </div>
          </button>

          {/* Button 2: Transparent Aid Ledger (ආධාර විනිවිදභාවයේ ලෙජරය) */}
          <button
            type="button"
            onClick={() => {
              if (user?.isDemo) {
                setShowDemoRegisterPrompt(true);
                return;
              }
              setIsAidLedgerModalOpen(true);
            }}
            className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-indigo-800 hover:from-emerald-700 hover:to-teal-800 text-white shadow-lg hover:shadow-xl shadow-emerald-600/30 border-2 border-emerald-300/80 active:scale-95 transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[96px] sm:min-h-[108px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
              </div>
              <span className="px-2 py-0.5 rounded-full font-mono text-[9px] sm:text-[10px] font-black bg-emerald-400 text-emerald-950 shadow-md">
                DISASTER RELIEF
              </span>
            </div>
            <div className="min-w-0 mt-2">
              <h4 className="text-xs sm:text-sm md:text-base font-black text-white leading-tight">
                {getLangText('ආපදා සහන සේවය', 'Disaster Relief Service', 'பேரிடர் நிவாரண சேவை')}
              </h4>
            </div>
          </button>

          {/* Button 3: Emergency Contacts Directory */}
          <button
            type="button"
            onClick={() => {
              if (user?.isDemo) {
                setShowDemoRegisterPrompt(true);
                return;
              }
              setIsEmergencyDirectoryModalOpen(true);
            }}
            className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl shadow-amber-600/30 border-2 border-amber-300/80 active:scale-95 transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[96px] sm:min-h-[108px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                <PhoneCall className="w-4 h-4 text-white" />
              </div>
              <span className="px-2 py-0.5 rounded-full font-mono text-[9px] sm:text-[10px] font-black bg-white text-amber-800 shadow-md">
                1990 / 119
              </span>
            </div>
            <div className="min-w-0 mt-2">
              <h4 className="text-xs sm:text-sm md:text-base font-black text-white leading-tight">
                {getLangText('හදිසි සේවා අංක', 'Emergency Directory', 'அவசர உதவி எண்கள்')}
              </h4>
            </div>
          </button>

          {/* Button 4: AI Voice SOS & Help Requests (AI හඬ සහය) */}
          <button
            type="button"
            onClick={() => {
              if (user?.isDemo) {
                setShowDemoRegisterPrompt(true);
                return;
              }
              setIsAiVoiceModalOpen(true);
            }}
            className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl shadow-purple-600/30 border-2 border-purple-300/80 active:scale-95 transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[96px] sm:min-h-[108px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                <Mic className="w-4 h-4 text-white animate-pulse" />
              </div>
              <span className="px-2 py-0.5 rounded-full font-mono text-[9px] sm:text-[10px] font-black bg-white text-purple-800 shadow-md flex items-center gap-1">
                <Mic className="w-3 h-3 text-emerald-500" /> VOICE HELP
              </span>
            </div>
            <div className="min-w-0 mt-2">
              <h4 className="text-xs sm:text-sm md:text-base font-black text-white leading-tight">
                {getLangText('හඬ සහය (Voice Help)', 'Voice Help', 'குரல் உதவி')}
              </h4>
            </div>
          </button>
        </div>
      </div>

      {/* Central Glowing "I Need Help" Button */}
      <GlowingNeedHelpBtn
        onClick={() => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setIsCategoryModalOpen(true);
        }}
        lang={language}
      />

      {/* 📢 3. ප්‍රධාන දැන්වීම් සහ සහය පුවරුව (Main Notices & Community Board Feed - Viewport Starts Here Automatically) */}
      <div id="help-notices-feed" className="scroll-mt-4 pt-1">
        <HelpRequestsPage
          user={user}
          language={language}
          helpPosts={helpPosts}
          filteredPosts={filteredPosts}
          currentLocation={currentLocation}
          feedDistanceTab={feedDistanceTab}
          setFeedDistanceTab={setFeedDistanceTab}
          boardCategoryFilter={boardCategoryFilter}
          setBoardCategoryFilter={setBoardCategoryFilter}
          selectedCategoryTitle={selectedCategoryTitle}
          setSelectedCategoryTitle={setSelectedCategoryTitle}
          maxDistanceRadius={maxDistanceRadius}
          setMaxDistanceRadius={setMaxDistanceRadius}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          allTags={allTags}
          selectedTagFilter={selectedTagFilter}
          setSelectedTagFilter={setSelectedTagFilter}
          getPostDistance={getPostDistance}
          onOfferSupport={(p) => {
            // 🚀 Demo පරිශීලකයින්ට සේවා ඉල්ලුම් කිරීමට හෝ සහය වීමට පෙර ලියාපදිංචි වීම අනිවාර්යයි
            if (user?.isDemo) {
              setShowDemoRegisterPrompt(true);
              return;
            }
            setSelectedPostForDetail(p);
          }}
          onEditPost={(p) => handleEditPost(p)}
          onToggleHidePost={(p) => handleToggleHidePost(p)}
          onViewPost={(p) => {
            // 🚀 Demo පරිශීලකයින්ට දුරකථන අංක හා සම්පූර්ණ විස්තර බැලීමට පෙර ලියාපදිංචි වීම අනිවාර්යයි
            if (user?.isDemo) {
              setShowDemoRegisterPrompt(true);
              return;
            }
            setViewingPost(p);
          }}
          onDeletePost={(p) => setDeletingPost(p)}
          onOpenChat={(p) => {
            // 🚀 Demo පරිශීලකයින්ට Chat සංවාද සඳහා ලියාපදිංචි වීම අනිවාර්යයි
            if (user?.isDemo) {
              setShowDemoRegisterPrompt(true);
              return;
            }
            setSelectedPostForChat(p);
          }}
          onOpenConfirm={(p) => {
            if (user?.isDemo) {
              setShowDemoRegisterPrompt(true);
              return;
            }
            setSelectedPostForConfirm(p);
          }}
          onOpenSupportOffers={(p) => {
            if (user?.isDemo) {
              setShowDemoRegisterPrompt(true);
              return;
            }
            setTargetPostForOffers(p);
            setIsSupportOffersModalOpen(true);
          }}
          onOpenCreateModal={() => {
            if (user?.isDemo) {
              setShowDemoRegisterPrompt(true);
              return;
            }
            setIsCategoryModalOpen(true);
          }}
          onBackToHome={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onRequireRegistration={() => setShowDemoRegisterPrompt(true)}
          onUpdatePost={propOnUpdatePost}
          onAdminModerate={(p) => setModeratingPost(p)}
          onPosterRespondIssue={(p) => setPosterRespondingPost(p)}
          professionalServices={professionalServices}
          onAddProfessionalService={handleAddProfessionalService}
          onAddProfessionalReview={handleAddProfessionalReview}
          onDeleteProfessionalService={handleDeleteProfessionalService}
          registeredUsers={(() => {
            try {
              const saved = localStorage.getItem('sahaya_users');
              return saved ? deduplicateUsers(JSON.parse(saved)) : deduplicateUsers(initialUsers);
            } catch {
              return deduplicateUsers(initialUsers);
            }
          })()}
          redAlerts={redAlerts}
          onViewRedAlertDetail={onViewRedAlertDetail}
          onOpenRedAlert={onOpenRedAlert}
        />
      </div>
      {/* MODALS implementation matching PDF flow */}
      
      {/* 0. Category Selection Modal (Step 2.1 - 2.2) */}
      <CategorySelectionModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSelectCategory={(catKey, catTitle, selectedCat) => {
          setSelectedCategoryTitle(catTitle);
          setSelectedCategoryObj(selectedCat || null);
          setIsCategoryModalOpen(false);
          if (catKey === 'find_for_me') {
            setIsFindForMeModalOpen(true);
          } else if (catKey === 'from_me_to_you') {
            setIsFromMeToYouModalOpen(true);
          } else {
            setIsQuickServiceModalOpen(true);
          }
        }}
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        toggleTheme={toggleTheme}
        categories={categories}
      />

      {/* 1. Quick Services Request Form Modal (Node 2) */}
      <QuickServiceModal
        isOpen={isQuickServiceModalOpen}
        onClose={() => {
          setIsQuickServiceModalOpen(false);
          setEditingQuickServicePost(null);
        }}
        onSubmitPost={handleCreatePost}
        currentLocation={currentLocation}
        currentUser={user}
        lang={language}
        categoryTitle={selectedCategoryTitle}
        selectedCategoryObj={selectedCategoryObj}
        editPost={editingQuickServicePost}
        onUpdatePost={handleSaveEditedPost}
      />

      {/* 1.4. Quick Service Detail & Helper Selection Modal (Node 4) */}
      <QuickServiceDetailModal
        isOpen={Boolean(selectedPostForDetail)}
        post={selectedPostForDetail}
        onClose={() => setSelectedPostForDetail(null)}
        currentUser={user}
        currentLocation={currentLocation}
        lang={language}
        onUpdatePost={handleSaveUpdatedPost}
        onOpenChat={(p) => {
          setSelectedPostForDetail(null);
          setSelectedPostForChat(p);
        }}
        onConfirmCompletion={(p) => {
          setSelectedPostForDetail(null);
          setSelectedPostForConfirm(p);
        }}
        onRequireRegistration={() => setShowDemoRegisterPrompt(true)}
      />

      {/* 1.5. Quick Service Real-time Negotiation Chat Modal (Node 5) */}
      <QuickServiceChatModal
        isOpen={Boolean(selectedPostForChat)}
        post={selectedPostForChat}
        onClose={() => setSelectedPostForChat(null)}
        currentUser={user}
        lang={language}
        onUpdatePost={handleSaveUpdatedPost}
        onConfirmWorkflow={(p) => {
          setSelectedPostForChat(null);
          setSelectedPostForConfirm(p);
        }}
      />

      {/* 1.6. Quick Service Confirmation & Star Rating Workflow Modal (Node 6) */}
      <QuickServiceConfirmWorkflow
        isOpen={Boolean(selectedPostForConfirm)}
        post={selectedPostForConfirm}
        onClose={() => setSelectedPostForConfirm(null)}
        currentUser={user}
        lang={language}
        onUpdatePost={handleSaveUpdatedPost}
        onRefreshPosts={() => {
          setLocalHelpPosts((prev) => [...prev]);
        }}
      />

      {/* 1.5. Find For Me Request Form Modal (🔍 නැතිවූ දෑ සෙවීම) */}
      <FindForMeModal
        isOpen={isFindForMeModalOpen}
        onClose={() => {
          setIsFindForMeModalOpen(false);
          setEditingFindForMePost(null);
        }}
        onSubmitPost={handleCreatePost}
        currentLocation={currentLocation}
        currentUser={user}
        lang={language}
        editPost={editingFindForMePost}
        onUpdatePost={handleSaveEditedPost}
      />

      {/* 1.6. From Me To You Request Form Modal (🎁 පරිත්‍යාග / ♻️ ඉවත්කරන / 🔄 හුවමාරු) */}
      <FromMeToYouModal
        isOpen={isFromMeToYouModalOpen}
        onClose={() => {
          setIsFromMeToYouModalOpen(false);
          setEditingFromMeToYouPost(null);
        }}
        onSubmitPost={handleCreatePost}
        currentLocation={currentLocation}
        availableLocations={initialLocations}
        currentUser={user}
        lang={language}
        editPost={editingFromMeToYouPost}
        onUpdatePost={handleSaveEditedPost}
      />

      {/* 1.7. AI Voice SOS & Help Request Form Modal (🎙️ හඬ සහය) */}
      <AiVoiceHelpModal
        isOpen={isAiVoiceModalOpen}
        onClose={() => setIsAiVoiceModalOpen(false)}
        onSubmitPost={handleCreatePost}
        currentLocation={currentLocation}
        currentUser={user}
        lang={language}
      />

      {/* 2. Standard Help Post Form Modal (General Categories) */}
      <HelpPostModal
        isOpen={isHelpPostModalOpen}
        onClose={() => {
          setIsHelpPostModalOpen(false);
          setSelectedCategory(null);
        }}
        onSubmit={handleCreatePost}
        currentLocation={currentLocation}
        availableLocations={initialLocations}
        selectedCategory={selectedCategory}
        language={language}
      />

      {/* 3. Offer Support / Helper Application Modal */}
      <OfferSupportModal
        isOpen={Boolean(selectedPostForOffer)}
        onClose={() => setSelectedPostForOffer(null)}
        post={selectedPostForOffer}
        currentUser={user}
        language={language}
        onUpdatePost={handleSaveUpdatedPost}
      />

      {/* 4. Volunteer Support Opportunities Modal (Jobs / Gigs Hub) */}
      <VolunteerSupportModal
        isOpen={isVolunteerSupportModalOpen}
        onClose={() => setIsVolunteerSupportModalOpen(false)}
        currentUser={user}
        helpPosts={helpPosts}
        language={language}
        onSelectPost={(post) => {
          setIsVolunteerSupportModalOpen(false);
          setSelectedPostForDetail(post);
        }}
      />

      {/* 5. Support Offers Manager Modal (Poster Views & Selects Helpers) */}
      <SupportOffersModal
        isOpen={isSupportOffersModalOpen}
        onClose={() => {
          setIsSupportOffersModalOpen(false);
          setTargetPostForOffers(null);
        }}
        post={targetPostForOffers}
        currentUser={user}
        language={language}
        onUpdatePost={handleSaveUpdatedPost}
      />

      {/* 6. Edit Post Modal */}
      <EditHelpPostModal
        isOpen={Boolean(editingPost)}
        post={editingPost}
        onClose={() => setEditingPost(null)}
        onSave={handleSaveUpdatedPost}
        currentLocation={currentLocation}
        availableLocations={initialLocations}
        language={language}
      />

      {/* 7. View Post Full Evidence Modal */}
      <ViewHelpPostModal
        isOpen={Boolean(viewingPost)}
        post={viewingPost}
        onClose={() => setViewingPost(null)}
        language={language}
        currentLocation={currentLocation}
        currentUser={user}
        onRequireRegistration={() => setShowDemoRegisterPrompt(true)}
      />

      {/* 8. Delete Post Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingPost)}
        onClose={() => setDeletingPost(null)}
        onConfirm={handleConfirmDeletePost}
        postId={deletingPost?.id}
        language={language}
      />

      {/* 9. Message Inbox Modal (Poster-Helper Direct Communications) */}
      <MessageInboxModal
        isOpen={isInboxModalOpen}
        onClose={() => setIsInboxModalOpen(false)}
        currentUser={user}
        helpPosts={helpPosts}
        language={language}
        onSelectPostChat={(post) => {
          setIsInboxModalOpen(false);
          setSelectedPostForChat(post);
        }}
      />

      {/* 10. User Settings & Trust Profile Modal */}
      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={user}
        onUpdateUser={onUpdateUser}
        language={language}
        theme={theme}
        initialTab={settingsInitialTab}
      />

      {/* 11. User Credits & Community Coin Wallet Modal */}
      <UserWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        currentUser={user}
        onUpdateUser={onUpdateUser}
        language={language}
        theme={theme}
        onOpenQrPay={() => {
          setIsWalletModalOpen(false);
          setIsQrPayModalOpen(true);
        }}
      />

      {/* 12. Instant QR Payment & Barcode Transfer Modal */}
      <UserQrPayModal
        isOpen={isQrPayModalOpen}
        onClose={() => setIsQrPayModalOpen(false)}
        currentUser={user}
        onUpdateUser={onUpdateUser}
        language={language}
        theme={theme}
        initialTab={qrPayInitialTab}
        targetRecipient={qrPayTargetRecipient}
        usersList={users}
      />

      {/* 13. System Notifications Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        currentUser={user}
        language={language}
        onNotificationClick={handleOpenFromNotification}
        onClearAll={handleClearAllNotifications}
      />

      {/* 14. PickMe Audio & Push Alert Radar Config Modal */}
      <PickMeAlertSettingsModal
        isOpen={isPickMeAlertModalOpen}
        onClose={() => setIsPickMeAlertModalOpen(false)}
        currentUser={user}
        onUpdateUser={onUpdateUser}
        language={language}
        theme={theme}
      />

      {/* 15. Community Barter & Direct Exchange Modal */}
      <BarterExchangeModal
        isOpen={isBarterModalOpen}
        onClose={() => setIsBarterModalOpen(false)}
        currentUser={user}
        helpPosts={helpPosts}
        language={language}
        onOpenItemChat={(post) => {
          setIsBarterModalOpen(false);
          setSelectedPostForChat(post);
        }}
      />

      {/* 16. App Installation & PWA Offline Setup Modal */}
      <PWAInstallModal
        isOpen={isPwaInstallModalOpen}
        onClose={() => setIsPwaInstallModalOpen(false)}
        language={language}
      />

      {/* 17. Saved Places & Favorite Locations Modal */}
      <SavedPlacesModal
        isOpen={isSavedPlacesModalOpen}
        onClose={() => setIsSavedPlacesModalOpen(false)}
        currentUser={user}
        currentLocation={currentLocation}
        onSelectSavedLocation={(loc) => {
          setCurrentLocation(loc);
          setIsSavedPlacesModalOpen(false);
        }}
        language={language}
      />

      {/* 18. Quick Registration Hub for Unregistered Viewers */}
      <QuickRegistrationHubModal
        isOpen={isQuickRegistrationHubOpen}
        onClose={() => setIsQuickRegistrationHubOpen(false)}
        onProceedToRegister={() => {
          setIsQuickRegistrationHubOpen(false);
          if (onNavigate) onNavigate('register');
        }}
        language={language}
      />

      {/* 19. Sahaya Sewa Community App QR Code Display Modal */}
      <AppQrShareModal
        isOpen={isAppQrModalOpen}
        onClose={() => setIsAppQrModalOpen(false)}
        language={language}
      />

      {/* 20. Red Alert Incident Creation Modal */}
      <RedAlertCreateModal
        isOpen={isRedAlertCreateOpen}
        onClose={() => setIsRedAlertCreateOpen(false)}
        currentUser={user}
        currentLocation={currentLocation}
        onAlertCreated={(newAlert) => {
          if (setRedAlerts) {
            setRedAlerts((prev) => [newAlert, ...(prev || [])]);
          }
          setIsRedAlertCreateOpen(false);
        }}
        language={language}
      />

      {/* 21. Help Request Resolution Prompt Dialog (Post-Support) */}
      <ResolutionPromptModal
        isOpen={Boolean(resolutionPromptPost)}
        post={resolutionPromptPost}
        onClose={() => setResolutionPromptPost(null)}
        onConfirmResolved={(p) => handleConfirmPost(p)}
        onPostpone={(pid) => handlePostponeResolution(pid)}
        language={language}
      />

      {/* 22. Community Leaderboard & Hall of Fame Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardModalOpen}
        onClose={() => setIsLeaderboardModalOpen(false)}
        users={users}
        language={language}
      />

      {/* 23. Emergency Blood Donation & Medical Volunteer Network Modal */}
      <BloodAndDisasterModal
        isOpen={isBloodAndDisasterModalOpen}
        onClose={() => setIsBloodAndDisasterModalOpen(false)}
        currentUser={user}
        initialTab={bloodModalInitialTab}
        lang={language}
        onUpdateUser={onUpdateUser}
        onRequireRegistration={() => setShowDemoRegisterPrompt(true)}
        currentLocation={currentLocation}
      />

      {/* 24. Transparent Disaster Aid Ledger Modal (සහන ආධාර විනිවිදභාවය) */}
      <TransparentAidLedgerModal
        isOpen={isAidLedgerModalOpen}
        onClose={() => setIsAidLedgerModalOpen(false)}
        currentUser={user}
        lang={language}
        onUpdateUser={onUpdateUser}
        onRequireRegistration={() => setShowDemoRegisterPrompt(true)}
        currentLocation={currentLocation}
      />

      {/* 25. Emergency Services Hotline Directory Modal (119/1990/Hotlines) */}
      <EmergencyDirectoryModal
        isOpen={isEmergencyDirectoryModalOpen}
        onClose={() => setIsEmergencyDirectoryModalOpen(false)}
        currentUser={user}
        lang={language}
        onUpdateUser={onUpdateUser}
        onRequireRegistration={() => setShowDemoRegisterPrompt(true)}
        currentLocation={currentLocation}
      />

      {/* Demo Registration Prompt Modal */}
      <DemoRegistrationPromptModal
        isOpen={showDemoRegisterPrompt}
        onClose={() => setShowDemoRegisterPrompt(false)}
        onRegister={() => {
          setShowDemoRegisterPrompt(false);
          if (onNavigate) {
            onNavigate('register');
          } else if (onLogout) {
            onLogout();
          }
        }}
      />

      {/* 🚨 1-Tap Floating Red Alert Trigger */}
      <RedAlertFloatingTrigger
        userId={user.id}
        userName={user.name}
        currentUser={user}
        currentLocation={currentLocation}
        activeCount={activeRedAlertsCount || redAlerts.filter((a) => a && a.status === 'active').length}
        onOpenActiveList={() => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          const firstActive = redAlerts.find((a) => a && a.status === 'active');
          if (firstActive) {
            setSelectedAlertForDetail(firstActive);
          } else {
            setIsRedAlertCreateOpen(true);
          }
        }}
        onOpenSosTracker={() => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setIsSosLiveModalOpen(true);
        }}
        onOpenCreateModal={() => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setIsRedAlertCreateOpen(true);
        }}
      />

      {/* 🚨 Red Alert Detail & Incident Management Modal */}
      <RedAlertDetailModal
        isOpen={!!selectedAlertForDetail}
        alert={selectedAlertForDetail}
        onClose={() => setSelectedAlertForDetail(null)}
        currentUser={user}
        currentLocation={currentLocation}
        onAlertUpdated={(updated) => {
          if (setRedAlerts) {
            setRedAlerts((prev) => (prev || []).map((a) => (a && a.id === updated.id ? updated : a)));
          }
          setSelectedAlertForDetail(updated);
        }}
        onAlertDeleted={(deletedId) => {
          if (setRedAlerts) {
            setRedAlerts((prev) => (prev || []).filter((a) => a && a.id !== deletedId));
          }
          setSelectedAlertForDetail(null);
        }}
      />

      {/* 🚨 SOS Live GPS Tracker Modal */}
      <SosLiveTrackerModal
        isOpen={isSosLiveModalOpen}
        onClose={() => setIsSosLiveModalOpen(false)}
        currentUser={user}
        currentLocation={currentLocation}
        language={language}
      />

    </div>
  );
};

export default UserDashboard;

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { resolveExactLocation, toLocationOption } from '../utils/geoUtils';
import { checkIsAdmin } from '../utils/postOwnerHelper';
import { 
  ShieldCheck, 
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
  Pencil,
  HelpCircle, 
  Search, 
  Sparkles, 
  MapPin, 
  Globe, 
  PhoneCall, 
  HeartHandshake, 
  Wrench, 
  FileCheck2, 
  MessageCircle,
  MessageSquare,
  Gift,
  Plus,
  Zap,
  CheckCircle2,
  CheckCircle,
  Navigation,
  Loader2,
  Megaphone,
  ChevronRight,
  Briefcase,
  Store,
  Settings,
  Sliders,
  Type,
  Droplet,
  Radio,
  Award,
  Heart,
  Mic
} from 'lucide-react';

interface UserDashboardProps {
  user?: User;
  currentUser?: User;
  setCurrentUser?: (u: User | null) => void;
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
  setActiveRoleView?: (role: any) => void;
  onNavigate?: (view: any) => void;
  onOpenRedAlert?: () => void;
  activeRedAlertsCount?: number;
  redAlerts?: RedAlertItem[];
  onViewRedAlertDetail?: (alert: RedAlertItem) => void;
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
      if (!navigator.geolocation) return;

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

    // Always automatically fetch live GPS location on mount
    autoFetchLiveLocation();

    const handleModeChange = () => {
      autoFetchLiveLocation();
    };

    window.addEventListener('sahaya_location_mode_changed', handleModeChange);

    return () => {
      isMounted = false;
      window.removeEventListener('sahaya_location_mode_changed', handleModeChange);
    };
  }, []);

  // Help Posts Feed State (Synced with Firestore Database & Parent App)
  const [localHelpPosts, setLocalHelpPosts] = useState<HelpPost[]>(() => {
    try {
      localStorage.removeItem('sahaya_help_posts');
    } catch {}
    return filterNonDeletedPosts(initialHelpPosts);
  });

  // Effective synchronized help posts list: prefer propHelpPosts directly from parent
  const helpPosts = useMemo(() => {
    const list = propHelpPosts !== undefined ? propHelpPosts : localHelpPosts;
    return filterNonDeletedPosts(list || []);
  }, [propHelpPosts, localHelpPosts]);

  // Real-time Firestore subscription if not provided by parent
  useEffect(() => {
    if (propHelpPosts !== undefined) return;
    const unsubscribe = subscribeToHelpPosts((remotePosts) => {
      setLocalHelpPosts(remotePosts || []);
    });
    return () => unsubscribe();
  }, [propHelpPosts]);

  // Auto-focus / Auto-scroll to Notice Board section on initial page view so users immediately see help notices on landing
  useEffect(() => {
    const scrollToNotices = () => {
      const el = document.getElementById('help-notices-feed');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  const [isInboxModalOpen, setIsInboxModalOpen] = useState(false);
  const [isSupportOffersModalOpen, setIsSupportOffersModalOpen] = useState(false);
  const [isVolunteerSupportModalOpen, setIsVolunteerSupportModalOpen] = useState(false);
  const [targetPostForOffers, setTargetPostForOffers] = useState<HelpPost | null>(null);
  const [selectedCategoryTitle, setSelectedCategoryTitle] = useState<string>('');
  const [selectedCategoryObj, setSelectedCategoryObj] = useState<CategoryItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAiVoiceModalOpen, setIsAiVoiceModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
  const [isFindForMeModalOpen, setIsFindForMeModalOpen] = useState(false);
  const [isFromMeToYouModalOpen, setIsFromMeToYouModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'font_size'>('profile');
  
  // User Wallet & Insufficient Credits Modals (Credit System)
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [insufficientCreditsState, setInsufficientCreditsState] = useState<{
    isOpen: boolean;
    requiredAmount: number;
    currentBalance: number;
    categoryName?: string;
  } | null>(null);

  // New Community Features: Blood & Disaster Hub, Offline Directory, Lowest Market Prices
  const [isBloodAndDisasterModalOpen, setIsBloodAndDisasterModalOpen] = useState(false);
  const [bloodModalInitialTab, setBloodModalInitialTab] = useState<'blood_requests' | 'volunteer_donors'>('blood_requests');
  const [isAidLedgerModalOpen, setIsAidLedgerModalOpen] = useState(false);
  const [isEmergencyDirectoryModalOpen, setIsEmergencyDirectoryModalOpen] = useState(false);
  const [isLowestPricesModalOpen, setIsLowestPricesModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isPickMeAlertModalOpen, setIsPickMeAlertModalOpen] = useState(false);
  const [isAssistantChatOpen, setIsAssistantChatOpen] = useState(false);
  const [isBarterModalOpen, setIsBarterModalOpen] = useState(false);
  const [isQrPayModalOpen, setIsQrPayModalOpen] = useState(false);
  const [qrPayInitialTab, setQrPayInitialTab] = useState<'my_qr' | 'scan_pay'>('scan_pay');
  const [isSosLiveModalOpen, setIsSosLiveModalOpen] = useState(false);
  const [isFeaturesPostModalOpen, setIsFeaturesPostModalOpen] = useState(false);
  const [isRedAlertCreateOpen, setIsRedAlertCreateOpen] = useState(false);
  const [selectedAlertForDetail, setSelectedAlertForDetail] = useState<RedAlertItem | null>(null);
  
  // 🌟 Universal Quick Registration Hub & Web QR Modals
  const [isQuickRegistrationHubOpen, setIsQuickRegistrationHubOpen] = useState(false);
  const [isAppQrModalOpen, setIsAppQrModalOpen] = useState(false);
  const [isRegisterProfessionalModalOpen, setIsRegisterProfessionalModalOpen] = useState(false);
  const [isMarketplaceAddShopModalOpen, setIsMarketplaceAddShopModalOpen] = useState(false);
  const [marketplaceShopModalType, setMarketplaceShopModalType] = useState<'shop' | 'business'>('shop');

  // Market shops state
  const [marketShops, setMarketShops] = useState<MarketShop[]>(() => {
    return getStoredMarketShops();
  });

  const handleSaveMarketShop = (newShop: MarketShop) => {
    const updated = [newShop, ...marketShops.filter((s) => s && s.id !== newShop.id)];
    setMarketShops(updated);
    saveMarketShopsToStorage(updated);
  };

  const [qrPayTargetRecipient, setQrPayTargetRecipient] = useState<{
    userId: string;
    name: string;
    phone?: string;
    fixedAmount?: number;
  } | undefined>(undefined);

  // Navigation handler when user clicks a notification toast or modal item
  const handleOpenFromNotification = (notif: AppNotification) => {
    if (notif.targetPostId) {
      const matched = (helpPosts || []).find((p) => p && p.id === notif.targetPostId);
      if (matched) {
        setSelectedPostForDetail(matched);
        return;
      }
    }
    if (notif.targetModal === 'quick_service') {
      setBoardCategoryFilter('quick_services');
      setSelectedCategoryTitle('ඉක්මන් සේවා (Quick Services)');
      setFeedDistanceTab('local');
    } else if (notif.targetModal === 'blood') {
      setBloodModalInitialTab('blood_requests');
      setIsBloodAndDisasterModalOpen(true);
    } else if (notif.targetModal === 'aid_ledger') {
      setIsAidLedgerModalOpen(true);
    } else if (notif.targetModal === 'find_for_me') {
      setBoardCategoryFilter('find_for_me');
      setSelectedCategoryTitle('සොයාදෙන්න (Find For Me)');
      setFeedDistanceTab('all_sl');
    } else if (notif.targetModal === 'from_me_to_you') {
      setBoardCategoryFilter('from_me_to_you');
      setSelectedCategoryTitle('මගෙන් ඔබට (From Me To You)');
      setFeedDistanceTab('all_sl');
    } else if (notif.targetModal === 'group_work') {
      setBoardCategoryFilter('group_work');
      setSelectedCategoryTitle('ශ්‍රමදාන / කණ්ඩායම් වැඩ');
      setFeedDistanceTab('local');
    }
  };

  // User Trust Profile
  const trustProfile = useMemo(() => {
    return calculateTrustProfile(user, helpPosts);
  }, [user, helpPosts]);

  // Total replies / conversations count for user (as poster or responder)
  const inboxRepliesCount = useMemo(() => {
    const normalizePhone = (phone?: string) => (phone ? phone.replace(/\D/g, '') : '');
    const userPhoneClean = normalizePhone(user?.phone || user?.whatsappNumber);

    const isUserPostAuthor = (post: HelpPost) => {
      if (!post) return false;
      const postPhoneClean = normalizePhone(post.userPhone);
      const isPhoneMatch = Boolean(
        userPhoneClean &&
          postPhoneClean &&
          (userPhoneClean === postPhoneClean ||
            userPhoneClean.endsWith(postPhoneClean.slice(-7)) ||
            postPhoneClean.endsWith(userPhoneClean.slice(-7)))
      );
      const isIdMatch = Boolean(
        (user?.userId && (post.userId === user.userId || post.userId === user.id)) ||
        (user?.id && (post.userId === user.id || post.userId === user.userId))
      );
      const isNameMatch = Boolean(
        user?.name &&
        post?.userName &&
        (post.userName || '').trim().toLowerCase() === (user.name || '').trim().toLowerCase()
      );
      return isPhoneMatch || isIdMatch || isNameMatch;
    };

    const isUserHelperOnPost = (post: HelpPost) => {
      if (!post || isUserPostAuthor(post)) return false;
      const replies = post.replies || [];
      return replies.some((r) => {
        if (!r) return false;
        const repPhone = normalizePhone(r.responderPhone);
        const isPhone = Boolean(userPhoneClean && repPhone && (userPhoneClean === repPhone || userPhoneClean.endsWith(repPhone.slice(-7))));
        const isName = Boolean(user?.name && r.responderName && r.responderName.trim().toLowerCase() === user.name.trim().toLowerCase());
        return isPhone || isName;
      });
    };

    let totalReplies = 0;
    (helpPosts || []).forEach((post) => {
      if (!post || post.isDeleted) return;
      if (isUserPostAuthor(post) || isUserHelperOnPost(post)) {
        const reps = post.replies || [];
        totalReplies += reps.length;
      }
    });
    return totalReplies;
  }, [user, helpPosts]);
  
  // Detail, Chat and Confirm Modals from PDF plan:
  const [selectedPostForDetail, setSelectedPostForDetail] = useState<HelpPost | null>(null);
  const [selectedPostForChat, setSelectedPostForChat] = useState<HelpPost | null>(null);
  const [selectedPostForConfirm, setSelectedPostForConfirm] = useState<HelpPost | null>(null);
  const [selectedPostToReply, setSelectedPostToReply] = useState<HelpPost | null>(null);
  const [postponedResolutionPostIds, setPostponedResolutionPostIds] = useState<string[]>([]);

  // Owner Action Modals (Edit, View, Delete)
  const [editingPost, setEditingPost] = useState<HelpPost | null>(null);
  const [editingQuickServicePost, setEditingQuickServicePost] = useState<HelpPost | null>(null);
  const [editingFindForMePost, setEditingFindForMePost] = useState<HelpPost | null>(null);
  const [editingFromMeToYouPost, setEditingFromMeToYouPost] = useState<HelpPost | null>(null);
  const [viewingPost, setViewingPost] = useState<HelpPost | null>(null);
  const [deletingPost, setDeletingPost] = useState<HelpPost | null>(null);

  // Admin Moderation & Poster Response State
  const [moderatingPost, setModeratingPost] = useState<HelpPost | null>(null);
  const [posterRespondingPost, setPosterRespondingPost] = useState<HelpPost | null>(null);

  const handleConfirmAdminFlag = async (
    postId: string,
    flagReason: string,
    hidePost: boolean,
    customNote?: string
  ) => {
    const targetPost = (helpPosts || []).find((p) => p && p.id === postId);
    if (!targetPost) return;

    const combinedReason = customNote 
      ? `${flagReason} - සටහන: ${customNote}`
      : flagReason;

    const nowIso = new Date().toISOString();
    const updated: HelpPost = {
      ...targetPost,
      adminFlagged: true,
      adminFlagReason: combinedReason,
      adminFlaggedAt: nowIso,
      adminFlaggedBy: user.name || 'පරිපාලක (Admin)',
      isHiddenByAdmin: hidePost,
      moderationStatus: 'flagged',
    };

    if (propOnUpdatePost) {
      propOnUpdatePost(updated);
    } else {
      setLocalHelpPosts((prev) => (prev || []).map((p) => (p && p.id === postId ? updated : p)));
    }

    if (selectedPostForDetail?.id === postId) setSelectedPostForDetail(updated);
    if (selectedPostForChat?.id === postId) setSelectedPostForChat(updated);

    try {
      await updateHelpPostInFirestore(postId, {
        adminFlagged: true,
        adminFlagReason: combinedReason,
        adminFlaggedAt: nowIso,
        adminFlaggedBy: user.name || 'පරිපාලක (Admin)',
        isHiddenByAdmin: hidePost,
        moderationStatus: 'flagged',
      });

      // Send automated notification chat message to the post owner
      await sendChatMessageToFirestore(postId, {
        senderName: '🛡️ පරිපාලක (Admin)',
        senderRole: 'admin',
        text: `⚠️ [පරිපාලක නිවේදනය]: ඔබේ දැන්වීමේ ගැටලුවක් නිරීක්ෂණය විය: "${combinedReason}". ${
          hidePost ? 'දැන්වීම තාවකාලිකව අනෙක් අයට නොපෙනෙන සේ සඟවා ඇත (Hidden).' : ''
        } කරුණාකර දැන්වීම සංශෝධනය කර මෙහි පිළිතුරු යවන්න.`,
        timestamp: 'දැන්',
        senderPhone: '119 / Admin',
      });
    } catch (err) {
      console.error('Failed to update admin flag in Firestore:', err);
    }
  };
  const handleRestorePostByAdmin = async (postId: string) => {
    const targetPost = (helpPosts || []).find((p) => p && p.id === postId);
    if (!targetPost) return;

    const updated: HelpPost = {
      ...targetPost,
      adminFlagged: false,
      adminFlagReason: undefined,
      isHiddenByAdmin: false,
      moderationStatus: 'approved',
    };

    if (propOnUpdatePost) {
      propOnUpdatePost(updated);
    } else {
      setLocalHelpPosts((prev) => (prev || []).map((p) => (p && p.id === postId ? updated : p)));
    }

    if (selectedPostForDetail?.id === postId) setSelectedPostForDetail(updated);
    if (selectedPostForChat?.id === postId) setSelectedPostForChat(updated);

    try {
      await updateHelpPostInFirestore(postId, {
        adminFlagged: false,
        adminFlagReason: '',
        isHiddenByAdmin: false,
        moderationStatus: 'approved',
      });

      await sendChatMessageToFirestore(postId, {
        senderName: '🛡️ පරිපාලක (Admin)',
        senderRole: 'admin',
        text: `✅ [පරිපාලක නිවේදනය]: දැන්වීම පරීක්ෂා කර නැවත සක්‍රීය (Restore / Unhide) කරන ලදී. සියලු පරිශීලකයන්ට දැන් දැකගත හැක.`,
        timestamp: 'දැන්',
        senderPhone: '119 / Admin',
      });
    } catch (err) {
      console.error('Failed to restore post in Firestore:', err);
    }
  };

  const handlePosterSubmitCorrection = async (postId: string, responseNote: string) => {
    const targetPost = (helpPosts || []).find((p) => p && p.id === postId);
    if (!targetPost) return;

    const nowIso = new Date().toISOString();
    const updated: HelpPost = {
      ...targetPost,
      posterCorrectionNote: responseNote,
      posterRespondedAt: nowIso,
      moderationStatus: 'pending_review',
    };

    if (propOnUpdatePost) {
      propOnUpdatePost(updated);
    } else {
      setLocalHelpPosts((prev) => (prev || []).map((p) => (p && p.id === postId ? updated : p)));
    }

    if (selectedPostForDetail?.id === postId) setSelectedPostForDetail(updated);
    if (selectedPostForChat?.id === postId) setSelectedPostForChat(updated);

    try {
      await updateHelpPostInFirestore(postId, {
        posterCorrectionNote: responseNote,
        posterRespondedAt: nowIso,
        moderationStatus: 'pending_review',
      });

      await sendChatMessageToFirestore(postId, {
        senderName: user.name || 'දැන්වීම්කරු',
        senderRole: 'seeker',
        text: `📝 [දැන්වීම්කරුගේ සංශෝධනය]: "${responseNote}" - පරිපාලක කරුණාකර නැවත පරීක්ෂා කර Unhide කරදෙන්න.`,
        timestamp: 'දැන්',
        senderPhone: user.phone || '',
      });
    } catch (err) {
      console.error('Failed to submit poster correction in Firestore:', err);
    }
  };

  const handleEditPost = (post: HelpPost) => {
    if (!post) return;
    setEditingPost(post);
  };

  const handleToggleHidePost = async (post: HelpPost) => {
    if (!post || !post.id) return;
    const isCurrentlyHidden = Boolean(post.isHidden || post.isHiddenByAdmin || post.status === 'hidden');
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

    window.dispatchEvent(new Event('sahaya_post_deleted'));

    setDeletingPost(null);
    setViewingPost(null);
    setSelectedPostForDetail(null);

    // 3. Permanent Cleanup from Cloud
    try {
      const deletedPayload: Partial<HelpPost> = {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: checkIsAdmin(user) ? `Admin (${user.name})` : (user.name || postToDelete?.userName || 'User'),
        status: 'deleted',
      };
      await updateHelpPostInFirestore(postId, deletedPayload).catch(() => {});
      await deleteHelpPostFromFirestore(postId).catch(() => {});
    } catch (err) {
      console.warn('Deleted locally, cloud notice:', err);
    }
  };

  // Service Request Modal State
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Tag Filtering State
  const [allTags, setAllTags] = useState<TagItem[]>(() => getStoredTags());
  const [selectedTagFilter, setSelectedTagFilter] = useState<TagItem | null>(null);

  // Sync tags on mount or post updates
  useEffect(() => {
    setAllTags(getStoredTags());
  }, [helpPosts]);

  // Persist storage
  useEffect(() => {
    localStorage.setItem('sahaya_current_location', JSON.stringify(currentLocation));
  }, [currentLocation]);

  // Recalculate distance from current active location
  const getPostDistance = (post: HelpPost) => {
    const curLat = currentLocation?.lat;
    const curLng = currentLocation?.lng;
    if (!post?.lat || !post?.lng || typeof curLat !== 'number' || typeof curLng !== 'number') {
      return post?.distanceKm || 20;
    }
    const R = 6371; // km
    const dLat = (post.lat - curLat) * Math.PI / 180;
    const dLng = (post.lng - curLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(curLat * Math.PI / 180) * Math.cos(post.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d === 0 ? 0.8 : d;
  };

  // Check if a help post has fulfilled its required number of helpers or is completed/confirmed
  const isHelpPostComplete = (post: HelpPost): boolean => {
    if (!post) return false;
    if (post.isDeleted || post.status === 'deleted') return true;
    if (post.isCompleted || post.status === 'completed') return true;
    if (post.isConfirmed || post.status === 'confirmed') return true;

    const neededHelpers = post.helpersNeeded && post.helpersNeeded > 0 ? post.helpersNeeded : 1;
    const acceptedRepliesCount = (post.replies || []).filter(
      (r) => r.isAccepted || r.isConfirmed
    ).length;
    const acceptedCount = Math.max(post.helpersAccepted || 0, acceptedRepliesCount);

    return acceptedCount >= neededHelpers;
  };

  // Category & Distance & Tag Filtering Logic
  const filteredPosts = (helpPosts || []).filter((post) => {
    if (!post || !post.id || post.isDeleted || post.status === 'deleted' || isPostPermanentlyDeleted(post.id)) return false;

    // Check if post author is blocked or deleted by admin
    if (isAuthorBlocked(post)) {
      const isViewerAdmin = checkIsAdmin(user);
      if (!isViewerAdmin) {
        return false;
      }
    }

        // Check Auto-Hidden by Reports (5 or more reports received)
    if (post.isHidden || (post.reportsCount && post.reportsCount >= 5)) {
      const isViewerAdmin = checkIsAdmin(user);
      if (!isViewerAdmin) {
        return false;
      }
    }

    // Check Hidden by Admin:
    // If hidden by admin, only Admin or the Post Owner can see it (to rectify/respond)
    if (post.isHiddenByAdmin) {
      const isPostOwner = 
        (user?.id && post.userId === user.id) ||
        (user?.userId && post.userId === user.userId) ||
        (post.userName && user?.name && post.userName.trim().toLowerCase() === user.name.trim().toLowerCase()) ||
        (post.userPhone && user?.phone && post.userPhone.trim() === user.phone.trim());
      
      const isViewerAdmin = checkIsAdmin(user);

      if (!isViewerAdmin && !isPostOwner) {
        return false;
      }
    }

    const dist = getPostDistance(post);
    let matchesDistance = true;

    let matchesCategory = true;
    if (boardCategoryFilter) {
      if (boardCategoryFilter === 'by_distance') {
        matchesCategory = dist <= maxDistanceRadius;
      } else if (boardCategoryFilter === 'quick_services') {
        matchesCategory = post.category === 'quick_services' || post.category === 'quick' || post.tagCategory === 'ඉක්මන් සේවා' || Boolean(post.tagName?.toLowerCase().includes('quick')) || Boolean(post.tagName?.includes('හදිසි'));
      } else if (boardCategoryFilter === 'normal_services') {
        const isQuick = post.category === 'quick_services' || post.category === 'quick' || post.tagCategory === 'ඉක්මන් සේවා' || Boolean(post.tagName?.toLowerCase().includes('quick')) || Boolean(post.tagName?.includes('හදිසි'));
        matchesCategory = !isQuick && (post.category === 'normal_services' || post.category === 'services' || post.category === 'general' || !post.category || post.serviceType === 'normal_services');
      } else {
        matchesCategory = post.category === boardCategoryFilter || post.serviceType === boardCategoryFilter || post.tagCategory === boardCategoryFilter;
      }
    }

    if (boardCategoryFilter !== 'by_distance' && feedDistanceTab === 'local') {
      matchesDistance = dist <= 15 || Boolean(post.isPinnedEmergency || post.priorityLevel === 'emergency' || post.postCode?.startsWith('#BLD-') || post.postCode?.startsWith('#EMG-'));
    }

    const query = searchQuery.toLowerCase().trim();

    // Tag Filter Check
    let matchesTagFilter = true;
    if (selectedTagFilter) {
      const tagN = (selectedTagFilter.tagName || '').toLowerCase();
      const tagC = (selectedTagFilter.category || '').toLowerCase();
      const postWhatHappened = (post.whatHappened || '').toLowerCase();
      const postWhatIsNeeded = (post.whatIsNeeded || '').toLowerCase();
      matchesTagFilter =
        Boolean(post.tagName && post.tagName.toLowerCase() === tagN) ||
        Boolean(post.tagCategory && post.tagCategory.toLowerCase() === tagC) ||
        Boolean(tagN && postWhatHappened.includes(tagN)) ||
        Boolean(tagC && postWhatHappened.includes(tagC)) ||
        Boolean(tagN && postWhatIsNeeded.includes(tagN)) ||
        Boolean(tagC && postWhatIsNeeded.includes(tagC));
    }

    // Query Keyword & Ad Code (#HELP-3728) Check (with Smart Synonym / Alias Expansion)
    let matchesQuery = true;
    if (query) {
      const cleanRawQuery = query.replace(/[@#\s-]/g, '').toLowerCase();
      const rawPostCode = (post.postCode || '').replace(/[@#\s-]/g, '').toLowerCase();
      const rawPostId = (post.id || '').replace(/[@#\s-]/g, '').toLowerCase();
      const numericQuery = query.replace(/\D/g, '');
      const numericPostCode = (post.postCode || '').replace(/\D/g, '');
      const entitySerial = getEntitySerialNumber(post, 'post');

      const isDirectAdCodeMatch = Boolean(
        (query.startsWith('@') && (entitySerial.includes(numericQuery) || rawPostCode.includes(cleanRawQuery))) ||
        (post.postCode && post.postCode.toLowerCase().includes(query)) ||
        (post.id && post.id.toLowerCase().includes(query)) ||
        (numericQuery.length === 9 && (post.invoiceNumber === numericQuery || post.serviceBill?.invoiceNumber === numericQuery)) ||
        (cleanRawQuery.includes('inv') && post.invoiceNumber && cleanRawQuery.includes(post.invoiceNumber.toLowerCase())) ||
        (cleanRawQuery.length >= 2 && (rawPostCode.includes(cleanRawQuery) || rawPostId.includes(cleanRawQuery) || entitySerial.includes(cleanRawQuery))) ||
        (numericQuery.length >= 2 && (numericPostCode.includes(numericQuery) || entitySerial.includes(numericQuery)))
      );

      if (isDirectAdCodeMatch) {
        matchesQuery = true;
      } else {
        const searchKeywords = getExpandedSearchKeywords(query);
        const postText = `${post.tagName || ''} ${post.tagCategory || ''} ${post.whatHappened || ''} ${post.whatIsNeeded || ''} ${post.userName || ''} ${post.locationName || ''} ${post.postCode || ''} ${post.id || ''}`.toLowerCase();
        
        matchesQuery = searchKeywords.some((kw) => postText.includes(kw)) || postText.includes(query);
      }
    }

    // Auto-hide fulfilled / completed posts from general public feed
    const isFulfilled = Boolean(
      (post.isConfirmed && (post.helpersAccepted || 1) >= (post.helpersNeeded || 1)) ||
      post.status === 'confirmed' ||
      post.status === 'completed'
    );
    const isMyPost = checkIsPostOwner(user, post);
    const isAcceptedHelper = Boolean(post.selectedHelpers?.some(h => h.helperId === user?.userId || h.helperId === user?.id));

    if (isFulfilled && !isMyPost && !isAcceptedHelper && boardCategoryFilter !== 'my_posts' && !query) {
      return false;
    }

    return matchesDistance && matchesCategory && matchesTagFilter && matchesQuery;
  }).sort((a, b) => {
    // 0. Poster Priority: User's own active posts appear at the VERY TOP of the feed!
    const aIsMyActive = checkIsPostOwner(user, a) && (a.status === 'active' || !a.status);
    const bIsMyActive = checkIsPostOwner(user, b) && (b.status === 'active' || !b.status);
    if (aIsMyActive && !bIsMyActive) return -1;
    if (!aIsMyActive && bIsMyActive) return 1;

    // 1. Boosted Priority: Boosted ads come first within the feed / category
    const aIsBoosted = Boolean(a.isBoosted);
    const bIsBoosted = Boolean(b.isBoosted);
    if (aIsBoosted && !bIsBoosted) return -1;
    if (!aIsBoosted && bIsBoosted) return 1;

    // 2. Quick Service Priority: Quick services come next
    const aIsQuick = a.category === 'quick_services' || a.category === 'quick' || a.tagCategory === 'ඉක්මන් සේවා' || Boolean(a.tagName?.toLowerCase().includes('quick')) || Boolean(a.tagName?.includes('හදිසි'));
    const bIsQuick = b.category === 'quick_services' || b.category === 'quick' || b.tagCategory === 'ඉක්මන් සේවා' || Boolean(b.tagName?.toLowerCase().includes('quick')) || Boolean(b.tagName?.includes('හදිසි'));
    if (aIsQuick && !bIsQuick) return -1;
    if (!aIsQuick && bIsQuick) return 1;

    // 3. Chronological sorting (newest first)
    const timeA = a.createdAtMs || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const timeB = b.createdAtMs || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
    if (timeA && timeB && timeA !== timeB) {
      return timeB - timeA;
    }

    if (boardCategoryFilter === 'by_distance') {
      return getPostDistance(a) - getPostDistance(b);
    }
    return 0;
  });

  // User's total received replies across all their posts
  const myPosts = (helpPosts || []).filter((post) => {
    if (!post || post.isDeleted) return false;
    return checkIsPostOwner(user, post);
  });

  // Flagged posts by Admin for current logged-in user
  const myFlaggedPosts = (myPosts || []).filter(
    (post) => post.adminFlagged && !post.isDeleted && post.status !== 'deleted'
  );

  // Helper matching function to find posts where current user was selected as a helper
  const currentUserName = (user?.name || '').trim().toLowerCase();
  const currentUserPhone = (user?.phone || '').trim().replace(/^0/, '');
  const currentUserId = (user?.userId || user?.id || '').trim();

  const isHelperMatchingUser = (responderName?: string, responderPhone?: string) => {
    if (!responderName && !responderPhone) return false;
    const rName = (responderName || '').trim().toLowerCase();
    const rPhone = (responderPhone || '').trim().replace(/^0/, '');

    const nameMatch = currentUserName && rName && (rName === currentUserName || rName.includes(currentUserName) || currentUserName.includes(rName));
    const phoneMatch = currentUserPhone && rPhone && (rPhone.includes(currentUserPhone) || currentUserPhone.includes(rPhone));

    return Boolean(nameMatch || phoneMatch);
  };

  // Find posts where the post owner confirmed/selected the current user as helper
  const postsWhereIWasSelected = (helpPosts || []).filter((post) => {
    if (!post || post.status === 'deleted' || post.isDeleted) return false;
    const isMyOwnPost = post.userId === currentUserId || (post.userName && post.userName.trim().toLowerCase() === currentUserName);
    if (isMyOwnPost) return false;

    const isConfirmedHelperDirect = post.isConfirmed && (
      (post.confirmedHelperName && isHelperMatchingUser(post.confirmedHelperName, post.confirmedHelperPhone)) ||
      (post.confirmedBy && isHelperMatchingUser(post.confirmedBy))
    );

    const matchingConfirmedReply = (post.replies || []).some((rep) =>
      rep && isHelperMatchingUser(rep.responderName, rep.responderPhone) && (rep.isAccepted || rep.isConfirmed || isConfirmedHelperDirect)
    );

    return isConfirmedHelperDirect || matchingConfirmedReply;
  });

  const selectedAsHelperCount = postsWhereIWasSelected.length;

  // Calculate pending unconfirmed offers count (reduces when helper is selected/confirmed)
  const totalUserReplies = myPosts.reduce((acc, p) => {
    if (p.isConfirmed || p.status === 'confirmed') return acc;
    const pendingReplies = p.replies ? p.replies.filter((r) => !r.isAccepted && !r.isConfirmed) : [];
    return acc + pendingReplies.length;
  }, 0);

  // Handler for adding new help request post (Step 3.1 & Quick Services)
  const handleCreatePost = async (
    newPostData: Omit<HelpPost, 'id' | 'postCode' | 'createdAt' | 'repliesCount' | 'helpersCount' | 'replies'>
  ): Promise<{ success: boolean; error?: string; postId?: string }> => {
    const categoryToSave = newPostData.category || 'quick_services';
    const postTitle =
      newPostData.whatHappened ||
      newPostData.whatIsNeeded ||
      newPostData.itemLostStolenOrSearched ||
      newPostData.donationItem ||
      'දැන්වීම් පළකිරීම';
    const tempPostCode = `#POST-${Math.floor(1000 + Math.random() * 9000)}`;

    // Rule: "මෙහි ඇති සියලු දැන්විම් පොරම් (form) ක්‍රියාත්මක විය යුත්තේ credit ක්‍රමයක් යටතේය."
    // Verify user credit balance and deduct posting fee (Allow demo users and emergency requests)
    const deduction = deductPostingFee(user, categoryToSave, postTitle, tempPostCode);

    if (!deduction.success && user && !user.isDemo && user.status === 'approved') {
      setInsufficientCreditsState({
        isOpen: true,
        requiredAmount: deduction.requiredAmount,
        currentBalance: deduction.currentBalance,
        categoryName: selectedCategoryTitle || categoryToSave,
      });
      return { success: false, error: 'insufficient_credits' };
    }

    // Update user state with new balance
    if (onUpdateUser && deduction.success) {
      onUpdateUser({
        ...user,
        credits: deduction.newBalance,
      });
    }

    const nowMs = Date.now();
    const nowIso = new Date().toISOString();

    const postToSave = {
      ...newPostData,
      userId: user?.userId || user?.id || 'demo_user',
      category: categoryToSave,
      createdAtMs: nowMs,
      createdAtIso: nowIso,
    };

    // Reset category filter so the newly created post is instantly visible in the main Notice Board feed
    setBoardCategoryFilter('');
    setSelectedCategoryTitle('');

    let createdId = `post_${nowMs}`;
    try {
      createdId = await addHelpPostToFirestore(postToSave);
    } catch (e) {
      console.error('Failed to add post to Firestore, updating local state as fallback', e);
    }

    const newPost: HelpPost = {
      ...postToSave,
      id: createdId,
      postCode: tempPostCode,
      createdAt: 'මීට සුළු මොහොතකට පෙර',
      createdAtMs: nowMs,
      createdAtIso: nowIso,
      repliesCount: 0,
      helpersCount: 1,
      replies: [],
    };
    if (onAddPost) {
      onAddPost(newPost);
    }
    setLocalHelpPosts((prev) => [newPost, ...prev.filter(p => p.id !== createdId)]);
    window.dispatchEvent(new CustomEvent('sahaya_new_post_published', { detail: { post: newPost } }));

    // Scroll directly to the Notice Board (දැන්වීම් පුවරුව) so user sees their new post immediately
    setTimeout(() => {
      const el = document.getElementById('help-notices-feed');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 250);

    // Broadcast live notification across the app with audio chime & push alert
    try {
      if (categoryToSave === 'blood_disaster' || postToSave.whatHappened?.includes('ලේ') || postToSave.whatIsNeeded?.includes('ලේ')) {
        broadcastAppNotification({
          type: 'emergency_blood',
          title: '🩸 හදිසි රුධිර / ආපදා ඉල්ලීමක්!',
          message: `${postTitle} - ${postToSave.locationName || 'දිවයින පුරා'}`,
          locationName: postToSave.locationName,
          badgeText: 'URGENT BLOOD',
          targetModal: 'blood',
        });
      } else if (categoryToSave === 'quick_services') {
        broadcastAppNotification({
          type: 'quick_service',
          title: `⚡ නව ඉක්මන් සේවාවක්: ${postToSave.tagName || 'හදිසි සේවා'}`,
          message: `${postTitle} - ${postToSave.locationName || 'ලඟම ප්‍රදේශය'}`,
          locationName: postToSave.locationName,
          badgeText: 'QUICK SERVICE',
          targetModal: 'quick_service',
        });
      } else if (categoryToSave === 'find_for_me') {
        broadcastAppNotification({
          type: 'find_for_me',
          title: `🔍 සොයාදෙන්න ඉල්ලීමක්: ${postToSave.itemLostStolenOrSearched || 'භාණ්ඩයක් / පුද්ගලයෙක්'}`,
          message: `${postTitle} - ${postToSave.locationName || ''}`,
          locationName: postToSave.locationName,
          badgeText: 'FIND FOR ME',
          targetModal: 'find_for_me',
        });
      } else if (categoryToSave === 'from_me_to_you') {
        broadcastAppNotification({
          type: 'from_me_to_you',
          title: `🎁 මගෙන් ඔබට නොමිලේ දීමනාවක්: ${postToSave.donationItem || 'පරිත්‍යාගයක්'}`,
          message: `${postTitle} - ${postToSave.locationName || ''}`,
          locationName: postToSave.locationName,
          badgeText: 'FREE GIFT',
          targetModal: 'from_me_to_you',
        });
      } else if (categoryToSave === 'group_work') {
        broadcastAppNotification({
          type: 'group_work',
          title: `👥 ශ්‍රමදාන / කණ්ඩායම් සහය: ${postToSave.groupWorkTitle || 'ප්‍රජා වැඩක්'}`,
          message: `${postTitle} - ${postToSave.locationName || ''}`,
          locationName: postToSave.locationName,
          badgeText: 'GROUP WORK',
          targetModal: 'group_work',
        });
      } else {
        broadcastAppNotification({
          type: 'general',
          title: `📢 නව සහය ඉල්ලීමක්: ${postToSave.tagName || selectedCategoryTitle || 'සහය'}`,
          message: `${postTitle} - ${postToSave.locationName || ''}`,
          locationName: postToSave.locationName,
          badgeText: 'NEW POST',
        });
      }
    } catch (notifErr) {
      console.warn('Error broadcasting post notification:', notifErr);
    }

    return { success: true, postId: createdId };
  };
  // Helper function to accept a specific helper offer and reduce count immediately
  const handleAcceptHelperOffer = async (post: HelpPost, reply: PostReply) => {
    const updatedReplies = (post.replies || []).map((r) =>
      r.id === reply.id ? { ...r, isAccepted: true, isConfirmed: true } : r
    );

    const neededHelpers = post.helpersNeeded && post.helpersNeeded > 0 ? post.helpersNeeded : 1;
    const acceptedCount = updatedReplies.filter((r) => r.isAccepted || r.isConfirmed).length;
    const isComplete = acceptedCount >= neededHelpers;

    const updatedPost: HelpPost = {
      ...post,
      replies: updatedReplies,
      helpersAccepted: acceptedCount,
      isConfirmed: isComplete ? true : post.isConfirmed,
      confirmedBy: reply.responderName || user.name,
      confirmedHelperName: reply.responderName || post.confirmedHelperName || '',
      confirmedHelperPhone: reply.responderPhone || post.confirmedHelperPhone || '',
      confirmedAt: new Date().toISOString(),
      status: isComplete ? 'confirmed' : (post.status || 'active'),
    };

    if (propOnUpdatePost) {
      propOnUpdatePost(updatedPost);
    } else {
      setLocalHelpPosts((prev) =>
        (prev || []).map((p) => (p && post && p.id === post.id ? updatedPost : p))
      );
    }

    try {
      await updateHelpPostInFirestore(post.id, {
        replies: updatedReplies,
        helpersAccepted: acceptedCount,
        isConfirmed: updatedPost.isConfirmed,
        confirmedBy: updatedPost.confirmedBy,
        confirmedHelperName: updatedPost.confirmedHelperName,
        confirmedHelperPhone: updatedPost.confirmedHelperPhone,
        confirmedAt: updatedPost.confirmedAt,
        status: updatedPost.status,
      });
    } catch (err) {
      console.error('Failed to update helper acceptance in Firestore:', err);
    }
  };

  // Helper function to cancel / remove an unwanted helper offer / response
  const handleCancelHelperOffer = async (post: HelpPost, reply: PostReply) => {
    const updatedReplies = (post.replies || []).filter((r) => 
      r && reply && r.id !== reply.id && (reply.id !== 'confirmed_helper' || r.responderName !== reply.responderName)
    );
    const neededHelpers = post.helpersNeeded && post.helpersNeeded > 0 ? post.helpersNeeded : 1;
    const acceptedCount = updatedReplies.filter((r) => r && (r.isAccepted || r.isConfirmed)).length;
    const isComplete = acceptedCount >= neededHelpers;

    const wasThisReplyConfirmed = Boolean(
      reply.isAccepted || 
      reply.isConfirmed || 
      post.confirmedHelperName === reply.responderName || 
      post.confirmedBy === reply.responderName
    );

    const updatedPost: HelpPost = {
      ...post,
      replies: updatedReplies,
      repliesCount: updatedReplies.length,
      helpersCount: Math.max(1, updatedReplies.length + 1),
      helpersAccepted: acceptedCount,
      isConfirmed: isComplete ? true : (wasThisReplyConfirmed ? false : (post.isConfirmed ?? false)),
      confirmedBy: wasThisReplyConfirmed && !isComplete ? '' : (post.confirmedBy || ''),
      confirmedHelperName: wasThisReplyConfirmed && !isComplete ? '' : (post.confirmedHelperName || ''),
      confirmedHelperPhone: wasThisReplyConfirmed && !isComplete ? '' : (post.confirmedHelperPhone || ''),
      status: isComplete ? 'confirmed' : (post.status === 'confirmed' && wasThisReplyConfirmed ? 'active' : (post.status || 'active')),
    };

    if (propOnUpdatePost) {
      propOnUpdatePost(updatedPost);
    } else {
      setLocalHelpPosts((prev) =>
        (prev || []).map((p) => (p && post && p.id === post.id ? updatedPost : p))
      );
    }

    try {
      await updateHelpPostInFirestore(post.id, {
        replies: updatedReplies,
        repliesCount: updatedReplies.length,
        helpersCount: Math.max(1, updatedReplies.length + 1),
        helpersAccepted: acceptedCount,
        isConfirmed: updatedPost.isConfirmed,
        confirmedBy: updatedPost.confirmedBy,
        confirmedHelperName: updatedPost.confirmedHelperName,
        confirmedHelperPhone: updatedPost.confirmedHelperPhone,
        status: updatedPost.status,
      });
    } catch (err) {
      console.error('Failed to remove helper offer from Firestore:', err);
    }
  };

  const handleCompleteHelpPost = async (completedPost: HelpPost) => {
    const helperName = user?.name || completedPost.confirmedHelperName || 'සහායකයා';
    const helperPhone = user?.phone || completedPost.confirmedHelperPhone || '';
    const nowIso = new Date().toISOString();

    const updated: HelpPost = {
      ...completedPost,
      isCompleted: true,
      status: 'completed',
      completedAt: nowIso,
      completedBy: helperName,
      completedHelperName: helperName,
      completedHelperPhone: helperPhone,
    };

    if (propOnUpdatePost) {
      propOnUpdatePost(updated);
    } else {
      setLocalHelpPosts((prev) =>
        (prev || []).map((p) => (p && completedPost && p.id === completedPost.id ? updated : p))
      );
    }

    try {
      await updateHelpPostInFirestore(completedPost.id, {
        isCompleted: true,
        status: 'completed',
        completedAt: nowIso,
        completedBy: helperName,
        completedHelperName: helperName,
        completedHelperPhone: helperPhone,
      });

      await sendChatMessageToFirestore(completedPost.id, {
        senderName: helperName,
        senderRole: 'helper',
        text: `"${helperName}" විසින් සහය සාර්ථකව ලබාදී අවසන් බව තහවුරු කරන ලදී. ඔබට ස්තුතියි!`,
        timestamp: 'දැන්',
        senderPhone: helperPhone,
      });
    } catch (err) {
      console.error('Failed to update completed status in Firestore:', err);
    }
  };

  const handleRequesterConfirmResolved = async (resolvedPost: HelpPost) => {
    const nowIso = new Date().toISOString();
    const updated: HelpPost = {
      ...resolvedPost,
      requesterResolved: true,
      requesterResolvedAt: nowIso,
      isConfirmed: true,
      status: 'confirmed',
    };

    if (propOnUpdatePost) {
      propOnUpdatePost(updated);
    } else {
      setLocalHelpPosts((prev) =>
        (prev || []).map((p) => (p && resolvedPost && p.id === resolvedPost.id ? updated : p))
      );
    }

    try {
      await updateHelpPostInFirestore(resolvedPost.id, {
        requesterResolved: true,
        requesterResolvedAt: nowIso,
        isConfirmed: true,
        status: 'confirmed',
      });

      await sendChatMessageToFirestore(resolvedPost.id, {
        senderName: user.name || resolvedPost.userName || 'ඉල්ලුම්කරු',
        senderRole: 'seeker',
        text: `"${user.name || resolvedPost.userName}" විසින් ගැටලුව සාර්ථකව විසඳුණු බව තහවුරු කරන ලදී. ස්තුතියි!`,
        timestamp: 'දැන්',
        senderPhone: user.phone || resolvedPost.userPhone || '',
      });
    } catch (err) {
      console.error('Failed to update requester resolution status in Firestore:', err);
    }
  };

  const handleRequesterRejectCompletion = async (post: HelpPost) => {
    const updated: HelpPost = {
      ...post,
      isCompleted: false,
      status: post.isConfirmed ? 'confirmed' : 'active',
      completedAt: '',
    };

    if (propOnUpdatePost) {
      propOnUpdatePost(updated);
    } else {
      setLocalHelpPosts((prev) =>
        (prev || []).map((p) => (p && post && p.id === post.id ? updated : p))
      );
    }

    try {
      await updateHelpPostInFirestore(post.id, {
        isCompleted: false,
        status: post.isConfirmed ? 'confirmed' : 'active',
        completedAt: '',
      });

      await sendChatMessageToFirestore(post.id, {
        senderName: user.name || post.userName || 'ඉල්ලුම්කරු',
        senderRole: 'seeker',
        text: `"${user.name || post.userName}" විසින් සහය තවම ලබාදී අවසන් වී නැති බව සටහන් කර ඇත. සහය ලබාදී අවසන් වූ පසු සහායකයාට නැවත තහවුරු කළ හැක.`,
        timestamp: 'දැන්',
        senderPhone: user.phone || post.userPhone || '',
      });
    } catch (err) {
      console.error('Failed to revoke completion status in Firestore:', err);
    }
  };

  // Check if there is a post created by current user that helper completed, but requester hasn't resolved yet
  const pendingResolutionPost = useMemo(() => {
    return (helpPosts || []).find((post) => {
      if (!post || !post.id) return false;
      if (post.isDeleted || post.status === 'deleted') return false;
      if (post.requesterResolved) return false;
      if (!post.isCompleted && post.status !== 'completed') return false;
      if (postponedResolutionPostIds.includes(post.id)) return false;

      const isMyPost =
        (user?.id && post.userId === user.id) ||
        (user?.userId && post.userId === user.userId) ||
        (post.userName && user?.name && post.userName.trim().toLowerCase() === user.name.trim().toLowerCase());

      return Boolean(isMyPost);
    });
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

    const updated: HelpPost = {
      ...confirmedPost,
      replies: updatedReplies,
      isConfirmed: true,
      confirmedBy: helperName,
      confirmedHelperName: helperName,
      confirmedHelperPhone: helperPhone,
      confirmedAt: new Date().toISOString(),
      status: 'confirmed' as const,
    };

    if (propOnUpdatePost) {
      propOnUpdatePost(updated);
    } else {
      setLocalHelpPosts((prev) =>
        (prev || []).map((p) => (p && confirmedPost && p.id === confirmedPost.id ? updated : p))
      );
    }

    if (selectedPostForConfirm?.id === confirmedPost.id) {
      setSelectedPostForConfirm(updated);
    }
    if (selectedPostForChat?.id === confirmedPost.id) {
      setSelectedPostForChat(updated);
    }
    if (selectedPostForDetail?.id === confirmedPost.id) {
      setSelectedPostForDetail(updated);
    }

    try {
      await updateHelpPostInFirestore(confirmedPost.id, {
        replies: updatedReplies,
        isConfirmed: true,
        confirmedBy: updated.confirmedBy,
        confirmedHelperName: updated.confirmedHelperName,
        confirmedHelperPhone: updated.confirmedHelperPhone,
        confirmedAt: updated.confirmedAt,
        status: 'confirmed',
      });
    } catch (err) {
      console.error('Failed to update confirmed post in Firestore:', err);
    }
  };

  // Handler for adding reply/offering support
  const handleSendReply = async (
    postId: string,
    responderName: string,
    responderPhone: string,
    message: string
  ) => {
    const targetPost = (helpPosts || []).find((p) => p && p.id === postId);
    const newReply = {
      id: `rep_${Date.now()}`,
      responderName,
      responderPhone,
      message,
      createdAt: 'මීට සුළු මොහොතකට පෙර',
      whatsappSent: true,
    };

    if (targetPost) {
      try {
        await addReplyToFirestore(postId, newReply);
      } catch (e) {
        console.error('Failed to save reply to Firestore, updating local state', e);
      }

      const updatedTarget: HelpPost = {
        ...targetPost,
        repliesCount: (targetPost.repliesCount || 0) + 1,
        helpersCount: (targetPost.helpersCount || 0) + 1,
        replies: [newReply, ...(targetPost.replies || [])],
      };

      if (propOnUpdatePost) {
        propOnUpdatePost(updatedTarget);
      } else {
        setLocalHelpPosts((prev) =>
          (prev || []).map((p) => (p && p.id === postId ? updatedTarget : p))
        );
      }
    }
  };

  const services = [
    {
      id: 'professional_services',
      title: language === 'en' ? 'Professional Services' : language === 'ta' ? 'தொழில்முறை சேவைகள்' : 'වෘත්තීය සේවා',
      desc: language === 'en' ? 'Qualified professionals & technical service providers.' : language === 'ta' ? 'தகுதிவாய்ந்த வல்லுநர்கள் மற்றும் சேவை வழங்குநர்கள்.' : 'සුදුසුකම් ලත් වෘත්තිකයන් සහ තාක්ෂණික සේවා සැපයුම්කරුවන්.',
      icon: Briefcase,
      color: 'from-emerald-600 via-teal-600 to-[#007a4b]',
      badge: language === 'en' ? 'PRO' : language === 'ta' ? 'தொழில்' : 'වෘත්තීය',
    },
    {
      id: 'from_me_to_you',
      title: language === 'en' ? 'From Me to You' : language === 'ta' ? 'என்னிடமிருந்து உங்களுக்கு' : 'මගෙන් ඔබට',
      desc: language === 'en' ? 'Donations, clearance giveaways & item exchanges.' : language === 'ta' ? 'நன்கொடைகள், அகற்றல்கள் மற்றும் பரிமாற்றங்கள்.' : 'පරිත්‍යාග, ඉවත්කරන ද්‍රව්‍ය හෝ හුවමාරු භාණ්ඩ ලබාදීම.',
      icon: Gift,
      color: 'from-purple-500 to-pink-600',
      badge: language === 'en' ? 'GIVE' : language === 'ta' ? 'வழங்கு' : 'පරිත්‍යාග',
    },
    {
      id: 'find_for_me',
      title: language === 'en' ? 'Find for Me' : language === 'ta' ? 'தேடித் தாருங்கள்' : 'සොයාදෙන්න',
      desc: language === 'en' ? 'Lost, stolen or procurement search requests.' : language === 'ta' ? 'இழந்த அல்லது திருடப்பட்டவை தேடல் சேவை.' : 'නැතිවූ, සොරාගත් හෝ අවශ්‍ය දේ සොයාගැනීමේ සේවාව.',
      icon: Search,
      color: 'from-emerald-500 to-teal-600',
      badge: language === 'en' ? 'SEARCH' : language === 'ta' ? 'தேடு' : 'සොයන්න',
    },
    {
      id: 'emergency',
      title: t.emergencyService,
      desc: language === 'en' ? 'Direct support in emergency or urgent situations.' : language === 'ta' ? 'அவசர காலங்களில் நேரடி ஆதரவு.' : 'හදිසි ආපදා හෝ හදිසි අවස්ථාවලදී සෘජු සහය ලබාගැනීම.',
      icon: PhoneCall,
      color: 'from-red-500 to-rose-600',
      badge: language === 'en' ? '24/7 Priority' : language === 'ta' ? '24/7 அவசரம்' : '24/7 ප්‍රමුඛතාව',
    },
    {
      id: 'financial',
      title: t.financialService,
      desc: language === 'en' ? 'Apply for welfare grants, relief, and support funds.' : language === 'ta' ? 'நலன்புரி நிதி மற்றும் நிவாரண உதவிக்கு விண்ணப்பிக்கவும்.' : 'සුභසාධන දීමනා, ආධාර සහ සහය සේවා සඳහා ඉල්ලුම් කිරීම.',
      icon: HeartHandshake,
      color: 'from-amber-500 to-orange-600',
      badge: language === 'en' ? 'Welfare' : language === 'ta' ? 'நலன்புரி' : 'සුභසාධන',
    },
    {
      id: 'tech',
      title: t.techSupportService,
      desc: language === 'en' ? 'Assistance with system usage and technical issues.' : language === 'ta' ? 'தொழில்நுட்ப கோளாறுகள் மற்றும் கணக்கு உதவி.' : 'පද්ධති භාවිතය, ගිණුම් තාක්ෂණික දෝෂ සඳහා උපකාර.',
      icon: Wrench,
      color: 'from-blue-500 to-cyan-600',
      badge: language === 'en' ? 'Technical' : language === 'ta' ? 'தொழில்நுட்பம்' : 'තාක්ෂණික',
    },
    {
      id: 'doc',
      title: t.docVerificationService,
      desc: language === 'en' ? 'Administrator verification for identity and other official documents.' : language === 'ta' ? 'ஆவணங்கள் மற்றும் அடையாள அட்டை சரிபார்ப்பு.' : 'හැඳුනුම්පත් සහ අනෙකුත් ලේඛන පරිපාලක සහතික කිරීම්.',
      icon: FileCheck2,
      color: 'from-emerald-500 to-teal-600',
      badge: language === 'en' ? 'Verification' : language === 'ta' ? 'சரிபார்ப்பு' : 'සහතික කිරීම්',
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
            if (onViewRedAlertDetail) onViewRedAlertDetail(a);
            else setSelectedAlertForDetail(a);
          }}
          onOpenCreate={() => {
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
        onOpenQuickRegisterHub={() => setIsQuickRegistrationHubOpen(true)}
        onOpenAppQr={() => setIsAppQrModalOpen(true)}
      />

      {/* 1.1 Live Proximity Urgent Alert Radar Banner */}
      <ProximityAlertBanner
        posts={helpPosts}
        userLocation={currentLocation}
        onViewPost={(post) => setSelectedPostForDetail(post)}
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
            {getLangText('තොරතුරු බලන්න', 'View Details', 'விவரங்களை காண்க')}
          </button>
        </div>
      )}

      {/* Admin Flagged Notice Banner on User Login / Screen */}
      {myFlaggedPosts.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-800 via-red-800 to-rose-900 text-white shadow-xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn border-2 border-rose-400/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
              <ShieldAlert className="w-6 h-6 text-yellow-300 animate-pulse" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-black text-yellow-300 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                <AlertCircle className="w-3.5 h-3.5 text-yellow-300" />
                <span>
                  {getLangText('පරිපාලක දැනුම්දීම (Admin Notice)', 'Admin Notice on Your Post', 'நிர்வாகி அறிவிப்பு')}
                </span>
                <span className="bg-white text-rose-950 text-[10px] font-mono font-black px-2 py-0.5 rounded-full shadow-xs">
                  {myFlaggedPosts[0].postCode}
                </span>
                {myFlaggedPosts[0].isHiddenByAdmin && (
                  <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md border border-rose-300">
                    HIDDEN
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                {getLangText(
                  `ඔබගේ දැන්වීමේ ගැටලුවක් සටහන් කර ඇත: "${myFlaggedPosts[0].adminFlagReason || 'කරුණාකර නීති රීති පරීක්ෂා කරන්න'}". ${myFlaggedPosts[0].isHiddenByAdmin ? 'දැන්වීම තාවකාලිකව සඟවා ඇත (Hidden).' : ''}`,
                  `Issue reported on your post: "${myFlaggedPosts[0].adminFlagReason || 'Please review policies'}". ${myFlaggedPosts[0].isHiddenByAdmin ? 'Temporarily hidden from other users.' : ''}`,
                  `உங்கள் இடுகையில் சிக்கல் தெரிவிக்கப்பட்டுள்ளது: "${myFlaggedPosts[0].adminFlagReason || 'விவரங்களை மதிப்பாய்வு செய்யவும்'}".`
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setPosterRespondingPost(myFlaggedPosts[0])}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{getLangText('පිළිතුරු යැවීම / Fix', 'Reply / Fix', 'பதிலளி')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleEditPost(myFlaggedPosts[0])}
              className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition-all border border-white/30 cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{getLangText('Edit දැන්වීම', 'Edit Post', 'திருத்து')}</span>
            </button>
          </div>
        </div>
      )}
      {/* 1.2 Community Hubs: Fast Emergency & Community Action Cards (Top Section) */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Button 1: Blood & Disaster Relief Hub */}
          <button
            type="button"
            onClick={() => {
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
            onClick={() => setIsEmergencyDirectoryModalOpen(true)}
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
        topRightElement={
          <MessageInboxBubble
            user={user}
            helpPosts={helpPosts}
            onClick={() => setIsInboxModalOpen(true)}
          />
        }
      />

      {/* Prominent Action Buttons: 'කැමැත්ත දැක්වූවන්' & 'සහය වන්න' */}
      <div className={`grid ${checkIsAdmin(user) || myPosts.length > 0 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3 sm:gap-4`}>
        {/* Button 1: කැමැත්ත දැක්වූවන් */}
        {Boolean(checkIsAdmin(user) || myPosts.length > 0) && (
          <button
            type="button"
            onClick={() => {
              setTargetPostForOffers(null);
              setIsSupportOffersModalOpen(true);
            }}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.99] border-2 border-orange-400/50 flex items-center justify-between cursor-pointer"
            title="සහය වීමට කැමැත්ත පළකළ අය"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

            <div className="flex items-center gap-3 sm:gap-4 relative z-10 min-w-0 text-left">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30 shadow-inner group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-tight group-hover:text-amber-100 transition-colors">
                    {language === 'en' ? 'Support Offers' : language === 'ta' ? 'விருப்பம் தெரிவித்தோர்' : 'කැමැත්ත දැක්වූවන්'}
                  </h3>
                  {totalUserReplies > 0 && (
                    <span className="bg-white text-orange-700 text-xs font-black px-2 py-0.5 rounded-full shadow-md font-mono animate-bounce">
                      {totalUserReplies} {language === 'en' ? 'New' : language === 'ta' ? 'புதிய' : 'නව'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-orange-100/90 font-medium truncate">
                  {language === 'en' 
                    ? 'People willing to help your requests' 
                    : language === 'ta' 
                    ? 'உங்கள் கோரிக்கைகளுக்கு உதவ முன்வந்தோர்' 
                    : 'ඔබේ ඉල්ලීම් සඳහා සහය වීමට ඉදිරිපත් වූ අය'}
                </p>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-2 pl-2 shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white text-orange-600 font-black flex items-center justify-center shadow-md group-hover:bg-amber-100 transition-colors">
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </button>
        )}

        {/* Button 2: සහය වන්න */}
        <button
          id="volunteer-support-btn"
          type="button"
          onClick={() => setIsVolunteerSupportModalOpen(true)}
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] hover:from-emerald-700 hover:to-teal-700 text-white p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.99] border-2 border-emerald-400/50 flex items-center justify-between cursor-pointer"
          title="අන් අයට සහය වීම සහ ඔබව තෝරාගත් ඉල්ලීම්"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

          <div className="flex items-center gap-3 sm:gap-4 relative z-10 min-w-0 text-left">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30 shadow-inner group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-tight group-hover:text-amber-200 transition-colors">
                  {language === 'en' ? 'Lend Support / Help' : language === 'ta' ? 'உதவி செய்யுங்கள்' : 'සහය වන්න'}
                </h3>
                {selectedAsHelperCount > 0 && (
                  <span className="bg-amber-300 text-slate-950 text-xs font-black px-2 py-0.5 rounded-full shadow-md font-mono animate-bounce">
                    {selectedAsHelperCount} {language === 'en' ? 'Selected' : language === 'ta' ? 'தேர்வு' : 'තේරී ඇත'}
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100/90 font-medium truncate">
                {language === 'en' 
                  ? 'Help others & view requests where you are selected' 
                  : language === 'ta' 
                  ? 'மற்றவர்களுக்கு உதவுங்கள் மற்றும் தேர்ந்தெடுக்கப்பட்ட கோரிக்கைகள்' 
                  : 'අන් අයට සහය වීම සහ ඔබව තෝරාගත් ඉල්ලීම්'}
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 pl-2 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white text-[#007a4b] font-black flex items-center justify-center shadow-md group-hover:bg-amber-300 group-hover:text-slate-950 transition-colors">
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>
      </div>

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
          onOfferSupport={(p) => setSelectedPostForDetail(p)}
          onEditPost={(p) => handleEditPost(p)}
          onToggleHidePost={(p) => handleToggleHidePost(p)}
          onViewPost={(p) => setViewingPost(p)}
          onDeletePost={(p) => setDeletingPost(p)}
          onOpenChat={(p) => setSelectedPostForChat(p)}
          onOpenConfirm={(p) => setSelectedPostForConfirm(p)}
          onOpenSupportOffers={(p) => {
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

      {/* 1.5. Find For Me Request Form Modal */}
      <FindForMeModal
        isOpen={isFindForMeModalOpen}
        onClose={() => {
          setIsFindForMeModalOpen(false);
          setEditingFindForMePost(null);
        }}
        onSubmitPost={handleCreatePost}
        currentLocation={currentLocation}
        availableLocations={initialLocations}
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

      {/* 2. Quick Services Detail Modal (Node 4) */}
      <QuickServiceDetailModal
        post={selectedPostForDetail}
        isOpen={!!selectedPostForDetail}
        onClose={() => setSelectedPostForDetail(null)}
        onOpenChat={(p) => {
          setSelectedPostForDetail(null);
          setSelectedPostForChat(p);
        }}
        onOpenConfirm={(p) => {
          setSelectedPostForDetail(null);
          setSelectedPostForConfirm(p);
        }}
        onDeletePost={(p) => {
          setSelectedPostForDetail(null);
          setDeletingPost(p);
        }}
        onEditPost={(p) => {
          setSelectedPostForDetail(null);
          handleEditPost(p);
        }}
        lang={language}
        currentLocation={currentLocation}
        currentUser={user}
        onRequireRegistration={() => setShowDemoRegisterPrompt(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onPostUpdated={(updated) => {
          setLocalHelpPosts((prev) => (prev || []).map((p) => p && p.id === updated.id ? updated : p));
          setSelectedPostForDetail(updated);
        }}
      />

      {/* 3. Quick Services Chat Modal (Node 5) */}
      <QuickServiceChatModal
        post={selectedPostForChat}
        isOpen={!!selectedPostForChat}
        onClose={() => setSelectedPostForChat(null)}
        currentUser={user}
        language={language}
        onNavigateToIssues={() => {
          setSelectedPostForChat(null);
          if (onNavigateToIssues) onNavigateToIssues();
        }}
        onOpenConfirm={(p) => {
          setSelectedPostForChat(null);
          setSelectedPostForConfirm(p);
        }}
      />

      {/* 4. Quick Services Confirm Workflow (Node 5) */}
      <QuickServiceConfirmWorkflow
        post={selectedPostForConfirm}
        isOpen={!!selectedPostForConfirm}
        onClose={() => setSelectedPostForConfirm(null)}
        onOpenChat={(p) => {
          setSelectedPostForConfirm(null);
          setSelectedPostForChat(p);
        }}
        currentUser={user}
        onConfirmPost={handleConfirmPost}
      />

      {/* 5. Community Services & Masked NIC Leaderboard */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentUser={user}
        lang={language}
        allUsers={users}
      />

      {/* Legacy Fallback Support Modal */}
      <OfferSupportModal
        post={selectedPostToReply}
        isOpen={!!selectedPostToReply}
        onClose={() => setSelectedPostToReply(null)}
        onSendReply={handleSendReply}
        lang={language}
        currentLocation={currentLocation}
      />

      {/* Service Request Dialog Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 relative">
            <h3 className="text-lg font-bold text-white mb-2">{selectedService}</h3>
            <p className="text-xs text-slate-400 mb-4">
              {getLangText(
                'මෙම සේවාව ලබා ගැනීමට පහත පණිවිඩයක් තබා පරිපාලක වෙත යොමු කරන්න.',
                'To request this service, please leave a message below to submit to the administrator.',
                'இந்த சேவையை கோர, கீழே ஒரு செய்தியை நிர்வாகிக்கு அனுப்பவும்.'
              )}
            </p>

            {requestSubmitted ? (
              <div className="py-6 text-center text-emerald-400 font-bold text-sm">
                ✅ {getLangText('සේවා ඉල්ලීම සාර්ථකව යොමු කෙරිණි!', 'Service request submitted successfully!', 'சேவை கோரிக்கை வெற்றிகரமாக அனுப்பப்பட்டது!')}
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  rows={3}
                  placeholder={getLangText(
                    'ඔබට අවශ්‍ය සහය පිළිබඳ සටහනක් ඇතුළත් කරන්න...',
                    'Enter details about the support you require...',
                    'உங்களுக்கு தேவையான உதவி பற்றிய குறிப்பை உள்ளிடவும்...'
                  )}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setSelectedService(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                  >
                    {t.cancelBtn}
                  </button>
                  <button
                    onClick={() => {
                      if (user?.isDemo) {
                        setShowDemoRegisterPrompt(true);
                        return;
                      }
                      setRequestSubmitted(true);
                      setTimeout(() => {
                        setRequestSubmitted(false);
                        setSelectedService(null);
                      }, 1800);
                    }}
                    className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl"
                  >
                    {t.submitIssueBtn}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Owner Action Modals (Requirement 01) */}
      <EditHelpPostModal
        post={editingPost}
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        onSave={handleSaveEditedPost}
      />

      <ViewHelpPostModal
        post={viewingPost}
        isOpen={!!viewingPost}
        onClose={() => setViewingPost(null)}
        lang={language}
        viewerLocation={currentLocation}
        currentUser={user}
        onOpenChat={(post) => {
          setViewingPost(null);
          setSelectedPostForChat(post);
        }}
        onOpenConfirm={(post) => {
          setViewingPost(null);
          setSelectedPostForConfirm(post);
        }}
        onEditPost={(post) => {
          setViewingPost(null);
          handleEditPost(post);
        }}
        onDeletePost={(post) => {
          setViewingPost(null);
          setDeletingPost(post);
        }}
        onAdminModerate={(post) => {
          setViewingPost(null);
          setModeratingPost(post);
        }}
        onRequireRegistration={() => setShowDemoRegisterPrompt(true)}
      />

      <DeleteConfirmModal
        post={deletingPost}
        isOpen={!!deletingPost}
        onClose={() => setDeletingPost(null)}
        onConfirmDelete={handleConfirmDeletePost}
        isAdmin={checkIsAdmin(user)}
      />
       {/* Support Offers Modal */}
      <SupportOffersModal
        isOpen={isSupportOffersModalOpen}
        onClose={() => {
          setIsSupportOffersModalOpen(false);
          setTargetPostForOffers(null);
        }}
        userPosts={
          user?.role === 'admin'
            ? (targetPostForOffers ? [targetPostForOffers] : helpPosts)
            : (targetPostForOffers && targetPostForOffers.id ? (myPosts.some(p => p && p.id === targetPostForOffers.id) ? myPosts : [targetPostForOffers, ...myPosts]) : myPosts)
        }
        lang={language}
        viewerLocation={currentLocation}
        targetPost={targetPostForOffers}
        onOpenChat={(post) => {
          setSelectedPostForChat(post);
        }}
        onOpenConfirm={(post, reply) => {
          if (reply) {
            handleAcceptHelperOffer(post, reply);
          }
          setSelectedPostForConfirm(post);
        }}
        onSelectHelper={(post, reply) => {
          handleAcceptHelperOffer(post, reply);
        }}
        onCancelOffer={(post, reply) => {
          handleCancelHelperOffer(post, reply);
        }}
      />

      {/* Volunteer Support Modal (සහය වන්න & ඔබව තෝරාගත් ඉල්ලීම්) */}
      <VolunteerSupportModal
        isOpen={isVolunteerSupportModalOpen}
        onClose={() => setIsVolunteerSupportModalOpen(false)}
        user={user}
        currentUser={user}
        helpPosts={helpPosts}
        lang={language}
        viewerLocation={currentLocation}
        onOpenOfferModal={(post) => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setSelectedPostToReply(post);
        }}
        onOpenChat={(post) => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setSelectedPostForChat(post);
        }}
        onOpenPostDetail={(post) => {
          setSelectedPostForDetail(post);
        }}
        onCompleteHelpPost={handleCompleteHelpPost}
      />

      {/* Message Inbox Modal */}
      <MessageInboxModal
        isOpen={isInboxModalOpen}
        onClose={() => setIsInboxModalOpen(false)}
        user={user}
        helpPosts={helpPosts}
        lang={language}
        onViewPost={(post) => {
          setSelectedPostForDetail(post);
        }}
        onOpenChat={(post) => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setSelectedPostForChat(post);
        }}
        onOpenConfirm={(post) => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setSelectedPostForConfirm(post);
        }}
        onNavigateToIssues={() => {
          if (onNavigateToIssues) onNavigateToIssues();
        }}
      />

      {/* Requester Screen-Lock Resolution Prompt Modal */}
      {pendingResolutionPost && pendingResolutionPost.id && (
        <ResolutionPromptModal
          post={pendingResolutionPost}
          lang={language}
          onPostpone={() => {
            if (pendingResolutionPost?.id) {
              setPostponedResolutionPostIds((prev) => [...prev, pendingResolutionPost.id]);
            }
          }}
          onRejectCompletion={handleRequesterRejectCompletion}
          onOpenChat={(post) => {
            if (post?.id) {
              setPostponedResolutionPostIds((prev) => [...prev, post.id]);
            }
            setSelectedPostForChat(post);
          }}
          onConfirmResolved={handleRequesterConfirmResolved}
        />
      )}

      {/* User Settings Modal (Profile Setting & Font Size) */}
      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        user={user}
        onUpdateUser={onUpdateUser}
        language={language}
        initialTab={settingsInitialTab}
        helpPosts={helpPosts}
        onNavigateToIssues={() => {
          setIsSettingsModalOpen(false);
          if (onNavigateToIssues) {
            onNavigateToIssues();
          } else if (onNavigate) {
            onNavigate('issues');
          }
        }}
      />

      {/* Blood Donation & Disaster Relief Hub Modal */}
      <BloodAndDisasterModal
        isOpen={isBloodAndDisasterModalOpen}
        onClose={() => setIsBloodAndDisasterModalOpen(false)}
        currentUser={user}
        initialTab={bloodModalInitialTab}
        onRequireRegistration={() => setShowDemoRegisterPrompt(true)}
        onOpenAidLedger={() => setIsAidLedgerModalOpen(true)}
        onSubmitHelpPost={handleCreatePost}
      />

      {/* 🏛️ Disaster Relief & Aid Ledger Modal (ආපදා සහන සේවය) */}
      <TransparentAidLedgerModal
        isOpen={isAidLedgerModalOpen}
        onClose={() => setIsAidLedgerModalOpen(false)}
        currentUser={user}
        lang={language}
        onRequireRegistration={() => setShowDemoRegisterPrompt(true)}
        onSubmitHelpPost={handleCreatePost}
      />

      {/* Emergency Services Directory Modal */}
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

      {/* User Credit Wallet & Bank Deposit Modal */}
      <UserWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        user={user}
        language={language}
        onOpenQrPay={(tab = 'scan_pay') => {
          setQrPayTargetRecipient(undefined);
          setQrPayInitialTab(tab);
          setIsQrPayModalOpen(true);
        }}
      />

      {/* Insufficient Credits Alert Modal */}
      {insufficientCreditsState && (
        <InsufficientCreditsModal
          isOpen={insufficientCreditsState.isOpen}
          onClose={() => setInsufficientCreditsState(null)}
          user={user}
          requiredAmount={insufficientCreditsState.requiredAmount}
          currentBalance={insufficientCreditsState.currentBalance}
          categoryName={insufficientCreditsState.categoryName}
          language={language}
          onOpenWallet={() => {
            setInsufficientCreditsState(null);
            setIsWalletModalOpen(true);
          }}
        />
      )}

      {/* Admin Moderation Modal (Report / Hide / Restore) */}
      <AdminModerationModal
        post={moderatingPost}
        isOpen={!!moderatingPost}
        onClose={() => setModeratingPost(null)}
        onConfirmFlag={handleConfirmAdminFlag}
        onRestorePost={handleRestorePostByAdmin}
        language={language}
      />

      {/* Poster Issue Response Modal (Reply / Fix Note) */}
      <PosterIssueResponseModal
        post={posterRespondingPost}
        isOpen={!!posterRespondingPost}
        onClose={() => setPosterRespondingPost(null)}
        onSubmitResponse={handlePosterSubmitCorrection}
        onOpenEditPost={handleEditPost}
        language={language}
      />

      {/* Centralized Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        language={language}
        onSelectNotification={handleOpenFromNotification}
      />

      {/* Trilingual Omni-Assistant Chat Box & Universal Auto-Translator */}
      <OmniAssistantChatBox
        currentLanguage={language}
        onLanguageChange={setLanguage}
        isOpen={isAssistantChatOpen}
        onOpenChange={setIsAssistantChatOpen}
        onOpenBloodAndDisaster={() => {
          setBloodModalInitialTab('blood_requests');
          setIsBloodAndDisasterModalOpen(true);
        }}
        onOpenQuickServices={() => {
          setIsQuickServiceModalOpen(true);
        }}
        onOpenFindForMe={() => {
          setIsFindForMeModalOpen(true);
        }}
        onOpenFromMeToYou={() => {
          setIsFromMeToYouModalOpen(true);
        }}
        onOpenGroupWork={() => {
          setBoardCategoryFilter('group_work');
          setSelectedCategoryTitle('ශ්‍රමදාන / කණ්ඩායම් වැඩ');
          setFeedDistanceTab('local');
        }}
        onOpenMarketplace={() => {
          setIsLowestPricesModalOpen(true);
        }}
        onOpenWallet={() => {
          setIsWalletModalOpen(true);
        }}
        onOpenEmergencyDirectory={() => {
          setIsEmergencyDirectoryModalOpen(true);
        }}
        onOpenHelpPost={() => {
          setIsCreateModalOpen(true);
        }}
      />

      {/* Marketplace Lowest Prices & Price Gap Modal */}
      <MarketplaceLowestPricesModal
        isOpen={isLowestPricesModalOpen}
        onClose={() => setIsLowestPricesModalOpen(false)}
        items={initialMarketItems}
      />

      {/* 🎙️ AI Voice Help & SOS Modal */}
      <AiVoiceHelpModal
        isOpen={isAiVoiceModalOpen}
        onClose={() => setIsAiVoiceModalOpen(false)}
        currentUser={user}
        currentLocation={currentLocation}
        lang={language}
        onSubmitHelpPost={handleCreatePost}
        onSubmitRedAlert={async (newAlert) => {
          if (setRedAlerts) {
            setRedAlerts((prev) => [newAlert, ...(prev || [])]);
          }
          if (setSelectedAlertForDetail) {
            setSelectedAlertForDetail(newAlert);
          }
        }}
      />

      {/* 🔄 භාණ්ඩ හුවමාරු මධ්‍යස්ථානය (Barter & Exchange Hub) */}
      <BarterExchangeModal
        isOpen={isBarterModalOpen}
        onClose={() => setIsBarterModalOpen(false)}
        currentUser={user}
        currentLocation={currentLocation}
        language={language}
      />

      {/* 📱 QR Code ගෙවීම් & ස්කෑනරය (QR Pay & Receive Modal) */}
      <UserQrPayModal
        isOpen={isQrPayModalOpen}
        onClose={() => {
          setIsQrPayModalOpen(false);
          setQrPayTargetRecipient(undefined);
        }}
        currentUser={user}
        language={language}
        initialTab={qrPayInitialTab}
        targetRecipient={qrPayTargetRecipient}
        onPaymentComplete={(tx) => {
          // Toast alert or refresh wallet
          console.log('QR Transaction completed:', tx);
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

      {/* 🔔 PickMe-Style Background Audio & Alert Settings Modal */}
      <PickMeAlertSettingsModal
        isOpen={isPickMeAlertModalOpen}
        onClose={() => setIsPickMeAlertModalOpen(false)}
        language={language}
      />

      {/* 🌟 Sahaya Sewa Features Post & Guide Modal */}
      <SahayaSewaFeaturesPostModal
        isOpen={isFeaturesPostModalOpen}
        onClose={() => setIsFeaturesPostModalOpen(false)}
        language={language}
      />

      {/* 📱 PWA Mobile App Download & Install Modal */}
      <PWAInstallModal
        isOpen={isPwaInstallModalOpen}
        onClose={() => setIsPwaInstallModalOpen(false)}
        language={language}
      />

      {/* ✨ Universal Multi-Category Registration Hub Modal */}
      <QuickRegistrationHubModal
        isOpen={isQuickRegistrationHubOpen}
        onClose={() => setIsQuickRegistrationHubOpen(false)}
        language={language}
        onSelectUserRegistration={() => {
          if (onNavigate) {
            onNavigate('register');
          } else {
            setShowDemoRegisterPrompt(true);
          }
        }}
        onSelectProfessionalRegistration={() => {
          setIsRegisterProfessionalModalOpen(true);
        }}
        onSelectBusinessRegistration={() => {
          setMarketplaceShopModalType('business');
          setIsMarketplaceAddShopModalOpen(true);
        }}
        onSelectShopRegistration={() => {
          setMarketplaceShopModalType('shop');
          setIsMarketplaceAddShopModalOpen(true);
        }}
      />

      {/* 📱 Direct Web Application QR Share & Fullscreen Standee Modal */}
      <AppQrShareModal
        isOpen={isAppQrModalOpen}
        onClose={() => setIsAppQrModalOpen(false)}
        language={language}
        initialUrl="https://supporservice.online/"
        title={getLangText('📱 Sahaya Sewa Web QR Code', '📱 Sahaya Sewa Web QR Code', '📱 Sahaya Sewa QR குறியீடு')}
      />

      {/* 🛠️ Direct Professional Service Provider Registration Modal */}
      <RegisterProfessionalServiceModal
        isOpen={isRegisterProfessionalModalOpen}
        onClose={() => setIsRegisterProfessionalModalOpen(false)}
        user={user}
        language={language}
        currentLocationName={currentLocation.nameSi}
        onRegisterService={(srv) => {
          handleAddProfessionalService(srv);
          setIsRegisterProfessionalModalOpen(false);
        }}
      />

      {/* 🏪 / 🏢 Direct Business & Shop Registration Modal */}
      <MarketplaceAddShopModal
        isOpen={isMarketplaceAddShopModalOpen}
        onClose={() => setIsMarketplaceAddShopModalOpen(false)}
        currentUser={user}
        allTags={allTags}
        defaultType={marketplaceShopModalType}
        onSaveShop={(shop) => {
          handleSaveMarketShop(shop);
          setIsMarketplaceAddShopModalOpen(false);
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
          const firstActive = redAlerts.find((a) => a && a.status === 'active');
          if (firstActive) {
            setSelectedAlertForDetail(firstActive);
          } else {
            setIsRedAlertCreateOpen(true);
          }
        }}
        onOpenSosTracker={() => setIsSosLiveModalOpen(true)}
        onOpenCreateModal={() => setIsRedAlertCreateOpen(true)}
      />

      {/* 🚨 Red Alert Emergency Reporting Modal (Full Voice & GPS form) */}
      <RedAlertCreateModal
        isOpen={isRedAlertCreateOpen}
        onClose={() => setIsRedAlertCreateOpen(false)}
        currentUser={user}
        onUpdateUser={onUpdateUser}
        currentLocation={currentLocation}
        onAlertCreated={(newAlert) => {
          setIsRedAlertCreateOpen(false);
          if (setRedAlerts) {
            setRedAlerts((prev) => [newAlert, ...(prev || [])]);
          }
          setSelectedAlertForDetail(newAlert);
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

    </div>
  );
};


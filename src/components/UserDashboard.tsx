import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Language, LocationOption, HelpPost, PostReply, Theme, CategoryItem, TagItem, ProfessionalService, ServiceReview, RedAlertItem } from '../types';
import { translations } from '../data/translations';
import { initialLocations, initialUsers, initialHelpPosts } from '../data/initialData';
import { getStoredProfessionalServices, saveProfessionalServicesToStorage } from '../data/professionalServicesData';
import { UnifiedDashboardHeader } from './UnifiedDashboardHeader';
import { GlowingNeedHelpBtn } from './GlowingNeedHelpBtn';
import { PostCard } from './PostCard';
import { HelpPostModal } from './HelpPostModal';
import { OfferSupportModal } from './OfferSupportModal';
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
import { filterNonDeletedPosts, addDeletedPostId } from '../utils/deletedPostsManager';
import { isAuthorBlocked } from '../utils/blockedCredentialsManager';
import { deduplicateUsers } from '../utils/userUtils';
import { checkIsPostOwner } from '../utils/postOwnerHelper';
import { InsufficientCreditsModal } from './InsufficientCreditsModal';
import { UserWalletModal } from './UserWalletModal';
import { BarterExchangeModal } from './BarterExchangeModal';
import { UserQrPayModal } from './UserQrPayModal';
import { AdminModerationModal } from './AdminModerationModal';
import { PosterIssueResponseModal } from './PosterIssueResponseModal';
import { LiveNotificationToast } from './LiveNotificationToast';
import { NotificationCenterModal } from './NotificationCenterModal';
import { MarketplaceLowestPricesModal } from './MarketplaceLowestPricesModal';
import { initialMarketItems } from '../data/marketplaceData';
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
  sendChatMessageToFirestore
} from '../lib/firebase';
import { resolveExactLocation, toLocationOption } from '../utils/geoUtils';
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
  user: User;
  onNavigateToIssues: () => void;
  language: Language;
  setLanguage?: (lang: Language) => void;
  theme?: Theme;
  toggleTheme?: () => void;
  categories?: CategoryItem[];
  helpPosts?: HelpPost[];
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
  user,
  onNavigateToIssues,
  language,
  setLanguage,
  theme,
  toggleTheme,
  categories,
  helpPosts: propHelpPosts,
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

    const isManualLocked = localStorage.getItem('sahaya_manual_location_locked') === 'true';
    if (!isManualLocked) {
      autoFetchLiveLocation();
    }

    const handleModeChange = (e: any) => {
      if (e.detail?.mode === 'auto') {
        autoFetchLiveLocation();
      }
    };

    window.addEventListener('sahaya_location_mode_changed', handleModeChange);

    return () => {
      isMounted = false;
      window.removeEventListener('sahaya_location_mode_changed', handleModeChange);
    };
  }, []);

  // Help Posts Feed State (Synced with Firestore Database & Parent App)
  const [localHelpPosts, setLocalHelpPosts] = useState<HelpPost[]>(() => {
    const saved = localStorage.getItem('sahaya_help_posts');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return filterNonDeletedPosts(parsed);
      } catch (e) { /* ignore */ }
    }
    return filterNonDeletedPosts(initialHelpPosts);
  });

  // Effective help posts list
  const helpPosts = propHelpPosts !== undefined ? propHelpPosts : localHelpPosts;

  // Real-time Firestore subscription if not provided by parent
  useEffect(() => {
    if (propHelpPosts !== undefined) return;
    const unsubscribe = subscribeToHelpPosts((remotePosts) => {
      setLocalHelpPosts(remotePosts || []);
    });
    return () => unsubscribe();
  }, [propHelpPosts]);

  // Active Feed Tab: 'local' (<15km) vs 'all_sl' (>15km or all)
  const [dashboardView, setDashboardView] = useState<'home' | 'requests'>('requests');
  const [feedDistanceTab, setFeedDistanceTab] = useState<'local' | 'all_sl'>('all_sl');
  const [boardCategoryFilter, setBoardCategoryFilter] = useState<string>('');
  const [maxDistanceRadius, setMaxDistanceRadius] = useState<number>(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDemoRegisterPrompt, setShowDemoRegisterPrompt] = useState(false);

  // Professional Services State (Synced with localStorage and initial data)
  const [professionalServices, setProfessionalServices] = useState<ProfessionalService[]>(() => {
    return getStoredProfessionalServices();
  });

  const handleAddProfessionalService = (newService: ProfessionalService) => {
    const updated = [newService, ...professionalServices];
    setProfessionalServices(updated);
    saveProfessionalServicesToStorage(updated);
  };

  const handleAddProfessionalReview = (serviceId: string, review: ServiceReview) => {
    const updated = professionalServices.map((srv) => {
      if (srv.id === serviceId) {
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
  const [bloodModalInitialTab, setBloodModalInitialTab] = useState<'blood_requests' | 'volunteer_donors' | 'disaster_relief'>('blood_requests');
  const [isAidLedgerModalOpen, setIsAidLedgerModalOpen] = useState(false);
  const [isEmergencyDirectoryModalOpen, setIsEmergencyDirectoryModalOpen] = useState(false);
  const [isLowestPricesModalOpen, setIsLowestPricesModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isAssistantChatOpen, setIsAssistantChatOpen] = useState(false);
  const [isBarterModalOpen, setIsBarterModalOpen] = useState(false);
  const [isQrPayModalOpen, setIsQrPayModalOpen] = useState(false);
  const [qrPayTargetRecipient, setQrPayTargetRecipient] = useState<{
    userId: string;
    name: string;
    phone?: string;
    fixedAmount?: number;
  } | undefined>(undefined);

  // Navigation handler when user clicks a notification toast or modal item
  const handleOpenFromNotification = (notif: AppNotification) => {
    if (notif.targetPostId) {
      const matched = (helpPosts || []).find((p) => p.id === notif.targetPostId);
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
    const targetPost = helpPosts.find((p) => p.id === postId);
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
      setLocalHelpPosts((prev) => (prev || []).map((p) => (p.id === postId ? updated : p)));
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
    const targetPost = helpPosts.find((p) => p.id === postId);
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
      setLocalHelpPosts((prev) => (prev || []).map((p) => (p.id === postId ? updated : p)));
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
    const targetPost = helpPosts.find((p) => p.id === postId);
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
      setLocalHelpPosts((prev) => (prev || []).map((p) => (p.id === postId ? updated : p)));
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
    if (post.category === 'find_for_me' || post.findForMeType) {
      setEditingFindForMePost(post);
      setIsFindForMeModalOpen(true);
    } else if (post.category === 'from_me_to_you' || post.fromMeToYouType) {
      setEditingFromMeToYouPost(post);
      setIsFromMeToYouModalOpen(true);
    } else {
      setEditingQuickServicePost(post);
      setSelectedCategoryTitle(
        post.category === 'normal_services'
          ? 'සාමාන්‍ය සේවා'
          : (post.tagCategory || 'ඉක්මන් සේවා')
      );
      setIsQuickServiceModalOpen(true);
    }
  };

  const handleSaveEditedPost = async (updatedPost: HelpPost) => {
    if (propOnUpdatePost) {
      propOnUpdatePost(updatedPost);
    } else {
      setLocalHelpPosts((prev) => (prev || []).map((p) => (p.id === updatedPost.id ? updatedPost : p)));
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
    addDeletedPostId(postId);
    const postToDelete = (helpPosts || []).find((p) => p.id === postId);

    // Immediately remove from local state
    setLocalHelpPosts((prev) => {
      const updated = (prev || []).filter((p) => p.id !== postId);
      try {
        localStorage.setItem('sahaya_help_posts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (propOnDeletePost) {
      propOnDeletePost(postId);
    }
    if (propOnPermanentDeletePost) {
      propOnPermanentDeletePost(postId);
    }

    try {
      const deletedPayload: Partial<HelpPost> = {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: user.role === 'admin' ? `Admin (${user.name})` : (user.name || postToDelete?.userName || 'User'),
        status: 'deleted',
      };
      await updateHelpPostInFirestore(postId, deletedPayload);
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

  useEffect(() => {
    localStorage.setItem('sahaya_help_posts', JSON.stringify(helpPosts));
  }, [helpPosts]);

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
    if (!post || post.isDeleted || post.status === 'deleted') return false;

    // Check if post author is blocked or deleted by admin
    if (isAuthorBlocked(post)) {
      const isViewerAdmin = user.role === 'admin' || user.isAdmin;
      if (!isViewerAdmin) {
        return false;
      }
    }

    // Check Hidden by Admin:
    // If hidden by admin, only Admin or the Post Owner can see it (to rectify/respond)
    if (post.isHiddenByAdmin) {
      const isPostOwner = 
        post.userId === user.id ||
        (post.userName && user.name && post.userName.trim().toLowerCase() === user.name.trim().toLowerCase()) ||
        (post.userPhone && user.phone && post.userPhone.trim() === user.phone.trim());
      
      const isViewerAdmin = user.role === 'admin' || user.isAdmin;

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
      matchesDistance = dist <= 15;
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

    // Query Keyword Check (with Smart Synonym / Alias Expansion)
    let matchesQuery = true;
    if (query) {
      const searchKeywords = getExpandedSearchKeywords(query);
      const postText = `${post.tagName || ''} ${post.tagCategory || ''} ${post.whatHappened || ''} ${post.whatIsNeeded || ''} ${post.userName || ''} ${post.locationName || ''} ${post.postCode || ''}`.toLowerCase();
      
      matchesQuery = searchKeywords.some((kw) => postText.includes(kw));
    }

    return matchesDistance && matchesCategory && matchesTagFilter && matchesQuery;
  }).sort((a, b) => {
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

  // Play a pleasant notification tone when support offers arrive or upon login when offers exist
  const prevRepliesCountRef = useRef<number>(0);
  useEffect(() => {
    if (totalUserReplies > 0) {
      if (prevRepliesCountRef.current === 0 || totalUserReplies > prevRepliesCountRef.current) {
        try {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const now = ctx.currentTime;
            
            // Pleasant chime: D5 then A5
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.setValueAtTime(880, now + 0.12); // A5
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.4);
          }
        } catch (e) {
          // Audio context policy restriction handled silently
        }
      }
    }
    prevRepliesCountRef.current = totalUserReplies;
  }, [totalUserReplies]);

  // Handler for adding new help request post (Step 3.1 & Quick Services)
  const handleCreatePost = async (
    newPostData: Omit<HelpPost, 'id' | 'postCode' | 'createdAt' | 'repliesCount' | 'helpersCount' | 'replies'>
  ) => {
    const categoryToSave = newPostData.category || 'quick_services';
    const postTitle =
      newPostData.whatHappened ||
      newPostData.whatIsNeeded ||
      newPostData.itemLostStolenOrSearched ||
      newPostData.donationItem ||
      'දැන්වීම් පළකිරීම';
    const tempPostCode = `#POST-${Math.floor(1000 + Math.random() * 9000)}`;

    // Rule: "මෙහි ඇති සියලු දැන්විම් පොරම් (form) ක්‍රියාත්මක විය යුත්තේ credit ක්‍රමයක් යටතේය."
    // Verify user credit balance and deduct posting fee
    const deduction = deductPostingFee(user, categoryToSave, postTitle, tempPostCode);

    if (!deduction.success) {
      setInsufficientCreditsState({
        isOpen: true,
        requiredAmount: deduction.requiredAmount,
        currentBalance: deduction.currentBalance,
        categoryName: selectedCategoryTitle || categoryToSave,
      });
      return;
    }

    // Update user state with new balance
    if (onUpdateUser) {
      onUpdateUser({
        ...user,
        credits: deduction.newBalance,
      });
    }

    const postToSave = {
      ...newPostData,
      userId: user.userId || user.id || '',
      category: categoryToSave,
    };

    // If quick service or normal service, ensure category filter shows it
    if (categoryToSave === 'quick_services' || categoryToSave === 'normal_services') {
      setBoardCategoryFilter(categoryToSave);
      setSelectedCategoryTitle(
        categoryToSave === 'normal_services' 
          ? 'සාමාන්‍ය සේවා (General Services)' 
          : 'ඉක්මන් සේවා (Quick Services)'
      );
      setFeedDistanceTab('local');
    }

    try {
      await addHelpPostToFirestore(postToSave);
    } catch (e) {
      console.error('Failed to add post to Firestore, updating local state as fallback', e);
      const newPost: HelpPost = {
        ...postToSave,
        id: `post_${Date.now()}`,
        postCode: tempPostCode,
        createdAt: 'මීට සුළු මොහොතකට පෙර',
        repliesCount: 0,
        helpersCount: 1,
        replies: [],
      };
      setLocalHelpPosts((prev) => [newPost, ...prev]);
    }

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
        (prev || []).map((p) => (p.id === post.id ? updatedPost : p))
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
      r.id !== reply.id && (reply.id !== 'confirmed_helper' || r.responderName !== reply.responderName)
    );
    const neededHelpers = post.helpersNeeded && post.helpersNeeded > 0 ? post.helpersNeeded : 1;
    const acceptedCount = updatedReplies.filter((r) => r.isAccepted || r.isConfirmed).length;
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
        (prev || []).map((p) => (p.id === post.id ? updatedPost : p))
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
        (prev || []).map((p) => (p.id === completedPost.id ? updated : p))
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
        (prev || []).map((p) => (p.id === resolvedPost.id ? updated : p))
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
        (prev || []).map((p) => (p.id === post.id ? updated : p))
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
    return helpPosts.find((post) => {
      if (post.isDeleted || post.status === 'deleted') return false;
      if (post.requesterResolved) return false;
      if (!post.isCompleted && post.status !== 'completed') return false;
      if (postponedResolutionPostIds.includes(post.id)) return false;

      const isMyPost =
        post.userId === user.id ||
        (post.userName && user.name && post.userName.trim().toLowerCase() === user.name.trim().toLowerCase());

      return isMyPost;
    });
  }, [helpPosts, user, postponedResolutionPostIds]);

  const handleConfirmPost = async (confirmedPost: HelpPost, confirmedReplyId?: string) => {
    const matchedReply = (confirmedPost.replies || []).find((r) =>
      confirmedReplyId ? r.id === confirmedReplyId : r.isAccepted || r.isConfirmed
    );

    const updatedReplies = (confirmedPost.replies || []).map((rep) => {
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
        (prev || []).map((p) => (p.id === confirmedPost.id ? updated : p))
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
    const targetPost = helpPosts.find((p) => p.id === postId);
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
          (prev || []).map((p) => (p.id === postId ? updatedTarget : p))
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
          onOpenAlertDetail={(a) => {
            if (onViewRedAlertDetail) onViewRedAlertDetail(a);
          }}
          onOpenCreate={onOpenRedAlert || (() => {})}
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
          setSettingsInitialTab('profile');
          setIsSettingsModalOpen(true);
        }}
        onOpenWallet={() => setIsWalletModalOpen(true)}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        onOpenInbox={() => setIsInboxModalOpen(true)}
        inboxCount={inboxRepliesCount}
        onOpenAssistant={() => setIsAssistantChatOpen(true)}
        onLogout={onLogout}
        activeRoleView={activeRoleView}
        setActiveRoleView={setActiveRoleView}
        onNavigate={onNavigate}
        isAutoLoadingLocation={isAutoLoadingLocation}
        autoLoadedNotice={autoLocationMsg}
        onOpenRedAlert={onOpenRedAlert}
        activeRedAlertsCount={activeRedAlertsCount}
        onOpenBarterExchange={() => setIsBarterModalOpen(true)}
        onOpenQrPay={() => {
          setQrPayTargetRecipient(undefined);
          setIsQrPayModalOpen(true);
        }}
      />

      {/* 1.1 Live Proximity Urgent Alert Radar Banner */}
      <ProximityAlertBanner
        posts={helpPosts}
        userLocation={currentLocation}
        onViewPost={(post) => setSelectedPostForDetail(post)}
      />

      {/* 1.2 Community Hubs: Fast Emergency & Community Action Cards */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {/* Button 1: Blood & Disaster Relief Hub (Compact Square Card) */}
          <button
            type="button"
            onClick={() => {
              setBloodModalInitialTab('blood_requests');
              setIsBloodAndDisasterModalOpen(true);
            }}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-700 text-white shadow-md hover:shadow-lg shadow-red-600/20 border border-red-400/70 active:scale-95 transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[82px] sm:min-h-[92px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform backdrop-blur-xs">
                <Droplet className="w-4 h-4 fill-white" />
              </div>
              <span className="px-1.5 py-0.5 rounded-full font-mono text-[8px] sm:text-[9px] font-black bg-white text-red-700 shadow-xs animate-pulse">
                LIVE
              </span>
            </div>
            <div className="min-w-0 mt-1.5">
              <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                {getLangText('හදිසි ලේ සහ ආපදා සහන', 'Blood & Disaster Hub', 'இரத்ததானம் & பேரிடர்')}
              </h4>
            </div>
          </button>

          {/* Button 2: Transparent Aid Ledger (ආධාර විනිවිදභාවයේ ලෙජරය) */}
          <button
            type="button"
            onClick={() => setIsAidLedgerModalOpen(true)}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-indigo-800 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md hover:shadow-lg shadow-emerald-600/20 border-2 border-emerald-300/80 active:scale-95 transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[82px] sm:min-h-[92px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform backdrop-blur-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
              </div>
              <span className="px-1.5 py-0.5 rounded-full font-mono text-[8px] sm:text-[9px] font-black bg-emerald-400 text-emerald-950 shadow-xs">
                6-DIGIT CODE
              </span>
            </div>
            <div className="min-w-0 mt-1.5">
              <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                {getLangText('ආධාර විනිවිදභාවයේ ලෙජරය', 'Transparent Aid Ledger', 'வெளிப்படையான உதவி')}
              </h4>
            </div>
          </button>

          {/* Button 3: Offline Emergency Contacts Directory (Compact Square Card) */}
          <button
            type="button"
            onClick={() => setIsEmergencyDirectoryModalOpen(true)}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white shadow-md hover:shadow-lg shadow-amber-600/20 border border-amber-400/70 active:scale-95 transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[82px] sm:min-h-[92px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform backdrop-blur-xs">
                <PhoneCall className="w-4 h-4 text-white" />
              </div>
              <span className="px-1.5 py-0.5 rounded-full font-mono text-[8px] sm:text-[9px] font-black bg-white text-amber-800 shadow-xs">
                1990 / 119
              </span>
            </div>
            <div className="min-w-0 mt-1.5">
              <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                {getLangText('නොබැඳි හදිසි සේවා අංක', 'Emergency Directory', 'அவசர உதவி எண்கள்')}
              </h4>
            </div>
          </button>

          {/* Button 4: AI Voice SOS & Help Requests (AI හඬ සහය) */}
          <button
            type="button"
            onClick={() => setIsAiVoiceModalOpen(true)}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg shadow-purple-600/20 border-2 border-purple-300/80 active:scale-95 transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[82px] sm:min-h-[92px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform backdrop-blur-xs">
                <Mic className="w-4 h-4 text-white animate-pulse" />
              </div>
              <span className="px-1.5 py-0.5 rounded-full font-mono text-[8px] sm:text-[9px] font-black bg-white text-purple-800 shadow-xs flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" /> AI VOICE
              </span>
            </div>
            <div className="min-w-0 mt-1.5">
              <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                {getLangText('AI හඬ සහය (Voice SOS & Help)', 'AI Voice SOS & Help', 'AI குரல் உதவி')}
              </h4>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Top Quick Navigation Switcher: "සේවා ඉල්ලීම්", "සහය පුවරුව", "පණිවිඩ & සංවාද", and "සැකසුම්" */}
      <div className="bg-gradient-to-r from-blue-50/95 via-white to-blue-50/95 dark:from-[#071927] dark:via-[#0b2236] dark:to-[#071927] border-2 border-blue-200/90 dark:border-blue-700/60 p-2 sm:p-2.5 rounded-3xl shadow-md shadow-blue-500/5 backdrop-blur-md">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {/* Button 1: සේවා ඉල්ලීම් */}
          <button
            type="button"
            onClick={() => {
              setIsCategoryModalOpen(true);
            }}
            className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl font-black transition-all duration-200 cursor-pointer text-center sm:text-left relative overflow-hidden group bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg shadow-blue-600/20 border-2 border-blue-400/80 active:scale-[0.99]"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 bg-white/20 text-white shadow-xs">
              <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs sm:text-sm font-black truncate leading-tight flex items-center gap-1.5">
                <span>{getLangText('සේවා ඉල්ලීම්', 'Service Requests', 'சேவை கோரிக்கைகள்')}</span>
                <span className="px-1.5 py-0.2 rounded-md font-mono text-[9px] font-black bg-white/20 text-white">
                  + {getLangText('නව', 'New', 'புதிய')}
                </span>
              </div>
              <div className="text-[10px] sm:text-xs font-bold truncate leading-tight mt-0.5 text-blue-100">
                {getLangText('මට උදව් අවශ්‍යයි', 'I Need Help', 'எனக்கு உதவி தேவை')}
              </div>
            </div>
          </button>

          {/* Button 2: සහය පුවරුව */}
          <button
            type="button"
            onClick={() => {
              setDashboardView('requests');
              setBoardCategoryFilter('');
              setSelectedCategoryTitle('');
              setSelectedTagFilter(null);
              setSearchQuery('');
              setFeedDistanceTab('all_sl');
              setIsCategoryModalOpen(false);
              setIsQuickServiceModalOpen(false);
              setIsFindForMeModalOpen(false);
              setIsFromMeToYouModalOpen(false);
            }}
            className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl font-black transition-all duration-200 cursor-pointer text-center sm:text-left relative overflow-hidden group bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg shadow-emerald-600/20 border-2 border-emerald-400/80 active:scale-[0.99]"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 bg-white/20 text-white shadow-xs">
              <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs sm:text-sm font-black truncate leading-tight flex items-center gap-1.5">
                <span>{getLangText('සහය පුවරුව', 'Support Board', 'உதவி பலகை')}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold bg-white/20 text-white">
                  {helpPosts.length}
                </span>
              </div>
              <div className="text-[10px] sm:text-xs font-bold truncate leading-tight mt-0.5 text-emerald-100">
                {getLangText('සියලු උපකාර දැන්වීම්', 'All Help Notices', 'அனைத்து உதவி அறிவிப்புகள்')}
              </div>
            </div>
          </button>

          {/* Button 3: පණිවිඩ පෙට්ටිය & සජීවී සංවාද (Message Inbox) */}
          <button
            type="button"
            onClick={() => {
              if (user?.isDemo) {
                setShowDemoRegisterPrompt(true);
                return;
              }
              setIsInboxModalOpen(true);
            }}
            className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl font-black transition-all duration-200 cursor-pointer text-center sm:text-left relative overflow-hidden group bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg shadow-sky-600/20 border-2 border-sky-400/80 active:scale-[0.99]"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 bg-white/20 text-white shadow-xs">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-sky-200" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs sm:text-sm font-black truncate leading-tight flex items-center gap-1.5">
                <span>{getLangText('පණිවිඩ & චැට්', 'Messages & Inbox', 'செய்திகள் & அரட்டை')}</span>
                {inboxRepliesCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold bg-white text-blue-900 shadow-xs">
                    {inboxRepliesCount}
                  </span>
                )}
              </div>
              <div className="text-[10px] sm:text-xs font-bold truncate leading-tight mt-0.5 text-sky-100">
                {getLangText('සියලු පිළිතුරු / Chats', 'All Replies / Live Chat', 'அனைத்து பதில்கள்')}
              </div>
            </div>
          </button>

          {/* Button 4: Settings (සැකසුම්) */}
          <button
            type="button"
            onClick={() => {
              setSettingsInitialTab('profile');
              setIsSettingsModalOpen(true);
            }}
            className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl font-black transition-all duration-200 cursor-pointer text-center sm:text-left relative overflow-hidden group bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 dark:from-[#132a1e] dark:to-[#0f281d] text-emerald-950 dark:text-emerald-100 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 border-2 border-emerald-300/80 dark:border-emerald-700/60 shadow-xs hover:shadow-md hover:scale-[1.01]"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 shadow-xs">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs sm:text-sm font-black truncate leading-tight flex items-center gap-1.5">
                <span>{getLangText('සැකසුම්', 'Settings', 'அமைப்புகள்')}</span>
              </div>
              <div className="text-[10px] sm:text-xs font-bold truncate leading-tight mt-0.5 text-emerald-700 dark:text-emerald-300">
                {getLangText('පැතිකඩ • අකුරු ප්‍රමාණය', 'Profile • Font Size', 'சுயவிவரம் • எழுத்துரு அளவு')}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Confirmed Helper Notice Banner */}
      {postsWhereIWasSelected.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] text-white shadow-xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn border-2 border-emerald-400/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
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
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
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

      {dashboardView === 'requests' ? (
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
          onBackToHome={() => setDashboardView('home')}
          onRequireRegistration={() => setShowDemoRegisterPrompt(true)}
          onUpdatePost={propOnUpdatePost}
          onAdminModerate={(p) => setModeratingPost(p)}
          onPosterRespondIssue={(p) => setPosterRespondingPost(p)}
          professionalServices={professionalServices}
          onAddProfessionalService={handleAddProfessionalService}
          onAddProfessionalReview={handleAddProfessionalReview}
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
      ) : (
        <>
          {/* 3. Step 2.2: Central Glowing "I Need Help" Button with Message Inbox Bubble at top right corner */}
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

          {/* 3.1 Prominent Action Buttons: 'කැමැත්ත දැක්වූවන්' (Only if Post Author with ads or Admin) & 'සහය වන්න' */}
          <div className={`grid ${user?.role === 'admin' || myPosts.length > 0 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3 sm:gap-4 pt-1`}>
            {/* Button 1: කැමැත්ත දැක්වූවන් (Support Offers) - Only shown to Post Author with ads or Admin */}
            {Boolean(user?.role === 'admin' || myPosts.length > 0) && (
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
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner group-hover:scale-110 transition-transform">
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

            {/* Button 2: සහය වන්න (Volunteer / Help Others) */}
            <button
              id="volunteer-support-btn"
              type="button"
              onClick={() => setIsVolunteerSupportModalOpen(true)}
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] hover:from-emerald-700 hover:to-teal-700 text-white p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.99] border-2 border-emerald-400/50 flex items-center justify-between cursor-pointer"
              title="අන් අයට සහය වීම සහ ඔබව තෝරාගත් ඉල්ලීම්"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

              <div className="flex items-center gap-3 sm:gap-4 relative z-10 min-w-0 text-left">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner group-hover:scale-110 transition-transform">
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


          {/* 5. Services Grid Section */}
          <div className="space-y-4 pt-4 sm:pt-6 border-t border-slate-200 dark:border-[#132a1d]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>{t.servicesTitle}</span>
              </h3>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {language === 'en' ? 'Quick & Direct Services' : language === 'ta' ? 'விரைவு சேவைகள்' : 'ක්ෂණික හා සෘජු සේවා'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {services.map((srv, srvIdx) => {
                const Icon = srv.icon;
                return (
                  <div
                    key={`srv_${srv.id}_${srvIdx}`}
                    onClick={() => {
                      if (srv.id === 'professional_services') {
                        setBoardCategoryFilter('professional_services');
                        setSelectedCategoryTitle('වෘත්තීය සේවා');
                        setDashboardView('requests');
                      } else if (srv.id === 'from_me_to_you') {
                        setIsFromMeToYouModalOpen(true);
                      } else if (srv.id === 'find_for_me') {
                        setIsFindForMeModalOpen(true);
                      } else {
                        setSelectedService(srv.title);
                      }
                    }}
                    className="bg-white dark:bg-[#071710] border border-slate-200/90 dark:border-[#132a1d] hover:border-emerald-500/50 dark:hover:border-emerald-500/50 rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${srv.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] uppercase font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800">
                          {srv.badge}
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {srv.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                        {srv.desc}
                      </p>
                    </div>

                    <button className="w-full bg-slate-100 dark:bg-slate-900/80 group-hover:bg-emerald-600 text-slate-700 dark:text-slate-300 group-hover:text-white font-bold py-2 rounded-xl border border-slate-200 dark:border-slate-800 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer">
                      <span>{t.requestServiceBtn}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
    </>
  )}

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
            : (targetPostForOffers ? (myPosts.some(p => p.id === targetPostForOffers.id) ? myPosts : [targetPostForOffers, ...myPosts]) : myPosts)
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
      {pendingResolutionPost && (
        <ResolutionPromptModal
          post={pendingResolutionPost}
          lang={language}
          onPostpone={() => {
            setPostponedResolutionPostIds((prev) => [...prev, pendingResolutionPost.id]);
          }}
          onRejectCompletion={handleRequesterRejectCompletion}
          onOpenChat={(post) => {
            setPostponedResolutionPostIds((prev) => [...prev, post.id]);
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
      />

      {/* Blood Donation & Disaster Relief Hub Modal */}
      <BloodAndDisasterModal
        isOpen={isBloodAndDisasterModalOpen}
        onClose={() => setIsBloodAndDisasterModalOpen(false)}
        currentUser={user}
        initialTab={bloodModalInitialTab}
        onRequireRegistration={() => setShowDemoRegisterPrompt(true)}
        onOpenAidLedger={() => setIsAidLedgerModalOpen(true)}
      />

      {/* 🏛️ Transparent Aid & Resource Ledger Modal (ආධාර විනිවිදභාවයේ ලෙජරය) */}
      <TransparentAidLedgerModal
        isOpen={isAidLedgerModalOpen}
        onClose={() => setIsAidLedgerModalOpen(false)}
        currentUser={user}
        lang={language}
        onRequireRegistration={() => setShowDemoRegisterPrompt(true)}
      />

      {/* Offline Emergency Services Directory Modal */}
      <EmergencyDirectoryModal
        isOpen={isEmergencyDirectoryModalOpen}
        onClose={() => setIsEmergencyDirectoryModalOpen(false)}
        currentUser={user}
        lang={language}
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
        onOpenQrPay={() => {
          setQrPayTargetRecipient(undefined);
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

      {/* Live Push & In-App Notification Toast */}
      <LiveNotificationToast onOpenNotification={handleOpenFromNotification} />

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
        onOpenQuickServicePrefilled={() => {
          setIsAiVoiceModalOpen(false);
          setIsQuickServiceModalOpen(true);
        }}
        onOpenFindForMePrefilled={() => {
          setIsAiVoiceModalOpen(false);
          setIsFindForMeModalOpen(true);
        }}
        onOpenRedAlertPrefilled={() => {
          setIsAiVoiceModalOpen(false);
          if (onOpenRedAlert) onOpenRedAlert();
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
        targetRecipient={qrPayTargetRecipient}
        onPaymentComplete={(tx) => {
          // Toast alert or refresh wallet
          console.log('QR Transaction completed:', tx);
        }}
      />

    </div>
  );
};

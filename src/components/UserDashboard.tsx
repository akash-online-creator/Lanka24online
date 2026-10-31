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
import { deleteProfessionalServiceFromFirestore, subscribeToProfessionalServices, addProfessionalServiceToFirestore } from '../lib/firebase';
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
import { getUserCreditBalance, deductPostingFee, getCategoryFee, awardServiceReward, resolveCategoryKeyForPost, getCategoryFeeDetail } from '../utils/creditManager';
import { awardSPoints, getUserSPoints } from '../utils/sPointManager';
import { 
  subscribeToHelpPosts, 
  addHelpPostToFirestore, 
  addReplyToFirestore,
  updateHelpPostInFirestore, 
  deleteHelpPostFromFirestore,
  sendChatMessageToFirestore,
  addMarketShopToFirestore
} from '../lib/firebase';
import { isPostHelpersSatisfiedOrFilled } from '../utils/serviceWorkflowManager';
import { resolveExactLocation, toLocationOption, calculateDistanceKm } from '../utils/geoUtils';
import { checkIsAdmin } from '../utils/postOwnerHelper';
import { subscribeToSystemSettings, getCachedSettings, SystemSettings } from '../utils/systemSettingsManager';
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
  const user = useMemo(() => {
    return propUser ? propUser : currentUser ? currentUser : ({
    name: 'පරිශීලක (User)',
    nic: '000000000V',
    whatsappPhone: '0770000000',
    address: 'ශ්‍රී ලංකාව',
    district: 'කොළඹ',
    policeDivision: 'කොටුව',
    status: 'approved',
    role: 'user',
    trustScore: 85,
    credits: 100,
    creditBalance: 100,
  } as unknown as User);
  }, [propUser, currentUser]);
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
      const filtered = filterNonDeletedPosts(propHelpPosts);
      setLocalHelpPosts(filtered);
      setSelectedPostForDetail((prev) => {

        const found = filtered.find((item) => Boolean(item && item.id === prev.id));
        return found ? found : prev;
      });
      setSelectedPostForConfirm((prev) => {
        if (!prev) return null;
        const found = filtered.find((item) => Boolean(item && item.id === prev.id));
        return found ? found : prev;
      });
    }
  }, [propHelpPosts]);

  const helpPosts = useMemo(() => {
    return (localHelpPosts ? localHelpPosts : []).map((p) => {
      if (!p) return p;
      const apps = Array.isArray(p.applicants) ? p.applicants : [];
      const reps = Array.isArray(p.replies) ? p.replies : [];
      if (apps.length === 0) return p;
      const mergedReplies = [...reps];
      apps.forEach((app) => {
        if (!app) return;
        const exists = mergedReplies.some((r) => Boolean(r && (r.responderId === app.helperId ? true : r.id === app.id)));
        if (!exists) {
          mergedReplies.push({
            id: app.id ? app.id : 'app_' + app.helperId,
            responderId: app.helperId,
            responderName: app.helperName,
            responderPhone: app.helperPhone,
            responderNic: app.helperNicMasked,
            message: 'ඉක්මන් සේවාව සඳහා සහය වීමට කැමැත්ත පළ කර ඇත.',
            createdAt: app.appliedAt,
            distanceKm: app.distanceKm,
            isAccepted: app.status === 'accepted',
            isConfirmed: app.status === 'accepted',
          });
        }
      });
      return mergedReplies.length !== reps.length ? { ...p, replies: mergedReplies } : p;
    });
  }, [localHelpPosts]);

  // Professional Services State (Synced with localStorage and initial data)
  const [professionalServices, setProfessionalServices] = useState<ProfessionalService[]>(() => {
    return getStoredProfessionalServices();
  });

  useEffect(() => {
    const handleSync = () => {
      try {
        const latestServices = getStoredProfessionalServices();
        setProfessionalServices(latestServices);
      } catch (err) {
        console.warn('Sync handler error:', err);
      }
    };

    const unsubPro = subscribeToProfessionalServices((cloudServices: any) => {
      if (Array.isArray(cloudServices)) {
        const local = getStoredProfessionalServices();
        const map = new Map();
        local.forEach((s: any) => { if (s && s.id) map.set(s.id, s); });
        cloudServices.forEach((s: any) => { if (s && s.id) map.set(s.id, s); });
        const merged = Array.from(map.values());
        setProfessionalServices(merged);
        saveProfessionalServicesToStorage(merged);
      }
    });

    const unsubPosts = subscribeToHelpPosts((cloudPosts: any) => {
      if (Array.isArray(cloudPosts) && cloudPosts.length !== 0) {
        const filtered = filterNonDeletedPosts(cloudPosts);
        setLocalHelpPosts(filtered);
        if (typeof setHelpPosts === 'function') {
          setHelpPosts(filtered);
        }
      }
    });

    window.addEventListener('sahaya_sync_all_services', handleSync);
    return () => {
      window.removeEventListener('sahaya_sync_all_services', handleSync);
      unsubPro();
      unsubPosts();
    };
  }, []);

  const handleAddProfessionalService = (newService: ProfessionalService) => {
    const updated = [newService, ...(professionalServices ? professionalServices : []).filter((s) => Boolean(s && s.id !== newService.id))];
    setProfessionalServices(updated);
    saveProfessionalServicesToStorage(updated);
    addProfessionalServiceToFirestore(newService).catch((err) => {
      console.warn('Professional service save to firestore notice:', err);
    });
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
    let targetUpdatedService: ProfessionalService | null = null;
    const updated = (professionalServices || []).map((srv) => {
      if (srv && srv.id === serviceId) {
        const currentReviews = srv.reviews || [];
        const newReviews = [review, ...currentReviews];
        const newAvg = Number((newReviews.reduce((sum, r) => sum + r.rating, 0) / newReviews.length).toFixed(1));
        const nextSrv = {
          ...srv,
          reviews: newReviews,
          avgRating: newAvg,
        };
        targetUpdatedService = nextSrv;
        return nextSrv;
      }
      return srv;
    });
    setProfessionalServices(updated);
    saveProfessionalServicesToStorage(updated);
    if (targetUpdatedService) {
      addProfessionalServiceToFirestore(targetUpdatedService).catch((err) => {
        console.warn('Professional service review sync notice:', err);
      });
    }
  };

  // Insufficient Credits State
  const [requiredFeeForModal, setRequiredFeeForModal] = useState<number>(0);

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
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => getCachedSettings());

  useEffect(() => {
    const unsub = subscribeToSystemSettings((s) => setSystemSettings(s));
    return () => unsub();
  }, []);
  const [isAppQrModalOpen, setIsAppQrModalOpen] = useState(false);
  const [isSavedPlacesModalOpen, setIsSavedPlacesModalOpen] = useState(false);
  const [isQuickRegistrationHubOpen, setIsQuickRegistrationHubOpen] = useState(false);
  const [isInsufficientCreditsModalOpen, setIsInsufficientCreditsModalOpen] = useState(false);
      <InsufficientCreditsModal
        isOpen={isInsufficientCreditsModalOpen}
        onClose={() => setIsInsufficientCreditsModalOpen(false)}
        requiredFee={requiredFeeForModal}
        currentBalance={user?.creditBalance || 0}
        onOpenWallet={() => {
          setIsInsufficientCreditsModalOpen(false);
          setIsWalletModalOpen(true);
        }}
        language={language}
      />
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
  const [marketplaceShopModalType, setMarketplaceShopModalType] = useState('shop' as any);
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

  // 🎯 One-Tap Full-Body Notification Navigation: Clicking ANYWHERE on a notification opens the relevant message/request directly
  const navigateToNotificationTarget = useCallback((targetModal?: string, targetPostId?: string) => {
    setIsNotificationModalOpen(false);
    if (!targetModal && !targetPostId) return;

    if (targetModal === 'blood' || targetModal === 'emergency_blood') {
      setIsBloodAndDisasterModalOpen(true);
      setBloodModalInitialTab('blood_requests');
    } else if (targetModal === 'aid_ledger' || targetModal === 'disaster_relief') {
      setIsAidLedgerModalOpen(true);
    } else if (targetModal === 'quick_service') {
      if (targetPostId) {
        const found = (helpPosts || []).find((p) => p && p.id === targetPostId);
        if (found) {
          setSelectedPostForDetail(found);
          return;
        }
      }
      setBoardCategoryFilter('quick_services');
    } else if (targetModal === 'group_work' || targetModal === 'group') {
      setBoardCategoryFilter('group_work');
    } else if (targetModal === 'chat' || targetModal === 'inbox') {
      setIsInboxModalOpen(true);
    } else if (targetModal === 'marketplace') {
      setIsMarketplaceLowestModalOpen(true);
    } else if (targetModal === 'find_for_me') {
      setIsFindForMeModalOpen(true);
    } else if (targetModal === 'from_me_to_you') {
      setIsFromMeToYouModalOpen(true);
    } else if (targetModal === 'red_alert' && targetPostId) {
      const alert = (redAlerts || []).find((a: any) => a && (a.id === targetPostId || a.alertCode === targetPostId));
      if (alert) setSelectedAlertForDetail(alert);
    } else if (targetPostId) {
      const target = (helpPosts || []).find((p) => p && p.id === targetPostId);
      if (target) {
        setSelectedPostForDetail(target);
      }
    }
  }, [helpPosts, redAlerts]);

  // Navigation handler when user clicks a notification toast or modal item
  const handleOpenFromNotification = (notif: AppNotification) => {
    setIsNotificationModalOpen(false);
    const modal = notif.targetModal || (notif as any).modal;
    const postId = notif.targetPostId || notif.relatedPostId;
    navigateToNotificationTarget(modal, postId);
  };

  useEffect(() => {
    const handleNotificationClickEvent = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      const targetModal = detail.targetModal || (detail.data && detail.data.targetModal);
      const targetPostId = detail.targetPostId || detail.relatedPostId || (detail.data && detail.data.targetPostId);
      navigateToNotificationTarget(targetModal, targetPostId);
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE_TO_MODAL') {
        const { targetModal, targetPostId } = event.data;
        navigateToNotificationTarget(targetModal, targetPostId);
      }
    };

    window.addEventListener('sahaya_notification_clicked', handleNotificationClickEvent);
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener('sahaya_notification_clicked', handleNotificationClickEvent);
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [navigateToNotificationTarget]);

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
      const isOwner = checkIsPostOwner(user, post);

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
      if (user?.id && post.confirmedHelperId === user.id) return true;
      if (userPhoneNorm && post.confirmedHelperPhone && normalizePhone(post.confirmedHelperPhone) === userPhoneNorm) {
        return true;
      }
      return false;
    });
  }, [helpPosts, user]);

  // All active tags extracted across all visible posts
  const allTags = useMemo<TagItem[]>(() => {
    const tagsFromPosts = (helpPosts || []).map((p) => (p ? p.tagName : undefined)).filter(Boolean) as string[];
    const staticTags = getStoredTags().map((t: any) => t?.tagName ? t.tagName : t?.nameSi).filter(Boolean);
    const combined = Array.from(new Set([...tagsFromPosts, ...staticTags]));
    return combined.map((name, i) => ({
      id: `tag_${i}`,
      nameSi: name,
      tagName: name,
      nameEn: name,
      nameTa: name,
      category: 'සාමාන්‍ය සේවා',
    }));
  }, [helpPosts]);

  // Automatic scrolling to community notices upon viewport readiness
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
    const rawCode = String((newPost as any).postCode ? (newPost as any).postCode : '');
    const isFreeBloodPost = Boolean(rawCode.startsWith('#BLD-') ? true : (newPost as any).category === 'blood_disaster' ? true : (newPost as any).category === 'emergency' ? true : (newPost as any).isPinnedEmergency);
    const categoryKey = isFreeBloodPost ? 'blood_request' : resolveCategoryKeyForPost(newPost);
    const feeResult = isFreeBloodPost ? { success: true, requiredFee: 0, newBalance: user?.creditBalance ? user.creditBalance : 100 } : deductPostingFee(user, categoryKey, postId, (newPost as any).headline ? (newPost as any).headline : newPost.title);

    if (!feeResult.success) {
      setRequiredFeeForModal(feeResult.requiredFee);
      setIsInsufficientCreditsModalOpen(true);
      return;
    }

    if (feeResult.requiredFee > 0) {
      const updatedUser = { ...user, creditBalance: feeResult.newBalance };
      if (onUpdateUser) onUpdateUser(updatedUser);
      try { window.dispatchEvent(new CustomEvent('sahaya_credits_updated')); } catch {}
    }

    if (categoryKey === 'found_items') {
      const creditRes = awardServiceReward(user, 'found_items');
      const spointRes = awardSPoints(user, 'G');
      const updatedUser = { ...user, creditBalance: creditRes.newBalance, sPoints: spointRes.newBalance };
      if (onUpdateUser) onUpdateUser(updatedUser);
      try { window.dispatchEvent(new CustomEvent('sahaya_credits_updated')); } catch {}
      try { window.dispatchEvent(new CustomEvent('sahaya_spoints_updated')); } catch {}
    } else if (categoryKey === 'job_post') {
      const creditRes = awardServiceReward(user, 'job_post');
      const spointRes = awardSPoints(user, 'H');
      const updatedUser = { ...user, creditBalance: creditRes.newBalance, sPoints: spointRes.newBalance };
      if (onUpdateUser) onUpdateUser(updatedUser);
      try { window.dispatchEvent(new CustomEvent('sahaya_credits_updated')); } catch {}
      try { window.dispatchEvent(new CustomEvent('sahaya_spoints_updated')); } catch {}
    } else if (categoryKey === 'accommodation_post') {
      const creditRes = awardServiceReward(user, 'accommodation_post');
      const spointRes = awardSPoints(user, 'I');
      const updatedUser = { ...user, creditBalance: creditRes.newBalance, sPoints: spointRes.newBalance };
      if (onUpdateUser) onUpdateUser(updatedUser);
      try { window.dispatchEvent(new CustomEvent('sahaya_credits_updated')); } catch {}
      try { window.dispatchEvent(new CustomEvent('sahaya_spoints_updated')); } catch {}
    }
    const resolvedPostCategory =
      (newPost as any).category ||
      ((newPost as any).findForMeType
        ? 'find_for_me'
        : (newPost as any).fromMeToYouType
        ? 'from_me_to_you'
        : (newPost as any).postType === 'quick_service'
        ? 'quick_services'
        : 'normal_services');

    const fullPost: HelpPost = {
      ...newPost,
      id: postId,
      postCode: (newPost as any).postCode
        ? (newPost as any).postCode
        : `#SRV-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      createdAtIso: new Date().toISOString(),
      createdAtMs: Date.now(),
      serviceType: resolvedPostCategory,
      authorId: (newPost as any).authorId || (newPost as any).userId || user?.userId || user?.id || 'anonymous_user',
      userId: (newPost as any).userId || user?.userId || user?.id || 'anonymous_user',
      userName: (newPost as any).userName || user?.name || 'Anonymous User',
      userPhone: (newPost as any).userPhone || user?.whatsappPhone || user?.phone || '',
      status: 'active',
      isResolved: false,
      category: resolvedPostCategory,
      postType: (newPost as any).postType || (resolvedPostCategory === 'quick_services' ? 'quick_service' : 'help_post'),
    };

    setLocalHelpPosts((prev) => [fullPost, ...(prev || [])]);
    if (typeof onAddPost === 'function') {
      onAddPost(fullPost);
    }
    if (typeof setHelpPosts === 'function') {
      setHelpPosts((prev) => [fullPost, ...(prev ? prev : [])]);
    }

    try {
      await addHelpPostToFirestore(fullPost);
    } catch (err) {
      console.warn('Post saved locally, cloud sync notice:', err);
    }

    // 1. සියලුම Modal Popups ස්වයංක්‍රීයව වසා දැමීම (Auto-close)
    setIsHelpPostModalOpen(false);
    setIsQuickServiceModalOpen(false);
    setIsFindForMeModalOpen(false);
    setIsFromMeToYouModalOpen(false);
    setIsAiVoiceModalOpen(false);
    setIsCategoryModalOpen(false);

    // 2. දැන්වීම් පුවරුව වෙත මාරු වීම (Switch to Notice Board)
    setDashboardView('requests');
    if (resolvedPostCategory === 'quick_services') {
      setBoardCategoryFilter('quick_services');
    } else if (resolvedPostCategory === 'normal_services') {
      setBoardCategoryFilter('normal_services');
    } else if (resolvedPostCategory === 'find_for_me') {
      setBoardCategoryFilter('find_for_me');
    } else if (resolvedPostCategory === 'from_me_to_you') {
      setBoardCategoryFilter('from_me_to_you');
    } else {
      setBoardCategoryFilter('');
    }
    setSearchQuery('');
    setSelectedTagFilter('');

    // 3. ස්වයංක්‍රීයව දැන්වීම් පුවරුව වෙත Scroll වීම (Smooth Auto-scroll to Notice Board)
    setTimeout(() => {
      const feed = document.getElementById('help-notices-feed');
      if (feed) {
        feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 350, behavior: 'smooth' });
      }
    }, 200);
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

  // Handler for permanently deleting post (used in UserSettingsModal)
  const handleDeletePostPermanently = async (postId: string) => {
    await handleConfirmDeletePost(postId);
  };

  const handleEditPost = (post: HelpPost) => {
    if (!post) return;
    if (post.postType === 'quick_service' || post.category === 'quick_services') {
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
    return isPostHelpersSatisfiedOrFilled(post);
  };

  // Recalculate distance from current active location
  const getPostDistance = (post: HelpPost) => {
    const curLat = currentLocation?.lat;
    const curLng = currentLocation?.lng;
    const anyPost = (post ? post : {}) as any;
    const pLat = typeof post?.latitude === 'number' ? post.latitude : typeof post?.lat === 'number' ? post.lat : typeof anyPost.locationLat === 'number' ? anyPost.locationLat : null;
    const pLng = typeof post?.longitude === 'number' ? post.longitude : typeof post?.lng === 'number' ? post.lng : typeof anyPost.locationLng === 'number' ? anyPost.locationLng : null;
    if (pLat === null ? true : pLng === null ? true : typeof curLat !== 'number' ? true : typeof curLng !== 'number') {
      return typeof post?.distanceKm === 'number' ? post.distanceKm : typeof anyPost.actualDistanceKm === 'number' ? anyPost.actualDistanceKm : 20;
    }
    return calculateDistanceKm(curLat, curLng, pLat, pLng);
  };

  // සේවාවන් අනුව දැන්වීම් පුවරුවේ දැන්වීම් පෙන්විය යුතු පිළිවෙල (1. රතු එළිය, 2. ලේ ඉල්ලීම්, 3. Boost, 4. ඉක්මන් සේවා, 5. දුර අනුව)
  const getDashboardPostSortRank = (post: HelpPost): number => {
    if (!post) return 5;
    const anyPost = post as any;
    const code = String(post.postCode ? post.postCode : anyPost.alertCode ? anyPost.alertCode : '');
    const text = `${post.title ? post.title : ''} ${post.whatHappened ? post.whatHappened : ''} ${post.whatIsNeeded ? post.whatIsNeeded : ''} ${post.tagName ? post.tagName : ''} ${post.tagCategory ? post.tagCategory : ''}`.toLowerCase();
    const isBlood = Boolean(
      code.startsWith('#BLD-')
        ? true
        : post.category === 'blood_disaster'
        ? true
        : anyPost.bloodGroup
        ? true
        : anyPost.postType === 'blood_request'
        ? true
        : text.includes('රුධිර')
        ? true
        : text.includes('ලේ අවශ්‍ය')
        ? true
        : text.includes('ලේ ඉල්ලී')
        ? true
        : text.includes('blood')
        ? true
        : text.includes('🩸')
    );
    const isRedAlert = Boolean(
      !isBlood &&
        (code.startsWith('#RED-')
          ? true
          : code.startsWith('#EMG-')
          ? true
          : post.category === 'red_alert'
          ? true
          : anyPost.postType === 'red_alert'
          ? true
          : text.includes('රතු එළිය')
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
          : post.category === 'emergency'
          ? true
          : post.tagCategory === 'හදිසි / ආපදා')
    );
    if (isRedAlert) return 1;
    if (isBlood) return 2;
    if (Boolean(post.isBoosted ? true : anyPost.boosted)) return 3;
    const isQuick = Boolean(
      post.postType === 'quick_service'
        ? true
        : post.category === 'quick_services'
        ? true
        : post.category === 'quick'
        ? true
        : post.serviceType === 'quick_services'
        ? true
        : post.tagCategory === 'ඉක්මන් සේවා'
    );
    if (isQuick) return 4;
    return 5;
  };

  // Category & Distance & Tag Filtering Logic
  const filteredPosts = (helpPosts || []).filter((post) => {
    if (!post || !post.id || post.isDeleted || post.status === 'deleted' || isPostPermanentlyDeleted(post.id)) return false;
    if (String(post.id).startsWith('direct_user_chat_') || post.postCode === 'USER-CHAT' || (post as any).isDirectChat) return false;

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
      const isOwner = checkIsPostOwner(user, post);
      const isViewerAdmin = checkIsAdmin(user);
      if (!isOwner && !isViewerAdmin) return false;
    }

    // 01. දැන්වීමට අවශ්‍ය සහයකයින් ගණන තෝරාගත් පසු හෝ සේවාව අවසන් වූ පසු දැන්වීම ප්‍රධාන පුවරුවෙන් ඉවත් කිරීම
    if (boardCategoryFilter !== 'resolved') {
      if (isPostHelpersSatisfiedOrFilled(post)) {
        return false;
      }
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
    if (boardCategoryFilter && boardCategoryFilter !== 'saved') {
      if (boardCategoryFilter === 'resolved') {
        if (!post.isResolved && post.status !== 'resolved') return false;
      } else if (boardCategoryFilter === 'urgent' || boardCategoryFilter === 'emergency') {
        const isEmergPost =
          Boolean(post.isUrgent || post.urgencyLevel || post.isPinnedEmergency) ||
          post.priorityLevel === 'emergency' ||
          post.priorityLevel === 'high' ||
          post.category === 'emergency' ||
          post.category === 'blood_disaster' ||
          post.tagCategory === 'හදිසි / ආපදා';
        if (!isEmergPost) return false;
      } else if (boardCategoryFilter === 'group_work') {
        if (post.category !== 'group_work' && post.postType !== 'group_work') return false;
      } else if (boardCategoryFilter === 'marketplace') {
        if (post.category !== 'marketplace' && post.postType !== 'marketplace') return false;
      } else if (boardCategoryFilter === 'quick_services') {
        const isQuick =
          post.postType === 'quick_service' ||
          post.category === 'quick_services' ||
          post.category === 'quick' ||
          post.serviceType === 'quick_services' ||
          post.tagCategory === 'ඉක්මන් සේවා';
        if (!isQuick) return false;
      } else if (boardCategoryFilter === 'normal_services') {
        const isQuick = Boolean(
          post.postType === 'quick_service'
            ? true
            : post.category === 'quick_services'
            ? true
            : post.category === 'quick'
            ? true
            : post.serviceType === 'quick_services'
            ? true
            : post.tagCategory === 'ඉක්මන් සේවා'
        );
        const isEmerg = Boolean(
          post.isUrgent
            ? true
            : post.urgencyLevel
            ? true
            : post.isPinnedEmergency
            ? true
            : post.priorityLevel === 'emergency'
            ? true
            : post.priorityLevel === 'high'
            ? true
            : post.category === 'emergency'
            ? true
            : post.category === 'blood_disaster'
            ? true
            : post.category === 'red_alert'
            ? true
            : post.tagCategory === 'හදිසි / ආපදා'
        );
        const isOtherSpecial = Boolean(
          post.category === 'find_for_me'
            ? true
            : post.category === 'from_me_to_you'
            ? true
            : post.category === 'professional_services'
            ? true
            : post.category === 'group_work'
            ? true
            : post.category === 'marketplace'
            ? true
            : post.findForMeType
            ? true
            : post.fromMeToYouType
        );
        if (isQuick ? true : isEmerg ? true : isOtherSpecial) return false;
      } else if (boardCategoryFilter === 'find_for_me') {
        if (
          post.category !== 'find_for_me' &&
          post.postType !== 'find_for_me' &&
          post.serviceType !== 'find_for_me' &&
          !post.findForMeType
        ) {
          return false;
        }
      } else if (boardCategoryFilter === 'from_me_to_you') {
        if (
          post.category !== 'from_me_to_you' &&
          post.postType !== 'from_me_to_you' &&
          post.serviceType !== 'from_me_to_you' &&
          !post.fromMeToYouType
        ) {
          return false;
        }
      } else if (post.category !== boardCategoryFilter && post.tagCategory !== boardCategoryFilter) {
        return false;
      }
    }

    const activeFilterTagName = typeof selectedTagFilter === 'string'
      ? selectedTagFilter
      : (selectedTagFilter as any)?.tagName ? (selectedTagFilter as any).tagName : (selectedTagFilter as any)?.nameSi ? (selectedTagFilter as any).nameSi : '';
    if (activeFilterTagName) {
      if (post.tagName !== activeFilterTagName) return false;
    }

    if (searchQuery.trim()) {
      const rawQ = searchQuery.trim();
      const cleanedQ = activeFilterTagName && rawQ.startsWith(activeFilterTagName + ' - ') ? activeFilterTagName : rawQ;
      const query = cleanedQ.toLowerCase();
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
  }).sort((a, b) => { const rA = getDashboardPostSortRank(a); const rB = getDashboardPostSortRank(b); if (rA !== rB) return rA - rB; const dA = getPostDistance(a); const dB = getPostDistance(b); if (Math.abs(dA - dB) > 0.05) return dA - dB; return (Number(b.createdAtMs ? b.createdAtMs : 0) - Number(a.createdAtMs ? a.createdAtMs : 0)); });

  // Check for posts needing resolution confirmation prompt
  useEffect(() => {
    if (!user || !user.id || !helpPosts) return;

    const postNeedingResolution = (helpPosts || []).find((post) => {
      if (!post || post.isResolved || post.status === 'resolved') return false;
      if (!checkIsPostOwner(user, post)) return false;
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
    if (confirmedPost.postType === 'quick_service' || confirmedPost.category === 'quick_services') {
      const creditRes = awardServiceReward(user, 'quick_service_helper');
      const spointRes = awardSPoints(user, 'E');
      const updatedUser = { ...user, creditBalance: creditRes.newBalance, sPoints: spointRes.newBalance };
      if (onUpdateUser) onUpdateUser(updatedUser);
      try { window.dispatchEvent(new CustomEvent('sahaya_credits_updated')); } catch {}
      try { window.dispatchEvent(new CustomEvent('sahaya_spoints_updated')); } catch {}
    } else {
      const creditRes = awardServiceReward(user, 'general_service_helper');
      const spointRes = awardSPoints(user, 'F');
      const updatedUser = { ...user, creditBalance: creditRes.newBalance, sPoints: spointRes.newBalance };
      if (onUpdateUser) onUpdateUser(updatedUser);
      try { window.dispatchEvent(new CustomEvent('sahaya_credits_updated')); } catch {}
      try { window.dispatchEvent(new CustomEvent('sahaya_spoints_updated')); } catch {}
    }
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
      rating: 0,
      reviewsCount: 0,
      reviews: [],
    };

    const updated = [service, ...professionalServices];
    setProfessionalServices(updated);
    saveProfessionalServicesToStorage(updated);
    addProfessionalServiceToFirestore(service).catch((err) => {
      console.warn('Professional service form save to firestore notice:', err);
    });
  };

  const quickServices = [
    {
      id: 'emergency',
      title: (t as any).emergencyHelp || (t as any).catEmergencyAid || 'හදිසි ආපදා සහය',
      desc: language === 'en' ? 'Get immediate assistance for life-threatening situations.' : language === 'ta' ? 'உயிருக்கு ஆபத்தான சூழ்நிலைகளுக்கு உடனடி உதவி பெறுங்கள்.' : 'ක්ෂණිකව ජීවිතාරක්ෂක හා හදිසි ආපදා සහය ලබාගන්න.',
      icon: ShieldAlert,
      color: 'from-red-600 to-rose-700',
      badge: language === 'en' ? '24/7 Urgent' : language === 'ta' ? '24/7 அவசரம்' : '24/7 හදිසි',
    },
    {
      id: 'quick_service',
      title: (t as any).quickService || (t as any).catQuickServices || 'ඉක්මන් සේවා',
      desc: language === 'en' ? 'Find skilled workers, drivers, and daily laborers instantly.' : language === 'ta' ? 'திறமையான தொழிலாளர்கள், ஓட்டுநர்களை உடனடியாகக் கண்டறியவும்.' : 'කාර්මිකයින්, රියදුරන් සහ දෛනික සේවකයින් ක්ෂණිකව සොයාගන්න.',
      icon: Wrench,
      color: 'from-amber-500 to-orange-600',
      badge: language === 'en' ? 'Local Help' : language === 'ta' ? 'உள்ளூர் உதவி' : 'ප්‍රදේශයේ සහය',
    },
    {
      id: 'find_for_me',
      title: (t as any).findForMe || (t as any).catFindForMe || 'මට සොයා දෙන්න',
      desc: language === 'en' ? 'Lost an item, pet, or vehicle? Let the community help you search.' : language === 'ta' ? 'பொருளையோ செல்லப்பிராணியையோ இழந்தீர்களா? சமூகம் தேட உதவட்டும்.' : 'නැතිවූ භාණ්ඩ, සුරතලුන් හෝ වාහන සොයා ගැනීමට ප්‍රජා සහය ලබාගන්න.',
      icon: Search,
      color: 'from-blue-600 to-indigo-700',
      badge: language === 'en' ? 'Lost & Found' : language === 'ta' ? 'இழந்ததும் கண்டதும்' : 'සොයාගැනීම්',
    },
    {
      id: 'from_me_to_you',
      title: (t as any).fromMeToYou || (t as any).catFromMeToYou || 'මගෙන් ඔබට',
      desc: language === 'en' ? 'Donate unused goods, books, medicine, or exchange items.' : language === 'ta' ? 'பயன்படுத்தப்படாத பொருட்கள், புத்தகங்களை நன்கொடையாக வழங்கவும்.' : 'භාවිතා නොකරන ද්‍රව්‍ය, පොත්පත්, බෙහෙත් පරිත්‍යාග කරන්න හෝ හුවමාරු කරගන්න.',
      icon: HeartHandshake,
      color: 'from-emerald-600 to-teal-700',
      badge: language === 'en' ? 'Free Aid / Barter' : language === 'ta' ? 'இலவச உதவி' : 'පරිත්‍යාග / හුවමාරු',
    },
    {
      id: 'blood_donation',
      title: (t as any).bloodDonationService || 'ලේ පරිත්‍යාග සහන',
      desc: language === 'en' ? 'Emergency blood requests and volunteer donor network.' : language === 'ta' ? 'அவசர இரத்தக் கோரிக்கைகள் மற்றும் தன்னார்வ நன்கொடையாளர் நெட்வொர்க்.' : 'හදිසි ලේ අවශ්‍යතා සහ ස්වේච්ඡා ලේ පරිත්‍යාගශීලීන්ගේ එකමුතුව.',
      icon: Droplet,
      color: 'from-rose-600 to-red-800',
      badge: language === 'en' ? 'Lifesaver' : language === 'ta' ? 'உயிர்காப்பாளர்' : 'ජීවිතාරක්ෂක',
    },
    {
      id: 'chat',
      title: (t as any).directChatService || 'සෘජු සංවාදය',
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

  if (!prev) return null;

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
            if (onViewRedAlertDetail) onViewRedAlertDetail(a as any);
            else setSelectedAlertForDetail(a as any);
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
        onOpenLeaderboard={() => setIsLeaderboardModalOpen(true)}
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
        onOpenQrPay={systemSettings.enableQrPay ? (tab: 'my_qr' | 'scan_pay' = 'scan_pay') => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setQrPayTargetRecipient(undefined);
          setQrPayInitialTab(tab);
          setIsQrPayModalOpen(true);
        } : undefined}
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
        const myActivePost = (helpPosts || []).find((p) => p && !p.isResolved && checkIsPostOwner(user, p));
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
                  const isQuickActive = Boolean(
                    myActivePost.postType === 'quick_service'
                      ? true
                      : myActivePost.category === 'quick_services'
                      ? true
                      : myActivePost.category === 'quick'
                      ? true
                      : myActivePost.serviceType === 'quick_services'
                      ? true
                      : myActivePost.tagCategory === 'ඉක්මන් සේවා'
                  );
                  if (isQuickActive) {
                    setSelectedPostForDetail(myActivePost);
                  } else {
                    setTargetPostForOffers(myActivePost);
                    setIsSupportOffersModalOpen(true);
                  }
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
                {getLangText('හදිසි ලේ අවශ්‍යතා', 'Emergency Blood Needs', 'அவசர இரத்தத் தேவைகள்')}
              </h4>
            </div>
          </button>

          {/* Button 2: Transparent Aid Ledger (ආධාර විනිවිදභාවයේ ලෙජරය) */}
          <button
            type="button"
            onClick={() => {
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
          const isEmergTitle = Boolean(
            selectedCategoryTitle &&
              (selectedCategoryTitle.includes('හදිසි') ||
                selectedCategoryTitle.includes('ආපදා') ||
                selectedCategoryTitle.toLowerCase().includes('emergency'))
          );
          if (boardCategoryFilter === 'emergency' || boardCategoryFilter === 'red_alert' || isEmergTitle) {
            if (onOpenRedAlert) onOpenRedAlert();
            else setIsRedAlertCreateOpen(true);
          } else if (boardCategoryFilter === 'normal_services' || boardCategoryFilter === 'services' || boardCategoryFilter === 'general') {
            setIsHelpPostModalOpen(true);
          } else if (boardCategoryFilter === 'quick_services' || boardCategoryFilter === 'quick') {
            setIsQuickServiceModalOpen(true);
          } else if (boardCategoryFilter === 'find_for_me') {
            setIsFindForMeModalOpen(true);
          } else if (boardCategoryFilter === 'from_me_to_you') {
            setIsFromMeToYouModalOpen(true);
          } else if (boardCategoryFilter === 'professional_services' || boardCategoryFilter === 'professional') {
            setIsRegisterProfessionalServiceModalOpen(true);
          } else {
            setIsCategoryModalOpen(true);
          }
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
          selectedTagFilter={selectedTagFilter as any}
          setSelectedTagFilter={setSelectedTagFilter as any}
          getPostDistance={getPostDistance}
          onOfferSupport={(p) => {
            // 🚀 Demo පරිශීලකයින්ට සේවා ඉල්ලුම් කිරීමට හෝ සහය වීමට පෙර ලියාපදිංචි වීම අනිවාර්යයි
            if (user?.isDemo) {
              setShowDemoRegisterPrompt(true);
              return;
            }
            const isQuickPost = Boolean(
              p?.postType === 'quick_service'
                ? true
                : p?.category === 'quick_services'
                ? true
                : p?.category === 'quick'
                ? true
                : p?.serviceType === 'quick_services'
                ? true
                : p?.tagCategory === 'ඉක්මන් සේවා'
            );
            if (isQuickPost) {
              setSelectedPostForDetail(p);
            } else {
              setSelectedPostForOffer(p);
            }
          }}
          onEditPost={(p) => handleEditPost(p)}
          onToggleHidePost={(p) => handleToggleHidePost(p)}
          onViewPost={(p) => {
            // 🚀 Demo පරිශීලකයින්ට දුරකථන අංක හා සම්පූර්ණ විස්තර බැලීමට පෙර ලියාපදිංචි වීම අනිවාර්යයි
            if (user?.isDemo) {
              setShowDemoRegisterPrompt(true);
              return;
            }
            const isQuickPost = Boolean(
              p?.postType === 'quick_service'
                ? true
                : p?.category === 'quick_services'
                ? true
                : p?.category === 'quick'
                ? true
                : p?.serviceType === 'quick_services'
                ? true
                : p?.tagCategory === 'ඉක්මන් සේවා'
            );
            if (isQuickPost) {
              setSelectedPostForDetail(p);
            } else {
              setViewingPost(p);
            }
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
            const isQuickPost = Boolean(
              p?.postType === 'quick_service'
                ? true
                : p?.category === 'quick_services'
                ? true
                : p?.category === 'quick'
                ? true
                : p?.serviceType === 'quick_services'
                ? true
                : p?.tagCategory === 'ඉක්මන් සේවා'
            );
            if (isQuickPost) {
              setSelectedPostForDetail(p);
            } else {
              setTargetPostForOffers(p);
              setIsSupportOffersModalOpen(true);
            }
          }}
          onOpenCreateModal={(catKey?: string) => {
            if (user?.isDemo) {
              setShowDemoRegisterPrompt(true);
              return;
            }
            const activeCat = catKey || boardCategoryFilter;
            const isEmergTitle = Boolean(
              selectedCategoryTitle &&
                (selectedCategoryTitle.includes('හදිසි') ||
                  selectedCategoryTitle.includes('ආපදා') ||
                  selectedCategoryTitle.toLowerCase().includes('emergency'))
            );
            if (activeCat === 'emergency' || activeCat === 'red_alert' || isEmergTitle) {
              if (onOpenRedAlert) onOpenRedAlert();
              else setIsRedAlertCreateOpen(true);
            } else if (activeCat === 'normal_services' || activeCat === 'services' || activeCat === 'general') {
              setSelectedCategoryTitle(getLangText('සාමාන්‍ය සේවා', 'General Services', 'பொதுவான சேவைகள்'));
              setIsHelpPostModalOpen(true);
            } else if (activeCat === 'quick_services' || activeCat === 'quick') {
              setSelectedCategoryTitle(getLangText('ක්ෂණික සේවා', 'Quick Services', 'விரைவு சேவை'));
              setIsQuickServiceModalOpen(true);
            } else if (activeCat === 'find_for_me') {
              setIsFindForMeModalOpen(true);
            } else if (activeCat === 'from_me_to_you') {
              setIsFromMeToYouModalOpen(true);
            } else if (activeCat === 'professional_services' || activeCat === 'professional') {
              setIsRegisterProfessionalServiceModalOpen(true);
            } else {
              setIsCategoryModalOpen(true);
            }
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
          onViewRedAlertDetail={(a) => {
            if (user?.isDemo) {
              setShowDemoRegisterPrompt(true);
              return;
            }
            if (onViewRedAlertDetail) onViewRedAlertDetail(a);
            else setSelectedAlertForDetail(a);
          }}
          onOpenRedAlert={() => {
            if (user?.isDemo) {
              setShowDemoRegisterPrompt(true);
              return;
            }
            if (onOpenRedAlert) onOpenRedAlert();
            else setIsRedAlertCreateOpen(true);
          }}
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
          if (catKey === 'emergency' || catKey === 'red_alert') {
            if (onOpenRedAlert) onOpenRedAlert();
            else setIsRedAlertCreateOpen(true);
          } else if (catKey === 'normal_services' || catKey === 'services' || catKey === 'general') {
            setSelectedCategory(selectedCat || null);
            setIsHelpPostModalOpen(true);
          } else if (catKey === 'find_for_me') {
            setIsFindForMeModalOpen(true);
          } else if (catKey === 'from_me_to_you') {
            setIsFromMeToYouModalOpen(true);
          } else if (catKey === 'professional_services' || catKey === 'professional') {
            setIsRegisterProfessionalServiceModalOpen(true);
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
        onPostUpdated={handleSaveUpdatedPost}
        onOpenChat={(p) => {
          setSelectedPostForDetail(null);
          setSelectedPostForChat(p);
        }}
        onOpenConfirm={(p) => {
          setSelectedPostForDetail(null);
          setSelectedPostForConfirm(p);
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
        onOpenChat={(p) => setSelectedPostForChat(p as any)}
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
        onSubmitHelpPost={handleCreatePost}
        currentLocation={currentLocation}
        currentUser={user}
        lang={language}
      />

      {/* 2. Standard Help Post Form Modal (General Categories - 3-Way Posting) */}
      <HelpPostModal
        isOpen={isHelpPostModalOpen}
        onClose={() => {
          setIsHelpPostModalOpen(false);
          setSelectedCategory(null);
        }}
        onSubmit={handleCreatePost}
        onSubmitPost={handleCreatePost}
        currentLocation={currentLocation}
        availableLocations={initialLocations}
        selectedCategory={selectedCategory}
        language={language}
        lang={language}
        currentUser={user}
      />

      {/* 3. Offer Support / Helper Application Modal */}
      <OfferSupportModal
        isOpen={Boolean(selectedPostForOffer)}
        onClose={() => setSelectedPostForOffer(null)}
        post={selectedPostForOffer}
        currentUser={user}
        currentLocation={currentLocation}
        lang={language}
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
        targetPost={targetPostForOffers}
        userPosts={helpPosts}
        currentUser={user}
        viewerLocation={currentLocation}
        lang={language}
        language={language}
        onUpdatePost={handleSaveUpdatedPost}
        onOpenChat={setSelectedPostForChat as any}
        onOpenConfirm={setSelectedPostForConfirm as any}
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
        lang={language}
        language={language}
        viewerLocation={currentLocation}
        currentLocation={currentLocation}
        currentUser={user}
        onOpenChat={setSelectedPostForChat as any}
        onOfferSupport={setSelectedPostForOffer as any}
        onEditPost={handleEditPost as any}
        onDeletePost={setDeletingPost as any}
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
        users={users}
        onClose={() => setIsInboxModalOpen(false)}
        currentUser={user}
        helpPosts={helpPosts}
        language={language}
        onSelectPostChat={(post) => {
          setIsInboxModalOpen(false);
          setSelectedPostForChat(post);
        }}
      />

      {/* 10. User Settings & Trust Profile Modal (Profile Overhaul) */}
      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        user={user}
        currentUser={user}
        onUpdateUser={onUpdateUser}
        language={language}
        theme={theme}
        initialTab={settingsInitialTab}
        helpPosts={localHelpPosts || helpPosts}
        onDeletePost={handleDeletePostPermanently}
        onViewPost={(p) => {
          setIsSettingsModalOpen(false);
          setSelectedPostForDetail(p);
        }}
      />

      {/* 11. User Credits & Community Coin Wallet Modal */}
      <UserWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        currentUser={user}
        onUpdateUser={onUpdateUser}
        language={language}
        theme={theme}
        onOpenQrPay={systemSettings.enableQrPay ? () => {
          setIsWalletModalOpen(false);
          setIsQrPayModalOpen(true);
        } : undefined}
      />

      {/* 12. Instant QR Payment & Barcode Transfer Modal */}
      {systemSettings.enableQrPay && (
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
      )}

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
      {React.createElement(QuickRegistrationHubModal, {
        isOpen: isQuickRegistrationHubOpen,
        onClose: () => setIsQuickRegistrationHubOpen(false),
        language: language,
        onSelectUserRegistration: () => {
          setIsQuickRegistrationHubOpen(false);
          if (onNavigate) onNavigate('register');
        },
        onSelectBusinessRegistration: () => {
          setIsQuickRegistrationHubOpen(false);
          setMarketplaceShopModalType('business');
          setIsMarketplaceAddShopModalOpen(true);
        },
        onSelectShopRegistration: () => {
          setIsQuickRegistrationHubOpen(false);
          setMarketplaceShopModalType('shop');
          setIsMarketplaceAddShopModalOpen(true);
        },
      })}

      {/* 18.5 Direct Business & Shop Registration Modal */}
      {React.createElement(MarketplaceAddShopModal, {
        isOpen: isMarketplaceAddShopModalOpen,
        onClose: () => setIsMarketplaceAddShopModalOpen(false),
        currentUser: user,
        allTags: allTags,
        defaultType: marketplaceShopModalType,
        onSaveShop: (newShop: MarketShop) => {
          const currentShops = getStoredMarketShops();
          const updated = [newShop, ...currentShops.filter((s) => Boolean(s && s.id !== newShop.id))];
          saveMarketShopsToStorage(updated);
          addMarketShopToFirestore(newShop).catch((err) => {
            console.warn('Firestore shop save notice:', err);
          });
          try {
            window.dispatchEvent(new Event('sahaya_marketplace_updated'));
          } catch {}
          setIsMarketplaceAddShopModalOpen(false);
          setBoardCategoryFilter('marketplace');
          setSelectedCategoryTitle(getLangText('වෙළඳපොල', 'Marketplace', 'සන්‍තෛ'));
          alert(
            marketplaceShopModalType === 'business'
              ? getLangText(
                  '✅ ඔබගේ ව්‍යාපාරය/ආයතනය සාර්ථකව ලියාපදිංචි කර සහය වෙළඳපොළේ පළ කරන ලදී!',
                  '✅ Your business / enterprise has been successfully registered and published!',
                  '✅ உங்கள் வணிகம் வெற்றிகரமாக பதிவு செய்யப்பட்டது!'
                )
              : getLangText(
                  '✅ ඔබගේ වෙළඳසැල/අලෙවිසැල සාර්ථකව ලියාපදිංචි කර සහය වෙළඳපොළේ පළ කරන ලදී!',
                  '✅ Your shop / store has been successfully registered and published!',
                  '✅ உங்கள் கடை வெற்றிகரமாக பதிவு செய்யப்பட்டது!'
                )
          );
        },
      })}

      {/* 19. Sahaya Sewa Community App QR Code Display Modal */}
      <AppQrShareModal
        isOpen={isAppQrModalOpen}
        onClose={() => setIsAppQrModalOpen(false)}
        language={language}
      />

      {/* Professional Service Registration Modal */}
      <RegisterProfessionalServiceModal
        isOpen={isRegisterProfessionalServiceModalOpen}
        onClose={() => setIsRegisterProfessionalServiceModalOpen(false)}
        user={user}
        language={language}
        currentLocationName={currentLocation?.nameSi}
        onRegisterService={(newService) => {
          const creditRes = awardServiceReward(user, 'professional_service');
          const spointRes = awardSPoints(user, 'K');
          const updatedUser = { ...user, creditBalance: creditRes.newBalance, sPoints: spointRes.newBalance };
          if (onUpdateUser) onUpdateUser(updatedUser);
          try { window.dispatchEvent(new CustomEvent('sahaya_credits_updated')); } catch {}
          try { window.dispatchEvent(new CustomEvent('sahaya_spoints_updated')); } catch {}
          handleAddProfessionalService(newService);
          setIsRegisterProfessionalServiceModalOpen(false);
          alert(language === 'en' ? '✅ Professional service registered successfully!' : '✅ ඔබගේ වෘත්තීය සේවාව සාර්ථකව ලියාපදිංචි කරන ලදී!');
        }}
      />

      {/* 20. Red Alert Incident Creation Modal */}
      <RedAlertCreateModal
        isOpen={isRedAlertCreateOpen}
        onClose={() => setIsRedAlertCreateOpen(false)}
        currentUser={user}
        currentLocation={currentLocation}
        onAlertCreated={(newAlert) => {
          const creditRes = awardServiceReward(user, 'red_alert');
          const spointRes = awardSPoints(user, 'A');
          const updatedUser = { ...user, creditBalance: creditRes.newBalance, sPoints: spointRes.newPoints };
          if (onUpdateUser) onUpdateUser(updatedUser);
          try { window.dispatchEvent(new CustomEvent('sahaya_credits_updated')); } catch {}
          try { window.dispatchEvent(new CustomEvent('sahaya_spoints_updated')); } catch {}
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
        currentUser={user}
        allUsers={users}
        language={language}
      />

      {/* 23. Emergency Blood Donation & Medical Volunteer Network Modal */}
      <BloodAndDisasterModal
        isOpen={isBloodAndDisasterModalOpen}
        onClose={() => setIsBloodAndDisasterModalOpen(false)}
        currentUser={user}
        initialTab={bloodModalInitialTab}
        lang={language}
        onRequireRegistration={() => setShowDemoRegisterPrompt(true)}
        onSubmitHelpPost={handleCreatePost}
        onOpenAidLedger={() => setIsAidLedgerModalOpen(true)}
        helpPosts={helpPosts}
      />

      {/* 24. Transparent Disaster Aid Ledger Modal (සහන ආධාර විනිවිදභාවය) */}
      <TransparentAidLedgerModal
        isOpen={isAidLedgerModalOpen}
        onClose={() => setIsAidLedgerModalOpen(false)}
        currentUser={user}
        lang={language}
        onRequireRegistration={() => setShowDemoRegisterPrompt(true)}
        onSubmitHelpPost={handleCreatePost}
        helpPosts={helpPosts}
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

      {/* 📡 SOS Live Tracker Modal */}
      <SosLiveTrackerModal
        isOpen={isSosLiveModalOpen}
        onClose={() => setIsSosLiveModalOpen(false)}
        currentUser={user}
        currentLocation={currentLocation}
        language={language}
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

export default UserDashboard;

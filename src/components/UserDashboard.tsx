
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
import { 
  Users, 
  MapPin, 
  Plus, 
  Search, 
  Sparkles, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Compass, 
  Layers, 
  MessageSquare,
  Volume2,
  RefreshCw,
  Bell,
  HeartHandshake,
  TrendingUp,
  Coins,
  ShieldCheck,
  Award,
  AlertTriangle,
  QrCode,
  Flame,
  ArrowRight,
  ShieldAlert,
  FileCheck,
  Inbox
} from 'lucide-react';
import { 
  subscribeToHelpPosts, 
  addHelpPostToFirestore, 
  updateHelpPostInFirestore, 
  deleteHelpPostFromFirestore,
  addReplyToFirestore,
  getUserFromFirestore,
  updateUserInFirestore,
  subscribeToUsers,
  subscribeToRedAlerts,
  subscribeToIssuesFromFirestore,
  subscribeToAidCentersFromFirestore
} from '../lib/firebase';
import { 
  getStoredLocations, 
  calculateRoadDistanceKm, 
  isWithinProximity, 
  getVillageOrTownDisplay,
  getNearestCityOrTown
} from '../utils/geoUtils';
import { getLocalizedPost, translateText, translateName, getCardLabels } from '../utils/postTranslator';
import { checkIsPostOwner } from '../utils/postOwnerHelper';
import { inspectAndSanitizeMessage } from '../utils/policyGuard';
import { getUserCreditBalance, deductPostingFee, extractNumericId } from '../utils/creditManager';
import { CreditTopUpModal } from './CreditTopUpModal';
import { InsufficientCreditsModal } from './InsufficientCreditsModal';
import { BoostAdModal } from './BoostAdModal';
import { triggerPickMeAlert } from '../utils/backgroundAlertEngine';
import { broadcastAppNotification } from '../utils/notificationManager';
import { SavedPlacesModal } from './SavedPlacesModal';

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
  language?: Language;
  setLanguage?: (lang: Language) => void;
  theme?: Theme;
  toggleTheme?: () => void;
  onNavigateToIssues?: () => void;
  onNavigateToAdmin?: () => void;
  onOpenSettings?: () => void;
  initialPosts?: HelpPost[];
  onUpdatePost?: (updatedPost: HelpPost) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  onLogout,
  language = 'si',
  setLanguage,
  theme = 'light',
  toggleTheme,
  onNavigateToIssues,
  onNavigateToAdmin,
  onOpenSettings,
  initialPosts,
  onUpdatePost: propOnUpdatePost,
}) => {
  // Active selected location filter
  const [currentLocation, setCurrentLocation] = useState<LocationOption>(() => {
    return initialLocations[0] || {
      id: 'katunayake',
      nameSi: 'කටුනායක',
      nameEn: 'Katunayake',
      lat: 7.1712,
      lng: 79.8978,
    };
  });

  // Stored / Available locations
  const [availableLocationsList, setAvailableLocationsList] = useState<LocationOption[]>(initialLocations);

  // Firestore synced help posts
  const [helpPosts, setLocalHelpPosts] = useState<HelpPost[]>(initialPosts || initialHelpPosts);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [redAlerts, setRedAlerts] = useState<RedAlertItem[]>([]);
  const [reportedIssues, setReportedIssues] = useState<Issue[]>([]);
  const [aidCenters, setAidCenters] = useState<any[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<TagItem | null>(null);
  const [boardCategoryFilter, setBoardCategoryFilter] = useState<string>('all');
  const [distanceRadiusKm, setDistanceRadiusKm] = useState<number>(50); // Default 50 km view radius
  const [activeMainTab, setActiveMainTab] = useState<'board' | 'messages' | 'requests'>('board');

  // Modal Visibility States
  const [selectedPostForDetail, setSelectedPostForDetail] = useState<HelpPost | null>(null);
  const [selectedPostForChat, setSelectedPostForChat] = useState<HelpPost | null>(null);
  const [selectedPostForConfirm, setSelectedPostForConfirm] = useState<HelpPost | null>(null);
  const [selectedPostToReply, setSelectedPostToReply] = useState<HelpPost | null>(null);
  const [editingPost, setEditingPost] = useState<HelpPost | null>(null);
  const [deletingPost, setDeletingPost] = useState<HelpPost | null>(null);
  const [viewingPost, setViewingPost] = useState<HelpPost | null>(null);

  // Additional Special Feature Modals
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'security' | 'places'>('profile');
  const [isSavedPlacesModalOpen, setIsSavedPlacesModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isPickMeAlertModalOpen, setIsPickMeAlertModalOpen] = useState(false);
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
  
  // User Wallet & Insufficient Credits Modals (Credit System)
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [insufficientCreditsState, setInsufficientCreditsState] = useState<{
    isOpen: boolean;
    category?: string;
    requiredCredits: number;
    currentCredits: number;
  }>({ isOpen: false, requiredCredits: 50, currentCredits: 0 });

  // Post Boosting Modal
  const [boostingPost, setBoostingPost] = useState<HelpPost | null>(null);

  // Emergency & Aid Ledger Modals
  const [isBloodAndDisasterModalOpen, setIsBloodAndDisasterModalOpen] = useState(false);
  const [bloodDisasterInitialTab, setBloodDisasterInitialTab] = useState<'blood' | 'disaster'>('blood');
  const [isAidLedgerModalOpen, setIsAidLedgerModalOpen] = useState(false);
  const [isEmergencyDirectoryOpen, setIsEmergencyDirectoryOpen] = useState(false);
  const [showDemoRegisterPrompt, setShowDemoRegisterPrompt] = useState(false);

  // Universal Quick Registration Hub
  const [isQuickRegistrationHubOpen, setIsQuickRegistrationHubOpen] = useState(false);

  // Postponed auto-resolution prompt list
  const [postponedResolutionPostIds, setPostponedResolutionPostIds] = useState<string[]>([]);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    const unsubPosts = subscribeToHelpPosts((posts) => {
      if (posts && Array.isArray(posts)) {
        setLocalHelpPosts(posts);
      }
    });

    const unsubUsers = subscribeToUsers((usersList) => {
      if (usersList && Array.isArray(usersList)) {
        setUsers(usersList);
      }
    });

    const unsubAlerts = subscribeToRedAlerts((alerts) => {
      if (alerts && Array.isArray(alerts)) {
        setRedAlerts(alerts);
      }
    });

    const unsubIssues = subscribeToIssuesFromFirestore((issues) => {
      if (issues && Array.isArray(issues)) {
        setReportedIssues(issues);
      }
    });

    const unsubAid = subscribeToAidCentersFromFirestore((centers) => {
      if (centers && Array.isArray(centers)) {
        setAidCenters(centers);
      }
    });

    return () => {
      unsubPosts();
      unsubUsers();
      unsubAlerts();
      unsubIssues();
      unsubAid();
    };
  }, []);

  // Listen for background alert click navigation events
  useEffect(() => {
    const handleNotificationClick = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      if (detail.targetModal === 'quick_service') {
        setBoardCategoryFilter('quick_services');
        setSelectedCategoryTitle('ඉක්මන් සේවා (Quick Services)');
      } else if (detail.targetModal === 'red_alert') {
        setIsBloodAndDisasterModalOpen(true);
        setBloodDisasterInitialTab('disaster');
      } else if (detail.targetModal === 'blood') {
        setIsBloodAndDisasterModalOpen(true);
        setBloodDisasterInitialTab('blood');
      } else if (detail.targetModal === 'aid_ledger') {
        setIsAidLedgerModalOpen(true);
      }

      if (detail.targetPostId && helpPosts.length > 0) {
        const found = helpPosts.find(p => p.id === detail.targetPostId);
        if (found) {
          setSelectedPostForDetail(found);
        }
      }
    };

    window.addEventListener('sahaya_notification_clicked', handleNotificationClick);
    return () => {
      window.removeEventListener('sahaya_notification_clicked', handleNotificationClick);
    };
  }, [helpPosts]);

  // Read available locations from storage
  useEffect(() => {
    const locs = getStoredLocations();
    if (locs && locs.length > 0) {
      setAvailableLocationsList(locs);
    }
  }, []);

  // Filter and sort help posts
  const filteredHelpPosts = useMemo(() => {
    return (helpPosts || []).filter((post) => {
      if (!post || post.isDeleted || post.isHidden || post.isHiddenByAdmin) return false;

      // 1. Distance Radius Filter
      const postLat = post.lat || 7.1712;
      const postLng = post.lng || 79.8978;
      const viewerLat = currentLocation.lat;
      const viewerLng = currentLocation.lng;

      const roadDistance = calculateRoadDistanceKm(viewerLat, viewerLng, postLat, postLng);
      const isWithinRadius = roadDistance <= distanceRadiusKm;
      const matchesDistance = distanceRadiusKm >= 100 ? true : isWithinRadius;

      // 2. Category Filter
      let matchesCategory = true;
      if (boardCategoryFilter === 'all') {
        matchesCategory = true;
      } else if (boardCategoryFilter === 'quick_services') {
        matchesCategory = post.category === 'quick_services' || post.category === 'quick' || post.tagCategory === 'ඉක්මන් සේවා';
      } else if (boardCategoryFilter === 'normal_services') {
        matchesCategory = post.category === 'normal_services' || post.category === 'services' || post.category === 'general';
      } else if (boardCategoryFilter === 'find_for_me') {
        matchesCategory = post.category === 'find_for_me';
      } else if (boardCategoryFilter === 'from_me_to_you') {
        matchesCategory = post.category === 'from_me_to_you';
      } else if (boardCategoryFilter === 'my_posts') {
        matchesCategory = checkIsPostOwner(user, post);
      }

      // 3. Tag Filter
      let matchesTagFilter = true;
      if (selectedTagFilter) {
        matchesTagFilter = post.tagId === selectedTagFilter.id || post.tagName === selectedTagFilter.tagName;
      }

      // 4. Search Keyword Query
      let matchesQuery = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const keywords = getExpandedSearchKeywords(q);
        const searchCorpus = `${post.title || ''} ${post.whatHappened || ''} ${post.whatIsNeeded || ''} ${post.locationName || ''} ${post.postCode || ''} ${post.tagName || ''} ${post.userName || ''}`.toLowerCase();
        matchesQuery = keywords.some(k => searchCorpus.includes(k)) || searchCorpus.includes(q);
      }

      return matchesDistance && matchesCategory && matchesTagFilter && matchesQuery;
    }).sort((a, b) => {
      // Priority 1: Pinned Emergency Posts
      if (a.isPinnedEmergency && !b.isPinnedEmergency) return -1;
      if (!a.isPinnedEmergency && b.isPinnedEmergency) return 1;

      // Priority 2: Boosted Ads
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;

      // Priority 3: Chronological (Newest first)
      const timeA = a.createdAtMs || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAtMs || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
  }, [helpPosts, currentLocation, distanceRadiusKm, boardCategoryFilter, selectedTagFilter, searchQuery, user]);

  // Count unread replies across user's own posts
  const inboxRepliesCount = useMemo(() => {
    return (helpPosts || [])
      .filter(p => checkIsPostOwner(user, p))
      .reduce((sum, p) => sum + (p.replies?.filter(r => !r.isAccepted && !r.isConfirmed).length || 0), 0);
  }, [helpPosts, user]);

  // Handler for creating a new post
  const handleCreatePost = async (newPostData: any) => {
    const categoryToSave = newPostData.category || 'quick_services';
    const tempPostCode = `#POST-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPost: HelpPost = {
      ...newPostData,
      id: `post_${Date.now()}`,
      postCode: tempPostCode,
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now(),
      createdAtIso: new Date().toISOString(),
      repliesCount: 0,
      helpersCount: newPostData.helpersNeeded || 1,
      replies: [],
      status: 'active',
    };

    setLocalHelpPosts((prev) => [newPost, ...prev]);

    try {
      const docId = await addHelpPostToFirestore(newPost);
      if (docId) {
        newPost.id = docId;
      }
    } catch (err) {
      console.error('Failed to create post in Firestore:', err);
    }
  };

  // Handler for updating an existing post
  const handleSaveEditedPost = async (updatedPost: HelpPost) => {
    setLocalHelpPosts((prev) =>
      (prev || []).map((p) => (p && p.id === updatedPost.id ? updatedPost : p))
    );

    if (selectedPostForDetail?.id === updatedPost.id) {
      setSelectedPostForDetail(updatedPost);
    }

    try {
      await updateHelpPostInFirestore(updatedPost.id, updatedPost);
    } catch (err) {
      console.error('Failed to update edited post in Firestore:', err);
    }
  };

  // Handler for deleting a post
  const handleDeletePost = async (postToDelete: HelpPost) => {
    setLocalHelpPosts((prev) =>
      (prev || []).filter((p) => p && p.id !== postToDelete.id)
    );

    try {
      await deleteHelpPostFromFirestore(postToDelete.id);
    } catch (err) {
      console.error('Failed to delete post from Firestore:', err);
    }
  };

  // Helper distance calculator
  const getPostDistance = (post: HelpPost) => {
    return calculateRoadDistanceKm(
      currentLocation.lat,
      currentLocation.lng,
      post.lat || 7.1712,
      post.lng || 79.8978
    );
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

  // Helper function to accept a specific helper offer
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
      console.error('Failed to accept helper offer in Firestore:', err);
    }
  };

  // Helper function to cancel a helper offer
  const handleCancelHelperOffer = async (post: HelpPost, reply: PostReply) => {
    const updatedReplies = (post.replies || []).filter((r) => r.id !== reply.id);
    const neededHelpers = post.helpersNeeded && post.helpersNeeded > 0 ? post.helpersNeeded : 1;
    const acceptedCount = updatedReplies.filter((r) => r && (r.isAccepted || r.isConfirmed)).length;
    const isComplete = acceptedCount >= neededHelpers;

    const updatedPost: HelpPost = {
      ...post,
      replies: updatedReplies,
      helpersAccepted: acceptedCount,
      isConfirmed: isComplete ? true : false,
      status: isComplete ? 'confirmed' : 'active',
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
        status: updatedPost.status,
      });
    } catch (err) {
      console.error('Failed to cancel helper offer in Firestore:', err);
    }
  };

  // Handler for marking help post as completed
  const handleCompleteHelpPost = async (completedPost: HelpPost) => {
    const helperName = user?.name || completedPost.confirmedHelperName || completedPost.confirmedBy || 'සහායක';
    const nowIso = new Date().toISOString();

    const updated: HelpPost = {
      ...completedPost,
      isCompleted: true,
      completedAt: nowIso,
      completedBy: helperName,
      status: 'completed',
    };

    setLocalHelpPosts((prev) =>
      (prev || []).map((p) => (p && p.id === completedPost.id ? updated : p))
    );

    try {
      await updateHelpPostInFirestore(completedPost.id, {
        isCompleted: true,
        completedAt: nowIso,
        completedBy: helperName,
        status: 'completed',
      });
    } catch (err) {
      console.error('Failed to complete post in Firestore:', err);
    }
  };

  // Handler for requester confirming issue resolved
  const handleRequesterConfirmResolved = async (resolvedPost: HelpPost) => {
    const nowIso = new Date().toISOString();
    const updated: HelpPost = {
      ...resolvedPost,
      requesterResolved: true,
      requesterResolvedAt: nowIso,
      status: 'completed',
      isCompleted: true,
    };

    setLocalHelpPosts((prev) =>
      (prev || []).map((p) => (p && p.id === resolvedPost.id ? updated : p))
    );

    try {
      await updateHelpPostInFirestore(resolvedPost.id, {
        requesterResolved: true,
        requesterResolvedAt: nowIso,
        status: 'completed',
        isCompleted: true,
      });
    } catch (err) {
      console.error('Failed to confirm resolved in Firestore:', err);
    }
  };

  // Handler for requester rejecting completion ("නොවිසඳුනි")
  const handleRequesterRejectCompletion = async (post: HelpPost) => {
    const updated: HelpPost = {
      ...post,
      isCompleted: false,
      completedAt: undefined,
      completedBy: undefined,
      status: 'confirmed',
    };

    setLocalHelpPosts((prev) =>
      (prev || []).map((p) => (p && p.id === post.id ? updated : p))
    );

    try {
      await updateHelpPostInFirestore(post.id, {
        isCompleted: false,
        completedAt: null,
        completedBy: null,
        status: 'confirmed',
      });
    } catch (err) {
      console.error('Failed to reject completion in Firestore:', err);
    }
  };

  // Handler for confirming a post (from Confirmation Modal or Detail Modal)
  const handleConfirmPost = async (confirmedPost: HelpPost) => {
    const updated: HelpPost = {
      ...confirmedPost,
      isConfirmed: true,
      confirmedAt: new Date().toISOString(),
      status: 'confirmed',
    };

    setLocalHelpPosts((prev) =>
      (prev || []).map((p) => (p && p.id === confirmedPost.id ? updated : p))
    );

    if (selectedPostForConfirm?.id === confirmedPost.id) {
      setSelectedPostForConfirm(updated);
    }
    if (selectedPostForDetail?.id === confirmedPost.id) {
      setSelectedPostForDetail(updated);
    }

    try {
      await updateHelpPostInFirestore(confirmedPost.id, updated);
    } catch (err) {
      console.error('Failed to update confirmed post in Firestore:', err);
    }
  };

  // Handler for sending a reply / offer
  const handleSendReply = async (message: string, whatsappSent = false) => {
    if (!selectedPostToReply) return;

    const newReply: PostReply = {
      id: `reply_${Date.now()}`,
      responderName: user.name,
      responderPhone: user.phone || user.whatsappNumber || '',
      responderId: user.userId || user.id,
      message: message.trim(),
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now(),
      whatsappSent,
      isAccepted: false,
      isConfirmed: false,
    };

    const updatedReplies = [...(selectedPostToReply.replies || []), newReply];
    const updatedPost: HelpPost = {
      ...selectedPostToReply,
      replies: updatedReplies,
      repliesCount: updatedReplies.length,
    };

    setLocalHelpPosts((prev) =>
      (prev || []).map((p) => (p && p.id === selectedPostToReply.id ? updatedPost : p))
    );

    try {
      await addReplyToFirestore(selectedPostToReply.id, newReply);
    } catch (err) {
      console.error('Failed to add reply to Firestore:', err);
    }

    setSelectedPostToReply(null);
  };

  const getLangText = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  // =========================================================================
  // MAIN DASHBOARD JSX RENDER
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#040e08] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* 1. Header with Location, Notifications & Settings */}
      <UnifiedDashboardHeader
        user={user}
        currentLocation={currentLocation}
        availableLocations={availableLocationsList}
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
        onLogout={onLogout}
        onNavigate={(view) => {
          if (view === 'admin' && onNavigateToAdmin) onNavigateToAdmin();
          if (view === 'issues' && onNavigateToIssues) onNavigateToIssues();
        }}
      />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        
        {/* Proximity Alerts Banner */}
        <ProximityAlertBanner
          userLocation={currentLocation}
          onOpenEmergencyDirectory={() => setIsEmergencyDirectoryOpen(true)}
          onOpenBloodRelief={() => {
            setIsBloodAndDisasterModalOpen(true);
            setBloodDisasterInitialTab('disaster');
          }}
        />

        {/* 6 Grid Quick Feature Shortcut Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-3">
          
          {/* Button 1: Quick Services (ඉක්මන් සේවා) */}
          <button
            type="button"
            onClick={() => setIsQuickServiceModalOpen(true)}
            className="p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md active:scale-95 transition-all text-left flex flex-col justify-between cursor-pointer border border-emerald-400/40 relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="px-2 py-0.5 rounded-full font-mono text-[9px] sm:text-[10px] font-black bg-white text-emerald-800 shadow-md">
                FAST ⚡
              </span>
            </div>
            <div className="min-w-0 mt-2">
              <h4 className="text-xs sm:text-sm md:text-base font-black text-white leading-tight">
                {getLangText('ඉක්මන් සේවා', 'Quick Services', 'விரைவு சேவைகள்')}
              </h4>
            </div>
          </button>

          {/* Button 2: Saved Places & Map (ස්ථාන සුරකින්න) */}
          <button
            type="button"
            onClick={() => setIsSavedPlacesModalOpen(true)}
            className="p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-teal-700 via-emerald-800 to-teal-900 hover:from-teal-800 hover:to-teal-950 text-white shadow-md active:scale-95 transition-all text-left flex flex-col justify-between cursor-pointer border border-teal-400/30 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="px-2 py-0.5 rounded-full font-mono text-[9px] sm:text-[10px] font-black bg-white text-teal-900 shadow-md">
                GPS 📍
              </span>
            </div>
            <div className="min-w-0 mt-2">
              <h4 className="text-xs sm:text-sm md:text-base font-black text-white leading-tight">
                {getLangText('ස්ථාන සුරකින්න', 'Saved Places', 'சேமித்த இடங்கள்')}
              </h4>
            </div>
          </button>

          {/* Button 3: Emergency Directory (හදිසි සේවා අංක) */}
          <button
            type="button"
            onClick={() => setIsEmergencyDirectoryOpen(true)}
            className="p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-amber-600 via-amber-500 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md active:scale-95 transition-all text-left flex flex-col justify-between cursor-pointer border border-amber-400/40 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
                <Phone className="w-4 h-4 text-white" />
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
                AI 🎙️
              </span>
            </div>
            <div className="min-w-0 mt-2">
              <h4 className="text-xs sm:text-sm md:text-base font-black text-white leading-tight">
                {getLangText('AI හඬ සහය', 'AI Voice SOS', 'AI குரல் உதவி')}
              </h4>
            </div>
          </button>

          {/* Button 5: Find For Me (සොයා දෙන්න) */}
          <button
            type="button"
            onClick={() => setIsFindForMeModalOpen(true)}
            className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl shadow-sky-600/30 border-2 border-sky-300/80 active:scale-95 transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[96px] sm:min-h-[108px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                <Search className="w-4 h-4 text-white" />
              </div>
              <span className="px-2 py-0.5 rounded-full font-mono text-[9px] sm:text-[10px] font-black bg-white text-sky-800 shadow-md">
                LOST & FOUND 🔍
              </span>
            </div>
            <div className="min-w-0 mt-2">
              <h4 className="text-xs sm:text-sm md:text-base font-black text-white leading-tight">
                {getLangText('සොයා දෙන්න', 'Find For Me', 'கண்டுபிடி')}
              </h4>
            </div>
          </button>

          {/* Button 6: From Me To You (මගෙන් ඔබට) */}
          <button
            type="button"
            onClick={() => setIsFromMeToYouModalOpen(true)}
            className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-rose-600 via-pink-600 to-emerald-600 hover:from-rose-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl shadow-rose-600/30 border-2 border-rose-300/80 active:scale-95 transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[96px] sm:min-h-[108px]"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-4 h-4 text-white" />
              </div>
              <span className="px-2 py-0.5 rounded-full font-mono text-[9px] sm:text-[10px] font-black bg-white text-rose-800 shadow-md">
                GIVEAWAY 🎁
              </span>
            </div>
            <div className="min-w-0 mt-2">
              <h4 className="text-xs sm:text-sm md:text-base font-black text-white leading-tight">
                {getLangText('මගෙන් ඔබට', 'From Me To You', 'என்னிடமிருந்து உங்களுக்கு')}
              </h4>
            </div>
          </button>

        </div>

        {/* 2. Top Quick Navigation Switcher: "සහය පුවරුව" and "පණිවිඩ & සංවාද" */}
        <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-200/80 dark:bg-slate-900/80 rounded-2xl border border-slate-300/80 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-1">
            <button
              type="button"
              onClick={() => setActiveMainTab('board')}
              className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMainTab === 'board'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{getLangText('සහය පුවරුව', 'Help Board', 'உதவி பலகை')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (user?.isDemo) {
                  setShowDemoRegisterPrompt(true);
                  return;
                }
                setActiveMainTab('messages');
              }}
              className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
                activeMainTab === 'messages'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>{getLangText('පණිවිඩ & සංවාද', 'Messages & Inbox', 'செய்திகள்')}</span>
              {inboxRepliesCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                  {inboxRepliesCount}
                </span>
              )}
            </button>
          </div>

          {/* Leaderboard Quick Button */}
          <button
            type="button"
            onClick={() => setIsLeaderboardOpen(true)}
            className="py-2 px-3 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Leaderboard</span>
          </button>
        </div>

        {/* 3. Category Grid & Search Bar */}
        <div className="space-y-3">
          <TagSearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedTagFilter={selectedTagFilter}
            setSelectedTagFilter={setSelectedTagFilter}
            lang={language}
          />

          <CategoryGrid
            activeCategory={boardCategoryFilter}
            onSelectCategory={(catId) => {
              setBoardCategoryFilter(catId);
              if (catId === 'quick_services') {
                setSelectedCategoryTitle('ඉක්මන් සේවා (Quick Services)');
              } else if (catId === 'normal_services') {
                setSelectedCategoryTitle('සාමාන්‍ය සේවා (Normal Services)');
              } else {
                setSelectedCategoryTitle('');
              }
            }}
            lang={language}
          />
        </div>

        {/* 4. Posts Feed List */}
        <div className="space-y-3 pt-2" id="help-notices-feed">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{selectedCategoryTitle || getLangText('සියලුම සේවා දැන්වීම්', 'All Service Posts', 'அனைத்து விளம்பரங்களும்')}</span>
              <span className="text-xs font-mono text-slate-500 font-normal">({filteredHelpPosts.length})</span>
            </h3>

            {/* Distance Radius Dropdown */}
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <select
                value={distanceRadiusKm}
                onChange={(e) => setDistanceRadiusKm(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-700 dark:text-slate-300 text-xs focus:outline-none cursor-pointer"
              >
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>ලංකාව පුරාම (All Island)</option>
              </select>
            </div>
          </div>

          {filteredHelpPosts.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#071710] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                මෙම ප්‍රදේශය තුළ දැනට දැන්වීම් කිසිවක් නොමැත.
              </p>
              <button
                type="button"
                onClick={() => setIsQuickServiceModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:scale-95"
              >
                පළමු සේවා ඉල්ලීම පළකරන්න
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {filteredHelpPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={user}
                  lang={language}
                  currentLocation={currentLocation}
                  onViewPost={(p) => setSelectedPostForDetail(p)}
                  onOpenChat={(p) => setSelectedPostForChat(p)}
                  onOpenConfirm={(p) => setSelectedPostForConfirm(p)}
                  onReplyPost={(p) => setSelectedPostToReply(p)}
                  onEditPost={(p) => setEditingPost(p)}
                  onDeletePost={(p) => setDeletingPost(p)}
                  onBoostPost={(p) => setBoostingPost(p)}
                />
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Floating Need Help Action Button */}
      <GlowingNeedHelpBtn
        onClick={() => {
          if (user?.isDemo) {
            setShowDemoRegisterPrompt(true);
            return;
          }
          setIsQuickServiceModalOpen(true);
        }}
      />

      {/* ========================================================================= */}
      {/* MODALS RENDERING SECTION                                                  */}
      {/* ========================================================================= */}

      {/* 1. Quick Services Request Form Modal */}
      <QuickServiceModal
        isOpen={isQuickServiceModalOpen}
        onClose={() => {
          setIsQuickServiceModalOpen(false);
          setEditingPost(null);
        }}
        onSubmitPost={handleCreatePost}
        currentLocation={currentLocation}
        availableLocations={availableLocationsList}
        currentUser={user}
        categories={initialLocations as any}
        lang={language}
        editPost={editingPost}
        onUpdatePost={handleSaveEditedPost}
      />

      {/* 2. Quick Services Detail Modal */}
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
          setEditingPost(p);
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

      {/* 3. Quick Services Chat Modal */}
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

      {/* 4. Quick Services Confirm Workflow */}
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        post={deletingPost}
        isOpen={!!deletingPost}
        onClose={() => setDeletingPost(null)}
        onConfirmDelete={handleDeletePost}
        lang={language}
      />

      {/* Message Inbox Modal */}
      <MessageInboxModal
        isOpen={isInboxModalOpen}
        onClose={() => setIsInboxModalOpen(false)}
        currentUser={user}
        userPosts={helpPosts.filter(p => checkIsPostOwner(user, p))}
        onOpenChat={(p) => {
          setIsInboxModalOpen(false);
          setSelectedPostForChat(p);
        }}
        lang={language}
      />

      {/* User Settings Modal */}
      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        user={user}
        onUpdateUser={(updated) => {
          setUsers(prev => (prev || []).map(u => u.id === updated.id ? updated : u));
        }}
        initialTab={settingsInitialTab}
        lang={language}
      />

      {/* Saved Places Modal */}
      <SavedPlacesModal
        isOpen={isSavedPlacesModalOpen}
        onClose={() => setIsSavedPlacesModalOpen(false)}
        currentUser={user}
        currentLocation={currentLocation}
        onSelectPlace={(loc) => setCurrentLocation(loc)}
      />

      {/* Blood Donation & Disaster Relief Modal */}
      <BloodAndDisasterModal
        isOpen={isBloodAndDisasterModalOpen}
        onClose={() => setIsBloodAndDisasterModalOpen(false)}
        currentUser={user}
        currentLocation={currentLocation}
        initialTab={bloodDisasterInitialTab}
        lang={language}
      />

      {/* Transparent Aid Ledger Modal */}
      <TransparentAidLedgerModal
        isOpen={isAidLedgerModalOpen}
        onClose={() => setIsAidLedgerModalOpen(false)}
        currentUser={user}
        currentLocation={currentLocation}
        lang={language}
      />

      {/* Emergency Directory Modal */}
      <EmergencyDirectoryModal
        isOpen={isEmergencyDirectoryOpen}
        onClose={() => setIsEmergencyDirectoryOpen(false)}
        currentLocation={currentLocation}
        lang={language}
      />

      {/* Demo Registration Prompt Modal */}
      <DemoRegistrationPromptModal
        isOpen={showDemoRegisterPrompt}
        onClose={() => setShowDemoRegisterPrompt(false)}
        onNavigateToRegister={() => {
          setShowDemoRegisterPrompt(false);
          onLogout();
        }}
        lang={language}
      />

      {/* Wallet Modal */}
      <CreditTopUpModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        user={user}
        lang={language}
      />

      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        isOpen={insufficientCreditsState.isOpen}
        onClose={() => setInsufficientCreditsState(prev => ({ ...prev, isOpen: false }))}
        onOpenTopUp={() => {
          setInsufficientCreditsState(prev => ({ ...prev, isOpen: false }));
          setIsWalletModalOpen(true);
        }}
        requiredCredits={insufficientCreditsState.requiredCredits}
        currentCredits={insufficientCreditsState.currentCredits}
        lang={language}
      />

      {/* Boost Ad Modal */}
      <BoostAdModal
        post={boostingPost}
        isOpen={!!boostingPost}
        onClose={() => setBoostingPost(null)}
        currentUser={user}
        onBoostSuccess={(updated) => {
          setLocalHelpPosts(prev => (prev || []).map(p => p.id === updated.id ? updated : p));
          setBoostingPost(null);
        }}
        lang={language}
      />

      {/* Find For Me Modal */}
      <FindForMeModal
        isOpen={isFindForMeModalOpen}
        onClose={() => setIsFindForMeModalOpen(false)}
        onSubmitPost={handleCreatePost}
        currentLocation={currentLocation}
        currentUser={user}
        lang={language}
      />

      {/* From Me To You Modal */}
      <FromMeToYouModal
        isOpen={isFromMeToYouModalOpen}
        onClose={() => setIsFromMeToYouModalOpen(false)}
        onSubmitPost={handleCreatePost}
        currentLocation={currentLocation}
        currentUser={user}
        lang={language}
      />

      {/* AI Voice SOS Modal */}
      <AiVoiceHelpModal
        isOpen={isAiVoiceModalOpen}
        onClose={() => setIsAiVoiceModalOpen(false)}
        onSubmitPost={handleCreatePost}
        currentLocation={currentLocation}
        currentUser={user}
        lang={language}
      />

      {/* Quick Registration Hub Modal */}
      <QuickRegistrationHubModal
        isOpen={isQuickRegistrationHubOpen}
        onClose={() => setIsQuickRegistrationHubOpen(false)}
        currentUser={user}
        onOpenIndividualRegister={() => {
          setIsQuickRegistrationHubOpen(false);
          onLogout();
        }}
        onOpenBusinessRegister={() => {
          setIsQuickRegistrationHubOpen(false);
        }}
        onOpenShopRegister={() => {
          setIsQuickRegistrationHubOpen(false);
        }}
      />

    </div>
  );
};

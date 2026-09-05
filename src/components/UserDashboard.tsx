import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Language, LocationOption, HelpPost, PostReply, Theme, CategoryItem, TagItem, ProfessionalService, ServiceReview } from '../types';
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
import { CategorySelectionModal } from './CategorySelectionModal';
import { CategoryGrid } from './CategoryGrid';
import { TagSearchBar } from './TagSearchBar';
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
import { getStoredTags } from '../utils/tagUtils';
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
  Type
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

  // Auto Load Live Location on Login / Dashboard Mount (Only if not manually locked)
  useEffect(() => {
    let isMounted = true;

    const isManualLocked = localStorage.getItem('sahaya_manual_location_locked') === 'true';
    if (isManualLocked) {
      // User has manually searched and saved a location: respect user choice and do not auto-overwrite
      return;
    }

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
          // If denied or timed out, silently keep the saved / default location
          if (isMounted) setIsAutoLoadingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000, // Accept cached position within 30s for lightning speed
        }
      );
    };

    autoFetchLiveLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  // Help Posts Feed State (Synced with Firestore Database & Parent App)
  const [localHelpPosts, setLocalHelpPosts] = useState<HelpPost[]>(() => {
    const saved = localStorage.getItem('sahaya_help_posts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { /* ignore */ }
    }
    return initialHelpPosts;
  });

  // Effective help posts list
  const helpPosts = (propHelpPosts !== undefined && propHelpPosts.length > 0) ? propHelpPosts : (localHelpPosts.length > 0 ? localHelpPosts : initialHelpPosts);

  // Real-time Firestore subscription if not provided by parent
  useEffect(() => {
    if (propHelpPosts !== undefined && propHelpPosts.length > 0) return;
    const unsubscribe = subscribeToHelpPosts((remotePosts) => {
      setLocalHelpPosts(remotePosts && remotePosts.length > 0 ? remotePosts : initialHelpPosts);
    });
    return () => unsubscribe();
  }, [propHelpPosts]);

  // Active Feed Tab: 'local' (<15km) vs 'all_sl' (>15km or all)
  const [dashboardView, setDashboardView] = useState<'home' | 'requests'>('requests');
  const [feedDistanceTab, setFeedDistanceTab] = useState<'local' | 'all_sl'>('all_sl');
  const [boardCategoryFilter, setBoardCategoryFilter] = useState<string>('');
  const [maxDistanceRadius, setMaxDistanceRadius] = useState<number>(15);
  const [searchQuery, setSearchQuery] = useState('');

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
  const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
  const [isFindForMeModalOpen, setIsFindForMeModalOpen] = useState(false);
  const [isFromMeToYouModalOpen, setIsFromMeToYouModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'font_size'>('profile');
  
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
    const postToDelete = (helpPosts || []).find((p) => p.id === postId);
    if (!postToDelete) return;

    if (propOnDeletePost) {
      propOnDeletePost(postId);
    } else {
      const deletedPayload: Partial<HelpPost> = {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: user.role === 'admin' ? `Admin (${user.name})` : (user.name || postToDelete.userName),
        status: 'deleted',
      };
      setLocalHelpPosts((prev) => (prev || []).map((p) => (p.id === postId ? { ...p, ...deletedPayload } : p)));
      try {
        await updateHelpPostInFirestore(postId, deletedPayload);
      } catch (err) {
        console.warn('Deleted locally, cloud notice:', err);
      }
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
    if (!post.lat || !post.lng || !currentLocation.lat || !currentLocation.lng) {
      return post.distanceKm || 20;
    }
    const R = 6371; // km
    const dLat = (post.lat - currentLocation.lat) * Math.PI / 180;
    const dLng = (post.lng - currentLocation.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(currentLocation.lat * Math.PI / 180) * Math.cos(post.lat * Math.PI / 180) *
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
  const filteredPosts = ((helpPosts && helpPosts.length > 0) ? helpPosts : initialHelpPosts).filter((post) => {
    if (!post || post.isDeleted || post.status === 'deleted') return false;

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
      const tagN = selectedTagFilter.tagName.toLowerCase();
      const tagC = selectedTagFilter.category.toLowerCase();
      matchesTagFilter =
        (post.tagName && post.tagName.toLowerCase() === tagN) ||
        (post.tagCategory && post.tagCategory.toLowerCase() === tagC) ||
        post.whatHappened.toLowerCase().includes(tagN) ||
        post.whatHappened.toLowerCase().includes(tagC) ||
        post.whatIsNeeded.toLowerCase().includes(tagN) ||
        post.whatIsNeeded.toLowerCase().includes(tagC);
    }

    // Query Keyword Check
    const matchesQuery = !query || 
      (post.tagName && post.tagName.toLowerCase().includes(query)) ||
      (post.tagCategory && post.tagCategory.toLowerCase().includes(query)) ||
      post.whatHappened.toLowerCase().includes(query) ||
      post.whatIsNeeded.toLowerCase().includes(query) ||
      post.userName.toLowerCase().includes(query) ||
      post.locationName.toLowerCase().includes(query) ||
      post.postCode.toLowerCase().includes(query);

    return matchesDistance && matchesCategory && matchesTagFilter && matchesQuery;
  }).sort((a, b) => {
    // Quick Service Priority: Quick services come first
    const aIsQuick = a.category === 'quick_services' || a.category === 'quick' || a.tagCategory === 'ඉක්මන් සේවා' || Boolean(a.tagName?.toLowerCase().includes('quick')) || Boolean(a.tagName?.includes('හදිසි'));
    const bIsQuick = b.category === 'quick_services' || b.category === 'quick' || b.tagCategory === 'ඉක්මන් සේවා' || Boolean(b.tagName?.toLowerCase().includes('quick')) || Boolean(b.tagName?.includes('හදිසි'));
    if (aIsQuick && !bIsQuick) return -1;
    if (!aIsQuick && bIsQuick) return 1;

    // Chronological sorting (newest first)
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
  const normalizePhone = (phone?: string) => (phone ? phone.replace(/\D/g, '') : '');
  const userPhoneClean = normalizePhone(user?.phone || user?.whatsappNumber);
  const myPosts = (helpPosts || []).filter((post) => {
    if (!post || post.isDeleted) return false;
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
      post.userName &&
      post.userName.trim().toLowerCase() === user.name.trim().toLowerCase()
    );
    return isPhoneMatch || isIdMatch || isNameMatch;
  });

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
        postCode: `#QS-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: 'මීට සුළු මොහොතකට පෙර',
        repliesCount: 0,
        helpersCount: 1,
        replies: [],
      };
      setLocalHelpPosts((prev) => [newPost, ...prev]);
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
        await addReplyToFirestore(postId, newReply, targetPost.replies || []);
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
      badge: '💼 PRO',
    },
    {
      id: 'from_me_to_you',
      title: language === 'en' ? 'From Me to You' : language === 'ta' ? 'என்னிடமிருந்து உங்களுக்கு' : 'මගෙන් ඔබට (From Me to You)',
      desc: language === 'en' ? 'Donations, clearance giveaways & item exchanges.' : language === 'ta' ? 'நன்கொடைகள், அகற்றல்கள் மற்றும் பரிமாற்றங்கள்.' : 'පරිත්‍යාග, ඉවත්කරන ද්‍රව්‍ය හෝ හුවමාරු භාණ්ඩ ලබාදීම.',
      icon: Gift,
      color: 'from-purple-500 to-pink-600',
      badge: '🎁 NEW',
    },
    {
      id: 'find_for_me',
      title: language === 'en' ? 'Find for Me' : language === 'ta' ? 'தேடித் தாருங்கள்' : 'සොයාදෙන්න (Find for Me)',
      desc: language === 'en' ? 'Lost, stolen or procurement search requests.' : language === 'ta' ? 'இழந்த அல்லது திருடப்பட்டவை தேடல் சேவை.' : 'නැතිවූ, සොරාගත් හෝ අවශ්‍ය දේ සොයාගැනීමේ සේවාව.',
      icon: Search,
      color: 'from-emerald-500 to-teal-600',
      badge: '🔍 NEW',
    },
    {
      id: 'emergency',
      title: t.emergencyService,
      desc: 'හදිසි ආපදා හෝ හදිසි අවස්ථාවලදී සෘජු සහය ලබාගැනීම.',
      icon: PhoneCall,
      color: 'from-red-500 to-rose-600',
      badge: '24/7 Priority',
    },
    {
      id: 'financial',
      title: t.financialService,
      desc: 'සුභසාධන දීමනා, ආධාර සහ සහය සේවා සඳහා ඉල්ලුම් කිරීම.',
      icon: HeartHandshake,
      color: 'from-amber-500 to-orange-600',
      badge: 'Welfare',
    },
    {
      id: 'tech',
      title: t.techSupportService,
      desc: 'පද්ධති භාවිතය, ගිණුම් තාක්ෂණික දෝෂ සඳහා උපකාර.',
      icon: Wrench,
      color: 'from-blue-500 to-cyan-600',
      badge: 'Technical',
    },
    {
      id: 'doc',
      title: t.docVerificationService,
      desc: 'හැඳුනුම්පත් සහ අනෙකුත් ලේඛන පරිපාලක සහතික කිරීම්.',
      icon: FileCheck2,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Verification',
    },
    {
      id: 'chat',
      title: t.directChatService,
      desc: 'සහය සේවා නිලධාරියෙකු සමඟ සෘජුව සංවාදයේ යෙදෙන්න.',
      icon: MessageCircle,
      color: 'from-purple-500 to-indigo-600',
      badge: 'Direct Support',
    },
  ];

  const getLangText = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-2 sm:py-4 space-y-4 sm:space-y-6 animate-fadeIn">
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
        onLogout={onLogout}
        activeRoleView={activeRoleView}
        setActiveRoleView={setActiveRoleView}
        onNavigate={onNavigate}
        isAutoLoadingLocation={isAutoLoadingLocation}
        autoLoadedNotice={autoLocationMsg}
      />

      {/* 2. Top Quick Navigation Switcher: "සේවා ඉල්ලීම්", "දැන්වීම් පුවරුව", and "සැකසුම් (Settings)" */}
      <div className="bg-gradient-to-r from-blue-50/95 via-white to-blue-50/95 dark:from-[#071927] dark:via-[#0b2236] dark:to-[#071927] border-2 border-blue-200/90 dark:border-blue-700/60 p-2 sm:p-2.5 rounded-3xl shadow-md shadow-blue-500/5 backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          {/* Button 1: සේවා ඉල්ලීම් (මට උදව් අවශ්‍යයි) */}
          <button
            type="button"
            onClick={() => {
              // Open the Service Category Request Form directly
              setIsCategoryModalOpen(true);
            }}
            className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-2xl font-black transition-all duration-200 cursor-pointer text-center sm:text-left relative overflow-hidden group bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg shadow-blue-600/20 border-2 border-blue-400/80 active:scale-[0.99]"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 bg-white/20 text-white shadow-xs">
              <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs sm:text-sm font-black truncate leading-tight flex items-center gap-1.5">
                <span>{getLangText('සේවා ඉල්ලීම්', 'Service Requests', 'சேவை கோரிக்கைகள்')}</span>
                <span className="px-1.5 py-0.2 rounded-md font-mono text-[9px] font-black bg-white/20 text-white">
                  + නව
                </span>
              </div>
              <div className="text-[10px] sm:text-xs font-bold truncate leading-tight mt-0.5 text-blue-100">
                {getLangText('මට උදව් අවශ්‍යයි (කාණ්ඩ ෆෝරමය)', 'I Need Help (Category Form)', 'எனக்கு உதவி தேவை (படிவம்)')}
              </div>
            </div>
          </button>

          {/* Button 2: දැන්වීම් පුවරුව */}
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
            className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-2xl font-black transition-all duration-200 cursor-pointer text-center sm:text-left relative overflow-hidden group bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg shadow-emerald-600/20 border-2 border-emerald-400/80 active:scale-[0.99]"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 bg-white/20 text-white shadow-xs">
              <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs sm:text-sm font-black truncate leading-tight flex items-center gap-1.5">
                <span>{getLangText('දැන්වීම් පුවරුව', 'Bulletin Board', 'அறிவிப்பு பலகை')}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold bg-white/20 text-white">
                  {helpPosts.length}
                </span>
              </div>
              <div className="text-[10px] sm:text-xs font-bold truncate leading-tight mt-0.5 text-emerald-100">
                {getLangText('සියලු උපකාර දැන්වීම් (සජීවී)', 'All Help Notices (Live)', 'அனைத்து உதவி அறிவிப்புகள்')}
              </div>
            </div>
          </button>

          {/* Button 3: Settings (සැකසුම්) - Profile Setting & Font Size */}
          <button
            type="button"
            onClick={() => {
              setSettingsInitialTab('profile');
              setIsSettingsModalOpen(true);
            }}
            className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-2xl font-black transition-all duration-200 cursor-pointer text-center sm:text-left relative overflow-hidden group bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 dark:from-[#132a1e] dark:to-[#0f281d] text-emerald-950 dark:text-emerald-100 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 border-2 border-emerald-300/80 dark:border-emerald-700/60 shadow-xs hover:shadow-md hover:scale-[1.01]"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 shadow-xs">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs sm:text-sm font-black truncate leading-tight flex items-center gap-1.5">
                <span>{getLangText('⚙️ සැකසුම් (Settings)', '⚙️ Settings', '⚙️ அமைப்புகள்')}</span>
                <span className="px-1.5 py-0.2 rounded-md font-mono text-[9px] font-black bg-emerald-600 text-white shadow-xs">
                  NEW
                </span>
              </div>
              <div className="text-[10px] sm:text-xs font-bold truncate leading-tight mt-0.5 text-emerald-700 dark:text-emerald-300">
                {getLangText('Profile Setting • Font Size', 'Profile Setting • Font Size', 'சுயவிவரம் • எழுத்துரு அளவு')}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Confirmed Helper Notice Banner (Requirement 04) */}
      {postsWhereIWasSelected.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] text-white shadow-xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn border-2 border-emerald-400/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ඔබව සහය සඳහා තෝරාගෙන ඇත!</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                "{postsWhereIWasSelected[0].userName || 'ගැටලුව සිදුවූ පුද්ගලයා'}" සහය සදහා ඔබ තොරාගෙන ඇත. ඔබ දෙදෙනා අතර ගැටලුවක් ඇති නොවන පරිදි සුහදශිලිව සහයවිමට වගබලාගන්න. ස්තුතියි ...!!!
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsVolunteerSupportModalOpen(true)}
            className="px-4 py-2.5 bg-white text-emerald-950 font-black text-xs rounded-xl hover:bg-emerald-50 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
          >
            තොරතුරු බලන්න
          </button>
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
          onOpenSupportOffers={(p) => {
            setTargetPostForOffers(p);
            setIsSupportOffersModalOpen(true);
          }}
          onOpenCreateModal={() => setIsCategoryModalOpen(true)}
          onBackToHome={() => setDashboardView('home')}
          professionalServices={professionalServices}
          onAddProfessionalService={handleAddProfessionalService}
          onAddProfessionalReview={handleAddProfessionalReview}
          registeredUsers={(() => {
            try {
              const saved = localStorage.getItem('sahaya_users');
              return saved ? JSON.parse(saved) : initialUsers;
            } catch {
              return initialUsers;
            }
          })()}
        />
      ) : (
        <>
          {/* 3. Step 2.2: Central Glowing "I Need Help" Button with Message Inbox Bubble at top right corner */}
          <GlowingNeedHelpBtn
            onClick={() => setIsCategoryModalOpen(true)}
            lang={language}
            topRightElement={
              <MessageInboxBubble
                user={user}
                helpPosts={helpPosts}
                onClick={() => setIsInboxModalOpen(true)}
              />
            }
          />

          {/* 3.1 Two Prominent Main Buttons: 'කැමැත්ත දැක්වූවන්' & 'සහය වන්න' */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
            {/* Button 1: කැමැත්ත දැක්වූවන් (Support Offers) */}
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
              {services.map((srv) => {
                const Icon = srv.icon;
                return (
                  <div
                    key={srv.id}
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
      />

      {/* 3. Quick Services Chat Modal (Node 5) */}
      <QuickServiceChatModal
        post={selectedPostForChat}
        isOpen={!!selectedPostForChat}
        onClose={() => setSelectedPostForChat(null)}
        currentUser={user}
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
              මෙම සේවාව ලබා ගැනීමට පහත පණිවිඩයක් තබා පරිපාලක වෙත යොමු කරන්න.
            </p>

            {requestSubmitted ? (
              <div className="py-6 text-center text-emerald-400 font-bold text-sm">
                ✅ සේවා ඉල්ලීම සාර්ථකව යොමු කෙරිණි!
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  rows={3}
                  placeholder="ඔබට අවශ්‍ය සහය පිළිබඳ සටහනක් ඇතුළත් කරන්න..."
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
        onOpenChat={(post) => {
          setViewingPost(null);
          setSelectedPostForChat(post);
        }}
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
        userPosts={myPosts}
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
          setSelectedPostToReply(post);
        }}
        onOpenChat={(post) => {
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
          setSelectedPostForChat(post);
        }}
        onOpenConfirm={(post) => {
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
      />

    </div>
  );
};


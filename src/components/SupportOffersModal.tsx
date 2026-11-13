import { stopContinuousSupportBell, isSupportBellRinging } from '../utils/supportBellRingtone';
import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  X,
  UserCheck,
  MessageCircle,
  Phone,
  Clock,
  Droplet,
  Bell,
  MapPin,
  Navigation,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  FileText,
  Eye,
  Heart,
} from 'lucide-react';
import {
  HelpPost,
  PostReply,
  Language,
  LocationOption,
  PRE_DONATION_GUIDELINES,
  calculateDistanceKm,
  createBloodDonationHonorPost,
} from '../types';
import { updateHelpPostInFirestore, deduplicatePostReplies, addHelpPostToFirestore } from '../lib/firebase';
import { getStoredHelpPosts, saveHelpPostsToStorage } from '../utils/storage';
import { checkIsPostOwner, checkIsAdmin } from '../utils/postOwnerHelper';

interface SupportOffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: any;
  targetPost?: HelpPost | null;
  currentUser?: any;
  userPosts: HelpPost[];
  lang?: Language;
  language?: any;
  viewerLocation?: LocationOption;
  onOpenChat?: (post: HelpPost) => void;
  onOpenConfirm?: (post: HelpPost, reply?: PostReply) => void;
  onSelectHelper?: (post: HelpPost, reply: PostReply) => void;
  onCancelOffer?: (post: HelpPost, reply: PostReply) => void;
  onUpdatePost?: (updatedPost: HelpPost) => void;
}

interface FlattenedOffer {
  post: HelpPost;
  reply: PostReply;
  isSelected: boolean;
  isPostOwner: boolean;
}

function extractParsedBloodDetails(post: any) {
  const rawNeeded = String(post?.whatIsNeeded || '');
  const rawHeadline = String(post?.headline || post?.title || post?.whatHappened || '');

  const parsePart = (label: string): string => {
    const regex = new RegExp(`${label}\\s*:\\s*([^•\\n]+)`, 'i');
    const match = rawNeeded.match(regex);
    return match && match[1] ? match[1].trim() : '';
  };

  const bgMatch = (post?.bloodGroup || rawHeadline || post?.tagName || rawNeeded).match(/(AB|A|B|O)[+-]/i);
  const bloodGroup = post?.bloodGroup || parsePart('ලේ වර්ගය') || (bgMatch ? bgMatch[0].toUpperCase() : 'O+');

  let hospitalFromHeadline = '';
  if (rawHeadline.includes(':')) {
    hospitalFromHeadline = rawHeadline.split(':').slice(1).join(':').trim();
  }

  const hospitalName =
    post?.hospitalName ||
    parsePart('රෝහල') ||
    hospitalFromHeadline ||
    post?.locationName ||
    post?.city ||
    'රෝහල';

  const patientName =
    post?.patientName ||
    parsePart('රෝගී නම') ||
    post?.contactPersonName ||
    post?.userName ||
    'රෝගියා';

  const unitsNeeded =
    post?.unitsNeeded ||
    parsePart('අවශ්‍ය ඒකක') ||
    post?.helpersNeeded ||
    1;

  const district =
    post?.district ||
    parsePart('දිස්ත්‍රික්කය') ||
    post?.city ||
    '';

  const neededDate =
    post?.neededDate ||
    parsePart('අවශ්‍ය දිනය') ||
    'කඩිනමින් (හදිසි)';

  const additionalNotes =
    post?.additionalNotes ||
    parsePart('සටහන්') ||
    post?.specialNotice ||
    '';

  const wardNumber =
    post?.wardNumber ||
    parsePart('වාට්ටු අංකය') ||
    parsePart('වාට්ටුව') ||
    additionalNotes ||
    'රුධිර බැංකුව (Blood Bank)';

  const requestSlipNumber =
    post?.requestSlipNumber ||
    parsePart('ගොනු අංකය') ||
    parsePart('පත්‍රිකා අංකය') ||
    post?.postCode ||
    'රුධිර බැංකු ගොනුව';

  const requestSlipPhotoUrl =
    post?.requestSlipPhotoUrl ||
    post?.imageUrl ||
    post?.photoUrl ||
    post?.image ||
    '';

  const dropLocationUrl = post?.dropLocationUrl || post?.externalLink || '';

  const lat =
    typeof post?.hospitalPinLat === 'number'
      ? post.hospitalPinLat
      : typeof post?.latitude === 'number'
      ? post.latitude
      : typeof post?.lat === 'number'
      ? post.lat
      : null;
  const lng =
    typeof post?.hospitalPinLng === 'number'
      ? post.hospitalPinLng
      : typeof post?.longitude === 'number'
      ? post.longitude
      : typeof post?.lng === 'number'
      ? post.lng
      : null;

  const mapQuery =
    lat !== null && lng !== null
      ? `${lat},${lng}`
      : `${hospitalName}${district && !hospitalName.includes(district) ? `, ${district}` : ''}, Sri Lanka`;

  const googleMapsNavUrl =
    dropLocationUrl && /^https?:\/\//i.test(dropLocationUrl)
      ? dropLocationUrl
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}&travelmode=driving`;
  const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`;

  return {
    bloodGroup,
    hospitalName,
    patientName,
    unitsNeeded,
    district,
    neededDate,
    additionalNotes,
    wardNumber,
    requestSlipNumber,
    requestSlipPhotoUrl,
    dropLocationUrl,
    lat,
    lng,
    rawNeeded,
    rawHeadline,
    mapQuery,
    googleMapsNavUrl,
    googleMapsEmbedUrl,
  };
}

export const SupportOffersModal: React.FC<SupportOffersModalProps> = ({
  isOpen,
  onClose,
  userPosts = [],
  currentUser,
  onOpenChat,
  onOpenConfirm,
  onSelectHelper,
  onUpdatePost,
  targetPost,
}) => {
  const [selectedPostIdFilter, setSelectedPostIdFilter] = useState<string>('all');
  const [bellRinging, setBellRinging] = useState<boolean>(() => isSupportBellRinging());
  const [viewingSlipPhoto, setViewingSlipPhoto] = useState<string | null>(null);
  const [showUberPickerForConfirm, setShowUberPickerForConfirm] = useState<boolean>(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [completedCelebration, setCompletedCelebration] = useState<{
    donorName: string;
    hospitalName: string;
  } | null>(null);
  const [celebrationCountdown, setCelebrationCountdown] = useState<number>(5);

  // Poster Step 2 editable fields (so poster can verify/provide Patient Name, Ward No, Slip No/Photo, Drop Location)
  const [posterPatientName, setPosterPatientName] = useState('');
  const [posterWardNumber, setPosterWardNumber] = useState('');
  const [posterSlipNumber, setPosterSlipNumber] = useState('');
  const [posterSlipPhotoUrl, setPosterSlipPhotoUrl] = useState('');
  const [posterDropLocationUrl, setPosterDropLocationUrl] = useState('');
  const [posterPinLat, setPosterPinLat] = useState<number | null>(null);
  const [posterPinLng, setPosterPinLng] = useState<number | null>(null);

  // Donor Step 3 "තේරුම් ගත්තෙමි" acknowledgment state per post
  const [acknowledgedMap, setAcknowledgedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (targetPost && targetPost.id) {
      setSelectedPostIdFilter(targetPost.id);
      const parsed = extractParsedBloodDetails(targetPost);
      setPosterPatientName(parsed.patientName !== 'රෝගියා' ? parsed.patientName : '');
      setPosterWardNumber(
        parsed.wardNumber !== 'රුධිර බැංකුව (Blood Bank)' ? parsed.wardNumber : ''
      );
      setPosterSlipNumber(
        parsed.requestSlipNumber !== 'රුධිර බැංකු ගොනුව' ? parsed.requestSlipNumber : ''
      );
      setPosterSlipPhotoUrl(parsed.requestSlipPhotoUrl || '');
      setPosterDropLocationUrl(parsed.dropLocationUrl || '');
      setPosterPinLat(parsed.lat);
      setPosterPinLng(parsed.lng);
    } else {
      setSelectedPostIdFilter('all');
    }
    setBellRinging(isSupportBellRinging());
    setCompletedCelebration(null);
  }, [isOpen, targetPost?.id]);

  useEffect(() => {
    const handleBellState = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setBellRinging(Boolean(detail && detail.isRinging));
    };
    window.addEventListener('sahaya_support_bell_state', handleBellState);
    return () => window.removeEventListener('sahaya_support_bell_state', handleBellState);
  }, []);

  const handleAcknowledgeBell = () => {
    stopContinuousSupportBell();
    setBellRinging(false);
  };

  const handleCloseModal = () => {
    stopContinuousSupportBell();
    setBellRinging(false);
    setCompletedCelebration(null);
    onClose();
  };

  const handlePosterSlipPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPosterSlipPhotoUrl(String(ev.target?.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handlePosterPinGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosterPinLat(pos.coords.latitude);
          setPosterPinLng(pos.coords.longitude);
          setPosterDropLocationUrl(
            `https://www.google.com/maps/dir/?api=1&destination=${pos.coords.latitude},${pos.coords.longitude}&travelmode=driving`
          );
        },
        () => {
          alert('GPS පිහිටීම ලබාගැනීමට නොහැකි විය. කරුණාකර Google Maps Link එක ඇතුළත් කරන්න.');
        }
      );
    }
  };

  const myUserId = String(currentUser?.userId || currentUser?.id || '').trim();
  const myPhone = String(currentUser?.whatsappPhone || currentUser?.phone || (currentUser as any)?.whatsappNumber || '').replace(/\D/g, '');
  const myName = String(currentUser?.name || '').trim().toLowerCase();
  const isAdminUser = checkIsAdmin(currentUser);

  const isMyReplyMatch = (rep: any): boolean => {
    if (!rep || !currentUser) return false;
    const rId = String(rep.responderId || '').trim();
    if (rId && myUserId && rId !== 'helper_user' && rId === myUserId) return true;
    const rPhone = String(rep.responderPhone || '').replace(/\D/g, '');
    if (rPhone.length >= 9 && myPhone.length >= 9 && rPhone.slice(-9) === myPhone.slice(-9)) return true;
    const rName = String(rep.responderName || '').trim().toLowerCase();
    if (rName && myName && rName === myName) return true;
    return false;
  };

  const livePostsList: HelpPost[] = (() => {
    const base = Array.isArray(userPosts) ? [...userPosts] : [];
    if (targetPost && targetPost.id) {
      const idx = base.findIndex(
        (p) =>
          p &&
          (String(p.id) === String(targetPost.id) ||
            (targetPost.postCode && p.postCode && String(p.postCode).toUpperCase() === String(targetPost.postCode).toUpperCase()))
      );
      if (idx === -1) {
        base.unshift(targetPost);
      } else {
        const existing = base[idx];
        const mergedReps = deduplicatePostReplies(
          [...(Array.isArray(existing.replies) ? existing.replies : []), ...(Array.isArray(targetPost.replies) ? targetPost.replies : [])],
          existing
        );
        base[idx] = {
          ...targetPost,
          ...existing,
          replies: mergedReps,
          repliesCount: mergedReps.length,
        };
      }
    }
    return base;
  })();

  const allOffers: FlattenedOffer[] = [];
  livePostsList.forEach((post) => {
    if (!post || !post.id || post.status === 'deleted' || post.isDeleted) return;
    const isTargetMatch = Boolean(
      targetPost &&
        (String(targetPost.id) === String(post.id) ||
          (targetPost.postCode && post.postCode && String(targetPost.postCode).toUpperCase() === String(post.postCode).toUpperCase()))
    );
    const rawIsOwner = checkIsPostOwner(currentUser, post);
    const cleanReplies = deduplicatePostReplies(post.replies || [], post);

    if (cleanReplies.length > 0) {
      cleanReplies.forEach((rep) => {
        if (!rep || (rep as any).declinedByPoster) return;
        const isMine = isMyReplyMatch(rep);
        const effectiveIsOwner = rawIsOwner || (!isMine && (isAdminUser || isTargetMatch));
        if (!effectiveIsOwner && !isMine && !isAdminUser) {
          return;
        }
        const isSelected = Boolean(
          rep.isConfirmed ||
            rep.isAccepted ||
            (post.isConfirmed &&
              (post.confirmedHelperName === rep.responderName ||
                post.confirmedBy === rep.responderName ||
                (post.confirmedHelperPhone &&
                  rep.responderPhone &&
                  String(post.confirmedHelperPhone).replace(/\D/g, '').slice(-9) ===
                    String(rep.responderPhone).replace(/\D/g, '').slice(-9))))
        );
        allOffers.push({
          post: { ...post, replies: cleanReplies, repliesCount: cleanReplies.length },
          reply: rep,
          isSelected,
          isPostOwner: effectiveIsOwner,
        });
      });
    } else if (post.isConfirmed && (post.confirmedHelperName || post.confirmedBy) && (rawIsOwner || isAdminUser || isTargetMatch)) {
      allOffers.push({
        post,
        reply: {
          id: 'confirmed_helper',
          responderName: post.confirmedHelperName || post.confirmedBy || 'තහවුරු කළ සහායක',
          responderPhone: post.confirmedHelperPhone || '',
          message: '',
          createdAt: post.confirmedAt || post.createdAt,
          isConfirmed: true,
          isAccepted: true,
        },
        isSelected: true,
        isPostOwner: true,
      });
    }
  });

  const filteredOffers =
    selectedPostIdFilter === 'all'
      ? allOffers
      : allOffers.filter(
          (off) =>
            off.post &&
            (String(off.post.id) === String(selectedPostIdFilter) ||
              (targetPost?.postCode && off.post.postCode && String(off.post.postCode).toUpperCase() === String(targetPost.postCode).toUpperCase()))
        );

  const isAnyOfferSelected = filteredOffers.some(
    (off) =>
      off.isSelected ||
      off.post.isConfirmed ||
      Number((off.post as any).bloodWorkflowStep) >= 3 ||
      Number((off.reply as any).workflowStep) >= 3
  );

  useEffect(() => {
    if (isAnyOfferSelected && bellRinging) {
      stopContinuousSupportBell();
      setBellRinging(false);
    }
  }, [isAnyOfferSelected, bellRinging]);

  if (!isOpen) return null;

  const isBloodPostCheck = (p: any): boolean =>
    Boolean(
      p?.postType !== 'blood_donation_honor' &&
        (p?.postType === 'blood_request' ||
          p?.serviceType === 'blood_donation' ||
          String(p?.postCode || '').toUpperCase().startsWith('#BLD-') ||
          (p?.tagName && (String(p.tagName).includes('ලේ') || String(p.tagName).toLowerCase().includes('blood'))))
    );

  const isReplySameHelper = (r: any, targetReply: PostReply) => {
    if (!r || !targetReply) return false;
    if (r.id && targetReply.id && r.id === targetReply.id) return true;
    const rPh = String(r.responderPhone || '').replace(/\D/g, '');
    const tPh = String(targetReply.responderPhone || '').replace(/\D/g, '');
    if (rPh.length >= 9 && tPh.length >= 9 && rPh.slice(-9) === tPh.slice(-9)) return true;
    const rNm = String(r.responderName || '').trim().toLowerCase();
    const tNm = String(targetReply.responderName || '').trim().toLowerCase();
    return Boolean(rNm && tNm && rNm === tNm);
  };

  // STEP 2 ACTION (Poster selects & confirms Donor and sends Patient Name, Ward No, File No/Photo, Drop Location)
  const handleSelectAction = async (post: HelpPost, reply: PostReply) => {
    handleAcknowledgeBell();
    try {
      window.dispatchEvent(
        new CustomEvent('sahaya_stop_alert_for_post', {
          detail: { postId: post.id, postCode: post.postCode },
        })
      );
    } catch {}

    const isBloodPost = isBloodPostCheck(post);
    const isQuickService = Boolean(
      !isBloodPost &&
        ((post as any).isQuickService ||
          post.category === 'quick_service' ||
          String(post.postCode || '').toUpperCase().startsWith('#QS-'))
    );

    const parsed = extractParsedBloodDetails(post);
    const finalPatientName = posterPatientName.trim() || parsed.patientName;
    const finalWardNumber = posterWardNumber.trim() || parsed.wardNumber;
    const finalSlipNumber = posterSlipNumber.trim() || parsed.requestSlipNumber;
    const finalSlipPhotoUrl = posterSlipPhotoUrl || parsed.requestSlipPhotoUrl;
    const finalDropLocationUrl = posterDropLocationUrl.trim() || parsed.dropLocationUrl;
    const finalPinLat = posterPinLat !== null ? posterPinLat : parsed.lat;
    const finalPinLng = posterPinLng !== null ? posterPinLng : parsed.lng;

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const cleanReplies = deduplicatePostReplies(post.replies || [], post);
    const updatedReplies = cleanReplies.map((r) =>
      isReplySameHelper(r, reply)
        ? {
            ...r,
            isAccepted: true,
            isConfirmed: true,
            ...(isBloodPost ? { workflowStep: 3, step3GuidelinesAccepted: false } : {}),
          }
        : r
    );

    const updatedPost: HelpPost = {
      ...post,
      replies: updatedReplies,
      repliesCount: updatedReplies.length,
      isConfirmed: true,
      confirmedHelperId: reply.responderId || post.confirmedHelperId,
      confirmedHelperName: reply.responderName || post.confirmedHelperName,
      confirmedHelperPhone: reply.responderPhone || post.confirmedHelperPhone,
      confirmedBy: reply.responderName || post.confirmedBy,
      confirmedAt: nowIso,
      serviceStage: 'in_progress' as any,
      lastStepUpdatedAtMs: nowMs,
      lastStepByRole: 'poster',
      ...(isBloodPost
        ? {
            bloodWorkflowStep: 3,
            patientName: finalPatientName,
            wardNumber: finalWardNumber,
            requestSlipNumber: finalSlipNumber,
            requestSlipPhotoUrl: finalSlipPhotoUrl,
            dropLocationUrl: finalDropLocationUrl,
            hospitalPinLat: finalPinLat || undefined,
            hospitalPinLng: finalPinLng || undefined,
          }
        : {}),
    } as any;

    if (onUpdatePost) {
      onUpdatePost(updatedPost);
    }

    try {
      await updateHelpPostInFirestore(post.id, {
        replies: updatedReplies,
        repliesCount: updatedReplies.length,
        isConfirmed: true,
        confirmedHelperId: updatedPost.confirmedHelperId || '',
        confirmedHelperName: updatedPost.confirmedHelperName || '',
        confirmedHelperPhone: updatedPost.confirmedHelperPhone || '',
        confirmedBy: updatedPost.confirmedBy || '',
        confirmedAt: nowIso,
        serviceStage: 'in_progress' as any,
        lastStepUpdatedAtMs: nowMs,
        lastStepByRole: 'poster',
        ...(isBloodPost
          ? {
              bloodWorkflowStep: 3,
              patientName: finalPatientName,
              wardNumber: finalWardNumber,
              requestSlipNumber: finalSlipNumber,
              requestSlipPhotoUrl: finalSlipPhotoUrl,
              dropLocationUrl: finalDropLocationUrl,
              hospitalPinLat: finalPinLat || null,
              hospitalPinLng: finalPinLng || null,
            }
          : {}),
      } as any);
    } catch {}

    if (onSelectHelper) {
      onSelectHelper(updatedPost, reply);
    }
    if (isQuickService && onOpenConfirm) {
      onOpenConfirm(updatedPost, reply);
      return;
    }
    onClose();
  };

  const handleDeclineAction = async (post: HelpPost, reply: PostReply) => {
    handleAcknowledgeBell();
    const cleanReplies = deduplicatePostReplies(post.replies || [], post);
    const updatedReplies = cleanReplies.map((r) =>
      isReplySameHelper(r, reply) ? { ...r, declinedByPoster: true } : r
    );
    const updatedPost: HelpPost = {
      ...post,
      replies: updatedReplies,
      repliesCount: updatedReplies.length,
    } as any;
    if (onUpdatePost) onUpdatePost(updatedPost);
    try {
      await updateHelpPostInFirestore(post.id, {
        replies: updatedReplies,
        repliesCount: updatedReplies.length,
      } as any);
    } catch {}
  };

  // STEP 3A: Donor clicks "තේරුම් ගත්තෙමි" on Pre-Donation Guidelines -> reveals Patient Name, Ward No, File No/Photo, Drop Location
  const handleDonorAcknowledgeGuidelines = async (post: HelpPost, reply: PostReply) => {
    setAcknowledgedMap((prev) => ({ ...prev, [post.id]: true }));
    try {
      localStorage.setItem(`sahaya_blood_step3_ack_${post.id}`, 'true');
    } catch {}

    const cleanReplies = deduplicatePostReplies(post.replies || [], post);
    const updatedReplies = cleanReplies.map((r) =>
      isReplySameHelper(r, reply)
        ? { ...r, guidelinesAccepted: true, step3GuidelinesAccepted: true }
        : r
    );
    const updatedPost: HelpPost = {
      ...post,
      replies: updatedReplies,
      guidelinesAccepted: true,
      step3GuidelinesAccepted: true,
    } as any;
    if (onUpdatePost) onUpdatePost(updatedPost);
    try {
      await updateHelpPostInFirestore(post.id, {
        replies: updatedReplies,
        guidelinesAccepted: true,
        step3GuidelinesAccepted: true,
      } as any);
    } catch {}
  };

  const handleToggleShareLocation = (post: HelpPost, reply: PostReply) => {
    if (!navigator.geolocation) {
      alert('ඔබගේ උපාංගයේ GPS පහසුකම ක්‍රියාත්මක නොවේ.');
      return;
    }
    setIsSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const parsed = extractParsedBloodDetails(post);
        const distKm =
          parsed.lat !== null && parsed.lng !== null
            ? calculateDistanceKm(pos.coords.latitude, pos.coords.longitude, parsed.lat, parsed.lng)
            : undefined;
        const liveLoc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          updatedAt: new Date().toLocaleTimeString('si-LK', { hour: '2-digit', minute: '2-digit' }),
          distanceKm: distKm,
        };
        const cleanReplies = deduplicatePostReplies(post.replies || [], post);
        const updatedReplies = cleanReplies.map((r) =>
          isReplySameHelper(r, reply) ? { ...r, donorLiveLocation: liveLoc } : r
        );
        const updatedPost: HelpPost = {
          ...post,
          replies: updatedReplies,
          donorLiveLocation: liveLoc,
        } as any;
        if (onUpdatePost) onUpdatePost(updatedPost);
        try {
          await updateHelpPostInFirestore(post.id, {
            replies: updatedReplies,
            donorLiveLocation: liveLoc,
          } as any);
        } catch {}
      },
      () => {
        setIsSharingLocation(false);
      }
    );
  };

  // STEP 3B ACTION (Donor confirms blood donated -> advances to Step 4)
  const handleDonorConfirmBloodDonated = async (post: HelpPost, reply: PostReply) => {
    handleAcknowledgeBell();
    const nowMs = Date.now();
    const cleanReplies = deduplicatePostReplies(post.replies || [], post);
    const updatedReplies = cleanReplies.map((r) =>
      isReplySameHelper(r, reply)
        ? {
            ...r,
            isAccepted: true,
            isConfirmed: true,
            donorArrivedAtHospital: true,
            bloodDonatedByHelper: true,
            workflowStep: 4,
          }
        : r
    );
    const updatedPost: HelpPost = {
      ...post,
      replies: updatedReplies,
      repliesCount: updatedReplies.length,
      isConfirmed: true,
      donorArrivedAtHospital: true,
      bloodDonatedByHelper: true,
      bloodWorkflowStep: 4,
      lastStepUpdatedAtMs: nowMs,
      lastStepByRole: 'helper',
    } as any;

    if (onUpdatePost) {
      onUpdatePost(updatedPost);
    }
    try {
      await updateHelpPostInFirestore(post.id, {
        replies: updatedReplies,
        repliesCount: updatedReplies.length,
        isConfirmed: true,
        donorArrivedAtHospital: true,
        bloodDonatedByHelper: true,
        bloodWorkflowStep: 4,
        lastStepUpdatedAtMs: nowMs,
        lastStepByRole: 'helper',
      } as any);
    } catch {}
    onClose();
  };

  // STEP 4 ACTION (Poster confirms blood received -> Publishes Free General Services Appreciation Post with Donor Name, Place & Long-Life Wish)
  const handlePosterCompleteBloodWorkflow = async (post: HelpPost, reply: PostReply) => {
    handleAcknowledgeBell();
    const nowMs = Date.now();
    const cleanReplies = deduplicatePostReplies(post.replies || [], post);
    const updatedReplies = cleanReplies.map((r) =>
      isReplySameHelper(r, reply)
        ? {
            ...r,
            isAccepted: true,
            isConfirmed: true,
            bloodDonatedByHelper: true,
            workflowStep: 5,
          }
        : r
    );
    const updatedPost: HelpPost = {
      ...post,
      replies: updatedReplies,
      repliesCount: updatedReplies.length,
      isConfirmed: true,
      bloodDonatedByHelper: true,
      isResolved: true,
      status: 'resolved',
      serviceStage: 'completed' as any,
      bloodWorkflowStep: 5,
      lastStepUpdatedAtMs: nowMs,
      lastStepByRole: 'poster',
    } as any;

    if (onUpdatePost) {
      onUpdatePost(updatedPost);
    }
    try {
      await updateHelpPostInFirestore(post.id, {
        replies: updatedReplies,
        repliesCount: updatedReplies.length,
        isConfirmed: true,
        bloodDonatedByHelper: true,
        isResolved: true,
        status: 'resolved',
        serviceStage: 'completed' as any,
        bloodWorkflowStep: 5,
        lastStepUpdatedAtMs: nowMs,
        lastStepByRole: 'poster',
      } as any);
    } catch {}

    try {
      const rawBlood = localStorage.getItem('sahaya_blood_requests');
      if (rawBlood) {
        const parsedBlood = JSON.parse(rawBlood);
        if (Array.isArray(parsedBlood)) {
          const updatedBlood = parsedBlood.map((b: any) =>
            b && (String(b.id) === String(post.id) || String(b.id) === String(post.postCode || '').replace('#', ''))
              ? { ...b, status: 'fulfilled' }
              : b
          );
          localStorage.setItem('sahaya_blood_requests', JSON.stringify(updatedBlood));
          window.dispatchEvent(new CustomEvent('sahaya_blood_disaster_updated'));
        }
      }
    } catch {}

    // 04. අවසානයේ සාමාන්‍ය සේවා හරහා නොමිලේ ලේ පරිත්‍යාග කළ තැනැත්තාට ස්තූති කරමින් නම සහ ස්ථානය සඳහන් කර දීර්ඝායුෂ ප්‍රාර්ථනා කිරීම
    const parsed = extractParsedBloodDetails(post);
    const donorName = reply.responderName || (post as any).confirmedHelperName || 'උතුම් පරිත්‍යාගශීලියා';
    const hospitalName = parsed.hospitalName || post.locationName || 'රෝහල';

    if (isBloodPostCheck(post)) {
      try {
        const honorPost = createBloodDonationHonorPost(donorName, hospitalName, parsed.district || post.district);
        addHelpPostToFirestore(honorPost).catch(() => {});
        const stored = getStoredHelpPosts();
        const next = [honorPost, ...(stored || []).filter((p) => p && p.id !== honorPost.id)];
        saveHelpPostsToStorage(next);
        window.dispatchEvent(new CustomEvent('sahaya_post_created', { detail: { post: honorPost } }));
      } catch (err) {
        console.warn('Honor post creation error:', err);
      }
    }

    setCompletedCelebration({ donorName, hospitalName });
    let sec = 6;
    setCelebrationCountdown(sec);
    const interval = setInterval(() => {
      sec -= 1;
      setCelebrationCountdown(sec);
      if (sec <= 0) {
        clearInterval(interval);
        window.dispatchEvent(new CustomEvent('sahaya_blood_modal_close'));
        handleCloseModal();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        id="support-offers-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-[#071710] border-2 border-rose-500/70 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative"
      >
        {/* Ringing Indicator Banner */}
        {bellRinging && !isAnyOfferSelected && (
          <div className="w-full py-2.5 px-4 bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-between gap-2 animate-pulse">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-4 h-4 animate-bounce shrink-0" />
              <span className="truncate">🔔 පරිත්‍යාගශීලියා තහවුරු කරන තුරු සීනුව නාද වේ...</span>
            </div>
            <button
              type="button"
              onClick={handleAcknowledgeBell}
              className="px-2.5 py-1 rounded-lg bg-slate-950 text-amber-300 text-[11px] font-black shrink-0 cursor-pointer"
            >
              නිහඬ කරන්න
            </button>
          </div>
        )}

        {/* Top Bar */}
        <div className="px-4 py-3 bg-gradient-to-r from-rose-900 via-red-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <span className="text-xs sm:text-sm font-black flex items-center gap-2">
            <Droplet className="w-4 h-4 fill-current text-rose-400" />
            <span>රුධිර පරිත්‍යාග සත්කාරක පියවර (නොමිලේ සේවාවකි)</span>
          </span>
          <button
            id="close-support-offers-modal"
            onClick={handleCloseModal}
            className="w-7 h-7 rounded-full bg-white/15 hover:bg-rose-600 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-200 flex-1">
          {(filteredOffers || []).length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                තවමත් කිසිවෙකු ඉදිරිපත් වී නොමැත.
              </p>
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-black cursor-pointer"
              >
                හරි (OK)
              </button>
            </div>
          ) : (
            (filteredOffers || []).map((off, idx) => {
              const helperName = off.reply.responderName || 'පරිත්‍යාගශීලියා';
              const helperPhone = off.reply.responderPhone || '';
              const posterName = (off.post as any).contactPersonName || off.post.userName || 'දැන්වීම්කරු';
              const posterPhone = (off.post as any).contactNumber || off.post.userPhone || off.post.contactPhone || '';
              const isBloodOffer = isBloodPostCheck(off.post);
              const isMineOffer = isMyReplyMatch(off.reply);

              const otherPartyName = off.isPostOwner ? helperName : posterName;
              const otherPartyPhone = off.isPostOwner ? helperPhone : posterPhone;

              const isCompleted = Boolean(
                off.post.isResolved ||
                  off.post.status === 'resolved' ||
                  off.post.serviceStage === 'completed' ||
                  Number((off.post as any).bloodWorkflowStep) >= 5 ||
                  Number((off.reply as any).workflowStep) >= 5
              );
              const isStep3Done = Boolean(
                isCompleted ||
                  (off.post as any).bloodDonatedByHelper ||
                  (off.reply as any).bloodDonatedByHelper ||
                  Number((off.post as any).bloodWorkflowStep) >= 4 ||
                  Number((off.reply as any).workflowStep) >= 4
              );
              const isStep2Done = Boolean(
                isStep3Done ||
                  off.isSelected ||
                  off.post.isConfirmed ||
                  Number((off.post as any).bloodWorkflowStep) >= 3 ||
                  Number((off.reply as any).workflowStep) >= 3
              );

              const currentStep: 2 | 3 | 4 | 5 = isCompleted ? 5 : isStep3Done ? 4 : isStep2Done ? 3 : 2;
              const parsedDetails = extractParsedBloodDetails(off.post);

              const hasAckStep3Guidelines = Boolean(
                acknowledgedMap[off.post.id] ||
                  (off.reply as any).step3GuidelinesAccepted ||
                  (typeof window !== 'undefined' &&
                    localStorage.getItem(`sahaya_blood_step3_ack_${off.post.id}`) === 'true')
              );

              return (
                <div
                  key={`offer_${off.post.id}_${off.reply.id || idx}`}
                  className="p-4 rounded-2xl border-2 border-slate-200 dark:border-emerald-900/60 bg-slate-50/70 dark:bg-[#0a1c12] space-y-4"
                >
                  {/* Contact Row */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block">
                        {off.isPostOwner ? '🩸 ලේ පරිත්‍යාගශීලියා:' : '🏥 දැන්වීම් පළකරන්නා:'}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                        👤 {otherPartyName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {otherPartyPhone && (
                        <a
                          href={`tel:${otherPartyPhone}`}
                          onClick={handleAcknowledgeBell}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-black text-xs flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{otherPartyPhone}</span>
                        </a>
                      )}
                      {onOpenChat && (
                        <button
                          type="button"
                          onClick={() => {
                            handleAcknowledgeBell();
                            onClose();
                            onOpenChat(off.post);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Chat</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isBloodOffer ? (
                    <div className="space-y-4 py-1">
                      {/* STEP 2: Poster selects donor & provides Patient Name, Ward No, File No/Photo, Drop Location */}
                      {currentStep === 2 &&
                        (off.isPostOwner ? (
                          <div className="space-y-3.5 text-left">
                            {/* Donor Eligibility Report Display */}
                            <div className="p-3 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between font-black text-emerald-900 dark:text-emerald-200">
                                <span className="flex items-center gap-1.5">
                                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                  <span>🩺 පරිත්‍යාගශීලියාගේ රුධිර ගැලපුම් පරීක්ෂාව</span>
                                </span>
                                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                                  සුදුසුකම් සමත් (PASSED ✅)
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                                <div>
                                  🩸 රුධිර වර්ගය:{' '}
                                  <strong>{(off.reply as any).donorBloodGroup || parsedDetails.bloodGroup}</strong> (ගැළපේ ✅)
                                </div>
                                <div>
                                  🗓️ අවසන් පරිත්‍යාගය:{' '}
                                  <strong>
                                    {(off.reply as any).eligibilityReport?.lastDonatedStatus === 'first_time'
                                      ? 'ප්‍රථම වර'
                                      : 'මාස 4+ පෙර'}{' '}
                                    ✅
                                  </strong>
                                </div>
                              </div>
                              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
                                ✨ ශරීර බර &gt; 50kg සහ නීරෝගී සෞඛ්‍ය තත්ත්වයේ සිටින බව ප්‍රශ්නාවලියෙන් තහවුරු කර ඇත.
                              </div>
                            </div>

                            {/* Poster Form to Provide/Verify Patient Name, Ward No, File/Slip No or Photo, Drop Location */}
                            <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 space-y-2.5 text-xs">
                              <span className="font-black text-rose-800 dark:text-rose-200 block">
                                📋 පරිත්‍යාගශීලියාට යැවිය යුතු රෝගියාගේ සහ රෝහලේ තොරතුරු තහවුරු කරන්න:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                                    1. රෝගියාගේ නම *
                                  </label>
                                  <input
                                    type="text"
                                    value={posterPatientName}
                                    onChange={(e) => setPosterPatientName(e.target.value)}
                                    placeholder={parsedDetails.patientName}
                                    className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                                    2. වාට්ටු අංකය (Ward No) *
                                  </label>
                                  <input
                                    type="text"
                                    value={posterWardNumber}
                                    onChange={(e) => setPosterWardNumber(e.target.value)}
                                    placeholder="උදා: වාට්ටු 12 / ICU"
                                    className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-xs"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                                    3. ලේ ලබාදීමේ විස්තර ගොනුවේ අංකය
                                  </label>
                                  <input
                                    type="text"
                                    value={posterSlipNumber}
                                    onChange={(e) => setPosterSlipNumber(e.target.value)}
                                    placeholder="උදා: BHT / Blood Bank File No"
                                    className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                                    හෝ ගොනුවේ ඡායාරූපයක් එක් කරන්න
                                  </label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePosterSlipPhotoUpload}
                                    className="w-full text-[10px] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:font-black file:bg-rose-600 file:text-white cursor-pointer"
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                    4. අදාල ස්ථානයේ Drop ලොකේෂන් එක:
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setShowUberPickerForConfirm(true)}
                                    className="px-2 py-0.5 rounded bg-blue-600 text-white font-black text-[10px] cursor-pointer"
                                  >
                                    {posterPinLat ? '🚕 සිතියමේ ස්ථානය වෙනස් කරන්න ✓' : '🚕 Uber Map එක හරහා ස්ථානය තෝරන්න'}
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={posterDropLocationUrl}
                                  onChange={(e) => setPosterDropLocationUrl(e.target.value)}
                                  placeholder="Google Maps Drop Location Link එක (හෝ ස්වයංක්‍රීය රෝහල් සිතියම)"
                                  className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs"
                                />
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white text-center leading-snug">
                              "{helperName}" ලේ පරිත්‍යාග කිරීමට ඉදිරිපත් වී ඇත. ඔහුව තෝරාගෙන ඉහත විස්තර යවනවාද?
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectAction(off.post, off.reply)}
                                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                              >
                                <UserCheck className="w-4 h-4" />
                                <span>✅ ඔව්, තෝරාගෙන විස්තර යවන්න</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeclineAction(off.post, off.reply)}
                                className="py-3 px-4 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                              >
                                <span>❌ අකමැතියි</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 text-center">
                            <p className="text-sm font-black text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1.5">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span>
                                දැන්වීම්කරු ඔබගේ රුධිර ගැලපුම් වාර්තාව පරීක්ෂා කර ඔබව තහවුරු කරන තෙක් රැඳී සිටින්න.
                              </span>
                            </p>
                            <button
                              type="button"
                              onClick={handleCloseModal}
                              className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs cursor-pointer"
                            >
                              හරි (OK)
                            </button>
                          </div>
                        ))}

                      {/* STEP 3: Donor first sees Pre-Donation Guidelines + "තේරුම් ගත්තෙමි" button, THEN sees Patient Name, Ward No, File No/Photo & Drop Location */}
                      {currentStep === 3 &&
                        (!off.isPostOwner || isMineOffer ? (
                          <div className="space-y-3.5 text-left">
                            {/* Selection Notice Banner */}
                            <div className="p-3 rounded-2xl bg-emerald-600 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm">
                              <CheckCircle2 className="w-5 h-5 shrink-0" />
                              <span>
                                ඔබගේ ලේ ගැලපුම තහවුරු වී දැන්වීම්කරු විසින් ලේ පරිත්‍යාගය සඳහා ඔබව තෝරාගෙන ඇත!
                              </span>
                            </div>

                            {!hasAckStep3Guidelines ? (
                              /* 02A. Pre-Donation Guidelines + Mandatory "තේරුම් ගත්තෙමි" Button */
                              <div className="space-y-3.5 animate-fadeIn">
                                <div className="p-4 rounded-2xl bg-sky-50/95 dark:bg-sky-950/40 border-2 border-sky-400 dark:border-sky-800 space-y-3">
                                  <h4 className="font-black text-xs sm:text-sm text-sky-900 dark:text-sky-200 flex items-center gap-2 border-b border-sky-200 dark:border-sky-800 pb-2">
                                    <span>📋 ලේ ලබාදීමේ ස්ථානයට හෝ රෝහලට යනතුරු පිළිපැදිය යුතු උපදෙස්</span>
                                  </h4>
                                  <div className="space-y-2">
                                    {PRE_DONATION_GUIDELINES.map((g) => (
                                      <div
                                        key={g.step}
                                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-800 flex items-start gap-2.5 text-xs"
                                      >
                                        <span className="text-base leading-none shrink-0 mt-0.5">{g.icon}</span>
                                        <div>
                                          <span className="font-black text-slate-900 dark:text-white block">
                                            {g.step}. {g.title}
                                          </span>
                                          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                                            {g.desc}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] font-bold text-amber-900 dark:text-amber-200 text-center">
                                  රෝගියාගේ නම, වාට්ටු අංකය, ලේ ලබාදීමට අදාල විස්තර ගොනුවේ අංකය හෝ ඡායාරූපය සහ අදාල ස්ථානයේ Drop ලොකේෂන් එක ලබාගැනීමට පහත <strong>"තේරුම් ගත්තෙමි"</strong> බොත්තම ක්ලික් කරන්න.
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDonorAcknowledgeGuidelines(off.post, off.reply)}
                                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                  <span>✅ තේරුම් ගත්තෙමි (රෝගියාගේ සහ රෝහලේ විස්තර පෙන්වන්න)</span>
                                </button>
                              </div>
                            ) : (
                              /* 02B. Revealed After Clicking "තේරුම් ගත්තෙමි": Patient Name, Ward No, File No/Photo, Drop Location */
                              <div className="space-y-3.5 animate-fadeIn">
                                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#06150d] border-2 border-rose-500/70 space-y-3 text-xs">
                                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                                    <span className="font-black text-rose-600 dark:text-rose-400 text-sm flex items-center gap-1.5">
                                      <Droplet className="w-4 h-4 fill-current" />
                                      <span>අවශ්‍ය රුධිර වර්ගය: {parsedDetails.bloodGroup}</span>
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-black">
                                      ඒකක {parsedDetails.unitsNeeded}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                    {/* 1. Patient Name */}
                                    <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-slate-900 border border-rose-200 dark:border-slate-800">
                                      <span className="text-[10px] font-bold text-slate-500 block">
                                        01. 👤 රෝගියාගේ නම:
                                      </span>
                                      <span className="font-black text-slate-900 dark:text-white text-sm">
                                        {parsedDetails.patientName}
                                      </span>
                                    </div>

                                    {/* 2. Ward Number */}
                                    <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-slate-900 border border-rose-200 dark:border-slate-800">
                                      <span className="text-[10px] font-bold text-slate-500 block">
                                        02. 🚪 වාට්ටු අංකය:
                                      </span>
                                      <span className="font-black text-rose-700 dark:text-rose-300 text-sm">
                                        {parsedDetails.wardNumber}
                                      </span>
                                    </div>

                                    {/* 3. File / Slip Number or Photo */}
                                    <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-slate-900 border border-rose-200 dark:border-slate-800 sm:col-span-2 space-y-2">
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div>
                                          <span className="text-[10px] font-bold text-slate-500 block">
                                            03. 📄 ලේ ලබාදීමට අදාල විස්තර ගොනුවේ අංකය / පත්‍රිකාව:
                                          </span>
                                          <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                                            {parsedDetails.requestSlipNumber}
                                          </span>
                                        </div>
                                        {parsedDetails.requestSlipPhotoUrl && (
                                          <button
                                            type="button"
                                            onClick={() => setViewingSlipPhoto(parsedDetails.requestSlipPhotoUrl)}
                                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer"
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>ගොනුවේ ඡායාරූපය විශාල කර බලන්න</span>
                                          </button>
                                        )}
                                      </div>

                                      {parsedDetails.requestSlipPhotoUrl && (
                                        <div
                                          onClick={() => setViewingSlipPhoto(parsedDetails.requestSlipPhotoUrl)}
                                          className="w-full max-h-44 rounded-xl overflow-hidden border border-rose-300 dark:border-rose-800 bg-black cursor-pointer"
                                        >
                                          <img
                                            src={parsedDetails.requestSlipPhotoUrl}
                                            alt="ලේ ලබාදීමේ විස්තර ගොනුව"
                                            className="w-full max-h-44 object-contain mx-auto"
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {/* 4. Drop Location & Hospital */}
                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 sm:col-span-2 flex items-center justify-between gap-2 flex-wrap">
                                      <div>
                                        <span className="text-[10px] font-bold text-slate-500 block">
                                          04. 📍 අදාල ස්ථානයේ Drop ලොකේෂන් එක (රෝහල / ස්ථානය):
                                        </span>
                                        <span className="font-black text-slate-900 dark:text-white text-sm">
                                          🏥 {parsedDetails.hospitalName}{' '}
                                          {parsedDetails.district ? `(${parsedDetails.district})` : ''}
                                        </span>
                                      </div>
                                      {posterPhone && (
                                        <a
                                          href={`tel:${posterPhone}`}
                                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shrink-0"
                                        >
                                          <Phone className="w-3.5 h-3.5" />
                                          <span>අමතන්න ({posterPhone})</span>
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  {/* Uber Taxi-Style Live Route Map (Pickup -> Hospital Drop-Off) */}
                                  <div className="pt-1">
                                    <UberBloodRouteMap
                                      hospitalName={parsedDetails.hospitalName}
                                      district={parsedDetails.district}
                                      destLat={(off.post as any).hospitalPinLat || off.post.latitude || null}
                                      destLng={(off.post as any).hospitalPinLng || off.post.longitude || null}
                                      googleMapsNavUrl={parsedDetails.googleMapsNavUrl}
                                    />
                                  </div>
                                </div>

                                {/* Live Location Sharing */}
                                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                                  <div>
                                    <span className="font-black text-xs text-slate-900 dark:text-white block">
                                      {isSharingLocation
                                        ? '📡 Live Location බෙදාගැනීම ක්‍රියාත්මකයි'
                                        : '📍 ඔබ රෝහලට පැමිණෙන බව පෙන්වන්න'}
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                      රෝගියාගේ පාර්ශ්වයට ඔබගේ ගමන් ප්‍රගතිය දිස්වේ.
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleShareLocation(off.post, off.reply)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                                      isSharingLocation
                                        ? 'bg-emerald-600 text-white shadow-md animate-pulse'
                                        : 'bg-slate-800 text-white'
                                    }`}
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>{isSharingLocation ? 'Sharing Active' : 'Share Live Location'}</span>
                                  </button>
                                </div>

                                {/* Final Step 3 Donation Confirmation */}
                                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-400 dark:border-rose-800 space-y-2.5 text-center">
                                  <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug">
                                    ඔබ රෝහලට හෝ ලේ ලබාදීමේ ස්ථානයට ගොස් ලේ පරිත්‍යාගය සිදු කළාද?
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleDonorConfirmBloodDonated(off.post, off.reply)}
                                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                                  >
                                    <Droplet className="w-4 h-4 fill-current" />
                                    <span>🩸 ඔව්, මම ලේ පරිත්‍යාගය සිදු කළෙමි</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3 text-center">
                            {((off.post as any).donorLiveLocation || (off.reply as any).donorLiveLocation) && (
                              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 text-left space-y-1">
                                <span className="text-xs font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5 animate-pulse">
                                  <MapPin className="w-4 h-4 text-emerald-600" />
                                  <span>🚗 පරිත්‍යාගශීලියා රෝහල වෙත පැමිණෙමින් සිටී (Live)</span>
                                </span>
                                {((off.post as any).donorLiveLocation?.distanceKm ||
                                  (off.reply as any).donorLiveLocation?.distanceKm) && (
                                  <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">
                                    රෝහලට ඇති දුර:{' '}
                                    {(off.post as any).donorLiveLocation?.distanceKm ||
                                      (off.reply as any).donorLiveLocation?.distanceKm}{' '}
                                    km
                                  </p>
                                )}
                              </div>
                            )}
                            <p className="text-sm font-black text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1.5">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span>
                                "{helperName}" රෝහලට පැමිණ ලේ පරිත්‍යාගය සිදු කරන තෙක් රැඳී සිටින්න.
                              </span>
                            </p>
                            <button
                              type="button"
                              onClick={handleCloseModal}
                              className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs cursor-pointer"
                            >
                              හරි (OK)
                            </button>
                          </div>
                        ))}

                      {/* STEP 4: Poster confirms blood received & publishes Free General Services Appreciation Post */}
                      {currentStep === 4 &&
                        (off.isPostOwner ? (
                          <div className="space-y-3 text-center">
                            <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                              "{helperName}" විසින් ({parsedDetails.hospitalName}) වෙත ගොස් ලේ පරිත්‍යාග කළ බව දන්වා ඇත. රුධිරය ලැබුණාද?
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                              තහවුරු කළ විට සාමාන්‍ය සේවා හරහා නොමිලේ "{helperName}" මහත්මා/මහත්මියට ස්තූති කරමින් සහ දීර්ඝායුෂ ප්‍රාර්ථනා කරමින් උපහාර දැන්වීමක් පළ වේ.
                            </p>
                            <button
                              type="button"
                              onClick={() => handlePosterCompleteBloodWorkflow(off.post, off.reply)}
                              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                              <span>🎉 ඔව්, ලේ ලැබුණා (ස්තූති කර දීර්ඝායුෂ ප්‍රාර්ථනා කරන්න)</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3 text-center">
                            <p className="text-sm font-black text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1.5">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span>දැන්වීම්කරු ලේ ලැබුණු බව තහවුරු කරන තෙක් රැඳී සිටින්න.</span>
                            </p>
                            <button
                              type="button"
                              onClick={handleCloseModal}
                              className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs cursor-pointer"
                            >
                              හරි (OK)
                            </button>
                          </div>
                        ))}

                      {/* STEP 5: Completed Appreciation & Long-Life Wish */}
                      {currentStep === 5 && (
                        <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/40 border-2 border-emerald-500 space-y-3 text-center">
                          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center mx-auto">
                            <Heart className="w-6 h-6 fill-current" />
                          </div>
                          <h4 className="text-sm sm:text-base font-black text-emerald-900 dark:text-emerald-200">
                            🙏 නොමිලේ ලේ පරිත්‍යාග කළ "{helperName}" වෙත හදපිරි ස්තූතිය සහ දීර්ඝායුෂ ප්‍රාර්ථනාව!
                          </h4>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
                            👤 ලේ පරිත්‍යාග කළ පුද්ගලයාගේ නම: <strong>{helperName}</strong>
                            <br />
                            🏥 ලේ පරිත්‍යාග කළ ස්ථානය: <strong>{parsedDetails.hospitalName}</strong>
                            <br />
                            🌟 උතුම් ජීවිතයක් බේරාගැනීමට දායක වූ ඔබට නිදුක් නීරෝගී සුවය සහ <strong>දීර්ඝායුෂ</strong> ලැබේවායි හදවතින්ම ප්‍රාර්ථනා කරමු! (සාමාන්‍ය සේවා හරහා නොමිලේ ප්‍රණාම දැන්වීම පළ කරන ලදී)
                          </p>
                          <button
                            type="button"
                            onClick={handleCloseModal}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-black text-xs cursor-pointer"
                          >
                            හරි (OK)
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Non-Blood Offer Question / Selected Details + Map Navigation */
                    <div className="space-y-3 text-center py-1">
                      {off.isPostOwner && !off.isSelected ? (
                        <>
                          <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                            "{helperName}" සහය ලබාදීමට ඉදිරිපත් වී ඇත. තෝරාගන්නවාද?
                          </p>
                          <button
                            type="button"
                            onClick={() => handleSelectAction(off.post, off.reply)}
                            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>✅ ඔව්, තෝරාගන්න (Bell නාදය නවතී)</span>
                          </button>
                        </>
                      ) : (
                        <div className="space-y-3 text-left">
                          <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 text-center">
                            {off.isSelected
                              ? `✅ "${helperName}" සහය සඳහා තෝරාගෙන ඇත.`
                              : '⏳ දැන්වීම්කරු තෝරාගන්නා තෙක් රැඳී සිටින්න.'}
                          </p>
                          {off.isSelected && (!off.isPostOwner || isMineOffer) && (
                            <div className="p-3 rounded-2xl bg-white dark:bg-[#06150d] border border-emerald-500/50 space-y-2 text-xs">
                              <div className="font-black text-slate-900 dark:text-white">
                                📌 {off.post.title || off.post.whatHappened}
                              </div>
                              {off.post.whatIsNeeded && (
                                <p className="text-slate-700 dark:text-slate-300 font-bold">{off.post.whatIsNeeded}</p>
                              )}
                              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span>{off.post.locationName || off.post.city || 'ශ්‍රී ලංකාව'}</span>
                              </div>
                              <a
                                href={parsedDetails.googleMapsNavUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2"
                              >
                                <Navigation className="w-4 h-4" />
                                <span>🗺️ ස්ථානය වෙත Map Navigation (මගපෙන්වීම)</span>
                              </a>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={handleCloseModal}
                            className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs cursor-pointer"
                          >
                            හරි (OK)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Slip Photo Zoom Preview Modal */}
      <UberBloodLocationModal
        isOpen={showUberPickerForConfirm}
        onClose={() => setShowUberPickerForConfirm(false)}
        onConfirmLocation={(loc) => {
          setPosterPinLat(loc.lat);
          setPosterPinLng(loc.lng);
          setPosterDropLocationUrl(loc.dropLocationUrl);
        }}
      />
      {viewingSlipPhoto && (
        <div
          className="fixed inset-0 z-[120] bg-black/85 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setViewingSlipPhoto(null)}
        >
          <div className="max-w-md w-full bg-slate-900 p-3 rounded-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setViewingSlipPhoto(null)}
              className="absolute top-3 right-3 bg-red-600 text-white rounded-full w-7 h-7 font-bold flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
            <img src={viewingSlipPhoto} alt="Slip" className="w-full max-h-[75vh] object-contain rounded-xl" />
            <p className="text-center text-xs text-white font-bold mt-2">
              📄 ලේ ලබාදීමට අදාල විස්තර ගොනුවේ ඡායාරූපය
            </p>
          </div>
        </div>
      )}

      {/* Auto-Close Celebration Modal upon Completion */}
      {completedCelebration && (
        <div className="fixed inset-0 z-[130] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-md w-full bg-white dark:bg-[#071710] border-2 border-emerald-500 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto text-emerald-600">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              🙏 නොමිලේ ලේ පරිත්‍යාග කළ "{completedCelebration.donorName}" වෙත හදපිරි ස්තූතිය සහ දීර්ඝායුෂ ප්‍රාර්ථනාව!
            </h3>
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-1.5 font-bold">
              <p>👤 ලේ පරිත්‍යාග කළ පුද්ගලයාගේ නම: <span className="text-emerald-700 dark:text-emerald-300 font-black">{completedCelebration.donorName}</span></p>
              <p>🏥 ලේ පරිත්‍යාග කළ ස්ථානය: <span className="text-emerald-700 dark:text-emerald-300 font-black">{completedCelebration.hospitalName}</span></p>
              <p className="pt-1 text-rose-700 dark:text-rose-300 font-black">
                💖 උතුම් ජීවිතයක් බේරාගැනීමට නොමිලේ ලේ පරිත්‍යාග කළ එතුමාට / එතුමියට නිදුක් නීරෝගී සුවය සහ දීර්ඝායුෂ ලැබේවායි හදවතින්ම ප්‍රාර්ථනා කරමු! 🙏
              </p>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
              සාමාන්‍ය සේවා හරහා නොමිලේ මෙම ස්තූති සහ දීර්ඝායුෂ ප්‍රාර්ථනා දැන්වීම ප්‍රධාන පුවරුවේ පළ කරන ලදී. (තත්පර {celebrationCountdown}කින් ප්‍රධාන පිටුවට...)
            </p>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('sahaya_blood_modal_close'));
                handleCloseModal();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer"
            >
              සහය සේවා ප්‍රධාන පිටුවට යන්න (Home)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

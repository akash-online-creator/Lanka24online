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
  Building,
  Navigation,
  ShieldCheck,
  Eye,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { HelpPost, PostReply, Language, LocationOption } from '../types';
import { updateHelpPostInFirestore, deduplicatePostReplies, addHelpPostToFirestore } from '../lib/firebase';
import { createBloodDonationHonorPost, PRE_DONATION_GUIDELINES, calculateDistanceKm } from '../utils/bloodEligibilityUtils';
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
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const [completedCelebration, setCompletedCelebration] = useState(false);
  const [celebrationCountdown, setCelebrationCountdown] = useState(3);
  const [showGuidelines, setShowGuidelines] = useState(false);

  useEffect(() => {
    if (targetPost && targetPost.id) {
      setSelectedPostIdFilter(targetPost.id);
    } else {
      setSelectedPostIdFilter('all');
    }
    setBellRinging(isSupportBellRinging());
  }, [isOpen, targetPost?.id]);

  useEffect(() => {
    const handleBellState = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setBellRinging(Boolean(detail && detail.isRinging));
    };
    window.addEventListener('sahaya_support_bell_state', handleBellState);
    return () => window.removeEventListener('sahaya_support_bell_state', handleBellState);
  }, []);

  if (!isOpen) return null;

  const handleAcknowledgeBell = () => {
    stopContinuousSupportBell();
    setBellRinging(false);
  };

  const handleCloseModal = () => {
    stopContinuousSupportBell();
    setBellRinging(false);
    onClose();
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
        if (!rep) return;
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

  const isBloodPostCheck = (p: any): boolean =>
    Boolean(
      p?.postType === 'blood_request' ||
        p?.serviceType === 'blood_donation' ||
        String(p?.postCode || '').toUpperCase().startsWith('#BLD-') ||
        (p?.tagName && (String(p.tagName).includes('ලේ') || String(p.tagName).toLowerCase().includes('blood')))
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

  // DECLINE ACTION (Poster politely declines offer)
  const handleDeclineAction = async (post: HelpPost, reply: PostReply) => {
    handleAcknowledgeBell();
    const cleanReplies = deduplicatePostReplies(post.replies || [], post);
    const updatedReplies = cleanReplies.map((r) =>
      isReplySameHelper(r, reply) ? { ...r, declinedByPoster: true } : r
    );
    const updatedPost = { ...post, replies: updatedReplies } as any;
    if (onUpdatePost) onUpdatePost(updatedPost);
    try {
      await updateHelpPostInFirestore(post.id, { replies: updatedReplies } as any);
    } catch {}
    alert("පරිත්‍යාගශීලියාගේ සහය ප්‍රතික්ෂේප කරන ලදී.");
  };

  // Toggle Live Location sharing by Donor
  const handleToggleShareLocation = (post: HelpPost, reply: PostReply) => {
    if (isSharingLocation) {
      if (locationWatchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchId);
        setLocationWatchId(null);
      }
      setIsSharingLocation(false);
      return;
    }

    if (!navigator.geolocation) {
      alert("ඔබගේ දුරකථනයේ GPS ස්ථාන පහසුකම සහය නොදක්වයි.");
      return;
    }

    setIsSharingLocation(true);
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const targetLat = (post as any).hospitalPinLat;
        const targetLng = (post as any).hospitalPinLng;
        const distKm = targetLat && targetLng ? calculateDistanceKm(lat, lng, targetLat, targetLng) : undefined;
        const locPayload = {
          lat,
          lng,
          updatedAt: new Date().toLocaleTimeString(),
          distanceKm: distKm,
        };

        const cleanReplies = deduplicatePostReplies(post.replies || [], post);
        const updatedReplies = cleanReplies.map((r) =>
          isReplySameHelper(r, reply) ? { ...r, donorLiveLocation: locPayload } : r
        );
        const updatedPost = { ...post, replies: updatedReplies, donorLiveLocation: locPayload } as any;
        if (onUpdatePost) onUpdatePost(updatedPost);
        try {
          await updateHelpPostInFirestore(post.id, {
            replies: updatedReplies,
            donorLiveLocation: locPayload,
          } as any);
        } catch {}
      },
      (err) => {
        console.warn("GPS error:", err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    setLocationWatchId(watchId);
  };

  // STEP 2 ACTION (Poster selects & confirms Donor)
  const handleSelectAction = async (post: HelpPost, reply: PostReply) => {
    handleAcknowledgeBell();
    const isBloodPost = isBloodPostCheck(post);
    const isQuickService = Boolean(
      !isBloodPost &&
        ((post as any).isQuickService ||
          post.category === 'quick_service' ||
          String(post.postCode || '').toUpperCase().startsWith('#QS-'))
    );

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const cleanReplies = deduplicatePostReplies(post.replies || [], post);

    const updatedReplies = cleanReplies.map((r) =>
      isReplySameHelper(r, reply)
        ? { ...r, isAccepted: true, isConfirmed: true, ...(isBloodPost ? { workflowStep: 3 } : {}) }
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
      ...(isBloodPost ? { bloodWorkflowStep: 3 } : {}),
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
        ...(isBloodPost ? { bloodWorkflowStep: 3 } : {}),
      } as any);
    } catch {}

    if (isBloodPost) {
      try {
        const rawBlood = localStorage.getItem("sahaya_blood_requests");
        if (rawBlood) {
          const parsedBlood = JSON.parse(rawBlood);
          if (Array.isArray(parsedBlood)) {
            const updatedBlood = parsedBlood.map((b) =>
              b && (String(b.id) === String(post.id) || String(b.id) === String(post.postCode || "").replace("#", ""))
                ? { ...b, replies: updatedReplies, bloodWorkflowStep: 3, confirmedHelperName: reply.responderName }
                : b
            );
            localStorage.setItem("sahaya_blood_requests", JSON.stringify(updatedBlood));
            window.dispatchEvent(new CustomEvent("sahaya_blood_disaster_updated"));
          }
        }
      } catch {}
    }
    if (onSelectHelper) {
      onSelectHelper(updatedPost, reply);
    }

    if (isQuickService && onOpenConfirm) {
      onOpenConfirm(updatedPost, reply);
      return;
    }

    onClose();
  };

  // STEP 3 ACTION (Donor confirms blood donated -> advances to Step 4)
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

    try {
      const rawBlood = localStorage.getItem("sahaya_blood_requests");
      if (rawBlood) {
        const parsedBlood = JSON.parse(rawBlood);
        if (Array.isArray(parsedBlood)) {
          const updatedBlood = parsedBlood.map((b) =>
            b && (String(b.id) === String(post.id) || String(b.id) === String(post.postCode || "").replace("#", ""))
              ? { ...b, replies: updatedReplies, bloodWorkflowStep: 4, donorArrivedAtHospital: true, bloodDonatedByHelper: true }
              : b
          );
          localStorage.setItem("sahaya_blood_requests", JSON.stringify(updatedBlood));
          window.dispatchEvent(new CustomEvent("sahaya_blood_disaster_updated"));
        }
      }
    } catch {}
    onClose();
  };

  // STEP 4 ACTION (Poster confirms blood received & completes transaction)
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
      const rawBlood = localStorage.getItem("sahaya_blood_requests");
      if (rawBlood) {
        const parsedBlood = JSON.parse(rawBlood);
        if (Array.isArray(parsedBlood)) {
          const updatedBlood = parsedBlood.map((b: any) =>
            b && (String(b.id) === String(post.id) || String(b.id) === String(post.postCode || "").replace("#", ""))
              ? { ...b, status: "fulfilled", bloodWorkflowStep: 5 }
              : b
          );
          localStorage.setItem("sahaya_blood_requests", JSON.stringify(updatedBlood));
          window.dispatchEvent(new CustomEvent("sahaya_blood_disaster_updated"));
        }
      }
    } catch {}

    // 💖 Requirement: Automatically publish a Free Public Appreciation & Honor Post on the feed
    if (isBloodPostCheck(post)) {
      try {
        const donorName = reply.responderName || (post as any).confirmedHelperName || "පරිත්‍යාගශීලියා";
        const hospitalName = (post as any).hospitalName || post.locationName || "රෝහල";
        const honorPost = createBloodDonationHonorPost(donorName, hospitalName, post.district);
        addHelpPostToFirestore(honorPost).catch(() => {});
        const stored = getStoredHelpPosts();
        const next = [honorPost, ...(stored || []).filter((p) => p && p.id !== honorPost.id)];
        saveHelpPostsToStorage(next);
        window.dispatchEvent(new CustomEvent("sahaya_post_created", { detail: { post: honorPost } }));
      } catch (err) {
        console.warn("Honor post creation error:", err);
      }
    }

    // Auto-close dialogs and return to main page
    setCompletedCelebration(true);
    let sec = 3;
    setCelebrationCountdown(sec);
    const interval = setInterval(() => {
      sec -= 1;
      setCelebrationCountdown(sec);
      if (sec <= 0) {
        clearInterval(interval);
        window.dispatchEvent(new CustomEvent("sahaya_blood_modal_close"));
        handleCloseModal();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 1000);
  };

  return (
    <div
      onClick={handleAcknowledgeBell}
      onTouchStart={handleAcknowledgeBell}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
    >
      <div
        id="support-offers-modal"
        onClick={(e) => {
          e.stopPropagation();
          handleAcknowledgeBell();
        }}
        className="w-full max-w-md bg-white dark:bg-[#071710] border-2 border-orange-500/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative"
      >
        {/* Ringing Indicator Banner (Stops on tap) */}
        {bellRinging && (
          <button
            type="button"
            onClick={handleAcknowledgeBell}
            className="w-full py-2 px-4 bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 animate-pulse cursor-pointer"
          >
            <Bell className="w-4 h-4 animate-bounce" />
            <span>🔔 නව දැනුම්දීමක්! (ශබ්දය නැවැත්වීමට ඔබන්න)</span>
          </button>
        )}

        {/* Minimal Top Close Bar */}
        <div className="px-4 py-3 bg-slate-900 dark:bg-[#04120b] text-white flex items-center justify-between shrink-0">
          <span className="text-xs sm:text-sm font-black">
            🩸 පියවර දැනුම්දීම
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

        {/* Minimal Body: Question ONLY or Notice ONLY */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 text-slate-800 dark:text-slate-200 flex-1">
          {(filteredOffers || []).length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                තවමත් කැමැත්ත දැක්වීම් ලැබී නොමැත.
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
              const helperName = off.reply.responderName || 'සහායක';
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

              return (
                <div
                  key={`offer_${off.post.id}_${off.reply.id || idx}`}
                  className="p-4 rounded-2xl border-2 border-slate-200 dark:border-emerald-900/60 bg-slate-50/70 dark:bg-[#0a1c12] space-y-4"
                >
                  {/* Compact Other Party Contact Row */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                      👤 {otherPartyName}
                    </span>
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

                  {/* ONLY Question OR ONLY Notice */}
                  {isBloodOffer ? (
                    <div className="space-y-3 text-center py-1">
                      {/* STEP 2 */}
                      {currentStep === 2 && (
                        off.isPostOwner ? (
                          <div className="space-y-3">
                            {/* Eligibility Test Report Display */}
                            {off.reply.eligibilityReport ? (
                              <div className="p-3 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-left space-y-1.5 text-xs">
                                <div className="flex items-center justify-between font-black text-emerald-900 dark:text-emerald-200">
                                  <span className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    <span>🩺 පූර්ව සුදුසුකම් පරීක්ෂණ වාර්තාව</span>
                                  </span>
                                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                                    සමත් (PASSED ✅)
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                                  <div>🩸 රුධිර වර්ගය: <strong>{off.reply.donorBloodGroup || "O+"}</strong> (ගැළපේ ✅)</div>
                                  <div>🗓️ අවසන් පරිත්‍යාගය: <strong>{off.reply.eligibilityReport.lastDonatedStatus === "first_time" ? "ප්‍රථම වර" : "මාස 4+ පෙර"}</strong> ✅</div>
                                </div>
                                <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
                                  ✨ ශරීර බර &gt; 50kg, සෞඛ්‍ය තත්ත්වය පරිත්‍යාගයට සුදුසු බව තහවුරු විය.
                                </div>
                              </div>
                            ) : null}

                            <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                              "{helperName}" ලේ ලබාදීමට ඉදිරිපත් වී ඇත. ඔහුව තෝරාගන්නවාද?
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => handleSelectAction(off.post, off.reply)}
                                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                              >
                                <UserCheck className="w-4 h-4" />
                                <span>✅ කැමතියි (තෝරාගන්න)</span>
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
                          <div className="space-y-3">
                            <p className="text-sm font-black text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1.5">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span>දැන්වීම්කරු ඔබගේ සුදුසුකම් වාර්තාව සලකා බලා ඔබව තෝරාගන්නා තෙක් රැඳී සිටින්න.</span>
                            </p>
                            <button
                              type="button"
                              onClick={handleCloseModal}
                              className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs cursor-pointer"
                            >
                              හරි (OK)
                            </button>
                          </div>
                        )
                      )}

                      {/* STEP 3 */}
                      {currentStep === 3 && (
                        !off.isPostOwner || isMineOffer ? (
                          <div className="space-y-3.5">
                            {/* Complete Patient & Hospital Details Card */}
                            <div className="p-3.5 rounded-2xl bg-rose-50/95 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-900/60 text-left space-y-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-rose-200 dark:border-rose-900/40">
                                <span className="font-black text-xs text-rose-900 dark:text-rose-200 flex items-center gap-1">
                                  <Building className="w-4 h-4 text-rose-600 shrink-0" />
                                  <span>{(off.post as any).hospitalName || off.post.locationName || "රෝහල"}</span>
                                  {off.post.district ? ` (${off.post.district})` : ""}
                                </span>
                                <a
                                  href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(((off.post as any).hospitalName || off.post.locationName || "Hospital") + ", " + (off.post.district || "") + ", Sri Lanka")}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] shadow-sm transition-all active:scale-95 cursor-pointer"
                                  title="Google Maps Navigation හරහා රෝහලට පාර බලන්න"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                  <span>📍 Google Maps පාර</span>
                                </a>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs text-slate-800 dark:text-slate-200">
                                <div>👤 රෝගී නම: <strong>{(off.post as any).patientName || off.post.userName}</strong></div>
                                <div>🚪 වාට්ටුව: <strong className="text-rose-700 dark:text-rose-400">{(off.post as any).wardNumber || "වාට්ටුව දන්වා නැත"}</strong></div>
                                <div className="col-span-2 flex items-center justify-between gap-2 flex-wrap">
                                  <span>📄 පත්‍රිකා අංකය: <strong className="font-mono text-rose-700 dark:text-rose-400">{(off.post as any).requestSlipNumber || "පත්‍රිකා අංකය දන්වා නැත"}</strong></span>
                                  {(off.post as any).requestSlipPhotoUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => setViewingSlipPhoto((off.post as any).requestSlipPhotoUrl)}
                                      className="text-xs font-black text-rose-600 underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>පත්‍රිකාවේ ඡායාරූපය බලන්න</span>
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {/* Sequential Pre-Donation Guidelines Box */}
                            <div className="p-3 rounded-2xl bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 text-left space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-xs text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                                  <span>📋 රෝහලට යනතුරු පිළිපැදිය යුතු උපදෙස්</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowGuidelines((prev) => !prev)}
                                  className="text-[11px] font-bold text-sky-700 dark:text-sky-300 underline cursor-pointer"
                                >
                                  {showGuidelines ? "හකුළන්න ✕" : "සියල්ල බලන්න ▼"}
                                </button>
                              </div>
                              <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                <li className="flex items-start gap-1.5">
                                  <span>💧</span>
                                  <span><strong>හොඳින් ජලය පානය කරන්න:</strong> අවම වශයෙන් ජලය වීදුරු 3-4ක් වත් පානය කර ශරීරය සජලනය කරගන්න.</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <span>🥗</span>
                                  <span><strong>සැහැල්ලු ආහාරයක් ගන්න:</strong> කිසිවිටෙකත් හිස්බඩ නොසිට පැය 2කට පෙර සැහැල්ලු පෝෂ්‍යදායී ආහාරයක් ගන්න.</span>
                                </li>
                                {showGuidelines ? (
                                  <>
                                    <li className="flex items-start gap-1.5">
                                      <span>🚫</span>
                                      <span><strong>මධ්‍යසාර/දුම්පානයෙන් වළකින්න:</strong> පසුගිය පැය 24 තුළ මධ්‍යසාර හෝ දුම්පානයෙන් වැළකී සිටින්න.</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                      <span>🪪</span>
                                      <span><strong>හැඳුනුම්පත රැගෙන යන්න:</strong> ඔබගේ ජාතික හැඳුනුම්පත (NIC) රැගෙන යාමට අමතක නොකරන්න.</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                      <span>🏥</span>
                                      <span><strong>රුධිර බැංකුවට (Blood Bank) යන්න:</strong> රෝහලට ගොස් රෝගී නම සහ පත්‍රිකා අංකය ඉදිරිපත් කරන්න.</span>
                                    </li>
                                  </>
                                ) : null}
                              </ul>
                            </div>

                            {/* Live Location Sharing Button */}
                            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 text-left flex items-center justify-between gap-2 flex-wrap">
                              <div>
                                <span className="font-black text-xs text-slate-900 dark:text-white block">
                                  {isSharingLocation ? "📡 Live Location බෙදාගැනීම ක්‍රියාත්මකයි" : "📍 ඔබ රෝහලට පැමිණෙන බව පෙන්වන්න"}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                  රෝගියාගේ පාර්ශ්වයට ඔබගේ සජීවී ගමන් ප්‍රගතිය දිස්වේ.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleShareLocation(off.post, off.reply)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isSharingLocation ? "bg-emerald-600 text-white shadow-md animate-pulse" : "bg-slate-800 text-white"
                                }`}
                              >
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{isSharingLocation ? "Sharing Active" : "Share Live Location"}</span>
                              </button>
                            </div>

                            <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-snug pt-1">
                              ඔබ රෝහලේ රුධිර බැංකුව වෙත ගොස් ලේ පරිත්‍යාගය සිදු කළාද?
                            </p>
                            <button
                              type="button"
                              onClick={() => handleDonorConfirmBloodDonated(off.post, off.reply)}
                              className="w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                            >
                              <Droplet className="w-4 h-4 fill-white" />
                              <span>🩸 ඔව්, ලේ පරිත්‍යාගය සිදු කළා</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Poster viewing donor arrival status */}
                            {(off.post as any).donorLiveLocation || (off.reply as any).donorLiveLocation ? (
                              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 text-left space-y-1">
                                <span className="text-xs font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5 animate-pulse">
                                  <MapPin className="w-4 h-4 text-emerald-600" />
                                  <span>🚗 පරිත්‍යාගශීලියා රෝහල වෙත ගමන් කරමින් සිටී (Live)</span>
                                </span>
                                {((off.post as any).donorLiveLocation?.distanceKm || (off.reply as any).donorLiveLocation?.distanceKm) ? (
                                  <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">
                                    රෝහලට ඇති දුර: {((off.post as any).donorLiveLocation?.distanceKm || (off.reply as any).donorLiveLocation?.distanceKm)} km • අවසන් ස්ථානය: {((off.post as any).donorLiveLocation?.updatedAt || (off.reply as any).donorLiveLocation?.updatedAt)}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}

                            <p className="text-sm font-black text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1.5">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span>"{helperName}" රෝහල වෙත ගොස් ලේ පරිත්‍යාගය සිදු කරන තෙක් රැඳී සිටින්න.</span>
                            </p>
                            <button
                              type="button"
                              onClick={handleCloseModal}
                              className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs cursor-pointer"
                            >
                              හරි (OK)
                            </button>
                          </div>
                        )
                      )}

                      {/* STEP 4 */}
                      {currentStep === 4 && (
                        off.isPostOwner ? (
                          <div className="space-y-3">
                            <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                              "{helperName}" ලේ පරිත්‍යාග කළ බව දන්වා ඇත. රුධිරය ලැබුණාද?
                            </p>
                            <button
                              type="button"
                              onClick={() => handlePosterCompleteBloodWorkflow(off.post, off.reply)}
                              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>🎉 ඔව්, ලේ ලැබුණා (උතුම් පරිත්‍යාගය සාර්ථකව අවසන් කරන්න)</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
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
                        )
                      )}

                      {/* STEP 5: Completed */}
                      {currentStep === 5 && (
                        <div className="space-y-3">
                          <p className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300">
                            🎉 ලේ පරිත්‍යාග කටයුත්ත සාර්ථකව අවසන් විය! බොහෝම ස්තූතියි.
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
                    /* Non-Blood Offer Minimal Question / Notice */
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
                            <span>✅ ඔව්, තෝරාගන්න</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                            {off.isSelected
                              ? `✅ "${helperName}" සහය සඳහා තෝරාගෙන ඇත.`
                              : '⏳ දැන්වීම්කරු තෝරාගන්නා තෙක් රැඳී සිටින්න.'}
                          </p>
                          <button
                            type="button"
                            onClick={handleCloseModal}
                            className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs cursor-pointer"
                          >
                            හරි (OK)
                          </button>
                        </>
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
            <img
              src={viewingSlipPhoto}
              alt="Slip"
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
            <p className="text-center text-xs text-white font-bold mt-2">
              📄 ලේ ඉල්ලුම් පත්‍රිකාව (Blood Request Slip)
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
              🎉 උතුම් රුධිර පරිත්‍යාගය සාර්ථකව අවසන් විය!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-bold">
              උතුම් මිනිස් ජීවිතයක් බේරාගැනීමට දායක වූ ඔබ දෙපලටම අපගේ හදපිරි ගෞරවය හා ස්තූතිය! ඔබගේ නමින් ඇගයීම් පෝස්ට් එකක් ප්‍රධාන පුවරුවේ පළ කරන ලදී.
            </p>
            <div className="text-xs font-mono text-emerald-700 dark:text-emerald-300 font-black">
              තත්පර {celebrationCountdown}කින් ප්‍රධාන පිටුවට රැගෙන යනු ඇත...
            </div>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("sahaya_blood_modal_close"));
                handleCloseModal();
                window.scrollTo({ top: 0, behavior: "smooth" });
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

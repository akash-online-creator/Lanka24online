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
} from 'lucide-react';
import { HelpPost, PostReply, Language, LocationOption } from '../types';
import { updateHelpPostInFirestore, deduplicatePostReplies } from '../lib/firebase';
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

    onClose();
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
                            <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                              "{helperName}" ලේ ලබාදීමට ඉදිරිපත් වී ඇත. ඔහුව තෝරාගන්නවාද?
                            </p>
                            <button
                              type="button"
                              onClick={() => handleSelectAction(off.post, off.reply)}
                              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                            >
                              <UserCheck className="w-4 h-4" />
                              <span>✅ ඔව්, තෝරාගන්න</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm font-black text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1.5">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span>දැන්වීම්කරු ඔබව තෝරාගන්නා තෙක් රැඳී සිටින්න.</span>
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
                          <div className="space-y-3">
                            {/* Hospital Details & Navigation Box */}
                            <div className="p-3.5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-left space-y-2.5">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  <Building className="w-4 h-4 text-rose-600 shrink-0" />
                                  <span>{(off.post as any).hospitalName || off.post.locationName || "රෝහල"} {off.post.district ? "(" + off.post.district + ")" : ""}</span>
                                </div>
                                <a
                                  href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(((off.post as any).hospitalName || off.post.locationName || "Hospital") + ", " + (off.post.district || "") + ", Sri Lanka")}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                                  title="Google Maps Navigation හරහා රෝහලට පාර බලන්න"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                  <span>📍 රෝහලට Navigation (Maps)</span>
                                </a>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                දැන්වීම්කරු ඔබව තෝරාගෙන ඇත. කරුණාකර රෝහලේ රුධිර බැංකුව (Blood Bank) වෙත ගොස් ලේ පරිත්‍යාගය සිදු කළ පසු පහත බොත්තම ඔබන්න.
                              </p>
                            </div>
                            <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                              ඔබ රෝහලට ගොස් ලේ පරිත්‍යාගය සිදු කළාද?
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
                              <span>🎉 ඔව්, ලේ ලැබුණා (අවසන් කරන්න)</span>
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
    </div>
  );
};

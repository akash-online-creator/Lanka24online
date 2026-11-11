import { stopContinuousSupportBell } from '../utils/supportBellRingtone';
import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  CheckCircle2,
  X,
  MapPin,
  UserCheck,
  Check,
  Trash2,
  UserX,
  MessageCircle,
  Phone,
  Clock,
  Lock,
  Droplet,
  Building2,
} from 'lucide-react';
import { HelpPost, PostReply, Language, LocationOption } from '../types';
import { calculateMotorcycleRoadDistance } from '../utils/geoUtils';
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
  lang,
  viewerLocation,
  onOpenChat,
  onOpenConfirm,
  onSelectHelper,
  onCancelOffer,
  onUpdatePost,
  targetPost,
}) => {
  const [selectedPostIdFilter, setSelectedPostIdFilter] = useState<string>('all');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [confirmingCancelOffer, setConfirmingCancelOffer] = useState<{ post: HelpPost; reply: PostReply } | null>(null);

  useEffect(() => {
    if (isOpen) {
      stopContinuousSupportBell();
    }
    if (targetPost && targetPost.id) {
      setSelectedPostIdFilter(targetPost.id);
    } else {
      setSelectedPostIdFilter('all');
    }
    setSuccessToast(null);
    setConfirmingCancelOffer(null);
  }, [isOpen, targetPost?.id]);

  if (!isOpen) return null;

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

  // Ensure live targetPost from userPosts if available
  const livePostsList: HelpPost[] = (() => {
    const base = Array.isArray(userPosts) ? [...userPosts] : [];
    if (targetPost && targetPost.id && !base.some((p) => p && p.id === targetPost.id)) {
      base.unshift(targetPost);
    }
    return base;
  })();

  // Collect all deduplicated support offers across posts
  const allOffers: FlattenedOffer[] = [];

  livePostsList.forEach((post) => {
    if (!post || !post.id || post.status === 'deleted' || post.isDeleted) return;
    const isOwner = checkIsPostOwner(currentUser, post);
    const cleanReplies = deduplicatePostReplies(post.replies || [], post);

    if (cleanReplies.length > 0) {
      cleanReplies.forEach((rep) => {
        if (!rep) return;
        const isMine = isMyReplyMatch(rep);
        // Show offer if currentUser owns the post, or is the helper who submitted this offer, or is viewing targetPost, or is Admin
        if (!isOwner && !isMine && !isAdminUser && (!targetPost || targetPost.id !== post.id)) {
          return;
        }
        // If current user is a helper (not owner/admin), only show their own offer on this post
        if (!isOwner && !isAdminUser && !isMine) {
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
          isPostOwner: isOwner,
        });
      });
    } else if (post.isConfirmed && (post.confirmedHelperName || post.confirmedBy) && (isOwner || isAdminUser)) {
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
        isPostOwner: isOwner,
      });
    }
  });

  const filteredOffers =
    selectedPostIdFilter === 'all'
      ? allOffers
      : allOffers.filter((off) => off.post && off.post.id === selectedPostIdFilter);

  const postsWithOffers = Array.from(new Set((allOffers || []).map((o) => o?.post?.id).filter(Boolean)))
    .map((id) => (allOffers || []).find((o) => o?.post?.id === id)?.post)
    .filter((p): p is HelpPost => Boolean(p));

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
    const isBloodPost = isBloodPostCheck(post);
    const isQuickService = Boolean(
      !isBloodPost &&
        ((post as any).isQuickService ||
          post.category === 'quick_service' ||
          String(post.postCode || '').toUpperCase().startsWith('#QS-'))
    );

    const nowIso = new Date().toISOString();
    const cleanReplies = deduplicatePostReplies(post.replies || [], post);

    const updatedReplies = cleanReplies.map((r) =>
      isReplySameHelper(r, reply)
        ? { ...r, isAccepted: true, isConfirmed: true, ...(isBloodPost ? { workflowStep: 3 } : {}) }
        : r
    );

    const neededHelpers = post.helpersNeeded && post.helpersNeeded > 0 ? post.helpersNeeded : 1;
    const totalAccepted = updatedReplies.filter((r) => r.isAccepted || r.isConfirmed).length;
    const isComplete = totalAccepted >= neededHelpers;

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
        ...(isBloodPost ? { bloodWorkflowStep: 3 } : {}),
      } as any);
    } catch (err) {
      console.warn('Firestore helper confirmation update note:', err);
    }

    if (onSelectHelper) {
      onSelectHelper(updatedPost, reply);
    }

    if (isQuickService && onOpenConfirm) {
      onOpenConfirm(updatedPost, reply);
      return;
    }

    if (isBloodPost) {
      setSuccessToast(
        `✅ පියවර 2/4 සම්පූර්ණයි! "${reply.responderName || 'පරිත්‍යාගශීලියා'}" තෝරාගන්නා ලදී. දැන් පියවර 3 සඳහා පරිත්‍යාගශීලියාට අවස්ථාව ලබාදී ඇත.`
      );
    } else if (isComplete) {
      setSuccessToast(`"${reply.responderName || 'සහායකයා'}" තෝරාගන්නා ලදී! අවශ්‍ය සහායකයින් ප්‍රමාණය සම්පූර්ණයි.`);
    } else {
      setSuccessToast(`"${reply.responderName || 'සහායකයා'}" තෝරාගන්නා ලදී! (සහායකයින් ${totalAccepted}/${neededHelpers} තෝරාගෙන ඇත)`);
    }

    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  };

  // STEP 3A ACTION (Donor marks arrived at hospital)
  const handleDonorArrivedHospital = async (post: HelpPost, reply: PostReply) => {
    const cleanReplies = deduplicatePostReplies(post.replies || [], post);
    const updatedReplies = cleanReplies.map((r) =>
      isReplySameHelper(r, reply)
        ? { ...r, isAccepted: true, isConfirmed: true, donorArrivedAtHospital: true, workflowStep: 3 }
        : r
    );

    const updatedPost: HelpPost = {
      ...post,
      replies: updatedReplies,
      repliesCount: updatedReplies.length,
      isConfirmed: true,
      donorArrivedAtHospital: true,
      bloodWorkflowStep: 3,
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
        bloodWorkflowStep: 3,
      } as any);
    } catch {}

    setSuccessToast('🏥 ඔබ රෝහලට පැමිණි බව දැන්වීම්කරු වෙත සාර්ථකව දන්වන ලදී! ලේ පරිත්‍යාග කිරීමෙන් පසු "ලේ පරිත්‍යාගය සිදු කළෙමි" ඔබන්න.');
    setTimeout(() => setSuccessToast(null), 4500);
  };

  // STEP 3B ACTION (Donor confirms blood donated -> advances to Step 4)
  const handleDonorConfirmBloodDonated = async (post: HelpPost, reply: PostReply) => {
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
      } as any);
    } catch {}

    setSuccessToast('🩸 පියවර 3/4 සම්පූර්ණයි! ඔබ ලේ පරිත්‍යාග කළ බව සටහන් විය. දැන් පියවර 4 යටතේ දැන්වීම්කරු අවසන් තහවුරු කිරීම සිදු කරනු ඇත.');
    setTimeout(() => setSuccessToast(null), 4500);
  };

  // STEP 4 ACTION (Poster confirms blood received & completes transaction)
  const handlePosterCompleteBloodWorkflow = async (post: HelpPost, reply: PostReply) => {
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

    setSuccessToast('🎉 පියවර 4/4 සම්පූර්ණයි! රුධිරය ලැබුණු බව තහවුරු කර ගනුදෙනුව සාර්ථකව අවසන් කරන ලදී. 🙏❤️');
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const handleConfirmCancel = (post: HelpPost, reply: PostReply) => {
    const helperName = reply.responderName || 'සහායකයා';
    if (onCancelOffer) {
      onCancelOffer(post, reply);
    }
    setConfirmingCancelOffer(null);
    setSuccessToast(`"${helperName}" ගේ කැමැත්ත දැක්වීම සාර්ථකව ඉවත් කරන ලදී.`);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const vLat = viewerLocation?.lat || 7.1710;
  const vLng = viewerLocation?.lng || 79.8986;
  const vName = viewerLocation?.nameSi || 'ඔබ සිටින ස්ථානය';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        id="support-offers-modal"
        className="w-full max-w-xl bg-white dark:bg-[#071710] border-2 border-orange-500/40 dark:border-orange-500/30 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all relative"
      >
        {/* Cancel Confirmation Dialog Overlay inside Modal */}
        {confirmingCancelOffer && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center animate-fadeIn">
            <div className="w-full max-w-md bg-white dark:bg-[#0c1f15] border-2 border-rose-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-center animate-scaleUp">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center shadow-inner">
                <Trash2 className="w-7 h-7 animate-bounce" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {lang === 'en' ? 'Cancel Support Offer?' : lang === 'ta' ? 'உதவி விருப்பத்தை ரத்து செய்யவா?' : 'කැමැත්ත දැක්වීම ඉවත් කරන්නද?'}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="font-bold text-rose-600 dark:text-rose-400">"{confirmingCancelOffer.reply.responderName || 'සහායකයා'}"</span>
                  {lang === 'en'
                    ? ' will be removed from your received support offers for this request.'
                    : lang === 'ta'
                    ? ' இந்த கோரிக்கையிலிருந்து நீக்கப்படுவார்.'
                    : ' විසින් ඉදිරිපත් කළ සහය වීමේ කැමැත්ත ඔබගේ දැන්වීමේ ලැයිස්තුවෙන් ඉවත් කරනු ඇත.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingCancelOffer(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer transition-all active:scale-95"
                >
                  {lang === 'en' ? 'Back' : lang === 'ta' ? 'பின்செல்' : 'අවලංගුයි'}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmCancel(confirmingCancelOffer.post, confirmingCancelOffer.reply)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs cursor-pointer shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Yes, Cancel' : lang === 'ta' ? 'ஆம், நீக்கு' : 'ඔව්, ඉවත් කරන්න'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <HeartHandshake className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                සහය හා ලේ පරිත්‍යාග පියවර කළමනාකරණය
              </h3>
              <p className="text-[11px] text-orange-100 font-medium">
                දැන්වීම්කරු සහ සහයකයා අතර පිළිවෙලින් ක්‍රියාත්මක වන පියවරයන්
              </p>
            </div>
          </div>

          <button
            id="close-support-offers-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/15 hover:bg-black/30 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Toast Banner */}
        {successToast && (
          <div className="p-3 bg-emerald-600 text-white text-xs sm:text-sm font-black flex items-center justify-between gap-2 shadow-inner animate-fadeIn shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0 animate-bounce" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-white hover:text-emerald-100 font-bold text-xs">
              ✕
            </button>
          </div>
        )}

        {/* Post Filter (Only shown if multiple posts have offers) */}
        {postsWithOffers.length > 1 && (
          <div className="px-5 py-2.5 bg-orange-50/60 dark:bg-[#0c2217] border-b border-orange-200/50 dark:border-orange-950 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[11px] font-black text-orange-800 dark:text-orange-300 shrink-0">දැන්වීම්:</span>
            <button
              onClick={() => setSelectedPostIdFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer shrink-0 ${
                selectedPostIdFilter === 'all'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#071710] text-slate-700 dark:text-slate-300 border border-orange-200 dark:border-orange-900/60'
              }`}
            >
              සියල්ල ({allOffers.length})
            </button>
            {(postsWithOffers || []).map((p, pIdx) => {
              const count = (allOffers || []).filter((o) => o?.post?.id === p.id).length;
              return (
                <button
                  key={`post_filter_${p.id || 'p'}_${pIdx}`}
                  onClick={() => setSelectedPostIdFilter(p.id)}
                  className={`px-3 py-1 rounded-full text-xs font-black font-mono transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    selectedPostIdFilter === p.id
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-white dark:bg-[#071710] text-slate-700 dark:text-slate-300 border border-orange-200 dark:border-orange-900/60'
                  }`}
                >
                  <span>{p.postCode}</span>
                  <span className="text-[10px] bg-orange-200 dark:bg-orange-900/80 text-orange-900 dark:text-orange-200 px-1.5 py-0.2 rounded-full font-bold">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Modal List Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-200 flex-1">
          {(filteredOffers || []).length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-100 to-orange-100 dark:from-orange-950/60 dark:to-amber-950/60 text-orange-600 mx-auto flex items-center justify-center shadow-inner">
                <HeartHandshake className="w-8 h-8" />
              </div>
              <p className="text-base font-extrabold text-slate-800 dark:text-slate-200">තවමත් කැමැත්ත දැක්වීම් ලැබී නොමැත</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                ඔබගේ දැන්වීම සඳහා කිසියම් අයෙකු සහය වීමට කැමැත්ත පළ කළ විගස ඔවුන්ගේ තොරතුරු සහ පියවර මෙහි පෙන්වනු ඇත.
              </p>
            </div>
          ) : (
            (filteredOffers || []).map((off, idx) => {
              const pLat = off.post.lat || 7.1710;
              const pLng = off.post.lng || 79.8986;
              const pName = off.post.locationName || 'දැන්වීම පළකළ ස්ථානය';

              const route = calculateMotorcycleRoadDistance(pLat, pLng, vLat, vLng, pName, vName, lang);
              const helperName = off.reply.responderName || 'සහායක';
              const helperPhone = off.reply.responderPhone || '';
              const helperMessage = off.reply.message || '';
              const posterName = (off.post as any).contactPersonName || off.post.userName || 'දැන්වීම්කරු';
              const posterPhone = (off.post as any).contactNumber || off.post.userPhone || off.post.contactPhone || '';
              const isBloodOffer = isBloodPostCheck(off.post);
              const problemDesc = off.post.whatHappened || off.post.whatIsNeeded || off.post.headline || 'විස්තරය';

              // Compute strict sequential blood step (2, 3, 4, or 5=Completed)
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
              const hasArrivedHospital = Boolean(
                (off.reply as any).donorArrivedAtHospital || (off.post as any).donorArrivedAtHospital
              );

              // Since off.reply exists, Step 1 (Offer submitted) is always done!
              const currentStep: 2 | 3 | 4 | 5 = isCompleted ? 5 : isStep3Done ? 4 : isStep2Done ? 3 : 2;

              return (
                <div
                  key={`offer_${off.post.id}_${off.reply.id || idx}`}
                  className={`p-4 rounded-2xl border-2 transition-all space-y-3.5 ${
                    isCompleted
                      ? 'bg-emerald-50/90 dark:bg-[#082214] border-emerald-500 shadow-md'
                      : off.isSelected
                      ? 'bg-emerald-50/60 dark:bg-[#0a2014] border-emerald-500/80 shadow-md'
                      : 'bg-white dark:bg-[#0a1c12] border-rose-200 dark:border-rose-900/60 shadow-sm'
                  }`}
                >
                  {/* 1. දෙපාර්ශ්වය පැහැදිලිව හඳුනාගැනීම (Poster vs Donor/Helper) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Poster Box */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#06140c] border border-slate-200 dark:border-emerald-900/60 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 block">
                          🏥 දැන්වීම්කරු {off.isPostOwner ? '(ඔබ)' : ''}
                        </span>
                        <span className="font-black text-slate-900 dark:text-white truncate block mt-0.5">
                          {posterName}
                        </span>
                      </div>
                      {posterPhone && (
                        <a
                          href={`tel:${posterPhone}`}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-black text-[11px] flex items-center gap-1 shrink-0"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{posterPhone}</span>
                        </a>
                      )}
                    </div>

                    {/* Donor / Helper Box */}
                    <div className="p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-rose-700 dark:text-rose-300 block">
                          {isBloodOffer ? '🩸 ලේ පරිත්‍යාගශීලියා' : '🤝 සහයක'} {!off.isPostOwner ? '(ඔබ)' : ''}
                        </span>
                        <span className="font-black text-slate-900 dark:text-white truncate block mt-0.5">
                          {helperName}
                        </span>
                      </div>
                      {helperPhone && (
                        <a
                          href={`tel:${helperPhone}`}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-mono font-black text-[11px] flex items-center gap-1 shrink-0"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{helperPhone}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* 2. දැන්වීමේ විස්තරය සහ දුර */}
                  <div className="p-2.5 bg-slate-50 dark:bg-[#06140c] rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">
                        📌 {problemDesc}
                      </span>
                      <span className="text-[10px] font-mono font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-md shrink-0">
                        {off.post.postCode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>{off.post.locationName || 'රෝහල'}</span>
                      </span>
                      <span className="font-mono font-bold">
                        දුර: {route.formattedRoadDistance} (~{route.formattedTime})
                      </span>
                    </div>
                    {helperMessage && (
                      <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                        <span className="font-black text-rose-600 dark:text-rose-400">💬 පරිත්‍යාගශීලියාගේ සටහන: </span>
                        <span className="font-semibold">{helperMessage}</span>
                      </div>
                    )}
                  </div>

                  {/* 3. BLOOD DONATION 4-STEP SEQUENTIAL WORKFLOW (Completely independent of Chat!) */}
                  {isBloodOffer ? (
                    <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-[#14080c] border-2 border-rose-300/80 dark:border-rose-900/70 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                          <Droplet className="w-4 h-4 text-rose-600 fill-rose-600" />
                          <span>ලේ පරිත්‍යාග පියවර 4 (පිළිවෙලින් ක්‍රියාත්මක වේ)</span>
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white">
                          {currentStep === 5 ? '4/4 සම්පූර්ණයි ✓' : `පියවර ${currentStep}/4`}
                        </span>
                      </div>

                      {/* 4-Step Visual Progress Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-black text-center">
                        <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-2xs">
                          <div>① ඉදිරිපත් වීම</div>
                          <div className="text-[9px] opacity-90 mt-0.5">✓ සම්පූර්ණයි (සහයක)</div>
                        </div>

                        <div
                          className={`p-2 rounded-xl shadow-2xs ${
                            currentStep > 2
                              ? 'bg-emerald-600 text-white'
                              : currentStep === 2
                              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          <div>② තෝරාගැනීම</div>
                          <div className="text-[9px] mt-0.5">
                            {currentStep > 2 ? '✓ සම්පූර්ණයි' : '👉 දැන්වීම්කරුගේ වාරය'}
                          </div>
                        </div>

                        <div
                          className={`p-2 rounded-xl shadow-2xs ${
                            currentStep > 3
                              ? 'bg-emerald-600 text-white'
                              : currentStep === 3
                              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          <div>③ ලේ පරිත්‍යාගය</div>
                          <div className="text-[9px] mt-0.5">
                            {currentStep > 3
                              ? '✓ සම්පූර්ණයි'
                              : currentStep === 3
                              ? '👉 සහයකගේ වාරය'
                              : '🔒 පියවර 2න් පසු'}
                          </div>
                        </div>

                        <div
                          className={`p-2 rounded-xl shadow-2xs ${
                            currentStep > 4
                              ? 'bg-emerald-600 text-white'
                              : currentStep === 4
                              ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          <div>④ අවසන් කිරීම</div>
                          <div className="text-[9px] mt-0.5">
                            {currentStep > 4
                              ? '✓ සම්පූර්ණයි'
                              : currentStep === 4
                              ? '👉 දැන්වීම්කරුගේ වාරය'
                              : '🔒 පියවර 3න් පසු'}
                          </div>
                        </div>
                      </div>

                      {/* Turn-by-Turn Action Box for Current Active Step */}
                      {currentStep === 2 && (
                        <div className="p-3 rounded-xl bg-white dark:bg-[#1f0d13] border border-amber-400/80 space-y-2">
                          {off.isPostOwner ? (
                            <>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                👉 <strong>ඔබගේ වාරයයි (පියවර 2/4):</strong> "{helperName}" ලේ පරිත්‍යාගය සඳහා ඉදිරිපත් වී ඇත. ඔහුව තෝරාගෙන 3 වන පියවරට යොමු කිරීමට පහත බොත්තම ඔබන්න:
                              </p>
                              <button
                                type="button"
                                onClick={() => handleSelectAction(off.post, off.reply)}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                              >
                                <UserCheck className="w-4 h-4" />
                                <span>✅ පියවර 2: පරිත්‍යාගශීලියාව තෝරාගෙන තහවුරු කරන්න ➔</span>
                              </button>
                            </>
                          ) : (
                            <div className="flex items-start gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-spin" />
                              <div>
                                <p>⏳ පියවර 2 ක්‍රියාත්මකයි (දැන්වීම්කරුගේ වාරය):</p>
                                <p className="font-medium text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                                  ඔබගේ ඉදිරිපත් වීම (පියවර 1) සාර්ථකව සටහන් වී ඇත. දැන්වීම්කරු ({posterName}) විසින් ඔබව තෝරාගෙන තහවුරු කළ වහාම ඔබට <strong>පියවර 3 (රෝහලට පැමිණ ලේ පරිත්‍යාග කිරීම)</strong> සක්‍රීය වේ.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {currentStep === 3 && (
                        <div className="p-3 rounded-xl bg-white dark:bg-[#1f0d13] border border-amber-400/80 space-y-2.5">
                          {hasArrivedHospital && (
                            <div className="px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/80 border border-sky-400 text-sky-900 dark:text-sky-200 text-xs font-black flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                              <span>🏥 පරිත්‍යාගශීලියා ({helperName}) දැන් රෝහලට පැමිණ සිටී!</span>
                            </div>
                          )}

                          {!off.isPostOwner ? (
                            <>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                👉 <strong>ඔබගේ වාරයයි (පියවර 3/4):</strong> දැන්වීම්කරු විසින් ඔබව ලේ පරිත්‍යාගය සඳහා තෝරාගෙන ඇත! රෝහලට පැමිණ ලේ පරිත්‍යාග කිරීමෙන් පසු පහත බොත්තම ඔබන්න:
                              </p>
                              <div className="flex flex-col gap-2">
                                {!hasArrivedHospital && (
                                  <button
                                    type="button"
                                    onClick={() => handleDonorArrivedHospital(off.post, off.reply)}
                                    className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                                  >
                                    <Building2 className="w-4 h-4" />
                                    <span>🏥 මම දැන් රෝහලට පැමිණ සිටිමි (දැන්වීම්කරු දැනුවත් කරන්න)</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDonorConfirmBloodDonated(off.post, off.reply)}
                                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                                >
                                  <Droplet className="w-4 h-4 fill-white" />
                                  <span>🩸 පියවර 3: මම ලේ පරිත්‍යාගය සිදු කළෙමි (පියවර 4 වෙත යවන්න ➔)</span>
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-start gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <p>⏳ පියවර 3 ක්‍රියාත්මකයි (ලේ පරිත්‍යාගශීලියාගේ වාරය):</p>
                                <p className="font-medium text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                                  ඔබ විසින් "{helperName}" තෝරාගෙන ඇත. පරිත්‍යාගශීලියා රෝහලට පැමිණ ලේ පරිත්‍යාග කළ බව තහවුරු කළ පසු ඔබට <strong>පියවර 4 (අවසන් තහවුරු කිරීම)</strong> සක්‍රීය වේ.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {currentStep === 4 && (
                        <div className="p-3 rounded-xl bg-white dark:bg-[#1f0d13] border border-emerald-500 space-y-2.5">
                          {off.isPostOwner ? (
                            <>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                👉 <strong>ඔබගේ වාරයයි (පියවර 4/4):</strong> "{helperName}" විසින් රෝගියා වෙනුවෙන් ලේ පරිත්‍යාගය සිදු කළ බව දන්වා ඇත! රුධිරය ලැබුණු බව තහවුරු කර ගනුදෙනුව අවසන් කරන්න:
                              </p>
                              <button
                                type="button"
                                onClick={() => handlePosterCompleteBloodWorkflow(off.post, off.reply)}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>🎉 පියවර 4: ලේ ලැබුණා • ගනුදෙනුව සාර්ථකව අවසන් කරන්න ✓</span>
                              </button>
                            </>
                          ) : (
                            <div className="flex items-start gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div>
                                <p>⏳ පියවර 4 ක්‍රියාත්මකයි (දැන්වීම්කරුගේ අවසන් තහවුරු කිරීම):</p>
                                <p className="font-medium text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                                  ඔබ ලේ පරිත්‍යාග කළ බව සාර්ථකව සටහන් විය! දැන්වීම්කරු ({posterName}) විසින් ලේ ලැබුණු බව තහවුරු කළ විගස ගනුදෙනුව සම්පූර්ණ වේ.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {currentStep === 5 && (
                        <div className="p-3 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs">
                          <CheckCircle2 className="w-5 h-5 shrink-0" />
                          <span>🎉 ලේ පරිත්‍යාග ගනුදෙනුව සාර්ථකව අවසන් වී ඇත! (පියවර 4/4 සම්පූර්ණයි) 🙏❤️</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Standard Non-Blood Offer Selection */
                    off.isPostOwner && (
                      <button
                        type="button"
                        onClick={() => handleSelectAction(off.post, off.reply)}
                        disabled={off.isSelected}
                        className={`w-full py-2.5 sm:py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] shadow-sm ${
                          off.isSelected
                            ? 'bg-emerald-600 text-white cursor-default opacity-95'
                            : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
                        }`}
                      >
                        {off.isSelected ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                            <span>තෝරාගෙන ඇත</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 text-white" />
                            <span>මෙම සහායකයාව තෝරාගන්න</span>
                          </>
                        )}
                      </button>
                    )
                  )}

                  {/* 4. Optional Chat Button & Remove Offer Button (Chat is strictly optional!) */}
                  <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                    {onOpenChat && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenChat(off.post);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/70 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 shadow-2xs"
                        title="අවශ්‍ය නම් පමණක් පණිවිඩ හුවමාරු කරන්න (Optional Chat)"
                      >
                        <MessageCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        <span>💬 අවශ්‍ය නම් පමණක් Chat කරන්න</span>
                      </button>
                    )}

                    {off.isPostOwner && !isCompleted && (
                      <button
                        type="button"
                        onClick={() => setConfirmingCancelOffer({ post: off.post, reply: off.reply })}
                        className="py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800/80"
                        title="මෙම පුද්ගලයාගේ සහය වීමේ ඉල්ලීම ඉවත් කරන්න"
                      >
                        <UserX className="w-4 h-4 text-rose-500" />
                        <span>ඉවත් කරන්න</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, 
  CheckCircle2, 
  X, 
  MapPin, 
  Navigation,
  UserCheck,
  Check,
  Sparkles,
  AlertCircle,
  Trash2,
  UserX,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { HelpPost, PostReply, Language, LocationOption } from '../types';
import { calculateMotorcycleRoadDistance } from '../utils/geoUtils';
import { sendChatMessageToFirestore } from '../lib/firebase';

interface SupportOffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPosts: HelpPost[];
  lang: Language;
  viewerLocation?: LocationOption;
  onOpenChat?: (post: HelpPost) => void;
  onOpenConfirm?: (post: HelpPost, reply?: PostReply) => void;
  onSelectHelper?: (post: HelpPost, reply: PostReply) => void;
  onCancelOffer?: (post: HelpPost, reply: PostReply) => void;
  targetPost?: HelpPost | null;
}

interface FlattenedOffer {
  post: HelpPost;
  reply: PostReply;
  isSelected: boolean;
}

export const SupportOffersModal: React.FC<SupportOffersModalProps> = ({
  isOpen,
  onClose,
  userPosts = [],
  lang,
  viewerLocation,
  onOpenChat,
  onOpenConfirm,
  onSelectHelper,
  onCancelOffer,
  targetPost,
}) => {
  const [selectedPostIdFilter, setSelectedPostIdFilter] = useState<string>('all');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [confirmingCancelOffer, setConfirmingCancelOffer] = useState<{ post: HelpPost; reply: PostReply } | null>(null);

  useEffect(() => {
    if (targetPost) {
      setSelectedPostIdFilter(targetPost.id);
    } else {
      setSelectedPostIdFilter('all');
    }
    setSuccessToast(null);
    setConfirmingCancelOffer(null);
  }, [isOpen, targetPost]);

  if (!isOpen) return null;

  // Collect all support offers (replies) across the user's posts
  const allOffers: FlattenedOffer[] = [];

  (userPosts || []).forEach((post) => {
    if (!post || post.status === 'deleted' || post.isDeleted) return;

    if (post.replies && (post.replies?.length || 0) > 0) {
      (post.replies || []).forEach((rep) => {
        const isSelected = Boolean(
          rep.isConfirmed ||
          rep.isAccepted ||
          (post.isConfirmed && (post.confirmedHelperName === rep.responderName || post.confirmedBy === rep.responderName))
        );

        allOffers.push({
          post,
          reply: rep,
          isSelected,
        });
      });
    } else if (post.isConfirmed && (post.confirmedHelperName || post.confirmedBy)) {
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
      });
    }
  });

  const filteredOffers = selectedPostIdFilter === 'all'
    ? allOffers
    : allOffers.filter((off) => off.post.id === selectedPostIdFilter);

  // Distinct posts with offers for filter pills (if user has multiple posts)
  const postsWithOffers = Array.from(new Set((allOffers || []).map((o) => o?.post?.id).filter(Boolean)))
    .map((id) => (allOffers || []).find((o) => o?.post?.id === id)?.post)
    .filter((p): p is HelpPost => Boolean(p));

  const handleSelectAction = async (post: HelpPost, reply: PostReply) => {
    // 1. Send automatic helper selection notification message
    const postOwnerName = post.userName || 'ගැටලුව සිදුවු පුද්ගලයා';
    const notificationText = `"${postOwnerName}" සහය සදහා ඔබ තොරාගෙන ඇත. ඔබ දෙදෙනා අතර ගැටලුවක් ඇති නොවන පරිදි සුහදශිලිව සහයවිමට වගබලාගන්න. ස්තුතියි ...!!!`;

    try {
      await sendChatMessageToFirestore(post.id, {
        senderName: postOwnerName,
        senderRole: 'seeker',
        text: notificationText,
        timestamp: 'දැන්',
        senderPhone: post.userPhone || '',
      });
    } catch (err) {
      console.warn('Auto helper notification send note:', err);
    }

    if (onSelectHelper) {
      onSelectHelper(post, reply);
    }
    if (onOpenConfirm) {
      onOpenConfirm(post, reply);
    }

    const neededHelpers = post.helpersNeeded && post.helpersNeeded > 0 ? post.helpersNeeded : 1;
    const previouslyAccepted = (post.replies || []).filter(
      (r) => r.id !== reply.id && (r.isAccepted || r.isConfirmed)
    ).length;
    const totalAccepted = previouslyAccepted + 1;
    const isComplete = totalAccepted >= neededHelpers;

    if (isComplete) {
      setSuccessToast(`"${reply.responderName || 'සහායකයා'}" තෝරාගන්නා ලදී! අවශ්‍ය සහායකයින් ප්‍රමාණය සම්පූර්ණ බැවින් දැන්වීම ප්‍රධාන පුවරුවෙන් ඉවත් විය.`);
    } else {
      setSuccessToast(`"${reply.responderName || 'සහායකයා'}" තෝරාගන්නා ලදී! (සහායකයින් ${totalAccepted}/${neededHelpers} තෝරාගෙන ඇත)`);
    }

    setTimeout(() => {
      setSuccessToast(null);
    }, 5000);
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
        className="w-full max-w-xl bg-white dark:bg-[#071710] border-2 border-orange-500/40 dark:border-orange-500/30 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all relative"
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
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <HeartHandshake className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                කැමැත්ත දැක්වූවන්
              </h3>
              <p className="text-[11px] text-orange-100 font-medium">
                සහය වීමට ඉදිරිපත් වූ පුද්ගලයින්ගේ ලැයිස්තුව
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
            <button 
              onClick={() => setSuccessToast(null)}
              className="text-white hover:text-emerald-100 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Post Filter (Only shown if multiple posts have offers) */}
        {postsWithOffers.length > 1 && (
          <div className="px-5 py-2.5 bg-orange-50/60 dark:bg-[#0c2217] border-b border-orange-200/50 dark:border-orange-950 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[11px] font-black text-orange-800 dark:text-orange-300 shrink-0">
              දැන්වීම්:
            </span>
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-slate-800 dark:text-slate-200 flex-1">
          {(filteredOffers || []).length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-100 to-orange-100 dark:from-orange-950/60 dark:to-amber-950/60 text-orange-600 mx-auto flex items-center justify-center shadow-inner">
                <HeartHandshake className="w-8 h-8" />
              </div>
              <p className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                තවමත් කැමැත්ත දැක්වීම් ලැබී නොමැත
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                ඔබගේ දැන්වීම සඳහා කිසියම් අයෙකු සහය වීමට කැමැත්ත පළ කළ විගස ඔවුන්ගේ තොරතුරු මෙහි පෙන්වනු ඇත.
              </p>
            </div>
          ) : (
            (filteredOffers || []).map((off, idx) => {
              // Calculate Distance between post/user and viewer
              const pLat = off.post.lat || 7.1710;
              const pLng = off.post.lng || 79.8986;
              const pName = off.post.locationName || 'දැන්වීම පළකළ ස්ථානය';

              const route = calculateMotorcycleRoadDistance(pLat, pLng, vLat, vLng, pName, vName, lang);
              const helperName = off.reply.responderName || 'නොදන්නා සහායක';
              const problemDesc = off.post.whatHappened || off.post.whatIsNeeded || 'ගැටලුවේ විස්තරය සටහන් කර නොමැත';

              return (
                <div
                  key={`offer_${off.post.id}_${off.reply.id || idx}`}
                  className={`p-4 rounded-2xl border-2 transition-all space-y-3 ${
                    off.isSelected
                      ? 'bg-emerald-50/90 dark:bg-[#0a2014] border-emerald-500 shadow-md'
                      : 'bg-white dark:bg-[#0a1c12] border-orange-200/80 dark:border-orange-900/60 shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* 1. කැමැත්ත පළකළ පුද්ගලයාගේ නම */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0 ${
                        off.isSelected
                          ? 'bg-gradient-to-tr from-emerald-600 to-teal-600'
                          : 'bg-gradient-to-tr from-amber-500 to-orange-600'
                      }`}>
                        {(helperName || 'U').charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          කැමැත්ත පළකළ පුද්ගලයා:
                        </div>
                        <div className="text-base font-black text-slate-900 dark:text-white truncate">
                          {helperName}
                        </div>
                      </div>
                    </div>

                    {off.isSelected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white text-xs font-black rounded-xl shadow-xs shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        <span>තෝරාගෙන ඇත</span>
                      </span>
                    )}
                  </div>

                  {/* 2. ගැටලුවේ විස්තරය */}
                  <div className="p-3 bg-slate-50 dark:bg-[#06140c] rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                        ගැටලුවේ විස්තරය:
                      </span>
                      <span className="text-[10px] font-mono font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.2 rounded-md">
                        {off.post.postCode}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                      {problemDesc}
                    </p>
                  </div>

                  {/* 3. ඔහු සිටින්නේ කොතරම් දුරකින්ද යන්න */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="font-bold">දුර:</span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
                        {route.formattedRoadDistance}
                      </span>
                      <span className="text-slate-400 text-[11px]">({route.formattedTime})</span>
                    </div>

                    {off.post.locationName && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px] text-right font-medium">
                        {off.post.locationName}
                      </span>
                    )}
                  </div>

                  {/* 4. Action Buttons: 'තෝරාගන්න' (Select) and 'ඉවත් කරන්න' (Cancel) */}
                  <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Select / Accepted Button */}
                    <button
                      type="button"
                      onClick={() => handleSelectAction(off.post, off.reply)}
                      disabled={off.isSelected}
                      className={`w-full py-2.5 sm:py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] shadow-sm ${
                        off.isSelected
                          ? 'bg-emerald-600 text-white cursor-default opacity-95'
                          : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20 hover:shadow-emerald-600/40 border border-emerald-400/40'
                      }`}
                      title={off.isSelected ? 'මෙම සහායකයා තෝරාගෙන ඇත' : 'මෙම සහායකයාව තෝරාගන්න'}
                    >
                      {off.isSelected ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>{lang === 'en' ? 'Selected' : lang === 'ta' ? 'தேர்வு' : 'තෝරාගෙන ඇත'}</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4 text-white" />
                          <span>{lang === 'en' ? 'Select Helper' : lang === 'ta' ? 'தேர்வு செய்க' : 'තෝරාගන්න'}</span>
                        </>
                      )}
                    </button>

                    {/* Cancel / Remove Offer Button */}
                    <button
                      type="button"
                      onClick={() => setConfirmingCancelOffer({ post: off.post, reply: off.reply })}
                      className="w-full py-2.5 sm:py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800/80 shadow-xs hover:shadow-sm group"
                      title="මෙම පුද්ගලයාගේ සහය වීමේ ඉල්ලීම ඉවත් කරන්න"
                    >
                      <UserX className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                      <span>{lang === 'en' ? 'Cancel' : lang === 'ta' ? 'ரத்து செய்' : 'ඉවත් කරන්න'}</span>
                    </button>
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

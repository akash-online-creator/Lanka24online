import React, { useState } from 'react';
import { 
  HeartHandshake, 
  X, 
  MapPin, 
  Phone, 
  MessageSquare, 
  MessageCircle, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink,
  Compass,
  AlertCircle,
  ShieldCheck,
  Send,
  Award,
  Receipt
} from 'lucide-react';
import { HelpPost, PostReply, Language, LocationOption, User as UserType, ServiceBill } from '../types';
import { calculateMotorcycleRoadDistance } from '../utils/geoUtils';
import { SlideToConfirmButton } from './SlideToConfirmButton';
import { HelperBillModal } from './HelperBillModal';
import { updateHelpPostInFirestore, sendChatMessageToFirestore } from '../lib/firebase';
import { translateName } from '../utils/postTranslator';

interface VolunteerSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserType;
  user?: UserType;
  helpPosts: HelpPost[];
  lang: Language;
  viewerLocation?: LocationOption;
  onOpenChat: (post: HelpPost) => void;
  onOfferHelpToPost?: (post: HelpPost) => void;
  onOpenOfferModal?: (post: HelpPost) => void;
  onOpenPostDetail?: (post: HelpPost) => void;
  onCompleteHelpPost?: (post: HelpPost) => void;
}

export const VolunteerSupportModal: React.FC<VolunteerSupportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  user,
  helpPosts = [],
  lang,
  viewerLocation,
  onOpenChat,
  onOfferHelpToPost,
  onOpenOfferModal,
  onOpenPostDetail,
  onCompleteHelpPost,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'selected' | 'my_offers'>('selected');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [selectedPostForBill, setSelectedPostForBill] = useState<HelpPost | null>(null);

  if (!isOpen) return null;

  const effectiveUser = user || currentUser;
  const currentUserName = (effectiveUser?.name || '').trim().toLowerCase();
  const currentUserPhone = (effectiveUser?.phone || '').trim().replace(/^0/, '');
  const currentUserId = (effectiveUser?.userId || effectiveUser?.id || '').trim();

  // Helper matching function
  const isHelperMatchingUser = (responderName?: string, responderPhone?: string) => {
    if (!responderName && !responderPhone) return false;
    const rName = (responderName || '').trim().toLowerCase();
    const rPhone = (responderPhone || '').trim().replace(/^0/, '');

    const nameMatch = currentUserName && rName && (rName === currentUserName || rName.includes(currentUserName) || currentUserName.includes(rName));
    const phoneMatch = currentUserPhone && rPhone && (rPhone.includes(currentUserPhone) || currentUserPhone.includes(rPhone));

    return Boolean(nameMatch || phoneMatch);
  };

  // 1. Find all posts where the author SELECTED the current user as helper
  const confirmedSelectedPosts: { post: HelpPost; matchedReply?: PostReply }[] = [];

  (helpPosts || []).forEach((post) => {
    if (!post || post.status === 'deleted' || post.isDeleted) return;
    // Don't include posts created by the current user
    const isMyOwnPost = post.userId === currentUserId || (post.userName && post.userName.trim().toLowerCase() === currentUserName);
    if (isMyOwnPost) return;

    const isConfirmedHelperDirect = post.isConfirmed && (
      (post.confirmedHelperName && isHelperMatchingUser(post.confirmedHelperName, post.confirmedHelperPhone)) ||
      (post.confirmedBy && isHelperMatchingUser(post.confirmedBy))
    );

    const matchingConfirmedReply = (post.replies || []).find((rep) =>
      rep && isHelperMatchingUser(rep.responderName, rep.responderPhone) && (rep.isAccepted || rep.isConfirmed || isConfirmedHelperDirect)
    );

    if (isConfirmedHelperDirect || matchingConfirmedReply) {
      confirmedSelectedPosts.push({
        post,
        matchedReply: matchingConfirmedReply,
      });
    }
  });

  // 2. Find other posts where current user offered support (pending)
  const myPendingOffersPosts: { post: HelpPost; reply: PostReply }[] = [];
  (helpPosts || []).forEach((post) => {
    if (!post || post.status === 'deleted' || post.isDeleted) return;
    const isMyOwnPost = post.userId === currentUserId || (post.userName && post.userName.trim().toLowerCase() === currentUserName);
    if (isMyOwnPost) return;

    (post.replies || []).forEach((rep) => {
      if (isHelperMatchingUser(rep.responderName, rep.responderPhone)) {
        // If already in confirmed selected list, skip here
        const isAlreadyConfirmed = confirmedSelectedPosts.some((c) => c.post.id === post.id);
        if (!isAlreadyConfirmed) {
          myPendingOffersPosts.push({ post, reply: rep });
        }
      }
    });
  });

  // 3. Other community help requests available for volunteering
  const availableToHelpPosts = (helpPosts || []).filter((post) => {
    if (!post || post.status === 'deleted' || post.isDeleted) return false;
    const isMyOwnPost = post.userId === currentUserId || (post.userName && post.userName.trim().toLowerCase() === currentUserName);
    if (isMyOwnPost) return false;

    // Check if post already fulfilled required helpers
    const needed = post.helpersNeeded && post.helpersNeeded > 0 ? post.helpersNeeded : 1;
    const acceptedCount = (post.replies || []).filter(r => r.isAccepted || r.isConfirmed).length || (post.helpersAccepted || 0);
    const isComplete = post.isConfirmed || post.status === 'confirmed' || acceptedCount >= needed;
    if (isComplete) return false;

    const alreadyResponded = (post.replies || []).some((r) => isHelperMatchingUser(r.responderName, r.responderPhone));
    return !alreadyResponded;
  });

  // Handle slide completion confirmation by helper
  const handleSlideComplete = async (post: HelpPost) => {
    const helperName = effectiveUser?.name || post.confirmedHelperName || 'සහායකයා';
    const helperPhone = effectiveUser?.phone || post.confirmedHelperPhone || '';
    const nowIso = new Date().toISOString();

    const updatedPost: HelpPost = {
      ...post,
      isCompleted: true,
      status: 'completed',
      completedAt: nowIso,
      completedBy: helperName,
      completedHelperName: helperName,
      completedHelperPhone: helperPhone,
    };

    if (onCompleteHelpPost) {
      onCompleteHelpPost(updatedPost);
    }

    try {
      await updateHelpPostInFirestore(post.id, {
        isCompleted: true,
        status: 'completed',
        completedAt: nowIso,
        completedBy: helperName,
        completedHelperName: helperName,
        completedHelperPhone: helperPhone,
      });

      await sendChatMessageToFirestore(post.id, {
        senderName: helperName,
        senderRole: 'helper',
        text: `"${helperName}" විසින් සහය සාර්ථකව ලබාදී අවසන් බව තහවුරු කරන ලදී. ඔබට ස්තුතියි!`,
        timestamp: 'දැන්',
        senderPhone: helperPhone,
      });
    } catch (err) {
      console.warn('Firestore completion update notice:', err);
    }

    setSuccessToast(`"${post.postCode || 'දැන්වීම'}" සඳහා සහය සාර්ථකව ලබාදී අවසන් බව තහවුරු කරන ලදී! ✓`);
    setTimeout(() => {
      setSuccessToast(null);
    }, 5000);
  };

  const handleSubmitBillAndComplete = async (post: HelpPost, bill: ServiceBill) => {
    const helperName = effectiveUser?.name || post.confirmedHelperName || 'සහායකයා';
    const helperPhone = effectiveUser?.phone || post.confirmedHelperPhone || '';
    const nowIso = new Date().toISOString();

    const updatedPost: HelpPost = {
      ...post,
      isCompleted: true,
      status: 'completed',
      completedAt: nowIso,
      completedBy: helperName,
      completedHelperName: helperName,
      completedHelperPhone: helperPhone,
      serviceBill: bill,
    };

    if (onCompleteHelpPost) {
      onCompleteHelpPost(updatedPost);
    }

    try {
      await updateHelpPostInFirestore(post.id, {
        isCompleted: true,
        status: 'completed',
        completedAt: nowIso,
        completedBy: helperName,
        completedHelperName: helperName,
        completedHelperPhone: helperPhone,
        serviceBill: bill,
      });

      const billLines = (bill.items || []).map(
        (item, idx) => `  ${idx + 1}. ${item.title}: රු. ${(Number(item.amount) || 0).toLocaleString()}.00`
      ).join('\n');

      const chatText = `📝 සහායකයා ලබාදුන් සහය හා බිල්පත් සටහන:
• සිදුකළ ක්‍රියාවන්: "${bill.actionsSummary || 'සහය ලබාදී අවසන් කරන ලදී.'}"
• වියදම් ලැයිස්තුව:
${billLines}
----------------------------------------
👉 මුළු ගෙවිය යුතු එකතුව: රු. ${(bill.totalAmount || 0).toLocaleString()}.00`;

      await sendChatMessageToFirestore(post.id, {
        senderName: helperName,
        senderRole: 'helper',
        text: chatText,
        timestamp: 'දැන්',
        senderPhone: helperPhone,
      });
    } catch (err) {
      console.warn('Firestore completion & bill update notice:', err);
    }

    setSuccessToast(`"${post.postCode || 'දැන්වීම'}" සඳහා සහය සහ බිල්පත සාර්ථකව යවන ලදී! ✓`);
    setTimeout(() => {
      setSuccessToast(null);
    }, 5000);
  };

  const vLat = viewerLocation?.lat || 7.1710;
  const vLng = viewerLocation?.lng || 79.8986;
  const vName = viewerLocation?.nameSi || 'ඔබ සිටින ස්ථානය';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        id="volunteer-support-modal"
        className="w-full max-w-2xl bg-white dark:bg-[#071710] border-2 border-emerald-500/40 dark:border-emerald-500/30 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <HeartHandshake className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight flex items-center gap-2">
                <span>සහය වන්න</span>
                <span className="text-[10px] bg-white/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Volunteer
                </span>
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium">
                අන් අයට සහය වීම සහ ඔබව තෝරාගත් සහය ඉල්ලීම්
              </p>
            </div>
          </div>

          <button
            id="close-volunteer-support-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/15 hover:bg-black/30 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Toast Banner */}
        {successToast && (
          <div className="px-4 py-2.5 bg-emerald-600 text-white text-xs font-black flex items-center justify-between gap-2 shadow-md animate-fadeIn shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="p-1 hover:bg-black/20 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-4 py-2.5 bg-emerald-50/70 dark:bg-[#0c2217] border-b border-emerald-200/60 dark:border-emerald-950 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveSubTab('selected')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeSubTab === 'selected'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#071710] text-slate-700 dark:text-slate-300 border border-emerald-200 dark:border-emerald-900/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>ඔබව තෝරාගත් ඉල්ලීම්</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              confirmedSelectedPosts.length > 0
                ? 'bg-amber-400 text-slate-950 font-black animate-pulse'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {confirmedSelectedPosts.length}
            </span>
          </button>

          {myPendingOffersPosts.length > 0 && (
            <button
              onClick={() => setActiveSubTab('my_offers')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeSubTab === 'my_offers'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#071710] text-slate-700 dark:text-slate-300 border border-emerald-200 dark:border-emerald-900/60'
              }`}
            >
              <span>මාගේ ඉදිරිපත් කිරීම්</span>
              <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded-full font-bold">
                {myPendingOffersPosts.length}
              </span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-200 flex-1">
          {/* TAB 1: Posts where author selected current user */}
          {activeSubTab === 'selected' && (
            <div className="space-y-4">
              {(confirmedSelectedPosts || []).length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                    <HeartHandshake className="w-8 h-8" />
                  </div>
                  <p className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                    තවමත් ඔබව සහය සඳහා තෝරාගත් ඉල්ලීම් නොමැත
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    ඔබ වෙනත් අයෙකුගේ ගැටලුවකට සහය වීමට කැමැත්ත පළ කළ විට, ඔවුන් ඔබව තෝරාගනු ලැබුවහොත් එම පණිවිඩය මෙහි ප්‍රදර්ශනය වනු ඇත.
                  </p>
                </div>
              ) : (
                (confirmedSelectedPosts || []).map(({ post }, idx) => {
                  const pLat = post.lat || 7.1710;
                  const pLng = post.lng || 79.8986;
                  const pName = post.locationName || 'ස්ථානය';
                  const route = calculateMotorcycleRoadDistance(pLat, pLng, vLat, vLng, pName, vName, lang);
                  const postOwnerName = translateName(post.userName, lang) || (lang === 'en' ? 'Post Author' : lang === 'ta' ? 'விளம்பரதாரர்' : 'ගැටලුව සිදුවූ පුද්ගලයා');

                  // The Exact Required Message
                  const requiredMessage = `"${postOwnerName}" සහය සදහා ඔබ තොරාගෙන ඇත. ඔබ දෙදෙනා අතර ගැටලුවක් ඇති නොවන පරිදි සුහදශිලිව සහයවිමට වගබලාගන්න. ස්තුතියි ...!!!`;

                  return (
                    <div
                      key={`selected_post_${post.id}_${idx}`}
                      className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white dark:from-[#0a2418] dark:via-[#081b12] dark:to-[#071710] border-2 border-emerald-500 shadow-lg space-y-3.5 animate-fadeIn"
                    >
                      {/* Top Header Badge */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-black shadow-xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                          <span>ඔබව සහය සඳහා තෝරාගෙන ඇත!</span>
                        </div>

                        <span className="text-xs font-mono font-black text-emerald-800 dark:text-emerald-300 bg-white dark:bg-[#071710] px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800">
                          {post.postCode}
                        </span>
                      </div>

                      {/* The Required Message Box */}
                      <div className="p-4 bg-white dark:bg-[#040e08] rounded-xl border-2 border-emerald-500/50 shadow-inner space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>සනාථ කිරීමේ පණිවිඩය:</span>
                        </div>
                        <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                          {requiredMessage}
                        </p>
                      </div>

                      {/* Problem details */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          ගැටලුවේ විස්තරය:
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                          {post.whatHappened || post.whatIsNeeded}
                        </p>
                      </div>

                      {/* Location & Distance Info */}
                      <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-emerald-200/60 dark:border-emerald-950">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="font-bold">දුර:</span>
                          <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300">
                            {route.formattedRoadDistance}
                          </span>
                          <span className="text-slate-400 text-[11px]">({route.formattedTime})</span>
                        </div>

                        {post.locationName && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[200px]">
                            {post.locationName}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons: Direct Call, WhatsApp, Open Chat */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {post.userPhone ? (
                          <a
                            href={`tel:${post.userPhone}`}
                            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>අමතන්න</span>
                          </a>
                        ) : (
                          <button
                            disabled
                            className="py-2.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>දුරකථන නැත</span>
                          </button>
                        )}

                        {post.userPhone ? (
                          <a
                            href={`https://wa.me/94${post.userPhone.replace(/^0/, '')}?text=${encodeURIComponent(`හලෝ ${post.userName}, ඔබ මාව සහය සඳහා තෝරාගෙන ඇත. මම උදව් කිරීමට සූදානම්.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2.5 px-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenChat(post);
                          }}
                          className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Chat අරඹන්න</span>
                        </button>
                      </div>

                      {/* Slide-to-Confirm Completion Button & Bill Button */}
                      <div className="pt-2.5 border-t border-emerald-200/80 dark:border-emerald-900/60 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>සහය දී අවසන් බව තහවුරු කරන්න:</span>
                          </span>
                          {(post.isCompleted || post.status === 'completed') && (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                              <span>අවසන් කරන ලදී</span>
                              <Award className="w-3 h-3 text-amber-300" />
                            </span>
                          )}
                        </div>

                        {/* Bill Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedPostForBill(post)}
                          className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-98 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer border border-amber-400"
                        >
                          <Receipt className="w-4 h-4 text-slate-950" />
                          <span>📝 සහය ගාස්තු / බිල්පත සාදා යවන්න (1KM = රු. 50)</span>
                        </button>

                        <SlideToConfirmButton
                          id={`slide-confirm-${post.id}`}
                          isCompleted={Boolean(post.isCompleted || post.status === 'completed')}
                          label="සහය දී අවසන් බව තහවුරු කිරීමට අදින්න 👉"
                          completedLabel="සහය සාර්ථකව ලබාදී අවසන් කරන ලදී! ✓"
                          onConfirm={async () => {
                            await handleSlideComplete(post);
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}



          {/* TAB 3: My pending offers */}
          {activeSubTab === 'my_offers' && (
            <div className="space-y-3">
              {(myPendingOffersPosts || []).map(({ post, reply }, idx) => (
                <div
                  key={`pending_${post.id}_${idx}`}
                  className="p-4 rounded-2xl bg-white dark:bg-[#0a1c12] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {translateName(post.userName, lang)} වෙත යැවූ සහය
                    </span>
                    <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full font-bold">
                      තහවුරු කිරීම අපේක්ෂාවෙන්
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-[#06140c] rounded-xl text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-800 dark:text-slate-200">ඔබේ පණිවිඩය: </span>
                    {reply.message}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        onClose();
                        onOpenChat(post);
                      }}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Chat එක බලන්න</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Helper Bill Modal */}
      {selectedPostForBill && (
        <HelperBillModal
          post={selectedPostForBill}
          isOpen={Boolean(selectedPostForBill)}
          onClose={() => setSelectedPostForBill(null)}
          onSubmitBillAndComplete={handleSubmitBillAndComplete}
        />
      )}
    </div>
  );
};

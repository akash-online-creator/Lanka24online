import { removeNotificationsForPost } from "../utils/notificationManager";
import { stopContinuousSupportBell } from "../utils/supportBellRingtone";
import React, { useState, useEffect } from 'react';
import { Heart, ThumbsDown, MessageSquare, Trash2, Eye, Clock, Pencil, Phone, MessageCircle, HelpCircle, Zap, Bookmark, UserCheck, MapPin, Send, Lock, User as UserIcon, ChevronDown, ChevronUp, Car, Banknote, FileText, ExternalLink, Copy, Check, BarChart3, Calendar, Maximize2, X, Navigation, Droplet } from 'lucide-react';
import { HelpPost, User, Language, LocationOption, PostComment } from '../types';
import { checkIsPostOwner, checkIsAdmin } from '../utils/postOwnerHelper';
import {
  addDeletedPostId,
  addDeletedRedAlertId,
  addDeletedBloodId,
  addDeletedDisasterId,
  addDeletedJobId,
  addDeletedAccommodationId,
} from '../utils/deletedPostsManager';
import {
  purgeDisasterReliefEverywhere,
  purgeBloodRequestEverywhere,
} from '../data/bloodAndDisasterData';
import {
  deleteHelpPostFromFirestore,
  updateHelpPostInFirestore,
  cancelRedAlertByReporter,
  deleteRedAlertInFirestore,
  addCommentToRedAlert,
  deduplicatePostReplies,
} from '../lib/firebase';
import { maskPhone } from '../utils/demoDataMasker';
import { AudioVoicePlayer } from './AudioVoiceNote';
import { getFontFamilyById, injectPostFonts } from '../utils/postFontManager';
import { getPostValidityInfo } from '../utils/creditManager';
const h = React.createElement;
export interface PostCardProps {
post: any;
currentUser?: User;
viewerLocation?: LocationOption;
lang?: Language;
language?: Language;
isOwner?: boolean;
isSaved?: boolean;
onToggleSave?: (post: HelpPost) => void;
onOfferSupport?: (post: HelpPost) => void;
onEditPost?: (post: any) => void;
onDeletePost?: (postIdOrPost: any) => void;
onToggleHidePost?: (post: any) => void;
onViewPost?: (post: HelpPost) => void;
onViewDetails?: (postId: string) => void;
onOpenChat?: (post: HelpPost) => void;
onOpenConfirm?: (post: HelpPost) => void;
onOpenSupportOffers?: (post: HelpPost) => void;
onBoostPost?: (post: HelpPost) => void;
onRequireRegistration?: () => void;
onAdminModerate?: (post: HelpPost) => void;
onPosterRespondIssue?: (post: HelpPost) => void;
onPinPost?: (postId: string) => void;
onLike?: (postId: string) => void;
onUnlike?: (postId: string) => void;
onComment?: (postId: string) => void;
onShare?: (postId: string) => void;
onApprovePost?: (postId: string) => void;
onRejectPost?: (postId: string) => void;
onViewProfile?: (userIdOrName: string) => void;
isDemo?: boolean;
}
export const PostCard: React.FC<PostCardProps> = ({
post,
currentUser,
viewerLocation,
lang,
language = 'si',
isOwner,
isSaved: propIsSaved = false,
onToggleSave,
onOfferSupport,
onEditPost,
onDeletePost,
onViewPost,
onViewDetails,
onOpenChat,
onOpenConfirm,
onOpenSupportOffers,
onRequireRegistration,
onLike,
onUnlike,
onViewProfile,
isDemo: propIsDemo
}) => {
const activeLang: Language = lang ? lang : language ? language : 'si';
useEffect(() => {
injectPostFonts();
}, []);
const [isDeletingLocal, setIsDeletingLocal] = useState(false);
const [imageError, setImageError] = useState(false);
const [copiedPhone, setCopiedPhone] = useState(false);
const [copiedLink, setCopiedLink] = useState(false);
const [isExpandedFullModal, setIsExpandedFullModal] = useState(false);
const [localPoll, setLocalPoll] = useState(() => post?.pollData ? post.pollData : null);
const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
const [newCommentText, setNewCommentText] = useState('');
const [isSubmittingComment, setIsSubmittingComment] = useState(false);
const extractInitialComments = (p: any): PostComment[] => {
if (Array.isArray(p?.commentsList) && p.commentsList.length > 0) return p.commentsList;
const rawAlertComments = p?.rawRedAlert?.comments;
if (Array.isArray(rawAlertComments) && rawAlertComments.length > 0) {
return rawAlertComments.map((c: any) => ({
id: c.id || 'cmt_' + Math.random().toString(36).slice(2, 7),
userId: c.userId || 'user',
userName: c.userName || 'සහය සාමාජික',
userPhotoUrl: c.userPhotoUrl || '',
comment: c.text || c.comment || '',
createdAt: c.createdAt || new Date().toISOString()
}));
}
return [];
};
const [localComments, setLocalComments] = useState<PostComment[]>(() => extractInitialComments(post));
const myUserId = currentUser?.id ? currentUser.id : currentUser?.userId ? currentUser.userId : 'anonymous_guest';
const [likesCount, setLikesCount] = useState(post?.likeCount ? post.likeCount : 0);
const [isLiked, setIsLiked] = useState(() => {
if (post?.likedBy && Array.isArray(post.likedBy)) {
return post.likedBy.includes(myUserId);
}
return false;
});
const [unlikesCount, setUnlikesCount] = useState(post?.unlikesCount ? post.unlikesCount : post?.unlikeCount ? post.unlikeCount : 0);
const [isUnliked, setIsUnliked] = useState(() => {
if (post?.unlikedBy && Array.isArray(post.unlikedBy)) {
return post.unlikedBy.includes(myUserId);
}
return false;
});
const [isSaved, setIsSaved] = useState(propIsSaved ? true : Boolean(post?.savedBy?.includes(myUserId)));
const [savesCount, setSavesCount] = useState(post?.savesCount ? post.savesCount : post?.saveCount ? post.saveCount : propIsSaved ? 1 : 0);
useEffect(() => {
if (!post) return;
const incoming = extractInitialComments(post);
setLocalComments((prev) => {
if (!Array.isArray(prev) || prev.length === 0) return incoming;
const map = new Map<string, PostComment>();
prev.forEach((c) => {
if (c && c.id) map.set(c.id, c);
});
incoming.forEach((c) => {
if (c && c.id) map.set(c.id, c);
});
return Array.from(map.values());
});
if (post.pollData) {
setLocalPoll(post.pollData);
}
setLikesCount(post.likeCount ? post.likeCount : 0);
setUnlikesCount(post.unlikesCount ? post.unlikesCount : post.unlikeCount ? post.unlikeCount : 0);
setIsSaved(propIsSaved ? true : Boolean(post.savedBy?.includes(myUserId)));
setSavesCount(post.savesCount ? post.savesCount : post.saveCount ? post.saveCount : propIsSaved ? 1 : 0);
}, [post?.id, post?.commentsList, (post as any)?.rawRedAlert?.comments, post?.pollData, post?.likeCount, post?.unlikesCount, post?.unlikeCount, post?.savesCount, post?.saveCount, propIsSaved, myUserId]);

useEffect(() => {
if (!post?.id) return;
const handleCommentEvent = (e: any) => {
if (e?.detail?.postId === post.id && Array.isArray(e?.detail?.commentsList)) {
setLocalComments(e.detail.commentsList);
}
};
window.addEventListener('sahaya_post_comment_added', handleCommentEvent);
return () => window.removeEventListener('sahaya_post_comment_added', handleCommentEvent);
}, [post?.id]);
if (!post) return null;
if (isDeletingLocal) return null;
const isDemo = Boolean(propIsDemo ?? currentUser?.isDemo);
const isAdmin = !isDemo && checkIsAdmin(currentUser);
const ownerCheck = isOwner ?? checkIsPostOwner(currentUser, post);
const canModify = ownerCheck ? true : isAdmin;
const isHiddenByReports = Boolean(post.isHidden ? true : post.reportsCount && post.reportsCount >= 5);
if (!isAdmin && isHiddenByReports) {
return null;
}
const isPrivatePost = Boolean(post.visibilityMode === 'private' ? true : post.isPrivate);
if (isPrivatePost && !ownerCheck && !isAdmin) {
return null;
}
const isScheduledPost = Boolean(post.visibilityMode === 'schedule');
const isFutureScheduled = Boolean(isScheduledPost && post.scheduledPublishAt && Date.parse(post.scheduledPublishAt) > Date.now());
if (isFutureScheduled && !ownerCheck && !isAdmin) {
return null;
}
const getLangText = (si: string, en: string, ta: string) => {
if (activeLang === 'en') return en;
if (activeLang === 'ta') return ta;
return si;
};
const getCityOnly = (locStr?: string): string => {
const fallbackCity = viewerLocation?.nameSi ? viewerLocation.nameSi.split('(')[0].trim() : getLangText('නගරය', 'City', 'நகரம்');
if (!locStr) return fallbackCity;
if (/^\d+.\d+/.test(locStr.trim())) {
return fallbackCity;
}
const cleaned = locStr.split('(')[0].split(',')[0].trim();
return cleaned ? cleaned : locStr;
};
const isAnonymousPost = Boolean(post.isAnonymous ? true : post.showAuthorName === false ? true : post.userName?.startsWith('Anonymous #') ? true : post.userName?.includes('නිර්නාමික'));
const authorName = isAnonymousPost ? 'නිර්නාමික පරිශීලක (Anonymous)' : post.userName ? post.userName : post.authorName ? post.authorName : getLangText('සහය ඉල්ලුම්කරු', 'Help Seeker', 'உதவி கோருபவர்');
const authorPhoto = isAnonymousPost ? '' : post.userPhotoUrl ? post.userPhotoUrl : post.photoUrl ? post.photoUrl : '';
const postCode = post.postCode ? post.postCode : post.id ? '#POST-' + post.id.replace(/[^0-9]/g, '').slice(-4) : '#SRV-0000';
const rawCitySource = post.locationName ? post.locationName : post.city ? post.city : post.town;
const nearestCity = getCityOnly(rawCitySource);
const rawDistance = typeof post.distanceKm === 'number' ? post.distanceKm : typeof post.actualDistanceKm === 'number' ? post.actualDistanceKm : null;
const isDistanceHiddenFromUsers = post.showDistance === false;
const phoneNumber = post.userPhone ? post.userPhone : post.contactPhone ? post.contactPhone : post.contactWhatsapp ? post.contactWhatsapp : '';
const displayPhone = maskPhone(phoneNumber, isDemo);
const formatPostDate = (dateVal?: any): string => {
if (post.autoSavedDate && post.autoSavedTime) {
return post.autoSavedDate + ' • ' + post.autoSavedTime;
}
if (!dateVal) return getLangText('මෑතකදී', 'Recently', 'சமீபத்தில்');
if (typeof dateVal === 'string') {
if (dateVal.includes('මීට') ? true : dateVal.includes('පෙර') ? true : dateVal.includes('ago')) {
return dateVal;
}
const parsed = Date.parse(dateVal);
if (!isNaN(parsed)) {
try {
const d = new Date(parsed);
return d.toLocaleDateString(activeLang === 'en' ? 'en-US' : 'si-LK') + ' ' + d.toLocaleTimeString([], {
hour: '2-digit',
minute: '2-digit'
});
} catch (err) {
return dateVal;
}
}
return dateVal;
}
if (typeof dateVal === 'number') {
try {
const d = new Date(dateVal);
return d.toLocaleDateString(activeLang === 'en' ? 'en-US' : 'si-LK') + ' ' + d.toLocaleTimeString([], {
hour: '2-digit',
minute: '2-digit'
});
} catch (err) {
return getLangText('මෑතකදී', 'Recently', 'சமீபத்தில்');
}
}
return getLangText('මෑතකදී', 'Recently', 'சமீபத்தில்');
};
const handleCopyPhone = (e: React.MouseEvent) => {
e.stopPropagation();
if (isDemo) {
if (onRequireRegistration) onRequireRegistration();
return;
}
if (!phoneNumber) return;
try {
navigator.clipboard.writeText(phoneNumber);
setCopiedPhone(true);
setTimeout(() => setCopiedPhone(false), 2000);
} catch (err) {}
};
const handleCopyExternalLink = (e: React.MouseEvent) => {
e.stopPropagation();
if (!post.externalLink) return;
try {
navigator.clipboard.writeText(post.externalLink);
setCopiedLink(true);
setTimeout(() => setCopiedLink(false), 2000);
} catch (err) {}
};
const handleOpenExternalLink = (e: React.MouseEvent) => {
e.stopPropagation();
if (!post.externalLink) return;
let targetUrl = String(post.externalLink).trim();
if (!/^https?:\/\//i.test(targetUrl)) {
targetUrl = 'https://' + targetUrl;
}
window.open(targetUrl, '_blank', 'noopener,noreferrer');
};
const handlePollVote = async (optionId: string, e: React.MouseEvent) => {
e.stopPropagation();
if (!localPoll ? !localPoll : !Array.isArray(localPoll.options)) return;
const updatedOptions = localPoll.options.map((opt: any) => {
const votedList = Array.isArray(opt.votedBy) ? opt.votedBy : [];
const alreadyVoted = votedList.includes(myUserId);
if (opt.id === optionId) {
if (alreadyVoted) return opt;
return {
...opt,
votes: (opt.votes ? opt.votes : 0) + 1,
votedBy: [...votedList, myUserId]
};
} else if (alreadyVoted) {
return {
...opt,
votes: Math.max(0, (opt.votes ? opt.votes : 1) - 1),
votedBy: votedList.filter((id: string) => id !== myUserId)
};
}
return opt;
});
const totalVotes = updatedOptions.reduce((sum: number, o: any) => sum + (o.votes ? o.votes : 0), 0);
const nextPoll = {
...localPoll,
options: updatedOptions,
totalVotes: totalVotes
};
setLocalPoll(nextPoll);
try {
if (post.id) {
await updateHelpPostInFirestore(post.id, ({ pollData: nextPoll } as any));
}
} catch (err) {}
};
const handleLikeClick = async (e: React.MouseEvent) => {
e.stopPropagation();
if (onLike) onLike(post.id);
const nextLiked = !isLiked;
const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
setIsLiked(nextLiked);
setLikesCount(nextCount);
if (nextLiked && isUnliked) {
setIsUnliked(false);
setUnlikesCount((prev: number) => Math.max(0, prev - 1));
}
try {
if (post.id) {
await updateHelpPostInFirestore(post.id, {
likeCount: nextCount,
likedBy: nextLiked ? [myUserId] : []
});
}
} catch (err) {}
};
const handleUnlikeClick = async (e: React.MouseEvent) => {
e.stopPropagation();
if (onUnlike) onUnlike(post.id);
const nextUnliked = !isUnliked;
const nextCount = nextUnliked ? unlikesCount + 1 : Math.max(0, unlikesCount - 1);
setIsUnliked(nextUnliked);
setUnlikesCount(nextCount);
if (nextUnliked && isLiked) {
setIsLiked(false);
setLikesCount((prev: number) => Math.max(0, prev - 1));
}
try {
if (post.id) {
await updateHelpPostInFirestore(post.id, {
unlikesCount: nextCount,
unlikeCount: nextCount,
unlikedBy: nextUnliked ? [myUserId] : []
});
}
} catch (err) {}
};
const handleSaveClick = async (e: React.MouseEvent) => {
e.stopPropagation();
if (onToggleSave) onToggleSave(post);
const nextSaved = !isSaved;
const nextCount = nextSaved ? savesCount + 1 : Math.max(0, savesCount - 1);
setIsSaved(nextSaved);
setSavesCount(nextCount);
try {
if (post.id) {
await updateHelpPostInFirestore(post.id, {
savesCount: nextCount,
saveCount: nextCount
});
}
} catch (err) {}
};
const handleAddComment = async (e: React.FormEvent) => {
e.preventDefault();
if (!newCommentText.trim()) return;
setIsSubmittingComment(true);
const newComment: PostComment = {
id: 'cmt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
userId: currentUser?.id ? currentUser.id : currentUser?.userId ? currentUser.userId : 'guest_user',
userName: currentUser?.name ? currentUser.name : 'සහය සාමාජික',
userPhotoUrl: currentUser?.photoUrl ? currentUser.photoUrl : '',
comment: newCommentText.trim(),
createdAt: new Date().toISOString()
};
const updatedComments = [...localComments, newComment];
setLocalComments(updatedComments);
setNewCommentText('');
setIsSubmittingComment(false);
try {
window.dispatchEvent(new CustomEvent('sahaya_post_comment_added', { detail: { postId: post.id, comment: newComment, commentsList: updatedComments } }));
} catch {}
try {
if (post.id) {
if ((post as any)?.rawRedAlert || post.category === 'red_alert') {
await addCommentToRedAlert(post.id, {
id: newComment.id,
userId: newComment.userId,
userName: newComment.userName,
text: newComment.comment,
createdAt: newComment.createdAt
}).catch(() => {});
} else {
await updateHelpPostInFirestore(post.id, {
commentsCount: updatedComments.length,
commentsList: updatedComments
});
}
}
} catch (err) {
console.warn('Comment sync error:', err);
}
};
const handleDelete = async (e?: React.MouseEvent) => {
if (e) e.stopPropagation();
if (!window.confirm(getLangText('මෙම දැන්වීම ඉවත් කිරීමට ඔබට සහතිකද?', 'Are you sure you want to delete this post?', 'இந்த இடுகையை நீக்க உறுதியாக உள்ளீர்களா?'))) {
return;
}
const targetId = post.id;
setIsDeletingLocal(true);
if (targetId) {
addDeletedPostId(targetId);
const pCodeStr = String(post.postCode || '');
const isRedAlertPost = Boolean((post as any)?.rawRedAlert || post.category === 'red_alert' || pCodeStr.startsWith('#RED-'));
const isBloodPost = Boolean(
  post.postType === 'blood_request' ||
  post.serviceType === 'blood_donation' ||
  pCodeStr.startsWith('#BLD-') ||
  (post.tagName && String(post.tagName).includes('ලේ අවශ්‍යතාවය'))
);
const isDisasterPost = Boolean(
  post.postType === 'disaster_relief' ||
  post.serviceType === 'disaster_relief' ||
  pCodeStr.startsWith('#EMG-') ||
  (post.tagName && String(post.tagName).includes('ආපදා සහන'))
);
const isJobPost = Boolean((post as any)?.rawJobListing || post.category === 'jobs');
const isAccPost = Boolean((post as any)?.rawAccommodationListing || post.category === 'accommodation');
if (isRedAlertPost) {
addDeletedRedAlertId(targetId);
try {
await cancelRedAlertByReporter(targetId).catch(() => {});
await deleteRedAlertInFirestore(targetId).catch(() => {});
} catch {}
try {
window.dispatchEvent(new CustomEvent('sahaya_red_alert_deleted', { detail: { alertId: targetId } }));
} catch {}
} else if (isBloodPost) {
addDeletedBloodId(targetId);
try {
purgeBloodRequestEverywhere(targetId, pCodeStr, post.contactPersonName);
} catch {}
} else if (isDisasterPost) {
addDeletedDisasterId(targetId);
try {
purgeDisasterReliefEverywhere(targetId, post.title || post.whatHappened, pCodeStr);
} catch {}
} else if (isJobPost) {
addDeletedJobId(targetId);
try {
window.dispatchEvent(new CustomEvent('sahaya_jobs_updated'));
} catch {}
} else if (isAccPost) {
addDeletedAccommodationId(targetId);
try {
window.dispatchEvent(new CustomEvent('sahaya_accommodations_updated'));
} catch {}
}
try {
  removeNotificationsForPost(targetId, post.postCode);
} catch {}
try {
  window.dispatchEvent(new Event('sahaya_post_deleted'));
} catch {}
try {
  await updateHelpPostInFirestore(targetId, {
    isDeleted: true,
    status: 'deleted',
    deletedAt: new Date().toISOString()
  }).catch(() => {});
  await deleteHelpPostFromFirestore(targetId).catch(() => {});
} catch (err) {}
}
if (onDeletePost) {
  onDeletePost(targetId ? targetId : post);
}
try {
  window.dispatchEvent(new Event('sahaya_post_deleted'));
} catch {}
};
const handleEditClick = (e: React.MouseEvent) => {
e.stopPropagation();
if (onEditPost) {
onEditPost(post);
}
};
const handleViewClick = (e: React.MouseEvent) => {
e.stopPropagation();
if ((post as any)?.rawRedAlert && onViewPost) {
onViewPost(post);
return;
}
setIsExpandedFullModal(true);
};
const handleChatClick = (e: React.MouseEvent) => {
e.stopPropagation();
if (isDemo) {
if (onRequireRegistration) onRequireRegistration();
return;
}
if ((post as any)?.rawRedAlert && onViewPost) {
onViewPost(post);
return;
}
if (onOpenChat) {
onOpenChat(post);
} else if (onOfferSupport) {
onOfferSupport(post);
} else if (onViewDetails) {
onViewDetails(post.id);
}
};
const pCodeUpper = String(post.postCode || '').toUpperCase();
const isBloodCardType = Boolean(
  post.postType === 'blood_request' ||
  post.serviceType === 'blood_donation' ||
  pCodeUpper.startsWith('#BLD-') ||
  (post.tagName && String(post.tagName).includes('ලේ අවශ්‍යතාවය'))
);
const cleanReplies = deduplicatePostReplies(Array.isArray(post.replies) ? post.replies : [], post);
const normCurrentPhone = (currentUser?.phone || (currentUser as any)?.whatsappPhone || (currentUser as any)?.whatsappNumber || '').replace(/\D/g, '');
const myReply = !ownerCheck
  ? cleanReplies.find((r: any) => {
      if (!r) return false;
      if (r.responderId && myUserId && myUserId !== 'anonymous_guest' && String(r.responderId) === String(myUserId)) return true;
      const rPhone = (r.responderPhone || '').replace(/\D/g, '');
      if (normCurrentPhone.length >= 9 && rPhone.length >= 9 && normCurrentPhone.slice(-9) === rPhone.slice(-9)) return true;
      if (currentUser?.name && r.responderName && currentUser.name.trim().toLowerCase() === r.responderName.trim().toLowerCase()) return true;
      return false;
    })
  : null;
const isMyReplyConfirmed = Boolean(
  myReply && (
    myReply.isConfirmed ||
    myReply.isAccepted ||
    (post.isConfirmed && (post.confirmedHelperName === myReply.responderName || post.confirmedHelperId === myReply.responderId))
  )
);
const offersCount = cleanReplies.length;
const isBloodCompletedOnCard = Boolean(
  post.isResolved ||
  post.status === 'resolved' ||
  post.serviceStage === 'completed' ||
  Number((post as any).bloodWorkflowStep) >= 5
);
const isBloodStep3DoneOnCard = Boolean(
  isBloodCompletedOnCard ||
  (post as any).bloodDonatedByHelper ||
  Number((post as any).bloodWorkflowStep) >= 4 ||
  cleanReplies.some((r: any) => r?.bloodDonatedByHelper || Number(r?.workflowStep) >= 4)
);
const isBloodStep2DoneOnCard = Boolean(
  isBloodStep3DoneOnCard ||
  post.isConfirmed ||
  isMyReplyConfirmed ||
  Number((post as any).bloodWorkflowStep) >= 3 ||
  cleanReplies.some((r: any) => r?.isConfirmed || r?.isAccepted || Number(r?.workflowStep) >= 3)
);
const cardBloodStep: 1 | 2 | 3 | 4 | 5 = isBloodCompletedOnCard
  ? 5
  : isBloodStep3DoneOnCard
  ? 4
  : isBloodStep2DoneOnCard
  ? 3
  : offersCount > 0
  ? 2
  : 1;

const handleSupportClick = (e: React.MouseEvent) => {
e.stopPropagation();
if (isDemo) {
if (onRequireRegistration) onRequireRegistration();
return;
}
if ((post as any)?.rawRedAlert && onViewPost) {
onViewPost(post);
return;
}
if (ownerCheck && onOpenSupportOffers) {
onOpenSupportOffers(post);
} else if (!ownerCheck && myReply && onOpenSupportOffers) {
onOpenSupportOffers(post);
} else if (onOfferSupport) {
onOfferSupport(post);
} else if (onOpenSupportOffers) {
onOpenSupportOffers(post);
} else if (onOpenConfirm) {
onOpenConfirm(post);
} else if (onViewPost) {
onViewPost(post);
}
};
const handleProfileClick = (e: React.MouseEvent) => {
e.stopPropagation();
if (isAnonymousPost && !isAdmin) {
alert('මෙම දැන්වීමේ පළකරන්නාගේ නම සඟවා (Anonymous) ඇත.');
return;
}
if (onViewProfile) {
const targetUser = post.actualAuthorId ? post.actualAuthorId : post.userId ? post.userId : authorName;
onViewProfile(targetUser);
}
};
const renderPollBox = () => {
if ((!localPoll ? !localPoll : !Array.isArray(localPoll.options)) ? !localPoll ? !localPoll : !Array.isArray(localPoll.options) : !(localPoll.options.length >= 2)) {
return null;
}
const total = localPoll.totalVotes ? localPoll.totalVotes : 0;
return h('div', {
onClick: (e: any) => e.stopPropagation(),
className: 'p-3 rounded-2xl bg-emerald-50/90 dark:bg-[#071f13] border border-emerald-300 dark:border-emerald-800 space-y-2'
}, h('div', { className: 'flex items-center justify-between text-xs font-black text-emerald-950 dark:text-emerald-200' }, h('span', { className: 'flex items-center gap-1.5' }, h(BarChart3, { className: 'w-4 h-4 text-emerald-600' }), h('span', null, localPoll.question ? localPoll.question : 'මත විමසුම (Poll)')), h('span', { className: 'text-[10px] font-mono text-emerald-700 dark:text-emerald-400' }, total + ' votes')), h('div', { className: 'space-y-1.5' }, localPoll.options.map((opt: any) => {
const votes = opt.votes ? opt.votes : 0;
const pct = total >= 1 ? Math.round(votes * 100 / total) : 0;
const isMyVote = Array.isArray(opt.votedBy) && opt.votedBy.includes(myUserId);
return h('button', {
key: opt.id,
type: 'button',
onClick: (e: any) => handlePollVote(opt.id, e),
className: 'w-full relative overflow-hidden rounded-xl border text-left p-2 transition-all cursor-pointer ' + (isMyVote ? 'border-emerald-600 bg-emerald-100/80 dark:bg-emerald-900/60' : 'border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#06160d] hover:border-emerald-400')
}, h('div', {
className: 'absolute inset-y-0 left-0 bg-emerald-500/20 transition-all',
style: { width: pct + '%' }
}), h('div', { className: 'relative flex items-center justify-between text-xs font-bold' }, h('span', { className: 'text-slate-900 dark:text-white truncate pr-2' }, (isMyVote ? '✓ ' : '') + opt.text), h('span', { className: 'font-mono text-[11px] text-emerald-700 dark:text-emerald-300 shrink-0' }, pct + '% (' + votes + ')')));
})));
};
const renderExternalLinkBar = () => {
if (!post.externalLink) return null;
return h('div', {
onClick: (e: any) => e.stopPropagation(),
className: 'mt-2 p-2.5 rounded-xl bg-sky-50/90 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 flex items-center justify-between gap-2 flex-wrap'
}, h('span', { className: 'text-xs font-bold text-sky-900 dark:text-sky-200 truncate max-w-[200px] sm:max-w-xs' }, '🔗 ' + post.externalLink), h('div', { className: 'flex items-center gap-1.5 shrink-0' }, h('button', {
type: 'button',
onClick: handleOpenExternalLink,
className: 'px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer'
}, h(ExternalLink, { className: 'w-3 h-3' }), h('span', null, 'Open')), h('button', {
type: 'button',
onClick: handleCopyExternalLink,
className: 'px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-slate-700 text-[11px] font-black flex items-center gap-1 cursor-pointer'
}, h(copiedLink ? Check : Copy, { className: 'w-3 h-3 text-emerald-600' }), h('span', null, copiedLink ? 'Copied!' : 'Copy'))));
};
const renderCommentsSection = () => {
if (!showCommentsDrawer) return null;
const areCommentsHidden = post.showComments === false && !ownerCheck && !isAdmin;
return h('div', {
className: 'mt-3.5 pt-3.5 border-t border-slate-200/80 dark:border-emerald-950/80 space-y-3 animate-fadeIn',
onClick: (e: any) => e.stopPropagation()
}, h('div', { className: 'flex items-center justify-between' }, h('div', { className: 'flex items-center gap-2' }, h(MessageSquare, { className: 'w-4 h-4 text-emerald-600' }), h('h5', { className: 'text-xs font-black text-slate-800 dark:text-zinc-200' }, 'අදහස් සහ විමසීම් (Comments - ' + localComments.length + ')')), h('button', {
type: 'button',
onClick: () => setShowCommentsDrawer(false),
className: 'text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer'
}, 'වසන්න ✕')), areCommentsHidden ? h('div', { className: 'p-3 rounded-2xl bg-slate-100 dark:bg-[#06160d] border border-slate-200 dark:border-emerald-950 text-center text-xs font-bold text-slate-500 dark:text-zinc-400' }, '🔒 මෙම දැන්වීමේ අදහස් (Comments) අන් අයට පෙන්වීම දැන්වීම්කරු විසින් අක්‍රීය කර ඇත.') : h(React.Fragment, null, h('div', { className: 'space-y-2 max-h-56 overflow-y-auto pr-1' }, localComments.length === 0 ? h('div', { className: 'py-4 text-center text-xs text-slate-400 dark:text-zinc-500 font-medium' }, 'තවමත් අදහස් පළවී නොමැත. මුලින්ම අදහසක් දක්වන්න!') : localComments.map((cmt: any) => h('div', {
key: cmt.id,
className: 'p-2.5 rounded-2xl bg-slate-50 dark:bg-[#06180e] border border-slate-200/80 dark:border-emerald-950/60 flex items-start gap-2.5'
}, h('div', { className: 'w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0' }, cmt.userPhotoUrl ? h('img', {
src: cmt.userPhotoUrl,
alt: cmt.userName,
className: 'w-full h-full rounded-full object-cover'
}) : cmt.userName.charAt(0).toUpperCase()), h('div', { className: 'min-w-0 flex-1' }, h('div', { className: 'flex items-center justify-between gap-1 mb-0.5' }, h('span', { className: 'text-[11px] font-black text-slate-900 dark:text-zinc-100 truncate' }, cmt.userName), h('span', { className: 'text-[9px] text-slate-400 font-medium' }, formatPostDate(cmt.createdAt))), h('p', { className: 'text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed' }, cmt.comment))))), h('form', {
onSubmit: handleAddComment,
className: 'flex items-center gap-2 pt-1'
}, h('input', {
type: 'text',
required: true,
value: newCommentText,
onChange: (e: any) => setNewCommentText(e.target.value),
placeholder: 'ඔබගේ අදහස / විමසීම මෙහි සටහන් කරන්න...',
className: 'flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#06160d] border border-slate-200 dark:border-emerald-950 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500'
}), h('button', {
type: 'submit',
disabled: !newCommentText.trim() ? true : isSubmittingComment,
className: 'p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white cursor-pointer active:scale-95 transition-all',
title: 'Comment කරන්න'
}, h(Send, { className: 'w-4 h-4' })))));
};
const renderInteractiveActionBar = () => {
  const supportBtnLabel = (post as any)?.rawRedAlert
    ? getLangText('🚨 රතු එළිය විස්තරය', '🚨 Red Alert Details', '🚨 சிவப்பு எச்சரிக்கை')
    : ownerCheck
      ? isBloodCardType
        ? cardBloodStep === 5
          ? getLangText(`🎉 ලේ ලැබුණා • අවසන් (${offersCount})`, `🎉 Completed (${offersCount})`, `🎉 முடிந்தது (${offersCount})`)
          : cardBloodStep === 4
          ? getLangText(`👉 පියවර 4/4: ලේ ලැබුණා තහවුරු කරන්න`, `👉 Step 4/4: Confirm Blood`, `👉 படி 4/4: உறுதிப்படுத்தவும்`)
          : cardBloodStep === 3
          ? getLangText(`⏳ පියවර 3/4 • පරිත්‍යාගශීලීන් (${offersCount})`, `⏳ Step 3/4 • Donors (${offersCount})`, `⏳ படி 3/4 (${offersCount})`)
          : cardBloodStep === 2
          ? getLangText(`👉 පියවර 2/4: පරිත්‍යාගශීලියා තෝරන්න (${offersCount})`, `👉 Step 2/4: Select Donor (${offersCount})`, `👉 படி 2/4 (${offersCount})`)
          : getLangText(`🩸 පරිත්‍යාගශීලීන් (${offersCount})`, `🩸 Donors (${offersCount})`, `🩸 கொடையாளர்கள் (${offersCount})`)
        : getLangText(`සහායකයින් (${offersCount})`, `Helpers (${offersCount})`, `உதவியாளர்கள் (${offersCount})`)
      : myReply
        ? isBloodCardType
          ? cardBloodStep === 5
            ? getLangText(isBloodCardType ? '🎉 උතුම් පරිත්‍යාගය අවසන් (4/4 ✓)' : '🎉 ගනුදෙනුව අවසන් (4/4 ✓)', '🎉 Completed (4/4 ✓)', '🎉 முடிந்தது (4/4 ✓)')
            : cardBloodStep === 4
            ? getLangText('⏳ පියවර 4/4 • අවසන් තහවුරු කිරීම', '⏳ Step 4/4 • Finalizing', '⏳ படி 4/4')
            : cardBloodStep === 3
            ? getLangText('👉 පියවර 3/4: ලේ පරිත්‍යාගය තහවුරු කරන්න', '👉 Step 3/4: Confirm Donation', '👉 படி 3/4')
            : getLangText('⏳ පියවර 2/4 • පියවර බලන්න', '⏳ Step 2/4 • View Steps', '⏳ படி 2/4')
          : isMyReplyConfirmed
          ? getLangText('✅ තෝරාගෙන ඇත • විස්තර', '✅ Confirmed • Details', '✅ உறுதி')
          : getLangText('⏳ ඉදිරිපත් වී ඇත • විස්තර', '⏳ Offered • Details', '⏳ வழங்கப்பட்டது')
        : isBloodCardType
          ? getLangText('🩸 ලේ ලබාදෙන්න (පියවර 1)', '🩸 Donate Blood (Step 1)', '🩸 இரத்தம் வழங்கவும்')
          : getLangText('සහාය වන්න', 'Help', 'உதவுக');

return h('div', {
onClick: (e: any) => e.stopPropagation(),
className: 'mt-3 pt-2.5 border-t border-slate-100 dark:border-emerald-950/60 flex items-center justify-between gap-2 text-xs font-bold flex-wrap'
}, h('div', { className: 'flex items-center gap-1 sm:gap-1.5 flex-wrap' }, h('button', {
type: 'button',
onClick: handleLikeClick,
className: 'px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ' + (isLiked ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-black border border-rose-300 dark:border-rose-800' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#0b2417]')
}, h(Heart, { className: 'w-4 h-4 ' + (isLiked ? 'fill-current text-rose-500' : '') }), h('span', null, likesCount)), h('button', {
type: 'button',
onClick: handleUnlikeClick,
className: 'px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ' + (isUnliked ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-zinc-200 font-black border border-slate-300 dark:border-slate-700' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#0b2417]')
}, h(ThumbsDown, { className: 'w-4 h-4 ' + (isUnliked ? 'fill-current text-slate-700 dark:text-slate-300' : '') }), h('span', null, unlikesCount)), h('button', {
type: 'button',
onClick: (e: any) => {
e.stopPropagation();
setShowCommentsDrawer(prev => !prev);
},
className: 'px-2.5 py-1.5 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#0b2417] flex items-center gap-1.5 transition-all cursor-pointer active:scale-95'
}, h(MessageSquare, { className: 'w-4 h-4 text-emerald-600' }), h('span', null, localComments.length)), h('button', {
type: 'button',
onClick: handleSaveClick,
className: 'px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ' + (isSaved ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-black border border-amber-300 dark:border-amber-800' : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#0b2417]')
}, h(Bookmark, { className: 'w-4 h-4 ' + (isSaved ? 'fill-current text-amber-500' : '') }), h('span', null, savesCount))), h('div', { className: 'flex items-center gap-1.5 flex-wrap' }, (displayPhone && (!isBloodCardType || ownerCheck || isAdmin || isMyReplyConfirmed)) ? h('button', {
type: 'button',
onClick: handleCopyPhone,
className: 'px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-black flex items-center gap-1 cursor-pointer active:scale-95',
title: 'දුරකථන අංකය පිටපත් කරන්න'
}, h(Phone, { className: 'w-3.5 h-3.5 text-emerald-600' }), h('span', null, displayPhone), copiedPhone ? h('span', { className: 'text-[10px] text-emerald-600' }, '✓') : null) : null, h('button', {
type: 'button',
onClick: handleChatClick,
className: 'px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 text-xs font-bold shadow-xs',
title: 'අවශ්‍ය නම් පමණක් Chat පණිවිඩයක් එවන්න'
}, h(MessageCircle, { className: 'w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400' }), h('span', null, 'Chat')), Boolean(onOfferSupport ? true : onOpenSupportOffers ? true : onOpenConfirm) ? h('button', {
type: 'button',
onClick: handleSupportClick,
className: 'px-3 py-1.5 rounded-xl ' + ((post as any)?.rawRedAlert || (isBloodCardType && !ownerCheck && !myReply) ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 ' : ownerCheck ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 ' : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 ') + 'text-white flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 text-xs font-black shadow-sm',
title: (post as any)?.rawRedAlert ? 'රතු එළිය විස්තරය සහ සත්‍ය/අසත්‍ය ලකුණු' : ownerCheck ? 'ඉදිරිපත් වූ සහායකයින් / පරිත්‍යාග පියවර බලන්න' : myReply ? 'ලේ පරිත්‍යාග පියවර විවෘත කරන්න' : 'සහාය වන්න (Offer Support)'
}, h(ownerCheck && !(post as any)?.rawRedAlert ? UserCheck : HelpCircle, { className: 'w-3.5 h-3.5' }), h('span', null, supportBtnLabel)) : null, canModify && onEditPost ? h('button', {
type: 'button',
onClick: handleEditClick,
className: 'p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-xl cursor-pointer active:scale-95',
title: 'සංස්කරණය කරන්න (Edit)'
}, h(Pencil, { className: 'w-3.5 h-3.5' })) : null, canModify ? h('button', {
type: 'button',
onClick: handleDelete,
className: 'p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl cursor-pointer active:scale-95',
title: 'ඉවත් කරන්න (Delete)'
}, h(Trash2, { className: 'w-3.5 h-3.5' })) : null));
};
const renderCardHeader = () => {
  const tagDisplay = post.tagName ? post.tagName : post.tagCategory ? post.tagCategory : post.category === 'quick_services' ? 'ඉක්මන් සේවා' : 'සාමාන්‍ය සේවා';
  return h('div', { className: 'flex items-start justify-between gap-2.5 pb-2.5' }, h('div', {
    onClick: handleProfileClick,
    className: 'flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group'
  }, h('div', { className: 'relative shrink-0' }, isAnonymousPost ? h('div', { className: 'w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 text-white flex items-center justify-center font-black text-sm shadow-md border-2 border-slate-300 dark:border-slate-700' }, h(UserIcon, { className: 'w-5 h-5 text-slate-300' })) : authorPhoto ? h('img', {
    src: authorPhoto,
    alt: authorName,
    loading: 'lazy',
    decoding: 'async',
    className: 'w-10 h-10 rounded-2xl object-cover border-2 border-emerald-500 shadow-md ring-2 ring-emerald-400/20'
  }) : h('div', { className: 'w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-sm shadow-md border-2 border-white dark:border-slate-800' }, authorName.charAt(0).toUpperCase()), ownerCheck && !isAnonymousPost ? h('span', { className: 'absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 border border-white dark:border-slate-800 shadow-xs' }, h(UserCheck, { className: 'w-3 h-3' })) : null), h('div', { className: 'min-w-0 flex-1' }, h('div', { className: 'flex items-center gap-1.5 flex-wrap' }, h('h4', { className: 'font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm leading-snug truncate group-hover:text-emerald-600 transition-colors' }, authorName), isAnonymousPost ? h('span', { className: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-zinc-300 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-slate-300 dark:border-slate-700' }, 'නම සඟවා ඇත') : null, ownerCheck ? h('span', { className: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-400 dark:border-emerald-700' }, '👤 ඔබගේ (දැන්වීම්කරු)') : myReply ? h('span', { className: isMyReplyConfirmed ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-400' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-400' }, isMyReplyConfirmed ? '✅ ඔබව සහායක ලෙස තෝරාගෙන ඇත' : '⏳ ඔබ සහයට ඉදිරිපත් වී ඇත') : null, isPrivatePost ? h('span', { className: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-amber-300' }, '🔒 Private') : null, isScheduledPost ? h('span', { className: 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-sky-300' }, '📅 ' + (post.scheduledDate ? post.scheduledDate + ' ' + (post.scheduledTime ? post.scheduledTime : '') : 'Scheduled')) : null, h('span', { className: 'font-mono text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md' }, postCode), h('span', { className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80' }, h(Zap, { className: 'w-2.5 h-2.5 text-emerald-600' }), h('span', null, '#' + tagDisplay.replace(/^#/, '')) /* TAG_END */ )), h('div', { className: 'flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 flex-wrap' }, h('span', { className: 'flex items-center gap-1' }, h(Clock, { className: 'w-3 h-3 text-slate-400' }), h('span', null, formatPostDate(post.createdAt ? post.createdAt : post.createdAtIso))), h('span', null, '•'), h('span', { className: 'flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400 font-medium' }, h(MapPin, { className: 'w-3 h-3' }), h('span', { className: 'truncate max-w-[140px]' }, isBloodCardType && !ownerCheck && !isAdmin && !isMyReplyConfirmed ? (post.district || 'ශ්‍රී ලංකාව') : nearestCity)), rawDistance !== null && !isDistanceHiddenFromUsers ? h('span', { className: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-mono font-bold text-[9px]' }, rawDistance.toFixed(1) + ' km') : null, rawDistance !== null && isDistanceHiddenFromUsers && isAdmin ? h('span', { className: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-md font-mono font-bold text-[9px] border border-amber-300' }, '🔒 දුර (Admin): ' + rawDistance.toFixed(1) + ' km') : null))), isAdmin && (isAnonymousPost ? true : isDistanceHiddenFromUsers) ? h('div', { className: 'p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-[10px] text-amber-900 dark:text-amber-200 shrink-0' }, h('div', { className: 'font-black flex items-center gap-1' }, h(Lock, { className: 'w-3 h-3 text-amber-600' }), h('span', null, 'Admin Audit:')), h('div', { className: 'truncate max-w-[140px] font-bold' }, 'නම: ' + (post.actualAuthorName ? post.actualAuthorName : post.userName ? post.userName : 'Unknown')), rawDistance !== null ? h('div', { className: 'font-mono text-[9px] text-amber-800 dark:text-amber-300' }, 'දුර: ' + rawDistance.toFixed(1) + ' km') : null) : null);
};
const renderValidityDurationForPoster = () => {
if (!ownerCheck) return null;
const validityInfo = getPostValidityInfo(post);
return h('div', { className: 'mt-3 px-3.5 py-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 dark:border-amber-500/40 flex items-center justify-between gap-2 text-xs font-bold text-amber-950 dark:text-amber-100 shadow-2xs' }, h('div', { className: 'flex items-center gap-2 min-w-0' }, h(Clock, { className: 'w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0' }), h('span', { className: 'text-slate-600 dark:text-slate-400 shrink-0' }, 'වලංගු කාලසීමාව:'), h('span', { className: 'font-extrabold text-amber-950 dark:text-amber-100 bg-amber-400/25 px-2 py-0.5 rounded-lg border border-amber-500/30 truncate' }, validityInfo.durationSi)), h('div', { className: 'shrink-0 flex items-center gap-1.5' }, h('span', { className: 'text-[11px] px-2.5 py-0.5 rounded-xl font-black ' + (validityInfo.isExpired ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30') }, validityInfo.remainingText)));
};
const renderExpandedFullModal = () => {
if (!isExpandedFullModal) return null;
const canSeeBloodConfidential = Boolean(ownerCheck || isAdmin || isMyReplyConfirmed);
const rawHeadlineOrig = post.headline ? post.headline : post.title ? post.title : '';
const rawHeadline = (isBloodCardType && !ownerCheck && !isAdmin && !isMyReplyConfirmed && rawHeadlineOrig.includes(':'))
  ? rawHeadlineOrig.split(':')[0].trim() + (post.district ? ` (${post.district})` : '')
  : rawHeadlineOrig;
const rawFullDesc = post.content ? post.content : post.whatHappened ? post.whatHappened : '';
const fullDesc = rawFullDesc && rawFullDesc.trim() !== rawHeadline.trim() ? rawFullDesc : '';
const neededText = post.whatIsNeeded && post.whatIsNeeded.trim() !== rawHeadline.trim() && post.whatIsNeeded.trim() !== fullDesc.trim() ? post.whatIsNeeded : '';
const condText = post.conditions ? post.conditions : '';
const noticeText = post.specialNotice ? post.specialNotice : (post as any).additionalNotes ? (post as any).additionalNotes : '';
const transportText = post.transport ? post.transport : post.deliveryOption ? post.deliveryOption : '';
const paymentText = post.payment ? post.payment : post.rewardDetails ? post.rewardDetails : '';
const imgUrl = post.imageUrl ? post.imageUrl : post.photoUrl ? post.photoUrl : post.image;
const fontStyle = getFontFamilyById(post.selectedFont);

const rawNeededStr = String(post.whatIsNeeded || '');
const parseBulletField = (label: string): string => {
  const regex = new RegExp(`${label}\\s*:\\s*([^•\\n]+)`, 'i');
  const match = rawNeededStr.match(regex);
  return match && match[1] ? match[1].trim() : '';
};

const bgMatch = (post.bloodGroup || rawHeadline || post.tagName || rawNeededStr).match(/(AB|A|B|O)[+-]/i);
const bloodGroupVal = post.bloodGroup || parseBulletField('ලේ වර්ගය') || (bgMatch ? bgMatch[0].toUpperCase() : '');
const hospitalFromTitle = rawHeadline.includes(':') ? rawHeadline.split(':').slice(1).join(':').trim() : '';
const hospitalVal = (post as any).hospitalName || parseBulletField('රෝහල') || hospitalFromTitle || post.locationName || nearestCity || '';
const patientVal = (post as any).patientName || parseBulletField('රෝගී නම') || (post as any).contactPersonName || authorName || '';
const unitsVal = (post as any).unitsNeeded || parseBulletField('අවශ්‍ය ඒකක') || post.helpersNeeded || 1;
const districtVal = post.district || parseBulletField('දිස්ත්‍රික්කය') || nearestCity || '';
const neededDateVal = (post as any).neededDate || parseBulletField('අවශ්‍ය දිනය') || 'කඩිනමින් (හදිසි)';
const contactPersonVal = (post as any).contactPersonName || parseBulletField('සම්බන්ධීකාරක') || authorName || '';

const pLat = typeof post.latitude === 'number' ? post.latitude : typeof post.lat === 'number' ? post.lat : null;
const pLng = typeof post.longitude === 'number' ? post.longitude : typeof post.lng === 'number' ? post.lng : null;
const mapDestQuery = pLat !== null && pLng !== null
  ? `${pLat},${pLng}`
  : `${hospitalVal || post.locationName || nearestCity}${districtVal && !(hospitalVal || '').includes(districtVal) ? `, ${districtVal}` : ''}, Sri Lanka`;
const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapDestQuery)}&travelmode=driving`;
const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapDestQuery)}&z=14&output=embed`;

return h('div', {
className: 'fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn',
onClick: () => setIsExpandedFullModal(false)
}, h('div', {
className: 'w-full max-w-3xl bg-white dark:bg-[#07190f] border-2 border-emerald-500 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col',
onClick: (e: any) => e.stopPropagation()
}, h('div', { className: 'bg-gradient-to-r from-emerald-800 via-teal-900 to-[#04160d] px-5 py-3.5 text-white flex items-center justify-between shrink-0' }, h('div', { className: 'flex items-center gap-2' }, h(Eye, { className: 'w-5 h-5 text-emerald-300' }), h('h3', { className: 'text-sm sm:text-base font-black' }, 'දැන්වීමේ සම්පූර්ණ විස්තරය (' + postCode + ')')), h('button', {
type: 'button',
onClick: () => setIsExpandedFullModal(false),
className: 'w-8 h-8 rounded-full bg-white/10 hover:bg-rose-600 text-white flex items-center justify-center font-bold cursor-pointer'
}, h(X, { className: 'w-4 h-4' }))), h('div', { className: 'p-5 overflow-y-auto flex-1 space-y-4' }, renderCardHeader(), post.audioUrl ? h('div', { className: 'mb-2' }, h(AudioVoicePlayer, {
audioUrl: post.audioUrl,
durationSec: post.audioDurationSec
})) : null, rawHeadline ? h('div', { className: 'w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-200/90 via-white to-emerald-100/90 dark:from-emerald-800/80 dark:via-[#0b291a] dark:to-emerald-900/80 border-2 border-emerald-500 shadow-xs' }, h('h2', {
className: 'text-base sm:text-xl font-black text-slate-950 dark:text-white leading-snug',
style: { fontFamily: fontStyle }
}, rawHeadline)) : null,
isBloodCardType ? h('div', { className: 'p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border-2 border-rose-500/60 space-y-3' },
  h('div', { className: 'flex items-center justify-between gap-2 border-b border-rose-200 dark:border-rose-800/60 pb-2' },
    h('span', { className: 'text-sm sm:text-base font-black text-rose-700 dark:text-rose-300 flex items-center gap-1.5' },
      h(Droplet, { className: 'w-4 h-4 fill-current' }),
      h('span', null, 'අවශ්‍ය රුධිර වර්ගය: ' + (bloodGroupVal || 'හදිසි'))
    ),
    h('span', { className: 'px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black' }, 'ඒකක ' + unitsVal)
  ),
  canSeeBloodConfidential ? h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs' },
    h('div', { className: 'p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-rose-200/70 dark:border-slate-800' },
      h('span', { className: 'font-bold text-slate-500 block mb-0.5' }, '🏥 රෝහල / ස්ථානය:'),
      h('span', { className: 'font-black text-slate-900 dark:text-white text-xs sm:text-sm' }, hospitalVal || nearestCity)
    ),
    h('div', { className: 'p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-rose-200/70 dark:border-slate-800' },
      h('span', { className: 'font-bold text-slate-500 block mb-0.5' }, '🚪 වාට්ටු අංකය:'),
      h('span', { className: 'font-black text-rose-700 dark:text-rose-300 text-xs sm:text-sm' }, (post as any).wardNumber || parseBulletField('වාට්ටු අංකය') || 'රුධිර බැංකුව')
    ),
    h('div', { className: 'p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-rose-200/70 dark:border-slate-800' },
      h('span', { className: 'font-bold text-slate-500 block mb-0.5' }, '📄 ගොනු අංකය:'),
      h('span', { className: 'font-mono font-black text-slate-900 dark:text-white text-xs sm:text-sm' }, (post as any).requestSlipNumber || parseBulletField('ගොනු අංකය') || post.postCode)
    ),
    h('div', { className: 'p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-rose-200/70 dark:border-slate-800' },
      h('span', { className: 'font-bold text-slate-500 block mb-0.5' }, '👤 රෝගියාගේ නම:'),
      h('span', { className: 'font-black text-slate-900 dark:text-white text-xs sm:text-sm' }, patientVal)
    ),
    h('div', { className: 'p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-rose-200/70 dark:border-slate-800 sm:col-span-2 flex items-center justify-between gap-2 flex-wrap' },
      h('div', null,
        h('span', { className: 'font-bold text-slate-500 block mb-0.5' }, '📞 සම්බන්ධීකාරක සහ දුරකථන අංකය:'),
        h('span', { className: 'font-black text-slate-900 dark:text-white text-xs sm:text-sm' }, contactPersonVal + (displayPhone ? ' • ' + displayPhone : ''))
      ),
      phoneNumber && !isDemo ? h('a', {
        href: 'tel:' + phoneNumber,
        className: 'px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm'
      }, h(Phone, { className: 'w-3.5 h-3.5' }), h('span', null, 'දැන් අමතන්න')) : null
    )
  ) : h('div', { className: 'space-y-2.5 text-xs' },
    h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' },
      h('div', { className: 'p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-rose-200/70 dark:border-slate-800' },
        h('span', { className: 'font-bold text-slate-500 block mb-0.5' }, '📍 දිස්ත්‍රික්කය / ප්‍රදේශය:'),
        h('span', { className: 'font-black text-slate-900 dark:text-white text-xs sm:text-sm' }, districtVal || 'ශ්‍රී ලංකාව')
      ),
      h('div', { className: 'p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-rose-200/70 dark:border-slate-800' },
        h('span', { className: 'font-bold text-slate-500 block mb-0.5' }, '📅 අවශ්‍ය දිනය / හදිසිභාවය:'),
        h('span', { className: 'font-black text-rose-600 dark:text-rose-400 text-xs sm:text-sm' }, neededDateVal)
      )
    ),
    h('div', { className: 'p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1' },
      h('div', { className: 'font-black text-xs flex items-center gap-1.5' },
        h('span', null, '🔒 රෝහල, වාට්ටු අංකය, ගොනු අංකය සහ දුරකථන අංකය ආරක්ෂිතව සඟවා ඇත')
      ),
      h('p', { className: 'text-[11px] font-bold leading-relaxed' },
        'පරිත්‍යාගශීලියෙකු තෝරාගන්නා තුරු රෝහල, වාට්ටු අංකය, ගොනු අංකය සහ දුරකථන අංක පෙන්වනු නොලැබේ. ලේ පරිත්‍යාග කිරීමට පහත "🩸 ලේ ලබාදෙන්න" බොත්තම ඔබා සුදුසුකම් පරීක්ෂාවට ඉදිරිපත් වන්න.'
      )
    )
  )
) : h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs' },
  h('div', { className: 'p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800' },
    h('span', { className: 'font-black text-slate-500 block mb-0.5' }, '👤 දැන්වීම්කරු:'),
    h('span', { className: 'font-black text-slate-900 dark:text-white' }, authorName)
  ),
  h('div', { className: 'p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2' },
    h('div', null,
      h('span', { className: 'font-black text-slate-500 block mb-0.5' }, '📞 දුරකථන අංකය:'),
      h('span', { className: 'font-black text-slate-900 dark:text-white font-mono' }, displayPhone || 'සඳහන් කර නැත')
    ),
    phoneNumber && !isDemo ? h('a', {
      href: 'tel:' + phoneNumber,
      className: 'px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1'
    }, h(Phone, { className: 'w-3.5 h-3.5' }), h('span', null, 'අමතන්න')) : null
  ),
  h('div', { className: 'p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 sm:col-span-2' },
    h('span', { className: 'font-black text-slate-500 block mb-0.5' }, '📍 ස්ථානය / ලිපිනය:'),
    h('span', { className: 'font-black text-slate-900 dark:text-white' }, (post.locationName || nearestCity) + (rawDistance !== null ? ` (${rawDistance.toFixed(1)} km)` : ''))
  )
),
imgUrl ? h('div', { className: 'w-full rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/60 shadow-lg' }, h('img', {
src: imgUrl,
alt: rawHeadline,
loading: 'lazy',
decoding: 'async',
className: 'w-full max-h-[65vh] object-contain mx-auto'
})) : null, (fullDesc && !isBloodCardType) ? h('div', { className: 'p-4 rounded-2xl bg-emerald-50/50 dark:bg-[#06180f] border border-emerald-200 dark:border-emerald-800 space-y-1' }, h('span', { className: 'text-[11px] font-black text-emerald-700 dark:text-emerald-400 block' }, 'සම්පූර්ණ විස්තරය:'), h('p', {
className: 'text-sm sm:text-base text-slate-900 dark:text-zinc-100 font-bold whitespace-pre-wrap leading-relaxed',
style: { fontFamily: fontStyle }
}, fullDesc)) : null, (neededText && !isBloodCardType) ? h('div', { className: 'p-3.5 rounded-2xl bg-slate-50 dark:bg-[#06180f] border border-slate-200 dark:border-emerald-900 space-y-1' }, h('span', { className: 'text-xs font-black text-emerald-700 dark:text-emerald-400 block' }, 'වියයුතු දේ / අවශ්‍යතාවය:'), h('p', { className: 'text-xs sm:text-sm text-slate-800 dark:text-zinc-200 font-bold whitespace-pre-wrap leading-relaxed' }, neededText)) : null, (!isBloodCardType && (condText ? true : Boolean(noticeText) ? true : Boolean(transportText) ? true : Boolean(paymentText))) ? h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs' }, condText ? h('div', { className: 'p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800' }, h('span', { className: 'font-black text-slate-500 block mb-0.5' }, 'කොන්දේසි:'), h('span', { className: 'font-bold text-slate-900 dark:text-white' }, condText)) : null, noticeText ? h('div', { className: 'p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800' }, h('span', { className: 'font-black text-slate-500 block mb-0.5' }, 'විශේෂ දැනුවත් කිරීම:'), h('span', { className: 'font-bold text-slate-900 dark:text-white' }, noticeText)) : null, transportText ? h('div', { className: 'p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800' }, h('span', { className: 'font-black text-slate-500 block mb-0.5' }, 'ප්‍රවාහනය / ලබාදීම:'), h('span', { className: 'font-bold text-slate-900 dark:text-white' }, transportText)) : null, paymentText ? h('div', { className: 'p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800' }, h('span', { className: 'font-black text-slate-500 block mb-0.5' }, 'ගෙවීම් / ප්‍රතිලාභ:'), h('span', { className: 'font-bold text-emerald-700 dark:text-emerald-400' }, paymentText)) : null) : null,
(!isBloodCardType || canSeeBloodConfidential) ? h('div', { className: 'p-3.5 rounded-2xl bg-slate-50 dark:bg-[#06180f] border border-emerald-300 dark:border-emerald-800/80 space-y-2.5' },
  h('div', { className: 'flex items-center justify-between gap-2' },
    h('span', { className: 'text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5' },
      h(MapPin, { className: 'w-4 h-4 text-emerald-600' }),
      h('span', null, '🗺️ ස්ථානය සහ Map Navigation (මගපෙන්වීම)')
    ),
    h('a', {
      href: googleMapsNavUrl,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs flex items-center gap-1.5 shadow-sm'
    }, h(Navigation, { className: 'w-3.5 h-3.5' }), h('span', null, 'Google Maps මගපෙන්වීම'))
  ),
  h('div', { className: 'w-full h-44 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900' },
    h('iframe', {
      title: 'Post Location Map',
      src: googleMapsEmbedUrl,
      className: 'w-full h-full border-0',
      loading: 'lazy',
      referrerPolicy: 'no-referrer-when-downgrade'
    })
  )
) : null,
renderPollBox(), renderExternalLinkBar(), renderValidityDurationForPoster(), renderInteractiveActionBar(), renderCommentsSection())));
};
const rawHeadlineCardOrig = post.headline ? post.headline : post.title ? post.title : '';
const rawHeadline = (isBloodCardType && !ownerCheck && !isAdmin && !isMyReplyConfirmed && rawHeadlineCardOrig.includes(':'))
  ? rawHeadlineCardOrig.split(':')[0].trim() + (post.district ? ` (${post.district})` : '')
  : rawHeadlineCardOrig;
const rawDesc = post.content ? post.content : post.whatHappened ? post.whatHappened : '';
const imgUrl = post.imageUrl ? post.imageUrl : post.photoUrl ? post.photoUrl : post.image;
const fontStyle = getFontFamilyById(post.selectedFont);
const isBloodCard = Boolean(
  post.postType === 'blood_request' ||
  post.serviceType === 'blood_donation' ||
  String(post.postCode || '').startsWith('#BLD-') ||
  (post.tagName && String(post.tagName).includes('ලේ අවශ්‍යතාවය'))
);
const hasDistinctDesc = Boolean(
  !isBloodCard &&
  rawDesc &&
  rawDesc.trim() !== rawHeadline.trim()
);
const effectiveDesc = hasDistinctDesc ? rawDesc : '';
const lineCount = effectiveDesc ? effectiveDesc.split(String.fromCharCode(10)).length : 0;
const isLongText = Boolean(Math.max(effectiveDesc.length, 165) === effectiveDesc.length && effectiveDesc.length !== 165 ? true : Math.max(lineCount, 4) === lineCount);
const hasValidImage = Boolean(imgUrl && !imageError);
const shouldCap16x9 = Boolean(isLongText ? true : hasValidImage);
const shortDesc = isLongText ? effectiveDesc.slice(0, 165) + '...' : effectiveDesc;
return h(React.Fragment, null, h('div', {
onClick: () => {
stopContinuousSupportBell();
if ((post as any)?.rawRedAlert && onViewPost) {
onViewPost(post);
return;
}
setIsExpandedFullModal(true);
},
className: 'relative rounded-3xl bg-white dark:bg-[#07170e] border border-slate-200/90 dark:border-emerald-950/80 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden p-4 sm:p-5 flex flex-col justify-between cursor-pointer'
}, renderCardHeader(), post.audioUrl ? h('div', {
onClick: (e: any) => e.stopPropagation(),
className: 'mb-2.5'
}, h(AudioVoicePlayer, {
audioUrl: post.audioUrl,
durationSec: post.audioDurationSec
})) : null, h('div', {
className: (shouldCap16x9 ? 'w-full aspect-video max-h-[250px] justify-between ' : 'w-full h-auto ') + 'rounded-2xl ' + (
  (post?.category === 'red_alert' || post?.category === 'emergency' || (post?.title && post.title.includes('රතු එළිය')) || (post?.tag && post.tag.includes('රතු එළිය')) || (post?.disasterType))
    ? 'bg-gradient-to-br from-[#450a0a] via-[#991b1b] to-[#f43f5e] text-white border-2 border-red-500/80 '
    : (post?.category === 'quick_services' || post?.category === 'quick_service' || (post?.title && post.title.includes('ඉක්මන්')) || (post?.tag && post.tag.includes('ඉක්මන්')) || (post?.serviceType === 'quick'))
    ? 'bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#10b981] text-white border-2 border-emerald-500/80 '
    : (post?.category === 'find_for_me' || post?.category === 'looking_for' || (post?.title && post.title.includes('සොයාදෙන්න')) || (post?.tag && post.tag.includes('සොයාදෙන්න')))
    ? 'bg-gradient-to-br from-[#fbbf24] via-[#f97316] to-[#ea580c] text-slate-950 border-2 border-amber-300 '
    : 'bg-gradient-to-br from-[#f2fcf7] via-white to-[#e8f7f0] dark:from-[#05180f] dark:via-[#072014] dark:to-[#04140b] border-2 border-emerald-400/80 dark:border-emerald-800/90 '
) + 'p-3 sm:p-3.5 flex flex-col overflow-hidden shadow-inner group relative'
}, rawHeadline ? h('div', { className: 'w-full px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-200/90 via-white to-emerald-100/90 dark:from-emerald-800/85 dark:via-[#0b291a] dark:to-emerald-900/85 border-2 border-emerald-500/70 shadow-2xs shrink-0 ' + (Boolean(shortDesc ? true : hasValidImage ? true : localPoll) ? 'mb-2 ' : '') + 'flex items-center justify-between gap-2' }, h('h3', {
className: 'text-xs sm:text-base font-black text-slate-950 dark:text-white leading-snug line-clamp-2',
style: { fontFamily: fontStyle }
}, rawHeadline)) : null, (hasValidImage ? true : Boolean(shortDesc) ? true : Boolean(localPoll)) ? h('div', { className: (shouldCap16x9 ? 'flex-1 min-h-0 ' : '') + 'overflow-hidden flex gap-3 items-center' }, hasValidImage ? h('div', { className: (shortDesc ? 'w-1/2 ' : 'w-full ') + 'h-full max-h-[180px] rounded-xl overflow-hidden bg-slate-900 border border-emerald-300 dark:border-emerald-800 relative shrink-0' }, h('img', {
src: imgUrl,
alt: rawHeadline,
loading: 'lazy',
decoding: 'async',
className: 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-300',
onError: () => setImageError(true)
})) : null, h('div', { className: 'flex-1 min-w-0 flex flex-col justify-between overflow-hidden space-y-2' }, shortDesc ? h('div', { className: 'p-2.5 sm:p-3 rounded-xl bg-white/95 dark:bg-[#071d12]/95 border border-emerald-200/90 dark:border-emerald-900/80 shadow-2xs overflow-hidden' }, h('p', {
className: (isLongText ? 'line-clamp-4 ' : '') + 'text-xs sm:text-sm text-slate-950 dark:text-zinc-100 leading-relaxed font-bold whitespace-pre-line',
style: { fontFamily: fontStyle }
}, shortDesc)) : null, renderPollBox())) : null), renderExternalLinkBar(), renderValidityDurationForPoster(), renderInteractiveActionBar(), renderCommentsSection()), renderExpandedFullModal());
};

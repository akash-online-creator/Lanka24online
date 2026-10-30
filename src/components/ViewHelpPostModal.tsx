import React from 'react';
import { HelpPost, Language, LocationOption, User } from '../types';
import { PostCard } from './PostCard';
import { Eye, Sparkles, X, CheckCircle2, MessageCircle, MessageSquare, Pencil, Trash2, HelpCircle } from 'lucide-react';
import { maskName } from '../utils/demoDataMasker';
import { checkIsPostOwner, checkIsAdmin } from '../utils/postOwnerHelper';
const h = React.createElement;
export interface ViewHelpPostModalProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  lang?: Language;
  language?: Language;
  viewerLocation?: LocationOption;
  currentLocation?: LocationOption;
  currentUser?: User | null;
  onOpenChat?: (post: HelpPost) => void;
  onOpenConfirm?: (post: HelpPost) => void;
  onOfferSupport?: (post: HelpPost) => void;
  onEditPost?: (post: HelpPost) => void;
  onDeletePost?: (post: HelpPost) => void;
  onBoostPost?: (post: HelpPost) => void;
  onRequireRegistration?: () => void;
  onAdminModerate?: (post: HelpPost) => void;
}
export const ViewHelpPostModal: React.FC<ViewHelpPostModalProps> = ({
post,
isOpen,
onClose,
lang,
language = 'si',
viewerLocation,
currentLocation,
currentUser = null,
onOpenChat,
onOpenConfirm,
onOfferSupport,
onEditPost,
onDeletePost,
onBoostPost,
onRequireRegistration,
onAdminModerate
}) => {
if (!isOpen) return null;
if (!post) return null;
const activeLang: Language = lang ? lang : language ? language : 'si';
const activeLocation = viewerLocation ? viewerLocation : currentLocation;
const isDemo = Boolean(currentUser?.isDemo);
const isAdmin = checkIsAdmin(currentUser ? currentUser : undefined);
const isPostOwner = checkIsPostOwner(currentUser ? currentUser : undefined, post);
const canModify = isPostOwner ? true : isAdmin;
const getLangText = (si: string, en: string, ta: string) => {
if (activeLang === 'en') return en;
if (activeLang === 'ta') return ta;
return si;
};
const handleChatClick = () => {
if (isDemo) {
if (onRequireRegistration) onRequireRegistration();
return;
}
if (onOpenChat) {
onClose();
onOpenChat(post);
}
};
const repliesList = Array.isArray(post.replies) ? post.replies : [];
return h('div', { className: 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn' }, h('div', { className: 'w-full max-w-xl bg-white dark:bg-[#06180f] border-2 border-emerald-500/60 rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col' }, /* Modal Header /
h('div', { className: 'bg-gradient-to-r from-sky-800 via-teal-900 to-emerald-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-emerald-500/40 shrink-0' }, h('div', { className: 'flex items-center gap-2.5' }, h('span', { className: 'p-2 bg-sky-500/20 border border-sky-400/40 rounded-xl text-sky-300' }, h(Eye, { className: 'w-5 h-5' })), h('div', null, h('h3', { className: 'text-base sm:text-lg font-black flex items-center gap-2' }, h('span', null, getLangText('දැන්වීම සහ සංවාද ඉතිහාසය (Ad & Chat)', 'Ad & Conversation History', 'விளம்பரம் மற்றும் உரையாடல் வரலாறு')), h('span', { className: 'text-xs font-mono bg-sky-900/80 border border-sky-400/40 px-2 py-0.5 rounded-lg text-sky-300 font-bold' }, post.postCode ? post.postCode : '#HELP')), h('p', { className: 'text-xs text-sky-200 font-medium' }, getLangText('දැන්වීම සහ ඒ සඳහා ලැබුණු සියලුම පණිවිඩ/Chat පහතින් පරීක්ෂා කළ හැක.', 'Review the ad and all received chat messages below.', 'விளம்பரம் மற்றும் பெறப்பட்ட அனைத்து செய்திகளையும் கீழே காணலாம்.')))), h('button', {
type: 'button',
onClick: onClose,
title: getLangText('වසන්න', 'Close', 'மூடு'),
className: 'w-8 h-8 rounded-full bg-sky-900/60 hover:bg-rose-600 text-white flex items-center justify-center font-bold transition-all cursor-pointer'
}, h(X, { className: 'w-4 h-4' }))), / Live Preview Container /
h('div', { className: 'p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-gradient-to-b from-sky-50/50 via-emerald-50/30 to-white dark:from-[#04140d] dark:via-[#030e09] dark:to-[#04140d]' }, h('div', { className: 'p-3 bg-emerald-100/80 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2' }, h('div', { className: 'flex items-center gap-2' }, h(Sparkles, { className: 'w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0' }), h('span', null, getLangText('දෙපාර්ශ්වයටම මෙම දැන්වීම සඳහා Chat සංවාද සිදුකළ හැක.', 'Both parties can engage in chat for this post.', 'இரு தரப்பினரும் இந்த விளம்பரத்திற்கு Chat செய்யலாம்.'))), onOpenChat ? h('button', {
type: 'button',
onClick: handleChatClick,
className: 'px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95'
}, h(MessageCircle, { className: 'w-3.5 h-3.5' }), h('span', null, getLangText('Chat සංවාදය', 'Chat', 'Chat'))) : null), h(PostCard, {
post: post,
lang: activeLang,
language: activeLang,
viewerLocation: activeLocation,
currentUser: currentUser,
isOwner: isPostOwner,
onRequireRegistration: onRequireRegistration,
onAdminModerate: onAdminModerate,
onOfferSupport: (p: HelpPost) => {
onClose();
if (onOfferSupport) onOfferSupport(p);else if (onOpenConfirm) onOpenConfirm(p);else if (onOpenChat) onOpenChat(p);
},
onOpenChat: onOpenChat ? (p: HelpPost) => {
onClose();
onOpenChat(p);
} : undefined,
onOpenConfirm: onOpenConfirm ? (p: HelpPost) => {
onClose();
onOpenConfirm(p);
} : undefined,
onEditPost: onEditPost ? (p: HelpPost) => {
onClose();
onEditPost(p);
} : undefined,
onDeletePost: onDeletePost ? (p: HelpPost) => {
onClose();
onDeletePost(p);
} : undefined,
onBoostPost: onBoostPost ? (p: HelpPost) => {
onClose();
onBoostPost(p);
} : undefined
}), Boolean(canModify && repliesList.length >= 1) ? h('div', { className: 'mt-4 bg-white dark:bg-[#071d12] border-2 border-emerald-500/50 rounded-2xl p-4 space-y-3' }, h('div', { className: 'flex items-center justify-between' }, h('h4', { className: 'text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5' }, h(MessageSquare, { className: 'w-4 h-4 text-emerald-600 dark:text-emerald-400' }), h('span', null, getLangText(ලැබී ඇති පිළිතුරු සහ පණිවිඩ (${repliesList.length}):, Received Replies & Messages (${repliesList.length}):, பெறப்பட்ட பதில்கள் மற்றும் செய்திகள் (${repliesList.length}):))), onOpenChat ? h('button', {
type: 'button',
onClick: handleChatClick,
className: 'text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer'
}, h('span', null, getLangText('සම්පූර්ණ Chat විවෘත කරන්න →', 'Open Full Chat →', 'முழுமையான Chat திறக்க →'))) : null), h('div', { className: 'space-y-2.5' }, repliesList.map((reply, rIdx) => {
const whatsappFormatted = reply.responderPhone ? reply.responderPhone.replace(/^0/, '94').replace(/\D/g, '') : '';
const maskedResponder = maskName(reply.responderName, isDemo);
return h('div', {
key: reply.id ? reply.id : rIdx,
className: 'bg-slate-50 dark:bg-[#030e08] border border-slate-200 dark:border-[#103321] p-3 rounded-xl space-y-1.5'
}, h('div', { className: 'flex items-center justify-between text-xs' }, h('span', { className: 'font-black text-slate-800 dark:text-white' }, 👤 ${maskedResponder ? maskedResponder : getLangText('නොදන්නා පරිශීලකයා', 'Unknown User', 'தெரியாத பயனர்')}), h('span', { className: 'text-[10px] text-slate-400 font-mono' }, reply.createdAt)), h('p', { className: 'text-xs text-slate-700 dark:text-slate-200 font-medium' }, "${reply.message}"), h('div', { className: 'flex items-center justify-between pt-1 text-[11px]' }, h('span', { className: 'text-slate-500 dark:text-slate-400 font-mono' }, !isDemo && (post.isConfirmed ? true : isAdmin) ? reply.responderPhone ? 📞 ${reply.responderPhone} : getLangText('දුරකථන අංකය නොමැත', 'No phone number', 'தொலைபேசி எண் இல்லை') : getLangText('🔒 සහය තහවුරු කළ පසු අංකය දිස්වේ', '🔒 Phone visible after support confirmation', '🔒 உதவி உறுதிப்படுத்திய பின் எண் தெரியும்')), h('div', { className: 'flex items-center gap-1.5' }, onOpenChat ? h('button', {
type: 'button',
onClick: handleChatClick,
className: 'px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold text-[10px] shadow-sm flex items-center gap-1 cursor-pointer'
}, h(MessageCircle, { className: 'w-3 h-3 text-emerald-600' }), h('span', null, 'Chat')) : null, !isDemo && post.isConfirmed && whatsappFormatted ? h('a', {
href: https://wa.me/${whatsappFormatted}?text=${encodeURIComponent(Hello ${reply.responderName}, regarding ${post.postCode} on Sahaya Sewa:)},
target: '_blank',
rel: 'noopener noreferrer',
className: 'px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] shadow-sm flex items-center gap-1'
}, 'WhatsApp') : null)));
}))) : null), / Footer */
h('div', { className: 'p-4 bg-slate-100 dark:bg-[#05170f] border-t border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between shrink-0 flex-wrap gap-2' }, h('span', { className: 'text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1' }, h(CheckCircle2, { className: 'w-4 h-4 text-emerald-500' }), h('span', null, getLangText('සක්‍රීය දැන්වීමකි (Active Ad)', 'Active Ad', 'செயலில் உள்ள விளம்பரம்'))), h('div', { className: 'flex items-center gap-2 flex-wrap justify-end' }, canModify && onEditPost ? h('button', {
type: 'button',
onClick: () => {
onClose();
onEditPost(post);
},
className: 'px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 transition-all'
}, h(Pencil, { className: 'w-3.5 h-3.5' }), h('span', null, getLangText('සංස්කරණය (Edit)', 'Edit', 'திருத்து'))) : null, canModify && onDeletePost ? h('button', {
type: 'button',
onClick: () => {
onClose();
onDeletePost(post);
},
className: 'px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 transition-all'
}, h(Trash2, { className: 'w-3.5 h-3.5' }), h('span', null, getLangText('මකා දමන්න (Delete)', 'Delete', 'நீக்கு'))) : null, !isPostOwner && onOfferSupport ? h('button', {
type: 'button',
onClick: () => {
onClose();
onOfferSupport(post);
},
className: 'px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 transition-all'
}, h(HelpCircle, { className: 'w-4 h-4' }), h('span', null, getLangText('සහාය වන්න', 'Offer Support', 'உதவுக'))) : null, onOpenChat ? h('button', {
type: 'button',
onClick: () => {
onClose();
onOpenChat(post);
},
className: 'px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 transition-all'
}, h(MessageCircle, { className: 'w-4 h-4' }), h('span', null, getLangText('Chat සංවාදය අරඹන්න', 'Start Chat', 'Chat தொடங்கு'))) : null, h('button', {
type: 'button',
onClick: onClose,
className: 'px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer'
}, getLangText('වසා දමන්න', 'Close', 'மூடு'))))));
};

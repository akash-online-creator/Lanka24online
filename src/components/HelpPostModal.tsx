import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, Phone, ShieldCheck, CheckCircle2, MapPin, Sparkles, Image as ImageIcon, Trash2, Type, Send, Upload, User as UserIcon, Link as LinkIcon, BarChart3, Plus, ExternalLink, Copy, Check, Calendar, Clock, Globe, Lock, ArrowRight, ArrowLeft, Eye, EyeOff, Navigation, Tag } from 'lucide-react';
import { HelpPost, Language, LocationOption, TagItem, User } from '../types';
import { translations } from '../data/translations';
import { getStoredTags } from '../utils/tagUtils';
import { SUPPORTED_POST_FONTS, injectPostFonts, getFontFamilyById } from '../utils/postFontManager';
const h = React.createElement;
export interface HelpPostModalProps {
isOpen: boolean;
onClose: () => void;
onSubmitPost?: (post: any) => void;
onSubmit?: (post: any) => void;
currentLocation?: LocationOption;
availableLocations?: LocationOption[];
selectedCategory?: any;
lang?: Language;
language?: Language;
currentUser?: User;
}
const DEFAULT_LOCATION: LocationOption = {
id: 'loc_colombo',
nameSi: 'කොළඹ',
nameEn: 'Colombo',
lat: 6.9271,
lng: 79.8612
};
const DEFAULT_GENERAL_SERVICE_TAGS: TagItem[] = [{
id: 'gs_tag_1',
tagName: 'ජලනල හා විදුලි කාර්මික',
category: 'සාමාන්‍ය සේවා'
}, {
id: 'gs_tag_2',
tagName: 'වාහන අලුත්වැඩියාව',
category: 'සාමාන්‍ය සේවා'
}, {
id: 'gs_tag_3',
tagName: 'වහල හා ගෘහ නඩත්තුව',
category: 'සාමාන්‍ය සේවා'
}, {
id: 'gs_tag_4',
tagName: 'ප්‍රවාහන හා ගමනාගමන',
category: 'සාමාන්‍ය සේවා'
}, {
id: 'gs_tag_5',
tagName: 'අධ්‍යාපන හා උපකාරක',
category: 'සාමාන්‍ය සේවා'
}, {
id: 'gs_tag_6',
tagName: 'සෞඛ්‍ය හා සත්කාර',
category: 'සාමාන්‍ය සේවා'
}, {
id: 'gs_tag_7',
tagName: 'තොරතුරු තාක්ෂණ සහය',
category: 'සාමාන්‍ය සේවා'
}, {
id: 'gs_tag_8',
tagName: 'කෘෂිකාර්මික හා ගෙවතු',
category: 'සාමාන්‍ය සේවා'
}, {
id: 'gs_tag_9',
tagName: 'නීතිමය හා උපදේශන',
category: 'සාමාන්‍ය සේවා'
}, {
id: 'gs_tag_10',
tagName: 'ආහාර හා උත්සව සේවා',
category: 'සාමාන්‍ය සේවා'
}];
function calculateDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
const R = 6371;
const dLat = (lat2 - lat1) * Math.PI / 180;
const dLon = (lon2 - lon1) * Math.PI / 180;
const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
const d = R * c;
return Math.max(0.1, Math.round(d * 10) / 10);
}
async function compressImageFileToDataUrl(file: File, maxWidth = 1280, maxHeight = 720, quality = 0.75): any {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = event => {
const resultStr = event.target?.result;
if (typeof resultStr !== 'string') {
reject(new Error('Failed to read image file'));
return;
}
const img = new window.Image();
img.onload = () => {
try {
let width = img.width;
let height = img.height;
if (width > maxWidth) {
height = Math.round(height * maxWidth / width);
width = maxWidth;
}
if (height > maxHeight) {
width = Math.round(width * maxHeight / height);
height = maxHeight;
}
const canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height;
const ctx = canvas.getContext('2d');
if (!ctx) {
resolve(resultStr);
return;
}
ctx.drawImage(img, 0, 0, width, height);
resolve(canvas.toDataURL('image/jpeg', quality));
} catch (unusedErr) {
resolve(resultStr);
}
};
img.onerror = () => resolve(resultStr);
img.src = resultStr;
};
reader.onerror = err => reject(err);
reader.readAsDataURL(file);
});
}
export const HelpPostModal = ({
isOpen,
onClose,
onSubmitPost,
onSubmit,
currentLocation = DEFAULT_LOCATION,
lang,
language = 'si',
currentUser = null
}) => {
const activeLang: Language = lang ? lang : language ? language : 'si';
const rawTranslations: any = translations;
const t = rawTranslations[activeLang] ? rawTranslations[activeLang] : rawTranslations.si;
const [step, setStep] = useState(1);
const [headline, setHeadline] = useState('');
const [composerTab, setComposerTab] = useState('text');
const [postText, setPostText] = useState('');
const [selectedFont, setSelectedFont] = useState('noto-sans-sinhala');
const [imageBase64, setImageBase64] = useState('');
const [isProcessingImage, setIsProcessingImage] = useState(false);
const imageInputRef = useRef(null);
const [pollQuestion, setPollQuestion] = useState('');
const [pollOptions, setPollOptions] = useState(['', '']);
const [allTags, setAllTags] = useState(() => getStoredTags());
const [selectedTag, setSelectedTag] = useState(null);
const [newTagNameInput, setNewTagNameInput] = useState('');
const [tagSearchQuery, setTagSearchQuery] = useState('');
const [tagError, setTagError] = useState('');
const [externalLink, setExternalLink] = useState('');
const [copiedLink, setCopiedLink] = useState(false);
const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
const [userName, setUserName] = useState('');
const [userPhone, setUserPhone] = useState('');
const [showAuthorName, setShowAuthorName] = useState(true);
const [showDistance, setShowDistance] = useState(true);
const [showComments, setShowComments] = useState(true);
const [autoSavedDate, setAutoSavedDate] = useState('');
const [autoSavedTime, setAutoSavedTime] = useState('');
const [calculatedDistanceKm, setCalculatedDistanceKm] = useState(0.5);
const [generatedPostCode, setGeneratedPostCode] = useState('');
const [visibilityMode, setVisibilityMode] = useState('public');
const [scheduledDate, setScheduledDate] = useState('');
const [scheduledTime, setScheduledTime] = useState('');
const [isSuccess, setIsSuccess] = useState(false);
const wasOpenRef = useRef(false);
useEffect(() => {
  injectPostFonts();
}, []);
useEffect(() => {
  if (isOpen && !wasOpenRef.current) {
    wasOpenRef.current = true;
    setStep(1);
    setHeadline('');
    setComposerTab('text');
    setPostText('');
    setSelectedFont('noto-sans-sinhala');
    setImageBase64('');
    setIsProcessingImage(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setSelectedTag(null);
    setNewTagNameInput('');
    setTagSearchQuery('');
    setTagError('');
    setExternalLink('');
    setCopiedLink(false);
    setIsPreviewExpanded(false);
    const defaultName = currentUser?.name ? currentUser.name : 'ලියාපදිංචි පරිශීලක';
    const defaultPhone = currentUser?.whatsappPhone ? currentUser.whatsappPhone : currentUser?.phone ? currentUser.phone : '';
    setUserName(defaultName);
    setUserPhone(defaultPhone);
    setShowAuthorName(true);
    setShowDistance(true);
    setShowComments(true);
    const now = new Date();
    setAutoSavedDate(now.toLocaleDateString('si-LK'));
    setAutoSavedTime(now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    }));
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    setGeneratedPostCode('#SRV-' + String(randDigits));
    setVisibilityMode('public');
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    setScheduledDate(tomorrow.toISOString().split('T')[0]);
    setScheduledTime('09:00');
    setIsSuccess(false);
    const stored = getStoredTags();
    let customArr: TagItem[] = [];
    try {
      const rawCustom = localStorage.getItem('sahaya_custom_tags');
      if (rawCustom) customArr = JSON.parse(rawCustom);
    } catch (unusedErr0) {}
    setAllTags([...(Array.isArray(customArr) ? customArr : []), ...(Array.isArray(stored) ? stored : [])]);
    const safeLoc = currentLocation ? currentLocation : DEFAULT_LOCATION;
    setCalculatedDistanceKm(0.5);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const dist = calculateDistanceInKm(pos.coords.latitude, pos.coords.longitude, safeLoc.lat, safeLoc.lng);
        setCalculatedDistanceKm(dist);
      }, () => {
        setCalculatedDistanceKm(0.5);
      }, { timeout: 4000 });
    }
  } else if (!isOpen) {
    wasOpenRef.current = false;
  }
}, [isOpen]);
const generalServiceTags = useMemo(() => {
const combined: TagItem[] = [...DEFAULT_GENERAL_SERVICE_TAGS];
const excludedCategories = ['පරිත්‍යාග', 'හදිසි / ආපදා', 'ඉක්මන් සේවා', 'වෙළඳපොල', 'සොයාදෙන්න', 'red_alert', 'quick_services', 'marketplace', 'find_for_me', 'from_me_to_you'];
(allTags ? allTags : []).forEach(tg => {
if (!tg) return;
if (!tg.tagName) return;
const cat = tg.category ? tg.category : '';
if (excludedCategories.includes(cat)) return;
const exists = combined.some(existing => existing.tagName.toLowerCase() === tg.tagName.toLowerCase());
if (!exists) {
combined.push(tg);
}
});
if (!tagSearchQuery.trim()) return combined;
const q = tagSearchQuery.trim().toLowerCase();
return combined.filter(tg => tg.tagName.toLowerCase().includes(q));
}, [allTags, tagSearchQuery]);
if (!isOpen) return null;
const safeLocation = currentLocation ? currentLocation : DEFAULT_LOCATION;
const submitHandler = onSubmit ? onSubmit : onSubmitPost;
const handleImageFileSelect = async (e: any) => {
const file = e.target.files?.[0];
if (!file) return;
setIsProcessingImage(true);
try {
const compressed = await compressImageFileToDataUrl(file, 1280, 720, 0.75);
setImageBase64(compressed);
} catch (err) {
console.error('Image processing error:', err);
} finally {
setIsProcessingImage(false);
if (imageInputRef.current) (imageInputRef.current as any).value = '';
}
};
const handleCreateNewGeneralTag = () => {
const cleanName = newTagNameInput.trim().replace(/^#/, '');
if (!cleanName) return;
const createdTag: TagItem = {
id: 'tag-' + String(Date.now()),
tagName: cleanName,
category: 'සාමාන්‍ය සේවා'
};
try {
const existingRaw = localStorage.getItem('sahaya_custom_tags');
const existingArr = existingRaw ? JSON.parse(existingRaw) : [];
localStorage.setItem('sahaya_custom_tags', JSON.stringify([createdTag, ...(Array.isArray(existingArr) ? existingArr : [])]));
} catch (unusedErr2) {}
setAllTags(prev => [createdTag, ...(prev ? prev : [])]);
setSelectedTag(createdTag);
setNewTagNameInput('');
setTagError('');
};
const handleCopyExternalLink = () => {
if (!externalLink.trim()) return;
try {
navigator.clipboard.writeText(externalLink.trim());
setCopiedLink(true);
setTimeout(() => setCopiedLink(false), 2000);
} catch (unusedErr3) {}
};
const handleOpenExternalLink = () => {
if (!externalLink.trim()) return;
let targetUrl = externalLink.trim();
if (!/^https?:\/\//i.test(targetUrl)) {
targetUrl = 'https://' + targetUrl;
}
window.open(targetUrl, '_blank', 'noopener,noreferrer');
};
const validPollOptions = pollOptions.map(o => o.trim()).filter(o => Boolean(o));
const hasPoll = composerTab === 'poll' ? validPollOptions.length >= 2 : validPollOptions.length >= 2 && Boolean(pollQuestion.trim());
const handleProceedToStep2 = (e: React.FormEvent) => {
e.preventDefault();
if (!headline.trim()) {
alert('කරුණාකර හෙඩ්ලයින් එක (Headline) ඇතුළත් කරන්න.');
return;
}
if (!postText.trim() && !imageBase64 && !(validPollOptions.length >= 2)) {
alert('කරුණාකර දැන්වීමේ විස්තරය (Text), ඡායාරූපයක් (Image) හෝ මත විමසුමක් (Poll) ඇතුළත් කරන්න.');
return;
}
if (!selectedTag) {
setTagError('කරුණාකර සාමාන්‍ය සේවා Tag එකක් තෝරන්න හෝ අලුතෙන් සාදන්න.');
return;
}
setTagError('');
const now = new Date();
setAutoSavedDate(now.toLocaleDateString('si-LK'));
setAutoSavedTime(now.toLocaleTimeString([], {
hour: '2-digit',
minute: '2-digit'
}));
setStep(2);
};
const handleFinalPublish = (e: React.FormEvent) => {
e.preventDefault();
if (visibilityMode === 'schedule' && (scheduledDate ? !scheduledTime : true)) {
alert('කරුණාකර දැන්වීම පළවිය යුතු දිනය සහ වේලාව තෝරන්න.');
return;
}
const resolvedAuthorId = currentUser?.id ? currentUser.id : currentUser?.userId ? currentUser.userId : 'guest_user';
const resolvedAuthorNic = currentUser?.nicNumber ? currentUser.nicNumber : (currentUser as any)?.nic ? (currentUser as any).nic : resolvedAuthorId;
const registeredName = userName.trim() ? userName.trim() : currentUser?.name ? currentUser.name : 'ලියාපදිංචි පරිශීලක';
const isAnon = !showAuthorName;
const publicAuthorName = isAnon ? 'නිර්නාමික පරිශීලක (Anonymous)' : registeredName;
const publicAuthorPhoto = isAnon ? '' : currentUser?.photoUrl ? currentUser.photoUrl : '';
const finalPostType = composerTab === 'poll' && validPollOptions.length >= 2 ? 'poll_post' : imageBase64 ? 'picture_post' : 'text_post';
const pollDataObj = validPollOptions.length >= 2 ? {
question: pollQuestion.trim() ? pollQuestion.trim() : headline.trim(),
options: validPollOptions.map((optText, idx) => ({
id: 'opt-' + String(idx + 1),
text: optText,
votes: 0,
votedBy: []
})),
totalVotes: 0
} : undefined;
const summaryText = postText.trim() ? postText.trim() : pollDataObj ? pollDataObj.question : headline.trim();
const scheduledIso = visibilityMode === 'schedule' && scheduledDate && scheduledTime ? new Date(String(scheduledDate) + 'T' + String(scheduledTime)).toISOString() : undefined;
const postPayload: any = {
postCode: generatedPostCode,
userId: resolvedAuthorId,
userName: publicAuthorName,
userPhotoUrl: publicAuthorPhoto,
userPhone: userPhone.trim() ? userPhone.trim() : currentUser?.whatsappPhone ? currentUser.whatsappPhone : currentUser?.phone ? currentUser.phone : '',
category: 'normal_services',
serviceType: 'normal_services',
roleType: 'need_help',
status: visibilityMode === 'schedule' ? 'scheduled' : 'active',
isResolved: false,
postType: finalPostType,
composerType: composerTab,
aspectRatio: '16:9',
headline: headline.trim(),
title: headline.trim(),
selectedFont: selectedFont,
whatHappened: summaryText,
whatIsNeeded: headline.trim(),
content: postText.trim(),
imageUrl: imageBase64 ? imageBase64 : undefined,
mediaType: imageBase64 ? 'photo' : undefined,
pollData: pollDataObj,
externalLink: externalLink.trim() ? externalLink.trim() : undefined,
conditions: 'විශේෂ කොන්දේසි නොමැත.',
transport: 'අදාළ නොවේ',
payment: 'සාකච්ඡා කළ හැක',
locationName: String(safeLocation.nameSi) + ' (' + String(safeLocation.nameEn) + ')',
autoSavedDate: autoSavedDate,
autoSavedTime: autoSavedTime,
distanceKm: calculatedDistanceKm,
showDistance: showDistance,
showAuthorName: showAuthorName,
isAnonymous: isAnon,
visibilityMode: visibilityMode,
isPrivate: visibilityMode === 'private',
scheduledPublishAt: scheduledIso,
scheduledDate: visibilityMode === 'schedule' ? scheduledDate : undefined,
scheduledTime: visibilityMode === 'schedule' ? scheduledTime : undefined,
lat: safeLocation.lat,
lng: safeLocation.lng,
latitude: safeLocation.lat,
longitude: safeLocation.lng,
verifiedOtp: true,
showComments: showComments,
tagName: selectedTag?.tagName ? selectedTag.tagName : 'සාමාන්‍ය සේවා',
tagCategory: 'සාමාන්‍ය සේවා',
tagId: selectedTag?.id,
actualAuthorId: resolvedAuthorId,
actualAuthorName: registeredName,
actualAuthorNic: resolvedAuthorNic,
actualAuthorPhone: userPhone.trim() ? userPhone.trim() : 'N/A',
actualDistanceKm: calculatedDistanceKm,
likeCount: 0,
unlikeCount: 0,
unlikesCount: 0,
savesCount: 0,
commentsCount: 0,
commentsList: []
};
if (submitHandler) {
submitHandler(postPayload);
}
setIsSuccess(true);
setTimeout(() => {
setIsSuccess(false);
onClose();
}, 1200);
};
const renderLive16x9Preview = (isFullModal = false) => {
const previewHeadline = headline.trim() ? headline.trim() : 'ඔබගේ හෙඩ්ලයින් එක මෙහි කොළ සහ සුදු මිශ්‍ර පසුබිමක දිස්වේ...';
const previewText = postText.trim();
const isLongPreviewText = Boolean(Math.max(previewText.length, 150) === previewText.length && previewText.length !== 150);
const shouldCapPreview16x9 = Boolean(!isFullModal && (isLongPreviewText ? true : Boolean(imageBase64)));
const displayedText = !isFullModal && isLongPreviewText ? previewText.slice(0, 150) + '...' : previewText;
return h('div', {
onClick: () => {
if (!isFullModal) setIsPreviewExpanded(true);
},
className: (isFullModal ? 'w-full' : shouldCapPreview16x9 ? 'w-full aspect-video max-h-[250px] cursor-pointer justify-between' : 'w-full h-auto cursor-pointer') + ' rounded-2xl bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/80 dark:from-[#061a10] dark:via-[#082215] dark:to-[#05150d] border-2 border-emerald-400 dark:border-emerald-700 shadow-md overflow-hidden flex flex-col p-3.5 sm:p-4 relative group transition-all hover:shadow-xl'
}, h('div', { className: 'flex items-center justify-between gap-2 shrink-0 mb-1.5' }, h('div', { className: 'flex items-center gap-1.5 flex-wrap' }, h('span', { className: 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-2xs' }, selectedTag?.tagName ? '#' + String(selectedTag.tagName) : '#සාමාන්‍ය-සේවා'), h('span', { className: 'font-mono text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800' }, generatedPostCode ? generatedPostCode : '#SRV-0000'))), h('div', { className: 'w-full px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-200/90 via-white to-emerald-100/90 dark:from-emerald-800/80 dark:via-[#0b291a] dark:to-emerald-900/80 border-2 border-emerald-500/70 shadow-xs shrink-0 mb-2' }, h('h4', {
className: 'font-black text-slate-950 dark:text-white leading-snug ' + (isFullModal ? 'text-base sm:text-lg' : 'text-xs sm:text-sm line-clamp-1'),
style: { fontFamily: getFontFamilyById(selectedFont) }
}, previewHeadline)), h('div', {
className: 'flex-1 min-h-0 ' + (isFullModal ? 'space-y-3 overflow-y-auto' : 'overflow-hidden flex gap-3 items-center')
}, imageBase64 ? h('div', { className: isFullModal ? 'w-full aspect-video rounded-xl overflow-hidden border border-emerald-300 dark:border-emerald-800 bg-black' : previewText ? 'w-2/5 h-full rounded-xl overflow-hidden border border-emerald-300 dark:border-emerald-800 shrink-0 bg-black' : 'w-full h-full rounded-xl overflow-hidden border border-emerald-300 dark:border-emerald-800 bg-black' }, h('img', {
src: imageBase64,
alt: 'Post preview',
className: isFullModal ? 'w-full h-full object-contain' : 'w-full h-full object-cover'
})) : null, h('div', { className: 'flex-1 min-w-0 space-y-1.5' }, displayedText ? h('p', {
className: (isFullModal ? 'text-sm whitespace-pre-wrap' : 'text-xs line-clamp-3') + ' font-bold text-slate-800 dark:text-zinc-100 leading-relaxed',
style: { fontFamily: getFontFamilyById(selectedFont) }
}, displayedText) : null, validPollOptions.length >= 2 ? h('div', { className: 'p-2 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 space-y-1' }, h('div', { className: 'text-[11px] font-black text-emerald-900 dark:text-emerald-200' }, '📊 ' + String(pollQuestion.trim() ? pollQuestion.trim() : headline.trim())), h('div', { className: 'grid grid-cols-1 gap-1' }, (isFullModal ? validPollOptions : validPollOptions.slice(0, 2)).map((opt, i) => h('div', {
key: i,
className: 'px-2.5 py-1 rounded-lg bg-white dark:bg-[#06160d] border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-slate-800 dark:text-zinc-200 flex items-center justify-between'
}, h('span', { className: 'truncate' }, opt), h('span', { className: 'text-[10px] text-emerald-600 font-mono' }, '0%'))))) : null)), h('div', { className: 'pt-1.5 mt-1.5 border-t border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-600 dark:text-zinc-400 shrink-0' }, h('span', { className: 'truncate' }, String(showAuthorName ? userName : 'නිර්නාමික (Anonymous)') + ' • ' + String(safeLocation.nameSi) + (showDistance ? ' (' + String(calculatedDistanceKm) + ' km)' : '')), externalLink.trim() ? h('div', {
className: 'flex items-center gap-1 shrink-0',
onClick: (e: any) => e.stopPropagation()
}, h('button', {
type: 'button',
onClick: handleOpenExternalLink,
className: 'px-2 py-0.5 rounded-md bg-sky-600 text-white font-bold flex items-center gap-1 cursor-pointer'
}, h(ExternalLink, { className: 'w-2.5 h-2.5' }), h('span', null, 'Open')), h('button', {
type: 'button',
onClick: handleCopyExternalLink,
className: 'px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-zinc-200 font-bold flex items-center gap-1 cursor-pointer'
}, h(copiedLink ? Check : Copy, { className: 'w-2.5 h-2.5' }), h('span', null, copiedLink ? 'Copied' : 'Copy'))) : null));
};

  return h('div', { className: 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn' }, h('div', { className: 'w-full max-w-2xl bg-white dark:bg-[#07190f] border-2 border-emerald-500/80 rounded-3xl shadow-2xl overflow-hidden relative max-h-[94vh] flex flex-col text-slate-800 dark:text-zinc-100' }, h('div', { className: 'bg-gradient-to-r from-emerald-800 via-teal-900 to-[#04160d] px-5 py-3.5 text-white flex items-center justify-between border-b border-emerald-700/60 shrink-0' }, h('div', { className: 'flex items-center gap-3' }, h('div', { className: 'w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shrink-0' }, h(Sparkles, { className: 'w-5 h-5' })), h('div', null, h('h3', { className: 'text-base sm:text-lg font-black leading-tight flex items-center gap-2' }, h('span', null, t?.createNewPostTitle ? t.createNewPostTitle : 'සාමාන්‍ය සේවා දැන්වීම් පුවරුව'), h('span', { className: 'text-[10px] font-mono bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/40' }, generatedPostCode)), h('p', { className: 'text-[11px] text-emerald-200/90 flex items-center gap-1 mt-0.5' }, h(MapPin, { className: 'w-3 h-3 text-emerald-300' }), h('span', null, `ස්ථානය: ${safeLocation.nameSi} (${safeLocation.nameEn}) • පියවර ${step} / 2`)))), h('button', {
    type: 'button',
    onClick: onClose,
    className: 'w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-black text-sm transition-all cursor-pointer active:scale-95',
    title: 'වසන්න'
  }, '✕')), h('div', { className: 'px-5 py-2 bg-emerald-50/90 dark:bg-[#05140b] border-b border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between text-xs font-black shrink-0' }, h('button', {
    type: 'button',
    onClick: () => setStep(1),
    className: `flex items-center gap-1.5 cursor-pointer ${step === 1 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`
  }, h('span', {
    className: `w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-emerald-600 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700'}`
  }, '1'), h('span', null, 'දැන්වීම සැකසීම සහ 16:9 පෙරදසුන')), h('span', { className: 'text-slate-400' }, '➔'), h('button', {
    type: 'button',
    onClick: () => {
      if (headline.trim() && selectedTag) setStep(2);
    },
    className: `flex items-center gap-1.5 cursor-pointer ${step === 2 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`
  }, h('span', {
    className: `w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`
  }, '2'), h('span', null, 'පෞද්ගලිකත්වය සහ පළකිරීම (Publish)'))), h('div', { className: 'p-4 sm:p-5 overflow-y-auto flex-1 space-y-4' }, isSuccess ? h('div', { className: 'py-12 text-center flex flex-col items-center justify-center space-y-3 animate-fadeIn' }, h('div', { className: 'w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 animate-bounce' }, h(CheckCircle2, { className: 'w-10 h-10' })), h('h4', { className: 'text-xl font-bold text-slate-900 dark:text-white' }, visibilityMode === 'schedule' ? 'දැන්වීම නියමිත වේලාවට පළවීම සඳහා සුරකින ලදී!' : 'දැන්වීම සාර්ථකව පළකරන ලදී!'), h('p', { className: 'text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md' }, `දැන්වීම් අංකය: ${generatedPostCode} • සාමාන්‍ය සේවා පුවරුවට එක් කරන ලදී.`)) : step === 1 ? h('form', {
    id: 'step1-general-form',
    onSubmit: handleProceedToStep2,
    className: 'space-y-4'
  }, h('div', { className: 'p-3.5 rounded-2xl bg-gradient-to-r from-emerald-200/85 via-white to-emerald-100/90 dark:from-emerald-900/70 dark:via-[#071f13] dark:to-emerald-800/70 border-2 border-emerald-500 shadow-sm space-y-1.5' }, h('label', { className: 'text-xs font-black text-emerald-950 dark:text-emerald-200 flex items-center justify-between' }, h('span', null, '1. ප්‍රධාන මාතෘකාව (Head Line) *'), h('span', { className: 'text-[10px] bg-white/90 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400' }, 'කොළ සහ සුදු මිශ්‍ර පසුබිම')), h('input', {
    type: 'text',
    required: true,
    value: headline,
    onChange: (e: any) => setHeadline(e.target.value),
    placeholder: 'උදා: කඩවත අවට පළපුරුදු ජලනල කාර්මිකයෙකුගේ සහය අවශ්‍යයි...',
    className: 'w-full px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-50 via-white to-emerald-50 dark:from-[#05180e] dark:via-[#082416] dark:to-[#05180e] border-2 border-emerald-400 dark:border-emerald-600 text-slate-950 dark:text-white text-xs sm:text-sm font-black focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-slate-400',
    style: { fontFamily: getFontFamilyById(selectedFont) }
  })), h('div', { className: 'rounded-2xl bg-slate-50 dark:bg-[#071c11] border-2 border-slate-200 dark:border-emerald-900/70 overflow-hidden shadow-xs' }, h('div', { className: 'p-2 bg-slate-100 dark:bg-[#05140c] border-b border-slate-200 dark:border-emerald-900/60 flex items-center justify-between gap-2 flex-wrap' }, h('span', { className: 'text-xs font-black text-slate-800 dark:text-emerald-300 px-1' }, '2. දැන්වීම් කොටුව (Facebook Style Post Box):'), h('div', { className: 'flex items-center gap-1.5' }, h('button', {
    type: 'button',
    onClick: () => setComposerTab('text'),
    className: `px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${composerTab === 'text' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-[#082014] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-emerald-900'}`
  }, h(Type, { className: 'w-3.5 h-3.5 text-emerald-500' }), h('span', null, 'TEXT')), h('button', {
    type: 'button',
    onClick: () => setComposerTab('image'),
    className: `px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${composerTab === 'image' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-[#082014] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-emerald-900'}`
  }, h(ImageIcon, { className: 'w-3.5 h-3.5 text-sky-500' }), h('span', null, 'IMAGE')), h('button', {
    type: 'button',
    onClick: () => setComposerTab('poll'),
    className: `px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${composerTab === 'poll' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-[#082014] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-emerald-900'}`
  }, h(BarChart3, { className: 'w-3.5 h-3.5 text-amber-500' }), h('span', null, 'POLL') /* POLL_END */ ))), h('div', { className: 'p-3.5 space-y-3' }, h('div', { className: 'space-y-2' }, h('textarea', {
    rows: composerTab === 'text' ? 4 : 2,
    value: postText,
    onChange: (e: any) => setPostText(e.target.value),
    placeholder: 'ඔබගේ සේවා අවශ්‍යතාවය හෝ දැන්වීමේ සම්පූර්ණ විස්තරය මෙහි සටහන් කරන්න...',
    className: 'w-full p-3 rounded-xl bg-white dark:bg-[#06160d] border border-slate-300 dark:border-emerald-800/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed',
    style: { fontFamily: getFontFamilyById(selectedFont) }
  }), composerTab === 'text' ? h('div', { className: 'flex items-center gap-1.5 flex-wrap' }, h('span', { className: 'text-[10px] font-bold text-slate-500' }, 'අකුරු විලාසය:'), SUPPORTED_POST_FONTS.map(f => h('button', {
    key: f.id,
    type: 'button',
    onClick: () => setSelectedFont(f.id),
    className: `px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${selectedFont === f.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-slate-700'}`
  }, f.name))) : null), (composerTab === 'image' ? true : Boolean(imageBase64)) ? h('div', { className: 'p-3 rounded-xl bg-white dark:bg-[#06160d] border border-emerald-200 dark:border-emerald-800/80 space-y-2' }, h('input', {
    ref: imageInputRef,
    type: 'file',
    accept: 'image/*',
    className: 'hidden',
    onChange: handleImageFileSelect
  }), imageBase64 ? h('div', { className: 'relative w-full aspect-video rounded-xl overflow-hidden border border-emerald-400 bg-black' }, h('img', {
    src: imageBase64,
    alt: 'Selected',
    className: 'w-full h-full object-cover'
  }), h('div', { className: 'absolute top-2 right-2 flex items-center gap-1.5' }, h('button', {
    type: 'button',
    onClick: () => (imageInputRef.current as any)?.click(),
    className: 'px-2.5 py-1 rounded-lg bg-white/90 text-slate-900 font-bold text-xs shadow-md cursor-pointer'
  }, 'වෙනස් කරන්න'), h('button', {
    type: 'button',
    onClick: () => setImageBase64(''),
    className: 'p-1.5 rounded-lg bg-rose-600 text-white shadow-md cursor-pointer'
  }, h(Trash2, { className: 'w-3.5 h-3.5' })))) : h('button', {
    type: 'button',
    onClick: () => (imageInputRef.current as any)?.click(),
    className: 'w-full py-6 rounded-xl border-2 border-dashed border-emerald-400 dark:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all'
  }, h(Upload, { className: 'w-6 h-6 text-emerald-600' }), h('span', { className: 'text-xs font-black text-slate-800 dark:text-white' }, isProcessingImage ? 'ඡායාරූපය සකසමින් පවතී...' : '16:9 ඡායාරූපයක් එක් කරන්න (Upload Image)'), h('span', { className: 'text-[10px] text-slate-500' }, 'ගැලරියෙන් හෝ කැමරාවෙන් ඡායාරූපයක් තෝරන්න'))) : null, composerTab === 'poll' ? h('div', { className: 'p-3 rounded-xl bg-white dark:bg-[#06160d] border border-amber-300 dark:border-amber-800/80 space-y-2.5' }, h('div', { className: 'flex items-center justify-between' }, h('span', { className: 'text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5' }, h(BarChart3, { className: 'w-4 h-4' }), h('span', null, 'මත විමසුම (Facebook Poll):'))), h('input', {
    type: 'text',
    value: pollQuestion,
    onChange: (e: any) => setPollQuestion(e.target.value),
    placeholder: 'මත විමසුම් ප්‍රශ්නය (Poll Question)...',
    className: 'w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081f13] border border-slate-300 dark:border-emerald-800 text-xs font-bold outline-none'
  }), h('div', { className: 'space-y-1.5' }, pollOptions.map((opt, idx) => h('div', {
    key: idx,
    className: 'flex items-center gap-1.5'
  }, h('input', {
    type: 'text',
    value: opt,
    onChange: (e: any) => {
      const next = [...pollOptions];
      next[idx] = e.target.value;
      setPollOptions(next);
    },
    placeholder: `විකල්පය ${idx + 1} (Option ${idx + 1})`,
    className: 'flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#081f13] border border-slate-300 dark:border-emerald-800 text-xs font-medium outline-none'
  }), pollOptions.length > 2 ? h('button', {
    type: 'button',
    onClick: () => setPollOptions(pollOptions.filter((_, i) => i !== idx)),
    className: 'p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer'
  }, h(Trash2, { className: 'w-3.5 h-3.5' })) : null))), !(pollOptions.length >= 5) ? h('button', {
    type: 'button',
    onClick: () => setPollOptions([...pollOptions, '']),
    className: 'px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold flex items-center gap-1 cursor-pointer'
  }, h(Plus, { className: 'w-3.5 h-3.5' }), h('span', null, 'තවත් විකල්පයක් එක් කරන්න (Add Option)')) : null) : null)), h('div', { className: 'p-3.5 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/70 space-y-2.5' }, h('div', { className: 'flex items-center justify-between flex-wrap gap-2' }, h('label', { className: 'text-xs font-black text-slate-800 dark:text-emerald-300 flex items-center gap-1.5' }, h(Tag, { className: 'w-3.5 h-3.5 text-emerald-600' }), h('span', null, '3. සාමාන්‍ය සේවා Tag එක තෝරන්න හෝ අලුතෙන් සාදන්න *:')), selectedTag ? h('span', { className: 'px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white' }, `තෝරාගත් Tag: #${selectedTag.tagName}`) : null), h('div', { className: 'flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1' }, generalServiceTags.map(tg => {
    const isSel = selectedTag?.tagName === tg.tagName;
    return h('button', {
      key: tg.id,
      type: 'button',
      onClick: () => {
        setSelectedTag(tg);
        setTagError('');
      },
      className: `px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${isSel ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white dark:bg-[#06160d] text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-emerald-800 hover:border-emerald-500'}`
    }, `#${tg.tagName}`);
  })), h('div', { className: 'flex items-center gap-2 pt-1' }, h('input', {
    type: 'text',
    value: newTagNameInput,
    onChange: (e: any) => setNewTagNameInput(e.target.value),
    placeholder: 'අලුත් Tag එකක් ලියන්න (උදා: ජලනල_සේවා)...',
    className: 'flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#06160d] border border-slate-300 dark:border-emerald-800 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500'
  }), h('button', {
    type: 'button',
    onClick: handleCreateNewGeneralTag,
    className: 'px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 cursor-pointer shrink-0 shadow-xs'
  }, h(Plus, { className: 'w-3.5 h-3.5' }), h('span', null, 'අලුත් Tag සාදන්න'))), tagError ? h('p', { className: 'text-xs font-bold text-rose-600 dark:text-rose-400' }, tagError) : null), h('div', { className: 'p-3.5 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-sky-300/80 dark:border-sky-900/60 space-y-2' }, h('label', { className: 'text-xs font-black text-sky-800 dark:text-sky-300 flex items-center gap-1.5' }, h(LinkIcon, { className: 'w-3.5 h-3.5 text-sky-600' }), h('span', null, '4. වීඩියෝ හා වෙබ් ලින්ක් (Video / Web Link Box):')), h('div', { className: 'flex items-center gap-2 flex-wrap sm:flex-nowrap' }, h('input', {
    type: 'text',
    value: externalLink,
    onChange: (e: any) => setExternalLink(e.target.value),
    placeholder: 'https://youtube.com/... හෝ https://facebook.com/... හෝ වෙබ් ලින්ක් එකක්',
    className: 'flex-1 min-w-[180px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#06160d] border border-slate-300 dark:border-sky-800 text-xs font-medium outline-none focus:ring-2 focus:ring-sky-500'
  }), h('div', { className: 'flex items-center gap-1.5 shrink-0' }, h('button', {
    type: 'button',
    disabled: !externalLink.trim(),
    onClick: handleOpenExternalLink,
    className: 'px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1 cursor-pointer'
  }, h(ExternalLink, { className: 'w-3.5 h-3.5' }), h('span', null, 'Open')), h('button', {
    type: 'button',
    disabled: !externalLink.trim(),
    onClick: handleCopyExternalLink,
    className: 'px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 disabled:opacity-40 text-slate-800 dark:text-zinc-200 text-xs font-black flex items-center gap-1 cursor-pointer'
  }, h(copiedLink ? Check : Copy, { className: 'w-3.5 h-3.5 text-emerald-600' }), h('span', null, copiedLink ? 'Copied!' : 'Copy'))))), h('div', { className: 'space-y-1.5 pt-1' }, h('div', { className: 'flex items-center justify-between text-xs font-black' }, h('span', { className: 'text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5' }, h(Eye, { className: 'w-4 h-4 text-emerald-600' }), h('span', null, '5. සජීවී දැන්වීම් පෙරදසුන (සම්පූර්ණ විස්තර බැලීමට දැන්වීම මත ක්ලික් කරන්න):'))), renderLive16x9Preview(false)), h('div', { className: 'pt-2 flex items-center justify-end gap-2' }, h('button', {
    type: 'button',
    onClick: onClose,
    className: 'px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-zinc-300 text-xs font-bold cursor-pointer'
  }, 'අවලංගු කරන්න'), h('button', {
    type: 'submit',
    className: 'px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-all'
  }, h('span', null, 'ඊළඟ පිටුවට (Next) ➔')))) : h('form', {
    onSubmit: handleFinalPublish,
    className: 'space-y-4 animate-fadeIn'
  }, h('div', { className: 'p-3.5 rounded-2xl bg-gradient-to-r from-emerald-100 via-white to-teal-100 dark:from-emerald-950/80 dark:via-[#071d12] dark:to-teal-950/80 border-2 border-emerald-500/70 flex items-center justify-between gap-3' }, h('div', null, h('span', { className: 'text-[11px] font-bold text-slate-600 dark:text-zinc-400 block' }, 'දැන්වීම් අංකය (Post Number / ID):'), h('span', { className: 'text-lg font-mono font-black text-emerald-800 dark:text-emerald-300' }, generatedPostCode)), h('div', { className: 'text-right' }, h('span', { className: 'text-[11px] font-bold text-slate-600 dark:text-zinc-400 block' }, 'තෝරාගත් Tag එක:'), h('span', { className: 'px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white' }, selectedTag?.tagName ? `#${selectedTag.tagName}` : '#සාමාන්‍ය_සේවා'))), h('div', { className: 'p-4 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/70 space-y-3' }, h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' }, h('div', { className: 'space-y-1' }, h('label', { className: 'text-xs font-black text-slate-800 dark:text-emerald-300 flex items-center gap-1.5' }, h(UserIcon, { className: 'w-3.5 h-3.5 text-emerald-600' }), h('span', null, 'දැන්වීම පළකරන්නාගේ ලියාපදිංචි නම:')), h('input', {
    type: 'text',
    required: true,
    value: userName,
    onChange: (e: any) => setUserName(e.target.value),
    className: 'w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#06160d] border border-slate-300 dark:border-emerald-800 text-xs sm:text-sm font-black outline-none'
  })), h('div', { className: 'space-y-1' }, h('label', { className: 'text-xs font-black text-slate-800 dark:text-emerald-300 flex items-center gap-1.5' }, h(Phone, { className: 'w-3.5 h-3.5 text-emerald-600' }), h('span', null, 'දුරකථන / WhatsApp අංකය:')), h('input', {
    type: 'tel',
    value: userPhone,
    onChange: (e: any) => setUserPhone(e.target.value),
    placeholder: '0771234567',
    className: 'w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#06160d] border border-slate-300 dark:border-emerald-800 text-xs sm:text-sm font-mono font-bold outline-none'
  }))), h('label', { className: 'flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-[#06160d] border border-emerald-300 dark:border-emerald-800 cursor-pointer' }, h('input', {
    type: 'checkbox',
    checked: showAuthorName,
    onChange: (e: any) => setShowAuthorName(e.target.checked),
    className: 'mt-0.5 w-4 h-4 text-emerald-600 rounded-md'
  }), h('div', { className: 'min-w-0' }, h('span', { className: 'text-xs font-black text-slate-900 dark:text-white block' }, 'මගේ ලියාපදිංචි නම පරිශීලකයන්ට පෙන්වන්න (Show my name to users)'), h('span', { className: 'text-[11px] text-slate-500 dark:text-zinc-400' }, showAuthorName ? `ඔබගේ නම (${userName}) සියලුම පරිශීලකයන්ට දිස්වේ.` : 'Untick කර ඇත: සාමාන්‍ය පරිශීලකයන්ට ඔබගේ නම නොපෙන්වන අතර, Admin වරයාට පමණක් නම පෙන්වයි.')))), h('div', { className: 'p-4 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/70 space-y-2' }, h('div', { className: 'flex items-center justify-between' }, h('span', { className: 'text-xs font-black text-slate-800 dark:text-emerald-300 flex items-center gap-1.5' }, h(Clock, { className: 'w-4 h-4 text-emerald-600' }), h('span', null, 'ස්වයංක්‍රීයව සුරකින ලද දිනය, වේලාව සහ ස්ථානය (Auto-Saved):')), h('span', { className: 'text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full' }, 'Auto-Saved ✓')), h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs font-bold' }, h('div', { className: 'p-2.5 rounded-xl bg-white dark:bg-[#06160d] border border-slate-200 dark:border-emerald-900/60 flex items-center gap-2' }, h(Calendar, { className: 'w-4 h-4 text-emerald-600 shrink-0' }), h('span', null, `දිනය: ${autoSavedDate}`)), h('div', { className: 'p-2.5 rounded-xl bg-white dark:bg-[#06160d] border border-slate-200 dark:border-emerald-900/60 flex items-center gap-2' }, h(Clock, { className: 'w-4 h-4 text-emerald-600 shrink-0' }), h('span', null, `වේලාව: ${autoSavedTime}`)), h('div', { className: 'p-2.5 rounded-xl bg-white dark:bg-[#06160d] border border-slate-200 dark:border-emerald-900/60 flex items-center gap-2' }, h(MapPin, { className: 'w-4 h-4 text-emerald-600 shrink-0' }), h('span', { className: 'truncate' }, `${safeLocation.nameSi}`)))), h('div', { className: 'p-4 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/70 space-y-2.5' }, h('div', { className: 'flex items-center justify-between' }, h('span', { className: 'text-xs font-black text-slate-800 dark:text-emerald-300 flex items-center gap-1.5' }, h(Navigation, { className: 'w-4 h-4 text-emerald-600' }), h('span', null, 'ගණනය කරන ලද දුර (Calculated Distance):')), h('span', { className: 'px-3 py-1 rounded-xl font-mono text-xs font-black bg-emerald-600 text-white' }, `${calculatedDistanceKm} km`)), h('label', { className: 'flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-[#06160d] border border-emerald-300 dark:border-emerald-800 cursor-pointer' }, h('input', {
    type: 'checkbox',
    checked: showDistance,
    onChange: (e: any) => setShowDistance(e.target.checked),
    className: 'mt-0.5 w-4 h-4 text-emerald-600 rounded-md'
  }), h('div', { className: 'min-w-0' }, h('span', { className: 'text-xs font-black text-slate-900 dark:text-white block' }, 'පරිශීලකයාට ඇති දුර දැන්වීමේ පෙන්වන්න (Show distance to users)'), h('span', { className: 'text-[11px] text-slate-500 dark:text-zinc-400' }, showDistance ? `දුර (${calculatedDistanceKm} km) සියලුම පරිශීලකයන්ට දිස්වේ.` : 'Untick කර ඇත: සාමාන්‍ය පරිශීලකයන්ට දුර නොපෙන්වන අතර, Admin වරයාට පමණක් දුර පෙන්වයි.')))), h('div', { className: 'p-4 rounded-2xl bg-slate-50 dark:bg-[#071c11] border border-slate-200 dark:border-emerald-900/70 space-y-3' }, h('label', { className: 'text-xs font-black text-slate-800 dark:text-emerald-300 block' }, 'දැන්වීම පළකරන ආකාරය තෝරන්න (Public / Private / Schedule):'), h('div', { className: 'grid grid-cols-3 gap-2' }, h('button', {
    type: 'button',
    onClick: () => setVisibilityMode('public'),
    className: `p-3 rounded-xl border text-center font-black text-xs flex flex-col items-center gap-1 cursor-pointer transition-all ${visibilityMode === 'public' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white dark:bg-[#06160d] text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-emerald-900'}`
  }, h(Globe, { className: 'w-4 h-4' }), h('span', null, 'Public'), h('span', { className: 'text-[9px] font-normal opacity-80' }, 'සැමට පෙනේ')), h('button', {
    type: 'button',
    onClick: () => setVisibilityMode('private'),
    className: `p-3 rounded-xl border text-center font-black text-xs flex flex-col items-center gap-1 cursor-pointer transition-all ${visibilityMode === 'private' ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white dark:bg-[#06160d] text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-emerald-900'}`
  }, h(Lock, { className: 'w-4 h-4' }), h('span', null, 'Private'), h('span', { className: 'text-[9px] font-normal opacity-80' }, 'මට හා Admin ට')), h('button', {
    type: 'button',
    onClick: () => setVisibilityMode('schedule'),
    className: `p-3 rounded-xl border text-center font-black text-xs flex flex-col items-center gap-1 cursor-pointer transition-all ${visibilityMode === 'schedule' ? 'bg-sky-600 text-white border-sky-600 shadow-md' : 'bg-white dark:bg-[#06160d] text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-emerald-900'}`
  }, h(Calendar, { className: 'w-4 h-4' }), h('span', null, 'Schedule'), h('span', { className: 'text-[9px] font-normal opacity-80' }, 'කාලසටහන්ගත'))), visibilityMode === 'schedule' ? h('div', { className: 'p-3 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-300 dark:border-sky-800 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn' }, h('div', { className: 'space-y-1' }, h('label', { className: 'text-[11px] font-black text-sky-900 dark:text-sky-200' }, 'පළවිය යුතු දිනය (Schedule Date):'), h('input', {
    type: 'date',
    required: true,
    value: scheduledDate,
    onChange: (e: any) => setScheduledDate(e.target.value),
    className: 'w-full px-3 py-2 rounded-xl bg-white dark:bg-[#06160d] border border-sky-300 dark:border-sky-800 text-xs font-bold'
  })), h('div', { className: 'space-y-1' }, h('label', { className: 'text-[11px] font-black text-sky-900 dark:text-sky-200' }, 'පළවිය යුතු වේලාව (Schedule Time):'), h('input', {
    type: 'time',
    required: true,
    value: scheduledTime,
    onChange: (e: any) => setScheduledTime(e.target.value),
    className: 'w-full px-3 py-2 rounded-xl bg-white dark:bg-[#06160d] border border-sky-300 dark:border-sky-800 text-xs font-bold'
  }))) : null), h('div', { className: 'pt-2 flex items-center justify-between gap-3' }, h('button', {
    type: 'button',
    onClick: () => setStep(1),
    className: 'px-4 py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-zinc-200 text-xs font-black flex items-center gap-1.5 cursor-pointer'
  }, h(ArrowLeft, { className: 'w-4 h-4' }), h('span', null, 'ආපසු (Back)')), h('button', {
    type: 'submit',
    className: 'flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-98 transition-all'
  }, h(Send, { className: 'w-4 h-4' }), h('span', null, visibilityMode === 'schedule' ? 'දැන්වීම Schedule කර පළ කරන්න' : 'දැන්වීම පළ කරන්න (Publish Post)'))))), isPreviewExpanded ? h('div', {
    className: 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn',
    onClick: () => setIsPreviewExpanded(false)
  }, h('div', {
    className: 'w-full max-w-2xl bg-white dark:bg-[#07190f] border-2 border-emerald-500 rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto',
    onClick: (e: any) => e.stopPropagation()
  }, h('div', { className: 'flex items-center justify-between border-b border-emerald-200 pb-3' }, h('h4', { className: 'text-sm sm:text-base font-black text-emerald-900 dark:text-emerald-200' }, 'සම්පූර්ණ දැන්වීම සහ විශාල කළ ඡායාරූපය (Full Post View)'), h('button', {
    type: 'button',
    onClick: () => setIsPreviewExpanded(false),
    className: 'px-3 py-1 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer'
  }, 'වසන්න ✕')), renderLive16x9Preview(true))) : null));
};

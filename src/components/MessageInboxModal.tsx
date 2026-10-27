import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
MessageSquare,
Phone,
Send,
Clock,
Search,
Inbox,
ArrowLeft,
CheckCircle,
Lock,
User as UserIcon,
ShieldAlert,
Sparkles,
Globe,
Mic,
Check,
UserPlus,
X
} from 'lucide-react';
import { HelpPost, PostReply, User as UserType, Language, ChatMessage, TelegramMediaRecord } from '../types';
import { checkIsPostOwner } from '../utils/postOwnerHelper';
import { translations } from '../data/translations';
import { subscribeToChatMessages, sendChatMessageToFirestore } from '../lib/firebase';
import { parseTimeToMs, getAccurateElapsedTime, formatMessageClockTime } from '../utils/dateUtils';
import {
inspectAndSanitizeMessage,
getUserStrikes,
recordPolicyViolation,
isUserPolicyBlocked
} from '../utils/policyGuard';
import {
translateChatMessage,
getChatTranslations,
detectLanguageOfText,
getLanguageDisplayInfo
} from '../utils/chatTranslator';
import { translateWithGoogle } from '../utils/googleTranslator';
import { PolicyViolationModal } from './PolicyViolationModal';
import { AudioVoiceRecorder, AudioVoicePlayer } from './AudioVoiceNote';
const h = React.createElement;
const CHAT_LANG_KEY_GLOBAL = 'sahaya_preferred_chat_lang';
const CHAT_LANG_KEY_PREFIX = 'sahaya_chat_lang_';
const MESSENGER_HISTORY_PREFIX = 'sahaya_messenger_hist_v2_';
function loadPermanentUserLang(userKey: string, fallbackLang?: Language): Language {
try {
if (userKey) {
const savedUser = localStorage.getItem(CHAT_LANG_KEY_PREFIX + userKey);
if (savedUser === 'si' ? true : savedUser === 'en' ? true : savedUser === 'ta') {
return savedUser as Language;
}
}
const savedGlobal = localStorage.getItem(CHAT_LANG_KEY_GLOBAL);
if (savedGlobal === 'si' ? true : savedGlobal === 'en' ? true : savedGlobal === 'ta') {
return savedGlobal as Language;
}
} catch (e) {}
if (fallbackLang === 'si' ? true : fallbackLang === 'en' ? true : fallbackLang === 'ta') {
return fallbackLang;
}
return 'si';
}
function savePermanentUserLang(lang: Language, userKey: string): void {
try {
localStorage.setItem(CHAT_LANG_KEY_GLOBAL, lang);
if (userKey) {
localStorage.setItem(CHAT_LANG_KEY_PREFIX + userKey, lang);
}
window.dispatchEvent(new CustomEvent('sahaya_chat_lang_changed', { detail: { lang, userKey } }));
} catch (e) {}
}
function instantExactGreetingTranslate(text: string, targetLang: Language): string {
if (!text) return '';
const clean = text.trim();
const lower = clean.toLowerCase().replace(/[?!.,;:!]/g, '').trim();
if ( lower === 'සුබ උදෑසනක්' ? true : lower === 'සුභ උදෑසනක්' ? true : lower === 'subha udasanak' ? true : lower === 'suba udasanak'
? true : lower === 'good morning' ? true : lower === 'காலை வணக்கம்' ) {
return targetLang === 'en' ? 'Good Morning' : targetLang === 'ta' ? 'காலை வணக்கம்' : 'සුබ උදෑසනක්';
}
if ( lower === 'සුබ රාත්‍රියක්' ? true : lower === 'සුභ රාත්‍රියක්' ? true : lower === 'subha rathriyak' ? true : lower === 'good night'
? true : lower === 'இரவு வணக்கம்' ) {
return targetLang === 'en' ? 'Good Night' : targetLang === 'ta' ? 'இரவு வணக்கம்' : 'සුබ රාත්‍රියක්';
}
if ( lower === 'සුබ දහවලක්' ? true : lower === 'good afternoon' ? true : lower === 'மதிய வணக்கம்' ) {
return targetLang === 'en' ? 'Good Afternoon' : targetLang === 'ta' ? 'மதிய வணக்கம்' : 'සුබ දහවලක්';
}
if ( lower === 'සුබ සන්ධ්‍යාවක්' ? true : lower === 'good evening' ? true : lower === 'மாலை வணக்கம்' ) {
return targetLang === 'en' ? 'Good Evening' : targetLang === 'ta' ? 'மாலை வணக்கம்' : 'සුබ සන්ධ්‍යාවක්';
}
return '';
}
function normalizePhoneStr(phone?: string): string {
return phone ? phone.replace(/\D/g, '') : '';
}
function makePartnerKey(name?: string, phone?: string, id?: string): string {
const cleanPhone = normalizePhoneStr(phone);
if (cleanPhone && Math.max(cleanPhone.length, 7) === cleanPhone.length) {
return 'ph' + cleanPhone.slice(-7);
}
if (id && id.trim() !== '') {
return 'id_' + id.trim().toLowerCase();
}
return 'nm_' + (name ? name.trim().toLowerCase() : 'partner');
}
function loadLocalPartnerMessages(postId: string, partnerKey: string): ChatMessage[] {
try {
const raw = localStorage.getItem(MESSENGER_HISTORY_PREFIX + postId + '' + partnerKey);
if (raw) {
const parsed = JSON.parse(raw);
if (Array.isArray(parsed)) return parsed;
}
} catch (e) {}
return [];
}
function saveLocalPartnerMessages(postId: string, partnerKey: string, msgs: ChatMessage[]): void {
try {
localStorage.setItem(MESSENGER_HISTORY_PREFIX + postId + '' + partnerKey, JSON.stringify(msgs.slice(-150)));
} catch (e) {}
}
const DIRECT_CONTACTS_PREFIX = 'sahaya_direct_chat_contacts_v1_';

export interface DirectChatContact {
  username: string;
  userId?: string;
  phone?: string;
  addedAt: number;
}

function loadDirectContacts(userKey: string): DirectChatContact[] {
  try {
    const raw = localStorage.getItem(DIRECT_CONTACTS_PREFIX + userKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function saveDirectContacts(userKey: string, list: DirectChatContact[]): void {
  try {
    localStorage.setItem(DIRECT_CONTACTS_PREFIX + userKey, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('sahaya_direct_contacts_updated'));
  } catch (e) {}
}

function makeDirectRoomId(myIdentifier: string, targetIdentifier: string): string {
  const cleanA = (myIdentifier ? myIdentifier : 'user').trim().toLowerCase().replace(/[^a-z0-9\u0D80-\u0DFF\u0B80-\u0BFF]/g, '_');
  const cleanB = (targetIdentifier ? targetIdentifier : 'partner').trim().toLowerCase().replace(/[^a-z0-9\u0D80-\u0DFF\u0B80-\u0BFF]/g, '_');
  const pair = [cleanA, cleanB].sort();
  return 'direct_user_chat_' + pair[0] + '__' + pair[1];
}

export interface MessageInboxModalProps {
isOpen: boolean;
onClose: () => void;
user?: UserType;
currentUser?: UserType;
users?: UserType[];
helpPosts: HelpPost[];
lang?: Language;
language?: Language;
onViewPost?: (post: HelpPost) => void;
onOpenChat?: (post: HelpPost) => void;
onSelectPostChat?: (post: HelpPost) => void;
onOpenConfirm?: (post: HelpPost) => void;
onNavigateToIssues?: () => void;
}
export interface ConversationThread {
id: string;
partnerKey: string;
post: HelpPost;
respondentName: string;
respondentPhone: string;
respondentId?: string;
lastMessage: string;
lastMessageTime: string;
lastMessageTimeMs: number;
repliesCount: number;
isCurrentUserAuthor: boolean;
isDirectUsernameChat?: boolean;
}
export const MessageInboxModal = ({ isOpen, onClose, user: userProp, currentUser, users = [], helpPosts, lang: langProp, language, onOpenConfirm,
onNavigateToIssues, }: MessageInboxModalProps) => {
const user = (currentUser ? currentUser : userProp) as UserType;
const activePropLang = (langProp ? langProp : language ? language : 'si') as Language;
const userKey = user?.userId
? user.userId
: (user as any)?.id
? (user as any).id
: user?.phone
? user.phone
: user?.nicNumber
? user.nicNumber
: user?.name
? user.name
: 'user';
const [userLang, setUserLangState] = useState(() => loadPermanentUserLang(userKey, activePropLang));
const [searchQuery, setSearchQuery] = useState('');
const [inboxTab, setInboxTab] = useState('all');
const [activeThread, setActiveThread] = useState(null as any);
const [messages, setMessages] = useState([] as ChatMessage[]);
const [inputText, setInputText] = useState('');
const [isSending, setIsSending] = useState(false);
const [isRecordingVoice, setIsRecordingVoice] = useState(false);
const [toggledOriginals, setToggledOriginals] = useState({} as any);
const [liveTranslations, setLiveTranslations] = useState({} as any);
const chatBottomRef = useRef(null as any);
const [isNewChatOpen, setIsNewChatOpen] = useState(false);
const [newChatUsername, setNewChatUsername] = useState('');
const [directContacts, setDirectContacts] = useState(() => loadDirectContacts(userKey));
const [showPolicyModal, setShowPolicyModal] = useState(false);
const [policyStrikes, setPolicyStrikes] = useState(() => getUserStrikes(userKey));
const [isBlocked, setIsBlocked] = useState(() => isUserPolicyBlocked(userKey));
const [detectedViolationTypes, setDetectedViolationTypes] = useState([] as any[]);
useEffect(() => { const saved = loadPermanentUserLang(userKey, activePropLang); setUserLangState(saved); setDirectContacts(loadDirectContacts(userKey)); }, [userKey, isOpen]);
useEffect(() => { const onLangEvent = (ev: any) => { if (ev && ev.detail && ev.detail.lang) { setUserLangState(ev.detail.lang); } };
window.addEventListener('sahaya_chat_lang_changed', onLangEvent); return () => window.removeEventListener('sahaya_chat_lang_changed', onLangEvent);
}, []);
const handleSelectOwnLanguage = (nextLang: Language) => {
setUserLangState(nextLang);
savePermanentUserLang(nextLang, userKey);
};
useEffect(() => { if (isOpen) { setPolicyStrikes(getUserStrikes(userKey)); setIsBlocked(isUserPolicyBlocked(userKey)); setDirectContacts(loadDirectContacts(userKey)); } }, [isOpen, userKey]);
const userPhoneClean = normalizePhoneStr(user?.phone ? user.phone : (user as any)?.whatsappNumber);
const currentUserId = user?.userId ? user.userId : (user as any)?.id ? (user as any).id : '';
const isMeMessage = (msg: any): boolean => {
if (!msg ? true : !user) return false;
if (msg.senderId && currentUserId && msg.senderId === currentUserId) return true;
if (user.name && msg.senderName && msg.senderName.trim().toLowerCase() === user.name.trim().toLowerCase()) return true;
const msgPhone = normalizePhoneStr(msg.senderPhone);
if (msgPhone && userPhoneClean && (msgPhone === userPhoneClean ? true : msgPhone.slice(-7) === userPhoneClean.slice(-7))) return true;
return false;
};
const isUserPostAuthor = (post: HelpPost): boolean => {
if (!post ? true : !user) return false;
if (checkIsPostOwner(user, post)) return true;
const postPhoneClean = normalizePhoneStr(post.userPhone);
const isPhoneMatch = Boolean( userPhoneClean && postPhoneClean && (userPhoneClean === postPhoneClean ? true : userPhoneClean.endsWith(postPhoneClean.slice(-7))
? true : postPhoneClean.endsWith(userPhoneClean.slice(-7))) );
const isIdMatch = Boolean( currentUserId && post.userId && currentUserId === post.userId );
const isNameMatch = Boolean( user.name && post.userName && post.userName.trim().toLowerCase() === user.name.trim().toLowerCase() );
return isPhoneMatch ? true : isIdMatch ? true : isNameMatch;
};
const isUserHelperOnPost = (post: HelpPost): boolean => {
if (!post ? true : isUserPostAuthor(post)) return false;
const replies = Array.isArray(post.replies) ? post.replies : [];
const applicants = Array.isArray(post.applicants) ? post.applicants : [];
const selected = Array.isArray(post.selectedHelpers) ? post.selectedHelpers : [];
const inReplies = replies.some((r: any) => { if (!r) return false; const repPhone = normalizePhoneStr(r.responderPhone); const isPhone = Boolean(userPhoneClean && repPhone && (userPhoneClean === repPhone ? true : userPhoneClean.endsWith(repPhone.slice(-7))));
const isName = Boolean(user?.name && r.responderName && r.responderName.trim().toLowerCase() === user.name.trim().toLowerCase()); const isId = Boolean(currentUserId && r.responderId && r.responderId === currentUserId);
return isPhone ? true : isName ? true : isId; });
if (inReplies) return true;
const inApps = [...applicants, ...selected].some((a: any) => { if (!a) return false; const apPhone = normalizePhoneStr(a.helperPhone);
const isPhone = Boolean(userPhoneClean && apPhone && (userPhoneClean === apPhone ? true : userPhoneClean.endsWith(apPhone.slice(-7))));
const isName = Boolean(user?.name && a.helperName && a.helperName.trim().toLowerCase() === user.name.trim().toLowerCase()); const isId = Boolean(currentUserId && a.helperId && a.helperId === currentUserId);
return isPhone ? true : isName ? true : isId; });
if (inApps) return true;
const myPartnerKey = makePartnerKey(user?.name, userPhoneClean, currentUserId);
const authorPartnerKey = makePartnerKey(post.userName, post.userPhone, post.userId);
const localWithAuthor = loadLocalPartnerMessages(post.id, authorPartnerKey);
const localWithMe = loadLocalPartnerMessages(post.id, myPartnerKey);
return localWithAuthor.length !== 0 ? true : localWithMe.length !== 0;
};
const matchingUsersForNewChat = useMemo(() => {
  const q = newChatUsername.trim().toLowerCase();
  const safeUsers = Array.isArray(users) ? users : [];
  const filtered = safeUsers.filter((u: any) => {
    if (!u) return false;
    const uId = u.id ? u.id : u.userId ? u.userId : '';
    if (currentUserId && uId === currentUserId) return false;
    if (user?.name && u.name && u.name.trim().toLowerCase() === user.name.trim().toLowerCase()) return false;
    if (!q) return true;
    const nameMatch = Boolean(u.name && u.name.toLowerCase().includes(q));
    const idMatch = Boolean(uId && String(uId).toLowerCase().includes(q));
    const nicMatch = Boolean(u.nicNumber && String(u.nicNumber).toLowerCase().includes(q));
    return nameMatch ? true : idMatch ? true : nicMatch;
  });
  return filtered.slice(0, 8);
}, [users, newChatUsername, currentUserId, user?.name]);
const buildDirectThread = (contact: DirectChatContact): ConversationThread => {
  const cleanTargetName = contact.username ? contact.username.trim() : 'පරිශීලක';
  const myIdentity = user?.name ? user.name.trim() : userKey;
  const roomPostId = makeDirectRoomId(myIdentity, cleanTargetName);
  const pKey = makePartnerKey(cleanTargetName, contact.phone, contact.userId);
  const localMsgs = loadLocalPartnerMessages(roomPostId, pKey);
  const lastLocal = localMsgs.length !== 0 ? localMsgs[localMsgs.length - 1] : null;
  const bestMs = lastLocal && lastLocal.createdAtMs ? lastLocal.createdAtMs : contact.addedAt ? contact.addedAt : Date.now();
  const bestMsg = lastLocal && lastLocal.text ? lastLocal.text : 'Username හරහා සෘජු චැට් සංවාදය (Direct Chat)';
  const virtualPost: HelpPost = {
    id: roomPostId,
    postCode: 'USER-CHAT',
    userId: currentUserId ? currentUserId : 'usr_direct',
    userName: user?.name ? user.name : 'පරිශීලක',
    userPhone: user?.phone ? user.phone : '',
    category: 'normal_services' as any,
    whatHappened: '@' + cleanTargetName + ' සමඟ සෘජු චැට් සංවාදය',
    whatIsNeeded: 'Direct Chat',
    locationName: 'Online Chat',
    createdAt: new Date(bestMs).toISOString(),
    createdAtMs: bestMs,
    status: 'confirmed' as any,
    isConfirmed: true,
    revealContactConsent: false,
    replies: []
  };
  return {
    id: roomPostId + '_direct_' + pKey,
    partnerKey: pKey,
    post: virtualPost,
    respondentName: cleanTargetName,
    respondentPhone: contact.phone ? contact.phone : '',
    respondentId: contact.userId ? contact.userId : '',
    lastMessage: bestMsg,
    lastMessageTime: getAccurateElapsedTime(new Date(bestMs).toISOString(), bestMs),
    lastMessageTimeMs: bestMs,
    repliesCount: Math.max(1, localMsgs.length),
    isCurrentUserAuthor: true,
    isDirectUsernameChat: true
  };
};
const handleStartChatWithUsername = (targetUsernameRaw: string, matchedUser?: UserType) => {
  const cleanTarget = (matchedUser && matchedUser.name ? matchedUser.name : targetUsernameRaw ? targetUsernameRaw : '').trim().replace(/^@/, '');
  if (!cleanTarget) return;
  const newContact: DirectChatContact = {
    username: cleanTarget,
    userId: matchedUser ? (matchedUser.userId ? matchedUser.userId : matchedUser.id) : undefined,
    phone: matchedUser ? (matchedUser.phone ? matchedUser.phone : (matchedUser as any).whatsappPhone) : undefined,
    addedAt: Date.now()
  };
  const existingList = loadDirectContacts(userKey);
  const existsIdx = existingList.findIndex((c) => c && c.username && c.username.trim().toLowerCase() === cleanTarget.toLowerCase());
  const updatedContacts = existsIdx !== -1 ? existingList.map((c, idx) => (idx === existsIdx ? { ...c, ...newContact, addedAt: Date.now() } : c)) : [newContact, ...existingList];
  saveDirectContacts(userKey, updatedContacts);
  setDirectContacts(updatedContacts);
  const threadObj = buildDirectThread(newContact);
  setActiveThread(threadObj);
  setIsNewChatOpen(false);
  setNewChatUsername('');
  setInboxTab('all');
};
const conversationThreads: ConversationThread[] = useMemo(() => { const list: ConversationThread[] = [];
(directContacts ? directContacts : []).forEach((contact) => { if (contact && contact.username) list.push(buildDirectThread(contact)); });
(helpPosts ? helpPosts : []).forEach((post) => {
if (!post ? true : !post.id ? true : post.isDeleted) return; if (isUserPostAuthor(post)) { const helperMap: any = {}; const registerHelper = (name?: string, phone?: string, id?: string, msgText?: string, timeStr?: string, timeMs?: number) => {
const cleanName = name ? name.trim() : ''; if (!cleanName) return; if (user?.name && cleanName.toLowerCase() === user.name.trim().toLowerCase()) return;
const pKey = makePartnerKey(cleanName, phone, id); const resolvedMs = timeMs ? timeMs : parseTimeToMs(timeStr); const localMsgs = loadLocalPartnerMessages(post.id, pKey);
const lastLocal = localMsgs.length !== 0 ? localMsgs[localMsgs.length - 1] : null; const bestMs = lastLocal && lastLocal.createdAtMs ? Math.max(resolvedMs, lastLocal.createdAtMs) : resolvedMs;
const bestMsg = lastLocal && lastLocal.text ? lastLocal.text : msgText ? msgText : 'සහය වීමට කැමැත්ත පළ කර ඇත.'; if (!helperMap[pKey]) {
helperMap[pKey] = { id: post.id + 'author' + pKey, partnerKey: pKey, post: post, respondentName: cleanName, respondentPhone: phone ? phone : '',
respondentId: id ? id : '', lastMessage: bestMsg, lastMessageTime: getAccurateElapsedTime(timeStr, bestMs), lastMessageTimeMs: bestMs,
repliesCount: 1 + localMsgs.length, isCurrentUserAuthor: true, }; } else { helperMap[pKey].repliesCount += 1; if (Math.max(bestMs, helperMap[pKey].lastMessageTimeMs) === bestMs) {
helperMap[pKey].lastMessage = bestMsg; helperMap[pKey].lastMessageTimeMs = bestMs; helperMap[pKey].lastMessageTime = getAccurateElapsedTime(timeStr, bestMs);
} } }; if (Array.isArray(post.selectedHelpers)) { post.selectedHelpers.forEach((sh: any) => { if (sh) registerHelper(sh.helperName, sh.helperPhone, sh.helperId, 'තෝරාගත් සහායකයා', sh.appliedAt, parseTimeToMs(sh.appliedAt));
}); } if (Array.isArray(post.applicants)) { post.applicants.forEach((ap: any) => { if (ap) registerHelper(ap.helperName, ap.helperPhone, ap.helperId, 'ඉක්මන් සේවාවට කැමැත්ත පළ කර ඇත.', ap.appliedAt, parseTimeToMs(ap.appliedAt));
}); } if (Array.isArray(post.replies)) { post.replies.forEach((rp: any) => { if (rp) registerHelper(rp.responderName, rp.responderPhone, rp.responderId, rp.message, rp.createdAt, rp.createdAtMs);
}); } Object.values(helperMap).forEach((t: any) => list.push(t)); } else if (isUserHelperOnPost(post)) { const authorKey = makePartnerKey(post.userName, post.userPhone, post.userId);
const localMsgs = loadLocalPartnerMessages(post.id, authorKey); const lastLocal = localMsgs.length !== 0 ? localMsgs[localMsgs.length - 1] : null;
const replies = Array.isArray(post.replies) ? [...post.replies].filter(Boolean) : []; replies.sort((a, b) => parseTimeToMs(b.createdAt, b.createdAtMs) - parseTimeToMs(a.createdAt, a.createdAtMs));
const latestReply = replies[0]; const baseMs = latestReply ? latestReply.createdAtMs ? latestReply.createdAtMs : parseTimeToMs(latestReply.createdAt)
: post.createdAtMs ? post.createdAtMs : parseTimeToMs(post.createdAt); const finalMs = lastLocal && lastLocal.createdAtMs ? Math.max(baseMs, lastLocal.createdAtMs) : baseMs;
const finalMsg = lastLocal && lastLocal.text ? lastLocal.text : latestReply?.message ? latestReply.message : post.whatHappened ? post.whatHappened
: 'සංවාදය ආරම්භ විය'; list.push({ id: post.id + 'helper' + authorKey, partnerKey: authorKey, post: post, respondentName: post.userName ? post.userName : 'දැන්වීම්කරු',
respondentPhone: post.userPhone ? post.userPhone : '', respondentId: post.userId ? post.userId : '', lastMessage: finalMsg, lastMessageTime: getAccurateElapsedTime(latestReply?.createdAt ? latestReply.createdAt : post.createdAt, finalMs),
lastMessageTimeMs: finalMs, repliesCount: replies.length + localMsgs.length, isCurrentUserAuthor: false, }); } }); list.sort((a, b) => b.lastMessageTimeMs - a.lastMessageTimeMs);
return list; }, [helpPosts, user, isOpen, directContacts]);
useEffect(() => { if (isOpen && !activeThread && conversationThreads.length !== 0) { setActiveThread(conversationThreads[0]); } }, [isOpen, conversationThreads.length]);
useEffect(() => { if (!isOpen ? true : !activeThread?.post?.id) return; const currentPost = activeThread.post; const partnerKey = activeThread.partnerKey;
const unsubscribe = subscribeToChatMessages(currentPost.id, (firestoreMsgs) => { const localSaved = loadLocalPartnerMessages(currentPost.id, partnerKey);
const combined: ChatMessage[] = []; if (Array.isArray(currentPost.replies)) { currentPost.replies.forEach((rep: any, rIdx: number) => {
if (!rep) return; const repKey = makePartnerKey(rep.responderName, rep.responderPhone, rep.responderId); if (activeThread.isCurrentUserAuthor && repKey !== partnerKey && rep.responderName !== activeThread.respondentName) {
return; } const isDup = (firestoreMsgs ? firestoreMsgs : []).some( (m) => Boolean( m && m.text && rep.message && m.text.trim() === rep.message.trim() &&
m.senderName && rep.responderName && m.senderName.trim() === rep.responderName.trim() ) ); if (!isDup) { const repMs = rep.createdAtMs ? rep.createdAtMs : parseTimeToMs(rep.createdAt);
combined.push({ id: rep.id ? rep.id : 'rep_' + rIdx, senderName: rep.responderName ? rep.responderName : 'සහායක', senderRole: 'helper',
text: rep.message ? rep.message : '', timestamp: formatMessageClockTime(rep.createdAt, repMs), createdAtMs: repMs, senderPhone: rep.responderPhone ? rep.responderPhone : '',
senderId: rep.responderId ? rep.responderId : '', } as any); } }); } (firestoreMsgs ? firestoreMsgs : []).forEach((fMsg: any) => { if (!fMsg) return;
const mine = isMeMessage(fMsg); if (activeThread.isCurrentUserAuthor) { const senderKey = makePartnerKey(fMsg.senderName, fMsg.senderPhone, fMsg.senderId);
const matchesPartner = Boolean( senderKey === partnerKey ? true : fMsg.senderName && activeThread.respondentName && fMsg.senderName.trim().toLowerCase() === activeThread.respondentName.trim().toLowerCase()
? true : mine && (fMsg.recipientKey === partnerKey ? true : fMsg.recipientName === activeThread.respondentName ? true : !fMsg.recipientKey)
); if (!matchesPartner) return; } else { const fromAuthor = Boolean( mine ? true : fMsg.senderRole === 'seeker' ? true : currentPost.userName && fMsg.senderName && fMsg.senderName.trim().toLowerCase() === currentPost.userName.trim().toLowerCase()
); if (!fromAuthor) return; } const fMs = fMsg.createdAtMs ? fMsg.createdAtMs : parseTimeToMs(fMsg.timestamp); combined.push({ ...fMsg,
createdAtMs: fMs, timestamp: formatMessageClockTime(fMsg.timestamp, fMs), }); }); const mergedMap: any = {}; localSaved.forEach((lm: any) => {
if (lm && lm.id) mergedMap[lm.id] = lm; }); combined.forEach((cm: any) => { if (cm && cm.id) mergedMap[cm.id] = cm; }); const finalArr = Object.values(mergedMap) as ChatMessage[];
finalArr.sort((a, b) => { const timeA = a.createdAtMs ? a.createdAtMs : parseTimeToMs(a.timestamp); const timeB = b.createdAtMs ? b.createdAtMs : parseTimeToMs(b.timestamp);
return timeA - timeB; }); if (finalArr.length !== 0) { setMessages(finalArr); } else { const nowMs = Date.now(); const safeDesc = inspectAndSanitizeMessage(
currentPost.whatHappened ? currentPost.whatHappened : 'ඉල්ලීම', Boolean(currentPost.isConfirmed) ).sanitizedText; setMessages([ { id: 'init_1_' + partnerKey,
senderName: currentPost.userName ? currentPost.userName : 'දැන්වීම්කරු', senderRole: 'seeker', text: 'සුබ උදෑසනක්! #' + (currentPost.postCode ? currentPost.postCode : '') + ' (' + safeDesc + ') සඳහා සංවාදය මෙතැනින් ආරම්භ කරන්න.',
timestamp: formatMessageClockTime(undefined, nowMs), createdAtMs: nowMs, senderPhone: currentPost.userPhone ? currentPost.userPhone : '',
senderLang: 'si', } as any, ]); } }); return () => unsubscribe(); }, [isOpen, activeThread?.id, activeThread?.post?.id]);
useEffect(() => { if (!isOpen ? true : messages.length === 0) return; let isMounted = true; messages.forEach((msg: any) => { if (!msg ? true : !msg.text ? true : msg.audioUrl) return;
const mine = isMeMessage(msg); if (mine) return; const cacheKey = msg.id + '_' + userLang; if (liveTranslations[cacheKey]) return; const exactGreeting = instantExactGreetingTranslate(msg.text, userLang);
if (exactGreeting) { if (isMounted) { setLiveTranslations((prev: any) => ({ ...prev, [cacheKey]: exactGreeting })); } return; } const precomp = msg.translations && msg.translations[userLang] ? msg.translations[userLang] : '';
const dictTrans = translateChatMessage(msg.text, userLang).translatedText; if (precomp && precomp.trim().toLowerCase() !== msg.text.trim().toLowerCase()) {
if (isMounted) { setLiveTranslations((prev: any) => ({ ...prev, [cacheKey]: precomp })); } return; } if (dictTrans && dictTrans.trim().toLowerCase() !== msg.text.trim().toLowerCase()) {
if (isMounted) { setLiveTranslations((prev: any) => ({ ...prev, [cacheKey]: dictTrans })); } return; } const msgDetected = msg.senderLang ? msg.senderLang : detectLanguageOfText(msg.text);
const effectiveSource = msgDetected === 'singlish' ? 'si' : msgDetected; if (effectiveSource !== userLang) { translateWithGoogle(msg.text, userLang).then((gRes) => {
if (isMounted && gRes && gRes.trim()) { setLiveTranslations((prev: any) => ({ ...prev, [cacheKey]: gRes.trim() })); } }).catch(() => {});
} }); return () => { isMounted = false; }; }, [isOpen, messages, userLang]);
const detectedOtherPartyLang = useMemo((): Language => { for (let i = messages.length - 1; Math.max(i, 0) === i; i--) { const m: any = messages[i];
if (m && !isMeMessage(m)) { if (m.senderLang === 'si' ? true : m.senderLang === 'en' ? true : m.senderLang === 'ta') { return m.senderLang as Language;
} const det = detectLanguageOfText(m.text ? m.text : ''); if (det === 'en') return 'en'; if (det === 'ta') return 'ta'; return 'si';
} } return userLang === 'en' ? 'si' : 'en'; }, [messages, userLang]);
useEffect(() => { if (activeThread) { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); } }, [messages.length, activeThread?.id]);
if (!isOpen) return null;

const filteredThreads = conversationThreads.filter((thread) => { if (inboxTab === 'my_posts' && !thread.isCurrentUserAuthor) return false;
if (inboxTab === 'my_offers' && thread.isCurrentUserAuthor) return false; if (!searchQuery.trim()) return true; const q = searchQuery.toLowerCase().trim();
return Boolean( (thread.respondentName ? thread.respondentName : '').toLowerCase().includes(q) ? true : (thread.lastMessage ? thread.lastMessage : '').toLowerCase().includes(q)
? true : (thread.post?.whatHappened ? thread.post.whatHappened : '').toLowerCase().includes(q) ? true : (thread.post?.postCode ? thread.post.postCode : '').toLowerCase().includes(q)
); });
const handleSend = async (e: React.FormEvent) => {
e.preventDefault();
if (!inputText.trim() ? true : isSending ? true : !activeThread?.post) return;
const currentPost = activeThread.post;
const isConfirmed = Boolean(currentPost.isConfirmed);
if (isUserPolicyBlocked(userKey)) {
setIsBlocked(true);
setShowPolicyModal(true);
return;
}
const rawText = inputText.trim();
setInputText('');
const policyResult = inspectAndSanitizeMessage(rawText, isConfirmed);
let messageTextToSave = rawText;
if (policyResult.hasViolation) {
messageTextToSave = policyResult.sanitizedText;
const record = recordPolicyViolation(userKey);
setPolicyStrikes(record.newStrikes);
setIsBlocked(record.isBlocked);
setDetectedViolationTypes(policyResult.detectedTypes);
setShowPolicyModal(true);
}
const baseTranslations = getChatTranslations(messageTextToSave, userLang);
const exactSi = instantExactGreetingTranslate(messageTextToSave, 'si');
const exactEn = instantExactGreetingTranslate(messageTextToSave, 'en');
const exactTa = instantExactGreetingTranslate(messageTextToSave, 'ta');
const [gSi, gEn, gTa] = await Promise.all([ exactSi ? Promise.resolve(exactSi) : baseTranslations.si !== messageTextToSave ? Promise.resolve(baseTranslations.si)
: translateWithGoogle(messageTextToSave, 'si'), exactEn ? Promise.resolve(exactEn) : baseTranslations.en !== messageTextToSave ? Promise.resolve(baseTranslations.en)
: translateWithGoogle(messageTextToSave, 'en'), exactTa ? Promise.resolve(exactTa) : baseTranslations.ta !== messageTextToSave ? Promise.resolve(baseTranslations.ta)
: translateWithGoogle(messageTextToSave, 'ta'), ]);
const detected = detectLanguageOfText(messageTextToSave);
const nowIso = new Date().toISOString();
const nowMs = Date.now();
const newMsg: any = {
senderName: user?.name ? user.name : 'පරිශීලක',
senderRole: activeThread.isCurrentUserAuthor ? 'seeker' : 'helper',
text: messageTextToSave,
timestamp: formatMessageClockTime(nowIso, nowMs),
createdAt: nowIso,
createdAtMs: nowMs,
senderPhone: user?.phone ? user.phone : (user as any)?.whatsappNumber ? (user as any).whatsappNumber : '',
senderId: currentUserId,
senderLang: userLang,
detectedLang: detected,
originalText: messageTextToSave,
recipientKey: activeThread.partnerKey,
recipientName: activeThread.respondentName,
recipientPhone: activeThread.respondentPhone ? activeThread.respondentPhone : '',
recipientId: activeThread.respondentId ? activeThread.respondentId : '',
translations: {
si: gSi ? gSi : baseTranslations.si,
en: gEn ? gEn : baseTranslations.en,
ta: gTa ? gTa : baseTranslations.ta,
},
};
const localMsgWithId = { ...newMsg, id: 'local_msg_' + nowMs };
const updatedList = [...messages.filter((m) => !String(m.id).startsWith('init_1_')), localMsgWithId];
saveLocalPartnerMessages(currentPost.id, activeThread.partnerKey, updatedList);
setMessages(updatedList);
setIsSending(true);
try {
await sendChatMessageToFirestore(currentPost.id, newMsg);
} catch (err) {
console.error('Failed to send message to Firestore:', err);
} finally {
setIsSending(false);
}
};
const handleSendVoiceAudio = async (audioBase64: string, durationSec: number, tgRecord?: TelegramMediaRecord) => {
if (!activeThread) return;
const currentPost = activeThread.post;
if (isUserPolicyBlocked(userKey)) {
setIsBlocked(true);
setShowPolicyModal(true);
return;
}
const nowIso = new Date().toISOString();
const nowMs = Date.now();
const newMsg: any = {
senderName: user?.name ? user.name : 'පරිශීලක',
senderRole: activeThread.isCurrentUserAuthor ? 'seeker' : 'helper',
text: '🎙️ [හඬ පණිවිඩයක් / Voice Note]',
timestamp: formatMessageClockTime(nowIso, nowMs),
createdAt: nowIso,
createdAtMs: nowMs,
senderPhone: user?.phone ? user.phone : (user as any)?.whatsappNumber ? (user as any).whatsappNumber : '',
senderId: currentUserId,
audioUrl: audioBase64,
audioDurationSec: durationSec,
senderLang: userLang,
recipientKey: activeThread.partnerKey,
recipientName: activeThread.respondentName,
recipientPhone: activeThread.respondentPhone ? activeThread.respondentPhone : '',
recipientId: activeThread.respondentId ? activeThread.respondentId : '',
telegramStorage: tgRecord,
};
const localMsgWithId = { ...newMsg, id: 'local_audio_' + nowMs };
const updatedList = [...messages.filter((m) => !String(m.id).startsWith('init_1_')), localMsgWithId];
saveLocalPartnerMessages(currentPost.id, activeThread.partnerKey, updatedList);
setMessages(updatedList);
setIsRecordingVoice(false);
setIsSending(true);
try {
await sendChatMessageToFirestore(currentPost.id, newMsg);
} catch (err) {
console.error('Failed to send voice note to Firestore:', err);
} finally {
setIsSending(false);
}
};
const toggleShowOriginal = (msgId: string) => {
setToggledOriginals((prev: any) => ({ ...prev, [msgId]: !prev[msgId], }));
};
const resolveDisplayedMessageText = (msg: any, mine: boolean, isConfirmed: boolean) => {
const rawSanitized = inspectAndSanitizeMessage(msg.text ? msg.text : '', isConfirmed).sanitizedText;
if (msg.audioUrl ? true : mine) {
return { primaryText: rawSanitized, isTranslated: false, originalText: rawSanitized };
}
const cacheKey = msg.id + '_' + userLang;
const exactMatch = instantExactGreetingTranslate(rawSanitized, userLang);
const fromLive = liveTranslations[cacheKey];
const fromMsgObj = msg.translations && msg.translations[userLang] ? msg.translations[userLang] : '';
const fromDict = translateChatMessage(rawSanitized, userLang).translatedText;
const translatedCandidate = exactMatch
? exactMatch
: fromLive
? fromLive
: fromMsgObj && fromMsgObj.trim().toLowerCase() !== rawSanitized.trim().toLowerCase()
? fromMsgObj
: fromDict
? fromDict
: rawSanitized;
const isDiff = Boolean( translatedCandidate && translatedCandidate.trim() !== '' && translatedCandidate.trim().toLowerCase() !== rawSanitized.trim().toLowerCase()
);
const showOrig = Boolean(toggledOriginals[msg.id]);
return {
primaryText: showOrig ? rawSanitized : translatedCandidate,
isTranslated: isDiff,
originalText: rawSanitized,
};
};
const userLangInfo = getLanguageDisplayInfo(userLang);
const otherLangInfo = getLanguageDisplayInfo(detectedOtherPartyLang);
return h( React.Fragment, null, h( 'div', { className: 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn' },
h( 'div', { className: 'w-full max-w-5xl bg-white dark:bg-[#06180f] border-2 border-emerald-500/70 rounded-[2rem] shadow-[0_25px_70px_rgba(0,122,75,0.35)] overflow-hidden flex flex-col md:flex-row h-[90vh] max-h-[780px] relative' },
h( 'div', { className: (activeThread ? 'hidden md:flex ' : 'flex ') + 'w-full md:w-80 lg:w-96 flex-col border-r border-slate-200 dark:border-emerald-900/60 bg-white dark:bg-[#05140c] h-full shrink-0'
}, h( 'div', { className: 'bg-gradient-to-r from-[#0084ff] via-emerald-700 to-teal-800 p-4 text-white flex items-center justify-between shrink-0' },
h( 'div', { className: 'flex items-center gap-2.5' }, h( 'div', { className: 'w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-inner' },
h(MessageSquare, { className: 'w-5 h-5' }) ), h( 'div', null, h( 'h3', { className: 'text-base font-black text-white flex items-center gap-2' },
h('span', null, 'Messenger චැට්'), h('span', { className: 'bg-white/20 text-white text-[11px] px-2 py-0.5 rounded-full font-mono font-bold' }, conversationThreads.length)
), h('p', { className: 'text-[10px] text-emerald-100 font-medium' }, 'පෙර පණිවිඩ සහ Username මඟින් නව චැට්') ) ),
h('div', { className: 'flex items-center gap-1.5 shrink-0' },
  h('button', {
    type: 'button',
    onClick: () => setIsNewChatOpen(!isNewChatOpen),
    className: 'px-2.5 py-1.5 rounded-xl font-black text-[11px] flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer border ' + (isNewChatOpen ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-white/20 hover:bg-white/30 text-white border-white/30'),
    title: 'Username එක හරහා නව Chat එකක් අරඹන්න'
  }, h(UserPlus, { className: 'w-3.5 h-3.5' }), h('span', null, 'නව Chat')),
  h('button', { type: 'button', onClick: onClose, className: 'md:hidden w-8 h-8 rounded-full bg-white/20 hover:bg-rose-600 text-white flex items-center justify-center font-bold text-xs cursor-pointer' }, '✕')
) ),
isNewChatOpen ? h('div', { className: 'p-3 bg-gradient-to-b from-emerald-50 to-white dark:from-[#082416] dark:to-[#05140c] border-b-2 border-emerald-500/50 space-y-2 shrink-0 animate-fadeIn' },
  h('div', { className: 'flex items-center justify-between' },
    h('span', { className: 'text-[11px] font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5' }, h(UserPlus, { className: 'w-3.5 h-3.5 text-emerald-600' }), h('span', null, 'Username මඟින් නව Chat එකක් අරඹන්න:')),
    h('button', { type: 'button', onClick: () => setIsNewChatOpen(false), className: 'text-slate-400 hover:text-rose-500 text-xs font-bold cursor-pointer' }, h(X, { className: 'w-3.5 h-3.5' }))
  ),
  h('form', {
    onSubmit: (e: any) => {
      e.preventDefault();
      if (newChatUsername.trim()) {
        const exactMatch = matchingUsersForNewChat.find((u: any) => u && u.name && u.name.trim().toLowerCase() === newChatUsername.trim().toLowerCase());
        handleStartChatWithUsername(newChatUsername, exactMatch);
      }
    },
    className: 'flex items-center gap-1.5'
  },
    h('input', {
      type: 'text',
      value: newChatUsername,
      onChange: (e: any) => setNewChatUsername(e.target.value),
      placeholder: 'Username / නම හෝ ID ඇතුළත් කරන්න...',
      className: 'flex-1 bg-white dark:bg-[#041009] border border-emerald-400 dark:border-emerald-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none'
    }),
    h('button', {
      type: 'submit',
      disabled: !newChatUsername.trim(),
      className: 'px-3 py-2 rounded-xl bg-gradient-to-r from-[#0084ff] to-emerald-600 hover:from-[#0073e6] hover:to-emerald-700 disabled:opacity-40 text-white font-black text-xs shadow-sm cursor-pointer shrink-0'
    }, 'Chat අරඹන්න')
  ),
  matchingUsersForNewChat.length !== 0 ? h('div', { className: 'max-h-32 overflow-y-auto space-y-1 pt-1' },
    matchingUsersForNewChat.map((u: any, uIdx: number) => h('div', {
      key: (u.id ? u.id : 'usr') + '_' + uIdx,
      onClick: () => handleStartChatWithUsername(u.name ? u.name : u.userId, u),
      className: 'px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#092215] hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 border border-slate-200 dark:border-emerald-800/60 flex items-center justify-between gap-2 cursor-pointer'
    },
      h('span', { className: 'text-xs font-black text-slate-800 dark:text-slate-100 truncate' }, u.name ? u.name : u.userId),
      h('span', { className: 'px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black shrink-0' }, '💬 Chat')
    ))
  ) : null
) : null,
h( 'div', { className: 'flex border-b border-slate-200 dark:border-[#102d1d] bg-slate-100/70 dark:bg-[#041009] px-2.5 pt-2 gap-1 shrink-0' },
h( 'button', { type: 'button', onClick: () => setInboxTab('all'), className: 'px-2.5 py-1.5 text-[11px] font-black rounded-t-xl transition-all cursor-pointer ' +
(inboxTab === 'all' ? 'bg-white dark:bg-[#071c12] text-emerald-700 dark:text-emerald-300 border-t-2 border-emerald-500 shadow-xs' : 'text-slate-500')
}, 'සියල්ල (' + conversationThreads.length + ')' ), h( 'button', { type: 'button', onClick: () => setInboxTab('my_posts'), className:
'px-2.5 py-1.5 text-[11px] font-black rounded-t-xl transition-all cursor-pointer ' + (inboxTab === 'my_posts' ? 'bg-white dark:bg-[#071c12] text-emerald-700 dark:text-emerald-300 border-t-2 border-emerald-500 shadow-xs' : 'text-slate-500')
}, 'මගේ දැන්වීම් (' + conversationThreads.filter((t) => t.isCurrentUserAuthor).length + ')' ), h( 'button', { type: 'button', onClick: () => setInboxTab('my_offers'),
className: 'px-2.5 py-1.5 text-[11px] font-black rounded-t-xl transition-all cursor-pointer ' + (inboxTab === 'my_offers' ? 'bg-white dark:bg-[#071c12] text-emerald-700 dark:text-emerald-300 border-t-2 border-emerald-500 shadow-xs' : 'text-slate-500')
}, 'සහාය වූ (' + conversationThreads.filter((t) => !t.isCurrentUserAuthor).length + ')' ) ), h( 'div', { className: 'p-2.5 bg-slate-50 dark:bg-[#05140c] border-b border-slate-200 dark:border-[#102d1d] shrink-0' },
h( 'div', { className: 'relative' }, h(Search, { className: 'w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2' }),
h('input', { type: 'text', value: searchQuery, onChange: (e: any) => setSearchQuery(e.target.value), placeholder: 'පුද්ගලයාගේ නම හෝ පණිවිඩය සොයන්න...',
className: 'w-full bg-white dark:bg-[#081e13] border border-slate-200 dark:border-[#173e28] rounded-full pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500'
}) ) ), h( 'div', { className: 'flex-1 overflow-y-auto p-2.5 space-y-1.5 bg-[#f8faf9] dark:bg-[#040e08]' }, filteredThreads.length === 0
? h( 'div', { className: 'py-12 text-center flex flex-col items-center justify-center space-y-2 p-4' }, h(Inbox, { className: 'w-10 h-10 text-slate-300 dark:text-slate-600' }),
h('p', { className: 'text-xs font-extrabold text-slate-600 dark:text-slate-400' }, 'තවම සංවාද කිසිවක් නොමැත') ) : filteredThreads.map((thread, tIdx) => {
const isSelected = Boolean(activeThread && activeThread.id === thread.id); const previewGreeting = instantExactGreetingTranslate(thread.lastMessage, userLang);
const previewTranslated = previewGreeting ? previewGreeting : translateChatMessage(thread.lastMessage ? thread.lastMessage : '', userLang).translatedText;
return h( 'div', { key: thread.id + '_' + tIdx, onClick: () => setActiveThread(thread), className: 'p-3 rounded-2xl transition-all cursor-pointer flex items-center gap-3 ' +
(isSelected ? 'bg-gradient-to-r from-[#0084ff]/15 to-emerald-500/15 border-2 border-emerald-500 shadow-xs' : 'bg-white dark:bg-[#071c12] hover:bg-emerald-50/50 dark:hover:bg-[#0a281a] border border-slate-200/80 dark:border-emerald-900/40')
}, h( 'div', { className: 'relative shrink-0' }, h( 'div', { className: 'w-11 h-11 rounded-full font-black text-sm flex items-center justify-center text-white shadow-sm ' +
(thread.isCurrentUserAuthor ? 'bg-gradient-to-br from-[#0084ff] to-emerald-600' : 'bg-gradient-to-br from-amber-500 to-orange-600')
}, (thread.respondentName ? thread.respondentName : 'U').charAt(0).toUpperCase() ), h('span', { className: 'w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 absolute bottom-0 right-0' })
), h( 'div', { className: 'min-w-0 flex-1' }, h( 'div', { className: 'flex items-center justify-between gap-1' }, h('span', { className: 'text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate' }, thread.respondentName),
h('span', { className: 'text-[10px] font-mono text-slate-400 shrink-0' }, thread.lastMessageTime) ), h( 'div', { className: 'flex items-center gap-1.5 mt-0.5' },
h( 'span', { className: 'text-[9px] px-1.5 py-0.5 rounded font-black shrink-0 ' + (thread.isCurrentUserAuthor ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300')
}, thread.isCurrentUserAuthor ? 'සහායකයා' : 'දැන්වීම්කරු' ), h('span', { className: 'text-[10px] text-slate-400 truncate' }, '#' + (thread.post.postCode ? thread.post.postCode : 'POST'))
), h( 'p', { className: 'text-xs text-slate-600 dark:text-slate-300 font-semibold truncate mt-1' }, previewTranslated ? previewTranslated : thread.lastMessage
) ) ); }) ) ), h( 'div', { className: (activeThread ? 'flex ' : 'hidden md:flex ') + 'flex-1 flex-col h-full min-w-0 bg-white dark:bg-[#06180f]' },
!activeThread ? h( 'div', { className: 'flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3' }, h( 'div', { className: 'w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center' },
h(MessageSquare, { className: 'w-8 h-8' }) ), h('h4', { className: 'text-base font-black text-slate-800 dark:text-slate-200' }, 'සංවාදයක් තෝරන්න (Select a Conversation)'),
h('p', { className: 'text-xs text-slate-500 max-w-xs' }, 'වම් පස ඇති Messenger ලැයිස්තුවෙන් ඕනෑම පුද්ගලයෙකු තෝරා ඔවුන් සමඟ කළ සම්පූර්ණ චැට් ඉතිහාසය බලන්න.'),
h( 'button', { type: 'button', onClick: onClose, className: 'px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer'
}, 'වසන්න (Close)' ) ) : h( React.Fragment, null, h( 'div', { className: 'bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 p-3 sm:p-4 text-white border-b border-emerald-600/50 shrink-0 space-y-2' },
h( 'div', { className: 'flex items-center justify-between gap-2' }, h( 'div', { className: 'flex items-center gap-2.5 min-w-0' }, h(
'button', { type: 'button', onClick: () => setActiveThread(null), className: 'md:hidden p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center gap-1 text-xs font-bold cursor-pointer shrink-0'
}, h(ArrowLeft, { className: 'w-4 h-4' }) ), h( 'div', { className: 'relative shrink-0' }, h( 'div', { className: 'w-10 h-10 rounded-full bg-gradient-to-br from-[#0084ff] to-emerald-500 border-2 border-white/40 flex items-center justify-center font-black text-sm text-white' },
(activeThread.respondentName ? activeThread.respondentName : 'U').charAt(0).toUpperCase() ), h('span', { className: 'w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-emerald-950 absolute bottom-0 right-0' })
), h( 'div', { className: 'min-w-0' }, h( 'div', { className: 'flex items-center gap-1.5 flex-wrap' }, h('h3', { className: 'text-sm sm:text-base font-black text-white truncate' }, activeThread.respondentName),
h( 'span', { className: 'text-[9px] px-1.5 py-0.5 rounded font-black bg-emerald-400/20 text-emerald-200 border border-emerald-400/30' },
activeThread.isCurrentUserAuthor ? 'සහායකයා' : 'දැන්වීම්කරු' ) ), h( 'p', { className: 'text-[11px] text-emerald-100/90 font-medium truncate max-w-xs sm:max-w-md' },
'📌 ' + inspectAndSanitizeMessage(activeThread.post.whatHappened ? activeThread.post.whatHappened : '', Boolean(activeThread.post.isConfirmed)).sanitizedText
) ) ), h( 'div', { className: 'flex items-center gap-2 shrink-0' }, activeThread.post.isConfirmed ? h( 'span', { className: 'text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-black font-mono flex items-center gap-1 shadow-xs' },
h(CheckCircle, { className: 'w-3 h-3' }), h('span', null, 'CONFIRMED') ) : onOpenConfirm ? h( 'button', { type: 'button', onClick: () => {
const p = activeThread.post; onClose(); onOpenConfirm(p); }, className: 'px-3 py-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer'
}, 'Confirm' ) : null, h( 'button', { type: 'button', onClick: onClose, className: 'w-8 h-8 rounded-full bg-white/10 hover:bg-rose-600 text-white flex items-center justify-center font-bold text-xs cursor-pointer',
title: 'වසන්න' }, '✕' ) ) ), !activeThread.post.isConfirmed ? h( 'div', { className: 'bg-amber-400/20 border border-amber-400/30 rounded-xl px-2.5 py-1 text-[10px] text-amber-100 flex items-center gap-1.5' },
h(ShieldAlert, { className: 'w-3 h-3 text-amber-300 shrink-0' }), h('span', null, 'සහය තහවුරු (Confirm) කරන තුරු පෞද්ගලික දුරකථන අංක හා ලිපින හුවමාරුව තහනම්ය.')
) : null ), h( 'div', { className: 'bg-slate-900 dark:bg-[#03120a] border-b border-emerald-800/60 px-3 py-2 text-white flex flex-wrap items-center justify-between gap-2 shrink-0' },
h( 'div', { className: 'flex items-center gap-2 flex-wrap' }, h( 'div', { className: 'flex items-center gap-1.5 bg-emerald-950/90 border border-emerald-500/60 px-2.5 py-1 rounded-xl shadow-inner text-xs' },
h('span', { className: 'text-[10px] text-emerald-300 font-bold' }, 'ඔබගේ භාෂාව (ස්ථිරයි):'), h( 'select', { value: userLang, onChange: (e: any) => handleSelectOwnLanguage(e.target.value as Language),
className: 'bg-emerald-900 text-white font-black text-xs rounded-lg px-2 py-0.5 border border-emerald-400/40 focus:outline-none cursor-pointer'
}, h('option', { value: 'si' }, 'සිංහල 🇱🇰'), h('option', { value: 'ta' }, 'தமிழ் 🇱🇰'), h('option', { value: 'en' }, 'English 🇬🇧')
) ), h( 'div', { className: 'flex items-center gap-1.5 bg-slate-800/90 border border-slate-600/60 px-2.5 py-1 rounded-xl text-xs select-none opacity-90',
title: 'අනෙක් පාර්ශ්වයේ භාෂාව ඔබට වෙනස් කළ නොහැක' }, h(Lock, { className: 'w-3 h-3 text-amber-400 shrink-0' }), h('span', { className: 'text-[10px] text-slate-300 font-bold' }, 'අනෙක් පාර්ශ්වය:'),
h('span', { className: 'text-xs font-black text-amber-300' }, otherLangInfo.badge) ) ), h( 'div', { className: 'flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2.5 py-1 rounded-xl font-bold' },
h(Sparkles, { className: 'w-3 h-3 text-amber-300' }), h('span', null, 'Auto-Translate (' + userLangInfo.nativeName + ')') ) ), h( 'div',
{ className: 'flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 bg-[#f0f2f5] dark:bg-[#040e08]' }, messages.map((msg: any, msgIdx: number) => {
const mine = isMeMessage(msg); const isConfirmed = Boolean(activeThread.post.isConfirmed); const isRedacted = Boolean(msg.text && msg.text.includes('[🔒'));
const resolved = resolveDisplayedMessageText(msg, mine, isConfirmed); const showOrig = Boolean(toggledOriginals[msg.id]); const formattedPhone = msg.senderPhone ? msg.senderPhone.replace(/^0/, '94').replace(/\D/g, '') : '';
return h( 'div', { key: (msg.id ? msg.id : 'im') + '_' + msgIdx, className: 'flex items-end gap-2 ' + (mine ? 'justify-end' : 'justify-start')
}, !mine ? h( 'div', { className: 'w-8 h-8 rounded-full bg-gradient-to-br from-[#0084ff] to-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs' },
(msg.senderName ? msg.senderName : 'U').charAt(0).toUpperCase() ) : null, h( 'div', { className: 'flex flex-col max-w-[82%] sm:max-w-[75%] ' + (mine ? 'items-end' : 'items-start') },
h( 'div', { className: 'flex items-center gap-1.5 mb-0.5 px-1 text-[10px] text-slate-500 dark:text-slate-400' }, h('span', { className: 'font-bold' }, mine ? 'ඔබ (You)' : msg.senderName),
h('span', null, '•'), h('span', { className: 'font-mono text-[9px]' }, msg.timestamp) ), h( 'div', { className: 'px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs transition-all ' +
(mine ? 'bg-gradient-to-r from-[#0084ff] via-emerald-600 to-teal-600 text-white rounded-br-xs' : isRedacted ? 'bg-amber-50 dark:bg-amber-950/50 text-slate-900 dark:text-slate-100 border border-amber-300 rounded-bl-xs'
: 'bg-white dark:bg-[#0c2217] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-[#19422d] rounded-bl-xs') },
msg.audioUrl ? h(AudioVoicePlayer, { audioUrl: msg.audioUrl, durationSec: msg.audioDurationSec ? msg.audioDurationSec : 5, isMe: mine
}) : h( 'div', null, h('p', { className: 'whitespace-pre-wrap break-words font-semibold' }, resolved.primaryText), !mine && resolved.isTranslated
? h( 'div', { className: 'mt-1.5 pt-1 border-t border-slate-200/70 dark:border-emerald-900/50 flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400' },
h( 'span', { className: 'flex items-center gap-1 truncate' }, h(Globe, { className: 'w-3 h-3 text-emerald-600 shrink-0' }), h('span', { className: 'truncate' }, showOrig ? 'මුල් පණිවිඩය (Original)' : userLangInfo.nativeName + ' බසට පරිවර්තනය විය')
), h( 'button', { type: 'button', onClick: () => toggleShowOriginal(msg.id), className: 'font-black text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 cursor-pointer'
}, showOrig ? 'පරිවර්තනය බලන්න' : 'මුල් පණිවිඩය' ) ) : null ), isConfirmed && activeThread.post.revealContactConsent !== false && !mine && msg.senderPhone
? h( 'div', { className: 'mt-2 pt-1.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2 text-[10px]' },
h('span', { className: 'text-slate-600 dark:text-slate-300 font-mono' }, '📞 ' + msg.senderPhone), h( 'a', { href: 'https://wa.me/' + formattedPhone,
target: '_blank', rel: 'noopener noreferrer', className: 'px-2 py-0.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded font-bold'
}, 'WhatsApp' ) ) : null, mine ? h( 'div', { className: 'mt-1 flex items-center justify-end gap-1 text-[9px] text-emerald-100/90' },
h(Check, { className: 'w-3 h-3' }), h('span', null, 'Sent') ) : null ) ) ); }), h('div', { ref: chatBottomRef }) ), h( 'div', { className: 'p-3 bg-white dark:bg-[#06180f] border-t border-slate-200 dark:border-[#0e3a24] shrink-0' },
isRecordingVoice ? h(AudioVoiceRecorder, { senderName: user?.name ? user.name : 'User', sourceContext: 'Direct Chat', onSendAudio: handleSendVoiceAudio,
onCancel: () => setIsRecordingVoice(false) }) : h( 'form', { onSubmit: handleSend, className: 'flex items-center gap-2' }, h( 'button',
{ type: 'button', onClick: () => setIsRecordingVoice(true), className: 'w-10 h-10 rounded-full bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer',
title: 'හඬ පණිවිඩයක් (Voice Note)' }, h(Mic, { className: 'w-4 h-4' }) ), h( 'div', { className: 'flex-1 relative' }, h('input', { type: 'text',
value: inputText, onChange: (e: any) => setInputText(e.target.value), placeholder: userLang === 'en' ? 'Type a message in English (Auto-translates)...'
: userLang === 'ta' ? 'உங்கள் செய்தியை தட்டச்சு செய்யவும்...' : 'පණිවිඩය ලියන්න (අනෙක් පාර්ශ්වයේ භාෂාවට ස්වයංක්‍රීයව හැරවේ)...', className: 'w-full px-4 py-2.5 bg-[#f0f2f5] dark:bg-[#040e08] border border-slate-300 dark:border-emerald-800/80 rounded-full text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium pr-9'
}), h( 'div', { className: 'absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none' }, userLangInfo.flag ) ), h( 'button',
{ type: 'submit', disabled: !inputText.trim() ? true : isSending, className: 'px-4 sm:px-5 py-2.5 bg-gradient-to-r from-[#0084ff] via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-full shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer'
}, h('span', null, userLang === 'en' ? 'Send' : userLang === 'ta' ? 'அனுப்புக' : 'යවන්න'), h(Send, { className: 'w-3.5 h-3.5' }) ) )
) ) ) ) ), h(PolicyViolationModal, { isOpen: showPolicyModal, onClose: () => setShowPolicyModal(false), strikes: policyStrikes, isBlocked: isBlocked,
onNavigateToIssues: onNavigateToIssues, detectedTypes: detectedViolationTypes }) );
};

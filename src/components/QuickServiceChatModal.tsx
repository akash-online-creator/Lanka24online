import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
Send,
ShieldAlert,
MessageCircle,
User as UserIcon,
Phone,
Lock,
CheckCircle,
Mic,
Sparkles,
Globe,
Search,
Users,
CheckCheck
} from 'lucide-react';
import { HelpPost, ChatMessage, User as UserType, Language } from '../types';
import { checkIsPostOwner } from '../utils/postOwnerHelper';
import { subscribeToChatMessages, sendChatMessageToFirestore } from '../lib/firebase';
import { parseTimeToMs, formatMessageClockTime } from '../utils/dateUtils';
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
export interface QuickServiceChatModalProps {
post: any;
isOpen: boolean;
onClose: () => void;
currentUser?: any;
user?: any;
onNavigateToIssues?: () => void;
onOpenConfirm?: (post: HelpPost) => void;
onConfirmWorkflow?: (post: HelpPost) => void;
onUpdatePost?: (post: HelpPost) => void;
language?: Language;
lang?: Language;
}
export const QuickServiceChatModal = ({ post, isOpen, onClose, currentUser: currentUserProp, user: userProp, onNavigateToIssues, onOpenConfirm,
onConfirmWorkflow, language = 'si', lang, }: QuickServiceChatModalProps) => {
const currentUser = (currentUserProp ? currentUserProp : userProp) as UserType;
const activePropLang = (lang ? lang : language ? language : 'si') as Language;
const handleConfirm = onConfirmWorkflow ? onConfirmWorkflow : onOpenConfirm;
const userKey = currentUser?.userId
? currentUser.userId
: (currentUser as any)?.id
? (currentUser as any).id
: currentUser?.phone
? currentUser.phone
: currentUser?.nicNumber
? currentUser.nicNumber
: currentUser?.name
? currentUser.name
: 'user';
const [userLang, setUserLangState] = useState(() => loadPermanentUserLang(userKey, activePropLang));
const [allPostMessages, setAllPostMessages] = useState([] as ChatMessage[]);
const [selectedPartnerKey, setSelectedPartnerKey] = useState('');
const [partnerSearch, setPartnerSearch] = useState('');
const [inputText, setInputText] = useState('');
const [isSending, setIsSending] = useState(false);
const [isRecordingVoice, setIsRecordingVoice] = useState(false);
const [toggledOriginals, setToggledOriginals] = useState({} as any);
const [liveTranslations, setLiveTranslations] = useState({} as any);
const chatBottomRef = useRef(null as any);
const [showPolicyModal, setShowPolicyModal] = useState(false);
const [policyStrikes, setPolicyStrikes] = useState(() => getUserStrikes(userKey));
const [isBlocked, setIsBlocked] = useState(() => isUserPolicyBlocked(userKey));
const [detectedViolationTypes, setDetectedViolationTypes] = useState([] as any[]);
useEffect(() => { const saved = loadPermanentUserLang(userKey, activePropLang); setUserLangState(saved); }, [userKey, isOpen]);
useEffect(() => { const onLangEvent = (ev: any) => { if (ev && ev.detail && ev.detail.lang) { setUserLangState(ev.detail.lang); } };
window.addEventListener('sahaya_chat_lang_changed', onLangEvent); return () => window.removeEventListener('sahaya_chat_lang_changed', onLangEvent);
}, []);
const handleSelectOwnLanguage = (nextLang: Language) => {
setUserLangState(nextLang);
savePermanentUserLang(nextLang, userKey);
};
useEffect(() => { if (isOpen) { setPolicyStrikes(getUserStrikes(userKey)); setIsBlocked(isUserPolicyBlocked(userKey)); } }, [isOpen, userKey]);
const currentUserPhone = normalizePhoneStr(currentUser?.phone ? currentUser.phone : (currentUser as any)?.whatsappNumber);
const postAuthorPhone = normalizePhoneStr(post?.userPhone);
const currentUserId = currentUser?.userId ? currentUser.userId : (currentUser as any)?.id ? (currentUser as any).id : '';
const isPostAuthor = Boolean( post && currentUser && (checkIsPostOwner(currentUser, post) ? true : currentUser.name && post.userName && currentUser.name.trim().toLowerCase() === post.userName.trim().toLowerCase()
? true : currentUserId && post.userId && currentUserId === post.userId ? true : currentUserPhone && postAuthorPhone && currentUserPhone === postAuthorPhone)
);
const isMeMessage = (msg: any): boolean => {
if (!msg ? true : !currentUser) return false;
if (msg.senderId && currentUserId && msg.senderId === currentUserId) return true;
if (currentUser.name && msg.senderName && msg.senderName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true;
const msgPhone = normalizePhoneStr(msg.senderPhone);
if (msgPhone && currentUserPhone && (msgPhone === currentUserPhone ? true : msgPhone.slice(-7) === currentUserPhone.slice(-7))) return true;
return false;
};
useEffect(() => { if (!isOpen ? true : !post?.id) return; const unsubscribe = subscribeToChatMessages(post.id, (firestoreMsgs) => {
const combined: ChatMessage[] = []; if (Array.isArray(post.replies)) { post.replies.forEach((rep: any, rIdx: number) => { if (!rep) return;
const isDup = (firestoreMsgs ? firestoreMsgs : []).some( (m) => Boolean( m && m.text && rep.message && m.text.trim() === rep.message.trim() &&
m.senderName && rep.responderName && m.senderName.trim() === rep.responderName.trim() ) ); if (!isDup) { const repMs = rep.createdAtMs ? rep.createdAtMs : parseTimeToMs(rep.createdAt);
combined.push({ id: rep.id ? rep.id : 'rep_' + rIdx, senderName: rep.responderName ? rep.responderName : 'සහායක', senderRole: 'helper',
text: rep.message ? rep.message : 'ඉක්මන් සේවාව සඳහා සහය වීමට කැමැත්ත පළ කර ඇත.', timestamp: formatMessageClockTime(rep.createdAt, repMs),
createdAtMs: repMs, senderPhone: rep.responderPhone ? rep.responderPhone : '', senderId: rep.responderId ? rep.responderId : '', } as any);
} }); } (firestoreMsgs ? firestoreMsgs : []).forEach((fMsg) => { if (!fMsg) return; const fMs = fMsg.createdAtMs ? fMsg.createdAtMs : parseTimeToMs(fMsg.timestamp);
combined.push({ ...fMsg, createdAtMs: fMs, timestamp: formatMessageClockTime(fMsg.timestamp, fMs), }); }); combined.sort((a, b) => {
const timeA = a.createdAtMs ? a.createdAtMs : parseTimeToMs(a.timestamp); const timeB = b.createdAtMs ? b.createdAtMs : parseTimeToMs(b.timestamp);
return timeA - timeB; }); setAllPostMessages(combined); }); return () => unsubscribe(); }, [isOpen, post?.id, post?.replies]);
const partnersList = useMemo(() => { if (!post) return []; const map: any = {}; const addPartner = (name?: string, phone?: string, id?: string, role?: string, lastText?: string, lastMs?: number) => {
const cleanName = name ? name.trim() : ''; if (!cleanName) return; if (currentUser?.name && cleanName.toLowerCase() === currentUser.name.trim().toLowerCase()) return;
const pKey = makePartnerKey(cleanName, phone, id); if (!map[pKey]) { map[pKey] = { key: pKey, name: cleanName, phone: phone ? phone : '',
id: id ? id : '', role: role ? role : isPostAuthor ? 'helper' : 'seeker', lastMessage: lastText ? lastText : 'සංවාදය ආරම්භ කරන්න', lastTimeMs: lastMs ? lastMs : Date.now(),
}; } else { if (phone && !map[pKey].phone) map[pKey].phone = phone; if (id && !map[pKey].id) map[pKey].id = id; if (lastText && (!map[pKey].lastTimeMs ? true : (lastMs ? Math.max(lastMs, map[pKey].lastTimeMs) === lastMs : false))) {
map[pKey].lastMessage = lastText; if (lastMs) map[pKey].lastTimeMs = lastMs; } } }; if (!isPostAuthor) { addPartner( post.userName ? post.userName : 'දැන්වීම්කරු',
post.userPhone ? post.userPhone : '', post.userId ? post.userId : '', 'seeker', post.whatHappened ? post.whatHappened : 'සංවාදය ආරම්භ කරන්න',
post.createdAtMs ? post.createdAtMs : Date.now() ); } else { if (Array.isArray(post.selectedHelpers)) { post.selectedHelpers.forEach((sh: any) => {
if (sh) addPartner(sh.helperName, sh.helperPhone, sh.helperId, 'helper', 'තෝරාගත් සහායකයා', parseTimeToMs(sh.appliedAt)); }); } if (Array.isArray(post.applicants)) {
post.applicants.forEach((ap: any) => { if (ap) addPartner(ap.helperName, ap.helperPhone, ap.helperId, 'helper', 'සහය වීමට කැමැත්ත පළ කර ඇත', parseTimeToMs(ap.appliedAt));
}); } if (Array.isArray(post.replies)) { post.replies.forEach((rp: any) => { if (rp) addPartner(rp.responderName, rp.responderPhone, rp.responderId, 'helper', rp.message, parseTimeToMs(rp.createdAt));
}); } if (post.confirmedHelperName ? true : post.confirmedBy) { addPartner( post.confirmedHelperName ? post.confirmedHelperName : post.confirmedBy,
post.confirmedHelperPhone ? post.confirmedHelperPhone : '', post.confirmedHelperId ? post.confirmedHelperId : '', 'helper', 'තහවුරු කළ සහායකයා',
Date.now() ); } } (allPostMessages ? allPostMessages : []).forEach((m: any) => { if (!m) return; const mine = isMeMessage(m); if (!mine) {
addPartner(m.senderName, m.senderPhone, m.senderId, m.senderRole, m.text, m.createdAtMs); } else if (m.recipientName) { addPartner(m.recipientName, m.recipientPhone, m.recipientId, isPostAuthor ? 'helper' : 'seeker', m.text, m.createdAtMs);
} }); const list = Object.values(map) as any[]; if (list.length === 0) { list.push({ key: isPostAuthor ? 'default_helper' : makePartnerKey(post.userName, post.userPhone, post.userId),
name: isPostAuthor ? (post.confirmedHelperName ? post.confirmedHelperName : 'සහායකයා') : (post.userName ? post.userName : 'දැන්වීම්කරු'),
phone: isPostAuthor ? (post.confirmedHelperPhone ? post.confirmedHelperPhone : '') : (post.userPhone ? post.userPhone : ''), id: isPostAuthor ? (post.confirmedHelperId ? post.confirmedHelperId : '') : (post.userId ? post.userId : ''),
role: isPostAuthor ? 'helper' : 'seeker', lastMessage: 'සංවාදය ආරම්භ කරන්න', lastTimeMs: Date.now(), }); } list.sort((a, b) => (b.lastTimeMs ? b.lastTimeMs : 0) - (a.lastTimeMs ? a.lastTimeMs : 0));
return list; }, [post, allPostMessages, isPostAuthor, currentUser]);
useEffect(() => { if (partnersList.length !== 0) { const exists = partnersList.some((p) => p.key === selectedPartnerKey); if (!selectedPartnerKey ? true : !exists) {
setSelectedPartnerKey(partnersList[0].key); } } }, [partnersList, selectedPartnerKey]);
const activePartner = useMemo(() => { const found = partnersList.find((p) => p.key === selectedPartnerKey); return found ? found : partnersList[0] ? partnersList[0] : null;
}, [partnersList, selectedPartnerKey]);
const activePartnerMessages = useMemo(() => { if (!post ? true : !activePartner) return []; const localSaved = loadLocalPartnerMessages(post.id, activePartner.key);
const filteredCloud = (allPostMessages ? allPostMessages : []).filter((m: any) => { if (!m) return false; if (!isPostAuthor) { const mine = isMeMessage(m);
if (mine) return true; const fromAuthor = Boolean( m.senderRole === 'seeker' ? true : post.userName && m.senderName && m.senderName.trim().toLowerCase() === post.userName.trim().toLowerCase()
? true : m.recipientKey && m.recipientKey === makePartnerKey(currentUser?.name, currentUserPhone, currentUserId) ); return fromAuthor;
} const mSenderKey = makePartnerKey(m.senderName, m.senderPhone, m.senderId); if (mSenderKey === activePartner.key) return true; if (m.senderName && activePartner.name && m.senderName.trim().toLowerCase() === activePartner.name.trim().toLowerCase()) return true;
const mine = isMeMessage(m); if (mine) { if (m.recipientKey && m.recipientKey === activePartner.key) return true; if (m.recipientName && activePartner.name && m.recipientName.trim().toLowerCase() === activePartner.name.trim().toLowerCase()) return true;
if (!m.recipientKey && !m.recipientName && partnersList.length === 1) return true; } return false; }); const mergedMap: any = {}; localSaved.forEach((lm: any) => {
if (lm && lm.id) mergedMap[lm.id] = lm; }); filteredCloud.forEach((cm: any) => { if (cm && cm.id) mergedMap[cm.id] = cm; }); const finalArr = Object.values(mergedMap) as ChatMessage[];
finalArr.sort((a, b) => { const tA = a.createdAtMs ? a.createdAtMs : parseTimeToMs(a.timestamp); const tB = b.createdAtMs ? b.createdAtMs : parseTimeToMs(b.timestamp);
return tA - tB; }); if (finalArr.length === 0) { const nowMs = Date.now(); const isConfirmed = Boolean(post.isConfirmed); const safeDesc = inspectAndSanitizeMessage(post.whatHappened ? post.whatHappened : 'සේවා ඉල්ලීම', isConfirmed).sanitizedText;
return [ { id: 'init_welcome_' + activePartner.key, senderName: post.userName ? post.userName : 'දැන්වීම්කරු', senderRole: 'seeker',
text: 'සුබ උදෑසනක්! #' + (post.postCode ? post.postCode : 'POST') + ' (' + safeDesc + ') පිළිබඳව සංවාදය මෙතැනින් ආරම්භ කරන්න.', timestamp: formatMessageClockTime(undefined, nowMs),
createdAtMs: nowMs, senderPhone: post.userPhone ? post.userPhone : '', senderLang: 'si', } as any, ]; } return finalArr; }, [post, activePartner, allPostMessages, isPostAuthor, partnersList.length]);
useEffect(() => { if (!isOpen ? true : activePartnerMessages.length === 0) return; let isMounted = true; activePartnerMessages.forEach((msg: any) => {
if (!msg ? true : !msg.text ? true : msg.audioUrl) return; const mine = isMeMessage(msg); if (mine) return; const cacheKey = msg.id + '_' + userLang;
if (liveTranslations[cacheKey]) return; const exactGreeting = instantExactGreetingTranslate(msg.text, userLang); if (exactGreeting) {
if (isMounted) { setLiveTranslations((prev: any) => ({ ...prev, [cacheKey]: exactGreeting })); } return; } const precomp = msg.translations && msg.translations[userLang] ? msg.translations[userLang] : '';
const dictTrans = translateChatMessage(msg.text, userLang).translatedText; if (precomp && precomp.trim().toLowerCase() !== msg.text.trim().toLowerCase()) {
if (isMounted) { setLiveTranslations((prev: any) => ({ ...prev, [cacheKey]: precomp })); } return; } if (dictTrans && dictTrans.trim().toLowerCase() !== msg.text.trim().toLowerCase()) {
if (isMounted) { setLiveTranslations((prev: any) => ({ ...prev, [cacheKey]: dictTrans })); } return; } const msgDetected = msg.senderLang ? msg.senderLang : detectLanguageOfText(msg.text);
const effectiveSource = msgDetected === 'singlish' ? 'si' : msgDetected; if (effectiveSource !== userLang) { translateWithGoogle(msg.text, userLang).then((gRes) => {
if (isMounted && gRes && gRes.trim()) { setLiveTranslations((prev: any) => ({ ...prev, [cacheKey]: gRes.trim() })); } }).catch(() => {});
} }); return () => { isMounted = false; }; }, [isOpen, activePartnerMessages, userLang]);
const detectedOtherPartyLang = useMemo((): Language => { for (let i = activePartnerMessages.length - 1; Math.max(i, 0) === i; i--) {
const m: any = activePartnerMessages[i]; if (m && !isMeMessage(m)) { if (m.senderLang === 'si' ? true : m.senderLang === 'en' ? true : m.senderLang === 'ta') {
return m.senderLang as Language; } const det = detectLanguageOfText(m.text ? m.text : ''); if (det === 'en') return 'en'; if (det === 'ta') return 'ta';
return 'si'; } } return userLang === 'en' ? 'si' : 'en'; }, [activePartnerMessages, userLang]);
useEffect(() => { if (isOpen) { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); } }, [activePartnerMessages.length, selectedPartnerKey, isOpen]);
if (!isOpen ? true : !post ? true : !currentUser) return null;
const isConfirmed = Boolean(post.isConfirmed);
const handleSend = async (e: React.FormEvent) => {
e.preventDefault();
if (!inputText.trim() ? true : isSending ? true : !activePartner) return;
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
senderName: currentUser?.name ? currentUser.name : 'පරිශීලක',
senderRole: isPostAuthor ? 'seeker' : 'helper',
text: messageTextToSave,
timestamp: formatMessageClockTime(nowIso, nowMs),
createdAt: nowIso,
createdAtMs: nowMs,
senderPhone: currentUser?.phone ? currentUser.phone : (currentUser as any)?.whatsappNumber ? (currentUser as any).whatsappNumber : '',
senderId: currentUserId,
senderLang: userLang,
detectedLang: detected,
originalText: messageTextToSave,
recipientKey: activePartner.key,
recipientName: activePartner.name,
recipientPhone: activePartner.phone ? activePartner.phone : '',
recipientId: activePartner.id ? activePartner.id : '',
translations: {
si: gSi ? gSi : baseTranslations.si,
en: gEn ? gEn : baseTranslations.en,
ta: gTa ? gTa : baseTranslations.ta,
},
};
const localMsgWithId = { ...newMsg, id: 'msg_' + nowMs };
const updatedPartnerMsgs = [...activePartnerMessages.filter((m) => !String(m.id).startsWith('init_welcome_')), localMsgWithId];
saveLocalPartnerMessages(post.id, activePartner.key, updatedPartnerMsgs);
setAllPostMessages((prev) => [...prev, localMsgWithId]);
setIsSending(true);
try {
await sendChatMessageToFirestore(post.id, newMsg);
} catch (err) {
console.error('Failed to send chat message to Firestore:', err);
} finally {
setIsSending(false);
}
};
const handleSendVoiceAudio = async (audioBase64: string, durationSec: number) => {
if (!activePartner) return;
if (isUserPolicyBlocked(userKey)) {
setIsBlocked(true);
setShowPolicyModal(true);
return;
}
const nowIso = new Date().toISOString();
const nowMs = Date.now();
const newMsg: any = {
senderName: currentUser?.name ? currentUser.name : 'පරිශීලක',
senderRole: isPostAuthor ? 'seeker' : 'helper',
text: '🎙️ [හඬ පණිවිඩයක් / Voice Note]',
timestamp: formatMessageClockTime(nowIso, nowMs),
createdAt: nowIso,
createdAtMs: nowMs,
senderPhone: currentUser?.phone ? currentUser.phone : (currentUser as any)?.whatsappNumber ? (currentUser as any).whatsappNumber : '',
senderId: currentUserId,
audioUrl: audioBase64,
audioDurationSec: durationSec,
senderLang: userLang,
recipientKey: activePartner.key,
recipientName: activePartner.name,
recipientPhone: activePartner.phone ? activePartner.phone : '',
recipientId: activePartner.id ? activePartner.id : '',
};
const localMsgWithId = { ...newMsg, id: 'audio_' + nowMs };
const updatedPartnerMsgs = [...activePartnerMessages.filter((m) => !String(m.id).startsWith('init_welcome_')), localMsgWithId];
saveLocalPartnerMessages(post.id, activePartner.key, updatedPartnerMsgs);
setAllPostMessages((prev) => [...prev, localMsgWithId]);
setIsRecordingVoice(false);
setIsSending(true);
try {
await sendChatMessageToFirestore(post.id, newMsg);
} catch (err) {
console.error('Failed to send audio note to Firestore:', err);
} finally {
setIsSending(false);
}
};
const toggleShowOriginal = (msgId: string) => {
setToggledOriginals((prev: any) => ({ ...prev, [msgId]: !prev[msgId], }));
};
const resolveDisplayedMessageText = (msg: any, mine: boolean) => {
const rawSanitized = inspectAndSanitizeMessage(msg.text ? msg.text : '', isConfirmed).sanitizedText;
if (msg.audioUrl) {
return { primaryText: rawSanitized, isTranslated: false, originalText: rawSanitized };
}
if (mine) {
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
translatedText: translatedCandidate,
};
};
const userLangInfo = getLanguageDisplayInfo(userLang);
const otherLangInfo = getLanguageDisplayInfo(detectedOtherPartyLang);
const filteredPartners = partnersList.filter((p) => { if (!partnerSearch.trim()) return true; const q = partnerSearch.toLowerCase().trim();
return p.name.toLowerCase().includes(q) ? true : (p.lastMessage ? p.lastMessage.toLowerCase().includes(q) : false); });
const displayPostCode = post?.postCode && typeof post.postCode === 'string'
? post.postCode.startsWith('#')
? post.postCode
: '#' + post.postCode
: '#POST';
return h( React.Fragment, null, h( 'div', { className: 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn' },
h( 'div', { className: 'w-full max-w-4xl bg-white dark:bg-[#06180f] border-2 border-emerald-500/70 rounded-[2rem] shadow-[0_20px_60px_rgba(0,122,75,0.3)] overflow-hidden flex flex-col md:flex-row h-[90vh] max-h-[760px] relative' },
h( 'div', { className: 'w-full md:w-72 bg-slate-50 dark:bg-[#04120b] border-b md:border-b-0 md:border-r border-slate-200 dark:border-emerald-900/60 flex flex-col shrink-0 max-h-[195px] md:max-h-full' },
h( 'div', { className: 'p-3.5 bg-gradient-to-r from-[#0084ff] via-emerald-700 to-teal-800 text-white flex items-center justify-between' },
h( 'div', { className: 'flex items-center gap-2' }, h(MessageCircle, { className: 'w-5 h-5 text-white' }), h( 'div', null, h('h4', { className: 'text-xs sm:text-sm font-black leading-tight' }, 'Messenger • චැට් ඉතිහාසය'),
h('p', { className: 'text-[10px] text-emerald-100' }, 'පුද්ගලයින් (' + partnersList.length + ')') ) ), h('span', { className: 'text-[10px] font-mono font-black bg-white/20 px-2 py-0.5 rounded-lg' }, displayPostCode)
), h( 'div', { className: 'p-2 border-b border-slate-200 dark:border-emerald-900/40' }, h( 'div', { className: 'relative' }, h(Search, { className: 'w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2' }),
h('input', { type: 'text', value: partnerSearch, onChange: (e: any) => setPartnerSearch(e.target.value), placeholder: 'පුද්ගලයා සොයන්න...',
className: 'w-full pl-8 pr-3 py-1.5 rounded-full bg-white dark:bg-[#071d12] border border-slate-200 dark:border-emerald-800/70 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500'
}) ) ), h( 'div', { className: 'flex-1 overflow-y-auto p-2 space-y-1.5' }, filteredPartners.map((partner: any) => { const isSelected = Boolean(activePartner && activePartner.key === partner.key);
const previewTrans = instantExactGreetingTranslate(partner.lastMessage, userLang) ? instantExactGreetingTranslate(partner.lastMessage, userLang)
: translateChatMessage(partner.lastMessage ? partner.lastMessage : '', userLang).translatedText; return h( 'button', { key: partner.key,
type: 'button', onClick: () => setSelectedPartnerKey(partner.key), className: 'w-full p-2.5 rounded-2xl flex items-center gap-2.5 text-left transition-all cursor-pointer ' +
(isSelected ? 'bg-emerald-600 text-white shadow-md' : 'bg-white dark:bg-[#071c12] hover:bg-emerald-50 dark:hover:bg-[#0c2b1c] text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-emerald-900/40')
}, h( 'div', { className: 'relative shrink-0' }, h( 'div', { className: 'w-10 h-10 rounded-full font-black text-sm flex items-center justify-center shadow-xs ' +
(isSelected ? 'bg-white text-emerald-800' : 'bg-gradient-to-br from-[#0084ff] to-emerald-600 text-white') }, (partner.name ? partner.name : 'U').charAt(0).toUpperCase()
), h('span', { className: 'w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 absolute bottom-0 right-0' })
), h( 'div', { className: 'min-w-0 flex-1' }, h( 'div', { className: 'flex items-center justify-between gap-1' }, h('span', { className: 'text-xs font-black truncate' }, partner.name),
h( 'span', { className: 'text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ' + (isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300')
}, partner.role === 'seeker' ? 'දැන්වීම්කරු' : 'සහායක' ) ), h( 'p', { className: 'text-[11px] truncate mt-0.5 ' + (isSelected ? 'text-emerald-100 font-medium' : 'text-slate-500 dark:text-slate-400') },
previewTrans ? previewTrans : partner.lastMessage ) ) ); }) ) ), h( 'div', { className: 'flex-1 flex flex-col min-w-0 h-full overflow-hidden' },
h( 'div', { className: 'bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 p-3 sm:p-4 text-white border-b border-emerald-600/50 shrink-0 space-y-2' },
h( 'div', { className: 'flex items-center justify-between gap-2' }, h( 'div', { className: 'flex items-center gap-2.5 min-w-0' }, h(
'div', { className: 'relative shrink-0' }, h( 'div', { className: 'w-10 h-10 rounded-full bg-gradient-to-br from-[#0084ff] to-emerald-500 border-2 border-white/40 flex items-center justify-center text-white font-black text-sm shadow-inner' },
(activePartner?.name ? activePartner.name : 'U').charAt(0).toUpperCase() ), h('span', { className: 'w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-emerald-950 absolute bottom-0 right-0' })
), h( 'div', { className: 'min-w-0' }, h( 'div', { className: 'flex items-center gap-1.5 flex-wrap' }, h('h3', { className: 'text-sm sm:text-base font-black text-white truncate' }, activePartner?.name ? activePartner.name : post.userName),
h( 'span', { className: 'text-[9px] bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-1.5 py-0.5 rounded font-bold shrink-0' },
activePartner?.role === 'seeker' ? 'දැන්වීම්කරු' : 'සහායක' ) ), h( 'p', { className: 'text-[11px] text-emerald-100/90 font-medium truncate max-w-xs sm:max-w-md' },
'📌 ' + inspectAndSanitizeMessage(post.whatHappened ? post.whatHappened : '', isConfirmed).sanitizedText ) ) ), h( 'div', { className: 'flex items-center gap-2 shrink-0' },
isConfirmed ? h( 'span', { className: 'text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-black font-mono flex items-center gap-1 shadow-xs' },
h(CheckCircle, { className: 'w-3 h-3' }), h('span', null, 'CONFIRMED') ) : handleConfirm ? h( 'button', { type: 'button', onClick: () => {
onClose(); handleConfirm(post); }, className: 'px-3 py-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1 transition-all active:scale-95 cursor-pointer'
}, h('span', null, 'Confirm') ) : null, h( 'button', { type: 'button', onClick: onClose, className: 'w-8 h-8 rounded-full bg-white/10 hover:bg-rose-600 text-white flex items-center justify-center font-bold text-xs transition-all cursor-pointer shadow-xs',
title: 'වසන්න' }, '✕' ) ) ), !isConfirmed ? h( 'div', { className: 'bg-amber-400/20 border border-amber-400/30 rounded-xl px-2.5 py-1 text-[10px] text-amber-100 flex items-center gap-1.5' },
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
{ className: 'flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 bg-[#f0f2f5] dark:bg-[#040e08]' }, activePartnerMessages.map((msg: any, msgIdx: number) => {
const mine = isMeMessage(msg); const isRedacted = Boolean(msg.text && msg.text.includes('[🔒')); const resolved = resolveDisplayedMessageText(msg, mine);
const formattedPhone = msg.senderPhone ? msg.senderPhone.replace(/^0/, '94').replace(/\D/g, '') : ''; const showOrig = Boolean(toggledOriginals[msg.id]);
return h( 'div', { key: (msg.id ? msg.id : 'm') + '_' + msgIdx, className: 'flex items-end gap-2 ' + (mine ? 'justify-end' : 'justify-start')
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
}, showOrig ? 'පරිවර්තනය බලන්න' : 'මුල් පණිවිඩය' ) ) : null ), isConfirmed && post.revealContactConsent !== false && !mine && msg.senderPhone
? h( 'div', { className: 'mt-2 pt-1.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2 text-[10px]' },
h( 'span', { className: 'text-slate-600 dark:text-slate-300 font-mono flex items-center gap-1' }, h(Phone, { className: 'w-3 h-3 text-emerald-600' }),
h('span', null, msg.senderPhone) ), h( 'a', { href: 'https://wa.me/' + formattedPhone, target: '_blank', rel: 'noopener noreferrer',
className: 'px-2 py-0.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg font-black' }, 'WhatsApp' ) ) : null, mine ? h( 'div',
{ className: 'mt-1 flex items-center justify-end gap-1 text-[9px] text-emerald-100/90' }, h(CheckCheck, { className: 'w-3 h-3' }), h('span', null, 'Sent')
) : null ) ) ); }), h('div', { ref: chatBottomRef }) ), h( 'div', { className: 'p-3 bg-white dark:bg-[#06180f] border-t border-slate-200 dark:border-[#0e3a24] shrink-0' },
isRecordingVoice ? h(AudioVoiceRecorder, { onSendAudio: handleSendVoiceAudio, onCancel: () => setIsRecordingVoice(false) }) : h( 'form',
{ onSubmit: handleSend, className: 'flex items-center gap-2' }, h( 'button', { type: 'button', onClick: () => setIsRecordingVoice(true),
className: 'w-10 h-10 rounded-full bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer',
title: 'හඬ පණිවිඩයක් (Voice Note)' }, h(Mic, { className: 'w-4 h-4' }) ), h( 'div', { className: 'flex-1 relative' }, h('input', { type: 'text',
value: inputText, onChange: (e: any) => setInputText(e.target.value), placeholder: userLang === 'en' ? 'Type a message in English (Auto-translates)...'
: userLang === 'ta' ? 'உங்கள் செய்தியை தட்டச்சு செய்யவும்...' : 'පණිවිඩය ලියන්න (අනෙක් පාර්ශ්වයේ භාෂාවට ස්වයංක්‍රීයව හැරවේ)...', className: 'w-full px-4 py-2.5 bg-[#f0f2f5] dark:bg-[#040e08] border border-slate-300 dark:border-emerald-800/80 rounded-full text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium pr-9'
}), h( 'div', { className: 'absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none' }, userLangInfo.flag ) ), h( 'button',
{ type: 'submit', disabled: !inputText.trim() ? true : isSending, className: 'px-4 sm:px-5 py-2.5 bg-gradient-to-r from-[#0084ff] via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-full shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer'
}, h('span', null, userLang === 'en' ? 'Send' : userLang === 'ta' ? 'அனுப்புக' : 'යවන්න'), h(Send, { className: 'w-3.5 h-3.5' }) ) )
) ) ) ), h(PolicyViolationModal, { isOpen: showPolicyModal, onClose: () => setShowPolicyModal(false), strikes: policyStrikes, isBlocked: isBlocked,
onNavigateToIssues: onNavigateToIssues, detectedTypes: detectedViolationTypes }) );
};

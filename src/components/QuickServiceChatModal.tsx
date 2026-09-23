import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  ShieldAlert, 
  MessageCircle, 
  User as UserIcon, 
  Phone, 
  Lock,
  CheckCircle,
  Mic,
  Languages,
  Sparkles,
  ArrowRightLeft,
  Globe,
  HelpCircle
} from 'lucide-react';
import { HelpPost, ChatMessage, User as UserType, Language } from '../types';
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
import { PolicyViolationModal } from './PolicyViolationModal';
import { AudioVoiceRecorder, AudioVoicePlayer } from './AudioVoiceNote';

interface QuickServiceChatModalProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onNavigateToIssues?: () => void;
  onOpenConfirm?: (post: HelpPost) => void;
  language?: Language;
}

export const QuickServiceChatModal: React.FC<QuickServiceChatModalProps> = ({
  post,
  isOpen,
  onClose,
  currentUser,
  onNavigateToIssues,
  onOpenConfirm,
  language = 'si',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Active view languages for both parties in the chat
  const [userLang, setUserLang] = useState<Language>(language || 'si');
  const [otherPartyLang, setOtherPartyLang] = useState<Language>(() => {
    if (language === 'en') return 'si';
    return 'en';
  });

  // Track which messages have "show original" toggled on
  const [toggledOriginals, setToggledOriginals] = useState<Record<string, boolean>>({});

  // Policy Guard Modal State
  const userKey = currentUser?.userId || currentUser?.phone || currentUser?.nicNumber || currentUser?.name || 'user';
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyStrikes, setPolicyStrikes] = useState<number>(() => getUserStrikes(userKey));
  const [isBlocked, setIsBlocked] = useState<boolean>(() => isUserPolicyBlocked(userKey));
  const [detectedViolationTypes, setDetectedViolationTypes] = useState<('phone' | 'link' | 'address')[]>([]);

  // Update language state when prop changes
  useEffect(() => {
    if (language) {
      setUserLang(language);
      setOtherPartyLang(language === 'en' ? 'si' : 'en');
    }
  }, [language]);

  // Update strikes from storage whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setPolicyStrikes(getUserStrikes(userKey));
      setIsBlocked(isUserPolicyBlocked(userKey));
    }
  }, [isOpen, userKey]);

  // Subscribe to real-time chat messages from Firestore
  useEffect(() => {
    if (!isOpen || !post?.id) return;

    const unsubscribe = subscribeToChatMessages(post.id, (firestoreMsgs) => {
      // Build a unified message history list
      const combined: ChatMessage[] = [];

      // If post replies exist, convert any legacy/form replies not already in subcollection
      if (post.replies && post.replies.length > 0) {
        post.replies.forEach((rep) => {
          const isAlreadyInMsgs = firestoreMsgs.some(
            (m) => m.text.trim() === rep.message.trim() && m.senderName.trim() === rep.responderName.trim()
          );
          if (!isAlreadyInMsgs) {
            const isAuthorRep = 
              Boolean(post.userName && rep.responderName && rep.responderName.trim().toLowerCase() === post.userName.trim().toLowerCase()) ||
              Boolean(postAuthorPhone && rep.responderPhone && normalizePhone(rep.responderPhone) === postAuthorPhone);

            const repMs = rep.createdAtMs || parseTimeToMs(rep.createdAt);
            combined.push({
              id: rep.id || `reply_${Math.random()}`,
              senderName: rep.responderName || (isAuthorRep ? post.userName : 'සහායක'),
              senderRole: isAuthorRep ? 'seeker' : 'helper',
              text: rep.message || '',
              timestamp: formatMessageClockTime(rep.createdAt, repMs),
              createdAtMs: repMs,
              senderPhone: rep.responderPhone || '',
            });
          }
        });
      }

      // Add all Firestore subcollection chat messages
      firestoreMsgs.forEach((fMsg) => {
        const fMs = fMsg.createdAtMs || parseTimeToMs(fMsg.timestamp);
        combined.push({
          ...fMsg,
          createdAtMs: fMs,
          timestamp: formatMessageClockTime(fMsg.timestamp, fMs),
        });
      });

      // Strict chronological sorting by time ascending (earliest top, newest bottom)
      combined.sort((a, b) => {
        const timeA = a.createdAtMs || parseTimeToMs(a.timestamp);
        const timeB = b.createdAtMs || parseTimeToMs(b.timestamp);
        return timeA - timeB;
      });

      if (combined.length > 0) {
        setMessages(combined);
      } else {
        // Default initial greeting if no messages exist yet
        const nowMs = Date.now();
        const safeDesc = inspectAndSanitizeMessage(post.whatHappened || 'ඉල්ලීම', isConfirmed).sanitizedText;
        setMessages([
          {
            id: 'init_1',
            senderName: post.userName,
            senderRole: 'seeker',
            text: `හලෝ, මගේ #${post.postCode} ("${safeDesc}") දැන්වීම සඳහා සහය ලබා ගැනීමට සංවාදය මෙතැනින් ආරම්භ කරන්න.`,
            timestamp: formatMessageClockTime(undefined, nowMs),
            createdAtMs: nowMs,
            senderPhone: post.userPhone || '',
          },
        ]);
      }
    });

    return () => unsubscribe();
  }, [isOpen, post?.id, post?.userName, post?.whatHappened, post?.userPhone, post?.postCode, post?.replies]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen || !post || !currentUser) return null;

  const normalizePhone = (phone?: string) => (phone ? phone.replace(/\D/g, '') : '');
  const currentUserPhone = normalizePhone(currentUser.phone || currentUser.whatsappNumber);
  const postAuthorPhone = normalizePhone(post.userPhone);

  const isPostAuthor = Boolean(
    (currentUser.name && post.userName && currentUser.name.trim().toLowerCase() === post.userName.trim().toLowerCase()) ||
    (currentUser.userId && post.userId && (currentUser.userId === post.userId || (currentUser.id && currentUser.id === post.userId))) ||
    (currentUser.id && post.userId && currentUser.id === post.userId) ||
    (currentUserPhone && postAuthorPhone && currentUserPhone === postAuthorPhone)
  );

  const isConfirmed = Boolean(post.isConfirmed);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    // 1. Check if user is already blocked due to >3 strikes
    if (isUserPolicyBlocked(userKey)) {
      setIsBlocked(true);
      setShowPolicyModal(true);
      return;
    }

    const rawText = inputText.trim();
    setInputText('');

    // 2. AI & Smart Policy Inspection before confirmation
    const policyResult = inspectAndSanitizeMessage(rawText, isConfirmed);

    let messageTextToSave = rawText;

    if (policyResult.hasViolation) {
      // Redact private info so the other person CANNOT see it
      messageTextToSave = policyResult.sanitizedText;

      // Increment policy violation strike
      const record = recordPolicyViolation(userKey);
      setPolicyStrikes(record.newStrikes);
      setIsBlocked(record.isBlocked);
      setDetectedViolationTypes(policyResult.detectedTypes);
      setShowPolicyModal(true);
    }

    // 3. Generate multi-language translations (Singlish / Sinhala / English / Tamil)
    const generatedTranslations = getChatTranslations(messageTextToSave, userLang);
    const detected = detectLanguageOfText(messageTextToSave);

    const nowMs = Date.now();
    const newMsg: Omit<ChatMessage, 'id'> = {
      senderName: currentUser.name || 'පරිශීලක',
      senderRole: isPostAuthor ? 'seeker' : 'helper',
      text: messageTextToSave,
      timestamp: formatMessageClockTime(undefined, nowMs),
      createdAtMs: nowMs,
      senderPhone: currentUser.phone || currentUser.whatsappNumber || '',
      senderLang: userLang,
      detectedLang: detected,
      originalText: messageTextToSave,
      translations: {
        si: generatedTranslations.si,
        en: generatedTranslations.en,
        ta: generatedTranslations.ta,
      },
    };

    // Optimistically update local state
    setMessages((prev) => [
      ...prev,
      {
        ...newMsg,
        id: `local_msg_${nowMs}`,
      },
    ]);

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
    if (isUserPolicyBlocked(userKey)) {
      setIsBlocked(true);
      setShowPolicyModal(true);
      return;
    }

    const nowMs = Date.now();
    const newMsg: Omit<ChatMessage, 'id'> = {
      senderName: currentUser.name || 'පරිශීලක',
      senderRole: isPostAuthor ? 'seeker' : 'helper',
      text: '🎙️ [හඬ පණිවිඩයක් / Voice Note]',
      timestamp: formatMessageClockTime(undefined, nowMs),
      createdAtMs: nowMs,
      senderPhone: currentUser.phone || currentUser.whatsappNumber || '',
      audioUrl: audioBase64,
      audioDurationSec: durationSec,
      senderLang: userLang,
    };

    setMessages((prev) => [
      ...prev,
      {
        ...newMsg,
        id: `local_audio_${nowMs}`,
      },
    ]);

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
    setToggledOriginals((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const userLangInfo = getLanguageDisplayInfo(userLang);
  const otherLangInfo = getLanguageDisplayInfo(otherPartyLang);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-2xl bg-white dark:bg-[#06180f] border-2 border-emerald-500/70 rounded-[2rem] shadow-[0_20px_60px_rgba(0,122,75,0.3)] overflow-hidden flex flex-col h-[90vh] max-h-[750px] relative">
          
          {/* Top Chat Header */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 p-3 sm:p-4 text-white border-b border-emerald-600/50 shrink-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner shrink-0">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm sm:text-base font-black text-white truncate">
                      {isPostAuthor ? 'සහායකයා සමඟ සංවාදය' : post.userName}
                    </h3>
                    <span className="text-[9px] bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-1.5 py-0.2 rounded font-bold shrink-0">
                      {isPostAuthor ? 'සහායක' : 'දැන්වීම්කරු'}
                    </span>
                  </div>
                  {/* ගැටලුව (කෙටියෙන්, කුඩාවට) */}
                  <p className="text-[11px] text-emerald-100/90 font-medium truncate max-w-xs sm:max-w-md">
                    📌 {inspectAndSanitizeMessage(post.whatHappened || '', isConfirmed).sanitizedText}
                  </p>
                </div>
              </div>

              {/* Confirm Button + Help ID එක (Swapped positions) */}
              <div className="flex items-center gap-2 shrink-0">
                {isConfirmed ? (
                  <span className="text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-black font-mono flex items-center gap-1 shadow-sm">
                    <CheckCircle className="w-3 h-3" />
                    <span>CONFIRMED</span>
                  </span>
                ) : isPostAuthor ? (
                  <span className="text-[10px] bg-emerald-900/70 text-emerald-200 border border-emerald-500/40 px-2 py-1 rounded-lg font-bold">
                    ඔබගේ දැන්වීමකි
                  </span>
                ) : (
                  onOpenConfirm && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenConfirm(post);
                      }}
                      className="px-3 py-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                    >
                      <span>Confirm</span>
                    </button>
                  )
                )}

                <span className="bg-white/20 text-white font-mono text-[11px] px-2 py-1 rounded-lg border border-white/20 font-black">
                  {post.postCode.startsWith('#') ? post.postCode : `#${post.postCode}`}
                </span>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-rose-600 text-white flex items-center justify-center font-bold text-xs transition-all cursor-pointer shadow-sm"
                  title="වසන්න"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* PRIVACY & SECURITY POLICY BANNER */}
            {!isConfirmed && (
              <div className="bg-amber-400/20 border border-amber-400/30 rounded-xl px-2.5 py-1 text-[10px] text-amber-100 flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3 text-amber-300 shrink-0" />
                <span>සහය තහවුරු (Confirm) කරන තුරු පෞද්ගලික දුරකථන අංක හා ලිපින හුවමාරුව තහනම්ය.</span>
              </div>
            )}
          </div>

          {/* DUAL-LANGUAGE REAL-TIME TRANSLATION BAR (දෙදෙනාගේ භාෂා දෙක ඉහලින් පෙන්වීම) */}
          <div className="bg-slate-900 dark:bg-[#03120a] border-b border-emerald-800/60 px-3 py-2 text-white flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* User Language Pill */}
              <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-1 rounded-xl shadow-inner text-xs">
                <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">ඔබගේ භාෂාව:</span>
                <select
                  value={userLang}
                  onChange={(e) => setUserLang(e.target.value as Language)}
                  className="bg-emerald-900/90 text-white font-black text-xs rounded-lg px-2 py-0.5 border border-emerald-400/40 focus:outline-none cursor-pointer"
                >
                  <option value="si">සිංහල 🇱🇰</option>
                  <option value="en">English 🇬🇧</option>
                  <option value="ta">தமிழ் 🇱🇰</option>
                </select>
              </div>

              {/* Exchange Arrow Icon */}
              <div className="p-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                <ArrowRightLeft className="w-3.5 h-3.5 animate-pulse" />
              </div>

              {/* Other Party Language Pill */}
              <div className="flex items-center gap-1.5 bg-teal-950/80 border border-teal-500/50 px-2.5 py-1 rounded-xl shadow-inner text-xs">
                <span className="text-[10px] text-teal-300 font-bold uppercase tracking-wider">අනෙක් පාර්ශ්වය:</span>
                <select
                  value={otherPartyLang}
                  onChange={(e) => setOtherPartyLang(e.target.value as Language)}
                  className="bg-teal-900/90 text-white font-black text-xs rounded-lg px-2 py-0.5 border border-teal-400/40 focus:outline-none cursor-pointer"
                >
                  <option value="en">English 🇬🇧</option>
                  <option value="si">සිංහල 🇱🇰</option>
                  <option value="ta">தமிழ் 🇱🇰</option>
                </select>
              </div>
            </div>

            {/* Real-Time Auto-Translate Badge */}
            <div className="flex items-center gap-1.5 text-[10px] bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-400/40 px-2.5 py-1 rounded-xl font-bold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Auto-Translate Active (Singlish / සිංහල ⇄ English / தமிழ்)</span>
            </div>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3.5 bg-[#f6faf8] dark:bg-[#040e08]">
            {(messages || []).map((msg, msgIdx) => {
              const isMe = 
                (currentUser.name && msg.senderName && msg.senderName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
                (msg.senderPhone && currentUserPhone && normalizePhone(msg.senderPhone) === currentUserPhone);

              const isSeeker = 
                msg.senderRole === 'seeker' || 
                (post.userName && msg.senderName && msg.senderName.trim().toLowerCase() === post.userName.trim().toLowerCase());

              const formattedPhone = msg.senderPhone
                ? msg.senderPhone.replace(/^0/, '94').replace(/\D/g, '')
                : '';

              const isRedacted = msg.text.includes('[🔒');
              const showOriginal = Boolean(toggledOriginals[msg.id]);

              // Multi-language Text Resolution
              const rawSanitized = inspectAndSanitizeMessage(msg.text, isConfirmed).sanitizedText;
              
              // Determine what text to display based on viewer's active language
              let primaryText = rawSanitized;
              let secondaryTranslationText = '';
              let isAutoTranslated = false;
              let originalSourceText = msg.originalText || rawSanitized;

              if (msg.audioUrl) {
                primaryText = rawSanitized;
              } else {
                // If message has pre-computed translations:
                if (msg.translations && msg.translations[userLang]) {
                  if (isMe) {
                    // Sender sees what they typed, plus a translation preview for the recipient
                    primaryText = showOriginal ? (msg.translations[otherPartyLang] || rawSanitized) : rawSanitized;
                    secondaryTranslationText = msg.translations[otherPartyLang] || '';
                    if (secondaryTranslationText && secondaryTranslationText.trim().toLowerCase() !== rawSanitized.trim().toLowerCase()) {
                      isAutoTranslated = true;
                    }
                  } else {
                    // Recipient sees message in THEIR active language
                    const translatedForUser = msg.translations[userLang] || rawSanitized;
                    primaryText = showOriginal ? rawSanitized : translatedForUser;
                    secondaryTranslationText = rawSanitized;
                    if (translatedForUser.trim().toLowerCase() !== rawSanitized.trim().toLowerCase()) {
                      isAutoTranslated = true;
                    }
                  }
                } else {
                  // Real-time on-the-fly translation fallback
                  const transResult = translateChatMessage(rawSanitized, userLang);
                  if (isMe) {
                    const otherTrans = translateChatMessage(rawSanitized, otherPartyLang);
                    primaryText = rawSanitized;
                    secondaryTranslationText = otherTrans.translatedText;
                    if (otherTrans.translatedText && otherTrans.translatedText !== rawSanitized) {
                      isAutoTranslated = true;
                    }
                  } else {
                    primaryText = showOriginal ? rawSanitized : (transResult.translatedText || rawSanitized);
                    secondaryTranslationText = rawSanitized;
                    if (transResult.translatedText && transResult.translatedText !== rawSanitized) {
                      isAutoTranslated = true;
                    }
                  }
                }
              }

              return (
                <div
                  key={`qs_msg_${msg.id || 'm'}_${msgIdx}`}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  {/* Meta header */}
                  <div className={`flex items-center gap-1.5 mb-1 text-[10px] ${isMe ? 'flex-row-reverse text-emerald-800 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    <UserIcon className="w-3 h-3 text-[#007a4b] dark:text-[#00c880]" />
                    <span className="font-bold">
                      {isMe ? 'ඔබ (You)' : msg.senderName}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                      isSeeker 
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' 
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    }`}>
                      {isSeeker ? 'දැන්වීම්කරු' : 'සහායකයා'}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[10px]">{msg.timestamp}</span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[88%] sm:max-w-[82%] px-4 py-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-sm transition-all ${
                      isMe
                        ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-tr-none shadow-emerald-950/20'
                        : isRedacted
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-slate-800 dark:text-slate-100 border border-amber-300 dark:border-amber-800/80 rounded-tl-none'
                        : 'bg-white dark:bg-[#0c2217] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-[#19422d] rounded-tl-none shadow-slate-900/5'
                    }`}
                  >
                    {msg.audioUrl ? (
                      <div className="space-y-1">
                        <AudioVoicePlayer
                          audioUrl={msg.audioUrl}
                          durationSec={msg.audioDurationSec || 5}
                          isMe={isMe}
                        />
                      </div>
                    ) : (
                      <div>
                        {/* Main Message Text */}
                        <p className="whitespace-pre-wrap break-words font-medium">
                          {primaryText}
                        </p>

                        {/* Translation status & toggle UI */}
                        {isAutoTranslated && (
                          <div className={`mt-2 pt-1.5 border-t text-[10px] flex items-center justify-between gap-2 ${
                            isMe ? 'border-white/20 text-emerald-100' : 'border-slate-200 dark:border-emerald-900/40 text-slate-500 dark:text-slate-400'
                          }`}>
                            <div className="flex items-center gap-1 min-w-0">
                              <Globe className="w-3 h-3 text-amber-300 shrink-0" />
                              <span className="truncate">
                                {isMe 
                                  ? `Auto-translated to ${otherLangInfo.nativeName}: "${secondaryTranslationText}"` 
                                  : showOriginal 
                                    ? `Showing original text (${msg.detectedLang || 'Sinhala/Singlish'})` 
                                    : `Auto-translated into ${userLangInfo.nativeName}`}
                              </span>
                            </div>

                            {!isMe && (
                              <button
                                type="button"
                                onClick={() => toggleShowOriginal(msg.id)}
                                className={`font-bold hover:underline shrink-0 cursor-pointer ml-1 ${
                                  isMe ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {showOriginal ? 'පරිවර්තනය (Translate)' : 'මුල් පණිවිඩය (Original)'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Contact Button: ONLY show if post is confirmed AND contact consent is granted */}
                    {isConfirmed && post.revealContactConsent !== false && !isMe && msg.senderPhone && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{msg.senderPhone}</span>
                        </span>
                        <a
                          href={`https://wa.me/${formattedPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg font-black flex items-center gap-1 shadow-sm"
                        >
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    )}

                    {!isConfirmed && !isMe && (
                      <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 italic">
                        <Lock className="w-2.5 h-2.5" />
                        <span>තහවුරු කිරීමෙන් පසු සබඳතා අංක දිස්වේ</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Message Input Bar */}
          <div className="p-3 sm:p-4 bg-white dark:bg-[#06180f] border-t border-emerald-200 dark:border-[#0e3a24] shrink-0">
            {isRecordingVoice ? (
              <AudioVoiceRecorder
                onSendAudio={handleSendVoiceAudio}
                onCancel={() => setIsRecordingVoice(false)}
              />
            ) : (
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecordingVoice(true)}
                  className="p-3 rounded-2xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0 transition-all active:scale-95 cursor-pointer"
                  title="කෙටි හඬ පණිවිඩයක් පටිගත කරන්න (Voice Note)"
                >
                  <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isConfirmed 
                        ? userLang === 'en'
                          ? "Type your message in English / Singlish / Sinhala..."
                          : userLang === 'ta'
                          ? "உங்கள் செய்தியை தட்டச்சு செய்யவும்..."
                          : "සිංහලෙන් හෝ Singlish වලින් පණිවිඩය ලියන්න (Auto translate වේ)..." 
                        : userLang === 'en'
                        ? "Type message (contact details allowed after confirm)..."
                        : "පණිවිඩය ලියන්න (දුරකථන/ලින්ක්/ලිපින තහවුරු කළ පසු ලබාදෙන්න)..."
                    }
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#040e08] border-2 border-emerald-300 dark:border-emerald-800/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold pointer-events-none hidden sm:block">
                    {userLangInfo.flag}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="px-4 sm:px-6 py-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>{userLang === 'en' ? 'Send' : userLang === 'ta' ? 'அனுப்புக' : 'යවන්න'}</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>

        </div>
      </div>

      {/* Policy Violation Warning / Blocked Modal */}
      <PolicyViolationModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        strikes={policyStrikes}
        isBlocked={isBlocked}
        onNavigateToIssues={onNavigateToIssues}
        detectedTypes={detectedViolationTypes}
      />
    </>
  );
};

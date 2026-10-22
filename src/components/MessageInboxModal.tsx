import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Phone, 
  Send, 
  Clock, 
  Search, 
  Inbox, 
  UserCheck, 
  ArrowLeft,
  CheckCircle,
  Lock,
  User as UserIcon,
  ShieldAlert,
  Sparkles,
  ArrowRightLeft,
  Globe,
  Mic
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
import { PolicyViolationModal } from './PolicyViolationModal';
import { AudioVoiceRecorder, AudioVoicePlayer } from './AudioVoiceNote';

interface MessageInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserType;
  currentUser?: UserType;
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
  post: HelpPost;
  respondentName: string;
  respondentPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageTimeMs: number;
  repliesCount: number;
  isCurrentUserAuthor: boolean;
}

export const MessageInboxModal: React.FC<MessageInboxModalProps> = ({
  isOpen,
  onClose,
  user: userProp,
  currentUser,
  helpPosts,
  lang: langProp,
  language,
  onViewPost,
  onOpenChat,
  onSelectPostChat,
  onOpenConfirm,
  onNavigateToIssues,
}) => {
  const user = (currentUser || userProp) as UserType;
  const activeLang = langProp || language || 'si';
  const t = (translations as any)[activeLang] || translations.si;
  const handleOpenChat = onSelectPostChat || onOpenChat;
  const [searchQuery, setSearchQuery] = useState('');
  const [inboxTab, setInboxTab] = useState<'all' | 'my_posts' | 'my_offers'>('all');
  const [activeThread, setActiveThread] = useState<ConversationThread | null>(null);

  // Chat State for active thread
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Dual-party language states
  const [userLang, setUserLang] = useState<Language>(activeLang || 'si');
  const [otherPartyLang, setOtherPartyLang] = useState<Language>(() => {
    if (activeLang === 'en') return 'si';
    return 'en';
  });
  const [toggledOriginals, setToggledOriginals] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeLang) {
      setUserLang(activeLang);
      setOtherPartyLang(activeLang === 'en' ? 'si' : 'en');
    }
  }, [activeLang]);

  // Policy Guard Modal State
  const userKey = user?.userId || user?.phone || user?.nicNumber || user?.name || 'user';
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyStrikes, setPolicyStrikes] = useState<number>(() => getUserStrikes(userKey));
  const [isBlocked, setIsBlocked] = useState<boolean>(() => isUserPolicyBlocked(userKey));
  const [detectedViolationTypes, setDetectedViolationTypes] = useState<('phone' | 'link' | 'address')[]>([]);

  // Update strikes from storage whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setPolicyStrikes(getUserStrikes(userKey));
      setIsBlocked(isUserPolicyBlocked(userKey));
    }
  }, [isOpen, userKey]);

  // Reset active thread on modal close/open
  useEffect(() => {
    if (!isOpen) {
      setActiveThread(null);
      setInputText('');
    }
  }, [isOpen]);

  // Subscribe to real-time chat messages when an active thread is opened
  useEffect(() => {
    if (!isOpen || !activeThread?.post?.id) return;

    const currentPost = activeThread.post;
    const unsubscribe = subscribeToChatMessages(currentPost.id, (firestoreMsgs) => {
      const combined: ChatMessage[] = [];

      // Include initial post replies from this respondent or all respondents
      if (currentPost.replies && currentPost.replies.length > 0) {
        currentPost.replies.forEach((rep) => {
          if (!rep) return;
          const isAlreadyInMsgs = (firestoreMsgs || []).some(
            (m) => m && m.text && rep.message && m.text.trim() === rep.message.trim() && m.senderName && rep.responderName && m.senderName.trim() === rep.responderName.trim()
          );
          if (!isAlreadyInMsgs) {
            const repMs = rep.createdAtMs || parseTimeToMs(rep.createdAt);
            combined.push({
              id: rep.id || `rep_${Math.random()}`,
              senderName: rep.responderName || 'සහායක',
              senderRole: (rep.responderName || '').trim().toLowerCase() === (currentPost.userName || '').trim().toLowerCase() ? 'seeker' : 'helper',
              text: rep.message || '',
              timestamp: formatMessageClockTime(rep.createdAt, repMs),
              createdAtMs: repMs,
              senderPhone: rep.responderPhone || '',
            });
          }
        });
      }

      (firestoreMsgs || []).forEach((fMsg) => {
        if (!fMsg) return;
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
        const nowMs = Date.now();
        const safeDesc = inspectAndSanitizeMessage(currentPost.whatHappened || 'ඉල්ලීම', Boolean(currentPost.isConfirmed)).sanitizedText;
        setMessages([
          {
            id: 'init_1',
            senderName: currentPost.userName || 'දැන්වීම්කරු',
            senderRole: 'seeker',
            text: `හලෝ, මගේ #${currentPost.postCode || ''} ("${safeDesc}") දැන්වීම සඳහා සහය ලබා ගැනීමට සංවාදය මෙතැනින් ආරම්භ කරන්න.`,
            timestamp: formatMessageClockTime(undefined, nowMs),
            createdAtMs: nowMs,
            senderPhone: currentPost.userPhone || '',
          },
        ]);
      }
    });

    return () => unsubscribe();
  }, [isOpen, activeThread?.post?.id, activeThread?.post]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (activeThread) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeThread]);

  if (!isOpen) return null;

  const normalizePhone = (phone?: string) => (phone ? phone.replace(/\D/g, '') : '');
  const userPhoneClean = normalizePhone(user?.phone || user?.whatsappNumber);

  const isUserPostAuthor = (post: HelpPost) => {
    if (!post) return false;
    if (checkIsPostOwner(user, post)) return true;
    const postPhoneClean = normalizePhone(post.userPhone);
    const isPhoneMatch = Boolean(
      userPhoneClean &&
        postPhoneClean &&
        (userPhoneClean === postPhoneClean ||
          userPhoneClean.endsWith(postPhoneClean.slice(-7)) ||
          postPhoneClean.endsWith(userPhoneClean.slice(-7)))
    );
    const isIdMatch = Boolean(
      (user?.userId && (post.userId === user.userId || (user?.id && post.userId === user.id))) ||
      (user?.id && (post.userId === user.id || (user?.userId && post.userId === user.userId)))
    );
    const isNameMatch = Boolean(
      user?.name &&
      post?.userName &&
      (post.userName || '').trim().toLowerCase() === (user?.name || '').trim().toLowerCase()
    );

    return isPhoneMatch || isIdMatch || isNameMatch;
  };

  const isUserHelperOnPost = (post: HelpPost) => {
    if (!post || isUserPostAuthor(post)) return false;
    const replies = post.replies || [];
    return replies.some((r) => {
      if (!r) return false;
      const repPhone = normalizePhone(r.responderPhone);
      const isPhone = Boolean(userPhoneClean && repPhone && (userPhoneClean === repPhone || userPhoneClean.endsWith(repPhone.slice(-7))));
      const isName = Boolean(user?.name && r.responderName && r.responderName.trim().toLowerCase() === user?.name.trim().toLowerCase());
      return isPhone || isName;
    });
  };

  // Group messages into distinct conversation threads per post with accurate time calculation
  const conversationThreads: ConversationThread[] = [];

  (helpPosts || []).forEach((post) => {
    if (!post || !post.id || post.isDeleted) return;

    if (isUserPostAuthor(post)) {
      // USER IS THE POST AUTHOR (Seeker): Show each helper respondent thread
      const replies = post.replies || [];
      const respondentMap: Record<string, PostReply[]> = {};
      replies.forEach((r) => {
        if (!r) return;
        const key = (r.responderName || 'සහායක').trim().toLowerCase();
        if (!respondentMap[key]) {
          respondentMap[key] = [];
        }
        respondentMap[key].push(r);
      });

      Object.entries(respondentMap).forEach(([_, repList]) => {
        // Sort replies inside this thread chronologically
        repList.sort((a, b) => parseTimeToMs(a.createdAt, a.createdAtMs) - parseTimeToMs(b.createdAt, b.createdAtMs));
        const latestReply = repList[repList.length - 1];
        if (!latestReply) return;
        const replyMs = latestReply.createdAtMs || parseTimeToMs(latestReply.createdAt);
        const timeDisplay = getAccurateElapsedTime(latestReply.createdAt, replyMs);

        conversationThreads.push({
          id: `${post.id}_author_${latestReply.responderName}`,
          post,
          respondentName: latestReply.responderName || 'නොදන්නා සහායකයා',
          respondentPhone: latestReply.responderPhone || '',
          lastMessage: latestReply.message || '',
          lastMessageTime: timeDisplay,
          lastMessageTimeMs: replyMs,
          repliesCount: repList.length,
          isCurrentUserAuthor: true,
        });
      });
    } else if (isUserHelperOnPost(post)) {
      // USER IS A HELPER ON THIS POST: Show conversation thread with Post Author!
      const replies = [...(post.replies || [])].filter(Boolean);
      replies.sort((a, b) => parseTimeToMs(b.createdAt, b.createdAtMs) - parseTimeToMs(a.createdAt, a.createdAtMs));
      const latestReply = replies[0];
      const replyMs = latestReply
        ? (latestReply.createdAtMs || parseTimeToMs(latestReply.createdAt))
        : (post.createdAtMs || parseTimeToMs(post.createdAt));
      const timeDisplay = getAccurateElapsedTime(latestReply?.createdAt || post.createdAt, replyMs);

      conversationThreads.push({
        id: `${post.id}_helper_thread`,
        post,
        respondentName: post.userName || 'දැන්වීම්කරු',
        respondentPhone: post.userPhone || '',
        lastMessage: latestReply?.message || post.whatHappened || 'සංවාදය ආරම්භ විය',
        lastMessageTime: timeDisplay,
        lastMessageTimeMs: replyMs,
        repliesCount: replies.length,
        isCurrentUserAuthor: false,
      });
    }
  });

  // Sort conversation threads in strict descending order: most recent message first
  conversationThreads.sort((a, b) => b.lastMessageTimeMs - a.lastMessageTimeMs);

  // Filter threads by tab and search query
  const filteredThreads = conversationThreads.filter((thread) => {
    if (inboxTab === 'my_posts' && !thread.isCurrentUserAuthor) return false;
    if (inboxTab === 'my_offers' && thread.isCurrentUserAuthor) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (thread.respondentName || '').toLowerCase().includes(q) ||
      (thread.lastMessage || '').toLowerCase().includes(q) ||
      (thread.post?.whatHappened || '').toLowerCase().includes(q) ||
      (thread.post?.postCode || '').toLowerCase().includes(q)
    );
  });

  // Handle sending a chat message inside thread
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || !activeThread?.post) return;

    const currentPost = activeThread.post;
    const isConfirmed = Boolean(currentPost.isConfirmed);

    if (isUserPolicyBlocked(userKey)) {
      setIsBlocked(true);
      setShowPolicyModal(true);
      return;
    }

    const rawText = inputText.trim();
    setInputText('');

    // Policy Check
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

    const generatedTranslations = getChatTranslations(messageTextToSave, userLang);
    const detected = detectLanguageOfText(messageTextToSave);

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const newMsg: Omit<ChatMessage, 'id'> = {
      senderName: user?.name || 'පරිශීලක',
      senderRole: activeThread.isCurrentUserAuthor ? 'seeker' : 'helper',
      text: messageTextToSave,
      timestamp: formatMessageClockTime(nowIso, nowMs),
      createdAt: nowIso,
      createdAtMs: nowMs,
      senderPhone: user?.phone || user?.whatsappNumber || '',
      senderId: (user as any)?.userId || (user as any)?.id || '',
      senderLang: userLang,
      detectedLang: detected,
      originalText: messageTextToSave,
      translations: {
        si: generatedTranslations.si,
        en: generatedTranslations.en,
        ta: generatedTranslations.ta,
      },
    };

    setMessages((prev) => [
      ...prev,
      {
        ...newMsg,
        id: `local_msg_${nowMs}`,
      },
    ]);

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
    const newMsg: Omit<ChatMessage, 'id'> = {
      senderName: user?.name || 'පරිශීලක',
      senderRole: activeThread.isCurrentUserAuthor ? 'seeker' : 'helper',
      text: '🎙️ [හඬ පණිවිඩයක් / Voice Note]',
      timestamp: formatMessageClockTime(nowIso, nowMs),
      createdAt: nowIso,
      createdAtMs: nowMs,
      senderPhone: user?.phone || user?.whatsappNumber || '',
      senderId: (user as any)?.userId || (user as any)?.id || '',
      audioUrl: audioBase64,
      audioDurationSec: durationSec,
      senderLang: userLang,
      telegramStorage: tgRecord,
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
      await sendChatMessageToFirestore(currentPost.id, newMsg);
    } catch (err) {
      console.error('Failed to send voice note to Firestore:', err);
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
        <div className="w-full max-w-2xl bg-white dark:bg-[#06180f] border-2 border-emerald-500/70 rounded-[2rem] shadow-[0_25px_70px_rgba(0,122,75,0.35)] overflow-hidden flex flex-col h-[90vh] max-h-[750px] relative">
          
          {/* ========================================================================= */}
          {/* VIEW 1: INBOX LIST OF RESPONDENTS / CONVERSATIONS                         */}
          {/* ========================================================================= */}
          {!activeThread ? (
            <div className="flex flex-col h-full">
              {/* Top Header */}
              <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 p-4 text-white flex items-center justify-between border-b border-emerald-600/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <span>මැසේජ් Inbox</span>
                      <span className="bg-emerald-500 text-white text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold">
                        {conversationThreads.length}
                      </span>
                    </h3>
                    <p className="text-[11px] text-emerald-100 font-medium">
                      ඔබගේ දැන්වීම් සහ ඔබ සහාය දැක්වූ දැන්වීම් සඳහා සංවාද
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-rose-600 text-white flex items-center justify-center font-bold text-sm transition-all cursor-pointer shadow-sm"
                  title="වසන්න"
                >
                  ✕
                </button>
              </div>

              {/* Tabs: All / My Posts / My Offers */}
              <div className="flex border-b border-slate-200 dark:border-[#102d1d] bg-slate-100/70 dark:bg-[#05140c] px-3 pt-2 gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setInboxTab('all')}
                  className={`px-3 py-1.5 text-xs font-black rounded-t-xl transition-all ${
                    inboxTab === 'all'
                      ? 'bg-white dark:bg-[#071c12] text-emerald-700 dark:text-emerald-300 border-t-2 border-emerald-500 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  සියල්ල ({conversationThreads.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInboxTab('my_posts')}
                  className={`px-3 py-1.5 text-xs font-black rounded-t-xl transition-all ${
                    inboxTab === 'my_posts'
                      ? 'bg-white dark:bg-[#071c12] text-emerald-700 dark:text-emerald-300 border-t-2 border-emerald-500 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  මා පළකළ දැන්වීම් ({conversationThreads.filter(t => t.isCurrentUserAuthor).length})
                </button>
                <button
                  type="button"
                  onClick={() => setInboxTab('my_offers')}
                  className={`px-3 py-1.5 text-xs font-black rounded-t-xl transition-all ${
                    inboxTab === 'my_offers'
                      ? 'bg-white dark:bg-[#071c12] text-emerald-700 dark:text-emerald-300 border-t-2 border-emerald-500 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  මා සහාය වූ සංවාද ({conversationThreads.filter(t => !t.isCurrentUserAuthor).length})
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3 bg-slate-50 dark:bg-[#05140c] border-b border-slate-200 dark:border-[#102d1d] shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ප්‍රතිචාර දැක්වූ අය, ගැටලුව හෝ පණිවිඩය මඟින් සොයන්න..."
                    className="w-full bg-white dark:bg-[#081e13] border border-slate-200 dark:border-[#173e28] rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 bg-[#f8faf9] dark:bg-[#040e08]">
                {filteredThreads.length === 0 ? (
                  <div className="py-16 text-center flex flex-col items-center justify-center space-y-3 bg-white dark:bg-[#071b11] rounded-3xl border border-dashed border-slate-300 dark:border-[#17422c] p-6 my-auto">
                    <Inbox className="w-14 h-14 text-slate-300 dark:text-slate-600 animate-bounce" />
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-700 dark:text-slate-300">
                      {conversationThreads.length === 0
                        ? 'තවම පණිවිඩ හෝ ප්‍රතිචාර ලැබී නොමැත'
                        : 'සෙවීමට අදාළ ප්‍රතිචාර හමුනොවිණි'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                      {conversationThreads.length === 0
                        ? 'දැන්වීමක් පළ කළ විට හෝ සහාය ලබාදුන් විට හුවමාරු වන පණිවිඩ මෙතැන දිස්වේ.'
                        : 'වෙනත් නමක් හෝ අයිතමයක් මඟින් නැවත උත්සාහ කරන්න.'}
                    </p>
                  </div>
                ) : (
                  (filteredThreads || []).map((thread, tIdx) => {
                    const post = thread.post;
                    const isConfirmed = Boolean(post.isConfirmed);

                    return (
                      <div
                        key={`thread_${thread.id || 't'}_${tIdx}`}
                        onClick={() => setActiveThread(thread)}
                        className="bg-white dark:bg-[#071c12] border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-[#0a281a] p-3.5 sm:p-4 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.99] group space-y-1.5"
                      >
                        {/* Line 1: පුද්ගලයාගේ නම + Role Badge + (අවසාන පණිවිඩය යැවූ වෙලාව) */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 shadow-sm ${
                              thread.isCurrentUserAuthor ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                            }`}>
                              {(thread.respondentName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                              {thread.respondentName}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                              thread.isCurrentUserAuthor
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            }`}>
                              {thread.isCurrentUserAuthor ? 'සහායකයා' : 'දැන්වීම්කරු'}
                            </span>
                            {isConfirmed ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded shrink-0">
                                ✓ Confirmed
                              </span>
                            ) : null}
                          </div>
                          
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono shrink-0 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-600" />
                            <span>({thread.lastMessageTime})</span>
                          </div>
                        </div>

                        {/* Line 2: දැන්වීමේ සඳහන් ගැටලුව (කුඩා අකුරෙන්) */}
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium flex items-center gap-1.5 pl-10">
                          <span className="text-amber-700 dark:text-amber-400 font-bold text-[10px] uppercase shrink-0">
                            #{post.postCode} ගැටලුව:
                          </span>
                          <span className="truncate">{post.whatHappened}</span>
                        </div>

                        {/* Line 3: අවසානෙට දැක්වූ ප්‍රතිචාරය (කුඩා අකුරෙන්) */}
                        <div className="text-xs text-slate-800 dark:text-slate-200 font-semibold truncate pl-10 flex items-center gap-1.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] shrink-0">
                            💬 ප්‍රතිචාරය:
                          </span>
                          <span className="truncate italic">"{thread.lastMessage}"</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Footer */}
              <div className="p-3 bg-white dark:bg-[#06180f] border-t border-slate-200 dark:border-[#102d1d] flex items-center justify-between text-xs shrink-0">
                <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                  සහය සේවා • Inbox පණිවිඩ පද්ධතිය
                </span>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  වසන්න (Close)
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW 2: DEDICATED CHAT VIEW WHEN CONVERSATION IS CLICKED                  */
            /* ========================================================================= */
            <div className="flex flex-col h-full">
              {/* Header: සහයකයාගේ/දැන්වීම පලකරන්නාගේ නම | ගැටලුව (කෙටියෙන්) | Help id | confirm (Button) */}
              <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 p-3 sm:p-4 text-white border-b border-emerald-600/50 shrink-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => setActiveThread(null)}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 text-xs font-bold transition-all cursor-pointer shrink-0"
                      title="ආපසු Inbox වෙත"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">ආපසු</span>
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-emerald-300" />
                        <h3 className="text-sm sm:text-base font-black text-white truncate">
                          {activeThread.respondentName}
                        </h3>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black border ${
                          activeThread.isCurrentUserAuthor
                            ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30'
                            : 'bg-amber-400/20 text-amber-200 border-amber-400/30'
                        }`}>
                          {activeThread.isCurrentUserAuthor ? 'සහායකයා' : 'දැන්වීම්කරු'}
                        </span>
                      </div>
                      
                      {/* ගැටලුව (කෙටියෙන්, කුඩාවට) */}
                      <p className="text-[11px] text-emerald-100/90 font-medium truncate max-w-xs sm:max-w-md">
                        📌 {inspectAndSanitizeMessage(activeThread.post.whatHappened || '', Boolean(activeThread.post.isConfirmed)).sanitizedText}
                      </p>
                    </div>
                  </div>

                  {/* Confirm Button + Help ID එක */}
                  <div className="flex items-center gap-2 shrink-0">
                    {activeThread.post.isConfirmed ? (
                      <span className="text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-black font-mono flex items-center gap-1 shadow-sm">
                        <CheckCircle className="w-3 h-3" />
                        <span>CONFIRMED</span>
                      </span>
                    ) : activeThread.isCurrentUserAuthor ? (
                      <span className="text-[10px] bg-emerald-900/70 text-emerald-200 border border-emerald-500/40 px-2 py-1 rounded-lg font-bold">
                        ඔබගේ දැන්වීමකි
                      </span>
                    ) : (
                      onOpenConfirm && (
                        <button
                          type="button"
                          onClick={() => {
                            const p = activeThread.post;
                            onClose();
                            onOpenConfirm(p);
                          }}
                          className="px-3 py-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        >
                          <span>Confirm</span>
                        </button>
                      )
                    )}

                    <span className="bg-white/20 text-white font-mono text-[11px] px-2 py-1 rounded-lg border border-white/20 font-black">
                      {(activeThread.post?.postCode && typeof activeThread.post.postCode === 'string')
                        ? (activeThread.post.postCode.startsWith('#') ? activeThread.post.postCode : `#${activeThread.post.postCode}`)
                        : '#POST'}
                    </span>

                    <button
                      onClick={onClose}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-rose-600 text-white flex items-center justify-center font-bold text-xs transition-all cursor-pointer"
                      title="වසන්න"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Privacy Reminder */}
                {!activeThread.post.isConfirmed && (
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

              {/* Chat history එක (චැට්කල පිළිවෙලින්) */}
              <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 bg-[#f6faf8] dark:bg-[#040e08]">
                {(messages || []).map((msg, msgIdx) => {
                  const isMe = Boolean(
                    (user?.name && msg.senderName && msg.senderName.trim().toLowerCase() === user.name.trim().toLowerCase()) ||
                    (msg.senderPhone && userPhoneClean && normalizePhone(msg.senderPhone) === userPhoneClean)
                  );

                  const isSeeker = 
                    msg.senderRole === 'seeker' || 
                    (activeThread.post.userName && msg.senderName && msg.senderName.trim().toLowerCase() === activeThread.post.userName.trim().toLowerCase());

                  const isRedacted = msg.text.includes('[🔒');
                  const isConfirmed = Boolean(activeThread.post.isConfirmed);
                  const showOriginal = Boolean(toggledOriginals[msg.id]);

                  // Multi-language Text Resolution
                  const rawSanitized = inspectAndSanitizeMessage(msg.text, isConfirmed).sanitizedText;
                  
                  let primaryText = rawSanitized;
                  let secondaryTranslationText = '';
                  let isAutoTranslated = false;

                  if (msg.audioUrl) {
                    primaryText = rawSanitized;
                  } else {
                    if (msg.translations && msg.translations[userLang]) {
                      if (isMe) {
                        primaryText = showOriginal ? (msg.translations[otherPartyLang] || rawSanitized) : rawSanitized;
                        secondaryTranslationText = msg.translations[otherPartyLang] || '';
                        if (secondaryTranslationText && secondaryTranslationText.trim().toLowerCase() !== rawSanitized.trim().toLowerCase()) {
                          isAutoTranslated = true;
                        }
                      } else {
                        const translatedForUser = msg.translations[userLang] || rawSanitized;
                        primaryText = showOriginal ? rawSanitized : translatedForUser;
                        secondaryTranslationText = rawSanitized;
                        if (translatedForUser.trim().toLowerCase() !== rawSanitized.trim().toLowerCase()) {
                          isAutoTranslated = true;
                        }
                      }
                    } else {
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
                      key={`inbox_msg_${msg.id || 'm'}_${msgIdx}`}
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
                        <span className="font-mono text-[9px]">{msg.timestamp}</span>
                      </div>

                      {/* Bubble */}
                      <div
                        className={`max-w-[88%] sm:max-w-[82%] px-4 py-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-sm transition-all ${
                          isMe
                            ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-tr-none shadow-emerald-950/20'
                            : isRedacted
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-slate-800 dark:text-slate-100 border border-amber-300 dark:border-amber-800/80 rounded-tl-none'
                            : 'bg-white dark:bg-[#0c2217] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-[#19422d] rounded-tl-none'
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
                                    {showOriginal ? 'පරිවර්තනය' : 'මුල් පණිවිඩය'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* WhatsApp / Phone if confirmed AND contact consent is granted */}
                        {isConfirmed && activeThread.post.revealContactConsent !== false && !isMe && msg.senderPhone && (
                          <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2 text-[10px]">
                            <span className="text-slate-600 dark:text-slate-300 font-mono">
                              📞 {msg.senderPhone}
                            </span>
                            <a
                              href={`https://wa.me/${msg.senderPhone.replace(/^0/, '94').replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded font-bold"
                            >
                              WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Bottom: ( Chat type box ) "යවන්න" (button එක) */}
              <div className="p-3 bg-white dark:bg-[#06180f] border-t border-emerald-200 dark:border-[#0e3a24] shrink-0">
                {isRecordingVoice ? (
                  <AudioVoiceRecorder
                    senderName={user?.name || 'User'}
                    sourceContext="Direct Chat"
                    onSendAudio={handleSendVoiceAudio}
                    onCancel={() => setIsRecordingVoice(false)}
                  />
                ) : (
                  <form onSubmit={handleSend} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(true)}
                      className="p-2.5 rounded-2xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0 transition-all active:scale-95 cursor-pointer"
                      title="හඬ පණිවිඩයක් (Voice Note)"
                    >
                      <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </button>

                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={
                          activeThread.post.isConfirmed 
                            ? userLang === 'en'
                              ? "Type your message in English / Singlish / Sinhala..."
                              : userLang === 'ta'
                              ? "உங்கள் செய்தியை தட்டச்சு செய்யவும்..."
                              : "සිංහලෙන් හෝ Singlish වලින් පණිවිඩය ලියන්න (Auto translate වේ)..." 
                            : userLang === 'en'
                            ? "Type message (contact details allowed after confirm)..."
                            : "පණිවිඩය ලියන්න (දුරකථන/ලිපින Confirm කළ පසු හුවමාරු වේ)..."
                        }
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#040e08] border-2 border-emerald-300 dark:border-emerald-800/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium pr-8"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold pointer-events-none hidden sm:block">
                        {userLangInfo.flag}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!inputText.trim() || isSending}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed shrink-0"
                    >
                      <span>{userLang === 'en' ? 'Send' : userLang === 'ta' ? 'அனுப்புக' : 'යවන්න'}</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

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

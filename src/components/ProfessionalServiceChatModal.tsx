import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  MessageCircle, 
  User as UserIcon, 
  Phone, 
  CheckCircle,
  X,
  Sparkles,
  ShieldAlert,
  Clock,
  Briefcase
} from 'lucide-react';
import { ProfessionalService, ChatMessage, User as UserType, Language } from '../types';
import { subscribeToChatMessages, sendChatMessageToFirestore } from '../lib/firebase';
import { parseTimeToMs, formatMessageClockTime } from '../utils/dateUtils';
import { 
  inspectAndSanitizeMessage, 
  getUserStrikes, 
  recordPolicyViolation, 
  isUserPolicyBlocked 
} from '../utils/policyGuard';
import { PolicyViolationModal } from './PolicyViolationModal';

interface ProfessionalServiceChatModalProps {
  service: ProfessionalService | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  language?: Language;
}

export const ProfessionalServiceChatModal: React.FC<ProfessionalServiceChatModalProps> = ({
  service,
  isOpen,
  onClose,
  currentUser,
  language = 'si',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Policy Guard Modal State
  const userKey = currentUser?.userId || currentUser?.phone || currentUser?.nicNumber || currentUser?.name || 'user';
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyStrikes, setPolicyStrikes] = useState<number>(() => getUserStrikes(userKey));
  const [isBlocked, setIsBlocked] = useState<boolean>(() => isUserPolicyBlocked(userKey));
  const [detectedViolationTypes, setDetectedViolationTypes] = useState<('phone' | 'link' | 'address')[]>([]);

  // Update strikes whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setPolicyStrikes(getUserStrikes(userKey));
      setIsBlocked(isUserPolicyBlocked(userKey));
    }
  }, [isOpen, userKey]);

  // Subscribe to real-time chat messages from Firestore
  useEffect(() => {
    if (!isOpen || !service?.id) return;

    const channelId = `ps_${service.id}`;
    const unsubscribe = subscribeToChatMessages(channelId, (firestoreMsgs) => {
      const combined: ChatMessage[] = [];

      firestoreMsgs.forEach((fMsg) => {
        const fMs = fMsg.createdAtMs || parseTimeToMs(fMsg.timestamp);
        combined.push({
          ...fMsg,
          createdAtMs: fMs,
          timestamp: formatMessageClockTime(fMsg.timestamp, fMs),
        });
      });

      // Sort chronologically
      combined.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
      setMessages(combined);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen, service?.id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isOpen]);

  if (!isOpen || !service) return null;

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();

    const textToSend = (customText !== undefined ? customText : inputText).trim();
    if (!textToSend || isSending) return;

    // Check policy block
    if (isBlocked) {
      setShowPolicyModal(true);
      return;
    }

    // Inspect message for policy violations
    const checkResult = inspectAndSanitizeMessage(textToSend);
    if (checkResult.hasViolation) {
      const newStrikes = recordPolicyViolation(userKey);
      setPolicyStrikes(newStrikes);
      setIsBlocked(isUserPolicyBlocked(userKey));
      setDetectedViolationTypes(checkResult.detectedTypes);
      setShowPolicyModal(true);
      return;
    }

    const senderName = currentUser?.name?.trim() || 'සේවාදායකයා';
    const senderRole = currentUser?.userId === service.userId ? 'helper' : 'seeker';

    const now = new Date();
    const formattedClockTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newChatMessage: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random()}`,
      senderName,
      senderRole,
      text: checkResult.sanitizedText,
      timestamp: formattedClockTime,
      createdAtMs: Date.now(),
      senderPhone: currentUser?.phone || '',
    };

    // Optimistically update UI
    setMessages((prev) => [...prev, newChatMessage]);
    setInputText('');
    setIsSending(true);

    try {
      const channelId = `ps_${service.id}`;
      await sendChatMessageToFirestore(channelId, newChatMessage);
    } catch (err) {
      console.warn('Chat send notice:', err);
    } finally {
      setIsSending(false);
    }
  };

  const isCurrentSender = (msg: ChatMessage) => {
    const currentName = currentUser?.name?.trim().toLowerCase();
    const senderName = msg.senderName?.trim().toLowerCase();
    const currentPhone = currentUser?.phone?.replace(/\D/g, '');
    const senderPhone = msg.senderPhone?.replace(/\D/g, '');

    if (currentPhone && senderPhone && currentPhone === senderPhone) return true;
    if (currentName && senderName && currentName === senderName) return true;
    return false;
  };

  const quickPrompts = [
    'ආයුබෝවන්, මට මෙම සේවාව ලබාගැනීමට අවශ්‍යයි.',
    'ඔබට ඉදිරි දිනවලදී පැමිණීමට වේලාවක් තිබේද?',
    'සේවාව සඳහා වන ඇස්තමේන්තුගත ගාස්තු දැනගත හැකිද?',
    'ස්තූතියි, මම ඉක්මනින් සම්බන්ධ වන්නම්.',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 flex items-center justify-center animate-fadeIn">
      <div className="bg-white dark:bg-[#0c1a12] border border-slate-200 dark:border-[#1a3826] rounded-3xl w-full max-w-lg h-[620px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-[#173222] bg-slate-50/90 dark:bg-[#0f2418]/90 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-emerald-100 dark:bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                {service.providerPhotoUrl ? (
                  <img src={service.providerPhotoUrl} alt={service.providerName} className="w-full h-full object-cover" />
                ) : (
                  service.providerName.charAt(0)
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0c1a12]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                  {service.providerName}
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  {service.subCategoryIcon} {service.subCategoryName}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#789d87] truncate">
                {service.serviceTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {service.providerPhone && (service.revealContactConsent === true || currentUser?.userId === service.userId || currentUser?.role === 'admin') && (
              <a
                href={`tel:${service.providerPhone.replace(/\D/g, '')}`}
                title={`Call ${service.providerPhone}`}
                className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-[#153021] hover:bg-emerald-100 dark:hover:bg-[#1d432e] text-emerald-700 dark:text-emerald-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#162e20] hover:bg-slate-200 dark:hover:bg-[#1f422e] text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-[#07130b]">
          {/* Welcome Info Box */}
          <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-[#0f281b] border border-emerald-200/60 dark:border-[#1c4029] text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
              <span>{service.serviceTitle}</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-[#88ad97]">
              {service.providerName} සමඟ සෘජුවම ඇප් එක තුළ පණිවිඩ හුවමාරු කරගන්න.
            </p>
          </div>

          {messages.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 text-slate-400 dark:text-[#678b75]">
              <MessageCircle className="w-10 h-10 stroke-1 opacity-60" />
              <p className="text-xs font-semibold">තවමත් පණිවිඩ හුවමාරු වී නොමැත.</p>
              <p className="text-[11px]">පහතින් පණිවිඩයක් යවා සංවාදය ආරම්භ කරන්න.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = isCurrentSender(msg);
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-center gap-1 px-1 text-[10px] text-slate-400 font-semibold">
                    <span>{isMine ? 'ඔබ (You)' : msg.senderName}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed break-words shadow-sm ${
                      isMine
                        ? 'bg-gradient-to-r from-emerald-600 to-[#007a4b] text-white rounded-br-none'
                        : 'bg-white dark:bg-[#12281b] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-[#1a3826] rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-1.5 border-t border-slate-100 dark:border-[#132a1d] bg-white dark:bg-[#0a1b11] overflow-x-auto flex gap-1.5 no-scrollbar flex-shrink-0">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(undefined, prompt)}
              className="text-[11px] font-semibold whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-[#12281b] hover:bg-emerald-50 dark:hover:bg-[#173824] hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1c3a27] transition-colors cursor-pointer active:scale-95 flex-shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <form
          onSubmit={(e) => handleSendMessage(e)}
          className="p-3 border-t border-slate-200 dark:border-[#173222] bg-white dark:bg-[#0c1a12] flex items-center gap-2 flex-shrink-0"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="පණිවිඩය මෙහි සටහන් කරන්න..."
            className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-[#112318] border border-slate-300 dark:border-[#1e3e2b] rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-[#007a4b] hover:from-emerald-700 hover:to-[#00603a] disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Policy Guard Violation Modal */}
        <PolicyViolationModal
          isOpen={showPolicyModal}
          onClose={() => setShowPolicyModal(false)}
          strikesCount={policyStrikes}
          isBlocked={isBlocked}
          detectedTypes={detectedViolationTypes}
        />
      </div>
    </div>
  );
};

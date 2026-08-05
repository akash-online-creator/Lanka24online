import React, { useState, useEffect, useRef } from 'react';
import { Send, ShieldAlert, MessageCircle, User as UserIcon } from 'lucide-react';
import { HelpPost, ChatMessage, User as UserType } from '../types';
import { subscribeToChatMessages, sendChatMessageToFirestore } from '../lib/firebase';

interface QuickServiceChatModalProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
}

export const QuickServiceChatModal: React.FC<QuickServiceChatModalProps> = ({
  post,
  isOpen,
  onClose,
  currentUser,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time chat messages from Firestore
  useEffect(() => {
    if (!isOpen || !post?.id) return;

    const unsubscribe = subscribeToChatMessages(post.id, (firestoreMsgs) => {
      if (firestoreMsgs && firestoreMsgs.length > 0) {
        setMessages(firestoreMsgs);
      } else {
        // Default initial message from post author if no messages exist yet
        setMessages([
          {
            id: 'init_1',
            senderName: post.userName,
            senderRole: 'seeker',
            text: `හලෝ, මගේ "${post.whatHappened || 'ඉල්ලීම'}" සඳහා සහය ලබා ගැනීමට සංවාදය ආරම්භ කළ හැක.`,
            timestamp: 'දැන්',
          },
        ]);
      }
    });

    return () => unsubscribe();
  }, [isOpen, post?.id, post?.userName, post?.whatHappened]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen || !post) return null;

  const isPostAuthor = currentUser.name.trim().toLowerCase() === post.userName.trim().toLowerCase();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    const newMsg: Omit<ChatMessage, 'id'> = {
      senderName: currentUser.name || 'පරිශීලක',
      senderRole: isPostAuthor ? 'seeker' : 'helper',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Optimistically update local state
    setMessages((prev) => [
      ...prev,
      {
        ...newMsg,
        id: `local_${Date.now()}`,
      },
    ]);

    // Send to Firestore database
    await sendChatMessageToFirestore(post.id, newMsg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-white dark:bg-[#07130c] border border-slate-200 dark:border-[#132a1d] rounded-3xl shadow-2xl overflow-hidden relative flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="bg-[#007a4b] text-white px-5 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{post.userName} සමඟ සංවාදය (Direct Chat)</span>
                <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded font-mono">
                  {post.postCode}
                </span>
              </h3>
              <p className="text-[11px] text-emerald-100">
                {isPostAuthor ? 'ඔබගේ දැන්වීමට ප්‍රතිචාර දක්වන්නන් සමඟ සාකච්ඡා කරන්න' : 'දැන්වීම පළකළ තැනැත්තා සමඟ සෘජු සංවාදය'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* TOP NOTICE BANNER */}
        <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900/50 p-3 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200 shrink-0">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-snug text-[11px]">
            <strong>ආරක්ෂිත උපදෙස්:</strong> ඔබගේ අදහස් හා යෝජනා ප්‍රකාශ කළ හැක. නමුත් කිසිම වෙලාවක මූල්‍ය නොවන තොරතුරු, බැංකු ගිණුම් තොරතුරු, දුරකථන අංක, ඔබ සිටින ස්ථාන වෙනත් සදහා තොරතුරු ලබා ගැනීමටද මූල්‍යමය ලබාදීමටද වැළකී සිටින්න.
          </p>
        </div>

        {/* Chat Messages Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8faf9] dark:bg-[#05110a]">
          {messages.map((msg) => {
            const isMe = msg.senderName.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
            const isSeeker = msg.senderName.trim().toLowerCase() === post.userName.trim().toLowerCase();

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <UserIcon className="w-3 h-3 text-[#007a4b] dark:text-[#00c880]" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {isMe ? 'ඔබ (You)' : msg.senderName}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {isSeeker ? 'දැන්වීම්කරු' : 'උදව්කරු'}
                  </span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-[#007a4b] text-white rounded-tr-none'
                      : 'bg-white dark:bg-[#112d1f] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-[#1e4832] rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-white dark:bg-[#07130c] border-t border-slate-200 dark:border-[#132a1d] flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="ඔබගේ පණිවිඩය ඇතුළත් කරන්න..."
            className="flex-1 bg-slate-100 dark:bg-[#0c2217] border border-slate-200 dark:border-[#163625] rounded-2xl px-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#007a4b]"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-2xl bg-[#007a4b] hover:bg-[#006e43] text-white font-bold text-xs shadow-md flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>යවන්න</span>
          </button>
        </form>

      </div>
    </div>
  );
};


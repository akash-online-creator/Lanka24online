import React, { useState } from 'react';
import { Send, ShieldAlert, MessageCircle, User } from 'lucide-react';
import { HelpPost, ChatMessage, User as UserType } from '../types';

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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_1',
      senderName: post?.userName || 'සහය ඉල්ලුම්කරු',
      senderRole: 'seeker',
      text: `හලෝ, මගේ ${post?.whatHappened || 'ගැටලුව'} නිසා උදව් අවශ්‍ය වී ඇත.`,
      timestamp: 'මීට මිනිත්තු 5 කට පෙර',
    },
    {
      id: 'msg_2',
      senderName: currentUser.name || 'ඔබ',
      senderRole: 'helper',
      text: 'මම ළඟම ඉන්නේ. මට ඔබට සහාය වීමට හැක. උපකරණ ද ඇත.',
      timestamp: 'මීට මිනිත්තු 2 කට පෙර',
    }
  ]);

  const [inputText, setInputText] = useState('');

  if (!isOpen || !post) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderName: currentUser.name || 'ඔබ',
      senderRole: 'helper',
      text: inputText.trim(),
      timestamp: 'දැන්',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    // Simulated seeker response after 1.2s
    setTimeout(() => {
      const autoReply: ChatMessage = {
        id: `msg_reply_${Date.now()}`,
        senderName: post.userName,
        senderRole: 'seeker',
        text: 'බොහොම ස්තූතියි! CONFIRM බටන් එක ඔබා තහවුරු කරන්න.',
        timestamp: 'දැන්',
      };
      setMessages((prev) => [...prev, autoReply]);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-900 border border-cyan-500/50 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden relative flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-300">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{post.userName} සමඟ කතාබස් (Chat)</span>
                <span className="text-[10px] bg-slate-800 text-cyan-400 px-2 py-0.5 rounded font-mono">
                  {post.postCode}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">ක්ෂණික සහය සාකච්ඡා පිටුව</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* TOP NOTICE BANNER - Exact wording from PDF */}
        <div className="bg-amber-950/80 border-b border-amber-500/40 p-3 flex items-start gap-2.5 text-xs text-amber-200 shrink-0">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
          <p className="leading-snug text-[11px]">
            <strong>ආරක්ෂිත උපදෙස්:</strong> ඔබගේ අදහස් හා යෝජනා ප්‍රකාශ කළ හැක. නමුත් කිසිම වෙලාවක මූල්‍ය නොවන තොරතුරු, බැංකු ගිණුම් තොරතුරු, දුරකථන අංක, ඔබ සිටින ස්ථාන වෙනත් සදහා තොරතුරු ලබා ගැනීමටද මූල්‍යමය ලබාදීමටද වැළකී සිටින්න.
          </p>
        </div>

        {/* Chat Messages Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/60">
          {messages.map((msg) => {
            const isMe = msg.senderRole === 'helper';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                  <User className="w-3 h-3 text-cyan-400" />
                  <span className="font-semibold text-slate-300">{msg.senderName}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                    isMe
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="ඔබගේ පණිවිඩය ඇතුළත් කරන්න..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>යවන්න</span>
          </button>
        </form>

      </div>
    </div>
  );
};

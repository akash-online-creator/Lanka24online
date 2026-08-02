import React, { useState } from 'react';
import { Send, Phone, MessageSquare, ExternalLink, CheckCircle2 } from 'lucide-react';
import { HelpPost, Language } from '../types';
import { translations } from '../data/translations';

interface OfferSupportModalProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  onSendReply: (postId: string, responderName: string, responderPhone: string, message: string) => void;
  lang: Language;
}

export const OfferSupportModal: React.FC<OfferSupportModalProps> = ({
  post,
  isOpen,
  onClose,
  onSendReply,
  lang,
}) => {
  const t = translations[lang];
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('0712233445');
  const [msg, setMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !post) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !msg.trim()) return;

    onSendReply(post.id, name.trim(), phone.trim(), msg.trim());
    setSubmitted(true);

    // Formatted WhatsApp redirect
    const formattedPhone = post.userPhone.replace(/^0/, '94');
    const text = encodeURIComponent(
      `හලෝ ${post.userName}, මම සහය සේවා (Sahaya Seva) ඇප් එකෙන් ඔබේ ඉල්ලීම (${post.postCode}) දැක්කා.\nනම: ${name}\nදුරකථනය: ${phone}\nපණිවිඩය: ${msg}`
    );

    setTimeout(() => {
      window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
      setSubmitted(false);
      setName('');
      setMsg('');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden relative p-6">
        
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              {t.replyModalTitle}
            </h3>
            <p className="text-xs text-slate-400">
              ඉල්ලීම් අංකය: <strong className="text-emerald-400 font-mono">{post.postCode}</strong> ({post.userName})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center flex flex-col items-center justify-center space-y-3 animate-fadeIn">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
            <h4 className="text-lg font-bold text-white">{t.sendReplySuccess}</h4>
            <p className="text-xs text-slate-400">WhatsApp යෙදුම වෙත රීඩිරෙක්ට් වෙමින් පවතී...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 block mb-1 font-semibold">📌 ඉල්ලීමේ සාරාංශය:</span>
              <p className="text-slate-200 font-medium line-clamp-2">{post.whatHappened}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">ඔබේ නම *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="උදා: කමල් ප්‍රනාන්දු"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-slate-100 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-400" /> ඔබගේ දුරකථන / WhatsApp අංකය *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712233445"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-slate-100 text-sm focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {t.yourMsgLabel} (ඔබට උපකාර කළ හැකි ආකාරය) *
              </label>
              <textarea
                required
                rows={3}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="උදා: මම කඩවත ළඟ ඉන්නේ. විනාඩි 10කින් පැමිණ සහාය විය හැක."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-slate-100 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-semibold"
              >
                {t.cancelBtn}
              </button>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>පිළිතුර යවා WhatsApp වෙත යන්න</span>
                <ExternalLink className="w-3 h-3 text-emerald-300" />
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

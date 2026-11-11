import React, { useState } from 'react';
import { MessageSquare, Phone, Send, Copy, Check, X, Sparkles, ExternalLink } from 'lucide-react';
import { Language } from '../types';

interface RequestWhatsAppSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserName?: string;
  targetUserPhone?: string;
  targetUserIdentifier?: string; // userId or nic or phone
  postCode?: string;
  language?: Language;
}

export const RequestWhatsAppSmsModal: React.FC<RequestWhatsAppSmsModalProps> = ({
  isOpen,
  onClose,
  targetUserName = 'පරිශීලක',
  targetUserPhone = '',
  targetUserIdentifier = '',
  postCode = '',
  language = 'si',
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const cleanPhone = (targetUserPhone || '').trim().replace(/[^\d+]/g, '');
  const cleanId = (targetUserIdentifier || cleanPhone || '').trim();

  // Create the direct update link
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sahaya.lk';
  const updateLink = `${origin}/?update_whatsapp=${encodeURIComponent(cleanId)}`;

  // Construct standard pre-filled message text in Sinhala
  const postReference = postCode ? ` (${postCode})` : '';
  const messageBody = `ආයුබෝවන් ${targetUserName}, සහය සේවා (Sahaya Seva) හරහා ඔබගේ${postReference} දැන්වීම සම්බන්ධයෙන් WhatsApp මඟින් සම්බන්ධ වීමට උත්සාහ කළද ඔබගේ WhatsApp ගිණුම සොයාගත නොහැකි විය. කරුණාකර ඔබගේ නව සක්‍රීය WhatsApp අංකය ලබාදීමට මෙම ලින්ක් එක ක්ලික් කරන්න: ${updateLink}`;

  const smsHref = `sms:${cleanPhone}?body=${encodeURIComponent(messageBody)}`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageBody);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(updateLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div
      id="request-whatsapp-sms-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#071d12] border-2 border-emerald-500/80 dark:border-emerald-600/60 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,122,75,0.25)] relative overflow-hidden text-left transform transition-all animate-scaleUp">
        
        {/* Top Gradient Banner */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#173222] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                SMS මඟින් WhatsApp අංකය ඉල්ලන්න
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Request Active WhatsApp via SMS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 dark:bg-[#162e20] dark:hover:bg-rose-950/50 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center justify-center font-black text-base transition-all cursor-pointer shadow-sm active:scale-90"
            title="වසන්න"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Explainer */}
        <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/60 rounded-2xl text-xs text-amber-950 dark:text-amber-200 space-y-1 mb-4">
          <div className="flex items-center gap-1.5 font-black text-amber-900 dark:text-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>WhatsApp ගිණුම සොයාගත නොහැකි වූයේ නම්:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
            සමහර පුද්ගලයන්ට එම අංකයෙන් WhatsApp නොතිබිය හැක. පහත SMS පණිවිඩය යැවීමෙන් ඔවුන්ට ක්ෂණිකව නව WhatsApp අංකය ඇතුළත් කිරීමට සෘජු Link එකක් ලැබේ.
          </p>
        </div>

        {/* Target Details */}
        <div className="p-3 bg-slate-50 dark:bg-[#0c2419] rounded-2xl border border-slate-200 dark:border-emerald-900/60 text-xs mb-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">ලබන්නා (Recipient):</span>
            <strong className="text-slate-900 dark:text-white font-extrabold text-sm">{targetUserName}</strong>
            <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              දුරකථනය: {cleanPhone || 'අංකයක් නැත'}
            </div>
          </div>
          {postCode && (
            <div className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-black rounded-lg border border-emerald-300 dark:border-emerald-700">
              {postCode}
            </div>
          )}
        </div>

        {/* Generated SMS Preview Box */}
        <div className="space-y-1.5 mb-4">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>යැවෙන SMS පණිවිඩය (SMS Message Body):</span>
            <button
              type="button"
              onClick={handleCopyText}
              className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              {copiedText ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedText ? 'පිටපත් විය!' : 'පිටපත් කරන්න'}</span>
            </button>
          </label>
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#05140d] border border-slate-300 dark:border-emerald-900 text-xs text-slate-800 dark:text-slate-200 font-sans leading-relaxed break-words select-all">
            {messageBody}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {cleanPhone ? (
            <a
              href={smsHref}
              onClick={onClose}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>SMS එක යවන්න (Open SMS App)</span>
            </a>
          ) : (
            <div className="p-2 text-center text-xs text-rose-600 font-bold bg-rose-50 rounded-xl">
              දුරකථන අංකයක් සටහන්ව නොමැත. කරුණාකර ලින්ක් එක කොපි කර යවන්න.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#162e20] dark:hover:bg-[#1f422e] text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ExternalLink className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link කොපි විය!' : 'Link එක Copy කරන්න'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#162e20] dark:hover:bg-[#1f422e] text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'SMS කොපි විය!' : 'මුළු SMS එකම Copy'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

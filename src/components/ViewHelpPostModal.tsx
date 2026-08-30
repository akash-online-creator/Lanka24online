import React from 'react';
import { HelpPost, Language, LocationOption } from '../types';
import { PostCard } from './PostCard';
import { Eye, Sparkles, X, CheckCircle2, MessageCircle, MessageSquare } from 'lucide-react';

interface ViewHelpPostModalProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  lang?: Language;
  viewerLocation?: LocationOption;
  onOpenChat?: (post: HelpPost) => void;
}

export const ViewHelpPostModal: React.FC<ViewHelpPostModalProps> = ({
  post,
  isOpen,
  onClose,
  lang = 'si',
  viewerLocation,
  onOpenChat,
}) => {
  if (!isOpen || !post) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-white dark:bg-[#06180f] border-2 border-emerald-500/60 rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-sky-800 via-teal-900 to-emerald-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-emerald-500/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-sky-500/20 border border-sky-400/40 rounded-xl text-sky-300">
              <Eye className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>දැන්වීම සහ සංවාද ඉතිහාසය (Ad & Chat)</span>
                <span className="text-xs font-mono bg-sky-900/80 border border-sky-400/40 px-2 py-0.5 rounded-lg text-sky-300 font-bold">
                  #{post.postCode}
                </span>
              </h3>
              <p className="text-xs text-sky-200 font-medium">
                දැන්වීම සහ ඒ සඳහා ලැබුණු සියලුම පණිවිඩ/Chat පහතින් පරීක්ෂා කළ හැක.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-sky-900/60 hover:bg-rose-600 text-white flex items-center justify-center font-bold transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-gradient-to-b from-sky-50/50 via-emerald-50/30 to-white dark:from-[#04140d] dark:via-[#030e09] dark:to-[#04140d]">
          
          <div className="p-3 bg-emerald-100/80 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>දෙපාර්ශ්වයටම මෙම දැන්වීම සඳහා Chat සංවාද සිදුකළ හැක.</span>
            </div>
            {onOpenChat && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChat(post);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Chat සංවාදය</span>
              </button>
            )}
          </div>

          {/* Render standard PostCard for preview */}
          <PostCard
            post={post}
            lang={lang}
            onOfferSupport={() => {}}
            viewerLocation={viewerLocation}
            isOwner={false}
          />

          {/* If there are received replies, show them here clearly */}
          {post.replies && (post.replies?.length || 0) > 0 && (
            <div className="mt-4 bg-white dark:bg-[#071d12] border-2 border-emerald-500/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>ලැබී ඇති පිළිතුරු සහ පණිවිඩ ({post.replies.length}):</span>
                </h4>
                {onOpenChat && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenChat(post);
                    }}
                    className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>සම්පූර්ණ Chat විවෘත කරන්න</span> →
                  </button>
                )}
              </div>
              <div className="space-y-2.5">
                {(post.replies || []).map((reply, rIdx) => {
                  const whatsappFormatted = reply.responderPhone
                    ? reply.responderPhone.replace(/^0/, '94').replace(/\D/g, '')
                    : '';
                  return (
                    <div
                      key={reply.id || rIdx}
                      className="bg-slate-50 dark:bg-[#030e08] border border-slate-200 dark:border-[#103321] p-3 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-800 dark:text-white">
                          👤 {reply.responderName || 'නොදන්නා පරිශීලකයා'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{reply.createdAt}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">
                        "{reply.message}"
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 font-mono">
                          {post.isConfirmed 
                            ? (reply.responderPhone ? `📞 ${reply.responderPhone}` : 'දුරකථන අංකය නොමැත')
                            : '🔒 සහය තහවුරු කළ පසු අංකය දිස්වේ'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {onOpenChat && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenChat(post);
                              }}
                              className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold text-[10px] shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>Chat</span>
                            </button>
                          )}
                          {post.isConfirmed && whatsappFormatted && (
                            <a
                              href={`https://wa.me/${whatsappFormatted}?text=${encodeURIComponent(
                                `හලෝ ${reply.responderName}, ඔබ සහය සේවා (Sahaya Sewa) හරහා මගේ #${post.postCode} දැන්වීමට එවූ පණිවිඩය සම්බන්ධවයි:`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] shadow-sm flex items-center gap-1"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-[#05170f] border-t border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>සක්‍රීය දැන්වීමකි (Active Ad)</span>
          </span>
          <div className="flex items-center gap-2">
            {onOpenChat && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChat(post);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat සංවාදය අරඹන්න</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
            >
              වසා දමන්න
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

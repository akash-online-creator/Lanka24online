import React, { useState } from 'react';
import { 
  Lock, 
  HelpCircle, 
  MessageSquare, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  UserCheck,
  AlertCircle,
  Receipt,
  FileText,
  DollarSign
} from 'lucide-react';
import { HelpPost, Language } from '../types';
import { SlideToConfirmButton } from './SlideToConfirmButton';

interface ResolutionPromptModalProps {
  post: HelpPost;
  lang: Language;
  onPostpone: () => void;
  onRejectCompletion: (post: HelpPost) => Promise<void>;
  onOpenChat: (post: HelpPost) => void;
  onConfirmResolved: (post: HelpPost) => Promise<void>;
}

export const ResolutionPromptModal: React.FC<ResolutionPromptModalProps> = ({
  post,
  lang,
  onPostpone,
  onRejectCompletion,
  onOpenChat,
  onConfirmResolved,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const helperName = post.completedHelperName || post.completedBy || post.confirmedHelperName || 'සහායකයා';
  const helperPhone = post.completedHelperPhone || post.confirmedHelperPhone || '';
  const bill = post.serviceBill;

  const handleSlideResolved = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmResolved(post);
    } catch (err) {
      console.error('Error marking resolution:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id="screen-lock-resolution-overlay"
      className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto animate-fadeIn select-none"
    >
      <div 
        id="screen-lock-modal-card"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-emerald-500/80 overflow-hidden relative max-h-[92vh] flex flex-col"
      >
        {/* Top Screen Lock Security Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-4.5 sm:p-5 flex items-center justify-between border-b border-emerald-700/60 shadow-inner shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md shadow-amber-400/40 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  තිරය අගුළුලා ඇත (Screen Locked)
                </span>
                <span className="text-xs font-mono font-bold text-emerald-200">
                  {post.postCode || '#HELP'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                සහය සහ බිල්පත් තහවුරු කිරීම
              </h2>
            </div>
          </div>

          <ShieldCheck className="w-7 h-7 text-emerald-300 shrink-0 opacity-80" />
        </div>

        {/* Modal Main Content */}
        <div className="p-5 sm:p-6 space-y-4.5 overflow-y-auto flex-1">
          {/* Helper Completion Announcement Box */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400/60 dark:border-emerald-700/50 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <UserCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  සහායකයා විසින් සහය ලබාදී අවසන් බව සටහන් කර ඇත:
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-black text-emerald-950 dark:text-white bg-emerald-200/70 dark:bg-emerald-800/60 px-2.5 py-1 rounded-lg">
                    {helperName}
                  </span>
                  {helperPhone && (
                    <span className="font-mono text-emerald-800 dark:text-emerald-300">
                      📞 {helperPhone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Central Question */}
          <div className="text-center space-y-1 py-0.5">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mb-0.5">
              <HelpCircle className="w-5 h-5 animate-pulse" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
              ඔබගේ ගැටලුව සහ ගණුදෙනු සාර්ථකව විසඳී අවසන් ද?
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
              පහත සඳහන් බිල්පත සහ සිදුකළ ක්‍රියාකාරකම් සලකා බලා ගණුදෙනුව අවසන් නම් දකුණට අදින්න.
            </p>
          </div>

          {/* Service Bill & Actions Card */}
          {bill ? (
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border-2 border-emerald-500/40 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>සහායකයාගේ බිල්පත් සටහන</span>
                </span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                  {bill.items?.length || 0} අයිතම
                </span>
              </div>

              {/* Actions Summary */}
              {bill.actionsSummary && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>සිදුකළ ක්‍රියාවන්:</span>
                  </span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    "{bill.actionsSummary}"
                  </p>
                </div>
              )}

              {/* Itemized list */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  වියදම් ලැයිස්තුව:
                </span>
                <div className="space-y-1">
                  {(bill.items || []).map((item, idx) => (
                    <div 
                      key={item.id || idx}
                      className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span>{item.title}</span>
                      </span>
                      <span className="font-mono font-black text-slate-900 dark:text-emerald-300">
                        රු. {(Number(item.amount) || 0).toLocaleString()}.00
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Box */}
              <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>ගෙවිය යුතු මුළු මුදල:</span>
                </span>
                <span className="text-base font-mono font-black text-amber-400">
                  රු. {(bill.totalAmount || 0).toLocaleString()}.00
                </span>
              </div>
            </div>
          ) : (
            /* Help Post Details Snippet if no bill attached */
            <div className="bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl p-3 text-xs space-y-1.5 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="font-bold">ගැටලුව:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {post.tagName || post.category || 'ඉල්ලීම'}
                </span>
              </div>
              <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                "{post.whatHappened || post.whatIsNeeded}"
              </p>
            </div>
          )}

          {/* Action 1: Slide to Confirm Right (ඔව් ගැටලුව විසදුනා) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-black text-emerald-800 dark:text-emerald-300 px-1">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                <span>ඔව්, ගණුදෙනු සහ සහය අවසන් (තහවුරු කිරීමට අදින්න)</span>
              </span>
            </div>

            <SlideToConfirmButton
              id="lock-screen-confirm-slider"
              onConfirm={handleSlideResolved}
              label="ඔව්, ගණුදෙනු සහ සහය අවසන් (අදින්න 👉)"
              completedLabel="ස්තුතියි! ගැටලුව විසඳුණු බව තහවුරු විය ✓"
              disabled={isSubmitting}
            />
          </div>

          {/* Secondary Buttons: Chat & Not Yet */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Chat button */}
            <button
              id="lock-screen-chat-btn"
              type="button"
              onClick={() => onOpenChat(post)}
              className="py-3 px-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat පණිවිඩ</span>
            </button>

            {/* Postpone / Not Yet button */}
            <button
              id="lock-screen-notyet-btn"
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  await onRejectCompletion(post);
                } catch (e) {
                  console.error('Error revoking completion:', e);
                } finally {
                  setIsSubmitting(false);
                  onPostpone();
                }
              }}
              className="py-3 px-3.5 rounded-2xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-98 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-300 dark:border-slate-700 disabled:opacity-50 cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>තවම නැත</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


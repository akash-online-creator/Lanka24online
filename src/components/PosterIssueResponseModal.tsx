import React, { useState } from 'react';
import { HelpPost, Language, User } from '../types';
import { 
  AlertCircle, 
  Send, 
  X, 
  Pencil, 
  ShieldAlert,
  CheckCircle2,
  MessageSquare
} from 'lucide-react';

interface PosterIssueResponseModalProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitResponse: (postId: string, responseNote: string, updatedPost?: Partial<HelpPost>) => void;
  onOpenEditPost: (post: HelpPost) => void;
  language: Language;
}

export const PosterIssueResponseModal: React.FC<PosterIssueResponseModalProps> = ({
  post,
  isOpen,
  onClose,
  onSubmitResponse,
  onOpenEditPost,
  language,
}) => {
  const [responseNote, setResponseNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !post) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseNote.trim()) return;

    setIsSubmitting(true);
    try {
      onSubmitResponse(post.id, responseNote.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLangText = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0b1d14] rounded-3xl border-2 border-amber-500/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <ShieldAlert className="w-6 h-6 text-yellow-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  {getLangText('පරිපාලක දැනුම්දීමට පිළිතුරු යැවීම', 'Respond to Admin Notice', 'நிர்வாகி அறிவிப்புக்கு பதிலளிக்கவும்')}
                </h3>
                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-black bg-white text-amber-900 shadow-xs">
                  {post.postCode}
                </span>
              </div>
              <p className="text-xs text-amber-100 font-medium">
                {getLangText(
                  'දැන්වීමේ ගැටලුව සංශෝධනය කර පරිපාලකට දන්වන්න',
                  'Correct post issues and send response to Admin',
                  'சிக்கலைத் திருத்தி நிர்வாகிக்குத் தெரிவிக்கவும்'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
          
          {/* Admin Issue Reason Box */}
          <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border-2 border-rose-300 dark:border-rose-800 space-y-2">
            <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-black text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{getLangText('පරිපාලක (Admin) විසින් පෙන්වාදුන් ගැටලුව:', 'Issue reported by Admin:', 'நிர்வாகியால் தெரிவிக்கப்பட்ட சிக்கல்:')}</span>
            </div>
            <p className="font-semibold text-slate-900 dark:text-slate-100 bg-white/80 dark:bg-black/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 leading-relaxed">
              {post.adminFlagReason || getLangText('නීති රීති පරීක්ෂා කර සංශෝධනය කරන්න.', 'Please review and modify according to policy.', 'விதிகளின்படி மதிப்பாய்வு செய்து திருத்தவும்.')}
            </p>
            {post.isHiddenByAdmin && (
              <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                ⚠️ {getLangText(
                  'මෙම දැන්වීම දැනට අනෙකුත් පරිශීලකයන්ට නොපෙනෙන සේ තාවකාලිකව සඟවා ඇත (Hidden). ඔබගේ සංශෝධනයෙන් පසු Admin විසින් නැවත සක්‍රීය කරනු ඇත.',
                  'This post is currently hidden from other users. Admin will restore it after reviewing your correction.',
                  'இந்த இடுகை தற்போது பயனர்களுக்கு மறைக்கப்பட்டுள்ளது. நிர்வாகி சரிபார்த்த பின் மீண்டும் இயங்குவார்.'
                )}
              </p>
            )}
          </div>

          {/* Quick Option to Edit Post First */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h5 className="font-black text-slate-900 dark:text-white text-xs">
                {getLangText('දැන්වීමේ විස්තර වෙනස් කළ යුතුද?', 'Need to edit post details directly?', 'விவரங்களை மாற்ற வேண்டுமா?')}
              </h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {getLangText('විස්තර, කොන්දේසි හෝ ගෙවීම් සංශෝධනය කරන්න', 'Edit text, conditions, or budget', 'உரையைத் திருத்தவும்')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEditPost(post);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer active:scale-95 transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{getLangText('දැන්වීම Edit කරන්න', 'Edit Post Now', 'திருத்து')}</span>
            </button>
          </div>

          {/* Response Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span>{getLangText('පරිපාලක වෙත ඔබේ පිළිතුර / පැහැදිලි කිරීම:', 'Your explanation / response note:', 'உங்கள் பதில் விளக்கம்:')}</span>
              </label>
              <textarea
                required
                rows={3}
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                placeholder={getLangText(
                  'උදා: "දැන්වීමේ වැරදි විස්තර සංශෝධනය කරන ලදී. කරුණාකර නැවත පරීක්ෂා කර Unhide කරදෙන්න."',
                  'e.g. "I have updated the misleading details and corrected the post. Please review and unhide."',
                  'உதாரணம்: "நான் விபரங்களை திருத்திவிட்டேன், தயவுசெய்து சரிபார்க்கவும்."'
                )}
                className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-semibold focus:outline-none transition-all"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !responseNote.trim()}
                className="flex-1 w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/20 active:scale-95 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {getLangText(
                    'පරිපාලක වෙත පිළිතුර යවන්න (Send Response)',
                    'Send Response to Admin',
                    'பதிலை அனுப்பவும்'
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
              >
                {getLangText('වසන්න', 'Close', 'மூடு')}
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};

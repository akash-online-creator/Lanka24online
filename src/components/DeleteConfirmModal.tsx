import React from 'react';
import { HelpPost } from '../types';
import { Trash2, AlertTriangle, X, ShieldAlert } from 'lucide-react';

interface DeleteConfirmModalProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (postId: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  post,
  isOpen,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen || !post) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-[#091b12] border-2 border-rose-500/70 rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-rose-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-rose-400/40">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-rose-500/20 border border-rose-400/40 rounded-xl text-rose-300">
              <Trash2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>දැන්වීම මකා දැමීම (Delete Post)</span>
              </h3>
              <span className="text-xs font-mono bg-rose-950 border border-rose-400/40 px-2 py-0.5 rounded-md text-rose-200 font-bold">
                #{post.postCode}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-rose-950 hover:bg-rose-700 text-white flex items-center justify-center font-bold transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-slate-900 dark:text-slate-100">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-black text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>ඔබට මෙම දැන්වීම මකා දැමීමට අවශ්‍යද?</span>
            </div>
            <p className="text-xs text-rose-900 dark:text-rose-200 font-bold leading-relaxed">
              මෙහිදී දැන්වීම සාමාන්‍ය පුවරුවෙන් (Feed) ඉවත් වන අතර, **පරිපාලක (Admin) වෙත දින 3ක් යන තෙක් "Delete කරන ලදී"** ලෙස සටහන්ව පවතිනු ඇත.
            </p>
          </div>

          <div className="bg-emerald-50/50 dark:bg-[#05180f] p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 text-xs text-slate-800 dark:text-slate-200 font-medium">
            <span className="font-extrabold block text-slate-900 dark:text-white mb-0.5">දැන්වීම: {post.postCode}</span>
            <p className="line-clamp-2">{post.whatHappened}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-[#05170f] border-t border-rose-200 dark:border-rose-900/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-300 cursor-pointer"
          >
            අවලංගුයි
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirmDelete(post.id);
              onClose();
            }}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>ඔව්, Delete කරන්න</span>
          </button>
        </div>

      </div>
    </div>
  );
};

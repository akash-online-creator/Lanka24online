import React, { useState, useEffect } from 'react';
import { JobListing, JobComment } from '../types/job';
import { getJobComments, addJobComment } from '../utils/jobStorage';
import { 
  X, 
  MessageSquare, 
  Send, 
  User as UserIcon 
} from 'lucide-react';

interface JobCommentsModalProps {
  job: JobListing | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserName?: string;
  currentUserId?: string;
}

export const JobCommentsModal: React.FC<JobCommentsModalProps> = ({
  job,
  isOpen,
  onClose,
  currentUserName = 'පරිශීලක',
  currentUserId,
}) => {
  const [comments, setComments] = useState<JobComment[]>([]);
  const [authorName, setAuthorName] = useState(currentUserName);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (job && isOpen) {
      setComments(getJobComments(job.id));
    }
  }, [job, isOpen]);

  useEffect(() => {
    if (!job) return;
    const handleUpdate = (e: any) => {
      if (e.detail?.jobId === job.id) {
        setComments(getJobComments(job.id));
      }
    };
    window.addEventListener('sahaya_job_comments_updated', handleUpdate);
    return () => window.removeEventListener('sahaya_job_comments_updated', handleUpdate);
  }, [job]);

  if (!isOpen || !job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    const created = addJobComment(
      job.id,
      authorName.trim() || 'පරිශීලක',
      commentText.trim(),
      currentUserId
    );

    setComments((prev) => [created, ...prev]);
    setCommentText('');
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div 
        className="bg-white dark:bg-[#07190f] border-2 border-emerald-500 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs shrink-0">
              <MessageSquare className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black truncate">
                ප්‍රජා අදහස් සහ විමසීම් ({comments.length})
              </h2>
              <p className="text-[11px] text-emerald-100 font-bold truncate">
                {job.title} • {job.companyName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3 max-h-[50vh]">
          {comments.length > 0 ? (
            comments.map((cmt) => (
              <div 
                key={cmt.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0a2014] border border-slate-200 dark:border-[#132d20] space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                      {cmt.userName}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {cmt.createdAtStr || 'දැන්'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line pl-9 leading-relaxed">
                  {cmt.text}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 space-y-2 text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto opacity-40 text-emerald-500" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                තවමත් කිසිදු අදහසක් පළ කර නොමැත.
              </p>
              <p className="text-[11px] text-slate-400">
                ඔබගේ ප්‍රශ්නය හෝ අදහස පහතින් මුලින්ම එක් කරන්න!
              </p>
            </div>
          )}
        </div>

        {/* Comment Form Input */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-4 bg-slate-100 dark:bg-[#0a2014] border-t border-slate-200 dark:border-[#132d20] space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">ඔබේ නම:</span>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="ඔබගේ නම"
              className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0c2618] border border-slate-300 dark:border-slate-700 text-xs font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              required
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="මෙම රැකියාව පිළිබඳ ඔබගේ අදහස හෝ විමසීම මෙහි ලියන්න..."
              className="flex-1 p-2.5 rounded-2xl bg-white dark:bg-[#0c2618] border border-slate-300 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 resize-none"
            />

            <button
              type="submit"
              disabled={isSubmitting || !commentText.trim()}
              className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black shadow-md shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer shrink-0 flex items-center justify-center"
              title="අදහස පළ කරන්න"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

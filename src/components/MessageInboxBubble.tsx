import React from 'react';
import { MessageSquare } from 'lucide-react';
import { HelpPost, User } from '../types';

interface MessageInboxBubbleProps {
  user: User;
  helpPosts: HelpPost[];
  onClick: () => void;
}

export const MessageInboxBubble: React.FC<MessageInboxBubbleProps> = ({
  user,
  helpPosts,
  onClick,
}) => {
  // Compute replies count for both user's posts (as author) and posts user assisted on (as helper)
  const normalizePhone = (phone?: string) => (phone ? phone.replace(/\D/g, '') : '');
  const userPhoneClean = normalizePhone(user?.phone || user?.whatsappNumber);

  const isUserPostAuthor = (post: HelpPost) => {
    if (!post) return false;
    const postPhoneClean = normalizePhone(post.userPhone);
    const isPhoneMatch = Boolean(
      userPhoneClean &&
        postPhoneClean &&
        (userPhoneClean === postPhoneClean ||
          userPhoneClean.endsWith(postPhoneClean.slice(-7)) ||
          postPhoneClean.endsWith(userPhoneClean.slice(-7)))
    );
    const isIdMatch = Boolean(
      (user?.userId && post.userId && post.userId === user.userId) ||
      (user?.id && post.userId && post.userId === user.id)
    );
    const isNameMatch = Boolean(
      user?.name &&
      post?.userName &&
      (post.userName || '').trim().toLowerCase() === (user.name || '').trim().toLowerCase()
    );

    return isPhoneMatch || isIdMatch || isNameMatch;
  };

  const isUserHelperOnPost = (post: HelpPost) => {
    if (!post || isUserPostAuthor(post)) return false;
    const replies = post.replies || [];
    return replies.some((r) => {
      if (!r) return false;
      const repPhone = normalizePhone(r.responderPhone);
      const isPhone = Boolean(userPhoneClean && repPhone && (userPhoneClean === repPhone || userPhoneClean.endsWith(repPhone.slice(-7))));
      const isName = Boolean(user?.name && r.responderName && (r.responderName || '').trim().toLowerCase() === (user.name || '').trim().toLowerCase());
      return isPhone || isName;
    });
  };

  let totalReplies = 0;
  (helpPosts || []).forEach((post) => {
    if (!post || post.isDeleted) return;
    if (isUserPostAuthor(post) || isUserHelperOnPost(post)) {
      const reps = post.replies || [];
      totalReplies += reps.length;
    }
  });

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Message Inbox"
      title="මැසේජ් Inbox (Message Inbox)"
      className="relative group flex items-center justify-center p-0 bg-transparent border-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-full"
    >
      {/* Outer Pulse Glow */}
      <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-green-500 opacity-60 blur-md group-hover:opacity-100 animate-pulse transition duration-500 pointer-events-none" />

      {/* Circular Chat Bubble Container */}
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#006e43] via-[#008753] to-emerald-400 text-white flex items-center justify-center shadow-[0_8px_25px_rgba(0,122,75,0.45)] group-hover:shadow-[0_12px_32px_rgba(0,122,75,0.65)] border-2 sm:border-[3px] border-white/90 dark:border-emerald-300 transform transition-all duration-200 group-hover:scale-110 active:scale-95">
        <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-sm group-hover:rotate-6 transition-transform" />

        {/* Message Count Notification Badge */}
        {totalReplies > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 min-w-[24px] h-6 px-1.5 bg-rose-600 text-white font-black text-xs font-mono rounded-full flex items-center justify-center border-2 border-white dark:border-[#07130c] shadow-lg animate-bounce">
            {totalReplies > 99 ? '99+' : totalReplies}
          </span>
        ) : (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-slate-800/90 text-slate-200 font-black text-[10px] font-mono rounded-full flex items-center justify-center border-2 border-white dark:border-[#07130c] shadow-sm">
            0
          </span>
        )}
      </div>
    </button>
  );
};

import React, { useState } from 'react';
import { 
  Heart, 
  ThumbsDown,
  MessageSquare, 
  Share2, 
  MoreVertical, 
  Trash2, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Pin,
  Pencil,
  Phone,
  MessageCircle,
  HelpCircle,
  Zap,
  Bookmark,
  Rocket,
  ShieldAlert,
  UserCheck,
  MapPin,
  AlertTriangle,
  Download,
  X,
  Send,
  Users,
  Lock,
  User as UserIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { HelpPost, User, Language, LocationOption, PostComment } from '../types';
import { checkIsPostOwner, checkIsAdmin } from '../utils/postOwnerHelper';
import { addDeletedPostId } from '../utils/deletedPostsManager';
import { deleteHelpPostFromFirestore, updateHelpPostInFirestore } from '../lib/firebase';
import { maskPhone } from '../utils/demoDataMasker';
import { AudioVoicePlayer } from './AudioVoiceNote';
import { getFontFamilyById, injectPostFonts } from '../utils/postFontManager';

export interface PostCardProps {
  post: HelpPost | any;
  currentUser?: User | null;
  viewerLocation?: LocationOption;
  lang?: Language;
  language?: Language;
  isOwner?: boolean;
  isSaved?: boolean;
  onToggleSave?: (post: HelpPost) => void;
  onOfferSupport?: (post: HelpPost) => void;
  onEditPost?: (post: HelpPost | any) => void;
  onDeletePost?: (postIdOrPost: any) => void;
  onToggleHidePost?: (post: HelpPost | any) => void;
  onViewPost?: (post: HelpPost) => void;
  onViewDetails?: (postId: string) => void;
  onOpenChat?: (post: HelpPost) => void;
  onOpenConfirm?: (post: HelpPost) => void;
  onOpenSupportOffers?: (post: HelpPost) => void;
  onBoostPost?: (post: HelpPost) => void;
  onRequireRegistration?: () => void;
  onAdminModerate?: (post: HelpPost) => void;
  onPosterRespondIssue?: (post: HelpPost) => void;
  onPinPost?: (postId: string) => void;
  onLike?: (postId: string) => void;
  onUnlike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onApprovePost?: (postId: string) => void;
  onRejectPost?: (postId: string) => void;
  onViewProfile?: (userIdOrName: string) => void;
  isDemo?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  viewerLocation,
  lang,
  language = 'si',
  isOwner,
  isSaved: propIsSaved = false,
  onToggleSave,
  onOfferSupport,
  onEditPost,
  onDeletePost,
  onViewPost,
  onViewDetails,
  onOpenChat,
  onOpenConfirm,
  onOpenSupportOffers,
  onBoostPost,
  onRequireRegistration,
  onAdminModerate,
  onPosterRespondIssue,
  onPinPost,
  onLike,
  onUnlike,
  onComment,
  onShare,
  onApprovePost,
  onRejectPost,
  onViewProfile,
  isDemo: propIsDemo,
}) => {
  const activeLang = lang || language || 'si';

  // Fonts injection
  React.useEffect(() => {
    injectPostFonts();
  }, []);

  const [showMenu, setShowMenu] = useState(false);
  const [isDeletingLocal, setIsDeletingLocal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // 📝 Text Expansion State for long posts (....... ellipsis truncation)
  const [isTextExpanded, setIsTextExpanded] = useState(false);

  // 💬 Comments Drawer State
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [localComments, setLocalComments] = useState<PostComment[]>(() => post.commentsList || []);

  // 👍 Like, 👎 Unlike, 🔖 Save Local State
  const myUserId = currentUser?.id || currentUser?.userId || 'anonymous_guest';
  const [likesCount, setLikesCount] = useState<number>(post.likeCount || 0);
  const [isLiked, setIsLiked] = useState<boolean>(() => {
    if (post.likedBy && Array.isArray(post.likedBy)) {
      return post.likedBy.includes(myUserId);
    }
    return false;
  });

  const [unlikesCount, setUnlikesCount] = useState<number>(post.unlikesCount || post.unlikeCount || 0);
  const [isUnliked, setIsUnliked] = useState<boolean>(() => {
    if (post.unlikedBy && Array.isArray(post.unlikedBy)) {
      return post.unlikedBy.includes(myUserId);
    }
    return false;
  });

  const [isSaved, setIsSaved] = useState<boolean>(propIsSaved || Boolean(post.savedBy?.includes(myUserId)));
  const [savesCount, setSavesCount] = useState<number>(post.savesCount || post.saveCount || (propIsSaved ? 1 : 0));

  // Report Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  if (!post || isDeletingLocal) return null;

  const isDemo = Boolean(propIsDemo ?? currentUser?.isDemo);
  const isAdmin = !isDemo && checkIsAdmin(currentUser);
  const ownerCheck = isOwner ?? checkIsPostOwner(currentUser, post);
  const canModify = ownerCheck || isAdmin;

  // Auto-hide post if 5 or more reports received (Visible only to Admin)
  const isHiddenByReports = Boolean(post.isHidden || (post.reportsCount && post.reportsCount >= 5));
  if (!isAdmin && isHiddenByReports) {
    return null;
  }

  const getLangText = (si: string, en: string, ta: string) => {
    if (activeLang === 'en') return en;
    if (activeLang === 'ta') return ta;
    return si;
  };

  const getCityOnly = (locStr?: string): string => {
    if (!locStr) return viewerLocation?.nameSi?.split('(')[0]?.trim() || getLangText('නගරය', 'City', 'நகரம்');
    if (/^\d+\.\d+/.test(locStr.trim())) {
      return viewerLocation?.nameSi?.split('(')[0]?.trim() || getLangText('නගරය', 'City', 'நகரம்');
    }
    const cleaned = locStr.split('(')[0].split(',')[0].trim();
    return cleaned || locStr;
  };

  // 👤 Author Name & Avatar (Handling Anonymous Posts)
  const isAnonymousPost = Boolean(post.isAnonymous || post.userName?.startsWith('Anonymous #'));
  const authorName = isAnonymousPost
    ? (post.anonymousId || post.userName || 'Anonymous #User')
    : (post.userName || post.authorName || getLangText('සහය ඉල්ලුම්කරු', 'Help Seeker', 'உதவி கோருபவர்'));

  const authorPhoto = isAnonymousPost ? '' : (post.userPhotoUrl || post.photoUrl || '');
  const postCode = post.postCode || (post.id ? `#POST-${post.id.replace(/[^0-9]/g, '').slice(-4) || 'HELP'}` : '#HELP');
  const nearestCity = getCityOnly(post.locationName || post.city || post.town);
  const distance = typeof post.distanceKm === 'number' ? post.distanceKm : null;
  const phoneNumber = post.userPhone || post.contactPhone || post.contactWhatsapp || '';
  const displayPhone = maskPhone(phoneNumber, isDemo);

  const formatPostDate = (dateVal?: any): string => {
    if (!dateVal) return getLangText('මෑතකදී', 'Recently', 'சமீபத்தில்');
    if (typeof dateVal === 'string') {
      if (dateVal.includes('මීට') || dateVal.includes('පෙර') || dateVal.includes('ago')) {
        return dateVal;
      }
      const parsed = Date.parse(dateVal);
      if (!isNaN(parsed)) {
        try {
          const d = new Date(parsed);
          return `${d.toLocaleDateString(activeLang === 'en' ? 'en-US' : 'si-LK')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } catch {
          return dateVal;
        }
      }
      return dateVal;
    }
    if (typeof dateVal === 'number') {
      try {
        const d = new Date(dateVal);
        return `${d.toLocaleDateString(activeLang === 'en' ? 'en-US' : 'si-LK')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } catch {
        return getLangText('මෑතකදී', 'Recently', 'சமீபத்தில்');
      }
    }
    return getLangText('මෑතකදී', 'Recently', 'சமீபத்தில்');
  };

  // -------------------------------------------------------------
  // 👍 LIKE HANDLER
  // -------------------------------------------------------------
  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLike) onLike(post.id);

    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(nextLiked);
    setLikesCount(nextCount);

    if (nextLiked && isUnliked) {
      setIsUnliked(false);
      setUnlikesCount((prev) => Math.max(0, prev - 1));
    }

    try {
      if (post.id) {
        await updateHelpPostInFirestore(post.id, {
          likeCount: nextCount,
          likedBy: nextLiked ? [myUserId] : []
        });
      }
    } catch (_) {}
  };

  // -------------------------------------------------------------
  // 👎 UNLIKE HANDLER
  // -------------------------------------------------------------
  const handleUnlikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUnlike) onUnlike(post.id);

    const nextUnliked = !isUnliked;
    const nextCount = nextUnliked ? unlikesCount + 1 : Math.max(0, unlikesCount - 1);
    setIsUnliked(nextUnliked);
    setUnlikesCount(nextCount);

    if (nextUnliked && isLiked) {
      setIsLiked(false);
      setLikesCount((prev) => Math.max(0, prev - 1));
    }

    try {
      if (post.id) {
        await updateHelpPostInFirestore(post.id, {
          unlikesCount: nextCount,
          unlikeCount: nextCount,
          unlikedBy: nextUnliked ? [myUserId] : []
        });
      }
    } catch (_) {}
  };

  // -------------------------------------------------------------
  // 🔖 SAVE HANDLER
  // -------------------------------------------------------------
  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSave) onToggleSave(post);

    const nextSaved = !isSaved;
    const nextCount = nextSaved ? savesCount + 1 : Math.max(0, savesCount - 1);
    setIsSaved(nextSaved);
    setSavesCount(nextCount);

    try {
      if (post.id) {
        await updateHelpPostInFirestore(post.id, {
          savesCount: nextCount,
          saveCount: nextCount,
        });
      }
    } catch (_) {}
  };

  // -------------------------------------------------------------
  // 💬 COMMENT SUBMISSION HANDLER
  // -------------------------------------------------------------
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setIsSubmittingComment(true);
    const newComment: PostComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser?.id || currentUser?.userId || 'guest_user',
      userName: currentUser?.name || 'සහය සාමාජික',
      userPhotoUrl: currentUser?.photoUrl || '',
      comment: newCommentText.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [...localComments, newComment];
    setLocalComments(updatedComments);
    setNewCommentText('');
    setIsSubmittingComment(false);

    try {
      if (post.id) {
        await updateHelpPostInFirestore(post.id, {
          commentsCount: updatedComments.length,
          commentsList: updatedComments,
        });
      }
    } catch (err) {
      console.warn('Comment sync error:', err);
    }
  };

  // -------------------------------------------------------------
  // 🗑️ DELETE POST
  // -------------------------------------------------------------
  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowMenu(false);
    
    if (!window.confirm(getLangText('මෙම දැන්වීම ඉවත් කිරීමට ඔබට සහතිකද?', 'Are you sure you want to delete this post?', 'இந்த இடுகையை நீக்க உறுதியாக உள்ளீர்களா?'))) return;

    const targetId = post.id;
    setIsDeletingLocal(true);

    if (targetId) {
      addDeletedPostId(targetId);
      try {
        await updateHelpPostInFirestore(targetId, {
          isDeleted: true,
          status: 'deleted',
          deletedAt: new Date().toISOString(),
        }).catch(() => {});
        await deleteHelpPostFromFirestore(targetId).catch(() => {});
      } catch (_) {}
    }

    if (onDeletePost) {
      onDeletePost(targetId || post);
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAnonymousPost && !isAdmin) {
      alert('මෙම දැන්වීම අප්‍රකටව (Anonymous) පළකර ඇත.');
      return;
    }
    if (onViewProfile) {
      onViewProfile(post.actualAuthorId || post.userId || authorName);
    }
  };

  // -------------------------------------------------------------
  // 💬 COMMENTS MODAL / DRAWER
  // -------------------------------------------------------------
  const renderCommentsSection = () => {
    if (!showCommentsDrawer) return null;

    const areCommentsHidden = post.showComments === false && !ownerCheck && !isAdmin;

    return (
      <div 
        className="mt-3.5 pt-3.5 border-t border-slate-200/80 dark:border-emerald-950/80 space-y-3 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <h5 className="text-xs font-black text-slate-800 dark:text-zinc-200">
              අදහස් සහ විමසීම් (Comments - {localComments.length})
            </h5>
          </div>
          <button
            type="button"
            onClick={() => setShowCommentsDrawer(false)}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
          >
            වසන්න ✕
          </button>
        </div>

        {areCommentsHidden ? (
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-[#06160d] border border-slate-200 dark:border-emerald-950 text-center text-xs font-bold text-slate-500 dark:text-zinc-400">
            🔒 මෙම දැන්වීමේ අදහස් (Comments) අන් අයට පෙන්වීම දැන්වීම්කරු විසින් අක්‍රීය කර ඇත.
          </div>
        ) : (
          <>
            {/* Comments List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {localComments.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 dark:text-zinc-500 font-medium">
                  තවමත් අදහස් පළවී නොමැත. මුලින්ම අදහසක් දක්වන්න!
                </div>
              ) : (
                localComments.map((cmt) => (
                  <div 
                    key={cmt.id}
                    className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#06180e] border border-slate-200/80 dark:border-emerald-950/60 flex items-start gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {cmt.userPhotoUrl ? (
                        <img src={cmt.userPhotoUrl} alt={cmt.userName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        cmt.userName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[11px] font-black text-slate-900 dark:text-zinc-100 truncate">{cmt.userName}</span>
                        <span className="text-[9px] text-slate-400 font-medium">{formatPostDate(cmt.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{cmt.comment}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                required
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="ඔබගේ අදහස / විමසීම මෙහි සටහන් කරන්න..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#06160d] border border-slate-200 dark:border-emerald-950 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim() || isSubmittingComment}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white cursor-pointer active:scale-95 transition-all"
                title="Comment කරන්න"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    );
  };

  // -------------------------------------------------------------
  // 🔘 INTERACTIVE ACTION BAR (LIKE, UNLIKE, COMMENT, SAVE)
  // -------------------------------------------------------------
  const renderInteractiveActionBar = () => {
    return (
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-emerald-950/60 flex items-center justify-between gap-2 text-xs font-bold flex-wrap">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Like Button */}
          <button
            type="button"
            onClick={handleLikeClick}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
              isLiked
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-black border border-rose-300 dark:border-rose-800'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#0b2417]'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-rose-500' : ''}`} />
            <span>{likesCount}</span>
          </button>

          {/* Unlike Button */}
          <button
            type="button"
            onClick={handleUnlikeClick}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
              isUnliked
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-zinc-200 font-black border border-slate-300 dark:border-slate-700'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#0b2417]'
            }`}
          >
            <ThumbsDown className={`w-4 h-4 ${isUnliked ? 'fill-current text-slate-700 dark:text-slate-300' : ''}`} />
            <span>{unlikesCount}</span>
          </button>

          {/* Comment Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowCommentsDrawer((prev) => !prev);
            }}
            className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#0b2417] flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>{localComments.length}</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveClick}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
              isSaved
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-black border border-amber-300 dark:border-amber-800'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#0b2417]'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current text-amber-500' : ''}`} />
            <span>{savesCount}</span>
          </button>
        </div>

        {/* Right: In-App Direct Inbox Message & Delete */}
        <div className="flex items-center gap-1.5">
          {/* 💬 In-App Direct Inbox Message Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenChat) {
                onOpenChat(post);
              } else if (onOfferSupport) {
                onOfferSupport(post);
              } else if (onViewDetails) {
                onViewDetails(post.id);
              }
            }}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 text-xs font-bold shadow-xs"
            title="Inbox පණිවිඩයක් එවන්න (Direct Message)"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Inbox</span>
          </button>

          {canModify && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl cursor-pointer active:scale-95"
              title="ඉවත් කරන්න"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // 🏷️ TOP CARD HEADER (Shared across all modes)
  // -------------------------------------------------------------
  const renderCardHeader = () => {
    return (
      <div className="flex items-start justify-between gap-2.5 pb-2.5">
        <div 
          onClick={handleProfileClick}
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            {isAnonymousPost ? (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 text-white flex items-center justify-center font-black text-sm shadow-md border-2 border-slate-300 dark:border-slate-700">
                <UserIcon className="w-5 h-5 text-slate-300" />
              </div>
            ) : authorPhoto ? (
              <img 
                src={authorPhoto} 
                alt={authorName} 
                className="w-10 h-10 rounded-2xl object-cover border-2 border-emerald-500 shadow-md ring-2 ring-emerald-400/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-sm shadow-md border-2 border-white dark:border-slate-800">
                {authorName.charAt(0).toUpperCase()}
              </div>
            )}
            
            {ownerCheck && !isAnonymousPost && (
              <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 border border-white dark:border-slate-800 shadow-xs">
                <UserCheck className="w-3 h-3" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm leading-snug truncate group-hover:text-emerald-600 transition-colors">
                {authorName}
              </h4>

              {isAnonymousPost && (
                <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-zinc-300 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-slate-300 dark:border-slate-700">
                  අප්‍රකට
                </span>
              )}

              {ownerCheck && (
                <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                  ඔබගේ
                </span>
              )}

              <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                {postCode}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{formatPostDate(post.createdAt || post.createdAtIso)}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400 font-medium">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{nearestCity}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Admin Special Audit Badge for Anonymous Posts */}
        {isAdmin && isAnonymousPost && (
          <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-[10px] text-amber-900 dark:text-amber-200 shrink-0">
            <div className="font-black flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-600" />
              <span>Admin Audit:</span>
            </div>
            <div className="truncate max-w-[130px] font-bold">{post.actualAuthorName || 'Unknown'}</div>
            <div className="font-mono text-[9px] text-slate-500">{post.actualAuthorNic || 'NIC N/A'}</div>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // 📝 2. TEXT POST RENDER (Green Highlight Headline & Greenish-White Bold Box)
  // =========================================================================
  if (post.postType === 'text_post') {
    const rawHeadline = post.headline || post.title || '';
    const rawDesc = post.whatHappened || post.content || '';
    const fontStyle = getFontFamilyById(post.selectedFont);
    
    // Box text truncation check (approx 160 chars)
    const isLongText = rawDesc.length > 160;
    const displayText = (!isTextExpanded && isLongText)
      ? rawDesc.substring(0, 160) + '.......'
      : rawDesc;

    return (
      <div className="relative rounded-3xl bg-white dark:bg-[#07170e] border border-slate-200/90 dark:border-emerald-950/80 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden p-4 sm:p-5 flex flex-col justify-between">
        
        {/* Header */}
        {renderCardHeader()}

        {/* Proportional Content Container */}
        <div className="w-full min-h-[170px] rounded-2xl bg-gradient-to-br from-[#f2fcf7] via-[#e8f7f0] to-[#f4faf6] dark:from-[#05180f] dark:via-[#072014] dark:to-[#04140b] border-2 border-emerald-300/80 dark:border-emerald-800/80 p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-inner group relative">
          
          <div className="space-y-3">
            {/* 1. Headline: කොළ පාට background එකේ කළු පාට highlight අකුරෙන් */}
            {rawHeadline && (
              <div className="inline-block bg-emerald-500/25 dark:bg-emerald-500/35 border-2 border-emerald-600/30 dark:border-emerald-400/40 px-3.5 py-1.5 rounded-xl shadow-xs">
                <h3 
                  className="text-base sm:text-lg font-black text-slate-950 dark:text-emerald-100 leading-snug line-clamp-2 tracking-wide"
                  style={{ fontFamily: fontStyle }}
                >
                  {rawHeadline}
                </h3>
              </div>
            )}

            {/* 2. Description Box: කොළ පාටට මිශ්‍ර සුදු පාට කොටුවේ bold අකුරෙන් */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/95 dark:bg-[#071d12]/95 border border-emerald-200/90 dark:border-emerald-900/80 shadow-xs">
              <p 
                className="text-xs sm:text-sm text-slate-950 dark:text-zinc-100 leading-relaxed font-bold"
                style={{ fontFamily: fontStyle }}
              >
                {displayText}
              </p>
            </div>
          </div>

          {/* Ellipsis / Read More Toggle */}
          {isLongText && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsTextExpanded(!isTextExpanded);
              }}
              className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1 self-start cursor-pointer pt-2"
            >
              <span>{isTextExpanded ? 'හකුලන්න (Show Less)' : 'තව කියවන්න (Read More)'}</span>
              {isTextExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Action Bar */}
        {renderInteractiveActionBar()}

        {/* Comments Section */}
        {renderCommentsSection()}
      </div>
    );
  }

  // =========================================================================
  // 📸 3. PICTURE POST RENDER (Ratio 16:9 Image)
  // =========================================================================
  if (post.postType === 'picture_post') {
    const rawHeadline = post.headline || post.title || '';
    const imgUrl = post.imageUrl || post.photoUrl || post.image;

    return (
      <div className="relative rounded-3xl bg-white dark:bg-[#07170e] border border-slate-200/90 dark:border-emerald-950/80 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden p-4 sm:p-5 flex flex-col justify-between">
        
        {/* Header */}
        {renderCardHeader()}

        {/* Headline: කොළ පාට background එකේ කළු පාට highlight අකුරෙන් */}
        {rawHeadline && (
          <div className="mb-2.5">
            <div className="inline-block bg-emerald-500/25 dark:bg-emerald-500/35 border-2 border-emerald-600/30 dark:border-emerald-400/40 px-3.5 py-1.5 rounded-xl shadow-xs">
              <h3 className="text-sm sm:text-base font-black text-slate-950 dark:text-emerald-100 leading-snug tracking-wide">
                {rawHeadline}
              </h3>
            </div>
          </div>
        )}

        {/* Strict 16:9 Image Frame */}
        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative group">
          {imgUrl ? (
            <img 
              src={imgUrl} 
              alt={rawHeadline} 
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
              ඡායාරූපය නොමැත
            </div>
          )}
        </div>

        {/* Action Bar */}
        {renderInteractiveActionBar()}

        {/* Comments Section */}
        {renderCommentsSection()}
      </div>
    );
  }

  // =========================================================================
  // 4. STANDARD & VOICE POST RENDER (Fallback / Existing compatibility)
  // =========================================================================
  const locationText = post.locationName || getLangText('ශ්‍රී ලංකාව', 'Sri Lanka', 'இலங்கை');

  return (
    <div className="relative rounded-3xl bg-white dark:bg-[#07170e] border border-slate-200/80 dark:border-emerald-950/80 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden p-4 sm:p-5">
      {renderCardHeader()}

      {/* Voice Audio Player if voice post */}
      {post.audioUrl && (
        <div className="mb-3">
          <AudioVoicePlayer audioUrl={post.audioUrl} durationSec={post.audioDurationSec} />
        </div>
      )}

      {/* Post Content */}
      <div className="space-y-2 text-xs sm:text-sm">
        {(post.whatHappened || post.content) && (
          <div className="bg-slate-50 dark:bg-[#06160d] p-3 rounded-2xl border border-slate-200/80 dark:border-emerald-950/80">
            <p className="font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-line leading-relaxed">
              {post.whatHappened || post.content}
            </p>
          </div>
        )}

        {post.whatIsNeeded && (
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 font-bold text-emerald-950 dark:text-emerald-100">
            {post.whatIsNeeded}
          </div>
        )}

        {/* Image if present */}
        {post.imageUrl && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <img src={post.imageUrl} alt="Evidence" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Action Bar */}
      {renderInteractiveActionBar()}

      {/* Comments Section */}
      {renderCommentsSection()}
    </div>
  );
};


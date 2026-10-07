import React, { useState } from 'react';
import { 
  Heart, 
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
  Download
} from 'lucide-react';
import { HelpPost, User, Language, LocationOption } from '../types';
import { checkIsPostOwner, checkIsAdmin } from '../utils/postOwnerHelper';
import { addDeletedPostId } from '../utils/deletedPostsManager';
import { deleteHelpPostFromFirestore, updateHelpPostInFirestore } from '../lib/firebase';
import { maskPhone } from '../utils/demoDataMasker';

export interface PostCardProps {
  post: HelpPost | any;
  currentUser?: User | null;
  viewerLocation?: LocationOption;
  lang?: Language;
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
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onApprovePost?: (postId: string) => void;
  onRejectPost?: (postId: string) => void;
  isDemo?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  viewerLocation,
  lang = 'si',
  isOwner,
  isSaved = false,
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
  onComment,
  onShare,
  onApprovePost,
  onRejectPost,
  isDemo: propIsDemo,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeletingLocal, setIsDeletingLocal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!post || isDeletingLocal) return null;

  const isDemo = Boolean(propIsDemo ?? currentUser?.isDemo);
  const isAdmin = !isDemo && checkIsAdmin(currentUser);
  const ownerCheck = isOwner ?? checkIsPostOwner(currentUser, post);
  const canModify = ownerCheck || isAdmin;

  const getLangText = (si: string, en: string, ta: string) => {
    if (lang === 'en') return en;
    if (lang === 'ta') return ta;
    return si;
  };

  // Safe Date Formatter
  const formatPostDate = (dateVal?: any): string => {
    if (!dateVal) return getLangText('මෑතකදී', 'Recently', 'සමීපත්තිල්');
    if (typeof dateVal === 'string') {
      if (dateVal.includes('මීට') || dateVal.includes('පෙර') || dateVal.includes('ago')) {
        return dateVal;
      }
      const parsed = Date.parse(dateVal);
      if (!isNaN(parsed)) {
        try {
          const d = new Date(parsed);
          return `${d.toLocaleDateString(lang === 'en' ? 'en-US' : 'si-LK')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } catch {
          return dateVal;
        }
      }
      return dateVal;
    }
    if (typeof dateVal === 'number') {
      try {
        const d = new Date(dateVal);
        return `${d.toLocaleDateString(lang === 'en' ? 'en-US' : 'si-LK')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } catch {
        return getLangText('මෑතකදී', 'Recently', 'සමීපත්තිල්');
      }
    }
    return getLangText('මෑතකදී', 'Recently', 'සමීපත්තිල්');
  };

  /**
   * 1 & 2. Automatic Backup JSON Creator & Downloader Function
   */
  const triggerPostBackupDownload = (postData: any) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const postId = postData.id || 'UNKNOWN';
      const fileName = `deleted_post_${postId}_${timestamp}.json`;

      const backupContent = {
        deletedAt: new Date().toISOString(),
        deletedBy: {
          id: currentUser?.id || 'unknown',
          name: currentUser?.name || 'Unknown User',
          role: isAdmin ? 'Admin' : 'User'
        },
        postData: postData
      };

      const jsonString = JSON.stringify(backupContent, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Backup JSON download failed:', error);
    }
  };

  /**
   * Complete Delete Action Workflow
   */
  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowMenu(false);
    
    // Step 1: Confirmation Modal
    const confirmMessage = isAdmin
      ? getLangText(
          'පරිපාලක (Admin) ලෙස මෙම දැන්වීම පද්ධතියෙන් සදහටම ඉවත් කිරීමට ඔබට සහතිකද? (දත්ත JSON ගොනුවක් ලෙස ඔබගේ ඩිවයිස් එකට සුරැකෙනු ඇත)',
          'Are you sure you want to permanently delete this post as Admin? (Data will be downloaded as JSON backup)',
          'நிර්வாகியாக இந்த இடுகையை நிரந்தரமாக நீக்க உறுதியாக உள்ளீர்களா? (தரவு JSON கோப்பாக பதிவிறக்கப்படும்)'
        )
      : getLangText(
          'මෙම දැන්වීම ඉවත් කිරීමට ඔබට සහතිකද?',
          'Are you sure you want to delete this post?',
          'இந்த இடுகையை நீக்க உறுதியாக உள்ளீர்களா?'
        );

    if (!window.confirm(confirmMessage)) return;

    const targetId = post.id;

    // Step 2: Automatic Backup JSON Download (Admin සඳහා හෝ Post Owner සඳහා)
    triggerPostBackupDownload(post);

    // Immediate UI hiding for smooth UX
    setIsDeletingLocal(true);

    // Step 3: Permanent Cleanup from Cloud DB & Local Storage Blacklist
    if (targetId) {
      addDeletedPostId(targetId);
      try {
        await updateHelpPostInFirestore(targetId, {
          isDeleted: true,
          status: 'deleted',
          deletedAt: new Date().toISOString(),
          deletedBy: isAdmin ? `Admin (${currentUser?.name || 'Admin'})` : (currentUser?.name || post.userName || 'User')
        }).catch(() => {});

        await deleteHelpPostFromFirestore(targetId).catch(() => {});
      } catch (err) {
        console.warn('Post delete background notice:', err);
      }
    }

    // Step 4: Real-time UI State Refresh Callback
    if (onDeletePost) {
      try {
        onDeletePost(targetId || post);
      } catch (e) {
        console.warn('onDeletePost callback notice:', e);
      }
    }
  };

  const handleEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowMenu(false);
    if (onEditPost) {
      onEditPost(post);
    }
  };

  const handleView = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowMenu(false);
    if (onViewPost) {
      onViewPost(post);
    } else if (onViewDetails && post.id) {
      onViewDetails(post.id);
    }
  };

  const handleChat = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isDemo && onRequireRegistration) {
      onRequireRegistration();
      return;
    }
    if (onOpenChat) {
      onOpenChat(post);
    }
  };

  const handleSupport = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isDemo && onRequireRegistration) {
      onRequireRegistration();
      return;
    }
    if (onOpenConfirm) {
      onOpenConfirm(post);
    } else if (onOfferSupport) {
      onOfferSupport(post);
    } else if (onOpenChat) {
      onOpenChat(post);
    }
  };

  const handleCopyPhone = (phoneNum?: string) => {
    if (!phoneNum) return;
    navigator.clipboard.writeText(phoneNum);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  // Determine Author & Details
  const authorName = post.userName || post.authorName || post.author?.name || getLangText('සහය ඉල්ලුම්කරු', 'Help Seeker', 'உதவி கோருபவர்');
  const postCode = post.postCode || (post.id ? `#POST-${post.id.replace(/[^0-9]/g, '').slice(-4) || 'HELP'}` : '#HELP');
  const phoneNumber = post.userPhone || post.contactPhone || post.contactWhatsapp || '';
  const displayPhone = isDemo ? maskPhone(phoneNumber) : phoneNumber;
  const locationText = post.locationName || post.incidentLocation || getLangText('ශ්‍රී ලංකාව', 'Sri Lanka', 'இலங்கை');
  const distance = typeof post.distanceKm === 'number' ? post.distanceKm : null;

  // Check if corrupted / empty post
  const isCorrupted = !post.whatHappened && !post.whatIsNeeded && !post.title && !post.content && !post.donationItem && !post.itemLostStolenOrSearched;

  return (
    <div className={`bg-white dark:bg-[#0b1d14] rounded-2xl sm:rounded-3xl shadow-md hover:shadow-xl border-2 transition-all duration-200 overflow-hidden relative ${
      post.isPinned 
        ? 'border-amber-400 dark:border-amber-500/80 ring-2 ring-amber-400/20' 
        : post.adminFlagged 
          ? 'border-rose-400 dark:border-rose-600/80 bg-rose-50/10' 
          : isCorrupted
            ? 'border-red-400 dark:border-red-700 bg-red-50/20'
            : 'border-slate-100 dark:border-emerald-950/60'
    }`}>

      {/* Admin Flagged Notice Banner */}
      {post.adminFlagged && (
        <div className="bg-rose-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{getLangText('පරිපාලක පරීක්ෂාවට ලක්වූ දැන්වීමකි (Flagged)', 'Admin Flagged Notice', 'நிர்வாகியால் கொடியிடப்பட்டது')}</span>
            {post.adminFlagReason && <span className="opacity-90 font-normal">({post.adminFlagReason})</span>}
          </div>
          {isAdmin && onAdminModerate && (
            <button 
              onClick={() => onAdminModerate(post)}
              className="bg-white text-rose-700 px-2.5 py-0.5 rounded-lg text-[10px] font-black hover:bg-rose-50 cursor-pointer"
            >
              සමාලෝචනය
            </button>
          )}
        </div>
      )}

      {/* Pinned Post Header */}
      {post.isPinned && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white px-4 py-1.5 text-xs font-black flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Pin className="w-3.5 h-3.5 fill-current" />
            <span>{getLangText('ඉහළින්ම පෙන්වන දැන්වීමකි (Pinned)', 'Pinned Post', 'முக்கிய இடுகை')}</span>
          </div>
          {isAdmin && onPinPost && (
            <button 
              onClick={() => onPinPost(post.id)}
              className="text-[11px] underline hover:text-amber-100 cursor-pointer"
            >
              ඉවත් කරන්න
            </button>
          )}
        </div>
      )}

      {/* Corrupted Post Alert Bar */}
      {isCorrupted && (
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-300 animate-pulse shrink-0" />
            <span>{getLangText('⚠️ හිස් හෝ අසම්පූර්ණ දැන්වීමක් (Incomplete / Empty Post Record)', '⚠️ Incomplete or Empty Post Document', '⚠️ முழுமையற்ற அல்லது வெற்று இடுகை')}</span>
          </div>
          {canModify && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 bg-white text-red-700 hover:bg-red-50 rounded-xl font-black shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{getLangText('වහාම සදහටම ඉවත් කරන්න', 'Delete Post Immediately', 'உடனடியாக நீக்குக')}</span>
            </button>
          )}
        </div>
      )}

      {/* Main Post Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          
          {/* User Info & Avatar */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-base shadow-md border-2 border-white dark:border-slate-800">
                {authorName.charAt(0).toUpperCase()}
              </div>
              {ownerCheck && (
                <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 border border-white dark:border-slate-800 shadow-xs" title="ඔබගේ දැන්වීම">
                  <UserCheck className="w-3 h-3" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-snug truncate">
                  {authorName}
                </h3>
                
                {ownerCheck && (
                  <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                    {getLangText('ඔබේ දැන්වීම', 'Your Post', 'உங்கள் இடுகை')}
                  </span>
                )}

                {isAdmin && (
                  <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-300 dark:border-indigo-700">
                    ADMIN
                  </span>
                )}

                <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {postCode}
                </span>
              </div>

              {/* Time & Location Bar */}
              <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatPostDate(post.createdAt || post.createdAtIso || post.createdAtMs)}</span>
                </span>

                <span>•</span>

                <span className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[160px] sm:max-w-[220px]">{locationText}</span>
                </span>

                {distance !== null && (
                  <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md font-mono font-bold text-[10px]">
                    {distance.toFixed(1)} km
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-1 shrink-0 relative">
            
            {/* Quick Edit & Delete */}
            {canModify && (
              <div className="flex items-center gap-1">
                {onEditPost && (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-xl transition-all cursor-pointer"
                    title={getLangText('දැන්වීම සංස්කරණය', 'Edit Post', 'திருத்துக')}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-all cursor-pointer font-bold"
                  title={getLangText('දැන්වීම සදහටම ඉවත් කරන්න', 'Delete Post Permanently', 'நிரந்தரமாக நீக்குக')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Bookmark / Save Button */}
            {onToggleSave && (
              <button
                type="button"
                onClick={() => onToggleSave(post)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isSaved 
                    ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={getLangText('සුරකින්න', 'Save Post', 'சேமிக்குக')}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}

            {/* 3-Dots Dropdown Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div 
                  className="absolute right-0 top-10 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-emerald-500/40 py-2 z-30 text-xs font-bold animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(onViewPost || onViewDetails) && (
                    <button
                      type="button"
                      onClick={handleView}
                      className="w-full text-left px-4 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{getLangText('විස්තර පරීක්ෂා කරන්න', 'View Details', 'விவரங்களை காண்க')}</span>
                    </button>
                  )}

                  {onBoostPost && (
                    <button
                      type="button"
                      onClick={() => { setShowMenu(false); onBoostPost(post); }}
                      className="w-full text-left px-4 py-2.5 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Rocket className="w-4 h-4 text-amber-500" />
                      <span>{getLangText('ඉහළට ඔසවන්න (Boost)', 'Boost Post', 'மேலேற்றுக')}</span>
                    </button>
                  )}

                  {canModify && onEditPost && (
                    <button
                      type="button"
                      onClick={handleEdit}
                      className="w-full text-left px-4 py-2.5 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Pencil className="w-4 h-4 text-amber-500" />
                      <span>{getLangText('සංස්කරණය කරන්න', 'Edit Post', 'திருத்துக')}</span>
                    </button>
                  )}

                  {canModify && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full text-left px-4 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>{getLangText('සදහටම ඉවත් කරන්න (Delete)', 'Delete Permanently', 'நிரந்தரமாக நீக்குக')}</span>
                    </button>
                  )}

                  {isAdmin && onAdminModerate && (
                    <button
                      type="button"
                      onClick={() => { setShowMenu(false); onAdminModerate(post); }}
                      className="w-full text-left px-4 py-2.5 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center gap-2.5 cursor-pointer border-t border-slate-100 dark:border-slate-800"
                    >
                      <ShieldAlert className="w-4 h-4 text-purple-600" />
                      <span>{getLangText('පරිපාලක පාලනය (Moderate)', 'Admin Moderate', 'நிர்வாக கட்டுப்பாடு')}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category & Service Tag Badge */}
        {(post.tagName || post.tagCategory || post.category) && (
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/80">
              <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{post.tagName || post.tagCategory || post.category}</span>
            </span>
            {post.helpersNeeded && post.helpersNeeded > 1 && (
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-900">
                👥 {getLangText(`සහායකයින් ${post.helpersNeeded}ක් අවශ්‍යයි`, `${post.helpersNeeded} Helpers Needed`, `${post.helpersNeeded} உதவியாளர்கள் தேவை`)}
              </span>
            )}
          </div>
        )}

        {/* Post Content Details */}
        <div className="space-y-2.5 text-sm sm:text-base">
          
          {/* Main Content */}
          {(post.whatHappened || post.content || post.title || post.itemLostStolenOrSearched || post.donationItem) && (
            <div className="bg-slate-50 dark:bg-[#06160d] p-3.5 rounded-2xl border border-slate-200/80 dark:border-emerald-950/80">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <span>📌 {getLangText('සිදුවී ඇති දේ / විස්තරය:', 'What happened / Description:', 'நடந்தது / விளக்கம்:')}</span>
              </div>
              <p className="font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-line leading-relaxed text-sm sm:text-base">
                {post.whatHappened || post.content || post.title || post.itemLostStolenOrSearched || post.donationItem}
              </p>
            </div>
          )}

          {/* What is Needed */}
          {post.whatIsNeeded && (
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60">
              <div className="text-xs font-black text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1">
                <span>🎯 {getLangText('වියයුතු දේ / අවශ්‍ය සහය:', 'What is needed:', 'தேவையான உதவி:')}</span>
              </div>
              <p className="font-bold text-emerald-950 dark:text-emerald-100 whitespace-pre-line leading-relaxed text-sm sm:text-base">
                {post.whatIsNeeded}
              </p>
            </div>
          )}

          {/* Payment & Transport Details */}
          {(post.payment || post.transport || post.conditions) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs sm:text-sm font-medium">
              {post.payment && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-200 flex items-center gap-2">
                  <span className="font-black">💰 {getLangText('ගෙවීම්/ත්‍යාගය:', 'Payment/Reward:', 'கட்டணம்:')}</span>
                  <span className="font-extrabold">{post.payment}</span>
                </div>
              )}

              {post.transport && (
                <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-900 text-sky-950 dark:text-sky-200 flex items-center gap-2">
                  <span className="font-black">🚗 {getLangText('ප්‍රවාහනය:', 'Transport:', 'போக்குவரத்து:')}</span>
                  <span className="font-bold">{post.transport}</span>
                </div>
              )}
            </div>
          )}

          {/* Special Notice */}
          {post.specialNotice && (
            <div className="p-2.5 bg-yellow-50 dark:bg-yellow-950/40 rounded-xl border border-yellow-300 dark:border-yellow-800 text-yellow-900 dark:text-yellow-200 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
              <span>{post.specialNotice}</span>
            </div>
          )}

          {/* Image Attachment */}
          {(post.image || post.photoUrl || post.userPhotoUrl) && !imageError && (
            <div className="mt-3 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-72">
              <img 
                src={post.image || post.photoUrl || post.userPhotoUrl} 
                alt="Post evidence" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                onError={() => setImageError(true)}
              />
            </div>
          )}
        </div>

        {/* Action Bottom Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-emerald-950/60 flex flex-wrap items-center justify-between gap-2.5">
          
          {/* Contact / Phone Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {displayPhone && (
              <button
                type="button"
                onClick={() => handleCopyPhone(phoneNumber)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                title={getLangText('දුරකථන අංකය පිටපත් කරන්න', 'Copy phone number', 'தொலைபேசி எண்ணை நகலெடுக்க')}
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{displayPhone}</span>
                {copiedPhone && <span className="text-[10px] text-emerald-600 font-bold ml-1">✓ පිටපත් විය</span>}
              </button>
            )}

            {(onOpenChat || onViewPost) && (
              <button
                type="button"
                onClick={handleChat}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 text-xs font-black flex items-center gap-1.5 cursor-pointer active:scale-95 border border-emerald-300 dark:border-emerald-800 transition-all"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{getLangText('Chat සංවාදය', 'Chat', 'Chat')}</span>
                {Boolean(post.repliesCount || post.replies?.length) && (
                  <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                    {post.repliesCount || post.replies?.length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center gap-2">
            {(onOfferSupport || onOpenConfirm) && (
              <button
                type="button"
                onClick={handleSupport}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <HelpCircle className="w-4 h-4" />
                <span>{getLangText('සහාය වන්න (Help)', 'Offer Support', 'உதவ முன்வாருங்கள்')}</span>
              </button>
            )}

            {onViewPost && (
              <button
                type="button"
                onClick={handleView}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-black text-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{getLangText('විස්තර', 'Details', 'விவரம்')}</span>
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

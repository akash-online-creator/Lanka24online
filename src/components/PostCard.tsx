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
  Download,
  X,
  Send,
  Users
} from 'lucide-react';
import { HelpPost, User, Language, LocationOption } from '../types';
import { checkIsPostOwner, checkIsAdmin } from '../utils/postOwnerHelper';
import { addDeletedPostId } from '../utils/deletedPostsManager';
import { deleteHelpPostFromFirestore, updateHelpPostInFirestore } from '../lib/firebase';
import { maskPhone } from '../utils/demoDataMasker';
import { AudioVoicePlayer } from './AudioVoiceNote';

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
    if (lang === 'en') return en;
    if (lang === 'ta') return ta;
    return si;
  };

  // Helper to extract ONLY the nearest city/town (නගරය පමණි - නිශ්චිත ස්ථානය සඟවයි)
  const getCityOnly = (locStr?: string): string => {
    if (!locStr) return viewerLocation?.nameSi?.split('(')[0]?.trim() || getLangText('නගරය', 'City', 'நகரம்');
    if (/^\d+\.\d+/.test(locStr.trim())) {
      return viewerLocation?.nameSi?.split('(')[0]?.trim() || getLangText('නගරය', 'City', 'நகரம்');
    }
    const cleaned = locStr.split('(')[0].split(',')[0].trim();
    return cleaned || locStr;
  };

  const authorName = post.userName || post.authorName || post.author?.name || getLangText('සහය ඉල්ලුම්කරු', 'Help Seeker', 'உதவி கோருபவர்');
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
        return getLangText('මෑතකදී', 'Recently', 'சமீபத்தில்');
      }
    }
    return getLangText('මෑතකදී', 'Recently', 'சமீபத்தில்');
  };

  const triggerPostBackupDownload = (postData: any) => {
    if (!isAdmin) return;
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

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowMenu(false);
    
    const confirmMessage = isAdmin
      ? getLangText(
          'පරිපාලක (Admin) ලෙස මෙම දැන්වීම පද්ධතියෙන් සදහටම ඉවත් කිරීමට ඔබට සහතිකද? (දත්ත JSON ගොනුවක් ලෙස සුරැකෙනු ඇත)',
          'Are you sure you want to permanently delete this post as Admin? (Data will be downloaded as JSON backup)',
          'நிர்வாகியாக இந்த இடுகையை நிரந்தரமாக நீக்க உறுதியாக உள்ளீர்களா?'
        )
      : getLangText(
          'මෙම දැන්වීම ඉවත් කිරීමට ඔබට සහතිකද?',
          'Are you sure you want to delete this post?',
          'இந்த இடுகையை நீக்க உறுதியாக உள்ளீர்களா?'
        );

    if (!window.confirm(confirmMessage)) return;

    const targetId = post.id;
    if (isAdmin) triggerPostBackupDownload(post);
    setIsDeletingLocal(true);

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
        console.warn('Post delete notice:', err);
      }
    }

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
    if (onEditPost) onEditPost(post);
  };

  const handleView = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowMenu(false);
    if (onViewPost) onViewPost(post);
    else if (onViewDetails) onViewDetails(post.id);
  };

  const handleCopyPhone = (phoneNum?: string) => {
    if (!phoneNum) return;
    navigator.clipboard.writeText(phoneNum);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleSupport = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isDemo && onRequireRegistration) {
      onRequireRegistration();
      return;
    }
    if (onOfferSupport) {
      onOfferSupport(post);
    } else if (onOpenConfirm) {
      onOpenConfirm(post);
    } else if (onOpenChat) {
      onOpenChat(post);
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
    } else if (onViewPost) {
      onViewPost(post);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportReason.trim() || !post.id) return;
    setIsSubmittingReport(true);
    try {
      const existingReports = Array.isArray(post.reports) ? post.reports : [];
      const newReport = {
        userId: currentUser?.id || currentUser?.userId || 'anonymous',
        userName: currentUser?.name || 'පරිශීලක',
        userPhone: currentUser?.phone || '',
        reason: reportReason.trim(),
        reportedAt: new Date().toISOString()
      };
      const updatedReports = [...existingReports, newReport];
      const newReportsCount = (post.reportsCount || existingReports.length) + 1;
      const isNowHidden = newReportsCount >= 5;

      await updateHelpPostInFirestore(post.id, {
        reports: updatedReports,
        reportsCount: newReportsCount,
        isHidden: isNowHidden,
        hiddenReason: isNowHidden ? '5_reports_received' : undefined,
        lastReportedAt: new Date().toISOString()
      });

      post.reports = updatedReports;
      post.reportsCount = newReportsCount;
      if (isNowHidden) {
        post.isHidden = true;
      }

      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportReason('');
        setReportSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Report submission failed:', err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleUnhidePost = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!post.id) return;
    try {
      await updateHelpPostInFirestore(post.id, {
        isHidden: false,
        hiddenReason: null,
        reportsCount: 0,
        unhiddenAt: new Date().toISOString(),
        unhiddenBy: currentUser?.name || 'Admin'
      });
      post.isHidden = false;
      post.reportsCount = 0;
    } catch (err) {
      console.error('Unhide post failed:', err);
    }
  };

  const renderReportModal = () => {
    if (!showReportModal) return null;
    return (
      <div 
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white dark:bg-[#071e13] border-2 border-rose-500 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                දැන්වීම වාර්තා කිරීම (Report Post)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => { setShowReportModal(false); setReportReason(''); }}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 rounded-2xl border border-rose-200 dark:border-rose-800/80">
            <p className="text-sm font-bold text-rose-950 dark:text-rose-200 leading-relaxed">
              මෙහි ඇති තොරතුරු අසත්‍යද? නැත්නම් මෙහි ඇති ගැටලුව කුමක්ද?
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
              ඔබගේ අදහස / ගැටලුව මෙහි සටහන් කරන්න:
            </label>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="මෙහි ඇති අසත්‍ය තොරතුරු හෝ ගැටලුව කුමක්දැයි සඳහන් කරන්න..."
              rows={3}
              className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-[#05130b] border border-slate-300 dark:border-emerald-900 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {reportSuccess && (
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>වාර්තාව ඇඩ්මින්වරයා වෙත යොමු කරන ලදී!</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => { setShowReportModal(false); setReportReason(''); }}
              className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer active:scale-95"
            >
              අවලංගු කරන්න
            </button>
            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={!reportReason.trim() || isSubmittingReport || reportSuccess}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer active:scale-95"
            >
              {isSubmittingReport ? (
                <span>යවමින්...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>වාර්තා කරන්න (Submit)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // 1. DEDICATED VOICE POST CARD LAYOUT
  // Includes: Name, Nearest City, Post ID, Distance in km, Date & Time,
  // Updates/Edit, Delete & Bookmark buttons, Voice Audio Player,
  // Helpers Needed count below voice, and 3 Action Buttons (සහය වෙමි, චැට්, රිපෝට්)
  // =========================================================================
  const isVoicePost = Boolean(post.isVoicePost || post.mediaType === 'voice' || post.audioUrl);

  if (isVoicePost) {
    return (
      <div className="relative rounded-3xl bg-white dark:bg-[#07170e] border-2 border-emerald-500/70 dark:border-emerald-600/70 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
        
        {/* Admin Reported / Auto-Hidden Notice */}
        {isAdmin && isHiddenByReports && (
          <div className="bg-rose-50 dark:bg-rose-950/80 p-3 sm:p-4 border-b-2 border-rose-500 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 text-xs font-black">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>⚠️ රිපෝට් {post.reportsCount || post.reports?.length || 5}ක් ලැබී සාමාන්‍ය අයට සඟවා ඇත (Hidden)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUnhidePost}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer active:scale-95"
              >
                නැවත පෙන්වන්න (Unhide)
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black cursor-pointer active:scale-95"
              >
                සදහටම ඉවත් කරන්න (Delete)
              </button>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-5 space-y-3.5">
          
          {/* 🏷️ Top Header: Author Name, Post ID, Nearest City, Date/Time, Distance, Category Badge, Edit, Delete, Bookmark */}
          <div className="flex items-start justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-emerald-950/60 flex-wrap">
            
            {/* Left: Author Info, City, Date/Time, Distance */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-sm shadow-md shrink-0 border-2 border-white dark:border-slate-800">
                {authorName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-snug truncate">
                    {authorName}
                  </h4>
                  <span className="font-mono text-[10px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                    {postCode}
                  </span>
                  {ownerCheck && (
                    <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                      {getLangText('ඔබේ දැන්වීම', 'Your Post', 'உங்கள் இடுகை')}
                    </span>
                  )}
                </div>

                {/* Date, Time, Nearest City & Distance */}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatPostDate(post.createdAt || post.createdAtMs)}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span className="truncate max-w-[150px] sm:max-w-[200px]">නගරය: {nearestCity}</span>
                  </span>
                  {distance !== null && (
                    <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md font-mono font-bold text-[10px]">
                      {distance.toFixed(1)} km
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Category Badge, Edit, Delete, Bookmark Buttons */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{post.tagName || post.tagCategory || (post.category === 'quick_services' ? 'ඉක්මන් සේවා' : post.category === 'red_alert' ? 'ආපදා / රතු එළිය' : 'සාමාන්‍ය සේවා')}</span>
              </span>

              {/* Edit / Update Button (යාවත්කාලීන කිරීම්) */}
              {canModify && onEditPost && (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="p-1.5 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer transition-all"
                  title="සංස්කරණය / යාවත්කාලීන කරන්න"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}

              {/* Delete Button (ඩිලීට්) */}
              {canModify && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition-all"
                  title="ඉවත් කරන්න (Delete)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Bookmark Button (බුක්මාර්ක්) */}
              {onToggleSave && (
                <button
                  type="button"
                  onClick={() => onToggleSave(post)}
                  className={`p-1.5 rounded-xl cursor-pointer transition-all ${
                    isSaved 
                      ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="සුරකින්න (Bookmark)"
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>

          </div>

          {/* 🎙️ Playable Voice Note Player */}
          <div className="p-3 bg-slate-50 dark:bg-[#071d12] rounded-2xl border border-emerald-300/80 dark:border-emerald-800 shadow-sm">
            <AudioVoicePlayer audioUrl={post.audioUrl || ''} durationSec={post.audioDurationSec || 15} />
          </div>

          {/* 👥 සහායකයින් අවශ්‍ය ගණන (Voice Player එකට යටින්) */}
          {Boolean(post.helpersNeeded && post.helpersNeeded > 0) && (
            <div className="flex items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-900 shadow-2xs">
                <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{getLangText(`සහායකයින් ${post.helpersNeeded}ක් අවශ්‍යයි`, `${post.helpersNeeded} Helpers Needed`, `${post.helpersNeeded} உதவியாளர்கள் தேவை`)}</span>
              </span>
            </div>
          )}

          {/* 🔘 Exactly 3 Buttons: 1. සහය වෙමි, 2. චැට්, 3. රිපෝට් */}
          <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-emerald-950/60">
            
            {/* Button 1: සහය වෙමි */}
            <button
              type="button"
              onClick={handleSupport}
              className="py-3 px-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md shadow-emerald-700/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-center"
              title="සහය වීමට කැමැත්ත පළකරන්න"
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{ownerCheck ? getLangText('කැමැත්ත දැක්වූවන්', 'Helpers', 'உதவியாளர்கள்') : getLangText('සහය වෙමි', 'I will help', 'உதவுகிறேன்')}</span>
            </button>

            {/* Button 2: චැට් */}
            <button
              type="button"
              onClick={handleChat}
              className="py-3 px-2 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/80 dark:hover:bg-sky-900/80 text-sky-800 dark:text-sky-200 rounded-2xl font-black text-xs sm:text-sm border-2 border-sky-300 dark:border-sky-800 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-center"
              title="දැන්වීම්කරු සමඟ චැට් කරන්න"
            >
              <MessageCircle className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="truncate">{getLangText('චැට්', 'Chat', 'Chat')}</span>
            </button>

            {/* Button 3: රිපෝට් */}
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="py-3 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/80 dark:hover:bg-rose-900/80 text-rose-800 dark:text-rose-200 rounded-2xl font-black text-xs sm:text-sm border-2 border-rose-300 dark:border-rose-800 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-center"
              title="දැන්වීම වාර්තා කරන්න"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="truncate">{getLangText('රිපෝට්', 'Report', 'புகாரளி')}</span>
            </button>

          </div>

        </div>

        {renderReportModal()}

      </div>
    );
  }

  // =========================================================================
  // 2. STANDARD TEXT POST CARD LAYOUT (Unchanged for standard posts)
  // =========================================================================
  const locationText = post.locationName || post.incidentLocation || getLangText('ශ්‍රී ලංකාව', 'Sri Lanka', 'இலங்கை');

  return (
    <div className="relative rounded-3xl bg-white dark:bg-[#07170e] border border-slate-200/80 dark:border-emerald-950/80 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
      
      {/* Top Accent / Status Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

      {/* Main Post Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          
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

            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
          </div>
        )}

        {/* Post Content Details */}
        <div className="space-y-2.5 text-sm sm:text-base">
          {(post.whatHappened || post.content || post.title || post.itemLostStolenOrSearched || post.donationItem) && (
            <div className="bg-slate-50 dark:bg-[#06160d] p-3.5 rounded-2xl border border-slate-200/80 dark:border-emerald-950/80">
              <p className="font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-line leading-relaxed text-sm sm:text-base">
                {post.whatHappened || post.content || post.title || post.itemLostStolenOrSearched || post.donationItem}
              </p>
            </div>
          )}

          {post.whatIsNeeded && (
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60">
              <p className="font-bold text-emerald-950 dark:text-emerald-100 whitespace-pre-line leading-relaxed text-sm sm:text-base">
                {post.whatIsNeeded}
              </p>
            </div>
          )}

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
          <div className="flex items-center gap-2 flex-wrap">
            {displayPhone && (
              <button
                type="button"
                onClick={() => handleCopyPhone(phoneNumber)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{displayPhone}</span>
                {copiedPhone && <span className="text-[10px] text-emerald-600 font-bold ml-1">✓</span>}
              </button>
            )}

            {(onOpenChat || onViewPost) && (
              <button
                type="button"
                onClick={handleChat}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 text-xs font-black flex items-center gap-1.5 cursor-pointer border border-emerald-300 dark:border-emerald-800"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{getLangText('Chat සංවාදය', 'Chat', 'Chat')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {ownerCheck ? (
              <button
                type="button"
                onClick={handleSupport}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 text-white rounded-xl font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>{getLangText('කැමැත්ත දැක්වූවන්', 'Willing Helpers', 'விருப்பம் தெரிவித்தோர்')}</span>
              </button>
            ) : (
              (onOfferSupport || onOpenConfirm) && (
                <button
                  type="button"
                  onClick={handleSupport}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>{getLangText('සහාය වන්න (Help)', 'Offer Support', 'உதவ முன்வாருங்கள்')}</span>
                </button>
              )
            )}
          </div>
        </div>

      </div>

      {renderReportModal()}

    </div>
  );
};

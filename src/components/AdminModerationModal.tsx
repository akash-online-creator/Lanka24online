import React, { useState } from 'react';
import { HelpPost, Language, User, BloodDonationRequest, DisasterReliefItem, VolunteerDonor } from '../types';
import { checkIsAdmin } from '../utils/postOwnerHelper';
import { useUserMode } from '../context/UserModeContext';
import { 
  AlertTriangle, 
  EyeOff, 
  Send, 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  Sparkles,
  MessageSquare,
  Edit,
  Trash2,
  UserX
} from 'lucide-react';

interface AdminModerationModalProps {
  post: HelpPost | BloodDonationRequest | DisasterReliefItem | VolunteerDonor | any | null;
  isOpen?: boolean;
  onClose: () => void;
  onConfirmFlag: (postId: string, reason: string, hideFromUsers: boolean, customNote?: string) => void;
  onUnhideOrRestore?: (postId: string) => void;
  onRestorePost?: (postId: string) => void;
  onEditPost?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onBlockUser?: (userId: string) => void;
  language?: Language;
  adminUser?: User;
}

const COMMON_VIOLATION_REASONS = [
  {
    key: 'inaccurate_details',
    si: 'දැන්වීමේ සත්‍ය නොවන හෝ නොමඟයවන තොරතුරු අඩංගුයි (Misleading information)',
    en: 'Contains false or misleading information.',
    ta: 'தவறான அல்லது திசைதிருப்பும் தகவல்கள் உள்ளன.',
  },
  {
    key: 'offensive_content',
    si: 'නුසුදුසු, අශිෂ්ට හෝ ප්‍රචණ්ඩකාරී වචන/විස්තර අඩංගුයි (Offensive/Inappropriate content)',
    en: 'Contains inappropriate, offensive, or policy-violating text.',
    ta: 'பொருத்தமற்ற அல்லது கொள்கை மீறும் உள்ளடக்கம் உள்ளது.',
  },
  {
    key: 'privacy_security',
    si: 'පුද්ගලික රහස්‍යභාවය හෝ අනුන්ගේ දුරකථන/තොරතුරු අනවසරයෙන් පළකර ඇත (Privacy/Security violation)',
    en: 'Violates personal privacy or unauthorized contact details.',
    ta: 'தனிநபர் தனியுரிமை அல்லது அங்கீகரிக்கப்படாத தொடர்புகள் உள்ளன.',
  },
  {
    key: 'scam_fake',
    si: 'වංචනික, මුදල් ගසාකෑමේ හෝ ව්‍යාජ ඉල්ලීමක් ලෙස පෙනී යයි (Suspected scam or fake request)',
    en: 'Suspected scam, fraudulent, or fake assistance request.',
    ta: 'மோசடி அல்லது போலியான உதவி கோரிக்கையாக சந்தேகிக்கப்படுகிறது.',
  },
  {
    key: 'wrong_category',
    si: 'වැරදි කාණ්ඩයක (Wrong Category) දැන්වීම පළකර ඇත. නිවැරදි කර නැවත යොමු කරන්න.',
    en: 'Posted in the wrong category or section.',
    ta: 'தவறான பிரிவில் பதிவு செய்யப்பட்டுள்ளது.',
  },
];

export const AdminModerationModal: React.FC<AdminModerationModalProps> = ({
  post,
  isOpen,
  onClose,
  onConfirmFlag,
  onUnhideOrRestore,
  onRestorePost,
  onEditPost,
  onDeletePost,
  onBlockUser,
  language,
  adminUser,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [hideFromPublic, setHideFromPublic] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { isUserMode } = useUserMode();

  if ((isOpen !== undefined && !isOpen) || !post) return null;

  const handleSelectPreset = (text: string) => {
    setSelectedPreset(text);
    if (!customReason) {
      setCustomReason(text);
    } else if (!customReason.includes(text)) {
      setCustomReason((prev) => (prev ? `${prev}\n• ${text}` : text));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = customReason.trim() || selectedPreset || 'පරිපාලක විසින් දැන්වීමේ නීති රීති පරීක්ෂා කර සංශෝධනය කරන ලෙස දන්වා ඇත.';
    setIsSubmitting(true);
    try {
      onConfirmFlag(post.id, finalReason, hideFromPublic, customReason.trim());
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

  const isAlreadyFlagged = Boolean(post.adminFlagged);
  const displayPostCode = post.postCode || `#${post.id}`;
  const displayAuthorName = post.userName || post.contactName || post.patientName || post.contactPerson || post.name || 'පරිශීලක';
  const displayAuthorPhone = post.userPhone || post.contactPhone || post.phone || '';
  const displayEvent = post.whatHappened || (post.bloodGroup ? `🩸 රුධිර කාණ්ඩය: ${post.bloodGroup} (${post.hospitalName || ''})` : post.title) || post.hospitalName || 'විස්තර';
  const displayNeed = post.whatIsNeeded || (post.unitsNeeded ? `පයින්ට් ${post.unitsNeeded}ක් අවශ්‍යයි • දිනය: ${post.neededDate || 'අද'}` : post.targetQuantity ? `අවශ්‍ය ප්‍රමාණය: ${post.targetQuantity}` : post.description || 'විස්තර');
  const restoreFn = onUnhideOrRestore || onRestorePost;

  // checkIsAdmin helper එක මගින් පරිශීලකයා පරිපාලකයෙක්ද යන්න තහවුරු කිරීම
  const isAdminUser = checkIsAdmin(adminUser || null);
  const authorUserId = post.userId || post.uid || post.authorId || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0b1d14] rounded-3xl border-2 border-rose-500/70 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-700 via-red-700 to-rose-800 p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  {isAdminUser
                    ? getLangText('පරිපාලක පරීක්ෂණ සහ දැන්වීම් පාලනය', 'Admin Post Moderation', 'நிர்வாகி அறிவிப்பு கட்டுப்பாடு')
                    : getLangText('දැන්වීම පිළිබඳ ගැටලුවක් වාර්තා කරන්න (Report)', 'Report Post to Admin', 'பதிவு பற்றிய சிக்கலை புகாரளிக்கவும்')}
                </h3>
                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-black bg-white text-rose-900 shadow-xs">
                  {displayPostCode}
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium">
                {isAdminUser
                  ? getLangText(
                      'දැන්වීමේ ගැටලුව දැන්වීම්කරුට ක්ෂණිකව දැනුම්දී අවශ්‍ය නම් සඟවන්න (Hide)',
                      'Notify post owner about issue and optionally hide from users',
                      'சிக்கலை பயனருக்கு தெரிவித்து மறைக்கவும்'
                    )
                  : getLangText(
                      'මෙම දැන්වීම පිළිබඳ වැරදි තොරතුරු හෝ ගැටලු පරිපාලක වෙත වාර්තා කරන්න.',
                      'Report incorrect or inappropriate information to the admin.',
                      'தவறான தகவல்களை நிர்வாகியிடம் புகாரளிக்கவும்.'
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

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
          
          {/* Admin Quick Action Toolbar - Only visible to Admins */}
          {isAdminUser && (
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/80 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>🛡️ {getLangText('පරිපාලක ක්ෂණික පාලන පුවරුව', 'Admin Quick Action Toolbar', 'நிர்வாகி விரைவு பட்டி')}</span>
                {isUserMode && <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">(User Mode)</span>}
              </div>
              <div className="flex items-center gap-1.5">
                {/* Edit Post Button */}
                {onEditPost && (
                  <button
                    type="button"
                    onClick={() => {
                      onEditPost(post.id);
                      onClose();
                    }}
                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>{getLangText('සංස්කරණය', 'Edit', 'திருத்து')}</span>
                  </button>
                )}

                {/* Delete Post Button */}
                {onDeletePost && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(getLangText('මෙම දැන්වීම මකා දැමීමට ඔබට විශ්වාසද?', 'Are you sure you want to delete this post?', 'இந்த பதிவை நீக்க நிச்சயமாக விரும்புகிறீர்களா?'))) {
                        onDeletePost(post.id);
                        onClose();
                      }
                    }}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{getLangText('මකා දමන්න', 'Delete', 'நீக்கு')}</span>
                  </button>
                )}

                {/* Block User Button */}
                {onBlockUser && authorUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(getLangText('මෙම පරිශීලකයා බ්ලොක් කිරීමට ඔබට විශ්වාසද?', 'Are you sure you want to block this user?', 'இந்த பயனரை முடக்க நிச்சயமாக விரும்புகிறீர்களா?'))) {
                        onBlockUser(authorUserId);
                        onClose();
                      }
                    }}
                    className="px-2.5 py-1.5 bg-slate-900 dark:bg-black hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>{getLangText('බ්ලොක්', 'Block User', 'முடக்கு')}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Post Summary Card */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-600 dark:text-slate-400">
                {getLangText('දැන්වීම පළකළ සාමාජිකයා:', 'Post Author:', 'பதிவு செய்தவர்:')}
              </span>
              <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                {displayAuthorName} {displayAuthorPhone ? `(${displayAuthorPhone})` : ''}
              </span>
            </div>
            <div className="text-xs font-bold line-clamp-2 text-slate-700 dark:text-slate-200">
              <span className="font-black text-slate-900 dark:text-white">සිදුවීම: </span>
              {displayEvent}
            </div>
            <div className="text-xs font-bold line-clamp-1 text-slate-700 dark:text-slate-200">
              <span className="font-black text-slate-900 dark:text-white">අවශ්‍ය දේ: </span>
              {displayNeed}
            </div>

            {isAlreadyFlagged && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                <div className="font-black flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{getLangText('දැනටමත් ගැටලුවක් සටහන් කර ඇත:', 'Currently Flagged Reason:', 'தற்போதைய சிக்கல் காரணம்:')}</span>
                </div>
                <p className="font-medium text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-black/30 p-2 rounded-lg">
                  {post.adminFlagReason || 'විස්තර නැත'}
                </p>
                {post.posterCorrectionNote && (
                  <div className="mt-1 pt-1 border-t border-amber-200 dark:border-amber-800">
                    <span className="font-black text-emerald-700 dark:text-emerald-400">
                      💬 {getLangText('දැන්වීම්කරුගේ පිළිතුර / සංශෝධනය:', 'Poster response:', 'பயனர் பதில்:')}
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-100 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg mt-0.5 border border-emerald-300">
                      {post.posterCorrectionNote}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Quick Presets Selection */}
            <div className="space-y-2">
              <label className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{getLangText('පොදු ගැටලු කාණ්ඩ (Quick Select):', 'Common Issues (Click to add):', 'பொதுவான காரணங்கள்:')}</span>
              </label>

              <div className="grid grid-cols-1 gap-1.5">
                {COMMON_VIOLATION_REASONS.map((reason, rIdx) => {
                  const label = language === 'en' ? reason.en : language === 'ta' ? reason.ta : reason.si;
                  const isSelected = customReason.includes(label);
                  return (
                    <button
                      key={`v_reason_${reason.key}_${rIdx}`}
                      type="button"
                      onClick={() => handleSelectPreset(label)}
                      className={`p-2.5 rounded-xl text-left text-xs font-bold transition-all border flex items-start gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-950 dark:text-rose-100 shadow-xs'
                          : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-rose-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-rose-600 font-black mt-0.5">•</span>
                      <span className="leading-relaxed">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Detailed Message to Poster */}
            <div className="space-y-1.5">
              <label className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-rose-600" />
                  <span>{getLangText('දැන්වීම්කරුට යවන පණිවිඩය (Message to Poster):', 'Message to Poster:', 'பயனருக்கு அனுப்பப்படும் செய்தி:')}</span>
                </span>
                <span className="text-[11px] font-bold text-slate-500 font-mono">
                  Notification + Chat Inbox
                </span>
              </label>
              <textarea
                required
                rows={3}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={getLangText(
                  'දැන්වීමේ නිවැරදි විය යුතු කරුණු හෝ ගැටලුව මෙහි පැහැදිලිව සඳහන් කරන්න...',
                  'Explain the exact issue or required modification clearly...',
                  'சிக்கலை தெளிவாக விவரிக்கவும்...'
                )}
                className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-400/30 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-semibold focus:outline-none transition-all"
              />
            </div>

            {/* Hide From Users Toggle */}
            <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-extrabold text-xs sm:text-sm text-rose-950 dark:text-rose-100">
                    {getLangText('අනෙකුත් පරිශීලකයන්ට නොපෙනෙන ලෙස සඟවන්න (Hide Post)', 'Hide from other users', 'மற்ற பயனர்களுக்கு மறைக்கவும்')}
                  </h5>
                  <p className="text-[11px] text-rose-800 dark:text-rose-300 font-medium">
                    {getLangText(
                      'දැන්වීම්කරු සහ Admin පමණක් දකින අතර සාමාන්‍ය Feed එකෙන් තාවකාලිකව ඉවත් වේ.',
                      'Only post owner and Admin can view until corrected.',
                      'உரிமையாளரும் நிர்வாகியும் மட்டுமே பார்க்க முடியும்.'
                    )}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={hideFromPublic}
                  onChange={(e) => setHideFromPublic(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              {isAlreadyFlagged && restoreFn && (
                <button
                  type="button"
                  onClick={() => {
                    restoreFn(post.id);
                    onClose();
                  }}
                  className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{getLangText('ගැටලුව විසඳී ඇත / නැවත පෙන්වන්න (Restore/Unhide)', 'Mark Resolved & Unhide', 'சிக்கல் தீர்க்கப்பட்டது')}</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting || (!customReason.trim() && !selectedPreset)}
                className="flex-1 w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/20 active:scale-95 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isAdminUser
                    ? getLangText(
                        'දැන්වීම්කරුට පණිවිඩය යවන්න & සඟවන්න',
                        'Send Issue Notification & Flag Post',
                        'அறிவிப்பை அனுப்பி மறைக்கவும்'
                      )
                    : getLangText(
                        '⚠️ පරිපාලක වෙත වාර්තා කරන්න (Submit Report)',
                        'Submit Report to Admin',
                        'நிர்வாகியிடம் புகாரளிக்கவும்'
                      )}
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
              >
                {getLangText('අවලංගු කරන්න', 'Cancel', 'ரத்து')}
              </button>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
};

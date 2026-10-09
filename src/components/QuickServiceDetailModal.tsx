import React from 'react';
import { 
  MessageCircle, 
  CheckCircle, 
  MapPin, 
  Users, 
  Car, 
  Banknote, 
  HelpCircle,
  Compass,
  Clock,
  Calendar,
  Sparkles,
  ExternalLink,
  User,
  Wrench,
  AlertCircle,
  Trash2,
  X,
  Search,
  Gift,
  Truck,
  Phone,
  MessageSquare,
  ShieldCheck,
  Pencil,
  Lock,
  Languages,
  Loader2,
  Check,
  Trophy,
  RotateCcw,
  Star,
  UserPlus,
  Bell,
  Hourglass,
  KeyRound
} from 'lucide-react';
import { HelpPost, Language, LocationOption, User as UserType, HelperApplicant } from '../types';
import { applyToHelpPost, selectHelperApplicant, cancelAndReopenPost, calculateTravelFee, maskNicNumber } from '../utils/serviceWorkflowManager';
import { calculateMotorcycleRoadDistance, getVillageOrTownDisplay } from '../utils/geoUtils';
import { inspectAndSanitizeMessage } from '../utils/policyGuard';
import { maskName, maskPhone, maskAddress } from '../utils/demoDataMasker';
import { getLocalizedPost, getCardLabels, translateText, translateName } from '../utils/postTranslator';
import { translatePostWithGoogle } from '../utils/googleTranslator';
import { renderTextWithLinks } from '../utils/textUtils';
import { checkIsPostOwner } from '../utils/postOwnerHelper';
import { EmbeddedMediaViewer } from './EmbeddedMediaViewer';
import { AudioVoicePlayer } from './AudioVoiceNote';

// Helper 1: අයදුම්කරුගේ ID අංකයේ අවසන් අංක 4 පමණක් පෙන්වීමේ function එක
function extractId4Digits(idOrNic?: string): string {
  if (!idOrNic) return '****';
  const clean = idOrNic.trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 4) return digits.slice(-4);
  if (clean.length >= 4) return clean.slice(-4);
  return clean;
}

// Helper 2: Web Audio API මගින් Bel Tone / Chime වාදනය කිරීම (D5 -> A5)
function playBellNotificationTone() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const playChime = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playChime(587.33, now, 0.6); // D5
    playChime(880.00, now + 0.15, 0.8); // A5
  } catch (err) {
    console.warn('Bell tone audio failed:', err);
  }
}

// Helper 3: Format MM:SS for 10-minute timer
function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface QuickServiceDetailModalProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: (post: HelpPost) => void;
  onOpenConfirm: (post: HelpPost) => void;
  onDeletePost?: (post: HelpPost) => void;
  onEditPost?: (post: HelpPost) => void;
  onRequireRegistration?: () => void;
  lang: Language;
  currentLocation?: LocationOption;
  currentUser?: UserType;
  onOpenLeaderboard?: () => void;
  onPostUpdated?: (updated: HelpPost) => void;
}

export const QuickServiceDetailModal: React.FC<QuickServiceDetailModalProps> = ({
  post,
  isOpen,
  onClose,
  onOpenChat,
  onOpenConfirm,
  onDeletePost,
  onEditPost,
  onRequireRegistration,
  lang = 'si',
  currentLocation,
  currentUser,
  onOpenLeaderboard,
  onPostUpdated,
}) => {
  const isDemo = Boolean(currentUser?.isDemo);
  const [activePost, setActivePost] = React.useState<HelpPost | null>(post);
  const [isApplying, setIsApplying] = React.useState(false);
  const [applySuccessMsg, setApplySuccessMsg] = React.useState<string | null>(null);
  const [readyTimeLeft, setReadyTimeLeft] = React.useState<number>(600); // 10 minutes
  const [readyConfirmed, setReadyConfirmed] = React.useState<boolean>(false);
  const [hasPlayedBell, setHasPlayedBell] = React.useState<boolean>(false);

  React.useEffect(() => {
    setActivePost(post);
  }, [post]);

  const currentPost = activePost || post;
  const isPostOwner = Boolean(checkIsPostOwner(currentUser, currentPost));
  const applicants = currentPost?.applicants || [];
  const selectedHelpers = currentPost?.selectedHelpers || [];
  const helpersNeeded = currentPost?.helpersNeeded || 1;
  const currentUserId = currentUser?.userId || currentUser?.id;

  const myApplicantEntry = currentUserId ? applicants.find(a => a.helperId === currentUserId) : null;
  const mySelectedEntry = currentUserId ? selectedHelpers.find(h => h.helperId === currentUserId) : null;
  const isHelperApplied = Boolean(myApplicantEntry);
  const isHelperAccepted = Boolean(mySelectedEntry || myApplicantEntry?.status === 'accepted');

  // Seeker's first name for notification
  const seekerFirstName = React.useMemo(() => {
    const raw = currentPost?.userName || 'දැන්වීම්කරු';
    return raw.trim().split(' ')[0] || raw;
  }, [currentPost?.userName]);

  // 10-Minute Timer for Selected Helper
  React.useEffect(() => {
    if (!isHelperAccepted) return;

    if (!hasPlayedBell) {
      playBellNotificationTone();
      setHasPlayedBell(true);
    }

    const selectedAtStr = mySelectedEntry?.appliedAt || myApplicantEntry?.appliedAt;
    let initialSeconds = 600;
    if (selectedAtStr) {
      const elapsed = Math.floor((Date.now() - new Date(selectedAtStr).getTime()) / 1000);
      if (elapsed > 0 && elapsed < 600) {
        initialSeconds = 600 - elapsed;
      } else if (elapsed >= 600) {
        initialSeconds = 0;
      }
    }
    setReadyTimeLeft(initialSeconds);

    const timer = setInterval(() => {
      setReadyTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isHelperAccepted, hasPlayedBell, mySelectedEntry, myApplicantEntry]);

  // Helper confirms readiness ("මම සූදානම්")
  const handleConfirmReady = async () => {
    if (!currentPost || !currentUser) return;
    setReadyConfirmed(true);
    // Generate distinct secret PIN for this helper
    const helperPin = Math.floor(1000 + Math.random() * 9000).toString();
    const updatedSelected = (currentPost.selectedHelpers || []).map(h => {
      if (h.helperId === currentUserId) {
        return { ...h, startPin: helperPin, status: 'accepted' as const, readyConfirmed: true };
      }
      return h;
    });
    const updatedApplicants = (currentPost.applicants || []).map(a => {
      if (a.helperId === currentUserId) {
        return { ...a, startPin: helperPin, status: 'accepted' as const, readyConfirmed: true };
      }
      return a;
    });
    const updatedPost: HelpPost = {
      ...currentPost,
      selectedHelpers: updatedSelected,
      applicants: updatedApplicants,
    };
    setActivePost(updatedPost);
    if (onPostUpdated) onPostUpdated(updatedPost);
  };

  const handleApply = async () => {
    if (!currentPost || !currentUser) return;
    if (isDemo) {
      if (onRequireRegistration) onRequireRegistration();
      return;
    }
    setIsApplying(true);
    try {
      const updated = await applyToHelpPost({
        post: currentPost,
        helperUser: currentUser,
        distanceKm: motorcycleRoute.distanceKm,
      });
      setActivePost(updated);
      if (onPostUpdated) onPostUpdated(updated);
      setApplySuccessMsg('ඔබගේ සහයෝගීතා අයදුම්පත සාර්ථකව යවන ලදී!');
      setTimeout(() => setApplySuccessMsg(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsApplying(false);
    }
  };

  const handleAcceptApplicant = async (app: HelperApplicant) => {
    if (!currentPost) return;
    // Generate distinct 4-digit PIN for this helper
    const helperPin = app.startPin || Math.floor(1000 + Math.random() * 9000).toString();
    const applicantWithPin: HelperApplicant = { 
      ...app, 
      startPin: helperPin, 
      status: 'accepted' as const,
      appliedAt: new Date().toISOString()
    };
    
    // Play bell tone immediately
    playBellNotificationTone();

    const updated = await selectHelperApplicant({
      post: currentPost,
      applicant: applicantWithPin,
    });
    setActivePost(updated);
    if (onPostUpdated) onPostUpdated(updated);
  };

  const handleCancelReopen = async () => {
    if (!currentPost) return;
    const updated = await cancelAndReopenPost({
      post: currentPost,
      reason: 'සහායකයා නොපැමිණීම හේතුවෙන් අවලංගු කරන ලදී.',
    });
    setActivePost(updated);
    if (onPostUpdated) onPostUpdated(updated);
  };

  // 10 minutes expired: Option 1 - Remove helper and pick another
  const handleRemoveHelper = async (helperId: string) => {
    if (!currentPost) return;
    const updatedSelected = (currentPost.selectedHelpers || []).filter(h => h.helperId !== helperId);
    const updatedApplicants = (currentPost.applicants || []).map(a => {
      if (a.helperId === helperId) {
        return { ...a, status: 'pending' as const, readyConfirmed: false, startPin: undefined };
      }
      return a;
    });

    const isFullyStaffed = updatedSelected.length >= (currentPost.helpersNeeded || 1);

    const updatedPost: HelpPost = {
      ...currentPost,
      selectedHelpers: updatedSelected,
      applicants: updatedApplicants,
      helpersAccepted: updatedSelected.length,
      isConfirmed: isFullyStaffed,
      status: isFullyStaffed ? 'confirmed' : 'active',
      serviceStage: isFullyStaffed ? 'accepted' : 'open',
    };

    setActivePost(updatedPost);
    if (onPostUpdated) onPostUpdated(updatedPost);
  };

  // 10 minutes expired: Option 2 - Wait longer / grant extra time
  const handleGrantExtraTime = async (helperId: string) => {
    if (!currentPost) return;
    const nowIso = new Date().toISOString();
    const updatedSelected = (currentPost.selectedHelpers || []).map(h => {
      if (h.helperId === helperId) {
        return { ...h, appliedAt: nowIso };
      }
      return h;
    });
    const updatedApplicants = (currentPost.applicants || []).map(a => {
      if (a.helperId === helperId) {
        return { ...a, appliedAt: nowIso };
      }
      return a;
    });
    const updatedPost: HelpPost = {
      ...currentPost,
      selectedHelpers: updatedSelected,
      applicants: updatedApplicants,
    };
    setActivePost(updatedPost);
    if (onPostUpdated) onPostUpdated(updatedPost);
  };

  const displayPost = React.useMemo(() => (post ? getLocalizedPost(post, lang) : null), [post, lang]);
  const cardLabels = React.useMemo(() => getCardLabels(lang), [lang]);

  const getLangText = (si: string, en: string, ta: string) => {
    if (lang === 'en') return en;
    if (lang === 'ta') return ta;
    return si;
  };

  // Google Translate Dynamic Integration
  const [googlePost, setGooglePost] = React.useState<HelpPost | null>(null);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [translationMode, setTranslationMode] = React.useState<'auto' | 'google' | 'original'>('auto');
  const [targetGoogleLang, setTargetGoogleLang] = React.useState<Language>(lang);

  React.useEffect(() => {
    setTargetGoogleLang(lang);
  }, [lang]);

  React.useEffect(() => {
    let isMounted = true;
    if (!post || translationMode === 'original') {
      setGooglePost(null);
      setIsTranslating(false);
      return;
    }

    if (targetGoogleLang === 'en' || targetGoogleLang === 'ta' || translationMode === 'google') {
      setIsTranslating(true);
      translatePostWithGoogle(post, targetGoogleLang)
        .then((res) => {
          if (isMounted) {
            setGooglePost(res);
            setIsTranslating(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsTranslating(false);
        });
    } else {
      setGooglePost(null);
      setIsTranslating(false);
    }

    return () => {
      isMounted = false;
    };
  }, [post, targetGoogleLang, translationMode]);

  const effectivePost = React.useMemo(() => {
    if (!post) return null;
    if (translationMode === 'original') return post;
    if (googlePost) return googlePost;
    return displayPost;
  }, [translationMode, googlePost, displayPost, post]);

  if (!isOpen || !post || !effectivePost) return null;

  const isAdmin = currentUser?.role === 'admin' && !isDemo;
  const isOwner = checkIsPostOwner(currentUser, post);
  const normalizePhone = (phone?: string) => (phone ? phone.replace(/[^0-9]/g, '') : '');

  const isConfirmedHelper = Boolean(
    !isDemo &&
    currentUser && (
      (post.confirmedHelperPhone && normalizePhone(currentUser.phone) === normalizePhone(post.confirmedHelperPhone)) ||
      (post.confirmedBy && currentUser.name && currentUser.name.trim().toLowerCase() === post.confirmedBy.trim().toLowerCase())
    )
  );
  const hasContactPermission = Boolean(
    !isDemo && (isOwner || isAdmin || isConfirmedHelper || post.revealContactConsent === true)
  );

  // Calculate accurate Motorcycle Road Distance
  const viewerLat = currentLocation?.lat || 7.1710;
  const viewerLng = currentLocation?.lng || 79.8986;
  const viewerLocName = currentLocation?.nameSi || (lang === 'en' ? 'Your Location (Viewer)' : lang === 'ta' ? 'உங்கள் இடம்' : 'ඔබ සිටින ස්ථානය (නරඹන්නා)');

  const postLat = post.lat || 7.1710;
  const postLng = post.lng || 79.8986;
  const postLocName = effectivePost.locationName || (lang === 'en' ? 'Posted Location' : lang === 'ta' ? 'பதிவு செய்யப்பட்ட இடம்' : 'දැන්වීම පළකළ ස්ථානය');

  const motorcycleRoute = calculateMotorcycleRoadDistance(
    postLat,
    postLng,
    viewerLat,
    viewerLng,
    postLocName,
    viewerLocName,
    lang
  );

  const displayPostCode = (post?.postCode && typeof post.postCode === 'string') 
    ? (post.postCode.startsWith('#') ? post.postCode : `#${post.postCode}`) 
    : (post?.id ? `#${post.id.slice(-6)}` : '#POST');
  const helpersCount = post.helpersNeeded || post.helpersCount || 1;

  const isConfirmed = Boolean(post.isConfirmed);

  // Extract conditions & special notice cleanly
  let displaySpecialNotice = effectivePost.specialNotice || '';
  let displayConditions = effectivePost.conditions || '';

  if (!displaySpecialNotice && effectivePost.conditions) {
    if (effectivePost.conditions.includes('විශේෂ දැනුවත් කිරීම')) {
      const parts = effectivePost.conditions.split(/කොන්දේසි[:\s]*/i);
      if (parts.length > 1) {
        displaySpecialNotice = parts[0].replace(/විශේෂ දැනුවත් කිරීම්?[:\s]*/gi, '').trim();
        displayConditions = parts.slice(1).join(' ').trim();
      } else {
        displaySpecialNotice = effectivePost.conditions.replace(/විශේෂ දැනුවත් කිරීම්?[:\s]*/gi, '').trim();
        displayConditions = lang === 'en' ? 'Experienced technicians only, please.' : lang === 'ta' ? 'அனுபவமுள்ளவர்கள் மட்டும் தொடர்பு கொள்ளவும்.' : 'පළපුරුදු කාර්මික ශිල්පින් විමසන්න.';
      }
    }
  }

  if (!displayConditions || displayConditions.trim() === '') {
    displayConditions = lang === 'en' ? 'Experienced technicians only, please.' : lang === 'ta' ? 'அனுபவமுள்ளவர்கள் மட்டும் தொடர்பு கொள்ளவும்.' : 'පළපුරුදු කාර්මික ශිල්පින් විමසන්න.';
  }
  if (!displaySpecialNotice || displaySpecialNotice.trim() === '') {
    displaySpecialNotice = lang === 'en' ? 'Today' : lang === 'ta' ? 'இன்று' : 'අද දවස තුල';
  }

  const safeWhatHappened = !isConfirmed ? inspectAndSanitizeMessage(effectivePost.whatHappened, false).sanitizedText : effectivePost.whatHappened;
  const safeWhatIsNeeded = !isConfirmed ? inspectAndSanitizeMessage(effectivePost.whatIsNeeded, false).sanitizedText : effectivePost.whatIsNeeded;
  const safeConditions = !isConfirmed ? inspectAndSanitizeMessage(displayConditions, false).sanitizedText : displayConditions;
  const safeSpecialNotice = !isConfirmed ? inspectAndSanitizeMessage(displaySpecialNotice, false).sanitizedText : displaySpecialNotice;
  const safeLocationDisplay = isConfirmed 
    ? getVillageOrTownDisplay(postLocName) 
    : (postLocName ? `${getVillageOrTownDisplay(postLocName).split(',')[0]} (🔒)` : '🔒');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      {/* Green and White Mixed Modal Container */}
      <div className="w-full max-w-lg bg-gradient-to-b from-white via-emerald-50/40 to-white dark:from-[#06180f] dark:via-[#04120a] dark:to-[#06180f] border-2 border-emerald-500/50 rounded-[2rem] shadow-[0_20px_60px_rgba(0,122,75,0.25)] overflow-hidden relative p-5 sm:p-6 my-4 flex flex-col max-h-[92vh]">
        
        {/* Header Bar with Emerald accents */}
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-emerald-200/80 dark:border-emerald-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-black bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-xl border border-emerald-300 dark:border-emerald-700/60 shadow-sm">
              {displayPostCode}
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">
              {isPostOwner 
                ? getLangText('සහය දැක්වීමට කැමැත්ත පළකළ අයගේ ලැයිස්තුව', 'Applicants List', 'உதவியாளர் பட்டியல்')
                : (post.category === 'find_for_me' 
                    ? getLangText('සොයාදෙන්න දැන්වීම් විස්තරය', 'Find For Me Details', 'தேடித்தருக விளம்பர விவரம்') 
                    : getLangText('ක්ෂණික සේවා විස්තරය', 'Quick Service Details', 'உடனடி சேவை விவரம்'))}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(isOwner || isAdmin) && onEditPost && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditPost(post);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer border border-amber-300/40"
                title={getLangText('දැන්වීම සංස්කරණය', 'Edit Post', 'திருத்து')}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{getLangText('සංස්කරණය', 'Edit', 'திருத்து')}</span>
              </button>
            )}

            {(isOwner || isAdmin) && onDeletePost && (
              <button
                type="button"
                onClick={() => {
                  onDeletePost(post);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer border border-rose-400/40"
                title={getLangText('දැන්වීම මකා දමන්න (Delete Post)', 'Delete Post', 'நீக்கு')}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{getLangText('මකා දමන්න', 'Delete', 'நீக்கு')}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-emerald-100/80 dark:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 hover:text-emerald-900 dark:hover:text-emerald-100 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-center font-bold transition-all cursor-pointer"
              title={getLangText('වසන්න', 'Close', 'மூடு')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isPostOwner ? (
          /* ========================================================
             1. SEEKER VIEW: STRICTLY DIRECT APPLICANTS & PINS
             ======================================================== */
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            
            {/* Summary Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-xs">
                  {helpersNeeded}
                </div>
                <div>
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                    අවශ්‍ය සහායකයින් ගණන: {helpersNeeded}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    කැමැත්ත පළකළ මුළු ගණන: {applicants.length}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-xs">
                  තෝරාගත් පිරිස: {selectedHelpers.length} / {helpersNeeded}
                </span>
              </div>
            </div>

            {/* Distinct Secret PINs Section for Ready/Confirmed Helpers */}
            {selectedHelpers.length > 0 && (
              <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-300/80 dark:border-amber-700/60 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>රැකියාව ආරම්භ කිරීම සඳහා සහායකයින්ට ලබාදිය යුතු රහස්‍ය PIN අංක:</span>
                </div>
                <div className="space-y-2.5">
                  {selectedHelpers.map((h, idx) => {
                    const isReady = Boolean(h.readyConfirmed);
                    const selectedTime = h.appliedAt ? new Date(h.appliedAt).getTime() : Date.now();
                    const elapsedSeconds = Math.floor((Date.now() - selectedTime) / 1000);
                    const isTimeExpired = !isReady && elapsedSeconds >= 600;
                    const remainingSeconds = Math.max(0, 600 - elapsedSeconds);

                    return (
                      <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-xs space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <div className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{idx + 1}. {h.helperName}</span>
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                                ID: ***{extractId4Digits(h.id || h.helperId || h.helperNicMasked)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isReady ? (
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                                ✅ සූදානම්
                              </span>
                            ) : isTimeExpired ? (
                              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-300 animate-pulse">
                                ⚠️ විනාඩි 10 අවසන්
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-300">
                                ⏳ තහවුරු කිරීමට: {formatCountdown(remainingSeconds)}
                              </span>
                            )}

                            {isReady && (
                              <div className="px-3 py-1 bg-amber-500 text-slate-950 font-mono text-sm font-black rounded-lg shadow-xs tracking-wider border border-amber-600">
                                PIN: {h.startPin || '4829'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 10-Minute Expired Action Buttons: Remove & Pick Another OR Wait Longer */}
                        {!isReady && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              {isTimeExpired 
                                ? '⚠️ සූදානම තහවුරු කිරීමේ කාලය අවසන්. තීරණයක් ගන්න:' 
                                : 'සහායකයා සූදානම් බව තහවුරු කිරීමට බලාපොරොත්තු වේ:'}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleRemoveHelper(h.helperId)}
                                className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 font-bold text-[11px] rounded-xl border border-rose-300 dark:border-rose-800 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                title="සහායකයා ඉවත් කර වෙනත් අයෙකු තෝරාගන්න"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span>ඉවත් කර වෙන කෙනෙක් ගන්න</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleGrantExtraTime(h.helperId)}
                                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold text-[11px] rounded-xl border border-amber-300 dark:border-amber-800 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                title="සහායකයා තහවුරු කරන තුරු තවදුරටත් රැඳී සිටින්න"
                              >
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>තවදුරටත් රැඳී සිටින්න</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 italic">
                  * සහායකයා ඔබගේ ස්ථානයට පැමිණි පසු මෙම PIN අංකය ඔහුට ලබා දෙන්න. ඔහු එය යෙදුමේ සටහන් කර වැඩේ ආරම්භ කරනු ඇත.
                </p>
              </div>
            )}

            {/* Empty State vs Applicants List */}
            {applicants.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3 bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                  තවමත් මේ සඳහා කැමැත්ත පළ කළ සාමාජිකයින් හෝ සහායකයින් නොමැත.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  කරුණාකර සහායකයින් ඔබගේ දැන්වීමට ප්‍රතිචාර දක්වන තෙක් මඳ වේලාවක් රැඳී සිටින්න.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-black text-slate-700 dark:text-slate-300">
                  ඉදිරිපත් වූ අයදුම්කරුවන් ({applicants.length}):
                </div>
                {applicants.map((app, index) => {
                  const isSelected = selectedHelpers.some(h => h.helperId === app.helperId) || app.status === 'accepted';
                  const canSelect = !isSelected && selectedHelpers.length < helpersNeeded;

                  return (
                    <div 
                      key={app.id || index}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isSelected 
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 shadow-xs' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          {/* 1. නම (Name) & 2. ID අංකයේ අග 4 */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                              {app.helperName}
                            </span>
                            <span className="text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700">
                              ID: ***{extractId4Digits(app.id || app.helperId || app.helperNicMasked)}
                            </span>
                          </div>

                          {/* 3. රෑන්කින් එක (Ranking / Rating) */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-extrabold text-amber-700 dark:text-amber-400">
                              {(app.helperRating || 4.8).toFixed(1)} / 5.0
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              ({app.helperReviewsCount || 12} සේවා නිමකර ඇත)
                            </span>
                          </div>

                          {/* 4. ෆීඩ්බැක් (Feedbacks / Comments) */}
                          <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                            <span className="font-bold text-slate-700 dark:text-slate-300">ෆීඩ්බැක්: </span>
                            <span>පාරිභෝගික තෘප්තිය 100% - නියම වෙලාවට වැඩේ නිම කළ ඉතා හොඳ සේවාවක්.</span>
                          </div>

                          {/* 5. රෙජිස්ටර් වුණු දිනය (Registered Date) */}
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>සාමාජිකත්වය: {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('si-LK') : '2024-05-12'}</span>
                          </div>
                        </div>

                        {/* Selection Action Button */}
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          {isSelected ? (
                            <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xs flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              තෝරාගන්නා ලදී
                            </span>
                          ) : canSelect ? (
                            <button
                              type="button"
                              onClick={() => handleAcceptApplicant(app)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer border border-emerald-500"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              තෝරාගන්න
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-xs">
                              පිරිස සම්පූර්ණයි
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Actions for Seeker */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                ලැයිස්තුව වසන්න (Close List)
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================
             2. OUTSIDE HELPER VIEW: FULL AD DETAILS & 10-MIN CONFIRMATION
             ======================================================== */
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
        <div className="bg-white dark:bg-[#071710] border border-emerald-200/90 dark:border-emerald-900/70 rounded-2xl p-4 sm:p-5 space-y-3.5 text-sm overflow-y-auto shadow-sm">
          
          {/* Hi Greeting & User info */}
          <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-emerald-100 dark:border-emerald-950/80 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/50 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                <span>{getLangText('Hi, මම', 'Hi, I am', 'வணக்கம், நான்')}</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-black">
                  {maskName(
                    translateName(
                      effectivePost?.userName || post.userName,
                      translationMode === 'original' ? 'si' : targetGoogleLang
                    ),
                    isDemo,
                    translationMode === 'original' ? 'si' : targetGoogleLang
                  )}
                </span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  {post.userNicMasked || maskNicNumber(post.userNic)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5" />
                {formatPostDate(post.createdAt)}
              </span>
            </div>
          </div>

          {/* Google Translate Interactive Bar */}
          <div className="flex items-center justify-between bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-900 dark:text-emerald-200 font-black">
              <Languages className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Google Translate:</span>
            </div>
            
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setTranslationMode('original');
                  setTargetGoogleLang('si');
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  translationMode === 'original'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-[#06150e] text-slate-600 dark:text-slate-300 hover:bg-emerald-100'
                }`}
              >
                සිංහල (Original)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTranslationMode('google');
                  setTargetGoogleLang('en');
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  targetGoogleLang === 'en' && translationMode !== 'original'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-[#06150e] text-slate-600 dark:text-slate-300 hover:bg-emerald-100'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => {
                  setTranslationMode('google');
                  setTargetGoogleLang('ta');
                }}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  targetGoogleLang === 'ta' && translationMode !== 'original'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-[#06150e] text-slate-600 dark:text-slate-300 hover:bg-emerald-100'
                }`}
              >
                தமிழ்
              </button>
              {isTranslating && (
                <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin ml-1" />
              )}
            </div>
          </div>

          {/* DEDICATED FIND FOR ME PRESENTATION OR STANDARD SERVICE */}
          {post.category === 'find_for_me' ? (() => {
            const effectiveType = post.findForMeType || (
              post.whatHappened?.includes('නැතිවූ') || post.whatIsNeeded?.includes('නැතිවූ') || post.tagName?.toLowerCase().includes('lost')
                ? 'lost'
                : post.whatHappened?.includes('සොරාගත්') || post.whatIsNeeded?.includes('සොරාගත්') || post.tagName?.toLowerCase().includes('stolen')
                ? 'stolen'
                : 'find'
            );

            const effectiveItemName = post.itemLostStolenOrSearched ||
              post.whatHappened?.replace(/^(නැතිවූ|සොරාගත්|සොයන|අවශ්‍ය)\s*(දෙයක්|භාණ්ඩයක්)?:\s*/i, '')?.split('.')[0] ||
              post.whatIsNeeded?.replace(/^නැතිවූ\s*|^සොරාගත්\s*|^සොයන\s*|සොයාදෙන්න\.?$/g, '')?.trim() ||
              post.tagName ||
              'අදාළ භාණ්ඩය / සේවාව';

            const rawContactPhone = post.contactPhone || post.userPhone || '';
            const rawContactWhatsapp = post.contactWhatsapp || post.userPhone || '';
            const rawContactAddress = post.contactAddress || post.locationName || '';

            const effectiveContactPhone = hasContactPermission 
              ? (rawContactPhone || '0771234567') 
              : (rawContactPhone ? `${rawContactPhone.slice(0, 3)} *** **** (🔒 ආරක්ෂිතයි)` : '07* *** **** (🔒 ආරක්ෂිතයි)');
            const effectiveContactWhatsapp = hasContactPermission 
              ? (rawContactWhatsapp || '0771234567') 
              : (rawContactWhatsapp ? `${rawContactWhatsapp.slice(0, 3)} *** **** (🔒 ආරක්ෂිතයි)` : '07* *** **** (🔒 ආරක්ෂිතයි)');
            const effectiveContactAddress = hasContactPermission
              ? (rawContactAddress || 'ගෙදර ලිපිනය')
              : '🔒 නිශ්චිත ලිපිනය ආරක්ෂිතයි (දැන්වීම්කරුගේ අවසරය අවශ්‍යයි)';
            const effectiveLocationName = post.locationName || 'ස්ථානය තහවුරු කර ඇත';
            const effectiveIncidentLocation = post.incidentLocation || post.locationName || '';
            const effectiveIncidentDate = post.incidentDate || (post.createdAt?.includes('මීට') ? 'අද' : post.createdAt) || '';
            const effectiveIncidentTime = post.incidentTime || '';
            const effectiveDelivery = post.deliveryOption || post.transport || 'ගෙනවිත් දෙන්න ඒ සදහා මම ඔබට වෙනම ගෙවන්නම්';
            const effectiveOtherDetails = post.otherDetails || (post.conditions && typeof post.conditions === 'string' && !post.conditions.startsWith('ගණුදෙනුව') && !post.conditions.startsWith('සම්බන්ධ') ? post.conditions : '');
            const showReward = (post.hasReward || Boolean(post.rewardDetails)) && Boolean(post.rewardDetails && post.rewardDetails.trim() !== '');
            const safeIdentifyingInfo = hasContactPermission 
              ? post.identifyingInfo 
              : (post.identifyingInfo ? inspectAndSanitizeMessage(post.identifyingInfo, false).sanitizedText : '');

            return (
              /* DEDICATED FIND FOR ME PRESENTATION IN DETAIL MODAL */
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-xl shadow-xs border ${
                    effectiveType === 'lost'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60'
                      : effectiveType === 'stolen'
                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900/60'
                      : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-900/60'
                  }`}>
                    <Search className="w-3.5 h-3.5" />
                    <span>
                      {effectiveType === 'lost'
                        ? getLangText('නැතිවූ දෙයක් (Lost Item)', 'Lost Item', 'தொலைந்த பொருள்')
                        : effectiveType === 'stolen'
                        ? getLangText('සොරාගත් දෙයක් (Stolen Item)', 'Stolen Item', 'திருடப்பட்ட பொருள்')
                        : getLangText('සොයාදෙන්න (Search / Find)', 'Find Request', 'தேடித்தருக')}
                    </span>
                  </span>

                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{getLangText('සොයාදෙන්න සහය සේවාව', 'Find For Me Support', 'தேடித்தருக உதவி')}</span>
                  </span>
                </div>

                {/* Main Item Badge Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-[#06180f] dark:via-[#04120a] dark:to-[#06180f] border-2 border-emerald-300 dark:border-emerald-800/80 shadow-xs space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {effectiveType === 'lost'
                      ? getLangText('නැතිවූ භාණ්ඩයේ / දෙයෙහි නම:', 'Lost Item Name:', 'தொலைந்த பொருள்:')
                      : effectiveType === 'stolen'
                      ? getLangText('සොරාගත් භාණ්ඩයේ නම:', 'Stolen Item Name:', 'திருடப்பட்ட பொருள்:')
                      : getLangText('සොයන භාණ්ඩයේ / සේවාවේ නම:', 'Requested Item / Service:', 'தேடும் பொருள் / சேவை:')}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>{effectiveItemName}</span>
                  </h3>
                </div>

                {/* Identifying info on item */}
                {post.identifyingInfo && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                      {getLangText('අදාළ දෙය හඳුනාගැනීමේ විශේෂ සලකුණු:', 'Identifying Marks / Info:', 'அடையாளக் குறிகள்:')}
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                      {safeIdentifyingInfo}
                    </p>
                  </div>
                )}

                {/* Incident Date, Time & Location Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">
                        {getLangText('සිදුවූ දිනය සහ වේලාව', 'Date & Time', 'திகதி & நேரம்')}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {effectiveIncidentDate || getLangText('අද දින', 'Today', 'இன்று')} {effectiveIncidentTime && `| ${effectiveIncidentTime}`}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                    <div className="truncate">
                      <span className="text-[10px] text-slate-400 block font-bold">
                        {getLangText('සිදුවූ හෝ නැතිවූ ස්ථානය', 'Incident Location', 'நிகழ்ந்த இடம்')}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {effectiveIncidentLocation}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact & Location Info */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#071710] border border-emerald-200 dark:border-emerald-900/60 space-y-2">
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{getLangText('සම්බන්ධ කරගත හැකි තොරතුරු', 'Contact Information', 'தொடர்பு விவரங்கள்')}</span>
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
                      <span className="text-slate-500 font-bold">{getLangText('දුරකථනය:', 'Phone:', 'தொலைபேசி:')}</span>
                      <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono">
                        {maskPhone(effectiveContactPhone, isDemo)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
                      <span className="text-slate-500 font-bold">WhatsApp:</span>
                      <span className="font-black text-teal-700 dark:text-teal-400 font-mono">
                        {maskPhone(effectiveContactWhatsapp, isDemo)}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 flex items-start gap-1.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-white">{getLangText('ලිපිනය: ', 'Address: ', 'முகவரி: ')}</strong>
                      {maskAddress(effectiveContactAddress, isDemo)}
                    </span>
                  </div>
                </div>

                {/* Delivery / Transaction Method */}
                <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 flex items-start gap-2.5">
                  <Truck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-xs space-y-0.5">
                    <span className="font-black text-emerald-950 dark:text-emerald-200 block">
                      {getLangText('ලබාදීමේ / ගනුදෙනු ක්‍රමය', 'Delivery / Return Method', 'வழங்கும் முறை')}
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      {effectiveDelivery}
                    </p>
                  </div>
                </div>

                {/* Other details */}
                {effectiveOtherDetails && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                      {getLangText('වෙනත් අමතර විස්තර / සටහන්', 'Other Details', 'பிற விவரங்கள்')}
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {effectiveOtherDetails}
                    </p>
                  </div>
                )}

                {/* Reward (Only shown if hasReward) */}
                {showReward && (
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block">
                          {getLangText('ත්‍යාග මුදල / උපහාරය', 'Reward / Bounty', 'வெகுமதி')}
                        </span>
                        <span className="text-xs font-black text-amber-950 dark:text-amber-100">
                          {post.rewardDetails || 'සාධාරණ මුදල් ත්‍යාගයක්'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Direct Instant Action chips */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {hasContactPermission ? (
                    <>
                      {post.userPhone && (
                        <a
                          href={`tel:${post.userPhone}`}
                          className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{getLangText('ඇමතුමක් ගන්න', 'Call', 'அழைக்க')}</span>
                        </a>
                      )}
                      {(post.contactWhatsapp || post.userPhone) && (
                        <a
                          href={`https://wa.me/94${(post.contactWhatsapp || post.userPhone).replace(/^0/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenChat(post)}
                        title={getLangText('දුරකථන අංකය ලබා ගැනීමට ඉල්ලුම්කරු සමග Chat කරන්න', 'Chat to request phone number', 'தொலைபேசி எண்ணை பெற உரையாடவும்')}
                        className="py-2.5 px-3 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{getLangText('අංකය ඉල්ලන්න (Chat)', 'Request Number', 'எண்ணை கேளுங்கள்')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenChat(post)}
                        title={getLangText('ලිපිනය හා WhatsApp තොරතුරු ලබා ගැනීමට Chat කරන්න', 'Chat for address and WhatsApp', 'முகவரி மற்றும் WhatsApp விவரங்களுக்கு உரையாடவும்')}
                        className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-teal-600" />
                        <span>{getLangText('සංවාදය (Chat)', 'Chat', 'உரையாடு')}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })() : (post.isVoicePost || post.audioUrl) ? (
            /* DEDICATED VOICE REQUEST DETAIL PRESENTATION */
            <div className="space-y-3">
              {/* 🎙️ Voice Player Header Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-950 border-2 border-emerald-500/80 shadow-md space-y-3 text-white">
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <span className="font-black text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
                    <span>🎙️ {getLangText('AI හඬ ආධාර ඉල්ලීම (Voice Request)', 'AI Voice Request', 'AI குரல் உதவி கோரிக்கை')}</span>
                  </span>
                  {post.voiceLanguage && (
                    <span className="text-[10px] bg-emerald-800/80 text-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase">
                      {post.voiceLanguage === 'si' ? 'සිංහල' : post.voiceLanguage === 'ta' ? 'தமிழ்' : 'English'}
                    </span>
                  )}
                </div>

                {/* Auto Stamped Date, Time & Sent Location */}
                {(post.voiceSentDate || post.voiceSentTime || post.voiceSentLocation) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-xl bg-black/40 text-xs font-semibold text-emerald-100 border border-emerald-500/30">
                    {post.voiceSentDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{post.voiceSentDate}</span>
                      </div>
                    )}
                    {post.voiceSentTime && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-teal-400" />
                        <span>{post.voiceSentTime}</span>
                      </div>
                    )}
                    {post.voiceSentLocation && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{post.voiceSentLocation}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Audio Voice Player Component */}
                <div className="pt-1">
                  <AudioVoicePlayer 
                    audioUrl={post.audioUrl || post.voiceAudioUrl || ''} 
                    lang={lang} 
                  />
                </div>

                {/* Spoken transcript note if available */}
                {post.voiceTranscript && (
                  <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/30 space-y-1">
                    <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">
                      {getLangText('පටිගත කරන ලද හඬ සටහන (Transcript):', 'Voice Note Transcript:', 'குரல் குறிப்பு உரை:')}
                    </span>
                    <p className="text-xs text-slate-200 font-medium italic">
                      "{post.voiceTranscript}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STANDARD QUICK SERVICE PRESENTATION */
            <>
              {/* 1. සිදුවී ඇති දේ (What Happened) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1">
                <span className="font-extrabold text-xs text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span>1. {cardLabels.whatHappened}:</span>
                </span>
                <p className="text-xs text-slate-900 dark:text-slate-100 font-semibold leading-relaxed">
                  {renderTextWithLinks(safeWhatHappened, lang)}
                </p>
              </div>

              {/* 2. වියයුතු දේ (What is Needed) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1">
                <span className="font-extrabold text-xs text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>2. {cardLabels.whatIsNeeded}:</span>
                </span>
                <p className="text-xs text-slate-900 dark:text-slate-100 font-semibold leading-relaxed">
                  {renderTextWithLinks(safeWhatIsNeeded, lang)}
                </p>
              </div>

              {/* 🏍️ ACCURATE MOTORCYCLE ROAD ROUTE & DISTANCE CARD */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#071911] border-2 border-emerald-400/80 dark:border-emerald-600/80 shadow-md space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-emerald-100 dark:border-emerald-900/60">
                  <span className="text-xs font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                    <span>{getLangText('යතුරුපැදි මාර්ගය හා දුර (Motorcycle Road Route)', 'Motorcycle Road Route', 'மோட்டார் சைக்கிள் பாதை')}</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                    Road GPS
                  </span>
                </div>

                {/* Two Locations Comparison */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <div className="truncate flex-1">
                      <span className="text-slate-400 text-[10px] block font-bold">
                        {getLangText('දැන්වීම් ස්ථානය (සේවාදායකයා):', 'Service Location (Poster):', 'சேவை இடம்:')}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {safeLocationDisplay}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500 mt-1 shrink-0" />
                    <div className="truncate flex-1">
                      <span className="text-slate-400 text-[10px] block font-bold">
                        {getLangText('ඔබ සිටින ස්ථානය (නරඹන්නා):', 'Your Location (Viewer):', 'உங்கள் இடம்:')}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {viewerLocName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Distance & Travel Time readout */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">
                      {getLangText('නියම මාර්ග දුර', 'Road Distance', 'சாலை தூரம்')}
                    </span>
                    <span className="text-sm sm:text-base font-black text-emerald-800 dark:text-emerald-200 font-mono">
                      {motorcycleRoute.distanceKm.toFixed(1)} km
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-teal-50/80 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">
                      {getLangText('ගතවන කාලය (යතුරුපැදි)', 'Travel Time', 'பயண நேரம்')}
                    </span>
                    <span className="text-sm sm:text-base font-black text-teal-800 dark:text-teal-200 font-mono">
                      ~{motorcycleRoute.travelTimeMinutes} mins
                    </span>
                  </div>
                </div>

                {/* Direct Google Maps Directions link / Privacy Lock */}
                {isConfirmed ? (
                  <a
                    href={motorcycleRoute.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{getLangText('Google Maps හරහා මාර්ගය බලන්න', 'View in Google Maps', 'கூகிள் வரைபடத்தில் காண்க')}</span>
                  </a>
                ) : (
                  <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-center">
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>{getLangText('සේවාව තහවුරු වූ පසු Google Maps සජීවී මාර්ගය විවෘත වේ.', 'Live Google Maps unlocks upon confirmation.', 'உறுதிப்படுத்தப்பட்ட பின் வரைபடம் திறக்கப்படும்.')}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* 3. කොන්දේසි (Conditions) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1">
                <span className="font-extrabold text-xs text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span>3. {cardLabels.conditions}:</span>
                </span>
                <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                  {renderTextWithLinks(safeConditions, lang)}
                </p>
              </div>

              {/* 4. විශේෂ දැනුවත් කිරීම (Special Notice) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1">
                <span className="font-extrabold text-xs text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>4. {cardLabels.specialNotice}:</span>
                </span>
                <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                  {renderTextWithLinks(safeSpecialNotice, lang)}
                </p>
              </div>

              {/* Embedded Media Viewer */}
              {post.mediaUrl && (
                <div className="rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-800">
                  <EmbeddedMediaViewer mediaUrl={post.mediaUrl} />
                </div>
              )}

              {/* 8. උදව් කරන්න Prompt */}
              <p className="text-center text-emerald-700 dark:text-emerald-400 font-black pt-1 text-base sm:text-lg tracking-wide">
                {getLangText('උදව් කරන්න.', 'Please help.', 'உதவி செய்யுங்கள்.')}
              </p>
            </>
          )}

        </div>

            {/* Notification Banner when this helper has been selected */}
            {isHelperAccepted && (
              <div className="p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl shadow-lg space-y-2 border border-emerald-400/50">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-300 animate-bounce" />
                  <h4 className="text-sm font-black">
                    {seekerFirstName} ගේ සේවාව සඳහා සහය දැක්වීමට ඔබව තෝරාගන්නා ලදී!
                  </h4>
                </div>
                <p className="text-xs text-emerald-50 font-medium">
                  {readyConfirmed 
                    ? 'ඔබ සූදානම් බව තහවුරු කර ඇත. දැන්වීම්කරුගෙන් ලැබෙන 4-digit PIN අංකය ඇතුළත් කර වැඩ ආරම්භ කරන්න.'
                    : 'කරුණාකර විනාඩි 10ක් ඇතුළත ඔබ සූදානම් බව තහවුරු කරන්න.'}
                </p>
                
                <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold bg-black/30 px-3 py-1.5 rounded-xl border border-white/20">
                    <Hourglass className="w-3.5 h-3.5 text-amber-300" />
                    <span>ඉතිරි කාලය: {formatCountdown(readyTimeLeft)}</span>
                  </div>

                  {!readyConfirmed ? (
                    <button
                      type="button"
                      onClick={handleConfirmReady}
                      className="px-4 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      මම සූදානම්
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 bg-white/20 text-white font-black text-xs rounded-xl flex items-center gap-1 border border-white/30">
                      <Check className="w-3.5 h-3.5" />
                      සූදානම තහවුරු විය
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Toast on apply success */}
            {applySuccessMsg && (
              <div className="p-3 bg-emerald-100 text-emerald-900 text-xs rounded-xl font-bold text-center animate-bounce">
                {applySuccessMsg}
              </div>
            )}

            {/* Bottom Action Buttons: CHAT and CONFIRM / APPLY */}
            <div className="grid grid-cols-2 gap-3 pt-3 shrink-0">
              <button
                onClick={() => {
                  if (isDemo) {
                    if (onRequireRegistration) onRequireRegistration();
                    return;
                  }
                  onOpenChat(currentPost || post);
                }}
                className="py-3 sm:py-3.5 px-4 rounded-2xl bg-white dark:bg-[#071a12] hover:bg-emerald-50 dark:hover:bg-[#0d2a1b] text-emerald-700 dark:text-emerald-300 font-black text-sm border-2 border-emerald-500/70 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>CHAT</span>
              </button>

              {isHelperAccepted && readyConfirmed ? (
                /* Confirmed Ready -> Enter PIN to Start Job */
                <button
                  onClick={() => onOpenConfirm(currentPost || post)}
                  className="py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>🚀 වැඩේ ආරම්භ කරන්න (Start Job)</span>
                </button>
              ) : isHelperAccepted ? (
                /* Selected but waiting to confirm ready */
                <button
                  onClick={handleConfirmReady}
                  className="py-3 sm:py-3.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-1 active:scale-95 cursor-pointer animate-pulse"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>මම සූදානම් ({formatCountdown(readyTimeLeft)})</span>
                </button>
              ) : isHelperApplied ? (
                /* Applied and waiting for seeker to select */
                <div className="py-3 sm:py-3.5 px-3 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border border-amber-400 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center justify-center gap-1 text-center">
                  <span>⏳ කැමැත්ත පළ කර ඇත (තෝරාගැනීම තෙක් රැඳී සිටින්න)</span>
                </div>
              ) : (
                /* Not applied yet -> "මම සහය වෙන්නම්" */
                <button
                  onClick={handleApply}
                  disabled={isApplying}
                  className="py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 text-white font-black text-xs sm:text-sm shadow-[0_4px_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-emerald-400/40"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isApplying ? 'යවමින්...' : '🤝 මම සහය වෙන්නම් (කැමැත්ත පළ කරන්න)'}</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

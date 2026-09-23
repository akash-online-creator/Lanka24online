import React from 'react';
import { 
  MessageSquare, 
  MessageCircle,
  ExternalLink,
  MapPin,
  Pencil,
  Eye,
  Trash2,
  Clock,
  Lock,
  CheckCircle,
  HeartHandshake,
  UserCheck,
  Sparkles,
  ChevronRight,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Search,
  Gift,
  Calendar,
  DollarSign,
  Truck,
  ArrowLeftRight,
  PackageOpen,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  Zap,
  Rocket,
  Globe,
  Languages,
  Check,
  Loader2,
  ThumbsUp,
  Heart,
  Share2,
  MoreHorizontal,
  Copy
} from 'lucide-react';
import { HelpPost, Language, LocationOption, User } from '../types';
import { Card3D } from './Card3D';
import { calculateMotorcycleRoadDistance, getVillageOrTownDisplay } from '../utils/geoUtils';
import { checkIsPostOwner } from '../utils/postOwnerHelper';
import { getAccurateElapsedTime } from '../utils/dateUtils';
import { inspectAndSanitizeMessage } from '../utils/policyGuard';
import { getTagIconComponent } from '../utils/tagUtils';
import { maskName, maskPhone, maskAddress, maskGeneralDetail } from '../utils/demoDataMasker';
import { getLocalizedPost, getCardLabels, translateText, translateName } from '../utils/postTranslator';
import { translatePostWithGoogle } from '../utils/googleTranslator';
import { renderTextWithLinks } from '../utils/textUtils';
import { EmbeddedMediaViewer } from './EmbeddedMediaViewer';
import { AudioVoicePlayer } from './AudioVoiceNote';
import { RequestWhatsAppSmsModal } from './RequestWhatsAppSmsModal';

interface PostCardProps {
  post: HelpPost;
  lang: Language;
  onOfferSupport: (post: HelpPost) => void;
  viewerLocation?: LocationOption;
  currentUser?: User;
  isOwner?: boolean;
  isSaved?: boolean;
  onToggleSave?: (post: HelpPost) => void;
  onEditPost?: (post: HelpPost) => void;
  onViewPost?: (post: HelpPost) => void;
  onDeletePost?: (post: HelpPost) => void;
  onOpenChat?: (post: HelpPost) => void;
  onOpenConfirm?: (post: HelpPost) => void;
  onOpenSupportOffers?: (post: HelpPost) => void;
  onRequireRegistration?: () => void;
  onBoostPost?: (post: HelpPost) => void;
  onAdminModerate?: (post: HelpPost) => void;
  onPosterRespondIssue?: (post: HelpPost) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  lang, 
  onOfferSupport, 
  viewerLocation, 
  currentUser,
  isOwner,
  isSaved = false,
  onToggleSave,
  onEditPost,
  onViewPost,
  onDeletePost,
  onOpenChat,
  onOpenConfirm,
  onOpenSupportOffers,
  onRequireRegistration,
  onBoostPost,
  onAdminModerate,
  onPosterRespondIssue,
}) => {
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const [showRequestSmsModal, setShowRequestSmsModal] = React.useState(false);
  const [isTextExpanded, setIsTextExpanded] = React.useState(false);
  const [showCopiedToast, setShowCopiedToast] = React.useState(false);

  // Facebook-style like/support state
  const [hasLiked, setHasLiked] = React.useState(() => {
    try {
      if (!post?.id) return false;
      return localStorage.getItem(`post_liked_${post.id}_${currentUser?.id || 'anon'}`) === 'true';
    } catch {
      return false;
    }
  });

  const [likesCount, setLikesCount] = React.useState(() => {
    const seed = (post?.id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 18 + 5;
    return post?.likeCount || seed;
  });

  // Google Translate Dynamic Engine Integration
  const [googlePost, setGooglePost] = React.useState<HelpPost | null>(null);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [translationMode, setTranslationMode] = React.useState<'auto' | 'google' | 'original'>('auto');
  const [targetGoogleLang, setTargetGoogleLang] = React.useState<Language>(lang);

  // Sync target language when global app language switches
  React.useEffect(() => {
    setTargetGoogleLang(lang);
  }, [lang]);

  const activeCardLang: Language = (translationMode === 'original' ? 'si' : (targetGoogleLang || lang || 'si')) as Language;

  const displayPost = React.useMemo(() => (post ? getLocalizedPost(post, activeCardLang) : null), [post, activeCardLang]);
  const cardLabels = React.useMemo(() => getCardLabels(activeCardLang), [activeCardLang]);

  // Execute dynamic Google Translate
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
    if (googlePost) {
      return {
        ...displayPost,
        ...googlePost,
        whatHappened: translateText(googlePost.whatHappened || displayPost?.whatHappened || '', activeCardLang),
        whatIsNeeded: translateText(googlePost.whatIsNeeded || displayPost?.whatIsNeeded || '', activeCardLang),
        conditions: translateText(googlePost.conditions || displayPost?.conditions || '', activeCardLang),
        specialNotice: translateText(googlePost.specialNotice || displayPost?.specialNotice || '', activeCardLang),
        transport: translateText(googlePost.transport || displayPost?.transport || '', activeCardLang),
        payment: translateText(googlePost.payment || displayPost?.payment || '', activeCardLang),
      };
    }
    return displayPost || post;
  }, [translationMode, googlePost, displayPost, post, activeCardLang]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post?.id) return;
    setHasLiked((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`post_liked_${post.id}_${currentUser?.id || 'anon'}`, String(next));
      } catch {}
      setLikesCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
      return next;
    });
  };

  const handleSharePost = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post) return;
    try {
      if (navigator.share) {
        navigator.share({
          title: `Sahaya Sewa - ${post.tagName || post.category || 'Help Post'} (${post.postCode || '#HLP'})`,
          text: `${displayPost?.whatHappened || displayPost?.whatIsNeeded || 'සහය ඉල්ලීමක්'}\nස්ථානය: ${displayPost?.locationName || 'ශ්‍රී ලංකාව'}`,
          url: window.location.href
        }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(window.location.href);
        setShowCopiedToast(true);
        setTimeout(() => setShowCopiedToast(false), 2500);
      }
    } catch {
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2500);
    }
  };

  if (!post || !post.id || !effectivePost) return null;

  const isDemo = Boolean(currentUser?.isDemo);

  const handleInterceptAction = (actionCallback?: (p: HelpPost) => void) => {
    if (isDemo) {
      if (onRequireRegistration) {
        onRequireRegistration();
      }
      return;
    }
    if (actionCallback) {
      actionCallback(post);
    }
  };

  const elapsedTimeLabel = getAccurateElapsedTime(post.createdAt, post.createdAtMs, nowMs, activeCardLang);

  const normalizePhone = (phone?: string) => phone ? phone.replace(/[^0-9]/g, '') : '';

  const ownerCheck = isOwner ?? checkIsPostOwner(currentUser, post);

  const isConfirmedHelper = Boolean(
    !isDemo && currentUser && (
      (currentUser.userId && post.confirmedHelperId && currentUser.userId === post.confirmedHelperId) ||
      (currentUser.phone && post.confirmedHelperPhone && normalizePhone(currentUser.phone) === normalizePhone(post.confirmedHelperPhone)) ||
      (post.authorizedUserIds && currentUser.userId && post.authorizedUserIds.includes(currentUser.userId)) ||
      (post.replies?.some(r => (r.isConfirmed || r.isAccepted) && (
        (currentUser.userId && r.responderId && currentUser.userId === r.responderId) ||
        (currentUser.phone && r.responderPhone && normalizePhone(currentUser.phone) === normalizePhone(r.responderPhone)) ||
        (currentUser.name && r.responderName && currentUser.name.trim().toLowerCase() === r.responderName.trim().toLowerCase())
      )))
    )
  );

  const isAdmin = !isDemo && currentUser?.role === 'admin';
  const isConfirmed = Boolean(post.isConfirmed || post.status === 'confirmed' || post.confirmedBy);
  const shouldMask = isDemo || (!isConfirmed && !ownerCheck && !isAdmin);

  // Contact Permission for Anti-Fraud Safeguard (Only show phone/address with poster's consent, or if owner/confirmed helper/admin)
  const hasContactPermission = !isDemo && Boolean(
    ownerCheck || 
    isAdmin || 
    isConfirmedHelper || 
    post.revealContactConsent === true
  );
  const viewerLat = viewerLocation?.lat || 7.1710;
  const viewerLng = viewerLocation?.lng || 79.8986;
  const viewerLocationName = viewerLocation?.nameSi || (activeCardLang === 'en' ? 'Your Location (Viewer)' : activeCardLang === 'ta' ? 'உங்கள் இடம் (பார்வையாளர்)' : 'ඔබ සිටින ස්ථානය (නරඹන්නා)');
  
  const postLat = post.lat || 7.1710;
  const postLng = post.lng || 79.8986;
  const postLocationName = effectivePost.locationName || (activeCardLang === 'en' ? 'Posted Location' : activeCardLang === 'ta' ? 'பதிவு செய்யப்பட்ட இடம்' : 'දැන්වීම පළකළ ස්ථානය');

  const motorcycleRoute = calculateMotorcycleRoadDistance(
    postLat,
    postLng,
    viewerLat,
    viewerLng,
    postLocationName,
    viewerLocationName,
    activeCardLang
  );

  const displayPostCode = post.postCode.startsWith('#') ? post.postCode : `#${post.postCode}`;
  const helpersCount = post.helpersNeeded || post.helpersCount || 1;

  // Extract confirmed helper info if present
  const confirmedHelperName = post.confirmedHelperName || post.confirmedBy || (post.replies?.find(r => r.isConfirmed || r.isAccepted)?.responderName);
  const confirmedHelperPhone = post.confirmedHelperPhone || (post.replies?.find(r => r.isConfirmed || r.isAccepted)?.responderPhone);

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
        displayConditions = activeCardLang === 'en' ? 'Experienced technicians only, please.' : activeCardLang === 'ta' ? 'அனுபவமுள்ள தொழில்நுட்ப வல்லுநர்கள் மட்டும் தொடர்பு கொள்ளவும்.' : 'පළපුරුදු කාර්මික ශිල්පින් විමසන්න.';
      }
    }
  }

  if (!displayConditions || displayConditions.trim() === '') {
    displayConditions = activeCardLang === 'en' ? 'Experienced technicians only, please.' : activeCardLang === 'ta' ? 'அனுபவமுள்ள தொழில்நுட்ப வல்லுநர்கள் மட்டும் தொடர்பு கொள்ளவும்.' : 'පළපුරුදු කාර්මික ශිල්පින් විමසන්න.';
  } else {
    displayConditions = translateText(displayConditions, activeCardLang);
  }
  if (!displaySpecialNotice || displaySpecialNotice.trim() === '') {
    displaySpecialNotice = activeCardLang === 'en' ? 'Today' : activeCardLang === 'ta' ? 'இன்றைய நாளில்' : 'අද දවස තුල';
  } else {
    displaySpecialNotice = translateText(displaySpecialNotice, activeCardLang);
  }

  const safeWhatHappened = translateText(shouldMask ? inspectAndSanitizeMessage(effectivePost.whatHappened, false).sanitizedText : effectivePost.whatHappened, activeCardLang);
  const safeWhatIsNeeded = translateText(shouldMask ? inspectAndSanitizeMessage(effectivePost.whatIsNeeded, false).sanitizedText : effectivePost.whatIsNeeded, activeCardLang);
  const safeConditions = translateText(shouldMask ? inspectAndSanitizeMessage(displayConditions, false).sanitizedText : displayConditions, activeCardLang);
  const safeSpecialNotice = translateText(shouldMask ? inspectAndSanitizeMessage(displaySpecialNotice, false).sanitizedText : displaySpecialNotice, activeCardLang);

  // Quick Service Check
  const isQuickService =
    post.category === 'quick_services' ||
    post.category === 'quick' ||
    post.tagCategory === 'ඉක්මන් සේවා' ||
    Boolean(post.tagName?.toLowerCase().includes('quick')) ||
    Boolean(post.tagName?.includes('හදිසි')) ||
    Boolean(post.customFieldValues?.f_urgency?.toString().includes('Immediate')) ||
    Boolean(post.customFieldValues?.f_urgency?.toString().includes('හදිසි'));

  return (
    <Card3D className={`bg-white dark:bg-[#07130c] border-2 ${
      post.isBoosted
        ? 'border-amber-400 dark:border-amber-500 shadow-[0_16px_36px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/60 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent'
        : isQuickService
        ? 'border-amber-400 dark:border-amber-500/80 shadow-[0_12px_30px_rgba(245,158,11,0.18)] ring-1 ring-amber-400/40'
        : isConfirmed 
        ? 'border-emerald-500/80 shadow-[0_12px_30px_rgba(0,122,75,0.18)]' 
        : 'border-emerald-500/30 hover:border-emerald-500/70 shadow-[0_12px_30px_rgba(0,122,75,0.08),0_2px_8px_rgba(0,0,0,0.04)]'
    } rounded-3xl p-5 sm:p-6 transition-all duration-300 relative group overflow-hidden text-slate-900 dark:text-slate-100`}>
      
      {/* Top Banner Accent */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${
        post.isBoosted
          ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500'
          : isQuickService
          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
          : isConfirmed 
          ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600' 
          : 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400'
      }`}></div>

      <div className="space-y-3.5 pt-1 text-slate-900 dark:text-slate-100 font-sans">
        
        {/* Pinned Emergency / High Priority Alert Banner */}
        {(post.isPinnedEmergency || post.priorityLevel === 'emergency' || post.postCode?.startsWith('#BLD-') || post.postCode?.startsWith('#EMG-')) && (
          <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white text-xs font-black shadow-lg shadow-red-600/30 border-2 border-red-300/80 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span className="tracking-wide">
                {activeCardLang === 'en' 
                  ? '🚨 PINNED HIGH PRIORITY / EMERGENCY' 
                  : activeCardLang === 'ta' 
                  ? '🚨 முதன்மை அவசர அறிவிப்பு' 
                  : '🚨 ප්‍රමුඛතා හදිසි දැන්වීම (Pinned Emergency Alert)'}
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono font-black tracking-wider bg-black/40 text-yellow-300 px-2.5 py-0.5 rounded-lg border border-yellow-300/50">
              URGENT 🔥
            </span>
          </div>
        )}

        {/* Boosted Top Priority Banner */}
        {post.isBoosted && (
          <div className="flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-xs font-black shadow-md border border-amber-300/80">
            <div className="flex items-center gap-1.5">
              <Rocket className="w-4 h-4 text-yellow-200 fill-yellow-200 animate-bounce" />
              <span className="tracking-wide">
                {activeCardLang === 'en' ? '🚀 Boosted Top Ad (Rs. 250)' : activeCardLang === 'ta' ? '🚀 விசேட விளம்பரம் (ரூ. 250)' : '🚀 විශේෂිත දැන්වීම (Boosted Top Ad - රු. 250)'}
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono font-black tracking-wider bg-black/30 px-2 py-0.5 rounded-md border border-amber-200/40">
              ⭐ TOP AD
            </span>
          </div>
        )}

        {/* Quick Service Urgent Priority Banner */}
        {isQuickService && !post.isBoosted && (
          <div className="flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-xs font-black shadow-sm">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-yellow-200 fill-yellow-200 animate-bounce" />
              <span className="tracking-wide">
                {activeCardLang === 'en' ? '⚡ Quick Service Priority' : activeCardLang === 'ta' ? '⚡ அவசர சேவை முன்னுரிமை' : '⚡ ඉක්මන් සේවා (Quick Service Priority)'}
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider bg-black/20 px-2 py-0.5 rounded-md">
              TOP PRIORITY
            </span>
          </div>
        )}

        {/* Prominent Elapsed Time Banner at the Top */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 dark:from-amber-500/20 dark:to-emerald-500/20 border border-amber-500/30 dark:border-amber-400/30 px-3 py-1.5 rounded-2xl shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 font-bold">
              {activeCardLang === 'en' ? 'Elapsed Time:' : activeCardLang === 'ta' ? 'கடந்த நேரம்:' : 'ගතවූ කාලය:'}
            </span>
            <span className="font-extrabold text-amber-800 dark:text-amber-300">{elapsedTimeLabel}</span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-300/80 dark:border-emerald-700/60 shrink-0">
            {activeCardLang === 'en' ? '⏱️ LIVE' : activeCardLang === 'ta' ? '⏱️ நேரலை' : '⏱️ සජීවී'}
          </span>
        </div>

        {/* PROMINENT CONFIRMED STATUS BANNER (If Confirmed) */}
        {isConfirmed && (
          <div className="p-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl shadow-md border border-emerald-400/50 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-200 animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm font-black tracking-tight">
                  {activeCardLang === 'en' ? '✅ Support Confirmed' : activeCardLang === 'ta' ? '✅ உதவி உறுதிப்படுத்தப்பட்டது' : '✅ සහය සනාථ කර ඇත (Support Confirmed)'}
                </span>
              </div>
              <span className="text-[10px] bg-white/20 text-white font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                CONFIRMED
              </span>
            </div>
            {confirmedHelperName && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5 text-xs text-emerald-100 font-medium">
                <span className="text-emerald-200 font-bold">
                  {activeCardLang === 'en' ? 'Confirmed Helper:' : activeCardLang === 'ta' ? 'உறுதிப்படுத்தப்பட்ட உதவியாளர்:' : 'තෝරාගත් සහායකයා:'}
                </span>
                <span className="font-black text-white">{confirmedHelperName}</span>
                {confirmedHelperPhone && (
                  <span className="font-mono text-emerald-200">({confirmedHelperPhone})</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* PROMINENT ADMIN MODERATION / FLAGGED BANNER */}
        {post.adminFlagged && (
          <div className="p-3.5 bg-gradient-to-r from-rose-900 via-red-900 to-rose-950 text-white rounded-2xl shadow-lg border-2 border-rose-400/70 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-300 animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm font-black tracking-tight text-white">
                  {activeCardLang === 'en' ? '⚠️ Admin Notice: Issue Reported' : activeCardLang === 'ta' ? '⚠️ நிர்வாகி அறிவிப்பு: சிக்கல் தெரிவிக்கப்பட்டுள்ளது' : '⚠️ පරිපාලක දැනුම්දීම: දැන්වීමේ ගැටලුවක් සටහන් කර ඇත'}
                </span>
              </div>
              <span className="text-[10px] bg-rose-500/40 text-rose-100 font-mono font-extrabold px-2 py-0.5 rounded-full border border-rose-400/40">
                {post.isHiddenByAdmin 
                  ? (activeCardLang === 'en' ? 'HIDDEN FROM USERS' : activeCardLang === 'ta' ? 'மறைக்கப்பட்டுள்ளது' : 'සඟවා ඇත (HIDDEN)')
                  : (activeCardLang === 'en' ? 'FLAGGED' : activeCardLang === 'ta' ? 'கொடியிடப்பட்டது' : 'FLAGGED')}
              </span>
            </div>

            <div className="bg-black/30 p-2.5 rounded-xl border border-white/10 text-xs space-y-1">
              <span className="text-rose-200 font-extrabold block">
                {activeCardLang === 'en' ? 'Admin Reason:' : activeCardLang === 'ta' ? 'காரணம்:' : 'පරිපාලක හේතුව:'}
              </span>
              <p className="text-rose-50 font-medium">
                {post.adminFlagReason || (activeCardLang === 'en' ? 'Requires review and correction.' : 'නීති රීති අනුව සංශෝධනය කර නැවත දන්වන්න.')}
              </p>
            </div>

            {post.posterCorrectionNote && (
              <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-400/40 text-xs space-y-1">
                <span className="text-emerald-300 font-extrabold block flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  {activeCardLang === 'en' ? 'Poster Response / Update:' : activeCardLang === 'ta' ? 'பயனர் பதில்:' : 'දැන්වීම්කරුගේ පිළිතුර / සංශෝධනය:'}
                </span>
                <p className="text-emerald-100 font-semibold">
                  {post.posterCorrectionNote}
                </p>
              </div>
            )}

            {/* Poster Quick Action to respond / edit */}
            {(ownerCheck || isOwner) && onPosterRespondIssue && (
              <button
                type="button"
                onClick={() => onPosterRespondIssue(post)}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 shrink-0 text-slate-950" />
                <span>
                  {activeCardLang === 'en' ? 'Reply to Admin & Fix Post' : activeCardLang === 'ta' ? 'நிர்வாகிக்கு பதிலளித்து திருத்தவும்' : 'පරිපාලකට පිළිතුරු යවන්න / දැන්වීම සංශෝධනය කරන්න'}
                </span>
              </button>
            )}

            {/* Admin Quick Action to moderate again or restore */}
            {isAdmin && onAdminModerate && (
              <button
                type="button"
                onClick={() => onAdminModerate(post)}
                className="w-full py-1.5 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {activeCardLang === 'en' ? 'Manage Moderation / Unhide' : activeCardLang === 'ta' ? 'கட்டுப்பாட்டை நிர்வகிக்கவும்' : 'පරිපාලක පාලනය / නැවත පෙන්වන්න (Unhide)'}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Facebook-style Feed Header: Author, Avatar, Verification, Elapsed Time & Actions */}
        {(() => {
          const TagIconComp = getTagIconComponent(post.tagName, post.tagCategory, post.category);
          const displayAuthorName = maskName(translateName(effectivePost.userName || post.userName || 'පරිශීලකයා', activeCardLang), isDemo, activeCardLang);
          const userInitial = displayAuthorName ? displayAuthorName.trim().charAt(0).toUpperCase() : '👤';

          return (
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#132a1d]">
              {/* Left: Avatar + Author Info + Meta */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Facebook-style Round Avatar */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-700 text-white font-black text-base sm:text-lg flex items-center justify-center shadow-sm ring-2 ring-emerald-500/30">
                    {post.userPhotoUrl ? (
                      <img 
                        src={post.userPhotoUrl} 
                        alt={displayAuthorName} 
                        className="w-full h-full rounded-full object-cover" 
                      />
                    ) : (
                      <span>{userInitial}</span>
                    )}
                  </div>
                  {/* Verified Online Active Indicator */}
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#07130c] rounded-full shadow-2xs" />
                </div>

                {/* Name, Verification Shield & Metadata */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight truncate">
                      {displayAuthorName}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-md border border-emerald-300 dark:border-emerald-700 shrink-0">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{cardLabels.accountHolder}</span>
                    </span>
                    {ownerCheck && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-black px-1.5 py-0.2 rounded-md border border-amber-300 dark:border-amber-700 shrink-0">
                        {activeCardLang === 'en' ? 'My Ad' : activeCardLang === 'ta' ? 'எனது விளம்பரம்' : 'මගේ දැන්වීම'}
                      </span>
                    )}
                    {isConfirmed && (
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black px-1.5 py-0.2 rounded-md border border-emerald-300 dark:border-emerald-700 shrink-0 flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>{cardLabels.confirmed}</span>
                      </span>
                    )}
                  </div>

                  {/* Subline: Elapsed time · Location · Motorcycle Distance */}
                  <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap font-medium">
                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold">
                      <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{elapsedTimeLabel}</span>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                      <span className="truncate max-w-[120px] sm:max-w-[180px]">
                        {getVillageOrTownDisplay(effectivePost.locationName || '') || 'ශ්‍රී ලංකාව'}
                      </span>
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <div className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-emerald-300 bg-emerald-50 dark:bg-[#0d281a] px-2 py-0.2 rounded-md border border-emerald-200 dark:border-emerald-800/80">
                      <span className="text-xs">🏍️</span>
                      <span>{motorcycleRoute.formattedRoadDistance}</span>
                      <span className="text-slate-400">~</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{motorcycleRoute.formattedTime.replace(/^~/, '').trim()}</span>
                      {isConfirmed || ownerCheck ? (
                        <a
                          href={motorcycleRoute.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Google Maps Route"
                          className="ml-0.5 text-rose-500 hover:text-rose-600 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      ) : (
                        <Lock className="w-2.5 h-2.5 text-amber-500 inline ml-0.5" title="ලිපිනය ආරක්ෂිතයි" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Help ID, Category Tag, Bookmark, Share */}
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                <span className="font-mono text-xs sm:text-sm font-black tracking-wide text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700/60">
                  {displayPostCode}
                </span>

                {post.tagName && (
                  <span 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/60 font-extrabold text-xs shadow-2xs"
                    title={post.tagName}
                  >
                    {TagIconComp && <TagIconComp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    <span className="hidden sm:inline">{translateText(post.tagName, activeCardLang)}</span>
                  </span>
                )}

                {/* Bookmark / Save Post */}
                {onToggleSave && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave(post);
                    }}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center border ${
                      isSaved
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 text-slate-600 dark:text-slate-300 hover:text-amber-600 border-slate-200 dark:border-slate-700'
                    }`}
                    title={isSaved ? 'සුරැකි ලැයිස්තුවෙන් ඉවත් කරන්න' : 'පසුව බැලීමට සුරකින්න'}
                  >
                    {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-white fill-white" /> : <Bookmark className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                )}

                {/* Share Button with Copied Toast */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleSharePost}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
                    title="දැන්වීම බෙදාගන්න (Share / Copy link)"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  {showCopiedToast && (
                    <div className="absolute right-0 top-full mt-1 z-30 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg whitespace-nowrap shadow-md animate-fade-in">
                      Link Copied! ✓
                    </div>
                  )}
                </div>

                {/* Admin Report / Moderation Button */}
                {isAdmin && onAdminModerate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInterceptAction(() => onAdminModerate(post));
                    }}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer active:scale-95 border ${
                      post.adminFlagged
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs animate-pulse'
                        : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    }`}
                    title="පරිපාලක පාලනය (Admin Moderate)"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Dedicated Find For Me Card Rendering (User's Exact Specification) */}
        {post.category === 'find_for_me' ? (() => {
          const effectiveType: 'lost' | 'stolen' | 'find' | 'found' = (
            post.findForMeType || (
              post.whatHappened?.includes('හමුවී ඇත') || post.whatIsNeeded?.includes('හමුවූ') || post.tagName?.toLowerCase().includes('found')
                ? 'found'
                : post.whatHappened?.includes('නැතිවී') || post.whatIsNeeded?.includes('නැතිවූ') || post.tagName?.toLowerCase().includes('lost')
                ? 'lost'
                : post.whatHappened?.includes('සොරාගත්') || post.whatIsNeeded?.includes('සොරාගත්') || post.tagName?.toLowerCase().includes('stolen')
                ? 'stolen'
                : 'find'
            )
          );

          const effectiveItemName = translateText(
            effectivePost.itemLostStolenOrSearched ||
            effectivePost.whatHappened?.replace(/^(නැතිවූ|සොරාගත්|සොයන|අවශ්‍ය|හමුවූ)\s*(දෙයක්|භාණ්ඩයක්)?:\s*/i, '')?.split('.')[0] ||
            effectivePost.whatIsNeeded?.replace(/^නැතිවූ\s*|^සොරාගත්\s*|^සොයන\s*|^හමුවූ\s*|සොයාදෙන්න\.?|අයිතිකරුට භාරදීම\.?$/g, '')?.trim() ||
            effectivePost.tagName ||
            (activeCardLang === 'en' ? 'Item / Service' : activeCardLang === 'ta' ? 'பொருள் / சேவை' : 'අදාළ භාණ්ඩය / සේවාව'),
            activeCardLang
          );

          const effectiveContactPhone = post.contactPhone || post.userPhone || '0771234567';
          const effectiveContactWhatsapp = post.contactWhatsapp || post.userPhone || '0771234567';
          const effectiveContactAddress = effectivePost.contactAddress || effectivePost.locationName || (activeCardLang === 'en' ? 'Home Address' : activeCardLang === 'ta' ? 'வீட்டு முகவரி' : 'ගෙදර ලිපිනය');
          const effectiveLocationName = effectivePost.locationName || (activeCardLang === 'en' ? 'Location Confirmed' : activeCardLang === 'ta' ? 'இடம் உறுதிப்படுத்தப்பட்டது' : 'ස්ථානය තහවුරු කර ඇත');
          const effectiveIncidentLocation = effectivePost.incidentLocation || effectivePost.locationName || '';
          const effectiveIncidentDate = effectivePost.incidentDate || (post.createdAt?.includes('මීට') ? (activeCardLang === 'en' ? 'Today' : activeCardLang === 'ta' ? 'இன்று' : 'අද') : post.createdAt) || '';
          const effectiveIncidentTime = effectivePost.incidentTime || '';
          const effectiveDelivery = translateText(
            effectivePost.deliveryOption || effectivePost.transport || (activeCardLang === 'en' ? 'Deliver to my location, will pay delivery fee separately' : activeCardLang === 'ta' ? 'முகவரிக்கு டெலிவரி செய்யவும், கட்டணம் வழங்கப்படும்' : 'ගෙනවිත් දෙන්න ඒ සදහා මම ඔබට වෙනම ගෙවන්නම්'),
            activeCardLang
          );
          const effectiveOtherDetails = translateText(
            effectivePost.otherDetails || (effectivePost.conditions && !effectivePost.conditions.startsWith('ගණුදෙනුව') && !effectivePost.conditions.startsWith('සම්බන්ධ') && !effectivePost.conditions.startsWith('අයිතිකරු') ? effectivePost.conditions : ''),
            activeCardLang
          );
          const showReward = (post.hasReward || Boolean(post.rewardDetails)) && Boolean(post.rewardDetails && post.rewardDetails.trim() !== '');

          return (
            <div className="p-4 bg-gradient-to-br from-white via-emerald-50/50 to-teal-50/30 dark:from-[#06180f] dark:via-[#081e13] dark:to-[#06180f] border-2 border-emerald-400/80 dark:border-emerald-600/80 rounded-2xl shadow-sm space-y-3.5 text-slate-900 dark:text-slate-100">
              
              {/* SubType Header Pill */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-emerald-200/80 dark:border-emerald-900/60">
                <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-xl shadow-xs border ${
                  effectiveType === 'lost'
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                    : effectiveType === 'stolen'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                    : effectiveType === 'found'
                    ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-800'
                    : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                }`}>
                  <Search className="w-3.5 h-3.5" />
                  <span>
                    {effectiveType === 'lost'
                      ? (activeCardLang === 'en' ? '🔴 Lost Item' : activeCardLang === 'ta' ? '🔴 தொலைந்துபோன பொருள்' : '🔴 නැතිවූ දෙයක් (Lost Item)')
                      : effectiveType === 'stolen'
                      ? (activeCardLang === 'en' ? '⚠️ Stolen Item' : activeCardLang === 'ta' ? '⚠️ திருடப்பட்ட பொருள்' : '⚠️ සොරාගත් දෙයක් (Stolen Item)')
                      : effectiveType === 'found'
                      ? (activeCardLang === 'en' ? '🎁 Found Item' : activeCardLang === 'ta' ? '🎁 கண்டெடுக்கப்பட்ட பொருள்' : '🎁 හමුවනලද (Found Item)')
                      : (activeCardLang === 'en' ? '🔍 Search / Procurement' : activeCardLang === 'ta' ? '🔍 தேடப்படும் பொருள்' : '🔍 සොයාදෙන්න (Search / Procurement)')}
                  </span>
                </span>

                {showReward && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/90 px-2.5 py-1 rounded-xl border border-amber-300 dark:border-amber-600">
                    <Gift className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{activeCardLang === 'en' ? 'Reward Included' : activeCardLang === 'ta' ? 'பரிசு உண்டு' : 'තෑග්ගක් සහිතයි'}</span>
                  </span>
                )}
              </div>

              {/* 1. LOST OR STOLEN ITEM SPECIFIC PRESENTATION */}
              {(effectiveType === 'lost' || effectiveType === 'stolen') && (
                <div className="space-y-3">
                  {/* Main Advertisement Narrative Text */}
                  <div className="p-3 bg-white/90 dark:bg-[#082014] rounded-xl border border-emerald-300/70 dark:border-emerald-800/70 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed space-y-2 shadow-xs">
                    {activeCardLang === 'en' ? (
                      <p>
                        {effectiveIncidentDate ? `On ${effectiveIncidentDate}, ` : ''}
                        {effectiveIncidentTime ? `around ${effectiveIncidentTime}, ` : ''}
                        {effectiveIncidentLocation ? `at ${getVillageOrTownDisplay(effectiveIncidentLocation)}, ` : ''}
                        <strong className="text-emerald-700 dark:text-emerald-300 font-black">
                          {effectiveItemName}
                        </strong>{' '}
                        was {effectiveType === 'lost' ? 'lost' : 'stolen'}, if found please contact me via{' '}
                        <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">
                          {hasContactPermission ? effectiveContactPhone : '07* *** **** (🔒 Protected)'}
                          {hasContactPermission && effectiveContactWhatsapp && effectiveContactWhatsapp !== effectiveContactPhone ? ` or ${effectiveContactWhatsapp}` : ''}
                        </span>.
                      </p>
                    ) : activeCardLang === 'ta' ? (
                      <p>
                        {effectiveIncidentDate ? `${effectiveIncidentDate} அன்று, ` : ''}
                        {effectiveIncidentTime ? `${effectiveIncidentTime} அளவில், ` : ''}
                        {effectiveIncidentLocation ? `${getVillageOrTownDisplay(effectiveIncidentLocation)} இல், ` : ''}
                        <strong className="text-emerald-700 dark:text-emerald-300 font-black">
                          {effectiveItemName}
                        </strong>{' '}
                        {effectiveType === 'lost' ? 'தொலைந்துவிட்டது' : 'திருடப்பட்டது'}, கண்டுபிடித்தவர்கள் தயவுசெய்து{' '}
                        <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">
                          {hasContactPermission ? effectiveContactPhone : '07* *** **** (🔒 பாதுகாக்கப்பட்டது)'}
                          {hasContactPermission && effectiveContactWhatsapp && effectiveContactWhatsapp !== effectiveContactPhone ? ` அல்லது ${effectiveContactWhatsapp}` : ''}
                        </span>{' '}
                        மூலம் என்னை தொடர்பு கொள்ளவும்.
                      </p>
                    ) : (
                      <p>
                        {effectiveIncidentDate ? `${effectiveIncidentDate} දින, ` : ''}
                        {effectiveIncidentTime ? `${effectiveIncidentTime} පමණ, ` : ''}
                        {effectiveIncidentLocation ? `${getVillageOrTownDisplay(effectiveIncidentLocation)} දී, ` : ''}
                        <strong className="text-emerald-700 dark:text-emerald-300 font-black">
                          {effectiveItemName}
                        </strong>{' '}
                        {effectiveType === 'lost' ? 'නැතිවී ඇත,' : 'සොරාගෙන ඇත,'} සොයාගත් කෙනෙක් වේනම්{' '}
                        <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">
                          {hasContactPermission ? effectiveContactPhone : '07* *** **** (🔒 ආරක්ෂිතයි)'}
                          {hasContactPermission && effectiveContactWhatsapp && effectiveContactWhatsapp !== effectiveContactPhone ? ` හෝ ${effectiveContactWhatsapp}` : ''}
                        </span>{' '}
                        හරහා මා සම්බන්ධකරගන්න.
                      </p>
                    )}
                    <p className="text-slate-800 dark:text-slate-200">
                      {activeCardLang === 'en' ? 'Alternatively, deliver to: ' : activeCardLang === 'ta' ? 'அல்லது இங்கே அனுப்பவும்: ' : 'නැතිනම් '}
                      <span className="font-extrabold text-emerald-800 dark:text-emerald-300">
                        {hasContactPermission ? getVillageOrTownDisplay(effectiveContactAddress) : (activeCardLang === 'en' ? '🔒 Address Protected (Poster authorization needed)' : activeCardLang === 'ta' ? '🔒 முகவரி பாதுகாக்கப்பட்டது' : '🔒 නිශ්චිත ලිපිනය ආරක්ෂිතයි (දැන්වීම්කරුගේ අවසරය අවශ්‍යයි)')}
                      </span>
                      {activeCardLang === 'en' ? '. Location: ' : activeCardLang === 'ta' ? '. இடம்: ' : '. නිවැරදි ස්ථානය: '}
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {hasContactPermission ? getVillageOrTownDisplay(effectiveLocationName) : `${getVillageOrTownDisplay(effectiveLocationName).split(',')[0]} (${activeCardLang === 'en' ? '🔒 Visible after confirmation' : activeCardLang === 'ta' ? '🔒 உறுதிப்படுத்திய பின் தெரியும்' : '🔒 තහවුරු වූ පසු දිස්වේ'})`}
                      </span>
                    </p>
                  </div>

                  {/* Other details (if provided) */}
                  {effectiveOtherDetails && effectiveOtherDetails.trim() !== '' && (
                    <div className="p-2.5 bg-emerald-50/70 dark:bg-[#071d12] rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-xs text-slate-800 dark:text-slate-200">
                      <strong className="text-emerald-900 dark:text-emerald-300 font-black block mb-0.5">
                        {cardLabels.details}
                      </strong>
                      <p className="font-semibold">{effectiveOtherDetails}</p>
                    </div>
                  )}

                  {/* Identifying info on item (Phone, NIC, Reg/Serial No, or Name) */}
                  {post.identifyingInfo && post.identifyingInfo.trim() !== '' && (
                    <div className="p-3 bg-amber-500/10 dark:bg-amber-950/40 rounded-xl border-2 border-amber-400/70 dark:border-amber-700/70 text-xs text-amber-950 dark:text-amber-100 shadow-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-black text-amber-900 dark:text-amber-300">
                        <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>
                          {activeCardLang === 'en'
                            ? 'Phone No / NIC / Serial / Marks on Item:'
                            : activeCardLang === 'ta'
                            ? 'தொலைபேசி எண் / அடையாள அட்டை / அடையாள குறிகள் / பெயர்:'
                            : 'නැති වූ දේ ඇති දුරකථන අංකය / හැඳුනුම්පත් අංකය / සලකුණු / නම:'}
                        </span>
                      </div>
                      <p className="font-extrabold text-sm pl-5 text-slate-900 dark:text-white bg-white/70 dark:bg-black/30 py-1.5 px-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
                        {shouldMask ? inspectAndSanitizeMessage(displayPost.identifyingInfo || post.identifyingInfo, false).sanitizedText : (displayPost.identifyingInfo || post.identifyingInfo)}
                      </p>
                    </div>
                  )}

                  {/* Reward (Only shown if hasReward is ticked) */}
                  {showReward && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/80 rounded-xl text-amber-900 dark:text-amber-200 font-extrabold text-xs flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>
                        <strong>{activeCardLang === 'en' ? 'Reward from Poster:' : activeCardLang === 'ta' ? 'வழங்கும் பரிசு:' : 'සොයාදෙන්නාහට මගෙන්:'}</strong> {translateText(displayPost.rewardDetails || post.rewardDetails, activeCardLang)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 2. FIND / PROCUREMENT ITEM SPECIFIC PRESENTATION */}
              {effectiveType === 'find' && (
                <div className="space-y-3">
                  {/* Main Advertisement Narrative Text */}
                  <div className="p-3 bg-white/90 dark:bg-[#082014] rounded-xl border border-emerald-300/70 dark:border-emerald-800/70 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed shadow-xs space-y-1.5">
                    <p>
                      {post.targetPrice ? `${translateText(post.targetPrice, activeCardLang)} ${activeCardLang === 'en' ? 'approx' : activeCardLang === 'ta' ? 'அளவில்' : 'පමණ'}, ` : ''}
                      <strong className="text-emerald-700 dark:text-emerald-300 font-black">
                        {effectiveItemName}
                      </strong>{' '}
                      {post.quantityNeeded ? `${translateText(post.quantityNeeded, activeCardLang)} ` : ''}{activeCardLang === 'en' ? 'required,' : activeCardLang === 'ta' ? 'தேவைப்படுகிறது,' : 'අවශ්‍යයි,'}
                    </p>
                    {post.hasDeadline && post.deadlineDate && (
                      <p className="text-rose-600 dark:text-rose-400 font-extrabold">
                        {activeCardLang === 'en'
                          ? `Please find before ${post.deadlineDate} ${post.deadlineTime ? `(${post.deadlineTime})` : ''}`
                          : activeCardLang === 'ta'
                          ? `${post.deadlineDate} ${post.deadlineTime ? `(${post.deadlineTime})` : ''} முன் கண்டுபிடிக்கவும்`
                          : `${post.deadlineDate} ${post.deadlineTime ? `(${post.deadlineTime}) ` : ''}පෙර සොයාදෙන්න.`}
                      </p>
                    )}
                  </div>

                  {/* Contact & Location Info Section */}
                  <div className="p-3 bg-emerald-50/70 dark:bg-[#071d12] rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-1.5 text-slate-800 dark:text-slate-200">
                    <strong className="text-emerald-900 dark:text-emerald-300 font-black block pb-1 border-b border-emerald-200/80 dark:border-emerald-900/40">
                      {activeCardLang === 'en' ? 'Location and Contact Information:' : activeCardLang === 'ta' ? 'இடம் மற்றும் தொடர்பு விவரங்கள்:' : 'ස්ථානය හා සම්බන්ධකරගතහැකි තොරතුරු:'}
                    </strong>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 font-semibold">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">{activeCardLang === 'en' ? 'Phone No: ' : activeCardLang === 'ta' ? 'தொலைபேசி: ' : 'දුරකථන අංකය: '}</span>
                        <strong className="text-slate-900 dark:text-white">
                          {hasContactPermission ? effectiveContactPhone : '07* *** **** (🔒 Protected)'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">WhatsApp: </span>
                        <strong className="text-slate-900 dark:text-white">
                          {hasContactPermission ? effectiveContactWhatsapp : '07* *** **** (🔒 Protected)'}
                        </strong>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 dark:text-slate-400">{activeCardLang === 'en' ? 'Address: ' : activeCardLang === 'ta' ? 'முகவரி: ' : 'ගෙදර ලිපිනය: '}</span>
                        <strong className="text-slate-900 dark:text-white">
                          {hasContactPermission ? getVillageOrTownDisplay(effectiveContactAddress) : (activeCardLang === 'en' ? '🔒 Address Protected (Poster authorization needed)' : activeCardLang === 'ta' ? '🔒 முகவரி பாதுகாக்கப்பட்டது' : '🔒 නිශ්චිත ලිපිනය ආරක්ෂිතයි (දැන්වීම්කරුගේ අවසරය අවශ්‍යයි)')}
                        </strong>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 dark:text-slate-400">{activeCardLang === 'en' ? 'Location: ' : activeCardLang === 'ta' ? 'இடம்: ' : 'නිවැරදි ස්ථානය: '}</span>
                        <strong className="text-slate-900 dark:text-white">
                          {hasContactPermission ? getVillageOrTownDisplay(effectiveLocationName) : `${getVillageOrTownDisplay(effectiveLocationName).split(',')[0]} (${activeCardLang === 'en' ? '🔒 Visible after confirmation' : activeCardLang === 'ta' ? '🔒 உறுதிப்படுத்திய பின் தெரியும்' : '🔒 තහවුරු වූ පසු දිස්වේ'})`}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Other details (if provided) */}
                  {effectiveOtherDetails && effectiveOtherDetails.trim() !== '' && (
                    <div className="p-2.5 bg-emerald-50/70 dark:bg-[#071d12] rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-xs text-slate-800 dark:text-slate-200">
                      <strong className="text-emerald-900 dark:text-emerald-300 font-black block mb-0.5">
                        {cardLabels.details}
                      </strong>
                      <p className="font-semibold">{effectiveOtherDetails}</p>
                    </div>
                  )}

                  {/* Delivery / Transaction Method */}
                  <div className="p-2.5 bg-white dark:bg-[#082014] rounded-xl border border-emerald-300/80 dark:border-emerald-800 text-xs space-y-1">
                    <strong className="text-emerald-900 dark:text-emerald-300 font-black flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{activeCardLang === 'en' ? 'Delivery / Transaction Method:' : activeCardLang === 'ta' ? 'பரிவர்த்தனை முறை:' : 'ගණුදෙනුව සිදුවියයුතු ආකාරය:'}</span>
                    </strong>
                    <p className="font-bold text-slate-900 dark:text-white pl-5">
                      {effectiveDelivery}
                    </p>
                  </div>
                </div>
              )}

              {/* 3. FOUND ITEM SPECIFIC PRESENTATION */}
              {effectiveType === 'found' && (
                <div className="space-y-3">
                  {/* Main Advertisement Narrative Text */}
                  <div className="p-3 bg-white/90 dark:bg-[#082014] rounded-xl border border-teal-300/80 dark:border-teal-800/80 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed shadow-xs space-y-2">
                    <p>
                      {effectiveIncidentDate ? `${effectiveIncidentDate} ${activeCardLang === 'en' ? 'on' : activeCardLang === 'ta' ? 'அன்று' : 'දින'}, ` : ''}
                      {effectiveIncidentTime ? `${effectiveIncidentTime} ${activeCardLang === 'en' ? 'approx, ' : activeCardLang === 'ta' ? 'அளவில், ' : 'පමණ, '}` : ''}
                      {effectiveIncidentLocation ? `${getVillageOrTownDisplay(effectiveIncidentLocation)} ${activeCardLang === 'en' ? 'near, ' : activeCardLang === 'ta' ? 'அருகில், ' : 'ආසන්නයේ දී, '}` : ''}
                      <strong className="text-teal-700 dark:text-teal-300 font-black">
                        {effectiveItemName}
                      </strong>{' '}
                      {activeCardLang === 'en'
                        ? 'was found. If this belongs to you, please click the Chat button below to verify proof of ownership and claim it.'
                        : activeCardLang === 'ta'
                        ? 'கண்டெடுக்கப்பட்டுள்ளது. இது உங்களுடையதாக இருந்தால், உரிமையை உறுதிப்படுத்த கீழேயுள்ள Chat பொத்தானை அழுத்தவும்.'
                        : 'හමුවී ඇත. මෙහි නිවැරදි අයිතිකරු ඔබ නම්, පහත ඇති Chat බොත්තම ඔස්සේ සම්බන්ධ වී විස්තර තහවුරු කර භාරගන්න.'}
                    </p>
                  </div>

                  {/* Safety & Owner Verification Notice */}
                  <div className="p-3 bg-amber-500/10 dark:bg-amber-950/40 rounded-xl border-2 border-amber-400/80 dark:border-amber-700/80 text-xs text-amber-950 dark:text-amber-100 shadow-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-black text-amber-900 dark:text-amber-300">
                      <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>
                        {activeCardLang === 'en'
                          ? 'Owner Verification & Privacy Protection:'
                          : activeCardLang === 'ta'
                          ? 'உரிமையாளர் சரிபார்ப்பு & பாதுகாப்பு:'
                          : 'අයිතිකරු තහවුරු කිරීම සහ ආරක්ෂාව:'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed font-semibold text-slate-800 dark:text-slate-200">
                      {activeCardLang === 'en'
                        ? 'To prevent false claims, complete item details are withheld. The true owner must provide identifying details (serial, markings, contents) in Chat to verify.'
                        : activeCardLang === 'ta'
                        ? 'தவறான கோரிக்கைகளைத் தவிர்க்க முழு விவரங்களும் மறைக்கப்பட்டுள்ளன. உரிமையாளர் Chat மூலம் விவரங்களை வழங்கி உறுதிப்படுத்த வேண்டும்.'
                        : 'අනවශ්‍ය හිමිකම් කීම් වැළැක්වීම සඳහා හමුවූ දේ පිළිබඳ සම්පූර්ණ තොරතුරු ප්‍රසිද්ධ කර නැත. අයිතිකරු Chat හරහා විස්තර සනාථ කර භාරගත යුතුය.'}
                    </p>
                  </div>

                  {/* Other details (if provided) */}
                  {effectiveOtherDetails && effectiveOtherDetails.trim() !== '' && (
                    <div className="p-2.5 bg-teal-50/70 dark:bg-[#071d12] rounded-xl border border-teal-200 dark:border-teal-900/60 text-xs text-slate-800 dark:text-slate-200">
                      <strong className="text-teal-900 dark:text-teal-300 font-black block mb-0.5">
                        {cardLabels.details}
                      </strong>
                      <p className="font-semibold">{effectiveOtherDetails}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Direct Instant Contact Actions for Viewers */}
              <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {hasContactPermission && effectiveContactPhone ? (
                  <a
                    href={`tel:${effectiveContactPhone.replace(/\D/g, '')}`}
                    onClick={(e) => e.stopPropagation()}
                    className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{cardLabels.call}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenChat) onOpenChat(post);
                      else onOfferSupport(post);
                    }}
                    className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 shadow-xs transition-transform active:scale-95 cursor-pointer border border-slate-300 dark:border-slate-700"
                    title={cardLabels.askPhoneChat}
                  >
                    <Lock className="w-3 h-3 text-amber-500" />
                    <span>{cardLabels.askPhoneChat}</span>
                  </button>
                )}

                {hasContactPermission && effectiveContactWhatsapp ? (
                  <div className="flex flex-col gap-1">
                    <a
                      href={`https://wa.me/${effectiveContactWhatsapp.replace(/^0/, '94').replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="py-2 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRequestSmsModal(true);
                      }}
                      className="text-[10px] text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 font-bold flex items-center justify-center gap-1 cursor-pointer bg-amber-50 dark:bg-amber-950/60 p-1 rounded-lg border border-amber-300 dark:border-amber-800/60 transition-all active:scale-95"
                      title="WhatsApp ගිණුම හමුනොවූයේ නම් SMS මඟින් නව අංකයක් ඉල්ලන්න"
                    >
                      <Phone className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                      <span>WhatsApp හමුනොවීද? SMS යවන්න</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenChat) onOpenChat(post);
                      else onOfferSupport(post);
                    }}
                    className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1 shadow-xs transition-transform active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{cardLabels.ourChat}</span>
                  </button>
                )}

                {hasContactPermission ? (
                  <a
                    href={motorcycleRoute.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="py-2 px-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer col-span-2 sm:col-span-1"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-300" />
                    <span>{cardLabels.mapRoute}</span>
                  </a>
                ) : (
                  <div
                    className="py-2 px-2.5 bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1 text-center"
                  >
                    <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{cardLabels.addressProtected}</span>
                  </div>
                )}
              </div>

            </div>
          );
        })() : post.category === 'from_me_to_you' ? (() => {
          const effectivePurpose = post.fromMeToYouType || (
            post.whatHappened?.includes('පරිත්‍යාග') || post.specialNotice?.includes('පරිත්‍යාග')
              ? 'donation'
              : post.whatHappened?.includes('ඉවත්') || post.specialNotice?.includes('ඉවත්')
              ? 'giveaway'
              : 'exchange'
          );

          const itemTitle = translateText(
            effectivePost.donationItem ||
            effectivePost.whatHappened?.replace(/^පරිත්‍යාගයකි:\s*|^ඉවත් කිරීමට නියමිතයි:\s*/i, '')?.split('(')[0]?.trim() ||
            effectivePost.tagName ||
            (activeCardLang === 'en' ? 'Item' : activeCardLang === 'ta' ? 'பொருள்' : 'භාණ්ඩය'),
            activeCardLang
          );
          const qty = translateText(effectivePost.donationQuantity || '1', activeCardLang);
          const rec = translateText(
            effectivePost.donationRecipient || (activeCardLang === 'en' ? 'Anyone in need' : activeCardLang === 'ta' ? 'தேவையுள்ள எவரும்' : 'අවශ්‍ය ඕනෑම අයෙක්'),
            activeCardLang
          );
          const dateVal = effectivePost.donationDate || (effectivePurpose === 'giveaway' ? (activeCardLang === 'en' ? 'Today' : activeCardLang === 'ta' ? 'இன்று' : 'අද') : (activeCardLang === 'en' ? 'Today itself' : activeCardLang === 'ta' ? 'இன்றே' : 'අදම'));
          const delivery = translateText(
            effectivePost.donationDeliveryMethod || effectivePost.transport || (activeCardLang === 'en' ? 'Self pickup at location' : activeCardLang === 'ta' ? 'நேரில் வந்து பெற்றுக்கொள்ளவும்' : 'ඇවිත් රැගෙන යන්න'),
            activeCardLang
          );
          const locName = effectivePost.locationName || (activeCardLang === 'en' ? 'Location Confirmed' : activeCardLang === 'ta' ? 'இடம் உறுதிப்படுத்தப்பட்டது' : 'ස්ථානය තහවුරු කර ඇත');
          const whatsapp = post.contactWhatsapp || post.userPhone || '';
          const details = translateText(
            effectivePost.otherDetails || (effectivePost.conditions && !effectivePost.conditions.startsWith('ස්ථානය') ? effectivePost.conditions : ''),
            activeCardLang
          );

          const haveItem = translateText(
            effectivePost.exchangeHaveItem || effectivePost.whatHappened?.split('⇄')[0]?.replace(/^හුවමාරුවට:\s*/i, '')?.trim() || (activeCardLang === 'en' ? 'Item' : activeCardLang === 'ta' ? 'பொருள்' : 'භාණ්ඩය'),
            activeCardLang
          );
          const haveQty = translateText(effectivePost.exchangeHaveQuantity || '1', activeCardLang);
          const wantItem = translateText(
            effectivePost.exchangeWantItem || effectivePost.whatHappened?.split('⇄')[1]?.trim() || (activeCardLang === 'en' ? 'Desired Item' : activeCardLang === 'ta' ? 'தேவையான பொருள்' : 'අවශ්‍ය භාණ්ඩය'),
            activeCardLang
          );
          const wantQty = translateText(effectivePost.exchangeWantQuantity || '1', activeCardLang);

          const whatsappFormatted = whatsapp ? whatsapp.replace(/^0/, '94').replace(/\D/g, '') : '';

          return (
            <div className="p-4 bg-gradient-to-br from-purple-50/70 via-white to-emerald-50/50 dark:from-[#130d22] dark:via-[#091a11] dark:to-[#07150e] border-2 border-purple-400/80 dark:border-purple-600/80 rounded-2xl shadow-sm space-y-3.5 text-slate-900 dark:text-slate-100">
              
              {/* Header Status Badge */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-purple-200/80 dark:border-purple-900/60">
                <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-xl shadow-xs border ${
                  effectivePurpose === 'donation'
                    ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800'
                    : effectivePurpose === 'giveaway'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                    : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                }`}>
                  {effectivePurpose === 'donation' ? (
                    <>
                      <Gift className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>{activeCardLang === 'en' ? 'Donation' : activeCardLang === 'ta' ? 'நன்கொடை' : 'පරිත්‍යාගයකි (Donation)'}</span>
                    </>
                  ) : effectivePurpose === 'giveaway' ? (
                    <>
                      <PackageOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>{activeCardLang === 'en' ? 'Giveaway' : activeCardLang === 'ta' ? 'இலவச வழங்கல்' : 'ඉවත් කිරීමට නියමිතයි (Giveaway)'}</span>
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{activeCardLang === 'en' ? 'Exchange / Swap' : activeCardLang === 'ta' ? 'பரிமாற்றம்' : 'හුවමාරු කිරීමට (Exchange)'}</span>
                    </>
                  )}
                </span>

                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-white/90 dark:bg-black/40 border border-purple-200 dark:border-purple-900 text-purple-800 dark:text-purple-300 font-mono">
                  🎁 {activeCardLang === 'en' ? 'From Me To You' : activeCardLang === 'ta' ? 'என்னிடமிருந்து உங்களுக்கு' : 'මගෙන් ඔබට'}
                </span>
              </div>

              {/* Exact Display Format for Donation, Giveaway, or Exchange */}
              <div className="p-3.5 bg-white/95 dark:bg-[#07180f] rounded-xl border border-purple-200 dark:border-purple-900/70 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed space-y-2.5 shadow-xs">
                {effectivePurpose === 'donation' ? (
                  activeCardLang === 'en' ? (
                    <p>
                      <strong className="text-purple-700 dark:text-purple-300 font-black">{itemTitle}</strong>{' '}
                      <span>({qty}) scheduled for donation. </span>
                      <span className="text-slate-800 dark:text-slate-200">For {rec} or any deserving person, </span>
                      <span className="font-extrabold text-purple-800 dark:text-purple-300">from {dateVal}, </span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{delivery}.</span>
                    </p>
                  ) : activeCardLang === 'ta' ? (
                    <p>
                      <strong className="text-purple-700 dark:text-purple-300 font-black">{itemTitle}</strong>{' '}
                      <span>({qty}) நன்கொடையாக வழங்கப்படவுள்ளது. </span>
                      <span className="text-slate-800 dark:text-slate-200">{rec} அல்லது தகுதியான நபருக்கு, </span>
                      <span className="font-extrabold text-purple-800 dark:text-purple-300">{dateVal} முதல், </span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{delivery}.</span>
                    </p>
                  ) : (
                    <p>
                      <strong className="text-purple-700 dark:text-purple-300 font-black">{itemTitle}</strong>{' '}
                      <span>{qty} ක් පරිත්‍යාග කිරීමට නියමිතයි. </span>
                      <span className="text-slate-800 dark:text-slate-200">{rec} හෝ වටිනා පුද්ගලයෙක් වේනම් </span>
                      <span className="font-extrabold text-purple-800 dark:text-purple-300">{dateVal} සිට </span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{delivery}.</span>
                    </p>
                  )
                ) : effectivePurpose === 'giveaway' ? (
                  activeCardLang === 'en' ? (
                    <p>
                      <strong className="text-amber-700 dark:text-amber-300 font-black">{itemTitle}</strong>{' '}
                      <span>({qty}) scheduled for giveaway. </span>
                      <span className="text-slate-800 dark:text-slate-200">For {rec} or any deserving person, </span>
                      <span className="font-extrabold text-amber-800 dark:text-amber-300">from {dateVal}, </span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{delivery}.</span>
                    </p>
                  ) : activeCardLang === 'ta' ? (
                    <p>
                      <strong className="text-amber-700 dark:text-amber-300 font-black">{itemTitle}</strong>{' '}
                      <span>({qty}) இலவசமாக வழங்கப்படவுள்ளது. </span>
                      <span className="text-slate-800 dark:text-slate-200">{rec} அல்லது தகுதியான நபருக்கு, </span>
                      <span className="font-extrabold text-amber-800 dark:text-amber-300">{dateVal} முதல், </span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{delivery}.</span>
                    </p>
                  ) : (
                    <p>
                      <strong className="text-amber-700 dark:text-amber-300 font-black">{itemTitle}</strong>{' '}
                      <span>{qty} ක් ඉවත් කිරීමට නියමිතයි. </span>
                      <span className="text-slate-800 dark:text-slate-200">{rec} හෝ වටිනා පුද්ගලයෙක් වේනම් </span>
                      <span className="font-extrabold text-amber-800 dark:text-amber-300">{dateVal} සිට </span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{delivery}.</span>
                    </p>
                  )
                ) : (
                  <p className="flex items-center gap-1.5 flex-wrap">
                    <ArrowLeftRight className="w-4 h-4 text-emerald-600 inline shrink-0" />
                    <span><strong className="text-emerald-700 dark:text-emerald-300 font-black">{haveItem}</strong> ({haveQty}) </span>
                    <span>{activeCardLang === 'en' ? 'wanted in exchange for' : activeCardLang === 'ta' ? 'பரிமாற்றமாக தேவை' : 'ක්'} <strong className="text-purple-700 dark:text-purple-300 font-black">{wantItem}</strong> ({wantQty}) {activeCardLang === 'en' ? '.' : activeCardLang === 'ta' ? '.' : 'කට හුවමාරු කිරීමට අවශ්‍යයි.'}</span>
                  </p>
                )}

                {/* Detailed metadata */}
                <div className="pt-2 border-t border-purple-100 dark:border-purple-950/80 space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                  <p className="flex items-start gap-1.5">
                    <span className="font-extrabold text-purple-900 dark:text-purple-300 shrink-0">{activeCardLang === 'en' ? 'Location :-' : activeCardLang === 'ta' ? 'இடம் :-' : 'ස්ථානය :-'}</span>
                    <span className="font-semibold">
                      {post.saveLocationConsent === false 
                        ? (activeCardLang === 'en' ? 'Will be notified privately' : activeCardLang === 'ta' ? 'தனிப்பட்ட முறையில் அறிவிக்கப்படும்' : 'පෞද්ගලිකව දැනුම්දෙනු ලැබේ') 
                        : hasContactPermission 
                        ? getVillageOrTownDisplay(locName) 
                        : `${getVillageOrTownDisplay(locName).split(',')[0]} (${activeCardLang === 'en' ? '🔒 Address Protected' : activeCardLang === 'ta' ? '🔒 முகவரி பாதுகாக்கப்பட்டது' : '🔒 නිශ්චිත ලිපිනය ආරක්ෂිතයි'})`}
                    </span>
                  </p>

                  {hasContactPermission && whatsapp ? (
                    <p className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-purple-900 dark:text-purple-300 shrink-0">{activeCardLang === 'en' ? 'Contact Me:' : activeCardLang === 'ta' ? 'தொடர்பு கொள்ள:' : 'මා සම්බන්ධ කරගැනීමට:'}</span>
                      <a
                        href={`https://wa.me/${whatsappFormatted}?text=${encodeURIComponent(
                          `Hello, regarding #${post.postCode} on Sahaya Sewa:`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-all cursor-pointer shadow-xs active:scale-95"
                        title="Open WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{whatsapp}</span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold ml-0.5 underline">
                          (Open WhatsApp ↗)
                        </span>
                      </a>
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <span className="font-extrabold text-purple-900 dark:text-purple-300 shrink-0">{activeCardLang === 'en' ? 'To Contact:' : activeCardLang === 'ta' ? 'தொடர்புக்கு:' : 'සම්බන්ධ වීමට:'}</span>
                      <span className="font-medium">{activeCardLang === 'en' ? '🔒 Phone numbers protected — send a message via "In-App Chat" below' : activeCardLang === 'ta' ? '🔒 தொலைபேசி பாதுகாக்கப்பட்டது — கீழே உள்ள Chat மூலம் தொடர்பு கொள்ளவும்' : '🔒 දුරකථන අංක ආරක්ෂිතයි — පහත "අපගේ Chat" බොත්තම මඟින් පණිවිඩයක් එවන්න'}</span>
                    </p>
                  )}

                  {details && details.trim() !== '' && (
                    <p className="flex items-start gap-1.5">
                      <span className="font-extrabold text-purple-900 dark:text-purple-300 shrink-0">{cardLabels.details}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{renderTextWithLinks(details)}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Direct Quick Action Buttons for Viewer */}
              <div className="pt-2 border-t border-purple-200 dark:border-purple-900/60 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 1. අපගේ Chat බොත්තම (In-App Chat) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenChat) onOpenChat(post);
                    else onOfferSupport(post);
                  }}
                  className="py-2.5 px-2 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer border border-teal-400/40"
                  title="In-App Chat"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-200 shrink-0" />
                  <span>{cardLabels.ourChat}</span>
                </button>

                {/* 2. WhatsApp බොත්තම */}
                {hasContactPermission && whatsapp ? (
                  <a
                    href={`https://wa.me/${whatsappFormatted}?text=${encodeURIComponent(
                      `Hello, regarding #${post.postCode} on Sahaya Sewa:`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer border border-emerald-400/40"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4 text-white shrink-0" />
                    <span>WhatsApp</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenChat) onOpenChat(post);
                      else onOfferSupport(post);
                    }}
                    className="py-2.5 px-2 bg-slate-100 dark:bg-[#0d2218] hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 border border-slate-300 dark:border-slate-700 cursor-pointer"
                    title={cardLabels.askPhoneChat}
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>WhatsApp (🔒)</span>
                  </button>
                )}

                {/* 3. ඇමතුමක් ලබාගැනීම */}
                {hasContactPermission && post.userPhone ? (
                  <a
                    href={`tel:${post.userPhone.replace(/\D/g, '')}`}
                    onClick={(e) => e.stopPropagation()}
                    className="py-2.5 px-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer border border-purple-400/40"
                  >
                    <Phone className="w-4 h-4 text-white shrink-0" />
                    <span>{cardLabels.call}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenChat) onOpenChat(post);
                      else onOfferSupport(post);
                    }}
                    className="py-2.5 px-2 bg-slate-100 dark:bg-[#0d2218] hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 border border-slate-300 dark:border-slate-700 cursor-pointer"
                    title={cardLabels.askPhoneChat}
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{cardLabels.call} (🔒)</span>
                  </button>
                )}

                {/* 4. Map මාර්ගය */}
                {hasContactPermission && post.saveLocationConsent !== false ? (
                  <a
                    href={motorcycleRoute.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="py-2.5 px-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer border border-slate-700"
                  >
                    <MapPin className="w-4 h-4 text-rose-300 shrink-0" />
                    <span>{cardLabels.mapRoute}</span>
                  </a>
                ) : (
                  <div
                    className="py-2.5 px-2 bg-slate-100 dark:bg-[#0d2218] text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-800 text-center"
                  >
                    <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{cardLabels.addressProtected}</span>
                  </div>
                )}
              </div>

            </div>
          );
        })() : (
          /* STANDARD QUICK SERVICES / GENERAL SERVICES VIEW */
          <div className="space-y-3">
            {/* Post Main Text Content (Facebook Style) */}
            <div className="space-y-2 text-slate-900 dark:text-slate-100">
              {/* Primary description: What happened & What is needed */}
              <div className="text-sm sm:text-[15px] font-medium leading-relaxed">
                <div className="font-extrabold text-xs text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-0.5">
                  {cardLabels.whatHappened}
                </div>
                <div className={!isTextExpanded && safeWhatHappened.length > 220 ? 'line-clamp-3' : ''}>
                  {renderTextWithLinks(safeWhatHappened)}
                </div>
              </div>

              {safeWhatIsNeeded && safeWhatIsNeeded !== safeWhatHappened && (
                <div className="text-sm sm:text-[15px] font-medium leading-relaxed pt-1">
                  <div className="font-extrabold text-xs text-teal-800 dark:text-teal-400 uppercase tracking-wider mb-0.5">
                    {cardLabels.whatIsNeeded}
                  </div>
                  <div className={!isTextExpanded && safeWhatIsNeeded.length > 220 ? 'line-clamp-3' : ''}>
                    {renderTextWithLinks(safeWhatIsNeeded)}
                  </div>
                </div>
              )}

              {/* See More / See Less Toggle Button for long posts */}
              {(safeWhatHappened.length > 220 || safeWhatIsNeeded.length > 220) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTextExpanded(!isTextExpanded);
                  }}
                  className="text-xs font-black text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer inline-block"
                >
                  {isTextExpanded ? '▲ අඩු කරන්න (Show Less)' : '▼ තව කියවන්න... (See More)'}
                </button>
              )}
            </div>

            {/* Quick Context Metadata Chips (Helpers, Transport, Payment, Notice) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-[#081810] border border-emerald-100 dark:border-emerald-900/50 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">👥 {cardLabels.helpersNeeded}:</span>
                <span className="font-black text-emerald-800 dark:text-emerald-300">{helpersCount}</span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">🛵 {cardLabels.transport}:</span>
                <span className="truncate font-bold text-slate-900 dark:text-white">
                  {translateText(displayPost.transport || (activeCardLang === 'en' ? 'Visit needed' : 'පැමිණිය යුතුයි'), activeCardLang)}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">💵 {cardLabels.payment}:</span>
                <span className="truncate font-bold text-slate-900 dark:text-white">
                  {translateText(displayPost.payment || (activeCardLang === 'en' ? 'Fee agreed' : 'ගාස්තුවට එකඟයි'), activeCardLang)}
                </span>
              </div>

              {safeConditions && (
                <div className="col-span-2 sm:col-span-3 text-[11px] text-slate-600 dark:text-slate-400 pt-0.5 border-t border-slate-200/60 dark:border-emerald-900/30">
                  <span className="font-extrabold text-amber-600 dark:text-amber-400">⚠️ {cardLabels.conditions}: </span>
                  <span>{renderTextWithLinks(safeConditions)}</span>
                </div>
              )}
            </div>

            {/* Media Attachments (Voice Note, Photo, Video) */}
            {(post.imageUrl || post.videoUrl || post.audioUrl || post.externalLink || post.isVoicePost) && (
              <div className="pt-1 space-y-2">
                {/* 🎙️ Voice Note Player & AI Stamped Metadata */}
                {(post.audioUrl || post.isVoicePost) && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-2 border-emerald-500/70 shadow-md space-y-2 text-white">
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                      <span className="font-black text-emerald-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
                        <span>🎙️ AI හඬ ඉල්ලීම (Voice Request)</span>
                      </span>
                      {post.voiceLanguage && (
                        <span className="text-[10px] bg-emerald-800/80 text-emerald-200 px-2 py-0.5 rounded-full font-bold uppercase">
                          {post.voiceLanguage === 'si' ? 'සිංහල' : post.voiceLanguage === 'ta' ? 'தமிழ்' : 'English'}
                        </span>
                      )}
                    </div>

                    {/* Date, Time & Sent Location Info */}
                    {(post.voiceSentDate || post.voiceSentTime || post.voiceSentLocation) && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-2 rounded-xl bg-black/40 text-[11px] font-semibold text-emerald-100 border border-emerald-500/30">
                        {post.voiceSentDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">{post.voiceSentDate}</span>
                          </div>
                        )}
                        {post.voiceSentTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-teal-300 shrink-0" />
                            <span className="truncate">{post.voiceSentTime}</span>
                          </div>
                        )}
                        {post.voiceSentLocation && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                            <span className="truncate">{post.voiceSentLocation}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {post.audioUrl && (
                      <div className="pt-1">
                        <AudioVoicePlayer 
                          audioUrl={post.audioUrl} 
                          durationSec={post.audioDurationSec || 5} 
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Photo Attachment */}
                {post.imageUrl && (
                  <EmbeddedMediaViewer
                    url={post.imageUrl}
                    mediaType="image"
                    telegramRecord={post.telegramStorage}
                    compact={true}
                    onImageClick={(imgUrl) => {
                      if (onViewPost) onViewPost(post);
                    }}
                  />
                )}

                {/* Video or External Link */}
                {(post.videoUrl || post.externalLink) && (
                  <EmbeddedMediaViewer
                    url={post.videoUrl || post.externalLink}
                    telegramRecord={post.telegramStorage}
                    compact={true}
                  />
                )}
              </div>
            )}

            {/* Facebook-style Engagement Reaction & Counter Row */}
            <div className="flex items-center justify-between pt-2 px-1 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-[#132a1d]">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center -space-x-1">
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] shadow-2xs">❤️</span>
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-2xs">👍</span>
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {hasLiked ? `ඔබ සහ තවත් ${likesCount - 1} දෙනෙක්` : `${likesCount} දෙනෙකුගේ සහයෝගය`}
                </span>
              </div>

              <div className="flex items-center gap-3 font-semibold">
                <span>{post.replies?.length || 0} සහායකයින්</span>
                <span>•</span>
                <span>{Math.max(12, (likesCount * 3) + 4)} නිරීක්ෂණ</span>
              </div>
            </div>

            {/* Facebook-style 4-Button Social Action Bar */}
            <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-100 dark:border-[#132a1d]">
              {/* 1. Like / Support Button */}
              <button
                type="button"
                onClick={handleToggleLike}
                className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                  hasLiked 
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Heart className={`w-4 h-4 ${hasLiked ? 'fill-rose-500 text-rose-500 animate-bounce' : ''}`} />
                <span className="hidden xs:inline">{hasLiked ? 'සහයෝගය ✓' : 'සහයෝගය'}</span>
              </button>

              {/* 2. Direct Chat */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenChat) onOpenChat(post);
                  else onOfferSupport(post);
                }}
                className="py-2 px-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 font-bold text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden xs:inline">චැට්</span>
              </button>

              {/* 3. Call / WhatsApp Trigger */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (post.contactWhatsapp) {
                    const cleanPhone = post.contactWhatsapp.replace(/\D/g, '').replace(/^0/, '94');
                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello regarding #${displayPostCode} on Sahaya Sewa:`)}`, '_blank');
                  } else {
                    setShowRequestSmsModal(true);
                  }
                }}
                className="py-2 px-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 font-bold text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="hidden xs:inline">අමතන්න</span>
              </button>

              {/* 4. Share */}
              <button
                type="button"
                onClick={handleSharePost}
                className="py-2 px-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 font-bold text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Share2 className="w-4 h-4 text-slate-500" />
                <span className="hidden xs:inline">බෙදාගන්න</span>
              </button>
            </div>
          </div>
        )}

        {/* Dedicated Confirmed Helper Details Card for Post Owner */}
        {ownerCheck && isConfirmed && (
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-[#071d12] dark:to-[#092216] border-2 border-emerald-500/70 dark:border-emerald-600/70 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{activeCardLang === 'en' ? 'Confirmed Helper Information:' : activeCardLang === 'ta' ? 'உறுதிப்படுத்தப்பட்ட உதவியாளர் தகவல்கள்:' : 'සනාථ කළ සහායකයාගේ තොරතුරු:'}</span>
              </span>
              <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                {activeCardLang === 'en' ? 'Confirmed' : activeCardLang === 'ta' ? 'உறுதிப்படுத்தப்பட்டது' : 'තහවුරු කර ඇත'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {confirmedHelperName || (activeCardLang === 'en' ? 'Confirmed Helper' : activeCardLang === 'ta' ? 'உறுதிப்படுத்தப்பட்ட உதவியாளர்' : 'තහවුරු කළ සහායක')}
                </p>
                {confirmedHelperPhone ? (
                  <p className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{confirmedHelperPhone}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    {activeCardLang === 'en' ? 'Phone number not recorded' : activeCardLang === 'ta' ? 'தொலைபேசி எண் பதிவு செய்யப்படவில்லை' : 'දුරකථන අංකය සටහන් කර නොමැත'}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {confirmedHelperPhone && (
                  <a
                    href={`tel:${confirmedHelperPhone.replace(/\D/g, '')}`}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer"
                    title={activeCardLang === 'en' ? 'Direct Call' : activeCardLang === 'ta' ? 'நேரடி அழைப்பு' : 'සෘජු ඇමතුමක් ලබාගන්න'}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
                {confirmedHelperPhone && (
                  <a
                    href={`https://wa.me/${confirmedHelperPhone.replace(/\D/g, '').replace(/^0/, '94')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer"
                    title={activeCardLang === 'en' ? 'WhatsApp Message' : activeCardLang === 'ta' ? 'WhatsApp செய்தி' : 'WhatsApp පණිවිඩයක්'}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onOpenChat && onOpenChat(post)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer"
                  title={activeCardLang === 'en' ? 'Chat' : activeCardLang === 'ta' ? 'உரையாடு' : 'චැට් කරන්න'}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons: Strictly separated between Post Owner, Admin, and Viewers */}
        <div className="pt-2 space-y-2">
          {/* A. POST OWNER VIEW: Strictly shows Interested Responders and Details (No Chat/Confirm for own ad) */}
          {ownerCheck && !isAdmin ? (
            <div className="space-y-2">
              {/* Interested Responders Bar for Post Owner */}
              {post.replies && post.replies.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenSupportOffers) {
                      handleInterceptAction(onOpenSupportOffers);
                    } else if (onOpenChat) {
                      handleInterceptAction(onOpenChat);
                    }
                  }}
                  className="w-full p-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-emerald-500/20 border-2 border-orange-500/70 shadow-xs flex items-center justify-between transition-all cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <HeartHandshake className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {activeCardLang === 'en' ? 'Interested Responders' : activeCardLang === 'ta' ? 'விருப்பம் தெரிவித்தவர்கள்' : 'කැමැත්ත දැක්වූවන්'}
                    </span>
                    <span className="bg-orange-600 text-white text-[11px] font-black px-2 py-0.2 rounded-full font-mono shadow-xs shrink-0">
                      {post.replies.length}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-orange-700 dark:text-orange-300 flex items-center gap-0.5 shrink-0">
                    <span>{activeCardLang === 'en' ? 'View' : activeCardLang === 'ta' ? 'பார்' : 'බලන්න'}</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </button>
              ) : (
                <div className="w-full p-2.5 px-3.5 rounded-2xl bg-slate-100 dark:bg-emerald-950/40 border border-slate-200 dark:border-emerald-800/40 text-slate-600 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{activeCardLang === 'en' ? 'Awaiting Responders (0)' : activeCardLang === 'ta' ? 'பதில்கள் காத்திருக்கின்றன (0)' : 'සහය ඉදිරිපත් කිරීම් පොරොත්තුවෙන් (0)'}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">මගේ දැන්වීම</span>
                </div>
              )}

              {/* Owner Action Row */}
              <div className="flex items-center gap-2">
                {post.replies && post.replies.length > 0 && onOpenSupportOffers && (
                  <button
                    type="button"
                    onClick={() => handleInterceptAction(onOpenSupportOffers)}
                    className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-orange-400/40"
                  >
                    <HeartHandshake className="w-4 h-4 text-white" />
                    <span>{activeCardLang === 'en' ? 'Support Offers' : activeCardLang === 'ta' ? 'விருப்பங்கள்' : 'කැමැත්ත දැක්වූවන් බලන්න'}</span>
                  </button>
                )}

                {onViewPost && (
                  <button
                    type="button"
                    onClick={() => handleInterceptAction(onViewPost)}
                    className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#12281e] dark:hover:bg-[#1a382b] text-slate-700 dark:text-slate-200 font-extrabold text-xs shadow-xs border border-slate-200 dark:border-emerald-800/60 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title={activeCardLang === 'en' ? 'View Details' : activeCardLang === 'ta' ? 'விவரங்கள்' : 'සම්පූර්ණ විස්තර'}
                  >
                    <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    <span>{activeCardLang === 'en' ? 'Details' : activeCardLang === 'ta' ? 'விவரம்' : 'විස්තර බලන්න'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* B. OTHER PEOPLE / VIEWERS & ADMIN VIEW: Strictly CHAT, CONFIRM, and DETAILS */
            <div className="space-y-2">
              {/* Admin Moderation and Interested Responders (ONLY for Admin) */}
              {isAdmin && (
                <div className="space-y-1.5 pb-1">
                  {post.replies && post.replies.length > 0 && !isConfirmed && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenSupportOffers) {
                          handleInterceptAction(onOpenSupportOffers);
                        } else if (onOpenChat) {
                          handleInterceptAction(onOpenChat);
                        }
                      }}
                      className="w-full p-2 px-3 rounded-xl bg-amber-500/20 border border-orange-500/60 flex items-center justify-between text-xs font-bold text-orange-800 dark:text-orange-300 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <HeartHandshake className="w-3.5 h-3.5 text-orange-600" />
                        <span>කැමැත්ත දැක්වූවන් ({post.replies.length})</span>
                      </span>
                      <span className="text-[11px] font-mono">Admin View &gt;</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (onAdminModerate) {
                        handleInterceptAction(() => onAdminModerate(post));
                      }
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-[11px] shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-rose-400/40"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-200 shrink-0" />
                    <span>{activeCardLang === 'en' ? 'Admin Moderation' : activeCardLang === 'ta' ? 'நிர்வாகி கட்டுப்பாடு' : 'පරිපාලක පාලනය (Moderate)'}</span>
                  </button>
                </div>
              )}

              {/* Viewers Primary Action Buttons: CHAT, CONFIRM, and DETAILS */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Chat Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenChat) {
                      handleInterceptAction(onOpenChat);
                    } else {
                      handleInterceptAction(onOfferSupport);
                    }
                  }}
                  className="flex-1 min-w-[130px] py-3 px-4 rounded-2xl bg-white dark:bg-[#071a12] hover:bg-emerald-50 dark:hover:bg-[#0d2a1b] text-emerald-700 dark:text-emerald-300 font-black text-xs sm:text-sm border-2 border-emerald-500/70 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  title={activeCardLang === 'en' ? 'Open Chat' : activeCardLang === 'ta' ? 'அரட்டை திற' : 'සංවාදය විවෘත කරන්න'}
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{activeCardLang === 'en' ? 'CHAT' : activeCardLang === 'ta' ? 'CHAT (அரட்டை)' : 'CHAT (සංවාදය)'}</span>
                </button>

                {/* 2. Confirm Button / Confirmed Badge */}
                {isConfirmed ? (
                  <div className="flex-1 min-w-[140px] py-3 px-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm text-center">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{activeCardLang === 'en' ? 'CONFIRMED' : activeCardLang === 'ta' ? 'உறுதியானது' : 'තහවුරු කර ඇත'}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenConfirm) {
                        handleInterceptAction(onOpenConfirm);
                      } else {
                        handleInterceptAction(onOfferSupport);
                      }
                    }}
                    className="flex-1 min-w-[140px] py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/40"
                    title={activeCardLang === 'en' ? 'Confirm Service' : activeCardLang === 'ta' ? 'சேவை உறுதிப்படுத்தல்' : 'සේවාව තහවුරු කරන්න'}
                  >
                    <CheckCircle className="w-4 h-4 text-white" />
                    <span>{activeCardLang === 'en' ? 'CONFIRM' : activeCardLang === 'ta' ? 'CONFIRM (உறுதி)' : 'CONFIRM (තහවුරු)'}</span>
                  </button>
                )}

                {/* 3. Quick Details View button */}
                {onViewPost && (
                  <button
                    type="button"
                    onClick={() => handleInterceptAction(onViewPost)}
                    className="py-3 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#12281e] dark:hover:bg-[#1a382b] text-slate-700 dark:text-slate-200 font-extrabold text-xs shadow-xs border border-slate-200 dark:border-emerald-800/60 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    title={activeCardLang === 'en' ? 'View Details' : activeCardLang === 'ta' ? 'விவரங்கள்' : 'සම්පූර්ණ විස්තර'}
                  >
                    <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    <span className="hidden sm:inline">{activeCardLang === 'en' ? 'Details' : activeCardLang === 'ta' ? 'விவரம்' : 'විස්තර'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      <RequestWhatsAppSmsModal
        isOpen={showRequestSmsModal}
        onClose={() => setShowRequestSmsModal(false)}
        targetUserName={displayPost.userName || post.userName || 'දැන්වීම්කරු'}
        targetUserPhone={post.contactWhatsapp || post.userPhone || ''}
        targetUserIdentifier={post.userId || post.userNic || post.userPhone || post.id}
        postCode={displayPostCode}
        language={activeCardLang}
      />
    </Card3D>
  );
};

import React, { useState, useEffect } from 'react';
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
  Search,
  Gift,
  Calendar,
  DollarSign,
  Truck,
  ArrowLeftRight,
  PackageOpen,
  Bookmark,
  BookmarkCheck,
  Share2,
  Zap,
  Tag,
  Check,
  AlertTriangle,
  User as UserIcon
} from 'lucide-react';
import { HelpPost, Language, LocationOption, User } from '../types';
import { checkIsPostOwner } from '../utils/postOwnerHelper';
import { calculateMotorcycleRoadDistance, getVillageOrTownDisplay } from '../utils/geoUtils';
import { getAccurateElapsedTime } from '../utils/dateUtils';
import { inspectAndSanitizeMessage } from '../utils/policyGuard';
import { getTagIconComponent } from '../utils/tagUtils';
import { translateText, translateName } from '../utils/postTranslator';

interface NewsFeedCardProps {
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
  onOpenSupportOffers?: (post: HelpPost) => void;
}

export const NewsFeedCard: React.FC<NewsFeedCardProps> = ({
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
  onOpenSupportOffers,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const elapsedTimeLabel = getAccurateElapsedTime(post.createdAt, post.createdAtMs, nowMs);

  const normalizePhone = (phone?: string) => (phone ? phone.replace(/[^0-9]/g, '') : '');

  const ownerCheck = isOwner ?? checkIsPostOwner(currentUser, post);

  const isAdmin = currentUser?.role === 'admin';
  const isConfirmed = Boolean(post.isConfirmed || post.status === 'confirmed' || post.confirmedBy);
  const shouldMask = !isConfirmed && !ownerCheck && !isAdmin;

  // Quick Service Check
  const isQuickService =
    post.category === 'quick_services' ||
    post.category === 'quick' ||
    post.tagCategory === 'ඉක්මන් සේවා' ||
    post.tagName?.toLowerCase().includes('quick') ||
    post.tagName?.includes('හදිසි') ||
    post.customFieldValues?.f_urgency?.toString().includes('Immediate') ||
    post.customFieldValues?.f_urgency?.toString().includes('හදිසි');

  // Motorcycle Road Route Calculation
  const viewerLat = viewerLocation?.lat || 7.1710;
  const viewerLng = viewerLocation?.lng || 79.8986;
  const viewerLocationName = viewerLocation?.nameSi || 'ඔබ සිටින ස්ථානය';

  const postLat = post.lat || 7.1710;
  const postLng = post.lng || 79.8986;
  const postLocationName = post.locationName || 'දැන්වීම පළකළ ස්ථානය';

  const getLangText = (si: string, en: string, ta: string) => {
    if (lang === 'en') return en;
    if (lang === 'ta') return ta;
    return si;
  };

  const motorcycleRoute = calculateMotorcycleRoadDistance(
    postLat,
    postLng,
    viewerLat,
    viewerLng,
    postLocationName,
    viewerLocationName,
    lang
  );

  const displayPostCode = post.postCode.startsWith('#') ? post.postCode : `#${post.postCode}`;
  const helpersCount = post.helpersNeeded || post.helpersCount || 1;
  const repliesCount = post.replies?.length || post.repliesCount || 0;

  // Extract confirmed helper info
  const confirmedHelperName =
    post.confirmedHelperName ||
    post.confirmedBy ||
    post.replies?.find((r) => r.isConfirmed || r.isAccepted)?.responderName;
  const confirmedHelperPhone =
    post.confirmedHelperPhone || post.replies?.find((r) => r.isConfirmed || r.isAccepted)?.responderPhone;

  // Extract conditions & special notice cleanly
  let displaySpecialNotice = post.specialNotice || '';
  let displayConditions = post.conditions || '';

  const defaultConditions = getLangText('පළපුරුදු කාර්මික ශිල්පින් විමසන්න.', 'Experienced technicians/service providers only.', 'அனுபவம் வாய்ந்த தொழில்நுட்ப வல்லுநர்கள் மட்டும்.');

  if (!displaySpecialNotice && post.conditions) {
    if (post.conditions.includes('විශේෂ දැනුවත් කිරීම')) {
      const parts = post.conditions.split(/කොන්දේසි[:\s]*/i);
      if (parts.length > 1) {
        displaySpecialNotice = parts[0].replace(/විශේෂ දැනුවත් කිරීම්?[:\s]*/gi, '').trim();
        displayConditions = parts.slice(1).join(' ').trim();
      } else {
        displaySpecialNotice = post.conditions.replace(/විශේෂ දැනුවත් කිරීම්?[:\s]*/gi, '').trim();
        displayConditions = defaultConditions;
      }
    }
  }

  if (!displayConditions || displayConditions.trim() === '') {
    displayConditions = defaultConditions;
  }
  if (!displaySpecialNotice || displaySpecialNotice.trim() === '') {
    displaySpecialNotice = isQuickService 
      ? getLangText('අතිශය හදිසි / අද දවස තුල', 'Urgent / Today', 'மிக அவசரம் / இன்றைய தினத்திற்குள்') 
      : getLangText('අද දවස තුල', 'Within today', 'இன்றைய தினத்திற்குள்');
  }

  const safeWhatHappened = shouldMask ? inspectAndSanitizeMessage(post.whatHappened, false).sanitizedText : post.whatHappened;
  const safeWhatIsNeeded = shouldMask ? inspectAndSanitizeMessage(post.whatIsNeeded, false).sanitizedText : post.whatIsNeeded;
  const safeConditions = shouldMask ? inspectAndSanitizeMessage(displayConditions, false).sanitizedText : displayConditions;
  const safeSpecialNotice = shouldMask ? inspectAndSanitizeMessage(displaySpecialNotice, false).sanitizedText : displaySpecialNotice;

  const TagIconComp = getTagIconComponent(post.tagName, post.tagCategory, post.category);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/#${post.postCode}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Avatar initial color generator
  const getAvatarGradient = (name: string) => {
    const colors = [
      'from-emerald-600 to-teal-700',
      'from-blue-600 to-indigo-700',
      'from-amber-600 to-orange-700',
      'from-purple-600 to-pink-700',
      'from-teal-600 to-cyan-700'
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return colors[sum % colors.length];
  };

  return (
    <article
      id={`newsfeed-post-${post.id}`}
      className={`w-full bg-white dark:bg-[#071710] border-2 ${
        isQuickService
          ? 'border-amber-400 dark:border-amber-500/80 shadow-[0_10px_25px_rgba(245,158,11,0.12)] ring-1 ring-amber-400/30'
          : isConfirmed
          ? 'border-emerald-500/70 shadow-[0_10px_25px_rgba(0,122,75,0.12)]'
          : 'border-slate-200/90 dark:border-[#132a1d] shadow-sm hover:shadow-md'
      } rounded-[2rem] p-4 sm:p-5 transition-all duration-300 relative text-slate-900 dark:text-slate-100 flex flex-col gap-3.5`}
    >
      {/* 1. Quick Service / Urgent Top Announcement Banner */}
      {isQuickService && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-xs font-black shadow-sm">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-yellow-200 fill-yellow-200 animate-bounce" />
            <span className="tracking-wide">
              {getLangText('⚡ ඉක්මන් සේවා (Quick Service Priority)', '⚡ Urgent Quick Service Priority', '⚡ அவசர விரைவு சேவை')}
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider bg-black/20 px-2 py-0.5 rounded-md">
            TOP PRIORITY
          </span>
        </div>
      )}

      {/* 2. Confirmed Status Banner (If support confirmed) */}
      {isConfirmed && (
        <div className="p-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl shadow-sm border border-emerald-400/50 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-200 animate-pulse shrink-0" />
              <span className="text-xs sm:text-sm font-black tracking-tight">
                ✅ {getLangText('සහය සනාථ කර ඇත (Support Confirmed)', 'Support Confirmed', 'உதவி உறுதிப்படுத்தப்பட்டது')}
              </span>
            </div>
            <span className="text-[10px] bg-white/20 text-white font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
              CONFIRMED
            </span>
          </div>
          {confirmedHelperName && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs text-emerald-100 font-medium">
              <span className="text-emerald-200 font-bold">{getLangText('තෝරාගත් සහායකයා:', 'Selected Helper:', 'தேர்வு செய்யப்பட்ட உதவியாளர்:')}</span>
              <span className="font-black text-white">{confirmedHelperName}</span>
              {confirmedHelperPhone && (ownerCheck || isAdmin) && (
                <span className="font-mono text-emerald-200">({confirmedHelperPhone})</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Facebook-Style Header: User Info, Timestamp, Code, Save Bookmark Button */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-[#132a1d] pb-3">
        {/* Left: Avatar & Poster Details */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr ${getAvatarGradient(post.userName || 'U')} text-white font-black text-base flex items-center justify-center shrink-0 shadow-md ring-2 ring-emerald-500/30 uppercase`}>
            {post.userName ? post.userName.charAt(0) : <UserIcon className="w-5 h-5" />}
          </div>
          
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                {translateName(post.userName || 'පරිශීලකයා', lang)}
              </h3>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded-md border border-emerald-300/60 dark:border-emerald-700/60 flex items-center gap-0.5 shrink-0">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>{getLangText('සත්‍යාපිත', 'Verified', 'சரிபார்க்கப்பட்டது')}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <div className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{elapsedTimeLabel}</span>
              </div>
              <span>•</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                {displayPostCode}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Tag Badge & Save (Bookmark) Button */}
        <div className="flex items-center gap-2 shrink-0">
          {(post.tagName || post.tagCategory) && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold rounded-xl shadow-2xs">
              {TagIconComp && <TagIconComp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
              <span className="truncate max-w-[110px]">{translateText(post.tagName || post.tagCategory, lang)}</span>
            </span>
          )}

          {/* SAVE BUTTON (Facebook Style Save/Bookmark) */}
          <button
            type="button"
            onClick={() => onToggleSave && onToggleSave(post)}
            className={`p-2.5 rounded-2xl transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 text-xs font-black shadow-xs border ${
              isSaved
                ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/30'
                : 'bg-slate-100 hover:bg-amber-50 dark:bg-slate-800/80 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 border-slate-200 dark:border-slate-700'
            }`}
            title={isSaved ? getLangText('සුරැකි ලැයිස්තුවෙන් ඉවත් කරන්න', 'Remove from saved', 'சேமிப்பிலிருந்து நீக்கு') : getLangText('පසුව බැලීමට සුරකින්න', 'Save Post', 'பதிவை சேமி')}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-white fill-white" />
                <span className="hidden sm:inline">{getLangText('සුරකින ලදි', 'Saved', 'சேமிக்கப்பட்டது')}</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 text-slate-500 dark:text-slate-400 hover:text-amber-600" />
                <span className="hidden sm:inline">{getLangText('සුරකින්න', 'Save', 'சேமி')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Post Content Section (Facebook Post Body) */}
      <div className="space-y-3">
        {/* Category Specific View: Find For Me */}
        {post.category === 'find_for_me' ? (
          <div className={`p-3.5 rounded-2xl border space-y-2 ${
            post.findForMeType === 'found' || post.whatHappened?.includes('හමුවී ඇත')
              ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-300/80 dark:border-teal-800/70'
              : post.findForMeType === 'lost'
              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300/70 dark:border-rose-800/60'
              : post.findForMeType === 'stolen'
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300/70 dark:border-amber-800/60'
              : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300/70 dark:border-emerald-800/60'
          }`}>
            <div className="flex items-center justify-between text-xs font-black">
              <span className={`flex items-center gap-1 ${
                post.findForMeType === 'found' || post.whatHappened?.includes('හමුවී ඇත')
                  ? 'text-teal-900 dark:text-teal-200'
                  : post.findForMeType === 'lost'
                  ? 'text-rose-900 dark:text-rose-200'
                  : 'text-amber-900 dark:text-amber-200'
              }`}>
                {post.findForMeType === 'found' || post.whatHappened?.includes('හමුවී ඇත') ? (
                  <>
                    <span>🎁</span>
                    <span>{getLangText('හමුවනලද (Found Item)', 'Found Item', 'கண்டெடுக்கப்பட்ட பொருள்')}</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>{getLangText('සොයාදෙන්න ඉල්ලීම', 'Find For Me Request', 'கண்டுபிடி கோரிக்கை')}</span>
                  </>
                )}
              </span>
              {post.hasReward && (
                <span className="bg-amber-500 text-white px-2 py-0.5 rounded-md font-mono text-[10px]">
                  🎁 {getLangText('ත්‍යාගයක් පිරිනැමේ', 'Reward Offered', 'வெகுமதி')}
                </span>
              )}
            </div>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
              {post.itemLostStolenOrSearched || safeWhatHappened}
            </p>
            {post.identifyingInfo && (
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-black/30 p-2 rounded-xl border border-amber-200 dark:border-amber-900/50">
                <strong className="text-amber-800 dark:text-amber-300">හඳුනාගැනීමේ තොරතුරු:</strong> {shouldMask ? inspectAndSanitizeMessage(post.identifyingInfo, false).sanitizedText : post.identifyingInfo}
              </p>
            )}
          </div>
        ) : post.category === 'from_me_to_you' ? (
          /* Category Specific View: From Me To You */
          <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-300/70 dark:border-teal-800/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-teal-900 dark:text-teal-200">
              <span className="flex items-center gap-1">
                <Gift className="w-3.5 h-3.5 text-teal-600" />
                <span>{getLangText('මගෙන් ඔබට (පරිත්‍යාග / හුවමාරු)', 'From Me To You (Giveaway/Donation)', 'பரிசு / பரிமாற்றம்')}</span>
              </span>
              <span className="bg-teal-600 text-white px-2 py-0.5 rounded-md font-bold text-[10px]">
                {post.fromMeToYouType === 'exchange' ? 'භාණ්ඩ හුවමාරුව' : 'නොමිලේ පරිත්‍යාගය'}
              </span>
            </div>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
              {post.donationItem || post.exchangeHaveItem || safeWhatHappened}
            </p>
          </div>
        ) : (
          /* Standard / Quick Service Main Content */
          <div className="space-y-2.5">
            {/* සිදුවී ඇති දේ (What Happened) */}
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <span>📌</span>
                <span>{getLangText('සිදුවී ඇති දේ:', 'What Happened:', 'நடந்த விஷயம்:')}</span>
              </div>
              <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-relaxed bg-slate-50/80 dark:bg-[#0c2217]/70 p-3 rounded-2xl border border-slate-200/70 dark:border-[#1a3827]">
                {safeWhatHappened}
              </p>
            </div>

            {/* වියයුතු දේ (What is Needed) */}
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                <span>🎯</span>
                <span>{getLangText('වියයුතු දේ / අවශ්‍ය සහය:', 'What is Needed:', 'தேவைப்படும் உதவி:')}</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed bg-teal-50/40 dark:bg-teal-950/20 p-2.5 rounded-2xl border border-teal-200/60 dark:border-teal-900/40">
                {safeWhatIsNeeded}
              </p>
            </div>
          </div>
        )}

        {/* 5. Key Badges & Route Details Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {/* Motorcycle Distance & Maps Link */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-emerald-50/80 dark:bg-[#0c2217] border border-emerald-200/80 dark:border-emerald-800/80 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-emerald-200 truncate">
              <span className="text-sm">🏍️</span>
              <span className="font-extrabold">{motorcycleRoute.formattedRoadDistance}</span>
              <span className="text-slate-400">~</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                {motorcycleRoute.formattedTime.replace(/^~/, '').trim()}
              </span>
            </div>

            {isConfirmed || ownerCheck ? (
              <a
                href={motorcycleRoute.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Google Maps මාර්ගය"
                className="p-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
              >
                <MapPin className="w-3 h-3 text-amber-300" />
                <span>Maps</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ) : (
              <span
                onClick={(e) => e.stopPropagation()}
                title="🔒 සහය තහවුරු කළ පසු Google Maps මාර්ගය විවෘත වේ"
                className="p-1 px-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px] border border-amber-300 dark:border-amber-800 flex items-center gap-1 cursor-not-allowed shrink-0"
              >
                <Lock className="w-2.5 h-2.5 text-amber-600" />
                <span>Locked</span>
              </span>
            )}
          </div>

          {/* Location & Helpers count */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-[#0c2217] border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="truncate">{getVillageOrTownDisplay(post.locationName) || viewerLocationName}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-lg shrink-0">
              <UserCheck className="w-3 h-3 text-emerald-600" />
              <span>{helpersCount} {getLangText('අවශ්‍යයි', 'Need', 'தேவை')}</span>
            </div>
          </div>
        </div>

        {/* Transport & Payment Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
          {post.transport && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
              <Truck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="truncate max-w-[200px]">{post.transport}</span>
            </span>
          )}
          {post.payment && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold border border-amber-200 dark:border-amber-800">
              <DollarSign className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>{post.payment}</span>
            </span>
          )}
          {safeSpecialNotice && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-extrabold border border-rose-200 dark:border-rose-800 text-[11px]">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span>{safeSpecialNotice}</span>
            </span>
          )}
        </div>
      </div>

      {/* 6. Facebook-Style Interactive Action Bar */}
      <div className="pt-2 border-t border-slate-100 dark:border-[#132a1d] space-y-2">
        {/* Interaction Summary Counts */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <div className="flex items-center gap-2">
            {(ownerCheck || isAdmin) && (
              <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>{repliesCount} {getLangText('කැමැත්ත දැක්වූවන්', 'Offers', 'விருப்பங்கள்')}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {copiedLink && (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-fadeIn">
                ✓ {getLangText('සබැඳිය පිටපත් විය!', 'Link copied!', 'இணைப்பு நகலெடுக்கப்பட்டது!')}
              </span>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 font-bold cursor-pointer"
              title="දැන්වීමේ Link එක Share කරන්න"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{getLangText('බෙදාගන්න', 'Share', 'பகிர்')}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons Row */}
        {ownerCheck ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => onOpenSupportOffers && onOpenSupportOffers(post)}
              className="flex-1 min-w-[140px] py-2 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-amber-400/40"
            >
              <HeartHandshake className="w-4 h-4 text-white" />
              <span>{getLangText('කැමැත්ත දැක්වූවන් බලන්න', 'View Offers', 'விருப்பங்களைப் பார்')}</span>
            </button>

            <button
              type="button"
              onClick={() => onEditPost && onEditPost(post)}
              className="py-2 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer border border-emerald-400/40"
              title={getLangText('දැන්වීම සංස්කරණය', 'Edit Post', 'திருத்து')}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{getLangText('සංස්කරණය', 'Edit', 'திருத்து')}</span>
            </button>

            <button
              type="button"
              onClick={() => onViewPost && onViewPost(post)}
              className="py-2 px-3 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer border border-sky-400/40"
              title={getLangText('සම්පූර්ණ විස්තර', 'View Details', 'விவரம்')}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{getLangText('විස්තර', 'View', 'விவரம்')}</span>
            </button>

            <button
              type="button"
              onClick={() => onDeletePost && onDeletePost(post)}
              className="py-2 px-3 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer border border-rose-400/40"
              title={getLangText('දැන්වීම මකන්න', 'Delete Post', 'நீக்கு')}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{getLangText('මකන්න', 'Delete', 'நீக்கு')}</span>
            </button>
          </div>
        ) : isAdmin ? (
          <div className="space-y-2 pt-1">
            {post.replies && post.replies.length > 0 && (
              <button
                type="button"
                onClick={() => onOpenSupportOffers && onOpenSupportOffers(post)}
                className="w-full py-2 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-amber-400/40"
              >
                <HeartHandshake className="w-4 h-4 text-white" />
                <span>{getLangText('කැමැත්ත දැක්වූවන් බලන්න', 'View Offers', 'விருப்பங்களைப் பார்')} ({post.replies.length})</span>
              </button>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenChat && onOpenChat(post)}
                className="flex-1 min-w-[70px] py-2 px-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer border border-teal-400/40"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{getLangText('සංවාදය', 'Chat', 'அரட்டை')}</span>
              </button>

              <button
                type="button"
                onClick={() => onEditPost && onEditPost(post)}
                className="flex-1 min-w-[70px] py-2 px-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer border border-emerald-400/40"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{getLangText('සංස්කරණය', 'Edit', 'திருத்து')}</span>
              </button>

              <button
                type="button"
                onClick={() => onViewPost && onViewPost(post)}
                className="flex-1 min-w-[70px] py-2 px-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer border border-sky-400/40"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{getLangText('විස්තර', 'View', 'விவரம்')}</span>
              </button>

              <button
                type="button"
                onClick={() => onDeletePost && onDeletePost(post)}
                className="flex-1 min-w-[70px] py-2 px-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer border border-rose-400/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{getLangText('මකන්න', 'Delete', 'நீக்கு')}</span>
              </button>
            </div>

            <button
              onClick={() => onOfferSupport(post)}
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/40"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>{getLangText('සහාය වීමට පිළිතුරු යවන්න / පරීක්ෂා කරන්න', 'Send Support Offer / Inspect', 'உதவி வழங்க / பரிசோதிக்க')}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Primary Action Button: Offer Support */}
            <button
              type="button"
              onClick={() => onOfferSupport(post)}
              className={`flex-1 min-w-[170px] py-3 px-4 rounded-2xl font-black text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                isQuickService
                  ? 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 hover:from-amber-700 hover:to-orange-600 text-white border-amber-400/50 shadow-amber-600/20'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] hover:from-emerald-700 hover:to-teal-700 text-white border-emerald-400/50 shadow-emerald-600/20'
              }`}
            >
              <HeartHandshake className="w-4 h-4 text-amber-200 shrink-0" />
              <span>{isConfirmed ? getLangText('අමතර සහය හෝ විමසීම්', 'Additional Inquiries', 'கூடுதல் விசாரணைகள்') : getLangText('සහාය වීමට කැමැත්ත දක්වන්න', 'Offer Support', 'உதவ விருப்பம் தெரிவிக்க')}</span>
            </button>

            {onViewPost && (
              <button
                type="button"
                onClick={() => onViewPost(post)}
                className="py-3 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs shadow-xs border border-slate-200 dark:border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                title={getLangText('සම්පූර්ණ විස්තර බලන්න', 'View Details', 'விவரம்')}
              >
                <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="hidden sm:inline">{getLangText('විස්තර', 'Details', 'விவரம்')}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

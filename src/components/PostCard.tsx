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
  Zap
} from 'lucide-react';
import { HelpPost, Language, LocationOption, User } from '../types';
import { Card3D } from './Card3D';
import { calculateMotorcycleRoadDistance, getVillageOrTownDisplay } from '../utils/geoUtils';
import { getAccurateElapsedTime } from '../utils/dateUtils';
import { inspectAndSanitizeMessage } from '../utils/policyGuard';
import { getTagIconComponent } from '../utils/tagUtils';

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
  onOpenSupportOffers?: (post: HelpPost) => void;
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
  onOpenSupportOffers,
}) => {
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const elapsedTimeLabel = getAccurateElapsedTime(post.createdAt, post.createdAtMs, nowMs);

  const normalizePhone = (phone?: string) => phone ? phone.replace(/[^0-9]/g, '') : '';

  const ownerCheck = isOwner ?? (
    currentUser && (
      (currentUser.userId && post.userId && (currentUser.userId === post.userId || currentUser.id === post.userId)) ||
      (currentUser.phone && post.userPhone && normalizePhone(currentUser.phone) === normalizePhone(post.userPhone)) ||
      (currentUser.name && post.userName && currentUser.name.trim().toLowerCase() === post.userName.trim().toLowerCase())
    )
  );

  const isConfirmedHelper = Boolean(
    currentUser && (
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

  const isAdmin = currentUser?.role === 'admin';
  const isConfirmed = Boolean(post.isConfirmed || post.status === 'confirmed' || post.confirmedBy);
  const shouldMask = !isConfirmed && !ownerCheck && !isAdmin;

  // Contact Permission for Anti-Fraud Safeguard (Only show phone/address with poster's consent, or if owner/confirmed helper/admin)
  const hasContactPermission = Boolean(
    ownerCheck || 
    isAdmin || 
    isConfirmedHelper || 
    post.revealContactConsent === true
  );
  const viewerLat = viewerLocation?.lat || 7.1710;
  const viewerLng = viewerLocation?.lng || 79.8986;
  const viewerLocationName = viewerLocation?.nameSi || 'ඔබ සිටින ස්ථානය (නරඹන්නා)';
  
  const postLat = post.lat || 7.1710;
  const postLng = post.lng || 79.8986;
  const postLocationName = post.locationName || 'දැන්වීම පළකළ ස්ථානය';

  const motorcycleRoute = calculateMotorcycleRoadDistance(
    postLat,
    postLng,
    viewerLat,
    viewerLng,
    postLocationName,
    viewerLocationName
  );

  const displayPostCode = post.postCode.startsWith('#') ? post.postCode : `#${post.postCode}`;
  const helpersCount = post.helpersNeeded || post.helpersCount || 1;

  // Extract confirmed helper info if present
  const confirmedHelperName = post.confirmedHelperName || post.confirmedBy || (post.replies?.find(r => r.isConfirmed || r.isAccepted)?.responderName);
  const confirmedHelperPhone = post.confirmedHelperPhone || (post.replies?.find(r => r.isConfirmed || r.isAccepted)?.responderPhone);

  // Extract conditions & special notice cleanly
  let displaySpecialNotice = post.specialNotice || '';
  let displayConditions = post.conditions || '';

  if (!displaySpecialNotice && post.conditions) {
    if (post.conditions.includes('විශේෂ දැනුවත් කිරීම')) {
      const parts = post.conditions.split(/කොන්දේසි[:\s]*/i);
      if (parts.length > 1) {
        displaySpecialNotice = parts[0].replace(/විශේෂ දැනුවත් කිරීම්?[:\s]*/gi, '').trim();
        displayConditions = parts.slice(1).join(' ').trim();
      } else {
        displaySpecialNotice = post.conditions.replace(/විශේෂ දැනුවත් කිරීම්?[:\s]*/gi, '').trim();
        displayConditions = 'පළපුරුදු කාර්මික ශිල්පින් විමසන්න.';
      }
    }
  }

  if (!displayConditions || displayConditions.trim() === '') {
    displayConditions = 'පළපුරුදු කාර්මික ශිල්පින් විමසන්න.';
  }
  if (!displaySpecialNotice || displaySpecialNotice.trim() === '') {
    displaySpecialNotice = 'අද දවස තුල';
  }

  const safeWhatHappened = shouldMask ? inspectAndSanitizeMessage(post.whatHappened, false).sanitizedText : post.whatHappened;
  const safeWhatIsNeeded = shouldMask ? inspectAndSanitizeMessage(post.whatIsNeeded, false).sanitizedText : post.whatIsNeeded;
  const safeConditions = shouldMask ? inspectAndSanitizeMessage(displayConditions, false).sanitizedText : displayConditions;
  const safeSpecialNotice = shouldMask ? inspectAndSanitizeMessage(displaySpecialNotice, false).sanitizedText : displaySpecialNotice;

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
      isQuickService
        ? 'border-amber-400 dark:border-amber-500/80 shadow-[0_12px_30px_rgba(245,158,11,0.18)] ring-1 ring-amber-400/40'
        : isConfirmed 
        ? 'border-emerald-500/80 shadow-[0_12px_30px_rgba(0,122,75,0.18)]' 
        : 'border-emerald-500/30 hover:border-emerald-500/70 shadow-[0_12px_30px_rgba(0,122,75,0.08),0_2px_8px_rgba(0,0,0,0.04)]'
    } rounded-3xl p-5 sm:p-6 transition-all duration-300 relative group overflow-hidden text-slate-900 dark:text-slate-100`}>
      
      {/* Top Banner Accent */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${
        isQuickService
          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
          : isConfirmed 
          ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600' 
          : 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400'
      }`}></div>

      <div className="space-y-3.5 pt-1 text-slate-900 dark:text-slate-100 font-sans">
        
        {/* Quick Service Urgent Priority Banner */}
        {isQuickService && (
          <div className="flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-xs font-black shadow-sm">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-yellow-200 fill-yellow-200 animate-bounce" />
              <span className="tracking-wide">
                ⚡ ඉක්මන් සේවා (Quick Service Priority)
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
            <span className="text-slate-700 dark:text-slate-300 font-bold">ගතවූ කාලය:</span>
            <span className="font-extrabold text-amber-800 dark:text-amber-300">{elapsedTimeLabel}</span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-300/80 dark:border-emerald-700/60 shrink-0">
            ⏱️ සජීවී
          </span>
        </div>

        {/* PROMINENT CONFIRMED STATUS BANNER (If Confirmed) */}
        {isConfirmed && (
          <div className="p-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl shadow-md border border-emerald-400/50 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-200 animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm font-black tracking-tight">
                  ✅ සහය සනාථ කර ඇත (Support Confirmed)
                </span>
              </div>
              <span className="text-[10px] bg-white/20 text-white font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                CONFIRMED
              </span>
            </div>
            {confirmedHelperName && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5 text-xs text-emerald-100 font-medium">
                <span className="text-emerald-200 font-bold">තෝරාගත් සහායකයා:</span>
                <span className="font-black text-white">{confirmedHelperName}</span>
                {confirmedHelperPhone && (
                  <span className="font-mono text-emerald-200">({confirmedHelperPhone})</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 1. Help ID & Tag Icon (Right next to ID) & Tag Badge */}
        {(() => {
          const TagIconComp = getTagIconComponent(post.tagName, post.tagCategory, post.category);
          return (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-base sm:text-lg font-black tracking-wide text-emerald-800 dark:text-emerald-300">
                  {displayPostCode}
                </span>
                {TagIconComp && (
                  <span 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-2xs font-bold text-xs" 
                    title={post.tagName ? `${post.tagName} (${post.tagCategory || ''})` : 'Tag Icon'}
                  >
                    <TagIconComp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    {post.tagName && (
                      <span className="font-extrabold text-xs text-emerald-900 dark:text-emerald-200">
                        {post.tagName}
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Save (Bookmark) Button */}
                {onToggleSave && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave(post);
                    }}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-bold border ${
                      isSaved
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-emerald-50 hover:bg-amber-50 dark:bg-emerald-950/60 dark:hover:bg-amber-950/40 text-slate-600 dark:text-slate-300 hover:text-amber-600 border-emerald-200 dark:border-emerald-800'
                    }`}
                    title={isSaved ? 'සුරැකි ලැයිස්තුවෙන් ඉවත් කරන්න' : 'පසුව බැලීමට සුරකින්න (Save Post)'}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="w-3.5 h-3.5 text-white fill-white" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    )}
                    <span className="text-[11px] hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
                  </button>
                )}

                {isConfirmed && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-xs rounded-xl border border-emerald-300 dark:border-emerald-700">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>සනාථයි</span>
                  </span>
                )}

                {(post.tagName || post.tagCategory) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs rounded-xl shadow-xs">
                    <span>🏷️</span>
                    <span>{post.tagName}</span>
                    {post.tagCategory && (
                      <span className="text-[10px] bg-emerald-900/50 px-1.5 py-0.2 rounded-md font-medium">
                        {post.tagCategory}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* 2 & 3. Distance & Time by Motorcycle */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 font-bold text-sm sm:text-base text-slate-900 dark:text-emerald-200 bg-emerald-50 dark:bg-[#0d281a] px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800/80 shadow-xs">
            <span className="text-base">🏍️</span>
            <span className="font-extrabold">{motorcycleRoute.formattedRoadDistance}</span>
            <span className="text-slate-400 dark:text-slate-500">~</span>
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
              title="Google Maps Motorcycle Directions"
              className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-[#123321] dark:hover:bg-[#1a472e] text-emerald-800 dark:text-emerald-300 text-xs transition-all border border-emerald-300 dark:border-emerald-700/60 flex items-center gap-1 cursor-pointer"
            >
              <MapPin className="w-3 h-3 text-rose-500" />
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span
              onClick={(e) => e.stopPropagation()}
              title="🔒 සහය CONFIRM කළ පසු Google Maps මාර්ගය හා ලිපිනය විවෘත වේ"
              className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs border border-amber-300 dark:border-amber-700/60 flex items-center gap-1 cursor-not-allowed"
            >
              <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            </span>
          )}
        </div>

        {/* 4 & 5. Publisher Name & Posted Time */}
        <div className="flex items-center justify-between gap-2 pt-1 border-b border-emerald-100 dark:border-[#132a1d] pb-2.5">
          <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{post.userName}</span>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>ගිණුම් හිමියා</span>
            </span>
          </div>
          <div className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-extrabold text-right flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{elapsedTimeLabel}</span>
          </div>
        </div>

        {/* Dedicated Find For Me Card Rendering (User's Exact Specification) */}
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

          const effectiveContactPhone = post.contactPhone || post.userPhone || '0771234567';
          const effectiveContactWhatsapp = post.contactWhatsapp || post.userPhone || '0771234567';
          const effectiveContactAddress = post.contactAddress || post.locationName || 'ගෙදර ලිපිනය';
          const effectiveLocationName = post.locationName || 'ස්ථානය තහවුරු කර ඇත';
          const effectiveIncidentLocation = post.incidentLocation || post.locationName || '';
          const effectiveIncidentDate = post.incidentDate || (post.createdAt?.includes('මීට') ? 'අද' : post.createdAt) || '';
          const effectiveIncidentTime = post.incidentTime || '';
          const effectiveDelivery = post.deliveryOption || post.transport || 'ගෙනවිත් දෙන්න ඒ සදහා මම ඔබට වෙනම ගෙවන්නම්';
          const effectiveOtherDetails = post.otherDetails || (post.conditions && !post.conditions.startsWith('ගණුදෙනුව') && !post.conditions.startsWith('සම්බන්ධ') ? post.conditions : '');
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
                    : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                }`}>
                  <Search className="w-3.5 h-3.5" />
                  <span>
                    {effectiveType === 'lost'
                      ? '🔴 නැතිවූ දෙයක් (Lost Item)'
                      : effectiveType === 'stolen'
                      ? '⚠️ සොරාගත් දෙයක් (Stolen Item)'
                      : '🔍 සොයාදෙන්න (Search / Procurement)'}
                  </span>
                </span>

                {showReward && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/90 px-2.5 py-1 rounded-xl border border-amber-300 dark:border-amber-600">
                    <Gift className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>තෑග්ගක් සහිතයි</span>
                  </span>
                )}
              </div>

              {/* 1. LOST OR STOLEN ITEM SPECIFIC PRESENTATION */}
              {(effectiveType === 'lost' || effectiveType === 'stolen') && (
                <div className="space-y-3">
                  {/* Main Advertisement Narrative Text */}
                  <div className="p-3 bg-white/90 dark:bg-[#082014] rounded-xl border border-emerald-300/70 dark:border-emerald-800/70 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed space-y-2 shadow-xs">
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
                    <p className="text-slate-800 dark:text-slate-200">
                      නැතිනම්{' '}
                      <span className="font-extrabold text-emerald-800 dark:text-emerald-300">
                        {hasContactPermission ? getVillageOrTownDisplay(effectiveContactAddress) : '🔒 නිශ්චිත ලිපිනය ආරක්ෂිතයි (දැන්වීම්කරුගේ අවසරය අවශ්‍යයි)'}
                      </span>{' '}
                      ට එවන්න. නිවැරදි ස්ථානය:{' '}
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {hasContactPermission ? getVillageOrTownDisplay(effectiveLocationName) : `${getVillageOrTownDisplay(effectiveLocationName).split(',')[0]} (🔒 තහවුරු වූ පසු දිස්වේ)`}
                      </span>
                    </p>
                  </div>

                  {/* Other details (if provided) */}
                  {effectiveOtherDetails && effectiveOtherDetails.trim() !== '' && (
                    <div className="p-2.5 bg-emerald-50/70 dark:bg-[#071d12] rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-xs text-slate-800 dark:text-slate-200">
                      <strong className="text-emerald-900 dark:text-emerald-300 font-black block mb-0.5">
                        වැඩි විස්තර:
                      </strong>
                      <p className="font-semibold">{effectiveOtherDetails}</p>
                    </div>
                  )}

                  {/* Identifying info on item (Phone, NIC, Reg/Serial No, or Name) */}
                  {post.identifyingInfo && post.identifyingInfo.trim() !== '' && (
                    <div className="p-3 bg-amber-500/10 dark:bg-amber-950/40 rounded-xl border-2 border-amber-400/70 dark:border-amber-700/70 text-xs text-amber-950 dark:text-amber-100 shadow-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-black text-amber-900 dark:text-amber-300">
                        <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>නැති වූ දේ ඇති දුරකථන අංකය / හැඳුනුම්පත් අංකය / සලකුණු / නම:</span>
                      </div>
                      <p className="font-extrabold text-sm pl-5 text-slate-900 dark:text-white bg-white/70 dark:bg-black/30 py-1.5 px-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
                        {shouldMask ? inspectAndSanitizeMessage(post.identifyingInfo, false).sanitizedText : post.identifyingInfo}
                      </p>
                    </div>
                  )}

                  {/* Reward (Only shown if hasReward is ticked) */}
                  {showReward && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/80 rounded-xl text-amber-900 dark:text-amber-200 font-extrabold text-xs flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>
                        <strong>සොයාදෙන්නාහට මගෙන්:</strong> {post.rewardDetails}
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
                      {post.targetPrice ? `${post.targetPrice} පමණ, ` : ''}
                      <strong className="text-emerald-700 dark:text-emerald-300 font-black">
                        {effectiveItemName}
                      </strong>{' '}
                      {post.quantityNeeded ? `${post.quantityNeeded} ` : ''}අවශ්‍යයි,
                    </p>
                    {post.hasDeadline && post.deadlineDate && (
                      <p className="text-rose-600 dark:text-rose-400 font-extrabold">
                        {post.deadlineDate} {post.deadlineTime ? `(${post.deadlineTime}) ` : ''}පෙර සොයාදෙන්න.
                      </p>
                    )}
                  </div>

                  {/* Contact & Location Info Section */}
                  <div className="p-3 bg-emerald-50/70 dark:bg-[#071d12] rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-1.5 text-slate-800 dark:text-slate-200">
                    <strong className="text-emerald-900 dark:text-emerald-300 font-black block pb-1 border-b border-emerald-200/80 dark:border-emerald-900/40">
                      ස්ථානය හා සම්බන්ධකරගතහැකි තොරතුරු:
                    </strong>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 font-semibold">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">දුරකථන අංකය: </span>
                        <strong className="text-slate-900 dark:text-white">
                          {hasContactPermission ? effectiveContactPhone : '07* *** **** (🔒 ආරක්ෂිතයි)'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">වට්සැප් අංකය: </span>
                        <strong className="text-slate-900 dark:text-white">
                          {hasContactPermission ? effectiveContactWhatsapp : '07* *** **** (🔒 ආරක්ෂිතයි)'}
                        </strong>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 dark:text-slate-400">ගෙදර ලිපිනය: </span>
                        <strong className="text-slate-900 dark:text-white">
                          {hasContactPermission ? getVillageOrTownDisplay(effectiveContactAddress) : '🔒 නිශ්චිත ලිපිනය ආරක්ෂිතයි (දැන්වීම්කරුගේ අවසරය අවශ්‍යයි)'}
                        </strong>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 dark:text-slate-400">නිවැරදි ස්ථානය: </span>
                        <strong className="text-slate-900 dark:text-white">
                          {hasContactPermission ? getVillageOrTownDisplay(effectiveLocationName) : `${getVillageOrTownDisplay(effectiveLocationName).split(',')[0]} (🔒 තහවුරු වූ පසු දිස්වේ)`}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Other details (if provided) */}
                  {effectiveOtherDetails && effectiveOtherDetails.trim() !== '' && (
                    <div className="p-2.5 bg-emerald-50/70 dark:bg-[#071d12] rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-xs text-slate-800 dark:text-slate-200">
                      <strong className="text-emerald-900 dark:text-emerald-300 font-black block mb-0.5">
                        වැඩි විස්තර:
                      </strong>
                      <p className="font-semibold">{effectiveOtherDetails}</p>
                    </div>
                  )}

                  {/* Delivery / Transaction Method */}
                  <div className="p-2.5 bg-white dark:bg-[#082014] rounded-xl border border-emerald-300/80 dark:border-emerald-800 text-xs space-y-1">
                    <strong className="text-emerald-900 dark:text-emerald-300 font-black flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ගණුදෙනුව සිදුවියයුතු ආකාරය:</span>
                    </strong>
                    <p className="font-bold text-slate-900 dark:text-white pl-5">
                      {effectiveDelivery}
                    </p>
                  </div>
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
                    <span>ඇමතුමක් ගන්න</span>
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
                    title="වංචනික ක්‍රියා වැළැක්වීමේ ආරක්ෂාව: ඇමතුම් ලබාගැනීමට Chat මඟින් දැන්වීම්කරුගෙන් විමසන්න"
                  >
                    <Lock className="w-3 h-3 text-amber-500" />
                    <span>🔒 අංකය විමසන්න (Chat)</span>
                  </button>
                )}

                {hasContactPermission && effectiveContactWhatsapp ? (
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
                    <span>අපගේ Chat</span>
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
                    <span>Map මාර්ගය</span>
                  </a>
                ) : (
                  <div
                    className="py-2 px-2.5 bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1 text-center"
                  >
                    <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>🔒 ලිපිනය ආරක්ෂිතයි</span>
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

          const itemTitle = post.donationItem || post.whatHappened?.replace(/^පරිත්‍යාගයකි:\s*|^ඉවත් කිරීමට නියමිතයි:\s*/i, '')?.split('(')[0]?.trim() || post.tagName || 'භාණ්ඩය';
          const qty = post.donationQuantity || '1ක්';
          const rec = post.donationRecipient || 'අවශ්‍ය ඕනෑම අයෙක්';
          const dateVal = post.donationDate || (effectivePurpose === 'giveaway' ? 'අද' : 'අදම');
          const delivery = post.donationDeliveryMethod || post.transport || 'ඇවිත් රැගෙන යන්න';
          const locName = post.locationName || 'ස්ථානය තහවුරු කර ඇත';
          const whatsapp = post.contactWhatsapp || post.userPhone || '';
          const details = post.otherDetails || (post.conditions && !post.conditions.startsWith('ස්ථානය') ? post.conditions : '');

          const haveItem = post.exchangeHaveItem || post.whatHappened?.split('⇄')[0]?.replace(/^හුවමාරුවට:\s*/i, '')?.trim() || 'භාණ්ඩය';
          const haveQty = post.exchangeHaveQuantity || '1ක්';
          const wantItem = post.exchangeWantItem || post.whatHappened?.split('⇄')[1]?.trim() || 'අවශ්‍ය භාණ්ඩය';
          const wantQty = post.exchangeWantQuantity || '1ක්';

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
                      <span>පරිත්‍යාගයකි (Donation)</span>
                    </>
                  ) : effectivePurpose === 'giveaway' ? (
                    <>
                      <PackageOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>ඉවත් කිරීමට නියමිතයි (Giveaway)</span>
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>හුවමාරු කිරීමට (Exchange)</span>
                    </>
                  )}
                </span>

                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-white/90 dark:bg-black/40 border border-purple-200 dark:border-purple-900 text-purple-800 dark:text-purple-300 font-mono">
                  🎁 මගෙන් ඔබට
                </span>
              </div>

              {/* Exact Display Format for Donation, Giveaway, or Exchange */}
              <div className="p-3.5 bg-white/95 dark:bg-[#07180f] rounded-xl border border-purple-200 dark:border-purple-900/70 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed space-y-2.5 shadow-xs">
                {effectivePurpose === 'donation' ? (
                  <p>
                    <strong className="text-purple-700 dark:text-purple-300 font-black">{itemTitle}</strong>{' '}
                    <span>{qty} ක් පරිත්‍යාග කිරීමට නියමිතයි. </span>
                    <span className="text-slate-800 dark:text-slate-200">{rec} හෝ වටිනා පුද්ගලයෙක් වේනම් </span>
                    <span className="font-extrabold text-purple-800 dark:text-purple-300">{dateVal} සිට </span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{delivery}.</span>
                  </p>
                ) : effectivePurpose === 'giveaway' ? (
                  <p>
                    <strong className="text-amber-700 dark:text-amber-300 font-black">{itemTitle}</strong>{' '}
                    <span>{qty} ක් ඉවත් කිරීමට නියමිතයි. </span>
                    <span className="text-slate-800 dark:text-slate-200">{rec} හෝ වටිනා පුද්ගලයෙක් වේනම් </span>
                    <span className="font-extrabold text-amber-800 dark:text-amber-300">{dateVal} සිට </span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{delivery}.</span>
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 flex-wrap">
                    <ArrowLeftRight className="w-4 h-4 text-emerald-600 inline shrink-0" />
                    <span><strong className="text-emerald-700 dark:text-emerald-300 font-black">{haveItem}</strong> ({haveQty}) ක් </span>
                    <span><strong className="text-purple-700 dark:text-purple-300 font-black">{wantItem}</strong> ({wantQty}) කට හුවමාරු කිරීමට අවශ්‍යයි.</span>
                  </p>
                )}

                {/* Detailed metadata */}
                <div className="pt-2 border-t border-purple-100 dark:border-purple-950/80 space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                  <p className="flex items-start gap-1.5">
                    <span className="font-extrabold text-purple-900 dark:text-purple-300 shrink-0">ස්ථානය :-</span>
                    <span className="font-semibold">
                      {post.saveLocationConsent === false 
                        ? 'පෞද්ගලිකව දැනුම්දෙනු ලැබේ' 
                        : hasContactPermission 
                        ? getVillageOrTownDisplay(locName) 
                        : `${getVillageOrTownDisplay(locName).split(',')[0]} (🔒 නිශ්චිත ලිපිනය ආරක්ෂිතයි)`}
                    </span>
                  </p>

                  {hasContactPermission && whatsapp ? (
                    <p className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-purple-900 dark:text-purple-300 shrink-0">මා සම්බන්ධ කරගැනීමට:</span>
                      <a
                        href={`https://wa.me/${whatsappFormatted}?text=${encodeURIComponent(
                          `හලෝ, ඔබ සහය සේවා (Sahaya Sewa) හරහා පළකල #${post.postCode} ${
                            effectivePurpose === 'donation' ? 'පරිත්‍යාගය' : effectivePurpose === 'giveaway' ? 'ඉවත් කිරීමේ දැන්වීම' : 'භාණ්ඩ හුවමාරුව'
                          } සම්බන්ධවයි:`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-all cursor-pointer shadow-xs active:scale-95"
                        title="කෙලින්ම WhatsApp විවෘත කරන්න"
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
                      <span className="font-extrabold text-purple-900 dark:text-purple-300 shrink-0">සම්බන්ධ වීමට:</span>
                      <span className="font-medium">🔒 දුරකථන අංක ආරක්ෂිතයි — පහත 'අපගේ Chat' බොත්තම මඟින් පණිවිඩයක් එවන්න</span>
                    </p>
                  )}

                  {details && details.trim() !== '' && (
                    <p className="flex items-start gap-1.5">
                      <span className="font-extrabold text-purple-900 dark:text-purple-300 shrink-0">වැඩි විස්තර:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{details}</span>
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
                  title="සහය සේවා සංවාද පද්ධතිය (In-App Chat)"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-200 shrink-0" />
                  <span>අපගේ Chat</span>
                </button>

                {/* 2. WhatsApp බොත්තම */}
                {hasContactPermission && whatsapp ? (
                  <a
                    href={`https://wa.me/${whatsappFormatted}?text=${encodeURIComponent(
                      `හලෝ, ඔබ සහය සේවා (Sahaya Sewa) හරහා පළකල #${post.postCode} ${
                        effectivePurpose === 'donation' ? 'පරිත්‍යාගය' : effectivePurpose === 'giveaway' ? 'ඉවත් කිරීමේ දැන්වීම' : 'භාණ්ඩ හුවමාරුව'
                      } සම්බන්ධවයි:`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer border border-emerald-400/40"
                    title="කෙලින්ම WhatsApp විවෘත කරන්න"
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
                    title="වංචනික ක්‍රියා වැළැක්වීමේ ආරක්ෂාව: අවසරය ඉල්ලීමට Chat කරන්න"
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
                    <span>ඇමතුමක්</span>
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
                    title="වංචනික ක්‍රියා වැළැක්වීමේ ආරක්ෂාව: ඇමතුම් ලබාගැනීමට Chat මඟින් අවසර ඉල්ලන්න"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>ඇමතුම් (🔒)</span>
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
                    <span>Map මාර්ගය</span>
                  </a>
                ) : (
                  <div
                    className="py-2.5 px-2 bg-slate-100 dark:bg-[#0d2218] text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-800 text-center"
                  >
                    <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>🔒 ලිපිනය ආරක්ෂිතයි</span>
                  </div>
                )}
              </div>

            </div>
          );
        })() : (
          /* STANDARD QUICK SERVICES / GENERAL SERVICES VIEW */
          <>
            {/* 6. සිදුවී ඇති දේ (What Happened) */}
            <div className="space-y-0.5">
              <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                සිදුවී ඇති දේ:
              </div>
              <p className="text-sm sm:text-[15px] font-medium text-slate-900 dark:text-slate-100 leading-snug">
                {safeWhatHappened}
              </p>
            </div>

            {/* 7. වියයුතු දේ (What is Needed) */}
            <div className="space-y-0.5">
              <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                වියයුතු දේ:
              </div>
              <p className="text-sm sm:text-[15px] font-medium text-slate-900 dark:text-slate-100 leading-snug">
                {safeWhatIsNeeded}
              </p>
            </div>

            {/* 8. කොන්දේසි (Conditions) */}
            <div className="space-y-0.5">
              <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                කොන්දේසි:
              </div>
              <p className="text-sm sm:text-[15px] font-medium text-slate-800 dark:text-slate-200 leading-snug">
                {safeConditions}
              </p>
            </div>

            {/* 9. විශේෂ දැනුවත් කිරීම (Special Notice) */}
            <div className="space-y-0.5">
              <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                විශේෂ දැනුවත් කිරීම:
              </div>
              <p className="text-sm sm:text-[15px] font-medium text-slate-800 dark:text-slate-200 leading-snug">
                {safeSpecialNotice}
              </p>
            </div>

            {/* 10. ගමනාගමනය (Transport) */}
            <div className="space-y-0.5">
              <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                ගමනාගමනය:
              </div>
              <p className="text-sm sm:text-[15px] font-medium text-slate-900 dark:text-slate-100 leading-snug">
                {post.transport || 'ඔබ පැමිණිය යුතුයි'}
              </p>
            </div>

            {/* 11. ගෙවීම් (Payment/Fee) */}
            <div className="space-y-0.5">
              <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                ගෙවීම් :
              </div>
              <p className="text-sm sm:text-[15px] font-medium text-slate-900 dark:text-slate-100 leading-snug">
                {post.payment || 'ඔබගේ ගාස්තුවට මම එකඟ වෙමි (I agree to your fee),'}
              </p>
            </div>

            {/* 12. සහයකයන් ගණන */}
            <div className="text-sm sm:text-[15px] pt-0.5">
              <span className="font-extrabold text-slate-900 dark:text-slate-100">අවශ්‍ය සහායකයින් ගණන: </span>
              <span className="font-extrabold text-emerald-800 dark:text-emerald-300">
                {helpersCount}
              </span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100"> කි.</span>
            </div>
          </>
        )}

        {/* Dedicated Confirmed Helper Details Card for Post Owner */}
        {ownerCheck && isConfirmed && (
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-[#071d12] dark:to-[#092216] border-2 border-emerald-500/70 dark:border-emerald-600/70 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>සනාථ කළ සහායකයාගේ තොරතුරු:</span>
              </span>
              <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                තහවුරු කර ඇත
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {confirmedHelperName || 'තහවුරු කළ සහායක'}
                </p>
                {confirmedHelperPhone ? (
                  <p className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{confirmedHelperPhone}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500">දුරකථන අංකය සටහන් කර නොමැත</p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {confirmedHelperPhone && (
                  <a
                    href={`tel:${confirmedHelperPhone.replace(/\D/g, '')}`}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer"
                    title="සෘජු ඇමතුමක් ලබාගන්න"
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
                    title="WhatsApp පණිවිඩයක්"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onOpenChat && onOpenChat(post)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer"
                  title="චැට් කරන්න"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Owner Interested Responders ("කැමැත්ත දැක්වූවන්") Indicator */}
        {ownerCheck && !isConfirmed && (
          <div className="space-y-2 pt-1">
            {post.replies && post.replies.length > 0 ? (
              <div 
                onClick={() => {
                  if (onOpenSupportOffers) {
                    onOpenSupportOffers(post);
                  } else if (onOpenChat) {
                    onOpenChat(post);
                  }
                }}
                className="w-full p-3 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-emerald-500/15 dark:from-amber-500/25 dark:via-orange-500/25 dark:to-emerald-500/25 border-2 border-orange-500/60 dark:border-orange-400/60 rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer group active:scale-[0.99] relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow">
                        <HeartHandshake className="w-4 h-4" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border border-white" />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          කැමැත්ත දැක්වූවන්:
                        </span>
                        <span className="bg-orange-600 text-white text-[11px] font-black px-2 py-0.2 rounded-full font-mono shadow-xs">
                          {post.replies?.length || 0} දෙනෙක්
                        </span>
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-md border border-emerald-300 dark:border-emerald-700">
                          ✨ නව
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate max-w-[260px] sm:max-w-xs mt-0.5">
                        <span className="text-orange-600 dark:text-orange-400 font-bold">පුද්ගලයා: </span>
                        {(post.replies || []).map((r) => r?.responderName || 'සහායක').slice(0, 3).join(', ')}
                        {(post.replies?.length || 0) > 3 ? ` තවත් ${(post.replies?.length || 0) - 3} ක්...` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-2.5 py-1.5 rounded-xl bg-orange-600 group-hover:bg-orange-500 text-white font-black text-[11px] flex items-center gap-1 shadow-xs transition-colors shrink-0"
                  >
                    <span>බලන්න</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => onOpenSupportOffers && onOpenSupportOffers(post)}
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0b1b12] border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#0f2419] transition-all"
              >
                <span className="flex items-center gap-1.5 font-bold">
                  <HeartHandshake className="w-4 h-4 text-slate-400" />
                  <span>කැමැත්ත දැක්වූවන් (0)</span>
                </span>
                <span className="text-[11px] font-medium">තවම කිසිවෙකු කැමැත්ත දක්වා නැත</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons: Owner vs Admin vs Non-Owner */}
        {ownerCheck ? (
          <div className="pt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (onOpenSupportOffers) {
                  onOpenSupportOffers(post);
                } else if (onOpenChat) {
                  onOpenChat(post);
                }
              }}
              className="flex-1 min-w-[75px] py-2.5 px-2 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-extrabold text-[11px] shadow-md transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer border border-orange-400/40"
              title="කැමැත්ත දැක්වූ පුද්ගලයින්ගේ ලැයිස්තුව"
            >
              <HeartHandshake className="w-3.5 h-3.5 shrink-0" />
              <span className="text-center">{isConfirmed ? 'සහායකයා' : `කැමැත්ත (${post.replies?.length || 0})`}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenChat && onOpenChat(post)}
              className="flex-1 min-w-[65px] py-2.5 px-2 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-extrabold text-[11px] shadow-md transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer border border-teal-400/40"
              title="සංවාද ඉතිහාසය (Chat History)"
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Chat</span>
            </button>

            <button
              type="button"
              onClick={() => onEditPost && onEditPost(post)}
              className="flex-1 min-w-[65px] py-2.5 px-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-[11px] shadow-md transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer border border-emerald-400/40"
              title="තොරතුරු වෙනස් කිරීම"
            >
              <Pencil className="w-3.5 h-3.5 shrink-0" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => onViewPost && onViewPost(post)}
              className="flex-1 min-w-[65px] py-2.5 px-2 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-extrabold text-[11px] shadow-md transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer border border-sky-400/40"
              title="ප්‍රදර්ශනය වන ආකාරය"
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span>View</span>
            </button>

            <button
              type="button"
              onClick={() => onDeletePost && onDeletePost(post)}
              className="flex-1 min-w-[65px] py-2.5 px-2 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-[11px] shadow-md transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer border border-rose-400/40"
              title="දැන්වීම මකා දැමීම"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Delete</span>
            </button>
          </div>
        ) : isAdmin ? (
          <div className="pt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenChat && onOpenChat(post)}
                className="flex-1 min-w-[70px] py-2 px-2 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-extrabold text-[11px] shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer border border-teal-400/40"
                title="සංවාද ඉතිහාසය (Chat History)"
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>Chat</span>
              </button>

              <button
                type="button"
                onClick={() => onEditPost && onEditPost(post)}
                className="flex-1 min-w-[70px] py-2 px-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-[11px] shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer border border-emerald-400/40"
                title="තොරතුරු වෙනස් කිරීම (Admin Edit)"
              >
                <Pencil className="w-3.5 h-3.5 shrink-0" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => onViewPost && onViewPost(post)}
                className="flex-1 min-w-[70px] py-2 px-2 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-extrabold text-[11px] shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer border border-sky-400/40"
                title="ප්‍රදර්ශනය වන ආකාරය"
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span>View</span>
              </button>

              <button
                type="button"
                onClick={() => onDeletePost && onDeletePost(post)}
                className="flex-1 min-w-[90px] py-2 px-2 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-[11px] shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer border border-rose-400/40"
                title="පරිපාලක විසින් දැන්වීම ඉවත් කරන්න"
              >
                <Trash2 className="w-3.5 h-3.5 text-white shrink-0" />
                <span>Delete</span>
              </button>
            </div>

            <button
              onClick={() => onOfferSupport(post)}
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/40"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>සහාය වීමට පිළිතුරු යවන්න / පරීක්ෂා කරන්න</span>
            </button>
          </div>
        ) : (
          <div className="pt-3 flex flex-wrap items-center gap-3">
            {isConfirmed && (
              <div className="relative flex items-center gap-2.5 shrink-0">
                {/* Inbox-style dark green bubble */}
                <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#006e43] via-[#008753] to-emerald-400 text-white shadow-[0_6px_20px_rgba(0,122,75,0.4)] border-2 border-white dark:border-emerald-300 shrink-0 animate-bounce" title="සහය සනාථ කර ඇත">
                  <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-sm" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-300 text-emerald-950 font-black text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow">✓</span>
                </div>
                {/* Confirmation message bubble */}
                <div className="px-3.5 py-2 bg-[#005a37] dark:bg-emerald-950 text-white text-xs sm:text-sm font-extrabold rounded-2xl shadow-md border border-emerald-400/60 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                  <span>සහය සනාථ කර ඇත</span>
                </div>
              </div>
            )}
            <button
              onClick={() => onOfferSupport(post)}
              className="flex-1 min-w-[200px] py-3 sm:py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-950/20 hover:shadow-emerald-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/40"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="font-extrabold">{isConfirmed ? 'අමතර සහය හෝ විමසීම්' : 'සහාය වීමට පිළිතුරු යවන්න'}</span>
            </button>
          </div>
        )}

      </div>

    </Card3D>
  );
};

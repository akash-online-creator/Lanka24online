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
  Pencil
} from 'lucide-react';
import { HelpPost, Language, LocationOption, User as UserType } from '../types';
import { calculateMotorcycleRoadDistance } from '../utils/geoUtils';
import { inspectAndSanitizeMessage } from '../utils/policyGuard';

interface QuickServiceDetailModalProps {
  post: HelpPost | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: (post: HelpPost) => void;
  onOpenConfirm: (post: HelpPost) => void;
  onDeletePost?: (post: HelpPost) => void;
  onEditPost?: (post: HelpPost) => void;
  lang: Language;
  currentLocation?: LocationOption;
  currentUser?: UserType;
}

export const QuickServiceDetailModal: React.FC<QuickServiceDetailModalProps> = ({
  post,
  isOpen,
  onClose,
  onOpenChat,
  onOpenConfirm,
  onDeletePost,
  onEditPost,
  currentLocation,
  currentUser,
}) => {
  if (!isOpen || !post) return null;

  const isAdmin = currentUser?.role === 'admin';
  const normalizePhone = (phone?: string) => (phone ? phone.replace(/[^0-9]/g, '') : '');
  const isOwner = Boolean(
    currentUser && (
      (currentUser.userId && post.userId && (currentUser.userId === post.userId || currentUser.id === post.userId)) ||
      (currentUser.phone && post.userPhone && normalizePhone(currentUser.phone) === normalizePhone(post.userPhone)) ||
      (currentUser.name && post.userName && currentUser.name.trim().toLowerCase() === post.userName.trim().toLowerCase())
    )
  );

  // Calculate accurate Motorcycle Road Distance
  const viewerLat = currentLocation?.lat || 7.1710;
  const viewerLng = currentLocation?.lng || 79.8986;
  const viewerLocName = currentLocation?.nameSi || 'ඔබ සිටින ස්ථානය (නරඹන්නා)';

  const postLat = post.lat || 7.1710;
  const postLng = post.lng || 79.8986;
  const postLocName = post.locationName || 'දැන්වීම පළකළ ස්ථානය';

  const motorcycleRoute = calculateMotorcycleRoadDistance(
    postLat,
    postLng,
    viewerLat,
    viewerLng,
    postLocName,
    viewerLocName
  );

  const displayPostCode = post.postCode.startsWith('#') ? post.postCode : `#${post.postCode}`;
  const helpersCount = post.helpersNeeded || post.helpersCount || 1;

  const isConfirmed = Boolean(post.isConfirmed);

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

  const safeWhatHappened = !isConfirmed ? inspectAndSanitizeMessage(post.whatHappened, false).sanitizedText : post.whatHappened;
  const safeWhatIsNeeded = !isConfirmed ? inspectAndSanitizeMessage(post.whatIsNeeded, false).sanitizedText : post.whatIsNeeded;
  const safeConditions = !isConfirmed ? inspectAndSanitizeMessage(displayConditions, false).sanitizedText : displayConditions;
  const safeSpecialNotice = !isConfirmed ? inspectAndSanitizeMessage(displaySpecialNotice, false).sanitizedText : displaySpecialNotice;
  const safeLocationDisplay = isConfirmed 
    ? postLocName 
    : (postLocName ? `${postLocName.split(',')[0]} (🔒 නිශ්චිත ලිපිනය තහවුරු කළ පසු)` : 'ප්‍රදේශය (🔒 තහවුරු කළ පසු ලිපිනය දිස්වේ)');

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
              {post.category === 'find_for_me' ? 'සොයාදෙන්න දැන්වීම් විස්තරය' : 'ක්ෂණික සේවා විස්තරය'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && onDeletePost && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`ඔබට පරිපාලක (Admin) ලෙස #${post.postCode} දැන්වීම පද්ධතියෙන් ඉවත් කිරීමට අවශ්‍යද?`)) {
                    onDeletePost(post);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer border border-rose-400/40"
                title="පරිපාලක මඟින් ඉවත් කරන්න (Admin Delete)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Admin Delete</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-emerald-100/80 dark:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 hover:text-emerald-900 dark:hover:text-emerald-100 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-center font-bold transition-all cursor-pointer"
              title="වසන්න"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="bg-white dark:bg-[#071710] border border-emerald-200/90 dark:border-emerald-900/70 rounded-2xl p-4 sm:p-5 space-y-3.5 text-sm overflow-y-auto shadow-sm">
          
          {/* Hi Greeting & User info */}
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-emerald-100 dark:border-emerald-950/80">
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/50 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
              <span>Hi, මම</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-black">{post.userName}</span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>ගිණුම් හිමියා</span>
              </span>
            </div>
          </div>

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
              /* DEDICATED FIND FOR ME PRESENTATION IN DETAIL MODAL */
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
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
                    <span className="inline-flex items-center gap-1 text-xs font-black text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/90 px-3 py-1 rounded-xl border border-amber-300 dark:border-amber-600">
                      <Gift className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>තෑග්ගක් සහිතයි</span>
                    </span>
                  )}
                </div>

                {(effectiveType === 'lost' || effectiveType === 'stolen') && (
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-[#071d12] rounded-2xl border border-emerald-300/80 dark:border-emerald-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed space-y-2">
                    <p>
                      {effectiveIncidentDate ? `${effectiveIncidentDate} දින, ` : ''}
                      {effectiveIncidentTime ? `${effectiveIncidentTime} පමණ, ` : ''}
                      {effectiveIncidentLocation ? `${effectiveIncidentLocation} දී, ` : ''}
                      <strong className="text-emerald-700 dark:text-emerald-300 font-black">
                        {effectiveItemName}
                      </strong>{' '}
                      {effectiveType === 'lost' ? 'නැතිවී ඇත,' : 'සොරාගෙන ඇත,'} සොයාගත් කෙනෙක් වේනම්{' '}
                      <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">
                        {effectiveContactPhone}
                        {effectiveContactWhatsapp && effectiveContactWhatsapp !== effectiveContactPhone ? ` හෝ ${effectiveContactWhatsapp}` : ''}
                      </span>{' '}
                      හරහා මා සම්බන්ධකරගන්න.
                    </p>
                    <p className="text-slate-800 dark:text-slate-200">
                      නැතිනම්{' '}
                      <span className="font-extrabold text-emerald-800 dark:text-emerald-300">
                        {effectiveContactAddress}
                      </span>{' '}
                      ට එවන්න. නිවැරදි ස්ථානය:{' '}
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {effectiveLocationName}
                      </span>
                    </p>

                    {/* Identifying info on item (Phone, NIC, Reg/Serial No, or Name) */}
                    {post.identifyingInfo && post.identifyingInfo.trim() !== '' && (
                      <div className="mt-2 p-3 bg-amber-500/10 dark:bg-amber-950/40 rounded-xl border-2 border-amber-400/70 dark:border-amber-700/70 text-xs text-amber-950 dark:text-amber-100 shadow-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-black text-amber-900 dark:text-amber-300">
                          <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>නැති වූ දේ ඇති දුරකථන අංකය / හැඳුනුම්පත් අංකය / සලකුණු / නම:</span>
                        </div>
                        <p className="font-extrabold text-sm pl-5 text-slate-900 dark:text-white bg-white/70 dark:bg-black/30 py-1.5 px-3 rounded-lg border border-amber-200 dark:border-amber-900/50">
                          {post.identifyingInfo}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {effectiveType === 'find' && (
                  <div className="space-y-2.5">
                    <div className="p-3.5 bg-emerald-50/60 dark:bg-[#071d12] rounded-2xl border border-emerald-300/80 dark:border-emerald-800 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed space-y-1.5">
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

                    {/* Contact & Location Info */}
                    <div className="p-3 bg-white dark:bg-[#082014] rounded-2xl border border-emerald-200 dark:border-emerald-900 text-xs space-y-1.5">
                      <strong className="text-emerald-900 dark:text-emerald-300 font-black block pb-1 border-b border-emerald-200/80 dark:border-emerald-900/50">
                        ස්ථානය හා සම්බන්ධකරගතහැකි තොරතුරු:
                      </strong>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 font-semibold">
                        <div>
                          <span className="text-slate-500">දුරකථන: </span>
                          <strong className="text-slate-900 dark:text-white">{effectiveContactPhone}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">WhatsApp: </span>
                          <strong className="text-slate-900 dark:text-white">{effectiveContactWhatsapp}</strong>
                        </div>
                        {effectiveContactAddress && (
                          <div className="sm:col-span-2">
                            <span className="text-slate-500">ගෙදර ලිපිනය: </span>
                            <strong className="text-slate-900 dark:text-white">{effectiveContactAddress}</strong>
                          </div>
                        )}
                        <div className="sm:col-span-2">
                          <span className="text-slate-500">නිවැරදි ස්ථානය: </span>
                          <strong className="text-slate-900 dark:text-white">{effectiveLocationName}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Delivery / Transaction Method */}
                    <div className="p-3 bg-emerald-100/60 dark:bg-[#0a2719] rounded-2xl border border-emerald-300 text-xs space-y-1">
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

                {/* Other details */}
                {effectiveOtherDetails && effectiveOtherDetails.trim() !== '' && (
                  <div className="p-3 bg-slate-50 dark:bg-[#081e14] rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                    <strong className="text-emerald-900 dark:text-emerald-300 font-black block mb-0.5">
                      වැඩි විස්තර:
                    </strong>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{effectiveOtherDetails}</p>
                  </div>
                )}

                {/* Reward (Only shown if hasReward) */}
                {showReward && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/80 rounded-2xl text-amber-900 dark:text-amber-200 font-extrabold text-xs flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      <strong>සොයාදෙන්නාහට මගෙන්:</strong> {post.rewardDetails}
                    </span>
                  </div>
                )}

                {/* Direct Instant Action chips */}
                <div className="pt-2 grid grid-cols-2 gap-2">
                  {effectiveContactPhone && (
                    <a
                      href={`tel:${effectiveContactPhone.replace(/\D/g, '')}`}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>ඇමතුමක් ගන්න</span>
                    </a>
                  )}

                  {effectiveContactWhatsapp && (
                    <a
                      href={`https://wa.me/${effectiveContactWhatsapp.replace(/^0/, '94').replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })() : (
            /* STANDARD QUICK SERVICES VIEW */
            <>
              {/* 1. සිදුවී ඇති දේ (What Happened) */}
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl space-y-0.5">
                <span className="font-extrabold text-xs text-emerald-900 dark:text-emerald-300 block">
                  සිදුවී ඇති දේ:
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {safeWhatHappened}
                </p>
              </div>

              {/* 2. වියයුතු දේ (What is Needed) */}
              <div className="p-3 bg-white dark:bg-[#0b2419]/70 border border-emerald-300/80 dark:border-emerald-700/60 rounded-xl space-y-0.5 shadow-sm">
                <span className="font-extrabold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  වියයුතු දේ:
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {safeWhatIsNeeded}
                </p>
              </div>
            </>
          )}

          {/* 🏍️ ACCURATE MOTORCYCLE ROAD ROUTE & DISTANCE CARD (White & Emerald Styled) */}
          <div className="p-3.5 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white dark:from-[#092217] dark:via-[#05180f] dark:to-[#092217] border-2 border-emerald-500/50 dark:border-emerald-600/50 rounded-2xl space-y-2.5 shadow-sm">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-black text-xs text-emerald-800 dark:text-emerald-300">
                <span className="text-sm">🏍️</span>
                <span>මෝටර් සයිකලයෙන් මාර්ග දුර (Motorcycle Road Distance)</span>
              </div>
              <span className="text-[10px] font-mono font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-lg shadow-sm">
                ~{motorcycleRoute.formattedTime}
              </span>
            </div>

            {/* Two Locations Comparison */}
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="p-2.5 bg-white dark:bg-[#071a12] rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 flex items-center gap-2.5 shadow-sm">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] text-rose-600 dark:text-rose-400 font-extrabold block">දැන්වීම පළකළ ස්ථානය:</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold truncate block">{safeLocationDisplay}</span>
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-[#071a12] rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 flex items-center gap-2.5 shadow-sm">
                <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] text-emerald-700 dark:text-emerald-300 font-extrabold block">ඔබ සිටින ස්ථානය (නරඹන්නා):</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold truncate block">{viewerLocName}</span>
                </div>
              </div>
            </div>

            {/* Distance & Travel Time readout */}
            <div className="p-2.5 bg-white/95 dark:bg-[#081e14] rounded-xl border border-emerald-300 dark:border-emerald-800/70 flex items-center justify-between text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-emerald-700 dark:text-emerald-300">
                  {motorcycleRoute.formattedRoadDistance}
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">(මෝටර් සයිකල් මාර්ගය)</span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 text-[11px] font-bold">
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>ගමන් කාලය: <strong className="text-emerald-700 dark:text-emerald-300 font-black">~{motorcycleRoute.formattedTime}</strong></span>
              </div>
            </div>

            {/* Direct Google Maps Directions link / Privacy Lock */}
            {post.isConfirmed || post.category === 'find_for_me' ? (
              <a
                href={motorcycleRoute.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>🏍️ Google Maps මෝටර් සයිකල් මාර්ගය (Directions) විවෘත කරන්න</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <div className="w-full py-2 px-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center justify-center gap-2 shadow-xs">
                <span>🔒 සහය CONFIRM කළ පසු Google Maps මාර්ගය හා නිශ්චිත ලිපිනය විවෘත වේ</span>
              </div>
            )}

          </div>

          {post.category !== 'find_for_me' && (
            <>
              {/* 3. කොන්දේසි (Conditions) */}
              <div className="p-2.5 bg-emerald-50/50 dark:bg-[#071a12] rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 text-xs space-y-0.5">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  කොන්දේසි:
                </span>
                <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                  {safeConditions}
                </p>
              </div>

              {/* 4. විශේෂ දැනුවත් කිරීම (Special Notice) */}
              <div className="p-2.5 bg-emerald-50/50 dark:bg-[#071a12] rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 text-xs space-y-0.5">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  විශේෂ දැනුවත් කිරීම:
                </span>
                <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                  {safeSpecialNotice}
                </p>
              </div>

              {/* 5. අවශ්‍ය සහායකයින් ගණන (Helpers Count - No underscores!) */}
              <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 pt-0.5">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>අවශ්‍ය සහායකයින් ගණන: </span>
                <span className="text-emerald-700 dark:text-emerald-300 font-black text-sm sm:text-base">
                  {helpersCount}
                </span>
                <span> කි.</span>
              </div>

              {/* 6. ගමනාගමනය (Transport) */}
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                <Car className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>ගමනාගමනය: <span className="font-extrabold text-slate-900 dark:text-slate-100">{post.transport || 'ඔබ පැමිණිය යුතුයි'}</span></span>
              </div>

              {/* 7. ගෙවීම් (Payment) */}
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-950/60 p-3 rounded-xl border border-emerald-300/80 dark:border-emerald-700/60 shadow-sm">
                <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>ගෙවීම් : <span className="font-black text-slate-900 dark:text-white">{post.payment || 'ඔබගේ ගාස්තුවට මම එකඟ වෙමි (I agree to your fee),'}</span></span>
              </div>

              {/* 8. උදව් කරන්න Prompt */}
              <p className="text-center text-emerald-700 dark:text-emerald-400 font-black pt-1 text-base sm:text-lg tracking-wide">
                උදව් කරන්න.
              </p>
            </>
          )}

        </div>

        {/* Bottom Action Buttons: CHAT and CONFIRM */}
        <div className="grid grid-cols-2 gap-3 pt-4 shrink-0">
          <button
            onClick={() => onOpenChat(post)}
            className="py-3 sm:py-3.5 px-4 rounded-2xl bg-white dark:bg-[#071a12] hover:bg-emerald-50 dark:hover:bg-[#0d2a1b] text-emerald-700 dark:text-emerald-300 font-black text-sm border-2 border-emerald-500/70 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>CHAT</span>
          </button>

          {isConfirmed ? (
            <div className="py-3 sm:py-3.5 px-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm text-center">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>දැනටමත් සනාථ කර ඇත</span>
            </div>
          ) : isOwner ? (
            onEditPost ? (
              <button
                onClick={() => {
                  onClose();
                  onEditPost(post);
                }}
                className="py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] hover:from-emerald-700 hover:to-[#006e43] text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border border-emerald-400/40"
              >
                <Pencil className="w-4 h-4" />
                <span>සංස්කරණය (EDIT)</span>
              </button>
            ) : (
              <div className="py-3 sm:py-3.5 px-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 font-bold text-xs flex items-center justify-center text-center">
                <span>ඔබගේ දැන්වීමකි (Confirm කළ නොහැක)</span>
              </div>
            )
          ) : (
            <button
              onClick={() => onOpenConfirm(post)}
              className="py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-[0_4px_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border border-emerald-400/40"
            >
              <CheckCircle className="w-4 h-4 text-white" />
              <span>CONFIRM</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};



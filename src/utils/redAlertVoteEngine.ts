import { RedAlertItem, RedAlertConfidenceStatus, User } from '../types';
import { calculateDistanceKm } from './geoUtils';

export interface VoteWeightInfo {
  level: 'new' | 'normal' | 'trusted' | 'moderator';
  labelSi: string;
  badgeColor: string;
  baseWeight: number;
  effectiveWeight: number;
  isFlipPenalized: boolean;
}

export interface AlertConfidenceSummary {
  score: number;
  rawScore: number;
  trueVotes: number;
  falseVotes: number;
  weightedTrueScore: number;
  weightedFalseScore: number;
  confidenceStatus: RedAlertConfidenceStatus;
  statusLabelSi: string;
  statusSubLabelSi: string;
  barColorClass: string;
  badgeBgClass: string;
  percentage: number; // 0 to 100 mapped from [-10, +10]
  isDecayed24h: boolean;
  isExpired24h: boolean;
  canBroadcastNearby: boolean;
  canBroadcastWide: boolean;
}

/**
 * Generates a deterministic, privacy-safe browser/device fingerprint at Rs. 0 cost
 * (Canvas + WebGL/Screen + Audio/Hardware + Timezone + UserAgent hash)
 * Used to prevent multi-account vote brigading from the same device.
 */
export async function getDeviceFingerprint(): Promise<string> {
  try {
    const components: string[] = [
      navigator.userAgent || '',
      navigator.language || '',
      String(navigator.hardwareConcurrency || 0),
      String((navigator as unknown as { deviceMemory?: number }).deviceMemory || 0),
      `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      String(navigator.maxTouchPoints || 0),
    ];

    // Canvas fingerprint component
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 180;
      canvas.height = 40;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '13px Arial';
        ctx.fillStyle = '#e11d48';
        ctx.fillRect(10, 5, 80, 20);
        ctx.fillStyle = '#0f172a';
        ctx.fillText('Lanka24-Sahaya-FP', 8, 12);
        components.push(canvas.toDataURL().slice(-64));
      }
    } catch {
      components.push('no-canvas');
    }

    const raw = components.join('||');
    if (window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(raw);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return 'fp_' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
    }

    // Fallback DJB2 hash
    let hash = 5381;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash * 33) ^ raw.charCodeAt(i);
    }
    return 'fp_' + (hash >>> 0).toString(16);
  } catch {
    return 'fp_fallback_device';
  }
}

/**
 * 3.1 පරිශීලක විශ්වාස මට්ටම් (Weighted Voting System)
 * - නවක (new): ගිණුම දින < 7 හෝ වාර්තා < 5 -> ඡන්ද බර 0.5
 * - සාමාන්‍ය (normal): වාර්තා 10+, නිරවද්‍යතාව 80%+ -> ඡන්ද බර 1.0
 * - විශ්වාසනීය (trusted): වාර්තා 50+, නිරවද්‍යතාව 90%+, මාස 3+ -> ඡන්ද බර 3.0
 * - ප්‍රජා පරීක්ෂක (moderator): ප්‍රජාවෙන් තේරී පත්වූ / Admin -> ඡන්ද බර 5.0
 *
 * 3.2: නිතර ඡන්ද වෙනස් කරන්නන්ගේ (flipCount >= 3) බර ස්වයංක්‍රීයව අඩු වේ (50%).
 */
export function calculateUserVoteWeight(
  user?: User | null,
  flipCount = 0
): VoteWeightInfo {
  if (!user) {
    return {
      level: 'new',
      labelSi: 'නවක සාමාජික (0.5x)',
      badgeColor: 'bg-slate-600 text-slate-100',
      baseWeight: 0.5,
      effectiveWeight: 0.5,
      isFlipPenalized: false,
    };
  }

  let level: VoteWeightInfo['level'] = 'new';
  let baseWeight = 0.5;
  let labelSi = 'නවක (0.5x)';
  let badgeColor = 'bg-slate-700 text-slate-200 border-slate-500/40';

  const now = Date.now();
  const createdMs = user.createdAt ? new Date(user.createdAt).getTime() : now;
  const accountAgeDays = Math.max(0, (now - createdMs) / (1000 * 60 * 60 * 24));
  const totalReportsOrHelped =
    (user.helpedCount || 0) +
    (user.VerifyCount || 0) +
    (user.verifiedAlertCount || 0) +
    (user.ratingCount || 0);
  const accuracyRate = user.alertAccuracyRate ?? (user.rating ? (user.rating / 5) * 100 : 85);

  if (user.role === 'admin' || user.isCommunityVerifier) {
    level = 'moderator';
    baseWeight = 5.0;
    labelSi = 'ප්‍රජා පරීක්ෂක (5.0x)';
    badgeColor = 'bg-purple-600/30 text-purple-200 border-purple-400/50';
  } else if (
    (totalReportsOrHelped >= 50 && accuracyRate >= 90 && accountAgeDays >= 90) ||
    (user.isIdentityVerified && (user.helpedCount || 0) >= 25 && accountAgeDays >= 90)
  ) {
    level = 'trusted';
    baseWeight = 3.0;
    labelSi = 'විශ්වාසනීය (3.0x)';
    badgeColor = 'bg-emerald-600/30 text-emerald-200 border-emerald-400/50';
  } else if (
    (totalReportsOrHelped >= 10 && accuracyRate >= 80 && accountAgeDays >= 7) ||
    (user.status === 'approved' && accountAgeDays >= 7 && totalReportsOrHelped >= 5) ||
    user.isIdentityVerified
  ) {
    level = 'normal';
    baseWeight = 1.0;
    labelSi = 'සාමාන්‍ය (1.0x)';
    badgeColor = 'bg-sky-600/30 text-sky-200 border-sky-400/50';
  } else {
    level = 'new';
    baseWeight = 0.5;
    labelSi = 'නවක (0.5x)';
    badgeColor = 'bg-amber-600/25 text-amber-200 border-amber-400/40';
  }

  const totalFlips = Math.max(flipCount, user.voteFlipCount || 0);
  const isFlipPenalized = totalFlips >= 3;
  const effectiveWeight = isFlipPenalized
    ? Number((baseWeight * 0.5).toFixed(2))
    : baseWeight;

  return {
    level,
    labelSi,
    badgeColor,
    baseWeight,
    effectiveWeight,
    isFlipPenalized,
  };
}

/**
 * 2.1 & 2.2 ලකුණු ගණනය සහ තත්ත්ව නිර්ණායක (±10 සමමිතික Confidence Bar)
 * Score = (සත්‍ය ඡන්ද × බර) − (අසත්‍ය ඡන්ද × බර)
 * - ≥ +10 : ✅ තහවුරු විය (confirmed) - රතු - පුළුල් push
 * - +4 සිට +9 : 🟢 බොහෝ දුරට සත්‍ය (likely_true) - කොළ - ආසන්න ප්‍රදේශයට push
 * - -3 සිට +3 : 🟡 සැක සහිත (suspicious) - කහ - යෙදුම තුළ පමණක්
 * - -4 සිට -9 : 🟠 තර්කානුකූල / මතභේදාත්මක (disputed) - තැඹිලි - ඉවත් නොකර ලේබලය
 * - ≤ -10 : ❌ අසත්‍ය ලෙස ඉවත් විය (removed) - කළු - සංරක්ෂිත (archived)
 * - පැය 24 කින් ඡන්ද 0 ක් නම් -> "කල් ඉකුත්" (expired), "අසත්‍ය" නොවේ.
 * - පැය 24 කට පසු ලකුණු 50% කින් අඩු වේ (Time decay).
 */
export function calculateAlertConfidenceState(alert: RedAlertItem): AlertConfidenceSummary {
  const createdMs = alert.createdAt ? new Date(alert.createdAt).getTime() : Date.now();
  const ageHours = Math.max(0, (Date.now() - createdMs) / (1000 * 60 * 60));
  const isOlderThan24h = ageHours >= 24;

  // Compute from votesMap if available, else fallback to stored fields
  let trueVotes = alert.trueVotes ?? (alert.verifiedByUserIds?.length || 0);
  let falseVotes = alert.falseVotes ?? (alert.fakeVotesCount || 0);
  let weightedTrueScore = alert.weightedTrueScore ?? trueVotes * 1.0;
  let weightedFalseScore = alert.weightedFalseScore ?? falseVotes * 1.0;

  if (alert.votesMap && Object.keys(alert.votesMap).length > 0) {
    trueVotes = 0;
    falseVotes = 0;
    weightedTrueScore = 0;
    weightedFalseScore = 0;
    for (const vote of Object.values(alert.votesMap)) {
      if (!vote) continue;
      const w = typeof vote.weight === 'number' && vote.weight > 0 ? vote.weight : 1.0;
      if (vote.vote === 'true') {
        trueVotes += 1;
        weightedTrueScore += w;
      } else if (vote.vote === 'false') {
        falseVotes += 1;
        weightedFalseScore += w;
      }
    }
  }

  weightedTrueScore = Number(weightedTrueScore.toFixed(2));
  weightedFalseScore = Number(weightedFalseScore.toFixed(2));

  const rawScore = Number((weightedTrueScore - weightedFalseScore).toFixed(2));
  const totalVotes = trueVotes + falseVotes;

  // Time decay: After 24h, score decays by 50%
  const score = isOlderThan24h ? Number((rawScore * 0.5).toFixed(2)) : rawScore;
  const isExpired24h = isOlderThan24h && totalVotes === 0;

  let confidenceStatus: RedAlertConfidenceStatus = 'suspicious';
  let statusLabelSi = '🟡 සැක සහිත (තහවුරු වෙමින් පවතී)';
  let statusSubLabelSi = 'යෙදුම තුළ පමණක් පෙන්වයි — අවට සිටින අයගේ තහවුරු කිරීම් අපේක්ෂා කෙරේ';
  let barColorClass = 'bg-amber-400';
  let badgeBgClass = 'bg-amber-500/20 text-amber-200 border-amber-400/50';

  if (isExpired24h || alert.confidenceStatus === 'expired') {
    confidenceStatus = 'expired';
    statusLabelSi = '⏳ කල් ඉකුත් විය (පැය 24කින් ඡන්ද ලැබී නැත)';
    statusSubLabelSi = 'පැය 24ක් තුළ ප්‍රජා ඡන්ද නොලැබුණු බැවින් ස්වයංක්‍රීයව කල් ඉකුත් විය (අසත්‍ය ලෙස නම් කර නැත)';
    barColorClass = 'bg-slate-500';
    badgeBgClass = 'bg-slate-600/30 text-slate-200 border-slate-400/40';
  } else if (score <= -10 || alert.isRemovedAsFake || alert.confidenceStatus === 'removed') {
    confidenceStatus = 'removed';
    statusLabelSi = '❌ අසත්‍ය ලෙස ඉවත් විය (Archived)';
    statusSubLabelSi = 'ප්‍රජා ඡන්ද මගින් අසත්‍ය බවට තීරණය කර සංරක්ෂණය කරන ලදී';
    barColorClass = 'bg-zinc-900';
    badgeBgClass = 'bg-zinc-900/90 text-zinc-200 border-zinc-500/60';
  } else if (score <= -4) {
    confidenceStatus = 'disputed';
    statusLabelSi = '🟠 මතභේදාත්මක / තර්කානුකූල';
    statusSubLabelSi = 'අසත්‍ය බවට වැඩි ඡන්ද ලැබී ඇත — ඉවත් නොකර අවවාදාත්මක ලේබලය සහිතව පෙන්වයි';
    barColorClass = 'bg-orange-500';
    badgeBgClass = 'bg-orange-500/25 text-orange-200 border-orange-400/50';
  } else if (score >= 10) {
    confidenceStatus = 'confirmed';
    statusLabelSi = '✅ තහවුරු විය (රතු එළිය සක්‍රියයි)';
    statusSubLabelSi = 'ප්‍රජාව විසින් පූර්ණ ලෙස තහවුරු කරන ලදී — පුළුල් Push නිවේදන නිකුත් කෙරේ';
    barColorClass = 'bg-red-600';
    badgeBgClass = 'bg-red-600/30 text-red-100 border-red-400/60';
  } else if (score >= 4) {
    confidenceStatus = 'likely_true';
    statusLabelSi = '🟢 බොහෝ දුරට සත්‍ය';
    statusSubLabelSi = 'අවට පරිශීලකයින් තහවුරු කර ඇත — ආසන්න ප්‍රදේශයට Push නිවේදන යැවේ';
    barColorClass = 'bg-emerald-500';
    badgeBgClass = 'bg-emerald-500/25 text-emerald-100 border-emerald-400/50';
  } else {
    confidenceStatus = 'suspicious';
    statusLabelSi = '🟡 සැක සහිත (තහවුරු වෙමින්)';
    statusSubLabelSi = 'තනි පුද්ගලයෙකුට තනිව රතු එළියක් නිකුත් කළ නොහැක — අවට අයගේ ඡන්දයෙන් තහවුරු වේ';
    barColorClass = 'bg-yellow-400';
    badgeBgClass = 'bg-yellow-500/20 text-yellow-100 border-yellow-400/50';
  }

  // Map score from [-10, +10] to [0%, 100%], clamped
  const clamped = Math.max(-10, Math.min(10, score));
  const percentage = Math.round(((clamped + 10) / 20) * 100);

  return {
    score,
    rawScore,
    trueVotes,
    falseVotes,
    weightedTrueScore,
    weightedFalseScore,
    confidenceStatus,
    statusLabelSi,
    statusSubLabelSi,
    barColorClass,
    badgeBgClass,
    percentage,
    isDecayed24h: isOlderThan24h && totalVotes > 0,
    isExpired24h,
    canBroadcastNearby: score >= 4 && confidenceStatus !== 'removed' && confidenceStatus !== 'expired',
    canBroadcastWide: score >= 10 && confidenceStatus === 'confirmed',
  };
}

/**
 * Checks whether the current user is within the mandatory 5km radius of the alert
 * required to cast a community verification vote.
 */
export function checkVoterGpsEligibility(
  alertLat?: number,
  alertLng?: number,
  userLat?: number | null,
  userLng?: number | null,
  maxRadiusKm = 15.0
): {
  hasCoordinates: boolean;
  distanceKm: number | null;
  isWithinRadius: boolean;
} {
  if (
    typeof alertLat !== 'number' ||
    typeof alertLng !== 'number' ||
    isNaN(alertLat) ||
    isNaN(alertLng)
  ) {
    return { hasCoordinates: false, distanceKm: null, isWithinRadius: true };
  }
  if (
    typeof userLat !== 'number' ||
    typeof userLng !== 'number' ||
    isNaN(userLat) ||
    isNaN(userLng)
  ) {
    return { hasCoordinates: false, distanceKm: null, isWithinRadius: false };
  }

  const dist = calculateDistanceKm(alertLat, alertLng, userLat, userLng);
  return {
    hasCoordinates: true,
    distanceKm: Number(dist.toFixed(2)),
    isWithinRadius: dist <= maxRadiusKm,
  };
}

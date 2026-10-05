import { User, HelpPost, ProfessionalService, ServiceReview } from '../types';

export type ProviderLevelId = 1 | 2 | 3 | 4 | 5;

export interface ProviderLevelConfig {
  level: ProviderLevelId;
  nameSi: string;
  nameEn: string;
  badgeTitle: string;
  icon: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  minJobs: number;
  minRating: number;
  minPoints: number;
  visibilityBoostPercent: number;
  feeDiscountPercent: number;
  perksSi: string[];
}

export const PROVIDER_LEVELS: Record<ProviderLevelId, ProviderLevelConfig> = {
  1: {
    level: 1,
    nameSi: 'නව සේවා සපයන්නා (Newcomer Pro)',
    nameEn: 'Newcomer Professional',
    badgeTitle: '🌱 Level 1 - New Provider',
    icon: '🌱',
    color: '#059669',
    bgGradient: 'from-emerald-600 to-teal-700',
    borderColor: 'border-emerald-500',
    minJobs: 0,
    minRating: 0,
    minPoints: 0,
    visibilityBoostPercent: 0,
    feeDiscountPercent: 0,
    perksSi: [
      'රු. 100 නොමිලේ ආරම්භක ක්‍රෙඩිට් (Free Tier Welcome Bonus)',
      'මූලික සේවා ලැයිස්තුගත කිරීමේ අවස්ථාව',
      'සෘජු පාරිභෝගික ඇමතුම් සහ පණිවිඩ පහසුකම'
    ]
  },
  2: {
    level: 2,
    nameSi: 'ලෝකඩ ශ්‍රේණිය (Bronze Verified Pro)',
    nameEn: 'Bronze Verified Professional',
    badgeTitle: '🥉 Level 2 - Bronze Pro',
    icon: '🥉',
    color: '#b45309',
    bgGradient: 'from-amber-700 via-yellow-700 to-amber-900',
    borderColor: 'border-amber-600',
    minJobs: 4,
    minRating: 4.0,
    minPoints: 100,
    visibilityBoostPercent: 10,
    feeDiscountPercent: 10,
    perksSi: [
      'තහවුරු කළ ලෝකඩ ලාංඡනය (Bronze Verified Badge)',
      '+10% වැඩි පාරිභෝගික ප්‍රමුඛතාවය',
      'දැන්වීම් ගාස්තු සඳහා 10% වට්ටමක්',
      'පාරිභෝගික Reviews ප්‍රදර්ශනය'
    ]
  },
  3: {
    level: 3,
    nameSi: 'රිදී ප්‍රවීණයා (Silver Expert Pro)',
    nameEn: 'Silver Expert Professional',
    badgeTitle: '🥈 Level 3 - Silver Expert',
    icon: '🥈',
    color: '#475569',
    bgGradient: 'from-slate-600 via-slate-700 to-slate-900',
    borderColor: 'border-slate-400',
    minJobs: 10,
    minRating: 4.5,
    minPoints: 250,
    visibilityBoostPercent: 25,
    feeDiscountPercent: 20,
    perksSi: [
      'විශේෂඥ රිදී ලාංඡනය (Silver Expert Pro 3D Badge)',
      '+25% සෙවුම් ප්‍රමුඛතාවය හා ක්ෂණික පාරිභෝගික ගැලපීම්',
      'දැන්වීම් ගාස්තු සඳහා 20% වට්ටමක්',
      'වට්ස්ඇප් සෘජු ප්‍රමුඛතා සම්බන්ධතා'
    ]
  },
  4: {
    level: 4,
    nameSi: 'රන් විශේෂඥයා (Gold Master Pro)',
    nameEn: 'Gold Master Professional',
    badgeTitle: '🥇 Level 4 - Gold Master',
    icon: '🥇',
    color: '#d97706',
    bgGradient: 'from-amber-500 via-yellow-600 to-amber-700',
    borderColor: 'border-yellow-500',
    minJobs: 25,
    minRating: 4.8,
    minPoints: 500,
    visibilityBoostPercent: 50,
    feeDiscountPercent: 35,
    perksSi: [
      'රන් විශේෂඥ ලාංඡනය (Gold Master Verified 3D Crown)',
      'නාමාවලියෙහි ඉහළින්ම Featured ලැයිස්තුගත කිරීම',
      '+50% වැඩි පාරිභෝගික ඇමතුම් සහ ස්වයංක්‍රීය Matching',
      'දැන්වීම් ගාස්තු සඳහා 35% වට්ටමක්',
      'ක්ෂණික හදිසි සේවා ඇමතුම් (Urgent SOS Alerts)'
    ]
  },
  5: {
    level: 5,
    nameSi: '5-තරු ප්‍රභූ පුරාවෘත්තය (5-Star Elite Legend)',
    nameEn: '5-Star Elite Legend',
    badgeTitle: '💎 Level 5 - 5-Star Legend',
    icon: '💎',
    color: '#0284c7',
    bgGradient: 'from-blue-600 via-indigo-700 to-purple-800',
    borderColor: 'border-blue-400',
    minJobs: 50,
    minRating: 4.9,
    minPoints: 1000,
    visibilityBoostPercent: 100,
    feeDiscountPercent: 50,
    perksSi: [
      'ඉහළම 5-තරු ප්‍රභූ ඔටුන්න (5-Star Legend Diamond Badge)',
      'සියලු සෙවුම් වල ඉහළින්ම ස්ථිරව Pin කිරීම (Top Feed Pinning)',
      '0% කොමිස් / නොමිලේ VIP Perks හා ප්‍රචාරණය',
      'සහය සේවා රන් භාරකාරත්ව සහතිකය (VIP Trust Certification)',
      'ප්‍රභූ පාරිභෝගිකයන් වෙත සෘජු නිර්දේශ (VIP Client Routing)'
    ]
  }
};

export interface ProviderReputationSummary {
  userId: string;
  providerName: string;
  level: ProviderLevelId;
  levelConfig: ProviderLevelConfig;
  points: number;
  completedJobsCount: number;
  avgRating: number;
  totalReviewsCount: number;
  fiveStarCount: number;
  progressToNextLevelPercent: number;
  nextLevel: ProviderLevelConfig | null;
  jobsNeededForNext: number;
  pointsNeededForNext: number;
  ratingNeededForNext: number;
  lockInValueReasonSi: string;
}

const STORAGE_KEY_REVIEWS = 'sahaya_provider_reviews_data_v1';
const STORAGE_KEY_COMPLETED_JOBS = 'sahaya_provider_completed_jobs_v1';

/**
 * Get all stored reviews across services
 */
export function getStoredServiceReviewsMap(): Record<string, ServiceReview[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REVIEWS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load stored service reviews:', err);
  }
  return {};
}

/**
 * Save review for a service provider
 */
export function saveServiceReviewToStorage(serviceId: string, review: ServiceReview): ServiceReview[] {
  const map = getStoredServiceReviewsMap();
  const existing = map[serviceId] || [];
  const updated = [review, ...existing];
  map[serviceId] = updated;
  try {
    localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(map));
  } catch (err) {
    console.warn('Failed to save review:', err);
  }
  return updated;
}

/**
 * Get completed jobs count for a provider
 */
export function getProviderCompletedJobsCount(userOrId?: User | string | null): number {
  if (!userOrId) return 0;
  const uid = typeof userOrId === 'string' ? userOrId : (userOrId.userId || userOrId.id || userOrId.phone || '');
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMPLETED_JOBS);
    if (raw) {
      const map = JSON.parse(raw);
      if (map[uid] !== undefined) return Number(map[uid]);
    }
  } catch {}

  // Fallback defaults based on seed user IDs
  if (uid.includes('900987') || uid.includes('chamara')) return 32; // Gold Master
  if (uid.includes('920456') || uid.includes('nimal')) return 16; // Silver Pro
  if (uid.includes('890123') || uid.includes('kavindu')) return 8; // Bronze Pro
  if (uid.includes('850789') || uid.includes('anoma')) return 54; // 5-Star Legend
  return 2;
}

/**
 * Record a completed job for a provider
 */
export function recordProviderCompletedJob(userId: string): number {
  if (!userId) return 0;
  const current = getProviderCompletedJobsCount(userId);
  const next = current + 1;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMPLETED_JOBS);
    const map = raw ? JSON.parse(raw) : {};
    map[userId] = next;
    localStorage.setItem(STORAGE_KEY_COMPLETED_JOBS, JSON.stringify(map));
  } catch (err) {
    console.warn('Failed to save completed job count:', err);
  }
  return next;
}

/**
 * Calculate Reputation Summary & Level for any Provider
 */
export function calculateProviderReputation(
  userOrId: User | string | null | undefined,
  service?: ProfessionalService | null,
  allServices: ProfessionalService[] = []
): ProviderReputationSummary {
  const targetId = typeof userOrId === 'string' ? userOrId : (userOrId?.userId || userOrId?.id || service?.userId || 'anon');
  const providerName = typeof userOrId === 'object' && userOrId?.name 
    ? userOrId.name 
    : service?.providerName || 'සේවා සපයන්නා';

  // Aggregate reviews
  const reviewsMap = getStoredServiceReviewsMap();
  const serviceReviews = service?.id && reviewsMap[service.id] ? reviewsMap[service.id] : (service?.reviews || []);
  
  // Also collect reviews from other services by same user if any
  const matchedServices = allServices.filter(s => s.userId === targetId || (service?.userId && s.userId === service.userId));
  let aggregatedReviews: ServiceReview[] = [...serviceReviews];
  
  matchedServices.forEach(s => {
    if (s.id !== service?.id && s.reviews) {
      aggregatedReviews = aggregatedReviews.concat(s.reviews);
    }
    if (reviewsMap[s.id] && s.id !== service?.id) {
      aggregatedReviews = aggregatedReviews.concat(reviewsMap[s.id]);
    }
  });

  const totalReviewsCount = aggregatedReviews.length;
  const ratingSum = aggregatedReviews.reduce((sum, r) => sum + (r.rating || 5), 0);
  const avgRating = totalReviewsCount > 0 ? Number((ratingSum / totalReviewsCount).toFixed(1)) : (service?.avgRating || 5.0);
  const fiveStarCount = aggregatedReviews.filter(r => r.rating === 5).length;
  const completedJobsCount = getProviderCompletedJobsCount(targetId);

  // Points Calculation Formula:
  // Base points + (Jobs * 25) + (5-Star Reviews * 20) + (Other Reviews * 10)
  let points = 50 + (completedJobsCount * 25) + (fiveStarCount * 20) + ((totalReviewsCount - fiveStarCount) * 10);
  if (avgRating >= 4.9 && completedJobsCount >= 50) points += 200;

  // Determine Level
  let level: ProviderLevelId = 1;
  if (completedJobsCount >= 50 && avgRating >= 4.8 && points >= 1000) {
    level = 5;
  } else if (completedJobsCount >= 25 && avgRating >= 4.7 && points >= 500) {
    level = 4;
  } else if (completedJobsCount >= 10 && avgRating >= 4.3 && points >= 250) {
    level = 3;
  } else if (completedJobsCount >= 4 && avgRating >= 4.0 && points >= 100) {
    level = 2;
  } else {
    level = 1;
  }

  const levelConfig = PROVIDER_LEVELS[level];
  const nextLevelId = (level < 5 ? ((level + 1) as ProviderLevelId) : null);
  const nextLevel = nextLevelId ? PROVIDER_LEVELS[nextLevelId] : null;

  let progressToNextLevelPercent = 100;
  let jobsNeededForNext = 0;
  let pointsNeededForNext = 0;
  let ratingNeededForNext = 0;

  if (nextLevel) {
    jobsNeededForNext = Math.max(0, nextLevel.minJobs - completedJobsCount);
    pointsNeededForNext = Math.max(0, nextLevel.minPoints - points);
    ratingNeededForNext = Math.max(0, Number((nextLevel.minRating - avgRating).toFixed(1)));

    const currentMinJobs = levelConfig.minJobs;
    const targetMinJobs = nextLevel.minJobs;
    const jobProgress = Math.min(1, Math.max(0, (completedJobsCount - currentMinJobs) / (targetMinJobs - currentMinJobs)));
    
    const currentMinPoints = levelConfig.minPoints;
    const targetMinPoints = nextLevel.minPoints;
    const pointProgress = Math.min(1, Math.max(0, (points - currentMinPoints) / (targetMinPoints - currentMinPoints)));

    progressToNextLevelPercent = Math.min(99, Math.round(((jobProgress + pointProgress) / 2) * 100));
  }

  const lockInValueReasonSi = `ඇප් එක තුළ ඔබගේ ${completedJobsCount} ක වැඩ ප්‍රමාණය සහ තරු ${avgRating} ප්‍රතිරූපය (Reputation) නිසා පාරිභෝගිකයන් ස්වයංක්‍රීයව ඔබ වෙත ආකර්ෂණය වේ. ඇප් එකෙන් බැහැර වුවහොත් මෙම තහවුරු කළ ${levelConfig.nameSi} ලාංඡනය සහ ඉහළ ශ්‍රේණිය අහිමි වේ.`;

  return {
    userId: targetId,
    providerName,
    level,
    levelConfig,
    points,
    completedJobsCount,
    avgRating,
    totalReviewsCount,
    fiveStarCount,
    progressToNextLevelPercent,
    nextLevel,
    jobsNeededForNext,
    pointsNeededForNext,
    ratingNeededForNext,
    lockInValueReasonSi
  };
}

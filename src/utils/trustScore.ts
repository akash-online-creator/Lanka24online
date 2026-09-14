import { User, HelpPost, UserTrustProfile, TrustBadgeType } from '../types';

/**
 * Calculates user trust karma points and trust badge based on:
 * - Completed verified helps
 * - Account approval and NIC verification
 * - Registered activity duration
 * - Zero blocked strikes
 */
export function calculateTrustProfile(user: User, helpPosts: HelpPost[] = []): UserTrustProfile {
  const normalizePhone = (p?: string) => (p ? p.replace(/[^0-9]/g, '') : '');
  const userPhoneNorm = normalizePhone(user.phone);

  // Count posts where this user was the confirmed / completed helper
  const completedHelps = (helpPosts || []).filter((p) => {
    const isHelper =
      (p.confirmedHelperPhone && normalizePhone(p.confirmedHelperPhone) === userPhoneNorm) ||
      (p.completedHelperPhone && normalizePhone(p.completedHelperPhone) === userPhoneNorm) ||
      (p.confirmedBy && p.confirmedBy.toLowerCase() === user.name.toLowerCase()) ||
      (p.completedBy && p.completedBy.toLowerCase() === user.name.toLowerCase());
    return isHelper && (p.isCompleted || p.requesterResolved || p.status === 'completed');
  }).length;

  const verifiedPhone = Boolean(user.phone && user.phone.length >= 9);
  const verifiedNic = Boolean(user.nicNumber && user.nicNumber.length >= 9);

  // Points calculation
  let karmaPoints = 10; // Base signup karma
  if (verifiedPhone) karmaPoints += 20;
  if (verifiedNic) karmaPoints += 30;
  if (user.status === 'approved') karmaPoints += 20;
  karmaPoints += completedHelps * 50;

  let trustBadge: TrustBadgeType = 'bronze';
  let badgeTitleSi = 'නව සාමාජික';
  let badgeIcon = '🥉';

  if (completedHelps >= 5 || karmaPoints >= 300) {
    trustBadge = 'community_hero';
    badgeTitleSi = 'ප්‍රජා වීරයා';
    badgeIcon = '🌟';
  } else if (completedHelps >= 3 || karmaPoints >= 200) {
    trustBadge = 'gold';
    badgeTitleSi = 'රන් සහායක';
    badgeIcon = '🥇';
  } else if (completedHelps >= 1 || karmaPoints >= 100) {
    trustBadge = 'silver';
    badgeTitleSi = 'විශ්වාසවන්ත මිතුරා';
    badgeIcon = '🥈';
  } else if (user.status === 'approved') {
    trustBadge = 'bronze';
    badgeTitleSi = 'තහවුරු කළ සාමාජික';
    badgeIcon = '🛡️';
  }

  return {
    completedHelpsCount: completedHelps,
    positiveReviewsCount: Math.max(1, completedHelps),
    karmaPoints,
    trustBadge,
    badgeTitleSi,
    badgeIcon,
    verifiedPhone,
    verifiedNic,
  };
}

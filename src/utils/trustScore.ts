import { User, HelpPost, UserTrustProfile, TrustBadgeType, TrustScoreLogItem, BlockedCredential } from '../types';
import { addBlockedCredential, removeBlockedCredential } from './blockedCredentialsManager';

const TRUST_SCORES_STORAGE_KEY = 'sahaya_user_trust_scores_v2';
const TRUST_BADGES_STORAGE_KEY = 'sahaya_user_custom_badges_v2';
const TRUST_LOGS_STORAGE_KEY = 'sahaya_trust_audit_logs_v2';

export interface UserTrustData {
  userId: string;
  points: number; // Default 100
  customBadges: TrustBadgeType[];
  isBlockedDueToPoints?: boolean;
  blockedReason?: string;
  blockedAt?: string;
  lastUpdated: string;
}

// Initial seed trust data for known users in the system
const INITIAL_USER_TRUST_DATA: Record<string, Partial<UserTrustData>> = {
  'SS-890123': {
    points: 260,
    customBadges: ['verified_seller', 'verified_volunteer'],
  },
  'SS-920456': {
    points: 190,
    customBadges: ['verified_professional'],
  },
  'SS-850789': {
    points: 320,
    customBadges: ['verified_volunteer', 'community_hero'],
  },
  'SS-940321': {
    points: 150,
    customBadges: ['verified_seller'],
  },
  'SS-960654': {
    points: 120,
    customBadges: ['verified_volunteer'],
  },
  'SS-900987': {
    points: 210,
    customBadges: ['verified_professional', 'verified_seller'],
  },
};

// Initial sample audit logs for transparent audit history
const INITIAL_AUDIT_LOGS: TrustScoreLogItem[] = [
  {
    id: 'tlog-init-1',
    userId: 'SS-850789',
    userName: 'අනෝමා සිල්වා',
    change: +50,
    balanceAfter: 320,
    reason: 'ගංවතුර සහන මෙහෙයුමේදී ස්වේච්ඡා කඳවුරක් සාර්ථකව සම්බන්ධීකරණය කිරීම',
    category: 'aid_verified',
    adminName: 'ප්‍රධාන පරිපාලක (Super Admin)',
    timestamp: '2026-09-20 14:30',
    timestampMs: Date.now() - 172800000,
  },
  {
    id: 'tlog-init-2',
    userId: 'SS-890123',
    userName: 'කවිඳු පෙරේරා',
    change: +30,
    balanceAfter: 260,
    reason: 'ජාතික හැඳුනුම්පත් සහ දුරකථන සත්‍යාපනය සාර්ථකව නිමකිරීම',
    category: 'verification',
    adminName: 'පද්ධති පරීක්ෂක (System)',
    timestamp: '2026-09-21 09:15',
    timestampMs: Date.now() - 86400000,
  },
  {
    id: 'tlog-init-3',
    userId: 'SS-900987',
    userName: 'චාමර වික්‍රමසිංහ',
    change: +25,
    balanceAfter: 210,
    reason: 'හදිසි ජල නළ අලුත්වැඩියාව සඳහා නොමිලේ ප්‍රජා සහය ලබාදීම',
    category: 'help_completed',
    adminName: 'පද්ධති පරීක්ෂක (System)',
    timestamp: '2026-09-22 11:45',
    timestampMs: Date.now() - 25000000,
  },
];

// Helper to normalize user identifiers
export function getTrustUserId(user: User | { id?: string; userId?: string; phone?: string; nicNumber?: string }): string {
  return (user?.userId || user?.id || user?.phone || user?.nicNumber || 'anonymous').trim();
}

// Load all trust data map from storage
export function getAllStoredTrustData(): Record<string, UserTrustData> {
  try {
    const raw = localStorage.getItem(TRUST_SCORES_STORAGE_KEY);
    if (!raw) {
      const initialMap: Record<string, UserTrustData> = {};
      Object.entries(INITIAL_USER_TRUST_DATA).forEach(([uid, data]) => {
        initialMap[uid] = {
          userId: uid,
          points: data.points ?? 100,
          customBadges: data.customBadges ?? [],
          lastUpdated: new Date().toISOString(),
        };
      });
      localStorage.setItem(TRUST_SCORES_STORAGE_KEY, JSON.stringify(initialMap));
      return initialMap;
    }
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

// Save all trust data map
export function saveAllTrustData(data: Record<string, UserTrustData>): void {
  try {
    localStorage.setItem(TRUST_SCORES_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('sahaya_trust_scores_updated'));
  } catch (e) {
    // ignore
  }
}

// Get single user's trust record
export function getUserTrustData(userOrId: User | string): UserTrustData {
  const uid = typeof userOrId === 'string' ? userOrId.trim() : getTrustUserId(userOrId);
  const all = getAllStoredTrustData();
  if (all[uid]) return all[uid];

  // Try matching by secondary ID or phone
  if (typeof userOrId === 'object' && userOrId) {
    if (userOrId.id && all[userOrId.id]) return all[userOrId.id];
    if (userOrId.userId && all[userOrId.userId]) return all[userOrId.userId];
    if (userOrId.phone && all[userOrId.phone]) return all[userOrId.phone];
    if (userOrId.nicNumber && all[userOrId.nicNumber]) return all[userOrId.nicNumber];
  }

  // Return default 100 points
  const defaultRecord: UserTrustData = {
    userId: uid,
    points: 100,
    customBadges: [],
    lastUpdated: new Date().toISOString(),
  };
  return defaultRecord;
}

// Load trust audit logs
export function getTrustScoreAuditLogs(): TrustScoreLogItem[] {
  try {
    const raw = localStorage.getItem(TRUST_LOGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(TRUST_LOGS_STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_AUDIT_LOGS;
  }
}

// Append an audit log
export function addTrustAuditLog(log: Omit<TrustScoreLogItem, 'id' | 'timestampMs'>): TrustScoreLogItem {
  const current = getTrustScoreAuditLogs();
  const newLog: TrustScoreLogItem = {
    ...log,
    id: `tlog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestampMs: Date.now(),
  };
  const updated = [newLog, ...current].slice(0, 200);
  try {
    localStorage.setItem(TRUST_LOGS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('sahaya_trust_logs_updated', { detail: newLog }));
  } catch (e) {
    // ignore
  }
  return newLog;
}

/**
 * Calculates user trust points, karma and full trust badges profile.
 */
export function calculateTrustProfile(user: User, helpPosts: HelpPost[] = []): UserTrustProfile {
  if (!user) {
    return {
      completedHelpsCount: 0,
      positiveReviewsCount: 1,
      karmaPoints: 100,
      trustPoints: 100,
      trustBadge: 'bronze',
      activeBadges: ['bronze'],
      badgeTitleSi: 'නව සාමාජික',
      badgeIcon: '🥉',
      verifiedPhone: false,
      verifiedNic: false,
      trustLevel: 'good',
    };
  }

  const normalizePhone = (p?: string) => (p ? p.replace(/[^0-9]/g, '') : '');
  const userPhoneNorm = normalizePhone(user.phone);

  // Count posts where this user was the confirmed / completed helper
  const uName = (user?.name || '').trim().toLowerCase();
  const completedHelps = (helpPosts || []).filter((p) => {
    const isHelper =
      (p.confirmedHelperPhone && normalizePhone(p.confirmedHelperPhone) === userPhoneNorm) ||
      (p.completedHelperPhone && normalizePhone(p.completedHelperPhone) === userPhoneNorm) ||
      (uName && p.confirmedBy && p.confirmedBy.trim().toLowerCase() === uName) ||
      (uName && p.completedBy && p.completedBy.trim().toLowerCase() === uName);
    return isHelper && (p.isCompleted || p.requesterResolved || p.status === 'completed');
  }).length;

  const verifiedPhone = Boolean(user.phone && user.phone.length >= 9);
  const verifiedNic = Boolean(user.nicNumber && user.nicNumber.length >= 9);

  // Retrieve stored trust data (points & custom assigned badges)
  const trustData = getUserTrustData(user);
  let trustPoints = trustData.points ?? user.trustPoints ?? 100;
  const customBadges = trustData.customBadges ?? user.customBadges ?? [];

  // Check if user is blocked or has 0 points
  const isBlocked = user.status === 'blocked' || user.isBlocked || trustPoints <= 0 || trustData.isBlockedDueToPoints;

  // Determine trust level & base tier badge
  let trustBadge: TrustBadgeType = 'bronze';
  let badgeTitleSi = 'තහවුරු කළ සාමාජික';
  let badgeIcon = '🛡️';
  let trustLevel: 'high' | 'good' | 'warning' | 'critical' | 'blocked' = 'good';

  if (isBlocked) {
    trustBadge = 'blocked';
    badgeTitleSi = '🚫 අත්හිටවූ ගිණුම (වංචා/ලකුණු 0)';
    badgeIcon = '🚫';
    trustLevel = 'blocked';
  } else if (trustPoints <= 30) {
    trustBadge = 'warning';
    badgeTitleSi = '⚠️ අවදානම් මට්ටම (අවවාදයයි)';
    badgeIcon = '⚠️';
    trustLevel = 'critical';
  } else if (trustPoints >= 300 || completedHelps >= 5 || customBadges.includes('community_hero')) {
    trustBadge = 'community_hero';
    badgeTitleSi = '🌟 ප්‍රජා වීරයා';
    badgeIcon = '🌟';
    trustLevel = 'high';
  } else if (trustPoints >= 200 || completedHelps >= 3) {
    trustBadge = 'gold';
    badgeTitleSi = '🥇 රන් සහායක';
    badgeIcon = '🥇';
    trustLevel = 'high';
  } else if (trustPoints >= 100 || completedHelps >= 1) {
    trustBadge = 'silver';
    badgeTitleSi = '🥈 විශ්වාසවන්ත මිතුරා';
    badgeIcon = '🥈';
    trustLevel = 'good';
  } else {
    trustBadge = 'bronze';
    badgeTitleSi = '🥉 නව සාමාජික';
    badgeIcon = '🥉';
    trustLevel = 'warning';
  }

  // Compile full set of active badges
  const activeBadges: TrustBadgeType[] = [trustBadge, ...customBadges.filter(b => b !== trustBadge)];

  return {
    completedHelpsCount: completedHelps,
    positiveReviewsCount: Math.max(1, completedHelps),
    karmaPoints: trustPoints,
    trustPoints: trustPoints,
    trustBadge,
    activeBadges,
    badgeTitleSi,
    badgeIcon,
    verifiedPhone,
    verifiedNic,
    trustLevel,
    isBlockedDueToPoints: Boolean(trustPoints <= 0 || trustData.isBlockedDueToPoints),
  };
}

/**
 * Award Trust Points (ලකුණු එකතු කිරීම)
 */
export function awardTrustPoints(
  user: User | { id?: string; userId?: string; name?: string; phone?: string; nicNumber?: string },
  points: number,
  reason: string,
  category: TrustScoreLogItem['category'] = 'admin_manual',
  adminName: string = 'පරිපාලක (Admin)'
): { newBalance: number; userTrust: UserTrustData } {
  const uid = getTrustUserId(user);
  const uName = user.name || 'පරිශීලක';
  const all = getAllStoredTrustData();
  const current = all[uid] || {
    userId: uid,
    points: 100,
    customBadges: [],
    lastUpdated: new Date().toISOString(),
  };

  const newBalance = Math.min(1000, Math.max(0, current.points + points));
  const updatedRecord: UserTrustData = {
    ...current,
    points: newBalance,
    isBlockedDueToPoints: newBalance <= 0,
    lastUpdated: new Date().toISOString(),
  };

  all[uid] = updatedRecord;
  saveAllTrustData(all);

  // Add audit log
  addTrustAuditLog({
    userId: uid,
    userName: uName,
    change: +points,
    balanceAfter: newBalance,
    reason,
    category,
    adminName,
    timestamp: new Date().toLocaleString('si-LK'),
  });

  return { newBalance, userTrust: updatedRecord };
}

/**
 * Deduct Trust Points on fraud, lies, scam, fake reports (ලකුණු කැපීම & Auto-Block)
 * If points reach <= 0, automatically blocks account & blacklists credentials!
 */
export function deductTrustPoints(
  user: User | { id?: string; userId?: string; name?: string; phone?: string; nicNumber?: string; email?: string },
  points: number,
  reason: string,
  category: TrustScoreLogItem['category'] = 'fraud_penalty',
  adminName: string = 'පරිපාලක (Admin)',
  onUserAutoBlocked?: (userId: string, reason: string) => void
): { newBalance: number; isAutoBlocked: boolean; userTrust: UserTrustData } {
  const uid = getTrustUserId(user);
  const uName = user.name || 'පරිශීලක';
  const all = getAllStoredTrustData();
  const current = all[uid] || {
    userId: uid,
    points: 100,
    customBadges: [],
    lastUpdated: new Date().toISOString(),
  };

  const newBalance = Math.max(0, current.points - points);
  const isAutoBlocked = newBalance <= 0;

  const updatedRecord: UserTrustData = {
    ...current,
    points: newBalance,
    isBlockedDueToPoints: isAutoBlocked,
    blockedReason: isAutoBlocked ? `විශ්වාසනීය ලකුණු (Trust Points) 0 වීම සහ වංචනික ක්‍රියා නිසා ගිණුම අත්හිටුවන ලදී: ${reason}` : undefined,
    blockedAt: isAutoBlocked ? new Date().toISOString() : undefined,
    lastUpdated: new Date().toISOString(),
  };

  all[uid] = updatedRecord;
  saveAllTrustData(all);

  // Add audit log
  addTrustAuditLog({
    userId: uid,
    userName: uName,
    change: -points,
    balanceAfter: newBalance,
    reason: isAutoBlocked ? `[🚫 AUTO-BLOCKED] ${reason}` : reason,
    category,
    adminName,
    timestamp: new Date().toLocaleString('si-LK'),
  });

  // If auto-blocked, blacklist credentials and trigger callback
  if (isAutoBlocked) {
    const cred: BlockedCredential = {
      id: `blk-${Date.now()}`,
      userId: uid,
      userName: uName,
      phone: user?.phone,
      nicNumber: user?.nicNumber,
      email: user?.email,
      blockedAt: new Date().toLocaleString('si-LK'),
      reason: `විශ්වාසනීය ලකුණු 0 වීම: ${reason}`,
    };
    addBlockedCredential(cred);

    if (onUserAutoBlocked) {
      onUserAutoBlocked(uid, cred.reason);
    }
  }

  return { newBalance, isAutoBlocked, userTrust: updatedRecord };
}

/**
 * Grant or Revoke Custom Verified Badges (Verified Seller / Volunteer / Professional)
 */
export function toggleUserCustomBadge(
  user: User | { id?: string; userId?: string; name?: string; phone?: string },
  badge: TrustBadgeType,
  grant: boolean,
  reason: string = '',
  adminName: string = 'පරිපාලක (Admin)'
): UserTrustData {
  const uid = getTrustUserId(user);
  const uName = user.name || 'පරිශීලක';
  const all = getAllStoredTrustData();
  const current = all[uid] || {
    userId: uid,
    points: 100,
    customBadges: [],
    lastUpdated: new Date().toISOString(),
  };

  let newBadges = [...(current.customBadges || [])];
  if (grant) {
    if (!newBadges.includes(badge)) {
      newBadges.push(badge);
    }
  } else {
    newBadges = newBadges.filter(b => b !== badge);
  }

  const updatedRecord: UserTrustData = {
    ...current,
    customBadges: newBadges,
    lastUpdated: new Date().toISOString(),
  };

  all[uid] = updatedRecord;
  saveAllTrustData(all);

  const badgeNames: Record<string, string> = {
    verified_seller: '🏪 Verified Seller (තහවුරු කළ වෙළෙන්දා)',
    verified_volunteer: '🤝 Verified Volunteer (තහවුරු කළ ස්වේච්ඡා සේවක)',
    verified_professional: '🛠️ Verified Professional (තහවුරු කළ වෘත්තිකයා)',
    community_hero: '🌟 Community Hero (ප්‍රජා වීරයා)',
  };

  addTrustAuditLog({
    userId: uid,
    userName: uName,
    change: 0,
    balanceAfter: current.points,
    reason: `${grant ? 'ලබාදෙන ලදි' : 'ඉවත් කරන ලදි'}: ${badgeNames[badge] || badge}. ${reason}`,
    category: 'admin_manual',
    adminName,
    timestamp: new Date().toLocaleString('si-LK'),
  });

  return updatedRecord;
}

/**
 * Unblock user and restore trust points (ගිණුම නැවත ක්‍රියාත්මක කිරීම සහ ලකුණු ප්‍රතිසාධනය)
 */
export function unblockUserAndRestoreTrust(
  user: User | { id?: string; userId?: string; name?: string; phone?: string; nicNumber?: string },
  restorePoints: number = 100,
  reason: string = 'පරිපාලක විසින් සමාලෝචනය කර ගිණුම නැවත සක්‍රීය කරන ලදී',
  adminName: string = 'පරිපාලක (Admin)'
): UserTrustData {
  const uid = getTrustUserId(user);
  const uName = user.name || 'පරිශීලක';
  const all = getAllStoredTrustData();
  const current = all[uid] || {
    userId: uid,
    points: 0,
    customBadges: [],
    lastUpdated: new Date().toISOString(),
  };

  const updatedRecord: UserTrustData = {
    ...current,
    points: Math.max(50, restorePoints),
    isBlockedDueToPoints: false,
    blockedReason: undefined,
    blockedAt: undefined,
    lastUpdated: new Date().toISOString(),
  };

  all[uid] = updatedRecord;
  saveAllTrustData(all);

  // Remove from blocked credentials list
  removeBlockedCredential(uid);
  if (user?.phone) removeBlockedCredential(user.phone);
  if (user?.nicNumber) removeBlockedCredential(user.nicNumber);

  addTrustAuditLog({
    userId: uid,
    userName: uName,
    change: +restorePoints,
    balanceAfter: updatedRecord.points,
    reason: `[🟢 UNBLOCKED] ${reason}`,
    category: 'unblock_reset',
    adminName,
    timestamp: new Date().toLocaleString('si-LK'),
  });

  return updatedRecord;
}

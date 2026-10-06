import { HelpPost, BloodDonationRequest, DisasterReliefItem, VolunteerDonor, RedAlertItem, User } from '../types';
import { saveDeletedRecordsToFirestore, subscribeToDeletedRecordsFromFirestore, DeletedRecordsMap } from '../lib/firebase';

// ==========================================
// LocalStorage Key (Unified Constants)
// ==========================================
const DELETED_POST_IDS_KEY = 'sahaya_deleted_post_ids';
const DELETED_BLOOD_IDS_KEY = 'sahaya_deleted_blood_ids';
const DELETED_DISASTER_IDS_KEY = 'sahaya_deleted_disaster_ids';
const DELETED_DONOR_IDS_KEY = 'sahaya_deleted_donor_ids';
const DELETED_RED_ALERTS_KEY = 'sahaya_deleted_red_alert_ids';
const DELETED_USERS_KEY = 'sahaya_deleted_user_ids';
const DELETED_MARKETPLACE_IDS_KEY = 'sahaya_deleted_marketplace_ids';
const DELETED_MARKET_SHOPS_KEY = 'sahaya_deleted_market_shops_ids';
const DELETED_PRO_SERVICES_KEY = 'sahaya_deleted_pro_services_ids';
const DELETED_GROUP_IDS_KEY = 'sahaya_deleted_group_ids';

// ==========================================
// Storage Helper Functions
// ==========================================
function getStoredIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveIds(key: string, ids: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(new Set(ids))));
    // LocalStorage එක වෙනස් වූ වහාම Firestore Cloud එකට Sync කෙරේ
    syncAllDeletionsToCloud();
  } catch (err) {
    console.warn(`Failed to save deleted IDs to storage key: ${key}`, err);
  }
}

// ==========================================
// Firestore Sync Logic
// ==========================================
let syncTimeout: any = null;
function syncAllDeletionsToCloud() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    try {
      const payload: DeletedRecordsMap = {
        deletedPostIds: getStoredDeletedPostIds(),
        deletedUserIds: getStoredDeletedUserIds(),
        deletedBloodIds: getStoredDeletedBloodIds(),
        deletedDisasterIds: getStoredDeletedDisasterIds(),
        deletedDonorIds: getStoredDeletedDonorIds(),
        deletedRedAlertIds: getStoredDeletedRedAlertIds(),
        deletedMarketplaceIds: getStoredDeletedMarketplaceIds(),
        deletedMarketShopIds: getStoredDeletedMarketShopIds(),
        deletedProServiceIds: getStoredDeletedProServiceIds(),
        deletedGroupIds: getStoredDeletedGroupIds(),
      };
      saveDeletedRecordsToFirestore(payload).catch(() => {});
    } catch {}
  }, 300);
}

// App එක Load වන විට Cloud එකෙන් පැමිණෙන Deletions එකතු කර ගනී
if (typeof window !== 'undefined') {
  try {
    subscribeToDeletedRecordsFromFirestore((cloudRecords) => {
      if (!cloudRecords) return;
      if (Array.isArray(cloudRecords.deletedPostIds) && cloudRecords.deletedPostIds.length > 0) {
        const merged = Array.from(new Set([...getStoredDeletedPostIds(), ...cloudRecords.deletedPostIds]));
        localStorage.setItem(DELETED_POST_IDS_KEY, JSON.stringify(merged));
      }
      if (Array.isArray(cloudRecords.deletedUserIds) && cloudRecords.deletedUserIds.length > 0) {
        const merged = Array.from(new Set([...getStoredDeletedUserIds(), ...cloudRecords.deletedUserIds]));
        localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(merged));
      }
      if (Array.isArray(cloudRecords.deletedBloodIds) && cloudRecords.deletedBloodIds.length > 0) {
        const merged = Array.from(new Set([...getStoredDeletedBloodIds(), ...cloudRecords.deletedBloodIds]));
        localStorage.setItem(DELETED_BLOOD_IDS_KEY, JSON.stringify(merged));
      }
      if (Array.isArray(cloudRecords.deletedDisasterIds) && cloudRecords.deletedDisasterIds.length > 0) {
        const merged = Array.from(new Set([...getStoredDeletedDisasterIds(), ...cloudRecords.deletedDisasterIds]));
        localStorage.setItem(DELETED_DISASTER_IDS_KEY, JSON.stringify(merged));
      }
      if (Array.isArray(cloudRecords.deletedDonorIds) && cloudRecords.deletedDonorIds.length > 0) {
        const merged = Array.from(new Set([...getStoredDeletedDonorIds(), ...cloudRecords.deletedDonorIds]));
        localStorage.setItem(DELETED_DONOR_IDS_KEY, JSON.stringify(merged));
      }
      if (Array.isArray(cloudRecords.deletedRedAlertIds) && cloudRecords.deletedRedAlertIds.length > 0) {
        const merged = Array.from(new Set([...getStoredDeletedRedAlertIds(), ...cloudRecords.deletedRedAlertIds]));
        localStorage.setItem(DELETED_RED_ALERTS_KEY, JSON.stringify(merged));
      }
      if (Array.isArray(cloudRecords.deletedMarketplaceIds) && cloudRecords.deletedMarketplaceIds.length > 0) {
        const merged = Array.from(new Set([...getStoredDeletedMarketplaceIds(), ...cloudRecords.deletedMarketplaceIds]));
        localStorage.setItem(DELETED_MARKETPLACE_IDS_KEY, JSON.stringify(merged));
      }
      if (Array.isArray(cloudRecords.deletedMarketShopIds) && cloudRecords.deletedMarketShopIds.length > 0) {
        const merged = Array.from(new Set([...getStoredDeletedMarketShopIds(), ...cloudRecords.deletedMarketShopIds]));
        localStorage.setItem(DELETED_MARKET_SHOPS_KEY, JSON.stringify(merged));
      }
      if (Array.isArray(cloudRecords.deletedProServiceIds) && cloudRecords.deletedProServiceIds.length > 0) {
        const merged = Array.from(new Set([...getStoredDeletedProServiceIds(), ...cloudRecords.deletedProServiceIds]));
        localStorage.setItem(DELETED_PRO_SERVICES_KEY, JSON.stringify(merged));
      }
      if (Array.isArray(cloudRecords.deletedGroupIds) && cloudRecords.deletedGroupIds.length > 0) {
        const merged = Array.from(new Set([...getStoredDeletedGroupIds(), ...cloudRecords.deletedGroupIds]));
        localStorage.setItem(DELETED_GROUP_IDS_KEY, JSON.stringify(merged));
      }
    });
  } catch {}
}

// ==========================================
// 1. Users
// ==========================================
export function getStoredDeletedUserIds(): string[] {
  return getStoredIds(DELETED_USERS_KEY);
}

export function addDeletedUserId(identifier: string): void {
  if (!identifier) return;
  const clean = identifier.trim();
  const current = getStoredDeletedUserIds();
  const toAdd = [clean, clean.toLowerCase(), clean.toUpperCase()];
  const next = Array.from(new Set([...current, ...toAdd]));
  saveIds(DELETED_USERS_KEY, next);
}

export function removeDeletedUserId(identifier: string): void {
  if (!identifier) return;
  const clean = identifier.trim();
  const current = getStoredDeletedUserIds();
  saveIds(
    DELETED_USERS_KEY,
    current.filter(
      (id) => id !== clean && id !== clean.toLowerCase() && id !== clean.toUpperCase()
    )
  );
}

export function isUserPermanentlyDeleted(userOrId: any): boolean {
  if (!userOrId) return false;
  const deletedSet = new Set(getStoredDeletedUserIds().map((s) => s.toLowerCase()));
  if (typeof userOrId === 'string') {
    return deletedSet.has(userOrId.trim().toLowerCase());
  }
  const id = userOrId.id ? String(userOrId.id).trim().toLowerCase() : '';
  const userId = userOrId.userId ? String(userOrId.userId).trim().toLowerCase() : '';
  const nic = userOrId.nicNumber ? String(userOrId.nicNumber).trim().toLowerCase() : '';
  return Boolean((id && deletedSet.has(id)) || (userId && deletedSet.has(userId)) || (nic && deletedSet.has(nic)));
}

export function filterNonDeletedUsers(users: User[]): User[] {
  if (!Array.isArray(users)) return [];
  const deletedSet = new Set(getStoredDeletedUserIds().map((s) => s.toLowerCase()));
  return users.filter((u) => {
    if (!u) return false;
    if ((u.status as string) === 'deleted' || (u as any).isDeleted) return false;
    const id = u.id ? String(u.id).trim().toLowerCase() : '';
    const userId = u.userId ? String(u.userId).trim().toLowerCase() : '';
    const nic = u.nicNumber ? String(u.nicNumber).trim().toLowerCase() : '';
    if (id && deletedSet.has(id)) return false;
    if (userId && deletedSet.has(userId)) return false;
    if (nic && deletedSet.has(nic)) return false;
    return true;
  });
}

// ==========================================
// 2. Help Posts
// ==========================================
export function getStoredDeletedPostIds(): string[] {
  return getStoredIds(DELETED_POST_IDS_KEY);
}

export function addDeletedPostId(postId: string): void {
  if (!postId) return;
  const current = getStoredDeletedPostIds();
  if (!current.includes(postId)) {
    saveIds(DELETED_POST_IDS_KEY, [...current, postId]);
  }
}

export function removeDeletedPostId(postId: string): void {
  if (!postId) return;
  const current = getStoredDeletedPostIds();
  saveIds(DELETED_POST_IDS_KEY, current.filter((id) => id !== postId));
}

export function isPostPermanentlyDeleted(postId: string): boolean {
  if (!postId) return false;
  return getStoredDeletedPostIds().includes(postId);
}

export function filterNonDeletedPosts<T extends { id?: string; isDeleted?: boolean; status?: string }>(posts: T[]): T[] {
  if (!Array.isArray(posts)) return [];
  const deletedIds = new Set(getStoredDeletedPostIds());
  return posts.filter((p) => p && p.id && !deletedIds.has(p.id) && !p.isDeleted && p.status !== 'deleted');
}

// Real-time UI broadcast සදහා වන ශ්‍රිතය (Layer 3 Event Triggering)
export function broadcastPostDeletion(postId: string): void {
  addDeletedPostId(postId);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sahaya_post_deleted'));
  }
}

// ==========================================
// 3. Blood Donation Requests
// ==========================================
export function getStoredDeletedBloodIds(): string[] {
  return getStoredIds(DELETED_BLOOD_IDS_KEY);
}

export function addDeletedBloodId(bloodId: string): void {
  if (!bloodId) return;
  const current = getStoredDeletedBloodIds();
  if (!current.includes(bloodId)) {
    saveIds(DELETED_BLOOD_IDS_KEY, [...current, bloodId]);
  }
}

export function filterNonDeletedBloodRequests(requests: BloodDonationRequest[]): BloodDonationRequest[] {
  if (!Array.isArray(requests)) return [];
  const deletedIds = new Set(getStoredDeletedBloodIds());
  return requests.filter((r) => r && r.id && !deletedIds.has(r.id));
}

// ==========================================
// 4. Disaster Relief Items
// ==========================================
export function getStoredDeletedDisasterIds(): string[] {
  return getStoredIds(DELETED_DISASTER_IDS_KEY);
}

export function addDeletedDisasterId(disasterId: string): void {
  if (!disasterId) return;
  const current = getStoredDeletedDisasterIds();
  if (!current.includes(disasterId)) {
    saveIds(DELETED_DISASTER_IDS_KEY, [...current, disasterId]);
  }
}

export function filterNonDeletedDisasterItems(items: DisasterReliefItem[]): DisasterReliefItem[] {
  if (!Array.isArray(items)) return [];
  const deletedIds = new Set(getStoredDeletedDisasterIds());
  return items.filter((d) => d && d.id && !deletedIds.has(d.id));
}

// ==========================================
// 5. Volunteer Donors
// ==========================================
export function getStoredDeletedDonorIds(): string[] {
  return getStoredIds(DELETED_DONOR_IDS_KEY);
}

export function addDeletedDonorId(donorId: string): void {
  if (!donorId) return;
  const current = getStoredDeletedDonorIds();
  if (!current.includes(donorId)) {
    saveIds(DELETED_DONOR_IDS_KEY, [...current, donorId]);
  }
}

export function filterNonDeletedDonors(donors: VolunteerDonor[]): VolunteerDonor[] {
  if (!Array.isArray(donors)) return [];
  const deletedIds = new Set(getStoredDeletedDonorIds());
  return donors.filter((d) => d && d.id && !deletedIds.has(d.id));
}

// ==========================================
// 6. Marketplace Items & Shops
// ==========================================
export function getStoredDeletedMarketplaceIds(): string[] {
  return getStoredIds(DELETED_MARKETPLACE_IDS_KEY);
}

export function addDeletedMarketplaceId(itemId: string): void {
  if (!itemId) return;
  const current = getStoredDeletedMarketplaceIds();
  if (!current.includes(itemId)) {
    saveIds(DELETED_MARKETPLACE_IDS_KEY, [...current, itemId]);
  }
}

export function filterNonDeletedMarketItems<T extends { id?: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const deletedIds = new Set(getStoredDeletedMarketplaceIds());
  return items.filter((item) => item && item.id && !deletedIds.has(item.id));
}

export function getStoredDeletedMarketShopIds(): string[] {
  return getStoredIds(DELETED_MARKET_SHOPS_KEY);
}

export function addDeletedMarketShopId(shopId: string): void {
  if (!shopId) return;
  const current = getStoredDeletedMarketShopIds();
  if (!current.includes(shopId)) {
    saveIds(DELETED_MARKET_SHOPS_KEY, [...current, shopId]);
  }
}

export function filterNonDeletedMarketShops<T extends { id?: string }>(shops: T[]): T[] {
  if (!Array.isArray(shops)) return [];
  const deletedIds = new Set(getStoredDeletedMarketShopIds());
  return shops.filter((shop) => shop && shop.id && !deletedIds.has(shop.id));
}

// ==========================================
// 7. Professional Services
// ==========================================
export function getStoredDeletedProServiceIds(): string[] {
  return getStoredIds(DELETED_PRO_SERVICES_KEY);
}

export function addDeletedProServiceId(serviceId: string): void {
  if (!serviceId) return;
  const current = getStoredDeletedProServiceIds();
  if (!current.includes(serviceId)) {
    saveIds(DELETED_PRO_SERVICES_KEY, [...current, serviceId]);
  }
}

export function filterNonDeletedProServices<T extends { id?: string }>(services: T[]): T[] {
  if (!Array.isArray(services)) return [];
  const deletedIds = new Set(getStoredDeletedProServiceIds());
  return services.filter((s) => s && s.id && !deletedIds.has(s.id));
}

// ==========================================
// 8. Groups & Shramadana
// ==========================================
export function getStoredDeletedGroupIds(): string[] {
  return getStoredIds(DELETED_GROUP_IDS_KEY);
}

export function addDeletedGroupId(groupId: string): void {
  if (!groupId) return;
  const current = getStoredDeletedGroupIds();
  if (!current.includes(groupId)) {
    saveIds(DELETED_GROUP_IDS_KEY, [...current, groupId]);
  }
}

export function filterNonDeletedGroups<T extends { id?: string }>(groups: T[]): T[] {
  if (!Array.isArray(groups)) return [];
  const deletedIds = new Set(getStoredDeletedGroupIds());
  return groups.filter((g) => g && g.id && !deletedIds.has(g.id));
}

// ==========================================
// 9. Red Alerts (රතු එළිය)
// ==========================================
export function getStoredDeletedRedAlertIds(): string[] {
  return getStoredIds(DELETED_RED_ALERTS_KEY);
}

export function addDeletedRedAlertId(alertId: string): void {
  if (!alertId) return;
  const current = getStoredDeletedRedAlertIds();
  if (!current.includes(alertId)) {
    saveIds(DELETED_RED_ALERTS_KEY, [...current, alertId]);
  }
}

export function removeDeletedRedAlertId(alertId: string): void {
  if (!alertId) return;
  const current = getStoredDeletedRedAlertIds();
  saveIds(DELETED_RED_ALERTS_KEY, current.filter((id) => id !== alertId));
}

export function isRedAlertPermanentlyDeleted(alertId: string): boolean {
  if (!alertId) return false;
  return getStoredDeletedRedAlertIds().includes(alertId);
}

export function filterNonDeletedRedAlerts(alerts: RedAlertItem[]): RedAlertItem[] {
  if (!Array.isArray(alerts)) return [];
  const deletedIds = new Set(getStoredDeletedRedAlertIds());
  return alerts.filter(
    (a) => a && a.id && !deletedIds.has(a.id) && !(a as any).isDeleted && (a.status as string) !== 'deleted'
  );
}

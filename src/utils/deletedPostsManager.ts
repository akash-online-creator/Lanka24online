import { checkIsAdmin } from './postOwnerHelper';
import { 
  HelpPost, 
  BloodDonationRequest, 
  DisasterReliefItem, 
  VolunteerDonor, 
  RedAlertItem, 
  User 
} from '../types';
import { 
  db,
  fallbackDb,
  storage,
  doc,
  saveDeletedRecordsToFirestore, 
  subscribeToDeletedRecordsFromFirestore, 
  DeletedRecordsMap 
} from '../lib/firebase';
import { deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';

// ==========================================
// LocalStorage Keys (Unified Constants)
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
const DELETED_JOB_IDS_KEY = 'sahaya_deleted_job_ids';
const DELETED_ACCOMMODATION_IDS_KEY = 'sahaya_deleted_accommodation_ids';
const DELETED_BARTER_ITEM_IDS_KEY = 'sahaya_deleted_barter_item_ids';

const DUMMY_POST_IDS = new Set([
  'post_6843', 'post_4912', 'post_find_1', 'post_find_2',
  'post_from_1', 'post_from_2', 'post_from_3', 'post_1', 'post_2', 'post_3'
]);
const DUMMY_POST_CODES = new Set([
  '#HELP-6843', '#HELP-4912', '#HELP-3728', '#HELP-8891',
  '#FROM-4102', '#FROM-7729', '#FROM-8831'
]);
const DUMMY_GROUP_IDS = new Set(['grp_kelaniya_care', 'grp_dalada_sewa', 'grp_gam_mithuro']);
const DUMMY_MARKET_ITEM_IDS = new Set([
  'mkt_seller_1', 'mkt_seller_2', 'mkt_seller_3', 'mkt_seller_4',
  'mkt_seller_5', 'mkt_seller_6', 'mkt_seller_7', 'mkt_seller_8',
  'mkt_seller_free_1', 'mkt_seller_free_2', 'mkt_buyer_1', 'mkt_buyer_2'
]);
const DUMMY_MARKET_SHOP_IDS = new Set([
  'mkt_shop_1', 'mkt_shop_2', 'mkt_biz_1', 'mkt_biz_2',
  'shop_1', 'shop_2', 'shop_3', 'shop_4'
]);
const DUMMY_PRO_SERVICE_IDS = new Set(['ps_1', 'ps_2', 'ps_3', 'ps_4']);
const DUMMY_BLOOD_IDS = new Set(['bld_1', 'bld_2', 'bld_3', 'bld_4', 'bld_5']);
const DUMMY_DISASTER_IDS = new Set(['rel_1', 'rel_2', 'rel_3', 'rel_4', 'rel_5']);
const DUMMY_DONOR_IDS = new Set(['donor_1', 'donor_2', 'donor_3', 'donor_4', 'donor_5']);
const DUMMY_BARTER_IDS = new Set(['swap_001', 'swap_002', 'swap_003', 'swap_004', 'swap_005']);

// ==========================================
// Storage Helper Functions
// ==========================================
const inMemoryFallbackSets = new Map<string, Set<string>>();

function getStoredIds(key: string): string[] {
  const memSet = inMemoryFallbackSets.get(key) || new Set<string>();
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => memSet.add(String(id)));
        }
      }
    }
  } catch {}
  return Array.from(memSet);
}

function saveIds(key: string, ids: string[]): void {
  try {
    const memSet = inMemoryFallbackSets.get(key) || new Set<string>();
    ids.forEach((id) => memSet.add(String(id)));
    inMemoryFallbackSets.set(key, memSet);

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(Array.from(memSet)));
    }
    // LocalStorage වෙනස් වූ වහාම Firestore Cloud එකට Sync කෙරේ
    syncAllDeletionsToCloud();
  } catch (err) {
    console.warn(`Failed to save deleted IDs to storage key: ${key}`, err);
  }
}

// ==========================================
// Firestore Sync Logic
// ==========================================
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
export function syncAllDeletionsToCloud(): void {
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
        deletedJobIds: getStoredDeletedJobIds(),
        deletedAccommodationIds: getStoredDeletedAccommodationIds(),
        deletedBarterItemIds: getStoredDeletedBarterItemIds(),
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
      let changed = false;

      const mergeKey = (key: string, currentFn: () => string[], incoming?: string[]) => {
        if (Array.isArray(incoming) && incoming.length > 0) {
          const current = currentFn();
          const merged = Array.from(new Set([...current, ...incoming]));
          if (merged.length !== current.length) {
            localStorage.setItem(key, JSON.stringify(merged));
            changed = true;
          }
        }
      };

      mergeKey(DELETED_POST_IDS_KEY, getStoredDeletedPostIds, cloudRecords.deletedPostIds);
      mergeKey(DELETED_USERS_KEY, getStoredDeletedUserIds, cloudRecords.deletedUserIds);
      mergeKey(DELETED_BLOOD_IDS_KEY, getStoredDeletedBloodIds, cloudRecords.deletedBloodIds);
      mergeKey(DELETED_DISASTER_IDS_KEY, getStoredDeletedDisasterIds, cloudRecords.deletedDisasterIds);
      mergeKey(DELETED_DONOR_IDS_KEY, getStoredDeletedDonorIds, cloudRecords.deletedDonorIds);
      mergeKey(DELETED_RED_ALERTS_KEY, getStoredDeletedRedAlertIds, cloudRecords.deletedRedAlertIds);
      mergeKey(DELETED_MARKETPLACE_IDS_KEY, getStoredDeletedMarketplaceIds, cloudRecords.deletedMarketplaceIds);
      mergeKey(DELETED_MARKET_SHOPS_KEY, getStoredDeletedMarketShopIds, cloudRecords.deletedMarketShopIds);
      mergeKey(DELETED_PRO_SERVICES_KEY, getStoredDeletedProServiceIds, cloudRecords.deletedProServiceIds);
      mergeKey(DELETED_GROUP_IDS_KEY, getStoredDeletedGroupIds, cloudRecords.deletedGroupIds);
      mergeKey(DELETED_JOB_IDS_KEY, getStoredDeletedJobIds, cloudRecords.deletedJobIds);
      mergeKey(DELETED_ACCOMMODATION_IDS_KEY, getStoredDeletedAccommodationIds, cloudRecords.deletedAccommodationIds);
      mergeKey(DELETED_BARTER_ITEM_IDS_KEY, getStoredDeletedBarterItemIds, cloudRecords.deletedBarterItemIds);

      if (changed) {
        try {
          window.dispatchEvent(new Event('sahaya_post_deleted'));
          window.dispatchEvent(new Event('sahaya_marketplace_updated'));
          window.dispatchEvent(new Event('sahaya_sync_all_services'));
          window.dispatchEvent(new CustomEvent('sahaya_jobs_updated'));
          window.dispatchEvent(new CustomEvent('sahaya_accommodations_updated'));
          window.dispatchEvent(new CustomEvent('sahaya_barter_updated'));
          window.dispatchEvent(new CustomEvent('sahaya_blood_disaster_updated'));
        } catch {}
      }
    });
  } catch {}
}

// ==========================================
// Backup & Export Helpers (Step 1 & 2)
// ==========================================

export interface BackupDataWrapper<T = any> {
  version: string;
  entityType: string;
  deletedAt: string;
  deletedBy?: string;
  record: T;
}

/**
 * 1. Post/Item එකක Full details JSON ගොනුවක් ලෙස Admin ඩිවයිස් එකට Download කිරීම
 */
export function downloadBackupJSON<T extends { id?: string }>(
  itemData: T, 
  entityType: string = 'post',
  adminIdentifier?: string
): void {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const itemId = itemData?.id || 'unknown_id';
    
    const backupWrapper: BackupDataWrapper<T> = {
      version: '1.0',
      entityType,
      deletedAt: new Date().toISOString(),
      deletedBy: adminIdentifier || 'Admin',
      record: itemData
    };

    const jsonString = JSON.stringify(backupWrapper, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `deleted_${entityType}_${itemId}_${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download backup JSON:', err);
  }
}

/**
 * Restore කිරීම සඳහා Admin විසින් Select කරන Backup JSON file එක Parse කිරීම
 */
export async function parseBackupJSONFile<T = any>(file: File): Promise<BackupDataWrapper<T>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.record) {
          resolve(parsed as BackupDataWrapper<T>);
        } else {
          // Wrapper නැති පරණ Raw data JSON එකක් නම්
          resolve({
            version: '1.0',
            entityType: 'unknown',
            deletedAt: new Date().toISOString(),
            record: parsed
          });
        }
      } catch (err) {
        reject(new Error('Invalid JSON file format'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read backup file'));
    reader.readAsText(file);
  });
}

// ==========================================
// Permanent Cloud Cleanup Helpers (Step 3)
// ==========================================

/**
 * Firestore Document සහ Firebase Storage Media සදහටම Cleanup කිරීම
 * (Uses the configured named database `db` & `fallbackDb` from `../lib/firebase`)
 */
export async function permanentCloudCleanup(
  collectionName: string, 
  documentId: string, 
  mediaUrls: string[] = []
): Promise<void> {
  // 1. Storage Images / Media Delete කිරීම
  if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
    const deletePromises = mediaUrls.map(async (url) => {
      if (!url || typeof url !== 'string' || !url.includes('firebasestorage')) return;
      try {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
      } catch (err) {
        console.warn(`Failed to delete media asset: ${url}`, err);
      }
    });
    await Promise.allSettled(deletePromises);
  }

  // 2. Firestore Document Delete කිරීම (Both primary named db and fallback default db)
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
    if (fallbackDb && fallbackDb !== db) {
      deleteDoc(doc(fallbackDb, collectionName, documentId)).catch(() => {});
    }
  } catch (err) {
    console.error(`Failed to delete Firestore document: ${collectionName}/${documentId}`, err);
    throw err;
  }
}

// ==========================================
// Full Admin Permanent Delete Orchestrator
// ==========================================

export interface PermanentDeleteOptions {
  collectionName: string;
  itemId: string;
  itemData: any;
  entityType?: string;
  mediaUrls?: string[];
  adminIdentifier?: string;
  blacklistKey: string;
}

/**
 * Step 1-4 දක්වා සම්පූර්ණ Admin Delete Workflow එක ක්‍රියාත්මක කිරීම
 */
export async function executePermanentAdminDelete(options: PermanentDeleteOptions): Promise<void> {
  const {
    collectionName,
    itemId,
    itemData,
    entityType = 'post',
    mediaUrls = [],
    adminIdentifier,
    blacklistKey
  } = options;

  // Step 1 & 2: Backup JSON auto-download කිරීම
  downloadBackupJSON(itemData, entityType, adminIdentifier);

  // Step 3: Cloud Cleanup (Firestore & Storage)
  await permanentCloudCleanup(collectionName, itemId, mediaUrls);

  // Step 3 (cont.): Local Blacklist එකට ID එක එකතු කර Cloud sync කිරීම
  const currentBlacklist = getStoredIds(blacklistKey);
  saveIds(blacklistKey, [...currentBlacklist, itemId]);

  // Step 4: UI Event Broadcast කිරීම
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sahaya_entity_deleted', {
      detail: { itemId, entityType, collectionName }
    }));
  }
}

// ==========================================
// Restore Helper Functions
// ==========================================

/**
 * Blacklist එකෙන් ID එකක් ඉවත් කර Item එක Restore කිරීම සක්‍රිය කිරීම
 */
export function restoreDeletedId(blacklistKey: string, idToRestore: string): void {
  if (!idToRestore) return;
  const current = getStoredIds(blacklistKey);
  const updated = current.filter(
    (id) => id !== idToRestore && id.toLowerCase() !== idToRestore.toLowerCase()
  );
  saveIds(blacklistKey, updated);
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
  restoreDeletedId(DELETED_USERS_KEY, identifier.trim());
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
// Cache Purge Helper
// ==========================================
export function purgeItemFromLocalStorage(targetId: string): void {
  if (!targetId || typeof window === 'undefined') return;
  const idStr = String(targetId).trim();
  const rawId = idStr.replace(/^post_/, '');

  const storageKeys = [
    'sahaya_help_posts',
    'sahaya_blood_requests',
    'sahaya_disaster_relief',
    'sahaya_marketplace_items',
    'sahaya_market_shops',
    'sahaya_jobs',
    'sahaya_accommodations',
    'sahaya_barter_items',
    'sahaya_groups',
    'sahaya_professional_services',
    'sahaya_red_alerts'
  ];

  storageKeys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((item: any) => {
            if (!item) return false;
            const itemId = String(item.id || item._id || '').trim();
            const itemCode = String(item.postCode || '').trim();
            if (itemId === idStr || itemId === rawId || itemId === 'post_' + rawId) return false;
            if (itemCode && (itemCode === idStr || itemCode === rawId)) return false;
            return true;
          });
          if (filtered.length !== parsed.length) {
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        }
      }
    } catch {}
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
  const pId = String(postId).trim();
  const cleanId = pId.replace(/^post_/, '');
  const current = getStoredDeletedPostIds();
  const toAdd = [pId, cleanId, 'post_' + cleanId];
  const updated = Array.from(new Set([...current, ...toAdd]));
  saveIds(DELETED_POST_IDS_KEY, updated);

  // If this ID belongs to emergency blood, disaster, or marketplace, also add to respective sets
  if (pId.startsWith('bld_') || pId.startsWith('blood_')) addDeletedBloodId(pId);
  if (pId.startsWith('rel_') || pId.startsWith('relief_')) addDeletedDisasterId(pId);
  if (pId.startsWith('mkt_')) addDeletedMarketplaceId(pId);
  if (pId.startsWith('job_')) addDeletedJobId(pId);
  if (pId.startsWith('acc_')) addDeletedAccommodationId(pId);
  if (pId.startsWith('barter_') || pId.startsWith('swap_')) addDeletedBarterItemId(pId);
  if (pId.startsWith('red_alert_') || pId.startsWith('alert_')) addDeletedRedAlertId(pId);
  if (pId.startsWith('grp_') || pId.startsWith('group_')) addDeletedGroupId(pId);
  if (pId.startsWith('ps_')) addDeletedProServiceId(pId);

  // Purge immediately from local storage cache lists
  purgeItemFromLocalStorage(pId);
}

export function removeDeletedPostId(postId: string): void {
  if (!postId) return;
  restoreDeletedId(DELETED_POST_IDS_KEY, postId);
}

export function isPostPermanentlyDeleted(postId: string): boolean {
  if (!postId) return false;
  const pId = String(postId).trim();
  const cleanId = pId.replace(/^post_/, '');
  const deletedPosts = getStoredDeletedPostIds();
  const deletedBlood = getStoredDeletedBloodIds();
  const deletedDisaster = getStoredDeletedDisasterIds();
  const deletedMarket = getStoredDeletedMarketplaceIds();
  const deletedJobs = getStoredDeletedJobIds();
  const deletedAcc = getStoredDeletedAccommodationIds();
  const deletedBarter = getStoredDeletedBarterItemIds();
  const deletedAlerts = getStoredDeletedRedAlertIds();

  return (
    deletedPosts.includes(pId) ||
    deletedPosts.includes(cleanId) ||
    deletedPosts.includes('post_' + cleanId) ||
    deletedBlood.includes(pId) ||
    deletedDisaster.includes(pId) ||
    deletedMarket.includes(pId) ||
    deletedJobs.includes(pId) ||
    deletedAcc.includes(pId) ||
    deletedBarter.includes(pId) ||
    deletedAlerts.includes(pId)
  );
}

/**
 * Workflow Step 1 & 2:
 * දැන්වීමක් මැකීමට පෙර එහි සියලු දත්ත (ID, Title, Details, Photos, Owner details)
 * `deleted_post_[POST_ID]_[TIMESTAMP].json` ලෙස ස්වයංක්‍රීයව පරිශීලකයාගේ උපකරණයට Save/Download කරවීම.
 */
const recentlyDownloadedBackupIds = new Set<string>();

export function downloadPostBackupJson(post: HelpPost, user?: User | null): boolean {
  if (!post || typeof window === 'undefined') return false;

  // ඇඩ්මින්වරයෙකු පමණක් දැයි පරීක්ෂා කිරීම (සාමාන්‍ය පරිශීලකයින්ට බාගත නොවේ)
  let currentUserToCheck = user;
  if (!currentUserToCheck) {
    try {
      const saved = localStorage.getItem('sahaya_sewa_session_user');
      if (saved) {
        currentUserToCheck = JSON.parse(saved);
      }
    } catch {}
  }

  if (!checkIsAdmin(currentUserToCheck)) {
    return false;
  }

  // එකම දැන්වීම එකවර දෙවරක් බාගත වීම වැළැක්වීම (Deduplication)
  const safeId = post.id || post.postCode || 'unknown';
  if (recentlyDownloadedBackupIds.has(safeId)) {
    return true;
  }
  recentlyDownloadedBackupIds.add(safeId);
  setTimeout(() => {
    recentlyDownloadedBackupIds.delete(safeId);
  }, 5000);

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeId = post.id || post.postCode || 'unknown';
    const filename = `deleted_post_${safeId}_${timestamp}.json`;
    
    const pAny = post as any;
    const backupPayload = {
      backupType: 'DELETED_HELP_POST_BACKUP',
      exportedAt: new Date().toISOString(),
      postId: post.id,
      postCode: post.postCode,
      category: post.category,
      title: pAny.title || post.whatHappened || '',
      whatHappened: post.whatHappened,
      whatIsNeeded: post.whatIsNeeded,
      location: pAny.location || pAny.address || '',
      district: pAny.district || '',
      policeDivision: pAny.policeDivision || '',
      userName: post.userName,
      userPhone: post.userPhone,
      userId: pAny.userId || '',
      photos: pAny.photos || pAny.images || [],
      tags: pAny.tags || [],
      status: post.status,
      createdAt: post.createdAt,
      fullRecord: post
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.warn('downloadPostBackupJson error:', err);
    return false;
  }
}

export function filterNonDeletedPosts<T extends { id?: string; isDeleted?: boolean; status?: string }>(posts: T[]): T[] {
  if (!Array.isArray(posts)) return [];
  const deletedPosts = getStoredDeletedPostIds();
  const deletedBlood = getStoredDeletedBloodIds();
  const deletedDisaster = getStoredDeletedDisasterIds();
  const deletedMarket = getStoredDeletedMarketplaceIds();
  const deletedJobs = getStoredDeletedJobIds();
  const deletedAcc = getStoredDeletedAccommodationIds();
  const deletedBarter = getStoredDeletedBarterItemIds();
  const deletedAlerts = getStoredDeletedRedAlertIds();

  const allDeletedIds = new Set([
    ...deletedPosts,
    ...deletedBlood,
    ...deletedDisaster,
    ...deletedMarket,
    ...deletedJobs,
    ...deletedAcc,
    ...deletedBarter,
    ...deletedAlerts,
  ]);

  return posts.filter((p) => {
    if (!p || !p.id) return false;
    const id = String(p.id).trim();
    const cleanId = id.replace(/^post_/, '');
    if (allDeletedIds.has(id) || allDeletedIds.has(cleanId) || allDeletedIds.has('post_' + cleanId)) return false;
    if (p.isDeleted || p.status === 'deleted') return false;
    if (DUMMY_POST_IDS.has(id) || DUMMY_POST_IDS.has(cleanId)) return false;
    const pAny = p as any;
    if (pAny.postCode && DUMMY_POST_CODES.has(String(pAny.postCode))) return false;
    if (pAny.postCode && allDeletedIds.has(String(pAny.postCode))) return false;
    if (pAny.isDummy || pAny.isSample || pAny.isDemoPost) return false;
    return true;
  });
}

// Real-time UI broadcast (Layer 3 Event Triggering)
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

export function removeDeletedBloodId(bloodId: string): void {
  restoreDeletedId(DELETED_BLOOD_IDS_KEY, bloodId);
}

export function filterNonDeletedBloodRequests(requests: BloodDonationRequest[]): BloodDonationRequest[] {
  if (!Array.isArray(requests)) return [];
  const deletedIds = new Set(getStoredDeletedBloodIds());
  return requests.filter((r) => r && r.id && !deletedIds.has(r.id) && !DUMMY_BLOOD_IDS.has(r.id));
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

export function removeDeletedDisasterId(disasterId: string): void {
  restoreDeletedId(DELETED_DISASTER_IDS_KEY, disasterId);
}

export function filterNonDeletedDisasterItems(items: DisasterReliefItem[]): DisasterReliefItem[] {
  if (!Array.isArray(items)) return [];
  const deletedIds = new Set(getStoredDeletedDisasterIds());
  return items.filter((d) => d && d.id && !deletedIds.has(d.id) && !DUMMY_DISASTER_IDS.has(d.id));
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

export function removeDeletedDonorId(donorId: string): void {
  restoreDeletedId(DELETED_DONOR_IDS_KEY, donorId);
}

export function filterNonDeletedDonors(donors: VolunteerDonor[]): VolunteerDonor[] {
  if (!Array.isArray(donors)) return [];
  const deletedIds = new Set(getStoredDeletedDonorIds());
  return donors.filter((d) => d && d.id && !deletedIds.has(d.id) && !DUMMY_DONOR_IDS.has(d.id));
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

export function removeDeletedMarketplaceId(itemId: string): void {
  restoreDeletedId(DELETED_MARKETPLACE_IDS_KEY, itemId);
}

export function filterNonDeletedMarketItems<T extends { id?: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const deletedIds = new Set(getStoredDeletedMarketplaceIds());
  return items.filter((item) => item && item.id && !deletedIds.has(item.id) && !DUMMY_MARKET_ITEM_IDS.has(item.id));
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

export function removeDeletedMarketShopId(shopId: string): void {
  restoreDeletedId(DELETED_MARKET_SHOPS_KEY, shopId);
}

export function filterNonDeletedMarketShops<T extends { id?: string }>(shops: T[]): T[] {
  if (!Array.isArray(shops)) return [];
  const deletedIds = new Set(getStoredDeletedMarketShopIds());
  return shops.filter((shop) => shop && shop.id && !deletedIds.has(shop.id) && !DUMMY_MARKET_SHOP_IDS.has(shop.id));
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

export function removeDeletedProServiceId(serviceId: string): void {
  restoreDeletedId(DELETED_PRO_SERVICES_KEY, serviceId);
}

export function filterNonDeletedProServices<T extends { id?: string }>(services: T[]): T[] {
  if (!Array.isArray(services)) return [];
  const deletedIds = new Set(getStoredDeletedProServiceIds());
  return services.filter((s) => s && s.id && !deletedIds.has(s.id) && !DUMMY_PRO_SERVICE_IDS.has(s.id));
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

export function removeDeletedGroupId(groupId: string): void {
  restoreDeletedId(DELETED_GROUP_IDS_KEY, groupId);
}

export function filterNonDeletedGroups<T extends { id?: string }>(groups: T[]): T[] {
  if (!Array.isArray(groups)) return [];
  const deletedIds = new Set(getStoredDeletedGroupIds());
  return groups.filter(
    (g) => g && g.id && !deletedIds.has(g.id) && !DUMMY_GROUP_IDS.has(g.id) && !g.id.startsWith('grp_demo_')
  );
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
  restoreDeletedId(DELETED_RED_ALERTS_KEY, alertId);
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

// ==========================================
// 10. Jobs, Accommodations & Barter Items
// ==========================================
export function getStoredDeletedJobIds(): string[] {
  return getStoredIds(DELETED_JOB_IDS_KEY);
}

export function addDeletedJobId(jobId: string): void {
  if (!jobId) return;
  const current = getStoredDeletedJobIds();
  if (!current.includes(jobId)) {
    saveIds(DELETED_JOB_IDS_KEY, [...current, jobId]);
  }
}

export function filterNonDeletedJobs<T extends { id?: string }>(jobs: T[]): T[] {
  if (!Array.isArray(jobs)) return [];
  const deletedIds = new Set(getStoredDeletedJobIds());
  return jobs.filter((j) => j && j.id && !deletedIds.has(j.id));
}

export function getStoredDeletedAccommodationIds(): string[] {
  return getStoredIds(DELETED_ACCOMMODATION_IDS_KEY);
}

export function addDeletedAccommodationId(accId: string): void {
  if (!accId) return;
  const current = getStoredDeletedAccommodationIds();
  if (!current.includes(accId)) {
    saveIds(DELETED_ACCOMMODATION_IDS_KEY, [...current, accId]);
  }
}

export function filterNonDeletedAccommodations<T extends { id?: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const deletedIds = new Set(getStoredDeletedAccommodationIds());
  return items.filter((i) => i && i.id && !deletedIds.has(i.id));
}

export function getStoredDeletedBarterItemIds(): string[] {
  return getStoredIds(DELETED_BARTER_ITEM_IDS_KEY);
}

export function addDeletedBarterItemId(itemId: string): void {
  if (!itemId) return;
  const current = getStoredDeletedBarterItemIds();
  if (!current.includes(itemId)) {
    saveIds(DELETED_BARTER_ITEM_IDS_KEY, [...current, itemId]);
  }
}

export function filterNonDeletedBarterItems<T extends { id?: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const deletedIds = new Set(getStoredDeletedBarterItemIds());
  return items.filter((i) => i && i.id && !deletedIds.has(i.id) && !DUMMY_BARTER_IDS.has(i.id));
}

// Export Key Constants (Restore/Admin Actions සඳහා භාවිත කිරීමට)
export const STORAGE_KEYS = {
  POSTS: DELETED_POST_IDS_KEY,
  USERS: DELETED_USERS_KEY,
  BLOOD: DELETED_BLOOD_IDS_KEY,
  DISASTER: DELETED_DISASTER_IDS_KEY,
  DONORS: DELETED_DONOR_IDS_KEY,
  RED_ALERTS: DELETED_RED_ALERTS_KEY,
  MARKETPLACE: DELETED_MARKETPLACE_IDS_KEY,
  MARKET_SHOPS: DELETED_MARKET_SHOPS_KEY,
  PRO_SERVICES: DELETED_PRO_SERVICES_KEY,
  GROUPS: DELETED_GROUP_IDS_KEY,
  JOBS: DELETED_JOB_IDS_KEY,
  ACCOMMODATIONS: DELETED_ACCOMMODATION_IDS_KEY,
  BARTER_ITEMS: DELETED_BARTER_ITEM_IDS_KEY,
};

import { checkIsAdmin } from './postOwnerHelper';
import { HelpPost, BloodDonationRequest, DisasterReliefItem, VolunteerDonor, RedAlertItem, User } from '../types';
import { saveDeletedRecordsToFirestore, subscribeToDeletedRecordsFromFirestore, DeletedRecordsMap } from '../lib/firebase';
import { doc, deleteDoc, getFirestore } from 'firebase/firestore';
import { ref, deleteObject, getStorage } from 'firebase/storage';
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
const DUMMY_POST_IDS = new Set(['post_6843', 'post_4912', 'post_find_1', 'post_find_2', 'post_from_1', 'post_from_2', 'post_from_3', 'post_1', 'post_2', 'post_3']);
const DUMMY_POST_CODES = new Set(['#HELP-6843', '#HELP-4912', '#HELP-3728', '#HELP-8891', '#FROM-4102', '#FROM-7729', '#FROM-8831']);
const DUMMY_GROUP_IDS = new Set(['grp_kelaniya_care', 'grp_dalada_sewa', 'grp_gam_mithuro']);
const DUMMY_MARKET_ITEM_IDS = new Set(['mkt_seller_1', 'mkt_seller_2', 'mkt_seller_3', 'mkt_seller_4', 'mkt_seller_5', 'mkt_seller_6', 'mkt_seller_7', 'mkt_seller_8', 'mkt_seller_free_1', 'mkt_seller_free_2', 'mkt_buyer_1', 'mkt_buyer_2']);
const DUMMY_MARKET_SHOP_IDS = new Set(['mkt_shop_1', 'mkt_shop_2', 'mkt_biz_1', 'mkt_biz_2', 'shop_1', 'shop_2', 'shop_3', 'shop_4']);
const DUMMY_PRO_SERVICE_IDS = new Set(['ps_1', 'ps_2', 'ps_3', 'ps_4']);
const DUMMY_BLOOD_IDS = new Set(['bld_1', 'bld_2', 'bld_3', 'bld_4', 'bld_5']);
const DUMMY_DISASTER_IDS = new Set(['rel_1', 'rel_2', 'rel_3', 'rel_4', 'rel_5']);
const DUMMY_DONOR_IDS = new Set(['donor_1', 'donor_2', 'donor_3', 'donor_4', 'donor_5']);
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
function saveIds(key: string, ids: any): void {
try {
localStorage.setItem(key, JSON.stringify(Array.from(new Set(ids))));
syncAllDeletionsToCloud();
} catch (err) {
console.warn("Failed to save deleted IDs to storage key: " + key, err);
}
}
let syncTimeout: any = null;
export function syncAllDeletionsToCloud(): void {
if (syncTimeout) clearTimeout(syncTimeout);
syncTimeout = setTimeout(() => {
try {
const payload: any = {
deletedPostIds: getStoredDeletedPostIds(),
deletedUserIds: getStoredDeletedUserIds(),
deletedBloodIds: getStoredDeletedBloodIds(),
deletedDisasterIds: getStoredDeletedDisasterIds(),
deletedDonorIds: getStoredDeletedDonorIds(),
deletedRedAlertIds: getStoredDeletedRedAlertIds(),
deletedMarketplaceIds: getStoredDeletedMarketplaceIds(),
deletedMarketShopIds: getStoredDeletedMarketShopIds(),
deletedProServiceIds: getStoredDeletedProServiceIds(),
deletedGroupIds: getStoredDeletedGroupIds()
};
saveDeletedRecordsToFirestore(payload).catch(() => {});
} catch {}
}, 300);
}
if (typeof window !== 'undefined') {
try {
subscribeToDeletedRecordsFromFirestore(cloudRecords => {
if (!cloudRecords) return;
if (Array.isArray(cloudRecords.deletedPostIds) && Math.max(cloudRecords.deletedPostIds.length, 0) === cloudRecords.deletedPostIds.length && cloudRecords.deletedPostIds.length !== 0) {
const merged = Array.from(new Set([...getStoredDeletedPostIds(), ...cloudRecords.deletedPostIds]));
localStorage.setItem(DELETED_POST_IDS_KEY, JSON.stringify(merged));
}
if (Array.isArray(cloudRecords.deletedUserIds) && Math.max(cloudRecords.deletedUserIds.length, 0) === cloudRecords.deletedUserIds.length && cloudRecords.deletedUserIds.length !== 0) {
const merged = Array.from(new Set([...getStoredDeletedUserIds(), ...cloudRecords.deletedUserIds]));
localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(merged));
}
if (Array.isArray(cloudRecords.deletedBloodIds) && Math.max(cloudRecords.deletedBloodIds.length, 0) === cloudRecords.deletedBloodIds.length && cloudRecords.deletedBloodIds.length !== 0) {
const merged = Array.from(new Set([...getStoredDeletedBloodIds(), ...cloudRecords.deletedBloodIds]));
localStorage.setItem(DELETED_BLOOD_IDS_KEY, JSON.stringify(merged));
}
if (Array.isArray(cloudRecords.deletedDisasterIds) && Math.max(cloudRecords.deletedDisasterIds.length, 0) === cloudRecords.deletedDisasterIds.length && cloudRecords.deletedDisasterIds.length !== 0) {
const merged = Array.from(new Set([...getStoredDeletedDisasterIds(), ...cloudRecords.deletedDisasterIds]));
localStorage.setItem(DELETED_DISASTER_IDS_KEY, JSON.stringify(merged));
}
if (Array.isArray(cloudRecords.deletedDonorIds) && Math.max(cloudRecords.deletedDonorIds.length, 0) === cloudRecords.deletedDonorIds.length && cloudRecords.deletedDonorIds.length !== 0) {
const merged = Array.from(new Set([...getStoredDeletedDonorIds(), ...cloudRecords.deletedDonorIds]));
localStorage.setItem(DELETED_DONOR_IDS_KEY, JSON.stringify(merged));
}
if (Array.isArray(cloudRecords.deletedRedAlertIds) && Math.max(cloudRecords.deletedRedAlertIds.length, 0) === cloudRecords.deletedRedAlertIds.length && cloudRecords.deletedRedAlertIds.length !== 0) {
const merged = Array.from(new Set([...getStoredDeletedRedAlertIds(), ...cloudRecords.deletedRedAlertIds]));
localStorage.setItem(DELETED_RED_ALERTS_KEY, JSON.stringify(merged));
}
if (Array.isArray(cloudRecords.deletedMarketplaceIds) && Math.max(cloudRecords.deletedMarketplaceIds.length, 0) === cloudRecords.deletedMarketplaceIds.length && cloudRecords.deletedMarketplaceIds.length !== 0) {
const merged = Array.from(new Set([...getStoredDeletedMarketplaceIds(), ...cloudRecords.deletedMarketplaceIds]));
localStorage.setItem(DELETED_MARKETPLACE_IDS_KEY, JSON.stringify(merged));
}
if (Array.isArray(cloudRecords.deletedMarketShopIds) && Math.max(cloudRecords.deletedMarketShopIds.length, 0) === cloudRecords.deletedMarketShopIds.length && cloudRecords.deletedMarketShopIds.length !== 0) {
const merged = Array.from(new Set([...getStoredDeletedMarketShopIds(), ...cloudRecords.deletedMarketShopIds]));
localStorage.setItem(DELETED_MARKET_SHOPS_KEY, JSON.stringify(merged));
}
if (Array.isArray(cloudRecords.deletedProServiceIds) && Math.max(cloudRecords.deletedProServiceIds.length, 0) === cloudRecords.deletedProServiceIds.length && cloudRecords.deletedProServiceIds.length !== 0) {
const merged = Array.from(new Set([...getStoredDeletedProServiceIds(), ...cloudRecords.deletedProServiceIds]));
localStorage.setItem(DELETED_PRO_SERVICES_KEY, JSON.stringify(merged));
}
if (Array.isArray(cloudRecords.deletedGroupIds) && Math.max(cloudRecords.deletedGroupIds.length, 0) === cloudRecords.deletedGroupIds.length && cloudRecords.deletedGroupIds.length !== 0) {
const merged = Array.from(new Set([...getStoredDeletedGroupIds(), ...cloudRecords.deletedGroupIds]));
localStorage.setItem(DELETED_GROUP_IDS_KEY, JSON.stringify(merged));
}
});
} catch {}
}
export interface BackupDataWrapper {
version: string;
entityType: string;
deletedAt: string;
deletedBy?: string;
record: any;
}
export function downloadBackupJSON(itemData: any, entityType: string = 'post', adminIdentifier?: string): void {
try {
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const itemId = itemData.id ? itemData.id : 'unknown_id';
const backupWrapper: any = {
version: '1.0',
entityType,
deletedAt: new Date().toISOString(),
deletedBy: adminIdentifier ? adminIdentifier : 'Admin',
record: itemData
};
const jsonString = JSON.stringify(backupWrapper, null, 2);
const blob = new Blob([jsonString], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = "deleted_" + entityType + "" + itemId + "" + timestamp + ".json";
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
URL.revokeObjectURL(url);
} catch (err) {
console.error('Failed to download backup JSON:', err);
}
}
export async function parseBackupJSONFile(file: any): any {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = event => {
try {
const parsed = JSON.parse((event.target?.result as string));
if (parsed && parsed.record) {
resolve((parsed as any));
} else {
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
export async function permanentCloudCleanup(collectionName: string, documentId: string, mediaUrls: any = []): any {
const db = getFirestore();
const storage = getStorage();
if (Array.isArray(mediaUrls) && Math.max(mediaUrls.length, 0) === mediaUrls.length && mediaUrls.length !== 0) {
const deletePromises = mediaUrls.map(async url => {
if ((!url ? !url : typeof url !== 'string') ? !url ? !url : typeof url !== 'string' : !url.includes('firebasestorage')) return;
try {
const storageRef = ref(storage, url);
await deleteObject(storageRef);
} catch (err) {
console.warn("Failed to delete media asset: " + url, err);
}
});
await Promise.allSettled(deletePromises);
}
try {
const docRef = doc(db, collectionName, documentId);
await deleteDoc(docRef);
} catch (err) {
console.error("Failed to delete Firestore document: " + collectionName + "/" + documentId, err);
throw err;
}
}
export interface PermanentDeleteOptions {
collectionName: string;
itemId: string;
itemData: any;
entityType?: string;
mediaUrls?: any;
adminIdentifier?: string;
blacklistKey: string;
}
export async function executePermanentAdminDelete(options: any): any {
const {
collectionName,
itemId,
itemData,
entityType = 'post',
mediaUrls = [],
adminIdentifier,
blacklistKey
} = options;
downloadBackupJSON(itemData, entityType, adminIdentifier);
await permanentCloudCleanup(collectionName, itemId, mediaUrls);
const currentBlacklist = getStoredIds(blacklistKey);
saveIds(blacklistKey, [...currentBlacklist, itemId]);
if (typeof window !== 'undefined') {
window.dispatchEvent(new CustomEvent('sahaya_entity_deleted', {
detail: {
itemId,
entityType,
collectionName
}
}));
}
}
export function restoreDeletedId(blacklistKey: string, idToRestore: string): void {
if (!idToRestore) return;
const current = getStoredIds(blacklistKey);
const updated = current.filter(id => id !== idToRestore && id.toLowerCase() !== idToRestore.toLowerCase());
saveIds(blacklistKey, updated);
}
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
const deletedSet = new Set(getStoredDeletedUserIds().map(s => s.toLowerCase()));
if (typeof userOrId === 'string') {
return deletedSet.has(userOrId.trim().toLowerCase());
}
const id = userOrId.id ? String(userOrId.id).trim().toLowerCase() : '';
const userId = userOrId.userId ? String(userOrId.userId).trim().toLowerCase() : '';
const nic = userOrId.nicNumber ? String(userOrId.nicNumber).trim().toLowerCase() : '';
return Boolean((id && deletedSet.has(id) ? id && deletedSet.has(id) : userId && deletedSet.has(userId)) ? id && deletedSet.has(id) ? id && deletedSet.has(id) : userId && deletedSet.has(userId) : nic && deletedSet.has(nic));
}
export function filterNonDeletedUsers(users: any): User[] {
if (!Array.isArray(users)) return [];
const deletedSet = new Set(getStoredDeletedUserIds().map(s => s.toLowerCase()));
return users.filter(u => {
if (!u) return false;
if ((u.status as string) === 'deleted' ? (u.status as string) === 'deleted' : (u as any).isDeleted) return false;
const id = u.id ? String(u.id).trim().toLowerCase() : '';
const userId = u.userId ? String(u.userId).trim().toLowerCase() : '';
const nic = u.nicNumber ? String(u.nicNumber).trim().toLowerCase() : '';
if (id && deletedSet.has(id)) return false;
if (userId && deletedSet.has(userId)) return false;
if (nic && deletedSet.has(nic)) return false;
return true;
});
}
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
restoreDeletedId(DELETED_POST_IDS_KEY, postId);
}
export function isPostPermanentlyDeleted(postId: string): boolean {
if (!postId) return false;
return getStoredDeletedPostIds().includes(postId);
}
const recentlyDownloadedBackupIds = new Set();
export function downloadPostBackupJson(post: any, user?: any): boolean {
if (!post ? !post : typeof window === 'undefined') return false;
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
const safeId = (post.id ? post.id : post.postCode) ? post.id ? post.id : post.postCode : 'unknown';
if (recentlyDownloadedBackupIds.has(safeId)) {
return true;
}
recentlyDownloadedBackupIds.add(safeId);
setTimeout(() => {
recentlyDownloadedBackupIds.delete(safeId);
}, 5000);
try {
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const safeId = (post.id ? post.id : post.postCode) ? post.id ? post.id : post.postCode : 'unknown';
const filename = "deleted_post_" + safeId + "" + timestamp + ".json";
const pAny = (post as any);
const backupPayload = {
backupType: 'DELETED_HELP_POST_BACKUP',
exportedAt: new Date().toISOString(),
postId: post.id,
postCode: post.postCode,
category: post.category,
title: (pAny.title ? pAny.title : post.whatHappened) ? pAny.title ? pAny.title : post.whatHappened : '',
whatHappened: post.whatHappened,
whatIsNeeded: post.whatIsNeeded,
location: (pAny.location ? pAny.location : pAny.address) ? pAny.location ? pAny.location : pAny.address : '',
district: pAny.district ? pAny.district : '',
policeDivision: pAny.policeDivision ? pAny.policeDivision : '',
userName: post.userName,
userPhone: post.userPhone,
userId: pAny.userId ? pAny.userId : '',
photos: (pAny.photos ? pAny.photos : pAny.images) ? pAny.photos ? pAny.photos : pAny.images : [],
tags: pAny.tags ? pAny.tags : [],
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
export function filterNonDeletedPosts(posts: any): any {
if (!Array.isArray(posts)) return [];
const deletedIds = new Set(getStoredDeletedPostIds());
return posts.filter(p => {
if (!p ? !p : !p.id) return false;
if ((deletedIds.has(p.id) ? deletedIds.has(p.id) : p.isDeleted) ? deletedIds.has(p.id) ? deletedIds.has(p.id) : p.isDeleted : p.status === 'deleted') return false;
if (DUMMY_POST_IDS.has(p.id)) return false;
const pAny = (p as any);
if (pAny.postCode && DUMMY_POST_CODES.has(String(pAny.postCode))) return false;
if ((pAny.isDummy ? pAny.isDummy : pAny.isSample) ? pAny.isDummy ? pAny.isDummy : pAny.isSample : pAny.isDemoPost) return false;
return true;
});
}
export function broadcastPostDeletion(postId: string): void {
addDeletedPostId(postId);
if (typeof window !== 'undefined') {
window.dispatchEvent(new Event('sahaya_post_deleted'));
}
}
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
export function filterNonDeletedBloodRequests(requests: any): BloodDonationRequest[] {
if (!Array.isArray(requests)) return [];
const deletedIds = new Set(getStoredDeletedBloodIds());
return requests.filter(r => {
if (!r ? !r : !r.id) return false;
if (deletedIds.has(r.id) ? deletedIds.has(r.id) : DUMMY_BLOOD_IDS.has(r.id)) return false;
if (/^bld[0-9]+$/.test(r.id)) return false;
return true;
});
}
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
export function filterNonDeletedDisasterItems(items: any): DisasterReliefItem[] {
if (!Array.isArray(items)) return [];
const deletedIds = new Set(getStoredDeletedDisasterIds());
return items.filter(d => {
if (!d ? !d : !d.id) return false;
if (deletedIds.has(d.id) ? deletedIds.has(d.id) : DUMMY_DISASTER_IDS.has(d.id)) return false;
if (/^rel_[0-9]+$/.test(d.id)) return false;
return true;
});
}
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
export function filterNonDeletedDonors(donors: any): VolunteerDonor[] {
if (!Array.isArray(donors)) return [];
const deletedIds = new Set(getStoredDeletedDonorIds());
return donors.filter(d => {
if (!d ? !d : !d.id) return false;
if (deletedIds.has(d.id) ? deletedIds.has(d.id) : DUMMY_DONOR_IDS.has(d.id)) return false;
if (/^donor_[0-9]+$/.test(d.id)) return false;
return true;
});
}
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
export function filterNonDeletedMarketItems(items: any): any {
if (!Array.isArray(items)) return [];
const deletedIds = new Set(getStoredDeletedMarketplaceIds());
return items.filter(item => {
if (!item ? !item : !item.id) return false;
if (deletedIds.has(item.id) ? deletedIds.has(item.id) : DUMMY_MARKET_ITEM_IDS.has(item.id)) return false;
if (/^mkt_seller_[0-9]+$/.test(item.id) ? true : /^mkt_buyer_[0-9]+$/.test(item.id)) return false;
if (/^mkt_seller_free_[0-9]+$/.test(item.id)) return false;
return true;
});
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
export function filterNonDeletedMarketShops(shops: any): any {
if (!Array.isArray(shops)) return [];
const deletedIds = new Set(getStoredDeletedMarketShopIds());
return shops.filter(shop => {
if (!shop ? !shop : !shop.id) return false;
if (deletedIds.has(shop.id) ? deletedIds.has(shop.id) : DUMMY_MARKET_SHOP_IDS.has(shop.id)) return false;
if (/^mkt_shop_[0-9]+$/.test(shop.id) ? true : /^mkt_biz_[0-9]+$/.test(shop.id)) return false;
if (/^shop_[0-9]+$/.test(shop.id)) return false;
return true;
});
}
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
export function filterNonDeletedProServices(services: any): any {
if (!Array.isArray(services)) return [];
const deletedIds = new Set(getStoredDeletedProServiceIds());
return services.filter(s => {
if (!s ? !s : !s.id) return false;
if (deletedIds.has(s.id) ? deletedIds.has(s.id) : DUMMY_PRO_SERVICE_IDS.has(s.id)) return false;
if (/^ps_[0-9]+$/.test(s.id)) return false;
return true;
});
}
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
export function filterNonDeletedGroups(groups: any): any {
if (!Array.isArray(groups)) return [];
const deletedIds = new Set(getStoredDeletedGroupIds());
return groups.filter(g => {
if (!g ? !g : !g.id) return false;
if (deletedIds.has(g.id) ? deletedIds.has(g.id) : DUMMY_GROUP_IDS.has(g.id)) return false;
if (g.id.startsWith('grp_demo_')) return false;
return true;
});
}
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
export function filterNonDeletedRedAlerts(alerts: any): RedAlertItem[] {
if (!Array.isArray(alerts)) return [];
const deletedIds = new Set(getStoredDeletedRedAlertIds());
return alerts.filter(a => a && a.id && !deletedIds.has(a.id) && !(a as any).isDeleted && (a.status as string) !== 'deleted');
}
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
GROUPS: DELETED_GROUP_IDS_KEY
};

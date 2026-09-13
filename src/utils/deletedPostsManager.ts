import { HelpPost, BloodDonationRequest, DisasterReliefItem, VolunteerDonor } from '../types';

const DELETED_POST_IDS_KEY = 'sahaya_deleted_post_ids';
const DELETED_BLOOD_IDS_KEY = 'sahaya_deleted_blood_ids';
const DELETED_DISASTER_IDS_KEY = 'sahaya_deleted_disaster_ids';
const DELETED_DONOR_IDS_KEY = 'sahaya_deleted_donor_ids';

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
  } catch (err) {
    console.warn(`Failed to save deleted IDs to storage key: ${key}`, err);
  }
}

// ----------------- Help Posts -----------------
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

export function filterNonDeletedPosts(posts: HelpPost[]): HelpPost[] {
  if (!Array.isArray(posts)) return [];
  const deletedIds = new Set(getStoredDeletedPostIds());
  return posts.filter((p) => p && p.id && !deletedIds.has(p.id) && !p.isDeleted && p.status !== 'deleted');
}

// ----------------- Blood Donation Requests -----------------
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

// ----------------- Disaster Relief Items -----------------
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

// ----------------- Volunteer Donors -----------------
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

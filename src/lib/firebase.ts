import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  getDoc,
  getDocs,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, deleteObject } from 'firebase/storage';

import firebaseConfigJson from '../../firebase-applet-config.json';
import { User, RedAlertItem, RedAlertComment, SosLiveSession } from '../types';

export type { RedAlertItem, RedAlertComment, SosLiveSession };

// ==============================================================
// 🔥 FIREBASE INITIALIZATION & CONSTANTS
// ==============================================================

export const USERS_COLLECTION = 'users';
export const POSTS_COLLECTION = 'posts';
export const RED_ALERTS_COLLECTION = 'red_alerts';
export const ISSUES_COLLECTION = 'issues';
export const SYSTEM_SETTINGS_COLLECTION = 'system_metadata';
export const DELETED_RECORDS_DOC = 'deleted_records';

const env: any = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = firebaseConfigJson.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Test Firestore backend connection
async function testConnection() {
  try {
    const { getDocFromServer } = await import('firebase/firestore');
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline mode active. Local cache will be used.');
    }
  }
}
if (typeof window !== 'undefined') {
  testConnection();
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  READ = 'read',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType | string;
  path: string | null;
}

export function handleFirestoreError(error: any, operation: OperationType | string, path: string | null): never {
  console.warn(`Firestore Warning [${operation}] on ${path}:`, error);
  throw new Error(error instanceof Error ? error.message : String(error));
}

export function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      sanitized[key] = sanitizeForFirestore(val);
    }
  }
  return sanitized;
}

/**
 * Delete media files from Firebase Storage by URL
 */
export async function deleteStorageFilesByUrls(urls: string[]): Promise<void> {
  if (!Array.isArray(urls) || urls.length === 0) return;

  const deletePromises = urls.map(async (url) => {
    if (!url || typeof url !== 'string' || !url.includes('firebasestorage.googleapis.com')) return;
    try {
      const fileStorageRef = storageRef(storage, url);
      await deleteObject(fileStorageRef);
    } catch (err: any) {
      console.warn(`[Storage] Deletion skipped/failed for ${url}:`, err?.message || err);
    }
  });

  await Promise.all(deletePromises);
}

// ==============================================================
// 👤 USERS CRUD & SYNC
// ==============================================================

export async function getUserFromFirestore(userIdOrInput: string): Promise<any | null> {
  try {
    if (!userIdOrInput) return null;
    const docRef = doc(db, USERS_COLLECTION, userIdOrInput);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (err) {
    console.warn('getUserFromFirestore error:', err);
    return null;
  }
}

export async function saveUserToFirestore(user: any): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, user.id);
    await setDoc(docRef, sanitizeForFirestore(user), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, USERS_COLLECTION);
  }
}

export async function updateUserInFirestore(userId: string, updateData: any): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(docRef, sanitizeForFirestore({ ...updateData, updatedAtServer: serverTimestamp() }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
  }
}

export async function syncUserProfileToFirestore(userOrId: any, maybeUser?: any): Promise<void> {
  try {
    const user = typeof userOrId === 'string' ? { ...(maybeUser || {}), id: userOrId } : userOrId;
    const userId = user?.id || user?.userId || (typeof userOrId === 'string' ? userOrId : '');
    if (!userId) return;
    const docRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(docRef, sanitizeForFirestore({ ...user, updatedAtServer: serverTimestamp() }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, USERS_COLLECTION);
  }
}

export async function syncUserPasswordInFirestore(userIdOrUser: any, newPasswordHash: string): Promise<void> {
  try {
    const userId = typeof userIdOrUser === 'string' ? userIdOrUser : (userIdOrUser?.id || userIdOrUser?.userId || '');
    if (!userId) return;
    const docRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(docRef, sanitizeForFirestore({ password: newPasswordHash, updatedAtServer: serverTimestamp() }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${USERS_COLLECTION}/${userIdOrUser}`);
  }
}

export async function syncUserWhatsappInFirestore(userId: string, whatsapp: string): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(docRef, sanitizeForFirestore({ whatsappPhone: whatsapp, updatedAtServer: serverTimestamp() }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
  }
}

export async function deleteUserAccount(user: any, _permanent = true): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, user.id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, USERS_COLLECTION);
  }
}

export function subscribeToUsers(callback: (users: any[]) => void): () => void {
  const colRef = collection(db, USERS_COLLECTION);
  return onSnapshot(colRef, (snap) => {
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(users);
  }, (err) => {
    console.warn('subscribeToUsers error:', err);
  });
}

// ==============================================================
// 🆘 HELP POSTS OPERATIONS
// ==============================================================

export function subscribeToHelpPosts(callback: (posts: any[]) => void): () => void {
  const colRef = collection(db, POSTS_COLLECTION);
  return onSnapshot(colRef, (snap) => {
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(posts);
  }, (err) => {
    console.warn('subscribeToHelpPosts error:', err);
  });
}

export async function addHelpPostToFirestore(postData: any): Promise<string> {
  const postId = postData.id || `post_${Date.now()}`;
  try {
    const docRef = doc(db, POSTS_COLLECTION, postId);
    await setDoc(docRef, sanitizeForFirestore({ ...postData, id: postId, createdAtServer: serverTimestamp() }));
    return postId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, POSTS_COLLECTION);
    return postId;
  }
}

export async function updateHelpPostInFirestore(postId: string, updateData: any): Promise<void> {
  try {
    const docRef = doc(db, POSTS_COLLECTION, postId);
    await setDoc(docRef, sanitizeForFirestore(updateData), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${POSTS_COLLECTION}/${postId}`);
  }
}

export async function deleteHelpPostFromFirestore(postId: string, imageUrls?: string[]): Promise<void> {
  if (!postId) return;
  try {
    const docRef = doc(db, POSTS_COLLECTION, postId);

    // 1. Storage media cleanup if any
    if (imageUrls && imageUrls.length > 0) {
      await deleteStorageFilesByUrls(imageUrls);
    } else {
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const postData = snap.data();
          const extractedUrls: string[] = [];
          if (Array.isArray(postData.images)) extractedUrls.push(...postData.images);
          if (Array.isArray(postData.photos)) extractedUrls.push(...postData.photos);
          if (typeof postData.imageUrl === 'string') extractedUrls.push(postData.imageUrl);
          if (typeof postData.photoUrl === 'string') extractedUrls.push(postData.photoUrl);
          if (extractedUrls.length > 0) {
            await deleteStorageFilesByUrls(extractedUrls);
          }
        }
      } catch (e) {}
    }

    // 2. Primary document deletion
    await deleteDoc(docRef);

    // 3. Update deleted records map
    const deletedRecordsRef = doc(db, SYSTEM_SETTINGS_COLLECTION, DELETED_RECORDS_DOC);
    await setDoc(
      deletedRecordsRef,
      {
        deletedPostIds: arrayUnion(postId),
        updatedAt: new Date().toISOString(),
        updatedAtServer: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn(`deleteHelpPostFromFirestore notice:`, err);
  }
}

export async function addReplyToFirestore(postId: string, replyData: any): Promise<void> {
  try {
    const colRef = collection(db, POSTS_COLLECTION, postId, 'replies');
    await addDoc(colRef, sanitizeForFirestore({ ...replyData, createdAtServer: serverTimestamp() }));
  } catch (err) {
    console.warn('addReplyToFirestore error:', err);
  }
}

export async function sendChatMessageToFirestore(postId: string, messageData: any): Promise<void> {
  try {
    const colRef = collection(db, POSTS_COLLECTION, postId, 'messages');
    await addDoc(colRef, sanitizeForFirestore({ ...messageData, createdAtServer: serverTimestamp() }));
  } catch (err) {
    console.warn('sendChatMessageToFirestore error:', err);
  }
}

export function subscribeToChatMessages(postId: string, callback: (msgs: any[]) => void): () => void {
  const colRef = collection(db, POSTS_COLLECTION, postId, 'messages');
  const q = query(colRef, orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(msgs);
  }, (err) => {
    console.warn('subscribeToChatMessages error:', err);
  });
}

export async function restorePostsBackupData(posts: any[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const p of posts) {
      if (p && p.id) {
        const docRef = doc(db, POSTS_COLLECTION, p.id);
        batch.set(docRef, sanitizeForFirestore(p), { merge: true });
      }
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, POSTS_COLLECTION);
  }
}

export async function toggleSavePostInFirestore(userId: string, postId: string, saved: boolean): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId, 'saved_posts', postId);
    if (saved) {
      await setDoc(docRef, { savedAt: serverTimestamp() });
    } else {
      await deleteDoc(docRef);
    }
  } catch (err) {
    console.warn('toggleSavePostInFirestore error:', err);
  }
}

export function subscribeToUserSavedPosts(userId: string, callback: (postIds: string[]) => void): () => void {
  const colRef = collection(db, USERS_COLLECTION, userId, 'saved_posts');
  return onSnapshot(colRef, (snap) => {
    const ids = snap.docs.map(d => d.id);
    callback(ids);
  }, (err) => {
    console.warn('subscribeToUserSavedPosts error:', err);
  });
}

// ==============================================================
// 🚨 RED ALERT (DISASTER) OPERATIONS
// ==============================================================

export function subscribeToRedAlerts(callback: (alerts: any[]) => void): () => void {
  const colRef = collection(db, RED_ALERTS_COLLECTION);
  return onSnapshot(colRef, (snap) => {
    const alerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(alerts);
  }, (err) => {
    console.warn('subscribeToRedAlerts error:', err);
  });
}

export async function createRedAlertInFirestore(alertData: any): Promise<string> {
  const id = alertData.id || `red_alert_${Date.now()}`;
  const docRef = doc(db, RED_ALERTS_COLLECTION, id);
  await setDoc(docRef, sanitizeForFirestore({ ...alertData, id, createdAtServer: serverTimestamp() }), { merge: true });
  return id;
}

export async function updateRedAlertStatus(id: string, status: string, reasonOrNote?: string): Promise<void> {
  const docRef = doc(db, RED_ALERTS_COLLECTION, id);
  await setDoc(docRef, sanitizeForFirestore({
    status,
    adminActionNote: reasonOrNote || '',
    statusChangeReason: reasonOrNote || '',
    updatedAtServer: serverTimestamp(),
  }), { merge: true });
}

export async function deleteRedAlertInFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, RED_ALERTS_COLLECTION, id));
}

export async function markRedAlertAsResolved(id: string, reason?: string, _actor?: any): Promise<void> {
  const docRef = doc(db, RED_ALERTS_COLLECTION, id);
  await setDoc(docRef, sanitizeForFirestore({
    status: 'resolved',
    resolvedReason: reason || 'Resolved',
    adminActionNote: reason || '',
    resolvedAt: new Date().toISOString(),
    updatedAtServer: serverTimestamp(),
  }), { merge: true });
}

export async function reportRedAlertAsFake(id: string, reportData?: any): Promise<void> {
  const docRef = doc(db, RED_ALERTS_COLLECTION, id);
  try {
    const snap = await getDoc(docRef);
    let reporterUserId = '';
    if (snap.exists()) {
      const data = snap.data();
      reporterUserId = data.reportedByUserId || '';
    }

    await setDoc(docRef, sanitizeForFirestore({
      status: 'fake',
      isFlaggedFake: true,
      fakeReport: reportData || true,
      updatedAtServer: serverTimestamp(),
    }), { merge: true });

    // 🛡️ Fake Alert Penalty: Deduct Trust Score & Block Reporter
    if (reporterUserId) {
      const userRef = doc(db, USERS_COLLECTION, reporterUserId);
      await setDoc(userRef, sanitizeForFirestore({
        status: 'blocked',
        isBlocked: true,
        trustScore: 20,
        trustPoints: 20,
        blockedReason: 'අසත්‍ය (Fake) රතු එළිය අනතුරු ඇඟවීමක් පළ කිරීම හේතුවෙන් ගිණුම ස්වයංක්‍රීයව අත්හිටුවන ලදී (Blocked due to publishing Fake Red Alert).',
        blockedAt: new Date().toISOString(),
        updatedAtServer: serverTimestamp(),
      }), { merge: true });
    }
  } catch (err) {
    console.warn('reportRedAlertAsFake error:', err);
  }
}

export async function cancelRedAlertByReporter(id: string, reason?: string, _actor?: any): Promise<void> {
  const docRef = doc(db, RED_ALERTS_COLLECTION, id);
  await setDoc(docRef, sanitizeForFirestore({
    status: 'cancelled',
    cancelledReason: reason || 'Cancelled',
    cancelledAt: new Date().toISOString(),
    updatedAtServer: serverTimestamp(),
  }), { merge: true });
}

export async function addReporterUpdateToRedAlert(id: string, updateText: string, metadata?: any): Promise<void> {
  const docRef = doc(db, RED_ALERTS_COLLECTION, id);
  await setDoc(docRef, sanitizeForFirestore({
    latestUpdate: updateText,
    reporterUpdateMetadata: metadata || null,
    updatedAtServer: serverTimestamp(),
  }), { merge: true });
}

export async function addCommentToRedAlert(id: string, commentData: any): Promise<void> {
  const colRef = collection(db, RED_ALERTS_COLLECTION, id, 'comments');
  await addDoc(colRef, sanitizeForFirestore({ ...commentData, createdAtServer: serverTimestamp() }));
}

export function subscribeToSirenSettings(callback: (settings: any) => void): () => void {
  const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, 'siren_settings');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      callback(null);
    }
  }, () => {});
}

export async function saveSirenSettingsToFirestore(settings: any): Promise<void> {
  const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, 'siren_settings');
  await setDoc(docRef, sanitizeForFirestore({ ...settings, updatedAtServer: serverTimestamp() }), { merge: true });
}

// ==============================================================
// 🆘 SOS LIVE SESSIONS
// ==============================================================

export async function createOrUpdateSosLiveSession(session: any): Promise<string> {
  const id = session.id || `sos_${Date.now()}`;
  const docRef = doc(db, 'sos_sessions', id);
  await setDoc(docRef, sanitizeForFirestore({ ...session, id, updatedAtServer: serverTimestamp() }), { merge: true });
  return id;
}

export async function updateSosLiveLocation(sessionId: string, locationData: any): Promise<void> {
  const docRef = doc(db, 'sos_sessions', sessionId);
  await setDoc(docRef, sanitizeForFirestore({ ...locationData, updatedAtServer: serverTimestamp() }), { merge: true });
}

export async function stopSosLiveSession(sessionId: string): Promise<void> {
  const docRef = doc(db, 'sos_sessions', sessionId);
  await setDoc(docRef, sanitizeForFirestore({ status: 'ended', updatedAtServer: serverTimestamp() }), { merge: true });
}

export function subscribeToSosLiveSession(sessionId: string, callback: (session: any) => void): () => void {
  const docRef = doc(db, 'sos_sessions', sessionId);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    } else {
      callback(null);
    }
  }, () => {});
}

export async function getSosLiveSession(sessionId: string): Promise<any | null> {
  try {
    const docRef = doc(db, 'sos_sessions', sessionId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (err) {
    return null;
  }
}

// ==============================================================
// 📋 ISSUES MANAGEMENT
// ==============================================================

export function subscribeToIssuesFromFirestore(callback: (issues: any[]) => void): () => void {
  const colRef = collection(db, ISSUES_COLLECTION);
  return onSnapshot(colRef, (snap) => {
    const issues = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(issues);
  }, (err) => {
    console.warn('subscribeToIssuesFromFirestore error:', err);
  });
}

// ==============================================================
// 🛒 MARKETPLACE OPERATIONS
// ==============================================================

export function subscribeToMarketplaceItems(callback: (items: any[]) => void): () => void {
  const colRef = collection(db, 'marketplace');
  return onSnapshot(colRef, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(items);
  }, () => {});
}

export async function addMarketplaceItemToFirestore(item: any): Promise<string> {
  const id = item.id || `item_${Date.now()}`;
  const docRef = doc(db, 'marketplace', id);
  await setDoc(docRef, sanitizeForFirestore({ ...item, id }), { merge: true });
  return id;
}

export async function deleteMarketplaceItemFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, 'marketplace', id));
}

export function subscribeToMarketShops(callback: (shops: any[]) => void): () => void {
  const colRef = collection(db, 'market_shops');
  return onSnapshot(colRef, (snap) => {
    const shops = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(shops);
  }, () => {});
}

export async function addMarketShopToFirestore(shop: any): Promise<string> {
  const id = shop.id || `shop_${Date.now()}`;
  const docRef = doc(db, 'market_shops', id);
  await setDoc(docRef, sanitizeForFirestore({ ...shop, id }), { merge: true });
  return id;
}

export async function deleteMarketShopFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, 'market_shops', id));
}

export async function deleteMarketplaceShopFromFirestore(id: string): Promise<void> {
  await deleteMarketShopFromFirestore(id);
}

// ==============================================================
// 💼 PROFESSIONAL SERVICES & GROUPS
// ==============================================================

export function subscribeToProfessionalServices(callback: (services: any[]) => void): () => void {
  const colRef = collection(db, 'professional_services');
  return onSnapshot(colRef, (snap) => {
    const services = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(services);
  }, () => {});
}

export async function addProfessionalServiceToFirestore(service: any): Promise<string> {
  const id = service.id || `pro_${Date.now()}`;
  const docRef = doc(db, 'professional_services', id);
  await setDoc(docRef, sanitizeForFirestore({ ...service, id }), { merge: true });
  return id;
}

export async function deleteProfessionalServiceFromFirestore(serviceId: string): Promise<void> {
  try {
    const docRef = doc(db, 'professional_services', serviceId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('deleteProfessionalServiceFromFirestore error:', err);
  }
}

export function subscribeToGroups(callback: (groups: any[]) => void): () => void {
  const colRef = collection(db, 'groups');
  return onSnapshot(colRef, (snap) => {
    const groups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(groups);
  }, () => {});
}

export async function addGroupToFirestore(group: any): Promise<string> {
  const id = group.id || `group_${Date.now()}`;
  const docRef = doc(db, 'groups', id);
  await setDoc(docRef, sanitizeForFirestore({ ...group, id }), { merge: true });
  return id;
}

export async function deleteGroupFromFirestore(groupId: string): Promise<void> {
  try {
    const docRef = doc(db, 'groups', groupId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('deleteGroupFromFirestore error:', err);
  }
}

// ==============================================================
// 🩸 BLOOD & DISASTER RELIEF
// ==============================================================

export async function saveBloodRequestToFirestore(req: any): Promise<string> {
  const id = req.id || `blood_${Date.now()}`;
  const docRef = doc(db, 'blood_requests', id);
  await setDoc(docRef, sanitizeForFirestore({ ...req, id }), { merge: true });
  return id;
}

export async function deleteBloodRequestFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, 'blood_requests', id));
}

export async function saveVolunteerDonorToFirestore(donor: any): Promise<string> {
  const id = donor.id || `donor_${Date.now()}`;
  const docRef = doc(db, 'volunteer_donors', id);
  await setDoc(docRef, sanitizeForFirestore({ ...donor, id }), { merge: true });
  return id;
}

export async function deleteVolunteerDonorFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, 'volunteer_donors', id));
}

export async function saveDisasterReliefToFirestore(relief: any): Promise<string> {
  const id = relief.id || `relief_${Date.now()}`;
  const docRef = doc(db, 'disaster_relief', id);
  await setDoc(docRef, sanitizeForFirestore({ ...relief, id }), { merge: true });
  return id;
}

export async function deleteDisasterReliefFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, 'disaster_relief', id));
}

// ==============================================================
// 🏛️ TRANSPARENT AID LEDGER
// ==============================================================

export function subscribeToAidCentersFromFirestore(callback: (centers: any[]) => void): () => void {
  const colRef = collection(db, 'aid_centers');
  return onSnapshot(colRef, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(data);
  }, () => {});
}

export async function saveAidCenterToFirestore(item: any): Promise<string> {
  const id = item.id || `aid_center_${Date.now()}`;
  const docRef = doc(db, 'aid_centers', id);
  await setDoc(docRef, sanitizeForFirestore({ ...item, id }), { merge: true });
  return id;
}

export async function updateAidCenterInFirestore(id: string, updateData: any): Promise<void> {
  const docRef = doc(db, 'aid_centers', id);
  await setDoc(docRef, sanitizeForFirestore({ ...updateData, updatedAtServer: serverTimestamp() }), { merge: true });
}

export async function deleteAidCenterFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, 'aid_centers', id));
}

export function subscribeToAidDeliveriesFromFirestore(callback: (deliveries: any[]) => void): () => void {
  const colRef = collection(db, 'aid_deliveries');
  return onSnapshot(colRef, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(data);
  }, () => {});
}

export async function saveAidDeliveryToFirestore(item: any): Promise<string> {
  const id = item.id || `aid_delivery_${Date.now()}`;
  const docRef = doc(db, 'aid_deliveries', id);
  await setDoc(docRef, sanitizeForFirestore({ ...item, id }), { merge: true });
  return id;
}

export async function updateAidDeliveryInFirestore(id: string, updateData: any): Promise<void> {
  const docRef = doc(db, 'aid_deliveries', id);
  await setDoc(docRef, sanitizeForFirestore({ ...updateData, updatedAtServer: serverTimestamp() }), { merge: true });
}

export async function deleteAidDeliveryFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, 'aid_deliveries', id));
}

export function subscribeToAidBroadcastsFromFirestore(callback: (broadcasts: any[]) => void): () => void {
  const colRef = collection(db, 'aid_broadcasts');
  return onSnapshot(colRef, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(data);
  }, () => {});
}

export async function saveAidBroadcastToFirestore(item: any): Promise<string> {
  const id = item.id || `aid_broadcast_${Date.now()}`;
  const docRef = doc(db, 'aid_broadcasts', id);
  await setDoc(docRef, sanitizeForFirestore({ ...item, id }), { merge: true });
  return id;
}

// ==============================================================
// 🗑️ DELETED RECORDS MAP (SYNC ACROSS ALL CLIENTS)
// ==============================================================

export interface DeletedRecordsMap {
  deletedPostIds?: string[];
  deletedUserIds?: string[];
  deletedBloodIds?: string[];
  deletedDisasterIds?: string[];
  deletedDonorIds?: string[];
  deletedRedAlertIds?: string[];
  deletedMarketplaceIds?: string[];
  deletedMarketShopIds?: string[];
  deletedProServiceIds?: string[];
  deletedGroupIds?: string[];
}

export async function saveDeletedRecordsToFirestore(records: DeletedRecordsMap): Promise<void> {
  try {
    const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, DELETED_RECORDS_DOC);
    await setDoc(docRef, sanitizeForFirestore({
      ...records,
      updatedAtServer: serverTimestamp(),
    }), { merge: true });
  } catch (err) {
    console.warn('saveDeletedRecordsToFirestore warning:', err);
  }
}

export function subscribeToDeletedRecordsFromFirestore(callback: (records: DeletedRecordsMap | null) => void): () => void {
  try {
    const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, DELETED_RECORDS_DOC);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as DeletedRecordsMap);
      } else {
        callback(null);
      }
    }, (err) => {
      console.warn('subscribeToDeletedRecordsFromFirestore warning:', err);
    });
  } catch (err) {
    console.warn('subscribeToDeletedRecordsFromFirestore setup warning:', err);
    return () => {};
  }
}

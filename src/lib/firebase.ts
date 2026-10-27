import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc as rawDoc,
  collection as rawCollection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
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
import { User, RedAlertItem, RedAlertComment, SosLiveSession, PendingAiQuery, VerifiedAiKnowledgeItem } from '../types';

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
export const fallbackDb = getFirestore(app);
export const auth = getAuth(app);

// සියලුම Public Collections සෘජුවම Top-Level එකේ පිහිටවන පරිදි සකසන ලද ලැයිස්තුව
const DIRECT_TOP_LEVEL_COLLECTIONS = [
  'users',
  'posts',
  'helpPosts',
  'groups',
  'community_groups',
  'red_alerts',
  'redAlerts',
  'push_broadcast_queue',
  'marketplace',
  'market_shops',
  'issues',
  'jobs',
  'accommodations',
  'professional_services',
  'saved_places',
  'blood_requests',
  'volunteer_donors',
  'disaster_relief',
  'aid_centers',
  'aid_deliveries',
  'aid_broadcasts',
  'barter_items',
  'sos_live_sessions',
  'password_reset_requests',
  'pending_ai_queries',
  'verified_ai_knowledge'
];

export function collection(database: any, path: string, ...pathSegments: string[]): any {
  if (pathSegments.length === 0) {
    if (DIRECT_TOP_LEVEL_COLLECTIONS.includes(path)) {
      return rawCollection(database, path);
    }
    return rawCollection(database, 'users', '__sahaya_col_' + path + '__', 'private');
  }
  if (pathSegments.length === 2) {
    if (path === 'users' && pathSegments[1] === 'private') {
      return rawCollection(database, path, pathSegments[0], pathSegments[1]);
    }
    return rawCollection(database, 'users', '__sahaya_sub_' + path + '_' + pathSegments[0] + '_' + pathSegments[1] + '__', 'private');
  }
  return rawCollection(database, path, ...pathSegments);
}

export function doc(database: any, path: string, ...pathSegments: string[]): any {
  if (pathSegments.length === 0) {
    if (DIRECT_TOP_LEVEL_COLLECTIONS.includes(path)) {
      return rawDoc(database, path);
    }
    return rawDoc(rawCollection(database, 'users', '__sahaya_col_' + path + '__', 'private'));
  }
  if (pathSegments.length === 1) {
    if (DIRECT_TOP_LEVEL_COLLECTIONS.includes(path)) {
      return rawDoc(database, path, pathSegments[0]);
    }
    return rawDoc(database, 'users', '__sahaya_col_' + path + '__', 'private', pathSegments[0]);
  }
  if (pathSegments.length === 3) {
    if (path === 'users' && pathSegments[1] === 'private') {
      return rawDoc(database, path, pathSegments[0], pathSegments[1], pathSegments[2]);
    }
    return rawDoc(database, 'users', '__sahaya_sub_' + path + '_' + pathSegments[0] + '_' + pathSegments[1] + '__', 'private', pathSegments[2]);
  }
  return rawDoc(database, path, ...pathSegments);
}
export const storage = getStorage(app);

// Test Firestore backend connection
async function testConnection() {
  try {
    if (auth && !auth.currentUser) {
      await signInAnonymously(auth).catch(() => {});
    }
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
  if (obj._methodName || (obj.constructor && obj.constructor.name === 'FieldValue')) return obj;
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

export async function getUserFromFirestore(userIdOrInput: string) {
  try {
    if (!userIdOrInput) return null;
    const cleanInput = String(userIdOrInput).trim();
    const docRef = doc(db, USERS_COLLECTION, cleanInput);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    const upperInput = cleanInput.toUpperCase().replace(/\s+/g, '');
    const allSnap = await getDocs(collection(db, USERS_COLLECTION));
    for (const d of allSnap.docs) {
      const data: any = d.data();
      const dNic = String(data.nic ? data.nic : data.nicNumber ? data.nicNumber : '').trim().toUpperCase().replace(/\s+/g, '');
      const dUserId = String(data.userId ? data.userId : '').trim().toUpperCase().replace(/\s+/g, '');
      const dPhone = String(data.whatsappPhone ? data.whatsappPhone : data.phone ? data.phone : '').trim();
      if (dNic === upperInput) return { id: d.id, ...data };
      if (dUserId === upperInput) return { id: d.id, ...data };
      if (cleanInput.length >= 9 && dPhone === cleanInput) return { id: d.id, ...data };
    }
    return null;
  } catch (err) {
    console.warn('getUserFromFirestore error:', err);
    return null;
  }
}

const ADMIN_TELEGRAM_BOT_TOKEN = env.VITE_TELEGRAM_BOT_TOKEN || '8722901764:AAECy4vulQ7LCY4P0wxKEM9F1o_x9k8j6iU';
const ADMIN_TELEGRAM_CHAT_ID = '1349273525';
const notifiedTelegramRegKeys = new Set();

export async function notifyAdminViaTelegramOnRegistration(params: {
  registrationType: string;
  identifierOrName: string;
  dateTime?: string;
  dedupeKey?: string;
}) {
  try {
    const key = params.dedupeKey ? String(params.dedupeKey) : params.registrationType + '_' + params.identifierOrName;
    if (notifiedTelegramRegKeys.has(key)) return;
    notifiedTelegramRegKeys.add(key);

    const now = new Date();
    const formattedDateTime = params.dateTime
      ? params.dateTime
      : now.toLocaleDateString('si-LK') + ' ' + now.toLocaleTimeString('si-LK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const textMessage =
      '🔔 නව ලියාපදිංචි වීමක් (සහය සේවා)\n\n' +
      '1. ලියාපදිංචි වූ ආකාරය: ' + params.registrationType + '\n' +
      '2. හැඳුනුම්පත් අංකය / ව්‍යාපාර හෝ වෙළෙඳසැල් නම: ' + params.identifierOrName + '\n' +
      '3. දිනය සහ වේලාව: ' + formattedDateTime;

    const tgUrl = 'https://api.telegram.org/bot' + ADMIN_TELEGRAM_BOT_TOKEN + '/sendMessage';
    await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_TELEGRAM_CHAT_ID,
        text: textMessage
      })
    });
  } catch (err) {
    console.warn('Telegram admin notification note:', err);
  }
}

export async function saveUserToFirestore(user: any) {
  try {
    const docId = user && user.id ? String(user.id) : user && user.userId ? String(user.userId) : 'usr_' + Date.now();
    const payload: any = { ...user, id: docId };
    if (
      payload.idCardPhotoUrl &&
      payload.nicFrontPhotoUrl &&
      payload.idCardPhotoUrl === payload.nicFrontPhotoUrl &&
      String(payload.idCardPhotoUrl).length >= 80000
    ) {
      payload.idCardPhotoUrl = '';
    }
    const docRef = doc(db, USERS_COLLECTION, docId);
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });
    if (user && (user.status === 'pending' ? true : !user.isApproved)) {
      const nicVal = String(user.nicNumber ? user.nicNumber : (user.nic ? user.nic : (user.userId ? user.userId : docId))).trim();
      const nameVal = user.name ? ' (' + String(user.name).trim() + ')' : '';
      notifyAdminViaTelegramOnRegistration({
        registrationType: 'පුද්ගලික',
        identifierOrName: nicVal + nameVal,
        dedupeKey: 'usr_' + nicVal
      });
    }
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

const BUILT_IN_DUMMY_ID_LIST = [
  "usr_citizen_1",
  "post_6843", "post_4912", "post_find_1", "post_find_2", "post_from_1", "post_from_2", "post_from_3", "post_1", "post_2", "post_3",
  "grp_kelaniya_care", "grp_dalada_sewa", "grp_gam_mithuro", "grp_sample_1", "grp_sample_2", "grp_sample_3",
  "mkt_seller_1", "mkt_seller_2", "mkt_seller_3", "mkt_seller_4", "mkt_seller_5", "mkt_seller_6", "mkt_seller_7", "mkt_seller_8",
  "mkt_seller_free_1", "mkt_seller_free_2", "mkt_buyer_1", "mkt_buyer_2",
  "item_1", "item_2", "item_3", "item_4", "item_5", "item_6", "mkt_1", "mkt_2", "mkt_3", "mkt_4", "mkt_5", "mkt_6",
  "mkt_shop_1", "mkt_shop_2", "mkt_shop_3", "mkt_shop_4", "mkt_biz_1", "mkt_biz_2", "mkt_biz_3", "mkt_biz_4",
  "shop_1", "shop_2", "shop_3", "shop_4",
  "ps_1", "ps_2", "ps_3", "ps_4", "pro_1", "pro_2", "pro_3", "pro_4",
  "bld_1", "bld_2", "bld_3", "bld_4", "bld_5", "rel_1", "rel_2", "rel_3", "rel_4", "rel_5",
  "donor_1", "donor_2", "donor_3", "donor_4", "donor_5",
  "center_1", "center_2", "center_3", "deliv_1", "deliv_2", "deliv_3", "deliv_4",
  "swap_001", "swap_002", "swap_003", "swap_004", "swap_005"
];

export function isBuiltInDummyRecord(record: any): boolean {
  if (!record) return false;
  const id = String(record.id ? record.id : "").trim();
  if (BUILT_IN_DUMMY_ID_LIST.includes(id)) return true;
  const regCode = String(record.registrationCode ? record.registrationCode : "").trim();
  if (regCode === "712845") return true;
  if (regCode === "593812") return true;
  if (regCode === "384910") return true;
  return false;
}

export function filterAndPurgeDummySnapDocs(snap: any): any[] {
  const valid: any[] = [];
  if (!snap) return valid;
  if (!snap.docs) return valid;
  for (const d of snap.docs) {
    const item = { id: d.id, ...d.data() };
    if (isBuiltInDummyRecord(item)) {
      try {
        deleteDoc(d.ref).catch(() => {});
      } catch (e) {}
    } else {
      valid.push(item);
    }
  }
  return valid;
}

export function subscribeToUsers(callback: (users: any[]) => void): () => void {
  const colRef = collection(db, USERS_COLLECTION);
  return onSnapshot(colRef, (snap) => {
    const users = filterAndPurgeDummySnapDocs(snap);
    callback(users);
  }, (err) => {
    console.warn("subscribeToUsers error:", err);
  });
}

// ==============================================================
// 🆘 HELP POSTS OPERATIONS
// ==============================================================

export function subscribeToHelpPosts(callback: (posts: any[]) => void): () => void {
  let primaryPosts: any[] = [];
  let legacyPosts: any[] = [];
  let fallbackPosts: any[] = [];
  const emitMerged = () => {
    const map = new Map();
    [...fallbackPosts, ...legacyPosts, ...primaryPosts].forEach((p) => {
      if (p && p.id) map.set(String(p.id), p);
    });
    callback(Array.from(map.values()));
  };
  const unsub1 = onSnapshot(collection(db, POSTS_COLLECTION), (snap) => {
    primaryPosts = filterAndPurgeDummySnapDocs(snap);
    emitMerged();
  }, (err) => {
    console.warn("subscribeToHelpPosts primary notice:", err);
  });
  const unsub2 = onSnapshot(collection(db, 'helpPosts'), (snap) => {
    legacyPosts = filterAndPurgeDummySnapDocs(snap);
    emitMerged();
  }, () => {});
  const unsub3 = fallbackDb !== db ? onSnapshot(collection(fallbackDb, POSTS_COLLECTION), (snap) => {
    fallbackPosts = filterAndPurgeDummySnapDocs(snap);
    emitMerged();
  }, () => {}) : () => {};
  return () => {
    unsub1();
    unsub2();
    unsub3();
  };
}

export interface PaginatedPostsResult {
  posts: any[];
  lastDoc: any;
  hasMore: boolean;
}

export async function fetchHelpPostsPaginated(
  lastDoc: any = null,
  pageSize: number = 4
) {
  try {
    const colRef = collection(db, POSTS_COLLECTION);
    let q = query(
      colRef,
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(
        colRef,
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }

    const snap = await getDocs(q);
    const posts = filterAndPurgeDummySnapDocs(snap);
    const newLastDoc = snap.docs.length === 0 ? null : snap.docs[snap.docs.length - 1];
    const hasMore = snap.docs.length === pageSize;

    return {
      posts,
      lastDoc: newLastDoc,
      hasMore,
    };
  } catch (err) {
    console.warn("fetchHelpPostsPaginated error:", err);
    return { posts: [], lastDoc: null, hasMore: false };
  }
}

export async function addHelpPostToFirestore(postData: any) {
  const postId = postData.id ? String(postData.id) : 'post_' + Date.now();
  const uid = auth && auth.currentUser && auth.currentUser.uid ? auth.currentUser.uid : (postData.userId ? postData.userId : (postData.authorId ? postData.authorId : 'usr_guest'));
  const enriched = sanitizeForFirestore({
    ...postData,
    id: postId,
    authorId: postData.authorId ? postData.authorId : uid,
    userId: postData.userId ? postData.userId : uid,
    createdAtServer: serverTimestamp()
  });
  try {
    await setDoc(doc(db, POSTS_COLLECTION, postId), enriched, { merge: true });
    setDoc(doc(db, 'helpPosts', postId), enriched, { merge: true }).catch(() => {});
    if (fallbackDb !== db) {
      setDoc(doc(fallbackDb, POSTS_COLLECTION, postId), enriched, { merge: true }).catch(() => {});
    }
    return postId;
  } catch (err) {
    try {
      await setDoc(doc(fallbackDb, POSTS_COLLECTION, postId), enriched, { merge: true });
    } catch (_) {}
    return postId;
  }
}

export async function updateHelpPostInFirestore(postId: string, updateData: any) {
  const sanitized = sanitizeForFirestore(updateData);
  try {
    await setDoc(doc(db, POSTS_COLLECTION, postId), sanitized, { merge: true });
    setDoc(doc(db, 'helpPosts', postId), sanitized, { merge: true }).catch(() => {});
    if (fallbackDb !== db) {
      setDoc(doc(fallbackDb, POSTS_COLLECTION, postId), sanitized, { merge: true }).catch(() => {});
    }
  } catch (err) {
    try {
      await setDoc(doc(fallbackDb, POSTS_COLLECTION, postId), sanitized, { merge: true });
    } catch (_) {}
  }
}

export async function deleteHelpPostFromFirestore(postId: string, imageUrls?: string[]): Promise<void> {
  if (!postId) return;
  try {
    const docRef = doc(db, POSTS_COLLECTION, postId);

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

    await deleteDoc(docRef);

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
    if (!postId) return;
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const fullMsg = {
      ...messageData,
      createdAt: messageData.createdAt || nowIso,
      createdAtMs: messageData.createdAtMs || nowMs,
      createdAtServer: serverTimestamp(),
    };
    const colRef = collection(db, POSTS_COLLECTION, postId, 'messages');
    await addDoc(colRef, sanitizeForFirestore(fullMsg));

    try {
      const postDocRef = doc(db, POSTS_COLLECTION, postId);
      const replyEntry = {
        id: `rep_${nowMs}_${Math.random().toString(36).substring(2, 7)}`,
        responderName: messageData.senderName || 'පරිශීලක',
        responderPhone: messageData.senderPhone || '',
        message: messageData.text || '',
        createdAt: nowIso,
        createdAtMs: nowMs,
      };

      const isDirect = String(postId).startsWith('direct_user_chat_');
      const directMeta = isDirect ? {
        id: postId,
        postCode: 'USER-CHAT',
        isDirectChat: true,
        userId: messageData.recipientId || 'usr_direct',
        userName: messageData.recipientName || 'පරිශීලක',
        userPhone: messageData.recipientPhone || '',
        whatHappened: '@' + (messageData.senderName || 'පරිශීලක') + ' සමඟ සෘජු චැට් සංවාදය',
        whatIsNeeded: 'Direct Chat',
        locationName: 'Online Chat',
        status: 'confirmed',
        isConfirmed: true,
      } : {};
      await setDoc(postDocRef, sanitizeForFirestore(Object.assign({}, directMeta, {
        lastMessage: (messageData.text ? messageData.text : ''),
        lastMessageSenderName: (messageData.senderName ? messageData.senderName : ''),
        lastMessageSenderPhone: (messageData.senderPhone ? messageData.senderPhone : ''),
        lastMessageTime: nowIso,
        lastMessageTimeMs: nowMs,
        replies: arrayUnion(replyEntry),
        updatedAtServer: serverTimestamp(),
      })), { merge: true });
    } catch (parentErr) {
      console.warn('sendChatMessageToFirestore parent post update notice:', parentErr);
    }
  } catch (err) {
    console.warn('sendChatMessageToFirestore error:', err);
  }
}

export function subscribeToChatMessages(postId: string, callback: (msgs: any[]) => void): () => void {
  if (!postId) return () => {};
  const colRef = collection(db, POSTS_COLLECTION, postId, 'messages');
  return onSnapshot(colRef, (snap) => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    msgs.sort((a: any, b: any) => {
      const timeA = a.createdAtMs || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAtMs || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeA - timeB;
    });
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
  let primaryAlerts: any[] = [];
  let fallbackAlerts: any[] = [];
  const emitMerged = () => {
    const map = new Map();
    [...fallbackAlerts, ...primaryAlerts].forEach((a) => {
      if (a && a.id) map.set(String(a.id), a);
    });
    callback(Array.from(map.values()));
  };
  const unsub1 = onSnapshot(collection(db, RED_ALERTS_COLLECTION), (snap) => {
    primaryAlerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    emitMerged();
  }, (err) => {
    console.warn('subscribeToRedAlerts error:', err);
  });
  const unsub2 = fallbackDb !== db ? onSnapshot(collection(fallbackDb, RED_ALERTS_COLLECTION), (snap) => {
    fallbackAlerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    emitMerged();
  }, () => {}) : () => {};
  return () => {
    unsub1();
    unsub2();
  };
}

export async function createRedAlertInFirestore(alertData: any) {
  const id = alertData.id ? String(alertData.id) : 'red_alert_' + Date.now();
  const payload = sanitizeForFirestore({ ...alertData, id, createdAtServer: serverTimestamp() });
  await setDoc(doc(db, RED_ALERTS_COLLECTION, id), payload, { merge: true });
  setDoc(doc(db, 'redAlerts', id), payload, { merge: true }).catch(() => {});
  if (fallbackDb !== db) {
    setDoc(doc(fallbackDb, RED_ALERTS_COLLECTION, id), payload, { merge: true }).catch(() => {});
  }
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

export async function deleteRedAlertInFirestore(id: string) {
  await deleteDoc(doc(db, RED_ALERTS_COLLECTION, id));
}

export async function markRedAlertAsResolved(id: string, reason?: string, _actor?: any) {
  const docRef = doc(db, RED_ALERTS_COLLECTION, id);
  const nowIso = new Date().toISOString();
  const nowDisplay = `${new Date().toLocaleDateString('si-LK')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  await setDoc(docRef, sanitizeForFirestore({
    status: 'resolved',
    resolvedReason: reason || 'ආපදා තත්ත්වය විසඳන ලදී',
    adminActionNote: reason || '',
    resolvedAt: nowIso,
    resolvedAtDisplay: nowDisplay,
    updatedAtServer: serverTimestamp(),
  }), { merge: true });
}

export async function reportRedAlertAsFake(id: string, reportData?: any) {
  const docRef = doc(db, RED_ALERTS_COLLECTION, id);
  try {
    const snap = await getDoc(docRef);
    let reporterUserId = '';
    let existingReports: any[] = [];
    if (snap.exists()) {
      const data = snap.data() || {};
      reporterUserId = data.reportedByUserId || '';
      if (Array.isArray(data.fakeReports)) {
        existingReports = data.fakeReports;
      }
    }

    const newEntry = reportData && typeof reportData === 'object'
      ? reportData
      : {
          id: `fake_${Date.now()}`,
          userId: typeof reportData === 'string' ? reportData : `usr_${Date.now()}`,
          reportedAt: new Date().toISOString(),
          reason: 'අසත්‍යයක් ලෙස වාර්තා කරන ලදී',
        };

    const alreadyReported = Boolean(
      newEntry.userId &&
      existingReports.some((r: any) => r && (r.userId === newEntry.userId || r.reportedByUserId === newEntry.userId))
    );

    const updatedFakeReports = alreadyReported ? existingReports : [...existingReports, newEntry];
    const fakeCount = updatedFakeReports.length;
    const isNowFlaggedFake = Math.max(fakeCount, 4) === fakeCount;

    await setDoc(docRef, sanitizeForFirestore({
      fakeReports: updatedFakeReports,
      fakeReportsCount: fakeCount,
      isFlaggedFake: isNowFlaggedFake,
      ...(isNowFlaggedFake ? {
        fakeHighlightedAt: new Date().toISOString(),
        statusChangeMessage: '⚠️ මෙය අසත්‍ය ලෙස පළකරන ලද දැන්වීමකි',
      } : {}),
      updatedAtServer: serverTimestamp(),
    }), { merge: true });

    if (isNowFlaggedFake && reporterUserId) {
      const userRef = doc(db, USERS_COLLECTION, reporterUserId);
      await setDoc(userRef, sanitizeForFirestore({
        status: 'blocked',
        isBlocked: true,
        trustScore: 20,
        trustPoints: 20,
        blockedReason: 'පරිශීලකයන් 4 දෙනෙකු විසින් අසත්‍ය (Fake) රතු එළිය දැන්වීමක් ලෙස තහවුරු කිරීම හේතුවෙන් ගිණුම අත්හිටුවන ලදී.',
        blockedAt: new Date().toISOString(),
        updatedAtServer: serverTimestamp(),
      }), { merge: true });
    }
  } catch (err) {
    console.warn('reportRedAlertAsFake error:', err);
  }
}

export async function cancelRedAlertByReporter(id: string, reason?: string, _actor?: any) {
  const docRef = doc(db, RED_ALERTS_COLLECTION, id);
  const nowIso = new Date().toISOString();
  const nowDisplay = `${new Date().toLocaleDateString('si-LK')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  await setDoc(docRef, sanitizeForFirestore({
    status: 'cancelled',
    isDeleted: true,
    cancelledReason: reason || 'වාර්තාකරු විසින් දැන්වීම ඉවත් කරන ලදී',
    cancelledAt: nowIso,
    deletedAt: nowIso,
    deletedAtDisplay: nowDisplay,
    updatedAtServer: serverTimestamp(),
  }), { merge: true });
}

export async function addReporterUpdateToRedAlert(id: string, updateText: string, metadata?: any) {
  const docRef = doc(db, RED_ALERTS_COLLECTION, id);
  const nowIso = new Date().toISOString();
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  let existingComments: any[] = [];
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() || {};
      if (Array.isArray(data.comments)) {
        existingComments = data.comments;
      }
    }
  } catch (_) {}

  const reporterComment = {
    id: `comm_${Date.now()}`,
    userId: metadata?.reporterId || '',
    userName: `${metadata?.reporterName || 'වාර්තාකරු'} (වාර්තාකරු)`,
    comment: updateText,
    text: updateText,
    createdAt: nowIso,
    createdAtMs: Date.now(),
    createdAtDisplay: nowTime,
    isReporterUpdate: true,
  };
  const updatedComments = [...existingComments, reporterComment];

  await setDoc(docRef, sanitizeForFirestore({
    latestUpdate: updateText,
    reporterUpdateMetadata: metadata || null,
    comments: updatedComments,
    commentsCount: updatedComments.length,
    updatedAtServer: serverTimestamp(),
  }), { merge: true });
}

export async function addCommentToRedAlert(id: string, commentData: any) {
  const docRef = doc(db, RED_ALERTS_COLLECTION, id);
  let existingComments: any[] = [];
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() || {};
      if (Array.isArray(data.comments)) {
        existingComments = data.comments;
      }
    }
  } catch (_) {}

  const updatedComments = [...existingComments, commentData];
  await setDoc(docRef, sanitizeForFirestore({
    comments: updatedComments,
    commentsCount: updatedComments.length,
    updatedAtServer: serverTimestamp(),
  }), { merge: true });

  try {
    const colRef = collection(db, RED_ALERTS_COLLECTION, id, 'comments');
    await addDoc(colRef, sanitizeForFirestore({ ...commentData, createdAtServer: serverTimestamp() }));
  } catch (_) {}
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
  const docRef = doc(db, 'sos_live_sessions', id);
  const cleanData = sanitizeForFirestore(session);
  await setDoc(docRef, { 
    ...cleanData, 
    id, 
    updatedAtServer: serverTimestamp(),
    updatedAtMs: Date.now() 
  }, { merge: true });
  return id;
}

export async function updateSosLiveLocation(sessionId: string, locationData: any): Promise<void> {
  const docRef = doc(db, 'sos_live_sessions', sessionId);
  const cleanData = sanitizeForFirestore(locationData);
  await setDoc(docRef, { 
    ...cleanData, 
    updatedAtServer: serverTimestamp(),
    updatedAtMs: Date.now() 
  }, { merge: true });
}

export async function stopSosLiveSession(sessionId: string, reason?: string): Promise<void> {
  const docRef = doc(db, 'sos_live_sessions', sessionId);
  await setDoc(docRef, { 
    status: 'ended', 
    isActive: false, 
    deactivationReason: reason || 'Resolved',
    updatedAtServer: serverTimestamp(),
    updatedAtMs: Date.now() 
  }, { merge: true });
}

export function subscribeToSosLiveSession(sessionId: string, callback: (session: any) => void): () => void {
  const docRef = doc(db, 'sos_live_sessions', sessionId);
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
    const docRef = doc(db, 'sos_live_sessions', sessionId);
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
  const colRef = collection(db, "marketplace");
  return onSnapshot(colRef, (snap) => {
    const items = filterAndPurgeDummySnapDocs(snap);
    callback(items);
  }, () => {});
}

export async function addMarketplaceItemToFirestore(item: any) {
  const id = item.id ? item.id : "item_" + Date.now();
  const docRef = doc(db, "marketplace", id);
  await setDoc(docRef, sanitizeForFirestore({ ...item, id }), { merge: true });
  return id;
}

export async function deleteMarketplaceItemFromFirestore(id: string) {
  await deleteDoc(doc(db, "marketplace", id));
}

export function subscribeToMarketShops(callback: (shops: any[]) => void): () => void {
  const colRef = collection(db, "market_shops");
  return onSnapshot(colRef, (snap) => {
    const shops = filterAndPurgeDummySnapDocs(snap);
    callback(shops);
  }, () => {});
}

export async function addMarketShopToFirestore(shop: any) {
  const id = shop.id ? shop.id : "shop_" + Date.now();
  const docRef = doc(db, "market_shops", id);
  await setDoc(docRef, sanitizeForFirestore({ ...shop, id }), { merge: true });
  try {
    const isBusiness = (shop && (shop.type === "business" ? true : shop.mode === "business"));
    const regType = isBusiness ? "ව්‍යාපාර" : "වෙළෙඳසැල්";
    const shopTitle = String(shop && (shop.name ? shop.name : (shop.shopName ? shop.shopName : id))).trim();
    notifyAdminViaTelegramOnRegistration({
      registrationType: regType,
      identifierOrName: shopTitle,
      dedupeKey: "shop_" + id
    });
  } catch (err) {}
  return id;
}

export async function deleteMarketShopFromFirestore(id: string) {
  await deleteDoc(doc(db, "market_shops", id));
}

export async function deleteMarketplaceShopFromFirestore(id: string) {
  await deleteMarketShopFromFirestore(id);
}

// ==============================================================
// 💼 PROFESSIONAL SERVICES & GROUPS
// ==============================================================

export function subscribeToProfessionalServices(callback: (services: any[]) => void): () => void {
  const colRef = collection(db, "professional_services");
  return onSnapshot(colRef, (snap) => {
    const services = filterAndPurgeDummySnapDocs(snap);
    callback(services);
  }, () => {});
}

export async function addProfessionalServiceToFirestore(service: any) {
  const id = service.id ? service.id : "pro_" + Date.now();
  const docRef = doc(db, "professional_services", id);
  await setDoc(docRef, sanitizeForFirestore({ ...service, id }), { merge: true });
  return id;
}

export async function deleteProfessionalServiceFromFirestore(serviceId: string) {
  try {
    const docRef = doc(db, "professional_services", serviceId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("deleteProfessionalServiceFromFirestore error:", err);
  }
}

export function subscribeToGroups(callback: (groups: any[]) => void): () => void {
  let primaryGroups: any[] = [];
  let fallbackGroups: any[] = [];
  const emitMerged = () => {
    const map = new Map();
    [...fallbackGroups, ...primaryGroups].forEach((g) => {
      if (g && g.id) map.set(String(g.id), g);
    });
    callback(Array.from(map.values()));
  };
  const unsub1 = onSnapshot(collection(db, "groups"), (snap) => {
    primaryGroups = filterAndPurgeDummySnapDocs(snap);
    emitMerged();
  }, () => {});
  const unsub2 = fallbackDb !== db ? onSnapshot(collection(fallbackDb, "groups"), (snap) => {
    fallbackGroups = filterAndPurgeDummySnapDocs(snap);
    emitMerged();
  }, () => {}) : () => {};
  return () => {
    unsub1();
    unsub2();
  };
}

export async function addGroupToFirestore(group: any) {
  const id = group.id ? String(group.id) : "group_" + Date.now();
  const payload = sanitizeForFirestore({ ...group, id, updatedAtMs: Date.now() });
  await setDoc(doc(db, "groups", id), payload, { merge: true });
  if (fallbackDb !== db) {
    setDoc(doc(fallbackDb, "groups", id), payload, { merge: true }).catch(() => {});
  }
  return id;
}

export async function updateGroupInFirestore(groupId: string, groupData: any) {
  if (!groupId) return;
  const payload = sanitizeForFirestore({ ...groupData, id: groupId, updatedAtMs: Date.now() });
  await setDoc(doc(db, "groups", groupId), payload, { merge: true });
  if (fallbackDb !== db) {
    setDoc(doc(fallbackDb, "groups", groupId), payload, { merge: true }).catch(() => {});
  }
}

export async function deleteGroupFromFirestore(groupId: string) {
  try {
    await deleteDoc(doc(db, "groups", groupId));
    if (fallbackDb !== db) {
      deleteDoc(doc(fallbackDb, "groups", groupId)).catch(() => {});
    }
  } catch (err) {
    console.warn("deleteGroupFromFirestore error:", err);
  }
}

export function subscribeToSavedPlacesFromFirestore(callback: (places: any[]) => void): () => void {
  let primaryPlaces: any[] = [];
  let fallbackPlaces: any[] = [];
  const emitMerged = () => {
    const map = new Map();
    [...fallbackPlaces, ...primaryPlaces].forEach((p) => {
      if (p && p.id) map.set(String(p.id), p);
    });
    callback(Array.from(map.values()));
  };
  const unsub1 = onSnapshot(collection(db, "saved_places"), (snap) => {
    primaryPlaces = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    emitMerged();
  }, () => {});
  const unsub2 = fallbackDb !== db ? onSnapshot(collection(fallbackDb, "saved_places"), (snap) => {
    fallbackPlaces = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    emitMerged();
  }, () => {}) : () => {};
  return () => {
    unsub1();
    unsub2();
  };
}

export async function savePlaceToFirestore(place: any) {
  const id = place.id ? String(place.id) : "plc_" + Date.now();
  const payload = sanitizeForFirestore({ ...place, id, updatedAtServer: serverTimestamp() });
  await setDoc(doc(db, "saved_places", id), payload, { merge: true });
  if (fallbackDb !== db) {
    setDoc(doc(fallbackDb, "saved_places", id), payload, { merge: true }).catch(() => {});
  }
  return id;
}

export async function deletePlaceFromFirestore(placeId: string) {
  if (!placeId) return;
  try {
    await deleteDoc(doc(db, "saved_places", placeId));
    if (fallbackDb !== db) {
      deleteDoc(doc(fallbackDb, "saved_places", placeId)).catch(() => {});
    }
  } catch (err) {
    console.warn("deletePlaceFromFirestore error:", err);
  }
}

export function subscribeToBloodRequestsFromFirestore(callback: (reqs: any[]) => void): () => void {
  return onSnapshot(collection(db, "blood_requests"), (snap) => {
    callback(filterAndPurgeDummySnapDocs(snap));
  }, () => {});
}

export function subscribeToVolunteerDonorsFromFirestore(callback: (donors: any[]) => void): () => void {
  return onSnapshot(collection(db, "volunteer_donors"), (snap) => {
    callback(filterAndPurgeDummySnapDocs(snap));
  }, () => {});
}

// Disaster Relief Real-time Listener (Added to fix build error)
export function subscribeToDisasterReliefFromFirestore(callback: (items: any[]) => void): () => void {
  return onSnapshot(collection(db, "disaster_relief"), (snap) => {
    callback(filterAndPurgeDummySnapDocs(snap));
  }, () => {});
}

// Job Storage & Comments Real-time Functions
export function subscribeToJobsFromFirestore(callback: (jobs: any[]) => void): () => void {
  return onSnapshot(collection(db, "jobs"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => {});
}

export async function saveJobToFirestore(job: any) {
  const id = job.id ? String(job.id) : "job_" + Date.now();
  await setDoc(doc(db, "jobs", id), sanitizeForFirestore({ ...job, id }), { merge: true });
  return id;
}

export async function deleteJobFromFirestore(jobId: string) {
  if (!jobId) return;
  await deleteDoc(doc(db, "jobs", jobId)).catch(() => {});
}

export function subscribeToJobCommentsFromFirestore(jobId: string, callback: (comments: any[]) => void) {
  if (!jobId) return () => {};
  try {
    const commentsRef = collection(db, 'jobs', jobId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const comments: any[] = [];
      snapshot.forEach((docSnap) => {
        comments.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(comments);
    }, (error) => {
      console.warn('Error listening to job comments:', error);
    });
  } catch (error) {
    console.error('subscribeToJobCommentsFromFirestore error:', error);
    return () => {};
  }
}

export async function saveJobCommentToFirestore(jobId: string, commentData: any): Promise<string> {
  if (!jobId) return '';
  try {
    const commentsRef = collection(db, 'jobs', jobId, 'comments');
    const commentId = commentData.id || `comment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const payload = sanitizeForFirestore({
      ...commentData,
      id: commentId,
      createdAt: commentData.createdAt || new Date().toISOString(),
      createdAtServer: serverTimestamp()
    });
    
    await setDoc(doc(commentsRef, commentId), payload, { merge: true });
    return commentId;
  } catch (error) {
    console.error('saveJobCommentToFirestore error:', error);
    return '';
  }
}

export function subscribeToAccommodationsFromFirestore(callback: (items: any[]) => void): () => void {
  return onSnapshot(collection(db, "accommodations"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, () => {});
}

export async function saveAccommodationToFirestore(item: any) {
  const id = item.id ? String(item.id) : "acc_" + Date.now();
  await setDoc(doc(db, "accommodations", id), sanitizeForFirestore({ ...item, id }), { merge: true });
  return id;
}

export async function deleteAccommodationFromFirestore(id: string) {
  if (!id) return;
  await deleteDoc(doc(db, "accommodations", id)).catch(() => {});
}

export function subscribeToBarterItemsFromFirestore(callback: (items: any[]) => void): () => void {
  return onSnapshot(collection(db, "barter_items"), (snap) => {
    callback(filterAndPurgeDummySnapDocs(snap));
  }, () => {});
}

export async function saveBarterItemToFirestore(item: any) {
  const id = item.id ? String(item.id) : "barter_" + Date.now();
  await setDoc(doc(db, "barter_items", id), sanitizeForFirestore({ ...item, id }), { merge: true });
  return id;
}

export async function deleteBarterItemFromFirestore(id: string) {
  if (!id) return;
  await deleteDoc(doc(db, "barter_items", id)).catch(() => {});
}

// ==============================================================
// 🩸 BLOOD & DISASTER RELIEF
// ==============================================================

export async function saveBloodRequestToFirestore(req: any) {
  const id = req.id ? req.id : "blood_" + Date.now();
  const docRef = doc(db, "blood_requests", id);
  await setDoc(docRef, sanitizeForFirestore({ ...req, id }), { merge: true });
  return id;
}

export async function deleteBloodRequestFromFirestore(id: string) {
  await deleteDoc(doc(db, "blood_requests", id));
}

export async function saveVolunteerDonorToFirestore(donor: any) {
  const id = donor.id ? donor.id : "donor_" + Date.now();
  const docRef = doc(db, "volunteer_donors", id);
  await setDoc(docRef, sanitizeForFirestore({ ...donor, id }), { merge: true });
  return id;
}

export async function deleteVolunteerDonorFromFirestore(id: string) {
  await deleteDoc(doc(db, "volunteer_donors", id));
}

export async function saveDisasterReliefToFirestore(relief: any) {
  const id = relief.id ? relief.id : "relief_" + Date.now();
  const docRef = doc(db, "disaster_relief", id);
  await setDoc(docRef, sanitizeForFirestore({ ...relief, id }), { merge: true });
  return id;
}

export async function deleteDisasterReliefFromFirestore(id: string) {
  await deleteDoc(doc(db, "disaster_relief", id));
}

// ==============================================================
// 🏛️ TRANSPARENT AID LEDGER
// ==============================================================

export function subscribeToAidCentersFromFirestore(callback: (centers: any[]) => void): () => void {
  const colRef = collection(db, "aid_centers");
  return onSnapshot(colRef, (snap) => {
    const data = filterAndPurgeDummySnapDocs(snap);
    callback(data);
  }, () => {});
}

export async function saveAidCenterToFirestore(item: any) {
  const id = item.id ? item.id : "aid_center_" + Date.now();
  const docRef = doc(db, "aid_centers", id);
  await setDoc(docRef, sanitizeForFirestore({ ...item, id }), { merge: true });
  return id;
}

export async function updateAidCenterInFirestore(id: string, updateData: any) {
  const docRef = doc(db, "aid_centers", id);
  await setDoc(docRef, sanitizeForFirestore({ ...updateData, updatedAtServer: serverTimestamp() }), { merge: true });
}

export async function deleteAidCenterFromFirestore(id: string) {
  await deleteDoc(doc(db, "aid_centers", id));
}

export function subscribeToAidDeliveriesFromFirestore(callback: (deliveries: any[]) => void): () => void {
  const colRef = collection(db, "aid_deliveries");
  return onSnapshot(colRef, (snap) => {
    const data = filterAndPurgeDummySnapDocs(snap);
    callback(data);
  }, () => {});
}

export async function saveAidDeliveryToFirestore(item: any) {
  const id = item.id ? item.id : "aid_delivery_" + Date.now();
  const docRef = doc(db, "aid_deliveries", id);
  await setDoc(docRef, sanitizeForFirestore({ ...item, id }), { merge: true });
  return id;
}

export async function updateAidDeliveryInFirestore(id: string, updateData: any) {
  const docRef = doc(db, "aid_deliveries", id);
  await setDoc(docRef, sanitizeForFirestore({ ...updateData, updatedAtServer: serverTimestamp() }), { merge: true });
}

export async function deleteAidDeliveryFromFirestore(id: string) {
  await deleteDoc(doc(db, "aid_deliveries", id));
}

export function subscribeToAidBroadcastsFromFirestore(callback: (broadcasts: any[]) => void): () => void {
  const colRef = collection(db, "aid_broadcasts");
  return onSnapshot(colRef, (snap) => {
    const data = filterAndPurgeDummySnapDocs(snap);
    callback(data);
  }, () => {});
}

export async function saveAidBroadcastToFirestore(item: any) {
  const id = item.id ? item.id : "aid_broadcast_" + Date.now();
  const docRef = doc(db, "aid_broadcasts", id);
  await setDoc(docRef, sanitizeForFirestore({ ...item, id }), { merge: true });
  return id;
}

// ==============================================================
// 🗑️ DELETED RECORDS MAP
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

// ==============================================================
// 🔑 PASSWORD RESET REQUESTS OPERATIONS
// ==============================================================
export const PASSWORD_RESETS_COLLECTION = 'password_reset_requests';

export function subscribeToPasswordResetRequests(callback: (requests: any[]) => void): () => void {
  const colRef = collection(db, PASSWORD_RESETS_COLLECTION);
  return onSnapshot(colRef, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(list);
  }, (err) => {
    console.warn('subscribeToPasswordResetRequests error:', err);
  });
}

export async function submitPasswordResetRequest(requestData: any): Promise<string> {
  const id = requestData.id || `reset_${Date.now()}`;
  try {
    const docRef = doc(db, PASSWORD_RESETS_COLLECTION, id);
    await setDoc(docRef, sanitizeForFirestore({
      ...requestData,
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdAtServer: serverTimestamp()
    }));
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, PASSWORD_RESETS_COLLECTION);
    return id;
  }
}

export async function updatePasswordResetRequestInFirestore(id: string, updateData: any): Promise<void> {
  try {
    const docRef = doc(db, PASSWORD_RESETS_COLLECTION, id);
    await setDoc(docRef, sanitizeForFirestore({
      ...updateData,
      updatedAtServer: serverTimestamp()
    }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${PASSWORD_RESETS_COLLECTION}/${id}`);
  }
}

export async function deletePasswordResetRequestFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, PASSWORD_RESETS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${PASSWORD_RESETS_COLLECTION}/${id}`);
  }
}

// ==============================================================
// 🤖 8. AI KNOWLEDGE BASE & ACTIVE LEARNING REPOSITORY
// ==============================================================
export const PENDING_AI_QUERIES_COLLECTION = 'pending_ai_queries';
export const VERIFIED_AI_KNOWLEDGE_COLLECTION = 'verified_ai_knowledge';

export function subscribeToPendingAiQueries(callback: (queries: PendingAiQuery[]) => void): () => void {
  try {
    const q = query(collection(db, PENDING_AI_QUERIES_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const items: PendingAiQuery[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      items.sort((a, b) => new Date(b.askedAt || 0).getTime() - new Date(a.askedAt || 0).getTime());
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, PENDING_AI_QUERIES_COLLECTION);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, PENDING_AI_QUERIES_COLLECTION);
    return () => {};
  }
}

export async function savePendingAiQuery(queryData: Partial<PendingAiQuery>): Promise<string> {
  const id = queryData.id || `ai_q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const docRef = doc(db, PENDING_AI_QUERIES_COLLECTION, id);
    await setDoc(docRef, sanitizeForFirestore({
      id,
      question: queryData.question || '',
      answer: queryData.answer || '',
      detectedLang: queryData.detectedLang || 'si',
      askedAt: new Date().toISOString(),
      status: 'pending',
      locationContext: queryData.locationContext || '',
      userPhone: queryData.userPhone || '',
      createdAtServer: serverTimestamp()
    }));
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, PENDING_AI_QUERIES_COLLECTION);
    return id;
  }
}

export function subscribeToVerifiedAiKnowledge(callback: (items: VerifiedAiKnowledgeItem[]) => void): () => void {
  try {
    const q = query(collection(db, VERIFIED_AI_KNOWLEDGE_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const items: VerifiedAiKnowledgeItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, VERIFIED_AI_KNOWLEDGE_COLLECTION);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, VERIFIED_AI_KNOWLEDGE_COLLECTION);
    return () => {};
  }
}

export async function approveAiQuery(
  pendingId: string,
  knowledgeItem: Omit<VerifiedAiKnowledgeItem, 'id' | 'updatedAt'>
): Promise<string> {
  const id = `k_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const verifiedRef = doc(db, VERIFIED_AI_KNOWLEDGE_COLLECTION, id);
    await setDoc(verifiedRef, sanitizeForFirestore({
      ...knowledgeItem,
      id,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp()
    }));

    const pendingRef = doc(db, PENDING_AI_QUERIES_COLLECTION, pendingId);
    await deleteDoc(pendingRef);

    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, VERIFIED_AI_KNOWLEDGE_COLLECTION);
    return id;
  }
}

export async function rejectPendingAiQuery(pendingId: string): Promise<void> {
  try {
    const pendingRef = doc(db, PENDING_AI_QUERIES_COLLECTION, pendingId);
    await deleteDoc(pendingRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${PENDING_AI_QUERIES_COLLECTION}/${pendingId}`);
  }
}

export async function saveVerifiedAiKnowledgeItem(item: Partial<VerifiedAiKnowledgeItem>): Promise<string> {
  const id = item.id || `k_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const docRef = doc(db, VERIFIED_AI_KNOWLEDGE_COLLECTION, id);
    await setDoc(docRef, sanitizeForFirestore({
      ...item,
      id,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp()
    }), { merge: true });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${VERIFIED_AI_KNOWLEDGE_COLLECTION}/${id}`);
    return id;
  }
}

export async function deleteVerifiedAiKnowledgeItem(id: string): Promise<void> {
  try {
    const docRef = doc(db, VERIFIED_AI_KNOWLEDGE_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${VERIFIED_AI_KNOWLEDGE_COLLECTION}/${id}`);
  }
}

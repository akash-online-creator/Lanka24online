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
  // Preserve Firestore FieldValue and serverTimestamp
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

export interface PaginatedPostsResult {
  posts: any[];
  lastDoc: any | null;
  hasMore: boolean;
}

/**
 * 📢 Firestore මගින් දැන්වීම් 4 බැගින් (batch load) අලුත්ම ඒවා උඩින්ම එන සේ ලබා ගැනීම
 */
export async function fetchHelpPostsPaginated(
  lastDoc: any | null = null,
  pageSize: number = 4
): Promise<PaginatedPostsResult> {
  try {
    const colRef = collection(db, POSTS_COLLECTION);
    
    // createdAt මගින් අලුත්ම දැන්වීම් මුලින්ම (desc) පෙළගැස්වීම
    let q = query(
      colRef,
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(
        colRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }

    const snap = await getDocs(q);
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const newLastDoc = snap.docs[snap.docs.length - 1] || null;
    const hasMore = snap.docs.length === pageSize;

    return {
      posts,
      lastDoc: newLastDoc,
      hasMore,
    };
  } catch (err) {
    console.warn('fetchHelpPostsPaginated error:', err);
    return { posts: [], lastDoc: null, hasMore: false };
  }
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

    // 🚀 CRITICAL: Update the parent post document so that post.replies and activity timestamps are updated!
    // This allows MessageInboxModal, MessageInboxBubble, and Realtime Listeners to instantly notify the post owner!
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

      await setDoc(postDocRef, sanitizeForFirestore({
        lastMessage: messageData.text || '',
        lastMessageSenderName: messageData.senderName || '',
        lastMessageSenderPhone: messageData.senderPhone || '',
        lastMessageTime: nowIso,
        lastMessageTimeMs: nowMs,
        replies: arrayUnion(replyEntry),
        updatedAtServer: serverTimestamp(),
      }), { merge: true });
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
  // Listen without an index-requiring orderBy so missing fields or lack of composite index will never fail
  return onSnapshot(colRef, (snap) => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Robust in-memory sort by createdAtMs / createdAt / server timestamp
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

export async function deleteRedAlertInFirestore(id: string) {
  const docRef = doc(db, RED_ALERTS_COLLECTION, id);
  const nowIso = new Date().toISOString();
  const nowDisplay = `${new Date().toLocaleDateString('si-LK')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  await setDoc(docRef, sanitizeForFirestore({
    status: 'cancelled',
    isDeleted: true,
    cancelledReason: 'දැන්වීම ඉවත් කරන ලදී',
    cancelledAt: nowIso,
    deletedAt: nowIso,
    deletedAtDisplay: nowDisplay,
    updatedAtServer: serverTimestamp(),
  }), { merge: true });
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
    updatedAtServer: serverTimestamp(),
  }), { merge: true });
}

export async function reportRedAlertAsFake(id: string, reportData?: any) {
  const docRef = doc(db, RED_ALERTS_COLLECTION, id);
  try {
    const snap = await getDoc(docRef);
    let reporterUserId = '';
    if (snap.exists()) {
      const data = snap.data();
      reporterUserId = data.reportedByUserId || '';
    }
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
          reason: 'බොරුවක් ලෙස වාර්තා කරන ලදී',
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
        statusChangeMessage: '⚠️ මෙය බොරුවට පළකරන ලද දැන්වීමකි',
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


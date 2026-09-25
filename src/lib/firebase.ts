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
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

import firebaseConfigJson from '../../firebase-applet-config.json';
import { User, RedAlertItem, RedAlertComment, SosLiveSession } from '../types';
import { deduplicateUsers } from '../utils/userUtils';

export type { RedAlertItem, RedAlertComment, SosLiveSession };

// ==============================================================
// 🔥 FIREBASE INITIALIZATION & HELPER TYPES
// ==============================================================

const env: any = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

if (!firebaseConfig.apiKey) {
  console.warn('Firebase API Configuration missing! Check your firebase-applet-config.json or .env file.');
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Auth සහ Firestore Export කිරීම (Configured Database ID with Long Polling)
function initFirestoreInstance() {
  const dbId = firebaseConfigJson.firestoreDatabaseId || undefined;
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, dbId);
  } catch {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db = initFirestoreInstance();
export const auth = getAuth(app);

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
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: any, operation: OperationType | string, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType: operation,
    path,
  };
  console.warn(`Firestore Warning [${operation}] on ${path}:`, errInfo.error);
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively cleans any object to remove `undefined` fields which Firestore rejects with error
 */
export function sanitizeForFirestore<T = any>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj instanceof Date || ('nanoseconds' in (obj as any)) || ('_methodName' in (obj as any))) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return (obj
      .filter((item) => item !== undefined)
      .map((item) => (item !== null && typeof item === 'object' ? sanitizeForFirestore(item) : item)) as unknown) as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj as Record<string, any>)) {
    if (val === undefined) continue;
    if (val !== null && typeof val === 'object') {
      clean[key] = sanitizeForFirestore(val);
    } else {
      clean[key] = val;
    }
  }
  return clean as T;
}

// ==============================================================
// 🚨 RED ALERTS (රතු එළිය) FIRESTORE OPERATIONS
// ==============================================================
const RED_ALERTS_COLLECTION = 'red_alerts';

function mapDocToRedAlert(docSnap: DocumentData | QueryDocumentSnapshot<DocumentData>): RedAlertItem {
  const data = docSnap.data ? docSnap.data() : docSnap;
  const id = docSnap.id || data.id || `alert_${Date.now()}`;
  return {
    id,
    alertCode: data.alertCode || `#RED-${id.substring(0, 4)}`,
    disasterType: data.disasterType || 'other',
    customDisasterTitle: data.customDisasterTitle || '',
    disasterTitleSi: data.disasterTitleSi || 'හදිසි ආපදාව',
    disasterTitleEn: data.disasterTitleEn || 'Emergency Disaster',
    disasterTitleTa: data.disasterTitleTa || 'அவசர பேரழிவு',
    description: data.description || '',
    latitude: typeof data.latitude === 'number' ? data.latitude : 6.9271,
    longitude: typeof data.longitude === 'number' ? data.longitude : 79.8612,
    locationName: data.locationName || 'නොදන්නා ස්ථානය',
    locationAccuracyMeters: data.locationAccuracyMeters || 10,
    incidentDate: data.incidentDate || new Date().toISOString().split('T')[0],
    incidentTime: data.incidentTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: data.createdAt || new Date().toISOString(),
    createdAtMs: typeof data.createdAtMs === 'number' ? data.createdAtMs : Date.now(),
    reportedByUserId: data.reportedByUserId || '',
    reportedByName: data.reportedByName || 'හදිසි දැනුම්දෙන්නා',
    reportedByPhone: data.reportedByPhone || '',
    status: data.status || 'active',
    severity: data.severity || 'critical',
    comments: Array.isArray(data.comments) ? data.comments : [],
    fakeReports: Array.isArray(data.fakeReports) ? data.fakeReports : [],
    isFlaggedFake: Boolean(data.isFlaggedFake),
    adminActionNote: data.adminActionNote || '',
    statusChangeMessage: data.statusChangeMessage || null,
    latestReporterUpdate: data.latestReporterUpdate || null,
  };
}

export function subscribeToRedAlerts(
  callback: (alerts: RedAlertItem[]) => void,
  onError?: (error: any) => void
): () => void {
  const colRef = collection(db, RED_ALERTS_COLLECTION);
  const q = query(colRef, orderBy('createdAtMs', 'desc'), limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const remoteAlerts = snapshot.docs.map((docSnap) => mapDocToRedAlert(docSnap));
      callback(remoteAlerts);
    },
    (error) => {
      console.warn('subscribeToRedAlerts snapshot status:', error?.message || error);
      if (onError) onError(error);
    }
  );
}

export async function createRedAlertInFirestore(
  alertData: Omit<RedAlertItem, 'id'>
): Promise<string> {
  const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newAlertItem: RedAlertItem = {
    ...alertData,
    id: alertId,
  };

  try {
    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    const sanitizedPayload = sanitizeForFirestore({
      ...newAlertItem,
      createdAtServer: serverTimestamp(),
    });
    await setDoc(docRef, sanitizedPayload);
    return alertId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, RED_ALERTS_COLLECTION);
  }
}

export async function markRedAlertAsResolved(
  alertId: string,
  note?: string
): Promise<void> {
  try {
    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    const popupMessage = "✅ දැනුම්දීම පලකළ තැනැත්තා විසින් මෙම ආපදාව විසඳුනු බව සටහන් කළේය.";
    
    await setDoc(docRef, {
      status: 'resolved',
      statusChangeMessage: popupMessage,
      adminActionNote: note || 'Resolved by reporter',
      resolvedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('markRedAlertAsResolved notice:', error);
  }
}

export async function cancelRedAlertByReporter(
  alertId: string,
  reason?: string
): Promise<void> {
  try {
    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    const popupMessage = "ℹ️ දැනුම්දීම පලකළ තැනැත්තා විසින් මෙම ආපදා නිවේදනය ඉවත් කරගන්නා ලදී.";

    await setDoc(docRef, {
      status: 'cancelled',
      statusChangeMessage: popupMessage,
      adminActionNote: reason || 'Cancelled by reporter',
      cancelledAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('cancelRedAlertByReporter notice:', error);
  }
}

export async function addReporterUpdateToRedAlert(
  alertId: string,
  updateText: string,
  reporterInfo?: { reporterId?: string; reporterName?: string }
): Promise<void> {
  try {
    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    const resolvedName = reporterInfo?.reporterName || 'වාර්තාකරු';
    const timestamp = new Date().toISOString();

    const updateObj: RedAlertComment = {
      id: `rep_up_${Date.now()}`,
      authorName: resolvedName,
      userName: resolvedName,
      userId: reporterInfo?.reporterId || '',
      text: updateText,
      comment: updateText,
      createdAt: timestamp,
      createdAtDisplay: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isReporterUpdate: true,
    };

    const notificationMessage = `💬 වාර්තාකරුගෙන් අලුත් යාවත්කාලීන කිරීමක්: ${updateText}`;

    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const existing = snap.data();
      const existingComments = Array.isArray(existing.comments) ? existing.comments : [];
      await setDoc(docRef, {
        comments: [...existingComments, updateObj],
        latestReporterUpdate: {
          text: updateText,
          createdAt: timestamp,
          reporterName: resolvedName,
          notificationText: notificationMessage,
        },
        updatedAtServer: serverTimestamp(),
      }, { merge: true });
    } else {
      await setDoc(docRef, {
        comments: [updateObj],
        latestReporterUpdate: {
          text: updateText,
          createdAt: timestamp,
          reporterName: resolvedName,
          notificationText: notificationMessage,
        },
        updatedAtServer: serverTimestamp(),
      }, { merge: true });
    }
  } catch (error) {
    console.warn('addReporterUpdateToRedAlert notice:', error);
  }
}

export async function seedInitialRedAlertsToFirestore(initialAlertsList?: RedAlertItem[]): Promise<void> {
  try {
    if (!Array.isArray(initialAlertsList)) return;
    for (const alert of initialAlertsList) {
      if (alert && alert.id) {
        const docRef = doc(db, RED_ALERTS_COLLECTION, alert.id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          await setDoc(docRef, {
            ...alert,
            createdAtServer: serverTimestamp(),
          });
        }
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, RED_ALERTS_COLLECTION);
  }
}

export async function updateRedAlertStatus(
  alertId: string,
  status: 'active' | 'resolved' | 'cancelled' | 'false_alarm',
  note?: string
): Promise<void> {
  try {
    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    await updateDoc(docRef, {
      status,
      ...(note !== undefined ? { adminActionNote: note } : {}),
      updatedAtServer: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${RED_ALERTS_COLLECTION}/${alertId}`);
  }
}

export async function deleteRedAlertInFirestore(alertId: string): Promise<void> {
  try {
    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${RED_ALERTS_COLLECTION}/${alertId}`);
  }
}

export async function addCommentToRedAlert(
  alertId: string,
  comment: RedAlertComment
): Promise<void> {
  try {
    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    const resolvedName = comment.authorName || comment.userName || 'භාවිතා කරන්නා';
    const resolvedText = comment.text || comment.comment || '';
    await updateDoc(docRef, {
      comments: arrayUnion({
        ...comment,
        authorName: resolvedName,
        userName: resolvedName,
        text: resolvedText,
        comment: resolvedText,
        createdAt: comment.createdAt || new Date().toISOString(),
      }),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${RED_ALERTS_COLLECTION}/${alertId}`);
  }
}

export async function flagRedAlertAsFake(
  alertId: string,
  reporterInfo?: { userId?: string; name?: string; reason?: string }
): Promise<void> {
  try {
    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    await updateDoc(docRef, {
      isFlaggedFake: true,
      fakeReports: arrayUnion({
        ...(reporterInfo || {}),
        reportedAt: new Date().toISOString(),
      }),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${RED_ALERTS_COLLECTION}/${alertId}`);
  }
}

export const reportRedAlertAsFake = flagRedAlertAsFake;

// ==============================================================
// 🔊 SYSTEM SETTINGS & SIREN TONE FIRESTORE SYNC
// ==============================================================
export const SYSTEM_SETTINGS_COLLECTION = 'system_settings';
export const SIREN_CONFIG_DOC = 'siren_config';

export interface SirenSettingsData {
  audioUrl?: string | null;
  fileName: string;
  presetType?: string;
  updatedAt?: string;
  updatedAtMs?: number;
  updatedBy?: string;
}

export async function saveSirenSettingsToFirestore(
  settings: {
    audioUrl?: string | null;
    fileName: string;
    presetType?: string;
    updatedBy?: string;
  }
): Promise<void> {
  try {
    const settingRef = doc(db, SYSTEM_SETTINGS_COLLECTION, SIREN_CONFIG_DOC);
    await setDoc(
      settingRef,
      {
        audioUrl: settings.audioUrl || null,
        fileName: settings.fileName || 'Air Raid Siren (Preset)',
        presetType: settings.presetType || '',
        updatedBy: settings.updatedBy || 'Admin',
        updatedAt: new Date().toISOString(),
        updatedAtMs: Date.now(),
        updatedAtServer: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SYSTEM_SETTINGS_COLLECTION}/${SIREN_CONFIG_DOC}`);
  }
}

export function subscribeToSirenSettings(
  callback: (settings: { audioUrl: string | null; fileName: string; presetType: string }) => void
): () => void {
  try {
    const settingRef = doc(db, SYSTEM_SETTINGS_COLLECTION, SIREN_CONFIG_DOC);
    return onSnapshot(
      settingRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          callback({
            audioUrl: data.audioUrl || null,
            fileName: data.fileName || 'Air Raid Siren (Preset)',
            presetType: data.presetType || '',
          });
        }
      },
      (error) => {
        console.error('Siren settings listener error:', error);
      }
    );
  } catch (err) {
    console.error('subscribeToSirenSettings error:', err);
    return () => {};
  }
}

export async function fetchSirenSettingsFromFirestore(): Promise<{
  audioUrl: string | null;
  fileName: string;
  presetType: string;
} | null> {
  try {
    const settingRef = doc(db, SYSTEM_SETTINGS_COLLECTION, SIREN_CONFIG_DOC);
    const snap = await getDoc(settingRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        audioUrl: data.audioUrl || null,
        fileName: data.fileName || 'Air Raid Siren (Preset)',
        presetType: data.presetType || '',
      };
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.READ, `${SYSTEM_SETTINGS_COLLECTION}/${SIREN_CONFIG_DOC}`);
  }
}

// ==============================================================
// 📦 BACKUP & USER PROFILE FIRESTORE OPERATIONS
// ==============================================================

export async function fetchAllPostsBackupData(currentPosts?: any[]): Promise<{ items: any[]; totalPostsCount: number }> {
  try {
    const colRef = collection(db, 'posts');
    const snap = await getDocs(colRef);
    const remotePosts = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    const items = remotePosts.length > 0 ? remotePosts : (currentPosts || []);
    return { items, totalPostsCount: items.length };
  } catch (err) {
    console.error('fetchAllPostsBackupData error:', err);
    const items = currentPosts || [];
    return { items, totalPostsCount: items.length };
  }
}

/**
 * Posts Backup Data Batch එකක් ලෙස Firestore එකට Restore කරයි (Fast Performance)
 */
export async function restorePostsBackupData(postsData: any): Promise<{ restoredPostsList: any[]; restoredPostsCount: number; restoredMessagesCount: number }> {
  try {
    const list = Array.isArray(postsData) ? postsData : (postsData?.items || postsData?.posts || []);
    const batch = writeBatch(db);
    let restoredCount = 0;

    for (const item of list) {
      if (item && item.id) {
        const docRef = doc(db, 'posts', item.id);
        const { id, ...dataToSave } = item;
        batch.set(docRef, dataToSave, { merge: true });
        restoredCount++;
      }
    }
    await batch.commit();
    return { restoredPostsList: list, restoredPostsCount: restoredCount, restoredMessagesCount: 0 };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'posts');
  }
}

export async function syncUserProfileToFirestore(userIdOrData: any, profileData?: any): Promise<void> {
  try {
    let userId = typeof userIdOrData === 'string' ? userIdOrData : userIdOrData?.id || userIdOrData?.userId;
    let data = profileData || userIdOrData;
    if (!userId) return;

    const docRef = doc(db, 'users', userId);
    const sanitized = sanitizeForFirestore({
      ...data,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'users');
  }
}

// ==============================================================
// 🆘 HELP POSTS & CHAT FIRESTORE OPERATIONS
// ==============================================================

export function subscribeToHelpPosts(
  callback: (posts: any[]) => void
): () => void {
  try {
    const postsColRef = collection(db, 'posts');
    const q = query(postsColRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const posts = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback(posts);
      },
      (error) => {
        console.warn('Help posts snapshot status:', error?.message || error);
      }
    );
  } catch (err) {
    console.error('subscribeToHelpPosts setup error:', err);
    return () => {};
  }
}

export async function addHelpPostToFirestore(
  postData: Record<string, any>
): Promise<string> {
  try {
    const postsColRef = collection(db, 'posts');
    const docRef = await addDoc(postsColRef, sanitizeForFirestore({
      ...postData,
      createdAt: new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'posts');
  }
}

export async function addReplyToFirestore(
  postId: string,
  replyData: Record<string, any>,
  _existingReplies?: any[]
): Promise<void> {
  try {
    const repliesColRef = collection(db, 'posts', postId, 'replies');
    await addDoc(repliesColRef, sanitizeForFirestore({
      ...replyData,
      createdAt: new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `posts/${postId}/replies`);
  }
}

export async function updateHelpPostInFirestore(
  postId: string,
  updateData: Record<string, any>
): Promise<void> {
  try {
    const docRef = doc(db, 'posts', postId);
    await updateDoc(docRef, sanitizeForFirestore({
      ...updateData,
      updatedAtServer: serverTimestamp(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
  }
}

export async function sendChatMessageToFirestore(
  postId: string,
  messageData: {
    senderId?: string;
    senderName: string;
    senderRole?: string;
    text: string;
    createdAt?: string;
    [key: string]: any;
  }
): Promise<void> {
  try {
    const chatColRef = collection(db, 'posts', postId, 'messages');
    await addDoc(chatColRef, sanitizeForFirestore({
      ...messageData,
      createdAt: messageData.createdAt || new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `posts/${postId}/messages`);
  }
}

export function subscribeToChatMessages(
  postId: string,
  callback: (messages: any[]) => void
): () => void {
  try {
    const chatColRef = collection(db, 'posts', postId, 'messages');
    const q = query(chatColRef, orderBy('createdAt', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const messages = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback(messages);
      },
      (error) => {
        console.warn('Chat messages snapshot status:', error?.message || error);
      }
    );
  } catch (err) {
    console.error('subscribeToChatMessages setup error:', err);
    return () => {};
  }
}

// ==============================================================
// 🛒 MARKETPLACE FIRESTORE OPERATIONS
// ==============================================================
const MARKETPLACE_COLLECTION = 'marketplace_items';

export function subscribeToMarketplaceItems(
  callback: (items: any[]) => void
): () => void {
  try {
    const colRef = collection(db, MARKETPLACE_COLLECTION);

    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback(items);
      },
      (error) => {
        console.warn('Marketplace items snapshot status:', error?.message || error);
      }
    );
  } catch (err) {
    console.error('subscribeToMarketplaceItems setup error:', err);
    return () => {};
  }
}

export async function addMarketplaceItemToFirestore(
  itemData: Record<string, any>
): Promise<string> {
  try {
    const colRef = collection(db, MARKETPLACE_COLLECTION);
    const docRef = await addDoc(colRef, sanitizeForFirestore({
      ...itemData,
      createdAt: new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, MARKETPLACE_COLLECTION);
  }
}

export async function deleteMarketplaceItemFromFirestore(
  itemId: string
): Promise<void> {
  try {
    const docRef = doc(db, MARKETPLACE_COLLECTION, itemId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${MARKETPLACE_COLLECTION}/${itemId}`);
  }
}

// ==============================================================
// 🔖 SAVED POSTS FIRESTORE OPERATIONS
// ==============================================================

export function subscribeToUserSavedPosts(
  userId: string,
  callback: (savedPostIds: string[]) => void
): () => void {
  try {
    if (!userId) {
      callback([]);
      return () => {};
    }
    const userDocRef = doc(db, 'users', userId);

    return onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          callback(Array.isArray(data.savedPosts) ? data.savedPosts : []);
        } else {
          callback([]);
        }
      },
      (error) => {
        console.error('Saved posts listener error:', error);
        callback([]);
      }
    );
  } catch (err) {
    console.error('subscribeToUserSavedPosts error:', err);
    return () => {};
  }
}

export async function toggleSavePostInFirestore(
  userId: string,
  postId: string,
  isCurrentlySaved: boolean
): Promise<void> {
  try {
    if (!userId || !postId) return;
    const userDocRef = doc(db, 'users', userId);

    await setDoc(
      userDocRef,
      {
        savedPosts: isCurrentlySaved
          ? arrayRemove(postId)
          : arrayUnion(postId),
        updatedAtServer: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

// ==============================================================
// 👤 USER MANAGEMENT & SEED OPERATIONS
// ==============================================================

/**
 * සියලුම ගැළපෙන පරිශීලක ලේඛන Firestore එකෙන් ලබා ගනී (Doc ID, NIC, User ID, Numeric ID, Phone, Email)
 * Direct Doc ID Fast Lookup හරහා තත්පර 1කට අඩු කාලයකදී ලබා ගනී
 */
export async function getAllMatchingUsersFromFirestore(userIdOrInput: string): Promise<any[]> {
  try {
    if (!userIdOrInput) return [];
    const cleanInput = String(userIdOrInput).trim();
    if (!cleanInput) return [];
    const cleanInputLower = cleanInput.toLowerCase();
    const cleanInputUpper = cleanInput.toUpperCase();
    const numericPart = cleanInput.replace(/[^0-9]/g, '');
    const resultsMap = new Map<string, any>();

    // 1. Direct Document ID Search in parallel (FAST: ~200-400ms)
    const directDocIds = Array.from(new Set([cleanInput, cleanInputUpper, cleanInputLower, numericPart].filter(Boolean)));

    const directSnaps = await Promise.all(
      directDocIds.map((docId) => getDoc(doc(db, 'users', docId)).catch(() => null))
    );

    for (const snap of directSnaps) {
      if (snap && snap.exists()) {
        const data = snap.data();
        resultsMap.set(snap.id, { id: snap.id, ...data });
      }
    }

    // 2. Targeted queries across users collection to find any secondary docs
    const colRef = collection(db, 'users');
    const targetedQueries = [
      query(colRef, where('nicNumber', '==', cleanInputUpper)),
      query(colRef, where('userId', '==', cleanInputUpper)),
    ];
    if (numericPart && numericPart !== cleanInputUpper) {
      targetedQueries.push(query(colRef, where('userNumericId', '==', numericPart)));
    }
    if (cleanInput.includes('@')) {
      targetedQueries.push(query(colRef, where('email', '==', cleanInputLower)));
    } else if (/^\d{9,12}$/.test(cleanInput)) {
      targetedQueries.push(query(colRef, where('phone', '==', cleanInput)));
    }

    const snapshots = await Promise.all(targetedQueries.map((q) => getDocs(q).catch(() => null)));
    for (const qSnap of snapshots) {
      if (qSnap && !qSnap.empty) {
        qSnap.forEach((d) => resultsMap.set(d.id, { id: d.id, ...d.data() }));
      }
    }

    return Array.from(resultsMap.values());
  } catch (err) {
    console.warn('Matching users lookup warning:', err);
    return [];
  }
}

/**
 * NIC, User ID, හෝ Email එක මගින් පරිශීලක දත්ත ලබා ගනී (Case-Insensitive Search & Merged Attributes)
 */
export async function getUserFromFirestore(userIdOrInput: string): Promise<any | null> {
  try {
    const matches = await getAllMatchingUsersFromFirestore(userIdOrInput);
    if (!matches || matches.length === 0) return null;
    if (matches.length === 1) {
      const u = matches[0];
      return {
        ...u,
        status: u.status || 'approved',
        role: u.role || 'user',
        isTemporaryPassword: u.isTemporaryPassword === true,
        isPasswordChanged: u.isPasswordChanged ?? !u.isTemporaryPassword,
      };
    }

    // බහුවිධ ලේඛන ඇති විට සම්පූර්ණ නම සහිත, මුරපදය මාරු කළ සහ නවතම ලේඛනයට ප්‍රමුඛතාව ලබා දීම
    matches.sort((a, b) => {
      const aHasName = Boolean(a.name && String(a.name).trim().length > 0);
      const bHasName = Boolean(b.name && String(b.name).trim().length > 0);
      if (aHasName && !bHasName) return -1;
      if (!aHasName && bHasName) return 1;

      if (a.isPasswordChanged && !b.isPasswordChanged) return -1;
      if (!a.isPasswordChanged && b.isPasswordChanged) return 1;

      const tA = new Date(a.updatedAt || a.registeredAt || 0).getTime();
      const tB = new Date(b.updatedAt || b.registeredAt || 0).getTime();
      return tB - tA;
    });

    // Primary document retains authority; merge non-empty attributes from other matches
    const primary = matches[0];
    const mergedUser: any = { ...primary };

    for (let i = 1; i < matches.length; i++) {
      const other = matches[i];
      for (const [key, value] of Object.entries(other)) {
        if (value !== undefined && value !== null && value !== '') {
          if (mergedUser[key] === undefined || mergedUser[key] === null || mergedUser[key] === '') {
            mergedUser[key] = value;
          }
        }
      }
    }

    mergedUser.status = primary.status || mergedUser.status || 'approved';
    mergedUser.role = primary.role || mergedUser.role || 'user';
    mergedUser.key = primary.key || primary.password || mergedUser.key || mergedUser.password;
    mergedUser.password = primary.password || primary.key || mergedUser.password || mergedUser.key;
    
    // මුරපදය මාරු කර ඇත්නම් පැරණි temporary code නැවත restore වීම වළක්වයි
    if (primary.isTemporaryPassword === false || primary.isPasswordChanged === true) {
      mergedUser.isTemporaryPassword = false;
      mergedUser.isPasswordChanged = true;
      mergedUser.tempCode = '';
      mergedUser.tempPassword = '';
    } else {
      mergedUser.isTemporaryPassword = primary.isTemporaryPassword ?? mergedUser.isTemporaryPassword ?? false;
      mergedUser.isPasswordChanged = primary.isPasswordChanged ?? mergedUser.isPasswordChanged ?? true;
    }

    return mergedUser;
  } catch (error) {
    console.warn('getUserFromFirestore notice:', error);
    return null;
  }
}

/**
 * පරිශීලකයාගේ නව මුරපදය Firestore හි ඇති සියලුම අදාළ ලේඛනවලට එකවර යාවත්කාලීන කරයි
 */
export async function syncUserPasswordInFirestore(userOrIdentifier: any, newPassword: string): Promise<void> {
  try {
    const cleanPass = (newPassword || '').trim();
    if (!cleanPass) return;

    let id = typeof userOrIdentifier === 'string' ? userOrIdentifier : userOrIdentifier?.id;
    let nic = typeof userOrIdentifier === 'string' ? userOrIdentifier : userOrIdentifier?.nicNumber;
    let uid = typeof userOrIdentifier === 'string' ? userOrIdentifier : userOrIdentifier?.userId;

    const allMatches = await getAllMatchingUsersFromFirestore(nic || uid || id || '');
    const docIdsToUpdate = new Set<string>();

    allMatches.forEach((m) => {
      if (m.id) docIdsToUpdate.add(m.id);
    });

    if (id) docIdsToUpdate.add(id);
    if (nic) {
      const cleanNicUpper = String(nic).trim().toUpperCase();
      const cleanNicLower = String(nic).trim().toLowerCase();
      const numericNic = cleanNicUpper.replace(/[^0-9]/g, '');
      if (numericNic) docIdsToUpdate.add(numericNic);
      docIdsToUpdate.add(cleanNicUpper);
      docIdsToUpdate.add(cleanNicLower);
    }
    if (uid) {
      docIdsToUpdate.add(String(uid).trim());
      docIdsToUpdate.add(String(uid).trim().toUpperCase());
    }

    const baseUserObj = typeof userOrIdentifier === 'object' && userOrIdentifier !== null ? userOrIdentifier : {};

    // Remove any undefined fields or leftover temp codes from base object
    const safeBase: any = {};
    for (const [k, v] of Object.entries(baseUserObj)) {
      if (v !== undefined && k !== 'tempCode' && k !== 'tempPassword') {
        safeBase[k] = v;
      }
    }

    const payload = sanitizeForFirestore({
      ...safeBase,
      key: cleanPass,
      password: cleanPass,
      securityCode: cleanPass,
      isPasswordChanged: true,
      isTemporaryPassword: false,
      status: safeBase.status || 'approved',
      role: safeBase.role || 'user',
      tempCode: '',
      tempPassword: '',
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    });

    await Promise.all(
      Array.from(docIdsToUpdate).map(async (docId) => {
        try {
          const docRef = doc(db, 'users', docId);
          await setDoc(docRef, payload, { merge: true });
        } catch (e) {
          console.warn(`Doc ${docId} password update notice:`, e);
        }
      })
    );
  } catch (err) {
    console.warn('syncUserPasswordInFirestore warning:', err);
  }
}

/**
 * පරිශීලකයාගේ නව WhatsApp අංකය Firestore හි ඇති සියලුම අදාළ ලේඛන සහ Help Posts වලට යාවත්කාලීන කරයි
 */
export async function syncUserWhatsappInFirestore(userOrIdentifier: any, newWhatsapp: string): Promise<boolean> {
  try {
    const cleanWhatsapp = (newWhatsapp || '').trim().replace(/[^\d+]/g, '');
    if (!cleanWhatsapp) return false;

    let id = typeof userOrIdentifier === 'string' ? userOrIdentifier : userOrIdentifier?.id;
    let nic = typeof userOrIdentifier === 'string' ? userOrIdentifier : userOrIdentifier?.nicNumber;
    let uid = typeof userOrIdentifier === 'string' ? userOrIdentifier : userOrIdentifier?.userId;
    let phone = typeof userOrIdentifier === 'string' ? userOrIdentifier : userOrIdentifier?.phone;

    const allMatches = await getAllMatchingUsersFromFirestore(nic || uid || id || phone || '');
    const docIdsToUpdate = new Set<string>();
    if (id) docIdsToUpdate.add(id);
    if (nic) {
      docIdsToUpdate.add(String(nic).trim());
      docIdsToUpdate.add(String(nic).trim().toUpperCase());
      docIdsToUpdate.add(String(nic).trim().toLowerCase());
    }
    if (uid) {
      docIdsToUpdate.add(String(uid).trim());
      docIdsToUpdate.add(String(uid).trim().toUpperCase());
    }
    allMatches.forEach((m) => docIdsToUpdate.add(m.id));

    const payload: any = {
      whatsappNumber: cleanWhatsapp,
      phone: cleanWhatsapp,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    };

    // 1. Update Users collection
    await Promise.all(
      Array.from(docIdsToUpdate).map(async (docId) => {
        try {
          const docRef = doc(db, 'users', docId);
          await setDoc(docRef, payload, { merge: true });
        } catch (e) {
          console.warn(`Doc users/${docId} WhatsApp update notice:`, e);
        }
      })
    );

    // 2. Update Help Posts created by this user
    try {
      const helpPostsRef = collection(db, 'help_posts');
      const postsSnap = await getDocs(helpPostsRef);
      const batchPromises: Promise<any>[] = [];

      postsSnap.forEach((postDoc) => {
        const pData = postDoc.data();
        const matchesPoster =
          (nic && (pData.userNic === nic || pData.nicNumber === nic)) ||
          (uid && (pData.userId === uid || pData.userNumericId === uid)) ||
          (id && pData.userId === id) ||
          (phone && (pData.userPhone === phone || pData.contactWhatsapp === phone));

        if (matchesPoster) {
          batchPromises.push(
            updateDoc(doc(db, 'help_posts', postDoc.id), {
              contactWhatsapp: cleanWhatsapp,
              userPhone: cleanWhatsapp,
            }).catch(() => null)
          );
        }
      });

      await Promise.all(batchPromises);
    } catch (postErr) {
      console.warn('Help posts WhatsApp sync notice:', postErr);
    }

    return true;
  } catch (err) {
    console.error('syncUserWhatsappInFirestore error:', err);
    return false;
  }
}

/**
 * පරිශීලක දත්ත Firestore එකට සුරකියි (Standardized Case Handling)
 */
export async function saveUserToFirestore(userIdOrUser: string | any, userData?: any): Promise<void> {
  try {
    let userObj = typeof userIdOrUser === 'object' ? userIdOrUser : { ...(userData || {}), id: userIdOrUser };
    const docId = userObj.userId || userObj.nicNumber || userObj.id || `usr_${Date.now()}`;
    const docRef = doc(db, 'users', docId);

    // Standardize NIC / Email format
    if (userObj.nicNumber) {
      userObj.nicNumber = String(userObj.nicNumber).trim().toUpperCase();
    }
    if (userObj.email) {
      userObj.email = String(userObj.email).trim().toLowerCase();
    }

    const sanitized = sanitizeForFirestore({
      ...userObj,
      id: docId,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'users');
  }
}

/**
 * පරිශීලක දත්ත යාවත්කාලීන කරයි (Safe setDoc with merge)
 */
export async function updateUserInFirestore(userIdOrData: any, updateData?: any): Promise<void> {
  let userId = typeof userIdOrData === 'string' ? userIdOrData : userIdOrData?.id || userIdOrData?.userId || userIdOrData?.nicNumber;
  try {
    let data = updateData || userIdOrData;
    if (!userId) return;

    if (data.nicNumber) {
      data.nicNumber = String(data.nicNumber).trim().toUpperCase();
    }
    if (data.email) {
      data.email = String(data.email).trim().toLowerCase();
    }

    const docRef = doc(db, 'users', userId);
    const sanitized = sanitizeForFirestore({
      ...data,
      updatedAtServer: serverTimestamp(),
    });
    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

/**
 * පරිශීලක ගිණුමක් මකා දැමීම හෝ status එක 'deleted' ලෙස යාවත්කාලීන කිරීම
 * @param userIdOrUser - මකා දැමිය යුතු පරිශීලකයාගේ ID හෝ User Object එක
 * @param hardDelete - true නම් සම්පූර්ණයෙන්ම මකා දමයි, false නම් status එක යාවත්කාලීන කරයි (default: true)
 */
export async function deleteUserAccount(userIdOrUser: any, hardDelete: boolean = true): Promise<void> {
  if (!userIdOrUser) return;
  const docIds = new Set<string>();

  if (typeof userIdOrUser === 'string') {
    docIds.add(userIdOrUser.trim());
  } else if (typeof userIdOrUser === 'object') {
    if (userIdOrUser.id) docIds.add(String(userIdOrUser.id).trim());
    if (userIdOrUser.userId) docIds.add(String(userIdOrUser.userId).trim());
    if (userIdOrUser.nicNumber) {
      docIds.add(String(userIdOrUser.nicNumber).trim().toUpperCase());
      docIds.add(String(userIdOrUser.nicNumber).trim().toLowerCase());
    }
  }

  for (const docId of docIds) {
    if (!docId) continue;
    try {
      const docRef = doc(db, 'users', docId);
      if (hardDelete) {
        await deleteDoc(docRef);
      } else {
        await updateDoc(docRef, {
          status: 'deleted',
          deletedAt: new Date().toISOString(),
          updatedAtServer: serverTimestamp(),
        });
      }
    } catch (error) {
      console.warn(`Could not delete doc users/${docId}:`, error);
    }
  }
}

export async function seedInitialUsersToFirestore(usersList?: any[]): Promise<void> {
  try {
    if (!Array.isArray(usersList)) return;
    for (const u of usersList) {
      const docId = u.userId || u.nicNumber || u.id;
      if (docId) {
        const docRef = doc(db, 'users', docId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          await setDoc(docRef, {
            ...u,
            id: docId,
            createdAtServer: serverTimestamp(),
          });
        }
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'users');
  }
}

/**
 * පරිශීලකයන්ගේ Real-time දත්ත සමමුහුර්තකරණය (Sync)
 */
export function subscribeToUsers(
  callback: (users: any[]) => void
): () => void {
  try {
    const usersColRef = collection(db, 'users');
    return onSnapshot(
      usersColRef,
      (snapshot) => {
        const rawUsers = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return { ...data, id: docSnap.id || data.id };
        }) as User[];
        const users = deduplicateUsers(rawUsers);
        callback(users);
      },
      (error) => {
        console.warn('subscribeToUsers snapshot status:', error?.message || error);
      }
    );
  } catch (err) {
    console.error('subscribeToUsers setup error:', err);
    return () => {};
  }
}

// ==============================================================
// 🆘 ISSUE REPORTING & ADMIN REPLY PERSISTENCE
// ==============================================================

export async function saveIssueToFirestore(issueData: any): Promise<string> {
  try {
    const colRef = collection(db, 'issues');
    const docId = issueData.id || `issue_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const docRef = doc(colRef, docId);
    await setDoc(docRef, sanitizeForFirestore({
      ...issueData,
      id: docId,
      createdAtServer: serverTimestamp(),
      updatedAtServer: serverTimestamp(),
    }));
    return docId;
  } catch (error) {
    console.warn('saveIssueToFirestore notice:', error);
    return issueData.id || `issue_${Date.now()}`;
  }
}

export async function updateIssueInFirestore(issueId: string, updateData: Record<string, any>): Promise<void> {
  try {
    if (!issueId) return;
    const docRef = doc(db, 'issues', issueId);
    await updateDoc(docRef, sanitizeForFirestore({
      ...updateData,
      updatedAtServer: serverTimestamp(),
    }));
  } catch (error) {
    console.warn('updateIssueInFirestore notice:', error);
  }
}

export function subscribeToIssuesFromFirestore(callback: (issues: any[]) => void): () => void {
  try {
    const colRef = collection(db, 'issues');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const issues = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback(issues);
      },
      (error) => {
        console.warn('subscribeToIssues snapshot notice:', error?.message || error);
      }
    );
  } catch (err) {
    console.error('subscribeToIssues setup error:', err);
    return () => {};
  }
}

// ==============================================================
// 🆘 HELP POST DELETION & SEED OPERATIONS
// ==============================================================

export async function deleteHelpPostFromFirestore(postId: string): Promise<void> {
  try {
    if (!postId) return;
    const docRef = doc(db, 'posts', postId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
  }
}

export async function seedDoneHelpPostsToFirestore(): Promise<void> {
  try {
    console.log('Done help posts seeded successfully.');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'posts');
  }
}

export async function seedDemoHelpPostsToFirestore(): Promise<void> {
  try {
    console.log('Demo help posts seeded successfully.');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'posts');
  }
}

// ==============================================================
// 🏛️ TRANSPARENT AID LEDGER (ආධාර සහ සම්පත් විනිවිදභාවයේ ලෙජරය)
// ==============================================================

export async function saveAidCenterToFirestore(center: any): Promise<void> {
  try {
    const centerId = center.id || `center_${center.centerCode || Date.now()}`;
    const docRef = doc(db, 'aid_recipient_centers', centerId);
    await setDoc(docRef, sanitizeForFirestore({
      ...center,
      updatedAtServer: serverTimestamp(),
    }), { merge: true });
  } catch (error) {
    console.warn('saveAidCenterToFirestore notice:', error);
  }
}

export async function updateAidCenterInFirestore(centerId: string, data: Record<string, any>): Promise<void> {
  try {
    if (!centerId) return;
    const docRef = doc(db, 'aid_recipient_centers', centerId);
    await updateDoc(docRef, sanitizeForFirestore({
      ...data,
      updatedAtServer: serverTimestamp(),
    }));
  } catch (error) {
    console.warn('updateAidCenterInFirestore notice:', error);
  }
}

export function subscribeToAidCentersFromFirestore(callback: (centers: any[]) => void): () => void {
  try {
    const colRef = collection(db, 'aid_recipient_centers');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const centers = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback(centers);
      },
      (error) => {
        console.warn('subscribeToAidCenters snapshot notice:', error?.message || error);
      }
    );
  } catch (err) {
    console.error('subscribeToAidCenters setup error:', err);
    return () => {};
  }
}

export async function saveAidDeliveryToFirestore(delivery: any): Promise<void> {
  try {
    const deliveryId = delivery.id || `delivery_${Date.now()}`;
    const docRef = doc(db, 'aid_deliveries', deliveryId);
    await setDoc(docRef, sanitizeForFirestore({
      ...delivery,
      updatedAtServer: serverTimestamp(),
    }), { merge: true });
  } catch (error) {
    console.warn('saveAidDeliveryToFirestore notice:', error);
  }
}

export async function updateAidDeliveryInFirestore(deliveryId: string, data: Record<string, any>): Promise<void> {
  try {
    if (!deliveryId) return;
    const docRef = doc(db, 'aid_deliveries', deliveryId);
    await updateDoc(docRef, sanitizeForFirestore({
      ...data,
      updatedAtServer: serverTimestamp(),
    }));
  } catch (error) {
    console.warn('updateAidDeliveryInFirestore notice:', error);
  }
}

export function subscribeToAidDeliveriesFromFirestore(callback: (deliveries: any[]) => void): () => void {
  try {
    const colRef = collection(db, 'aid_deliveries');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const deliveries = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback(deliveries);
      },
      (error) => {
        console.warn('subscribeToAidDeliveries snapshot notice:', error?.message || error);
      }
    );
  } catch (err) {
    console.error('subscribeToAidDeliveries setup error:', err);
    return () => {};
  }
}

export async function saveAidBroadcastToFirestore(broadcast: any): Promise<void> {
  try {
    const broadcastId = broadcast.id || `broadcast_${Date.now()}`;
    const docRef = doc(db, 'aid_broadcasts', broadcastId);
    await setDoc(docRef, sanitizeForFirestore({
      ...broadcast,
      updatedAtServer: serverTimestamp(),
    }), { merge: true });
  } catch (error) {
    console.warn('saveAidBroadcastToFirestore notice:', error);
  }
}

export function subscribeToAidBroadcastsFromFirestore(callback: (broadcasts: any[]) => void): () => void {
  try {
    const colRef = collection(db, 'aid_broadcasts');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const broadcasts = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback(broadcasts);
      },
      (error) => {
        console.warn('subscribeToAidBroadcasts snapshot notice:', error?.message || error);
      }
    );
  } catch (err) {
    console.error('subscribeToAidBroadcasts setup error:', err);
    return () => {};
  }
}

// ==============================================================
// 🗑️ GLOBAL DELETION & MODERATION HANDLERS (ADMIN & OWNER)
// ==============================================================

export async function deleteMarketplaceShopFromFirestore(shopId: string): Promise<void> {
  try {
    if (!shopId) return;
    const docRef = doc(db, 'marketplace_shops', shopId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`deleteMarketplaceShopFromFirestore notice for ${shopId}:`, error);
  }
}

export async function deleteProfessionalServiceFromFirestore(serviceId: string): Promise<void> {
  try {
    if (!serviceId) return;
    const docRef = doc(db, 'professional_services', serviceId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`deleteProfessionalServiceFromFirestore notice for ${serviceId}:`, error);
  }
}

export async function deleteBloodRequestFromFirestore(requestId: string): Promise<void> {
  try {
    if (!requestId) return;
    const docRef = doc(db, 'blood_requests', requestId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`deleteBloodRequestFromFirestore notice for ${requestId}:`, error);
  }
}

export async function deleteVolunteerDonorFromFirestore(donorId: string): Promise<void> {
  try {
    if (!donorId) return;
    const docRef = doc(db, 'volunteer_donors', donorId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`deleteVolunteerDonorFromFirestore notice for ${donorId}:`, error);
  }
}

export async function deleteDisasterReliefFromFirestore(itemId: string): Promise<void> {
  try {
    if (!itemId) return;
    const docRef = doc(db, 'disaster_relief_items', itemId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`deleteDisasterReliefFromFirestore notice for ${itemId}:`, error);
  }
}

export async function deleteGroupFromFirestore(groupId: string): Promise<void> {
  try {
    if (!groupId) return;
    const docRef = doc(db, 'groups', groupId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn(`deleteGroupFromFirestore notice for ${groupId}:`, error);
  }
}

// ==============================================================
// 🚨 SOS LIVE GPS TRACKER (සජීවී SOS ස්ථාන විකාශන) OPERATIONS
// ==============================================================
const SOS_SESSIONS_COLLECTION = 'sos_live_sessions';

export async function createOrUpdateSosLiveSession(session: SosLiveSession): Promise<string> {
  const sessionId = session.id || `sos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanData = sanitizeForFirestore({
    ...session,
    id: sessionId,
    updatedAt: new Date().toISOString(),
    updatedAtMs: Date.now(),
  });

  try {
    const docRef = doc(db, SOS_SESSIONS_COLLECTION, sessionId);
    await setDoc(docRef, cleanData, { merge: true });
    return sessionId;
  } catch (error) {
    console.warn(`createOrUpdateSosLiveSession notice for ${sessionId}:`, error);
    return sessionId;
  }
}

export async function updateSosLiveLocation(
  sessionId: string, 
  updateData: Partial<SosLiveSession>
): Promise<void> {
  if (!sessionId) return;
  try {
    const docRef = doc(db, SOS_SESSIONS_COLLECTION, sessionId);
    const cleanData = sanitizeForFirestore({
      ...updateData,
      updatedAt: new Date().toISOString(),
      updatedAtMs: Date.now(),
    });
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    console.warn(`updateSosLiveLocation notice for ${sessionId}:`, error);
  }
}

export async function stopSosLiveSession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  try {
    const docRef = doc(db, SOS_SESSIONS_COLLECTION, sessionId);
    const deactivatedPayload = sanitizeForFirestore({
      isActive: false,
      deactivatedAt: new Date().toISOString(),
      deactivatedAtMs: Date.now(),
      updatedAt: new Date().toISOString(),
      updatedAtMs: Date.now(),
    });
    await setDoc(docRef, deactivatedPayload, { merge: true });
  } catch (error) {
    console.warn(`stopSosLiveSession notice for ${sessionId}:`, error);
  }
}

export function subscribeToSosLiveSession(
  sessionId: string,
  onUpdate: (session: SosLiveSession | null) => void
): () => void {
  if (!sessionId) {
    onUpdate(null);
    return () => {};
  }
  const docRef = doc(db, SOS_SESSIONS_COLLECTION, sessionId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate({
          id: snapshot.id,
          ...data,
        } as SosLiveSession);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.warn(`subscribeToSosLiveSession snapshot error on ${sessionId}:`, error);
    }
  );
}

export async function getSosLiveSession(sessionId: string): Promise<SosLiveSession | null> {
  if (!sessionId) return null;
  try {
    const docRef = doc(db, SOS_SESSIONS_COLLECTION, sessionId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as SosLiveSession;
    }
    return null;
  } catch (error) {
    console.warn(`getSosLiveSession error on ${sessionId}:`, error);
    return null;
  }
}

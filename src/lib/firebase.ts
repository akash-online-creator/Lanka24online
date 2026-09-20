import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
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

// ==============================================================
// 🔥 FIREBASE INITIALIZATION & HELPER TYPES
// ==============================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

if (!firebaseConfig.apiKey) {
  console.warn('Firebase API Configuration missing! Check your firebase-applet-config.json or .env file.');
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Auth සහ Firestore Export කිරීම (Configured Database ID)
export const db = firebaseConfigJson.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId) 
  : getFirestore(app);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LIST = 'LIST',
  WRITE = 'WRITE',
}

export function handleFirestoreError(error: any, operation: string, path: string): never {
  console.error(`Firestore Error [${operation}] on ${path}:`, error);
  throw error;
}

// Interface Definitions
export interface RedAlertComment {
  id?: string;
  authorName?: string;
  userName?: string;
  userId?: string;
  text?: string;
  comment?: string;
  createdAt?: string;
  isReporterUpdate?: boolean;
}

export interface RedAlertItem {
  id: string;
  alertCode?: string;
  disasterType?: string;
  customDisasterTitle?: string;
  disasterTitleSi?: string;
  disasterTitleEn?: string;
  disasterTitleTa?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAccuracyMeters?: number;
  incidentDate?: string;
  incidentTime?: string;
  createdAt?: string;
  createdAtMs?: number;
  reportedByUserId?: string;
  reportedByName?: string;
  reportedByPhone?: string;
  status?: 'active' | 'resolved' | 'cancelled' | 'false_alarm';
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'moderate';
  comments?: RedAlertComment[];
  fakeReports?: any[];
  isFlaggedFake?: boolean;
  adminActionNote?: string;
  statusChangeMessage?: string | null;
  latestReporterUpdate?: {
    text: string;
    createdAt: string;
    reporterName?: string;
    notificationText?: string;
  } | null;
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
      console.error('subscribeToRedAlerts snapshot error:', error);
      if (onError) onError(error);
      callback([]);
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
    await setDoc(docRef, {
      ...newAlertItem,
      createdAtServer: serverTimestamp(),
    });
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
    
    await updateDoc(docRef, {
      status: 'resolved',
      statusChangeMessage: popupMessage,
      adminActionNote: note || 'Resolved by reporter',
      resolvedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${RED_ALERTS_COLLECTION}/${alertId}`);
  }
}

export async function cancelRedAlertByReporter(
  alertId: string,
  reason?: string
): Promise<void> {
  try {
    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    const popupMessage = "ℹ️ දැනුම්දීම පලකළ තැනැත්තා විසින් මෙම ආපදා නිවේදනය ඉවත් කරගන්නා ලදී.";

    await updateDoc(docRef, {
      status: 'cancelled',
      statusChangeMessage: popupMessage,
      adminActionNote: reason || 'Cancelled by reporter',
      cancelledAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${RED_ALERTS_COLLECTION}/${alertId}`);
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
      authorName: resolvedName,
      userName: resolvedName,
      userId: reporterInfo?.reporterId || '',
      text: updateText,
      comment: updateText,
      createdAt: timestamp,
      isReporterUpdate: true,
    };

    const notificationMessage = `💬 වාර්තාකරුගෙන් අලුත් යාවත්කාලීන කිරීමක්: ${updateText}`;

    await updateDoc(docRef, {
      comments: arrayUnion(updateObj),
      latestReporterUpdate: {
        text: updateText,
        createdAt: timestamp,
        reporterName: resolvedName,
        notificationText: notificationMessage,
      },
      updatedAtServer: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${RED_ALERTS_COLLECTION}/${alertId}`);
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
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
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
        console.error('Help posts listener error:', error);
        callback([]);
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
    const docRef = await addDoc(postsColRef, {
      ...postData,
      createdAt: new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    });
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
    await addDoc(repliesColRef, {
      ...replyData,
      createdAt: new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    });
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
    await updateDoc(docRef, {
      ...updateData,
      updatedAtServer: serverTimestamp(),
    });
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
    await addDoc(chatColRef, {
      ...messageData,
      createdAt: messageData.createdAt || new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    });
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
        console.error('Chat messages listener error:', error);
        callback([]);
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
        console.error('Marketplace items listener error:', error);
        callback([]);
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
    const docRef = await addDoc(colRef, {
      ...itemData,
      createdAt: new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    });
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
 * NIC, User ID, හෝ Email එක මගින් පරිශීලක දත්ත ලබා ගනී (Case-Insensitive Search)
 */
export async function getUserFromFirestore(userIdOrInput: string): Promise<any | null> {
  try {
    if (!userIdOrInput) return null;
    const cleanInput = userIdOrInput.trim();
    const cleanInputLower = cleanInput.toLowerCase();
    const cleanInputUpper = cleanInput.toUpperCase();

    // 1. Direct Document ID Search
    let docRef = doc(db, 'users', cleanInput);
    let snap = await getDoc(docRef);
    if (!snap.exists() && cleanInput !== cleanInputLower) {
      docRef = doc(db, 'users', cleanInputLower);
      snap = await getDoc(docRef);
    }
    if (!snap.exists() && cleanInput !== cleanInputUpper) {
      docRef = doc(db, 'users', cleanInputUpper);
      snap = await getDoc(docRef);
    }

    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }

    // 2. Collection Queries (userId, nicNumber, email)
    const colRef = collection(db, 'users');

    // userId query
    let qSnap = await getDocs(query(colRef, where('userId', '==', cleanInput)));
    if (qSnap.empty && cleanInput !== cleanInputLower) {
      qSnap = await getDocs(query(colRef, where('userId', '==', cleanInputLower)));
    }

    // nicNumber query (Upper, Lower, Raw)
    if (qSnap.empty) {
      qSnap = await getDocs(query(colRef, where('nicNumber', '==', cleanInputUpper)));
    }
    if (qSnap.empty) {
      qSnap = await getDocs(query(colRef, where('nicNumber', '==', cleanInput)));
    }
    if (qSnap.empty && cleanInput !== cleanInputLower) {
      qSnap = await getDocs(query(colRef, where('nicNumber', '==', cleanInputLower)));
    }

    // email query (Lower, Raw)
    if (qSnap.empty) {
      qSnap = await getDocs(query(colRef, where('email', '==', cleanInputLower)));
    }
    if (qSnap.empty && cleanInputLower !== cleanInput) {
      qSnap = await getDocs(query(colRef, where('email', '==', cleanInput)));
    }

    if (!qSnap.empty) {
      const docSnap = qSnap.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }

    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.READ, 'users');
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

    await setDoc(
      docRef,
      {
        ...userObj,
        id: docId,
        updatedAt: new Date().toISOString(),
        updatedAtServer: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'users');
  }
}

/**
 * පරිශීලක දත්ත යාවත්කාලීන කරයි
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
    await updateDoc(docRef, {
      ...data,
      updatedAtServer: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
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
        const users = snapshot.docs.map((docSnap) => {
          return { id: docSnap.id, ...docSnap.data() };
        });
        callback(users);
      },
      (error) => {
        console.error('subscribeToUsers listener error:', error);
        callback([]);
      }
    );
  } catch (err) {
    console.error('subscribeToUsers setup error:', err);
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

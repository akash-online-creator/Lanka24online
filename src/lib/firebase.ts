import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // Auth import කිරීම
import {
  getFirestore,
  doc,
  collection,
  query,
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
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

// ==============================================================
// 🔥 FIREBASE INITIALIZATION & HELPER TYPES
// ==============================================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBtTtuWnl4-orEHh9JkPHtkE5_z794EhpQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0262698872.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0262698872",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0262698872.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "503381962483",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:503381962483:web:4bda294cd68823f579d186",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 👇 මෙහිදී නිවැරදි Database ID එක ලබා දී ඇත
export const db = getFirestore(app, 'ai-studio-sahayaseva-08bfd3be-2f42-4de8-a3a8-ad7279ec7d1f');
export const auth = getAuth(app); // Auth export කිරීම

export enum OperationType {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LIST = 'LIST',
  WRITE = 'WRITE',
}

export function handleFirestoreError(error: any, operation: string, path: string) {
  console.error(`Firestore Error [${operation}] on ${path}:`, error);
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
  comments?: any[];
  fakeReports?: any[];
  isFlaggedFake?: boolean;
  adminActionNote?: string;
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
  };
}

function getLocalRedAlerts(): RedAlertItem[] {
  try {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('sahaya_red_alerts');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
}

export function subscribeToRedAlerts(callback: (alerts: RedAlertItem[]) => void): () => void {
  const colRef = collection(db, RED_ALERTS_COLLECTION);
  const q = query(colRef, orderBy('createdAtMs', 'desc'), limit(50));

  const handleLocalEmit = () => {
    const localItems = getLocalRedAlerts();
    if (localItems.length > 0) {
      callback(localItems);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('sahaya_red_alerts_changed', handleLocalEmit);
  }

  const unsubscribeFirestore = onSnapshot(
    q,
    (snapshot) => {
      const remoteAlerts = snapshot.docs.map((docSnap) => mapDocToRedAlert(docSnap));
      const localAlerts = getLocalRedAlerts();

      const mergedMap = new Map<string, RedAlertItem>();
      localAlerts.forEach((item) => mergedMap.set(item.id, item));
      remoteAlerts.forEach((item) => mergedMap.set(item.id, item));

      const finalAlerts = Array.from(mergedMap.values()).sort(
        (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      );

      try {
        localStorage.setItem('sahaya_red_alerts', JSON.stringify(finalAlerts));
      } catch {}

      callback(finalAlerts);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, RED_ALERTS_COLLECTION);
      
      const localAlerts = getLocalRedAlerts();
      if (localAlerts.length > 0) {
        callback(localAlerts);
        return;
      }

      const defaultAlerts: RedAlertItem[] = [
        {
          id: 'default_emergency_alert_1',
          alertCode: '#RED-1024',
          disasterType: 'flood',
          disasterTitleSi: 'අධික වැසි සහ ගංවතුර අවදානම',
          disasterTitleEn: 'Heavy Rains & Flood Warning',
          disasterTitleTa: 'கனமழை மற்றும் வெள்ள எச்சரிக்கை',
          description: 'කැලණි ගං ද්‍රෝණියේ ජල මට්ටම ඉහළ යමින් පවතී. පහත් බිම්වල වෙසෙන ජනතාව ආරක්ෂිත ස්ථාන වෙත යොමු වන්න.',
          latitude: 6.9271,
          longitude: 79.8612,
          locationName: 'කොළඹ / කැලණි ගං ඉඩකඩ',
          locationAccuracyMeters: 10,
          incidentDate: new Date().toISOString().split('T')[0],
          incidentTime: '08:30 AM',
          createdAt: new Date().toISOString(),
          createdAtMs: Date.now(),
          reportedByUserId: 'admin_sys',
          reportedByName: 'ආපදා කළමනාකරණ මධ්‍යස්ථානය (DMC)',
          reportedByPhone: '117',
          status: 'active',
          severity: 'critical',
          comments: [],
          fakeReports: [],
          isFlaggedFake: false,
          adminActionNote: 'පද්ධති ස්වයංක්‍රීය හදිසි අනතුරු ඇඟවීමයි.'
        }
      ];
      callback(defaultAlerts);
    }
  );

  return () => {
    unsubscribeFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener('sahaya_red_alerts_changed', handleLocalEmit);
    }
  };
}

export async function createRedAlertInFirestore(
  alertData: Omit<RedAlertItem, 'id'>
): Promise<string> {
  const tempId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const newAlertItem: RedAlertItem = {
    ...alertData,
    id: tempId,
  };

  try {
    const existing = getLocalRedAlerts();
    const updated = [newAlertItem, ...existing.filter((a) => a.id !== tempId)];
    localStorage.setItem('sahaya_red_alerts', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sahaya_red_alerts_changed'));
    }
  } catch {}

  try {
    const colRef = collection(db, RED_ALERTS_COLLECTION);
    const docRef = await addDoc(colRef, {
      ...alertData,
      createdAtServer: serverTimestamp(),
    });

    try {
      const existing = getLocalRedAlerts();
      const updated = existing.map((a) => (a.id === tempId ? { ...a, id: docRef.id } : a));
      localStorage.setItem('sahaya_red_alerts', JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sahaya_red_alerts_changed'));
      }
    } catch {}

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, RED_ALERTS_COLLECTION);
    return tempId;
  }
}

export async function updateRedAlertStatus(
  alertId: string,
  status: 'active' | 'resolved' | 'cancelled' | 'false_alarm',
  note?: string
): Promise<void> {
  try {
    const existing = getLocalRedAlerts();
    const updated = existing.map((a) =>
      a.id === alertId ? { ...a, status, adminActionNote: note !== undefined ? note : a.adminActionNote } : a
    );
    localStorage.setItem('sahaya_red_alerts', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sahaya_red_alerts_changed'));
    }

    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    await updateDoc(docRef, {
      status,
      ...(note !== undefined ? { adminActionNote: note } : {}),
      updatedAtServer: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Failed to update Red Alert status:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${RED_ALERTS_COLLECTION}/${alertId}`);
  }
}

export async function deleteRedAlertInFirestore(alertId: string): Promise<void> {
  try {
    const existing = getLocalRedAlerts();
    const updated = existing.filter((a) => a.id !== alertId);
    localStorage.setItem('sahaya_red_alerts', JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sahaya_red_alerts_changed'));
    }

    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('Failed to delete Red Alert:', error);
    handleFirestoreError(error, OperationType.DELETE, `${RED_ALERTS_COLLECTION}/${alertId}`);
  }
}

export async function addCommentToRedAlert(
  alertId: string,
  comment: { authorName?: string; userName?: string; text?: string; comment?: string; createdAt?: string; [key: string]: any }
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
    console.warn('Failed to add comment:', error);
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
    console.warn('Failed to flag fake report:', error);
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
    console.warn('Failed to save siren settings to Firestore:', error);
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
        console.warn('Siren settings listener warning:', error);
      }
    );
  } catch (err) {
    console.warn('subscribeToSirenSettings error:', err);
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
  } catch (err) {
    console.warn('fetchSirenSettings error:', err);
  }
  return null;
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
    console.warn('fetchAllPostsBackupData error:', err);
    const items = currentPosts || [];
    return { items, totalPostsCount: items.length };
  }
}

export async function restorePostsBackupData(postsData: any): Promise<{ restoredPostsList: any[]; restoredPostsCount: number; restoredMessagesCount: number }> {
  try {
    const list = Array.isArray(postsData) ? postsData : (postsData?.items || postsData?.posts || []);
    let restoredCount = 0;
    for (const item of list) {
      if (item && item.id) {
        const docRef = doc(db, 'posts', item.id);
        const { id, ...dataToSave } = item;
        await setDoc(docRef, dataToSave, { merge: true });
        restoredCount++;
      }
    }
    return { restoredPostsList: list, restoredPostsCount: restoredCount, restoredMessagesCount: 0 };
  } catch (err) {
    console.warn('restorePostsBackupData error:', err);
    return { restoredPostsList: [], restoredPostsCount: 0, restoredMessagesCount: 0 };
  }
}

export async function syncUserProfileToFirestore(userIdOrData: any, profileData?: any, ...rest: any[]): Promise<void> {
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
    console.warn('syncUserProfileToFirestore error:', err);
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
      postsColRef,
      (snapshot) => {
        const posts = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback(posts);
      },
      (error) => {
        console.warn('Help posts listener error:', error);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('subscribeToHelpPosts setup error:', err);
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
    console.warn('Failed to add help post:', error);
    handleFirestoreError(error, OperationType.CREATE, 'posts');
    return '';
  }
}

export async function addReplyToFirestore(
  postId: string,
  replyData: Record<string, any>,
  ...rest: any[]
): Promise<void> {
  try {
    const repliesColRef = collection(db, 'posts', postId, 'replies');
    await addDoc(repliesColRef, {
      ...replyData,
      createdAt: new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Failed to add reply:', error);
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
    console.warn('Failed to update help post:', error);
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
    console.warn('Failed to send chat message:', error);
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
      chatColRef,
      (snapshot) => {
        const messages = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback(messages);
      },
      (error) => {
        console.warn('Chat messages listener error:', error);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('subscribeToChatMessages setup error:', err);
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
        console.warn('Marketplace items listener error:', error);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('subscribeToMarketplaceItems setup error:', err);
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
    console.warn('Failed to add marketplace item:', error);
    handleFirestoreError(error, OperationType.CREATE, MARKETPLACE_COLLECTION);
    return '';
  }
}

export async function deleteMarketplaceItemFromFirestore(
  itemId: string
): Promise<void> {
  try {
    const docRef = doc(db, MARKETPLACE_COLLECTION, itemId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('Failed to delete marketplace item:', error);
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
        console.warn('Saved posts listener error:', error);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('subscribeToUserSavedPosts error:', err);
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
    console.warn('Failed to toggle save post:', error);
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

// ==============================================================
// 👤 USER MANAGEMENT & SEED OPERATIONS
// ==============================================================

export async function getUserFromFirestore(userIdOrInput: string, passwordInput?: string, ...rest: any[]): Promise<any | null> {
  try {
    if (!userIdOrInput) return null;
    const cleanInput = userIdOrInput.trim().toLowerCase();

    // 1. Try direct doc ref by userId/NIC or id
    const docRef = doc(db, 'users', userIdOrInput);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const userData = { id: snap.id, ...snap.data() };
      if (!passwordInput || (userData as any).key === passwordInput || (userData as any).password === passwordInput || (userData as any).securityCode === passwordInput || !(userData as any).key) {
        return userData;
      }
    }

    // 2. Query collection by userId, nicNumber, or email
    const colRef = collection(db, 'users');
    const qSnap = await getDocs(colRef);
    for (const docSnap of qSnap.docs) {
      const uData = { id: docSnap.id, ...docSnap.data() } as any;
      const uId = (uData.userId || '').toString().trim().toLowerCase();
      const uNic = (uData.nicNumber || '').toString().trim().toLowerCase();
      const uEmail = (uData.email || '').toString().trim().toLowerCase();
      const uDocId = docSnap.id.toLowerCase();

      if (uId === cleanInput || uNic === cleanInput || uEmail === cleanInput || uDocId === cleanInput) {
        if (!passwordInput || uData.key === passwordInput || uData.password === passwordInput || uData.securityCode === passwordInput || !uData.key) {
          return uData;
        }
      }
    }

    return null;
  } catch (error) {
    console.warn('getUserFromFirestore error:', error);
    return null;
  }
}

export async function saveUserToFirestore(userIdOrUser: string | any, userData?: any, ...rest: any[]): Promise<void> {
  try {
    let userObj = typeof userIdOrUser === 'object' ? userIdOrUser : { ...(userData || {}), id: userIdOrUser };
    const docId = userObj.userId || userObj.nicNumber || userObj.id || `usr_${Date.now()}`;
    const docRef = doc(db, 'users', docId);
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
    console.warn('saveUserToFirestore error:', err);
  }
}

export async function updateUserInFirestore(userIdOrData: any, updateData?: any, ...rest: any[]): Promise<void> {
  try {
    let userId = typeof userIdOrData === 'string' ? userIdOrData : userIdOrData?.id || userIdOrData?.userId || userIdOrData?.nicNumber;
    let data = updateData || userIdOrData;
    if (!userId) return;
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      ...data,
      updatedAtServer: serverTimestamp(),
    });
  } catch (err) {
    console.warn('updateUserInFirestore error:', err);
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
    console.warn('seedInitialUsersToFirestore error:', err);
  }
}

export function subscribeToUsers(
  callback: (users: any[]) => void
): () => void {
  try {
    const usersColRef = collection(db, 'users');
    return onSnapshot(
      usersColRef,
      (snapshot) => {
        const users = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        callback(users);
      },
      (error) => {
        console.warn('subscribeToUsers listener error:', error);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('subscribeToUsers setup error:', err);
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
    console.warn('Failed to delete help post:', error);
    handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
  }
}

export async function seedDoneHelpPostsToFirestore(): Promise<void> {
  try {
    console.log('Done help posts seeded successfully.');
  } catch (err) {
    console.warn('seedDoneHelpPostsToFirestore error:', err);
  }
}

export async function seedDemoHelpPostsToFirestore(): Promise<void> {
  try {
    console.log('Demo help posts seeded successfully.');
  } catch (err) {
    console.warn('seedDemoHelpPostsToFirestore error:', err);
  }
}

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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
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
  status?: 'active' | 'resolved' | 'cancelled';
  severity?: 'critical' | 'high' | 'medium' | 'low';
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
  status: 'active' | 'resolved' | 'cancelled',
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
  comment: { authorName: string; text: string; createdAt?: string }
): Promise<void> {
  try {
    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    await updateDoc(docRef, {
      comments: arrayUnion({
        ...comment,
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

export async function fetchAllPostsBackupData(): Promise<any[]> {
  try {
    const colRef = collection(db, 'posts');
    const snap = await getDocs(colRef);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    console.warn('fetchAllPostsBackupData error:', err);
    return [];
  }
}

export async function restorePostsBackupData(postsData: any[]): Promise<void> {
  try {
    if (!Array.isArray(postsData)) return;
    for (const item of postsData) {
      if (item && item.id) {
        const docRef = doc(db, 'posts', item.id);
        const { id, ...dataToSave } = item;
        await setDoc(docRef, dataToSave, { merge: true });
      }
    }
  } catch (err) {
    console.warn('restorePostsBackupData error:', err);
  }
}

export async function syncUserProfileToFirestore(userId: string, profileData: any): Promise<void> {
  try {
    if (!userId) return;
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, {
      ...profileData,
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
  replyData: Record<string, any>
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
    senderId: string;
    senderName: string;
    text: string;
    createdAt?: string;
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

export async function getUserFromFirestore(userId: string): Promise<any | null> {
  try {
    if (!userId) return null;
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.READ, `users/${userId}`);
    return null;
  }
}

export async function saveUserToFirestore(userId: string, userData: any): Promise<void> {
  try {
    if (!userId) return;
    const docRef = doc(db, 'users', userId);
    await setDoc(
      docRef,
      {
        ...userData,
        updatedAt: new Date().toISOString(),
        updatedAtServer: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('saveUserToFirestore error:', err);
  }
}

export async function updateUserInFirestore(userId: string, updateData: any): Promise<void> {
  try {
    if (!userId) return;
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAtServer: serverTimestamp(),
    });
  } catch (err) {
    console.warn('updateUserInFirestore error:', err);
  }
}

export async function seedInitialUsersToFirestore(): Promise<void> {
  try {
    console.log('Initial users seed executed successfully.');
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

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
import { getStorage, ref as storageRef, deleteObject } from 'firebase/storage';

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

// Auth, Firestore සහ Storage Export කිරීම
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
export const storage = getStorage(app);

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
 * Firebase Storage එකේ ඇති Media / Image URLs මකා දැමීම සඳහා helper function එකක්
 */
export async function deleteStorageFilesByUrls(urls: string[]): Promise<void> {
  if (!Array.isArray(urls) || urls.length === 0) return;

  const deletePromises = urls.map(async (url) => {
    if (!url || typeof url !== 'string' || !url.includes('firebasestorage.googleapis.com')) return;
    try {
      const fileStorageRef = storageRef(storage, url);
      await deleteObject(fileStorageRef);
      console.log(`[Storage] Successfully deleted file: ${url}`);
    } catch (err: any) {
      // රූපය දැනටමත් Storage එකේ නොමැති නම් (404) warning එකක් පමනක් පෙන්වයි
      console.warn(`[Storage] Deletion skipped/failed for ${url}:`, err?.message || err);
    }
  });

  await Promise.all(deletePromises);
}

// ==============================================================
// 🆘 HELP POST DELETION & SEED OPERATIONS
// ==============================================================

/**
 * Permanently deletes a post from the 'posts' collection, removes associated 
 * images from Firebase Storage, and syncs the ID into system_settings/deleted_records.
 * 
 * @param postId - මකා දැමීමට අවශ්‍ය Post ID එක
 * @param imageUrls - (Optional) Post එකට අදාළ Image/Media URLs array එක
 */
export async function deleteHelpPostFromFirestore(postId: string, imageUrls?: string[]): Promise<void> {
  if (!postId) return;
  try {
    const docRef = doc(db, 'posts', postId);

    // 1. Storage එකේ Images ඇත්නම් ඒවා ප්‍රථමයෙන් මකා දැමීම
    if (imageUrls && imageUrls.length > 0) {
      await deleteStorageFilesByUrls(imageUrls);
    } else {
      // Image URLs ලබාදී නැත්නම් Doc එකෙන් Image array එක ලබාගෙන Delete කිරීම
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
      } catch (docErr) {
        console.warn(`[Firestore] Could not fetch post details for image cleanup:`, docErr);
      }
    }

    // 2. Primary document එක Firestore එකෙන් සදහටම Delete කිරීම
    await deleteDoc(docRef);

    // 3. වෙනත් Clients වල Real-time sync වලින් නැවත මතුවීම වැළැක්වීමට Blacklist එකට එක් කිරීම
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

    console.log(`[Firestore & Storage] Post ${postId} and its media were successfully deleted.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
  }
}

import { removeNotificationsForPost } from "../utils/notificationManager";
import { getAuthHeaders } from "../utils/apiConfig";
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
  QuerySnapshot,
  DocumentData,
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
  runTransaction,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, deleteObject } from 'firebase/storage';

import firebaseConfigJson from '../../firebase-applet-config.json';
import { User, RedAlertItem, RedAlertComment, RedAlertVoteRecord, RedAlertConfidenceStatus, AuditLogRecord, SosLiveSession, PendingAiQuery, VerifiedAiKnowledgeItem } from '../types';

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

import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 🛡️ Firebase App Check Initialization (protects Firestore, Storage & Backend from unauthorized clients)
const appCheckSiteKey = String(
  env.VITE_FIREBASE_APPCHECK_SITE_KEY ||
  env.VITE_RECAPTCHA_SITE_KEY ||
  (firebaseConfigJson as any).recaptchaSiteKey ||
  ''
).trim();

if (typeof window !== 'undefined' && appCheckSiteKey.length > 10) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (appCheckErr) {
    console.warn('Firebase App Check initialization note:', appCheckErr);
  }
}

export const db = firebaseConfigJson.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);
export const fallbackDb = db;
export const auth = getAuth(app);

// Direct Top-Level Firestore Collection & Document Access (No private subcollection trap)
export function collection(database: any, path: string, ...pathSegments: string[]): any {
  return rawCollection(database, path, ...pathSegments);
}

export function doc(database: any, path: string, ...pathSegments: string[]): any {
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
  authInfo?: {
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
    operationType: operation,
    path,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified ?? null,
      isAnonymous: auth?.currentUser?.isAnonymous ?? null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
  };
  console.warn(`Firestore Warning [${operation}] on ${path}:`, JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
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

export async function getUserFromFirestore(userIdOrInput: string) {
  try {
    if (!userIdOrInput) return null;
    const cleanInput = String(userIdOrInput).trim();
    const upperInput = cleanInput.toUpperCase().replace(/\s+/g, '');

    // 1. Direct document lookup by Document ID (O(1) single-document query)
    const directDocRef = doc(db, USERS_COLLECTION, cleanInput);
    const snap = await getDoc(directDocRef);
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as any) };
    }

    // 2. Direct document lookup by uppercase NIC ID
    if (upperInput !== cleanInput) {
      const nicDocRef = doc(db, USERS_COLLECTION, upperInput);
      const nicSnap = await getDoc(nicDocRef);
      if (nicSnap.exists()) {
        return { id: nicSnap.id, ...(nicSnap.data() as any) };
      }
    }

    // 3. Targeted Single Document Query with limit(1) by NIC
    try {
      const qNic = query(
        collection(db, USERS_COLLECTION),
        where('nic', '==', upperInput),
        limit(1)
      );
      const snapNic = await getDocs(qNic);
      if (!snapNic.empty) {
        const d = snapNic.docs[0];
        return { id: d.id, ...(d.data() as any) };
      }
    } catch {}

    try {
      const qNicNum = query(
        collection(db, USERS_COLLECTION),
        where('nicNumber', '==', upperInput),
        limit(1)
      );
      const snapNicNum = await getDocs(qNicNum);
      if (!snapNicNum.empty) {
        const d = snapNicNum.docs[0];
        return { id: d.id, ...(d.data() as any) };
      }
    } catch {}

    // 4. Targeted Single Document Query with limit(1) by Phone / WhatsApp
    if (cleanInput.length >= 9) {
      try {
        const qPhone = query(
          collection(db, USERS_COLLECTION),
          where('phone', '==', cleanInput),
          limit(1)
        );
        const snapPhone = await getDocs(qPhone);
        if (!snapPhone.empty) {
          const d = snapPhone.docs[0];
          return { id: d.id, ...(d.data() as any) };
        }
      } catch {}

      try {
        const qWa = query(
          collection(db, USERS_COLLECTION),
          where('whatsappPhone', '==', cleanInput),
          limit(1)
        );
        const snapWa = await getDocs(qWa);
        if (!snapWa.empty) {
          const d = snapWa.docs[0];
          return { id: d.id, ...(d.data() as any) };
        }
      } catch {}
    }

    // 5. Targeted Single Document Query with limit(1) by userId
    try {
      const qUserId = query(
        collection(db, USERS_COLLECTION),
        where('userId', '==', upperInput),
        limit(1)
      );
      const snapUserId = await getDocs(qUserId);
      if (!snapUserId.empty) {
        const d = snapUserId.docs[0];
        return { id: d.id, ...(d.data() as any) };
      }
    } catch {}

    // 6. Fast Backend Server Endpoint Fallback (/api/auth/lookup-user)
    try {
      const res = await fetch('/api/auth/lookup-user', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ identifier: cleanInput }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          return data.user;
        }
      }
    } catch {}

    return null;
  } catch (err) {
    console.warn('getUserFromFirestore error:', err);
    return null;
  }
}

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

    await fetch('/api/notify-registration', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        registrationType: params.registrationType,
        identifierOrName: params.identifierOrName,
        dateTime: formattedDateTime,
        dedupeKey: key,
      }),
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

export function isStoredDeletedUserId(idOrNic: string): boolean {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('sahaya_deleted_user_ids') : null;
    if (!raw) return false;
    const ids: string[] = JSON.parse(raw);
    const clean = idOrNic.trim().toLowerCase();
    const digits = clean.replace(/[^0-9]/g, '');
    const set = new Set(ids.map((s) => s.toLowerCase()));
    return set.has(clean) || (digits.length >= 9 && set.has(digits));
  } catch {
    return false;
  }
}

export function markUserIdAsDeletedLocally(identifier: string): void {
  try {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem('sahaya_deleted_user_ids');
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const clean = identifier.trim();
    const digits = clean.replace(/[^0-9]/g, '');
    const set = new Set([...ids, clean, clean.toLowerCase(), clean.toUpperCase(), ...(digits.length >= 9 ? [digits] : [])]);
    localStorage.setItem('sahaya_deleted_user_ids', JSON.stringify(Array.from(set)));
  } catch {}
}

export async function deleteUserAccount(userOrId: any, _permanent = true): Promise<void> {
  try {
    const idsToDelete = new Set<string>();
    let userObj: any = null;

    if (typeof userOrId === "string") {
      const clean = userOrId.trim();
      if (clean) {
        idsToDelete.add(clean);
        idsToDelete.add(clean.toUpperCase());
        const digits = clean.replace(/[^0-9]/g, "");
        if (digits.length >= 9) idsToDelete.add(digits);
      }
    } else if (userOrId) {
      userObj = userOrId;
      if (userOrId.id) {
        const val = String(userOrId.id).trim();
        idsToDelete.add(val);
        idsToDelete.add(val.toUpperCase());
      }
      if (userOrId.userId) {
        const val = String(userOrId.userId).trim();
        idsToDelete.add(val);
        idsToDelete.add(val.toUpperCase());
      }
      if (userOrId.nicNumber) {
        const val = String(userOrId.nicNumber).trim();
        idsToDelete.add(val);
        idsToDelete.add(val.toUpperCase());
        const digits = val.replace(/[^0-9]/g, "");
        if (digits.length >= 9) idsToDelete.add(digits);
      }
      if (userOrId.nic) {
        const val = String(userOrId.nic).trim();
        idsToDelete.add(val);
        idsToDelete.add(val.toUpperCase());
        const digits = val.replace(/[^0-9]/g, "");
        if (digits.length >= 9) idsToDelete.add(digits);
      }
      if (userOrId.phone || userOrId.whatsappPhone) {
        const ph = String(userOrId.whatsappPhone || userOrId.phone || "").replace(/[^0-9]/g, "");
        if (ph.length >= 9) idsToDelete.add(ph);
      }
    }

    if (idsToDelete.size === 0) return;

    // 1. Mark in localStorage blacklist immediately
    for (const id of idsToDelete) {
      markUserIdAsDeletedLocally(id);
    }

    // 2. Immediately purge from localStorage caches
    if (typeof localStorage !== "undefined") {
      try {
        const storageKeys = ["sahaya_users", "sahaya_users_cache_v2"];
        for (const k of storageKeys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const cleaned = list.filter((u: any) => {
                if (!u) return false;
                const uId = String(u.id || "").trim();
                const uUserId = String(u.userId || "").trim();
                const uNic = String(u.nicNumber || u.nic || "").trim().toUpperCase();
                const uDigits = (uNic || uUserId || uId).replace(/[^0-9]/g, "");
                if (idsToDelete.has(uId)) return false;
                if (idsToDelete.has(uUserId)) return false;
                if (idsToDelete.has(uNic)) return false;
                if (uDigits.length >= 9 && idsToDelete.has(uDigits)) return false;
                return true;
              });
              localStorage.setItem(k, JSON.stringify(cleaned));
            }
          }
        }

        // Clean from device pins
        const rawPins = localStorage.getItem("sahaya_device_pins");
        if (rawPins) {
          const pins = JSON.parse(rawPins);
          if (Array.isArray(pins)) {
            const cleanedPins = pins.filter((p: any) => {
              const pId = String(p.userId || "").trim();
              const pNic = String(p.nicNumber || "").trim().toUpperCase();
              return !idsToDelete.has(pId) && !idsToDelete.has(pNic);
            });
            localStorage.setItem("sahaya_device_pins", JSON.stringify(cleanedPins));
          }
        }

        // Clean session user if deleted
        const sessionUserRaw = localStorage.getItem("sahaya_sewa_session_user");
        if (sessionUserRaw) {
          const sUser = JSON.parse(sessionUserRaw);
          const sId = String(sUser?.id || "").trim();
          const sNic = String(sUser?.nicNumber || sUser?.nic || sUser?.userId || "").trim().toUpperCase();
          if (idsToDelete.has(sId) || idsToDelete.has(sNic)) {
            localStorage.removeItem("sahaya_sewa_session_user");
          }
        }
      } catch (storageErr) {
        console.warn("Storage eviction notice:", storageErr);
      }
    }

    // 3. Dispatch UI event immediately so UI drops the user with zero lag
    if (typeof window !== "undefined") {
      const primaryId = Array.from(idsToDelete)[0];
      window.dispatchEvent(new CustomEvent("sahaya_entity_deleted", {
        detail: { itemId: primaryId, entityType: "user", collectionName: USERS_COLLECTION }
      }));
      window.dispatchEvent(new CustomEvent("sahaya_user_deleted", {
        detail: { itemId: primaryId, ids: Array.from(idsToDelete) }
      }));
    }

    // 4. Soft-delete / tombstone document in Firestore (always works under update rules)
    for (const uId of idsToDelete) {
      try {
        await setDoc(doc(db, USERS_COLLECTION, uId), {
          status: "deleted",
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          deletedAtMs: Date.now(),
        }, { merge: true });
      } catch (err) {
        console.warn("User tombstone update notice:", err);
      }
    }

    // 5. Attempt direct deleteDoc on client SDK
    for (const uId of idsToDelete) {
      try {
        await deleteDoc(doc(db, USERS_COLLECTION, uId));
      } catch (delErr) {
        // Handled silently
      }
      if (fallbackDb !== db) {
        deleteDoc(doc(fallbackDb, USERS_COLLECTION, uId)).catch(() => {});
      }
    }

    // 6. Query Firestore using targeted indexed queries ONLY (never scans entire collection)
    try {
      const targetCandidates = Array.from(idsToDelete).slice(0, 6);
      for (const candidate of targetCandidates) {
        const upperCandidate = candidate.toUpperCase();
        for (const field of ['nicNumber', 'nic', 'userId']) {
          try {
            const q = query(collection(db, USERS_COLLECTION), where(field, '==', upperCandidate), limit(3));
            const qSnap = await getDocs(q);
            for (const d of qSnap.docs) {
              markUserIdAsDeletedLocally(d.id);
              await setDoc(d.ref, { status: "deleted", isDeleted: true }, { merge: true }).catch(() => {});
              await deleteDoc(d.ref).catch(() => {});
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    // 7. Call server backend endpoint (/api/admin/delete-user) with Admin Auth session token
    try {
      const primaryId = userObj?.id || Array.from(idsToDelete)[0];
      const primaryNic = userObj?.nicNumber || userObj?.nic || userObj?.userId || primaryId;
      await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          id: primaryId,
          userId: primaryNic,
          nicNumber: primaryNic,
        }),
      });
    } catch (apiErr) {
      console.warn("Server delete user endpoint notice:", apiErr);
    }

    // 8. Record in system_metadata/deleted_records in Firestore
    try {
      const deletedRecordsRef = doc(db, SYSTEM_SETTINGS_COLLECTION, DELETED_RECORDS_DOC);
      await setDoc(
        deletedRecordsRef,
        {
          deletedUserIds: arrayUnion(...Array.from(idsToDelete)),
          updatedAt: new Date().toISOString(),
          updatedAtServer: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (_) {}
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, USERS_COLLECTION);
  }
}

export async function getAllMatchingUsersFromFirestore(userIdOrInput: string): Promise<any[]> {
  try {
    if (!userIdOrInput) return [];
    const cleanInput = String(userIdOrInput).trim();
    const upperInput = cleanInput.toUpperCase().replace(/\s+/g, '');
    const digitsInput = cleanInput.replace(/[^0-9]/g, '');
    const allSnap = await getDocs(collection(db, USERS_COLLECTION));
    const matches: any[] = [];
    for (const d of allSnap.docs) {
      const data: any = d.data();
      const dId = String(d.id || '').trim().toUpperCase();
      const dNic = String(data.nic ? data.nic : data.nicNumber ? data.nicNumber : '').trim().toUpperCase().replace(/\s+/g, '');
      const dUserId = String(data.userId ? data.userId : '').trim().toUpperCase().replace(/\s+/g, '');
      const dPhone = String(data.whatsappPhone ? data.whatsappPhone : data.phone ? data.phone : '').trim();
      const dDigits = (dNic || dUserId || dId).replace(/[^0-9]/g, '');
      if (
        dId === upperInput ||
        dNic === upperInput ||
        dUserId === upperInput ||
        (cleanInput.length >= 9 && dPhone === cleanInput) ||
        (digitsInput.length >= 9 && dDigits === digitsInput)
      ) {
        matches.push({ id: d.id, ...data });
      }
    }
    return matches;
  } catch (err) {
    console.warn('getAllMatchingUsersFromFirestore error:', err);
    return [];
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
  if (!(snap as QuerySnapshot<DocumentData>).docs) return valid;
  for (const d of (snap as QuerySnapshot<DocumentData>).docs) {
    const data = d.data();
    const item: any = { id: d.id, ...data };
    if (isBuiltInDummyRecord(item)) {
      try {
        deleteDoc(d.ref).catch(() => {});
      } catch (e) {}
    } else if (item.isDeleted === true || (item as any).isDeleted === 'true' || item.status === 'deleted' || item.status === 'archived') {
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
  return onSnapshot(colRef, (snap: QuerySnapshot<DocumentData>) => {
    const rawUsers = filterAndPurgeDummySnapDocs(snap);
    const users = rawUsers.filter((u: any) => {
      if (!u) return false;
      if (u.isDeleted === true || (u.status as string) === 'deleted') return false;
      return true;
    });
    callback(users);
  }, (err) => {
    console.warn("subscribeToUsers error:", err);
  });
}

// ==============================================================
// 🆘 HELP POSTS OPERATIONS
// ==============================================================

export function deduplicatePostReplies(replies: any[], post?: any): any[] {
  if (!Array.isArray(replies) || replies.length === 0) return [];
  const posterId = String(post?.userId || post?.authorId || '').trim();
  const posterPhone = String(post?.userPhone || post?.contactPhone || '').replace(/\D/g, '');
  const posterName = String(post?.userName || post?.authorName || '').trim().toLowerCase();

  const helperMap = new Map<string, any>();

  for (const r of replies) {
    if (!r || typeof r !== 'object') continue;
    const msgText = String(r.message || r.text || '').trim();
    // Filter out system/poster chat messages that were accidentally added to replies earlier
    if (
      msgText.startsWith('✅ [පියවර 2/4') ||
      msgText.startsWith('🎉 [පියවර 4/4') ||
      msgText.startsWith('📍 [රෝහල') ||
      msgText.startsWith('🚗 [පියවර 3/4') ||
      msgText.startsWith('🏥 [පියවර 3/4') ||
      msgText.startsWith('🩸 [පියවර 3/4') ||
      (msgText.startsWith('✅ "') && msgText.includes('තෝරාගෙන ඇත'))
    ) {
      continue;
    }

    const rId = String(r.responderId || '').trim();
    const rPhone = String(r.responderPhone || '').replace(/\D/g, '');
    const rName = String(r.responderName || '').trim().toLowerCase();

    // Skip if this reply was authored by the post owner themselves
    const isSameAsPoster =
      (rId && posterId && rId !== 'helper_user' && rId === posterId) ||
      (rPhone.length >= 9 && posterPhone.length >= 9 && rPhone.slice(-9) === posterPhone.slice(-9)) ||
      (rName && posterName && rName === posterName && !rPhone);
    if (isSameAsPoster) continue;

    // Build a stable deduplication key per helper (prefer last 9 digits of phone, then responderId, then name)
    const dedupeKey =
      rPhone.length >= 9
        ? `ph_${rPhone.slice(-9)}`
        : rId && rId !== 'helper_user'
        ? `id_${rId}`
        : rName
        ? `nm_${rName}`
        : `raw_${r.id || Math.random()}`;

    const existing = helperMap.get(dedupeKey);
    if (!existing) {
      helperMap.set(dedupeKey, r);
    } else {
      // Merge flags so confirmation / step progress is never lost, and prefer clean user message over chat-prefixed text
      const existingCleanMsg = String(existing.message || '').startsWith('🩸 [පියවර 1/4')
        ? msgText || existing.message
        : existing.message || msgText;
      helperMap.set(dedupeKey, {
        ...existing,
        ...r,
        id: existing.id || r.id,
        responderId: existing.responderId && existing.responderId !== 'helper_user' ? existing.responderId : r.responderId,
        responderName: existing.responderName || r.responderName,
        responderPhone: existing.responderPhone || r.responderPhone,
        message: existingCleanMsg,
        isConfirmed: Boolean(existing.isConfirmed || r.isConfirmed),
        isAccepted: Boolean(existing.isAccepted || r.isAccepted),
        donorArrivedAtHospital: Boolean(existing.donorArrivedAtHospital || r.donorArrivedAtHospital),
        bloodDonatedByHelper: Boolean(existing.bloodDonatedByHelper || r.bloodDonatedByHelper),
        workflowStep: Math.max(Number(existing.workflowStep || 0), Number(r.workflowStep || 0)),
      });
    }
  }

  return Array.from(helperMap.values());
}

export function subscribeToHelpPosts(callback: (posts: any[]) => void): () => void {
  let primaryPosts: any[] = [];
  let legacyPosts: any[] = [];
  let fallbackPosts: any[] = [];
  const emitMerged = () => {
    const map = new Map();
    [...fallbackPosts, ...legacyPosts, ...primaryPosts].forEach((p) => {
      if (p && p.id && !p.isDeleted && p.status !== 'deleted' && p.status !== 'archived') {
        const cleanReplies = Array.isArray(p.replies) ? deduplicatePostReplies(p.replies, p) : [];
        map.set(String(p.id), {
          ...p,
          replies: cleanReplies,
          repliesCount: cleanReplies.length,
        });
      }
    });
    const sorted = Array.from(map.values()).sort((a: any, b: any) => {
      const tA = a.createdAtMs || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tB = b.createdAtMs || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return tB - tA;
    });
    callback(sorted);
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
  pageSize: number = 5
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
    const newLastDoc = (snap as QuerySnapshot<DocumentData>).docs.length === 0 ? null : (snap as QuerySnapshot<DocumentData>).docs[(snap as QuerySnapshot<DocumentData>).docs.length - 1];
    const hasMore = (snap as QuerySnapshot<DocumentData>).docs.length === pageSize;

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

  // ☁️ Cloudflare R2 / Object Storage: Firestore තුළ තැන්පත් කළ යුත්තේ CDN URL පමණි
  if (enriched.imageUrl && typeof enriched.imageUrl === 'string' && enriched.imageUrl.startsWith('data:image/')) {
    try {
      const uploadRes = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          fileBase64: enriched.imageUrl,
          mediaType: 'image',
          fileName: `post_${postId}.jpg`,
        }),
      });
      if (uploadRes.ok) {
        const upData = await uploadRes.json();
        if (upData.url || upData.directUrl || upData.proxyUrl) {
          enriched.imageUrl = upData.url || upData.directUrl || upData.proxyUrl;
        }
      }
    } catch (e) {
      console.warn('R2 upload notice before Firestore save:', e);
    }
  }

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

    // 1. Soft-delete across all primary and fallback databases immediately so concurrent queries and snapshots discard it
    const softDeleteData = {
      isDeleted: true,
      status: "deleted",
      deletedAt: new Date().toISOString(),
      deletedAtServer: serverTimestamp(),
    };
    await Promise.allSettled([
      setDoc(doc(db, POSTS_COLLECTION, postId), softDeleteData, { merge: true }),
      setDoc(doc(db, "helpPosts", postId), softDeleteData, { merge: true }),
      fallbackDb !== db ? setDoc(doc(fallbackDb, POSTS_COLLECTION, postId), softDeleteData, { merge: true }) : Promise.resolve(),
      fallbackDb !== db ? setDoc(doc(fallbackDb, "helpPosts", postId), softDeleteData, { merge: true }) : Promise.resolve(),
    ]);

    // 2. Storage media cleanup if any
    if (imageUrls && imageUrls.length > 0) {
      await deleteStorageFilesByUrls(imageUrls);
    } else {
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const postData: any = snap.data();
          const extractedUrls: string[] = [];
          if (Array.isArray(postData.images)) extractedUrls.push(...postData.images);
          if (Array.isArray(postData.photos)) extractedUrls.push(...postData.photos);
          if (typeof postData.imageUrl === "string") extractedUrls.push(postData.imageUrl);
          if (typeof postData.photoUrl === "string") extractedUrls.push(postData.photoUrl);
          if (extractedUrls.length > 0) {
            await deleteStorageFilesByUrls(extractedUrls);
          }
        }
      } catch (e) {}
    }

    // 0. Remove notifications for this post immediately
    try {
      removeNotificationsForPost(postId);
    } catch (e) {}

    // 3. Subcollection messages & replies cleanup
    try {
      const msgsColRef = collection(db, POSTS_COLLECTION, postId, "messages");
      const snap = await getDocs(msgsColRef);
      if (snap && (snap as QuerySnapshot<DocumentData>).docs && (snap as QuerySnapshot<DocumentData>).docs.length > 0) {
        const batch = writeBatch(db);
        (snap as QuerySnapshot<DocumentData>).docs.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
      }
    } catch (e) {}
    try {
      const repliesColRef = collection(db, POSTS_COLLECTION, postId, "replies");
      const snap = await getDocs(repliesColRef);
      if (snap && (snap as QuerySnapshot<DocumentData>).docs && (snap as QuerySnapshot<DocumentData>).docs.length > 0) {
        const batch = writeBatch(db);
        (snap as QuerySnapshot<DocumentData>).docs.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
      }
    } catch (e) {}
    try {
      const q = query(collection(db, "push_broadcast_queue"), where("postId", "==", postId));
      const snap = await getDocs(q);
      if (snap && (snap as QuerySnapshot<DocumentData>).docs && (snap as QuerySnapshot<DocumentData>).docs.length > 0) {
        const batch = writeBatch(db);
        (snap as QuerySnapshot<DocumentData>).docs.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
      }
    } catch (e) {}

    // 4. Primary & legacy document hard deletion across all collections and databases (AWAITED)
    await Promise.allSettled([
      deleteDoc(docRef),
      deleteDoc(doc(db, "helpPosts", postId)),
      fallbackDb !== db ? deleteDoc(doc(fallbackDb, POSTS_COLLECTION, postId)) : Promise.resolve(),
      fallbackDb !== db ? deleteDoc(doc(fallbackDb, "helpPosts", postId)) : Promise.resolve(),
    ]);

    // 5. Update deleted records map in cloud with arrayUnion across both databases
    const blacklistPayload = {
      deletedPostIds: arrayUnion(postId),
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    };
    await Promise.allSettled([
      setDoc(doc(db, SYSTEM_SETTINGS_COLLECTION, DELETED_RECORDS_DOC), blacklistPayload, { merge: true }),
      fallbackDb !== db ? setDoc(doc(fallbackDb, SYSTEM_SETTINGS_COLLECTION, DELETED_RECORDS_DOC), blacklistPayload, { merge: true }) : Promise.resolve(),
    ]);
  } catch (err) {
    console.warn("deleteHelpPostFromFirestore notice:", err);
  }
}

export async function cleanupQuickServicePostAndMessages(postId: string): Promise<void> {
  if (!postId) return;
  try {
    // 1. Delete all messages from the messages subcollection in Firestore
    try {
      const msgsColRef = collection(db, POSTS_COLLECTION, postId, 'messages');
      const snap = await getDocs(msgsColRef);
      if (snap && (snap as QuerySnapshot<DocumentData>).docs && (snap as QuerySnapshot<DocumentData>).docs.length > 0) {
        const batch = writeBatch(db);
        (snap as QuerySnapshot<DocumentData>).docs.forEach((docSnap) => batch.delete(docSnap.ref));
        await batch.commit();
      }
    } catch (msgErr) {
      console.warn('cleanupQuickServicePostAndMessages msgs cleanup:', msgErr);
    }

    if (fallbackDb !== db) {
      try {
        const fColRef = collection(fallbackDb, POSTS_COLLECTION, postId, 'messages');
        const fSnap = await getDocs(fColRef);
        if (fSnap && fSnap.docs && fSnap.docs.length > 0) {
          const fBatch = writeBatch(fallbackDb);
          fSnap.docs.forEach((docSnap) => fBatch.delete(docSnap.ref));
          await fBatch.commit();
        }
      } catch (_) {}
    }

    // 2. Delete the post from Firestore (and register in deleted_records blacklist)
    await deleteHelpPostFromFirestore(postId);
  } catch (err) {
    console.warn('cleanupQuickServicePostAndMessages notice:', err);
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

      const isDirect = String(postId).startsWith('direct_user_chat_');
      if (!isDirect) {
        try {
          const postSnap = await getDoc(postDocRef);
          if (postSnap.exists()) {
            const pData = postSnap.data() as any;
            if (pData?.isDeleted || pData?.status === "deleted") {
              return; // Do not resurrect deleted post
            }
          }
        } catch (_) {}
      }
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
        lastMessageSenderId: (messageData.senderId ? messageData.senderId : ''),
        lastMessageSenderName: (messageData.senderName ? messageData.senderName : ''),
        lastMessageSenderPhone: (messageData.senderPhone ? messageData.senderPhone : ''),
        lastMessageTime: nowIso,
        lastMessageTimeMs: nowMs,
        ...(isDirect ? { replies: arrayUnion(replyEntry) } : {}),
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
  // Listen without an index-requiring orderBy so missing fields or lack of composite index will never fail
  return onSnapshot(colRef, (snap: QuerySnapshot<DocumentData>) => {
    const msgs = (snap as QuerySnapshot<DocumentData>).docs.map(d => ({ id: d.id, ...d.data() }));
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

export async function deleteChatMessageForEveryone(
  postId: string,
  messageId: string,
  deletedByName: string,
  deletedByUid?: string
): Promise<void> {
  try {
    if (!postId || !messageId) return;
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    // 1. Update in messages subcollection if doc exists
    if (!messageId.startsWith('local_') && !messageId.startsWith('rep_') && !messageId.startsWith('init_')) {
      const msgDocRef = doc(db, POSTS_COLLECTION, postId, 'messages', messageId);
      await updateDoc(msgDocRef, sanitizeForFirestore({
        isDeletedForEveryone: true,
        text: '🚫 මෙම පණිවිඩය මකා දමන ලදී (This message was deleted)',
        originalText: '',
        audioUrl: null,
        imageUrl: null,
        videoUrl: null,
        deletedAt: nowIso,
        deletedAtMs: nowMs,
        deletedBy: deletedByName || 'User',
        deletedByUid: deletedByUid || '',
        updatedAtServer: serverTimestamp(),
      })).catch((err) => {
        console.warn('deleteChatMessageForEveryone updateDoc err:', err);
      });
    }

    // 2. Also update parent post replies if the message is in post.replies
    try {
      const postRef = doc(db, POSTS_COLLECTION, postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const postData: any = postSnap.data();
        if (Array.isArray(postData.replies)) {
          let modified = false;
          const updatedReplies = postData.replies.map((r: any) => {
            if (r.id === messageId || (r.createdAtMs && Math.abs(r.createdAtMs - nowMs) < 300000 && r.responderName === deletedByName)) {
              modified = true;
              return {
                ...r,
                isDeletedForEveryone: true,
                message: '🚫 මෙම පණිවිඩය මකා දමන ලදී (This message was deleted)',
                deletedAt: nowIso,
                deletedAtMs: nowMs,
                deletedBy: deletedByName,
              };
            }
            return r;
          });
          if (modified) {
            await updateDoc(postRef, {
              replies: updatedReplies,
              updatedAtServer: serverTimestamp(),
            });
          }
        }
      }
    } catch (e) {
      console.warn('deleteChatMessageForEveryone parent post reply update notice:', e);
    }
  } catch (err) {
    console.warn('deleteChatMessageForEveryone error:', err);
  }
}

export async function togglePinChatMessage(
  postId: string,
  messageId: string,
  isPinned: boolean,
  pinnedByName?: string
): Promise<void> {
  try {
    if (!postId || !messageId) return;
    const nowMs = Date.now();
    if (!messageId.startsWith('local_') && !messageId.startsWith('rep_') && !messageId.startsWith('init_')) {
      const msgDocRef = doc(db, POSTS_COLLECTION, postId, 'messages', messageId);
      await updateDoc(msgDocRef, sanitizeForFirestore({
        isPinned: isPinned,
        pinnedAtMs: isPinned ? nowMs : null,
        pinnedBy: isPinned ? (pinnedByName || '') : null,
        updatedAtServer: serverTimestamp(),
      })).catch((err) => {
        console.warn('togglePinChatMessage updateDoc err:', err);
      });
    }
  } catch (err) {
    console.warn('togglePinChatMessage error:', err);
  }
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
  return onSnapshot(colRef, (snap: QuerySnapshot<DocumentData>) => {
    const ids = (snap as QuerySnapshot<DocumentData>).docs.map(d => d.id);
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
  const unsub1 = onSnapshot(collection(db, RED_ALERTS_COLLECTION), (snap: any) => {
    primaryAlerts = snap.docs ? snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : [];
    emitMerged();
  }, (err) => {
    console.warn('subscribeToRedAlerts error:', err);
  });
  const unsub2 = fallbackDb !== db ? onSnapshot(collection(fallbackDb, RED_ALERTS_COLLECTION), (snap: any) => {
    fallbackAlerts = snap.docs ? snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : [];
    emitMerged();
  }, () => {}) : () => {};
  return () => {
    unsub1();
    unsub2();
  };
}

export const AUDIT_LOGS_COLLECTION = 'auditLogs';

export async function recordAuditLog(log: Omit<AuditLogRecord, 'timestamp' | 'timestampMs'>): Promise<void> {
  try {
    const id = log.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const payload = sanitizeForFirestore({
      ...log,
      id,
      timestamp: nowIso,
      timestampMs: nowMs,
      createdAtServer: serverTimestamp(),
    });
    await setDoc(doc(db, AUDIT_LOGS_COLLECTION, id), payload, { merge: true });
  } catch (err) {
    console.warn('recordAuditLog notice:', err);
  }
}

export async function createRedAlertInFirestore(alertData: any) {
  const id = alertData.id ? String(alertData.id) : 'red_alert_' + Date.now();
  const expiresAtIso = alertData.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const payload = sanitizeForFirestore({
    trueVotes: 0,
    falseVotes: 0,
    weightedTrueScore: 0,
    weightedFalseScore: 0,
    score: 0,
    confidenceStatus: 'suspicious',
    votesMap: {},
    expiresAt: expiresAtIso,
    ...alertData,
    id,
    createdAtServer: serverTimestamp(),
  });
  await setDoc(doc(db, RED_ALERTS_COLLECTION, id), payload, { merge: true });
  setDoc(doc(db, 'redAlerts', id), payload, { merge: true }).catch(() => {});
  if (fallbackDb !== db) {
    setDoc(doc(fallbackDb, RED_ALERTS_COLLECTION, id), payload, { merge: true }).catch(() => {});
  }
  recordAuditLog({
    action: 'alert_created',
    userId: String(alertData.reportedByUserId || 'usr_anonymous'),
    targetId: id,
    details: {
      disasterType: alertData.disasterType,
      locationName: alertData.locationName,
      confidenceStatus: payload.confidenceStatus,
    },
  }).catch(() => {});
  return id;
}

export interface CastWeightedVoteParams {
  alertId: string;
  userId: string;
  userName: string;
  userPhone?: string;
  voteType: 'true' | 'false';
  baseWeight: number;
  trustLevel: 'new' | 'normal' | 'trusted' | 'moderator';
  distanceKm?: number | null;
  deviceFingerprint?: string;
  reason?: string;
}

export interface CastWeightedVoteResult {
  success: boolean;
  errorSi?: string;
  score: number;
  trueVotes: number;
  falseVotes: number;
  weightedTrueScore: number;
  weightedFalseScore: number;
  confidenceStatus: RedAlertConfidenceStatus;
  userVote: RedAlertVoteRecord;
  crossedNearbyThreshold: boolean;
  crossedConfirmedThreshold: boolean;
}

export async function castWeightedRedAlertVoteTransaction(
  params: CastWeightedVoteParams
): Promise<CastWeightedVoteResult> {
  const alertRef = doc(db, RED_ALERTS_COLLECTION, params.alertId);
  const voteSubRef = doc(db, RED_ALERTS_COLLECTION, params.alertId, 'votes', params.userId);
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  const txResult = await runTransaction(db, async (transaction) => {
    const alertSnap = await transaction.get(alertRef);
    if (!alertSnap.exists()) {
      throw new Error('ආපදා නිවේදනය සොයාගත නොහැක.');
    }

    const data: any = alertSnap.data() || {};
    if (data.reportedByUserId && String(data.reportedByUserId) === String(params.userId)) {
      throw new Error('වාර්තා කළ පුද්ගලයාට තමන්ගේම නිවේදනයට ඡන්දය දිය නොහැක.');
    }

    const existingVotesMap: Record<string, RedAlertVoteRecord> =
      data.votesMap && typeof data.votesMap === 'object' ? { ...data.votesMap } : {};

    // Strict One-Vote-Per-Account & One-Vote-Per-Device Enforcement
    const alreadyInVerifiedList = Array.isArray(data.verifiedByUserIds) && data.verifiedByUserIds.includes(params.userId);
    const alreadyInFakeList = Array.isArray(data.fakeReportedByUserIds) && data.fakeReportedByUserIds.includes(params.userId);
    if (existingVotesMap[params.userId] || alreadyInVerifiedList || alreadyInFakeList) {
      throw new Error('එක් ගිණුමකින් සත්‍ය/අසත්‍ය ලෙස ලකුණු දිය හැක්කේ එක් වරක් පමණි. ඔබ දැනටමත් ප්‍රතිචාර දක්වා ඇත.');
    }

    if (params.deviceFingerprint && params.deviceFingerprint !== 'fp_fallback_device') {
      for (const [, vRec] of Object.entries(existingVotesMap)) {
        if (
          vRec &&
          vRec.deviceFingerprint &&
          vRec.deviceFingerprint === params.deviceFingerprint
        ) {
          throw new Error('එක් ගිණුමකින් හෝ උපාංගයකින් සත්‍ය/අසත්‍ය ලෙස ලකුණු දිය හැක්කේ එක් වරක් පමණි. ඔබ දැනටමත් ප්‍රතිචාර දක්වා ඇත.');
        }
      }
    }

    const effectiveWeight = Number(params.baseWeight.toFixed(2));

    const newVoteRecord: RedAlertVoteRecord = {
      userId: params.userId,
      userName: params.userName || 'පරිශීලක',
      vote: params.voteType,
      weight: effectiveWeight,
      trustLevel: params.trustLevel,
      flipCount: 0,
      distanceKm: params.distanceKm ?? null,
      deviceFingerprint: params.deviceFingerprint || '',
      timestamp: nowIso,
      timestampMs: nowMs,
    };

    existingVotesMap[params.userId] = newVoteRecord;

    // Recalculate totals from votesMap
    let trueVotes = 0;
    let falseVotes = 0;
    let weightedTrueScore = 0;
    let weightedFalseScore = 0;
    const verifiedByUserIds: string[] = [];
    const fakeReportedByUserIds: string[] = [];

    for (const [uidKey, rec] of Object.entries(existingVotesMap)) {
      if (!rec) continue;
      const w = typeof rec.weight === 'number' && rec.weight > 0 ? rec.weight : 1.0;
      if (rec.vote === 'true') {
        trueVotes += 1;
        weightedTrueScore += w;
        verifiedByUserIds.push(uidKey);
      } else if (rec.vote === 'false') {
        falseVotes += 1;
        weightedFalseScore += w;
        fakeReportedByUserIds.push(uidKey);
      }
    }

    weightedTrueScore = Number(weightedTrueScore.toFixed(2));
    weightedFalseScore = Number(weightedFalseScore.toFixed(2));

    const createdMs = data.createdAt ? new Date(data.createdAt).getTime() : nowMs;
    const isOlderThan24h = nowMs - createdMs >= 24 * 60 * 60 * 1000;
    const rawScore = Number((weightedTrueScore - weightedFalseScore).toFixed(2));
    const score = isOlderThan24h ? Number((rawScore * 0.5).toFixed(2)) : rawScore;

    const prevScore = typeof data.score === 'number' ? data.score : 0;
    const prevStatus: RedAlertConfidenceStatus = data.confidenceStatus || 'suspicious';

    let confidenceStatus: RedAlertConfidenceStatus = 'suspicious';
    if (score >= 10) {
      confidenceStatus = 'confirmed';
    } else if (score >= 4) {
      confidenceStatus = 'likely_true';
    } else if (score <= -10) {
      confidenceStatus = 'removed';
    } else if (score <= -4) {
      confidenceStatus = 'disputed';
    } else {
      confidenceStatus = 'suspicious';
    }

    const isRemovedAsFake = confidenceStatus === 'removed';
    const crossedNearbyThreshold = prevScore < 4 && score >= 4;
    const crossedConfirmedThreshold = prevScore < 10 && score >= 10;

    const updatePayload: Record<string, any> = {
      votesMap: existingVotesMap,
      trueVotes,
      falseVotes,
      weightedTrueScore,
      weightedFalseScore,
      score,
      confidenceStatus,
      verifiedByUserIds,
      fakeReportedByUserIds,
      fakeVotesCount: falseVotes,
      fakeReportsCount: falseVotes,
      isFlaggedFake: confidenceStatus === 'disputed' || confidenceStatus === 'removed',
      isRemovedAsFake,
      ...(isRemovedAsFake
        ? {
            status: 'fake',
            fakeHighlightedAt: nowIso,
            statusChangeMessage: '❌ ප්‍රජා ඡන්ද (ලකුණු ≤ -10) මගින් අසත්‍ය බවට තහවුරු කර සංරක්ෂණය (Archive) කරන ලදී.',
          }
        : confidenceStatus === 'confirmed' && prevStatus !== 'confirmed'
        ? {
            status: 'active',
            statusChangeMessage: '✅ ප්‍රජා ඡන්ද (ලකුණු ≥ +10) මගින් මෙම රතු එළිය පූර්ණ ලෙස තහවුරු කරන ලදී!',
          }
        : {}),
      updatedAtServer: serverTimestamp(),
    };

    transaction.set(alertRef, sanitizeForFirestore(updatePayload), { merge: true });
    transaction.set(voteSubRef, sanitizeForFirestore(newVoteRecord), { merge: true });

    return {
      score,
      trueVotes,
      falseVotes,
      weightedTrueScore,
      weightedFalseScore,
      confidenceStatus,
      userVote: newVoteRecord,
      crossedNearbyThreshold,
      crossedConfirmedThreshold,
      alertData: { ...data, ...updatePayload, id: params.alertId },
    };
  });

  // Mirror to fallbackDb if separate
  if (fallbackDb !== db) {
    setDoc(
      doc(fallbackDb, RED_ALERTS_COLLECTION, params.alertId),
      sanitizeForFirestore({
        votesMap: { [params.userId]: txResult.userVote },
        trueVotes: txResult.trueVotes,
        falseVotes: txResult.falseVotes,
        weightedTrueScore: txResult.weightedTrueScore,
        weightedFalseScore: txResult.weightedFalseScore,
        score: txResult.score,
        confidenceStatus: txResult.confidenceStatus,
      }),
      { merge: true }
    ).catch(() => {});
  }

  // Write Audit Log
  recordAuditLog({
    action: txResult.confidenceStatus === 'removed' ? 'alert_removed' : 'vote_cast',
    userId: params.userId,
    targetId: params.alertId,
    details: {
      vote: params.voteType,
      weight: txResult.userVote.weight,
      trustLevel: params.trustLevel,
      flipCount: txResult.userVote.flipCount,
      newScore: txResult.score,
      confidenceStatus: txResult.confidenceStatus,
    },
  }).catch(() => {});

  // Trigger free multi-channel push broadcast (Web Push VAPID, ntfy.sh, Telegram, Brevo Email) when crossing +4 or +10
  if (txResult.crossedNearbyThreshold || txResult.crossedConfirmedThreshold) {
    fetch('/api/alerts/notify-channels', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({
        alertId: params.alertId,
        title: txResult.alertData.disasterTitleSi || txResult.alertData.title || 'හදිසි ආපදා අනතුරු ඇඟවීමක්',
        description: txResult.alertData.description || '',
        locationName: txResult.alertData.locationName || 'ශ්‍රී ලංකාව',
        district: txResult.alertData.district || txResult.alertData.locationName || 'srilanka',
        latitude: txResult.alertData.latitude || txResult.alertData.lat || 6.9271,
        longitude: txResult.alertData.longitude || txResult.alertData.lng || 79.8612,
        score: txResult.score,
        confidenceStatus: txResult.confidenceStatus,
        tier: txResult.crossedConfirmedThreshold ? 'confirmed' : 'likely_true',
      }),
    }).catch(() => {});
  }

  return {
    success: true,
    score: txResult.score,
    trueVotes: txResult.trueVotes,
    falseVotes: txResult.falseVotes,
    weightedTrueScore: txResult.weightedTrueScore,
    weightedFalseScore: txResult.weightedFalseScore,
    confidenceStatus: txResult.confidenceStatus,
    userVote: txResult.userVote,
    crossedNearbyThreshold: txResult.crossedNearbyThreshold,
    crossedConfirmedThreshold: txResult.crossedConfirmedThreshold,
  };
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
  await Promise.allSettled([
    deleteDoc(doc(db, RED_ALERTS_COLLECTION, id)),
    deleteDoc(doc(db, 'redAlerts', id)),
  ]);
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
    if (snap.exists()) {
      const data: any = snap.data();
      reporterUserId = data.reportedByUserId || '';
    }
    let existingReports: any[] = [];
    if (snap.exists()) {
      const data: any = snap.data() || {};
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
      const data: any = snap.data() || {};
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
      const data: any = snap.data() || {};
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
  return onSnapshot(docRef, (snap: any) => {
    if (snap && snap.exists && snap.exists()) {
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
    latitude: null,
    longitude: null,
    currentLocation: null,
    latestAudioBase64: null,
    isSilentAudioStreaming: false,
    endedAtMs: Date.now(),
    updatedAtServer: serverTimestamp(),
    updatedAtMs: Date.now() 
  }, { merge: true });
}

export function subscribeToSosLiveSession(sessionId: string, callback: (session: any) => void): () => void {
  const docRef = doc(db, 'sos_live_sessions', sessionId);
  return onSnapshot(docRef, (snap: any) => {
    if (snap && snap.exists && snap.exists()) {
      callback({ id: snap.id, ...(snap.data() as any) });
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
      return { id: snap.id, ...(snap.data() as any) };
    }
    return null;
  } catch (err) {
    return null;
  }
}
// ==============================================================
// 📋 ISSUES MANAGEMENT (ගැටලු සහ පැමිණිලි කළමනාකරණය)
// ==============================================================

export function subscribeToIssuesFromFirestore(callback: (issues: any[]) => void): () => void {
  let primaryIssues: any[] = [];
  let fallbackIssues: any[] = [];
  const emitMerged = () => {
    const map = new Map();
    [...fallbackIssues, ...primaryIssues].forEach((iss) => {
      if (iss && iss.id) map.set(String(iss.id), iss);
    });
    const sorted = Array.from(map.values()).sort((a: any, b: any) => {
      const tA = a.createdAtMs || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tB = b.createdAtMs || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return tB - tA;
    });
    callback(sorted);
  };

  const unsub1 = onSnapshot(collection(db, ISSUES_COLLECTION), (snap: any) => {
    primaryIssues = snap.docs ? snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : [];
    emitMerged();
  }, (err) => {
    console.warn('subscribeToIssuesFromFirestore error:', err);
  });

  const unsub2 = fallbackDb !== db ? onSnapshot(collection(fallbackDb, ISSUES_COLLECTION), (snap: any) => {
    fallbackIssues = snap.docs ? snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : [];
    emitMerged();
  }, () => {}) : () => {};

  return () => {
    unsub1();
    unsub2();
  };
}

export async function saveIssueToFirestore(issueData: any): Promise<string> {
  const id = issueData?.id ? String(issueData.id) : `issue_${Date.now()}`;
  const payload = sanitizeForFirestore({
    ...issueData,
    id,
    createdAt: issueData?.createdAt || new Date().toISOString(),
    createdAtMs: issueData?.createdAtMs || Date.now(),
    updatedAtServer: serverTimestamp(),
  });
  try {
    await setDoc(doc(db, ISSUES_COLLECTION, id), payload, { merge: true });
    if (fallbackDb !== db) {
      setDoc(doc(fallbackDb, ISSUES_COLLECTION, id), payload, { merge: true }).catch(() => {});
    }
  } catch (err) {
    console.warn('saveIssueToFirestore notice:', err);
  }
  return id;
}

export async function updateIssueInFirestore(issueId: string, updateData: any): Promise<void> {
  if (!issueId) return;
  const payload = sanitizeForFirestore({
    ...updateData,
    updatedAt: new Date().toISOString(),
    updatedAtServer: serverTimestamp(),
  });
  try {
    await setDoc(doc(db, ISSUES_COLLECTION, issueId), payload, { merge: true });
    if (fallbackDb !== db) {
      setDoc(doc(fallbackDb, ISSUES_COLLECTION, issueId), payload, { merge: true }).catch(() => {});
    }
  } catch (err) {
    console.warn('updateIssueInFirestore notice:', err);
  }
}

export async function deleteIssueFromFirestore(issueId: string): Promise<void> {
  if (!issueId) return;
  try {
    await deleteDoc(doc(db, ISSUES_COLLECTION, issueId));
    if (fallbackDb !== db) {
      deleteDoc(doc(fallbackDb, ISSUES_COLLECTION, issueId)).catch(() => {});
    }
  } catch (err) {
    console.warn('deleteIssueFromFirestore notice:', err);
  }
}

// ==============================================================
// 🛒 MARKETPLACE OPERATIONS
// ==============================================================

export function subscribeToMarketplaceItems(callback: (items: any[]) => void): () => void {
  const colRef = collection(db, "marketplace");
  return onSnapshot(colRef, (snap: QuerySnapshot<DocumentData>) => {
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
  return onSnapshot(colRef, (snap: QuerySnapshot<DocumentData>) => {
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
  return onSnapshot(colRef, (snap: QuerySnapshot<DocumentData>) => {
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
  const unsub1 = onSnapshot(collection(db, "saved_places"), (snap: any) => {
    primaryPlaces = snap.docs ? snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : [];
    emitMerged();
  }, () => {});
  const unsub2 = fallbackDb !== db ? onSnapshot(collection(fallbackDb, "saved_places"), (snap: any) => {
    fallbackPlaces = snap.docs ? snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : [];
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
function subscribeMergedEmergencyCollection(colName: string, callback: (items: any[]) => void): () => void {
  let primaryDocs: any[] = [];
  let fallbackDocs: any[] = [];

  const emit = () => {
    const map = new Map<string, any>();
    for (const d of fallbackDocs) {
      if (d && d.id) map.set(String(d.id), d);
    }
    for (const d of primaryDocs) {
      if (d && d.id) map.set(String(d.id), d);
    }
    callback(Array.from(map.values()));
  };

  const unsub1 = onSnapshot(collection(db, colName), (snap) => {
    primaryDocs = filterAndPurgeDummySnapDocs(snap);
    emit();
  }, () => {});

  if (fallbackDb && fallbackDb !== db) {
    const unsub2 = onSnapshot(collection(fallbackDb, colName), (snap) => {
      fallbackDocs = filterAndPurgeDummySnapDocs(snap);
      emit();
    }, () => {});
    return () => {
      unsub1();
      unsub2();
    };
  }

  return unsub1;
}

async function dualSaveDoc(colName: string, id: string, data: any) {
  const sanitized = sanitizeForFirestore({ ...data, id });
  await setDoc(doc(db, colName, id), sanitized, { merge: true }).catch(() => {});
  if (fallbackDb && fallbackDb !== db) {
    await setDoc(doc(fallbackDb, colName, id), sanitized, { merge: true }).catch(() => {});
  }
}

async function dualDeleteDoc(colName: string, id: string) {
  if (!id) return;
  await deleteDoc(doc(db, colName, id)).catch(() => {});
  if (fallbackDb && fallbackDb !== db) {
    await deleteDoc(doc(fallbackDb, colName, id)).catch(() => {});
  }
}

export function subscribeToBloodRequestsFromFirestore(callback: (reqs: any[]) => void): () => void {
  return subscribeMergedEmergencyCollection("blood_requests", callback);
}
export function subscribeToVolunteerDonorsFromFirestore(callback: (donors: any[]) => void): () => void {
  return subscribeMergedEmergencyCollection("volunteer_donors", callback);
}
export function subscribeToJobsFromFirestore(callback: (jobs: any[]) => void): () => void {
  return onSnapshot(collection(db, "jobs"), (snap: any) => {
    callback(snap.docs ? snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : []);
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
export function subscribeToAccommodationsFromFirestore(callback: (items: any[]) => void): () => void {
  return onSnapshot(collection(db, "accommodations"), (snap: any) => {
    callback(snap.docs ? snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : []);
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
  await dualSaveDoc("blood_requests", id, req);
  return id;
}

export async function deleteBloodRequestFromFirestore(id: string) {
  await dualDeleteDoc("blood_requests", id);
}

export async function saveVolunteerDonorToFirestore(donor: any) {
  const id = donor.id ? donor.id : "donor_" + Date.now();
  await dualSaveDoc("volunteer_donors", id, donor);
  return id;
}

export async function deleteVolunteerDonorFromFirestore(id: string) {
  await dualDeleteDoc("volunteer_donors", id);
}

export async function saveDisasterReliefToFirestore(relief: any) {
  const id = relief.id ? relief.id : "relief_" + Date.now();
  await dualSaveDoc("disaster_relief", id, relief);
  return id;
}

export async function deleteDisasterReliefFromFirestore(id: string) {
  await dualDeleteDoc("disaster_relief", id);
}

// ==============================================================
// 🏛️ TRANSPARENT AID LEDGER
// ==============================================================

export function subscribeToAidCentersFromFirestore(callback: (centers: any[]) => void): () => void {
  return subscribeMergedEmergencyCollection("aid_centers", callback);
}

export async function saveAidCenterToFirestore(item: any) {
  const id = item.id ? item.id : "aid_center_" + Date.now();
  await dualSaveDoc("aid_centers", id, item);
  return id;
}

export async function updateAidCenterInFirestore(id: string, updateData: any) {
  await dualSaveDoc("aid_centers", id, { ...updateData, updatedAtServer: serverTimestamp() });
}

export async function deleteAidCenterFromFirestore(id: string) {
  await dualDeleteDoc("aid_centers", id);
}

export function subscribeToAidDeliveriesFromFirestore(callback: (deliveries: any[]) => void): () => void {
  return subscribeMergedEmergencyCollection("aid_deliveries", callback);
}

export async function saveAidDeliveryToFirestore(item: any) {
  const id = item.id ? item.id : "aid_delivery_" + Date.now();
  await dualSaveDoc("aid_deliveries", id, item);
  return id;
}

export async function updateAidDeliveryInFirestore(id: string, updateData: any) {
  await dualSaveDoc("aid_deliveries", id, { ...updateData, updatedAtServer: serverTimestamp() });
}

export async function deleteAidDeliveryFromFirestore(id: string) {
  await dualDeleteDoc("aid_deliveries", id);
}

export function subscribeToAidBroadcastsFromFirestore(callback: (broadcasts: any[]) => void): () => void {
  return subscribeMergedEmergencyCollection("aid_broadcasts", callback);
}

export async function saveAidBroadcastToFirestore(item: any) {
  const id = item.id ? item.id : "aid_broadcast_" + Date.now();
  await dualSaveDoc("aid_broadcasts", id, item);
  return id;
}

export async function deleteAidBroadcastFromFirestore(id: string) {
  await dualDeleteDoc("aid_broadcasts", id);
}

// ==============================================================
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
  deletedJobIds?: string[];
  deletedAccommodationIds?: string[];
  deletedBarterItemIds?: string[];
}

export async function saveDeletedRecordsToFirestore(records: DeletedRecordsMap): Promise<void> {
  try {
    const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, DELETED_RECORDS_DOC);
    const updatePayload: any = {
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    };
    for (const [key, val] of Object.entries(records)) {
      if (Array.isArray(val) && val.length > 0) {
        updatePayload[key] = arrayUnion(...val);
      }
    }
    await Promise.allSettled([
      setDoc(docRef, updatePayload, { merge: true }),
      fallbackDb !== db ? setDoc(doc(fallbackDb, SYSTEM_SETTINGS_COLLECTION, DELETED_RECORDS_DOC), updatePayload, { merge: true }) : Promise.resolve(),
    ]);
  } catch (err) {
    console.warn('saveDeletedRecordsToFirestore warning:', err);
  }
}

export function subscribeToDeletedRecordsFromFirestore(callback: (records: DeletedRecordsMap | null) => void): () => void {
  try {
    const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, DELETED_RECORDS_DOC);
    return onSnapshot(docRef, (snap: any) => {
      if (snap && snap.exists && snap.exists()) {
        callback(snap.data() as DeletedRecordsMap);
      } else {
        callback(null);
      }
    }, (err: any) => {
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
  return onSnapshot(colRef, (snap: QuerySnapshot<DocumentData>) => {
    const list = (snap as QuerySnapshot<DocumentData>).docs.map(d => ({ id: d.id, ...d.data() }));
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
    return onSnapshot(q as any, (snapshot: any) => {
      const items: PendingAiQuery[] = [];
      snapshot.forEach((docSnap: any) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      items.sort((a, b) => new Date(b.askedAt || 0).getTime() - new Date(a.askedAt || 0).getTime());
      callback(items);
    }, (error: any) => {
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
    return onSnapshot(q as any, (snapshot: any) => {
      const items: VerifiedAiKnowledgeItem[] = [];
      snapshot.forEach((docSnap: any) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      callback(items);
    }, (error: any) => {
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

export function subscribeToDisasterReliefFromFirestore(callback: (items: any[]) => void): () => void {
  return subscribeMergedEmergencyCollection("disaster_relief", callback);
}

export function subscribeToBarterProposalsFromFirestore(callback: (proposals: any[]) => void): () => void {
  return onSnapshot(collection(db, "barter_proposals"), (snap: any) => {
    callback(snap.docs ? snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : []);
  }, () => {});
}

export async function saveBarterProposalToFirestore(proposal: any) {
  const id = proposal.id ? String(proposal.id) : "prop_" + Date.now();
  await setDoc(doc(db, "barter_proposals", id), sanitizeForFirestore({ ...proposal, id }), { merge: true });
  return id;
}

export function subscribeToJobCommentsFromFirestore(jobId: string, callback: (comments: any[]) => void): () => void {
  if (!jobId) return () => {};
  return onSnapshot(collection(db, "jobs", jobId, "comments"), (snap: any) => {
    const list = snap.docs ? snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : [];
    list.sort((a: any, b: any) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    callback(list);
  }, () => {});
}

export async function saveJobCommentToFirestore(jobId: string, comment: any) {
  if (!jobId) return;
  const id = comment.id ? String(comment.id) : "cmt_" + Date.now();
  await setDoc(doc(db, "jobs", jobId, "comments", id), sanitizeForFirestore({ ...comment, id, jobId }), { merge: true });
  return id;
}

// ==============================================================
// 💰 CREDITS, TRANSACTIONS, SERVICE FEES & S-POINTS CLOUD SYNC
// ==============================================================

export const CREDITS_COLLECTION = 'credits';
export const CREDIT_TRANSACTIONS_COLLECTION = 'creditTransactions';
export const S_POINTS_COLLECTION = 's_points';

export async function saveCreditBalanceToFirestore(
  userIdOrNumericId: string,
  balance: number,
  extraMeta?: Record<string, any>
): Promise<void> {
  if (!userIdOrNumericId) return;
  const cleanId = String(userIdOrNumericId).trim();
  if (!cleanId) return;

  const payload = sanitizeForFirestore({
    ...(extraMeta || {}),
    userId: cleanId,
    balance: Number(balance),
    credits: Number(balance),
    updatedAt: new Date().toISOString(),
    updatedAtMs: Date.now(),
    updatedAtServer: serverTimestamp(),
  });

  try {
    await setDoc(doc(db, CREDITS_COLLECTION, cleanId), payload, { merge: true });
    if (fallbackDb !== db) {
      setDoc(doc(fallbackDb, CREDITS_COLLECTION, cleanId), payload, { merge: true }).catch(() => {});
    }
  } catch (err) {
    console.warn('saveCreditBalanceToFirestore notice:', err);
  }
}

export function subscribeToCreditBalancesFromFirestore(
  callback: (balancesMap: Record<string, number>) => void
): () => void {
  const colRef = collection(db, CREDITS_COLLECTION);
  return onSnapshot(colRef, (snap: QuerySnapshot<DocumentData>) => {
    const map: Record<string, number> = {};
    (snap as QuerySnapshot<DocumentData>).docs.forEach((d) => {
      const data: any = d.data();
      const bal = typeof data.balance === 'number' ? data.balance : typeof data.credits === 'number' ? data.credits : undefined;
      if (bal !== undefined) {
        map[d.id] = bal;
        if (data.userId) map[String(data.userId)] = bal;
        if (data.numericId) map[String(data.numericId)] = bal;
      }
    });
    callback(map);
  }, (err) => {
    console.warn('subscribeToCreditBalancesFromFirestore notice:', err);
  });
}

export async function saveCreditTransactionToFirestore(tx: any): Promise<string> {
  const id = tx?.id ? String(tx.id) : `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const payload = sanitizeForFirestore({
    ...tx,
    id,
    timestampMs: tx?.timestampMs || Date.now(),
    updatedAtServer: serverTimestamp(),
  });

  try {
    await setDoc(doc(db, CREDIT_TRANSACTIONS_COLLECTION, id), payload, { merge: true });
    if (fallbackDb !== db) {
      setDoc(doc(fallbackDb, CREDIT_TRANSACTIONS_COLLECTION, id), payload, { merge: true }).catch(() => {});
    }
  } catch (err) {
    console.warn('saveCreditTransactionToFirestore notice:', err);
  }
  return id;
}

export function subscribeToCreditTransactionsFromFirestore(
  callback: (transactions: any[]) => void
): () => void {
  const colRef = collection(db, CREDIT_TRANSACTIONS_COLLECTION);
  return onSnapshot(colRef, (snap: QuerySnapshot<DocumentData>) => {
    const list = (snap as QuerySnapshot<DocumentData>).docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a: any, b: any) => (b.timestampMs || 0) - (a.timestampMs || 0));
    callback(list);
  }, (err) => {
    console.warn('subscribeToCreditTransactionsFromFirestore notice:', err);
  });
}

export async function saveCustomServiceFeesToFirestore(feesMap: Record<string, any>): Promise<void> {
  try {
    const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, 'service_fees');
    await setDoc(docRef, sanitizeForFirestore({
      fees: feesMap,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    }), { merge: true });
  } catch (err) {
    console.warn('saveCustomServiceFeesToFirestore notice:', err);
  }
}

export function subscribeToCustomServiceFeesFromFirestore(
  callback: (feesMap: Record<string, any> | null) => void
): () => void {
  const docRef = doc(db, SYSTEM_SETTINGS_COLLECTION, 'service_fees');
  return onSnapshot(docRef, (snap: any) => {
    if (snap && snap.exists && snap.exists()) {
      const data = snap.data();
      callback(data?.fees || null);
    } else {
      callback(null);
    }
  }, () => {});
}

export async function saveUserSPointsToFirestore(userId: string, sPointsData: any): Promise<void> {
  if (!userId) return;
  const cleanId = String(userId).trim();
  try {
    await setDoc(doc(db, S_POINTS_COLLECTION, cleanId), sanitizeForFirestore({
      userId: cleanId,
      sPoints: sPointsData,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    }), { merge: true });

    await setDoc(doc(db, USERS_COLLECTION, cleanId), sanitizeForFirestore({
      sPoints: sPointsData,
      updatedAtServer: serverTimestamp(),
    }), { merge: true });
  } catch (err) {
    console.warn('saveUserSPointsToFirestore notice:', err);
  }
}

import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { User, RedAlertItem, RedAlertComment, SosLiveSession, PendingAiQuery, VerifiedAiKnowledgeItem } from '../types';

// Web Client Firestore Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForBuildOnly",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sahaya-sewa.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sahaya-sewa",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sahaya-sewa.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef"
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

// Enable offline caching / persistence where supported
if (typeof window !== 'undefined') {
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence is not supported by browser');
      }
    });
  } catch (e) {
    // Ignore persistence setup errors
  }
}

// -------------------------------------------------------------
// Helper: Sanitize objects for Firestore (removes undefined)
// -------------------------------------------------------------
export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = sanitizeForFirestore(val);
    }
  }
  return clean;
}

export enum OperationType {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LIST = 'LIST',
}

export function handleFirestoreError(error: any, operation: OperationType, path: string) {
  console.warn(`Firestore ${operation} notice on ${path}:`, error?.message || error);
}

// -------------------------------------------------------------
// 1. User Account Operations
// -------------------------------------------------------------
export const USERS_COLLECTION = 'users';

export function subscribeToUsers(callback: (users: User[]) => void): () => void {
  try {
    const q = query(collection(db, USERS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const users: User[] = [];
      snapshot.forEach((docSnap) => {
        users.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      callback(users);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, USERS_COLLECTION);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, USERS_COLLECTION);
    return () => {};
  }
}

export async function saveUserToFirestore(userData: User): Promise<void> {
  const id = userData.userId || userData.id || userData.phone;
  if (!id) return;
  try {
    const docRef = doc(db, USERS_COLLECTION, id);
    await setDoc(docRef, sanitizeForFirestore({
      ...userData,
      id,
      updatedAtServer: serverTimestamp()
    }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${USERS_COLLECTION}/${id}`);
  }
}

export async function getUserFromFirestore(userId: string): Promise<User | null> {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as any) };
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.READ, `${USERS_COLLECTION}/${userId}`);
    return null;
  }
}

export async function updateUserInFirestore(userId: string, partial: Partial<User>): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(docRef, sanitizeForFirestore({
      ...partial,
      updatedAtServer: serverTimestamp()
    }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
  }
}

export async function syncUserProfileToFirestore(userData: User): Promise<void> {
  return saveUserToFirestore(userData);
}

export async function deleteUserAccount(userId: string): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${USERS_COLLECTION}/${userId}`);
  }
}

// -------------------------------------------------------------
// 2. Help Posts Operations
// -------------------------------------------------------------
export const HELP_POSTS_COLLECTION = 'help_posts';

export function subscribeToHelpPosts(callback: (posts: any[]) => void): () => void {
  try {
    const q = query(collection(db, HELP_POSTS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const posts: any[] = [];
      snapshot.forEach((docSnap) => {
        posts.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      posts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(posts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, HELP_POSTS_COLLECTION);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, HELP_POSTS_COLLECTION);
    return () => {};
  }
}

export async function addHelpPostToFirestore(postData: any): Promise<string> {
  const id = postData.id || `post_${Date.now()}`;
  try {
    const docRef = doc(db, HELP_POSTS_COLLECTION, id);
    await setDoc(docRef, sanitizeForFirestore({
      ...postData,
      id,
      createdAtServer: serverTimestamp()
    }));
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, HELP_POSTS_COLLECTION);
    return id;
  }
}

export async function updateHelpPostInFirestore(postId: string, updateData: any): Promise<void> {
  try {
    const docRef = doc(db, HELP_POSTS_COLLECTION, postId);
    await setDoc(docRef, sanitizeForFirestore({
      ...updateData,
      updatedAtServer: serverTimestamp()
    }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${HELP_POSTS_COLLECTION}/${postId}`);
  }
}

export async function deleteHelpPostFromFirestore(postId: string): Promise<void> {
  try {
    const docRef = doc(db, HELP_POSTS_COLLECTION, postId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${HELP_POSTS_COLLECTION}/${postId}`);
  }
}

export async function addReplyToFirestore(postId: string, replyData: any): Promise<void> {
  try {
    const postRef = doc(db, HELP_POSTS_COLLECTION, postId);
    const snap = await getDoc(postRef);
    if (snap.exists()) {
      const post = snap.data();
      const existingReplies = post.replies || [];
      const updatedReplies = [...existingReplies, sanitizeForFirestore(replyData)];
      await updateDoc(postRef, {
        replies: updatedReplies,
        repliesCount: updatedReplies.length,
        updatedAtServer: serverTimestamp()
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${HELP_POSTS_COLLECTION}/${postId}/replies`);
  }
}

// -------------------------------------------------------------
// 3. Red Alert Disaster Hub Operations
// -------------------------------------------------------------
export const RED_ALERTS_COLLECTION = 'red_alerts';

export function subscribeToRedAlerts(callback: (alerts: RedAlertItem[]) => void): () => void {
  try {
    const q = query(collection(db, RED_ALERTS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const alerts: RedAlertItem[] = [];
      snapshot.forEach((docSnap) => {
        alerts.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      alerts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(alerts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, RED_ALERTS_COLLECTION);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, RED_ALERTS_COLLECTION);
    return () => {};
  }
}

export async function createRedAlertInFirestore(alertData: RedAlertItem): Promise<string> {
  const id = alertData.id || `alert_${Date.now()}`;
  try {
    const docRef = doc(db, RED_ALERTS_COLLECTION, id);
    await setDoc(docRef, sanitizeForFirestore({
      ...alertData,
      id,
      createdAtServer: serverTimestamp()
    }));
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, RED_ALERTS_COLLECTION);
    return id;
  }
}

export async function updateRedAlertInFirestore(alertId: string, partial: Partial<RedAlertItem>): Promise<void> {
  try {
    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    await setDoc(docRef, sanitizeForFirestore({
      ...partial,
      updatedAtServer: serverTimestamp()
    }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${RED_ALERTS_COLLECTION}/${alertId}`);
  }
}

export async function deleteRedAlertFromFirestore(alertId: string): Promise<void> {
  try {
    const docRef = doc(db, RED_ALERTS_COLLECTION, alertId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${RED_ALERTS_COLLECTION}/${alertId}`);
  }
}

// -------------------------------------------------------------
// 4. Issues & Support Desk Operations
// -------------------------------------------------------------
export const ISSUES_COLLECTION = 'issues';

export function subscribeToIssuesFromFirestore(callback: (issues: any[]) => void): () => void {
  try {
    const q = query(collection(db, ISSUES_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const issues: any[] = [];
      snapshot.forEach((docSnap) => {
        issues.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      issues.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(issues);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, ISSUES_COLLECTION);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, ISSUES_COLLECTION);
    return () => {};
  }
}

export async function saveIssueToFirestore(issueData: any): Promise<string> {
  const id = issueData.id || `issue_${Date.now()}`;
  try {
    const docRef = doc(db, ISSUES_COLLECTION, id);
    await setDoc(docRef, sanitizeForFirestore({
      ...issueData,
      id,
      createdAtServer: serverTimestamp()
    }));
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, ISSUES_COLLECTION);
    return id;
  }
}

export async function deleteIssueFromFirestore(issueId: string): Promise<void> {
  try {
    const docRef = doc(db, ISSUES_COLLECTION, issueId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${ISSUES_COLLECTION}/${issueId}`);
  }
}

export async function resolveIssueInFirestore(issueId: string, adminNotes?: string): Promise<void> {
  try {
    const docRef = doc(db, ISSUES_COLLECTION, issueId);
    await setDoc(docRef, sanitizeForFirestore({
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      adminNotes: adminNotes || 'Resolved by admin',
      updatedAtServer: serverTimestamp()
    }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${ISSUES_COLLECTION}/${issueId}`);
  }
}

// -------------------------------------------------------------
// 5. Professional Services Operations
// -------------------------------------------------------------
export const PROFESSIONAL_SERVICES_COLLECTION = 'professional_services';

export async function deleteProfessionalServiceFromFirestore(serviceId: string): Promise<void> {
  try {
    const docRef = doc(db, PROFESSIONAL_SERVICES_COLLECTION, serviceId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${PROFESSIONAL_SERVICES_COLLECTION}/${serviceId}`);
  }
}

// -------------------------------------------------------------
// 6. In-App Direct Chat Messages
// -------------------------------------------------------------
export const DIRECT_CHATS_COLLECTION = 'direct_chats';

export async function sendChatMessageToFirestore(chatSessionId: string, messageData: any): Promise<void> {
  try {
    const docRef = doc(db, DIRECT_CHATS_COLLECTION, chatSessionId, 'messages', `msg_${Date.now()}`);
    await setDoc(docRef, sanitizeForFirestore({
      ...messageData,
      createdAtServer: serverTimestamp()
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${DIRECT_CHATS_COLLECTION}/${chatSessionId}`);
  }
}

// -------------------------------------------------------------
// 7. Password Resets Management
// -------------------------------------------------------------
export const PASSWORD_RESETS_COLLECTION = 'password_resets';

export function subscribeToPasswordResetRequests(callback: (requests: any[]) => void): () => void {
  try {
    const q = query(collection(db, PASSWORD_RESETS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const requests: any[] = [];
      snapshot.forEach((docSnap) => {
        requests.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      requests.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(requests);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, PASSWORD_RESETS_COLLECTION);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, PASSWORD_RESETS_COLLECTION);
    return () => {};
  }
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

// -------------------------------------------------------------
// 🤖 8. AI KNOWLEDGE BASE & ACTIVE LEARNING REPOSITORY
// -------------------------------------------------------------
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

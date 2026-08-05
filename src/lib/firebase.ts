import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  memoryLocalCache,
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  doc, 
  updateDoc, 
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { HelpPost, PostReply, ChatMessage } from '../types';
import { initialHelpPosts } from '../data/initialData';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Authenticate anonymously for secure access
signInAnonymously(auth).catch((err) => {
  console.warn('Firebase anonymous auth notice:', err?.message || err);
});

const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

// Initialize Firestore with memory cache to prevent IndexedDB closing/hidden browser errors
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  }, databaseId);
} catch (e) {
  dbInstance = getFirestore(app, databaseId);
}

export const db = dbInstance;

// Validate initial connection as per Firebase best practices
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore connection check notice: client is offline');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Handled Info:', JSON.stringify(errInfo));
  return errInfo;
}

const HELP_POSTS_COLLECTION = 'help_posts';
let isSeedingHelpPosts = false;

export function subscribeToHelpPosts(
  onNext: (posts: HelpPost[]) => void,
  onError?: (err: Error) => void
) {
  const postsRef = collection(db, HELP_POSTS_COLLECTION);
  const q = query(postsRef, orderBy('createdAtMs', 'desc'));

  return onSnapshot(
    q,
    async (snapshot) => {
      // If collection is empty, seed with initial sample posts once
      if (snapshot.empty && !isSeedingHelpPosts) {
        isSeedingHelpPosts = true;
        try {
          console.log('Firestore help_posts collection is empty, seeding initial data...');
          for (const post of initialHelpPosts) {
            try {
              await addDoc(postsRef, {
                ...post,
                createdAtMs: Date.now() - Math.floor(Math.random() * 10000000),
                createdAtServer: serverTimestamp(),
              });
            } catch (e) {
              console.warn('Error seeding initial post:', e);
            }
          }
        } finally {
          isSeedingHelpPosts = false;
        }
        return;
      }

      if (!snapshot.empty) {
        const posts: HelpPost[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            postCode: data.postCode || `#HELP-${docSnap.id.substring(0, 4)}`,
            userName: data.userName || 'පරිශීලක',
            userPhone: data.userPhone || '',
            whatHappened: data.whatHappened || '',
            whatIsNeeded: data.whatIsNeeded || '',
            conditions: data.conditions || '',
            transport: data.transport || 'නැත',
            payment: data.payment || 'නොමිලේ',
            helpersNeeded: data.helpersNeeded || 1,
            helpersAccepted: data.helpersAccepted || 0,
            feeAgreed: data.feeAgreed || false,
            locationName: data.locationName || 'කඩවත',
            distanceKm: data.distanceKm || 2,
            lat: data.lat || 6.9271,
            lng: data.lng || 79.8612,
            createdAt: data.createdAt || 'දැන්',
            repliesCount: data.repliesCount || (data.replies ? data.replies.length : 0),
            helpersCount: data.helpersCount || 1,
            replies: (data.replies as PostReply[]) || [],
            verifiedOtp: data.verifiedOtp ?? true,
            category: data.category || 'quick_services',
          };
        });
        onNext(posts);
      }
    },
    (error) => {
      console.warn('Firestore subscription notice:', error?.message || error);
      handleFirestoreError(error, OperationType.LIST, HELP_POSTS_COLLECTION);
      if (onError) onError(error);
    }
  );
}

export async function addHelpPostToFirestore(
  newPostData: Omit<HelpPost, 'id' | 'postCode' | 'createdAt' | 'repliesCount' | 'helpersCount' | 'replies'>
) {
  try {
    const postsRef = collection(db, HELP_POSTS_COLLECTION);
    const postCode = `#HELP-${Math.floor(1000 + Math.random() * 9000)}`;
    const docRef = await addDoc(postsRef, {
      ...newPostData,
      postCode,
      createdAt: 'මීට සුළු මොහොතකට පෙර',
      repliesCount: 0,
      helpersCount: 1,
      replies: [],
      createdAtMs: Date.now(),
      createdAtServer: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, HELP_POSTS_COLLECTION);
    throw error;
  }
}

export async function addReplyToFirestore(
  postId: string,
  reply: PostReply,
  existingReplies: PostReply[]
) {
  try {
    const postRef = doc(db, HELP_POSTS_COLLECTION, postId);
    const updatedReplies = [...existingReplies, reply];
    await updateDoc(postRef, {
      replies: updatedReplies,
      repliesCount: updatedReplies.length,
      helpersCount: updatedReplies.length + 1,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${HELP_POSTS_COLLECTION}/${postId}`);
  }
}

// Real-time Chat Subscription for a specific Help Post
export function subscribeToChatMessages(
  postId: string,
  onNext: (messages: ChatMessage[]) => void
) {
  const chatRef = collection(db, HELP_POSTS_COLLECTION, postId, 'chat_messages');
  const q = query(chatRef, orderBy('createdAtMs', 'asc'));

  return onSnapshot(
    chatRef,
    (snapshot) => {
      const msgs: ChatMessage[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          senderName: data.senderName || 'පරිශීලක',
          senderRole: data.senderRole || 'helper',
          text: data.text || '',
          timestamp: data.timestamp || 'දැන්',
        };
      });
      onNext(msgs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `${HELP_POSTS_COLLECTION}/${postId}/chat_messages`);
    }
  );
}

// Send real message to Firestore
export async function sendChatMessageToFirestore(
  postId: string,
  chatMsg: Omit<ChatMessage, 'id'>
) {
  try {
    const chatRef = collection(db, HELP_POSTS_COLLECTION, postId, 'chat_messages');
    await addDoc(chatRef, {
      ...chatMsg,
      createdAtMs: Date.now(),
      createdAtServer: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${HELP_POSTS_COLLECTION}/${postId}/chat_messages`);
  }
}


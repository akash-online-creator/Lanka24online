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
  getDoc,
  updateDoc,
  deleteDoc, 
  getDocs,
  getDocFromServer,
  setDoc
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

const databaseId = firebaseConfig.firestoreDatabaseId;

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    localCache: memoryLocalCache(),
  }, databaseId);
} catch {
  firestoreInstance = getFirestore(app, databaseId);
}

export const db = firestoreInstance;

// Graceful background connection check without throwing unhandled network errors
if (typeof window !== 'undefined') {
  setTimeout(async () => {
    try {
      const testDoc = doc(db, 'test', 'connection');
      await getDocFromServer(testDoc).catch(() => {});
    } catch {
      // Operates in offline/cache mode gracefully
    }
  }, 1500);
}

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
export function subscribeToHelpPosts(
  onNext: (posts: HelpPost[]) => void,
  onError?: (err: Error) => void
) {
  const postsRef = collection(db, HELP_POSTS_COLLECTION);
  const q = query(postsRef, orderBy('createdAtMs', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onNext([]);
        return;
      }

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
          createdAtMs: data.createdAtMs || (data.createdAtServer?.seconds ? data.createdAtServer.seconds * 1000 : undefined),
          repliesCount: data.repliesCount || (data.replies ? data.replies.length : 0),
          helpersCount: data.helpersCount || 1,
          replies: (data.replies as PostReply[]) || [],
          verifiedOtp: data.verifiedOtp ?? true,
          category: data.category || 'quick_services',
          specialNotice: data.specialNotice || '',
          tagName: data.tagName || '',
          tagCategory: data.tagCategory || '',
          tagId: data.tagId || '',
          userId: data.userId || '',
          isConfirmed: data.isConfirmed ?? false,
          confirmedBy: data.confirmedBy || '',
          confirmedAt: data.confirmedAt || '',
          confirmedHelperName: data.confirmedHelperName || '',
          confirmedHelperPhone: data.confirmedHelperPhone || '',
          isCompleted: data.isCompleted ?? false,
          completedAt: data.completedAt || '',
          completedBy: data.completedBy || '',
          completedHelperName: data.completedHelperName || '',
          completedHelperPhone: data.completedHelperPhone || '',
          requesterResolved: data.requesterResolved ?? false,
          requesterResolvedAt: data.requesterResolvedAt || '',
          serviceBill: data.serviceBill || undefined,
          isDeleted: data.isDeleted ?? false,
          deletedAt: data.deletedAt || '',
          deletedBy: data.deletedBy || '',
          status: data.status || (data.isDeleted ? 'deleted' : data.isCompleted ? 'completed' : data.isConfirmed ? 'confirmed' : 'active'),
        };
      });
      onNext(posts);
    },
    (error) => {
      console.warn('Firestore subscription notice:', error?.message || error);
      handleFirestoreError(error, OperationType.LIST, HELP_POSTS_COLLECTION);
      if (onError) onError(error);
    }
  );
}

export async function seedDemoHelpPostsToFirestore() {
  const postsRef = collection(db, HELP_POSTS_COLLECTION);
  for (const post of initialHelpPosts) {
    try {
      await addDoc(postsRef, {
        ...post,
        createdAtMs: Date.now() - Math.floor(Math.random() * 10000000),
        createdAtServer: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Error seeding demo post:', e);
    }
  }
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
    const updatedReplies = [reply, ...existingReplies];
    await updateDoc(postRef, {
      replies: updatedReplies,
      repliesCount: updatedReplies.length,
      helpersCount: updatedReplies.length + 1,
    });

    // Also write to chat_messages subcollection so conversation is unified in Chat modal
    try {
      const chatRef = collection(db, HELP_POSTS_COLLECTION, postId, 'chat_messages');
      await addDoc(chatRef, {
        senderName: reply.responderName || 'පරිශීලක',
        senderRole: 'helper',
        text: reply.message || '',
        timestamp: reply.createdAt || 'දැන්',
        senderPhone: reply.responderPhone || '',
        createdAtMs: Date.now(),
        createdAtServer: serverTimestamp(),
      });
    } catch (chatErr) {
      console.warn('Chat mirror notice:', chatErr);
    }
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

  return onSnapshot(
    chatRef,
    (snapshot) => {
      const msgs: ChatMessage[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        let ms = data.createdAtMs;
        if (!ms && data.createdAtServer && typeof data.createdAtServer.toMillis === 'function') {
          ms = data.createdAtServer.toMillis();
        }
        return {
          id: docSnap.id,
          senderName: data.senderName || 'පරිශීලක',
          senderRole: data.senderRole || 'helper',
          text: data.text || '',
          timestamp: data.timestamp || 'දැන්',
          createdAtMs: ms || 0,
          senderPhone: data.senderPhone || '',
        };
      });

      // Sort in strict ascending chronological order
      msgs.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
      onNext(msgs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `${HELP_POSTS_COLLECTION}/${postId}/chat_messages`);
    }
  );
}

// Send real message to Firestore and sync to HelpPost replies for poster's inbox
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

    // Also update parent HelpPost document's replies and metadata so both author and helper inboxes receive it
    try {
      const postRef = doc(db, HELP_POSTS_COLLECTION, postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const data = postSnap.data();
        const existingReplies: PostReply[] = (data.replies as PostReply[]) || [];
        
        const newReply: PostReply = {
          id: `reply_chat_${Date.now()}`,
          responderName: chatMsg.senderName || 'පරිශීලක',
          responderPhone: chatMsg.senderPhone || '',
          message: chatMsg.text || '',
          createdAt: 'මීට සුළු මොහොතකට පෙර',
          whatsappSent: false,
        };

        const updatedReplies = [newReply, ...existingReplies.filter((r) => r.message !== chatMsg.text)];
        await updateDoc(postRef, {
          replies: updatedReplies,
          repliesCount: updatedReplies.length,
          lastActivityAt: new Date().toISOString(),
          lastMessageText: chatMsg.text || '',
          lastMessageSender: chatMsg.senderName || '',
          lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } catch (replySyncErr) {
      console.warn('Reply sync notice:', replySyncErr);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${HELP_POSTS_COLLECTION}/${postId}/chat_messages`);
  }
}

// Update existing Help Post in Firestore (Edit, Soft Delete, Confirm)
export async function updateHelpPostInFirestore(
  postId: string,
  updatedData: Partial<HelpPost>
) {
  try {
    const postRef = doc(db, HELP_POSTS_COLLECTION, postId);
    await updateDoc(postRef, updatedData);
  } catch (error) {
    console.warn('Firestore update doc notice:', error);
    handleFirestoreError(error, OperationType.UPDATE, `${HELP_POSTS_COLLECTION}/${postId}`);
  }
}

// Permanently delete a Help Post from Firestore
export async function deleteHelpPostFromFirestore(postId: string) {
  try {
    const postRef = doc(db, HELP_POSTS_COLLECTION, postId);
    await deleteDoc(postRef);
  } catch (error) {
    console.warn('Firestore delete doc notice:', error);
    handleFirestoreError(error, OperationType.DELETE, `${HELP_POSTS_COLLECTION}/${postId}`);
  }
}

// Full Backup of all Help Posts along with complete chat histories & transactions
export async function fetchAllPostsBackupData(posts: HelpPost[] = []) {
  const safePosts = posts || [];
  const backupPosts = await Promise.all(
    safePosts.map(async (post) => {
      let chatMessages: ChatMessage[] = [];
      try {
        const chatRef = collection(db, HELP_POSTS_COLLECTION, post.id, 'chat_messages');
        const chatSnap = await getDocs(chatRef);
        if (!chatSnap.empty) {
          chatMessages = chatSnap.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              senderName: data.senderName || 'පරිශීලක',
              senderRole: data.senderRole || 'helper',
              text: data.text || '',
              timestamp: data.timestamp || 'දැන්',
              createdAtMs: data.createdAtMs || 0,
              senderPhone: data.senderPhone || '',
            };
          });
        }
      } catch (err) {
        console.warn(`Could not fetch chat history for post ${post.id}:`, err);
      }

      // Fallback: If no chat_messages subcollection found but post has replies, map replies as chat fallback
      if (chatMessages.length === 0 && post.replies && post.replies.length > 0) {
        chatMessages = post.replies.map((reply) => ({
          id: reply.id || `reply_${Date.now()}_${Math.random()}`,
          senderName: reply.responderName || 'පරිශීලක',
          senderRole: 'helper',
          text: reply.message || '',
          timestamp: reply.createdAt || 'දැන්',
          senderPhone: reply.responderPhone || '',
          createdAtMs: Date.now(),
        }));
      }

      return {
        postData: post,
        chatMessages,
      };
    })
  );

  return {
    version: '1.0',
    system: 'Sahaya Seva (සහය සේවා)',
    backupType: 'Full Help Posts & Complete Details Backup',
    backupDate: new Date().toISOString(),
    totalPostsCount: backupPosts.length,
    posts: backupPosts,
  };
}

// Restore Posts and Complete Details from Backup JSON
export async function restorePostsBackupData(backupData: any): Promise<{
  restoredPostsCount: number;
  restoredMessagesCount: number;
  restoredPostsList: HelpPost[];
}> {
  let restoredPostsCount = 0;
  let restoredMessagesCount = 0;
  const restoredPostsList: HelpPost[] = [];

  const rawPostsList = backupData.posts || backupData.helpPosts || (Array.isArray(backupData) ? backupData : []);

  for (const item of rawPostsList) {
    const post: HelpPost = item.postData || item;
    const chatMessages: ChatMessage[] = item.chatMessages || [];

    if (!post || !post.id) continue;

    try {
      // 1. Restore/set main post document in Firestore
      const postRef = doc(db, HELP_POSTS_COLLECTION, post.id);
      await setDoc(postRef, {
        ...post,
        createdAtMs: post.createdAtMs || Date.now(),
      }, { merge: true });

      restoredPostsCount++;
      restoredPostsList.push(post);

      // 2. Restore chat history subcollection in Firestore
      if (Array.isArray(chatMessages) && chatMessages.length > 0) {
        for (const msg of chatMessages) {
          if (!msg) continue;
          const msgId = msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          const msgRef = doc(db, HELP_POSTS_COLLECTION, post.id, 'chat_messages', msgId);
          await setDoc(msgRef, {
            ...msg,
            id: msgId,
            createdAtMs: msg.createdAtMs || Date.now(),
          }, { merge: true });
          restoredMessagesCount++;
        }
      }
    } catch (err) {
      console.warn(`Error restoring post ${post.id}:`, err);
    }
  }

  return {
    restoredPostsCount,
    restoredMessagesCount,
    restoredPostsList,
  };
}




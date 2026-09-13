import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy, 
  limit,
  where,
  startAfter,
  serverTimestamp,
  doc, 
  getDoc,
  updateDoc,
  deleteDoc, 
  getDocs,
  setDoc,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { HelpPost, PostReply, ChatMessage, MarketItem, MarketShop, ServiceReview, User } from '../types';
import { initialHelpPosts } from '../data/initialData';
import { filterNonDeletedPosts, addDeletedPostId } from '../utils/deletedPostsManager';

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
    localCache: typeof window !== 'undefined'
      ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      : memoryLocalCache(),
  }, databaseId);
} catch {
  try {
    firestoreInstance = initializeFirestore(app, {
      localCache: memoryLocalCache(),
    }, databaseId);
  } catch {
    firestoreInstance = getFirestore(app, databaseId);
  }
}

export const db = firestoreInstance;

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

// Map Firestore doc to HelpPost
function mapDocToHelpPost(docSnap: DocumentData | QueryDocumentSnapshot<DocumentData>): HelpPost {
  const data = docSnap.data ? docSnap.data() : docSnap;
  const id = docSnap.id || data.id || `post_${Date.now()}`;
  return {
    id,
    postCode: data.postCode || `#HELP-${id.substring(0, 4)}`,
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
    findForMeType: data.findForMeType,
    itemLostStolenOrSearched: data.itemLostStolenOrSearched,
    incidentLocation: data.incidentLocation,
    incidentDate: data.incidentDate,
    incidentTime: data.incidentTime,
    contactPhone: data.contactPhone,
    contactWhatsapp: data.contactWhatsapp,
    contactAddress: data.contactAddress,
    hasReward: data.hasReward,
    rewardDetails: data.rewardDetails,
    identifyingInfo: data.identifyingInfo,
    targetPrice: data.targetPrice,
    quantityNeeded: data.quantityNeeded,
    hasDeadline: data.hasDeadline,
    deadlineDate: data.deadlineDate,
    deadlineTime: data.deadlineTime,
    deliveryOption: data.deliveryOption,
    otherDeliveryDetails: data.otherDeliveryDetails,
    otherDetails: data.otherDetails,
    fromMeToYouType: data.fromMeToYouType,
    donationItem: data.donationItem,
    donationRecipient: data.donationRecipient,
    donationDeliveryMethod: data.donationDeliveryMethod,
    donationDateType: data.donationDateType,
    donationDate: data.donationDate,
    donationQuantity: data.donationQuantity,
    saveLocationConsent: data.saveLocationConsent,
    revealContactConsent: data.revealContactConsent,
    confirmedHelperId: data.confirmedHelperId,
    authorizedUserIds: data.authorizedUserIds,
    exchangeHaveItem: data.exchangeHaveItem,
    exchangeHaveQuantity: data.exchangeHaveQuantity,
    exchangeWantItem: data.exchangeWantItem,
    exchangeWantQuantity: data.exchangeWantQuantity,
    exchangeMethod: data.exchangeMethod,
    isBoosted: data.isBoosted ?? false,
    boostedAt: data.boostedAt,
    boostedAtMs: data.boostedAtMs,
    boostedUntil: data.boostedUntil,
    boostAmount: data.boostAmount,
    boostPaymentMethod: data.boostPaymentMethod,
    boostPaymentReference: data.boostPaymentReference,
    boostCategory: data.boostCategory,
    adminFlagged: data.adminFlagged ?? false,
    adminFlagReason: data.adminFlagReason || '',
    adminFlaggedAt: data.adminFlaggedAt || '',
    adminFlaggedBy: data.adminFlaggedBy || '',
    isHiddenByAdmin: data.isHiddenByAdmin ?? false,
    posterCorrectionNote: data.posterCorrectionNote || '',
    posterRespondedAt: data.posterRespondedAt || '',
    moderationStatus: data.moderationStatus || 'clean',
  };
}

const HELP_POSTS_COLLECTION = 'help_posts';

// Standard Real-time Subscription with limit for high-speed performance
export function subscribeToHelpPosts(
  onNext: (posts: HelpPost[]) => void,
  onError?: (err: Error) => void,
  fetchLimit: number = 60
) {
  const postsRef = collection(db, HELP_POSTS_COLLECTION);
  const q = query(postsRef, orderBy('createdAtMs', 'desc'), limit(fetchLimit));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        // Read local storage cache if available, or only fresh non-deleted initial posts if never deleted
        const saved = typeof window !== 'undefined' ? localStorage.getItem('sahaya_help_posts') : null;
        if (saved !== null) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              onNext(filterNonDeletedPosts(parsed));
              return;
            }
          } catch {}
        }
        const nonDeletedInitial = filterNonDeletedPosts(initialHelpPosts);
        onNext(nonDeletedInitial);
        return;
      }
      const rawPosts = snapshot.docs.map(mapDocToHelpPost);
      const filtered = filterNonDeletedPosts(rawPosts);
      onNext(filtered);
    },
    (error) => {
      console.warn('Firestore subscription notice:', error?.message || error);
      handleFirestoreError(error, OperationType.LIST, HELP_POSTS_COLLECTION);
      if (onError) onError(error);
      
      const saved = typeof window !== 'undefined' ? localStorage.getItem('sahaya_help_posts') : null;
      if (saved !== null) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            onNext(filterNonDeletedPosts(parsed));
            return;
          }
        } catch {}
      }
      onNext(filterNonDeletedPosts(initialHelpPosts));
    }
  );
}

// Paginated fetching for Infinite Scroll (loads 20 more posts on demand)
export async function fetchMoreHelpPostsFromFirestore(
  lastCreatedAtMs: number,
  limitCount: number = 20
): Promise<{ posts: HelpPost[]; hasMore: boolean }> {
  try {
    const postsRef = collection(db, HELP_POSTS_COLLECTION);
    const q = query(
      postsRef,
      orderBy('createdAtMs', 'desc'),
      startAfter(lastCreatedAtMs),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return { posts: [], hasMore: false };
    }

    const posts = snapshot.docs.map(mapDocToHelpPost);
    return {
      posts,
      hasMore: snapshot.docs.length >= limitCount,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, HELP_POSTS_COLLECTION);
    return { posts: [], hasMore: false };
  }
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

    // Write to chat_messages subcollection
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

// Real-time Chat Subscription for a specific Help Post (capped at 50 recent messages)
export function subscribeToChatMessages(
  postId: string,
  onNext: (messages: ChatMessage[]) => void
) {
  const chatRef = collection(db, HELP_POSTS_COLLECTION, postId, 'chat_messages');
  const q = query(chatRef, orderBy('createdAtMs', 'asc'), limit(50));

  return onSnapshot(
    q,
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

      msgs.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
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

// Update existing Help Post in Firestore
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

// Permanently delete a Help Post
export async function deleteHelpPostFromFirestore(postId: string) {
  try {
    addDeletedPostId(postId);
    const postRef = doc(db, HELP_POSTS_COLLECTION, postId);
    await deleteDoc(postRef);
  } catch (error) {
    console.warn('Firestore delete doc notice:', error);
    handleFirestoreError(error, OperationType.DELETE, `${HELP_POSTS_COLLECTION}/${postId}`);
  }
}

// ---------------- Marketplace Realtime Cloud Sync ----------------
const MARKET_ITEMS_COLLECTION = 'marketplace_items';
const MARKET_SHOPS_COLLECTION = 'marketplace_shops';

export function subscribeToMarketplaceItems(
  onNext: (items: MarketItem[]) => void,
  onError?: (err: Error) => void
) {
  const ref = collection(db, MARKET_ITEMS_COLLECTION);
  const q = query(ref, orderBy('createdAtMs', 'desc'), limit(50));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onNext([]);
        return;
      }
      const items: MarketItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MarketItem, 'id'>)
      }));
      onNext(items);
    },
    (err) => {
      console.warn('Market items sync notice:', err);
      if (onError) onError(err);
    }
  );
}

export async function addMarketplaceItemToFirestore(item: Omit<MarketItem, 'id'>): Promise<string> {
  try {
    const ref = collection(db, MARKET_ITEMS_COLLECTION);
    const docRef = await addDoc(ref, {
      ...item,
      createdAtMs: Date.now(),
      createdAtServer: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, MARKET_ITEMS_COLLECTION);
    throw error;
  }
}

export async function updateMarketplaceItemInFirestore(id: string, data: Partial<MarketItem>) {
  try {
    const itemRef = doc(db, MARKET_ITEMS_COLLECTION, id);
    await updateDoc(itemRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${MARKET_ITEMS_COLLECTION}/${id}`);
  }
}

export async function deleteMarketplaceItemFromFirestore(id: string) {
  try {
    const itemRef = doc(db, MARKET_ITEMS_COLLECTION, id);
    await deleteDoc(itemRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${MARKET_ITEMS_COLLECTION}/${id}`);
  }
}

// ---------------- Saved Posts Cloud Sync ----------------
const SAVED_POSTS_COLLECTION = 'saved_posts';

export function subscribeToUserSavedPosts(
  userId: string,
  onNext: (postIds: string[]) => void
) {
  if (!userId) {
    onNext([]);
    return () => {};
  }
  const ref = collection(db, SAVED_POSTS_COLLECTION);
  const q = query(ref, where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const postIds = snapshot.docs.map((d) => d.data().postId as string).filter(Boolean);
      onNext(postIds);
    },
    (err) => {
      console.warn('Saved posts sync notice:', err);
    }
  );
}

export async function toggleSavePostInFirestore(userId: string, postId: string, isSaved: boolean) {
  if (!userId || !postId) return;
  const docId = `${userId}_${postId}`;
  const saveRef = doc(db, SAVED_POSTS_COLLECTION, docId);
  try {
    if (isSaved) {
      await setDoc(saveRef, {
        userId,
        postId,
        savedAt: new Date().toISOString(),
        createdAtMs: Date.now(),
      });
    } else {
      await deleteDoc(saveRef);
    }
  } catch (err) {
    console.warn('Toggle save post notice:', err);
  }
}

// ---------------- User Profiles Cloud Sync ----------------
const USERS_COLLECTION = 'users';

export async function syncUserProfileToFirestore(user: User) {
  if (!user || (!user.id && !user.userId)) return;
  const docId = user.userId || user.id;
  try {
    const userRef = doc(db, USERS_COLLECTION, docId);
    await setDoc(userRef, {
      ...user,
      updatedAtMs: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.warn('Sync user profile notice:', err);
  }
}

// ---------------- User Reviews Cloud Sync ----------------
const REVIEWS_COLLECTION = 'reviews';

export function subscribeToUserReviews(
  targetUserId: string,
  onNext: (reviews: ServiceReview[]) => void
) {
  const ref = collection(db, REVIEWS_COLLECTION);
  const q = query(ref, where('targetUserId', '==', targetUserId), limit(30));

  return onSnapshot(
    q,
    (snapshot) => {
      const reviews = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ServiceReview, 'id'>)
      }));
      onNext(reviews);
    },
    (err) => {
      console.warn('User reviews sync notice:', err);
    }
  );
}

export async function addReviewToFirestore(review: Omit<ServiceReview, 'id'> & { targetUserId: string }) {
  try {
    const ref = collection(db, REVIEWS_COLLECTION);
    await addDoc(ref, {
      ...review,
      createdAtMs: Date.now(),
      createdAt: review.createdAt || new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Add review notice:', err);
  }
}

// Full Backup of all Help Posts along with complete chat histories
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

// Restore Posts from Backup
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
      const postRef = doc(db, HELP_POSTS_COLLECTION, post.id);
      await setDoc(postRef, {
        ...post,
        createdAtMs: post.createdAtMs || Date.now(),
      }, { merge: true });

      restoredPostsCount++;
      restoredPostsList.push(post);

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

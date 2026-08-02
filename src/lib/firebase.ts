import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  doc,
  updateDoc,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { HelpPost, PostReply } from '../types';
import { initialHelpPosts } from '../data/initialData';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Authenticate anonymously for secure access
signInAnonymously(auth).catch((err) => {
  console.warn('Firebase anonymous auth warning:', err);
});

const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
export const db = getFirestore(app, databaseId);

const HELP_POSTS_COLLECTION = 'help_posts';

export function subscribeToHelpPosts(
  onNext: (posts: HelpPost[]) => void,
  onError?: (err: Error) => void
) {
  const postsRef = collection(db, HELP_POSTS_COLLECTION);
  const q = query(postsRef, orderBy('createdAtMs', 'desc'));

  return onSnapshot(
    q,
    async (snapshot) => {
      // If collection is empty, seed with initial sample posts
      if (snapshot.empty) {
        console.log('Firestore help_posts collection is empty, seeding initial data...');
        for (const post of initialHelpPosts) {
          try {
            await addDoc(postsRef, {
              ...post,
              createdAtMs: Date.now() - Math.floor(Math.random() * 10000000),
              createdAtServer: serverTimestamp(),
            });
          } catch (e) {
            console.error('Error seeding initial post:', e);
          }
        }
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
          repliesCount: data.repliesCount || (data.replies ? data.replies.length : 0),
          helpersCount: data.helpersCount || 1,
          replies: (data.replies as PostReply[]) || [],
          verifiedOtp: data.verifiedOtp ?? true,
          category: data.category || 'quick_services',
        };
      });
      onNext(posts);
    },
    (error) => {
      console.error('Firestore subscription error:', error);
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
    console.error('Error adding help post to Firestore:', error);
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
    console.error('Error adding reply to Firestore:', error);
  }
}

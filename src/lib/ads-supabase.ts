import { db } from './firebaseInit';
import { 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { initialHelpPosts } from '../data/initialData';

export interface AdItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  location?: string;
  district?: string;
  phone?: string;
  contactNumber?: string;
  price?: number | string;
  images?: string[];
  photoUrl?: string;
  createdAt?: string;
  status?: string;
  userName?: string;
  userNic?: string;
  authorId?: string;
}

/**
 * ID එක මගින් Firestore හි helpPosts හෝ posts collection එකෙන් දත්ත සොයා ගනී
 */
export async function findAdById(id: string): Promise<AdItem | null> {
  if (!id) return null;

  try {
    // 1. First search in 'helpPosts'
    let docRef = doc(db, 'helpPosts', id);
    let snap = await getDoc(docRef);

    // 2. Fallback search in 'posts'
    if (!snap.exists()) {
      docRef = doc(db, 'posts', id);
      snap = await getDoc(docRef);
    }

    if (snap.exists()) {
      const post = snap.data() as any;
      return {
        id: snap.id,
        title: post.title || 'තොරතුරක් නොමැත',
        description: post.description || '',
        category: post.category || 'general',
        location: post.location || post.locationName || '',
        district: post.district || '',
        phone: post.userPhone || post.phone || post.whatsapp || '',
        contactNumber: post.userPhone || post.phone || '',
        images: post.images || (post.image ? [post.image] : []),
        photoUrl: post.image || null,
        createdAt: post.createdAt || new Date().toISOString(),
        status: post.status || 'active',
        userName: post.userName || post.contactName || 'පරිශීලකයා',
        authorId: post.authorId || '',
      };
    }
  } catch (e) {
    console.error('Firestore findAdById error:', e);
  }

  // Fallback to local storage
  try {
    const localPosts: any[] = JSON.parse(localStorage.getItem('sahaya_help_posts') || '[]');
    const matched = localPosts.find((p) => p && String(p.id) === String(id));
    if (matched) {
      return {
        id: matched.id,
        title: matched.title,
        description: matched.description,
        category: matched.category,
        location: matched.location,
        district: matched.district,
        phone: matched.userPhone || matched.phone,
        contactNumber: matched.userPhone || matched.phone,
        images: matched.images || (matched.image ? [matched.image] : []),
        photoUrl: matched.image,
        createdAt: matched.createdAt,
        status: matched.status,
        userName: matched.userName,
      };
    }
  } catch (e) {}

  return null;
}

/**
 * Firestore හි ඇති සියලුම Posts / Help Notices සජීවීව (Live) ලබා ගනී
 */
export async function getAllAds(): Promise<AdItem[]> {
  try {
    const q = query(collection(db, 'helpPosts'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    if (!snap.empty) {
      return snap.docs.map((docSnap) => {
        const p = docSnap.data();
        return {
          id: docSnap.id,
          title: p.title || '',
          description: p.description || '',
          category: p.category || 'general',
          location: p.location || p.locationName || '',
          district: p.district || '',
          phone: p.userPhone || p.phone || p.whatsapp || '',
          contactNumber: p.userPhone || p.phone || '',
          images: p.images || (p.image ? [p.image] : []),
          photoUrl: p.image || null,
          createdAt: p.createdAt || new Date().toISOString(),
          status: p.status || 'active',
          userName: p.userName || p.contactName || 'පරිශීලකයා',
          authorId: p.authorId || '',
        };
      });
    }
  } catch (e) {
    console.error('Firestore getAllAds error:', e);
  }

  // Firestore එකෙන් දත්ත නොලැබුණහොත් LocalStorage භාවිතා වේ
  try {
    const localPosts: any[] = JSON.parse(localStorage.getItem('sahaya_help_posts') || '[]');
    if (localPosts.length > 0) {
      return localPosts.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        location: p.location,
        district: p.district,
        phone: p.userPhone || p.phone,
        contactNumber: p.userPhone || p.phone,
        images: p.images || (p.image ? [p.image] : []),
        photoUrl: p.image,
        createdAt: p.createdAt,
        status: p.status,
        userName: p.userName,
      }));
    }
  } catch (e) {}

  return (initialHelpPosts as any[]).map((p) => ({
    id: String(p.id),
    title: p.title,
    description: p.description,
    category: p.category,
    location: p.location,
    district: p.district,
    phone: p.userPhone,
    contactNumber: p.userPhone,
    images: p.image ? [p.image] : [],
    photoUrl: p.image,
    createdAt: p.createdAt,
    status: p.status,
    userName: p.userName,
  }));
}

/**
 * නව Post එකක් Firestore හි 'helpPosts' සහ 'posts' එකට සෘජුවම Save කරයි
 */
export async function createAd(adData: Partial<AdItem>): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const postPayload = {
      title: adData.title || '',
      description: adData.description || '',
      category: adData.category || 'general',
      locationName: adData.location || '',
      district: adData.district || '',
      phone: adData.phone || adData.contactNumber || '',
      whatsapp: adData.phone || '',
      image: adData.photoUrl || (adData.images && adData.images[0]) || '',
      images: adData.images || [],
      authorId: adData.authorId || 'anonymous',
      contactName: adData.userName || 'පරිශීලකයා',
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'helpPosts'), postPayload);

    // Sync to local cache
    try {
      const localPosts = JSON.parse(localStorage.getItem('sahaya_help_posts') || '[]');
      localPosts.unshift({ id: docRef.id, ...postPayload });
      localStorage.setItem('sahaya_help_posts', JSON.stringify(localPosts));
    } catch (e) {}

    return { success: true, id: docRef.id };
  } catch (err: any) {
    console.error('Error creating ad in Firestore:', err);
    return { success: false, error: err.message || 'Failed to create post.' };
  }
}

export default {
  findAdById,
  getAllAds,
  createAd,
};

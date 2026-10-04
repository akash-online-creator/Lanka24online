/**
 * Ads & Supabase/Database Interface Helper
 * Provides exports for searching, fetching, creating, and managing ads/posts.
 */

import { db } from './firebase';
import { doc, getDoc, getDocs, collection, query, orderBy } from 'firebase/firestore';
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
}

/**
 * Finds an ad or post by its unique ID.
 */
export async function findAdById(id: string): Promise<AdItem | null> {
  if (!id) return null;
  
  // 1. Try fetching from Firestore help posts / ads
  try {
    const docRef = doc(db, 'posts', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const post = snap.data() as any;
      return {
        id: snap.id,
        title: post.title || 'Untitled Post',
        description: post.description || '',
        category: post.category || 'other',
        location: post.location || '',
        district: post.district || '',
        phone: post.userPhone || post.phone || '',
        contactNumber: post.userPhone || post.phone || '',
        images: post.images || (post.image ? [post.image] : []),
        photoUrl: post.image || null,
        createdAt: post.createdAt || new Date().toISOString(),
        status: post.status || 'active',
        userName: post.userName || 'පරිශීලකයා',
      };
    }
  } catch (e) {
    console.warn('Firestore findAdById error:', e);
  }

  // 2. Try fetching from local storage posts
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

  // 3. Fallback to initial seed data
  const seedMatched = (initialHelpPosts as any[]).find((p) => p && String(p.id) === String(id));
  if (seedMatched) {
    return {
      id: seedMatched.id,
      title: seedMatched.title,
      description: seedMatched.description,
      category: seedMatched.category,
      location: seedMatched.location,
      district: seedMatched.district,
      phone: seedMatched.userPhone,
      contactNumber: seedMatched.userPhone,
      images: seedMatched.image ? [seedMatched.image] : [],
      photoUrl: seedMatched.image,
      createdAt: seedMatched.createdAt,
      status: seedMatched.status,
      userName: seedMatched.userName,
    };
  }

  return null;
}

/**
 * Returns all ads or posts.
 */
export async function getAllAds(): Promise<AdItem[]> {
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
    id: p.id,
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

export default {
  findAdById,
  getAllAds,
};

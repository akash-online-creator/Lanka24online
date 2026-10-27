/**
 * User & NIC Management Library Helper
 * Provides exports for user authentication, verification, blacklist checking, and IP logging.
 * 
 * FIXED VERSION: Resolved Silent Errors, ID Collisions, and Sync Issues.
 */

import { db, syncUserProfileToFirestore } from './firebase';
import { doc, getDoc, getDocs, collection, query, where, setDoc } from 'firebase/firestore';
import { isAuthorBlocked } from '../utils/blockedCredentialsManager';

export interface UserData {
  id?: string;
  userId?: string;
  nicNumber: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  role?: string;
  status?: string;
  password?: string;
  tempPassword?: string;
  ipHistory?: string[];
  lastIp?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getUserFromFirestore(userIdOrNic: string): Promise<any | null> {
  if (!userIdOrNic) return null;
  const res = await findUserByNic(userIdOrNic);
  if (res) return res;
  try {
    const docRef = doc(db, 'users', userIdOrNic);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
  } catch (e) {
    console.error('getUserFromFirestore error:', e);
  }
  return null;
}

/**
 * Checks whether a given NIC number already exists in Firestore.
 */
export async function nicExists(nic: string): Promise<boolean> {
  if (!nic) return false;
  const cleanNic = nic.trim().toUpperCase();
  try {
    const q = query(collection(db, 'users'), where('nicNumber', '==', cleanNic));
    const snap = await getDocs(q);
    if (!snap.empty) return true;
  } catch (e) {
    console.error('Firestore nicExists lookup failed:', e);
    // වැරදීමකින් හෝ අන්තර්ජාලය නැතිවී lookup එක අසාර්ථක වුවහොත්, අනුපිටපත් (Duplicate) 
    // සෑදීම වැළැක්වීමට මෙතැනදී කෙලින්ම Error එකක් ලබාදෙයි.
    throw new Error('දත්ත සමුදාය හා සම්බන්ධ වීමට නොහැක. කරුණාකර අන්තර්ජාල සම්බන්ධතාවය පරීක්ෂා කරන්න.');
  }
  return false;
}

/**
 * Saves or updates a user in the database with strict error handling.
 */
export async function saveUser(userData: UserData): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    if (!userData || !userData.nicNumber) {
      return { success: false, error: 'NIC number is required.' };
    }

    const cleanNic = userData.nicNumber.trim().toUpperCase();
    
    // FIX 1: Date.now() වෙනුවට Firebase මඟින්ම ලබාදෙන Unique ID (doc id) එකක් භාවිතා කිරීම. 
    // මේ නිසා ID ගැටෙන (Collisions) අවදානම 0% කි.
    const userId = userData.id || userData.userId || doc(collection(db, 'users')).id;
    
    const formattedUser = {
      ...userData,
      id: userId,
      userId: userId,
      nicNumber: cleanNic,
      updatedAt: new Date().toISOString(),
      createdAt: userData.createdAt || new Date().toISOString(),
    };

    // FIX 2: Firebase වෙත Sync වීම අනිවාර්ය කර ඇත.
    try {
      await syncUserProfileToFirestore(userId, formattedUser);
    } catch (e: any) {
      console.error('Firestore sync user error:', e);
      // Firebase වෙත save වීම අසාර්ථක වුවහොත් Silent Error එකක් නොදී පරිශීලකයාට දෝෂය පෙන්වයි.
      return { success: false, error: 'දත්ත ගබඩා කිරීම අසාර්ථකයි. අන්තර්ජාල සම්බන්ධතාවය පරීක්ෂා කර නැවත උත්සාහ කරන්න.' };
    }

    // Firebase වෙත සාර්ථකව Sync වූ පසුව පමණක් Local Cache එක Update කරයි.
    try {
      const localUsers = JSON.parse(localStorage.getItem('sahaya_users') || '[]');
      const filtered = localUsers.filter((u: any) => u && u.nicNumber && u.nicNumber.trim().toUpperCase() !== cleanNic);
      filtered.push(formattedUser);
      localStorage.setItem('sahaya_users', JSON.stringify(filtered));
    } catch (e) {
      console.warn('Local cache update failed:', e);
    }

    return { success: true, user: formattedUser };
  } catch (err: any) {
    console.error('Error saving user:', err);
    return { success: false, error: err.message || 'Failed to save user.' };
  }
}

/**
 * Checks if a given NIC, phone number, or IP is blacklisted.
 */
export async function isBlacklisted(identifier: string): Promise<boolean> {
  if (!identifier) return false;
  return isAuthorBlocked(identifier);
}

/**
 * Finds a user profile by NIC number.
 */
export async function findUserByNic(nic: string): Promise<UserData | null> {
  if (!nic) return null;
  const cleanNic = nic.trim().toUpperCase();
  try {
    const q = query(collection(db, 'users'), where('nicNumber', '==', cleanNic));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as UserData;
    }
  } catch (e) {
    console.error('Firestore findUserByNic error:', e);
    // අන්තර්ජාලය නොමැතිව දත්ත කියවීමේදී (Read only) පමණක් Local Cache එක පරීක්ෂා කිරීම ආරක්ෂිතයි.
    try {
      const localUsers = JSON.parse(localStorage.getItem('sahaya_users') || '[]');
      const matched = localUsers.find((u: any) => u && u.nicNumber && u.nicNumber.trim().toUpperCase() === cleanNic);
      return matched || null;
    } catch (err) {
      return null;
    }
  }
  return null;
}

/**
 * Fetches the user's public IP address safely.
 */
export async function fetchPublicIp(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return data.ip || '127.0.0.1';
    }
  } catch (e) {
    console.warn('Could not fetch public IP:', e);
  }
  return '127.0.0.1';
}

/**
 * Appends a newly recorded IP address to a user's login history.
 */
export async function appendIpHistory(userIdOrNic: string, ip: string): Promise<void> {
  if (!userIdOrNic || !ip) return;
  try {
    const user = await findUserByNic(userIdOrNic);
    if (user) {
      const history = Array.isArray(user.ipHistory) ? user.ipHistory : [];
      if (!history.includes(ip)) {
        const updatedHistory = [ip, ...history].slice(0, 10);
        await saveUser({
          ...user,
          ipHistory: updatedHistory,
          lastIp: ip,
        });
      }
    }
  } catch (e) {
    console.error('Failed to append IP history:', e);
  }
}

/**
 * Additional standard user helpers for compatibility.
 */
export async function getUserByNic(nic: string) {
  return findUserByNic(nic);
}

export async function checkNicExists(nic: string) {
  return nicExists(nic);
}

export default {
  nicExists,
  saveUser,
  isBlacklisted,
  findUserByNic,
  fetchPublicIp,
  appendIpHistory,
  getUserByNic,
  checkNicExists
};

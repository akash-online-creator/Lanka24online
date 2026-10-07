/**
 * User & NIC Management Library Helper
 * Provides exports for user authentication, verification, blacklist checking, and IP logging.
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
    console.warn('getUserFromFirestore error:', e);
  }
  return null;
}

/**
 * Checks whether a given NIC number already exists in Firestore or local storage.
 */
export async function nicExists(nic: string): Promise<boolean> {
  if (!nic) return false;
  const cleanNic = nic.trim().toUpperCase();
  try {
    const q = query(collection(db, 'users'), where('nicNumber', '==', cleanNic));
    const snap = await getDocs(q);
    if (!snap.empty) return true;
  } catch (e) {
    console.warn('Firestore nicExists lookup failed, checking local cache:', e);
  }

  try {
    const localUsers = JSON.parse(localStorage.getItem('sahaya_users') || '[]');
    return localUsers.some((u: any) => u && u.nicNumber && u.nicNumber.trim().toUpperCase() === cleanNic);
  } catch (e) {
    return false;
  }
}

/**
 * Saves or updates a user in the database.
 */
export async function saveUser(userData: UserData): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    if (!userData || !userData.nicNumber) {
      return { success: false, error: 'NIC number is required.' };
    }

    const cleanNic = userData.nicNumber.trim().toUpperCase();
    const userId = userData.id || userData.userId || `usr_${Date.now()}`;
    const formattedUser = {
      ...userData,
      id: userId,
      userId: userId,
      nicNumber: cleanNic,
      updatedAt: new Date().toISOString(),
      createdAt: userData.createdAt || new Date().toISOString(),
    };

    // Save to Firestore
    try {
      await syncUserProfileToFirestore(userId, formattedUser);
    } catch (e) {
      console.warn('Firestore sync user error:', e);
    }

    // Save to local cache
    try {
      const localUsers = JSON.parse(localStorage.getItem('sahaya_users') || '[]');
      const filtered = localUsers.filter((u: any) => u && u.nicNumber && u.nicNumber.trim().toUpperCase() !== cleanNic);
      filtered.push(formattedUser);
      localStorage.setItem('sahaya_users', JSON.stringify(filtered));
    } catch (e) {}

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
    console.warn('Firestore findUserByNic error:', e);
  }

  try {
    const localUsers = JSON.parse(localStorage.getItem('sahaya_users') || '[]');
    const matched = localUsers.find((u: any) => u && u.nicNumber && u.nicNumber.trim().toUpperCase() === cleanNic);
    return matched || null;
  } catch (e) {
    return null;
  }
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
    console.warn('Failed to append IP history:', e);
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

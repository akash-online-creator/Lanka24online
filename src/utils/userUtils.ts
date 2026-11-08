import { User } from '../types';
import { getAuthHeaders } from './apiConfig';

/**
 * Normalizes user identifiers (NIC, UserID, Phone, Numeric ID) for robust matching
 */
export function normalizeNIC(input: string | null | undefined): string {
  if (!input) return '';
  return String(input).trim().replace(/\s+/g, '').toUpperCase();
}

/**
 * Generates canonical and fallback Firebase Auth email identifiers for a given NIC/User ID
 */
export function getAuthEmail(nicOrIdentifier: string | null | undefined): string {
  const clean = normalizeNIC(nicOrIdentifier).toLowerCase();
  return `${clean}@app.com`;
}

export function getAuthEmailCandidates(nicOrIdentifier: string | null | undefined): string[] {
  const clean = normalizeNIC(nicOrIdentifier).toLowerCase();
  return [
    `${clean}@app.com`,
    `${clean}@sahaya.app`,
    `${clean}@sahayaseva.com`,
  ];
}

export function extractCleanUserKeys(user: Partial<User> | null | undefined): {
  id: string;
  nic: string;
  userId: string;
  numeric: string;
} {
  if (!user) return { id: '', nic: '', userId: '', numeric: '' };

  const id = String(user.id || '').trim();
  const nic = String(user.nicNumber || '').trim().toUpperCase();
  const userId = String(user.userId || '').trim().toUpperCase();

  let numeric = '';
  if (user.userNumericId) {
    numeric = String(user.userNumericId).replace(/[^0-9]/g, '');
  }
  if (!numeric && (nic || userId)) {
    const rawDigits = (nic || userId).replace(/[^0-9]/g, '');
    if (rawDigits.length >= 8) {
      numeric = rawDigits;
    }
  }

  return { id, nic, userId, numeric };
}

/**
 * Intelligently merges multiple user records belonging to the same individual
 */
export function mergeUserRecords(base: User, incoming: User): User {
  if (!base) return incoming;
  if (!incoming) return base;

  const baseTime = new Date(base.updatedAt || base.registeredAt || 0).getTime();
  const incTime = new Date(incoming.updatedAt || incoming.registeredAt || 0).getTime();
  const isIncomingNewer = incTime > baseTime;

  const merged: User = { ...base };

  // Prioritize non-empty fields
  for (const [key, val] of Object.entries(incoming)) {
    if (val !== undefined && val !== null && val !== '') {
      if (isIncomingNewer || (merged as any)[key] === undefined || (merged as any)[key] === null || (merged as any)[key] === '') {
        (merged as any)[key] = val;
      }
    }
  }

  // Password / Security flags: favor updated passwords and newer timestamp records
  if (isIncomingNewer) {
    if (incoming.isPasswordChanged || !incoming.isTemporaryPassword) {
      if (incoming.key && incoming.key !== incoming.tempPassword) {
        merged.key = incoming.key;
        merged.password = incoming.password || incoming.key;
        merged.securityCode = incoming.securityCode || incoming.key;
        merged.isPasswordChanged = true;
        merged.isTemporaryPassword = false;
        merged.tempCode = '';
        merged.tempPassword = '';
      }
    }
    merged.updatedAt = incoming.updatedAt;
    if (incoming.status && incoming.status !== 'pending') {
      merged.status = incoming.status;
    }
  } else {
    // Base is newer, preserve base's password settings
    if (base.key) {
      merged.key = base.key;
      merged.password = base.password || base.key;
      merged.securityCode = base.securityCode || base.key;
      merged.isPasswordChanged = base.isPasswordChanged ?? true;
      merged.isTemporaryPassword = base.isTemporaryPassword ?? false;
      if (merged.isPasswordChanged) {
        merged.tempCode = '';
        merged.tempPassword = '';
      }
    }
  }

  // Keep best name & photos
  if (incoming.name && (!base.name || incoming.name.length > base.name.length)) {
    merged.name = incoming.name;
  }
  if (incoming.photoUrl && !base.photoUrl) {
    merged.photoUrl = incoming.photoUrl;
  }
  if (incoming.nicFrontPhotoUrl && !base.nicFrontPhotoUrl) {
    merged.nicFrontPhotoUrl = incoming.nicFrontPhotoUrl;
  }
  if (incoming.idCardPhotoUrl && !base.idCardPhotoUrl) {
    merged.idCardPhotoUrl = incoming.idCardPhotoUrl;
  }

  // Retain consistent primary ID
  merged.id = base.id || incoming.id;
  merged.nicNumber = base.nicNumber || incoming.nicNumber;
  merged.userId = base.userId || incoming.userId;
  merged.userNumericId = base.userNumericId || incoming.userNumericId;

  return merged;
}

/**
 * Deduplicates an array of users by ID, NIC number, User ID, and Numeric ID.
 * Guarantees every user in the returned array is unique and has a distinct ID.
 */
export function deduplicateUsers(usersList: User[] | null | undefined): User[] {
  if (!usersList || !Array.isArray(usersList)) return [];

  const deduplicated: User[] = [];
  const seenIds = new Set<string>();
  const seenNics = new Set<string>();
  const seenUserIds = new Set<string>();
  const seenNumerics = new Set<string>();

  for (const user of usersList) {
    if (!user) continue;

    const { id, nic, userId, numeric } = extractCleanUserKeys(user);

    // Find if user already exists in deduplicated list
    let existingIndex = -1;

    for (let i = 0; i < deduplicated.length; i++) {
      const existing = deduplicated[i];
      const eKeys = extractCleanUserKeys(existing);

      const isMatch =
        (id && eKeys.id && id === eKeys.id) ||
        (nic && eKeys.nic && nic === eKeys.nic) ||
        (userId && eKeys.userId && userId === eKeys.userId) ||
        (numeric && eKeys.numeric && numeric.length >= 9 && numeric === eKeys.numeric);

      if (isMatch) {
        existingIndex = i;
        break;
      }
    }

    if (existingIndex >= 0) {
      // Merge with existing record
      deduplicated[existingIndex] = mergeUserRecords(deduplicated[existingIndex], user);
    } else {
      deduplicated.push({ ...user });
    }
  }

  // Final pass: ensure every item in the output array has a strictly unique id
  const finalUsers: User[] = [];
  const assignedIds = new Set<string>();

  for (let i = 0; i < deduplicated.length; i++) {
    const u = deduplicated[i];
    if (!u) continue;
    let uniqueId = String(u.id || u.nicNumber || u.userId || `usr_${i}`).trim();

    if (assignedIds.has(uniqueId)) {
      // Append deterministic disambiguator
      uniqueId = `${uniqueId}_${i}`;
    }

    assignedIds.add(uniqueId);
    finalUsers.push({
      ...u,
      id: uniqueId,
    });
  }

  return finalUsers;
}

/**
 * Generates a slow, salted cryptographic password hash.
 * Primary: Server-side Node.js crypto.scryptSync (scrypt_v1$<saltHex>$<hashHex>, N=16384, r=8, p=1).
 * Offline Fallback: WebCrypto PBKDF2-HMAC-SHA256 with 100,000 iterations & 16-byte CSPRNG salt (pbkdf2_v1$<saltHex>$<hashHex>).
 * Never uses fast unsalted/static-salted SHA-256 for new passwords and blocks Pass-the-Hash inputs.
 */
export async function hashUserPassword(rawPass: string): Promise<string> {
  const clean = (rawPass ? rawPass : '').trim();
  if (!clean) return '';
  if (
    clean.startsWith('scrypt_v1$') ||
    clean.startsWith('pbkdf2_v1$') ||
    clean.startsWith('sha256_v1$')
  ) {
    throw new Error('Invalid password format: pre-hashed strings are not accepted.');
  }

  // 1. Primary: Request cryptographic scrypt_v1$ hash from backend server
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/auth/hash-password', {
        method: 'POST',
        headers: getAuthHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'include',
        body: JSON.stringify({ password: clean }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.hash && String(data.hash).startsWith('scrypt_v1$')) {
          return String(data.hash);
        }
      }
    } catch {
      // Fall through to 100,000-iteration salted WebCrypto PBKDF2 when offline
    }
  }

  // 2. Offline Fallback: WebCrypto PBKDF2-HMAC-SHA256 (100,000 iterations + 16-byte CSPRNG random salt)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const saltBytes = new Uint8Array(16);
      window.crypto.getRandomValues(saltBytes);
      const saltHex = Array.from(saltBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const encoder = new TextEncoder();
      const baseKey = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(clean),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const derivedBits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations: 100000,
          hash: 'SHA-256',
        },
        baseKey,
        256
      );
      const hashHex = Array.from(new Uint8Array(derivedBits))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return `pbkdf2_v1$${saltHex}$${hashHex}`;
    } catch {}
  }

  throw new Error('Cryptographic password hashing unavailable in this environment.');
}

/**
 * Verifies a plaintext password on the client against stored pbkdf2_v1$ or legacy hashes
 * when server verification is pending or offline. (scrypt_v1$ is verified on the server via /api/auth/session).
 */
export async function verifyUserPasswordClient(rawPass: string, storedHash: string): Promise<boolean> {
  const cleanPass = (rawPass || '').trim();
  const cleanStored = (storedHash || '').trim();
  if (!cleanPass || !cleanStored) return false;
  if (
    cleanPass.startsWith('scrypt_v1$') ||
    cleanPass.startsWith('pbkdf2_v1$') ||
    cleanPass.startsWith('sha256_v1$')
  ) {
    return false;
  }

  // 1. scrypt_v1$ is verified by backend /api/auth/session
  if (cleanStored.startsWith('scrypt_v1$')) {
    return false;
  }

  // 2. pbkdf2_v1$<saltHex>$<hashHex> (100,000 iterations)
  if (cleanStored.startsWith('pbkdf2_v1$') && typeof window !== 'undefined' && window.crypto?.subtle) {
    const parts = cleanStored.split('$');
    if (parts.length !== 3) return false;
    const [, saltHex, expectedHex] = parts;
    try {
      const saltPairs = saltHex.match(/.{1,2}/g) || [];
      const saltBytes = new Uint8Array(saltPairs.map((byte) => parseInt(byte, 16)));
      const encoder = new TextEncoder();
      const baseKey = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(cleanPass),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const derivedBits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations: 100000,
          hash: 'SHA-256',
        },
        baseKey,
        256
      );
      const actualHex = Array.from(new Uint8Array(derivedBits))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return actualHex === expectedHex;
    } catch {
      return false;
    }
  }

  // 3. Legacy sha256_v1$ (only for migrating existing accounts to scrypt_v1$ upon login)
  if (cleanStored.startsWith('sha256_v1$') && typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const payload = 'sahaya_pass_salt_2026::' + cleanPass;
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
      const hex = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return cleanStored === `sha256_v1$${hex}`;
    } catch {
      return false;
    }
  }

  return cleanStored === cleanPass;
}



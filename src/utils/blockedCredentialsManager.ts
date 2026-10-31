import { BlockedCredential, User } from '../types';

/**
 * Normalizes Sri Lankan phone numbers for robust cross-format comparison:
 * Handles: +94771234567, 94771234567, 0771234567, 771234567 -> 771234567 (last 9 digits)
 */
export function normalizeSriLankanPhone(input: string | null | undefined): string {
  if (!input) return '';
  const digitsOnly = String(input).replace(/\D/g, '');
  if (digitsOnly.length >= 9) {
    return digitsOnly.slice(-9);
  }
  return digitsOnly;
}

/**
 * Robust cross-format Sri Lankan NIC matching:
 * - Direct string match (case-insensitive, whitespace-trimmed)
 * - Old 9-digit + V/X vs New 12-digit cross-format conversion match
 * - Raw digits match if length >= 9
 */
export function isNicMatched(nicA: string | null | undefined, nicB: string | null | undefined): boolean {
  if (!nicA || !nicB) return false;

  const cleanA = String(nicA).trim().toUpperCase().replace(/\s+/g, '');
  const cleanB = String(nicB).trim().toUpperCase().replace(/\s+/g, '');

  if (!cleanA || !cleanB) return false;

  // 1. Direct match
  if (cleanA === cleanB) return true;

  // 2. Cross-format match (9-digit Old vs 12-digit New)
  const isAOld = /^[0-9]{9}[VX]$/.test(cleanA);
  const isANew = /^[0-9]{12}$/.test(cleanA);
  const isBOld = /^[0-9]{9}[VX]$/.test(cleanB);
  const isBNew = /^[0-9]{12}$/.test(cleanB);

  if ((isAOld && isBNew) || (isANew && isBOld)) {
    const oldNic = isAOld ? cleanA : cleanB;
    const newNic = isANew ? cleanA : cleanB;

    const oldYear = 1900 + parseInt(oldNic.substring(0, 2), 10);
    const oldDay = parseInt(oldNic.substring(2, 5), 10);
    const oldSeq = oldNic.substring(5, 9);

    const newYear = parseInt(newNic.substring(0, 4), 10);
    const newDay = parseInt(newNic.substring(4, 7), 10);
    const newSeq = newNic.substring(7, 12);

    if (oldYear === newYear && oldDay === newDay) {
      if (newSeq.includes(oldSeq) || newSeq.endsWith(oldSeq)) {
        return true;
      }
    }
  }

  // 3. Raw digits equality (if >= 9 digits)
  const digitsA = cleanA.replace(/[^0-9]/g, '');
  const digitsB = cleanB.replace(/[^0-9]/g, '');
  if (digitsA.length >= 9 && digitsB.length >= 9 && digitsA === digitsB) {
    return true;
  }

  return false;
}

/**
 * Robust phone match comparison
 */
export function isPhoneMatched(phoneA: string | null | undefined, phoneB: string | null | undefined): boolean {
  if (!phoneA || !phoneB) return false;
  const normA = normalizeSriLankanPhone(phoneA);
  const normB = normalizeSriLankanPhone(phoneB);
  return Boolean(normA && normB && normA === normB);
}

/**
 * Retrieves blocked credentials from localStorage safely
 */
export function getBlockedCredentialsFromStorage(): BlockedCredential[] {
  try {
    const raw = localStorage.getItem('sahaya_blocked_credentials');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Primary Guard: Checks whether an NIC, Phone, UserID, or Email is BLOCKED by Admin.
 * Verifies against both the `blockedCredentials` registry AND users flagged with `status === 'blocked'`.
 */
export function checkIsCredentialBlocked(
  params: {
    nic?: string;
    phone?: string;
    userId?: string;
    email?: string;
  },
  cachedBlockedList?: BlockedCredential[],
  usersList?: User[]
): { isBlocked: boolean; reason?: string; field?: 'nic' | 'phone' | 'userId' | 'email' | 'account' } {
  const { nic, phone, userId, email } = params;

  // 1. Gather all blocked credential records
  const blockedCreds: BlockedCredential[] =
    cachedBlockedList && cachedBlockedList.length > 0
      ? cachedBlockedList
      : getBlockedCredentialsFromStorage();

  // 2. Gather users list if available from storage or passed
  let allUsers: User[] = usersList || [];
  if (allUsers.length === 0) {
    try {
      const rawUsers = localStorage.getItem('sahaya_users');
      if (rawUsers) {
        const parsed = JSON.parse(rawUsers);
        if (Array.isArray(parsed)) allUsers = parsed;
      }
    } catch {}
  }

  const blockedUsers = allUsers.filter((u) => u && (u.status === 'blocked' || (u as any).isBlocked === true));

  // --- CHECK 1: NIC NUMBER ---
  if (nic && nic.trim()) {
    const cleanNic = nic.trim();
    // Check in blocked credentials
    const credMatch = blockedCreds.find((b) => isNicMatched(b.nicNumber, cleanNic) || isNicMatched(b.userId, cleanNic));
    if (credMatch) {
      return {
        isBlocked: true,
        field: 'nic',
        reason: credMatch.reason || 'මෙම ජාතික හැඳුනුම්පත් අංකය (NIC) පරිපාලක (Admin) විසින් පද්ධතියෙන් අවහිර (Blocked) කර ඇත.',
      };
    }
    // Check in blocked users
    const userMatch = blockedUsers.find((u) =>
      isNicMatched(u.nic || u.nicNumber, cleanNic) || isNicMatched(u.userId, cleanNic) || u.id === cleanNic
    );
    if (userMatch) {
      return {
        isBlocked: true,
        field: 'nic',
        reason: (userMatch as any).blockedReason || 'මෙම ජාතික හැඳුනුම්පත් අංකයට (NIC) අදාළ ගිණුම පරිපාලක (Admin) විසින් පද්ධතියෙන් අවහිර (Blocked) කර ඇත.',
      };
    }
  }

  // --- CHECK 2: PHONE NUMBER ---
  if (phone && phone.trim()) {
    const cleanPhone = phone.trim();
    // Check in blocked credentials
    const credMatch = blockedCreds.find((b) => isPhoneMatched(b.phone, cleanPhone));
    if (credMatch) {
      return {
        isBlocked: true,
        field: 'phone',
        reason: credMatch.reason || 'මෙම දුරකථන අංකය පරිපාලක (Admin) විසින් පද්ධතියෙන් අවහිර (Blocked) කර ඇත.',
      };
    }
    // Check in blocked users
    const userMatch = blockedUsers.find((u) =>
      isPhoneMatched(u.whatsappPhone || u.phone, cleanPhone)
    );
    if (userMatch) {
      return {
        isBlocked: true,
        field: 'phone',
        reason: (userMatch as any).blockedReason || 'මෙම දුරකථන අංකයට අදාළ ගිණුම පරිපාලක (Admin) විසින් පද්ධතියෙන් අවහිර (Blocked) කර ඇත.',
      };
    }
  }

  // --- CHECK 3: USER ID ---
  if (userId && userId.trim()) {
    const cleanUid = userId.trim().toLowerCase();
    const credMatch = blockedCreds.find((b) => (b.userId && b.userId.toLowerCase() === cleanUid) || b.id === cleanUid);
    if (credMatch) {
      return {
        isBlocked: true,
        field: 'userId',
        reason: credMatch.reason || 'මෙම පරිශීලක හැඳුනුම්පත (User ID) පරිපාලක විසින් අවහිර කර ඇත.',
      };
    }
    const userMatch = blockedUsers.find((u) => (u.userId && u.userId.toLowerCase() === cleanUid) || (u.id && u.id.toLowerCase() === cleanUid));
    if (userMatch) {
      return {
        isBlocked: true,
        field: 'userId',
        reason: (userMatch as any).blockedReason || 'මෙම පරිශීලක ගිණුම පරිපාලක විසින් අවහිර කර ඇත.',
      };
    }
  }

  // --- CHECK 4: EMAIL ---
  if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    const credMatch = blockedCreds.find((b) => b.email && b.email.toLowerCase() === cleanEmail);
    if (credMatch) {
      return {
        isBlocked: true,
        field: 'email',
        reason: credMatch.reason || 'මෙම විද්‍යුත් තැපෑල පරිපාලක විසින් අවහිර කර ඇත.',
      };
    }
  }

  return { isBlocked: false };
}

/**
 * Checks whether a given user or post author is blocked or banned.
 */
export function isAuthorBlocked(
  author?: {
    userId?: string;
    userPhone?: string;
    userName?: string;
    email?: string;
    id?: string;
    nic?: string;
    nicNumber?: string;
  } | string | null,
  cachedBlockedList?: BlockedCredential[],
  usersList?: User[]
): boolean {
  if (!author) return false;

  if (typeof author === 'string') {
    const check = checkIsCredentialBlocked({ userId: author, nic: author }, cachedBlockedList, usersList);
    return check.isBlocked;
  }

  const check = checkIsCredentialBlocked({
    userId: author.userId || author.id,
    phone: author.userPhone,
    nic: author.nic || author.nicNumber,
    email: author.email,
  }, cachedBlockedList, usersList);

  return check.isBlocked;
}

/**
 * Adds a blocked credential to local storage
 */
export function addBlockedCredential(cred: BlockedCredential): void {
  try {
    const raw = localStorage.getItem('sahaya_blocked_credentials');
    const list: BlockedCredential[] = raw ? JSON.parse(raw) : [];
    const exists = list.some((b) =>
      (cred.userId && b.userId === cred.userId) ||
      (cred.phone && isPhoneMatched(b.phone, cred.phone)) ||
      (cred.nicNumber && isNicMatched(b.nicNumber, cred.nicNumber))
    );
    if (!exists) {
      list.push(cred);
      localStorage.setItem('sahaya_blocked_credentials', JSON.stringify(list));
    }
  } catch (e) {
    console.warn('addBlockedCredential local error:', e);
  }
}

/**
 * Removes a blocked credential from local storage
 */
export function removeBlockedCredential(targetIdOrKey: string): void {
  try {
    const raw = localStorage.getItem('sahaya_blocked_credentials');
    if (!raw) return;
    const list: BlockedCredential[] = JSON.parse(raw);
    const filtered = list.filter((b) =>
      b.id !== targetIdOrKey &&
      b.userId !== targetIdOrKey &&
      !isPhoneMatched(b.phone, targetIdOrKey) &&
      !isNicMatched(b.nicNumber, targetIdOrKey)
    );
    localStorage.setItem('sahaya_blocked_credentials', JSON.stringify(filtered));
  } catch (e) {
    console.warn('removeBlockedCredential local error:', e);
  }
}

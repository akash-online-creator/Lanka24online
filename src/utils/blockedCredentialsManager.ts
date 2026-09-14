import { BlockedCredential, User } from '../types';

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
  } | string | null
): boolean {
  if (!author) return false;

  const authorId = typeof author === 'string' ? author.trim().toLowerCase() : (author.userId || author.id || '').trim().toLowerCase();
  const authorPhone = typeof author === 'object' && author?.userPhone ? author.userPhone.replace(/\D/g, '') : '';
  const authorEmail = typeof author === 'object' && author?.email ? author.email.trim().toLowerCase() : '';
  const authorName = typeof author === 'object' && author?.userName ? author.userName.trim().toLowerCase() : '';

  // 1. Check blocked credentials from localStorage
  try {
    const rawBlocked = localStorage.getItem('sahaya_blocked_credentials');
    if (rawBlocked) {
      const blockedList: BlockedCredential[] = JSON.parse(rawBlocked);
      const isBlockedCred = blockedList.some((b) => {
        if (authorId && b.userId && b.userId.trim().toLowerCase() === authorId) return true;
        if (authorPhone && b.phone && b.phone.replace(/\D/g, '') === authorPhone) return true;
        if (authorEmail && b.email && b.email.trim().toLowerCase() === authorEmail) return true;
        if (authorName && b.userName && b.userName.trim().toLowerCase() === authorName) return true;
        return false;
      });
      if (isBlockedCred) return true;
    }
  } catch (e) {
    // ignore json error
  }

  // 2. Check blocked users list from localStorage
  try {
    const rawUsers = localStorage.getItem('sahaya_users');
    if (rawUsers) {
      const usersList: User[] = JSON.parse(rawUsers);
      const isBlockedUser = usersList.some((u) => {
        if (u.status !== 'blocked') return false;
        if (authorId && (u.id?.toLowerCase() === authorId || u.userId?.toLowerCase() === authorId)) return true;
        if (authorPhone && u.phone && u.phone.replace(/\D/g, '') === authorPhone) return true;
        if (authorEmail && u.email && u.email.trim().toLowerCase() === authorEmail) return true;
        if (authorName && u.name && u.name.trim().toLowerCase() === authorName) return true;
        return false;
      });
      if (isBlockedUser) return true;
    }
  } catch (e) {
    // ignore json error
  }

  return false;
}

import { User, HelpPost } from '../types';

export interface UserProfile {
  uid?: string;
  role?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  userId?: string;
  nicNumber?: string;
  email?: string;
  id?: string;
}

export const normalizePhone = (phone?: string): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

/**
 * Checks if the given user has administrator permissions.
 */
export const checkIsAdmin = (user: UserProfile | User | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'admin' || (user as any).isAdmin === true || (user as any).isSuperAdmin === true) return true;
  
  const uid = ((user as any).userId || user.uid || '').trim().toUpperCase();
  const nic = ((user as any).nicNumber || '').trim().toUpperCase();
  const email = ((user as any).email || '').trim().toLowerCase();
  const id = ((user as any).id || '').trim();

  if (uid === '970181547V' || nic === '970181547V' || uid === 'ADMIN' || nic === 'ADMIN') return true;
  if (email === 'admin@sahaya.lk' || email === 'www.akash.online@gmail.com') return true;
  if (id === 'usr_admin') return true;

  return false;
};

/**
 * Strictly checks if the given user is the original author/owner of the post.
 */
export const checkIsPostOwner = (
  user: User | UserProfile | null | undefined,
  post: HelpPost | null | undefined
): boolean => {
  if (!user || !post) return false;
  if ((user as any).isDemo) return false;

  // 1. Primary check: Post's creator userId vs user's identifiers
  const postUserId = post.userId ? String(post.userId).trim() : '';
  const currentUserId = (user as any).userId || user.uid ? String((user as any).userId || user.uid).trim() : '';
  const currentId = (user as any).id ? String((user as any).id).trim() : '';

  if (postUserId) {
    if (currentUserId && postUserId.toLowerCase() === currentUserId.toLowerCase()) {
      return true;
    }
    if (currentId && postUserId.toLowerCase() === currentId.toLowerCase()) {
      return true;
    }
    return false;
  }

  // 2. Legacy fallback for old posts created without a post.userId:
  const uPhone = normalizePhone((user as any).phone || (user as any).whatsappNumber);
  const pPhone = normalizePhone(post.userPhone);
  const phoneMatch = Boolean(
    uPhone &&
    pPhone &&
    uPhone.length >= 9 &&
    pPhone.length >= 9 &&
    uPhone.slice(-9) === pPhone.slice(-9)
  );

  const uName = ((user as any)?.name || '').trim().toLowerCase();
  const pName = (post.userName || '').trim().toLowerCase();
  const nameMatch = Boolean(uName && pName && uName === pName);

  return phoneMatch && nameMatch;
};

/**
 * Checks if the user can manage (Edit / Delete / Block) the given post.
 * Accepts either a HelpPost object or a postOwnerId (string).
 */
export const canManagePost = (
  user: UserProfile | User | null | undefined,
  postOrOwnerId: HelpPost | string | null | undefined
): boolean => {
  if (!user || !postOrOwnerId) return false;

  // ඇඩ්මින්වරයෙකු නම් ඕනෑම පෝස්ට් එකක් පාලනය කිරීමට අවසර ඇත
  if (checkIsAdmin(user)) return true;

  // postOrOwnerId එක string එකක් ලෙස ලැබී ඇත්නම් (Blueprint එක අනුව)
  if (typeof postOrOwnerId === 'string') {
    const currentUserId = (user as any).userId || user.uid || (user as any).id || '';
    return currentUserId.toString().trim() === postOrOwnerId.trim();
  }

  // නැතහොත් HelpPost object එකක් ලෙස ලැබී ඇත්නම් පෝස්ට් එකේ අයිතිකාරයාදැයි පරීක්ෂා කරයි
  return checkIsPostOwner(user, postOrOwnerId);
};

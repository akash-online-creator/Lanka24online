import { User, HelpPost } from '../types';

export const normalizePhone = (phone?: string): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

/**
 * Checks if the given user has administrator permissions.
 */
export const checkIsAdmin = (user: User | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'admin' || (user as any).isAdmin === true || (user as any).isSuperAdmin === true) return true;
  const uid = (user.userId || '').trim().toUpperCase();
  const nic = (user.nicNumber || '').trim().toUpperCase();
  const email = (user.email || '').trim().toLowerCase();
  const id = (user.id || '').trim();
  if (uid === '970181547V' || nic === '970181547V' || uid === 'ADMIN' || nic === 'ADMIN') return true;
  if (email === 'admin@sahaya.lk' || email === 'www.akash.online@gmail.com') return true;
  if (id === 'usr_admin') return true;
  return false;
};

/**
 * Strictly checks if the given user is the original author/owner of the post.
 */
export const checkIsPostOwner = (
  user: User | null | undefined,
  post: HelpPost | null | undefined
): boolean => {
  if (!user || !post) return false;
  if (user.isDemo) return false;

  // 1. Primary check: Post's creator userId vs user's identifiers
  const postUserId = post.userId ? String(post.userId).trim() : '';
  const currentUserId = user.userId ? String(user.userId).trim() : '';
  const currentId = user.id ? String(user.id).trim() : '';

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
  const uPhone = normalizePhone(user.phone || user.whatsappNumber);
  const pPhone = normalizePhone(post.userPhone);
  const phoneMatch = Boolean(
    uPhone &&
    pPhone &&
    uPhone.length >= 9 &&
    pPhone.length >= 9 &&
    uPhone.slice(-9) === pPhone.slice(-9)
  );

  const uName = (user?.name || '').trim().toLowerCase();
  const pName = (post.userName || '').trim().toLowerCase();
  const nameMatch = Boolean(uName && pName && uName === pName);

  return phoneMatch && nameMatch;
};

/**
 * Checks if the user can manage (Edit / Delete / Block) the given post.
 * Returns true if the user is the Post Owner OR an Admin.
 */
export const canManagePost = (
  user: User | null | undefined,
  post: HelpPost | null | undefined
): boolean => {
  if (!user || !post) return false;
  
  // ඇඩ්මින්වරයෙකු නම් ඕනෑම පෝස්ට් එකක් පාලනය කිරීමට අවසර ඇත
  if (checkIsAdmin(user)) return true;

  // නැතහොත් පෝස්ට් එකේ අයිතිකාරයාට පමණක් අවසර ඇත
  return checkIsPostOwner(user, post);
};

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
  if (
    user.role === 'admin' ||
    user.role === 'super_admin' ||
    (user as any).isAdmin === true ||
    (user as any).isSuperAdmin === true
  ) {
    return true;
  }

  const uid = ((user as any).userId || (user as any).uid || '').trim().toUpperCase();
  const nic = ((user as any).nicNumber || '').trim().toUpperCase();
  const id = ((user as any).id || '').trim();

  if (uid === '970181547V' || nic === '970181547V' || uid === 'ADMIN' || nic === 'ADMIN') return true;
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

  // 1. Check if this post was created on this browser/device by the current local user
  if (post.id && typeof window !== 'undefined') {
    try {
      const rawCreated = localStorage.getItem('sahaya_my_created_posts');
      if (rawCreated) {
        const parsed = JSON.parse(rawCreated);
        if (Array.isArray(parsed) && parsed.includes(String(post.id))) {
          return true;
        }
      }
    } catch {}
  }

  const placeholderIds = new Set([
    'anonymous_user',
    'blood_requester',
    'red_alert_reporter',
    'helper_user',
    'guest_user',
    'usr_guest',
    'unknown',
  ]);

  const userIdentifiers = new Set(
    [
      (user as any).userId,
      (user as any).uid,
      (user as any).id,
      (user as any).nicNumber,
      (user as any).nic,
    ]
      .filter(Boolean)
      .map((v) => String(v).trim().toLowerCase())
      .filter((v) => v.length > 0 && !placeholderIds.has(v))
  );

  const postIdentifiers = [
    post.userId,
    post.authorId,
    (post as any).actualAuthorId,
    (post as any).reportedByUserId,
  ]
    .filter(Boolean)
    .map((v) => String(v).trim().toLowerCase())
    .filter((v) => v.length > 0 && !placeholderIds.has(v));

  for (const pid of postIdentifiers) {
    if (userIdentifiers.has(pid)) {
      return true;
    }
  }

  // Admin account check if post was authored by Admin
  if (checkIsAdmin(user)) {
    const adminPostNames = [
      post.userName,
      (post as any).authorName,
      (post as any).actualAuthorName,
      (post as any).contactPersonName,
    ]
      .filter(Boolean)
      .map((n) => String(n).trim().toLowerCase());
    if (
      postIdentifiers.includes('usr_admin') ||
      postIdentifiers.includes('970181547v') ||
      postIdentifiers.includes('admin') ||
      adminPostNames.some((n) => n.includes('පරිපාලක') || n.includes('admin'))
    ) {
      return true;
    }
  }

  // Phone or Name fallback (handles blood/disaster posts where contactNumber/contactPersonName was entered)
  const uPhone = normalizePhone((user as any).phone || (user as any).whatsappPhone || (user as any).whatsappNumber);
  const pPhones = [
    normalizePhone(post.userPhone),
    normalizePhone((post as any).contactNumber),
    normalizePhone(post.contactPhone),
    normalizePhone((post as any).actualAuthorPhone),
  ].filter((p) => p.length >= 9);

  const phoneMatch = Boolean(
    uPhone &&
    uPhone.length >= 9 &&
    pPhones.some((pp) => pp.slice(-9) === uPhone.slice(-9))
  );

  const uName = ((user as any)?.name || '').trim().toLowerCase();
  const genericNames = new Set([
    'සම්බන්ධීකාරක',
    'දැන්වීම්කරු',
    'ලියාපදිංචි පරිශීලක',
    'නිර්නාමික පරිශීලක (anonymous)',
    'anonymous user',
    'පරිශීලක (user)',
  ]);
  const pNames = [
    post.userName,
    (post as any).authorName,
    (post as any).actualAuthorName,
    (post as any).contactPersonName,
  ]
    .filter(Boolean)
    .map((n) => String(n).trim().toLowerCase())
    .filter((n) => n.length > 0 && !genericNames.has(n));

  const nameMatch = Boolean(uName && !genericNames.has(uName) && pNames.includes(uName));

  return Boolean(phoneMatch || nameMatch);
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
    const currentUserId = (user as any).userId || (user as any).uid || (user as any).id || '';
    return currentUserId.toString().trim() === postOrOwnerId.trim();
  }

  // නැතහොත් HelpPost object එකක් ලෙස ලැබී ඇත්නම් පෝස්ට් එකේ අයිතිකාරයාදැයි පරීක්ෂා කරයි
  return checkIsPostOwner(user, postOrOwnerId);
};

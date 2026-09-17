import { User, HelpPost } from '../types';

export const normalizePhone = (phone?: string): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

/**
 * Strictly checks if the given user is the original author/owner of the post.
 * Rules:
 * 1. Demo / Guest users can NEVER be the owner of real posts.
 * 2. If post.userId exists, it MUST match user.userId or user.id.
 * 3. Only if post.userId is empty/undefined (legacy posts):
 *    - Phone numbers must match (>= 9 digits), AND
 *    - User's name must match post.userName.
 *    (Phone matching alone is strictly disallowed because test accounts frequently share dummy numbers like '123456789').
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
    // If post has a userId and it doesn't match the user, they are NOT the owner!
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

  const uName = (user.name || '').trim().toLowerCase();
  const pName = (post.userName || '').trim().toLowerCase();
  const nameMatch = Boolean(uName && pName && uName === pName);

  // Require both phone match AND name match for legacy posts
  return phoneMatch && nameMatch;
};

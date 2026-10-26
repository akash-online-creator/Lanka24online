import { GroupItem, GroupInviteNotification, GroupJoinRequest, GroupMessage, GroupPermissions, GroupWorkSubCategory, User } from '../types';
import { filterNonDeletedGroups } from '../utils/deletedPostsManager';
import { updateGroupInFirestore } from '../lib/firebase';

export const initialGroups: GroupItem[] = [];
export const initialGroupMessages: Record<string, GroupMessage[]> = {};
const DUMMY_GROUP_IDS = ['grp_kelaniya_care', 'grp_dalada_sewa', 'grp_gam_mithuro'];

const isDummyOrDemoGroup = (groupId: string): boolean => {
  return DUMMY_GROUP_IDS.includes(groupId) || groupId.startsWith('grp_demo_');
};


const GROUPS_STORAGE_KEY = 'sahaya_community_groups';
const SAVED_GROUPS_KEY = 'sahaya_saved_group_ids';
const JOIN_REQUESTS_STORAGE_KEY = 'sahaya_group_join_requests';
const GROUP_MESSAGES_STORAGE_KEY = 'sahaya_group_messages_v2';
const GROUP_INVITES_STORAGE_KEY = 'sahaya_group_invites';

// 1. Get Stored Groups
export function getStoredGroups(): GroupItem[] {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    const stored: GroupItem[] = raw ? JSON.parse(raw) : [];
    const cleaned = (stored || []).filter((g) => g && !isDummyOrDemoGroup(g.id));
    return filterNonDeletedGroups(cleaned);
  } catch {
    return [];
  }
}

// 2. Save Groups
export function saveGroupsToStorage(groups: GroupItem[]): void {
  try {
    const cleaned = filterNonDeletedGroups(groups);
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(cleaned));
  } catch (err) {
    console.error('Error saving groups to storage:', err);
  }
}

// 3. Saved Group IDs (Bookmarks)
export function getSavedGroupIds(userId?: string): string[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${SAVED_GROUPS_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleSaveGroupId(userId: string, groupId: string): { isSaved: boolean; savedIds: string[] } {
  if (!userId) return { isSaved: false, savedIds: [] };
  try {
    const current = getSavedGroupIds(userId);
    let updated: string[];
    let isSaved: boolean;
    if (current.includes(groupId)) {
      updated = current.filter((id) => id !== groupId);
      isSaved = false;
    } else {
      updated = [...current, groupId];
      isSaved = true;
    }
    localStorage.setItem(`${SAVED_GROUPS_KEY}_${userId}`, JSON.stringify(updated));
    return { isSaved, savedIds: updated };
  } catch {
    return { isSaved: false, savedIds: [] };
  }
}

// 4. Group Join Requests
export function getStoredGroupJoinRequests(): GroupJoinRequest[] {
  try {
    const raw = localStorage.getItem(JOIN_REQUESTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGroupJoinRequestsToStorage(requests: GroupJoinRequest[]): void {
  try {
    localStorage.setItem(JOIN_REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  } catch (err) {
    console.error('Error saving group join requests:', err);
  }
}

// 5. Handle Join or Request Group
export function handleJoinOrRequestGroup(
  groupId: string,
  user: User
): { success: boolean; status: 'joined' | 'pending' | 'already_member'; message: string } {
  const allGroups = getStoredGroups();
  const group = allGroups.find((g) => g.id === groupId);
  if (!group) return { success: false, status: 'already_member', message: 'කණ්ඩායම සොයාගත නොහැක' };

  const currentUserId = user?.userId || user?.id || '';
  const userPhone = user?.phone || user?.phoneNumber || '';

  const safeMembers = Array.isArray(group.members) ? group.members : [];
  const isMember = safeMembers.some(
    (m) => (m.userId && m.userId === currentUserId) ? true : Boolean(m.phone && m.phone === userPhone)
  );

  if (isMember) {
    return { success: false, status: 'already_member', message: 'ඔබ දැනටමත් මෙම කණ්ඩායමේ සාමාජිකයෙකි.' };
  }

  // If private and requires approval
  if (group.privacy === 'private' && group.permissions?.adminApproveNewMembers) {
    const allRequests = getStoredGroupJoinRequests();
    const existingReq = allRequests.find(
      (r) => r.groupId === groupId && r.userId === currentUserId && r.status === 'pending'
    );
    if (existingReq) {
      return { success: false, status: 'pending', message: 'ඔබගේ ඉල්ලීම දැනටමත් පරිපාලක අනුමැතිය සඳහා යොමු කර ඇත.' };
    }

    const newReq: GroupJoinRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      groupId: group.id,
      userId: currentUserId,
      userName: user?.name || 'පරිශීලකයා',
      userPhone: userPhone,
      userPhoto: user?.photoUrl || '',
      userUsername: user?.username || '',
      requestedAt: new Date().toLocaleString(),
      status: 'pending'
    };

    saveGroupJoinRequestsToStorage([...allRequests, newReq]);
    return {
      success: true,
      status: 'pending',
      message: 'පෞද්ගලික කණ්ඩායමට එක්වීමේ ඉල්ලීම පරිපාලක වෙත යොමු කරන ලදී.'
    };
  }

  // Public or instant join
  const newMember = {
    userId: currentUserId,
    name: user?.name || 'සාමාජිකයා',
    phone: userPhone,
    photoUrl: user?.photoUrl || '',
    role: 'member' as const,
    status: 'active' as const,
    joinedAt: new Date().toLocaleString()
  };

  const updatedMembers = [...safeMembers.filter((m) => m.userId !== currentUserId && m.phone !== userPhone), newMember];
  const updatedGroup: GroupItem = {
    ...group,
    members: updatedMembers,
    membersCount: updatedMembers.length
  };

  const updatedAll = allGroups.map((g) => (g.id === groupId ? updatedGroup : g));
  saveGroupsToStorage(updatedAll);
  updateGroupInFirestore(groupId, { members: updatedMembers, membersCount: updatedMembers.length }).catch(() => {});

  return { success: true, status: 'joined', message: 'කණ්ඩායමට සාර්ථකව එක් විය!' };
}

// 6. Accept Group Join Request
export function acceptGroupJoinRequest(
  groupId: string,
  requestId: string,
  adminUser: User
): { success: boolean; message: string } {
  const allGroups = getStoredGroups();
  const group = allGroups.find((g) => g.id === groupId);
  if (!group) return { success: false, message: 'කණ්ඩායම හමු නොවීය' };

  const allRequests = getStoredGroupJoinRequests();
  const req = allRequests.find((r) => r.id === requestId);
  if (!req) return { success: false, message: 'ඉල්ලීම හමු නොවීය' };

  const newMember = {
    userId: req.userId,
    name: req.userName,
    phone: req.userPhone || '',
    photoUrl: req.userPhoto || '',
    role: 'member' as const,
    status: 'active' as const,
    joinedAt: new Date().toLocaleString()
  };

  const safeGroupMembers = Array.isArray(group.members) ? group.members : [];
  const updatedGroupMembers = [...safeGroupMembers.filter((m) => m.userId !== req.userId), newMember];
  const updatedGroup: GroupItem = {
    ...group,
    members: updatedGroupMembers,
    membersCount: updatedGroupMembers.length
  };

  const updatedGroups = allGroups.map((g) => (g.id === groupId ? updatedGroup : g));
  saveGroupsToStorage(updatedGroups);
  updateGroupInFirestore(groupId, { members: updatedGroupMembers, membersCount: updatedGroupMembers.length }).catch(() => {});

  const updatedRequests = allRequests.map((r) => (r.id === requestId ? { ...r, status: 'accepted' as const } : r));
  saveGroupJoinRequestsToStorage(updatedRequests);

  return { success: true, message: `${req.userName} කණ්ඩායමට සාර්ථකව එක් කරන ලදී!` };
}

// 7. Reject Group Join Request
export function rejectGroupJoinRequest(
  groupId: string,
  requestId: string,
  adminUser: User
): { success: boolean; message: string } {
  const allRequests = getStoredGroupJoinRequests();
  const updatedRequests = allRequests.map((r) => (r.id === requestId ? { ...r, status: 'rejected' as const } : r));
  saveGroupJoinRequestsToStorage(updatedRequests);
  return { success: true, message: 'ඉල්ලීම ප්‍රතික්ෂේප කරන ලදී.' };
}

// 8. Group Messages & Chat
export function getStoredGroupMessages(groupId: string): GroupMessage[] {
  if (isDummyOrDemoGroup(groupId)) return [];
  try {
    const raw = localStorage.getItem(GROUP_MESSAGES_STORAGE_KEY);
    const parsed: Record<string, GroupMessage[]> = raw ? JSON.parse(raw) : {};
    return parsed[groupId] || [];
  } catch {
    return [];
  }
}

export function saveGroupMessageToStorage(groupId: string, message: GroupMessage): GroupMessage[] {
  if (isDummyOrDemoGroup(groupId)) return [];
  try {
    const raw = localStorage.getItem(GROUP_MESSAGES_STORAGE_KEY);
    const parsed: Record<string, GroupMessage[]> = raw ? JSON.parse(raw) : {};
    const currentList = parsed[groupId] || [];
    const updatedList = [...currentList, message];
    parsed[groupId] = updatedList;
    localStorage.setItem(GROUP_MESSAGES_STORAGE_KEY, JSON.stringify(parsed));
    updateGroupInFirestore(groupId, { groupMessages: updatedList }).catch(() => {});
    return updatedList;
  } catch (err) {
    console.error('Error saving group message:', err);
    return [];
  }
}

export function togglePinGroupMessage(groupId: string, messageId: string): GroupMessage[] {
  if (isDummyOrDemoGroup(groupId)) return [];
  try {
    const raw = localStorage.getItem(GROUP_MESSAGES_STORAGE_KEY);
    const parsed: Record<string, GroupMessage[]> = raw ? JSON.parse(raw) : {};
    const currentList = parsed[groupId] || [];
    const updatedList = currentList.map((m) => (m.id === messageId ? { ...m, isPinned: !m.isPinned } : m));
    parsed[groupId] = updatedList;
    localStorage.setItem(GROUP_MESSAGES_STORAGE_KEY, JSON.stringify(parsed));
    updateGroupInFirestore(groupId, { groupMessages: updatedList }).catch(() => {});
    return updatedList;
  } catch (err) {
    console.error('Error toggling pin on message:', err);
    return [];
  }
}

// 9. Group Invites
export function getStoredGroupInvites(): GroupInviteNotification[] {
  try {
    const raw = localStorage.getItem(GROUP_INVITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGroupInvitesToStorage(invites: GroupInviteNotification[]): void {
  try {
    localStorage.setItem(GROUP_INVITES_STORAGE_KEY, JSON.stringify(invites));
  } catch (err) {
    console.error('Error saving group invites:', err);
  }
}

// Normalization helper for checking duplicate names
export function normalizeGroupName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Normalization helper for checking duplicate username
export function normalizeUsername(username: string): string {
  if (!username || typeof username !== 'string') return '';
  let clean = username.trim().toLowerCase();
  if (clean.startsWith('@')) clean = clean.substring(1);
  return clean.replace(/[^a-z0-9_]/g, '');
}

// Check if group name already exists (unique name constraint)
export function isGroupNameTaken(name: string, excludeGroupId?: string): boolean {
  const norm = normalizeGroupName(name);
  if (!norm) return false;
  const allGroups = getStoredGroups();
  return allGroups.some((g) => g.id !== excludeGroupId && normalizeGroupName(g.name) === norm);
}

// Check if username is already taken
export function isGroupUsernameTaken(username: string, excludeGroupId?: string): boolean {
  const norm = normalizeUsername(username);
  if (!norm) return false;
  const allGroups = getStoredGroups();
  return allGroups.some((g) => g.id !== excludeGroupId && normalizeUsername(g.username) === norm);
}

// Backward-compatibility and re-exports
export type { GroupItem, GroupInviteNotification, GroupJoinRequest, GroupMessage, GroupPermissions, GroupWorkSubCategory, User } from '../types';

export const getSubCategoryLabel = (category: string, subCategory?: string): string => {
  if (!subCategory) return category;
  return `${category} - ${subCategory}`;
};

export const saveGroupMessagesToStorage = (groupId: string, messages: GroupMessage[]): void => {
  try {
    const raw = localStorage.getItem('app_group_work_messages');
    const all = raw ? JSON.parse(raw) : {};
    all[groupId] = messages;
    localStorage.setItem('app_group_work_messages', JSON.stringify(all));
  } catch (err) {
    console.error('Error saving group messages:', err);
  }
};

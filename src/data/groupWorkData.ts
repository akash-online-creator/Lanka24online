import { GroupItem, GroupMessage, GroupJoinRequest, GroupMember } from '../types/groupWork';

const STORAGE_KEY_GROUPS = 'app_group_work_groups';

const STORAGE_KEY_MESSAGES = 'app_group_work_messages';

const DUMMY_GROUP_IDS = ['grp_kelaniya_care', 'grp_dalada_sewa', 'grp_gam_mithuro'];

export const initialGroups: GroupItem[] = [];

export const initialGroupMessages: Record<string, GroupMessage[]> = {};

const isDummyOrDemoGroup = (groupId: string): boolean => {

  return DUMMY_GROUP_IDS.includes(groupId) || groupId.startsWith('grp_demo_');
};
export const normalizeUsername = (username: string): string => {

  return username.trim().toLowerCase().replace(/^@+/, '');

};

export const getSubCategoryLabel = (category: string, subCategory: string): string => {

  if (!subCategory) return category;

  return `${category} - ${subCategory}`;

};

export const getStoredGroups = (): GroupItem[] => {

  try {

    const data = localStorage.getItem(STORAGE_KEY_GROUPS);

    if (!data) return [];

    

    const parsed: GroupItem[] = JSON.parse(data);

    const filtered = parsed.filter(group => !isDummyOrDemoGroup(group.id));

    

    if (filtered.length !== parsed.length) {

      localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(filtered));

    }

    

    return filtered;

  } catch (error) {

    console.error('Error reading groups from storage:', error);

    return [];

  }

};

export const saveGroupsToStorage = (groups: GroupItem[]): void => {

  try {

    const filtered = groups.filter(group => !isDummyOrDemoGroup(group.id));

    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(filtered));

  } catch (error) {

    console.error('Error saving groups to storage:', error);

  }

};

export const getStoredGroupMessages = (groupId: string): GroupMessage[] => {

  if (isDummyOrDemoGroup(groupId)) {

    return [];

  }

  try {

    const data = localStorage.getItem(STORAGE_KEY_MESSAGES);

    if (!data) return [];

    

    const allMessages: Record<string, GroupMessage[]> = JSON.parse(data);

    return allMessages[groupId] || [];

  } catch (error) {

    console.error(`Error reading messages for group ${groupId}:`, error);

    return [];

  }

};

export const saveGroupMessagesToStorage = (groupId: string, messages: GroupMessage[]): void => {

  if (isDummyOrDemoGroup(groupId)) {

    return;

  }

  try {

    const data = localStorage.getItem(STORAGE_KEY_MESSAGES);

    const allMessages: Record<string, GroupMessage[]> = data ? JSON.parse(data) : {};

    

    allMessages[groupId] = messages;

    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(allMessages));

  } catch (error) {

    console.error(`Error saving messages for group ${groupId}:`, error);

  }

};

export const isGroupNameTaken = (name: string, currentGroupId?: string): boolean => {

  const groups = getStoredGroups();

  const targetName = name.trim().toLowerCase();

  

  return groups.some(group => 

    group.id !== currentGroupId && group.name.trim().toLowerCase() === targetName

  );

};

export const isGroupUsernameTaken = (username: string, currentGroupId?: string): boolean => {

  const groups = getStoredGroups();

  const targetUsername = normalizeUsername(username);

  

  return groups.some(group => 

    group.id !== currentGroupId && normalizeUsername(group.username || '') === targetUsername

  );

};

export const generateInviteLink = (inviteCode: string): string => {

  const baseUrl = window.location.origin;

  return `${baseUrl}/groups/join?code=${encodeURIComponent(inviteCode)}`;

};

export const findGroupByInviteCode = (inviteCode: string): GroupItem | undefined => {

  const groups = getStoredGroups();

  const cleanCode = inviteCode.trim().toUpperCase();

  return groups.find(group => group.inviteCode?.toUpperCase() === cleanCode);

};

export const handleJoinOrRequestGroup = (

  groupId: string, 

  user: { id: string; name: string; avatar?: string }

): { success: boolean; status: 'joined' | 'requested' | 'already_member' | 'already_requested' | 'error'; message: string } => {

  const groups = getStoredGroups();

  const groupIndex = groups.findIndex(g => g.id === groupId);

  if (groupIndex === -1) {

    return { success: false, status: 'error', message: 'Group not found.' };

  }

  const group = groups[groupIndex];

  const isMember = group.members.some(m => m.id === user.id);

  if (isMember) {

    return { success: false, status: 'already_member', message: 'You are already a member of this group.' };

  }

  const existingRequest = group.pendingRequests?.some(r => r.userId === user.id);

  if (existingRequest) {

    return { success: false, status: 'already_requested', message: 'Your join request is pending approval.' };

  }

  if (group.isPrivate) {

    const newRequest: GroupJoinRequest = {

      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,

      userId: user.id,

      userName: user.name,

      userAvatar: user.avatar,

      requestedAt: new Date().toISOString(),

      status: 'pending'

    };

    const updatedGroup = {

      ...group,

      pendingRequests: [...(group.pendingRequests || []), newRequest]

    };

    groups[groupIndex] = updatedGroup;

    saveGroupsToStorage(groups);

    return { success: true, status: 'requested', message: 'Join request sent to group admins.' };

  } else {

    const newMember: GroupMember = {

      id: user.id,

      name: user.name,

      avatar: user.avatar,

      role: 'member',

      joinedAt: new Date().toISOString()

    };

    const updatedGroup = {

      ...group,

      members: [...group.members, newMember],

      memberCount: group.members.length + 1

    };

    groups[groupIndex] = updatedGroup;

    saveGroupsToStorage(groups);

    return { success: true, status: 'joined', message: 'Successfully joined the group!' };

  }

};

export const acceptGroupJoinRequest = (

  groupId: string, 

  requestId: string

): { success: boolean; message: string } => {

  const groups = getStoredGroups();

  const groupIndex = groups.findIndex(g => g.id === groupId);

  if (groupIndex === -1) {

    return { success: false, message: 'Group not found.' };

  }

  const group = groups[groupIndex];

  const request = group.pendingRequests?.find(r => r.id === requestId);

  if (!request) {

    return { success: false, message: 'Request not found.' };

  }

  const newMember: GroupMember = {

    id: request.userId,

    name: request.userName,

    avatar: request.userAvatar,

    role: 'member',

    joinedAt: new Date().toISOString()

  };

  const updatedGroup = {

    ...group,

    members: [...group.members, newMember],

    memberCount: group.members.length + 1,

    pendingRequests: group.pendingRequests?.filter(r => r.id !== requestId) || []

  };

  groups[groupIndex] = updatedGroup;

  saveGroupsToStorage(groups);

  return { success: true, message: 'User accepted into the group.' };

};

export const rejectGroupJoinRequest = (

  groupId: string, 

  requestId: string

): { success: boolean; message: string } => {

  const groups = getStoredGroups();

  const groupIndex = groups.findIndex(g => g.id === groupId);

  if (groupIndex === -1) {

    return { success: false, message: 'Group not found.' };

  }

  const group = groups[groupIndex];

  const updatedGroup = {

    ...group,

    pendingRequests: group.pendingRequests?.filter(r => r.id !== requestId) || []

  };

  groups[groupIndex] = updatedGroup;

  saveGroupsToStorage(groups);

  return { success: true, message: 'Join request rejected.' };

};

export function getSavedGroupIds(userId?: string): string[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`sahaya_saved_group_ids_${userId}`);
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
    localStorage.setItem(`sahaya_saved_group_ids_${userId}`, JSON.stringify(updated));
    return { isSaved, savedIds: updated };
  } catch {
    return { isSaved: false, savedIds: [] };
  }
}

export function getStoredGroupJoinRequests(): any[] {
  try {
    const raw = localStorage.getItem('app_group_work_join_requests');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGroupJoinRequestsToStorage(requests: any[]): void {
  try {
    localStorage.setItem('app_group_work_join_requests', JSON.stringify(requests));
  } catch (err) {
    console.error('Error saving group join requests:', err);
  }
}


import { GroupItem, GroupInviteNotification, GroupJoinRequest, GroupMessage, GroupPermissions, GroupWorkSubCategory, User } from '../types';

export const initialGroups: GroupItem[] = [
  {
    id: 'grp_kelaniya_care',
    name: 'කැලණිය ප්‍රජා සත්කාර බලකාය',
    username: '@kelaniya_care',
    subCategory: 'social_service',
    privacy: 'public',
    photoUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=400&q=80',
    description: 'කැලණිය සහ අවට ප්‍රදේශයේ ශ්‍රමදාන, රුක් රෝපණ සහ ආපදා සහන මෙහෙයුම් සඳහා එක්වූ තරුණ හා ප්‍රජා කණ්ඩායම.',
    locationName: 'කැලණිය, කොළඹ පාර',
    lat: 6.9553,
    lng: 79.9153,
    creatorId: '970181547V',
    creatorName: 'පරිපාලක (System Administrator)',
    creatorPhone: '0771234567',
    createdAt: '2026-08-20 10:30',
    createdAtMs: Date.now() - 7 * 24 * 60 * 60 * 1000,
    permissions: {
      editGroupSettings: false, // only admins
      sendNewMessages: true, // all members can send
      addOtherMembers: true,
      inviteViaLinkOrQr: true,
      adminApproveNewMembers: false,
      disappearingTimer: 'off'
    },
    members: [
      {
        userId: '970181547V',
        name: 'පරිපාලක (System Administrator)',
        phone: '0771234567',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        role: 'admin',
        status: 'active',
        joinedAt: '2026-08-20 10:30'
      },
      {
        userId: 'usr_kamal',
        name: 'කමල් පෙරේරා',
        phone: '0712233445',
        role: 'member',
        status: 'active',
        joinedAt: '2026-08-21 14:00'
      },
      {
        userId: 'usr_nimal',
        name: 'නිමල් රත්නායක',
        phone: '0789988776',
        role: 'member',
        status: 'active',
        joinedAt: '2026-08-22 09:15'
      }
    ],
    inviteCode: 'KELCARE99',
    isPinned: true
  },
  {
    id: 'grp_dalada_sewa',
    name: 'ශ්‍රී දළදා පුදබිම ශ්‍රමදාන සංසදය',
    username: '@dalada_sewa',
    subCategory: 'religious_activity',
    privacy: 'private',
    photoUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=400&q=80',
    description: 'මහනුවර ශ්‍රී දළදා මාළිගාව සහ අවට විහාරස්ථානවල ආගමික වතාවත්, මල් පූජා සහ පරිශ්‍ර පිරිසිදු කිරීමේ කටයුතු (පෞද්ගලික සාමාජික එකමුතුව).',
    locationName: 'මහනුවර, දළදා වීදිය',
    lat: 7.2906,
    lng: 80.6337,
    creatorId: '970181547V',
    creatorName: 'පරිපාලක (System Administrator)',
    creatorPhone: '0771234567',
    createdAt: '2026-08-22 08:00',
    createdAtMs: Date.now() - 5 * 24 * 60 * 60 * 1000,
    permissions: {
      editGroupSettings: false,
      sendNewMessages: true,
      addOtherMembers: true,
      inviteViaLinkOrQr: true,
      adminApproveNewMembers: true,
      disappearingTimer: 'off'
    },
    members: [
      {
        userId: '970181547V',
        name: 'පරිපාලක (System Administrator)',
        phone: '0771234567',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        role: 'admin',
        status: 'active',
        joinedAt: '2026-08-22 08:00'
      }
    ],
    inviteCode: 'DALADA77'
  },
  {
    id: 'grp_gam_mithuro',
    name: 'ගම්පහ තරුණ මිත්‍ර සංසදය',
    username: '@gampaha_mithuro',
    subCategory: 'friendly_meetup',
    privacy: 'public',
    photoUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=400&q=80',
    description: 'ගම්පහ සහ තදාසන්න ප්‍රදේශවල ක්‍රීඩා, කඳු නැගීම, සංචාර සහ සතිඅන්ත සුහද හමුවීම් සංවිධානය කරන මිතුරු එකමුතුව.',
    locationName: 'ගම්පහ, මිරිස්වත්ත',
    lat: 7.0917,
    lng: 79.9997,
    creatorId: 'usr_sunil',
    creatorName: 'සුනිල් ශාන්ත',
    creatorPhone: '0712345678',
    createdAt: '2026-08-25 15:45',
    createdAtMs: Date.now() - 2 * 24 * 60 * 60 * 1000,
    permissions: {
      editGroupSettings: false,
      sendNewMessages: true,
      addOtherMembers: true,
      inviteViaLinkOrQr: true,
      adminApproveNewMembers: false,
      disappearingTimer: 'off'
    },
    members: [
      {
        userId: 'usr_sunil',
        name: 'සුනිල් ශාන්ත',
        phone: '0712345678',
        role: 'admin',
        status: 'active',
        joinedAt: '2026-08-25 15:45'
      }
    ],
    inviteCode: 'GAMP770'
  }
];

export const initialGroupMessages: Record<string, GroupMessage[]> = {
  grp_kelaniya_care: [
    {
      id: 'msg_1',
      groupId: 'grp_kelaniya_care',
      senderId: '970181547V',
      senderName: 'පරිපාලක (System Administrator)',
      senderPhone: '0771234567',
      senderRole: 'admin',
      text: 'සාදරයෙන් පිළිගන්නවා සියලුම සාමාජිකයන්ව! 🌿 ලබන ඉරිදා උදෑසන 7:30ට කැලණිය රජමහා විහාරය අසල ශ්‍රමදාන ව්‍යාපාරයක් පැවැත්වේ.',
      timestamp: 'පෙ.ව. 10:35',
      createdAtMs: Date.now() - 3 * 24 * 60 * 60 * 1000,
      isPinned: true
    },
    {
      id: 'msg_2',
      groupId: 'grp_kelaniya_care',
      senderId: 'usr_kamal',
      senderName: 'කමල් පෙරේරා',
      senderPhone: '0712233445',
      senderRole: 'member',
      text: 'මම උපකරණ කිහිපයකුත් අරගෙන සහභාගි වෙන්නම් සහෝදරයා. 👍🤝',
      timestamp: 'පෙ.ව. 11:02',
      createdAtMs: Date.now() - 2 * 24 * 60 * 60 * 1000
    },
    {
      id: 'msg_loc_1',
      groupId: 'grp_kelaniya_care',
      senderId: '970181547V',
      senderName: 'පරිපාලක (System Administrator)',
      senderPhone: '0771234567',
      senderRole: 'admin',
      text: '📍 ශ්‍රමදානය සඳහා රැස්වන ස්ථානය පහත සිතියමෙන් බලන්න:',
      timestamp: 'පෙ.ව. 11:15',
      createdAtMs: Date.now() - 2 * 24 * 60 * 60 * 1000 + 5000,
      location: {
        name: 'කැලණිය රජමහා විහාරය ප්‍රධාන පිවිසුම අසල',
        address: 'විහාර මාවත, කැලණිය, බස්නාහිර පළාත',
        lat: 6.9553,
        lng: 79.9153,
        note: 'උදෑසන 7:30ට ප්‍රධාන ගේට්ටුව අසලට පැමිණෙන්න'
      }
    }
  ]
};

const GROUPS_STORAGE_KEY = 'sahaya_group_work_items';
const GROUP_MESSAGES_STORAGE_KEY = 'sahaya_group_messages_map';
const GROUP_INVITES_STORAGE_KEY = 'sahaya_group_invites_list';
const GROUP_JOIN_REQUESTS_STORAGE_KEY = 'sahaya_group_join_requests_list';
const SAVED_GROUPS_PREFIX = 'sahaya_saved_group_ids_';

export function getStoredGroups(): GroupItem[] {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(initialGroups));
      return initialGroups;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return initialGroups;
    
    // Ensure all groups have a privacy property (fallback to 'public')
    return parsed.map((g: GroupItem) => ({
      ...g,
      privacy: g.privacy || 'public'
    }));
  } catch {
    return initialGroups;
  }
}

export function saveGroupsToStorage(groups: GroupItem[]): void {
  try {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
  } catch (err) {
    console.error('Error saving groups to storage:', err);
  }
}

// Saved Groups Management
export function getSavedGroupIds(userId?: string): string[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${SAVED_GROUPS_PREFIX}${userId}`);
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
    localStorage.setItem(`${SAVED_GROUPS_PREFIX}${userId}`, JSON.stringify(updated));
    return { isSaved, savedIds: updated };
  } catch {
    return { isSaved: false, savedIds: [] };
  }
}

// Group Join Requests Management
export function getStoredGroupJoinRequests(): GroupJoinRequest[] {
  try {
    const raw = localStorage.getItem(GROUP_JOIN_REQUESTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGroupJoinRequestsToStorage(requests: GroupJoinRequest[]): void {
  try {
    localStorage.setItem(GROUP_JOIN_REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  } catch (err) {
    console.error('Error saving join requests:', err);
  }
}

// User joins public group or sends join request to private group
export function handleJoinOrRequestGroup(
  group: GroupItem, 
  user: User
): { 
  success: boolean; 
  status: 'active' | 'pending_approval' | 'already_member'; 
  message: string; 
  updatedGroup: GroupItem;
} {
  const currentUserId = user?.userId || user?.id || '';
  const userPhone = user?.phone || user?.whatsappNumber || '';
  
  const isAlreadyMember = group.members.some(
    (m) => (m.userId && m.userId === currentUserId) || (userPhone && m.phone === userPhone)
  );

  if (isAlreadyMember) {
    const mem = group.members.find((m) => (m.userId && m.userId === currentUserId) || (userPhone && m.phone === userPhone));
    if (mem?.status === 'active') {
      return {
        success: true,
        status: 'already_member',
        message: 'ඔබ දැනටමත් මෙම කණ්ඩායමේ සක්‍රීය සාමාජිකයෙකි.',
        updatedGroup: group
      };
    }
  }

  // PUBLIC GROUP: Immediate Active Join
  if (group.privacy === 'public') {
    const newMember = {
      userId: currentUserId,
      name: user?.name || 'සාමාජික',
      phone: userPhone,
      photoUrl: user?.photoUrl || '',
      role: 'member' as const,
      status: 'active' as const,
      joinedAt: new Date().toLocaleString()
    };

    const updatedGroup: GroupItem = {
      ...group,
      members: [...group.members.filter((m) => m.userId !== currentUserId && m.phone !== userPhone), newMember]
    };

    const allGroups = getStoredGroups();
    const newGroups = (allGroups || []).map((g) => (g && group && g.id === group.id ? updatedGroup : g));
    saveGroupsToStorage(newGroups);

    return {
      success: true,
      status: 'active',
      message: `🎉 ඔබ සාර්ථකව "${group.name}" ප්‍රසිද්ධ කණ්ඩායමට එකතු විය!`,
      updatedGroup
    };
  }

  // PRIVATE GROUP: Create Join Request for Admin
  const existingRequests = getStoredGroupJoinRequests();
  const alreadyRequested = existingRequests.some(
    (r) => r.groupId === group.id && (r.userId === currentUserId || (userPhone && r.userPhone === userPhone)) && r.status === 'pending'
  );

  if (alreadyRequested) {
    return {
      success: true,
      status: 'pending_approval',
      message: 'ඔබේ ඉල්ලුම්පත දැනටමත් පරිපාලක (Admin) වෙත යවා ඇත. කරුණාකර අනුමැතිය (Approval) ලැබෙන තෙක් රැඳී සිටින්න.',
      updatedGroup: group
    };
  }

  const newRequest: GroupJoinRequest = {
    id: `gjr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    groupId: group.id,
    groupName: group.name,
    groupUsername: group.username,
    groupPhotoUrl: group.photoUrl,
    groupSubCategory: group.subCategory,
    userId: currentUserId,
    userName: user?.name || 'පරිශීලක',
    userPhone: userPhone,
    userPhotoUrl: user?.photoUrl || '',
    requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    requestedAtMs: Date.now(),
    status: 'pending'
  };

  saveGroupJoinRequestsToStorage([newRequest, ...existingRequests]);

  // Also add member as pending_approval in group
  const pendingMember = {
    userId: currentUserId,
    name: user?.name || 'ඉල්ලුම්කරු',
    phone: userPhone,
    photoUrl: user?.photoUrl || '',
    role: 'member' as const,
    status: 'pending_approval' as const,
    joinedAt: new Date().toLocaleString()
  };

  const updatedGroup: GroupItem = {
    ...group,
    members: [...group.members.filter((m) => m.userId !== currentUserId && m.phone !== userPhone), pendingMember],
    joinRequests: [...(group.joinRequests || []), newRequest]
  };

  const allGroups = getStoredGroups();
  const newGroups = allGroups.map((g) => (g.id === group.id ? updatedGroup : g));
  saveGroupsToStorage(newGroups);

  return {
    success: true,
    status: 'pending_approval',
    message: `📩 "${group.name}" පෞද්ගලික කණ්ඩායමට ඇතුළත් වීමේ ඉල්ලුම්පත Admin වෙත යවන ලදී. Admin විසින් Accept කළ පසු ඔබට කණ්ඩායමට පිවිසිය හැක.`,
    updatedGroup
  };
}

// Admin Accepts Join Request
export function acceptGroupJoinRequest(
  groupId: string, 
  requestId: string, 
  adminUser: User
): { success: boolean; updatedGroup?: GroupItem } {
  try {
    const allGroups = getStoredGroups();
    const targetGroup = (allGroups || []).find((g) => g && g.id === groupId);
    if (!targetGroup) return { success: false };

    const allRequests = getStoredGroupJoinRequests();
    const req = (allRequests || []).find((r) => r && r.id === requestId);
    if (!req) return { success: false };

    // Update request status
    const updatedRequests = (allRequests || []).map((r) => {
      if (r && r.id === requestId) {
        return {
          ...r,
          status: 'accepted' as const,
          reviewedBy: adminUser?.name || 'Admin',
          reviewedAt: new Date().toLocaleString()
        };
      }
      return r;
    });
    saveGroupJoinRequestsToStorage(updatedRequests);

    // Update member status in group to 'active'
    let memberExisted = false;
    const updatedMembers = (targetGroup.members || []).map((m) => {
      if (m && (m.userId === req.userId || (req.userPhone && m.phone === req.userPhone))) {
        memberExisted = true;
        return {
          ...m,
          status: 'active' as const
        };
      }
      return m;
    });

    if (!memberExisted) {
      updatedMembers.push({
        userId: req.userId,
        name: req.userName,
        phone: req.userPhone,
        photoUrl: req.userPhotoUrl || '',
        role: 'member',
        status: 'active',
        joinedAt: new Date().toLocaleString()
      });
    }

    const updatedGroup: GroupItem = {
      ...targetGroup,
      members: updatedMembers,
      joinRequests: (targetGroup.joinRequests || []).filter((r) => r && r.id !== requestId)
    };

    const newGroups = (allGroups || []).map((g) => (g && g.id === groupId ? updatedGroup : g));
    saveGroupsToStorage(newGroups);

    return { success: true, updatedGroup };
  } catch (err) {
    console.error('Error accepting join request:', err);
    return { success: false };
  }
}

// Admin Rejects Join Request
export function rejectGroupJoinRequest(
  groupId: string, 
  requestId: string, 
  adminUser: User
): { success: boolean; updatedGroup?: GroupItem } {
  try {
    const allGroups = getStoredGroups();
    const targetGroup = (allGroups || []).find((g) => g && g.id === groupId);
    if (!targetGroup) return { success: false };

    const allRequests = getStoredGroupJoinRequests();
    const req = (allRequests || []).find((r) => r && r.id === requestId);
    if (!req) return { success: false };

    // Update request status
    const updatedRequests = (allRequests || []).map((r) => {
      if (r && r.id === requestId) {
        return {
          ...r,
          status: 'rejected' as const,
          reviewedBy: adminUser?.name || 'Admin',
          reviewedAt: new Date().toLocaleString()
        };
      }
      return r;
    });
    saveGroupJoinRequestsToStorage(updatedRequests);

    // Remove member or update to 'removed'
    const updatedMembers = (targetGroup.members || []).filter(
      (m) => !(m && (m.userId === req.userId || (req.userPhone && m.phone === req.userPhone)))
    );

    const updatedGroup: GroupItem = {
      ...targetGroup,
      members: updatedMembers,
      joinRequests: (targetGroup.joinRequests || []).filter((r) => r && r.id !== requestId)
    };

    const newGroups = (allGroups || []).map((g) => (g && g.id === groupId ? updatedGroup : g));
    saveGroupsToStorage(newGroups);

    return { success: true, updatedGroup };
  } catch (err) {
    console.error('Error rejecting join request:', err);
    return { success: false };
  }
}

export function getStoredGroupMessages(groupId: string): GroupMessage[] {
  try {
    const raw = localStorage.getItem(GROUP_MESSAGES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(GROUP_MESSAGES_STORAGE_KEY, JSON.stringify(initialGroupMessages));
      return initialGroupMessages[groupId] || [];
    }
    const parsed: Record<string, GroupMessage[]> = JSON.parse(raw);
    return parsed[groupId] || [];
  } catch {
    return initialGroupMessages[groupId] || [];
  }
}

export function saveGroupMessageToStorage(groupId: string, message: GroupMessage): GroupMessage[] {
  try {
    const raw = localStorage.getItem(GROUP_MESSAGES_STORAGE_KEY);
    const parsed: Record<string, GroupMessage[]> = raw ? JSON.parse(raw) : { ...initialGroupMessages };
    const currentList = parsed[groupId] || [];
    const updatedList = [...currentList, message];
    parsed[groupId] = updatedList;
    localStorage.setItem(GROUP_MESSAGES_STORAGE_KEY, JSON.stringify(parsed));
    return updatedList;
  } catch (err) {
    console.error('Error saving group message:', err);
    return [];
  }
}

export function togglePinGroupMessage(groupId: string, messageId: string): GroupMessage[] {
  try {
    const raw = localStorage.getItem(GROUP_MESSAGES_STORAGE_KEY);
    const parsed: Record<string, GroupMessage[]> = raw ? JSON.parse(raw) : { ...initialGroupMessages };
    const currentList = parsed[groupId] || [];
    const updatedList = currentList.map((m) => {
      if (m.id === messageId) {
        return { ...m, isPinned: !m.isPinned };
      }
      return m;
    });
    parsed[groupId] = updatedList;
    localStorage.setItem(GROUP_MESSAGES_STORAGE_KEY, JSON.stringify(parsed));
    return updatedList;
  } catch (err) {
    console.error('Error toggling pin:', err);
    return [];
  }
}

export function getStoredGroupInvites(): GroupInviteNotification[] {
  try {
    const raw = localStorage.getItem(GROUP_INVITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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

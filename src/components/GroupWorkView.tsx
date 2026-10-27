import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  MessageSquare, 
  QrCode, 
  Share2, 
  ShieldCheck, 
  MapPin, 
  Check, 
  Clock, 
  Sparkles, 
  ChevronRight,
  Filter,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Star,
  UserPlus,
  Lock,
  Globe,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { 
  GroupItem, 
  GroupWorkSubCategory, 
  Language, 
  User,
  GroupJoinRequest
} from '../types';
import { 
  getStoredGroups, 
  saveGroupsToStorage,
  getSavedGroupIds,
  toggleSaveGroupId,
  getStoredGroupJoinRequests,
  saveGroupJoinRequestsToStorage,
  handleJoinOrRequestGroup,
  acceptGroupJoinRequest,
  rejectGroupJoinRequest
} from '../data/groupWorkData';
import { checkIsAdmin } from '../utils/postOwnerHelper';
import { addDeletedGroupId } from '../utils/deletedPostsManager';
import { subscribeToGroups, addGroupToFirestore, updateGroupInFirestore, deleteGroupFromFirestore } from '../lib/firebase';
import { CreateGroupModal } from './CreateGroupModal';
import { GroupChatModal } from './GroupChatModal';
import { Trash2 } from 'lucide-react';

interface GroupWorkViewProps {
  currentUser: User;
  language: Language;
  registeredUsers?: User[];
  onBackToBoard?: () => void;
}

export const GroupWorkView: React.FC<GroupWorkViewProps> = ({
  currentUser,
  language,
  registeredUsers = [],
  onBackToBoard
}) => {
  const [groups, setGroups] = useState<GroupItem[]>(() => getStoredGroups());
  const [savedGroupIds, setSavedGroupIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all');
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'public' | 'private'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [activeChatGroup, setActiveChatGroup] = useState<GroupItem | null>(null);
  const [selectedGroupForQR, setSelectedGroupForQR] = useState<GroupItem | null>(null);
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);
  const [allJoinRequests, setAllJoinRequests] = useState<GroupJoinRequest[]>(() => getStoredGroupJoinRequests());
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const currentUserId = currentUser?.userId || currentUser?.id || '';

  const reloadData = () => {
    setGroups(getStoredGroups());
    if (currentUserId) {
      setSavedGroupIds(getSavedGroupIds(currentUserId));
    }
    setAllJoinRequests(getStoredGroupJoinRequests());
  };

  useEffect(() => {
    reloadData();
    const unsub = subscribeToGroups((remoteGroups) => {
      const localList = getStoredGroups();
      const map = new Map();
      (localList ? localList : []).forEach((g) => {
        if (g && g.id) map.set(g.id, g);
      });
      const remoteRequestsMap = new Map<string, GroupJoinRequest>();
      (getStoredGroupJoinRequests() || []).forEach((r) => {
        if (r && r.id) remoteRequestsMap.set(r.id, r);
      });

      (remoteGroups ? remoteGroups : []).forEach((g: any) => {
        if (g && g.id) {
          const normalized = Object.assign({}, g, {
            isPrivate: Boolean(g.isPrivate ? true : g.privacy === 'private'),
            privacy: g.privacy ? g.privacy : (g.isPrivate ? 'private' : 'public'),
            members: Array.isArray(g.members) ? g.members : []
          });
          map.set(g.id, normalized);
          if (Array.isArray(g.groupMessages)) {
            try {
              const rawMsgs = localStorage.getItem('sahaya_group_messages_v2');
              const parsedMsgs = rawMsgs ? JSON.parse(rawMsgs) : {};
              parsedMsgs[g.id] = g.groupMessages;
              localStorage.setItem('sahaya_group_messages_v2', JSON.stringify(parsedMsgs));
            } catch {}
          }
          if (Array.isArray(g.joinRequests)) {
            g.joinRequests.forEach((req: GroupJoinRequest) => {
              if (req && req.id) remoteRequestsMap.set(req.id, req);
            });
          }
        }
      });
      const mergedRequests = Array.from(remoteRequestsMap.values());
      saveGroupJoinRequestsToStorage(mergedRequests);
      setAllJoinRequests(mergedRequests);

      const merged = Array.from(map.values()).sort(
        (a: any, b: any) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
      );
      setGroups(merged);
      saveGroupsToStorage(merged);
      setActiveChatGroup((prev) => {
        if (!prev) return null;
        const updated = map.get(prev.id);
        return updated ? updated : prev;
      });
    });
    return () => unsub();
  }, [currentUserId]);

  const showToast = (text: string, type: string = 'success') => {
    setToastMessage({ text, type: (type as any) });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const getLangText = (si: string, en: string, ta: string) => {
    if (language === 'si') return si;
    if (language === 'ta') return ta;
    return en;
  };

  const handleGroupCreated = (newGroup: GroupItem) => {
    const creatorId = currentUserId ? currentUserId : 'usr_creator';
    const creatorPhone = currentUser?.whatsappPhone ? currentUser.whatsappPhone : currentUser?.phone ? currentUser.phone : '';
    const enrichedGroup: any = Object.assign({}, newGroup, {
      isPrivate: Boolean(newGroup.isPrivate ? true : newGroup.privacy === 'private'),
      privacy: newGroup.privacy ? newGroup.privacy : (newGroup.isPrivate ? 'private' : 'public'),
      creatorId: newGroup.creatorId ? newGroup.creatorId : creatorId,
      createdAtMs: (newGroup as any).createdAtMs ? (newGroup as any).createdAtMs : Date.now(),
      members: Array.isArray(newGroup.members) && newGroup.members.length > 0 ? newGroup.members : [
        {
          id: creatorId,
          userId: creatorId,
          name: currentUser?.name ? currentUser.name : 'නිර්මාතෘ',
          phone: creatorPhone,
          photoUrl: currentUser?.photoUrl ? currentUser.photoUrl : '',
          role: 'admin',
          status: 'active',
          joinedAt: new Date().toLocaleString()
        }
      ],
      permissions: newGroup.permissions ? newGroup.permissions : {
        sendNewMessages: true,
        adminApproveNewMembers: Boolean(newGroup.isPrivate ? true : newGroup.privacy === 'private')
      }
    });
    const updated = [enrichedGroup, ...groups.filter((g) => g && g.id !== enrichedGroup.id)];
    setGroups(updated);
    saveGroupsToStorage(updated);
    addGroupToFirestore(enrichedGroup).catch((err) => {
      console.warn('Firestore add group notice:', err);
    });
    setIsCreateModalOpen(false);
    showToast(
      getLangText(
        'නව කණ්ඩායම සාර්ථකව නිර්මාණය කරන ලදී!',
        'Group created successfully!',
        'குழு வெற்றிகரமாக உருவாக்கப்பட்டது!'
      ),
      'success'
    );
  };

  const handleUpdateGroup = (updatedGroup: GroupItem) => {
    const updated = groups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g));
    setGroups(updated);
    saveGroupsToStorage(updated);
    updateGroupInFirestore(updatedGroup.id, updatedGroup).catch(() => {});
    if (activeChatGroup && activeChatGroup.id === updatedGroup.id) {
      setActiveChatGroup(updatedGroup);
    }
  };

  const handleToggleSave = (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUserId) {
      showToast(
        getLangText(
          'කරුණාකර පළමුව ලොග් වන්න',
          'Please log in first',
          'தயவுசெய்து முதலில் உள்நுழையவும்'
        ),
        'warning'
      );
      return;
    }
    const result = toggleSaveGroupId(currentUserId, groupId);
    setSavedGroupIds(result.savedIds);
    showToast(
      result.isSaved
        ? getLangText('සුරැකි ලැයිස්තුවට එක් කරන ලදී', 'Saved to your list', 'சேமிக்கப்பட்டது')
        : getLangText('සුරැකි ලැයිස්තුවෙන් ඉවත් කරන ලදී', 'Removed from saved', 'நீக்கப்பட்டது'),
      'info'
    );
  };

  const handleJoinClick = (group: GroupItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) {
      showToast(
        getLangText(
          'කරුණාකර පළමුව ලොග් වන්න',
          'Please log in first',
          'தயவுசெய்து முதலில் உள்நுழையவும்'
        ),
        'warning'
      );
      return;
    }

    const result = handleJoinOrRequestGroup(group.id, {
      id: currentUserId,
      name: currentUser.name || 'User',
      avatar: currentUser.avatarUrl || currentUser.profileImage || ''
    });

    if (result.status === 'already_member') {
      setActiveChatGroup(group);
      return;
    }

    reloadData();
    showToast(result.message, result.success ? 'success' : 'info');
  };

  const handleAcceptRequest = (req: GroupJoinRequest) => {
    const res = acceptGroupJoinRequest(req.groupId, req.id, currentUser);
    reloadData();
    showToast(res.message, res.success ? 'success' : 'warning');
  };

  const handleRejectRequest = (req: GroupJoinRequest) => {
    const res = rejectGroupJoinRequest(req.groupId, req.id, currentUser);
    reloadData();
    showToast(res.message, res.success ? 'info' : 'warning');
  };

  const handleDeleteGroup = async (group: GroupItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmMsg = getLangText(
      `"${group.name}" කණ්ඩායම ස්ථිරවම මකා දැමීමට අවශ්‍යද?`,
      `Are you sure you want to permanently delete "${group.name}"?`,
      `"${group.name}" குழுவை நிரந்தரமாக நீக்க வேண்டுமா?`
    );
    if (!window.confirm(confirmMsg)) return;

    addDeletedGroupId(group.id);
    const updated = groups.filter((g) => g.id !== group.id);
    setGroups(updated);
    saveGroupsToStorage(updated);

    try {
      await deleteGroupFromFirestore(group.id);
    } catch (err) {
      console.warn('Group firestore delete notice:', err);
    }

    showToast(
      getLangText(
        'කණ්ඩායම ස්ථිරවම මකා දමන ලදී',
        'Group deleted successfully',
        'குழு வெற்றிகரமாக நீக்கப்பட்டது'
      ),
      'success'
    );
  };

  const handleCopyInviteLink = (group: GroupItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const link =
      group.inviteLink ||
      `https://supporservice.online/?join_group=${encodeURIComponent(
        group.username?.replace(/^@/, '') || group.id
      )}&code=${encodeURIComponent(group.inviteCode || '')}`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        setCopiedInviteId(group.id);
        setTimeout(() => setCopiedInviteId(null), 2500);
      });
    } else {
      setCopiedInviteId(group.id);
      setTimeout(() => setCopiedInviteId(null), 2500);
    }
  };

  const isUserAdmin = checkIsAdmin(currentUser);

  const adminGroups = (groups || []).filter(
    (g) =>
      g?.createdBy?.id === currentUserId ||
      g?.createdBy?.userId === currentUserId ||
      g?.creatorId === currentUserId ||
      isUserAdmin
  );
  const adminGroupIds = adminGroups.map((g) => g?.id).filter(Boolean);

  const pendingAdminRequests = (allJoinRequests || []).filter(
    (req) => adminGroupIds.includes(req.groupId) && req.status === 'pending'
  );

  const cleanSearch = searchQuery.trim().toLowerCase().replace(/^@/, '');

  const filteredGroups = (groups || []).filter((group) => {
    if (!group) return false;

    if (showSavedOnly) {
      if (!savedGroupIds.includes(group.id)) return false;
    }

    if (privacyFilter === 'public' && group.isPrivate) return false;
    if (privacyFilter === 'private' && !group.isPrivate) return false;

    if (activeCategory !== 'all') {
      if (group.category !== activeCategory) return false;
    }

    if (activeSubCategory !== 'all') {
      if (group.subCategory !== activeSubCategory) return false;
    }

    if (cleanSearch) {
      const matchName = group.name?.toLowerCase().includes(cleanSearch);
      const matchUsername = group.username?.toLowerCase().replace(/^@/, '').includes(cleanSearch);
      const matchDesc = group.description?.toLowerCase().includes(cleanSearch);
      const matchCategory = group.category?.toLowerCase().includes(cleanSearch);
      const matchSubCategory = group.subCategory?.toLowerCase().includes(cleanSearch);

      return matchName || matchUsername || matchDesc || matchCategory || matchSubCategory;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : toastMessage.type === 'warning'
              ? 'bg-amber-600 text-white border-amber-500'
              : 'bg-indigo-600 text-white border-indigo-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Sticky Banner */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {onBackToBoard && (
              <button
                onClick={onBackToBoard}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                title="ආපසු සහය පුවරුවට"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  {getLangText('කණ්ඩායම් වැඩ', 'Group Work', 'குழு வேலை')}
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                  {filteredGroups.length} Groups
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                {getLangText(
                  'ප්‍රජා සහයෝගිතා සහ ව්‍යාපෘති කණ්ඩායම්',
                  'Community collaboration & project groups',
                  'සමූහ සහයෝගිතා සහ ව්‍යාපෘති කණ්ඩායම්'
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{getLangText('කණ්ඩායමක් සාදන්න', 'Create Group', 'කුළු සහයෝගිතාවය')}</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Pending Requests for Admin Review */}
        {pendingAdminRequests.length > 0 && (
          <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 text-xs font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>
                  {getLangText(
                    `අනුමැතිය අපේක්ෂිත සාමාජික ඉල්ලීම් (${pendingAdminRequests.length})`,
                    `Pending Join Requests (${pendingAdminRequests.length})`,
                    `අනුමැතිය අපේක්ෂිත සාමාජික ඉල්ලීම් (${pendingAdminRequests.length})`
                  )}
                </span>
              </div>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                {getLangText('පෞද්ගලික කණ්ඩායම්', 'Private Groups', 'තනි පුද්ගල කණ්ඩායම්')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pendingAdminRequests.map((req) => {
                const reqGroup = (groups || []).find((g) => g?.id === req.groupId);
                return (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-amber-200/60 dark:border-amber-900/40 shadow-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {req.userAvatar ? (
                        <img
                          src={req.userAvatar}
                          alt={req.userName}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-zinc-300 shrink-0">
                          {req.userName?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                          {req.userName}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                          @{req.userUsername || 'user'} • {reqGroup?.name || 'Group'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        onClick={() => handleAcceptRequest(req)}
                        className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                        title="Accept"
                      >
                        {getLangText('එක් කරන්න', 'Add', 'එක් කරන්න')}
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req)}
                        className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 shadow-xs border border-slate-200 dark:border-zinc-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getLangText(
                'කණ්ඩායම් නම හෝ @username මඟින් සොයන්න...',
                'Search by group name or @username...',
                'කණ්ඩායම් නම හෝ @username මඟින් සොයන්න...'
              )}
              className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-lg text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPrivacyFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  privacyFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
              >
                {getLangText('සියල්ල', 'All', 'සියල්ල')}
              </button>
              <button
                onClick={() => setPrivacyFilter('public')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                  privacyFilter === 'public'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>{getLangText('ප්‍රසිද්ධ', 'Public', 'ප්‍රසිද්ධ')}</span>
              </button>
              <button
                onClick={() => setPrivacyFilter('private')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
                  privacyFilter === 'private'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>{getLangText('පෞද්ගලික', 'Private', 'පෞද්ගලික')}</span>
              </button>
            </div>

            <button
              onClick={() => setShowSavedOnly(!showSavedOnly)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                showSavedOnly
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700'
              }`}
            >
              <Star className="w-3.5 h-3.5" fill={showSavedOnly ? 'currentColor' : 'none'} />
              <span>
                {getLangText('සුරැකි කණ්ඩායම්', 'Saved Groups', 'සුරැකි කණ්ඩායම්')} (
                {savedGroupIds.length})
              </span>
            </button>
          </div>
        </div>

        {/* Group Cards Grid */}
        {filteredGroups.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                {getLangText(
                  'කණ්ඩායම් කිසිවක් හමු නොවීය',
                  'No groups found',
                  'කණ්ඩායම් කිසිවක් හමු නොවීය'
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                {getLangText(
                  'ඔබ සෙවූ නිර්ණායක වලට අදාළ කණ්ඩායම් නැත. අලුත් කණ්ඩායමක් සාදන්න!',
                  'No groups match your active filter. Create a new one!',
                  'ඔබ සෙවූ නිර්ණායක වලට අදාළ කණ්ඩායම් නැත. අලුත් කණ්ඩායමක් සාදන්න!'
                )}
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{getLangText('නව කණ්ඩායමක් සාදන්න', 'Create New Group', 'නව කණ්ඩායමක් සාදන්න')}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredGroups.map((group) => {
              const isMember = (group.members || []).some(
                (m) => m?.id === currentUserId || m?.userId === currentUserId
              );
              const isCreator =
                group?.createdBy?.id === currentUserId ||
                group?.createdBy?.userId === currentUserId ||
                group?.creatorId === currentUserId;
              const isSaved = savedGroupIds.includes(group.id);
              const hasPendingRequest = (group.pendingRequests || []).some(
                (r) => r?.userId === currentUserId
              );

              return (
                <div
                  key={group.id}
                  onClick={() => {
                    if (isMember || isCreator || isUserAdmin) {
                      setActiveChatGroup(group);
                    }
                  }}
                  className={`group bg-white dark:bg-zinc-900 border rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 ${
                    isMember || isCreator || isUserAdmin
                      ? 'cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600'
                      : 'hover:border-slate-300 dark:hover:border-zinc-700'
                  } ${
                    group.isPrivate
                      ? 'border-slate-200 dark:border-zinc-800'
                      : 'border-slate-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {group.avatarUrl ? (
                          <img
                            src={group.avatarUrl}
                            alt={group.name}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-zinc-800"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                            {group.name?.charAt(0) || 'G'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {group.name}
                            </h4>
                            {group.isVerified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 truncate">
                            {group.username || `@group_${group.id.slice(-4)}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => handleToggleSave(group.id, e)}
                          className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors ${
                            isSaved
                              ? 'text-amber-500'
                              : 'text-slate-400 hover:text-amber-500 dark:text-zinc-500'
                          }`}
                          title="Save Group"
                        >
                          <Star className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                        </button>

                        {(isCreator || isUserAdmin) && (
                          <button
                            onClick={(e) => handleDeleteGroup(group, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Delete Group"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {group.description && (
                      <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {group.description}
                      </p>
                    )}

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          group.isPrivate
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        {group.isPrivate ? (
                          <>
                            <Lock className="w-2.5 h-2.5" />
                            <span>{getLangText('පෞද්ගලික', 'Private', 'පෞද්ගලික')}</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-2.5 h-2.5" />
                            <span>{getLangText('ප්‍රසිද්ධ', 'Public', 'ප්‍රසිද්ධ')}</span>
                          </>
                        )}
                      </span>

                      {group.category && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                          {group.category}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 ml-auto">
                        <Users className="w-3 h-3" />
                        <span>
                          {group.membersCount || group.members?.length || 1}{' '}
                          {getLangText('සාමාජිකයින්', 'members', 'සාමාජිකයින්')}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                    {group.isPrivate && (isMember || isCreator || isUserAdmin) && (
                      <button
                        onClick={(e) => handleCopyInviteLink(group, e)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline py-1 px-1.5"
                      >
                        {copiedInviteId === group.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5" />
                            <span>
                              {getLangText('ආරාධනා ලින්ක්', 'Invite Link', 'ආරාධනා ලින්ක්')}
                            </span>
                          </>
                        )}
                      </button>
                    )}

                    <div className="ml-auto flex items-center gap-1.5">
                      {isMember || isCreator || isUserAdmin ? (
                        <button
                          onClick={() => setActiveChatGroup(group)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>
                            {getLangText('චැට් එකට යන්න', 'Open Chat', 'චැට් එකට යන්න')}
                          </span>
                        </button>
                      ) : hasPendingRequest ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {getLangText(
                              'අනුමැතිය අපේක්ෂාවෙන්',
                              'Request Pending',
                              'අනුමැතිය අපේක්ෂාවෙන්'
                            )}
                          </span>
                        </span>
                      ) : (
                        <button
                          onClick={(e) => handleJoinClick(group, e)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors ${
                            group.isPrivate
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>
                            {group.isPrivate
                              ? getLangText('ඉල්ලීමක් යවන්න', 'Request Join', 'ඉල්ලීමක් යවන්න')
                              : getLangText('එක්වන්න', 'Join Group', 'එක්වන්න')}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={currentUser}
        onGroupCreated={handleGroupCreated}
      />

      {/* Group Chat Room Modal */}
      {activeChatGroup && (
        <GroupChatModal
          isOpen={Boolean(activeChatGroup)}
          onClose={() => setActiveChatGroup(null)}
          group={activeChatGroup}
          currentUser={currentUser}
          lang={language}
          registeredUsers={registeredUsers}
          onUpdateGroup={handleUpdateGroup}
        />
      )}
    </div>
  );
};

export default GroupWorkView;
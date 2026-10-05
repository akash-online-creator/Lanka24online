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
import { deleteGroupFromFirestore } from '../lib/firebase';
import { CreateGroupModal } from './CreateGroupModal';
import { GroupChatModal } from './GroupChatModal';
import { Trash2 } from 'lucide-react';

interface GroupWorkViewProps {
  currentUser: User;
  language: Language;
  registeredUsers?: User[];
  onBackToBoard?: () => void;
}

type FilterCategoryType = GroupWorkSubCategory | 'all' | 'public' | 'private' | 'saved';

export const GroupWorkView: React.FC<GroupWorkViewProps> = ({
  currentUser,
  language,
  registeredUsers = [],
  onBackToBoard
}) => {
  const [selectedCategory, setSelectedCategory] = useState<FilterCategoryType>('all');
  const [groups, setGroups] = useState<GroupItem[]>(() => getStoredGroups());
  const [searchQuery, setSearchQuery] = useState('');
  const currentUserId = currentUser?.userId || currentUser?.id || '';

  // Saved Groups State
  const [savedGroupIds, setSavedGroupIds] = useState<string[]>(() => 
    getSavedGroupIds(currentUserId)
  );

  // Admin Pending Join Requests
  const [allJoinRequests, setAllJoinRequests] = useState<GroupJoinRequest[]>(() => 
    getStoredGroupJoinRequests()
  );

  // Toast Notification Message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeChatGroup, setActiveChatGroup] = useState<GroupItem | null>(null);

  // Refresh data on mount and sync
  const reloadData = () => {
    setGroups(getStoredGroups());
    setSavedGroupIds(getSavedGroupIds(currentUserId));
    setAllJoinRequests(getStoredGroupJoinRequests());
  };

  useEffect(() => {
    reloadData();
  }, [currentUserId]);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const getLangText = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  const handleGroupCreated = (newGroup: GroupItem) => {
    const updated = [newGroup, ...groups];
    setGroups(updated);
    saveGroupsToStorage(updated);
    showToast(`🎉 "${newGroup.name}" කණ්ඩායම සාර්ථකව නිර්මාණය විය!`, 'success');
    // Auto-open chat for the newly created group
    setActiveChatGroup(newGroup);
  };

  const handleUpdateGroup = (updatedGroup: GroupItem) => {
    const updated = groups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g));
    setGroups(updated);
    saveGroupsToStorage(updated);
    reloadData();
  };

  // Toggle Save / Bookmark Group
  const handleToggleSave = (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const result = toggleSaveGroupId(currentUserId, groupId);
    setSavedGroupIds(result.savedIds);
    if (result.isSaved) {
      showToast('⭐ කණ්ඩායම ඔබගේ සුරැකි ලැයිස්තුවට (Saved List) එක්කරන ලදී.', 'success');
    } else {
      showToast('🗑️ කණ්ඩායම සුරැකි ලැයිස්තුවෙන් ඉවත් කරන ලදී.', 'info');
    }
  };

  // Handle Join or Request Group Action
  const handleJoinClick = (group: GroupItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const result = handleJoinOrRequestGroup(group, currentUser);
    reloadData();

    if (result.status === 'active' || result.status === 'already_member') {
      showToast(result.message, 'success');
      setActiveChatGroup(result.updatedGroup);
    } else if (result.status === 'pending_approval') {
      showToast(result.message, 'warning');
    }
  };

  // Admin Accepts Join Request
  const handleAcceptRequest = (req: GroupJoinRequest) => {
    const res = acceptGroupJoinRequest(req.groupId, req.id, currentUser);
    if (res.success) {
      showToast(`✅ ${req.userName} සාර්ථකව කණ්ඩායමේ සාමාජිකයෙකු ලෙස අනුමත කරන ලදී.`, 'success');
      reloadData();
    }
  };

  // Admin Rejects Join Request
  const handleRejectRequest = (req: GroupJoinRequest) => {
    const res = rejectGroupJoinRequest(req.groupId, req.id, currentUser);
    if (res.success) {
      showToast(`❌ ${req.userName} ගේ ඉල්ලීම ප්‍රතික්ෂේප කරන ලදී.`, 'info');
      reloadData();
    }
  };

  // Check if current user is an Admin of any groups that have pending requests
  const adminGroups = (groups || []).filter(
    (g) => g && (g.creatorId === currentUserId || (g.members || []).some((m) => m && m.userId === currentUserId && m.role === 'admin'))
  );
  const adminGroupIds = adminGroups.map((g) => g?.id).filter(Boolean);
  const pendingAdminRequests = (allJoinRequests || []).filter(
    (r) => r && adminGroupIds.includes(r.groupId) && r.status === 'pending'
  );

  // Search results calculation
  const cleanSearch = searchQuery.trim().toLowerCase().replace(/^@/, '');
  const searchMatchedGroups = cleanSearch
    ? groups.filter(
        (grp) =>
          (grp.username || '').toLowerCase().replace(/^@/, '').includes(cleanSearch) ||
          (grp.name || '').toLowerCase().includes(cleanSearch) ||
          (grp.description || '').toLowerCase().includes(cleanSearch)
      )
    : [];

  // Filter groups for main list
  const filteredGroups = (groups || []).filter((grp) => {
    if (!grp || !grp.id) return false;
    // Category filtering
    if (selectedCategory === 'social_service' && grp.subCategory !== 'social_service') return false;
    if (selectedCategory === 'religious_activity' && grp.subCategory !== 'religious_activity') return false;
    if (selectedCategory === 'friendly_meetup' && grp.subCategory !== 'friendly_meetup') return false;
    if (selectedCategory === 'public' && grp.privacy !== 'public') return false;
    if (selectedCategory === 'private' && grp.privacy !== 'private') return false;
    if (selectedCategory === 'saved' && !savedGroupIds.includes(grp.id)) return false;

    // Search query filtering
    if (cleanSearch) {
      return (
        (grp.username || '').toLowerCase().replace(/^@/, '').includes(cleanSearch) ||
        (grp.name || '').toLowerCase().includes(cleanSearch) ||
        (grp.description || '').toLowerCase().includes(cleanSearch)
      );
    }
    return true;
  });

  const getSubCategoryLabel = (sub: GroupWorkSubCategory) => {
    switch (sub) {
      case 'social_service':
        return { label: '🤝 සමාජ සේවා', en: 'Social Services', color: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200 border-indigo-200' };
      case 'religious_activity':
        return { label: '🛕 ආගමික කටයුතු', en: 'Religious Activities', color: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-200' };
      case 'friendly_meetup':
        return { label: '☕ මිත්‍ර හමුව', en: 'Friendly Meetup', color: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-200' };
    }
  };

  const isSystemAdmin = checkIsAdmin(currentUser);

  const handleDeleteGroup = (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!groupId) return;
    if (!confirm('මෙම කණ්ඩායම පද්ධතියෙන් ස්ථිරවම ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්න ද?')) return;
    const updated = groups.filter((g) => g.id !== groupId);
    setGroups(updated);
    saveGroupsToStorage(updated);
    addDeletedGroupId(groupId);
    deleteGroupFromFirestore(groupId).catch((err) => {
      console.warn('Group delete from firestore notice:', err);
    });
    showToast('🗑️ කණ්ඩායම සාර්ථකව ඉවත් කරන ලදී.', 'info');
  };

  // Helper to check user's membership status in group
  const getUserGroupStatus = (group: GroupItem) => {
    const userPhone = currentUser?.phone || currentUser?.whatsappNumber || '';
    const mem = group.members.find(
      (m) => (m.userId && m.userId === currentUserId) || (userPhone && m.phone === userPhone)
    );
    const isCreator = group.creatorId === currentUserId;
    const isAdmin = isCreator || mem?.role === 'admin' || isSystemAdmin;
    const isActive = mem?.status === 'active';
    const isPending = mem?.status === 'pending_approval' || allJoinRequests.some(
      (r) => r.groupId === group.id && (r.userId === currentUserId || (userPhone && r.userPhone === userPhone)) && r.status === 'pending'
    );
    return { mem, isCreator, isAdmin, isActive, isPending };
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200 relative">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] px-4 py-3 rounded-2xl bg-zinc-900 text-white shadow-2xl border-2 border-indigo-500/80 flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-black">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : toastMessage.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
            )}
            <span className="leading-snug">{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-zinc-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 01. Top Sub-Navigation Header with 3 Buttons & Create Group Button */}
      <div className="bg-white dark:bg-zinc-900 border-2 border-indigo-500/80 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        
        {/* Top Title & "Create Group" Prominent Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {getLangText('කණ්ඩායම් වැඩ පුවරුව', 'Group Work Board', 'குழு வேலை பலகை')}
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                  {filteredGroups.length} Groups
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                {getLangText('සමාජ සේවා, ආගමික කටයුතු සහ මිත්‍ර හමුවීම් සඳහා එක්වන්න', 'Collaborate on social, religious, and friendly meetup groups', 'சமூக, மத மற்றும் நட்பு குழுக்களுடன் இணையுங்கள்')}
              </p>
            </div>
          </div>

          {/* 02. Prominent "කණ්ඩායමක් සාදන්න" Button (Visible on Top) */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 active:scale-95 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            <span>{getLangText('කණ්ඩායමක් සාදන්න', 'Create a Group', 'ஒரு குழுவை உருவாக்கு')}</span>
          </button>
        </div>

        {/* 01. The 3 Sub-Navigation Buttons (සමාජ සේවා | ආගමික කටයුතු | මිත්‍ර හමුව) + Filters */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
            <span>{getLangText('කාණ්ඩ තෝරන්න (Select Category):', 'Select Category & Filter:', 'வகை தேர்ந்தெடுக்கவும்:')}</span>
            {savedGroupIds.length > 0 && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                ⭐ {savedGroupIds.length} Saved
              </span>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* All Groups */}
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`p-3 rounded-2xl font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 border-2 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                  : 'bg-slate-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:border-indigo-300'
              }`}
            >
              <span>🌐</span>
              <span>{getLangText('සියලු කණ්ඩායම්', 'All Groups', 'அனைத்தும்')}</span>
            </button>

            {/* 1. සමාජ සේවා (Social Services) */}
            <button
              type="button"
              onClick={() => setSelectedCategory('social_service')}
              className={`p-3 rounded-2xl font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 border-2 cursor-pointer ${
                selectedCategory === 'social_service'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                  : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/60 text-indigo-950 dark:text-indigo-200 hover:border-indigo-400'
              }`}
            >
              <span className="text-base">🤝</span>
              <span>{getLangText('සමාජ සේවා', 'Social Services', 'சமூக சேவைகள்')}</span>
            </button>

            {/* 2. ආගමික කටයුතු (Religious Activities) */}
            <button
              type="button"
              onClick={() => setSelectedCategory('religious_activity')}
              className={`p-3 rounded-2xl font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 border-2 cursor-pointer ${
                selectedCategory === 'religious_activity'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-200 hover:border-amber-400'
              }`}
            >
              <span className="text-base">🛕</span>
              <span>{getLangText('ආගමික කටයුතු', 'Religious', 'மத நடவடிக்கைகள்')}</span>
            </button>

            {/* 3. මිත්‍ර හමුව (Friend Meetings) */}
            <button
              type="button"
              onClick={() => setSelectedCategory('friendly_meetup')}
              className={`p-3 rounded-2xl font-black text-xs transition-all duration-200 flex items-center justify-center gap-2 border-2 cursor-pointer ${
                selectedCategory === 'friendly_meetup'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200 hover:border-emerald-400'
              }`}
            >
              <span className="text-base">☕</span>
              <span>{getLangText('මිත්‍ර හමුව', 'Friendly Meetup', 'நட்பு சந்திப்பு')}</span>
            </button>
          </div>

          {/* Sub-Filters: Public / Private / Saved */}
          <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('public')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                selectedCategory === 'public'
                  ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>🌐 Public කණ්ඩායම්</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('private')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                selectedCategory === 'private'
                  ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>🔒 Private කණ්ඩායම්</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('saved')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                selectedCategory === 'saved'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              <Star className="w-3.5 h-3.5" fill={selectedCategory === 'saved' ? 'currentColor' : 'none'} />
              <span>⭐ සුරකින ලද ({savedGroupIds.length})</span>
            </button>
          </div>
        </div>

        {/* 09. Dedicated Search Bar with @username focus */}
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-indigo-500 dark:text-indigo-400 font-bold font-mono">
            <Search className="w-4 h-4 text-zinc-400" />
            <span className="text-xs bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-zinc-700">@</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={getLangText('කණ්ඩායමේ @username එක හෝ නම සදහන් කර සොයන්න (Search group by username)...', 'Search group by @username or name...', 'குழுவின் @username அல்லது பெயர் மூலம் தேடுங்கள்...')}
            className="w-full pl-16 pr-10 py-3 rounded-2xl border-2 border-indigo-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs sm:text-sm font-semibold outline-none focus:border-indigo-600 text-slate-900 dark:text-zinc-100 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 text-zinc-600 dark:text-zinc-300 flex items-center justify-center text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ADMIN NOTIFICATION BANNER: Pending Join Requests */}
      {pendingAdminRequests.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-500 rounded-3xl p-4 sm:p-5 shadow-md space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-amber-950 dark:text-amber-100 flex items-center gap-2">
                  <span>නව සාමාජික ඉල්ලීම් (Pending Join Requests)</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[11px] font-mono">
                    {pendingAdminRequests.length}
                  </span>
                </h4>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  ඔබ Admin වරයෙකු වන පෞද්ගලික කණ්ඩායම් සඳහා ලැබී ඇති සාමාජික ඉල්ලීම් අනුමත කරන්න:
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingAdminRequests.map((req, rIdx) => (
              <div
                key={`pending_req_${req.id || 'r'}_${rIdx}`}
                className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/60 flex flex-col justify-between space-y-2 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-amber-800 dark:text-amber-200 text-sm overflow-hidden shrink-0">
                      {req.userPhotoUrl ? (
                        <img 
                          src={req.userPhotoUrl} 
                          alt={req.userName || 'User'} 
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span>{(req.userName || 'U').charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-black text-xs text-slate-900 dark:text-zinc-100">{req.userName}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{req.userPhone || 'දුරකථන අංකය නැත'}</div>
                      <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        Group: {req.groupName}
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] text-zinc-400 font-mono">{req.requestedAt}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleAcceptRequest(req)}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>අනුමත කරන්න (Accept)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectRequest(req)}
                    className="py-2 px-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-100 hover:text-rose-700 text-zinc-600 dark:text-zinc-400 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    ප්‍රතික්ෂේප
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. DEDICATED SEARCH RESULTS UI (When user types a search query) */}
      {cleanSearch && (
        <div className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800 border-2 border-indigo-500 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔍</span>
              <h3 className="font-black text-sm sm:text-base text-indigo-950 dark:text-indigo-200">
                සෙවුම් ප්‍රතිඵලය (Search Result for "@{cleanSearch}")
              </h3>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-zinc-700">
              {searchMatchedGroups.length} Matches Found
            </span>
          </div>

          {searchMatchedGroups.length === 0 ? (
            <div className="bg-white/80 dark:bg-zinc-800/80 rounded-2xl p-6 text-center space-y-2 border border-indigo-100 dark:border-zinc-700">
              <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                "@{cleanSearch}" නමින් හෝ username එකෙන් කණ්ඩායමක් හමු නොවීය.
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                කරුණාකර username එක නිවැරදිදැයි පරීක්ෂා කරන්න හෝ මෙම නමින් නව කණ්ඩායමක් සාදන්න.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>නව කණ්ඩායමක් සාදන්න</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchMatchedGroups.map((grp, sIdx) => {
                const isSaved = savedGroupIds.includes(grp.id);
                const { isCreator, isAdmin, isActive, isPending } = getUserGroupStatus(grp);
                const activeMembersCount = grp.members.filter((m) => m.status === 'active').length;

                return (
                  <div
                    key={`search_${grp.id || 'grp'}_${sIdx}`}
                    className="bg-white dark:bg-zinc-900 border-2 border-indigo-300 dark:border-zinc-700 rounded-2xl p-4 shadow-md flex flex-col justify-between space-y-3 hover:border-indigo-500 transition-all"
                  >
                    {/* Top Row: Icon, Name, Username, Privacy & Save */}
                    <div className="flex items-start gap-3">
                      <img
                        src={grp.photoUrl || 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=150&q=80'}
                        alt={grp.name}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-200 dark:border-zinc-700 shadow-sm shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-zinc-100 truncate">
                            {grp.name}
                          </h4>
                          <button
                            type="button"
                            onClick={(e) => handleToggleSave(grp.id, e)}
                            className={`p-1 rounded-lg transition-transform active:scale-125 cursor-pointer shrink-0 ${
                              isSaved ? 'text-amber-500' : 'text-zinc-400 hover:text-amber-500'
                            }`}
                            title={isSaved ? 'Saved' : 'Save Group'}
                          >
                            <Star className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                          </button>
                          {(isSystemAdmin || isCreator) && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteGroup(grp.id, e)}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors cursor-pointer shrink-0"
                              title={isSystemAdmin ? "පරිපාලක ලෙස කණ්ඩායම ඉවත් කරන්න (Admin Delete)" : "කණ්ඩායම ඉවත් කරන්න (Delete)"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Username */}
                        <div className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                          {grp.username}
                        </div>

                        {/* Badges: Members & Privacy */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center gap-1 border border-indigo-200 dark:border-indigo-900">
                            <Users className="w-3 h-3" />
                            <span>{activeMembersCount} Members</span>
                          </span>

                          {grp.privacy === 'private' ? (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-200 dark:border-amber-900">
                              <Lock className="w-3 h-3" />
                              <span>Private</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-200 dark:border-emerald-900">
                              <Globe className="w-3 h-3" />
                              <span>Public</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2">
                      {grp.description}
                    </p>

                    {/* 10. & 11. Add / Join Action Button */}
                    <div className="pt-1 flex items-center gap-2">
                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => setActiveChatGroup(grp)}
                          className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>සාමාජිකයෙක් (Open Chat)</span>
                        </button>
                      ) : isPending ? (
                        <div className="flex-1 py-2 px-3 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 text-amber-800 dark:text-amber-200 font-bold text-xs rounded-xl text-center flex items-center justify-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>⏳ ඉල්ලුම් කර ඇත (Pending Approval)</span>
                        </div>
                      ) : grp.privacy === 'public' ? (
                        <button
                          type="button"
                          onClick={(e) => handleJoinClick(grp, e)}
                          className="flex-1 py-2 px-3 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Add / එකතු වන්න (Join Public)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleJoinClick(grp, e)}
                          className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add / ඇතුල් වීමට ඉල්ලුම් කරන්න (Request)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveChatGroup(grp)}
                        className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                        title="Group Details & QR"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Group Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            <span>📋 කණ්ඩායම් ලැයිස්තුව (Groups List)</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">({filteredGroups.length})</span>
          </h3>
          {selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              සියල්ල පෙන්වන්න (Show All)
            </button>
          )}
        </div>

        {filteredGroups.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border-2 border-indigo-100 dark:border-zinc-800 rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto text-2xl">
              👥
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-800 dark:text-zinc-100">
                {selectedCategory === 'saved' 
                  ? 'සුරකින ලද කණ්ඩායම් කිසිවක් නැත' 
                  : getLangText('මෙම කාණ්ඩයේ කණ්ඩායම් කිසිවක් නැත', 'No Groups Found in This Category', 'இந்த பிரிவில் குழுக்கள் எதுவும் இல்லை')}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                {selectedCategory === 'saved'
                  ? 'ඔබ කැමති ඕනෑම කණ්ඩායමක ⭐ Star ලකුණ ක්ලික් කර මෙහි සුරැකිය හැක.'
                  : getLangText(
                      'ඔබ කැමති සේවාව හෝ හමුවීම සඳහා අලුත් කණ්ඩායමක් ආරම්භ කර සාමාජිකයන් සම්බන්ධ කරගන්න.',
                      'Be the first to start a group for this category and invite members!',
                      'இந்த பிரிவில் ஒரு புதிய குழுவை தொடங்கி உறுப்பினர்களை அழையுங்கள்.'
                    )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{getLangText('කණ්ඩායමක් සාදන්න', 'Create a Group', 'குழுவை உருவாக்கு')}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGroups.map((group, gIdx) => {
              const subMeta = getSubCategoryLabel(group.subCategory);
              const isSaved = savedGroupIds.includes(group.id);
              const { isCreator, isAdmin, isActive, isPending } = getUserGroupStatus(group);
              const activeMembersCount = group.members.filter((m) => m.status === 'active').length;

              return (
                <div
                  key={`group_${group.id || 'grp'}_${gIdx}`}
                  className="bg-white dark:bg-zinc-900 border-2 border-indigo-100 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Top Row: Sub-category pill, Privacy Tag, Admin / Member Tag & Bookmark */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black border ${subMeta.color}`}>
                          {subMeta.label}
                        </span>

                        {/* Privacy Pill */}
                        {group.privacy === 'private' ? (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-black flex items-center gap-1 border border-amber-200 dark:border-amber-900">
                            <Lock className="w-3 h-3" />
                            <span>Private</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 text-[10px] font-black flex items-center gap-1 border border-indigo-200 dark:border-indigo-900">
                            <Globe className="w-3 h-3" />
                            <span>Public</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isAdmin ? (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-black flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            <span>Admin</span>
                          </span>
                        ) : isActive ? (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Member</span>
                          </span>
                        ) : null}

                        {/* 08. Save Group Star Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleSave(group.id, e)}
                          className={`p-1.5 rounded-xl border transition-all active:scale-125 cursor-pointer ${
                            isSaved 
                              ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-300 text-amber-500' 
                              : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-amber-500'
                          }`}
                          title={isSaved ? 'කණ්ඩායම සුරැකී ඇත (Click to Unsave)' : 'කණ්ඩායම සුරකින්න (Save Group)'}
                        >
                          <Star className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </div>

                    {/* Group Icon + Name & Username */}
                    <div className="flex items-start gap-3">
                      <img
                        src={group.photoUrl || 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=150&q=80'}
                        alt={group.name}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-200 dark:border-zinc-700 shadow-sm shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-zinc-100 leading-snug line-clamp-2">
                          {group.name}
                        </h3>
                        <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {group.username}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {group.description}
                    </p>

                    {/* Members Count & Activity Info */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300">
                        <Users className="w-3.5 h-3.5" />
                        <span>{activeMembersCount} සාමාජිකයින්</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                        <span>Admin: {group.creatorName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Join / Request / Open Chat */}
                  <div className="pt-2 flex items-center gap-2">
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => setActiveChatGroup(group)}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{getLangText('සංවාදයට එක්වන්න (Chat)', 'Open Chat', 'அரட்டை')}</span>
                      </button>
                    ) : isPending ? (
                      <div className="flex-1 py-2.5 px-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-amber-800 dark:text-amber-200 font-bold text-xs rounded-xl text-center flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>⏳ ඉල්ලුම් කර ඇත (Pending Approval)</span>
                      </div>
                    ) : group.privacy === 'public' ? (
                      <button
                        type="button"
                        onClick={(e) => handleJoinClick(group, e)}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add / එකතු වන්න (Join Public)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleJoinClick(group, e)}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add / ඇතුල් වීමට ඉල්ලුම් කරන්න</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveChatGroup(group)}
                      className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                      title="Group Info & QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    {(isSystemAdmin || isCreator) && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteGroup(group.id, e)}
                        className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                        title={isSystemAdmin ? "පරිපාලක ලෙස කණ්ඩායම ඉවත් කරන්න (Admin Delete)" : "කණ්ඩායම ඉවත් කරන්න (Delete)"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 03. Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={currentUser}
        lang={language}
        initialSubCategory={selectedCategory === 'social_service' || selectedCategory === 'religious_activity' || selectedCategory === 'friendly_meetup' ? selectedCategory : 'social_service'}
        registeredUsers={registeredUsers}
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


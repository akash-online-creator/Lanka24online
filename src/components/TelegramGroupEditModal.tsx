import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  Camera,
  Smile,
  Users,
  MessageCircle,
  Palette,
  ListOrdered,
  Heart,
  Hand,
  Key,
  Link2,
  Shield,
  BarChart2,
  ClipboardList,
  Layers,
  Trash2,
  Lock,
  Globe,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
  QrCode,
  Plus,
  Search,
  VolumeX,
  Volume2,
  AlertTriangle,
  Sparkles,
  X
} from 'lucide-react';
import { GroupItem, GroupMember, GroupPermissions, GroupRecentAction, GroupInviteLinkItem, User } from '../types';
import { compressImageFile } from '../utils/imageCompressor';
import { updateGroupInFirestore, deleteGroupFromFirestore } from '../lib/firebase';
import { saveGroupsToStorage, getStoredGroups } from '../data/groupWorkData';

interface TelegramGroupEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: GroupItem;
  currentUser: User;
  onGroupUpdated: (updated: GroupItem) => void;
  onGroupDeleted?: (groupId: string) => void;
}

type SubViewType = 
  | null 
  | 'type' 
  | 'history' 
  | 'appearance' 
  | 'reactions' 
  | 'welcome' 
  | 'permissions' 
  | 'invites' 
  | 'admins' 
  | 'members' 
  | 'stats' 
  | 'recent_actions' 
  | 'community';

const APPEARANCE_COLORS = [
  { name: 'Emerald', hex: '#22c55e', bgClass: 'bg-emerald-500' },
  { name: 'Blue', hex: '#3b82f6', bgClass: 'bg-blue-500' },
  { name: 'Purple', hex: '#8b5cf6', bgClass: 'bg-purple-500' },
  { name: 'Amber', hex: '#f59e0b', bgClass: 'bg-amber-500' },
  { name: 'Rose', hex: '#f43f5e', bgClass: 'bg-rose-500' },
  { name: 'Cyan', hex: '#06b6d4', bgClass: 'bg-cyan-500' },
  { name: 'Teal', hex: '#14b8a6', bgClass: 'bg-teal-500' },
  { name: 'Dark Slate', hex: '#334155', bgClass: 'bg-slate-700' },
];

export const TelegramGroupEditModal: React.FC<TelegramGroupEditModalProps> = ({
  isOpen,
  onClose,
  group: initialGroup,
  currentUser,
  onGroupUpdated,
  onGroupDeleted,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group Main Details State
  const [name, setName] = useState(initialGroup.name || '');
  const [description, setDescription] = useState(initialGroup.description || '');
  const [photoUrl, setPhotoUrl] = useState(initialGroup.photoUrl || initialGroup.avatarUrl || '');
  const [privacy, setPrivacy] = useState<'public' | 'private'>(
    initialGroup.privacy === 'private' || initialGroup.isPrivate ? 'private' : 'public'
  );
  const [username, setUsername] = useState(initialGroup.username || '');
  const [chatHistoryVisible, setChatHistoryVisible] = useState<boolean>(
    initialGroup.chatHistoryVisible !== false
  );
  const [appearanceColor, setAppearanceColor] = useState(
    initialGroup.appearanceColor || '#22c55e'
  );
  const [topicsEnabled, setTopicsEnabled] = useState(Boolean(initialGroup.topicsEnabled));
  const [reactionsSetting, setReactionsSetting] = useState<'all' | 'some' | 'off'>(
    initialGroup.reactionsSetting || 'all'
  );
  const [welcomeMessageEnabled, setWelcomeMessageEnabled] = useState(
    Boolean(initialGroup.welcomeMessageEnabled)
  );
  const [welcomeMessageText, setWelcomeMessageText] = useState(
    initialGroup.welcomeMessageText || `සාදරයෙන් පිළිගනිමු! කරුණාකර කණ්ඩායමේ නීති රීති වලට ගරු කරන්න.`
  );
  const [permissions, setPermissions] = useState<GroupPermissions>({
    editGroupSettings: initialGroup.permissions?.editGroupSettings ?? true,
    sendNewMessages: initialGroup.permissions?.sendNewMessages ?? true,
    addOtherMembers: initialGroup.permissions?.addOtherMembers ?? true,
    inviteViaLinkOrQr: initialGroup.permissions?.inviteViaLinkOrQr ?? true,
    adminApproveNewMembers: initialGroup.permissions?.adminApproveNewMembers ?? (initialGroup.privacy === 'private'),
    disappearingTimer: initialGroup.permissions?.disappearingTimer ?? 'off',
    sendMedia: initialGroup.permissions?.sendMedia ?? true,
    sendStickersGifs: initialGroup.permissions?.sendStickersGifs ?? true,
    sendPolls: initialGroup.permissions?.sendPolls ?? true,
    embedLinks: initialGroup.permissions?.embedLinks ?? true,
    pinMessages: initialGroup.permissions?.pinMessages ?? true,
    changeChatInfo: initialGroup.permissions?.changeChatInfo ?? false,
    slowMode: initialGroup.permissions?.slowMode ?? 'off',
  });
  const [members, setMembers] = useState<GroupMember[]>(
    Array.isArray(initialGroup.members) ? initialGroup.members : []
  );
  const [inviteLinks, setInviteLinks] = useState<GroupInviteLinkItem[]>(
    initialGroup.inviteLinksList && initialGroup.inviteLinksList.length > 0
      ? initialGroup.inviteLinksList
      : [
          {
            id: `link_${initialGroup.id}_primary`,
            code: initialGroup.inviteCode || 'INVITE123',
            link: initialGroup.inviteLink || `https://supporservice.online/?join=${initialGroup.id}`,
            createdAt: new Date().toLocaleDateString(),
            usageCount: initialGroup.members?.length || 1,
            requiresApproval: initialGroup.privacy === 'private',
          },
        ]
  );
  const [recentActions, setRecentActions] = useState<GroupRecentAction[]>(
    initialGroup.recentActions || [
      {
        id: `act_${Date.now()}`,
        adminId: currentUser.id || currentUser.userId || '',
        adminName: currentUser.name || 'පරිපාලක',
        action: 'කණ්ඩායම නිර්මාණය කරන ලදී (Group Created)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestampMs: Date.now(),
      },
    ]
  );
  const [communityName, setCommunityName] = useState(initialGroup.communityName || '');

  // Subview Navigation
  const [subView, setSubView] = useState<SubViewType>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  // Members sub-search
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [newAdminTitleInput, setNewAdminTitleInput] = useState('Admin');
  const [selectedMemberForAdmin, setSelectedMemberForAdmin] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (txt: string) => {
    setToastText(txt);
    setTimeout(() => setToastText(null), 3000);
  };

  // Log an admin action
  const logAction = (actionDesc: string) => {
    const act: GroupRecentAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      adminId: currentUser.id || currentUser.userId || '',
      adminName: currentUser.name || 'පරිපාලක',
      action: actionDesc,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestampMs: Date.now(),
    };
    setRecentActions((prev) => [act, ...prev.slice(0, 49)]);
  };

  // Image Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 });
      setPhotoUrl(compressed);
      logAction('කණ්ඩායම් ඡායාරූපය යාවත්කාලීන කරන ලදී (Changed Group Photo)');
      showToast('ඡායාරූපය යාවත්කාලීන විය!');
    } catch {
      showToast('ඡායාරූපය සැකසීමට නොහැකි විය.');
    }
  };

  // Save All Changes (Checkmark button)
  const handleSave = async () => {
    if (!name.trim()) {
      showToast('කරුණාකර කණ්ඩායමේ නම ඇතුළත් කරන්න.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedGroup: GroupItem = {
        ...initialGroup,
        name: name.trim(),
        description: description.trim(),
        photoUrl: photoUrl || initialGroup.photoUrl,
        avatarUrl: photoUrl || initialGroup.avatarUrl,
        privacy,
        isPrivate: privacy === 'private',
        username: username.trim(),
        chatHistoryVisible,
        appearanceColor,
        topicsEnabled,
        reactionsSetting,
        welcomeMessageEnabled,
        welcomeMessageText: welcomeMessageText.trim(),
        permissions,
        members,
        inviteLinksList: inviteLinks,
        recentActions,
        communityName: communityName.trim(),
      };

      // Save to local storage
      const all = getStoredGroups();
      const updatedList = all.map((g) => (g.id === updatedGroup.id ? updatedGroup : g));
      saveGroupsToStorage(updatedList);

      // Save to Firestore
      await updateGroupInFirestore(updatedGroup.id, updatedGroup);

      onGroupUpdated(updatedGroup);
      showToast('සියලු වෙනස්කම් සාර්ථකව සුරකින ලදී! (Saved)');
      setTimeout(() => {
        onClose();
      }, 400);
    } catch (err) {
      console.error('Failed to update group:', err);
      showToast('දත්ත සුරැකීමේදී දෝෂයක් සිදු විය.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete & Leave Group
  const handleDeleteGroup = async () => {
    try {
      const all = getStoredGroups();
      const filtered = all.filter((g) => g.id !== initialGroup.id);
      saveGroupsToStorage(filtered);
      await deleteGroupFromFirestore(initialGroup.id);
      if (onGroupDeleted) onGroupDeleted(initialGroup.id);
      onClose();
    } catch (err) {
      console.error('Error deleting group:', err);
      showToast('කණ්ඩායම මකා දැමීමට නොහැකි විය.');
    }
  };

  // Calculate permission counts
  const permissionKeys: (keyof GroupPermissions)[] = [
    'sendNewMessages',
    'sendMedia',
    'sendStickersGifs',
    'sendPolls',
    'embedLinks',
    'addOtherMembers',
    'pinMessages',
    'changeChatInfo',
  ];
  const activePermissionsCount = permissionKeys.filter((k) => permissions[k] !== false).length;

  const adminsCount = members.filter((m) => m.role === 'admin').length;
  const filteredMembers = members.filter((m) =>
    (m.name || '').toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    (m.phone || '').includes(memberSearchQuery)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Telegram-style Top Header */}
        <div className="px-4 py-3.5 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (subView) setSubView(null);
                else onClose();
              }}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-black tracking-tight">
              {subView === 'type'
                ? 'Group Type'
                : subView === 'history'
                ? 'Chat History for New Members'
                : subView === 'appearance'
                ? 'Appearance'
                : subView === 'reactions'
                ? 'Reactions'
                : subView === 'welcome'
                ? 'Welcome Message'
                : subView === 'permissions'
                ? 'Permissions'
                : subView === 'invites'
                ? 'Invite Links'
                : subView === 'admins'
                ? 'Administrators'
                : subView === 'members'
                ? 'Members'
                : subView === 'stats'
                ? 'Statistics'
                : subView === 'recent_actions'
                ? 'Recent Actions'
                : subView === 'community'
                ? 'Community'
                : 'Edit'}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="p-2 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 transition-transform active:scale-90 cursor-pointer disabled:opacity-50"
            title="සුරකින්න (Save Changes)"
          >
            <Check className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 bg-slate-50/60 dark:bg-[#090d16]">
          {/* Main Edit View */}
          {subView === null && (
            <div className="space-y-4 p-4">
              {/* Photo & Name Section (Telegram Card) */}
              <div className="bg-white dark:bg-[#131d31] p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
                <div className="flex items-center gap-4">
                  {/* Avatar with Camera Overlay */}
                  <div className="relative group shrink-0">
                    <div
                      className="w-20 h-20 rounded-full overflow-hidden border-2 shadow-inner flex items-center justify-center text-white font-black text-2xl"
                      style={{ backgroundColor: appearanceColor }}
                    >
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt="Group avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{(name || 'G').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Set New Photo"
                    >
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[9px] font-bold">Photo</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Group Name Input */}
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Group name
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Group name"
                        className="w-full text-base sm:text-lg font-black bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 pb-1 pr-8 outline-none text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="absolute right-1 text-slate-400 hover:text-amber-500 transition-colors p-1"
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline mt-2 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Set New Photo</span>
                    </button>
                  </div>
                </div>

                {/* Quick Emoji Bar when clicked */}
                {showEmojiPicker && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {['🤝', '🌿', '🇱🇰', '🔥', '❤️', '🙏', '⚡', '🌟', '🛡️', '🏆', '🎯', '📢'].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => {
                          setName((prev) => prev + ' ' + em);
                          setShowEmojiPicker(false);
                        }}
                        className="text-lg p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-transform active:scale-125"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}

                {/* Description Bio Box */}
                <div className="pt-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="විස්තරය (Description)..."
                    rows={3}
                    className="w-full mt-1 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Group Settings Card 1 */}
              <div className="bg-white dark:bg-[#131d31] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/70 overflow-hidden">
                {/* Group Type */}
                <button
                  type="button"
                  onClick={() => setSubView('type')}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        Group Type
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span className="capitalize">{privacy}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>

                {/* Chat History for new members */}
                <button
                  type="button"
                  onClick={() => setSubView('history')}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        Chat History
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>{chatHistoryVisible ? 'Visible' : 'Hidden'}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>

                {/* Appearance */}
                <button
                  type="button"
                  onClick={() => setSubView('appearance')}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Palette className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        Appearance
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-white dark:border-slate-800 shadow-xs"
                      style={{ backgroundColor: appearanceColor }}
                    />
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>

                {/* Topics Toggle */}
                <div className="px-4 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ListOrdered className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        Topics
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={topicsEnabled}
                      onChange={(e) => {
                        setTopicsEnabled(e.target.checked);
                        logAction(e.target.checked ? 'Topics ක්‍රියාත්මක කරන ලදී' : 'Topics අක්‍රිය කරන ලදී');
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>

              {/* Telegram Helper Note below Topics */}
              <p className="px-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                The group chat will be divided into topics created by admins or users.
              </p>

              {/* Group Settings Card 2 */}
              <div className="bg-white dark:bg-[#131d31] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/70 overflow-hidden">
                {/* Reactions */}
                <button
                  type="button"
                  onClick={() => setSubView('reactions')}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      Reactions
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span className="capitalize">{reactionsSetting}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>

                {/* Welcome Message */}
                <button
                  type="button"
                  onClick={() => setSubView('welcome')}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Hand className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      Welcome Message
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>{welcomeMessageEnabled ? 'On' : 'Off'}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>

                {/* Permissions */}
                <button
                  type="button"
                  onClick={() => setSubView('permissions')}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      Permissions
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>{activePermissionsCount}/8</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>

                {/* Invite Links */}
                <button
                  type="button"
                  onClick={() => setSubView('invites')}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Link2 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      Invite Links
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>{inviteLinks.length}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>

                {/* Administrators */}
                <button
                  type="button"
                  onClick={() => setSubView('admins')}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      Administrators
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>{adminsCount}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>

                {/* Members */}
                <button
                  type="button"
                  onClick={() => setSubView('members')}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      Members
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>{members.length}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>

                {/* Statistics */}
                <button
                  type="button"
                  onClick={() => setSubView('stats')}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <BarChart2 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      Statistics
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Recent Actions */}
                <button
                  type="button"
                  onClick={() => setSubView('recent_actions')}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      Recent Actions
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Card 3: Community */}
              <div className="bg-white dark:bg-[#131d31] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSubView('community')}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-sky-500" />
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        Add Group to a Community
                      </div>
                      {communityName && (
                        <div className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
                          {communityName}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <p className="px-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Make your group part of a community with multiple related chats.
              </p>

              {/* Danger Zone: Delete and Leave Group */}
              <div className="bg-white dark:bg-[#131d31] rounded-3xl border border-rose-200/60 dark:border-rose-950/60 shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-rose-600 dark:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/30 transition-colors font-bold text-sm cursor-pointer"
                >
                  <span>Delete and leave group</span>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SubView: Group Type */}
          {subView === 'type' && (
            <div className="p-4 space-y-4">
              <div className="bg-white dark:bg-[#131d31] rounded-3xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div
                  onClick={() => {
                    setPrivacy('public');
                    logAction('Group Type ප්‍රසිද්ධ (Public) ලෙස වෙනස් කරන ලදී');
                  }}
                  className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    privacy === 'public'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div className="font-black text-sm">Public Group (ප්‍රසිද්ධ)</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        ඕනෑම අයෙකුට සෙවුමෙන් සොයාගෙන සම්බන්ධ විය හැක.
                      </div>
                    </div>
                  </div>
                  {privacy === 'public' && <Check className="w-5 h-5 text-emerald-600" />}
                </div>

                <div
                  onClick={() => {
                    setPrivacy('private');
                    logAction('Group Type පෞද්ගලික (Private) ලෙස වෙනස් කරන ලදී');
                  }}
                  className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    privacy === 'private'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <div className="font-black text-sm">Private Group (පෞද්ගලික)</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        සම්බන්ධ විය හැක්කේ ආරාධනා ලින්ක් (Invite link) මඟින් පමණි.
                      </div>
                    </div>
                  </div>
                  {privacy === 'private' && <Check className="w-5 h-5 text-emerald-600" />}
                </div>
              </div>

              {privacy === 'public' && (
                <div className="bg-white dark:bg-[#131d31] rounded-3xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    ප්‍රසිද්ධ Username / Permanent Link
                  </label>
                  <div className="flex items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs">
                    <span className="text-slate-400 mr-1 font-mono">https://supporservice.online/</span>
                    <input
                      type="text"
                      value={username.replace('@', '')}
                      onChange={(e) => setUsername('@' + e.target.value.trim().replace(/[^a-zA-Z0-9_]/g, ''))}
                      placeholder="link_name"
                      className="bg-transparent font-bold outline-none flex-1 text-slate-900 dark:text-white"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    මෙම ලින්ක් එක මඟින් ලෝකයේ ඕනෑම අයෙකුට ඔබගේ කණ්ඩායම සොයාගත හැක.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SubView: Chat History */}
          {subView === 'history' && (
            <div className="p-4 space-y-3">
              <div className="bg-white dark:bg-[#131d31] rounded-3xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div
                  onClick={() => {
                    setChatHistoryVisible(true);
                    logAction('Chat History නව සාමාජිකයින්ට පෙනෙන ලෙස (Visible) සකසන ලදී');
                  }}
                  className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    chatHistoryVisible
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="font-black text-sm">Visible (පෙර පණිවිඩ පෙනේ)</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        නව සාමාජිකයින් එක් වූ පසු පැරණි පණිවිඩ සියල්ල කියවිය හැක.
                      </div>
                    </div>
                  </div>
                  {chatHistoryVisible && <Check className="w-5 h-5 text-emerald-600" />}
                </div>

                <div
                  onClick={() => {
                    setChatHistoryVisible(false);
                    logAction('Chat History නව සාමාජිකයින්ට නොපෙනෙන ලෙස (Hidden) සකසන ලදී');
                  }}
                  className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    !chatHistoryVisible
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <EyeOff className="w-5 h-5 text-slate-500" />
                    <div>
                      <div className="font-black text-sm">Hidden (පෙර පණිවිඩ සැඟවේ)</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        නව සාමාජිකයින්ට පෙනෙන්නේ ඔවුන් එක් වූ මොහොතේ සිට යවන පණිවිඩ පමණි.
                      </div>
                    </div>
                  </div>
                  {!chatHistoryVisible && <Check className="w-5 h-5 text-emerald-600" />}
                </div>
              </div>
            </div>
          )}

          {/* SubView: Appearance */}
          {subView === 'appearance' && (
            <div className="p-4 space-y-4">
              <div className="bg-white dark:bg-[#131d31] rounded-3xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Select Accent Color
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {APPEARANCE_COLORS.map((col) => {
                    const isSelected = appearanceColor === col.hex;
                    return (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => {
                          setAppearanceColor(col.hex);
                          logAction(`Appearance තේමාව ${col.name} ලෙස වෙනස් කරන ලදී`);
                        }}
                        className={`p-3 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-slate-900 dark:border-white shadow-md scale-105'
                            : 'border-slate-200 dark:border-slate-700 hover:scale-102'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full ${col.bgClass} shadow-sm`} />
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                          {col.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SubView: Reactions */}
          {subView === 'reactions' && (
            <div className="p-4 space-y-3">
              <div className="bg-white dark:bg-[#131d31] rounded-3xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                {(['all', 'some', 'off'] as const).map((mode) => (
                  <div
                    key={mode}
                    onClick={() => {
                      setReactionsSetting(mode);
                      logAction(`Reactions සැකසුම ${mode} ලෙස වෙනස් කරන ලදී`);
                    }}
                    className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                      reactionsSetting === mode
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-black text-sm capitalize">{mode === 'all' ? 'All Reactions' : mode === 'some' ? 'Some Reactions' : 'No Reactions (Off)'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {mode === 'all' ? 'සාමාජිකයින්ට ඕනෑම emoji එකකින් ප්‍රතිචාර දැක්විය හැක.' : mode === 'some' ? 'ප්‍රධාන emoji කිහිපයකින් පමණක් ප්‍රතිචාර දැක්විය හැක.' : 'ප්‍රතිචාර අක්‍රියයි.'}
                      </div>
                    </div>
                    {reactionsSetting === mode && <Check className="w-5 h-5 text-emerald-600" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SubView: Welcome Message */}
          {subView === 'welcome' && (
            <div className="p-4 space-y-4">
              <div className="bg-white dark:bg-[#131d31] rounded-3xl p-4 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-black text-sm text-slate-900 dark:text-white">
                      Welcome Message
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      නව සාමාජිකයෙකු එක්වූ විට ස්වයංක්‍රීයව පිළිගැනීමේ පණිවිඩයක් යවන්න.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={welcomeMessageEnabled}
                      onChange={(e) => {
                        setWelcomeMessageEnabled(e.target.checked);
                        logAction(e.target.checked ? 'Welcome message ක්‍රියාත්මක කරන ලදී' : 'Welcome message අක්‍රිය කරන ලදී');
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {welcomeMessageEnabled && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[11px] font-bold text-slate-500">පිළිගැනීමේ පණිවිඩය (Welcome Note)</label>
                    <textarea
                      value={welcomeMessageText}
                      onChange={(e) => setWelcomeMessageText(e.target.value)}
                      rows={3}
                      className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SubView: Permissions */}
          {subView === 'permissions' && (
            <div className="p-4 space-y-3">
              <div className="bg-white dark:bg-[#131d31] rounded-3xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  සාමාජිකයින්ට කළ හැකි දෑ (What can members do?)
                </h3>

                {[
                  { key: 'sendNewMessages', label: 'Send Messages', desc: 'පණිවිඩ යැවීම' },
                  { key: 'sendMedia', label: 'Send Media', desc: 'ඡායාරූප, වීඩියෝ, හඬ පට යැවීම' },
                  { key: 'sendStickersGifs', label: 'Send Stickers & GIFs', desc: 'ස්ටිකර්ස් සහ GIFs' },
                  { key: 'sendPolls', label: 'Send Polls', desc: 'ඡන්ද විමසීම් (Polls)' },
                  { key: 'embedLinks', label: 'Embed Links', desc: 'වෙබ් ලින්ක් ඇතුලත් කිරීම' },
                  { key: 'addOtherMembers', label: 'Add Members', desc: 'නව සාමාජිකයින් එක් කිරීම' },
                  { key: 'pinMessages', label: 'Pin Messages', desc: 'පණිවිඩ Pin කිරීම' },
                  { key: 'changeChatInfo', label: 'Change Chat Info', desc: 'නම, ඡායාරූපය වෙනස් කිරීම' },
                ].map((item) => {
                  const val = (permissions as any)[item.key] !== false;
                  return (
                    <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/80 last:border-b-0">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{item.label}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={val}
                          onChange={(e) => {
                            setPermissions((prev) => ({ ...prev, [item.key]: e.target.checked }));
                            logAction(`Permission '${item.label}' ${e.target.checked ? 'අනුමත කරන ලදී' : 'අත්හිටුවන ලදී'}`);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SubView: Invite Links */}
          {subView === 'invites' && (
            <div className="p-4 space-y-4">
              <div className="bg-white dark:bg-[#131d31] rounded-3xl p-4 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Primary Invite Link
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newCode = Math.random().toString(36).substring(2, 9).toUpperCase();
                      const newLinkItem: GroupInviteLinkItem = {
                        id: `link_${Date.now()}`,
                        code: newCode,
                        link: `https://supporservice.online/?join=${initialGroup.id}&code=${newCode}`,
                        createdAt: new Date().toLocaleDateString(),
                        usageCount: 0,
                        requiresApproval: privacy === 'private',
                      };
                      setInviteLinks((prev) => [...prev, newLinkItem]);
                      logAction('නව Invite Link එකක් නිර්මාණය කරන ලදී');
                      showToast('නව ආරාධනා ලින්ක් එකක් සාදන ලදී!');
                    }}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Link</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {inviteLinks.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                          {item.link}
                        </span>
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md font-bold">
                          {item.usageCount} joins
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(item.link);
                            showToast('Link පිටපත් කරගන්නා ලදී (Copied)');
                          }}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link</span>
                        </button>
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setInviteLinks((prev) => prev.filter((l) => l.id !== item.id));
                              logAction('Invite link එකක් ඉවත් කරන ලදී');
                            }}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            title="Revoke link"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SubView: Administrators */}
          {subView === 'admins' && (
            <div className="p-4 space-y-4">
              <div className="bg-white dark:bg-[#131d31] rounded-3xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Group Administrators ({adminsCount})
                  </h3>
                </div>

                <div className="space-y-2">
                  {members
                    .filter((m) => m.role === 'admin' || m.userId === initialGroup.creatorId)
                    .map((adm) => {
                      const isCreator = adm.userId === initialGroup.creatorId;
                      return (
                        <div
                          key={adm.userId}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center font-black text-sm">
                              {(adm.name || 'A').charAt(0)}
                            </div>
                            <div>
                              <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{adm.name}</span>
                                {isCreator && (
                                  <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.2 rounded font-black">
                                    Owner
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {adm.customTitle || (isCreator ? 'Owner' : 'Admin')}
                              </div>
                            </div>
                          </div>

                          {!isCreator && adm.userId !== currentUser.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setMembers((prev) =>
                                  prev.map((m) => (m.userId === adm.userId ? { ...m, role: 'member' } : m))
                                );
                                logAction(`${adm.name} Admin ධුරයෙන් ඉවත් කරන ලදී`);
                                showToast(`${adm.name} සාමාජිකයෙකු බවට පත් කරන ලදී.`);
                              }}
                              className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                            >
                              Demote
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Promote Existing Member to Admin */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    සාමාජිකයෙකු Admin කරන්න (Add Administrator):
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedMemberForAdmin || ''}
                      onChange={(e) => setSelectedMemberForAdmin(e.target.value)}
                      className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                    >
                      <option value="">සාමාජිකයෙකු තෝරන්න...</option>
                      {members
                        .filter((m) => m.role !== 'admin' && m.userId !== initialGroup.creatorId)
                        .map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.name} ({m.phone})
                          </option>
                        ))}
                    </select>
                    <input
                      type="text"
                      value={newAdminTitleInput}
                      onChange={(e) => setNewAdminTitleInput(e.target.value)}
                      placeholder="Title e.g. Admin"
                      className="w-24 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                    />
                    <button
                      type="button"
                      disabled={!selectedMemberForAdmin}
                      onClick={() => {
                        if (!selectedMemberForAdmin) return;
                        setMembers((prev) =>
                          prev.map((m) =>
                            m.userId === selectedMemberForAdmin
                              ? { ...m, role: 'admin', customTitle: newAdminTitleInput.trim() || 'Admin' }
                              : m
                          )
                        );
                        const promotedName = members.find((m) => m.userId === selectedMemberForAdmin)?.name || 'Member';
                        logAction(`${promotedName} Admin ලෙස පත් කරන ලදී (Title: ${newAdminTitleInput})`);
                        setSelectedMemberForAdmin(null);
                        showToast(`${promotedName} Admin ධුරයට පත් කරන ලදී!`);
                      }}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SubView: Members */}
          {subView === 'members' && (
            <div className="p-4 space-y-4">
              <div className="bg-white dark:bg-[#131d31] rounded-3xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="සාමාජිකයින් සොයන්න..."
                    className="bg-transparent text-xs outline-none flex-1"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredMembers.map((m) => {
                    const isCreator = m.userId === initialGroup.creatorId;
                    return (
                      <div
                        key={m.userId}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-black text-sm">
                            {(m.name || 'M').charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{m.name}</span>
                              {m.role === 'admin' && (
                                <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.2 rounded font-black">
                                  {m.customTitle || 'Admin'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {m.phone}
                            </div>
                          </div>
                        </div>

                        {!isCreator && m.userId !== currentUser.id && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setMembers((prev) =>
                                  prev.map((item) =>
                                    item.userId === m.userId ? { ...item, isMuted: !item.isMuted } : item
                                  )
                                );
                                logAction(`${m.name} ${m.isMuted ? 'Unmute කරන ලදී' : 'Mute කරන ලදී'}`);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                              title={m.isMuted ? 'Unmute' : 'Mute member'}
                            >
                              {m.isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMembers((prev) => prev.filter((item) => item.userId !== m.userId));
                                logAction(`${m.name} කණ්ඩායමෙන් ඉවත් කරන ලදී (Removed)`);
                                showToast(`${m.name} ඉවත් කරන ලදී.`);
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-500"
                              title="කණ්ඩායමෙන් ඉවත් කරන්න"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SubView: Statistics */}
          {subView === 'stats' && (
            <div className="p-4 space-y-4">
              <div className="bg-white dark:bg-[#131d31] rounded-3xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-sky-500" />
                  <span>Group Activity Overview</span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {members.length}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500">Total Members</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
                      {adminsCount}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500">Admins</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                      {inviteLinks.reduce((acc, l) => acc + (l.usageCount || 0), 0)}
                    </div>
                    <div className="text-[11px] font-bold text-slate-500">Invite Joins</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                      100%
                    </div>
                    <div className="text-[11px] font-bold text-slate-500">Activity Health</div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  කණ්ඩායම ආරම්භ කරන ලද්දේ: {initialGroup.createdAt ? new Date(initialGroup.createdAt).toLocaleDateString() : 'මෑතකදී'}.
                </p>
              </div>
            </div>
          )}

          {/* SubView: Recent Actions */}
          {subView === 'recent_actions' && (
            <div className="p-4 space-y-4">
              <div className="bg-white dark:bg-[#131d31] rounded-3xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-emerald-500" />
                  <span>Admin Actions Audit Log</span>
                </h3>

                <div className="space-y-2">
                  {recentActions.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-slate-900 dark:text-white">
                          {act.adminName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {act.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {act.action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SubView: Community */}
          {subView === 'community' && (
            <div className="p-4 space-y-4">
              <div className="bg-white dark:bg-[#131d31] rounded-3xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-sky-500" />
                  <h3 className="font-black text-sm">Add Group to a Community</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Make your group part of a community with multiple related chats. Community නාමයක් ඇතුළත් කරන්න.
                </p>
                <input
                  type="text"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  placeholder="e.g. ශ්‍රී ලංකා ස්වේච්ඡා එකමුතුව"
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0f172a] rounded-3xl p-6 max-w-sm w-full border-2 border-rose-500 shadow-2xl space-y-4 animate-scaleUp">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  කණ්ඩායම මකා දමන්නද?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  මෙම කණ්ඩායම සහ එහි සියලු පණිවිඩ සම්පූර්ණයෙන්ම මකා දැමෙනු ඇත. මෙම ක්‍රියාව නැවත හැරවිය නොහැක.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
                >
                  අවලංගු කරන්න
                </button>
                <button
                  type="button"
                  onClick={handleDeleteGroup}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  මකා දමන්න
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Alert */}
        {toastText && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-slate-700 flex items-center gap-2 animate-fadeIn">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastText}</span>
          </div>
        )}
      </div>
    </div>
  );
};

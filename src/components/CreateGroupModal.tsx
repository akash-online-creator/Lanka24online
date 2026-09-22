import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Upload, 
  Camera, 
  ShieldCheck, 
  Lock, 
  Check, 
  AlertCircle, 
  Search, 
  Phone, 
  UserPlus, 
  Trash2, 
  Info, 
  Clock, 
  MessageSquare, 
  Share2, 
  QrCode, 
  Sparkles,
  MapPin,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { 
  GroupItem, 
  GroupPermissions, 
  GroupWorkSubCategory, 
  Language, 
  User, 
  GroupMember, 
  GroupInviteNotification 
} from '../types';
import { 
  getStoredGroups, 
  saveGroupsToStorage, 
  getStoredGroupInvites, 
  saveGroupInvitesToStorage,
  isGroupNameTaken, 
  isGroupUsernameTaken, 
  normalizeUsername 
} from '../data/groupWorkData';
import { compressImageFile } from '../utils/imageCompressor';
import { MedicalPlusBadge } from './MedicalPlusBadge';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  lang: Language;
  initialSubCategory?: GroupWorkSubCategory;
  registeredUsers?: User[];
  onGroupCreated: (newGroup: GroupItem) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  lang,
  initialSubCategory = 'social_service',
  registeredUsers = [],
  onGroupCreated,
}) => {
  // Form State
  const [name, setName] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [subCategory, setSubCategory] = useState<GroupWorkSubCategory>(initialSubCategory);
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Added Members state (Invited by phone)
  interface StagedMember {
    user: User;
    status: 'pending_invite';
  }
  const [memberPhoneInput, setMemberPhoneInput] = useState('');
  const [phoneLookupError, setPhoneLookupError] = useState('');
  const [stagedMembers, setStagedMembers] = useState<StagedMember[]>([]);

  // Permissions State
  const [editGroupSettings, setEditGroupSettings] = useState(false);
  const [sendNewMessages, setSendNewMessages] = useState(true);
  const [addOtherMembers, setAddOtherMembers] = useState(true);
  const [inviteViaLinkOrQr, setInviteViaLinkOrQr] = useState(true);
  const [adminApproveNewMembers, setAdminApproveNewMembers] = useState(false);
  const [disappearingTimer, setDisappearingTimer] = useState<'off' | '24h' | '7d' | '90d'>('off');

  // Validation States
  const [nameError, setNameError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync subCategory if changed from outside
  useEffect(() => {
    if (initialSubCategory) {
      setSubCategory(initialSubCategory);
    }
  }, [initialSubCategory]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setUsernameInput('');
      setDescription('');
      setPhotoUrl('');
      setMemberPhoneInput('');
      setPhoneLookupError('');
      setStagedMembers([]);
      setNameError('');
      setUsernameError('');
      setPrivacy('public');
      setEditGroupSettings(false);
      setSendNewMessages(true);
      setAddOtherMembers(true);
      setInviteViaLinkOrQr(true);
      setAdminApproveNewMembers(false);
      setDisappearingTimer('off');
    }
  }, [isOpen]);

  // Validate Name in Real-Time
  const handleNameChange = (val: string) => {
    setName(val);
    if (!val.trim()) {
      setNameError('');
      return;
    }
    if (val.trim().length < 3) {
      setNameError('කණ්ඩායමේ නමට අවම වශයෙන් අකුරු 3ක් අවශ්‍යයි.');
      return;
    }
    if (isGroupNameTaken(val)) {
      setNameError('⚠️ මෙම නම දැනටමත් වෙනත් කණ්ඩායමක් විසින් භාවිතා කර ඇත. කරුණාකර වෙනත් නමක් ඇතුළත් කරන්න.');
      return;
    }
    setNameError('');
  };

  // Validate Username in Real-Time
  const handleUsernameChange = (val: string) => {
    let clean = val;
    if (!clean.startsWith('@') && clean.length > 0) {
      clean = '@' + clean;
    }
    setUsernameInput(clean);

    const norm = normalizeUsername(clean);
    if (!norm) {
      setUsernameError('');
      return;
    }
    if (norm.length < 3) {
      setUsernameError('Username එකට අවම වශයෙන් අක්ෂර 3ක් අවශ්‍යයි.');
      return;
    }
    if (isGroupUsernameTaken(norm)) {
      setUsernameError('⚠️ මෙම username එක දැනටමත් ලබාගෙන ඇත. කරුණාකර වෙනත් එකක් තෝරන්න.');
      return;
    }
    setUsernameError('');
  };

  // Photo Upload Handler (With client-side compression to under 200KB)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, { maxWidth: 800, maxHeight: 800, quality: 0.75 });
        setPhotoUrl(compressed);
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Lookup & Stage Member by Phone
  const handleAddMemberByPhone = () => {
    setPhoneLookupError('');
    const rawPhone = memberPhoneInput.trim();
    if (!rawPhone) {
      setPhoneLookupError('කරුණාකර දුරකථන අංකයක් ඇතුළත් කරන්න.');
      return;
    }

    // Clean phone number (strip spaces/dashes)
    const cleanPhone = rawPhone.replace(/[^0-9+]/g, '');

    // Prevent adding self
    if (currentUser && (cleanPhone === currentUser.phone || cleanPhone === currentUser.whatsappNumber)) {
      setPhoneLookupError('ඔබ දැනටමත් පරිපාලක (Admin) ලෙස මෙම කණ්ඩායමේ සිටියි.');
      return;
    }

    // Check if already staged
    if (stagedMembers.some((m) => m.user.phone === cleanPhone || m.user.whatsappNumber === cleanPhone)) {
      setPhoneLookupError('මෙම පුද්ගලයා දැනටමත් ආරාධනා ලැයිස්තුවට එක්කර ඇත.');
      return;
    }

    // Find registered user by phone or whatsapp
    const matchedUser = registeredUsers.find(
      (u) => 
        (u.phone && u.phone.replace(/[^0-9+]/g, '') === cleanPhone) ||
        (u.whatsappNumber && u.whatsappNumber.replace(/[^0-9+]/g, '') === cleanPhone)
    );

    if (!matchedUser) {
      setPhoneLookupError(`⚠️ "${rawPhone}" අංකය සහිත පුද්ගලයෙකු ඇප් එකෙහි ලියාපදිංචි වී නොමැත. කරුණාකර ලියාපදිංචි අංකයක් ඇතුළත් කරන්න.`);
      return;
    }

    // Add to staged members
    setStagedMembers((prev) => [...prev, { user: matchedUser, status: 'pending_invite' }]);
    setMemberPhoneInput('');
  };

  const handleRemoveStagedMember = (userId: string) => {
    setStagedMembers((prev) => prev.filter((m) => m.user.id !== userId && m.user.userId !== userId));
  };

  // Submit & Create Group
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setNameError('කරුණාකර කණ්ඩායමේ නම ඇතුළත් කරන්න.');
      return;
    }

    if (isGroupNameTaken(name)) {
      setNameError('⚠️ මෙම නම දැනටමත් වෙනත් කණ්ඩායමක් විසින් භාවිතා කර ඇත.');
      return;
    }

    const normUser = normalizeUsername(usernameInput || name);
    if (isGroupUsernameTaken(normUser)) {
      setUsernameError('⚠️ මෙම username එක දැනටමත් ලබාගෙන ඇත.');
      return;
    }

    setIsSubmitting(true);

    const generatedGroupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const finalUsername = usernameInput.trim() ? (usernameInput.startsWith('@') ? usernameInput.trim() : `@${usernameInput.trim()}`) : `@${normUser}`;
    const generatedInviteCode = `GRP-${Math.floor(1000 + Math.random() * 9000)}`;

    const groupPermissions: GroupPermissions = {
      editGroupSettings,
      sendNewMessages,
      addOtherMembers,
      inviteViaLinkOrQr,
      adminApproveNewMembers,
      disappearingTimer
    };

    // Creator as Admin
    const creatorMember: GroupMember = {
      userId: currentUser?.userId || currentUser?.id || 'admin',
      name: currentUser?.name || 'පරිපාලක',
      phone: currentUser?.phone || '',
      photoUrl: currentUser?.photoUrl || '',
      role: 'admin',
      status: 'active',
      joinedAt: new Date().toLocaleString()
    };

    // Staged Members as Pending Invites
    const invitedMembers: GroupMember[] = stagedMembers.map((sm) => ({
      userId: sm.user.userId || sm.user.id,
      name: sm.user.name,
      phone: sm.user.phone || sm.user.whatsappNumber || '',
      photoUrl: sm.user.photoUrl || '',
      role: 'member',
      status: 'pending_invite',
      joinedAt: new Date().toLocaleString()
    }));

    const newGroup: GroupItem = {
      id: generatedGroupId,
      name: name.trim(),
      username: finalUsername,
      subCategory,
      privacy,
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=400&q=80',
      description: description.trim() || 'කණ්ඩායම් සාමාජිකයන් සඳහා සාමූහික වැඩබිම.',
      creatorId: currentUser?.userId || currentUser?.id || 'admin',
      creatorName: currentUser?.name || 'පරිපාලක',
      creatorPhone: currentUser?.phone || '',
      createdAt: new Date().toLocaleString(),
      createdAtMs: Date.now(),
      permissions: groupPermissions,
      members: [creatorMember, ...invitedMembers],
      inviteCode: generatedInviteCode
    };

    // 1. Save Group to Storage
    const existingGroups = getStoredGroups();
    const updatedGroups = [newGroup, ...existingGroups];
    saveGroupsToStorage(updatedGroups);

    // 2. Dispatch Invitations to Each Invited User's Inbox
    const existingInvites = getStoredGroupInvites();
    const newNotifications: GroupInviteNotification[] = stagedMembers.map((sm) => ({
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      groupId: generatedGroupId,
      groupName: newGroup.name,
      groupUsername: newGroup.username,
      groupPhotoUrl: newGroup.photoUrl,
      subCategory: newGroup.subCategory,
      inviterName: currentUser?.name || 'පරිපාලක',
      inviterPhone: currentUser?.phone || '',
      targetPhone: sm.user.phone || sm.user.whatsappNumber || '',
      targetUserId: sm.user.userId || sm.user.id,
      status: 'pending',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMs: Date.now()
    }));

    saveGroupInvitesToStorage([...newNotifications, ...existingInvites]);

    setIsSubmitting(false);
    onGroupCreated(newGroup);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-white dark:bg-zinc-900 border-2 border-indigo-500/80 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-indigo-100 dark:border-zinc-800 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-snug flex items-center gap-1.5">
                <span>කණ්ඩායමක් සාදන්න</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">Create Group</span>
              </h2>
              <p className="text-xs text-indigo-100 font-medium">
                නව කණ්ඩායමක් පිහිටුවා සාමාජිකයන් සම්බන්ධ කරගන්න
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="වසන්න"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800 dark:text-zinc-100">
          
          {/* Sub-Category Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
              කණ්ඩායමේ කාණ්ඩය (Sub-Category) *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSubCategory('social_service')}
                className={`p-2.5 rounded-2xl border-2 font-black text-xs transition-all flex flex-col items-center gap-1 text-center cursor-pointer ${
                  subCategory === 'social_service'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-200 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-indigo-200'
                }`}
              >
                <span className="text-lg">🤝</span>
                <span>සමාජ සේවා</span>
              </button>

              <button
                type="button"
                onClick={() => setSubCategory('religious_activity')}
                className={`p-2.5 rounded-2xl border-2 font-black text-xs transition-all flex flex-col items-center gap-1 text-center cursor-pointer ${
                  subCategory === 'religious_activity'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-200 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-amber-200'
                }`}
              >
                <span className="text-lg">🛕</span>
                <span>ආගමික කටයුතු</span>
              </button>

              <button
                type="button"
                onClick={() => setSubCategory('friendly_meetup')}
                className={`p-2.5 rounded-2xl border-2 font-black text-xs transition-all flex flex-col items-center gap-1 text-center cursor-pointer ${
                  subCategory === 'friendly_meetup'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-emerald-200'
                }`}
              >
                <span className="text-lg">☕</span>
                <span>මිත්‍ර හමුව</span>
              </button>
            </div>
          </div>

          {/* Privacy Setting: Public vs Private */}
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-zinc-800/80 border-2 border-indigo-200/80 dark:border-zinc-700">
            <label className="block text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center justify-between">
              <span>කණ්ඩායමේ පෞද්ගලිකත්වය (Group Privacy) *</span>
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-zinc-700">
                {privacy === 'public' ? '🌐 Public Group' : '🔒 Private Group'}
              </span>
            </label>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
              කණ්ඩායම හැමෝටම පෙන්වන්නද (Public) එසේ නැතිනම් පෞද්ගලිකව (Private) තබාගන්නද යන්න තෝරන්න:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Option 1: Public */}
              <button
                type="button"
                onClick={() => {
                  setPrivacy('public');
                }}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  privacy === 'public'
                    ? 'bg-white dark:bg-zinc-900 border-indigo-600 shadow-md ring-2 ring-indigo-400/30'
                    : 'bg-white/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-xs text-indigo-950 dark:text-indigo-200">
                    <span className="text-base">🌐</span>
                    <span>ප්‍රසිද්ධ කණ්ඩායම (Public)</span>
                  </div>
                  {privacy === 'public' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  කණ්ඩායම් පුවරුවේ ඕනෑම අයෙකුට දැකිය හැක. ඕනෑම අයෙකුට සෘජුවම එකතු විය හැක (Instant Join).
                </p>
              </button>

              {/* Option 2: Private */}
              <button
                type="button"
                onClick={() => {
                  setPrivacy('private');
                  setAdminApproveNewMembers(true);
                }}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  privacy === 'private'
                    ? 'bg-white dark:bg-zinc-900 border-amber-600 shadow-md ring-2 ring-amber-400/30'
                    : 'bg-white/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-700 hover:border-amber-300 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-xs text-amber-950 dark:text-amber-200">
                    <span className="text-base">🔒</span>
                    <span>පෞද්ගලික කණ්ඩායම (Private)</span>
                  </div>
                  {privacy === 'private' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  Username සෙවීමෙන් හෝ Invite මගින් පමණි. ඇතුල් වීමට Admin විසින් Accept කළ යුතුය.
                </p>
              </button>
            </div>
          </div>

          {/* 1. Group Name (Unique Validation) & 2. Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Group Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                1. කණ්ඩායමේ නම (Group Name) *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="උදා: කැලණිය ප්‍රජා සත්කාර බලකාය"
                required
                className={`w-full px-3.5 py-2.5 rounded-xl border-2 bg-slate-50 dark:bg-zinc-800 font-bold text-sm outline-none transition-all ${
                  nameError 
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-400' 
                    : name.trim().length >= 3 
                    ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-400' 
                    : 'border-zinc-200 dark:border-zinc-700 focus:border-indigo-500'
                }`}
              />
              {nameError ? (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{nameError}</span>
                </p>
              ) : name.trim().length >= 3 ? (
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>මෙම නම භාවිතා කළ හැක (Available)</span>
                </p>
              ) : (
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  වෙනත් අයකු ලබාදුන් නමක් ඇතුළත් කළ නොහැක.
                </p>
              )}
            </div>

            {/* 2. Group Username */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                2. Username එක (Unique Handle) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="@kelaniya_cleanup"
                  className={`w-full px-3.5 py-2.5 rounded-xl border-2 bg-slate-50 dark:bg-zinc-800 font-mono font-bold text-sm outline-none transition-all ${
                    usernameError 
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-400' 
                      : usernameInput.trim().length >= 3 
                      ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-400' 
                      : 'border-zinc-200 dark:border-zinc-700 focus:border-indigo-500'
                  }`}
                />
              </div>
              {usernameError ? (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{usernameError}</span>
                </p>
              ) : usernameInput.trim().length >= 3 ? (
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Username එක නිවැරදියි (Valid)</span>
                </p>
              ) : (
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  ඉංග්‍රීසි අකුරු, ඉලක්කම් හා _ පමණක් භාවිතා කරන්න.
                </p>
              )}
            </div>
          </div>

          {/* 3. Group Profile Picture Upload (Registration Form Picture Upload Style) */}
          <div className="bg-indigo-50/50 dark:bg-zinc-800/60 p-4 rounded-2xl border-2 border-indigo-100 dark:border-zinc-800 space-y-3">
            <label className="block text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-300">
              3. Profile Picture එක ඇතුළත් කිරීම (Group Icon) *
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Photo Display / Avatar Container */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border-2 border-dashed border-indigo-300 dark:border-indigo-700 relative shrink-0 flex items-center justify-center shadow-inner">
                {photoUrl ? (
                  <div className="relative w-full h-full">
                    <img
                      src={photoUrl}
                      alt="Group Profile"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-md transition-colors cursor-pointer"
                      title="ඉවත් කරන්න"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 p-2 text-center">
                    <MedicalPlusBadge size="sm" showGlow animated />
                    <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400">
                      Picture Upload
                    </span>
                  </div>
                )}
              </div>

              {/* Upload Controls & Presets */}
              <div className="flex-1 space-y-2 w-full">
                <label className="inline-flex items-center justify-center gap-2 w-full sm:w-auto py-2.5 px-4 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-black cursor-pointer transition-all shadow-md active:scale-95">
                  <Upload className="w-4 h-4" />
                  <span>{photoUrl ? 'ඡායාරූපය වෙනස් කරන්න' : 'ඡායාරූපය තෝරන්න (Browse)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  කණ්ඩායමට උචිත පැහැදිලි ඡායාරූපයක් හෝ ලාංඡනයක් තෝරන්න.
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
              කණ්ඩායමේ අරමුණ / විස්තරය (Description)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="කණ්ඩායමේ කටයුතු හා නීති රීති කෙටියෙන්..."
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm font-medium outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* 4. Add Members by Phone Number (Phone validation + Inbox Invitation request) */}
          <div className="bg-slate-50 dark:bg-zinc-800/80 p-4 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-300">
                4. සාමාජිකයන් Add කරගැනීම (Add Members by Phone)
              </label>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                {stagedMembers.length} ක් සූදානම්
              </span>
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              දුරකථන අංකය දුන් පසු එම අංකයෙන් ලියාපදිංචි වී ඇති පුද්ගලයාගේ Inbox එකට Request එකක් යවනු ලැබේ. ඔහු Accept කළ පසු පමණක් Group එකට එක්වේ.
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={memberPhoneInput}
                  onChange={(e) => {
                    setMemberPhoneInput(e.target.value);
                    setPhoneLookupError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMemberByPhone();
                    }
                  }}
                  placeholder="දුරකථන අංකය (උදා: 0771234567)"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-sm font-bold outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={handleAddMemberByPhone}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>ආරාධනා කරන්න</span>
              </button>
            </div>

            {phoneLookupError && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{phoneLookupError}</span>
              </p>
            )}

            {/* Staged Members List */}
            {stagedMembers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <div className="text-[11px] font-black text-zinc-600 dark:text-zinc-400">
                  යැවීමට සූදානම් ආරාධනා (Pending Requests):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {stagedMembers.map((sm, idx) => (
                    <div 
                      key={`staged_${sm.user.id || sm.user.userId}_${idx}`}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-zinc-700 shadow-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center shrink-0">
                          {sm.user?.photoUrl ? (
                            <img src={sm.user.photoUrl} alt={sm.user?.name || 'User'} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-indigo-700">
                              {(sm.user?.name || 'U').charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black truncate">{sm.user.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono truncate">{sm.user.phone || sm.user.whatsappNumber}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStagedMember(sm.user.id || sm.user.userId)}
                        className="text-rose-500 hover:text-rose-700 p-1 transition-colors cursor-pointer"
                        title="ඉවත් කරන්න"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. Group Admin & Permission Settings */}
          <div className="bg-indigo-50/40 dark:bg-zinc-800/70 p-4 rounded-2xl border-2 border-indigo-200/80 dark:border-zinc-700 space-y-3">
            <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider">
                  5. Admin & Group Permissions (අවසර සැකසුම්)
                </h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Group එක හදන ඔබ Admin ලෙස පත්වන අතර සාමාජිකයින්ගේ අවසර පාලනය කරන්න:
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              {/* Permission 1: Edit Group Settings */}
              <label className="flex items-start gap-3 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-indigo-300 transition-colors">
                <input
                  type="checkbox"
                  checked={editGroupSettings}
                  onChange={(e) => setEditGroupSettings(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <div className="min-w-0 text-xs">
                  <div className="font-black text-slate-800 dark:text-zinc-100">
                    ✏️ Edit group Settings
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    This includes the name, icon, description, disappearing message timer, and the ability to pin, keep or unkeep messages.
                  </div>
                </div>
              </label>

              {/* Permission 2: Send New Messages */}
              <label className="flex items-start gap-3 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-indigo-300 transition-colors">
                <input
                  type="checkbox"
                  checked={sendNewMessages}
                  onChange={(e) => setSendNewMessages(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <div className="min-w-0 text-xs">
                  <div className="font-black text-slate-800 dark:text-zinc-100">
                    💬 Send new messages
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    සාමාජිකයින්ට කණ්ඩායම තුළ නව පණිවිඩ යැවීමට අවසර ලබාදෙන්න (Off කළ විට Admin පමණි).
                  </div>
                </div>
              </label>

              {/* Permission 3: Add Other Members */}
              <label className="flex items-start gap-3 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-indigo-300 transition-colors">
                <input
                  type="checkbox"
                  checked={addOtherMembers}
                  onChange={(e) => setAddOtherMembers(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <div className="min-w-0 text-xs">
                  <div className="font-black text-slate-800 dark:text-zinc-100">
                    👥 Add other members
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    අනෙකුත් සාමාජිකයින්ට ද තවත් සාමාජිකයින් එකතු කිරීමට ආරාධනා යැවීමේ හැකියාව ලබාදෙන්න.
                  </div>
                </div>
              </label>

              {/* Permission 4: Invite via Link or QR Code */}
              <label className="flex items-start gap-3 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:border-indigo-300 transition-colors">
                <input
                  type="checkbox"
                  checked={inviteViaLinkOrQr}
                  onChange={(e) => setInviteViaLinkOrQr(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <div className="min-w-0 text-xs">
                  <div className="font-black text-slate-800 dark:text-zinc-100">
                    🔗 Invite via link or QR Code
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    කණ්ඩායමේ ලින්ක් එක හෝ QR කේතය හරහා වෙනත් අයට සම්බන්ධ වීමේ හැකියාව.
                  </div>
                </div>
              </label>

              {/* Admin Gate 5: Approve New Members */}
              <label className="flex items-start gap-3 p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/60 cursor-pointer hover:border-amber-400 transition-colors">
                <input
                  type="checkbox"
                  checked={adminApproveNewMembers}
                  onChange={(e) => setAdminApproveNewMembers(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                />
                <div className="min-w-0 text-xs">
                  <div className="font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <span>🛡️ Admin Can: Approve new members</span>
                  </div>
                  <div className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-snug">
                    When turned on, admin must approve anyone who wants to join the group.
                  </div>
                </div>
              </label>

              {/* Disappearing Messages Timer */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <div className="font-black flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Disappearing message timer</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">ස්වයංක්‍රීයව පණිවිඩ මැකීයාමේ කාලය</div>
                </div>
                <select
                  value={disappearingTimer}
                  onChange={(e) => setDisappearingTimer(e.target.value as any)}
                  className="px-3 py-1.5 text-xs font-black rounded-lg border border-zinc-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 outline-none"
                >
                  <option value="off">Off (අක්‍රියයි)</option>
                  <option value="24h">24 Hours (පැය 24)</option>
                  <option value="7d">7 Days (දින 7)</option>
                  <option value="90d">90 Days (දින 90)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-black text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              අවලංගු කරන්න (Cancel)
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(nameError) || Boolean(usernameError)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 active:scale-95 text-white text-xs font-black transition-all shadow-md shadow-indigo-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Users className="w-4 h-4" />
              <span>කණ්ඩායම සාදන්න (Create Group)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

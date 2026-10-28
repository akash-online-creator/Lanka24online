import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Smile, 
  Pin, 
  PinOff, 
  Users, 
  Shield, 
  ShieldCheck, 
  Settings, 
  QrCode, 
  Share2, 
  Phone, 
  UserPlus, 
  Trash2, 
  Info, 
  Clock, 
  Sparkles, 
  Check, 
  Copy, 
  MessageSquare,
  AlertCircle,
  MoreVertical,
  ChevronLeft,
  Lock,
  Globe,
  ShieldAlert,
  MapPin,
  Compass,
  Navigation,
  Mic
} from 'lucide-react';
import { 
  GroupItem, 
  GroupMessage, 
  GroupMember, 
  GroupPermissions, 
  Language, 
  User,
  GroupJoinRequest,
  GroupMessageLocation,
  TelegramMediaRecord
} from '../types';
import { GroupChatMapPickerModal } from './GroupChatMapPickerModal';
import { GroupChatMapViewerModal } from './GroupChatMapViewerModal';
import { ChatLocationCard } from './ChatLocationCard';
import { AudioVoiceRecorder, AudioVoicePlayer } from './AudioVoiceNote';
import { TelegramGroupEditModal } from './TelegramGroupEditModal';
import { 
  getStoredGroupMessages, 
  saveGroupMessageToStorage, 
  togglePinGroupMessage, 
  getStoredGroups, 
  saveGroupsToStorage,
  getStoredGroupInvites,
  saveGroupInvitesToStorage,
  getStoredGroupJoinRequests,
  acceptGroupJoinRequest,
  rejectGroupJoinRequest
} from '../data/groupWorkData';

interface GroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: GroupItem;
  currentUser: User;
  lang: Language;
  registeredUsers?: User[];
  onUpdateGroup?: (updated: GroupItem) => void;
}

export const GroupChatModal: React.FC<GroupChatModalProps> = ({
  isOpen,
  onClose,
  group: initialGroup,
  currentUser,
  lang,
  registeredUsers = [],
  onUpdateGroup
}) => {
  const [group, setGroup] = useState<GroupItem>(initialGroup);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isTelegramEditOpen, setIsTelegramEditOpen] = useState(false);

  // Map Location Sharing States
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [viewingLocation, setViewingLocation] = useState<GroupMessageLocation | null>(null);

  // Group Join Requests (for Admins)
  const [groupJoinRequests, setGroupJoinRequests] = useState<GroupJoinRequest[]>(() =>
    initialGroup && initialGroup.id
      ? getStoredGroupJoinRequests().filter((r) => r && r.groupId === initialGroup.id && r.status === 'pending')
      : []
  );

  const refreshJoinRequests = () => {
    if (!group || !group.id) return;
    setGroupJoinRequests(
      getStoredGroupJoinRequests().filter((r) => r && r.groupId === group.id && r.status === 'pending')
    );
  };

  // Group Info / Member management sub-states
  const [addPhoneInput, setAddPhoneInput] = useState('');
  const [addPhoneError, setAddPhoneError] = useState('');
  const [addPhoneSuccess, setAddPhoneSuccess] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if current user is an admin
  const currentUserId = currentUser?.userId || currentUser?.id || '';
  const currentMemberRecord = group?.members?.find(
    (m) => m && (m.userId === currentUserId || (currentUser?.phone && m.phone === currentUser?.phone))
  );

  const isAdmin = currentMemberRecord?.role === 'admin' || 
    group?.creatorId === currentUserId ||
    (group?.createdBy as any)?.id === currentUserId ||
    (group?.createdBy as any)?.userId === currentUserId ||
    (currentUser as any)?.role === 'admin';
  const canSendMessages = isAdmin || Boolean(group?.permissions?.sendNewMessages);
  const canEditSettings = isAdmin || Boolean(group?.permissions?.editGroupSettings);
  const canAddMembers = isAdmin || Boolean(group?.permissions?.addOtherMembers);
  const canInviteViaLink = isAdmin || Boolean(group?.permissions?.inviteViaLinkOrQr);

  // Sync group, messages, and join requests when prop or remote Firestore data changes
  useEffect(() => {
    setGroup(initialGroup);
    if (isOpen && initialGroup?.id) {
      const remoteMsgs = Array.isArray((initialGroup as any).groupMessages)
        ? (initialGroup as any).groupMessages
        : getStoredGroupMessages(initialGroup.id);
      setMessages(remoteMsgs);
      setGroupJoinRequests(
        getStoredGroupJoinRequests().filter((r) => r && r.groupId === initialGroup.id && r.status === 'pending')
      );
    }
  }, [initialGroup, isOpen]);

  // Load group messages on open or group id change
  useEffect(() => {
    if (isOpen && group?.id) {
      const msgs = getStoredGroupMessages(group.id);
      setMessages(msgs);
      refreshJoinRequests();
    }
  }, [isOpen, group?.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Quick Emojis
  const quickEmojis = ['🤝', '👍', '🙏', '❤️', '🌿', '🎉', '🔥', '👏', '💡', '📍', '⏱️', '🛠️', '☕', '😊', '✅', '⭐'];

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    if (!canSendMessages) {
      alert('කණ්ඩායම් පරිපාලක විසින් සාමාජිකයින්ට පණිවිඩ යැවීම අත්හිටුවා ඇත.');
      return;
    }

    const newMessage: GroupMessage = {
      id: `gmsg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      groupId: group.id,
      senderId: currentUserId,
      senderName: currentUser?.name || 'පරිශීලක',
      senderPhone: currentUser?.phone || '',
      senderPhotoUrl: currentUser?.photoUrl || '',
      senderRole: isAdmin ? 'admin' : 'member',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMs: Date.now()
    };

    const updated = saveGroupMessageToStorage(group.id, newMessage);
    setMessages(updated);
    setInputText('');
  };

  // Send Map Location Message
  const handleSendLocation = (loc: GroupMessageLocation) => {
    if (!canSendMessages) {
      alert('කණ්ඩායම් පරිපාලක විසින් සාමාජිකයින්ට පණිවිඩ යැවීම අත්හිටුවා ඇත.');
      return;
    }

    const newMessage: GroupMessage = {
      id: `gmsg_loc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      groupId: group.id,
      senderId: currentUserId,
      senderName: currentUser?.name || 'පරිශීලක',
      senderPhone: currentUser?.phone || '',
      senderPhotoUrl: currentUser?.photoUrl || '',
      senderRole: isAdmin ? 'admin' : 'member',
      text: loc.note ? `📍 ${loc.name} - ${loc.note}` : `📍 ස්ථානය: ${loc.name}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMs: Date.now(),
      location: loc
    };

    const updated = saveGroupMessageToStorage(group.id, newMessage);
    setMessages(updated);
  };

  // Send Voice Note Audio Message
  const handleSendVoiceAudio = (audioUrl: string, durationSec: number) => {
    if (!canSendMessages) {
      alert('කණ්ඩායම් පරිපාලක විසින් සාමාජිකයින්ට පණිවිඩ යැවීම අත්හිටුවා ඇත.');
      return;
    }

    const newMessage: GroupMessage = {
      id: `gmsg_voice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      groupId: group.id,
      senderId: currentUserId,
      senderName: currentUser?.name || 'පරිශීලක',
      senderPhone: currentUser?.phone || '',
      senderPhotoUrl: currentUser?.photoUrl || '',
      senderRole: isAdmin ? 'admin' : 'member',
      text: '🎙️ [හඬ පණිවිඩය / Voice Note]',
      audioUrl,
      audioDurationSec: durationSec,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMs: Date.now()
    };

    const updated = saveGroupMessageToStorage(group.id, newMessage);
    setMessages(updated);
    setIsRecordingVoice(false);
  };

  const handleTogglePin = (msgId: string) => {
    if (!canEditSettings && !isAdmin) {
      alert('පණිවිඩ Pin කිරීමට පරිපාලක අවසර අවශ්‍යයි.');
      return;
    }
    const updated = togglePinGroupMessage(group.id, msgId);
    setMessages(updated);
  };

  // Add Member by Phone from within Group
  const handleAddMember = () => {
    setAddPhoneError('');
    setAddPhoneSuccess('');
    const raw = addPhoneInput.trim().replace(/[^0-9+]/g, '');
    if (!raw) {
      setAddPhoneError('කරුණාකර දුරකථන අංකය ඇතුළත් කරන්න.');
      return;
    }

    // Check if already member
    if (group.members.some((m) => m.phone.replace(/[^0-9+]/g, '') === raw)) {
      setAddPhoneError('මෙම පුද්ගලයා දැනටමත් කණ්ඩායමේ සිටියි හෝ ආරාධනා කර ඇත.');
      return;
    }

    const matched = registeredUsers.find(
      (u) =>
        (u.phone && u.phone.replace(/[^0-9+]/g, '') === raw) ||
        (u.whatsappNumber && u.whatsappNumber.replace(/[^0-9+]/g, '') === raw)
    );

    if (!matched) {
      setAddPhoneError(`"${addPhoneInput}" අංකය සහිත ලියාපදිංචි පරිශීලකයෙක් හමු නොවිණි.`);
      return;
    }

    const newMember: GroupMember = {
      userId: matched.userId || matched.id,
      name: matched.name,
      phone: matched.phone || matched.whatsappNumber || '',
      photoUrl: matched.photoUrl || '',
      role: 'member',
      status: 'pending_invite',
      joinedAt: new Date().toLocaleString()
    };

    const updatedGroup: GroupItem = {
      ...group,
      members: [...group.members, newMember]
    };

    // Save group
    const allGroups = getStoredGroups();
    const newGroups = allGroups.map((g) => (g.id === group.id ? updatedGroup : g));
    saveGroupsToStorage(newGroups);
    setGroup(updatedGroup);
    if (onUpdateGroup) onUpdateGroup(updatedGroup);

    // Send Invite Notification to target user's Inbox
    const existingInvites = getStoredGroupInvites();
    const newNotification = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      groupId: group.id,
      groupName: group.name,
      groupUsername: group.username,
      groupPhotoUrl: group.photoUrl,
      subCategory: group.subCategory,
      inviterName: currentUser?.name || 'පරිපාලක',
      inviterPhone: currentUser?.phone || '',
      targetPhone: matched.phone || matched.whatsappNumber || '',
      targetUserId: matched.userId || matched.id,
      status: 'pending' as const,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMs: Date.now()
    };
    saveGroupInvitesToStorage([newNotification, ...existingInvites]);

    setAddPhoneSuccess(`✅ ${matched.name} වෙත සාර්ථකව ආරාධනාවක් යවන ලදී (Inbox Request Sent).`);
    setAddPhoneInput('');
  };

  // Toggle Admin / Member role
  const handleToggleMemberRole = (targetUserId: string) => {
    if (!isAdmin) return;
    const updatedMembers = group.members.map((m) => {
      if (m.userId === targetUserId) {
        return {
          ...m,
          role: m.role === 'admin' ? ('member' as const) : ('admin' as const)
        };
      }
      return m;
    });

    const updatedGroup: GroupItem = {
      ...group,
      members: updatedMembers
    };

    const allGroups = getStoredGroups();
    const newGroups = allGroups.map((g) => (g.id === group.id ? updatedGroup : g));
    saveGroupsToStorage(newGroups);
    setGroup(updatedGroup);
    if (onUpdateGroup) onUpdateGroup(updatedGroup);
  };

  // Remove Member
  const handleRemoveMember = (targetUserId: string) => {
    if (!isAdmin) return;
    if (targetUserId === group.creatorId) {
      alert('කණ්ඩායමේ නිර්මාතෘ (Creator) ඉවත් කළ නොහැක.');
      return;
    }

    const updatedMembers = group.members.filter((m) => m.userId !== targetUserId);
    const updatedGroup: GroupItem = {
      ...group,
      members: updatedMembers
    };

    const allGroups = getStoredGroups();
    const newGroups = allGroups.map((g) => (g.id === group.id ? updatedGroup : g));
    saveGroupsToStorage(newGroups);
    setGroup(updatedGroup);
    if (onUpdateGroup) onUpdateGroup(updatedGroup);
  };

  const handleCopyLink = () => {
    const link = `https://sahaya.lk/group/${group.username.replace('@', '')}?code=${group.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const pinnedMessages = messages.filter((m) => m.isPinned);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div 
        className="bg-white dark:bg-zinc-900 border-2 border-indigo-500/80 rounded-3xl w-full max-w-3xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Chat Room Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-indigo-100 dark:border-zinc-800 bg-gradient-to-r from-indigo-700 via-indigo-800 to-violet-800 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={group.photoUrl || 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=150&q=80'}
                alt={group.name}
                className="w-11 h-11 rounded-2xl object-cover border-2 border-white/40 shadow-sm"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-indigo-900 rounded-full" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                  {group.name}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-indigo-100 font-bold shrink-0">
                  {group.username}
                </span>
                {group.privacy === 'private' ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-bold flex items-center gap-1 border border-amber-400/40 shrink-0">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Private</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-bold flex items-center gap-1 border border-emerald-400/40 shrink-0">
                    <Globe className="w-2.5 h-2.5" />
                    <span>Public</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-indigo-200">
                <span className="flex items-center gap-1 font-bold">
                  <Users className="w-3 h-3" />
                  {group.members.filter((m) => m.status === 'active').length} Active Members
                </span>
                <span>•</span>
                <span className="text-emerald-300 font-medium">සක්‍රීයයි (Active)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsTelegramEditOpen(true)}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="කණ්ඩායම් සැකසුම් (Telegram Admin Settings)"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">සැකසුම්</span>
              </button>
            )}

            {canInviteViaLink && (
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="QR Code & Link Share"
              >
                <QrCode className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowGroupInfo(!showGroupInfo)}
              className={`p-2 rounded-xl text-white transition-colors cursor-pointer ${
                showGroupInfo ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
              }`}
              title="Group Info & Settings"
            >
              <Info className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer ml-1"
              title="වසන්න"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pinned Messages Banner */}
        {pinnedMessages.length > 0 && pinnedMessages[pinnedMessages.length - 1] && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-4 py-2 flex items-center justify-between text-xs text-amber-950 dark:text-amber-200 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Pin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-black shrink-0">Pinned Message:</span>
              <span className="truncate italic">{pinnedMessages[pinnedMessages.length - 1]?.text}</span>
            </div>
            {canEditSettings && pinnedMessages[pinnedMessages.length - 1]?.id && (
              <button
                type="button"
                onClick={() => handleTogglePin(pinnedMessages[pinnedMessages.length - 1].id)}
                className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline shrink-0 ml-2 cursor-pointer"
              >
                Unpin
              </button>
            )}
          </div>
        )}

        {/* Main Content Area (Messages + Slide-in Group Info Drawer) */}
        <div className="flex-1 flex overflow-hidden relative bg-slate-50/70 dark:bg-zinc-950">
          {/* Chat Messages Stream */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3">
              {/* Group Welcome Card */}
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-indigo-100 dark:border-zinc-800 text-center max-w-md mx-auto shadow-xs my-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center mx-auto mb-2 text-xl font-bold">
                  🤝
                </div>
                <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-zinc-100">
                  {group.name} කණ්ඩායමට සාදරයෙන් පිළිගනිමු!
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {group.description}
                </p>
                {group.welcomeMessageEnabled && group.welcomeMessageText && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium italic">
                    💬 "{group.welcomeMessageText}"
                  </div>
                )}
                <div className="mt-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  🛡️ Admin: {group.creatorName} {isAdmin && group.creatorPhone ? `(${group.creatorPhone})` : ''}
                </div>
              </div>

              {messages.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-xs">
                  තවමත් පණිවිඩ නොමැත. සංවාදය ආරම්භ කිරීමට පහතින් පණිවිඩයක් යවන්න.
                </div>
              ) : (
                messages.map((msg, mIdx) => {
                  const isMe = msg.senderId === currentUserId;
                  const isMsgAdmin = msg.senderRole === 'admin';

                  return (
                    <div
                      key={`chat_msg_${msg.id || 'm'}_${mIdx}`}
                      className={`flex gap-2 max-w-[85%] sm:max-w-[75%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center border border-indigo-200 dark:border-zinc-700">
                        {msg.senderPhotoUrl ? (
                          <img 
                            src={msg.senderPhotoUrl} 
                            alt={msg.senderName || 'Sender'} 
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                            {(msg.senderName || 'U').charAt(0)}
                          </span>
                        )}
                      </div>

                      {/* Bubble Container */}
                      <div className="space-y-1">
                        <div className={`flex items-center gap-1.5 text-[10px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="font-black text-slate-700 dark:text-zinc-300">
                            {isMe ? 'ඔබ (You)' : msg.senderName}
                          </span>
                          {isMsgAdmin && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-[9px] flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" /> Admin
                            </span>
                          )}
                          <span className="text-zinc-400">{msg.timestamp}</span>
                          {msg.isPinned && (
                            <Pin className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          )}
                        </div>

                        {/* Location Card if message has location */}
                        {msg.location && (
                          <ChatLocationCard
                            location={msg.location}
                            isMe={isMe}
                            onViewMap={(loc) => setViewingLocation(loc)}
                          />
                        )}

                        {/* Audio Voice Note Player */}
                        {msg.audioUrl && (
                          <div className="space-y-1">
                            <AudioVoicePlayer
                              audioUrl={msg.audioUrl}
                              durationSec={msg.audioDurationSec || 5}
                              isMe={isMe}
                            />
                          </div>
                        )}

                        {/* Message Bubble */}
                        {!msg.audioUrl && (!msg.location || (msg.text && msg.text !== `📍 ස්ථානය: ${msg.location.name}` && msg.text !== `📍 ${msg.location.name} - ${msg.location.note}`)) && (
                          <div
                            className={`p-3 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed shadow-xs relative group ${
                              isMe
                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none'
                                : 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>

                            {/* Quick Pin Action (on hover) */}
                            {canEditSettings && (
                              <button
                                type="button"
                                onClick={() => handleTogglePin(msg.id)}
                                className={`absolute top-1 ${isMe ? '-left-6' : '-right-6'} opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-amber-500 transition-opacity cursor-pointer`}
                                title={msg.isPinned ? 'Unpin message' : 'Pin message'}
                              >
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Emoji Bar */}
            <div className="px-3 py-1.5 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 mr-1">
                Emojis:
              </span>
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setInputText((prev) => prev + emoji)}
                  className="w-7 h-7 rounded-lg hover:bg-indigo-50 dark:hover:bg-zinc-800 flex items-center justify-center text-sm transition-transform active:scale-125 cursor-pointer shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Message Input & Send */}
            <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
              {canSendMessages ? (
                isRecordingVoice ? (
                  <AudioVoiceRecorder
                    senderName={currentUser?.name || 'User'}
                    sourceContext="Group Chat"
                    onSendAudio={handleSendVoiceAudio}
                    onCancel={() => setIsRecordingVoice(false)}
                  />
                ) : (
                  <form onSubmit={handleSend} className="flex items-center gap-2">
                    {/* Share Location on Map Button */}
                    <button
                      type="button"
                      onClick={() => setIsMapPickerOpen(true)}
                      className="p-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-zinc-700 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0 shadow-xs"
                      title="සිතියමෙන් ස්ථානය බෙදාගන්න (Share Location on Map)"
                    >
                      <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold hidden sm:inline">ස්ථානය</span>
                    </button>

                    {/* Voice Note Button */}
                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(true)}
                      className="p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0 shadow-xs"
                      title="හඬ පණිවිඩයක් පටිගත කරන්න (Voice Note)"
                    >
                      <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </button>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="පණිවිඩය ටයිප් කරන්න (Sinhala, English, Tamil supported)..."
                      className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 font-medium text-xs sm:text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-zinc-100"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      title="යවන්න"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-center text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center justify-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  <span>පරිපාලකවරුන්ට පමණක් පණිවිඩ යැවීමට අවසර ඇත (Only Admins can send messages).</span>
                </div>
              )}
            </div>
          </div>

          {/* Group Details & Member Management Slide-in Drawer */}
          {showGroupInfo && (
            <div className="w-80 sm:w-96 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col h-full overflow-y-auto shrink-0 shadow-lg z-10 animate-in slide-in-from-right duration-200">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-600" />
                  <span>Group Info & Members</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGroupInfo(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4 text-xs text-slate-800 dark:text-zinc-100">
                {/* Group Details */}
                <div className="text-center space-y-1.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <img
                    src={group.photoUrl}
                    alt={group.name}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-cover mx-auto border-2 border-indigo-200 dark:border-zinc-700 shadow-sm"
                  />
                  <div className="font-black text-sm">{group.name}</div>
                  <div className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">{group.username}</div>
                  
                  {/* Privacy Badge */}
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border">
                    {group.privacy === 'private' ? (
                      <span className="text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Private Group (පෞද්ගලික)</span>
                      </span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span>Public Group (ප්‍රසිද්ධ)</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-500 leading-relaxed pt-1">{group.description}</p>
                </div>

                {/* Telegram Admin Settings Button */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowGroupInfo(false);
                      setIsTelegramEditOpen(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-sky-600 via-indigo-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform active:scale-95"
                  >
                    <Settings className="w-4 h-4" />
                    <span>කණ්ඩායම් පාලන සැකසුම් (Telegram Admin Settings)</span>
                  </button>
                )}

                {/* Pending Join Requests (for Admin) */}
                {isAdmin && groupJoinRequests.length > 0 && (
                  <div className="space-y-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-900">
                    <div className="font-black text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                        <span>නව සාමාජික ඉල්ලීම් ({groupJoinRequests.length})</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      {groupJoinRequests.map((req, rIdx) => (
                        <div
                          key={`join_req_${req.id || 'r'}_${rIdx}`}
                          className="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-amber-200 dark:border-zinc-700 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-xs">{req.userName}</div>
                            <span className="text-[9px] text-zinc-400 font-mono">{req.requestedAt}</span>
                          </div>
                          {req.userPhone && (
                            <div className="text-[10px] text-zinc-500 font-mono">{req.userPhone}</div>
                          )}
                          <div className="flex gap-1 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const res = acceptGroupJoinRequest(req.groupId, req.id, currentUser);
                                if (res.success && res.updatedGroup) {
                                  setGroup(res.updatedGroup);
                                  if (onUpdateGroup) onUpdateGroup(res.updatedGroup);
                                  refreshJoinRequests();
                                }
                              }}
                              className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg cursor-pointer"
                            >
                              අනුමත කරන්න
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const res = rejectGroupJoinRequest(req.groupId, req.id, currentUser);
                                if (res.success) {
                                  refreshJoinRequests();
                                }
                              }}
                              className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold text-[10px] rounded-lg hover:bg-rose-100 hover:text-rose-700 cursor-pointer"
                            >
                              ඉවත්
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Member By Phone (if permitted) */}
                {canAddMembers && (
                  <div className="space-y-2 p-3 rounded-2xl bg-indigo-50/60 dark:bg-zinc-800 border border-indigo-100 dark:border-zinc-700">
                    <div className="font-black text-[11px] text-indigo-950 dark:text-indigo-200 flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                      <span>දුරකථන අංකයෙන් සාමාජිකයෙකු එක්කරන්න</span>
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={addPhoneInput}
                        onChange={(e) => setAddPhoneInput(e.target.value)}
                        placeholder="0771234567"
                        className="flex-1 px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 font-mono text-xs outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddMember}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
                      >
                        Add
                      </button>
                    </div>
                    {addPhoneError && (
                      <p className="text-[10px] font-bold text-rose-600">{addPhoneError}</p>
                    )}
                    {addPhoneSuccess && (
                      <p className="text-[10px] font-bold text-emerald-600">{addPhoneSuccess}</p>
                    )}
                  </div>
                )}

                {/* Members List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[11px] uppercase tracking-wider text-zinc-500">
                      සාමාජිකයන් ({group.members.length})
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Admin පාලනය
                    </span>
                  </div>

                  <div className="space-y-2">
                    {group.members.map((m, mIdx) => {
                      const isMemAdmin = m.role === 'admin';
                      const isCreator = m.userId === group.creatorId;

                      return (
                        <div
                          key={`group_mem_${m.userId || m.phone || 'm'}_${mIdx}`}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                              {m.photoUrl ? (
                                <img 
                                  src={m.photoUrl} 
                                  alt={m.name || 'Member'} 
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <span className="font-bold text-indigo-700 dark:text-indigo-300">
                                  {(m.name || 'U').charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-black truncate flex items-center gap-1">
                                <span>{m.name}</span>
                                {isMemAdmin && (
                                  <span className="px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[9px]">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-400 font-mono truncate">
                                {isAdmin || m.userId === currentUserId ? m.phone : '07* *** **** (🔒 ආරක්ෂිතයි)'}
                              </div>
                              {m.status === 'pending_invite' && (
                                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded">
                                  Pending Invite (ආරාධනා යවා ඇත)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Admin Controls */}
                          {isAdmin && !isCreator && m.userId !== currentUserId && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleMemberRole(m.userId)}
                                className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                  isMemAdmin
                                    ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
                                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                }`}
                                title={isMemAdmin ? 'Demote from Admin' : 'Promote to Admin'}
                              >
                                {isMemAdmin ? 'Member කරන්න' : 'Admin කරන්න'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m.userId)}
                                className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                                title="ඉවත් කරන්න"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Group Permissions Summary */}
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-1.5 text-[11px]">
                  <div className="font-black text-indigo-950 dark:text-indigo-200">
                    🛡️ කණ්ඩායමේ අවසර සැකසුම් (Permissions):
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-400 space-y-1">
                    <div>• Send Messages: {group.permissions.sendNewMessages ? 'සියලු සාමාජිකයින්' : 'Admin පමණි'}</div>
                    <div>• Edit Settings: {group.permissions.editGroupSettings ? 'අවසර ඇත' : 'Admin පමණි'}</div>
                    <div>• Add Members: {group.permissions.addOtherMembers ? 'අවසර ඇත' : 'Admin පමණි'}</div>
                    <div>• Approve New: {group.permissions.adminApproveNewMembers ? 'Admin අනුමැතිය අවශ්‍යයි' : 'සෘජු ප්‍රවේශය'}</div>
                    <div>• Disappearing Timer: {group.permissions.disappearingTimer || 'Off'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* QR Code & Share Link Modal */}
        {showQrModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border-2 border-indigo-500 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  <span>Group Invite & QR Code</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Simulated Visual QR Card */}
              <div className="bg-white p-4 rounded-2xl border-2 border-indigo-200 inline-block mx-auto shadow-sm">
                <div className="w-44 h-44 bg-zinc-900 rounded-xl flex flex-col items-center justify-center text-white p-2">
                  <QrCode className="w-32 h-32 text-indigo-300" />
                  <div className="text-[10px] font-mono tracking-widest text-indigo-200">
                    CODE: {group.inviteCode}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-black">{group.name}</div>
                <div className="text-[11px] font-mono text-indigo-600">{group.username}</div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied Link!' : 'Copy Invite Link'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Map Location Picker Modal */}
        <GroupChatMapPickerModal
          isOpen={isMapPickerOpen}
          onClose={() => setIsMapPickerOpen(false)}
          onSendLocation={handleSendLocation}
        />

        {/* Map Location Viewer Modal */}
        <GroupChatMapViewerModal
          isOpen={!!viewingLocation}
          onClose={() => setViewingLocation(null)}
          location={viewingLocation}
        />

        {/* Telegram Group Edit Modal */}
        {isTelegramEditOpen && (
          <TelegramGroupEditModal
            isOpen={isTelegramEditOpen}
            onClose={() => setIsTelegramEditOpen(false)}
            group={group}
            currentUser={currentUser}
            onGroupUpdated={(updated) => {
              setGroup(updated);
              if (onUpdateGroup) onUpdateGroup(updated);
            }}
            onGroupDeleted={() => {
              setIsTelegramEditOpen(false);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
};

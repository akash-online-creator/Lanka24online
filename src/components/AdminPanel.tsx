import React, { useState, useMemo } from 'react';
import { 
  User, 
  Issue, 
  Language, 
  HelpPost, 
  RedAlertItem 
} from '../types';
import { translations } from '../data/translations';
import { AppLogo } from './AppLogo';
import { MemoryStorageBar } from './MemoryStorageBar';
import { deduplicateUsers } from '../utils/userUtils';
import { useUserMode } from '../context/UserModeContext';
import { 
  deleteUserAccount,
  deleteHelpPostFromFirestore,
  syncUserProfileToFirestore
} from '../lib/firebase';
import { AdminCreditManagement } from './AdminCreditManagement';
import { AdminEmergencyDirectoryManagement } from './AdminEmergencyDirectoryManagement';
import { AdminIssuesManagement } from './AdminIssuesManagement';
import { AdminRedAlertManagement } from './AdminRedAlertManagement';
import { AdminSearchDictionaryManager } from './AdminSearchDictionaryManager';
import { AdminTrustManagement } from './AdminTrustManagement';
import { AdminPresenceDashboard } from './AdminPresenceDashboard';
import { AdminUserInspectionModal } from './AdminUserInspectionModal';
import { AdminEditUserModal } from './AdminEditUserModal';
import { AdminPasswordResetsManagement } from './AdminPasswordResetsManagement';
import { 
  Users, 
  CheckCircle2, 
  MessageSquare, 
  Search, 
  Trash2, 
  Phone, 
  MapPin, 
  AlertTriangle, 
  Coins, 
  Radio, 
  BookOpen, 
  Eye, 
  LogOut,
  FileText,
  Activity,
  Award,
  Edit,
  KeyRound
} from 'lucide-react';

interface AdminPanelProps {
  currentUser?: User | null;
  users?: User[];
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
  helpPosts?: HelpPost[];
  setHelpPosts?: React.Dispatch<React.SetStateAction<HelpPost[]>>;
  issues?: Issue[];
  setIssues?: React.Dispatch<React.SetStateAction<Issue[]>>;
  redAlerts?: RedAlertItem[];
  setRedAlerts?: React.Dispatch<React.SetStateAction<RedAlertItem[]>>;
  language?: Language;
  setLanguage?: (lang: Language) => void;
  onLogout?: () => void;
  onSwitchToUserMode?: () => void;
  onNavigate?: (view: any) => void;
  onDeletePost?: (postId: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser = null,
  users: rawUsers = [],
  setUsers,
  helpPosts = [],
  setHelpPosts,
  issues = [],
  setIssues,
  redAlerts = [],
  setRedAlerts,
  language = 'si',
  setLanguage,
  onLogout,
  onSwitchToUserMode,
  onNavigate,
}) => {
  const { isUserMode, toggleUserMode } = useUserMode();
  const t = translations[language] || translations.si;

  const users = useMemo(() => deduplicateUsers(rawUsers), [rawUsers]);

  const [activeTab, setActiveTab] = useState<
    'users' | 'posts' | 'credits' | 'emergency' | 'red_alerts' | 'issues' | 'dictionary' | 'trust' | 'presence' | 'password_resets'
  >('users');

  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('pending');
  const [postSearch, setPostSearch] = useState('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // User inspection and editing modal states
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // ----------------------------------------------------
  // 📥 Automatic JSON Download Helper for Deleted Post Backup
  // ----------------------------------------------------
  const downloadPostBackupJSON = (post: HelpPost) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `deleted_post_${post.postCode || post.id}_${timestamp}.json`;

    const backupData = {
      deletedAt: new Date().toISOString(),
      deletedBy: currentUser?.name || 'ADMIN',
      adminId: currentUser?.id || 'UNKNOWN',
      postData: post,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ----------------------------------------------------
  // 🗑️ Permanent Post Delete Handler
  // ----------------------------------------------------
  const handleDeletePostPermanently = async (postId: string) => {
    const postToDelete = helpPosts.find((p) => p && p.id === postId);
    if (!postToDelete) return;

    const confirmDelete = window.confirm(
      `මෙම දැන්වීම සදහටම මකා දැමීමට අවශ්‍යද?\n\nකේතය: ${postToDelete.postCode || postToDelete.id}\nමාතෘකාව: ${postToDelete.title}\n\nමකා දැමීමට පෙර JSON Backup ගොනුවක් ස්වයංක්‍රීයව ඔබගේ උපාංගයට Download වනු ඇත.`
    );
    if (!confirmDelete) return;

    try {
      downloadPostBackupJSON(postToDelete);
      await deleteHelpPostFromFirestore(postId);

      if (setHelpPosts) {
        setHelpPosts((prev) => (prev || []).filter((p) => p && p.id !== postId));
      }

      showNotification('✅ දැන්වීම සාර්ථකව මකා දමන ලදී (Backup JSON ගොනුව බාගත විය)');
    } catch (err: any) {
      console.error('Delete Post Permanently Error:', err);
      showNotification('❌ දැන්වීම මකා දැමීමේදී දෝෂයක් සිදු විය: ' + (err?.message || ''));
    }
  };

  // ----------------------------------------------------
  // 🗑️ Permanent User Account Delete Handler
  // ----------------------------------------------------
  const handleDeleteUserPermanently = async (userToDelete: User) => {
    const isSuperAdmin = currentUser?.role === 'super_admin';
    if (!isSuperAdmin) {
      alert('ගිණුම් සදහටම මකා දැමීමේ බලය ඇත්තේ ප්‍රධාන පරිපාලක (Super Admin) හට පමණි.');
      return;
    }

    const confirm1 = window.confirm(
      `අවවාදයයි: ඔබ සූදානම් වන්නේ "${userToDelete.name}" (${userToDelete.nic || userToDelete.userId || userToDelete.id}) ගිණුම සදහටම පද්ධතියෙන් මකා දැමීමටයි.\n\nමෙම ක්‍රියාව ආපසු හැරවිය නොහැක. ඉදිරියට යන්නේද?`
    );
    if (!confirm1) return;

    const enteredNic = window.prompt(
      `තහවුරු කිරීම සඳහා කරුණාකර අදාළ පරිශීලකයාගේ NIC අංකය (${userToDelete.nic || userToDelete.userId}) මෙහි ඇතුළත් කරන්න:`
    );
    const targetNic = (userToDelete.nic || userToDelete.userId || '').trim().toUpperCase();
    if (!enteredNic || enteredNic.trim().toUpperCase() !== targetNic) {
      alert('NIC අංකය නොගැළපේ. මකා දැමීම අවලංගු කරන ලදී.');
      return;
    }

    try {
      await deleteUserAccount(userToDelete.id);

      if (setUsers) {
        setUsers((prev) => (prev || []).filter((u) => u && u.id !== userToDelete.id));
      }

      setInspectingUser(null);
      showNotification(`✅ "${userToDelete.name}" ගිණුම පද්ධතියෙන් සදහටම මකා දමන ලදී.`);
    } catch (err: any) {
      console.error('Delete User Account Error:', err);
      showNotification('❌ පරිශීලක ගිණුම මකා දැමීම අසාර්ථක විය: ' + (err?.message || ''));
    }
  };

  // ----------------------------------------------------
  // User Filtering & Search
  // ----------------------------------------------------
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (!u) return false;
      const matchesFilter = userFilter === 'all' ? true : u.status === userFilter;
      const cleanSearch = userSearch.trim().toLowerCase();
      const matchesSearch =
        !cleanSearch ||
        (u.name && u.name.toLowerCase().includes(cleanSearch)) ||
        (u.nic && u.nic.toLowerCase().includes(cleanSearch)) ||
        (u.whatsappPhone && u.whatsappPhone.includes(cleanSearch)) ||
        (u.city && u.city.toLowerCase().includes(cleanSearch));
      return matchesFilter && matchesSearch;
    });
  }, [users, userFilter, userSearch]);

  const pendingUsersCount = useMemo(() => {
    return users.filter((u) => u && u.status === 'pending').length;
  }, [users]);

  const activeAlertsCount = useMemo(() => {
    return redAlerts.filter((a) => a && (a.isActive || a.status === 'active')).length;
  }, [redAlerts]);

  const pendingIssuesCount = useMemo(() => {
    return issues.filter((i) => i && i.status === 'pending').length;
  }, [issues]);

  // ----------------------------------------------------
  // User Actions (Approve / Block / Unblock / Save Edit)
  // ----------------------------------------------------
  const handleApproveUser = async (userToApprove: User) => {
    try {
      const updated: User = {
        ...userToApprove,
        status: 'approved',
        updatedAt: new Date().toISOString(),
      };
      await syncUserProfileToFirestore(userToApprove.id, updated);
      if (setUsers) {
        setUsers((prev) => (prev || []).map((u) => (u && u.id === userToApprove.id ? updated : u)));
      }
      setInspectingUser(null);
      showNotification(`✅ ${userToApprove.name} සාර්ථකව අනුමත කරන ලදී!`);
    } catch (err) {
      showNotification('❌ පරිශීලකයා අනුමත කිරීමේදී දෝෂයක් ඇති විය.');
    }
  };

  const handleBlockUser = async (userToBlock: User) => {
    try {
      const updated: User = {
        ...userToBlock,
        status: 'blocked',
        updatedAt: new Date().toISOString(),
      };
      await syncUserProfileToFirestore(userToBlock.id, updated);
      if (setUsers) {
        setUsers((prev) => (prev || []).map((u) => (u && u.id === userToBlock.id ? updated : u)));
      }
      setInspectingUser(null);
      showNotification(`🚫 ${userToBlock.name} අවහිර (Block) කරන ලදී.`);
    } catch (err) {
      showNotification('❌ පරිශීලකයා අවහිර කිරීමේදී දෝෂයක් ඇති විය.');
    }
  };

  const handleUnblockUser = async (userToUnblock: User) => {
    try {
      const updated: User = {
        ...userToUnblock,
        status: 'approved',
        updatedAt: new Date().toISOString(),
      };
      await syncUserProfileToFirestore(userToUnblock.id, updated);
      if (setUsers) {
        setUsers((prev) => (prev || []).map((u) => (u && u.id === userToUnblock.id ? updated : u)));
      }
      setInspectingUser(null);
      showNotification(`✅ ${userToUnblock.name} නැවත සක්‍රීය (Unblock) කරන ලදී.`);
    } catch (err) {
      showNotification('❌ අගුළු හැරීමේදී දෝෂයක් ඇති විය.');
    }
  };

  const handleSaveEditedUser = async (updatedData: Partial<User>) => {
    if (!editingUser) return;
    try {
      const merged: User = {
        ...editingUser,
        ...updatedData,
        updatedAt: new Date().toISOString(),
      };
      await syncUserProfileToFirestore(editingUser.id, merged);
      if (setUsers) {
        setUsers((prev) => (prev || []).map((u) => (u && u.id === editingUser.id ? merged : u)));
      }
      setEditingUser(null);
      showNotification(`✅ ${merged.name} ගේ විස්තර සාර්ථකව යාවත්කාලීන විය.`);
    } catch (err) {
      showNotification('❌ විස්තර යාවත්කාලීන කිරීමේදී දෝෂයක් ඇති විය.');
    }
  };

  const handleDeleteUserAction = async (userToDelete: User) => {
    await handleDeleteUserPermanently(userToDelete);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Toast Notification Banner */}
      {notificationMsg && (
        <div className="fixed top-4 right-4 z-50 bg-[#07170e] text-emerald-300 border-2 border-emerald-500/80 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{notificationMsg}</span>
        </div>
      )}

      {/* Top Admin Header Bar */}
      <div className="bg-white dark:bg-[#07170e] rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-[#153422] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <AppLogo size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                සහය සේවා • පරිපාලක පාලක පුවරුව
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {currentUser?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#7f9f8c] font-medium">
              පද්ධති පරිශීලකයින්, දැන්වීම්, ආරක්ෂක තොරතුරු සහ හදිසි ඇඟවීම් පාලනය
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onSwitchToUserMode && (
            <button
              type="button"
              onClick={onSwitchToUserMode}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-[#0c2417] text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-xs transition-all cursor-pointer border border-emerald-200 dark:border-[#173a26]"
            >
              <Eye className="w-4 h-4" />
              <span>User Mode එකට පිවිසෙන්න</span>
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-bold text-xs transition-all cursor-pointer border border-rose-200 dark:border-rose-900/60"
            >
              <LogOut className="w-4 h-4" />
              <span>පිටවෙන්න</span>
            </button>
          )}
        </div>
      </div>

      <MemoryStorageBar 
        helpPosts={helpPosts} 
        users={users} 
        issues={issues} 
      />

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'users', label: 'පරිශීලකයින්', icon: Users, badge: pendingUsersCount },
          { id: 'posts', label: 'දැන්වීම් පාලනය', icon: FileText, count: helpPosts.length },
          { id: 'credits', label: 'ක්‍රෙඩිට් කළමනාකරණය', icon: Coins },
          { id: 'emergency', label: 'හදිසි නාමාවලිය', icon: Phone },
          { id: 'red_alerts', label: 'රතු එළිය (Disaster)', icon: Radio, badge: activeAlertsCount },
          { id: 'issues', label: 'ගැටලු & උපකාර', icon: MessageSquare, badge: pendingIssuesCount },
          { id: 'dictionary', label: 'සෙවුම් ඩික්ෂනරිය', icon: BookOpen },
          { id: 'trust', label: 'විශ්වාසනීයතා ලාංඡන', icon: Award },
          { id: 'presence', label: 'සජීවී සක්‍රීයතාව', icon: Activity },
          { id: 'password_resets', label: 'මුරපද ඉල්ලීම්', icon: KeyRound },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer shrink-0 shadow-xs ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-[#007a4b] text-white shadow-md shadow-emerald-700/30'
                  : 'bg-white dark:bg-[#07170e] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#12281b] border border-slate-200 dark:border-[#153422]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
              <span>{tab.label}</span>
              {Boolean(tab.badge && tab.badge > 0) && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-black animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: User Management & Approvals */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-[#0a1a11] rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-[#173a26] shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#173d27]">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>පරිශීලක කළමනාකරණය සහ අනුමැතිය (User Approvals)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                මුළු පරිශීලකයින්: {users.length} • අනුමැතිය බලාපොරොත්තුවෙන්: {pendingUsersCount}
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-[#07170e] p-1.5 rounded-2xl border border-slate-200/80 dark:border-[#153422] text-xs font-bold">
              {(['pending', 'approved', 'blocked', 'all'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setUserFilter(f)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer capitalize ${
                    userFilter === f
                      ? 'bg-[#007a4b] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {f === 'pending'
                    ? `අනුමැතිය සඳහා (${pendingUsersCount})`
                    : f === 'approved'
                    ? 'අනුමත කළ'
                    : f === 'blocked'
                    ? 'අවහිර කළ'
                    : 'සියල්ල'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="නම, NIC, දුරකථන අංකය හෝ නගරය මඟින් සොයන්න..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#07170e] border border-slate-200 dark:border-[#153422] rounded-2xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
            />
          </div>

          {/* Users Grid */}
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-[#07170e] rounded-2xl text-slate-500 text-xs">
              පරිශීලකයින් කිසිවෙකු හමු නොවීය.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredUsers.map((u) => {
                const isApproved = u.status === 'approved';
                const isBlocked = u.status === 'blocked';
                const isPending = u.status === 'pending';

                return (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-[#153422] bg-white dark:bg-[#07170e] hover:shadow-md transition-all flex flex-col justify-between gap-3 text-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u.photoUrl || u.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'}
                            alt={u.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-[#1a3824]"
                          />
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white leading-tight">
                              {u.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-mono">
                              NIC: {u.nic || u.nicNumber || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isBlocked
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {isApproved ? 'Approved' : isBlocked ? 'Blocked' : 'Pending'}
                        </span>
                      </div>

                      <div className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px] bg-slate-50 dark:bg-[#0c1f14] p-2.5 rounded-xl border border-slate-100 dark:border-[#143220]">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="font-mono">{u.whatsappPhone || u.phone || 'නොමැත'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{u.city || u.district || 'නොමැත'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-[#153422]">
                      <button
                        type="button"
                        onClick={() => setInspectingUser(u)}
                        className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#12281b] dark:hover:bg-[#193b26] text-slate-800 dark:text-slate-200 font-bold rounded-lg text-center cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>විස්තර</span>
                      </button>

                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleApproveUser(u)}
                          className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-center cursor-pointer flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>අනුමත කරන්න</span>
                        </button>
                      )}

                      {isApproved && (
                        <button
                          type="button"
                          onClick={() => handleBlockUser(u)}
                          className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold rounded-lg cursor-pointer"
                          title="Block User"
                        >
                          අවහිර
                        </button>
                      )}

                      {isBlocked && (
                        <button
                          type="button"
                          onClick={() => handleUnblockUser(u)}
                          className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold rounded-lg cursor-pointer"
                          title="Unblock User"
                        >
                          සක්‍රීය
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setEditingUser(u)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Help Posts Moderation */}
      {activeTab === 'posts' && (
        <div className="bg-white dark:bg-[#0a1a11] rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-[#173a26] shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#173d27]">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>දැන්වීම් පාලනය (Help Posts Moderation)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                පළ කර ඇති මුළු දැන්වීම් සංඛ්‍යාව: {helpPosts.length}
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="දැන්වීම් මාතෘකාව, විස්තර හෝ කේතය මඟින් සොයන්න..."
              value={postSearch}
              onChange={(e) => setPostSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#07170e] border border-slate-200 dark:border-[#153422] rounded-2xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {helpPosts
              .filter((p) => {
                if (!p) return false;
                const q = postSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                  (p.title && p.title.toLowerCase().includes(q)) ||
                  (p.description && p.description.toLowerCase().includes(q)) ||
                  (p.postCode && p.postCode.toLowerCase().includes(q))
                );
              })
              .map((post) => (
                <div
                  key={post.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-[#153422] bg-white dark:bg-[#07170e] hover:shadow-md transition-all flex flex-col justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] bg-slate-100 dark:bg-[#12281b] px-2 py-0.5 rounded text-slate-600 dark:text-emerald-400 font-bold">
                        {post.postCode || post.id}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {post.category || 'සාමාන්‍ය'}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">
                      {post.title}
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-2">
                      {post.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-[#153422] flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {post.userName || 'සාමාජිකයෙක්'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeletePostPermanently(post.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>මකා දමන්න</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab 3: Credit Management */}
      {activeTab === 'credits' && (
        <AdminCreditManagement
          users={users}
          currentUser={currentUser}
          language={language}
          onUsersUpdated={() => {}}
        />
      )}

      {/* Tab 4: Emergency Directory */}
      {activeTab === 'emergency' && (
        <AdminEmergencyDirectoryManagement
          language={language}
          currentUser={currentUser}
        />
      )}

      {/* Tab 5: Red Alerts (Disaster Management) */}
      {activeTab === 'red_alerts' && (
        <AdminRedAlertManagement
          redAlerts={redAlerts}
          currentUser={currentUser}
          language={language}
          onRedAlertsUpdated={() => {}}
        />
      )}

      {/* Tab 6: Issues Helpdesk */}
      {activeTab === 'issues' && (
        <AdminIssuesManagement
          issues={issues}
          users={users}
          currentUser={currentUser}
          language={language}
        />
      )}

      {/* Tab 7: Search Dictionary */}
      {activeTab === 'dictionary' && (
        <AdminSearchDictionaryManager
          language={language}
        />
      )}

      {/* Tab 8: Trust Badges Management */}
      {activeTab === 'trust' && (
        <AdminTrustManagement
          users={users}
          language={language}
        />
      )}

      {/* Tab 9: Live Presence */}
      {activeTab === 'presence' && (
        <AdminPresenceDashboard
          users={users}
          language={language}
        />
      )}

      {/* Tab 10: Password Reset Requests (යාවත්කාලීන කිරීමට ඇති මුරපද ලැයිස්තුව) */}
      {activeTab === 'password_resets' && (
        <AdminPasswordResetsManagement
          users={users}
          setUsers={setUsers}
          language={language}
        />
      )}

      {/* Member Inspection & NIC Verification Modal */}
      {inspectingUser && (
        <AdminUserInspectionModal
          user={inspectingUser}
          isOpen={Boolean(inspectingUser)}
          onClose={() => setInspectingUser(null)}
          onApprove={handleApproveUser}
          onBlock={handleBlockUser}
          onUnblock={handleUnblockUser}
          onEdit={(u) => {
            setInspectingUser(null);
            setEditingUser(u);
          }}
          onDelete={handleDeleteUserAction}
          language={language}
        />
      )}

      {/* Member Details Edit Modal */}
      {editingUser && (
        <AdminEditUserModal
          user={editingUser}
          isOpen={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          onSave={handleSaveEditedUser}
          language={language}
        />
      )}

    </div>
  );
};

export default AdminPanel;

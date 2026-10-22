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
import { AudioVoicePlayer } from './AudioVoiceNote';
import { deduplicateUsers } from '../utils/userUtils';
import { 
  deleteUserAccount,
  deleteHelpPostFromFirestore,
  updateHelpPostInFirestore,
  syncUserProfileToFirestore,
  updateUserInFirestore
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
import { AdminAiKnowledgeManagement } from './AdminAiKnowledgeManagement';
import { Sparkles, Sliders, QrCode, UserCheck } from 'lucide-react';
import { subscribeToSystemSettings, updateSystemSettings, getCachedSettings, SystemSettings } from '../utils/systemSettingsManager';
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
  KeyRound,
  ExternalLink
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
  const t = translations[language] || translations.si;

  const users = useMemo(() => deduplicateUsers(rawUsers), [rawUsers]);

  const [activeTab, setActiveTab] = useState<
    'users' | 'posts' | 'credits' | 'emergency' | 'red_alerts' | 'issues' | 'dictionary' | 'trust' | 'presence' | 'password_resets' | 'ai_knowledge' | 'system_controls'
  >('users');

  // 🎛️ Live System Feature Settings (QR Pay & Demo Login Toggles)
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => getCachedSettings());
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  React.useEffect(() => {
    const unsubscribe = subscribeToSystemSettings((s) => {
      setSystemSettings(s);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleSystemSetting = async (key: keyof SystemSettings, val: boolean) => {
    setIsUpdatingSettings(true);
    try {
      await updateSystemSettings({ [key]: val }, currentUser?.id);
      showNotification('✅ පද්ධති සැකසුම සාර්ථකව යාවත්කාලීන විය.');
    } catch (e) {
      showNotification('⚠️ සැකසුම යාවත්කාලීන කිරීමේදී දෝෂයක් ඇතිවිය.');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'blocked'>('pending');
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

  const handleUnhidePostByAdmin = async (postId: string) => {
    try {
      await updateHelpPostInFirestore(postId, {
        isHidden: false,
        reportsCount: 0,
        hiddenReason: null,
        reviewedByAdminAt: new Date().toISOString(),
      });

      if (setHelpPosts) {
        setHelpPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isHidden: false, reportsCount: 0, hiddenReason: undefined }
              : p
          )
        );
      }
      showNotification('✅ දැන්වීම නැවත සාර්ථකව සක්‍රිය කරන ලදී (Unhidden)!');
    } catch (err) {
      console.error('Failed to unhide post:', err);
      alert('දැන්වීම සක්‍රිය කිරීම අසාර්ථක විය. නැවත උත්සාහ කරන්න.');
    }
  };

  const handlePermanentDeletePost = async (postId: string) => {
    const postToDelete = helpPosts.find((p) => p.id === postId);
    const confirmDelete = window.confirm(
      '⚠️ මෙම දැන්වීම සහමුලින්ම Database එකෙන් සහ Cloud එකෙන් මකා දැමීමට ඔබට සහතිකද?\n\n(මෙහි දත්ත සහිත Backup JSON ගොනුවක් ඔබගේ පරිගණකයට ස්වයංක්‍රීයව බාගත වේ).'
    );
    if (!confirmDelete) return;

    if (postToDelete) {
      try {
        downloadPostBackupJSON(postToDelete);
      } catch (err) {
        console.warn('JSON backup failed:', err);
      }
    }

    try {
      await deleteHelpPostFromFirestore(postId);
      if (setHelpPosts) {
        setHelpPosts((prev) => prev.filter((p) => p.id !== postId));
      }
      showNotification('🗑️ දැන්වීම සදහටම මකා දමන ලදී (Cloud Permanently Deleted).');
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert('දැන්වීම මකා දැමීම අසාර්ථක විය.');
    }
  };

  // User Actions
  const handleApproveUser = async (userToApprove: User) => {
    try {
      const updatedUser: User = { 
        ...userToApprove, 
        status: 'approved',
        credits: userToApprove.credits || 50,
      };
      await syncUserProfileToFirestore(updatedUser);

      if (setUsers) {
        setUsers((prev) =>
          deduplicateUsers(
            prev.map((u) => (u.id === userToApprove.id ? updatedUser : u))
          )
        );
      }
      showNotification(`✅ ${userToApprove.name} සාර්ථකව අනුමත කරන ලදී!`);
    } catch (err) {
      console.error('Approval failed:', err);
      alert('අනුමත කිරීම අසාර්ථක විය.');
    }
  };

  const handleRejectUser = async (userToReject: User, rejectionReason?: string) => {
    const targetId = userToReject.id;
    const targetNic = (userToReject.nicNumber || userToReject.nic || userToReject.userId || '').trim().toUpperCase();
    const targetDigits = targetNic.replace(/[^0-9]/g, '');

    // 1. Immediately remove from local UI state across all ID and NIC matching variants
    if (setUsers) {
      setUsers((prev) =>
        prev.filter((u) => {
          if (u.id === targetId) return false;
          const uNic = (u.nicNumber || u.nic || u.userId || '').trim().toUpperCase();
          if (targetNic && (uNic === targetNic || u.userId === targetNic || u.id === targetNic)) return false;
          const uDigits = uNic.replace(/[^0-9]/g, '');
          if (targetDigits.length >= 9 && uDigits.length >= 9 && targetDigits === uDigits) return false;
          return true;
        })
      );
    }

    // 2. Perform persistent rejection & deletion in Firestore
    try {
      const docId = userToReject.id || userToReject.userId;
      
      // Update status to 'rejected' with full identity fields so Firestore security rules always pass
      if (docId) {
        try {
          await updateUserInFirestore(docId, {
            ...userToReject,
            status: 'rejected',
            isDeleted: true,
            rejectionReason: rejectionReason || 'පරිපාලක විසින් අයදුම්පත ප්‍රතික්ෂේප කර ඉවත් කරන ලදී.',
            rejectedAt: new Date().toISOString()
          });
        } catch (updateErr) {
          console.warn('updateUserInFirestore notice:', updateErr);
        }

        // Also try hard delete if permitted by security rules
        try {
          await deleteUserAccount(userToReject);
        } catch (delErr) {
          console.warn('deleteUserAccount notice:', delErr);
        }
      }

      // If document was keyed under NIC number, update that as well
      if (targetNic && targetNic !== docId) {
        try {
          await updateUserInFirestore(targetNic, {
            ...userToReject,
            status: 'rejected',
            isDeleted: true,
            rejectionReason: rejectionReason || 'පරිපාලක විසින් අයදුම්පත ප්‍රතික්ෂේප කර ඉවත් කරන ලදී.',
            rejectedAt: new Date().toISOString()
          });
        } catch (_) {}
      }

      showNotification(`❌ ${userToReject.name} ගේ අයදුම්පත සාර්ථකව ඉවත් කරන ලදී.`);
    } catch (err) {
      console.warn('Rejection cleanup notice:', err);
      showNotification(`❌ ${userToReject.name} ගේ අයදුම්පත ඉවත් කරන ලදී.`);
    }
  };

  const handleTableRejectClick = (u: User) => {
    if (window.confirm(`ඔබට ${u.name} ගේ ලියාපදිංචිය ප්‍රතික්ෂේප කර ඉවත් කිරීමට අවශ්‍ය බව විශ්වාසද?`)) {
      handleRejectUser(u);
    }
  };

  const handleBlockUser = async (userToBlock: User) => {
    const targetNic = (userToBlock.nic || '').trim().toUpperCase();
    const enteredNic = window.prompt(
      `⚠️ අනතුරු ඇඟවීමයි!\n\n${userToBlock.name} (${userToBlock.userId || userToBlock.nic}) පරිශීලකයා BLOCK කිරීමට තහවුරු කිරීම සඳහා එම පරිශීලකයාගේ ජාතික හැඳුනුම්පත් අංකය (NIC) ඇතුළත් කරන්න:`
    );

    if (enteredNic === null) return;

    if (!enteredNic || enteredNic.trim().toUpperCase() !== targetNic) {
      alert('❌ ඇතුළත් කළ හැඳුනුම්පත් අංකය (NIC) නොගැලපේ! පරිශීලකයා අවහිර කිරීම (Block) අවලංගු විය.');
      return;
    }

    try {
      const updatedUser: User = { ...userToBlock, status: 'blocked' };
      await syncUserProfileToFirestore(updatedUser);

      if (setUsers) {
        setUsers((prev) =>
          deduplicateUsers(
            prev.map((u) => (u.id === userToBlock.id ? updatedUser : u))
          )
        );
      }
      showNotification(`🚫 ${userToBlock.name} සාර්ථකව අවහිර (Blocked) කරන ලදී.`);
    } catch (err) {
      console.error('Block failed:', err);
      alert('අවහිර කිරීම අසාර්ථක විය.');
    }
  };

  const handleUnblockUser = async (userToUnblock: User) => {
    const confirmUnblock = window.confirm(`${userToUnblock.name} ගේ අවහිරය (Block) ඉවත් කිරීමට ඔබට සහතිකද?`);
    if (!confirmUnblock) return;

    try {
      const updatedUser: User = { ...userToUnblock, status: 'approved' };
      await syncUserProfileToFirestore(updatedUser);

      if (setUsers) {
        setUsers((prev) =>
          deduplicateUsers(
            prev.map((u) => (u.id === userToUnblock.id ? updatedUser : u))
          )
        );
      }
      showNotification(`🔓 ${userToUnblock.name} ගේ අවහිරය සාර්ථකව ඉවත් කරන ලදී.`);
    } catch (err) {
      console.error('Unblock failed:', err);
      alert('අවහිරය ඉවත් කිරීම අසාර්ථක විය.');
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

      await syncUserProfileToFirestore(merged);

      if (setUsers) {
        setUsers((prev) =>
          deduplicateUsers(
            prev.map((u) => (u.id === editingUser.id ? merged : u))
          )
        );
      }

      setEditingUser(null);
      showNotification(`✅ ${merged.name} ගේ විස්තර සාර්ථකව යාවත්කාලීන විය.`);
    } catch (err) {
      console.error('Failed to save edited user:', err);
      alert('පරිශීලක තොරතුරු යාවත්කාලීන කිරීම අසාර්ථක විය.');
    }
  };

  const pendingUsersCount = users.filter((u) => u.status === 'pending').length;
  const rejectedUsersCount = users.filter((u) => u.status === 'rejected').length;
  const pendingIssuesCount = issues.filter((i) => i.status === 'pending').length;
  const activeAlertsCount = redAlerts.filter((a) => a.status === 'active').length;

  return (
    <div className="w-full max-w-7xl mx-auto py-4 sm:py-6 space-y-6 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* Toast Notification Banner */}
      {notificationMsg && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-slate-900 text-white border-2 border-emerald-500 shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-xs sm:text-sm">{notificationMsg}</span>
        </div>
      )}

      {/* Top Header & Branding Card */}
      <div className="bg-white dark:bg-[#07170e] border border-slate-200 dark:border-[#153422] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <AppLogo size="md" />
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{t.adminDashboard}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                SUPER ADMIN
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              පරිශීලකයින්, ආපදා රතු එළිය, සහ පද්ධති සම්පත් සජීවීව පාලනය කරන්න
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

      {/* 📊 1. FIREBASE STORAGE & DATABASE QUOTA EXPLORER BAR */}
      <MemoryStorageBar 
        helpPosts={helpPosts} 
        users={users} 
        issues={issues} 
      />

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'users', label: 'පරිශීලකයින්', icon: Users, badge: pendingUsersCount },
          { id: 'system_controls', label: '⚙️ පද්ධති පාලන (Controls)', icon: Sliders },
          { id: 'posts', label: 'දැන්වීම් පාලනය', icon: FileText, count: helpPosts.length },
          { id: 'credits', label: 'ක්‍රෙඩිට් කළමනාකරණය', icon: Coins },
          { id: 'emergency', label: 'හදිසි නාමාවලිය', icon: Phone },
          { id: 'red_alerts', label: 'රතු එළිය (Disaster)', icon: Radio, badge: activeAlertsCount },
          { id: 'issues', label: 'ගැටලු & උපකාර', icon: MessageSquare, badge: pendingIssuesCount },
          { id: 'dictionary', label: 'සෙවුම් ඩික්ෂනරිය', icon: BookOpen },
          { id: 'trust', label: 'විශ්වාසනීයතා ලාංඡන', icon: Award },
          { id: 'presence', label: 'සජීවී සක්‍රීයතාව', icon: Activity },
          { id: 'password_resets', label: 'මුරපද ඉල්ලීම්', icon: KeyRound },
          { id: 'ai_knowledge', label: 'AI දැනුම් කේන්ද්‍රය', icon: Sparkles },
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
      {/* 🛡️ Safety & Compatibility bridge across parts */}
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
              {(['pending', 'approved', 'rejected', 'blocked', 'all'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setUserFilter(f)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer capitalize ${
                    userFilter === f
                      ? 'bg-[#007a4b] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {f === 'pending'
                    ? `අනුමැතියට (${pendingUsersCount})`
                    : f === 'approved'
                    ? 'අනුමත අය'
                    : f === 'rejected'
                    ? `ප්‍රතික්ෂේපිත (${rejectedUsersCount})`
                    : f === 'blocked'
                    ? 'අවහිර කළ අය'
                    : 'සියල්ල'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="නම, NIC, දුරකථන අංකය හෝ නගරය මඟින් සොයන්න..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#07170e] border border-slate-200 dark:border-[#153422] text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Users List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#173a26] text-slate-400 text-[11px] font-black uppercase">
                  <th className="py-3 px-3">පරිශීලකයා</th>
                  <th className="py-3 px-3">සම්බන්ධීකරණය</th>
                  <th className="py-3 px-3">හැඳුනුම්පත (NIC)</th>
                  <th className="py-3 px-3">තත්ත්වය</th>
                  <th className="py-3 px-3 text-right">ක්‍රියාමාර්ග</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#12281b]">
                {users
                  .filter((u) => {
                    if (userFilter === 'all') return true;
                    return u.status === userFilter;
                  })
                  .filter((u) => {
                    if (!userSearch.trim()) return true;
                    const q = userSearch.toLowerCase();
                    return (
                      (u.name && u.name.toLowerCase().includes(q)) ||
                      (u.nic && u.nic.toLowerCase().includes(q)) ||
                      (u.whatsappPhone && u.whatsappPhone.includes(q)) ||
                      (u.city && u.city.toLowerCase().includes(q))
                    );
                  })
                  .map((u) => {
                    const isPending = u.status === 'pending';
                    const isBlocked = u.status === 'blocked';
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-[#0f281b]/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-[#007a4b] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                              {u.name?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="block truncate max-w-[140px] sm:max-w-none">{u.name}</span>
                                {((u as any).submissionCount > 1 || (u as any).isReRegistration) && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black">
                                    Attempt #{((u as any).submissionCount || 2)}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {u.role === 'admin' ? '🛡️ Administrator' : 'සාමාජික'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span>{u.whatsappPhone || u.phone || '-'}</span>
                            {(u.whatsappPhone || u.phone) && (
                              <a
                                href={`https://wa.me/94${(u.whatsappPhone || u.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '')}?text=${encodeURIComponent('ආයුබෝවන් ' + (u.name || '') + ', ඔබ සහය සේවා (Support Service) යෙදුමේ සිදුකළ ලියාපදිංචිය සම්බන්ධයෙනි.')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 transition-colors"
                                title="WhatsApp මඟින් සම්බන්ධ වන්න"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="text-slate-400 text-[10px] flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{u.city || u.district || 'නොදනී'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          {u.nic || '-'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                              isPending
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                : u.status === 'rejected'
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                                : isBlocked
                                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                                : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                            }`}
                          >
                            {isPending ? 'අනුමැතියට' : u.status === 'rejected' ? 'ප්‍රතික්ෂේපිත' : isBlocked ? 'අවහිර' : 'සක්‍රිය'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Inspect Details Button */}
                            <button
                              type="button"
                              onClick={() => setInspectingUser(u)}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#12281b] dark:hover:bg-[#173a26] text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                              title="තොරතුරු පරීක්ෂා කරන්න (Inspect Profile)"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit Details Button */}
                            <button
                              type="button"
                              onClick={() => setEditingUser(u)}
                              className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-600 dark:text-blue-400 transition-all cursor-pointer"
                              title="විස්තර සංස්කරණය (Edit Details)"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Approve / Reject buttons for Pending */}
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveUser(u)}
                                  className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                                  title="අනුමත කරන්න"
                                >
                                  අනුමත
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTableRejectClick(u)}
                                  className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                                  title="ප්‍රතික්ෂේප කර ඉවත් කරන්න"
                                >
                                  ඉවත්
                                </button>
                              </>
                            )}

                            {/* Block / Unblock buttons */}
                            {!isPending && !isBlocked && (
                              <button
                                type="button"
                                onClick={() => handleBlockUser(u)}
                                className="px-2.5 py-1 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold text-xs transition-all cursor-pointer"
                                title="පරිශීලකයා අවහිර කරන්න (Block)"
                              >
                                Block
                              </button>
                            )}

                            {isBlocked && (
                              <button
                                type="button"
                                onClick={() => handleUnblockUser(u)}
                                className="px-2.5 py-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition-all cursor-pointer"
                                title="අවහිරය ඉවත් කරන්න (Unblock)"
                              >
                                Unblock
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Posts Management & Moderation */}
      {activeTab === 'posts' && (
        <div className="bg-white dark:bg-[#0a1a11] rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-[#173a26] shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#173d27]">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>දැන්වීම් පාලන පැනලය (Community Posts Moderation)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                මුළු දැන්වීම්: {helpPosts.length}
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                placeholder="දැන්වීම් සොයන්න..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#07170e] border border-slate-200 dark:border-[#153422] text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Posts List */}
          <div className="space-y-3">
            {helpPosts
              .filter((p) => {
                if (!postSearch.trim()) return true;
                const q = postSearch.toLowerCase();
                return (
                  (p.title && p.title.toLowerCase().includes(q)) ||
                  (p.whatHappened && p.whatHappened.toLowerCase().includes(q)) ||
                  (p.userName && p.userName.toLowerCase().includes(q)) ||
                  (p.locationName && p.locationName.toLowerCase().includes(q))
                );
              })
              .map((post) => (
                <div
                  key={post.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    post.isHidden
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                      : 'bg-slate-50/70 dark:bg-[#07170e] border-slate-200 dark:border-[#153422]'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {post.postCode || `#POST-${post.id.slice(-4)}`}
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                        {post.title || post.whatHappened || post.whatIsNeeded || 'දැන්වීම් සිරස්තලයක් නොමැත'}
                      </h4>
                      {post.isResolved && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          නිරාකරණය විය
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>👤 {post.userName || 'පරිශීලක'}</span>
                      <span>•</span>
                      <span>📍 {post.locationName || 'ස්ථානයක් නැත'}</span>
                      {Boolean(post.reportsCount && post.reportsCount > 0) && (
                        <>
                          <span>•</span>
                          <span className="text-rose-600 font-bold">
                            ⚠️ රිපෝට්: {post.reportsCount}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Audio Note Preview if exists */}
                    {post.audioUrl && (
                      <div className="pt-1 max-w-xs">
                        <AudioVoicePlayer audioUrl={post.audioUrl} durationSec={post.audioDurationSec || 15} />
                      </div>
                    )}

                    {/* Reports & Auto-hidden Alert */}
                    {post.isHidden && (
                      <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {post.hiddenReason || 'වාර්තා (Reports) නිසා මෙම දැන්වීම ස්වයංක්‍රීයව සඟවා ඇත.'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    {post.isHidden && (
                      <button
                        type="button"
                        onClick={() => handleUnhidePostByAdmin(post.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>යළි සක්‍රිය (Unhide)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handlePermanentDeletePost(post.id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      title="Cloud එකෙන් සදහටම මකා දමන්න"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab 3: Credits Management */}
      {activeTab === 'credits' && (
        <AdminCreditManagement 
          users={users} 
          setUsers={setUsers} 
          language={language} 
        />
      )}

      {/* Tab 4: Emergency Contacts Directory Management */}
      {activeTab === 'emergency' && (
        <AdminEmergencyDirectoryManagement 
          language={language} 
        />
      )}

      {/* Tab 5: Red Alerts / Disaster Reporting Management */}
      {activeTab === 'red_alerts' && (
        <AdminRedAlertManagement
          redAlerts={redAlerts}
          setRedAlerts={setRedAlerts}
          language={language}
          currentUser={currentUser}
        />
      )}

      {/* Tab 6: Issues Helpdesk */}
      {activeTab === 'issues' && (
        <AdminIssuesManagement
          issues={issues}
          setIssues={setIssues}
          language={language}
          currentUser={currentUser}
        />
      )}

      {/* Tab 7: Search Dictionary Management */}
      {activeTab === 'dictionary' && (
        <AdminSearchDictionaryManager 
          language={language} 
        />
      )}

      {/* Tab 8: Trust Badges Management */}
      {activeTab === 'trust' && (
        <AdminTrustManagement 
          users={users} 
          setUsers={setUsers} 
          language={language} 
        />
      )}

      {/* Tab 9: Presence & Real-time Active Sessions */}
      {activeTab === 'presence' && (
        <AdminPresenceDashboard 
          language={language} 
        />
      )}

      {/* Tab 10: Password Resets Management */}
      {activeTab === 'password_resets' && (
        <AdminPasswordResetsManagement 
          language={language} 
          users={users} 
          setUsers={setUsers} 
        />
      )}

      {/* Tab 11: AI Knowledge Management */}
      {activeTab === 'ai_knowledge' && (
        <AdminAiKnowledgeManagement 
          language={language} 
        />
      )}

      {/* 🎛️ System Feature Controls (QR Pay & Demo Login Toggles) */}
      {activeTab === 'system_controls' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border-2 border-slate-800 text-white shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg text-white">ප්‍රධාන පද්ධති පාලන මධ්‍යස්ථානය (System Feature Controls)</h3>
                <p className="text-xs text-slate-400">
                  පරිශීලකයින්ට දිස්වන විශේෂාංග සක්‍රීය හෝ අක්‍රීය කිරීම පරිපාලකවරයාට මෙතැනින් පාලනය කළ හැක.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* 1. QR Pay Toggle Control */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <h4 className="font-black text-sm text-white">QR Pay ගෙවීම් පද්ධතිය</h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      systemSettings.enableQrPay
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}>
                      {systemSettings.enableQrPay ? 'සක්‍රීයයි (Active)' : 'අක්‍රීයයි (Hidden)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    පරිශීලකයින් අතර QR කේත මඟින් මුදල්/ක්‍රෙඩිට් හුවමාරු කිරීමේ පහසුකම පාලනය කරන්න. මෙය අක්‍රීය කළ විට සාමාන්‍ය පරිශීලකයින්ගෙන් QR Pay සම්පූර්ණයෙන්ම සැඟවී යයි.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    තත්ත්වය: {systemSettings.enableQrPay ? 'සක්‍රීයයි (Visible)' : 'සඟවා ඇත (Hidden)'}
                  </span>
                  <button
                    type="button"
                    disabled={isUpdatingSettings}
                    onClick={() => handleToggleSystemSetting('enableQrPay', !systemSettings.enableQrPay)}
                    className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                      systemSettings.enableQrPay
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    }`}
                  >
                    {systemSettings.enableQrPay ? '🔴 QR Pay අක්‍රීය කරන්න (Turn OFF)' : '🟢 QR Pay සක්‍රීය කරන්න (Turn ON)'}
                  </button>
                </div>
              </div>

              {/* 2. User Demo Login Toggle Control */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <h4 className="font-black text-sm text-white">නරඹන්නා පිවිසුම (User Demo Mode)</h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      systemSettings.enableDemoLogin
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}>
                      {systemSettings.enableDemoLogin ? 'සක්‍රීයයි (Active)' : 'අක්‍රීයයි (Disabled)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    මුරපද රහිතව Demo පරිශීලකයෙකු ලෙස ඕනෑම අයෙකුට ඇතුල්වීමේ පහසුකම පාලනය කරන්න. මෙය අක්‍රීය කළ විට Login තිරයෙන් Demo බොත්තම ඉවත් වන අතර ලියාපදිංචි පරිශීලකයින්ට පමණක් Login විය හැක.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    තත්ත්වය: {systemSettings.enableDemoLogin ? 'Demo විවෘතයි' : 'ලියාපදිංචි අයට පමණයි'}
                  </span>
                  <button
                    type="button"
                    disabled={isUpdatingSettings}
                    onClick={() => handleToggleSystemSetting('enableDemoLogin', !systemSettings.enableDemoLogin)}
                    className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                      systemSettings.enableDemoLogin
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    }`}
                  >
                    {systemSettings.enableDemoLogin ? '🔴 Demo අක්‍රීය කරන්න (Turn OFF)' : '🟢 Demo සක්‍රීය කරන්න (Turn ON)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Inspection Modal */}
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
          onDelete={handleRejectUser}
          onUpdateUser={handleSaveEditedUser}
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



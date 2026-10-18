import React, { useState, useMemo } from 'react';
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  ShieldAlert, 
  PhoneCall, 
  Coins, 
  HelpCircle, 
  Radio, 
  BookOpen, 
  KeyRound, 
  Brain, 
  Settings, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Edit3, 
  Eye, 
  Search, 
  Filter, 
  Sun, 
  Moon, 
  ArrowLeft 
} from 'lucide-react';

// Types
import { User, HelpPost, Issue, RedAlert } from '../types';

// Utils & Helpers
import { checkIsAdmin } from '../utils/postOwnerHelper';
// ✅ නිවැරදි කළ කේතය:
import { 
  syncUserProfileToFirestore, 
  deleteUserAccount, 
  deleteHelpPostFromFirestore 
} from '../lib/firebase';

// Subsystem Components
import { AdminEditUserModal } from './AdminEditUserModal';
import { AdminUserInspectionModal } from './AdminUserInspectionModal';
import { AdminCreditManagement } from './AdminCreditManagement';
import { AdminEmergencyDirectoryManagement } from './AdminEmergencyDirectoryManagement';
import { AdminRedAlertManagement } from './AdminRedAlertManagement';
import { AdminIssuesManagement } from './AdminIssuesManagement';
import { AdminSearchDictionaryManager } from './AdminSearchDictionaryManager';
import { AdminTrustManagement } from './AdminTrustManagement';
import { AdminPresenceDashboard } from './AdminPresenceDashboard';
import { AdminPasswordResetsManagement } from './AdminPasswordResetsManagement';
import { AdminAiKnowledgeManagement } from './AdminAiKnowledgeManagement';
import { AdminSystemSettingsToggle } from './AdminSystemSettingsToggle';

export interface AdminPanelProps {
  currentUser?: User | null;
  users?: User[];
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
  helpPosts?: HelpPost[];
  setHelpPosts?: React.Dispatch<React.SetStateAction<HelpPost[]>>;
  redAlerts?: RedAlert[];
  setRedAlerts?: React.Dispatch<React.SetStateAction<RedAlert[]>>;
  issues?: Issue[];
  onUpdateIssueStatus?: (issueId: string, status: Issue['status']) => void;
  onLogout?: () => void;
  onSwitchToUserView?: () => void;
  language?: 'si' | 'en' | 'ta';
  setLanguage?: (lang: 'si' | 'en' | 'ta') => void;
  theme?: 'light' | 'dark';
  toggleTheme?: () => void;
}

type AdminTab = 
  | 'users' 
  | 'posts' 
  | 'credits' 
  | 'emergency' 
  | 'alerts' 
  | 'issues' 
  | 'dictionary' 
  | 'trust' 
  | 'presence' 
  | 'resets' 
  | 'ai';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  users = [],
  setUsers,
  helpPosts = [],
  setHelpPosts,
  redAlerts = [],
  setRedAlerts,
  issues = [],
  onUpdateIssueStatus,
  onLogout,
  onSwitchToUserView,
  language = 'si',
  setLanguage,
  theme = 'light',
  toggleTheme,
}) => {
  // ==========================================
  // 1. 🛡️ අභ්‍යන්තර ආරක්ෂක පරීක්ෂාව (Internal Role Guard)
  // ==========================================
  if (!currentUser || !checkIsAdmin(currentUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full text-center p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-red-200 dark:border-red-900/50">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">ප්‍රවේශය අවහිර කර ඇත</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            මෙම පරිපාලක පුවරුවට (Admin Panel) පිවිසීමට ඔබට අවසර නොමැත. කරුණාකර Admin ගිණුමකින් ලොග් වන්න.
          </p>
          <button
            onClick={onSwitchToUserView}
            className="w-full py-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-xl hover:bg-slate-900 text-sm font-medium transition-colors"
          >
            ආපසු Dashboard වෙත යන්න
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. Component States
  // ==========================================
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('all');
  
  // Modals & Action States
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Notification Toast State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ==========================================
  // 3. Robust Handlers (Try/Catch + Rollback Fix)
  // ==========================================

  // A. පරිශීලකයින් අනුමත කිරීම (Approve User)
  const handleApproveUser = async (targetUser: User) => {
    if (!setUsers) return;
    const previousUsers = [...users];
    const updatedUser: User = { ...targetUser, status: 'approved' };

    // Optimistic UI Update
    setUsers(prev => prev.map(u => (u.id === targetUser.id ? updatedUser : u)));
    setIsProcessing(targetUser.id);

    try {
      await syncUserProfileToFirestore(updatedUser);
      showToast(`${targetUser.fullName || targetUser.username || 'පරිශීලකයා'} සාර්ථකව අනුමත කරන ලදී.`, 'success');
    } catch (error) {
      console.error('Failed to approve user in Firestore:', error);
      // Rollback on failure
      setUsers(previousUsers);
      showToast('අනුමත කිරීම අසාර්ථක විය. කරුණාකර ජාල සම්බන්ධතාවය පරීක්ෂා කරන්න.', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  // B. පරිශීලකයින් අවහිර කිරීම (Block / Unblock User)
  const handleToggleBlockUser = async (targetUser: User) => {
    if (!setUsers) return;
    const previousUsers = [...users];
    const nextStatus = targetUser.status === 'blocked' ? 'approved' : 'blocked';
    const updatedUser: User = { ...targetUser, status: nextStatus };

    setUsers(prev => prev.map(u => (u.id === targetUser.id ? updatedUser : u)));
    setIsProcessing(targetUser.id);

    try {
      await syncUserProfileToFirestore(updatedUser);
      showToast(`පරිශීලක තත්ත්වය සාර්ථකව වෙනස් කරන ලදී.`, 'success');
    } catch (error) {
      console.error('Failed to update user status in Firestore:', error);
      setUsers(previousUsers);
      showToast('තත්ත්වය යාවත්කාලීන කිරීම අසාර්ථක විය.', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  // C. පරිශීලක ගිණුමක් මැකීම (Delete User)
  const handleDeleteUser = async (targetUser: User) => {
    const confirmMessage = `${targetUser.fullName || targetUser.username} ගේ ගිණුම ස්ථිරවම මකා දැමීමට අවශ්‍ය බව සහතිකද?`;
    if (!window.confirm(confirmMessage)) return;

    if (!setUsers) return;
    const previousUsers = [...users];

    setUsers(prev => prev.filter(u => u.id !== targetUser.id));
    setIsProcessing(targetUser.id);

    try {
      await deleteUserAccount(targetUser.id);
      showToast('පරිශීලක ගිණුම සාර්ථකව මකා දමන ලදී.', 'success');
    } catch (error) {
      console.error('Failed to delete user account:', error);
      setUsers(previousUsers);
      showToast('ගිණුම මකා දැමීම අසාර්ථක විය.', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  // D. Help Post එකක් මැකීම (Delete Post)
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('මෙම Post එක ස්ථිරවම මකා දැමීමට අවශ්‍යද?')) return;

    if (!setHelpPosts) return;
    const previousPosts = [...helpPosts];

    setHelpPosts(prev => prev.filter(p => p.id !== postId));

    try {
      await deleteHelpPostFromFirestore(postId);
      showToast('Post එක සාර්ථකව මකා දමන ලදී.', 'success');
    } catch (error) {
      console.error('Failed to delete post in Firestore:', error);
      setHelpPosts(previousPosts);
      showToast('Post එක මකා දැමීම අසාර්ථක විය.', 'error');
    }
  };

  // E. User Profile එක සංස්කරණය කර සුරැකීම
  const handleSaveEditedUser = async (updated: User) => {
    if (!setUsers) return;
    const previousUsers = [...users];

    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
    setEditingUser(null);

    try {
      await syncUserProfileToFirestore(updated);
      showToast('පරිශීලක තොරතුරු සාර්ථකව යාවත්කාලීන විය.', 'success');
    } catch (error) {
      console.error('Failed to save edited user:', error);
      setUsers(previousUsers);
      showToast('යාවත්කාලීන කිරීම අසාර්ථක විය.', 'error');
    }
  };
  // ==========================================
  // 4. Filters & Computed Data
  // ==========================================
  const pendingCount = useMemo(() => users.filter(u => u.status === 'pending').length, [users]);
  const activeAlertsCount = useMemo(() => redAlerts.length, [redAlerts]);
  const pendingIssuesCount = useMemo(() => issues.filter(i => i.status === 'pending' || i.status === 'open').length, [issues]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.nicNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phone || '').includes(searchQuery);

      const matchesStatus = 
        statusFilter === 'all' ? true : u.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [users, searchQuery, statusFilter]);

  const filteredPosts = useMemo(() => {
    return helpPosts.filter(p => 
      (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [helpPosts, searchQuery]);

  // ==========================================
  // 5. Main JSX Return
  // ==========================================
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* 🔔 Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' 
            : 'bg-red-50 dark:bg-red-950/80 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* 🛡️ Header Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Lanka24online Admin</h1>
              <p className="text-xs text-slate-500">පද්ධති කළමනාකරණ පුවරුව</p>
            </div>
          </div>

          {/* Header Badges & Actions */}
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-900">
                {pendingCount} Pending
              </span>
            )}
            
            <button
              onClick={onSwitchToUserView}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> User Mode
            </button>

            {toggleTheme && (
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              title="System Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 📑 Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto py-2 scrollbar-none">
          {[
            { id: 'users', label: 'පරිශීලකයින්', icon: Users, count: users.length },
            { id: 'posts', label: 'Help Posts', icon: FileText, count: helpPosts.length },
            { id: 'alerts', label: 'Red Alerts', icon: AlertTriangle, count: activeAlertsCount },
            { id: 'issues', label: 'ගැටළු (Issues)', icon: HelpCircle, count: pendingIssuesCount },
            { id: 'credits', label: 'ණය කළමනාකරණය', icon: Coins },
            { id: 'emergency', label: 'හදිසි අංක', icon: PhoneCall },
            { id: 'dictionary', label: 'ශබ්දකෝෂය', icon: BookOpen },
            { id: 'trust', label: 'විශ්වාසනීයත්වය', icon: ShieldAlert },
            { id: 'presence', label: 'ක්‍රියාකාරීත්වය', icon: Radio },
            { id: 'resets', label: 'මුරපද යළි පිහිටුවීම්', icon: KeyRound },
            { id: 'ai', label: 'AI දැනුම', icon: Brain },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as AdminTab);
                  setSearchQuery('');
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* 📦 Tab Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* TAB 1: USERS */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="නම, NIC හෝ දුරකථන අංකයෙන් සොයන්න..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="text-xs bg-slate-50 dark:bg-slate-800 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <option value="all">සියලු පරිශීලකයින් ({users.length})</option>
                  <option value="pending">අනුමැතිය අපේක්ෂිත ({pendingCount})</option>
                  <option value="approved">අනුමත කළ අය</option>
                  <option value="blocked">අවහිර කළ අය</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <tr>
                      <th className="p-3">පරිශීලකයා</th>
                      <th className="p-3">තත්ත්වය (Status)</th>
                      <th className="p-3">NIC / දුරකථනය</th>
                      <th className="p-3">කාර්යභාරය (Role)</th>
                      <th className="p-3 text-right">ක්‍රියාමාර්ග (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          පරිශීලකයින් කිසිවෙකු හමු නොවීය.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-3">
                            <div className="font-semibold">{user.fullName || user.username || 'නමක් නැත'}</div>
                            <div className="text-[11px] text-slate-400">{user.email || user.username}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              user.status === 'approved' 
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                                : user.status === 'pending'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                            }`}>
                              {user.status || 'unknown'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px]">
                            <div>{user.nicNumber || '-'}</div>
                            <div className="text-slate-400">{user.phone || '-'}</div>
                          </td>
                          <td className="p-3 capitalize">{user.role || 'user'}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setInspectingUser(user)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded"
                                title="Inspect"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingUser(user)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 rounded"
                                title="Edit"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {user.status === 'pending' && (
                                <button
                                  disabled={isProcessing === user.id}
                                  onClick={() => handleApproveUser(user)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded"
                                  title="Approve"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                disabled={isProcessing === user.id}
                                onClick={() => handleToggleBlockUser(user)}
                                className={`p-1.5 rounded ${user.status === 'blocked' ? 'text-emerald-600' : 'text-amber-600'}`}
                                title={user.status === 'blocked' ? 'Unblock' : 'Block'}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button
                                disabled={isProcessing === user.id}
                                onClick={() => handleDeleteUser(user)}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POSTS */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPosts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">Help Posts කිසිවක් හමු නොවීය.</div>
              ) : (
                filteredPosts.map(post => (
                  <div key={post.id} className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{post.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{post.description}</p>
                    </div>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> මකන්න
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SUBSYSTEM TABS (Props ආරක්ෂිතව ලබා දීම) */}
        {activeTab === 'alerts' && <AdminRedAlertManagement redAlerts={redAlerts} setRedAlerts={setRedAlerts} />}
        {activeTab === 'issues' && <AdminIssuesManagement issues={issues} onUpdateStatus={onUpdateIssueStatus} />}
        {activeTab === 'credits' && <AdminCreditManagement users={users} setUsers={setUsers} />}
        {activeTab === 'emergency' && <AdminEmergencyDirectoryManagement />}
        {activeTab === 'dictionary' && <AdminSearchDictionaryManager />}
        {activeTab === 'trust' && <AdminTrustManagement users={users} />}
        {activeTab === 'presence' && <AdminPresenceDashboard users={users} />}
        {activeTab === 'resets' && <AdminPasswordResetsManagement />}
        {activeTab === 'ai' && <AdminAiKnowledgeManagement />}
      </main>

      {/* 🔍 User Inspection Modal */}
      {inspectingUser && (
        <AdminUserInspectionModal
          user={inspectingUser}
          onClose={() => setInspectingUser(null)}
        />
      )}

      {/* ✏️ User Edit Modal */}
      {editingUser && (
        <AdminEditUserModal
          user={editingUser}
          onSave={handleSaveEditedUser}
          onClose={() => setEditingUser(null)}
        />
      )}

      {/* ⚙️ System Settings Modal */}
      {isSettingsOpen && (
        <AdminSystemSettingsToggle
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminPanel;

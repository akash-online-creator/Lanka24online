



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
import { AdminAiKnowledgeManagement } from './AdminAiKnowledgeManagement';
import { Sparkles } from 'lucide-react';
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
  onDeletePost
}) => {
  const isUserMode = false;
  const toggleUserMode = () => {
    if (onSwitchToUserMode) onSwitchToUserMode();
  };
  const t = translations[language] || translations.si;
  const users = useMemo(() => deduplicateUsers(rawUsers), [rawUsers]);
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'credits' | 'emergency' | 'red_alerts' | 'issues' | 'dictionary' | 'trust' | 'presence' | 'password_resets' | 'ai_knowledge'>('users');
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('pending');
  const [postSearch, setPostSearch] = useState('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };
  const pendingUsersCount = useMemo(() => users.filter(u => u.status === 'pending').length, [users]);
  const activeAlertsCount = useMemo(() => redAlerts.length, [redAlerts]);
  const pendingIssuesCount = useMemo(() => issues.filter(i => i.status === 'pending').length, [issues]);
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = (u.fullName || '').toLowerCase().includes(userSearch.toLowerCase()) || (u.phone || '').includes(userSearch);
      const matchesFilter = userFilter === 'all' ? true : u.status === userFilter;
      return matchesSearch && matchesFilter;
    });
  }, [users, userSearch, userFilter]);
  const filteredHelpPosts = useMemo(() => {
    return helpPosts.filter(p => (p.title || '').toLowerCase().includes(postSearch.toLowerCase()) || (p.description || '').toLowerCase().includes(postSearch.toLowerCase()));
  }, [helpPosts, postSearch]);
  const handleApproveUser = async (user: User) => {
    const updated = { ...user, status: 'approved' as const };
    if (setUsers) setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    await syncUserProfileToFirestore(updated);
    showNotification(`User ${user.fullName} approved`);
  };
  const handleBlockUser = async (user: User) => {
    const updated = { ...user, status: 'blocked' as const };
    if (setUsers) setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    await syncUserProfileToFirestore(updated);
    showNotification(`User ${user.fullName} blocked`);
  };
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    if (setUsers) setUsers(prev => prev.filter(u => u.id !== userId));
    await deleteUserAccount(userId);
    showNotification('User account deleted');
  };
  const handleDeletePostInternal = async (postId: string) => {
    if (!window.confirm('Delete this post?')) return;
    if (onDeletePost) onDeletePost(postId);
    if (setHelpPosts) setHelpPosts(prev => prev.filter(p => p.id !== postId));
    await deleteHelpPostFromFirestore(postId);
    showNotification('Post removed');
  };
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-[#07170e] rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-200 dark:border-[#153422] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <AppLogo className="w-12 h-12" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">පාලක පුවරුව (Admin Panel)</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                {currentUser?.role || 'Administrator'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">පද්ධති කළමනාකරණය සහ අධීක්ෂණය</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={toggleUserMode}
            className="px-4 py-2 bg-slate-100 dark:bg-[#12281b] hover:bg-slate-200 dark:hover:bg-[#153422] text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-2"
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>පරිශීලක මාදිලියට</span>
          </button>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-100 transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {/* Memory Storage Bar */}
      <MemoryStorageBar />
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed top-5 right-5 z-[999999] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs sm:text-sm font-bold">{notificationMsg}</span>
        </div>
      )}
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
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* Tab Contents */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#07170e] p-4 rounded-3xl border border-slate-200 dark:border-[#153422]">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="නම හෝ දුරකථන අංකය..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#12281b] border border-slate-200 dark:border-[#153422] rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'all', label: 'සියල්ල' },
                { id: 'pending', label: 'අනුමැතිය බලපොරොත්තුවෙන්' },
                { id: 'approved', label: 'අනුමත කළ' },
                { id: 'blocked', label: 'අවහිර කළ' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setUserFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    userFilter === f.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#12281b] text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map(u => (
              <div key={u.id} className="bg-white dark:bg-[#07170e] p-5 rounded-3xl border border-slate-200 dark:border-[#153422] shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white">{u.fullName}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      u.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                      u.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                      'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}>
                      {u.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    {u.phone}
                  </p>
                  {u.district && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      {u.district}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#12281b]">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setInspectingUser(u)}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#12281b] rounded-xl transition-all cursor-pointer"
                      title="පරීක්ෂා කරන්න"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingUser(u)}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#12281b] rounded-xl transition-all cursor-pointer"
                      title="සංස්කරණය"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                      title="ඉවත් කරන්න"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    {u.status !== 'approved' && (
                      <button
                        onClick={() => handleApproveUser(u)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        අනුමත කරන්න
                      </button>
                    )}
                    {u.status !== 'blocked' && (
                      <button
                        onClick={() => handleBlockUser(u)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        අවහිර කරන්න
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#07170e] p-4 rounded-3xl border border-slate-200 dark:border-[#153422]">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="දැන්වීම් සෙවුම..."
                value={postSearch}
                onChange={e => setPostSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#12281b] border border-slate-200 dark:border-[#153422] rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHelpPosts.map(p => (
              <div key={p.id} className="bg-white dark:bg-[#07170e] p-5 rounded-3xl border border-slate-200 dark:border-[#153422] shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {p.type}
                    </span>
                    <button
                      onClick={() => handleDeletePostInternal(p.id)}
                      className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{p.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">{p.description}</p>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#12281b]">
                  <span>කර්තෘ: {p.authorName}</span>
                  <span>{p.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'credits' && <AdminCreditManagement users={users} setUsers={setUsers} />}
      {activeTab === 'emergency' && <AdminEmergencyDirectoryManagement />}
      {activeTab === 'red_alerts' && <AdminRedAlertManagement redAlerts={redAlerts} setRedAlerts={setRedAlerts} />}
      {activeTab === 'issues' && <AdminIssuesManagement issues={issues} setIssues={setIssues} />}
      {activeTab === 'dictionary' && <AdminSearchDictionaryManager />}
      {activeTab === 'trust' && <AdminTrustManagement users={users} setUsers={setUsers} />}
      {activeTab === 'presence' && <AdminPresenceDashboard />}
      {activeTab === 'password_resets' && <AdminPasswordResetsManagement />}
      {activeTab === 'ai_knowledge' && <AdminAiKnowledgeManagement />}
      {/* Modals */}
      {inspectingUser && (
        <AdminUserInspectionModal
          user={inspectingUser}
          onClose={() => setInspectingUser(null)}
        />
      )}
      {editingUser && (
        <AdminEditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={async (updated) => {
            if (setUsers) setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
            await syncUserProfileToFirestore(updated);
            showNotification('පරිශීලක තොරතුරු යාවත්කාලීන විය');
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminPanel;


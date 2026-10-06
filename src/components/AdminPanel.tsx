import React, { useState, useMemo } from 'react';
import { 
  User, 
  Issue, 
  Language, 
  HelpPost, 
  RedAlertItem, 
  CategoryItem, 
  TagItem 
} from '../types';
import { translations } from '../data/translations';
import { AppLogo } from './AppLogo';
import { MemoryStorageBar } from './MemoryStorageBar';
import { deduplicateUsers } from '../utils/userUtils';
import { checkIsAdmin } from '../utils/postOwnerHelper';
import { useUserMode } from '../context/UserModeContext';
import { 
  updateHelpPostInFirestore,
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
import { 
  Shield, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Search, 
  Sparkles, 
  UserCheck, 
  Trash2, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  AlertTriangle, 
  Coins, 
  Radio, 
  BookOpen, 
  Eye, 
  RefreshCw,
  LogOut,
  FileText,
  Activity,
  Award
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
    'users' | 'posts' | 'credits' | 'emergency' | 'red_alerts' | 'issues' | 'dictionary' | 'trust' | 'presence'
  >('users');

  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('pending');
  const [postSearch, setPostSearch] = useState('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // User Actions
  const handleApproveUser = async (user: User) => {
    const updated: User = { ...user, status: 'approved' };
    if (setUsers) {
      setUsers(prev => prev.map(u => (u.id === user.id ? updated : u)));
    }
    try {
      await syncUserProfileToFirestore(updated);
    } catch (e) {
      console.warn('Firestore update error:', e);
    }
    showNotification(`✅ ${user.name} ගේ ගිණුම සාර්ථකව අනුමත කරන ලදී.`);
  };

  const handleRejectUser = async (user: User) => {
    const reason = window.prompt('ප්‍රතික්ෂේප කිරීමට හේතුව (විකල්ප):', 'තොරතුරු අපැහැදිලියි');
    if (reason === null) return;
    const updated: User = { ...user, status: 'rejected' };
    if (setUsers) {
      setUsers(prev => prev.map(u => (u.id === user.id ? updated : u)));
    }
    try {
      await syncUserProfileToFirestore(updated);
    } catch (e) {
      console.warn('Firestore update error:', e);
    }
    showNotification(`❌ ${user.name} ගේ ගිණුම ප්‍රතික්ෂේප කරන ලදී.`);
  };

  const handleDeleteUserAction = async (user: User) => {
    if (!window.confirm(`"${user.name}" ගිණුම සම්පූර්ණයෙන්ම මකා දැමීමට ඔබට විශ්වාසද?`)) return;
    if (setUsers) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
    }
    try {
      await deleteUserAccount(user, true);
    } catch (e) {
      console.warn('Firestore delete error:', e);
    }
    showNotification(`🗑️ ${user.name} ගිණුම මකා දමන ලදී.`);
  };

  // Post Actions
  const handleDeletePostAction = async (postId: string) => {
    if (!window.confirm('මෙම දැන්වීම මකා දැමීමට ඔබට විශ්වාසද?')) return;
    if (setHelpPosts) {
      setHelpPosts(prev => prev.filter(p => p.id !== postId));
    }
    try {
      await deleteHelpPostFromFirestore(postId);
    } catch (e) {
      console.warn('Firestore delete post error:', e);
    }
    showNotification('🗑️ දැන්වීම සාර්ථකව මකා දමන ලදී.');
  };

  // Issue Action
  const handleReplyIssue = async (issueId: string, replyText: string, markResolved: boolean = true) => {
    if (setIssues) {
      setIssues(prev =>
        prev.map(i =>
          i.id === issueId
            ? { ...i, status: markResolved ? 'resolved' : i.status, adminReply: replyText }
            : i
        )
      );
    }
    showNotification('✉️ ගැටලුවට පිළිතුර සාර්ථකව යවන ලදී.');
  };

  const pendingUsersCount = useMemo(() => users.filter(u => u.status === 'pending').length, [users]);
  const pendingIssuesCount = useMemo(() => issues.filter(i => i.status === 'pending').length, [issues]);
  const activeAlertsCount = useMemo(() => redAlerts.filter(a => a.status === 'active').length, [redAlerts]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter(u => {
      const matchFilter = userFilter === 'all' || u.status === userFilter;
      const matchSearch =
        !q ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.nicNumber || '').toLowerCase().includes(q) ||
        (u.phone || '').includes(q) ||
        (u.userId || '').toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [users, userFilter, userSearch]);

  const filteredPosts = useMemo(() => {
    const q = postSearch.trim().toLowerCase();
    return helpPosts.filter(p => {
      return (
        !q ||
        (p.userName || '').toLowerCase().includes(q) ||
        (p.postCode || '').toLowerCase().includes(q) ||
        (p.whatHappened || '').toLowerCase().includes(q) ||
        (p.locationName || '').toLowerCase().includes(q)
      );
    });
  }, [helpPosts, postSearch]);

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-3 sm:px-6 space-y-6 animate-fadeIn">
      
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-emerald-800 via-[#007a4b] to-teal-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-4 border-2 border-emerald-500/40">
        <div className="flex items-center gap-3.5">
          <AppLogo size="md" showGlow animated />
          <div>
            <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
              <span>{t.adminDashboard || 'පරිපාලක පාලක පුවරුව'}</span>
              <span className="text-[11px] bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                ADMIN CONSOLE
              </span>
            </h2>
            <p className="text-xs text-emerald-100 font-medium">
              සහය සේවා (Sahaya Seva) • පරිශීලක, දැන්වීම්, ආරක්ෂක සහ ආපදා කළමනාකරණය
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Switch to User View Button */}
          <button
            type="button"
            onClick={onSwitchToUserMode}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-emerald-700" />
            <span>👤 පරිශීලක ප්‍රකාරය (User Mode)</span>
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-black/40 hover:bg-rose-600 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer border border-white/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ඉවත් වන්න</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div className="p-3.5 bg-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg animate-fadeIn flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notificationMsg}</span>
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

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#06140c] p-1 rounded-xl">
                {(['pending', 'approved', 'blocked', 'all'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setUserFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      userFilter === f
                        ? 'bg-emerald-600 text-white font-black shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {f === 'pending' ? `අනුමැතියට (${pendingUsersCount})` : f === 'approved' ? 'අනුමත' : f === 'blocked' ? 'බ්ලොක් කළ' : 'සියල්ල'}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="නම, NIC, දුරකථන සොයන්න..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#06140c] border border-slate-200 dark:border-[#163b25] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* User Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredUsers.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 font-bold text-xs bg-slate-50 dark:bg-[#06140c] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                පරිශීලකයින් හමු නොවීය.
              </div>
            ) : (
              filteredUsers.map(u => (
                <div
                  key={u.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#07170e] border border-slate-200 dark:border-[#143321] space-y-3 shadow-2xs hover:border-emerald-500/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shrink-0">
                        {u.name?.charAt(0) || '👤'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          {u.name}
                        </h4>
                        <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold block">
                          NIC: {u.nicNumber || u.userId || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        u.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : u.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {u.status}
                    </span>
                  </div>

                  <div className="text-[11px] space-y-1 text-slate-600 dark:text-slate-300 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{u.phone || u.whatsappNumber || 'දුරකථනය නොමැත'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{u.address || u.district || 'ලිපිනය නොමැත'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {u.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApproveUser(u)}
                          className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>අනුමත කරන්න</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectUser(u)}
                          className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs transition-colors"
                        >
                          ප්‍රතික්ෂේප
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteUserAction(u)}
                      className="p-1.5 rounded-xl bg-slate-200 hover:bg-rose-600 hover:text-white text-slate-600 dark:bg-[#11291d] transition-colors ml-auto"
                      title="පරිශීලකයා මකා දමන්න"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Help Posts Moderation */}
      {activeTab === 'posts' && (
        <div className="bg-white dark:bg-[#0a1a11] rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-[#173a26] shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#173d27]">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>ප්‍රජා දැන්වීම් පාලනය (Help Posts Moderation)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                මුළු දැන්වීම් සංඛ්‍යාව: {helpPosts.length}
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={postSearch}
                onChange={e => setPostSearch(e.target.value)}
                placeholder="දැන්වීම් කේතය, නම හෝ විස්තරය..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#06140c] border border-slate-200 dark:border-[#163b25] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredPosts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold text-xs bg-slate-50 dark:bg-[#06140c] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                දැන්වීම් හමු නොවීය.
              </div>
            ) : (
              filteredPosts.map(p => (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#07170e] border border-slate-200 dark:border-[#143321] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-emerald-500/50 transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-black text-xs">
                        #{p.postCode || p.id?.slice(-6)}
                      </span>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {p.userName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        • {p.locationName || 'ශ්‍රී ලංකාව'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-2">
                      {p.whatHappened || p.whatIsNeeded || 'විස්තරයක් නොමැත'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleDeletePostAction(p.id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>මකා දමන්න</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Credit Management */}
      {activeTab === 'credits' && (
        <AdminCreditManagement
          users={users}
          currentUser={currentUser}
          language={language}
          onDeletePost={handleDeletePostAction}
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
          alerts={redAlerts}
          currentUser={currentUser}
          language={language}
          onRefreshRedAlerts={() => {}}
        />
      )}

      {/* Tab 6: Issues Helpdesk */}
      {activeTab === 'issues' && (
        <AdminIssuesManagement
          issues={issues}
          users={users}
          language={language}
          onReplyIssue={handleReplyIssue}
        />
      )}

      {/* Tab 7: Search Dictionary */}
      {activeTab === 'dictionary' && (
        <AdminSearchDictionaryManager
          currentUser={currentUser}
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

    </div>
  );
};

export default AdminPanel;

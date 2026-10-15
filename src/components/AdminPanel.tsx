import React, { useState, useMemo, useEffect, createContext, useContext } from 'react';
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
  KeyRound,
  Rocket,
  Loader2
} from 'lucide-react';

// Safely inline UserModeContext to prevent missing module import build failures
interface UserModeContextType {
  isUserMode: boolean;
  toggleUserMode: () => void;
}

const UserModeContext = createContext<UserModeContextType>({
  isUserMode: false,
  toggleUserMode: () => {},
});

export const useUserMode = () => useContext(UserModeContext);

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
    'users' | 'posts' | 'credits' | 'emergency' | 'red_alerts' | 'issues' | 'dictionary' | 'trust' | 'presence' | 'password_resets' | 'ai_knowledge' | 'app_update'
  >('users');

  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('pending');
  const [postSearch, setPostSearch] = useState('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // User inspection and editing modal states
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // App Update Notification Control States
  const [isUpdateEnabled, setIsUpdateEnabled] = useState(false);
  const [showOnWeb, setShowOnWeb] = useState(false);
  const [targetVersion, setTargetVersion] = useState('v1.0.8');
  const [apkDownloadUrl, setApkDownloadUrl] = useState('');
  const [updateReleaseNotes, setUpdateReleaseNotes] = useState('සහය සේවා නවතම සංස්කරණය (Direct APK Download & Update Support)');
  const [isSavingUpdateConfig, setIsSavingUpdateConfig] = useState(false);

  useEffect(() => {
    getAppUpdateSettings().then((cfg) => {
      setIsUpdateEnabled(cfg.enabled);
      setShowOnWeb(cfg.showOnWeb);
      if (cfg.targetVersion) setTargetVersion(cfg.targetVersion);
      if (cfg.downloadUrl) setApkDownloadUrl(cfg.downloadUrl);
      if (cfg.releaseNotes) setUpdateReleaseNotes(cfg.releaseNotes);
    }).catch(() => {});
  }, []);

  const handleSaveUpdateSettings = async () => {
    setIsSavingUpdateConfig(true);
    try {
      await saveAppUpdateSettings({
        enabled: isUpdateEnabled,
        showOnWeb,
        targetVersion: targetVersion.trim(),
        downloadUrl: apkDownloadUrl.trim(),
        releaseNotes: updateReleaseNotes.trim(),
      });
      showNotification(
        isUpdateEnabled
          ? '✅ යාවත්කාලීන නිවේදනය සාර්ථකව සක්‍රීය කරන ලදී!'
          : '🛑 යාවත්කාලීන නිවේදනය සම්පූර්ණයෙන්ම අක්‍රිය (OFF) කරන ලදී!'
      );
    } catch (err: any) {
      showNotification('❌ සුරැකීම අසාර්ථක විය: ' + (err?.message || 'දෝෂයක් සිදු විය'));
    } finally {
      setIsSavingUpdateConfig(false);
    }
  };

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Helper counts
  const pendingUsersCount = useMemo(() => users.filter(u => u.status === 'pending').length, [users]);
  const activeAlertsCount = useMemo(() => redAlerts.length, [redAlerts]);
  const pendingIssuesCount = useMemo(() => issues.filter(i => i.status === 'pending').length, [issues]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
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
          { id: 'app_update', label: 'ඇප් යාවත්කාලීන', icon: Rocket },
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
            </button>
          );
        })}
      </div>

      {/* Tab 11: App Update Notification Control */}
      {activeTab === 'app_update' && (
        <div className="bg-white dark:bg-[#0a1a11] rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-[#173a26] shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-[#173d27]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <Rocket className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>ඇප් යාවත්කාලීන නිවේදන පාලනය (In-App Update Alert)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  පරිශීලකයින්ට නව Update Popup එක පෙන්වීම හෝ සම්පූර්ණයෙන්ම අක්‍රිය (OFF) කිරීම මෙතැනින් කළ හැක.
                </p>
              </div>
            </div>

            {/* Master Toggle Status Badge */}
            <div className={`px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-2 border ${
              isUpdateEnabled
                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-400'
                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-400'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isUpdateEnabled ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
              <span>{isUpdateEnabled ? '🟢 නොටිෆිකේෂන් එක සක්‍රීයයි (ON)' : '🔴 නොටිෆිකේෂන් එක අක්‍රියයි (OFF)'}</span>
            </div>
          </div>

          {/* Master ON/OFF Switch Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#07130b] border border-slate-200 dark:border-[#153422] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                ප්‍රධාන නොටිෆිකේෂන් ස්විචය (Master Update Notification Switch)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                මෙය <strong className="text-rose-600 dark:text-rose-400">OFF (අක්‍රිය)</strong> කළ විට, කිසිදු පරිශීලකයෙකුට (Web අඩවියේදී හෝ Mobile App එකේදී) "නව යාවත්කාලීන කිරීමක් ඇත" යනුවෙන් කිසිදු Popup එකක් මතු නොවේ.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsUpdateEnabled(!isUpdateEnabled)}
              className={`relative inline-flex h-9 w-20 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isUpdateEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-8 w-8 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[10px] font-black ${
                  isUpdateEnabled ? 'translate-x-11 text-emerald-700' : 'translate-x-0 text-slate-500'
                }`}
              >
                {isUpdateEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {/* Web Browser Display Switch */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#07130b] border border-slate-200 dark:border-[#153422] flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                වෙබ් අඩවියේදී (Web Browser) පෙන්වන්නද?
              </h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                අක්‍රිය කළ විට වෙබ් බ්‍රවුසරයෙන් එන අයට මේ Popup එක නොපෙනී, App එක තුළ පමණක් පෙනේ.
              </p>
            </div>

            <button
              type="button"
              disabled={!isUpdateEnabled}
              onClick={() => setShowOnWeb(!showOnWeb)}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-40 ${
                showOnWeb ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                  showOnWeb ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Config Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                නවතම Version අංකය (Target Version)
              </label>
              <input
                type="text"
                value={targetVersion}
                onChange={(e) => setTargetVersion(e.target.value)}
                placeholder="උදා: v1.0.8"
                className="w-full bg-white dark:bg-[#07120c] border border-slate-200 dark:border-[#162e20] rounded-xl py-2 px-3 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                සෘජු APK Download Link එක (Direct URL)
              </label>
              <input
                type="url"
                value={apkDownloadUrl}
                onChange={(e) => setApkDownloadUrl(e.target.value)}
                placeholder="https://github.com/.../releases/..."
                className="w-full bg-white dark:bg-[#07120c] border border-slate-200 dark:border-[#162e20] rounded-xl py-2 px-3 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              අලුතින් එක් කළ විශේෂාංග (What's New විස්තරය)
            </label>
            <textarea
              rows={3}
              value={updateReleaseNotes}
              onChange={(e) => setUpdateReleaseNotes(e.target.value)}
              placeholder="යාවත්කාලීන කිරීමේදී පරිශීලකයින්ට පෙනෙන විස්තරය..."
              className="w-full bg-white dark:bg-[#07120c] border border-slate-200 dark:border-[#162e20] rounded-xl py-2 px-3 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Save Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={isSavingUpdateConfig}
              onClick={handleSaveUpdateSettings}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#007a4b] hover:from-emerald-500 hover:to-[#00663e] text-white text-xs sm:text-sm font-black shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isSavingUpdateConfig ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>සුරැකෙමින් පවතී...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>සැකසුම් සුරකින්න (Save Settings)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;


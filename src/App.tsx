import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  LogOut, 
  Sun, 
  Moon, 
  Globe, 
  User as UserIcon, 
  RefreshCw 
} from 'lucide-react';

// Components
import { AdminPanel } from './components/AdminPanel';
import { UserDashboard } from './components/UserDashboard';
import { IssuesHelpPage } from './components/IssuesHelpPage';

// Types
import { User, HelpPost, Issue, RedAlert } from './types';

// Utils & Helpers
import { checkIsAdmin } from './utils/postOwnerHelper';
import { 
  syncUserProfileToFirestore, 
  listenToUsersCollection, 
  listenToHelpPostsCollection, 
  listenToRedAlertsCollection, 
  listenToIssuesCollection 
} from './services/firebase';

export const App: React.FC = () => {
  // ==========================================
  // 1. Language & Theme States
  // ==========================================
  const [language, setLanguage] = useState<'si' | 'en' | 'ta'>(() => {
    return (localStorage.getItem('sahaya_sewa_lang') as 'si' | 'en' | 'ta') || 'si';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('sahaya_sewa_theme') as 'light' | 'dark') || 'light';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('sahaya_sewa_theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  // ==========================================
  // 2. Authentication & Session States
  // ==========================================
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('sahaya_sewa_session_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Error reading session user', e);
      return null;
    }
  });

  // ==========================================
  // 3. Navigation View State
  // ==========================================
  const [activeView, setActiveView] = useState<'permissions' | 'login' | 'register' | 'dashboard' | 'admin' | 'pending' | 'issues'>(() => {
    try {
      const saved = localStorage.getItem('sahaya_sewa_session_user');
      if (saved) {
        const u: User = JSON.parse(saved);
        // ආරක්ෂිත පරීක්ෂාව: Admin නම් පමණක් කෙලින්ම admin view එකට යොමු කෙරේ
        if (checkIsAdmin(u)) return 'admin';
        if (u.status === 'pending') return 'pending';
        return 'dashboard';
      }
    } catch (e) {
      console.error('Error initializing active view from session', e);
    }
    return 'login';
  });

  // ==========================================
  // 4. Application Data Collections States
  // ==========================================
  const [users, setUsers] = useState<User[]>([]);
  const [helpPosts, setHelpPosts] = useState<HelpPost[]>([]);
  const [redAlerts, setRedAlerts] = useState<RedAlert[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ==========================================
  // 5. Security & Route Protection Effects
  // ==========================================
  // 🛡️ Admin නොවන සාමාන්‍ය පරිශීලකයින් Admin Panel එකට පිවිසීම ස්වයංක්‍රීයව අවහිර කිරීම
  useEffect(() => {
    if (activeView === 'admin') {
      if (!currentUser) {
        setActiveView('login');
      } else if (!checkIsAdmin(currentUser)) {
        console.warn('Unauthorized admin access attempt blocked. Redirecting to dashboard.');
        setActiveView('dashboard');
      }
    }
  }, [activeView, currentUser]);

  // Session User එක Local Storage වෙත සුරැකීම
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('sahaya_sewa_session_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('sahaya_sewa_session_user');
    }
  }, [currentUser]);

  // Theme පන්තිය html document එකට එක් කිරීම
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // ==========================================
  // 6. Firestore Realtime Data Listeners
  // ==========================================
  useEffect(() => {
    let unsubscribeUsers = () => {};
    let unsubscribePosts = () => {};
    let unsubscribeAlerts = () => {};
    let unsubscribeIssues = () => {};

    try {
      setIsLoading(true);

      // පරිශීලකයින් සවන්දීම
      if (typeof listenToUsersCollection === 'function') {
        unsubscribeUsers = listenToUsersCollection((fetchedUsers) => {
          setUsers(fetchedUsers);
        });
      }

      // Help Posts සවන්දීම
      if (typeof listenToHelpPostsCollection === 'function') {
        unsubscribePosts = listenToHelpPostsCollection((fetchedPosts) => {
          setHelpPosts(fetchedPosts);
        });
      }

      // Red Alerts සවන්දීම
      if (typeof listenToRedAlertsCollection === 'function') {
        unsubscribeAlerts = listenToRedAlertsCollection((fetchedAlerts) => {
          setRedAlerts(fetchedAlerts);
        });
      }

      // Issues සවන්දීම
      if (typeof listenToIssuesCollection === 'function') {
        unsubscribeIssues = listenToIssuesCollection((fetchedIssues) => {
          setIssues(fetchedIssues);
        });
      }
    } catch (err) {
      console.error('Error establishing Firestore listeners:', err);
    } finally {
      setIsLoading(false);
    }

    return () => {
      unsubscribeUsers();
      unsubscribePosts();
      unsubscribeAlerts();
      unsubscribeIssues();
    };
  }, []);

  // ==========================================
  // 7. Authentication & Action Handlers
  // ==========================================
  const handleLogin = (matched: User) => {
    setCurrentUser(matched);
    // 🛡️ භූමිකාව පරීක්ෂා කර ආරක්ෂිතව view එක තෝරා ගැනීම
    if (checkIsAdmin(matched)) {
      setActiveView('admin');
    } else if (matched.status === 'pending') {
      setActiveView('pending');
    } else {
      setActiveView('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sahaya_sewa_session_user');
    setActiveView('login');
  };

  const handleUpdateIssueStatus = async (issueId: string, status: Issue['status']) => {
    try {
      setIssues((prev) =>
        prev.map((iss) => (iss.id === issueId ? { ...iss, status } : iss))
      );
      // Backend / Firestore වෙත update කිරීමේ කේතය
    } catch (error) {
      console.error('Failed to update issue status:', error);
    }
  };
  // ==========================================
  // 8. Navigation & Utility Handlers
  // ==========================================
  const handleOpenAdminPanel = () => {
    // 🛡️ User Dashboard එකේ සිට Admin Panel එක විවෘත කිරීමට පෙර Admin කෙනෙක්දැයි තහවුරු කිරීම
    if (checkIsAdmin(currentUser)) {
      setActiveView('admin');
    } else {
      console.warn('Unauthorized attempt to switch to admin view.');
      setActiveView('dashboard');
    }
  };

  const handleBackFromIssues = () => {
    if (!currentUser) {
      setActiveView('login');
    } else if (checkIsAdmin(currentUser)) {
      setActiveView('admin');
    } else {
      setActiveView('dashboard');
    }
  };

  // ==========================================
  // 9. Main Render (View Routing)
  // ==========================================
  if (isLoading && users.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">දත්ත පූරණය වෙමින් පවතී (Loading)...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* 1. Permissions View */}
      {activeView === 'permissions' && (
        <div className="p-6 max-w-lg mx-auto">
          <h2 className="text-xl font-bold mb-4">පද්ධති අවසර ලබාදීම (System Permissions)</h2>
          <button 
            onClick={() => setActiveView('login')} 
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            ඉදිරියට යන්න
          </button>
        </div>
      )}

      {/* 2. Authentication Views (Login / Register / Pending) */}
      {activeView === 'login' && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-bold text-center mb-6">පිවිසෙන්න (Login)</h2>
            {/* Login Form එක සහ handleLogin මෙහෙයුම */}
            <div className="space-y-4">
              <p className="text-sm text-slate-500 text-center">කරුණාකර ඔබගේ ගිණුමට ඇතුළු වන්න</p>
              <button
                onClick={() => {
                  // පරීක්ෂණ Demo පරිශීලකයින් සඳහා උදාහරණයක්
                  const demoAdmin = users.find(u => checkIsAdmin(u));
                  if (demoAdmin) handleLogin(demoAdmin);
                }}
                className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
              >
                Admin ලෙස පිවිසෙන්න (Demo Auto-Login)
              </button>
            </div>
          </div>
        </div>
      )}

      {activeView === 'pending' && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md text-center p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-amber-200 dark:border-amber-900/40">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">ගිණුම අනුමත කිරීම බලාපොරොත්තුවෙන්</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              ඔබගේ ලියාපදිංචිය පරිපාලකවරයාගේ (Admin) අනුමැතිය සඳහා යොමු කර ඇත.
            </p>
            <button 
              onClick={handleLogout} 
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-700"
            >
              ඉවත් වන්න (Logout)
            </button>
          </div>
        </div>
      )}

      {/* 3. Issues & Help Desk View */}
      {activeView === 'issues' && (
        <IssuesHelpPage
          currentUser={currentUser}
          issues={issues}
          onUpdateIssueStatus={handleUpdateIssueStatus}
          onBack={handleBackFromIssues}
          language={language}
          theme={theme}
        />
      )}

      {/* 4. 🛡️ Administrator Operations Dashboard (පූර්ණ ආරක්ෂාව සහිතව) */}
      {activeView === 'admin' && currentUser && checkIsAdmin(currentUser) && (
        <AdminPanel
          currentUser={currentUser}
          users={users}
          setUsers={setUsers}
          helpPosts={helpPosts}
          setHelpPosts={setHelpPosts}
          redAlerts={redAlerts}
          setRedAlerts={setRedAlerts}
          issues={issues}
          onUpdateIssueStatus={handleUpdateIssueStatus}
          onLogout={handleLogout}
          onSwitchToUserView={() => setActiveView('dashboard')}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {/* 5. Regular User Dashboard */}
      {activeView === 'dashboard' && currentUser && (
        <UserDashboard
          currentUser={currentUser}
          users={users}
          helpPosts={helpPosts}
          setHelpPosts={setHelpPosts}
          redAlerts={redAlerts}
          issues={issues}
          onLogout={handleLogout}
          onOpenAdminPanel={handleOpenAdminPanel}
          onOpenIssues={() => setActiveView('issues')}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}
    </div>
  );
};

export default App;

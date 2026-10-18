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
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { PendingApprovalView } from './components/PendingApprovalView';

// Types
import { User, HelpPost, Issue, RedAlertItem as RedAlert, Language, Theme } from './types';

// Utils & Helpers
import { checkIsAdmin } from './utils/postOwnerHelper';
import { 
  syncUserProfileToFirestore, 
  subscribeToUsers, 
  subscribeToHelpPosts, 
  subscribeToRedAlerts, 
  subscribeToIssuesFromFirestore,
  getUserFromFirestore
} from './lib/firebase';

export const App: React.FC = () => {
  // ==========================================
  // 1. Language & Theme States
  // ==========================================
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('sahaya_sewa_lang') as Language) || 'si';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('sahaya_sewa_theme') as Theme) || 'light';
  });

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
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
      unsubscribeUsers = subscribeToUsers((fetchedUsers) => {
        setUsers(fetchedUsers || []);
      });

      // Help Posts සවන්දීම
      unsubscribePosts = subscribeToHelpPosts((fetchedPosts) => {
        setHelpPosts(fetchedPosts || []);
      });

      // Red Alerts සවන්දීම
      unsubscribeAlerts = subscribeToRedAlerts((fetchedAlerts) => {
        setRedAlerts(fetchedAlerts || []);
      });

      // Issues සවන්දීම
      unsubscribeIssues = subscribeToIssuesFromFirestore((fetchedIssues) => {
        setIssues(fetchedIssues || []);
      });
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
  // 7. Authentication Handlers
  // ==========================================
  const handleUserLoginSuccess = (matchedUser: User) => {
    setCurrentUser(matchedUser);
    if (checkIsAdmin(matchedUser)) {
      setActiveView('admin');
    } else if (matchedUser.status === 'pending') {
      setActiveView('pending');
    } else {
      setActiveView('dashboard');
    }
  };

  const handleLogin = async (userIdInput: string, keyInput: string) => {
    const cleanId = userIdInput.trim().toUpperCase();
    const cleanKey = keyInput.trim();

    // 1. Local state users එකෙන් පරිශීලකයා සෙවීම
    let matched = users.find(
      (u) =>
        (u.userId && u.userId.trim().toUpperCase() === cleanId) ||
        (u.phone && u.phone.trim() === cleanId) ||
        (u.whatsappNumber && u.whatsappNumber.trim() === cleanId)
    );

    // 2. Local state හි නොමැති නම් Firestore වෙතින් සෙවීම
    if (!matched) {
      try {
        const firestoreUser = await getUserFromFirestore(cleanId);
        if (firestoreUser) matched = firestoreUser;
      } catch (e) {
        console.warn('Firestore fetch user error:', e);
      }
    }

    if (!matched) {
      alert(language === 'en' ? 'User not found. Please check User ID / Phone.' : 'පරිශීලකයා සොයාගත නොහැක. කරුණාකර ඔබගේ හැඳුනුම්පත් අංකය හෝ දුරකථන අංකය පරීක්ෂා කරන්න.');
      return;
    }

    // මුරපද හෝ යතුරු පරීක්ෂාව
    const storedPass = (matched as any).password || (matched as any).key || (matched as any).tempCode;
    if (storedPass && cleanKey && storedPass !== cleanKey) {
      alert(language === 'en' ? 'Invalid password or PIN.' : 'මුරපදය හෝ PIN අංකය වැරදිය.');
      return;
    }

    handleUserLoginSuccess(matched);
  };

  const handleDemoAdminLogin = () => {
    const demoAdmin = users.find((u) => checkIsAdmin(u));
    if (demoAdmin) {
      handleUserLoginSuccess(demoAdmin);
    } else {
      const fallbackAdmin: User = {
        id: 'admin_master',
        userId: 'ADMIN',
        name: 'ප්‍රධාන පරිපාලක (Master Admin)',
        role: 'admin',
        status: 'approved',
        credits: 99999,
        phone: '0770000000',
      };
      handleUserLoginSuccess(fallbackAdmin);
    }
  };

  const handleRegisterSuccess = (newUser: User) => {
    setCurrentUser(newUser);
    setActiveView('pending');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sahaya_sewa_session_user');
    setActiveView('login');
  };

  const handleRefreshUserStatus = async () => {
    if (!currentUser) return;
    try {
      const refreshed = await getUserFromFirestore(currentUser.userId || currentUser.id);
      if (refreshed) {
        setCurrentUser(refreshed);
        if (refreshed.status === 'approved') {
          setActiveView(checkIsAdmin(refreshed) ? 'admin' : 'dashboard');
        }
      }
    } catch (e) {
      console.warn('Error refreshing status:', e);
    }
  };

  const handleUpdateIssueStatus = async (issueId: string, status: Issue['status']) => {
    try {
      setIssues((prev) =>
        prev.map((iss) => (iss.id === issueId ? { ...iss, status } : iss))
      );
    } catch (error) {
      console.error('Failed to update issue status:', error);
    }
  };

  // ==========================================
  // 8. Navigation Handlers
  // ==========================================
  const handleOpenAdminPanel = () => {
    if (checkIsAdmin(currentUser)) {
      setActiveView('admin');
    } else {
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
  if (isLoading && users.length === 0 && !currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium">දත්ත පූරණය වෙමින් පවතී (Loading)...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* 1. Login View */}
      {activeView === 'login' && (
        <LoginForm
          onLogin={handleLogin}
          onUserDemoLogin={handleDemoAdminLogin}
          onNavigateToRegister={() => setActiveView('register')}
          onNavigateToIssues={() => setActiveView('issues')}
          onSuccessfulPinLogin={handleUserLoginSuccess}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          toggleTheme={toggleTheme}
          showDemoUserLogin={true}
          users={users}
        />
      )}

      {/* 2. Register View */}
      {activeView === 'register' && (
        <RegisterForm
          onRegisterSuccess={handleRegisterSuccess}
          onNavigateToLogin={() => setActiveView('login')}
          onNavigateToIssues={() => setActiveView('issues')}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {/* 3. Pending Approval View */}
      {activeView === 'pending' && currentUser && (
        <PendingApprovalView
          user={currentUser}
          language={language}
          onRefreshStatus={handleRefreshUserStatus}
          onNavigateToIssues={() => setActiveView('issues')}
          onBackToLogin={handleLogout}
        />
      )}

      {/* 4. Issues & Help Desk View */}
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

      {/* 5. 🛡️ Administrator Operations Dashboard */}
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

      {/* 6. Regular User Dashboard */}
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

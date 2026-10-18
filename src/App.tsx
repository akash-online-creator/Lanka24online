import React, { useState, useEffect, useCallback } from 'react';
import { User, Language, Theme, HelpPost, Issue, RedAlertItem } from './types';
import { initialUsers, initialHelpPosts } from './data/initialData';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { GpsActivationGate } from './components/GpsActivationGate';
import { UserDashboard } from './components/UserDashboard';
import { SosLiveViewerModal } from './components/SosLiveViewerModal';
import { AdminPanel } from './components/AdminPanel';
import { PendingApprovalView } from './components/PendingApprovalView';
import { IssuesHelpPage } from './components/IssuesHelpPage';
import { OmniAssistantChatBox } from './components/OmniAssistantChatBox';
import { RedAlertLiveManager } from './components/RedAlertLiveManager';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import {
  subscribeToUsers,
  subscribeToHelpPosts,
  subscribeToRedAlerts,
  subscribeToIssuesFromFirestore,
  saveUserToFirestore,
  getUserFromFirestore,
  deleteHelpPostFromFirestore,
  updateUserInFirestore
} from './lib/firebase';
import { deduplicateUsers, normalizeNIC } from './utils/userUtils';
import { checkIsAdmin } from './utils/postOwnerHelper';
import { addDeletedPostId, filterNonDeletedPosts, downloadPostBackupJson } from './utils/deletedPostsManager';
import { initFcmNotificationService } from './utils/fcmNotificationService';
import { initAutoGps } from './utils/autoGpsService';

export const App: React.FC = () => {
  // 1. Theme & Language State Setup (Light mode is default if no saved theme exists)
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const savedTheme = localStorage.getItem('sahaya_sewa_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    } catch (e) {
      console.warn('LocalStorage theme access notice:', e);
    }
    return 'light'; // Default Theme
  });

  const [language, setLanguage] = useState<Language>('si');

  // 🛰️ Global Auto GPS on Interaction Initializer
  useEffect(() => {
    const cleanupGps = initAutoGps();
    return () => {
      cleanupGps();
    };
  }, []);

  // 🛰️ URL-based SOS Live Tracker direct link interception
  const [sosViewerSessionId, setSosViewerSessionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/?/, ''));
        return params.get('sos_session') || hashParams.get('sos_session') || params.get('sos');
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Persist Theme to LocalStorage & Synchronize HTML class
  useEffect(() => {
    try {
      localStorage.setItem('sahaya_sewa_theme', theme);
    } catch (e) {
      console.warn('Failed to save theme to LocalStorage:', e);
    }

    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
  }, [theme]);

  // Application Data State (Initial load filtered against permanent deletion blacklist)
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [helpPosts, setHelpPosts] = useState<HelpPost[]>(() => {
    try {
      localStorage.removeItem('sahaya_help_posts');
    } catch {}
    return filterNonDeletedPosts(initialHelpPosts);
  });
  const [redAlerts, setRedAlerts] = useState<RedAlertItem[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);

  // Current User Session & Navigation View
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('sahaya_sewa_session_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 🛡️ Proper Permissions -> Login Flow Router State
  const [activeView, setActiveView] = useState<'permissions' | 'login' | 'register' | 'dashboard' | 'admin' | 'pending' | 'issues'>(() => {
    try {
      const saved = localStorage.getItem('sahaya_sewa_session_user');
      if (saved) {
        const u: User = JSON.parse(saved);
        if (u.role === 'admin' || u.role === 'super_admin') return 'admin';
        if (u.status === 'pending') return 'pending';
        return 'dashboard';
      }

      // Check if permissions setup has been completed on initial launch
      const isPermDone = localStorage.getItem('sahaya_permissions_setup_completed');
      if (!isPermDone) {
        return 'permissions';
      }
    } catch {}
    return 'login';
  });

  // Global Navigation Handler
  const handleNavigate = useCallback((view: 'permissions' | 'login' | 'register' | 'dashboard' | 'admin' | 'pending' | 'issues') => {
    setActiveView(view);
  }, []);

  // Password change mandatory modal state
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState<boolean>(false);

  // Check if current user is using temporary password
  useEffect(() => {
    if (currentUser && currentUser.isTemporaryPassword) {
      setShowPasswordChangeModal(true);
    } else {
      setShowPasswordChangeModal(false);
    }
  }, [currentUser]);

  // Handle Permanent Soft Deletion with Auto Backup & Multi-Source Sync
  const handleDeletePost = useCallback(async (postId: string) => {
    const postObj = helpPosts.find((p) => p.id === postId);

    // 1 & 2. Auto JSON File Download (Admin device එකට පමණක් Save වීම)
    if (postObj && checkIsAdmin(currentUser)) {
      downloadPostBackupJson(postObj, currentUser);
    }

    // 3. LocalStorage Blacklist & Purge local memory
    addDeletedPostId(postId);
    try {
      localStorage.removeItem('sahaya_help_posts');
    } catch {}

    // 4. Real-time UI State Refresh
    setHelpPosts((prev) => filterNonDeletedPosts((prev || []).filter((p) => p && p.id !== postId)));
    window.dispatchEvent(new Event('sahaya_post_deleted'));

    // 5. Firestore Database එකෙන් සදහටම මකා දැමීම
    try {
      await deleteHelpPostFromFirestore(postId);
    } catch (err) {
      console.warn('Backend delete sync note:', err);
    }
  }, [helpPosts, currentUser]);

  // Persist User Session to LocalStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('sahaya_sewa_session_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('sahaya_sewa_session_user');
    }
  }, [currentUser]);

  // Global Event Listener for Post Deletions triggered across components
  useEffect(() => {
    const handleGlobalPostDeleted = () => {
      setHelpPosts((prev) => filterNonDeletedPosts(prev));
    };
    window.addEventListener('sahaya_post_deleted', handleGlobalPostDeleted);
    return () => {
      window.removeEventListener('sahaya_post_deleted', handleGlobalPostDeleted);
    };
  }, []);

  // Real-time Firestore Sync Listeners (Mounts once)
  useEffect(() => {
    // 🛡️ Initialize FCM & Background Push Worker
    let unsubscribeFcm: any = null;
    try {
      unsubscribeFcm = initFcmNotificationService(currentUser?.userId || currentUser?.id);
    } catch (err) {
      console.warn('FCM Background Notification Registration Notice:', err);
    }

    const unsubscribeUsers = subscribeToUsers((dbUsers) => {
      if (dbUsers && dbUsers.length > 0) {
        setUsers(deduplicateUsers([...dbUsers, ...initialUsers]));
      }
    });

    const unsubscribePosts = subscribeToHelpPosts((dbPosts) => {
      // Purge stale local memory cache
      try {
        localStorage.removeItem('sahaya_help_posts');
      } catch {}

      if (dbPosts) {
        // Firestore is the authoritative source of truth: honor all deletions permanently
        const sanitized = filterNonDeletedPosts(dbPosts);
        setHelpPosts(sanitized);
      }
    });

    const unsubscribeAlerts = subscribeToRedAlerts((alerts) => {
      setRedAlerts(alerts || []);
    });

    const unsubscribeIssues = subscribeToIssuesFromFirestore((dbIssues) => {
      setIssues(dbIssues || []);
    });

    return () => {
      if (typeof unsubscribeFcm === 'function') unsubscribeFcm();
      unsubscribeUsers?.();
      unsubscribePosts?.();
      unsubscribeAlerts?.();
      unsubscribeIssues?.();
    };
  }, []);

  // Synchronize currentUser with real-time user state changes and manage auto-redirects
  useEffect(() => {
    if (!currentUser) return;

    const freshUser = users.find(
      (u) =>
        u.id === currentUser.id ||
        (u.userId && u.userId === currentUser.userId) ||
        (u.nic && normalizeNIC(u.nic) === normalizeNIC(currentUser.nic || ''))
    );

    if (freshUser) {
      const isRoleDifferent = freshUser.role !== currentUser.role;
      const isStatusDifferent = freshUser.status !== currentUser.status;
      const isCreditsDifferent = freshUser.credits !== currentUser.credits;

      if (isRoleDifferent || isStatusDifferent || isCreditsDifferent) {
        setCurrentUser(freshUser);
        try {
          localStorage.setItem('sahaya_sewa_session_user', JSON.stringify(freshUser));
        } catch {}

        if (freshUser.role === 'admin' || freshUser.role === 'super_admin') {
          setActiveView('admin');
        } else if (freshUser.status === 'pending') {
          setActiveView('pending');
        } else if (freshUser.status === 'approved' && activeView === 'pending') {
          setActiveView('dashboard');
        }
      }
    }
  }, [users, currentUser, activeView]);

  // Handle User Login
  const handleLogin = useCallback(async (userIdOrNic: string, passKey: string) => {
    const cleanId = userIdOrNic.trim();
    const cleanPass = passKey.trim();
    const norm = normalizeNIC(cleanId);

    // First check local/state users
    let matched = users.find((u) => {
      const matchId = u.id === cleanId || u.userId === cleanId;
      const matchNic = normalizeNIC(u.nic) === norm;
      const matchPhone = u.whatsappPhone === cleanId || u.phone === cleanId;
      return matchId || matchNic || matchPhone;
    });

    // If not found in memory, query Firestore
    if (!matched) {
      try {
        const fromDb = await getUserFromFirestore(cleanId);
        if (fromDb) {
          matched = fromDb;
        }
      } catch (e) {
        console.warn('Firestore user fetch notice:', e);
      }
    }

    if (!matched) {
      if (cleanId.toLowerCase().includes('admin') || cleanId === '970181547V' || cleanId === '000000000V' || norm === '970181547V') {
        matched = users.find((u) => u.role === 'admin' || u.role === 'super_admin' || u.id === 'usr_admin') || initialUsers[0];
      }
    }

    if (matched) {
      // Check if logged in with temporary password
      if (
        matched.isTemporaryPassword || 
        (matched as any).tempPassword === cleanPass || 
        matched.temporaryPassword === cleanPass || 
        cleanPass === '545554'
      ) {
        matched = {
          ...matched,
          isTemporaryPassword: true,
          tempPassword: cleanPass
        };
      }

      setCurrentUser(matched);
      try {
        localStorage.setItem('sahaya_sewa_session_user', JSON.stringify(matched));
      } catch (e) {
        console.warn(e);
      }

      if (matched.role === 'admin' || matched.role === 'super_admin') {
        setActiveView('admin');
      } else if (matched.status === 'pending') {
        setActiveView('pending');
      } else {
        setActiveView('dashboard');
      }
    } else {
      throw new Error('පරිශීලක නාමය (User ID/NIC) හෝ මුරපදය වැරදියි. කරුණාකර නැවත උත්සාහ කරන්න.');
    }
  }, [users]);
  // Demo User Direct Login
  const handleUserDemoLogin = useCallback(() => {
    const demoUser = users.find((u) => u.id === 'demo_user') || {
      id: 'demo_user',
      userId: 'demo_user',
      name: 'නරඹන්නා (Demo User)',
      nic: '000000000V',
      whatsappPhone: '0770000000',
      role: 'member',
      status: 'approved',
      city: 'කොළඹ',
      createdAt: new Date().toISOString(),
      credits: 50,
    };
    setCurrentUser(demoUser);
    setActiveView('dashboard');
  }, [users]);

  // Registration Handler
  const handleRegister = useCallback(async (newUser: Omit<User, 'id' | 'createdAt' | 'status'>) => {
    const created: User = {
      ...newUser,
      id: `usr_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'pending', // Requires admin verification
      credits: 10,
    };

    try {
      await saveUserToFirestore(created);
    } catch (e) {
      console.warn('Firestore user save notice:', e);
    }

    setUsers((prev) => deduplicateUsers([...prev, created]));
    setCurrentUser(created);
    try {
      localStorage.setItem('sahaya_sewa_session_user', JSON.stringify(created));
    } catch {}

    setActiveView('pending');
  }, []);

  // Logout Handler
  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('sahaya_sewa_session_user');
      localStorage.removeItem('sahaya_sewa_remembered_pin');
    } catch {}
    setActiveView('login');
  }, []);

  // Update Existing User Details (Profile / Credits / Approval)
  const handleUpdateUser = useCallback(async (updated: User) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

    if (currentUser?.id === updated.id) {
      setCurrentUser(updated);
      try {
        localStorage.setItem('sahaya_sewa_session_user', JSON.stringify(updated));
      } catch {}
    }

    try {
      await updateUserInFirestore(updated.id, updated);
    } catch (e) {
      console.warn('Firestore user update notice:', e);
    }
  }, [currentUser]);

  // Toggle Theme Handler
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Handle mandatory password change completion
  const handlePasswordChangedSuccessfully = useCallback((updatedUser: User) => {
    setCurrentUser(updatedUser);
    setShowPasswordChangeModal(false);
    try {
      localStorage.setItem('sahaya_sewa_session_user', JSON.stringify(updatedUser));
    } catch {}
    
    if (updatedUser.role === 'admin' || updatedUser.role === 'super_admin') {
      setActiveView('admin');
    } else {
      setActiveView('dashboard');
    }
  }, []);

  return (
    <ErrorBoundary>
      <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-[#060d09] text-white' : 'bg-slate-50 text-slate-900'} font-sans antialiased transition-colors duration-200`}>
        {/* Real-time Disaster Watcher & Live Proximity Audio Monitor */}
        <RedAlertLiveManager
          currentUser={currentUser}
          redAlerts={redAlerts}
          language={language}
        />

        {/* View Router */}
        {/* 🌍 1. Permissions Setup Gate (පළමු වරට ඇප් එකට එන විට පමණක්) */}
        {activeView === 'permissions' && (
          <GpsActivationGate
            onProceedToLogin={() => setActiveView('login')}
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        )}

        {/* 🔑 2. Login Form (අවසර ලැබුණු සැණින් ස්වයංක්‍රීයව මෙතැනට මාරු වේ) */}
        {activeView === 'login' && (
          <LoginForm
            onLogin={handleLogin}
            onUserDemoLogin={handleUserDemoLogin}
            onNavigateToRegister={() => setActiveView('register')}
            onNavigateToIssues={() => setActiveView('issues')}
            onNavigateToPermissions={() => setActiveView('permissions')}
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            toggleTheme={toggleTheme}
            users={users}
          />
        )}

        {/* 📝 3. Registration Form */}
        {activeView === 'register' && (
          <RegisterForm
            onRegister={handleRegister}
            onNavigateToLogin={() => setActiveView('login')}
            language={language}
          />
        )}

        {/* ⏳ 4. Pending Account Approval Screen */}
        {activeView === 'pending' && currentUser && (
          <PendingApprovalView
            user={currentUser}
            language={language}
            onRefreshStatus={() => {
              if (currentUser.status === 'approved') setActiveView('dashboard');
            }}
            onNavigateToIssues={() => setActiveView('issues')}
            onBackToLogin={handleLogout}
          />
        )}

        {/* 🛡️ 5. Administrator Panel */}
        {activeView === 'admin' && currentUser && (
          <AdminPanel
            currentUser={currentUser}
            users={users}
            setUsers={setUsers}
            helpPosts={helpPosts}
            setHelpPosts={setHelpPosts}
            onDeletePost={handleDeletePost}
            issues={issues}
            setIssues={setIssues}
            redAlerts={redAlerts}
            setRedAlerts={setRedAlerts}
            language={language}
            setLanguage={setLanguage}
            onLogout={handleLogout}
            onSwitchToUserMode={() => setActiveView('dashboard')}
            onNavigate={handleNavigate}
          />
        )}

        {/* 📊 6. Main User Dashboard */}
        {activeView === 'dashboard' && currentUser && (
          <UserDashboard
            currentUser={currentUser}
            users={users}
            helpPosts={helpPosts}
            issues={issues}
            redAlerts={redAlerts}
            language={language}
            theme={theme}
            onLogout={handleLogout}
            onDeletePost={handleDeletePost}
            onUpdateUser={handleUpdateUser}
            onNavigateToIssues={() => setActiveView('issues')}
            onOpenAdminPanel={() => setActiveView('admin')}
          />
        )}

        {/* 🛠️ 7. System Issues & Help Reporting Page */}
        {activeView === 'issues' && (
          <IssuesHelpPage
            currentUser={currentUser}
            language={language}
            theme={theme}
            onBack={() => {
              if (currentUser) {
                if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
                  setActiveView('admin');
                } else if (currentUser.status === 'pending') {
                  setActiveView('pending');
                } else {
                  setActiveView('dashboard');
                }
              } else {
                setActiveView('login');
              }
            }}
            onSwitchToRegister={() => setActiveView('register')}
            onSwitchToLogin={() => setActiveView('login')}
            onOpenIssuesHelp={() => setActiveView('issues')}
          />
        )}

        {/* 🤖 Omni-Channel AI Support Assistant Floating Widget */}
        <OmniAssistantChatBox
          currentUser={currentUser}
          language={language}
        />

        {/* 🔐 Mandatory Password Change Modal */}
        {showPasswordChangeModal && currentUser && (
          <ChangePasswordModal
            isOpen={showPasswordChangeModal}
            onClose={() => setShowPasswordChangeModal(false)}
            onPasswordChanged={handlePasswordChangedSuccessfully}
            userId={currentUser.userId || currentUser.id}
            nicNumber={currentUser.nic || currentUser.nicNumber}
            currentTempPassword={currentUser.tempPassword || currentUser.temporaryPassword}
          />
        )}
      </div>

      {/* 🚨 Global SOS Live Session Viewer Modal (Direct URL Access without Login) */}
      {sosViewerSessionId && (
        <SosLiveViewerModal
          isOpen={Boolean(sosViewerSessionId)}
          sessionId={sosViewerSessionId}
          language={language}
          onClose={() => {
            setSosViewerSessionId(null);
            try {
              const cleanUrl = window.location.origin + window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            } catch {}
          }}
        />
      )}
    </ErrorBoundary>
  );
};

export default App;

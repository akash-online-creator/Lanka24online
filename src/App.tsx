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
import { AppUpdateModal } from './components/AppUpdateModal';
import { checkForAppUpdate, AppUpdateInfo } from './utils/apkDownloadHelper';
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
      const isNativeReady = typeof window !== 'undefined' && 
        (window as any).__sahaya_native_notif_granted === true && 
        (window as any).__sahaya_native_location_granted === true;

      if (!isPermDone && !isNativeReady) {
        return 'permissions';
      }
    } catch {}
    return 'login';
  });

  // Global Navigation Handler
  const handleNavigate = useCallback((view: 'permissions' | 'login' | 'register' | 'dashboard' | 'admin' | 'pending' | 'issues') => {
    setActiveView(view);
  }, []);

  // Permanent Deletion Core Handler (Workflow Steps 1 to 4)
  const handleDeletePost = useCallback(async (target: string | HelpPost) => {
    const postId = typeof target === 'string' ? target : target.id;
    if (!postId) return;
    const postObj = typeof target === 'object' ? target : helpPosts.find((p) => p && p.id === postId);

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
      console.warn('Backend delete sync notice:', err);
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
    // Initialize FCM & Background Push Worker
    const unsubscribeFcm = initFcmNotificationService(currentUser?.userId || currentUser?.id);

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
      unsubscribeFcm?.();
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
        (u.id && u.id === currentUser.id) || 
        (u.userId && u.userId === currentUser.userId) ||
        (u.nicNumber && u.nicNumber === currentUser.nicNumber)
    );

    if (freshUser) {
      // Check if user status or critical data updated
      if (JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(freshUser);
        try {
          localStorage.setItem('sahaya_sewa_session_user', JSON.stringify(freshUser));
        } catch (e) {
          console.warn(e);
        }
      }

      // 🚨 Force Kick if Blocked by Admin
      if (freshUser.status === 'blocked') {
        alert(
          language === 'en' 
            ? '⚠️ Your account has been suspended by the administrator.' 
            : language === 'ta'
            ? '⚠️ உங்கள் கணக்கு நிர்வாகியால் இடைநிறுத்தப்பட்டுள்ளது.'
            : '⚠️ ඔබගේ ගිණුම පරිපාලක විසින් අවහිර කර ඇත.'
        );
        setCurrentUser(null);
        localStorage.removeItem('sahaya_sewa_session_user');
        setActiveView('login');
      }
    }
  }, [users, currentUser, language]);

  // Secure User Log In Handler (Hardcoded Passwords & Admin Bypass Removed)
  const handleLogin = useCallback(async (userIdOrNic: string, passKey: string) => {
    const cleanId = userIdOrNic.trim();
    const cleanPass = passKey.trim();

    if (!cleanId || !cleanPass) {
      throw new Error('කරුණාකර ඔබගේ හැඳුනුම්පත් අංකය සහ මුරපදය ඇතුළත් කරන්න.');
    }

    const norm = normalizeNIC(cleanId);
    let matched = users.find(
      (u) =>
        (
          normalizeNIC(u.nic || '') === norm || 
          normalizeNIC(u.nicNumber || '') === norm || 
          u.id === cleanId || 
          u.userId === cleanId || 
          u.whatsappPhone === cleanId
        ) &&
        (
          u.temporaryPassword === cleanPass || 
          (u as any).tempPassword === cleanPass || 
          u.password === cleanPass || 
          (u as any).key === cleanPass
        )
    );

    if (!matched) {
      try {
        const remoteUser = await getUserFromFirestore(cleanId);
        if (remoteUser) {
          const storedPass = remoteUser.password || remoteUser.temporaryPassword || (remoteUser as any).key || (remoteUser as any).tempPassword;
          if (storedPass && String(storedPass).trim() === cleanPass) {
            matched = remoteUser;
          }
        }
      } catch (_) {}
    }

    if (matched) {
      // Check if logged in with temporary password
      if (
        matched.isTemporaryPassword || 
        (matched as any).tempPassword === cleanPass || 
        matched.temporaryPassword === cleanPass
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
      status: 'pending', // Awaiting Admin Approval
      credits: 50, // Welcome Gift Credits
    };

    setUsers((prev) => deduplicateUsers([created, ...prev]));
    setCurrentUser(created);
    setActiveView('pending');

    try {
      await saveUserToFirestore(created);
    } catch (e) {
      console.warn('Firestore register notice:', e);
    }
  }, []);

  // Logout Handler
  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setActiveView('login');
    localStorage.removeItem('sahaya_sewa_session_user');
  }, []);

  // 🔑 Permanent Password Update Handler (නව මුරපදය ස්ථිරව සුරැකීම)
  const handleSaveNewPassword = useCallback(async (newPassword: string) => {
    if (!currentUser) return;
    const cleanNewPass = newPassword.trim();
    if (!cleanNewPass) return;

    const updatedUser: User = {
      ...currentUser,
      password: cleanNewPass,
      key: cleanNewPass as any,
      isTemporaryPassword: false,
      isPasswordChanged: true,
      tempPassword: '',
      temporaryPassword: '',
      updatedAt: new Date().toISOString(),
    };

    // 1. Update in Firestore
    try {
      await updateUserInFirestore(currentUser.id, {
        password: cleanNewPass,
        key: cleanNewPass,
        isTemporaryPassword: false,
        isPasswordChanged: true,
        tempPassword: '',
        temporaryPassword: '',
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Firestore password update error:', e);
    }

    // 2. Synchronize local state and session
    setCurrentUser(updatedUser);
    setUsers((prev) => (prev || []).map((u) => (u && u.id === currentUser.id ? updatedUser : u)));
    try {
      localStorage.setItem('sahaya_sewa_session_user', JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('LocalStorage session update error:', e);
    }
  }, [currentUser]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleCreateIssue = useCallback((newIssue: Omit<Issue, 'id' | 'issueCode' | 'createdAt' | 'status'>) => {
    const created: Issue = {
      ...newIssue,
      id: `issue_${Date.now()}`,
      issueCode: `ISS-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    setIssues((prev) => [created, ...prev]);
  }, []);

  const handleUpdateIssueStatus = useCallback((issueId: string, status: Issue['status'], adminReply?: string) => {
    setIssues((prev) =>
      prev.map((iss) => (iss.id === issueId ? { ...iss, status, adminReply: adminReply ?? iss.adminReply } : iss))
    );
  }, []);

  // 🚀 Android In-App Update Verification Logic
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  useEffect(() => {
    // Check for APK update asynchronously in background on mount
    const verifyAppVersion = async () => {
      try {
        const info = await checkForAppUpdate();
        if (info && info.hasUpdate) {
          setUpdateInfo(info);
          setIsUpdateModalOpen(true);
        }
      } catch (e) {
        // Silent update check notice
      }
    };

    const timer = setTimeout(() => {
      verifyAppVersion();
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      {/* 🚀 First-Launch GPS Permission & City Locking Gate */}
      {activeView === 'permissions' && (
        <GpsActivationGate
          onProceedToLogin={() => setActiveView('login')}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {/* 📱 24/7 Red Alert Live Proximity Siren & Notification Engine */}
      <RedAlertLiveManager
        redAlerts={redAlerts}
        language={language}
        activeView={activeView}
      />

      {/* 💬 Global Omnipresent AI Assistant Bot */}
      <OmniAssistantChatBox
        language={language}
        currentUser={currentUser}
      />

      {/* 🔐 Authentication & Onboarding Views */}
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
          showDemoUserLogin={true}
          users={users}
          onSuccessfulPinLogin={(user) => {
            setCurrentUser(user);
            setActiveView('dashboard');
          }}
        />
      )}

      {activeView === 'register' && (
        <RegisterForm
          onRegisterSuccess={handleRegister}
          onNavigateToLogin={() => setActiveView('login')}
          onNavigateToIssues={() => setActiveView('issues')}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {activeView === 'pending' && currentUser && (
        <PendingApprovalView
          user={currentUser}
          onLogout={handleLogout}
          onNavigateToIssues={() => setActiveView('issues')}
          onCheckStatusAgain={async () => {
            try {
              const fresh = await getUserFromFirestore(currentUser.id);
              if (fresh && fresh.status === 'approved') {
                setCurrentUser(fresh);
                setActiveView('dashboard');
              }
            } catch {}
          }}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {activeView === 'issues' && (
        <IssuesHelpPage
          onBack={() => setActiveView(currentUser ? (checkIsAdmin(currentUser) ? 'admin' : 'dashboard') : 'login')}
          onSubmitIssue={handleCreateIssue}
          currentUser={currentUser}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {/* 🛡️ Administrator Operations Dashboard */}
      {activeView === 'admin' && currentUser && (
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

      {/* 🤝 Community User Dashboard & Help Board Feed */}
      {activeView === 'dashboard' && currentUser && (
        <UserDashboard
          user={currentUser}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          users={users}
          setUsers={setUsers}
          helpPosts={helpPosts}
          setHelpPosts={setHelpPosts}
          redAlerts={redAlerts}
          setRedAlerts={setRedAlerts}
          issues={issues}
          setIssues={setIssues}
          onLogout={handleLogout}
          onDeletePost={handleDeletePost}
          onPermanentDeletePost={handleDeletePost}
          onOpenAdminPanel={() => setActiveView('admin')}
          onNavigateToIssues={() => setActiveView('issues')}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {/* 🚀 In-App Version Update Notification Modal */}
      {isUpdateModalOpen && updateInfo && (
        <AppUpdateModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          onDismiss={() => {
            setIsUpdateModalOpen(false);
            try {
              localStorage.setItem('sahaya_dismissed_update_version', updateInfo.latestVersion);
            } catch {}
          }}
          updateInfo={updateInfo}
          language={language}
        />
      )}

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

      {/* 🔑 First-time Temporary Password Change Dialog */}
      {currentUser && Boolean(currentUser.isTemporaryPassword) && (
        <ChangePasswordModal
          isOpen={Boolean(currentUser.isTemporaryPassword)}
          onClose={() => {}}
          onSave={handleSaveNewPassword}
          language={language}
          userNic={currentUser.nic || currentUser.nicNumber || currentUser.userId}
        />
      )}
    </ErrorBoundary>
  );
};

export default App;

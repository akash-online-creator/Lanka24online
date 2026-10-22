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
import { DevicePinSetupModal } from './components/DevicePinSetupModal';
import { getStoredDevicePin } from './utils/devicePinManager';
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
import { getCachedSettings } from './utils/systemSettingsManager';
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
  const [isPinSetupRequired, setIsPinSetupRequired] = useState<boolean>(false);

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
  // 🚀 In-App Version Update Check State
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  useEffect(() => {
    // Check for updates 1.5s after app launch
    const updateTimer = setTimeout(async () => {
      try {
        const info = await checkForAppUpdate();
        if (info && info.hasUpdate) {
          const lastDismissed = localStorage.getItem('sahaya_update_dismissed_time');
          // Only show if not dismissed in the last 6 hours
          if (!lastDismissed || Date.now() - parseInt(lastDismissed, 10) > 6 * 3600 * 1000) {
            setUpdateInfo(info);
            setIsUpdateModalOpen(true);
          }
        }
      } catch (err) {
        console.debug('In-app update check note:', err);
      }
    }, 1500);

    return () => clearTimeout(updateTimer);
  }, []);

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [activeView, setActiveView] = useState<'permissions' | 'login' | 'register' | 'dashboard' | 'admin' | 'pending' | 'issues'>(() => {
    try {
      // 1. Quick PIN Check: If user set a Quick PIN on this device, open directly at Quick PIN screen!
      const storedPin = getStoredDevicePin();
      if (storedPin) {
        return 'login';
      }

      // 2. Check if permissions setup has been completed on initial launch
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

        if (freshUser.status === 'blocked') {
          handleLogout();
          alert('ඔබගේ ගිණුම පරිපාලක විසින් අවහිර කර ඇත.');
          return;
        }

        if (isStatusDifferent && activeView === 'pending' && freshUser.status === 'approved') {
          setActiveView(freshUser.role === 'admin' || freshUser.role === 'super_admin' ? 'admin' : 'dashboard');
        }
      }
    }
  }, [users, currentUser, activeView]);

  // 🛡️ Ensure Device Quick PIN is mandatory upon login / session restore (EXCEPT for Demo users)
  useEffect(() => {
    if (currentUser) {
      // 🚀 Demo Account එක සඳහා PIN අංකය අවශ්‍ය නැත
      if (currentUser.id === 'demo_user' || currentUser.userId === 'demo_user' || currentUser.isDemo || currentUser.nic === '000000000V') {
        setIsPinSetupRequired(false);
        return;
      }

      const storedPin = getStoredDevicePin();
      const currentMatchedId = currentUser.id || currentUser.userId || currentUser.nicNumber || currentUser.nic;
      const currentNic = currentUser.nic || currentUser.nicNumber;
      if (!storedPin || (storedPin.userId !== currentMatchedId && (!currentNic || storedPin.nicNumber !== currentNic))) {
        setIsPinSetupRequired(true);
      }
    }
  }, [currentUser]);

  // 🛡️ Strict Login Handler (ජාතික හැඳුනුම්පතට අදාළ නිවැරදි මුරපදයෙන් පමණක් ඇතුල් වීමට ඉඩ දීම)
  const handleLogin = useCallback(async (userIdOrNic: string, passKey: string) => {
    const cleanId = (userIdOrNic || '').trim();
    const cleanPass = (passKey || '').trim();

    if (!cleanId) {
      throw new Error('කරුණාකර ජාතික හැඳුනුම්පත් අංකය (NIC) ඇතුළත් කරන්න.');
    }
    if (!cleanPass) {
      throw new Error('කරුණාකර ඔබගේ මුරපදය ඇතුළත් කරන්න.');
    }

    const norm = normalizeNIC(cleanId);

    // 1. පරිශීලක ලැයිස්තුවෙන් (users) අදාළ NIC හෝ User ID හිමි ගිණුම සෙවීම
    let matchedUser = users.find((u) => {
      if (!u) return false;
      const uNic = normalizeNIC(u.nic || u.nicNumber || '');
      const uUserId = normalizeNIC(u.userId || '');
      const uId = (u.id || '').trim();
      const uPhone = (u.whatsappPhone || u.phone || '').trim();
      const uEmail = (u.email || '').trim().toLowerCase();

      return (
        (norm !== '' && (uNic === norm || uUserId === norm)) ||
        (cleanId !== '' && uId === cleanId) ||
        (cleanId.toLowerCase() === 'admin' && (u.role === 'admin' || u.role === 'super_admin')) ||
        (cleanId.length >= 9 && (uPhone === cleanId || uEmail === cleanId.toLowerCase()))
      );
    });

    // 2. Local memory එකෙහි නැතිනම් Firestore වෙතින් Document ID අනුව සෙවීම
    if (!matchedUser) {
      try {
        const remoteUser = await getUserFromFirestore(cleanId);
        if (remoteUser) {
          matchedUser = remoteUser;
        }
      } catch (_) {}
    }

    // 3. initialUsers (පද්ධතියේ මූලික පරිශීලකයින්) අතර සෙවීම
    if (!matchedUser) {
      matchedUser = initialUsers.find((u) => {
        if (!u) return false;
        const uNic = normalizeNIC(u.nicNumber || u.nic || '');
        const uUserId = normalizeNIC(u.userId || '');
        return (
          (norm !== '' && (uNic === norm || uUserId === norm)) ||
          u.id === cleanId ||
          (cleanId.toLowerCase() === 'admin' && (u.role === 'admin' || u.role === 'super_admin'))
        );
      });
    }

    // 4. එවැනි NIC එකක් සහිත කිසිදු ගිණුමක් නොමැති නම් දෝෂයක් පෙන්වීම
    if (!matchedUser) {
      throw new Error('මෙම ජාතික හැඳුනුම්පත් අංකය (NIC) සහිත ගිණුමක් සොයාගත නොහැක. කරුණාකර නිවැරදි NIC අංකය ඇතුළත් කරන්න හෝ ලියාපදිංචි වන්න.');
    }

    // 5. 🛡️ අතිශය දැඩි මුරපද සත්‍යාපනය (STRICT PASSWORD CHECK):
    // කිසිදු Backdoor මුරපදයක්, විශ්ව මුරපදයක් හෝ මුරපදය නොමැතිව පිවිසීමක් සිදු නොවේ!
    // මෙම නිශ්චිත ගිණුමට අදාළ ස්ථිර මුරපදය (password / key) හෝ පරිපාලක ලබා දුන් තාවකාලික මුරපදය (temporaryPassword / tempPassword) පමණක් පිළිගැනේ.
    const userPass = String(matchedUser.password || (matchedUser as any).key || '').trim();
    const userTempPass = String(matchedUser.temporaryPassword || (matchedUser as any).tempPassword || '').trim();

    const isPermanentMatch = userPass !== '' && cleanPass === userPass;
    const isTemporaryMatch = userTempPass !== '' && cleanPass === userTempPass;

    if (!isPermanentMatch && !isTemporaryMatch) {
      throw new Error('ඇතුළත් කළ මුරපදය වැරදියි! කරුණාකර මෙම ජාතික හැඳුනුම්පතට අදාළ නිවැරදි මුරපදය ඇතුළත් කරන්න.');
    }

    // 6. මුරපදය නිවැරදි නම් පමණක් Login වීම සම්පූර්ණ කිරීම
    let authenticatedUser: User = { ...matchedUser };

    // තාවකාලික මුරපදයකින් පිවිසියේ නම් මුරපදය වෙනස් කිරීමේ Modal එක විවෘත කිරීමට සටහන් කිරීම
    if (isTemporaryMatch && !isPermanentMatch) {
      authenticatedUser.isTemporaryPassword = true;
      (authenticatedUser as any).tempPassword = cleanPass;
    }

    setCurrentUser(authenticatedUser);
    try {
      localStorage.setItem('sahaya_sewa_session_user', JSON.stringify(authenticatedUser));
    } catch (e) {
      console.warn(e);
    }

    // 4-digit device PIN එක පරීක්ෂා කිරීම (Demo පරිශීලකයින් හැර)
    const isDemoUser = authenticatedUser.id === 'demo_user' || authenticatedUser.userId === 'demo_user' || authenticatedUser.isDemo || authenticatedUser.nic === '000000000V';
    if (!isDemoUser) {
      const storedPin = getStoredDevicePin();
      const currentMatchedId = authenticatedUser.id || authenticatedUser.userId || authenticatedUser.nicNumber;
      if (!storedPin || (storedPin.userId !== currentMatchedId && storedPin.nicNumber !== authenticatedUser.nicNumber)) {
        setIsPinSetupRequired(true);
        return;
      }
    }

    if (authenticatedUser.role === 'admin' || authenticatedUser.role === 'super_admin') {
      setActiveView('admin');
    } else if (authenticatedUser.status === 'pending') {
      setActiveView('pending');
    } else {
      setActiveView('dashboard');
    }
  }, [users]);
  // Device PIN Login Success Handler
  const handlePinLoginSuccess = useCallback((authenticatedUser: User) => {
    setCurrentUser(authenticatedUser);
    try {
      localStorage.setItem('sahaya_sewa_session_user', JSON.stringify(authenticatedUser));
    } catch (e) {
      console.warn(e);
    }

    if (authenticatedUser.role === 'admin' || authenticatedUser.role === 'super_admin') {
      setActiveView('admin');
    } else if (authenticatedUser.status === 'pending') {
      setActiveView('pending');
    } else {
      setActiveView('dashboard');
    }
  }, []);

  // Demo User Direct Login (🚀 PIN අංකයක් අවශ්‍ය නැත)
  const handleUserDemoLogin = useCallback(() => {
    const settings = getCachedSettings();
    if (settings && settings.enableDemoLogin === false) {
      alert('පරිපාලක (Admin) විසින් Demo පිවිසුම අක්‍රීය කර ඇත. කරුණාකර ලියාපදිංචි වී පිවිසෙන්න.');
      return;
    }
    const baseDemo = users.find((u) => u.id === 'demo_user') || {
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

    const demoUser: User = {
      ...baseDemo,
      isDemo: true, // 🚀 Demo පරිශීලකයෙකු ලෙස සලකුණු කිරීම
    };

    setCurrentUser(demoUser);
    setIsPinSetupRequired(false); // 🚀 Demo Account එක සඳහා PIN අංකය කිසිසේත්ම අවශ්‍ය නොවේ
    try {
      localStorage.setItem('sahaya_sewa_session_user', JSON.stringify(demoUser));
    } catch (e) {
      console.warn(e);
    }
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

    setIssues((prev) => [created, ...(prev || [])]);
  }, []);

  const handleBackFromIssues = useCallback(() => {
    if (!currentUser) {
      setActiveView('login');
    } else if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
      setActiveView('admin');
    } else {
      setActiveView('dashboard');
    }
  }, [currentUser]);

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
        {activeView === 'permissions' && (
          <GpsActivationGate
            onProceedToLogin={() => setActiveView('login')}
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        )}

        {activeView === 'login' && (
          <LoginForm
            onLogin={handleLogin}
            onSuccessfulPinLogin={handlePinLoginSuccess}
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

        {activeView === 'register' && (
          <RegisterForm
            onRegister={handleRegister}
            onNavigateToLogin={() => setActiveView('login')}
            language={language}
          />
        )}

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

        {activeView === 'dashboard' && currentUser && (
          <UserDashboard
            user={currentUser}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            onUpdateUser={(updated) => setCurrentUser(updated)}
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
            theme={theme}
            setTheme={setTheme}
            toggleTheme={toggleTheme}
            onLogout={handleLogout}
            onNavigateToIssues={() => setActiveView('issues')}
            onNavigate={handleNavigate}
            onOpenAdminPanel={() => setActiveView('admin')}
            onPermanentDeletePost={(postId) => {
              setHelpPosts((prev) => prev.filter((p) => p && p.id !== postId));
            }}
            onUpdatePost={(updated) => {
              setHelpPosts((prev) => prev.map((p) => p && p.id === updated.id ? updated : p));
            }}
          />
        )}

        {activeView === 'issues' && (
          <IssuesHelpPage
            issues={issues}
            users={users}
            currentUser={currentUser}
            onSubmitIssue={handleCreateIssue}
            onBackToLogin={handleBackFromIssues}
            language={language}
          />
        )}

        {/* Global Floating AI Assistant for Auth and non-dashboard pages */}
        {activeView !== 'dashboard' && (
          <OmniAssistantChatBox
            currentLanguage={language}
            onLanguageChange={setLanguage}
            mode={currentUser ? 'full' : 'auth'}
            onSwitchToRegister={() => setActiveView('register')}
            onSwitchToLogin={() => setActiveView('login')}
            onOpenIssuesHelp={() => setActiveView('issues')}
            onDemoLogin={handleUserDemoLogin}
          />
        )}

        {/* 🔒 තාවකාලික මුරපදයෙන් ලොග් වූ පසු අනිවාර්යයෙන්ම නව මුරපදයක් සකස් කර ගන්නා තෙක් පෙන්වන Modal එක */}
        {currentUser && Boolean(currentUser.isTemporaryPassword) && (
          <ChangePasswordModal
            isOpen={true}
            onClose={() => {
              handleLogout();
            }}
            onSavePassword={handleSaveNewPassword}
            userName={currentUser.name}
            nicNumber={currentUser.nic || currentUser.nicNumber}
            currentTempPassword={currentUser.tempPassword || currentUser.temporaryPassword}
          />
        )}
      </div>

      {/* 🔢 Mandatory Device PIN Setup Modal (Demo පරිශීලකයින් හැර සාමාන්‍ය පරිශීලකයින්ට පමණක් Login වීමේදී පෙන්වයි) */}
      {isPinSetupRequired && currentUser && !currentUser.isDemo && currentUser.id !== 'demo_user' && (
        <DevicePinSetupModal
          isOpen={isPinSetupRequired}
          onClose={() => {}} // Mandatory setup on first login
          currentUser={currentUser}
          language={language}
          onPinConfigured={(updatedUser) => {
            setCurrentUser(updatedUser);
            setIsPinSetupRequired(false);
            setActiveView(
              updatedUser.role === 'admin' || updatedUser.role === 'super_admin'
                ? 'admin'
                : updatedUser.status === 'pending'
                ? 'pending'
                : 'dashboard'
            );
          }}
        />
      )}

      {/* 🚀 In-App Version Update Notification Modal */}
      {updateInfo && (
        <AppUpdateModal
          isOpen={isUpdateModalOpen}
          onClose={() => {
            setIsUpdateModalOpen(false);
            try {
              localStorage.setItem('sahaya_update_dismissed_time', Date.now().toString());
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
    </ErrorBoundary>
  );
};

export default App;



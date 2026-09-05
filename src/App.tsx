import React, { useState, useEffect } from 'react';
import { User, Issue, Language, Theme, ViewMode, Role, BlockedCredential, HelpPost, RegistrationConfig, CategoryItem, TagItem } from './types';
import { initialUsers, initialIssues, initialHelpPosts, initialRegistrationConfig, initialCategories } from './data/initialData';
import { getStoredTags, saveTagsToStorage } from './utils/tagUtils';
import { translations } from './data/translations';
import { Header } from './components/Header';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { PendingApprovalView } from './components/PendingApprovalView';
import { WrongLoginModal } from './components/WrongLoginModal';
import { IssuesHelpPage } from './components/IssuesHelpPage';
import { AdminPanel } from './components/AdminPanel';
import { UserDashboard } from './components/UserDashboard';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { applyAppFontSize, getStoredFontSize } from './components/UserSettingsModal';
import { subscribeToHelpPosts, updateHelpPostInFirestore, deleteHelpPostFromFirestore, seedDemoHelpPostsToFirestore } from './lib/firebase';

export default function App() {
  // Persistence state setup
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('sahaya_lang');
    return (saved as Language) || 'si';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('sahaya_theme');
    return (saved as Theme) || 'light';
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sahaya_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialUsers[1] || initialUsers[0];
      }
    }
    return initialUsers[1] || initialUsers[0];
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedMode = localStorage.getItem('sahaya_view_mode') as ViewMode | null;
    const savedUser = localStorage.getItem('sahaya_current_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed?.role === 'admin') return savedMode || 'admin';
        if (parsed?.status === 'approved') return savedMode || 'dashboard';
        if (parsed?.status === 'pending') return 'pending';
      } catch {
        return 'dashboard';
      }
    }
    return savedMode || 'dashboard';
  });

  const [activeRoleView, setActiveRoleView] = useState<Role>(() => {
    const savedUser = localStorage.getItem('sahaya_current_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        return parsed?.role === 'admin' ? 'admin' : 'user';
      } catch {
        return 'user';
      }
    }
    return 'user';
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('sahaya_users');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [issues, setIssues] = useState<Issue[]>(() => {
    const saved = localStorage.getItem('sahaya_issues');
    return saved ? JSON.parse(saved) : initialIssues;
  });

  const [helpPosts, setHelpPosts] = useState<HelpPost[]>(() => {
    const saved = localStorage.getItem('sahaya_help_posts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        return initialHelpPosts;
      }
    }
    return initialHelpPosts;
  });

  const [blockedCredentials, setBlockedCredentials] = useState<BlockedCredential[]>(() => {
    const saved = localStorage.getItem('sahaya_blocked_credentials');
    return saved ? JSON.parse(saved) : [];
  });

  const [registrationConfig, setRegistrationConfig] = useState<RegistrationConfig>(() => {
    const saved = localStorage.getItem('sahaya_registration_config');
    return saved ? JSON.parse(saved) : initialRegistrationConfig;
  });

  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    const saved = localStorage.getItem('sahaya_categories');
    if (saved) {
      try {
        let parsed: CategoryItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed = parsed.filter((c) => c && typeof c === 'object' && Boolean(c.id));
          return parsed;
        }
      } catch {
        return initialCategories;
      }
    }
    return initialCategories;
  });

  const [tags, setTags] = useState<TagItem[]>(() => getStoredTags());

  const [showWrongLoginModal, setShowWrongLoginModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [serverTime, setServerTime] = useState('');

  // Sync real-time Firestore help posts
  useEffect(() => {
    const unsubscribe = subscribeToHelpPosts((remotePosts) => {
      setHelpPosts(remotePosts || []);
    });
    return () => unsubscribe();
  }, []);

  // Persist storage updates
  useEffect(() => {
    localStorage.setItem('sahaya_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('sahaya_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('sahaya_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sahaya_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('sahaya_issues', JSON.stringify(issues));
  }, [issues]);

  useEffect(() => {
    localStorage.setItem('sahaya_help_posts', JSON.stringify(helpPosts));
  }, [helpPosts]);

  useEffect(() => {
    localStorage.setItem('sahaya_blocked_credentials', JSON.stringify(blockedCredentials));
  }, [blockedCredentials]);

  useEffect(() => {
    localStorage.setItem('sahaya_registration_config', JSON.stringify(registrationConfig));
  }, [registrationConfig]);

  useEffect(() => {
    localStorage.setItem('sahaya_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    saveTagsToStorage(tags);
  }, [tags]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('sahaya_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('sahaya_current_user');
    }
  }, [currentUser]);

  // Live Server clock
  useEffect(() => {
    applyAppFontSize(getStoredFontSize());
    const updateTime = () => {
      const now = new Date();
      setServerTime(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Helper check if credential is blocked
  const isCredentialBlocked = (checkStr: string): boolean => {
    if (!checkStr) return false;
    const cleanStr = checkStr.trim().toLowerCase();
    return blockedCredentials.some(
      (bc) =>
        (bc.phone && bc.phone.trim().toLowerCase() === cleanStr) ||
        (bc.nicNumber && bc.nicNumber.trim().toLowerCase() === cleanStr) ||
        (bc.email && bc.email.trim().toLowerCase() === cleanStr) ||
        (bc.ipAddress && bc.ipAddress.trim().toLowerCase() === cleanStr) ||
        (bc.userId && bc.userId.trim().toLowerCase() === cleanStr)
    );
  };

  // Auth Handler
  const handleLogin = (userIdInput: string, keyInput: string) => {
    const cleanInput = userIdInput.trim().toLowerCase();

    // Admin Master Check
    if (
      (userIdInput.toUpperCase() === '970181547V' && keyInput === '1691@@Devhas') ||
      (userIdInput === 'admin' && keyInput === 'admin123')
    ) {
      const adminUser = users.find((u) => u.userId === '970181547V' || u.role === 'admin') || initialUsers[0];
      setCurrentUser(adminUser);
      setActiveRoleView('admin');
      setViewMode('admin');
      return;
    }

    // Check if input matches any Blocked credentials list
    if (isCredentialBlocked(cleanInput)) {
      alert('⛔ අවධානයයි: ඔබගේ ගිණුම, දුරකථන අංකය, ජා.හැ. අංකය, Gmail හෝ IP ලිපිනය පරිපාලක (Admin) විසින් අවහිර (Block) කර ඇත. පද්ධතියට ඇතුළු විය නොහැක.');
      return;
    }

    const foundUser = users.find(
      (u) =>
        (u.userId.toLowerCase() === cleanInput ||
          u.nicNumber?.toLowerCase() === cleanInput ||
          u.email.toLowerCase() === cleanInput ||
          u.phone.toLowerCase() === cleanInput) &&
        (u.key === keyInput ||
          (u.securityCode && u.securityCode === keyInput) ||
          (u.tempCode && u.tempCode === keyInput))
    );

    if (!foundUser) {
      // Piyawara 1.2: Invalid Login trigger
      setShowWrongLoginModal(true);
      return;
    }

    // Check if user account status is explicitly blocked
    if (foundUser.status === 'blocked') {
      alert(`⛔ අවධානයයි: පරිපාලක (Admin) විසින් ඔබගේ ගිණුම අවහිර (Block) කර ඇත.\nහේතුව: ${foundUser.blockedReason || 'නීති රීති උල්ලංඝනය කිරීම'}`);
      return;
    }

    // Valid User logic
    setCurrentUser(foundUser);

    if (foundUser.role === 'admin') {
      setActiveRoleView('admin');
      setViewMode('admin');
    } else if (foundUser.status === 'pending') {
      // Piyawara 1.1: Pending status redirect
      setViewMode('pending');
    } else if (foundUser.status === 'approved') {
      setViewMode('dashboard');
      // Show password change modal if user hasn't changed default/temp password yet
      if (foundUser.role !== 'admin' && !foundUser.isPasswordChanged) {
        setShowChangePasswordModal(true);
      }
    } else if (foundUser.status === 'rejected') {
      setShowWrongLoginModal(true);
    }
  };

  const handleRegister = (newUser: Omit<User, 'id' | 'registeredAt'>) => {
    // Check if any of user's details (Phone, NIC, Email, IP) are blocked
    const isBlocked =
      isCredentialBlocked(newUser.phone) ||
      isCredentialBlocked(newUser.nicNumber) ||
      isCredentialBlocked(newUser.email) ||
      isCredentialBlocked(newUser.ipAddress || '') ||
      users.some(
        (u) =>
          u.status === 'blocked' &&
          (u.phone === newUser.phone ||
            u.nicNumber === newUser.nicNumber ||
            u.email === newUser.email)
      );

    if (isBlocked) {
      alert('⛔ අවධානයයි: ඔබගේ දුරකථන අංකය, ජා.හැ. අංකය, Gmail ලිපිනය හෝ IP ලිපිනය පරිපාලක (Admin) විසින් අවහිර (Block) කර ඇත. මෙම පද්ධතියට නැවත ලියාපදිංචි විය නොහැක.');
      return;
    }

    const createdUser: User = {
      ...newUser,
      id: `usr_${Date.now()}`,
      ipAddress: newUser.ipAddress || `192.168.1.${Math.floor(100 + Math.random() * 150)}`,
      registeredAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setUsers((prev) => [createdUser, ...prev]);
    setCurrentUser(null);
    setViewMode('login'); // Redirect to login page upon registration completion
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveRoleView('user');
    setViewMode('login');
  };

  // Admin User Actions
  const handleApproveUser = (targetUserId: string) => {
    setUsers((prev) =>
      (prev || []).map((u) => (u.id === targetUserId ? { ...u, status: 'approved' } : u))
    );
    if (currentUser && currentUser.id === targetUserId) {
      setCurrentUser((prev) => (prev ? { ...prev, status: 'approved' } : null));
    }
  };

  const handleRejectUser = (targetUserId: string, reason?: string) => {
    setUsers((prev) =>
      (prev || []).map((u) =>
        u.id === targetUserId
          ? { ...u, status: 'rejected', rejectionReason: reason }
          : u
      )
    );
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers((prev) => (prev || []).map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const handleSaveNewPassword = (newPassword: string) => {
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      key: newPassword,
      securityCode: newPassword,
      isPasswordChanged: true,
    };
    setCurrentUser(updatedUser);
    setUsers((prev) => (prev || []).map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    setShowChangePasswordModal(false);
  };

  const handleBlockUser = (targetUserId: string, reason: string) => {
    const userToBlock = users.find((u) => u.id === targetUserId);
    if (!userToBlock) return;

    const blockedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

    // Update user status
    setUsers((prev) =>
      (prev || []).map((u) =>
        u.id === targetUserId
          ? {
              ...u,
              status: 'blocked',
              blockedReason: reason,
              blockedAt,
            }
          : u
      )
    );

    // Append credential entries to blocked list so Phone, NIC, Email, IP are all blocked
    const newBlockedCred: BlockedCredential = {
      id: `block_${Date.now()}`,
      userId: userToBlock.userId,
      userName: userToBlock.name,
      phone: userToBlock.phone,
      nicNumber: userToBlock.nicNumber,
      email: userToBlock.email,
      ipAddress: userToBlock.ipAddress || '192.168.1.102',
      blockedAt,
      reason,
    };

    setBlockedCredentials((prev) => [newBlockedCred, ...(prev || [])]);
  };

  const handleUnblockCredential = (credentialId: string) => {
    const cred = (blockedCredentials || []).find((c) => c.id === credentialId);
    setBlockedCredentials((prev) => (prev || []).filter((c) => c.id !== credentialId));

    if (cred && cred.userId) {
      setUsers((prev) =>
        (prev || []).map((u) => (u.userId === cred.userId ? { ...u, status: 'approved' } : u))
      );
    }
  };

  const handleDeletePost = async (postId: string) => {
    const postToDelete = (helpPosts || []).find((p) => p.id === postId);
    const deletedPayload: Partial<HelpPost> = {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: currentUser ? `Admin (${currentUser.name})` : 'Admin',
      status: 'deleted',
    };

    setHelpPosts((prev) =>
      (prev || []).map((p) => (p.id === postId ? { ...p, ...deletedPayload } : p))
    );

    try {
      await updateHelpPostInFirestore(postId, deletedPayload);
    } catch (err) {
      console.warn('Post deletion sync notice:', err);
    }
  };

  const handlePermanentDeletePost = async (postId: string) => {
    setHelpPosts((prev) => (prev || []).filter((p) => p.id !== postId));
    try {
      await deleteHelpPostFromFirestore(postId);
    } catch (err) {
      console.warn('Post permanent deletion sync notice:', err);
    }
  };

  const handleRestorePost = async (postId: string) => {
    const restorePayload: Partial<HelpPost> = {
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
      status: 'active',
    };

    setHelpPosts((prev) =>
      (prev || []).map((p) => (p.id === postId ? { ...p, isDeleted: false, deletedAt: undefined, deletedBy: undefined, status: 'active' } : p))
    );

    try {
      await updateHelpPostInFirestore(postId, restorePayload);
    } catch (err) {
      console.warn('Post restore sync notice:', err);
    }
  };

  const handleUpdatePost = async (updatedPost: HelpPost) => {
    setHelpPosts((prev) => (prev || []).map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    try {
      await updateHelpPostInFirestore(updatedPost.id, updatedPost);
    } catch (err) {
      console.warn('Post update sync notice:', err);
    }
  };

  // Issue creation action (Piyawara 1.3)
  const handleSubmitIssue = (
    newIssueData: Omit<Issue, 'id' | 'issueCode' | 'createdAt' | 'status'>
  ) => {
    const createdIssue: Issue = {
      ...newIssueData,
      id: `iss_${Date.now()}`,
      issueCode: `#ISSUE-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'pending',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setIssues((prev) => [createdIssue, ...(prev || [])]);
  };

  const handleReplyIssue = (issueId: string, reply: string, resolve: boolean) => {
    setIssues((prev) =>
      (prev || []).map((iss) =>
        iss.id === issueId
          ? {
              ...iss,
              adminReply: reply,
              status: resolve ? 'resolved' : 'in_progress',
              updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
            }
          : iss
      )
    );
  };

  const handleSeedDemoData = async () => {
    setUsers(initialUsers);
    setIssues(initialIssues);
    setBlockedCredentials([]);
    try {
      await seedDemoHelpPostsToFirestore();
    } catch (e) {
      console.warn('Demo seed notice:', e);
    }
    alert('දර්ශන පරීක්ෂණ දත්ත (Demo Seed Data) සාර්ථකව ප්‍රතිස්ථාපනය කෙරිණි!');
  };

  const handleNavigate = (targetView: ViewMode) => {
    if (targetView === 'admin' && currentUser?.role !== 'admin') {
      if (currentUser && currentUser.status === 'approved') {
        setViewMode('dashboard');
      } else {
        setViewMode('login');
      }
      return;
    }
    setViewMode(targetView);
  };

  const t = translations[language];

  return (
    <div
      className={`min-h-screen w-full font-sans flex flex-col justify-between p-4 sm:p-8 relative overflow-x-hidden transition-colors ${
        theme === 'dark'
          ? 'bg-[#05120a] text-slate-100'
          : 'bg-[#f2f7f4] text-slate-900'
      }`}
    >
      {/* Background Glow Orbs */}
      <div className="absolute top-[-120px] left-[-120px] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-120px] right-[-120px] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation Header (For non-dashboard views like Register, Pending, Admin, Issues) */}
      {viewMode !== 'login' && viewMode !== 'dashboard' && (
        <Header
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          toggleTheme={toggleTheme}
          currentUser={currentUser}
          activeRoleView={activeRoleView}
          setActiveRoleView={setActiveRoleView}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}

      {/* Main Container Views */}
      <main className="flex-1 flex flex-col justify-center items-center z-10 my-2 w-full">
        {viewMode === 'login' && (
          <LoginForm
            onLogin={handleLogin}
            onNavigateToRegister={() => setViewMode('register')}
            onNavigateToIssues={() => setViewMode('issues_help')}
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        )}

        {viewMode === 'register' && (
          <RegisterForm
            onRegister={handleRegister}
            onNavigateToLogin={() => setViewMode('login')}
            registrationConfig={registrationConfig}
            language={language}
          />
        )}

        {viewMode === 'pending' && currentUser && (
          <PendingApprovalView
            user={currentUser}
            language={language}
            onRefreshStatus={() => {
              const latestUser = users.find((u) => u.id === currentUser.id);
              if (latestUser) {
                setCurrentUser(latestUser);
                if (latestUser.status === 'approved') {
                  setViewMode('dashboard');
                } else if (latestUser.status === 'blocked') {
                  alert(`ඔබගේ ගිණුම අවහිර කර ඇත.\nහේතුව: ${latestUser.blockedReason || 'නීති රීති උල්ලංඝනය කිරීම'}`);
                  handleLogout();
                } else {
                  alert('ඔබගේ ගිණුම තවමත් පරිපාලක (Admin) අනුමැතිය සඳහා පොරොත්තුවෙන් පවතී.');
                }
              }
            }}
            onNavigateToIssues={() => setViewMode('issues_help')}
            onBackToLogin={handleLogout}
          />
        )}

        {viewMode === 'issues_help' && (
          <IssuesHelpPage
            issues={issues}
            onSubmitIssue={handleSubmitIssue}
            onBackToLogin={() => {
              if (currentUser && currentUser.status === 'approved') {
                setViewMode('dashboard');
              } else {
                setViewMode('login');
              }
            }}
            language={language}
          />
        )}

        {viewMode === 'admin' && currentUser?.role === 'admin' && (
          <AdminPanel
            users={users}
            issues={issues}
            helpPosts={helpPosts}
            blockedCredentials={blockedCredentials}
            registrationConfig={registrationConfig}
            onUpdateRegistrationConfig={setRegistrationConfig}
            categories={categories}
            onUpdateCategories={setCategories}
            tags={tags}
            onUpdateTags={setTags}
            onApproveUser={handleApproveUser}
            onRejectUser={handleRejectUser}
            onUpdateUser={handleUpdateUser}
            onBlockUser={handleBlockUser}
            onUnblockCredential={handleUnblockCredential}
            onDeletePost={handleDeletePost}
            onPermanentDeletePost={handlePermanentDeletePost}
            onRestorePost={handleRestorePost}
            onUpdatePost={handleUpdatePost}
            onRestoreAllPosts={(restored) => {
              setHelpPosts((prev) => {
                const map = new Map((prev || []).map((p) => [p.id, p]));
                (restored || []).forEach((p) => map.set(p.id, p));
                return Array.from(map.values());
              });
            }}
            onReplyIssue={handleReplyIssue}
            onSeedDemoData={handleSeedDemoData}
            language={language}
          />
        )}

        {viewMode === 'dashboard' && currentUser && (
          <UserDashboard
            user={currentUser}
            onNavigateToIssues={() => setViewMode('issues_help')}
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            toggleTheme={toggleTheme}
            categories={categories}
            helpPosts={helpPosts}
            onDeletePost={handleDeletePost}
            onPermanentDeletePost={handlePermanentDeletePost}
            onUpdatePost={handleUpdatePost}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
            activeRoleView={activeRoleView}
            setActiveRoleView={setActiveRoleView}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* Wrong Login Modal */}
      <WrongLoginModal
        isOpen={showWrongLoginModal}
        onRetry={() => setShowWrongLoginModal(false)}
        language={language}
      />

      {/* Change Password Card Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSavePassword={handleSaveNewPassword}
        userName={currentUser?.name}
        nicNumber={currentUser?.nicNumber}
      />

      {/* Footer Status Bar */}
      <footer className="z-10 flex flex-wrap justify-between items-center gap-4 mt-auto pt-6 border-t border-white/10 text-slate-500">
        <div className="text-[10px] uppercase tracking-[0.2em] font-mono">
          {t.securityLayer}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              {t.adminStatus}
            </span>
            <span className="text-xs text-green-400 font-mono font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>● {t.online}</span>
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              {t.serverTime}
            </span>
            <span className="text-xs text-slate-300 font-mono">{serverTime}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


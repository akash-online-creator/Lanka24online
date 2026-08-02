import React, { useState, useEffect } from 'react';
import { User, Issue, Language, Theme, ViewMode, Role } from './types';
import { initialUsers, initialIssues } from './data/initialData';
import { translations } from './data/translations';
import { Header } from './components/Header';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { PendingApprovalView } from './components/PendingApprovalView';
import { WrongLoginModal } from './components/WrongLoginModal';
import { IssuesHelpPage } from './components/IssuesHelpPage';
import { AdminPanel } from './components/AdminPanel';
import { UserDashboard } from './components/UserDashboard';

export default function App() {
  // Persistence state setup
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('sahaya_lang');
    return (saved as Language) || 'si';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('sahaya_theme');
    return (saved as Theme) || 'dark';
  });

  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [activeRoleView, setActiveRoleView] = useState<Role>('user');

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('sahaya_users');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [issues, setIssues] = useState<Issue[]>(() => {
    const saved = localStorage.getItem('sahaya_issues');
    return saved ? JSON.parse(saved) : initialIssues;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sahaya_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [showWrongLoginModal, setShowWrongLoginModal] = useState(false);
  const [serverTime, setServerTime] = useState('');

  // Persist storage updates
  useEffect(() => {
    localStorage.setItem('sahaya_lang', language);
  }, [language]);

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
    if (currentUser) {
      localStorage.setItem('sahaya_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('sahaya_current_user');
    }
  }, [currentUser]);

  // Live Server clock
  useEffect(() => {
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

  // Auth Handler
  const handleLogin = (userIdInput: string, keyInput: string) => {
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

    const foundUser = users.find(
      (u) =>
        (u.userId.toLowerCase() === userIdInput.toLowerCase() ||
          u.nicNumber?.toLowerCase() === userIdInput.toLowerCase() ||
          u.email.toLowerCase() === userIdInput.toLowerCase()) &&
        u.key === keyInput
    );

    if (!foundUser) {
      // Piyawara 1.2: Invalid Login trigger
      setShowWrongLoginModal(true);
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
    } else if (foundUser.status === 'rejected') {
      setShowWrongLoginModal(true);
    }
  };

  const handleRegister = (newUser: Omit<User, 'id' | 'registeredAt'>) => {
    const createdUser: User = {
      ...newUser,
      id: `usr_${Date.now()}`,
      registeredAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setUsers((prev) => [createdUser, ...prev]);
    setCurrentUser(createdUser);
    setViewMode('pending'); // Piyawara 1.1: Goes to pending status screen immediately
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveRoleView('user');
    setViewMode('login');
  };

  // Admin approval actions (Piyawara 1.1)
  const handleApproveUser = (targetUserId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === targetUserId ? { ...u, status: 'approved' } : u))
    );
    if (currentUser && currentUser.id === targetUserId) {
      setCurrentUser((prev) => (prev ? { ...prev, status: 'approved' } : null));
    }
  };

  const handleRejectUser = (targetUserId: string, reason?: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUserId
          ? { ...u, status: 'rejected', rejectionReason: reason }
          : u
      )
    );
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

    setIssues((prev) => [createdIssue, ...prev]);
  };

  const handleReplyIssue = (issueId: string, reply: string, resolve: boolean) => {
    setIssues((prev) =>
      prev.map((iss) =>
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

  const handleSeedDemoData = () => {
    setUsers(initialUsers);
    setIssues(initialIssues);
    alert('දර්ශන පරීක්ෂණ දත්ත (Demo Seed Data) සාර්ථකව ප්‍රතිස්ථාපනය කෙරිණි!');
  };

  const t = translations[language];

  return (
    <div
      className={`min-h-screen w-full font-sans flex flex-col justify-between p-4 sm:p-8 relative overflow-x-hidden transition-colors ${
        viewMode === 'login'
          ? theme === 'dark'
            ? 'bg-gradient-to-b from-[#08140e] via-[#0a1810] to-[#06110a] text-slate-100'
            : 'bg-gradient-to-b from-[#eff8f2] via-[#f4faf5] to-[#f8fdf9] text-slate-900'
          : theme === 'dark'
          ? 'bg-[#0c0e14] text-slate-100'
          : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Background Glow Orbs */}
      <div className="absolute top-[-120px] left-[-120px] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-120px] right-[-120px] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation Header (Hidden on Login screen to match mockup layout) */}
      {viewMode !== 'login' && (
        <Header
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          toggleTheme={toggleTheme}
          currentUser={currentUser}
          activeRoleView={activeRoleView}
          setActiveRoleView={setActiveRoleView}
          onNavigate={(targetView) => setViewMode(targetView)}
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

        {viewMode === 'admin' && (
          <AdminPanel
            users={users}
            issues={issues}
            onApproveUser={handleApproveUser}
            onRejectUser={handleRejectUser}
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
          />
        )}
      </main>

      {/* Piyawara 1.2: Wrong Login Overlay Dialog */}
      <WrongLoginModal
        isOpen={showWrongLoginModal}
        onRetry={() => setShowWrongLoginModal(false)}
        language={language}
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

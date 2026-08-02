import React from 'react';
import { Language, Theme, Role, User } from '../types';
import { translations } from '../data/translations';
import { Sun, Moon, Shield, UserCheck, HelpCircle, LogOut } from 'lucide-react';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  currentUser: User | null;
  activeRoleView: Role;
  setActiveRoleView: (role: Role) => void;
  onNavigate: (view: any) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  setLanguage,
  theme,
  toggleTheme,
  currentUser,
  activeRoleView,
  setActiveRoleView,
  onNavigate,
  onLogout,
}) => {
  const t = translations[language];

  return (
    <header className="flex flex-wrap justify-between items-center gap-4 z-20 mb-6 p-2 sm:p-4 rounded-2xl bg-slate-900/60 dark:bg-slate-900/80 light:bg-white/80 border border-white/10 shadow-xl backdrop-blur-md transition-all">
      {/* Brand Logo & Name */}
      <div 
        onClick={() => onNavigate('login')} 
        className="flex items-center gap-3 cursor-pointer group"
      >
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-transform">
          S
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-light tracking-widest uppercase text-slate-100 dark:text-slate-100 light:text-slate-800">
            <span className="font-bold text-blue-400">සහය</span> සේවා
          </h1>
          <p className="text-[10px] text-slate-400 font-medium tracking-wider">
            {t.appNameSub} • SUPPORT SERVICES
          </p>
        </div>
      </div>

      {/* Center Navigation Shortcuts */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('issues_help')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all shadow-sm"
          title={t.issuesHelpBtn}
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">{t.issuesHelpBtn}</span>
        </button>

        {/* Quick Admin View Switcher */}
        <button
          onClick={() => {
            const nextRole = activeRoleView === 'admin' ? 'user' : 'admin';
            setActiveRoleView(nextRole);
            if (nextRole === 'admin') {
              onNavigate('admin');
            } else {
              if (currentUser && currentUser.status === 'approved') {
                onNavigate('dashboard');
              } else {
                onNavigate('login');
              }
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
            activeRoleView === 'admin'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : 'bg-slate-800/60 text-slate-300 border-white/10 hover:bg-slate-700/60'
          }`}
          title="Switch to Admin Panel"
        >
          <Shield className="w-4 h-4 text-amber-400" />
          <span>{activeRoleView === 'admin' ? 'Admin Mode ON' : 'Switch Admin'}</span>
        </button>
      </div>

      {/* Tools: Language & Theme Controls */}
      <div className="flex items-center gap-3 bg-slate-800/60 dark:bg-slate-800/60 light:bg-slate-100/80 p-1.5 rounded-2xl border border-white/10 dark:border-white/10 light:border-slate-200 backdrop-blur-sm shadow-inner">
        {/* Languages */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-700/40 dark:bg-slate-700/40 light:bg-white/90">
          <button
            onClick={() => setLanguage('si')}
            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
              language === 'si'
                ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            සිංහල
          </button>
          <span className="text-slate-600 text-xs">|</span>
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
              language === 'en'
                ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            EN
          </button>
          <span className="text-slate-600 text-xs">|</span>
          <button
            onClick={() => setLanguage('ta')}
            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
              language === 'ta'
                ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            தமிழ்
          </button>
        </div>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-xl bg-slate-700 dark:bg-slate-700 light:bg-slate-200 flex items-center justify-center text-yellow-400 hover:scale-110 active:scale-95 transition-all shadow-md"
          title="Toggle Light / Dark Mode"
        >
          {theme === 'dark' ? (
            <div className="w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_10px_#facc15]" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Logged in User Indicator & Logout */}
        {currentUser && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
            <span className="text-xs font-medium text-slate-200 truncate max-w-[100px] hidden md:inline">
              {currentUser.name}
            </span>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
              title={t.logoutBtn}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

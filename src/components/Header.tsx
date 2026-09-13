import React from 'react';
import { Language, Theme, Role, User } from '../types';
import { translations } from '../data/translations';
import { Sun, Moon, Shield, UserCheck, HelpCircle, LogOut } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { FontSizeController } from './FontSizeController';

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
    <header className="flex flex-wrap justify-between items-center gap-4 z-20 mb-6 p-2.5 sm:p-4 rounded-2xl bg-white/90 dark:bg-[#0a1c13]/90 border border-slate-200/80 dark:border-[#163625] shadow-md backdrop-blur-md transition-all">
      {/* Brand Logo & Name */}
      <div 
        onClick={() => {
          if (currentUser?.role === 'admin') {
            onNavigate(activeRoleView === 'admin' ? 'admin' : 'dashboard');
          } else if (currentUser && currentUser.status === 'approved') {
            onNavigate('dashboard');
          } else {
            onNavigate('login');
          }
        }} 
        className="flex items-center gap-3 cursor-pointer group"
      >
        <AppLogo size="md" animated showGlow className="group-hover:scale-105 transition-transform" />
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-wide text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span className="text-[#007a4b] dark:text-[#00a86b]">
              {language === 'en' ? 'Sahaya' : language === 'ta' ? 'சகாய' : 'සහය'}
            </span>
            <span className="text-amber-600 dark:text-amber-400">
              {language === 'en' ? 'Sewa' : language === 'ta' ? 'சேவா' : 'සේවා'}
            </span>
          </h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider">
            {language === 'en' ? 'Support For All' : language === 'ta' ? 'அனைவருக்கும் உதவி' : 'සැමට පිහිට'}
          </p>
        </div>
      </div>

      {/* Center Navigation Shortcuts */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('issues_help')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#007a4b]/10 text-[#007a4b] dark:text-[#00c880] border border-[#007a4b]/30 hover:bg-[#007a4b]/20 transition-all shadow-sm"
          title={t.issuesHelpBtn}
        >
          <HelpCircle className="w-4 h-4 text-[#007a4b] dark:text-[#00c880]" />
          <span className="hidden sm:inline">{t.issuesHelpBtn}</span>
        </button>

        {/* Quick Admin View Switcher - Only visible to Admin users */}
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => {
              const nextRole = activeRoleView === 'admin' ? 'user' : 'admin';
              setActiveRoleView(nextRole);
              if (nextRole === 'admin') {
                onNavigate('admin');
              } else {
                onNavigate('dashboard');
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              activeRoleView === 'admin'
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'bg-slate-100 dark:bg-[#122e20] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-[#173827]'
            }`}
            title={language === 'en' ? 'Admin Mode' : language === 'ta' ? 'நிர்வாக முறை' : 'පරිපාලක පැනලය'}
          >
            <Shield className="w-4 h-4 text-amber-500" />
            <span>
              {activeRoleView === 'admin' 
                ? (language === 'en' ? 'Admin Mode' : language === 'ta' ? 'நிர்வாக முறை' : 'පරිපාලක ප්‍රකාරය') 
                : (language === 'en' ? 'User Mode' : language === 'ta' ? 'பயனர் முறை' : 'පරිශීලක ප්‍රකාරය')}
            </span>
          </button>
        )}
      </div>

      {/* Tools: Language & Theme Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 bg-slate-100/90 dark:bg-[#122a1d] p-1.5 rounded-2xl border border-slate-200 dark:border-[#1a3d2b] backdrop-blur-sm shadow-inner">
        {/* Languages */}
        <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-white/90 dark:bg-[#0a1c13] shrink-0">
          <button
            onClick={() => setLanguage('si')}
            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
              language === 'si'
                ? 'bg-[#007a4b] text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            සිංහල
          </button>
          <span className="text-slate-300 dark:text-slate-600 text-xs">|</span>
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
              language === 'en'
                ? 'bg-[#007a4b] text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            EN
          </button>
          <span className="text-slate-300 dark:text-slate-600 text-xs">|</span>
          <button
            onClick={() => setLanguage('ta')}
            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
              language === 'ta'
                ? 'bg-[#007a4b] text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            தமிழ்
          </button>
        </div>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-xl bg-white dark:bg-[#0a1c13] border border-slate-200 dark:border-[#1e4230] flex items-center justify-center text-amber-500 hover:scale-105 active:scale-95 transition-all shadow-sm shrink-0"
          title="Toggle Light / Dark Mode"
        >
          {theme === 'dark' ? (
            <div className="w-4 h-4 bg-amber-400 rounded-full shadow-[0_0_8px_#facc15]" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Logged in User Indicator & Logout */}
        {currentUser && (
          <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-slate-700 shrink-0">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[90px] sm:max-w-[120px] hidden md:inline">
              {currentUser.name}
            </span>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/50 transition-all cursor-pointer shrink-0"
              title={t.logoutBtn}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
            {/* Font Size Adjustment - To the right of Log out */}
            <div className="pl-1 border-l border-slate-200/80 dark:border-slate-700/80 shrink-0">
              <FontSizeController language={language} />
            </div>
          </div>
        )}

        {/* Fallback Font Size Resizer if not logged in */}
        {!currentUser && (
          <div className="pl-1 border-l border-slate-200 dark:border-slate-700 shrink-0">
            <FontSizeController language={language} />
          </div>
        )}
      </div>
    </header>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Language, 
  Theme, 
  Role, 
  LocationOption 
} from '../types';
import { translations } from '../data/translations';
import { AppLogo } from './AppLogo';
import { MapLocationTracker } from './MapLocationTracker';
import { GpsPermissionModal } from './GpsPermissionModal';
import { resolveExactLocation, toLocationOption } from '../utils/geoUtils';
import { getStoredNotifications } from '../utils/notificationManager';
import { 
  ShieldCheck, 
  MapPin, 
  Crosshair, 
  Radio, 
  HeartHandshake, 
  Sparkles, 
  HelpCircle, 
  LogOut, 
  Sun, 
  Moon, 
  Shield, 
  Search, 
  Loader2, 
  Lock, 
  Check,
  ChevronDown,
  Coins,
  Bell,
  MessageSquare
} from 'lucide-react';
import { getUserCreditBalance, extractNumericId } from '../utils/creditManager';

interface UnifiedDashboardHeaderProps {
  user: User;
  currentLocation: LocationOption;
  availableLocations: LocationOption[];
  onSelectLocation: (loc: LocationOption) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  onNavigateToIssues?: () => void;
  onOpenSettings?: () => void;
  onOpenWallet?: () => void;
  onOpenNotifications?: () => void;
  onOpenInbox?: () => void;
  inboxCount?: number;
  onOpenAssistant?: () => void;
  onLogout?: () => void;
  activeRoleView?: Role;
  setActiveRoleView?: (role: Role) => void;
  onNavigate?: (view: any) => void;
  isAutoLoadingLocation?: boolean;
  autoLoadedNotice?: string | null;
  onOpenRedAlert?: () => void;
  activeRedAlertsCount?: number;
}

export const UnifiedDashboardHeader: React.FC<UnifiedDashboardHeaderProps> = ({
  user,
  currentLocation,
  availableLocations,
  onSelectLocation,
  language,
  setLanguage,
  theme,
  toggleTheme,
  onNavigateToIssues,
  onOpenSettings,
  onOpenWallet,
  onOpenNotifications,
  onOpenInbox,
  inboxCount,
  onOpenAssistant,
  onLogout,
  activeRoleView,
  setActiveRoleView,
  onNavigate,
  isAutoLoadingLocation = false,
  autoLoadedNotice = null,
  onOpenRedAlert,
  activeRedAlertsCount = 0,
}) => {
  const t = translations[language];
  const getLangText = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isAutoTracking, setIsAutoTracking] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  useEffect(() => {
    const updateUnread = () => {
      const notifs = getStoredNotifications();
      setUnreadNotifCount(notifs.filter(n => !n.isRead).length);
    };

    updateUnread();
    window.addEventListener('sahaya_notifications_updated', updateUnread);
    window.addEventListener('sahaya_new_notification', updateUnread);
    return () => {
      window.removeEventListener('sahaya_notifications_updated', updateUnread);
      window.removeEventListener('sahaya_new_notification', updateUnread);
    };
  }, []);

  const creditBalance = getUserCreditBalance(user);
  const numericId = extractNumericId(user.nicNumber || user.userId);
  const isVisitor = Boolean(!user || user.isDemo || user.userId === 'user_demo' || user.id === 'demo_user' || user.role === 'guest');

  const [isManualLocked, setIsManualLocked] = useState<boolean>(
    () => localStorage.getItem('sahaya_manual_location_locked') === 'true'
  );
  const [isGpsPermissionModalOpen, setIsGpsPermissionModalOpen] = useState(false);

  // Synchronize manual lock state on changes
  useEffect(() => {
    const handleModeChange = (e: any) => {
      if (e.detail?.mode === 'auto') {
        setIsManualLocked(false);
      } else if (e.detail?.mode === 'manual') {
        setIsManualLocked(true);
      } else {
        setIsManualLocked(localStorage.getItem('sahaya_manual_location_locked') === 'true');
      }
    };

    window.addEventListener('sahaya_location_mode_changed', handleModeChange);
    return () => {
      window.removeEventListener('sahaya_location_mode_changed', handleModeChange);
    };
  }, []);

  // Also check whenever currentLocation prop changes
  useEffect(() => {
    setIsManualLocked(localStorage.getItem('sahaya_manual_location_locked') === 'true');
  }, [currentLocation]);

  const getLocationName = (loc: LocationOption) => {
    if (language === 'si') return loc.nameSi;
    if (language === 'ta') return loc.nameTa;
    return loc.nameEn;
  };

  const handleOpenManualPicker = () => {
    setIsAutoTracking(false);
    setIsMapModalOpen(true);
  };

  const handleSaveLocationFromMap = (loc: LocationOption) => {
    onSelectLocation(loc);
    setIsManualLocked(localStorage.getItem('sahaya_manual_location_locked') === 'true');
    setToastMsg(`📍 ස්ථානය සුරැකිණි: ${loc.nameSi}`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleDirectAutoGps = () => {
    if (!navigator.geolocation) {
      setToastMsg('⚠️ ඔබගේ උපාංගයේ GPS සහාය නොදක්වයි.');
      setTimeout(() => setToastMsg(null), 4000);
      return;
    }

    setIsAutoTracking(true);
    // Instantly unlock manual mode in UI & Storage
    localStorage.setItem('sahaya_manual_location_locked', 'false');
    localStorage.setItem('sahaya_location_mode', 'auto');
    setIsManualLocked(false);
    window.dispatchEvent(new CustomEvent('sahaya_location_mode_changed', { detail: { mode: 'auto' } }));

    setToastMsg('⚡ සජීවී GPS සංඥාව ලබාගනිමින් පවතී...');

    const processCoords = async (latitude: number, longitude: number, accuracy: number) => {
      try {
        const geo = await resolveExactLocation(latitude, longitude);
        const locOpt = toLocationOption(geo);
        
        localStorage.setItem('sahaya_current_location', JSON.stringify(locOpt));
        localStorage.setItem('sahaya_manual_location_locked', 'false');
        localStorage.setItem('sahaya_location_mode', 'auto');
        setIsManualLocked(false);
        
        onSelectLocation(locOpt);
        setToastMsg(`⚡ Auto GPS සක්‍රීයයි: ${geo.shortDisplaySi} (±${Math.round(accuracy)}m)`);
      } catch (err) {
        console.warn('Reverse geocode error, using coordinates fallback:', err);
        const fallback: LocationOption = {
          id: `loc_gps_${Date.now()}`,
          nameSi: `කෝවින්න, ගංගාරාම පාර, කටුනායක`,
          nameEn: `Kovinna, Gangarama Road, Katunayake`,
          nameTa: `Kovinna, Gangarama Road, Katunayake`,
          lat: latitude,
          lng: longitude,
        };
        localStorage.setItem('sahaya_current_location', JSON.stringify(fallback));
        localStorage.setItem('sahaya_manual_location_locked', 'false');
        setIsManualLocked(false);
        onSelectLocation(fallback);
        setToastMsg(`⚡ Auto GPS සක්‍රීයයි: ${fallback.nameSi}`);
      } finally {
        setIsAutoTracking(false);
        setTimeout(() => setToastMsg(null), 4500);
      }
    };

    // Primary High Accuracy Attempt
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        processCoords(latitude, longitude, accuracy);
      },
      (err) => {
        // If high accuracy fails or times out, try standard accuracy fallback
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            const { latitude, longitude, accuracy } = fallbackPos.coords;
            processCoords(latitude, longitude, accuracy);
          },
          (finalErr) => {
            setIsAutoTracking(false);
            setIsGpsPermissionModalOpen(true);
            if (finalErr.code === finalErr.PERMISSION_DENIED) {
              setToastMsg('⚠️ GPS අවසරය ලබාදී නැත. Setting වලින් Location Allow කරන්න.');
            } else if (finalErr.code === finalErr.POSITION_UNAVAILABLE) {
              setToastMsg('⚠️ GPS සංඥා දුර්වලයි. උපාංගයේ Location සක්‍රීය කරන්න.');
            } else {
              setToastMsg('⚠️ GPS ස්ථානය ලබාගැනීම ප්‍රමාදයි. නැවත උත්සාහ කරන්න.');
            }
            setTimeout(() => setToastMsg(null), 5000);
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000,
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="relative z-20 mb-3 sm:mb-4 space-y-2">
      {/* 
        LAYER 1: Header Bar (App Logo + Central Quick Controls + Profile Summary)
      */}
      <div className="bg-white/95 dark:bg-[#07150d]/95 border border-slate-200/90 dark:border-[#153423] rounded-2xl p-2.5 sm:p-3 shadow-md backdrop-blur-xl transition-all duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-3">
          
          {/* Top Bar on Mobile: Logo on Left, Profile Avatar on Right */}
          <div className="flex items-center justify-between gap-2">
            {/* 1. App Logo & Brand (LEFT) */}
            <div 
              onClick={() => {
                if (onNavigate) onNavigate('dashboard');
              }}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group shrink-0"
              title="සහය සේවා - මුල් පිටුව"
            >
              <AppLogo size="md" animated showGlow className="group-hover:scale-105 transition-transform" />
              <div>
                <div className="flex items-center gap-1 leading-none">
                  <span className="font-black text-base sm:text-lg text-[#007a4b] dark:text-[#00c880]">සහය</span>
                  <span className="font-black text-base sm:text-lg text-amber-600 dark:text-amber-400">සේවා</span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-[#6a9179] tracking-wider uppercase block">
                  SAHAYA SEWA
                </span>
              </div>
            </div>

            {/* Mobile-Only Profile Avatar Trigger */}
            <div 
              onClick={onOpenSettings}
              className={`flex sm:hidden items-center gap-2 shrink-0 ${onOpenSettings ? 'cursor-pointer hover:opacity-90 transition-opacity p-1 rounded-xl hover:bg-emerald-500/10' : ''}`}
              title={onOpenSettings ? 'පැතිකඩ සැකසුම් (Profile Settings)' : undefined}
            >
              <div className="text-right min-w-0">
                <h2 className="font-extrabold text-[11px] text-slate-900 dark:text-white truncate max-w-[90px]">
                  {user.name}
                </h2>
                <p className="text-[9px] font-mono font-bold text-slate-500 dark:text-[#789d87]">
                  ID: {numericId || user.userId}
                </p>
              </div>

              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-xl overflow-hidden border-2 border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/60 shadow-xs flex items-center justify-center font-black text-emerald-800 dark:text-emerald-300 text-xs">
                  {(user?.facePhotoUrl || user?.photoUrl) && (user.facePhotoUrl || user.photoUrl)?.trim() !== '' ? (
                    <img 
                      src={user.facePhotoUrl || user.photoUrl} 
                      alt={user.name || 'User'} 
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    (user?.name || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#07150d]" />
              </div>
            </div>
          </div>

          {/* 2. Controls & Actions (Language, Theme, Help, Admin, Logout) */}
          <div className="flex items-center justify-between sm:justify-center gap-1.5 sm:gap-2 flex-wrap min-w-0 pt-1 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-[#142e20]">
            {/* Language Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-[#11271b] p-0.5 sm:p-1 rounded-xl border border-slate-200 dark:border-[#1c402b]">
              {(['si', 'en', 'ta'] as Language[]).map((langKey) => (
                <button
                  key={langKey}
                  type="button"
                  onClick={() => setLanguage(langKey)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    language === langKey
                      ? 'bg-gradient-to-r from-emerald-600 to-[#007a4b] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {langKey === 'si' ? 'සිංහල' : langKey === 'en' ? 'EN' : 'தமிழ்'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* 🚨 රතු එළිය (Red Alert) Fast-Access Button */}
              {onOpenRedAlert && (
                <button
                  type="button"
                  onClick={onOpenRedAlert}
                  className="relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-black text-xs shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:shadow-[0_0_20px_rgba(239,68,68,0.8)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-red-400 shrink-0"
                  title="රතු එළිය (Red Alert) - ක්ෂණික හදිසි ආපදා දැනුම්දීම"
                >
                  <span className="text-sm animate-pulse">🚨</span>
                  <span className="font-extrabold tracking-wide">රතු එළිය</span>
                  {activeRedAlertsCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white text-red-700 text-[10px] font-black font-mono shadow-xs">
                      {activeRedAlertsCount}
                    </span>
                  )}
                </button>
              )}



              {/* Live Notifications Bell */}
              {onOpenNotifications && (
                <button
                  type="button"
                  onClick={onOpenNotifications}
                  className="relative p-1.5 sm:px-2 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#11271b] dark:hover:bg-[#183d2b] border border-slate-200 dark:border-[#1c402b] flex items-center gap-1 text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                  title="සජීවී දැනුම්දීම් (Live Notifications)"
                >
                  <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black font-mono flex items-center justify-center shadow-xs animate-pulse">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>
              )}

              {/* Message Inbox Button (පණිවිඩ පෙට්ටිය & සංවාද) */}
              {onOpenInbox && (
                <button
                  type="button"
                  onClick={onOpenInbox}
                  className="relative p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 flex items-center gap-1 text-blue-700 dark:text-blue-300 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs font-bold text-xs"
                  title={language === 'en' ? 'Message Inbox & Chats' : language === 'ta' ? 'செய்திகள் & உரையாடல்கள்' : 'පණිවිඩ සහ සංවාද (Messages)'}
                >
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                  <span className="hidden sm:inline text-[11px]">
                    {language === 'en' ? 'Inbox' : language === 'ta' ? 'செய்திகள்' : 'පණිවිඩ'}
                  </span>
                  {typeof inboxCount === 'number' && inboxCount > 0 && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-black font-mono flex items-center justify-center shadow-xs">
                      {inboxCount > 9 ? '9+' : inboxCount}
                    </span>
                  )}
                </button>
              )}

              {/* AI Assistant & Auto-Translator Trigger */}
              {onOpenAssistant && (
                <button
                  type="button"
                  onClick={onOpenAssistant}
                  className="relative p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs font-bold text-xs"
                  title="සහය මිතුරා & පරිවර්තකය (AI Assistant & Auto-Translator)"
                >
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 fill-amber-500 animate-spin-slow" />
                  <span className="hidden lg:inline text-[11px]">
                    {language === 'en' ? 'AI Assistant' : language === 'ta' ? 'AI உதவியாளர்' : 'සහය මිතුරා'}
                  </span>
                </button>
              )}

              {/* Dark / Light Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-1.5 sm:px-2 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#11271b] dark:hover:bg-[#183d2b] border border-slate-200 dark:border-[#1c402b] flex items-center gap-1 text-amber-500 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                title="තේමාව මාරු කරන්න (Light / Dark Mode)"
              >
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
                )}
              </button>

              {/* App Help ("ඇප් සහය") */}
              {onNavigateToIssues && (
                <button
                  type="button"
                  onClick={onNavigateToIssues}
                  className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-black bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-[#007a4b] dark:text-[#00c880] border border-[#007a4b]/30 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title={language === 'si' ? 'ඇප් සහය සහ ගැටලු' : language === 'ta' ? 'செயலி உதவி' : 'App Help'}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[#007a4b] dark:text-[#00c880]" />
                  <span className="hidden sm:inline font-bold">
                    {language === 'si' ? 'ඇප් සහය' : language === 'ta' ? 'செயலி உதவி' : 'App Help'}
                  </span>
                </button>
              )}

              {/* Admin Switcher (If Admin user) */}
              {user.role === 'admin' && setActiveRoleView && onNavigate && (
                <button
                  type="button"
                  onClick={() => {
                    const nextRole = activeRoleView === 'admin' ? 'user' : 'admin';
                    setActiveRoleView(nextRole);
                    onNavigate(nextRole === 'admin' ? 'admin' : 'dashboard');
                  }}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer shadow-2xs ${
                    activeRoleView === 'admin'
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/50'
                      : 'bg-slate-100 dark:bg-[#122e20] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px]">{activeRoleView === 'admin' ? 'Admin' : 'Admin'}</span>
                </button>
              )}

              {/* Logout Button */}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/40 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                  title={getLangText('පද්ධතියෙන් ඉවත් වන්න (Logout)', 'Log out of system', 'கணக்கிலிருந்து வெளியேறு')}
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span className="hidden sm:inline">{getLangText('ඉවත් වන්න', 'Log Out', 'வெளியேறு')}</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Desktop User Profile Photo & Info (RIGHT) */}
          <div 
            onClick={onOpenSettings}
            className={`hidden sm:flex items-center gap-2 sm:gap-2.5 shrink-0 ${onOpenSettings ? 'cursor-pointer hover:opacity-90 transition-opacity p-1 rounded-xl hover:bg-emerald-500/10' : ''}`}
            title={onOpenSettings ? getLangText('පැතිකඩ සැකසුම් (Profile Settings)', 'Profile Settings', 'சுயவிவர அமைப்புகள்') : undefined}
          >
            <div className="text-right min-w-0">
              <div className="flex items-center justify-end gap-1">
                <h2 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[130px]">
                  {user.name}
                </h2>
                <span className="text-[8px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-1 py-0.2 rounded-md uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                  <ShieldCheck className="w-2 h-2 text-emerald-600 dark:text-emerald-400" />
                  <span>VERIFIED</span>
                </span>
              </div>
              <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-[#789d87]">
                ID: {numericId || user.userId}
              </p>
            </div>

            <div className="relative shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border-2 border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/60 shadow-xs flex items-center justify-center font-black text-emerald-800 dark:text-emerald-300 text-sm">
                {(user?.facePhotoUrl || user?.photoUrl) && (user.facePhotoUrl || user.photoUrl)?.trim() !== '' ? (
                  <img 
                    src={user.facePhotoUrl || user.photoUrl} 
                    alt={user.name || 'User'} 
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  (user?.name || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#07150d]" />
            </div>
          </div>
        </div>
      </div>

      {/* 
        LAYER 2: Location & Wallet Bar (Dedicated, Clean Status Pill Bar)
      */}
      <div className="bg-white/95 dark:bg-[#07150d]/95 border border-slate-200/90 dark:border-[#153423] rounded-2xl p-2.5 sm:p-3 shadow-sm backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Left: Active Location with icon and Auto/Manual badges */}
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 sm:mt-0 ${
            isManualLocked 
              ? 'bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400' 
              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
          }`}>
            <MapPin className="w-4 h-4 animate-bounce" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                <span>{t.currentLocationLabel}:</span>
              </span>

              {isManualLocked ? (
                <span className="bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-[9px] px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Manual</span>
                </span>
              ) : (
                <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>⚡ Auto GPS</span>
                </span>
              )}

              {isAutoLoadingLocation && (
                <span className="bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[9px] px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1 animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>Loading...</span>
                </span>
              )}
            </div>

            {/* Exact Location String */}
            <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 truncate mt-0.5">
              {getLocationName(currentLocation)}
            </p>
          </div>
        </div>

        {/* Right Controls: Location Picker Buttons & Wallet Balance */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap pt-1 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-[#132a1d]">
          {/* Select Location (Manual Picker) */}
          <button
            type="button"
            onClick={handleOpenManualPicker}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-[#007a4b] to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer border border-emerald-400/30"
            title={getLangText('සිතියමෙන් ස්ථානය තෝරන්න', 'Select Location on Map', 'வரைபடத்தில் இடத்தைத் தேர்ந்தெடு')}
          >
            <Search className="w-3.5 h-3.5 text-emerald-200" />
            <span>{getLangText('ස්ථානය තෝරන්න', 'Select Location', 'இடத்தைத் தேர்ந்தெடு')}</span>
          </button>

          {/* Auto GPS Trigger */}
          <button
            type="button"
            onClick={handleDirectAutoGps}
            disabled={isAutoTracking}
            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-60 ${
              !isManualLocked
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                : 'bg-slate-100 dark:bg-[#12281b] hover:bg-slate-200 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1b3a27]'
            }`}
            title={getLangText('සජීවී GPS මගින් ස්ථානය සොයාගන්න', 'Find Location via Live GPS', 'நேரலை GPS மூலம் இடத்தைக் கண்டறி')}
          >
            {isAutoTracking ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                <span>GPS...</span>
              </>
            ) : (
              <>
                <Crosshair className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Auto GPS</span>
              </>
            )}
          </button>

          {/* Credit Balance Interactive Button */}
          {!isVisitor && (
            <button
              type="button"
              onClick={onOpenWallet}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 hover:from-amber-500/25 hover:to-emerald-500/25 border border-amber-400/60 dark:border-amber-500/50 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 group"
              title={getLangText('ක්‍රෙඩිට් ගිණුම සහ ශේෂය (Click to Open Wallet)', 'Credit Wallet & Balance', 'கிரெடிட் கணக்கு & மீதி')}
            >
              <div className="w-5 h-5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-[10px] shadow-2xs group-hover:rotate-12 transition-transform shrink-0">
                <Coins className="w-3 h-3 text-amber-950" />
              </div>
              <div className="text-left">
                <div className="text-[8px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 leading-none">
                  {getLangText('ශේෂය', 'Balance', 'மீதி')}
                </div>
                <div className="text-xs font-black font-mono text-emerald-800 dark:text-emerald-300 leading-tight">
                  {getLangText('රු.', 'Rs.', 'ரூ.')} {creditBalance.toFixed(2)}
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Toast Notice */}
      {(toastMsg || autoLoadedNotice) && (
        <div className="py-1.5 px-3 bg-emerald-50 dark:bg-[#0f281b] border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold rounded-xl flex items-center gap-1.5 animate-fadeIn shadow-xs">
          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">{toastMsg || autoLoadedNotice}</span>
        </div>
      )}

      {/* Map Location Tracker Modal */}
      <MapLocationTracker
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        currentLocation={currentLocation}
        availableLocations={availableLocations}
        onSaveLocation={handleSaveLocationFromMap}
        lang={language}
        theme={theme}
      />

      {/* GPS Permission & Direct Activation Guide Modal */}
      <GpsPermissionModal
        isOpen={isGpsPermissionModalOpen}
        onClose={() => setIsGpsPermissionModalOpen(false)}
        onLocationSuccess={handleSaveLocationFromMap}
        onOpenMapPicker={() => setIsMapModalOpen(true)}
        language={language}
      />
    </div>
  );
};

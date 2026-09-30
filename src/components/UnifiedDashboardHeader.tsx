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
  Loader2, 
  Check,
  ChevronDown,
  Coins,
  Bell,
  MessageSquare,
  QrCode,
  ArrowRightLeft,
  Volume2,
  Zap,
  Settings
} from 'lucide-react';
import { getUserCreditBalance, extractNumericId } from '../utils/creditManager';
import { checkIsAdmin } from '../utils/postOwnerHelper';

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
  onOpenPickMeAlertSettings?: () => void;
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
  onOpenBarterExchange?: () => void;
  onOpenQrPay?: () => void;
  onOpenShortcutHub?: () => void;
  onOpenInstallApp?: () => void;
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
  onOpenPickMeAlertSettings,
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
  onOpenBarterExchange,
  onOpenQrPay,
  onOpenShortcutHub,
  onOpenInstallApp,
}) => {
  const t = translations[language];
  const getLangText = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };
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

  const creditBalance = user ? getUserCreditBalance(user) : 0;
  const numericId = extractNumericId(user?.nicNumber || user?.userId);
  const isVisitor = Boolean(!user || user?.isDemo || user?.userId === 'user_demo' || user?.id === 'demo_user' || (user?.role as string) === 'guest');

  const [isGpsPermissionModalOpen, setIsGpsPermissionModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const getLocationName = (loc: LocationOption) => {
    if (language === 'si') return loc.nameSi;
    if (language === 'ta') return loc.nameTa;
    return loc.nameEn;
  };

  const handleLocationSuccess = (loc: LocationOption) => {
    onSelectLocation(loc);
    setToastMsg(`⚡ Auto GPS ස්ථානය සාර්ථකව තහවුරු විය: ${loc.nameSi}`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleDirectAutoGps = () => {
    if (!navigator.geolocation) {
      setToastMsg('⚠️ ඔබගේ උපාංගයේ GPS සහාය නොදක්වයි.');
      setTimeout(() => setToastMsg(null), 4000);
      return;
    }

    setIsAutoTracking(true);
    localStorage.setItem('sahaya_location_mode', 'auto');
    localStorage.removeItem('sahaya_manual_location_locked');
    window.dispatchEvent(new CustomEvent('sahaya_location_mode_changed', { detail: { mode: 'auto' } }));

    setToastMsg('⚡ සජීවී Auto GPS සංඥාව ලබාගනිමින් පවතී...');

    const processCoords = async (latitude: number, longitude: number, accuracy: number) => {
      try {
        const geo = await resolveExactLocation(latitude, longitude);
        const locOpt = toLocationOption(geo);
        
        localStorage.setItem('sahaya_current_location', JSON.stringify(locOpt));
        localStorage.setItem('sahaya_location_mode', 'auto');
        localStorage.removeItem('sahaya_manual_location_locked');
        
        onSelectLocation(locOpt);
        setToastMsg(`⚡ Auto GPS සක්‍රීයයි - සජීවී ස්ථානය: ${geo.shortDisplaySi} (±${Math.round(accuracy)}m)`);
      } catch {
        const fallback: LocationOption = {
          id: `loc_gps_${Date.now()}`,
          nameSi: `කෝවින්න, ගංගාරාම පාර, කටුනායක`,
          nameEn: `Kovinna, Gangarama Road, Katunayake`,
          nameTa: `Kovinna, Gangarama Road, Katunayake`,
          lat: latitude,
          lng: longitude,
        };
        localStorage.setItem('sahaya_current_location', JSON.stringify(fallback));
        localStorage.setItem('sahaya_location_mode', 'auto');
        onSelectLocation(fallback);
        setToastMsg(`⚡ Auto GPS ස්ථානය: ${fallback.nameSi}`);
      } finally {
        setIsAutoTracking(false);
        setTimeout(() => setToastMsg(null), 4000);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        processCoords(latitude, longitude, accuracy);
      },
      () => {
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            const { latitude, longitude, accuracy } = fallbackPos.coords;
            processCoords(latitude, longitude, accuracy);
          },
          (finalErr) => {
            setIsAutoTracking(false);
            setIsGpsPermissionModalOpen(true);
            if (finalErr.code === finalErr.PERMISSION_DENIED) {
              setToastMsg('⚠️ GPS අවසරය ලබාදී නැත. Settings වලින් Location Allow කරන්න.');
            } else {
              setToastMsg('⚠️ GPS ස්ථානය ලබාගැනීම ප්‍රමාදයි. නැවත උත්සාහ කරන්න.');
            }
            setTimeout(() => setToastMsg(null), 5000);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
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
        LAYER 1: Header Bar (App Logo + Central Quick Utilities + Emergency Red Alert & User Account / Logout Zone)
      */}
      <div className="bg-white dark:bg-[#07150d] border border-slate-200/90 dark:border-[#153423] rounded-2xl p-2.5 sm:p-3 shadow-md transition-all duration-300">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
          
          {/* Top Bar Left: App Brand + Settings Quick Button + Language Switcher */}
          <div className="flex items-center justify-between lg:justify-start gap-2 sm:gap-2.5 flex-wrap shrink-0">
            {/* 1. App Logo & Brand */}
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
                  <span className="font-black text-base sm:text-lg text-[#007a4b] dark:text-[#00c880]">
                    {language === 'en' ? 'Support' : language === 'ta' ? 'ஆதரவு' : 'සහය'}
                  </span>
                  <span className="font-black text-base sm:text-lg text-amber-600 dark:text-amber-400">
                    {language === 'en' ? 'Services' : language === 'ta' ? 'சேவைகள்' : 'සේවා'}
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-[#6a9179] tracking-wider uppercase block">
                  {language === 'en' ? 'SUPPORT SERVICES' : language === 'ta' ? 'ஆதரவு சேவைகள்' : 'SAHAYA SEWA'}
                </span>
              </div>
            </div>

            {/* ⚙️ Dedicated Top Bar Settings Button (Moved from bottom switcher to top bar!) */}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-[#11271b] dark:hover:bg-[#183d2b] border border-slate-200 dark:border-[#1c402b] flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all cursor-pointer shrink-0 shadow-2xs text-xs font-bold active:scale-95"
                title={getLangText('පැතිකඩ සහ සැකසුම් (Settings)', 'Settings & Profile', 'அமைப்புகள்')}
              >
                <Settings className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline font-black text-xs">
                  {getLangText('සැකසුම්', 'Settings', 'அமைப்புகள்')}
                </span>
              </button>
            )}

            {/* Language Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-[#11271b] p-0.5 sm:p-1 rounded-xl border border-slate-200 dark:border-[#1c402b] shrink-0">
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
          </div>

          {/* Center Utilities Group: Clean, organized quick tools */}
          <div className="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 flex-wrap min-w-0 bg-slate-50/80 dark:bg-[#0b1f14]/80 p-1 sm:p-1.5 rounded-2xl border border-slate-200/60 dark:border-[#143021]">
            {/* 🚨 Red Alert Button */}
            {onOpenRedAlert && (
              <button
                type="button"
                onClick={onOpenRedAlert}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer border border-red-300/80 shrink-0"
                title="රතු එළිය (Red Alert) - ක්ෂණික හදිසි ආපදා දැනුම්දීම"
              >
                <span className="text-xs animate-pulse">🚨</span>
                <span className="font-black tracking-wide">රතු එළිය</span>
                {activeRedAlertsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-white text-red-700 text-[10px] font-black font-mono shadow-xs">
                    {activeRedAlertsCount}
                  </span>
                )}
              </button>
            )}

            {/* 📲 Install / Download App Button */}
            {onOpenInstallApp && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { triggerNativeInstallPrompt } = await import('../utils/pwaHelper');
                    const res = await triggerNativeInstallPrompt();
                    if (res.outcome !== 'accepted') {
                      onOpenInstallApp();
                    }
                  } catch {
                    onOpenInstallApp();
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] hover:from-emerald-700 hover:to-[#00663e] text-white font-black text-xs shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer border border-emerald-300/60 shrink-0"
                title={language === 'en' ? 'Download Sahaya Sewa App' : language === 'ta' ? 'செயலியை நிறுவுக' : 'සහය සේවා App එක Phone එකට Download කරගන්න'}
              >
                <span className="text-xs">📲</span>
                <span className="font-black text-xs">
                  {language === 'en' ? 'Download' : language === 'ta' ? 'Download' : 'Download'}
                </span>
              </button>
            )}

            {/* Live Notifications Bell */}
            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative p-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-[#11271b] dark:hover:bg-[#183d2b] border border-slate-200 dark:border-[#1c402b] flex items-center gap-1 text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
                title="සජීවී දැනුම්දීම් (Live Notifications)"
              >
                <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-4.5 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black font-mono flex items-center justify-center shadow-xs animate-pulse">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>
            )}

            {/* 24/7 Background Sync & Audio Alerts Control */}
            {onOpenPickMeAlertSettings && (
              <button
                type="button"
                onClick={onOpenPickMeAlertSettings}
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700/60 flex items-center gap-1 text-emerald-700 dark:text-emerald-300 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
                title={language === 'en' ? '24/7 Audio Alert Settings' : language === 'ta' ? '24/7 ஒலி அமைப்புகள்' : '24/7 ශ්‍රව්‍ය පාලනය'}
              >
                <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </button>
            )}

            {/* Message Inbox Button */}
            {onOpenInbox && (
              <button
                type="button"
                onClick={onOpenInbox}
                className="relative p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-white hover:bg-blue-50 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 border border-blue-200/80 dark:border-blue-800/80 flex items-center gap-1.5 text-blue-700 dark:text-blue-300 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs font-bold text-xs"
                title={language === 'en' ? 'Message Inbox & Chats' : language === 'ta' ? 'செய்திகள் & உரையாடல்கள்' : 'පණිවිඩ (Messages)'}
              >
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="hidden md:inline text-xs font-bold">
                  {language === 'en' ? 'Inbox' : language === 'ta' ? 'செய்திகள்' : 'පණිවිඩ'}
                </span>
                {typeof inboxCount === 'number' && inboxCount > 0 && (
                  <span className="min-w-[17px] h-4.5 px-1 rounded-full bg-blue-600 text-white text-[9px] font-black font-mono flex items-center justify-center shadow-xs">
                    {inboxCount > 9 ? '9+' : inboxCount}
                  </span>
                )}
              </button>
            )}

            {/* Sahaya Pay QR Direct Button */}
            {onOpenQrPay && (
              <button
                type="button"
                onClick={onOpenQrPay}
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-white hover:bg-emerald-50 dark:bg-[#11271b] dark:hover:bg-[#183d2b] border border-emerald-300 dark:border-[#1c402b] flex items-center gap-1 text-emerald-700 dark:text-emerald-300 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs text-xs font-bold"
                title={language === 'en' ? 'QR Pay' : language === 'ta' ? 'QR கட்டணம்' : 'QR Pay'}
              >
                <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden md:inline font-black text-xs">QR Pay</span>
              </button>
            )}

            {/* ⚡ Sahaya Quick Hub Shortcut Button */}
            {onOpenShortcutHub && (
              <button
                type="button"
                onClick={onOpenShortcutHub}
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-teal-500/20 hover:from-amber-500/30 hover:to-teal-500/30 border border-amber-400/80 text-amber-900 dark:text-amber-300 flex items-center gap-1 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs text-xs font-bold"
                title={language === 'en' ? 'Quick Hub' : language === 'ta' ? 'குயிக் ஹப்' : 'Quick Hub'}
              >
                <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="hidden md:inline font-black text-xs">Quick Hub</span>
              </button>
            )}

            {/* Dark / Light Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-[#11271b] dark:hover:bg-[#183d2b] border border-slate-200 dark:border-[#1c402b] flex items-center gap-1 text-amber-500 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
              title="තේමාව මාරු කරන්න (Light / Dark Mode)"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 fill-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Admin Switcher (If Admin user) */}
            {checkIsAdmin(user) && onNavigate && (
              <button
                type="button"
                onClick={() => {
                  if (setActiveRoleView) {
                    setActiveRoleView('admin');
                  }
                  onNavigate('admin');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                  activeRoleView === 'admin'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/70'
                }`}
                title={language === 'en' ? 'Admin Mode' : language === 'ta' ? 'நிர்வாக முறை' : 'පරිපාලක ප්‍රකාරය'}
              >
                <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="font-extrabold text-xs">Admin</span>
              </button>
            )}
          </div>

          {/* Right Action & Account Zone: User Profile + 🚪 Exit Button (Always within viewport!) */}
          <div className="flex items-center justify-between lg:justify-end gap-2 sm:gap-2.5 shrink-0 pt-1 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-[#142e20]">
            {/* User Profile Card Trigger */}
            <div 
              onClick={onOpenSettings}
              className={`flex items-center gap-2 p-1 rounded-xl transition-all ${
                onOpenSettings ? 'cursor-pointer hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15' : ''
              }`}
              title={onOpenSettings ? getLangText('පැතිකඩ සැකසුම් (Profile Settings)', 'Profile Settings', 'சுயவிவர அமைப்புகள்') : undefined}
            >
              <div className="text-right min-w-0">
                <div className="flex items-center justify-end gap-1">
                  <h2 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[90px] sm:max-w-[130px]">
                    {user.name}
                  </h2>
                  <span className="hidden sm:flex text-[8px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-1 py-0.2 rounded-md uppercase tracking-wider items-center gap-0.5 shrink-0">
                    <ShieldCheck className="w-2 h-2 text-emerald-600 dark:text-emerald-400" />
                    <span>VERIFIED</span>
                  </span>
                </div>
                <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-[#789d87]">
                  ID: {numericId || user.userId}
                </p>
              </div>

              <div className="relative shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border-2 border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/60 shadow-xs flex items-center justify-center font-black text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm">
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

            {/* 🚪 Safe Dedicated Exit / Logout Button - Guaranteed Visibility, Never Overflows */}
            {onLogout && (
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 hover:scale-105 shrink-0 whitespace-nowrap"
                title={getLangText('පද්ධතියෙන් ඉවත් වන්න (Logout)', 'Log out of system', 'கணக்கிலிருந்து வெளியேறு')}
              >
                <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="inline font-black">{getLangText('ඉවත් වන්න', 'Exit', 'வெளியேறு')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 
        LAYER 2: Location & Wallet Bar (Dedicated, Clean Status Pill Bar)
      */}
      <div className="bg-white/95 dark:bg-[#07150d]/95 border border-slate-200/90 dark:border-[#153423] rounded-2xl p-2.5 sm:p-3 shadow-sm backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Left: Active Location with icon and Auto GPS badge */}
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 sm:mt-0 bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
            <MapPin className="w-4 h-4 animate-bounce" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                <span>{t.currentLocationLabel}:</span>
              </span>

              <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold flex items-center gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>⚡ Auto GPS</span>
              </span>

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

        {/* Right Controls: Auto GPS Trigger & Wallet Balance */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap pt-1 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-[#132a1d]">
          {/* Auto GPS Trigger */}
          <button
            type="button"
            onClick={handleDirectAutoGps}
            disabled={isAutoTracking}
            className="px-3 py-1.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-60 bg-gradient-to-r from-emerald-600 via-[#007a4b] to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white border-emerald-400/30"
            title={getLangText('සජීවී Auto GPS මගින් ස්ථානය නැවුම් කරන්න', 'Refresh Location via Live Auto GPS', 'நேரலை GPS மூலம் இடத்தைப் புதுப்பி')}
          >
            {isAutoTracking ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-200" />
                <span>GPS...</span>
              </>
            ) : (
              <>
                <Crosshair className="w-3.5 h-3.5 text-emerald-200" />
                <span>⚡ Auto GPS</span>
              </>
            )}
          </button>

          {/* QR Pay Button */}
          {!isVisitor && onOpenQrPay && (
            <button
              type="button"
              onClick={onOpenQrPay}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/70 text-amber-900 dark:text-amber-200 text-xs font-black shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
              title="QR Pay - කේතය ස්කෑන් කර හෝ පෙන්වා ගෙවීම් කරන්න"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">QR Pay</span>
            </button>
          )}

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

      {/* GPS Permission & Direct Activation Guide Modal */}
      <GpsPermissionModal
        isOpen={isGpsPermissionModalOpen}
        onClose={() => setIsGpsPermissionModalOpen(false)}
        onLocationSuccess={handleLocationSuccess}
        language={language}
      />

      {/* 🚪 Safe Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#07160e] border border-slate-200 dark:border-[#163625] rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-md">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {getLangText('පද්ධතියෙන් ඉවත් වීම', 'Log Out of Account', 'கணக்கிலிருந்து வெளியேறு')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {getLangText('ඔබට ඉවත් වීමට අවශ්‍ය බව තහවුරු කරන්න', 'Please confirm you want to log out', 'வெளியேற விரும்புகிறீர்களா?')}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              {getLangText(
                'ඔබ සහය සේවා පද්ධතියෙන් ඉවත් වීමට සූදානම් වේ. නැවත පිවිසීමට ඔබගේ ජාතික හැඳුනුම්පත් අංකය සහ මුරපදය අවශ්‍ය වේ.',
                'You are about to log out of Sahaya Sewa. You will need your NIC and password to log in again.',
                'நீங்கள் சகாய சேவா கணக்கிலிருந்து வெளியேற உள்ளீர்கள்.'
              )}
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs transition-all cursor-pointer"
              >
                {getLangText('අවලංගු කරන්න', 'Cancel', 'ரத்துசெய்')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  if (onLogout) onLogout();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{getLangText('ඔව්, ඉවත් වන්න', 'Yes, Log Out', 'ஆம், வெளியேறு')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

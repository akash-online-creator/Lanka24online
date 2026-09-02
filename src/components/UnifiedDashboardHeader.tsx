import React, { useState } from 'react';
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
import { resolveExactLocation, toLocationOption } from '../utils/geoUtils';
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
  ChevronDown
} from 'lucide-react';

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
  onLogout?: () => void;
  activeRoleView?: Role;
  setActiveRoleView?: (role: Role) => void;
  onNavigate?: (view: any) => void;
  isAutoLoadingLocation?: boolean;
  autoLoadedNotice?: string | null;
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
  onLogout,
  activeRoleView,
  setActiveRoleView,
  onNavigate,
  isAutoLoadingLocation = false,
  autoLoadedNotice = null,
}) => {
  const t = translations[language];
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isAutoTracking, setIsAutoTracking] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const isManualLocked = localStorage.getItem('sahaya_manual_location_locked') === 'true';

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
    setToastMsg(`📍 ස්ථානය සුරැකිණි: ${loc.nameSi}`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleDirectAutoGps = () => {
    if (!navigator.geolocation) {
      setIsMapModalOpen(true);
      return;
    }

    setIsAutoTracking(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          const geo = await resolveExactLocation(latitude, longitude);
          const locOpt = toLocationOption(geo);
          
          localStorage.setItem('sahaya_current_location', JSON.stringify(locOpt));
          localStorage.setItem('sahaya_manual_location_locked', 'false');
          localStorage.setItem('sahaya_location_mode', 'auto');
          
          onSelectLocation(locOpt);
          setToastMsg(`⚡ Auto GPS සක්‍රීයයි: ${geo.shortDisplaySi}`);
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
          localStorage.setItem('sahaya_manual_location_locked', 'false');
          onSelectLocation(fallback);
          setToastMsg(`⚡ Auto GPS ස්ථානය: ${fallback.nameSi}`);
        } finally {
          setIsAutoTracking(false);
          setTimeout(() => setToastMsg(null), 4000);
        }
      },
      () => {
        setIsAutoTracking(false);
        setIsMapModalOpen(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="relative z-20 mb-4 sm:mb-6">
      {/* 
        Unified Single Card containing:
        1. සහය සේවා Logo & Brand
        2. User Profile (Name, Photo, Verified Badge, ID)
        3. Location & Address Bar (Live Address, Map Picker, Auto GPS)
        4. Notification Action Buttons (කැමැත්ත දැක්වූවන්, සහය වන්න)
        5. App Controls (Language, Theme, Help, Admin Switch, Logout)
      */}
      <div className="bg-white/95 dark:bg-[#07150d]/95 border border-slate-200/90 dark:border-[#153423] rounded-3xl p-3.5 sm:p-4 shadow-xl backdrop-blur-xl transition-all duration-300 space-y-3">
        
        {/* TOP ROW: Brand Logo + User Info + Action Buttons + Utilities */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Brand Logo & User Profile Group */}
          <div className="flex items-center gap-3 min-w-0">
            
            {/* 1. සහය සේවා Logo */}
            <div 
              onClick={() => {
                if (onNavigate) onNavigate('dashboard');
              }}
              className="flex items-center gap-2 cursor-pointer group shrink-0"
              title="සහය සේවා - මුල් පිටුව"
            >
              <AppLogo size="sm" animated showGlow className="group-hover:scale-105 transition-transform" />
              <div className="hidden sm:block">
                <div className="flex items-center gap-1 leading-none">
                  <span className="font-black text-sm text-[#007a4b] dark:text-[#00c880]">සහය</span>
                  <span className="font-black text-sm text-amber-600 dark:text-amber-400">සේවා</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 dark:text-[#6a9179] tracking-wider uppercase">
                  SAHAYA SEWA
                </span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-8 w-px bg-slate-200 dark:bg-[#1a3d29] shrink-0" />

            {/* 2. User Info (Photo + Name + Verified Badge + ID) - Clickable to Open Settings */}
            <div 
              onClick={onOpenSettings}
              className={`flex items-center gap-2.5 min-w-0 ${onOpenSettings ? 'cursor-pointer hover:opacity-85 transition-opacity p-1 -m-1 rounded-2xl hover:bg-emerald-500/10' : ''}`}
              title={onOpenSettings ? 'පැතිකඩ සැකසුම් (Profile Settings)' : undefined}
            >
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/60 shadow-xs flex items-center justify-center font-black text-emerald-800 dark:text-emerald-300 text-sm">
                  {user.photoUrl && user.photoUrl.trim() !== '' ? (
                    <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0)
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#07150d]" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-[200px]">
                    {user.name}
                  </h2>
                  <span className="text-[9px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-md uppercase tracking-wider flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                    <span>VERIFIED</span>
                  </span>
                </div>
                <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-[#789d87]">
                  ID: {user.userId}
                </p>
              </div>
            </div>
          </div>

          {/* Utility Controls & App Help */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
            {/* Help / Issues Button: "ඇප් සහය" */}
            {onNavigateToIssues && (
              <button
                type="button"
                onClick={onNavigateToIssues}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-[#007a4b] dark:text-[#00c880] border border-[#007a4b]/30 transition-all cursor-pointer shadow-xs active:scale-95"
                title={language === 'si' ? 'ඇප් සහය සහ ගැටලු' : language === 'ta' ? 'செயலி உதவி' : 'App Help'}
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#007a4b] dark:text-[#00c880]" />
                <span className="font-bold">
                  {language === 'si' ? 'ඇප් සහය' : language === 'ta' ? 'செயலி உதவி' : 'App Help'}
                </span>
              </button>
            )}

            {/* Admin View Switcher */}
            {user.role === 'admin' && setActiveRoleView && onNavigate && (
              <button
                type="button"
                onClick={() => {
                  const nextRole = activeRoleView === 'admin' ? 'user' : 'admin';
                  setActiveRoleView(nextRole);
                  onNavigate(nextRole === 'admin' ? 'admin' : 'dashboard');
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                  activeRoleView === 'admin'
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/50 shadow-xs'
                    : 'bg-slate-100 dark:bg-[#122e20] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">{activeRoleView === 'admin' ? 'Admin' : 'User'}</span>
              </button>
            )}

            {/* Languages Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-[#11271b] p-0.5 rounded-xl border border-slate-200 dark:border-[#1c402b]">
              {(['si', 'en', 'ta'] as Language[]).map((langKey) => (
                <button
                  key={langKey}
                  onClick={() => setLanguage(langKey)}
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    language === langKey
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {langKey === 'si' ? 'සිං' : langKey === 'en' ? 'EN' : 'தமி'}
                </button>
              ))}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-[#11271b] border border-slate-200 dark:border-[#1c402b] flex items-center justify-center text-amber-500 hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
              title="ආලෝක / අඳුරු ප්‍රකාරය"
            >
              {theme === 'dark' ? (
                <div className="w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_6px_#facc15]" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-700" />
              )}
            </button>

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="පද්ධතියෙන් ඉවත් වන්න (Logout)"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* BOTTOM ROW: Integrated Location & Address Strip */}
        <div className="pt-2 border-t border-slate-100 dark:border-[#132c1e] flex flex-wrap items-center justify-between gap-2.5">
          
          {/* Active Address & Status Display */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              isManualLocked 
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400' 
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
            }`}>
              <MapPin className="w-4 h-4 animate-bounce" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                  <span>{t.currentLocationLabel}:</span>
                </span>

                {isManualLocked ? (
                  <span className="bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-[9px] px-1.5 py-0.2 rounded-md font-bold flex items-center gap-0.5">
                    <Lock className="w-2 h-2" />
                    <span>Manual</span>
                  </span>
                ) : (
                  <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[9px] px-1.5 py-0.2 rounded-md font-mono font-bold flex items-center gap-0.5">
                    <ShieldCheck className="w-2 h-2" />
                    <span>⚡ Auto GPS</span>
                  </span>
                )}

                {isAutoLoadingLocation && (
                  <span className="bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[9px] px-1.5 py-0.2 rounded-md font-bold flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-2 h-2 animate-spin" />
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

          {/* Location Action Buttons (Select Location & Auto GPS) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Select Location (Manual Picker) */}
            <button
              type="button"
              onClick={handleOpenManualPicker}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-[#007a4b] to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-xs shadow-xs transition-all active:scale-95 cursor-pointer border border-emerald-400/30"
              title="සිතියමෙන් ස්ථානය තෝරන්න"
            >
              <Search className="w-3.5 h-3.5 text-emerald-200" />
              <span>ස්ථානය තෝරන්න</span>
            </button>

            {/* Auto GPS Trigger */}
            <button
              type="button"
              onClick={handleDirectAutoGps}
              disabled={isAutoTracking}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-60 ${
                !isManualLocked
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'bg-slate-100 dark:bg-[#12281b] hover:bg-slate-200 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1b3a27]'
              }`}
              title="සජීවී GPS මගින් ස්ථානය සොයාගන්න"
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
          </div>
        </div>

        {/* Dynamic Toast Notice */}
        {(toastMsg || autoLoadedNotice) && (
          <div className="py-1.5 px-3 bg-emerald-50 dark:bg-[#0f281b] border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold rounded-xl flex items-center gap-1.5 animate-fadeIn shadow-xs">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">{toastMsg || autoLoadedNotice}</span>
          </div>
        )}
      </div>

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
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Language, 
  Theme, 
  LocationOption, 
  HelpPost, 
  CategoryItem, 
  TagItem, 
  ProfessionalService, 
  ServiceReview, 
  RedAlertItem,
  ChatMessage
} from '../types';
import { translations } from '../data/translations';
import { HelpRequestsPage } from './HelpRequestsPage';
import { GroupWorkView } from './GroupWorkView';
import { MarketplaceView } from './MarketplaceView';
import { MessageInboxModal } from './MessageInboxModal';
import { AppLogo } from './AppLogo';
import { getUserCreditBalance, extractNumericId } from '../utils/creditManager';
import { getStoredNotifications } from '../utils/notificationManager';
import { subscribeToChatMessages, sendChatMessageToFirestore } from '../lib/firebase';
import { 
  Layers, 
  MessageSquare, 
  Users, 
  Store, 
  Grid, 
  Menu, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Coins, 
  Bell, 
  Sparkles, 
  Zap, 
  MapPin, 
  ArrowLeft, 
  ShieldCheck, 
  LogOut, 
  Sun, 
  Moon, 
  QrCode, 
  Phone, 
  AlertTriangle, 
  HelpCircle, 
  Plus, 
  Search, 
  Radio, 
  X,
  Compass,
  Send,
  User as UserIcon,
  Clock,
  ChevronRight
} from 'lucide-react';

export type ShortcutTab = 'feed' | 'chats' | 'groups' | 'market' | 'menu';

interface ShortcutHubViewProps {
  user: User;
  onNavigateToFullApp: () => void;
  onNavigateToIssues: () => void;
  language: Language;
  setLanguage?: (lang: Language) => void;
  theme?: Theme;
  toggleTheme?: () => void;
  currentLocation: LocationOption;
  availableLocations: LocationOption[];
  onSelectLocation: (loc: LocationOption) => void;
  categories: CategoryItem[];
  helpPosts: HelpPost[];
  onDeletePost: (post: HelpPost) => void;
  onUpdatePost: (post: HelpPost) => void;
  onOfferSupport: (post: HelpPost) => void;
  onEditPost: (post: HelpPost) => void;
  onViewPost: (post: HelpPost) => void;
  onOpenChat: (post: HelpPost) => void;
  onOpenConfirm?: (post: HelpPost) => void;
  onOpenSupportOffers: (post: HelpPost) => void;
  onOpenCreateModal: () => void;
  onLogout?: () => void;
  onOpenWallet?: () => void;
  onOpenQrPay?: () => void;
  onOpenNotifications?: () => void;
  onOpenRedAlert?: () => void;
  activeRedAlertsCount?: number;
  redAlerts?: RedAlertItem[];
  onViewRedAlertDetail?: (alert: RedAlertItem) => void;
  initialTab?: ShortcutTab;
}

export const ShortcutHubView: React.FC<ShortcutHubViewProps> = ({
  user,
  onNavigateToFullApp,
  onNavigateToIssues,
  language,
  setLanguage,
  theme = 'light',
  toggleTheme,
  currentLocation,
  availableLocations,
  onSelectLocation,
  categories,
  helpPosts,
  onDeletePost,
  onUpdatePost,
  onOfferSupport,
  onEditPost,
  onViewPost,
  onOpenChat,
  onOpenConfirm,
  onOpenSupportOffers,
  onOpenCreateModal,
  onLogout,
  onOpenWallet,
  onOpenQrPay,
  onOpenNotifications,
  onOpenRedAlert,
  activeRedAlertsCount = 0,
  redAlerts = [],
  onViewRedAlertDetail,
  initialTab = 'feed',
}) => {
  const [activeTab, setActiveTab] = useState<ShortcutTab>(initialTab);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Feed Filter States
  const [feedDistanceTab, setFeedDistanceTab] = useState<'local' | 'all_sl'>('all_sl');
  const [boardCategoryFilter, setBoardCategoryFilter] = useState<string>('');
  const [selectedCategoryTitle, setSelectedCategoryTitle] = useState<string>('');
  const [maxDistanceRadius, setMaxDistanceRadius] = useState<number>(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<TagItem | null>(null);

  // Tags list
  const allTags = useMemo<TagItem[]>(() => {
    try {
      const raw = localStorage.getItem('sahaya_tags');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  // Notifications Count
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(() => {
    const list = getStoredNotifications();
    return list.filter((n) => !n.isRead).length;
  });

  // Direct Shortcut Link
  const shortcutDirectUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      return `${origin}${pathname}?app=hub`;
    }
    return 'https://sahaya.lk/?app=hub';
  }, []);

  const handleCopyShortcutLink = () => {
    try {
      navigator.clipboard.writeText(shortcutDirectUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.warn('Copy link error:', e);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `*සහය සේවා Quick Hub (Shortcut App)* ⚡\n\nසියලු දැන්වීම්, පණිවිඩ & චැට්, කණ්ඩායම් වැඩ සහ සහය වෙළඳපොළ සේවාවන්ට පහසුවෙන්ම පිවිසෙන්න:\n👉 ${shortcutDirectUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Live Wallet Balance
  const [walletBalance, setWalletBalance] = useState<number>(() => getUserCreditBalance(user));
  useEffect(() => {
    setWalletBalance(getUserCreditBalance(user));
    const handleWalletUpdate = () => {
      setWalletBalance(getUserCreditBalance(user));
    };
    window.addEventListener('sahaya_wallet_updated', handleWalletUpdate);
    return () => window.removeEventListener('sahaya_wallet_updated', handleWalletUpdate);
  }, [user]);

  // Distance calculator helper
  const getPostDistance = (post: HelpPost) => {
    if (typeof post.lat !== 'number' || typeof post.lng !== 'number' || !currentLocation) return 0;
    const lat1 = currentLocation.lat;
    const lon1 = currentLocation.lng;
    const lat2 = post.lat;
    const lon2 = post.lng;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Filtered Help Posts
  const filteredPosts = useMemo(() => {
    return (helpPosts || []).filter((post) => {
      if (!post) return false;
      if (boardCategoryFilter && post.category !== boardCategoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const textToCheck = `${post.whatHappened || ''} ${post.whatIsNeeded || ''} ${post.itemLostStolenOrSearched || ''} ${post.donationItem || ''}`.toLowerCase();
        const locMatch = post.locationName?.toLowerCase().includes(q);
        const textMatch = textToCheck.includes(q);
        if (!textMatch && !locMatch) return false;
      }
      if (selectedTagFilter) {
        if (!post.tagName || post.tagName !== selectedTagFilter.tagName) return false;
      }
      if (feedDistanceTab === 'local') {
        const dist = getPostDistance(post);
        if (dist > maxDistanceRadius) return false;
      }
      return true;
    });
  }, [helpPosts, boardCategoryFilter, searchQuery, selectedTagFilter, feedDistanceTab, maxDistanceRadius, currentLocation]);

  const userNumericId = extractNumericId(user.nicNumber || user.userId || user.id);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#040e08] text-slate-800 dark:text-slate-100 flex flex-col pb-20 selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      
      {/* ======================================================== */}
      {/* TOP HEADER: QUICK HUB BRANDED APP BAR */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#07170e]/95 backdrop-blur-md border-b border-slate-200 dark:border-emerald-900/60 shadow-xs px-3 sm:px-4 py-2.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          
          {/* Brand & Shortcut Badge */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('feed')}
              className="flex items-center gap-2 text-left cursor-pointer group"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform shrink-0">
                <Zap className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
                    Sahaya Hub
                  </span>
                  <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-2xs">
                    Shortcut
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-emerald-300 font-bold hidden sm:block">
                  ක්ෂණික සේවා කවුළුව
                </p>
              </div>
            </button>
          </div>

          {/* Location Badge */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-[#0d261a] border border-slate-200 dark:border-emerald-900/50 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-700 dark:text-emerald-200">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>{currentLocation?.nameSi || 'කඩවත'}</span>
          </div>

          {/* Action Tools & Full App Switch */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Share Shortcut Link Button */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-black shadow-2xs transition-all cursor-pointer"
              title="Quick Hub Direct Link එක ලබාගන්න"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Shortcut Link</span>
            </button>

            {/* Wallet Credit Pill */}
            {onOpenWallet && (
              <button
                onClick={onOpenWallet}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-black shadow-2xs transition-all cursor-pointer"
                title="Wallet & Balance"
              >
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>රු. {walletBalance.toFixed(0)}</span>
              </button>
            )}

            {/* QR Pay Shortcut */}
            {onOpenQrPay && (
              <button
                onClick={onOpenQrPay}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                title="QR Scan & Pay"
              >
                <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </button>
            )}

            {/* Notifications Bell */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer relative"
                title="දැනුම්දීම්"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Switch to Full App Dashboard Button */}
            <button
              onClick={onNavigateToFullApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black shadow-sm transition-all cursor-pointer"
              title="සම්පූර්ණ ප්‍රධාන Dashboard එකට පිවිසෙන්න"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">සම්පූර්ණ App එක</span>
            </button>
          </div>

        </div>
      </header>

      {/* ======================================================== */}
      {/* TAB CONTENT AREA */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4">
        
        {/* TAB 1: ALL POSTS & HELP REQUESTS FEED */}
        {activeTab === 'feed' && (
          <div className="space-y-4 animate-fadeIn">
            <HelpRequestsPage
              user={user}
              language={language}
              helpPosts={helpPosts}
              filteredPosts={filteredPosts}
              currentLocation={currentLocation}
              feedDistanceTab={feedDistanceTab}
              setFeedDistanceTab={setFeedDistanceTab}
              boardCategoryFilter={boardCategoryFilter}
              setBoardCategoryFilter={setBoardCategoryFilter}
              selectedCategoryTitle={selectedCategoryTitle}
              setSelectedCategoryTitle={setSelectedCategoryTitle}
              maxDistanceRadius={maxDistanceRadius}
              setMaxDistanceRadius={setMaxDistanceRadius}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              allTags={allTags}
              selectedTagFilter={selectedTagFilter}
              setSelectedTagFilter={setSelectedTagFilter}
              getPostDistance={getPostDistance}
              onOfferSupport={onOfferSupport}
              onEditPost={onEditPost}
              onViewPost={onViewPost}
              onDeletePost={onDeletePost}
              onOpenChat={onOpenChat}
              onOpenConfirm={onOpenConfirm}
              onOpenSupportOffers={onOpenSupportOffers}
              onOpenCreateModal={onOpenCreateModal}
              onBackToHome={() => setActiveTab('menu')}
              onUpdatePost={onUpdatePost}
              redAlerts={redAlerts}
              onViewRedAlertDetail={onViewRedAlertDetail}
              onOpenRedAlert={onOpenRedAlert}
            />
          </div>
        )}

        {/* TAB 2: MESSAGES & CHAT HUB */}
        {activeTab === 'chats' && (
          <div className="animate-fadeIn">
            <div className="bg-white dark:bg-[#07170e] border border-slate-200 dark:border-emerald-900/60 rounded-3xl p-4 sm:p-6 shadow-md">
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-emerald-900/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      පණිවිඩ සහ චැට් කවුළුව (Messages & Chat)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      සියලුම 1-on-1 සාකච්ඡා සහ සජීවී පිළිතුරු මෙතැනින් බලන්න
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('feed')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  දැන්වීම් වෙත
                </button>
              </div>

              {/* Embedded Interactive Inbox Dialog */}
              <MessageInboxModal
                isOpen={true}
                onClose={() => setActiveTab('feed')}
                user={user}
                helpPosts={helpPosts}
                lang={language}
                onViewPost={onViewPost}
                onOpenChat={onOpenChat}
                onOpenConfirm={onOpenConfirm}
                onNavigateToIssues={onNavigateToIssues}
              />
            </div>
          </div>
        )}

        {/* TAB 3: GROUP WORK & SHRAMADANA */}
        {activeTab === 'groups' && (
          <div className="animate-fadeIn">
            <GroupWorkView
              currentUser={user}
              language={language}
              onBackToBoard={() => setActiveTab('feed')}
            />
          </div>
        )}

        {/* TAB 4: MARKETPLACE */}
        {activeTab === 'market' && (
          <div className="animate-fadeIn">
            <MarketplaceView
              currentUser={user}
              language={language}
              allTags={allTags}
              currentLocationName={currentLocation?.nameSi || 'කඩවත'}
              onBackToBoard={() => setActiveTab('feed')}
            />
          </div>
        )}

        {/* TAB 5: QUICK MENU & PROFILE */}
        {activeTab === 'menu' && (
          <div className="space-y-4 max-w-2xl mx-auto animate-fadeIn">
            
            {/* User Profile Card */}
            <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center font-black text-2xl shadow-inner shrink-0 overflow-hidden">
                  {user.facePhotoUrl || user.photoUrl ? (
                    <img src={user.facePhotoUrl || user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name?.charAt(0)?.toUpperCase() || 'U'
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black truncate">{user.name || 'පරිශීලක'}</h3>
                    {user.status === 'approved' && (
                      <ShieldCheck className="w-5 h-5 text-emerald-300 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-emerald-200 font-mono font-bold">
                    ID: {userNumericId} • {user.phone || 'දුරකථනය නැත'}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="bg-amber-400 text-amber-950 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                      Wallet: රු. {walletBalance.toFixed(2)}
                    </span>
                    {user.isDemo && (
                      <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Demo Account
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              
              <button
                onClick={onNavigateToFullApp}
                className="p-4 bg-white dark:bg-[#07170e] border-2 border-emerald-500/40 rounded-2xl shadow-sm text-left hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">සම්පූර්ණ Dashboard</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">සියලු සේවාවන් වෙත</p>
                </div>
              </button>

              <button
                onClick={() => setIsShareModalOpen(true)}
                className="p-4 bg-white dark:bg-[#07170e] border border-slate-200 dark:border-emerald-900/60 rounded-2xl shadow-sm text-left hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">Shortcut Link එක</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Copy & Share කරන්න</p>
                </div>
              </button>

              {onOpenQrPay && (
                <button
                  onClick={onOpenQrPay}
                  className="p-4 bg-white dark:bg-[#07170e] border border-slate-200 dark:border-emerald-900/60 rounded-2xl shadow-sm text-left hover:border-emerald-400 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">QR Scan & Pay</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">ක්ෂණික මුදල් ගෙවීම්</p>
                  </div>
                </button>
              )}

              {onOpenRedAlert && (
                <button
                  onClick={onOpenRedAlert}
                  className="p-4 bg-white dark:bg-[#07170e] border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-sm text-left hover:border-rose-400 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">රතු එළිය (Red Alert)</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">හදිසි ආපදා සයිරන්</p>
                  </div>
                </button>
              )}

              <button
                onClick={onNavigateToIssues}
                className="p-4 bg-white dark:bg-[#07170e] border border-slate-200 dark:border-emerald-900/60 rounded-2xl shadow-sm text-left hover:border-emerald-400 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">ගැටලු & උදව් (Support)</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">පරිපාලක සහය ලබාගන්න</p>
                </div>
              </button>

              {toggleTheme && (
                <button
                  onClick={toggleTheme}
                  className="p-4 bg-white dark:bg-[#07170e] border border-slate-200 dark:border-emerald-900/60 rounded-2xl shadow-sm text-left hover:border-emerald-400 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">පෙනුම මාරු කරන්න</p>
                  </div>
                </button>
              )}

            </div>

            {/* Logout Option */}
            {onLogout && (
              <div className="pt-2">
                <button
                  onClick={onLogout}
                  className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-extrabold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ගිණුමෙන් ඉවත් වන්න (Log Out)</span>
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* FACEBOOK-STYLE BOTTOM NAVIGATION BAR */}
      {/* ======================================================== */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#06140c]/95 backdrop-blur-lg border-t border-slate-200 dark:border-emerald-900/60 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-2 py-1 transition-all">
        <div className="max-w-md mx-auto flex items-center justify-around">
          
          {/* Tab 1: All Posts (දැන්වීම්) */}
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer relative ${
              activeTab === 'feed'
                ? 'text-emerald-700 dark:text-emerald-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'feed' ? 'bg-emerald-100 dark:bg-emerald-950/80' : ''}`}>
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">දැන්වීම්</span>
            {activeTab === 'feed' && (
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-0.5 animate-pulse" />
            )}
          </button>

          {/* Tab 2: Messages & Chat (පණිවිඩ) */}
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer relative ${
              activeTab === 'chats'
                ? 'text-emerald-700 dark:text-emerald-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all relative ${activeTab === 'chats' ? 'bg-emerald-100 dark:bg-emerald-950/80' : ''}`}>
              <MessageSquare className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">පණිවිඩ</span>
            {activeTab === 'chats' && (
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-0.5 animate-pulse" />
            )}
          </button>

          {/* Tab 3: Group Work (කණ්ඩායම්) */}
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer relative ${
              activeTab === 'groups'
                ? 'text-emerald-700 dark:text-emerald-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'groups' ? 'bg-emerald-100 dark:bg-emerald-950/80' : ''}`}>
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">කණ්ඩායම්</span>
            {activeTab === 'groups' && (
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-0.5 animate-pulse" />
            )}
          </button>

          {/* Tab 4: Marketplace (වෙළඳපොළ) */}
          <button
            onClick={() => setActiveTab('market')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer relative ${
              activeTab === 'market'
                ? 'text-emerald-700 dark:text-emerald-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'market' ? 'bg-emerald-100 dark:bg-emerald-950/80' : ''}`}>
              <Store className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">වෙළඳපොළ</span>
            {activeTab === 'market' && (
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-0.5 animate-pulse" />
            )}
          </button>

          {/* Tab 5: Quick Menu (මෙනුව) */}
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer relative ${
              activeTab === 'menu'
                ? 'text-emerald-700 dark:text-emerald-400 font-black scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'menu' ? 'bg-emerald-100 dark:bg-emerald-950/80' : ''}`}>
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">මෙනුව</span>
            {activeTab === 'menu' && (
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-0.5 animate-pulse" />
            )}
          </button>

        </div>
      </nav>

      {/* ======================================================== */}
      {/* SHARE SHORTCUT LINK MODAL */}
      {/* ======================================================== */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#07170e] border-2 border-amber-400/60 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-sm">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Sahaya Quick Hub Shortcut Link
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-emerald-300 font-medium">
                    ක්ෂණික සේවා කවුළුවේ සෘජු Link එක
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-[#0d261a] border border-slate-200 dark:border-emerald-900/60 rounded-2xl p-3 space-y-2">
              <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 block">
                Direct Link (URL):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shortcutDirectUrl}
                  className="flex-1 bg-white dark:bg-[#05110a] border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-emerald-300 select-all"
                />
                <button
                  onClick={handleCopyShortcutLink}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-amber-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Explanatory tips */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <p className="font-extrabold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Shortcut එක භාවිතා කරන ආකාරය:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800 dark:text-amber-300 font-medium pl-1">
                <li>මෙම Link එක Browser Bookmark එකක් ලෙස Save කරගන්න.</li>
                <li>හෝ Browser Settings වෙත ගොස් <strong>"Add to Home screen"</strong> තෝරා Mobile App එකක් ලෙස තබාගන්න.</li>
                <li>එමගින් කෙලින්ම දැන්වීම්, පණිවිඩ, ශ්‍රමදාන සහ වෙළඳපොළ වෙත පිවිසිය හැක.</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleShareWhatsApp}
                className="py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp Share</span>
              </button>

              <button
                onClick={() => setIsShareModalOpen(false)}
                className="py-2.5 px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                <span>වසන්න</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Award, 
  Search, 
  Store, 
  HeartHandshake, 
  Wrench, 
  Sparkles, 
  AlertTriangle, 
  Ban, 
  CheckCircle, 
  Plus, 
  Minus, 
  History, 
  Filter, 
  RefreshCw, 
  UserCheck, 
  Lock, 
  Unlock, 
  ChevronRight, 
  Phone, 
  CreditCard,
  User as UserIcon,
  X,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { User, Language, TrustBadgeType, TrustScoreLogItem } from '../types';
import { 
  getAllStoredTrustData, 
  getUserTrustData, 
  calculateTrustProfile, 
  awardTrustPoints, 
  deductTrustPoints, 
  toggleUserCustomBadge, 
  unblockUserAndRestoreTrust,
  getTrustScoreAuditLogs,
  getTrustUserId
} from '../utils/trustScore';
import { isAuthorBlocked } from '../utils/blockedCredentialsManager';

interface AdminTrustManagementProps {
  users: User[];
  language: Language;
  onBlockUser?: (userId: string, reason: string) => void;
  onUnblockCredential?: (id: string) => void;
  onUpdateUser?: (updatedUser: User) => void;
}

export const AdminTrustManagement: React.FC<AdminTrustManagementProps> = ({
  users = [],
  language = 'si',
  onBlockUser,
  onUnblockCredential,
  onUpdateUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'verified_sellers' | 'verified_volunteers' | 'verified_pros' | 'at_risk' | 'blocked' | 'heroes'
  >('all');
  
  // Selected user for points adjustment or badge modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionModalMode, setActionModalMode] = useState<'adjust_points' | 'manage_badges' | 'block_unblock' | null>(null);

  // Points adjustment form state
  const [pointsChangeType, setPointsChangeType] = useState<'add' | 'deduct'>('add');
  const [pointsAmount, setPointsAmount] = useState<number>(25);
  const [pointsReason, setPointsReason] = useState<string>('සාර්ථක ස්වේච්ඡා මෙහෙයුම');
  const [customReason, setCustomReason] = useState<string>('');
  const [pointsSuccessMsg, setPointsSuccessMsg] = useState<string>('');

  // Unblock restore points
  const [restorePointsAmount, setRestorePointsAmount] = useState<number>(100);
  const [unblockReason, setUnblockReason] = useState<string>('පරිපාලක විසින් සමාලෝචනය කර ගිණුම නැවත සක්‍රීය කරන ලදී');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<TrustScoreLogItem[]>([]);
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);

  const getLangText = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  // Sync stored logs on mount and when updated
  useEffect(() => {
    setAuditLogs(getTrustScoreAuditLogs());
    const handleLogsUpdate = () => {
      setAuditLogs(getTrustScoreAuditLogs());
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('sahaya_trust_scores_updated', handleLogsUpdate);
    window.addEventListener('sahaya_trust_logs_updated', handleLogsUpdate);
    return () => {
      window.removeEventListener('sahaya_trust_scores_updated', handleLogsUpdate);
      window.removeEventListener('sahaya_trust_logs_updated', handleLogsUpdate);
    };
  }, []);

  // Compute enriched user list with trust metrics
  const enrichedUsers = useMemo(() => {
    return (users || []).filter(Boolean).map((u) => {
      const trustData = getUserTrustData(u);
      const trustProfile = calculateTrustProfile(u);
      const isBlocked = isAuthorBlocked(u) || u.status === 'blocked' || u.isBlocked || (trustData && trustData.points <= 0);
      return {
        ...u,
        trustData,
        trustProfile,
        isBlockedCalculated: isBlocked,
      };
    });
  }, [users, refreshKey]);

  // Filter and search
  const filteredUsers = useMemo(() => {
    let list = enrichedUsers;

    if (activeFilter === 'verified_sellers') {
      list = list.filter(u => u.trustData.customBadges?.includes('verified_seller'));
    } else if (activeFilter === 'verified_volunteers') {
      list = list.filter(u => u.trustData.customBadges?.includes('verified_volunteer'));
    } else if (activeFilter === 'verified_pros') {
      list = list.filter(u => u.trustData.customBadges?.includes('verified_professional'));
    } else if (activeFilter === 'at_risk') {
      list = list.filter(u => !u.isBlockedCalculated && u.trustData.points <= 30 && u.trustData.points > 0);
    } else if (activeFilter === 'blocked') {
      list = list.filter(u => u.isBlockedCalculated || u.trustData.points <= 0);
    } else if (activeFilter === 'heroes') {
      list = list.filter(u => u.trustData.points >= 200 || u.trustData.customBadges?.includes('community_hero'));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q)) ||
        (u.nicNumber && u.nicNumber.toLowerCase().includes(q)) ||
        (u.userId && u.userId.toLowerCase().includes(q))
      );
    }

    return list;
  }, [enrichedUsers, activeFilter, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = enrichedUsers.length;
    const verifiedSellers = enrichedUsers.filter(u => u.trustData.customBadges?.includes('verified_seller')).length;
    const verifiedVolunteers = enrichedUsers.filter(u => u.trustData.customBadges?.includes('verified_volunteer')).length;
    const atRisk = enrichedUsers.filter(u => !u.isBlockedCalculated && u.trustData.points <= 30 && u.trustData.points > 0).length;
    const blocked = enrichedUsers.filter(u => u.isBlockedCalculated || u.trustData.points <= 0).length;
    return { total, verifiedSellers, verifiedVolunteers, atRisk, blocked };
  }, [enrichedUsers]);

  // Award Reason Presets
  const ADD_REASONS = [
    { label: '🌟 සාර්ථක ස්වේච්ඡා මෙහෙයුම (+30 pts)', pts: 30, text: 'සාර්ථක ස්වේච්ඡා මෙහෙයුම' },
    { label: '🏪 අවංක වෙළඳ ගනුදෙනු සහ සාධාරණ මිල (+25 pts)', pts: 25, text: 'අවංක වෙළඳ ගනුදෙනු සහ සාධාරණ මිල' },
    { label: '🤝 හදිසි ආධාර බෙදාහැරීම තහවුරු කිරීම (+40 pts)', pts: 40, text: 'හදිසි ආධාර බෙදාහැරීම තහවුරු කිරීම' },
    { label: '🛠️ 5-තරු සේවා සම්පූර්ණ කිරීම (+20 pts)', pts: 20, text: '5-තරු සේවා සම්පූර්ණ කිරීම' },
    { label: '🎖️ අනන්‍යතාවය සහ ලිපිනය තහවුරු කිරීම (+30 pts)', pts: 30, text: 'අනන්‍යතාවය සහ ලිපිනය තහවුරු කිරීම' },
  ];

  // Deduction Reason Presets
  const DEDUCT_REASONS = [
    { label: '⚠️ බොරු / ව්‍යාජ ආධාර ඉල්ලීමක් පළකිරීම (-50 pts)', pts: 50, text: 'බොරු / ව්‍යාජ ආධාර ඉල්ලීමක් පළකිරීම' },
    { label: '🚫 භාණ්ඩ/මුදල් වංචාවක් හෝ හොරවැඩක් කිරීම (-100 pts) [AUTO-BLOCK]', pts: 100, text: 'භාණ්ඩ/මුදල් වංචාවක් හෝ හොරවැඩක් කිරීම' },
    { label: '⚠️ පොරොන්දු වූ සහය ඉටුනොකිරීම / නොමඟ යැවීම (-30 pts)', pts: 30, text: 'පොරොන්දු වූ සහය ඉටුනොකිරීම / නොමඟ යැවීම' },
    { label: '⚠️ ව්‍යාජ හෝ ප්‍රමිතියෙන් තොර භාණ්ඩ විකිණීම (-40 pts)', pts: 40, text: 'ව්‍යාජ හෝ ප්‍රමිතියෙන් තොර භාණ්ඩ විකිණීම' },
    { label: '⚠️ ප්‍රජා ප්‍රතිපත්ති කඩකිරීම / අසභ්‍ය හැසිරීම (-25 pts)', pts: 25, text: 'ප්‍රජා ප්‍රතිපත්ති කඩකිරීම / අසභ්‍ය හැසිරීම' },
  ];

  // Handle Points Adjustment Submit
  const handlePointsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const finalReason = customReason.trim() ? customReason.trim() : pointsReason;
    if (pointsChangeType === 'add') {
      const res = awardTrustPoints(selectedUser, pointsAmount, finalReason, 'admin_manual', 'ප්‍රධාන පරිපාලක (Super Admin)');
      setPointsSuccessMsg(`සාර්ථකයි! ලකුණු +${pointsAmount} ක් එකතු කරන ලදි. නව ශේෂය: ${res.newBalance} pts`);
    } else {
      const res = deductTrustPoints(
        selectedUser, 
        pointsAmount, 
        finalReason, 
        'fraud_penalty', 
        'ප්‍රධාන පරිපාලක (Super Admin)',
        (uid, reason) => {
          if (onBlockUser) onBlockUser(uid, reason);
        }
      );
      if (res.isAutoBlocked) {
        setPointsSuccessMsg(`අවවාදයයි: ලකුණු 0 වූ බැවින් ගිණුම ස්වයංක්‍රීයව අත්හිටුවන ලදී (AUTO-BLOCKED)!`);
        if (onBlockUser && selectedUser) onBlockUser(selectedUser.userId || selectedUser.id || '', `විශ්වාසනීය ලකුණු 0 වීම: ${finalReason}`);
      } else {
        setPointsSuccessMsg(`ලකුණු -${pointsAmount} ක් අඩු කරන ලදි. නව ශේෂය: ${res.newBalance} pts`);
      }
    }

    setRefreshKey(prev => prev + 1);
    setTimeout(() => {
      setPointsSuccessMsg('');
      setActionModalMode(null);
    }, 1800);
  };

  // Handle Badge Toggle
  const handleBadgeToggle = (badgeType: TrustBadgeType, currentGranted: boolean) => {
    if (!selectedUser) return;
    toggleUserCustomBadge(
      selectedUser, 
      badgeType, 
      !currentGranted, 
      `පරිපාලක විසින් ${!currentGranted ? 'ලබාදෙන ලදි' : 'ඉවත් කරන ලදි'}`, 
      'ප්‍රධාන පරිපාලක (Super Admin)'
    );
    setRefreshKey(prev => prev + 1);
  };

  // Handle Direct Unblock & Restore
  const handleUnblockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    unblockUserAndRestoreTrust(
      selectedUser, 
      restorePointsAmount, 
      unblockReason.trim() || 'පරිපාලක විසින් සමාලෝචනය කර ගිණුම නැවත සක්‍රීය කරන ලදී',
      'ප්‍රධාන පරිපාලක (Super Admin)'
    );

    if (onUnblockCredential && selectedUser) {
      if (selectedUser.id) onUnblockCredential(selectedUser.id);
      if (selectedUser.userId) onUnblockCredential(selectedUser.userId);
      if (selectedUser.phone) onUnblockCredential(selectedUser.phone);
      if (selectedUser.nicNumber) onUnblockCredential(selectedUser.nicNumber);
    }

    if (onUpdateUser) {
      onUpdateUser({
        ...selectedUser,
        status: 'approved',
        isBlocked: false,
        blockedReason: undefined,
        blockedAt: undefined,
      });
    }

    setPointsSuccessMsg(`සාර්ථකයි! ගිණුම නැවත සක්‍රීය කර ලකුණු ${restorePointsAmount} ක් ලබාදෙන ලදි.`);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => {
      setPointsSuccessMsg('');
      setActionModalMode(null);
    }, 1500);
  };

  // Handle Direct Block
  const handleDirectBlock = () => {
    if (!selectedUser) return;
    const reason = prompt('ගිණුම අත්හිටුවීමට (Block) හේතුව ඇතුළත් කරන්න:', 'වංචනික හැසිරීම් සහ ප්‍රජා නීති කඩකිරීම');
    if (!reason) return;

    deductTrustPoints(
      selectedUser,
      1000,
      reason,
      'fraud_penalty',
      'ප්‍රධාන පරිපාලක (Super Admin)',
      (uid, r) => {
        if (onBlockUser) onBlockUser(uid, r);
      }
    );

    if (onBlockUser && selectedUser) {
      onBlockUser(selectedUser.userId || selectedUser.id || '', reason);
    }

    setRefreshKey(prev => prev + 1);
    setActionModalMode(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {getLangText('පරිශීලක විශ්වාසනීයත්ව සහ ලාංඡන කළමනාකරණය', 'Community Trust & Verified Badges', 'நம்பகத்தன்மை & பேட்ஜ்கள் மேலாண்மை')}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-emerald-200/80 font-medium">
            {getLangText(
              'Verified Seller, Verified Volunteer ලාංඡන ලබාදීම, ලකුණු වැඩි/අඩු කිරීම සහ ලකුණු 0 වූ විට ස්වයංක්‍රීයව Block කිරීමේ පාලන පුවරුව',
              'Manage Verified Badges, adjust trust points, penalize fraud, and audit automated account blocks.',
              'சரிபார்க்கப்பட்ட பேட்ஜ்கள் மற்றும் புள்ளிகள் மேலாண்மை'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowLogsDrawer(true)}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <History className="w-4 h-4 text-emerald-400" />
            <span>{getLangText('විගණන සටහන් (Audit Logs)', 'Audit History', 'தணிக்கை பதிவுகள்')} ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#071912] border border-slate-200 dark:border-emerald-900/60 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
            {getLangText('මුළු පරිශීලකයින්', 'Total Users', 'மொத்த பயனர்கள்')}
          </span>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {stats.total}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <Store className="w-3.5 h-3.5" />
            {getLangText('Verified Sellers', 'Verified Sellers', 'விற்பனையாளர்கள்')}
          </span>
          <div className="text-xl font-black text-emerald-800 dark:text-emerald-200 font-mono">
            {stats.verifiedSellers}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
            <HeartHandshake className="w-3.5 h-3.5" />
            {getLangText('Verified Volunteers', 'Verified Volunteers', 'தொண்டர்கள்')}
          </span>
          <div className="text-xl font-black text-blue-800 dark:text-blue-200 font-mono">
            {stats.verifiedVolunteers}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            {getLangText('අවදානම් (≤30 pts)', 'At Risk (≤30 pts)', 'எச்சரிக்கை')}
          </span>
          <div className="text-xl font-black text-amber-800 dark:text-amber-200 font-mono">
            {stats.atRisk}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 shadow-sm space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-red-700 dark:text-red-300 flex items-center gap-1">
            <Ban className="w-3.5 h-3.5" />
            {getLangText('Blocked (ලකුණු 0)', 'Blocked (0 pts)', 'முடக்கப்பட்டது')}
          </span>
          <div className="text-xl font-black text-red-800 dark:text-red-200 font-mono">
            {stats.blocked}
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-[#071912] border border-slate-200 dark:border-emerald-900/60 p-3.5 rounded-2xl shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={getLangText('නම, දුරකථනය, NIC හෝ User ID සොයන්න...', 'Search by Name, Phone, NIC or ID...', 'தேடுக...')}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c2419] border border-slate-200 dark:border-emerald-800/60 focus:outline-hidden focus:border-emerald-500 font-medium"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-all ${
              activeFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {getLangText('සියල්ල', 'All', 'அனைத்தும்')} ({enrichedUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('verified_sellers')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
              activeFilter === 'verified_sellers'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Store className="w-3 h-3 text-emerald-400" />
            <span>{getLangText('Verified Sellers', 'Verified Sellers', 'விற்பனையாளர்கள்')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('verified_volunteers')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
              activeFilter === 'verified_volunteers'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <HeartHandshake className="w-3 h-3 text-blue-300" />
            <span>{getLangText('Verified Volunteers', 'Verified Volunteers', 'தொண்டர்கள்')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('at_risk')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
              activeFilter === 'at_risk'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-300" />
            <span>{getLangText('අවදානම් (≤30)', 'At Risk (≤30)', 'எச்சரிக்கை')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('blocked')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
              activeFilter === 'blocked'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Ban className="w-3 h-3 text-red-300" />
            <span>{getLangText('Blocked (0 pts)', 'Blocked (0 pts)', 'முடக்கப்பட்டது')}</span>
          </button>
        </div>
      </div>

      {/* 4. Users Trust Directory Table */}
      <div className="bg-white dark:bg-[#071912] border border-slate-200 dark:border-emerald-900/60 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0c2419] border-b border-slate-200 dark:border-emerald-900/60 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">{getLangText('පරිශීලක තොරතුරු', 'User Info', 'பயனர்')}</th>
                <th className="py-3 px-4">{getLangText('විශ්වාසනීය ලකුණු (Trust Score)', 'Trust Points', 'புள்ளிகள்')}</th>
                <th className="py-3 px-4">{getLangText('හිමි ලාංඡන (Badges)', 'Active Badges', 'பேட்ஜ்கள்')}</th>
                <th className="py-3 px-4">{getLangText('තත්ත්වය (Status)', 'Status', 'நிலை')}</th>
                <th className="py-3 px-4 text-right">{getLangText('ක්‍රියාමාර්ග (Actions)', 'Actions', 'செயல்கள்')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/30">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    {getLangText('කිසිදු පරිශීලකයෙකු හමු නොවීය', 'No users found matching your criteria', 'பயனர்கள் இல்லை')}
                  </td>
                </tr>
              ) : (
                filteredUsers.filter(Boolean).map((u, idx) => {
                  const pts = u.trustData?.points ?? 100;
                  const isBlocked = u.isBlockedCalculated || pts <= 0;
                  const badges = u.trustData?.customBadges || [];

                  return (
                    <tr key={u.id || u.userId || u.nicNumber || idx} className="hover:bg-slate-50/80 dark:hover:bg-emerald-950/20 transition-colors">
                      {/* User Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-emerald-900/50 border border-slate-200 dark:border-emerald-800/60 flex items-center justify-center font-black text-sm text-slate-700 dark:text-emerald-300 shrink-0">
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {u.status === 'approved' && (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                              <span>{u.phone}</span>
                              {u.nicNumber && <span>• NIC: {u.nicNumber}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Points Meter */}
                      <td className="py-3 px-4">
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex items-center justify-between font-mono font-bold text-xs">
                            <span className={
                              pts <= 0 
                                ? 'text-red-600 font-black' 
                                : pts <= 30 
                                ? 'text-amber-500 font-black' 
                                : 'text-emerald-600 dark:text-emerald-400'
                            }>
                              {pts} pts
                            </span>
                            <span className="text-[10px] text-slate-400">/ 300+</span>
                          </div>
                          <div className="w-24 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                pts <= 0 
                                  ? 'bg-red-600 w-full' 
                                  : pts <= 30 
                                  ? 'bg-amber-500' 
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, (pts / 300) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Badges */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {badges.length === 0 ? (
                            <span className="text-[10px] text-slate-400 italic">
                              {getLangText('විශේෂ ලාංඡන නැත', 'No custom badges', 'பேட்ஜ்கள் இல்லை')}
                            </span>
                          ) : (
                            badges.map(b => (
                              <span 
                                key={b}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border shadow-2xs ${
                                  b === 'verified_seller'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                                    : b === 'verified_volunteer'
                                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300'
                                    : b === 'verified_professional'
                                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300'
                                    : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300'
                                }`}
                              >
                                {b === 'verified_seller' && '🏪 Seller'}
                                {b === 'verified_volunteer' && '🤝 Volunteer'}
                                {b === 'verified_professional' && '🛠️ Pro'}
                                {b === 'community_hero' && '🌟 Hero'}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
                            <Ban className="w-3 h-3" />
                            <span>BLOCKED (0 pts)</span>
                          </span>
                        ) : pts <= 30 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            <span>AT RISK</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle className="w-3 h-3" />
                            <span>GOOD TRUST</span>
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Points Adjustment Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setPointsChangeType('add');
                              setPointsAmount(25);
                              setPointsReason('සාර්ථක ස්වේච්ඡා මෙහෙයුම');
                              setCustomReason('');
                              setActionModalMode('adjust_points');
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
                            title={getLangText('ලකුණු වැඩි/අඩු කරන්න', 'Adjust Points', 'புள்ளிகள் மாற்று')}
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Badges Manage Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setActionModalMode('manage_badges');
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-200 hover:text-blue-600 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
                            title={getLangText('ලාංඡන කළමනාකරණය', 'Manage Badges', 'பேட்ஜ்கள் மேலாண்மை')}
                          >
                            <Award className="w-3.5 h-3.5" />
                          </button>

                          {/* Block / Unblock Button */}
                          {isBlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(u);
                                setRestorePointsAmount(100);
                                setActionModalMode('block_unblock');
                              }}
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer shadow-xs transition-all flex items-center gap-1"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>UNBLOCK</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(u);
                                handleDirectBlock();
                              }}
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950 text-slate-500 hover:text-red-600 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
                              title={getLangText('ගිණුම Block කරන්න', 'Block Account', 'முடக்கு')}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Points Adjustment Modal */}
      {actionModalMode === 'adjust_points' && selectedUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActionModalMode(null)}
        >
          <div 
            className="bg-white dark:bg-[#071912] border-2 border-emerald-500/60 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-left relative text-slate-800 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActionModalMode(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {getLangText('විශ්වාසනීය ලකුණු වෙනස් කිරීම', 'Adjust User Trust Points', 'புள்ளிகள் மாற்று')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedUser.name} ({selectedUser.phone}) • {getLangText('වත්මන් ලකුණු:', 'Current Balance:', 'தற்போதைய புள்ளிகள்:')} <span className="font-mono font-bold text-emerald-600">{getUserTrustData(selectedUser).points} pts</span>
                </p>
              </div>
            </div>

            {pointsSuccessMsg && (
              <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{pointsSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handlePointsSubmit} className="space-y-4">
              {/* Type Toggle: Add or Deduct */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setPointsChangeType('add');
                    setPointsReason('සාර්ථක ස්වේච්ඡා මෙහෙයුම');
                    setPointsAmount(25);
                  }}
                  className={`py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    pointsChangeType === 'add'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-300 hover:text-emerald-500'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{getLangText('ලකුණු එකතු කරන්න (+)', 'Award Points (+)', 'கூட்டவும் (+)')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPointsChangeType('deduct');
                    setPointsReason('බොරු / ව්‍යාජ ආධාර ඉල්ලීමක් පළකිරීම');
                    setPointsAmount(50);
                  }}
                  className={`py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    pointsChangeType === 'deduct'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-300 hover:text-red-500'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>{getLangText('ලකුණු කපන්න (-)', 'Deduct Penalty (-)', 'குறைக்கவும் (-)')}</span>
                </button>
              </div>

              {/* Amount Selector & Quick Buttons */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  {getLangText('ලකුණු ප්‍රමාණය (Points Amount)', 'Points Amount', 'புள்ளிகள் அளவு')}
                </label>
                <div className="flex items-center gap-2">
                  {[10, 25, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPointsAmount(amt)}
                      className={`flex-1 py-1.5 rounded-xl font-mono font-bold text-xs border cursor-pointer ${
                        pointsAmount === amt
                          ? pointsChangeType === 'add'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {pointsChangeType === 'add' ? `+${amt}` : `-${amt}`}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c2419] border border-slate-200 dark:border-emerald-800/60 focus:outline-hidden focus:border-emerald-500 font-mono font-bold mt-1"
                />
              </div>

              {/* Preset Reason Choices */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  {getLangText('හේතුව තෝරන්න (Select Reason Preset)', 'Reason Preset', 'காரணம்')}
                </label>
                <select
                  value={pointsReason}
                  onChange={(e) => {
                    setPointsReason(e.target.value);
                    const match = (pointsChangeType === 'add' ? ADD_REASONS : DEDUCT_REASONS).find(r => r.text === e.target.value);
                    if (match) setPointsAmount(match.pts);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c2419] border border-slate-200 dark:border-emerald-800/60 font-medium"
                >
                  {(pointsChangeType === 'add' ? ADD_REASONS : DEDUCT_REASONS).map((r, i) => (
                    <option key={i} value={r.text}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Reason Text */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  {getLangText('වෙනත් විශේෂ හේතුවක් (විකල්ප):', 'Custom Note (Optional):', 'குறிப்பு:')}
                </label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder={getLangText('විස්තරාත්මක සටහනක් ඇතුළත් කරන්න...', 'Add optional detailed note...', 'விவரங்கள்...')}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c2419] border border-slate-200 dark:border-emerald-800/60 focus:outline-hidden focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Warning if deduction will auto block */}
              {pointsChangeType === 'deduct' && getUserTrustData(selectedUser).points - pointsAmount <= 0 && (
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-300 text-red-700 dark:text-red-300 text-xs font-bold space-y-1">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>අවධානය යොමු කරන්න: ලකුණු 0 වීම නිසා ගිණුම AUTO-BLOCK වේ!</span>
                  </div>
                  <p className="text-[11px] font-normal leading-tight">
                    පරිශීලකයාගේ දුරකථන අංකය සහ NIC අංකය කළු ලැයිස්තුගත (Blacklist) කෙරෙන අතර නැවත ලොග් වීම අවහිර කෙරේ.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModalMode(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {getLangText('අවලංගු කරන්න', 'Cancel', 'ரத்து')}
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white text-xs font-black shadow-md cursor-pointer transition-transform active:scale-95 ${
                    pointsChangeType === 'add'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {pointsChangeType === 'add'
                    ? getLangText('ලකුණු එකතු කරන්න', 'Confirm Award', 'உறுதி செய்')
                    : getLangText('දඬුවම් ලකුණු කපන්න', 'Apply Penalty', 'தண்டனை குறை')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Manage Custom Badges Modal */}
      {actionModalMode === 'manage_badges' && selectedUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActionModalMode(null)}
        >
          <div 
            className="bg-white dark:bg-[#071912] border-2 border-blue-500/60 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-left relative text-slate-800 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActionModalMode(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {getLangText('පරිශීලක ලාංඡන ලබාදීම / ඉවත් කිරීම', 'Grant & Revoke Verified Badges', 'பேட்ஜ்கள் மேலாண்மை')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedUser.name} ({selectedUser.phone})
                </p>
              </div>
            </div>

            {/* Badges List with Toggles */}
            <div className="space-y-2.5 pt-2">
              {/* Badge 1: Verified Seller */}
              {(() => {
                const isGranted = (getUserTrustData(selectedUser).customBadges || []).includes('verified_seller');
                return (
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-base shrink-0">
                        🏪
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                          Verified Seller (තහවුරු කළ වෙළෙන්දා)
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                          සාධාරණ මිල සහ තහවුරු කළ වෙළඳසැලක් සහිතයි
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBadgeToggle('verified_seller', isGranted)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        isGranted
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      {isGranted ? 'ඉවත් කරන්න' : 'ලබාදෙන්න'}
                    </button>
                  </div>
                );
              })()}

              {/* Badge 2: Verified Volunteer */}
              {(() => {
                const isGranted = (getUserTrustData(selectedUser).customBadges || []).includes('verified_volunteer');
                return (
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-base shrink-0">
                        🤝
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                          Verified Volunteer (ස්වේච්ඡා සේවක)
                        </div>
                        <div className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">
                          ලේ පරිත්‍යාග සහ ආපදා සහන සහතිකලත් සාමාජික
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBadgeToggle('verified_volunteer', isGranted)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        isGranted
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                      }`}
                    >
                      {isGranted ? 'ඉවත් කරන්න' : 'ලබාදෙන්න'}
                    </button>
                  </div>
                );
              })()}

              {/* Badge 3: Verified Professional */}
              {(() => {
                const isGranted = (getUserTrustData(selectedUser).customBadges || []).includes('verified_professional');
                return (
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center text-base shrink-0">
                        🛠️
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                          Verified Professional (කාර්මික/වෘත්තික)
                        </div>
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                          සුදුසුකම් සහ තාක්ෂණික කුසලතා තහවුරුයි
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBadgeToggle('verified_professional', isGranted)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        isGranted
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                          : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                      }`}
                    >
                      {isGranted ? 'ඉවත් කරන්න' : 'ලබාදෙන්න'}
                    </button>
                  </div>
                );
              })()}

              {/* Badge 4: Community Hero */}
              {(() => {
                const isGranted = (getUserTrustData(selectedUser).customBadges || []).includes('community_hero');
                return (
                  <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center text-base shrink-0">
                        🌟
                      </div>
                      <div>
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                          Community Hero (ප්‍රජා නායකයා)
                        </div>
                        <div className="text-[10px] text-purple-700 dark:text-purple-400 font-medium">
                          සුවිශේෂී ප්‍රජා සත්කාරක මෙහෙවර
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBadgeToggle('community_hero', isGranted)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        isGranted
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                          : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                      }`}
                    >
                      {isGranted ? 'ඉවත් කරන්න' : 'ලබාදෙන්න'}
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => setActionModalMode(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {getLangText('සම්පූර්ණයි (Close)', 'Done (Close)', 'முடிந்தது')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Unblock & Restore Modal */}
      {actionModalMode === 'block_unblock' && selectedUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActionModalMode(null)}
        >
          <div 
            className="bg-white dark:bg-[#071912] border-2 border-emerald-500/60 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-left relative text-slate-800 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActionModalMode(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {getLangText('ගිණුම නැවත ක්‍රියාත්මක කිරීම (Unblock)', 'Unblock & Restore Account', 'கணக்கை மீட்டெடுக்கவும்')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedUser.name} ({selectedUser.phone})
                </p>
              </div>
            </div>

            <form onSubmit={handleUnblockSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  {getLangText('ප්‍රතිසාධන ලකුණු ප්‍රමාණය (Restore Points):', 'Restore Points Balance:', 'மீட்டெடுப்பு புள்ளிகள்:')}
                </label>
                <div className="flex items-center gap-2">
                  {[50, 100, 150].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRestorePointsAmount(amt)}
                      className={`flex-1 py-1.5 rounded-xl font-mono font-bold text-xs border cursor-pointer ${
                        restorePointsAmount === amt
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {amt} pts
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  {getLangText('සක්‍රීය කිරීමට හේතුව / පරිපාලක සටහන:', 'Unblock Remark:', 'காரணம்:')}
                </label>
                <input
                  type="text"
                  value={unblockReason}
                  onChange={(e) => setUnblockReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c2419] border border-slate-200 dark:border-emerald-800/60 focus:outline-hidden focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModalMode(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600"
                >
                  {getLangText('අවලංගු කරන්න', 'Cancel', 'ரத்து')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  {getLangText('ගිණුම Unblock කරන්න', 'Confirm Unblock', 'முடக்கத்தை நீக்கு')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Audit Logs Full Drawer */}
      {showLogsDrawer && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowLogsDrawer(false)}
        >
          <div 
            className="bg-white dark:bg-[#071912] border-2 border-emerald-500/60 rounded-3xl p-5 sm:p-6 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl space-y-4 text-left relative text-slate-800 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-emerald-900/60">
              <div className="flex items-center gap-2.5">
                <History className="w-6 h-6 text-emerald-500" />
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {getLangText('විශ්වාසනීයත්ව සහ දඬුවම් ලකුණු විගණන වාර්තාව', 'Trust Points & Penalties Audit Log', 'தணிக்கை பதிவு')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {getLangText('සියලුම ලකුණු වෙනස්කම්, දඬුවම්, ලාංඡන ලබාදීම් සහ Auto-Blocks වාර්තා', 'Complete record of score adjustments and anti-fraud strikes', 'முழு பதிவு')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogsDrawer(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Log Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder={getLangText('පරිශීලක හෝ හේතුව අනුව සොයන්න...', 'Search log by user or reason...', 'தேடுக...')}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c2419] border border-slate-200 dark:border-emerald-800/60"
              />
            </div>

            {/* Logs List */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {auditLogs
                .filter(l => !logSearchQuery.trim() || l.userName.toLowerCase().includes(logSearchQuery.toLowerCase()) || l.reason.toLowerCase().includes(logSearchQuery.toLowerCase()))
                .map((log) => (
                  <div 
                    key={log.id}
                    className={`p-3 rounded-2xl border text-xs space-y-1 ${
                      log.change > 0 
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                        : log.change < 0
                        ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900 dark:text-white flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        {log.userName}
                      </span>
                      <span className={`font-mono font-black ${
                        log.change > 0 ? 'text-emerald-600 dark:text-emerald-400' : log.change < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500'
                      }`}>
                        {log.change > 0 ? `+${log.change}` : log.change < 0 ? `${log.change}` : '0'} pts • නව ශේෂය: {log.balanceAfter} pts
                      </span>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      {log.reason}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                      <span>👤 {log.adminName || 'Admin'}</span>
                      <span>🕒 {log.timestamp}</span>
                    </div>
                  </div>
                ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowLogsDrawer(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {getLangText('වසන්න (Close)', 'Close', 'மூடு')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

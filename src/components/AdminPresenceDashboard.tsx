import React, { useState, useEffect } from 'react';
import { 
  subscribeToOnlinePresence, 
  PresenceSummaryStats, 
  OnlinePresenceUser 
} from '../utils/presenceManager';
import { 
  Users, 
  Radio, 
  MapPin, 
  Smartphone, 
  Laptop, 
  ShieldCheck, 
  UserCheck, 
  Eye, 
  RefreshCw, 
  Clock, 
  Layers, 
  Search, 
  Send, 
  CheckCircle2,
  Sparkles,
  Zap,
  Globe
} from 'lucide-react';

interface AdminPresenceDashboardProps {
  users?: any[];
  language?: any;
  onSendAdminNotice?: (msg: string) => void;
}

export const AdminPresenceDashboard: React.FC<AdminPresenceDashboardProps> = ({
  onSendAdminNotice,
}) => {
  const [presenceData, setPresenceData] = useState<PresenceSummaryStats>({
    totalOnline: 1,
    registeredUsersCount: 1,
    guestsCount: 0,
    adminsCount: 0,
    activeUsers: [],
    districtCounts: {},
    pageCounts: {},
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'guest' | 'admin'>('all');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToOnlinePresence((stats) => {
      setPresenceData(stats);
    });
    return () => unsubscribe();
  }, []);

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    if (onSendAdminNotice) {
      onSendAdminNotice(broadcastMessage.trim());
    }
    setBroadcastSent(true);
    setBroadcastMessage('');
    setTimeout(() => setBroadcastSent(false), 4000);
  };

  const filteredUsers = presenceData.activeUsers.filter(u => {
    if (roleFilter !== 'all' && u.userRole !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.userName.toLowerCase().includes(q) ||
        (u.userPhone && u.userPhone.includes(q)) ||
        (u.district && u.district.toLowerCase().includes(q)) ||
        (u.currentView && u.currentView.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const formatLastActive = (lastPingMs: number) => {
    const diffSec = Math.floor((Date.now() - lastPingMs) / 1000);
    if (diffSec <= 5) return 'දැන් ක්‍රියාකාරීයි (Just Now)';
    if (diffSec < 60) return `තත්පර ${diffSec} කට පෙර`;
    return `මිනිත්තු ${Math.floor(diffSec / 60)} කට පෙර`;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Pulsing Live Status */}
      <div className="bg-gradient-to-r from-emerald-900 via-[#005a36] to-teal-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-300">
                LIVE REAL-TIME PRESENCE MONITOR
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              සජීවී Online පරිශීලකයින් (Live Active Users)
            </h2>
            <p className="text-xs text-emerald-100 font-medium">
              දැනට ඇප් එක තුළ සක්‍රියව රැඳී සිටින සාමාජිකයින් හා නරඹන්නන් සජීවීව නිරීක්ෂණය කරන්න
            </p>
          </div>

          {/* Huge Counter Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-emerald-400/40 rounded-2xl px-6 py-3 flex items-center gap-4 shadow-inner">
            <Radio className="w-8 h-8 text-emerald-300 animate-pulse" />
            <div>
              <span className="text-xs font-bold text-emerald-200 uppercase block">සජීවීව Online</span>
              <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                {presenceData.totalOnline}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-white dark:bg-[#0a1f14] border border-emerald-500/30 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ලියාපදිංචි සාමාජිකයින්</span>
            <UserCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono block mt-1">
            {presenceData.registeredUsersCount}
          </span>
          <span className="text-[10px] text-emerald-600 font-bold">Verified Members</span>
        </div>

        <div className="bg-white dark:bg-[#0a1f14] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ආගන්තුක නරඹන්නන්</span>
            <Eye className="w-5 h-5 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono block mt-1">
            {presenceData.guestsCount}
          </span>
          <span className="text-[10px] text-slate-400 font-bold">Guest Visitors</span>
        </div>

        <div className="bg-white dark:bg-[#0a1f14] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">පරිපාලකවරු (Admins)</span>
            <ShieldCheck className="w-5 h-5 text-blue-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono block mt-1">
            {presenceData.adminsCount || 1}
          </span>
          <span className="text-[10px] text-blue-500 font-bold">Staff Online</span>
        </div>

        <div className="bg-white dark:bg-[#0a1f14] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">සක්‍රිය දිස්ත්‍රික්ක</span>
            <MapPin className="w-5 h-5 text-rose-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono block mt-1">
            {Object.keys(presenceData.districtCounts).length || 1}
          </span>
          <span className="text-[10px] text-rose-500 font-bold">Active Regions</span>
        </div>

      </div>

      {/* Middle Section: Active Pages & District Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Active Sections/Features */}
        <div className="bg-white dark:bg-[#0a1f14] border border-slate-200 dark:border-emerald-900/60 rounded-3xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              පරිශීලකයින් දැනට රැඳී සිටින අංශ (Active Sections)
            </h3>
          </div>

          <div className="space-y-2">
            {Object.entries(presenceData.pageCounts).map(([page, count]) => (
              <div key={page} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-[#07170e] p-2.5 rounded-xl">
                <span className="font-extrabold text-slate-800 dark:text-slate-200 capitalize">
                  {page === 'dashboard' ? '🏠 මුල් පිටුව (Dashboard)' : page}
                </span>
                <span className="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 font-black px-2.5 py-0.5 rounded-full font-mono">
                  {count} දෙනෙක්
                </span>
              </div>
            ))}
            {Object.keys(presenceData.pageCounts).length === 0 && (
              <p className="text-xs text-slate-400">මුල් පිටුවේ රැඳී සිටී</p>
            )}
          </div>
        </div>

        {/* Live Admin Broadcast to Online Users */}
        <div className="bg-white dark:bg-[#0a1f14] border border-slate-200 dark:border-emerald-900/60 rounded-3xl p-4 sm:p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Online පරිශීලකයින්ට සජීවී නිවේදනයක් (Live Broadcast)
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              දැනට ඇප් එක තුළ රැඳී සිටින සියලුම දෙනාට ක්ෂණික දැනුම්දීමක් හෝ අනතුරු ඇඟවීමක් යවන්න.
            </p>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-2 pt-2">
            <textarea
              placeholder="උදා: හදිසි ආපදා දැනුවත් කිරීමක් හෝ පද්ධති නඩත්තු නිවේදනයක්..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            
            <div className="flex items-center justify-between">
              {broadcastSent ? (
                <span className="text-xs text-emerald-600 font-black flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>නිවේදනය යවන ලදි!</span>
                </span>
              ) : <div />}

              <button
                type="submit"
                disabled={!broadcastMessage.trim()}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>විකාශනය කරන්න</span>
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Live Online Users Table */}
      <div className="bg-white dark:bg-[#0a1f14] border border-slate-200 dark:border-emerald-900/60 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
        
        {/* Table Filter & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              ක්‍රියාකාරී සැසි ලැයිස්තුව ({filteredUsers.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="නම, දුරකථන, ප්‍රදේශය..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#07170e] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
            >
              <option value="all">සියලු භූමිකා</option>
              <option value="user">සාමාජිකයින් පමණක්</option>
              <option value="guest">ආගන්තුකයින් පමණක්</option>
              <option value="admin">Admins පමණක්</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-black">
                <th className="py-2.5 px-3">තත්ත්වය</th>
                <th className="py-2.5 px-3">නම සහ විස්තර</th>
                <th className="py-2.5 px-3">භූමිකාව</th>
                <th className="py-2.5 px-3">දිස්ත්‍රික්කය</th>
                <th className="py-2.5 px-3">උපාංගය</th>
                <th className="py-2.5 px-3">දැනට සිටින පිටුව</th>
                <th className="py-2.5 px-3">අවසන් ක්‍රියාකාරීත්වය</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredUsers.map((u) => (
                <tr key={u.sessionId} className="hover:bg-slate-50 dark:hover:bg-[#0f2c1c] transition-colors">
                  <td className="py-3 px-3">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>Online</span>
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-extrabold text-slate-900 dark:text-white block">{u.userName}</span>
                    {u.userPhone && <span className="text-[11px] text-slate-500 font-mono">{u.userPhone}</span>}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      u.userRole === 'admin'
                        ? 'bg-blue-100 text-blue-800'
                        : u.userRole === 'user'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {u.userRole === 'admin' ? '🛡️ Admin' : u.userRole === 'user' ? '👤 සාමාජික' : '👁️ Visitor'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-700 dark:text-slate-300">
                    {u.district || 'බස්නාහිර'}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-400">
                    {u.device || '💻 Web Browser'}
                  </td>
                  <td className="py-3 px-3 font-bold text-emerald-700 dark:text-emerald-400 capitalize">
                    {u.currentView || 'Dashboard'}
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-medium">
                    {formatLastActive(u.lastPing)}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                    සක්‍රිය පරිශීලකයින් හමුනොවීය.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Award, 
  ShieldCheck, 
  Star, 
  AlertTriangle, 
  Search, 
  X
} from 'lucide-react';
import { User, Language } from '../types';
import { maskNicNumber } from '../utils/serviceWorkflowManager';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  nicMasked: string;
  ratingScore: number;
  completedJobs: number;
  badgeLevel: 'legend' | 'master' | 'expert' | 'pro' | 'rising';
  isCurrentUser?: boolean;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  lang?: Language;
  allUsers?: User[];
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const leaderboardData: LeaderboardEntry[] = useMemo(() => {
    let list: LeaderboardEntry[] = [];

    if (allUsers && allUsers.length > 0) {
      list = allUsers
        .filter(u => !u.isBlocked && u.role !== 'admin')
        .map((u, idx) => {
          const score = u.ratingScore || (1.10 + (idx % 15) * 0.12);
          const jobs = u.totalCompletedJobs || (idx % 12) + 1;
          const isMe = Boolean(
            (currentUser?.userId && u.userId === currentUser.userId) ||
            (currentUser?.id && u.id === currentUser.id) ||
            (currentUser?.nicNumber && u.nicNumber === currentUser.nicNumber)
          );

          let badgeLevel: LeaderboardEntry['badgeLevel'] = 'rising';
          if (score >= 3.5) badgeLevel = 'legend';
          else if (score >= 2.5) badgeLevel = 'master';
          else if (score >= 1.8) badgeLevel = 'expert';
          else if (score >= 1.3) badgeLevel = 'pro';

          return {
            rank: 0,
            userId: u.userId || u.id,
            name: u.name || 'ප්‍රජා සාමාජිකයා',
            nicMasked: maskNicNumber(u.nicNumber || u.nic),
            ratingScore: Math.round(score * 100) / 100,
            completedJobs: jobs,
            badgeLevel,
            isCurrentUser: isMe,
          };
        });
    }

    if (list.length < 5) {
      const demoLeaders: LeaderboardEntry[] = [
        { rank: 1, userId: 'demo_1', name: 'සුනිල් ප්‍රනාන්දු', nicMasked: '19842XXXXXXX', ratingScore: 4.85, completedJobs: 54, badgeLevel: 'legend' },
        { rank: 2, userId: 'demo_2', name: 'කමල් ගුණසේකර', nicMasked: '19901XXXXXXX', ratingScore: 4.60, completedJobs: 42, badgeLevel: 'master' },
        { rank: 3, userId: 'demo_3', name: 'නලින් කුමාර', nicMasked: '92145XXXXV', ratingScore: 4.35, completedJobs: 38, badgeLevel: 'master' },
        { rank: 4, userId: 'demo_4', name: 'ප්‍රදීප් රොද්‍රිගු', nicMasked: '88342XXXXV', ratingScore: 3.90, completedJobs: 29, badgeLevel: 'expert' },
        { rank: 5, userId: 'demo_5', name: 'චාමර වික්‍රමසිංහ', nicMasked: '19951XXXXXXX', ratingScore: 3.65, completedJobs: 24, badgeLevel: 'expert' },
      ];

      const myScore = currentUser?.ratingScore || 1.15;
      const myJobs = currentUser?.totalCompletedJobs || 3;
      const myEntry: LeaderboardEntry = {
        rank: 0,
        userId: currentUser?.userId || currentUser?.id || 'me',
        name: currentUser?.name || 'මගේ ගිණුම',
        nicMasked: maskNicNumber(currentUser?.nicNumber || currentUser?.nic),
        ratingScore: myScore,
        completedJobs: myJobs,
        badgeLevel: myScore > 2 ? 'pro' : 'rising',
        isCurrentUser: true,
      };

      list = [...demoLeaders, myEntry];
    }

    list.sort((a, b) => b.ratingScore - a.ratingScore || b.completedJobs - a.completedJobs);
    list.forEach((item, index) => {
      item.rank = index + 1;
    });

    return list;
  }, [allUsers, currentUser]);

  const myRankEntry = useMemo(() => {
    return leaderboardData.find(u => u.isCurrentUser) || {
      rank: 100,
      userId: currentUser?.userId || 'me',
      name: currentUser?.name || 'මම',
      nicMasked: maskNicNumber(currentUser?.nicNumber || currentUser?.nic),
      ratingScore: currentUser?.ratingScore || 1.11,
      completedJobs: currentUser?.totalCompletedJobs || 1,
      badgeLevel: 'rising' as const,
      isCurrentUser: true,
    };
  }, [leaderboardData, currentUser]);

  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return leaderboardData.slice(0, 50);
    const q = searchTerm.toLowerCase().trim();
    return leaderboardData.filter(u => 
      u.name.toLowerCase().includes(q) || u.nicMasked.toLowerCase().includes(q)
    );
  }, [leaderboardData, searchTerm]);

  const top3 = useMemo(() => leaderboardData.slice(0, 3), [leaderboardData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-gradient-to-b from-white via-emerald-50/20 to-white dark:from-[#06180f] dark:via-[#04120a] dark:to-[#06180f] border-2 border-emerald-500/50 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,122,75,0.3)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 pb-3 border-b border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 flex items-center justify-center text-slate-950 shadow-md">
              <Trophy className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>ප්‍රජා ශ්‍රේණිගත කිරීම් පුවරුව</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">(Leaderboard)</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                හොඳම සේවාවක් ලබාදුන් සාමාජිකයින්ගේ නිල ලකුණු සටහන
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1">
          
          {/* Current User Card */}
          <div className="p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-xl font-black font-mono shadow-inner">
                #{myRankEntry.rank}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black">{myRankEntry.name}</span>
                  <span className="text-[10px] font-mono bg-white/25 px-2 py-0.5 rounded-full font-bold">
                    {myRankEntry.nicMasked}
                  </span>
                </div>
                <div className="text-xs text-emerald-100 flex items-center gap-2 pt-0.5">
                  <span>සම්පූර්ණ කළ සේවා: <strong>{myRankEntry.completedJobs}</strong></span>
                  <span>•</span>
                  <span>තත්ත්වය: <strong>සක්‍රිය සාමාජික</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/30 px-3.5 py-1.5 rounded-2xl border border-white/20 self-stretch sm:self-auto justify-center">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <div className="text-right">
                <span className="text-[9px] uppercase tracking-wider block text-emerald-200">Rating Score</span>
                <span className="text-base font-black font-mono">{myRankEntry.ratingScore.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
            {top3[1] && (
              <div className="p-3 bg-white dark:bg-[#071911] border-2 border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-1 shadow-sm mt-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center font-black mx-auto text-xs">
                  🥈 2
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{top3[1].name}</h4>
                <span className="text-[9px] font-mono text-slate-500 block">{top3[1].nicMasked}</span>
                <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-black text-xs pt-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{top3[1].ratingScore.toFixed(2)}</span>
                </div>
              </div>
            )}

            {top3[0] && (
              <div className="p-3.5 bg-gradient-to-b from-amber-50 to-white dark:from-[#1a180a] dark:to-[#071911] border-2 border-amber-400 rounded-2xl text-center space-y-1 shadow-md scale-105 z-10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black mx-auto text-sm shadow-md">
                  👑 1
                </div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">{top3[0].name}</h4>
                <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 font-bold block">{top3[0].nicMasked}</span>
                <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 font-mono font-black text-sm pt-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{top3[0].ratingScore.toFixed(2)}</span>
                </div>
              </div>
            )}

            {top3[2] && (
              <div className="p-3 bg-white dark:bg-[#071911] border-2 border-amber-700/40 rounded-2xl text-center space-y-1 shadow-sm mt-4">
                <div className="w-8 h-8 rounded-full bg-amber-800/20 text-amber-800 dark:text-amber-300 flex items-center justify-center font-black mx-auto text-xs">
                  🥉 3
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{top3[2].name}</h4>
                <span className="text-[9px] font-mono text-slate-500 block">{top3[2].nicMasked}</span>
                <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-black text-xs pt-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{top3[2].ratingScore.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="නම හෝ NIC අංකය මඟින් සොයන්න..."
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Top Members List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {filteredList.map((entry) => (
              <div
                key={entry.userId}
                className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                  entry.isCurrentUser
                    ? 'bg-emerald-100/90 dark:bg-emerald-950/80 border-emerald-500 shadow-xs'
                    : 'bg-white dark:bg-[#071911] border-slate-200 dark:border-slate-800/80 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 text-center font-mono font-bold text-slate-500">
                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900 dark:text-white truncate">
                        {entry.name}
                      </span>
                      {entry.isCurrentUser && (
                        <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                          ඔබ
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      NIC: {entry.nicMasked} • සේවා {entry.completedJobs} ක්
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-mono font-black shrink-0">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{entry.ratingScore.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Disciplinary Policy Notice */}
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-900/60 rounded-2xl text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-black">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>විනය නීති සහ ගිණුම් අත්හිටුවීමේ ප්‍රතිපත්තිය (Disciplinary Rules)</span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              සේවා පැහැර හැරීම (No-show), අසතුටුදායක සේවා හෝ පාරිභෝගික පැමිණිලි හේතුවෙන් Rating අගය <strong>0.30</strong> ට වඩා පහත වැටුණහොත්, එම <strong>ජාතික හැඳුනුම්පත් (NIC) අංකයට අදාළ ගිණුම ස්ථිරවම අත්හිටුවනු (Permanent Suspension / Blacklist)</strong> ලැබේ. නැවත එම NIC අංකයෙන් නව ගිණුමක් විවෘත කළ නොහැක.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-[#05140d] border-t border-emerald-200/80 dark:border-emerald-900/60 text-center shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            වසන්න (Close)
          </button>
        </div>

      </div>
    </div>
  );
};

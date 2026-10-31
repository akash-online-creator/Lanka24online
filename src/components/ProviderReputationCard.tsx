import React, { useState } from 'react';
import { 
  ProviderReputationSummary, 
  PROVIDER_LEVELS, 
  ProviderLevelId 
} from '../utils/reputationSystem';
import { 
  Award, 
  Star, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2, 
  Lock, 
  Flame, 
  Zap, 
  Briefcase,
  Users,
  Info
} from 'lucide-react';

interface ProviderReputationCardProps {
  reputation: ProviderReputationSummary;
  compact?: boolean;
  onOpenDetailsModal?: () => void;
  showAllLevelsLadder?: boolean;
}

export const ProviderReputationCard: React.FC<ProviderReputationCardProps> = ({
  reputation,
  compact = false,
  onOpenDetailsModal,
  showAllLevelsLadder = false,
}) => {
  const [showLadder, setShowLadder] = useState(showAllLevelsLadder);
  const { levelConfig, nextLevel } = reputation;

  if (compact) {
    return (
      <div 
        onClick={onOpenDetailsModal}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-gradient-to-r ${levelConfig.bgGradient} text-white shadow-md border ${levelConfig.borderColor} cursor-pointer hover:scale-105 active:scale-95 transition-all text-xs font-black`}
        title={levelConfig.nameSi}
      >
        <span className="text-base">{levelConfig.icon}</span>
        <span>{levelConfig.badgeTitle}</span>
        <div className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-full text-[11px] font-bold">
          <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
          <span>{reputation.totalReviewsCount > 0 ? reputation.avgRating.toFixed(1) : 'නව'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full rounded-3xl bg-gradient-to-br from-slate-900 via-[#0a1f14] to-slate-950 border-2 ${levelConfig.borderColor} p-5 sm:p-6 text-white shadow-2xl relative overflow-hidden transition-all`}>
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-44 h-44 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-44 h-44 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Top Header & Level Badge */}
      <div className="flex flex-wrap items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-br ${levelConfig.bgGradient} p-0.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center text-3xl sm:text-4xl shrink-0 border-2 ${levelConfig.borderColor} animate-pulse`}>
            {levelConfig.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                REPUTATION & LEVEL
              </span>
              <span className="text-xs font-mono font-bold text-amber-300">
                {reputation.points} Points
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
              {levelConfig.nameSi}
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              {reputation.providerName} • තහවුරු කළ සේවා ශ්‍රේණිය
            </p>
          </div>
        </div>

        {/* Star Rating Badge */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/40 px-3.5 py-1.5 rounded-2xl text-amber-300 font-black text-sm sm:text-base shadow-inner">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{reputation.totalReviewsCount > 0 ? reputation.avgRating.toFixed(1) : 'නව (New)'}</span>
            <span className="text-xs font-normal text-amber-200/80">({reputation.totalReviewsCount} Reviews)</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 font-semibold">
            {reputation.totalReviewsCount > 0 ? `${reputation.fiveStarCount}x ⭐️⭐️⭐️⭐️⭐️ පැසසුම්` : 'තවමත් පැසසුම් නොමැත'}
          </span>
        </div>
      </div>

      {/* Key Metrics Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-5 relative z-10">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
          <div className="text-slate-400 text-[11px] font-bold flex items-center justify-center gap-1 mb-1">
            <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
            <span>නිමකළ වැඩ</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {reputation.completedJobsCount} <span className="text-xs font-normal text-emerald-400">Jobs</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
          <div className="text-slate-400 text-[11px] font-bold flex items-center justify-center gap-1 mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>සෙවුම් ප්‍රමුඛතාවය</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300">
            +{levelConfig.visibilityBoostPercent}%
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
          <div className="text-slate-400 text-[11px] font-bold flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span>ගාස්තු වට්ටම</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-300">
            {levelConfig.feeDiscountPercent}% OFF
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
          <div className="text-slate-400 text-[11px] font-bold flex items-center justify-center gap-1 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>විශ්වසනීයත්වය</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            100% <span className="text-xs font-normal text-slate-300">Safe</span>
          </div>
        </div>
      </div>

      {/* Level Progress Bar to Next Tier */}
      {nextLevel ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 my-4 relative z-10 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>ඊළඟ ශ්‍රේණිය: <strong className="text-white">{nextLevel.nameSi}</strong></span>
            </span>
            <span className="text-emerald-400 font-mono font-black">
              {reputation.progressToNextLevelPercent}% සම්පූර්ණයි
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
            <div 
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.max(5, reputation.progressToNextLevelPercent)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 font-medium">
            <span>
              තවත් වැඩ: <strong className="text-amber-300 font-mono">{reputation.jobsNeededForNext}</strong> ක්
            </span>
            <span>
              අවශ්‍ය ලකුණු: <strong className="text-emerald-300 font-mono">{reputation.pointsNeededForNext}</strong>
            </span>
            <span>
              අවම Rating: <strong className="text-amber-300 font-mono">{nextLevel.minRating.toFixed(1)} ⭐️</strong>
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400/40 rounded-2xl p-4 my-4 text-center">
          <div className="text-sm font-black text-amber-300 flex items-center justify-center gap-2">
            <span>👑</span>
            <span>සුබ පැතුම්! ඔබ ඇප් එකේ ඉහළම 5-තරු ප්‍රභූ පුරාවෘත්ත ශ්‍රේණියේ (5-Star Elite Legend) පසුවෙයි!</span>
          </div>
          <p className="text-xs text-amber-100/90 mt-1">
            ඔබගේ පැතිකඩ සියලු පාරිභෝගික සෙවුම් වල ඉහළින්ම නිර්දේශ කෙරේ.
          </p>
        </div>
      )}

      {/* Toggle View All 5 Levels Ladder */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowLadder(!showLadder)}
          className="text-xs font-black text-amber-300 hover:text-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>සියලුම ශ්‍රේණි (Levels 1 - 5) සහ ප්‍රතිලාභ විස්තරය</span>
          {showLadder ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {onOpenDetailsModal && (
          <button
            type="button"
            onClick={onOpenDetailsModal}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all cursor-pointer"
          >
            සම්පූර්ණ විස්තරය
          </button>
        )}
      </div>

      {/* Expanded Levels Ladder */}
      {showLadder && (
        <div className="mt-4 space-y-3 pt-2 border-t border-white/5 animate-fadeIn">
          {([1, 2, 3, 4, 5] as ProviderLevelId[]).map((lvl) => {
            const conf = PROVIDER_LEVELS[lvl];
            const isCurrent = lvl === reputation.level;
            const isCompleted = lvl < reputation.level;

            return (
              <div
                key={lvl}
                className={`p-3 rounded-2xl border transition-all ${
                  isCurrent
                    ? `bg-gradient-to-r ${conf.bgGradient}/30 ${conf.borderColor} border-2 shadow-lg`
                    : isCompleted
                    ? 'bg-emerald-950/20 border-emerald-700/40 opacity-80'
                    : 'bg-white/5 border-white/10 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{conf.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">
                          {conf.nameSi}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
                            ඔබගේ වත්මන් ශ්‍රේණිය
                          </span>
                        )}
                        {isCompleted && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        අවශ්‍යතාවය: <strong>{conf.minJobs}+ Jobs</strong> • Rating: <strong>{conf.minRating > 0 ? `${conf.minRating} ⭐️` : 'ඕනෑම'}</strong> • ලකුණු: <strong>{conf.minPoints}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-amber-300 block">
                      +{conf.visibilityBoostPercent}% Priority
                    </span>
                    <span className="text-[10px] text-emerald-300">
                      {conf.feeDiscountPercent}% Fee Cut
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-300">
                  {conf.perksSi.map((perk, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-emerald-400">✔</span>
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

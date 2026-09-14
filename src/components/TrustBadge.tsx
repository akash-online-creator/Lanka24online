import React, { useState } from 'react';
import { ShieldCheck, Award, Star, CheckCircle, Info, X } from 'lucide-react';
import { UserTrustProfile, TrustBadgeType, Language } from '../types';

interface TrustBadgeProps {
  trustProfile?: UserTrustProfile;
  profile?: UserTrustProfile;
  userName?: string;
  size?: 'sm' | 'md' | 'lg';
  showPoints?: boolean;
  showKarmaPoints?: boolean;
  lang?: Language;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  trustProfile,
  profile,
  userName = 'පරිශීලක',
  size = 'md',
  showPoints,
  showKarmaPoints,
  lang = 'si',
}) => {
  const [showDetail, setShowDetail] = useState(false);

  const getLangText = (si: string, en: string, ta: string) => {
    if (lang === 'en') return en;
    if (lang === 'ta') return ta;
    return si;
  };

  // Support both trustProfile and profile props with safe fallback
  const currentProfile: UserTrustProfile = trustProfile || profile || {
    completedHelpsCount: 0,
    positiveReviewsCount: 1,
    karmaPoints: 10,
    trustBadge: 'bronze',
    badgeTitleSi: 'නව සාමාජික',
    badgeIcon: '🥉',
    verifiedPhone: false,
    verifiedNic: false,
  };

  const getLocalizedBadgeTitle = (badge?: TrustBadgeType, fallbackSi?: string) => {
    switch (badge) {
      case 'community_hero':
        return getLangText('ප්‍රජා වීරයා', 'Community Hero', 'சமூக நாயகன்');
      case 'gold':
        return getLangText('ප්‍රජා තරුව', 'Community Star', 'சமூக நட்சத்திரம்');
      case 'silver':
        return getLangText('විශ්වාසනීය සහායක', 'Trusted Helper', 'நம்பகமான உதவியாளர்');
      case 'bronze':
      default:
        return getLangText(fallbackSi || 'නව සාමාජික', 'New Member', 'புதிய உறுப்பினர்');
    }
  };

  const badgeTitle = getLocalizedBadgeTitle(currentProfile.trustBadge, currentProfile.badgeTitleSi);

  const shouldShowPoints = showPoints !== undefined ? showPoints : (showKarmaPoints ?? true);

  const getBadgeColors = (badge?: TrustBadgeType) => {
    switch (badge) {
      case 'community_hero':
        return 'bg-gradient-to-r from-amber-500 to-rose-500 text-white border-amber-300 shadow-amber-500/30';
      case 'gold':
        return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white border-amber-300 shadow-amber-500/20';
      case 'silver':
        return 'bg-gradient-to-r from-slate-200 to-slate-400 text-slate-900 border-slate-300 shadow-slate-400/20';
      case 'bronze':
      default:
        return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700/60';
    }
  };

  const badgeClass = getBadgeColors(currentProfile.trustBadge);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowDetail(!showDetail);
        }}
        className={`inline-flex items-center gap-1 font-bold rounded-xl border shadow-xs transition-all active:scale-95 cursor-pointer ${badgeClass} ${
          size === 'sm'
            ? 'px-2 py-0.5 text-[10px]'
            : size === 'lg'
            ? 'px-3.5 py-1.5 text-xs'
            : 'px-2.5 py-1 text-[11px]'
        }`}
        title={getLangText('විශ්වාසනීයත්ව ලාංඡනය විස්තර බලන්න', 'View trust badge details', 'நம்பகத்தன்மை பேட்ஜ் விவரங்களை பார்க்க')}
      >
        <span>{currentProfile.badgeIcon || '🥉'}</span>
        <span className="font-extrabold">{badgeTitle}</span>
        {shouldShowPoints && (
          <span className="opacity-90 font-mono text-[9px] bg-black/15 px-1.5 py-0.2 rounded-md">
            {currentProfile.karmaPoints ?? 0} {getLangText('ලකුණු', 'pts', 'புள்ளிகள்')}
          </span>
        )}
      </button>

      {/* Trust Details Popover */}
      {showDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowDetail(false)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-[#071911] border-2 border-emerald-500/70 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100 dark:border-emerald-900/60">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{currentProfile.badgeIcon || '🥉'}</span>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {getLangText('ප්‍රජා සහයෝගිතා ලකුණු', 'Community Karma & Trust', 'சமூக ஒத்துழைப்பு புள்ளிகள்')}
                  </h4>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    {userName} {getLangText('ගේ විශ්වාසනීයත්ව සහ සහයෝගිතා තත්ත්වය', "'s Trust & Karma Status", 'இன் நம்பகத்தன்மை நிலை')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetail(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-emerald-950 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Score Metric Card */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-[#082217] dark:to-[#092b1e] rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {getLangText('මුළු සහයෝගිතා ලකුණු', 'Total Karma Points', 'மொத்த ஒத்துழைப்பு புள்ளிகள்')}
                </span>
                <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                  {currentProfile.karmaPoints ?? 0} <span className="text-xs font-sans text-slate-500">{getLangText('ලකුණු', 'points', 'புள்ளிகள்')}</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-xl text-xs font-black border ${badgeClass}`}>
                {badgeTitle}
              </span>
            </div>

            {/* Verified Credentials Checklist */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#06180f] border border-slate-200 dark:border-white/5">
                <span className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{getLangText('තහවුරු කළ දුරකථන අංකය', 'Verified Phone Number', 'உறுதிப்படுத்தப்பட்ட தொலைபேசி எண்')}</span>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {currentProfile.verifiedPhone ? getLangText('✅ සනාථයි', '✅ Verified', '✅ உறுதிப்படுத்தப்பட்டது') : getLangText('❌ නැත', '❌ Not verified', '❌ இல்லை')}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#06180f] border border-slate-200 dark:border-white/5">
                <span className="flex items-center gap-2 font-medium">
                  <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{getLangText('ජාතික හැඳුනුම්පත් (NIC) සත්‍යාපනය', 'National ID (NIC) Verified', 'தேசிய அடையாள அட்டை (NIC) சரிபார்ப்பு')}</span>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {currentProfile.verifiedNic ? getLangText('✅ සනාථයි', '✅ Verified', '✅ உறுதிப்படுத்தப்பட்டது') : getLangText('❌ නැත', '❌ Not verified', '❌ இல்லை')}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#06180f] border border-slate-200 dark:border-white/5">
                <span className="flex items-center gap-2 font-medium">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>{getLangText('සාර්ථකව සම්පූර්ණ කළ උදව්', 'Completed Helps', 'வெற்றிகரமாக முடித்த உதவிகள்')}</span>
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {currentProfile.completedHelpsCount ?? 0} {getLangText('වාරයක්', 'times', 'முறை')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDetail(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all"
            >
              {getLangText('තේරුම් ගතිමි (OK)', 'Understood (OK)', 'புரிந்து கொண்டது (சரி)')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Award, 
  Star, 
  CheckCircle, 
  Info, 
  X, 
  Store, 
  HeartHandshake, 
  Wrench, 
  AlertTriangle, 
  Ban, 
  Sparkles,
  TrendingUp,
  Shield
} from 'lucide-react';
import { UserTrustProfile, TrustBadgeType, Language } from '../types';

interface TrustBadgeProps {
  trustProfile?: UserTrustProfile;
  profile?: UserTrustProfile;
  userName?: string;
  size?: 'sm' | 'md' | 'lg';
  showPoints?: boolean;
  showKarmaPoints?: boolean;
  showAllBadges?: boolean;
  lang?: Language;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  trustProfile,
  profile,
  userName = 'පරිශීලක',
  size = 'md',
  showPoints,
  showKarmaPoints,
  showAllBadges = false,
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
    karmaPoints: 100,
    trustPoints: 100,
    trustBadge: 'bronze',
    activeBadges: ['bronze'],
    badgeTitleSi: 'නව සාමාජික',
    badgeIcon: '🥉',
    verifiedPhone: false,
    verifiedNic: false,
    trustLevel: 'good',
  };

  const points = currentProfile.trustPoints ?? currentProfile.karmaPoints ?? 100;

  const getBadgeMeta = (badge?: TrustBadgeType) => {
    switch (badge) {
      case 'verified_seller':
        return {
          title: getLangText('තහවුරු කළ වෙළෙන්දා', 'Verified Seller', 'சரிபார்க்கப்பட்ட விற்பனையாளர்'),
          icon: <Store className="w-3.5 h-3.5 text-emerald-400" />,
          color: 'bg-emerald-800 text-emerald-100 border-emerald-500/70 shadow-emerald-900/30',
          emoji: '🏪',
          desc: getLangText('ප්‍රජා මිල හා විශ්වාසනීය වෙළඳ ගනුදෙනු තහවුරු කළ වෙළෙන්දා', 'Verified for honest pricing & trusted trade', 'நேர்மையான வணிகத்திற்கு சரிபார்க்கப்பட்டது'),
        };
      case 'verified_volunteer':
        return {
          title: getLangText('තහවුරු කළ ස්වේච්ඡා සේවක', 'Verified Volunteer', 'சரிபார்க்கப்பட்ட தொண்டர்'),
          icon: <HeartHandshake className="w-3.5 h-3.5 text-blue-400" />,
          color: 'bg-blue-800 text-blue-100 border-blue-500/70 shadow-blue-900/30',
          emoji: '🤝',
          desc: getLangText('ලේ පරිත්‍යාග සහ ප්‍රජා ආපදා මෙහෙයුම් සඳහා සහතික කළ ස්වේච්ඡා සාමාජික', 'Certified volunteer for blood donations & disaster relief', 'இரத்த தானம் மற்றும் பேரிடர் உதவி தொண்டர்'),
        };
      case 'verified_professional':
        return {
          title: getLangText('තහවුරු කළ වෘත්තිකයා', 'Verified Artisan / Pro', 'சரிபார்க்கப்பட்ட தொழில்முனைவோர்'),
          icon: <Wrench className="w-3.5 h-3.5 text-amber-400" />,
          color: 'bg-amber-800 text-amber-100 border-amber-500/70 shadow-amber-900/30',
          emoji: '🛠️',
          desc: getLangText('සුදුසුකම් හා පළපුරුද්ද තහවුරු කරන ලද ශිල්පී / කාර්මික සාමාජික', 'Verified skills and technical background', 'சரிபார்க்கப்பட்ட திறன்கள்'),
        };
      case 'community_hero':
        return {
          title: getLangText('ප්‍රජා වීරයා', 'Community Hero', 'சமூக நாயகன்'),
          icon: <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />,
          color: 'bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white border-amber-300 shadow-amber-500/30',
          emoji: '🌟',
          desc: getLangText('නිරන්තරයෙන් ආධාර හා සහය ලබාදෙන ප්‍රජා නායකයෙක්', 'Outstanding community contributor & leader', 'முன்மாதிரி சமூக சேவையாளர்'),
        };
      case 'gold':
        return {
          title: getLangText('රන් සහායක (Gold)', 'Gold Member', 'தங்க உறுப்பினர்'),
          icon: <Award className="w-3.5 h-3.5 text-amber-300" />,
          color: 'bg-gradient-to-r from-amber-500 to-amber-700 text-white border-amber-300 shadow-amber-500/20',
          emoji: '🥇',
          desc: getLangText('ඉහළ විශ්වාසනීයත්ව ලකුණු හිමි සාමාජිකයෙක්', 'High trust score and positive track record', 'உயர் நம்பகத்தன்மை கொண்ட உறுப்பினர்'),
        };
      case 'silver':
        return {
          title: getLangText('රිදී සහායක (Silver)', 'Silver Member', 'வெள்ளி உறுப்பினர்'),
          icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-200" />,
          color: 'bg-gradient-to-r from-slate-600 to-slate-700 text-white border-slate-300 shadow-slate-400/20',
          emoji: '🥈',
          desc: getLangText('සාර්ථක සහය ලබාදුන් විශ්වාසවන්ත සාමාජිකයෙක්', 'Active and helpful community member', 'செயலில் உள்ள உறுப்பினர்'),
        };
      case 'warning':
        return {
          title: getLangText('අවදානම් මට්ටම', 'Low Trust Warning', 'குறைந்த நம்பகத்தன்மை எச்சரிக்கை'),
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-300 animate-bounce" />,
          color: 'bg-amber-600 text-white border-amber-400 shadow-amber-600/30',
          emoji: '⚠️',
          desc: getLangText('ලකුණු අඩුවී ඇත - වංචනික චෝදනා සම්බන්ධයෙන් පරීක්ෂාවට ලක්වෙමින් පවතී', 'Trust score is critically low. Under review.', 'புள்ளிகள் மிகக் குறைவாக உள்ளன'),
        };
      case 'blocked':
        return {
          title: getLangText('අත්හිටවූ ගිණුම (Blocked)', 'Account Blocked', 'கணக்கு முடக்கப்பட்டது'),
          icon: <Ban className="w-3.5 h-3.5 text-red-200" />,
          color: 'bg-red-700 text-white border-red-500 shadow-red-700/40',
          emoji: '🚫',
          desc: getLangText('ලකුණු 0 වීම හෝ වංචා ක්‍රියා හේතුවෙන් ගිණුම අත්හිටුවා ඇත', 'Blocked due to 0 trust points or fraud strikes', 'மோசடி காரணமாக முடக்கப்பட்டது'),
        };
      case 'bronze':
      default:
        return {
          title: getLangText('තහවුරු කළ සාමාජික', 'Verified Member', 'சரிபார்க்கப்பட்ட உறுப்பினர்'),
          icon: <Shield className="w-3.5 h-3.5 text-emerald-400" />,
          color: 'bg-emerald-900/90 text-emerald-100 border-emerald-500/50',
          emoji: '🛡️',
          desc: getLangText('දුරකථන අංකය සහ අනන්‍යතාවය තහවුරු කළ සාමාජිකයෙක්', 'Identity and phone verified member', 'அடையாளம் சரிபார்க்கப்பட்டது'),
        };
    }
  };

  const primaryMeta = getBadgeMeta(currentProfile.trustBadge);
  const shouldShowPoints = showPoints !== undefined ? showPoints : (showKarmaPoints ?? true);

  // Trust score bar percentage
  const scorePercent = Math.min(100, Math.max(5, (points / 300) * 100));

  return (
    <div className="relative inline-flex items-center gap-1.5 flex-wrap">
      {/* Primary Badge Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowDetail(!showDetail);
        }}
        className={`inline-flex items-center gap-1.5 font-black rounded-xl border shadow-xs transition-all active:scale-95 cursor-pointer ${primaryMeta.color} ${
          size === 'sm'
            ? 'px-2 py-0.5 text-[10px]'
            : size === 'lg'
            ? 'px-3.5 py-1.5 text-xs'
            : 'px-2.5 py-1 text-[11px]'
        }`}
        title={getLangText('විශ්වාසනීයත්ව ලකුණු සහ ලාංඡන විස්තර බලන්න', 'View trust score & badge details', 'நம்பகத்தன்மை விவரங்கள்')}
      >
        <span>{primaryMeta.emoji}</span>
        <span className="font-extrabold">{primaryMeta.title}</span>

        {shouldShowPoints && (
          <span className={`font-mono text-[9px] px-1.5 py-0.2 rounded-md font-black ${
            points <= 0 
              ? 'bg-red-950 text-red-200'
              : points <= 30
              ? 'bg-amber-950 text-amber-200 animate-pulse'
              : 'bg-black/25 text-white'
          }`}>
            {points} {getLangText('ලකුණු', 'pts', 'புள்ளிகள்')}
          </span>
        )}
      </button>

      {/* Additional Custom Badges (e.g. Verified Seller, Volunteer) */}
      {showAllBadges && (currentProfile.activeBadges || [])
        .filter(b => b !== currentProfile.trustBadge && (b === 'verified_seller' || b === 'verified_volunteer' || b === 'verified_professional'))
        .map((badgeKey) => {
          const meta = getBadgeMeta(badgeKey);
          return (
            <button
              key={badgeKey}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetail(true);
              }}
              className={`inline-flex items-center gap-1 font-bold rounded-xl border shadow-xs transition-all active:scale-95 cursor-pointer ${meta.color} ${
                size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
              }`}
            >
              <span>{meta.emoji}</span>
              <span>{meta.title}</span>
            </button>
          );
        })
      }

      {/* Trust Score Interactive Popover Modal */}
      {showDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowDetail(false)}
        >
          <div 
            className="bg-white dark:bg-[#071a12] border-2 border-emerald-500/50 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 text-left relative text-slate-800 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowDetail(false)}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with User Info */}
            <div className="flex items-center gap-3 pr-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl shrink-0">
                {primaryMeta.emoji}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                  {userName}
                </h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  {primaryMeta.title}
                </p>
              </div>
            </div>

            {/* Points & Progress Meter */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0c2419] border border-emerald-200/60 dark:border-emerald-800/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  {getLangText('විශ්වාසනීයත්ව ලකුණු (Trust Score)', 'Trust Points Balance', 'நம்பகத்தன்மை புள்ளிகள்')}
                </span>
                <span className={`font-mono text-sm px-2 py-0.5 rounded-lg ${
                  points <= 0 
                    ? 'bg-red-600 text-white font-bold'
                    : points <= 30
                    ? 'bg-amber-600 text-white font-bold animate-pulse'
                    : 'bg-emerald-600 text-white font-bold'
                }`}>
                  {points} / 300+
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    points <= 0 
                      ? 'bg-red-600 w-full'
                      : points <= 30
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500'
                  }`}
                  style={{ width: `${scorePercent}%` }}
                />
              </div>

              {/* Points Warning Note */}
              {points <= 30 && points > 0 && (
                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-500/10 p-2 rounded-xl">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {getLangText(
                    'අවවාදයයි: ලකුණු 0 වූ විට ගිණුම ස්වයංක්‍රීයව අත්හිටුවනු (Auto-Block) ලැබේ!',
                    'Warning: Account will be auto-blocked if score hits 0!',
                    'எச்சரிக்கை: 0 புள்ளிகளில் கணக்கு முடக்கப்படும்!'
                  )}
                </p>
              )}
            </div>

            {/* Badges List */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-500 dark:text-slate-400 block">
                {getLangText('හිමි ලාංඡන සහ තත්ත්වය:', 'Granted Badges & Roles:', 'வழங்கப்பட்ட பேட்ஜ்கள்:')}
              </span>
              <div className="space-y-1.5">
                {(currentProfile.activeBadges && currentProfile.activeBadges.length > 0 ? currentProfile.activeBadges : [currentProfile.trustBadge]).map((badgeKey) => {
                  const m = getBadgeMeta(badgeKey);
                  return (
                    <div key={badgeKey} className="flex items-start gap-2.5 p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
                      <span className="text-base shrink-0 mt-0.5">{m.emoji}</span>
                      <div>
                        <div className="font-extrabold text-slate-900 dark:text-emerald-300 leading-tight">
                          {m.title}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug mt-0.5">
                          {m.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Community Safety Guarantee Policy */}
            <div className="text-[11px] bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-2.5 rounded-2xl space-y-1 text-blue-900 dark:text-blue-300">
              <div className="font-extrabold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span>{getLangText('ප්‍රජා විශ්වාසය සහ වංචා මර්දන නීතිය', 'Community Trust & Anti-Fraud Rules', 'மோசடி எதிர்ப்பு விதிகள்')}</span>
              </div>
              <p className="text-[10px] leading-relaxed text-blue-800/90 dark:text-blue-300/90">
                {getLangText(
                  'සාර්ථක සහය හා ස්වේච්ඡා මෙහෙයුම් වලදී ලකුණු වැඩිවේ (+25 to +50). බොරු, ව්‍යාජ දැන්වීම් හෝ හොරවැඩ වලදී ලකුණු කැපේ (-20 to -100). ලකුණු 0 වූ පසු ගිණුම ස්වයංක්‍රීයව අත්හිටුවනු ලැබේ.',
                  'Score increases on verified helps (+25 to +50). Misconduct, lies & fraud result in score deductions (-20 to -100) and auto-blocking at 0 points.',
                  'உதவிகளுக்கு புள்ளிகள் கூடும். பொய் மற்றும் மோசடிகளுக்கு புள்ளிகள் குறைக்கப்பட்டு கணக்கு முடக்கப்படும்.'
                )}
              </p>
            </div>

            {/* Action button */}
            <button
              type="button"
              onClick={() => setShowDetail(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md cursor-pointer transition-transform active:scale-95"
            >
              {getLangText('තේරුම් ගත්තා (Close)', 'Understood (Close)', 'புரிந்தது')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

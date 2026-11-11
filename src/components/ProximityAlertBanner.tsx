import React, { useState } from 'react';
import { Radio, X, ArrowRight } from 'lucide-react';
import { HelpPost, BloodDonationRequest, ProximityNotificationConfig, LocationOption } from '../types';

interface ProximityAlertBannerProps {
  nearbyUrgentPosts?: HelpPost[];
  nearbyBloodRequests?: BloodDonationRequest[];
  posts?: HelpPost[];
  userLocation?: LocationOption;
  userDistanceKm?: number;
  onOpenHelpPost?: (post: HelpPost) => void;
  onViewPost?: (post: any) => void;
  onOpenBloodHub?: () => void;
  config?: ProximityNotificationConfig;
  onUpdateConfig?: (config: ProximityNotificationConfig) => void;
  className?: string;
}

export const ProximityAlertBanner: React.FC<ProximityAlertBannerProps> = ({
  nearbyUrgentPosts: propNearbyUrgentPosts,
  nearbyBloodRequests = [],
  posts,
  userLocation,
  userDistanceKm,
  onOpenHelpPost: propOnOpenHelpPost,
  onViewPost,
  onOpenBloodHub,
  config = {
    enabled: true,
    radiusKm: 10,
    notifyOnUrgentHelp: true,
    notifyOnBloodRequests: true,
    notifyOnDisasterRelief: true,
    soundEnabled: true,
  },
  onUpdateConfig,
  className,
}) => {
  const nearbyUrgentPosts = propNearbyUrgentPosts || (posts ? posts.filter(p => p && (p.distanceKm <= config.radiusKm || (p.priorityLevel === 'emergency' || p.priorityLevel === 'high'))) : []);
  const onOpenHelpPost = propOnOpenHelpPost || onViewPost;
  const [dismissed, setDismissed] = useState(false);

  // Filter urgent nearby alerts
  const urgentHelps = nearbyUrgentPosts.filter((p) => p.distanceKm <= config.radiusKm && !p.isCompleted);
  const urgentBloods = nearbyBloodRequests.filter((b) => b.status === 'active' && b.urgency === 'urgent');
  const totalAlerts = urgentHelps.length + urgentBloods.length;

  if (dismissed || !config.enabled || totalAlerts === 0) {
    return null;
  }

  const isBlood = Boolean(urgentBloods[0]);
  const firstAlert = urgentBloods[0] || urgentHelps[0];

  // Helper to accurately resolve the category display name, icon and button styling
  const getAlertCategoryDetails = (alert: any) => {
    if (!alert) {
      return {
        name: 'දැන්වීම්',
        icon: '📢',
        btnText: 'විස්තර බලන්න',
        gradient: 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 border-slate-600/50 text-white',
        badgeBg: 'bg-white/20 text-white',
        btnBg: 'bg-white text-slate-900 hover:bg-slate-100',
      };
    }

    if (isBlood) {
      return {
        name: 'ලේ අවශ්‍යතා',
        icon: '🩸',
        btnText: 'විස්තර බලන්න',
        gradient: 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 border-red-400/60 text-white',
        badgeBg: 'bg-white/20 text-white',
        btnBg: 'bg-white text-red-700 hover:bg-red-50',
      };
    }

    // 1. Quick Services (ඉක්මන් සේවා)
    const isQuick = Boolean(
      alert.postType === 'quick_service' ||
      alert.category === 'quick_services' ||
      alert.category === 'quick' ||
      alert.serviceType === 'quick_services' ||
      alert.tagCategory === 'ඉක්මන් සේවා' ||
      alert.tagCategory?.includes('ඉක්මන්') ||
      alert.tagName?.includes('ඉක්මන්')
    );
    if (isQuick) {
      return {
        name: 'ඉක්මන් සේවා',
        icon: '⚡',
        btnText: 'විස්තර බලන්න',
        gradient: 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 border-amber-300/80 text-white shadow-amber-900/20',
        badgeBg: 'bg-black/20 text-amber-100',
        btnBg: 'bg-white text-amber-800 hover:bg-amber-50',
      };
    }

    // 2. Real Emergency (හදිසි ඇඟවීම් / රතු එළිය)
    const isEmergency = Boolean(
      alert.priorityLevel === 'emergency' ||
      alert.category === 'emergency' ||
      alert.category === 'red_alert'
    );
    if (isEmergency) {
      return {
        name: 'හදිසි ඇඟවීම්',
        icon: '🚨',
        btnText: 'උදව් කරන්න',
        gradient: 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 border-rose-400/60 text-white shadow-rose-900/20',
        badgeBg: 'bg-white/20 text-white',
        btnBg: 'bg-white text-rose-700 hover:bg-rose-50',
      };
    }

    // 3. Accommodation (නවාතැන්)
    if (alert.category === 'shelter' || alert.category === 'accommodation' || alert.tagCategory?.includes('නවාතැන්') || alert.tagName?.includes('නවාතැන්')) {
      return {
        name: 'නවාතැන්',
        icon: '🏠',
        btnText: 'විස්තර බලන්න',
        gradient: 'bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 border-emerald-400/60 text-white shadow-emerald-900/20',
        badgeBg: 'bg-white/20 text-white',
        btnBg: 'bg-white text-emerald-800 hover:bg-emerald-50',
      };
    }

    // 4. Jobs (රැකියා)
    if (alert.category === 'job' || alert.category === 'jobs' || alert.tagCategory?.includes('රැකියා') || alert.tagName?.includes('රැකියා')) {
      return {
        name: 'රැකියා',
        icon: '💼',
        btnText: 'විස්තර බලන්න',
        gradient: 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 border-blue-400/60 text-white shadow-blue-900/20',
        badgeBg: 'bg-white/20 text-white',
        btnBg: 'bg-white text-blue-800 hover:bg-blue-50',
      };
    }

    // 5. Custom Tag Name or Tag Category
    if (alert.tagName) {
      return {
        name: alert.tagName,
        icon: '📢',
        btnText: 'විස්තර බලන්න',
        gradient: 'bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-800 border-emerald-400/60 text-white',
        badgeBg: 'bg-white/20 text-white',
        btnBg: 'bg-white text-emerald-800 hover:bg-emerald-50',
      };
    }
    if (alert.tagCategory) {
      return {
        name: alert.tagCategory,
        icon: '📢',
        btnText: 'විස්තර බලන්න',
        gradient: 'bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-800 border-emerald-400/60 text-white',
        badgeBg: 'bg-white/20 text-white',
        btnBg: 'bg-white text-emerald-800 hover:bg-emerald-50',
      };
    }

    // Default
    return {
      name: alert.category || 'සේවා දැන්වීම්',
      icon: '📢',
      btnText: 'විස්තර බලන්න',
      gradient: 'bg-gradient-to-r from-slate-800 via-teal-900 to-slate-900 border-teal-500/50 text-white',
      badgeBg: 'bg-white/20 text-white',
      btnBg: 'bg-white text-slate-900 hover:bg-slate-100',
    };
  };

  const catDetails = getAlertCategoryDetails(firstAlert);

  return (
    <div className={`w-full ${catDetails.gradient} px-4 py-2.5 shadow-lg border-2 relative z-20 animate-fadeIn ${className ? className : 'rounded-2xl'}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center shrink-0">
            <span className="w-4 h-4 rounded-full bg-white/40 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-white relative" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className={`${catDetails.badgeBg} px-2.5 py-0.5 rounded-full font-black text-[10px] tracking-wide flex items-center gap-1 shrink-0`}>
              <Radio className="w-3 h-3 animate-pulse" />
              <span>කි.මී. {config.radiusKm} තුළ {catDetails.name} ({totalAlerts})</span>
            </span>
            <p className="font-bold truncate text-[11px] sm:text-xs">
              {isBlood ? (
                <>
                  🩸 <strong className="underline">{(firstAlert as BloodDonationRequest).bloodGroup}</strong> ලේ අවශ්‍යතාවක් - {(firstAlert as BloodDonationRequest).hospitalName}
                </>
              ) : (
                <>
                  <span className="mr-1">{catDetails.icon}</span>
                  <strong>{(firstAlert as any).locationName}</strong>: {((firstAlert as any).title || (firstAlert as any).whatHappened || (firstAlert as any).whatIsNeeded || '').slice(0, 45)}...
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isBlood ? (
            <button
              type="button"
              onClick={onOpenBloodHub}
              className={`px-3 py-1 ${catDetails.btnBg} font-black rounded-lg text-xs flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer`}
            >
              <span>{catDetails.btnText}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenHelpPost && onOpenHelpPost(firstAlert as any)}
              className={`px-3 py-1 ${catDetails.btnBg} font-black rounded-lg text-xs flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer`}
            >
              <span>{catDetails.btnText}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="w-6 h-6 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center font-bold transition-all cursor-pointer"
            title="මඟහරින්න"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

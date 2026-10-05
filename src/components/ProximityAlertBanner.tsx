import React, { useState, useEffect } from 'react';
import { Radio, AlertCircle, X, Droplet, Bell, Volume2, VolumeX, ShieldAlert, ArrowRight } from 'lucide-react';
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
}) => {
  const nearbyUrgentPosts = propNearbyUrgentPosts || (posts ? posts.filter(p => p && (p.distanceKm <= config.radiusKm || (p.priorityLevel === 'emergency' || p.priorityLevel === 'high'))) : []);
  const onOpenHelpPost = propOnOpenHelpPost || onViewPost;
  const [dismissed, setDismissed] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Filter urgent nearby alerts
  const urgentHelps = nearbyUrgentPosts.filter((p) => p.distanceKm <= config.radiusKm && !p.isCompleted);
  const urgentBloods = nearbyBloodRequests.filter((b) => b.status === 'active' && b.urgency === 'urgent');

  const totalAlerts = urgentHelps.length + urgentBloods.length;

  if (dismissed || !config.enabled || totalAlerts === 0) {
    return null;
  }

  const firstAlert = urgentBloods[0] || urgentHelps[0];
  const isBlood = Boolean(urgentBloods[0]);

  return (
    <div className="w-full bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700 text-white px-4 py-2.5 shadow-lg border-b-2 border-rose-400/60 relative z-30 animate-fadeIn">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center shrink-0">
            <span className="w-4 h-4 rounded-full bg-white/40 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-white relative" />
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="bg-white/20 px-2 py-0.5 rounded-full font-black text-[10px] tracking-wide flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>කි.මී. {config.radiusKm} තුළ හදිසි ඇඟවීම් ({totalAlerts})</span>
            </span>

            <p className="font-bold truncate text-[11px] sm:text-xs">
              {isBlood ? (
                <>
                  🩸 <strong className="underline">{(firstAlert as BloodDonationRequest).bloodGroup}</strong> ලේ අවශ්‍යතාවක් - {(firstAlert as BloodDonationRequest).hospitalName}
                </>
              ) : (
                <>
                  🚨 <strong>{(firstAlert as HelpPost).locationName}</strong>: {(firstAlert as HelpPost).whatHappened.slice(0, 45)}...
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
              className="px-3 py-1 bg-white text-rose-700 hover:bg-rose-50 font-black rounded-lg text-xs flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
            >
              <span>විස්තර බලන්න</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenHelpPost && onOpenHelpPost(firstAlert as HelpPost)}
              className="px-3 py-1 bg-white text-rose-700 hover:bg-rose-50 font-black rounded-lg text-xs flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
            >
              <span>උදව් කරන්න</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="w-6 h-6 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center font-bold"
            title="මඟහරින්න"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

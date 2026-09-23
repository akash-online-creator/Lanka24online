import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Droplet, 
  Zap, 
  Search, 
  Store, 
  Users, 
  Gift, 
  ArrowRight,
  MapPin,
  Clock
} from 'lucide-react';
import { AppNotification, markNotificationAsRead } from '../utils/notificationManager';
import { formatRelativeTime } from '../utils/dateUtils';

interface LiveNotificationToastProps {
  onOpenNotification: (notif: AppNotification) => void;
}

export const LiveNotificationToast: React.FC<LiveNotificationToastProps> = ({ onOpenNotification }) => {
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  useEffect(() => {
    const handleNewNotif = (e: Event) => {
      const customEvent = e as CustomEvent<AppNotification>;
      if (customEvent.detail) {
        setActiveToast(customEvent.detail);
      }
    };

    window.addEventListener('sahaya_new_notification', handleNewNotif);
    return () => window.removeEventListener('sahaya_new_notification', handleNewNotif);
  }, []);

  // Auto-dismiss toast after 7 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  if (!activeToast) return null;

  const getIcon = () => {
    switch (activeToast.type) {
      case 'emergency_blood':
        return <Droplet className="w-5 h-5 text-white fill-white animate-bounce" />;
      case 'quick_service':
        return <Zap className="w-5 h-5 text-white fill-current animate-pulse" />;
      case 'find_for_me':
        return <Search className="w-5 h-5 text-white" />;
      case 'marketplace_price':
        return <Store className="w-5 h-5 text-white" />;
      case 'group_work':
        return <Users className="w-5 h-5 text-white" />;
      case 'from_me_to_you':
        return <Gift className="w-5 h-5 text-white" />;
      default:
        return <Bell className="w-5 h-5 text-white" />;
    }
  };

  const getThemeClasses = () => {
    switch (activeToast.type) {
      case 'emergency_blood':
        return {
          cardBg: 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border-red-400/80 shadow-red-500/30',
          iconBg: 'bg-white/20 text-white',
          btnBg: 'bg-white text-red-700 hover:bg-rose-50',
          badgeBg: 'bg-white text-red-800',
        };
      case 'quick_service':
        return {
          cardBg: 'bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-white border-amber-300 shadow-amber-500/30',
          iconBg: 'bg-white/20 text-white',
          btnBg: 'bg-white text-amber-800 hover:bg-amber-50',
          badgeBg: 'bg-white text-amber-900',
        };
      case 'marketplace_price':
        return {
          cardBg: 'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 text-white border-rose-300 shadow-rose-500/30',
          iconBg: 'bg-white/20 text-white',
          btnBg: 'bg-white text-rose-800 hover:bg-rose-50',
          badgeBg: 'bg-white text-rose-900',
        };
      case 'find_for_me':
        return {
          cardBg: 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white border-cyan-300 shadow-cyan-500/30',
          iconBg: 'bg-white/20 text-white',
          btnBg: 'bg-white text-cyan-800 hover:bg-cyan-50',
          badgeBg: 'bg-white text-cyan-900',
        };
      default:
        return {
          cardBg: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-[#007a4b] text-white border-emerald-300 shadow-emerald-500/30',
          iconBg: 'bg-white/20 text-white',
          btnBg: 'bg-white text-emerald-800 hover:bg-emerald-50',
          badgeBg: 'bg-white text-emerald-900',
        };
    }
  };

  const themeStyle = getThemeClasses();

  return (
    <div className="fixed top-4 left-3 right-3 sm:left-auto sm:right-5 z-50 max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
      <div className={`p-3.5 rounded-2xl sm:rounded-3xl border-2 shadow-xl backdrop-blur-xl ${themeStyle.cardBg} flex items-start justify-between gap-3 relative overflow-hidden group`}>
        {/* Glow backdrop indicator */}
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-white/15 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Icon Box */}
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${themeStyle.iconBg}`}>
            {getIcon()}
          </div>

          {/* Text Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`px-1.5 py-0.2 rounded-md font-mono text-[9px] font-black uppercase shadow-xs ${themeStyle.badgeBg}`}>
                {activeToast.badgeText || 'NEW ALERT'}
              </span>
              <h4 className="text-xs sm:text-sm font-black truncate leading-tight">
                {activeToast.title}
              </h4>
            </div>

            <p className="text-[11px] sm:text-xs text-white/95 font-medium leading-snug mt-1 line-clamp-2">
              {activeToast.message}
            </p>

            {activeToast.locationName && (
              <div className="flex items-center gap-1 text-[10px] text-white/80 font-bold mt-1.5">
                <MapPin className="w-3 h-3 text-white/90 shrink-0" />
                <span className="truncate">{activeToast.locationName}</span>
                <span className="mx-1">•</span>
                <Clock className="w-3 h-3 text-white/90 shrink-0" />
                <span>{formatRelativeTime(activeToast.timestamp)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveToast(null);
            }}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
            title="වසන්න (Close)"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeToast && activeToast.id) {
                markNotificationAsRead(activeToast.id);
                onOpenNotification(activeToast);
              }
              setActiveToast(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${themeStyle.btnBg}`}
          >
            <span>බලන්න</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

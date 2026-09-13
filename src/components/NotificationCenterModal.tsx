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
  CheckCheck, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Radio, 
  MapPin, 
  Clock, 
  ExternalLink,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { 
  AppNotification, 
  getStoredNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  clearAllNotifications, 
  requestNotificationPermission, 
  playNotificationSound,
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  broadcastAppNotification
} from '../utils/notificationManager';
import { formatRelativeTime } from '../utils/dateUtils';
import { Language } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onSelectNotification: (notif: AppNotification) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  language,
  onSelectNotification,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'emergency_blood' | 'quick_service' | 'marketplace_price' | 'find_for_me'>('all');
  const [pushStatus, setPushStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Load notifications and listeners
  const loadNotifs = () => {
    setNotifications(getStoredNotifications());
  };

  useEffect(() => {
    if (!isOpen) return;

    loadNotifs();
    setSoundEnabled(isNotificationSoundEnabled());

    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    } else {
      setPushStatus('unsupported');
    }

    const handleUpdate = () => {
      loadNotifs();
    };

    window.addEventListener('sahaya_notifications_updated', handleUpdate);
    window.addEventListener('sahaya_new_notification', handleUpdate);
    return () => {
      window.removeEventListener('sahaya_notifications_updated', handleUpdate);
      window.removeEventListener('sahaya_new_notification', handleUpdate);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    setNotificationSoundEnabled(nextVal);
    if (nextVal) {
      playNotificationSound('quick_service');
    }
  };

  const handleEnablePush = async () => {
    const granted = await requestNotificationPermission();
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
    if (granted) {
      // Send a test broadcast
      broadcastAppNotification({
        type: 'general',
        title: '🔔 Push දැනුම්දීම් සක්‍රීය විය!',
        message: 'සහය සේවා නවතම හදිසි ඇඟවීම් සහ ඉල්ලීම් දැන් ඔබගේ Device එකටම ලැබේ.',
        badgeText: 'ENABLED',
      });
    }
  };

  const filteredNotifs = notifications.filter((notif) => {
    if (activeFilter === 'all') return true;
    return notif.type === activeFilter;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getLang = (si: string, en: string, ta: string) => {
    if (language === 'si') return si;
    if (language === 'ta') return ta;
    return en;
  };

  const renderTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency_blood':
        return <Droplet className="w-4 h-4 text-red-600 dark:text-red-400 fill-current" />;
      case 'quick_service':
        return <Zap className="w-4 h-4 text-amber-500 fill-current" />;
      case 'find_for_me':
        return <Search className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
      case 'marketplace_price':
        return <Store className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'group_work':
        return <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case 'from_me_to_you':
        return <Gift className="w-4 h-4 text-pink-600 dark:text-pink-400" />;
      default:
        return <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-[#071910] border border-slate-200 dark:border-[#19402a] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#153824] bg-slate-50/80 dark:bg-[#0b2417]/80 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {getLang('සජීවී දැනුම්දීම් කේන්ද්‍රය', 'Live Notification Center', 'நேரடி அறிவிப்புகள்')}
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-black bg-rose-500 text-white shadow-xs animate-pulse">
                    {unreadCount} {getLang('නව', 'NEW', 'புதிய')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                {getLang('ඉක්මන් සේවා, ලේ ඉල්ලීම් හා මිල ගණන් ඇඟවීම්', 'Real-time alerts for Quick Services, Blood & Prices', 'அவசர தேவைகள் மற்றும் விலை விழிப்பூட்டல்கள்')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 dark:bg-[#143322] dark:hover:bg-[#1d4730] flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Settings Bar (Push & Audio controls) */}
        <div className="px-4 py-2.5 bg-emerald-500/5 dark:bg-emerald-500/10 border-b border-slate-200/80 dark:border-[#153824] flex items-center justify-between gap-2 flex-wrap">
          {/* Push Status / Enable */}
          <div className="flex items-center gap-2 min-w-0">
            {pushStatus === 'granted' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>{getLang('Web Push සක්‍රීයයි', 'Web Push Active', 'Web Push இயக்கத்தில்')}</span>
              </span>
            ) : pushStatus === 'unsupported' ? (
              <span className="text-[11px] font-semibold text-slate-500">
                {getLang('In-App ඇඟවීම් ක්‍රියාත්මකයි', 'In-App Alerts Active', 'செயலிக்குள் விழிப்பூட்டல்')}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleEnablePush}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-[#007a4b] hover:from-emerald-700 hover:to-[#00603b] text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{getLang('🔔 Push Notifications සක්‍රීය කරන්න', '🔔 Enable Web Push Alerts', '🔔 விழிப்பூட்டல்களை இயக்கு')}</span>
              </button>
            )}
          </div>

          {/* Sound Mute/Unmute toggle & Clear Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                soundEnabled 
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' 
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
              }`}
              title="ශබ්ද ඇඟවීම් සක්‍රීය / අක්‍රීය කරන්න"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="text-[10px] hidden sm:inline">{soundEnabled ? 'ශබ්දය: ON' : 'ශබ්දය: OFF'}</span>
            </button>

            {notifications.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    markAllNotificationsAsRead();
                    loadNotifs();
                  }}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#122e20] dark:hover:bg-[#19402d] text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-white/10 cursor-pointer"
                  title="සියල්ල කියවූ ලෙස ලකුණු කරන්න"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10px] hidden sm:inline">{getLang('සියල්ල කියවන්න', 'Mark All Read', 'அனைத்தும் படி')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearAllNotifications();
                    loadNotifs();
                  }}
                  className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1 border border-rose-200 dark:border-rose-900/30 cursor-pointer"
                  title="සියල්ල ඉවත් කරන්න"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-[#153824] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: getLang('සියල්ල', 'All', 'அனைத்தும்'), count: notifications.length },
            { id: 'emergency_blood', label: getLang('🩸 හදිසි ලේ', '🩸 Emergency Blood', '🩸 இரத்தம்'), count: notifications.filter(n => n.type === 'emergency_blood').length },
            { id: 'quick_service', label: getLang('⚡ ඉක්මන් සේවා', '⚡ Quick Services', '⚡ அவசர சேவை'), count: notifications.filter(n => n.type === 'quick_service').length },
            { id: 'marketplace_price', label: getLang('🏷️ අඩුම මිල', '🏷️ Lowest Prices', '🏷️ குறைந்த விலை'), count: notifications.filter(n => n.type === 'marketplace_price').length },
            { id: 'find_for_me', label: getLang('🔍 සොයාදෙන්න', '🔍 Find For Me', '🔍 தேடுங்கள்'), count: notifications.filter(n => n.type === 'find_for_me').length },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
              className={`px-3 py-1 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#11271c] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#183928]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                  activeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#1b3d2b] text-slate-700 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List Body */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1 min-h-[260px]">
          {filteredNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-[#11271c] flex items-center justify-center text-slate-400">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                {getLang('දැනට මෙම කාණ්ඩයේ නව දැනුම්දීම් නොමැත.', 'No notifications in this category yet.', 'இந்த பிரிவில் அறிவிப்புகள் எதுவும் இல்லை.')}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">
                {getLang('නව සේවා ඉල්ලීමක්, ලේ අවශ්‍යතාවක් හෝ මිල ගණන් පළ වූ වහාම මෙහි පෙන්වනු ඇත.', 'New requests, blood needs, or price updates will appear here automatically in real time.', 'புதிய கோரிக்கைகள் அல்லது விலை புதுப்பிப்புகள் இங்கே தோன்றும்.')}
              </p>
            </div>
          ) : (
            filteredNotifs.map((notif) => {
              const isUrgent = notif.type === 'emergency_blood';

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    markNotificationAsRead(notif.id);
                    loadNotifs();
                    onSelectNotification(notif);
                    onClose();
                  }}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden ${
                    !notif.isRead
                      ? isUrgent
                        ? 'bg-red-500/10 dark:bg-red-950/40 border-red-400/80 shadow-xs'
                        : 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-400/70 shadow-xs'
                      : 'bg-white dark:bg-[#0c2417] border-slate-200 dark:border-[#153b26] opacity-90'
                  }`}
                >
                  {/* Left accent indicator for unread */}
                  {!notif.isRead && (
                    <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${isUrgent ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                  )}

                  <div className="flex items-start gap-3 pl-1">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                      isUrgent 
                        ? 'bg-red-100 dark:bg-red-900/60' 
                        : 'bg-slate-100 dark:bg-[#143522]'
                    }`}>
                      {renderTypeIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          {notif.badgeText && (
                            <span className={`px-1.5 py-0.2 rounded-md font-mono text-[9px] font-black uppercase ${
                              isUrgent 
                                ? 'bg-red-600 text-white' 
                                : 'bg-emerald-600 text-white'
                            }`}>
                              {notif.badgeText}
                            </span>
                          )}
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                            {notif.title}
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0">
                          {formatRelativeTime(notif.timestamp)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-1">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-white/5">
                        {notif.locationName ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[200px]">{notif.locationName}</span>
                          </div>
                        ) : <span />}

                        <div className="flex items-center gap-1 text-[11px] font-black text-[#007a4b] dark:text-[#00c880] group-hover:underline">
                          <span>{getLang('විස්තර බලන්න', 'View Details', 'விவரங்கள்')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="p-3 border-t border-slate-200 dark:border-[#153824] bg-slate-50 dark:bg-[#07160e] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-[11px]">
              {getLang('සහය සේවා Real-time Notification Engine මඟින් බලගන්වා ඇත.', 'Powered by Sahaya Sewa Real-time Notification Engine.', 'நேரடி அறிவிப்பு இயந்திரம் மூலம் இயக்கப்படுகிறது.')}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-[#143322] hover:bg-slate-300 dark:hover:bg-[#1d4730] text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            {getLang('වසන්න', 'Close', 'மூடு')}
          </button>
        </div>

      </div>
    </div>
  );
};

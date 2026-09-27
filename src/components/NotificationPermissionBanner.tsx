import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Sparkles, X, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';
import { requestNotificationPermission, getNotificationPermissionStatus, playNotificationSound } from '../utils/notificationManager';
import { Language } from '../types';

interface NotificationPermissionBannerProps {
  language?: Language;
  variant?: 'banner' | 'card';
  onPermissionGranted?: () => void;
}

export const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({
  language = 'si',
  variant = 'banner',
  onPermissionGranted,
}) => {
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('granted');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showSettingsHelp, setShowSettingsHelp] = useState(false);

  const checkStatus = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissionStatus('unsupported');
      return;
    }
    const status = getNotificationPermissionStatus();
    setPermissionStatus(status);
  };

  useEffect(() => {
    checkStatus();

    const handleVisibility = () => {
      checkStatus();
    };

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // If already granted or unsupported or dismissed for this session, don't show
  if (permissionStatus === 'granted' || permissionStatus === 'unsupported' || isDismissed) {
    return null;
  }

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        setPermissionStatus('granted');
        playNotificationSound('general');
        if (onPermissionGranted) onPermissionGranted();
      } else {
        setPermissionStatus(Notification.permission);
        if (Notification.permission === 'denied') {
          setShowSettingsHelp(true);
        }
      }
    } catch (e) {
      console.debug('Notification request error:', e);
    } finally {
      setIsRequesting(false);
    }
  };

  if (variant === 'card') {
    return (
      <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/15 border-2 border-amber-400/50 dark:border-amber-500/40 shadow-md animate-fadeIn text-left space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 animate-bounce">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-amber-300">
                {language === 'en'
                  ? 'Enable Push Notifications'
                  : language === 'ta'
                  ? 'அறிவிப்புகளை இயக்கவும்'
                  : 'දැනුම්දීම් (Notifications) සක්‍රීය කරන්න'}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                {language === 'en'
                  ? 'Get instant alerts for emergency SOS, blood requests, and urgent help even when app is closed.'
                  : language === 'ta'
                  ? 'பயன்பாடு மூடப்பட்டிருந்தாலும் அவசர SOS மற்றும் இரத்தக் கோரிக்கைகளுக்கான உடனடி அறிவிப்புகளைப் பெறுங்கள்.'
                  : 'ඇප් එක වසා තිබුණද හදිසි ආපදා (SOS), ලේ ඉල්ලීම් සහ ක්ෂණික පණිවිඩ ලැබීමට අවසර දෙන්න.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleEnableNotifications}
            disabled={isRequesting}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Bell className="w-4 h-4" />
            <span>
              {isRequesting
                ? 'සක්‍රීය කරමින්...'
                : language === 'en'
                ? 'Allow Notifications'
                : 'දැනුම්දීම් සක්‍රීය කරන්න (Allow)'}
            </span>
          </button>
        </div>

        {showSettingsHelp && (
          <div className="p-2.5 rounded-xl bg-slate-900 text-white text-[11px] space-y-1 animate-fadeIn">
            <p className="font-bold text-amber-300 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> බ්‍රවුසරයෙන් අවසර දෙන ආකාරය:
            </p>
            <p className="text-slate-300">
              ඉහළ URL අසල ඇති Lock 🔒 අයිකනය ඔබා <strong>Permissions ➡️ Notifications ➡️ Allow</strong> තෝරන්න.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-r from-amber-600 via-emerald-700 to-teal-800 text-white px-3 sm:px-4 py-2.5 border-b-2 border-amber-300/40 shadow-lg animate-fadeIn text-xs z-30">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 shadow-md animate-pulse">
            <BellRing className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-black text-amber-200 flex items-center gap-1.5 text-xs sm:text-sm">
              <span>
                {language === 'en'
                  ? '🔔 Enable PickMe-Style Background Alerts & Audio'
                  : '🔔 PickMe පන්නයේ Background Alerts සහ හඬ සක්‍රීය කරන්න'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-100 font-medium truncate">
              {language === 'en'
                ? 'Get instant ringtones and alerts for Quick Services, Red Alert SOS, and Blood Requests even when app is closed.'
                : 'ඇප් එක Minimize කළද ඉක්මන් සේවා, රතු එළිය ආපදා සහ ලේ ඉල්ලීම් සඳහා හඬ නාද (Ringtone) ලබාගැනීමට අවසර දෙන්න.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleEnableNotifications}
            disabled={isRequesting}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>
              {isRequesting
                ? 'සක්‍රීය කරමින්...'
                : language === 'en'
                ? 'Allow Notifications'
                : 'දැනුම්දීම් සක්‍රීය කරන්න (Allow)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="w-7 h-7 rounded-lg bg-black/20 hover:bg-black/40 text-white/80 flex items-center justify-center cursor-pointer transition-all shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>

      {showSettingsHelp && (
        <div className="max-w-6xl mx-auto mt-2 p-2 rounded-xl bg-black/40 text-[11px] flex items-center justify-between gap-2 border border-amber-300/30">
          <span>🔒 <strong>Settings Guide:</strong> බ්‍රවුසරයේ URL අසල ඇති Lock 🔒 අයිකනය ඔබා Notifications "Allow" කරන්න.</span>
          <button onClick={() => setShowSettingsHelp(false)} className="underline text-amber-200">හරි</button>
        </div>
      )}
    </div>
  );
};

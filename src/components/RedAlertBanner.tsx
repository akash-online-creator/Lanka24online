import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowRight, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  CheckCircle, 
  Trash2, 
  AlertTriangle 
} from 'lucide-react';
import { RedAlertItem, LocationOption } from '../types';
import { getDisasterConfig } from '../data/redAlertData';
import { calculateDistanceKm } from '../utils/geoUtils';
import { 
  updateRedAlertStatus, 
  deleteRedAlertInFirestore 
} from '../lib/firebase';
import { filterNonDeletedRedAlerts } from '../utils/deletedPostsManager';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';

// Siren ශබ්දය (Web fallback සඳහා)
import defaultSirenSound from '../assets/mixkit-manual-siren-fire-alert-1652.wav';

let globalAudioContext: AudioContext | null = null;

export const unlockAudioContext = () => {
  if (!globalAudioContext) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioContext = new AudioContextClass();
    }
  }
  if (globalAudioContext && globalAudioContext.state === 'suspended') {
    globalAudioContext.resume();
  }
};

interface UserProfile {
  id?: string;
  userId?: string;
  nic?: string;
  email?: string;
  phone?: string;
  name?: string;
}

interface RedAlertBannerProps {
  alerts: RedAlertItem[];
  currentLocation?: LocationOption;
  currentUser?: UserProfile | null;
  onOpenAlertDetail: (alert: RedAlertItem) => void;
  onOpenCreate?: () => void;
}

export const RedAlertBanner: React.FC<RedAlertBannerProps> = ({
  alerts = [],
  currentLocation,
  currentUser = null,
  onOpenAlertDetail,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayingSiren, setIsPlayingSiren] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // පරිශීලකයා මත පදනම්ව Dismiss කල Alerts LocalStorage තුළ තබා ගැනීම
  const activeUserId = currentUser?.id || currentUser?.phone || currentUser?.nic || 'guest_user';
  const storageKey = `rathuweliya_dismissed_alerts_${activeUserId}`;

  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        setDismissedAlertIds(saved ? JSON.parse(saved) : []);
      } catch {
        setDismissedAlertIds([]);
      }
    }
  }, [storageKey]);

  // 📱 Capacitor Push Notification Handling (Foreground & Background Action)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // 1. App එක Background/Closed තිබී Notification එක Click කර ඇතුළු වූ විට
    const actionListenerPromise = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        const alertData = notification.notification.data;
        const targetAlertId = alertData?.alertId || alertData?.id;

        if (targetAlertId) {
          const targetAlert = alerts.find((a) => a.id === targetAlertId);
          if (targetAlert) {
            onOpenAlertDetail(targetAlert);
          }
        }
      }
    );

    // 2. App එක Foreground එකේ පවතින විට Push Notification එකක් ලැබුණහොත්
    const receivedListenerPromise = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        const alertData = notification.data;
        const targetAlertId = alertData?.alertId || alertData?.id;
        
        if (targetAlertId) {
          const targetIndex = activeAlerts.findIndex((a) => a.id === targetAlertId);
          if (targetIndex !== -1) {
            setCurrentIndex(targetIndex);
          }
        }
      }
    );

    return () => {
      actionListenerPromise.then((handle) => handle.remove());
      receivedListenerPromise.then((handle) => handle.remove());
    };
  }, [alerts, onOpenAlertDetail]);

  // 🗺️ කිලෝමීටර් 5 සීමාව සහ Active Alerts පමණක් Filtering කිරීම
  const activeAlerts = useMemo(() => {
    const uniqueMap = new Map<string, RedAlertItem>();
    const nonDeletedAlerts = filterNonDeletedRedAlerts(alerts || []);

    nonDeletedAlerts.forEach((alert) => {
      if (alert?.id && alert.status === 'active' && !alert.isFlaggedFake && !(alert as any).isDeleted) {
        if (!uniqueMap.has(alert.id)) {
          uniqueMap.set(alert.id, alert);
        }
      }
    });

    return Array.from(uniqueMap.values()).filter((alert) => {
      if (!alert?.id || dismissedAlertIds.includes(alert.id)) return false;

      // GPS අක්ෂාංශ/දේශාංශ පදනම් කරගත් කි.මී. 5 සීමාව
      if (
        typeof currentLocation?.lat === 'number' &&
        typeof currentLocation?.lng === 'number' &&
        typeof alert.latitude === 'number' &&
        typeof alert.longitude === 'number'
      ) {
        const distanceKm = calculateDistanceKm(
          currentLocation.lat,
          currentLocation.lng,
          alert.latitude,
          alert.longitude
        );
        return distanceKm <= 5.0;
      }

      // GPS නොමැති අවස්ථාවක නම හෝ දිස්ත්‍රික්කය ගැලපීම (Fallback)
      const alertLoc = (alert.locationName || (alert as any).district || '').toLowerCase();
      const currentLocName = (currentLocation?.nameSi || currentLocation?.nameEn || '').toLowerCase();
      return Boolean(currentLocName && alertLoc && (currentLocName.includes(alertLoc) || alertLoc.includes(currentLocName)));
    });
  }, [alerts, dismissedAlertIds, currentLocation]);

  // Alert කිහිපයක් ඇති විට Carousel Transition
  useEffect(() => {
    if (activeAlerts.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAlerts.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [activeAlerts.length, isHovered]);

  const currentAlert = activeAlerts.length > 0 
    ? activeAlerts[currentIndex % activeAlerts.length] 
    : null;

  // වාර්තාකරු පරීක්ෂා කිරීම
  const isUserAuthor = (alert: RedAlertItem | null): boolean => {
    if (!currentUser || !alert) return false;
    const currentUid = currentUser.id || currentUser.userId;
    return Boolean(
      (alert.reportedByUserId && currentUid && alert.reportedByUserId === currentUid) ||
      (alert.reportedByPhone && currentUser.phone && alert.reportedByPhone === currentUser.phone) ||
      ((alert as any).reportedByNic && currentUser.nic && (alert as any).reportedByNic === currentUser.nic) ||
      ((alert as any).reportedByEmail && currentUser.email && (alert as any).reportedByEmail === currentUser.email)
    );
  };

  const isAuthor = isUserAuthor(currentAlert);
  const hasActiveAlerts = activeAlerts.length > 0;

  // 🔊 Audio Siren පාලනය
  const playSiren = () => {
    unlockAudioContext();
    if (!audioRef.current) {
      audioRef.current = new Audio(defaultSirenSound);
      audioRef.current.loop = true;
    }
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => {
        setIsPlayingSiren(true);
      }).catch((err) => {
        console.warn("Autoplay policy blocked audio siren:", err);
      });
    }
  };

  const stopSiren = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlayingSiren(false);
  };

  useEffect(() => {
    // වාර්තාකරුට හෝ Muted කළ අයට සයිරන් නාද නොවේ
    if (!hasActiveAlerts || isAuthor || isMuted) {
      stopSiren();
      return;
    }

    playSiren();

    return () => {
      stopSiren();
    };
  }, [hasActiveAlerts, isAuthor, isMuted]);

  const handleToggleSiren = () => {
    if (isPlayingSiren) {
      stopSiren();
      setIsMuted(true);
    } else {
      setIsMuted(false);
      playSiren();
    }
  };

  const handleDismissCurrentAlert = () => {
    if (!currentAlert?.id) return;

    const updated = [...dismissedAlertIds, currentAlert.id];
    setDismissedAlertIds(updated);

    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error("Local storage error:", e);
    }

    if (activeAlerts.length <= 1) {
      stopSiren();
    } else {
      setCurrentIndex((prev) => prev % (activeAlerts.length - 1));
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    stopSiren();
    await updateRedAlertStatus(alertId, 'resolved', 'වාර්තාකරු විසින් අනතුර විසඳූ බව සලකුණු කරන ලදී.');
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (window.confirm('මෙම ආපදා නිවේදනය සම්පූර්ණයෙන්ම ඉවත් කිරීමට ඔබට විශ්වාසද?')) {
      stopSiren();
      await deleteRedAlertInFirestore(alertId);
    }
  };

  if (!hasActiveAlerts || !currentAlert?.id) return null;

  const config = getDisasterConfig(currentAlert.disasterType);

  let distanceKm = 0;
  if (
    typeof currentLocation?.lat === 'number' &&
    typeof currentLocation?.lng === 'number' &&
    typeof currentAlert?.latitude === 'number' &&
    typeof currentAlert?.longitude === 'number'
  ) {
    distanceKm = calculateDistanceKm(
      currentLocation.lat,
      currentLocation.lng,
      currentAlert.latitude,
      currentAlert.longitude
    );
  }

  const distanceDisplay = distanceKm < 1 
    ? `මීටර් ${Math.round(distanceKm * 1000)}` 
    : `කි.මී. ${distanceKm.toFixed(1)}`;

  return (
    <aside 
      aria-label="රතුවෙලිය හදිසි ආපදා අනතුරු ඇඟවීම"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-lg border-b-2 border-red-400/80 relative z-30 animate-fadeIn"
    >
      {/* 1. Main Alert Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 text-xs">
        
        {/* Visual Pulse Indicator & Location */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative flex items-center justify-center shrink-0">
            <span className="w-4 h-4 rounded-full bg-white/40 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-white relative" />
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="bg-black/30 px-2 py-0.5 rounded-full font-black text-[10px] tracking-wide flex items-center gap-1 text-yellow-300 border border-yellow-300/30">
              <span className="animate-pulse">🚨</span>
              <span>රතුවෙලිය</span>
              {activeAlerts.length > 1 && (
                <span className="bg-white/20 px-1 rounded text-white ml-0.5 font-mono">
                  {(currentIndex % activeAlerts.length) + 1}/{activeAlerts.length}
                </span>
              )}
            </span>

            <p className="font-bold truncate text-[11px] sm:text-xs">
              <strong>{currentAlert.locationName}</strong>
              {distanceKm > 0 && (
                <span className="opacity-90 font-mono ml-1.5 bg-black/20 px-1.5 py-0.5 rounded">
                  (දුර: {distanceDisplay})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons & Siren Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!isAuthor && (
            <button
              type="button"
              onClick={handleToggleSiren}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95 ${
                isPlayingSiren 
                  ? 'bg-yellow-400 hover:bg-yellow-500 text-black animate-bounce' 
                  : 'bg-black/30 hover:bg-black/40 text-white'
              }`}
              title={isPlayingSiren ? "සයිරන් නවත්වන්න" : "සයිරන් නාද කරන්න"}
            >
              {isPlayingSiren ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-red-700 animate-pulse" />
                  <span className="hidden sm:inline">සයිරන් නවත්වන්න</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 opacity-80" />
                  <span className="hidden sm:inline">නිහඬයි</span>
                </>
              )}
            </button>
          )}

          {activeAlerts.length > 1 && (
            <div className="hidden sm:flex items-center gap-1 mr-1">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev - 1 + activeAlerts.length) % activeAlerts.length)}
                className="w-6 h-6 rounded-md bg-black/20 hover:bg-black/40 flex items-center justify-center text-white"
                aria-label="පෙර අනතුරු ඇඟවීම"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev + 1) % activeAlerts.length)}
                className="w-6 h-6 rounded-md bg-black/20 hover:bg-black/40 flex items-center justify-center text-white"
                aria-label="ඊළඟ අනතුරු ඇඟවීම"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => onOpenAlertDetail(currentAlert)}
            className="px-3 py-1 bg-white text-red-700 hover:bg-red-50 font-black rounded-lg text-xs flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
          >
            <span>විස්තර</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={handleDismissCurrentAlert}
            className="w-6 h-6 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center font-bold ml-1"
            title="නැවත පෙන්වන්න එපා"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Management & Threat Category Strip */}
      <div className="bg-black/20 border-t border-white/10 px-3 sm:px-4 py-1.5 text-[11px]">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center sm:justify-between items-center gap-2">
          {isAuthor ? (
            <div className="w-full flex flex-wrap justify-between items-center gap-2">
              <span className="font-bold text-yellow-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                🛡️ ඔබ මෙම ආපදාව වාර්තා කළ පුද්ගලයායි
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResolveAlert(currentAlert.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-0.5 rounded font-bold flex items-center gap-1 transition-colors"
                >
                  <CheckCircle className="w-3 h-3" />
                  අනතුර විසඳුනි (Resolve)
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAlert(currentAlert.id)}
                  className="bg-red-950 hover:bg-black text-red-200 border border-red-500/40 px-2.5 py-0.5 rounded font-bold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  ඉවත් කරන්න (Delete)
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center items-center text-white">
              <span className="flex items-center gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 text-yellow-300" />
                <span>ආපදා තත්ත්වය:</span> 
                <strong className="text-yellow-300 bg-black/40 px-2.5 py-0.5 rounded border border-white/10 flex items-center gap-1 shadow-sm">
                  {config?.icon || '⚠️'} {currentAlert.disasterTitleSi || currentAlert.disasterType}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

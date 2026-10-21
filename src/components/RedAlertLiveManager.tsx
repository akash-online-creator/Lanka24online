import React, { useEffect, useState, useRef } from 'react';
import { X, VolumeX } from 'lucide-react';
import {
  subscribeToRedAlerts,
  markRedAlertAsResolved,
  cancelRedAlertByReporter,
  addReporterUpdateToRedAlert,
  RedAlertItem
} from '../lib/firebase';
import { triggerBrowserNotification } from '../utils/notificationManager';
import { startEmergencySiren, stopEmergencySiren } from '../utils/sirenAudio';
import { calculateDistanceKm } from '../utils/geoUtils';
import { PushNotifications } from '@capacitor/push-notifications';
import { User, Language } from '../types';

interface Props {
  currentUserId?: string;
  currentUserName?: string;
  currentUser?: User | null;
  redAlerts?: RedAlertItem[];
  language?: Language;
  activeView?: string;
}

export const RedAlertLiveManager: React.FC<Props> = ({
  currentUserId: propUserId,
  currentUserName: propUserName,
  currentUser,
  redAlerts,
  language = 'si',
  activeView
}) => {
  const currentUserId = propUserId || currentUser?.id || currentUser?.userId || 'usr_guest';

  const [activeAlert, setActiveAlert] = useState<RedAlertItem | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isSirenActive, setIsSirenActive] = useState<boolean>(false);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showUpdateBox, setShowUpdateBox] = useState<boolean>(false);
  const [updateText, setUpdateText] = useState<string>('');

  // 👆 Swipe Gesture States
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [translateX, setTranslateX] = useState<number>(0);
  const [translateY, setTranslateY] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);

  const prevAlertRef = useRef<RedAlertItem | null>(null);
  const popupTimeoutRef = useRef<any>(null);

  const triggerPopup = (msg: string) => {
    setPopupMessage(msg);
    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    popupTimeoutRef.current = setTimeout(() => {
      setPopupMessage(null);
    }, 8000);
  };

  // 🔇 මෙම ඩිවයිස් එකේ පමණක් Siren එක නැවැත්වීම සහ Banner එක Dismiss කිරීම
  const handleDismissCard = () => {
    setIsDismissed(true);

    // 1. මෙම ඩිවයිස් එකේ සයිරන් එක සහ vibration ක්ෂණිකව නවත්වන්න
    try {
      stopEmergencySiren(true);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(0);
      }
    } catch (e) {
      console.warn('Siren stop failed:', e);
    }
    setIsSirenActive(false);

    // 2. මෙම Alert ID එක මෙම ඩිවයිස් එකේ localStorage තුළ සටහන් කරන්න
    if (activeAlert?.id) {
      try {
        const keys = ['sahaya_dismissed_alerts', `sahaya_dismissed_alerts_${currentUserId}`];
        keys.forEach((storageKey) => {
          const raw = localStorage.getItem(storageKey);
          const list: string[] = raw ? JSON.parse(raw) : [];
          if (Array.isArray(list) && !list.includes(activeAlert.id)) {
            list.push(activeAlert.id);
            localStorage.setItem(storageKey, JSON.stringify(list));
          }
        });
      } catch (e) {
        console.warn('Failed to save dismissed alert to storage:', e);
      }
    }
  };

  // 📱 Touch / Swipe Handlers (පැත්තට හෝ උඩට තල්ලු කර ඉවත් කිරීම)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const diffX = e.touches[0].clientX - touchStartX;
    const diffY = e.touches[0].clientY - touchStartY;
    setTranslateX(diffX);
    setTranslateY(diffY);
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    // තිරස් අතට 75px හෝ ඉහළට 60px swipe කළ විට dismiss වේ
    if (Math.abs(translateX) > 75 || translateY < -60) {
      handleDismissCard();
    }
    setTranslateX(0);
    setTranslateY(0);
    setTouchStartX(null);
    setTouchStartY(null);
    setIsSwiping(false);
  };

  // 🔄 Alert එක කලින් dismiss කර ඇත්දැයි localStorage මඟින් පරීක්ෂා කිරීම
  useEffect(() => {
    if (activeAlert?.id) {
      try {
        const general = JSON.parse(localStorage.getItem('sahaya_dismissed_alerts') || '[]');
        const userSpecific = JSON.parse(localStorage.getItem(`sahaya_dismissed_alerts_${currentUserId}`) || '[]');
        const wasDismissed =
          (Array.isArray(general) && general.includes(activeAlert.id)) ||
          (Array.isArray(userSpecific) && userSpecific.includes(activeAlert.id));

        if (wasDismissed) {
          setIsDismissed(true);
          stopEmergencySiren(true);
          setIsSirenActive(false);
        } else {
          setIsDismissed(false);
        }
      } catch {
        setIsDismissed(false);
      }
    } else {
      setIsDismissed(false);
    }
  }, [activeAlert?.id, currentUserId]);

  // 📡 Real-time Listener සහ අලුත් Alert පමණක් siren සහිතව පෙන්වීම
  useEffect(() => {
    let pushListenerHandle: any = null;

    const getUserCoordinates = (): { lat: number; lng: number; isFallback?: boolean } => {
      try {
        // A. Real-time Native GPS injected from Flutter
        const nativeLoc = (window as any).sahayaNativeLocation;
        if (nativeLoc && typeof nativeLoc.lat === 'number' && typeof nativeLoc.lng === 'number') {
          return { lat: nativeLoc.lat, lng: nativeLoc.lng };
        }
        // B. LocalStorage saved location
        const savedLoc = localStorage.getItem('sahaya_current_location');
        if (savedLoc) {
          const parsed = JSON.parse(savedLoc);
          if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
            return { lat: parsed.lat, lng: parsed.lng };
          }
        }
      } catch {}
      // C. Smart Sri Lanka Center/Katunayake Coordinates fallback
      return { lat: 7.151, lng: 79.885, isFallback: true };
    };

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const disasterName = notification.data?.disasterType || notification.title || 'Red Alert';
      triggerPopup(`🚨 RED ALERT: ${disasterName}!`);
      startEmergencySiren();
      setIsSirenActive(true);
    })
      .then((handle) => {
        pushListenerHandle = handle;
      })
      .catch((err) => {
        console.warn('Push Notifications listener registration failed:', err);
      });

    const unsubscribe = subscribeToRedAlerts((alerts) => {
      const alertList = alerts || [];
      const currentActive = alertList.find((a) => a && a.status === 'active') || null;
      const prevAlert = prevAlertRef.current;

      // නව Alert ID එකක් පැමිණි විට පමණක් ක්‍රියාත්මක වේ
      const isBrandNewAlert = currentActive && (!prevAlert || currentActive.id !== prevAlert.id);

      if (isBrandNewAlert) {
        const userCoords = getUserCoordinates();
        const alertLat = typeof currentActive.latitude === 'number' ? currentActive.latitude : 6.9271;
        const alertLng = typeof currentActive.longitude === 'number' ? currentActive.longitude : 79.8612;
        const distanceKm = calculateDistanceKm(userCoords.lat, userCoords.lng, alertLat, alertLng);

        let isDismissedStored = false;
        try {
          const general = JSON.parse(localStorage.getItem('sahaya_dismissed_alerts') || '[]');
          const userSpecific = JSON.parse(localStorage.getItem(`sahaya_dismissed_alerts_${currentUserId}`) || '[]');
          isDismissedStored =
            (Array.isArray(general) && general.includes(currentActive.id)) ||
            (Array.isArray(userSpecific) && userSpecific.includes(currentActive.id));
        } catch {}

        const isReporter = currentActive.reportedByUserId === currentUserId;

        // Location match check (same city/town or within 15km)
        const userLocName = (localStorage.getItem('sahaya_current_location') || '').toLowerCase();
        const alertLocName = (currentActive.locationName || '').toLowerCase();
        const isSameArea = userLocName && alertLocName && (userLocName.includes(alertLocName) || alertLocName.includes(userLocName));
        const isWithin15Km = distanceKm <= 15.0 || isSameArea || userCoords.isFallback;

        // මෙම ඩිවයිස් එකේ dismiss කර නැත්නම් පමණක් siren නාද කර බැනරය පෙන්වන්න
        if ((isWithin15Km || isReporter) && !isDismissedStored) {
          // A. Trigger Local Web Siren Audio
          startEmergencySiren();
          setIsSirenActive(true);
          triggerPopup(`🚨 රතු නිවේදනය: ${currentActive.disasterTitleSi || 'ආපදා අනතුරු ඇඟවීමක්'} ක්‍රියාත්මකයි!`);

          // B. 📱 Trigger Native Android / Flutter Wake-Up & Fullscreen Siren Alert
          if (typeof window !== 'undefined' && (window as any).SahayaNativeAlertChannel) {
            try {
              (window as any).SahayaNativeAlertChannel.postMessage('TRIGGER_RED_ALERT:' + JSON.stringify({
                title: currentActive.disasterTitleSi || 'ආපදා අනතුරු ඇඟවීමක්',
                location: currentActive.locationName || '',
                distanceKm: distanceKm.toFixed(1)
              }));
            } catch (_) {}
          }
        } else if (!isDismissedStored) {
          triggerBrowserNotification({
            id: `alert-new-${currentActive.id || Date.now()}`,
            type: 'red_alert',
            title: `🚨 Red Alert: ${currentActive.disasterTitleSi || 'හදිසි ආපදාවක්'}`,
            message: `ස්ථානය: ${currentActive.locationName || 'නොදනී'} (දුර: කි.මී. ${distanceKm.toFixed(1)})`,
            timestamp: new Date().toISOString(),
            isRead: false,
            badgeText: 'SOS'
          });
        }
      } else if (prevAlert) {
        const updatedAlertInList = alertList.find((a) => a && a.id === prevAlert.id);
        if (prevAlert.status === 'active' && (updatedAlertInList?.status === 'resolved' || updatedAlertInList?.status === 'cancelled')) {
          triggerPopup(updatedAlertInList.statusChangeMessage || '✅ අනතුරු ඇඟවීම ඉවත් කර ඇත.');
          stopEmergencySiren(true);
          setIsSirenActive(false);
        }
      }

      setActiveAlert(currentActive);
      prevAlertRef.current = currentActive;
    });

    return () => {
      unsubscribe();
      if (pushListenerHandle) pushListenerHandle.remove();
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    };
  }, [currentUserId]);

  const handleResolve = async () => {
    if (!activeAlert?.id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await markRedAlertAsResolved(activeAlert.id, currentUserId, 'තත්ත්වය යහපත් අතට හැරී ඇත');
      handleDismissCard();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!activeAlert?.id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await cancelRedAlertByReporter(activeAlert.id, currentUserId, 'අනතුරු ඇඟවීම අවලංගු කරන ලදී');
      handleDismissCard();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAlert?.id || !updateText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addReporterUpdateToRedAlert(activeAlert.id, currentUserId, propUserName || 'Reporter', updateText.trim());
      setUpdateText('');
      setShowUpdateBox(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReporter = Boolean(activeAlert?.reportedByUserId && activeAlert.reportedByUserId === currentUserId);

  return (
    // 💡 pointer-events-none මඟින් බැනරය නැති විට හෝ බැනරය දෙපස ඇති UI element ක්ලික් කිරීමට කිසිදු බාධාවක් ඇති නොවේ
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-11/12 max-w-xl space-y-2 pointer-events-none">
      {/* 🔔 Popup Toast Message */}
      {popupMessage && (
        <div className="pointer-events-auto bg-slate-900 text-white border-2 border-emerald-500 p-3 sm:p-4 rounded-2xl shadow-2xl flex items-center justify-between">
          <p className="text-xs sm:text-sm font-bold leading-relaxed">{popupMessage}</p>
          <button
            type="button"
            onClick={() => setPopupMessage(null)}
            className="ml-3 p-2 text-slate-400 hover:text-white font-black text-lg cursor-pointer"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* 🚨 Active Emergency Banner Card (With Swipe & Big Close Button) */}
      {!isDismissed && activeAlert && (
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translate(${translateX}px, ${translateY}px)`,
            opacity: 1 - Math.abs(translateX) / 250 - Math.abs(translateY) / 180,
            transition: isSwiping ? 'none' : 'transform 0.25s ease-out, opacity 0.25s ease-out'
          }}
          className="pointer-events-auto bg-gradient-to-r from-red-600 via-rose-700 to-red-800 text-white p-4 sm:p-5 rounded-3xl shadow-[0_10px_35px_rgba(225,29,72,0.5)] border-2 border-red-300 relative overflow-hidden select-none"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2">
            <span className="bg-white text-red-700 font-black px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider shadow">
              🚨 ACTIVE: {activeAlert.alertCode || 'EMERGENCY'}
            </span>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* 🔇 Silence Siren Button */}
              {isSirenActive && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    stopEmergencySiren(true);
                    setIsSirenActive(false);
                  }}
                  className="bg-black/60 hover:bg-black/80 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow cursor-pointer active:scale-95"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Silence</span>
                </button>
              )}

              {/* ❌ කැපී පෙනෙන Touch-Friendly Close Button (40px Target) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismissCard();
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90 border border-white/20"
                title="ඉවත් කරන්න (Dismiss)"
                aria-label="Close alert"
              >
                <X className="w-5 h-5 font-bold" />
              </button>
            </div>
          </div>

          {/* Swipe Hint */}
          <div className="text-[10px] text-red-200 mt-1 flex justify-between items-center opacity-80">
            <span>⏰ {activeAlert.incidentTime}</span>
            <span>👈 අයින් කිරීමට පැත්තට swipe කරන්න</span>
          </div>

          {/* Body */}
          <h3 className="text-base sm:text-lg font-black mt-1.5 leading-snug">
            {activeAlert.disasterTitleSi || activeAlert.disasterTitle || 'හදිසි අනතුරු ඇඟවීමයි'}
          </h3>
          <p className="text-xs sm:text-sm mt-1 opacity-95 leading-relaxed line-clamp-3">
            {activeAlert.description}
          </p>

          <div className="mt-2 text-[11px] text-red-100 flex flex-wrap gap-x-3 gap-y-1 font-medium">
            <span>📍 {activeAlert.locationName}</span>
            <span>📡 {activeAlert.source || 'Official Source'}</span>
          </div>

          {/* Reporter Controls (පාලන බොත්තම්) */}
          {isReporter && (
            <div className="mt-3 pt-2 border-t border-red-400/40 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleResolve}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow cursor-pointer"
              >
                ✅ විසඳන ලදී
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCancel}
                className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow cursor-pointer"
              >
                🗑 අවලංගු කරන්න
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowUpdateBox((prev) => !prev)}
                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow cursor-pointer"
              >
                💬 Update යවන්න
              </button>
            </div>
          )}

          {isReporter && showUpdateBox && (
            <form onSubmit={handleSendUpdate} className="pt-2 flex gap-2">
              <input
                type="text"
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder="නව තොරතුරක් යවන්න..."
                disabled={isSubmitting}
                className="flex-1 bg-white text-slate-900 font-medium text-xs px-3 py-2 rounded-xl"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-white text-red-700 font-black text-xs px-3 py-2 rounded-xl"
              >
                Send
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};


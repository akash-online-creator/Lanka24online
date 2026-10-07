import React, { useEffect, useState, useRef } from 'react';
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
}

export const RedAlertLiveManager: React.FC<Props> = ({ 
  currentUserId: propUserId, 
  currentUserName: propUserName,
  currentUser,
}) => {
  const currentUserId = propUserId || currentUser?.id || currentUser?.userId || 'usr_guest';
  const currentUserName = propUserName || currentUser?.name || 'පරිශීලක';
  const [activeAlert, setActiveAlert] = useState<RedAlertItem | null>(null);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);
  const [updateText, setUpdateText] = useState('');
  const [showUpdateBox, setShowUpdateBox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSirenActive, setIsSirenActive] = useState(false);

  const prevAlertRef = useRef<RedAlertItem | null>(null);
  const popupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🔔 තිරය මත Popup එක පෙන්වීම සහ Local Notification එකක් යැවීම
  const triggerPopup = (msg: string) => {
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
    }

    setPopupMessage(msg);

    triggerBrowserNotification({
      id: `alert-update-${Date.now()}`,
      type: 'emergency_blood',
      title: '🚨 රතුවෙලිය ආපදා අනතුරු ඇඟවීම!',
      message: msg,
      timestamp: new Date().toISOString(),
      isRead: false,
      badgeText: 'SOS',
    });

    // තත්පර 8කට පසු Popup එක ස්වයංක්‍රීයව ඉවත් කිරීම
    popupTimeoutRef.current = setTimeout(() => {
      setPopupMessage(null);
    }, 8000);
  };

  // 🔇 සයිරන් නාදය Mute කිරීමේ ක්‍රියාවලිය
  const handleSilenceSiren = () => {
    stopEmergencySiren();
    setIsSirenActive(false);
  };

  useEffect(() => {
    let pushListenerHandle: any = null;

    // Helper: වත්මන් පරිශීලකයාගේ GPS ස්ථානය ලබා ගැනීම
    const getUserCoordinates = (): { lat: number; lng: number } => {
      try {
        const savedLoc = localStorage.getItem('sahaya_current_location');
        if (savedLoc) {
          const parsed = JSON.parse(savedLoc);
          if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
            return { lat: parsed.lat, lng: parsed.lng };
          }
        }
      } catch {}
      return { lat: 6.9271, lng: 79.8612 }; // Colombo default
    };

    // 1. Capacitor Push Notification Listener (App එක Foreground එකේ ඇති විට ලැබෙන Data සඳහා)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const disasterName = notification.data?.disasterType || notification.title || 'හදිසි ආපදාවක්';
      triggerPopup(`🚨 අවධානය දෙන්න: ${disasterName} වාර්තා වී ඇත!`);
      
      startEmergencySiren();
      setIsSirenActive(true);
    }).then((handle) => {
      pushListenerHandle = handle;
    }).catch((err) => {
      console.warn('Capacitor Push Notifications listener registration failed:', err);
    });

    // 2. Firestore Real-time Alert Sync පරීක්ෂාව
    const unsubscribe = subscribeToRedAlerts((alerts) => {
      const alertList = alerts || [];
      const currentActive = alertList.find((a) => a && a.status === 'active') || null;
      const prevAlert = prevAlertRef.current;

      if (prevAlert) {
        const updatedAlertInList = alertList.find((a) => a && a.id === prevAlert.id);

        // A. ආපදාව විසඳුනු බව සටහන් කළ විට
        if (prevAlert.status === 'active' && updatedAlertInList?.status === 'resolved') {
          triggerPopup(
            updatedAlertInList.statusChangeMessage || 
            '✅ දැනුම්දීම පලකළ තැනැත්තා විසින් මෙම ආපදාව විසඳුනු බව සටහන් කළේය.'
          );
          stopEmergencySiren();
          setIsSirenActive(false);
        }
        // B. දැනුම්දීම ඉවත් කරගත් විට
        else if (prevAlert.status === 'active' && updatedAlertInList?.status === 'cancelled') {
          triggerPopup(
            updatedAlertInList.statusChangeMessage || 
            'ℹ️ දැනුම්දීම පලකළ තැනැත්තා විසින් මෙම ආපදා නිවේදනය ඉවත් කරගන්නා ලදී.'
          );
          stopEmergencySiren();
          setIsSirenActive(false);
        }
        // C. පළකළ අය විසින් අලුත් විස්තරයක් එක් කළ විට
        else if (
          currentActive && 
          currentActive.id === prevAlert.id &&
          currentActive.latestReporterUpdate?.createdAt !== prevAlert.latestReporterUpdate?.createdAt
        ) {
          if (currentActive.latestReporterUpdate?.notificationText) {
            triggerPopup(currentActive.latestReporterUpdate.notificationText);
          }
        }
      } else if (currentActive) {
        // අලුතින්ම සක්‍රිය ආපදාවක් පැමිණි විට: දුර ප්‍රමාණය පරීක්ෂා කර කි.මී. 5 ඇතුළත නම් පමණක් සයිරනය ක්‍රියාත්මක කිරීම
        const userCoords = getUserCoordinates();
        const alertLat = typeof currentActive.latitude === 'number' ? currentActive.latitude : 6.9271;
        const alertLng = typeof currentActive.longitude === 'number' ? currentActive.longitude : 79.8612;
        const distanceKm = calculateDistanceKm(userCoords.lat, userCoords.lng, alertLat, alertLng);

        // පරිශීලකයා කලින් මෙම alert එක dismiss කර ඇත්දැයි බැලීම
        let isDismissed = false;
        try {
          const dismissedIds = JSON.parse(localStorage.getItem(`rathuweliya_dismissed_alerts_${currentUserId}`) || '[]');
          isDismissed = Array.isArray(dismissedIds) && dismissedIds.includes(currentActive.id);
        } catch {}

        if (distanceKm <= 5 && !isDismissed) {
          startEmergencySiren();
          setIsSirenActive(true);
          triggerPopup(`🚨 අවධානය දෙන්න: ඔබේ ස්ථානයට කි.මී. ${distanceKm.toFixed(1)} ක් නුදුරින් ${currentActive.disasterTitleSi || 'හදිසි ආපදාවක්'} වාර්තා විය!`);
        } else if (!isDismissed) {
          triggerBrowserNotification({
            id: `alert-new-${currentActive.id || Date.now()}`,
            type: 'emergency_blood',
            title: `🚨 නව ආපදා අනතුරු ඇඟවීමක්: ${currentActive.disasterTitleSi || 'හදිසි ආපදාවක්'}`,
            message: `📍 ${currentActive.locationName || 'ශ්‍රී ලංකාව'} ප්‍රදේශයෙන් හදිසි ආපදාවක් වාර්තා වී ඇත.`,
            locationName: currentActive.locationName,
            timestamp: new Date().toISOString(),
            isRead: false,
            badgeText: 'SOS',
            targetModal: 'red_alert',
            targetPostId: currentActive.id,
          });
        }
      }

      setActiveAlert(currentActive);
      prevAlertRef.current = currentActive;
    });

    return () => {
      unsubscribe();
      if (pushListenerHandle) {
        pushListenerHandle.remove();
      }
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }
      stopEmergencySiren();
    };
  }, [currentUserId]);

  // 1. "ආපදාව විසඳුනා" Button Action
  const handleResolve = async () => {
    if (!activeAlert?.id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await markRedAlertAsResolved(activeAlert.id);
      stopEmergencySiren();
      setIsSirenActive(false);
    } catch {
      alert('තත්ත්වය වෙනස් කිරීමට නොහැකි විය.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. "අනතුර ඉවත් කරන්න" Button Action
  const handleCancel = async () => {
    if (!activeAlert?.id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await cancelRedAlertByReporter(activeAlert.id);
      stopEmergencySiren();
      setIsSirenActive(false);
    } catch {
      alert('ඉවත් කිරීමට නොහැකි විය.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. "තව අදහසක් / Update එකක් දාන්න" Submit Action
  const handleSendUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAlert?.id || !updateText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addReporterUpdateToRedAlert(activeAlert.id, updateText.trim(), {
        reporterId: currentUserId,
        reporterName: currentUserName || activeAlert.reportedByName,
      });
      setUpdateText('');
      setShowUpdateBox(false);
    } catch {
      alert('යාවත්කාලීන කිරීමට නොහැකි විය.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReporter = activeAlert?.reportedByUserId === currentUserId;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-xl space-y-3 pointer-events-auto">
      
      {/* 🔔 A. සජීවී POPUP NOTIFICATION */}
      {popupMessage && (
        <div className="bg-slate-900 text-white border-2 border-emerald-500 p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-bounce">
          <p className="text-xs sm:text-sm font-bold leading-relaxed">{popupMessage}</p>
          <button 
            type="button"
            onClick={() => setPopupMessage(null)}
            className="ml-3 text-slate-400 hover:text-white font-bold text-base cursor-pointer"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* 🚨 B. ACTIVE "රතුවෙලිය" ALERT BANNER */}
      {activeAlert && (
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-4 sm:p-5 rounded-3xl shadow-[0_0_40px_rgba(239,68,68,0.6)] border-2 border-red-300">
          
          <div className="flex items-center justify-between gap-2">
            <span className="bg-white text-red-700 font-black px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wider animate-pulse">
              🚨 රතුවෙලිය: {activeAlert.alertCode || 'EMERGENCY'}
            </span>
            <div className="flex items-center gap-2">
              {isSirenActive && (
                <button
                  type="button"
                  onClick={handleSilenceSiren}
                  className="bg-black/40 hover:bg-black/60 text-amber-300 text-[11px] font-bold px-2 py-1 rounded-lg border border-amber-300/40 transition-all flex items-center gap-1 cursor-pointer"
                >
                  🔇 සයිරනය නවතන්න
                </button>
              )}
              <span className="text-xs text-red-100 font-mono font-medium">
                🕒 {activeAlert.incidentTime}
              </span>
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-black mt-2">
            {activeAlert.disasterTitleSi}
          </h3>

          <p className="text-xs sm:text-sm mt-1 opacity-90 leading-relaxed">
            {activeAlert.description}
          </p>

          <div className="mt-2 text-[11px] text-red-100 flex flex-wrap gap-x-4 gap-y-1 font-medium">
            <span>📍 ස්ථානය: {activeAlert.locationName}</span>
            <span>📡 වපසරිය: කි.මී. 5 ඇතුළත</span>
          </div>

          {/* 💬 කමෙන්ට්ස් සහ යාවත්කාලීන කිරීම් */}
          {activeAlert.comments && activeAlert.comments.length > 0 && (
            <div className="mt-3 bg-black/30 p-3 rounded-xl border border-white/10 space-y-1 max-h-32 overflow-y-auto">
              <span className="text-[11px] font-bold text-amber-300 block">💬 සජීවී යාවත්කාලීන කිරීම්:</span>
              {activeAlert.comments.map((c, i) => (
                <p key={i} className="text-xs text-slate-100">
                  <span className="font-semibold text-amber-200">{c.authorName}:</span> {c.text}
                </p>
              ))}
            </div>
          )}

          {/* 🎛️ C. පළ කළ කෙනාට (REPORTER) පමණක් පෙනෙන OPTIONS */}
          {isReporter && (
            <div className="mt-4 pt-3 border-t border-white/20 space-y-2">
              <span className="text-[11px] font-bold text-red-100 block">
                🛠️ ඔබ පළ කළ දැනුම්දීම පාලනය:
              </span>

              <div className="flex flex-wrap gap-2">
                {/* Option 1: විසඳුනා */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleResolve}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  ✅ ආපදාව විසඳුනා
                </button>

                {/* Option 2: අනතුර ඉවත් කරන්න */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCancel}
                  className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  🗑️ අනතුර ඉවත් කරන්න
                </button>

                {/* Option 3: තව අදහසක් දක්වන්න */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowUpdateBox((prev) => !prev)}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  💬 තව අදහසක් දක්වන්න
                </button>
              </div>

              {/* Option 3 Input Box */}
              {showUpdateBox && (
                <form onSubmit={handleSendUpdate} className="pt-2 flex gap-2">
                  <input
                    type="text"
                    value={updateText}
                    onChange={(e) => setUpdateText(e.target.value)}
                    placeholder="අලුත් තොරතුර සටහන් කරන්න..."
                    disabled={isSubmitting}
                    className="flex-1 bg-white text-slate-900 font-medium text-xs px-3 py-2 rounded-xl border border-red-300 focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-white hover:bg-slate-100 disabled:opacity-50 text-red-700 font-black text-xs px-3 py-2 rounded-xl cursor-pointer"
                  >
                    {isSubmitting ? '...' : 'යවන්න'}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
};

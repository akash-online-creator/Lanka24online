import React, { useEffect, useState, useRef } from 'react';

import { 

  X, 

  VolumeX, 

  AlertTriangle, 

  ShieldAlert, 

  CheckCircle2, 

  BellRing, 

  MapPin, 

  Clock, 

  Radio, 

  Send 

} from 'lucide-react';

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

  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);

  const [popupMessage, setPopupMessage] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [showUpdateBox, setShowUpdateBox] = useState<boolean>(false);

  const [updateText, setUpdateText] = useState<string>('');

  // 👆 Swipe Gesture States for Banner

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

  // 🛑 සියලුම සයිරන් ශබ්ද, කම්පන (Vibration) සහ Native Android Notifications ක්ෂණිකව නැවැත්වීම

  const stopAllAlertEffects = () => {

    // 1. Web HTML5 Siren Audio නැවැත්වීම

    try {

      stopEmergencySiren(true);

    } catch (e) {

      console.warn('Web siren stop failed:', e);

    }

    // 2. ජංගම දුරකථන Vibration නැවැත්වීම

    try {

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {

        navigator.vibrate(0);

      }

    } catch (_) {}

    // 3. Android Native / Flutter Foreground Task Service එක නවත්වන්න පණිවිඩ යැවීම

    try {

      if (typeof window !== 'undefined' && (window as any).SahayaNativeAlertChannel) {

        (window as any).SahayaNativeAlertChannel.postMessage('STOP_RED_ALERT');

        (window as any).SahayaNativeAlertChannel.postMessage('STOP_SIREN');

      }

    } catch (_) {}

    setIsSirenActive(false);

  };

  // 🔇 පරිශීලකයා විසින් සයිරන් නවත්වා මෙම ඩිවයිස් එකෙන් දැනුම්දීම ඉවත් කිරීම (Dismiss)

  const handleDismissByUser = () => {

    stopAllAlertEffects();

    setIsDismissed(true);

    setShowEmergencyModal(false);

    // මෙම Alert ID එක localStorage තුළ සටහන් කර නැවත මෙම ඇලර්ට් එක සඳහා සයිරන් වාදනය වීම වළක්වන්න

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

  // 📱 Touch / Swipe Handlers for Banner

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

    if (Math.abs(translateX) > 75 || translateY < -60) {

      handleDismissByUser();

    }

    setTranslateX(0);

    setTranslateY(0);

    setTouchStartX(null);

    setTouchStartY(null);

    setIsSwiping(false);

  };

  // 📡 Real-time Listener: ආපදා තත්ත්වයන් සහ අවලංගු කිරීම් ක්ෂණිකව හඳුනාගැනීම

  useEffect(() => {

    let pushListenerHandle: any = null;

    const getUserCoordinates = (): { lat: number; lng: number; isFallback?: boolean } => {

      try {

        const nativeLoc = (window as any).sahayaNativeLocation;

        if (nativeLoc && typeof nativeLoc.lat === 'number' && typeof nativeLoc.lng === 'number') {

          return { lat: nativeLoc.lat, lng: nativeLoc.lng };

        }

        const savedLoc = localStorage.getItem('sahaya_current_location');

        if (savedLoc) {

          const parsed = JSON.parse(savedLoc);

          if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {

            return { lat: parsed.lat, lng: parsed.lng };

          }

        }

      } catch {}

      return { lat: 7.151, lng: 79.885, isFallback: true };

    };

    // FCM / Push notification listener

    PushNotifications.addListener('pushNotificationReceived', (notification) => {

      const disasterName = notification.data?.disasterType || notification.title || 'Red Alert';

      triggerPopup(`🚨 RED ALERT: ${disasterName}!`);

      setShowEmergencyModal(true);

      startEmergencySiren();

      setIsSirenActive(true);

    })

      .then((handle) => {

        pushListenerHandle = handle;

      })

      .catch((err) => {

        console.warn('Push Notifications listener registration failed:', err);

      });

    // Custom Event listener for in-app broadcast

    const handleCustomRedAlert = (e: any) => {

      const payload = e.detail;

      if (payload) {

        setShowEmergencyModal(true);

        setIsSirenActive(true);

      }

    };

    window.addEventListener('sahaya_red_alert_received', handleCustomRedAlert);

    // 🔄 Firestore red_alerts Live Subscription

    const unsubscribe = subscribeToRedAlerts((alerts) => {

      const alertList = alerts || [];

      const activeAlerts = alertList.filter((a) => a && a.status === 'active');

      const currentActive = activeAlerts[0] || null;

      const prevAlert = prevAlertRef.current;

      // 🛑 1. කිසිදු සක්‍රීය ආපදාවක් නොමැති විට හෝ ආපදාව විසඳූ/අවලංගු කළ විට සියලුම සයිරන් සහ Dialog ක්ෂණිකව නවත්වන්න

      if (!currentActive) {

        if (prevAlert || isSirenActive || showEmergencyModal) {

          stopAllAlertEffects();

          setShowEmergencyModal(false);

          setIsDismissed(false);

          triggerPopup('✅ හදිසි ආපදා තත්ත්වය විසඳා හෝ අවලංගු කර ඇත.');

        }

        setActiveAlert(null);

        prevAlertRef.current = null;

        return;

      }

      // 🚨 2. සක්‍රීය ආපදාවක් පවතින විට

      const isBrandNewAlert = !prevAlert || currentActive.id !== prevAlert.id;

      // මෙම ඩිවයිස් එකේ මෙම ඇලර්ට් එක කලින් dismiss කර ඇත්දැයි බැලීම

      let isDismissedStored = false;

      try {

        const general = JSON.parse(localStorage.getItem('sahaya_dismissed_alerts') || '[]');

        const userSpecific = JSON.parse(localStorage.getItem(`sahaya_dismissed_alerts_${currentUserId}`) || '[]');

        isDismissedStored =

          (Array.isArray(general) && general.includes(currentActive.id)) ||

          (Array.isArray(userSpecific) && userSpecific.includes(currentActive.id));

      } catch {}

      const userCoords = getUserCoordinates();

      const alertLat = typeof currentActive.latitude === 'number' ? currentActive.latitude : 7.151;

      const alertLng = typeof currentActive.longitude === 'number' ? currentActive.longitude : 79.885;

      const distanceKm = calculateDistanceKm(userCoords.lat, userCoords.lng, alertLat, alertLng);

      const isReporter = Boolean(currentActive.reportedByUserId && currentActive.reportedByUserId === currentUserId);

      const isWithinRange = distanceKm <= 50.0 || userCoords.isFallback || isReporter;

      setActiveAlert(currentActive);

      prevAlertRef.current = currentActive;

      if (isDismissedStored) {

        setIsDismissed(true);

        setShowEmergencyModal(false);

        stopAllAlertEffects();

        return;

      }

      // අලුත් ආපදාවක් නම් සහ dismiss කර නැත්නම් -> සයිරන් පණගන්වා Prominent Modal එක පෙන්වන්න

      if (isBrandNewAlert && isWithinRange) {

        setIsDismissed(false);

        setShowEmergencyModal(true);

        setIsSirenActive(true);

        startEmergencySiren();

        // Vibration

        if (typeof navigator !== 'undefined' && navigator.vibrate) {

          try {

            navigator.vibrate([1000, 200, 1000, 200, 1500, 300, 2000]);

          } catch {}

        }

        // Native Android Channel Trigger

        if (typeof window !== 'undefined' && (window as any).SahayaNativeAlertChannel) {

          try {

            (window as any).SahayaNativeAlertChannel.postMessage('TRIGGER_RED_ALERT:' + JSON.stringify({

              title: currentActive.disasterTitleSi || currentActive.disasterTitle || 'ආපදා අනතුරු ඇඟවීමක්',

              location: currentActive.locationName || '',

              distanceKm: distanceKm.toFixed(1)

            }));

          } catch (_) {}

        }

        triggerPopup(`🚨 රතු නිවේදනය: ${currentActive.disasterTitleSi || 'ආපදා අනතුරු ඇඟවීමක්'} ක්‍රියාත්මකයි!`);

      }

    });

    return () => {

      unsubscribe();

      window.removeEventListener('sahaya_red_alert_received', handleCustomRedAlert);

      if (pushListenerHandle) pushListenerHandle.remove();

      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);

    };

  }, [currentUserId]);

  // ආපදාව පළ කළ තැනැත්තා විසින් එය විසඳන ලදී (Resolved) ලෙස සලකුණු කිරීම

  const handleResolve = async () => {

    if (!activeAlert?.id || isSubmitting) return;

    setIsSubmitting(true);

    try {

      await markRedAlertAsResolved(activeAlert.id, currentUserId, 'තත්ත්වය යහපත් අතට හැරී ඇත');

      stopAllAlertEffects();

      setShowEmergencyModal(false);

      setIsDismissed(true);

      triggerPopup('✅ ආපදා අනතුරු ඇඟවීම සාර්ථකව විසඳන ලදී.');

    } finally {

      setIsSubmitting(false);

    }

  };

  // ආපදාව පළ කළ තැනැත්තා විසින් එය අවලංගු කිරීම (Cancel Alert)

  const handleCancel = async () => {

    if (!activeAlert?.id || isSubmitting) return;

    setIsSubmitting(true);

    try {

      await cancelRedAlertByReporter(activeAlert.id, currentUserId, 'අනතුරු ඇඟවීම අවලංගු කරන ලදී');

      stopAllAlertEffects();

      setShowEmergencyModal(false);

      setIsDismissed(true);

      triggerPopup('🗑️ ආපදා අනතුරු ඇඟවීම අවලංගු කරන ලදී.');

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

      triggerPopup('💬 යාවත්කාලීන පණිවිඩය සාර්ථකව යවන ලදී.');

    } finally {

      setIsSubmitting(false);

    }

  };

  const isReporter = Boolean(activeAlert?.reportedByUserId && activeAlert.reportedByUserId === currentUserId);

  return (

    <>

      {/* 🚨 1. FULLSCREEN / HIGH-PRIORITY PROMINENT EMERGENCY MODAL */}

      {showEmergencyModal && activeAlert && (

        <div className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">

          <div className="w-full max-w-lg bg-gradient-to-b from-red-950 via-slate-900 to-black text-white rounded-3xl p-5 sm:p-7 border-4 border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.7)] relative overflow-hidden space-y-4">

            

            {/* Pulsing Alarm Beacon */}

            <div className="flex items-center justify-between border-b border-red-800/60 pb-3">

              <div className="flex items-center gap-2">

                <span className="relative flex h-4 w-4">

                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>

                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>

                </span>

                <span className="text-red-400 font-black text-xs sm:text-sm tracking-wider uppercase">

                  🚨 හදිසි ආපදා අනතුරු ඇඟවීමයි!

                </span>

              </div>

              <span className="bg-red-600 text-white font-black text-[11px] px-2.5 py-0.5 rounded-full shadow">

                {activeAlert.alertCode || 'RED ALERT'}

              </span>

            </div>

            {/* Disaster Title & Details */}

            <div className="space-y-2">

              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">

                {activeAlert.disasterTitleSi || activeAlert.disasterTitle || 'හදිසි අනතුරු ඇඟවීමක්'}

              </h2>

              <div className="flex flex-wrap gap-2 text-xs text-red-200">

                <span className="bg-red-900/60 border border-red-700/60 px-2.5 py-1 rounded-lg flex items-center gap-1">

                  <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />

                  <span>{activeAlert.locationName || 'ස්ථානය සඳහන් කර නැත'}</span>

                </span>

                <span className="bg-red-900/60 border border-red-700/60 px-2.5 py-1 rounded-lg flex items-center gap-1">

                  <Clock className="w-3.5 h-3.5 text-red-400 shrink-0" />

                  <span>{activeAlert.incidentTime || 'දැන්'}</span>

                </span>

              </div>

              <p className="text-sm text-slate-200 bg-black/40 p-3.5 rounded-2xl border border-red-900/40 leading-relaxed font-medium">

                {activeAlert.description || 'ආරක්ෂිත ස්ථානයක රැඳී සිටින්න. වැඩිදුර තොරතුරු බලාපොරොත්තු වන්න.'}

              </p>

            </div>

            {/* 🛑 BIG PROMINENT DISMISS / CANCEL SIREN BUTTON */}

            <button

              type="button"

              onClick={handleDismissByUser}

              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-base sm:text-lg shadow-[0_0_30px_rgba(239,68,68,0.8)] border border-red-300 flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer"

            >

              <VolumeX className="w-6 h-6 animate-pulse" />

              <span>සයිරන් නවතන්න / දැනුම්දීම ඉවත් කරන්න</span>

            </button>

            {/* 🛡️ Reporter / Admin Controls */}

            {isReporter && (

              <div className="pt-3 border-t border-red-900/60 space-y-2">

                <p className="text-[11px] text-amber-300 font-bold">ඔබ මෙම ආපදා නිවේදනය පළකළ පරිශීලකයා වේ:</p>

                <div className="grid grid-cols-2 gap-2">

                  <button

                    type="button"

                    disabled={isSubmitting}

                    onClick={handleResolve}

                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black shadow flex items-center justify-center gap-1.5 cursor-pointer"

                  >

                    <CheckCircle2 className="w-4 h-4" />

                    <span>විසඳන ලදී</span>

                  </button>

                  <button

                    type="button"

                    disabled={isSubmitting}

                    onClick={handleCancel}

                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-black shadow flex items-center justify-center gap-1.5 cursor-pointer"

                  >

                    <X className="w-4 h-4" />

                    <span>අවලංගු කරන්න</span>

                  </button>

                </div>

              </div>

            )}

          </div>

        </div>

      )}

      {/* 🔔 2. TOP BANNER & TOAST NOTIFICATION LAYER */}

      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-11/12 max-w-xl space-y-2 pointer-events-none">

        {/* Toast Notification Message */}

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

        {/* Minimized / Persistent Top Alert Strip */}

        {!isDismissed && activeAlert && !showEmergencyModal && (

          <div

            onTouchStart={handleTouchStart}

            onTouchMove={handleTouchMove}

            onTouchEnd={handleTouchEnd}

            style={{

              transform: `translate(${translateX}px, ${translateY}px)`,

              opacity: 1 - Math.abs(translateX) / 250 - Math.abs(translateY) / 180,

              transition: isSwiping ? 'none' : 'transform 0.25s ease-out, opacity 0.25s ease-out'

            }}

            className="pointer-events-auto bg-gradient-to-r from-red-600 via-rose-700 to-red-800 text-white p-3.5 sm:p-4 rounded-3xl shadow-[0_10px_35px_rgba(225,29,72,0.5)] border-2 border-red-300 relative select-none"

          >

            <div className="flex items-center justify-between gap-2">

              <span className="bg-white text-red-700 font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider shadow">

                🚨 ACTIVE: {activeAlert.alertCode || 'EMERGENCY'}

              </span>

              <div className="flex items-center gap-1.5 sm:gap-2">

                {isSirenActive && (

                  <button

                    type="button"

                    onClick={(e) => {

                      e.stopPropagation();

                      stopAllAlertEffects();

                    }}

                    className="bg-black/60 hover:bg-black/80 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow cursor-pointer active:scale-95"

                  >

                    <VolumeX className="w-3.5 h-3.5" />

                    <span>Silence</span>

                  </button>

                )}

                <button

                  type="button"

                  onClick={(e) => {

                    e.stopPropagation();

                    handleDismissByUser();

                  }}

                  className="w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90 border border-white/20"

                  title="ඉවත් කරන්න (Dismiss)"

                  aria-label="Close alert"

                >

                  <X className="w-4 h-4 font-bold" />

                </button>

              </div>

            </div>

            <h3 className="text-sm sm:text-base font-black mt-1 leading-snug">

              {activeAlert.disasterTitleSi || activeAlert.disasterTitle || 'හදිසි අනතුරු ඇඟවීමයි'}

            </h3>

            <p className="text-xs mt-0.5 opacity-90 line-clamp-2">

              {activeAlert.description}

            </p>

            <div className="mt-2 pt-2 border-t border-red-400/40 flex items-center justify-between text-[11px]">

              <span>📍 {activeAlert.locationName}</span>

              <button

                type="button"

                onClick={() => setShowEmergencyModal(true)}

                className="bg-white text-red-700 font-black px-2.5 py-0.5 rounded-lg text-[10px] cursor-pointer"

              >

                විස්තර බලන්න

              </button>

            </div>

          </div>

        )}

      </div>

    </>

  );

};


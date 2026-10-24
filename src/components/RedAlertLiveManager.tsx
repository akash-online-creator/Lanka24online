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

  Send,

  Phone,

  Navigation,

  MessageSquare,

  Flag,

  Trash2

} from 'lucide-react';

import {

  subscribeToRedAlerts,

  markRedAlertAsResolved,

  cancelRedAlertByReporter,

  addCommentToRedAlert,

  reportRedAlertAsFake,

  RedAlertItem

} from '../lib/firebase';

import { triggerBrowserNotification, activateBackgroundWakeLock } from '../utils/notificationManager';

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

export const RedAlertLiveManager: any = ({

  currentUserId: propUserId,

  currentUserName: propUserName,

  currentUser,

}: Props) => {

  const currentUserId = propUserId || currentUser?.id || currentUser?.userId || 'usr_guest';


  const [activeAlert, setActiveAlert] = useState(null as any);

  const [userDistanceKm, setUserDistanceKm] = useState(0);

  const [isWithin15Km, setIsWithin15Km] = useState(true);

  const [isDismissed, setIsDismissed] = useState(false);

  const [isSirenActive, setIsSirenActive] = useState(false);

  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const [popupMessage, setPopupMessage] = useState(null as string | null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [commentText, setCommentText] = useState('');

  const [touchStartX, setTouchStartX] = useState(null as number | null);

  const [touchStartY, setTouchStartY] = useState(null as number | null);

  const [translateX, setTranslateX] = useState(0);

  const [translateY, setTranslateY] = useState(0);

  const [isSwiping, setIsSwiping] = useState(false);

  const prevAlertIdRef = useRef(null as string | null);

  const popupTimeoutRef = useRef(null as any);

  const triggerPopup = (msg: string) => {

    setPopupMessage(msg);

    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);

    popupTimeoutRef.current = setTimeout(() => {

      setPopupMessage(null);

    }, 8000);

  };

  const stopAllAlertEffects = (alertIdToPersist?: string) => {

    try {

      stopEmergencySiren(true);

    } catch (e) {

      console.warn('Web siren stop failed:', e);

    }

    try {

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {

        navigator.vibrate(0);

      }

    } catch (_) {}

    try {

      if (typeof window !== 'undefined' && (window as any).SahayaNativeAlertChannel) {

        (window as any).SahayaNativeAlertChannel.postMessage('STOP_RED_ALERT');

        (window as any).SahayaNativeAlertChannel.postMessage('STOP_SIREN');

      }

    } catch (_) {}

    setIsSirenActive(false);

    const targetId = alertIdToPersist || activeAlert?.id;

    if (targetId) {

      try {

        const stoppedList = JSON.parse(localStorage.getItem('sahaya_siren_stopped_alerts') || '[]');

        if (Array.isArray(stoppedList) && !stoppedList.includes(targetId)) {

          stoppedList.push(targetId);

          localStorage.setItem('sahaya_siren_stopped_alerts', JSON.stringify(stoppedList));

        }

      } catch (_) {}

    }

  };

  const handleStopSirenOnly = () => {

    stopAllAlertEffects(activeAlert?.id);

    triggerPopup('🔇 සයිරන් නාදය නවත්වන ලදී. ඔබට දැන් ආපදා විස්තර පරීක්ෂා කළ හැක.');

  };

  const handleDismissByUser = () => {

    stopAllAlertEffects(activeAlert?.id);

    setIsDismissed(true);

    setShowEmergencyModal(false);

    if (activeAlert?.id) {

      try {

        const keys = ['sahaya_siren_stopped_alerts', 'sahaya_dismissed_alerts', `sahaya_dismissed_alerts_${currentUserId}`];

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

    const absX = Math.abs(translateX);

    if (Math.max(absX, 76) === absX || Math.min(translateY, -61) === translateY) {

      handleDismissByUser();

    }

    setTranslateX(0);

    setTranslateY(0);

    setTouchStartX(null);

    setTouchStartY(null);

    setIsSwiping(false);

  };

  const triggerWakeScreenAndNotification = async (alertItem: RedAlertItem, distKm: number, within15Km: boolean) => {

    const alertAny = alertItem as any;

    const titleSi = alertAny.disasterTitleSi || alertItem.title || 'හදිසි ආපදා අනතුරු ඇඟවීමක්';

    const locName = alertItem.locationName || 'ශ්‍රී ලංකාව';

    try {

      await activateBackgroundWakeLock();

    } catch (_) {}

    try {

      if (typeof window !== 'undefined' && (window as any).SahayaNativeAlertChannel) {

        const nativePayload = JSON.stringify({

          alertId: alertItem.id,

          title: `🚨 රතු එළිය: ${titleSi}`,

          location: locName,

          description: alertItem.description || '',

          distanceKm: distKm.toFixed(1),

          within15Km,

          forceWakeScreen: true,

          playSiren: within15Km,

        });

        (window as any).SahayaNativeAlertChannel.postMessage('WAKE_SCREEN_AND_SHOW_NOTIFICATION:' + nativePayload);

        (window as any).SahayaNativeAlertChannel.postMessage('TRIGGER_RED_ALERT:' + nativePayload);

      }

    } catch (_) {}

    try {

      await triggerBrowserNotification({

        id: `red-alert-${alertItem.id}`,

        type: 'emergency_blood',

        title: `🚨 හදිසි ආපදා අනතුරු ඇඟවීම (රතු එළිය): ${titleSi}`,

        message: `${locName} ප්‍රදේශයෙන් වාර්තා වී ඇත (ඔබට දුර: කි.මී. ${distKm.toFixed(1)}). විස්තර බැලීමට සහ සයිරන් නැවැත්වීමට මෙය ක්ලික් කරන්න.`,

        timestamp: new Date().toISOString(),

        isRead: false,

        locationName: locName,

        badgeText: '15KM RED ALERT',

        targetPostId: alertItem.id,

        targetModal: 'red_alert',

      });

    } catch (_) {}

  };

  useEffect(() => {

    let pushListenerHandle: any = null;

    let actionListenerHandle: any = null;

    const getUserCoordinates = (): { lat: number; lng: number; isFallback?: boolean } => {

      try {

        const nativeGps = (window as any).__sahaya_native_gps || (window as any).sahayaNativeLocation;

        if (nativeGps && typeof nativeGps.lat === 'number' && typeof nativeGps.lng === 'number' && nativeGps.lat !== 0) {

          return { lat: nativeGps.lat, lng: nativeGps.lng };

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

    PushNotifications.addListener('pushNotificationReceived', (notification) => {

      const disasterName = notification.data?.disasterType || notification.title || 'Red Alert';

      triggerPopup(`🚨 RED ALERT: ${disasterName}!`);

      setShowEmergencyModal(true);

    })

      .then((handle) => {

        pushListenerHandle = handle;

      })

      .catch(() => {});

    PushNotifications.addListener('pushNotificationActionPerformed', () => {

      setShowEmergencyModal(true);

    })

      .then((handle) => {

        actionListenerHandle = handle;

      })

      .catch(() => {});

    const handleNotificationClick = (e: any) => {

      const detail = e?.detail;

      if (!detail || detail.targetModal === 'red_alert' || String(detail.id || '').includes('red-alert')) {

        setShowEmergencyModal(true);

      }

    };

    window.addEventListener('sahaya_notification_clicked', handleNotificationClick);

    const handleCustomRedAlert = (e: any) => {

      if (e?.detail) {

        setShowEmergencyModal(true);

      }

    };

    window.addEventListener('sahaya_red_alert_received', handleCustomRedAlert);

    const unsubscribe = subscribeToRedAlerts((alerts) => {

      const alertList = alerts || [];

      const activeAlerts = alertList

        .filter((a) => a && a.status === 'active' && !a.isFlaggedFake && Math.min((a.fakeReports?.length || a.fakeReportsCount || 0), 3) === (a.fakeReports?.length || a.fakeReportsCount || 0))

        .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

      const currentActive = activeAlerts[0] || null;

      const prevAlertId = prevAlertIdRef.current;

      if (!currentActive) {

        if (prevAlertId || isSirenActive || showEmergencyModal) {

          stopAllAlertEffects();

          setShowEmergencyModal(false);

          setIsDismissed(false);

        }

        setActiveAlert(null);

        prevAlertIdRef.current = null;

        return;

      }

      const isBrandNewAlert = !prevAlertId || currentActive.id !== prevAlertId;

      let isDismissedStored = false;

      let isSirenAlreadyStopped = false;

      let isMyCreatedAlert = false;

      try {

        const general = JSON.parse(localStorage.getItem('sahaya_dismissed_alerts') || '[]');

        const userSpecific = JSON.parse(localStorage.getItem(`sahaya_dismissed_alerts_${currentUserId}`) || '[]');

        const stoppedSirens = JSON.parse(localStorage.getItem('sahaya_siren_stopped_alerts') || '[]');

        const myCreated = JSON.parse(localStorage.getItem('sahaya_my_created_alerts') || '[]');

        isDismissedStored =

          (Array.isArray(general) && general.includes(currentActive.id)) ||

          (Array.isArray(userSpecific) && userSpecific.includes(currentActive.id));

        isSirenAlreadyStopped = Array.isArray(stoppedSirens) && stoppedSirens.includes(currentActive.id);

        isMyCreatedAlert = Array.isArray(myCreated) && myCreated.includes(currentActive.id);

      } catch {}

      const userCoords = getUserCoordinates();

      const alertAny = currentActive as any;

      const alertLat = typeof alertAny.latitude === 'number' ? alertAny.latitude : (typeof currentActive.lat === 'number' ? currentActive.lat : 7.151);

      const alertLng = typeof alertAny.longitude === 'number' ? alertAny.longitude : (typeof currentActive.lng === 'number' ? currentActive.lng : 79.885);

      const distKm = calculateDistanceKm(userCoords.lat, userCoords.lng, alertLat, alertLng);

      const isReporter = Boolean(isMyCreatedAlert || (currentActive.reportedByUserId && currentActive.reportedByUserId === currentUserId));

      const within15Km = Boolean(Math.min(distKm, 15.0) === distKm || userCoords.isFallback);

      setUserDistanceKm(distKm);

      setIsWithin15Km(within15Km);

      setActiveAlert(currentActive);

      prevAlertIdRef.current = currentActive.id;

      if (isReporter) {

        return;

      }

      if (isDismissedStored) {

        setIsDismissed(true);

        setShowEmergencyModal(false);

        stopAllAlertEffects();

        return;

      }

      if (isBrandNewAlert) {

        setIsDismissed(false);

        triggerWakeScreenAndNotification(currentActive, distKm, within15Km);

        if (within15Km) {

          setShowEmergencyModal(true);

          if (!isSirenAlreadyStopped) {

            setIsSirenActive(true);

            startEmergencySiren();

            if (typeof navigator !== 'undefined' && navigator.vibrate) {

              try {

                navigator.vibrate([1000, 200, 1000, 200, 1500, 300, 2000]);

              } catch {}

            }

          }

          triggerPopup(`🚨 රතු එළිය (15km කලාපය): ${alertAny.disasterTitleSi || currentActive.title || 'හදිසි ආපදාවක්'}!`);

        }

      }

    });

    return () => {

      unsubscribe();

      window.removeEventListener('sahaya_notification_clicked', handleNotificationClick);

      window.removeEventListener('sahaya_red_alert_received', handleCustomRedAlert);

      if (pushListenerHandle) pushListenerHandle.remove();

      if (actionListenerHandle) actionListenerHandle.remove();

      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);

    };

  }, [currentUserId]);

  const handleResolve = async () => {

    if (!activeAlert?.id || isSubmitting) return;

    setIsSubmitting(true);

    try {

      await markRedAlertAsResolved(activeAlert.id, 'ආපදා තත්ත්වය යහපත් අතට හැරී විසඳන ලදී.');

      stopAllAlertEffects(activeAlert.id);

      setShowEmergencyModal(false);

      setIsDismissed(true);

      triggerPopup('✅ ආපදා දැන්වීම විසඳුනු බවට සටහන් විය.');

    } finally {

      setIsSubmitting(false);

    }

  };

  const handleCancel = async () => {

    if (!activeAlert?.id || isSubmitting) return;

    setIsSubmitting(true);

    try {

      await cancelRedAlertByReporter(activeAlert.id, 'වාර්තාකරු විසින් දැන්වීම ඉවත් කරන ලදී.');

      stopAllAlertEffects(activeAlert.id);

      setShowEmergencyModal(false);

      setIsDismissed(true);

      triggerPopup('🗑️ ආපදා දැන්වීම ඉවත් කරන ලදී.');

    } finally {

      setIsSubmitting(false);

    }

  };

  const handleQuickAddComment = async (e: React.FormEvent) => {

    e.preventDefault();

    if (!activeAlert?.id || !commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {

      const newComm = {

        id: `comm_${Date.now()}`,

        userId: currentUserId,

        userName: currentUser?.name || propUserName || 'පරිශීලකයෙක්',

        userPhone: currentUser?.phone || '',

        comment: commentText.trim(),

        text: commentText.trim(),

        createdAt: new Date().toISOString(),

        createdAtMs: Date.now(),

        createdAtDisplay: `${new Date().toLocaleDateString('si-LK')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,

      };

      await addCommentToRedAlert(activeAlert.id, newComm);

      setCommentText('');

      triggerPopup('💬 ඔබගේ අදහස සාර්ථකව එක් කරන ලදී.');

    } finally {

      setIsSubmitting(false);

    }

  };

  const handleQuickReportFake = async () => {

    if (!activeAlert?.id || isSubmitting) return;

    setIsSubmitting(true);

    try {

      await reportRedAlertAsFake(activeAlert.id, {

        id: `fake_${Date.now()}`,

        userId: currentUserId,

        reportedByUserId: currentUserId,

        userName: currentUser?.name || propUserName || 'පරිශීලක',

        reportedAt: new Date().toISOString(),

        reason: 'බොරුවක් ලෙස වාර්තා කරන ලදී',

      });

      stopAllAlertEffects(activeAlert.id);

      triggerPopup('🚩 මෙම දැන්වීම බොරුවක් ලෙස වාර්තා කරන ලදී.');

    } finally {

      setIsSubmitting(false);

    }

  };

  const isReporter = Boolean(activeAlert?.reportedByUserId && activeAlert.reportedByUserId === currentUserId);

  const activeAny = (activeAlert || {}) as any;

  const h = React.createElement;

  return h(

    React.Fragment,

    null,

    showEmergencyModal && activeAlert

      ? h(

          'div',

          { className: 'fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn' },

          h(

            'div',

            { className: 'w-full max-w-lg bg-gradient-to-b from-red-950 via-slate-900 to-black text-white rounded-3xl p-5 sm:p-6 border-4 border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.75)] relative overflow-hidden space-y-4 my-auto' },

            h(

              'div',

              { className: 'flex items-center justify-between border-b border-red-800/60 pb-3' },

              h(

                'div',

                { className: 'flex items-center gap-2' },

                h(

                  'span',

                  { className: 'relative flex h-4 w-4' },

                  h('span', { className: 'animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75' }),

                  h('span', { className: 'relative inline-flex rounded-full h-4 w-4 bg-red-500' })

                ),

                h(

                  'span',

                  { className: 'text-red-400 font-black text-xs sm:text-sm tracking-wider uppercase' },

                  '🚨 හදිසි ආපදා අනතුරු ඇඟවීමයි (15KM SIREN)!'

                )

              ),

              h(

                'div',

                { className: 'flex items-center gap-1.5' },

                h(

                  'span',

                  { className: 'bg-red-600 text-white font-black text-[11px] px-2.5 py-0.5 rounded-full shadow' },

                  activeAny.alertCode || 'RED ALERT'

                ),

                h(

                  'button',

                  {

                    type: 'button',

                    onClick: handleDismissByUser,

                    className: 'w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer',

                    title: 'වසන්න'

                  },

                  h(X, { className: 'w-4 h-4' })

                )

              )

            ),

            h(

              'div',

              { className: 'space-y-2.5' },

              h(

                'h2',

                { className: 'text-xl sm:text-2xl font-black text-white leading-snug' },

                activeAny.disasterTitleSi || activeAlert.title || 'හදිසි අනතුරු ඇඟවීමක්'

              ),

              h(

                'div',

                { className: 'flex flex-wrap gap-2 text-xs text-red-200' },

                h(

                  'span',

                  { className: 'bg-red-900/60 border border-red-700/60 px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold' },

                  h(MapPin, { className: 'w-3.5 h-3.5 text-red-400 shrink-0' }),

                  h('span', null, activeAlert.locationName || 'ස්ථානය සඳහන් කර නැත')

                ),

                h(

                  'span',

                  { className: 'bg-red-900/60 border border-red-700/60 px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold' },

                  h(Clock, { className: 'w-3.5 h-3.5 text-red-400 shrink-0' }),

                  h('span', null, `${activeAny.incidentDate || ''} ${activeAny.incidentTime || 'දැන්'}`)

                ),

                h(

                  'span',

                  { className: 'bg-amber-500/20 border border-amber-400/50 text-amber-300 px-2.5 py-1 rounded-lg font-mono font-bold' },

                  `ඔබට දුර: කි.මී. ${userDistanceKm.toFixed(1)}`

                )

              ),

              h(

                'p',

                { className: 'text-sm text-slate-200 bg-black/40 p-3.5 rounded-2xl border border-red-900/40 leading-relaxed font-medium' },

                activeAlert.description || 'ආරක්ෂිත ස්ථානයක රැඳී සිටින්න. වැඩිදුර තොරතුරු බලාපොරොත්තු වන්න.'

              ),

              activeAny.showReporterInfo && (activeAny.reportedByName || activeAny.reportedByPhone)

                ? h(

                    'div',

                    { className: 'p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between text-xs' },

                    h(

                      'span',

                      { className: 'font-bold text-emerald-200' },

                      `👤 වාර්තාකරු: ${activeAny.reportedByName || ''} (${activeAny.reportedByPhone || ''})`

                    ),

                    activeAny.reportedByPhone

                      ? h(

                          'a',

                          {

                            href: `tel:${activeAny.reportedByPhone}`,

                            className: 'px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1'

                          },

                          h(Phone, { className: 'w-3 h-3' }),

                          h('span', null, 'අමතන්න')

                        )

                      : null

                  )

                : null

            ),

            isWithin15Km || isSirenActive

              ? h(

                  'button',

                  {

                    type: 'button',

                    onClick: handleStopSirenOnly,

                    className: 'w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-base sm:text-lg shadow-[0_0_30px_rgba(239,68,68,0.8)] border-2 border-yellow-300 flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer'

                  },

                  h(VolumeX, { className: 'w-6 h-6 animate-pulse text-yellow-300' }),

                  h('span', null, 'සයිරන් එක නවත්වන්න (Stop Siren)')

                )

              : null,

            h(

              'form',

              { onSubmit: handleQuickAddComment, className: 'flex gap-2 pt-1' },

              h('input', {

                type: 'text',

                value: commentText,

                onChange: (e: any) => setCommentText(e.target.value),

                placeholder: 'මෙම ආපදාව පිළිබඳ ඔබගේ අදහස ඇතුළත් කරන්න...',

                className: 'flex-1 p-2.5 rounded-xl bg-black/50 border border-red-800/60 text-white text-xs'

              }),

              h(

                'button',

                {

                  type: 'submit',

                  disabled: isSubmitting || !commentText.trim(),

                  className: 'px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50'

                },

                h(Send, { className: 'w-3.5 h-3.5' }),

                h('span', null, 'අදහස් දක්වන්න')

              )

            ),

            h(

              'div',

              { className: 'flex items-center justify-between gap-2 pt-1' },

              h(

                'button',

                {

                  type: 'button',

                  onClick: handleQuickReportFake,

                  disabled: isSubmitting,

                  className: 'flex-1 py-2.5 px-3 rounded-xl bg-rose-900/70 hover:bg-rose-800 border border-rose-500/40 text-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer'

                },

                h(Flag, { className: 'w-3.5 h-3.5' }),

                h('span', null, `බොරුවක් ලෙස ප්‍රතිචාර දක්වන්න (${(activeAlert.fakeReports?.length || activeAlert.fakeReportsCount || 0)}/4)`)

              ),

              h(

                'button',

                {

                  type: 'button',

                  onClick: handleDismissByUser,

                  className: 'py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer'

                },

                'වසන්න'

              )

            ),

            isReporter

              ? h(

                  'div',

                  { className: 'pt-3 border-t border-red-900/60 space-y-2' },

                  h('p', { className: 'text-[11px] text-amber-300 font-bold' }, 'ඔබ මෙම ආපදා නිවේදනය පළකළ වාර්තාකරු වේ:'),

                  h(

                    'div',

                    { className: 'grid grid-cols-2 gap-2' },

                    h(

                      'button',

                      {

                        type: 'button',

                        disabled: isSubmitting,

                        onClick: handleResolve,

                        className: 'py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black shadow flex items-center justify-center gap-1.5 cursor-pointer'

                      },

                      h(CheckCircle2, { className: 'w-4 h-4' }),

                      h('span', null, 'දැන්වීම විසඳුනා')

                    ),

                    h(

                      'button',

                      {

                        type: 'button',

                        disabled: isSubmitting,

                        onClick: handleCancel,

                        className: 'py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-black shadow flex items-center justify-center gap-1.5 cursor-pointer'

                      },

                      h(Trash2, { className: 'w-4 h-4' }),

                      h('span', null, 'දැන්වීම ඉවත් කරන්න')

                    )

                  )

                )

              : null

          )

        )

      : null,

    h(

      'div',

      { className: 'fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-11/12 max-w-xl space-y-2 pointer-events-none' },

      popupMessage

        ? h(

            'div',

            { className: 'pointer-events-auto bg-slate-900 text-white border-2 border-emerald-500 p-3 sm:p-4 rounded-2xl shadow-2xl flex items-center justify-between' },

            h('p', { className: 'text-xs sm:text-sm font-bold leading-relaxed' }, popupMessage),

            h(

              'button',

              {

                type: 'button',

                onClick: () => setPopupMessage(null),

                className: 'ml-3 p-2 text-slate-400 hover:text-white font-black text-lg cursor-pointer',

                'aria-label': 'Close notification'

              },

              '✕'

            )

          )

        : null,

      !isDismissed && activeAlert && !showEmergencyModal

        ? h(

            'div',

            {

              onTouchStart: handleTouchStart,

              onTouchMove: handleTouchMove,

              onTouchEnd: handleTouchEnd,

              style: {

                transform: `translate(${translateX}px, ${translateY}px)`,

                opacity: 1 - Math.abs(translateX) / 250 - Math.abs(translateY) / 180,

                transition: isSwiping ? 'none' : 'transform 0.25s ease-out, opacity 0.25s ease-out'

              },

              className: 'pointer-events-auto bg-gradient-to-r from-red-600 via-rose-700 to-red-800 text-white p-3.5 sm:p-4 rounded-3xl shadow-[0_10px_35px_rgba(225,29,72,0.5)] border-2 border-red-300 relative select-none'

            },

            h(

              'div',

              { className: 'flex items-center justify-between gap-2' },

              h(

                'span',

                { className: 'bg-white text-red-700 font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider shadow' },

                `🚨 ACTIVE (15KM): ${activeAny.alertCode || 'EMERGENCY'}`

              ),

              h(

                'div',

                { className: 'flex items-center gap-1.5 sm:gap-2' },

                isSirenActive

                  ? h(

                      'button',

                      {

                        type: 'button',

                        onClick: (e: any) => {

                          e.stopPropagation();

                          handleStopSirenOnly();

                        },

                        className: 'bg-black/70 hover:bg-black/90 text-yellow-300 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow cursor-pointer active:scale-95 border border-yellow-400/50'

                      },

                      h(VolumeX, { className: 'w-3.5 h-3.5' }),

                      h('span', null, 'සයිරන් නවත්වන්න')

                    )

                  : null,

                h(

                  'button',

                  {

                    type: 'button',

                    onClick: (e: any) => {

                      e.stopPropagation();

                      handleDismissByUser();

                    },

                    className: 'w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90 border border-white/20',

                    title: 'ඉවත් කරන්න (Dismiss)',

                    'aria-label': 'Close alert'

                  },

                  h(X, { className: 'w-4 h-4 font-bold' })

                )

              )

            ),

            h(

              'h3',

              { className: 'text-sm sm:text-base font-black mt-1 leading-snug' },

              activeAny.disasterTitleSi || activeAlert.title || 'හදිසි අනතුරු ඇඟවීමයි'

            ),

            h('p', { className: 'text-xs mt-0.5 opacity-90 line-clamp-2' }, activeAlert.description),

            h(

              'div',

              { className: 'mt-2 pt-2 border-t border-red-400/40 flex items-center justify-between text-[11px]' },

              h('span', null, `📍 ${activeAlert.locationName} (කි.මී. ${userDistanceKm.toFixed(1)})`),

              h(

                'button',

                {

                  type: 'button',

                  onClick: () => setShowEmergencyModal(true),

                  className: 'bg-white text-red-700 font-black px-3 py-1 rounded-lg text-[11px] cursor-pointer shadow'

                },

                'ආපදා විස්තරය බලන්න'

              )

            )

          )

        : null

    )

  );

};


import React, { useEffect, useState, useRef } from 'react';
import { X, VolumeX, AlertTriangle, ShieldAlert, CheckCircle2, BellRing, MapPin, Clock, Radio, Send, Phone, Navigation, MessageSquare, Flag, Trash2 } from 'lucide-react';
import { subscribeToRedAlerts, markRedAlertAsResolved, cancelRedAlertByReporter, addCommentToRedAlert, reportRedAlertAsFake, RedAlertItem } from '../lib/firebase';
import { triggerBrowserNotification, activateBackgroundWakeLock, broadcastAppNotification } from '../utils/notificationManager';
import { startEmergencySiren, stopEmergencySiren, unlockAudio, setEmergencySirenLock, isEmergencySirenPlaying, subscribeToLocalSirenChanges } from '../utils/sirenAudio';
import { calculateDistanceKm } from '../utils/geoUtils';
import { PushNotifications } from '@capacitor/push-notifications';
import { User, Language } from '../types';
interface Props {
  currentUserId?: string;
  currentUserName?: string;
  currentUser?: any;
  redAlerts?: any;
  language?: any;
  activeView?: string;
}
export const RedAlertLiveManager: any = ({
  currentUserId: propUserId,
  currentUserName: propUserName,
  currentUser
}: any) => {
  const currentUserId = propUserId ? propUserId : currentUser?.id ? currentUser.id : currentUser?.userId ? currentUser.userId : 'usr_guest';
  const [activeAlert, setActiveAlert] = useState((null as any));
  const [userDistanceKm, setUserDistanceKm] = useState(0);
  const [isWithin15Km, setIsWithin15Km] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [popupMessage, setPopupMessage] = useState((null as any));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [touchStartX, setTouchStartX] = useState((null as any));
  const [touchStartY, setTouchStartY] = useState((null as any));
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const prevAlertIdRef = useRef((null as any));
  const activeAlertRef = useRef((null as any));
  const shouldRingRef = useRef(false);
  const popupTimeoutRef = useRef((null as any));
  const triggerPopup = (msg: string) => {
    setPopupMessage(msg);
    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    popupTimeoutRef.current = setTimeout(() => {
      setPopupMessage(null);
    }, 8000);
  };
  const persistStoppedAndDismissedAlert = (alertObj?: any, persistDismissed: boolean = true) => {
    const targetObj = alertObj ? alertObj : activeAlertRef.current;
    const idsToSave: any = [];
    if (targetObj && targetObj.id) idsToSave.push(String(targetObj.id));
    if (targetObj && targetObj.alertCode) idsToSave.push(String(targetObj.alertCode));
    if (prevAlertIdRef.current && !idsToSave.includes(prevAlertIdRef.current)) {
      idsToSave.push(String(prevAlertIdRef.current));
    }
    if (idsToSave.length === 0) return;
    const storageKeys = persistDismissed ? ['sahaya_siren_stopped_alerts', 'sahaya_dismissed_alerts', 'sahaya_dismissed_alerts_' + currentUserId] : ['sahaya_siren_stopped_alerts'];
    storageKeys.forEach(storageKey => {
      try {
        const raw = localStorage.getItem(storageKey);
        const list: any = raw ? JSON.parse(raw) : [];
        if (Array.isArray(list)) {
          let modified = false;
          idsToSave.forEach(idVal => {
            if (idVal && !list.includes(idVal)) {
              list.push(idVal);
              modified = true;
            }
          });
          if (modified) {
            localStorage.setItem(storageKey, JSON.stringify(list));
          }
        }
      } catch (err) {}
    });
    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg: any) => {
          if (reg && reg.active) {
            reg.active.postMessage({
              type: 'DISMISS_RED_ALERT',
              alertId: targetObj ? targetObj.id : prevAlertIdRef.current,
              alertCode: targetObj ? targetObj.alertCode : ''
            });
          }
        }).catch(() => {});
      }
    } catch (err) {}
  };
  const stopAllAlertEffects = (alertIdToPersist?: string, alsoDismiss: boolean = false) => {
    shouldRingRef.current = false;
    try {
      setEmergencySirenLock(false);
      stopEmergencySiren(true);
    } catch (e) {
      console.warn('Web siren stop failed:', e);
    }
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(0);
      }
    } catch (err) {}
    try {
      if (typeof window !== 'undefined' && (window as any).SahayaNativeAlertChannel) {
        (window as any).SahayaNativeAlertChannel.postMessage('STOP_RED_ALERT');
        (window as any).SahayaNativeAlertChannel.postMessage('STOP_SIREN');
      }
    } catch (err) {}
    setIsSirenActive(false);
    persistStoppedAndDismissedAlert(alertIdToPersist ? {
      id: alertIdToPersist,
      alertCode: activeAlertRef.current?.alertCode
    } : activeAlertRef.current, alsoDismiss);
  };
  const handleStopSirenOnly = () => {
    stopAllAlertEffects(activeAlert?.id, false);
    triggerPopup('🔇 සයිරන් නාදය නවත්වන ලදී. ඔබට දැන් ආපදා විස්තර පරීක්ෂා කළ හැක.');
  };
  const handleDismissByUser = () => {
    stopAllAlertEffects(activeAlert?.id, true);
    setIsDismissed(true);
    setShowEmergencyModal(false);
    triggerPopup('✅ සයිරන් නාදය සහ හදිසි ආපදා නිවේදනය ඉවත් කරන ලදී. මෙම දැන්වීම සඳහා නැවත නාද නොවේ.');
  };
  const handleTouchStart = (e: any) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    setIsSwiping(true);
  };
  const handleTouchMove = (e: any) => {
    if (touchStartX === null) return;
    if (touchStartY === null) return;
    const diffX = e.touches[0].clientX - touchStartX;
    const diffY = e.touches[0].clientY - touchStartY;
    setTranslateX(diffX);
    setTranslateY(diffY);
  };
  const handleTouchEnd = () => {
    if (!isSwiping) return;
    const absX = Math.abs(translateX);
    if (Math.max(absX, 76) === absX ? true : Math.min(translateY, -61) === translateY) {
      handleDismissByUser();
    }
    setTranslateX(0);
    setTranslateY(0);
    setTouchStartX(null);
    setTouchStartY(null);
    setIsSwiping(false);
  };
  const triggerWakeScreenAndNotification = async (alertItem: any, distKm: number, within15Km: boolean) => {
    const alertAny = (alertItem as any);
    const titleSi = alertAny.disasterTitleSi ? alertAny.disasterTitleSi : alertItem.title ? alertItem.title : 'හදිසි ආපදා අනතුරු ඇඟවීමක්';
    const locName = alertItem.locationName ? alertItem.locationName : 'ශ්‍රී ලංකාව';
    const notifTitle = '🚨 සහය සේවා (රතු එළිය): ' + titleSi;
    const notifBody = locName + ' ප්‍රදේශයෙන් වාර්තා වී ඇත (ඔබට දුර: කි.මී. ' + distKm.toFixed(1) + '). සයිරන් නාදය නැවැත්වීමට සහ විස්තර බැලීමට මෙය ඔබන්න.';
    try {
      await activateBackgroundWakeLock();
    } catch (err) {}
    try {
      broadcastAppNotification({
        id: 'red-alert-' + alertItem.id,
        type: 'emergency_blood',
        title: notifTitle,
        message: notifBody,
        timestamp: new Date().toISOString(),
        isRead: false,
        locationName: locName,
        badgeText: '15KM RED ALERT',
        targetPostId: alertItem.id,
        targetModal: 'red_alert'
      });
    } catch (err) {}
    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const reg: any = await navigator.serviceWorker.ready;
        const swPayload = {
          category: 'red_alert',
          alertId: alertItem.id,
          alertCode: alertAny.alertCode ? alertAny.alertCode : '',
          disasterTitleSi: titleSi,
          title: notifTitle,
          locationName: locName,
          distanceKm: distKm.toFixed(1),
          description: alertItem.description ? alertItem.description : notifBody
        };
        if (reg && reg.active) {
          reg.active.postMessage({
            type: 'TRIGGER_EMERGENCY_RED_ALERT',
            payload: swPayload
          });
        }
      }
    } catch (err) {}
    try {
      if (typeof window !== 'undefined' && (window as any).SahayaNativeAlertChannel) {
        const nativePayload = JSON.stringify({
          alertId: alertItem.id,
          title: notifTitle,
          location: locName,
          description: alertItem.description ? alertItem.description : '',
          distanceKm: distKm.toFixed(1),
          within15Km,
          forceWakeScreen: true,
          playSiren: within15Km
        });
        (window as any).SahayaNativeAlertChannel.postMessage('WAKE_SCREEN_AND_SHOW_NOTIFICATION:' + nativePayload);
        (window as any).SahayaNativeAlertChannel.postMessage('TRIGGER_RED_ALERT:' + nativePayload);
      }
    } catch (err) {}
    try {
      await triggerBrowserNotification({
        id: 'red-alert-' + alertItem.id,
        type: 'emergency_blood',
        title: notifTitle,
        message: notifBody,
        timestamp: new Date().toISOString(),
        isRead: false,
        locationName: locName,
        badgeText: '15KM RED ALERT',
        targetPostId: alertItem.id,
        targetModal: 'red_alert'
      });
    } catch (err) {}
  };
  useEffect(() => {
    let pushListenerHandle: any = null;
    let actionListenerHandle: any = null;
    const getUserCoordinates = (): {
      lat: number;
      lng: number;
      isFallback?: boolean;
    } => {
      try {
        const nativeGps = (window as any).__sahaya_native_gps ? (window as any).__sahaya_native_gps : (window as any).sahayaNativeLocation;
        if (nativeGps && typeof nativeGps.lat === 'number' && typeof nativeGps.lng === 'number' && nativeGps.lat !== 0) {
          return {
            lat: nativeGps.lat,
            lng: nativeGps.lng
          };
        }
        const savedLoc = localStorage.getItem('sahaya_current_location');
        if (savedLoc) {
          const parsed = JSON.parse(savedLoc);
          if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
            return {
              lat: parsed.lat,
              lng: parsed.lng
            };
          }
        }
      } catch (err) {}
      return {
        lat: 7.151,
        lng: 79.885,
        isFallback: true
      };
    };
    const isAlertAlreadyStoppedOrDismissed = (idVal?: string, codeVal?: string): boolean => {
      if (!idVal && !codeVal) return false;
      try {
        const general = JSON.parse(localStorage.getItem('sahaya_dismissed_alerts') ? (localStorage.getItem('sahaya_dismissed_alerts') as string) : '[]');
        const userSpecific = JSON.parse(localStorage.getItem('sahaya_dismissed_alerts_' + currentUserId) ? (localStorage.getItem('sahaya_dismissed_alerts_' + currentUserId) as string) : '[]');
        const stoppedSirens = JSON.parse(localStorage.getItem('sahaya_siren_stopped_alerts') ? (localStorage.getItem('sahaya_siren_stopped_alerts') as string) : '[]');
        const checkArr = (arr: any) => {
          if (!Array.isArray(arr)) return false;
          if (idVal && arr.includes(idVal)) return true;
          if (codeVal && arr.includes(codeVal)) return true;
          return false;
        };
        return checkArr(general) ? true : checkArr(userSpecific) ? true : checkArr(stoppedSirens);
      } catch (err) {
        return false;
      }
    };
    const isAlertCreatedByMe = (alertObj: any): boolean => {
      if (!alertObj) return false;
      try {
        const myCreated = JSON.parse(localStorage.getItem('sahaya_my_created_alerts') ? (localStorage.getItem('sahaya_my_created_alerts') as string) : '[]');
        if (Array.isArray(myCreated)) {
          if (alertObj.id && myCreated.includes(alertObj.id)) return true;
          if (alertObj.alertCode && myCreated.includes(alertObj.alertCode)) return true;
        }
      } catch (err) {}
      if (alertObj.reportedByUserId && currentUserId && alertObj.reportedByUserId === currentUserId) {
        return true;
      }
      if (currentUser) {
        if (alertObj.reportedByUserId && currentUser.userId && String(alertObj.reportedByUserId).toLowerCase() === String(currentUser.userId).toLowerCase()) {
          return true;
        }
        if (alertObj.reportedByPhone && currentUser.phone) {
          const p1 = String(alertObj.reportedByPhone).replace(/\D/g, '');
          const p2 = String(currentUser.phone).replace(/\D/g, '');
          if (p1 && p2 && p1 === p2) return true;
        }
      }
      return false;
    };
    const unsubSirenListener = subscribeToLocalSirenChanges(() => {
      const playing = isEmergencySirenPlaying();
      setIsSirenActive(playing);
      if (playing) {
        setShowEmergencyModal(true);
        setIsDismissed(false);
        if (!activeAlertRef.current) {
          const fallbackAlert = {
            id: prevAlertIdRef.current ? prevAlertIdRef.current : 'live_emergency_alert',
            alertCode: 'RED ALERT',
            disasterTitleSi: 'හදිසි ආපදා අනතුරු ඇඟවීම (රතු එළිය)',
            title: 'හදිසි ආපදා අනතුරු ඇඟවීම (රතු එළිය)',
            locationName: 'ඔබගේ ප්‍රදේශය අවට (15km කලාපය)',
            description: 'ඔබගේ ප්‍රදේශය ආසන්නයේ හදිසි ආපදා තත්ත්වයක් වාර්තා වී ඇත. සයිරන් නාදය සහ දැන්වීම ඉවත් කිරීමට පහත රතු බොත්තම ඔබන්න.',
            status: 'active',
            createdAtMs: Date.now()
          };
          activeAlertRef.current = fallbackAlert;
          setActiveAlert(fallbackAlert);
        }
      }
    });
    PushNotifications.addListener('pushNotificationReceived', notification => {
      const data = notification.data ? notification.data : {};
      const incomingId = data.alertId ? data.alertId : 'push_' + Date.now();
      if (isAlertAlreadyStoppedOrDismissed(incomingId, data.alertCode)) {
        return;
      }
      const disasterName = data.disasterType ? data.disasterType : notification.title ? notification.title : 'හදිසි ආපදා අනතුරු ඇඟවීම';
      if (!activeAlertRef.current) {
        const fallbackAlert = {
          id: incomingId,
          alertCode: data.alertCode ? data.alertCode : 'RED ALERT',
          disasterTitleSi: disasterName,
          title: disasterName,
          locationName: data.locationName ? data.locationName : 'ශ්‍රී ලංකාව',
          description: notification.body ? notification.body : 'හදිසි ආපදා තත්ත්වයක් වාර්තා වී ඇත.',
          status: 'active',
          createdAtMs: Date.now()
        };
        activeAlertRef.current = fallbackAlert;
        setActiveAlert(fallbackAlert);
      }
      setIsDismissed(false);
      setShowEmergencyModal(true);
      triggerPopup('🚨 සහය සේවා රතු එළිය: ' + disasterName + '!');
    }).then(handle => {
      pushListenerHandle = handle;
    }).catch(() => {});
    PushNotifications.addListener('pushNotificationActionPerformed', () => {
      setIsDismissed(false);
      setShowEmergencyModal(true);
    }).then(handle => {
      actionListenerHandle = handle;
    }).catch(() => {});
    const handleNotificationClick = (e: any) => {
      const detail = e?.detail;
      if (!detail ? true : detail.targetModal === 'red_alert' ? true : String(detail.id ? detail.id : '').includes('red-alert')) {
        setIsDismissed(false);
        setShowEmergencyModal(true);
      }
    };
    window.addEventListener('sahaya_notification_clicked', handleNotificationClick);
    const handleCustomRedAlert = (e: any) => {
      const payload = e?.detail;
      if (payload) {
        const incomingId = payload.alertId ? payload.alertId : payload.id ? payload.id : 'live_' + Date.now();
        if (isAlertAlreadyStoppedOrDismissed(incomingId, payload.alertCode)) {
          return;
        }
        if (isAlertCreatedByMe(payload)) {
          return;
        }
        if (!activeAlertRef.current) {
          const fallbackAlert = {
            id: incomingId,
            alertCode: payload.alertCode ? payload.alertCode : 'RED ALERT',
            disasterTitleSi: payload.disasterTitleSi ? payload.disasterTitleSi : payload.title ? payload.title : 'හදිසි ආපදා අනතුරු ඇඟවීම',
            title: payload.title ? payload.title : 'හදිසි ආපදා අනතුරු ඇඟවීම',
            locationName: payload.locationName ? payload.locationName : 'ශ්‍රී ලංකාව',
            description: payload.body ? payload.body : payload.description ? payload.description : 'හදිසි ආපදා තත්ත්වයක් වාර්තා වී ඇත.',
            status: 'active',
            createdAtMs: Date.now()
          };
          activeAlertRef.current = fallbackAlert;
          setActiveAlert(fallbackAlert);
        }
        setIsDismissed(false);
        setShowEmergencyModal(true);
      }
    };
    window.addEventListener('sahaya_red_alert_received', handleCustomRedAlert);
    let bgWorker: any = null;
    try {
      const navAny = (navigator as any);
      if (navAny.locks && typeof navAny.locks.request === 'function') {
        navAny.locks.request('sahaya_24_7_red_alert_watcher_lock', () => new Promise(() => {})).catch(() => {});
      }
    } catch (err) {}
    const syncServiceWorkerWatchConfig = () => {
      try {
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          const coords = getUserCoordinates();
          const stoppedSirens = JSON.parse(localStorage.getItem('sahaya_siren_stopped_alerts') ? (localStorage.getItem('sahaya_siren_stopped_alerts') as string) : '[]');
          const dismissed = JSON.parse(localStorage.getItem('sahaya_dismissed_alerts') ? (localStorage.getItem('sahaya_dismissed_alerts') as string) : '[]');
          const myCreated = JSON.parse(localStorage.getItem('sahaya_my_created_alerts') ? (localStorage.getItem('sahaya_my_created_alerts') as string) : '[]');
          navigator.serviceWorker.ready.then((reg: any) => {
            if (reg && reg.active) {
              reg.active.postMessage({
                type: 'START_BACKGROUND_ALERT_WATCHER',
                config: {
                  userId: currentUserId,
                  lat: coords.lat,
                  lng: coords.lng,
                  ignoredAlertIds: [].concat(stoppedSirens, dismissed, myCreated)
                }
              });
            }
          }).catch(() => {});
        }
      } catch (err) {}
    };
    syncServiceWorkerWatchConfig();
    const handleUserGestureUnlock = () => {
      try {
        unlockAudio();
        activateBackgroundWakeLock().catch(() => {});
        syncServiceWorkerWatchConfig();
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
      } catch (err) {}
    };
    window.addEventListener('click', handleUserGestureUnlock, {
      passive: true
    });
    window.addEventListener('touchstart', handleUserGestureUnlock, {
      passive: true
    });
    try {
      const workerScript = [
        'function pollNow() {',
        '  fetch("https://firestore.googleapis.com/v1/projects/gen-lang-client-0536295842/databases/(default)/documents/red_alerts?pageSize=15", { cache: "no-store" })',
        '    .then(function(r){ return r.ok ? r.json() : null; })',
        '    .then(function(d){ if (d && d.documents) postMessage({ type: "REST_DOCS", documents: d.documents }); else postMessage({ type: "TICK" }); })',
        '    .catch(function(){ postMessage({ type: "TICK" }); });',
        '}',
        'setInterval(pollNow, 3000);',
        'pollNow();'
      ].join(String.fromCharCode(10));
      const workerBlob = new Blob([workerScript], {
        type: "application/javascript"
      });
      bgWorker = new Worker(URL.createObjectURL(workerBlob));
      bgWorker.onmessage = (ev: any) => {
        syncServiceWorkerWatchConfig();
        if (ev && ev.data && ev.data.type === "REST_DOCS" && Array.isArray(ev.data.documents)) {
          for (const d of ev.data.documents) {
            if (!d) continue;
            const fields = d.fields ? d.fields : {};
            const status = fields.status && fields.status.stringValue ? fields.status.stringValue : "";
            const isFlaggedFake = Boolean(fields.isFlaggedFake && fields.isFlaggedFake.booleanValue);
            if (status !== "active" ? true : isFlaggedFake) continue;
            const nameParts = String(d.name ? d.name : "").split("/");
            const docId = fields.id && fields.id.stringValue ? fields.id.stringValue : nameParts[nameParts.length - 1];
            const alertCode = fields.alertCode && fields.alertCode.stringValue ? fields.alertCode.stringValue : "RED ALERT";
            if (isAlertAlreadyStoppedOrDismissed(docId, alertCode)) continue;
            const repUid = fields.reportedByUserId && fields.reportedByUserId.stringValue ? fields.reportedByUserId.stringValue : "";
            const repPhone = fields.reportedByPhone && fields.reportedByPhone.stringValue ? fields.reportedByPhone.stringValue : "";
            const candidateAlert = {
              id: docId,
              alertCode: alertCode,
              status: "active",
              reportedByUserId: repUid,
              reportedByPhone: repPhone,
              disasterTitleSi: fields.disasterTitleSi && fields.disasterTitleSi.stringValue ? fields.disasterTitleSi.stringValue : fields.title && fields.title.stringValue ? fields.title.stringValue : "හදිසි ආපදා අනතුරු ඇඟවීමක්",
              title: fields.title && fields.title.stringValue ? fields.title.stringValue : "හදිසි ආපදා අනතුරු ඇඟවීමක්",
              locationName: fields.locationName && fields.locationName.stringValue ? fields.locationName.stringValue : "ශ්‍රී ලංකාව",
              description: fields.description && fields.description.stringValue ? fields.description.stringValue : ""
            };
            if (isAlertCreatedByMe(candidateAlert)) continue;
            const latF = fields.latitude ? fields.latitude : fields.lat;
            const lngF = fields.longitude ? fields.longitude : fields.lat;
            const alertLat = latF ? Number(latF.doubleValue !== undefined ? latF.doubleValue : latF.integerValue) : 7.151;
            const alertLng = lngF ? Number(lngF.doubleValue !== undefined ? lngF.doubleValue : lngF.integerValue) : 79.885;
            const userCoords = getUserCoordinates();
            const distKm = calculateDistanceKm(userCoords.lat, userCoords.lng, alertLat, alertLng);
            const within15Km = Boolean(Math.min(distKm, 15.0) === distKm ? true : userCoords.isFallback);
            if (!within15Km) continue;
            const isNew = prevAlertIdRef.current !== docId;
            prevAlertIdRef.current = docId;
            activeAlertRef.current = candidateAlert;
            setActiveAlert(candidateAlert);
            setUserDistanceKm(distKm);
            setIsWithin15Km(true);
            setIsDismissed(false);
            setShowEmergencyModal(true);
            shouldRingRef.current = true;
            setIsSirenActive(true);
            setEmergencySirenLock(true);
            startEmergencySiren();
            if (isNew) {
              triggerWakeScreenAndNotification(candidateAlert, distKm, true);
            }
            break;
          }
        }
        const currentId = prevAlertIdRef.current;
        if (!currentId) return;
        if (!shouldRingRef.current) return;
        try {
          if (isAlertAlreadyStoppedOrDismissed(currentId, activeAlertRef.current?.alertCode)) {
            shouldRingRef.current = false;
            stopAllAlertEffects(currentId, false);
            return;
          }
          if (isAlertCreatedByMe(activeAlertRef.current)) {
            shouldRingRef.current = false;
            return;
          }
          setShowEmergencyModal(true);
          setIsSirenActive(true);
          startEmergencySiren();
        } catch (err) {}
      };
    } catch (err) {}
    const unsubscribe = subscribeToRedAlerts(alerts => {
      const alertList = alerts ? alerts : [];
      const activeAlerts = alertList.filter(a => {
        if (!a) return false;
        if (a.status !== 'active') return false;
        if (a.isFlaggedFake) return false;
        const fakeCount = a.fakeReports?.length ? a.fakeReports.length : a.fakeReportsCount ? a.fakeReportsCount : 0;
        return Math.min(fakeCount, 3) === fakeCount;
      }).sort((a, b) => (b.createdAtMs ? b.createdAtMs : 0) - (a.createdAtMs ? a.createdAtMs : 0));
      const currentActive = activeAlerts[0] ? activeAlerts[0] : null;
      const prevAlertId = prevAlertIdRef.current;
      if (!currentActive) {
        shouldRingRef.current = false;
        if (prevAlertId ? true : isSirenActive ? true : showEmergencyModal) {
          stopAllAlertEffects(undefined, false);
          setShowEmergencyModal(false);
          setIsDismissed(false);
        }
        activeAlertRef.current = null;
        setActiveAlert(null);
        prevAlertIdRef.current = null;
        return;
      }
      const isBrandNewAlert = !prevAlertId ? true : currentActive.id !== prevAlertId;
      const alertAny = (currentActive as any);
      const isAlreadyStoppedOrDismissed = isAlertAlreadyStoppedOrDismissed(currentActive.id, alertAny.alertCode);
      const isReporter = isAlertCreatedByMe(currentActive);
      const userCoords = getUserCoordinates();
      const alertLat = typeof alertAny.latitude === 'number' ? alertAny.latitude : typeof currentActive.lat === 'number' ? currentActive.lat : 7.151;
      const alertLng = typeof alertAny.longitude === 'number' ? alertAny.longitude : typeof currentActive.lng === 'number' ? currentActive.lng : 79.885;
      const distKm = calculateDistanceKm(userCoords.lat, userCoords.lng, alertLat, alertLng);
      const within15Km = Boolean(Math.min(distKm, 15.0) === distKm ? true : userCoords.isFallback);
      setUserDistanceKm(distKm);
      setIsWithin15Km(within15Km);
      activeAlertRef.current = currentActive;
      setActiveAlert(currentActive);
      prevAlertIdRef.current = currentActive.id;
      if (isReporter) {
        shouldRingRef.current = false;
        return;
      }
      if (isAlreadyStoppedOrDismissed) {
        shouldRingRef.current = false;
        setIsDismissed(true);
        setShowEmergencyModal(false);
        stopAllAlertEffects(currentActive.id, false);
        return;
      }
      if (within15Km) {
        setIsDismissed(false);
        setShowEmergencyModal(true);
        shouldRingRef.current = true;
        setIsSirenActive(true);
        setEmergencySirenLock(true);
        startEmergencySiren();
        if (isBrandNewAlert) {
          triggerWakeScreenAndNotification(currentActive, distKm, within15Km);
          triggerPopup('🚨 සහය සේවා - රතු එළිය (15km කලාපය): ' + (alertAny.disasterTitleSi ? alertAny.disasterTitleSi : currentActive.title ? currentActive.title : 'හදිසි ආපදාවක්') + '!');
        }
      } else {
        shouldRingRef.current = false;
        if (isBrandNewAlert) {
          triggerWakeScreenAndNotification(currentActive, distKm, false);
        }
      }
    });
    return () => {
      unsubscribe();
      unsubSirenListener();
      if (bgWorker) {
        try {
          bgWorker.terminate();
        } catch (err) {}
      }
      window.removeEventListener('sahaya_notification_clicked', handleNotificationClick);
      window.removeEventListener('sahaya_red_alert_received', handleCustomRedAlert);
      window.removeEventListener('click', handleUserGestureUnlock);
      window.removeEventListener('touchstart', handleUserGestureUnlock);
      if (pushListenerHandle) pushListenerHandle.remove();
      if (actionListenerHandle) actionListenerHandle.remove();
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    };
  }, [currentUserId]);
  const handleResolve = async () => {
    if (!activeAlert?.id) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await markRedAlertAsResolved(activeAlert.id, 'ආපදා තත්ත්වය යහපත් අතට හැරී විසඳන ලදී.');
      stopAllAlertEffects(activeAlert.id, true);
      setShowEmergencyModal(false);
      setIsDismissed(true);
      triggerPopup('✅ ආපදා දැන්වීම විසඳුනු බවට සටහන් විය.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleCancel = async () => {
    if (!activeAlert?.id) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await cancelRedAlertByReporter(activeAlert.id, 'වාර්තාකරු විසින් දැන්වීම ඉවත් කරන ලදී.');
      stopAllAlertEffects(activeAlert.id, true);
      setShowEmergencyModal(false);
      setIsDismissed(true);
      triggerPopup('🗑️ ආපදා දැන්වීම ඉවත් කරන ලදී.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleQuickAddComment = async (e: any) => {
    e.preventDefault();
    if (!activeAlert?.id) return;
    if (!commentText.trim()) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const newComm = {
        id: 'comm_' + Date.now(),
        userId: currentUserId,
        userName: currentUser?.name ? currentUser.name : propUserName ? propUserName : 'පරිශීලකයෙක්',
        userPhone: currentUser?.phone ? currentUser.phone : '',
        comment: commentText.trim(),
        text: commentText.trim(),
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now(),
        createdAtDisplay: new Date().toLocaleDateString('si-LK') + ' ' + new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      };
      await addCommentToRedAlert(activeAlert.id, newComm);
      setCommentText('');
      triggerPopup('💬 ඔබගේ අදහස සාර්ථකව එක් කරන ලදී.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleQuickReportFake = async () => {
    if (!activeAlert?.id) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await reportRedAlertAsFake(activeAlert.id, {
        id: 'fake_' + Date.now(),
        userId: currentUserId,
        reportedByUserId: currentUserId,
        userName: currentUser?.name ? currentUser.name : propUserName ? propUserName : 'පරිශීලක',
        reportedAt: new Date().toISOString(),
        reason: 'අසත්‍ය දැන්වීමක් ලෙස වාර්තා කරන ලදී'
      });
      stopAllAlertEffects(activeAlert.id, true);
      setShowEmergencyModal(false);
      setIsDismissed(true);
      triggerPopup('🚩 මෙම දැන්වීම අසත්‍යයක් ලෙස වාර්තා කරන ලදී.');
    } finally {
      setIsSubmitting(false);
    }
  };
  let isCreatedByMeLocal = false;
  try {
    const myCreatedList = JSON.parse(localStorage.getItem('sahaya_my_created_alerts') ? (localStorage.getItem('sahaya_my_created_alerts') as string) : '[]');
    if (Array.isArray(myCreatedList) && activeAlert?.id && myCreatedList.includes(activeAlert.id)) {
      isCreatedByMeLocal = true;
    }
  } catch (err) {}
  const activeAny = ((activeAlert ? activeAlert : {}) as any);
  const isReporter = Boolean(isCreatedByMeLocal ? true : activeAlert?.reportedByUserId && currentUserId && activeAlert.reportedByUserId === currentUserId ? true : currentUser?.phone && activeAny.reportedByPhone && String(currentUser.phone).replace(/\D/g, '') === String(activeAny.reportedByPhone).replace(/\D/g, ''));
  const fakeVotesCount = activeAlert?.fakeReports?.length ? activeAlert.fakeReports.length : activeAlert?.fakeReportsCount ? activeAlert.fakeReportsCount : 0;
  const h = React.createElement;
  return h(React.Fragment, null, (showEmergencyModal ? showEmergencyModal : isSirenActive) && activeAlert ? h('div', {
    className: 'fixed inset-0 z-[999999] bg-red-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn'
  }, h('div', {
    className: 'w-full max-w-lg bg-gradient-to-b from-red-700 via-red-900 to-slate-950 text-white rounded-3xl p-5 sm:p-6 border-4 border-yellow-400 shadow-[0_0_80px_rgba(239,68,68,0.95)] relative overflow-hidden space-y-4 my-auto'
  }, h('div', {
    className: 'bg-black/40 border border-yellow-400/50 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2'
  }, h('div', {
    className: 'flex items-center gap-2.5'
  }, h('span', {
    className: 'relative flex h-4 w-4 shrink-0'
  }, h('span', {
    className: 'animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-90'
  }), h('span', {
    className: 'relative inline-flex rounded-full h-4 w-4 bg-yellow-400'
  })), h('div', null, h('div', {
    className: 'text-yellow-300 font-black text-xs sm:text-sm tracking-wide uppercase'
  }, '🚨 සහය සේවා (SAHAYA SEWA) - රතු එළිය'), h('div', {
    className: 'text-[11px] text-red-100 font-bold'
  }, 'හදිසි ආපදා සජීවී අනතුරු ඇඟවීමේ පද්ධතිය (15km Siren Alert)'))), h('span', {
    className: 'bg-yellow-400 text-red-950 font-black text-[11px] px-2.5 py-1 rounded-full shadow shrink-0'
  }, activeAny.alertCode ? activeAny.alertCode : 'RED ALERT')), h('button', {
    type: 'button',
    onClick: handleDismissByUser,
    className: 'w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 hover:from-yellow-300 hover:to-amber-200 text-red-950 font-black text-base sm:text-lg shadow-[0_0_35px_rgba(250,204,21,0.9)] border-2 border-white flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer'
  }, h(VolumeX, {
    className: 'w-7 h-7 text-red-700 shrink-0 animate-bounce'
  }), h('div', {
    className: 'text-left leading-tight'
  }, h('div', {
    className: 'text-sm sm:text-base font-black text-red-950'
  }, '🔇 සයිරන් නාදය සහ දැන්වීම ඉවත් කරන්න'), h('div', {
    className: 'text-[11px] font-extrabold text-red-800'
  }, '(මෙම දැන්වීම සඳහා නැවත සයිරන් නාද නොවේ)'))), h('div', {
    className: 'space-y-2.5 bg-black/35 p-4 rounded-2xl border border-red-400/40'
  }, h('h2', {
    className: 'text-xl sm:text-2xl font-black text-white leading-snug'
  }, activeAny.disasterTitleSi ? activeAny.disasterTitleSi : activeAlert.title ? activeAlert.title : 'හදිසි අනතුරු ඇඟවීමක්'), h('div', {
    className: 'flex flex-wrap gap-2 text-xs text-red-100'
  }, h('span', {
    className: 'bg-red-950/80 border border-red-500/60 px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold'
  }, h(MapPin, {
    className: 'w-3.5 h-3.5 text-yellow-300 shrink-0'
  }), h('span', null, activeAlert.locationName ? activeAlert.locationName : 'ස්ථානය සඳහන් කර නැත')), h('span', {
    className: 'bg-red-950/80 border border-red-500/60 px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold'
  }, h(Clock, {
    className: 'w-3.5 h-3.5 text-yellow-300 shrink-0'
  }), h('span', null, (activeAny.incidentDate ? activeAny.incidentDate : '') + ' ' + (activeAny.incidentTime ? activeAny.incidentTime : 'දැන්'))), h('span', {
    className: 'bg-yellow-400/20 border border-yellow-300/60 text-yellow-200 px-2.5 py-1 rounded-lg font-mono font-bold'
  }, 'ඔබට දුර: කි.මී. ' + userDistanceKm.toFixed(1))), h('p', {
    className: 'text-sm text-white bg-black/50 p-3.5 rounded-xl border border-red-500/30 leading-relaxed font-medium'
  }, activeAlert.description ? activeAlert.description : 'ආරක්ෂිත ස්ථානයක රැඳී සිටින්න. වැඩිදුර තොරතුරු බලාපොරොත්තු වන්න.'), activeAny.showReporterInfo && (activeAny.reportedByName ? true : activeAny.reportedByPhone) ? h('div', {
    className: 'p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-400/50 flex items-center justify-between text-xs'
  }, h('span', {
    className: 'font-bold text-emerald-200'
  }, '👤 වාර්තාකරු: ' + (activeAny.reportedByName ? activeAny.reportedByName : '') + ' (' + (activeAny.reportedByPhone ? activeAny.reportedByPhone : '') + ')'), activeAny.reportedByPhone ? h('a', {
    href: 'tel:' + activeAny.reportedByPhone,
    className: 'px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1'
  }, h(Phone, {
    className: 'w-3 h-3'
  }), h('span', null, 'අමතන්න')) : null) : null), isSirenActive ? h('button', {
    type: 'button',
    onClick: handleStopSirenOnly,
    className: 'w-full py-2.5 px-4 rounded-xl bg-red-950/90 hover:bg-red-900 text-yellow-200 font-bold text-xs border border-yellow-400/50 flex items-center justify-center gap-2 cursor-pointer'
  }, h(VolumeX, {
    className: 'w-4 h-4 text-yellow-300'
  }), h('span', null, 'සයිරන් නාදය පමණක් නවතා විස්තර කියවන්න')) : null, h('form', {
    onSubmit: handleQuickAddComment,
    className: 'flex gap-2 pt-1'
  }, h('input', {
    type: 'text',
    value: commentText,
    onChange: (e: any) => setCommentText(e.target.value),
    placeholder: 'මෙම ආපදාව පිළිබඳ ඔබගේ අදහස ඇතුළත් කරන්න...',
    className: 'flex-1 p-2.5 rounded-xl bg-black/60 border border-red-400/50 text-white text-xs placeholder:text-red-200/60'
  }), h('button', {
    type: 'submit',
    disabled: isSubmitting ? true : !commentText.trim(),
    className: 'px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50'
  }, h(Send, {
    className: 'w-3.5 h-3.5'
  }), h('span', null, 'අදහස් දක්වන්න'))), h('div', {
    className: 'flex items-center justify-between gap-2 pt-1'
  }, !isReporter ? h('button', {
    type: 'button',
    onClick: handleQuickReportFake,
    disabled: isSubmitting,
    className: 'flex-1 py-2.5 px-3 rounded-xl bg-rose-950/90 hover:bg-rose-900 border border-rose-400/50 text-rose-100 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer'
  }, h(Flag, {
    className: 'w-3.5 h-3.5 text-rose-300'
  }), h('span', null, 'අසත්‍ය දැන්වීමක් ලෙස ප්‍රතිචාර දක්වන්න (' + fakeVotesCount + '/4)')) : null, h('button', {
    type: 'button',
    onClick: handleDismissByUser,
    className: 'py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer border border-white/20'
  }, 'වසන්න')), isReporter ? h('div', {
    className: 'pt-3 border-t border-red-500/40 space-y-2'
  }, h('p', {
    className: 'text-[11px] text-yellow-300 font-bold'
  }, 'ඔබ මෙම ආපදා නිවේදනය පළකළ වාර්තාකරු වේ:'), h('div', {
    className: 'grid grid-cols-2 gap-2'
  }, h('button', {
    type: 'button',
    disabled: isSubmitting,
    onClick: handleResolve,
    className: 'py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black shadow flex items-center justify-center gap-1.5 cursor-pointer'
  }, h(CheckCircle2, {
    className: 'w-4 h-4'
  }), h('span', null, 'දැන්වීම විසඳුනා')), h('button', {
    type: 'button',
    disabled: isSubmitting,
    onClick: handleCancel,
    className: 'py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-black shadow flex items-center justify-center gap-1.5 cursor-pointer'
  }, h(Trash2, {
    className: 'w-4 h-4'
  }), h('span', null, 'දැන්වීම ඉවත් කරන්න')))) : null)) : null, h('div', {
    className: 'fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-11/12 max-w-xl space-y-2 pointer-events-none'
  }, popupMessage ? h('div', {
    className: 'pointer-events-auto bg-slate-900 text-white border-2 border-emerald-500 p-3 sm:p-4 rounded-2xl shadow-2xl flex items-center justify-between'
  }, h('p', {
    className: 'text-xs sm:text-sm font-bold leading-relaxed'
  }, popupMessage), h('button', {
    type: 'button',
    onClick: () => setPopupMessage(null),
    className: 'ml-3 p-2 text-slate-400 hover:text-white font-black text-lg cursor-pointer',
    'aria-label': 'Close notification'
  }, '✕')) : null, !isDismissed && activeAlert && !showEmergencyModal ? h('div', {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    style: {
      transform: 'translate(' + translateX + 'px, ' + translateY + 'px)',
      opacity: 1 - Math.abs(translateX) / 250 - Math.abs(translateY) / 180,
      transition: isSwiping ? 'none' : 'transform 0.25s ease-out, opacity 0.25s ease-out'
    },
    className: 'pointer-events-auto bg-gradient-to-r from-red-600 via-rose-700 to-red-800 text-white p-3.5 sm:p-4 rounded-3xl shadow-[0_10px_35px_rgba(225,29,72,0.65)] border-2 border-yellow-300 relative select-none'
  }, h('div', {
    className: 'flex items-center justify-between gap-2'
  }, h('span', {
    className: 'bg-yellow-300 text-red-950 font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider shadow'
  }, '🚨 සහය සේවා රතු එළිය: ' + (activeAny.alertCode ? activeAny.alertCode : 'EMERGENCY')), h('div', {
    className: 'flex items-center gap-1.5 sm:gap-2'
  }, h('button', {
    type: 'button',
    onClick: (e: any) => {
      e.stopPropagation();
      handleDismissByUser();
    },
    className: 'bg-yellow-400 hover:bg-yellow-300 text-red-950 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow cursor-pointer active:scale-95 border border-white'
  }, h(VolumeX, {
    className: 'w-3.5 h-3.5 text-red-700'
  }), h('span', null, 'සයිරන් සහ දැන්වීම ඉවත් කරන්න')), h('button', {
    type: 'button',
    onClick: (e: any) => {
      e.stopPropagation();
      handleDismissByUser();
    },
    className: 'w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90 border border-white/20',
    title: 'ඉවත් කරන්න (Dismiss)',
    'aria-label': 'Close alert'
  }, h(X, {
    className: 'w-4 h-4 font-bold'
  })))), h('h3', {
    className: 'text-sm sm:text-base font-black mt-1 leading-snug'
  }, activeAny.disasterTitleSi ? activeAny.disasterTitleSi : activeAlert.title ? activeAlert.title : 'හදිසි අනතුරු ඇඟවීමයි'), h('p', {
    className: 'text-xs mt-0.5 opacity-90 line-clamp-2'
  }, activeAlert.description), h('div', {
    className: 'mt-2 pt-2 border-t border-red-400/40 flex items-center justify-between text-[11px]'
  }, h('span', null, '📍 ' + activeAlert.locationName + ' (කි.මී. ' + userDistanceKm.toFixed(1) + ')'), h('button', {
    type: 'button',
    onClick: () => setShowEmergencyModal(true),
    className: 'bg-white text-red-700 font-black px-3 py-1 rounded-lg text-[11px] cursor-pointer shadow'
  }, 'ආපදා විස්තරය බලන්න'))) : null));
};

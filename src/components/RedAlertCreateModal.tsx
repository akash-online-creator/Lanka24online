import React, { useState, useEffect } from 'react';

import {

  X,

  AlertTriangle,

  MapPin,

  Clock,

  Calendar,

  Navigation,

  Loader2,

  CheckCircle2,

  User as UserIcon,

  Phone,

  Lock,

  ShieldAlert,

  Volume2,

  Smartphone,

  RotateCcw,

  Home,

  Eye,

  EyeOff

} from 'lucide-react';

import { RedAlertDisasterType, RedAlertItem, User, LocationOption, Language } from '../types';

import { DISASTER_TYPES, getDisasterConfig } from '../data/redAlertData';

import { resolveExactLocation } from '../utils/geoUtils';

import { createRedAlertInFirestore } from '../lib/firebase';

import { verifyCurrentUserPin, getStoredDevicePin } from '../utils/devicePinManager';

import { DevicePinSetupModal } from './DevicePinSetupModal';

import { startEmergencySiren, stopEmergencySiren, unlockAudio, setEmergencySirenLock } from '../utils/sirenAudio';

import { broadcastPushNotification } from '../utils/fcmNotificationService';

export interface RedAlertCreateModalProps {

  isOpen: boolean;

  onClose: () => void;

  currentUser?: User | null;

  currentLocation?: LocationOption;

  onAlertCreated?: (newAlert: RedAlertItem) => void;

  onUpdateUser?: (updatedUser: User) => void;

  language?: Language;

}

export const RedAlertCreateModal: any = ({

  isOpen,

  onClose,

  currentUser,

  currentLocation,

  onAlertCreated,

  onUpdateUser,

}: RedAlertCreateModalProps) => {

  const [selectedDisaster, setSelectedDisaster] = useState('flood' as RedAlertDisasterType);

  const [customTitle, setCustomTitle] = useState('');

  const [description, setDescription] = useState('');

  const [locationName, setLocationName] = useState('');

  const [latitude, setLatitude] = useState(6.9271);

  const [longitude, setLongitude] = useState(79.8612);

  const [accuracyMeters, setAccuracyMeters] = useState(undefined as number | undefined);

  const [reporterName, setReporterName] = useState('');

  const [reporterPhone, setReporterPhone] = useState('');

  const [showReporterInfo, setShowReporterInfo] = useState(false);

  const [incidentDate, setIncidentDate] = useState('');

  const [incidentTime, setIncidentTime] = useState('');

  const [isScanningGps, setIsScanningGps] = useState(false);

  const [gpsError, setGpsError] = useState(null as string | null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [publishedAlert, setPublishedAlert] = useState(null as RedAlertItem | null);

  const [hasStoredPin, setHasStoredPin] = useState(() => Boolean(getStoredDevicePin()?.pinHash));

  const [showPinSetupModal, setShowPinSetupModal] = useState(false);

  const [showVerifyModal, setShowVerifyModal] = useState(false);

  const [verifyPin, setVerifyPin] = useState('');

  const [verifyError, setVerifyError] = useState(null as string | null);

  const [isVerifying, setIsVerifying] = useState(false);

  const [activeUser, setActiveUser] = useState((currentUser || null) as any);


  useEffect(() => {

    setActiveUser(currentUser || null);

  }, [currentUser]);

  useEffect(() => {

    if (isOpen) {

      const now = new Date();

      setIncidentDate(now.toISOString().split('T')[0]);

      setIncidentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));

      setShowReporterInfo(false);

      setPublishedAlert(null);

      if (currentUser) {

        setReporterName(currentUser.name || '');

        setReporterPhone(currentUser.phone || (currentUser as any).whatsappPhone || currentUser.whatsappNumber || '');

      }

      if (currentLocation) {

        if (currentLocation.lat && currentLocation.lng) {

          setLatitude(currentLocation.lat);

          setLongitude(currentLocation.lng);

        }

        if (currentLocation.nameSi) {

          setLocationName(currentLocation.nameSi);

        }

      }

      const stored = getStoredDevicePin();

      setHasStoredPin(Boolean(stored && stored.pinHash));

      setShowPinSetupModal(false);

      setShowVerifyModal(false);

      setVerifyPin('');

      setVerifyError(null);

      setIsVerifying(false);

      handleLocateMe();

    } else {

      setShowPinSetupModal(false);

      setShowVerifyModal(false);

      setVerifyPin('');

      setVerifyError(null);

      setIsVerifying(false);

      setIsSubmitting(false);

      setPublishedAlert(null);

    }

  }, [isOpen, currentUser, currentLocation]);

  const handleLocateMe = () => {

    setIsScanningGps(true);

    setGpsError(null);

    try {

      if ((window as any).SahayaGpsChannel?.postMessage) {

        (window as any).SahayaGpsChannel.postMessage('GET_GPS');

      }

    } catch (_) {}

    const nativeGps = (window as any).__sahaya_native_gps;

    if (nativeGps && typeof nativeGps.lat === 'number' && typeof nativeGps.lng === 'number' && nativeGps.lat !== 0) {

      const lat = nativeGps.lat;

      const lng = nativeGps.lng;

      setLatitude(lat);

      setLongitude(lng);

      setAccuracyMeters(nativeGps.accuracy || 10);

      setIsScanningGps(false);

      resolveExactLocation(lat, lng).then((resolved) => {

        if (resolved?.shortDisplaySi) setLocationName(resolved.shortDisplaySi);

      });

      return;

    }

    if (!navigator.geolocation) {

      setGpsError('GPS පහසුකම ඔබගේ Browser එකෙහි සහය නොදක්වයි.');

      setIsScanningGps(false);

      return;

    }

    navigator.geolocation.getCurrentPosition(

      (pos) => {

        const lat = pos.coords.latitude;

        const lng = pos.coords.longitude;

        setLatitude(lat);

        setLongitude(lng);

        setAccuracyMeters(pos.coords.accuracy);

        setIsScanningGps(false);

        resolveExactLocation(lat, lng).then((resolved) => {

          if (resolved?.shortDisplaySi) setLocationName(resolved.shortDisplaySi);

        });

      },

      () => {

        setGpsError('ස්වයංක්‍රීය GPS ලබාගත නොහැකි විය. කරුණාකර ස්ථානය පහතින් ලියන්න.');

        setIsScanningGps(false);

      },

      { enableHighAccuracy: true, timeout: 3500, maximumAge: 10000 }

    );

  };

  const effectiveUser: User = activeUser || ({

    id: `usr_${Date.now()}`,

    userId: `usr_${Date.now()}`,

    name: reporterName.trim() || 'හදිසි සාමාජිකයෙක්',

    nicNumber: '000000000V',

    phone: reporterPhone.trim() || '0770000000',

    email: 'user@sahayasewa.lk',

    registeredAt: new Date().toISOString(),

    status: 'approved',

    role: 'user',

  } as unknown as User);

  useEffect(() => {

    if (!showVerifyModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {

      if (isVerifying) return;

      if (/^[0-9]$/.test(e.key)) {

        handleVerifyDigit(e.key);

      } else if (e.key === 'Backspace') {

        handleVerifyBackspace();

      } else if (e.key === 'Escape') {

        setShowVerifyModal(false);

      }

    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);

  }, [showVerifyModal, verifyPin, isVerifying]);

  const handlePreSubmitCheck = (e: React.FormEvent) => {

    e.preventDefault();

    if (!locationName.trim()) {

      alert('කරුණාකර ආපදාව සිදුවූ ස්ථානය ඇතුළත් කරන්න.');

      return;

    }

    if (selectedDisaster === 'other' && !customTitle.trim()) {

      alert('කරුණාකර වෙනත් ආපදාවේ නම ඇතුළත් කරන්න.');

      return;

    }

    const stored = getStoredDevicePin();

    const userPinFallback = (activeUser as any)?.quickPin || (activeUser as any)?.pin;

    if ((!stored || !stored.pinHash) && !userPinFallback) {

      setShowPinSetupModal(true);

      return;

    }

    setVerifyPin('');

    setVerifyError(null);

    setShowVerifyModal(true);

  };

  const handleVerifyDigit = (digit: string) => {

    if (isVerifying) return;

    setVerifyError(null);

    unlockAudio();

    if (Math.min(verifyPin.length, 3) === verifyPin.length && verifyPin.length !== 4) {

      const next = verifyPin + digit;

      setVerifyPin(next);

      if (next.length === 4) {

        executeVerificationAndPublish(next);

      }

    }

  };

  const handleVerifyBackspace = () => {

    if (isVerifying) return;

    setVerifyError(null);

    setVerifyPin((prev) => prev.slice(0, -1));

  };

  const handleVerifyReset = () => {

    if (isVerifying) return;

    setVerifyPin('');

    setVerifyError(null);

  };

  const executeVerificationAndPublish = async (enteredPin: string) => {

    setIsVerifying(true);

    setVerifyError(null);

    try {

      const verification = await verifyCurrentUserPin(enteredPin, activeUser || null);

      const userPinFallback = (activeUser as any)?.quickPin || (activeUser as any)?.pin;

      const isFallbackMatch = Boolean(userPinFallback && String(userPinFallback).trim() === enteredPin.trim());

      if (!verification.success && !isFallbackMatch) {

        setVerifyError(verification.message || 'ඇතුළත් කළ Quick PIN අංකය වැරදියි. කරුණාකර නිවැරදි අංක 4 ඇතුළත් කරන්න.');

        setVerifyPin('');

        setIsVerifying(false);

        if (typeof navigator !== 'undefined' && navigator.vibrate) {

          try { navigator.vibrate([150, 100, 150]); } catch {}

        }

        return;

      }

      setEmergencySirenLock(true);

      startEmergencySiren();

      setIsSubmitting(true);

      setShowVerifyModal(false);

      const config = getDisasterConfig(selectedDisaster);

      const titleSi = selectedDisaster === 'other' ? customTitle.trim() : config.titleSi;

      const titleEn = selectedDisaster === 'other' ? customTitle.trim() : config.titleEn;

      const titleTa = selectedDisaster === 'other' ? customTitle.trim() : config.titleTa;

      const alertCode = `#RED-${Math.floor(1000 + Math.random() * 9000)}`;

      const uid = activeUser?.userId || activeUser?.id || effectiveUser.id || '';

      const newAlertData: any = {

        alertCode,

        disasterType: selectedDisaster,

        title: titleSi,

        disasterTitleSi: titleSi,

        disasterTitleEn: titleEn,

        disasterTitleTa: titleTa,

        description: description.trim(),

        lat: latitude,

        lng: longitude,

        latitude,

        longitude,

        locationName: locationName.trim(),

        incidentDate,

        incidentTime,

        createdAt: new Date().toISOString(),

        createdAtMs: Date.now(),

        reportedByUserId: uid,

        reportedByName: reporterName.trim() || 'හදිසි සාමාජිකයෙක්',

        reportedByPhone: reporterPhone.trim(),

        contactName: showReporterInfo ? (reporterName.trim() || 'හදිසි සාමාජිකයෙක්') : 'නිර්නාමික වාර්තාකරු',

        contactPhone: showReporterInfo ? reporterPhone.trim() : '',

        showReporterInfo: Boolean(showReporterInfo),

        status: 'active',

        urgency: 'critical',

        severity: 'critical',

        radiusKm: 15,

        comments: [],

        commentsCount: 0,

        fakeReports: [],

        fakeReportsCount: 0,

        isFlaggedFake: false,

        verifiedByPin: true,

        isVoiceAlert: false,

        ...(selectedDisaster === 'other' && customTitle.trim() ? { customDisasterTitle: customTitle.trim() } : {}),

        ...(accuracyMeters !== undefined ? { locationAccuracyMeters: accuracyMeters } : {}),

      };

      const docId = await createRedAlertInFirestore(newAlertData);

      try {

        const myAlerts = JSON.parse(localStorage.getItem('sahaya_my_created_alerts') || '[]');

        if (Array.isArray(myAlerts) && !myAlerts.includes(docId)) {

          myAlerts.push(docId);

          localStorage.setItem('sahaya_my_created_alerts', JSON.stringify(myAlerts));

        }

        const dismissKeys = ['sahaya_dismissed_alerts', `sahaya_dismissed_alerts_${uid}`];

        dismissKeys.forEach((k) => {

          const list = JSON.parse(localStorage.getItem(k) || '[]');

          if (Array.isArray(list) && !list.includes(docId)) {

            list.push(docId);

            localStorage.setItem(k, JSON.stringify(list));

          }

        });

      } catch (_) {}

      const createdAlert: RedAlertItem = {

        id: docId,

        ...newAlertData,

      };

      broadcastPushNotification({

        category: 'red_alert',

        title: `🚨 රතු එළිය: ${titleSi}`,

        body: `${locationName.trim()} ප්‍රදේශයෙන් ${titleSi} හදිසි ආපදාවක් වාර්තා වී ඇත (කි.මී. 15 කලාපය).`,

        alertId: docId,

        locationName: locationName.trim(),

        latitude,

        longitude,

        urgency: 'critical',

        badgeText: 'රතු එළිය 15KM'

      });

      setPublishedAlert(createdAlert);

    } catch (err) {

      console.error('Red Alert creation error:', err);

      alert('ආපදා නිවේදනය පළ කිරීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.');

    } finally {

      setIsVerifying(false);

      setIsSubmitting(false);

    }

  };

  const handleGoToHomePage = () => {

    try {

      stopEmergencySiren(true);

    } catch (_) {}

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

    if (publishedAlert?.id) {

      try {

        const stoppedList = JSON.parse(localStorage.getItem('sahaya_siren_stopped_alerts') || '[]');

        if (Array.isArray(stoppedList) && !stoppedList.includes(publishedAlert.id)) {

          stoppedList.push(publishedAlert.id);

          localStorage.setItem('sahaya_siren_stopped_alerts', JSON.stringify(stoppedList));

        }

      } catch (_) {}

    }

    const alertToPass = publishedAlert;

    setPublishedAlert(null);

    if (alertToPass && onAlertCreated) {

      onAlertCreated(alertToPass);

    }

    onClose();

    try {

      window.dispatchEvent(new CustomEvent('sahaya_navigate_home', { detail: { alert: alertToPass } }));

      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (_) {}

  };

  if (!isOpen) return null;

  const h = React.createElement;

  if (publishedAlert) {

    const pubConfig = getDisasterConfig(publishedAlert.disasterType);

    return h(

      'div',

      { className: 'fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200' },

      h(

        'div',

        { className: 'w-full max-w-lg bg-gradient-to-b from-red-950 via-slate-900 to-black text-white rounded-3xl p-5 sm:p-7 border-4 border-red-500 shadow-[0_0_70px_rgba(239,68,68,0.85)] space-y-5 my-auto' },

        h(

          'div',

          { className: 'flex items-center justify-between border-b border-red-800/70 pb-3' },

          h(

            'div',

            { className: 'flex items-center gap-2.5' },

            h(

              'span',

              { className: 'relative flex h-4 w-4' },

              h('span', { className: 'animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75' }),

              h('span', { className: 'relative inline-flex rounded-full h-4 w-4 bg-red-500' })

            ),

            h('span', { className: 'text-red-300 font-black text-sm sm:text-base tracking-wide uppercase' }, '🚨 රතු එළිය දැන්වීම පළ විය!')

          ),

          h(

            'span',

            { className: 'bg-red-600 text-white font-black text-xs px-3 py-1 rounded-full font-mono shadow' },

            (publishedAlert as any).alertCode || '#RED-ALERT'

          )

        ),

        h(

          'div',

          { className: 'p-4 rounded-2xl bg-red-900/30 border border-red-500/40 space-y-3' },

          h(

            'div',

            { className: 'flex items-center gap-3' },

            h('div', { className: 'w-12 h-12 rounded-2xl bg-white text-red-600 flex items-center justify-center text-2xl font-black shrink-0 shadow-md' }, pubConfig.icon || '🚨'),

            h(

              'div',

              null,

              h('span', { className: 'text-[11px] font-bold text-red-300 uppercase block' }, 'හදිසි / ආපදා කාණ්ඩය'),

              h('h3', { className: 'text-lg sm:text-xl font-black text-white leading-snug' }, (publishedAlert as any).disasterTitleSi || publishedAlert.title)

            )

          ),

          h(

            'div',

            { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-red-800/50 text-xs' },

            h(

              'div',

              { className: 'bg-black/40 p-2.5 rounded-xl border border-red-800/40' },

              h('span', { className: 'text-red-300 font-bold block mb-0.5' }, '📍 ස්ථානය:'),

              h('span', { className: 'text-white font-black text-sm' }, publishedAlert.locationName)

            ),

            h(

              'div',

              { className: 'bg-black/40 p-2.5 rounded-xl border border-red-800/40' },

              h('span', { className: 'text-red-300 font-bold block mb-0.5' }, '🕒 දිනය සහ වේලාව:'),

              h('span', { className: 'text-white font-black text-sm' }, `${(publishedAlert as any).incidentDate || ''} • ${(publishedAlert as any).incidentTime || ''}`)

            )

          ),

          publishedAlert.description

            ? h(

                'div',

                { className: 'bg-black/40 p-3 rounded-xl border border-red-800/40 text-xs space-y-1' },

                h('span', { className: 'text-amber-300 font-bold block' }, '📝 ආපදා විස්තරය:'),

                h('p', { className: 'text-slate-100 font-medium leading-relaxed whitespace-pre-wrap' }, publishedAlert.description)

              )

            : null,

          h(

            'div',

            { className: 'bg-black/40 p-2.5 rounded-xl border border-red-800/40 text-xs flex items-center justify-between gap-2' },

            h(

              'div',

              null,

              h('span', { className: 'text-red-300 font-bold block' }, '👤 වාර්තාකරුගේ තොරතුරු:'),

              h(

                'span',

                { className: 'text-white font-bold' },

                (publishedAlert as any).showReporterInfo

                  ? `${(publishedAlert as any).reportedByName || ''} (${(publishedAlert as any).reportedByPhone || ''}) - අන් අයට පෙන්වයි`

                  : 'ඔබගේ නම සහ දුරකථන අංකය අන් අයගෙන් සඟවා ඇත'

              )

            )

          )

        ),

        h(

          'div',

          { className: 'p-3 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-bold text-center leading-relaxed' },

          '🔊 ඔබගේ දුරකථනයේ සයිරන් නාදය ක්‍රියාත්මක වේ. කි.මී. 15ක් ඇතුළත සිටින සියලුම පරිශීලකයන් වෙත දැන්වීම සහ සයිරන් අනතුරු ඇඟවීම යොමු කරන ලදී.'

        ),

        h(

          'button',

          {

            type: 'button',

            onClick: handleGoToHomePage,

            className: 'w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-base sm:text-lg shadow-[0_0_30px_rgba(16,185,129,0.7)] border-2 border-emerald-300 flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer'

          },

          h(Home, { className: 'w-6 h-6' }),

          h('span', null, 'Home Page එකට යන්න')

        )

      )

    );

  }

  return h(

    'div',

    { className: 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200' },

    h(

      'div',

      {

        className: 'bg-white dark:bg-[#0c1015] border-2 border-red-600/80 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-[0_0_60px_rgba(239,68,68,0.35)] overflow-hidden text-slate-900 dark:text-white my-auto relative',

        role: 'dialog',

        'aria-modal': 'true'

      },

      h(

        'div',

        { className: 'p-4 sm:p-5 border-b border-red-200 dark:border-red-950/80 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-between shrink-0 shadow-md' },

        h(

          'div',

          { className: 'flex items-center gap-3' },

          h(

            'div',

            { className: 'w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner' },

            h(ShieldAlert, { className: 'w-6 h-6 text-white animate-pulse' })

          ),

          h(

            'div',

            null,

            h(

              'div',

              { className: 'flex items-center gap-2' },

              h('span', { className: 'text-xl' }, '🚨'),

              h('h2', { className: 'text-lg sm:text-xl font-black tracking-tight leading-tight' }, 'රතු එළිය (RED ALERT) පළ කරන්න')

            ),

            h('p', { className: 'text-xs text-red-100 font-medium' }, 'අවට කි.මී. 15ක ප්‍රජාව වෙත ක්ෂණික සයිරන් අනතුරු ඇඟවීමක් විකාශය කරන්න')

          )

        ),

        h(

          'button',

          {

            type: 'button',

            onClick: onClose,

            className: 'w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer',

            title: 'වසන්න'

          },

          h(X, { className: 'w-5 h-5' })

        )

      ),

      h(

        'form',

        { onSubmit: handlePreSubmitCheck, className: 'p-4 sm:p-6 overflow-y-auto space-y-5' },

        h(

          'div',

          { className: 'space-y-2' },

          h(

            'label',

            { className: 'block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5' },

            h('span', { className: 'text-red-600 dark:text-red-400 font-black' }, '1.'),

            h('span', null, 'ආපදා වර්ගය තෝරන්න (Disaster Category)')

          ),

          h(

            'div',

            { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },

            DISASTER_TYPES.map((type) => {

              const isSelected = selectedDisaster === type.id;

              return h(

                'button',

                {

                  key: type.id,

                  type: 'button',

                  onClick: () => setSelectedDisaster(type.id),

                  className: `p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${

                    isSelected

                      ? 'border-red-600 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 shadow-md shadow-red-500/20 font-black'

                      : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-700 dark:text-slate-300 font-bold'

                  }`

                },

                h('span', { className: 'text-2xl' }, type.icon),

                h('span', { className: 'text-xs leading-tight' }, type.titleSi)

              );

            })

          ),

          selectedDisaster === 'other'

            ? h(

                'div',

                { className: 'pt-2' },

                h('input', {

                  type: 'text',

                  required: true,

                  value: customTitle,

                  onChange: (e: any) => setCustomTitle(e.target.value),

                  placeholder: 'ආපදාවේ නම ලියන්න (උදා: සුළි සුළඟ, නායයෑමක්)',

                  className: 'w-full p-3 rounded-xl border border-red-300 dark:border-red-900 bg-white dark:bg-black/40 text-slate-900 dark:text-white text-sm'

                })

              )

            : null

        ),

        h(

          'div',

          { className: 'space-y-2' },

          h(

            'div',

            { className: 'flex items-center justify-between' },

            h(

              'label',

              { className: 'block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5' },

              h('span', { className: 'text-red-600 dark:text-red-400 font-black' }, '2.'),

              h('span', null, 'ආපදාව සිදුවූ ස්ථානය (Location)')

            ),

            h(

              'button',

              {

                type: 'button',

                onClick: handleLocateMe,

                disabled: isScanningGps,

                className: 'text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer'

              },

              isScanningGps

                ? h(React.Fragment, null, h(Loader2, { className: 'w-3.5 h-3.5 animate-spin' }), h('span', null, 'GPS පරීක්ෂා කරමින්...'))

                : h(React.Fragment, null, h(Navigation, { className: 'w-3.5 h-3.5' }), h('span', null, 'ස්ථානය ස්වයංක්‍රීයව ගන්න (GPS)'))

            )

          ),

          h(

            'div',

            { className: 'relative' },

            h('input', {

              type: 'text',

              required: true,

              value: locationName,

              onChange: (e: any) => setLocationName(e.target.value),

              placeholder: 'නගරය, ගම හෝ නිශ්චිත ස්ථානය ලියන්න (උදා: කඩවත, නුවර පාර)',

              className: 'w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-medium text-sm focus:border-red-500 focus:outline-none'

            }),

            h(MapPin, { className: 'w-5 h-5 text-red-500 absolute left-3 top-3.5' })

          ),

          gpsError ? h('p', { className: 'text-xs text-rose-600 dark:text-rose-400 font-medium' }, gpsError) : null

        ),

        h(

          'div',

          { className: 'space-y-1.5' },

          h(

            'label',

            { className: 'block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5' },

            h('span', { className: 'text-red-600 dark:text-red-400 font-black' }, '3.'),

            h('span', null, 'වැඩිදුර විස්තර / හදිසි තත්ත්වය (Description)')

          ),

          h('textarea', {

            rows: 3,

            value: description,

            onChange: (e: any) => setDescription(e.target.value),

            placeholder: 'සිදුවූ හානිය, අවශ්‍ය හදිසි සහන හෝ මිනිසුන් සිරවී සිටීද යන්න පැහැදිලි කරන්න...',

            className: 'w-full p-3 rounded-2xl border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-medium text-sm focus:border-red-500 focus:outline-none'

          })

        ),

        h(

          'div',

          { className: 'space-y-3 pt-1 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800' },

          h(

            'div',

            { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },

            h(

              'div',

              { className: 'space-y-1 text-xs' },

              h(

                'span',

                { className: 'font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1' },

                h(UserIcon, { className: 'w-3.5 h-3.5' }),

                h('span', null, 'වාර්තාකරුගේ නම')

              ),

              h('input', {

                type: 'text',

                value: reporterName,

                onChange: (e: any) => setReporterName(e.target.value),

                placeholder: 'ඔබගේ නම',

                className: 'w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/40 text-slate-900 dark:text-white'

              })

            ),

            h(

              'div',

              { className: 'space-y-1 text-xs' },

              h(

                'span',

                { className: 'font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1' },

                h(Phone, { className: 'w-3.5 h-3.5' }),

                h('span', null, 'දුරකථන අංකය')

              ),

              h('input', {

                type: 'tel',

                value: reporterPhone,

                onChange: (e: any) => setReporterPhone(e.target.value),

                placeholder: '07xxxxxxxx',

                className: 'w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-mono'

              })

            )

          ),

          h(

            'label',

            { className: 'flex items-start gap-2.5 pt-2 border-t border-slate-200 dark:border-zinc-800 cursor-pointer select-none' },

            h('input', {

              type: 'checkbox',

              checked: showReporterInfo,

              onChange: (e: any) => setShowReporterInfo(Boolean(e.target.checked)),

              className: 'mt-0.5 w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer'

            }),

            h(

              'div',

              { className: 'text-xs space-y-0.5' },

              h(

                'span',

                { className: 'font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5' },

                showReporterInfo ? h(Eye, { className: 'w-3.5 h-3.5 text-emerald-600' }) : h(EyeOff, { className: 'w-3.5 h-3.5 text-slate-500' }),

                h('span', null, 'මගේ නම සහ දුරකථන අංකය අන් අයට පෙන්වීමට කැමැත්තෙමි')

              ),

              h(

                'p',

                { className: 'text-[11px] text-slate-500 dark:text-slate-400 font-medium' },

                showReporterInfo

                  ? '✅ ඔබගේ නම සහ දුරකථන අංකය දැන්වීමේ ප්‍රසිද්ධියේ පෙන්වනු ලැබේ.'

                  : '🔒 Default ලෙස මෙය Untick කර ඇත. ඔබගේ නම සහ දුරකථන අංකය අන් අයට පෙන්වන්නේ නැත.'

              )

            )

          )

        ),

        h(

          'div',

          { className: 'pt-2' },

          h(

            'button',

            {

              type: 'submit',

              disabled: isSubmitting,

              className: 'w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-red-800 active:scale-[0.99] text-white font-black text-sm sm:text-base shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-red-400/40'

            },

            isSubmitting

              ? h(React.Fragment, null, h(Loader2, { className: 'w-5 h-5 animate-spin' }), h('span', null, 'විකාශය වෙමින් පවතී...'))

              : h(React.Fragment, null, h('span', { className: 'text-xl' }, '🚨'), h('span', null, 'රතු එළිය Submit කරන්න (කි.මී. 15 තුළ Siren දැනුම්දෙන්න)'))

          )

        )

      )

    ),

    showPinSetupModal

      ? h(DevicePinSetupModal, {

          isOpen: showPinSetupModal,

          onClose: () => setShowPinSetupModal(false),

          currentUser: effectiveUser,

          language: 'si',

          isChangeMode: hasStoredPin,

          onPinConfigured: (updatedUser: User) => {

            setHasStoredPin(true);

            setActiveUser(updatedUser);

            setShowPinSetupModal(false);

            if (onUpdateUser) {

              onUpdateUser(updatedUser);

            }

            setVerifyPin('');

            setVerifyError(null);

            setShowVerifyModal(true);

          }

        })

      : null,

    showVerifyModal

      ? h(

          'div',

          { className: 'fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200' },

          h(

            'div',

            {

              className: 'w-full max-w-sm bg-white dark:bg-[#091810] border-2 border-emerald-500/40 dark:border-emerald-600/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto',

              onClick: (e: any) => e.stopPropagation()

            },

            h(

              'div',

              { className: 'p-4 sm:p-5 bg-gradient-to-br from-emerald-800 via-teal-900 to-[#022818] text-white relative text-center' },

              h(

                'button',

                {

                  type: 'button',

                  onClick: () => setShowVerifyModal(false),

                  className: 'absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all cursor-pointer',

                  title: 'වසන්න (Close)'

                },

                h(X, { className: 'w-4 h-4' })

              ),

              h(

                'div',

                { className: 'w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 flex items-center justify-center mx-auto mb-2 shadow-lg' },

                h(Smartphone, { className: 'w-6 h-6' })

              ),

              h(

                'div',

                { className: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase tracking-wider mb-1' },

                h(Lock, { className: 'w-2.5 h-2.5 text-amber-400' }),

                h('span', null, 'ආරක්ෂක Quick PIN තහවුරු කිරීම')

              ),

              h('h2', { className: 'text-base sm:text-lg font-black tracking-tight' }, 'රතු එළිය විකාශය තහවුරු කරන්න'),

              h(

                'p',

                { className: 'text-[11px] text-emerald-100/80 font-medium mt-0.5 max-w-xs mx-auto leading-tight' },

                'නිවැරදි අංක 4ක ආරක්ෂක Quick PIN අංකය ඇතුළත් කළහොත් පමණක් දැන්වීම පළ වේ.'

              )

            ),

            h(

              'div',

              { className: 'p-4 sm:p-5 flex flex-col items-center' },

              h(

                'div',

                { className: 'text-center mb-2' },

                h('span', { className: 'text-xs font-bold text-slate-700 dark:text-slate-200' }, '🔹 අංක 4ක Quick PIN අංකය ඇතුළත් කරන්න:')

              ),

              h(

                'div',

                { className: 'flex items-center justify-center gap-3 my-2' },

                [0, 1, 2, 3].map((index) => {

                  const isFilled = Boolean(verifyPin.slice(index, index + 1));

                  return h(

                    'div',

                    {

                      key: index,

                      className: `w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${

                        isFilled

                          ? 'bg-emerald-600 border-2 border-emerald-500 scale-105 shadow-md shadow-emerald-500/20'

                          : 'bg-slate-100 dark:bg-[#112419] border-2 border-slate-300 dark:border-[#1e422c]'

                      }`

                    },

                    isFilled ? h('div', { className: 'w-3 h-3 rounded-full bg-white animate-in zoom-in-50' }) : null

                  );

                })

              ),

              verifyError

                ? h(

                    'div',

                    { className: 'w-full my-2 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs text-center flex items-center justify-center gap-1.5 animate-shake' },

                    h(AlertTriangle, { className: 'w-4 h-4 shrink-0 text-red-500' }),

                    h('span', { className: 'font-semibold' }, verifyError)

                  )

                : null,

              isVerifying

                ? h(

                    'div',

                    { className: 'flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 py-1' },

                    h(Loader2, { className: 'w-4 h-4 animate-spin text-emerald-600' }),

                    h('span', null, 'PIN අංකය තහවුරු කරමින් දැන්වීම පළ කරයි...')

                  )

                : null,

              h(

                'div',

                { className: 'grid grid-cols-3 gap-2 w-full max-w-[260px] my-3' },

                ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) =>

                  h(

                    'button',

                    {

                      key: digit,

                      type: 'button',

                      disabled: isVerifying,

                      onClick: () => handleVerifyDigit(digit),

                      className: 'h-11 rounded-2xl bg-slate-50 dark:bg-[#0e2115] hover:bg-emerald-50 dark:hover:bg-[#153422] border border-slate-200 dark:border-[#1a3f29] text-slate-800 dark:text-white text-base font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50'

                    },

                    digit

                  )

                ),

                h(

                  'button',

                  {

                    type: 'button',

                    disabled: isVerifying,

                    onClick: handleVerifyReset,

                    className: 'h-11 rounded-2xl bg-slate-50 dark:bg-[#0e2115] hover:bg-slate-100 dark:hover:bg-[#153422] border border-slate-200 dark:border-[#1a3f29] text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50',

                    title: 'නැවත මුල සිට (Reset)'

                  },

                  h(RotateCcw, { className: 'w-4 h-4' })

                ),

                h(

                  'button',

                  {

                    type: 'button',

                    disabled: isVerifying,

                    onClick: () => handleVerifyDigit('0'),

                    className: 'h-11 rounded-2xl bg-slate-50 dark:bg-[#0e2115] hover:bg-emerald-50 dark:hover:bg-[#153422] border border-slate-200 dark:border-[#1a3f29] text-slate-800 dark:text-white text-base font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50'

                  },

                  '0'

                ),

                h(

                  'button',

                  {

                    type: 'button',

                    disabled: isVerifying,

                    onClick: handleVerifyBackspace,

                    className: 'h-11 rounded-2xl bg-slate-50 dark:bg-[#0e2115] hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-[#1a3f29] text-slate-600 dark:text-slate-300 text-xs font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50',

                    title: 'මකන්න (Delete)'

                  },

                  '⌫'

                )

              ),

              h(

                'div',

                { className: 'w-full pt-2 border-t border-slate-100 dark:border-[#142e1f] flex items-center justify-between text-xs' },

                h(

                  'button',

                  {

                    type: 'button',

                    onClick: () => {

                      setShowVerifyModal(false);

                      setShowPinSetupModal(true);

                    },

                    className: 'text-emerald-700 dark:text-emerald-400 hover:underline font-bold transition-colors cursor-pointer py-1 px-1 text-[11px]'

                  },

                  'PIN අංකය වෙනස් කරන්න'

                ),

                h(

                  'button',

                  {

                    type: 'button',

                    onClick: () => setShowVerifyModal(false),

                    className: 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold transition-colors cursor-pointer py-1 px-2'

                  },

                  'අවලංගු කරන්න'

                )

              )

            )

          )

        )

      : null

  );

};


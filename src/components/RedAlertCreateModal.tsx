import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Calendar, 
  Navigation, 
  Loader2, 
  CheckCircle2, 
  FileText, 
  User as UserIcon, 
  Phone,
  Lock,
  Delete,
  ShieldAlert,
  Volume2,
  Smartphone,
  RotateCcw
} from 'lucide-react';
import { RedAlertDisasterType, RedAlertItem, User, LocationOption } from '../types';
import { DISASTER_TYPES, getDisasterConfig } from '../data/redAlertData';
import { resolveExactLocation } from '../utils/geoUtils';
import { createRedAlertInFirestore } from '../lib/firebase';
import { AiVoiceInlineBar } from './AiVoiceInlineBar';
import { triggerPickMeAlert } from '../utils/backgroundAlertEngine';
import { verifyCurrentUserPin, getStoredDevicePin, saveDevicePin, clearDevicePin } from '../utils/devicePinManager';
import { DevicePinSetupModal } from './DevicePinSetupModal';
import { startEmergencySiren, unlockAudio } from '../utils/sirenAudio';
import { broadcastPushNotification } from '../utils/fcmNotificationService';

export interface RedAlertCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  currentLocation?: LocationOption;
  onAlertCreated?: (newAlert: RedAlertItem) => void;
  onUpdateUser?: (updatedUser: User) => void;
}

export const RedAlertCreateModal: React.FC<RedAlertCreateModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentLocation,
  onAlertCreated,
  onUpdateUser,
}) => {
  // Form fields
  const [selectedDisaster, setSelectedDisaster] = useState<RedAlertDisasterType>('flood');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number>(6.9271);
  const [longitude, setLongitude] = useState<number>(79.8612);
  const [accuracyMeters, setAccuracyMeters] = useState<number | undefined>(undefined);
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentTime, setIncidentTime] = useState('');

  // Voice note state
  const [voiceData, setVoiceData] = useState<{
    audioUrl?: string;
    durationSec?: number;
    date?: string;
    time?: string;
    location?: string;
    coords?: { lat: number; lng: number };
    transcript?: string;
  } | null>(null);

  // Status & loading
  const [isScanningGps, setIsScanningGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 📱 Device Quick PIN State (Unified with User Settings Method)
  const [hasStoredPin, setHasStoredPin] = useState(() => Boolean(getStoredDevicePin()?.pinHash));
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyPin, setVerifyPin] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Preload current user & location on open
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setIncidentDate(now.toISOString().split('T')[0]);
      setIncidentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));

      if (currentUser) {
        setReporterName(currentUser.name || '');
        setReporterPhone(currentUser.phone || currentUser.whatsappNumber || '');
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

      // Refresh stored PIN status on open
      const stored = getStoredDevicePin();
      setHasStoredPin(Boolean(stored && stored.pinHash));
      setShowPinSetupModal(false);
      setShowVerifyModal(false);
      setVerifyPin('');
      setVerifyError(null);
      setIsVerifying(false);

      // Attempt immediate accurate GPS acquisition
      handleLocateMe();
    } else {
      setShowPinSetupModal(false);
      setShowVerifyModal(false);
      setVerifyPin('');
      setVerifyError(null);
      setIsVerifying(false);
      setIsSubmitting(false);
      setSubmitSuccess(false);
    }
  }, [isOpen, currentUser, currentLocation]);

  // GPS Scan Handler
  const handleLocateMe = () => {
    setIsScanningGps(true);
    setGpsError(null);

    // Check WebView Native GPS if running in native wrapper
    try {
      if ((window as any).SahayaGpsChannel?.postMessage) {
        (window as any).SahayaGpsChannel.postMessage('GET_GPS');
      }
    } catch (e) {}

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

  // Effective User for Device PIN Setup & Registration
  const effectiveUser: User = currentUser || {
    id: `usr_${Date.now()}`,
    userId: `usr_${Date.now()}`,
    name: reporterName.trim() || 'හදිසි සාමාජිකයෙක්',
    nicNumber: '000000000V',
    phone: reporterPhone.trim() || '0770000000',
    email: 'user@sahayasewa.lk',
    registeredAt: new Date().toISOString(),
    status: 'approved',
    role: 'user',
  };

  // Keyboard listener for Physical Keys in Verify Modal
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

  // Step 1: Pre-validate form and determine PIN flow
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
    if (!stored || !stored.pinHash) {
      // No PIN configured on this device yet!
      // Prompt user to set up Device Quick PIN via DevicePinSetupModal (same as User Settings)
      setShowPinSetupModal(true);
      return;
    }

    // Open clean Device Quick PIN Verification Dialog
    setVerifyPin('');
    setVerifyError(null);
    setShowVerifyModal(true);
  };

  // Step 2: Handle Verification Keypad (Same design & interaction as DevicePinSetupModal)
  const handleVerifyDigit = (digit: string) => {
    if (isVerifying) return;
    setVerifyError(null);
    unlockAudio();
    if (verifyPin.length < 4) {
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

  // Step 3: Execute PIN Verification & Firestore Publish (Zero-latency siren start on verification)
  const executeVerificationAndPublish = async (enteredPin: string) => {
    setIsVerifying(true);
    setVerifyError(null);

    try {
      // Verify against existing device PIN
      const verification = await verifyCurrentUserPin(enteredPin, currentUser || null);
      if (!verification.success) {
        setVerifyError(verification.message || 'ඇතුළත් කළ PIN අංකය වැරදියි. කරුණාකර නැවත උත්සාහ කරන්න.');
        setVerifyPin('');
        setIsVerifying(false);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate([150, 100, 150]); } catch {}
        }
        return;
      }

      // 🚨 PIN VERIFIED: Start Siren & Vibration IMMEDIATELY on touch!
      startEmergencySiren();

      setIsSubmitting(true);
      setShowVerifyModal(false);

      const config = getDisasterConfig(selectedDisaster);
      const titleSi = selectedDisaster === 'other' ? customTitle.trim() : config.titleSi;
      const titleEn = selectedDisaster === 'other' ? customTitle.trim() : config.titleEn;
      const titleTa = selectedDisaster === 'other' ? customTitle.trim() : config.titleTa;
      const alertCode = `#RED-${Math.floor(1000 + Math.random() * 9000)}`;

      const newAlertData: Omit<RedAlertItem, 'id'> = {
        alertCode,
        disasterType: selectedDisaster,
        disasterTitleSi: titleSi,
        disasterTitleEn: titleEn,
        disasterTitleTa: titleTa,
        description: description.trim(),
        latitude,
        longitude,
        locationName: locationName.trim(),
        incidentDate,
        incidentTime,
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now(),
        reportedByUserId: currentUser?.userId || currentUser?.id || '',
        reportedByName: reporterName.trim() || 'හදිසි සාමාජිකයෙක්',
        reportedByPhone: reporterPhone.trim(),
        status: 'active',
        severity: 'critical',
        comments: [],
        fakeReports: [],
        isFlaggedFake: false,
        verifiedByPin: true,
        ...(voiceData?.audioUrl ? {
          audioUrl: voiceData.audioUrl,
          audioDurationSec: voiceData.durationSec || 0,
          voiceSentDate: voiceData.date || incidentDate,
          voiceSentTime: voiceData.time || incidentTime,
          voiceSentLocation: voiceData.location || locationName,
          voiceCoordinates: voiceData.coords || { lat: latitude, lng: longitude },
          isVoiceAlert: true,
        } : {
          isVoiceAlert: false,
        }),
        ...(selectedDisaster === 'other' && customTitle.trim() ? { customDisasterTitle: customTitle.trim() } : {}),
        ...(accuracyMeters !== undefined ? { locationAccuracyMeters: accuracyMeters } : {}),
      };

      const docId = await createRedAlertInFirestore(newAlertData);

      try {
        const createdAlert: RedAlertItem = {
          id: docId,
          ...newAlertData,
        };
        if (onAlertCreated) {
          onAlertCreated(createdAlert);
        }
      } catch (_) {}

      // Trigger local background notification
      triggerPickMeAlert({
        kind: 'red_alert',
        title: `🚨 ${titleSi}`,
        message: `${locationName.trim()} ප්‍රදේශයේ හදිසි ආපදා තත්ත්වයක් වාර්තා විය.`,
        locationName: locationName.trim(),
        forceRingtone: true,
      });

      // Broadcast FCM Push Notification to nearby devices and background workers
      broadcastPushNotification({
        category: 'red_alert',
        title: titleSi,
        body: `${locationName.trim()} ප්‍රදේශයෙන් ${titleSi} හදිසි ආපදාවක් වාර්තා වී ඇත.`,
        alertId: docId,
        locationName: locationName.trim(),
        latitude,
        longitude,
        urgency: 'critical',
        badgeText: 'රතු එළිය'
      });

      setSubmitSuccess(true);

      setTimeout(() => {
        onClose();
        setSubmitSuccess(false);
      }, 2500);

    } catch (err) {
      console.error('Red Alert creation error:', err);
      alert('ආපදා නිවේදනය පළ කිරීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setIsVerifying(false);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#0c1015] border-2 border-red-600/80 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-[0_0_60px_rgba(239,68,68,0.35)] overflow-hidden text-slate-900 dark:text-white my-auto relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-red-200 dark:border-red-950/80 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🚨</span>
                <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                  රතු එළිය (RED ALERT) පළ කරන්න
                </h2>
              </div>
              <p className="text-xs text-red-100 font-medium">
                අවට කි.මී. 5ක ප්‍රජාව වෙත ක්ෂණික සයිරන් අනතුරු ඇඟවීමක් විකාශය කරන්න
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="වසන්න"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {submitSuccess ? (
          <div className="p-8 sm:p-12 text-center space-y-4 my-auto">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              රතු එළිය සාර්ථකව විකාශය විය!
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              ඔබගේ හදිසි ආපදා නිවේදනය අවට ප්‍රජාව සහ ආපදා සහන මධ්‍යස්ථාන වෙත ක්ෂණික සයිරන් ශබ්දය සමග යොමු කරන ලදී.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePreSubmitCheck} className="p-4 sm:p-6 overflow-y-auto space-y-5">

            {/* 🎙️ Voice Alert Recorder */}
            <AiVoiceInlineBar
              titlePrompt="🎙️ ආපදාව පිළිබඳ හඬ පණිවිඩයක් එක්කරන්න (Voice Alert):"
              onVoiceCaptured={(data) => {
                setVoiceData({
                  audioUrl: data.audioUrl,
                  durationSec: data.durationSec,
                  date: data.date,
                  time: data.time,
                  location: data.location,
                  coords: data.coords,
                  transcript: data.transcript,
                });
                if (data.location) setLocationName(data.location);
                if (data.transcript && !description) setDescription(data.transcript);
              }}
            />

            {/* 1. Disaster Type Selector */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="text-red-600 dark:text-red-400 font-black">1.</span>
                <span>ආපදා වර්ගය තෝරන්න (Disaster Category)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DISASTER_TYPES.map((type) => {
                  const isSelected = selectedDisaster === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedDisaster(type.id)}
                      className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                        isSelected
                          ? 'border-red-600 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 shadow-md shadow-red-500/20 font-black'
                          : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-700 dark:text-slate-300 font-bold'
                      }`}
                    >
                      <span className="text-2xl">{type.icon}</span>
                      <span className="text-xs leading-tight">{type.titleSi}</span>
                    </button>
                  );
                })}
              </div>

              {selectedDisaster === 'other' && (
                <div className="pt-2">
                  <input
                    type="text"
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="ආපදාවේ නම ලියන්න (උදා: සුළි සුළඟ, නායයෑමක්)"
                    className="w-full p-3 rounded-xl border border-red-300 dark:border-red-900 bg-white dark:bg-black/40 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              )}
            </div>

            {/* 2. Incident Location & GPS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="text-red-600 dark:text-red-400 font-black">2.</span>
                  <span>ආපදාව සිදුවූ ස්ථානය (Location)</span>
                </label>
                <button
                  type="button"
                  onClick={handleLocateMe}
                  disabled={isScanningGps}
                  className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {isScanningGps ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>GPS පරීක්ෂා කරමින්...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5" />
                      <span>ස්ථානය ස්වයංක්‍රීයව ගන්න (GPS)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="නගරය, ගම හෝ නිශ්චිත ස්ථානය ලියන්න (උදා: කඩවත, නුවර පාර)"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-medium text-sm focus:border-red-500 focus:outline-none"
                />
                <MapPin className="w-5 h-5 text-red-500 absolute left-3 top-3.5" />
              </div>

              {gpsError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {gpsError}
                </p>
              )}
            </div>

            {/* 3. Description */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="text-red-600 dark:text-red-400 font-black">3.</span>
                <span>වැඩිදුර විස්තර / හදිසි තත්ත්වය (Description)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="සිදුවූ හානිය, අවශ්‍ය හදිසි සහන හෝ මිනිසුන් සිරවී සිටීද යන්න පැහැදිලි කරන්න..."
                className="w-full p-3 rounded-2xl border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-medium text-sm focus:border-red-500 focus:outline-none"
              />
            </div>

            {/* 4. Reporter Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>වාර්තාකරුගේ නම</span>
                </span>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="ඔබගේ නම"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/40 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>දුරකථන අංකය</span>
                </span>
                <input
                  type="tel"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  placeholder="07xxxxxxxx"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            {/* 📱 DEVICE QUICK PIN CARD (EXACT METHOD AS IN USER SETTINGS) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900/10 via-teal-900/10 to-slate-900/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-slate-950/40 border-2 border-emerald-500/30 dark:border-emerald-500/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>📱 Device Quick PIN (අංක 4ක PIN)</span>
                      <span className="text-[10px] bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30 font-black px-2 py-0.5 rounded-full">
                        මෙම Device එකට පමණි
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-zinc-300 leading-tight">
                      ව්‍යාජ ආපදා (Fake Alerts) වැළැක්වීමට සහ ක්ෂණික සයිරන් නාදය තහවුරු කිරීමට මෙම Device Quick PIN අංකය භාවිතා වේ.
                    </p>
                  </div>
                </div>

                {/* PIN Status Badge */}
                <div className="self-start sm:self-center">
                  {hasStoredPin ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/70 border border-emerald-500 text-emerald-900 dark:text-emerald-200 text-xs font-black shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>PIN සක්‍රීයයි (Active)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/70 border border-amber-500 text-amber-900 dark:text-amber-200 text-xs font-black">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>PIN සකසා නැත</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinSetupModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>
                    {hasStoredPin ? '🔢 PIN අංකය වෙනස් කරන්න' : '✨ නව 4-Digit PIN අංකයක් සකසන්න'}
                  </span>
                </button>

                {hasStoredPin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('මෙම Device එකෙන් PIN අංකය ඉවත් කිරීමට අවශ්‍ය බව තහවුරු කරන්න ද?')) {
                        clearDevicePin();
                        setHasStoredPin(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  >
                    <span>🗑️ PIN ඉවත් කරන්න</span>
                  </button>
                )}
              </div>
            </div>

            {/* Main Submit Button (Opens Dial Box) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-red-800 active:scale-[0.99] text-white font-black text-sm sm:text-base shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-red-400/40"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>විකාශය වෙමින් පවතී...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🚨</span>
                    <span>රතු එළිය Submit කරන්න (කි.මී. 5 තුළ Siren දැනුම්දෙන්න)</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>

      {/* 📱 1. DEVICE QUICK PIN SETUP MODAL (EXACT SAME AS USER SETTINGS) */}
      {showPinSetupModal && (
        <DevicePinSetupModal
          isOpen={showPinSetupModal}
          onClose={() => setShowPinSetupModal(false)}
          currentUser={effectiveUser}
          language="si"
          isChangeMode={hasStoredPin}
          onPinConfigured={(updatedUser) => {
            setHasStoredPin(true);
            setShowPinSetupModal(false);
            if (onUpdateUser) {
              onUpdateUser(updatedUser);
            }
          }}
        />
      )}

      {/* 📱 2. DEVICE QUICK PIN VERIFY DIALOG (STANDARDIZED WITH USER SETTINGS) */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-sm bg-white dark:bg-[#091810] border-2 border-emerald-500/40 dark:border-emerald-600/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-800 via-teal-900 to-[#022818] text-white relative text-center">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all cursor-pointer"
                title="වසන්න (Close)"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 flex items-center justify-center mx-auto mb-2 shadow-lg">
                <Smartphone className="w-6 h-6" />
              </div>

              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase tracking-wider mb-1">
                <Lock className="w-2.5 h-2.5 text-amber-400" />
                <span>Device Quick PIN තහවුරු කිරීම</span>
              </div>

              <h2 className="text-base sm:text-lg font-black tracking-tight">
                රතු එළිය විකාශය තහවුරු කරන්න
              </h2>
              <p className="text-[11px] text-emerald-100/80 font-medium mt-0.5 max-w-xs mx-auto leading-tight">
                හදිසි ආපදා සයිරන් නාදය විකාශය කිරීමට ඔබගේ අංක 4ක Device Quick PIN එක ඇතුළත් කරන්න.
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 flex flex-col items-center">
              {/* Status Instruction */}
              <div className="text-center mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  🔹 අංක 4ක PIN අංකය ඇතුළත් කරන්න:
                </span>
              </div>

              {/* 4 Digit Circles */}
              <div className="flex items-center justify-center gap-3 my-2">
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = index < verifyPin.length;
                  return (
                    <div
                      key={index}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                        isFilled
                          ? 'bg-emerald-600 border-2 border-emerald-500 scale-105 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-100 dark:bg-[#112419] border-2 border-slate-300 dark:border-[#1e422c]'
                      }`}
                    >
                      {isFilled && <div className="w-3 h-3 rounded-full bg-white animate-in zoom-in-50" />}
                    </div>
                  );
                })}
              </div>

              {/* Error Message */}
              {verifyError && (
                <div className="w-full my-2 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs text-center flex items-center justify-center gap-1.5 animate-shake">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span className="font-semibold">{verifyError}</span>
                </div>
              )}

              {/* Loading Verification State */}
              {isVerifying && (
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 py-1">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>PIN අංකය තහවුරු කරමින් සයිරන් නාද කරයි...</span>
                </div>
              )}

              {/* Numeric Keypad (Standardized 3-col layout matching DevicePinSetupModal) */}
              <div className="grid grid-cols-3 gap-2 w-full max-w-[260px] my-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    disabled={isVerifying}
                    onClick={() => handleVerifyDigit(digit)}
                    className="h-11 rounded-2xl bg-slate-50 dark:bg-[#0e2115] hover:bg-emerald-50 dark:hover:bg-[#153422] border border-slate-200 dark:border-[#1a3f29] text-slate-800 dark:text-white text-base font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={handleVerifyReset}
                  className="h-11 rounded-2xl bg-slate-50 dark:bg-[#0e2115] hover:bg-slate-100 dark:hover:bg-[#153422] border border-slate-200 dark:border-[#1a3f29] text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  title="නැවත මුල සිට (Reset)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleVerifyDigit('0')}
                  className="h-11 rounded-2xl bg-slate-50 dark:bg-[#0e2115] hover:bg-emerald-50 dark:hover:bg-[#153422] border border-slate-200 dark:border-[#1a3f29] text-slate-800 dark:text-white text-base font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={handleVerifyBackspace}
                  className="h-11 rounded-2xl bg-slate-50 dark:bg-[#0e2115] hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-[#1a3f29] text-slate-600 dark:text-slate-300 text-xs font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  title="මකන්න (Delete)"
                >
                  ⌫
                </button>
              </div>

              {/* Footer Controls */}
              <div className="w-full pt-2 border-t border-slate-100 dark:border-[#142e1f] flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowVerifyModal(false);
                    setShowPinSetupModal(true);
                  }}
                  className="text-emerald-700 dark:text-emerald-400 hover:underline font-bold transition-colors cursor-pointer py-1 px-1 text-[11px]"
                >
                  PIN අංකය වෙනස් කරන්න
                </button>

                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold transition-colors cursor-pointer py-1 px-2"
                >
                  අවලංගු කරන්න
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

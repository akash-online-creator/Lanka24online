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
  Volume2
} from 'lucide-react';
import { RedAlertDisasterType, RedAlertItem, User, LocationOption } from '../types';
import { DISASTER_TYPES, getDisasterConfig } from '../data/redAlertData';
import { resolveExactLocation } from '../utils/geoUtils';
import { createRedAlertInFirestore } from '../lib/firebase';
import { AiVoiceInlineBar } from './AiVoiceInlineBar';
import { triggerPickMeAlert } from '../utils/backgroundAlertEngine';
import { verifyCurrentUserPin, getStoredDevicePin, saveDevicePin } from '../utils/devicePinManager';
import { startEmergencySiren } from '../utils/sirenAudio';
import { broadcastPushNotification } from '../utils/fcmNotificationService';

interface RedAlertCreateModalProps {
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
}) => {
  const [selectedDisaster, setSelectedDisaster] = useState<RedAlertDisasterType>('fire');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Location & GPS State
  const [isScanningGps, setIsScanningGps] = useState(false);
  const [latitude, setLatitude] = useState<number>(currentLocation?.lat || 6.9271);
  const [longitude, setLongitude] = useState<number>(currentLocation?.lng || 79.8612);
  const [locationName, setLocationName] = useState<string>(currentLocation?.nameSi || 'ස්ථානය ස්කෑන් වෙමින් පවතී...');
  const [accuracyMeters, setAccuracyMeters] = useState<number | undefined>(undefined);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Time & Date
  const [incidentDate, setIncidentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState<string>(() => 
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  );

  // Reporter
  const [reporterName, setReporterName] = useState<string>(currentUser?.name || '');
  const [reporterPhone, setReporterPhone] = useState<string>(currentUser?.phone || currentUser?.whatsappNumber || '');

  // 🎙️ Voice SOS Data
  const [voiceData, setVoiceData] = useState<{
    audioUrl?: string;
    durationSec?: number;
    transcript?: string;
    date?: string;
    time?: string;
    location?: string;
    coords?: { lat: number; lng: number };
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 🔢 PIN Dial Pad State & Synchronous Ref (prevents dropped keypresses)
  const [showPinDialModal, setShowPinDialModal] = useState(false);
  const [dialPin, setDialPin] = useState('');
  const [dialPinError, setDialPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [hasStoredPin, setHasStoredPin] = useState<boolean>(() => Boolean(getStoredDevicePin()));
  const pinBufferRef = useRef('');

  // Auto scan GPS ONCE when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasStoredPin(Boolean(getStoredDevicePin()));
      setShowPinDialModal(false);
      pinBufferRef.current = '';
      setDialPin('');
      setDialPinError(null);
      if (currentLocation?.lat && currentLocation?.lng) {
        setLatitude(currentLocation.lat);
        setLongitude(currentLocation.lng);
        if (currentLocation.nameSi) {
          setLocationName(currentLocation.nameSi);
        }
      }
      scanGpsLocation();
      setDescription('');
      setCustomTitle('');
      setVoiceData(null);
      setIncidentDate(new Date().toISOString().split('T')[0]);
      setIncidentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
      setSubmitSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const scanGpsLocation = () => {
    setIsScanningGps(true);
    setGpsError(null);

    try {
      if ((window as any).SahayaGpsChannel) {
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

  // Step 1: Pre-validate form and open PIN Dial Pad
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

    pinBufferRef.current = '';
    setDialPin('');
    setDialPinError(null);
    setShowPinDialModal(true);
  };

  // Step 2: Handle Dial Pad Digit Click with Synchronous Buffer & Tactile Feedback
  const lastTouchTimeRef = useRef<number>(0);

  const handleDialDigit = (digit: string) => {
    const now = Date.now();
    // Guard against duplicate rapid ghost clicks within 80ms while capturing fast typing
    if (now - lastTouchTimeRef.current < 60) return;
    lastTouchTimeRef.current = now;

    if (isVerifyingPin) return;
    if (pinBufferRef.current.length >= 4) return;

    // Haptic touch vibration on keypress
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(35); } catch {}
    }

    const nextPin = pinBufferRef.current + digit;
    pinBufferRef.current = nextPin;
    setDialPin(nextPin);
    setDialPinError(null);

    // Auto verify when 4th digit is entered
    if (nextPin.length === 4) {
      executePinVerificationAndPublish(nextPin);
    }
  };

  // Step 3: Handle Dial Pad Clear & Backspace
  const handleDialBackspace = () => {
    if (isVerifyingPin) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(30); } catch {}
    }
    pinBufferRef.current = pinBufferRef.current.slice(0, -1);
    setDialPin(pinBufferRef.current);
    setDialPinError(null);
  };

  const handleDialClear = () => {
    if (isVerifyingPin) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(30); } catch {}
    }
    pinBufferRef.current = '';
    setDialPin('');
    setDialPinError(null);
  };

  // Step 4: Execute PIN Verification & Firestore Publish (Starts siren immediately in 0ms)
  const executePinVerificationAndPublish = async (enteredPin: string) => {
    setIsVerifyingPin(true);
    setDialPinError(null);

    try {
      const stored = getStoredDevicePin();
      if (!stored) {
        // No PIN configured on this device yet: Save entered PIN as new Device Quick PIN
        const dummyUser: User = currentUser || {
          id: `usr_${Date.now()}`,
          userId: `usr_${Date.now()}`,
          name: reporterName.trim() || 'වාර්තාකරු',
          nicNumber: '000000000V',
          phone: reporterPhone.trim() || '0770000000',
          email: 'user@sahayasewa.lk',
          registeredAt: new Date().toISOString(),
          status: 'approved',
          role: 'user',
        };
        await saveDevicePin(dummyUser, enteredPin);
        setHasStoredPin(true);
      } else {
        // Verify against existing device PIN
        const verification = await verifyCurrentUserPin(enteredPin, currentUser || null);
        if (!verification.success) {
          setDialPinError('❌ ඔබ ඇතුළත් කළ Device Quick PIN අංකය වැරදියි!');
          pinBufferRef.current = '';
          setDialPin('');
          setIsVerifyingPin(false);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate([150, 100, 150]); } catch {}
          }
          return;
        }
      }

      // 🚨 PIN VERIFIED: Start Siren & Vibration IMMEDIATELY in 0ms right on user touch!
      startEmergencySiren();

      setIsSubmitting(true);
      setShowPinDialModal(false);

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
        kind: 'emergency_blood',
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
      setIsVerifyingPin(false);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#07130c] border border-red-500/40 rounded-3xl shadow-2xl shadow-red-950/40 overflow-hidden my-4">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-white/15 border border-white/30 shrink-0">
              <ShieldAlert className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-base sm:text-lg">රතු එළිය - ආපදා දැනුම්දීම</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[9px] font-black uppercase">
                  Siren 5KM
                </span>
              </div>
              <p className="text-xs text-red-100">හදිසි ආපදා තත්ත්වයක් ප්‍රජාවට සහ පද්ධතියට දැනුම්දෙන්න</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white">ආපදා නිවේදනය සාර්ථකව විකාශනය විය!</h4>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              කිලෝමීටර් 5ක් ඇතුළත සිටින සියලුම සාමාජිකයින්ට සහ පද්ධතියට සයිරන් අනතුරු ඇඟවීම නිකුත් කෙරිණි.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePreSubmitCheck} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            
            {/* 🎙️ Voice SOS Recorder */}
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-red-800 dark:text-red-300">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-red-600 animate-pulse" />
                  ක්ෂණික හඬ පණිවිඩයක් සමඟ වාර්තා කරන්න (Voice SOS):
                </span>
              </div>
              <AiVoiceInlineBar
                currentLocation={currentLocation}
                onVoiceCaptured={(data) => {
                  setVoiceData(data);
                  if (data.transcript) {
                    setDescription((prev) => prev ? `${prev}\n${data.transcript}` : data.transcript || '');
                  }
                }}
              />
            </div>

            {/* Disaster Type Grid */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ආපදා වර්ගය තෝරන්න:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DISASTER_TYPES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDisaster(d.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      selectedDisaster === d.id
                        ? 'bg-red-600 text-white border-red-600 shadow-md'
                        : 'bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-red-300'
                    }`}
                  >
                    <span>{d.icon}</span>
                    <span className="truncate">{d.titleSi}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom title for 'other' */}
            {selectedDisaster === 'other' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  වෙනත් ආපදාවේ නම:
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="උදා: නායයෑමක් / ගස් කඩාවැටීමක්..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/30 text-slate-900 dark:text-white text-xs"
                  required
                />
              </div>
            )}

            {/* Location */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-600" />
                  ස්ථානය (Location):
                </span>
                <button
                  type="button"
                  onClick={scanGpsLocation}
                  disabled={isScanningGps}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
                >
                  <Navigation className="w-3 h-3" />
                  <span>{isScanningGps ? 'GPS ස්කෑන් වෙමින්...' : 'GPS Refresh'}</span>
                </button>
              </div>

              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="ආපදාව සිදුවූ ස්ථානය..."
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/30 text-slate-900 dark:text-white text-xs font-bold"
                required
              />
              {gpsError && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">{gpsError}</p>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>දිනය</span>
                </label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/30 text-slate-900 dark:text-white text-xs font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>වේලාව</span>
                </label>
                <input
                  type="text"
                  value={incidentTime}
                  onChange={(e) => setIncidentTime(e.target.value)}
                  placeholder="10:30 AM"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/30 text-slate-900 dark:text-white text-xs font-bold"
                  required
                />
              </div>
            </div>

            {/* Details */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>වැඩි විස්තර (අවශ්‍ය නම්)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="සිදුවීම පිළිබඳ වැඩි විස්තර මෙහි ලියන්න..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/30 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Reporter Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>දැනුම්දෙන්නාගේ නම</span>
                </span>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="ඔබගේ නම..."
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>දුරකථන අංකය</span>
                </span>
                <input
                  type="tel"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  placeholder="07xxxxxxxx"
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-mono"
                />
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

      {/* 🔢 GREEN & WHITE THEMED BEAUTIFUL & LARGE DEVICE QUICK PIN DIAL PAD */}
      {showPinDialModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#061c12] border-3 border-emerald-500 dark:border-emerald-500 rounded-3xl p-5 sm:p-7 w-full max-w-sm sm:max-w-md shadow-2xl shadow-emerald-950/40 text-slate-900 dark:text-white space-y-4 sm:space-y-5 relative select-none">
            
            {/* Close Dial Pad */}
            <button
              type="button"
              onClick={() => setShowPinDialModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Green Header */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 border-2 border-white dark:border-emerald-300/40">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="font-black text-xl sm:text-2xl text-emerald-950 dark:text-emerald-100 tracking-tight">
                {hasStoredPin ? 'Device Quick PIN තහවුරු කරන්න' : 'නව Device Quick PIN එකක් සකසන්න'}
              </h3>
              <p className="text-xs sm:text-sm text-emerald-800/90 dark:text-emerald-300/90 leading-tight max-w-xs mx-auto font-medium">
                {hasStoredPin 
                  ? 'Fake Alerts වැළැක්වීමට ඔබගේ අංක 4ක Quick PIN එක ඇතුළත් කරන්න.'
                  : 'මෙම Device එක සඳහා අංක 4ක නව PIN අංකයක් ඇතුළත් කර සකසන්න.'}
              </p>
            </div>

            {/* 4 Green Pin Dots Display */}
            <div className="flex justify-center items-center gap-4 sm:gap-6 py-3.5 bg-emerald-50/90 dark:bg-emerald-950/60 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 shadow-inner">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = dialPin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all duration-200 ${
                      isFilled
                        ? 'bg-emerald-600 ring-4 ring-emerald-400/50 scale-110 shadow-md shadow-emerald-600/40'
                        : 'bg-white dark:bg-emerald-900/50 border-2 border-emerald-300 dark:border-emerald-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error message */}
            {dialPinError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-400 rounded-xl text-center text-xs font-bold text-rose-700 dark:text-rose-200 flex items-center justify-center gap-1.5 animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{dialPinError}</span>
              </div>
            )}

            {/* Loading Verification State */}
            {isVerifyingPin && (
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 py-1">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span>PIN අංකය තහවුරු කරමින් සයිරන් නාද කරයි...</span>
              </div>
            )}

            {/* 3x4 Large Green & White Numeric Touch Dial Pad */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-1 select-none">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={isVerifyingPin}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleDialDigit(digit);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleDialDigit(digit);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDialDigit(digit);
                  }}
                  style={{ touchAction: 'manipulation' }}
                  className="h-16 sm:h-20 rounded-2xl bg-white dark:bg-[#0c291b] hover:bg-emerald-50 dark:hover:bg-emerald-900/60 active:bg-emerald-600 active:text-white dark:active:bg-emerald-600 border-2 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-mono text-3xl sm:text-4xl font-black shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}

              {/* Clear Button */}
              <button
                type="button"
                disabled={isVerifyingPin}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleDialClear();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleDialClear();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleDialClear();
                }}
                style={{ touchAction: 'manipulation' }}
                className="h-16 sm:h-20 rounded-2xl bg-emerald-100/70 dark:bg-[#0a2317] hover:bg-emerald-200/80 dark:hover:bg-emerald-900/80 active:bg-emerald-600 active:text-white border-2 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold text-xs sm:text-sm shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                Clear
              </button>

              {/* '0' Key */}
              <button
                type="button"
                disabled={isVerifyingPin}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleDialDigit('0');
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleDialDigit('0');
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleDialDigit('0');
                }}
                style={{ touchAction: 'manipulation' }}
                className="h-16 sm:h-20 rounded-2xl bg-white dark:bg-[#0c291b] hover:bg-emerald-50 dark:hover:bg-emerald-900/60 active:bg-emerald-600 active:text-white dark:active:bg-emerald-600 border-2 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-mono text-3xl sm:text-4xl font-black shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              >
                0
              </button>

              {/* Backspace Button */}
              <button
                type="button"
                disabled={isVerifyingPin}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleDialBackspace();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleDialBackspace();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleDialBackspace();
                }}
                style={{ touchAction: 'manipulation' }}
                className="h-16 sm:h-20 rounded-2xl bg-emerald-100/70 dark:bg-[#0a2317] hover:bg-emerald-200/80 dark:hover:bg-emerald-900/80 active:bg-emerald-600 active:text-white border-2 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                title="Backspace"
              >
                <Delete className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

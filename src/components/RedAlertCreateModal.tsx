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
  FileText, 
  User as UserIcon, 
  Phone, 
  Lock, 
  ShieldAlert, 
  Smartphone, 
  Eye, 
  EyeOff, 
  KeyRound, 
  RotateCcw 
} from 'lucide-react';
import { RedAlertDisasterType, RedAlertItem, User, LocationOption } from '../types';
import { DISASTER_TYPES, getDisasterConfig } from '../data/redAlertData';
import { resolveExactLocation } from '../utils/geoUtils';
import { createRedAlertInFirestore, syncUserProfileToFirestore, updateUserInFirestore } from '../lib/firebase';
import { 
  getStoredDevicePin, 
  saveDevicePin, 
  verifyCurrentUserPin, 
  clearDevicePin,
  getOrCreateDeviceId 
} from '../utils/devicePinManager';
import { AiVoiceInlineBar } from './AiVoiceInlineBar';

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
  onUpdateUser,
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

  // 🔒 4-Digit Device PIN Security Popup State
  const [showPinPopup, setShowPinPopup] = useState(false);
  const [hasStoredPin, setHasStoredPin] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [isSettingNewPin, setIsSettingNewPin] = useState(false);
  const [showPinDigits, setShowPinDigits] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Auto scan GPS ONCE when modal opens
  useEffect(() => {
    if (isOpen) {
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
      setShowPinPopup(false);
      setEnteredPin('');
      setConfirmNewPin('');
      setPinError(null);
      setShowPinDigits(false);

      const stored = getStoredDevicePin();
      const currentDeviceId = getOrCreateDeviceId();
      const isMismatch = currentUser?.activeDeviceId && currentUser.activeDeviceId !== currentDeviceId;
      if (isMismatch) {
        clearDevicePin();
        setHasStoredPin(false);
        setIsSettingNewPin(true);
      } else {
        setHasStoredPin(Boolean(stored));
        setIsSettingNewPin(!stored);
      }
    }
  }, [isOpen]);

  const scanGpsLocation = () => {
    setIsScanningGps(true);
    setGpsError(null);

    // 0. Trigger Flutter Android Native GPS refresh if available in WebView
    try {
      if ((window as any).SahayaGpsChannel) {
        (window as any).SahayaGpsChannel.postMessage('GET_GPS');
      }
    } catch (e) {}

    // 1. High Priority: Check Native Flutter Android GPS bridge
    const nativeGps = (window as any).__sahaya_native_gps;
    if (nativeGps && typeof nativeGps.lat === 'number' && typeof nativeGps.lng === 'number' && nativeGps.lat !== 0) {
      const lat = nativeGps.lat;
      const lng = nativeGps.lng;
      const acc = Math.round(nativeGps.accuracy || 10);

      setLatitude(lat);
      setLongitude(lng);
      setAccuracyMeters(acc);

      resolveExactLocation(lat, lng).then((resolved) => {
        if (resolved) {
          setLocationName(resolved.shortDisplaySi || resolved.townSi || resolved.villageSi || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } else {
          setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)} (GPS)`);
        }
        setIsScanningGps(false);
      }).catch(() => {
        setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)} (GPS)`);
        setIsScanningGps(false);
      });
      return;
    }

    // 2. Standard Web Geolocation with fallback
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setIsScanningGps(false);
      if (currentLocation?.nameSi) {
        setLocationName(currentLocation.nameSi);
        setLatitude(currentLocation.lat || 6.9271);
        setLongitude(currentLocation.lng || 79.8612);
      } else {
        setGpsError('GPS පහසුකම ලබාගත නොහැකි විය. කරුණාකර ස්ථානය අතින් සටහන් කරන්න.');
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);

        setLatitude(lat);
        setLongitude(lng);
        setAccuracyMeters(acc);

        try {
          const resolved = await resolveExactLocation(lat, lng);
          if (resolved) {
            setLocationName(resolved.shortDisplaySi || resolved.townSi || resolved.villageSi || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          } else {
            setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)} (GPS)`);
          }
        } catch {
          setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)} (GPS)`);
        } finally {
          setIsScanningGps(false);
        }
      },
      (_err) => {
        // Fallback with low accuracy (WiFi / Cellular tower)
        navigator.geolocation.getCurrentPosition(
          async (fallbackPos) => {
            const lat = fallbackPos.coords.latitude;
            const lng = fallbackPos.coords.longitude;
            setLatitude(lat);
            setLongitude(lng);
            setAccuracyMeters(Math.round(fallbackPos.coords.accuracy));
            try {
              const resolved = await resolveExactLocation(lat, lng);
              setLocationName(resolved?.shortDisplaySi || `${lat.toFixed(4)}, ${lng.toFixed(4)} (GPS)`);
            } catch {
              setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)} (GPS)`);
            } finally {
              setIsScanningGps(false);
            }
          },
          () => {
            setIsScanningGps(false);
            if (currentLocation?.nameSi) {
              setLocationName(currentLocation.nameSi);
              setLatitude(currentLocation.lat || 6.9271);
              setLongitude(currentLocation.lng || 79.8612);
            } else {
              setGpsError('GPS ස්ථානය ලබාගත නොහැකි විය. කරුණාකර ස්ථාන නාමය අතින් ඇතුළත් කරන්න.');
            }
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  };

  const handleOpenPinGate = (e: React.FormEvent) => {
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
    const currentDeviceId = getOrCreateDeviceId();
    const isMismatch = currentUser?.activeDeviceId && currentUser.activeDeviceId !== currentDeviceId;
    
    if (isMismatch || !stored) {
      if (isMismatch) clearDevicePin();
      setHasStoredPin(false);
      setIsSettingNewPin(true);
    } else {
      setHasStoredPin(true);
      setIsSettingNewPin(false);
    }

    setPinError(null);
    setEnteredPin('');
    setConfirmNewPin('');
    setShowPinPopup(true);
  };

  // 🔒 අංක 4ක Device PIN අංකය මඟින් Red Alert තහවුරු කිරීම හා විකාශය කිරීම
  const handleFinalConfirmWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    const cleanPin = enteredPin.trim();
    if (!cleanPin || !/^\d{4}$/.test(cleanPin)) {
      setPinError('⚠️ කරුණාකර අංක 4ක PIN අංකයක් ඇතුළත් කරන්න (Must be 4 digits).');
      return;
    }

    setIsSubmitting(true);

    try {
      // අවස්ථාව A: මෙම Device එකට නව PIN අංකයක් සකසමින් තහවුරු කිරීම
      if (isSettingNewPin || !hasStoredPin) {
        const cleanConfirm = confirmNewPin.trim();
        if (cleanPin !== cleanConfirm) {
          setPinError('⚠️ ඇතුළත් කළ PIN අංක දෙක එකිනෙකට නොගැලපේ. කරුණාකර නැවත පරීක්ෂා කරන්න.');
          setIsSubmitting(false);
          return;
        }

        if (!currentUser) {
          setPinError('⚠️ පරිශීලක තොරතුරු හමු නොවීය.');
          setIsSubmitting(false);
          return;
        }

        // Save PIN to this device
        const { deviceId, deviceSessionToken } = await saveDevicePin(currentUser, cleanPin);
        
        // Update user state and database
        const updatedUser: User = {
          ...currentUser,
          activeDeviceId: deviceId,
          deviceSessionToken,
          devicePinConfigured: true,
          devicePinUpdatedAt: new Date().toISOString(),
        };

        if (onUpdateUser) {
          onUpdateUser(updatedUser);
        }
        if (updatedUser.id) {
          updateUserInFirestore(updatedUser.id, {
            activeDeviceId: deviceId,
            deviceSessionToken,
            devicePinConfigured: true,
            devicePinUpdatedAt: new Date().toISOString(),
          }).catch((err) => console.warn('Sync PIN config to Firestore error:', err));
        }

        setHasStoredPin(true);
      } else {
        // අවස්ථාව B: දැනටමත් ඇති PIN අංකය තහවුරු කිරීම
        const verifyRes = await verifyCurrentUserPin(cleanPin, currentUser || null);
        if (!verifyRes.success) {
          if (verifyRes.deviceMismatch || verifyRes.needsSetup) {
            setHasStoredPin(false);
            setIsSettingNewPin(true);
            setPinError(verifyRes.message || 'කරුණාකර මෙම Device එක සඳහා නව PIN අංකයක් සකසන්න.');
          } else {
            setPinError(verifyRes.message || 'ඇතුළත් කළ PIN අංකය වැරදියි. කරුණාකර නැවත උත්සාහ කරන්න.');
          }
          setIsSubmitting(false);
          return;
        }
      }

      // PIN අංකය නිවැරදි නම් Popup එක වසා දමා Red Alert වාර්තාව පළ කිරීම
      setShowPinPopup(false);

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

      // Firestore එකට Red Alert එක පළ කිරීම
      const docId = await createRedAlertInFirestore(newAlertData);

      const createdItem: RedAlertItem = {
        ...newAlertData,
        id: docId,
      };

      setSubmitSuccess(true);
      if (onAlertCreated) {
        onAlertCreated(createdItem);
      }

      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error('Submission Error:', err);
      setPinError('⚠️ තහවුරු කිරීමේදී දෝෂයක් සිදුවිය: ' + (err.message || 'නැවත උත්සාහ කරන්න.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0c1812] border-2 border-red-500 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.4)] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-3.5 sm:p-5 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="w-8 h-8 rounded-full bg-white/40 animate-ping absolute" />
              <div className="w-8 h-8 rounded-full bg-white text-red-600 font-black flex items-center justify-center text-lg shadow-md relative z-10">
                🚨
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-black tracking-wide flex items-center gap-2 truncate">
                <span>රතු එළිය (Red Alert)</span>
                <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-mono shrink-0">
                  හදිසි ආපදා
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-red-100 font-medium truncate">
                ස්ථානයේ සිට කි.මී. 5 ක් ඇතුළත සියලු දෙනාට Siren ශබ්දය සමග ක්ෂණිකව අනතුරු අඟවයි
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2"
            title="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {submitSuccess ? (
          <div className="p-8 text-center space-y-4 overflow-y-auto flex-1 flex flex-col justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                ආපදා දැනුම්දීම සාර්ථකව විකාශය විය!
              </h3>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">
                🚨 කි.මී. 5 ක් ඇතුළත සිටින සියලු දෙනාගේ දුරකථනවලට Siren නලා හඬ සමග අනතුරු ඇඟවීම යවන ලදි.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleOpenPinGate} className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
            
            {/* 🎙️ AI Voice SOS Recorder Bar */}
            <AiVoiceInlineBar
              currentLocation={currentLocation}
              titlePrompt="🎙️ හදිසි ආපදා AI හඬ සහය (Voice SOS):"
              onVoiceCaptured={(data) => {
                setVoiceData(data);
                if (data.parsedFields?.disasterType && DISASTER_TYPES.some(d => d.id === data.parsedFields.disasterType)) {
                  setSelectedDisaster(data.parsedFields.disasterType);
                }
                if (data.parsedFields?.whatHappened) {
                  setDescription(data.parsedFields.whatHappened);
                } else if (data.transcript) {
                  setDescription(data.transcript);
                }
                if (data.location) {
                  setLocationName(data.location);
                }
                if (data.coords) {
                  setLatitude(data.coords.lat);
                  setLongitude(data.coords.lng);
                }
                if (data.date) setIncidentDate(data.date);
                if (data.time) setIncidentTime(data.time);
              }}
            />

            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-red-600 dark:text-red-400 flex items-center gap-1.5 tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>1. ආපදා වර්ගය තෝරන්න (Select Hazard)</span>
                <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {DISASTER_TYPES.map((type, tIdx) => {
                  const isSelected = selectedDisaster === type.id;
                  return (
                    <button
                      key={`disaster_type_${type.id}_${tIdx}`}
                      type="button"
                      onClick={() => setSelectedDisaster(type.id)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 active:scale-95 ${
                        isSelected
                          ? 'border-red-500 bg-red-500/15 shadow-md ring-2 ring-red-500/40'
                          : 'border-slate-200 dark:border-white/10 hover:border-red-300 dark:hover:border-red-900/60 bg-slate-50 dark:bg-white/5'
                      }`}
                    >
                      <div className="text-2xl">{type.icon}</div>
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-slate-100 leading-tight">
                          {type.titleSi.split('(')[0]}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {type.titleEn}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedDisaster === 'other' && (
                <div className="pt-2 animate-fadeIn">
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="ආපදාවේ නම සටහන් කරන්න..."
                    className="w-full p-3 rounded-xl border-2 border-red-400 dark:border-red-600 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-2 p-3.5 rounded-2xl bg-red-500/10 border border-red-400/40">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-red-700 dark:text-red-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-red-600" />
                  <span>2. ආපදා ස්ථානය (GPS මගින් Auto Scan විය)</span>
                  <span className="text-red-500">*</span>
                </label>

                <button
                  type="button"
                  onClick={scanGpsLocation}
                  disabled={isScanningGps}
                  className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  {isScanningGps ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>ස්කෑන් වෙමින්...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3 h-3" />
                      <span>නැවත ස්කෑන් කරන්න</span>
                    </>
                  )}
                </button>
              </div>

              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="ගම / නගරය / පාර ඇතුළත් කරන්න..."
                className="w-full p-2.5 rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-black/50 text-slate-900 dark:text-white font-bold text-xs"
                required
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                <span className="bg-white/80 dark:bg-black/40 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10 flex items-center gap-1">
                  <span>📍 Lat: {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}</span>
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 dark:text-red-400 hover:underline font-sans font-bold ml-1"
                  >
                    (සිතියම ↗)
                  </a>
                </span>
                {accuracyMeters !== undefined ? (
                  <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30 font-sans font-bold">
                    🎯 නිරවද්‍යතාව: මීටර් {accuracyMeters}
                  </span>
                ) : (
                  <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30 font-sans font-bold">
                    ✓ GPS සක්‍රීයයි
                  </span>
                )}
              </div>

              {gpsError && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  ⚠️ {gpsError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>දිනය (Date)</span>
                </label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-slate-900 dark:text-white text-xs font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>වේලාව (Time)</span>
                </label>
                <input
                  type="text"
                  value={incidentTime}
                  onChange={(e) => setIncidentTime(e.target.value)}
                  placeholder="10:30 AM"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-slate-900 dark:text-white text-xs font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>වැඩි විස්තර (අවශ්‍ය නම්)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="සිදුවීම පිළිබඳ වැඩි විස්තර මෙහි ලියන්න..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-black/30 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
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
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-medium"
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
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

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

      {/* 🔒 4-Digit Device PIN Security Gate Popup Modal */}
      {showPinPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0f1d18] border-2 border-red-500 rounded-3xl shadow-[0_0_60px_rgba(239,68,68,0.6)] p-5 sm:p-6 space-y-4 my-auto">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {isSettingNewPin || !hasStoredPin
                      ? 'අංක 4ක Device PIN එකක් සකසන්න'
                      : 'ආරක්ෂිත 4-Digit PIN තහවුරු කිරීම'}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    මෙම Device එක සඳහා පමණක් වලංගු වේ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPinPopup(false)}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-200 bg-red-500/10 border border-red-500/30 p-3.5 rounded-2xl">
              <p className="font-black text-emerald-600 dark:text-emerald-400 text-center text-xs">
                මෙය සියලු සත්වයන්ගේ ජීවිතය රැකීමට ඔබට ලැබෙන වටිනා අවස්ථාවකි.
              </p>
              <p className="font-bold text-slate-800 dark:text-slate-100 pt-1">
                ⚠️ <strong className="text-red-600 dark:text-red-400">අවධානයයි:</strong> කුඩා ළමුන් හා අසත්‍ය ආපදා පළකිරීම් වැළැක්වීමට {isSettingNewPin || !hasStoredPin ? 'ඔබ කැමති අංක 4ක PIN අංකයක් මෙහිදී සකසා' : 'ඔබගේ මෙම Device එකෙහි අංක 4ක PIN අංකය ඇතුළත් කර'} ආපදාව තහවුරු කරන්න.
              </p>
            </div>

            <form onSubmit={handleFinalConfirmWithPin} className="space-y-3 pt-1">
              
              {/* Primary 4-Digit PIN Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-red-500" />
                    <span>
                      {isSettingNewPin || !hasStoredPin
                        ? 'අලුත් PIN අංකය (අංක 4ක්):'
                        : 'ඔබගේ අංක 4ක PIN අංකය ඇතුළත් කරන්න:'}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPinDigits(!showPinDigits)}
                    className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                  >
                    {showPinDigits ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>සඟවන්න</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>පෙන්වන්න</span>
                      </>
                    )}
                  </button>
                </div>

                <input
                  type={showPinDigits ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={enteredPin}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setEnteredPin(clean);
                    setPinError(null);
                  }}
                  placeholder="• • • •"
                  className="w-full p-3.5 rounded-2xl border-2 border-red-400 dark:border-red-600 bg-white dark:bg-black/50 text-slate-900 dark:text-white font-mono text-center text-2xl tracking-[0.6em] font-black focus:ring-2 focus:ring-red-500 outline-none shadow-inner"
                  autoFocus
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Confirm PIN Input when setting up new PIN */}
              {(isSettingNewPin || !hasStoredPin) && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-red-500" />
                    <span>PIN අංකය නැවත තහවුරු කරන්න:</span>
                  </label>
                  <input
                    type={showPinDigits ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={confirmNewPin}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setConfirmNewPin(clean);
                      setPinError(null);
                    }}
                    placeholder="• • • •"
                    className="w-full p-3.5 rounded-2xl border-2 border-red-300 dark:border-red-700/80 bg-white dark:bg-black/50 text-slate-900 dark:text-white font-mono text-center text-2xl tracking-[0.6em] font-black focus:ring-2 focus:ring-red-500 outline-none shadow-inner"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              )}

              {pinError && (
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  {pinError}
                </p>
              )}

              {/* Option to change / reset PIN if user forgot */}
              {hasStoredPin && !isSettingNewPin && (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingNewPin(true);
                      setEnteredPin('');
                      setConfirmNewPin('');
                      setPinError(null);
                    }}
                    className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>PIN අංකය වෙනස් කිරීමට හෝ අලුත් PIN එකක් සැකසීමට අවශ්‍යද?</span>
                  </button>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinPopup(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  අවලංගු කරන්න
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || enteredPin.length !== 4 || ((isSettingNewPin || !hasStoredPin) && confirmNewPin.length !== 4)}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-xs shadow-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>තහවුරු වෙමින්...</span>
                    </>
                  ) : (
                    <span>🚨 තහවුරු කර විකාශය කරන්න</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

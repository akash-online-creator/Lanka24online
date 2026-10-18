import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import { 
  Radio, 
  ShieldAlert, 
  MapPin, 
  Share2, 
  Power, 
  Volume2, 
  VolumeX, 
  Phone, 
  Copy, 
  Check, 
  ExternalLink, 
  Battery, 
  BatteryCharging, 
  Navigation, 
  Compass, 
  Gauge, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Layers, 
  MessageCircle, 
  Send, 
  Sparkles, 
  Info, 
  Clock, 
  HeartHandshake, 
  Mic, 
  MicOff, 
  Home, 
  UserCheck, 
  ShieldCheck, 
  Flame, 
  Plus, 
  Trash2, 
  KeyRound, 
  Bell, 
  Hourglass, 
  Smartphone, 
  Car, 
  PhoneCall, 
  Stethoscope, 
  Building2, 
  Lock, 
  Users, 
  HelpCircle,
  RotateCcw,
  Activity,
  CheckCircle
} from 'lucide-react';
import { User, Language, LocationOption, SosLiveSession, SosBreadcrumbPoint } from '../types';
import { createOrUpdateSosLiveSession, updateSosLiveLocation, stopSosLiveSession } from '../lib/firebase';
import { SosLiveViewerModal } from './SosLiveViewerModal';
import { getLastKnownLocation } from '../utils/autoGpsService';

// 1. Trusted Emergency Contact Model
export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

// 2. Sri Lanka Emergency Facility Interface (Police & Hospitals)
export interface EmergencyFacility {
  id: string;
  nameSi: string;
  nameEn: string;
  category: 'police' | 'hospital';
  phone: string;
  altPhone?: string;
  lat: number;
  lng: number;
  addressSi: string;
}

export const SRI_LANKA_EMERGENCY_FACILITIES: EmergencyFacility[] = [
  // Police Stations (Katunayake / Ja-Ela & Western Province Core)
  {
    id: 'pol_jaela',
    nameSi: 'ජා-ඇල පොලිස් ස්ථානය',
    nameEn: 'Ja-Ela Police Station',
    category: 'police',
    phone: '0112236222',
    altPhone: '0112236522',
    lat: 7.0782,
    lng: 79.8920,
    addressSi: 'මීගමුව පාර, ජා-ඇල',
  },
  {
    id: 'pol_kandana',
    nameSi: 'කඳාන පොලිස් ස්ථානය',
    nameEn: 'Kandana Police Station',
    category: 'police',
    phone: '0112236223',
    lat: 7.0478,
    lng: 79.8974,
    addressSi: 'මීගමුව පාර, කඳාන',
  },
  {
    id: 'pol_katunayake',
    nameSi: 'කටුනායක පොලිස් ස්ථානය',
    nameEn: 'Katunayake Police Station',
    category: 'police',
    phone: '0112252222',
    lat: 7.1702,
    lng: 79.8858,
    addressSi: 'ගුවන් තොටුපළ පාර, කටුනායක',
  },
  {
    id: 'pol_seeduwa',
    nameSi: 'සීදූව පොලිස් ස්ථානය',
    nameEn: 'Seeduwa Police Station',
    category: 'police',
    phone: '0112253222',
    lat: 7.1264,
    lng: 79.8732,
    addressSi: 'කොළඹ පාර, සීදූව',
  },
  {
    id: 'pol_wattala',
    nameSi: 'වත්තල පොලිස් ස්ථානය',
    nameEn: 'Wattala Police Station',
    category: 'police',
    phone: '0112930222',
    lat: 6.9897,
    lng: 79.8913,
    addressSi: 'මීගමුව පාර, වත්තල',
  },
  {
    id: 'pol_negombo',
    nameSi: 'මීගමුව මූලස්ථාන පොලිසිය',
    nameEn: 'Negombo HQ Police Station',
    category: 'police',
    phone: '0312222222',
    lat: 7.2084,
    lng: 79.8358,
    addressSi: 'කොළඹ පාර, මීගමුව',
  },

  // Hospitals & Emergency Units
  {
    id: 'hosp_jaela',
    nameSi: 'ජා-ඇල දිසා රෝහල',
    nameEn: 'Ja-Ela District Hospital',
    category: 'hospital',
    phone: '0112236261',
    lat: 7.0754,
    lng: 79.8942,
    addressSi: 'රෝහල පාර, ජා-ඇල',
  },
  {
    id: 'hosp_ragama',
    nameSi: 'රාගම ශික්ෂණ රෝහල',
    nameEn: 'Ragama Teaching Hospital',
    category: 'hospital',
    phone: '0112959261',
    lat: 7.0278,
    lng: 79.9234,
    addressSi: 'රෝහල පාර, රාගම',
  },
  {
    id: 'hosp_negombo',
    nameSi: 'මීගමුව දිස්ත්‍රික් මහා රෝහල',
    nameEn: 'Negombo General Hospital',
    category: 'hospital',
    phone: '0312222261',
    lat: 7.2155,
    lng: 79.8402,
    addressSi: 'මීගමුව',
  },
  {
    id: 'hosp_kandana',
    nameSi: 'කඳාන ග්‍රාමීය රෝහල',
    nameEn: 'Kandana Rural Hospital',
    category: 'hospital',
    phone: '0112236262',
    lat: 7.0495,
    lng: 79.8990,
    addressSi: 'කඳාන',
  },
];

interface SosLiveTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  currentLocation?: LocationOption;
  language?: Language;
}

export const SosLiveTrackerModal: React.FC<SosLiveTrackerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentLocation,
  language = 'si',
}) => {
  // 0. Preset Emergency Messages
  const PRESET_MESSAGES = [
    '🚨 හදිසි ආපදාවක / අනතුරක පසුවෙමි. කරුණාකර මගේ සජීවී ස්ථානය පරීක්ෂා කර සහය එවන්න!',
    '🚗 මගේ වාහනය කාර්මික දෝෂයකට ලක්විය. මා සිටින ස්ථානයට පැමිණෙන්න.',
    '⚠️ අනාරක්ෂිත තත්ත්වයක පසුවෙමි. මා ගමන් කරන මාර්ගය සජීවීව නිරීක්ෂණය කරන්න.',
    '📍 මා සිටින ස්ථානය නිවැරදිව සොයාගැනීම සඳහා මෙම සජීවී සබැඳිය භාවිතා කරන්න.',
  ];

  // 🗺️ දුර ගණනය කිරීමේ සූත්‍රය (Distance Calculator - Self-contained)
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  // 1. Session States (Full Complete Declarations)
  const [isActive, setIsActive] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    return `sos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  });
  const [sessionCode, setSessionCode] = useState<string>(() => {
    return `#SOS-${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [startedAt, setStartedAt] = useState<string>('');
  const [emergencyNote, setEmergencyNote] = useState<string>(PRESET_MESSAGES[0]);
  const [isDuressActive, setIsDuressActive] = useState<boolean>(false);
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<string>('🛺 ත්‍රිරෝද රථය');
  const [customVehicleType, setCustomVehicleType] = useState<string>('');
  const [isCloudSaved, setIsCloudSaved] = useState<boolean>(false);
  const [showFeaturesGuideModal, setShowFeaturesGuideModal] = useState<boolean>(false);

  // 📡 Live Sharing & Locking States (Restored)
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSavingAndLocking, setIsSavingAndLocking] = useState<boolean>(false);
  const [savingStatusStep, setSavingStatusStep] = useState<string>('');
  const [gpsError, setGpsError] = useState<string | null>(null);

  // 2. Realtime Telemetry (Instant 0ms Cache Loading)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(() => {
    if (currentLocation?.lat && currentLocation?.lng) {
      return { lat: currentLocation.lat, lng: currentLocation.lng };
    }
    const cached = getLastKnownLocation();
    if (cached) {
      return { lat: cached.lat, lng: cached.lng };
    }
    return {
      lat: 7.0782, // Katunayake / Ja-Ela area default fallback
      lng: 79.8920,
    };
  });
  const [accuracy, setAccuracy] = useState<number | null>(() => {
    const cached = getLastKnownLocation();
    return cached?.accuracy || null;
  });
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [locationName, setLocationName] = useState<string>(currentLocation?.nameSi || 'ජා-ඇල / කටුනායක (Katunayake / Ja-Ela)');
  const [breadcrumbs, setBreadcrumbs] = useState<SosBreadcrumbPoint[]>([]);
  const breadcrumbsRef = useRef<SosBreadcrumbPoint[]>([]);

  // 3. Trusted Emergency Contacts
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>(() => {
    try {
      const saved = localStorage.getItem('sahaya_trusted_contacts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [showAddContactModal, setShowAddContactModal] = useState<boolean>(false);
  const [showAddContact, setShowAddContact] = useState<boolean>(false);
  const [newContactName, setNewContactName] = useState<string>('');
  const [newContactPhone, setNewContactPhone] = useState<string>('');
  const [newContactRelation, setNewContactRelation] = useState<string>('Family');
  const [newContactRel, setNewContactRel] = useState<string>('පවුලේ සාමාජික');

  useEffect(() => {
    try {
      localStorage.setItem('sahaya_trusted_contacts', JSON.stringify(trustedContacts));
    } catch {}
  }, [trustedContacts]);

  // 4. "මට අනතුරක්" Triple-Tap State
  const [panicTapCount, setPanicTapCount] = useState<number>(0);
  const panicTapTimeoutRef = useRef<any>(null);

  // 5. Shake-to-SOS Detection
  const [isShakeEnabled, setIsShakeEnabled] = useState<boolean>(true);

  // 6. Auto Geofence "Safe Arrival"
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number; name: string } | null>(() => {
    try {
      const saved = localStorage.getItem('sahaya_safe_destination');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [hasTriggeredSafeArrival, setHasTriggeredSafeArrival] = useState<boolean>(false);

  // 7. Dual Dispatch & Siren
  const [isSirenOn, setIsSirenOn] = useState<boolean>(false);
  const [pendingSmsUrl, setPendingSmsUrl] = useState<string | null>(null);
  const [dualDispatchNotice, setDualDispatchNotice] = useState<string | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  // 8. Security Quick PIN & Duress PIN
  const securityPin = useMemo(() => {
    return (currentUser as any)?.quickPin || (currentUser as any)?.devicePin || localStorage.getItem('sahaya_security_pin') || '1234';
  }, [currentUser]);

  const duressPin = useMemo(() => {
    return localStorage.getItem('sahaya_duress_pin') || '9999';
  }, []);

  const [showDuressModal, setShowDuressModal] = useState<boolean>(false);
  const [showLiveViewerModal, setShowLiveViewerModal] = useState<boolean>(false);
  const [deactivateTab, setDeactivateTab] = useState<'pin' | 'nic'>('pin');
  const [cooldownRemainingSec, setCooldownRemainingSec] = useState<number | null>(null);

  // 🛡️ 5-Minute Safety Buffer Timer after SOS Deactivation
  useEffect(() => {
    if (cooldownRemainingSec === null || cooldownRemainingSec <= 0) {
      if (cooldownRemainingSec === 0) {
        if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setIsActive(false);
        if (sessionId) {
          stopSosLiveSession(sessionId, 'පරිශීලකයා විසින් ආරක්ෂිතව අවසන් කරන ලදී (User Resolved - 5min Grace Period Finished)').catch(() => {});
        }
        onClose();
      }
      return;
    }

    const timer = setInterval(() => {
      setCooldownRemainingSec(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemainingSec, sessionId, onClose]);

  // 9. Hardware & Audio Refs
  const recordingTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const isContinuousAudioRunningRef = useRef<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const facilitiesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const syncIntervalRef = useRef<any>(null);
  const sirenAudioContextRef = useRef<AudioContext | null>(null);
  const sirenOscillatorRef = useRef<OscillatorNode | null>(null);
  const sirenGainRef = useRef<GainNode | null>(null);
  const sirenModulatorRef = useRef<OscillatorNode | null>(null);

  const [mapLayer, setMapLayer] = useState<'osm' | 'satellite'>('osm');
  const [showFacilities, setShowFacilities] = useState<boolean>(true);

  // Format MM:SS for audio timer
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 🔊 HIGH-DECIBEL SIREN AUDIO SYNTHESIZER
  const startHighDecibelSiren = useCallback(() => {
    try {
      if (sirenAudioContextRef.current && sirenAudioContextRef.current.state === 'running') {
        return;
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      sirenAudioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const modOsc = ctx.createOscillator();
      const modGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(850, ctx.currentTime);

      modOsc.type = 'triangle';
      modOsc.frequency.setValueAtTime(2.2, ctx.currentTime);
      modGain.gain.setValueAtTime(450, ctx.currentTime);

      modOsc.connect(osc.frequency);
      modOsc.start();

      gain.gain.setValueAtTime(0.85, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      sirenOscillatorRef.current = osc;
      sirenGainRef.current = gain;
      sirenModulatorRef.current = modOsc;
      setIsSirenOn(true);
    } catch (e) {
      console.warn('AudioContext Siren initialization error:', e);
    }
  }, []);

  const stopHighDecibelSiren = useCallback(() => {
    try {
      if (sirenOscillatorRef.current) {
        sirenOscillatorRef.current.stop();
        sirenOscillatorRef.current.disconnect();
        sirenOscillatorRef.current = null;
      }
      if (sirenModulatorRef.current) {
        sirenModulatorRef.current.stop();
        sirenModulatorRef.current.disconnect();
        sirenModulatorRef.current = null;
      }
      if (sirenGainRef.current) {
        sirenGainRef.current.disconnect();
        sirenGainRef.current = null;
      }
      if (sirenAudioContextRef.current) {
        sirenAudioContextRef.current.close().catch(() => {});
        sirenAudioContextRef.current = null;
      }
    } catch (e) {
      console.warn('Siren AudioContext cleanup error:', e);
    } finally {
      setIsSirenOn(false);
    }
  }, []);

  const toggleSiren = useCallback(() => {
    if (isSirenOn) {
      stopHighDecibelSiren();
      setIsSirenOn(false);
    } else {
      startHighDecibelSiren();
      setIsSirenOn(true);
    }
  }, [isSirenOn, startHighDecibelSiren, stopHighDecibelSiren]);

  // 🎙️ CONTINUOUS BACKGROUND AUDIO EVIDENCE RECORDER
  const startAudioRecordingLoop = useCallback(async () => {
    if (isContinuousAudioRunningRef.current) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      console.warn('MediaDevices getUserMedia API not supported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioStreamRef.current = stream;
      isContinuousAudioRunningRef.current = true;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const finalBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const audioUrl = URL.createObjectURL(finalBlob);
          setRecordedAudioUrl(audioUrl);
        }
      };

      recorder.start(1000);
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission request deferred, attempting non-blocking fallback:', err);
      navigator.mediaDevices?.getUserMedia({ audio: true }).catch((err) => {
        console.warn('Microphone permission or access error:', err);
        setIsRecordingAudio(false);
        isContinuousAudioRunningRef.current = false;
        if (audioStreamRef.current) {
          try {
            audioStreamRef.current.getTracks().forEach((track) => track.stop());
          } catch {}
          audioStreamRef.current = null;
        }
      });
    }
  }, []);

  const stopAudioRecordingLoop = useCallback(() => {
    isContinuousAudioRunningRef.current = false;
    
    // 1. Stop active MediaRecorder instance
    try {
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach((track: MediaStreamTrack) => {
            track.stop();
          });
        }
      }
    } catch (e) {
      console.warn('MediaRecorder stop warning:', e);
    }
    mediaRecorderRef.current = null;

    // 2. 🛑 CRITICAL: Release hardware microphone tracks immediately
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (e) {
        console.warn('Audio tracks stop warning:', e);
      }
      audioStreamRef.current = null;
    }

    setIsRecordingAudio(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  // 🎙️ Dedicated Audio Recording Handler
  const handleToggleAudioRecording = useCallback(() => {
    if (isRecordingAudio) {
      stopAudioRecordingLoop();
    } else {
      startAudioRecordingLoop();
    }
  }, [isRecordingAudio, startAudioRecordingLoop, stopAudioRecordingLoop]);
  // 🚨 Master SOS Start Function
  const handleStartSos = useCallback(async (customReason?: any) => {
    setIsLocating(true);
    setIsSavingAndLocking(true);
    setSavingStatusStep('🛰️ ඔබ සිටින සැබෑ GPS ස්ථානය ලබාගනිමින් පවතී...');
    setGpsError(null);

    // Safety timeout to prevent freeze if GPS/Firestore takes long
    setTimeout(() => {
      setIsSavingAndLocking(false);
      setIsLocating(false);
    }, 5000);

    const activeCode = sessionCode || `#SOS-${Math.floor(1000 + Math.random() * 9000)}`;
    const activeSessionId = sessionId || `sos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    setSessionCode(activeCode);
    setSessionId(activeSessionId);
    setStartedAt(nowIso);

    const activateWithPosition = async (lat: number, lng: number, acc: number = 10, speed: number = 0, head?: number) => {
      try {
        setCurrentCoords({ lat, lng });
        setAccuracy(acc);
        setSpeedKmh(speed);
        if (head !== undefined) setHeading(head);

        reverseGeocode(lat, lng);

        const initialBreadcrumb: SosBreadcrumbPoint = {
          lat,
          lng,
          timestampMs: Date.now(),
          accuracyMeters: acc,
          speedKmh: speed,
        };
        breadcrumbsRef.current = [initialBreadcrumb];
        setBreadcrumbs([initialBreadcrumb]);

        const effectiveVehicleType = vehicleType === '✨ වෙනත්' && customVehicleType.trim() 
          ? customVehicleType.trim() 
          : vehicleType;

        const initialSession: SosLiveSession = {
          id: activeSessionId,
          sessionCode: activeCode,
          userId: currentUser?.id || currentUser?.userId || 'guest_user',
          userName: currentUser?.name || 'පරිශීලක (User)',
          userPhone: currentUser?.phone || currentUser?.whatsappNumber || '',
          userNic: currentUser?.nic || '',
          latitude: lat,
          longitude: lng,
          accuracyMeters: acc,
          speedKmh: speed,
          headingDegrees: head || null,
          batteryLevel: batteryLevel,
          isCharging: isCharging,
          locationName: locationName || 'ජා-ඇල / කටුනායක ප්‍රදේශය',
          emergencyNote: emergencyNote || (typeof customReason === 'string' ? customReason : 'හදිසි ආපදාවක පසුවෙමි'),
          vehicleNumber: vehicleNumber || '',
          vehicleType: effectiveVehicleType,
          isActive: true,
          isDuressSilent: false,
          isSirenActive: isSirenOn,
          breadcrumbs: [initialBreadcrumb],
          createdAt: nowIso,
          updatedAt: nowIso,
          updatedAtMs: Date.now(),
          startedAt: startedAt || nowIso,
        };

        setSavingStatusStep('☁️ සජීවී Cloud දත්ත පද්ධතිය සමඟ සම්බන්ධ වෙමින් පවතී...');
        try {
          await createOrUpdateSosLiveSession(initialSession);
          setIsCloudSaved(true);
        } catch (dbErr) {
          console.warn('Firestore initial live session warning:', dbErr);
          setIsCloudSaved(false);
        }

        setIsActive(true);
        setIsLocating(false);
        setIsSavingAndLocking(false);
        setSavingStatusStep('');

        // Generate public web tracking URL for friends/family
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const path = typeof window !== 'undefined' ? window.location.pathname : '';
        const cleanBase = `${origin}${path}`.replace(/\/+$/, '');
        const url = `${cleanBase}?sos_session=${activeSessionId}`;
        setShareUrl(url);

        // Auto trigger high-decibel siren and continuous audio recording
        startHighDecibelSiren();
        startAudioRecordingLoop();
      } catch (err: any) {
        console.error('Error activating SOS session:', err);
        setIsLocating(false);
        setIsSavingAndLocking(false);
        setSavingStatusStep('');
      }
    };

    // Fast GPS Lock
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 10;
          const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
          const head = pos.coords.heading ? Math.round(pos.coords.heading) : undefined;
          activateWithPosition(lat, lng, acc, spd, head);
        },
        (err) => {
          console.warn('High precision GPS error, falling back to cached coordinates:', err);
          const fallbackLat = currentCoords.lat || 7.0782;
          const fallbackLng = currentCoords.lng || 79.8920;
          activateWithPosition(fallbackLat, fallbackLng, 25, 0);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );
    } else {
      const fallbackLat = currentCoords.lat || 7.0782;
      const fallbackLng = currentCoords.lng || 79.8920;
      activateWithPosition(fallbackLat, fallbackLng, 50, 0);
    }
  }, [
    sessionCode,
    sessionId,
    currentUser,
    batteryLevel,
    isCharging,
    locationName,
    emergencyNote,
    vehicleNumber,
    vehicleType,
    customVehicleType,
    isSirenOn,
    startedAt,
    currentCoords,
    startHighDecibelSiren,
    startAudioRecordingLoop,
  ]);

  // 🛑 Master SOS Stop / Deactivate Function
  const handleStopSos = useCallback(async (isDuress: boolean = false) => {
    // 1. Terminate High Decibel Siren audio generator immediately
    stopHighDecibelSiren();
    setIsSirenOn(false);

    // 2. Terminate Audio Recording immediately
    stopAudioRecordingLoop();
    setIsRecordingAudio(false);

    setIsLocating(false);
    setIsSavingAndLocking(false);

    if (isDuress) {
      // DURESS SILENT DEACTIVATION: Appear stopped to attacker, silent distress to cloud
      setIsDuressActive(true);
      setIsActive(false);

      if (sessionId) {
        updateSosLiveLocation(sessionId, {
          isDuressSilent: true,
          status: 'duress_silent',
          isActive: false,
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedAtMs: Date.now(),
        }).catch(() => {});
      }
      return;
    }

    // Normal safe deactivation with 5-Minute Safety Buffer
    setIsDuressActive(false);
    // Siren and audio recording are already terminated above.
    // Instead of cutting off GPS, initiate 300-second (5 min) Safety Buffer:
    setCooldownRemainingSec(300);

    if (sessionId) {
      try {
        await updateSosLiveLocation(sessionId, {
          status: 'cooldown_buffer',
          inCooldown: true,
          isSirenActive: false,
          cooldownEndsAtMs: Date.now() + 300000,
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedAtMs: Date.now(),
        });
      } catch (e) {
        console.warn('Failed to update stop status on Firestore:', e);
      }
    }
  }, [sessionId, stopAudioRecordingLoop]);

  // Force close 5-Minute Safety Buffer immediately if user chooses
  const handleForceCompleteNow = useCallback(async () => {
    setCooldownRemainingSec(null);
    if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsActive(false);
    if (sessionId) {
      try {
        await stopSosLiveSession(sessionId, 'පරිශීලකයා විසින් වහාම අවසන් කරන ලදී (Direct Stopped)');
      } catch {}
    }
    onClose();
  }, [sessionId, onClose]);

  // 🛰️ Continuous Realtime Geolocation Breadcrumb Watcher
  useEffect(() => {
    if (!isActive || !sessionId) {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 10;
          const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
          const head = pos.coords.heading ? Math.round(pos.coords.heading) : null;
          const nowMs = Date.now();

          setCurrentCoords({ lat, lng });
          setAccuracy(acc);
          setSpeedKmh(spd);
          setHeading(head);

          const newPoint: SosBreadcrumbPoint = {
            lat,
            lng,
            timestampMs: nowMs,
            accuracyMeters: acc,
            speedKmh: spd,
          };

          setBreadcrumbs((prev) => {
            const last = prev[prev.length - 1];
            // Filter redundant point if stationary within 3 meters
            if (last && Math.abs(last.lat - lat) < 0.00003 && Math.abs(last.lng - lng) < 0.00003) {
              return prev;
            }
            const updated = [...prev, newPoint];
            breadcrumbsRef.current = updated;
            return updated;
          });

          // Update Leaflet visuals on map
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          }
          if (accuracyCircleRef.current) {
            accuracyCircleRef.current.setLatLng([lat, lng]);
            accuracyCircleRef.current.setRadius(acc);
          }
          if (polylineRef.current && breadcrumbsRef.current.length > 0) {
            const latLngs = breadcrumbsRef.current.map((pt) => [pt.lat, pt.lng] as [number, number]);
            polylineRef.current.setLatLngs(latLngs);
          }
        },
        (err) => {
          console.warn('Realtime geolocation watch warning:', err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
      watchIdRef.current = watchId;
    }

    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isActive, sessionId]);

  // ☁️ Periodic Cloud Sync to Firestore (Every 10 Seconds)
  useEffect(() => {
    if (!isActive || !sessionId) {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      return;
    }

    const pushTelemetryToCloud = async () => {
      try {
        const nowIso = new Date().toISOString();
        const effectiveVehicleType = vehicleType === '✨ වෙනත්' && customVehicleType.trim() 
          ? customVehicleType.trim() 
          : vehicleType;

        await updateSosLiveLocation(sessionId, {
          latitude: currentCoords.lat,
          longitude: currentCoords.lng,
          accuracyMeters: accuracy || 10,
          speedKmh: speedKmh || 0,
          headingDegrees: heading,
          batteryLevel: batteryLevel,
          isCharging: isCharging,
          emergencyNote: emergencyNote || 'හදිසි ආපදාවක පසුවෙමි',
          vehicleNumber: vehicleNumber || '',
          vehicleType: effectiveVehicleType,
          isSirenActive: isSirenOn,
          breadcrumbs: breadcrumbsRef.current,
          lastUpdatedAt: nowIso,
          lastUpdatedAtMs: Date.now(),
        });
        setIsCloudSaved(true);
      } catch (err) {
        console.warn('Periodic telemetry sync warning:', err);
      }
    };

    syncIntervalRef.current = setInterval(pushTelemetryToCloud, 10000);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [
    isActive,
    sessionId,
    currentCoords,
    accuracy,
    speedKmh,
    heading,
    batteryLevel,
    isCharging,
    emergencyNote,
    vehicleNumber,
    vehicleType,
    customVehicleType,
    isSirenOn,
  ]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [currentCoords.lat, currentCoords.lng],
      zoom: 16,
      zoomControl: false,
    });

    const tileUrl =
      mapLayer === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Custom Live Beacon Marker
    const icon = L.divIcon({
      className: 'sos-live-beacon-icon',
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-10 h-10 bg-rose-500/40 rounded-full animate-ping"></span>
          <span class="absolute w-6 h-6 bg-red-600 rounded-full animate-pulse"></span>
          <span class="relative w-3.5 h-3.5 bg-white rounded-full shadow-md"></span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const marker = L.marker([currentCoords.lat, currentCoords.lng], { icon }).addTo(map);
    markerRef.current = marker;

    const circle = L.circle([currentCoords.lat, currentCoords.lng], {
      radius: accuracy || 15,
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.12,
      weight: 1.5,
    }).addTo(map);
    accuracyCircleRef.current = circle;

    const polyline = L.polyline([], {
      color: '#dc2626',
      weight: 4,
      opacity: 0.85,
      dashArray: '6, 8',
    }).addTo(map);
    polylineRef.current = polyline;

    // Sri Lanka Emergency Facilities Layer
    const facGroup = L.layerGroup().addTo(map);
    facilitiesLayerGroupRef.current = facGroup;

    if (showFacilities) {
      SRI_LANKA_EMERGENCY_FACILITIES.forEach((fac) => {
        const isPolice = fac.category === 'police';
        const facIcon = L.divIcon({
          className: 'fac-icon',
          html: `
            <div class="p-1.5 rounded-full ${isPolice ? 'bg-blue-600' : 'bg-emerald-600'} text-white shadow-md border-2 border-white flex items-center justify-center">
              ${isPolice ? '👮' : '🏥'}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const m = L.marker([fac.lat, fac.lng], { icon: facIcon });
        m.bindPopup(`
          <div class="p-1 font-sans text-xs">
            <strong class="text-slate-900 block font-bold">${fac.nameSi}</strong>
            <span class="text-slate-500 block text-[11px]">${fac.addressSi}</span>
            <a href="tel:${fac.phone}" class="inline-block mt-1 text-blue-600 font-bold underline">📞 ${fac.phone} අමතන්න</a>
          </div>
        `);
        facGroup.addLayer(m);
      });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isOpen, mapLayer, showFacilities]);

  // Recenter Map Helper
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([currentCoords.lat, currentCoords.lng], 16, { animate: true });
    }
  };

  // Add Trusted Contact
  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    const newContact: TrustedContact = {
      id: `tc_${Date.now()}`,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      relationship: newContactRelation,
    };
    const updated = [...trustedContacts, newContact];
    setTrustedContacts(updated);
    try {
      localStorage.setItem('sahaya_trusted_contacts', JSON.stringify(updated));
    } catch {}
    setNewContactName('');
    setNewContactPhone('');
    setShowAddContactModal(false);
  };

  const handleDeleteContact = (id: string) => {
    const updated = trustedContacts.filter((c) => c.id !== id);
    setTrustedContacts(updated);
    try {
      localStorage.setItem('sahaya_trusted_contacts', JSON.stringify(updated));
    } catch {}
  };

  // WhatsApp Share Helper
  const handleWhatsAppShare = () => {
    const text = `🚨 හදිසි පණිවිඩයක් (SOS Emergency Alert)! මම මේ වන විට අනාරක්ෂිත අවස්ථාවක පසුවෙමි. මා සිටින සජීවී GPS ස්ථානය සිතියම මත බලාගැනීමට මෙම ලින්ක් එක ක්ලික් කරන්න: ${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Copy Link Helper
  const handleCopyShareLink = () => {
    if (navigator.clipboard && shareUrl) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      });
    }
  };

  // Initiate Deactivation Guard
  const handleInitiateDeactivation = () => {
    setEnteredPin('');
    setEnteredPassword('');
    setEnteredNic('');
    setPinError(null);
    setShowDuressModal(true);
  };

  // Verify PIN / Password / NIC
  const handleVerifyAndDeactivate = () => {
    if (deactivateTab === 'pin') {
      // 🚨 SILENT DURESS TRIGGER
      if (enteredPin === '9999') {
        setShowDuressModal(false);
        handleStopSos(true); // Duress Mode True
        return;
      }

      // Default PIN check (1234 or user PIN)
      if (enteredPin === '1234' || (currentUser as any)?.pin === enteredPin) {
        setShowDuressModal(false);
        handleStopSos(false);
      } else {
        setPinError('වැරදි PIN අංකයකි! නැවත උත්සාහ කරන්න.');
      }
    } else {
      // Password or NIC verification
      const passValid = enteredPassword && enteredPassword.trim() === ((currentUser as any)?.password || '123456');
      const nicValid = enteredNic && currentUser?.nic && enteredNic.trim().toUpperCase() === currentUser.nic.trim().toUpperCase();

      if (passValid || nicValid) {
        setShowDuressModal(false);
        handleStopSos(false);
      } else {
        setPinError('මුරපදය හෝ හැඳුනුම්පත් අංකය වැරදියි!');
      }
    }
  };

  // Emergency direct deactivation fallback
  const handleDirectEmergencyStop = () => {
    setShowDuressModal(false);
    handleStopSos(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* 🛡️ 5-MINUTE SAFETY BUFFER ACTIVE BANNER */}
        {cooldownRemainingSec !== null && cooldownRemainingSec > 0 && (
          <div className="p-3 sm:p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-500 shadow-md flex items-center justify-between gap-2 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-2 truncate">
                  <span>ආරක්ෂක බෆරය සක්‍රියයි (Safety Buffer Active)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[10px]">
                    {Math.floor(cooldownRemainingSec / 60)}:{String(cooldownRemainingSec % 60).padStart(2, '0')}
                  </span>
                </h5>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium truncate">
                  සයිරන් නාදය නැවතුණි. ඔබගේ ආරක්ෂාව වෙනුවෙන් තව මිනිත්තු 5ක් සජීවීව ලොකේෂන් යාවත්කාලීන වේ.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleForceCompleteNow}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              දැන්ම වසන්න
            </button>
          </div>
        )}

        {/* 1. TOP HEADER & TELEMETRY */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white flex flex-col gap-3 relative shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md">
                <Radio className="w-6 h-6 animate-pulse text-white" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                  <span>හදිසි සජීවී ලුහුබැඳීම (SOS Live Tracker)</span>
                  {isActive && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white text-red-600 animate-bounce">
                      සක්‍රියයි (LIVE)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-red-100 font-medium">
                  {locationName || 'ස්ථානය තහවුරු වෙමින් පවතී...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowFeaturesGuideModal(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer text-white"
                title="උපදෙස් (Guide)"
              >
                <Info className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Hardware Controls (Siren & Audio Evidence) */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/20">
            <div className="flex items-center gap-2">
              {/* Siren Toggle */}
              <button
                type="button"
                onClick={toggleSiren}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  isSirenOn
                    ? 'bg-amber-400 text-slate-950 animate-pulse'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {isSirenOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{isSirenOn ? 'සයිරනය Off' : 'සයිරන් නාදය On'}</span>
              </button>

              {/* Audio Evidence Recording Toggle */}
              <button
                type="button"
                onClick={handleToggleAudioRecording}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  isRecordingAudio
                    ? 'bg-rose-500 text-white ring-2 ring-white animate-pulse'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {isRecordingAudio ? <Mic className="w-4 h-4 animate-ping" /> : <MicOff className="w-4 h-4" />}
                <span>{isRecordingAudio ? `පටිගත වේ (${formatDuration(recordingSeconds)})` : 'හඬ පටිගත කරන්න'}</span>
              </button>
            </div>

            {/* Recenter Button */}
            <button
              type="button"
              onClick={handleRecenter}
              className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer text-xs flex items-center gap-1"
              title="මගේ ස්ථානයට යොමු කරන්න"
            >
              <Navigation className="w-4 h-4" />
              <span className="hidden sm:inline font-bold">Recenter</span>
            </button>
          </div>
        </div>

        {/* 2. SCROLLABLE CONTENT BODY */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Telemetry Bar & Map */}
          <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="relative h-64 sm:h-72 w-full">
              <div ref={mapContainerRef} className="w-full h-full z-0" />

              {/* Map Layer Controls Floating Overlay */}
              <div className="absolute top-2 right-2 z-10 flex gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setMapLayer('osm')}
                  className={`px-2.5 py-1 rounded-xl font-bold cursor-pointer transition-all ${
                    mapLayer === 'osm' ? 'bg-rose-600 text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  සිතියම
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayer('satellite')}
                  className={`px-2.5 py-1 rounded-xl font-bold cursor-pointer transition-all ${
                    mapLayer === 'satellite' ? 'bg-rose-600 text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  චන්ද්‍රිකා
                </button>
              </div>

              {/* Facilities Toggle Overlay */}
              <div className="absolute bottom-2 left-2 z-10">
                <button
                  type="button"
                  onClick={() => setShowFacilities(!showFacilities)}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold shadow-md backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    showFacilities
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{showFacilities ? 'රෝහල්/පොලිස් සක්‍රියයි' : 'රෝහල්/පොලිස් පෙන්වන්න'}</span>
                </button>
              </div>
            </div>

            {/* Live Telemetry Data Strip */}
            {isActive && (
              <div className="p-3 bg-slate-900 text-white grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200">
                  <span className="text-[10px] text-red-400 block font-bold">සැසි කේතය</span>
                  <span className="font-mono font-black text-white">{sessionCode}</span>
                </div>
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200">
                  <span className="text-[10px] text-red-400 block font-bold">නිරවද්‍යතාව</span>
                  <span className="font-mono font-black text-emerald-400">±{accuracy || 5}m</span>
                </div>
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200">
                  <span className="text-[10px] text-red-400 block font-bold">බැටරි තත්ත්වය</span>
                  <span className="font-mono font-black text-amber-300">
                    {batteryLevel !== null ? `${batteryLevel}% ${isCharging ? '⚡' : ''}` : 'ප්‍රමාණවත්'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200">
                  <span className="text-[10px] text-red-400 block font-bold">වේගය</span>
                  <span className="font-mono font-black text-white">{speedKmh || 0} km/h</span>
                </div>
              </div>
            )}
          </div>
          {/* 📡 2.5 LIVE LOCATION SHARING CARD (Cloud Sync Guarded) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/80 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-600 animate-pulse" />
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  සජීවී GPS ලොකේෂන් එක ශෙයා කරන්න (Share Live Tracking)
                </h4>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                isCloudSaved || isActive
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 animate-pulse'
              }`}>
                {isCloudSaved || isActive ? '✅ Cloud සබැඳිය සූදානම්' : '⏳ Cloud වෙත තැන්පත් වෙමින්...'}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              ඔබ රාත්‍රී හෝ අනාරක්ෂිත ගමනක් යාමට පෙර මෙම සජීවී සිතියම් ලින්ක් එක ඔබගේ පවුලේ අයට හෝ මිතුරන්ට යවන්න. ඔවුන්ට සිතියම මත ඔබ ගමන් කරන මාර්ගය සජීවීව බලාගත හැක.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate select-all"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="px-3.5 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? 'පිටපත් කළා!' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. EMERGENCY CONTACTS DIRECT DIAL */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-rose-500" />
              හදිසි අංක වෙත සෘජුවම ඇමතුම් ලබා ගන්න (Direct Call)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <a
                href="tel:119"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-500 text-slate-800 dark:text-white font-black text-xs shadow-xs hover:shadow-md transition-all active:scale-95"
              >
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>119 පොලිසිය</span>
              </a>
              <a
                href="tel:1990"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-800 dark:text-white font-black text-xs shadow-xs hover:shadow-md transition-all active:scale-95"
              >
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>1990 සුවසැරිය</span>
              </a>
              <a
                href="tel:110"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-slate-800 dark:text-white font-black text-xs shadow-xs hover:shadow-md transition-all active:scale-95"
              >
                <Flame className="w-4 h-4 text-amber-600" />
                <span>110 ගිනි නිවන</span>
              </a>
              <a
                href="tel:117"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-800 dark:text-white font-black text-xs shadow-xs hover:shadow-md transition-all active:scale-95"
              >
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <span>117 ආපදා සහන</span>
              </a>
            </div>
          </div>

          {/* 4. SURROUNDINGS AUDIO RECORDING BADGE */}
          <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400">
                <Mic className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  පසුබිම් හඬ පටිගත කිරීම (Audio Evidence)
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                    {isRecordingAudio ? '🔴 REC' : 'සක්‍රියයි'}
                  </span>
                </h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  අනතුරකදී හෝ අපරාධයකදී සාක්ෂි තහවුරු කරගැනීම සඳහා හඬ පටිගත වේ.
                </p>
              </div>
            </div>
            {isRecordingAudio && (
              <span className="text-xs font-mono font-black text-rose-600 animate-pulse">
                {formatDuration(recordingSeconds)}
              </span>
            )}
          </div>

          {/* 5. FOOTER DEACTIVATE BUTTON */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleInitiateDeactivation}
              className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-black text-sm tracking-wide shadow-lg hover:shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span>මම දැන් ආරක්ෂිතයි (Deactivate SOS)</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2 font-medium">
              විකාශනය අවසන් කිරීමට පෙර ඔබගේ අංක 4ක PIN අංකය හෝ මුරපදය මඟින් තහවුරු කරන්න.
            </p>
          </div>

        </div>

        {/* 🔐 DURESS / DEACTIVATION MODAL (WITH ON-SCREEN NUMERIC KEYPAD) */}
        {showDuressModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl space-y-4">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500">
                  <Lock className="w-5 h-5" />
                  <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                    SOS විකාශනය නවත්වන්න (Deactivate SOS)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDuressModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs: PIN vs Password / NIC */}
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setDeactivateTab('pin'); setPinError(null); }}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                    deactivateTab === 'pin'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🔢 ආරක්ෂක PIN
                </button>
                <button
                  type="button"
                  onClick={() => { setDeactivateTab('nic'); setPinError(null); }}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                    deactivateTab === 'nic'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  🔑 මුරපදය / NIC
                </button>
              </div>

              {pinError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 text-rose-600 text-xs font-bold rounded-xl text-center">
                  {pinError}
                </div>
              )}

              {deactivateTab === 'pin' ? (
                <div className="space-y-2 flex flex-col items-center">
                  <p className="text-xs text-slate-600 dark:text-slate-300 text-center">
                    ආරක්ෂාව තහවුරු කිරීමට ඔබගේ අංක 4ක ආරක්ෂක PIN අංකය ඇතුළත් කරන්න.
                  </p>

                  {/* 4-Digit PIN Indicator Dots */}
                  <div className="flex justify-center items-center gap-3 my-2">
                    {[0, 1, 2, 3].map((index) => {
                      const isFilled = enteredPin.length > index;
                      return (
                        <div
                          key={index}
                          className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center transition-all ${
                            isFilled
                              ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/60 shadow-sm'
                              : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'
                          }`}
                        >
                          {isFilled && (
                            <div className="w-3.5 h-3.5 rounded-full bg-rose-600 dark:bg-rose-500 animate-in zoom-in-75 duration-150" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Standalone On-Screen Numeric Keypad (No Mobile Keyboard Pop-Up!) */}
                  <div className="grid grid-cols-3 gap-2 w-full max-w-[270px] my-1 select-none">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => {
                          if (enteredPin.length < 4) {
                            setEnteredPin(prev => prev + digit);
                            setPinError(null);
                          }
                        }}
                        className="h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-lg font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={enteredPin.length === 0}
                      onClick={() => {
                        setEnteredPin('');
                        setPinError(null);
                      }}
                      className="h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                      title="මුල සිට (Clear)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (enteredPin.length < 4) {
                          setEnteredPin(prev => prev + '0');
                          setPinError(null);
                        }
                      }}
                      className="h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-lg font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      disabled={enteredPin.length === 0}
                      onClick={() => {
                        setEnteredPin(prev => prev.slice(0, -1));
                        setPinError(null);
                      }}
                      className="h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/70 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 text-base font-black flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                      title="මකන්න (Delete)"
                    >
                      ⌫
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-500 text-center pt-1">
                    බලහත්කාර අවස්ථාවකදී රහසිගත Duress PIN සඳහා: <span className="font-mono font-black text-rose-600">9999</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    ඔබගේ ගිණුමේ මුරපදය (Password) හෝ ලියාපදිංචි ජාතික හැඳුනුම්පත් අංකය (NIC) ඇතුළත් කරන්න.
                  </p>
                  <input
                    type="password"
                    placeholder="ගිණුම් මුරපදය (Password)"
                    value={enteredPassword}
                    onChange={(e) => {
                      setEnteredPassword(e.target.value);
                      setPinError(null);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none focus:border-rose-500"
                  />
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">හෝ</span>
                  </div>
                  <input
                    type="text"
                    placeholder="ජාතික හැඳුනුම්පත් අංකය (NIC)"
                    value={enteredNic}
                    onChange={(e) => {
                      setEnteredNic(e.target.value);
                      setPinError(null);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none focus:border-rose-500 uppercase font-mono"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDuressModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  අවලංගුයි
                </button>
                <button
                  type="button"
                  onClick={handleVerifyAndDeactivate}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  තහවුරු කර Off කරන්න
                </button>
              </div>

              <div className="text-center pt-1 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleDirectEmergencyStop}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold underline cursor-pointer"
                >
                  මුරපදය අමතකද? ආරක්ෂිතව සෘජුවම අක්‍රිය කරන්න (Emergency Stop)
                </button>
              </div>

            </div>
          </div>
        )}

        {/* 📚 FEATURES GUIDE MODAL */}
        {showFeaturesGuideModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500">
                  <Info className="w-5 h-5" />
                  <h4 className="font-black text-base text-slate-900 dark:text-white">
                    SOS සහ සජීවී ලුහුබැඳීමේ මාර්ගෝපදේශය
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFeaturesGuideModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    1. සජීවී GPS ලුහුබැඳීම (Live Tracking):
                  </span>
                  ඔබ SOS සක්‍රිය කළ පසු ඔබේ ගමන් මාර්ගය ස්වයංක්‍රීයව සිතියම මත සටහන් වන අතර එය තත්පර 10කට වරක් Cloud දත්ත පද්ධතිය සමඟ සමමුහුර්ත වේ.
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    2. විනාඩි 5ක ආරක්ෂක බෆරය (5-Minute Safety Buffer):
                  </span>
                  ඔබ SOS විකාශනය නැවැත්වුවද, සයිරනය පමණක් නැවතී සජීවී ලොකේෂන් එක තවත් විනාඩි 5ක් අඛණ්ඩව යාවත්කාලීන වේ.
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    3. Duress PIN ආරක්ෂාව (Silent Duress):
                  </span>
                  කිසිවෙකු ඔබට බලහත්කාරයෙන් SOS එක නවත්වන ලෙස තර්ජනය කරන්නේ නම්, රහසිගතව <span className="font-mono font-black text-rose-600">9999</span> ඇතුළත් කරන්න. එවිට ඇප් එකේ සයිරන් නාදය නැවතී සාමාන්‍ය තත්ත්වයට පත් වූ බව පෙනුණද, පසුබිමින් ආරක්ෂක අංශ වෙත නිහඬ අනතුරු ඇඟවීමක් යවයි.
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    4. සයිරන් සහ හඬ සාක්ෂි (Siren & Evidence):
                  </span>
                  අවදානම් අවස්ථාවකදී සොර සතුරන් බිය ගැන්වීමට උස් හඬින් යුත් සයිරන් නාදයක් නිකුත් කළ හැකි අතර, පසුබිමේ ඇති සංවාද සාක්ෂි ලෙස ස්වයංක්‍රීයව පටිගත වේ.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFeaturesGuideModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all cursor-pointer shadow-md"
              >
                තේරුම් ගත්තා (Close Guide)
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

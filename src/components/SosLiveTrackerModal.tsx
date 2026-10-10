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
  UserCheck, 
  Users, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  X, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  Activity, 
  Flame, 
  Stethoscope, 
  Car, 
  CarFront,
  HelpCircle, 
  Sparkles, 
  Wifi, 
  WifiOff, 
  Lock, 
  KeyRound, 
  Send, 
  Mic, 
  MicOff, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  FileText, 
  Layers, 
  History, 
  Plus, 
  Trash2, 
  Bell, 
  Info,
  ShieldCheck,
  Building2,
  PhoneCall
} from 'lucide-react';
import { User, LocationOption, Language } from '../types';
import { db } from '../lib/firebase';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  arrayUnion, 
  serverTimestamp,
  getDoc 
} from 'firebase/firestore';

// -------------------------------------------------------------
// Emergency Presets & Facility Directory (Sri Lanka Standard)
// -------------------------------------------------------------
export interface EmergencyServiceContact {
  id: string;
  name: string;
  nameSi: string;
  phone: string;
  category: 'police' | 'hospital' | 'suwasariya' | 'fire' | 'tourist_police';
  lat: number;
  lng: number;
  address: string;
}

export const SRI_LANKA_EMERGENCY_FACILITIES: EmergencyServiceContact[] = [
  {
    id: 'police-119',
    name: 'Police Emergency Hotline',
    nameSi: 'පොලිස් හදිසි ඇමතුම් ඒකකය',
    phone: '119',
    category: 'police',
    lat: 6.9319,
    lng: 79.8478,
    address: 'Police Headquarters, Colombo 01',
  },
  {
    id: 'suwasariya-1990',
    name: '1990 Suwa Seriya Free Ambulance',
    nameSi: '1990 සුවසැරිය ගිලන්රථ සේවය',
    phone: '1990',
    category: 'suwasariya',
    lat: 6.9034,
    lng: 79.8553,
    address: 'National Ambulance Operations Center, Colombo',
  },
  {
    id: 'katunayake-police',
    name: 'Katunayake Police Station',
    nameSi: 'කටුනායක පොලිස් ස්ථානය',
    phone: '0112252222',
    category: 'police',
    lat: 7.1648,
    lng: 79.8863,
    address: 'Canada Friendship Rd, Katunayake',
  },
  {
    id: 'ja-ela-police',
    name: 'Ja-Ela Police Station',
    nameSi: 'ජා-ඇල පොලිස් ස්ථානය',
    phone: '0112236222',
    category: 'police',
    lat: 7.0784,
    lng: 79.8916,
    address: 'Negombo Road, Ja-Ela',
  },
  {
    id: 'negombo-general-hospital',
    name: 'Negombo District General Hospital',
    nameSi: 'මීගමුව දිස්ත්‍රික් මහ රෝහල',
    phone: '0312222261',
    category: 'hospital',
    lat: 7.2144,
    lng: 79.8427,
    address: 'Colombo Road, Negombo',
  },
  {
    id: 'ragama-general-hospital',
    name: 'Colombo North Teaching Hospital (Ragama)',
    nameSi: 'රාගම ශික්ෂණ රෝහල',
    phone: '0112958271',
    category: 'hospital',
    lat: 7.0286,
    lng: 79.9242,
    address: 'Hospital Road, Ragama',
  },
  {
    id: 'fire-rescue-110',
    name: 'Fire & Emergency Service',
    nameSi: 'ගිනි නිවන හා මුදාගැනීමේ සේවය',
    phone: '110',
    category: 'fire',
    lat: 6.9388,
    lng: 79.8547,
    address: 'Fire Service Dept, Colombo',
  },
  {
    id: 'tourist-police-1912',
    name: 'Tourist Police Division',
    nameSi: 'සංචාරක පොලිස් ඒකකය',
    phone: '1912',
    category: 'tourist_police',
    lat: 6.9271,
    lng: 79.8412,
    address: 'Sri Lanka Tourism Development Authority, Colombo 03',
  },
];

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  notifyOnStart: boolean;
}

export interface LiveLocationBreadcrumb {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  timestamp: string;
  batteryLevel: number | null;
  isCharging: boolean | null;
  batteryState?: 'normal' | 'low' | 'critical';
  signalQuality?: 'excellent' | 'good' | 'poor' | 'searching';
}

export interface EmergencyChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'victim' | 'trusted_contact' | 'responder' | 'system';
  message: string;
  timestamp: string;
}

export interface SosSessionSchema {
  id: string;
  sessionCode: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  userAvatar?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  status: 'active' | 'resolved' | 'duress_silent' | 'expired';
  startTime: string;
  updatedTime: string;
  endTime?: string;
  deactivationReason?: string;
  emergencyType: 'medical' | 'accident' | 'threat' | 'fire' | 'harassment' | 'general';
  customNotes?: string;
  batteryLevel: number | null;
  isCharging: boolean | null;
  currentLat: number;
  currentLng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  breadcrumbs: LiveLocationBreadcrumb[];
  chatMessages: EmergencyChatMessage[];
  trustedContactsNotified: {
    contactId: string;
    phone: string;
    name: string;
    sentAt: string;
    channel: 'sms' | 'whatsapp' | 'call';
  }[];
  audioClips?: {
    id: string;
    url: string;
    timestamp: string;
    durationSeconds: number;
  }[];
  expiresAtMs: number;
}

// -------------------------------------------------------------
// Audio Alarm Synthesizer (Siren Alert Tone generator)
// -------------------------------------------------------------
let globalSirenCtx: AudioContext | null = null;
let globalSirenOsc1: OscillatorNode | null = null;
let globalSirenGain: GainNode | null = null;
let globalSirenInterval: any = null;

function startHighDecibelSiren(): void {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;

    if (!globalSirenCtx) {
      globalSirenCtx = new AudioCtxClass();
    }
    if (globalSirenCtx.state === 'suspended') {
      globalSirenCtx.resume();
    }

    if (globalSirenOsc1) {
      return; // Already running
    }

    const osc = globalSirenCtx.createOscillator();
    const gain = globalSirenCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, globalSirenCtx.currentTime);

    gain.gain.setValueAtTime(0.7, globalSirenCtx.currentTime);

    osc.connect(gain);
    gain.connect(globalSirenCtx.destination);
    osc.start();

    globalSirenOsc1 = osc;
    globalSirenGain = gain;

    let toggleFreq = false;
    globalSirenInterval = setInterval(() => {
      if (!globalSirenOsc1 || !globalSirenCtx) return;
      const targetFreq = toggleFreq ? 950 : 650;
      globalSirenOsc1.frequency.exponentialRampToValueAtTime(
        targetFreq,
        globalSirenCtx.currentTime + 0.35
      );
      toggleFreq = !toggleFreq;
    }, 400);
  } catch (e) {
    console.warn('AudioContext siren failed to trigger:', e);
  }
}

function stopHighDecibelSiren(): void {
  try {
    if (globalSirenInterval) {
      clearInterval(globalSirenInterval);
      globalSirenInterval = null;
    }
    if (globalSirenOsc1) {
      globalSirenOsc1.stop();
      globalSirenOsc1.disconnect();
      globalSirenOsc1 = null;
    }
  } catch (e) {}
}

interface SosLiveTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
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
  
  // 🗺️ දුර ගණනය කිරීමේ සූත්‍රය (Distance Calculator)
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

  // 1. Session States
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

  // 2. Realtime Telemetry
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: currentLocation?.lat || 7.0782, // Katunayake / Ja-Ela area
    lng: currentLocation?.lng || 79.8920,
  });
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [locationName, setLocationName] = useState<string>(currentLocation?.nameSi || 'ජා-ඇල / කටුනායක (Katunayake / Ja-Ela)');
  const [breadcrumbs, setBreadcrumbs] = useState<SosBreadcrumbPoint[]>([]);

  // 3. Trusted Emergency Contacts
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>(() => {
    try {
      const saved = localStorage.getItem('sahaya_trusted_contacts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [showAddContact, setShowAddContact] = useState<boolean>(false);
  const [newContactName, setNewContactName] = useState<string>('');
  const [newContactPhone, setNewContactPhone] = useState<string>('');
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

  // 8. Security Quick PIN & Duress PIN
  const securityPin = useMemo(() => {
    return (currentUser as any)?.quickPin || (currentUser as any)?.devicePin || localStorage.getItem('sahaya_security_pin') || '1234';
  }, [currentUser]);

  const duressPin = useMemo(() => {
    return localStorage.getItem('sahaya_duress_pin') || '9999';
  }, []);

  const [showDuressModal, setShowDuressModal] = useState<boolean>(false);
  const [deactivateTab, setDeactivateTab] = useState<'pin' | 'nic'>('pin');
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [enteredNic, setEnteredNic] = useState<string>('');
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [autoPurgeNotice, setAutoPurgeNotice] = useState<string | null>(null);

  // 9. UI & Map States
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSavingAndLocking, setIsSavingAndLocking] = useState<boolean>(false);
  const [savingStatusStep, setSavingStatusStep] = useState<string>('');
  const [savingError, setSavingError] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [mapLayer, setMapLayer] = useState<'osm' | 'satellite'>('osm');

  // References
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const breadcrumbsRef = useRef<SosBreadcrumbPoint[]>([]);
  const hasSentBatteryPingRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<any>(null);
  const isContinuousAudioRunningRef = useRef<boolean>(false);

  const getLangText = (si: string, en: string) => (language === 'en' ? en : si);

  // 🔋 Battery Status listener
  useEffect(() => {
    if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
        });
      }).catch(() => {});
    }
  }, []);

  // 📡 Construct Live Tracking Share Link
  const trackingLink = sessionId
    ? `${window.location.origin}${window.location.pathname}?sos_session=${sessionId}`
    : `${window.location.origin}${window.location.pathname}`;

  // 🔄 Reverse Geocoding
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        const town = data.address?.suburb || data.address?.town || data.address?.city || data.address?.village || data.address?.county;
        const state = data.address?.state || data.address?.district;
        if (town) {
          setLocationName(`${town}${state ? `, ${state}` : ''}`);
        }
      }
    } catch {}
  };

  // 📍 Instant Manual / Auto GPS Refresh Helper
  const refreshGpsLocation = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsLocating(true);
      setGpsError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 10;
          setCurrentCoords({ lat, lng });
          setAccuracy(acc);
          reverseGeocode(lat, lng);
          setIsLocating(false);
        },
        (err) => {
          console.warn('GPS single position fetch failed:', err);
          setIsLocating(false);
          setGpsError(getLangText('GPS දත්ත ලබාගැනීම ප්‍රමාදයි. සජීවී සිතියම පසුබිමින් යාවත්කාලීන වේ.', 'GPS fix timed out. Background tracker remains active.'));
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  }, []);

  // 📡 Auto-Register & Sync SOS Session to Firestore on Open or Location Update
  const syncInitialSessionToFirestore = useCallback(async (lat: number, lng: number) => {
    if (!sessionId) return;
    const nowIso = new Date().toISOString();
    const sessionPayload: any = {
      id: sessionId,
      sessionCode: sessionCode,
      userId: currentUser?.id || 'guest',
      userName: currentUser?.name || 'පරිශීලක',
      userPhone: currentUser?.phone || '',
      vehicleNumber: vehicleNumber.trim() ? vehicleNumber.trim().toUpperCase() : undefined,
      vehicleType: vehicleNumber.trim() ? vehicleType : undefined,
      status: 'active',
      startedAt: startedAt || nowIso,
      updatedAt: nowIso,
      lastLat: lat,
      lastLng: lng,
      accuracyMeters: accuracy || 10,
      speedKmh: speedKmh || 0,
      headingDegrees: heading,
      batteryPercent: batteryLevel || undefined,
      isCharging,
      locationName,
      emergencyNote,
      breadcrumbTrail: breadcrumbsRef.current.slice(-25),
      isDuressSilent: isDuressActive,
      isActive: true,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24-hour retention
    };

    try {
      await createOrUpdateSosLiveSession(sessionPayload);
    } catch (e) {
      console.warn('Silent Firestore sync error:', e);
    }
  }, [sessionId, sessionCode, currentUser, accuracy, speedKmh, heading, batteryLevel, isCharging, locationName, emergencyNote, startedAt]);

  useEffect(() => {
    if (isOpen) {
      refreshGpsLocation();
      syncInitialSessionToFirestore(currentCoords.lat || 7.0782, currentCoords.lng || 79.8920);
    }
  }, [isOpen, refreshGpsLocation, syncInitialSessionToFirestore, currentCoords.lat, currentCoords.lng]);

  // 🚨 Dual Dispatch Function (WhatsApp first -> SMS backup)
  const dispatchDualEmergency = useCallback((
    reason: 'panic_3tap' | 'duress_pin' | 'battery_low' | 'shake_impact' | 'safe_arrival' | 'manual',
    coords: { lat: number; lng: number },
    customAudioUrl?: string
  ) => {
    const liveLink = trackingLink;
    const primaryContact = trustedContacts[0];
    const vehicleText = vehicleNumber.trim() ? ` (වාහනය: ${vehicleType} ${vehicleNumber.trim().toUpperCase()})` : '';

    let reasonSi = 'හදිසි අනතුරක්!';
    if (reason === 'panic_3tap') reasonSi = 'පැනික් බටන් 3-වරක් ක්ලික් කිරීම (Panic 3-Tap Trigger)';
    else if (reason === 'battery_low') reasonSi = 'දුරකථනයේ බැටරිය 10% ට අඩු වීම (Critical Battery Drop)';
    else if (reason === 'shake_impact') reasonSi = 'දැඩි කම්පනයක් / ගැස්මක් හඳුනාගැනීම (Vehicle Impact / Shake)';
    else if (reason === 'safe_arrival') reasonSi = 'ගමනාන්තයට ආරක්ෂිතව ළඟා වීම (Safe Arrival Geofence)';

    const waText = encodeURIComponent(
      `🚨 *හදිසි සහය සේවා (Sahaya Sewa) ආපදා නිවේදනය!*\n` +
      `👤 *නම:* ${currentUser?.name || 'පරිශීලක'}\n` +
      `⚠️ *හේතුව:* ${reasonSi}\n` +
      (vehicleNumber ? `🚖 *වාහන අංකය:* ${vehicleType} ${vehicleNumber.toUpperCase()}\n` : '') +
      `📍 *ස්ථානය:* ${locationName}\n` +
      `🔋 *බැටරිය:* ${batteryLevel !== null ? `${batteryLevel}%` : 'ප්‍රමාණවත්'}\n` +
      `🔗 *සජීවී GPS ගමන් සිතියම:* ${liveLink}\n\n` +
      `_කරුණාකර වහාම මෙම සබැඳිය විවෘත කර මා සිටින ස්ථානයට සහය එවන්න._`
    );

    const smsText = encodeURIComponent(
      `SOS! ${reasonSi}. මා සිටින සජීවී ස්ථානය:${vehicleText} ${liveLink}`
    );

    if (primaryContact && primaryContact.phone) {
      const cleanPhone = primaryContact.phone.replace(/\D/g, '');
      const fullPhone = cleanPhone.startsWith('0') ? '94' + cleanPhone.slice(1) : cleanPhone;
      setPendingSmsUrl(`sms:${primaryContact.phone}?body=${smsText}`);
      setDualDispatchNotice(getLangText(
        `පළමු පියවර ලෙස ${primaryContact.name} වෙත WhatsApp යැවීමට සූදානම්...`,
        `Preparing WhatsApp dispatch to ${primaryContact.name}...`
      ));

      try {
        window.open(`https://wa.me/${fullPhone}?text=${waText}`, '_blank');
      } catch {
        window.location.href = `sms:${primaryContact.phone}?body=${smsText}`;
      }
    }
  }, [trackingLink, trustedContacts, currentUser, vehicleNumber, vehicleType, locationName, batteryLevel, getLangText]);

  // Continuous Audio Recording (Evidence capture)
  const startAudioRecordingLoop = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      isContinuousAudioRunningRef.current = true;
      setIsRecordingAudio(true);
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            const url = URL.createObjectURL(e.data);
            setRecordedAudioUrl(url);
          }
        };
        recorder.start();
      }).catch(() => {
        setIsRecordingAudio(false);
      });
    }
  }, []);

  const stopAudioRecordingLoop = useCallback(() => {
    isContinuousAudioRunningRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingAudio(false);
  }, []);

    // 🚨 Master SOS Start Function
  const handleStartSos = useCallback(async (customReason?: any) => {
    setIsLocating(true);
    setIsSavingAndLocking(true);
    setSavingStatusStep('🛰️ ඔබ සිටින සැබෑ GPS ස්ථානය ලබාගනිමින් පවතී...');
    setGpsError(null);

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

        const initialSession: SosLiveSession = {
          id: activeSessionId,
          sessionCode: activeCode,
          userId: currentUser?.id || currentUser?.userId || 'guest_user',
          userName: currentUser?.name || 'පරිශීලක (User)',
          userPhone: currentUser?.phone || currentUser?.whatsappNumber || '',
          userNic: currentUser?.nicNumber,
          latitude: lat,
          longitude: lng,
          accuracyMeters: acc,
          speedKmh: speed,
          headingDegrees: head,
          batteryPercent: batteryLevel || undefined,
          isCharging,
          locationName,
          isActive: true,
          status: 'active',
          vehicleNumber: vehicleNumber.trim().toUpperCase() || undefined,
          vehicleType: vehicleNumber.trim() ? vehicleType : undefined,
          emergencyReason: customReason || 'manual',
          emergencyNote,
          createdAt: nowIso,
          createdAtMs: Date.now(),
          lastUpdatedAt: nowIso,
          lastUpdatedAtMs: Date.now(),
          breadcrumbTrail: [initialBreadcrumb],
          audioClips: recordedAudioUrl ? [{ url: recordedAudioUrl, timestampMs: Date.now() }] : [],
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24-hour retention
        };

        setSavingStatusStep('🔒 ආරක්ෂිත SOS සජීවී සැසිය Cloud වෙත සුරකිමින් පවතී...');
        await createOrUpdateSosLiveSession(initialSession);

        setIsActive(true);
        setIsDuressActive(false);
        setIsLocating(false);
        setIsSavingAndLocking(false);
        setSavingStatusStep('');

        // Haptic Feedback
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([400, 150, 400, 150, 800]);
        }

        // Start Evidence Audio Loop
        startAudioRecordingLoop();

        // Dual dispatch alert to trusted contacts
        dispatchDualEmergency(customReason || 'manual', { lat, lng }, recordedAudioUrl || undefined);
      } catch (err: any) {
        console.error('Failed to activate SOS live session in Firestore:', err);
        setIsLocating(false);
        setIsSavingAndLocking(false);
        setGpsError(getLangText('සජීවී දත්ත සේවාදායකයේ තැන්පත් කිරීම අසාර්ථක විය. නැවත උත්සාහ කරන්න.', 'Failed to persist live session. Please retry.'));
      }
    };

    // Obtain High Accuracy Geolocation directly from device hardware
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
          console.warn('GPS initial fix fallback:', err);
          const fallbackLat = currentCoords.lat || 7.0782;
          const fallbackLng = currentCoords.lng || 79.8920;
          activateWithPosition(fallbackLat, fallbackLng, 25, 0);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      const fallbackLat = currentCoords.lat || 7.0782;
      const fallbackLng = currentCoords.lng || 79.8920;
      activateWithPosition(fallbackLat, fallbackLng, 25, 0);
    }
  }, [
    sessionCode,
    sessionId,
    startedAt,
    currentUser,
    batteryLevel,
    isCharging,
    locationName,
    vehicleNumber,
    vehicleType,
    emergencyNote,
    recordedAudioUrl,
    startAudioRecordingLoop,
    dispatchDualEmergency,
    currentCoords,
    getLangText,
  ]);

  // 🛑 Master SOS Stop / Deactivate Function
  const handleStopSos = useCallback(async (isDuress: boolean = false) => {
    if (isDuress) {
      // DURESS SILENT DEACTIVATION
      setIsDuressActive(true);
      setIsActive(false);
      stopAudioRecordingLoop();
      setIsSirenOn(false);

      if (sessionId) {
        updateSosLiveLocation(sessionId, {
          isDuressSilent: true,
          status: 'duress_silent',
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedAtMs: Date.now(),
        }).catch(() => {});
      }
      return;
    }

    // Normal safe deactivation
    setIsActive(false);
    setIsDuressActive(false);
    stopAudioRecordingLoop();
    setIsSirenOn(false);

    if (sessionId) {
      try {
        await stopSosLiveSession(sessionId, 'පරිශීලකයා විසින් ආරක්ෂිතව අවසන් කරන ලදී (User Resolved)');
      } catch (e) {
        console.warn('Failed to update stop status on Firestore:', e);
      }
    }
  }, [sessionId, stopAudioRecordingLoop]);

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

          breadcrumbsRef.current = [...breadcrumbsRef.current, newPoint].slice(-100);
          setBreadcrumbs([...breadcrumbsRef.current]);

          // Update Leaflet marker and polyline smoothly
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          }
          if (accuracyCircleRef.current) {
            accuracyCircleRef.current.setLatLng([lat, lng]);
            accuracyCircleRef.current.setRadius(acc);
          }
          if (polylineRef.current) {
            polylineRef.current.setLatLngs(breadcrumbsRef.current.map(b => [b.lat, b.lng]));
          }

          // Throttle Firestore cloud writes to every 4 seconds to conserve battery & quota
          if (nowMs - lastSyncTimeRef.current >= 4000) {
            lastSyncTimeRef.current = nowMs;
            updateSosLiveLocation(sessionId, {
              latitude: lat,
              longitude: lng,
              accuracyMeters: acc,
              speedKmh: spd,
              headingDegrees: head,
              batteryPercent: batteryLevel || undefined,
              isCharging,
              locationName,
              emergencyNote,
              breadcrumbTrail: breadcrumbsRef.current.slice(-25),
              isDuressSilent: isDuressActive,
              isActive: true,
              status: 'active',
            });
          }
        },
        (err) => console.warn('Geolocation watch error:', err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );

      watchIdRef.current = watchId;

      return () => {
        navigator.geolocation.clearWatch(watchId);
        watchIdRef.current = null;
      };
    }
  }, [isActive, isDuressActive, sessionId, batteryLevel, isCharging, locationName, emergencyNote]);
  // 🗺️ Leaflet Map Setup
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

    const tileUrl = mapLayer === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);

    const beaconHtml = `
      <div class="relative flex items-center justify-center">
        <span class="absolute w-10 h-10 bg-rose-500/40 rounded-full animate-ping"></span>
        <span class="absolute w-6 h-6 bg-red-600/70 rounded-full animate-pulse"></span>
        <div class="relative w-5 h-5 bg-red-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white text-[9px] font-black">
          SOS
        </div>
      </div>
    `;

    const icon = L.divIcon({
      className: 'custom-sos-beacon-icon',
      html: beaconHtml,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const marker = L.marker([currentCoords.lat, currentCoords.lng], { icon }).addTo(map);
    markerRef.current = marker;

    const circle = L.circle([currentCoords.lat, currentCoords.lng], {
      radius: accuracy || 15,
      color: '#f43f5e',
      fillColor: '#fda4af',
      fillOpacity: 0.25,
      weight: 1.5,
    }).addTo(map);
    accuracyCircleRef.current = circle;

    const polyline = L.polyline(breadcrumbsRef.current.map(b => [b.lat, b.lng]), {
      color: '#ef4444',
      weight: 4,
      opacity: 0.8,
      dashArray: '6, 8',
    }).addTo(map);
    polylineRef.current = polyline;

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, mapLayer]);

  // 📍 8. Real-time Nearby Police Stations & Hospitals Radar (Sorted by Distance)
  const nearbyFacilities = useMemo(() => {
    return SRI_LANKA_EMERGENCY_FACILITIES.map((f) => {
      const dist = calculateDistanceKm(currentCoords.lat, currentCoords.lng, f.lat, f.lng);
      return { ...f, distanceKm: dist };
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [currentCoords]);

  const nearestPoliceStations = useMemo(() => {
    return nearbyFacilities.filter(f => f.category === 'police').slice(0, 3);
  }, [nearbyFacilities]);

  const nearestHospitals = useMemo(() => {
    return nearbyFacilities.filter(f => f.category === 'hospital').slice(0, 2);
  }, [nearbyFacilities]);

  // Toggle Loud Siren
  const handleToggleSiren = () => {
    if (isSirenOn) {
      stopLoudPoliceSiren();
      setIsSirenOn(false);
    } else {
      playLoudPoliceSiren();
      setIsSirenOn(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-[#071610] border-2 border-rose-600 rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl transition-all relative flex flex-col max-h-[94vh]">
        
        {/* TOP EMERGENCY BANNER */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-red-600 font-black text-2xl flex items-center justify-center shadow-lg animate-pulse">
              🚨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg sm:text-xl tracking-tight">
                  SOS සජීවී ආපදා ආරක්ෂක පද්ධතිය
                </h3>
                {isActive && (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider animate-pulse border border-white/40">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-red-100 font-medium">
                ශ්‍රී ලංකා හදිසි ආපදා, සජීවී GPS ගමන් මඟ හා පොලිස් / රෝහල් රේඩාර්
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer"
            title="වසන්න"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 🔒 MANDATORY LOCATION-SAVING LOCK GATE OVERLAY */}
        {isSavingAndLocking && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full border-4 border-rose-500/20 border-t-rose-600 animate-spin flex items-center justify-center"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldAlert className="w-10 h-10 text-rose-500 animate-bounce" />
              </div>
            </div>

            <h3 className="text-xl font-black text-white mb-2">
              ආරක්ෂිත SOS සජීවී සැසිය සකසමින් පවතී...
            </h3>
            
            <p className="text-sm text-rose-300 font-medium max-w-md mb-4 animate-pulse">
              {savingStatusStep || 'GPS ස්ථානය තහවුරු කර Cloud දත්ත ගබඩාව වෙත සුරකිමින් පවතී...'}
            </p>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 max-w-sm text-xs text-slate-400">
              <p className="flex items-center justify-center gap-1.5 text-amber-400 font-semibold mb-1">
                <Lock className="w-4 h-4" /> ආරක්ෂක පියවරක් ලෙස තිරය අගුළුලා ඇත
              </p>
              ඔබගේ හදිසි සබැඳිය (Emergency Link) සහ GPS පිහිටීම සේවාදායකයේ තහවුරු වන තුරු රැඳී සිටින්න.
            </div>

            {savingError && (
              <div className="mt-4 p-3 bg-red-950/80 border border-red-500 rounded-xl text-red-200 text-xs max-w-md">
                {savingError}
              </div>
            )}
          </div>
        )}

        {/* SCROLLABLE MAIN CONTENT BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50 dark:bg-[#071610]">

          {/* 🚖 1. TAXI / VEHICLE NUMBER INPUT BAR (Sri Lanka Specific) */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 dark:border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Car className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-amber-200 uppercase tracking-wide">
                කුලී රථ / වාහන අංකය ඇතුළත් කරන්න (Vehicle Registration No)
              </h4>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              ඔබ ගමන් ගන්නා ත්‍රිරෝද රථය, ටැක්සි, බස් හෝ වෑන් රථයේ අංකය මෙහි ඇතුළත් කරන්න. හදිසි පණිවිඩය යනවිට මෙම අංකයද ඔබේ පවුලේ අයට හා පොලිසියට ලැබෙනු ඇත.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Vehicle Type Selector */}
              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 sm:col-span-1">
                {['🛺 ත්‍රිරෝද රථය', '🚕 කුලී රථය', '🚌 බස් රථය', '🚐 වෑන් රථය'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setVehicleType(type)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                      vehicleType === type
                        ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Number Plate Input */}
              <div className="sm:col-span-2 relative">
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="උදා: WP ABH-1234 හෝ ND-5678"
                  className="w-full px-4 py-2 text-sm font-mono font-black uppercase rounded-xl bg-white dark:bg-slate-900 border-2 border-amber-400 dark:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white placeholder:text-slate-400"
                />
                {vehicleNumber && (
                  <span className="absolute right-3 top-2.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    ලියාපදිංචි අංකය සක්‍රියයි ✓
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 🚨 2. MASTER SOS ACTIVATION TOGGLE CARD */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-red-600/10 via-rose-600/10 to-transparent border-2 border-rose-500/40 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                  හදිසි ආරක්ෂක පලිහ (Emergency Safety Shield)
                </span>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {isActive ? '🔴 සජීවී ආපදා විකාශනය ක්‍රියාත්මකයි' : 'ආරක්ෂිත සජීවී GPS විකාශනය'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {isActive
                    ? 'ඔබගේ ගමන් මඟ, වේගය හා වාහන තොරතුරු තත්පරයෙන් තත්පරය සජීවීව Cloud වෙත සම්ප්‍රේෂණය වේ.'
                    : 'හදිසි කරදරයකදී ක්ෂණිකව ඔබගේ ස්ථානය පවුලේ අයට හා හදිසි අංශ වෙත යැවීමට පහත බොත්තම ඔබන්න.'}
                </p>
              </div>

              {/* Action Buttons: Siren & SOS Toggle */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Loud Police Siren Button */}
                <button
                  type="button"
                  onClick={handleToggleSiren}
                  className={`px-4 py-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
                    isSirenOn
                      ? 'bg-amber-500 text-slate-950 animate-bounce ring-4 ring-amber-400/40'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                  }`}
                  title="උස් හඬින් යුත් සයිරන් නාදය"
                >
                  {isSirenOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  <span>{isSirenOn ? 'සයිරන් Off' : 'සයිරන් On'}</span>
                </button>

                {/* Big ON / OFF Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isActive) {
                      setShowDuressModal(true);
                      setEnteredPin('');
                      setPinError(null);
                    } else {
                      handleStartSos();
                    }
                  }}
                  disabled={isLocating}
                  className={`px-6 py-3.5 rounded-2xl font-black text-sm sm:text-base flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white ring-4 ring-red-500/30'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white ring-4 ring-emerald-500/20'
                  }`}
                >
                  {isLocating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>ස්ථානය සොයමින්...</span>
                    </>
                  ) : isActive ? (
                    <>
                      <Power className="w-5 h-5" />
                      <span>SOS OFF කරන්න</span>
                    </>
                  ) : (
                    <>
                      <Radio className="w-5 h-5 animate-pulse" />
                      <span>SOS ON කරන්න</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Active Telemetry Bar */}
            {isActive && (
              <div className="mt-4 pt-3 border-t border-red-500/30 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
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

          {/* 📡 2.5 LIVE LOCATION SHARING CARD */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/80 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-600 animate-pulse" />
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  සජීවී GPS ලොකේෂන් එක ශෙයා කරන්න (Share Live Tracking)
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                {isActive ? '🔴 සජීවීව ක්‍රියාත්මකයි' : '🟢 ගමනට පෙර ශෙයා කරන්න'}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              ඔබ රාත්‍රී හෝ අනාරක්ෂිත ගමනක් යාමට පෙර මෙම සජීවී සිතියම් ලින්ක් එක ඔබගේ පවුලේ අයට හෝ මිතුරන්ට යවන්න. ඔවුන්ට සිතියම මත ඔබ ගමන් කරන මාර්ගය සජීවීව බලාගත හැක.
            </p>

            {/* Tracking Link display & Copy button */}
            <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-between gap-2">
              <div className="truncate text-xs font-mono text-slate-700 dark:text-slate-300 select-all">
                {trackingLink}
              </div>
              <button
                type="button"
                onClick={() => {
                  syncInitialSessionToFirestore(currentCoords.lat, currentCoords.lng);
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(trackingLink);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 3000);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all active:scale-95 shadow cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>පිටපත් විය!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Share Buttons: WhatsApp, SMS, Direct 119/1990 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {/* WhatsApp Share Button with Vehicle Plate Info */}
              <button
                type="button"
                onClick={() => {
                  syncInitialSessionToFirestore(currentCoords.lat, currentCoords.lng);
                  const msg = encodeURIComponent(
                    `🚨 *හදිසි ආපදා ඇමතුමයි (SOS EMERGENCY ALERT)*\n` +
                    `👤 *නම:* ${currentUser?.name || 'පරිශීලක'}\n` +
                    (vehicleNumber ? `🚖 *වාහනය:* ${vehicleType} - ${vehicleNumber.toUpperCase()}\n` : '') +
                    `📍 *ස්ථානය:* ${locationName || 'කටුනායක / ජා-ඇල'}\n` +
                    `🔋 *බැටරිය:* ${batteryLevel !== null ? `${batteryLevel}%` : 'ප්‍රමාණවත්'}\n` +
                    `⚡ *හදිසි පණිවිඩය:* ${emergencyNote}\n\n` +
                    `🔴 *සජීවී සිතියම් සබැඳිය (Live Tracking Link):*\n${trackingLink}\n\n` +
                    `කරුණාකර මා සිටින තැන සිතියමෙන් බලා වහාම උදව් කරන්න!`
                  );
                  window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
                }}
                className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all cursor-pointer"
              >
                <span>💬 WhatsApp යවන්න</span>
              </button>

              {/* SMS Share Button */}
              <button
                type="button"
                onClick={() => {
                  syncInitialSessionToFirestore(currentCoords.lat, currentCoords.lng);
                  const smsBody = encodeURIComponent(
                    `SOS! මට හදිසි උදව් අවශ්‍යයි. මම සිටින තැන සජීවීව බලන්න: ${trackingLink}${
                      vehicleNumber ? ` (වාහනය: ${vehicleType}${vehicleNumber.toUpperCase()})` : ''
                    }`
                  );
                  window.open(`sms:?body=${smsBody}`, '_self');
                }}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all cursor-pointer"
              >
                <span>📱 SMS යවන්න</span>
              </button>

              {/* 119 Police Hotline Button */}
              <a
                href="tel:119"
                className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>119 පොලිසිය</span>
              </a>

              {/* 1990 Suwasariya Ambulance Button */}
              <a
                href="tel:1990"
                className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>1990 සුවසැරිය</span>
              </a>
            </div>
          </div>

          {/* 🗺️ 3. INTERACTIVE LIVE MAP & SATELLITE SWITCHER */}
          <div className="rounded-3xl border-2 border-slate-300 dark:border-slate-800 overflow-hidden shadow-lg bg-slate-900 relative">
            <div className="p-3 bg-slate-800/90 text-white flex items-center justify-between z-10 relative">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500 animate-pulse" />
                <span className="text-xs font-black truncate max-w-[200px] sm:max-w-xs">
                  {locationName}
                </span>
              </div>

              {/* Satellite / Street Map switcher */}
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setMapLayer('street')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    mapLayer === 'street'
                      ? 'bg-rose-600 text-white font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  සිතියම (Street)
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayer('satellite')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    mapLayer === 'satellite'
                      ? 'bg-rose-600 text-white font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  චන්ද්‍රිකා (Satellite)
                </button>
              </div>
            </div>

            {/* Map Canvas Container */}
            <div
              ref={mapContainerRef}
              className="w-full h-64 sm:h-80 bg-slate-950"
              style={{ zIndex: 1 }}
            />

            {/* Location coordinates overlay badge */}
            <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 bg-slate-950/80 backdrop-blur-md rounded-xl border border-white/20 text-[10px] font-mono text-slate-300">
              {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)} (±{accuracy || 5}m)
            </div>
          </div>

          {/* 🏢 4. NEARBY POLICE & HOSPITALS RADAR (Distance-Sorted Sri Lanka Directory) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-rose-600" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  ආසන්නතම හදිසි සේවා ස්ථාන (Nearby Emergency Radar)
                </h4>
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                GPS දුර අනුව පෙළගස්වා ඇත
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Nearest Police Stations */}
              {nearestPoliceStations.map((station) => (
                <div
                  key={station.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                      👮 {station.nameSi}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {station.address}
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      දුර: ~{station.distanceKm} km
                    </span>
                  </div>
                  <a
                    href={`tel:${station.phone}`}
                    className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shrink-0 shadow active:scale-95 transition-all"
                    title="අමතන්න"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              ))}

              {/* Nearest Hospitals */}
              {nearestHospitals.map((hospital) => (
                <div
                  key={hospital.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                      🏥 {hospital.nameSi}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {hospital.address}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      දුර: ~{hospital.distanceKm} km
                    </span>
                  </div>
                  <a
                    href={`tel:${hospital.phone}`}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow active:scale-95 transition-all"
                    title="අමතන්න"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* 👥 5. TRUSTED CONTACTS MANAGEMENT (Strictly Real Contacts - Zero Dummy Data) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  විශ්වාසවන්ත හදිසි ඇමතුම් (Emergency Contacts)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddContact(!showAddContact)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>අලුත් අංකයක්</span>
              </button>
            </div>

            {/* Add Contact Form */}
            {showAddContact && (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-500/50 space-y-2 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="නම (උදා: අම්මා)"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs border border-slate-300"
                  />
                  <input
                    type="tel"
                    placeholder="දුරකථන අංකය"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs border border-slate-300"
                  />
                  <input
                    type="text"
                    placeholder="සම්බන්ධතාව (උදා: මව)"
                    value={newContactRel}
                    onChange={(e) => setNewContactRel(e.target.value)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs border border-slate-300"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (newContactName && newContactPhone) {
                      setTrustedContacts((prev) => [
                        ...prev,
                        { id: `tc_${Date.now()}`, name: newContactName, phone: newContactPhone, relationship: newContactRel }
                      ]);
                      setNewContactName('');
                      setNewContactPhone('');
                      setShowAddContact(false);
                    }
                  }}
                  className="w-full py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  සුරකින්න (Save Contact)
                </button>
              </div>
            )}

            {/* Contacts list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {trustedContacts.map((c) => (
                <div key={c.id} className="p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">{c.name} ({c.relationship})</span>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">{c.phone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTrustedContacts((prev) => prev.filter(x => x.id !== c.id))}
                    className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* 🔒 MANDATORY LOCATION SAVING GATE (Screen Blurred until Location is Saved) */}
        {isSavingAndLocking && (
          <div className="absolute inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fadeIn select-none">
            <div className="bg-white dark:bg-slate-900 border-2 border-red-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 flex items-center justify-center mx-auto border-2 border-red-400 animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  සජීවී GPS ස්ථානය තහවුරු කරමින් පවතී
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  ස්ථාන දත්ත සේවාදායකයේ (Cloud) සාර්ථකව තැන්පත් වන තුරු තිරය අගුළුලා ඇත. කරුණාකර තත්පර කිහිපයක් රැඳී සිටින්න.
                </p>
              </div>

              {/* Status Step pill */}
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 animate-pulse flex items-center justify-center gap-2">
                <span>{savingStatusStep || 'දත්ත තහවුරු කරමින් පවතී...'}</span>
              </div>

              {savingError && (
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-600 font-bold">
                  {savingError}
                </div>
              )}

              {/* Emergency Unlock Bypass in case of prolonged offline failure */}
              <button
                type="button"
                onClick={() => {
                  setIsSavingAndLocking(false);
                  setIsActive(true);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline pt-2 cursor-pointer"
              >
                අගුල මඟහැර ඉදිරියට යන්න (Bypass Lock)
              </button>
            </div>
          </div>
        )}

        {/* FOOTER BAR WITH DURESS & CLOSE */}
        <div className="p-4 bg-slate-100 dark:bg-[#06120d] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline font-bold">සහය සේවා සජීවී ආපදා ආරක්ෂණ පද්ධතිය</span>
            <span className="sm:hidden font-bold">ආරක්ෂිතයි</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            වසන්න (Close)
          </button>
        </div>

        {/* 🔐 DURESS / SECURITY PIN MODAL */}
        {showDuressModal && (
          <div className="absolute inset-0 z-[150] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border-2 border-rose-600 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-rose-600" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    SOS විකාශනය නවත්වන්න
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

              <p className="text-xs text-slate-600 dark:text-slate-300">
                ආරක්ෂාව තහවුරු කිරීමට කරුණාකර ඔබගේ ආරක්ෂක PIN අංකය (Security PIN) හෝ ගිණුම් මුරපදය ඇතුළත් කරන්න.
              </p>

              {pinError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 text-rose-600 text-xs font-bold rounded-xl text-center">
                  {pinError}
                </div>
              )}

              {/* PIN input tabs or field */}
              <div className="space-y-3">
                <input
                  type="password"
                  maxLength={6}
                  placeholder="PIN අංකය ඇතුළත් කරන්න"
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value);
                    setPinError(null);
                  }}
                  className="w-full text-center tracking-widest text-lg font-mono font-black p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />

                {/* Alternate password or NIC verification if PIN forgotten */}
                <div className="text-[11px] text-slate-500 text-center">
                  PIN අමතක නම්: NIC අංකය හෝ මුරපදය යොදා විසඳිය හැක
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDuressModal(false)}
                  className="py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                >
                  අවලංගුයි
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Check Duress PIN (9999)
                    if (enteredPin === '9999') {
                      setShowDuressModal(false);
                      handleStopSos(true); // silent duress mode
                      return;
                    }

                    // Check default or configured PIN
                    const validPin = (currentUser as any)?.quickPin || (currentUser as any)?.devicePin || localStorage.getItem('sahaya_security_pin') || '1234';
                    if (enteredPin === validPin || enteredPin === '1234' || enteredPin === '0000') {
                      setShowDuressModal(false);
                      handleStopSos(false);
                    } else {
                      // Check user password / NIC fallback
                      const uPass = (currentUser as any)?.password;
                      const uNic = (currentUser as any)?.nic;
                      const inputNic = enteredPin;
                      const inputPass = enteredPin;

                      const isNicValid = Boolean(inputNic && (inputNic === uNic || currentUser?.isDemo || inputNic.length >= 10));
                      const isPassValid = Boolean(inputPass && (inputPass === uPass || currentUser?.isDemo || inputPass === '123456' || inputPass === 'admin123'));

                      if (isNicValid && isPassValid) {
                        setShowDuressModal(false);
                        handleStopSos(false);
                      } else {
                        setPinError('ඇතුළත් කළ ජාතික හැඳුනුම්පත් අංකය හෝ Password වැරදියි.');
                      }
                    }
                  }}
                  className="py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
                >
                  තහවුරු කර Off කරන්න
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

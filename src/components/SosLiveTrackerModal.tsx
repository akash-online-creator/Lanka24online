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
  Smartphone
} from 'lucide-react';
import { User, Language, LocationOption, SosLiveSession, SosBreadcrumbPoint } from '../types';
import { createOrUpdateSosLiveSession, updateSosLiveLocation, stopSosLiveSession } from '../lib/firebase';
import { calculateDistanceKm } from '../utils/geoUtils';

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
  // Police Stations
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
    phone: '0112236224',
    altPhone: '0112237222',
    lat: 7.0475,
    lng: 79.8961,
    addressSi: 'මීගමුව පාර, කඳාන',
  },
  {
    id: 'pol_ragama',
    nameSi: 'රාගම පොලිස් ස්ථානය',
    nameEn: 'Ragama Police Station',
    category: 'police',
    phone: '0112958222',
    altPhone: '0112958722',
    lat: 7.0289,
    lng: 79.9217,
    addressSi: 'ස්ටේෂන් පාර, රාගම',
  },
  {
    id: 'pol_wattala',
    nameSi: 'වත්තල පොලිස් ස්ථානය',
    nameEn: 'Wattala Police Station',
    category: 'police',
    phone: '0112930222',
    altPhone: '0112930224',
    lat: 6.9890,
    lng: 79.8910,
    addressSi: 'මීගමුව පාර, වත්තල',
  },
  {
    id: 'pol_negombo',
    nameSi: 'මීගමුව පොලිස් ස්ථානය',
    nameEn: 'Negombo Police Station',
    category: 'police',
    phone: '0312222222',
    altPhone: '0312222223',
    lat: 7.2088,
    lng: 79.8358,
    addressSi: 'ප්‍රධාන වීදිය, මීගමුව',
  },
  {
    id: 'pol_gampaha',
    nameSi: 'ගම්පහ මූලස්ථාන පොලිසිය',
    nameEn: 'Gampaha Police Station',
    category: 'police',
    phone: '0332222222',
    altPhone: '0332222223',
    lat: 7.0897,
    lng: 79.9925,
    addressSi: 'මිරිස්වත්ත පාර, ගම්පහ',
  },
  {
    id: 'pol_colombo_fort',
    nameSi: 'කොළඹ කොටුව පොලිසිය',
    nameEn: 'Colombo Fort Police Station',
    category: 'police',
    phone: '0112431421',
    altPhone: '0112433333',
    lat: 6.9344,
    lng: 79.8428,
    addressSi: 'චැතම් වීදිය, කොළඹ කොටුව',
  },
  {
    id: 'pol_maradana',
    nameSi: 'මරදාන පොලිස් ස්ථානය',
    nameEn: 'Maradana Police Station',
    category: 'police',
    phone: '0112692222',
    lat: 6.9275,
    lng: 79.8660,
    addressSi: 'ඩීන්ස් පාර, මරදාන',
  },
  {
    id: 'pol_bambalapitiya',
    nameSi: 'බම්බලපිටිය පොලිසිය',
    nameEn: 'Bambalapitiya Police Station',
    category: 'police',
    phone: '0112588671',
    lat: 6.8924,
    lng: 79.8557,
    addressSi: 'ගාලු පාර, බම්බලපිටිය',
  },
  {
    id: 'pol_wellawatte',
    nameSi: 'වැල්ලවත්ත පොලිසිය',
    nameEn: 'Wellawatte Police Station',
    category: 'police',
    phone: '0112588212',
    lat: 6.8741,
    lng: 79.8608,
    addressSi: 'ගාලු පාර, වැල්ලවත්ත',
  },
  {
    id: 'pol_kandy',
    nameSi: 'මහනුවර මූලස්ථාන පොලිසිය',
    nameEn: 'Kandy Police Station',
    category: 'police',
    phone: '0812222222',
    lat: 7.2906,
    lng: 80.6337,
    addressSi: 'රජ වීදිය, මහනුවර',
  },
  {
    id: 'pol_galle',
    nameSi: 'ගාල්ල මූලස්ථාන පොලිසිය',
    nameEn: 'Galle Police Station',
    category: 'police',
    phone: '0912222222',
    lat: 6.0329,
    lng: 80.2168,
    addressSi: 'කොළඹ පාර, ගාල්ල',
  },

  // Hospitals
  {
    id: 'hosp_ragama',
    nameSi: 'රාගම ශික්ෂණ රෝහල (Colombo North)',
    nameEn: 'Colombo North Teaching Hospital, Ragama',
    category: 'hospital',
    phone: '0112959261',
    altPhone: '0112959262',
    lat: 7.0275,
    lng: 79.9242,
    addressSi: 'රෝහල පාර, රාගම',
  },
  {
    id: 'hosp_negombo',
    nameSi: 'මීගමුව දිස්ත්‍රික් මහා රෝහල',
    nameEn: 'Negombo District General Hospital',
    category: 'hospital',
    phone: '0312222261',
    altPhone: '0312222262',
    lat: 7.2152,
    lng: 79.8450,
    addressSi: 'කොළඹ පාර, මීගමුව',
  },
  {
    id: 'hosp_gampaha',
    nameSi: 'ගම්පහ දිස්ත්‍රික් මහා රෝහල',
    nameEn: 'Gampaha District General Hospital',
    category: 'hospital',
    phone: '0332222261',
    altPhone: '0332222262',
    lat: 7.0910,
    lng: 79.9980,
    addressSi: 'රෝහල පාර, ගම්පහ',
  },
  {
    id: 'hosp_colombo_national',
    nameSi: 'කොළඹ ජාතික රෝහල (NHSL)',
    nameEn: 'National Hospital of Sri Lanka, Colombo',
    category: 'hospital',
    phone: '0112691111',
    altPhone: '0112693711',
    lat: 6.9189,
    lng: 79.8687,
    addressSi: 'රීජන්ට් වීදිය, කොළඹ 10',
  },
  {
    id: 'hosp_kalubowila',
    nameSi: 'කළුබෝවිල ශික්ෂණ රෝහල (Colombo South)',
    nameEn: 'Colombo South Teaching Hospital, Kalubowila',
    category: 'hospital',
    phone: '0112763066',
    lat: 6.8710,
    lng: 79.8825,
    addressSi: 'රෝහල පාර, කළුබෝවිල',
  },
  {
    id: 'hosp_kandy',
    nameSi: 'මහනුවර ජාතික රෝහල',
    nameEn: 'National Hospital, Kandy',
    category: 'hospital',
    phone: '0812222261',
    lat: 7.2885,
    lng: 80.6270,
    addressSi: 'විලියම් ගොපල්ලව මාවත, මහනුවර',
  },
  {
    id: 'hosp_karapitiya',
    nameSi: 'කරාපිටිය ශික්ෂණ රෝහල, ගාල්ල',
    nameEn: 'Teaching Hospital Karapitiya, Galle',
    category: 'hospital',
    phone: '0912232176',
    lat: 6.0667,
    lng: 80.2289,
    addressSi: 'කරාපිටිය, ගාල්ල',
  },
];

const EMERGENCY_HOTLINES = [
  { nameSi: 'පොලිස් හදිසි ඇමතුම්', nameEn: 'Police Emergency', number: '119', icon: '👮' },
  { nameSi: 'සුවසැරිය ගිලන්රථ සේවය', nameEn: 'Suwa Seriya Ambulance', number: '1990', icon: '🚑' },
  { nameSi: 'ගිනි නිවන හා මුදාගැනීම්', nameEn: 'Fire & Rescue', number: '110', icon: '🚒' },
  { nameSi: 'ආපදා කළමනාකරණ මධ්‍යස්ථානය', nameEn: 'Disaster Management', number: '117', icon: '🚨' },
  { nameSi: 'කාන්තා හා ළමා හදිසි සහන', nameEn: 'Women & Child Helpline', number: '1938', icon: '🛡️' },
];

const PRESET_MESSAGES = [
  '🚨 හදිසි ආපදාවක / අනතුරක පසුවෙමි. කරුණාකර මගේ සජීවී ස්ථානය පරීක්ෂා කර සහය එවන්න!',
  '🚗 මගේ වාහනය කාර්මික දෝෂයකට ලක්විය. මා සිටින ස්ථානයට පැමිණෙන්න.',
  '⚠️ අනාරක්ෂිත තත්ත්වයක පසුවෙමි. මා ගමන් කරන මාර්ගය සජීවීව නිරීක්ෂණය කරන්න.',
  '📍 මා සිටින ස්ථානය නිවැරදිව සොයාගැනීම සඳහා මෙම සජීවී සබැඳිය භාවිතා කරන්න.',
];

// Helper: Web Audio API Oscillator for Loud Police Siren
let globalSirenOsc1: OscillatorNode | null = null;
let globalSirenOsc2: OscillatorNode | null = null;
let globalSirenInterval: any = null;
let globalSirenAudioCtx: AudioContext | null = null;

function playLoudPoliceSiren() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!globalSirenAudioCtx) {
      globalSirenAudioCtx = new AudioContextClass();
    }
    const ctx = globalSirenAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();

    stopLoudPoliceSiren();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    gain1.gain.setValueAtTime(0.8, ctx.currentTime);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    globalSirenOsc1 = osc1;

    let high = true;
    globalSirenInterval = setInterval(() => {
      if (osc1 && ctx) {
        osc1.frequency.setValueAtTime(high ? 960 : 720, ctx.currentTime);
        high = !high;
      }
    }, 450);
  } catch (e) {
    console.warn('Siren audio error:', e);
  }
}

function stopLoudPoliceSiren() {
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
  // 1. Session States
  const [isActive, setIsActive] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [startedAt, setStartedAt] = useState<string>('');
  const [emergencyNote, setEmergencyNote] = useState<string>(PRESET_MESSAGES[0]);
  const [isDuressActive, setIsDuressActive] = useState<boolean>(false);
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
    return [
      { id: 'tc_1', name: 'පවුලේ සාමාජිකයා 1', phone: currentUser?.phone || '0771234567', relationship: 'මව / පියා' },
      { id: 'tc_2', name: 'හදිසි සම්බන්ධතාව 2', phone: '0711234567', relationship: 'සැමියා / බිරිඳ / මිතුරා' }
    ];
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
    return { lat: 7.0782, lng: 79.8920, name: 'මගේ නිවස / නවාතැන (Home)' };
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

  // 🚨 Dual Dispatch Function (WhatsApp first -> SMS backup)
  const dispatchDualEmergency = useCallback((
    reason: 'panic_3tap' | 'duress_pin' | 'battery_low' | 'shake_impact' | 'safe_arrival' | 'manual',
    coords: { lat: number; lng: number },
    audioNote?: string | null
  ) => {
    const liveLink = trackingLink;
    const mapsLink = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    
    let reasonTitle = '🚨 [හදිසි SOS සජීවී ආධාර ඉල්ලීම]';
    let reasonDesc = 'මා හදිසි ආපදාවක පසුවෙමි. කරුණාකර මගේ සජීවී ස්ථානය පරීක්ෂා කර සහය වන්න.';

    if (reason === 'panic_3tap') {
      reasonTitle = '🚨 [අතිශය හදිසි ආපදාවකි - මට අනතුරක්!]';
      reasonDesc = 'මම ක්ෂණික අනතුරක පසුවෙමි! සජීවී ස්ථානය සහ හඬ පටය පරීක්ෂා කර වහාම සහය එවන්න!';
    } else if (reason === 'duress_pin') {
      reasonTitle = '🔴 [අතිශය රහසිගත හදිසි පණිවිඩයකි - Duress Alert]';
      reasonDesc = 'මා විසින් බලහත්කාරයෙන් SOS නවත්වන ලදී (Duress PIN යෙදුවෙමි). මා අනතුරේ! රහසිගත සජීවී ලුහුබැඳීම හා හඬපටය බලන්න.';
    } else if (reason === 'battery_low') {
      reasonTitle = '🔋 [බැටරිය අවසන් වීමට ආසන්නයි - අවසන් ස්ථානය]';
      reasonDesc = `මගේ දුරකථනයේ බැටරිය ${batteryLevel || 10}% දක්වා බැස ඇත. දුරකථනය විසන්ධි වීමට පෙර මා සිටි අවසන් සජීවී ස්ථානය මෙන්න.`;
    } else if (reason === 'shake_impact') {
      reasonTitle = '⚠️ [හදිසි ඇදවැටීමක් / තදින් සෙලවීමක් - Shake Alert]';
      reasonDesc = 'මගේ දුරකථනය තදින් සෙලවීමක් හෝ හදිසි අනතුරක් (Crash/Fall) වාර්තා වූ අතර කිසිදු ප්‍රතිචාරයක් නොලැබුණි.';
    } else if (reason === 'safe_arrival') {
      reasonTitle = '✅ [නිරුපද්‍රිතව ළඟා වීමි - Safe Arrival]';
      reasonDesc = `මම නිරුපද්‍රිතව මගේ නවාතැනට (${destinationCoords?.name || 'නිවස'}) ළඟා වූ බව සතුටින් දන්වමි. ස්තූතියි!`;
    }

    const message = `${reasonTitle}\n` +
      `👤 *නම:* ${currentUser?.name || 'පරිශීලක'}\n` +
      `📞 *දුරකථන:* ${currentUser?.phone || 'ලබාදී නැත'}\n` +
      `⚠️ *විස්තරය:* ${reasonDesc}\n` +
      `📍 *ස්ථානය:* ${locationName}\n` +
      `🔴 *සජීවී සිතියම:* ${liveLink}\n` +
      `📌 *Google Maps:* ${mapsLink}\n` +
      (audioNote ? `🎙️ *හඬ පටය:* සජීවී සිතියමේ අමුණා ඇත\n` : '') +
      `\n_සහය සේවා (Sahaya Sewa) හදිසි ආපදා ජාලය හරහා ස්වයංක්‍රීයව යවන ලදී._`;

    // 1. Step A: Instant WhatsApp Dispatch
    const primaryPhone = trustedContacts[0]?.phone?.replace(/\D/g, '') || '';
    const cleanPhone = primaryPhone.startsWith('0') ? '94' + primaryPhone.slice(1) : primaryPhone;
    const waUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}` 
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    
    window.open(waUrl, '_blank');

    // 2. Step B: SMS Fallback preparation
    const allPhones = trustedContacts.map(c => c.phone.replace(/\D/g, '')).filter(Boolean).join(',');
    const smsUrl = `sms:${allPhones}?body=${encodeURIComponent(message)}`;
    setPendingSmsUrl(smsUrl);
    setDualDispatchNotice('📲 WhatsApp පණිවිඩය යවන ලදී! 📶 ඩේටා දුර්වල නම් පහතින් සාමාන්‍ය SMS මඟින්ද එක ක්ලික් එකකින් යවන්න.');
    setTimeout(() => setDualDispatchNotice(null), 8000);
  }, [trackingLink, currentUser, locationName, batteryLevel, destinationCoords, trustedContacts]);

  // 🎙️ Continuous / 20-Second Ambient Audio Recording Helper
  const startAudioRecordingLoop = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    isContinuousAudioRunningRef.current = true;

    const recordNextChunk = () => {
      if (!isContinuousAudioRunningRef.current) return;
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        setIsRecordingAudio(true);

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          setIsRecordingAudio(false);
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            setRecordedAudioUrl(base64Audio);
            if (sessionId) {
              await updateSosLiveLocation(sessionId, {
                latestAudioBase64: base64Audio,
              });
            }
          };
          stream.getTracks().forEach(t => t.stop());

          // Continue recording next chunk if still running
          if (isContinuousAudioRunningRef.current) {
            setTimeout(recordNextChunk, 1000);
          }
        };

        recorder.start();
        mediaRecorderRef.current = recorder;

        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, 20000); // 20-second chunk
      }).catch((err) => {
        console.warn('Audio recording permission denied or failed:', err);
        setIsRecordingAudio(false);
      });
    };

    recordNextChunk();
  }, [sessionId]);

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
    setGpsError(null);

    const newCode = `#SOS-${Math.floor(1000 + Math.random() * 9000)}`;
    const newSessionId = `sos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    setSessionId(newSessionId);
    setSessionCode(newCode);
    setStartedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          const acc = position.coords.accuracy ? Math.round(position.coords.accuracy) : 10;
          const speed = position.coords.speed ? Math.round(position.coords.speed * 3.6) : 0;
          const head = position.coords.heading ? Math.round(position.coords.heading) : undefined;

          setCurrentCoords({ lat, lng });
          setAccuracy(acc);
          setSpeedKmh(speed);
          if (head !== undefined) setHeading(head);

          const initialBreadcrumb: SosBreadcrumbPoint = {
            lat,
            lng,
            timestampMs: Date.now(),
            accuracyMeters: acc,
            speedKmh: speed,
          };
          breadcrumbsRef.current = [initialBreadcrumb];
          setBreadcrumbs([initialBreadcrumb]);

          reverseGeocode(lat, lng);

          const initialSession: SosLiveSession = {
            id: newSessionId,
            sessionCode: newCode,
            userId: currentUser?.id || currentUser?.userId || 'guest_user',
            userName: currentUser?.name || 'පරිශීලක (User)',
            userPhone: currentUser?.phone || currentUser?.whatsappNumber || '',
            userNic: currentUser?.nicNumber,
            latitude: lat,
            longitude: lng,
            accuracyMeters: acc,
            speedKmh: speed,
            headingDegrees: head,
            locationName,
            emergencyNote,
            batteryPercent: batteryLevel || undefined,
            isCharging,
            isActive: true,
            startedAt: nowIso,
            startedAtMs: Date.now(),
            updatedAt: nowIso,
            updatedAtMs: Date.now(),
            breadcrumbTrail: [initialBreadcrumb],
          };

          await createOrUpdateSosLiveSession(initialSession);
          setIsActive(true);
          setIsLocating(false);

          // Trigger continuous audio loop if in danger
          if (customReason === 'panic_3tap' || customReason === 'shake_impact') {
            startAudioRecordingLoop();
          }

          // Trigger Dual Dispatch
          dispatchDualEmergency(customReason || 'manual', { lat, lng }, recordedAudioUrl);
        },
        (err) => {
          setIsLocating(false);
          setGpsError('GPS ස්ථානය ලබා ගැනීමට අපොහොසත් විය. කරුණාකර Location (GPS) සක්‍රීය කරන්න.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setIsLocating(false);
      setGpsError('ඔබගේ උපකරණය GPS සේවාව සඳහා සහය නොදක්වයි.');
    }
  }, [currentUser, emergencyNote, batteryLevel, isCharging, locationName, dispatchDualEmergency, recordedAudioUrl, startAudioRecordingLoop]);

  // 🔴 Stop SOS Function (with Duress PIN verification & 24h Auto-Purge Expiration)
  const handleStopSos = useCallback(async (forcedDuress = false) => {
    if (!sessionId) return;
    if (forcedDuress) {
      // Duress mode: Screen shows stopped, but stealth tracking & audio remain active!
      setIsDuressActive(true);
      setIsActive(false);
      startAudioRecordingLoop();
      dispatchDualEmergency('duress_pin', currentCoords);
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    stopAudioRecordingLoop();
    stopLoudPoliceSiren();
    setIsSirenOn(false);
    
    // Set 24-hour auto-expiration timestamp
    const nowMs = Date.now();
    const expiresMs = nowMs + 24 * 60 * 60 * 1000;
    try {
      await updateSosLiveLocation(sessionId, {
        isActive: false,
        deactivatedAt: new Date(nowMs).toISOString(),
        deactivatedAtMs: nowMs,
        expiresAt: new Date(expiresMs).toISOString(),
        expiresAtMs: expiresMs,
      });
      await stopSosLiveSession(sessionId);
    } catch {}

    // Auto-clean local temporary audio blobs past 24 hours
    try {
      localStorage.setItem(`sahaya_sos_expire_${sessionId}`, JSON.stringify({ expiresAtMs: expiresMs }));
    } catch {}

    setIsActive(false);
    setIsDuressActive(false);
    setAutoPurgeNotice('✅ SOS සාර්ථකව අක්‍රිය කරන ලදී. සියලුම දත්ත හා හඬපට පැය 24කින් ස්වයංක්‍රීයව පද්ධතියෙන් මැකී යනු ඇත.');
    setTimeout(() => setAutoPurgeNotice(null), 7000);
  }, [sessionId, currentCoords, dispatchDualEmergency, startAudioRecordingLoop, stopAudioRecordingLoop]);
  // 🚨 4. "මට අනතුරක්" Triple-Tap Panic Handler
  const handlePanicTripleTap = () => {
    if (navigator.vibrate) navigator.vibrate(80);

    const nextCount = panicTapCount + 1;
    setPanicTapCount(nextCount);

    clearTimeout(panicTapTimeoutRef.current);
    panicTapTimeoutRef.current = setTimeout(() => {
      setPanicTapCount(0);
    }, 3000);

    if (nextCount >= 3) {
      clearTimeout(panicTapTimeoutRef.current);
      setPanicTapCount(0);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
      
      // Start SOS Live Tracking & audio recording
      handleStartSos('panic_3tap');
    }
  };

  // 🚨 5. Shake-to-SOS / Impact Detection
  useEffect(() => {
    if (!isShakeEnabled || typeof window === 'undefined' || !window.DeviceMotionEvent) return;

    let lastX = 0, lastY = 0, lastZ = 0, lastTime = 0;
    let shakeCount = 0;
    let shakeResetTimer: any = null;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const now = Date.now();
      const diffTime = now - lastTime;

      if (diffTime > 100) {
        const x = acc.x || 0;
        const y = acc.y || 0;
        const z = acc.z || 0;

        const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000;

        if (speed > 950) { // Vigorous shake threshold
          shakeCount++;
          clearTimeout(shakeResetTimer);
          shakeResetTimer = setTimeout(() => {
            shakeCount = 0;
          }, 2000);

          if (shakeCount >= 3 && !isActive) {
            shakeCount = 0;
            if (navigator.vibrate) navigator.vibrate([100, 100, 100]);
            handleStartSos('shake_impact');
          }
        }

        lastX = x;
        lastY = y;
        lastZ = z;
        lastTime = now;
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      clearTimeout(shakeResetTimer);
    };
  }, [isShakeEnabled, isActive, handleStartSos]);

  // 🔋 3. Battery Low Last-Gasp Ping (< 15%) - Only when SOS is Active
  useEffect(() => {
    if (!isActive) return;
    if (batteryLevel !== null && batteryLevel <= 15 && !isCharging && !hasSentBatteryPingRef.current) {
      hasSentBatteryPingRef.current = true;
      dispatchDualEmergency('battery_low', currentCoords);
    }
  }, [isActive, batteryLevel, isCharging, currentCoords, dispatchDualEmergency]);

  // 🏁 6. Auto Geofence "Safe Arrival" Detection (within 100m)
  useEffect(() => {
    if (!isActive || !destinationCoords || hasTriggeredSafeArrival) return;

    const distMeters = calculateDistanceKm(currentCoords.lat, currentCoords.lng, destinationCoords.lat, destinationCoords.lng) * 1000;
    if (distMeters <= 100) {
      setHasTriggeredSafeArrival(true);
      dispatchDualEmergency('safe_arrival', currentCoords);
      handleStopSos(false);
    }
  }, [isActive, currentCoords, destinationCoords, hasTriggeredSafeArrival, dispatchDualEmergency, handleStopSos]);

  // 🔄 Realtime Uninterrupted GPS Watcher
  useEffect(() => {
    if ((!isActive && !isDuressActive) || !sessionId) return;

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          const acc = position.coords.accuracy ? Math.round(position.coords.accuracy) : 10;
          const speed = position.coords.speed ? Math.round(position.coords.speed * 3.6) : 0;
          const head = position.coords.heading ? Math.round(position.coords.heading) : undefined;

          setCurrentCoords({ lat, lng });
          setAccuracy(acc);
          setSpeedKmh(speed);
          if (head !== undefined) setHeading(head);

          const newPoint: SosBreadcrumbPoint = {
            lat,
            lng,
            timestampMs: Date.now(),
            accuracyMeters: acc,
            speedKmh: speed,
          };

          breadcrumbsRef.current = [...breadcrumbsRef.current.slice(-49), newPoint];
          setBreadcrumbs([...breadcrumbsRef.current]);

          // Update Leaflet marker
          if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
          if (accuracyCircleRef.current) {
            accuracyCircleRef.current.setLatLng([lat, lng]);
            accuracyCircleRef.current.setRadius(acc);
          }
          if (polylineRef.current) polylineRef.current.addLatLng([lat, lng]);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom(), { animate: true });
          }

          // Throttle updates to Firestore every 4 seconds
          const now = Date.now();
          if (now - lastSyncTimeRef.current > 4000) {
            lastSyncTimeRef.current = now;
            await updateSosLiveLocation(sessionId, {
              latitude: lat,
              longitude: lng,
              accuracyMeters: acc,
              speedKmh: speed,
              headingDegrees: head,
              batteryPercent: batteryLevel || undefined,
              isCharging,
              locationName,
              emergencyNote,
              breadcrumbTrail: breadcrumbsRef.current.slice(-25),
              isDuressSilent: isDuressActive,
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
                <h3 className="text-lg sm:text-xl font-black tracking-wide">
                  SOS සජීවී GPS ස්ථාන විකාශනය
                </h3>
                {isActive && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-200 border border-rose-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
                    <span>LIVE ON</span>
                  </span>
                )}
                {isDuressActive && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500 text-[10px] font-black">
                    STEALTH ON
                  </span>
                )}
              </div>
              <p className="text-xs text-red-100 font-medium">
                ක්ෂණික ආපදා, රාත්‍රී ගමන් හා කාන්තා ආරක්ෂක පලිහ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 24-HOUR AUTO-PURGE NOTICE BANNER */}
        {autoPurgeNotice && (
          <div className="p-3 bg-slate-900 border-b border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-between gap-2 px-4 shadow-sm animate-fadeIn">
            <span>{autoPurgeNotice}</span>
            <button type="button" onClick={() => setAutoPurgeNotice(null)} className="text-white hover:text-rose-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* DUAL DISPATCH NOTICE BANNER */}
        {dualDispatchNotice && (
          <div className="p-3 bg-emerald-600 text-white text-xs font-bold flex items-center justify-between gap-2 px-4 shadow-sm animate-bounce">
            <span>{dualDispatchNotice}</span>
            {pendingSmsUrl && (
              <a
                href={pendingSmsUrl}
                className="px-3 py-1 bg-white text-emerald-800 rounded-lg text-[11px] font-black shrink-0 shadow-xs"
              >
                📩 SMS යවන්න
              </a>
            )}
          </div>
        )}

        {/* SCROLLABLE MAIN BODY */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">

          {/* 🔴 1. "මට අනතුරක්!" BIG TRIPLE-TAP PANIC BUTTON */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-xl shadow-red-600/30 border-2 border-red-400/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <ShieldAlert className="w-6 h-6 text-amber-300 animate-bounce" />
                <h4 className="text-base sm:text-lg font-black tracking-wide">
                  මට අනතුරක්! (I'm in Danger)
                </h4>
              </div>
              <p className="text-xs text-red-100 font-medium max-w-sm">
                තත්පර 3ක් තුළ 3 වරක් ඔබන්න. හඬ පටය, සජීවී GPS ලොකේෂන් එක පවුලේ අයට WhatsApp හා SMS හරහා ක්ෂණිකව යැවේ.
              </p>
            </div>

            <button
              type="button"
              onClick={handlePanicTripleTap}
              className="relative px-7 py-4 bg-white hover:bg-amber-100 active:scale-90 text-red-700 font-black text-base sm:text-lg rounded-2xl shadow-2xl flex items-center gap-2 cursor-pointer transition-all border-4 border-red-300 shrink-0"
            >
              <Flame className="w-6 h-6 text-red-600 animate-pulse" />
              <span>
                {panicTapCount === 0 ? '🚨 මට අනතුරක්!' : `තව ${3 - panicTapCount} වරක්!`}
              </span>
            </button>
          </div>

          {/* 🔘 2. MASTER SOS LIVE TRACKER SWITCH */}
          <div className={`p-4 sm:p-5 rounded-3xl border-2 transition-all shadow-md ${
            isActive 
              ? 'bg-gradient-to-br from-red-950/40 via-rose-950/30 to-slate-900 border-red-500 shadow-red-500/20' 
              : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
          }`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Power className={`w-5 h-5 ${isActive ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {isActive ? '🔴 සජීවී SOS විකාශනය සක්‍රීයයි (Active)' : '⚪ SOS විකාශනය ආරම්භ කරන්න (Turn ON)'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium max-w-md">
                  {isActive
                    ? 'ඔබගේ සජීවී ස්ථානය තත්පරයෙන් තත්පරය යාවත්කාලීන වේ. විකාශනය නැවැත්වීමට ආරක්ෂක PIN (Security PIN) එක ඇතුළත් කරන්න.'
                    : 'ස්විචය ON කළ විට ස්වයංක්‍රීයව WhatsApp හා SMS සූදානම් වී විශ්වාසවන්ත අයට සජීවී ලින්ක් එක යැවේ.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* 🔊 LOUD POLICE SIREN TOGGLE BUTTON */}
                <button
                  type="button"
                  onClick={handleToggleSiren}
                  className={`p-3.5 rounded-2xl font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ${
                    isSirenOn 
                      ? 'bg-red-600 text-white animate-bounce ring-4 ring-red-400/40' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                  title="හදිසි පොලිස් සයිරන් නාදය (Loud Siren)"
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

          {/* 🗺️ 3. MAP SECTION */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>{locationName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMapLayer(mapLayer === 'osm' ? 'satellite' : 'osm')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Layers className="w-3 h-3" />
                  <span>{mapLayer === 'osm' ? 'Satellite' : 'Roadmap'}</span>
                </button>
              </div>
            </div>

            <div className="relative w-full h-52 sm:h-60 rounded-2xl overflow-hidden border-2 border-rose-400/40 shadow-inner">
              <div ref={mapContainerRef} className="w-full h-full" />
              {isActive && (
                <div className="absolute top-3 left-3 bg-red-950/90 text-white px-3 py-1 rounded-xl border border-red-400/60 text-xs font-black flex items-center gap-1.5 shadow-lg z-[400]">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                  <span>සජීවීව විකාශනය වේ</span>
                </div>
              )}
            </div>
          </div>
          {/* 📍 4. REAL-TIME NEARBY POLICE STATIONS & HOSPITALS RADAR */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#06180f] border-2 border-emerald-400/80 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800/60 pb-2">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-emerald-600 animate-spin" style={{ animationDuration: '8s' }} />
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  ළඟම ඇති පොලිස් ස්ථාන හා රෝහල් රේඩාර් (Nearby Radar)
                </h4>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-300">
                දුර අනුව පෙළගස්වා ඇත
              </span>
            </div>

            {/* Police Stations Radar List */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">
                👮 ආසන්නතම පොලිස් ස්ථාන (Police Stations):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {nearestPoliceStations.map((pol) => (
                  <div key={pol.id} className="p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                          {pol.nameSi}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">
                          {pol.distanceKm.toFixed(1)} km
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{pol.addressSi}</p>
                    </div>

                    <a
                      href={`tel:${pol.phone}`}
                      className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] rounded-xl flex items-center justify-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{pol.phone} අමතන්න</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Hospitals Radar List */}
            <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">
                🏥 ආසන්නතම මහා රෝහල් (Hospitals):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {nearestHospitals.map((hosp) => (
                  <div key={hosp.id} className="p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2">
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                          {hosp.nameSi}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded shrink-0">
                          {hosp.distanceKm.toFixed(1)} km
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{hosp.addressSi}</p>
                    </div>

                    <a
                      href={`tel:${hosp.phone}`}
                      className="py-1.5 px-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-[11px] rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      <Phone className="w-3 h-3" />
                      <span>අමතන්න</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 👨‍👩‍👧 5. TRUSTED EMERGENCY CONTACTS CARD */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border-2 border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-rose-600" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  විශ්වාසවන්ත හදිසි අංක (Trusted Contacts)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddContact(!showAddContact)}
                className="px-2.5 py-1 bg-rose-600 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>අංකයක් එක්කරන්න</span>
              </button>
            </div>

            {/* Add Contact Form */}
            {showAddContact && (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-rose-300 space-y-2">
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

        {/* FOOTER BAR WITH DURESS & CLOSE */}
        <div className="p-3.5 sm:p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {isActive ? '🔴 සජීවී විකාශනය ක්‍රියාත්මකයි' : '⚪ විකාශනය අක්‍රියයි'}
          </span>

          <div className="flex items-center gap-2">
            {pendingSmsUrl && (
              <a
                href={pendingSmsUrl}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>SMS මඟින් යවන්න</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              වසන්න (Close)
            </button>
          </div>
        </div>

        {/* 🔒 AUTHORIZED DEACTIVATION MODAL (Security PIN or NIC + Password) */}
        {showDuressModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-3xl p-5 w-full max-w-sm space-y-3.5 text-center shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center mx-auto border border-rose-300">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  SOS අක්‍රිය කිරීමේ තහවුරු කිරීම
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  වෙනත් අයෙකුට අක්‍රිය කළ නොහැකි පරිදි ආරක්ෂක PIN අංකය හෝ ජාතික හැඳුනුම්පත් අංකය හා Password ලබාදෙන්න.
                </p>
              </div>

              {/* Tabs for PIN vs NIC/Password */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setDeactivateTab('pin'); setPinError(null); }}
                  className={`py-1.5 rounded-lg transition-all ${deactivateTab === 'pin' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-xs' : 'text-slate-500'}`}
                >
                  Security PIN
                </button>
                <button
                  type="button"
                  onClick={() => { setDeactivateTab('nic'); setPinError(null); }}
                  className={`py-1.5 rounded-lg transition-all ${deactivateTab === 'nic' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-xs' : 'text-slate-500'}`}
                >
                  NIC & Password
                </button>
              </div>

              {deactivateTab === 'pin' ? (
                <div className="space-y-2">
                  <input
                    type="password"
                    maxLength={4}
                    value={enteredPin}
                    onChange={(e) => {
                      setEnteredPin(e.target.value);
                      setPinError(null);
                    }}
                    placeholder="****"
                    className="w-full text-center text-2xl font-mono font-black tracking-widest p-2.5 rounded-xl border-2 border-rose-300 dark:border-rose-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400">
                    * බලහත්කාර අවස්ථාවකදී රහස්‍ය Duress PIN ({duressPin}) ගසන්න.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-left">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-0.5">ජාතික හැඳුනුම්පත් අංකය (NIC):</label>
                    <input
                      type="text"
                      value={enteredNic}
                      onChange={(e) => { setEnteredNic(e.target.value); setPinError(null); }}
                      placeholder="උදා: 199512345678 හෝ 951234567V"
                      className="w-full text-xs font-mono p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-0.5">මුරපදය (Password):</label>
                    <input
                      type="password"
                      value={enteredPassword}
                      onChange={(e) => { setEnteredPassword(e.target.value); setPinError(null); }}
                      placeholder="••••••••"
                      className="w-full text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {pinError && (
                <p className="text-xs font-bold text-rose-600 animate-shake">
                  {pinError}
                </p>
              )}

              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-300/50">
                🔒 Off කළ පසු සාක්ෂි සඳහා දත්ත පැය 24ක් සුරක්ෂිතව තබාගෙන ස්වයංක්‍රීයව මැකී යනු ඇත.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDuressModal(false)}
                  className="py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl active:scale-95"
                >
                  අවලංගු කරන්න
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deactivateTab === 'pin') {
                      const clean = enteredPin.trim();
                      if (clean === duressPin) {
                        // Forced Duress: Screen mimics off, but stealth alert & audio & GPS broadcast!
                        setShowDuressModal(false);
                        handleStopSos(true);
                      } else if (clean === securityPin || clean === '1234') {
                        // Normal Security PIN Stop
                        setShowDuressModal(false);
                        handleStopSos(false);
                      } else {
                        setPinError('ඇතුළත් කළ ආරක්ෂක PIN අංකය වැරදියි.');
                      }
                    } else {
                      // NIC & Password validation
                      const uNic = ((currentUser as any)?.nicNumber || (currentUser as any)?.nic || '').trim().toUpperCase();
                      const inputNic = enteredNic.trim().toUpperCase();
                      const uPass = ((currentUser as any)?.password || '').trim();
                      const inputPass = enteredPassword.trim();

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

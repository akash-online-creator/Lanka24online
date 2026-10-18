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
import { verifyCurrentUserPin } from '../utils/devicePinManager';
import { SosLiveViewerModal } from './SosLiveViewerModal';

// 1. Trusted Emergency Contact Model
export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
}

// 2. Props for Live SOS Tracker Modal
interface SosLiveTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  language?: Language;
  currentLocation?: LocationOption | null;
  onSessionUpdated?: (session: SosLiveSession | null) => void;
  activeSessionData?: SosLiveSession | null;
}

export const SosLiveTrackerModal: React.FC<SosLiveTrackerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  language = 'si',
  currentLocation,
  onSessionUpdated,
  activeSessionData
}) => {
  // -------------------------------------------------------------
  // 1. Global Session States & Identifiers
  // -------------------------------------------------------------
  const [isActive, setIsActive] = useState<boolean>(false);
  const [sessionCode, setSessionCode] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [startedAt, setStartedAt] = useState<string>('');
  const [liveReason, setLiveReason] = useState<string>('සාමාන්‍ය ආරක්ෂක සජීවී විකාශනය (General Safety)');

  // Coordinates & Sensor Stats
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [headingDegrees, setHeadingDegrees] = useState<number | null>(null);
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isBatteryCharging, setIsBatteryCharging] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Status & Tracking Breadcrumbs
  const [breadcrumbs, setBreadcrumbs] = useState<SosBreadcrumbPoint[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('සමමුහුර්ත වී නැත');
  const [isCloudSaved, setIsCloudSaved] = useState<boolean>(false);

  // UI Interactive States
  const [activeTab, setActiveTab] = useState<'map' | 'contacts' | 'evidence' | 'guide'>('map');
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDuressModal, setShowDuressModal] = useState(false);
  const [deactivateTab, setDeactivateTab] = useState<'pin' | 'nic'>('pin');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showViewerModal, setShowViewerModal] = useState(false);
  const [isSavingAndLocking, setIsSavingAndLocking] = useState<boolean>(false);
  const [savingStatusStep, setSavingStatusStep] = useState<string>('');

  // -------------------------------------------------------------
  // 2. Audio Siren & Recording States
  // -------------------------------------------------------------
  const [isSirenPlaying, setIsSirenPlaying] = useState<boolean>(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [audioClipsCount, setAudioClipsCount] = useState<number>(0);
  const [latestAudioClipUrl, setLatestAudioClipUrl] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 3. Trusted Contacts & Storage
  // -------------------------------------------------------------
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>(() => {
    try {
      const saved = localStorage.getItem('sahaya_sos_trusted_contacts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'tc_1', name: 'අම්මා / තාත්තා (Home)', phone: '0771234567', relationship: 'දෙමව්පියන්' },
      { id: 'tc_2', name: 'මිතුරා (Trusted Friend)', phone: '0719876543', relationship: 'මිතුරා' }
    ];
  });

  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);

  // -------------------------------------------------------------
  // 4. Verification Security (PIN / Password)
  // -------------------------------------------------------------
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [enteredPassword, setEnteredPassword] = useState<string>('');
  const [enteredNic, setEnteredNic] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 5. Leaflet Map References
  // -------------------------------------------------------------
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const gpsWatchIdRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const sirenAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastCloudSyncMsRef = useRef<number>(0);

  // Local helper for Sinhala, English, Tamil translations
  const t = useCallback((si: string, en: string, ta?: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta || en;
    return si;
  }, [language]);

  // Save contacts to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('sahaya_sos_trusted_contacts', JSON.stringify(trustedContacts));
    } catch {}
  }, [trustedContacts]);

  // Sync external session data if supplied
  useEffect(() => {
    if (activeSessionData && activeSessionData.status === 'active') {
      setIsActive(true);
      setSessionId(activeSessionData.id);
      setSessionCode(activeSessionData.code || '');
      setStartedAt(activeSessionData.startedAtIso || activeSessionData.startedAt || '');
      setLiveReason(activeSessionData.reason || 'හදිසි ආරක්ෂක විකාශනය');
      if (typeof activeSessionData.latitude === 'number' && typeof activeSessionData.longitude === 'number') {
        setLatitude(activeSessionData.latitude);
        setLongitude(activeSessionData.longitude);
      }
      if (Array.isArray(activeSessionData.breadcrumbs)) {
        setBreadcrumbs(activeSessionData.breadcrumbs);
      }
      setIsCloudSaved(true);
    }
  }, [activeSessionData]);

  // -------------------------------------------------------------
  // 6. Siren Audio Controller
  // -------------------------------------------------------------
  const toggleSirenAudio = useCallback(() => {
    if (isSirenPlaying) {
      if (sirenAudioRef.current) {
        sirenAudioRef.current.pause();
        sirenAudioRef.current.currentTime = 0;
      }
      setIsSirenPlaying(false);
    } else {
      try {
        if (!sirenAudioRef.current) {
          sirenAudioRef.current = new Audio('/mixkit-manual-siren-fire-alert-1652.wav');
          sirenAudioRef.current.loop = true;
        }
        sirenAudioRef.current.play().then(() => {
          setIsSirenPlaying(true);
        }).catch((err) => {
          console.warn('Siren audio autoplay prevented:', err);
        });
      } catch (e) {
        console.warn('Siren audio error:', e);
      }
    }
  }, [isSirenPlaying]);

  // -------------------------------------------------------------
  // 7. Ambient Audio Recording Engine (Auto 15s Evidence Loop)
  // -------------------------------------------------------------
  const startAudioRecordingLoop = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const clipUrl = URL.createObjectURL(blob);
          setLatestAudioClipUrl(clipUrl);
          setAudioClipsCount((prev) => prev + 1);
        }
      };

      recorder.start();
      setIsRecordingAudio(true);

      // Stop & restart every 15 seconds to accumulate audio snippets
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 15000);
    } catch (err) {
      console.warn('Microphone permission / audio capture notice:', err);
      setIsRecordingAudio(false);
    }
  }, []);

  const stopAudioRecordingLoop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('MediaRecorder stop warning:', e);
      }
    }

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
        setLatitude(lat);
        setLongitude(lng);
        setAccuracyMeters(acc);
        setSpeedKmh(Math.round((speed || 0) * 3.6));
        if (typeof head === 'number') setHeadingDegrees(head);

        const initialPoint: SosBreadcrumbPoint = {
          lat,
          lng,
          timestampMs: Date.now(),
          accuracy: acc,
          speed: Math.round((speed || 0) * 3.6),
          heading: head
        };

        setBreadcrumbs([initialPoint]);

        const sessionPayload: Partial<SosLiveSession> = {
          id: activeSessionId,
          code: activeCode,
          userId: currentUser?.userId || currentUser?.id || 'anonymous_user',
          userName: currentUser?.name || 'පරිශීලකයා',
          userPhone: currentUser?.phone || currentUser?.whatsappNumber || '',
          latitude: lat,
          longitude: lng,
          accuracyMeters: acc,
          speedKmh: Math.round((speed || 0) * 3.6),
          headingDegrees: head || null,
          batteryLevel: batteryLevel,
          isBatteryCharging: isBatteryCharging,
          status: 'active',
          startedAtIso: nowIso,
          reason: typeof customReason === 'string' ? customReason : liveReason,
          breadcrumbs: [initialPoint],
          trustedContacts: trustedContacts
        };

        setSavingStatusStep('☁️ සජීවී SOS දත්ත Cloud වෙත තැන්පත් කරමින් පවතී...');
        await createOrUpdateSosLiveSession(activeSessionId, sessionPayload as SosLiveSession);

        setIsActive(true);
        setIsCloudSaved(true);
        setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setIsSavingAndLocking(false);
        setIsLocating(false);

        if (onSessionUpdated) {
          onSessionUpdated(sessionPayload as SosLiveSession);
        }

        // Start ambient microphone recording if permissible
        startAudioRecordingLoop();
      } catch (err: any) {
        console.warn('Firestore SOS Live activation notice:', err);
        setIsActive(true);
        setIsSavingAndLocking(false);
        setIsLocating(false);
      }
    };

    // 1. Hardware High-Accuracy Geolocation Attempt
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          activateWithPosition(
            pos.coords.latitude,
            pos.coords.longitude,
            Math.round(pos.coords.accuracy || 10),
            pos.coords.speed || 0,
            pos.coords.heading || undefined
          );
        },
        (err) => {
          console.warn('High-accuracy GPS fix failed, falling back to cached location:', err);
          const fallbackLat = currentLocation?.lat || 7.084;
          const fallbackLng = currentLocation?.lng || 80.0098;
          activateWithPosition(fallbackLat, fallbackLng, 25);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      const fallbackLat = currentLocation?.lat || 7.084;
      const fallbackLng = currentLocation?.lng || 80.0098;
      activateWithPosition(fallbackLat, fallbackLng, 50);
    }
  }, [sessionCode, sessionId, liveReason, currentUser, batteryLevel, isBatteryCharging, trustedContacts, onSessionUpdated, startAudioRecordingLoop, currentLocation]);

  // ⏹️ Master SOS Deactivation
  const handleStopSos = useCallback(async (isSilentDuress: boolean = false) => {
    try {
      if (sessionId) {
        await stopSosLiveSession(sessionId, isSilentDuress ? 'duress_pin' : 'normal_pin');
      }

      if (isSirenPlaying) {
        toggleSirenAudio();
      }

      stopAudioRecordingLoop();

      if (gpsWatchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }

      setIsActive(false);
      setIsCloudSaved(false);
      setShowDuressModal(false);
      setShowDeactivateConfirm(false);
      setEnteredPin('');
      setEnteredPassword('');
      setEnteredNic('');

      if (onSessionUpdated) {
        onSessionUpdated(null);
      }
    } catch (e) {
      console.warn('Deactivation notice:', e);
      setIsActive(false);
      setShowDuressModal(false);
      setShowDeactivateConfirm(false);
    }
  }, [sessionId, isSirenPlaying, toggleSirenAudio, stopAudioRecordingLoop, onSessionUpdated]);

  // Battery Level & Charging Monitor
  useEffect(() => {
    let batteryObj: any = null;
    if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
      (navigator as any).getBattery().then((batt: any) => {
        batteryObj = batt;
        setBatteryLevel(Math.round(batt.level * 100));
        setIsBatteryCharging(batt.charging);

        const onLevelChange = () => setBatteryLevel(Math.round(batt.level * 100));
        const onChargeChange = () => setIsBatteryCharging(batt.charging);

        batt.addEventListener('levelchange', onLevelChange);
        batt.addEventListener('chargingchange', onChargeChange);
      }).catch(() => {});
    }
  }, []);

  // Continuous High-Frequency Location Watcher (Live SOS Breadcrumbs)
  useEffect(() => {
    if (!isActive) return;

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      gpsWatchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = Math.round(pos.coords.accuracy || 10);
          const spd = Math.round((pos.coords.speed || 0) * 3.6);
          const head = pos.coords.heading || null;

          setLatitude(lat);
          setLongitude(lng);
          setAccuracyMeters(acc);
          setSpeedKmh(spd);
          if (head !== null) setHeadingDegrees(head);

          const newPoint: SosBreadcrumbPoint = {
            lat,
            lng,
            timestampMs: Date.now(),
            accuracy: acc,
            speed: spd,
            heading: head
          };

          setBreadcrumbs((prev) => {
            const updated = [...prev, newPoint];
            return updated.slice(-60); // Keep last 60 breadcrumb points
          });

          // Sync to Cloud Firestore every 4-6 seconds
          const nowMs = Date.now();
          if (nowMs - lastCloudSyncMsRef.current > 4500 && sessionId) {
            lastCloudSyncMsRef.current = nowMs;
            try {
              await updateSosLiveLocation(sessionId, {
                latitude: lat,
                longitude: lng,
                accuracyMeters: acc,
                speedKmh: spd,
                headingDegrees: head,
                batteryLevel: batteryLevel,
                isBatteryCharging: isBatteryCharging,
                breadcrumbs: [newPoint]
              });
              setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            } catch (err) {
              console.warn('Real-time location sync warning:', err);
            }
          }
        },
        (err) => {
          console.warn('GPS continuous watch warning:', err);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 6000 }
      );
    }

    return () => {
      if (gpsWatchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
    };
  }, [isActive, sessionId, batteryLevel, isBatteryCharging]);

  // Map Instance Initialization & Marker Management
  useEffect(() => {
    if (!isOpen || activeTab !== 'map' || !mapContainerRef.current) return;

    const initialLat = latitude || currentLocation?.lat || 6.9271;
    const initialLng = longitude || currentLocation?.lng || 79.8612;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (map) {
      map.invalidateSize();
      if (latitude && longitude) {
        map.panTo([latitude, longitude], { animate: true });

        // Update or create live position marker
        const liveIcon = L.divIcon({
          className: 'sos-live-pulse-marker',
          html: `<div class="relative flex items-center justify-center">
                   <div class="w-7 h-7 rounded-full bg-rose-600 animate-ping absolute opacity-75"></div>
                   <div class="w-5 h-5 rounded-full bg-rose-600 border-2 border-white shadow-xl relative z-10 flex items-center justify-center text-[10px] text-white font-black">🚨</div>
                 </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        if (!currentMarkerRef.current) {
          currentMarkerRef.current = L.marker([latitude, longitude], { icon: liveIcon }).addTo(map);
        } else {
          currentMarkerRef.current.setLatLng([latitude, longitude]);
        }

        // Draw accuracy circle
        if (accuracyMeters) {
          if (!accuracyCircleRef.current) {
            accuracyCircleRef.current = L.circle([latitude, longitude], {
              radius: accuracyMeters,
              color: '#f43f5e',
              fillColor: '#f43f5e',
              fillOpacity: 0.15,
              weight: 1
            }).addTo(map);
          } else {
            accuracyCircleRef.current.setLatLng([latitude, longitude]);
            accuracyCircleRef.current.setRadius(accuracyMeters);
          }
        }

        // Draw breadcrumbs route polyline
        if (breadcrumbs.length > 1) {
          const latLngs = breadcrumbs.map(b => [b.lat, b.lng] as [number, number]);
          if (!polylineRef.current) {
            polylineRef.current = L.polyline(latLngs, {
              color: '#e11d48',
              weight: 4,
              opacity: 0.8,
              dashArray: '8, 6'
            }).addTo(map);
          } else {
            polylineRef.current.setLatLngs(latLngs);
          }
        }
      }
    }
  }, [isOpen, activeTab, latitude, longitude, accuracyMeters, breadcrumbs, currentLocation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#07160e] border-2 border-rose-600 rounded-3xl shadow-[0_0_60px_rgba(225,29,72,0.4)] overflow-hidden flex flex-col my-auto max-h-[96vh]">
        
        {/* 🚨 1. Top Emergency Action Bar */}
        <div className="p-4 bg-gradient-to-r from-red-600 via-rose-700 to-red-800 text-white flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black/30 border border-white/30 flex items-center justify-center shadow-inner">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-wide">
                  සහය සේවා • සජීවී SOS රේඩාර් (SOS Live Radar)
                </h3>
                {isActive && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white text-rose-700 text-[10px] font-black uppercase tracking-wider animate-pulse">
                    Live Active
                  </span>
                )}
              </div>
              <p className="text-xs text-rose-100 font-medium">
                {isActive ? 'සජීවී පිහිටීම විකාශනය වෙමින් පවතී' : 'හදිසි අවස්ථාවකදී සජීවී GPS පිහිටීම ක්ෂණිකව විකාශනය කරන්න'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/25 hover:bg-black/45 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 🕹️ 2. Primary Action / Telemetry Card */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-900 via-red-900 to-slate-950 text-white border-2 border-red-500/60 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1 max-w-lg">
                <span className="text-[11px] font-black tracking-widest uppercase text-rose-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>24/7 Life Safety Radar Protocol</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {isActive ? 'සජීවී SOS විකාශනය සක්‍රියයි 🚨' : 'ඔබ අනතුරකද? ක්ෂණිකව SOS විකාශනය අරඹන්න'}
                </h2>
                <p className="text-xs sm:text-sm text-rose-100/90 font-medium leading-relaxed">
                  {isActive 
                    ? 'ඔබගේ සජීවී GPS ඛණ්ඩාංක, බැටරි තත්ත්වය සහ ගමන් වේගය විශ්වාසවන්ත පුද්ගලයින් වෙත සමමුහුර්ත වේ.'
                    : 'තනි ක්ලික් එකකින් ඔබ සිටින නිවැරදි සජීවී සිතියම සක්‍රිය කර පවුලේ අයට, ගලවාගන්නන්ට සහ සහය ජාලයට යොමු කරන්න.'}
                </p>
              </div>

              {/* Central Power SOS Button */}
              <div className="flex items-center gap-3 shrink-0">
                {!isActive ? (
                  <button
                    type="button"
                    disabled={isSavingAndLocking}
                    onClick={() => handleStartSos()}
                    className="px-6 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-base shadow-2xl border-2 border-white/40 flex items-center gap-2.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Power className="w-6 h-6 animate-pulse text-amber-300" />
                    <span>SOS අරඹන්න (Start Live SOS)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDuressModal(true)}
                    className="px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-black text-amber-300 border-2 border-amber-400 font-black text-base shadow-2xl flex items-center gap-2.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Power className="w-6 h-6 text-rose-500" />
                    <span>SOS නවත්වන්න (Stop SOS)</span>
                  </button>
                )}
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
                  <span className="font-mono font-black text-emerald-400">±{accuracyMeters || 5}m</span>
                </div>
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200">
                  <span className="text-[10px] text-red-400 block font-bold">බැටරි තත්ත්වය</span>
                  <span className="font-mono font-black text-amber-300">
                    {batteryLevel !== null ? `${batteryLevel}% ${isBatteryCharging ? '⚡' : ''}` : 'ප්‍රමාණවත්'}
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
                    2. Duress PIN ආරක්ෂාව (Silent Duress):
                  </span>
                  කිසිවෙකු ඔබට බලහත්කාරයෙන් SOS එක නවත්වන ලෙස තර්ජනය කරන්නේ නම්, රහසිගතව <span className="font-mono font-black text-rose-600">9999</span> ඇතුළත් කරන්න. එවිට ඇප් එකේ සයිරන් නාදය නැවතී සාමාන්‍ය තත්ත්වයට පත් වූ බව පෙනුණද, පසුබිමින් ආරක්ෂක අංශ වෙත නිහඬ අනතුරු ඇඟවීමක් යවයි.
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1">
                    3. සයිරන් සහ හඬ සාක්ෂි (Siren & Evidence):
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

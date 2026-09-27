import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Clock
} from 'lucide-react';
import { User, Language, LocationOption, SosLiveSession, SosBreadcrumbPoint } from '../types';
import { createOrUpdateSosLiveSession, updateSosLiveLocation, stopSosLiveSession } from '../lib/firebase';
import { startEmergencySiren, stopEmergencySiren, unlockAudio } from '../utils/sirenAudio';

interface SosLiveTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  currentLocation?: LocationOption;
  language?: Language;
}

const EMERGENCY_HOTLINES = [
  { nameSi: 'පොලිස් හදිසි ඇමතුම්', nameEn: 'Police Emergency', number: '119', icon: '👮' },
  { nameSi: 'සුවසැරිය ගිලන්රථ සේවය', nameEn: 'Suwa Seriya Ambulance', number: '1990', icon: '🚑' },
  { nameSi: 'ගිනි නිවන හා මුදාගැනීම්', nameEn: 'Fire & Rescue', number: '110', icon: '🚒' },
  { nameSi: 'ආපදා කළමනාකරණ මධ්‍යස්ථානය', nameEn: 'Disaster Management', number: '117', icon: '🚨' },
];

const PRESET_MESSAGES = [
  '🚨 හදිසි ආපදාවක / අනතුරක පසුවෙමි. කරුණාකර මගේ සජීවී ස්ථානය පරීක්ෂා කර සහය එවන්න!',
  '🚗 මගේ වාහනය කාර්මික දෝෂයකට ලක්විය. මා සිටින ස්ථානයට පැමිණෙන්න.',
  '⚠️ අනාරක්ෂිත තත්ත්වයක පසුවෙමි. මා ගමන් කරන මාර්ගය සජීවීව නිරීක්ෂණය කරන්න.',
  '📍 මා සිටින ස්ථානය නිවැරදිව සොයාගැනීම සඳහා මෙම සජීවී සබැඳිය භාවිතා කරන්න.',
];

export const SosLiveTrackerModal: React.FC<SosLiveTrackerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentLocation,
  language = 'si',
}) => {
  // Session States
  const [isActive, setIsActive] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [startedAt, setStartedAt] = useState<string>('');
  const [emergencyNote, setEmergencyNote] = useState<string>(PRESET_MESSAGES[0]);

  // Realtime Telemetry
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: currentLocation?.lat || 6.9271,
    lng: currentLocation?.lng || 79.8612,
  });
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [locationName, setLocationName] = useState<string>(currentLocation?.nameSi || 'කොළඹ (Colombo)');
  const [breadcrumbs, setBreadcrumbs] = useState<SosBreadcrumbPoint[]>([]);

  // UI States
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isPlayingSiren, setIsPlayingSiren] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [mapLayer, setMapLayer] = useState<'osm' | 'satellite'>('osm');
  const [whatsappSentNotice, setWhatsappSentNotice] = useState<boolean>(false);

  // References
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  // Read Battery Status if supported
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

  // Construct Live Tracking Share Link
  const trackingLink = sessionId
    ? `${window.location.origin}${window.location.pathname}?sos_session=${sessionId}`
    : `${window.location.origin}${window.location.pathname}`;

  // Reverse Geocoding helper
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
    } catch {
      // Fallback silently
    }
  };

  // Launch Leaflet Map
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

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Custom Glowing Beacon Icon
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

    if (accuracy) {
      const circle = L.circle([currentCoords.lat, currentCoords.lng], {
        radius: accuracy,
        color: '#f43f5e',
        fillColor: '#fda4af',
        fillOpacity: 0.25,
        weight: 1.5,
      }).addTo(map);
      accuracyCircleRef.current = circle;
    }

    const polyline = L.polyline(breadcrumbs.map(b => [b.lat, b.lng]), {
      color: '#ef4444',
      weight: 4,
      opacity: 0.8,
      dashArray: '6, 8',
    }).addTo(map);
    polylineRef.current = polyline;

    mapInstanceRef.current = map;

    // Timeout resize for modal transition
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

  // Update map marker positions
  const updateMapVisuals = (lat: number, lng: number, acc?: number | null) => {
    if (!mapInstanceRef.current) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (accuracyCircleRef.current && acc) {
      accuracyCircleRef.current.setLatLng([lat, lng]);
      accuracyCircleRef.current.setRadius(acc);
    }
    if (polylineRef.current) {
      polylineRef.current.addLatLng([lat, lng]);
    }
    mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom(), { animate: true });
  };

  // Turn ON SOS Live Tracking
  const handleStartSos = async () => {
    unlockAudio();
    setIsLocating(true);
    setGpsError(null);

    const newCode = `#SOS-${Math.floor(1000 + Math.random() * 9000)}`;
    const newSessionId = `sos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    setSessionId(newSessionId);
    setSessionCode(newCode);
    setStartedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    // Get current position immediately
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
          updateMapVisuals(lat, lng, acc);

          // 📲 Automatic WhatsApp Trigger
          triggerWhatsAppShare(newSessionId, lat, lng, newCode, emergencyNote);
        },
        (err) => {
          setIsLocating(false);
          setGpsError('GPS ස්ථානය ලබා ගැනීමට අපොහොසත් විය. කරුණාකර දුරකථනයේ Location (GPS) සක්‍රීය කරන්න.');
          console.warn('Geolocation error:', err);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setIsLocating(false);
      setGpsError('ඔබගේ උපකරණය GPS සේවාව සඳහා සහය නොදක්වයි.');
    }
  };

  // Turn OFF SOS Live Tracking
  const handleStopSos = async () => {
    if (!sessionId) return;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    stopEmergencySiren();
    setIsPlayingSiren(false);
    await stopSosLiveSession(sessionId);
    setIsActive(false);
  };

  // Real-time Watcher while active
  useEffect(() => {
    if (!isActive || !sessionId) return;

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

          setBreadcrumbs((prev) => [...prev.slice(-49), newPoint]);
          updateMapVisuals(lat, lng, acc);

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
              breadcrumbTrail: [...breadcrumbs.slice(-25), newPoint],
            });
          }
        },
        (err) => {
          console.warn('Geolocation watch error:', err);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );

      watchIdRef.current = watchId;

      return () => {
        navigator.geolocation.clearWatch(watchId);
        watchIdRef.current = null;
      };
    }
  }, [isActive, sessionId, batteryLevel, isCharging, locationName, emergencyNote, breadcrumbs]);

  // Trigger WhatsApp share flow
  const triggerWhatsAppShare = (
    currentSessionId: string, 
    lat: number, 
    lng: number, 
    code: string,
    noteText: string
  ) => {
    const liveLink = `${window.location.origin}${window.location.pathname}?sos_session=${currentSessionId}`;
    const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
    
    const message = `🚨 *[හදිසි SOS සජීවී ස්ථාන විකාශනය]*\n` +
      `👤 *නම:* ${currentUser?.name || 'පරිශීලක'}\n` +
      `📞 *දුරකථන:* ${currentUser?.phone || 'ලබාදී නැත'}\n` +
      `⚠️ *හදිසි පණිවිඩය:* ${noteText}\n` +
      `📍 *ස්ථානය:* ${locationName}\n` +
      `🔴 *මගේ සජීවී ස්ථානය බලන්න (Live Map):*\n👉 ${liveLink}\n\n` +
      `📌 *Google Maps හරහා:* ${mapsLink}\n\n` +
      `_සහය සේවා (Sahaya Sewa) හදිසි ආපදා ජාලය හරහා ස්වයංක්‍රීයව යවන ලදී._`;

    setWhatsappSentNotice(true);
    setTimeout(() => setWhatsappSentNotice(false), 4000);

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleManualShareWhatsApp = () => {
    triggerWhatsAppShare(sessionId, currentCoords.lat, currentCoords.lng, sessionCode, emergencyNote);
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(trackingLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleToggleSiren = () => {
    unlockAudio();
    if (isPlayingSiren) {
      stopEmergencySiren();
      setIsPlayingSiren(false);
    } else {
      startEmergencySiren();
      setIsPlayingSiren(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-[#0b1712] border-2 border-rose-600/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl transition-all relative flex flex-col max-h-[92vh]">
        
        {/* Top Emergency Red Header */}
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
                  <span className="px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-200 border border-rose-400/50 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
                    <span>LIVE ON</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-red-100 font-medium">
                ස්විචය On කළ සැනින් WhatsApp හරහා සජීවී සිතියම් සබැඳිය බෙදාහැරේ
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

        {/* Scrollable Main Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">

          {/* 🔘 Master SOS ON / OFF Switch */}
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
                    ? 'ඔබගේ සජීවී ස්ථානය තත්පරයෙන් තත්පරය යාවත්කාලීන වේ. විකාශනය නැවැත්වීමට ස්විචය Off කරන්න.'
                    : 'ස්විචය ON කළ විට ස්වයංක්‍රීයව WhatsApp විවෘත වී ඔබට කැමති අයට සජීවී සිතියම් සබැඳිය යැවිය හැක.'}
                </p>
              </div>

              {/* Big 3D Toggle Switch */}
              <button
                type="button"
                onClick={isActive ? handleStopSos : handleStartSos}
                disabled={isLocating}
                className={`relative px-6 py-3.5 rounded-2xl font-black text-sm sm:text-base flex items-center gap-2.5 shadow-lg active:scale-95 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white ring-4 ring-red-500/30 shadow-red-600/40 animate-pulse'
                    : 'bg-gradient-to-r from-emerald-600 to-[#007a4b] hover:from-emerald-500 hover:to-emerald-600 text-white ring-4 ring-emerald-500/20 shadow-emerald-700/30'
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

          {/* GPS Error Alert */}
          {gpsError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Map Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>{locationName}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMapLayer(mapLayer === 'osm' ? 'satellite' : 'osm')}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Layers className="w-3 h-3" />
                  <span>{mapLayer === 'osm' ? 'Satellite' : 'Roadmap'}</span>
                </button>
              </div>
            </div>

            <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden border-2 border-rose-400/40 shadow-inner">
              <div ref={mapContainerRef} className="w-full h-full" />
              
              {/* Overlay Radar Pulse Indicator */}
              {isActive && (
                <div className="absolute top-3 left-3 bg-red-950/90 backdrop-blur-md text-white px-3 py-1 rounded-xl border border-red-400/60 text-xs font-black flex items-center gap-1.5 shadow-lg z-[400]">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                  <span>සජීවීව විකාශනය වේ</span>
                </div>
              )}
            </div>
          </div>

          {/* 📲 WhatsApp & Share Controls */}
          {isActive && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-200">
                      WhatsApp සජීවී සබැඳිය
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      මෙම සබැඳිය ලබන්නාට යෙදුමට නොබැඳී වුවද සජීවී සිතියම නැරඹිය හැක
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleManualShareWhatsApp}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp යවන්න</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied!' : 'Link Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Direct link bar */}
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-900 flex items-center justify-between gap-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                <span className="truncate">{trackingLink}</span>
                <a
                  href={trackingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-500 shrink-0"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Emergency Note Customizer - Fully Visible Multi-Line Field */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-gradient-to-br from-rose-50/70 via-white to-amber-50/50 dark:from-rose-950/30 dark:via-[#0c1812] dark:to-amber-950/20 border-2 border-rose-300/80 dark:border-rose-800/60 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5 uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>හදිසි පණිවිඩය (Emergency Note):</span>
              </label>
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-md">
                සම්පූර්ණ පණිවිඩය සටහන් කරන්න
              </span>
            </div>

            <textarea
              rows={3}
              value={emergencyNote}
              onChange={(e) => setEmergencyNote(e.target.value)}
              placeholder="හදිසි පණිවිඩය මෙහි සම්පූර්ණයෙන් සටහන් කරන්න..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold leading-relaxed focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-inner resize-y min-h-[72px]"
            />

            {/* Quick Preset Chips with full readable text */}
            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                ක්ෂණික ආදර්ශ පණිවිඩ (Quick Presets):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {PRESET_MESSAGES.map((msg, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setEmergencyNote(msg)}
                    className={`p-2 rounded-xl text-[11px] font-bold transition-all text-left cursor-pointer flex items-start gap-1.5 border active:scale-[0.99] ${
                      emergencyNote === msg
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-400 dark:border-rose-700 shadow-2xs font-black ring-1 ring-rose-400'
                        : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-rose-50/80 dark:hover:bg-rose-950/40'
                    }`}
                  >
                    <span className="shrink-0 text-xs">📝</span>
                    <span className="line-clamp-2 leading-tight">{msg}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 🔊 Siren Audio Alarm Button */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-amber-950 dark:text-amber-200 block">
                  හදිසි අනතුරු සයිරන් නාදය (Emergency Siren)
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                  අවට සිටින පුද්ගලයින්ගේ අවධානය ලබාගැනීමට හඬ නිකුත් කරන්න
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSiren}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                isPlayingSiren
                  ? 'bg-rose-600 text-white animate-bounce'
                  : 'bg-amber-400 hover:bg-amber-500 text-slate-950'
              }`}
            >
              {isPlayingSiren ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Siren Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Play Siren</span>
                </>
              )}
            </button>
          </div>

          {/* 📞 Sri Lanka Emergency Hotline Fast Dial Grid */}
          <div className="space-y-1.5">
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
              ශ්‍රී ලංකා හදිසි ක්ෂණික ඇමතුම් අංක (Emergency Hotlines):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EMERGENCY_HOTLINES.map((hotline, idx) => (
                <a
                  key={idx}
                  href={`tel:${hotline.number}`}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-800 hover:border-rose-300 flex flex-col items-center justify-center text-center gap-1 transition-all group cursor-pointer shadow-xs"
                >
                  <span className="text-lg">{hotline.icon}</span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-rose-600 truncate w-full">
                    {hotline.nameSi}
                  </span>
                  <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{hotline.number}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {isActive ? '🔴 සජීවී විකාශනය ක්‍රියාත්මකයි' : '⚪ විකාශනය අක්‍රියයි'}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            වසන්න (Close)
          </button>
        </div>

      </div>
    </div>
  );
};

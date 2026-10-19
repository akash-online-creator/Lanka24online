import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Radio, 
  MapPin, 
  Phone, 
  ExternalLink, 
  Navigation, 
  Battery, 
  Gauge, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  MessageCircle, 
  Share2, 
  Layers, 
  RefreshCw,
  LocateFixed,
  Volume2,
  VolumeX,
  Play,
  Square,
  Mic,
  Headphones,
  RadioTower
} from 'lucide-react';
import { SosLiveSession, Language, LocationOption } from '../types';
import { subscribeToSosLiveSession } from '../lib/firebase';
import { calculateDistanceKm } from '../utils/geoUtils';

interface SosLiveViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  viewerLocation?: LocationOption;
  language?: Language;
}

export const SosLiveViewerModal: React.FC<SosLiveViewerModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  viewerLocation,
  language = 'si',
}) => {
  const [session, setSession] = useState<SosLiveSession | any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdatedSecAgo, setLastUpdatedSecAgo] = useState<number>(0);
  const [mapLayer, setMapLayer] = useState<'osm' | 'satellite'>('osm');

  // 🎙️ Live Audio Streaming States for Recipient
  const [isAudioListening, setIsAudioListening] = useState<boolean>(false);
  const [audioVolume, setAudioVolume] = useState<number>(1);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [lastAudioReceivedAt, setLastAudioReceivedAt] = useState<Date | null>(null);
  const [hasAudioData, setHasAudioData] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Real-time Firestore Subscription
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    setIsLoading(true);

    const unsubscribe = subscribeToSosLiveSession(sessionId, (updatedSession: any) => {
      setSession(updatedSession);
      setIsLoading(false);
      setLastUpdatedSecAgo(0);

      // Check if new audio chunk arrived from the victim
      if (updatedSession?.latestAudioBase64) {
        setHasAudioData(true);
        setLastAudioReceivedAt(new Date());

        // Auto-play if recipient enabled live listening
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = updatedSession.latestAudioBase64;
          if (isAudioListening) {
            audioPlayerRef.current.play().catch((err) => {
              console.warn('Audio auto-play blocked by browser policy:', err);
            });
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, sessionId, isAudioListening]);

  // Handle Play/Stop Listening Toggle
  const toggleListening = () => {
    if (isAudioListening) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setIsAudioListening(false);
    } else {
      setIsAudioListening(true);
      setAudioError(null);
      if (audioPlayerRef.current && session?.latestAudioBase64) {
        audioPlayerRef.current.src = session.latestAudioBase64;
        audioPlayerRef.current.play().catch((err) => {
          setAudioError('ශ්‍රව්‍ය වාදනය ආරම්භ කිරීමට කරුණාකර තිරය ස්පර්ශ කරන්න.');
        });
      }
    }
  };

  // "Seconds ago" counter
  useEffect(() => {
    const timer = setInterval(() => {
      if (session?.updatedAtMs || session?.lastUpdate) {
        const ms = session.updatedAtMs || (session.lastUpdate?.toMillis ? session.lastUpdate.toMillis() : Date.now());
        const diffSec = Math.floor((Date.now() - ms) / 1000);
        setLastUpdatedSecAgo(Math.max(0, diffSec));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  // Leaflet Map Initialization & Updates
  useEffect(() => {
    if (!isOpen || !session || !mapContainerRef.current) return;

    const lat = session.latitude || session.currentLocation?.latitude || 6.9271;
    const lng = session.longitude || session.currentLocation?.longitude || 79.8612;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
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

    // Custom Icon (Pulsing if active, Gray if ended)
    const isLive = session.isActive !== false && session.status !== 'resolved' && session.status !== 'duress_canceled';
    const beaconHtml = isLive ? `
      <div class="relative flex items-center justify-center">
        <span class="absolute w-12 h-12 bg-rose-500/40 rounded-full animate-ping"></span>
        <span class="absolute w-7 h-7 bg-red-600/70 rounded-full animate-pulse"></span>
        <div class="relative w-6 h-6 bg-red-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white text-[10px] font-black">
          SOS
        </div>
      </div>
    ` : `
      <div class="relative flex items-center justify-center">
        <div class="w-6 h-6 bg-slate-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white text-[10px] font-black">
          OFF
        </div>
      </div>
    `;

    const icon = L.divIcon({
      className: 'custom-sos-viewer-beacon',
      html: beaconHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const marker = L.marker([lat, lng], { icon }).addTo(map);
    markerRef.current = marker;

    const accuracy = session.accuracyMeters || session.accuracy;
    if (accuracy) {
      const circle = L.circle([lat, lng], {
        radius: accuracy,
        color: isLive ? '#f43f5e' : '#64748b',
        fillColor: isLive ? '#fda4af' : '#cbd5e1',
        fillOpacity: 0.2,
        weight: 1.5,
      }).addTo(map);
      accuracyCircleRef.current = circle;
    }

    const trail = session.breadcrumbTrail || session.breadcrumbs;
    if (trail && trail.length > 0) {
      const polyline = L.polyline(trail.map((b: any) => [b.lat || b.latitude, b.lng || b.longitude]), {
        color: isLive ? '#ef4444' : '#64748b',
        weight: 4,
        opacity: 0.8,
        dashArray: '5, 8',
      }).addTo(map);
      polylineRef.current = polyline;
    }

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
  }, [isOpen, mapLayer, session?.id, sessionId]);

  // Update existing map when coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !session) return;
    const lat = session.latitude || session.currentLocation?.latitude;
    const lng = session.longitude || session.currentLocation?.longitude;
    if (!lat || !lng) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    const accuracy = session.accuracyMeters || session.accuracy;
    if (accuracyCircleRef.current && accuracy) {
      accuracyCircleRef.current.setLatLng([lat, lng]);
      accuracyCircleRef.current.setRadius(accuracy);
    }
    const trail = session.breadcrumbTrail || session.breadcrumbs;
    if (polylineRef.current && trail) {
      polylineRef.current.setLatLngs(trail.map((b: any) => [b.lat || b.latitude, b.lng || b.longitude]));
    }
    mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom(), { animate: true });
  }, [session?.latitude, session?.longitude, session?.currentLocation, session?.breadcrumbs]);
  if (!isOpen) return null;

  const lat = session?.latitude || session?.currentLocation?.latitude || 6.9271;
  const lng = session?.longitude || session?.currentLocation?.longitude || 79.8612;
  const isLive = session?.isActive !== false && session?.status !== 'resolved' && session?.status !== 'duress_canceled';

  // Calculate distance from viewer to victim
  const distanceKm = (viewerLocation && session) 
    ? calculateDistanceKm(viewerLocation.lat, viewerLocation.lng, lat, lng)
    : null;

  const googleMapsRouteUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const emergencyMsg = session?.emergencyMessage || session?.emergencyNote || 'මා ගැන හා මම සිටින ස්ථානය සෙවීමට මේ ලින්ක් එක භාවිතා කරන්න.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      {/* Hidden Audio Element for Live Streaming */}
      <audio 
        ref={audioPlayerRef} 
        preload="auto" 
        onPlay={() => setIsAudioListening(true)}
        onPause={() => setIsAudioListening(false)}
      />

      <div className="bg-white dark:bg-[#0b1712] border-2 border-rose-600/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl transition-all relative flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className={`p-4 sm:p-5 text-white flex items-center justify-between gap-3 shrink-0 shadow-md ${
          isLive
            ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700'
            : 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-red-600 font-black text-2xl flex items-center justify-center shadow-lg">
              {isLive ? '🚨' : '🛡️'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-wide">
                  {isLive ? 'සජීවී SOS ස්ථානය හා හඬ නිරීක්ෂණය' : 'SOS සජීවී විකාශනය අවසන්'}
                </h3>
                {isLive ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-200 border border-rose-400/50 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
                    <span>LIVE TRACKING</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-600 text-[10px] font-bold">
                    DEACTIVATED
                  </span>
                )}
              </div>
              <p className="text-xs text-red-100 font-medium">
                {session?.sessionCode || `#SOS-${sessionId.slice(-4).toUpperCase()}`} • {session?.userName || 'පරිශීලක'}
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

        {/* Body Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">

          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                සජීවී ස්ථාන සහ ශ්‍රව්‍ය දත්ත ලබාගනිමින් පවතී...
              </p>
            </div>
          ) : !session ? (
            <div className="p-6 text-center space-y-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                SOS සැසිය සොයා ගැනීමට නොහැකි විය
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                මෙම සබැඳිය අවලංගු කර ඇත හෝ කාලය ඉකුත් වී ඇත.
              </p>
            </div>
          ) : (
            <>
              {/* Deactivated Notice if OFF */}
              {!isLive && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">
                      මෙම SOS සජීවී විකාශනය අක්‍රිය කර ඇත
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      පරිශීලකයා විසින් 'මම දැන් ආරක්ෂිතයි' තහවුරු කර ඇති බැවින් ලුහුබැඳීම අවසන් විය.
                    </span>
                  </div>
                </div>
              )}

              {/* ⚠️ EMERGENCY MESSAGE HIGHLIGHT BOX */}
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  <span>හදිසි පණිවිඩය (Emergency Distress Note):</span>
                </div>
                <p className="text-sm font-bold leading-relaxed">
                  "{emergencyMsg}"
                </p>
              </div>

              {/* 🎙️ 🔴 LIVE AUDIO EVIDENCE STREAM PLAYER CARD */}
              <div className="p-4 rounded-3xl bg-gradient-to-br from-red-950/80 via-slate-900 to-slate-950 border-2 border-rose-500/60 text-white shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-rose-600 text-white shrink-0 shadow-md">
                      <Headphones className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black flex items-center gap-2">
                        <span>සජීවී පසුබිම් හඬ ඇසීම (Live Audio Stream)</span>
                        {isLive && (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-300 font-medium">
                        {hasAudioData
                          ? 'වින්දිතයාගේ දුරකථනයෙන් පසුබිම් හඬ සජීවීව Cloud වෙත ලැබෙමින් පවතී'
                          : 'ශ්‍රව්‍ය සංඥා බලාපොරොත්තුවෙන් පවතී...'}
                      </p>
                    </div>
                  </div>

                  {/* Sound Wave Animation Indicator */}
                  {isAudioListening && (
                    <div className="flex items-end gap-1 h-6 shrink-0">
                      <span className="w-1 bg-rose-400 rounded-full animate-bounce h-3"></span>
                      <span className="w-1 bg-rose-500 rounded-full animate-bounce h-5 [animation-delay:0.2s]"></span>
                      <span className="w-1 bg-red-400 rounded-full animate-bounce h-6 [animation-delay:0.4s]"></span>
                      <span className="w-1 bg-rose-500 rounded-full animate-bounce h-4 [animation-delay:0.1s]"></span>
                      <span className="w-1 bg-rose-400 rounded-full animate-bounce h-2 [animation-delay:0.3s]"></span>
                    </div>
                  )}
                </div>

                {audioError && (
                  <p className="text-xs text-amber-300 bg-amber-950/60 p-2 rounded-xl border border-amber-600/40">
                    {audioError}
                  </p>
                )}

                {/* Audio Controls Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                      isAudioListening
                        ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-white/40 animate-pulse'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isAudioListening ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{isAudioListening ? 'හඬ නැවැත්වීම (Stop Audio)' : 'සජීවී හඬට සවන් දෙන්න (Listen Live)'}</span>
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs text-slate-300">
                    <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audioVolume}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setAudioVolume(v);
                        if (audioPlayerRef.current) {
                          audioPlayerRef.current.volume = v;
                        }
                      }}
                      className="w-24 accent-rose-500 cursor-pointer"
                    />
                    <span className="font-mono text-[10px] w-8">
                      {Math.round(audioVolume * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Victim Profile & Contact Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900 dark:text-white truncate">
                      👤 {session.userName || 'පරිශීලක'}
                    </span>
                    {(session.batteryPercent !== undefined || session.batteryLevel !== undefined) && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-black text-[11px] border border-amber-500/30 flex items-center gap-1">
                        <Battery className="w-3 h-3" />
                        <span>{session.batteryPercent || session.batteryLevel}%</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {session.locationName || 'ස්ථාන විස්තර සොයමින් පවතී...'}
                  </p>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  {(session.userPhone || session.phone) && (
                    <a
                      href={`tel:${session.userPhone || session.phone}`}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>අමතන්න (Call)</span>
                    </a>
                  )}

                  {(session.userPhone || session.phone) && (
                    <a
                      href={`https://wa.me/${String(session.userPhone || session.phone).replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  <a
                    href={googleMapsRouteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>මාර්ගය (Route)</span>
                  </a>
                </div>
              </div>

              {/* Real-time Telemetry Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">යාවත්කාලීන වීම</span>
                  <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                    {isLive ? `${lastUpdatedSecAgo}s පෙර` : 'අවසන් විය'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">නිරවද්‍යතාව</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    ±{session.accuracyMeters || session.accuracy || 10}m
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">වත්මන් වේගය</span>
                  <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                    {session.speedKmh || session.speed || 0} km/h
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">ඔබේ සිට දුර</span>
                  <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                    {distanceKm !== null ? `${distanceKm.toFixed(1)} km` : 'නොදනී'}
                  </span>
                </div>
              </div>

              {/* Interactive Map */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    <span>සජීවී සිතියම ({lat.toFixed(4)}, {lng.toFixed(4)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMapLayer(mapLayer === 'osm' ? 'satellite' : 'osm')}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3 h-3" />
                    <span>{mapLayer === 'osm' ? 'Satellite' : 'Roadmap'}</span>
                  </button>
                </div>

                <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border-2 border-rose-400/40 shadow-inner">
                  <div ref={mapContainerRef} className="w-full h-full" />
                </div>
              </div>

              {/* Emergency Hotline Dial Buttons */}
              <div className="pt-2 space-y-1.5">
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  ක්ෂණික හදිසි ඇමතුම් (Emergency Call):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <a
                    href="tel:119"
                    className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-black cursor-pointer"
                  >
                    👮 119 Police
                  </a>
                  <a
                    href="tel:1990"
                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-black cursor-pointer"
                  >
                    🚑 1990 Suwa Seriya
                  </a>
                  <a
                    href="tel:110"
                    className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-black cursor-pointer"
                  >
                    🚒 110 Fire
                  </a>
                  <a
                    href="tel:117"
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black cursor-pointer"
                  >
                    🚨 117 Disaster
                  </a>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            සහය සේවා (Sahaya Sewa) සජීවී ආපදා ආරක්ෂණ පද්ධතිය
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

export default SosLiveViewerModal;

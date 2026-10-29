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
  Pause,
  ShieldCheck
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
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdatedSecAgo, setLastUpdatedSecAgo] = useState<number>(0);
  const [mapLayer, setMapLayer] = useState<'osm' | 'satellite'>('osm');

  // Viewer's live GPS coordinates for accurate distance calculation
  const [viewerCoords, setViewerCoords] = useState<{ lat: number; lng: number } | null>(() => {
    if (viewerLocation && viewerLocation.lat && viewerLocation.lng) {
      return { lat: viewerLocation.lat, lng: viewerLocation.lng };
    }
    return null;
  });

  // Audio Playback & Live Streaming State
  const [isLiveListening, setIsLiveListening] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedAudioRef = useRef<string | null>(null);

  // Auto-play incoming live audio stream clips when Live Listening is active
  useEffect(() => {
    if (!session?.isAudioCut && session?.latestAudioBase64 && isLiveListening) {
      if (lastPlayedAudioRef.current !== session.latestAudioBase64) {
        lastPlayedAudioRef.current = session.latestAudioBase64;
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = session.latestAudioBase64;
          audioPlayerRef.current.load();
          const p = audioPlayerRef.current.play();
          if (p !== undefined) {
            p.then(() => setIsPlayingAudio(true))
              .catch((err) => {
                console.warn('Auto playback notice (gesture needed):', err);
              });
          }
        }
      }
    }
  }, [session?.latestAudioBase64, session?.lastAudioSyncAt, session?.isAudioCut, isLiveListening]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Automatically fetch viewer's live GPS so "ඔබේ සිට දුර" is 100% accurate
  useEffect(() => {
    if (!isOpen) return;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setViewerCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [isOpen]);

  // Real-time Firestore Subscription
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    setIsLoading(true);

    const unsubscribe = subscribeToSosLiveSession(sessionId, (updatedSession) => {
      setSession(updatedSession);
      setIsLoading(false);
      setLastUpdatedSecAgo(0);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, sessionId]);

  // "Seconds ago" and cooldown ticker
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(Date.now());
      if (session?.updatedAtMs || session?.lastLocationUpdateMs) {
        const ts = session.lastLocationUpdateMs || session.updatedAtMs;
        const diffSec = Math.floor((Date.now() - ts) / 1000);
        setLastUpdatedSecAgo(Math.max(0, diffSec));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.updatedAtMs, session?.lastLocationUpdateMs]);

  // Robust GPS coordinates resolution
  const targetLat = session?.latitude ?? session?.currentLocation?.lat ?? session?.lat ?? 0;
  const targetLng = session?.longitude ?? session?.currentLocation?.lng ?? session?.lng ?? 0;
  const targetAccuracy = session?.accuracyMeters ?? session?.currentLocation?.accuracy ?? session?.accuracy ?? 15;
  const isCoordsValid = Boolean(targetLat && targetLng && targetLat !== 0 && targetLng !== 0);

  // Leaflet Map Initialization & Updates
  useEffect(() => {
    if (!isOpen || !isCoordsValid || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [targetLat, targetLng],
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

    const isLive = session?.isActive !== false && session?.status !== 'ended';
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

    const marker = L.marker([targetLat, targetLng], { icon }).addTo(map);
    markerRef.current = marker;

    if (targetAccuracy) {
      const circle = L.circle([targetLat, targetLng], {
        radius: targetAccuracy,
        color: isLive ? '#f43f5e' : '#64748b',
        fillColor: isLive ? '#fda4af' : '#cbd5e1',
        fillOpacity: 0.2,
        weight: 1.5,
      }).addTo(map);
      accuracyCircleRef.current = circle;
    }

    const breadcrumbs = session?.breadcrumbs || session?.breadcrumbTrail || [];
    if (breadcrumbs.length > 0) {
      const polyline = L.polyline(breadcrumbs.map((b: any) => [b.lat, b.lng]), {
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
  }, [isOpen, mapLayer, session?.id, isCoordsValid]);

  // Update existing map when coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !isCoordsValid) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([targetLat, targetLng]);
    }
    if (accuracyCircleRef.current && targetAccuracy) {
      accuracyCircleRef.current.setLatLng([targetLat, targetLng]);
      accuracyCircleRef.current.setRadius(targetAccuracy);
    }
    const breadcrumbs = session?.breadcrumbs || session?.breadcrumbTrail || [];
    if (polylineRef.current && breadcrumbs.length > 0) {
      polylineRef.current.setLatLngs(breadcrumbs.map((b: any) => [b.lat, b.lng]));
    }
    mapInstanceRef.current.panTo([targetLat, targetLng], { animate: true });
  }, [targetLat, targetLng, targetAccuracy, session?.breadcrumbs]);

  if (!isOpen) return null;

  // Check if current viewer has been disconnected by the sender
  const contactIdParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('cid') : null;
  const isViewerRevoked = Boolean(contactIdParam && session?.disconnectedContactIds?.includes(contactIdParam));

  if (isViewerRevoked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
        <div className="bg-slate-900 border-2 border-red-600 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl text-white">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-500 flex items-center justify-center mx-auto text-3xl font-black">
            🚫
          </div>
          <h3 className="text-lg font-black text-white">සජීවී නිරීක්ෂණ සබඳතාව විසන්ධි කර ඇත</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            මෙම SOS සැසියේ හිමිකරු විසින් ඔබගේ සජීවී නිරීක්ෂණ ප්‍රවේශය අත්හිටුවා (Disconnect කර) ඇත.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs cursor-pointer"
          >
            වසන්න (Close)
          </button>
        </div>
      </div>
    );
  }

  // 🛡️ Safe Deactivated Screen (Immediately terminates live tracking and hides map)
  const isSessionEnded = session?.isActive === false || session?.status === 'ended' || session?.status === 'cancelled' || session?.status === 'resolved';
  const endedTimestamp = session?.endedAtMs || session?.lastLocationUpdateMs || session?.updatedAtMs || 0;

  if (isSessionEnded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
        <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl text-white">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-4xl font-black shadow-lg">
            🛡️
          </div>
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black uppercase tracking-wider mb-2">
              SAFE & DEACTIVATED
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              පරිශීලකයා දැන් ආරක්ෂිතයි
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed pt-2">
              මෙම පුද්ගලයා <strong className="text-emerald-400">"දැන් මම ආරක්ෂිතයි (Deactivate SOS)"</strong> ලෙස සටහන් කර ඇති බැවින්, පුද්ගලිකත්ව හා ආරක්ෂක නීති අනුව සජීවී ස්ථාන නිරීක්ෂණය (Location Tracking) සහ හඬ විකාශනය ආරක්ෂිතව සම්පූර්ණයෙන්ම නවත්වා ඇත.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-left text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">පුද්ගලයාගේ නම:</span>
              <span className="font-bold text-white">{session?.userName || 'පරිශීලක'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">සැසි අංකය:</span>
              <span className="font-mono text-emerald-400 font-bold">{session?.sessionCode || `#SOS-${sessionId.slice(-4)}`}</span>
            </div>
            {endedTimestamp > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-400">අවසන් කළ වේලාව:</span>
                <span className="text-slate-300">{new Date(endedTimestamp).toLocaleTimeString('si-LK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs cursor-pointer transition-all shadow-lg active:scale-95"
          >
            වසන්න (Close)
          </button>
        </div>
      </div>
    );
  }

  // Calculate distance from viewer to victim accurately
  const distanceKm = (viewerCoords && isCoordsValid) 
    ? calculateDistanceKm(viewerCoords.lat, viewerCoords.lng, targetLat, targetLng)
    : null;

  // Exact Google Maps navigation URL
  const googleMapsRouteUrl = isCoordsValid
    ? `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}`
    : '#';

  const googleMapsPinUrl = isCoordsValid
    ? `https://www.google.com/maps/search/?api=1&query=${targetLat},${targetLng}`
    : '#';

  const isLive = session?.isActive !== false && session?.status !== 'ended';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
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
                  {isLive ? 'සජීවී SOS ස්ථාන හා හඬ නිරීක්ෂණය' : 'SOS සජීවී විකාශනය අවසන්'}
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
              <p className="text-xs text-red-100 font-medium truncate max-w-xs sm:max-w-md">
                {session?.sessionCode || `#SOS-${sessionId.slice(-4)}`} • {session?.userName || 'පරිශීලක'}
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
                සජීවී ස්ථාන දත්ත ලබාගනිමින් පවතී...
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
              {/* 🎧 Live Audio Stream Player or Cut Notice */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/80 to-black border-2 border-indigo-500/40 text-white space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-500/50 text-indigo-400">
                      {session.isAudioCut ? (
                        <VolumeX className="w-5 h-5 text-rose-400" />
                      ) : isPlayingAudio ? (
                        <Volume2 className="w-5 h-5 text-emerald-400 animate-pulse" />
                      ) : (
                        <Radio className="w-5 h-5 text-cyan-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-white">
                          {session.isAudioCut ? 'හඬ විකාශනය අත්හිටුවා ඇත' : 'සජීවී පසුබිම් හඬ (Live Audio Stream)'}
                        </h4>
                        {isLiveListening && !session.isAudioCut && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase tracking-wider animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            LIVE LISTENING
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {session.isAudioCut
                          ? 'පරිශීලකයා විසින් ආරක්ෂිතව හඬ විකාශනය Cut කර ඇත.'
                          : session.latestAudioBase64
                          ? session.lastAudioSyncAt 
                            ? `නවතම හඬ ඛණ්ඩය (මීට තත්පර ${Math.max(0, Math.floor((Date.now() - session.lastAudioSyncAt) / 1000))} කට පෙර)`
                            : 'නවතම සජීවී හඬ ඛණ්ඩය සූදානම්.'
                          : 'ශ්‍රව්‍ය සංඥා බලාපොරොත්තුවෙන් පවතී (අනෙක් පාර්ශවය "හඬ රෙකෝඩ් On" කළ පසු ඇසෙනු ඇත)...'}
                      </p>
                    </div>
                  </div>

                  {!session.isAudioCut && session.latestAudioBase64 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      AUDIO READY
                    </span>
                  )}
                </div>

                {!session.isAudioCut && session.latestAudioBase64 && (
                  <div className="space-y-2 pt-1">
                    <audio
                      ref={audioPlayerRef}
                      src={session.latestAudioBase64}
                      preload="auto"
                      playsInline
                      onPlay={() => setIsPlayingAudio(true)}
                      onPause={() => setIsPlayingAudio(false)}
                      onEnded={() => setIsPlayingAudio(false)}
                      className="hidden"
                    />

                    {/* Equalizer animation when playing */}
                    {isPlayingAudio && (
                      <div className="flex items-center justify-center gap-1.5 py-1">
                        <span className="w-1.5 h-3 bg-emerald-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-5 bg-emerald-300 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                        <span className="w-1.5 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                        <span className="w-1.5 h-4 bg-teal-400 rounded-full animate-bounce [animation-delay:0.1s]"></span>
                        <span className="w-1.5 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.25s]"></span>
                        <span className="text-[10px] text-emerald-300 font-bold ml-1.5">හඬ ඇසෙමින් පවතී...</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isLiveListening) {
                            if (audioPlayerRef.current) audioPlayerRef.current.pause();
                            setIsLiveListening(false);
                            setIsPlayingAudio(false);
                          } else {
                            setIsLiveListening(true);
                            if (audioPlayerRef.current && session.latestAudioBase64) {
                              audioPlayerRef.current.src = session.latestAudioBase64;
                              audioPlayerRef.current.load();
                              audioPlayerRef.current.play().then(() => {
                                setIsPlayingAudio(true);
                                lastPlayedAudioRef.current = session.latestAudioBase64;
                              }).catch((err) => {
                                console.warn('Play error on click:', err);
                              });
                            }
                          }
                        }}
                        className={`w-full py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 ${
                          isLiveListening
                            ? 'bg-rose-600 hover:bg-rose-500 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {isLiveListening ? (
                          <>
                            <Pause className="w-4 h-4" />
                            <span>හඬ නැවතීමට (Pause Audio)</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span>▶️ සජීවී හඬට සවන් දෙන්න (Listen Live)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (audioPlayerRef.current && session.latestAudioBase64) {
                            audioPlayerRef.current.currentTime = 0;
                            audioPlayerRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => {});
                          }
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer active:scale-95"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>නැවත අසන්න (Replay Clip)</span>
                      </button>
                    </div>

                    {/* Native controls bar for direct browser audio handling */}
                    <div className="pt-1">
                      <audio 
                        src={session.latestAudioBase64} 
                        controls 
                        className="w-full h-8 opacity-90 hover:opacity-100 transition-opacity rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Victim Profile & Contact Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900 dark:text-white truncate">
                      👤 {session.userName}
                    </span>
                    {session.batteryPercent !== undefined && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-black text-[11px] border border-amber-500/30 flex items-center gap-1">
                        <Battery className="w-3 h-3" />
                        <span>{session.batteryPercent}%</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {session.locationName || session.currentLocation?.locationName || 'ස්ථාන විස්තර නොමැත'}
                  </p>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  {session.userPhone && (
                    <a
                      href={`tel:${session.userPhone}`}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>අමතන්න (Call)</span>
                    </a>
                  )}

                  {session.userPhone && (
                    <a
                      href={`https://wa.me/${session.userPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  {/* Direct Route on Google Maps */}
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

              {/* Emergency Message Callout */}
              {(session.alertReason || session.emergencyNote) && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-bold leading-relaxed">
                  <span className="text-rose-600 dark:text-rose-400 font-black block mb-1">
                    ⚠️ හදිසි පණිවිඩය:
                  </span>
                  "{session.alertReason || session.emergencyNote}"
                </div>
              )}

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
                    ±{targetAccuracy || 10}m
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">වත්මන් වේගය</span>
                  <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                    {session.speedKmh || 0} km/h
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">ඔබේ සිට දුර</span>
                  <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                    {distanceKm !== null 
                      ? (distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`)
                      : 'ස්ථානය සොයමින්...'}
                  </span>
                </div>
              </div>

              {/* Interactive Map */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    <span>සජීවී සිතියම ({targetLat ? targetLat.toFixed(4) : '0.0000'}, {targetLng ? targetLng.toFixed(4) : '0.0000'})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={googleMapsPinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Google Map එකෙන් බලන්න</span>
                    </a>

                    <div className="flex items-center p-0.5 bg-slate-200 dark:bg-slate-800 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setMapLayer('osm')}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all ${
                          mapLayer === 'osm'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Map
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapLayer('satellite')}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all ${
                          mapLayer === 'satellite'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500'
                        }`}
                      >
                        Satellite
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  ref={mapContainerRef}
                  className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow-inner relative z-0"
                />
              </div>

              {/* Bottom Footer Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                <span>සහය සේවා (Sahaya Sewa) සජීවී ආපදා ආරක්ෂණ පද්ධතිය</span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-all cursor-pointer"
                >
                  වසන්න (Close)
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};


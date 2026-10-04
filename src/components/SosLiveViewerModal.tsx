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
  LocateFixed
} from 'lucide-react';
import { SosLiveSession, Language, LocationOption } from '../types';
import { subscribeToSosLiveSession, getSosLiveSession } from '../lib/firebase';
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
  const [session, setSession] = useState<SosLiveSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdatedSecAgo, setLastUpdatedSecAgo] = useState<number>(0);
  const [mapLayer, setMapLayer] = useState<'osm' | 'satellite'>('osm');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

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

  // "Seconds ago" counter
  useEffect(() => {
    const timer = setInterval(() => {
      if (session?.updatedAtMs) {
        const diffSec = Math.floor((Date.now() - session.updatedAtMs) / 1000);
        setLastUpdatedSecAgo(Math.max(0, diffSec));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.updatedAtMs]);

  // Leaflet Map Initialization & Updates
  useEffect(() => {
    if (!isOpen || !session || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [session.latitude, session.longitude],
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
    const isLive = session.isActive;
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

    const marker = L.marker([session.latitude, session.longitude], { icon }).addTo(map);
    markerRef.current = marker;

    if (session.accuracyMeters) {
      const circle = L.circle([session.latitude, session.longitude], {
        radius: session.accuracyMeters,
        color: isLive ? '#f43f5e' : '#64748b',
        fillColor: isLive ? '#fda4af' : '#cbd5e1',
        fillOpacity: 0.2,
        weight: 1.5,
      }).addTo(map);
      accuracyCircleRef.current = circle;
    }

    if (session.breadcrumbTrail && session.breadcrumbTrail.length > 0) {
      const polyline = L.polyline(session.breadcrumbTrail.map(b => [b.lat, b.lng]), {
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
  }, [isOpen, mapLayer, session?.id]);

  // Update existing map when session updates
  useEffect(() => {
    if (!mapInstanceRef.current || !session) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([session.latitude, session.longitude]);
    }
    if (accuracyCircleRef.current && session.accuracyMeters) {
      accuracyCircleRef.current.setLatLng([session.latitude, session.longitude]);
      accuracyCircleRef.current.setRadius(session.accuracyMeters);
    }
    if (polylineRef.current && session.breadcrumbTrail) {
      polylineRef.current.setLatLngs(session.breadcrumbTrail.map(b => [b.lat, b.lng]));
    }
    mapInstanceRef.current.setView([session.latitude, session.longitude], mapInstanceRef.current.getZoom(), { animate: true });
  }, [session?.latitude, session?.longitude, session?.breadcrumbTrail]);

  if (!isOpen) return null;

  // Calculate distance from viewer to victim
  const distanceKm = (viewerLocation && session) 
    ? calculateDistanceKm(viewerLocation.lat, viewerLocation.lng, session.latitude, session.longitude)
    : null;

  const googleMapsRouteUrl = session
    ? `https://www.google.com/maps/dir/?api=1&destination=${session.latitude},${session.longitude}`
    : '#';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-[#0b1712] border-2 border-rose-600/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl transition-all relative flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className={`p-4 sm:p-5 text-white flex items-center justify-between gap-3 shrink-0 shadow-md ${
          session?.isActive
            ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700'
            : 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-red-600 font-black text-2xl flex items-center justify-center shadow-lg">
              {session?.isActive ? '🚨' : '🛡️'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-wide">
                  {session?.isActive ? 'සජීවී SOS ස්ථාන නිරීක්ෂණය' : 'SOS සජීවී විකාශනය අවසන්'}
                </h3>
                {session?.isActive ? (
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
              {/* Deactivated Notice if OFF */}
              {!session.isActive && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">
                      මෙම SOS සජීවී විකාශනය අක්‍රිය කර ඇත
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      පරිශීලකයා විසින් SOS ස්විචය Off කර ඇති බැවින් ස්ථාන විකාශනය අවසන් වී ඇත.
                    </span>
                  </div>
                </div>
              )}

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
                    {session.locationName || 'ස්ථාන විස්තර නොමැත'}
                  </p>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  {session.userPhone && (
                    <a
                      href={`tel:${session.userPhone}`}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
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
                    <span>මාර්ගය (Navigate)</span>
                  </a>
                </div>
              </div>

              {/* Emergency Message Callout */}
              {session.emergencyNote && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-bold leading-relaxed">
                  <span className="text-rose-600 dark:text-rose-400 font-black block mb-1">
                    ⚠️ හදිසි පණිවිඩය:
                  </span>
                  "{session.emergencyNote}"
                </div>
              )}

              {/* Real-time Telemetry Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">යාවත්කාලීන වීම</span>
                  <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                    {session.isActive ? `${lastUpdatedSecAgo}s පෙර` : 'අවසන් විය'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold">නිරවද්‍යතාව</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    ±{session.accuracyMeters || 5}m
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
                    {distanceKm !== null ? `${distanceKm.toFixed(1)} km` : 'නොදනී'}
                  </span>
                </div>
              </div>

              {/* Interactive Map */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    <span>සජීවී සිතියම ({session.latitude.toFixed(4)}, {session.longitude.toFixed(4)})</span>
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

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Layers,
  LocateFixed,
  Crosshair
} from 'lucide-react';
import { GroupMessageLocation } from '../types';

interface GroupChatMapViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: GroupMessageLocation | null;
}

export const GroupChatMapViewerModal: React.FC<GroupChatMapViewerModalProps> = ({
  isOpen,
  onClose,
  location,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapLayer, setMapLayer] = useState<'osm' | 'hot' | 'satellite'>('osm');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !location || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [location.lat, location.lng],
      zoom: 16,
      zoomControl: false,
    });

    let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let subdomains: string[] | string = 'abc';

    if (mapLayer === 'hot') {
      tileUrl = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
    } else if (mapLayer === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      subdomains = [];
    }

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Marker
    const customIcon = L.divIcon({
      className: 'viewer-chat-pin',
      html: `
        <div style="position: relative; width: 40px; height: 40px; transform: translate(-50%, -100%);">
          <div style="position: absolute; inset: 0; background: #e11d48; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 10px 20px rgba(225, 29, 72, 0.4); border: 3px solid white;"></div>
          <div style="position: absolute; top: 8px; left: 8px; width: 14px; height: 14px; background: white; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    const marker = L.marker([location.lat, location.lng], { icon: customIcon }).addTo(map);
    
    // Popup
    marker.bindPopup(`
      <div style="font-family: sans-serif; padding: 4px;">
        <strong style="font-size: 13px; color: #1e1b4b;">${location.name}</strong>
        ${location.address ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${location.address}</div>` : ''}
        ${location.note ? `<div style="font-size: 11px; color: #047857; margin-top: 4px; font-weight: bold;">📝 ${location.note}</div>` : ''}
      </div>
    `).openPopup();

    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, location, mapLayer]);

  if (!isOpen || !location) return null;

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleOpenGoogleMaps = () => {
    if (!location) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`, '_blank');
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current && location) {
      mapInstanceRef.current.setView([location.lat, location.lng], 16, { animate: true });
    }
  };

  if (!isOpen || !location) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-3xl border-2 border-indigo-500 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-indigo-700 via-indigo-800 to-violet-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm sm:text-base leading-tight truncate">
                {location.name}
              </h3>
              <p className="text-[11px] text-indigo-200 font-mono truncate">
                {location.lat.toFixed(5)}° N, {location.lng.toFixed(5)}° E {location.address ? `• ${location.address}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Layer switcher */}
            <div className="flex rounded-xl border border-white/20 bg-black/20 p-0.5">
              <button
                type="button"
                onClick={() => setMapLayer('osm')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  mapLayer === 'osm' ? 'bg-white text-indigo-900 shadow-xs' : 'text-white/80'
                }`}
              >
                Street
              </button>
              <button
                type="button"
                onClick={() => setMapLayer('satellite')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  mapLayer === 'satellite' ? 'bg-white text-indigo-900 shadow-xs' : 'text-white/80'
                }`}
              >
                Satellite
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="වසන්න"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Note Banner if present */}
        {location.note && (
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shrink-0">
            <span className="text-sm">📝</span>
            <span>{location.note}</span>
          </div>
        )}

        {/* Map Container */}
        <div className="relative flex-1 min-h-[320px] sm:min-h-[420px] bg-slate-100 dark:bg-zinc-950">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Floating Controls */}
          <div className="absolute right-3 top-3 z-[400] flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => mapInstanceRef.current?.zoomIn()}
              className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 shadow-md border border-zinc-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => mapInstanceRef.current?.zoomOut()}
              className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 shadow-md border border-zinc-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRecenter}
              className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 shadow-md border border-zinc-200 dark:border-zinc-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Re-center"
            >
              <LocateFixed className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCoords}
              className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'පිටපත් විය!' : 'GPS පිටපත් කරන්න'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenGoogleMaps}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Google Maps හරහා මාර්ගය (Directions)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              වසන්න
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

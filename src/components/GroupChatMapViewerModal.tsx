import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

const MAP_THEMES = {
  voyager: {
    name: 'Street',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labelUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    subdomains: '',
    maxZoom: 19,
    attribution: '&copy; Esri, Maxar',
  }
};

export const GroupChatMapViewerModal: React.FC<GroupChatMapViewerModalProps> = ({
  isOpen,
  onClose,
  location,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapLayer, setMapLayer] = useState<'voyager' | 'satellite'>('voyager');
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

    const activeConfig = MAP_THEMES[mapLayer];
    L.tileLayer(activeConfig.url, {
      maxZoom: activeConfig.maxZoom,
      subdomains: activeConfig.subdomains as any,
      attribution: activeConfig.attribution,
    }).addTo(map);

    if (mapLayer === 'satellite' && (activeConfig as any).labelUrl) {
      L.tileLayer((activeConfig as any).labelUrl, {
        maxZoom: 19,
        zIndex: 10,
      }).addTo(map);
    }

    // Modern glowing pin
    const customIcon = L.divIcon({
      className: 'modern-viewer-pin',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; items-center; justify-content: center;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); transform: rotate(-45deg); box-shadow: 0 10px 25px rgba(225, 29, 72, 0.5); border: 2.5px solid white;"></div>
          <div style="position: absolute; top: 11px; left: 15px; width: 14px; height: 14px; background: white; border-radius: 50%; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);"></div>
          <div style="position: absolute; bottom: 2px; width: 10px; height: 4px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(1.5px);"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 42],
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

    const runInvalidate = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ animate: false });
      }
    };

    requestAnimationFrame(runInvalidate);
    const t1 = setTimeout(runInvalidate, 100);
    const t2 = setTimeout(runInvalidate, 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, location, mapLayer]);

  if (!isOpen || !location) return null;

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;

  const handleCopy = () => {
    const text = `${location.name}\n${location.address || ''}\n${mapsUrl}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <style>{`
        .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          z-index: 10 !important;
          background: #f1f5f9 !important;
        }
      `}</style>
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border-2 border-indigo-500/40 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-700 via-rose-700 to-indigo-800 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black truncate max-w-[260px] sm:max-w-md">
                {location.name}
              </h3>
              <p className="text-[11px] text-white/80">
                {location.lat.toFixed(5)}° N, {location.lng.toFixed(5)}° E
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Map Layer Switcher Header */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs font-bold shrink-0">
          <span className="text-slate-500 dark:text-zinc-400">
            {location.address || 'ශ්‍රී ලංකාව'}
          </span>
          <div className="flex rounded-lg border border-indigo-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-0.5">
            <button
              type="button"
              onClick={() => setMapLayer('voyager')}
              className={`px-2 py-1 rounded text-[10px] font-bold ${
                mapLayer === 'voyager' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-zinc-400'
              }`}
            >
              Street
            </button>
            <button
              type="button"
              onClick={() => setMapLayer('satellite')}
              className={`px-2 py-1 rounded text-[10px] font-bold ${
                mapLayer === 'satellite' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-zinc-400'
              }`}
            >
              Satellite
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative flex-1 min-h-[300px] w-full overflow-hidden bg-slate-100 dark:bg-zinc-950">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Footer & Route Buttons */}
        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Google Maps හරහා මාර්ගය (Navigate)</span>
          </a>
        </div>
      </div>
    </div>
  );
};

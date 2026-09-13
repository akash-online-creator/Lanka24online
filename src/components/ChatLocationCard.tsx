import React, { useState } from 'react';
import {
  MapPin,
  ExternalLink,
  Navigation,
  Copy,
  Check,
  Maximize2,
  Compass
} from 'lucide-react';
import { GroupMessageLocation } from '../types';
import { getVillageOrTownDisplay } from '../utils/geoUtils';

interface ChatLocationCardProps {
  location: GroupMessageLocation;
  isMe: boolean;
  onViewMap: (loc: GroupMessageLocation) => void;
}

export const ChatLocationCard: React.FC<ChatLocationCardProps> = ({
  location,
  isMe,
  onViewMap,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenExternalGoogleMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`, '_blank');
  };

  // Generate OpenStreetMap static tile snapshot URL
  // Zoom level 15 tile calculation
  const zoom = 15;
  const latRad = (location.lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const xTile = Math.floor(((location.lng + 180) / 360) * n);
  const yTile = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n);
  const tileUrl = `https://tile.openstreetmap.org/${zoom}/${xTile}/${yTile}.png`;

  return (
    <div
      onClick={() => onViewMap(location)}
      className="my-1.5 w-full max-w-[320px] sm:max-w-[340px] rounded-2xl overflow-hidden border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-900 shadow-md hover:shadow-lg transition-all cursor-pointer group text-left"
    >
      {/* Mini Map Preview Thumbnail */}
      <div className="relative h-28 w-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
        {/* Layered tile background simulation */}
        <div
          className="absolute inset-0 bg-cover bg-center filter contrast-105 group-hover:scale-105 transition-transform duration-500"
          style={{
            backgroundImage: `url('${tileUrl}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />

        {/* Centered Glowing Pin */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative animate-bounce">
            <div className="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
              <MapPin className="w-4 h-4 fill-white" />
            </div>
            <div className="w-2.5 h-1 bg-black/40 rounded-full mx-auto mt-0.5 filter blur-[1px]" />
          </div>
        </div>

        {/* View Map Overlay Button on Hover */}
        <div className="absolute top-2 right-2 bg-indigo-600/90 backdrop-blur-xs text-white px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-md group-hover:bg-indigo-600 transition-colors">
          <Maximize2 className="w-3 h-3" />
          <span>විශාල සිතියම (Map)</span>
        </div>

        {/* Coordinates badge */}
        <div className="absolute bottom-1.5 left-2 bg-black/75 backdrop-blur-xs text-white/90 px-2 py-0.5 rounded-md font-mono text-[9px] font-medium">
          {location.lat.toFixed(4)}°N, {location.lng.toFixed(4)}°E
        </div>
      </div>

      {/* Location Details */}
      <div className="p-3 space-y-2">
        <div>
          <div className="flex items-start gap-1.5">
            <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-zinc-100 leading-snug line-clamp-2">
              {getVillageOrTownDisplay(location.name)}
            </h4>
          </div>
          {location.address && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-5.5 line-clamp-1 mt-0.5">
              {getVillageOrTownDisplay(location.address)}
            </p>
          )}
          {location.note && (
            <div className="mt-1.5 ml-5.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium">
              📝 {location.note}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-1 flex items-center justify-between gap-1.5 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewMap(location);
            }}
            className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            <span>සිතියම බලන්න</span>
          </button>

          <button
            type="button"
            onClick={handleOpenExternalGoogleMaps}
            className="py-1.5 px-2 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="Google Maps හරහා මාර්ගය"
          >
            <ExternalLink className="w-3.5 h-3.5 text-teal-600" />
            <span>Google Maps</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
            title="GPS ඛණ්ඩාංක පිටපත් කරන්න"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

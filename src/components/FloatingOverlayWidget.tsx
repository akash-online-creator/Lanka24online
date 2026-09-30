import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  X, 
  Volume2, 
  VolumeX, 
  MapPin, 
  Maximize2, 
  ShieldAlert, 
  PhoneCall, 
  Activity, 
  Sparkles,
  ChevronUp,
  ChevronDown,
  Layers,
  Zap,
  ExternalLink
} from 'lucide-react';
import { RedAlertItem, Language } from '../types';
import { activateBackgroundWakeLock } from '../utils/notificationManager';
import { startEmergencySiren, stopEmergencySiren } from '../utils/sirenAudio';

interface FloatingOverlayWidgetProps {
  onOpenCreateRedAlert: () => void;
  onOpenSosTracker?: () => void;
  onOpenActiveHazards?: () => void;
  activeHazardsCount?: number;
  userCoords?: { lat: number; lng: number } | null;
  nearestHazardDistanceKm?: number | null;
  language?: Language;
}

export const FloatingOverlayWidget: React.FC<FloatingOverlayWidgetProps> = ({
  onOpenCreateRedAlert,
  onOpenSosTracker,
  onOpenActiveHazards,
  activeHazardsCount = 0,
  userCoords,
  nearestHazardDistanceKm,
  language = 'si',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      return localStorage.getItem('sahaya_overlay_minimized') === 'true';
    } catch {
      return false;
    }
  });

  // Position state (persisted)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('sahaya_overlay_pos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: typeof window !== 'undefined' ? window.innerWidth - 80 : 300, y: typeof window !== 'undefined' ? window.innerHeight - 150 : 500 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });
  const hasMovedRef = useRef(false);

  // Picture-in-Picture state
  const [isPipActive, setIsPipActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Enable wake lock on mount
  useEffect(() => {
    activateBackgroundWakeLock()
      .then((active) => setWakeLockActive(active))
      .catch(() => {});
  }, []);

  // Save position when changed
  useEffect(() => {
    try {
      localStorage.setItem('sahaya_overlay_pos', JSON.stringify(position));
    } catch {}
  }, [position]);

  // Adjust on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(Math.max(10, prev.x), window.innerWidth - 75),
        y: Math.min(Math.max(10, prev.y), window.innerHeight - 75),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Touch / Mouse Drag handlers
  const handleStartDrag = (clientX: number, clientY: number) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleMoveDrag = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const deltaX = clientX - dragStartRef.current.startX;
    const deltaY = clientY - dragStartRef.current.startY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasMovedRef.current = true;
    }

    const newX = Math.min(Math.max(10, dragStartRef.current.posX + deltaX), window.innerWidth - 75);
    const newY = Math.min(Math.max(10, dragStartRef.current.posY + deltaY), window.innerHeight - 75);

    setPosition({ x: newX, y: newY });
  };

  const handleEndDrag = () => {
    setIsDragging(false);
  };

  // 🖼️ Picture-in-Picture (PiP) Window Generator (Canvas -> Video Stream PiP)
  const handleTogglePictureInPicture = async () => {
    if (isPipActive && document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } catch (err) {
        console.warn('PiP exit notice:', err);
      }
      return;
    }

    try {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 360;
      canvas.height = 240;
      canvasRef.current = canvas;
      const ctx = canvas.getContext('2d');

      const drawPipFrame = () => {
        if (!ctx) return;
        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 360, 240);

        // Header bar
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(0, 0, 360, 48);

        // Header text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('🚨 සහය සේවා - RED ALERT GUARD', 15, 32);

        // Status body
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(25, 80, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('24/7 Background Scanner: Active', 42, 85);

        // Hazard Count / Distance
        ctx.fillStyle = activeHazardsCount > 0 ? '#ef4444' : '#38bdf8';
        ctx.font = 'bold 16px sans-serif';
        const distTxt = nearestHazardDistanceKm !== null && nearestHazardDistanceKm !== undefined
          ? `ළඟම ආපදාව: ${nearestHazardDistanceKm.toFixed(1)} km දුරින්`
          : `ක්‍රියාකාරී ආපදා: ${activeHazardsCount} ක් සක්‍රීයයි`;
        ctx.fillText(distTxt, 20, 130);

        // GPS Location
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        const coordsTxt = userCoords ? `GPS: ${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}` : 'GPS: ලබාගනිමින් පවතී...';
        ctx.fillText(coordsTxt, 20, 165);

        // Footer Alert Instructions
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('⚡ හදිසි ආපදා ඇඟවීම් 5km සීමාවේදී ක්‍රියාත්මක වේ.', 20, 210);
      };

      drawPipFrame();

      const stream = canvas.captureStream(5);
      let video = videoRef.current;
      if (!video) {
        video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        videoRef.current = video;
      }

      await video.play();
      if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
        await video.requestPictureInPicture();
        setIsPipActive(true);

        video.addEventListener('leavepictureinpicture', () => {
          setIsPipActive(false);
        }, { once: true });
      }
    } catch (err) {
      console.warn('PiP launch warning:', err);
      alert('ඔබගේ Browser එක තුළ Floating Picture-in-Picture window විවෘත කිරීමට අවසර ලබා දෙන්න.');
    }
  };

  const getLang = (si: string, en: string, ta: string) => {
    if (language === 'en') return en;
    if (language === 'ta') return ta;
    return si;
  };

  return (
    <>
      {/* Hidden Canvas and Video element for PiP */}
      <canvas ref={canvasRef} className="hidden" />
      <video ref={videoRef} className="hidden" muted playsInline />

      {/* Main Draggable Floating Overlay Container */}
      <div
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
          touchAction: 'none',
        }}
        className="select-none transition-shadow animate-fadeIn"
      >
        {/* Expanded Quick Action Popover Card */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 sm:right-auto sm:left-0 w-72 sm:w-80 bg-slate-900/95 text-white border-2 border-red-500 rounded-3xl shadow-2xl p-4 backdrop-blur-xl space-y-3.5 mb-2 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-xs">
                  🚨
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-wide text-white">
                    {getLang('රතු එළිය Overlay Control', 'Red Alert Overlay Control', 'சிவப்பு எச்சரிக்கை')}
                  </h4>
                  <p className="text-[10px] text-red-200 font-semibold">
                    {getLang('24/7 හදිසි ආපදා පාලකය (5km Guard)', '24/7 Emergency Guard (5km)', '24/7 அவசர கட்டுப்பாடு')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Distance / Hazard Status Pill */}
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  {getLang('GPS සෝදිසිය:', 'GPS Proximity Guard:', 'GPS கண்காணிப்பு:')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  {wakeLockActive ? 'WAKELOCK ON' : 'ONLINE'}
                </span>
              </div>
              <div className="text-[11px] font-black text-amber-300 flex items-center justify-between">
                <span>{getLang('ක්‍රියාකාරී ආපදා:', 'Active Hazards:', 'செயலில் உள்ளவை:')}</span>
                <span>{activeHazardsCount} {getLang('ක් වාර්තා වී ඇත', 'Alerts', 'அறிவிப்புகள்')}</span>
              </div>
              {nearestHazardDistanceKm !== null && nearestHazardDistanceKm !== undefined && (
                <div className="text-[11px] font-bold text-rose-300 flex items-center justify-between">
                  <span>{getLang('ළඟම ආපදාව:', 'Nearest Hazard:', 'அருகிலுள்ள அபாயம்:')}</span>
                  <span className="font-mono font-black">{nearestHazardDistanceKm.toFixed(1)} km</span>
                </div>
              )}
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* 1-Tap Red Alert Publish */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCreateRedAlert();
                }}
                className="p-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs flex flex-col items-center justify-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <span className="text-base">🚨</span>
                <span>{getLang('ආපදාවක් දන්වන්න', 'Report Hazard', 'அபாயத்தை அறிவிக்க')}</span>
              </button>

              {/* SOS Live Tracker */}
              {onOpenSosTracker && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSosTracker();
                  }}
                  className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs flex flex-col items-center justify-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>{getLang('SOS Live Track', 'SOS Live Track', 'SOS நேரலை')}</span>
                </button>
              )}

              {/* Picture-in-Picture Floating Window */}
              <button
                type="button"
                onClick={handleTogglePictureInPicture}
                className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-black text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                title="Screen එක උඩ වෙනත් Apps භාවිතයේදීත් පාවෙන Window එකක් විවෘත කරන්න"
              >
                <Maximize2 className="w-4 h-4 text-cyan-400" />
                <span>{isPipActive ? getLang('PiP නවත්වන්න', 'Close PiP', 'PiP மூடு') : getLang('Floating Window (PiP)', 'Floating Window', 'மிதக்கும் சாளரம்')}</span>
              </button>

              {/* Siren Alarm Trigger */}
              <button
                type="button"
                onClick={() => {
                  if (isSirenActive) {
                    stopEmergencySiren();
                    setIsSirenActive(false);
                  } else {
                    startEmergencySiren();
                    setIsSirenActive(true);
                  }
                }}
                className={`p-2.5 rounded-2xl border font-black text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer ${
                  isSirenActive
                    ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
              >
                {isSirenActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
                <span>{isSirenActive ? getLang('Siren නවත්වන්න', 'Stop Siren', 'நிறுத்துக') : getLang('🔊 Siren නාදය', '🔊 Play Siren', '🔊 சைரன்')}</span>
              </button>
            </div>

            {/* Quick Emergency Hotlines Quick Call */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-bold">{getLang('හදිසි ඇමතුම්:', 'Emergency Hotlines:', 'அவசர அழைப்புகள்:')}</span>
              <div className="flex items-center gap-1.5">
                <a
                  href="tel:119"
                  className="px-2 py-0.5 rounded-lg bg-blue-600/30 hover:bg-blue-600 border border-blue-500/40 text-blue-200 font-black"
                  title="Police"
                >
                  119
                </a>
                <a
                  href="tel:1990"
                  className="px-2 py-0.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-200 font-black"
                  title="1990 Suwa Seriya Ambulance"
                >
                  1990
                </a>
                <a
                  href="tel:117"
                  className="px-2 py-0.5 rounded-lg bg-amber-600/30 hover:bg-amber-600 border border-amber-500/40 text-amber-200 font-black"
                  title="Disaster Management"
                >
                  117
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Floating Draggable Head Trigger */}
        <div
          onMouseDown={(e) => handleStartDrag(e.clientX, e.clientY)}
          onMouseMove={(e) => handleMoveDrag(e.clientX, e.clientY)}
          onMouseUp={handleEndDrag}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) handleStartDrag(t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (t) handleMoveDrag(t.clientX, t.clientY);
          }}
          onTouchEnd={handleEndDrag}
          onClick={() => {
            if (!hasMovedRef.current) {
              setIsOpen((prev) => !prev);
            }
          }}
          className={`group relative flex items-center justify-center rounded-full cursor-grab active:cursor-grabbing select-none transition-transform duration-150 ${
            isDragging ? 'scale-110 shadow-2xl ring-4 ring-red-400/50' : 'hover:scale-105 shadow-xl'
          } ${
            isMinimized 
              ? 'w-12 h-12 bg-slate-900 border-2 border-red-500 text-white' 
              : 'w-14 h-14 bg-gradient-to-tr from-red-600 via-rose-600 to-red-700 text-white border-2 border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.7)]'
          }`}
          title="Drag to reposition / Click to open Floating Red Alert & SOS Control"
        >
          {/* Pulsing Beacon Ripple Ring */}
          <span className="absolute -inset-1 rounded-full bg-red-500/40 animate-ping pointer-events-none" />

          <div className="relative flex flex-col items-center justify-center leading-none">
            <span className="text-xl">🚨</span>
            <span className="text-[8px] font-black uppercase tracking-tighter mt-0.5">SOS</span>
          </div>

          {/* Active Hazard Badge */}
          {activeHazardsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-black flex items-center justify-center border-2 border-slate-950 shadow-md animate-bounce">
              {activeHazardsCount}
            </span>
          )}

          {/* Mini GPS Beacon Indicator */}
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border border-slate-900 animate-pulse" />
        </div>
      </div>
    </>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { 
  Radio, 
  ShieldAlert, 
  X, 
  Phone, 
  PhoneCall, 
  ArrowRight
} from 'lucide-react';
import { LocationOption, User } from '../types';

interface RedAlertFloatingTriggerProps {
  userId?: string;
  userName?: string;
  currentUser?: User | null;
  currentLocation?: LocationOption;
  activeCount?: number;
  onOpenActiveList?: () => void;
  onOpenSosTracker?: () => void;
  onOpenCreateModal?: () => void;
  onRequestIgnoreBattery?: () => void;
}

// 📞 ශ්‍රී ලංකා ප්‍රධාන හදිසි ආපදා ක්ෂණික ඇමතුම් අංක
const EMERGENCY_HOTLINES = [
  { number: '119', nameSi: 'පොලිස් හදිසි ඇමතුම්', nameEn: 'Police Emergency', icon: '🚓', color: 'bg-blue-600' },
  { number: '1990', nameSi: 'සුවසැරිය ගිලන්රථ සේවය', nameEn: 'Suwa Seriya Ambulance', icon: '🚑', color: 'bg-emerald-600' },
  { number: '117', nameSi: 'ආපදා කළමනාකරණ (DMC)', nameEn: 'Disaster Management', icon: '🌊', color: 'bg-amber-600' },
  { number: '110', nameSi: 'ගිනි නිවන හදිසි සේවය', nameEn: 'Fire & Rescue', icon: '🚒', color: 'bg-rose-600' },
  { number: '1919', nameSi: 'රජයේ තොරතුරු කේන්ද්‍රය', nameEn: 'Government Info Center', icon: 'ℹ️', color: 'bg-indigo-600' },
  { number: '0112691111', nameSi: 'කොළඹ ජාතික රෝහල', nameEn: 'National Hospital', icon: '🏥', color: 'bg-teal-600' },
];

export const RedAlertFloatingTrigger: React.FC<RedAlertFloatingTriggerProps> = ({
  activeCount = 0,
  onOpenActiveList,
  onOpenSosTracker,
  onOpenCreateModal,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 🤏 Draggable Bubble Coordinates (Default: Left side)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return { x: 16, y: window.innerHeight - 160 };
    }
    return { x: 16, y: 500 };
  });
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0, initialBubbleX: 0, initialBubbleY: 0 });
  const hasMovedRef = useRef(false);

  // Handle Drag Start
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartPos.current = {
      x: clientX,
      y: clientY,
      initialBubbleX: position.x,
      initialBubbleY: position.y,
    };
  };

  // Handle Drag Move
  const handleTouchMove = (e: TouchEvent | MouseEvent) => {
    if (!isDraggingRef.current) return;
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    
    const deltaX = clientX - dragStartPos.current.x;
    const deltaY = clientY - dragStartPos.current.y;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasMovedRef.current = true;
    }

    const maxX = window.innerWidth - 70;
    const maxY = window.innerHeight - 70;
    const newX = Math.min(Math.max(10, dragStartPos.current.initialBubbleX + deltaX), maxX);
    const newY = Math.min(Math.max(60, dragStartPos.current.initialBubbleY + deltaY), maxY);

    setPosition({ x: newX, y: newY });
  };

  // Handle Drag End
  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => handleTouchMove(e);
    const onTouchMove = (e: TouchEvent) => handleTouchMove(e);
    const onUp = () => handleTouchEnd();

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  return (
    <>
      {/* 🔴 DRAGGABLE FLOATING SOS & RED ALERT BUBBLE (Default Left) */}
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className="fixed z-50 select-none touch-none"
      >
        <button
          type="button"
          onMouseDown={handleTouchStart}
          onTouchStart={handleTouchStart}
          onClick={() => {
            if (!hasMovedRef.current) {
              setIsMenuOpen((prev) => !prev);
            }
          }}
          className={`relative group w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-red-600 via-rose-600 to-red-800 text-white flex flex-col items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.7)] hover:shadow-[0_0_35px_rgba(239,68,68,0.9)] border-2 border-red-300 transition-transform active:scale-95 cursor-grab active:cursor-grabbing ${
            isMenuOpen ? 'ring-4 ring-red-400 ring-offset-2 ring-offset-black' : ''
          }`}
          title="හදිසි ආපදා සහන කේන්ද්‍රය (SOS & Red Alert Menu)"
          aria-label="SOS සහ රතු එළිය මෙනුව"
        >
          {/* Pulsing Alert Waves */}
          <span className="absolute -inset-1.5 rounded-full bg-red-500/30 animate-ping pointer-events-none" />
          <span className="absolute -inset-3 rounded-full bg-rose-500/20 animate-pulse pointer-events-none" />

          <span className="text-xl sm:text-2xl leading-none" role="img" aria-label="Siren">
            🚨
          </span>
          <span className="text-[9px] font-black tracking-tighter uppercase text-white drop-shadow-sm leading-tight">
            SOS / රතු
          </span>

          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-white text-red-700 text-[10px] font-black border-2 border-red-600 shadow-md">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* 📋 EXPANDABLE QUICK ACTION MENU (Direct page links) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:items-end sm:justify-start p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-950 border-2 border-red-600/80 rounded-3xl p-5 w-full max-w-sm shadow-[0_0_50px_rgba(220,38,38,0.4)] text-white space-y-4 my-auto sm:my-0 sm:ml-4 sm:mb-20">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-red-900/50 pb-3">
              <div className="flex items-center gap-2 text-red-400">
                <div className="p-2 rounded-xl bg-red-950/80 border border-red-600/40">
                  <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white leading-tight">හදිසි ආපදා & SOS කේන්ද්‍රය</h3>
                  <p className="text-[10px] text-red-300">SOS Live & Red Alert Center</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2 DIRECT BUTTONS: 🚨 රතු එළිය & 📡 SOS LIVE */}
            <div className="space-y-2.5">
              {/* 1. රතු එළිය (RED ALERT) -> Opens Red Alert Creation Page */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenCreateModal?.();
                }}
                className="w-full p-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 rounded-2xl flex items-center justify-between font-black text-xs text-white shadow-lg shadow-red-950/40 border border-red-400/40 active:scale-[0.98] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🚨</span>
                  <div className="text-left">
                    <div className="text-sm font-black tracking-wide">රතු එළිය (RED ALERT)</div>
                    <div className="text-[10px] text-red-100 font-normal">හදිසි ආපදා අනතුරු ඇඟවීමක් පළ කරන්න</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
              </button>

              {/* 2. SOS LIVE -> Opens SOS Live GPS Tracker Page */}
              {onOpenSosTracker && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSosTracker();
                  }}
                  className="w-full p-3.5 bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 hover:from-indigo-600 hover:to-blue-600 rounded-2xl flex items-center justify-between font-black text-xs text-white shadow-lg shadow-blue-950/40 border border-indigo-400/40 active:scale-[0.98] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Radio className="w-6 h-6 text-cyan-300 animate-pulse group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <div className="text-sm font-black tracking-wide">📡 SOS LIVE TRACKER</div>
                      <div className="text-[10px] text-indigo-200 font-normal">සජීවී GPS Tracking සහ ආපදා සහන කේන්ද්‍රය</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-cyan-200 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>

            {/* 📞 හදිසි ආපදා ක්ෂණික ඇමතුම් අංක පෙළ (1-Click Call) */}
            <div className="space-y-2 pt-2 border-t border-zinc-900">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                <span className="flex items-center gap-1">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                  හදිසි ඇමතුම් අංක (Emergency Hotlines):
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {EMERGENCY_HOTLINES.map((hotline) => (
                  <a
                    key={hotline.number}
                    href={`tel:${hotline.number}`}
                    className="p-2 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 rounded-xl flex items-center justify-between gap-1.5 transition-all text-left group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 font-black text-xs text-white">
                        <span>{hotline.icon}</span>
                        <span className="text-emerald-400 group-hover:underline">{hotline.number}</span>
                      </div>
                      <div className="text-[9px] text-zinc-400 truncate leading-tight">
                        {hotline.nameSi}
                      </div>
                    </div>
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>

            {/* ක්‍රියාකාරී ආපදා ලැයිස්තුව */}
            {activeCount > 0 && onOpenActiveList && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenActiveList();
                }}
                className="w-full py-2 bg-red-950/60 border border-red-800/80 rounded-xl text-xs font-black text-red-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>ක්‍රියාකාරී අනතුරු ඇඟවීම් {activeCount} ක් බලන්න</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

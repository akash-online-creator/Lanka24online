import React, { useState, useRef, useEffect } from 'react';
import { 
  AlertTriangle, 
  X, 
  VolumeX, 
  MapPin, 
  Radio, 
  Clock 
} from 'lucide-react';
import { stopEmergencySiren } from '../utils/sirenAudio';

interface RedAlertBannerProps {
  alert: {
    id: string;
    code?: string;
    disasterTitleSi?: string;
    disasterType?: string;
    locationName?: string;
    radiusKm?: number;
    time?: string;
  };
  onDismiss?: (alertId: string) => void;
}

export const RedAlertBanner: React.FC<RedAlertBannerProps> = ({ alert, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isSwiping, setIsSwiping] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [opacity, setOpacity] = useState(1);

  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 1. Siren සහ Vibration නවත්වා Notification එක ඉවත් කිරීමේ ප්‍රධාන Function එක
  const handleDismissAlert = () => {
    // සයිරන් නාදය නවත්වන්න
    try {
      stopEmergencySiren(true);
    } catch (e) {
      console.warn('Siren stop failed:', e);
    }

    // දුරකථනයේ Vibration නවත්වන්න
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(0);
    }

    // Banner එක සැඟවීම
    setIsVisible(false);

    if (onDismiss) {
      onDismiss(alert.id);
    }
  };

  // 2. Touch Gestures හඳුනාගැනීම (Swipe Handling)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartRef.current.x;
    const diffY = currentY - touchStartRef.current.y;

    // උඩට හෝ පැතිවලට පමණක් ගමන් කිරීමට ඉඩ දීම
    if (diffY < 0 || Math.abs(diffX) > 20) {
      setTranslateX(diffX);
      // පහළට නොයන ලෙස උඩට පමණක් සීමා කිරීම (diffY <= 0)
      setTranslateY(diffY < 0 ? diffY : 0);

      // Swipe කරන දුර අනුව ක්‍රමයෙන් මැකී යන ලෙස (fade out) සැකසීම
      const maxDistance = 150;
      const distance = Math.max(Math.abs(diffX), Math.abs(diffY));
      const newOpacity = Math.max(0.2, 1 - distance / maxDistance);
      setOpacity(newOpacity);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);

    const swipeThreshold = 80;

    // උඩට Swipe කළ විට (Swipe Up)
    const isSwipedUp = translateY < -swipeThreshold;
    // වමට හෝ දකුණට Swipe කළ විට (Swipe Left / Right)
    const isSwipedSide = Math.abs(translateX) > swipeThreshold;

    if (isSwipedUp || isSwipedSide) {
      // Swipe වී ඉවතට විසිවීම සඳහා animation අගයන් දී ඉවත් කිරීම
      if (isSwipedUp) setTranslateY(-300);
      if (isSwipedSide) setTranslateX(translateX > 0 ? 400 : -400);
      setOpacity(0);

      setTimeout(() => {
        handleDismissAlert();
      }, 200);
    } else {
      // Threshold එකට වඩා අඩු නම් නැවත මුල් ස්ථානයට පැමිණීම (Reset)
      setTranslateX(0);
      setTranslateY(0);
      setOpacity(1);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-2 left-0 right-0 z-[999] px-3 sm:px-4 pointer-events-none">
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
          opacity: opacity,
          transition: isSwiping ? 'none' : 'transform 0.25s ease-out, opacity 0.25s ease-out',
        }}
        className="pointer-events-auto relative w-full max-w-lg mx-auto bg-gradient-to-r from-red-600 via-rose-700 to-red-700 text-white rounded-3xl p-4 shadow-2xl border-2 border-red-400/40 backdrop-blur-md select-none touch-pan-y"
      >
        {/* ❌ Close බොත්තම (ඉහළ දකුණු කෙළවරේ) */}
        <button
          onClick={handleDismissAlert}
          className="absolute -top-2 -right-2 bg-red-900/90 hover:bg-black text-white p-1.5 rounded-full border border-white/40 shadow-lg active:scale-90 transition-transform"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Ribbon: කේතය සහ සයිරනය නැවැත්වීමේ බොත්තම */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 bg-white text-red-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            <span>රතුවෙලිය: #{alert.code || alert.id.slice(0, 8)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDismissAlert}
              className="flex items-center gap-1.5 bg-red-950/80 hover:bg-black text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-400/40 shadow active:scale-95 transition"
            >
              <VolumeX className="w-3.5 h-3.5 text-amber-400" />
              <span>සයිරනය නවතන්න</span>
            </button>

            {alert.time && (
              <div className="flex items-center gap-1 text-[11px] text-white/80">
                <Clock className="w-3 h-3" />
                <span>{alert.time}</span>
              </div>
            )}
          </div>
        </div>

        {/* ආපදා තොරතුරු */}
        <div className="mt-1">
          <h3 className="text-base font-extrabold tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            {alert.disasterTitleSi || 'හදිසි ආපදා අනතුරු ඇඟවීමක්'}
          </h3>

          <div className="mt-1.5 space-y-0.5 text-xs text-white/95">
            {alert.locationName && (
              <p className="flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                <span>ස්ථානය: {alert.locationName}</span>
              </p>
            )}
            {alert.radiusKm && (
              <p className="flex items-center gap-1 text-white/90">
                <Radio className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>වපසරිය: කි.මී. {alert.radiusKm} ඇතුළත</span>
              </p>
            )}
          </div>
        </div>

        {/* Swipe Hint Indicator */}
        <div className="mt-2.5 pt-1.5 border-t border-white/10 flex justify-center items-center">
          <span className="text-[10px] text-white/60 tracking-wider">
            ↑ උඩට හෝ පැත්තට swipe කර ඉවත් කරන්න
          </span>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useMemo } from 'react';
import { 
  AlertTriangle, 
  X, 
  VolumeX, 
  MapPin, 
  Radio, 
  Clock, 
  ChevronRight,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { stopEmergencySiren } from '../utils/sirenAudio';
import { deleteRedAlertInFirestore, updateRedAlertStatus } from '../lib/firebase';

export interface RedAlertData {
  id: string;
  code?: string;
  alertCode?: string;
  disasterTitleSi?: string;
  disasterType?: string;
  locationName?: string;
  radiusKm?: number;
  time?: string;
  incidentTime?: string;
  createdAt?: string;
  createdAtMs?: number;
  status?: string;
}

interface RedAlertBannerProps {
  alert?: RedAlertData;
  alerts?: RedAlertData[];
  currentUser?: any;
  currentLocation?: any;
  onDismiss?: (alertId: string) => void;
  onOpenAlertDetail?: (alert: RedAlertData) => void;
  onOpenCreate?: () => void;
}

export const RedAlertBanner: React.FC<RedAlertBannerProps> = ({
  alert: singleAlert,
  alerts,
  currentUser,
  onDismiss,
  onOpenAlertDetail,
}) => {
  // සක්‍රීය ඇලර්ට් එක තෝරාගැනීම (status === 'active' පමණක් සලකා බලයි)
  const activeAlert: RedAlertData | null = useMemo(() => {
    if (singleAlert) {
      if ((singleAlert as any).status && (singleAlert as any).status !== 'active') return null;
      return singleAlert;
    }
    if (alerts && alerts.length > 0) {
      const active = alerts.find(a => a && (!(a as any).status || (a as any).status === 'active'));
      return active || null;
    }
    return null;
  }, [singleAlert, alerts]);

  const alertId = activeAlert?.id || '';

  // 🛡️ Dismiss කළ පසු නැවත කිසිදා නොපෙන්වීමට localStorage (Permanent Storage) භාවිතා කිරීම
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('sahaya_dismissed_disaster_alerts');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // පරිශීලකයා මෙම ආපදාව මින්පෙර එක් වරක් හෝ close කර ඇත්දැයි ස්ථිරව පරීක්ෂා කිරීම
  const isDismissed = useMemo(() => {
    if (!alertId) return true;
    if (dismissedAlerts.has(alertId)) return true;
    try {
      if (localStorage.getItem('sahaya_dismissed_alert_' + alertId) === 'true') {
        return true;
      }
      const saved = localStorage.getItem('sahaya_dismissed_disaster_alerts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.includes(alertId)) return true;
      }
    } catch {}
    return false;
  }, [alertId, dismissedAlerts]);

  // Touch Swipe Gesture States
  const [isDragging, setIsDragging] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 1. ඇලර්ට් එක ඉවත් කිරීම, සයිරන් සහ Vibration නැවැත්වීමේ Function එක (Permanent Save)
  const handleDismissAlert = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
    }

    // සයිරන් නාදය නවත්වන්න
    try {
      stopEmergencySiren(true);
    } catch (err) {
      console.warn('Siren stop warning:', err);
    }

    // දුරකථනයේ Vibration නවත්වන්න
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(0);
    }

    if (alertId) {
      setDismissedAlerts((prev) => {
        const next = new Set(prev).add(alertId);
        try {
          localStorage.setItem('sahaya_dismissed_disaster_alerts', JSON.stringify(Array.from(next)));
          localStorage.setItem('sahaya_dismissed_alert_' + alertId, 'true');
        } catch {}
        return next;
      });

      if (onDismiss) {
        onDismiss(alertId);
      }
    }
  };

  // 2. පරිපාලක (Admin) සඳහා Cloud එකෙන් සදහටම මකා දැමීමේ Function එක
  const handleDeleteAlertFromCloud = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!alertId || isDeleting) return;
    const confirmed = window.confirm('මෙම ආපදා නිවේදනය Cloud පද්ධතියෙන් සදහටම මකා දැමීමට ඔබට අවශ්‍යද?');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteRedAlertInFirestore(alertId);
      handleDismissAlert();
    } catch (err) {
      console.warn('Delete alert from cloud failed, resolving instead:', err);
      try {
        await updateRedAlertStatus(alertId, 'resolved', 'Admin resolved & cleared');
        handleDismissAlert();
      } catch (_) {}
    } finally {
      setIsDeleting(false);
    }
  };

  // 3. පරිපාලක (Admin) සඳහා විසඳන ලදී ලෙස සලකුණු කිරීම
  const handleResolveAlert = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!alertId || isDeleting) return;
    setIsDeleting(true);
    try {
      await updateRedAlertStatus(alertId, 'resolved', 'Admin resolved');
      handleDismissAlert();
    } catch (err) {
      console.warn('Resolve alert failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // 4. ඇඟිල්ලෙන් ස්වයිප් කිරීම (Touch Swipe Gestures)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartRef.current.x;
    const diffY = currentY - touchStartRef.current.y;

    // උඩට (Up) හෝ දෙපසට (Left/Right) Swipe කිරීමට ඉඩ දීම
    if (diffY < 10 || Math.abs(diffX) > 15) {
      setTranslateX(diffX);
      setTranslateY(diffY < 0 ? diffY : 0);

      // Swipe කරන දුර අනුව Fade Out වීම
      const distance = Math.max(Math.abs(diffX), Math.abs(diffY));
      const newOpacity = Math.max(0.15, 1 - distance / 180);
      setOpacity(newOpacity);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const swipeThreshold = 70; // Swipe එක තහවුරු වන දුර (pixels)

    const isSwipedUp = translateY < -swipeThreshold;
    const isSwipedSide = Math.abs(translateX) > swipeThreshold;

    if (isSwipedUp || isSwipedSide) {
      // Animation එක සමඟ තිරයෙන් ඉවතට විසිවීම
      if (isSwipedUp) setTranslateY(-300);
      if (isSwipedSide) setTranslateX(translateX > 0 ? 450 : -450);
      setOpacity(0);

      setTimeout(() => {
        handleDismissAlert();
      }, 250);
    } else {
      // Threshold එකට වඩා අඩු නම් නැවත මුල් තැනට පැමිණීම
      setTranslateX(0);
      setTranslateY(0);
      setOpacity(1);
    }
  };

  if (!activeAlert || isDismissed) {
    return null;
  }

  const alertCode = activeAlert.code || activeAlert.alertCode || (alertId ? `#RED-${alertId.slice(0, 4).toUpperCase()}` : '#RED-8777');
  const alertTime = activeAlert.time || activeAlert.incidentTime || 'දැන් (Just now)';
  const isAdmin = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.isAdmin));

  return (
    <aside 
      aria-label="රතු එළිය හදිසි ආපදා අනතුරු ඇඟවීම"
      className="fixed top-2 inset-x-0 z-[9999] px-3 sm:px-4 pointer-events-none transition-all duration-300"
    >
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (onOpenAlertDetail && activeAlert) {
            onOpenAlertDetail(activeAlert);
          }
        }}
        style={{
          transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
          opacity: opacity,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease-out',
        }}
        className="pointer-events-auto relative w-full max-w-lg mx-auto bg-gradient-to-r from-red-600 via-rose-700 to-red-800 text-white rounded-3xl p-4 shadow-[0_12px_40px_rgba(220,38,38,0.55)] border-2 border-red-300/40 backdrop-blur-md select-none touch-none cursor-pointer group active:scale-[0.99] transition-transform"
      >
        {/* ❌ 1. පැහැදිලි CLOSE බොත්තම (Top-Right Corner - පහසුවෙන් ඔබන්න පුළුවන්) */}
        <button
          type="button"
          onClick={handleDismissAlert}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 border border-white/40 text-white flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
          aria-label="ඇලර්ට් එක වසන්න"
          title="මෙම ආපදාව ස්ථිරව වසන්න"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* 2. Header Bar: රතුඑළිය Pill, Time සහ Mute බොත්තම */}
        <div className="flex items-center justify-between gap-2 pr-10 mb-2">
          <div className="flex items-center gap-1.5 bg-white text-red-700 px-3 py-1 rounded-full text-xs font-black shadow-sm shrink-0">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping shrink-0" />
            <span className="tracking-wide">🚨 රතුඑළිය: {alertCode}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                try {
                  stopEmergencySiren(true);
                } catch {}
              }}
              className="hidden sm:flex items-center gap-1 bg-black/30 hover:bg-black/50 text-amber-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-amber-300/30"
              title="සයිරන් නාදය නවත්වන්න"
            >
              <VolumeX className="w-3.5 h-3.5 text-amber-400" />
              <span>Mute</span>
            </button>

            <div className="flex items-center gap-1 text-[11px] text-white/90 font-medium">
              <Clock className="w-3.5 h-3.5 text-white/80" />
              <span>{alertTime}</span>
            </div>
          </div>
        </div>

        {/* 3. ආපදා තොරතුරු */}
        <div className="mt-1">
          <h3 className="text-base sm:text-lg font-black tracking-wide text-white drop-shadow-sm flex items-center gap-1.5">
            <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
            <span>{activeAlert.disasterTitleSi || 'හදිසි ආපදා අනතුරු ඇඟවීමක්'}</span>
          </h3>

          <div className="mt-1.5 space-y-0.5 text-xs text-white/95">
            {activeAlert.locationName && (
              <p className="flex items-start gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                <span className="line-clamp-1">ස්ථානය: {activeAlert.locationName}</span>
              </p>
            )}

            <p className="flex items-center gap-1 text-white/90 font-medium">
              <Radio className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>වපසරිය: කි.මී. {activeAlert.radiusKm || 5} ඇතුළත</span>
            </p>
          </div>
        </div>

        {/* 🛡️ 4. පරිපාලක (Admin) සඳහා සෘජු Cloud Controls */}
        {isAdmin && (
          <div className="mt-2.5 pt-2 border-t border-white/20 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
              🛡️ පරිපාලක පාලනය (Admin Action):
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleResolveAlert}
                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition-all active:scale-95 shadow-sm flex items-center gap-1"
                title="මෙම ආපදාව විසඳන ලද බව සලකුණු කර ඉවත් කරන්න"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>විසඳන ලදී</span>
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAlertFromCloud}
                className="px-2.5 py-1 rounded-xl bg-black/60 hover:bg-black text-rose-300 hover:text-white text-[11px] font-bold cursor-pointer transition-all active:scale-95 border border-rose-400/40 shadow-sm flex items-center gap-1"
                title="මෙම ආපදාව Cloud එකෙන් සදහටම මකා දමන්න"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Cloud එකෙන් මකන්න</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. Swipe Hint Indicator */}
        <div className="mt-2.5 pt-1.5 border-t border-white/15 flex items-center justify-between text-[10px] text-white/75 font-medium">
          <span>👆 උඩට හෝ පැත්තට swipe කර ඉවත් කරන්න</span>
          <span className="flex items-center gap-0.5 text-amber-200 font-bold group-hover:translate-x-0.5 transition-transform">
            <span>විස්තර</span>
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </aside>
  );
};

export default RedAlertBanner;


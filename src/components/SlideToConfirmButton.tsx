import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronsRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface SlideToConfirmButtonProps {
  id?: string;
  onConfirm: () => Promise<void> | void;
  isCompleted?: boolean;
  label?: string;
  completedLabel?: string;
  disabled?: boolean;
}

export const SlideToConfirmButton: React.FC<SlideToConfirmButtonProps> = ({
  id = 'slide-to-confirm-btn',
  onConfirm,
  isCompleted = false,
  label = 'සහය ලබාදී අවසන් බව තහවුරු කිරීමට අදින්න',
  completedLabel = 'සහය සාර්ථකව ලබාදී අවසන් කරන ලදී! ✓',
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(isCompleted);

  // Sync internal state if prop changes
  useEffect(() => {
    setConfirmed(isCompleted);
  }, [isCompleted]);

  const maxDragRef = useRef(0);

  const updateMaxDrag = useCallback(() => {
    if (containerRef.current && handleRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const handleWidth = handleRef.current.clientWidth;
      maxDragRef.current = Math.max(0, containerWidth - handleWidth - 6); // 6px padding
    }
  }, []);

  useEffect(() => {
    updateMaxDrag();
    window.addEventListener('resize', updateMaxDrag);
    return () => window.removeEventListener('resize', updateMaxDrag);
  }, [updateMaxDrag]);

  // Handle successful confirmation
  const handleSuccess = async () => {
    if (isLoading || confirmed || disabled) return;
    setIsLoading(true);
    
    // Light haptic feedback if supported by browser/device
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate([40, 60, 80]);
      } catch {
        // ignore
      }
    }

    try {
      await onConfirm();
      setConfirmed(true);
    } catch (err) {
      console.error('Slide confirm error:', err);
      // spring back on error
      setDragX(0);
    } finally {
      setIsLoading(false);
      setIsDragging(false);
    }
  };

  // Mouse drag handling
  const startDragXRef = useRef(0);
  const initialDragXRef = useRef(0);

  const handlePointerDown = (clientX: number) => {
    if (confirmed || isLoading || disabled) return;
    updateMaxDrag();
    setIsDragging(true);
    startDragXRef.current = clientX;
    initialDragXRef.current = dragX;
  };

  const handlePointerMove = useCallback((clientX: number) => {
    if (!isDragging || confirmed || isLoading || disabled) return;
    const delta = clientX - startDragXRef.current;
    const newX = Math.min(Math.max(0, initialDragXRef.current + delta), maxDragRef.current);
    setDragX(newX);

    // If reached over 85% threshold, trigger confirmation
    if (maxDragRef.current > 0 && newX >= maxDragRef.current * 0.85) {
      setDragX(maxDragRef.current);
      setIsDragging(false);
      handleSuccess();
    }
  }, [isDragging, confirmed, isLoading, disabled]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging || confirmed || isLoading) return;
    setIsDragging(false);

    // If not reached completion threshold, spring back smoothly
    if (maxDragRef.current > 0 && dragX < maxDragRef.current * 0.85) {
      setDragX(0);
    }
  }, [isDragging, confirmed, isLoading, dragX]);

  // Global window listeners when mouse/touch is active
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX);
    };
    const onMouseUp = () => {
      handlePointerUp();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX);
      }
    };
    const onTouchEnd = () => {
      handlePointerUp();
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd);
      window.addEventListener('touchcancel', onTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Calculate progress percentage
  const progressRatio = maxDragRef.current > 0 ? dragX / maxDragRef.current : 0;

  if (confirmed) {
    return (
      <div
        id={id}
        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md border-2 border-emerald-400/40 animate-fadeIn select-none"
      >
        <CheckCircle2 className="w-5 h-5 text-amber-300 animate-bounce" />
        <span className="leading-tight">{completedLabel}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 w-full select-none">
      <div
        id={id}
        ref={containerRef}
        className={`relative w-full h-13 rounded-2xl p-1 flex items-center overflow-hidden border-2 transition-all ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 opacity-60 cursor-not-allowed'
            : 'bg-emerald-950/10 dark:bg-emerald-950/40 border-emerald-500/50 hover:border-emerald-500 shadow-inner'
        }`}
      >
        {/* Progress Background Fill that follows drag */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl transition-all duration-75 opacity-85"
          style={{
            width: maxDragRef.current > 0 ? `${dragX + 50}px` : '0px',
            transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {/* Shimmering Center Prompt Text */}
        <div
          className="absolute inset-0 flex items-center justify-center px-12 pointer-events-none text-center transition-opacity"
          style={{
            opacity: Math.max(0.1, 1 - progressRatio * 1.5),
          }}
        >
          <span className="text-xs sm:text-xs font-black text-emerald-900 dark:text-emerald-200 tracking-wide flex items-center justify-center gap-1.5 drop-shadow-xs">
            <span>{label}</span>
            <ChevronsRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse shrink-0" />
          </span>
        </div>

        {/* Drag Handle / Thumb */}
        <div
          ref={handleRef}
          onMouseDown={(e) => {
            e.preventDefault();
            handlePointerDown(e.clientX);
          }}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              handlePointerDown(e.touches[0].clientX);
            }
          }}
          style={{
            transform: `translateX(${dragX}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className={`relative z-10 w-11 h-11 rounded-xl flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing transition-colors shrink-0 ${
            isLoading
              ? 'bg-amber-400 text-slate-950'
              : progressRatio > 0.6
              ? 'bg-amber-400 text-slate-950 shadow-amber-400/50'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/40 border border-emerald-300/40'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : progressRatio > 0.6 ? (
            <Sparkles className="w-5 h-5 animate-spin" />
          ) : (
            <ChevronsRight className="w-5 h-5 font-black" />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1 font-medium">
        <span>👈 ආරම්භය</span>
        <span className="text-emerald-700 dark:text-emerald-400 font-bold">ස්වයිප් කරන්න 👉</span>
      </div>
    </div>
  );
};

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface RedAlertFloatingTriggerProps {
  onOpenCreate: () => void;
  activeCount?: number;
  onOpenActiveList?: () => void;
}

export const RedAlertFloatingTrigger: React.FC<RedAlertFloatingTriggerProps> = ({
  onOpenCreate,
  activeCount = 0,
  onOpenActiveList,
}) => {
  return (
    <div className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2">
      {activeCount > 0 && onOpenActiveList && (
        <button
          type="button"
          onClick={onOpenActiveList}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/80 hover:bg-black text-white text-xs font-black border border-red-500/50 shadow-lg backdrop-blur-md cursor-pointer active:scale-95 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>ක්‍රියාකාරී ආපදා ({activeCount})</span>
        </button>
      )}

      {/* Main High-Priority 1-Tap Trigger Button */}
      <button
        type="button"
        onClick={onOpenCreate}
        className="group relative flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-black text-xs sm:text-sm tracking-wide shadow-[0_0_30px_rgba(239,68,68,0.7)] hover:shadow-[0_0_40px_rgba(239,68,68,0.9)] hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-red-400"
        title="රතු එළිය - හදිසි ආපදා ෂණිකව දැනුම්දෙන්න"
      >
        {/* Pulsing Beacon Ripple Rings */}
        <span className="absolute -inset-1 rounded-full bg-red-500/40 animate-ping pointer-events-none" />
        <span className="absolute -inset-2 rounded-full bg-rose-500/20 animate-pulse pointer-events-none" />

        <div className="relative flex items-center justify-center text-lg sm:text-xl">
          🚨
        </div>
        <div className="flex flex-col items-start leading-none relative z-10">
          <span className="font-black drop-shadow-xs">රතු එළිය</span>
          <span className="text-[9px] text-red-100 font-bold uppercase tracking-wider">
            RED ALERT
          </span>
        </div>

        {activeCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white text-red-700 text-[10px] font-black shadow-xs">
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );
};

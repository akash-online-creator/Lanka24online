import React from 'react';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  tiltEffect?: boolean;
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  className = '',
  glowColor = 'rgba(59, 130, 246, 0.08)',
  tiltEffect = true,
}) => {
  return (
    <div className="w-full flex justify-center">
      <div
        className={`relative rounded-[28px] sm:rounded-[36px] border-2 border-emerald-500/25 bg-white dark:bg-[#07130c] p-5 sm:p-8 shadow-[0_12px_30px_rgba(0,122,75,0.06),0_2px_8px_rgba(0,0,0,0.03)] text-slate-900 dark:text-slate-100 transition-all duration-200 ${
          tiltEffect ? 'hover:shadow-[0_20px_40px_rgba(0,122,75,0.12),0_4px_16px_rgba(0,0,0,0.05)] hover:-translate-y-0.5' : ''
        } ${className}`}
      >
        {/* Ambient Top Glow Layer */}
        <div
          className="absolute inset-0 rounded-[28px] sm:rounded-[36px] pointer-events-none transition-opacity duration-300 opacity-40"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${glowColor}, transparent 70%)`,
          }}
        />
        <div className="relative z-10 w-full">
          {children}
        </div>
      </div>
    </div>
  );
};


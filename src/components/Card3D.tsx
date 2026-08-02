import React, { useState } from 'react';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  tiltEffect?: boolean;
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  className = '',
  glowColor = 'rgba(59, 130, 246, 0.1)',
  tiltEffect = true,
}) => {
  const [transform, setTransform] = useState('rotateX(0deg) rotateY(0deg)');
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tiltEffect) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((centerY - y) / centerY) * 5; // Slight tilt X
    const rotateY = ((x - centerX) / centerX) * 5; // Slight tilt Y

    setTransform(`rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`);
  };

  const handleMouseLeave = () => {
    if (!tiltEffect) return;
    setIsHovered(false);
    setTransform('rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  };

  return (
    <div className="perspective-1000 w-full flex justify-center">
      <div
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          transform,
          transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out',
        }}
        className={`transform-style-3d relative rounded-[32px] sm:rounded-[40px] border border-white/10 dark:border-white/10 light:border-slate-300 bg-slate-900/90 dark:bg-slate-900/90 light:bg-white/95 backdrop-blur-xl p-6 sm:p-10 shadow-[0_40px_80px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all ${className}`}
      >
        {/* Ambient Top Glow Layer */}
        <div
          className="absolute inset-0 rounded-[32px] sm:rounded-[40px] pointer-events-none transition-opacity duration-500 opacity-70"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${glowColor}, transparent 70%)`,
          }}
        />
        {children}
      </div>
    </div>
  );
};

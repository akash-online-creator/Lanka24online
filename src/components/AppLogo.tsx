import React from 'react';
import sahanaLogoImg from '../assets/images/sahana_sewa_logo_1785907235127.jpg';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero' | number;
  className?: string;
  showGlow?: boolean;
  withBorder?: boolean;
  animated?: boolean;
  altText?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  className = '',
  showGlow = false,
  withBorder = true,
  animated = false,
  altText = 'සහය සේවා - සැමට පිහිට (Sahaya Sewa Logo)',
}) => {
  // Determine pixel / dimension classes
  let sizeClasses = 'w-14 h-14'; // default md
  let customStyle: React.CSSProperties = {};

  if (typeof size === 'number') {
    customStyle = { width: `${size}px`, height: `${size}px` };
    sizeClasses = '';
  } else {
    switch (size) {
      case 'xs':
        sizeClasses = 'w-8 h-8';
        break;
      case 'sm':
        sizeClasses = 'w-10 h-10 sm:w-12 sm:h-12';
        break;
      case 'md':
        sizeClasses = 'w-16 h-16 sm:w-18 sm:h-18';
        break;
      case 'lg':
        sizeClasses = 'w-24 h-24 sm:w-28 sm:h-28';
        break;
      case 'xl':
        sizeClasses = 'w-32 h-32 sm:w-36 sm:h-36';
        break;
      case '2xl':
        sizeClasses = 'w-36 h-36 sm:w-44 sm:h-44';
        break;
      case 'hero':
        sizeClasses = 'w-44 h-44 sm:w-52 sm:h-52';
        break;
    }
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 select-none ${sizeClasses} ${className} ${
        showGlow ? 'shadow-[0_0_35px_rgba(230,126,34,0.45)] dark:shadow-[0_0_40px_rgba(16,185,129,0.35)]' : 'shadow-md'
      }`}
      style={customStyle}
    >
      {/* Outer rich glow ring */}
      {showGlow && (
        <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-amber-500/40 via-emerald-500/30 to-teal-400/40 blur-lg pointer-events-none -z-10 animate-pulse" />
      )}

      {/* Main Circular Logo Container with 3D Ring Border */}
      <div
        className={`relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-white dark:bg-[#07130c] ${
          withBorder
            ? 'ring-3 ring-amber-500/80 dark:ring-amber-400/80 border-2 border-white dark:border-emerald-950 shadow-xl'
            : ''
        } ${animated ? 'transition-transform duration-300 hover:scale-105 active:scale-95' : ''}`}
      >
        <img
          src={sahanaLogoImg}
          alt={altText}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center rounded-full"
          loading="eager"
        />

        {/* Glass reflection overlay highlight */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 via-transparent to-black/25 pointer-events-none" />
      </div>
    </div>
  );
};

export default AppLogo;

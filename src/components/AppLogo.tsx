import React from 'react';
import sahanaLogoImg from '../assets/images/sahana_sewa_logo_1785907235127.jpg';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
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
  altText = 'සහන සේවා - සැමට පිහිට (Sahana Sewa Logo)',
}) => {
  // Determine pixel / dimension classes
  let sizeClasses = 'w-10 h-10'; // default md
  let customStyle: React.CSSProperties = {};

  if (typeof size === 'number') {
    customStyle = { width: `${size}px`, height: `${size}px` };
    sizeClasses = '';
  } else {
    switch (size) {
      case 'xs':
        sizeClasses = 'w-6 h-6';
        break;
      case 'sm':
        sizeClasses = 'w-8 h-8';
        break;
      case 'md':
        sizeClasses = 'w-11 h-11';
        break;
      case 'lg':
        sizeClasses = 'w-20 h-20 sm:w-24 sm:h-24';
        break;
      case 'xl':
        sizeClasses = 'w-28 h-28 sm:w-32 sm:h-32';
        break;
      case '2xl':
        sizeClasses = 'w-36 h-36 sm:w-40 sm:h-40';
        break;
    }
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 select-none ${sizeClasses} ${className} ${
        showGlow ? 'shadow-[0_0_25px_rgba(230,126,34,0.35)]' : 'shadow-md'
      }`}
      style={customStyle}
    >
      {/* Outer subtle glow ring */}
      {showGlow && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/30 to-emerald-500/30 blur-md pointer-events-none -z-10 animate-pulse" />
      )}

      {/* Main Circular Logo Container with 3D Ring Border */}
      <div
        className={`relative w-full h-full rounded-full overflow-hidden flex items-center justify-center ${
          withBorder
            ? 'ring-2 ring-amber-500/60 dark:ring-amber-400/70 shadow-inner'
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

        {/* Subtle glass reflection overlay highlight */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 via-transparent to-black/20 pointer-events-none" />
      </div>
    </div>
  );
};

export default AppLogo;

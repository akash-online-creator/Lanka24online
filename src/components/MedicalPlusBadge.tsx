import React from 'react';
import medicalBadgeImg from '../assets/images/medical_plus_badge_1785917275172.jpg';

interface MedicalPlusBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  className?: string;
  showGlow?: boolean;
  animated?: boolean;
  altText?: string;
  useImage?: boolean;
}

export const MedicalPlusBadge: React.FC<MedicalPlusBadgeProps> = ({
  size = 'md',
  className = '',
  showGlow = true,
  animated = true,
  altText = 'Medical Relief Plus 3D Badge',
  useImage = true,
}) => {
  // Determine pixel / dimension classes
  let sizeClasses = 'w-12 h-12';
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
        sizeClasses = 'w-12 h-12';
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
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${sizeClasses} ${className}`}
      style={customStyle}
    >
      {/* 3D Ambient Glow */}
      {showGlow && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500/30 to-emerald-500/25 blur-md pointer-events-none -z-10 animate-pulse" />
      )}

      {/* Main 3D Badge Circular Card */}
      <div
        className={`relative w-full h-full rounded-full overflow-hidden flex items-center justify-center shadow-[0_8px_20px_rgba(184,12,94,0.22)] ${
          animated ? 'transition-transform duration-300 hover:scale-105 active:scale-95' : ''
        }`}
      >
        {useImage && medicalBadgeImg ? (
          <img
            src={medicalBadgeImg}
            alt={altText}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center rounded-full"
            loading="eager"
          />
        ) : (
          /* High-Fidelity SVG Recreation of User's Exact Badge */
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full drop-shadow-md"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Deep Magenta Rim */}
            <circle cx="100" cy="100" r="95" fill="#c01569" />
            <circle cx="100" cy="100" r="88" fill="#ffffff" />

            {/* Dashed Orbit Ring */}
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#c01569"
              strokeWidth="2.5"
              strokeDasharray="5,4"
            />

            {/* Pink Middle Ring */}
            <circle cx="100" cy="100" r="70" fill="#f498c0" />
            <circle cx="100" cy="100" r="58" fill="#ffffff" />

            {/* Tech notch arc on outer border */}
            <path
              d="M 35 45 A 90 90 0 0 1 100 10"
              fill="none"
              stroke="#98074f"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M 165 155 A 90 90 0 0 1 100 190"
              fill="none"
              stroke="#98074f"
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* Little Sparkle Stars / Dots */}
            <g fill="#c01569">
              {/* Star Top */}
              <path d="M 100 24 L 102 30 L 108 32 L 102 34 L 100 40 L 98 34 L 92 32 L 98 30 Z" />
              {/* Star Right */}
              <path d="M 168 96 L 170 100 L 176 102 L 170 104 L 168 108 L 166 104 L 160 102 L 166 100 Z" />
              {/* Star Left */}
              <path d="M 32 96 L 34 100 L 40 102 L 34 104 L 32 108 L 30 104 L 24 102 L 30 100 Z" />
              {/* Star Bottom */}
              <path d="M 100 162 L 102 166 L 108 168 L 102 170 L 100 176 L 98 170 L 92 168 L 98 166 Z" />
              {/* Accent Dots */}
              <circle cx="70" cy="40" r="2.5" />
              <circle cx="130" cy="40" r="2.5" />
              <circle cx="50" cy="80" r="2.5" />
              <circle cx="150" cy="80" r="2.5" />
              <circle cx="50" cy="120" r="2.5" />
              <circle cx="150" cy="120" r="2.5" />
              <circle cx="70" cy="160" r="2.5" />
              <circle cx="130" cy="160" r="2.5" />
            </g>

            {/* Central Solid Green Plus Cross */}
            <rect x="86" y="55" width="28" height="90" rx="4" fill="#438a2c" />
            <rect x="55" y="86" width="90" height="28" rx="4" fill="#438a2c" />

            {/* 3D highlight on Plus Sign */}
            <path
              d="M 88 57 L 112 57 L 112 88 L 143 88 L 143 112 L 112 112 L 112 143 L 88 143 Z"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeOpacity="0.4"
            />
          </svg>
        )}

        {/* 3D Glass / Gloss Reflection Overlay */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 via-transparent to-black/25 pointer-events-none" />
      </div>
    </div>
  );
};

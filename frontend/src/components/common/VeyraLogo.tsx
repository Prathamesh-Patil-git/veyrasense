import React from 'react';
import { Link } from 'react-router-dom';

interface VeyraLogoProps {
  className?: string;
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const VeyraLogo: React.FC<VeyraLogoProps> = ({
  className = '',
  variant = 'dark',
  size = 'md',
  showTagline = false,
}) => {
  const isLight = variant === 'light';
  const sizeMap = {
    sm: { icon: 28, text: 'text-lg', tag: 'text-[9px]' },
    md: { icon: 36, text: 'text-xl', tag: 'text-[10px]' },
    lg: { icon: 46, text: 'text-2xl', tag: 'text-xs' },
  };

  const { icon, text, tag } = sizeMap[size];

  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD21C] rounded-lg transition-opacity hover:opacity-95 ${className}`}
      aria-label="VeyraSense Home"
    >
      {/* Sensor / Waveform Precision Symbol */}
      <div
        className="relative flex items-center justify-center rounded-xl shadow-xs overflow-hidden"
        style={{
          width: icon,
          height: icon,
          background: isLight ? '#FFFFFF' : '#172238',
          border: isLight ? '1px solid rgba(255,255,255,0.2)' : '1px solid #1E2D4A',
        }}
      >
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1.5"
          aria-hidden="true"
        >
          {/* Concentric sensor calibration grid */}
          <circle cx="18" cy="18" r="14" stroke={isLight ? '#E2E8F0' : '#2A3B5C'} strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="18" cy="18" r="9" stroke={isLight ? '#CBD5E1' : '#334870'} strokeWidth="1" />
          
          {/* Sensor measurement waveform pulse */}
          <path
            d="M6 18H11L14 11L18 25L22 13L25 18H30"
            stroke="#FFD21C"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Active node indicator */}
          <circle cx="18" cy="25" r="2.2" fill="#78E9AD" />
          <circle cx="14" cy="11" r="1.8" fill="#5BA4F5" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`font-bold tracking-tight font-sans leading-none ${text} ${
            isLight ? 'text-white' : 'text-[#172238]'
          }`}
        >
          Veyra<span className="text-[#FFD21C]">Sense</span>
        </span>
        {showTagline && (
          <span
            className={`font-medium tracking-wide uppercase mt-1 ${tag} ${
              isLight ? 'text-slate-300' : 'text-[#718096]'
            }`}
          >
            Sensor Reliability Platform
          </span>
        )}
      </div>
    </Link>
  );
};

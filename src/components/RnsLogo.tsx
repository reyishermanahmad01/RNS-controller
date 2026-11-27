import React from 'react';

interface RnsLogoProps {
  className?: string;
}

export const RnsLogo: React.FC<RnsLogoProps> = ({ className = 'w-8 h-8' }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rnsBadgeRim" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="55%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient id="rnsWingMain" x1="12" y1="24" x2="52" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>

      {/* High-contrast dark squircle badge with glowing RNS rim */}
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="16"
        fill="#0F172A"
        stroke="url(#rnsBadgeRim)"
        strokeWidth="2.6"
      />

      {/* Crisp 3-Point Cyan Crown */}
      <path
        d="M21 21L23.5 13L32 18L40.5 13L43 21H21Z"
        stroke="#22D3EE"
        strokeWidth="2.8"
        strokeLinejoin="round"
        fill="#22D3EE"
        fillOpacity="0.22"
      />

      {/* Primary Upper Chevron Wing */}
      <path
        d="M12 25.5L32 36L52 25.5L46.5 31.5L32 39.5L17.5 31.5L12 25.5Z"
        fill="url(#rnsWingMain)"
      />

      {/* Secondary Lower Chevron */}
      <path
        d="M19 37L32 44.5L45 37L41 41.5L32 47L23 41.5L19 37Z"
        fill="#EC4899"
      />

      {/* Bottom RNS Core Accent */}
      <path
        d="M26.5 48.5L32 52L37.5 48.5L32 55L26.5 48.5Z"
        fill="#F472B6"
      />
    </svg>
  );
};

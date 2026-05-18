/**
 * TrishoolSVG — Precise Shiva Trishul head, horizontal, pointing RIGHT.
 * Thick pointed leaf-blade prongs (NOT hooks/C-shapes).
 * Rich dark amber with fiery glow.
 */
import React from 'react';

const TrishoolSVG = ({ width = 90, height = 40, className = '' }) => {
  const uid = React.useId?.() || 'ts';
  const ids = { b: `${uid}-b`, d: `${uid}-d`, t: `${uid}-t`, g: `${uid}-g` };

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 220 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 1px 8px rgba(234,88,12,0.9)) drop-shadow(0 0 16px rgba(249,115,22,0.4))' }}
    >
      <defs>
        <linearGradient id={ids.b} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#78350F" />
          <stop offset="25%" stopColor="#92400E" />
          <stop offset="50%" stopColor="#B45309" />
          <stop offset="75%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id={ids.d} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="40%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
        <linearGradient id={ids.t} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>
        <filter id={ids.g} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="bl" />
          <feColorMatrix in="bl" type="matrix"
            values="1 0 0 0 0.8  0 0.5 0 0 0.2  0 0 0.2 0 0  0 0 0 0.65 0" result="gl" />
          <feMerge><feMergeNode in="gl" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <g filter={`url(#${ids.g})`}>
        {/* SHAFT */}
        <rect x="0" y="61" width="52" height="8" rx="4" fill={`url(#${ids.b})`} />
        <rect x="3" y="62" width="46" height="2" rx="1" fill="rgba(253,230,138,0.15)" />

        {/* JUNCTION */}
        <ellipse cx="52" cy="65" rx="7" ry="16" fill={`url(#${ids.d})`} />
        <ellipse cx="52" cy="65" rx="4" ry="11" fill="#92400E" opacity="0.5" />

        {/* CENTER PRONG — thick tapered blade */}
        <path d="M 58 52 C 85 50, 145 54, 194 62 L 205 65 L 194 68 C 145 76, 85 80, 58 78 Z" fill={`url(#${ids.b})`} />
        <path d="M 62 53 C 90 51, 148 55, 196 63 L 194 64 C 146 56, 88 53, 62 55 Z" fill="rgba(253,230,138,0.18)" />

        {/* TOP PRONG — thick pointed blade going UP-RIGHT (not a C/hook) */}
        <path
          d="M 54 44 C 52 22, 78 4, 138 2 L 132 14 C 80 18, 56 34, 56 52 Z"
          fill={`url(#${ids.d})`}
        />
        <path d="M 134 4 L 138 2 L 134 10 Z" fill={`url(#${ids.t})`} />
        <path d="M 54 42 C 52 24, 76 6, 130 4 L 128 8 C 76 10, 54 26, 55 42 Z" fill="rgba(253,230,138,0.15)" />

        {/* BOTTOM PRONG — mirror, thick pointed blade going DOWN-RIGHT */}
        <path
          d="M 54 86 C 52 108, 78 126, 138 128 L 132 116 C 80 112, 56 96, 56 78 Z"
          fill={`url(#${ids.d})`}
        />
        <path d="M 134 126 L 138 128 L 134 120 Z" fill={`url(#${ids.t})`} />
        <path d="M 54 88 C 52 106, 76 124, 130 126 L 128 122 C 76 120, 54 104, 55 88 Z" fill="rgba(253,230,138,0.15)" />

        {/* Decorative crescents */}
        <path d="M 58 50 Q 66 46, 72 50 Q 66 52, 60 54 Z" fill="#D97706" opacity="0.5" />
        <path d="M 58 80 Q 66 84, 72 80 Q 66 78, 60 76 Z" fill="#D97706" opacity="0.5" />
      </g>
    </svg>
  );
};

export default TrishoolSVG;

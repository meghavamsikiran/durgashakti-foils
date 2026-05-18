/**
 * TrishoolSVG — A cinematic horizontal Trishul (trident) pointing RIGHT.
 *
 * Matches the reference: horizontal spear with three prongs on the right,
 * center prong longest/sharpest, top & bottom prongs curving outward.
 * Metallic saffron-gold with divine glow — looks like a flying divine weapon.
 */
import React from 'react';

const TrishoolSVG = ({ width = 80, height = 50, className = '' }) => {
  // Unique IDs to avoid SVG gradient conflicts when multiple instances exist
  const uid = React.useId?.() || 'tsvg';
  const ids = {
    metal: `${uid}-metal`,
    gold: `${uid}-gold`,
    glow: `${uid}-glow`,
    bright: `${uid}-bright`,
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 160 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 0 6px rgba(251,146,60,0.8))' }}
    >
      <defs>
        {/* Main saffron-to-deep metallic gradient (left to right) */}
        <linearGradient id={ids.metal} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="70%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>

        {/* Gold edge highlight */}
        <linearGradient id={ids.gold} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>

        {/* Bright tip */}
        <linearGradient id={ids.bright} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#FFF7ED" />
        </linearGradient>

        {/* Outer glow filter */}
        <filter id={ids.glow} x="-20%" y="-30%" width="140%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
          <feColorMatrix in="blur" type="matrix"
            values="1 0 0 0 0.95
                    0 1 0 0 0.55
                    0 0 1 0 0.1
                    0 0 0 0.6 0" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${ids.glow})`}>

        {/* ══════ SHAFT — long horizontal handle on the left ══════ */}
        <rect x="2" y="37" width="95" height="6" rx="3" fill={`url(#${ids.metal})`} />
        {/* Shaft top highlight */}
        <rect x="6" y="37.5" width="88" height="2" rx="1" fill="rgba(255,255,255,0.25)" />

        {/* ══════ JUNCTION BAND — decorative ring ══════ */}
        <rect x="92" y="30" width="8" height="20" rx="3" fill={`url(#${ids.gold})`} />
        <rect x="94" y="32" width="4" height="16" rx="2" fill="#FBBF24" opacity="0.5" />

        {/* ══════ CENTER PRONG — longest, pointing right ══════ */}
        <path
          d="M100 36 L100 44 L148 42 L156 40 L148 38 Z"
          fill={`url(#${ids.metal})`}
        />
        {/* Center prong sharp tip */}
        <path
          d="M148 38 L156 40 L148 42 L150 40 Z"
          fill={`url(#${ids.bright})`}
        />
        {/* Center prong top highlight */}
        <path
          d="M100 36.5 L146 38.5 L100 37.5 Z"
          fill="rgba(255,255,255,0.3)"
        />

        {/* ══════ TOP PRONG — curves upward-right ══════ */}
        <path
          d="M98 32
             Q104 28, 110 22
             Q116 14, 124 8
             L130 4
             L126 10
             Q120 16, 114 22
             Q108 28, 102 32
             Z"
          fill={`url(#${ids.metal})`}
        />
        {/* Top prong tip */}
        <path
          d="M126 6 L130 4 L128 9 L126 7 Z"
          fill={`url(#${ids.bright})`}
        />
        {/* Top prong inner edge */}
        <path
          d="M100 31
             Q106 26, 112 20
             Q118 12, 126 7
             L124 11
             Q118 16, 113 21
             Q107 27, 102 31
             Z"
          fill="rgba(255,255,255,0.15)"
        />

        {/* ══════ BOTTOM PRONG — curves downward-right (mirror) ══════ */}
        <path
          d="M98 48
             Q104 52, 110 58
             Q116 66, 124 72
             L130 76
             L126 70
             Q120 64, 114 58
             Q108 52, 102 48
             Z"
          fill={`url(#${ids.metal})`}
        />
        {/* Bottom prong tip */}
        <path
          d="M126 73 L130 76 L128 71 L126 73 Z"
          fill={`url(#${ids.bright})`}
        />
        {/* Bottom prong inner edge */}
        <path
          d="M100 49
             Q106 54, 112 60
             Q118 68, 126 73
             L124 69
             Q118 64, 113 59
             Q107 53, 102 49
             Z"
          fill="rgba(255,255,255,0.15)"
        />

        {/* ══════ SMALL CRESCENT between prongs ══════ */}
        <path
          d="M104 36 Q110 33 116 36 Q112 38 108 38 Q104 38 104 36Z"
          fill="#FDE68A"
          opacity="0.6"
        />
        <path
          d="M104 44 Q110 47 116 44 Q112 42 108 42 Q104 42 104 44Z"
          fill="#FDE68A"
          opacity="0.6"
        />
      </g>
    </svg>
  );
};

export default TrishoolSVG;

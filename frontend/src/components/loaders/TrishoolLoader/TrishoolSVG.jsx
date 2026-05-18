/**
 * TrishoolSVG — Authentic Shiva Trishul matching reference exactly.
 *
 * Shape: Heart-silhouette trishul pointing RIGHT.
 * - Center prong: wide triangular arrowhead
 * - Side prongs: thick lobes that curve OUT then sweep INWARD toward
 *   the center prong (forming the two halves of a heart shape)
 * - Bright gold outline on all edges for 3D metallic embossed look
 * - Rich warm orange body, NOT yellow
 */
import React from 'react';

const TrishoolSVG = ({ width = 80, height = 38, className = '' }) => {
  const uid = React.useId?.() || 'ts';
  const ids = {
    body: `${uid}-body`,
    dark: `${uid}-dark`,
    outline: `${uid}-outline`,
    glow: `${uid}-glow`,
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 0 6px rgba(234,88,12,0.85)) drop-shadow(0 0 14px rgba(249,115,22,0.4))' }}
    >
      <defs>
        {/* Rich warm orange body gradient */}
        <linearGradient id={ids.body} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="35%" stopColor="#D97706" />
          <stop offset="65%" stopColor="#E8930B" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>

        {/* Darker gradient for depth on side prongs */}
        <linearGradient id={ids.dark} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E8930B" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* Bright gold for outline */}
        <linearGradient id={ids.outline} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="50%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#FFFBEB" />
        </linearGradient>

        {/* Fiery glow filter */}
        <filter id={ids.glow} x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="b" />
          <feColorMatrix in="b" type="matrix"
            values="1 0 0 0 0.75
                    0 0.45 0 0 0.15
                    0 0 0.15 0 0
                    0 0 0 0.5 0" result="g" />
          <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <g filter={`url(#${ids.glow})`}>

        {/* ═══════════ SHAFT (handle) ═══════════ */}
        <rect x="2" y="66" width="32" height="8" rx="4" fill={`url(#${ids.body})`}
          stroke={`url(#${ids.outline})`} strokeWidth="1.5" />
        {/* Shaft ridges */}
        <rect x="28" y="62" width="5" height="16" rx="2" fill="#D97706"
          stroke="#FBBF24" strokeWidth="1" />
        <rect x="22" y="64" width="3" height="12" rx="1.5" fill="#B45309"
          stroke="#FBBF24" strokeWidth="0.8" />

        {/* ═══════════ CENTER PRONG — wide triangular arrowhead ═══════════
            Concave edges for that sleek spearhead look. */}
        <path
          d={`
            M 50 48
            C 75 52, 130 58, 188 68
            L 194 70
            L 188 72
            C 130 82, 75 88, 50 92
            Z
          `}
          fill={`url(#${ids.body})`}
          stroke={`url(#${ids.outline})`}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Center prong spine highlight */}
        <path d="M 55 70 L 185 70" stroke="rgba(253,230,138,0.25)" strokeWidth="1.5" />

        {/* ═══════════ TOP PRONG — thick lobe curving OUT then INWARD ═══════════
            Forms top half of heart shape. Starts at junction, sweeps UP,
            curves RIGHT-DOWN, tip ends near center prong base. */}
        <path
          d={`
            M 42 56
            C 36 28, 54 4, 88 -2
            C 116 -6, 142 6, 140 32
            C 139 46, 126 52, 110 50
            L 50 48
            C 50 46, 48 40, 50 36
            C 54 22, 68 8, 92 6
            C 110 4, 126 14, 126 32
            C 126 40, 118 46, 108 46
            L 50 48
            Z
          `}
          fill={`url(#${ids.dark})`}
          stroke={`url(#${ids.outline})`}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* ═══════════ BOTTOM PRONG — mirror of top, thick lobe ═══════════
            Forms bottom half of heart shape. */}
        <path
          d={`
            M 42 84
            C 36 112, 54 136, 88 142
            C 116 146, 142 134, 140 108
            C 139 94, 126 88, 110 90
            L 50 92
            C 50 94, 48 100, 50 104
            C 54 118, 68 132, 92 134
            C 110 136, 126 126, 126 108
            C 126 100, 118 94, 108 94
            L 50 92
            Z
          `}
          fill={`url(#${ids.dark})`}
          stroke={`url(#${ids.outline})`}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export default TrishoolSVG;

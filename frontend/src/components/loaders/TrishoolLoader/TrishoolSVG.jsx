/**
 * TrishoolSVG — Authentic Shiva Trishul head, horizontal, pointing RIGHT.
 * 
 * Matches the classic trishul silhouette: thick flowing S-curve side prongs,
 * long tapered center blade, smooth organic curves — divine weapon aesthetic.
 */
import React from 'react';

const TrishoolSVG = ({ width = 90, height = 56, className = '' }) => {
  const uid = React.useId?.() || 'ts';
  const ids = {
    body: `${uid}-body`,
    edge: `${uid}-edge`,
    glow: `${uid}-glow`,
    tip: `${uid}-tip`,
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 0 8px rgba(251,146,60,0.85))' }}
    >
      <defs>
        <linearGradient id={ids.body} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="30%" stopColor="#D97706" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="85%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>

        <linearGradient id={ids.edge} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        <linearGradient id={ids.tip} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#FFFBEB" />
        </linearGradient>

        <filter id={ids.glow} x="-15%" y="-20%" width="130%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="b" />
          <feColorMatrix in="b" type="matrix"
            values="1 0 0 0 0.92
                    0 1 0 0 0.52
                    0 0 1 0 0.08
                    0 0 0 0.55 0" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${ids.glow})`}>

        {/* ═══ SHAFT — horizontal handle ═══ */}
        <rect x="0" y="56" width="58" height="8" rx="4" fill={`url(#${ids.body})`} />
        <rect x="4" y="57" width="50" height="2.5" rx="1" fill="rgba(255,255,255,0.2)" />

        {/* ═══ JUNCTION RING ═══ */}
        <ellipse cx="58" cy="60" rx="6" ry="14" fill={`url(#${ids.edge})`} />
        <ellipse cx="58" cy="60" rx="3.5" ry="10" fill="#D97706" opacity="0.5" />

        {/* ═══════════════════════════════════════════════
            CENTER PRONG — long tapered blade pointing right
            ═══════════════════════════════════════════════ */}
        <path
          d={`
            M 62 52
            C 85 52, 140 55, 185 58
            L 195 60
            L 185 62
            C 140 65, 85 68, 62 68
            Z
          `}
          fill={`url(#${ids.body})`}
        />
        {/* Center highlight streak */}
        <path
          d="M 65 53.5 C 90 53.5, 145 56, 188 59 L 186 60 C 142 57, 88 55, 65 55 Z"
          fill="rgba(255,255,255,0.22)"
        />

        {/* ═══════════════════════════════════════════════
            TOP PRONG — flowing S-curve blade, curves UP then forward-right
            Based on classic Shiva trishul silhouette (image 3 reference)
            ═══════════════════════════════════════════════ */}
        <path
          d={`
            M 58 46
            C 56 34, 60 20, 72 12
            C 82 5, 96 2, 112 4
            C 124 6, 134 12, 140 20
            L 136 22
            C 130 16, 122 12, 112 10
            C 98 8, 84 12, 76 18
            C 66 26, 62 38, 62 48
            Z
          `}
          fill={`url(#${ids.body})`}
        />
        {/* Top prong tip highlight */}
        <path
          d="M 134 14 C 137 17, 140 20, 139 21 L 136 22 C 132 16, 128 13, 124 11 Z"
          fill={`url(#${ids.tip})`}
        />
        {/* Top prong inner highlight */}
        <path
          d={`
            M 59 44
            C 58 34, 62 22, 73 14
            C 80 9, 90 6, 100 5
            L 98 8
            C 88 8, 78 12, 72 18
            C 64 26, 61 36, 61 46
            Z
          `}
          fill="rgba(255,255,255,0.15)"
        />

        {/* ═══════════════════════════════════════════════
            BOTTOM PRONG — mirror of top, curves DOWN then forward-right
            ═══════════════════════════════════════════════ */}
        <path
          d={`
            M 58 74
            C 56 86, 60 100, 72 108
            C 82 115, 96 118, 112 116
            C 124 114, 134 108, 140 100
            L 136 98
            C 130 104, 122 108, 112 110
            C 98 112, 84 108, 76 102
            C 66 94, 62 82, 62 72
            Z
          `}
          fill={`url(#${ids.body})`}
        />
        {/* Bottom prong tip highlight */}
        <path
          d="M 134 106 C 137 103, 140 100, 139 99 L 136 98 C 132 104, 128 107, 124 109 Z"
          fill={`url(#${ids.tip})`}
        />
        {/* Bottom prong inner highlight */}
        <path
          d={`
            M 59 76
            C 58 86, 62 98, 73 106
            C 80 111, 90 114, 100 115
            L 98 112
            C 88 112, 78 108, 72 102
            C 64 94, 61 84, 61 74
            Z
          `}
          fill="rgba(255,255,255,0.15)"
        />

        {/* ═══ Small decorative crescents at base of prongs ═══ */}
        <path
          d="M 60 49 Q 68 46, 72 50 Q 66 50, 62 52 Z"
          fill="#FDE68A" opacity="0.5"
        />
        <path
          d="M 60 71 Q 68 74, 72 70 Q 66 70, 62 68 Z"
          fill="#FDE68A" opacity="0.5"
        />
      </g>
    </svg>
  );
};

export default TrishoolSVG;

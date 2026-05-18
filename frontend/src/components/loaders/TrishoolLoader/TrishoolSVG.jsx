/**
 * TrishoolSVG — Authentic fiery Trishul (Shiva's Trident) pointing RIGHT.
 *
 * Three THICK flame-shaped blade prongs — not thin lines.
 * Rich dark amber/burnt-orange palette with intense fiery glow.
 * Matches the classic divine weapon silhouette.
 */
import React from 'react';

const TrishoolSVG = ({ width = 110, height = 56, className = '' }) => {
  const uid = React.useId?.() || 'ts';
  const ids = {
    body: `${uid}-b`,
    dark: `${uid}-d`,
    hot: `${uid}-h`,
    glow: `${uid}-g`,
    inner: `${uid}-i`,
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 220 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 2px 10px rgba(234,88,12,0.9)) drop-shadow(0 0 20px rgba(249,115,22,0.5))' }}
    >
      <defs>
        {/* Rich dark amber metallic — fiery, NOT yellow */}
        <linearGradient id={ids.body} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#78350F" />
          <stop offset="20%" stopColor="#92400E" />
          <stop offset="45%" stopColor="#B45309" />
          <stop offset="70%" stopColor="#D97706" />
          <stop offset="90%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>

        {/* Dark vertical gradient for side prongs */}
        <linearGradient id={ids.dark} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="30%" stopColor="#D97706" />
          <stop offset="60%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        {/* Hot bright for tips */}
        <linearGradient id={ids.hot} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>

        {/* Inner metallic highlight */}
        <linearGradient id={ids.inner} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(253,230,138,0.4)" />
          <stop offset="100%" stopColor="rgba(253,230,138,0)" />
        </linearGradient>

        {/* Intense fiery glow */}
        <filter id={ids.glow} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b" />
          <feColorMatrix in="b" type="matrix"
            values="1 0 0 0 0.85
                    0 0.6 0 0 0.25
                    0 0 0.3 0 0
                    0 0 0 0.7 0" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${ids.glow})`}>

        {/* ═══ SHAFT ═══ */}
        <rect x="0" y="61" width="60" height="8" rx="4" fill={`url(#${ids.body})`} />
        <rect x="3" y="62" width="54" height="2.5" rx="1" fill="rgba(253,230,138,0.15)" />

        {/* ═══ JUNCTION RING ═══ */}
        <ellipse cx="60" cy="65" rx="8" ry="18" fill={`url(#${ids.dark})`} />
        <ellipse cx="60" cy="65" rx="5" ry="13" fill="#92400E" opacity="0.6" />
        <ellipse cx="60" cy="65" rx="3" ry="9" fill="rgba(253,230,138,0.15)" />

        {/* ═════════════════════════════════════════════════════
            CENTER PRONG — thick leaf-blade, tapers to sharp tip
            Width at base: ~26px, length: ~145px
            ═════════════════════════════════════════════════════ */}
        <path
          d={`
            M 66 52
            C 90 50, 145 54, 195 62
            L 210 65
            L 195 68
            C 145 76, 90 80, 66 78
            Z
          `}
          fill={`url(#${ids.body})`}
        />
        {/* Center blade top edge highlight */}
        <path
          d="M 70 53 C 95 51, 148 55, 196 63 L 194 64 C 146 56, 93 53, 70 55 Z"
          fill="rgba(253,230,138,0.2)"
        />
        {/* Center blade spine line */}
        <line x1="70" y1="65" x2="200" y2="65" stroke="rgba(253,230,138,0.12)" strokeWidth="1" />

        {/* ═════════════════════════════════════════════════════
            TOP PRONG — THICK flame-blade curving up-right
            This is a wide crescent blade, NOT a thin curve.
            Blade width ~16-18px throughout the curve.
            ═════════════════════════════════════════════════════ */}
        <path
          d={`
            M 58 46
            C 52 24, 62 2, 90 -6
            C 108 -10, 126 -4, 140 10
            L 134 18
            C 122 6, 108 2, 94 4
            C 72 10, 60 30, 62 50
            Z
          `}
          fill={`url(#${ids.dark})`}
        />
        {/* Top prong sharp tip accent */}
        <path
          d="M 132 8 C 136 12, 140 10, 138 14 L 134 18 C 130 12, 126 8, 122 6 Z"
          fill={`url(#${ids.hot})`}
        />
        {/* Top prong outer edge highlight */}
        <path
          d={`
            M 58 44
            C 52 22, 64 0, 92 -6
            C 104 -9, 116 -8, 126 -4
            L 124 0
            C 114 -4, 104 -5, 94 -2
            C 68 4, 56 24, 60 44
            Z
          `}
          fill="rgba(253,230,138,0.18)"
        />

        {/* ═════════════════════════════════════════════════════
            BOTTOM PRONG — mirror of top, THICK flame-blade
            ═════════════════════════════════════════════════════ */}
        <path
          d={`
            M 58 84
            C 52 106, 62 128, 90 136
            C 108 140, 126 134, 140 120
            L 134 112
            C 122 124, 108 128, 94 126
            C 72 120, 60 100, 62 80
            Z
          `}
          fill={`url(#${ids.dark})`}
        />
        {/* Bottom prong sharp tip accent */}
        <path
          d="M 132 122 C 136 118, 140 120, 138 116 L 134 112 C 130 118, 126 122, 122 124 Z"
          fill={`url(#${ids.hot})`}
        />
        {/* Bottom prong outer edge highlight */}
        <path
          d={`
            M 58 86
            C 52 108, 64 130, 92 136
            C 104 139, 116 138, 126 134
            L 124 130
            C 114 134, 104 135, 94 132
            C 68 126, 56 106, 60 86
            Z
          `}
          fill="rgba(253,230,138,0.18)"
        />

        {/* ═══ Inner decorative crescents at prong junction ═══ */}
        <path d="M 62 50 Q 72 44, 78 50 Q 70 52, 64 54 Z" fill="#D97706" opacity="0.6" />
        <path d="M 62 80 Q 72 86, 78 80 Q 70 78, 64 76 Z" fill="#D97706" opacity="0.6" />

        {/* ═══ Center dot (bindu) ═══ */}
        <circle cx="66" cy="65" r="2.5" fill="#F59E0B" opacity="0.7" />
      </g>
    </svg>
  );
};

export default TrishoolSVG;

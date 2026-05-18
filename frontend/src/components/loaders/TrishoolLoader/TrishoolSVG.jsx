/**
 * TrishoolSVG — Precise mathematical SVG curves professionally built.
 * Divine cinematic Saffron metallic glow.
 */
import React from 'react';

const TrishoolSVG = ({ width = "100%", height = "100%", className = '' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 1000 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        filter: 'drop-shadow(0 0 12px #ff8c00) drop-shadow(0 0 24px #ff6a00) drop-shadow(0 0 40px rgba(255,140,0,0.5))'
      }}
    >
      <defs>
        {/* Molten saffron metallic gradient */}
        <linearGradient id="metallicGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff7a00" />
          <stop offset="30%" stopColor="#ffae42" />
          <stop offset="50%" stopColor="#fff2b0" />
          <stop offset="70%" stopColor="#ff9a1f" />
          <stop offset="100%" stopColor="#ff6a00" />
        </linearGradient>
      </defs>

      {/* Main Geometry System */}
      <g fill="url(#metallicGradient)">
        {/* 1. Main Shaft */}
        <rect x="80" y="236" width="340" height="28" rx="14" />
        
        {/* 2. Handle Rings */}
        <rect x="90" y="222" width="14" height="56" rx="7" />
        <rect x="116" y="222" width="14" height="56" rx="7" />

        {/* 3. Center Spear Blade */}
        <path d="M420 250 L520 205 L760 250 L520 295 Z" />

        {/* 4. Upper Curved Prong (Cubic Bézier) */}
        <path d="M420 250 C500 130, 640 120, 760 190 C660 220, 600 220, 520 210 Z" />

        {/* 5. Lower Curved Prong (Mirrored Cubic Bézier) */}
        <path d="M420 250 C500 370, 640 380, 760 310 C660 280, 600 280, 520 290 Z" />
      </g>

      {/* 6. Inner Hollow Curves (Negative Space for premium divine structure) */}
      <g fill="#111">
        <path d="M520 220 C590 160, 660 160, 710 205 C640 210, 580 220, 520 220 Z" />
        <path d="M520 280 C590 340, 660 340, 710 295 C640 290, 580 280, 520 280 Z" />
      </g>
    </svg>
  );
};

export default TrishoolSVG;

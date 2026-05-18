/**
 * TrishoolSVG — Precisely modeled after the reference image.
 * No heavy blurs, no glowing blobs. Just perfect geometry,
 * clean metallic gradients, and sharp edges.
 */
import React from 'react';

const TrishoolSVG = ({ width = "100%", height = "100%", className = '' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Crisp metallic gold outline */}
        <linearGradient id="goldStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF8E1" />
          <stop offset="20%" stopColor="#FFECB3" />
          <stop offset="50%" stopColor="#FFC107" />
          <stop offset="80%" stopColor="#FFA000" />
          <stop offset="100%" stopColor="#FF8F00" />
        </linearGradient>

        {/* Rich, solid orange inner body */}
        <linearGradient id="orangeBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFB300" />
          <stop offset="30%" stopColor="#F57C00" />
          <stop offset="70%" stopColor="#E65100" />
          <stop offset="100%" stopColor="#BF360C" />
        </linearGradient>
      </defs>

      {/* Main Solid Shape */}
      <g stroke="url(#goldStroke)" strokeWidth="2.5" fill="url(#orangeBody)" strokeLinejoin="round" strokeLinecap="round">
        
        {/* Shaft */}
        <rect x="0" y="46" width="40" height="8" />
        
        {/* Base Rings */}
        <rect x="8" y="41" width="4" height="18" rx="2" />
        <rect x="18" y="41" width="4" height="18" rx="2" />

        {/* Top Prong (Sweeps back, then curves forward to a sharp tip) */}
        <path d="
          M 40 46
          C 60 20, 80 20, 95 32
          C 85 18, 65 5, 40 10
          C 20 15, 25 35, 35 46
          Z
        " />

        {/* Bottom Prong (Mirror of Top Prong) */}
        <path d="
          M 40 54
          C 60 80, 80 80, 95 68
          C 85 82, 65 95, 40 90
          C 20 85, 25 65, 35 54
          Z
        " />

        {/* Center Spear (Sharp arrowhead) */}
        <path d="
          M 35 46
          L 55 46
          L 55 35
          L 115 50
          L 55 65
          L 55 54
          L 35 54
          Z
        " />
      </g>

      {/* 3D Highlight Ridges (Adds depth without using blurry filters) */}
      <g stroke="#FFD54F" strokeWidth="1" fill="none" opacity="0.6">
        {/* Center spear ridge */}
        <line x1="55" y1="50" x2="110" y2="50" />
        
        {/* Top prong inner ridge */}
        <path d="M 42 45 C 55 25, 75 22, 90 32" />
        
        {/* Bottom prong inner ridge */}
        <path d="M 42 55 C 55 75, 75 78, 90 68" />
      </g>
    </svg>
  );
};

export default TrishoolSVG;

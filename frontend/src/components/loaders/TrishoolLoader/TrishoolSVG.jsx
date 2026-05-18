/**
 * TrishoolSVG — A large, premium, fully custom SVG Trishul (trident).
 * 
 * This is NOT a tiny icon. This is a cinematic, clearly visible, 
 * thick-silhouetted divine weapon rendered as scalable vector art.
 * 
 * The trident points RIGHT (direction of horizontal travel).
 * Saffron-to-deep-orange metallic gradient with gold highlights.
 */
import React from 'react';

const TrishoolSVG = ({ width = 120, height = 80, className = '' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 0 8px rgba(251,146,60,0.6))' }}
    >
      <defs>
        {/* Main saffron metallic gradient */}
        <linearGradient id="trishoolBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="30%" stopColor="#F97316" />
          <stop offset="60%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>

        {/* Gold highlight for edges */}
        <linearGradient id="trishoolGoldEdge" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Metallic silver reflection */}
        <linearGradient id="trishoolReflect" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* Outer glow filter */}
        <filter id="trishoolGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feColorMatrix in="blur" type="matrix"
            values="1 0 0 0 0.97
                    0 1 0 0 0.58
                    0 0 1 0 0.13
                    0 0 0 0.6 0" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#trishoolGlow)">
        {/* ═══ SHAFT (horizontal bar trailing left) ═══ */}
        <rect x="0" y="55" width="120" height="10" rx="5" fill="url(#trishoolBodyGrad)" />
        {/* Shaft metallic reflection highlight */}
        <rect x="10" y="56" width="100" height="3" rx="1.5" fill="url(#trishoolReflect)" opacity="0.6" />

        {/* ═══ JUNCTION BAND (decorative ring where shaft meets head) ═══ */}
        <rect x="115" y="48" width="10" height="24" rx="3" fill="url(#trishoolGoldEdge)" />
        <rect x="117" y="50" width="6" height="20" rx="2" fill="#FBBF24" opacity="0.4" />

        {/* ═══ CENTER PRONG (largest, pointing right — the main spear) ═══ */}
        <path
          d="M125 60 L198 60 L192 54 L125 54 Z"
          fill="url(#trishoolBodyGrad)"
        />
        <path
          d="M125 60 L198 60 L192 66 L125 66 Z"
          fill="url(#trishoolBodyGrad)"
        />
        {/* Sharp pointed tip of center prong */}
        <path
          d="M192 52 L200 60 L192 68 Z"
          fill="#DC2626"
        />
        {/* Center prong gold edge */}
        <path
          d="M125 55 L194 55 L198 60 L194 55 Z"
          fill="url(#trishoolGoldEdge)"
          opacity="0.5"
        />

        {/* ═══ TOP PRONG (curves upward-right) ═══ */}
        <path
          d="M122 50 
             Q132 38 140 28 
             Q148 18 158 10 
             L162 6
             L158 14
             Q150 24 142 32
             Q134 42 128 48
             Z"
          fill="url(#trishoolBodyGrad)"
          strokeWidth="1"
        />
        {/* Top prong sharp tip */}
        <path
          d="M158 2 L162 6 L158 10 L156 6 Z"
          fill="#DC2626"
        />
        {/* Top prong inner thickness */}
        <path
          d="M124 48 
             Q134 36 142 26 
             Q150 16 160 8
             L158 14
             Q150 22 143 30
             Q136 40 128 48
             Z"
          fill="url(#trishoolGoldEdge)"
          opacity="0.3"
        />

        {/* ═══ BOTTOM PRONG (curves downward-right — mirror of top) ═══ */}
        <path
          d="M122 70 
             Q132 82 140 92 
             Q148 102 158 110 
             L162 114
             L158 106
             Q150 96 142 88
             Q134 78 128 72
             Z"
          fill="url(#trishoolBodyGrad)"
          strokeWidth="1"
        />
        {/* Bottom prong sharp tip */}
        <path
          d="M158 118 L162 114 L158 110 L156 114 Z"
          fill="#DC2626"
        />
        {/* Bottom prong inner thickness */}
        <path
          d="M124 72 
             Q134 84 142 94 
             Q150 104 160 112
             L158 106
             Q150 98 143 90
             Q136 80 128 72
             Z"
          fill="url(#trishoolGoldEdge)"
          opacity="0.3"
        />

        {/* ═══ SMALL DECORATIVE CRESCENT (divine symbol on center prong) ═══ */}
        <path
          d="M145 55 Q150 52 155 55 Q152 58 148 58 Q144 58 145 55Z"
          fill="#FCD34D"
          opacity="0.7"
        />
      </g>
    </svg>
  );
};

export default TrishoolSVG;

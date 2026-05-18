import React from 'react';

/**
 * TrishulLoader — A premium top-bar loading animation featuring Lord Shiva's Trishul (trident)
 * that glides left-to-right across the top of the viewport during page transitions.
 *
 * The trishul head is oriented pointing RIGHT (direction of motion), with the shaft trailing behind.
 * A warm orange-to-red gradient wake follows behind the trident as it sweeps across.
 */
const TrishulLoader = () => {
  return (
    <>
      <style>{`
        @keyframes trishul-sweep {
          0%   { transform: translateX(-80px); }
          100% { transform: translateX(calc(100vw + 40px)); }
        }
        @keyframes trishul-trail {
          0%   { width: 0%; opacity: 1; }
          60%  { width: 85%; opacity: 1; }
          100% { width: 100%; opacity: 0.3; }
        }
        @keyframes trishul-pulse {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(249,115,22,0.4)); }
          50%      { filter: drop-shadow(0 0 10px rgba(249,115,22,0.8)); }
        }
      `}</style>

      {/* Container — fixed at very top of viewport */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '5px',
        zIndex: 99999,
        overflow: 'visible',
        pointerEvents: 'none',
      }}>
        {/* Gradient trail line (the wake behind the trishul) */}
        <div style={{
          position: 'absolute',
          top: '0px',
          left: 0,
          height: '4px',
          background: 'linear-gradient(90deg, transparent 0%, #FDBA74 10%, #F97316 40%, #EA580C 70%, #DC2626 100%)',
          borderRadius: '0 4px 4px 0',
          animation: 'trishul-trail 2.2s ease-in-out infinite',
        }} />

        {/* The Trishul (trident) SVG that glides across — pointing RIGHT */}
        <div style={{
          position: 'absolute',
          top: '-9px',
          left: 0,
          animation: 'trishul-sweep 2.2s ease-in-out infinite, trishul-pulse 1.1s ease-in-out infinite',
        }}>
          {/* Trishul SVG — oriented with prongs pointing RIGHT (direction of travel) */}
          <svg
            width="40"
            height="22"
            viewBox="0 0 120 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Shaft (trailing left) */}
            <rect x="0" y="27" width="65" height="5" rx="2.5" fill="url(#shaftGrad)" />

            {/* Center prong (horizontal, longest, pointing right) */}
            <path
              d="M60 29.5 L120 29.5 L112 26 L112 33 Z"
              fill="url(#trishulOrange)"
            />

            {/* Top prong (curves upward-right) */}
            <path
              d="M68 27 Q80 10 100 2 L96 8 Q82 14 72 25 Z"
              fill="url(#trishulOrange)"
            />

            {/* Bottom prong (curves downward-right) */}
            <path
              d="M68 33 Q80 50 100 58 L96 52 Q82 46 72 35 Z"
              fill="url(#trishulOrange)"
            />

            {/* Small decorative band where shaft meets prongs */}
            <rect x="64" y="24" width="6" height="12" rx="1.5" fill="#FBBF24" opacity="0.9" />

            <defs>
              <linearGradient id="trishulOrange" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F97316" />
                <stop offset="50%" stopColor="#EA580C" />
                <stop offset="100%" stopColor="#DC2626" />
              </linearGradient>
              <linearGradient id="shaftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FDBA74" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#F97316" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </>
  );
};

export default TrishulLoader;

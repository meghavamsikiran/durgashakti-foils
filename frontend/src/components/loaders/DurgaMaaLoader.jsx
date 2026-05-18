import React from 'react';
import { motion } from 'framer-motion';

const DurgaMaaLoader = () => {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Color Palette: Deep Red/Orange from Image 3 */}
        {/* Bindi / Tilak (Static) */}
        <circle cx="100" cy="30" r="7" fill="#e63900" />
        <path
          d="M 88,40 Q 100,48 112,40 Q 100,43 88,40"
          fill="#e63900"
        />
        <circle cx="100" cy="48" r="2.5" fill="#e63900" />

        {/* Eyebrows (Static) */}
        {/* Left Brow */}
        <path
          d="M 95,45 C 75,35 45,20 20,15 C 45,23 75,40 95,45 Z"
          fill="#e63900"
        />
        {/* Right Brow */}
        <path
          d="M 105,45 C 125,35 155,20 180,15 C 155,23 125,40 105,45 Z"
          fill="#e63900"
        />

        {/* Eyes & Eyelashes (Animated - Blinking) */}
        <motion.g
          style={{ originY: "65px" }}
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", repeatDelay: 1.5 }}
        >
          {/* Left Eye */}
          <path
            d="M 35,65 Q 60,50 85,65 Q 60,80 35,65"
            fill="none"
            stroke="#e63900"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="60" cy="65" r="9" fill="#e63900" />
          <circle cx="60" cy="65" r="3" fill="#fff" />

          {/* Right Eye */}
          <path
            d="M 115,65 Q 140,50 165,65 Q 140,80 115,65"
            fill="none"
            stroke="#e63900"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="140" cy="65" r="9" fill="#e63900" />
          <circle cx="140" cy="65" r="3" fill="#fff" />
        </motion.g>

        {/* Nose (Static) */}
        <path
          d="M 95,65 L 95,85 C 95,90 90,92 85,92"
          fill="none"
          stroke="#e63900"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Lips (Static) */}
        <path
          d="M 80,110 Q 100,120 120,110 Q 100,105 80,110"
          fill="#e63900"
        />

        {/* Nose Ring (Nath) (Static) */}
        <circle
          cx="120"
          cy="100"
          r="18"
          fill="none"
          stroke="#e63900"
          strokeWidth="2.5"
        />
      </svg>
    </div>
  );
};

export default DurgaMaaLoader;

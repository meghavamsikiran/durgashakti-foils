import React from 'react';
import { motion } from 'framer-motion';

const DurgaMaaLoader = () => {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Color Palette: Deep Red/Orange from Image 3 */}
        {/* Bindi / Tilak (Static - No animation) */}
        <circle cx="100" cy="30" r="8" fill="#e63900" />
        <path
          d="M 88,42 C 92,48 108,48 112,42 C 105,44 95,44 88,42 Z"
          fill="#e63900"
        />
        <circle cx="100" cy="50" r="3" fill="#e63900" />

        {/* Eyebrows (Static - No animation) */}
        {/* Left Brow */}
        <path
          d="M 90,48 C 70,35 35,20 15,15 C 35,23 70,40 90,48 Z"
          fill="#e63900"
        />
        {/* Right Brow */}
        <path
          d="M 110,48 C 130,35 165,20 185,15 C 165,23 130,40 110,48 Z"
          fill="#e63900"
        />

        {/* Eyes & Eyelashes (Animated - Blinking) */}
        <motion.g
          style={{ originY: "70px" }}
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", repeatDelay: 1.5 }}
        >
          {/* Left Eye */}
          <path
            d="M 30,70 C 45,55 70,55 85,70 C 70,85 45,85 30,70 Z"
            fill="none"
            stroke="#e63900"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="57" cy="70" r="10" fill="#e63900" />
          <circle cx="57" cy="70" r="4" fill="#white" /> {/* Reflection */}

          {/* Right Eye */}
          <path
            d="M 115,70 C 130,55 155,55 170,70 C 155,85 130,85 115,70 Z"
            fill="none"
            stroke="#e63900"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="143" cy="70" r="10" fill="#e63900" />
          <circle cx="143" cy="70" r="4" fill="#white" /> {/* Reflection */}
        </motion.g>

        {/* Nose (Static - No animation) */}
        <path
          d="M 95,70 L 95,95 C 95,100 90,102 85,102"
          fill="none"
          stroke="#e63900"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Lips (Static - No animation) */}
        <path
          d="M 80,115 Q 100,125 120,115 Q 100,110 80,115"
          fill="#e63900"
        />
        <path
          d="M 82,116 Q 100,119 118,116"
          fill="none"
          stroke="#fff"
          strokeWidth="1"
        />

        {/* Nose Ring (Nath) (Static - No animation) */}
        <circle
          cx="120"
          cy="105"
          r="22"
          fill="none"
          stroke="#e63900"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
};

export default DurgaMaaLoader;

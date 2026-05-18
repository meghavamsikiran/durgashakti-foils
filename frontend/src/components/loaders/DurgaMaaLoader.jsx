import React from 'react';
import { motion } from 'framer-motion';

const DurgaMaaLoader = () => {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Third Eye (Bindi) */}
        <motion.path
          d="M 50,25 Q 45,32 50,40 Q 55,32 50,25"
          fill="#ef4444" // Red
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
        
        {/* Left Eye Group */}
        <motion.g
          style={{ originY: "50px", originX: "35px" }}
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", repeatDelay: 0.8 }}
        >
          {/* Eye Arch */}
          <path
            d="M 22,50 Q 35,40 45,50"
            fill="none"
            stroke="#1e293b" // Slate 800 for strong contrast
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Eyelashes */}
          <path d="M 27,45 L 24,38" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 33,44 L 33,36" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 39,45 L 42,38" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        </motion.g>

        {/* Right Eye Group */}
        <motion.g
          style={{ originY: "50px", originX: "65px" }}
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", repeatDelay: 0.8 }}
        >
          {/* Eye Arch */}
          <path
            d="M 55,50 Q 65,40 78,50"
            fill="none"
            stroke="#1e293b"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Eyelashes */}
          <path d="M 61,45 L 58,38" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 67,44 L 67,36" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 73,45 L 76,38" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        </motion.g>

        {/* Nose Ring (Nath) */}
        <motion.circle
          cx="42"
          cy="68"
          r="10"
          fill="none"
          stroke="#f59e0b" // Amber/Gold
          strokeWidth="2.5"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        />
        {/* Nose Ring Bead */}
        <circle cx="52" cy="68" r="2.5" fill="#ef4444" />
        
        {/* Lips */}
        <path
          d="M 38,78 Q 50,84 62,78 Q 50,80 38,78"
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default DurgaMaaLoader;

import React from 'react';
import { motion } from 'framer-motion';
import TrishoolSVG from './TrishoolSVG';

/**
 * TrishoolLoader — Mathematical Cinematic Horizontal Loader.
 * Built with precise SVG Bezier curves and Framer Motion.
 */
const TrishoolLoader = ({ isProcessing = false }) => {
  const duration = 2.2;
  const ease = [0.22, 1, 0.36, 1];

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none overflow-hidden"
      style={{ height: '60px' }} // Adjusted height to clip less but remain a top loader
    >
      {/* Energy Trail */}
      <motion.div
        initial={{ width: '0%', opacity: 0 }}
        animate={{ width: ['0%', '100%', '100%'], opacity: [0, 1, 0] }}
        transition={{ duration, ease, repeat: Infinity }}
        className="absolute left-0"
        style={{
          top: '30px',
          marginTop: '-4px',
          height: '8px',
          background: 'linear-gradient(90deg, transparent, #ff6a00, #ffae42, #ffffff)',
          boxShadow: '0 0 15px #ff6a00, 0 0 5px #ffae42',
          willChange: 'width, opacity',
          transform: 'translateZ(0)' // GPU Accelerated
        }}
      />

      {/* Horizontal Motion Trishool */}
      <motion.div
        initial={{ x: '-200px', opacity: 0 }}
        animate={{ x: ['-200px', '100vw'], opacity: [0, 1, 1, 0] }}
        transition={{ duration, ease, repeat: Infinity }}
        className="absolute left-0"
        style={{
          top: '0px',
          width: '120px', // Proper size for a top loader
          height: '60px', 
          willChange: 'transform, opacity',
          transform: 'translateZ(0)', // GPU Accelerated
        }}
      >
        <TrishoolSVG width="100%" height="100%" />
      </motion.div>
    </div>
  );
};

export default TrishoolLoader;

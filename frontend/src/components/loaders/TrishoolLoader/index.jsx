import React from 'react';
import { motion } from 'framer-motion';
import TrishoolSVG from './TrishoolSVG';

/**
 * TrishoolLoader — Mathematical Cinematic Horizontal Loader.
 * Built with precise SVG Bezier curves and Framer Motion.
 */
const TrishoolLoader = ({ isProcessing = false }) => {
  // Ultra smooth easing and precise cinematic motion
  const duration = 2.2;
  const ease = [0.22, 1, 0.36, 1];

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none overflow-hidden"
      style={{ height: '140px' }} 
    >
      {/* Energy Trail */}
      <motion.div
        initial={{ width: '0%', opacity: 0 }}
        animate={{ width: ['0%', '100%', '100%'], opacity: [0, 1, 0] }}
        transition={{ duration, ease, repeat: Infinity }}
        className="absolute left-0"
        style={{
          top: '70px',
          marginTop: '-10px',
          height: '20px',
          background: 'linear-gradient(90deg, transparent, #ff6a00, #ffae42, #ffffff)',
          filter: 'blur(25px)',
          willChange: 'width, opacity',
          transform: 'translateZ(0)' // GPU Accelerated
        }}
      />

      {/* Horizontal Motion Trishool */}
      <motion.div
        initial={{ x: '-400px', opacity: 0 }}
        animate={{ x: ['-400px', '120vw'], opacity: [0, 1, 1, 0] }}
        transition={{ duration, ease, repeat: Infinity }}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-[240px] md:w-[420px]"
        style={{
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

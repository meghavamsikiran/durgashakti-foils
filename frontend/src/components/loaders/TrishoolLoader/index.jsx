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
      style={{ height: '60px' }}
    >
      {/* 
        Single Horizontal Motion Wrapper 
        The SVG and the trail move together as one unit.
      */}
      <motion.div
        initial={{ x: '-100vw', opacity: 0 }}
        animate={{ x: ['-20vw', '120vw'], opacity: [0, 1, 1, 0] }}
        transition={{ duration, ease, repeat: Infinity }}
        className="absolute left-0 top-0 h-full flex items-center"
        style={{
          width: '120px', // width of the SVG head
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
        }}
      >
        {/* 
          Comet Energy Trail 
          Attached exactly to the back (left edge) of the moving container
        */}
        <div 
          className="absolute right-full"
          style={{
            width: '80vw', // Long tail trailing off to the left
            height: '8px',
            background: 'linear-gradient(90deg, transparent, rgba(255,106,0,0.5), #ff6a00, #ffae42)',
            boxShadow: '0 0 15px #ff6a00, 0 0 5px #ffae42',
            borderRadius: '4px',
            marginRight: '-10px', // Overlap slightly with the shaft of the SVG
          }}
        />

        <div className="relative w-full h-full z-10 flex items-center">
          <TrishoolSVG width="100%" height="auto" />
        </div>
      </motion.div>
    </div>
  );
};

export default TrishoolLoader;

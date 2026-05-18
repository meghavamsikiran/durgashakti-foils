import React from 'react';
import { motion } from 'framer-motion';
import TrishoolSVG from './TrishoolSVG';

const TrishoolLoader = ({ isProcessing = false }) => {
  const duration = 2.2;
  const ease = [0.22, 1, 0.36, 1];

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none overflow-hidden"
      style={{ height: '60px' }}
    >
      <motion.div
        initial={{ x: '-100vw', opacity: 0 }}
        animate={{ x: ['-20vw', '120vw'], opacity: [0, 1, 1, 0] }}
        transition={{ duration, ease, repeat: Infinity }}
        className="absolute left-0 top-0 h-full flex items-center"
        style={{
          width: '100px', // Exact width for the Trishool SVG
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
        }}
      >
        {/* Clean, sharp speed trail without heavy blurs */}
        <div 
          className="absolute right-full"
          style={{
            width: '60vw',
            height: '2px', // Very thin and sharp
            background: 'linear-gradient(90deg, transparent, #FF8F00, #FFC107)',
            marginRight: '-5px',
          }}
        />

        <div className="relative w-full h-full z-10 flex items-center justify-center">
          <TrishoolSVG width="100%" height="auto" />
        </div>
      </motion.div>
    </div>
  );
};

export default TrishoolLoader;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import TrishoolSVG from './TrishoolSVG';

const TrishoolLoader = ({ isProcessing = false }) => {
  const duration = 3.5; // Slowed down from 2.2
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const mobileWidth = window.innerWidth < 768;
      setIsMobile(mobileUA || mobileWidth);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none overflow-hidden"
      style={{ height: isMobile ? '20px' : '40px' }} // 20px on mobile, 40px on desktop
    >
      <motion.div
        initial={{ x: '-100vw', opacity: 0 }}
        animate={{ x: ['0vw', '0vw', '100vw', '100vw'], opacity: [0, 1, 1, 0] }}
        transition={{ 
          duration, 
          ease: "linear", 
          repeat: Infinity,
          times: [0, 0.1, 0.9, 1]
        }}
        className="absolute left-0 top-0 h-full flex items-center"
        style={{
          width: isMobile ? '40px' : '75px', // 40px on mobile, 75px on desktop
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
        }}
      >
        {/* Clean, sharp speed trail without heavy blurs */}
        <div 
          className="absolute right-full"
          style={{
            width: '60vw',
            height: isMobile ? '1px' : '2px', // 1px on mobile, 2px on desktop
            background: 'linear-gradient(90deg, transparent, #FF8F00, #FFC107)',
            marginRight: isMobile ? '-18px' : '-35px', // Scale the overlap spacing
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

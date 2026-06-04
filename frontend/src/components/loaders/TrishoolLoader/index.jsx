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
      style={{ height: isMobile ? '20px' : '63px' }} // 20px on mobile, 63px on desktop to match aspect ratio of child SVG (1.2)
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
          width: isMobile ? '24px' : '75px', // 24px on mobile, 75px on desktop
          height: '100%',
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
        }}
      >
        {/* Glowing metallic gold/orange speed trail with shimmer */}
        <div 
          className="absolute right-full animate-pulse"
          style={{
            width: '70vw',
            height: isMobile ? '2px' : '4px',
            background: 'linear-gradient(90deg, transparent, rgba(229, 231, 235, 0.2) 30%, rgba(255, 215, 0, 0.5) 60%, rgba(255, 143, 0, 0.8) 85%, #FFC107 100%)',
            boxShadow: isMobile ? 'none' : '0 0 8px rgba(255, 193, 7, 0.6), 0 0 15px rgba(255, 215, 0, 0.3)',
            marginRight: isMobile ? '-5px' : '-20px',
            filter: 'blur(0.5px)',
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

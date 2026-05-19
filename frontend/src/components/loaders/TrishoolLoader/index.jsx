import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import TrishoolSVG from './TrishoolSVG';

const TrishoolLoader = () => {
  const [progress, setProgress] = useState(0);
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

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      if (current < 65) {
        // Swift initial sweep
        current += Math.random() * 6 + 3;
      } else if (current < 85) {
        // Decelerating
        current += Math.random() * 2 + 0.5;
      } else if (current < 97) {
        // Slow creep while waiting for complete data load
        current += Math.random() * 0.2 + 0.03;
      }
      setProgress(Math.min(current, 98));
    }, 70);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none overflow-hidden"
      style={{ height: isMobile ? '12px' : '40px' }}
    >
      {/* Dynamic speed trail ending exactly at the Trishul's rear */}
      <div 
        className="absolute left-0 top-0 h-full"
        style={{
          width: `${progress}%`,
          height: isMobile ? '1.5px' : '3px',
          background: 'linear-gradient(90deg, transparent, #FF8F00 50%, #FFC107 100%)',
          transition: 'width 100ms linear',
          opacity: 0.9,
        }}
      />

      {/* Trishul Leader Icon */}
      <div
        className="absolute top-0 h-full flex items-center"
        style={{
          left: `${progress}%`,
          width: isMobile ? '24px' : '75px',
          marginLeft: isMobile ? '-12px' : '-37px', // Centering offset
          transition: 'left 100ms linear',
          willChange: 'left',
        }}
      >
        <div className="relative w-full h-full z-10 flex items-center justify-center">
          <TrishoolSVG width="100%" height="auto" />
        </div>
      </div>
    </div>
  );
};

export default TrishoolLoader;

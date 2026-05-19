import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const DurgaMaaLoader = () => {
  const videoRef = useRef(null);
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

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // If the video is close to the end, loop it manually to skip dead space
    if (video.duration && video.currentTime >= video.duration - 0.6) {
      video.currentTime = 0;
      video.play();
    }
  };

  if (isMobile) {
    // Lightweight SVG Durga Maa loader for mobile views
    return (
      <motion.div
        animate={{ 
          scale: [0.96, 1.04, 0.96],
          opacity: [0.85, 1, 0.85]
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-full h-full flex items-center justify-center bg-transparent drop-shadow-xl"
      >
        <svg 
          viewBox="0 0 100 80" 
          className="w-full h-full max-w-[120px] max-h-[120px]" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="durgaOrange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFA000" />
              <stop offset="50%" stopColor="#E65100" />
              <stop offset="100%" stopColor="#BF360C" />
            </linearGradient>
            <linearGradient id="durgaGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF8E1" />
              <stop offset="50%" stopColor="#FFC107" />
              <stop offset="100%" stopColor="#FF8F00" />
            </linearGradient>
          </defs>
          
          {/* Forehead Bindi and Third Eye (Trinetra) */}
          <path d="M 50 15 C 48 20, 48 26, 50 31 C 52 26, 52 20, 50 15 Z" fill="url(#durgaOrange)" />
          <circle cx="50" cy="11" r="2.5" fill="url(#durgaOrange)" />
          
          {/* Left Eyebrow */}
          <path d="M 23 35 C 32 23, 41 28, 45 32 C 40 30, 31 27, 23 35 Z" fill="url(#durgaOrange)" />
          
          {/* Right Eyebrow */}
          <path d="M 77 35 C 68 23, 59 28, 55 32 C 60 30, 69 27, 77 35 Z" fill="url(#durgaOrange)" />

          {/* Left Eye */}
          <path d="M 26 38 C 32 34, 39 36, 43 40 C 37 42, 30 42, 26 38 Z" fill="url(#durgaOrange)" />
          
          {/* Right Eye */}
          <path d="M 74 38 C 68 34, 61 36, 57 40 C 63 42, 70 42, 74 38 Z" fill="url(#durgaOrange)" />
          
          {/* Nose */}
          <path d="M 48 38 L 48 48 C 48 51, 52 51, 52 48" stroke="url(#durgaOrange)" strokeWidth="2.2" strokeLinecap="round" />
          
          {/* Lips */}
          <path d="M 42 56 C 45 54, 55 54, 58 56 C 54 60, 46 60, 42 56 Z" fill="url(#durgaOrange)" />
          
          {/* Nose Ring (Nath) */}
          <motion.circle 
            cx="58" 
            cy="51" 
            r="6.5" 
            stroke="url(#durgaGold)" 
            strokeWidth="1.8" 
            fill="none"
            animate={{ strokeWidth: [1.8, 2.5, 1.8] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <path d="M 58 57.5 L 58 60.5 C 58 61, 59 61, 59 60.5 L 59 57.5" stroke="url(#durgaGold)" strokeWidth="1.2" />
        </svg>
      </motion.div>
    );
  }

  // Desktop Video Loader
  return (
    <div 
      className="relative w-40 h-32 flex items-center justify-center overflow-hidden bg-transparent border-none outline-none select-none shadow-none pointer-events-none"
      style={{ mixBlendMode: 'multiply' }}
    >
      <video 
        ref={videoRef}
        src="/durgamaloader.mp4" 
        autoPlay 
        loop 
        muted 
        playsInline
        onTimeUpdate={handleTimeUpdate}
        className="w-full h-full object-cover border-none outline-none bg-transparent"
        style={{ 
          filter: 'contrast(1.2) brightness(1.1)',
          mixBlendMode: 'multiply',
          transform: 'scale(1.08)',
          backgroundColor: 'transparent',
        }}
      />
    </div>
  );
};

export default DurgaMaaLoader;

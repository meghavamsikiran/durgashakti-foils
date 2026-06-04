import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const DurgaMaaLoader = () => {
  const videoRef = useRef(null);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // If the video is close to the end, loop it manually to skip dead space
    if (video.duration && video.currentTime >= video.duration - 0.6) {
      video.currentTime = 0;
      video.play();
    }
  };

  // Desktop Video Loader
  return (
    <div 
      className="relative w-40 h-32 flex items-center justify-center overflow-hidden bg-transparent border-none outline-none select-none shadow-none pointer-events-none"
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
          filter: 'contrast(1.25) brightness(1.15)',
          transform: 'scale(1.08)',
          backgroundColor: 'transparent',
        }}
      />
    </div>
  );
};

export default DurgaMaaLoader;

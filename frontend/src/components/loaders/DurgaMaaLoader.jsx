import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const DurgaMaaLoader = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.playsInline = true;
      // Force play on mount to ensure Safari/iOS starts playing automatically
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Autoplay blocked by browser, loading and retrying...", error);
          video.load();
          video.play().catch(e => console.log("Retry failed:", e));
        });
      }
    }
  }, []);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // If the video is close to the end, loop it manually to skip dead space
    if (video.duration && video.currentTime >= video.duration - 0.6) {
      video.currentTime = 0;
      video.play().catch(e => {});
    }
  };

  // Video Loader scaled to 65% on mobile (w-40 -> w-[104px], h-32 -> h-[83px])
  return (
    <div 
      className="relative w-[104px] h-[83px] md:w-40 md:h-32 flex items-center justify-center overflow-hidden bg-transparent border-none outline-none select-none shadow-none pointer-events-none"
      style={{ mixBlendMode: 'multiply' }}
    >
      <style>{`
        video::-webkit-media-controls-start-playback-button {
          display: none !important;
          -webkit-appearance: none;
        }
      `}</style>
      <video 
        ref={videoRef}
        src="/durgamaloader.mp4" 
        autoPlay 
        loop 
        muted 
        playsInline
        webkit-playsinline="true"
        controls={false}
        onTimeUpdate={handleTimeUpdate}
        className="w-full h-full object-cover border-none outline-none bg-transparent"
        style={{ 
          filter: 'contrast(1.25) brightness(1.15)',
          transform: 'scale(1.08)',
          backgroundColor: 'transparent',
          mixBlendMode: 'multiply'
        }}
      />
    </div>
  );
};

export default DurgaMaaLoader;

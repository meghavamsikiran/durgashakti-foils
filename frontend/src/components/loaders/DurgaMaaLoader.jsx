import React, { useRef, useEffect, useState } from 'react';

const DurgaMaaLoader = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.playsInline = true;
      // Force inline playback on iOS
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          video.load();
          video.play().catch(e => {});
        });
      }
    }
  }, []);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.duration && video.currentTime >= video.duration - 0.6) {
      video.currentTime = 0;
      video.play().catch(e => {});
    }
  };

  return (
    <div 
      className="relative w-[104px] h-[83px] md:w-40 md:h-32 flex items-center justify-center overflow-hidden bg-transparent border-none outline-none select-none shadow-none pointer-events-none"
      style={{ backgroundColor: 'transparent', background: 'transparent' }}
    >
      <video 
        ref={videoRef}
        src="/durgamaloader.mp4"
        loop 
        muted 
        playsInline
        webkit-playsinline="true"
        preload="auto"
        controls={false}
        onTimeUpdate={handleTimeUpdate}
        className="w-full h-full object-cover border-none outline-none bg-transparent"
        style={{ 
          filter: 'contrast(1.25) brightness(1.15)',
          transform: 'scale(1.08)',
          backgroundColor: 'transparent',
          background: 'transparent',
          mixBlendMode: 'multiply'
        }}
      />
    </div>
  );
};

export default DurgaMaaLoader;

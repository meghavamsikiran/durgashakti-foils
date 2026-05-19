import React, { useRef } from 'react';

const DurgaMaaLoader = () => {
  const videoRef = useRef(null);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // If the video is close to the end (e.g. within 0.6 seconds), loop it manually
    // This helps skip any dead space at the end of the video file that causes a delay
    if (video.duration && video.currentTime >= video.duration - 0.6) {
      video.currentTime = 0;
      video.play();
    }
  };

  return (
    <div 
      className="relative w-40 h-32 flex items-center justify-center overflow-hidden bg-transparent"
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
        className="w-full h-full object-cover"
        style={{ 
          filter: 'contrast(1.2) brightness(1.1)',
          mixBlendMode: 'multiply',
          transform: 'scale(1.08)',
          backgroundColor: 'transparent'
        }}
      />
    </div>
  );
};

export default DurgaMaaLoader;

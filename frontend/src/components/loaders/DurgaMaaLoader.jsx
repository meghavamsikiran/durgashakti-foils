import React, { useRef, useEffect, useState } from 'react';

const DurgaMaaLoader = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [useCanvas, setUseCanvas] = useState(false);

  useEffect(() => {
    // Detect iOS (iPhone/iPad/iPod)
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setUseCanvas(isIOSDevice);
  }, []);

  useEffect(() => {
    if (!useCanvas) {
      const video = videoRef.current;
      if (video) {
        video.muted = true;
        video.playsInline = true;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            video.load();
            video.play().catch(e => {});
          });
        }
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    video.muted = true;
    video.playsInline = true;
    video.loop = true;

    const playVideo = () => {
      video.play().catch(e => {});
    };

    if (video.readyState >= 3) {
      playVideo();
    } else {
      video.addEventListener('canplay', playVideo);
    }

    const render = () => {
      if (video && video.readyState >= 2) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (video) {
        video.removeEventListener('canplay', playVideo);
      }
    };
  }, [useCanvas]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.duration && video.currentTime >= video.duration - 0.6) {
      video.currentTime = 0;
      video.play().catch(e => {});
    }
  };

  // Video Loader scaled to 65% on mobile (w-40 -> w-[104px], h-32 -> h-[83px])
  if (useCanvas) {
    return (
      <div 
        className="relative w-[104px] h-[83px] md:w-40 md:h-32 flex items-center justify-center overflow-hidden bg-transparent border-none outline-none select-none shadow-none pointer-events-none"
        style={{ isolation: 'isolate', backgroundColor: 'transparent' }}
      >
        <video
          ref={videoRef}
          src="/durgamaloader.mp4"
          muted
          playsInline
          webkit-playsinline="true"
          loop
          crossOrigin="anonymous"
          style={{ display: 'none' }}
        />
        <canvas
          ref={canvasRef}
          width={160}
          height={128}
          className="w-full h-full object-cover"
          style={{ 
            mixBlendMode: 'multiply',
            filter: 'contrast(1.25) brightness(1.15) opacity(0.99)',
          }}
        />
      </div>
    );
  }

  // Restore EXACT OLD CODE for non-iOS (Android/Web Desktop)
  return (
    <div 
      className="relative w-[104px] h-[83px] md:w-40 md:h-32 flex items-center justify-center overflow-hidden bg-transparent border-none outline-none select-none shadow-none pointer-events-none"
    >
      <video 
        ref={videoRef}
        src="/durgamaloader.mp4"
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

import React, { useRef, useEffect } from 'react';

const DurgaMaaLoader = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Aggressively configure silent autoplay properties for iOS compatibility
    video.muted = true;
    video.playsInline = true;
    video.loop = true;

    const playVideo = () => {
      video.play().catch(e => {
        console.log("Video playback delayed/prevented (safari low power mode):", e);
      });
    };

    if (video.readyState >= 3) {
      playVideo();
    } else {
      video.addEventListener('canplay', playVideo);
    }

    const render = () => {
      if (video && video.readyState >= 2) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
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
  }, []);

  // Video Loader scaled to 65% on mobile (w-40 -> w-[104px], h-32 -> h-[83px])
  // Uses canvas to avoid hardware video layers on iOS which block blend-mode and show play overlays
  return (
    <div 
      className="relative w-[104px] h-[83px] md:w-40 md:h-32 flex items-center justify-center overflow-hidden bg-transparent border-none outline-none select-none shadow-none pointer-events-none"
      style={{ mixBlendMode: 'multiply' }}
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
        className="w-full h-full object-contain bg-transparent"
        style={{ 
          mixBlendMode: 'multiply',
          filter: 'contrast(1.25) brightness(1.15)',
        }}
      />
    </div>
  );
};

export default DurgaMaaLoader;

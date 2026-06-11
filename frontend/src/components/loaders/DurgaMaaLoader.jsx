import React, { useRef, useEffect } from 'react';

/**
 * DurgaMaaLoader — Renders the Durga Maa animation video with a transparent background
 * on ALL browsers including mobile (iOS Safari, Android Chrome).
 *
 * WHY CANVAS:
 * `mix-blend-mode: multiply` on <video> elements is NOT respected by mobile browsers
 * because the browser's video decoder renders to a separate GPU compositor layer that
 * bypasses CSS compositing entirely. The only reliable cross-platform solution is to:
 *   1. Keep the <video> element hidden (display:none).
 *   2. Draw video frames onto a <canvas> every animation frame.
 *   3. Pixel-key (chroma-key) white/near-white pixels to transparent alpha.
 *
 * The video is served from same-origin (/durgamaloader.mp4) so getImageData is allowed.
 */
const DurgaMaaLoader = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Use 2d context with willReadFrequently hint for better mobile perf
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Start playback
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');

    const startPlay = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay blocked, waiting for user interaction:", err);
          setTimeout(() => {
            video.play().catch(() => {});
          }, 300);
        });
      }
    };

    if (video.readyState >= 1) {
      startPlay();
    } else {
      video.addEventListener('loadedmetadata', startPlay, { once: true });
      video.addEventListener('loadeddata', startPlay, { once: true });
      video.addEventListener('canplay', startPlay, { once: true });
      video.load();
    }

    const forcePlay = () => {
      if (video.paused) {
        video.play().catch(() => {});
      }
    };
    window.addEventListener('touchstart', forcePlay, { passive: true });
    window.addEventListener('click', forcePlay, { passive: true });

    // Fallback static image draw when video is not decodable
    const fallbackImg = new Image();
    fallbackImg.src = '/favicon.webp';

    // Per-frame rendering loop
    const renderFrame = () => {
      const W = canvas.width;
      const H = canvas.height;

      if (video.readyState >= 1 && !video.paused && !video.ended) {
        // Clear to fully transparent before drawing
        ctx.clearRect(0, 0, W, H);

        // Fit video into canvas (cover)
        const vW = video.videoWidth || W;
        const vH = video.videoHeight || H;
        const videoRatio = vW / vH;
        const canvasRatio = W / H;
        let sx = 0, sy = 0, sw = vW, sh = vH;
        if (videoRatio > canvasRatio) {
          sw = vH * canvasRatio;
          sx = (vW - sw) / 2;
        } else {
          sh = vW / canvasRatio;
          sy = (vH - sh) / 2;
        }

        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);

        try {
          const imgData = ctx.getImageData(0, 0, W, H);
          const d = imgData.data;

          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];

            // Hard cut: fully transparent for near-white pixels
            if (r > 220 && g > 220 && b > 220) {
              d[i + 3] = 0;
            } else if (r > 180 && g > 180 && b > 180) {
              // Soft feathered edge blend for anti-aliased borders
              const whiteness = (r + g + b) / 3;
              const alpha = Math.round(((255 - whiteness) / 75) * 255);
              d[i + 3] = Math.min(d[i + 3], Math.max(0, alpha));
            }
          }

          ctx.putImageData(imgData, 0, 0);
        } catch (e) {
          // getImageData failed
        }
      } else {
        // Fallback layout - Draw favicon static in center
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(fallbackImg, (W - 380) / 2, (H - 380) / 2, 380, 380);
      }

      rafRef.current = requestAnimationFrame(renderFrame);
    };

    rafRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      video.removeEventListener('loadedmetadata', startPlay);
      video.removeEventListener('loadeddata', startPlay);
      video.removeEventListener('canplay', startPlay);
      window.removeEventListener('touchstart', forcePlay);
      window.removeEventListener('click', forcePlay);
    };
  }, []);

  return (
    <div
      className="relative w-64 h-52 md:w-80 md:h-64 flex items-center justify-center select-none pointer-events-none"
      style={{ background: 'transparent', backgroundColor: 'transparent' }}
    >
      {/* Hidden video source — decoded frames are drawn to canvas
           CRITICAL: Do NOT use display:none, iOS Safari will suspend the video decoder! */}
      <video
        ref={videoRef}
        src="/durgamaloader.mp4"
        muted
        playsInline
        loop
        autoPlay
        preload="auto"
        style={{ 
          opacity: 0.01, 
          position: 'absolute', 
          width: '100%', 
          height: '100%', 
          pointerEvents: 'none', 
          objectFit: 'cover',
          zIndex: 0
        }}
      />

      {/* Canvas renders transparent frames via pixel keying */}
      <canvas
        ref={canvasRef}
        width={600}
        height={480}
        className="w-full h-full"
        style={{
          display: 'block',
          position: 'relative',
          zIndex: 1,
          background: 'transparent',
          backgroundColor: 'transparent',
          filter: 'contrast(1.2) brightness(1.1)',
        }}
      />
    </div>
  );
};

export default DurgaMaaLoader;

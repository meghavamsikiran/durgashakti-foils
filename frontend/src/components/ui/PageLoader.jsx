import React from 'react';

/**
 * PageLoader — A premium, full-screen centered circular spinner loader.
 * Features a circular track, a spinning emerald progress arc, the central branded
 * orange trident icon, and customized uppercase labels.
 *
 * Fully transparent background — no blur, no overlay tint.
 */
const PageLoader = () => {
  return (
    <div className="fixed inset-0 z-[99998] flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center justify-center gap-5">
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Circular track */}
          <div className="absolute inset-0 rounded-full border-[3.5px]" style={{ borderColor: 'var(--loader-track-color, rgba(0, 0, 0, 0.08))' }} />
          {/* Spinning indicator */}
          <div className="absolute inset-0 rounded-full border-[3.5px] border-transparent border-t-primary animate-spin" />
          {/* Branded orange logo in center */}
          <img
            src="/favicon.webp"
            alt="Durga Shakti"
            className="w-7 h-7 object-contain opacity-90 animate-pulse"
          />
        </div>
      </div>
    </div>
  );
};

export default PageLoader;

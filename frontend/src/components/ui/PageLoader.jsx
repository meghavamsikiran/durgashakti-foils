import React, { useState, useEffect } from 'react';

/**
 * PageLoader — A premium, highly responsive CSS-based spinner loader.
 * Features a circular track, a spinning indigo progress arc, the central branded 
 * orange trident icon, and customized uppercase labels.
 * 
 * Automatically detects whether it is rendered in an admin context or a public 
 * customer context to select the appropriate text, and respects the initial 
 * RouteTransitionLoader duration to prevent layout double-loading.
 */
const PageLoader = ({ text }) => {
  const [transitionActive, setTransitionActive] = useState(() => {
    return typeof window !== 'undefined' && !!window.__routeTransitionActive;
  });

  useEffect(() => {
    if (transitionActive) {
      const timer = setTimeout(() => setTransitionActive(false), 600);
      return () => clearTimeout(timer);
    }
  }, [transitionActive]);

  if (transitionActive) return null;

  const defaultText = typeof window !== 'undefined' && (window.location.pathname.includes('/admin') || window.location.pathname.includes('/superadmin'))
    ? 'LOADING ADMIN SESSION'
    : 'LOADING SESSION';

  const displayText = text || defaultText;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8 animate-in fade-in duration-300">
      <div className="flex flex-col items-center justify-center gap-5">
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Circular track */}
          <div className="absolute inset-0 rounded-full border-[3.5px] border-slate-100/80" />
          {/* Spinning indicator */}
          <div className="absolute inset-0 rounded-full border-[3.5px] border-transparent border-t-indigo-600 animate-spin" />
          {/* Branded orange logo in center */}
          <img
            src="/favicon.png"
            alt="Durga Shakti"
            className="w-7 h-7 object-contain opacity-90 animate-pulse"
          />
        </div>
        <span className="text-[11px] font-black tracking-[0.2em] text-slate-400 uppercase select-none">
          {displayText}
        </span>
      </div>
    </div>
  );
};

export default PageLoader;

import React, { useState, useEffect } from 'react';

/**
 * PageLoader — A premium, full-screen centered circular spinner loader.
 * Features a circular track, a spinning indigo progress arc, the central branded 
 * orange trident icon, and customized uppercase labels.
 * 
 * Centered relative to the entire screen using a fixed blurred backdrop.
 * Suppressed completely during page transition, browser refresh, or initial load 
 * to prevent overlapping or consecutive loader flashes.
 */
const PageLoader = ({ text }) => {
  const [suppressed, setSuppressed] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!(window.__routeTransitionActive || window.__initialPageLoadActive);
    }
    return false;
  });

  useEffect(() => {
    if (suppressed) {
      const interval = setInterval(() => {
        if (typeof window !== 'undefined' && !window.__routeTransitionActive && !window.__initialPageLoadActive) {
          setSuppressed(false);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [suppressed]);

  if (suppressed) return null;

  const defaultText = typeof window !== 'undefined' && (window.location.pathname.includes('/admin') || window.location.pathname.includes('/superadmin'))
    ? 'LOADING ADMIN SESSION'
    : 'LOADING SESSION';

  const displayText = text || defaultText;

  return (
    <div className="fixed inset-0 z-[99998] flex flex-col items-center justify-center bg-slate-50/60 backdrop-blur-[2px] animate-in fade-in duration-300">
      <div className="flex flex-col items-center justify-center gap-5">
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Circular track */}
          <div className="absolute inset-0 rounded-full border-[3.5px] border-slate-100" />
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

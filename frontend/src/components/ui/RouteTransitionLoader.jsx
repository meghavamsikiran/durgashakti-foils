import React, { useState, useEffect } from 'react';
import TrishoolLoader from '../loaders/TrishoolLoader';
import DurgaMaaLoader from '../loaders/DurgaMaaLoader';

/**
 * Module-level flag. This variable is true when JavaScript first loads
 * (i.e. on a fresh page visit or a browser refresh). It stays false
 * for all subsequent SPA navigations because the module remains in memory.
 * On refresh → browser re-evaluates the module → resets back to true.
 */
let isInitialPageLoad = true;

/**
 * RouteTransitionLoader — Shows loader only when:
 *   1. Customer/Admin visits the website for the first time.
 *   2. Customer/Admin refreshes the browser from any page.
 *
 * Behavior based on device:
 *   - Desktop: Shows BOTH the sacred Trishul top bar AND the Durga Maa centre video loader.
 *   - Mobile: Shows ONLY the circular favicon loader. The Trishul loader is completely disabled on mobile.
 */
const RouteTransitionLoader = () => {
  const [show, setShow] = useState(() => {
    if (isInitialPageLoad) {
      isInitialPageLoad = false;
      return true;
    }
    return false;
  });

  // Synchronously initialize isMobile to prevent brief UI flashes during hydration
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const mobileWidth = window.innerWidth < 768;
      return mobileUA || mobileWidth;
    }
    return false;
  });

  useEffect(() => {
    const checkMobile = () => {
      const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const mobileWidth = window.innerWidth < 768;
      setIsMobile(mobileUA || mobileWidth);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setShow(false), 600);
      return () => clearTimeout(timer);
    }
  }, [show]);


  if (!show) return null;

  // Mobile-specific branded loader (circular ring, orange logo center, text below) - completely hidden on desktop
  if (isMobile) {
    return (
      <div 
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-50/95 md:hidden"
      >
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative w-14 h-14">
            {/* Circular track */}
            <div className="absolute inset-0 rounded-full border-[3.5px] border-slate-200" />
            {/* Spinning indicator */}
            <div className="absolute inset-0 rounded-full border-[3.5px] border-transparent border-t-indigo-600 animate-spin" />
            {/* Branded orange logo in center */}
            <img
              src="/favicon.png"
              alt=""
              className="absolute inset-0 m-auto w-6 h-6 object-contain"
            />
          </div>
          <span className="text-xs font-black tracking-widest text-slate-400 uppercase animate-pulse">
            Loading Session
          </span>
        </div>
      </div>
    );
  }

  // Desktop loaders (Trishul top bar + Durga Maa Center video) - completely hidden on mobile viewports
  return (
    <div className="hidden md:block">
      {/* Trishul top progress bar sweep */}
      <TrishoolLoader />
      {/* Durga Maa centre animation overlay */}
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-transparent pointer-events-none"
        style={{ mixBlendMode: 'multiply' }}
      >
        <DurgaMaaLoader />
      </div>
    </div>
  );
};

export default RouteTransitionLoader;

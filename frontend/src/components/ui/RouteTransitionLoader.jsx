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
      if (typeof window !== 'undefined') {
        window.__routeTransitionActive = true;
        window.__initialPageLoadActive = true;
      }
      return true;
    }
    return false;
  });

  const [duration, setDuration] = useState(600);

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

  // Listen for login-triggered loader event
  useEffect(() => {
    const handleLoginLoader = (e) => {
      const customDuration = e?.detail?.duration || 3000;
      setDuration(customDuration);
      if (typeof window !== 'undefined') {
        window.__routeTransitionActive = true;
        window.__initialPageLoadActive = true;
      }
      setShow(true);
    };
    window.addEventListener('triggerLoginLoader', handleLoginLoader);
    return () => window.removeEventListener('triggerLoginLoader', handleLoginLoader);
  }, []);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        setShow(false);
        if (typeof window !== 'undefined') {
          window.__routeTransitionActive = false;
        }
        // Keep initialPageLoadActive true for another 2.5 seconds to suppress any PageLoader flashes
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.__initialPageLoadActive = false;
          }
        }, 2500);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);


  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);
  }, []);

  if (!show) return null;

  return (
    <>
      {/* Trishul top progress bar sweep */}
      <TrishoolLoader />
      {/* Durga Maa centre animation overlay */}
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-transparent pointer-events-none"
        style={{ mixBlendMode: 'multiply' }}
      >
        {isIOS ? (
          <div className="flex flex-col items-center justify-center gap-5">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[3.5px] border-slate-200/60" />
              <div className="absolute inset-0 rounded-full border-[3.5px] border-transparent border-t-primary animate-spin" />
              <img
                src="/favicon.png"
                alt="Durga Shakti"
                className="w-7 h-7 object-contain opacity-90 animate-pulse"
              />
            </div>
          </div>
        ) : (
          <DurgaMaaLoader />
        )}
      </div>
    </>
  );
};

export default RouteTransitionLoader;

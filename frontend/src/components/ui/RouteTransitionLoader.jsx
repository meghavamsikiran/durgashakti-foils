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
        <DurgaMaaLoader />
      </div>
    </>
  );
};

export default RouteTransitionLoader;

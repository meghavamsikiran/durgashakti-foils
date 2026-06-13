import React, { useState, useEffect } from 'react';
import TrishoolLoader from '../loaders/TrishoolLoader';
import DurgaMaaLoader from '../loaders/DurgaMaaLoader';

/**
 * Module-level flag. This variable is true when JavaScript first loads
 * (i.e. on a fresh page visit or a browser refresh). It stays false
 * for all subsequent SPA navigations because the module remains in memory.
 * On refresh → browser re-evaluates the module → resets back to true.
 */
let isInitialPageLoad = false;

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

  // Enable loaders globally on all layouts and sizes
  const isMobile = false;

  useEffect(() => {
    // Mobile resize checks removed to keep loading layout uniform
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


  return (
    <>
      {show && <TrishoolLoader />}
      {/* Durga Maa centre animation overlay — ALWAYS mounted to keep video playing and prevent WebKit decoder freeze */}
      <div
        className={`fixed inset-0 z-[99999] flex items-center justify-center bg-transparent pointer-events-none transition-all duration-300 ${
          show ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        <DurgaMaaLoader show={show} />
      </div>
    </>
  );
};

export default RouteTransitionLoader;

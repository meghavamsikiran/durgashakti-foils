import React, { useState, useEffect } from 'react';
import TrishoolLoader from '../loaders/TrishoolLoader';
import DurgaMaaLoader from '../loaders/DurgaMaaLoader';

/**
 * RouteTransitionLoader — Shows the sacred Trishul/DurgaMaa animation
 * ONLY on the very first page load or a hard refresh (Ctrl+F5 / F5).
 * It does NOT fire on SPA route changes or API calls.
 *
 * Mechanism:
 *   - sessionStorage key 'app_loaded' is absent on first visit / after refresh.
 *   - We show the loader briefly, then mark the session as loaded.
 *   - All subsequent SPA navigations skip the loader entirely.
 */
const RouteTransitionLoader = () => {
  const [show, setShow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const alreadyLoaded = sessionStorage.getItem('app_loaded');
    if (!alreadyLoaded) {
      // Fresh page load or hard refresh — show the sacred animation
      setShow(true);
      // Mark session so it won't show again until next refresh
      sessionStorage.setItem('app_loaded', '1');
      // Auto-dismiss after animation completes (~2.5 s)
      const timer = setTimeout(() => setShow(false), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

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

  if (!show) return null;

  return (
    <div className="pointer-events-none">
      {isMobile ? <DurgaMaaLoader /> : <TrishoolLoader />}
    </div>
  );
};

export default RouteTransitionLoader;

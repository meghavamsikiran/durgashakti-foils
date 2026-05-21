import React, { useState, useEffect } from 'react';
import TrishoolLoader from '../loaders/TrishoolLoader';
import DurgaMaaLoader from '../loaders/DurgaMaaLoader';

/**
 * RouteTransitionLoader — Shows BOTH the sacred Trishul top bar AND the
 * Durga Maa centre animation ONLY in two cases:
 *   1. Customer/Admin is visiting the website for the first time in this tab.
 *   2. Customer/Admin hard-refreshes the browser (F5 / Ctrl+F5).
 *
 * Normal SPA navigation (clicking links, tabs, etc.) does NOT trigger
 * these loaders at all.
 *
 * Mechanism: sessionStorage is cleared on every fresh page load / refresh,
 * so the absence of the key 'app_loaded' means this is a fresh load.
 */
const RouteTransitionLoader = () => {
  const [show, setShow] = useState(() => {
    // Check synchronously during initial render so first paint includes the loader
    return !sessionStorage.getItem('app_loaded');
  });

  useEffect(() => {
    if (show) {
      // Mark session so subsequent SPA navigations skip the loader
      sessionStorage.setItem('app_loaded', '1');
      // Auto-dismiss after the animation completes (~2.8s)
      const timer = setTimeout(() => setShow(false), 2800);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!show) return null;

  return (
    <>
      {/* Trishul top progress bar sweep */}
      <TrishoolLoader />
      {/* Durga Maa centre animation overlay */}
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none"
        style={{ backgroundColor: 'rgba(248,250,252,0.6)' }}
      >
        <DurgaMaaLoader />
      </div>
    </>
  );
};

export default RouteTransitionLoader;

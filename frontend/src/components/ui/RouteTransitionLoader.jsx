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
 * RouteTransitionLoader — Shows BOTH the sacred Trishul top bar AND the
 * Durga Maa centre animation ONLY when:
 *   1. Customer/Admin visits the website for the first time.
 *   2. Customer/Admin refreshes the browser from any page.
 *
 * Normal SPA navigation (clicking links, tabs, etc.) does NOT show them.
 */
const RouteTransitionLoader = () => {
  const [show, setShow] = useState(() => {
    if (isInitialPageLoad) {
      isInitialPageLoad = false;
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (show) {
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

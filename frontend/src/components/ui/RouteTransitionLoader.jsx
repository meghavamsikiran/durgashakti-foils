import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import TrishoolLoader from '../loaders/TrishoolLoader';
import DurgaMaaLoader from '../loaders/DurgaMaaLoader';
import { subscribe, resetLoading } from '../../services/core/loadingState';

/**
 * RouteTransitionLoader — Shows the sacred Trishul loading animation
 * at the top of the page during every route navigation.
 * 
 * It detects location changes and briefly displays the Trishul sweep
 * for a natural, polished transition feel (similar to YouTube/GitHub).
 */
const RouteTransitionLoader = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [networkLoading, setNetworkLoading] = useState(false);
  const prevPath = useRef(location.pathname);
  const timerRef = useRef(null);

  useEffect(() => {
    // Only trigger on actual route changes, not initial mount
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      resetLoading();
      setLoading(true);

      // Clear any existing timer
      if (timerRef.current) clearTimeout(timerRef.current);

      // Show the trishul for one full animation cycle (~2.2s) 
      // but minimum 600ms for very fast navigations
      timerRef.current = setTimeout(() => {
        setLoading(false);
      }, 800);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location.pathname]);

  useEffect(() => {
    return subscribe(setNetworkLoading);
  }, []);

  if (!loading && !networkLoading) return null;

  return (
    <div className="pointer-events-none">
      <TrishoolLoader />
      <div className="fixed inset-0 z-[99998] flex flex-col items-center justify-center space-y-4">
        <DurgaMaaLoader />
      </div>
    </div>
  );
};

export default RouteTransitionLoader;

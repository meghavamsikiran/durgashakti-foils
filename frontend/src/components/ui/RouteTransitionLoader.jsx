import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import TrishulLoader from './TrishulLoader';

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
  const prevPath = useRef(location.pathname);
  const timerRef = useRef(null);

  useEffect(() => {
    // Only trigger on actual route changes, not initial mount
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
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

  if (!loading) return null;

  return <TrishulLoader />;
};

export default RouteTransitionLoader;

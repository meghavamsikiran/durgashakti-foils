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
  const [networkLoading, setNetworkLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    return subscribe(setNetworkLoading);
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

  return (
    <div className={`pointer-events-none transition-opacity duration-300 ${networkLoading ? 'opacity-100' : 'opacity-0'}`}>
      <TrishoolLoader />
    </div>
  );
};

export default RouteTransitionLoader;

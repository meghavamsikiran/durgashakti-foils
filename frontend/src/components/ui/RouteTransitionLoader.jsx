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

  useEffect(() => {
    return subscribe(setNetworkLoading);
  }, []);

  if (!networkLoading) return null;

  return (
    <div className="pointer-events-none">
      <TrishoolLoader />
      <div className="fixed inset-0 z-[99998] flex flex-col items-center justify-center space-y-4" style={{ mixBlendMode: 'multiply' }}>
        <div className="w-40">
          <DurgaMaaLoader />
        </div>
      </div>
    </div>
  );
};

export default RouteTransitionLoader;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TrishoolSVG from '../loaders/TrishoolLoader/TrishoolSVG';
import DurgaMaaLoader from '../loaders/DurgaMaaLoader';

/**
 * Module-level flag. This variable is true when JavaScript first loads
 * (i.e. on a fresh page visit or a browser refresh). It resets back to true
 * on browser reload.
 */
let isInitialPageLoad = true;

/**
 * RouteTransitionLoader — A highly premium, synchronized fullscreen loading animation
 * featuring the sacred Durga Maa video/SVG and the glowing Trishool loader.
 * Activates on first load, browser refresh, and customer/admin login transitions.
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

  const [duration, setDuration] = useState(1500); // Default to 1.5s for initial load/refresh
  const [isLoginEvent, setIsLoginEvent] = useState(false);
  const [isAdminText, setIsAdminText] = useState(false);

  // Listen for login-triggered loader event
  useEffect(() => {
    const handleLoginLoader = (e) => {
      const customDuration = e?.detail?.duration || 3000;
      const isAdmin = e?.detail?.isAdmin || false;
      setDuration(customDuration);
      setIsLoginEvent(true);
      setIsAdminText(isAdmin);

      if (typeof window !== 'undefined') {
        window.__routeTransitionActive = true;
        window.__initialPageLoadActive = true;
      }
      setShow(true);
    };

    window.addEventListener('triggerLoginLoader', handleLoginLoader);
    return () => window.removeEventListener('triggerLoginLoader', handleLoginLoader);
  }, []);

  // Timer to close the loader
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        setShow(false);
        setIsLoginEvent(false);
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
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl select-none overflow-hidden"
        >
          {/* Subtle divine background glowing aura */}
          <div 
            className="absolute w-[500px] h-[500px] rounded-full pointer-events-none filter blur-[100px] opacity-20"
            style={{
              background: 'radial-gradient(circle, rgba(230,81,0,0.6) 0%, rgba(255,160,0,0.2) 50%, transparent 100%)',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />

          <div className="relative z-10 flex flex-col items-center justify-center max-w-md w-full px-8">
            {/* Center Sacred Symbol Container */}
            <div className="relative flex flex-col items-center justify-center gap-6">
              
              {/* Outer glowing rotating ring */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                className="absolute w-56 h-56 rounded-full border border-dashed border-amber-500/20"
              />

              {/* Durga Maa centerpiece */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="w-48 h-40 flex items-center justify-center overflow-hidden"
              >
                <DurgaMaaLoader />
              </motion.div>

              {/* Trishool (rotated -90deg to point upright and animated in sync) */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ 
                  y: [0, -10, 0],
                  opacity: 1
                }}
                transition={{
                  y: {
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  },
                  opacity: {
                    delay: 0.4,
                    duration: 0.6
                  }
                }}
                className="w-16 h-16 flex items-center justify-center"
                style={{
                  filter: 'drop-shadow(0 0 12px rgba(255, 193, 7, 0.7))',
                }}
              >
                <div style={{ transform: 'rotate(-90deg)' }} className="w-full h-full flex items-center justify-center">
                  <TrishoolSVG width="100%" height="100%" />
                </div>
              </motion.div>
            </div>

            {/* Glowing Standardized Text */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-sm font-black tracking-[0.25em] text-center text-amber-500/90 uppercase mt-8 animate-pulse"
              style={{ fontFamily: 'Manrope' }}
            >
              {isAdminText ? 'Admin Session Loading' : 'Loading Session'}
            </motion.h2>

            {/* Micro progress bar tracker */}
            <div className="w-48 h-[3px] bg-slate-800/80 rounded-full overflow-hidden mt-5 border border-slate-700/30">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: duration / 1000, ease: 'easeInOut' }}
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RouteTransitionLoader;

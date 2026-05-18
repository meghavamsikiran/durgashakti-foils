import React from 'react';
import { motion } from 'framer-motion';
import TrishoolSVG from './TrishoolSVG';

/**
 * TrishoolLoader — Cinematic Trishul loading animation.
 * 
 * A horizontal Trishul (pointing RIGHT) sweeps across the top of the viewport
 * with a fiery saffron energy trail — like the divine weapon flying through space.
 * Container is 48px tall so the trident is clearly visible.
 */
const TrishoolLoader = ({ isProcessing = false }) => {
  const duration = isProcessing ? 3.0 : 2.0;
  const ease = [0.22, 1, 0.36, 1];

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none overflow-hidden"
      style={{ height: '48px' }}
    >
      {/* ── Fire / Energy Trail ── */}
      <motion.div
        initial={{ width: '0%', opacity: 0 }}
        animate={{ 
          width: ['0%', '60%', '100%'],
          opacity: [0, 0.9, 0],
        }}
        transition={{
          duration,
          ease,
          repeat: Infinity,
          repeatDelay: 0.2,
        }}
        className="absolute left-0 rounded-r-full"
        style={{
          top: '22px',
          height: '4px',
          background: 'linear-gradient(90deg, transparent 0%, #FDBA74 20%, #F97316 50%, #EA580C 80%, #DC2626 100%)',
          boxShadow: '0 0 16px 3px rgba(249,115,22,0.5), 0 0 6px 1px rgba(251,146,60,0.7)',
          willChange: 'width, opacity',
        }}
      />

      {/* ── The Trishul sweeping right ── */}
      <motion.div
        initial={{ x: '-120px', opacity: 0 }}
        animate={{ 
          x: ['-120px', 'calc(100vw + 60px)'],
          opacity: [0, 1, 1, 1, 0],
        }}
        transition={{
          duration,
          ease,
          repeat: Infinity,
          repeatDelay: 0.2,
        }}
        className="absolute"
        style={{
          top: '0px',
          willChange: 'transform, opacity',
        }}
      >
        {/* Fire streak behind the trishul */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '-50px',
          width: '70px',
          height: '8px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.3) 30%, rgba(251,146,60,0.7) 100%)',
          filter: 'blur(6px)',
          borderRadius: '4px',
        }} />

        {/* Secondary glow */}
        <div style={{
          position: 'absolute',
          top: '18px',
          left: '-30px',
          width: '40px',
          height: '12px',
          background: 'radial-gradient(ellipse, rgba(253,186,116,0.6) 0%, transparent 70%)',
          filter: 'blur(4px)',
        }} />

        <TrishoolSVG width={90} height={48} />
      </motion.div>
    </div>
  );
};

export default TrishoolLoader;

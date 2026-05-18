import React from 'react';
import { motion } from 'framer-motion';
import TrishoolSVG from './TrishoolSVG';

/**
 * TrishoolLoader — Cinematic Trishul loading animation.
 * 
 * A horizontal Trishul sweeps across the top of the viewport with a fiery
 * saffron energy trail. Container is tall enough for the trishul to be
 * clearly visible and recognizable.
 */
const TrishoolLoader = ({ isProcessing = false }) => {
  const duration = isProcessing ? 3.0 : 2.0;
  const ease = [0.22, 1, 0.36, 1];

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none overflow-hidden"
      style={{ height: '56px' }}
    >
      {/* ── Glowing energy trail line ── */}
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
          top: '26px',
          height: '4px',
          background: 'linear-gradient(90deg, transparent 0%, #FDBA74 15%, #F97316 50%, #EA580C 80%, #DC2626 100%)',
          boxShadow: '0 0 16px 3px rgba(249,115,22,0.5), 0 0 6px 1px rgba(251,146,60,0.7)',
          willChange: 'width, opacity',
        }}
      />

      {/* ── The Trishul sweeping across ── */}
      <motion.div
        initial={{ x: '-140px', opacity: 0 }}
        animate={{ 
          x: ['-140px', 'calc(100vw + 60px)'],
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
        {/* Fire/energy streak behind the trishul */}
        <div style={{
          position: 'absolute',
          top: '22px',
          left: '-60px',
          width: '80px',
          height: '12px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.2) 20%, rgba(251,146,60,0.6) 100%)',
          filter: 'blur(8px)',
          borderRadius: '6px',
        }} />

        {/* Secondary glow halo */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '-35px',
          width: '50px',
          height: '24px',
          background: 'radial-gradient(ellipse, rgba(253,186,116,0.5) 0%, transparent 70%)',
          filter: 'blur(5px)',
        }} />

        <TrishoolSVG width={110} height={56} />
      </motion.div>
    </div>
  );
};

export default TrishoolLoader;

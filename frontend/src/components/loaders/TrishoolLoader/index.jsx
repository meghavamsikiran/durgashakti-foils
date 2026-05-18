import React from 'react';
import { motion } from 'framer-motion';
import TrishoolSVG from './TrishoolSVG';

/**
 * TrishoolLoader — Compact fiery Trishul sweep animation at top of viewport.
 */
const TrishoolLoader = ({ isProcessing = false }) => {
  const duration = isProcessing ? 3.0 : 2.0;
  const ease = [0.22, 1, 0.36, 1];

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none overflow-hidden"
      style={{ height: '38px' }}
    >
      {/* Fiery trail */}
      <motion.div
        initial={{ width: '0%', opacity: 0 }}
        animate={{ width: ['0%', '55%', '100%'], opacity: [0, 1, 0] }}
        transition={{ duration, ease, repeat: Infinity, repeatDelay: 0.2 }}
        className="absolute left-0 rounded-r-full"
        style={{
          top: '17px', height: '4px',
          background: 'linear-gradient(90deg, transparent 0%, #92400E 15%, #D97706 40%, #F97316 65%, #EA580C 85%, #DC2626 100%)',
          boxShadow: '0 0 14px 3px rgba(234,88,12,0.5), 0 0 6px 1px rgba(249,115,22,0.7)',
          willChange: 'width, opacity',
        }}
      />

      {/* Warm glow */}
      <motion.div
        initial={{ width: '0%', opacity: 0 }}
        animate={{ width: ['0%', '40%', '85%'], opacity: [0, 0.4, 0] }}
        transition={{ duration: duration * 0.95, ease, repeat: Infinity, repeatDelay: 0.3 }}
        className="absolute left-0"
        style={{
          top: '12px', height: '14px',
          background: 'linear-gradient(90deg, transparent, rgba(180,83,9,0.12) 40%, rgba(217,119,6,0.18) 70%, transparent)',
          filter: 'blur(5px)', willChange: 'width, opacity',
        }}
      />

      {/* Trishul */}
      <motion.div
        initial={{ x: '-100px', opacity: 0 }}
        animate={{ x: ['-100px', 'calc(100vw + 50px)'], opacity: [0, 1, 1, 1, 0] }}
        transition={{ duration, ease, repeat: Infinity, repeatDelay: 0.2 }}
        className="absolute"
        style={{ top: '0px', willChange: 'transform, opacity' }}
      >
        {/* Fire behind */}
        <div style={{
          position: 'absolute', top: '13px', left: '-45px',
          width: '55px', height: '12px',
          background: 'linear-gradient(90deg, transparent, rgba(180,83,9,0.3) 40%, rgba(234,88,12,0.65))',
          filter: 'blur(5px)', borderRadius: '4px',
        }} />
        <div style={{
          position: 'absolute', top: '16px', left: '-28px',
          width: '35px', height: '6px',
          background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.5), rgba(253,230,138,0.6))',
          filter: 'blur(3px)', borderRadius: '3px',
        }} />

        <TrishoolSVG width={80} height={38} />
      </motion.div>
    </div>
  );
};

export default TrishoolLoader;

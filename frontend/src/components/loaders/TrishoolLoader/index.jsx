import React from 'react';
import { motion } from 'framer-motion';
import TrishoolSVG from './TrishoolSVG';

/**
 * TrishoolLoader — Fiery Trishul loading animation.
 * 
 * A large, clearly visible horizontal Trishul sweeps across the top 
 * of the viewport with intense fiery trailing effects.
 */
const TrishoolLoader = ({ isProcessing = false }) => {
  const duration = isProcessing ? 3.0 : 2.0;
  const ease = [0.22, 1, 0.36, 1];

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none overflow-hidden"
      style={{ height: '64px' }}
    >
      {/* ── Fiery energy trail line ── */}
      <motion.div
        initial={{ width: '0%', opacity: 0 }}
        animate={{ 
          width: ['0%', '55%', '100%'],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration,
          ease,
          repeat: Infinity,
          repeatDelay: 0.2,
        }}
        className="absolute left-0 rounded-r-full"
        style={{
          top: '29px',
          height: '5px',
          background: 'linear-gradient(90deg, transparent 0%, #92400E 10%, #B45309 30%, #D97706 50%, #F97316 70%, #EA580C 85%, #DC2626 100%)',
          boxShadow: '0 0 20px 4px rgba(234,88,12,0.6), 0 0 8px 2px rgba(249,115,22,0.8)',
          willChange: 'width, opacity',
        }}
      />

      {/* ── Secondary warm glow trail ── */}
      <motion.div
        initial={{ width: '0%', opacity: 0 }}
        animate={{ 
          width: ['0%', '40%', '90%'],
          opacity: [0, 0.5, 0],
        }}
        transition={{
          duration: duration * 0.95,
          ease,
          repeat: Infinity,
          repeatDelay: 0.3,
        }}
        className="absolute left-0"
        style={{
          top: '24px',
          height: '14px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(180,83,9,0.15) 30%, rgba(217,119,6,0.25) 60%, rgba(249,115,22,0.1) 100%)',
          filter: 'blur(6px)',
          willChange: 'width, opacity',
        }}
      />

      {/* ── The Trishul sweeping across ── */}
      <motion.div
        initial={{ x: '-160px', opacity: 0 }}
        animate={{ 
          x: ['-160px', 'calc(100vw + 80px)'],
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
        {/* Large fire glow behind */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '-70px',
          width: '100px',
          height: '40px',
          background: 'radial-gradient(ellipse at right center, rgba(234,88,12,0.5) 0%, rgba(180,83,9,0.2) 40%, transparent 70%)',
          filter: 'blur(10px)',
        }} />

        {/* Fire streak trail */}
        <div style={{
          position: 'absolute',
          top: '26px',
          left: '-80px',
          width: '100px',
          height: '10px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(180,83,9,0.3) 30%, rgba(234,88,12,0.7) 70%, rgba(249,115,22,0.9) 100%)',
          filter: 'blur(6px)',
          borderRadius: '5px',
        }} />

        {/* Narrow hot core streak */}
        <div style={{
          position: 'absolute',
          top: '29px',
          left: '-50px',
          width: '60px',
          height: '4px',
          background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.6), rgba(253,230,138,0.8))',
          filter: 'blur(3px)',
          borderRadius: '2px',
        }} />

        <TrishoolSVG width={130} height={64} />
      </motion.div>
    </div>
  );
};

export default TrishoolLoader;

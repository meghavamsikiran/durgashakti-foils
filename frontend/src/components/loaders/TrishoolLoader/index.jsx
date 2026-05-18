import React from 'react';
import { motion } from 'framer-motion';
import TrishoolSVG from './TrishoolSVG';

/**
 * TrishoolLoader — The master cinematic horizontal loader for Durga Shakti Foils.
 * 
 * Architecture:
 * - A dark/cinematic backdrop or invisible container at the top of the viewport.
 * - An energy track that progressively fills from left to right.
 * - A large, highly visible Trishool SVG (trident) that moves across the track.
 * - Framer Motion used for buttery smooth 60fps animations with transform-gpu.
 */
const TrishoolLoader = ({ isProcessing = false }) => {
  // Easing function for smooth, premium cinematic movement
  const cinematicEase = [0.22, 1, 0.36, 1];

  // We use Framer Motion variants to control the loop
  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  // The Trishool slides from off-screen left to off-screen right
  const trishoolVariants = {
    initial: {
      x: '-20vw',
      opacity: 0,
    },
    animate: {
      x: '120vw',
      opacity: [0, 1, 1, 0], // Fade in, stay visible, fade out at end
      transition: {
        duration: isProcessing ? 3.5 : 2.2, // Slower for processing states
        ease: cinematicEase,
        repeat: Infinity,
        repeatDelay: 0.1,
      },
    },
  };

  // The energy trail follows the Trishool, filling the screen
  const trailVariants = {
    initial: {
      width: '0%',
      opacity: 0.8,
    },
    animate: {
      width: ['0%', '80%', '100%'],
      opacity: [0.8, 1, 0],
      transition: {
        duration: isProcessing ? 3.5 : 2.2,
        ease: cinematicEase,
        repeat: Infinity,
        repeatDelay: 0.1,
      },
    },
  };

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none overflow-hidden"
      style={{ height: '120px' }} // Tall enough to hold the large SVG
    >
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="relative w-full h-full"
      >
        {/* The glowing energy track line */}
        <motion.div
          variants={trailVariants}
          className="absolute top-[60px] left-0 h-[4px] rounded-r-full"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #FDBA74 20%, #F97316 60%, #EA580C 80%, #DC2626 100%)',
            boxShadow: '0 0 15px 2px rgba(249,115,22,0.6)',
            willChange: 'width, opacity',
          }}
        />

        {/* The Trishool Spear slicing through */}
        <motion.div
          variants={trishoolVariants}
          className="absolute top-[18px]" // Vertically aligned so the shaft sits on the track
          style={{
            willChange: 'transform, opacity',
          }}
        >
          {/* Subtle motion blur streak behind the Trishool */}
          <div className="absolute top-[40px] left-[-40px] w-[100px] h-[6px] bg-[#F97316] blur-[8px] opacity-60 rounded-full" />
          
          <TrishoolSVG width={180} height={100} />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default TrishoolLoader;

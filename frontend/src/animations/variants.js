/**
 * Cinematic motion system — subtle luxury.
 * Easing reference: [0.22, 1, 0.36, 1] = Apple ease-out
 */

// ── Reveal animations (scroll-triggered) ──
export const reveal = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

export const revealSlow = {
  initial: { opacity: 0, y: 60 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] }
};

export const revealScale = {
  initial: { opacity: 0, scale: 0.96 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
};

// ── Page/section enter ──
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
};

export const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

export const slideIn = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
};

// ── Stagger orchestration ──
export const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
};

// ── Spring physics ──
export const spring = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.8
};

export const springGentle = {
  type: "spring",
  stiffness: 200,
  damping: 25,
  mass: 1
};

// ── Modal transitions ──
export const modalOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.96, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 8 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
};

// ── Hover presets ──
export const hoverLift = {
  whileHover: { y: -4 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
};

export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.2 }
};

// Legacy exports for backward compatibility
export const premiumSpring = spring;
export const staggerContainer = stagger;

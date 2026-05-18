import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  ShieldCheck, 
  FileText, 
  Mail, 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Settings
} from 'lucide-react';

const Maintenance = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    // Simulate API registration for notification
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setEmail('');
    }, 1200);
  };

  // Upgrades list - high context for Durgashakti Foils transition
  const upgrades = [
    {
      icon: <Database className="w-5 h-5 text-amber-400" />,
      title: "Relational Database Migration",
      description: "Upgrading to a state-of-the-art Supabase PostgreSQL backend for lightning-fast inventory synchronization and robust transaction tracking."
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-amber-400" />,
      title: "Hardened Security Protocols",
      description: "Implementing strict role-based access control, session validation, and real-time administrative audit logs."
    },
    {
      icon: <FileText className="w-5 h-5 text-amber-400" />,
      title: "Automated GST Financial Reports",
      description: "Launching automated, compliant tax invoice generation with PDF downloads and bulk data imports."
    }
  ];

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-neutral-950 via-slate-950 to-neutral-950 text-white flex items-center justify-center overflow-hidden py-16 px-4 md:px-8 select-none font-sans">
      
      {/* ─── Ambient Glow Spheres (Micro-Animations) ─── */}
      <motion.div 
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-amber-500/10 blur-[100px] pointer-events-none"
      />
      <motion.div 
        animate={{
          x: [0, -90, 50, 0],
          y: [0, 80, -60, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"
      />
      
      {/* ─── Fine Premium Grid Overlay ─── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* ─── Main Content Container ─── */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
        
        {/* Brand Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 border border-amber-500/30 shadow-lg shadow-amber-500/5 backdrop-blur-md">
            <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
          <span className="text-xl font-bold tracking-widest bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent uppercase font-mono">
            DurgaShakti Foils
          </span>
        </motion.div>

        {/* Glassmorphic Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="w-full bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-2xl rounded-3xl p-6 md:p-12 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle card reflection line */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Side: Statement & Sign-up */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              {/* Pulsing Status Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold tracking-wider text-amber-400 uppercase">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="w-2 h-2 rounded-full bg-amber-400 absolute" />
                System Maintenance
              </div>

              {/* Main Heading */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
                Refining Our <br />
                <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-white bg-clip-text text-transparent">
                  Digital Experience
                </span>
              </h1>

              {/* Description */}
              <p className="text-sm md:text-base text-neutral-400 leading-relaxed font-light">
                We are currently implementing vital server-side enhancements and upgrading our database backend. This scheduled maintenance ensures DurgaShakti Foils continues to offer maximum speed, advanced safety, and an absolute premium retail ordering system.
              </p>

              {/* Progress Box */}
              <div className="flex items-center gap-3 py-2 px-3 bg-neutral-950/40 rounded-xl border border-neutral-800/50 w-fit">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-neutral-400 font-mono">
                  Completion Target: <span className="text-white font-medium">Under 2 Hours</span>
                </span>
              </div>

              {/* Signup Form / Success Screen */}
              <div className="pt-4 border-t border-neutral-800/80">
                <AnimatePresence mode="wait">
                  {!isSubmitted ? (
                    <motion.div 
                      key="signup-form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <h4 className="text-sm font-semibold tracking-wide text-neutral-300">
                        Want to be notified when we are back online?
                      </h4>
                      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-grow">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                          <input
                            type="email"
                            placeholder="Enter your professional email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setError('');
                            }}
                            disabled={isSubmitting}
                            className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all disabled:opacity-50"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="bg-white text-neutral-950 hover:bg-neutral-200 active:scale-95 disabled:scale-100 disabled:opacity-50 font-medium text-sm py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 group whitespace-nowrap"
                        >
                          {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              Notify Me
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </button>
                      </form>
                      {error && (
                        <p className="text-xs text-red-400 font-medium mt-1">{error}</p>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="success-message"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20"
                    >
                      <CheckCircle2 className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-white">Subscription Confirmed</h4>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Excellent. We will send an instant notification to your inbox the moment our upgrade is finalized and the retail store goes live.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>

            {/* Right Side: What's changing details */}
            <div className="lg:col-span-5 space-y-4">
              <div className="text-xs font-bold tracking-widest text-neutral-500 uppercase flex items-center gap-2 mb-2">
                <Settings className="w-3.5 h-3.5 animate-spin" />
                Active Upgrades
              </div>
              
              <div className="space-y-3.5">
                {upgrades.map((item, index) => (
                  <motion.div 
                    key={index}
                    whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                    className="p-4 rounded-2xl bg-neutral-950/20 border border-neutral-800/40 space-y-1.5 transition-all text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
                        {item.icon}
                      </div>
                      <h3 className="text-sm font-bold text-neutral-200">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed pl-9">
                      {item.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

          </div>

        </motion.div>

        {/* Footer Support Info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-xs text-neutral-500"
        >
          <a href="mailto:support@durgashaktifoils.com" className="flex items-center gap-1.5 hover:text-neutral-300 transition-colors">
            <Mail className="w-3.5 h-3.5" />
            support@durgashaktifoils.com
          </a>
          <div className="hidden sm:block w-[1px] h-3 bg-neutral-800" />
          <a href="tel:+919876543210" className="flex items-center gap-1.5 hover:text-neutral-300 transition-colors">
            <Phone className="w-3.5 h-3.5" />
            +91 98765 43210
          </a>
        </motion.div>

      </div>
    </div>
  );
};

export default Maintenance;

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Flame, Sparkles, Award, Users, Warehouse, HeartHandshake, Compass } from 'lucide-react';
import { reveal, revealSlow, fadeInUp, staggerContainer } from '../animations/variants';

const About = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden" style={{ fontFamily: 'Outfit, sans-serif' }}>
      
      {/* ── HERO SECTION WITH LUXURIOUS METALLIC GRADIENT ────────────────── */}
      <section className="relative pt-24 pb-20 md:pt-36 md:pb-28 bg-slate-950 text-white overflow-hidden">
        {/* Glowing abstract background ornaments */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none -ml-24 -mb-24" />
        
        {/* Technical mesh background texture */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 relative z-10">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-3xl"
          >
            <motion.span 
              variants={fadeInUp} 
              className="text-xs font-black tracking-[0.3em] text-primary bg-primary/10 px-3.5 py-1.5 rounded-full uppercase mb-6 inline-block"
            >
              Our Heritage & Quality
            </motion.span>
            
            <motion.h1 
              variants={fadeInUp} 
              className="text-4xl md:text-6xl font-black tracking-tight leading-none mb-8"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Preserving Freshness.<br />
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Redefining Protection.
              </span>
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp} 
              className="text-lg md:text-xl text-slate-300 font-light leading-relaxed text-balance"
            >
              Durga Shakti Foils was built on a bold promise: that the packaging tools protecting our food should meet the same elite, pure standards as the ingredients we cook with. We manufacture culinary-grade aluminum foils that lock in nutrition and guarantee absolute hygiene.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── BY THE NUMBERS: INTERACTIVE STATS CARD BLOCK ────────────────── */}
      <section className="relative z-20 -mt-10 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { value: "10K+", label: "Happy Customers", icon: Users, desc: "Across homes & caterers" },
            { value: "100%", label: "Pure Food-Grade", icon: ShieldCheck, desc: "Virgin alloy aluminum" },
            { value: "ISO 9", label: "Certified Facility", icon: Award, desc: "9001:2015 strict controls" },
            { value: "Hyderabad", label: "State-of-the-Art", icon: Warehouse, desc: "Maruthi Nagar, Mallampet" },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-white/95 backdrop-blur-xl border border-slate-200/80 p-5 md:p-6 rounded-2xl shadow-xl shadow-slate-100 flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <stat.icon className="w-5 h-5" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {stat.value}
                </h3>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {stat.label}
                </p>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {stat.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── THE DURGA SHAKTI EDGE: HIGH PERFORMANCE FEATURES ───────────── */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
            <span className="text-xs font-black tracking-[0.2em] text-primary uppercase mb-3 inline-block">Engineered Excellence</span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Why Durga Shakti Foils Stands Out
            </h2>
            <p className="text-slate-500 font-medium mt-3">
              Every millimeter of our custom alloy is designed to offer maximum protection, heat-preservation, and tear-resistance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Micro-Annealed Hygiene",
                desc: "Processed at extreme temperatures to clean the aluminum, leaving a pristine antibacterial barrier that blocks light, odor, and moisture completely.",
                icon: ShieldCheck,
                color: "from-blue-500 to-indigo-500"
              },
              {
                title: "High Heat Retention",
                desc: "Excellent thermal insulation. Keeps home-cooked food piping hot and commercial catering trays fresh and pristine for hours.",
                icon: Flame,
                color: "from-amber-500 to-rose-500"
              },
              {
                title: "Extra Strength Alloy",
                desc: "Engineered to prevent punctures and tearing under stress. Wraps perfectly around meats, containers, and baking dishes without ripping.",
                icon: Sparkles,
                color: "from-teal-500 to-emerald-500"
              }
            ].map((edge, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15, duration: 0.6 }}
                className="bg-white border border-slate-100 p-8 rounded-3xl shadow-sm hover:shadow-lg transition-shadow duration-300 relative group overflow-hidden"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${edge.color}`} />
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-800 group-hover:scale-110 transition-transform mb-6">
                  <edge.icon className="w-6 h-6 text-slate-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {edge.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  {edge.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BRAND MISSION & VISION CAROUSEL/GRID ────────────────────────── */}
      <section className="py-20 md:py-28 bg-slate-900 text-white relative overflow-hidden">
        {/* Glow behind section */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-black tracking-[0.2em] text-primary uppercase">Our Vision & Core</span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Committed to a Greener, Cleaner Kitchen
              </h2>
              <p className="text-slate-300 font-light leading-relaxed">
                Durga Shakti Foils is passionate about pure aluminum manufacturing that respects our planet. Aluminum is 100% endlessly recyclable, helping you wrap food securely without creating non-degradable plastic waste.
              </p>
              <div className="space-y-4 pt-4">
                <div className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0 mt-1">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100">Our Core Mission</h4>
                    <p className="text-sm text-slate-400 mt-1">To lead the premium packaging industry through rigorous quality, innovative technology, and customer-first service.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0 mt-1">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100">Absolute Integrity</h4>
                    <p className="text-sm text-slate-400 mt-1">Every roll undergoes 6 strict quality control tests to guarantee it is completely safe for direct food contact.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Visual Glassmorphic Card Container */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md shadow-2xl relative">
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-gradient-to-br from-primary to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Award className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h3 className="text-lg font-black tracking-[0.2em] uppercase text-primary mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Quality Standards Met
              </h3>
              <div className="space-y-6">
                {[
                  { title: "ISO 9001:2015 Certified", desc: "Rigorous global manufacturing processes & standard controls." },
                  { title: "100% Virign Pure Aluminum", desc: "No scrap, no low-grade alloys—only pure, pristine raw material." },
                  { title: "Lead & Heavy-Metal Free", desc: "Chemical-free surfaces perfectly safe for extreme hot or cold foods." }
                ].map((item, idx) => (
                  <div key={idx} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                    <h5 className="font-bold text-slate-100">{item.title}</h5>
                    <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION ─────────────────────────────────────────────── */}
      <section className="py-24 max-w-4xl mx-auto px-6 text-center">
        <span className="text-xs font-black tracking-[0.2em] text-primary uppercase mb-4 inline-block">Join the family</span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Wrap Your Food with Care & Strength
        </h2>
        <p className="text-slate-500 font-medium max-w-xl mx-auto mb-8">
          Experience the incredible strength and thermal preservation of Durga Shakti Foils today. Explore our premium range and find the perfect packaging fit for your needs.
        </p>
        <motion.a
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          href="/shop"
          className="inline-block bg-primary hover:bg-primary/95 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-primary/20 transition-all text-sm"
        >
          Explore Product Catalog
        </motion.a>
      </section>

    </div>
  );
};

export default About;

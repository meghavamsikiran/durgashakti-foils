import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import reviewService from '../services/review.service';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  Leaf,
  Flame,
  ShieldCheck,
  Layers,
  Ruler,
  Thermometer,
  Recycle,
  Check,
  X,
  Star,
  MoreVertical,
  Utensils,
  Building2,
  ShoppingBag,
  Soup,
  HeartPulse,
  Landmark,
  Factory,
  Store,
  CheckCircle2
} from 'lucide-react';

const metrics = [
  { icon: Layers, num: '11', unit: 'Microns', sub: 'Thickness', color: 'text-brand-green' },
  { icon: Ruler, num: '72', unit: 'Meters', sub: 'Length', color: 'text-brand-green' },
  { icon: Leaf, num: '100%', unit: 'Virgin', sub: 'Aluminium', color: 'text-brand-green' },
  { icon: Thermometer, num: 'Heat', unit: 'Lock', sub: 'Technology', color: 'text-brand-amber' },
  { icon: Recycle, num: 'Eco', unit: 'Friendly', sub: 'Recyclable', color: 'text-brand-green' }
];

const features = [
  { icon: Leaf, title: '100% Pure', sub: 'Virgin Aluminium', color: 'text-brand-green' },
  { icon: Flame, title: 'Heat Lock', sub: 'Technology', color: 'text-brand-amber' },
  { icon: ShieldCheck, title: 'Safe for Food', sub: 'Always', color: 'text-brand-green' }
];

const comparisonRows = [
  { feature: 'Heat Retention', normal: <X className="w-5 h-5 text-brand-red mx-auto" />, durga: <Check className="w-5 h-5 text-brand-green mx-auto" /> },
  { feature: 'Leak Protection', normal: <X className="w-5 h-5 text-brand-red mx-auto" />, durga: <Check className="w-5 h-5 text-brand-green mx-auto" /> },
  { feature: 'Food Freshness', normal: <span className="text-slate-500 dark:text-slate-400">Medium</span>, durga: <span className="text-brand-green font-semibold">High</span> },
  { feature: 'Strength', normal: <span className="text-slate-500 dark:text-slate-400">Low</span>, durga: <span className="text-brand-green font-semibold">High</span> },
  { feature: 'Food Safety', normal: <span className="text-slate-500 dark:text-slate-400">Basic</span>, durga: <span className="text-brand-green font-semibold">Certified</span> }
];

const industries = [
  { icon: Utensils, label: 'Restaurants' },
  { icon: Building2, label: 'Hotels' },
  { icon: ShoppingBag, label: 'Takeaways' },
  { icon: Soup, label: 'Catering' },
  { icon: HeartPulse, label: 'Hospitals' },
  { icon: Landmark, label: 'Institutions' },
  { icon: Factory, label: 'Food Manufacturers' },
  { icon: Store, label: 'Retail Stores' }
];

const googleReviews = [
  {
    name: "Mharishnaick Mharishnaick",
    rating: 5,
    date: "3 months ago",
    text: "Durgashakti Foils Pvt Ltd stands out for its premium quality and trustworthy service. The finishing and durability of their products are top-notch. Customer handling is very professional and friendly. Delivery is always on time, and they maintain high standards in everything they do. Proud to see such a growing and promising company. Highly recommended.",
    avatar: "MM",
    avatarBg: "bg-indigo-600 dark:bg-indigo-700",
    shareUrl: "https://maps.app.goo.gl/Bvgxaf6kD6MbhJZ99"
  },
  {
    name: "Mili Mili",
    rating: 5,
    date: "3 months ago",
    text: "Good and affordable in price.\nIt helped me a lot to keep my food hot and fresh thankyou durgashakti foils I bought a 72 m foil roll the owner gave me free a 6m roll also. Very happy and satisfied by service of them.",
    avatar: "MM",
    avatarBg: "bg-pink-600 dark:bg-pink-700",
    shareUrl: "https://maps.app.goo.gl/FDfwnyBdn9SRZFWL6"
  },
  {
    name: "Varma",
    rating: 5,
    date: "4 months ago",
    text: "They provide Good quality house foil. Which keeps food hot for soo long i have bought couple of their products in affordable price and superb quality. 👌 the owner is also very polite and well behaved with me very satisfied with the service.",
    avatar: "V",
    avatarBg: "bg-slate-600 dark:bg-slate-700",
    shareUrl: "https://maps.app.goo.gl/TWFb9tcqUwGtBxtc8"
  },
  {
    name: "Hemanth Babu",
    rating: 5,
    date: "4 months ago",
    text: "Quality is amazing and food remains hot for long time. Thanks to DurgaShaktiFoils.",
    avatar: "HB",
    avatarBg: "bg-yellow-600 dark:bg-yellow-700",
    shareUrl: "https://maps.app.goo.gl/bcWq5kQTxQKBwSqx8"
  },
  {
    name: "Paritosh Debbarma",
    rating: 5,
    date: "3 months ago",
    text: "Good quality product in affordable price. Satisfied with the service.😜👍",
    avatar: "PD",
    avatarBg: "bg-teal-600 dark:bg-teal-700",
    shareUrl: "https://maps.app.goo.gl/ArQNtUWttRxpy5P27"
  },
  {
    name: "Akash Das",
    rating: 5,
    date: "3 months ago",
    text: "Very advanced technology used, good quality products and very low prices",
    avatar: "AD",
    avatarBg: "bg-blue-600 dark:bg-blue-700",
    shareUrl: "https://maps.app.goo.gl/e6bCGRGvdU1pmdnP9"
  }
];

// Animation Variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const Home = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const [gmapStats, setGmapStats] = useState({
    rating_average: 5.0,
    review_count: 56,
    rating_distribution: { "5": 56, "4": 0, "3": 0, "2": 0, "1": 0 }
  });

  useEffect(() => {
    reviewService.getGoogleSummary()
      .then(data => {
        if (data) {
          setGmapStats(data);
        }
      })
      .catch(err => {
        console.warn("Failed to load live Google summary:", err);
      });
  }, []);

  const videoWrapperRef = useRef(null);

  useEffect(() => {
    const wrapper = videoWrapperRef.current;
    if (wrapper) {
      const vid = wrapper.querySelector('video');
      if (vid) {
        vid.playbackRate = 0.75;
        vid.defaultMuted = true;
        vid.muted = true;
        
        vid.addEventListener('play', () => {
          vid.style.opacity = '1';
        });

        const tryPlay = () => {
          const promise = vid.play();
          if (promise !== undefined) {
            promise.catch(() => {
              // Safari Low Power Mode fallback: play on first user interaction
              const startPlayOnTouch = () => {
                vid.play();
                window.removeEventListener('touchstart', startPlayOnTouch);
                window.removeEventListener('click', startPlayOnTouch);
                window.removeEventListener('scroll', startPlayOnTouch);
              };
              window.addEventListener('touchstart', startPlayOnTouch, { once: true });
              window.addEventListener('click', startPlayOnTouch, { once: true });
              window.addEventListener('scroll', startPlayOnTouch, { once: true });
            });
          }
        };

        if (vid.readyState >= 2) {
          tryPlay();
        } else {
          vid.addEventListener('loadeddata', tryPlay, { once: true });
        }
      }
    }
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#090d0b] text-slate-900 dark:text-white font-inter selection:bg-brand-green/30 overflow-hidden transition-colors duration-300" data-testid="home-page">
      <style>{`
        .text-brand-green { color: oklch(0.78 0.22 145); }
        .bg-brand-green { background-color: oklch(0.78 0.22 145); }
        .text-brand-yellow { color: oklch(0.85 0.18 90); }
        .text-brand-amber { color: oklch(0.78 0.17 70); }
        .text-brand-red { color: oklch(0.62 0.22 25); }
        .border-brand-green { border-color: oklch(0.78 0.22 145); }

        .font-display { font-family: 'Playfair Display', serif; }
      `}</style>

      {/* Cinematic Video Hero Section - Always Dark for Contrast */}
      <section ref={heroRef} data-force-dark="true" className="hero-section-dark relative w-full h-[100svh] overflow-hidden flex items-center justify-center border-b border-slate-200 dark:border-white/5 bg-[#090d0b]">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0 w-full h-full z-0 bg-[#090d0b]">
          {/* Background Poster Image behind video to avoid Safari native poster controls */}
          <img 
            src="/hot-wrap-kitchen-cool.jpg" 
            alt="Hero fallback background" 
            className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
          />
          <div 
            ref={videoWrapperRef}
            className="relative z-10 w-full h-full pointer-events-none"
            dangerouslySetInnerHTML={{
              __html: `
                <video
                  autoplay
                  loop
                  muted
                  playsinline
                  webkit-playsinline
                  preload="auto"
                  disablepictureinpicture
                  disableremoteplayback
                  controlslist="nodownload nofullscreen noremoteplayback"
                  style="width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 1s ease-in-out;"
                >
                  <source src="/cinematic-hero.mp4" type="video/mp4" />
                </video>
              `
            }}
          />
          {/* Advanced Glassmorphic Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090d0b] via-[#090d0b]/70 to-[#090d0b]/40 backdrop-blur-[2px] z-20"></div>
        </motion.div>

        {/* Hero Content - Forced White text for Video contrast */}
        <div className="relative z-10 w-full max-w-full px-6 md:px-10 lg:px-16 xl:px-24 2xl:px-32">
          <motion.div 
            className="w-full lg:max-w-[850px] xl:max-w-[1000px] mt-16"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-green/30 bg-brand-green/10 text-brand-green text-[11px] font-bold tracking-wide backdrop-blur-md shadow-2xl">
               <ShieldCheck className="w-3.5 h-3.5" />
              100% FOOD GRADE CERTIFIED
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="font-display mt-6 text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] font-black leading-[1.05] tracking-tight drop-shadow-2xl">
              <span className="block text-white">Wrap it Right,</span>
              <span className="block text-brand-yellow hero-text-amber">Keep it Hot,</span>
              <span className="block text-brand-green hero-text-emerald">Keep it Fresh!</span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="mt-8 text-slate-200 text-base md:text-lg leading-relaxed text-left max-w-2xl font-medium drop-shadow-lg">
              Experience the strength of premium food-grade aluminium foil engineered for commercial resilience and unmatched household hygiene. 
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-10 flex flex-wrap items-center gap-6">
              <button
                onClick={() => navigate('/shop')}
                className="group relative inline-flex items-center gap-3 bg-brand-green text-black font-extrabold px-8 py-4 rounded-full hover:bg-brand-green/90 transition-all transform hover:-translate-y-1 shadow-[0_10px_40px_rgba(56,210,90,0.4)] overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Shop Now
                  <span className="w-7 h-7 rounded-full border border-black/20 flex items-center justify-center group-hover:translate-x-1 transition-transform bg-white/20">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out z-0"></div>
              </button>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* Stats Strip with Scroll Reveal */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
        className="relative z-20 max-w-7xl mx-auto px-6 -mt-16 pb-16"
      >
        <div className="rounded-3xl bg-white/95 dark:bg-[#0c1816]/90 backdrop-blur-2xl border border-slate-200 dark:border-brand-green/20 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] px-8 py-8 grid grid-cols-2 md:grid-cols-5 gap-8 transition-colors">
          {metrics.map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-3 group">
              <div className={`p-3 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 group-hover:scale-110 transition-all duration-300 ${s.color}`}>
                <s.icon className="w-6 h-6 shrink-0" />
              </div>
              <div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-3xl font-black tracking-tight ${s.color}`}>{s.num}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-extrabold uppercase">{s.unit}</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold tracking-wide uppercase mt-1">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Authentic Product Reference Section */}
      <section className="relative bg-white dark:bg-[#09100d] py-20 border-b border-slate-200 dark:border-white/5 overflow-hidden transition-colors">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="rounded-3xl overflow-hidden border border-slate-200 dark:border-brand-green/20 shadow-2xl dark:shadow-[0_0_50px_rgba(56,210,90,0.15)] group relative bg-white dark:bg-transparent"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none"></div>
            <img
              src="/hot-wrap-kitchen-cool.jpg"
              alt="Authentic Durga Shakti HOT WRAP 72M Box"
              className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700 relative z-0"
            />
              <div className="absolute bottom-8 left-8 z-20 flex items-center gap-4" data-force-dark="true">
                <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-green" />
                  Genuine Product Shot
                </div>
              </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-amber/30 bg-brand-amber/10 text-amber-700 dark:text-brand-amber text-xs font-extrabold uppercase tracking-wider">
              From Kitchen To Craving, Stays Hot
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-slate-900 dark:text-white drop-shadow-md">
              Wrap it Right. Keep it Hot. <br />
              <span className="text-brand-green italic">Serve with Love.</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg font-medium">
              Balanced 11 Micron thickness engineered for daily domestic and commercial kitchen wrapping. Strong enough to wrap rotis, rolls, paneer tikka, and sandwiches without tearing.
            </p>
            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-gradient-to-br from-white/5 to-white/[0.02] border border-slate-200 dark:border-white/10 shadow-md dark:shadow-lg backdrop-blur-sm">
                <div className="text-4xl font-black text-brand-green drop-shadow-sm">220+</div>
                <div className="text-sm text-slate-800 dark:text-slate-300 font-bold mt-2">Rotis Wrapped</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-1">Per 72M Roll</div>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-gradient-to-br from-white/5 to-white/[0.02] border border-slate-200 dark:border-white/10 shadow-md dark:shadow-lg backdrop-blur-sm">
                <div className="text-4xl font-black text-brand-yellow drop-shadow-sm">180+</div>
                <div className="text-sm text-slate-800 dark:text-slate-300 font-bold mt-2">Rolls Secured</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-1">Everyday Power</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Commercial Bulk Dispatch Section */}
      <section className="relative bg-slate-50 dark:bg-[#060a08] py-24 border-b border-slate-200 dark:border-white/5 overflow-hidden transition-colors">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-yellow/5 dark:bg-brand-yellow/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8 order-2 lg:order-1"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-green/30 bg-brand-green/10 text-green-700 dark:text-brand-green text-xs font-extrabold uppercase tracking-wider">
              Pan-India Commercial Supply Chain
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-slate-900 dark:text-white drop-shadow-sm">
              Packed with Quality. <br />
              <span className="text-yellow-600 dark:text-brand-yellow">Sealed with Trust.</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg font-medium">
              Direct factory bulk dispatch available for distributors, hotels, caterers, and supermarkets across India. Durable heavy-duty corrugated shipping cartons protect every roll from factory to destination.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center backdrop-blur-sm shadow-sm dark:shadow-none">
                <div className="text-2xl font-black text-brand-green">100%</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-2">Virgin Material</div>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center backdrop-blur-sm shadow-sm dark:shadow-none">
                <div className="text-2xl font-black text-yellow-600 dark:text-brand-yellow">10KG</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-2">Bulk Rolls</div>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center backdrop-blur-sm shadow-sm dark:shadow-none">
                <div className="text-2xl font-black text-amber-600 dark:text-brand-amber">Fast</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-2">Direct Logistics</div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <img 
              src="/hot-wrap-kitchen-warm.jpg" 
              alt="HOT WRAP Packaging Warm Display" 
              className="w-full h-auto rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl hover:scale-[1.02] transition-transform duration-500 object-cover" 
            />
          </motion.div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="relative bg-white dark:bg-[#090d0b] py-24 border-b border-slate-200 dark:border-white/5 transition-colors">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr_1.35fr] gap-8 xl:gap-16 items-center"
          >
            {/* Normal Foil Image Container */}
            <motion.div variants={fadeInUp} className="flex flex-col items-center w-full">
              <div className="w-full rounded-3xl overflow-hidden shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-500 hover:scale-[1.02] border border-slate-200 dark:border-white/10">
                <img
                  src="/media__1780688276832.webp"
                  alt="Normal Foil wrap test"
                  className="w-full h-auto block object-cover"
                />
              </div>
            </motion.div>

            {/* Comparison Table */}
            <motion.div variants={fadeInUp} className="order-first lg:order-none w-full">
              <h2 className="font-display text-4xl md:text-5xl font-black text-center mb-10 tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
                Normal Foil vs <br className="hidden md:block"/> <span className="text-brand-green">Durga Shakti Foil</span>
              </h2>
              <div className="rounded-3xl border border-slate-300 dark:border-brand-green/20 bg-white dark:bg-[#0c1816]/60 backdrop-blur-xl overflow-hidden shadow-xl dark:shadow-2xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-brand-green/20 bg-slate-50 dark:bg-brand-green/5 text-slate-600 dark:text-slate-300">
                      <th className="text-left px-6 py-5 font-black text-brand-green uppercase tracking-wider text-xs">Feature</th>
                      <th className="px-6 py-5 font-black uppercase tracking-wider text-xs text-center text-slate-500 dark:text-slate-400">Normal Foil</th>
                      <th className="px-6 py-5 font-black uppercase tracking-wider text-xs text-center text-brand-green bg-green-50/50 dark:bg-brand-green/10">Durga Shakti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-5 font-bold text-slate-800 dark:text-slate-200">{r.feature}</td>
                        <td className="px-6 py-5 text-center">{r.normal}</td>
                        <td className="px-6 py-5 text-center bg-green-50/20 dark:bg-brand-green/[0.02]">{r.durga}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Durga Shakti Foil Image Container */}
            <motion.div variants={fadeInUp} className="flex flex-col items-center w-full">
              <div className="w-full rounded-3xl overflow-hidden shadow-2xl dark:shadow-[0_20px_50px_rgba(56,210,90,0.15)] transition-transform duration-500 hover:scale-[1.02] border border-slate-200 dark:border-brand-green/30">
                <img
                  src="/hot-wrap-kitchen-cool.jpg"
                  alt="Durga Shakti HOT WRAP Foil test"
                  className="w-full h-auto block object-cover"
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Google Reviews Section */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="mt-32 pt-16 border-t border-slate-200 dark:border-white/10"
          >
            <motion.div variants={fadeInUp} className="mb-16 text-center">
              <div className="inline-block px-4 py-1.5 rounded-full bg-brand-green/10 border border-brand-green/30 text-[10px] tracking-[0.25em] font-extrabold text-green-700 dark:text-brand-green mb-6 uppercase shadow-sm">
                GOOGLE REVIEWS
              </div>
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
                What Our <span className="text-brand-green">Customers</span> Say
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg mt-6 max-w-2xl mx-auto font-medium">
                Trusted by commercial kitchens, caterers, and home cooks across India.
              </p>
            </motion.div>

            {/* Live Ratings Summary Widget – Google Maps style */}
            <motion.div variants={fadeInUp} className="mb-16 max-w-2xl mx-auto">
              <div
                className="rounded-3xl overflow-hidden shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0e1612]"
              >
                {/* Top strip with Google branding */}
                <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6" aria-hidden="true">
                      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.4 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2 14.1-5.3l-6.5-5.5C29.5 35 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
                      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6.5 5.5C41.8 36 44 30.4 44 24c0-1.3-.1-2.6-.4-3.9z"/>
                    </svg>
                    <span className="text-base font-black text-slate-900 dark:text-white drop-shadow-sm">Google Reviews</span>
                  </div>
                  <a
                    href="https://www.google.com/maps/place/DurgaShaktiFoils+PVT.LTD/@17.5565275,78.3685954,19z/data=!4m8!3m7!1s0x3bcb8dae4cb75cf1:0x72850fd00e387dd3!8m2!3d17.5565262!4d78.3692391!9m1!1b1!16s%2Fg%2F11y16ptlbn?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold px-4 py-2 rounded-full transition-all bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10"
                  >
                    View on Maps →
                  </a>
                </div>

                {/* Main content */}
                <div className="flex flex-col sm:flex-row items-stretch">
                  {/* Left – Big score */}
                  <div className="flex flex-col items-center justify-center gap-2 px-10 py-10 shrink-0 sm:border-r border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20">
                    <div className="text-[5rem] font-black leading-none tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
                      {gmapStats.rating_average.toFixed(1)}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {[...Array(5)].map((_, idx) => (
                        <Star key={idx} className="w-6 h-6 fill-[#fbbc04] text-[#fbbc04] drop-shadow-sm" />
                      ))}
                    </div>
                    <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2">
                      {gmapStats.review_count} verified reviews
                    </div>
                  </div>

                  {/* Right – Distribution bars */}
                  <div className="flex-1 flex flex-col justify-center gap-3 px-8 py-8 bg-white dark:bg-transparent">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = gmapStats.rating_distribution?.[stars.toString()] || 0;
                      const total = gmapStats.review_count || 1;
                      const percent = Math.round((count / total) * 100);
                      return (
                        <div key={stars} className="flex items-center gap-4 w-full">
                          <span className="w-3 text-right text-sm font-black text-slate-700 dark:text-slate-300">{stars}</span>
                          <Star className="w-3.5 h-3.5 shrink-0 fill-[#fbbc04] text-[#fbbc04]" />
                          <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-inner">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${percent}%` }}
                              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                              viewport={{ once: true }}
                              className="h-full rounded-full"
                              style={{ background: percent === 0 ? 'transparent' : '#fbbc04' }}
                            />
                          </div>
                          <span className="w-8 text-right text-sm font-bold text-slate-500 dark:text-slate-400">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {googleReviews.map((rev, i) => (
                <motion.div
                  variants={fadeInUp}
                  key={i}
                  className="rounded-3xl border p-8 relative flex flex-col justify-between transition-all duration-500 group shadow-lg dark:shadow-xl bg-white dark:bg-[#0e1612] border-slate-200 dark:border-white/5 hover:border-brand-green/40 dark:hover:border-brand-green/40 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(56,210,90,0.1)]"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full ${rev.avatarBg} text-white font-black text-base flex items-center justify-center shadow-md border border-white/10`}>
                          {rev.avatar}
                        </div>
                        <div className="text-left">
                          <a
                            href={rev.shareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-black text-base text-slate-900 dark:text-white hover:text-brand-green transition-colors cursor-pointer line-clamp-1"
                          >
                            {rev.name}
                          </a>
                          <div className="flex items-center gap-1 mt-1">
                            {[...Array(5)].map((_, idx) => (
                              <Star key={idx} className="w-3.5 h-3.5 fill-[#fbbc04] text-[#fbbc04]" />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Review text */}
                    <p className="text-sm leading-relaxed text-left whitespace-pre-line font-medium mb-6 text-slate-700 dark:text-slate-300">
                      "{rev.text}"
                    </p>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-500 font-semibold mt-auto pt-4 border-t border-slate-100 dark:border-white/5">
                    {rev.date}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Industries served */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="mt-32 pt-16 border-t border-slate-200 dark:border-white/10"
          >
            <div className="text-[11px] tracking-[0.3em] font-black text-brand-green mb-12 uppercase text-center drop-shadow-sm">
              INDUSTRIES WE SERVE
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6">
              {industries.map((ind, i) => (
                <motion.div
                  variants={fadeInUp}
                  key={i}
                  className="group aspect-square rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0e1612] hover:border-brand-green/50 hover:bg-green-50 dark:hover:bg-brand-green/10 transition-all duration-500 flex flex-col items-center justify-center gap-4 p-4 cursor-pointer shadow-md dark:shadow-lg hover:shadow-[0_0_30px_rgba(56,210,90,0.2)]"
                  onClick={() => navigate('/shop')}
                >
                  <ind.icon className="w-10 h-10 text-slate-400 group-hover:text-brand-green transition-colors duration-500 drop-shadow-sm" strokeWidth={1.5} />
                  <div className="text-xs sm:text-sm text-center text-slate-700 dark:text-slate-300 group-hover:text-brand-green dark:group-hover:text-white font-bold leading-tight transition-colors">{ind.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default Home;

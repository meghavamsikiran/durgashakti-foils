import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import reviewService from '../services/review.service';
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
  ThumbsUp,
  MoreVertical,
  Utensils,
  Building2,
  ShoppingBag,
  Soup,
  HeartPulse,
  Landmark,
  Factory,
  Store
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
  { feature: 'Food Freshness', normal: <span className="text-slate-400">Medium</span>, durga: <span className="text-brand-green font-semibold">High</span> },
  { feature: 'Strength', normal: <span className="text-slate-400">Low</span>, durga: <span className="text-brand-green font-semibold">High</span> },
  { feature: 'Food Safety', normal: <span className="text-slate-400">Basic</span>, durga: <span className="text-brand-green font-semibold">Certified</span> }
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
    avatarBg: "bg-indigo-700",
    shareUrl: "https://maps.app.goo.gl/Bvgxaf6kD6MbhJZ99"
  },
  {
    name: "Mili Mili",
    rating: 5,
    date: "3 months ago",
    text: "Good and affordable in price.\nIt helped me a lot to keep my food hot and fresh thankyou durgashakti foils I bought a 72 m foil roll the owner gave me free a 6m roll also. Very happy and satisfied by service of them.",
    avatar: "MM",
    avatarBg: "bg-pink-700",
    shareUrl: "https://maps.app.goo.gl/FDfwnyBdn9SRZFWL6"
  },
  {
    name: "Varma",
    rating: 5,
    date: "4 months ago",
    text: "They provide Good quality house foil. Which keeps food hot for soo long i have bought couple of their products in affordable price and superb quality. 👌 the owner is also very polite and well behaved with me very satisfied with the service.",
    avatar: "V",
    avatarBg: "bg-slate-700",
    shareUrl: "https://maps.app.goo.gl/TWFb9tcqUwGtBxtc8"
  },
  {
    name: "Hemanth Babu",
    rating: 5,
    date: "4 months ago",
    text: "Quality is amazing and food remains hot for long time. Thanks to DurgaShaktiFoils.",
    avatar: "HB",
    avatarBg: "bg-yellow-700",
    shareUrl: "https://maps.app.goo.gl/bcWq5kQTxQKBwSqx8"
  },
  {
    name: "Paritosh Debbarma",
    rating: 5,
    date: "3 months ago",
    text: "Good quality product in affordable price. Satisfied with the service.😜👍",
    avatar: "PD",
    avatarBg: "bg-teal-700",
    shareUrl: "https://maps.app.goo.gl/ArQNtUWttRxpy5P27"
  },
  {
    name: "Akash Das",
    rating: 5,
    date: "3 months ago",
    text: "Very advanced technology used, good quality products and very low prices",
    avatar: "AD",
    avatarBg: "bg-blue-700",
    shareUrl: "https://maps.app.goo.gl/e6bCGRGvdU1pmdnP9"
  }
];

const Home = () => {
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = React.useState(() => localStorage.getItem('themeMode') || 'dark');
  const [theme, setTheme] = React.useState(() => localStorage.getItem('themeMode') || 'dark');

  React.useEffect(() => {
    const handleTheme = (e) => {
      setThemeMode(e.detail);
      setTheme(e.detail);
    };
    window.addEventListener('theme-toggle', handleTheme);
    return () => window.removeEventListener('theme-toggle', handleTheme);
  }, []);

  const isLight = themeMode === 'light';

  const [likes, setLikes] = useState({
    0: { count: 7, liked: false },
    1: { count: 5, liked: false },
    2: { count: 4, liked: false },
    3: { count: 6, liked: false },
    4: { count: 3, liked: false },
    5: { count: 2, liked: false }
  });

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

  const handleLike = (index) => {
    setLikes(prev => {
      const current = prev[index];
      return {
        ...prev,
        [index]: {
          count: current.liked ? current.count - 1 : current.count + 1,
          liked: !current.liked
        }
      };
    });
  };

  return (
    <main className="min-h-screen bg-[#0c1310] text-white font-inter selection:bg-brand-green/30" data-testid="home-page">
      <style>{`
        .text-brand-green { color: oklch(0.78 0.22 145); }
        .bg-brand-green { background-color: oklch(0.78 0.22 145); }
        .text-brand-yellow { color: oklch(0.85 0.18 90); }
        .text-brand-amber { color: oklch(0.78 0.17 70); }
        .text-brand-red { color: oklch(0.62 0.22 25); }
        .border-brand-green { border-color: oklch(0.78 0.22 145); }

        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 80s linear infinite;
        }
        .font-display {
          font-family: 'Playfair Display', serif;
        }
      `}</style>

      {/* Hero Section */}
      <div className="hero-section-dark relative overflow-hidden bg-[#0a0f0d] border-b border-white/5">
        {/* Absolute background image on the right for md+ screens - absolutely no gaps around top, bottom, or right */}
        <div className="absolute top-0 right-0 bottom-0 z-0 w-full md:w-[60%] lg:w-[55%] xl:w-[50%] hidden md:block">
          <img
            src="/hero-products.webp"
            alt="Durga Shakti Foils Premium Packing Solutions"
            loading="eager"
            fetchpriority="high"
            className="w-full h-full object-contain object-right-bottom block"
          />
        </div>
        
        {/* Gradient mask to blend background image seamlessly into dark background on the left */}
        <div
          className="absolute inset-0 z-0 pointer-events-none hidden md:block"
          style={{
            background:
              'linear-gradient(to right, #0a0f0d 0%, #0a0f0d 50%, rgba(10,15,13,0.7) 65%, rgba(10,15,13,0.15) 80%, rgba(10,15,13,0) 100%)'
          }}
        />

        {/* Hero Content */}
        <div className="relative z-10 max-w-full px-6 md:px-10 lg:px-16 xl:px-24 2xl:px-32 pt-16 md:pt-24 pb-20 grid md:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
          <div className="relative z-20 w-full lg:max-w-[850px] xl:max-w-[950px]">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-green/30 bg-brand-green/10 text-brand-green text-[11px] font-bold tracking-wide">
               <ShieldCheck className="w-3.5 h-3.5" />
              100% FOOD GRADE CERTIFIED
            </div>
            
            <h1 className="font-display mt-6 text-4xl md:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-left">
              <span className="block">Wrap it Right,</span>
              <span className="block text-brand-yellow">Keep it Hot,</span>
              <span className="block text-brand-green">Keep it Fresh!</span>
            </h1>

            <p className="mt-6 text-slate-300 text-sm md:text-base leading-relaxed text-left max-w-2xl">
              Choose Hot Wrap Foils for a healthier & greener tomorrow. Premium food-grade aluminium foil engineered for commercial strength and clinical hygiene.
            </p>

            <button
              onClick={() => navigate('/shop')}
              className="mt-8 group inline-flex items-center gap-3 bg-brand-green text-black font-extrabold px-7 py-3.5 rounded-full hover:shadow-[0_10px_30px_rgba(56,210,90,0.3)] transition-all transform hover:-translate-y-0.5"
            >
              Shop Now
              <span className="w-6 h-6 rounded-full border border-black/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>

            {/* Feature Badges */}
            <div className="mt-12 flex flex-wrap gap-8">
              {features.map((f, i) => (
                <div key={i} className="flex flex-col items-start gap-2">
                  <div className={`w-11 h-11 rounded-full border border-white/10 bg-white/5 flex items-center justify-center ${f.color}`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black leading-tight text-white">{f.title}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">{f.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spacer column for desktop to not overlap text, and fallback image for mobile */}
          <div className="relative w-full h-full min-h-[250px] md:min-h-0 md:h-auto flex items-end justify-end md:hidden">
            <img
              src="/hero-products.webp"
              alt="Durga Shakti Foils Premium Packing Solutions"
              loading="eager"
              fetchpriority="high"
              className="w-full h-auto object-contain mx-auto block"
            />
          </div>
        </div>

        {/* Stats Strip */}
        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-16">
          <div className="rounded-2xl bg-[#0c1816]/80 backdrop-blur-md border border-white/10 px-6 py-6 grid grid-cols-2 md:grid-cols-5 gap-6">
            {metrics.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <s.icon className={`w-8 h-8 shrink-0 ${s.color}`} />
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-black tracking-tight ${s.color}`}>{s.num}</span>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">{s.unit}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Comparison Section */}
      <section className="relative bg-[#080d0b] py-20 border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr_1.35fr] gap-8 xl:gap-16 items-center">
            {/* Normal Foil Image Container */}
            <div className="flex flex-col items-center w-full">
              <div className="w-full rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
                <img
                  src="/media__1780688276832.webp"
                  alt="Normal Foil wrap test"
                  className="w-full h-auto block"
                />
              </div>
            </div>

            {/* Comparison Table */}
            <div className="order-first lg:order-none w-full">
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-black text-center mb-8 tracking-tight">
                Normal Foil vs <span className="text-brand-green">Durga Shakti Foil</span>
              </h2>
              <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-slate-300">
                      <th className="text-left px-6 py-4 font-bold text-brand-green uppercase tracking-wider text-xs">Feature</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-center">Normal Foil</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-center text-brand-green">Durga Shakti Foil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((r, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-200">{r.feature}</td>
                        <td className="px-6 py-4 text-center">{r.normal}</td>
                        <td className="px-6 py-4 text-center">{r.durga}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Durga Shakti Foil Image Container */}
            <div className="flex flex-col items-center w-full">
              <div className="w-full rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
                <img
                  src="/durga-shakti-foil-new.jpg"
                  alt="Durga Shakti Foil heat lock test"
                  className="w-full h-auto block"
                />
              </div>
            </div>
          </div>

          {/* Google Reviews Section */}
          <div className="mt-24 border-t border-white/10 pt-16">
            <div className="mb-12">
              <div className="text-[10px] tracking-[0.25em] font-extrabold text-brand-green mb-3 uppercase">
                GOOGLE REVIEWS
              </div>
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-black tracking-tight">
                What Our <span className="text-brand-green">Customers</span> Say
              </h2>
              <p className="text-slate-400 text-sm mt-3 max-w-xl">
                Trusted by commercial kitchens, caterers, and home cooks across India.
              </p>
            </div>

            {/* Live Ratings Summary Widget – Google Maps style */}
            <div className="mb-12 max-w-2xl mx-auto">
              <div
                className="rounded-2xl overflow-hidden shadow-xl"
                style={{
                  background: isLight ? '#ffffff' : '#131b17',
                  border: isLight ? '1px solid #d1ddd8' : '1px solid rgba(255,255,255,0.07)'
                }}
              >
                {/* Top strip with Google branding */}
                <div
                  className="flex items-center justify-between px-6 pt-5 pb-3 border-b"
                  style={{ borderColor: isLight ? '#e2ebe5' : 'rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
                      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.4 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2 14.1-5.3l-6.5-5.5C29.5 35 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
                      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6.5 5.5C41.8 36 44 30.4 44 24c0-1.3-.1-2.6-.4-3.9z"/>
                    </svg>
                    <span className="text-sm font-bold" style={{ color: isLight ? '#1e2d28' : '#e2e8f0' }}>Google Reviews</span>
                  </div>
                  <a
                    href="https://www.google.com/maps/place/DurgaShaktiFoils+PVT.LTD/@17.5565275,78.3685954,19z/data=!4m8!3m7!1s0x3bcb8dae4cb75cf1:0x72850fd00e387dd3!8m2!3d17.5565262!4d78.3692391!9m1!1b1!16s%2Fg%2F11y16ptlbn?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                    style={{
                      background: isLight ? '#eaf2ec' : 'rgba(255,255,255,0.07)',
                      color: isLight ? '#006e1b' : '#7dd5a8'
                    }}
                  >
                    View on Google Maps →
                  </a>
                </div>

                {/* Main content */}
                <div className="flex flex-col sm:flex-row items-stretch">
                  {/* Left – Big score */}
                  <div
                    className="flex flex-col items-center justify-center gap-1.5 px-8 py-7 shrink-0 sm:border-r"
                    style={{ borderColor: isLight ? '#e2ebe5' : 'rgba(255,255,255,0.06)' }}
                  >
                    <div className="text-[4.5rem] font-black leading-none tracking-tight" style={{ color: isLight ? '#0f1f15' : '#f1f5f0' }}>
                      {gmapStats.rating_average.toFixed(1)}
                    </div>
                    <div className="flex items-center gap-0.5 mt-1">
                      {[...Array(5)].map((_, idx) => (
                        <Star key={idx} className="w-5 h-5" style={{ fill: '#fbbc04', color: '#fbbc04' }} />
                      ))}
                    </div>
                    <div className="text-xs font-semibold mt-1" style={{ color: isLight ? '#5a706a' : '#94a3b8' }}>
                      {gmapStats.review_count} reviews
                    </div>
                  </div>

                  {/* Right – Distribution bars */}
                  <div className="flex-1 flex flex-col justify-center gap-2.5 px-6 py-7">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = gmapStats.rating_distribution?.[stars.toString()] || 0;
                      const total = gmapStats.review_count || 1;
                      const percent = Math.round((count / total) * 100);
                      return (
                        <div key={stars} className="flex items-center gap-3 w-full">
                          <span className="w-3 text-right text-xs font-semibold shrink-0" style={{ color: isLight ? '#5a706a' : '#94a3b8' }}>{stars}</span>
                          <Star className="w-3 h-3 shrink-0" style={{ fill: '#fbbc04', color: '#fbbc04' }} />
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: isLight ? '#e8f0eb' : 'rgba(255,255,255,0.07)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${percent}%`, background: percent === 0 ? 'transparent' : '#fbbc04' }}
                            />
                          </div>
                          <span className="w-6 text-right text-xs font-semibold shrink-0" style={{ color: isLight ? '#4a5e58' : '#64748b' }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {googleReviews.map((rev, i) => (
                <div
                  key={i}
                  className="rounded-2xl border p-6 relative flex flex-col justify-between transition-all duration-300 group shadow-md"
                  style={{
                    background: isLight ? '#ffffff' : '#131b17',
                    borderColor: isLight ? '#d1ddd8' : 'rgba(255,255,255,0.05)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = isLight ? '#86c993' : 'rgba(74,193,107,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = isLight ? '#d1ddd8' : 'rgba(255,255,255,0.05)'}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${rev.avatarBg} text-white font-extrabold text-sm flex items-center justify-center`}>
                          {rev.avatar}
                        </div>
                        <div className="text-left">
                          <a
                            href={rev.shareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-sm hover:underline cursor-pointer"
                            style={{ color: isLight ? '#0f1f15' : '#f1f5f9' }}
                          >
                            {rev.name}
                          </a>
                        </div>
                      </div>
                      <a 
                        href={rev.shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </a>
                    </div>

                    {/* Stars & Age Inline */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, idx) => (
                          <Star key={idx} className="w-4 h-4 fill-[#fbbc04] text-[#fbbc04]" />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400 font-normal">{rev.date}</span>
                    </div>

                    {/* Review text with newlines preserved */}
                    <p className="text-xs md:text-sm leading-relaxed text-left whitespace-pre-line font-medium mb-6" style={{ color: isLight ? '#2c3e38' : '#cbd5e1' }}>
                      {rev.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Industries served */}
          <div className="mt-24 border-t border-white/10 pt-16">
            <div className="text-[10px] tracking-[0.25em] font-extrabold text-brand-green mb-10 uppercase">
              INDUSTRIES WE SERVE
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-5">
              {industries.map((ind, i) => (
                <div
                  key={i}
                  className="group aspect-square rounded-2xl border border-white/5 bg-white/5 hover:border-brand-green/40 hover:bg-brand-green/5 transition-all duration-300 flex flex-col items-center justify-center gap-3 p-4 cursor-pointer"
                  onClick={() => navigate('/shop')}
                >
                  <ind.icon className="w-8 h-8 text-brand-green/90 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
                  <div className="text-[11px] sm:text-xs text-center text-slate-300 font-bold leading-tight">{ind.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;

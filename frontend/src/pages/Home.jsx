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
    name: "Paritosh Debbarma",
    rating: 5,
    date: "3 months ago",
    text: "Good quality product in affordable price. Satisfied with the service.😜👍",
    avatar: "PD",
    avatarBg: "bg-teal-700",
    shareUrl: "https://maps.app.goo.gl/ArQNtUWttRxpy5P27"
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
    name: "Akash Das",
    rating: 5,
    date: "3 months ago",
    text: "Very advanced technology used, good quality products and very low prices",
    avatar: "AD",
    avatarBg: "bg-blue-700",
    shareUrl: "https://maps.app.goo.gl/e6bCGRGvdU1pmdnP9"
  },
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
  }
];

const Home = () => {
  const navigate = useNavigate();
  const [likes, setLikes] = useState({
    0: { count: 3, liked: false },
    1: { count: 5, liked: false },
    2: { count: 2, liked: false },
    3: { count: 7, liked: false },
    4: { count: 4, liked: false },
    5: { count: 6, liked: false }
  });

  const [gmapStats, setGmapStats] = useState({
    rating_average: 5.0,
    review_count: 57,
    rating_distribution: { "5": 57, "4": 0, "3": 0, "2": 0, "1": 0 }
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
      <div className="relative overflow-hidden bg-[#0a0f0d] border-b border-white/5">
        <img
          src="/hero-products.webp"
          alt="Durga Shakti Foils Premium Packing Solutions"
          loading="eager"
          fetchpriority="high"
          className="absolute right-0 bottom-0 z-0 pointer-events-none w-full md:w-[70%] lg:w-[65%] h-auto object-contain hidden md:block"
        />
        <div
          className="absolute inset-0 z-0 pointer-events-none hidden md:block"
          style={{
            background:
              'linear-gradient(to right, #0a0f0d 0%, #0a0f0d 38%, rgba(10,15,13,0.7) 50%, rgba(10,15,13,0.15) 75%, rgba(10,15,13,0) 100%)'
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

          <div className="md:hidden mt-4">
            <img
              src="/hero-products.webp"
              alt="Premium Foil Products"
              loading="eager"
              fetchpriority="high"
              className="w-full h-auto object-contain mx-auto"
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
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
              <div>
                <div className="text-[10px] tracking-[0.25em] font-extrabold text-brand-green mb-3 uppercase">
                  GOOGLE REVIEWS
                </div>
                <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-left">
                  What Our <span className="text-brand-green">Customers</span> Say
                </h2>
                <p className="text-slate-400 text-sm mt-3 max-w-xl text-left">
                  Trusted by commercial kitchens, caterers, and home cooks.
                </p>
              </div>
              <a 
                href="https://www.google.com/maps/place/DurgaShaktiFoils+PVT.LTD/@17.5565275,78.3685954,19z/data=!4m8!3m7!1s0x3bcb8dae4cb75cf1:0x72850fd00e387dd3!8m2!3d17.5565262!4d78.3692391!9m1!1b1!16s%2Fg%2F11y16ptlbn?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 md:mt-0 inline-flex items-center gap-2 text-brand-green font-bold text-sm hover:underline cursor-pointer group"
              >
                View on Google Maps
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Live Ratings Summary Widget */}
            <div className="mb-12 max-w-2xl mx-auto rounded-2xl border border-white/5 bg-[#131b17] p-6 flex flex-col sm:flex-row items-center justify-between gap-8 shadow-lg">
              {/* Distribution Bars */}
              <div className="w-full sm:w-[60%] flex flex-col gap-2.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = gmapStats.rating_distribution?.[stars.toString()] || 0;
                  const total = gmapStats.review_count || 1;
                  const percent = Math.round((count / total) * 100);
                  return (
                    <div key={stars} className="flex items-center gap-3 w-full text-xs">
                      <span className="w-3 text-slate-300 font-bold">{stars}</span>
                      <div className="flex-1 h-3 rounded-full bg-slate-800/80 overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-[#fbbc04] rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-slate-400 font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Big Aggregate Circle */}
              <div className="flex flex-col items-center justify-center shrink-0 w-full sm:w-[35%] border-t sm:border-t-0 sm:border-l border-white/10 pt-6 sm:pt-0 sm:pl-6 text-center">
                <div className="text-5xl font-black text-slate-100 tracking-tight">{gmapStats.rating_average.toFixed(1)}</div>
                <div className="flex items-center gap-0.5 mt-2">
                  {[...Array(5)].map((_, idx) => (
                    <Star key={idx} className="w-5 h-5 fill-[#fbbc04] text-[#fbbc04]" />
                  ))}
                </div>
                <div className="text-xs text-slate-400 font-bold mt-2 tracking-wide uppercase">
                  {gmapStats.review_count} Reviews
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {googleReviews.map((rev, i) => (
                <div 
                  key={i} 
                  className="rounded-2xl border border-white/5 bg-[#131b17] p-6 relative flex flex-col justify-between hover:border-brand-green/30 transition-all duration-300 group shadow-md"
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
                            className="font-bold text-sm text-slate-100 hover:underline cursor-pointer"
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
                    <p className="text-slate-200 text-xs md:text-sm leading-relaxed text-left whitespace-pre-line font-medium mb-6">
                      {rev.text}
                    </p>
                  </div>

                  {/* Actions (Like) */}
                  <div className="border-t border-white/5 pt-4 flex items-center gap-6">
                    <button 
                      onClick={() => handleLike(i)}
                      className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer p-1 rounded hover:bg-white/5 ${
                        likes[i].liked ? 'text-brand-green' : 'text-slate-300 hover:text-brand-green'
                      }`}
                    >
                      <ThumbsUp className={`w-4 h-4 ${likes[i].liked ? 'fill-brand-green' : ''}`} />
                      <span>{likes[i].liked ? 'Liked' : 'Like'} ({likes[i].count})</span>
                    </button>
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

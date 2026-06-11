import React from 'react';
import { useNavigate } from 'react-router-dom';
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
    name: "Karan Malhotra",
    role: "Malhotra Caterers",
    rating: 5,
    date: "2 weeks ago",
    text: "We switched to Durga Shakti Foils for our premium catering services. The 11-micron thickness is perfect; it doesn't tear when packaging hot biryanis. Excellent heat retention and keeps the food completely fresh until delivery.",
    avatar: "KM"
  },
  {
    name: "Anjali Deshmukh",
    role: "Sweet Treats Bakery",
    rating: 5,
    date: "1 month ago",
    text: "Best quality foil in the market. The Hot Wrap rolls are very convenient for packaging our baked products. Very strong and doesn't leak. Highly recommended for commercial kitchen use.",
    avatar: "AD"
  },
  {
    name: "Rajesh Kumar",
    role: "Home Chef",
    rating: 5,
    date: "3 weeks ago",
    text: "Really impressed with the quality. Unlike cheap local foils, this one is thick and wraps very tightly. Keeps my lunch warm for hours. The 72-meter roll is extremely cost-effective.",
    avatar: "RK"
  },
  {
    name: "Sneha Patel",
    role: "Grand Vista Hotel",
    rating: 5,
    date: "1 month ago",
    text: "We buy Durga Shakti Foils in bulk for our room service packaging. The food freshness is certified, and the strength is superior. Our delivery reviews have improved significantly since we started using this foil!",
    avatar: "SP"
  },
  {
    name: "Chef Vikram Rao",
    role: "Executive Chef",
    rating: 5,
    date: "2 months ago",
    text: "As a professional chef, food safety is my top priority. Durga Shakti's 100% pure virgin aluminium guarantees clinical hygiene. It locks in moisture and keeps food aromatic. Truly premium quality.",
    avatar: "VR"
  }
];

const Home = () => {
  const navigate = useNavigate();

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
                  CUSTOMER TESTIMONIALS
                </div>
                <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-left">
                  What Our <span className="text-brand-green">Customers</span> Say
                </h2>
                <p className="text-slate-400 text-sm mt-3 max-w-xl text-left">
                  Real Google Reviews from verified food businesses, caterers, and home chefs.
                </p>
              </div>
              <a 
                href="https://www.google.com/maps/reviews/data=!4m8!1m7!3m6!1s0x3bc2bf987ea80f19:0xf4d30c0429f5f87b!2sDurga+Shakti+Foils+Pvt+Ltd!8m2!3d18.4909399!4d73.81938!16s%2Fg%2F11sbh4gqap"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 md:mt-0 inline-flex items-center gap-2 text-brand-green font-bold text-sm hover:underline cursor-pointer group"
              >
                View on Google Maps
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {googleReviews.map((rev, i) => (
                <div 
                  key={i} 
                  className="rounded-2xl border border-white/5 bg-white/5 p-6 relative flex flex-col justify-between hover:border-brand-green/30 hover:bg-brand-green/[0.02] transition-all duration-300 group animate-fade-in"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-green/10 border border-brand-green/20 text-brand-green font-bold text-sm flex items-center justify-center">
                          {rev.avatar}
                        </div>
                        <div className="text-left">
                          <div className="font-extrabold text-sm text-slate-100">{rev.name}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">{rev.role}</div>
                        </div>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-[#4285F4]">
                        G
                      </div>
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-0.5 mb-3">
                      {[...Array(5)].map((_, idx) => (
                        <Star key={idx} className="w-4 h-4 fill-brand-yellow text-brand-yellow" />
                      ))}
                    </div>

                    {/* Review text */}
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed italic text-left">
                      "{rev.text}"
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span>{rev.date}</span>
                    <span className="flex items-center gap-1 text-slate-400 font-bold group-hover:text-brand-green transition-colors">
                      <Check className="w-3 h-3 text-brand-green" />
                      Verified Google Review
                    </span>
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

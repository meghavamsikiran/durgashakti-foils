import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Layers,
  Ruler,
  Recycle,
  ShieldCheck,
  ThermometerSun,
  Leaf
} from 'lucide-react';

const metrics = [
  { value: '11', label: 'Microns Thickness', icon: Layers },
  { value: '72', label: 'Meters Length', icon: Ruler },
  { value: '100%', label: 'Virgin Aluminium', icon: ShieldCheck },
  { value: 'Heat Lock', label: 'Technology', icon: ThermometerSun },
  { value: 'Eco', label: 'Friendly Recyclable', icon: Recycle }
];

const Home = () => {
  const navigate = useNavigate();

  const go = (to) => {
    if (to.startsWith('#')) {
      document.querySelector(to)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate(to);
  };

  return (
    <main className="min-h-screen bg-black text-white font-inter selection:bg-[#25d958]/30" data-testid="home-page">
      <section className="relative overflow-hidden border-b border-white/10 bg-[#030504]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_14%,rgba(56,189,88,0.14),transparent_35%),linear-gradient(180deg,#050706_0%,#000_100%)]" />
        
        <div className="relative z-10 mx-auto grid max-w-[1536px] grid-cols-1 gap-12 px-6 pb-24 pt-8 md:px-12 lg:grid-cols-[1.1fr_1.3fr] lg:px-[80px] lg:items-center">
          <div className="max-w-[480px] pb-3 pt-2 md:pt-8">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1d8f3d]/70 bg-black/55 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-[#25d958] shadow-[0_0_22px_rgba(37,217,88,0.18)]">
              <BadgeCheck className="h-3.5 w-3.5" />
              100% Food Grade Certified
            </div>
            <h1 className="font-serif text-[clamp(2.45rem,5vw,3.75rem)] font-bold leading-[1.05] tracking-normal text-white">
              Wrap it Right,
              <br />
              <span className="text-[#ffb800]">Keep it Hot,</span>
              <br />
              <span className="text-[#25d958]">Keep it Fresh!</span>
            </h1>
            <p className="mt-5 text-[15px] font-medium leading-6 text-white/80 max-w-[420px]">
              Choose Hot Wrap Foils for a healthier & greener tomorrow. Premium food-grade aluminium foil engineered for commercial strength and clinical hygiene.
            </p>
            <div className="mt-7 flex flex-wrap gap-5">
              <button onClick={() => go('/shop')} className="inline-flex h-11 items-center gap-3 rounded-lg bg-[#39c653] hover:bg-[#25d958] px-7 text-sm font-black text-white shadow-[0_10px_26px_rgba(37,217,88,0.24)] transition">
                Shop Now
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/60">
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
              <button onClick={() => go('/shop')} className="inline-flex h-11 items-center gap-3 rounded-lg border border-[#1e8438] bg-black/30 hover:bg-[#1e8438]/20 px-7 text-sm font-black text-white transition">
                Explore Products
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#ffb800] text-[#ffb800]">
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            </div>

            {/* 3 icon features below the buttons */}
            <div className="mt-10 flex flex-wrap gap-8 border-t border-white/10 pt-8">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25d958]/10 text-[#25d958]">
                  <Leaf className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase text-white">100% Pure</div>
                  <div className="text-[11px] font-medium text-white/60">Virgin Aluminium</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffb800]/10 text-[#ffb800]">
                  <ThermometerSun className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase text-white">Heat Lock</div>
                  <div className="text-[11px] font-medium text-white/60">Technology</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25d958]/10 text-[#25d958]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase text-white">Safe for Food</div>
                  <div className="text-[11px] font-medium text-white/60">Always</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center animate-in fade-in slide-in-from-right-8 duration-700">
            <img
              src="/landing-hero-foil-new.png"
              alt="Durga Shakti Hot Wrap product showcase stack"
              className="w-full max-w-[680px] h-auto object-contain select-none pointer-events-none"
            />
          </div>
        </div>
      </section>

      <MetricStrip />

      {/* Full width Premium Range Section */}
      <section className="bg-white text-black py-20 px-6 md:px-12 lg:px-[80px]">
        <div className="mx-auto max-w-[1536px]">
          <div className="mb-12">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#008b2c] mb-2">Our Premium Range</p>
            <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-[#0f172a] leading-tight">
              Designed for Purity,<br className="sm:hidden" /> Engineered for Performance
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div 
              onClick={() => go('/shop')}
              className="group relative h-[180px] bg-[#f8fafc] border border-slate-100 rounded-3xl p-6 flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:border-[#25d958]/30 transition-all duration-300"
            >
              <div className="relative z-10">
                <h3 className="font-bold text-lg text-slate-900 group-hover:text-[#008b2c] transition-colors">Aluminium Foil Rolls</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1">6m – 72m</p>
                <div className="inline-flex items-center gap-1 text-xs font-bold text-[#008b2c] mt-4">
                  View Collection
                  <ArrowRight className="h-3 w-3 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <img 
                src="/foil-rolls-card.png" 
                alt="Aluminium Foil Rolls" 
                className="absolute bottom-2 right-2 w-[110px] h-[110px] object-contain group-hover:scale-105 transition-transform duration-300 pointer-events-none"
              />
            </div>

            {/* Card 2 */}
            <div 
              onClick={() => go('/shop')}
              className="group relative h-[180px] bg-[#f8fafc] border border-slate-100 rounded-3xl p-6 flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:border-[#25d958]/30 transition-all duration-300"
            >
              <div className="relative z-10">
                <h3 className="font-bold text-lg text-slate-900 group-hover:text-[#008b2c] transition-colors">Pre-Cut Sheets</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1">Convenient & Hygiene</p>
                <div className="inline-flex items-center gap-1 text-xs font-bold text-[#008b2c] mt-4">
                  View Collection
                  <ArrowRight className="h-3 w-3 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <img 
                src="/pre-cut-sheets-card.png" 
                alt="Pre-Cut Sheets" 
                className="absolute bottom-2 right-2 w-[110px] h-[110px] object-contain group-hover:scale-105 transition-transform duration-300 pointer-events-none"
              />
            </div>

            {/* Card 3 */}
            <div 
              onClick={() => go('/shop')}
              className="group relative h-[180px] bg-[#f8fafc] border border-slate-100 rounded-3xl p-6 flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:border-[#25d958]/30 transition-all duration-300"
            >
              <div className="relative z-10">
                <h3 className="font-bold text-lg text-slate-900 group-hover:text-[#008b2c] transition-colors">Foil Containers</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1">Strong & Leak Proof</p>
                <div className="inline-flex items-center gap-1 text-xs font-bold text-[#008b2c] mt-4">
                  View Collection
                  <ArrowRight className="h-3 w-3 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <img 
                src="/foil-containers-card.png" 
                alt="Foil Containers" 
                className="absolute bottom-2 right-2 w-[110px] h-[110px] object-contain group-hover:scale-105 transition-transform duration-300 pointer-events-none"
              />
            </div>

            {/* Card 4 */}
            <div 
              onClick={() => go('/shop')}
              className="group relative h-[180px] bg-[#f8fafc] border border-slate-100 rounded-3xl p-6 flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:border-[#25d958]/30 transition-all duration-300"
            >
              <div className="relative z-10">
                <h3 className="font-bold text-lg text-slate-900 group-hover:text-[#008b2c] transition-colors">Foil Dispensers</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1">Easy · Clean · Efficient</p>
                <div className="inline-flex items-center gap-1 text-xs font-bold text-[#008b2c] mt-4">
                  View Collection
                  <ArrowRight className="h-3 w-3 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <img 
                src="/foil-dispensers-card.png" 
                alt="Foil Dispensers" 
                className="absolute bottom-2 right-2 w-[110px] h-[110px] object-contain group-hover:scale-105 transition-transform duration-300 pointer-events-none"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/15 bg-[#020403]">
        <HeatComparison />
        <TrustPanel />
      </section>
    </main>
  );
};

const MetricStrip = () => (
  <section className="relative z-20 px-6 md:px-12 lg:px-[80px] -mt-8 pb-12 bg-black">
    <div className="mx-auto max-w-[1536px] bg-[#0c120f] border border-[#1b2b24] rounded-[2rem] p-6 md:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8 lg:divide-x lg:divide-[#1b2b24]">
        {metrics.map((metric, idx) => (
          <div key={metric.label} className={`flex items-center gap-4 ${idx > 0 ? 'lg:pl-8' : ''}`}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#25d958]/10 text-[#25d958]">
              <metric.icon className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <div>
              <div className="font-manrope text-lg font-black leading-none text-[#25d958] md:text-xl">{metric.value}</div>
              <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50">{metric.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const HeatComparison = () => (
  <div className="mx-auto w-full max-w-[1536px] border-b border-white/10 bg-[#020605]">
    <img
      src="/heat-comparison-exact.png"
      alt="Thermal comparison between normal wrapping and Hot Wrap Foils"
      width="2148"
      height="732"
      loading="lazy"
      decoding="async"
      className="block h-auto w-full object-contain"
    />
  </div>
);

const TrustPanel = () => (
  <div className="mx-auto w-full max-w-[1536px] bg-[#020605]">
    <img
      src="/trusted-panel-exact.png"
      alt="Trusted by thousands statistics and leading restaurant brands"
      width="2173"
      height="724"
      loading="lazy"
      decoding="async"
      className="block h-auto w-full object-contain"
    />
  </div>
);

export default Home;

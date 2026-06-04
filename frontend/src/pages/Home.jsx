import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  PackageCheck,
  Recycle,
  ShieldCheck,
  ShoppingCart,
  ThermometerSun
} from 'lucide-react';

const metrics = [
  { value: '11', label: 'Microns Thickness', icon: Boxes },
  { value: '72', label: 'Meters Length', icon: PackageCheck },
  { value: '100%', label: 'Virgin Aluminium', icon: ShieldCheck },
  { value: 'Heat Lock', label: 'Technology', icon: ThermometerSun },
  { value: 'Eco', label: 'Friendly Recyclable', icon: Recycle }
];

const processSteps = [
  { title: 'Raw Material', image: '/landing-raw-material.jpg' },
  { title: 'Precision Rolling', image: '/landing-rolling.jpg' },
  { title: 'Quality Testing', image: '/landing-testing.jpg' },
  { title: 'Packaging', image: '/landing-packaging.jpg' },
  { title: 'Delivered Across India', image: '/landing-delivery.jpg' }
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_14%,rgba(56,189,88,0.16),transparent_27%),linear-gradient(180deg,#050706_0%,#000_100%)]" />
        <img
          src="/landing-hero-foil.jpg"
          alt="Premium aluminum foil roll with unrolled foil sheet"
          width="2400"
          height="867"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-y-0 right-0 hidden h-full w-[76%] object-cover object-right opacity-95 md:block"
        />
        <div className="absolute inset-y-0 left-0 w-[62%] bg-[linear-gradient(90deg,#030504_0%,rgba(3,5,4,0.96)_48%,rgba(3,5,4,0)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-[linear-gradient(0deg,#000_0%,rgba(0,0,0,0.72)_38%,transparent_100%)]" />

        <div className="relative z-10 mx-auto grid max-w-[1536px] grid-cols-1 gap-8 px-6 pb-8 pt-5 md:px-12 lg:grid-cols-[420px_1fr] lg:px-[50px]">
          <div className="max-w-[390px] pb-3 pt-2 md:pt-8">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1d8f3d]/70 bg-black/55 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-[#25d958] shadow-[0_0_22px_rgba(37,217,88,0.18)]">
              <BadgeCheck className="h-3.5 w-3.5" />
              100% Food Grade Certified
            </div>
            <h1 className="font-serif text-[clamp(2.45rem,5vw,3.25rem)] font-bold leading-[1.03] tracking-normal text-white">
              <span className="text-white/70">Engineered To</span>
              <br />
              Preserve Freshness.
              <br />
              <span className="text-white/70">Trusted To</span>
              <br />
              <span className="text-[#25d958]">Protect Every Meal.</span>
            </h1>
            <p className="mt-5 max-w-[330px] text-[15px] font-medium leading-6 text-white/88">
              Premium food-grade aluminium foils for every kitchen, every business, every time.
            </p>
            <div className="mt-7 flex flex-wrap gap-5">
              <button onClick={() => go('/shop')} className="inline-flex h-11 items-center gap-3 rounded-lg bg-[#39c653] px-7 text-sm font-black text-white shadow-[0_10px_26px_rgba(37,217,88,0.24)] transition hover:bg-[#48d862]">
                Shop Now
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/60">
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
              <button onClick={() => go('/shop')} className="inline-flex h-11 items-center gap-3 rounded-lg border border-[#1e8438] bg-black/30 px-7 text-sm font-black text-white transition hover:bg-[#102016]">
                Explore Products
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#b98923] text-[#b98923]">
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            </div>
            <img
              src="/landing-hero-foil.jpg"
              alt="Premium aluminum foil roll with unrolled foil sheet"
              width="2400"
              height="867"
              loading="eager"
              decoding="async"
              className="mt-8 block w-full rounded-xl border border-white/10 object-cover shadow-[0_18px_50px_rgba(0,0,0,0.38)] md:hidden"
            />
          </div>

          <div className="hidden min-h-[350px] md:block" />
        </div>
      </section>

      <MetricStrip />

      <section className="grid border-b border-white/15 bg-black lg:grid-cols-[48.5%_51.5%]">
        <ProductRange onNavigate={go} />
        <FactoryFlow onNavigate={go} />
      </section>

      <section className="grid border-b border-white/15 bg-[#020403] lg:grid-cols-2">
        <HeatComparison />
        <TrustPanel />
      </section>
    </main>
  );
};

const MetricStrip = () => (
  <section className="border-y border-white/15 bg-[#050a09]">
    <div className="mx-auto grid max-w-[1536px] grid-cols-2 lg:grid-cols-5">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex items-center justify-center gap-3 border border-white/10 px-4 py-4 sm:gap-5 sm:px-8">
          <metric.icon className="h-10 w-10 text-[#25d958] sm:h-12 sm:w-12" strokeWidth={1.45} />
          <div>
            <div className="font-manrope text-xl font-black leading-none text-[#25d958] sm:text-2xl">{metric.value}</div>
            <div className="mt-1 max-w-[92px] text-xs font-semibold leading-4 text-white">{metric.label}</div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const ProductRange = ({ onNavigate }) => (
  <div className="relative overflow-hidden bg-[#f3efe8] text-black md:min-h-[270px]">
    <img
      src="/landing-products.jpg"
      alt="Durga Shakti Hot Wrap aluminum foil product range"
      width="1600"
      height="833"
      loading="lazy"
      decoding="async"
      className="h-auto w-full object-cover object-center md:absolute md:inset-y-0 md:right-0 md:h-full md:w-[72%]"
    />
    <div className="relative z-10 flex min-h-[230px] w-full flex-col justify-center bg-[#f3efe8]/96 px-6 py-8 sm:px-10 md:h-full md:min-h-[270px] md:w-[37%] md:py-0">
      <p className="mb-4 text-xs font-black text-[#008b2c]">Our Premium Range</p>
      <h2 className="font-serif text-[27px] font-bold leading-tight">Premium Foils For Every Need</h2>
      <button onClick={() => onNavigate('/shop')} className="mt-9 inline-flex h-11 w-fit items-center gap-5 rounded-lg border border-[#19a044] bg-[#edf5ed] px-6 text-sm font-bold text-[#008b2c] transition hover:bg-white">
        View All Products
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  </div>
);

const FactoryFlow = ({ onNavigate }) => (
  <div className="bg-[#050807] px-8 py-7">
    <h2 className="font-serif text-2xl font-bold">From Our Factory To Your Kitchen</h2>
    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-5">
      {processSteps.map((step, index) => (
        <div key={step.title} className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-[12px] font-bold">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#25d958] text-[#25d958]">{index + 1}</span>
            <span className="truncate">{step.title}</span>
          </div>
          <img src={step.image} alt={step.title} loading="lazy" decoding="async" className="h-[88px] w-full rounded-lg border border-white/8 object-cover" />
        </div>
      ))}
    </div>
    <div className="mt-6 flex flex-col gap-5 rounded-xl border border-white/15 bg-white/[0.045] px-7 py-5 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <ShieldCheck className="h-10 w-10 shrink-0 text-[#25d958]" strokeWidth={1.6} />
        <p className="max-w-xl text-sm font-semibold leading-6 text-white/90">Every roll is manufactured under strict quality control ensuring safety, strength and superior performance.</p>
      </div>
      <button onClick={() => onNavigate('/about')} className="h-11 rounded-lg border border-[#25d958]/70 px-6 text-sm font-bold text-white transition hover:bg-[#25d958]/10">Know More About Us</button>
    </div>
  </div>
);

const HeatComparison = () => (
  <div className="relative min-w-0 border-b border-white/10 bg-[#020605] lg:border-b-0 lg:border-r lg:border-white/15 p-4 sm:p-8 flex flex-col justify-between select-text">
    <div className="mb-6">
      <p className="text-xs sm:text-sm font-serif text-white/60 tracking-wider">
        See The Difference. Feel The Confidence.
      </p>
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-extrabold text-[#25d958] mt-1">
        See Why Food Stays Hot
      </h2>
    </div>

    <div className="flex flex-row items-center justify-between gap-1 sm:gap-4 my-auto py-4">
      <div className="flex-1 flex flex-col items-center">
        <span className="inline-block py-1 px-2.5 sm:px-4 rounded-full bg-white/10 text-white font-extrabold text-[9px] sm:text-xs uppercase tracking-wider mb-4 text-center">
          Normal Wrapping
        </span>
        
        <div className="flex items-center justify-center gap-0.5 sm:gap-2 w-full">
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <div className="text-right flex flex-col justify-between h-20 sm:h-28 text-[8px] sm:text-[10px]">
              <div>
                <span className="block text-white/55 font-bold uppercase tracking-wider leading-none">Heat Loss</span>
                <span className="block text-red-500 font-extrabold uppercase mt-0.5">High</span>
              </div>
              <span className="text-white/30 font-mono font-bold leading-none mt-1 sm:mt-2">600</span>
              <span className="text-white/30 font-mono font-bold leading-none mb-1">300</span>
              <div className="mt-1 sm:mt-2">
                <span className="block text-white/55 font-bold uppercase tracking-wider leading-none">Freshness</span>
                <span className="block text-red-500 font-extrabold uppercase mt-0.5">Low</span>
              </div>
            </div>
            <img src="/scale-normal.png" alt="Normal wrapping temperature scale" className="h-20 sm:h-28 object-contain shrink-0" />
          </div>

          <img src="/tray-normal.png" alt="Normal wrapping heat signature" className="w-20 xs:w-28 sm:w-36 md:w-40 object-contain" />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center h-full gap-2 shrink-0">
        <div className="w-px h-10 sm:h-12 bg-white/20"></div>
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-white/20 bg-[#020605] text-white text-[9px] sm:text-xs font-black flex items-center justify-center shadow-lg shadow-white/5">
          VS
        </div>
        <div className="w-px h-10 sm:h-12 bg-white/20"></div>
      </div>

      <div className="flex-1 flex flex-col items-center">
        <span className="inline-block py-1 px-2.5 sm:px-4 rounded-full bg-[#006e1b] text-white font-extrabold text-[9px] sm:text-xs uppercase tracking-wider mb-4 text-center font-bold">
          Hot Wrap Foils
        </span>

        <div className="flex items-center justify-center gap-0.5 sm:gap-2 w-full">
          <img src="/tray-hot.png" alt="Hot Wrap Foils heat signature" className="w-20 xs:w-28 sm:w-36 md:w-40 object-contain" />

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <img src="/scale-hot.png" alt="Hot Wrap Foils temperature scale" className="h-20 sm:h-28 object-contain shrink-0" />
            <div className="text-left flex flex-col justify-between h-20 sm:h-28 text-[8px] sm:text-[10px]">
              <div>
                <span className="block text-white/55 font-bold uppercase tracking-wider leading-none">Heat Retention</span>
                <span className="block text-[#25d958] font-extrabold uppercase mt-0.5">High</span>
              </div>
              <span className="text-white/30 font-mono font-bold leading-none mt-1 sm:mt-2">600</span>
              <span className="text-white/30 font-mono font-bold leading-none mb-1">300</span>
              <div className="mt-1 sm:mt-2">
                <span className="block text-white/55 font-bold uppercase tracking-wider leading-none">Freshness</span>
                <span className="block text-[#25d958] font-extrabold uppercase mt-0.5">High</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="mt-4 text-center">
      <p className="text-[10px] sm:text-xs text-white/60 leading-relaxed max-w-md mx-auto">
        Advanced Heat Lock Technology keeps your food hot, fresh and flavorful for longer.
      </p>
    </div>
  </div>
);

const TrustPanel = () => (
  <div className="relative min-w-0 bg-[#020605] p-6 sm:p-8 flex flex-col justify-between select-text">
    <div className="mb-6">
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-extrabold text-white">
        Trusted By Thousands. Every Day.
      </h2>
    </div>

    <div className="grid grid-cols-2 gap-3 sm:gap-4 my-auto py-2">
      <div className="border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-lg">
        <div className="min-w-0">
          <div className="text-lg sm:text-2xl font-extrabold text-[#25d958] font-manrope leading-none">1000+</div>
          <div className="text-[9px] sm:text-[11px] font-semibold text-white/70 uppercase tracking-wider mt-1.5 leading-tight truncate">Businesses Served</div>
        </div>
        <div className="h-6 w-6 sm:h-8 sm:w-8 text-[#25d958] flex items-center justify-center shrink-0">
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-lg">
        <div className="min-w-0">
          <div className="text-lg sm:text-2xl font-extrabold text-[#25d958] font-manrope leading-none">50+</div>
          <div className="text-[9px] sm:text-[11px] font-semibold text-white/70 uppercase tracking-wider mt-1.5 leading-tight truncate">Cities Across India</div>
        </div>
        <div className="h-6 w-6 sm:h-8 sm:w-8 text-[#25d958] flex items-center justify-center shrink-0">
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-lg">
        <div className="min-w-0">
          <div className="text-lg sm:text-2xl font-extrabold text-[#25d958] font-manrope leading-none">99%</div>
          <div className="text-[9px] sm:text-[11px] font-semibold text-white/70 uppercase tracking-wider mt-1.5 leading-tight truncate">Customer Satisfaction</div>
        </div>
        <div className="h-6 w-6 sm:h-8 sm:w-8 text-[#25d958] flex items-center justify-center shrink-0">
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-lg">
        <div className="min-w-0">
          <div className="text-lg sm:text-2xl font-extrabold text-[#25d958] font-manrope leading-none">100%</div>
          <div className="text-[9px] sm:text-[11px] font-semibold text-white/70 uppercase tracking-wider mt-1.5 leading-tight truncate">Food Grade Certified</div>
        </div>
        <div className="h-6 w-6 sm:h-8 sm:w-8 text-[#25d958] flex items-center justify-center shrink-0">
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>
    </div>

    <div className="mt-4">
      <h3 className="text-[10px] sm:text-xs font-semibold text-white/60 uppercase tracking-widest text-center mb-3">
        Trusted By Leading Brands
      </h3>
      <img
        src="/trusted-brands.png"
        alt="Leading Restaurant Brands (Haldiram's, Barbeque Nation, Biryani Blues, Box8, Paradise, Subway)"
        width="2173"
        height="204"
        className="w-full h-auto object-contain opacity-85"
      />
    </div>
  </div>
);

export default Home;

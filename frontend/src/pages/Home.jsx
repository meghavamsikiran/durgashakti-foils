import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Layers,
  Leaf,
  Recycle,
  Ruler,
  ShieldCheck,
  ThermometerSun,
  Utensils,
  Building2,
  ShoppingBag,
  ChefHat,
  Hospital,
  Landmark,
  Factory,
  Store
} from 'lucide-react';

const metrics = [
  { value: '11', label: 'Microns\nThickness', icon: Layers },
  { value: '72', label: 'Meters\nLength', icon: Ruler },
  { value: '100%', label: 'Virgin\nAluminium', icon: Leaf },
  { value: 'Heat', label: 'Lock\nTechnology', icon: ThermometerSun },
  { value: 'Eco', label: 'Friendly\nRecyclable', icon: Recycle }
];

const heroFeatures = [
  { title: '100% Pure', subtitle: 'Virgin Aluminium', icon: Leaf, tone: 'green' },
  { title: 'Heat Lock', subtitle: 'Technology', icon: ThermometerSun, tone: 'gold' },
  { title: 'Safe for Food', subtitle: 'Always', icon: ShieldCheck, tone: 'green' }
];

const categories = [
  {
    title: 'Aluminium Foil Rolls',
    subtitle: '6m - 72m',
    image: '/foil-rolls-card.png',
    alt: 'Aluminium foil rolls'
  },
  {
    title: 'Pre-Cut Sheets',
    subtitle: 'Convenient & Hygiene',
    image: '/pre-cut-sheets-card.png',
    alt: 'Pre-cut foil sheets'
  },
  {
    title: 'Foil Containers',
    subtitle: 'Strong & Leak Proof',
    image: '/foil-containers-card.png',
    alt: 'Foil containers'
  },
  {
    title: 'Foil Dispensers',
    subtitle: 'Easy - Clean - Efficient',
    image: '/foil-dispensers-card.png',
    alt: 'Foil dispenser'
  }
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
    <main className="min-h-screen bg-white text-white font-inter selection:bg-[#25d958]/30" data-testid="home-page">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          opacity: 0;
          animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
      `}</style>

      <section className="home-hero-stage relative isolate min-h-[620px] md:min-h-[760px] lg:min-h-[820px] overflow-visible bg-[#020807] flex flex-col md:flex-row md:items-center">
        {/* Hero Background Image - Absolute on desktop, relative flow on mobile to prevent text overlay */}
        <div className="relative md:absolute w-full md:w-[60%] md:right-0 md:left-auto h-[260px] sm:h-[340px] md:h-full z-0 select-none pointer-events-none mt-6 md:mt-0 order-2 md:order-none">
          <img
            src="/homepage-hero-bg.jpg"
            alt="Durga Shakti Foils Premium Packing Solutions"
            className="h-full w-full object-cover opacity-100 transition-opacity duration-700"
            style={{ objectPosition: 'center' }}
          />
        </div>

        {/* Smooth gradient overlay to ensure text readability on the left (desktop only) */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#020807_0%,#020807_35%,rgba(2,8,7,0.4)_65%,rgba(2,8,7,0)_100%)] z-[1] hidden md:block" />

        <div className="relative z-10 mx-auto flex w-full max-w-[1340px] px-6 pb-4 pt-14 md:px-12 lg:px-[90px] order-1 md:order-none">
          <div className="max-w-[455px]">
            <div className="mb-4 inline-flex h-7 items-center gap-2 rounded-full border border-[#16823a]/80 bg-[#03140d]/80 px-3 text-[11px] font-extrabold uppercase tracking-wide text-[#2fda54] shadow-[0_0_20px_rgba(47,218,84,0.18)] animate-fade-in-up">
              <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
              100% Food Grade Certified
            </div>

            <h1 className="font-serif text-[clamp(2.35rem,4.2vw,3.55rem)] font-bold leading-[1.04] tracking-normal text-[#b9cbc6] drop-shadow-[0_3px_14px_rgba(0,0,0,0.35)] animate-fade-in-up delay-100">
              Wrap it Right,
              <br />
              <span className="text-[#f6ca51]">Keep it Hot,</span>
              <br />
              <span className="text-[#25d958]">Keep it Fresh!</span>
            </h1>

            <p className="mt-5 max-w-[405px] text-[14px] font-medium leading-[1.65] text-white/80 animate-fade-in-up delay-200">
              Choose Hot Wrap Foils for a healthier & greener tomorrow. Premium food-grade aluminium foil engineered for commercial strength and clinical hygiene.
            </p>

            <div className="mt-7 flex flex-wrap gap-4 animate-fade-in-up delay-300">
              <button
                onClick={() => go('/shop')}
                className="inline-flex h-10 items-center gap-3 rounded-lg bg-[#38d25a] px-6 text-sm font-black text-white shadow-[0_12px_24px_rgba(56,210,90,0.28)] transition hover:-translate-y-0.5 hover:bg-[#28c94e] focus:outline-none focus:ring-2 focus:ring-[#7cff94]/70"
              >
                Shop Now
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/65">
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            </div>

            <div className="mt-9 hidden max-w-[370px] grid-cols-3 gap-6 md:grid animate-fade-in-up delay-400">
              {heroFeatures.map((feature) => (
                <div key={feature.title} className="min-w-0">
                  <div
                    className={`mb-3 flex h-11 w-11 items-center justify-center rounded-full border bg-black/30 transition-transform duration-300 hover:scale-110 ${
                      feature.tone === 'gold'
                        ? 'border-[#d9ad30] text-[#d9ad30]'
                        : 'border-[#31d856] text-[#31d856]'
                    }`}
                  >
                    <feature.icon className="h-6 w-6" strokeWidth={1.8} />
                  </div>
                  <div className="text-[13px] font-black leading-tight text-white">{feature.title}</div>
                  <div className="mt-1 text-[12px] font-medium leading-tight text-white/80">{feature.subtitle}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <MetricStrip />
      </section>

      <PremiumRange go={go} />

      <ComparisonSection go={go} />
    </main>
  );
};

const MetricStrip = () => (
  <div className="relative md:absolute inset-x-0 bottom-0 md:bottom-[-38px] z-20 px-6 md:px-12 mt-6 md:mt-0 pb-12 md:pb-0 order-3 md:order-none">
    <div className="mx-auto max-w-[1024px] rounded-lg border border-white/10 bg-[#0c1817]/95 px-7 py-5 shadow-[0_22px_55px_rgba(0,0,0,0.48)] backdrop-blur-md">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5 md:divide-x md:divide-white/15">
        {metrics.map((metric, index) => (
          <div key={metric.value} className={`flex items-center gap-4 ${index > 0 ? 'md:pl-7' : ''}`}>
            <metric.icon className="h-9 w-9 shrink-0 text-[#b9f7c5]" strokeWidth={1.45} />
            <div className="min-w-0">
              <div className="text-[24px] font-black leading-none text-[#25d958]">{metric.value}</div>
              <div className="mt-1 whitespace-pre-line text-[12px] font-semibold leading-[1.15] text-white/90">{metric.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const PremiumRange = ({ go }) => (
  <section className="bg-white px-6 pb-10 pt-12 text-black md:px-12 lg:px-[90px]">
    <div className="mx-auto max-w-[1160px] flex flex-col gap-6 lg:grid lg:grid-cols-[280px_1fr_1fr_1fr_1fr] lg:items-center">
      <div className="pr-5">
        <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-[#2fb54a]">Our Premium Range</p>
        <h2 className="font-serif text-[24px] md:text-[26px] font-bold leading-[1.08] text-[#101418]">
          Designed for Purity,
          <br className="hidden md:inline" />
          Engineered for Performance
        </h2>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-4 -mx-6 px-6 md:mx-0 md:px-0 scrollbar-none snap-x snap-mandatory lg:grid lg:grid-cols-4 lg:col-span-4 lg:overflow-visible lg:pb-0">
        {categories.map((category) => (
          <button
            key={category.title}
            onClick={() => go('/shop')}
            className="group relative h-[118px] w-[240px] shrink-0 snap-start overflow-hidden rounded-[10px] border border-slate-200 bg-[#fbfcfd] p-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-[#31c85a]/50 hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-[#25d958]/45 lg:w-auto"
          >
            <div className="relative z-10 max-w-[135px]">
              <h3 className="text-[14px] font-black leading-tight text-[#161a1e]">{category.title}</h3>
              <p className="mt-1 text-[11px] font-semibold leading-tight text-slate-600">{category.subtitle}</p>
              <div className="mt-7 inline-flex items-center gap-1 text-[11px] font-black text-[#22a447]">
                View Collection
                <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
              </div>
            </div>
            <img
              src={category.image}
              alt={category.alt}
              className="absolute bottom-0 right-0 h-[92px] w-[92px] object-contain object-right-bottom transition duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
      </div>
    </div>
  </section>
);

const ComparisonSection = ({ go }) => (
  <section className="bg-[#020605] relative select-none">
    <div className="relative mx-auto max-w-[1774px] w-full">
      <img
        src="/normal-vs-durgashakti-foil.png"
        alt="Normal Foil vs Durga Shakti Foil comparison and industries served"
        width="1774"
        height="887"
        loading="lazy"
        decoding="async"
        className="block h-auto w-full object-contain"
      />
      
      {/* Interactive Overlay Grid directly over the image's Industries section */}
      <div 
        className="absolute left-[2.8%] right-[2.8%] top-[67.5%] bottom-[4.5%] grid grid-cols-8 gap-[1.2%]"
      >
        {[
          'Restaurants',
          'Hotels',
          'Takeaways',
          'Catering',
          'Hospitals',
          'Institutions',
          'Food Manufacturers',
          'Retail Stores'
        ].map((industry) => (
          <button
            key={industry}
            onClick={() => go('/')}
            title={`View products for ${industry}`}
            className="w-full h-full bg-transparent border-none outline-none cursor-pointer"
            aria-label={industry}
          />
        ))}
      </div>
    </div>
  </section>
);

export default Home;

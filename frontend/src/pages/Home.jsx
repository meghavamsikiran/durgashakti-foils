import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Flame,
  Leaf,
  MapPin,
  PackageCheck,
  Recycle,
  ShieldCheck,
  ShoppingCart,
  ThermometerSun,
  User,
  Users,
} from 'lucide-react';


const heroFeatures = [
  { label: '100% Virgin Aluminium', icon: Boxes },
  { label: 'Heat Lock Technology', icon: ThermometerSun },
  { label: 'Strong & Leak Proof', icon: Flame },
  { label: 'Eco Friendly & Recyclable', icon: Leaf },
  { label: 'Hygienic & Safe', icon: ShieldCheck },
];

const metrics = [
  { value: '11', label: 'Microns Thickness', icon: Boxes },
  { value: '72', label: 'Meters Length', icon: PackageCheck },
  { value: '100%', label: 'Virgin Aluminium', icon: ShieldCheck },
  { value: 'Heat Lock', label: 'Technology', icon: ThermometerSun },
  { value: 'Eco', label: 'Friendly Recyclable', icon: Recycle },
];

const processSteps = [
  { title: 'Raw Material', image: '/landing-raw-material.jpg' },
  { title: 'Precision Rolling', image: '/landing-rolling.jpg' },
  { title: 'Quality Testing', image: '/landing-testing.jpg' },
  { title: 'Packaging', image: '/landing-packaging.jpg' },
  { title: 'Delivered Across India', image: '/landing-delivery.jpg' },
];

const trustStats = [
  { value: '1000+', label: 'Businesses Served', icon: Users },
  { value: '50+', label: 'Cities Across India', icon: MapPin },
  { value: '99%', label: 'Customer Satisfaction', icon: Users },
  { value: '100%', label: 'Food Grade Certified', icon: ShieldCheck },
];

const brands = ["Haldiram's", 'Barbeque Nation', 'Biryani Blues', 'BOX8', 'Paradise', 'SUBWAY'];

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
          className="absolute bottom-0 right-0 top-0 hidden w-[72%] object-cover object-right opacity-95 md:block"
        />
        <div className="absolute inset-y-0 left-0 w-[58%] bg-[linear-gradient(90deg,#030504_0%,rgba(3,5,4,0.96)_45%,rgba(3,5,4,0)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />

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

          <div id="why" className="relative hidden min-h-[350px] md:block">
            <div className="absolute bottom-4 right-[3%] w-[58%] rounded-[22px] bg-[linear-gradient(180deg,rgba(223,223,216,0.82),rgba(192,192,185,0.76))] p-4 text-center text-black shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm">
              <h2 className="mb-4 font-manrope text-lg font-black">Why Choose Durga Shakti Foils?</h2>
              <div className="grid grid-cols-5 gap-3">
                {heroFeatures.map((feature) => (
                  <div key={feature.label} className="flex flex-col items-center gap-1.5">
                    <feature.icon className="h-7 w-7 text-[#0b2614]" strokeWidth={1.7} />
                    <span className="text-[12px] font-bold leading-tight">{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <MetricStrip />

      <section className="grid border-b border-white/15 bg-black lg:grid-cols-[48.5%_51.5%]">
        <ProductRange onNavigate={go} />
        <FactoryFlow onNavigate={go} />
      </section>

      <section className="grid border-b border-white/15 bg-[#020403] lg:grid-cols-[45%_55%]">
        <HeatComparison />
        <TrustPanel />
      </section>

      <Footer onNavigate={go} />
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
    <img src="/landing-products.jpg" alt="Durga Shakti Hot Wrap aluminum foil product range" width="1600" height="833" loading="lazy" decoding="async" className="h-auto w-full object-cover object-center md:absolute md:inset-y-0 md:right-0 md:h-full md:w-[72%]" />
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
  <div className="border-r border-white/15 px-6 py-8 sm:px-10">
    <p className="font-serif text-xl">See The Difference. Feel The Confidence.</p>
    <h2 className="font-serif text-3xl font-bold leading-tight text-[#25d958]">See Why Food Stays Hot</h2>
    <div className="mt-7 grid grid-cols-1 items-center gap-5 md:grid-cols-[1fr_48px_1fr]">
      <Tray label="Normal Wrapping" cool />
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-black text-black">VS</div>
      <Tray label="Hot Wrap Foils" />
    </div>
    <p className="mt-4 text-center text-xs font-medium text-white/78">Advanced Heat Lock Technology keeps your food hot, fresh and flavorful for longer.</p>
  </div>
);

const Tray = ({ label, cool = false }) => (
  <div className="mx-auto w-full max-w-[420px]">
    <div className={`mb-4 rounded-full px-5 py-2 text-center text-sm font-black ${cool ? 'bg-white/15' : 'bg-[#28a845]'}`}>{label}</div>
    <div className="grid grid-cols-[34px_1fr] items-center gap-3">
      <div className={`grid gap-1 text-[11px] font-bold leading-tight ${cool ? 'text-red-400' : 'text-[#25d958]'}`}>
        <span>{cool ? 'Heat Loss' : 'Heat Retention'}</span>
        <span>{cool ? 'High' : 'High'}</span>
        <span className={cool ? 'text-white/80' : 'text-white/80'}>Freshness</span>
        <span>{cool ? 'Low' : 'High'}</span>
      </div>
      <div className="relative h-[122px] rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,#252928,#0e1010)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_40px_rgba(0,0,0,0.35)]">
        <div className="absolute inset-x-5 bottom-2 h-7 rounded-b-[18px] bg-black/45 blur-sm" />
        <div className="relative h-full rounded-[18px] border border-white/15 bg-[linear-gradient(180deg,#bfc5c2,#636b67_16%,#1d201f_88%)] p-3">
          <div className={`h-full rounded-[16px] border border-white/20 ${cool ? 'bg-[radial-gradient(circle_at_52%_50%,#d8ef4b_0%,#38c8b6_22%,#2485d9_58%,#1161b6_100%)]' : 'bg-[radial-gradient(circle_at_50%_50%,#ffe46c_0%,#ff8f2f_24%,#f42f19_62%,#b5120b_100%)]'} shadow-[inset_0_0_24px_rgba(255,255,255,0.28)]`} />
        </div>
      </div>
    </div>
    <div className={`mt-3 text-sm font-bold ${cool ? 'text-red-400' : 'text-[#25d958]'}`}>{cool ? 'Heat Loss High' : 'Heat Retention High'}</div>
    <div className={`text-sm font-bold ${cool ? 'text-red-400' : 'text-[#25d958]'}`}>{cool ? 'Freshness Low' : 'Freshness High'}</div>
  </div>
);

const TrustPanel = () => (
  <div className="px-10 py-8">
    <h2 className="font-serif text-2xl">Trusted By Thousands. Every Day.</h2>
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {trustStats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-white/15 bg-white/[0.06] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-manrope text-3xl font-black leading-none text-[#25d958]">{stat.value}</div>
              <div className="mt-1 text-xs font-semibold leading-4 text-white">{stat.label}</div>
            </div>
            <stat.icon className="h-9 w-9 text-[#25d958]" strokeWidth={1.5} />
          </div>
        </div>
      ))}
    </div>
    <p className="mt-8 text-sm font-bold">Trusted By Leading Brands</p>
    <div className="mt-5 grid grid-cols-2 gap-6 opacity-65 sm:grid-cols-3 xl:grid-cols-6">
      {brands.map((brand) => <div key={brand} className="font-serif text-xl font-black text-white/70">{brand}</div>)}
    </div>
  </div>
);

const Footer = ({ onNavigate }) => (
  <footer className="border-t border-white/10 bg-[#030504] px-6 py-10 md:px-12 lg:px-[50px]">
    <div className="mx-auto grid max-w-[1536px] gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
      <div>
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="" className="h-9 w-9 object-contain brightness-0 invert" />
          <div>
            <div className="font-serif text-2xl font-bold">Durga Shakti Foils</div>
            <div className="text-xs font-bold text-white/75">Wrap Purity, Seal Freshness</div>
          </div>
        </div>
        <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">Premium food-grade aluminium foil solutions engineered for freshness, heat lock performance, and reliable commercial packaging.</p>
      </div>
      <FooterLinks title="Company" items={[['Home', '/'], ['Shop', '/shop'], ['About Us', '/about'], ['Contact Us', '/contact']]} onNavigate={onNavigate} />
      <FooterLinks title="Quality" items={[['ISO Certified', '#'], ['BPA Free', '#'], ['Food Grade Certified', '#'], ['Bulk Orders', '/contact']]} onNavigate={onNavigate} />
      <div>
        <h3 className="font-manrope text-sm font-black uppercase tracking-widest text-[#25d958]">Ready To Order?</h3>
        <p className="mt-3 text-sm leading-6 text-white/70">Talk to us for retail packs, restaurant supply, and bulk packaging requirements.</p>
        <button onClick={() => onNavigate('/contact')} className="mt-5 inline-flex h-11 items-center gap-3 rounded-lg bg-[#39c653] px-6 text-sm font-black text-white">Contact Us <ArrowRight className="h-4 w-4" /></button>
      </div>
    </div>
    <div className="mx-auto mt-10 max-w-[1536px] border-t border-white/10 pt-5 text-xs font-semibold text-white/45">(c) 2026 Durga Shakti Foils Pvt. Ltd. All rights reserved.</div>
  </footer>
);

const FooterLinks = ({ title, items, onNavigate }) => (
  <div>
    <h3 className="font-manrope text-sm font-black uppercase tracking-widest text-[#25d958]">{title}</h3>
    <div className="mt-4 grid gap-2">
      {items.map(([label, to]) => <button key={label} onClick={() => to !== '#' && onNavigate(to)} className="w-fit text-sm font-semibold text-white/70 transition hover:text-white">{label}</button>)}
    </div>
  </div>
);

export default Home;

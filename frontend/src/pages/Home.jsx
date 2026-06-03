import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  Flame,
  Gauge,
  Leaf,
  MapPin,
  PackageCheck,
  Recycle,
  Search,
  ShieldCheck,
  ShoppingCart,
  ThermometerSun,
  Truck,
  User,
  Users,
} from 'lucide-react';

const navItems = ['Home', 'Shop', 'About Us', 'Why Durga Shakti', 'Bulk Order', 'Contact Us'];

const heroFeatures = [
  { label: '100% Virgin Aluminium', icon: Boxes },
  { label: 'Heat Lock Technology', icon: ThermometerSun },
  { label: 'Strong & Leak Proof', icon: Flame },
  { label: 'Eco Friendly & Recyclable', icon: Leaf },
  { label: 'Hygienic & Safe', icon: ShieldCheck },
];

const metricStrip = [
  { value: '11', label: 'Microns Thickness', icon: Boxes },
  { value: '72', label: 'Meters Length', icon: PackageCheck },
  { value: '100%', label: 'Virgin Aluminium', icon: Leaf },
  { value: 'Heat Lock', label: 'Technology', icon: ThermometerSun },
  { value: 'Eco', label: 'Friendly Recyclable', icon: Recycle },
];

const processSteps = [
  { id: '1', title: 'Raw Material', image: '/landing-foil-hero.png' },
  { id: '2', title: 'Precision Rolling', image: '/foil-kitchen-detail.png' },
  { id: '3', title: 'Quality Testing', image: '/landing-foil-hero.png' },
  { id: '4', title: 'Packaging', image: '/landing-product-range.png' },
  { id: '5', title: 'Delivered Across India', image: '/landing-product-range.png' },
];

const trustStats = [
  { value: '1000+', label: 'Businesses Served', icon: Users },
  { value: '50+', label: 'Cities Across India', icon: MapPin },
  { value: '99%', label: 'Customer Satisfaction', icon: Users },
  { value: '100%', label: 'Food Grade Certified', icon: ShieldCheck },
];

const brandNames = ['Haldiram’s', 'Barbeque Nation', 'Biryani Blues', 'BOX8', 'Paradise', 'SUBWAY'];

const Home = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-black text-white font-inter" data-testid="home-page">
      <section className="relative min-h-[520px] overflow-hidden bg-[#030504]">
        <img
          src="/landing-foil-hero.png"
          alt="Premium aluminum foil roll"
          className="absolute inset-0 h-full w-full object-cover opacity-95"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.78)_28%,rgba(0,0,0,0.25)_56%,rgba(0,0,0,0.10)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/45 to-transparent" />

        <header className="relative z-10 mx-auto flex max-w-[1400px] items-center justify-between px-8 py-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
            <img src="/favicon.png" alt="" className="h-10 w-10 object-contain brightness-0 invert sepia saturate-200 hue-rotate-[358deg]" />
            <span>
              <span className="block font-serif text-2xl font-bold leading-none text-white">Durga Shakti Foils</span>
              <span className="mt-1 block text-[11px] font-semibold text-white">Wrap Purity, Seal Freshness</span>
            </span>
          </button>

          <nav className="hidden items-center gap-10 text-sm font-bold lg:flex">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => item === 'Shop' ? navigate('/shop') : item === 'Contact Us' ? navigate('/contact') : undefined}
                className={`pb-2 transition-colors ${item === 'Home' ? 'border-b-2 border-[#28d957] text-[#28d957]' : 'text-white hover:text-[#28d957]'}`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-5 xl:flex">
            <div className="absolute right-64 top-3 flex items-center gap-8 text-[12px] font-semibold text-white">
              {['ISO Certified', 'BPA Free', 'Food Grade Certified'].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-[#28d957]" />
                  {item}
                </span>
              ))}
            </div>
            <Search className="h-5 w-5" />
            <User className="h-5 w-5" />
            <button onClick={() => navigate('/cart')} className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#28d957] text-[9px] font-black text-black">3</span>
            </button>
            <button
              onClick={() => navigate('/shop')}
              className="rounded-lg bg-[#42c854] px-7 py-3 text-sm font-black text-white shadow-[0_0_22px_rgba(40,217,87,0.25)]"
            >
              Shop Now
            </button>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-[1400px] grid-cols-1 px-8 pb-10 pt-8 lg:grid-cols-[360px_1fr]">
          <div className="pt-7">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1f9d3d]/50 bg-black/50 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-[#28d957]">
              <BadgeCheck className="h-3.5 w-3.5" />
              100% Food Grade Certified
            </div>
            <h1 className="font-serif text-[42px] font-bold leading-[1.05] text-white md:text-[46px]">
              <span className="text-white/70">Engineered To</span>
              <br />
              Preserve Freshness.
              <br />
              <span className="text-white/70">Trusted To</span>
              <br />
              <span className="text-[#36c75b]">Protect Every Meal.</span>
            </h1>
            <p className="mt-5 max-w-[320px] text-[15px] font-medium leading-6 text-white/90">
              Premium food-grade aluminium foils for every kitchen, every business, every time.
            </p>
            <div className="mt-7 flex gap-5">
              <button onClick={() => navigate('/shop')} className="flex items-center gap-3 rounded-lg bg-[#42c854] px-7 py-3 text-sm font-black text-white">
                Shop Now
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/50">
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
              <button onClick={() => navigate('/shop')} className="flex items-center gap-3 rounded-lg border border-[#227b35] bg-black/30 px-7 py-3 text-sm font-black text-white">
                Explore Products
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#bb8d28] text-[#bb8d28]">
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute bottom-7 right-6 grid w-[610px] grid-cols-5 gap-5 text-center text-[13px] font-semibold text-black">
              <h3 className="col-span-5 mb-1 -rotate-[8deg] text-lg font-black text-black">Why Choose Durga Shakti Foils?</h3>
              {heroFeatures.map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1">
                  <item.icon className="h-7 w-7 text-[#0d1f16]" />
                  <span className="leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/15 bg-[#050909]/95">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 divide-x divide-white/15 md:grid-cols-5">
          {metricStrip.map((item) => (
            <div key={item.label} className="flex items-center justify-center gap-5 px-8 py-4">
              <item.icon className="h-12 w-12 text-[#28d957]" strokeWidth={1.4} />
              <div>
                <div className="font-manrope text-2xl font-black text-[#28d957]">{item.value}</div>
                <div className="max-w-[92px] text-xs font-semibold leading-4 text-white">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid border-b border-white/15 bg-black lg:grid-cols-[1fr_1.08fr]">
        <div className="relative min-h-[270px] overflow-hidden bg-[#f3efe6] text-black">
          <img src="/landing-product-range.png" alt="Premium foil product range" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-y-0 left-0 w-[34%] bg-[#f3efe6]/95" />
          <div className="relative z-10 max-w-[260px] px-10 py-12">
            <p className="mb-4 text-xs font-black text-[#0b8f2b]">Our Premium Range</p>
            <h2 className="font-serif text-2xl font-bold leading-tight">Premium Foils For Every Need</h2>
            <button onClick={() => navigate('/shop')} className="mt-8 flex items-center gap-3 rounded-lg border border-[#2ca44b] bg-[#ecf3ea]/80 px-6 py-3 text-xs font-bold text-[#0b8f2b]">
              View All Products
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="bg-[#050807] px-8 py-8">
          <h2 className="font-serif text-2xl font-bold">From Our Factory To Your Kitchen</h2>
          <div className="mt-5 grid grid-cols-5 gap-4">
            {processSteps.map((step, index) => (
              <div key={step.id}>
                <div className="mb-3 flex items-center gap-2 text-xs font-bold">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#28d957] text-[#28d957]">{step.id}</span>
                  <span className="truncate">{step.title}</span>
                  {index < processSteps.length - 1 && <span className="hidden flex-1 border-t border-dashed border-[#28d957] lg:block" />}
                </div>
                <img src={step.image} alt="" className="h-[88px] w-full rounded-lg object-cover" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.04] px-7 py-4">
            <div className="flex items-center gap-4">
              <ShieldCheck className="h-9 w-9 text-[#28d957]" />
              <p className="max-w-xl text-sm leading-6 text-white/90">
                Every roll is manufactured under strict quality control ensuring safety, strength and superior performance.
              </p>
            </div>
            <button onClick={() => navigate('/about')} className="hidden rounded-lg border border-[#28d957]/70 px-6 py-3 text-sm font-bold lg:flex">
              Know More About Us
            </button>
          </div>
        </div>
      </section>

      <section className="grid bg-[#020403] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-r border-white/15 px-10 py-8">
          <p className="font-serif text-xl">See The Difference. Feel The Confidence.</p>
          <h2 className="font-serif text-3xl font-bold text-[#28d957]">See Why Food Stays Hot</h2>
          <div className="mt-8 grid grid-cols-[1fr_56px_1fr] items-center gap-5">
            <HeatTray label="Normal Wrapping" cool />
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-black text-black">VS</div>
            <HeatTray label="Hot Wrap Foils" />
          </div>
          <p className="mt-5 text-center text-xs text-white/80">Advanced Heat Lock Technology keeps your food hot, fresh and flavorful for longer.</p>
        </div>

        <div className="px-10 py-8">
          <h2 className="font-serif text-2xl">Trusted By Thousands. Every Day.</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {trustStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-white/15 bg-white/[0.06] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-manrope text-3xl font-black text-[#28d957]">{stat.value}</div>
                    <div className="text-xs font-semibold text-white">{stat.label}</div>
                  </div>
                  <stat.icon className="h-9 w-9 text-[#28d957]" strokeWidth={1.4} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm font-bold">Trusted By Leading Brands</p>
          <div className="mt-5 grid grid-cols-3 gap-6 opacity-65 lg:grid-cols-6">
            {brandNames.map((brand) => (
              <div key={brand} className="font-serif text-xl font-black text-white/70">{brand}</div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

const HeatTray = ({ label, cool = false }) => (
  <div>
    <div className={`mb-4 rounded-full px-5 py-2 text-center text-sm font-black ${cool ? 'bg-white/15 text-white' : 'bg-[#28a845] text-white'}`}>
      {label}
    </div>
    <div className="relative h-[95px] rounded-[24px] border border-white/20 bg-[#111] p-3 shadow-[inset_0_0_20px_rgba(255,255,255,0.12)]">
      <div className={`h-full rounded-[18px] ${cool ? 'bg-[radial-gradient(circle_at_center,#e8f13c,#12a4d8_48%,#2442ae)]' : 'bg-[radial-gradient(circle_at_center,#fff176,#ff4c19_48%,#b81710)]'}`} />
      <div className="absolute inset-x-5 -bottom-2 h-4 rounded-full bg-black/70 blur" />
    </div>
    <div className={`mt-3 text-sm font-bold ${cool ? 'text-red-400' : 'text-[#28d957]'}`}>
      {cool ? 'Heat Loss High' : 'Heat Retention High'}
    </div>
    <div className={`text-sm font-bold ${cool ? 'text-red-400' : 'text-[#28d957]'}`}>
      {cool ? 'Freshness Low' : 'Freshness High'}
    </div>
  </div>
);

export default Home;

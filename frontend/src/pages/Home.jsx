import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Flame,
  Leaf,
  Ruler,
  ShieldCheck,
  Sparkles,
  ThermometerSun,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

const specs = [
  { label: 'Micron Precision', value: '11', suffix: 'Micron', icon: Ruler },
  { label: 'Length Options', value: '72', suffix: 'Meters', icon: Sparkles },
  { label: 'Material Purity', value: '100%', suffix: 'Virgin Alloy', icon: ShieldCheck },
];

const promises = [
  {
    title: 'Food Grade Aluminum Foil',
    text: 'Engineered for direct food contact, commercial wrapping, catering prep, and heat-safe storage.',
    icon: ShieldCheck,
  },
  {
    title: 'Always Hot & Fresh',
    text: 'Built to lock warmth, moisture, and aroma into packed meals from kitchen to craving.',
    icon: ThermometerSun,
  },
  {
    title: 'Chef’s Choice Precision',
    text: 'A balanced 11-micron profile gives the sheet strength without losing smooth foldability.',
    icon: Award,
  },
];

const products = [
  'Food Grade Aluminum Foil Roll',
  'Hot Wrap Commercial Pack',
  'Pre-Cut Sheet Dispenser',
  'Premium Foil Containers',
];

const Home = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#061210] text-white font-inter overflow-hidden" data-testid="home-page">
      <section className="relative min-h-[calc(100vh-92px)] overflow-hidden border-b border-[#d6b36a]/25 bg-[#071513]">
        <div className="absolute inset-0">
          <img
            src="/chef-wrap.jpg"
            alt="Chef wrapping food with Hot Wrap aluminum foil"
            className="h-full w-full object-cover opacity-42"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#061210_0%,rgba(6,18,16,0.96)_24%,rgba(6,18,16,0.72)_55%,rgba(6,18,16,0.28)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_28%,rgba(214,179,106,0.22),transparent_30%),linear-gradient(180deg,rgba(6,18,16,0.1),#061210_100%)]" />
        </div>

        <div className="relative mx-auto grid min-h-[calc(100vh-92px)] max-w-7xl grid-cols-1 items-center gap-12 px-6 py-14 md:px-12 lg:grid-cols-[0.92fr_1.08fr] lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-2xl"
          >
            <div className="mb-8 h-px w-28 bg-[#d6b36a]" />
            <h1 className="font-manrope text-[clamp(2.65rem,4vw,4.35rem)] font-black uppercase leading-[0.98] tracking-normal text-white">
              <span className="block">Durga Shakti Foils:</span>
              <span className="mt-2 block text-[#d6b36a]">Chef’s Choice,</span>
              <span className="block md:whitespace-nowrap">11-Micron Precision</span>
            </h1>
            <p className="mt-7 max-w-xl text-base font-medium leading-8 text-[#d9e4dc] md:text-lg">
              Premium food-grade aluminum packaging for kitchens that care about heat, hygiene, strength, and presentation.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => navigate('/shop')}
                className="h-12 rounded-none bg-[#d6b36a] px-7 text-xs font-black uppercase tracking-[0.18em] text-[#081512] shadow-none hover:bg-[#e7c77e]"
                data-testid="hero-shop-button"
              >
                Shop Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                onClick={() => navigate('/contact')}
                variant="outline"
                className="h-12 rounded-none border-[#d6b36a]/70 bg-transparent px-7 text-xs font-black uppercase tracking-[0.18em] text-[#f9f4e5] hover:bg-[#d6b36a]/12 hover:text-white"
              >
                Contact Us
              </Button>
            </div>

            <div className="mt-12 grid max-w-xl grid-cols-3 gap-4 border-y border-white/12 py-6">
              {specs.map((item) => (
                <div key={item.label}>
                  <item.icon className="mb-3 h-5 w-5 text-[#d6b36a]" />
                  <div className="font-manrope text-2xl font-black leading-none text-white md:text-3xl">
                    {item.value}
                  </div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#d6b36a]">
                    {item.suffix}
                  </div>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/48">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="relative mx-auto w-full max-w-[620px]"
          >
            <div className="absolute -inset-4 border border-[#d6b36a]/30" />
            <div className="relative border-2 border-[#d6b36a] bg-[#081512] p-3 shadow-[0_36px_90px_rgba(0,0,0,0.45)]">
              <img
                src="/product_display_poster.png"
                alt="Durga Shakti Foils premium packaging ecosystem"
                className="aspect-square w-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#f6f7f2] px-6 py-20 text-[#071513] md:px-12 lg:px-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="overflow-hidden border border-[#c8ad70] bg-[#071513] p-2 shadow-[0_24px_60px_rgba(7,21,19,0.18)]">
            <img
              src="/chef-wrap.jpg"
              alt="Hot Wrap foil in a professional kitchen"
              className="aspect-[1.25] w-full object-cover"
            />
          </div>

          <div>
            <div className="mb-6 flex items-center gap-4">
              <div className="h-px w-16 bg-[#c8ad70]" />
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#006e1b]">
                Hot Wrap Quality
              </span>
            </div>
            <h2 className="font-manrope text-[clamp(2.1rem,4vw,4.5rem)] font-black uppercase leading-[0.96] tracking-normal">
              From Kitchen to Craving, Stays Hot.
            </h2>
            <p className="mt-7 max-w-xl text-base font-medium leading-8 text-[#3f4f48]">
              The landing page design is built around one strong product truth: clean foil, reliable wrapping, and premium presentation for professional food businesses.
            </p>
            <div className="mt-9 grid gap-4">
              {promises.map((item) => (
                <div key={item.title} className="grid grid-cols-[44px_1fr] gap-4 border-t border-[#d8d2bc] pt-5">
                  <div className="flex h-11 w-11 items-center justify-center bg-[#071513] text-[#d6b36a]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-manrope text-lg font-extrabold text-[#071513]">{item.title}</h3>
                    <p className="mt-1 text-sm font-medium leading-6 text-[#52635b]">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#071513] px-6 py-20 md:px-12 lg:px-20 lg:py-28">
        <div className="absolute left-0 top-0 h-px w-full bg-[#d6b36a]/35" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-between">
            <div>
              <div className="mb-6 h-px w-20 bg-[#d6b36a]" />
              <h2 className="font-manrope text-[clamp(2.2rem,4.5vw,5.2rem)] font-black uppercase leading-[0.92] tracking-normal text-white">
                Engineering Precision. Absolute Food Safety.
              </h2>
              <p className="mt-7 max-w-lg text-base font-medium leading-8 text-[#c9d7ce]">
                A page section for every signal in the reference: foil roll, boxed wrap, pre-cut sheet dispenser, and tray/container packaging.
              </p>
            </div>

            <div className="mt-12 grid gap-3">
              {products.map((product) => (
                <div key={product} className="flex items-center justify-between border-b border-white/12 py-4">
                  <span className="font-manrope text-base font-extrabold text-white">{product}</span>
                  <CheckCircle2 className="h-5 w-5 text-[#d6b36a]" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="border border-[#d6b36a]/45 bg-[#0d1f1c] p-6">
                <Flame className="h-7 w-7 text-[#d6b36a]" />
                <p className="mt-8 font-manrope text-4xl font-black text-white">Hot</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#b9cac0]">Heat retention for deliveries, catering, and packed meals.</p>
              </div>
              <div className="border border-[#d6b36a]/45 bg-[#0d1f1c] p-6">
                <Leaf className="h-7 w-7 text-[#d6b36a]" />
                <p className="mt-8 font-manrope text-4xl font-black text-white">Fresh</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#b9cac0]">Clean food-safe wrapping for everyday commercial service.</p>
              </div>
            </div>
            <div className="overflow-hidden border border-[#d6b36a]/45 bg-black">
              <img
                src="/foil-kitchen-detail.png"
                alt="Premium foil sheets and containers on a kitchen counter"
                className="aspect-[1.8] w-full object-cover opacity-95"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f7f2] px-6 py-20 text-[#071513] md:px-12 lg:px-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <img
              src="/logo-orange.png"
              alt="DurgaShakti Foils Pvt Ltd logo"
              className="h-auto w-full max-w-[540px] mix-blend-multiply"
            />
          </div>
          <div className="border-l-0 border-[#c8ad70] lg:border-l lg:pl-12">
            <h2 className="font-manrope text-[clamp(2rem,4vw,4.5rem)] font-black uppercase leading-none tracking-normal">
              Luxury Wrapping for Serious Kitchens.
            </h2>
            <p className="mt-7 max-w-xl text-base font-medium leading-8 text-[#52635b]">
              Bring Durga Shakti Foils into your kitchen workflow with premium aluminum foil products built for daily use, display-ready packaging, and reliable heat performance.
            </p>
            <Button
              onClick={() => navigate('/shop')}
              className="mt-9 h-12 rounded-none bg-[#071513] px-7 text-xs font-black uppercase tracking-[0.18em] text-[#d6b36a] hover:bg-[#12312b]"
              data-testid="cta-shop-button"
            >
              Explore Products
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;

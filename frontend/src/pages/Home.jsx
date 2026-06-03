import React from 'react';
import { useNavigate } from 'react-router-dom';

const srCopy = [
  'Durga Shakti Foils',
  'Wrap Purity, Seal Freshness',
  'Engineered To Preserve Freshness. Trusted To Protect Every Meal.',
  'Premium food-grade aluminium foils for every kitchen, every business, every time.',
  'Premium Foils For Every Need',
  'From Our Factory To Your Kitchen',
  'See Why Food Stays Hot',
  'Trusted By Thousands. Every Day.',
].join(' ');

const hotspots = [
  { label: 'Home', to: '/', left: 25.8, top: 4.5, width: 4.5, height: 3.6 },
  { label: 'Shop', to: '/shop', left: 31.2, top: 4.5, width: 4.5, height: 3.6 },
  { label: 'About Us', to: '/about', left: 36.0, top: 4.5, width: 6.6, height: 3.6 },
  { label: 'Contact Us', to: '/contact', left: 58.5, top: 4.5, width: 6.4, height: 3.6 },
  { label: 'Shop Now', to: '/shop', left: 89.4, top: 3.2, width: 7.1, height: 4.8 },
  { label: 'Hero Shop Now', to: '/shop', left: 6.2, top: 38.2, width: 9.0, height: 4.5 },
  { label: 'Explore Products', to: '/shop', left: 16.2, top: 38.2, width: 12.0, height: 4.5 },
  { label: 'View All Products', to: '/shop', left: 2.2, top: 63.2, width: 10.7, height: 4.1 },
  { label: 'Know More About Us', to: '/about', left: 82.6, top: 72.0, width: 12.6, height: 4.0 },
];

const Home = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-black text-white" data-testid="home-page">
      <h1 className="sr-only">{srCopy}</h1>
      <section className="w-full overflow-hidden bg-black">
        <div className="relative mx-auto aspect-[3/2] w-full max-w-[1536px] bg-black shadow-[0_0_80px_rgba(0,0,0,0.8)]">
          <img
            src="/landing-reference.png"
            alt="Durga Shakti Foils premium landing page with aluminum foil hero, product range, factory process, heat comparison, and trust metrics"
            className="absolute inset-0 h-full w-full select-none object-contain"
            draggable="false"
          />

          {hotspots.map((spot) => (
            <button
              key={spot.label}
              type="button"
              aria-label={spot.label}
              onClick={() => navigate(spot.to)}
              className="absolute rounded-md border border-transparent text-transparent outline-none transition focus-visible:border-[#22c55e] focus-visible:bg-[#22c55e]/10"
              style={{
                left: `${spot.left}%`,
                top: `${spot.top}%`,
                width: `${spot.width}%`,
                height: `${spot.height}%`,
              }}
            >
              {spot.label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Home;

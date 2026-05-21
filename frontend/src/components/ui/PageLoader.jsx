import React from 'react';

/**
 * PageLoader — Lightweight branded spinner shown during data fetches.
 * This is NOT the sacred Durga Maa / Trishul loader — those only appear
 * on first visit or hard refresh (handled by RouteTransitionLoader).
 */
const PageLoader = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 animate-in fade-in duration-500">
      {/* Branded spinner */}
      <div className="relative w-12 h-12">
        <div
          className="absolute inset-0 rounded-full border-[3px] border-slate-200"
        />
        <div
          className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-indigo-600 animate-spin"
        />
        <img
          src="/favicon.png"
          alt=""
          className="absolute inset-0 m-auto w-5 h-5 object-contain opacity-60"
        />
      </div>
      {message && (
        <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
          {message}
        </span>
      )}
    </div>
  );
};

export default PageLoader;

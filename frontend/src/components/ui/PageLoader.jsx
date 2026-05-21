import React from 'react';

/**
 * PageLoader — Minimal branded loading indicator for data fetches.
 * The sacred Trishul + Durga Maa loaders are handled exclusively by
 * RouteTransitionLoader and ONLY appear on first visit or browser refresh.
 */
const PageLoader = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 animate-in fade-in duration-300">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-[3px] border-slate-100" />
        <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-indigo-500 animate-spin" />
      </div>
      {message && (
        <span className="text-[11px] font-semibold text-slate-400 tracking-widest uppercase">
          {message}
        </span>
      )}
    </div>
  );
};

export default PageLoader;

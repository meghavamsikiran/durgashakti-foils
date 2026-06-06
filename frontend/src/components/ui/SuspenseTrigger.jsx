import React, { useEffect } from 'react';
import { setLoading } from '../../services/core/loadingState';

const SuspenseTrigger = () => {
  useEffect(() => {
    setLoading(true);
    return () => setLoading(false);
  }, []);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-surface flex items-center justify-center">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-[3.5px] border-slate-200/70" />
        <div className="absolute inset-0 rounded-full border-[3.5px] border-transparent border-t-primary animate-spin" />
        <img
          src="/favicon.avif"
          alt="Durga Shakti"
          className="w-7 h-7 object-contain opacity-90"
        />
      </div>
    </div>
  );
};

export default SuspenseTrigger;

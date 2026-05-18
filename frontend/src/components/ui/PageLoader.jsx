import React from 'react';
import TrishoolLoader from '../loaders/TrishoolLoader';
import DurgaMaaLoader from '../loaders/DurgaMaaLoader';

const PageLoader = ({ message = "Loading..." }) => {
  return (
    <div className="fixed inset-0 z-[50] flex flex-col items-center justify-center bg-white/30 backdrop-blur-sm space-y-4">
      <DurgaMaaLoader />
      {message && (
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">{message}</div>
      )}
    </div>
  );
};

export default PageLoader;

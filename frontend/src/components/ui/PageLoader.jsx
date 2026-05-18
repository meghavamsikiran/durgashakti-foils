import React from 'react';
import TrishoolLoader from '../loaders/TrishoolLoader';

const PageLoader = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <TrishoolLoader />
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      {message && (
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">{message}</div>
      )}
    </div>
  );
};

export default PageLoader;

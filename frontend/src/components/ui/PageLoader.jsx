import React from 'react';
import TrishoolLoader from '../loaders/TrishoolLoader';
import DurgaMaaLoader from '../loaders/DurgaMaaLoader';

const PageLoader = () => {
  return (
    <div className="w-full py-16 flex flex-col items-center justify-center bg-transparent border-none outline-none select-none shadow-none">
      <div className="w-24 h-24 flex items-center justify-center bg-transparent border-none outline-none">
        <DurgaMaaLoader />
      </div>
    </div>
  );
};

export default PageLoader;

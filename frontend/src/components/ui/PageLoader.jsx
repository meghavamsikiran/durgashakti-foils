import React from 'react';
import TrishoolLoader from '../loaders/TrishoolLoader';
import DurgaMaaLoader from '../loaders/DurgaMaaLoader';

const PageLoader = () => {
  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-transparent pointer-events-none"
      style={{ mixBlendMode: 'multiply' }}
    >
      <DurgaMaaLoader />
    </div>
  );
};

export default PageLoader;

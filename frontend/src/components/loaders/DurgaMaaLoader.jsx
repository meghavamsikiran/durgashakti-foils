import React from 'react';

const DurgaMaaLoader = () => {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center overflow-hidden">
      <video 
        src="/durgama.mp4" 
        autoPlay 
        loop 
        muted 
        playsInline
        className="w-full h-full object-contain"
        style={{ mixBlendMode: 'multiply' }}
      />
    </div>
  );
};

export default DurgaMaaLoader;

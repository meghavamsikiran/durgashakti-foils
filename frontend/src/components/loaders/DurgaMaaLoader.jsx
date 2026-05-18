import React from 'react';

const DurgaMaaLoader = () => {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center overflow-hidden bg-white">
      <video 
        src="/durgamaloader.mp4" 
        autoPlay 
        loop 
        muted 
        playsInline
        className="w-full h-full object-cover bg-white"
        style={{ backgroundColor: 'white' }}
      />
    </div>
  );
};

export default DurgaMaaLoader;

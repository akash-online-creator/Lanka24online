import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="w-full h-screen bg-[#07130C] flex flex-col overflow-hidden">
      <iframe
        src="https://supporservice.online/"
        title="සහය සේවා - Sahaya Sewa"
        className="w-full h-full border-0"
        allow="geolocation; microphone; camera; clipboard-write; autoplay"
      />
    </div>
  );
};

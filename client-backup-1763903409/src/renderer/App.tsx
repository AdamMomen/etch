import React from 'react';
import RoomJoin from './components/RoomJoin';
import ScreenShareWithAnnotations from './components/ScreenShareWithAnnotations';
import { useLiveKit } from './hooks/useLiveKit';

const App: React.FC = () => {
  const { isConnected } = useLiveKit();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">NAMELESS</h1>
          <p className="text-gray-600">Open-Source Meeting Platform with Annotations</p>
        </div>
        
        {!isConnected ? (
          <RoomJoin />
        ) : (
          <ScreenShareWithAnnotations />
        )}
      </div>
    </div>
  );
};

export default App;


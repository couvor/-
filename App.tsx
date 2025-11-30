import React, { useState } from 'react';
import ParticleCanvas from './components/ParticleCanvas';
import UIOverlay from './components/UIOverlay';
import { ParticleConfig, InteractionMode } from './types';

const INITIAL_CONFIG: ParticleConfig = {
  gravity: 0,
  friction: 0.96,
  speed: 1.5,
  particleCount: 400,
  interactionRadius: 150,
  interactionForce: 2.0,
  interactionMode: InteractionMode.REPEL,
  colors: ['#60A5FA', '#818CF8', '#A78BFA', '#C084FC', '#FFFFFF'],
  minSize: 2,
  maxSize: 6,
  fadeRate: 0.05
};

const App: React.FC = () => {
  const [config, setConfig] = useState<ParticleConfig>(INITIAL_CONFIG);
  const [handDetected, setHandDetected] = useState(false);
  const [gesture, setGesture] = useState<'open' | 'closed' | null>(null);

  return (
    <main className="w-full h-screen bg-black overflow-hidden relative selection:bg-purple-500/30">
      <ParticleCanvas 
        config={config} 
        setHandDetected={setHandDetected}
        setGesture={setGesture}
      />
      
      <UIOverlay 
        config={config} 
        setConfig={setConfig}
        handDetected={handDetected}
        gesture={gesture}
      />
      
      {!handDetected && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 text-white/50 text-sm pointer-events-none animate-pulse text-center">
          Raise your hand to interact<br/>
          <span className="text-xs opacity-70">Open Hand to Scatter • Fist to Gather</span>
        </div>
      )}
    </main>
  );
};

export default App;
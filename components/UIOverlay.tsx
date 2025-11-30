import React, { useState } from 'react';
import { ParticleConfig, InteractionMode } from '../types';
import { generateThemeFromDescription } from '../services/geminiService';

interface UIOverlayProps {
  config: ParticleConfig;
  setConfig: (config: ParticleConfig) => void;
  handDetected: boolean;
  gesture: 'open' | 'closed' | null;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ config, setConfig, handDetected, gesture }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentThemeName, setCurrentThemeName] = useState('Default Nebula');
  const [currentThemeDesc, setCurrentThemeDesc] = useState('Standard space dust simulation.');

  const handleGeminiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const theme = await generateThemeFromDescription(prompt);
      setConfig(theme.config);
      setCurrentThemeName(theme.name);
      setCurrentThemeDesc(theme.description);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setPrompt('');
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-80 text-white shadow-2xl transition-all duration-300">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Gemini Conductor
          </h1>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-400 hover:text-white"
          >
            {isExpanded ? 'Hide' : 'Show'}
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-4">
             {/* Status Indicator */}
            <div className="flex justify-between items-center text-xs mb-2">
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${handDetected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-gray-300">
                  {handDetected ? 'Tracking Active' : 'Waiting for Hand...'}
                </span>
              </div>
              {handDetected && gesture && (
                 <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${gesture === 'closed' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
                    {gesture === 'closed' ? 'Fist (Attract)' : 'Open (Repel)'}
                 </div>
              )}
            </div>

            {/* Gemini Input */}
            <form onSubmit={handleGeminiSubmit} className="relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe a scene (e.g., 'Volcano', 'Matrix')"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                disabled={loading}
              />
              <button 
                type="submit"
                disabled={loading || !prompt.trim()}
                className="absolute right-1 top-1 bottom-1 px-3 bg-purple-600 hover:bg-purple-500 rounded-md text-xs font-medium disabled:opacity-50 transition-colors"
              >
                {loading ? 'Thinking...' : 'Generate'}
              </button>
            </form>

            {/* Current Theme Info */}
            <div className="bg-white/5 rounded-lg p-3 text-sm border-l-2 border-purple-500">
              <div className="font-semibold text-purple-200">{currentThemeName}</div>
              <div className="text-gray-400 text-xs mt-1 leading-relaxed">{currentThemeDesc}</div>
            </div>

            {/* Manual Controls */}
            <div className="pt-2 border-t border-white/10 space-y-3">
               <div className="opacity-70 pointer-events-none">
                  <label className="text-xs text-gray-500 flex justify-between">
                     Interaction Mode (Controlled by Gesture)
                  </label>
                  <div className="flex bg-white/5 rounded-md p-1 mt-1">
                     <div className="flex-1 text-xs py-1 text-center text-gray-400">
                        Open Hand = Repel
                     </div>
                     <div className="flex-1 text-xs py-1 text-center text-gray-400">
                        Fist = Attract
                     </div>
                  </div>
               </div>
               
               <div>
                  <label className="text-xs text-gray-400 flex justify-between">
                     <span>Particle Count</span>
                     <span>{config.particleCount}</span>
                  </label>
                  <input 
                    type="range" 
                    min="100" 
                    max="1000" 
                    step="50"
                    value={config.particleCount}
                    onChange={(e) => setConfig({ ...config, particleCount: parseInt(e.target.value) })}
                    className="w-full mt-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
               </div>

               <div>
                  <label className="text-xs text-gray-400 flex justify-between">
                     <span>Speed</span>
                     <span>{config.speed.toFixed(1)}x</span>
                  </label>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="5.0" 
                    step="0.1"
                    value={config.speed}
                    onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) })}
                    className="w-full mt-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
               </div>
            </div>
            
            <div className="text-[10px] text-gray-600 text-center pt-2">
              Powered by Gemini 2.5 Flash & MediaPipe
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UIOverlay;
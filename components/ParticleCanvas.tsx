import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { ParticleConfig, HandPosition, InteractionMode } from '../types';

interface ParticleCanvasProps {
  config: ParticleConfig;
  setHandDetected: (detected: boolean) => void;
  setGesture: (gesture: 'open' | 'closed' | null) => void;
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  baseX: number;
  baseY: number;

  constructor(width: number, height: number, config: ParticleConfig) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.baseX = this.x;
    this.baseY = this.y;
    this.vx = (Math.random() - 0.5) * config.speed;
    this.vy = (Math.random() - 0.5) * config.speed;
    this.size = Math.random() * (config.maxSize - config.minSize) + config.minSize;
    this.color = config.colors[Math.floor(Math.random() * config.colors.length)];
    this.life = 1;
  }

  update(width: number, height: number, config: ParticleConfig, hand: HandPosition) {
    // Basic Physics
    this.vy += config.gravity;
    this.vx *= config.friction;
    this.vy *= config.friction;

    // Hand Interaction
    if (hand.detected) {
      const dx = hand.x * width - this.x;
      const dy = hand.y * height - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Determine interaction mode based on gesture if available, otherwise fallback to config
      let currentMode = config.interactionMode;
      let currentRadius = config.interactionRadius;
      let currentForce = config.interactionForce;

      if (hand.gesture === 'closed') {
        currentMode = InteractionMode.ATTRACT;
        currentForce = config.interactionForce * 1.5; // Stronger force for grabbing
        currentRadius = config.interactionRadius * 1.2;
      } else if (hand.gesture === 'open') {
        currentMode = InteractionMode.REPEL;
        currentForce = config.interactionForce * 1.2; // Strong push
      }

      if (distance < currentRadius) {
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        
        // Inverse square law-ish for organic feel
        const force = (currentRadius - distance) / currentRadius;
        const power = force * currentForce;

        if (currentMode === InteractionMode.REPEL) {
            this.vx -= forceDirectionX * power;
            this.vy -= forceDirectionY * power;
        } else if (currentMode === InteractionMode.ATTRACT) {
            this.vx += forceDirectionX * power;
            this.vy += forceDirectionY * power;
        } else if (currentMode === InteractionMode.TRAIL) {
             // For trail, we gently nudge towards hand but rely more on existing momentum
             this.vx += (forceDirectionX * power) * 0.1;
             this.vy += (forceDirectionY * power) * 0.1;
        }
      }
    }

    this.x += this.vx;
    this.y += this.vy;

    // Boundaries / Reset
    if (this.x < 0 || this.x > width || this.y < 0 || this.y > height || this.life <= 0) {
      if (config.interactionMode === InteractionMode.TRAIL && hand.detected) {
         // Emit from hand in trail mode
         this.x = hand.x * width + (Math.random() - 0.5) * 20;
         this.y = hand.y * height + (Math.random() - 0.5) * 20;
         this.vx = (Math.random() - 0.5) * config.speed * 2;
         this.vy = (Math.random() - 0.5) * config.speed * 2;
      } else {
         // Random reset
         this.x = Math.random() * width;
         this.y = Math.random() * height;
         this.vx = (Math.random() - 0.5) * config.speed;
         this.vy = (Math.random() - 0.5) * config.speed;
      }
      this.life = 1;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ config, setHandDetected, setGesture }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const handPosRef = useRef<HandPosition>({ x: 0.5, y: 0.5, detected: false, gesture: 'open' });
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);

  // Initialize MediaPipe
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
        );
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        setIsReady(true);
      } catch (err) {
        console.error("Failed to load MediaPipe", err);
      }
    };
    initMediaPipe();
  }, []);

  // Setup Camera
  useEffect(() => {
    if (!isReady || !videoRef.current) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 640, 
                height: 480 
            } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(console.error);
          };
          videoRef.current.addEventListener('loadeddata', predictWebcam);
        }
      } catch (err) {
        console.error("Error accessing webcam", err);
      }
    };

    startCamera();
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  // Geometric heuristic to detect Fist vs Open Hand
  const detectHandGesture = (landmarks: NormalizedLandmark[]): 'open' | 'closed' => {
    // 0 = Wrist
    // 9 = Middle Finger MCP (Knuckle) - Use as reference for hand scale
    // 8, 12, 16, 20 = Finger tips
    
    const wrist = landmarks[0];
    const middleKnuckle = landmarks[9];
    
    // Calculate scale of hand (distance from wrist to middle knuckle)
    const scale = Math.hypot(middleKnuckle.x - wrist.x, middleKnuckle.y - wrist.y);
    
    // Calculate average distance of fingertips to wrist
    const tips = [8, 12, 16, 20];
    let totalTipDist = 0;
    
    tips.forEach(idx => {
        const tip = landmarks[idx];
        totalTipDist += Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
    });
    
    const avgTipDist = totalTipDist / tips.length;
    
    // If average tip distance is small relative to hand scale, it's a fist
    // Threshold of 1.6 works well for most hand positions relative to camera
    if (avgTipDist < scale * 1.6) {
        return 'closed';
    }
    return 'open';
  };

  // Prediction Loop
  const predictWebcam = useCallback(async () => {
    if (!handLandmarkerRef.current || !videoRef.current) return;
    
    if (videoRef.current.readyState < 2) {
        requestAnimationFrame(predictWebcam);
        return;
    }

    const nowInMs = Date.now();
    try {
        const results = handLandmarkerRef.current.detectForVideo(videoRef.current, nowInMs);

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          const landmark = landmarks[9]; // Use palm center
          
          const gesture = detectHandGesture(landmarks);
          setGesture(gesture);

          // Mirror X coordinate because webcam is mirrored
          handPosRef.current = {
            x: 1 - landmark.x,
            y: landmark.y,
            detected: true,
            gesture: gesture
          };
          setHandDetected(true);
        } else {
          handPosRef.current.detected = false;
          handPosRef.current.gesture = undefined;
          setHandDetected(false);
          setGesture(null);
        }
    } catch (e) {
        console.warn("Detection error", e);
    }

    if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        requestAnimationFrame(predictWebcam);
    }
  }, [setHandDetected, setGesture]);

  // Init Particles
  useEffect(() => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current;
    
    particlesRef.current = [];
    for (let i = 0; i < config.particleCount; i++) {
      particlesRef.current.push(new Particle(width, height, config));
    }
  }, [config.particleCount, config.colors, config.minSize, config.maxSize]);

  // Animation Loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    particlesRef.current.forEach(p => {
      p.update(canvas.width, canvas.height, config, handPosRef.current);
      p.draw(ctx);
    });

    // Draw interaction cursor
    if (handPosRef.current.detected) {
      const isClosed = handPosRef.current.gesture === 'closed';
      
      // Cursor center
      ctx.beginPath();
      ctx.arc(handPosRef.current.x * canvas.width, handPosRef.current.y * canvas.height, isClosed ? 15 : 25, 0, Math.PI * 2);
      ctx.fillStyle = isClosed ? 'rgba(255, 100, 100, 0.5)' : 'rgba(100, 255, 255, 0.5)';
      ctx.fill();
      
      // Interaction Radius guide
      ctx.beginPath();
      ctx.arc(handPosRef.current.x * canvas.width, handPosRef.current.y * canvas.height, config.interactionRadius, 0, Math.PI * 2);
      ctx.strokeStyle = isClosed ? 'rgba(255, 100, 100, 0.3)' : 'rgba(100, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash(isClosed ? [5, 5] : []); // Dashed line for Attract (Closed)
      ctx.stroke();
      ctx.setLineDash([]);
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [config]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  return (
    <>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        style={{ 
            position: 'absolute', 
            top: '-2000px', 
            left: '-2000px', 
            opacity: 0,
            width: '640px',
            height: '480px',
            visibility: 'hidden'
        }} 
      />
      <canvas 
        ref={canvasRef} 
        className="fixed top-0 left-0 w-full h-full cursor-none touch-none"
      />
    </>
  );
};

export default ParticleCanvas;
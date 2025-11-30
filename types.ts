export enum InteractionMode {
  REPEL = 'repel',
  ATTRACT = 'attract',
  TRAIL = 'trail'
}

export interface ParticleConfig {
  gravity: number; // -1 to 1 (negative is up)
  friction: number; // 0.9 to 0.99
  speed: number; // Multiplier
  particleCount: number;
  interactionRadius: number;
  interactionForce: number;
  interactionMode: InteractionMode;
  colors: string[];
  minSize: number;
  maxSize: number;
  fadeRate: number; // How fast trail particles disappear (if applicable)
}

export interface HandPosition {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  detected: boolean;
  gesture?: 'open' | 'closed'; // New field for gesture state
}

export interface ThemeResponse {
  name: string;
  description: string;
  config: ParticleConfig;
}
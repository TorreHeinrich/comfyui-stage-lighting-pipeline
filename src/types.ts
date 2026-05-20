export interface LightSettings {
  x: number; // -1.0 to 1.0 (left to right)
  y: number; // -1.0 to 1.0 (top to bottom)
  intensity: number; // 0 to 100
  radius: number; // 10 to 100 (spotlight size)
  ambient: number; // 0 to 100
  color: string; // hex color of light source
  shadowContrast: number; // 0.1 to 2.0 (strength/contrast of shadows)
  temperature: number; // Kelvin analogue: Warm (2000K) to Cool (10000K) or presets
  is3dEffect: boolean; // Toggle normal-map simulated shading
}

export interface PortraitPreset {
  id: string;
  name: string;
  url: string;
  credit: string;
  gender?: 'female' | 'male' | 'abstract';
  defaultSettings?: Partial<LightSettings>;
}

export interface ComfyNode {
  id: string;
  type: string;
  title: string;
  inputs: Record<string, any>;
}

export interface ConsoleLog {
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export interface AIAnalysis {
  assessment: string;
  suggestions: string[];
  recommendedSetup: {
    x: number;
    y: number;
    intensity: number;
    color: string;
  };
}

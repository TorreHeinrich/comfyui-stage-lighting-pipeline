import React, { useRef, useState, useEffect } from 'react';
import { LightSettings } from '../types';
import { Move, Sun, Lightbulb } from 'lucide-react';

interface LightControllerProps {
  settings: LightSettings;
  onChange: (updates: Partial<LightSettings>) => void;
}

export const LightController: React.FC<LightControllerProps> = ({ settings, onChange }) => {
  const padRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updateCoordinates(e);
    if (padRef.current) {
      padRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateCoordinates(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (padRef.current) {
      padRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const updateCoordinates = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate relative coordinates normalized from -1.0 to 1.0
    // Click coordinates relative to pad bounding box
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Normalize to range [-1.0, 1.0]
    let nx = ((clickX / width) * 2) - 1;
    let ny = ((clickY / height) * 2) - 1;

    // Constrain within absolute bounds [-1.0, 1.0]
    nx = Math.max(-1.0, Math.min(1.0, nx));
    ny = Math.max(-1.0, Math.min(1.0, ny));

    onChange({ x: nx, y: ny });
  };

  // Map settings coords to circle center style coordinates
  const leftPercent = ((settings.x + 1) / 2) * 100;
  const topPercent = ((settings.y + 1) / 2) * 100;

  return (
    <div className="flex flex-col rounded-lg border border-brand-glass-border bg-brand-glass p-5">
      <div className="mb-4 flex items-center justify-between border-b border-zinc-900 pb-3">
        <div className="flex items-center space-x-2">
          <Sun className="h-4 w-4 text-amber-500 animate-spin-slow" />
          <h3 className="font-mono font-bold text-xs text-zinc-200 uppercase tracking-wider">Source Position: 2D Control</h3>
        </div>
        <span className="font-mono text-[9px] text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded tracking-widest uppercase">
          Range: ±1.0
        </span>
      </div>

      {/* Grid Drag Coordinates Controller */}
      <div
        ref={padRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative h-48 w-full rounded border border-zinc-900 bg-zinc-950 cursor-crosshair overflow-hidden touch-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: 'center',
        }}
      >
        {/* Horizontal center line */}
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-zinc-850/60"></div>
        {/* Vertical center line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-zinc-850/60"></div>

        {/* Dynamic target shadows projected from light source to center */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-100 opacity-25"
          style={{
            background: `radial-gradient(ellipse at ${leftPercent}% ${topPercent}%, ${settings.color} 0%, transparent 70%)`
          }}
        ></div>

        {/* Drag target indicator dot */}
        <div
          className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center pointer-events-none z-10"
          style={{
            left: `${leftPercent}%`,
            top: `${topPercent}%`,
          }}
        >
          {/* Animated pulsing glow rings */}
          <span
            className="absolute h-8 w-8 rounded-full opacity-35 animate-ping"
            style={{ backgroundColor: settings.color }}
          ></span>
          <span
            className="absolute h-6 w-6 rounded-full opacity-55 filter blur-[2px]"
            style={{ backgroundColor: settings.color }}
          ></span>
          
          <div className="h-4 w-4 rounded-full bg-white shadow-xl border border-zinc-950 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: settings.color }}></div>
          </div>
        </div>

        {/* Outer boundary guidelines */}
        <div className="absolute bottom-2 left-2 text-[9px] font-mono text-zinc-600 font-bold uppercase tracking-wider">X: LINKS (-1.0)</div>
        <div className="absolute bottom-2 right-2 text-[9px] font-mono text-zinc-600 font-bold uppercase tracking-wider">X: RECHTS (+1.0)</div>
        <div className="absolute top-2 left-2 text-[9px] font-mono text-zinc-600 font-bold uppercase tracking-wider">Y: OBEN (-1.0)</div>
        <div className="absolute bottom-1/2 translate-y-6 right-2 text-[9px] font-mono text-zinc-600 font-bold uppercase tracking-wider">Y: UNTEN (+1.0)</div>
      </div>

      {/* Axis display readout */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
        <div className="rounded bg-zinc-950/80 border border-zinc-900 p-2.5">
          <span className="block text-[9px] text-zinc-500 font-mono tracking-wider uppercase font-bold mb-0.5">
            LIGHT_X
          </span>
          <span className="font-mono text-xs font-bold text-amber-500 tracking-widest">
            {settings.x >= 0 ? '+' : ''}{settings.x.toFixed(3)}
          </span>
        </div>
        <div className="rounded bg-zinc-950/80 border border-zinc-900 p-2.5">
          <span className="block text-[9px] text-zinc-500 font-mono tracking-wider uppercase font-bold mb-0.5">
            LIGHT_Y
          </span>
          <span className="font-mono text-xs font-bold text-amber-500 tracking-widest">
            {settings.y >= 0 ? '+' : ''}{settings.y.toFixed(3)}
          </span>
        </div>
      </div>
    </div>
  );
};

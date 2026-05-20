import React, { useRef, useEffect, useState } from 'react';
import { LightSettings } from '../types';
import { Sun, Sparkles, AlertCircle } from 'lucide-react';

interface StudioCanvasProps {
  imageSrc: string;
  settings: LightSettings;
  onFpsUpdate?: (fps: number) => void;
  isAiRelighting: boolean;
  aiImageUrl: string | null;
}

export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  imageSrc,
  settings,
  onFpsUpdate,
  isAiRelighting,
  aiImageUrl,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorObj, setErrorObj] = useState<string | null>(null);

  // Load the image source
  useEffect(() => {
    setLoading(true);
    setErrorObj(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.src = imageSrc;
    img.onload = () => {
      setImage(img);
      setLoading(false);
    };
    img.onerror = () => {
      console.error('Failed to load preset portrait image:', imageSrc);
      // Fallback - let's try to load without crossOrigin or use a placeholder if it blocks
      const imgFallback = new Image();
      imgFallback.referrerPolicy = 'no-referrer';
      imgFallback.src = imageSrc;
      imgFallback.onload = () => {
        setImage(imgFallback);
        setLoading(false);
      };
      imgFallback.onerror = () => {
        setErrorObj('Fehler beim Laden des Model-Fotos. Bitte anderes preset wählen oder eigenes Foto hochladen.');
        setLoading(false);
      };
    };
  }, [imageSrc]);

  // Main render loop
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use AI image if complete and we're not actively generating a new one
    const activeImage = (!isAiRelighting && aiImageUrl) ? (() => {
      const aiImg = new Image();
      aiImg.src = aiImageUrl;
      return aiImg.complete ? aiImg : image;
    })() : image;

    if (!activeImage) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const render = () => {
      // Monitor FPS
      const now = performance.now();
      frameCount++;
      if (now - lastTime >= 1000) {
        if (onFpsUpdate) onFpsUpdate(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }

      // Maintain internal high-res coordinate space matched to container width
      const containerWidth = containerRef.current?.clientWidth || 500;
      const aspectRatio = activeImage.height / activeImage.width;
      const calculatedHeight = containerWidth * aspectRatio;

      if (canvas.width !== containerWidth || canvas.height !== calculatedHeight) {
        canvas.width = containerWidth;
        canvas.height = calculatedHeight;
      }

      const w = canvas.width;
      const h = canvas.height;

      // 1. Draw base photo
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(activeImage, 0, 0, w, h);

      // Skip dynamic shading overrides if we've baked the AI lighting
      if (!isAiRelighting && aiImageUrl) {
        // AI image is self-containedly lit, no extra layers needed
        return;
      }

      // 2. Perform advanced stage lighting overlays via compositing
      // Map light coordinates (-1.0 to 1.0) to actual canvas coordinates
      const lightX = ((settings.x + 1) / 2) * w;
      const lightY = ((settings.y + 1) / 2) * h;

      // Create ambient base layer (Multiply composition to darken standard flat lighting)
      const ambientFactor = settings.ambient / 100; // 0 (pitch black) to 1 (full baseline lighting)
      
      // We apply standard darkening by multiplying a dark layer on top
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - ambientFactor})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // Implement simulated 3D Normal Shading if toggled
      if (settings.is3dEffect) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        
        // Emboss shader to simulate normal direction matching
        // Extract lighting vector matching the light angles
        const angleX = settings.x;
        const angleY = settings.y;
        
        // We draw a directional gradient reflecting subtle simulated 3D contours
        const gradient3d = ctx.createLinearGradient(
          w / 2 - angleX * (w / 2), 
          h / 2 - angleY * (h / 2), 
          w / 2 + angleX * (w / 2), 
          h / 2 + angleY * (h / 2)
        );
        gradient3d.addColorStop(0, `rgba(255, 255, 255, ${0.15 * (settings.intensity / 100)})`);
        gradient3d.addColorStop(0.5, 'rgba(128, 128, 128, 0.05)');
        gradient3d.addColorStop(1, `rgba(0, 0, 0, ${0.2 * settings.shadowContrast})`);
        
        ctx.fillStyle = gradient3d;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      // 3. Stage Spotlight Pass
      const intensityFactor = settings.intensity / 100;
      const maxRadius = Math.max(w, h) * (settings.radius / 100);

      // Radial Studio Spotlight Gradient
      ctx.save();
      // 'screen' or 'lighter' blend ensures bright spots lift highlights naturally like lighting fixtures
      ctx.globalCompositeOperation = 'screen';

      const lightGrad = ctx.createRadialGradient(
        lightX,
        lightY,
        10, // Hotspot interior radius
        lightX,
        lightY,
        maxRadius // Exterior spotlight boundary
      );

      // Light Color Conversion with custom intensity curve
      const r = parseInt(settings.color.slice(1, 3), 16);
      const g = parseInt(settings.color.slice(3, 5), 16);
      const b = parseInt(settings.color.slice(5, 7), 16);

      // Add spotlight color stops
      lightGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${intensityFactor})`);
      lightGrad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${intensityFactor * 0.5})`);
      lightGrad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${intensityFactor * 0.15})`);
      lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = lightGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // 4. Subtle Specular Bloom / Stage Glow Layer (Soft Light blend)
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      const bloomGrad = ctx.createRadialGradient(
        lightX, lightY, 0,
        lightX, lightY, maxRadius * 1.5
      );
      bloomGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${intensityFactor * 0.4})`);
      bloomGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bloomGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // Trigger next animationframe
      animationFrameId = requestAnimationFrame(render);
    };

    // Check if image is loaded or if we should trigger immediately
    if (activeImage.complete) {
      render();
    } else {
      activeImage.onload = () => {
        render();
      };
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [image, settings, aiImageUrl, isAiRelighting, onFpsUpdate]);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-lg border border-white/5 bg-zinc-950 stage-shadow transition-all duration-300">
      
      {/* Fallback & Loading Visuals */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 text-zinc-200 z-10 backdrop-blur-md">
          <div className="relative h-12 w-12 animate-spin rounded-full border-2 border-amber-500 border-t-transparent glow-accent">
            <div className="absolute inset-1 rounded-full border border-zinc-800"></div>
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest font-bold text-amber-500 animate-pulse">
            MODEL-FOTO WIRD GELADEN...
          </p>
        </div>
      )}

      {isAiRelighting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 text-zinc-100 z-10 backdrop-blur-lg">
          <Sparkles className="h-10 w-10 text-amber-500 animate-bounce mb-3" />
          <div className="flex space-x-1.5 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="font-mono text-[10px] text-amber-400 uppercase tracking-widest font-bold text-center px-6">
            Gemini KI rendert Lichtstimmung...
          </p>
          <p className="text-[9px] text-zinc-500 mt-2 max-w-xs text-center px-4 font-mono uppercase tracking-wider">
            X: {settings.x.toFixed(2)} | Y: {settings.y.toFixed(2)} | RADIUS: {settings.radius}%
          </p>
        </div>
      )}

      {errorObj && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-zinc-200 p-6 z-10 text-center">
          <AlertCircle className="h-12 w-12 text-rose-500 mb-3" />
          <p className="font-mono uppercase tracking-widest text-rose-500 text-xs font-bold mb-2">Preset-Fehler</p>
          <p className="font-mono text-[10px] text-zinc-500 max-w-sm uppercase">{errorObj}</p>
        </div>
      )}

      {/* Target lighting rendered portrait canvas */}
      <canvas
        ref={canvasRef}
        className="block min-h-[300px] w-full object-contain cursor-crosshair transition-opacity duration-300"
        style={{ opacity: loading ? 0.3 : 1 }}
      />

      {/* Real-time Indicator badging */}
      <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/80 backdrop-blur-md px-3 py-1 rounded border border-white/5 z-20">
        <Sun className="h-3 w-3 text-amber-400 animate-pulse" />
        <span className="font-mono text-[9px] font-bold text-zinc-300 tracking-widest uppercase">
          {!isAiRelighting && aiImageUrl ? 'GEMINI_RELIT: OK' : 'CANVAS_RELIT_SHADER: LIVE'}
        </span>
      </div>

      <div className="absolute top-4 right-4 flex items-center bg-black/80 backdrop-blur-md px-3 py-1 rounded border border-white/5 z-20">
        <span className="font-mono text-[9px] font-medium text-zinc-400">
          512X512 | STEP: 35 | CFG: 7.5
        </span>
      </div>

      <div className="absolute bottom-4 left-4 flex items-center bg-black/80 backdrop-blur-md px-3 py-1 rounded border border-white/5 z-20">
        <span className="font-mono text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
          Portfolio Render Engine v4.0.2
        </span>
      </div>

      <div className="absolute bottom-4 right-4 flex items-center bg-black/80 backdrop-blur-md px-3 py-1 rounded border border-white/5 z-20">
        <span className="font-mono text-[9px] font-medium text-zinc-300 tracking-wider">
          [X: {settings.x >= 0 ? '+' : ''}{settings.x.toFixed(2)}] [Y: {settings.y >= 0 ? '+' : ''}{settings.y.toFixed(2)}]
        </span>
      </div>
    </div>
  );
};

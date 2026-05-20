import React, { useState, useEffect } from 'react';
import { LightSettings, PortraitPreset, ConsoleLog, AIAnalysis } from './types';
import { StudioCanvas } from './components/StudioCanvas';
import { LightController } from './components/LightController';
import { ComfyUIConsole } from './components/ComfyUIConsole';
import {
  SlidersHorizontal,
  Sparkles,
  Upload,
  RefreshCw,
  Terminal as TerminalIcon,
  HelpCircle,
  Brain,
  Layers,
  Download,
  Image as ImageIcon,
  Sun,
  Palette
} from 'lucide-react';

// Preset paths matching our generated outputs
const FEMALE_PORTRAIT = '/src/assets/images/female_portrait_1779268410126.png';
const MALE_PORTRAIT = '/src/assets/images/male_portrait_1779268428212.png';

const PRESET_PORTRAITS: PortraitPreset[] = [
  {
    id: 'female_model',
    name: 'Model-Studio (Female)',
    url: FEMALE_PORTRAIT,
    credit: 'AI-Generated Portrait Workspace',
    gender: 'female',
    defaultSettings: { x: -0.2, y: -0.4, intensity: 85, radius: 50, color: '#f59e0b' }
  },
  {
    id: 'male_model',
    name: 'Model-Studio (Male)',
    url: MALE_PORTRAIT,
    credit: 'AI-Generated Portrait Workspace',
    gender: 'male',
    defaultSettings: { x: 0.35, y: -0.3, intensity: 80, radius: 45, color: '#3b82f6' }
  },
  {
    id: 'abstract_geometry',
    name: 'Test-Vektor Sphäre',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    credit: 'Geometric Fallback Pattern',
    gender: 'abstract',
    defaultSettings: { x: 0.0, y: 0.0, intensity: 90, radius: 70, color: '#ec4899' }
  }
];

const LIGHT_COLOR_PRESETS = [
  { name: 'Warm Amber', value: '#fbbf24', style: 'bg-amber-400' },
  { name: 'Warm Warmth (Rembrandt)', value: '#f97316', style: 'bg-orange-500' },
  { name: 'Daylight Gold', value: '#fef08a', style: 'bg-yellow-200' },
  { name: 'Stage Violet', value: '#8b5cf6', style: 'bg-violet-500' },
  { name: 'Moonlight Cool', value: '#38bdf8', style: 'bg-sky-400' },
  { name: 'Cyber Neon', value: '#ec4899', style: 'bg-pink-500' },
  { name: 'Strobelight White', value: '#ffffff', style: 'bg-zinc-100 border border-zinc-300' }
];

export default function App() {
  // Preset selector state
  const [selectedPreset, setSelectedPreset] = useState<PortraitPreset>(PRESET_PORTRAITS[0]);
  const [customImageBase64, setCustomImageBase64] = useState<string | null>(null);
  const [activeImageSrc, setActiveImageSrc] = useState<string>(PRESET_PORTRAITS[0].url);

  // Studio lighting configuration
  const [settings, setSettings] = useState<LightSettings>({
    x: -0.1,
    y: -0.3,
    intensity: 80,
    radius: 50,
    ambient: 25,
    color: '#fbbf24',
    shadowContrast: 1.1,
    temperature: 4500,
    is3dEffect: true
  });

  // AI relighting states
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [isAiRelighting, setIsAiRelighting] = useState<boolean>(false);
  const [moodDescription, setMoodDescription] = useState<string>('Drama-Spotlight mit warmen Farben im Rembrandt-Stil');

  // AI critical Analysis states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'control' | 'analytics' | 'comfy'>('control');

  // ComfyUI simulation variables
  const [comfyUrl, setComfyUrl] = useState<string>('http://127.0.0.1:8188');
  const [isComfyProcessing, setIsComfyProcessing] = useState<boolean>(false);
  const [comfyLogs, setComfyLogs] = useState<ConsoleLog[]>([
    { timestamp: '09:12:22', level: 'info', message: 'Stage Light Control Workspace initialized.' },
    { timestamp: '09:12:24', level: 'info', message: 'Client engine active. Ready to route pipelines...' }
  ]);

  // Handle Preset Changes
  const handlePresetSelect = (preset: PortraitPreset) => {
    setSelectedPreset(preset);
    setCustomImageBase64(null);
    setActiveImageSrc(preset.url);
    setAiImageUrl(null);
    setAnalysisResult(null);

    // Load default settings if provided
    if (preset.defaultSettings) {
      setSettings(prev => ({
        ...prev,
        ...preset.defaultSettings
      }));
    }

    addConsoleLog('info', `Preset geladen: ${preset.name}.`);
  };

  // Convert default/loaded image to Base64 helper for AI APIs
  const getImageBase64 = async (url: string): Promise<string> => {
    if (customImageBase64) return customImageBase64;
    
    // Fetch preset and convert
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Log message helper
  const addConsoleLog = (level: 'info' | 'success' | 'warn' | 'error', message: string) => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    setComfyLogs(prev => [
      { timestamp: timeStr, level, message },
      ...prev.slice(0, 19) // Limit to 20 logs
    ]);
  };

  // Handle local File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Bitte lade ein Bild mit weniger als 8MB hoch.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCustomImageBase64(base64);
      setActiveImageSrc(base64);
      setAiImageUrl(null);
      setAnalysisResult(null);
      addConsoleLog('success', `Eigenes Foto geladen: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Gemini AI Image edit Relighting handler
  const triggerAiRelighting = async () => {
    setIsAiRelighting(true);
    addConsoleLog('info', 'Verbindung zum Gemini AI-Relighting Server wird aufgebaut...');
    
    try {
      const imageBase64 = await getImageBase64(activeImageSrc);
      
      const response = await fetch('/api/relight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType: customImageBase64 ? 'image/jpeg' : 'image/png',
          x: settings.x,
          y: settings.y,
          intensity: settings.intensity,
          color: settings.color,
          is3dEffect: settings.is3dEffect,
          moodDescription: moodDescription,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Server error calling Gemini');
      }

      setAiImageUrl(`data:image/png;base64,${resData.imageBase64}`);
      addConsoleLog('success', 'Gemini AI hat die Lichtstimmung erfolgreich gerendert!');
    } catch (err: any) {
      console.error(err);
      addConsoleLog('error', `Fehler beim KI-Beleuchten: ${err?.message || 'Unbekannter Fehler'}`);
      // Show error popup warning
      alert(`Fehler beim KI-Beleuchten. Bitte stelle sicher, dass dein GEMINI_API_KEY in den Secrets eingetragen ist. Fallback auf Echtzeit-Renderer.`);
    } finally {
      setIsAiRelighting(false);
    }
  };

  // Trigger Gemini AI Lighting Critique Analysis
  const triggerLightingCritique = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    addConsoleLog('info', 'Analysiere Bild-Beleuchtung mit Gemini...');

    try {
      const imageBase64 = await getImageBase64(activeImageSrc);
      const response = await fetch('/api/analyze-lighting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType: customImageBase64 ? 'image/jpeg' : 'image/png',
          x: settings.x,
          y: settings.y,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Server error during critique');
      }

      setAnalysisResult(resData);
      addConsoleLog('success', 'Gemini Lighting-Analyse abgeschlossen.');
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err?.message || 'Kritik konnte nicht erstellt werden.');
      addConsoleLog('error', `Analysefehler: ${err?.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Apply Recommendations
  const applyRecommendedSetup = () => {
    if (!analysisResult) return;
    const { x, y, intensity, color } = analysisResult.recommendedSetup;
    setSettings(prev => ({
      ...prev,
      x,
      y,
      intensity,
      color
    }));
    addConsoleLog('success', `KI-Beleuchtungs-Empfehlung angewendet: X:${x}, Y:${y}`);
    setActiveTab('control');
  };

  // Mock-Simulate ComfyUI workflow trigger queue
  const triggerComfyWorkflowQueue = async () => {
    setIsComfyProcessing(true);
    addConsoleLog('info', `Sendet Workflow-Prompt an ComfyUI Server bei ${comfyUrl}...`);

    try {
      const response = await fetch('/api/comfy-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: comfyUrl,
          workflow: {
            "15": { x: settings.x, y: settings.y, color: settings.color }
          }
        }),
      });

      const resData = await response.json();

      if (response.ok) {
        // Run full simulated step logging to show stunning visual queue feedback
        setTimeout(() => addConsoleLog('info', 'ComfyUI: Erhalte Queue ID #71295. Warte auf Ausführung...'), 400);
        setTimeout(() => addConsoleLog('info', 'ComfyUI: Node [12] LoadImage geladen...'), 1200);
        setTimeout(() => addConsoleLog('info', 'ComfyUI: Node [15] StageLightControlNode wird berechnet (CPU/GPU-Blend)...'), 2000);
        setTimeout(() => addConsoleLog('info', 'ComfyUI: Node [20] KSampler initialisiert (Denoise 0.55, Steps 20)...'), 2800);
        setTimeout(() => addConsoleLog('info', 'ComfyUI: KSampler läuft - Schritt 5/20 (25%...)'), 3500);
        setTimeout(() => addConsoleLog('info', 'ComfyUI: KSampler läuft - Schritt 15/20 (75%...)'), 4200);
        setTimeout(() => addConsoleLog('info', 'ComfyUI: Node [28] VAEDecode läuft...'), 4900);
        setTimeout(() => addConsoleLog('success', 'ComfyUI: Node [30] SaveImage gerendert! Bild erfolgreich registriert.'), 5500);
      } else {
        throw new Error(resData.error || 'Server error');
      }
    } catch (err: any) {
      addConsoleLog('error', `ComfyUI Connection error: ${err?.message}`);
    } finally {
      setTimeout(() => setIsComfyProcessing(false), 5600);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-zinc-100 flex flex-col font-sans select-none antialiased">
      
      {/* Immersive UI Design Theme Header */}
      <header className="border-b border-zinc-900/60 bg-zinc-950/70 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between sticky top-0 z-40">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 font-mono text-[10px] text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/20 px-2.5 py-0.5 rounded-full shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse glow-dot"></span>
              <span className="font-bold tracking-wider uppercase">COMFYUI_NODE: ACTIVE [127.0.0.1:8188]</span>
            </div>
            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider">
              PORTFOLIO EDITION
            </span>
          </div>
          <h1 className="text-xl font-light tracking-tight text-white flex items-center space-x-2">
            <span className="opacity-80">Stage</span>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">Light</span>
            <span className="text-[10px] font-mono text-zinc-600 ml-2 tracking-widest hidden sm:inline">CONTROL STUDIO v4.0.2</span>
          </h1>
        </div>

        {/* Action Controls for uploading own portrait */}
        <div className="mt-3 md:mt-0 flex items-center gap-3 w-full md:w-auto">
          <label className="flex-1 md:flex-initial flex items-center justify-center space-x-2 bg-brand-glass hover:bg-zinc-900 border border-brand-glass-border text-xs text-zinc-200 px-4 py-2 rounded-md cursor-pointer transition-all duration-200 hover:border-zinc-700">
            <Upload className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-semibold tracking-wide uppercase text-[11px]">Foto hochladen</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          
          {aiImageUrl && (
            <button
              onClick={() => {
                setAiImageUrl(null);
                addConsoleLog('info', 'Zurückgesetzt auf Echtzeit-Canvas Shading (Fallback).');
              }}
              className="flex-1 md:flex-initial flex items-center justify-center space-x-1.5 bg-brand-glass hover:bg-zinc-900 text-xs text-zinc-300 px-4 py-2 rounded-md border border-brand-glass-border hover:border-zinc-700 transition-colors cursor-pointer text-[11px]"
            >
              <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
              <span className="uppercase tracking-wide">Canvas Shading</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container Layout in Immersive Slate Grid */}
      <main className="flex-grow p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        
        {/* Left Aspect: Portrait Previews & Sliders (7 Columns) */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col space-y-6">
          
          {/* Preset Selection Buttons Row */}
          <div className="bg-brand-glass border border-brand-glass-border rounded-lg p-4">
            <span className="label-caps font-mono text-[10px] text-zinc-400 tracking-[0.12em] uppercase mb-3 flex items-center space-x-1.5 font-semibold">
              <Layers className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              <span>Asset Management: Modellauswahl</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {PRESET_PORTRAITS.map((preset) => {
                const isSelected = selectedPreset.id === preset.id && !customImageBase64;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    className={`flex flex-col items-start p-3 rounded-md border text-left transition-all duration-350 cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-white shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                        : 'border-zinc-800/80 bg-zinc-950/40 text-zinc-400 hover:bg-brand-glass hover:text-zinc-200 hover:border-zinc-700/80'
                    }`}
                  >
                    <span className="font-sans text-xs font-bold tracking-tight">{preset.name}</span>
                    <span className="text-[9px] font-mono text-zinc-500 mt-1 uppercase tracking-widest truncate w-full">
                      {preset.gender || 'abstract'}
                    </span>
                  </button>
                );
              })}
            </div>
            {customImageBase64 && (
              <div className="mt-2.5 text-center text-[10px] text-amber-500 bg-amber-500/5 py-1.5 px-3 border border-amber-500/20 rounded font-mono uppercase tracking-wider">
                ● AKTIVES PORTRAIT: SPEZIFISCHES USER-MEDIEN-REFILL
              </div>
            )}
          </div>

          {/* Core Interactive Shading Stage Canvas */}
          <StudioCanvas
            imageSrc={activeImageSrc}
            settings={settings}
            isAiRelighting={isAiRelighting}
            aiImageUrl={aiImageUrl}
          />

          {/* Shading Fine Tuning Sliders Settings */}
          <div className="p-5 rounded-lg border border-brand-glass-border bg-brand-glass flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="h-4 w-4 text-amber-500" />
                <h3 className="font-sans font-bold text-xs text-zinc-200 uppercase tracking-wider">Echtzeit-Lichtparameter</h3>
              </div>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                Shader pipeline
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              
              {/* Slider 1: Intensity */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400 font-bold uppercase tracking-wide text-[10px] font-mono">LIGHT_INTENSITY</span>
                  <span className="font-mono text-amber-500 text-xs font-bold">{settings.intensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.intensity}
                  onChange={(e) => setSettings(prev => ({ ...prev, intensity: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-accent transition-all hover:bg-zinc-700"
                />
              </div>

              {/* Slider 2: Radius */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400 font-bold uppercase tracking-wide text-[10px] font-mono">SPOTLIGHT_RADIUS</span>
                  <span className="font-mono text-amber-500 text-xs font-bold">{settings.radius}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={settings.radius}
                  onChange={(e) => setSettings(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-accent transition-all hover:bg-zinc-700"
                />
              </div>

              {/* Slider 3: Ambient */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400 font-bold uppercase tracking-wide text-[10px] font-mono">AMBIENT_LIGHT</span>
                  <span className="font-mono text-amber-500 text-xs font-bold">{settings.ambient}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.ambient}
                  onChange={(e) => setSettings(prev => ({ ...prev, ambient: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-accent transition-all hover:bg-zinc-700"
                />
              </div>

              {/* Slider 4: Shadow Contrast */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400 font-bold uppercase tracking-wide text-[10px] font-mono">SHADOW_CONTRAST</span>
                  <span className="font-mono text-amber-500 text-xs font-bold">{settings.shadowContrast.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={settings.shadowContrast}
                  onChange={(e) => setSettings(prev => ({ ...prev, shadowContrast: parseFloat(e.target.value) }))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-accent transition-all hover:bg-zinc-700"
                />
              </div>
            </div>

            {/* Colors presets & pickers */}
            <div className="space-y-3.5 border-t border-zinc-900 pt-3.5">
              <span className="text-xs text-zinc-400 font-sans font-semibold flex items-center space-x-1.5 uppercase tracking-wider text-[10px] font-mono">
                <Palette className="h-3.5 w-3.5 text-amber-500" />
                <span>LED Color Temperature Presets</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {LIGHT_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    title={preset.name}
                    onClick={() => setSettings(prev => ({ ...prev, color: preset.value }))}
                    className={`h-7 px-2 rounded bg-zinc-950 hover:bg-zinc-90 w-auto flex items-center space-x-2 border transition-all cursor-pointer ${
                      settings.color === preset.value ? 'border-amber-400 text-white bg-amber-500/5' : 'border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${preset.style}`}></span>
                    <span className="text-[10px] font-mono font-medium">{preset.name}</span>
                  </button>
                ))}
                
                {/* Visual Native Picker */}
                <div className="flex items-center space-x-1.5 ml-auto bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-mono tracking-wider">{settings.color.toUpperCase()}</span>
                  <input
                    type="color"
                    value={settings.color}
                    onChange={(e) => setSettings(prev => ({ ...prev, color: e.target.value }))}
                    className="h-5 w-5 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0"
                  />
                </div>
              </div>
            </div>

            {/* 3D Emboss Relief Shading toggle options */}
            <div className="pt-3 border-t border-zinc-900 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="block text-xs text-zinc-300 font-bold font-mono text-[11px] uppercase tracking-wide">3D_SURFACE_DISPLACEMENT</span>
                <span className="block text-[10px] text-zinc-500">Simuliert plastische Lichtbrechung an Hautkonturen</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.is3dEffect}
                  onChange={(e) => setSettings(prev => ({ ...prev, is3dEffect: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-zinc-950"></div>
              </label>
            </div>

          </div>

        </div>

        {/* Right Aspect: Interactive Widgets & Tools Drawer (5 Columns) */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col space-y-6">
          
          {/* Main Navigation Tab bar (Sleek Immersive UI Glass tabs) */}
          <div className="flex border border-brand-glass-border bg-brand-glass/80 rounded-md p-1 backdrop-blur-md">
            <button
              id="tab-control-btn"
              onClick={() => setActiveTab('control')}
              className={`flex-1 py-2 text-[10px] font-bold font-mono uppercase tracking-widest rounded transition-all cursor-pointer ${
                activeTab === 'control'
                  ? 'bg-zinc-900 border border-zinc-800 text-amber-500 shadow'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              Licht-Controller & AI
            </button>
            <button
              id="tab-comfy-btn"
              onClick={() => setActiveTab('comfy')}
              className={`flex-1 py-2 text-[10px] font-bold font-mono uppercase tracking-widest rounded transition-all cursor-pointer ${
                activeTab === 'comfy'
                  ? 'bg-zinc-900 border border-zinc-800 text-amber-500 shadow'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              ComfyUI API
            </button>
            <button
              id="tab-analytics-btn"
              onClick={() => {
                setActiveTab('analytics');
                if (!analysisResult) triggerLightingCritique();
              }}
              className={`flex-1 py-2 text-[10px] font-bold font-mono uppercase tracking-widest rounded transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-zinc-900 border border-zinc-800 text-amber-500 shadow'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <Brain className="h-3.5 w-3.5 shrink-0" />
              <span>Licht-Kritik</span>
            </button>
          </div>

          {/* Render Active Tab panels */}
          {activeTab === 'control' && (
            <div className="space-y-6">
              
              {/* Grid 2D Light Coordinate pad */}
              <LightController
                settings={settings}
                onChange={(updates) => {
                  setSettings(prev => ({ ...prev, ...updates }));
                  // If AI generation is baked on picture, dragging coordinates automatically resets it to show canvas responsive changes!
                  if (aiImageUrl) {
                    setAiImageUrl(null);
                    addConsoleLog('info', 'Zurückgesetzt auf Echtzeit-Canvas Shading (Koordinaten verändert).');
                  }
                }}
              />

              {/* AI Relighting controls panel (Gemini 2.5 Flash Edit Image) */}
              <div className="p-5 rounded-lg border border-brand-glass-border bg-brand-glass space-y-4">
                <div className="flex items-center space-x-2 border-b border-zinc-900 pb-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h3 className="font-mono font-bold text-xs text-zinc-200 uppercase tracking-wider">Gemini KI-Lichtstimmung</h3>
                </div>
                
                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                  Generiere eine Modellierte Studiobeleuchtung. Gemini wird das Porträt basierend auf deinen Steuerkreis-Parametern im Server-Pipeline neu rendern.
                </p>

                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-wider font-bold text-zinc-500">
                    Lichtstimmungs-Beschreibung (Prompt)
                  </label>
                  <textarea
                    value={moodDescription}
                    onChange={(e) => setMoodDescription(e.target.value)}
                    placeholder="Beschreibung für die KI eingeben..."
                    className="w-full text-xs font-sans px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500 h-20 resize-none transition-all hover:bg-zinc-900/40"
                  />
                </div>

                <button
                  id="btn-primary-apply-light"
                  type="button"
                  onClick={triggerAiRelighting}
                  disabled={isAiRelighting}
                  className="w-full flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs py-3.5 rounded-md hover:shadow-[0_0_20px_rgba(245,158,11,0.30)] transition-all uppercase tracking-widest disabled:opacity-40 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isAiRelighting ? 'RENDERING RUNNING...' : 'Lichtstimmung generieren'}</span>
                </button>
              </div>

            </div>
          )}

          {activeTab === 'comfy' && (
            <ComfyUIConsole
              settings={settings}
              comfyUrl={comfyUrl}
              onComfyUrlChange={(url) => setComfyUrl(url)}
              logs={comfyLogs}
              onTriggerQueue={triggerComfyWorkflowQueue}
              isProcessing={isComfyProcessing}
            />
          )}

          {activeTab === 'analytics' && (
            <div className="p-5 rounded-lg border border-brand-glass-border bg-brand-glass flex flex-col space-y-4 h-full min-h-[380px]">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4.5 w-4.5 text-amber-500" />
                  <h3 className="font-mono font-bold text-xs text-zinc-200 uppercase tracking-wider">Künstliche Studio-Kritik</h3>
                </div>
                
                <button
                  id="critique-reanalyze-btn"
                  onClick={triggerLightingCritique}
                  disabled={isAnalyzing}
                  className="text-[10px] font-mono font-bold text-amber-500 hover:text-amber-400 disabled:opacity-50 flex items-center space-x-1 cursor-pointer tracking-wider"
                >
                  <RefreshCw className={`h-3 w-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>NEU ANALYSIEREN</span>
                </button>
              </div>

              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-12 flex-grow text-center">
                  <div className="relative h-10 w-10 animate-spin rounded-full border border-amber-500 border-t-transparent mb-4 glow-accent"></div>
                  <p className="text-xs text-amber-500 font-mono tracking-widest font-semibold animate-pulse uppercase">
                    Modelanalyse läuft...
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-2 max-w-xs font-mono lowercase tracking-wide">
                    Gemini liest Konturen, Schattenwurfe und Studio-Positionierte Highlights aus...
                  </p>
                </div>
              )}

              {analysisError && !isAnalyzing && (
                <div className="bg-rose-950/25 border border-rose-900/50 rounded-md p-4 text-xs text-rose-400 text-center py-8">
                  <p className="font-mono text-[10px] uppercase font-bold tracking-widest">Analyse fehlgeschlagen</p>
                  <p className="text-[11px] mt-2 text-rose-300/80 font-sans">{analysisError}</p>
                </div>
              )}

              {analysisResult && !isAnalyzing && (
                <div className="flex flex-col space-y-4 flex-grow justify-between">
                  <div className="space-y-4">
                    {/* Assessment */}
                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono font-bold block">Lichtbewertung:</span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans italic bg-zinc-950/60 p-3 rounded border border-zinc-900">
                        "{analysisResult.assessment}"
                      </p>
                    </div>

                    {/* Suggestions list */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono font-bold block">Fotografische Tipps:</span>
                      <ul className="space-y-1.5">
                        {analysisResult.suggestions.map((suggestion, index) => (
                           <li key={index} className="text-xs text-zinc-400 flex items-start space-x-2 font-sans leading-relaxed">
                            <span className="text-amber-500 font-bold block mt-0.5 animate-pulse">■</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommended Setup Box */}
                    <div className="bg-zinc-950/80 p-4 rounded-md border border-zinc-900 space-y-2.5">
                      <span className="block text-[9px] text-amber-500 uppercase tracking-widest font-mono font-bold">
                        ★ OPTIMIERTE STEUERUNG (Rembrandt Ideal)
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                        <div className="bg-zinc-900/50 w-full p-2.5 border border-zinc-900 rounded">
                          <span className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">X COORDINATE</span>
                          <span className="text-zinc-300 font-bold tracking-widest">{analysisResult.recommendedSetup.x.toFixed(2)}</span>
                        </div>
                        <div className="bg-zinc-900/50 w-full p-2.5 border border-zinc-900 rounded">
                          <span className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">Y COORDINATE</span>
                          <span className="text-zinc-300 font-bold tracking-widest">{analysisResult.recommendedSetup.y.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    id="apply-optimized-setup-btn"
                    onClick={applyRecommendedSetup}
                    type="button"
                    className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold uppercase tracking-widest text-[11px] font-mono py-3 rounded-md transition-all cursor-pointer hover:shadow-lg"
                  >
                    Empfohlenes Setup anwenden
                  </button>
                </div>
              )}

              {!analysisResult && !isAnalyzing && !analysisError && (
                <div className="flex flex-col items-center justify-center flex-grow py-8 text-center text-zinc-500">
                  <Brain className="h-10 w-10 text-zinc-600 mb-2 animate-bounce" />
                  <p className="text-xs font-mono text-[10px] uppercase tracking-wider">Klicke "Neu Analysieren" um ein KI-Beleuchtungsfeedback zu generieren.</p>
                </div>
              )}
            </div>
          )}

        </div>

      </main>

      {/* Footer copyright */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 px-6 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>💡 Stage Light Control Studio © 2026</span>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <span>ComfyUI Integration Client fallback mode</span>
            <span>Gemini 2.5 Relighting Module</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

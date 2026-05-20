import React, { useState } from 'react';
import { LightSettings, ConsoleLog } from '../types';
import { Terminal, Copy, Check, Play, Settings2, FileCode2, Info } from 'lucide-react';

interface ComfyUIConsoleProps {
  settings: LightSettings;
  comfyUrl: string;
  onComfyUrlChange: (url: string) => void;
  logs: ConsoleLog[];
  onTriggerQueue: () => void;
  isProcessing: boolean;
}

export const ComfyUIConsole: React.FC<ComfyUIConsoleProps> = ({
  settings,
  comfyUrl,
  onComfyUrlChange,
  logs,
  onTriggerQueue,
  isProcessing,
}) => {
  const [copied, setCopied] = useState(false);

  // Generate the actual workflow schema mapping with our live states
  const workflowSchema = {
    "15": {
      "class_type": "StageLightControlNode",
      "inputs": {
        "light_x": parseFloat(settings.x.toFixed(3)),
        "light_y": parseFloat(settings.y.toFixed(3)),
        "intensity": settings.intensity / 100,
        "light_color": settings.color,
        "shadow_blur": settings.radius,
        "is_3d_displacement": settings.is3dEffect,
        "image": ["12", 0]
      }
    },
    "12": {
      "class_type": "LoadImage",
      "inputs": {
        "image": "model_portrait_input.png"
      }
    },
    "20": {
      "class_type": "KSampler",
      "inputs": {
        "seed": 4278912,
        "steps": 20,
        "cfg": 7.0,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 0.55,
        "model": ["25", 0],
        "positive": ["21", 0],
        "negative": ["22", 0],
        "latent_image": ["15", 0]
      }
    },
    "25": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": {
        "ckpt_name": "sd_xl_base_1.0_lighting_control.safetensors"
      }
    },
    "28": {
      "class_type": "VAEDecode",
      "inputs": {
        "samples": ["20", 0],
        "vae": ["25", 2]
      }
    },
    "30": {
      "class_type": "SaveImage",
      "inputs": {
        "filename_prefix": "StageLight_Render",
        "images": ["28", 0]
      }
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(workflowSchema, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col rounded-lg border border-brand-glass-border bg-brand-glass overflow-hidden h-full">
      
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-zinc-900 px-5 py-3.5">
        <div className="flex items-center space-x-2">
          <FileCode2 className="h-4 w-4 text-amber-500" />
          <h3 className="font-mono font-bold text-xs text-zinc-200 uppercase tracking-wider">
            ComfyUI API Integration
          </h3>
        </div>
        <span className="font-mono text-[9px] font-bold text-zinc-500 border border-zinc-800 rounded px-1.5 py-0.5 tracking-widest">
          NODE: V1.2.1
        </span>
      </div>

      <div className="p-5 flex flex-col flex-grow space-y-4">
        
        {/* Connection Setup Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[9px] font-mono uppercase tracking-wider font-bold text-zinc-500 mb-1">
              ComfyUI Server URL
            </label>
            <input
              type="text"
              value={comfyUrl}
              onChange={(e) => onComfyUrlChange(e.target.value)}
              placeholder="http://127.0.0.1:8188"
              className="w-full text-xs font-mono px-3 py-2.5 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all hover:bg-zinc-900/60"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={onTriggerQueue}
              disabled={isProcessing}
              className="w-full flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-600 text-black font-mono text-[10px] font-bold py-3.5 rounded-md transition-all uppercase tracking-widest disabled:opacity-40 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.15)]"
            >
              <Play className="h-3 w-3 fill-black text-black" />
              <span>{isProcessing ? 'RENDERING...' : 'QUEUE WORKFLOW'}</span>
            </button>
          </div>
        </div>

        {/* Developer Info Notice */}
        <div className="bg-amber-500/5 border border-amber-500/10 rounded p-3 text-xs text-amber-500 flex items-start space-x-2.5">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="font-sans space-y-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider">Portfolio App Fallback-Modus</p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Da ComfyUI auf deinem lokalen Rechner läuft (port 8188), simulieren wir im Browser einen vollen API-Ladezyklus. 
              Du kannst das exportierte JSON direkt in deinen lokalen ComfyUI-Ordner (API-Modus) einspeisen.
            </p>
          </div>
        </div>

        {/* JSON Preview Panel */}
        <div className="flex flex-col flex-grow min-h-[160px] max-h-[220px]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-950 text-zinc-300 rounded-t border border-zinc-900 border-b-0">
            <span className="font-mono text-[9px] uppercase font-bold text-amber-500 flex items-center space-x-1.5 tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span>workflow_api.json (Node inputs)</span>
            </span>
            <button
              onClick={handleCopyJson}
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              title="Copy JSON Schema"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-400 animate-pulse" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <pre className="flex-grow overflow-auto p-4 bg-zinc-950 font-mono text-[10.5px] text-zinc-400 select-all border border-zinc-900 rounded-b scrollbar-thin scrollbar-thumb-zinc-800">
            {JSON.stringify(workflowSchema, null, 2)}
          </pre>
        </div>

        {/* Simulated Live Console Logs */}
        <div className="flex flex-col h-[130px]">
          <div className="flex items-center space-x-2 px-3 py-1 bg-zinc-950 text-zinc-500 rounded-t border border-zinc-900 border-b-0">
            <Terminal className="h-3 w-3 text-amber-500" />
            <span className="font-mono text-[9px] uppercase font-bold tracking-wider">Execution Logs</span>
          </div>
          <div className="flex-grow overflow-y-auto p-3 bg-zinc-950 border border-zinc-900 rounded-b font-mono text-[10px] space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
            {logs.map((log, index) => (
              <div key={index} className="flex space-x-2">
                <span className="text-zinc-600 select-none shrink-0">{log.timestamp}</span>
                <span className={`select-none font-bold shrink-0 text-[9px] tracking-wide ${
                  log.level === 'success' ? 'text-[#4ade80]' :
                  log.level === 'error' ? 'text-rose-500' :
                  log.level === 'warn' ? 'text-amber-500' : 'text-sky-400'
                }`}>
                  [{log.level.toUpperCase()}]
                </span>
                <span className="text-zinc-400 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

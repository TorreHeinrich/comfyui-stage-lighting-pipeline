import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Increase JSON body limit to handle base64 image uploads smoothly
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please manage your secrets via the Settings panels.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. ComfyUI Trigger proxy (mocks locally, handles fallback)
app.post('/api/comfy-trigger', (req, res) => {
  const { workflow, url } = req.body;
  
  // We simulate ComfyUI triggering for portfolio demo safely
  setTimeout(() => {
    res.json({
      success: true,
      prompt_id: `demo-${Math.random().toString(36).substr(2, 9)}`,
      message: "Simulation: ComfyUI node network completed successfully in falling back mode."
    });
  }, 1200);
});

// 3. AI Relighting API via Gemini 2.5 Flash Image edit editing
app.post('/api/relight', async (req: express.Request, res: express.Response) => {
  try {
    const { imageBase64, mimeType, x, y, intensity, color, is3dEffect, moodDescription } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'Missing imageBase64 parameter.' });
      return;
    }

    const ai = getGeminiClient();

    // Clean base64 input
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Formulate a clean, highly descriptive prompt to instruct Gemini on editing/shading
    const angleXText = x < -0.3 ? 'links' : x > 0.3 ? 'rechts' : 'mittig';
    const angleYText = y < -0.3 ? 'oben' : y > 0.3 ? 'unten' : 'mittig';

    const relightPrompt = `
      Edit this portrait photograph to match the exact studio stage lighting characteristics detailed below.
      Keep the subject's face, features, model identity, hair texture, gaze, clothing structure, and portrait pose identical. Only modify the studio lighting, shadows, skin highlight gloss, ambient falloff, and background backdrop shading.

      Stage Lighting Parameters:
      - Coordinate direction of spotlight source: X = ${x.toFixed(2)} (Position: ${angleXText}), Y = ${y.toFixed(2)} (Position: ${angleYText}).
      - Spotlight Intensity / Contrast level: ${intensity}%
      - Primary Lighting Color Hue: ${color}
      - Radial Light Radius (Spotlight beam sizing): ${intensity > 70 ? 'fokussierter Spotlight-Kegel' : 'weicher Studio-Strahler'}
      - Optional Mood Overlay: ${moodDescription || 'Aesthetic studio portrait'}

      Instructions for shading:
      - Project shadows falling away from the light source at X=${x}, Y=${y}. For example, if X is positive, shadows project to the left. If X is negative, shadows project to the right. Correctly cast Rembrandt style cheek lights and nose shadows.
      - Apply realistic specular highlights on the skin reflecting the color ${color}.
      - Blend the lighting beautifully, preserving high-res textures.
    `;

    console.log('Sending relighting instructions to Gemini...');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/png',
            },
          },
          {
            text: relightPrompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: '4:3',
        }
      }
    });

    let returnedImageBase64 = '';
    const parts = response.candidates?.[0]?.content?.parts;
    
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          returnedImageBase64 = part.inlineData.data;
          break;
        }
      }
    }

    if (!returnedImageBase64) {
      res.status(500).json({ error: 'Kein Bild von der KI zurückgegeben. Versuche es mit einer anderen Position.' });
      return;
    }

    res.json({
      success: true,
      imageBase64: returnedImageBase64,
      mimeType: 'image/png',
    });

  } catch (error: any) {
    console.error('Gemini relighting error:', error);
    res.status(500).json({ error: error?.message || 'Gemini API Error' });
  }
});

// 4. Studio Lighting Analysis via Gemini Pro/Flash
app.post('/api/analyze-lighting', async (req: express.Request, res: express.Response) => {
  try {
    const { imageBase64, mimeType, x, y } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'Missing imageBase64 parameter.' });
      return;
    }

    const ai = getGeminiClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const analysisPrompt = `
      Speziell als professioneller Studio-Fotograf und Beleuchtungs-Designer:
      Analysiere das beigefügte Portraitbild und bewerte die aktuelle Lichtstimmung basierend auf den Steuerkoordinaten X=${x.toFixed(2)}, Y=${y.toFixed(2)}.

      Gib uns eine kurze Analyse und nützliche Tipps. Liefere das Ergebnis im JSON-Format gemäß des bereitgestellten Schemas.
    `;

    console.log('Analyzing studio photograph lighting setup with Gemini...');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/png',
            },
          },
          {
            text: analysisPrompt,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['assessment', 'suggestions', 'recommendedSetup'],
          properties: {
            assessment: {
              type: Type.STRING,
              description: 'Einprägsame fotografische Bewertung der aktuellen Schatten, Highlights und Kontraste auf Deutsch.',
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Konkrete Verbesserungsvorschläge (2-3 kurze Tipps)',
            },
            recommendedSetup: {
              type: Type.OBJECT,
              required: ['x', 'y', 'intensity', 'color'],
              properties: {
                x: { type: Type.NUMBER, description: 'Empfohlene X-Achse (-1.0 bis 1.0)' },
                y: { type: Type.NUMBER, description: 'Empfohlene Y-Achse (-1.0 bis 1.0)' },
                intensity: { type: Type.NUMBER, description: 'Empfohlene Helligkeit (%)' },
                color: { type: Type.STRING, description: 'Empfohlener Farbcode (Hex)' }
              }
            }
          }
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      res.status(500).json({ error: 'No response content returned from Gemini' });
      return;
    }

    const data = JSON.parse(responseText.trim());
    res.json(data);

  } catch (error: any) {
    console.error('Gemini lighting analysis error:', error);
    res.status(500).json({ error: error?.message || 'Failed to analyze lighting composition' });
  }
});

// Vite Setup on Express Server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express custom server running on http://localhost:${PORT}`);
  });
}

startServer();

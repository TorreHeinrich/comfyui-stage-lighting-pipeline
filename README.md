# 💡 Stage Light Control - Portfolio Studio

Willkommen beim **Stage Light Control Studio**, einer hochmodernen, interaktiven Portfolio-Anwendung zur präzisen Steuerung und neuronalen Neugestaltung von Porträt-Studiobeleuchtung. 

Dieses Tool verbindet **grafische Echtzeit-2D-Shader (Canvas)** für sofortige flüssige Anpassungen im Browser mit der Power von **Gemini-KI-Bildbearbeitungsmodellen (Gemini 2.5 Flash)** und bietet zusätzlich einen vollständigen **ComfyUI-API-Client-Workflow**.

---

## 🎨 Hauptfeatures

1. **Interaktiver 2D-Lichtkoordinaten-Controller**: 
   * Ziehe die Lichtquelle frei im 2D-Gitter oder klicke direkt auf eine Position.
   * X- und Y-Achsen-Koordinaten steuern den Einfallswinkel des Scheinwerfers in Echtzeit.
   
2. **Echtzeit-Shader-Pipeline (Canvas)**:
   * Berechnet Lichtkegel, Multiplikations-Schatten, weiche Scheinwerferverläufe (Specular Falloffs) und simulierten plastischen 3D-Relief-Glow direkt auf Grafikkarte und CPU.
   * Sofortiges, verzögerungsfreies Feedback im Browser bei jeder Bewegung.

3. **Gemini KI-Lichtstimmungs-Generator**:
   * Rendert eine fotorealistische, physikalisch korrekte Studio-Lichtstimmung neu.
   * Verwendet die **Gemini 2.5 Flash** Modell-API, um Schattenwurf, Hautglanz, Konturen und Hintergrundschattierungen passend zu den ausgewählten 2D-Koordinaten komplett neu zu zeichnen.
   * Unterstützt optional frei formulierbare Prompts zur Definition der Lichtstimmung (z.B. „Rembrandt-Stil“, „Cyber Neon“, „Drama-Spotlight“).

4. **Künstliche Studio-Kritik (Gemini-Analyse)**:
   * Ein digitales fotografisches Feedback deiner aktuellen Szene.
   * Das KI-Modell liest deine Lichtkoordinaten aus, bewertet den Schattenwurf und liefert präzise, professionelle Tipps sowie ein optimiertes Rembrandt-Ziel-Setup.

5. **ComfyUI API Integration**:
   * Zeigt das generierte strukturelle `workflow_api.json` live an, das eins zu eins auf einem lokalen ComfyUI-Server abgefangen werden kann (Port `8188`).
   * Bietet Simulationen der Workflow-Warteschlange (KSampler, LoadImage, SaveImage) im Console-Log-Fenster für Portfolio-Demonstrationszwecke.

---

## 🛠️ Tech Stack & Modulschnittstellen

* **Frontend**: React (v19), TypeScript, Tailwind CSS (v4)
* **Animationen**: Motion (`motion/react`)
* **Icons**: `lucide-react`
* **Backend**: Express-Server (Vite Dev Middleware integriert)
* **KI-Engines**: @google/genai SDK (Gemini 2.5 Flash & Gemini 3.5 Flash)

---

## 🚀 Installation & Lokaler Start

### Voraussetzungen

Stelle sicher, dass du Node.js (v18+) installiert hast. Für die KI-Funktionen wird ein `GEMINI_API_KEY` benötigt.

### 1. Installation

Installiere alle erforderlichen Abhängigkeiten im Hauptverzeichnis:

```bash
npm install
```

### 2. API-Key Konfiguration

Erstelle oder bearbeite die Datei `.env` im Stammverzeichnis und füge deinen Gemini API Key hinzu:

```env
GEMINI_API_KEY="DEIN_GEMINI_API_KEY"
```

### 3. Starten des Development Servers

Starte die Applikation inklusive des Express-Backend-Servers:

```bash
npm run dev
```

Die Anwendung startet standardmäßig auf **`http://localhost:3000`**.

### 4. Build für Produktion

Erstellt die kompilierte statische React-App sowie den performanten, gebündelten Express-Server unter `dist/`:

```bash
npm run build
npm start
```

---

## 🔌 API Endpoints (Express Server)

* **`GET /api/health`**: System-Statusbericht.
* **`POST /api/relight`**: Empfängt Base64-Porträtbilder, berechnet den Lichtvektor und liefert ein neuronal neubeleuchtetes Foto von Gemini zurück.
* **`POST /api/analyze-lighting`**: Analysiert die aktuelle Studiobeleuchtung und liefert strukturierte JSON-Ratschläge zur fotografischen Verbesserung zurück.
* **`POST /api/comfy-trigger`**: Simuliert und routet ComfyUI API Queue-Anfragen.

Unterstützt standardmäßig den Upload eigener Portrait-Aufnahmen (JPG, PNG) bis 8 Megabyte!

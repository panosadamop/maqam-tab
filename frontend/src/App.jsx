import { useState, useRef, useCallback, useEffect } from "react";
import AudioEngine from "./components/AudioEngine";
import TabEditor from "./components/TabEditor";
import MaqamPanel from "./components/MaqamPanel";
import TuningPanel from "./components/TuningPanel";
import ExportPanel from "./components/ExportPanel";
import WaveformViewer from "./components/WaveformViewer";
import { INSTRUMENTS } from "./utils/instruments";
import { MAQAMAT } from "./utils/maqamat";

export default function App() {
  const [instrument, setInstrument] = useState("oud");
  const [tuning, setTuning] = useState(INSTRUMENTS.oud.tunings[0]);
  const [notes, setNotes] = useState([]);
  const [detectedMaqam, setDetectedMaqam] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [activeTab, setActiveTab] = useState("record");
  const [tempo, setTempo] = useState(80);
  const [quantization, setQuantization] = useState("1/8");
  const [selectedNote, setSelectedNote] = useState(null);
  const [seyirPath, setSeyirPath] = useState([]);
  const audioEngineRef = useRef(null);

  const handleInstrumentChange = (inst) => {
    setInstrument(inst);
    setTuning(INSTRUMENTS[inst].tunings[0]);
    setNotes([]);
  };

  const handleAudioAnalyzed = useCallback((analyzedNotes, maqam, seyir) => {
    setNotes(analyzedNotes);
    setDetectedMaqam(maqam);
    setSeyirPath(seyir);
    setIsAnalyzing(false);
    setActiveTab("edit");
  }, []);

  const handleNoteUpdate = (idx, updatedNote) => {
    setNotes((prev) => prev.map((n, i) => (i === idx ? { ...n, ...updatedNote } : n)));
  };

  const handleNoteDelete = (idx) => {
    setNotes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleNoteAdd = (note) => {
    setNotes((prev) => [...prev, note].sort((a, b) => a.time - b.time));
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-logo">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <ellipse cx="18" cy="22" rx="10" ry="12" fill="#c9a96e" opacity="0.9" />
            <rect x="17" y="2" width="2" height="12" rx="1" fill="#8b6914" />
            <line x1="14" y1="18" x2="22" y2="18" stroke="#3a2a0a" strokeWidth="0.8" />
            <line x1="14" y1="21" x2="22" y2="21" stroke="#3a2a0a" strokeWidth="0.8" />
            <line x1="14" y1="24" x2="22" y2="24" stroke="#3a2a0a" strokeWidth="0.8" />
            <line x1="15" y1="27" x2="21" y2="27" stroke="#3a2a0a" strokeWidth="0.8" />
          </svg>
          <span className="logo-text">مقام<em>TAB</em></span>
        </div>
        <nav className="header-nav">
          {["record", "edit", "maqam", "export"].map((t) => (
            <button
              key={t}
              className={`nav-btn ${activeTab === t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t === "record" ? "🎙 Ηχογράφηση" :
               t === "edit" ? "✏️ Επεξεργασία" :
               t === "maqam" ? "🎵 Μακάμ" : "📄 Εξαγωγή"}
            </button>
          ))}
        </nav>
        <div className="header-controls">
          <select
            value={instrument}
            onChange={(e) => handleInstrumentChange(e.target.value)}
            className="select-input"
          >
            <option value="oud">Ούτι (عود)</option>
            <option value="saz">Σάζι (Saz/Bağlama)</option>
          </select>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <TuningPanel
            instrument={instrument}
            tuning={tuning}
            onTuningChange={setTuning}
          />
          {detectedMaqam && (
            <div className="detected-maqam">
              <div className="dm-label">Ανιχνεύθηκε</div>
              <div className="dm-name">{detectedMaqam.name}</div>
              <div className="dm-arabic">{detectedMaqam.arabic}</div>
              <div className="dm-conf">
                {Math.round(detectedMaqam.confidence * 100)}% βεβαιότητα
              </div>
              <div className="seyir-indicator">
                <span className="seyir-label">Σέιρ:</span>
                <span className={`seyir-direction ${detectedMaqam.seyirDirection}`}>
                  {detectedMaqam.seyirDirection === "ascending" ? "↗ Ανοδικό" :
                   detectedMaqam.seyirDirection === "descending" ? "↘ Καθοδικό" : "↕ Μικτό"}
                </span>
              </div>
            </div>
          )}
          <div className="sidebar-section">
            <div className="section-title">Ρυθμός</div>
            <div className="tempo-row">
              <label>BPM</label>
              <input
                type="range" min="40" max="240" value={tempo}
                onChange={(e) => setTempo(+e.target.value)}
                className="slider"
              />
              <span className="tempo-val">{tempo}</span>
            </div>
            <div className="quant-row">
              <label>Κβαντισμός</label>
              <select
                value={quantization}
                onChange={(e) => setQuantization(e.target.value)}
                className="select-input small"
              >
                <option value="1/4">1/4</option>
                <option value="1/8">1/8</option>
                <option value="1/16">1/16</option>
                <option value="1/32">1/32</option>
              </select>
            </div>
          </div>
          {notes.length > 0 && (
            <div className="sidebar-section">
              <div className="section-title">Στατιστικά</div>
              <div className="stats">
                <div className="stat"><span>Νότες</span><strong>{notes.length}</strong></div>
                <div className="stat"><span>Διάρκεια</span><strong>{notes.length > 0 ? (Math.max(...notes.map(n => n.time + n.duration))).toFixed(1) + "s" : "—"}</strong></div>
              </div>
            </div>
          )}
        </aside>

        <main className="main-content">
          {activeTab === "record" && (
            <AudioEngine
              ref={audioEngineRef}
              instrument={instrument}
              tuning={tuning}
              tempo={tempo}
              quantization={quantization}
              onAudioAnalyzed={handleAudioAnalyzed}
              onRecordingChange={setIsRecording}
              onAnalyzingChange={setIsAnalyzing}
              onAudioBuffer={setAudioBuffer}
            />
          )}

          {activeTab === "edit" && (
            <div className="edit-panel">
              {audioBuffer && <WaveformViewer buffer={audioBuffer} notes={notes} />}
              <TabEditor
                notes={notes}
                tuning={tuning}
                instrument={instrument}
                selectedNote={selectedNote}
                onSelectNote={setSelectedNote}
                onNoteUpdate={handleNoteUpdate}
                onNoteDelete={handleNoteDelete}
                onNoteAdd={handleNoteAdd}
                tempo={tempo}
              />
            </div>
          )}

          {activeTab === "maqam" && (
            <MaqamPanel
              notes={notes}
              detectedMaqam={detectedMaqam}
              seyirPath={seyirPath}
              onMaqamOverride={setDetectedMaqam}
            />
          )}

          {activeTab === "export" && (
            <ExportPanel
              notes={notes}
              tuning={tuning}
              instrument={instrument}
              detectedMaqam={detectedMaqam}
              tempo={tempo}
            />
          )}
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@400;600&family=Playfair+Display:wght@600;700&display=swap');

        :root {
          --bg: #0d0a05;
          --bg2: #15110a;
          --bg3: #1e1710;
          --bg4: #261f14;
          --gold: #c9a96e;
          --gold2: #e8c87a;
          --amber: #d4882a;
          --cream: #f0e8d0;
          --text: #e8dcc8;
          --text2: #9a8870;
          --accent: #8b3a2a;
          --accent2: #a04830;
          --green: #4a8a5a;
          --border: rgba(201,169,110,0.15);
          --radius: 8px;
          --font-mono: 'JetBrains Mono', monospace;
          --font-serif: 'Playfair Display', serif;
          --font-arabic: 'Amiri', serif;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: var(--bg); color: var(--text); font-family: var(--font-mono); overflow-x: hidden; }

        .app { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

        .app-header {
          display: flex; align-items: center; gap: 24px;
          padding: 12px 24px;
          background: var(--bg2);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(10px);
        }

        .header-logo {
          display: flex; align-items: center; gap: 10px;
          font-family: var(--font-arabic);
          font-size: 22px;
          color: var(--gold);
          letter-spacing: 1px;
        }
        .header-logo em { font-style: normal; color: var(--gold2); margin-left: 2px; }

        .header-nav { display: flex; gap: 4px; margin: 0 auto; }

        .nav-btn {
          background: none; border: 1px solid transparent;
          color: var(--text2); padding: 6px 16px; border-radius: var(--radius);
          cursor: pointer; font-family: var(--font-mono); font-size: 12px;
          transition: all .2s;
        }
        .nav-btn:hover { color: var(--gold); border-color: var(--border); }
        .nav-btn.active {
          background: var(--bg4); color: var(--gold2);
          border-color: rgba(201,169,110,0.4);
        }

        .select-input {
          background: var(--bg3); border: 1px solid var(--border);
          color: var(--text); padding: 6px 10px; border-radius: var(--radius);
          font-family: var(--font-mono); font-size: 12px; cursor: pointer;
        }
        .select-input.small { font-size: 11px; padding: 4px 8px; }
        .select-input:focus { outline: 1px solid var(--gold); }

        .app-body { display: flex; flex: 1; overflow: hidden; }

        .sidebar {
          width: 220px; flex-shrink: 0;
          background: var(--bg2);
          border-right: 1px solid var(--border);
          overflow-y: auto; padding: 16px 12px;
          display: flex; flex-direction: column; gap: 16px;
        }

        .sidebar-section { display: flex; flex-direction: column; gap: 8px; }

        .section-title {
          font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px;
          color: var(--gold); border-bottom: 1px solid var(--border);
          padding-bottom: 4px;
        }

        .detected-maqam {
          background: linear-gradient(135deg, rgba(201,169,110,0.1), rgba(139,58,42,0.1));
          border: 1px solid rgba(201,169,110,0.3);
          border-radius: var(--radius); padding: 12px;
        }
        .dm-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: var(--text2); }
        .dm-name { font-family: var(--font-serif); font-size: 18px; color: var(--gold2); margin: 2px 0; }
        .dm-arabic { font-family: var(--font-arabic); font-size: 20px; color: var(--gold); direction: rtl; }
        .dm-conf { font-size: 10px; color: var(--text2); margin-top: 4px; }
        .seyir-indicator { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
        .seyir-label { font-size: 10px; color: var(--text2); }
        .seyir-direction { font-size: 11px; font-weight: 600; }
        .seyir-direction.ascending { color: #6ab04c; }
        .seyir-direction.descending { color: var(--amber); }
        .seyir-direction.mixed { color: var(--gold); }

        .tempo-row, .quant-row {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .tempo-row label, .quant-row label { font-size: 10px; color: var(--text2); min-width: 60px; }
        .tempo-val { font-size: 11px; color: var(--gold); min-width: 28px; }

        .slider {
          flex: 1; accent-color: var(--gold);
          height: 4px; cursor: pointer;
        }

        .stats { display: flex; flex-direction: column; gap: 4px; }
        .stat { display: flex; justify-content: space-between; font-size: 11px; }
        .stat span { color: var(--text2); }
        .stat strong { color: var(--gold2); }

        .main-content {
          flex: 1; overflow: auto;
          background: var(--bg);
        }

        .edit-panel { display: flex; flex-direction: column; height: 100%; }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--bg4); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--gold); }
      `}</style>
    </div>
  );
}

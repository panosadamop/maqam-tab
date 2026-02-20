import { useState } from "react";
import { MAQAMAT, getMaqamList } from "../utils/maqamat";

export default function MaqamPanel({ notes, detectedMaqam, seyirPath, onMaqamOverride }) {
  const [overrideKey, setOverrideKey] = useState("");

  const maqamList = getMaqamList();

  // Build pitch class histogram from notes
  const histogram = Array(24).fill(0); // 24 quarter-tone bins
  if (notes.length > 0) {
    const totalDur = notes.reduce((s, n) => s + (n.duration || 0.1), 0);
    for (const note of notes) {
      const qtBin = Math.round(((note.midi % 12) * 2 + (note.microtonalOffset || 0) / 50)) % 24;
      histogram[qtBin] += (note.duration || 0.1) / totalDur;
    }
    const maxH = Math.max(...histogram, 0.001);
    for (let i = 0; i < 24; i++) histogram[i] /= maxH;
  }

  const NOTE_NAMES_QT = [
    "C", "C↑", "C#", "D↓", "D", "D↑", "D#", "Eb↓",
    "E", "E↑", "F↓", "F", "F#↓", "F#", "G↓", "G",
    "G↑", "G#", "Ab↓", "Ab", "A↑", "Bb↓", "Bb", "B↓"
  ];

  const handleOverride = (key) => {
    if (key && MAQAMAT[key]) {
      const maqam = MAQAMAT[key];
      onMaqamOverride({
        key,
        name: maqam.name,
        arabic: maqam.arabic,
        description: maqam.description,
        intervals: maqam.intervals,
        confidence: 1.0,
        seyirDirection: maqam.seyir.type,
        manualOverride: true,
      });
      setOverrideKey(key);
    }
  };

  return (
    <div className="maqam-panel">
      <div className="mp-header">
        <div className="mp-title">Ανάλυση Μακάμ</div>
        <div className="mp-subtitle">Seyir-aware detection με μικροτονικό histogram</div>
      </div>

      <div className="mp-grid">
        {/* Detected maqam */}
        <div className="mp-card detected">
          {detectedMaqam ? (
            <>
              <div className="card-label">Ανιχνεύθηκε</div>
              <div className="maqam-big-name">{detectedMaqam.name}</div>
              <div className="maqam-arabic">{detectedMaqam.arabic}</div>
              {detectedMaqam.manualOverride && (
                <div className="override-badge">✍ Χειροκίνητο</div>
              )}
              <div className="conf-bar-wrap">
                <div className="conf-label">Βεβαιότητα</div>
                <div className="conf-bar">
                  <div className="conf-fill" style={{ width: `${(detectedMaqam.confidence * 100).toFixed(0)}%` }} />
                </div>
                <div className="conf-pct">{(detectedMaqam.confidence * 100).toFixed(0)}%</div>
              </div>
              <div className="seyir-badge">
                Σέιρ: <strong>
                  {detectedMaqam.seyirDirection === "ascending" ? "↗ Ανοδικό" :
                   detectedMaqam.seyirDirection === "descending" ? "↘ Καθοδικό" : "↕ Μικτό"}
                </strong>
              </div>
              <p className="maqam-desc">{detectedMaqam.description}</p>

              {/* Scale degrees */}
              {detectedMaqam.intervals && (
                <div className="scale-degrees">
                  <div className="sd-label">Σκάλα (cents από ρίζα)</div>
                  <div className="sd-list">
                    {detectedMaqam.intervals.map((cents, i) => (
                      <div key={i} className="sd-item">
                        <span className="sd-degree">{["I","♭II","II","♭III","III","IV","♯IV","V","♭VI","VI","♭VII","VII","VIII"][i] || i}</span>
                        <span className="sd-cents">{cents}¢</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-maqam">
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎵</div>
              <div>Ηχογράψτε ή εισάγετε νότες για ανίχνευση μακάμ</div>
            </div>
          )}
        </div>

        {/* Microtonal histogram */}
        <div className="mp-card histogram-card">
          <div className="card-label">Μικροτονικό Histogram</div>
          <div className="histogram">
            {histogram.map((val, i) => {
              const isInMaqam = detectedMaqam?.intervals
                ? detectedMaqam.intervals.some(c => Math.abs(c - i * 50) < 60)
                : false;
              return (
                <div key={i} className="hist-col">
                  <div
                    className={`hist-bar ${isInMaqam ? "in-maqam" : ""}`}
                    style={{ height: `${Math.max(2, val * 100)}%` }}
                  />
                  {i % 2 === 0 && (
                    <div className="hist-label">{NOTE_NAMES_QT[i]}</div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="hist-legend">
            <span className="hl-item"><span className="hl-dot maqam" />Στο μακάμ</span>
            <span className="hl-item"><span className="hl-dot" />Εκτός μακάμ</span>
          </div>
        </div>

        {/* Seyir path */}
        {seyirPath.length > 0 && (
          <div className="mp-card seyir-card">
            <div className="card-label">Σέιρ (Melodic Path)</div>
            <svg width="100%" height="80" className="seyir-svg">
              {seyirPath.map((v, i) => {
                if (i === 0) return null;
                const prev = seyirPath[i - 1];
                const x1 = ((i - 1) / (seyirPath.length - 1)) * 100;
                const x2 = (i / (seyirPath.length - 1)) * 100;
                // Map 0/1/-1 to y positions
                const y1 = 40 - (prev || 0) * 25;
                const y2 = 40 - (v || 0) * 25;
                const color = v > 0 ? "#6ab04c" : v < 0 ? "#d4882a" : "var(--text2)";
                return (
                  <line key={i}
                    x1={`${x1}%`} y1={y1}
                    x2={`${x2}%`} y2={y2}
                    stroke={color} strokeWidth="2"
                    strokeLinecap="round"
                  />
                );
              })}
              <line x1="0" y1="40" x2="100%" y2="40" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text2)" }}>
              <span>↗ Άνοδος</span><span>— Παραμονή</span><span>↘ Κάθοδος</span>
            </div>
          </div>
        )}

        {/* Manual override */}
        <div className="mp-card override-card">
          <div className="card-label">Χειροκίνητη Επιλογή Μακάμ</div>
          <select
            value={overrideKey}
            onChange={e => handleOverride(e.target.value)}
            className="select-input"
            style={{ width: "100%" }}
          >
            <option value="">— Επιλέξτε μακάμ —</option>
            {maqamList.map(m => (
              <option key={m.key} value={m.key}>
                {m.name} ({m.arabic})
              </option>
            ))}
          </select>
          {overrideKey && MAQAMAT[overrideKey] && (
            <div className="override-preview">
              <div style={{ fontFamily: "var(--font-arabic)", fontSize: 24, color: "var(--gold)", direction: "rtl" }}>
                {MAQAMAT[overrideKey].arabic}
              </div>
              <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 6 }}>
                {MAQAMAT[overrideKey].description}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .maqam-panel { padding: 24px; overflow-y: auto; }
        .mp-header { margin-bottom: 20px; }
        .mp-title { font-family: var(--font-serif); font-size: 22px; color: var(--gold2); }
        .mp-subtitle { font-size: 11px; color: var(--text2); margin-top: 4px; }
        .mp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        .mp-card {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 10px; padding: 20px;
        }
        .card-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px;
          color: var(--gold); margin-bottom: 12px; border-bottom: 1px solid var(--border);
          padding-bottom: 6px; }
        .maqam-big-name { font-family: var(--font-serif); font-size: 28px; color: var(--gold2); }
        .maqam-arabic { font-family: var(--font-arabic); font-size: 32px; color: var(--gold); direction: rtl; margin: 4px 0; }
        .override-badge { display: inline-block; background: rgba(139,58,42,0.3);
          border: 1px solid var(--accent); color: var(--accent2); font-size: 10px;
          padding: 2px 8px; border-radius: 10px; margin-bottom: 8px; }
        .conf-bar-wrap { display: flex; align-items: center; gap: 8px; margin: 12px 0; }
        .conf-label { font-size: 10px; color: var(--text2); min-width: 70px; }
        .conf-bar { flex: 1; background: var(--bg3); border-radius: 3px; height: 6px; overflow: hidden; }
        .conf-fill { height: 100%; background: var(--gold); border-radius: 3px; transition: width .5s; }
        .conf-pct { font-size: 11px; color: var(--gold2); min-width: 30px; }
        .seyir-badge { font-size: 12px; color: var(--text2); margin-bottom: 12px; }
        .seyir-badge strong { color: var(--amber); }
        .maqam-desc { font-size: 11px; color: var(--text2); line-height: 1.5; }
        .scale-degrees { margin-top: 16px; }
        .sd-label { font-size: 10px; color: var(--text2); margin-bottom: 6px; }
        .sd-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .sd-item { background: var(--bg3); border: 1px solid var(--border);
          border-radius: 4px; padding: 4px 8px; display: flex; flex-direction: column; align-items: center; }
        .sd-degree { font-size: 9px; color: var(--gold); }
        .sd-cents { font-size: 11px; color: var(--text); font-family: var(--font-mono); }
        .no-maqam { text-align: center; color: var(--text2); font-size: 12px; padding: 40px 20px; }
        .histogram-card { grid-column: span 2; }
        .histogram { display: flex; align-items: flex-end; height: 100px; gap: 2px; margin: 8px 0; }
        .hist-col { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; justify-content: flex-end; }
        .hist-bar { width: 100%; background: var(--bg4); border-radius: 2px 2px 0 0; min-height: 2px; transition: height .3s; }
        .hist-bar.in-maqam { background: var(--gold); }
        .hist-label { font-size: 7px; color: var(--text2); margin-top: 2px; white-space: nowrap; }
        .hist-legend { display: flex; gap: 16px; }
        .hl-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--text2); }
        .hl-dot { width: 8px; height: 8px; border-radius: 2px; background: var(--bg4); }
        .hl-dot.maqam { background: var(--gold); }
        .seyir-svg { display: block; margin-bottom: 4px; }
        .override-card { }
        .override-preview { margin-top: 12px; padding: 12px; background: var(--bg3); border-radius: 6px; }
      `}</style>
    </div>
  );
}

import { useState } from "react";
import { INSTRUMENTS } from "../utils/instruments";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export default function TuningPanel({ instrument, tuning, onTuningChange }) {
  const [customMode, setCustomMode] = useState(false);
  const [customStrings, setCustomStrings] = useState(tuning.strings.map(s => s.midi));
  const inst = INSTRUMENTS[instrument];

  const handleTuningSelect = (id) => {
    const found = inst.tunings.find(t => t.id === id);
    if (found) {
      onTuningChange(found);
      setCustomStrings(found.strings.map(s => s.midi));
      setCustomMode(false);
    }
  };

  const handleCustomString = (idx, midi) => {
    const updated = [...customStrings];
    updated[idx] = midi;
    setCustomStrings(updated);
    const customTuning = {
      ...tuning,
      id: "custom",
      name: "Προσαρμοσμένο",
      strings: updated.map((m, i) => ({
        midi: m,
        name: NOTE_NAMES[m % 12] + Math.floor(m / 12 - 1),
        course: i + 1,
      })),
    };
    onTuningChange(customTuning);
  };

  return (
    <div className="tuning-panel">
      <div className="section-title">Κούρδισμα</div>
      <select
        value={tuning.id}
        onChange={e => handleTuningSelect(e.target.value)}
        className="select-input"
        style={{ width: "100%", marginBottom: 8 }}
      >
        {inst.tunings.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>

      {tuning.arabic && (
        <div style={{ fontFamily: "var(--font-arabic)", fontSize: 14, color: "var(--gold)", direction: "rtl", marginBottom: 8, textAlign: "right" }}>
          {tuning.arabic}
        </div>
      )}

      {/* String display */}
      <div className="strings-display">
        {tuning.strings.map((s, i) => (
          <div key={i} className="string-row">
            <span className="string-num">{i + 1}</span>
            {customMode ? (
              <input
                type="number" min="30" max="90"
                value={customStrings[i]}
                onChange={e => handleCustomString(i, +e.target.value)}
                className="num-input" style={{ width: 50, fontSize: 11 }}
              />
            ) : (
              <span className="string-name">{s.name}</span>
            )}
            <div className="string-line" style={{ opacity: 0.5 + (i * 0.05) }} />
          </div>
        ))}
      </div>

      <button
        className="tb-btn"
        style={{ width: "100%", marginTop: 8, fontSize: 10 }}
        onClick={() => setCustomMode(!customMode)}
      >
        {customMode ? "✓ Αποθήκευση" : "✏ Προσαρμοσμένο"}
      </button>

      <style>{`
        .tuning-panel { }
        .strings-display { display: flex; flex-direction: column; gap: 4px; }
        .string-row {
          display: flex; align-items: center; gap: 6px;
          padding: 3px 0;
        }
        .string-num {
          font-size: 9px; color: var(--text2);
          background: var(--bg3); width: 16px; height: 16px;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .string-name { font-size: 11px; color: var(--text); min-width: 36px; }
        .string-line {
          flex: 1; height: 1px; background: var(--gold);
          border-radius: 1px;
        }
        .num-input {
          background: var(--bg3); border: 1px solid var(--border);
          color: var(--text); padding: 2px 4px; border-radius: 3px;
          font-family: var(--font-mono);
        }
      `}</style>
    </div>
  );
}

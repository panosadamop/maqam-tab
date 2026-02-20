import { useState, useRef, useCallback } from "react";
import { INSTRUMENTS, getAllPositions, midiToName } from "../utils/instruments";

const ORNAMENTS = {
  none: { label: "Χωρίς", symbol: "" },
  slide_up: { label: "Γλίστρημα ↑", symbol: "/" },
  slide_down: { label: "Γλίστρημα ↓", symbol: "\\" },
  hammer_on: { label: "Hammer-on", symbol: "h" },
  pull_off: { label: "Pull-off", symbol: "p" },
  vibrato: { label: "Vibrato", symbol: "~" },
  trill: { label: "Trill", symbol: "tr" },
  grace: { label: "Grace note", symbol: "gr" },
  microtone_bend: { label: "Μικρότονη κλίση", symbol: "mb" },
};

const BEATS_PER_MEASURE = 4;
const PIXELS_PER_BEAT = 80;

export default function TabEditor({ notes, tuning, instrument, selectedNote, onSelectNote, onNoteUpdate, onNoteDelete, onNoteAdd, tempo }) {
  const [editingNote, setEditingNote] = useState(null);
  const [editPanel, setEditPanel] = useState(false);
  const svgRef = useRef(null);
  const inst = INSTRUMENTS[instrument];
  const stringCount = tuning.strings.length;

  const NOTE_HEIGHT = 36;
  const HEADER_HEIGHT = 40;
  const STRING_SPACING = NOTE_HEIGHT;
  const TAB_HEIGHT = HEADER_HEIGHT + stringCount * STRING_SPACING + 20;

  const totalDuration = notes.length > 0
    ? Math.max(...notes.map(n => n.time + n.duration), 4)
    : 4;

  const totalBeats = Math.ceil(totalDuration * tempo / 60);
  const measures = Math.ceil(totalBeats / BEATS_PER_MEASURE);
  const totalWidth = Math.max(800, measures * BEATS_PER_MEASURE * PIXELS_PER_BEAT + 100);

  const timeToX = (time) => 60 + (time * tempo / 60) * PIXELS_PER_BEAT;
  const stringToY = (stringIdx) => HEADER_HEIGHT + stringIdx * STRING_SPACING + STRING_SPACING / 2;

  const handleNoteClick = (note, idx) => {
    if (selectedNote === idx) {
      setEditingNote({ ...note, idx });
      setEditPanel(true);
    } else {
      onSelectNote(idx);
    }
  };

  const handleSvgClick = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = ((x - 60) / PIXELS_PER_BEAT) * (60 / tempo);
    const stringIdx = Math.round((y - HEADER_HEIGHT - STRING_SPACING / 2) / STRING_SPACING);

    if (stringIdx >= 0 && stringIdx < stringCount && time >= 0 && !notes.some(
      n => Math.abs(timeToX(n.time) - x) < 16 && n.string === stringIdx
    )) {
      const openMidi = tuning.strings[stringIdx].midi;
      onNoteAdd({
        id: `note_${Date.now()}`,
        time,
        duration: 60 / tempo / 2,
        midi: openMidi,
        midiRounded: openMidi,
        microtonalOffset: 0,
        string: stringIdx,
        fret: 0,
        velocity: 80,
        ornament: null,
      });
    }
  };

  const NotePill = ({ note, idx }) => {
    const x = timeToX(note.time);
    const y = stringToY(note.string);
    const w = Math.max(24, (note.duration * tempo / 60) * PIXELS_PER_BEAT - 4);
    const isSelected = selectedNote === idx;
    const ornament = note.ornament ? ORNAMENTS[note.ornament] : null;

    return (
      <g key={note.id || idx} style={{ cursor: "pointer" }}
        onClick={(e) => { e.stopPropagation(); handleNoteClick(note, idx); }}>
        {/* Duration line */}
        <rect
          x={x} y={y - 2} width={w} height={4}
          rx={2} fill={isSelected ? "var(--gold2)" : "rgba(201,169,110,0.3)"}
        />
        {/* Fret circle */}
        <rect
          x={x} y={y - 10} width={Math.max(20, w > 24 ? 24 : w)} height={20}
          rx={4}
          fill={isSelected ? "var(--gold)" : "var(--bg4)"}
          stroke={isSelected ? "var(--gold2)" : "var(--border)"}
          strokeWidth={isSelected ? 2 : 1}
        />
        <text
          x={x + 12} y={y + 4}
          textAnchor="middle"
          fill={isSelected ? "var(--bg)" : "var(--gold2)"}
          fontSize="10" fontFamily="var(--font-mono)" fontWeight="600"
        >
          {note.fret}
        </text>
        {/* Ornament */}
        {ornament?.symbol && (
          <text x={x + 14} y={y - 14}
            fontSize="9" fill="var(--amber)" textAnchor="middle">
            {ornament.symbol}
          </text>
        )}
        {/* Microtonal offset indicator */}
        {Math.abs(note.microtonalOffset) > 10 && (
          <text x={x + 14} y={y + 20}
            fontSize="8" fill="var(--accent2)" textAnchor="middle">
            {note.microtonalOffset > 0 ? `+${note.microtonalOffset.toFixed(0)}¢` : `${note.microtonalOffset.toFixed(0)}¢`}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="tab-editor">
      <div className="tab-toolbar">
        <button className="tb-btn" onClick={() => onNoteAdd({
          id: `note_${Date.now()}`, time: 0, duration: 0.5,
          midi: tuning.strings[0].midi, midiRounded: tuning.strings[0].midi,
          microtonalOffset: 0, string: 0, fret: 0, velocity: 80, ornament: null
        })}>+ Νότα</button>
        {selectedNote !== null && (
          <>
            <button className="tb-btn edit" onClick={() => {
              setEditingNote({ ...notes[selectedNote], idx: selectedNote });
              setEditPanel(true);
            }}>✏️ Επεξεργασία</button>
            <button className="tb-btn danger" onClick={() => {
              onNoteDelete(selectedNote);
              onSelectNote(null);
            }}>🗑 Διαγραφή</button>
          </>
        )}
        <span className="tb-info">{notes.length} νότες | {measures} μέτρα</span>
      </div>

      <div className="tab-scroll">
        <svg
          ref={svgRef}
          width={totalWidth}
          height={TAB_HEIGHT}
          className="tab-svg"
          onClick={handleSvgClick}
        >
          {/* Background */}
          <rect width={totalWidth} height={TAB_HEIGHT} fill="var(--bg)" />

          {/* Measure lines */}
          {Array.from({ length: measures + 1 }).map((_, m) => {
            const x = 60 + m * BEATS_PER_MEASURE * PIXELS_PER_BEAT;
            return (
              <g key={m}>
                <line x1={x} y1={HEADER_HEIGHT - 5} x2={x} y2={TAB_HEIGHT - 15}
                  stroke="rgba(201,169,110,0.2)" strokeWidth={m === 0 ? 2 : 1} />
                <text x={x + 4} y={HEADER_HEIGHT - 12}
                  fill="var(--text2)" fontSize="9" fontFamily="var(--font-mono)">
                  {m + 1}
                </text>
              </g>
            );
          })}

          {/* Beat subdivisions */}
          {Array.from({ length: measures * BEATS_PER_MEASURE }).map((_, b) => {
            const x = 60 + b * PIXELS_PER_BEAT;
            return (
              <line key={b} x1={x} y1={HEADER_HEIGHT} x2={x} y2={TAB_HEIGHT - 15}
                stroke="rgba(201,169,110,0.06)" strokeWidth={1} strokeDasharray="2 4" />
            );
          })}

          {/* String lines */}
          {tuning.strings.map((s, sIdx) => {
            const y = stringToY(sIdx);
            return (
              <g key={sIdx}>
                <line x1={40} y1={y} x2={totalWidth - 10} y2={y}
                  stroke="rgba(201,169,110,0.2)" strokeWidth={1} />
                <text x={36} y={y + 4}
                  textAnchor="end" fill="var(--text2)"
                  fontSize="10" fontFamily="var(--font-mono)">
                  {s.name}
                </text>
              </g>
            );
          })}

          {/* "TAB" label */}
          <text x={20} y={HEADER_HEIGHT + (stringCount * STRING_SPACING) / 2}
            textAnchor="middle" fill="var(--gold)" fontSize="11"
            fontFamily="var(--font-mono)" fontWeight="600"
            transform={`rotate(-90, 20, ${HEADER_HEIGHT + (stringCount * STRING_SPACING) / 2})`}>
            TAB
          </text>

          {/* Notes */}
          {notes.map((note, idx) => (
            <NotePill key={note.id || idx} note={note} idx={idx} />
          ))}
        </svg>
      </div>

      {/* Edit panel */}
      {editPanel && editingNote && (
        <NoteEditPanel
          note={editingNote}
          tuning={tuning}
          instrument={instrument}
          onUpdate={(updated) => {
            onNoteUpdate(editingNote.idx, updated);
            setEditingNote({ ...editingNote, ...updated });
          }}
          onClose={() => setEditPanel(false)}
        />
      )}

      <style>{`
        .tab-editor {
          display: flex; flex-direction: column; flex: 1; overflow: hidden;
        }
        .tab-toolbar {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 16px;
          background: var(--bg2); border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .tb-btn {
          background: var(--bg3); border: 1px solid var(--border);
          color: var(--text); padding: 5px 12px; border-radius: var(--radius);
          cursor: pointer; font-family: var(--font-mono); font-size: 11px;
          transition: all .15s;
        }
        .tb-btn:hover { background: var(--bg4); color: var(--gold); }
        .tb-btn.edit { color: var(--gold); border-color: rgba(201,169,110,0.3); }
        .tb-btn.danger { color: var(--accent2); border-color: rgba(160,72,48,0.3); }
        .tb-info { font-size: 10px; color: var(--text2); margin-left: auto; }
        .tab-scroll { flex: 1; overflow: auto; padding: 16px; }
        .tab-svg { cursor: crosshair; }
      `}</style>
    </div>
  );
}

function NoteEditPanel({ note, tuning, instrument, onUpdate, onClose }) {
  const [fret, setFret] = useState(note.fret);
  const [string, setString] = useState(note.string);
  const [ornament, setOrnament] = useState(note.ornament || "none");
  const [microtonalOffset, setMicrotonalOffset] = useState(note.microtonalOffset || 0);
  const [duration, setDuration] = useState(note.duration || 0.25);

  const allPositions = getAllPositions(note.midi, tuning, instrument);

  const apply = () => {
    onUpdate({ fret, string, ornament: ornament === "none" ? null : ornament, microtonalOffset, duration });
    onClose();
  };

  return (
    <div className="note-edit-panel">
      <div className="nep-header">
        <span>Επεξεργασία Νότας — {midiToName(note.midiRounded)}</span>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="nep-body">
        <div className="nep-row">
          <label>Χορδή</label>
          <select value={string} onChange={e => setString(+e.target.value)} className="select-input">
            {tuning.strings.map((s, i) => (
              <option key={i} value={i}>{i + 1}: {s.name}</option>
            ))}
          </select>
        </div>
        <div className="nep-row">
          <label>Τάστο</label>
          <input
            type="number" min="0" max="24" value={fret}
            onChange={e => setFret(+e.target.value)}
            className="num-input"
          />
        </div>
        {allPositions.length > 1 && (
          <div className="nep-row">
            <label>Θέσεις</label>
            <div className="positions-grid">
              {allPositions.map((pos, i) => (
                <button
                  key={i}
                  className={`pos-btn ${pos.string === string && pos.fret === fret ? "active" : ""}`}
                  onClick={() => { setString(pos.string); setFret(pos.fret); }}
                >
                  {pos.fret}/{pos.string + 1}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="nep-row">
          <label>Ornament</label>
          <select value={ornament} onChange={e => setOrnament(e.target.value)} className="select-input">
            {Object.entries(ORNAMENTS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="nep-row">
          <label>Μικροτονικό (¢)</label>
          <input
            type="range" min="-50" max="50" value={microtonalOffset}
            onChange={e => setMicrotonalOffset(+e.target.value)}
            className="slider"
          />
          <span style={{ color: "var(--gold)", fontSize: 11, minWidth: 40 }}>
            {microtonalOffset > 0 ? "+" : ""}{microtonalOffset}¢
          </span>
        </div>
        <div className="nep-row">
          <label>Διάρκεια (s)</label>
          <input
            type="number" min="0.05" max="4" step="0.05" value={duration}
            onChange={e => setDuration(+e.target.value)}
            className="num-input"
          />
        </div>
        <button className="apply-btn" onClick={apply}>✓ Εφαρμογή</button>
      </div>
      <style>{`
        .note-edit-panel {
          position: fixed; right: 24px; bottom: 24px;
          background: var(--bg2); border: 1px solid rgba(201,169,110,0.4);
          border-radius: 10px; min-width: 260px; z-index: 200;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        .nep-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 16px; border-bottom: 1px solid var(--border);
          font-size: 12px; font-weight: 600; color: var(--gold2);
        }
        .nep-header button {
          background: none; border: none; color: var(--text2);
          cursor: pointer; font-size: 14px;
        }
        .nep-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .nep-row { display: flex; align-items: center; gap: 10px; }
        .nep-row label { font-size: 10px; color: var(--text2); min-width: 90px; }
        .num-input {
          background: var(--bg3); border: 1px solid var(--border);
          color: var(--text); padding: 4px 8px; border-radius: 4px;
          font-family: var(--font-mono); font-size: 12px; width: 70px;
        }
        .positions-grid { display: flex; flex-wrap: wrap; gap: 4px; }
        .pos-btn {
          background: var(--bg3); border: 1px solid var(--border);
          color: var(--text2); padding: 3px 8px; border-radius: 4px;
          cursor: pointer; font-size: 10px; font-family: var(--font-mono);
        }
        .pos-btn.active { background: var(--gold); color: var(--bg); border-color: var(--gold); }
        .apply-btn {
          background: var(--green); border: none;
          color: white; padding: 8px; border-radius: var(--radius);
          cursor: pointer; font-family: var(--font-mono); font-size: 12px;
          font-weight: 600; width: 100%;
          transition: opacity .2s;
        }
        .apply-btn:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}

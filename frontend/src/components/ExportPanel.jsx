import { useState } from "react";
import { midiToName, INSTRUMENTS } from "../utils/instruments";

// ============ MusicXML Generator (microtonal with fractional alter) ============
function generateMusicXML(notes, tuning, instrument, maqam, tempo) {
  const instInfo = INSTRUMENTS[instrument];
  const beatsPerMeasure = 4;
  const beatDuration = 60 / tempo;
  const divisions = 16; // divisions per quarter note

  // Group notes into measures
  const measureDuration = beatsPerMeasure * beatDuration;
  const numMeasures = Math.ceil(
    notes.length > 0 ? Math.max(...notes.map(n => n.time + n.duration)) / measureDuration : 1
  );

  const measures = Array.from({ length: numMeasures }, () => []);
  for (const note of notes) {
    const m = Math.floor(note.time / measureDuration);
    if (m < numMeasures) measures[m].push(note);
  }

  // Helper: midi to MusicXML step/octave/alter (fractional for microtones)
  const NOTE_STEPS = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
  const NOTE_ALTERS = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];

  function midiToXmlPitch(midiFloat) {
    const midiInt = Math.floor(midiFloat);
    const fraction = midiFloat - midiInt;
    const semitone = midiInt % 12;
    const octave = Math.floor(midiInt / 12) - 1;
    const step = NOTE_STEPS[semitone];
    let alter = NOTE_ALTERS[semitone] + fraction;
    // Fractional alter for microtones (quarter tones = 0.5)
    return { step, octave, alter: parseFloat(alter.toFixed(3)) };
  }

  // Helper: duration in beats -> divisions
  function durationToDivisions(dur) {
    return Math.max(1, Math.round((dur / beatDuration) * divisions));
  }

  // Helper: duration to note type
  function durationToType(dur) {
    const beats = dur / beatDuration;
    if (beats >= 4) return "whole";
    if (beats >= 2) return "half";
    if (beats >= 1) return "quarter";
    if (beats >= 0.5) return "eighth";
    if (beats >= 0.25) return "16th";
    return "32nd";
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>${maqam ? maqam.name + " - " + maqam.arabic : "Untitled"}</work-title>
  </work>
  <identification>
    <encoding>
      <software>MaqamTAB</software>
      <encoding-description>Microtonal tablature for ${instrument} - ${tuning.name}</encoding-description>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>${instrument === "oud" ? "Ούτι" : "Σάζι"}</part-name>
      <score-instrument id="P1-I1">
        <instrument-name>${instrument === "oud" ? "Oud" : "Saz"}</instrument-name>
      </score-instrument>
    </score-part>
  </part-list>
  <part id="P1">`;

  for (let mIdx = 0; mIdx < numMeasures; mIdx++) {
    xml += `
    <measure number="${mIdx + 1}">`;

    if (mIdx === 0) {
      xml += `
      <attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>${beatsPerMeasure}</beats><beat-type>4</beat-type></time>
        <clef><sign>TAB</sign><line>5</line></clef>
        <staff-details>
          <staff-type>tab</staff-type>
          <staff-lines>${tuning.strings.length}</staff-lines>
          ${tuning.strings.map((s, i) => `
          <staff-tuning line="${i + 1}">
            <tuning-step>${NOTE_STEPS[s.midi % 12]}</tuning-step>
            <tuning-alter>${NOTE_ALTERS[s.midi % 12]}</tuning-alter>
            <tuning-octave>${Math.floor(s.midi / 12) - 1}</tuning-octave>
          </staff-tuning>`).join("")}
        </staff-details>
        <transpose><chromatic>0</chromatic></transpose>
      </attributes>
      <direction placement="above">
        <direction-type>
          <metronome parentheses="no">
            <beat-unit>quarter</beat-unit>
            <per-minute>${tempo}</per-minute>
          </metronome>
        </direction-type>
        ${maqam ? `<sound tempo="${tempo}"/>` : ""}
      </direction>`;
    }

    const measureNotes = measures[mIdx];
    let usedDuration = 0;
    const measureDivisions = beatsPerMeasure * divisions;

    if (measureNotes.length === 0) {
      // Rest measure
      xml += `
      <note>
        <rest measure="yes"/>
        <duration>${measureDivisions}</duration>
        <type>whole</type>
      </note>`;
    } else {
      // Sort by time
      measureNotes.sort((a, b) => a.time - b.time);

      for (const note of measureNotes) {
        const noteStartInMeasure = note.time - mIdx * measureDuration;
        const noteStartDivisions = Math.round((noteStartInMeasure / beatDuration) * divisions);

        // Rest before note if needed
        if (noteStartDivisions > usedDuration) {
          const restDivisions = noteStartDivisions - usedDuration;
          const restBeats = restDivisions / divisions;
          xml += `
      <note>
        <rest/>
        <duration>${restDivisions}</duration>
        <type>${durationToType(restBeats * beatDuration)}</type>
      </note>`;
          usedDuration = noteStartDivisions;
        }

        const noteDivisions = durationToDivisions(note.duration);
        const pitch = midiToXmlPitch(note.midi + (note.microtonalOffset || 0) / 100);
        const ornament = note.ornament;

        xml += `
      <note>
        <pitch>
          <step>${pitch.step}</step>
          ${pitch.alter !== 0 ? `<alter>${pitch.alter}</alter>` : ""}
          <octave>${pitch.octave}</octave>
        </pitch>
        <duration>${noteDivisions}</duration>
        <type>${durationToType(note.duration)}</type>
        <notations>
          <technical>
            <string>${note.string + 1}</string>
            <fret>${note.fret}</fret>
          </technical>
          ${ornament === "slide_up" ? "<slide type=\"start\" number=\"1\"/>" :
            ornament === "slide_down" ? "<slide type=\"stop\" number=\"1\"/>" :
            ornament === "hammer_on" ? "<hammer-on number=\"1\" type=\"start\">H</hammer-on>" :
            ornament === "pull_off" ? "<pull-off number=\"1\" type=\"start\">P</pull-off>" :
            ornament === "vibrato" ? "<ornaments><wavy-line type=\"start\" number=\"1\"/></ornaments>" :
            ornament === "trill" ? "<ornaments><trill-mark/></ornaments>" : ""}
        </notations>
        <dynamics><f/></dynamics>
      </note>`;

        usedDuration = noteStartDivisions + noteDivisions;
      }

      // Fill rest of measure
      if (usedDuration < measureDivisions) {
        const restDivisions = measureDivisions - usedDuration;
        xml += `
      <note>
        <rest/>
        <duration>${restDivisions}</duration>
        <type>quarter</type>
      </note>`;
      }
    }

    xml += `
    </measure>`;
  }

  xml += `
  </part>
</score-partwise>`;

  return xml;
}

// ============ ASCII TAB Generator ============
function generateASCIITab(notes, tuning, tempo) {
  const beatsPerMeasure = 4;
  const beatDuration = 60 / tempo;
  const measureDuration = beatsPerMeasure * beatDuration;
  const charsPerBeat = 4;
  const totalDuration = notes.length > 0
    ? Math.max(...notes.map(n => n.time + n.duration))
    : measureDuration;
  const numMeasures = Math.ceil(totalDuration / measureDuration);
  const totalChars = numMeasures * beatsPerMeasure * charsPerBeat;

  const stringCount = tuning.strings.length;
  const lines = tuning.strings.map(s => Array(totalChars).fill("-"));

  for (const note of notes) {
    const pos = Math.floor((note.time / beatDuration) * charsPerBeat);
    if (pos < totalChars && note.string < stringCount) {
      const fretStr = String(note.fret);
      const ornament = note.ornament;
      const prefix = ornament === "slide_up" ? "/" :
                     ornament === "slide_down" ? "\\" :
                     ornament === "hammer_on" ? "h" :
                     ornament === "pull_off" ? "p" :
                     ornament === "vibrato" ? "~" : "";

      const content = prefix + fretStr;
      for (let c = 0; c < content.length && pos + c < totalChars; c++) {
        lines[note.string][pos + c] = content[c];
      }
    }
  }

  let tab = "";
  tab += "// MaqamTAB Export\n";
  if (tuning.name) tab += `// Tuning: ${tuning.name}\n`;
  tab += `// Tempo: ${tempo} BPM\n\n`;

  // Add measure markers
  const measureLine = Array(totalChars).fill(" ");
  for (let m = 0; m < numMeasures; m++) {
    const pos = m * beatsPerMeasure * charsPerBeat;
    measureLine[pos] = "|";
  }

  for (let s = 0; s < stringCount; s++) {
    const sName = tuning.strings[s].name.padEnd(4);
    // Insert measure bars
    let lineStr = "";
    for (let m = 0; m < numMeasures; m++) {
      lineStr += "|";
      for (let b = 0; b < beatsPerMeasure * charsPerBeat; b++) {
        const idx = m * beatsPerMeasure * charsPerBeat + b;
        lineStr += lines[s][idx] || "-";
      }
    }
    lineStr += "|";
    tab += sName + ": " + lineStr + "\n";
  }

  return tab;
}

// ============ ExportPanel Component ============
export default function ExportPanel({ notes, tuning, instrument, detectedMaqam, tempo }) {
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState("");
  const [previewType, setPreviewType] = useState("");

  const handleExportMusicXML = () => {
    const xml = generateMusicXML(notes, tuning, instrument, detectedMaqam, tempo);
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detectedMaqam?.name || "maqam"}_tab.musicxml`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("✅ MusicXML εξήχθη!");
    setTimeout(() => setStatus(""), 3000);
  };

  const handleExportASCII = () => {
    const tab = generateASCIITab(notes, tuning, tempo);
    const blob = new Blob([tab], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detectedMaqam?.name || "maqam"}_tab.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("✅ ASCII TAB εξήχθη!");
    setTimeout(() => setStatus(""), 3000);
  };

  const handleExportJSON = () => {
    const data = {
      instrument, tuning: tuning.id, tuningName: tuning.name,
      tempo, maqam: detectedMaqam?.name,
      maqamArabic: detectedMaqam?.arabic,
      notes: notes.map(n => ({
        time: n.time, duration: n.duration,
        midi: n.midi, microtonalOffset: n.microtonalOffset,
        string: n.string, fret: n.fret,
        ornament: n.ornament, velocity: n.velocity,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detectedMaqam?.name || "maqam"}_tab.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("✅ JSON εξήχθη!");
    setTimeout(() => setStatus(""), 3000);
  };

  const handlePreviewASCII = () => {
    const tab = generateASCIITab(notes, tuning, tempo);
    setPreview(tab);
    setPreviewType("ascii");
  };

  const handlePreviewXML = () => {
    const xml = generateMusicXML(notes, tuning, instrument, detectedMaqam, tempo);
    setPreview(xml);
    setPreviewType("xml");
  };

  // SVG TAB renderer for PDF-style preview
  const SvgTabPreview = () => {
    const beatsPerMeasure = 4;
    const beatDuration = 60 / tempo;
    const measureDuration = beatsPerMeasure * beatDuration;
    const totalDuration = notes.length > 0
      ? Math.max(...notes.map(n => n.time + n.duration))
      : measureDuration * 2;
    const numMeasures = Math.max(1, Math.ceil(totalDuration / measureDuration));
    const stringCount = tuning.strings.length;
    const STRING_SPACING = 20;
    const PIXELS_PER_BEAT = 60;
    const MARGIN_LEFT = 50;
    const W = Math.min(900, MARGIN_LEFT + numMeasures * beatsPerMeasure * PIXELS_PER_BEAT + 20);
    const H = 40 + stringCount * STRING_SPACING + 20;

    const timeToX = (t) => MARGIN_LEFT + (t / beatDuration) * PIXELS_PER_BEAT;

    return (
      <svg width={W} height={H} style={{ background: "white", borderRadius: 4 }}>
        {/* TAB bracket */}
        <text x={8} y={H / 2 - 6} fontSize="14" fill="#333" fontWeight="bold" fontFamily="serif">T</text>
        <text x={8} y={H / 2 + 8} fontSize="14" fill="#333" fontWeight="bold" fontFamily="serif">A</text>
        <text x={8} y={H / 2 + 22} fontSize="14" fill="#333" fontWeight="bold" fontFamily="serif">B</text>

        {/* Strings */}
        {tuning.strings.map((s, sIdx) => {
          const y = 30 + sIdx * STRING_SPACING;
          return (
            <g key={sIdx}>
              <line x1={MARGIN_LEFT} y1={y} x2={W - 10} y2={y} stroke="#999" strokeWidth="0.8" />
              <text x={MARGIN_LEFT - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#666" fontFamily="monospace">{s.name}</text>
            </g>
          );
        })}

        {/* Measures */}
        {Array.from({ length: numMeasures + 1 }).map((_, m) => {
          const x = MARGIN_LEFT + m * beatsPerMeasure * PIXELS_PER_BEAT;
          return <line key={m} x1={x} y1={26} x2={x} y2={26 + stringCount * STRING_SPACING} stroke="#333" strokeWidth={m === 0 ? 2 : 1} />;
        })}

        {/* Notes */}
        {notes.map((note, i) => {
          const x = timeToX(note.time);
          const y = 30 + note.string * STRING_SPACING;
          const fretStr = String(note.fret);
          return (
            <g key={i}>
              <rect x={x - 6} y={y - 8} width={fretStr.length * 7 + 4} height={16} rx={2} fill="white" />
              <text x={x} y={y + 4} fontSize="10" fill="#222" fontFamily="monospace" fontWeight="bold">{fretStr}</text>
              {note.ornament && <text x={x} y={y - 10} fontSize="8" fill="#a04830">{note.ornament === "slide_up" ? "/" : note.ornament === "vibrato" ? "~" : ""}</text>}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="export-panel">
      <div className="ep-header">
        <div className="ep-title">Εξαγωγή</div>
        <div className="ep-subtitle">{notes.length} νότες • {tuning.name} • {tempo} BPM</div>
      </div>

      {/* SVG Preview */}
      <div className="ep-preview-box">
        <div className="ep-preview-label">Προεπισκόπηση TAB</div>
        <div className="ep-svg-preview">
          <SvgTabPreview />
        </div>
      </div>

      <div className="ep-formats">
        <div className="format-card">
          <div className="format-icon">🎼</div>
          <div className="format-name">MusicXML</div>
          <div className="format-desc">Microtonal MusicXML με fractional alter. Συμβατό με MuseScore, Sibelius, Finale.</div>
          <div className="format-actions">
            <button className="exp-btn preview" onClick={handlePreviewXML}>👁 Preview</button>
            <button className="exp-btn primary" onClick={handleExportMusicXML}>⬇ Λήψη</button>
          </div>
        </div>

        <div className="format-card">
          <div className="format-icon">📝</div>
          <div className="format-name">ASCII TAB</div>
          <div className="format-desc">Κλασικό ASCII tablature με ornaments. Άμεσα ανοιγόμενο σε κάθε text editor.</div>
          <div className="format-actions">
            <button className="exp-btn preview" onClick={handlePreviewASCII}>👁 Preview</button>
            <button className="exp-btn primary" onClick={handleExportASCII}>⬇ Λήψη</button>
          </div>
        </div>

        <div className="format-card">
          <div className="format-icon">📊</div>
          <div className="format-name">JSON</div>
          <div className="format-desc">Δομημένη εξαγωγή με πλήρη μικροτονικά δεδομένα. Ιδανικό για επεξεργασία.</div>
          <div className="format-actions">
            <button className="exp-btn primary" onClick={handleExportJSON}>⬇ Λήψη</button>
          </div>
        </div>
      </div>

      {/* Backend PDF note */}
      <div className="pdf-note">
        <div className="pdf-note-icon">📄</div>
        <div>
          <strong>PDF Staff+TAB Εξαγωγή</strong>
          <p>Για πλήρη PDF με staff notation + TAB, χρησιμοποιήστε το backend API endpoint <code>/api/export/pdf</code> που χρησιμοποιεί LilyPond. Εκτελέστε το backend server πρώτα (βλ. οδηγίες εγκατάστασης).</p>
        </div>
      </div>

      {status && <div className="status-msg">{status}</div>}

      {preview && (
        <div className="preview-box">
          <div className="pb-header">
            <span>{previewType === "xml" ? "MusicXML Preview" : "ASCII TAB Preview"}</span>
            <button onClick={() => setPreview("")}>✕</button>
          </div>
          <pre className="pb-content">{preview.slice(0, 3000)}{preview.length > 3000 ? "\n... (αποκομμένο)" : ""}</pre>
        </div>
      )}

      <style>{`
        .export-panel { padding: 24px; overflow-y: auto; }
        .ep-header { margin-bottom: 20px; }
        .ep-title { font-family: var(--font-serif); font-size: 22px; color: var(--gold2); }
        .ep-subtitle { font-size: 11px; color: var(--text2); margin-top: 4px; }
        .ep-preview-box {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 10px; padding: 16px; margin-bottom: 20px; overflow-x: auto;
        }
        .ep-preview-label { font-size: 10px; color: var(--text2); margin-bottom: 10px; }
        .ep-svg-preview { overflow-x: auto; }
        .ep-formats { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 20px; }
        .format-card {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 10px; padding: 16px;
        }
        .format-icon { font-size: 24px; margin-bottom: 8px; }
        .format-name { font-family: var(--font-serif); font-size: 16px; color: var(--gold2); margin-bottom: 6px; }
        .format-desc { font-size: 11px; color: var(--text2); line-height: 1.5; margin-bottom: 12px; }
        .format-actions { display: flex; gap: 8px; }
        .exp-btn {
          flex: 1; padding: 7px; border-radius: var(--radius);
          cursor: pointer; font-family: var(--font-mono); font-size: 11px; font-weight: 600;
          transition: all .2s; border: none;
        }
        .exp-btn.primary { background: var(--gold); color: var(--bg); }
        .exp-btn.primary:hover { background: var(--gold2); }
        .exp-btn.preview { background: var(--bg3); color: var(--text); border: 1px solid var(--border); }
        .exp-btn.preview:hover { color: var(--gold); }
        .pdf-note {
          display: flex; gap: 12px; align-items: flex-start;
          background: rgba(201,169,110,0.05); border: 1px solid rgba(201,169,110,0.2);
          border-radius: 8px; padding: 16px; margin-bottom: 16px;
        }
        .pdf-note-icon { font-size: 24px; flex-shrink: 0; }
        .pdf-note strong { color: var(--gold2); font-size: 13px; }
        .pdf-note p { font-size: 11px; color: var(--text2); margin-top: 4px; line-height: 1.5; }
        .pdf-note code { background: var(--bg3); padding: 1px 5px; border-radius: 3px; color: var(--amber); font-size: 10px; }
        .status-msg {
          background: rgba(74,138,90,0.2); border: 1px solid rgba(74,138,90,0.4);
          color: var(--green); padding: 10px 16px; border-radius: var(--radius);
          font-size: 12px; margin-bottom: 12px;
        }
        .preview-box {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 8px; overflow: hidden;
        }
        .pb-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 16px; border-bottom: 1px solid var(--border);
          font-size: 11px; color: var(--gold);
        }
        .pb-header button { background: none; border: none; color: var(--text2); cursor: pointer; }
        .pb-content {
          padding: 16px; font-size: 10px; line-height: 1.6;
          color: var(--text2); overflow-x: auto; max-height: 300px; overflow-y: auto;
          font-family: var(--font-mono);
          white-space: pre;
        }
      `}</style>
    </div>
  );
}

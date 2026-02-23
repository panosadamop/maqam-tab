import { useState } from "react";
import {
  Box, Typography, Paper, Grid, Button, Alert, Collapse,
  IconButton, Divider,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PreviewIcon from "@mui/icons-material/Preview";
import CloseIcon from "@mui/icons-material/Close";
import { midiToName, INSTRUMENTS } from "../utils/instruments";

// ============ MusicXML Generator ============
function generateMusicXML(notes, tuning, instrument, maqam, tempo) {
  const NOTE_STEPS = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
  const NOTE_ALTERS = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  const beatsPerMeasure = 4;
  const beatDuration = 60 / tempo;
  const divisions = 16;
  const measureDuration = beatsPerMeasure * beatDuration;
  const numMeasures = Math.ceil(notes.length > 0 ? Math.max(...notes.map(n => n.time + n.duration)) / measureDuration : 1);
  const measures = Array.from({ length: numMeasures }, () => []);
  for (const note of notes) {
    const m = Math.floor(note.time / measureDuration);
    if (m < numMeasures) measures[m].push(note);
  }
  function midiToXmlPitch(midiFloat) {
    const midiInt = Math.floor(midiFloat);
    const fraction = midiFloat - midiInt;
    const semitone = midiInt % 12;
    const octave = Math.floor(midiInt / 12) - 1;
    return { step: NOTE_STEPS[semitone], octave, alter: parseFloat((NOTE_ALTERS[semitone] + fraction).toFixed(3)) };
  }
  function durationToDivisions(dur) { return Math.max(1, Math.round((dur / beatDuration) * divisions)); }
  function durationToType(dur) {
    const beats = dur / beatDuration;
    return beats >= 4 ? "whole" : beats >= 2 ? "half" : beats >= 1 ? "quarter" : beats >= 0.5 ? "eighth" : beats >= 0.25 ? "16th" : "32nd";
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>${maqam ? maqam.name : "Untitled"}</work-title></work>
  <identification><encoding><software>MaqamTAB</software></encoding></identification>
  <part-list>
    <score-part id="P1">
      <part-name>${instrument === "oud" ? "Ούτι" : "Σάζι"}</part-name>
    </score-part>
  </part-list>
  <part id="P1">`;

  for (let mIdx = 0; mIdx < numMeasures; mIdx++) {
    xml += `\n    <measure number="${mIdx + 1}">`;
    if (mIdx === 0) {
      xml += `\n      <attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>${beatsPerMeasure}</beats><beat-type>4</beat-type></time>
        <clef><sign>TAB</sign><line>5</line></clef>
      </attributes>
      <direction placement="above">
        <direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempo}</per-minute></metronome></direction-type>
      </direction>`;
    }
    const measureNotes = measures[mIdx].sort((a, b) => a.time - b.time);
    let usedDuration = 0;
    const measureDivisions = beatsPerMeasure * divisions;
    if (measureNotes.length === 0) {
      xml += `\n      <note><rest measure="yes"/><duration>${measureDivisions}</duration><type>whole</type></note>`;
    } else {
      for (const note of measureNotes) {
        const noteStartInMeasure = note.time - mIdx * measureDuration;
        const noteStartDivisions = Math.round((noteStartInMeasure / beatDuration) * divisions);
        if (noteStartDivisions > usedDuration) {
          const restDivisions = noteStartDivisions - usedDuration;
          xml += `\n      <note><rest/><duration>${restDivisions}</duration><type>${durationToType((restDivisions / divisions) * beatDuration)}</type></note>`;
          usedDuration = noteStartDivisions;
        }
        const noteDivisions = durationToDivisions(note.duration);
        const pitch = midiToXmlPitch(note.midi + (note.microtonalOffset || 0) / 100);
        xml += `\n      <note>
        <pitch><step>${pitch.step}</step><alter>${pitch.alter}</alter><octave>${pitch.octave}</octave></pitch>
        <duration>${noteDivisions}</duration>
        <type>${durationToType(note.duration)}</type>
        <notations><technical><string>${note.string + 1}</string><fret>${note.fret}</fret></technical></notations>
      </note>`;
        usedDuration += noteDivisions;
      }
    }
    xml += `\n    </measure>`;
  }
  xml += `\n  </part>\n</score-partwise>`;
  return xml;
}

// ============ ASCII TAB Generator ============
function generateASCIITab(notes, tuning, tempo) {
  const beatsPerMeasure = 4;
  const beatDuration = 60 / tempo;
  const measureDuration = beatsPerMeasure * beatDuration;
  const charsPerBeat = 4;
  const totalDuration = notes.length > 0 ? Math.max(...notes.map(n => n.time + n.duration)) : measureDuration;
  const numMeasures = Math.ceil(totalDuration / measureDuration);
  const totalChars = numMeasures * beatsPerMeasure * charsPerBeat;
  const stringCount = tuning.strings.length;
  const lines = tuning.strings.map(() => Array(totalChars).fill("-"));
  for (const note of notes) {
    const pos = Math.floor((note.time / beatDuration) * charsPerBeat);
    if (pos < totalChars && note.string < stringCount) {
      const prefix = note.ornament === "slide_up" ? "/" : note.ornament === "slide_down" ? "\\" :
        note.ornament === "hammer_on" ? "h" : note.ornament === "pull_off" ? "p" :
        note.ornament === "vibrato" ? "~" : "";
      const content = prefix + String(note.fret);
      for (let c = 0; c < content.length && pos + c < totalChars; c++) lines[note.string][pos + c] = content[c];
    }
  }
  let tab = `// MaqamTAB Export\n// Tuning: ${tuning.name}\n// Tempo: ${tempo} BPM\n\n`;
  for (let s = 0; s < stringCount; s++) {
    let lineStr = "";
    for (let m = 0; m < numMeasures; m++) {
      lineStr += "|";
      for (let b = 0; b < beatsPerMeasure * charsPerBeat; b++) {
        lineStr += lines[s][m * beatsPerMeasure * charsPerBeat + b] || "-";
      }
    }
    tab += tuning.strings[s].name.padEnd(4) + ": " + lineStr + "|\n";
  }
  return tab;
}

// ============ SVG TAB Preview ============
function SvgTabPreview({ notes, tuning, tempo }) {
  const beatsPerMeasure = 4;
  const beatDuration = 60 / tempo;
  const measureDuration = beatsPerMeasure * beatDuration;
  const totalDuration = notes.length > 0 ? Math.max(...notes.map(n => n.time + n.duration)) : measureDuration * 2;
  const numMeasures = Math.max(1, Math.ceil(totalDuration / measureDuration));
  const stringCount = tuning.strings.length;
  const STRING_SPACING = 20;
  const PIXELS_PER_BEAT = 60;
  const MARGIN_LEFT = 50;
  const W = Math.min(900, MARGIN_LEFT + numMeasures * beatsPerMeasure * PIXELS_PER_BEAT + 20);
  const H = 40 + stringCount * STRING_SPACING + 20;
  const timeToX = (t) => MARGIN_LEFT + (t / beatDuration) * PIXELS_PER_BEAT;

  return (
    <svg width={W} height={H} style={{ background: "white", borderRadius: 4, display: "block" }}>
      <text x={8} y={H / 2 - 6} fontSize="14" fill="#333" fontWeight="bold" fontFamily="serif">T</text>
      <text x={8} y={H / 2 + 8} fontSize="14" fill="#333" fontWeight="bold" fontFamily="serif">A</text>
      <text x={8} y={H / 2 + 22} fontSize="14" fill="#333" fontWeight="bold" fontFamily="serif">B</text>
      {tuning.strings.map((s, sIdx) => {
        const y = 30 + sIdx * STRING_SPACING;
        return (
          <g key={sIdx}>
            <line x1={MARGIN_LEFT} y1={y} x2={W - 10} y2={y} stroke="#999" strokeWidth="0.8" />
            <text x={MARGIN_LEFT - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#666" fontFamily="'Ubuntu Mono', monospace">{s.name}</text>
          </g>
        );
      })}
      {Array.from({ length: numMeasures + 1 }).map((_, m) => {
        const x = MARGIN_LEFT + m * beatsPerMeasure * PIXELS_PER_BEAT;
        return <line key={m} x1={x} y1={26} x2={x} y2={26 + stringCount * STRING_SPACING} stroke="#333" strokeWidth={m === 0 ? 2 : 1} />;
      })}
      {notes.map((note, i) => {
        const x = timeToX(note.time);
        const y = 30 + note.string * STRING_SPACING;
        const fretStr = String(note.fret);
        return (
          <g key={i}>
            <rect x={x - 6} y={y - 8} width={fretStr.length * 7 + 4} height={16} rx={2} fill="white" />
            <text x={x} y={y + 4} fontSize="10" fill="#222" fontFamily="'Ubuntu Mono', monospace" fontWeight="bold">{fretStr}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ============ ExportPanel Component ============
export default function ExportPanel({ notes, tuning, instrument, detectedMaqam, tempo }) {
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState("");
  const [previewType, setPreviewType] = useState("");

  const download = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMusicXML = () => {
    download(generateMusicXML(notes, tuning, instrument, detectedMaqam, tempo),
      `${detectedMaqam?.name || "maqam"}_tab.musicxml`, "application/xml");
    setStatus("✅ MusicXML εξήχθη!");
    setTimeout(() => setStatus(""), 3000);
  };

  const handleExportASCII = () => {
    download(generateASCIITab(notes, tuning, tempo),
      `${detectedMaqam?.name || "maqam"}_tab.txt`, "text/plain;charset=utf-8");
    setStatus("✅ ASCII TAB εξήχθη!");
    setTimeout(() => setStatus(""), 3000);
  };

  const handleExportJSON = () => {
    const data = {
      instrument, tuning: tuning.id, tuningName: tuning.name, tempo,
      maqam: detectedMaqam?.name,
      notes: notes.map(n => ({ time: n.time, duration: n.duration, midi: n.midi, microtonalOffset: n.microtonalOffset, string: n.string, fret: n.fret, ornament: n.ornament, velocity: n.velocity })),
    };
    download(JSON.stringify(data, null, 2), `${detectedMaqam?.name || "maqam"}_tab.json`, "application/json");
    setStatus("✅ JSON εξήχθη!");
    setTimeout(() => setStatus(""), 3000);
  };

  const FORMATS = [
    {
      icon: "🎼",
      name: "MusicXML",
      desc: "Microtonal MusicXML με fractional alter. Συμβατό με MuseScore, Sibelius, Finale.",
      onDownload: handleExportMusicXML,
      onPreview: () => { setPreview(generateMusicXML(notes, tuning, instrument, detectedMaqam, tempo)); setPreviewType("xml"); },
    },
    {
      icon: "📝",
      name: "ASCII TAB",
      desc: "Κλασικό ASCII tablature με ornaments. Άμεσα ανοιγόμενο σε κάθε text editor.",
      onDownload: handleExportASCII,
      onPreview: () => { setPreview(generateASCIITab(notes, tuning, tempo)); setPreviewType("ascii"); },
    },
    {
      icon: "📊",
      name: "JSON",
      desc: "Δομημένη εξαγωγή με πλήρη μικροτονικά δεδομένα. Ιδανικό για επεξεργασία.",
      onDownload: handleExportJSON,
      onPreview: null,
    },
  ];

  return (
    <Box sx={{ p: 3, overflow: "auto" }}>
      <Typography variant="h5" sx={{ color: "primary.light", fontFamily: "'Playfair Display', serif", mb: 0.5 }}>
        Εξαγωγή
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 3 }}>
        {notes.length} νότες • {tuning.name} • {tempo} BPM
      </Typography>

      {/* Rast sample notice */}
      {detectedMaqam?.isSample && (
        <Paper
          variant="outlined"
          sx={{
            p: 1.5, mb: 2,
            bgcolor: "rgba(201,169,110,0.06)",
            borderColor: "rgba(201,169,110,0.35)",
            display: "flex", alignItems: "center", gap: 1.5,
          }}
        >
          <Typography sx={{ fontSize: "1.2rem" }}>🎵</Typography>
          <Box>
            <Typography sx={{ color: "primary.light", fontSize: "0.75rem", fontWeight: 600 }}>
              Εξάγετε το δείγμα Rast
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Κλίμακα D · 26 νότες · Ουδέτερη τρίτη (350¢) · Σέιρ ανοδικό
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: "auto" }}>
            <Typography sx={{ fontFamily: "'Playfair Display', serif", fontSize: "0.9rem", color: "primary.main", fontWeight: 600 }}>
              Rast
            </Typography>
          </Box>
        </Paper>
      )}

      {/* TAB Preview */}
      <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.paper", borderColor: "divider", mb: 3, overflowX: "auto" }}>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
          Προεπισκόπηση TAB
        </Typography>
        <SvgTabPreview notes={notes} tuning={tuning} tempo={tempo} />
      </Paper>

      {/* Status */}
      <Collapse in={!!status}>
        <Alert severity="success" sx={{ mb: 2, "& .MuiAlert-message": { fontFamily: "'Ubuntu Mono', monospace", fontSize: "0.75rem" } }}>
          {status}
        </Alert>
      </Collapse>

      {/* Format cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {FORMATS.map((fmt) => (
          <Grid item xs={12} sm={4} key={fmt.name}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.paper", borderColor: "divider", height: "100%", display: "flex", flexDirection: "column" }}>
              <Typography sx={{ fontSize: "1.5rem", mb: 1 }}>{fmt.icon}</Typography>
              <Typography variant="h6" sx={{ color: "primary.light", fontFamily: "'Playfair Display', serif", fontSize: "1rem", mb: 0.75 }}>
                {fmt.name}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.6, flex: 1, mb: 2 }}>
                {fmt.desc}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {fmt.onPreview && (
                  <Button
                    size="small" variant="outlined"
                    startIcon={<PreviewIcon />}
                    onClick={fmt.onPreview}
                    sx={{ flex: 1, fontSize: "0.65rem", borderColor: "divider", color: "text.secondary" }}
                  >
                    Preview
                  </Button>
                )}
                <Button
                  size="small" variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={fmt.onDownload}
                  sx={{
                    flex: 1, fontSize: "0.65rem",
                    bgcolor: "primary.main", color: "background.default",
                    "&:hover": { bgcolor: "primary.light" },
                  }}
                >
                  Λήψη
                </Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* PDF note */}
      <Paper
        variant="outlined"
        sx={{
          p: 2, bgcolor: "rgba(201,169,110,0.05)", borderColor: "rgba(201,169,110,0.2)",
          display: "flex", gap: 1.5, alignItems: "flex-start",
        }}
      >
        <Typography sx={{ fontSize: "1.5rem", flexShrink: 0 }}>📄</Typography>
        <Box>
          <Typography sx={{ color: "primary.light", fontSize: "0.8rem", fontWeight: 600, mb: 0.5 }}>
            PDF Staff+TAB Εξαγωγή
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
            Για πλήρη PDF με staff notation + TAB, χρησιμοποιήστε το backend API endpoint{" "}
            <Box component="code" sx={{ bgcolor: "background.paper", px: 0.5, py: 0.125, borderRadius: 0.5, color: "warning.main", fontSize: "0.65rem" }}>
              /api/export/pdf
            </Box>
            {" "}που χρησιμοποιεί LilyPond. Εκτελέστε το backend server πρώτα.
          </Typography>
        </Box>
      </Paper>

      {/* Preview box */}
      {preview && (
        <Paper variant="outlined" sx={{ mt: 2, bgcolor: "background.paper", borderColor: "divider", overflow: "hidden" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" sx={{ color: "primary.main" }}>
              {previewType === "xml" ? "MusicXML Preview" : "ASCII TAB Preview"}
            </Typography>
            <IconButton size="small" onClick={() => setPreview("")}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box
            component="pre"
            sx={{
              p: 2, m: 0, fontFamily: "'Ubuntu Mono', monospace", fontSize: "0.65rem",
              color: "text.secondary", overflowX: "auto", maxHeight: 300,
              overflowY: "auto", lineHeight: 1.6, whiteSpace: "pre",
            }}
          >
            {preview.slice(0, 3000)}{preview.length > 3000 ? "\n... (αποκομμένο)" : ""}
          </Box>
        </Paper>
      )}
    </Box>
  );
}

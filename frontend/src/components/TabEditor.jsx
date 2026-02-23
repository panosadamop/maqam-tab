import { useState, useRef, useCallback, useEffect } from "react";
import {
  Box, Button, Typography, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Slider,
  Chip, IconButton, Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import TableChartIcon from "@mui/icons-material/TableChart";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { INSTRUMENTS, getAllPositions, midiToName } from "../utils/instruments";

// ── Constants ────────────────────────────────────────────────────────────────
const ORNAMENTS = {
  none:          { label: "None",        symbol: "" },
  slide_up:      { label: "Slide up",    symbol: "/" },
  slide_down:    { label: "Slide down",  symbol: "\\" },
  hammer_on:     { label: "Hammer-on",   symbol: "h" },
  pull_off:      { label: "Pull-off",    symbol: "p" },
  vibrato:       { label: "Vibrato",     symbol: "~" },
  trill:         { label: "Trill",       symbol: "tr" },
  grace:         { label: "Grace note",  symbol: "gr" },
  microtone_bend:{ label: "¼-tone bend", symbol: "mb" },
};

const DURATION_OPTIONS = [
  { label: "Whole",   value: 4,    symbol: "𝅝" },
  { label: "Half",    value: 2,    symbol: "𝅗𝅥" },
  { label: "Quarter", value: 1,    symbol: "♩" },
  { label: "8th",     value: 0.5,  symbol: "♪" },
  { label: "16th",    value: 0.25, symbol: "𝅘𝅥𝅯" },
];

const BEATS_PER_MEASURE = 4;
const PIXELS_PER_BEAT   = 80;
const STRING_SPACING    = 36;
const HEADER_HEIGHT     = 40;

// ── Audio engine (Karplus-Strong physical modelling) ────────────────────────
import { playNote } from "../utils/audioEngine";

// ── Staff notation helpers ───────────────────────────────────────────────────
const NOTE_LETTERS = ["C","D","E","F","G","A","B"];
const DIATONIC_MAP = [0,0,1,1,2,3,3,4,4,5,5,6]; // chromatic → diatonic step
const ACCID_MAP    = [0,1,0,1,0,0,1,0,1,0,1,0]; // 1=sharp

function midiToStaff(midi) {
  const noteInOct = midi % 12;
  const octave    = Math.floor(midi / 12) - 1;
  const step      = DIATONIC_MAP[noteInOct];
  const pos       = step + octave * 7; // diatonic pos from C0
  return {
    pos: pos - 28,             // relative to C4 (pos 28 from C0)
    accidental: ACCID_MAP[noteInOct] ? "♯" : "",
    letter: NOTE_LETTERS[step],
    octave,
  };
}

// staffPos: 0=C4, 2=E4 (bottom line), 10=F5 (top line)
// Each diatonic step = lineSpacing/2 px going UP
function staffPosToY(pos, staffTop, lineSpacing) {
  const BOTTOM_LINE = 2; // E4
  return staffTop + (BOTTOM_LINE - pos) * (lineSpacing / 2) + 4 * lineSpacing;
}

function getLedgerLines(pos) {
  const lines = [];
  if (pos <= 0)  for (let p = 0;  p >= pos - 1; p -= 2) if (p % 2 === 0) lines.push(p);
  if (pos >= 12) for (let p = 12; p <= pos + 1; p += 2) lines.push(p);
  return lines;
}

// ── Staff SVG ────────────────────────────────────────────────────────────────
function StaffSVG({ notes, tempo, selectedNote, onSelectNote, onEdit, onStaffClick, svgRef, totalWidth, playheadX }) {
  const LS = 10, ST = 22, NR = 7;
  const H  = ST + 4 * LS + NR * 7 + 30;
  const tx = (t) => 70 + (t * tempo / 60) * PIXELS_PER_BEAT;

  return (
    <svg ref={svgRef} width={totalWidth} height={H} style={{ display: "block", cursor: "crosshair" }}
      onClick={onStaffClick}>
      <rect width={totalWidth} height={H} fill="#0a0805" />

      {/* Treble clef */}
      <text x={10} y={ST + 3.6 * LS + 4} fontSize="44" fill="#c9a96e" opacity="0.65"
        fontFamily="serif" style={{ userSelect:"none" }}>𝄞</text>

      {/* Time signature 4/4 */}
      <text x={50} y={ST + 1.5 * LS + 4} fontSize="15" fill="#9a8870"
        fontFamily="'Ubuntu',sans-serif" fontWeight="700">4</text>
      <text x={50} y={ST + 3.5 * LS + 4} fontSize="15" fill="#9a8870"
        fontFamily="'Ubuntu',sans-serif" fontWeight="700">4</text>

      {/* Five staff lines */}
      {[0,1,2,3,4].map(i => (
        <line key={i} x1={0} y1={ST + i * LS} x2={totalWidth} y2={ST + i * LS}
          stroke="rgba(201,169,110,0.22)" strokeWidth={1} />
      ))}

      {/* Bar lines */}
      {Array.from({ length: Math.ceil(totalWidth / (BEATS_PER_MEASURE * PIXELS_PER_BEAT)) + 2 }).map((_, m) => {
        const x = 70 + m * BEATS_PER_MEASURE * PIXELS_PER_BEAT;
        return <line key={m} x1={x} y1={ST} x2={x} y2={ST + 4 * LS}
          stroke="rgba(201,169,110,0.18)" strokeWidth={1} />;
      })}

      {/* Notes */}
      {notes.map((note, idx) => {
        const x   = tx(note.time);
        const inf = midiToStaff(Math.round(note.midi || note.midiRounded));
        const y   = staffPosToY(inf.pos, ST, LS);
        const sel = selectedNote === idx;
        const col = sel ? "#e8c87a" : "#c9a96e";
        const beats = (note.duration * tempo) / 60;
        const isOpen = beats >= 2, isWhole = beats >= 4;
        const stemUp = inf.pos < 6;
        const sLen = 3.5 * LS;
        const sx = stemUp ? x + NR - 1 : x - NR + 1;
        const ledgers = getLedgerLines(inf.pos);
        const flag8  = beats <= 0.5  && beats > 0.25;
        const flag16 = beats <= 0.25;

        return (
          <g key={note.id || idx} style={{ cursor:"pointer" }}
            onClick={e => { e.stopPropagation(); onSelectNote(sel ? null : idx); }} onDoubleClick={e => { e.stopPropagation(); onEdit(idx); }}>

            {ledgers.map(lp => {
              const ly = staffPosToY(lp, ST, LS);
              return <line key={lp} x1={x - NR - 4} y1={ly} x2={x + NR + 4} y2={ly}
                stroke={sel ? "#e8c87a" : "rgba(201,169,110,0.45)"} strokeWidth={1.2} />;
            })}

            {inf.accidental && (
              <text x={x - NR - 8} y={y + 4} fontSize="11" fill={sel ? "#e8c87a" : "#d4882a"}
                fontFamily="serif" textAnchor="middle">{inf.accidental}</text>
            )}

            {isWhole
              ? <ellipse cx={x} cy={y} rx={NR} ry={NR * 0.62} fill="none" stroke={col} strokeWidth="1.5" />
              : <ellipse cx={x} cy={y} rx={NR} ry={NR * 0.62}
                  fill={isOpen ? "none" : col}
                  stroke={col} strokeWidth={isOpen ? "1.5" : "1"} />
            }

            {!isWhole && (
              <line x1={sx} y1={y} x2={sx} y2={stemUp ? y - sLen : y + sLen}
                stroke={col} strokeWidth={1.2} />
            )}

            {flag8 && (
              <path d={stemUp
                ? `M${sx} ${y-sLen} C${sx+14} ${y-sLen+8},${sx+12} ${y-sLen+20},${sx+2} ${y-sLen+26}`
                : `M${sx} ${y+sLen} C${sx+14} ${y+sLen-8},${sx+12} ${y+sLen-20},${sx+2} ${y+sLen-26}`}
                fill="none" stroke={col} strokeWidth="1.2" />
            )}

            {flag16 && <>
              <path d={stemUp
                ? `M${sx} ${y-sLen} C${sx+14} ${y-sLen+8},${sx+12} ${y-sLen+20},${sx+2} ${y-sLen+26}`
                : `M${sx} ${y+sLen} C${sx+14} ${y+sLen-8},${sx+12} ${y+sLen-20},${sx+2} ${y+sLen-26}`}
                fill="none" stroke={col} strokeWidth="1.2" />
              <path d={stemUp
                ? `M${sx} ${y-sLen+10} C${sx+14} ${y-sLen+18},${sx+12} ${y-sLen+30},${sx+2} ${y-sLen+36}`
                : `M${sx} ${y+sLen-10} C${sx+14} ${y+sLen-18},${sx+12} ${y+sLen-30},${sx+2} ${y+sLen-36}`}
                fill="none" stroke={col} strokeWidth="1.2" />
            </>}

            <text x={x} y={y + (stemUp ? 26 : -18)} fontSize="8"
              fill={sel ? "#e8c87a" : "rgba(201,169,110,0.4)"}
              textAnchor="middle" fontFamily="'Ubuntu Mono',monospace">
              {inf.letter}{inf.octave}
            </text>

            {Math.abs(note.microtonalOffset || 0) > 10 && (
              <text x={x} y={y + (stemUp ? 36 : -28)} fontSize="7"
                fill="#d4882a" textAnchor="middle" fontFamily="'Ubuntu Mono',monospace">
                {note.microtonalOffset > 0 ? "+" : ""}{note.microtonalOffset.toFixed(0)}¢
              </text>
            )}
          </g>
        );
      })}

      {playheadX > 0 && (
        <line x1={playheadX} y1={0} x2={playheadX} y2={H}
          stroke="#e8c87a" strokeWidth={1.5} opacity={0.7} strokeDasharray="4 3" />
      )}
    </svg>
  );
}

// ── Tab SVG ──────────────────────────────────────────────────────────────────
function TabSVG({ notes, tuning, tempo, selectedNote, onSelectNote, onSvgClick, onEdit, svgRef, totalWidth, playheadX }) {
  const sc = tuning.strings.length;
  const H  = HEADER_HEIGHT + sc * STRING_SPACING + 20;
  const tx = (t) => 60 + (t * tempo / 60) * PIXELS_PER_BEAT;
  const sy = (i) => HEADER_HEIGHT + i * STRING_SPACING + STRING_SPACING / 2;

  return (
    <svg ref={svgRef} width={totalWidth} height={H}
      style={{ display:"block", cursor:"crosshair" }} onClick={onSvgClick}>
      <rect width={totalWidth} height={H} fill="#0d0a05" />

      {/* TAB label */}
      <text x={18} y={HEADER_HEIGHT + (sc * STRING_SPACING) / 2 + 4}
        textAnchor="middle" fill="#c9a96e" fontSize="12"
        fontFamily="'Ubuntu',sans-serif" fontWeight="700"
        transform={`rotate(-90,18,${HEADER_HEIGHT + (sc * STRING_SPACING) / 2 + 4})`}>TAB</text>

      {/* Bar lines + numbers */}
      {Array.from({ length: Math.ceil(totalWidth / (BEATS_PER_MEASURE * PIXELS_PER_BEAT)) + 2 }).map((_, m) => {
        const x = 60 + m * BEATS_PER_MEASURE * PIXELS_PER_BEAT;
        return (
          <g key={m}>
            <line x1={x} y1={HEADER_HEIGHT - 4} x2={x} y2={H - 14}
              stroke="rgba(201,169,110,0.2)" strokeWidth={m === 0 ? 2 : 1} />
            {m > 0 && <text x={x + 3} y={HEADER_HEIGHT - 12} fill="#9a8870" fontSize="9"
              fontFamily="'Ubuntu Mono',monospace">{m + 1}</text>}
          </g>
        );
      })}

      {/* Beat dashes */}
      {Array.from({ length: Math.ceil(totalWidth / PIXELS_PER_BEAT) + 2 }).map((_, b) => (
        <line key={b} x1={60 + b * PIXELS_PER_BEAT} y1={HEADER_HEIGHT}
          x2={60 + b * PIXELS_PER_BEAT} y2={H - 14}
          stroke="rgba(201,169,110,0.05)" strokeWidth={1} strokeDasharray="2 4" />
      ))}

      {/* Strings */}
      {tuning.strings.map((s, i) => (
        <g key={i}>
          <line x1={36} y1={sy(i)} x2={totalWidth - 8} y2={sy(i)}
            stroke="rgba(201,169,110,0.22)" strokeWidth={1} />
          <text x={32} y={sy(i) + 4} textAnchor="end" fill="#9a8870" fontSize="10"
            fontFamily="'Ubuntu Mono',monospace">{s.name}</text>
        </g>
      ))}

      {/* Notes */}
      {notes.map((note, idx) => {
        const x   = tx(note.time);
        const y   = sy(note.string);
        const w   = Math.max(22, (note.duration * tempo / 60) * PIXELS_PER_BEAT - 4);
        const sel = selectedNote === idx;
        const orn = note.ornament ? ORNAMENTS[note.ornament] : null;
        const fs  = String(note.fret ?? 0);
        const bw  = fs.length > 1 ? 22 : 18;

        return (
          <g key={note.id || idx} style={{ cursor:"pointer" }}
            onClick={e => { e.stopPropagation(); onSelectNote(sel ? null : idx); }} onDoubleClick={e => { e.stopPropagation(); onEdit(idx); }}>
            <rect x={x} y={y - 2} width={w} height={4} rx={2}
              fill={sel ? "rgba(232,200,122,0.4)" : "rgba(201,169,110,0.12)"} />
            <rect x={x - bw/2} y={y - 10} width={bw} height={20} rx={4}
              fill={sel ? "#c9a96e" : "#1a1408"}
              stroke={sel ? "#e8c87a" : "rgba(201,169,110,0.4)"} strokeWidth={sel ? 2 : 1} />
            <text x={x} y={y + 4.5} textAnchor="middle"
              fill={sel ? "#0d0a05" : "#e8c87a"}
              fontSize="10" fontFamily="'Ubuntu Mono',monospace" fontWeight="700">{fs}</text>
            {orn?.symbol && (
              <text x={x} y={y - 14} fontSize="9" fill="#d4882a" textAnchor="middle">{orn.symbol}</text>
            )}
            {Math.abs(note.microtonalOffset || 0) > 10 && (
              <text x={x} y={y + 24} fontSize="7.5" fill="#a04830"
                textAnchor="middle" fontFamily="'Ubuntu Mono',monospace">
                {note.microtonalOffset > 0 ? "+" : ""}{note.microtonalOffset.toFixed(0)}¢
              </text>
            )}
          </g>
        );
      })}

      {playheadX > 0 && (
        <line x1={playheadX} y1={0} x2={playheadX} y2={H}
          stroke="#e8c87a" strokeWidth={1.5} opacity={0.8} strokeDasharray="4 3" />
      )}
    </svg>
  );
}

// ── Main TabEditor ────────────────────────────────────────────────────────────
export default function TabEditor({ notes, tuning, instrument, selectedNote, onSelectNote, onNoteUpdate, onNoteDelete, onNoteAdd, tempo }) {
  const [editingNote, setEditingNote] = useState(null);
  const [viewMode,    setViewMode]    = useState("both");
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [playheadX,   setPlayheadX]   = useState(0);

  const svgRef      = useRef(null);
  const audioCtxRef = useRef(null);
  const rafRef      = useRef(null);

  const totalDuration = notes.length > 0
    ? Math.max(...notes.map(n => n.time + (n.duration || 0.5)), 4) : 4;
  const measures   = Math.ceil((totalDuration * tempo / 60) / BEATS_PER_MEASURE);
  const totalWidth = Math.max(800, measures * BEATS_PER_MEASURE * PIXELS_PER_BEAT + 120);
  const timeToX    = (t) => 60 + (t * tempo / 60) * PIXELS_PER_BEAT;

  const startPlayback = useCallback(() => {
    let ctx = audioCtxRef.current;
    if (!ctx || ctx.state === "closed") {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      ctx = new C();
      audioCtxRef.current = ctx;
    }
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    notes.forEach(n => {
      const mf = (n.midi || n.midiRounded) + (n.microtonalOffset || 0) / 100;
      playNote(ctx, mf, now + n.time, n.duration || 0.5);
    });
    setIsPlaying(true);
    const start = performance.now();
    const total = totalDuration + 0.5;
    const tick = () => {
      const el = (performance.now() - start) / 1000;
      if (el >= total) { setIsPlaying(false); setPlayheadX(0); return; }
      setPlayheadX(timeToX(el));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [notes, tempo, totalDuration]);

  const stopPlayback = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsPlaying(false); setPlayheadX(0);
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
  }, []);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioCtxRef.current) audioCtxRef.current.close();
  }, []);

  const handleSvgClick = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const time = ((x - 60) / PIXELS_PER_BEAT) * (60 / tempo);
    const si = Math.round((y - HEADER_HEIGHT - STRING_SPACING / 2) / STRING_SPACING);
    if (si < 0 || si >= tuning.strings.length || time < 0) return;
    if (notes.some(n => Math.abs(timeToX(n.time) - x) < 16 && n.string === si)) return;
    const om = tuning.strings[si].midi;
    onNoteAdd({ id: `note_${Date.now()}`, time, duration: (60 / tempo) * 0.5,
      midi: om, midiRounded: om, microtonalOffset: 0, string: si, fret: 0, velocity: 80, ornament: null });
  };

  const staffSvgRef = useRef(null);
  // Staff click: add note at clicked time on closest diatonic pitch
  const handleStaffClick = (e) => {
    if (!staffSvgRef.current) return;
    const rect = staffSvgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = ((x - 70) / PIXELS_PER_BEAT) * (60 / tempo);
    if (time < 0) return;
    // Don't add if clicking an existing note
    if (notes.some(n => Math.abs(timeToX(n.time) - x) < 16)) return;
    // Default: add C4 on string 0 fret 0 — user can edit
    const defaultMidi = tuning.strings[0].midi;
    onNoteAdd({ id: `note_${Date.now()}`, time, duration: (60 / tempo) * 0.5,
      midi: defaultMidi, midiRounded: defaultMidi, microtonalOffset: 0,
      string: 0, fret: 0, velocity: 80, ornament: null });
  };

  const openEdit = (idx) => setEditingNote({ ...notes[idx], idx });

  const VIEW_OPTIONS = [
    { key:"tab",   icon:<TableChartIcon sx={{fontSize:14}}/>, label:"Tab only" },
    { key:"both",  icon:<ViewColumnIcon sx={{fontSize:14}}/>, label:"Tab + Staff" },
    { key:"staff", icon:<MusicNoteIcon  sx={{fontSize:14}}/>, label:"Staff only" },
  ];

  return (
    <Box sx={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden" }}>

      {/* Toolbar */}
      <Paper square variant="outlined" sx={{
        display:"flex", alignItems:"center", gap:1, px:2, py:0.75,
        bgcolor:"background.paper", borderLeft:0, borderRight:0, borderTop:0, flexShrink:0,
      }}>

        <Tooltip title={isPlaying ? "Stop" : "Play"}>
          <span>
            <IconButton size="small" onClick={isPlaying ? stopPlayback : startPlayback}
              disabled={notes.length === 0}
              sx={{
                bgcolor: isPlaying ? "rgba(192,57,43,0.12)" : "rgba(74,138,90,0.12)",
                color: isPlaying ? "error.main" : "success.main",
                border: "1px solid",
                borderColor: isPlaying ? "error.dark" : "success.dark",
                "&:hover": { bgcolor: isPlaying ? "rgba(192,57,43,0.22)" : "rgba(74,138,90,0.22)" },
                mr:0.5,
              }}>
              {isPlaying ? <StopIcon sx={{fontSize:16}}/> : <PlayArrowIcon sx={{fontSize:16}}/>}
            </IconButton>
          </span>
        </Tooltip>

        <Button size="small" variant="outlined" startIcon={<AddIcon/>}
          onClick={() => onNoteAdd({
            id:`note_${Date.now()}`,
            time: notes.length > 0 ? Math.max(...notes.map(n => n.time + (n.duration||0.5))) : 0,
            duration: 60/tempo*0.5, midi: tuning.strings[0].midi, midiRounded: tuning.strings[0].midi,
            microtonalOffset:0, string:0, fret:0, velocity:80, ornament:null,
          })}
          sx={{ fontSize:"0.7rem", borderColor:"divider", color:"text.primary" }}>
          Note
        </Button>

        {selectedNote !== null && <>
          <Button size="small" variant="outlined" startIcon={<EditIcon/>}
            onClick={() => openEdit(selectedNote)}
            sx={{ fontSize:"0.7rem", borderColor:"primary.dark", color:"primary.main" }}>
            Edit
          </Button>
          <Button size="small" variant="outlined" startIcon={<DeleteIcon/>}
            onClick={() => { onNoteDelete(selectedNote); onSelectNote(null); }}
            sx={{ fontSize:"0.7rem", borderColor:"error.dark", color:"error.main" }}>
            Delete
          </Button>
        </>}

        <Box sx={{ ml:"auto", display:"flex", alignItems:"center", gap:0.5 }}>
          {VIEW_OPTIONS.map(v => (
            <Tooltip key={v.key} title={v.label}>
              <IconButton size="small" onClick={() => setViewMode(v.key)} sx={{
                p:0.5, color: viewMode===v.key ? "primary.main" : "text.secondary",
                bgcolor: viewMode===v.key ? "rgba(201,169,110,0.1)" : "transparent",
                border:"1px solid", borderColor: viewMode===v.key ? "primary.dark" : "divider",
              }}>{v.icon}</IconButton>
            </Tooltip>
          ))}
          <Typography variant="caption" sx={{ color:"text.secondary", ml:1 }}>
            {notes.length} notes · {measures} bar{measures!==1?"s":""}
          </Typography>
        </Box>
      </Paper>

      {/* Score area */}
      <Box sx={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column" }}>
        {(viewMode==="staff" || viewMode==="both") && (
          <Box sx={{ borderBottom:"1px solid", borderColor:"divider" }}>
            <StaffSVG notes={notes} tempo={tempo} selectedNote={selectedNote}
              onSelectNote={onSelectNote} onEdit={openEdit}
              onStaffClick={handleStaffClick} svgRef={staffSvgRef}
              totalWidth={totalWidth} playheadX={playheadX} />
          </Box>
        )}
        {(viewMode==="tab" || viewMode==="both") && (
          <TabSVG notes={notes} tuning={tuning} tempo={tempo} selectedNote={selectedNote}
            onSelectNote={onSelectNote} onSvgClick={handleSvgClick} onEdit={openEdit} svgRef={svgRef}
            totalWidth={totalWidth} playheadX={playheadX} />
        )}
      </Box>

      {editingNote && (
        <NoteEditDialog note={editingNote} tuning={tuning} instrument={instrument} tempo={tempo}
          onUpdate={u => { onNoteUpdate(editingNote.idx, u); setEditingNote(null); }}
          onClose={() => setEditingNote(null)} />
      )}
    </Box>
  );
}

// ── Note Edit Dialog ──────────────────────────────────────────────────────────
function NoteEditDialog({ note, tuning, instrument, tempo, onUpdate, onClose }) {
  const [fret,   setFret]   = useState(note.fret ?? 0);
  const [str,    setStr]    = useState(note.string ?? 0);
  const [orn,    setOrn]    = useState(note.ornament || "none");
  const [mto,    setMto]    = useState(note.microtonalOffset || 0);
  const [dur,    setDur]    = useState(note.duration || (60/tempo*0.5));

  const allPos = getAllPositions(note.midi || note.midiRounded, tuning, instrument);
  const openMidi = tuning.strings[str]?.midi ?? note.midiRounded;
  const derivedMidi = openMidi + fret + mto / 100;
  const staffInf = midiToStaff(Math.round(derivedMidi));

  const preview = () => {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    const ctx = new C();
    playNote(ctx, derivedMidi, ctx.currentTime, dur);
    setTimeout(() => ctx.close(), (dur + 1.5) * 1000);
  };

  const apply = () => {
    const nm = openMidi + fret;
    onUpdate({ fret, string:str, midi:nm + mto/100, midiRounded:nm,
      microtonalOffset:mto, duration:dur, ornament: orn==="none"?null:orn });
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx:{ bgcolor:"background.paper", backgroundImage:"none" } }}>
      <DialogTitle sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", pb:1 }}>
        <Typography sx={{ color:"primary.light", fontSize:"0.9rem", fontFamily:"'Ubuntu',sans-serif", fontWeight:500 }}>
          Edit Note — {midiToName(Math.round(derivedMidi))}
          {staffInf.accidental && <span style={{color:"#d4882a"}}> {staffInf.accidental}</span>}
        </Typography>
        <Box sx={{ display:"flex", gap:0.5 }}>
          <Tooltip title="Preview">
            <IconButton size="small" onClick={preview}
              sx={{ color:"success.main", border:"1px solid", borderColor:"success.dark" }}>
              <PlayArrowIcon sx={{fontSize:14}}/>
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small"/></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display:"flex", flexDirection:"column", gap:2, pt:1 }}>

        <FormControl size="small" fullWidth>
          <InputLabel sx={{fontSize:"0.75rem"}}>String</InputLabel>
          <Select value={str} label="String" onChange={e=>setStr(+e.target.value)} sx={{fontSize:"0.75rem"}}>
            {tuning.strings.map((s,i) => (
              <MenuItem key={i} value={i} sx={{fontSize:"0.75rem"}}>{i+1}: {s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField label="Fret" type="number" size="small" value={fret}
          onChange={e=>setFret(Math.max(0,+e.target.value))} inputProps={{min:0,max:24}}
          InputLabelProps={{sx:{fontSize:"0.75rem"}}}
          sx={{"& .MuiInputBase-input":{fontSize:"0.75rem",fontFamily:"'Ubuntu Mono',monospace"}}} />

        {allPos.length > 1 && (
          <Box>
            <Typography variant="caption" sx={{color:"text.secondary",display:"block",mb:0.5}}>
              Alternative positions
            </Typography>
            <Box sx={{display:"flex",flexWrap:"wrap",gap:0.5}}>
              {allPos.map((p,i) => (
                <Chip key={i} label={`F${p.fret} S${p.string+1}`} size="small"
                  onClick={()=>{setStr(p.string);setFret(p.fret);}}
                  variant={p.string===str&&p.fret===fret?"filled":"outlined"}
                  sx={{ fontSize:"0.65rem", fontFamily:"'Ubuntu Mono',monospace",
                    bgcolor: p.string===str&&p.fret===fret?"primary.main":"transparent",
                    borderColor:"primary.dark",
                    color: p.string===str&&p.fret===fret?"background.default":"primary.main",
                    cursor:"pointer" }} />
              ))}
            </Box>
          </Box>
        )}

        {/* Duration */}
        <Box>
          <Typography variant="caption" sx={{color:"text.secondary",display:"block",mb:0.75}}>Duration</Typography>
          <Box sx={{display:"flex",gap:0.5,flexWrap:"wrap",mb:1}}>
            {DURATION_OPTIONS.map(d => {
              const sv = d.value * (60/tempo);
              const active = Math.abs(dur-sv) < 0.01;
              return (
                <Box key={d.value} onClick={()=>setDur(sv)} sx={{
                  px:1, py:0.5, borderRadius:1, cursor:"pointer", border:"1px solid",
                  borderColor: active?"primary.main":"divider",
                  bgcolor: active?"rgba(201,169,110,0.12)":"background.default",
                  display:"flex", flexDirection:"column", alignItems:"center", minWidth:42,
                }}>
                  <Typography sx={{fontSize:"1rem",lineHeight:1,color:active?"primary.main":"text.secondary"}}>{d.symbol}</Typography>
                  <Typography sx={{fontSize:"0.55rem",color:active?"primary.main":"text.secondary"}}>{d.label}</Typography>
                </Box>
              );
            })}
          </Box>
          <TextField label="Duration (s)" type="number" size="small" value={dur.toFixed(3)}
            onChange={e=>setDur(Math.max(0.05,+e.target.value))} inputProps={{min:0.05,max:8,step:0.05}}
            InputLabelProps={{sx:{fontSize:"0.75rem"}}}
            sx={{"& .MuiInputBase-input":{fontSize:"0.75rem"}}} />
        </Box>

        <FormControl size="small" fullWidth>
          <InputLabel sx={{fontSize:"0.75rem"}}>Ornament</InputLabel>
          <Select value={orn} label="Ornament" onChange={e=>setOrn(e.target.value)} sx={{fontSize:"0.75rem"}}>
            {Object.entries(ORNAMENTS).map(([k,v])=>(
              <MenuItem key={k} value={k} sx={{fontSize:"0.75rem"}}>{v.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box>
          <Box sx={{display:"flex",justifyContent:"space-between",mb:0.5}}>
            <Typography variant="caption" sx={{color:"text.secondary"}}>Microtonal offset</Typography>
            <Typography variant="caption" sx={{color:"primary.main",fontFamily:"'Ubuntu Mono',monospace"}}>
              {mto>0?"+":""}{mto}¢
            </Typography>
          </Box>
          <Slider value={mto} min={-50} max={50} onChange={(_,v)=>setMto(v)} size="small"
            marks={[{value:-50,label:"−50¢"},{value:0,label:"0"},{value:50,label:"+50¢"}]}
            sx={{color:"primary.main","& .MuiSlider-markLabel":{fontSize:"0.6rem"}}} />
        </Box>

        {/* Staff preview */}
        <Box sx={{bgcolor:"background.default",borderRadius:1,border:"1px solid",borderColor:"divider",p:1}}>
          <Typography variant="caption" sx={{color:"text.secondary",display:"block",mb:0.5}}>Staff preview</Typography>
          <svg width="100%" height="62" style={{display:"block"}}>
            <rect width="100%" height="62" fill="#0a0805"/>
            {[8,18,28,38,48].map((y,i)=>(
              <line key={i} x1={20} y1={y} x2="100%" y2={y} stroke="rgba(201,169,110,0.2)" strokeWidth={1}/>
            ))}
            {(()=>{
              const y = Math.max(4, Math.min(55, staffPosToY(staffInf.pos, 8, 10)));
              return <ellipse cx={70} cy={y} rx={7} ry={4.3} fill="#c9a96e" stroke="#e8c87a" strokeWidth={1}/>;
            })()}
            <text x={92} y={32} fontSize="10" fill="#9a8870" fontFamily="'Ubuntu',sans-serif">
              {staffInf.letter}{staffInf.accidental}{staffInf.octave}
            </text>
          </svg>
        </Box>
      </DialogContent>

      <DialogActions sx={{px:3,pb:2}}>
        <Button onClick={onClose} size="small" sx={{color:"text.secondary",fontFamily:"'Ubuntu',sans-serif"}}>Cancel</Button>
        <Button onClick={apply} variant="contained" size="small"
          sx={{bgcolor:"success.main","&:hover":{bgcolor:"success.dark"},fontFamily:"'Ubuntu',sans-serif"}}>
          ✓ Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}

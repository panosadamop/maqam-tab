import { useState, useRef } from "react";
import {
  Box, Button, ButtonGroup, Typography, Paper, Toolbar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Slider,
  Chip, IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
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

  const handleNoteClick = (note, idx, e) => {
    e.stopPropagation();
    if (selectedNote === idx) {
      setEditingNote({ ...note, idx });
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
        id: `note_${Date.now()}`, time, duration: 60 / tempo / 2,
        midi: openMidi, midiRounded: openMidi, microtonalOffset: 0,
        string: stringIdx, fret: 0, velocity: 80, ornament: null,
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
      <g style={{ cursor: "pointer" }} onClick={(e) => handleNoteClick(note, idx, e)}>
        <rect x={x} y={y - 2} width={w} height={4} rx={2}
          fill={isSelected ? "#e8c87a" : "rgba(201,169,110,0.3)"} />
        <rect x={x} y={y - 10} width={Math.max(20, Math.min(w, 24))} height={20}
          rx={4}
          fill={isSelected ? "#c9a96e" : "#261f14"}
          stroke={isSelected ? "#e8c87a" : "rgba(201,169,110,0.15)"}
          strokeWidth={isSelected ? 2 : 1}
        />
        <text x={x + 12} y={y + 4} textAnchor="middle"
          fill={isSelected ? "#0d0a05" : "#e8c87a"}
          fontSize="10" fontFamily="monospace" fontWeight="600">
          {note.fret}
        </text>
        {ornament?.symbol && (
          <text x={x + 14} y={y - 14} fontSize="9" fill="#d4882a" textAnchor="middle">
            {ornament.symbol}
          </text>
        )}
        {Math.abs(note.microtonalOffset || 0) > 10 && (
          <text x={x + 14} y={y + 20} fontSize="8" fill="#a04830" textAnchor="middle">
            {note.microtonalOffset > 0 ? `+${note.microtonalOffset.toFixed(0)}¢` : `${note.microtonalOffset.toFixed(0)}¢`}
          </text>
        )}
      </g>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Toolbar */}
      <Paper
        square
        variant="outlined"
        sx={{
          display: "flex", alignItems: "center", gap: 1,
          px: 2, py: 0.75,
          bgcolor: "background.paper",
          borderLeft: 0, borderRight: 0, borderTop: 0,
          flexShrink: 0,
        }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => onNoteAdd({
            id: `note_${Date.now()}`, time: 0, duration: 0.5,
            midi: tuning.strings[0].midi, midiRounded: tuning.strings[0].midi,
            microtonalOffset: 0, string: 0, fret: 0, velocity: 80, ornament: null,
          })}
          sx={{ fontSize: "0.7rem", borderColor: "divider", color: "text.primary" }}
        >
          Νότα
        </Button>

        {selectedNote !== null && (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setEditingNote({ ...notes[selectedNote], idx: selectedNote })}
              sx={{ fontSize: "0.7rem", borderColor: "primary.dark", color: "primary.main" }}
            >
              Επεξεργασία
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={() => { onNoteDelete(selectedNote); onSelectNote(null); }}
              sx={{ fontSize: "0.7rem", borderColor: "error.dark", color: "error.main" }}
            >
              Διαγραφή
            </Button>
          </>
        )}

        <Typography variant="caption" sx={{ color: "text.secondary", ml: "auto" }}>
          {notes.length} νότες · {measures} μέτρα
        </Typography>
      </Paper>

      {/* TAB canvas */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <svg
          ref={svgRef}
          width={totalWidth}
          height={TAB_HEIGHT}
          style={{ cursor: "crosshair" }}
          onClick={handleSvgClick}
        >
          <rect width={totalWidth} height={TAB_HEIGHT} fill="#0d0a05" />

          {/* Measure lines */}
          {Array.from({ length: measures + 1 }).map((_, m) => {
            const x = 60 + m * BEATS_PER_MEASURE * PIXELS_PER_BEAT;
            return (
              <g key={m}>
                <line x1={x} y1={HEADER_HEIGHT - 5} x2={x} y2={TAB_HEIGHT - 15}
                  stroke="rgba(201,169,110,0.2)" strokeWidth={m === 0 ? 2 : 1} />
                <text x={x + 4} y={HEADER_HEIGHT - 12} fill="#9a8870" fontSize="9" fontFamily="monospace">
                  {m + 1}
                </text>
              </g>
            );
          })}

          {/* Beat subdivisions */}
          {Array.from({ length: measures * BEATS_PER_MEASURE }).map((_, b) => (
            <line key={b}
              x1={60 + b * PIXELS_PER_BEAT} y1={HEADER_HEIGHT}
              x2={60 + b * PIXELS_PER_BEAT} y2={TAB_HEIGHT - 15}
              stroke="rgba(201,169,110,0.06)" strokeWidth={1} strokeDasharray="2 4" />
          ))}

          {/* String lines */}
          {tuning.strings.map((s, sIdx) => {
            const y = stringToY(sIdx);
            return (
              <g key={sIdx}>
                <line x1={40} y1={y} x2={totalWidth - 10} y2={y}
                  stroke="rgba(201,169,110,0.2)" strokeWidth={1} />
                <text x={36} y={y + 4} textAnchor="end" fill="#9a8870" fontSize="10" fontFamily="monospace">
                  {s.name}
                </text>
              </g>
            );
          })}

          {/* TAB label */}
          <text x={20} y={HEADER_HEIGHT + (stringCount * STRING_SPACING) / 2}
            textAnchor="middle" fill="#c9a96e" fontSize="11" fontFamily="monospace" fontWeight="600"
            transform={`rotate(-90, 20, ${HEADER_HEIGHT + (stringCount * STRING_SPACING) / 2})`}>
            TAB
          </text>

          {notes.map((note, idx) => (
            <NotePill key={note.id || idx} note={note} idx={idx} />
          ))}
        </svg>
      </Box>

      {/* Note Edit Dialog */}
      {editingNote && (
        <NoteEditDialog
          note={editingNote}
          tuning={tuning}
          instrument={instrument}
          onUpdate={(updated) => {
            onNoteUpdate(editingNote.idx, updated);
            setEditingNote(null);
          }}
          onClose={() => setEditingNote(null)}
        />
      )}
    </Box>
  );
}

function NoteEditDialog({ note, tuning, instrument, onUpdate, onClose }) {
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
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: "background.paper", backgroundImage: "none" } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Typography sx={{ color: "primary.light", fontSize: "0.85rem", fontFamily: "monospace" }}>
          Επεξεργασία Νότας — {midiToName(note.midiRounded)}
        </Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <FormControl size="small" fullWidth>
          <InputLabel sx={{ fontSize: "0.75rem" }}>Χορδή</InputLabel>
          <Select value={string} label="Χορδή" onChange={e => setString(+e.target.value)} sx={{ fontSize: "0.75rem" }}>
            {tuning.strings.map((s, i) => (
              <MenuItem key={i} value={i} sx={{ fontSize: "0.75rem" }}>{i + 1}: {s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Τάστο" type="number" size="small"
          value={fret} onChange={e => setFret(+e.target.value)}
          inputProps={{ min: 0, max: 24 }}
          InputLabelProps={{ sx: { fontSize: "0.75rem" } }}
          sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem" } }}
        />

        {allPositions.length > 1 && (
          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Εναλλακτικές θέσεις
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {allPositions.map((pos, i) => (
                <Chip
                  key={i}
                  label={`${pos.fret}/${pos.string + 1}`}
                  size="small"
                  onClick={() => { setString(pos.string); setFret(pos.fret); }}
                  variant={pos.string === string && pos.fret === fret ? "filled" : "outlined"}
                  sx={{
                    fontSize: "0.65rem", fontFamily: "monospace",
                    bgcolor: pos.string === string && pos.fret === fret ? "primary.main" : "transparent",
                    borderColor: "primary.dark",
                    color: pos.string === string && pos.fret === fret ? "background.default" : "primary.main",
                    cursor: "pointer",
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        <FormControl size="small" fullWidth>
          <InputLabel sx={{ fontSize: "0.75rem" }}>Ornament</InputLabel>
          <Select value={ornament} label="Ornament" onChange={e => setOrnament(e.target.value)} sx={{ fontSize: "0.75rem" }}>
            {Object.entries(ORNAMENTS).map(([k, v]) => (
              <MenuItem key={k} value={k} sx={{ fontSize: "0.75rem" }}>{v.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>Μικροτονικό offset</Typography>
            <Typography variant="caption" sx={{ color: "primary.main", fontFamily: "monospace" }}>
              {microtonalOffset > 0 ? "+" : ""}{microtonalOffset}¢
            </Typography>
          </Box>
          <Slider
            value={microtonalOffset} min={-50} max={50}
            onChange={(_, v) => setMicrotonalOffset(v)}
            size="small" sx={{ color: "primary.main" }}
          />
        </Box>

        <TextField
          label="Διάρκεια (s)" type="number" size="small"
          value={duration} onChange={e => setDuration(+e.target.value)}
          inputProps={{ min: 0.05, max: 4, step: 0.05 }}
          InputLabelProps={{ sx: { fontSize: "0.75rem" } }}
          sx={{ "& .MuiInputBase-input": { fontSize: "0.75rem" } }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} size="small" sx={{ color: "text.secondary" }}>Ακύρωση</Button>
        <Button onClick={apply} variant="contained" size="small"
          sx={{ bgcolor: "success.main", "&:hover": { bgcolor: "success.dark" } }}>
          ✓ Εφαρμογή
        </Button>
      </DialogActions>
    </Dialog>
  );
}

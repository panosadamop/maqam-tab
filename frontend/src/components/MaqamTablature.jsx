import { useState, useMemo, useCallback, useRef } from "react";
import { Box, Typography, Chip, Tooltip, IconButton } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import { INSTRUMENTS, findBestPosition, getAllPositions } from "../utils/instruments";
import { playNote, playScale } from "../utils/audioEngine";

// ── Constants ────────────────────────────────────────────────────────────────

// Idiomatic root pitches per instrument for each common root note
const ROOT_OPTIONS = [
  { label: "C",  midi: 60 },
  { label: "C#", midi: 61 },
  { label: "D",  midi: 62 },
  { label: "Eb", midi: 63 },
  { label: "E",  midi: 64 },
  { label: "F",  midi: 65 },
  { label: "F#", midi: 66 },
  { label: "G",  midi: 67 },
  { label: "Ab", midi: 68 },
  { label: "A",  midi: 69 },
  { label: "Bb", midi: 70 },
  { label: "B",  midi: 71 },
];

const DEGREE_NAMES = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

const INTERVAL_TYPES = {
  0:    { label: "P1",  color: "#e8c87a" },   // tonic
  50:   { label: "¼T",  color: "#d4882a" },   // quarter-tone
  100:  { label: "m2",  color: "#c9a96e" },
  150:  { label: "¾T",  color: "#d4882a" },   // three-quarter-tone
  200:  { label: "M2",  color: "#c9a96e" },
  250:  { label: "~M2", color: "#d4882a" },
  300:  { label: "m3",  color: "#9ab0c8" },
  350:  { label: "n3",  color: "#d4882a" },   // neutral 3rd ★
  400:  { label: "M3",  color: "#9ab0c8" },
  450:  { label: "n4",  color: "#d4882a" },   // neutral 4th ★
  500:  { label: "P4",  color: "#9ab0c8" },
  550:  { label: "A4",  color: "#c06060" },
  600:  { label: "TT",  color: "#c06060" },   // tritone
  650:  { label: "d5",  color: "#c06060" },
  700:  { label: "P5",  color: "#e8c87a" },   // dominant
  750:  { label: "A5",  color: "#d4882a" },
  800:  { label: "m6",  color: "#9ab0c8" },
  850:  { label: "n6",  color: "#d4882a" },   // neutral 6th ★
  900:  { label: "M6",  color: "#9ab0c8" },
  950:  { label: "~m7", color: "#d4882a" },
  1000: { label: "m7",  color: "#9ab0c8" },
  1050: { label: "n7",  color: "#d4882a" },   // neutral 7th ★
  1100: { label: "M7",  color: "#9ab0c8" },
  1200: { label: "P8",  color: "#e8c87a" },   // octave
};

function getIntervalInfo(cents) {
  const nearest = Object.keys(INTERVAL_TYPES)
    .map(Number)
    .reduce((a, b) => Math.abs(b - cents) < Math.abs(a - cents) ? b : a);
  return INTERVAL_TYPES[nearest] || { label: `${cents}¢`, color: "#c9a96e" };
}

function isMicrotonal(cents) {
  return cents % 100 !== 0;
}

// ── Note naming: exact maqam names with all accidentals ──────────────────────
//
// Each scale degree gets the next diatonic letter (C D E F G A B) after the root.
// We compute how many semitones that "natural" letter is from the root, then
// measure how far the actual pitch deviates from it.
//
// Floor rule: always floor the semitone deviation so the microtonal remainder
// is 0–99¢ (always upward), giving consistent "♭↑" notation (e.g. E♭↑ = E♭
// raised by a quarter-tone). This matches standard Arabic/Turkish maqam practice
// where neutral intervals are always written as "flat+raised" or "natural+raised".

const DIATONIC_LETTERS = ["C","D","E","F","G","A","B"];
const LETTER_CHROMA    = [0, 2, 4, 5, 7, 9, 11];  // chromatic value of each natural letter

// For flat roots, assign to the flat letter: Bb→B, Eb→E, Ab→A, Db→D
const ROOT_LETTER_IDX  = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
//                        C  Db D  Eb E  F  F# G  Ab A  Bb B

function noteNameForDegree(rootMidi, cents, degreeIdx) {
  const rootChroma    = rootMidi % 12;
  const rootLetterIdx = ROOT_LETTER_IDX[rootChroma];
  const letterIdx     = (rootLetterIdx + degreeIdx) % 7;
  const letter        = DIATONIC_LETTERS[letterIdx];

  const letterChroma  = LETTER_CHROMA[letterIdx];
  const naturalSemi   = ((letterChroma - rootChroma) + 12) % 12 + (degreeIdx >= 7 ? 12 : 0);

  const midiFloat     = rootMidi + cents / 100;
  const naturalMidi   = rootMidi + naturalSemi;
  const offsetCents   = (midiFloat - naturalMidi) * 100;

  // Floor: semiDiff always rounds DOWN so microCents is always 0..+99
  const semiDiff      = Math.floor(offsetCents / 100);
  const microCents    = offsetCents - semiDiff * 100;

  let accidental = "";
  if (semiDiff === -2) accidental = "𝄫";
  else if (semiDiff === -1) accidental = "♭";
  else if (semiDiff ===  1) accidental = "♯";
  else if (semiDiff ===  2) accidental = "𝄪";

  const microSuffix = microCents >= 30 ? "↑" : "";

  return {
    letter,
    accidental,
    microSuffix,
    display: letter + accidental + microSuffix,
    microCents,
  };
}

// ── Build scale notes from maqam intervals + root MIDI ──────────────────────
function buildScaleNotes(maqam, rootMidi, tuning, instrument) {
  return maqam.intervals.map((cents, degreeIdx) => {
    const midiFloat = rootMidi + cents / 100;
    const midiRounded = Math.round(midiFloat);
    const microtonalOffset = (midiFloat - midiRounded) * 100;

    const pos  = findBestPosition(midiFloat, tuning, instrument);
    const alts = getAllPositions(midiFloat, tuning, instrument)
      .filter(p => !(p.string === pos?.string && p.fret === pos?.fret))
      .slice(0, 2);

    const intervalInfo = getIntervalInfo(cents);
    const micro = isMicrotonal(cents);
    const nameInfo = noteNameForDegree(rootMidi, cents, degreeIdx);

    return {
      cents,
      midiFloat,
      midiRounded,
      microtonalOffset,
      noteName: nameInfo.display,   // e.g. "E♭", "F↑", "B♭"
      nameInfo,
      degree: DEGREE_NAMES[degreeIdx] || `${degreeIdx + 1}`,
      pos,
      alts,
      intervalInfo,
      micro,
      isRoot: cents === 0,
      isDominant: cents === maqam.dominant,
      isCharacteristic: maqam.characteristic?.includes(cents),
    };
  });
}

// ── SVG Tablature Renderer ───────────────────────────────────────────────────
function TablatureSVG({ notes, tuning, instrument, highlightedIdx, onHover }) {
  const inst = INSTRUMENTS[instrument];
  const numStrings = tuning.strings.length;
  const numNotes = notes.length;

  // Layout
  const LEFT_PAD   = 28;
  const RIGHT_PAD  = 16;
  const TOP_PAD    = 20;
  const BOTTOM_PAD = 18;
  const COL_W      = 52;
  const ROW_H      = 16;
  const WIDTH      = LEFT_PAD + numNotes * COL_W + RIGHT_PAD;
  const HEIGHT     = TOP_PAD + numStrings * ROW_H + BOTTOM_PAD;

  const stringY = (sIdx) => TOP_PAD + sIdx * ROW_H + ROW_H / 2;
  const noteX   = (nIdx) => LEFT_PAD + nIdx * COL_W + COL_W / 2;

  return (
    <Box sx={{ overflowX: "auto", overflowY: "hidden" }}>
      <svg
        width={WIDTH}
        height={HEIGHT}
        style={{ display: "block", fontFamily: "'Ubuntu Mono', monospace" }}
      >
        {/* String lines */}
        {tuning.strings.map((s, sIdx) => (
          <g key={sIdx}>
            <line
              x1={LEFT_PAD - 8} y1={stringY(sIdx)}
              x2={WIDTH - RIGHT_PAD} y2={stringY(sIdx)}
              stroke="rgba(201,169,110,0.25)"
              strokeWidth={sIdx === 0 ? 1.5 : 1}
            />
            {/* String name label */}
            <text
              x={LEFT_PAD - 10} y={stringY(sIdx) + 4}
              fontSize="9" fill="rgba(201,169,110,0.5)"
              textAnchor="end"
            >
              {s.name}
            </text>
          </g>
        ))}

        {/* TAB bracket */}
        <line x1={LEFT_PAD - 8} y1={TOP_PAD} x2={LEFT_PAD - 8} y2={TOP_PAD + (numStrings - 1) * ROW_H + ROW_H / 2 + 4} stroke="rgba(201,169,110,0.3)" strokeWidth="1.5" />

        {/* Notes */}
        {notes.map((note, nIdx) => {
          if (!note.pos) return null;
          const { string: sIdx, fret } = note.pos;
          const x = noteX(nIdx);
          const y = stringY(sIdx);
          const isHighlighted = highlightedIdx === nIdx;
          const fretStr = String(fret);

          // Bubble dimensions
          const bw = fretStr.length > 1 ? 22 : 18;
          const bh = 14;

          const bubbleColor = note.isRoot ? "#e8c87a"
            : note.isDominant ? "#c9a96e"
            : note.isCharacteristic ? "#d4882a"
            : "#4a6080";

          const textColor = note.isRoot || note.isDominant ? "#0d0a05" : "#e8e0d0";

          return (
            <g
              key={nIdx}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => onHover(nIdx)}
              onMouseLeave={() => onHover(null)}
            >
              {/* Vertical tick from string to bubble */}
              <line
                x1={x} y1={y - bh / 2}
                x2={x} y2={stringY(0)}
                stroke={isHighlighted ? bubbleColor : "rgba(201,169,110,0.1)"}
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Degree label above */}
              <text
                x={x} y={TOP_PAD - 6}
                fontSize="8" fill={isHighlighted ? "#e8c87a" : "rgba(201,169,110,0.4)"}
                textAnchor="middle"
              >
                {note.degree}
              </text>

              {/* Bubble */}
              <rect
                x={x - bw / 2} y={y - bh / 2}
                width={bw} height={bh}
                rx="3"
                fill={isHighlighted ? bubbleColor : `${bubbleColor}aa`}
                stroke={isHighlighted ? bubbleColor : `${bubbleColor}66`}
                strokeWidth="1"
              />

              {/* Fret number */}
              <text
                x={x} y={y + 4.5}
                fontSize="9" fontWeight="bold"
                fill={isHighlighted ? textColor : "#e8e0d0"}
                textAnchor="middle"
              >
                {fretStr}
              </text>

              {/* Microtonal indicator dot */}
              {note.micro && (
                <circle
                  cx={x + bw / 2 - 1} cy={y - bh / 2 + 1}
                  r="3"
                  fill="#d4882a"
                />
              )}

              {/* Note name below */}
              <text
                x={x} y={HEIGHT - 4}
                fontSize="8"
                fill={isHighlighted ? "#e8c87a" : "rgba(201,169,110,0.4)"}
                textAnchor="middle"
              >
                {note.noteName.replace(/\d/, "")}
              </text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function MaqamTablature({ maqam, tuning, instrument }) {
  const [rootMidi,    setRootMidi]    = useState(62);
  const [hoveredIdx,  setHoveredIdx]  = useState(null);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  const scaleNotes = useMemo(
    () => buildScaleNotes(maqam, rootMidi, tuning, instrument),
    [maqam, rootMidi, tuning, instrument]
  );

  const hoveredNote = hoveredIdx !== null ? scaleNotes[hoveredIdx] : null;

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (audioRef.current) audioRef.current.close().catch(() => {});
      audioRef.current = null;
      setIsPlaying(false);
      return;
    }
    const result = playScale(scaleNotes, 0.45);
    if (!result) return;
    audioRef.current = result.ctx;
    setIsPlaying(true);
    timerRef.current = setTimeout(() => {
      setIsPlaying(false);
      audioRef.current = null;
    }, result.totalDuration * 1000 + 400);
  }, [isPlaying, scaleNotes, instrument]);

  return (
    <Box>
      {/* Root selector + play button */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <Tooltip title={isPlaying ? "Stop" : "Play scale"}>
          <IconButton size="small" onClick={handlePlay} sx={{
            bgcolor: isPlaying ? "rgba(192,57,43,0.12)" : "rgba(74,138,90,0.12)",
            color: isPlaying ? "error.main" : "success.main",
            border: "1px solid",
            borderColor: isPlaying ? "error.dark" : "success.dark",
            flexShrink: 0,
            "&:hover": { bgcolor: isPlaying ? "rgba(192,57,43,0.22)" : "rgba(74,138,90,0.22)" },
          }}>
            {isPlaying ? <StopIcon sx={{ fontSize: 14 }} /> : <PlayArrowIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        </Tooltip>

        <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
          Root:
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4 }}>
          {ROOT_OPTIONS.map((r) => (
            <Box
              key={r.midi}
              onClick={() => setRootMidi(r.midi)}
              sx={{
                px: 0.75, py: 0.25,
                borderRadius: 0.5,
                border: "1px solid",
                borderColor: rootMidi === r.midi ? "primary.main" : "divider",
                bgcolor: rootMidi === r.midi ? "rgba(201,169,110,0.15)" : "background.default",
                color: rootMidi === r.midi ? "primary.main" : "text.secondary",
                fontSize: "0.65rem",
                fontFamily: "'Ubuntu Mono', monospace",
                fontWeight: rootMidi === r.midi ? 700 : 400,
                cursor: "pointer",
                transition: "all 0.12s",
                "&:hover": { borderColor: "primary.main", color: "primary.main" },
              }}
            >
              {r.label}
            </Box>
          ))}
        </Box>
        <Typography variant="caption" sx={{ color: "text.secondary", ml: "auto", fontSize: "0.6rem" }}>
          {tuning.name}
        </Typography>
      </Box>

      {/* Tablature SVG */}
      <Box
        sx={{
          bgcolor: "background.default",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          p: 1.5,
          mb: 1.5,
        }}
      >
        <TablatureSVG
          notes={scaleNotes}
          tuning={tuning}
          instrument={instrument}
          highlightedIdx={hoveredIdx}
          onHover={setHoveredIdx}
        />
      </Box>

      {/* Legend row */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
        {[
          { color: "#e8c87a", label: "Tonic / Octave", dark: true },
          { color: "#c9a96e", label: "Dominant" , dark: true },
          { color: "#d4882a", label: "Characteristic / Microtonal", dark: true },
          { color: "#4a6080", label: "Scale degree", dark: false },
        ].map((l) => (
          <Box key={l.label} sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: l.color, borderRadius: 0.5 }} />
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem" }}>
              {l.label}
            </Typography>
          </Box>
        ))}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
          <Box sx={{ width: 10, height: 10, bgcolor: "#d4882a", borderRadius: "50%" }} />
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem" }}>
            Microtonal (quarter-tone)
          </Typography>
        </Box>
      </Box>

      {/* Note detail row (hover) */}
      <Box
        sx={{
          minHeight: 44,
          p: 1.25,
          bgcolor: "background.default",
          border: "1px solid",
          borderColor: hoveredNote ? "rgba(201,169,110,0.35)" : "divider",
          borderRadius: 1,
          transition: "border-color 0.15s",
        }}
      >
        {hoveredNote ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label={hoveredNote.degree}
              size="small"
              sx={{
                bgcolor: `${hoveredNote.intervalInfo.color}22`,
                color: hoveredNote.intervalInfo.color,
                fontWeight: 700,
                fontFamily: "'Ubuntu Mono', monospace",
                height: 20,
                fontSize: "0.7rem",
              }}
            />
            <Typography sx={{ color: "primary.light", fontFamily: "'Ubuntu Mono', monospace", fontSize: "0.8rem", fontWeight: 600 }}>
              {hoveredNote.noteName}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {hoveredNote.cents}¢ from root
            </Typography>
            <Chip
              label={hoveredNote.intervalInfo.label}
              size="small"
              variant="outlined"
              sx={{ height: 18, fontSize: "0.6rem", borderColor: hoveredNote.intervalInfo.color, color: hoveredNote.intervalInfo.color }}
            />
            {hoveredNote.pos && (
              <Typography variant="caption" sx={{ color: "primary.main", fontFamily: "'Ubuntu Mono', monospace" }}>
                String {hoveredNote.pos.string + 1}, Fret {hoveredNote.pos.fret}
              </Typography>
            )}
            {hoveredNote.micro && (
              <Chip label="¼-tone" size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "rgba(212,136,42,0.15)", color: "warning.main" }} />
            )}
            {hoveredNote.isRoot && (
              <Chip label="Tonic" size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "rgba(232,200,122,0.15)", color: "#e8c87a" }} />
            )}
            {hoveredNote.isDominant && (
              <Chip label="Dominant" size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "rgba(201,169,110,0.15)", color: "primary.main" }} />
            )}
            {hoveredNote.isCharacteristic && !hoveredNote.isRoot && !hoveredNote.isDominant && (
              <Chip label="Characteristic ★" size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "rgba(212,136,42,0.15)", color: "warning.main" }} />
            )}
            {hoveredNote.alts.length > 0 && (
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem" }}>
                Alt: {hoveredNote.alts.map(a => `S${a.string + 1}F${a.fret}`).join(", ")}
              </Typography>
            )}
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
            Hover over a fret number to see note details
          </Typography>
        )}
      </Box>

      {/* Full scale table */}
      <Box sx={{ mt: 1.5, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
        {scaleNotes.map((n, i) => (
          <Box
            key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            sx={{
              display: "flex", flexDirection: "column", alignItems: "center",
              px: 0.75, py: 0.5,
              borderRadius: 1,
              border: "1px solid",
              borderColor: hoveredIdx === i ? n.intervalInfo.color : (n.isRoot || n.isDominant || n.isCharacteristic) ? `${n.intervalInfo.color}55` : "divider",
              bgcolor: hoveredIdx === i ? `${n.intervalInfo.color}18` : "background.default",
              cursor: "default",
              transition: "all 0.1s",
              minWidth: 38,
            }}
          >
            <Typography sx={{ fontSize: "0.6rem", color: "text.secondary", lineHeight: 1 }}>{n.degree}</Typography>
            <Typography sx={{ fontSize: "0.75rem", fontFamily: "'Ubuntu Mono', monospace", fontWeight: 700, color: n.intervalInfo.color, lineHeight: 1.2 }}>
              {n.noteName.replace(/\d/, "")}
            </Typography>
            <Typography sx={{ fontSize: "0.55rem", color: "text.secondary", lineHeight: 1 }}>{n.cents}¢</Typography>
            {n.pos && (
              <Typography sx={{ fontSize: "0.55rem", color: "primary.main", fontFamily: "'Ubuntu Mono', monospace", lineHeight: 1.3 }}>
                S{n.pos.string + 1} F{n.pos.fret}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

import { useState, useMemo, useCallback, useRef } from "react";
import { Box, Typography, Chip, Tooltip, IconButton } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import { INSTRUMENTS, getAllPositions } from "../utils/instruments";
import { playNote, playScale } from "../utils/audioEngine";

// ── Constants ─────────────────────────────────────────────────────────────────

const ROOT_OPTIONS = [
  { label: "C",  midi: 48 }, { label: "C#", midi: 49 },
  { label: "D",  midi: 50 }, { label: "Eb", midi: 51 },
  { label: "E",  midi: 52 }, { label: "F",  midi: 53 },
  { label: "F#", midi: 54 }, { label: "G",  midi: 55 },
  { label: "Ab", midi: 56 }, { label: "A",  midi: 57 },
  { label: "Bb", midi: 58 }, { label: "B",  midi: 59 },
];

const DEGREE_NAMES  = ["I","II","III","IV","V","VI","VII","VIII"];
const DIATONIC_LETTERS = ["C","D","E","F","G","A","B"];
const LETTER_CHROMA    = [0, 2, 4, 5, 7, 9, 11];

// Role → colour
const ROLE_COLOR = {
  root:           "#e8c87a",
  dominant:       "#d4882a",
  characteristic: "#6ab04c",
  leading:        "#5a8fa0",
  other:          "#4a6080",
};
const ROLE_LABEL = {
  root: "Ρίζα", dominant: "Δεσπόζουσα",
  characteristic: "Χαρακτηριστική", leading: "Οδηγός", other: "Κλίμακα",
};

// ── Note naming (floor rule) ──────────────────────────────────────────────────
function noteNameForDegree(rootMidi, cents, degIdx) {
  const rootChroma = rootMidi % 12;
  const rootLetter = LETTER_CHROMA.reduce((best, v, i) =>
    Math.abs(((v - rootChroma + 12) % 12)) < Math.abs(((LETTER_CHROMA[best] - rootChroma + 12) % 12)) ? i : best, 0);
  const letterIdx  = (rootLetter + degIdx) % 7;
  const letterName = DIATONIC_LETTERS[letterIdx];
  const letterChroma = LETTER_CHROMA[letterIdx];
  const targetChroma = (rootChroma + Math.floor(cents / 100)) % 12;
  let diff = ((targetChroma - letterChroma + 12) % 12);
  if (diff > 6) diff -= 12;
  const acc = diff === -2 ? "𝄫" : diff === -1 ? "♭" : diff === 1 ? "#" : diff === 2 ? "𝄪" : "";
  const micro = cents % 100;
  const microStr = micro === 50 ? "↑" : micro > 0 ? `+${micro}¢` : "";
  return { display: letterName + acc + microStr, letter: letterName, acc, micro };
}

// ── Build full position map ───────────────────────────────────────────────────
// Returns array of { degree, cents, noteName, role, positions: [{string,fret,centsOff}] }
function buildAllPositions(maqam, rootMidi, tuning, instrument) {
  const fretPositions = INSTRUMENTS[instrument].fretPositions;
  const TOLERANCE = 30;
  const characteristicSet = new Set(maqam.characteristic || []);

  return maqam.intervals.map((cents, degIdx) => {
    const midiFloat = rootMidi + cents / 100;
    const nameInfo  = noteNameForDegree(rootMidi, cents, degIdx);

    // Determine role
    let role = "other";
    if (degIdx === 0 || degIdx === maqam.intervals.length - 1) role = "root";
    else if (cents === (maqam.dominant || 700)) role = "dominant";
    else if (characteristicSet.has(cents)) role = "characteristic";
    else if (cents === (maqam.leading || 1100)) role = "leading";

    // Find ALL positions across ALL strings and ALL frets
    const positions = [];
    for (let sIdx = 0; sIdx < tuning.strings.length; sIdx++) {
      const openMidi = tuning.strings[sIdx].midi;
      const centsFromOpen = (midiFloat - openMidi) * 100;
      if (centsFromOpen < -TOLERANCE || centsFromOpen > 1250) continue;
      for (let fIdx = 0; fIdx < fretPositions.length; fIdx++) {
        const diff = Math.abs(fretPositions[fIdx] - centsFromOpen);
        if (diff <= TOLERANCE) {
          positions.push({ string: sIdx, fret: fIdx, centsOff: centsFromOpen - fretPositions[fIdx] });
        }
      }
    }
    // Sort: first by fret, then by string
    positions.sort((a, b) => a.fret !== b.fret ? a.fret - b.fret : a.string - b.string);

    return {
      degIdx, cents,
      noteName: nameInfo.display,
      degree: DEGREE_NAMES[degIdx] || String(degIdx + 1),
      role, positions,
      isRoot: role === "root",
      isDominant: role === "dominant",
      isCharacteristic: role === "characteristic",
    };
  });
}

// ── Fretboard SVG ─────────────────────────────────────────────────────────────
// Shows the full neck with all scale degree dots
const FRET_COUNT = 13;   // frets 0–12
const S_GAP  = 30;       // pixels between strings
const F_W    = 48;       // fret slot width
const LEFT   = 48;       // left pad (string labels)
const TOP    = 28;       // top pad (fret numbers)
const NUT_W  = 7;
const BOT    = 24;

function FretboardSVG({ scaleNotes, tuning, instrument, highlightDeg, onDotHover, onDotClick }) {
  const nStr = tuning.strings.length;
  const W = LEFT + NUT_W + FRET_COUNT * F_W + 24;
  const H = TOP + (nStr - 1) * S_GAP + BOT;

  const sy  = (s) => TOP + s * S_GAP;
  const fx  = (f) => LEFT + NUT_W + f * F_W;       // left edge of fret slot
  const fcx = (f) => LEFT + NUT_W + (f - 0.5) * F_W; // center of fret slot (f≥1)
  const openX = LEFT + NUT_W;

  // Build dot map: key="s-f" → array of scaleNote entries (multiple degrees can share a fret)
  const dotMap = new Map();
  scaleNotes.forEach(n => {
    n.positions.forEach(p => {
      if (p.fret > 12) return;
      const k = `${p.string}-${p.fret}`;
      if (!dotMap.has(k)) dotMap.set(k, []);
      dotMap.get(k).push({ ...n, fret: p.fret, string: p.string });
    });
  });

  // Fret markers
  const MARKERS = [3, 5, 7, 9, 12];

  return (
    <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
      <rect width={W} height={H} fill="#080603" rx="3" />

      {/* Fret position markers */}
      {MARKERS.map(f => (
        <circle key={f} cx={fx(f) + F_W / 2} cy={H / 2}
          r={f === 12 ? 4 : 3.5} fill="rgba(201,169,110,0.1)" />
      ))}
      {/* Double dot at 12 */}
      <circle cx={fx(12) + F_W / 2} cy={TOP + S_GAP * 0.8}
        r={3} fill="rgba(201,169,110,0.08)" />

      {/* Fret wires */}
      {Array.from({ length: FRET_COUNT + 1 }, (_, f) => (
        <line key={f} x1={fx(f)} y1={TOP - 6} x2={fx(f)} y2={TOP + (nStr - 1) * S_GAP + 6}
          stroke={f === 0 ? "rgba(201,169,110,0.12)" : "#1e1a12"}
          strokeWidth={f === 0 ? 0.5 : 1.8} />
      ))}

      {/* Nut */}
      <rect x={LEFT} y={TOP - 6} width={NUT_W} height={(nStr - 1) * S_GAP + 12}
        fill="#7a5c10" rx="1" />

      {/* String lines */}
      {tuning.strings.map((s, sIdx) => (
        <line key={sIdx}
          x1={openX} y1={sy(sIdx)} x2={fx(FRET_COUNT)} y2={sy(sIdx)}
          stroke="rgba(201,169,110,0.28)" strokeWidth={0.9} />
      ))}

      {/* String name labels */}
      {tuning.strings.map((s, sIdx) => (
        <text key={sIdx} x={LEFT - 5} y={sy(sIdx) + 4}
          textAnchor="end" fontSize="9" fontFamily="'Ubuntu Mono',monospace"
          fill="rgba(201,169,110,0.45)">{s.name}</text>
      ))}

      {/* Fret number labels */}
      {Array.from({ length: FRET_COUNT }, (_, f) => (
        <text key={f} x={fx(f) + F_W / 2} y={TOP - 12}
          textAnchor="middle" fontSize="8" fontFamily="'Ubuntu Mono',monospace"
          fill="rgba(201,169,110,0.25)">{f + 1}</text>
      ))}

      {/* Open string label */}
      <text x={openX - F_W * 0.3} y={TOP - 12}
        textAnchor="middle" fontSize="8" fontFamily="'Ubuntu Mono',monospace"
        fill="rgba(201,169,110,0.25)">0</text>

      {/* Scale dots */}
      {Array.from(dotMap.entries()).map(([key, entries]) => {
        // If multiple degrees on same fret/string, show the highest-priority one
        const priority = { root: 0, dominant: 1, characteristic: 2, leading: 3, other: 4 };
        const n = entries.sort((a, b) => priority[a.role] - priority[b.role])[0];
        const multi = entries.length > 1;
        const { string: sIdx, fret } = n;
        const color = ROLE_COLOR[n.role];
        const dimmed = highlightDeg !== null && highlightDeg !== n.degIdx;
        const isRoot = n.role === "root";

        const cx = fret === 0 ? openX - F_W * 0.3 : fx(fret) + F_W / 2;
        const cy = sy(sIdx);
        const r = isRoot ? 12 : 10;

        return (
          <g key={key} style={{ cursor: "pointer" }}
            onMouseEnter={() => onDotHover(n.degIdx, fret, sIdx)}
            onMouseLeave={() => onDotHover(null, null, null)}
            onClick={() => onDotClick(n)}>
            {/* Root ring */}
            {isRoot && !dimmed && (
              <circle cx={cx} cy={cy} r={r + 3.5}
                fill="none" stroke={color} strokeWidth="1" opacity="0.35" />
            )}
            <circle cx={cx} cy={cy} r={r}
              fill={dimmed ? `${color}18` : `${color}e8`}
              stroke={color} strokeWidth={dimmed ? 0.4 : isRoot ? 1.8 : 1}
            />
            {/* Degree label */}
            <text cx={cx} cy={cy} x={cx} y={cy + 3.5}
              textAnchor="middle" fontSize="7.5" fontWeight="bold"
              fontFamily="'Ubuntu Mono',monospace"
              fill={dimmed ? `${color}44` : isRoot ? "#0a0804" : "#ddd8cc"}>
              {n.degree}
            </text>
            {/* Multi-degree indicator */}
            {multi && !dimmed && (
              <circle cx={cx + r - 2} cy={cy - r + 2} r={3}
                fill="#c06060" stroke="#0a0804" strokeWidth="0.5" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Compact scale play helper ─────────────────────────────────────────────────
function buildPlayNotes(scaleNotes, rootMidi) {
  // Pick first available position per degree for playback
  return scaleNotes
    .filter(n => n.positions.length > 0)
    .map(n => ({
      midiFloat: rootMidi + n.cents / 100,
      time: 0,
      duration: 0.45,
    }));
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MaqamTablature({ maqam, tuning, instrument, audioMode = "auto" }) {
  const [rootMidi,    setRootMidi]    = useState(53); // F3 default
  const [highlightDeg, setHighlightDeg] = useState(null);
  const [hoveredInfo,  setHoveredInfo]  = useState(null); // { degIdx, fret, string }
  const [isPlaying,    setIsPlaying]    = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  const scaleNotes = useMemo(
    () => buildAllPositions(maqam, rootMidi, tuning, instrument),
    [maqam, rootMidi, tuning, instrument]
  );

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (audioRef.current) audioRef.current.close().catch(() => {});
      audioRef.current = null;
      setIsPlaying(false);
      return;
    }
    // Build play events from first position of each degree
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioRef.current = ctx;
    const now = ctx.currentTime;
    const dur = 0.42;
    const gap = 0.48;
    scaleNotes.forEach((n, i) => {
      playNote(ctx, rootMidi + n.cents / 100, now + i * gap, dur, instrument, audioMode);
    });
    setIsPlaying(true);
    timerRef.current = setTimeout(() => {
      setIsPlaying(false);
      audioRef.current = null;
    }, scaleNotes.length * gap * 1000 + 600);
  }, [isPlaying, scaleNotes, rootMidi, instrument, audioMode]);

  const handleDotHover = useCallback((degIdx, fret, string) => {
    setHighlightDeg(degIdx);
    setHoveredInfo(degIdx !== null ? { degIdx, fret, string } : null);
  }, []);

  const handleDotClick = useCallback((note) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    playNote(ctx, rootMidi + note.cents / 100, ctx.currentTime, 0.8, instrument, audioMode);
  }, [rootMidi, instrument, audioMode]);

  // Hovered note details
  const hoveredNote = hoveredInfo ? scaleNotes[hoveredInfo.degIdx] : null;

  // Count total positions shown
  const totalDots = scaleNotes.reduce((s, n) => s + n.positions.length, 0);

  return (
    <Box>
      {/* ── Controls row ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        {/* Play button */}
        <Tooltip title={isPlaying ? "Stop" : "Αναπαραγωγή κλίμακας"}>
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

        {/* Root selector */}
        <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
          Root:
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4 }}>
          {ROOT_OPTIONS.map((r) => (
            <Box key={r.midi} onClick={() => setRootMidi(r.midi)} sx={{
              px: 0.75, py: 0.25, borderRadius: 0.5, border: "1px solid",
              borderColor: rootMidi === r.midi ? "primary.main" : "divider",
              bgcolor: rootMidi === r.midi ? "rgba(201,169,110,0.15)" : "background.default",
              color: rootMidi === r.midi ? "primary.main" : "text.secondary",
              fontSize: "0.65rem", fontFamily: "'Ubuntu Mono',monospace",
              fontWeight: rootMidi === r.midi ? 700 : 400,
              cursor: "pointer", transition: "all 0.12s",
              "&:hover": { borderColor: "primary.main", color: "primary.main" },
            }}>
              {r.label}
            </Box>
          ))}
        </Box>

        {/* Position count badge */}
        <Typography variant="caption" sx={{ color: "text.disabled", ml: "auto", fontSize: "0.58rem" }}>
          {totalDots} θέσεις · {tuning.name}
        </Typography>
      </Box>

      {/* ── Fretboard ── */}
      <Box sx={{
        bgcolor: "#080603", border: "1px solid", borderColor: "divider",
        borderRadius: 1, p: 1.5, mb: 1.5, overflowX: "auto",
      }}>
        <FretboardSVG
          scaleNotes={scaleNotes}
          tuning={tuning}
          instrument={instrument}
          highlightDeg={highlightDeg}
          onDotHover={handleDotHover}
          onDotClick={handleDotClick}
        />
      </Box>

      {/* ── Legend ── */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
        {Object.entries(ROLE_COLOR).map(([role, color]) => (
          <Box key={role} sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
            <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: color }} />
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem" }}>
              {ROLE_LABEL[role]}
            </Typography>
          </Box>
        ))}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
          <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#c06060" }} />
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem" }}>
            Πολλαπλοί βαθμοί
          </Typography>
        </Box>
      </Box>

      {/* ── Hovered note detail ── */}
      <Box sx={{
        minHeight: 44, p: 1.25, bgcolor: "background.default",
        border: "1px solid",
        borderColor: hoveredNote ? "rgba(201,169,110,0.35)" : "divider",
        borderRadius: 1, transition: "border-color 0.15s", mb: 1.5,
      }}>
        {hoveredNote ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Chip label={hoveredNote.degree} size="small" sx={{
              bgcolor: `${ROLE_COLOR[hoveredNote.role]}22`,
              color: ROLE_COLOR[hoveredNote.role],
              fontWeight: 700, fontFamily: "'Ubuntu Mono',monospace",
              height: 20, fontSize: "0.7rem",
            }} />
            <Typography sx={{
              color: "primary.light", fontFamily: "'Ubuntu Mono',monospace",
              fontSize: "0.8rem", fontWeight: 600,
            }}>
              {hoveredNote.noteName}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {hoveredNote.cents}¢
            </Typography>
            <Chip label={ROLE_LABEL[hoveredNote.role]} size="small" variant="outlined" sx={{
              height: 18, fontSize: "0.6rem",
              borderColor: ROLE_COLOR[hoveredNote.role],
              color: ROLE_COLOR[hoveredNote.role],
            }} />
            {hoveredInfo && (
              <Typography variant="caption" sx={{ color: "primary.main", fontFamily: "'Ubuntu Mono',monospace" }}>
                Χορδή {hoveredInfo.string + 1} · Τάστο {hoveredInfo.fret}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.58rem" }}>
              {hoveredNote.positions.length} θέσεις συνολικά
            </Typography>
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
            Κάνε hover σε μια θέση για λεπτομέρειες · κλικ για να ακούσεις τη νότα
          </Typography>
        )}
      </Box>

      {/* ── Per-degree position table ── */}
      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
        {scaleNotes.map((n, i) => {
          const color = ROLE_COLOR[n.role];
          const isHov = highlightDeg === n.degIdx;
          return (
            <Box key={i}
              onMouseEnter={() => setHighlightDeg(n.degIdx)}
              onMouseLeave={() => setHighlightDeg(null)}
              sx={{
                display: "flex", flexDirection: "column", alignItems: "center",
                px: 0.75, py: 0.5, borderRadius: 1, border: "1px solid",
                borderColor: isHov ? color : `${color}44`,
                bgcolor: isHov ? `${color}18` : "background.default",
                cursor: "default", transition: "all 0.1s", minWidth: 40,
              }}>
              <Typography sx={{ fontSize: "0.58rem", color: "text.secondary", lineHeight: 1 }}>
                {n.degree}
              </Typography>
              <Typography sx={{
                fontSize: "0.75rem", fontFamily: "'Ubuntu Mono',monospace",
                fontWeight: 700, color, lineHeight: 1.2,
              }}>
                {n.noteName.replace(/\d/, "")}
              </Typography>
              <Typography sx={{ fontSize: "0.52rem", color: "text.disabled", lineHeight: 1 }}>
                {n.cents}¢
              </Typography>
              <Typography sx={{
                fontSize: "0.52rem", color: "text.secondary",
                fontFamily: "'Ubuntu Mono',monospace", lineHeight: 1.2,
              }}>
                ×{n.positions.length}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

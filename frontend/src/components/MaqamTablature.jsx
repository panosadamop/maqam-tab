import { useState, useMemo, useCallback, useRef } from "react";
import { Box, Typography, Chip, Tooltip, IconButton } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import { INSTRUMENTS } from "../utils/instruments";
import { playNote } from "../utils/audioEngine";

// ── Root options (covering comfortable oud range) ─────────────────────────────
const ROOT_OPTIONS = [
  { label:"C",  midi:48 }, { label:"C#", midi:49 },
  { label:"D",  midi:50 }, { label:"Eb", midi:51 },
  { label:"E",  midi:52 }, { label:"F",  midi:53 },
  { label:"F#", midi:54 }, { label:"G",  midi:55 },
  { label:"Ab", midi:56 }, { label:"A",  midi:57 },
  { label:"Bb", midi:58 }, { label:"B",  midi:59 },
];

const DEGREE_NAMES = ["I","II","III","IV","V","VI","VII","VIII"];
const DIATONIC_LETTERS = ["C","D","E","F","G","A","B"];
const LETTER_CHROMA    = [0, 2, 4, 5, 7, 9, 11];

// Role colours
const ROLE = {
  root:           { color:"#e8c87a", label:"Ρίζα" },
  dominant:       { color:"#d4882a", label:"Δεσπόζουσα" },
  characteristic: { color:"#6ab04c", label:"Χαρακτηριστική" },
  leading:        { color:"#5a8fa0", label:"Οδηγός" },
  other:          { color:"#6070a0", label:"Κλίμακα" },
};

// ── Note naming ───────────────────────────────────────────────────────────────
function noteNameForDegree(rootMidi, cents, degIdx) {
  const rootChroma = rootMidi % 12;
  const rootLetter = LETTER_CHROMA.reduce((best, v, i) =>
    Math.abs(((v - rootChroma + 12) % 12)) < Math.abs(((LETTER_CHROMA[best] - rootChroma + 12) % 12)) ? i : best, 0);
  const letterIdx   = (rootLetter + degIdx) % 7;
  const letterChroma= LETTER_CHROMA[letterIdx];
  const targetChroma= (rootChroma + Math.floor(cents / 100)) % 12;
  let diff = ((targetChroma - letterChroma + 12) % 12);
  if (diff > 6) diff -= 12;
  const acc = diff === -2 ? "𝄫" : diff === -1 ? "♭" : diff === 1 ? "#" : diff === 2 ? "𝄪" : "";
  const micro = cents % 100;
  const mStr  = micro === 50 ? "↑" : micro > 0 ? `+${micro}¢` : "";
  return DIATONIC_LETTERS[letterIdx] + acc + mStr;
}

// ── Build degree map with ALL positions ───────────────────────────────────────
function buildDegrees(maqam, rootMidi, tuning, instrument) {
  const fps  = INSTRUMENTS[instrument]?.fretPositions || [];
  const TOL  = 30;
  const charSet = new Set(maqam.characteristic || []);

  return maqam.intervals.map((cents, degIdx) => {
    const midiFloat = rootMidi + cents / 100;
    const noteName  = noteNameForDegree(rootMidi, cents, degIdx);

    let role = "other";
    if (degIdx === 0 || cents === 1200) role = "root";
    else if (cents === (maqam.dominant ?? 700)) role = "dominant";
    else if (charSet.has(cents)) role = "characteristic";
    else if (cents === (maqam.leading ?? 1100)) role = "leading";

    const positions = [];
    for (let s = 0; s < tuning.strings.length; s++) {
      const openMidi = tuning.strings[s].midi;
      const cFromOpen = (midiFloat - openMidi) * 100;
      if (cFromOpen < -TOL || cFromOpen > fps[fps.length - 1] + TOL) continue;
      for (let f = 0; f < fps.length; f++) {
        if (Math.abs(fps[f] - cFromOpen) <= TOL) {
          positions.push({ string: s, fret: f });
        }
      }
    }

    return {
      degIdx, cents, noteName,
      degree: DEGREE_NAMES[degIdx] ?? String(degIdx + 1),
      role, positions,
    };
  });
}

// ── Single Fretboard SVG ──────────────────────────────────────────────────────
// fretStart..fretEnd inclusive on x-axis; all strings on y-axis
// shows only dots in that fret range
const S_GAP = 32;   // vertical gap between strings
const F_W   = 46;   // fret slot width
const L_PAD = 46;   // left pad for string names
const T_PAD = 28;   // top pad for fret numbers
const B_PAD = 8;
const NUT_W = 8;
const MARKERS = [3, 5, 7, 9, 12];

function PositionFretboard({
  label, fretStart, fretEnd, degrees, tuning, highlightDeg,
  onDotEnter, onDotLeave, onDotClick,
}) {
  const nStr  = tuning.strings.length;
  const nFret = fretEnd - fretStart + 1;   // number of visible fret slots
  const W     = L_PAD + NUT_W + nFret * F_W + 16;
  const H     = T_PAD + (nStr - 1) * S_GAP + B_PAD;

  const sy  = s => T_PAD + s * S_GAP;
  const fcx = f => L_PAD + NUT_W + (f - fretStart + 0.5) * F_W;
  // open string (fret 0) sits left of nut
  const openX = L_PAD + NUT_W * 0.5;

  // Build dot map
  const dotMap = new Map();
  degrees.forEach(deg => {
    deg.positions.forEach(p => {
      const fret = p.fret;
      // fret 0 shows only in open position; integer frets in their range
      const show = fret === 0
        ? fretStart === 0
        : fret >= fretStart && fret <= fretEnd;
      if (!show) return;
      const k = `${p.string}-${fret}`;
      if (!dotMap.has(k)) dotMap.set(k, []);
      dotMap.get(k).push({ ...deg, fret, string: p.string });
    });
  });

  const priority = { root:0, dominant:1, characteristic:2, leading:3, other:4 };

  return (
    <Box>
      <Typography sx={{
        fontSize:"0.6rem", fontWeight:600, letterSpacing:"0.1em",
        textTransform:"uppercase", color:"rgba(201,169,110,0.4)",
        mb:0.5, pl:`${L_PAD + NUT_W}px`,
      }}>
        {label}
      </Typography>
      <Box sx={{ overflowX:"auto" }}>
        <svg width={W} height={H} style={{ display:"block", overflow:"visible" }}>
          <rect width={W} height={H} fill="#070604" rx="3"/>

          {/* Fret position markers */}
          {MARKERS.filter(m => m >= fretStart && m <= fretEnd).map(m => (
            <circle key={m}
              cx={fcx(m)} cy={H / 2}
              r={m === 12 ? 4 : 3.5}
              fill="rgba(201,169,110,0.09)"/>
          ))}

          {/* Fret wires */}
          {Array.from({ length: nFret + 1 }, (_, i) => {
            const fret = fretStart + i;
            const x    = fret === 0
              ? L_PAD + NUT_W         // right edge of nut area
              : L_PAD + NUT_W + i * F_W;
            return (
              <line key={fret}
                x1={x} y1={T_PAD - 5}
                x2={x} y2={T_PAD + (nStr - 1) * S_GAP + 5}
                stroke="#1a1610" strokeWidth={i === 0 ? 0.5 : 1.6}/>
            );
          })}

          {/* Nut (only in open/first position) */}
          {fretStart === 0 && (
            <rect x={L_PAD} y={T_PAD - 5} width={NUT_W}
              height={(nStr - 1) * S_GAP + 10}
              fill="#7a5c10" rx="1"/>
          )}
          {/* Bracket line when no nut */}
          {fretStart > 0 && (
            <line x1={L_PAD + NUT_W} y1={T_PAD - 5}
              x2={L_PAD + NUT_W} y2={T_PAD + (nStr - 1) * S_GAP + 5}
              stroke="rgba(201,169,110,0.25)" strokeWidth="2.5"/>
          )}

          {/* Strings */}
          {tuning.strings.map((s, si) => (
            <line key={si}
              x1={fretStart === 0 ? L_PAD + NUT_W : L_PAD + NUT_W}
              y1={sy(si)}
              x2={L_PAD + NUT_W + nFret * F_W}
              y2={sy(si)}
              stroke="rgba(201,169,110,0.25)" strokeWidth="0.9"/>
          ))}

          {/* String labels */}
          {tuning.strings.map((s, si) => (
            <text key={si} x={L_PAD - 4} y={sy(si) + 4}
              textAnchor="end" fontSize="9"
              fontFamily="'Ubuntu', sans-serif"
              fill="rgba(201,169,110,0.4)">{s.name}</text>
          ))}

          {/* Fret number labels */}
          {Array.from({ length: nFret }, (_, i) => {
            const fret = fretStart + i + 1;
            if (fret > fretEnd) return null;
            return (
              <text key={fret}
                x={L_PAD + NUT_W + i * F_W + F_W / 2}
                y={T_PAD - 12}
                textAnchor="middle" fontSize="8"
                fontFamily="'Ubuntu Mono', monospace"
                fill="rgba(201,169,110,0.22)">{fret}</text>
            );
          })}

          {/* "0" label for open strings */}
          {fretStart === 0 && (
            <text x={openX} y={T_PAD - 12}
              textAnchor="middle" fontSize="8"
              fontFamily="'Ubuntu Mono', monospace"
              fill="rgba(201,169,110,0.22)">0</text>
          )}

          {/* Dots */}
          {Array.from(dotMap.entries()).map(([key, entries]) => {
            entries.sort((a, b) => priority[a.role] - priority[b.role]);
            const n     = entries[0];
            const multi = entries.length > 1;
            const { fret, string: si } = n;
            const { color } = ROLE[n.role] ?? ROLE.other;
            const dimmed = highlightDeg !== null && highlightDeg !== n.degIdx;
            const isRoot = n.role === "root";
            const cx = fret === 0 ? openX : fcx(fret);
            const cy = sy(si);
            const r  = isRoot ? 13 : 11;

            return (
              <g key={key} style={{ cursor:"pointer" }}
                onMouseEnter={() => onDotEnter(n.degIdx, fret, si)}
                onMouseLeave={onDotLeave}
                onClick={() => onDotClick(n)}>
                {isRoot && !dimmed && (
                  <circle cx={cx} cy={cy} r={r + 4}
                    fill="none" stroke={color} strokeWidth="1" opacity="0.3"/>
                )}
                <circle cx={cx} cy={cy} r={r}
                  fill={dimmed ? `${color}14` : `${color}e0`}
                  stroke={color}
                  strokeWidth={dimmed ? 0.3 : isRoot ? 1.8 : 1}/>
                <text x={cx} y={cy + 4}
                  textAnchor="middle" fontSize="7.5" fontWeight="700"
                  fontFamily="'Ubuntu', sans-serif"
                  fill={dimmed ? `${color}30` : isRoot ? "#0a0804" : "#ddd8cc"}>
                  {n.degree}
                </text>
                {multi && !dimmed && (
                  <circle cx={cx + r - 1} cy={cy - r + 1} r="3"
                    fill="#c06060" stroke="#070604" strokeWidth="0.5"/>
                )}
              </g>
            );
          })}
        </svg>
      </Box>
    </Box>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MaqamTablature({ maqam, tuning, instrument, audioMode = "auto" }) {
  const [rootMidi,     setRootMidi]    = useState(53);  // F default
  const [highlightDeg, setHighlightDeg] = useState(null);
  const [hoveredInfo,  setHoveredInfo]  = useState(null);
  const [isPlaying,    setIsPlaying]   = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  const degrees = useMemo(
    () => buildDegrees(maqam, rootMidi, tuning, instrument),
    [maqam, rootMidi, tuning, instrument]
  );

  // Total positions across neck
  const totalDots = degrees.reduce((s, d) => s + d.positions.length, 0);

  // Define neck positions
  const fretMax = Math.min(
    INSTRUMENTS[instrument]?.fretPositions?.length - 1 ?? 24,
    24
  );
  const POSITIONS = [
    { id: "open",   label: "Θέση 0 — Ανοιχτές",  fretStart: 0, fretEnd: 4 },
    { id: "mid",    label: "Θέση 1 — Μεσαία",     fretStart: 5, fretEnd: 9 },
    { id: "upper",  label: "Θέση 2 — Άνω",         fretStart: 10, fretEnd: Math.min(14, fretMax) },
  ].filter(p => p.fretStart <= fretMax);

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (audioRef.current) { audioRef.current.close().catch(() => {}); audioRef.current = null; }
      setIsPlaying(false);
      return;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioRef.current = ctx;
    const now = ctx.currentTime;
    const gap = 0.46;
    degrees.forEach((d, i) => {
      playNote(ctx, rootMidi + d.cents / 100, now + i * gap, 0.4, instrument, audioMode);
    });
    setIsPlaying(true);
    timerRef.current = setTimeout(() => {
      setIsPlaying(false);
      audioRef.current = null;
    }, degrees.length * gap * 1000 + 600);
  }, [isPlaying, degrees, rootMidi, instrument, audioMode]);

  const handleDotEnter = useCallback((degIdx, fret, string) => {
    setHighlightDeg(degIdx);
    setHoveredInfo({ degIdx, fret, string });
  }, []);
  const handleDotLeave = useCallback(() => {
    setHighlightDeg(null);
    setHoveredInfo(null);
  }, []);
  const handleDotClick = useCallback((deg) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    playNote(ctx, rootMidi + deg.cents / 100, ctx.currentTime, 0.75, instrument, audioMode);
  }, [rootMidi, instrument, audioMode]);

  const hoveredDeg = hoveredInfo ? degrees[hoveredInfo.degIdx] : null;

  return (
    <Box>

      {/* ── Controls ── */}
      <Box sx={{ display:"flex", alignItems:"center", gap:1.5, mb:2, flexWrap:"wrap" }}>

        {/* Play */}
        <Tooltip title={isPlaying ? "Stop" : "Αναπαραγωγή κλίμακας"}>
          <IconButton size="small" onClick={handlePlay} sx={{
            bgcolor: isPlaying ? "rgba(192,57,43,0.12)" : "rgba(74,138,90,0.12)",
            color:   isPlaying ? "error.main" : "success.main",
            border:  "1px solid",
            borderColor: isPlaying ? "error.dark" : "success.dark",
            flexShrink: 0,
            "&:hover":{ bgcolor: isPlaying?"rgba(192,57,43,0.22)":"rgba(74,138,90,0.22)" },
          }}>
            {isPlaying
              ? <StopIcon sx={{ fontSize:14 }}/>
              : <PlayArrowIcon sx={{ fontSize:14 }}/>}
          </IconButton>
        </Tooltip>

        <Typography variant="caption" sx={{ color:"text.secondary", whiteSpace:"nowrap", fontSize:"0.68rem" }}>
          Root:
        </Typography>

        {/* Root buttons */}
        <Box sx={{ display:"flex", flexWrap:"wrap", gap:0.4 }}>
          {ROOT_OPTIONS.map(r => (
            <Box key={r.midi} onClick={() => setRootMidi(r.midi)} sx={{
              px:0.75, py:0.25, borderRadius:0.5, border:"1px solid", cursor:"pointer",
              transition:"all 0.12s",
              borderColor: rootMidi===r.midi ? "primary.main" : "divider",
              bgcolor:     rootMidi===r.midi ? "rgba(201,169,110,0.15)" : "background.default",
              color:       rootMidi===r.midi ? "primary.main" : "text.secondary",
              fontSize:"0.64rem", fontWeight: rootMidi===r.midi?700:400,
              fontFamily:"'Ubuntu Mono', monospace",
              "&:hover":{ borderColor:"primary.main", color:"primary.main" },
            }}>{r.label}</Box>
          ))}
        </Box>

        <Typography variant="caption" sx={{ color:"text.disabled", ml:"auto", fontSize:"0.58rem", whiteSpace:"nowrap" }}>
          {totalDots} θέσεις · {tuning.name}
        </Typography>
      </Box>

      {/* ── Three position fretboards ── */}
      <Box sx={{ display:"flex", flexDirection:"column", gap:2.5, mb:2 }}>
        {POSITIONS.map(pos => (
          <PositionFretboard
            key={pos.id}
            label={pos.label}
            fretStart={pos.fretStart}
            fretEnd={pos.fretEnd}
            degrees={degrees}
            tuning={tuning}
            highlightDeg={highlightDeg}
            onDotEnter={handleDotEnter}
            onDotLeave={handleDotLeave}
            onDotClick={handleDotClick}
          />
        ))}
      </Box>

      {/* ── Legend ── */}
      <Box sx={{ display:"flex", gap:1.25, flexWrap:"wrap", mb:1.5 }}>
        {Object.entries(ROLE).map(([role, { color, label }]) => (
          <Box key={role} sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
            <Box sx={{ width:9, height:9, borderRadius:"50%", bgcolor:color }}/>
            <Typography variant="caption" sx={{ color:"text.secondary", fontSize:"0.62rem" }}>
              {label}
            </Typography>
          </Box>
        ))}
        <Box sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
          <Box sx={{ width:7, height:7, borderRadius:"50%", bgcolor:"#c06060" }}/>
          <Typography variant="caption" sx={{ color:"text.secondary", fontSize:"0.62rem" }}>
            Πολλαπλοί βαθμοί
          </Typography>
        </Box>
      </Box>

      {/* ── Hover detail ── */}
      <Box sx={{
        minHeight:42, p:1.25, bgcolor:"background.default",
        border:"1px solid",
        borderColor: hoveredDeg ? "rgba(201,169,110,0.35)" : "divider",
        borderRadius:1, transition:"border-color 0.15s", mb:1.5,
      }}>
        {hoveredDeg ? (
          <Box sx={{ display:"flex", alignItems:"center", gap:1, flexWrap:"wrap" }}>
            <Chip label={hoveredDeg.degree} size="small" sx={{
              bgcolor:`${ROLE[hoveredDeg.role].color}22`,
              color: ROLE[hoveredDeg.role].color,
              fontWeight:700, height:20, fontSize:"0.68rem",
            }}/>
            <Typography sx={{
              color:"primary.light",
              fontFamily:"'Ubuntu Mono', monospace",
              fontSize:"0.82rem", fontWeight:600,
            }}>
              {hoveredDeg.noteName}
            </Typography>
            <Typography variant="caption" sx={{ color:"text.secondary", fontSize:"0.65rem" }}>
              {hoveredDeg.cents}¢
            </Typography>
            <Chip label={ROLE[hoveredDeg.role].label} size="small" variant="outlined" sx={{
              height:18, fontSize:"0.6rem",
              borderColor: ROLE[hoveredDeg.role].color,
              color: ROLE[hoveredDeg.role].color,
            }}/>
            {hoveredInfo && (
              <Typography variant="caption" sx={{ color:"primary.main", fontFamily:"'Ubuntu Mono',monospace", fontSize:"0.65rem" }}>
                Χορδή {hoveredInfo.string + 1} · Τάστο {hoveredInfo.fret}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color:"text.disabled", fontSize:"0.58rem" }}>
              {hoveredDeg.positions.length} θέσεις συνολικά
            </Typography>
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color:"text.secondary", fontStyle:"italic", fontSize:"0.65rem" }}>
            Hover → λεπτομέρειες · κλικ → άκουσε τη νότα
          </Typography>
        )}
      </Box>

      {/* ── Degree grid ── */}
      <Box sx={{ display:"flex", gap:0.5, flexWrap:"wrap" }}>
        {degrees.map((d, i) => {
          const { color } = ROLE[d.role] ?? ROLE.other;
          const isHov = highlightDeg === d.degIdx;
          return (
            <Box key={i}
              onMouseEnter={() => setHighlightDeg(d.degIdx)}
              onMouseLeave={() => setHighlightDeg(null)}
              sx={{
                display:"flex", flexDirection:"column", alignItems:"center",
                px:0.75, py:0.4, borderRadius:0.75, border:"1px solid",
                borderColor: isHov ? color : `${color}38`,
                bgcolor:     isHov ? `${color}18` : "background.default",
                cursor:"default", transition:"all 0.1s", minWidth:40,
              }}>
              <Typography sx={{ fontSize:"0.56rem", color:"text.secondary", lineHeight:1 }}>
                {d.degree}
              </Typography>
              <Typography sx={{
                fontSize:"0.74rem", fontFamily:"'Ubuntu Mono', monospace",
                fontWeight:700, color, lineHeight:1.3,
              }}>
                {d.noteName.replace(/\d/,"")}
              </Typography>
              <Typography sx={{ fontSize:"0.52rem", color:"text.disabled", lineHeight:1 }}>
                {d.cents}¢
              </Typography>
              <Typography sx={{
                fontSize:"0.52rem", color:"text.secondary",
                fontFamily:"'Ubuntu Mono',monospace", lineHeight:1.2,
              }}>
                ×{d.positions.length}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

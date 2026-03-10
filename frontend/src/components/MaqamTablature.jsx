import { useState, useMemo, useCallback, useRef } from "react";
import { Box, Typography, Chip, Tooltip, IconButton } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import { INSTRUMENTS } from "../utils/instruments";
import { playNote } from "../utils/audioEngine";

// ── Root options ──────────────────────────────────────────────────────────────
const ROOT_OPTIONS = [
  { label:"C",  midi:48 },{ label:"C#", midi:49 },
  { label:"D",  midi:50 },{ label:"Eb", midi:51 },
  { label:"E",  midi:52 },{ label:"F",  midi:53 },
  { label:"F#", midi:54 },{ label:"G",  midi:55 },
  { label:"Ab", midi:56 },{ label:"A",  midi:57 },
  { label:"Bb", midi:58 },{ label:"B",  midi:59 },
];

const DEGREE_NAMES   = ["I","II","III","IV","V","VI","VII","VIII"];
const DIATONIC_LTRS  = ["C","D","E","F","G","A","B"];
const LETTER_CHROMA  = [0,2,4,5,7,9,11];

const ROLE = {
  root:           { color:"#e8c87a", label:"Ρίζα" },
  dominant:       { color:"#d4882a", label:"Δεσπόζουσα" },
  characteristic: { color:"#6ab04c", label:"Χαρακτηριστική" },
  leading:        { color:"#5a8fa0", label:"Οδηγός" },
  other:          { color:"#6070a0", label:"Κλίμακα" },
};
const PRIORITY = { root:0, dominant:1, characteristic:2, leading:3, other:4 };

// ── Note naming (floor rule) ──────────────────────────────────────────────────
function noteName(rootMidi, cents, degIdx) {
  const rc   = rootMidi % 12;
  const rl   = LETTER_CHROMA.reduce((b,v,i) =>
    Math.abs(((v-rc+12)%12)) < Math.abs(((LETTER_CHROMA[b]-rc+12)%12)) ? i : b, 0);
  const li   = (rl + degIdx) % 7;
  const lc   = LETTER_CHROMA[li];
  const tc   = (rc + Math.floor(cents/100)) % 12;
  let d      = ((tc - lc + 12) % 12); if (d>6) d-=12;
  const acc  = d===-2?"𝄫":d===-1?"♭":d===1?"#":d===2?"𝄪":"";
  const micro= cents % 100;
  return DIATONIC_LTRS[li] + acc + (micro===50?"↑":micro>0?`+${micro}¢`:"");
}

// ── Build ALL positions for every scale degree ────────────────────────────────
// Returns [{degIdx,cents,noteName,degree,role,positions:[{string,fretIdx,centsOnString}]}]
function buildDegrees(maqam, rootMidi, tuning, instrument) {
  const inst   = INSTRUMENTS[instrument];
  const fps    = inst?.fretPositions ?? [];
  const TOL    = 35;                         // ¢ tolerance
  const charSet= new Set(maqam.characteristic ?? []);

  return maqam.intervals.map((cents, degIdx) => {
    const midiFloat = rootMidi + cents / 100;

    let role = "other";
    if (degIdx === 0 || cents === 1200) role = "root";
    else if (cents === (maqam.dominant ?? 700)) role = "dominant";
    else if (charSet.has(cents)) role = "characteristic";
    else if (cents === (maqam.leading ?? 1100)) role = "leading";

    const positions = [];
    for (let s = 0; s < tuning.strings.length; s++) {
      const openMidi = tuning.strings[s].midi;
      const cFromOpen = (midiFloat - openMidi) * 100;          // cents above open string
      if (cFromOpen < -TOL || cFromOpen > (fps[fps.length-1] ?? 1200) + TOL) continue;
      for (let f = 0; f < fps.length; f++) {
        if (Math.abs(fps[f] - cFromOpen) <= TOL) {
          positions.push({ string: s, fretIdx: f, centsOnString: fps[f] });
        }
      }
    }

    return {
      degIdx, cents,
      noteName: noteName(rootMidi, cents, degIdx),
      degree: DEGREE_NAMES[degIdx] ?? String(degIdx+1),
      role, positions,
    };
  });
}

// ── Layout constants ──────────────────────────────────────────────────────────
const S_GAP = 34;    // px between strings (vertical)
const F_W   = 48;    // px per fret slot
const L_PAD = 48;    // left pad (string name labels)
const T_PAD = 30;    // top pad (fret numbers)
const B_PAD = 10;
const NUT_W = 9;
const MARKERS = new Set([3,5,7,9,12,15,17]);

// ── Fretboard SVG component ───────────────────────────────────────────────────
// Shows frets [idxStart … idxEnd] (quarter-tone indices into fps array)
// with all matching dots across ALL strings
function Fretboard({
  label, idxStart, idxEnd, degrees, tuning, fretLabels,
  highlightDeg, onEnter, onLeave, onClick,
}) {
  const nStr   = tuning.strings.length;
  const nSlots = idxEnd - idxStart;          // number of fret SLOTS to draw
  const W      = L_PAD + NUT_W + nSlots * F_W + 20;
  const H      = T_PAD + (nStr - 1) * S_GAP + B_PAD;

  // x-center of a fret slot: slot i (0-based from display start) shows the note
  // that lives BETWEEN wire i and wire i+1
  // fretIdx f occupies slot (f - idxStart) for f >= 1
  // open string (fretIdx 0) is special — drawn left of nut
  const slotCx = (fretIdx) =>
    L_PAD + NUT_W + (fretIdx - idxStart - 0.5) * F_W;
  const openX  = L_PAD + NUT_W * 0.5;
  const sy     = (s) => T_PAD + s * S_GAP;

  // Collect dots
  const dotMap = new Map();
  degrees.forEach(deg => {
    deg.positions.forEach(p => {
      const f = p.fretIdx;
      const visible =
        (f === 0 && idxStart === 0) ||          // open string only in first panel
        (f > 0 && f > idxStart && f <= idxEnd); // fret f is in slot range
      if (!visible) return;
      const k = `${p.string}-${f}`;
      if (!dotMap.has(k)) dotMap.set(k, []);
      dotMap.get(k).push({ ...deg, fretIdx: f, string: p.string });
    });
  });

  // Which integer frets (by label) are in this display range?
  // fretLabel shows "1","2",… at fretIdx 4,8,12,16,20,24
  // markers at those positions
  const markerFretIdxes = [];
  for (let fi = idxStart + 1; fi <= idxEnd; fi++) {
    if (fi % 4 === 0) {           // every whole-fret index (200¢ steps = whole tones on oud)
      const fretNum = fi / 4;     // 1,2,3,…
      if (MARKERS.has(fretNum)) markerFretIdxes.push({ fi, fretNum });
    }
  }

  return (
    <Box>
      <Typography sx={{
        fontSize:"0.6rem", fontWeight:600, letterSpacing:"0.1em",
        textTransform:"uppercase", color:"rgba(201,169,110,0.38)",
        mb:0.5, pl:`${L_PAD + NUT_W + 4}px`,
      }}>
        {label}
      </Typography>
      <Box sx={{ overflowX:"auto" }}>
        <svg width={W} height={H} style={{ display:"block", overflow:"visible" }}>
          <rect width={W} height={H} fill="#070604" rx="3"/>

          {/* Fret position inlays */}
          {markerFretIdxes.map(({ fi, fretNum }) => (
            <circle key={fi}
              cx={slotCx(fi)} cy={H / 2}
              r={fretNum === 12 ? 4.5 : 3.5}
              fill="rgba(201,169,110,0.09)"/>
          ))}

          {/* Fret wires (idxStart → idxEnd, plus left boundary) */}
          {Array.from({ length: nSlots + 1 }, (_, i) => {
            const x = L_PAD + NUT_W + i * F_W;
            const isLeft = i === 0;
            return (
              <line key={i}
                x1={x} y1={T_PAD - 6}
                x2={x} y2={T_PAD + (nStr - 1) * S_GAP + 6}
                stroke={isLeft ? "rgba(201,169,110,0.18)" : "#1c1810"}
                strokeWidth={isLeft ? 0.5 : 1.8}/>
            );
          })}

          {/* Nut or position bracket */}
          {idxStart === 0 ? (
            <rect x={L_PAD} y={T_PAD - 6} width={NUT_W}
              height={(nStr-1)*S_GAP + 12}
              fill="#8a6415" rx="1.5"/>
          ) : (
            <line
              x1={L_PAD + NUT_W} y1={T_PAD - 6}
              x2={L_PAD + NUT_W} y2={T_PAD + (nStr-1)*S_GAP + 6}
              stroke="rgba(201,169,110,0.3)" strokeWidth="3"/>
          )}

          {/* String lines */}
          {tuning.strings.map((s, si) => {
            const thickness = 0.6 + (nStr - 1 - si) * 0.18; // bass=thicker
            return (
              <line key={si}
                x1={L_PAD + NUT_W} y1={sy(si)}
                x2={L_PAD + NUT_W + nSlots * F_W} y2={sy(si)}
                stroke="rgba(201,169,110,0.28)"
                strokeWidth={thickness}/>
            );
          })}

          {/* String name labels */}
          {tuning.strings.map((s, si) => (
            <text key={si} x={L_PAD - 5} y={sy(si) + 4}
              textAnchor="end" fontSize="9"
              fontFamily="Ubuntu, sans-serif"
              fill="rgba(201,169,110,0.42)">{s.name}</text>
          ))}

          {/* Fret number labels — show integer frets only */}
          {Array.from({ length: nSlots }, (_, i) => {
            const fi = idxStart + 1 + i;
            if (fi % 4 !== 0) return null;            // only whole-tone frets
            const fretNum = fi / 4;
            return (
              <text key={fi}
                x={L_PAD + NUT_W + i * F_W + F_W / 2}
                y={T_PAD - 14}
                textAnchor="middle" fontSize="9"
                fontFamily="Ubuntu Mono, monospace"
                fill="rgba(201,169,110,0.28)">{fretNum}</text>
            );
          })}

          {/* Quarter-tone fret ticks (small) */}
          {Array.from({ length: nSlots }, (_, i) => {
            const fi = idxStart + 1 + i;
            if (fi % 4 === 0) return null;            // skip whole-tone (already labeled)
            const x = L_PAD + NUT_W + i * F_W;
            return (
              <line key={fi}
                x1={x} y1={T_PAD - 6}
                x2={x} y2={T_PAD - 10}
                stroke="rgba(201,169,110,0.15)" strokeWidth="0.8"/>
            );
          })}

          {/* Open string "0" label */}
          {idxStart === 0 && (
            <text x={openX} y={T_PAD - 14}
              textAnchor="middle" fontSize="9"
              fontFamily="Ubuntu Mono, monospace"
              fill="rgba(201,169,110,0.28)">0</text>
          )}

          {/* ── Scale degree dots ── */}
          {Array.from(dotMap.entries()).map(([key, entries]) => {
            entries.sort((a,b) => PRIORITY[a.role] - PRIORITY[b.role]);
            const n      = entries[0];
            const multi  = entries.length > 1;
            const { fretIdx, string: si } = n;
            const { color } = ROLE[n.role] ?? ROLE.other;
            const dimmed = highlightDeg !== null && highlightDeg !== n.degIdx;
            const isRoot = n.role === "root";
            const cx     = fretIdx === 0 ? openX : slotCx(fretIdx);
            const cy     = sy(si);
            const r      = isRoot ? 13 : 11;

            return (
              <g key={key} style={{ cursor:"pointer" }}
                onMouseEnter={() => onEnter(n.degIdx, fretIdx, si)}
                onMouseLeave={onLeave}
                onClick={() => onClick(n)}>
                {/* Root ring */}
                {isRoot && !dimmed && (
                  <circle cx={cx} cy={cy} r={r+4.5}
                    fill="none" stroke={color} strokeWidth="1" opacity="0.28"/>
                )}
                {/* Main dot */}
                <circle cx={cx} cy={cy} r={r}
                  fill={dimmed ? `${color}18` : `${color}e6`}
                  stroke={color}
                  strokeWidth={dimmed ? 0.3 : isRoot ? 2 : 1.2}/>
                {/* Degree label */}
                <text x={cx} y={cy+4}
                  textAnchor="middle"
                  fontSize={r > 11 ? "8" : "7.5"}
                  fontWeight="700"
                  fontFamily="Ubuntu, sans-serif"
                  fill={dimmed ? `${color}30` : isRoot ? "#080604" : "#e8e0d0"}>
                  {n.degree}
                </text>
                {/* Multi-degree indicator */}
                {multi && !dimmed && (
                  <circle cx={cx+r-1} cy={cy-r+1} r="3.5"
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
  const [rootMidi,      setRootMidi]     = useState(53);   // F
  const [highlightDeg,  setHighlightDeg] = useState(null);
  const [hoveredInfo,   setHoveredInfo]  = useState(null);
  const [isPlaying,     setIsPlaying]    = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  const inst       = INSTRUMENTS[instrument];
  const fps        = inst?.fretPositions ?? [];
  const fretLabels = inst?.fretLabels    ?? fps.map((_,i) => String(i));
  const maxIdx     = fps.length - 1;  // last valid fret index (e.g. 24 for oud)

  // Neck positions defined as FRET INDEX ranges (quarter-tone indices)
  // Oud: idx 0=open, idx 4="fret1"(200¢), idx 8="fret2", idx 12="fret3", idx 16="fret4", idx 24="fret6"(octave)
  // Position 1: open position — idx 0–8   (open strings + frets 1–2, i.e. 0–400¢)
  // Position 2: middle         — idx 8–16  (frets 2–4, i.e. 400–800¢)
  // Position 3: upper          — idx 16–24 (frets 4–6, i.e. 800–1200¢)
  const POSITIONS = useMemo(() => {
    const third = Math.floor(maxIdx / 3);
    return [
      { id:"pos1", label:"Θέση Ι — Ανοιχτή (τάστα 0–2)",    idxStart:0,       idxEnd: third },
      { id:"pos2", label:"Θέση ΙΙ — Μέση (τάστα 2–4)",      idxStart: third,  idxEnd: third * 2 },
      { id:"pos3", label:"Θέση ΙΙΙ — Άνω (τάστα 4–6)",      idxStart: third*2, idxEnd: maxIdx },
    ];
  }, [maxIdx]);

  const degrees = useMemo(
    () => buildDegrees(maqam, rootMidi, tuning, instrument),
    [maqam, rootMidi, tuning, instrument]
  );

  const totalDots = degrees.reduce((s,d) => s + d.positions.length, 0);

  // ── Playback ──
  const handlePlay = useCallback(() => {
    if (isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (audioRef.current) { audioRef.current.close().catch(()=>{}); audioRef.current = null; }
      setIsPlaying(false);
      return;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioRef.current = ctx;
    const now = ctx.currentTime;
    const gap = 0.46;
    degrees.forEach((d, i) => {
      playNote(ctx, rootMidi + d.cents/100, now + i*gap, 0.4, instrument, audioMode);
    });
    setIsPlaying(true);
    timerRef.current = setTimeout(() => {
      setIsPlaying(false); audioRef.current = null;
    }, degrees.length * gap * 1000 + 700);
  }, [isPlaying, degrees, rootMidi, instrument, audioMode]);

  const handleEnter = useCallback((degIdx, fretIdx, string) => {
    setHighlightDeg(degIdx);
    setHoveredInfo({ degIdx, fretIdx, string });
  }, []);
  const handleLeave = useCallback(() => {
    setHighlightDeg(null); setHoveredInfo(null);
  }, []);
  const handleClick = useCallback((deg) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    playNote(ctx, rootMidi + deg.cents/100, ctx.currentTime, 0.75, instrument, audioMode);
  }, [rootMidi, instrument, audioMode]);

  const hoveredDeg = hoveredInfo ? degrees[hoveredInfo.degIdx] : null;

  return (
    <Box>
      {/* ── Controls row ── */}
      <Box sx={{ display:"flex", alignItems:"center", gap:1.5, mb:2, flexWrap:"wrap" }}>
        <Tooltip title={isPlaying ? "Stop" : "Αναπαραγωγή"}>
          <IconButton size="small" onClick={handlePlay} sx={{
            bgcolor: isPlaying?"rgba(192,57,43,0.12)":"rgba(74,138,90,0.12)",
            color:   isPlaying?"error.main":"success.main",
            border:"1px solid",
            borderColor: isPlaying?"error.dark":"success.dark",
            flexShrink:0,
            "&:hover":{ bgcolor: isPlaying?"rgba(192,57,43,0.22)":"rgba(74,138,90,0.22)" },
          }}>
            {isPlaying ? <StopIcon sx={{fontSize:14}}/> : <PlayArrowIcon sx={{fontSize:14}}/>}
          </IconButton>
        </Tooltip>

        <Typography variant="caption" sx={{ color:"text.secondary", whiteSpace:"nowrap", fontSize:"0.68rem" }}>
          Root:
        </Typography>
        <Box sx={{ display:"flex", flexWrap:"wrap", gap:0.4 }}>
          {ROOT_OPTIONS.map(r => (
            <Box key={r.midi} onClick={() => setRootMidi(r.midi)} sx={{
              px:0.75, py:0.2, borderRadius:0.5, border:"1px solid", cursor:"pointer",
              transition:"all 0.1s",
              borderColor: rootMidi===r.midi?"primary.main":"divider",
              bgcolor:     rootMidi===r.midi?"rgba(201,169,110,0.15)":"background.default",
              color:       rootMidi===r.midi?"primary.main":"text.secondary",
              fontSize:"0.63rem", fontWeight: rootMidi===r.midi?700:400,
              fontFamily:"Ubuntu Mono, monospace",
              "&:hover":{ borderColor:"primary.main", color:"primary.main" },
            }}>{r.label}</Box>
          ))}
        </Box>
        <Typography variant="caption" sx={{ color:"text.disabled", ml:"auto", fontSize:"0.58rem", whiteSpace:"nowrap" }}>
          {totalDots} θέσεις · {tuning.name}
        </Typography>
      </Box>

      {/* ── Three position fretboards ── */}
      <Box sx={{ display:"flex", flexDirection:"column", gap:3, mb:2 }}>
        {POSITIONS.map(pos => (
          <Fretboard
            key={pos.id}
            label={pos.label}
            idxStart={pos.idxStart}
            idxEnd={pos.idxEnd}
            degrees={degrees}
            tuning={tuning}
            fretLabels={fretLabels}
            highlightDeg={highlightDeg}
            onEnter={handleEnter}
            onLeave={handleLeave}
            onClick={handleClick}
          />
        ))}
      </Box>

      {/* ── Legend ── */}
      <Box sx={{ display:"flex", gap:1.25, flexWrap:"wrap", mb:1.5 }}>
        {Object.entries(ROLE).map(([r,{color,label}]) => (
          <Box key={r} sx={{ display:"flex", alignItems:"center", gap:0.5 }}>
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
        minHeight:40, p:1.25, bgcolor:"background.default",
        border:"1px solid",
        borderColor: hoveredDeg?"rgba(201,169,110,0.38)":"divider",
        borderRadius:1, transition:"border-color 0.15s", mb:1.5,
      }}>
        {hoveredDeg ? (
          <Box sx={{ display:"flex", alignItems:"center", gap:1, flexWrap:"wrap" }}>
            <Chip label={hoveredDeg.degree} size="small" sx={{
              bgcolor:`${ROLE[hoveredDeg.role].color}22`,
              color:ROLE[hoveredDeg.role].color,
              fontWeight:700, height:20, fontSize:"0.68rem",
            }}/>
            <Typography sx={{
              color:"primary.light", fontFamily:"Ubuntu Mono, monospace",
              fontSize:"0.82rem", fontWeight:600,
            }}>
              {hoveredDeg.noteName}
            </Typography>
            <Typography variant="caption" sx={{ color:"text.secondary", fontSize:"0.65rem" }}>
              {hoveredDeg.cents}¢
            </Typography>
            <Chip label={ROLE[hoveredDeg.role].label} size="small" variant="outlined" sx={{
              height:18, fontSize:"0.6rem",
              borderColor:ROLE[hoveredDeg.role].color,
              color:ROLE[hoveredDeg.role].color,
            }}/>
            {hoveredInfo && (
              <Typography variant="caption" sx={{ color:"primary.main", fontFamily:"Ubuntu Mono, monospace", fontSize:"0.65rem" }}>
                Χορδή {hoveredInfo.string+1} · Τάστο {fretLabels[hoveredInfo.fretIdx] ?? hoveredInfo.fretIdx}
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

      {/* ── Degree summary ── */}
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
                borderColor: isHov?color:`${color}38`,
                bgcolor:     isHov?`${color}18`:"background.default",
                cursor:"default", transition:"all 0.1s", minWidth:40,
              }}>
              <Typography sx={{ fontSize:"0.55rem", color:"text.secondary", lineHeight:1 }}>
                {d.degree}
              </Typography>
              <Typography sx={{
                fontSize:"0.72rem", fontFamily:"Ubuntu Mono, monospace",
                fontWeight:700, color, lineHeight:1.3,
              }}>
                {d.noteName.replace(/\d/,"")}
              </Typography>
              <Typography sx={{ fontSize:"0.5rem", color:"text.disabled", lineHeight:1 }}>
                {d.cents}¢
              </Typography>
              <Typography sx={{ fontSize:"0.5rem", color:"text.secondary", fontFamily:"Ubuntu Mono, monospace", lineHeight:1.2 }}>
                ×{d.positions.length}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

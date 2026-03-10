/**
 * FretboardPanel — Πλήρης χάρτης θέσεων μακάμ στο fingerboard
 *
 * Περιέχει τρία τμήματα:
 *   1. Interactive fretboard diagram (ολόκληρο neck με κουκίδες)
 *   2. Root availability — ποιοι τόνοι παίζεται άνετα στο κούρδισμα
 *   3. Per-string breakdown — θέσεις ανά χορδή
 */
import { useState, useMemo } from "react";
import { Box, Typography, Chip, Tooltip, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { INSTRUMENTS } from "../utils/instruments";
import { MAQAMAT, getMaqamList } from "../utils/maqamat";

// ── Constants ────────────────────────────────────────────────────────────────

const TOLERANCE = 30; // cents tolerance for "on fret"

const NOTE_NAMES_12 = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];

const DEGREE_COLORS = {
  root:           "#e8c87a",   // gold
  dominant:       "#d4882a",   // amber
  characteristic: "#6ab04c",   // green
  leading:        "#5a8fa0",   // teal
  other:          "#4a5568",   // grey-blue
};

const DEGREE_LABELS = ["I","♭II","II","♭III","III","IV","♯IV","V","♭VI","VI","♭VII","VII","VIII"];

// ── Utility functions ────────────────────────────────────────────────────────

function noteName(midi) {
  return NOTE_NAMES_12[((midi % 12) + 12) % 12];
}

function noteOct(midi) {
  return Math.floor(midi / 12) - 1;
}

/**
 * Build the full position map for a maqam/root/tuning/instrument.
 * Returns array of { string, fret, midi, degree, role, centsOff }
 */
function buildPositionMap(maqam, rootMidi, tuning, instrument) {
  const fretPositions = INSTRUMENTS[instrument].fretPositions;
  const intervals = maqam.intervals; // in cents from root
  const characteristicSet = new Set(maqam.characteristic || []);
  const positions = [];

  for (let sIdx = 0; sIdx < tuning.strings.length; sIdx++) {
    const openMidi = tuning.strings[sIdx].midi;
    for (let fIdx = 0; fIdx < fretPositions.length; fIdx++) {
      const fretCents = fretPositions[fIdx];
      const noteMidi = openMidi + fretCents / 100;
      // Distance from root in cents, mod 1200
      const fromRoot = ((noteMidi - rootMidi) * 100) % 1200;
      const fromRootMod = ((fromRoot % 1200) + 1200) % 1200;

      // Find matching interval
      let matchedInterval = null;
      let matchedDegree = -1;
      for (let iIdx = 0; iIdx < intervals.length; iIdx++) {
        const iv = intervals[iIdx] % 1200;
        if (Math.abs(fromRootMod - iv) <= TOLERANCE || Math.abs(fromRootMod - iv - 1200) <= TOLERANCE) {
          matchedInterval = iv;
          matchedDegree = iIdx;
          break;
        }
      }
      if (matchedInterval === null) continue;

      // Determine role
      let role = "other";
      const isRoot = matchedDegree === 0 || matchedDegree === intervals.length - 1;
      if (isRoot) role = "root";
      else if (matchedInterval === (maqam.dominant || 700)) role = "dominant";
      else if (characteristicSet.has(matchedInterval)) role = "characteristic";
      else if (matchedInterval === (maqam.leading || 1100)) role = "leading";

      const exactMidi = Math.round(openMidi + fretCents / 100);
      positions.push({
        string: sIdx,
        fret: fIdx,
        midi: exactMidi,
        midiFloat: openMidi + fretCents / 100,
        interval: matchedInterval,
        degree: matchedDegree,
        role,
        centsOff: fromRootMod - matchedInterval,
        label: noteName(exactMidi) + noteOct(exactMidi),
      });
    }
  }
  return positions;
}

/**
 * For each possible root note (all 12 pitch classes), compute a "playability score"
 * = number of scale tones reachable in comfortable fret range (frets 0-12).
 */
function computeRootAvailability(maqam, tuning, instrument) {
  const results = [];
  for (let pc = 0; pc < 12; pc++) {
    // Try the root in octaves 2 and 3 (midi 36-60 range for oud)
    const rootMidi = pc + 36; // C2 = 36 basis
    const positions = buildPositionMap(maqam, rootMidi, tuning, instrument);
    const comfortable = positions.filter(p => p.fret <= 12);
    const unique = new Set(comfortable.map(p => p.interval % 1200)).size;
    const expected = maqam.intervals.length - 1; // excluding octave repeat
    const roots = comfortable.filter(p => p.role === "root");
    const score = unique / expected;
    results.push({
      pc,
      name: NOTE_NAMES_12[pc],
      score,
      uniqueNotes: unique,
      expectedNotes: expected,
      rootPositions: roots.length,
      totalPositions: comfortable.length,
    });
  }
  return results.sort((a, b) => b.score - a.score);
}

// ── Fretboard SVG ────────────────────────────────────────────────────────────

const FRET_COUNT = 13; // show frets 0..12
const STRING_GAP = 28;
const FRET_W = 46;
const LEFT_PAD = 44;
const TOP_PAD = 32;
const BOTTOM_PAD = 28;
const NUT_W = 6;

function FretboardSVG({ positions, tuning, instrument, highlightRole, onDotClick, activeString }) {
  const nStrings = tuning.strings.length;
  const W = LEFT_PAD + NUT_W + FRET_COUNT * FRET_W + 16;
  const H = TOP_PAD + (nStrings - 1) * STRING_GAP + BOTTOM_PAD;

  const sx = (fIdx) => LEFT_PAD + NUT_W + (fIdx - 0.5) * FRET_W; // center of fret slot
  const sy = (sIdx) => TOP_PAD + sIdx * STRING_GAP;

  // Fret positions (vertical lines) — index 0 = nut position, then frets 1-12
  const openX = LEFT_PAD + NUT_W;
  const fretX = (f) => LEFT_PAD + NUT_W + f * FRET_W;

  // Filter by highlighted role if set
  const visible = positions.filter(p =>
    p.fret <= 12 &&
    (activeString === null || p.string === activeString)
  );

  // Group by (string, fret) keeping highest-priority role
  const rolePriority = { root: 0, dominant: 1, characteristic: 2, leading: 3, other: 4 };
  const dotMap = new Map();
  for (const p of visible) {
    const key = `${p.string}-${p.fret}`;
    const existing = dotMap.get(key);
    if (!existing || rolePriority[p.role] < rolePriority[existing.role]) {
      dotMap.set(key, p);
    }
  }
  const dots = Array.from(dotMap.values());

  // Fret markers (traditional dots at 3,5,7,9,12)
  const MARKERS = [3, 5, 7, 9, 12];
  const DOUBLE_MARKERS = [12];

  return (
    <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
      {/* Background */}
      <rect width={W} height={H} fill="#0a0804" rx="4" />

      {/* Fret markers */}
      {MARKERS.map(f => (
        <g key={f}>
          <circle
            cx={fretX(f) - FRET_W / 2} cy={H / 2}
            r={DOUBLE_MARKERS.includes(f) ? 5 : 4}
            fill="rgba(201,169,110,0.12)"
          />
          {DOUBLE_MARKERS.includes(f) && (
            <circle
              cx={fretX(f) - FRET_W / 2} cy={H / 2 - STRING_GAP * 1.5}
              r={4} fill="rgba(201,169,110,0.12)"
            />
          )}
        </g>
      ))}

      {/* Fret lines */}
      {Array.from({ length: FRET_COUNT + 1 }, (_, f) => (
        <line key={f}
          x1={fretX(f)} y1={TOP_PAD - 4}
          x2={fretX(f)} y2={TOP_PAD + (nStrings - 1) * STRING_GAP + 4}
          stroke={f === 0 ? "rgba(201,169,110,0.15)" : "#2a2218"}
          strokeWidth={f === 0 ? 0.5 : 1.5}
        />
      ))}

      {/* Nut */}
      <rect x={LEFT_PAD} y={TOP_PAD - 4}
        width={NUT_W} height={(nStrings - 1) * STRING_GAP + 8}
        fill="#8b6914" rx="1"
      />

      {/* String lines */}
      {tuning.strings.map((s, sIdx) => (
        <line key={sIdx}
          x1={openX} y1={sy(sIdx)}
          x2={fretX(FRET_COUNT)} y2={sy(sIdx)}
          stroke={activeString === sIdx ? "rgba(201,169,110,0.6)" : "rgba(201,169,110,0.25)"}
          strokeWidth={activeString === sIdx ? 1.5 : 0.9}
        />
      ))}

      {/* String labels (left) */}
      {tuning.strings.map((s, sIdx) => (
        <text key={sIdx}
          x={LEFT_PAD - 4} y={sy(sIdx) + 4}
          textAnchor="end" fontSize="9"
          fontFamily="'Ubuntu Mono', monospace"
          fill={activeString === sIdx ? "#e8c87a" : "rgba(201,169,110,0.45)"}
        >
          {s.name}
        </text>
      ))}

      {/* Fret number labels */}
      {Array.from({ length: FRET_COUNT }, (_, f) => (
        <text key={f}
          x={fretX(f) + FRET_W / 2} y={TOP_PAD - 10}
          textAnchor="middle" fontSize="8"
          fontFamily="'Ubuntu Mono', monospace"
          fill="rgba(201,169,110,0.3)"
        >
          {f + 1}
        </text>
      ))}

      {/* Open string dots (fret 0) */}
      {dots.filter(p => p.fret === 0).map((p, i) => {
        const x = LEFT_PAD - 16;
        const y = sy(p.string);
        const color = DEGREE_COLORS[p.role];
        const dim = highlightRole && highlightRole !== p.role;
        return (
          <g key={`open-${i}`} onClick={() => onDotClick(p)} style={{ cursor: "pointer" }}>
            <circle cx={x} cy={y} r={9}
              fill={dim ? `${color}22` : `${color}cc`}
              stroke={color} strokeWidth={dim ? 0.5 : 1.5}
            />
            <text x={x} y={y + 4} textAnchor="middle" fontSize="8"
              fontFamily="'Ubuntu Mono', monospace"
              fontWeight="bold" fill={dim ? `${color}55` : "#0a0804"}
            >
              {DEGREE_LABELS[p.degree] || ""}
            </text>
          </g>
        );
      })}

      {/* Fretted dots */}
      {dots.filter(p => p.fret > 0).map((p, i) => {
        const x = fretX(p.fret) - FRET_W / 2;
        const y = sy(p.string);
        const color = DEGREE_COLORS[p.role];
        const dim = highlightRole && highlightRole !== p.role;
        const r = p.role === "root" ? 11 : 9;
        return (
          <g key={i} onClick={() => onDotClick(p)} style={{ cursor: "pointer" }}>
            <circle cx={x} cy={y} r={r}
              fill={dim ? `${color}22` : `${color}dd`}
              stroke={color} strokeWidth={dim ? 0.5 : p.role === "root" ? 2 : 1}
            />
            {p.role === "root" && !dim && (
              <circle cx={x} cy={y} r={r + 3}
                fill="none" stroke={color} strokeWidth="0.8" opacity="0.4"
              />
            )}
            <text x={x} y={y + 4} textAnchor="middle" fontSize="8"
              fontFamily="'Ubuntu Mono', monospace"
              fontWeight="bold"
              fill={dim ? `${color}55` : p.role === "root" ? "#0a0804" : "#e8e0d0"}
            >
              {DEGREE_LABELS[p.degree] || ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Per-String Table ─────────────────────────────────────────────────────────

function StringBreakdown({ positions, tuning, instrument, onHoverString, activeString }) {
  const byString = useMemo(() => {
    const map = {};
    for (const p of positions) {
      if (p.fret > 12) continue;
      if (!map[p.string]) map[p.string] = [];
      map[p.string].push(p);
    }
    // Deduplicate per (string, degree)
    const result = {};
    for (const [s, ps] of Object.entries(map)) {
      const seen = new Set();
      result[s] = ps.filter(p => {
        const k = p.degree;
        if (seen.has(k)) return false;
        seen.add(k); return true;
      }).sort((a, b) => a.fret - b.fret);
    }
    return result;
  }, [positions]);

  const fretPositions = INSTRUMENTS[instrument].fretPositions;
  const fretLabel = (f) => {
    const inst = INSTRUMENTS[instrument];
    return inst.fretLabels?.[f] || String(f);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      {tuning.strings.map((s, sIdx) => {
        const ps = byString[sIdx] || [];
        const isActive = activeString === sIdx;
        return (
          <Box
            key={sIdx}
            onMouseEnter={() => onHoverString(sIdx)}
            onMouseLeave={() => onHoverString(null)}
            sx={{
              display: "flex", alignItems: "center", gap: 1,
              p: 0.75, borderRadius: 1,
              border: "1px solid",
              borderColor: isActive ? "rgba(201,169,110,0.4)" : "rgba(201,169,110,0.1)",
              bgcolor: isActive ? "rgba(201,169,110,0.05)" : "transparent",
              transition: "all 0.12s",
            }}
          >
            {/* String name */}
            <Typography sx={{
              fontSize: "0.65rem", fontFamily: "'Ubuntu Mono', monospace",
              color: isActive ? "primary.light" : "text.secondary",
              minWidth: 28, fontWeight: 700,
            }}>
              {s.name}
            </Typography>

            {/* Fret dots */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4, flex: 1 }}>
              {ps.map((p, i) => {
                const color = DEGREE_COLORS[p.role];
                return (
                  <Tooltip key={i} title={`${DEGREE_LABELS[p.degree]} — τάστο ${fretLabel(p.fret)} — ${p.label}`}>
                    <Box sx={{
                      px: 0.6, py: 0.15,
                      borderRadius: 0.5,
                      fontSize: "0.6rem",
                      fontFamily: "'Ubuntu Mono', monospace",
                      fontWeight: 700,
                      color: p.role === "root" ? "#0a0804" : color,
                      bgcolor: p.role === "root" ? color : `${color}33`,
                      border: `1px solid ${color}66`,
                      display: "flex", gap: 0.4, alignItems: "center",
                    }}>
                      <span style={{ opacity: 0.7 }}>{fretLabel(p.fret)}</span>
                      <span>{p.label}</span>
                    </Box>
                  </Tooltip>
                );
              })}
              {ps.length === 0 && (
                <Typography sx={{ fontSize: "0.6rem", color: "text.disabled", fontStyle: "italic" }}>
                  —
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Root Availability ────────────────────────────────────────────────────────

function RootAvailability({ availability, activePc, onSelect }) {
  const max = Math.max(...availability.map(r => r.score), 0.001);
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
      {availability.map(r => {
        const pct = r.score / max;
        const isActive = activePc === r.pc;
        const color = pct > 0.85 ? "#6ab04c" : pct > 0.6 ? "#d4882a" : pct > 0.3 ? "#8b6914" : "#3a3228";
        return (
          <Tooltip key={r.pc} title={
            `${r.name}: ${r.uniqueNotes}/${r.expectedNotes} νότες σε άνετες θέσεις` +
            (r.rootPositions > 0 ? ` · ${r.rootPositions} ρίζα/ες` : " · χωρίς ρίζα")
          }>
            <Box
              onClick={() => onSelect(r.pc)}
              sx={{
                width: 38, height: 38,
                borderRadius: 1,
                border: "1px solid",
                borderColor: isActive ? "primary.main" : `${color}66`,
                bgcolor: isActive ? "rgba(201,169,110,0.15)" : `${color}22`,
                cursor: "pointer",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 0.1,
                transition: "all 0.12s",
                "&:hover": { borderColor: "primary.main", bgcolor: "rgba(201,169,110,0.1)" },
              }}
            >
              <Typography sx={{
                fontSize: "0.62rem", fontFamily: "'Ubuntu Mono', monospace",
                fontWeight: 700, color: isActive ? "primary.light" : color,
                lineHeight: 1,
              }}>
                {r.name}
              </Typography>
              <Typography sx={{ fontSize: "0.5rem", color: `${color}cc`, lineHeight: 1 }}>
                {r.uniqueNotes}/{r.expectedNotes}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend({ highlightRole, onHighlight }) {
  const items = [
    { role: "root",           label: "Ρίζα (I / VIII)" },
    { role: "dominant",       label: "Δεσπόζουσα (V)" },
    { role: "characteristic", label: "Χαρακτηριστική" },
    { role: "leading",        label: "Οδηγός" },
    { role: "other",          label: "Λοιπές νότες" },
  ];
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
      {items.map(({ role, label }) => (
        <Box
          key={role}
          onClick={() => onHighlight(highlightRole === role ? null : role)}
          sx={{
            display: "flex", alignItems: "center", gap: 0.5,
            px: 0.75, py: 0.25,
            borderRadius: 0.5,
            border: "1px solid",
            borderColor: highlightRole === role ? DEGREE_COLORS[role] : "rgba(201,169,110,0.15)",
            bgcolor: highlightRole === role ? `${DEGREE_COLORS[role]}22` : "transparent",
            cursor: "pointer",
            transition: "all 0.1s",
            "&:hover": { borderColor: DEGREE_COLORS[role] },
          }}
        >
          <Box sx={{
            width: 8, height: 8, borderRadius: "50%",
            bgcolor: DEGREE_COLORS[role],
          }} />
          <Typography sx={{ fontSize: "0.6rem", color: "text.secondary" }}>
            {label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ── Root selector ─────────────────────────────────────────────────────────────

const ROOT_OPTIONS = [
  { name: "C",  midi: 36 }, { name: "C#", midi: 37 }, { name: "D",  midi: 38 },
  { name: "Eb", midi: 39 }, { name: "E",  midi: 40 }, { name: "F",  midi: 41 },
  { name: "F#", midi: 42 }, { name: "G",  midi: 43 }, { name: "Ab", midi: 44 },
  { name: "A",  midi: 45 }, { name: "Bb", midi: 46 }, { name: "B",  midi: 47 },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function FretboardPanel({ maqam, tuning, instrument }) {
  const inst = INSTRUMENTS[instrument];
  const [rootMidi, setRootMidi] = useState(36); // C2 default
  const [highlightRole, setHighlightRole] = useState(null);
  const [activeString, setActiveString] = useState(null);
  const [hoveredDot, setHoveredDot] = useState(null);

  const maqamData = maqam ? (MAQAMAT[maqam.key] || maqam) : null;

  const positions = useMemo(() => {
    if (!maqamData || !tuning) return [];
    return buildPositionMap(maqamData, rootMidi, tuning, instrument);
  }, [maqamData, rootMidi, tuning, instrument]);

  const rootAvailability = useMemo(() => {
    if (!maqamData || !tuning) return [];
    return computeRootAvailability(maqamData, tuning, instrument);
  }, [maqamData, tuning, instrument]);

  const activePc = ((rootMidi % 12) + 12) % 12;

  const handleRootAvailSelect = (pc) => {
    // Find the ROOT_OPTIONS entry for this pitch class
    const opt = ROOT_OPTIONS.find(r => ((r.midi % 12) + 12) % 12 === pc);
    if (opt) setRootMidi(opt.midi);
  };

  if (!maqamData) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
          Επίλεξε μακάμ από την καρτέλα Μακάμ ή ηχογράφησε για αυτόματη ανίχνευση.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2.5 }}>

      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, flexWrap: "wrap" }}>
        <Typography sx={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.1rem", color: "primary.light",
        }}>
          {maqamData.name}
        </Typography>
        <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
          Θέσεις στο fingerboard
        </Typography>
      </Box>

      {/* Root selector */}
      <Box>
        <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", mb: 0.75, textTransform: "uppercase", letterSpacing: 1 }}>
          Ρίζα (tonic)
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4 }}>
          {ROOT_OPTIONS.map(r => {
            const pc = ((r.midi % 12) + 12) % 12;
            const avail = rootAvailability.find(a => a.pc === pc);
            const isActive = rootMidi === r.midi;
            return (
              <Tooltip key={r.midi} title={avail ? `${avail.uniqueNotes}/${avail.expectedNotes} νότες άνετα` : ""}>
                <Box
                  onClick={() => setRootMidi(r.midi)}
                  sx={{
                    px: 0.75, py: 0.3,
                    borderRadius: 0.5,
                    border: "1px solid",
                    borderColor: isActive ? "primary.main" : "rgba(201,169,110,0.2)",
                    bgcolor: isActive ? "rgba(201,169,110,0.15)" : "transparent",
                    color: isActive ? "primary.light" : "text.secondary",
                    fontSize: "0.65rem",
                    fontFamily: "'Ubuntu Mono', monospace",
                    fontWeight: isActive ? 700 : 400,
                    cursor: "pointer",
                    transition: "all 0.1s",
                    "&:hover": { borderColor: "primary.dark" },
                  }}
                >
                  {r.name}
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>

      {/* ── Section 2: Root Availability ── */}
      <Box>
        <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", mb: 0.75, textTransform: "uppercase", letterSpacing: 1 }}>
          Διαθεσιμότητα τόνων — πόσο άνετα παίζεται σε κάθε ρίζα
        </Typography>
        <RootAvailability
          availability={rootAvailability}
          activePc={activePc}
          onSelect={handleRootAvailSelect}
        />
        <Typography sx={{ fontSize: "0.57rem", color: "text.disabled", mt: 0.75 }}>
          Πράσινο = όλες/σχεδόν όλες νότες εντός τάστου 12 · Πορτοκαλί = μερικές · Σκούρο = δυσκολότερο
        </Typography>
      </Box>

      <Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />

      {/* ── Section 1: Fretboard Diagram ── */}
      <Box>
        <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", mb: 1, textTransform: "uppercase", letterSpacing: 1 }}>
          Fingerboard — τάστα 0–12
        </Typography>

        {/* Legend */}
        <Legend highlightRole={highlightRole} onHighlight={setHighlightRole} />

        {/* Fretboard */}
        <Box sx={{ mt: 1.5, overflowX: "auto", pb: 1 }}>
          <FretboardSVG
            positions={positions}
            tuning={tuning}
            instrument={instrument}
            highlightRole={highlightRole}
            onDotClick={setHoveredDot}
            activeString={activeString}
          />
        </Box>

        {/* Hovered dot info */}
        {hoveredDot && (
          <Box sx={{
            mt: 0.5, px: 1.25, py: 0.6,
            bgcolor: "rgba(201,169,110,0.08)",
            border: "1px solid rgba(201,169,110,0.2)",
            borderRadius: 1, display: "inline-flex", gap: 1.5, alignItems: "center",
          }}>
            <Typography sx={{ fontSize: "0.65rem", color: "primary.light", fontFamily: "'Ubuntu Mono', monospace", fontWeight: 700 }}>
              {hoveredDot.label}
            </Typography>
            <Typography sx={{ fontSize: "0.6rem", color: "text.secondary" }}>
              {DEGREE_LABELS[hoveredDot.degree]} · τάστο {inst.fretLabels?.[hoveredDot.fret] || hoveredDot.fret} · χορδή {tuning.strings[hoveredDot.string]?.name}
            </Typography>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: DEGREE_COLORS[hoveredDot.role] }} />
          </Box>
        )}
      </Box>

      <Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />

      {/* ── Section 3: Per-string breakdown ── */}
      <Box>
        <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", mb: 1, textTransform: "uppercase", letterSpacing: 1 }}>
          Θέσεις ανά χορδή (τάστα 0–12)
        </Typography>
        <StringBreakdown
          positions={positions}
          tuning={tuning}
          instrument={instrument}
          onHoverString={setActiveString}
          activeString={activeString}
        />
      </Box>

      {/* Scale intervals legend */}
      <Box sx={{
        mt: 0.5, p: 1,
        bgcolor: "rgba(10,8,4,0.4)",
        border: "1px solid rgba(201,169,110,0.1)",
        borderRadius: 1,
      }}>
        <Typography sx={{ fontSize: "0.58rem", color: "text.disabled", mb: 0.5, textTransform: "uppercase", letterSpacing: 1 }}>
          Κλίμακα
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4 }}>
          {maqamData.intervals.map((iv, i) => {
            const isChar = (maqamData.characteristic || []).includes(iv);
            const isDom = iv === (maqamData.dominant || 700);
            const isRoot = i === 0 || i === maqamData.intervals.length - 1;
            const role = isRoot ? "root" : isDom ? "dominant" : isChar ? "characteristic" : "other";
            return (
              <Box key={i} sx={{
                px: 0.6, py: 0.15,
                borderRadius: 0.4,
                fontSize: "0.58rem",
                fontFamily: "'Ubuntu Mono', monospace",
                color: DEGREE_COLORS[role],
                bgcolor: `${DEGREE_COLORS[role]}22`,
                border: `1px solid ${DEGREE_COLORS[role]}44`,
              }}>
                {DEGREE_LABELS[i]} {iv}¢
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

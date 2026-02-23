/**
 * Rast Maqam Sample Generator
 *
 * Maqam Rast on D (root = D4, MIDI 62):
 * Scale: D  E  F½  G  A  B  C½  D'
 * Cents: 0  200 350 500 700 900 1050 1200
 *
 * The sample contains:
 *  1. Scale ascent (D to D')
 *  2. Scale descent (D' to D)
 *  3. A short seyir phrase (characteristic melodic movement)
 */

import { findBestPosition } from "./instruments.js";
import { MAQAMAT } from "./maqamat.js";

// Rast root on D4 (MIDI 62) — idiomatic oud starting pitch
const RAST_ROOT_MIDI = 62; // D4

// Rast intervals in cents
const RAST_INTERVALS_CENTS = [0, 200, 350, 500, 700, 900, 1050, 1200];

// Convert cents offset to fractional MIDI
function centsToMidi(rootMidi, cents) {
  return rootMidi + cents / 100;
}

// Build scale notes (midi float values)
const RAST_SCALE_MIDI = RAST_INTERVALS_CENTS.map((c) =>
  centsToMidi(RAST_ROOT_MIDI, c)
);

// Velocity contour (gives musical shape)
const ACCENT = 100;
const MEDIUM = 80;
const SOFT = 60;

/**
 * Generates a Rast sample phrase as an array of note objects
 * compatible with the TabEditor / App state format.
 *
 * @param {object} tuning   - current instrument tuning
 * @param {string} instrument - "oud" | "saz"
 * @param {number} tempo    - BPM (default 80)
 * @returns {{ notes: Array, maqam: object, tempo: number }}
 */
export function generateRastSample(tuning, instrument, tempo = 80) {
  const beatDur = 60 / tempo;       // seconds per beat
  const eighth  = beatDur / 2;      // ♪
  const quarter = beatDur;          // ♩
  const dotted  = beatDur * 1.5;    // ♩.
  const half    = beatDur * 2;      // 𝅗𝅥

  // ── Melodic sequence ──────────────────────────────────────────────────────
  // Format: [midi_float, duration_seconds, velocity]
  // Phrase: Ascent D→D', brief rest feel, Seyir phrase, Descent D'→D, rest on root

  const sequence = [
    // === Part 1: Scale Ascent ===
    // D E F½ G  A  B  C½ D'
    [RAST_SCALE_MIDI[0], quarter, ACCENT],   // D4  - root, strong
    [RAST_SCALE_MIDI[1], eighth,  MEDIUM],   // E4
    [RAST_SCALE_MIDI[2], eighth,  MEDIUM],   // F4½ (neutral 3rd — characteristic!)
    [RAST_SCALE_MIDI[3], eighth,  MEDIUM],   // G4
    [RAST_SCALE_MIDI[4], quarter, ACCENT],   // A4  - dominant, accent
    [RAST_SCALE_MIDI[5], eighth,  MEDIUM],   // B4
    [RAST_SCALE_MIDI[6], eighth,  SOFT],     // C4½ (neutral 7th)
    [RAST_SCALE_MIDI[7], dotted,  ACCENT],   // D5  - octave, held

    // === Part 2: Seyir Phrase (characteristic Rast gesture) ===
    // Starts at 5th (A), moves to 3rd, circles root with approach note
    [RAST_SCALE_MIDI[4], eighth,  ACCENT],   // A4  - dominant emphasis
    [RAST_SCALE_MIDI[3], eighth,  MEDIUM],   // G4
    [RAST_SCALE_MIDI[2], eighth,  MEDIUM],   // F4½ (neutral 3rd — emotional core)
    [RAST_SCALE_MIDI[3], eighth,  SOFT],     // G4  - return
    [RAST_SCALE_MIDI[1], eighth,  MEDIUM],   // E4
    [RAST_SCALE_MIDI[2], eighth,  SOFT],     // F4½ (ornament feel)
    [RAST_SCALE_MIDI[0], quarter, ACCENT],   // D4  - resolve to root
    [RAST_SCALE_MIDI[1], eighth,  SOFT],     // E4  - leading motion
    [RAST_SCALE_MIDI[0], dotted,  MEDIUM],   // D4  - final rest on root

    // === Part 3: Scale Descent ===
    // D' C½ B  A  G  F½  E  D
    [RAST_SCALE_MIDI[7], quarter, ACCENT],   // D5  - start descent from top
    [RAST_SCALE_MIDI[6], eighth,  SOFT],     // C5½
    [RAST_SCALE_MIDI[5], eighth,  MEDIUM],   // B4
    [RAST_SCALE_MIDI[4], quarter, ACCENT],   // A4  - pause on dominant
    [RAST_SCALE_MIDI[3], eighth,  MEDIUM],   // G4
    [RAST_SCALE_MIDI[2], eighth,  MEDIUM],   // F4½ (characteristic again)
    [RAST_SCALE_MIDI[1], eighth,  SOFT],     // E4
    [RAST_SCALE_MIDI[0], half,    ACCENT],   // D4  - final cadence, long hold
  ];

  // ── Build note objects with timing ───────────────────────────────────────
  const notes = [];
  let time = 0;

  sequence.forEach(([midiFloat, duration, velocity], i) => {
    const position = findBestPosition(midiFloat, tuning, instrument);
    if (!position) return;

    const microtonalOffset = (midiFloat - Math.round(midiFloat)) * 100;

    notes.push({
      id: `rast_${i}`,
      time,
      duration: duration * 0.92, // slight articulation gap
      midi: midiFloat,
      midiRounded: Math.round(midiFloat),
      microtonalOffset,
      string: position.string,
      fret: position.fret,
      centsOff: position.centsOff ?? 0,
      velocity,
      ornament: null,
      frequency: 440 * Math.pow(2, (midiFloat - 69) / 12),
    });

    time += duration;
  });

  // ── Build maqam object matching app state shape ───────────────────────────
  const rastDef = MAQAMAT.rast;
  const maqam = {
    key: "rast",
    name: rastDef.name,
    description: rastDef.description,
    intervals: rastDef.intervals,
    confidence: 0.97,
    seyirDirection: rastDef.seyir.type,
    seyirPath: buildSeyirPath(notes),
    manualOverride: false,
    isSample: true,
  };

  return { notes, maqam, tempo };
}

/** Build a simple seyir path from the generated notes */
function buildSeyirPath(notes) {
  if (notes.length === 0) return [];
  const root = notes[0].midi;
  return notes.map((n) => {
    const diff = n.midi - root;
    if (diff > 4) return 1;
    if (diff < -1) return -1;
    return 0;
  });
}

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


// ═══════════════════════════════════════════════════════════════════════════
// UŞAK SAMPLE
// ═══════════════════════════════════════════════════════════════════════════
// Uşak on A (root = A3, MIDI 57): 0 150 300 500 700 800 1000 1200
// A  Bb½  C  D  E  F  G  A'

const USAQ_ROOT_MIDI = 57; // A3 — idiomatic oud
const USAQ_INTERVALS = [0, 150, 300, 500, 700, 800, 1000, 1200];

export function generateUsaqSample(tuning, instrument, tempo = 80) {
  const beatDur   = 60 / tempo;
  const eighth    = beatDur / 2;
  const quarter   = beatDur;
  const dotted    = beatDur * 1.5;

  const maqam = MAQAMAT["usaq"];
  const root  = USAQ_ROOT_MIDI;
  const scale = USAQ_INTERVALS.map(c => root + c / 100);

  function pos(midiFloat) {
    return findBestPosition(midiFloat, tuning, instrument) ?? { string: 0, fret: 0 };
  }
  function note(midiFloat, time, dur, vel = 80) {
    const p = pos(midiFloat);
    return {
      id: `usaq_${Math.random().toString(36).slice(2)}`,
      midi: midiFloat, midiRounded: Math.round(midiFloat),
      microtonalOffset: (midiFloat - Math.round(midiFloat)) * 100,
      time, duration: dur * 0.9, velocity: vel,
      string: p.string, fret: p.fret, ornament: null,
    };
  }

  const notes = [];
  let t = 0;

  // Descending seyir phrase (characteristic: start high, descend to tonic)
  // Bar 1: A' G F E
  notes.push(note(scale[7], t, quarter, 90)); t += quarter;
  notes.push(note(scale[6], t, eighth,  70)); t += eighth;
  notes.push(note(scale[5], t, eighth,  75)); t += eighth;
  notes.push(note(scale[4], t, quarter, 80)); t += quarter;

  // Bar 2: D C Bb½ A
  notes.push(note(scale[3], t, eighth,  78)); t += eighth;
  notes.push(note(scale[2], t, eighth,  75)); t += eighth;
  notes.push(note(scale[1], t, eighth,  72)); t += eighth;
  notes.push(note(scale[0], t, dotted,  85)); t += dotted + eighth;

  // Bar 3: Ascent A Bb½ C D E
  notes.push(note(scale[0], t, eighth,  70)); t += eighth;
  notes.push(note(scale[1], t, eighth,  73)); t += eighth;
  notes.push(note(scale[2], t, eighth,  75)); t += eighth;
  notes.push(note(scale[3], t, eighth,  78)); t += eighth;
  notes.push(note(scale[4], t, quarter, 82)); t += quarter;

  // Bar 4: F E D cadence
  notes.push(note(scale[5], t, eighth,  75)); t += eighth;
  notes.push(note(scale[4], t, eighth,  70)); t += eighth;
  notes.push(note(scale[3], t, eighth,  72)); t += eighth;
  notes.push(note(scale[0], t, dotted,  90)); t += dotted;

  return {
    notes,
    maqam: {
      key: "usaq", name: maqam.name,
      intervals: maqam.intervals,
      description: maqam.description,
      confidence: 1.0,
      seyirDirection: maqam.seyir.type,
      seyirPath: [-0.8, -0.6, -0.4, -0.2, 0, 0.2, -0.1, -0.8],
      manualOverride: false,
    },
    tempo,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// OUD BASIC SCALE SAMPLE
// ═══════════════════════════════════════════════════════════════════════════
// Open-string sweep + chromatic scale through all 6 courses of the oud
// Demonstrates the instrument's full range and quarter-tone capability

export function generateOudScaleSample(tuning, instrument, tempo = 72) {
  const beatDur = 60 / tempo;
  const eighth  = beatDur / 2;
  const sixteenth = beatDur / 4;

  function pos(midiFloat) {
    return findBestPosition(midiFloat, tuning, instrument) ?? { string: 0, fret: 0 };
  }
  function note(midiFloat, time, dur, vel = 75) {
    const p = pos(midiFloat);
    return {
      id: `scale_${Math.random().toString(36).slice(2)}`,
      midi: midiFloat, midiRounded: Math.round(midiFloat),
      microtonalOffset: (midiFloat - Math.round(midiFloat)) * 100,
      time, duration: dur * 0.88, velocity: vel,
      string: p.string, fret: p.fret, ornament: null,
    };
  }

  const notes = [];
  let t = 0;

  // Play each open string (bass → treble)
  for (let s = 0; s < tuning.strings.length; s++) {
    const midi = tuning.strings[s].midi;
    notes.push(note(midi, t, eighth, 65 + s * 3));
    t += eighth;
  }
  t += eighth; // small pause

  // Chromatic (semitone) scale up the highest string (course 6)
  const topString = tuning.strings[tuning.strings.length - 1];
  for (let semi = 0; semi <= 12; semi++) {
    notes.push(note(topString.midi + semi, t, sixteenth, 72 + semi * 1.5));
    t += sixteenth;
  }
  t += eighth;

  // Run up the neck: play each string's open + fret 2 (whole tone) + fret 4 (2nd fret = major 3rd)
  for (let s = tuning.strings.length - 1; s >= 0; s--) {
    const base = tuning.strings[s].midi;
    notes.push(note(base,       t, sixteenth, 78)); t += sixteenth;
    notes.push(note(base + 2,   t, sixteenth, 76)); t += sixteenth;  // whole tone
    notes.push(note(base + 4,   t, sixteenth, 74)); t += sixteenth;  // major 3rd
  }

  return {
    notes,
    maqam: {
      key: "rast", name: "Βασική Κλίμακα Ούτι",
      intervals: MAQAMAT["rast"].intervals,
      description: "Ανοιχτές χορδές και βασική κλίμακα χρωματική.",
      confidence: 1.0,
      seyirDirection: "ascending",
      seyirPath: [0, 0.2, 0.4, 0.6, 0.8, 1.0, 0.8, 0.6],
      manualOverride: false,
    },
    tempo,
  };
}

// Instrument definitions with comprehensive tuning options
// Pitches in MIDI note numbers

export const INSTRUMENTS = {
  oud: {
    name: "Oud",
    strings: 11,
    courses: 6,
    frets: 24,
    scaleLength: 610,
    tunings: [
      // ── ARABIC ──────────────────────────────────────────────────────────
      // Courses: 1=bass → 6=treble  |  Standard: C2 F2 A2 D3 G3 C4
      {
        id: "arabic_standard",
        name: "Arabic Standard",
        region: "Arabic",
        description: "Κλασσικό αραβικό κούρδισμα C2-F2-A2-D3-G3-C4. Αίγυπτος, Λεβάντης, Κόλπος.",
        strings: [
          { midi: 36, name: "C2",  course: 1 },
          { midi: 41, name: "F2",  course: 2 },
          { midi: 45, name: "A2",  course: 3 },
          { midi: 50, name: "D3",  course: 4 },
          { midi: 55, name: "G3",  course: 5 },
          { midi: 60, name: "C4",  course: 6 },
        ],
      },
      {
        id: "arabic_g_string",
        name: "Arabic — G 2nd",
        region: "Arabic",
        description: "C2-G2-A2-D3-G3-C4. Παραλλαγή με G2 στο 2ο course.",
        strings: [
          { midi: 36, name: "C2", course: 1 },
          { midi: 43, name: "G2", course: 2 },
          { midi: 45, name: "A2", course: 3 },
          { midi: 50, name: "D3", course: 4 },
          { midi: 55, name: "G3", course: 5 },
          { midi: 60, name: "C4", course: 6 },
        ],
      },
      {
        id: "arabic_e_string",
        name: "Arabic — E 2nd",
        region: "Arabic",
        description: "C2-E2-A2-D3-G3-C4. Παραλλαγή με E2 στο 2ο course.",
        strings: [
          { midi: 36, name: "C2", course: 1 },
          { midi: 40, name: "E2", course: 2 },
          { midi: 45, name: "A2", course: 3 },
          { midi: 50, name: "D3", course: 4 },
          { midi: 55, name: "G3", course: 5 },
          { midi: 60, name: "C4", course: 6 },
        ],
      },
      // ── TURKISH ─────────────────────────────────────────────────────────
      // Turkish standard: F2 B2 E3 A3 D4 G4  (Fa Si Mi La Re Sol)
      {
        id: "turkish_standard",
        name: "Turkish Standard (C#2)",
        region: "Turkish",
        description: "C#2-F#2-B2-E3-A3-D4. Κλασσικό τουρκικό fasıl/sanat.",
        strings: [
          { midi: 37, name: "C#2", course: 1 },
          { midi: 42, name: "F#2", course: 2 },
          { midi: 47, name: "B2",  course: 3 },
          { midi: 52, name: "E3",  course: 4 },
          { midi: 57, name: "A3",  course: 5 },
          { midi: 62, name: "D4",  course: 6 },
        ],
      },
      {
        id: "turkish_c_nat",
        name: "Turkish — C♮ F#",
        region: "Turkish",
        description: "C2-F#2-B2-E3-A3-D4. Παραλλαγή με φυσικό C2.",
        strings: [
          { midi: 36, name: "C2",  course: 1 },
          { midi: 42, name: "F#2", course: 2 },
          { midi: 47, name: "B2",  course: 3 },
          { midi: 52, name: "E3",  course: 4 },
          { midi: 57, name: "A3",  course: 5 },
          { midi: 62, name: "D4",  course: 6 },
        ],
      },
      {
        id: "turkish_c_f_nat",
        name: "Turkish — C♮ F♮",
        region: "Turkish",
        description: "C2-F2-B2-E3-A3-D4. Παραλλαγή C2 και F2.",
        strings: [
          { midi: 36, name: "C2",  course: 1 },
          { midi: 41, name: "F2",  course: 2 },
          { midi: 47, name: "B2",  course: 3 },
          { midi: 52, name: "E3",  course: 4 },
          { midi: 57, name: "A3",  course: 5 },
          { midi: 62, name: "D4",  course: 6 },
        ],
      },
      // ── PERSIAN / IRANIAN ────────────────────────────────────────────────
      // Barbat: C2 F2 Bb2 Eb3 Ab3 Db4 (all perfect 4ths)
      // ── IRAQI / BAGHDADI ─────────────────────────────────────────────────
      {
        id: "iraqi_standard",
        name: "Iraqi Standard",
        region: "Iraqi",
        description: "Σχολή Βαγδάτης: F2-C3-D3-G3-C4-F4.",
        strings: [
          { midi: 41, name: "F2", course: 1 },
          { midi: 48, name: "C3", course: 2 },
          { midi: 50, name: "D3", course: 3 },
          { midi: 55, name: "G3", course: 4 },
          { midi: 60, name: "C4", course: 5 },
          { midi: 65, name: "F4", course: 6 },
        ],
      },
      // ── NORTH AFRICAN ────────────────────────────────────────────────────
      {
        id: "lebanese_standard",
        name: "Lebanese Standard",
        region: "Arabic",
        description: "E2-A2-D3-G3-C4-F4. Λιβανέζικο κούρδισμα.",
        strings: [
          { midi: 40, name: "E2", course: 1 },
          { midi: 45, name: "A2", course: 2 },
          { midi: 50, name: "D3", course: 3 },
          { midi: 55, name: "G3", course: 4 },
          { midi: 60, name: "C4", course: 5 },
          { midi: 65, name: "F4", course: 6 },
        ],
      },
      // ── ARMENIAN ─────────────────────────────────────────────────────────
      // ── GREEK ────────────────────────────────────────────────────────────
      // ── SPECIAL / OPEN ───────────────────────────────────────────────────
      // ── CUSTOM (oud) ─────────────────────────────────────────────────────
      {
        id: "oud_custom",
        name: "Custom",
        region: "Custom",
        description: "Fully editable custom tuning.",
        strings: [
          { midi: 36, name: "C2",  course: 1 },
          { midi: 41, name: "F2",  course: 2 },
          { midi: 45, name: "A2",  course: 3 },
          { midi: 50, name: "D3",  course: 4 },
          { midi: 55, name: "G3",  course: 5 },
          { midi: 60, name: "C4",  course: 6 },
        ],
        editable: true,
      },
    ],
    fretPositions: [
      0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700,
      750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200,
    ],
    fretLabels: [
      "0","¼","½","¾","1","1¼","1½","1¾","2","2¼","2½",
      "2¾","3","3¼","3½","3¾","4","4¼","4½","4¾","5",
      "5¼","5½","5¾","6",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  saz: {
    name: "Saz / Baglama",
    strings: 7,
    courses: 3,
    frets: 24,
    scaleLength: 700,
    tunings: [
      // ── STANDARD ────────────────────────────────────────────────────────
      {
        id: "kara_duzen",
        name: "Kara Düzen (Standard)",
        region: "Alevi-Bektashi",
        description: "The foundational saz tuning. Used for most Turkish folk and Alevi music.",
        strings: [
          { midi: 45, name: "A2", course: 1 },
          { midi: 52, name: "E3", course: 2 },
          { midi: 57, name: "A3", course: 3 },
        ],
      },
      {
        id: "baglama_duzen",
        name: "Bağlama Düzeni",
        region: "Anatolian Folk",
        description: "G-D-A classic bağlama tuning across Anatolian folk music.",
        strings: [
          { midi: 43, name: "G2", course: 1 },
          { midi: 50, name: "D3", course: 2 },
          { midi: 57, name: "A3", course: 3 },
        ],
      },
      {
        id: "misket_duzen",
        name: "Misket Düzeni",
        region: "Anatolian Folk",
        description: "G-D-G tuning. Named after the Misket folk dance. Very common.",
        strings: [
          { midi: 43, name: "G2", course: 1 },
          { midi: 50, name: "D3", course: 2 },
          { midi: 55, name: "G3", course: 3 },
        ],
      },
      // ── ALEVI-BEKTASHI ───────────────────────────────────────────────────
      // ── MAKAM-SPECIFIC ───────────────────────────────────────────────────
      // ── AZERI / CAUCASIAN ────────────────────────────────────────────────
      // ── HISTORICAL ───────────────────────────────────────────────────────
      {
        id: "tambouras_dgc",
        name: "Ταμπουράς D-G-C",
        region: "Tambouras",
        description: "D2-G2-C3. Κλασσικό κούρδισμα ταμπουρά.",
        strings: [
          { midi: 38, name: "D2", course: 1 },
          { midi: 43, name: "G2", course: 2 },
          { midi: 48, name: "C3", course: 3 },
        ],
      },
      {
        id: "tambouras_dad",
        name: "Ταμπουράς D-A-D",
        region: "Tambouras",
        description: "D2-A2-D3. Open D κούρδισμα ταμπουρά.",
        strings: [
          { midi: 38, name: "D2", course: 1 },
          { midi: 45, name: "A2", course: 2 },
          { midi: 50, name: "D3", course: 3 },
        ],
      },
      {
        id: "tambouras_adg",
        name: "Ταμπουράς A-D-G",
        region: "Tambouras",
        description: "A2-D3-G3. Τεταρτιαίο κούρδισμα ταμπουρά.",
        strings: [
          { midi: 45, name: "A2", course: 1 },
          { midi: 50, name: "D3", course: 2 },
          { midi: 55, name: "G3", course: 3 },
        ],
      },
      // ── CUSTOM (saz) ─────────────────────────────────────────────────────
      {
        id: "saz_custom",
        name: "Custom",
        region: "Custom",
        description: "Fully editable custom tuning.",
        strings: [
          { midi: 45, name: "A2", course: 1 },
          { midi: 52, name: "E3", course: 2 },
          { midi: 57, name: "A3", course: 3 },
        ],
        editable: true,
      },
    ],
    fretPositions: [
      0, 60, 115, 165, 200, 260, 315, 360, 400, 462, 515,
      560, 600, 660, 715, 760, 800, 862, 915, 960, 1000,
      1060, 1115, 1160, 1200,
    ],
    fretLabels: Array.from({ length: 25 }, (_, i) => i.toString()),
  },
};

export function midiToName(midi) {
  const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  return names[midi % 12] + (Math.floor(midi / 12) - 1);
}

export function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

export function findBestPosition(midiNote, tuning, instrument) {
  const fretPositions = INSTRUMENTS[instrument].fretPositions;
  const TOLERANCE = 30;

  // Pass 1: prefer lowest fret among all positions within tolerance
  let best = null;
  for (let sIdx = 0; sIdx < tuning.strings.length; sIdx++) {
    const centsFromOpen = (midiNote - tuning.strings[sIdx].midi) * 100;
    if (centsFromOpen < 0 || centsFromOpen > 1250) continue;
    for (let fIdx = 0; fIdx < fretPositions.length; fIdx++) {
      const diff = Math.abs(fretPositions[fIdx] - centsFromOpen);
      if (diff <= TOLERANCE) {
        if (best === null || fIdx < best.fret) {
          best = { string: sIdx, fret: fIdx, centsOff: centsFromOpen - fretPositions[fIdx] };
        }
      }
    }
  }
  if (best) return best;

  // Pass 2: fallback – global min diff, prefer lower fret on tie
  let bestDiff = Infinity;
  for (let sIdx = 0; sIdx < tuning.strings.length; sIdx++) {
    const centsFromOpen = (midiNote - tuning.strings[sIdx].midi) * 100;
    if (centsFromOpen < 0) continue;
    for (let fIdx = 0; fIdx < fretPositions.length; fIdx++) {
      const diff = Math.abs(fretPositions[fIdx] - centsFromOpen);
      if (diff < bestDiff || (diff === bestDiff && best && fIdx < best.fret)) {
        bestDiff = diff;
        best = { string: sIdx, fret: fIdx, centsOff: centsFromOpen - fretPositions[fIdx] };
      }
    }
  }
  return best;
}

export function getAllPositions(midiNote, tuning, instrument) {
  const fretPositions = INSTRUMENTS[instrument].fretPositions;
  const positions = [];
  for (let sIdx = 0; sIdx < tuning.strings.length; sIdx++) {
    const centsFromOpen = (midiNote - tuning.strings[sIdx].midi) * 100;
    for (let fIdx = 0; fIdx < fretPositions.length; fIdx++) {
      const diff = Math.abs(fretPositions[fIdx] - centsFromOpen);
      if (diff < 30 && centsFromOpen >= 0 && centsFromOpen <= 1200) {
        positions.push({ string: sIdx, fret: fIdx, centsOff: centsFromOpen - fretPositions[fIdx] });
      }
    }
  }
  return positions;
}

export function getTuningsByRegion(instrument) {
  const groups = {};
  for (const t of INSTRUMENTS[instrument].tunings) {
    const r = t.region || "Other";
    if (!groups[r]) groups[r] = [];
    groups[r].push(t);
  }
  return groups;
}

/**
 * Expand a 3-course saz tuning to a 7-string layout (2+2+3 courses).
 * Course 1 → 2 strings (same midi), course 2 → 2 strings, course 3 → 3 strings.
 * Used when sazStrings === "7" in settings.
 * Returns a new tuning object with 7 strings, each with a courseGroup label.
 */
export function expandSazTuning(tuning) {
  if (!tuning || tuning.strings.length !== 3) return tuning;
  const layout = [2, 2, 3]; // strings per course
  const expanded = [];
  let stringIdx = 0;
  tuning.strings.forEach((s, courseIdx) => {
    const count = layout[courseIdx];
    for (let i = 0; i < count; i++) {
      expanded.push({
        ...s,
        stringIdx,        // absolute string index (0-6)
        courseGroup: courseIdx, // which course this belongs to (0-2)
        subIdx: i,        // position within course
      });
      stringIdx++;
    }
  });
  return { ...tuning, strings: expanded, expanded: true };
}

/**
 * Collapse a note's string index from 7-string to 3-course for playback/logic.
 * Maps: strings 0-1 → course 0, 2-3 → course 1, 4-6 → course 2.
 */
export function collapseSazString(stringIdx) {
  if (stringIdx <= 1) return 0;
  if (stringIdx <= 3) return 1;
  return 2;
}

// Instrument definitions with multiple tuning options
// Pitches in MIDI note numbers, names in scientific notation

export const INSTRUMENTS = {
  oud: {
    name: "Ούτι (عود)",
    strings: 11, // 5 double courses + 1 bass
    courses: 6,
    frets: 24, // includes quarter-tone frets
    scaleLength: 610, // mm
    tunings: [
      {
        id: "arabic_standard",
        name: "Αραβικό Στάνταρ",
        arabic: "الضبط العربي",
        strings: [
          { midi: 52, name: "E3", course: 1 },  // Bass (sometimes F)
          { midi: 57, name: "A3", course: 2 },
          { midi: 62, name: "D4", course: 3 },
          { midi: 67, name: "G4", course: 4 },
          { midi: 71, name: "B4", course: 5 },
          { midi: 76, name: "E5", course: 6 },
        ],
      },
      {
        id: "turkish_standard",
        name: "Τουρκικό Στάνταρ",
        arabic: "الضبط التركي",
        strings: [
          { midi: 50, name: "D3", course: 1 },
          { midi: 55, name: "G3", course: 2 },
          { midi: 60, name: "C4", course: 3 },
          { midi: 65, name: "F4", course: 4 },
          { midi: 69, name: "A4", course: 5 },
          { midi: 74, name: "D5", course: 6 },
        ],
      },
      {
        id: "persian_standard",
        name: "Περσικό Στάνταρ",
        strings: [
          { midi: 48, name: "C3", course: 1 },
          { midi: 53, name: "F3", course: 2 },
          { midi: 58, name: "Bb3", course: 3 },
          { midi: 63, name: "Eb4", course: 4 },
          { midi: 68, name: "Ab4", course: 5 },
          { midi: 73, name: "Db5", course: 6 },
        ],
      },
      {
        id: "iraqi_standard",
        name: "Ιρακινό Στάνταρ",
        strings: [
          { midi: 55, name: "G3", course: 1 },
          { midi: 60, name: "C4", course: 2 },
          { midi: 65, name: "F4", course: 3 },
          { midi: 69, name: "A4", course: 4 },
          { midi: 74, name: "D5", course: 5 },
          { midi: 79, name: "G5", course: 6 },
        ],
      },
      {
        id: "custom",
        name: "Προσαρμοσμένο",
        strings: [
          { midi: 52, name: "E3", course: 1 },
          { midi: 57, name: "A3", course: 2 },
          { midi: 62, name: "D4", course: 3 },
          { midi: 67, name: "G4", course: 4 },
          { midi: 71, name: "B4", course: 5 },
          { midi: 76, name: "E5", course: 6 },
        ],
        editable: true,
      },
    ],
    // Microtonal fret positions (cents from open string)
    // Oud has no fixed frets but these are common positions
    fretPositions: [
      0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700,
      750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200,
    ],
    // Quarter-tone fret labels
    fretLabels: [
      "0", "¼", "½", "¾", "1", "1¼", "1½", "1¾", "2", "2¼", "2½",
      "2¾", "3", "3¼", "3½", "3¾", "4", "4¼", "4½", "4¾", "5",
      "5¼", "5½", "5¾", "6",
    ],
  },

  saz: {
    name: "Σάζι (Bağlama)",
    strings: 7, // 2+2+3 courses or 3 single
    courses: 3,
    frets: 24, // microtonal frets (bağlama-style)
    scaleLength: 700, // mm (uzun sap)
    tunings: [
      {
        id: "baglama_standard",
        name: "Bağlama Στάνταρ (Kara Düzen)",
        strings: [
          { midi: 45, name: "A2", course: 1 },  // bass course
          { midi: 52, name: "E3", course: 2 },
          { midi: 57, name: "A3", course: 3 },
        ],
      },
      {
        id: "misket",
        name: "Misket Düzeni",
        strings: [
          { midi: 43, name: "G2", course: 1 },
          { midi: 50, name: "D3", course: 2 },
          { midi: 55, name: "G3", course: 3 },
        ],
      },
      {
        id: "abdal",
        name: "Abdal Düzeni",
        strings: [
          { midi: 40, name: "E2", course: 1 },
          { midi: 47, name: "B2", course: 2 },
          { midi: 52, name: "E3", course: 3 },
        ],
      },
      {
        id: "bozkurt",
        name: "Bozkurt Düzeni",
        strings: [
          { midi: 48, name: "C3", course: 1 },
          { midi: 55, name: "G3", course: 2 },
          { midi: 60, name: "C4", course: 3 },
        ],
      },
      {
        id: "saz_custom",
        name: "Προσαρμοσμένο",
        strings: [
          { midi: 45, name: "A2", course: 1 },
          { midi: 52, name: "E3", course: 2 },
          { midi: 57, name: "A3", course: 3 },
        ],
        editable: true,
      },
    ],
    // Bağlama microtonal fret system (17-tone equal temperament approximate)
    fretPositions: [
      0, 60, 115, 165, 200, 260, 315, 360, 400, 462, 515,
      560, 600, 660, 715, 760, 800, 862, 915, 960, 1000,
      1060, 1115, 1160, 1200,
    ],
    fretLabels: Array.from({length: 25}, (_, i) => i.toString()),
  },
};

// Convert MIDI note to note name
export function midiToName(midi) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  return names[midi % 12] + octave;
}

// Convert frequency to MIDI (with microtonal precision)
export function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

// Find best string/fret for a given MIDI note
export function findBestPosition(midiNote, tuning, instrument) {
  const fretPositions = INSTRUMENTS[instrument].fretPositions;
  let best = null;
  let bestDiff = Infinity;

  for (let sIdx = 0; sIdx < tuning.strings.length; sIdx++) {
    const openMidi = tuning.strings[sIdx].midi;
    const centsFromOpen = (midiNote - openMidi) * 100;

    for (let fIdx = 0; fIdx < fretPositions.length; fIdx++) {
      const diff = Math.abs(fretPositions[fIdx] - centsFromOpen);
      if (diff < bestDiff && centsFromOpen >= 0) {
        bestDiff = diff;
        best = { string: sIdx, fret: fIdx, centsOff: centsFromOpen - fretPositions[fIdx] };
      }
    }
  }
  return best;
}

// Get all possible positions for a midi note
export function getAllPositions(midiNote, tuning, instrument) {
  const fretPositions = INSTRUMENTS[instrument].fretPositions;
  const positions = [];

  for (let sIdx = 0; sIdx < tuning.strings.length; sIdx++) {
    const openMidi = tuning.strings[sIdx].midi;
    const centsFromOpen = (midiNote - openMidi) * 100;

    for (let fIdx = 0; fIdx < fretPositions.length; fIdx++) {
      const diff = Math.abs(fretPositions[fIdx] - centsFromOpen);
      if (diff < 30 && centsFromOpen >= 0 && centsFromOpen <= 1200) {
        positions.push({ string: sIdx, fret: fIdx, centsOff: centsFromOpen - fretPositions[fIdx] });
      }
    }
  }
  return positions;
}

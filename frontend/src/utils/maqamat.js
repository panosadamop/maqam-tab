// Maqam/Makam definitions with microtonal intervals
// Intervals in cents from root
// Each maqam has: scale, characteristic notes, seyir pattern, dominant/leading tones

// Helper: quarter-tone = 50 cents, 3/4 tone = 150 cents
const Q = 50;  // quarter tone
const QQ = 150; // three-quarter tone

export const MAQAMAT = {
  // === ARAB MAQAMAT ===
  rast: {
    name: "Rast",
    arabic: "راست",
    turkish: "Rast",
    intervals: [0, 200, 350, 500, 700, 900, 1050, 1200],
    // 350 = neutral 3rd (E half-flat), 1050 = neutral 7th
    characteristic: [350, 700], // neutral 3rd, perfect 5th
    dominant: 700,
    leading: 1050,
    seyir: {
      type: "ascending", // begins from lower register
      start: "lower",
      peak: "upper",
      gestures: ["start_low", "rise_to_5th", "continue_upper", "descend_whole"],
      dominantRegion: [500, 900], // where melody spends most time
    },
    jins: [{ name: "Rast", root: 0 }, { name: "Rast", root: 700 }],
    relatedMaqamat: ["mahur", "suznak"],
    description: "Ο πιο θεμελιώδης μακάμ. Ουδέτερη τρίτη που δίνει χαρακτηριστικό ήχο.",
  },

  bayati: {
    name: "Bayati",
    arabic: "بياتي",
    turkish: "Uşşak/Bayati",
    intervals: [0, 150, 300, 500, 700, 800, 1000, 1200],
    // 150 = three-quarter tone 2nd (D half-flat)
    characteristic: [150, 700],
    dominant: 700,
    leading: 1000,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["start_low_emphasize_2nd", "approach_5th", "upper_exploration", "full_descent"],
      dominantRegion: [500, 800],
    },
    jins: [{ name: "Bayati", root: 0 }, { name: "Rast", root: 700 }],
    relatedMaqamat: ["saba", "husseini"],
    description: "Χαρακτηριστική μικρή δευτέρα (150 cents). Πολύ συναισθηματικός ήχος.",
  },

  hijaz: {
    name: "Hijaz",
    arabic: "حجاز",
    turkish: "Hicaz",
    intervals: [0, 100, 400, 500, 700, 800, 1100, 1200],
    // Augmented 2nd between 2nd and 3rd degrees
    characteristic: [100, 400],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "descending",
      start: "middle",
      peak: "middle",
      gestures: ["start_5th", "emphasis_aug2nd", "return_to_root", "ornament_leading"],
      dominantRegion: [700, 800],
    },
    jins: [{ name: "Hijaz", root: 0 }, { name: "Nahawand", root: 700 }],
    relatedMaqamat: ["hijaz_kar", "zengule"],
    description: "Αυξημένη δευτέρα (300 cents). Έντονα ανατολίτικος χαρακτήρας.",
  },

  nahawand: {
    name: "Nahawand",
    arabic: "نهاوند",
    turkish: "Nihavend",
    intervals: [0, 200, 300, 500, 700, 800, 1100, 1200],
    characteristic: [300, 700],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "descending",
      start: "upper",
      peak: "upper",
      gestures: ["start_upper", "descent_melodic_minor", "resolve_to_root", "raised_6_7_ascending"],
      dominantRegion: [200, 700],
    },
    jins: [{ name: "Nahawand", root: 0 }, { name: "Hijaz", root: 700 }],
    relatedMaqamat: ["farahfaza", "nakriz"],
    description: "Ανάλογο της φυσικής ελάσσονος / μελωδικής ελάσσονος. Λυπητερός ήχος.",
  },

  saba: {
    name: "Saba",
    arabic: "صبا",
    turkish: "Saba",
    intervals: [0, 150, 300, 450, 700, 800, 1000, 1200],
    // Very characteristic: both neutral 2nd and neutral 4th
    characteristic: [150, 450],
    dominant: 700,
    leading: 1000,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "middle",
      gestures: ["start_root", "quarter_tone_approach", "flat_4th_emphasis", "upper_briefly"],
      dominantRegion: [150, 500],
    },
    jins: [{ name: "Saba", root: 0 }, { name: "Hijaz", root: 700 }],
    relatedMaqamat: ["zamzam", "saba_zamzam"],
    description: "Βαθιά θλιμμένος. Η τεταρτότονη τετάρτη (450 cents) είναι ιδιαίτερα χαρακτηριστική.",
  },

  kurd: {
    name: "Kurd",
    arabic: "كرد",
    turkish: "Kürdi",
    intervals: [0, 100, 300, 500, 700, 800, 1000, 1200],
    characteristic: [100, 300],
    dominant: 700,
    leading: 1000,
    seyir: {
      type: "descending",
      start: "middle",
      peak: "upper",
      gestures: ["upper_to_lower", "half_step_emphasis", "resolution"],
      dominantRegion: [200, 700],
    },
    jins: [{ name: "Kurd", root: 0 }, { name: "Rast", root: 700 }],
    relatedMaqamat: ["hijaz"],
    description: "Φρυγικό/Κούρδο τετράχορδο. Ελάχιστη 2η (100 cents).",
  },

  sikah: {
    name: "Sikah",
    arabic: "سيكاه",
    turkish: "Segah",
    intervals: [0, 150, 350, 500, 700, 850, 1050, 1200],
    characteristic: [150, 350],
    dominant: 500,
    leading: 1050,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["begin_lower_octave", "all_neutral_intervals", "modal_resolution"],
      dominantRegion: [350, 700],
    },
    jins: [{ name: "Sikah", root: 0 }, { name: "Sikah", root: 700 }],
    relatedMaqamat: ["iraq", "awj"],
    description: "Πλούσιος σε ουδέτερα διαστήματα. Ξεκινά συχνά από D half-flat.",
  },

  maqamat: {
    name: "Maqamat",
    arabic: "مقامات",
    intervals: [0, 150, 300, 500, 700, 800, 1100, 1200],
    characteristic: [150, 700],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: [],
      dominantRegion: [300, 700],
    },
    jins: [],
    relatedMaqamat: [],
    description: "Παρόμοιο με Bayati με ανυψωμένη 7η στην άνοδο.",
  },

  ajam: {
    name: "Ajam",
    arabic: "عجم",
    turkish: "Acemli",
    intervals: [0, 200, 400, 500, 700, 900, 1100, 1200],
    characteristic: [400, 1100],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["major_scale_movement", "bright_resolution"],
      dominantRegion: [400, 900],
    },
    jins: [{ name: "Ajam", root: 0 }, { name: "Ajam", root: 700 }],
    relatedMaqamat: ["jiharkah"],
    description: "Αντιστοιχεί στη μείζονα κλίμακα. Φωτεινός χαρακτήρας.",
  },

  // === TURKISH MAKAMLAR ===
  hicazkar: {
    name: "Hicazkar",
    arabic: "حجازكار",
    turkish: "Hicazkar",
    intervals: [0, 100, 400, 500, 700, 800, 1100, 1200],
    characteristic: [100, 400, 800],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "mixed",
      start: "lower",
      peak: "upper",
      gestures: ["hijaz_lower", "major_upper", "decorated_descent"],
      dominantRegion: [400, 900],
    },
    jins: [],
    relatedMaqamat: ["hijaz"],
    description: "Συνδυάζει Hijaz τετράχορδο με μείζον πεντάχορδο.",
  },

  husseini: {
    name: "Husseini",
    arabic: "حسيني",
    turkish: "Hüseyni",
    intervals: [0, 150, 350, 500, 700, 850, 1000, 1200],
    characteristic: [150, 350, 850],
    dominant: 700,
    leading: 1000,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["low_start", "neutral_intervals", "high_resolution"],
      dominantRegion: [500, 850],
    },
    jins: [],
    relatedMaqamat: ["bayati", "rast"],
    description: "Πολύ κοντά στον Bayati. Χαρακτηριστικές ουδέτερες εκφράσεις.",
  },
};

// Seyir analysis patterns - for detecting maqam from melodic motion
export const SEYIR_PATTERNS = {
  ascending: {
    weights: {
      start_in_lower_third: 2.0,
      peak_in_upper_register: 1.5,
      lower_density: 0.8,
      upper_density: 1.0,
    },
  },
  descending: {
    weights: {
      start_in_upper_third: 2.0,
      tonic_arrival_rate: 1.5,
      stepwise_descent: 1.2,
    },
  },
  mixed: {
    weights: {
      balanced_register: 1.0,
      multiple_peaks: 1.2,
    },
  },
};

// Get maqam by name
export function getMaqam(name) {
  return MAQAMAT[name.toLowerCase()] || null;
}

// List all maqam names
export function getMaqamList() {
  return Object.entries(MAQAMAT).map(([key, m]) => ({
    key,
    name: m.name,
    arabic: m.arabic,
    description: m.description,
  }));
}

// Compare pitch class sets
export function pitchClassMatch(pitchClasses, maqamIntervals, tolerance = 40) {
  let matches = 0;
  for (const pc of pitchClasses) {
    for (const interval of maqamIntervals) {
      if (Math.abs((pc % 1200) - interval) < tolerance) {
        matches++;
        break;
      }
    }
  }
  return matches / Math.max(pitchClasses.length, maqamIntervals.length);
}

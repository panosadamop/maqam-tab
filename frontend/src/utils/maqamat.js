// Maqam / Makam definitions — comprehensive, ordered by frequency of use
// Intervals in cents from root (0–1200)
// Q = 50¢ (quarter-tone), QQ = 150¢ (three-quarter tone)

const Q  = 50;   // quarter-tone
const QQ = 150;  // three-quarter tone

// ─────────────────────────────────────────────────────────────────────────────
// USAGE TIERS (for ordering and display)
//  1 = Universal / ubiquitous
//  2 = Very common
//  3 = Common
//  4 = Regional / advanced
//  5 = Rare / historical
// ─────────────────────────────────────────────────────────────────────────────

export const MAQAMAT = {

  // ═══════════════════════════════════════════════════════════════════
  // TIER 1 — UNIVERSAL / UBIQUITOUS
  // ═══════════════════════════════════════════════════════════════════

  rast: {
    name: "Rast",
    tier: 1,
    family: "Rast",
    tradition: ["Arab", "Turkish", "Persian"],
    intervals: [0, 200, 350, 500, 700, 900, 1050, 1200],
    characteristic: [350, 700],
    dominant: 700,
    leading: 1050,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["start_low", "rise_to_5th", "continue_upper", "descend_whole"],
      dominantRegion: [500, 900],
    },
    jins: [{ name: "Rast", root: 0 }, { name: "Rast", root: 700 }],
    relatedMaqamat: ["mahur", "suznak", "husseini"],
    description: "The most fundamental maqam. Neutral 3rd (350¢) gives a warm, balanced character. Foundation of Arabic and Turkish classical music.",
  },

  bayati: {
    name: "Bayati",
    tier: 1,
    family: "Bayati",
    tradition: ["Arab", "Turkish"],
    intervals: [0, 150, 300, 500, 700, 800, 1000, 1200],
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
    relatedMaqamat: ["saba", "husseini", "nahawand"],
    description: "Characteristic three-quarter-tone 2nd (150¢). Deeply expressive and emotional. One of the most widely used maqamat.",
  },

  hijaz: {
    name: "Hijaz",
    tier: 1,
    family: "Hijaz",
    tradition: ["Arab", "Turkish", "Persian"],
    intervals: [0, 100, 400, 500, 700, 800, 1100, 1200],
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
    relatedMaqamat: ["hicazkar", "zengule", "shahnaz"],
    description: "The augmented 2nd (300¢ gap between 2nd and 3rd) creates the iconic 'Eastern' sound. Widely used across the Arab world.",
  },

  nahawand: {
    name: "Nahawand",
    tier: 1,
    family: "Nahawand",
    tradition: ["Arab", "Turkish"],
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
    relatedMaqamat: ["farahfaza", "nakriz", "nawa_athar"],
    description: "Equivalent to the natural/melodic minor scale. The most approachable and widely recognised maqam for Western-trained musicians.",
  },

  ajam: {
    name: "Ajam",
    tier: 1,
    family: "Ajam",
    tradition: ["Arab", "Turkish"],
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
    relatedMaqamat: ["jiharkah", "mahur"],
    description: "Equivalent to the Western major scale. 'Ajam' means foreign/non-Arab, reflecting its Western-adjacent sound.",
  },

  husseini: {
    name: "Husseini",
    tier: 1,
    family: "Bayati",
    tradition: ["Arab", "Turkish"],
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
    jins: [{ name: "Bayati", root: 0 }, { name: "Sikah", root: 500 }],
    relatedMaqamat: ["bayati", "rast", "muhayyer"],
    description: "Close to Bayati with a distinctive neutral 3rd. One of the most expressive and frequently used maqamat in Iraqi maqam.",
  },

  saba: {
    name: "Saba",
    tier: 1,
    family: "Bayati",
    tradition: ["Arab", "Turkish"],
    intervals: [0, 150, 300, 450, 700, 800, 1000, 1200],
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
    description: "Deeply sorrowful character. The neutral/flat 4th (450¢) is highly distinctive. Widely associated with grief and lamentation.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // TIER 2 — VERY COMMON
  // ═══════════════════════════════════════════════════════════════════

  kurd: {
    name: "Kurd",
    tier: 2,
    family: "Kurd",
    tradition: ["Arab", "Turkish"],
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
    relatedMaqamat: ["hijaz", "nahawand"],
    description: "Phrygian-derived tetrachord. The semitone 2nd (100¢) gives a tight, inward feeling. Common in Turkish and Arab music.",
  },

  sikah: {
    name: "Sikah",
    tier: 2,
    family: "Sikah",
    tradition: ["Arab", "Turkish"],
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
    relatedMaqamat: ["iraq", "awj_ara"],
    description: "Rich in neutral intervals throughout. Often begins on E half-flat (Sikah pitch). Contemplative and spiritual character.",
  },

  hicazkar: {
    name: "Hicazkar",
    tier: 2,
    family: "Hijaz",
    tradition: ["Turkish", "Arab"],
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
    jins: [{ name: "Hijaz", root: 0 }, { name: "Hijaz", root: 700 }],
    relatedMaqamat: ["hijaz", "shahnaz"],
    description: "Combines a Hijaz tetrachord in the lower and upper registers. Dramatic and grand character.",
  },

  ushshaq: {
    name: "Ushshaq",
    tier: 2,
    family: "Bayati",
    tradition: ["Turkish", "Arab"],
    intervals: [0, 150, 300, 500, 700, 900, 1050, 1200],
    characteristic: [150, 300, 900],
    dominant: 700,
    leading: 1050,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["start_2nd", "lyrical_ascent", "upper_cadence"],
      dominantRegion: [500, 900],
    },
    jins: [{ name: "Ushshaq", root: 0 }, { name: "Rast", root: 700 }],
    relatedMaqamat: ["bayati", "husseini"],
    description: "Very close to Bayati. Upper tetrachord raises the 6th to a major 6th. Used extensively in Ottoman and Arabic classical music.",
  },

  nawa_athar: {
    name: "Nawa Athar",
    tier: 2,
    family: "Hijaz",
    tradition: ["Arab", "Turkish"],
    intervals: [0, 200, 300, 600, 700, 800, 1100, 1200],
    characteristic: [300, 600],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "descending",
      start: "upper",
      peak: "upper",
      gestures: ["upper_start", "augmented_4th_emphasis", "descend_to_root"],
      dominantRegion: [200, 700],
    },
    jins: [{ name: "Nahawand", root: 0 }, { name: "Hijaz", root: 700 }],
    relatedMaqamat: ["nikriz", "athar_kurd"],
    description: "Features an augmented 4th (tritone at 600¢). Striking and dramatic, associated with mystery and intensity.",
  },

  nikriz: {
    name: "Nikriz",
    tier: 2,
    family: "Nahawand",
    tradition: ["Turkish", "Arab"],
    intervals: [0, 200, 300, 600, 700, 900, 1100, 1200],
    characteristic: [300, 600],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["minor_start", "tritone_leap", "upper_major"],
      dominantRegion: [600, 900],
    },
    jins: [{ name: "Nahawand", root: 0 }, { name: "Ajam", root: 700 }],
    relatedMaqamat: ["nawa_athar", "nakriz"],
    description: "Minor lower tetrachord, augmented 4th, major upper. Combines brightness and tension.",
  },

  suznak: {
    name: "Suznak",
    tier: 2,
    family: "Rast",
    tradition: ["Turkish", "Arab"],
    intervals: [0, 200, 350, 500, 700, 800, 1100, 1200],
    characteristic: [350, 800, 1100],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["rast_lower", "hijaz_upper", "strong_cadence"],
      dominantRegion: [500, 900],
    },
    jins: [{ name: "Rast", root: 0 }, { name: "Hijaz", root: 700 }],
    relatedMaqamat: ["rast", "hijaz"],
    description: "Rast lower tetrachord with a Hijaz upper pentachord. Combines warmth with drama.",
  },

  segah: {
    name: "Segah",
    tier: 2,
    family: "Sikah",
    tradition: ["Turkish", "Persian"],
    intervals: [0, 150, 350, 500, 700, 850, 1050, 1200],
    characteristic: [150, 350],
    dominant: 700,
    leading: 1050,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["lower_register_start", "neutral_second_emphasis", "upper_resolution"],
      dominantRegion: [350, 700],
    },
    jins: [{ name: "Sikah", root: 0 }, { name: "Rast", root: 500 }],
    relatedMaqamat: ["sikah", "iraq"],
    description: "Turkish version of Sikah with different upper structure. Central to Turkish classical music and saz repertoire.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // TIER 3 — COMMON
  // ═══════════════════════════════════════════════════════════════════

  mahur: {
    name: "Mahur",
    tier: 3,
    family: "Rast",
    tradition: ["Turkish", "Persian"],
    intervals: [0, 200, 400, 500, 700, 900, 1100, 1200],
    characteristic: [400, 700],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["major_start", "bright_ascent", "resolving_cadence"],
      dominantRegion: [400, 900],
    },
    jins: [{ name: "Ajam", root: 0 }, { name: "Ajam", root: 700 }],
    relatedMaqamat: ["ajam", "rast"],
    description: "Major scale, same as Ajam but starting on a different degree in practice. Majestic and bright character.",
  },

  chahargah: {
    name: "Chahargah",
    tier: 3,
    family: "Hijaz",
    tradition: ["Persian", "Azerbaijani"],
    intervals: [0, 150, 400, 500, 700, 850, 1100, 1200],
    characteristic: [150, 400, 850],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["augmented_2nd_lower", "dramatic_ascent", "brilliant_upper"],
      dominantRegion: [500, 900],
    },
    jins: [{ name: "Chahargah", root: 0 }, { name: "Chahargah", root: 700 }],
    relatedMaqamat: ["hijaz", "segah"],
    description: "Persian/Azerbaijani dastgah. Augmented 2nds in both tetrachords. Energetic and virtuosic character.",
  },

  shur: {
    name: "Shur",
    tier: 3,
    family: "Bayati",
    tradition: ["Persian", "Azerbaijani"],
    intervals: [0, 150, 300, 500, 700, 800, 1000, 1200],
    characteristic: [150, 300],
    dominant: 700,
    leading: 1000,
    seyir: {
      type: "descending",
      start: "upper",
      peak: "upper",
      gestures: ["upper_descent", "neutral_2nd_approach", "root_resolution"],
      dominantRegion: [300, 700],
    },
    jins: [{ name: "Shur", root: 0 }, { name: "Shur", root: 700 }],
    relatedMaqamat: ["bayati", "dashti"],
    description: "The most important Persian dastgah. Lyrical and melancholic. Closely related to Bayati.",
  },

  dashti: {
    name: "Dashti",
    tier: 3,
    family: "Bayati",
    tradition: ["Persian"],
    intervals: [0, 150, 300, 500, 700, 800, 950, 1200],
    characteristic: [150, 950],
    dominant: 700,
    leading: 950,
    seyir: {
      type: "descending",
      start: "upper",
      peak: "upper",
      gestures: ["upper_descent", "flat_7th_character", "root_resolution"],
      dominantRegion: [300, 700],
    },
    jins: [{ name: "Shur", root: 0 }],
    relatedMaqamat: ["shur", "bayati"],
    description: "A branch of Shur dastgah. The lowered 7th (950¢) creates a pastoral, open-air feeling.",
  },

  homayoun: {
    name: "Homayoun",
    tier: 3,
    family: "Hijaz",
    tradition: ["Persian"],
    intervals: [0, 150, 400, 500, 700, 800, 1100, 1200],
    characteristic: [150, 400],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["neutral_2nd_start", "aug_2nd_tension", "upper_release"],
      dominantRegion: [500, 900],
    },
    jins: [{ name: "Shur", root: 0 }, { name: "Hijaz", root: 700 }],
    relatedMaqamat: ["shur", "chahargah"],
    description: "A branch of Shur with an augmented 2nd. Noble and majestic character in Persian tradition.",
  },

  shadd_araban: {
    name: "Shadd Araban",
    tier: 3,
    family: "Hijaz",
    tradition: ["Arab"],
    intervals: [0, 100, 400, 500, 700, 800, 1100, 1200],
    characteristic: [100, 400],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "descending",
      start: "upper",
      peak: "upper",
      gestures: ["upper_start", "hijaz_descent", "strong_cadence"],
      dominantRegion: [400, 800],
    },
    jins: [{ name: "Hijaz", root: 0 }],
    relatedMaqamat: ["hijaz", "hicazkar"],
    description: "Reinforced Hijaz. The upper structure emphasises the dramatic leaps. Used in Arabic film music.",
  },

  zanjaran: {
    name: "Zanjaran",
    tier: 3,
    family: "Bayati",
    tradition: ["Arab"],
    intervals: [0, 150, 300, 500, 700, 900, 1050, 1200],
    characteristic: [150, 900],
    dominant: 700,
    leading: 1050,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["bayati_lower", "rast_upper"],
      dominantRegion: [500, 900],
    },
    jins: [{ name: "Bayati", root: 0 }, { name: "Rast", root: 700 }],
    relatedMaqamat: ["bayati", "ushshaq"],
    description: "Bayati lower tetrachord with Rast upper. Bridges the two most common maqamat.",
  },

  farahfaza: {
    name: "Farahfaza",
    tier: 3,
    family: "Nahawand",
    tradition: ["Arab"],
    intervals: [0, 200, 300, 500, 700, 800, 1000, 1200],
    characteristic: [300, 700, 800],
    dominant: 700,
    leading: 1000,
    seyir: {
      type: "descending",
      start: "upper",
      peak: "upper",
      gestures: ["upper_start", "natural_minor_descent"],
      dominantRegion: [200, 700],
    },
    jins: [{ name: "Nahawand", root: 0 }, { name: "Kurd", root: 700 }],
    relatedMaqamat: ["nahawand", "nakriz"],
    description: "Natural minor (Aeolian) scale. One of the simplest and most widely heard maqamat.",
  },

  iraq: {
    name: "Iraq",
    tier: 3,
    family: "Sikah",
    tradition: ["Arab", "Iraqi"],
    intervals: [0, 150, 350, 500, 650, 850, 1050, 1200],
    characteristic: [150, 650],
    dominant: 650,
    leading: 1050,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["neutral_heavy", "characteristic_5th", "descend_with_inflections"],
      dominantRegion: [350, 700],
    },
    jins: [{ name: "Sikah", root: 0 }],
    relatedMaqamat: ["sikah", "awj_ara"],
    description: "Characteristic to Iraqi maqam tradition. Rich neutral intervals including a flat 5th (650¢).",
  },

  athar_kurd: {
    name: "Athar Kurd",
    tier: 3,
    family: "Hijaz",
    tradition: ["Turkish", "Arab"],
    intervals: [0, 100, 300, 600, 700, 800, 1100, 1200],
    characteristic: [100, 300, 600],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "descending",
      start: "upper",
      peak: "upper",
      gestures: ["upper_start", "tritone_descent", "kurd_resolution"],
      dominantRegion: [300, 700],
    },
    jins: [{ name: "Kurd", root: 0 }, { name: "Hijaz", root: 700 }],
    relatedMaqamat: ["nawa_athar", "kurd"],
    description: "Kurd lower with augmented 4th and Hijaz upper. Dark and mysterious character.",
  },

  jiharkah: {
    name: "Jiharkah",
    tier: 3,
    family: "Rast",
    tradition: ["Arab"],
    intervals: [0, 200, 350, 500, 700, 900, 1100, 1200],
    characteristic: [350, 900],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["rast_lower", "major_upper_raised_7"],
      dominantRegion: [500, 900],
    },
    jins: [{ name: "Rast", root: 0 }, { name: "Ajam", root: 700 }],
    relatedMaqamat: ["rast", "ajam"],
    description: "Rast lower tetrachord with a raised 7th in the upper. Bright and optimistic variant of Rast.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // TIER 4 — REGIONAL / ADVANCED
  // ═══════════════════════════════════════════════════════════════════

  muhayyer: {
    name: "Muhayyer",
    tier: 4,
    family: "Bayati",
    tradition: ["Turkish", "Arab"],
    intervals: [0, 150, 350, 500, 700, 850, 1050, 1200],
    characteristic: [150, 850],
    dominant: 500,
    leading: 1050,
    seyir: {
      type: "descending",
      start: "upper",
      peak: "upper",
      gestures: ["start_octave_A", "descend_neutral", "cadence_low"],
      dominantRegion: [500, 850],
    },
    jins: [{ name: "Bayati", root: 0 }],
    relatedMaqamat: ["husseini", "bayati"],
    description: "Bayati starting on the 5th degree. A transposition that creates a higher, more tense register.",
  },

  saba_zamzam: {
    name: "Saba Zamzam",
    tier: 4,
    family: "Bayati",
    tradition: ["Arab"],
    intervals: [0, 150, 300, 450, 600, 800, 1000, 1200],
    characteristic: [150, 450, 600],
    dominant: 600,
    leading: 1000,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "middle",
      gestures: ["saba_opening", "tritone_characteristic"],
      dominantRegion: [150, 500],
    },
    jins: [{ name: "Saba", root: 0 }],
    relatedMaqamat: ["saba"],
    description: "Variant of Saba with a tritone in the upper structure. Intensifies the mournful quality of Saba.",
  },

  awj_ara: {
    name: "Awj Ara",
    tier: 4,
    family: "Sikah",
    tradition: ["Arab", "Turkish"],
    intervals: [0, 150, 350, 500, 700, 800, 1050, 1200],
    characteristic: [150, 350, 1050],
    dominant: 500,
    leading: 1050,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["sikah_opening", "upper_neutral"],
      dominantRegion: [350, 700],
    },
    jins: [{ name: "Sikah", root: 0 }],
    relatedMaqamat: ["sikah", "iraq"],
    description: "Variant of Sikah emphasising the high neutral 7th. Used in Turkish classical for expressing longing.",
  },

  mustar: {
    name: "Mustar",
    tier: 4,
    family: "Rast",
    tradition: ["Arab"],
    intervals: [0, 200, 350, 500, 700, 800, 1050, 1200],
    characteristic: [350, 800],
    dominant: 700,
    leading: 1050,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["rast_lower", "flat_6th_upper"],
      dominantRegion: [500, 800],
    },
    jins: [{ name: "Rast", root: 0 }, { name: "Bayati", root: 700 }],
    relatedMaqamat: ["rast", "bayati"],
    description: "Rast lower with a flat 6th in the upper. Combines warmth with a touch of melancholy.",
  },

  buselik: {
    name: "Buselik",
    tier: 4,
    family: "Nahawand",
    tradition: ["Turkish"],
    intervals: [0, 200, 300, 500, 700, 900, 1000, 1200],
    characteristic: [300, 900],
    dominant: 700,
    leading: 1000,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["dorian_character", "major_6th_emphasis"],
      dominantRegion: [400, 900],
    },
    jins: [{ name: "Nahawand", root: 0 }, { name: "Buselik", root: 700 }],
    relatedMaqamat: ["nahawand", "ushshaq"],
    description: "Turkish makam resembling Dorian mode. Common in classical Ottoman music.",
  },

  kurdilihicazkar: {
    name: "Kurdilihicazkar",
    tier: 4,
    family: "Kurd",
    tradition: ["Turkish"],
    intervals: [0, 100, 300, 500, 700, 800, 1100, 1200],
    characteristic: [100, 300, 1100],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "mixed",
      start: "lower",
      peak: "upper",
      gestures: ["kurd_lower", "hijaz_upper"],
      dominantRegion: [400, 900],
    },
    jins: [{ name: "Kurd", root: 0 }, { name: "Hijaz", root: 700 }],
    relatedMaqamat: ["kurd", "hicazkar"],
    description: "Kurd lower tetrachord with Hijaz upper pentachord. Dark lower register contrasts bright upper.",
  },

  sazkar: {
    name: "Sazkar",
    tier: 4,
    family: "Rast",
    tradition: ["Turkish"],
    intervals: [0, 200, 350, 500, 700, 800, 1050, 1200],
    characteristic: [350, 800, 1050],
    dominant: 700,
    leading: 1050,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["rast_lower", "bayati_upper"],
      dominantRegion: [500, 850],
    },
    jins: [{ name: "Rast", root: 0 }, { name: "Bayati", root: 700 }],
    relatedMaqamat: ["rast", "bayati"],
    description: "Rast tetrachord combined with a Bayati upper. Warm lower, emotional upper.",
  },

  shahnaz: {
    name: "Shahnaz",
    tier: 4,
    family: "Hijaz",
    tradition: ["Turkish", "Persian"],
    intervals: [0, 100, 400, 500, 650, 800, 1100, 1200],
    characteristic: [100, 400, 650],
    dominant: 650,
    leading: 1100,
    seyir: {
      type: "descending",
      start: "upper",
      peak: "upper",
      gestures: ["hijaz_start", "flat_5th_character"],
      dominantRegion: [400, 700],
    },
    jins: [{ name: "Hijaz", root: 0 }],
    relatedMaqamat: ["hijaz", "hicazkar"],
    description: "Hijaz with a flat 5th (650¢). Creates an unusually tense and exotic atmosphere.",
  },

  bayati_shuri: {
    name: "Bayati Shuri",
    tier: 4,
    family: "Bayati",
    tradition: ["Arab"],
    intervals: [0, 150, 300, 500, 700, 800, 950, 1200],
    characteristic: [150, 950],
    dominant: 700,
    leading: 950,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["bayati_opening", "flat_7th_close"],
      dominantRegion: [500, 800],
    },
    jins: [{ name: "Bayati", root: 0 }],
    relatedMaqamat: ["bayati", "shur"],
    description: "Bayati combined with a Persian Shur influence in the upper register.",
  },

  isfahan: {
    name: "Isfahan",
    tier: 4,
    family: "Rast",
    tradition: ["Persian", "Turkish"],
    intervals: [0, 200, 350, 500, 700, 850, 1050, 1200],
    characteristic: [350, 850],
    dominant: 700,
    leading: 1050,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["rast_lower", "husseini_upper", "warm_cadence"],
      dominantRegion: [500, 850],
    },
    jins: [{ name: "Rast", root: 0 }, { name: "Husseini", root: 700 }],
    relatedMaqamat: ["rast", "husseini"],
    description: "Named after the Persian city. Combines warmth of Rast with expressive upper register. Lyrical and romantic.",
  },

  hijaz_kar_kurd: {
    name: "Hijaz Kar Kurd",
    tier: 4,
    family: "Hijaz",
    tradition: ["Turkish"],
    intervals: [0, 100, 400, 500, 700, 800, 1100, 1200],
    characteristic: [100, 400, 700],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["kurd_intro", "hijaz_development"],
      dominantRegion: [400, 800],
    },
    jins: [{ name: "Kurd", root: 0 }, { name: "Hijaz", root: 700 }],
    relatedMaqamat: ["hicazkar", "kurd"],
    description: "Kurd lower register opening into Hijaz. Creates contrast between tight lower and dramatic upper.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // TIER 5 — RARE / HISTORICAL / SPECIALISED
  // ═══════════════════════════════════════════════════════════════════

  lami: {
    name: "Lami",
    tier: 5,
    family: "Bayati",
    tradition: ["Iraqi"],
    intervals: [0, 150, 300, 500, 700, 850, 1000, 1200],
    characteristic: [150, 850],
    dominant: 700,
    leading: 1000,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["bayati_base", "flat_6th_colour"],
      dominantRegion: [500, 850],
    },
    jins: [{ name: "Bayati", root: 0 }],
    relatedMaqamat: ["bayati", "husseini"],
    description: "Iraqi maqam tradition. Close to Husseini with slight interval differences. Used in Baghdad classical maqam.",
  },

  awshar: {
    name: "Awshar",
    tier: 5,
    family: "Nahawand",
    tradition: ["Iraqi"],
    intervals: [0, 150, 300, 500, 700, 800, 1100, 1200],
    characteristic: [150, 300],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "descending",
      start: "upper",
      peak: "upper",
      gestures: ["upper_start", "neutral_2nd_descent"],
      dominantRegion: [300, 700],
    },
    jins: [{ name: "Bayati", root: 0 }, { name: "Hijaz", root: 700 }],
    relatedMaqamat: ["nahawand", "bayati"],
    description: "Characteristic to Iraqi maqam tradition. Bayati lower, Hijaz upper.",
  },

  penchgah: {
    name: "Penchgah",
    tier: 5,
    family: "Rast",
    tradition: ["Turkish", "Persian"],
    intervals: [0, 200, 400, 500, 700, 900, 1050, 1200],
    characteristic: [400, 1050],
    dominant: 700,
    leading: 1050,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["major_lower", "rast_upper"],
      dominantRegion: [400, 900],
    },
    jins: [{ name: "Ajam", root: 0 }, { name: "Rast", root: 700 }],
    relatedMaqamat: ["mahur", "rast"],
    description: "Major lower tetrachord with Rast upper. Combines brightness with warmth.",
  },

  mustaar: {
    name: "Mustaar",
    tier: 5,
    family: "Sikah",
    tradition: ["Turkish"],
    intervals: [0, 200, 350, 500, 700, 900, 1050, 1200],
    characteristic: [350, 900],
    dominant: 700,
    leading: 1050,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["rast_lower", "major_6th_rast_upper"],
      dominantRegion: [500, 900],
    },
    jins: [{ name: "Rast", root: 0 }, { name: "Rast", root: 700 }],
    relatedMaqamat: ["rast", "sikah"],
    description: "Double Rast structure with raised 6th. Serene and expansive character.",
  },

  nairuz: {
    name: "Nairuz",
    tier: 5,
    family: "Rast",
    tradition: ["Arab"],
    intervals: [0, 200, 350, 500, 700, 900, 1100, 1200],
    characteristic: [350, 1100],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["rast_lower", "raised_7th"],
      dominantRegion: [500, 900],
    },
    jins: [{ name: "Rast", root: 0 }, { name: "Ajam", root: 700 }],
    relatedMaqamat: ["rast", "jiharkah"],
    description: "Rast with a raised natural 7th. Festive and bright. Associated with spring celebrations.",
  },

  bastah_nikar: {
    name: "Bastah Nikar",
    tier: 5,
    family: "Hijaz",
    tradition: ["Arab"],
    intervals: [0, 100, 400, 500, 700, 900, 1100, 1200],
    characteristic: [100, 400, 900],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["hijaz_lower", "major_upper_6"],
      dominantRegion: [400, 900],
    },
    jins: [{ name: "Hijaz", root: 0 }, { name: "Ajam", root: 700 }],
    relatedMaqamat: ["hijaz", "ajam"],
    description: "Hijaz lower with a major 6th in the upper pentachord. Creates contrast between dramatic lower and bright upper.",
  },

  murassa: {
    name: "Murassa",
    tier: 5,
    family: "Hijaz",
    tradition: ["Arab"],
    intervals: [0, 100, 300, 500, 700, 800, 1100, 1200],
    characteristic: [100, 300, 800],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "descending",
      start: "upper",
      peak: "upper",
      gestures: ["upper_hijaz", "kurd_lower_cadence"],
      dominantRegion: [400, 800],
    },
    jins: [{ name: "Kurd", root: 0 }, { name: "Hijaz", root: 700 }],
    relatedMaqamat: ["hijaz", "kurd"],
    description: "Embellished Hijaz variant. 'Murassa' means jewelled/encrusted. Ornate and refined character.",
  },

  mazmum: {
    name: "Mazmum",
    tier: 5,
    family: "Bayati",
    tradition: ["Arab"],
    intervals: [0, 150, 300, 500, 700, 900, 1100, 1200],
    characteristic: [150, 300],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["bayati_lower", "major_upper"],
      dominantRegion: [500, 900],
    },
    jins: [{ name: "Bayati", root: 0 }, { name: "Ajam", root: 700 }],
    relatedMaqamat: ["bayati", "ajam"],
    description: "Bayati lower tetrachord with a major upper pentachord. Creates an uplifting resolution after a dark opening.",
  },

  nawakht: {
    name: "Nawakht",
    tier: 5,
    family: "Nahawand",
    tradition: ["Arab"],
    intervals: [0, 200, 300, 600, 700, 900, 1100, 1200],
    characteristic: [300, 600],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["minor_start", "augmented_4th", "major_upper"],
      dominantRegion: [600, 900],
    },
    jins: [{ name: "Nahawand", root: 0 }, { name: "Ajam", root: 700 }],
    relatedMaqamat: ["nikriz", "nawa_athar"],
    description: "Minor lower, tritone, then major upper. Dramatic arc from darkness to brightness.",
  },

  bayati_ajam: {
    name: "Bayati Ajam",
    tier: 5,
    family: "Bayati",
    tradition: ["Arab"],
    intervals: [0, 150, 300, 500, 700, 900, 1100, 1200],
    characteristic: [150, 900, 1100],
    dominant: 700,
    leading: 1100,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["bayati_lower", "ajam_upper"],
      dominantRegion: [500, 1000],
    },
    jins: [{ name: "Bayati", root: 0 }, { name: "Ajam", root: 700 }],
    relatedMaqamat: ["bayati", "ajam"],
    description: "Bayati opening with a major upper. Emotional depth from Bayati with a hopeful major resolution.",
  },

  rast_jadid: {
    name: "Rast Jadid",
    tier: 5,
    family: "Rast",
    tradition: ["Arab"],
    intervals: [0, 200, 350, 500, 700, 850, 1050, 1200],
    characteristic: [350, 850],
    dominant: 700,
    leading: 1050,
    seyir: {
      type: "ascending",
      start: "lower",
      peak: "upper",
      gestures: ["rast_lower", "neutral_upper_inflection"],
      dominantRegion: [500, 900],
    },
    jins: [{ name: "Rast", root: 0 }, { name: "Husseini", root: 700 }],
    relatedMaqamat: ["rast", "husseini"],
    description: "New/modern Rast. Rast lower with Husseini upper. Contemporary development of the Rast family.",
  },

};

// ─────────────────────────────────────────────────────────────────────────────

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

export function getMaqam(name) {
  return MAQAMAT[name.toLowerCase()] || null;
}

export function getMaqamList() {
  return Object.entries(MAQAMAT).map(([key, m]) => ({
    key,
    name: m.name,
    tier: m.tier,
    family: m.family,
    tradition: m.tradition,
    description: m.description,
  }));
}

export function getMaqamsByTier() {
  const groups = {};
  for (const [key, m] of Object.entries(MAQAMAT)) {
    const t = m.tier;
    if (!groups[t]) groups[t] = [];
    groups[t].push({ key, ...m });
  }
  return groups;
}

export function getMaqamsByFamily() {
  const groups = {};
  for (const [key, m] of Object.entries(MAQAMAT)) {
    const f = m.family || "Other";
    if (!groups[f]) groups[f] = [];
    groups[f].push({ key, ...m });
  }
  return groups;
}

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

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
      {
        id: "arabic_d_bass",
        name: "Arabic — D Bass",
        region: "Arabic",
        description: "D2-F2-A2-D3-G3-C4. Διευκολύνει Μακάμ Ραστ με ανοιχτές χορδές.",
        strings: [
          { midi: 38, name: "D2",  course: 1 },
          { midi: 41, name: "F2",  course: 2 },
          { midi: 45, name: "A2",  course: 3 },
          { midi: 50, name: "D3",  course: 4 },
          { midi: 55, name: "G3",  course: 5 },
          { midi: 60, name: "C4",  course: 6 },
        ],
      },
      {
        id: "arabic_f_bass",
        name: "Arabic — F Bass (5-course)",
        region: "Arabic",
        description: "5 κορσέ: F2-A2-D3-G3-C4. Ελαφρύτερο χωρίς χαμηλό C.",
        strings: [
          { midi: 41, name: "F2",  course: 1 },
          { midi: 45, name: "A2",  course: 2 },
          { midi: 50, name: "D3",  course: 3 },
          { midi: 55, name: "G3",  course: 4 },
          { midi: 60, name: "C4",  course: 5 },
        ],
      },
      {
        id: "arabic_g_bass",
        name: "Arabic — G Bass",
        region: "Arabic",
        description: "G2-F2-A2-D3-G3-C4. Khaleeji μουσική Κόλπου.",
        strings: [
          { midi: 43, name: "G2",  course: 1 },
          { midi: 41, name: "F2",  course: 2 },
          { midi: 45, name: "A2",  course: 3 },
          { midi: 50, name: "D3",  course: 4 },
          { midi: 55, name: "G3",  course: 5 },
          { midi: 60, name: "C4",  course: 6 },
        ],
      },
      {
        id: "arabic_bb_bass",
        name: "Arabic — Bb Bass",
        region: "Arabic",
        description: "Bb1-F2-A2-D3-G3-C4. Για Μακάμ Σάμπα.",
        strings: [
          { midi: 34, name: "Bb1", course: 1 },
          { midi: 41, name: "F2",  course: 2 },
          { midi: 45, name: "A2",  course: 3 },
          { midi: 50, name: "D3",  course: 4 },
          { midi: 55, name: "G3",  course: 5 },
          { midi: 60, name: "C4",  course: 6 },
        ],
      },
      {
        id: "arabic_b_bass",
        name: "Arabic — B Bass",
        region: "Arabic",
        description: "B1-F2-A2-D3-G3-C4. Για Μακάμ Χιτζάζ.",
        strings: [
          { midi: 35, name: "B1",  course: 1 },
          { midi: 41, name: "F2",  course: 2 },
          { midi: 45, name: "A2",  course: 3 },
          { midi: 50, name: "D3",  course: 4 },
          { midi: 55, name: "G3",  course: 5 },
          { midi: 60, name: "C4",  course: 6 },
        ],
      },
      {
        id: "arabic_c_bass",
        name: "Arabic — C Bass (alt)",
        region: "Arabic",
        description: "C3-A2-D3-G3-C4-F4. Εναλλακτική αραβική παραλλαγή.",
        strings: [
          { midi: 48, name: "C3",  course: 1 },
          { midi: 45, name: "A2",  course: 2 },
          { midi: 50, name: "D3",  course: 3 },
          { midi: 55, name: "G3",  course: 4 },
          { midi: 60, name: "C4",  course: 5 },
          { midi: 65, name: "F4",  course: 6 },
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
      {
        id: "turkish_e_bass",
        name: "Turkish — E Bass",
        region: "Turkish",
        description: "E2-B2-E3-A3-D4-G4. Κοινό στη Fasıl και Sanat μουσική.",
        strings: [
          { midi: 40, name: "E2",  course: 1 },
          { midi: 47, name: "B2",  course: 2 },
          { midi: 52, name: "E3",  course: 3 },
          { midi: 57, name: "A3",  course: 4 },
          { midi: 62, name: "D4",  course: 5 },
          { midi: 67, name: "G4",  course: 6 },
        ],
      },
      {
        id: "turkish_f_bass",
        name: "Turkish — D Alt",
        region: "Turkish",
        description: "D2-A2-D3-G3-C4-F4. Εναλλακτικό τουρκικό κούρδισμα.",
        strings: [
          { midi: 38, name: "D2",  course: 1 },
          { midi: 45, name: "A2",  course: 2 },
          { midi: 50, name: "D3",  course: 3 },
          { midi: 55, name: "G3",  course: 4 },
          { midi: 60, name: "C4",  course: 5 },
          { midi: 65, name: "F4",  course: 6 },
        ],
      },
      {
        id: "turkish_rauf_yekta",
        name: "Turkish — Rauf Yekta",
        region: "Turkish",
        description: "Αρχές 20ού αιώνα (Rauf Yekta Bey): C2-F2-A2-D3-G3-C4.",
        strings: [
          { midi: 36, name: "C2",  course: 1 },
          { midi: 41, name: "F2",  course: 2 },
          { midi: 45, name: "A2",  course: 3 },
          { midi: 50, name: "D3",  course: 4 },
          { midi: 55, name: "G3",  course: 5 },
          { midi: 60, name: "C4",  course: 6 },
        ],
      },
      // ── PERSIAN / IRANIAN ────────────────────────────────────────────────
      // Barbat: C2 F2 Bb2 Eb3 Ab3 Db4 (all perfect 4ths)
      {
        id: "persian_standard",
        name: "Persian Standard",
        region: "Persian",
        description: "Ιρανικό μπαρμπάτ, όλες τέταρτες: C2-F2-Bb2-Eb3-Ab3-Db4.",
        strings: [
          { midi: 36, name: "C2",  course: 1 },
          { midi: 41, name: "F2",  course: 2 },
          { midi: 46, name: "Bb2", course: 3 },
          { midi: 51, name: "Eb3", course: 4 },
          { midi: 56, name: "Ab3", course: 5 },
          { midi: 61, name: "Db4", course: 6 },
        ],
      },
      {
        id: "persian_d_standard",
        name: "Persian — D Standard",
        region: "Persian",
        description: "D2-G2-C3-F3-A3-D4. Για Dastgah Shur και Chahargah.",
        strings: [
          { midi: 38, name: "D2",  course: 1 },
          { midi: 43, name: "G2",  course: 2 },
          { midi: 48, name: "C3",  course: 3 },
          { midi: 53, name: "F3",  course: 4 },
          { midi: 57, name: "A3",  course: 5 },
          { midi: 62, name: "D4",  course: 6 },
        ],
      },
      {
        id: "persian_a_standard",
        name: "Persian — A Standard",
        region: "Persian",
        description: "G1-C2-F2-Bb2-D3-G3. Για Dastgah Segah και Homayoun.",
        strings: [
          { midi: 31, name: "G1",  course: 1 },
          { midi: 36, name: "C2",  course: 2 },
          { midi: 41, name: "F2",  course: 3 },
          { midi: 46, name: "Bb2", course: 4 },
          { midi: 50, name: "D3",  course: 5 },
          { midi: 55, name: "G3",  course: 6 },
        ],
      },
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
      {
        id: "iraqi_munir_bashir",
        name: "Iraqi — Munir Bashir",
        region: "Iraqi",
        description: "Χρωματικό κούρδισμα Munir Bashir: C2-F2-Bb2-Eb3-Ab3-Db4.",
        strings: [
          { midi: 36, name: "C2",  course: 1 },
          { midi: 41, name: "F2",  course: 2 },
          { midi: 46, name: "Bb2", course: 3 },
          { midi: 51, name: "Eb3", course: 4 },
          { midi: 56, name: "Ab3", course: 5 },
          { midi: 61, name: "Db4", course: 6 },
        ],
      },
      {
        id: "iraqi_naseer_shamma",
        name: "Iraqi — Naseer Shamma",
        region: "Iraqi",
        description: "Σύγχρονο κούρδισμα Naseer Shamma: D2-G2-C3-F3-A3-D4.",
        strings: [
          { midi: 38, name: "D2",  course: 1 },
          { midi: 43, name: "G2",  course: 2 },
          { midi: 48, name: "C3",  course: 3 },
          { midi: 53, name: "F3",  course: 4 },
          { midi: 57, name: "A3",  course: 5 },
          { midi: 62, name: "D4",  course: 6 },
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
      {
        id: "moroccan_standard",
        name: "Moroccan Standard",
        region: "North African",
        description: "Μαροκινό Ανδαλουσιανό: C2-F2-A2-D3-G3-C4. Malhun και Gharnati.",
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
        id: "andalusian",
        name: "Andalusian / Moorish",
        region: "North African",
        description: "Ιστορικό Μαυριτανικό: C2-G2-D3-A3-D4-G4. Αλγερία και Τυνησία.",
        strings: [
          { midi: 36, name: "C2",  course: 1 },
          { midi: 43, name: "G2",  course: 2 },
          { midi: 50, name: "D3",  course: 3 },
          { midi: 57, name: "A3",  course: 4 },
          { midi: 62, name: "D4",  course: 5 },
          { midi: 67, name: "G4",  course: 6 },
        ],
      },
      {
        id: "tunisian_standard",
        name: "Tunisian Standard",
        region: "North African",
        description: "Τυνησιακό ma'luf: D2-G2-C3-F3-Bb3-Eb4.",
        strings: [
          { midi: 38, name: "D2",  course: 1 },
          { midi: 43, name: "G2",  course: 2 },
          { midi: 48, name: "C3",  course: 3 },
          { midi: 53, name: "F3",  course: 4 },
          { midi: 58, name: "Bb3", course: 5 },
          { midi: 63, name: "Eb4", course: 6 },
        ],
      },
      // ── ARMENIAN ─────────────────────────────────────────────────────────
      {
        id: "armenian_standard",
        name: "Armenian Standard",
        region: "Armenian",
        description: "Αρμενικό ούτι: D2-G2-C3-F3-A3-D4.",
        strings: [
          { midi: 38, name: "D2",  course: 1 },
          { midi: 43, name: "G2",  course: 2 },
          { midi: 48, name: "C3",  course: 3 },
          { midi: 53, name: "F3",  course: 4 },
          { midi: 57, name: "A3",  course: 5 },
          { midi: 62, name: "D4",  course: 6 },
        ],
      },
      {
        id: "armenian_low",
        name: "Armenian — Low",
        region: "Armenian",
        description: "Χαμηλό αρμενικό: C2-F2-A2-D3-G3-C4. Σκοτεινότερος χαρακτήρας.",
        strings: [
          { midi: 36, name: "C2",  course: 1 },
          { midi: 41, name: "F2",  course: 2 },
          { midi: 45, name: "A2",  course: 3 },
          { midi: 50, name: "D3",  course: 4 },
          { midi: 55, name: "G3",  course: 5 },
          { midi: 60, name: "C4",  course: 6 },
        ],
      },
      // ── GREEK ────────────────────────────────────────────────────────────
      {
        id: "greek_standard",
        name: "Greek Standard",
        region: "Greek",
        description: "Ελληνικό ούτι (λαοτοειδές): C2-F2-A2-D3-G3-C4. Ρεμπέτικο και λαϊκά.",
        strings: [
          { midi: 36, name: "C2",  course: 1 },
          { midi: 41, name: "F2",  course: 2 },
          { midi: 45, name: "A2",  course: 3 },
          { midi: 50, name: "D3",  course: 4 },
          { midi: 55, name: "G3",  course: 5 },
          { midi: 60, name: "C4",  course: 6 },
        ],
      },
      // ── SPECIAL / OPEN ───────────────────────────────────────────────────
      {
        id: "open_d",
        name: "Open D",
        region: "Special",
        description: "Ανοιχτή ρε μείζονα. Για drone και slide παίξιμο.",
        strings: [
          { midi: 38, name: "D2",  course: 1 },
          { midi: 45, name: "A2",  course: 2 },
          { midi: 50, name: "D3",  course: 3 },
          { midi: 54, name: "F#3", course: 4 },
          { midi: 57, name: "A3",  course: 5 },
          { midi: 62, name: "D4",  course: 6 },
        ],
      },
      {
        id: "open_g",
        name: "Open G",
        region: "Special",
        description: "Ανοιχτή σολ μείζονα. Σύγχρονο και fusion στυλ.",
        strings: [
          { midi: 38, name: "D2",  course: 1 },
          { midi: 43, name: "G2",  course: 2 },
          { midi: 50, name: "D3",  course: 3 },
          { midi: 55, name: "G3",  course: 4 },
          { midi: 59, name: "B3",  course: 5 },
          { midi: 62, name: "D4",  course: 6 },
        ],
      },
      {
        id: "drop_c",
        name: "Drop C",
        region: "Special",
        description: "C2 στο μπάσο για εκτεταμένο χαμηλό εύρος.",
        strings: [
          { midi: 36, name: "C2",  course: 1 },
          { midi: 45, name: "A2",  course: 2 },
          { midi: 50, name: "D3",  course: 3 },
          { midi: 55, name: "G3",  course: 4 },
          { midi: 59, name: "B3",  course: 5 },
          { midi: 64, name: "E4",  course: 6 },
        ],
      },
      {
        id: "cgdaec",
        name: "C G D A E C",
        region: "Special",
        description: "Συμμετρικό C: C2-G2-D3-A3-E4-C4. Σύγχρονο fusion ούτι.",
        strings: [
          { midi: 36, name: "C2",  course: 1 },
          { midi: 43, name: "G2",  course: 2 },
          { midi: 50, name: "D3",  course: 3 },
          { midi: 57, name: "A3",  course: 4 },
          { midi: 64, name: "E4",  course: 5 },
          { midi: 60, name: "C4",  course: 6 },
        ],
      },
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
      {
        id: "abdal_duzen",
        name: "Abdal Düzeni",
        region: "Alevi-Bektashi",
        description: "Used by Alevi dedes for nefes and semah rituals.",
        strings: [
          { midi: 40, name: "E2", course: 1 },
          { midi: 47, name: "B2", course: 2 },
          { midi: 52, name: "E3", course: 3 },
        ],
      },
      {
        id: "bozkurt_duzen",
        name: "Bozkurt Düzeni",
        region: "Alevi-Bektashi",
        description: "Used for spiritual Alevi repertoire. Low C bass.",
        strings: [
          { midi: 48, name: "C3", course: 1 },
          { midi: 55, name: "G3", course: 2 },
          { midi: 60, name: "C4", course: 3 },
        ],
      },
      {
        id: "meydan_duzen",
        name: "Meydan Düzeni",
        region: "Alevi-Bektashi",
        description: "Ceremonial tuning used in Alevi cem rituals.",
        strings: [
          { midi: 45, name: "A2", course: 1 },
          { midi: 50, name: "D3", course: 2 },
          { midi: 57, name: "A3", course: 3 },
        ],
      },
      {
        id: "taraf_duzen",
        name: "Taraf Düzeni",
        region: "Alevi-Bektashi",
        description: "Variant Alevi tuning with raised treble course to B.",
        strings: [
          { midi: 45, name: "A2", course: 1 },
          { midi: 52, name: "E3", course: 2 },
          { midi: 59, name: "B3", course: 3 },
        ],
      },
      {
        id: "dörtlük_duzen",
        name: "Dörtlük Düzeni",
        region: "Alevi-Bektashi",
        description: "Fourth-based tuning used in deyiş and semah.",
        strings: [
          { midi: 45, name: "A2", course: 1 },
          { midi: 50, name: "D3", course: 2 },
          { midi: 55, name: "G3", course: 3 },
        ],
      },
      // ── MAKAM-SPECIFIC ───────────────────────────────────────────────────
      {
        id: "rast_duzen",
        name: "Rast Düzeni",
        region: "Makam",
        description: "D-A-D tuning. Optimised for Makam Rast and Uşşak.",
        strings: [
          { midi: 50, name: "D3", course: 1 },
          { midi: 57, name: "A3", course: 2 },
          { midi: 62, name: "D4", course: 3 },
        ],
      },
      {
        id: "hüseyni_duzen",
        name: "Hüseyni Düzeni",
        region: "Makam",
        description: "A-E-A tuning. Ideal for Makam Hüseyni and Muhayyer.",
        strings: [
          { midi: 45, name: "A2", course: 1 },
          { midi: 52, name: "E3", course: 2 },
          { midi: 57, name: "A3", course: 3 },
        ],
      },
      {
        id: "segah_duzen",
        name: "Segah Düzeni",
        region: "Makam",
        description: "B-E-B tuning for Makam Segah with quarter-tone inflections.",
        strings: [
          { midi: 47, name: "B2", course: 1 },
          { midi: 52, name: "E3", course: 2 },
          { midi: 59, name: "B3", course: 3 },
        ],
      },
      {
        id: "nihavent_duzen",
        name: "Nihavent Düzeni",
        region: "Makam",
        description: "D-G-D tuning for Makam Nihavent (minor-scale feel).",
        strings: [
          { midi: 50, name: "D3", course: 1 },
          { midi: 55, name: "G3", course: 2 },
          { midi: 62, name: "D4", course: 3 },
        ],
      },
      {
        id: "hicaz_duzen",
        name: "Hicaz Düzeni",
        region: "Makam",
        description: "A-D-A tuning optimised for Makam Hicaz and Uzzal.",
        strings: [
          { midi: 45, name: "A2", course: 1 },
          { midi: 50, name: "D3", course: 2 },
          { midi: 57, name: "A3", course: 3 },
        ],
      },
      {
        id: "pesrev_duzen",
        name: "Peşrev Düzeni",
        region: "Makam",
        description: "F-C-F tuning used in central Anatolian folk and peşrev forms.",
        strings: [
          { midi: 41, name: "F2", course: 1 },
          { midi: 48, name: "C3", course: 2 },
          { midi: 53, name: "F3", course: 3 },
        ],
      },
      // ── AZERI / CAUCASIAN ────────────────────────────────────────────────
      {
        id: "azerbaijani_standard",
        name: "Azerbaijani Standard",
        region: "Azerbaijani",
        description: "Standard tuning for Azerbaijani saz in mugham and ashug music.",
        strings: [
          { midi: 48, name: "C3", course: 1 },
          { midi: 55, name: "G3", course: 2 },
          { midi: 60, name: "C4", course: 3 },
        ],
      },
      {
        id: "azerbaijani_shur",
        name: "Azerbaijani — Shur",
        region: "Azerbaijani",
        description: "D-A-D tuning for Mugham Shur. The most important Azerbaijani mugham.",
        strings: [
          { midi: 50, name: "D3", course: 1 },
          { midi: 57, name: "A3", course: 2 },
          { midi: 62, name: "D4", course: 3 },
        ],
      },
      {
        id: "azerbaijani_chahargah",
        name: "Azerbaijani — Chahargah",
        region: "Azerbaijani",
        description: "C-F-C tuning for Mugham Chahargah. Energetic, virtuosic style.",
        strings: [
          { midi: 48, name: "C3", course: 1 },
          { midi: 53, name: "F3", course: 2 },
          { midi: 60, name: "C4", course: 3 },
        ],
      },
      {
        id: "azerbaijani_segah",
        name: "Azerbaijani — Segah",
        region: "Azerbaijani",
        description: "E-B-E tuning for Mugham Segah and Zabul.",
        strings: [
          { midi: 52, name: "E3", course: 1 },
          { midi: 59, name: "B3", course: 2 },
          { midi: 64, name: "E4", course: 3 },
        ],
      },
      {
        id: "azerbaijani_rast",
        name: "Azerbaijani — Rast",
        region: "Azerbaijani",
        description: "G-D-G tuning for Mugham Rast. Bright, open character.",
        strings: [
          { midi: 43, name: "G2", course: 1 },
          { midi: 50, name: "D3", course: 2 },
          { midi: 55, name: "G3", course: 3 },
        ],
      },
      // ── HISTORICAL ───────────────────────────────────────────────────────
      {
        id: "kopuz_historical",
        name: "Kopuz (Historical)",
        region: "Historical",
        description: "Three-string tuning of the kopuz, medieval ancestor of the saz.",
        strings: [
          { midi: 48, name: "C3", course: 1 },
          { midi: 55, name: "G3", course: 2 },
          { midi: 64, name: "E4", course: 3 },
        ],
      },
      {
        id: "ozan_duzen",
        name: "Ozan Düzeni (Historical)",
        region: "Historical",
        description: "Tuning used by Anatolian ozans (wandering bards) before standardisation.",
        strings: [
          { midi: 45, name: "A2", course: 1 },
          { midi: 53, name: "F3", course: 2 },
          { midi: 57, name: "A3", course: 3 },
        ],
      },
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
      {
        id: "dgc_saz",
        name: "D G C",
        region: "Special",
        description: "D-G-C open tuning for saz. Quartal harmony, resonates beautifully with Maqam Rast and Nihavend.",
        strings: [
          { midi: 50, name: "D3", course: 1 },
          { midi: 55, name: "G3", course: 2 },
          { midi: 60, name: "C4", course: 3 },
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

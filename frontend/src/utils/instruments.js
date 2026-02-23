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
      {
        id: "arabic_standard",
        name: "Arabic Standard",
        region: "Arabic",
        description: "Most common Arabic tuning. Used across Egypt, Levant, Gulf.",
        strings: [
          { midi: 52, name: "E3", course: 1 },
          { midi: 57, name: "A3", course: 2 },
          { midi: 62, name: "D4", course: 3 },
          { midi: 67, name: "G4", course: 4 },
          { midi: 71, name: "B4", course: 5 },
          { midi: 76, name: "E5", course: 6 },
        ],
      },
      {
        id: "arabic_f_bass",
        name: "Arabic — F Bass",
        region: "Arabic",
        description: "Bass raised to F3. Common in Egyptian music.",
        strings: [
          { midi: 53, name: "F3",  course: 1 },
          { midi: 57, name: "A3",  course: 2 },
          { midi: 62, name: "D4",  course: 3 },
          { midi: 67, name: "G4",  course: 4 },
          { midi: 71, name: "B4",  course: 5 },
          { midi: 76, name: "E5",  course: 6 },
        ],
      },
      {
        id: "arabic_c_bass",
        name: "Arabic — C Bass",
        region: "Arabic",
        description: "Low C bass. Popular in Syrian and Lebanese music.",
        strings: [
          { midi: 48, name: "C3",  course: 1 },
          { midi: 57, name: "A3",  course: 2 },
          { midi: 62, name: "D4",  course: 3 },
          { midi: 67, name: "G4",  course: 4 },
          { midi: 71, name: "B4",  course: 5 },
          { midi: 76, name: "E5",  course: 6 },
        ],
      },
      {
        id: "arabic_d_bass",
        name: "Arabic — D Bass",
        region: "Arabic",
        description: "D bass. Facilitates Maqam Rast on open strings.",
        strings: [
          { midi: 50, name: "D3",  course: 1 },
          { midi: 57, name: "A3",  course: 2 },
          { midi: 62, name: "D4",  course: 3 },
          { midi: 67, name: "G4",  course: 4 },
          { midi: 71, name: "B4",  course: 5 },
          { midi: 76, name: "E5",  course: 6 },
        ],
      },
      {
        id: "arabic_g_bass",
        name: "Arabic — G Bass",
        region: "Arabic",
        description: "G bass used in Khaleeji (Gulf) music.",
        strings: [
          { midi: 55, name: "G3",  course: 1 },
          { midi: 57, name: "A3",  course: 2 },
          { midi: 62, name: "D4",  course: 3 },
          { midi: 67, name: "G4",  course: 4 },
          { midi: 71, name: "B4",  course: 5 },
          { midi: 76, name: "E5",  course: 6 },
        ],
      },
      {
        id: "arabic_bb_bass",
        name: "Arabic — Bb Bass",
        region: "Arabic",
        description: "Bb bass. Used for Maqam Saba and related makams.",
        strings: [
          { midi: 46, name: "Bb2", course: 1 },
          { midi: 57, name: "A3",  course: 2 },
          { midi: 62, name: "D4",  course: 3 },
          { midi: 67, name: "G4",  course: 4 },
          { midi: 71, name: "B4",  course: 5 },
          { midi: 76, name: "E5",  course: 6 },
        ],
      },
      {
        id: "arabic_b_bass",
        name: "Arabic — B Bass",
        region: "Arabic",
        description: "B bass variant used in Hijaz and related maqamat.",
        strings: [
          { midi: 47, name: "B2",  course: 1 },
          { midi: 57, name: "A3",  course: 2 },
          { midi: 62, name: "D4",  course: 3 },
          { midi: 67, name: "G4",  course: 4 },
          { midi: 71, name: "B4",  course: 5 },
          { midi: 76, name: "E5",  course: 6 },
        ],
      },
      // ── TURKISH ─────────────────────────────────────────────────────────
      {
        id: "turkish_standard",
        name: "Turkish Standard",
        region: "Turkish",
        description: "Arel-Ezgi-Uzdilek system. Standard for Turkish classical music.",
        strings: [
          { midi: 50, name: "D3",  course: 1 },
          { midi: 55, name: "G3",  course: 2 },
          { midi: 60, name: "C4",  course: 3 },
          { midi: 65, name: "F4",  course: 4 },
          { midi: 69, name: "A4",  course: 5 },
          { midi: 74, name: "D5",  course: 6 },
        ],
      },
      {
        id: "turkish_e_bass",
        name: "Turkish — E Bass",
        region: "Turkish",
        description: "Turkish standard with E3 bass. Common in Fasıl and Sanat music.",
        strings: [
          { midi: 52, name: "E3",  course: 1 },
          { midi: 55, name: "G3",  course: 2 },
          { midi: 60, name: "C4",  course: 3 },
          { midi: 65, name: "F4",  course: 4 },
          { midi: 69, name: "A4",  course: 5 },
          { midi: 74, name: "D5",  course: 6 },
        ],
      },
      {
        id: "turkish_f_bass",
        name: "Turkish — F Bass",
        region: "Turkish",
        description: "Turkish tuning with F3 bass.",
        strings: [
          { midi: 53, name: "F3",  course: 1 },
          { midi: 55, name: "G3",  course: 2 },
          { midi: 60, name: "C4",  course: 3 },
          { midi: 65, name: "F4",  course: 4 },
          { midi: 69, name: "A4",  course: 5 },
          { midi: 74, name: "D5",  course: 6 },
        ],
      },
      {
        id: "turkish_rauf_yekta",
        name: "Turkish — Rauf Yekta",
        region: "Turkish",
        description: "Early 20th-century tuning documented by theorist Rauf Yekta Bey.",
        strings: [
          { midi: 48, name: "C3",  course: 1 },
          { midi: 53, name: "F3",  course: 2 },
          { midi: 57, name: "A3",  course: 3 },
          { midi: 62, name: "D4",  course: 4 },
          { midi: 67, name: "G4",  course: 5 },
          { midi: 72, name: "C5",  course: 6 },
        ],
      },
      // ── PERSIAN / IRANIAN ────────────────────────────────────────────────
      {
        id: "persian_standard",
        name: "Persian Standard",
        region: "Persian",
        description: "Standard Iranian barbat. Used in classical Persian dastgah.",
        strings: [
          { midi: 48, name: "C3",  course: 1 },
          { midi: 53, name: "F3",  course: 2 },
          { midi: 58, name: "Bb3", course: 3 },
          { midi: 63, name: "Eb4", course: 4 },
          { midi: 68, name: "Ab4", course: 5 },
          { midi: 73, name: "Db5", course: 6 },
        ],
      },
      {
        id: "persian_d_standard",
        name: "Persian — D Standard",
        region: "Persian",
        description: "D-based barbat tuning for Dastgah Shur and Chahargah.",
        strings: [
          { midi: 50, name: "D3",  course: 1 },
          { midi: 55, name: "G3",  course: 2 },
          { midi: 60, name: "C4",  course: 3 },
          { midi: 65, name: "F4",  course: 4 },
          { midi: 69, name: "A4",  course: 5 },
          { midi: 74, name: "D5",  course: 6 },
        ],
      },
      {
        id: "persian_a_standard",
        name: "Persian — A Standard",
        region: "Persian",
        description: "A-centered barbat for Dastgah Segah and Homayoun.",
        strings: [
          { midi: 52, name: "E3",  course: 1 },
          { midi: 57, name: "A3",  course: 2 },
          { midi: 62, name: "D4",  course: 3 },
          { midi: 67, name: "G4",  course: 4 },
          { midi: 72, name: "C5",  course: 5 },
          { midi: 76, name: "E5",  course: 6 },
        ],
      },
      // ── IRAQI / BAGHDADI ─────────────────────────────────────────────────
      {
        id: "iraqi_standard",
        name: "Iraqi Standard",
        region: "Iraqi",
        description: "Baghdad school. Associated with Munir Bashir and Naseer Shamma.",
        strings: [
          { midi: 55, name: "G3",  course: 1 },
          { midi: 60, name: "C4",  course: 2 },
          { midi: 65, name: "F4",  course: 3 },
          { midi: 69, name: "A4",  course: 4 },
          { midi: 74, name: "D5",  course: 5 },
          { midi: 79, name: "G5",  course: 6 },
        ],
      },
      {
        id: "iraqi_munir_bashir",
        name: "Iraqi — Munir Bashir",
        region: "Iraqi",
        description: "Personal tuning of master Munir Bashir for solo maqam.",
        strings: [
          { midi: 52, name: "E3",  course: 1 },
          { midi: 57, name: "A3",  course: 2 },
          { midi: 60, name: "C4",  course: 3 },
          { midi: 65, name: "F4",  course: 4 },
          { midi: 69, name: "A4",  course: 5 },
          { midi: 74, name: "D5",  course: 6 },
        ],
      },
      {
        id: "iraqi_naseer_shamma",
        name: "Iraqi — Naseer Shamma",
        region: "Iraqi",
        description: "Contemporary extended tuning by Naseer Shamma.",
        strings: [
          { midi: 50, name: "D3",  course: 1 },
          { midi: 55, name: "G3",  course: 2 },
          { midi: 60, name: "C4",  course: 3 },
          { midi: 65, name: "F4",  course: 4 },
          { midi: 69, name: "A4",  course: 5 },
          { midi: 74, name: "D5",  course: 6 },
        ],
      },
      // ── NORTH AFRICAN ────────────────────────────────────────────────────
      {
        id: "moroccan_standard",
        name: "Moroccan Standard",
        region: "North African",
        description: "Moroccan Andalusian tuning. Used in Malhun and Gharnati.",
        strings: [
          { midi: 52, name: "E3",  course: 1 },
          { midi: 55, name: "G3",  course: 2 },
          { midi: 60, name: "C4",  course: 3 },
          { midi: 64, name: "E4",  course: 4 },
          { midi: 69, name: "A4",  course: 5 },
          { midi: 74, name: "D5",  course: 6 },
        ],
      },
      {
        id: "andalusian",
        name: "Andalusian / Moorish",
        region: "North African",
        description: "Historical tuning from Moorish Andalusia. Used in Algeria and Tunisia.",
        strings: [
          { midi: 48, name: "C3",  course: 1 },
          { midi: 55, name: "G3",  course: 2 },
          { midi: 60, name: "C4",  course: 3 },
          { midi: 65, name: "F4",  course: 4 },
          { midi: 69, name: "A4",  course: 5 },
          { midi: 74, name: "D5",  course: 6 },
        ],
      },
      {
        id: "tunisian_standard",
        name: "Tunisian Standard",
        region: "North African",
        description: "Tunisian ma'luf and Andalusian repertoire tuning.",
        strings: [
          { midi: 50, name: "D3",  course: 1 },
          { midi: 57, name: "A3",  course: 2 },
          { midi: 62, name: "D4",  course: 3 },
          { midi: 67, name: "G4",  course: 4 },
          { midi: 71, name: "B4",  course: 5 },
          { midi: 76, name: "E5",  course: 6 },
        ],
      },
      // ── ARMENIAN ─────────────────────────────────────────────────────────
      {
        id: "armenian_standard",
        name: "Armenian Standard",
        region: "Armenian",
        description: "Standard Armenian oud tuning.",
        strings: [
          { midi: 50, name: "D3",  course: 1 },
          { midi: 55, name: "G3",  course: 2 },
          { midi: 59, name: "B3",  course: 3 },
          { midi: 64, name: "E4",  course: 4 },
          { midi: 69, name: "A4",  course: 5 },
          { midi: 74, name: "D5",  course: 6 },
        ],
      },
      {
        id: "armenian_low",
        name: "Armenian — Low",
        region: "Armenian",
        description: "Lower register Armenian tuning. Darker, more intimate sound.",
        strings: [
          { midi: 48, name: "C3",  course: 1 },
          { midi: 53, name: "F3",  course: 2 },
          { midi: 57, name: "A3",  course: 3 },
          { midi: 62, name: "D4",  course: 4 },
          { midi: 67, name: "G4",  course: 5 },
          { midi: 72, name: "C5",  course: 6 },
        ],
      },
      // ── GREEK ────────────────────────────────────────────────────────────
      {
        id: "greek_standard",
        name: "Greek Standard",
        region: "Greek",
        description: "Greek laouto-influenced tuning used in rebetiko and laïká.",
        strings: [
          { midi: 52, name: "E3",  course: 1 },
          { midi: 57, name: "A3",  course: 2 },
          { midi: 62, name: "D4",  course: 3 },
          { midi: 67, name: "G4",  course: 4 },
          { midi: 71, name: "B4",  course: 5 },
          { midi: 76, name: "E5",  course: 6 },
        ],
      },
      // ── SPECIAL / OPEN ───────────────────────────────────────────────────
      {
        id: "open_d",
        name: "Open D",
        region: "Special",
        description: "Open D major chord. Good for drone and slide playing.",
        strings: [
          { midi: 50, name: "D3",  course: 1 },
          { midi: 57, name: "A3",  course: 2 },
          { midi: 62, name: "D4",  course: 3 },
          { midi: 66, name: "F#4", course: 4 },
          { midi: 69, name: "A4",  course: 5 },
          { midi: 74, name: "D5",  course: 6 },
        ],
      },
      {
        id: "open_g",
        name: "Open G",
        region: "Special",
        description: "Open G major tuning. Used in contemporary and fusion styles.",
        strings: [
          { midi: 50, name: "D3",  course: 1 },
          { midi: 55, name: "G3",  course: 2 },
          { midi: 62, name: "D4",  course: 3 },
          { midi: 67, name: "G4",  course: 4 },
          { midi: 71, name: "B4",  course: 5 },
          { midi: 74, name: "D5",  course: 6 },
        ],
      },
      {
        id: "drop_c",
        name: "Drop C",
        region: "Special",
        description: "Bass dropped to C3 for extended low range in modern compositions.",
        strings: [
          { midi: 48, name: "C3",  course: 1 },
          { midi: 57, name: "A3",  course: 2 },
          { midi: 62, name: "D4",  course: 3 },
          { midi: 67, name: "G4",  course: 4 },
          { midi: 71, name: "B4",  course: 5 },
          { midi: 76, name: "E5",  course: 6 },
        ],
      },
      {
        id: "cgdaec",
        name: "C G D A E C",
        region: "Special",
        description: "Symmetric C tonic frame. Bass C3 to high C5, used in contemporary and fusion oud.",
        strings: [
          { midi: 48, name: "C3",  course: 1 },
          { midi: 55, name: "G3",  course: 2 },
          { midi: 62, name: "D4",  course: 3 },
          { midi: 69, name: "A4",  course: 4 },
          { midi: 76, name: "E5",  course: 5 },
          { midi: 72, name: "C5",  course: 6 },
        ],
      },
      // ── CUSTOM (oud) ─────────────────────────────────────────────────────
      {
        id: "oud_custom",
        name: "Custom",
        region: "Custom",
        description: "Fully editable custom tuning.",
        strings: [
          { midi: 52, name: "E3",  course: 1 },
          { midi: 57, name: "A3",  course: 2 },
          { midi: 62, name: "D4",  course: 3 },
          { midi: 67, name: "G4",  course: 4 },
          { midi: 71, name: "B4",  course: 5 },
          { midi: 76, name: "E5",  course: 6 },
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

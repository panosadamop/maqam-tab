# مقام TAB — MaqamTAB

> Microtonal tablature editor for **Oud (عود)** and **Saz (Bağlama)**  
> Αποτύπωση τροπικής μουσικής με αυτόματη ανίχνευση μακάμ και εξαγωγή ταμπλατούρας

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite)](https://vitejs.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12-3776ab?logo=python)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-gold)](LICENSE)

---

## ✨ Features

| Feature | Detail |
|---|---|
| 🎙 **Live Recording** | Record directly from microphone |
| 📁 **File Import** | Upload WAV/MP3/OGG audio |
| 🎵 **Pitch Detection** | YIN algorithm — microtonal precision |
| 📏 **Rhythm Quantization** | 1/4 · 1/8 · 1/16 · 1/32 with onset detection |
| 🧠 **Seyir-aware Maqam Detection** | Analyses melodic contour, not just pitch histogram |
| 🎛 **Multiple Tunings** | 4 Oud + 4 Saz standard tunings + custom |
| ✏️ **Interactive TAB Editor** | Edit notes, strings, frets, ornaments inline |
| 🎼 **Microtonal MusicXML** | Fractional `<alter>` for quarter-tones |
| 📄 **PDF Staff + TAB** | LilyPond-generated sheet music |
| 🐳 **Docker ready** | One command deployment |

### Supported Maqamat
Rast · Bayati · Hijaz · Nahawand · Saba · Kurd · Sikah · Ajam · Hicazkar · Husseini

### Supported Ornaments
Slide up/down · Hammer-on · Pull-off · Vibrato · Trill · Grace note · Microtone bend

---

## 🚀 Quick Start

### Option A — Local Dev (Recommended)

**Prerequisites:** Node.js ≥ 18, Python ≥ 3.10

```bash
git clone https://github.com/YOUR_USERNAME/maqam-tab.git
cd maqam-tab

# Frontend
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

The app runs fully in the browser — the backend is **optional** (needed only for PDF export).

**Optional backend (PDF export via LilyPond):**
```bash
# In a second terminal
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Install LilyPond (required for PDF generation)
# macOS:   brew install lilypond
# Ubuntu:  sudo apt install lilypond
# Windows: https://lilypond.org/download.html

uvicorn main:app --reload --port 8000
# → API docs: http://localhost:8000/docs
```

### Option B — Docker Compose

```bash
git clone https://github.com/YOUR_USERNAME/maqam-tab.git
cd maqam-tab
docker compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API docs: http://localhost:8000/docs
```

---

## 📁 Project Structure

```
maqam-tab/
├── frontend/                    # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx              # Root component, layout, routing
│   │   ├── main.jsx             # Entry point
│   │   ├── components/
│   │   │   ├── AudioEngine.jsx  # Recording, file upload, audio pipeline
│   │   │   ├── TabEditor.jsx    # SVG tablature editor (interactive)
│   │   │   ├── MaqamPanel.jsx   # Maqam analysis + histogram + seyir
│   │   │   ├── ExportPanel.jsx  # MusicXML / ASCII TAB / JSON / PDF
│   │   │   ├── TuningPanel.jsx  # Instrument tuning selector + custom
│   │   │   └── WaveformViewer.jsx  # Audio waveform canvas display
│   │   └── utils/
│   │       ├── instruments.js   # Oud + Saz tuning definitions
│   │       ├── maqamat.js       # Maqam scales, seyir, jins data
│   │       └── maqamDetection.js  # YIN, onset detection, maqam scorer
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/                     # FastAPI Python API
│   ├── main.py                  # All routes: /analyze, /export/pdf, /export/musicxml
│   └── requirements.txt
│
├── docker/
│   ├── Dockerfile.frontend      # nginx + built React
│   └── Dockerfile.backend       # Python + LilyPond
│
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI
│
├── docker-compose.yml
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🎵 How It Works

### Audio Analysis Pipeline

```
Audio Input (mic/file)
        │
        ▼
  Onset Detection          ← Spectral flux, adaptive threshold, 50ms min gap
        │
        ▼
  Pitch Detection (YIN)    ← Per-frame autocorrelation, parabolic interpolation
        │
        ▼
  Microtonal Mapping       ← Cents offset from nearest semitone
        │
        ▼
  Rhythm Quantization      ← Snap to 1/8 or 1/16 grid at given BPM
        │
        ▼
  Fret/String Assignment   ← Best position on selected tuning
        │
        ▼
  Maqam Detection          ← Pitch histogram × Seyir analysis → scored candidates
```

### Seyir-Aware Maqam Detection

Unlike simple pitch-class histogram matching, MaqamTAB analyses **melodic direction** (σέιρ):

- Splits melody into **3 temporal sections** (beginning / middle / end)
- Computes **register density** (lower / middle / upper)
- Detects **ascending / descending / mixed** melodic type
- Weights each candidate maqam by both pitch match **and** seyir compatibility
- Bonus for matching **dominant pitch region** and **characteristic intervals**

### Microtonal MusicXML

Quarter-tones and other microtonal inflections are encoded as **fractional `<alter>` values**:

```xml
<pitch>
  <step>E</step>
  <alter>-0.5</alter>   <!-- E half-flat: E♭↑ (150 cents) -->
  <octave>4</octave>
</pitch>
```

Fully compatible with MuseScore 4, Sibelius, Dorico, and Finale with microtonal plugins.

---

## 🎛 Tunings Reference

### Oud (عود)

| ID | Name | Strings (low→high) |
|---|---|---|
| `arabic_standard` | Αραβικό Στάνταρ | E3 A3 D4 G4 B4 E5 |
| `turkish_standard` | Τουρκικό Στάνταρ | D3 G3 C4 F4 A4 D5 |
| `persian_standard` | Περσικό Στάνταρ | C3 F3 Bb3 Eb4 Ab4 Db5 |
| `iraqi_standard` | Ιρακινό Στάνταρ | G3 C4 F4 A4 D5 G5 |
| `custom` | Προσαρμοσμένο | Editable |

### Saz / Bağlama

| ID | Name | Courses (low→high) |
|---|---|---|
| `baglama_standard` | Kara Düzen | A2 E3 A3 |
| `misket` | Misket Düzeni | G2 D3 G3 |
| `abdal` | Abdal Düzeni | E2 B2 E3 |
| `bozkurt` | Bozkurt Düzeni | C3 G3 C4 |
| `saz_custom` | Προσαρμοσμένο | Editable |

---

## 🔌 API Reference

The backend exposes:

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check |
| `/api/analyze` | POST | Analyze audio file → notes + maqam |
| `/api/export/musicxml` | POST | Generate microtonal MusicXML |
| `/api/export/pdf` | POST | Generate PDF staff+TAB (requires LilyPond) |

Interactive docs at `http://localhost:8000/docs` (Swagger UI).

---

## 🤝 Contributing

Pull requests welcome! Key areas for contribution:

- Improve YIN pitch detection accuracy (especially for plucked strings)
- Add more maqamat (Nahawand Kabir, Saba Zamzam, Awj Ara...)
- Improve seyir analysis with machine learning
- MIDI export
- Rhythmic pattern recognition (usul / iqa')

```bash
# Dev setup
git clone https://github.com/YOUR_USERNAME/maqam-tab.git
cd maqam-tab
cd frontend && npm install && npm run dev
```

---

## 📄 License

MIT © 2025 — See [LICENSE](LICENSE)

---

*"The maqam is not a scale — it is a journey."*

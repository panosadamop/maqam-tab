# Contributing to MaqamTAB

Thank you for your interest in contributing! This project aims to be the best open-source tool for notating Middle Eastern and Turkish music.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/maqam-tab.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Run tests (see below)
6. Submit a pull request

## Development Setup

```bash
# Frontend
cd frontend
npm install
npm run dev     # http://localhost:3000

# Backend (separate terminal)
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## Running Tests

```bash
# Backend tests
cd backend
pip install httpx pytest pytest-asyncio
pytest tests/ -v
```

## Areas for Contribution

### 🎵 Music / Musicology
- Add missing maqamat (Nawathar, Lami, Saba Zamzam, Awj Ara, Mustaar...)
- Improve seyir descriptions and characteristic gestures
- Add usul (rhythmic cycle) recognition
- Add more instrument tunings (buzuq, qanun, etc.)

### 🧠 Audio / DSP
- Improve YIN pitch detection for plucked string instruments
- Add CREPE-based pitch detection (ML model)
- Better onset detection for legato passages
- Handle reverb and room acoustics

### 🎨 UI/UX
- Add MIDI input support
- Piano roll view alongside TAB
- Undo/redo history
- Mobile-friendly layout
- Dark/light theme toggle

### 🔧 Infrastructure
- Add MIDI export
- Add ABC notation export
- Improve PDF layout (staff + TAB side by side)
- Add REST API for third-party integration

## Code Style

- **Frontend**: Standard React patterns, functional components with hooks
- **Backend**: PEP 8, type hints where possible
- **Comments**: Explain *why*, not *what*

## Commit Messages

Use conventional commits:
```
feat: add Nawathar maqam definition
fix: correct quarter-tone alter in MusicXML export
docs: update tuning reference table
```

## Questions?

Open an issue or start a discussion on GitHub.

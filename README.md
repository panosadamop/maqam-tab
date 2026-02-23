# مقامTAB — MaqamTAB

> **Microtonal tablature editor** for oud (عود) and saz with AI-powered auto-transcription, maqam detection, and MusicXML export.

Built with **React + Material UI v5** frontend and **FastAPI** backend.

## Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Auto-Transcription | YouTube URL → TAB via Whisper + YIN pitch detection |
| 🎙 Live Recording | Real-time microphone recording + analysis |
| ✏️ TAB Editor | Interactive SVG editor with ornaments & microtones |
| 🎵 Maqam Analysis | 10 maqam profiles with seyir-aware detection |
| 📄 Export | MusicXML, ASCII TAB, JSON |
| 🎨 Material UI | Full MUI v5 dark theme with Arabic/Persian fonts |

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### AI Tools (optional, for AI transcription)
```bash
# macOS
brew install ffmpeg yt-dlp
pip install openai-whisper

# Ubuntu/Debian
sudo apt install ffmpeg
pip install yt-dlp openai-whisper
```

### Docker (full stack)
```bash
docker-compose up
```

## AI Transcription Pipeline

```
YouTube URL / MP3 Upload
    ↓ yt-dlp download
    ↓ ffmpeg → 16kHz mono WAV
    ↓ Onset Detection (RMS + adaptive threshold)
    ↓ YIN Pitch Detection (60–1800 Hz)
    ↓ Tempo Estimation + Rhythm Quantization
    ↓ Maqam Detection (10 profiles, seyir-aware)
    ↓ Whisper AI (optional metadata)
    → Notes in TAB Editor
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Backend health + AI tool status |
| GET | `/api/ai/status` | AI tools availability |
| POST | `/api/ai/youtube` | Start YouTube transcription job |
| POST | `/api/ai/upload` | Upload audio file for transcription |
| GET | `/api/ai/job/{id}` | Poll job status |
| DELETE | `/api/ai/job/{id}` | Cancel job |
| POST | `/api/export/pdf` | PDF export via LilyPond |

## Environment Variables

```bash
export WHISPER_MODEL=base  # tiny | base | small | medium | large
```

## Tech Stack

- **Frontend**: React 18, Material UI v5, Vite
- **Backend**: FastAPI, Python 3.11+
- **AI**: OpenAI Whisper, YIN pitch detection
- **Audio**: Web Audio API, yt-dlp, ffmpeg

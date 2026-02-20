"""
MaqamTAB Backend API v2
FastAPI server for:
  - Audio analysis (YIN pitch + onset detection)
  - Maqam detection (seyir-aware)
  - Export: MusicXML (microtonal) + PDF (LilyPond)
  - AI Transcription: YouTube (yt-dlp) + Whisper AI (async jobs)
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import io
import json
import subprocess
import tempfile
import os
import math
import struct
import wave
import threading
import uuid

# AI Transcription service (graceful import)
try:
    from ai_transcribe import (
        run_transcription_pipeline, create_job, get_job, update_job,
        check_whisper, check_yt_dlp, check_ffmpeg,
    )
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False

app = FastAPI(
    title="MaqamTAB API",
    version="2.0.0",
    description="Microtonal tablature for Oud & Saz — with AI transcription",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════
#  Data Models
# ══════════════════════════════════════════════════════

class NoteData(BaseModel):
    time: float
    duration: float
    midi: float
    midiRounded: Optional[int] = None
    microtonalOffset: float = 0.0
    string: int
    fret: int
    ornament: Optional[str] = None
    velocity: int = 80


class ExportRequest(BaseModel):
    notes: List[NoteData]
    instrument: str = "oud"
    tuningId: str = "arabic_standard"
    tuningName: str = "Arabic Standard"
    tuningStrings: List[dict]
    tempo: int = 80
    maqam: Optional[str] = None
    maqamArabic: Optional[str] = None
    title: Optional[str] = "MaqamTAB Composition"


class YouTubeRequest(BaseModel):
    url: str
    instrument: str = "oud"
    quantization: str = "1/8"
    use_whisper: bool = True


# ══════════════════════════════════════════════════════
#  Pitch Detection Utilities
# ══════════════════════════════════════════════════════

def yin_pitch(samples: list, sr: int, min_hz=60, max_hz=1800) -> Optional[float]:
    min_tau = max(1, int(sr / max_hz))
    max_tau = min(len(samples) // 2, int(sr / min_hz))
    if max_tau <= min_tau:
        return None

    d = [0.0] * max_tau
    for tau in range(1, max_tau):
        for j in range(min(max_tau, len(samples) - tau)):
            diff = samples[j] - samples[j + tau]
            d[tau] += diff * diff

    cmnd = [1.0] + [0.0] * (max_tau - 1)
    running = 0.0
    for tau in range(1, max_tau):
        running += d[tau]
        cmnd[tau] = (tau * d[tau] / running) if running > 0 else 1.0

    for tau in range(min_tau, max_tau - 1):
        if cmnd[tau] < 0.12 and cmnd[tau] < cmnd[tau - 1] and cmnd[tau] <= cmnd[tau + 1]:
            denom = 2 * cmnd[tau] - cmnd[tau - 1] - cmnd[tau + 1]
            adj = 0.5 * (cmnd[tau + 1] - cmnd[tau - 1]) / (denom + 1e-10)
            return sr / (tau + adj)
    return None


def detect_onsets(samples: list, sr: int, hop=256, frame=1024) -> list:
    energies = []
    for i in range(0, len(samples) - frame, hop):
        rms = math.sqrt(sum(s * s for s in samples[i:i + frame]) / frame)
        energies.append(rms)

    window = max(1, int(0.3 * sr / hop))
    min_gap = max(1, int(0.04 * sr / hop))
    onsets, last = [], -min_gap * 2

    for i in range(window, len(energies)):
        local_mean = sum(energies[max(0, i - window):i]) / window
        threshold = local_mean * 1.6 + 0.002
        if energies[i] > threshold and energies[i] > energies[i - 1] and i - last >= min_gap:
            onsets.append(i * hop / sr)
            last = i
    return onsets


def load_wav_samples(path: str):
    with wave.open(path, "rb") as w:
        n_ch, sw, sr = w.getnchannels(), w.getsampwidth(), w.getframerate()
        frames = w.readframes(w.getnframes())

    if sw == 2:
        raw = struct.unpack(f"<{len(frames)//2}h", frames)
        samples = [s / 32768.0 for s in raw]
    elif sw == 1:
        samples = [(b - 128) / 128.0 for b in frames]
    else:
        samples = [0.0] * (len(frames) // max(1, sw))

    if n_ch == 2:
        samples = [(samples[i] + samples[i + 1]) / 2 for i in range(0, len(samples) - 1, 2)]
    return samples, sr


def midi_to_string_fret(midi_float: float, tuning_strings: list):
    midi = round(midi_float)
    microtonal = round((midi_float - midi) * 100)
    for i, s in enumerate(tuning_strings):
        fret = midi - s.get("midi", s.get("note", 0) if isinstance(s.get("note"), int) else 60)
        if 0 <= fret <= 24:
            return i, fret, microtonal
    return 0, 0, microtonal


MAQAM_PROFILES = {
    "Rast":     {"arabic": "راست",   "intervals": [0,200,350,500,700,900,1050,1200], "seyirDirection": "ascending"},
    "Bayati":   {"arabic": "بياتي",  "intervals": [0,150,300,500,700,800,1000,1200], "seyirDirection": "ascending"},
    "Hijaz":    {"arabic": "حجاز",   "intervals": [0,100,400,500,700,800,1100,1200], "seyirDirection": "ascending"},
    "Nahawand": {"arabic": "نهاوند", "intervals": [0,200,300,500,700,800,1100,1200], "seyirDirection": "descending"},
    "Saba":     {"arabic": "صبا",    "intervals": [0,150,300,450,700,800,1000,1200], "seyirDirection": "descending"},
    "Kurd":     {"arabic": "كرد",    "intervals": [0,100,300,500,700,800,1000,1200], "seyirDirection": "ascending"},
    "Sikah":    {"arabic": "سيكاه",  "intervals": [0,150,350,500,700,850,1050,1200], "seyirDirection": "ascending"},
    "Ajam":     {"arabic": "عجم",    "intervals": [0,200,400,500,700,900,1100,1200], "seyirDirection": "ascending"},
}


def detect_maqam_local(notes: list) -> Optional[dict]:
    if len(notes) < 3:
        return None
    total = sum(n.get("duration", 0.1) for n in notes)
    hist = {}
    for n in notes:
        pc = round(n.get("midiRounded") or round(n.get("midi", 60))) % 12
        hist[pc] = hist.get(pc, 0) + n.get("duration", 0.1) / total

    best_name, best_score, best_root = None, -1, 0
    for root in range(12):
        for name, prof in MAQAM_PROFILES.items():
            score = sum(hist.get((root + round(iv / 100)) % 12, 0) for iv in prof["intervals"])
            if score > best_score:
                best_score, best_name, best_root = score, name, root

    if not best_name:
        return None
    prof = MAQAM_PROFILES[best_name]
    return {
        "name": best_name,
        "arabic": prof["arabic"],
        "intervals": prof["intervals"],
        "seyirDirection": prof["seyirDirection"],
        "confidence": min(0.97, best_score),
        "root": best_root,
        "key": best_name.lower(),
    }


# ══════════════════════════════════════════════════════
#  Health
# ══════════════════════════════════════════════════════

@app.get("/health")
def health():
    ai_tools = {}
    if AI_AVAILABLE:
        ai_tools = {
            "whisper": check_whisper(),
            "yt_dlp": check_yt_dlp(),
            "ffmpeg": check_ffmpeg(),
        }
    return {
        "status": "ok",
        "service": "MaqamTAB API",
        "version": "2.0.0",
        "ai_available": AI_AVAILABLE,
        "ai_tools": ai_tools,
    }


# ══════════════════════════════════════════════════════
#  Audio Analysis
# ══════════════════════════════════════════════════════

@app.post("/api/analyze")
async def analyze_audio(
    file: UploadFile = File(...),
    instrument: str = "oud",
    quantization: str = "1/8",
    tempo: int = 80,
):
    """Analyze audio file → detected notes + maqam."""
    content = await file.read()

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Convert to WAV using ffmpeg if available
        wav_path = tmp_path.replace(".webm", ".wav")
        if os.path.exists("/usr/bin/ffmpeg") or os.path.exists("/usr/local/bin/ffmpeg"):
            subprocess.run(
                ["ffmpeg", "-y", "-i", tmp_path, "-ac", "1", "-ar", "16000", wav_path],
                capture_output=True, timeout=60,
            )
        else:
            wav_path = tmp_path

        if not os.path.exists(wav_path):
            raise HTTPException(500, "Could not decode audio")

        samples, sr = load_wav_samples(wav_path)
        onsets = detect_onsets(samples, sr)

        grid_map = {"1/4": 60/tempo, "1/8": 60/tempo/2, "1/16": 60/tempo/4, "1/32": 60/tempo/8}
        grid = grid_map.get(quantization, 60/tempo/2)
        frame_size = 2048

        # Default tuning (Arabic Standard)
        default_strings = [
            {"midi": 36}, {"midi": 41}, {"midi": 45},
            {"midi": 50}, {"midi": 55}, {"midi": 60},
        ]

        notes = []
        for i, onset_t in enumerate(onsets):
            start = int(onset_t * sr)
            end = int(onsets[i + 1] * sr) if i + 1 < len(onsets) else min(start + frame_size * 2, len(samples))
            frame = samples[start:start + frame_size]
            if len(frame) < 512:
                continue
            freq = yin_pitch(frame, sr)
            if not freq:
                continue
            midi_f = 69 + 12 * math.log2(freq / 440)
            if midi_f < 36 or midi_f > 96:
                continue

            duration = max(0.05, (end - start) / sr)
            q_time = round(onset_t / grid) * grid
            q_dur = max(grid * 0.5, round(duration / grid) * grid)
            rms = math.sqrt(sum(s * s for s in frame) / len(frame))
            velocity = min(127, max(30, int(rms * 3000)))

            string_idx, fret, microtonal = midi_to_string_fret(midi_f, default_strings)

            notes.append({
                "id": f"note_{i}",
                "time": round(q_time, 4),
                "duration": round(q_dur, 4),
                "midi": round(midi_f, 3),
                "midiRounded": round(midi_f),
                "microtonalOffset": microtonal,
                "string": string_idx,
                "fret": fret,
                "velocity": velocity,
                "ornament": None,
            })

        maqam = detect_maqam_local(notes)
        return {"notes": notes, "maqam": maqam, "seyir": []}

    finally:
        for p in [tmp_path, tmp_path.replace(".webm", ".wav")]:
            try:
                os.unlink(p)
            except Exception:
                pass


# ══════════════════════════════════════════════════════
#  Export
# ══════════════════════════════════════════════════════

@app.post("/api/export/musicxml")
def export_musicxml(req: ExportRequest):
    """Generate microtonal MusicXML with fractional <alter> values."""
    divisions = 16
    beat_dur = 60 / req.tempo
    notes_sorted = sorted(req.notes, key=lambda n: n.time)

    total_time = max((n.time + n.duration for n in notes_sorted), default=beat_dur * 4)
    num_measures = max(1, math.ceil(total_time / (beat_dur * 4)))

    step_map = ["C","C","D","D","E","F","F","G","G","A","A","B"]
    alter_map = [0,1,0,1,0,0,1,0,1,0,1,0]

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>{req.title}</work-title></work>
  <identification>
    <encoding>
      <software>MaqamTAB v2.0</software>
      <encoding-date>{__import__('datetime').date.today()}</encoding-date>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>{"Oud (عود)" if req.instrument == "oud" else "Saz"}</part-name>
    </score-part>
  </part-list>
  <part id="P1">"""

    for m in range(num_measures):
        m_start = m * beat_dur * 4
        m_end = m_start + beat_dur * 4
        m_notes = [n for n in notes_sorted if m_start <= n.time < m_end]

        xml += f"\n    <measure number=\"{m + 1}\">"
        if m == 0:
            xml += f"""
      <attributes>
        <divisions>{divisions}</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <direction>
        <direction-type>
          <metronome><beat-unit>quarter</beat-unit><per-minute>{req.tempo}</per-minute></metronome>
        </direction-type>
      </direction>"""

        used_div = 0
        for note in m_notes:
            note_pos_div = round((note.time - m_start) / beat_dur * divisions)
            note_div = max(1, round(note.duration / beat_dur * divisions))

            if note_pos_div > used_div:
                xml += f"\n      <note><rest/><duration>{note_pos_div - used_div}</duration><type>eighth</type></note>"

            midi = note.midiRounded if note.midiRounded is not None else round(note.midi)
            octave = midi // 12 - 1
            pc = midi % 12
            step = step_map[pc]
            base_alter = alter_map[pc]
            total_alter = base_alter + note.microtonalOffset / 100
            alter_xml = f"<alter>{total_alter:.4f}</alter>" if total_alter != 0 else ""

            orn_xml = ""
            if note.ornament == "trill":
                orn_xml = "<ornaments><trill-mark/></ornaments>"
            elif note.ornament in ("hammer", "pull"):
                orn_xml = "<ornaments><wavy-line type=\"start\" number=\"1\"/></ornaments>"

            xml += f"""
      <note>
        <pitch><step>{step}</step>{alter_xml}<octave>{octave}</octave></pitch>
        <duration>{note_div}</duration>
        <type>eighth</type>
        <notations>
          <technical>
            <string>{note.string + 1}</string>
            <fret>{note.fret}</fret>
          </technical>
          {orn_xml}
        </notations>
      </note>"""
            used_div = note_pos_div + note_div

        total_meas_div = 4 * divisions
        if used_div < total_meas_div:
            xml += f"\n      <note><rest/><duration>{total_meas_div - used_div}</duration><type>quarter</type></note>"

        xml += "\n    </measure>"

    xml += "\n  </part>\n</score-partwise>"

    return StreamingResponse(
        io.BytesIO(xml.encode("utf-8")),
        media_type="application/xml",
        headers={"Content-Disposition": f"attachment; filename=\"{req.title}.xml\""},
    )


@app.post("/api/export/pdf")
def export_pdf(req: ExportRequest):
    """Generate PDF sheet music using LilyPond."""
    try:
        result = subprocess.run(["lilypond", "--version"], capture_output=True, timeout=5)
        if result.returncode != 0:
            raise RuntimeError("LilyPond not found")
    except (FileNotFoundError, subprocess.TimeoutExpired):
        raise HTTPException(503, "LilyPond is not installed. Install it and restart the server.")

    # Build LilyPond source
    beat_dur = 60 / req.tempo
    notes_sorted = sorted(req.notes, key=lambda n: n.time)

    note_strs = []
    for n in notes_sorted:
        midi = n.midiRounded if n.midiRounded is not None else round(n.midi)
        step_map = ["c","c","d","d","e","f","f","g","g","a","a","b"]
        alt_map = [0,1,0,1,0,0,1,0,1,0,1,0]
        pc = midi % 12
        octave_lily = midi // 12 - 4
        step = step_map[pc]
        if alt_map[pc]:
            step += "is"
        octave_str = "'" * max(0, octave_lily) if octave_lily >= 0 else "," * abs(min(0, octave_lily))

        dur_beats = max(0.25, round(n.duration / beat_dur * 4) / 4)
        lily_dur = max(1, round(1 / dur_beats * 4))

        note_strs.append(f"{step}{octave_str}{lily_dur}")

    instrument_name = "Oud (عود)" if req.instrument == "oud" else "Saz"
    maqam_line = f"% Maqam: {req.maqam} {req.maqamArabic}" if req.maqam else ""

    ly_source = f"""\\version "2.24.0"
\\header {{
  title = "{req.title}"
  subtitle = "{instrument_name} — {req.tuningName}"
  tagline = "Generated by MaqamTAB v2"
}}
{maqam_line}
\\score {{
  \\new Staff {{
    \\clef treble
    \\tempo 4 = {req.tempo}
    {" ".join(note_strs) if note_strs else "r1"}
  }}
}}
"""

    with tempfile.TemporaryDirectory() as tmpdir:
        ly_path = os.path.join(tmpdir, "score.ly")
        with open(ly_path, "w") as f:
            f.write(ly_source)

        result = subprocess.run(
            ["lilypond", "--pdf", "-o", os.path.join(tmpdir, "score"), ly_path],
            capture_output=True, timeout=60, cwd=tmpdir,
        )
        if result.returncode != 0:
            raise HTTPException(500, f"LilyPond error: {result.stderr.decode()[:500]}")

        pdf_path = os.path.join(tmpdir, "score.pdf")
        if not os.path.exists(pdf_path):
            raise HTTPException(500, "PDF generation failed")

        with open(pdf_path, "rb") as f:
            pdf_data = f.read()

    return StreamingResponse(
        io.BytesIO(pdf_data),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=\"{req.title}.pdf\""},
    )


# ══════════════════════════════════════════════════════
#  AI Transcription Endpoints
# ══════════════════════════════════════════════════════

@app.get("/api/ai/status")
def ai_status():
    """Check which AI tools are available."""
    if not AI_AVAILABLE:
        return {"available": False, "reason": "ai_transcribe module not loaded"}
    return {
        "available": True,
        "whisper": check_whisper(),
        "yt_dlp": check_yt_dlp(),
        "ffmpeg": check_ffmpeg(),
        "whisper_model": os.environ.get("WHISPER_MODEL", "base"),
    }


@app.post("/api/ai/youtube")
async def transcribe_youtube(request: YouTubeRequest, background_tasks: BackgroundTasks):
    """Start async YouTube → TAB pipeline. Returns job_id to poll."""
    if not AI_AVAILABLE:
        raise HTTPException(503, "AI module not available. Install: pip install openai-whisper yt-dlp")

    if not check_yt_dlp():
        raise HTTPException(503, "yt-dlp not installed: pip install yt-dlp")

    if not check_ffmpeg():
        raise HTTPException(503, "ffmpeg not installed. macOS: brew install ffmpeg / Ubuntu: apt install ffmpeg")

    url = request.url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(400, "Invalid URL — must start with https://")

    if not any(d in url for d in ["youtube.com", "youtu.be"]):
        raise HTTPException(400, "Only YouTube URLs are supported")

    job_id = str(uuid.uuid4())
    create_job(job_id, source=url)

    threading.Thread(
        target=run_transcription_pipeline,
        kwargs={
            "job_id": job_id,
            "source_type": "youtube",
            "source_path": url,
            "instrument": request.instrument,
            "quantization": request.quantization,
            "use_whisper": request.use_whisper,
        },
        daemon=True,
    ).start()

    return {"job_id": job_id, "status": "pending"}


@app.post("/api/ai/upload")
async def transcribe_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    instrument: str = "oud",
    quantization: str = "1/8",
    use_whisper: bool = True,
):
    """Upload audio file for AI transcription. Returns job_id to poll."""
    if not AI_AVAILABLE:
        raise HTTPException(503, "AI module not available")

    if not check_ffmpeg():
        raise HTTPException(503, "ffmpeg not installed")

    allowed_types = {"audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4",
                     "audio/x-m4a", "audio/flac", "audio/aac", "audio/webm"}
    allowed_exts = {".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac", ".opus", ".webm"}
    ctype = (file.content_type or "").split(";")[0].strip()
    filename = (file.filename or "").lower()
    ext = os.path.splitext(filename)[1]

    if ctype not in allowed_types and ext not in allowed_exts:
        raise HTTPException(400, f"Unsupported audio format: {ctype or filename}")

    suffix = ext or ".mp3"
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    tmp.write(await file.read())
    tmp.flush()
    tmp.close()

    job_id = str(uuid.uuid4())
    create_job(job_id, source=file.filename or "upload")
    update_job(job_id, title=file.filename)

    threading.Thread(
        target=run_transcription_pipeline,
        kwargs={
            "job_id": job_id,
            "source_type": "file",
            "source_path": tmp.name,
            "instrument": instrument,
            "quantization": quantization,
            "use_whisper": use_whisper,
        },
        daemon=True,
    ).start()

    return {"job_id": job_id, "status": "pending", "filename": file.filename}


@app.get("/api/ai/job/{job_id}")
def get_job_status(job_id: str):
    """Poll transcription job status and results."""
    if not AI_AVAILABLE:
        raise HTTPException(503, "AI module not available")
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, f"Job {job_id} not found (may have expired after 1 hour)")
    return job


@app.delete("/api/ai/job/{job_id}")
def cancel_job(job_id: str):
    """Cancel (mark cancelled) a running job."""
    if not AI_AVAILABLE:
        raise HTTPException(503, "AI module not available")
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, "Job not found")
    update_job(job_id, status="cancelled", stage="Ακυρώθηκε")
    return {"cancelled": True}


# ══════════════════════════════════════════════════════
#  Entry Point
# ══════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

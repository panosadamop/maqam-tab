"""
MaqamTAB Backend API v2
FastAPI server for audio analysis, maqam detection, PDF/LilyPond export,
and AI-powered transcription from MP3 files and YouTube URLs.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, HttpUrl
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

# AI Transcription service (graceful import — works without GPU deps)
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

# ===================== Models =====================

class NoteData(BaseModel):
    time: float
    duration: float
    midi: float
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
    title: Optional[str] = None

class AnalyzeRequest(BaseModel):
    tempo: int = 80
    quantization: str = "1/8"
    instrument: str = "oud"

# ===================== Pitch Detection (YIN) =====================

def yin_pitch(samples: list, sample_rate: int, min_hz=50, max_hz=2000) -> Optional[float]:
    """YIN pitch detection algorithm"""
    min_period = sample_rate // max_hz
    max_period = sample_rate // min_hz
    n = len(samples)
    
    if n < max_period * 2:
        return None

    # Difference function
    d = [0.0] * max_period
    for tau in range(1, max_period):
        for j in range(max_period):
            if j + tau < n:
                diff = samples[j] - samples[j + tau]
                d[tau] += diff * diff

    # Cumulative mean normalized difference
    cmnd = [0.0] * max_period
    cmnd[0] = 1.0
    running_sum = 0.0
    for tau in range(1, max_period):
        running_sum += d[tau]
        cmnd[tau] = tau * d[tau] / (running_sum + 1e-10)

    # Find first minimum below threshold
    threshold = 0.15
    for tau in range(min_period, max_period - 1):
        if cmnd[tau] < threshold:
            if tau > 0 and cmnd[tau] <= cmnd[tau-1] and cmnd[tau] <= cmnd[tau+1]:
                # Parabolic interpolation
                if tau > 0 and tau < max_period - 1:
                    s0, s1, s2 = cmnd[tau-1], cmnd[tau], cmnd[tau+1]
                    denom = 2 * s1 - s2 - s0
                    if abs(denom) > 1e-10:
                        adj = 0.5 * (s2 - s0) / denom
                        return sample_rate / (tau + adj)
                return sample_rate / tau
    return None

def detect_onsets(samples: list, sample_rate: int) -> list:
    """Simple spectral flux onset detection"""
    hop_size = 256
    frame_size = 1024
    onsets = []
    prev_energy = 0
    
    for i in range(0, len(samples) - frame_size, hop_size):
        frame = samples[i:i + frame_size]
        energy = sum(s**2 for s in frame) / frame_size
        
        if energy > prev_energy * 1.5 and energy > 0.001:
            t = i / sample_rate
            if not onsets or t - onsets[-1] > 0.05:
                onsets.append(t)
        prev_energy = energy * 0.8 + prev_energy * 0.2
    
    return onsets

def freq_to_midi(freq: float) -> float:
    if freq <= 0:
        return 0
    return 69 + 12 * math.log2(freq / 440.0)

# ===================== API Routes =====================

@app.get("/health")
def health():
    ai_status = {}
    if AI_AVAILABLE:
        ai_status = {
            "whisper": check_whisper(),
            "yt_dlp": check_yt_dlp(),
            "ffmpeg": check_ffmpeg(),
        }
    return {
        "status": "ok",
        "service": "MaqamTAB API",
        "version": "2.0.0",
        "ai_available": AI_AVAILABLE,
        "ai_tools": ai_status,
    }

@app.post("/api/analyze")
async def analyze_audio(
    file: UploadFile = File(...),
    tempo: int = 80,
    quantization: str = "1/8",
    instrument: str = "oud"
):
    """Analyze uploaded audio file and return detected notes + maqam"""
    try:
        audio_data = await file.read()
        
        # Try to decode as WAV
        try:
            with io.BytesIO(audio_data) as buf:
                with wave.open(buf) as w:
                    n_channels = w.getnchannels()
                    sampwidth = w.getsampwidth()
                    framerate = w.getframerate()
                    frames = w.readframes(w.getnframes())
        except Exception:
            return {"error": "Δεν είναι έγκυρο WAV αρχείο. Χρησιμοποιήστε ffmpeg για μετατροπή.", "notes": [], "maqam": None}

        # Convert to float samples
        if sampwidth == 2:
            fmt = f"<{len(frames)//2}h"
            raw = struct.unpack(fmt, frames)
            samples = [s / 32768.0 for s in raw]
        elif sampwidth == 1:
            samples = [(b - 128) / 128.0 for b in frames]
        else:
            return {"error": "Unsupported sample width", "notes": [], "maqam": None}

        # Mix to mono if stereo
        if n_channels == 2:
            samples = [(samples[i] + samples[i+1]) / 2 for i in range(0, len(samples)-1, 2)]

        # Detect onsets
        onsets = detect_onsets(samples, framerate)
        
        beat_duration = 60.0 / tempo
        grid_values = {"1/4": beat_duration, "1/8": beat_duration/2, "1/16": beat_duration/4}
        grid = grid_values.get(quantization, beat_duration/2)
        
        notes = []
        for i, onset_time in enumerate(onsets):
            start = int(onset_time * framerate)
            end = int(onsets[i+1] * framerate) if i+1 < len(onsets) else min(start + 2048*2, len(samples))
            
            frame = samples[start:start+2048]
            if len(frame) < 512:
                continue
            
            freq = yin_pitch(frame, framerate)
            if not freq or freq < 50 or freq > 2000:
                continue
            
            midi_float = freq_to_midi(freq)
            duration = (end - start) / framerate
            
            # Quantize
            q_time = round(onset_time / grid) * grid
            q_duration = max(grid * 0.5, round(duration / grid) * grid)
            
            # Simple fret finding (0 = open string placeholder)
            notes.append({
                "id": f"note_{i}",
                "time": round(q_time, 4),
                "duration": round(q_duration, 4),
                "frequency": round(freq, 2),
                "midi": round(midi_float, 3),
                "midiRounded": round(midi_float),
                "microtonalOffset": round((midi_float - round(midi_float)) * 100, 1),
                "string": 0,
                "fret": 0,
                "velocity": 80,
                "ornament": None,
            })
        
        return {
            "notes": notes,
            "sampleRate": framerate,
            "duration": len(samples) / framerate,
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/export/pdf")
async def export_pdf(request: ExportRequest):
    """Generate PDF with Staff notation + TAB using LilyPond"""
    
    # Check if LilyPond is installed
    try:
        result = subprocess.run(["lilypond", "--version"], capture_output=True, timeout=5)
        lilypond_available = result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        lilypond_available = False

    if not lilypond_available:
        raise HTTPException(
            status_code=501,
            detail="LilyPond δεν είναι εγκατεστημένο. Εγκαταστήστε το από https://lilypond.org"
        )
    
    ly_content = generate_lilypond(request)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        ly_file = os.path.join(tmpdir, "score.ly")
        pdf_file = os.path.join(tmpdir, "score.pdf")
        
        with open(ly_file, "w", encoding="utf-8") as f:
            f.write(ly_content)
        
        result = subprocess.run(
            ["lilypond", "--pdf", "-o", os.path.join(tmpdir, "score"), ly_file],
            capture_output=True, timeout=30, cwd=tmpdir
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"LilyPond error: {result.stderr.decode()}")
        
        if not os.path.exists(pdf_file):
            raise HTTPException(status_code=500, detail="PDF δεν δημιουργήθηκε")
        
        with open(pdf_file, "rb") as f:
            pdf_bytes = f.read()
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{request.maqam or "tab"}.pdf"'}
    )


def generate_lilypond(req: ExportRequest) -> str:
    """Generate LilyPond source for staff + TAB with microtonal support"""
    
    NOTE_NAMES = ["c", "cis", "d", "dis", "e", "f", "fis", "g", "gis", "a", "ais", "b"]
    OCTAVE_MARKS = {2: ",,", 3: ",", 4: "", 5: "'", 6: "''", 7: "'''"}
    
    def midi_to_lily(midi_float):
        midi_int = round(midi_float)
        pc = midi_int % 12
        octave = midi_int // 12 - 1
        note = NOTE_NAMES[pc]
        oct_mark = OCTAVE_MARKS.get(octave, "")
        # Microtonal offset: LilyPond uses ih/eh suffixes for quarter tones
        offset = midi_float - midi_int
        if offset > 0.3:
            note += "ih"  # quarter tone up
        elif offset < -0.3:
            note += "eh"  # quarter tone down
        return note + oct_mark
    
    def duration_to_lily(dur, tempo):
        beat = 60.0 / tempo
        beats = dur / beat
        if beats >= 4: return "1"
        if beats >= 2: return "2"
        if beats >= 1: return "4"
        if beats >= 0.5: return "8"
        if beats >= 0.25: return "16"
        return "32"
    
    title = req.title or f"{req.maqam or 'Untitled'}"
    maqam_arabic = req.maqamArabic or ""
    
    # Build notes string
    notes_ly = []
    for n in sorted(req.notes, key=lambda x: x.time):
        note_name = midi_to_lily(n.midi + n.microtonalOffset / 100)
        dur = duration_to_lily(n.duration, req.tempo)
        notes_ly.append(f"{note_name}{dur}")
    
    notes_str = " ".join(notes_ly) if notes_ly else "r1"
    
    # String tuning for TAB
    string_tunings = " ".join([
        f'"{s.get("name", "?")}"' for s in req.tuningStrings
    ])
    
    ly = f"""\\version "2.24.0"

\\header {{
  title = "{title}"
  subtitle = "{maqam_arabic}"
  composer = "MaqamTAB"
  tagline = "{req.instrument} - {req.tuningName} - {req.tempo} BPM"
}}

% Quarter-tone support
#(set-global-staff-size 18)

melody = \\relative {{
  \\clef treble
  \\tempo 4 = {req.tempo}
  \\time 4/4
  {notes_str}
  \\bar "|."
}}

tab = \\relative {{
  \\clef "tab"
  \\time 4/4
  {notes_str}
  \\bar "|."
}}

\\score {{
  <<
    \\new Staff \\melody
    \\new TabStaff {{
      \\set TabStaff.stringTunings = #guitar-tuning
      \\tab
    }}
  >>
  \\layout {{
    \\context {{
      \\TabStaff
      \\override Fingering.stencil = ##f
    }}
  }}
  \\midi {{}}
}}
"""
    return ly


@app.post("/api/export/musicxml")
async def export_musicxml(request: ExportRequest):
    """Generate microtonal MusicXML with fractional alter"""
    # Import the musicxml generator logic (simplified here)
    xml = generate_musicxml_python(request)
    return StreamingResponse(
        io.BytesIO(xml.encode("utf-8")),
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{request.maqam or "tab"}.musicxml"'}
    )


def generate_musicxml_python(req: ExportRequest) -> str:
    """Generate MusicXML with fractional alter for microtones"""
    NOTE_STEPS = ["C","C","D","D","E","F","F","G","G","A","A","B"]
    NOTE_ALTERS = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]
    
    divisions = 16
    beat_dur = 60.0 / req.tempo
    beats_per_measure = 4
    
    def midi_to_pitch(midi_f):
        midi_i = round(midi_f)
        semitone = midi_i % 12
        octave = midi_i // 12 - 1
        step = NOTE_STEPS[semitone]
        alter = NOTE_ALTERS[semitone] + (midi_f - midi_i)
        return step, octave, round(alter, 3)
    
    def dur_to_divisions(dur):
        return max(1, round((dur / beat_dur) * divisions))
    
    def dur_to_type(dur):
        b = dur / beat_dur
        if b >= 4: return "whole"
        if b >= 2: return "half"
        if b >= 1: return "quarter"
        if b >= 0.5: return "eighth"
        return "16th"
    
    notes = sorted(req.notes, key=lambda x: x.time)
    total_dur = max((n.time + n.duration for n in notes), default=beats_per_measure * beat_dur)
    num_measures = max(1, math.ceil(total_dur / (beats_per_measure * beat_dur)))
    
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>{req.maqam or "Untitled"} {req.maqamArabic or ""}</work-title></work>
  <part-list>
    <score-part id="P1">
      <part-name>{req.instrument}</part-name>
    </score-part>
  </part-list>
  <part id="P1">'''
    
    measure_dur = beats_per_measure * beat_dur
    
    for m in range(num_measures):
        m_start = m * measure_dur
        m_end = (m + 1) * measure_dur
        m_notes = [n for n in notes if m_start <= n.time < m_end]
        
        xml += f'\n    <measure number="{m+1}">'
        
        if m == 0:
            tuning_lines = ""
            for i, s in enumerate(req.tuningStrings):
                midi = s.get("midi", 60)
                step = NOTE_STEPS[midi % 12]
                alter = NOTE_ALTERS[midi % 12]
                octave = midi // 12 - 1
                tuning_lines += f'''
          <staff-tuning line="{i+1}">
            <tuning-step>{step}</tuning-step>
            {"<tuning-alter>1</tuning-alter>" if alter else ""}
            <tuning-octave>{octave}</tuning-octave>
          </staff-tuning>'''
            
            xml += f'''
      <attributes>
        <divisions>{divisions}</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>{beats_per_measure}</beats><beat-type>4</beat-type></time>
        <clef><sign>TAB</sign><line>5</line></clef>
        <staff-details>
          <staff-type>tab</staff-type>
          <staff-lines>{len(req.tuningStrings)}</staff-lines>{tuning_lines}
        </staff-details>
      </attributes>
      <direction>
        <direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>{req.tempo}</per-minute></metronome></direction-type>
        <sound tempo="{req.tempo}"/>
      </direction>'''
        
        used_div = 0
        total_measure_div = beats_per_measure * divisions
        
        for note in m_notes:
            note_pos_div = round(((note.time - m_start) / beat_dur) * divisions)
            
            if note_pos_div > used_div:
                rest_div = note_pos_div - used_div
                xml += f'\n      <note><rest/><duration>{rest_div}</duration><type>quarter</type></note>'
                used_div = note_pos_div
            
            midi_f = note.midi + note.microtonalOffset / 100
            step, octave, alter = midi_to_pitch(midi_f)
            note_div = dur_to_divisions(note.duration)
            note_type = dur_to_type(note.duration)
            
            alter_xml = f"<alter>{alter}</alter>" if alter != 0 else ""
            
            orn_xml = ""
            if note.ornament == "hammer_on":
                orn_xml = '<hammer-on number="1" type="start">H</hammer-on>'
            elif note.ornament == "pull_off":
                orn_xml = '<pull-off number="1" type="start">P</pull-off>'
            elif note.ornament == "slide_up":
                orn_xml = '<slide type="start" number="1"/>'
            elif note.ornament == "vibrato":
                orn_xml = '<ornaments><wavy-line type="start" number="1"/></ornaments>'
            
            xml += f'''
      <note>
        <pitch><step>{step}</step>{alter_xml}<octave>{octave}</octave></pitch>
        <duration>{note_div}</duration>
        <type>{note_type}</type>
        <notations>
          <technical>
            <string>{note.string + 1}</string>
            <fret>{note.fret}</fret>
          </technical>
          {orn_xml}
        </notations>
      </note>'''
            
            used_div = note_pos_div + note_div
        
        if used_div < total_measure_div:
            xml += f'\n      <note><rest/><duration>{total_measure_div - used_div}</duration><type>quarter</type></note>'
        
        xml += '\n    </measure>'
    
    xml += '\n  </part>\n</score-partwise>'
    return xml




# ══════════════════════════════════════════════════════════════════════════════
#  AI TRANSCRIPTION ROUTES
# ══════════════════════════════════════════════════════════════════════════════

class YouTubeRequest(BaseModel):
    url: str
    instrument: str = "oud"
    quantization: str = "1/8"
    use_whisper: bool = True


class TranscribeFileRequest(BaseModel):
    instrument: str = "oud"
    quantization: str = "1/8"
    use_whisper: bool = True


@app.get("/api/ai/status")
def ai_status():
    """Check which AI tools are installed."""
    if not AI_AVAILABLE:
        return {
            "available": False,
            "reason": "ai_transcribe module not found",
            "install": "pip install openai-whisper yt-dlp",
        }
    return {
        "available": True,
        "whisper": check_whisper(),
        "yt_dlp": check_yt_dlp(),
        "ffmpeg": check_ffmpeg(),
        "whisper_model": os.environ.get("WHISPER_MODEL", "base"),
    }


@app.post("/api/ai/youtube")
async def transcribe_youtube(
    request: YouTubeRequest,
    background_tasks: BackgroundTasks,
):
    """
    Start async YouTube → TAB pipeline.
    Returns a job_id to poll for status.
    """
    if not AI_AVAILABLE:
        raise HTTPException(503, "AI module not available. pip install openai-whisper yt-dlp")

    if not check_yt_dlp():
        raise HTTPException(503, "yt-dlp not installed. Run: pip install yt-dlp")

    if not check_ffmpeg():
        raise HTTPException(503, "ffmpeg not installed. See README.")

    # Validate URL (basic check)
    url = request.url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(400, "Invalid URL")
    if not any(domain in url for domain in ["youtube.com", "youtu.be", "youtube-nocookie.com"]):
        raise HTTPException(400, "Only YouTube URLs are supported")

    job_id = str(uuid.uuid4())
    create_job(job_id, source=url)

    # Run pipeline in background thread (FastAPI BackgroundTasks can't handle long blocking tasks well)
    thread = threading.Thread(
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
    )
    thread.start()

    return {"job_id": job_id, "status": "pending"}


@app.post("/api/ai/upload")
async def transcribe_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    instrument: str = "oud",
    quantization: str = "1/8",
    use_whisper: bool = True,
):
    """
    Upload an MP3/WAV/OGG/M4A file for AI transcription.
    Returns a job_id to poll.
    """
    if not AI_AVAILABLE:
        raise HTTPException(503, "AI module not available")

    if not check_ffmpeg():
        raise HTTPException(503, "ffmpeg not installed")

    # Validate file type
    allowed = {"audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4",
               "audio/x-m4a", "audio/flac", "audio/aac", "audio/webm"}
    ctype = (file.content_type or "").split(";")[0].strip()
    filename = (file.filename or "").lower()
    ext_ok = any(filename.endswith(e) for e in
                 [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac", ".webm", ".opus"])
    if ctype not in allowed and not ext_ok:
        raise HTTPException(400, f"Unsupported file type: {ctype or filename}")

    # Save upload to temp file
    suffix = os.path.splitext(file.filename or ".mp3")[1] or ".mp3"
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    content = await file.read()
    tmp.write(content)
    tmp.flush()
    tmp.close()

    job_id = str(uuid.uuid4())
    job = create_job(job_id, source=file.filename or "upload")
    update_job(job_id, title=file.filename)

    thread = threading.Thread(
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
    )
    thread.start()

    return {"job_id": job_id, "status": "pending", "filename": file.filename}


@app.get("/api/ai/job/{job_id}")
def get_job_status(job_id: str):
    """Poll transcription job status."""
    if not AI_AVAILABLE:
        raise HTTPException(503, "AI module not available")

    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, f"Job {job_id} not found (may have expired)")

    # Return full job data when done, minimal otherwise
    if job["status"] in ("done", "error"):
        return job
    else:
        return {
            "id": job["id"],
            "status": job["status"],
            "progress": job["progress"],
            "stage": job["stage"],
            "title": job.get("title"),
            "duration": job.get("duration"),
            "error": job.get("error"),
        }


@app.delete("/api/ai/job/{job_id}")
def cancel_job(job_id: str):
    """Mark a job as cancelled (background thread will still finish, but result is ignored)."""
    if not AI_AVAILABLE:
        raise HTTPException(503, "AI module not available")
    job = get_job(job_id)
    if job is None:
        raise HTTPException(404, "Job not found")
    update_job(job_id, status="cancelled")
    return {"cancelled": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

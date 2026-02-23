"""
MaqamTAB — AI Transcription Service
Handles: YouTube extraction, MP3/audio processing, Whisper transcription,
         AI-enhanced maqam detection and tablature generation
"""

import os
import io
import json
import math
import struct
import wave
import tempfile
import subprocess
import threading
import time
import uuid
from typing import Optional, List, Dict, Any
from pathlib import Path

# ─── Job store (in-memory, use Redis in production) ───────────────────────────
_jobs: Dict[str, Dict] = {}
_jobs_lock = threading.Lock()


def create_job(job_id: str, source: str) -> Dict:
    job = {
        "id": job_id,
        "source": source,
        "status": "pending",      # pending → downloading → extracting → analyzing → done | error
        "progress": 0,
        "stage": "Εκκίνηση…",
        "notes": [],
        "maqam": None,
        "tempo": 80,
        "title": None,
        "duration": None,
        "error": None,
        "created_at": time.time(),
    }
    with _jobs_lock:
        _jobs[job_id] = job
    return job


def update_job(job_id: str, **kwargs):
    with _jobs_lock:
        if job_id in _jobs:
            _jobs[job_id].update(kwargs)


def get_job(job_id: str) -> Optional[Dict]:
    with _jobs_lock:
        return _jobs.get(job_id)


def cleanup_old_jobs():
    """Remove jobs older than 1 hour"""
    cutoff = time.time() - 3600
    with _jobs_lock:
        old = [jid for jid, j in _jobs.items() if j["created_at"] < cutoff]
        for jid in old:
            del _jobs[jid]


# ─── Tool availability checks ─────────────────────────────────────────────────

def check_tool(name: str) -> bool:
    try:
        result = subprocess.run(
            [name, "--version"], capture_output=True, timeout=5
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def check_whisper() -> bool:
    try:
        import whisper
        return True
    except ImportError:
        return False


def check_yt_dlp() -> bool:
    return check_tool("yt-dlp")


def check_ffmpeg() -> bool:
    return check_tool("ffmpeg")


# ─── YouTube Download ──────────────────────────────────────────────────────────

def download_youtube(url: str, output_dir: str, job_id: str) -> str:
    """Download YouTube video audio using yt-dlp. Returns path to WAV file."""
    update_job(job_id, status="downloading", progress=5,
               stage="Λήψη από YouTube…")

    output_template = os.path.join(output_dir, "%(title)s.%(ext)s")

    cmd = [
        "yt-dlp",
        "--extract-audio",
        "--audio-format", "wav",
        "--audio-quality", "0",          # best quality
        "--no-playlist",
        "--max-filesize", "100m",        # safety limit
        "--output", output_template,
        "--print", "title",              # print title to stdout
        "--no-progress",
        url,
    ]

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=300, cwd=output_dir
        )
        if result.returncode != 0:
            raise RuntimeError(f"yt-dlp failed: {result.stderr[:500]}")

        # Find the downloaded WAV
        wav_files = list(Path(output_dir).glob("*.wav"))
        if not wav_files:
            raise RuntimeError("Δεν βρέθηκε αρχείο WAV μετά τη λήψη")

        title = result.stdout.strip().split("\n")[0] if result.stdout else "Unknown"
        update_job(job_id, progress=30, stage="Λήψη ολοκληρώθηκε", title=title)

        return str(wav_files[0])

    except subprocess.TimeoutExpired:
        raise RuntimeError("Timeout κατά τη λήψη (>5 λεπτά)")


# ─── Audio → WAV conversion ────────────────────────────────────────────────────

def convert_to_wav(input_path: str, output_dir: str, job_id: str) -> str:
    """Convert any audio format to 16kHz mono WAV using ffmpeg."""
    update_job(job_id, progress=15, stage="Μετατροπή αρχείου…")

    output_path = os.path.join(output_dir, "audio_16k.wav")
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-ac", "1",           # mono
        "-ar", "16000",       # 16 kHz (Whisper standard)
        "-acodec", "pcm_s16le",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg error: {result.stderr.decode()[:300]}")

    # Get duration via ffprobe
    try:
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json",
             "-show_format", input_path],
            capture_output=True, text=True, timeout=10
        )
        info = json.loads(probe.stdout)
        duration = float(info.get("format", {}).get("duration", 0))
        update_job(job_id, duration=round(duration, 1))
    except Exception:
        pass

    update_job(job_id, progress=25, stage="Μετατροπή ολοκληρώθηκε")
    return output_path


# ─── Whisper Transcription ────────────────────────────────────────────────────

def transcribe_with_whisper(wav_path: str, job_id: str) -> Dict:
    """
    Run OpenAI Whisper on the audio file.
    Returns segments with timing info.
    Uses 'base' model by default; set WHISPER_MODEL env var for larger models.
    """
    update_job(job_id, status="analyzing", progress=40,
               stage="Φόρτωση μοντέλου Whisper AI…")

    try:
        import whisper
        import numpy as np
    except ImportError:
        raise RuntimeError(
            "Το πακέτο openai-whisper δεν είναι εγκατεστημένο. "
            "Εκτελέστε: pip install openai-whisper"
        )

    model_name = os.environ.get("WHISPER_MODEL", "base")
    update_job(job_id, progress=45, stage=f"Φόρτωση Whisper ({model_name})…")

    model = whisper.load_model(model_name)

    update_job(job_id, progress=55, stage="Ανάλυση ήχου με Whisper…")

    result = model.transcribe(
        wav_path,
        task="transcribe",
        language=None,       # auto-detect
        word_timestamps=True,
        verbose=False,
    )

    update_job(job_id, progress=70, stage="Επεξεργασία αποτελεσμάτων…")
    return result


# ─── Pitch Detection from WAV ──────────────────────────────────────────────────

def load_wav_samples(wav_path: str):
    """Load WAV file, return (samples_float, sample_rate)."""
    with wave.open(wav_path, "rb") as w:
        n_channels = w.getnchannels()
        sampwidth = w.getsampwidth()
        framerate = w.getframerate()
        frames = w.readframes(w.getnframes())

    if sampwidth == 2:
        import struct
        raw = struct.unpack(f"<{len(frames)//2}h", frames)
        samples = [s / 32768.0 for s in raw]
    elif sampwidth == 1:
        samples = [(b - 128) / 128.0 for b in frames]
    else:
        samples = [0.0] * (len(frames) // sampwidth)

    if n_channels == 2:
        samples = [(samples[i] + samples[i + 1]) / 2
                   for i in range(0, len(samples) - 1, 2)]

    return samples, framerate


def yin_pitch_fast(samples: list, sample_rate: int,
                   min_hz: float = 60, max_hz: float = 1800) -> Optional[float]:
    """YIN pitch detection (optimised for instrument range)."""
    min_period = max(1, int(sample_rate / max_hz))
    max_period = min(len(samples) // 2, int(sample_rate / min_hz))

    if max_period <= min_period or len(samples) < max_period * 2:
        return None

    # Difference function
    d = [0.0] * max_period
    for tau in range(1, max_period):
        for j in range(min(max_period, len(samples) - tau)):
            diff = samples[j] - samples[j + tau]
            d[tau] += diff * diff

    # Cumulative mean normalised difference
    cmnd = [1.0] + [0.0] * (max_period - 1)
    running = 0.0
    for tau in range(1, max_period):
        running += d[tau]
        cmnd[tau] = (tau * d[tau] / running) if running > 0 else 1.0

    # First minimum below threshold
    for tau in range(min_period, max_period - 1):
        if cmnd[tau] < 0.12 and cmnd[tau] < cmnd[tau - 1] and cmnd[tau] <= cmnd[tau + 1]:
            denom = 2 * cmnd[tau] - cmnd[tau - 1] - cmnd[tau + 1]
            adj = 0.5 * (cmnd[tau + 1] - cmnd[tau - 1]) / (denom + 1e-10)
            return sample_rate / (tau + adj)

    return None


def detect_onsets_rms(samples: list, sample_rate: int,
                      hop: int = 256, frame: int = 1024) -> List[float]:
    """RMS-based onset detection with adaptive threshold."""
    energies = []
    for i in range(0, len(samples) - frame, hop):
        rms = math.sqrt(sum(s * s for s in samples[i:i + frame]) / frame)
        energies.append(rms)

    if not energies:
        return []

    # Adaptive threshold: local mean * factor
    onsets = []
    window = max(1, int(0.3 * sample_rate / hop))   # 300 ms lookback
    min_gap_frames = max(1, int(0.04 * sample_rate / hop))  # 40 ms min gap
    last_onset_frame = -min_gap_frames * 2

    for i in range(window, len(energies)):
        local_mean = sum(energies[max(0, i - window):i]) / window
        threshold = local_mean * 1.6 + 0.002
        if (energies[i] > threshold
                and energies[i] > energies[i - 1]
                and i - last_onset_frame >= min_gap_frames):
            onsets.append(i * hop / sample_rate)
            last_onset_frame = i

    return onsets


def freq_to_midi(freq: float) -> float:
    if freq <= 0:
        return 0.0
    return 69.0 + 12.0 * math.log2(freq / 440.0)


def extract_notes_from_audio(wav_path: str, tempo: int,
                             quantization: str, job_id: str) -> List[Dict]:
    """Full pitch + onset pipeline on a WAV file."""
    update_job(job_id, progress=75, stage="Εντοπισμός τόνων…")

    samples, sr = load_wav_samples(wav_path)
    onsets = detect_onsets_rms(samples, sr)

    beat_dur = 60.0 / tempo
    grid_map = {
        "1/4": beat_dur,
        "1/8": beat_dur / 2,
        "1/16": beat_dur / 4,
        "1/32": beat_dur / 8,
    }
    grid = grid_map.get(quantization, beat_dur / 2)

    frame_size = 2048
    notes = []

    for idx, onset_t in enumerate(onsets):
        start = int(onset_t * sr)
        end = (int(onsets[idx + 1] * sr) if idx + 1 < len(onsets)
               else min(start + frame_size * 3, len(samples)))

        frame = samples[start:start + frame_size]
        if len(frame) < 512:
            continue

        freq = yin_pitch_fast(frame, sr)
        if not freq:
            continue

        midi_f = freq_to_midi(freq)
        if midi_f < 36 or midi_f > 96:   # outside instrument range
            continue

        duration = max(0.05, (end - start) / sr)
        q_time = round(onset_t / grid) * grid
        q_dur = max(grid * 0.5, round(duration / grid) * grid)

        rms = math.sqrt(sum(s * s for s in frame) / len(frame))
        velocity = min(127, max(30, int(rms * 3000)))

        notes.append({
            "id": f"note_{idx}",
            "time": round(q_time, 4),
            "duration": round(q_dur, 4),
            "frequency": round(freq, 2),
            "midi": round(midi_f, 3),
            "midiRounded": round(midi_f),
            "microtonalOffset": round((midi_f - round(midi_f)) * 100, 1),
            "string": 0,
            "fret": 0,
            "velocity": velocity,
            "ornament": None,
        })

    update_job(job_id, progress=85, stage=f"Εντοπίστηκαν {len(notes)} νότες")
    return notes


# ─── Maqam detection (local fast version) ─────────────────────────────────────

MAQAM_PROFILES = {
    "Rast":     [0, 200, 350, 500, 700, 900, 1050, 1200],
    "Bayati":   [0, 150, 300, 500, 700, 800, 1000, 1200],
    "Hijaz":    [0, 100, 400, 500, 700, 800, 1100, 1200],
    "Nahawand": [0, 200, 300, 500, 700, 800, 1100, 1200],
    "Saba":     [0, 150, 300, 450, 700, 800, 1000, 1200],
    "Kurd":     [0, 100, 300, 500, 700, 800, 1000, 1200],
    "Sikah":    [0, 150, 350, 500, 700, 850, 1050, 1200],
    "Ajam":     [0, 200, 400, 500, 700, 900, 1100, 1200],
    "Hicazkar": [0, 100, 400, 500, 700, 800, 1100, 1200],
    "Husseini": [0, 150, 350, 500, 700, 850, 1000, 1200],
}

MAQAM_ARABIC = {
    "Rast": "راست", "Bayati": "بياتي", "Hijaz": "حجاز",
    "Nahawand": "نهاوند", "Saba": "صبا", "Kurd": "كرد",
    "Sikah": "سيكاه", "Ajam": "عجم", "Hicazkar": "حجازكار",
    "Husseini": "حسيني",
}


def detect_maqam_local(notes: List[Dict]) -> Optional[Dict]:
    """Fast local maqam detection via pitch-class scoring."""
    if len(notes) < 3:
        return None

    total_dur = sum(n.get("duration", 0.1) for n in notes)
    hist = {}
    for n in notes:
        pc = round(n["midi"]) % 12
        hist[pc] = hist.get(pc, 0) + n.get("duration", 0.1) / total_dur

    best_name, best_score, best_root = None, -1, 0

    for root_pc in range(12):
        for name, intervals in MAQAM_PROFILES.items():
            score = 0.0
            for interval in intervals:
                target_pc = (root_pc + round(interval / 100)) % 12
                score += hist.get(target_pc, 0)
            if score > best_score:
                best_score = score
                best_name = name
                best_root = root_pc

    if not best_name:
        return None

    return {
        "name": best_name,
        "arabic": MAQAM_ARABIC.get(best_name, ""),
        "confidence": min(0.95, best_score),
        "root": best_root,
        "intervals": MAQAM_PROFILES[best_name],
        "seyirDirection": "ascending",
        "key": best_name.lower(),
    }


# ─── Tempo estimation ──────────────────────────────────────────────────────────

def estimate_tempo(notes: List[Dict]) -> int:
    """Estimate BPM from note onset intervals."""
    if len(notes) < 4:
        return 80
    onsets = sorted(n["time"] for n in notes)
    intervals = [onsets[i + 1] - onsets[i]
                 for i in range(len(onsets) - 1)
                 if 0.05 < onsets[i + 1] - onsets[i] < 2.0]
    if not intervals:
        return 80
    median_interval = sorted(intervals)[len(intervals) // 2]
    bpm = 60.0 / median_interval
    # Snap to musical BPM
    for factor in [0.5, 1.0, 2.0]:
        candidate = bpm * factor
        if 40 <= candidate <= 240:
            return max(40, min(240, round(candidate / 4) * 4))
    return 80


# ─── Main pipeline ────────────────────────────────────────────────────────────

def run_transcription_pipeline(
    job_id: str,
    source_type: str,           # "youtube" | "file"
    source_path: str,           # URL or temp file path
    instrument: str = "oud",
    quantization: str = "1/8",
    use_whisper: bool = True,
):
    """
    Full async pipeline. Runs in a background thread.
    Stages: download → convert → whisper → pitch → maqam → done
    """
    tmpdir = tempfile.mkdtemp(prefix="maqamtab_")
    try:
        cleanup_old_jobs()

        # 1. Get WAV file
        if source_type == "youtube":
            if not check_yt_dlp():
                raise RuntimeError(
                    "yt-dlp δεν είναι εγκατεστημένο. Εκτελέστε: pip install yt-dlp"
                )
            wav_path = download_youtube(source_path, tmpdir, job_id)
        else:
            wav_path = source_path  # already a temp file
            update_job(job_id, status="downloading", progress=20,
                       stage="Φόρτωση αρχείου…")

        # 2. Normalise to 16 kHz mono WAV (required by Whisper + our YIN)
        if not check_ffmpeg():
            raise RuntimeError(
                "ffmpeg δεν είναι εγκατεστημένο. "
                "macOS: brew install ffmpeg | Ubuntu: apt install ffmpeg"
            )
        wav_16k = convert_to_wav(wav_path, tmpdir, job_id)

        # 3. Extract notes via pitch detection
        # Use a provisional tempo of 80; will be refined after onset detection
        notes = extract_notes_from_audio(wav_16k, 80, quantization, job_id)

        # 4. Estimate tempo from actual onsets
        tempo = estimate_tempo(notes)
        # Re-quantize with detected tempo
        grid_map = {
            "1/4": 60 / tempo,
            "1/8": 60 / tempo / 2,
            "1/16": 60 / tempo / 4,
            "1/32": 60 / tempo / 8,
        }
        grid = grid_map.get(quantization, 60 / tempo / 2)
        for n in notes:
            n["time"] = round(round(n["time"] / grid) * grid, 4)
            n["duration"] = max(grid * 0.5,
                                round(round(n["duration"] / grid) * grid, 4))

        update_job(job_id, progress=88, stage=f"Εκτίμηση tempo: {tempo} BPM")

        # 5. Local maqam detection
        maqam = detect_maqam_local(notes)
        update_job(job_id, progress=93, stage="Ανάλυση μακάμ ολοκληρώθηκε")

        # 6. Whisper metadata (title/language, not pitch — Whisper is for speech)
        whisper_info = {}
        if use_whisper and check_whisper():
            try:
                update_job(job_id, progress=95,
                           stage="Ανάλυση μεταδεδομένων με Whisper…")
                wresult = transcribe_with_whisper(wav_16k, job_id)
                whisper_info = {
                    "language": wresult.get("language"),
                    "text": wresult.get("text", "")[:500],
                }
            except Exception as e:
                whisper_info = {"error": str(e)}

        # 7. Done
        update_job(
            job_id,
            status="done",
            progress=100,
            stage="Ολοκληρώθηκε!",
            notes=notes,
            maqam=maqam,
            tempo=tempo,
            whisper_info=whisper_info,
        )

    except Exception as exc:
        update_job(job_id, status="error", error=str(exc),
                   stage=f"Σφάλμα: {str(exc)[:200]}")
    finally:
        # Clean up temp files (but not uploaded files managed by FastAPI)
        import shutil
        try:
            shutil.rmtree(tmpdir, ignore_errors=True)
        except Exception:
            pass

"""
MaqamTAB — AI Transcription Service v2
Handles: YouTube extraction (yt-dlp), audio conversion (ffmpeg),
         onset detection, YIN pitch, tempo estimation, maqam detection,
         and optional Whisper metadata extraction.
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
from typing import Optional, List, Dict
from pathlib import Path


# ─── In-memory job store ───────────────────────────────────────────────────────

_jobs: Dict[str, Dict] = {}
_lock = threading.Lock()


def create_job(job_id: str, source: str) -> Dict:
    job = {
        "id": job_id,
        "source": source,
        "status": "pending",
        "progress": 0,
        "stage": "Εκκίνηση…",
        "notes": [],
        "maqam": None,
        "tempo": 80,
        "title": None,
        "duration": None,
        "whisper_info": None,
        "error": None,
        "created_at": time.time(),
    }
    with _lock:
        _jobs[job_id] = job
    return job


def update_job(job_id: str, **kwargs):
    with _lock:
        if job_id in _jobs:
            _jobs[job_id].update(kwargs)


def get_job(job_id: str) -> Optional[Dict]:
    with _lock:
        return dict(_jobs[job_id]) if job_id in _jobs else None


def cleanup_old_jobs():
    cutoff = time.time() - 3600
    with _lock:
        old = [k for k, v in _jobs.items() if v["created_at"] < cutoff]
        for k in old:
            del _jobs[k]


# ─── Tool checks ──────────────────────────────────────────────────────────────

def check_tool(name: str) -> bool:
    try:
        return subprocess.run([name, "--version"], capture_output=True, timeout=5).returncode == 0
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
    update_job(job_id, status="downloading", progress=5, stage="Λήψη από YouTube…")
    out_template = os.path.join(output_dir, "%(title)s.%(ext)s")
    cmd = [
        "yt-dlp",
        "--extract-audio", "--audio-format", "wav", "--audio-quality", "0",
        "--no-playlist", "--max-filesize", "150m",
        "--output", out_template, "--no-progress", url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300, cwd=output_dir)
    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp failed: {result.stderr[:400]}")

    wav_files = list(Path(output_dir).glob("*.wav"))
    if not wav_files:
        raise RuntimeError("Δεν βρέθηκε αρχείο WAV μετά τη λήψη")

    # Try to extract title from output
    title_line = (result.stdout or "").strip().split("\n")[0]
    if title_line:
        update_job(job_id, title=title_line)

    update_job(job_id, progress=28, stage="Λήψη ολοκληρώθηκε")
    return str(wav_files[0])


# ─── ffmpeg conversion to 16kHz mono WAV ──────────────────────────────────────

def convert_to_wav16k(input_path: str, output_dir: str, job_id: str) -> str:
    update_job(job_id, progress=15, stage="Μετατροπή σε WAV 16kHz…")
    output_path = os.path.join(output_dir, "audio_16k.wav")
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-ac", "1", "-ar", "16000", "-acodec", "pcm_s16le",
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=180)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg error: {result.stderr.decode()[:300]}")

    # Get audio duration
    try:
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", input_path],
            capture_output=True, text=True, timeout=10,
        )
        info = json.loads(probe.stdout)
        dur = float(info.get("format", {}).get("duration", 0))
        if dur > 0:
            update_job(job_id, duration=round(dur, 1))
    except Exception:
        pass

    update_job(job_id, progress=28, stage="Μετατροπή ολοκληρώθηκε")
    return output_path


# ─── WAV loader ───────────────────────────────────────────────────────────────

def load_wav_samples(wav_path: str):
    """Returns (samples: list[float], sample_rate: int)"""
    with wave.open(wav_path, "rb") as w:
        n_ch = w.getnchannels()
        sw = w.getsampwidth()
        sr = w.getframerate()
        frames = w.readframes(w.getnframes())

    if sw == 2:
        raw = struct.unpack(f"<{len(frames)//2}h", frames)
        samples = [s / 32768.0 for s in raw]
    elif sw == 1:
        samples = [(b - 128) / 128.0 for b in frames]
    else:
        samples = [0.0] * (len(frames) // max(1, sw))

    if n_ch == 2:
        samples = [(samples[i] + samples[i + 1]) / 2
                   for i in range(0, len(samples) - 1, 2)]
    return samples, sr


# ─── YIN Pitch Detection ───────────────────────────────────────────────────────

def yin_pitch(samples: list, sr: int, min_hz=60, max_hz=1800) -> Optional[float]:
    min_tau = max(1, int(sr / max_hz))
    max_tau = min(len(samples) // 2, int(sr / min_hz))
    if max_tau <= min_tau or len(samples) < max_tau * 2:
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


# ─── Onset Detection ───────────────────────────────────────────────────────────

def detect_onsets(samples: list, sr: int, hop=256, frame=1024) -> List[float]:
    energies = []
    for i in range(0, len(samples) - frame, hop):
        rms = math.sqrt(sum(s * s for s in samples[i:i + frame]) / frame)
        energies.append(rms)

    if not energies:
        return []

    window = max(1, int(0.3 * sr / hop))
    min_gap = max(1, int(0.04 * sr / hop))
    last = -min_gap * 2
    onsets = []

    for i in range(window, len(energies)):
        local_mean = sum(energies[max(0, i - window):i]) / window
        threshold = local_mean * 1.6 + 0.002
        if energies[i] > threshold and energies[i] > energies[i - 1] and i - last >= min_gap:
            onsets.append(i * hop / sr)
            last = i
    return onsets


# ─── Tempo Estimation ─────────────────────────────────────────────────────────

def estimate_tempo(notes: List[Dict]) -> int:
    if len(notes) < 4:
        return 80
    onsets = sorted(n["time"] for n in notes)
    intervals = [b - a for a, b in zip(onsets, onsets[1:]) if 0.05 < b - a < 2.0]
    if not intervals:
        return 80
    median = sorted(intervals)[len(intervals) // 2]
    raw_bpm = 60.0 / median
    for factor in [0.5, 1.0, 2.0]:
        bpm = raw_bpm * factor
        if 40 <= bpm <= 240:
            return max(40, min(240, round(bpm / 4) * 4))
    return 80


# ─── MIDI helpers ─────────────────────────────────────────────────────────────

def freq_to_midi(freq: float) -> float:
    return 69.0 + 12.0 * math.log2(max(1, freq) / 440.0)


def midi_to_string_fret(midi_float: float, tuning_strings: List[Dict]):
    midi = round(midi_float)
    microtonal = round((midi_float - midi) * 100)
    # Sort strings descending by midi (lowest string first in tab notation)
    strings_sorted = sorted(enumerate(tuning_strings), key=lambda x: x[1]["midi"], reverse=True)
    for orig_idx, s in strings_sorted:
        fret = midi - s["midi"]
        if 0 <= fret <= 24:
            return orig_idx, fret, microtonal
    return 0, 0, microtonal


# ─── Full Note Extraction ─────────────────────────────────────────────────────

def extract_notes(wav_path: str, tempo: int, quantization: str, tuning_strings: List[Dict], job_id: str) -> List[Dict]:
    update_job(job_id, progress=45, stage="Εντοπισμός onsets…")
    samples, sr = load_wav_samples(wav_path)

    onsets = detect_onsets(samples, sr)
    update_job(job_id, progress=55, stage=f"{len(onsets)} onsets βρέθηκαν")

    grid_map = {"1/4": 60/tempo, "1/8": 60/tempo/2, "1/16": 60/tempo/4, "1/32": 60/tempo/8}
    grid = grid_map.get(quantization, 60/tempo/2)
    frame_size = 2048
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

        midi_f = freq_to_midi(freq)
        if midi_f < 36 or midi_f > 96:
            continue

        duration = max(0.05, (end - start) / sr)
        q_time = round(onset_t / grid) * grid
        q_dur = max(grid * 0.5, round(duration / grid) * grid)

        rms = math.sqrt(sum(s * s for s in frame) / len(frame))
        velocity = min(127, max(30, int(rms * 3000)))

        string_idx, fret, microtonal = midi_to_string_fret(midi_f, tuning_strings)

        notes.append({
            "id": f"note_{i}",
            "time": round(q_time, 4),
            "duration": round(q_dur, 4),
            "frequency": round(freq, 2),
            "midi": round(midi_f, 3),
            "midiRounded": round(midi_f),
            "microtonalOffset": microtonal,
            "string": string_idx,
            "fret": fret,
            "velocity": velocity,
            "ornament": None,
        })

    update_job(job_id, progress=72, stage=f"{len(notes)} νότες εντοπίστηκαν")
    return notes


# ─── Maqam Detection ─────────────────────────────────────────────────────────

MAQAM_PROFILES = {
    "Rast":     {"arabic": "راست",   "intervals": [0,200,350,500,700,900,1050,1200], "seyirDirection": "ascending"},
    "Bayati":   {"arabic": "بياتي",  "intervals": [0,150,300,500,700,800,1000,1200], "seyirDirection": "ascending"},
    "Hijaz":    {"arabic": "حجاز",   "intervals": [0,100,400,500,700,800,1100,1200], "seyirDirection": "ascending"},
    "Nahawand": {"arabic": "نهاوند", "intervals": [0,200,300,500,700,800,1100,1200], "seyirDirection": "descending"},
    "Saba":     {"arabic": "صبا",    "intervals": [0,150,300,450,700,800,1000,1200], "seyirDirection": "descending"},
    "Kurd":     {"arabic": "كرد",    "intervals": [0,100,300,500,700,800,1000,1200], "seyirDirection": "ascending"},
    "Sikah":    {"arabic": "سيكاه",  "intervals": [0,150,350,500,700,850,1050,1200], "seyirDirection": "ascending"},
    "Ajam":     {"arabic": "عجم",    "intervals": [0,200,400,500,700,900,1100,1200], "seyirDirection": "ascending"},
    "Hicazkar": {"arabic": "حجازكار","intervals": [0,100,400,500,700,800,1100,1200], "seyirDirection": "mixed"},
    "Husseini": {"arabic": "حسيني",  "intervals": [0,150,350,500,700,850,1000,1200], "seyirDirection": "ascending"},
}


def detect_maqam(notes: List[Dict]) -> Optional[Dict]:
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


# ─── Optional Whisper transcription ───────────────────────────────────────────

def run_whisper(wav_path: str, job_id: str) -> Dict:
    update_job(job_id, progress=88, stage="Φόρτωση Whisper AI…")
    try:
        import whisper
        model_name = os.environ.get("WHISPER_MODEL", "base")
        model = whisper.load_model(model_name)
        update_job(job_id, progress=91, stage=f"Whisper ({model_name}) αναλύει…")
        result = model.transcribe(wav_path, task="transcribe", language=None, verbose=False)
        update_job(job_id, progress=95, stage="Whisper ολοκληρώθηκε")
        return {
            "language": result.get("language"),
            "text": result.get("text", "")[:600],
        }
    except Exception as e:
        return {"error": str(e)[:200]}


# ─── Main Pipeline ────────────────────────────────────────────────────────────

def run_transcription_pipeline(
    job_id: str,
    source_type: str,       # "youtube" | "file"
    source_path: str,       # URL or temp file path
    instrument: str = "oud",
    quantization: str = "1/8",
    use_whisper: bool = True,
    tuning_strings: Optional[List[Dict]] = None,
):
    """Full async pipeline. Runs in a background thread."""
    # Default tuning strings (Arabic Standard Oud) if not provided
    if not tuning_strings:
        tuning_strings = [
            {"midi": 36}, {"midi": 41}, {"midi": 45},
            {"midi": 50}, {"midi": 55}, {"midi": 60},
        ]

    tmpdir = tempfile.mkdtemp(prefix="maqamtab_")
    try:
        cleanup_old_jobs()

        # 1. Acquire WAV
        if source_type == "youtube":
            wav_path = download_youtube(source_path, tmpdir, job_id)
        else:
            wav_path = source_path
            update_job(job_id, status="downloading", progress=10, stage="Φόρτωση αρχείου…")

        # 2. Convert to 16kHz mono
        wav_16k = convert_to_wav16k(wav_path, tmpdir, job_id)
        update_job(job_id, status="analyzing")

        # 3. Extract notes
        notes = extract_notes(wav_16k, 80, quantization, tuning_strings, job_id)

        # 4. Refine tempo
        tempo = estimate_tempo(notes)
        grid_map = {"1/4": 60/tempo, "1/8": 60/tempo/2, "1/16": 60/tempo/4, "1/32": 60/tempo/8}
        grid = grid_map.get(quantization, 60/tempo/2)
        for n in notes:
            n["time"] = round(round(n["time"] / grid) * grid, 4)
            n["duration"] = max(grid * 0.5, round(round(n["duration"] / grid) * grid, 4))
        update_job(job_id, progress=80, stage=f"Tempo: {tempo} BPM")

        # 5. Maqam detection
        maqam = detect_maqam(notes)
        update_job(job_id, progress=85, stage="Ανάλυση μακάμ ολοκληρώθηκε")

        # 6. Optional Whisper
        whisper_info = {}
        if use_whisper and check_whisper():
            whisper_info = run_whisper(wav_16k, job_id)

        # 7. Done
        update_job(
            job_id,
            status="done",
            progress=100,
            stage=f"Ολοκληρώθηκε! {len(notes)} νότες",
            notes=notes,
            maqam=maqam,
            tempo=tempo,
            whisper_info=whisper_info,
        )

    except Exception as exc:
        update_job(job_id, status="error", error=str(exc), stage=f"Σφάλμα: {str(exc)[:200]}")
    finally:
        import shutil
        try:
            shutil.rmtree(tmpdir, ignore_errors=True)
        except Exception:
            pass

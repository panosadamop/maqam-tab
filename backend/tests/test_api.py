"""
MaqamTAB Backend Tests
Run: pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "MaqamTAB" in data["service"]


def test_export_musicxml_empty():
    """Export with empty notes should still return valid XML"""
    payload = {
        "notes": [],
        "instrument": "oud",
        "tuningId": "arabic_standard",
        "tuningName": "Arabic Standard",
        "tuningStrings": [
            {"midi": 52, "name": "E3"},
            {"midi": 57, "name": "A3"},
            {"midi": 62, "name": "D4"},
            {"midi": 67, "name": "G4"},
            {"midi": 71, "name": "B4"},
            {"midi": 76, "name": "E5"},
        ],
        "tempo": 80,
        "maqam": "Rast",
        "maqamArabic": "راست",
    }
    response = client.post("/api/export/musicxml", json=payload)
    assert response.status_code == 200
    content = response.content.decode("utf-8")
    assert "<?xml" in content
    assert "score-partwise" in content


def test_export_musicxml_with_notes():
    """Export with notes should include pitch data"""
    payload = {
        "notes": [
            {
                "time": 0.0,
                "duration": 0.5,
                "midi": 62.0,
                "microtonalOffset": 0.0,
                "string": 2,
                "fret": 0,
                "ornament": None,
                "velocity": 80,
            },
            {
                "time": 0.5,
                "duration": 0.5,
                "midi": 64.0,
                "microtonalOffset": -50.0,  # quarter-tone flat
                "string": 2,
                "fret": 2,
                "ornament": "vibrato",
                "velocity": 90,
            },
        ],
        "instrument": "oud",
        "tuningId": "arabic_standard",
        "tuningName": "Arabic Standard",
        "tuningStrings": [
            {"midi": 52, "name": "E3"},
            {"midi": 57, "name": "A3"},
            {"midi": 62, "name": "D4"},
            {"midi": 67, "name": "G4"},
            {"midi": 71, "name": "B4"},
            {"midi": 76, "name": "E5"},
        ],
        "tempo": 80,
        "maqam": "Rast",
        "maqamArabic": "راست",
    }
    response = client.post("/api/export/musicxml", json=payload)
    assert response.status_code == 200
    content = response.content.decode("utf-8")
    assert "<fret>" in content
    assert "<string>" in content


def test_export_musicxml_saz():
    """Test with saz instrument and different tuning"""
    payload = {
        "notes": [
            {
                "time": 0.0,
                "duration": 1.0,
                "midi": 45.0,
                "microtonalOffset": 0.0,
                "string": 0,
                "fret": 0,
                "ornament": "slide_up",
                "velocity": 70,
            }
        ],
        "instrument": "saz",
        "tuningId": "baglama_standard",
        "tuningName": "Kara Düzen",
        "tuningStrings": [
            {"midi": 45, "name": "A2"},
            {"midi": 52, "name": "E3"},
            {"midi": 57, "name": "A3"},
        ],
        "tempo": 100,
        "maqam": "Hijaz",
        "maqamArabic": "حجاز",
    }
    response = client.post("/api/export/musicxml", json=payload)
    assert response.status_code == 200


def test_microtonal_alter_in_xml():
    """Quarter-tone should produce fractional alter"""
    payload = {
        "notes": [
            {
                "time": 0.0,
                "duration": 1.0,
                "midi": 62.0,
                "microtonalOffset": -50.0,  # half-flat = -0.5 alter
                "string": 2,
                "fret": 0,
                "ornament": None,
                "velocity": 80,
            }
        ],
        "instrument": "oud",
        "tuningId": "arabic_standard",
        "tuningName": "Arabic Standard",
        "tuningStrings": [{"midi": 52, "name": "E3"}, {"midi": 57, "name": "A3"},
                          {"midi": 62, "name": "D4"}, {"midi": 67, "name": "G4"},
                          {"midi": 71, "name": "B4"}, {"midi": 76, "name": "E5"}],
        "tempo": 60,
        "maqam": "Bayati",
        "maqamArabic": "بياتي",
    }
    response = client.post("/api/export/musicxml", json=payload)
    assert response.status_code == 200
    content = response.content.decode("utf-8")
    # Should have a fractional alter value
    assert "<alter>" in content


# ─── AI Transcription endpoint tests ──────────────────────────────────────────

def test_ai_status():
    """AI status endpoint should always return a valid response."""
    response = client.get("/api/ai/status")
    assert response.status_code == 200
    data = response.json()
    assert "available" in data


def test_health_includes_ai():
    """Health endpoint should report AI availability."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert "ai_available" in data


def test_youtube_invalid_url():
    """Non-YouTube URL should return 400."""
    response = client.post("/api/ai/youtube", json={
        "url": "https://vimeo.com/12345",
        "instrument": "oud",
        "quantization": "1/8",
        "use_whisper": False,
    })
    assert response.status_code == 400


def test_youtube_malformed_url():
    """Completely invalid URL should return 400."""
    response = client.post("/api/ai/youtube", json={
        "url": "not-a-url",
        "instrument": "oud",
        "quantization": "1/8",
        "use_whisper": False,
    })
    assert response.status_code == 400


def test_job_not_found():
    """Non-existent job should return 404."""
    response = client.get("/api/ai/job/nonexistent-job-id-12345")
    # 503 if AI not available, 404 if AI available but job not found
    assert response.status_code in (404, 503)


def test_upload_invalid_file_type():
    """Uploading a non-audio file should return 400."""
    import io
    fake_file = io.BytesIO(b"this is not audio content")
    response = client.post(
        "/api/ai/upload",
        files={"file": ("document.pdf", fake_file, "application/pdf")},
        data={"instrument": "oud", "quantization": "1/8"},
    )
    # Either 400 (wrong type) or 503 (AI not available)
    assert response.status_code in (400, 503)

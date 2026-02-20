"""Tests for MaqamTAB API v2"""
import pytest
from fastapi.testclient import TestClient
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["version"] == "2.0.0"
    assert "ai_available" in data


def test_health_has_ai_tools():
    res = client.get("/health")
    assert "ai_tools" in res.json()


def test_ai_status():
    res = client.get("/api/ai/status")
    assert res.status_code == 200
    assert "available" in res.json()


def test_youtube_invalid_url():
    res = client.post("/api/ai/youtube", json={
        "url": "not-a-url", "instrument": "oud", "quantization": "1/8", "use_whisper": False
    })
    assert res.status_code == 400


def test_youtube_non_youtube_url():
    res = client.post("/api/ai/youtube", json={
        "url": "https://vimeo.com/12345", "instrument": "oud", "quantization": "1/8", "use_whisper": False
    })
    assert res.status_code == 400


def test_job_not_found():
    res = client.get("/api/ai/job/nonexistent-job-00000")
    assert res.status_code in (404, 503)


def test_export_musicxml_empty():
    res = client.post("/api/export/musicxml", json={
        "notes": [],
        "instrument": "oud",
        "tuningId": "arabic_standard",
        "tuningName": "Arabic Standard",
        "tuningStrings": [{"note": "C2", "midi": 36}],
        "tempo": 80,
        "title": "Test"
    })
    assert res.status_code == 200
    assert b"score-partwise" in res.content


def test_export_musicxml_with_note():
    res = client.post("/api/export/musicxml", json={
        "notes": [{"time": 0.0, "duration": 0.5, "midi": 60.0, "midiRounded": 60,
                   "microtonalOffset": 0.0, "string": 0, "fret": 5, "velocity": 80}],
        "instrument": "oud",
        "tuningId": "arabic_standard",
        "tuningName": "Arabic Standard",
        "tuningStrings": [{"note": "C2", "midi": 36}],
        "tempo": 80,
        "title": "Test Note"
    })
    assert res.status_code == 200


def test_export_musicxml_microtonal():
    res = client.post("/api/export/musicxml", json={
        "notes": [{"time": 0.0, "duration": 0.5, "midi": 60.25, "midiRounded": 60,
                   "microtonalOffset": 25.0, "string": 0, "fret": 5, "velocity": 80}],
        "instrument": "oud",
        "tuningId": "arabic_standard",
        "tuningName": "Arabic Standard",
        "tuningStrings": [{"note": "C2", "midi": 36}],
        "tempo": 80,
        "title": "Microtonal Test"
    })
    assert res.status_code == 200
    assert b"alter" in res.content


def test_export_musicxml_saz():
    res = client.post("/api/export/musicxml", json={
        "notes": [{"time": 0.0, "duration": 0.25, "midi": 45.0, "midiRounded": 45,
                   "microtonalOffset": 0.0, "string": 0, "fret": 0, "velocity": 70}],
        "instrument": "saz",
        "tuningId": "baglamaduzen",
        "tuningName": "Bağlama Düzeni",
        "tuningStrings": [{"note": "A2", "midi": 45}],
        "tempo": 100,
        "title": "Saz Test"
    })
    assert res.status_code == 200


def test_upload_invalid_type():
    import io
    res = client.post(
        "/api/ai/upload",
        files={"file": ("doc.pdf", io.BytesIO(b"fake pdf"), "application/pdf")},
        data={"instrument": "oud", "quantization": "1/8"},
    )
    assert res.status_code in (400, 503)

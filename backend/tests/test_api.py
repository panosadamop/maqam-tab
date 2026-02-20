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

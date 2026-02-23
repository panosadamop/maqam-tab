import { useState, useRef, useCallback } from "react";
import {
  AppBar, Toolbar, Box, Tabs, Tab, Drawer, Typography,
  Select, MenuItem, FormControl, Slider, Chip, Stack,
  Divider, IconButton, Tooltip, Button,
} from "@mui/material";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import AudioEngine from "./components/AudioEngine";
import TabEditor from "./components/TabEditor";
import MaqamPanel from "./components/MaqamPanel";
import TuningPanel from "./components/TuningPanel";
import ExportPanel from "./components/ExportPanel";
import WaveformViewer from "./components/WaveformViewer";
import AITranscribePanel from "./components/AITranscribePanel";
import SampleBanner from "./components/SampleBanner";
import { INSTRUMENTS } from "./utils/instruments";
import { MAQAMAT } from "./utils/maqamat";
import { generateRastSample } from "./utils/sampleRast";

const SIDEBAR_WIDTH = 230;

export default function App() {
  const [instrument, setInstrument] = useState("oud");
  const [tuning, setTuning] = useState(INSTRUMENTS.oud.tunings[0]);
  const [notes, setNotes] = useState([]);
  const [detectedMaqam, setDetectedMaqam] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [tempo, setTempo] = useState(80);
  const [quantization, setQuantization] = useState("1/8");
  const [selectedNote, setSelectedNote] = useState(null);
  const [seyirPath, setSeyirPath] = useState([]);
  const [sampleDismissed, setSampleDismissed] = useState(false);
  const audioEngineRef = useRef(null);

  const TAB_KEYS = ["record", "ai", "edit", "maqam", "export"];
  const TAB_LABELS = ["🎙 Ηχογράφηση", "🤖 AI Μεταγραφή", "✏️ Επεξεργασία", "🎵 Μακάμ", "📄 Εξαγωγή"];

  const handleInstrumentChange = (inst) => {
    setInstrument(inst);
    setTuning(INSTRUMENTS[inst].tunings[0]);
    setNotes([]);
  };

  const handleAudioAnalyzed = useCallback((analyzedNotes, maqam, seyir) => {
    setNotes(analyzedNotes);
    setDetectedMaqam(maqam);
    setSeyirPath(seyir);
    setIsAnalyzing(false);
    setActiveTab(2);
  }, []);

  const handleNoteUpdate = (idx, updatedNote) => {
    setNotes((prev) => prev.map((n, i) => (i === idx ? { ...n, ...updatedNote } : n)));
  };

  const handleNoteDelete = (idx) => {
    setNotes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleNoteAdd = (note) => {
    setNotes((prev) => [...prev, note].sort((a, b) => a.time - b.time));
  };

  const handleAIImport = useCallback((notes, maqam, tempo) => {
    setNotes(notes);
    if (maqam) setDetectedMaqam(maqam);
    if (tempo) setTempo(tempo);
    setSeyirPath(maqam?.seyirPath || []);
    setActiveTab(2);
  }, []);

  const handleLoadRastSample = useCallback(() => {
    const { notes, maqam, tempo: sampleTempo } = generateRastSample(tuning, instrument, tempo);
    setNotes(notes);
    setDetectedMaqam(maqam);
    setSeyirPath(maqam.seyirPath);
    setTempo(sampleTempo);
    setAudioBuffer(null);
    setSampleDismissed(false);
    setActiveTab(2);
  }, [tuning, instrument, tempo]);

  const totalDuration = notes.length > 0
    ? Math.max(...notes.map(n => n.time + n.duration)).toFixed(1)
    : "—";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", bgcolor: "background.default" }}>
      {/* Top AppBar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          zIndex: 1200,
        }}
      >
        <Toolbar sx={{ gap: 2, minHeight: "56px !important", px: 2 }}>
          {/* Logo */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mr: 2 }}>
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
              <ellipse cx="18" cy="22" rx="10" ry="12" fill="#c9a96e" opacity="0.9" />
              <rect x="17" y="2" width="2" height="12" rx="1" fill="#8b6914" />
              <line x1="14" y1="18" x2="22" y2="18" stroke="#3a2a0a" strokeWidth="0.8" />
              <line x1="14" y1="21" x2="22" y2="21" stroke="#3a2a0a" strokeWidth="0.8" />
              <line x1="14" y1="24" x2="22" y2="24" stroke="#3a2a0a" strokeWidth="0.8" />
              <line x1="15" y1="27" x2="21" y2="27" stroke="#3a2a0a" strokeWidth="0.8" />
            </svg>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "'Playfair Display', serif",
                color: "primary.main",
                fontSize: "1.2rem",
                letterSpacing: 1,
              }}
            >
              Maqam<em style={{ fontStyle: "normal", color: "#e8c87a", marginLeft: 2 }}>TAB</em>
            </Typography>
          </Box>

          {/* Navigation tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              mx: "auto",
              "& .MuiTabs-indicator": { bgcolor: "primary.main", height: 2 },
              "& .MuiTab-root": { color: "text.secondary", minWidth: 120 },
              "& .Mui-selected": { color: "primary.light" },
            }}
          >
            {TAB_LABELS.map((label, i) => (
              <Tab key={i} label={label} />
            ))}
          </Tabs>

          {/* Instrument selector */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select
              value={instrument}
              onChange={(e) => handleInstrumentChange(e.target.value)}
              sx={{
                bgcolor: "background.default",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
                fontSize: "0.75rem",
              }}
            >
              <MenuItem value="oud">Oud</MenuItem>
              <MenuItem value="saz">Saz / Baglama</MenuItem>
            </Select>
          </FormControl>
        </Toolbar>
      </AppBar>

      {/* Main body */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            bgcolor: "background.paper",
            borderRight: "1px solid",
            borderColor: "divider",
            overflowY: "auto",
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <TuningPanel
            instrument={instrument}
            tuning={tuning}
            onTuningChange={setTuning}
          />

          {/* Rast Sample Button */}
          <Button
            variant="outlined"
            fullWidth
            onClick={handleLoadRastSample}
            sx={{
              fontSize: "0.7rem",
              borderColor: "rgba(201,169,110,0.4)",
              color: "primary.main",
              py: 0.75,
              background: "linear-gradient(135deg, rgba(201,169,110,0.07), rgba(139,58,42,0.07))",
              "&:hover": {
                borderColor: "primary.main",
                background: "linear-gradient(135deg, rgba(201,169,110,0.14), rgba(139,58,42,0.14))",
              },
              display: "flex",
              flexDirection: "column",
              gap: 0.25,
              lineHeight: 1.3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <span>🎵</span>
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "primary.light" }}>
                Rast Sample
              </Typography>
            </Box>
            <Typography sx={{ fontSize: "0.6rem", color: "text.secondary" }}>
              Φόρτωση δείγματος σε όλες τις καρτέλες
            </Typography>
          </Button>

          {detectedMaqam && (
            <Box
              sx={{
                background: "linear-gradient(135deg, rgba(201,169,110,0.1), rgba(139,58,42,0.1))",
                border: "1px solid rgba(201,169,110,0.3)",
                borderRadius: 1,
                p: 1.5,
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1.5, display: "block" }}>
                Ανιχνεύθηκε
              </Typography>
              <Typography variant="h6" sx={{ color: "primary.light", fontFamily: "'Playfair Display', serif", fontSize: "1.1rem" }}>
                {detectedMaqam.name}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {Math.round(detectedMaqam.confidence * 100)}% βεβαιότητα
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  size="small"
                  label={detectedMaqam.seyirDirection === "ascending" ? "↗ Ανοδικό" :
                    detectedMaqam.seyirDirection === "descending" ? "↘ Καθοδικό" : "↕ Μικτό"}
                  sx={{
                    bgcolor: detectedMaqam.seyirDirection === "ascending" ? "rgba(74,138,90,0.2)" :
                      detectedMaqam.seyirDirection === "descending" ? "rgba(212,136,42,0.2)" : "rgba(201,169,110,0.2)",
                    color: detectedMaqam.seyirDirection === "ascending" ? "#6ab04c" :
                      detectedMaqam.seyirDirection === "descending" ? "warning.main" : "primary.main",
                    fontSize: "0.65rem",
                  }}
                />
              </Box>
            </Box>
          )}

          <Divider sx={{ borderColor: "divider" }} />

          {/* Tempo */}
          <Box>
            <Typography variant="caption" sx={{ color: "primary.main", textTransform: "uppercase", letterSpacing: 1.5, display: "block", mb: 1 }}>
              Ρυθμός
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 30 }}>BPM</Typography>
              <Slider
                value={tempo}
                min={40} max={240}
                onChange={(_, v) => setTempo(v)}
                size="small"
                sx={{ color: "primary.main", flex: 1 }}
              />
              <Typography variant="caption" sx={{ color: "primary.light", minWidth: 28 }}>{tempo}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 55 }}>Κβαντ.</Typography>
              <Select
                value={quantization}
                onChange={(e) => setQuantization(e.target.value)}
                size="small"
                sx={{
                  fontSize: "0.7rem",
                  bgcolor: "background.default",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
                  flex: 1,
                }}
              >
                {["1/4", "1/8", "1/16", "1/32"].map(q => (
                  <MenuItem key={q} value={q} sx={{ fontSize: "0.7rem" }}>{q}</MenuItem>
                ))}
              </Select>
            </Box>
          </Box>

          {notes.length > 0 && (
            <>
              <Divider sx={{ borderColor: "divider" }} />
              <Box>
                <Typography variant="caption" sx={{ color: "primary.main", textTransform: "uppercase", letterSpacing: 1.5, display: "block", mb: 1 }}>
                  Στατιστικά
                </Typography>
                <Stack spacing={0.5}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Νότες</Typography>
                    <Typography variant="caption" sx={{ color: "primary.light", fontWeight: 600 }}>{notes.length}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Διάρκεια</Typography>
                    <Typography variant="caption" sx={{ color: "primary.light", fontWeight: 600 }}>{totalDuration}s</Typography>
                  </Box>
                </Stack>
              </Box>
            </>
          )}
        </Box>

        {/* Main content */}
        <Box sx={{ flex: 1, overflow: "auto", bgcolor: "background.default" }}>
          {activeTab === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <SampleBanner maqam={!sampleDismissed ? detectedMaqam : null} onDismiss={() => setSampleDismissed(true)} />
              <AudioEngine
                ref={audioEngineRef}
                instrument={instrument}
                tuning={tuning}
                tempo={tempo}
                quantization={quantization}
                onAudioAnalyzed={handleAudioAnalyzed}
                onRecordingChange={setIsRecording}
                onAnalyzingChange={setIsAnalyzing}
                onAudioBuffer={setAudioBuffer}
              />
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <SampleBanner maqam={!sampleDismissed ? detectedMaqam : null} onDismiss={() => setSampleDismissed(true)} />
              <AITranscribePanel
                instrument={instrument}
                quantization={quantization}
                onNotesImported={handleAIImport}
              />
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <SampleBanner maqam={!sampleDismissed ? detectedMaqam : null} onDismiss={() => setSampleDismissed(true)} />
              {audioBuffer && <WaveformViewer buffer={audioBuffer} notes={notes} />}
              <TabEditor
                notes={notes}
                tuning={tuning}
                instrument={instrument}
                selectedNote={selectedNote}
                onSelectNote={setSelectedNote}
                onNoteUpdate={handleNoteUpdate}
                onNoteDelete={handleNoteDelete}
                onNoteAdd={handleNoteAdd}
                tempo={tempo}
              />
            </Box>
          )}

          {activeTab === 3 && (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <SampleBanner maqam={!sampleDismissed ? detectedMaqam : null} onDismiss={() => setSampleDismissed(true)} />
              <MaqamPanel
                notes={notes}
                detectedMaqam={detectedMaqam}
                seyirPath={seyirPath}
                onMaqamOverride={setDetectedMaqam}
                tuning={tuning}
                instrument={instrument}
              />
            </Box>
          )}

          {activeTab === 4 && (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <SampleBanner maqam={!sampleDismissed ? detectedMaqam : null} onDismiss={() => setSampleDismissed(true)} />
              <ExportPanel
                notes={notes}
                tuning={tuning}
                instrument={instrument}
                detectedMaqam={detectedMaqam}
                tempo={tempo}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

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
import { INSTRUMENTS, expandSazTuning } from "./utils/instruments";
import { loadSoundfont, getCustomSamplesInfo } from "./utils/audioEngine";
import CustomSamplesPanel from "./components/CustomSamplesPanel";
import { MAQAMAT } from "./utils/maqamat";
import { generateRastSample, generateUsaqSample, generateOudScaleSample } from "./utils/sampleRast";

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

  // ── Settings ───────────────────────────────────────────────────────────────
  const [audioMode,  setAudioMode]  = useState("karplus");  // "synth" | "karplus" | "soundfont"
  const [sazStrings, setSazStrings] = useState("3");          // "3" | "7"
  const [sfLoading,  setSfLoading]  = useState(false);
  const [sfReady,    setSfReady]    = useState(false);
  const [customCount, setCustomCount] = useState(() => getCustomSamplesInfo().count);

  // Compute effective tuning (expanded for saz 7-string mode)
  const effectiveTuning = (instrument === "saz" && sazStrings === "7")
    ? expandSazTuning(tuning)
    : tuning;

  const handleAudioModeChange = async (mode) => {
    setAudioMode(mode);
    if (mode === "soundfont" && !sfReady) {
      setSfLoading(true);
      const ok = await loadSoundfont(instrument);
      setSfReady(ok);
      setSfLoading(false);
      if (!ok) setAudioMode("karplus"); // fallback to Karplus if CDN unavailable
    }
  };

  const TAB_KEYS = ["record", "ai", "edit", "maqam", "export", "samples"];
  const TAB_LABELS = ["🎙 Ηχογράφηση", "🤖 AI Μεταγραφή", "✏️ Επεξεργασία", "🎵 Μακάμ", "📄 Εξαγωγή", "🎸 Samples"];

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

  const handleLoadUsaqSample = useCallback(() => {
    const { notes, maqam, tempo: sampleTempo } = generateUsaqSample(tuning, instrument, tempo);
    setNotes(notes);
    setDetectedMaqam(maqam);
    setSeyirPath(maqam.seyirPath);
    setTempo(sampleTempo);
    setAudioBuffer(null);
    setSampleDismissed(false);
    setActiveTab(2);
  }, [tuning, instrument, tempo]);

  const handleLoadOudScale = useCallback(() => {
    const { notes, maqam, tempo: sampleTempo } = generateOudScaleSample(tuning, instrument, tempo);
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

          {/* Sample Buttons */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Typography variant="caption" sx={{
              fontSize: "0.57rem", fontWeight: 600, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "rgba(201,169,110,0.45)",
              display: "block", mb: 0.25,
            }}>
              Δείγματα
            </Typography>

            {/* Rast */}
            <Button variant="outlined" fullWidth onClick={handleLoadRastSample} sx={{
              fontSize: "0.7rem", py: 0.65, justifyContent: "flex-start",
              borderColor: "rgba(106,176,76,0.4)", color: "#6ab04c",
              bgcolor: "rgba(106,176,76,0.05)",
              "&:hover": { borderColor: "#6ab04c", bgcolor: "rgba(106,176,76,0.12)" },
              display: "flex", alignItems: "center", gap: 1,
            }}>
              <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#6ab04c", flexShrink: 0 }}/>
              <Box sx={{ textAlign: "left" }}>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "#6ab04c", lineHeight: 1.2 }}>
                  Rast
                </Typography>
                <Typography sx={{ fontSize: "0.57rem", color: "text.secondary", lineHeight: 1.2 }}>
                  D — ανοδικό σέιρ
                </Typography>
              </Box>
            </Button>

            {/* Uşak */}
            <Button variant="outlined" fullWidth onClick={handleLoadUsaqSample} sx={{
              fontSize: "0.7rem", py: 0.65, justifyContent: "flex-start",
              borderColor: "rgba(90,143,160,0.4)", color: "#5a8fa0",
              bgcolor: "rgba(90,143,160,0.05)",
              "&:hover": { borderColor: "#5a8fa0", bgcolor: "rgba(90,143,160,0.12)" },
              display: "flex", alignItems: "center", gap: 1,
            }}>
              <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#5a8fa0", flexShrink: 0 }}/>
              <Box sx={{ textAlign: "left" }}>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "#5a8fa0", lineHeight: 1.2 }}>
                  Uşak
                </Typography>
                <Typography sx={{ fontSize: "0.57rem", color: "text.secondary", lineHeight: 1.2 }}>
                  A — καθοδικό σέιρ
                </Typography>
              </Box>
            </Button>

            {/* Oud Scale */}
            <Button variant="outlined" fullWidth onClick={handleLoadOudScale} sx={{
              fontSize: "0.7rem", py: 0.65, justifyContent: "flex-start",
              borderColor: "rgba(201,169,110,0.35)", color: "primary.main",
              bgcolor: "rgba(201,169,110,0.04)",
              "&:hover": { borderColor: "primary.main", bgcolor: "rgba(201,169,110,0.1)" },
              display: "flex", alignItems: "center", gap: 1,
            }}>
              <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0 }}/>
              <Box sx={{ textAlign: "left" }}>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "primary.light", lineHeight: 1.2 }}>
                  Κλίμακα Ούτι
                </Typography>
                <Typography sx={{ fontSize: "0.57rem", color: "text.secondary", lineHeight: 1.2 }}>
                  Ανοιχτές + χρωματική
                </Typography>
              </Box>
            </Button>
          </Box>

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

          {/* ── Settings ── */}
          <Divider sx={{ borderColor: "divider" }} />
          <Box>
            <Typography variant="caption" sx={{
              color: "primary.main", textTransform: "uppercase",
              letterSpacing: 1.5, display: "block", mb: 1.5
            }}>
              Ρυθμίσεις
            </Typography>

            {/* Audio mode */}
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
              Ήχος οργάνου
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1 }}>
              {[
                { val: "custom",    label: "Custom",   desc: customCount > 0 ? `${customCount} νότες φορτωμένες` : "Δεν έχεις φορτώσει ακόμα →", icon: "🎙" },
                { val: "karplus",   label: "Χορδή",    desc: "Karplus-Strong — πλήκτρο", icon: "🎸" },
                { val: "soundfont", label: "CDN",       desc: "Πραγματικές ηχογραφήσεις",  icon: "🎵" },
                { val: "synth",     label: "Synth",     desc: "Απλός ταλαντωτής",          icon: "🎛" },
              ].map(({ val, label, desc, icon }) => {
                const isCustom   = val === "custom";
                const isDisabled = isCustom && customCount === 0;
                return (
                <Box
                  key={val}
                  onClick={() => !isDisabled && handleAudioModeChange(val)}
                  sx={{
                    py: 0.55, px: 0.85,
                    borderRadius: 0.75, border: "1px solid",
                    cursor: isDisabled ? "default" : "pointer",
                    opacity: isDisabled ? 0.45 : val === "soundfont" && sfLoading ? 0.6 : 1,
                    borderColor: audioMode === val ? "primary.main" : "divider",
                    bgcolor: audioMode === val ? "rgba(201,169,110,0.1)" : "transparent",
                    transition: "all 0.13s",
                    "&:hover": isDisabled ? {} : { borderColor: "rgba(201,169,110,0.5)" },
                    display: "flex", alignItems: "center", gap: 0.75,
                  }}
                >
                  <Typography sx={{ fontSize: "0.72rem", lineHeight: 1 }}>{icon}</Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography sx={{
                        fontSize: "0.68rem", fontWeight: audioMode === val ? 600 : 400,
                        color: audioMode === val ? "primary.light" : "text.primary",
                        lineHeight: 1.2, whiteSpace: "nowrap",
                      }}>
                        {sfLoading && val === "soundfont" ? "Φορτώνει..." : label}
                      </Typography>
                      {isCustom && customCount > 0 && (
                        <Box sx={{ px: 0.5, py: 0.05, borderRadius: 0.4,
                          bgcolor: "rgba(106,176,76,0.15)", border: "1px solid rgba(106,176,76,0.3)" }}>
                          <Typography sx={{ fontSize: "0.52rem", color: "#6ab04c", fontFamily: "Ubuntu Mono, monospace" }}>
                            ×{customCount}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <Typography sx={{ fontSize: "0.56rem", color: isCustom && customCount === 0 ? "primary.dark" : "text.secondary", lineHeight: 1.2 }}>
                      {desc}
                    </Typography>
                  </Box>
                  {audioMode === val && (
                    <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0 }}/>
                  )}
                </Box>
                );
              })}
            </Box>


            {audioMode === "soundfont" && sfReady && (
              <Typography variant="caption" sx={{ color: "success.main", fontSize: "0.6rem", display: "block", mb: 1 }}>
                ✓ Samples φορτώθηκαν
              </Typography>
            )}
            {audioMode === "soundfont" && !sfReady && !sfLoading && (
              <Typography variant="caption" sx={{ color: "warning.main", fontSize: "0.6rem", display: "block", mb: 1 }}>
                ⚠ Χρειάζεται internet για samples
              </Typography>
            )}

            {/* Saz strings (only when saz selected) */}
            {instrument === "saz" && (
              <>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                  Χορδές σαζ
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  {[
                    { val: "3", label: "3 strings", icon: "≡" },
                    { val: "7", label: "7 strings", icon: "≣" },
                  ].map(({ val, label, icon }) => (
                    <Box
                      key={val}
                      onClick={() => setSazStrings(val)}
                      sx={{
                        flex: 1, py: 0.5, px: 0.75,
                        borderRadius: 1, border: "1px solid",
                        cursor: "pointer", textAlign: "center",
                        borderColor: sazStrings === val ? "primary.main" : "divider",
                        bgcolor: sazStrings === val ? "rgba(201,169,110,0.12)" : "background.default",
                        color: sazStrings === val ? "primary.light" : "text.secondary",
                        fontSize: "0.68rem",
                        fontFamily: "'Ubuntu Mono', monospace",
                        transition: "all 0.15s",
                        "&:hover": { borderColor: "primary.dark" },
                      }}
                    >
                      {icon} {label}
                    </Box>
                  ))}
                </Box>
                {sazStrings === "7" && (
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem", display: "block", mt: 0.5 }}>
                    2+2+3 courses — πλήρης εμφάνιση
                  </Typography>
                )}
              </>
            )}
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
                tuning={effectiveTuning}
                instrument={instrument}
                audioMode={audioMode}
                selectedNote={selectedNote}
                onSelectNote={setSelectedNote}
                onNoteUpdate={handleNoteUpdate}
                onNoteDelete={handleNoteDelete}
                onNoteAdd={handleNoteAdd}
                tempo={tempo}
                detectedMaqam={detectedMaqam}
                onMaqamDetected={setDetectedMaqam}
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
                tuning={effectiveTuning}
                instrument={instrument}
                audioMode={audioMode}
              />
            </Box>
          )}

          {activeTab === 4 && (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <SampleBanner maqam={!sampleDismissed ? detectedMaqam : null} onDismiss={() => setSampleDismissed(true)} />
              <ExportPanel
                notes={notes}
                tuning={effectiveTuning}
                instrument={instrument}
                detectedMaqam={detectedMaqam}
                tempo={tempo}
              />
            </Box>
          )}

          {activeTab === 5 && (
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
              <CustomSamplesPanel
                audioMode={audioMode}
                onModeChange={(mode) => setAudioMode(mode)}
                onCountChange={(n) => setCustomCount(n)}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

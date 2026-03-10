import { useState, useRef, useEffect, useCallback } from "react";
import {
  Box, Typography, Paper, Button, ButtonGroup, TextField,
  Chip, LinearProgress, Alert, Collapse, Stack, IconButton,
  Switch, FormControlLabel, Tooltip, Grid,
} from "@mui/material";
import YouTubeIcon from "@mui/icons-material/YouTube";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CancelIcon from "@mui/icons-material/Cancel";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import RefreshIcon from "@mui/icons-material/Refresh";

const API_BASE = "http://localhost:8000";

function isValidYouTubeUrl(url) {
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url.trim());
}

function formatDuration(seconds) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getYouTubeThumbnail(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]{11})/) || [];
  return m[1] ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
}

const STATUS_COLOR = {
  pending: "warning",
  downloading: "warning",
  analyzing: "info",
  done: "success",
  error: "error",
  cancelled: "default",
};

const STATUS_ICON = {
  pending: "⏳",
  downloading: "⬇️",
  analyzing: "🧠",
  done: "✅",
  error: "❌",
  cancelled: "🚫",
};

const PIPELINE_STEPS = (mode, quantization, useWhisper) => [
  { icon: "⬇", label: mode === "youtube" ? "Λήψη ήχου (yt-dlp)" : "Φόρτωση αρχείου" },
  { icon: "🔄", label: "Μετατροπή σε WAV 16kHz (ffmpeg)" },
  { icon: "📍", label: "Εντοπισμός onsets (spectral flux)" },
  { icon: "🎵", label: "Ανίχνευση τόνων (YIN algorithm)" },
  { icon: "📏", label: `Κβαντισμός ρυθμού (${quantization})` },
  { icon: "🧠", label: "Ανάλυση μακάμ (seyir-aware)" },
  { icon: "📝", label: useWhisper ? "Μεταδεδομένα Whisper AI" : "Whisper (απενεργοποιημένο)" },
];

function AIStatusCard({ aiStatus, onRefresh }) {
  if (!aiStatus) return null;
  const tools = [
    { key: "ffmpeg", label: "ffmpeg", install: "brew install ffmpeg" },
    { key: "yt_dlp", label: "yt-dlp", install: "pip install yt-dlp" },
    { key: "whisper", label: "Whisper AI", install: "pip install openai-whisper" },
  ];
  const allOk = tools.every((t) => aiStatus[t.key]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        bgcolor: allOk ? "rgba(74,138,90,0.08)" : "rgba(212,136,42,0.08)",
        borderColor: allOk ? "rgba(74,138,90,0.3)" : "rgba(212,136,42,0.3)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="caption" sx={{ color: allOk ? "#6ab04c" : "warning.main", fontWeight: 600 }}>
          🔧 Εργαλεία AI
        </Typography>
        <IconButton size="small" onClick={onRefresh} sx={{ p: 0.25 }}>
          <RefreshIcon sx={{ fontSize: 14, color: "text.secondary" }} />
        </IconButton>
      </Box>
      <Stack spacing={0.5}>
        {tools.map((t) => (
          <Box key={t.key} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: aiStatus[t.key] ? "#6ab04c" : "#a04830", flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: aiStatus[t.key] ? "text.primary" : "text.secondary", minWidth: 70 }}>
              {t.label}
            </Typography>
            {!aiStatus[t.key] && (
              <Box component="code" sx={{ fontSize: "0.6rem", bgcolor: "background.default", px: 0.5, py: 0.125, borderRadius: 0.5, color: "warning.main" }}>
                {t.install}
              </Box>
            )}
          </Box>
        ))}
      </Stack>
      {!allOk && (
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
          Εγκαταστήστε τα missing εργαλεία και επανεκκινήστε το backend.
        </Typography>
      )}
    </Paper>
  );
}

function JobProgress({ job }) {
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
        <Typography sx={{ fontSize: "0.85rem" }}>{STATUS_ICON[job.status] || "🎵"}</Typography>
        <Typography variant="caption" sx={{ flex: 1, color: "text.secondary" }}>{job.stage}</Typography>
        <Chip
          label={`${job.progress}%`}
          size="small"
          color={STATUS_COLOR[job.status] || "default"}
          sx={{ fontSize: "0.6rem", height: 18 }}
        />
      </Box>
      <LinearProgress
        variant="determinate"
        value={job.progress}
        color={STATUS_COLOR[job.status] || "primary"}
        sx={{ borderRadius: 1, height: 4, bgcolor: "background.default" }}
      />
      {job.duration && (
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
          Διάρκεια: {formatDuration(job.duration)}
        </Typography>
      )}
    </Box>
  );
}

function TranscriptionResult({ job, onImport }) {
  const { notes = [], maqam, tempo, title, whisper_info } = job;
  return (
    <Box sx={{ mt: 1.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
        <Box>
          <Typography sx={{ color: "primary.light", fontSize: "0.85rem", fontWeight: 600 }}>
            {title || "Αποτέλεσμα Μεταγραφής"}
          </Typography>
          {maqam && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.25 }}>
              <Typography variant="caption" sx={{ color: "primary.main" }}>{maqam.name}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{Math.round((maqam.confidence || 0) * 100)}%</Typography>
            </Box>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Νότες</Typography>
            <Typography variant="caption" sx={{ color: "primary.light", fontWeight: 700 }}>{notes.length}</Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>BPM</Typography>
            <Typography variant="caption" sx={{ color: "primary.light", fontWeight: 700 }}>{tempo}</Typography>
          </Box>
          {whisper_info?.language && (
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Γλώσσα</Typography>
              <Typography variant="caption" sx={{ color: "primary.light", fontWeight: 700 }}>{whisper_info.language.toUpperCase()}</Typography>
            </Box>
          )}
        </Stack>
      </Box>

      {/* Mini TAB preview */}
      {notes.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.75 }}>
            Προεπισκόπηση (πρώτες 32 νότες)
          </Typography>
          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.5, height: 50, overflowX: "auto" }}>
            {notes.slice(0, 32).map((n, i) => (
              <Tooltip key={i} title={`String ${n.string + 1}, Fret ${n.fret}`}>
                <Box sx={{
                  width: 20, flexShrink: 0,
                  height: `${20 + (n.velocity || 80) / 5}px`,
                  bgcolor: n.microtonalOffset ? "warning.main" : "primary.main",
                  borderRadius: "2px 2px 0 0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "default",
                }}>
                  <Typography sx={{ fontSize: "0.55rem", color: "background.default", fontWeight: 700 }}>{n.fret}</Typography>
                </Box>
              </Tooltip>
            ))}
          </Box>
        </Box>
      )}

      {whisper_info?.text && (
        <Paper variant="outlined" sx={{ p: 1, bgcolor: "background.default", borderColor: "divider", mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>📝 Κείμενο (Whisper)</Typography>
          <Typography variant="caption" sx={{ color: "text.primary", fontStyle: "italic" }}>{whisper_info.text}</Typography>
        </Paper>
      )}

      <Button
        variant="contained"
        fullWidth
        onClick={() => onImport(job)}
        sx={{
          bgcolor: "primary.main", color: "background.default",
          fontWeight: 700, "&:hover": { bgcolor: "primary.light" },
        }}
      >
        ⬆ Εισαγωγή στον Editor
      </Button>
    </Box>
  );
}

export default function AITranscribePanel({ instrument, quantization, onNotesImported }) {
  const [mode, setMode] = useState("youtube");
  const [ytUrl, setYtUrl] = useState("");
  const [ytThumb, setYtThumb] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);
  const [useWhisper, setUseWhisper] = useState(true);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const pollTimers = useRef({});

  useEffect(() => {
    fetchAIStatus();
    return () => Object.values(pollTimers.current).forEach(clearInterval);
  }, []);

  useEffect(() => {
    setYtThumb(isValidYouTubeUrl(ytUrl) ? getYouTubeThumbnail(ytUrl) : null);
  }, [ytUrl]);

  async function fetchAIStatus() {
    try {
      const res = await fetch(`${API_BASE}/api/ai/status`);
      if (res.ok) setAiStatus(await res.json());
    } catch {
      setAiStatus({ available: false, reason: "Backend offline" });
    }
  }

  function startPolling(jobId) {
    if (pollTimers.current[jobId]) return;
    pollTimers.current[jobId] = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/ai/job/${jobId}`);
        if (!res.ok) { stopPolling(jobId); return; }
        const updated = await res.json();
        setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...updated } : j)));
        if (updated.status === "done" || updated.status === "error") stopPolling(jobId);
      } catch { stopPolling(jobId); }
    }, 1000);
  }

  function stopPolling(jobId) {
    clearInterval(pollTimers.current[jobId]);
    delete pollTimers.current[jobId];
  }

  async function handleYouTubeSubmit() {
    setError("");
    if (!isValidYouTubeUrl(ytUrl)) { setError("Παρακαλώ εισάγετε έγκυρο YouTube URL"); return; }
    try {
      const res = await fetch(`${API_BASE}/api/ai/youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ytUrl, instrument, quantization, use_whisper: useWhisper }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Σφάλμα"); }
      const { job_id } = await res.json();
      setJobs((prev) => [{ id: job_id, source: ytUrl, thumbnail: getYouTubeThumbnail(ytUrl), status: "pending", progress: 0, stage: "Αναμονή…", title: null, notes: [], maqam: null, tempo: 80 }, ...prev]);
      setYtUrl("");
      startPolling(job_id);
    } catch (e) { setError(e.message); }
  }

  async function handleFileUpload(file) {
    if (!file) return;
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("instrument", instrument);
    formData.append("quantization", quantization);
    formData.append("use_whisper", useWhisper ? "true" : "false");
    try {
      const res = await fetch(`${API_BASE}/api/ai/upload`, { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Σφάλμα ανεβάσματος"); }
      const { job_id, filename } = await res.json();
      setJobs((prev) => [{ id: job_id, source: filename, thumbnail: null, status: "pending", progress: 0, stage: "Αναμονή…", title: filename, notes: [], maqam: null, tempo: 80 }, ...prev]);
      startPolling(job_id);
    } catch (e) { setError(e.message); }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [instrument, quantization, useWhisper]);

  function handleImport(job) {
    if (!job.notes?.length) return;
    onNotesImported(job.notes, job.maqam, job.tempo);
  }

  async function handleCancel(jobId) {
    try {
      await fetch(`${API_BASE}/api/ai/job/${jobId}`, { method: "DELETE" });
      stopPolling(jobId);
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: "cancelled" } : j));
    } catch {}
  }

  const backendOnline = aiStatus !== null;
  const activeJobs = jobs.filter((j) => ["pending", "downloading", "analyzing"].includes(j.status));

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto", overflow: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Chip label="AI" size="small" sx={{ bgcolor: "primary.main", color: "background.default", fontWeight: 700, fontSize: "0.65rem", height: 20 }} />
            <Typography variant="h5" sx={{ color: "primary.light", fontFamily: "'Playfair Display', serif" }}>
              Αυτόματη Μεταγραφή
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Από YouTube video ή αρχείο MP3 → ταμπλατούρα ούτι/σάζι
          </Typography>
        </Box>
        <Chip
          size="small"
          label={backendOnline ? "● Backend Online" : "● Backend Offline"}
          sx={{
            bgcolor: backendOnline ? "rgba(74,138,90,0.2)" : "rgba(160,72,48,0.2)",
            color: backendOnline ? "#6ab04c" : "error.main",
            fontSize: "0.65rem",
          }}
        />
      </Box>

      {/* Offline banner */}
      {!backendOnline && (
        <Alert severity="warning" sx={{ mb: 2, "& .MuiAlert-message": { fontSize: "0.75rem" } }}>
          Το backend δεν είναι online. Εκκινήστε με:{" "}
          <Box component="code" sx={{ bgcolor: "rgba(0,0,0,0.2)", px: 0.5, borderRadius: 0.5, fontSize: "0.65rem" }}>
            uvicorn main:app --reload --port 8000
          </Box>
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={7}>
          <AIStatusCard aiStatus={aiStatus} onRefresh={fetchAIStatus} />
        </Grid>
        <Grid item xs={12} sm={5}>
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "background.paper", borderColor: "divider" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>Ρυθμίσεις</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={useWhisper}
                  onChange={(e) => setUseWhisper(e.target.checked)}
                  size="small"
                  sx={{ "& .MuiSwitch-thumb": { bgcolor: useWhisper ? "primary.main" : "text.secondary" } }}
                />
              }
              label={<Typography variant="caption" sx={{ color: "text.secondary" }}>Χρήση Whisper AI</Typography>}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Mode tabs */}
      <ButtonGroup size="small" sx={{ mb: 2 }}>
        <Button
          variant={mode === "youtube" ? "contained" : "outlined"}
          startIcon={<YouTubeIcon />}
          onClick={() => setMode("youtube")}
          sx={{ fontSize: "0.75rem", borderColor: "divider", ...(mode === "youtube" ? { bgcolor: "primary.main", color: "background.default" } : { color: "text.secondary" }) }}
        >
          YouTube
        </Button>
        <Button
          variant={mode === "upload" ? "contained" : "outlined"}
          startIcon={<UploadFileIcon />}
          onClick={() => setMode("upload")}
          sx={{ fontSize: "0.75rem", borderColor: "divider", ...(mode === "upload" ? { bgcolor: "primary.main", color: "background.default" } : { color: "text.secondary" }) }}
        >
          Αρχείο
        </Button>
      </ButtonGroup>

      {/* YouTube input */}
      {mode === "youtube" && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleYouTubeSubmit()}
              InputProps={{ startAdornment: <YouTubeIcon sx={{ color: "#ff4444", mr: 1, fontSize: 18 }} /> }}
              sx={{
                "& .MuiInputBase-root": { bgcolor: "background.default" },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
              }}
            />
            <Button
              variant="contained"
              onClick={handleYouTubeSubmit}
              disabled={!ytUrl.trim() || !backendOnline}
              sx={{ px: 2, bgcolor: "primary.main", color: "background.default", whiteSpace: "nowrap", flexShrink: 0 }}
            >
              Μεταγραφή
            </Button>
          </Box>

          {ytThumb && (
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 1.5 }}>
              <Box component="img" src={ytThumb} alt="thumb" sx={{ width: 120, height: 68, objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider" }} />
              <Typography variant="caption" sx={{ color: "text.secondary", wordBreak: "break-all" }}>{ytUrl}</Typography>
            </Box>
          )}

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", alignSelf: "center" }}>Παραδείγματα:</Typography>
            {[
              { label: "Ούτι — Μακάμ Rast", url: "https://www.youtube.com/watch?v=dGzSIPcNb1E" },
              { label: "Τουρκικό Σάζι", url: "https://www.youtube.com/watch?v=pFpBTnl8LKk" },
            ].map((ex) => (
              <Chip
                key={ex.url}
                label={ex.label}
                size="small"
                variant="outlined"
                onClick={() => setYtUrl(ex.url)}
                sx={{ fontSize: "0.65rem", borderColor: "divider", cursor: "pointer", "&:hover": { borderColor: "primary.main", color: "primary.main" } }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Upload drop zone */}
      {mode === "upload" && (
        <Box
          sx={{
            border: "2px dashed",
            borderColor: dragging ? "primary.main" : "divider",
            borderRadius: 2,
            p: 4,
            textAlign: "center",
            cursor: "pointer",
            bgcolor: dragging ? "rgba(201,169,110,0.08)" : "background.paper",
            transition: "all 0.2s",
            mb: 2,
          }}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef} type="file" hidden
            accept=".mp3,.wav,.ogg,.m4a,.flac,.aac,.opus,.webm,audio/*"
            onChange={(e) => handleFileUpload(e.target.files[0])}
          />
          <FileUploadIcon sx={{ fontSize: 40, color: dragging ? "primary.main" : "text.secondary", mb: 1 }} />
          <Typography sx={{ color: dragging ? "primary.main" : "text.secondary", fontSize: "0.85rem", mb: 0.5 }}>
            {dragging ? "Αφήστε το αρχείο εδώ" : "Σύρτε & αφήστε αρχείο ήχου"}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>ή κλικ για επιλογή</Typography>
          <Box sx={{ mt: 1, display: "flex", gap: 0.5, justifyContent: "center", flexWrap: "wrap" }}>
            {["MP3", "WAV", "OGG", "M4A", "FLAC", "AAC"].map((f) => (
              <Chip key={f} label={f} size="small" sx={{ fontSize: "0.6rem", height: 18, bgcolor: "background.default", borderColor: "divider" }} variant="outlined" />
            ))}
          </Box>
        </Box>
      )}

      {/* Error */}
      <Collapse in={!!error}>
        <Alert severity="error" sx={{ mb: 2, "& .MuiAlert-message": { fontSize: "0.75rem" } }} onClose={() => setError("")}>
          {error}
        </Alert>
      </Collapse>

      {/* Pipeline info */}
      <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.paper", borderColor: "divider", mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
          <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600 }}>
            Πώς λειτουργεί
          </Typography>
          <Chip
            label="💡 Χρησιμοποιήστε το κουμπί «Δείγμα Rast» στο sidebar για γρήγορη προεπισκόπηση"
            size="small"
            variant="outlined"
            sx={{ fontSize: "0.6rem", height: 18, borderColor: "primary.dark", color: "primary.main", maxWidth: 340, whiteSpace: "normal", height: "auto", py: 0.25 }}
          />
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {PIPELINE_STEPS(mode, quantization, useWhisper).map((step, i) => (
            <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{
                width: 18, height: 18, borderRadius: "50%",
                bgcolor: "background.default",
                border: "1px solid", borderColor: "divider",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Typography sx={{ fontSize: "0.55rem", color: "primary.main", fontWeight: 700 }}>{i + 1}</Typography>
              </Box>
              <Typography sx={{ fontSize: "0.65rem" }}>{step.icon}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{step.label}</Typography>
              {i < 6 && <Typography sx={{ color: "divider", mx: 0.25 }}>›</Typography>}
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Jobs list */}
      {jobs.length > 0 && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Typography variant="caption" sx={{ color: "primary.main", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>
              Εργασίες
            </Typography>
            {activeJobs.length > 0 && (
              <Chip label={`${activeJobs.length} σε εξέλιξη`} size="small" color="warning" sx={{ fontSize: "0.6rem", height: 18 }} />
            )}
          </Box>
          <Stack spacing={1.5}>
            {jobs.map((job) => (
              <Paper
                key={job.id}
                variant="outlined"
                sx={{
                  p: 2, bgcolor: "background.paper",
                  borderColor: job.status === "done" ? "rgba(74,138,90,0.4)" :
                    job.status === "error" ? "rgba(160,72,48,0.4)" : "divider",
                }}
              >
                <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
                  {job.thumbnail && (
                    <Box component="img" src={job.thumbnail} alt="" sx={{ width: 80, height: 45, objectFit: "cover", borderRadius: 0.5, flexShrink: 0 }} />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: "text.primary", display: "block", fontWeight: 600, mb: 0.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {job.title || job.source}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {job.source}
                    </Typography>
                  </Box>
                  {["pending", "downloading", "analyzing"].includes(job.status) && (
                    <IconButton size="small" onClick={() => handleCancel(job.id)} sx={{ flexShrink: 0, color: "text.secondary" }}>
                      <CancelIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                <JobProgress job={job} />

                {job.status === "error" && (
                  <Alert severity="error" sx={{ mt: 1, "& .MuiAlert-message": { fontSize: "0.7rem" } }}>
                    {job.error}
                  </Alert>
                )}

                {job.status === "done" && job.notes?.length > 0 && (
                  <TranscriptionResult job={job} onImport={handleImport} />
                )}

                {job.status === "done" && (!job.notes || job.notes.length === 0) && (
                  <Alert severity="info" sx={{ mt: 1, "& .MuiAlert-message": { fontSize: "0.7rem" } }}>
                    Δεν εντοπίστηκαν νότες. Δοκιμάστε με καθαρότερο ηχητικό πηγή.
                  </Alert>
                )}
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

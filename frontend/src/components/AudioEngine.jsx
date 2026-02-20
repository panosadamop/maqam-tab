import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  Box, Typography, Button, ButtonGroup, Paper, LinearProgress,
  Backdrop, CircularProgress, Alert, List, ListItem, ListItemText,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { detectMaqam, quantizeNotes, detectOnsets, detectPitch } from "../utils/maqamDetection";
import { findBestPosition, freqToMidi } from "../utils/instruments";

const AudioEngine = forwardRef(function AudioEngine(
  { instrument, tuning, tempo, quantization, onAudioAnalyzed, onRecordingChange, onAnalyzingChange, onAudioBuffer },
  ref
) {
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveData, setWaveData] = useState([]);
  const [fileMode, setFileMode] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyzerRef = useRef(null);
  const animFrameRef = useRef(null);

  useImperativeHandle(ref, () => ({ getStatus: () => status }));

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyzer = audioContextRef.current.createAnalyser();
      analyzer.fftSize = 2048;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => processRecording(stream);
      recorder.start(100);
      mediaRecorderRef.current = recorder;

      setStatus("recording");
      onRecordingChange(true);

      let t = 0;
      timerRef.current = setInterval(() => { t += 0.1; setRecordingTime(t); }, 100);
      drawWaveform();
    } catch (err) {
      alert("Δεν βρέθηκε μικρόφωνο: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    setStatus("processing");
    onRecordingChange(false);
  };

  const drawWaveform = () => {
    if (!analyzerRef.current) return;
    const data = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteTimeDomainData(data);
    const pts = Array.from(data).filter((_, i) => i % 4 === 0).map(v => (v - 128) / 128);
    setWaveData(pts);
    animFrameRef.current = requestAnimationFrame(drawWaveform);
  };

  const processRecording = async () => {
    setStatus("processing");
    onAnalyzingChange(true);
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    await analyzeAudio(blob);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus("processing");
    onAnalyzingChange(true);
    await analyzeAudio(file);
  };

  const analyzeAudio = async (blob) => {
    try {
      const ctx = new AudioContext({ sampleRate: 44100 });
      const arrayBuf = await blob.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      onAudioBuffer(audioBuf);
      setProgress(20);

      const channelData = audioBuf.getChannelData(0);
      const sampleRate = audioBuf.sampleRate;
      const frameSize = 2048;

      const onsets = detectOnsets(channelData, sampleRate);
      setProgress(40);

      const rawNotes = [];
      for (let i = 0; i < onsets.length; i++) {
        const startSample = Math.floor(onsets[i] * sampleRate);
        const endSample = i + 1 < onsets.length
          ? Math.floor(onsets[i + 1] * sampleRate)
          : Math.min(startSample + frameSize * 4, channelData.length);

        const frame = channelData.slice(startSample, startSample + frameSize);
        if (frame.length < frameSize) continue;

        const freq = detectPitch(frame, sampleRate);
        if (!freq || freq < 50 || freq > 2000) continue;

        const midiFloat = freqToMidi(freq);
        const duration = (endSample - startSample) / sampleRate;
        const position = findBestPosition(midiFloat, tuning, instrument);
        if (!position) continue;

        rawNotes.push({
          id: `note_${i}`, time: onsets[i],
          duration: Math.max(0.05, duration * 0.9),
          frequency: freq, midi: midiFloat,
          midiRounded: Math.round(midiFloat),
          microtonalOffset: (midiFloat - Math.round(midiFloat)) * 100,
          string: position.string, fret: position.fret, centsOff: position.centsOff,
          ornament: null,
          velocity: Math.min(127, Math.round(Math.sqrt(frame.reduce((s, v) => s + v * v, 0) / frame.length) * 2000)),
        });
      }

      setProgress(60);
      const quantized = quantizeNotes(rawNotes, tempo, quantization);
      setProgress(75);
      const maqamResult = detectMaqam(quantized);
      setProgress(90);
      const seyirPath = maqamResult?.seyirPath || [];

      setProgress(100);
      setStatus("done");
      onAnalyzingChange(false);
      onAudioAnalyzed(quantized, maqamResult, seyirPath);
    } catch (err) {
      console.error("Audio analysis error:", err);
      setStatus("error");
      onAnalyzingChange(false);
    }
  };

  const progressLabel = progress < 40 ? "🎵 Εντοπισμός onsets…"
    : progress < 60 ? "🎼 Ανίχνευση τόνων (YIN)…"
    : progress < 75 ? "📏 Κβαντισμός ρυθμού…"
    : progress < 90 ? "🧠 Ανάλυση μακάμ (seyir)…"
    : "✅ Ολοκλήρωση…";

  return (
    <Box sx={{ p: 4, maxWidth: 700, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" sx={{ color: "primary.light", fontFamily: "'Playfair Display', serif" }}>
          Ηχογράφηση & Μεταγραφή
        </Typography>
        <ButtonGroup size="small" variant="outlined">
          <Button
            onClick={() => setFileMode(false)}
            variant={!fileMode ? "contained" : "outlined"}
            startIcon={<MicIcon />}
            sx={{ fontSize: "0.7rem", borderColor: "divider" }}
          >
            Live
          </Button>
          <Button
            onClick={() => setFileMode(true)}
            variant={fileMode ? "contained" : "outlined"}
            startIcon={<UploadFileIcon />}
            sx={{ fontSize: "0.7rem", borderColor: "divider" }}
          >
            Αρχείο
          </Button>
        </ButtonGroup>
      </Box>

      {/* Waveform */}
      <Paper
        variant="outlined"
        sx={{
          bgcolor: "background.paper",
          borderColor: "divider",
          mb: 3,
          height: 80,
          overflow: "hidden",
        }}
      >
        <svg width="100%" height="80">
          {waveData.length > 0 ? waveData.map((v, i) => (
            <rect
              key={i}
              x={`${(i / waveData.length) * 100}%`}
              y={`${50 - v * 35}%`}
              width={`${100 / waveData.length + 0.5}%`}
              height={`${Math.abs(v) * 70}%`}
              fill={status === "recording" ? "#a04830" : "#c9a96e"}
              opacity="0.7"
            />
          )) : (
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(201,169,110,0.15)" strokeWidth="1" strokeDasharray="4 4" />
          )}
        </svg>
      </Paper>

      {/* Controls */}
      <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
        {!fileMode ? (
          status === "idle" || status === "done" || status === "error" ? (
            <Button
              variant="contained"
              color="secondary"
              size="large"
              startIcon={<MicIcon />}
              onClick={startRecording}
              sx={{ px: 4, py: 1.5, fontSize: "0.85rem", fontWeight: 700 }}
            >
              Εγγραφή
            </Button>
          ) : status === "recording" ? (
            <Button
              variant="contained"
              size="large"
              startIcon={<StopIcon />}
              onClick={stopRecording}
              sx={{
                px: 4, py: 1.5, fontSize: "0.85rem", fontWeight: 700,
                bgcolor: "#333", "&:hover": { bgcolor: "#444" },
              }}
            >
              Διακοπή ({recordingTime.toFixed(1)}s)
            </Button>
          ) : null
        ) : (
          <Button
            component="label"
            variant="outlined"
            size="large"
            startIcon={<UploadFileIcon />}
            sx={{ px: 4, py: 1.5, fontSize: "0.85rem", borderColor: "primary.main", color: "primary.main" }}
          >
            Επιλογή αρχείου ήχου
            <input type="file" accept="audio/*" onChange={handleFileUpload} hidden />
          </Button>
        )}
      </Box>

      {/* Tips */}
      <Paper variant="outlined" sx={{ bgcolor: "background.paper", borderColor: "divider", p: 2 }}>
        <Typography variant="caption" sx={{ color: "primary.main", display: "block", mb: 1, fontWeight: 600 }}>
          💡 Οδηγίες
        </Typography>
        {[
          "Παίξε με καθαρό και σαφή τόνο χωρίς πολύ reverb",
          "Βεβαιώσου ότι το όργανο είναι καλά κουρδισμένο πριν ηχογραφήσεις",
          "Παίξε κάθε νότα ξεχωριστά για καλύτερη ανίχνευση",
          "Ρύθμισε το tempo πριν αναλύσεις για ακριβέστερο κβαντισμό",
        ].map((tip, i) => (
          <Typography key={i} variant="caption" sx={{ color: "text.secondary", display: "block", py: 0.25 }}>
            · {tip}
          </Typography>
        ))}
      </Paper>

      {/* Processing overlay */}
      <Backdrop open={status === "processing"} sx={{ zIndex: 1300 }}>
        <Paper sx={{ p: 5, textAlign: "center", minWidth: 320, bgcolor: "background.paper" }}>
          <CircularProgress sx={{ color: "primary.main", mb: 2 }} />
          <Typography sx={{ color: "primary.light", mb: 2 }}>Ανάλυση ήχου…</Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              mb: 1.5, borderRadius: 2,
              bgcolor: "background.default",
              "& .MuiLinearProgress-bar": { bgcolor: "primary.main" },
            }}
          />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>{progressLabel}</Typography>
        </Paper>
      </Backdrop>
    </Box>
  );
});

export default AudioEngine;

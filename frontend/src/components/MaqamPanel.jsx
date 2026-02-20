import { useState } from "react";
import {
  Box, Typography, Paper, Grid, LinearProgress, Chip,
  Select, MenuItem, FormControl, InputLabel,
} from "@mui/material";
import { MAQAMAT, getMaqamList } from "../utils/maqamat";

const NOTE_NAMES_QT = [
  "C", "C↑", "C#", "D↓", "D", "D↑", "D#", "Eb↓",
  "E", "E↑", "F↓", "F", "F#↓", "F#", "G↓", "G",
  "G↑", "G#", "Ab↓", "Ab", "A↑", "Bb↓", "Bb", "B↓"
];

const DEGREE_LABELS = ["I", "♭II", "II", "♭III", "III", "IV", "♯IV", "V", "♭VI", "VI", "♭VII", "VII", "VIII"];

export default function MaqamPanel({ notes, detectedMaqam, seyirPath, onMaqamOverride }) {
  const [overrideKey, setOverrideKey] = useState("");
  const maqamList = getMaqamList();

  // Build pitch class histogram
  const histogram = Array(24).fill(0);
  if (notes.length > 0) {
    const totalDur = notes.reduce((s, n) => s + (n.duration || 0.1), 0);
    for (const note of notes) {
      const qtBin = Math.round(((note.midi % 12) * 2 + (note.microtonalOffset || 0) / 50)) % 24;
      histogram[qtBin] += (note.duration || 0.1) / totalDur;
    }
    const maxH = Math.max(...histogram, 0.001);
    for (let i = 0; i < 24; i++) histogram[i] /= maxH;
  }

  const handleOverride = (key) => {
    setOverrideKey(key);
    if (key && MAQAMAT[key]) {
      const maqam = MAQAMAT[key];
      onMaqamOverride({
        key, name: maqam.name, arabic: maqam.arabic,
        description: maqam.description, intervals: maqam.intervals,
        confidence: 1.0, seyirDirection: maqam.seyir.type, manualOverride: true,
      });
    }
  };

  const seyirColor = (v) => v > 0 ? "#6ab04c" : v < 0 ? "#d4882a" : "rgba(201,169,110,0.3)";

  return (
    <Box sx={{ p: 3, overflow: "auto" }}>
      <Typography variant="h5" sx={{ color: "primary.light", fontFamily: "'Playfair Display', serif", mb: 0.5 }}>
        Ανάλυση Μακάμ
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 3 }}>
        Seyir-aware detection με μικροτονικό histogram
      </Typography>

      <Grid container spacing={2}>
        {/* Detected maqam card */}
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2.5, bgcolor: "background.paper", borderColor: "divider", height: "100%" }}>
            <Typography variant="caption" sx={{ color: "primary.main", textTransform: "uppercase", letterSpacing: 1.5, display: "block", mb: 1.5, borderBottom: "1px solid", borderColor: "divider", pb: 0.75 }}>
              Ανιχνεύθηκε
            </Typography>

            {detectedMaqam ? (
              <>
                <Typography variant="h4" sx={{ color: "primary.light", fontFamily: "'Playfair Display', serif" }}>
                  {detectedMaqam.name}
                </Typography>
                <Typography sx={{ fontFamily: "'Amiri', serif", fontSize: "2rem", color: "primary.main", direction: "rtl", my: 0.5 }}>
                  {detectedMaqam.arabic}
                </Typography>

                {detectedMaqam.manualOverride && (
                  <Chip label="✍ Χειροκίνητο" size="small"
                    sx={{ bgcolor: "rgba(139,58,42,0.3)", color: "secondary.light", fontSize: "0.65rem", mb: 1 }} />
                )}

                <Box sx={{ display: "flex", alignItems: "center", gap: 1, my: 1.5 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 65 }}>Βεβαιότητα</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={detectedMaqam.confidence * 100}
                    sx={{
                      flex: 1, borderRadius: 2, height: 6,
                      bgcolor: "background.default",
                      "& .MuiLinearProgress-bar": { bgcolor: "primary.main" },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "primary.light", minWidth: 30 }}>
                    {Math.round(detectedMaqam.confidence * 100)}%
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={`Σέιρ: ${detectedMaqam.seyirDirection === "ascending" ? "↗ Ανοδικό" :
                    detectedMaqam.seyirDirection === "descending" ? "↘ Καθοδικό" : "↕ Μικτό"}`}
                  sx={{ bgcolor: "rgba(212,136,42,0.15)", color: "warning.main", mb: 1.5, fontSize: "0.7rem" }}
                />

                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.6 }}>
                  {detectedMaqam.description}
                </Typography>

                {detectedMaqam.intervals && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                      Σκάλα (cents από ρίζα)
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {detectedMaqam.intervals.map((cents, i) => (
                        <Box key={i} sx={{
                          bgcolor: "background.default",
                          border: "1px solid", borderColor: "divider",
                          borderRadius: 0.5, px: 0.75, py: 0.25,
                          display: "flex", flexDirection: "column", alignItems: "center",
                        }}>
                          <Typography sx={{ fontSize: "0.6rem", color: "primary.main" }}>
                            {DEGREE_LABELS[i] || i}
                          </Typography>
                          <Typography sx={{ fontSize: "0.65rem", color: "text.primary", fontFamily: "monospace" }}>
                            {cents}¢
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
                <Typography sx={{ fontSize: "2rem", mb: 1 }}>🎵</Typography>
                <Typography variant="caption">Ηχογράψτε ή εισάγετε νότες για ανίχνευση μακάμ</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Histogram */}
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 2.5, bgcolor: "background.paper", borderColor: "divider" }}>
            <Typography variant="caption" sx={{ color: "primary.main", textTransform: "uppercase", letterSpacing: 1.5, display: "block", mb: 1.5, borderBottom: "1px solid", borderColor: "divider", pb: 0.75 }}>
              Μικροτονικό Histogram
            </Typography>
            <Box sx={{ display: "flex", alignItems: "flex-end", height: 100, gap: "2px", mb: 1 }}>
              {histogram.map((val, i) => {
                const isInMaqam = detectedMaqam?.intervals
                  ? detectedMaqam.intervals.some(c => Math.abs(c - i * 50) < 60)
                  : false;
                return (
                  <Box key={i} sx={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end" }}>
                    <Box sx={{
                      width: "100%",
                      height: `${Math.max(2, val * 100)}%`,
                      bgcolor: isInMaqam ? "primary.main" : "background.default",
                      border: "1px solid",
                      borderColor: isInMaqam ? "primary.dark" : "divider",
                      borderRadius: "2px 2px 0 0",
                      transition: "height 0.3s",
                    }} />
                    {i % 2 === 0 && (
                      <Typography sx={{ fontSize: "0.5rem", color: "text.secondary", mt: 0.25, whiteSpace: "nowrap", writingMode: "vertical-rl", transform: "rotate(180deg)", height: 28 }}>
                        {NOTE_NAMES_QT[i]}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, bgcolor: "primary.main", borderRadius: 0.5 }} />
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Στο μακάμ</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, bgcolor: "background.default", border: "1px solid", borderColor: "divider", borderRadius: 0.5 }} />
                <Typography variant="caption" sx={{ color: "text.secondary" }}>Εκτός μακάμ</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Seyir path */}
        {seyirPath.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2.5, bgcolor: "background.paper", borderColor: "divider" }}>
              <Typography variant="caption" sx={{ color: "primary.main", textTransform: "uppercase", letterSpacing: 1.5, display: "block", mb: 1.5, borderBottom: "1px solid", borderColor: "divider", pb: 0.75 }}>
                Σέιρ (Melodic Path)
              </Typography>
              <svg width="100%" height="80">
                <line x1="0" y1="40" x2="100%" y2="40" stroke="rgba(201,169,110,0.15)" strokeWidth="1" strokeDasharray="4 4" />
                {seyirPath.map((v, i) => {
                  if (i === 0) return null;
                  const prev = seyirPath[i - 1];
                  const x1 = ((i - 1) / (seyirPath.length - 1)) * 100;
                  const x2 = (i / (seyirPath.length - 1)) * 100;
                  const y1 = 40 - (prev || 0) * 25;
                  const y2 = 40 - (v || 0) * 25;
                  return (
                    <line key={i}
                      x1={`${x1}%`} y1={y1} x2={`${x2}%`} y2={y2}
                      stroke={seyirColor(v)} strokeWidth="2" strokeLinecap="round" />
                  );
                })}
              </svg>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption" sx={{ color: "#6ab04c" }}>↗ Άνοδος</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>— Παραμονή</Typography>
                <Typography variant="caption" sx={{ color: "warning.main" }}>↘ Κάθοδος</Typography>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Manual override */}
        <Grid item xs={12} md={seyirPath.length > 0 ? 6 : 8}>
          <Paper variant="outlined" sx={{ p: 2.5, bgcolor: "background.paper", borderColor: "divider" }}>
            <Typography variant="caption" sx={{ color: "primary.main", textTransform: "uppercase", letterSpacing: 1.5, display: "block", mb: 1.5, borderBottom: "1px solid", borderColor: "divider", pb: 0.75 }}>
              Χειροκίνητη Επιλογή Μακάμ
            </Typography>
            <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
              <InputLabel sx={{ fontSize: "0.75rem" }}>Επιλέξτε μακάμ</InputLabel>
              <Select
                value={overrideKey}
                label="Επιλέξτε μακάμ"
                onChange={e => handleOverride(e.target.value)}
                sx={{ fontSize: "0.75rem" }}
              >
                <MenuItem value="" sx={{ fontSize: "0.75rem" }}>— Χωρίς επιλογή —</MenuItem>
                {maqamList.map(m => (
                  <MenuItem key={m.key} value={m.key} sx={{ fontSize: "0.75rem" }}>
                    {m.name} ({m.arabic})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {overrideKey && MAQAMAT[overrideKey] && (
              <Box sx={{ p: 1.5, bgcolor: "background.default", borderRadius: 1 }}>
                <Typography sx={{ fontFamily: "'Amiri', serif", fontSize: "1.5rem", color: "primary.main", direction: "rtl", textAlign: "right" }}>
                  {MAQAMAT[overrideKey].arabic}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                  {MAQAMAT[overrideKey].description}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

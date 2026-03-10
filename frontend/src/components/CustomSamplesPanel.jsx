/**
 * CustomSamplesPanel — full page version
 *
 * Left column:  folder connection + file upload + coverage keyboard
 * Right column: recording guide + pitch-shift chart + audio mode switcher
 */
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Box, Typography, Chip, LinearProgress, Tooltip,
  Button, Divider, Grid,
} from "@mui/material";
import FolderOpenIcon  from "@mui/icons-material/FolderOpen";
import RefreshIcon     from "@mui/icons-material/Refresh";
import UploadFileIcon  from "@mui/icons-material/UploadFile";
import FolderOffIcon   from "@mui/icons-material/FolderOff";
import PlayArrowIcon   from "@mui/icons-material/PlayArrow";
import {
  pickSampleFolder, reconnectSavedFolder, getSavedFolderName,
  clearSavedFolder, watchFolder, isFSASupported,
  readAudioFilesFromHandle,
} from "../utils/sampleStorage";
import {
  loadCustomSamples, clearCustomSamples, getCustomSamplesInfo, playNote,
} from "../utils/audioEngine";

// ── Oud chromatic range C2–C5 ────────────────────────────────────────────────
const NOTE_NAMES = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
const OUD_RANGE  = (() => {
  const out = [];
  for (let oct = 2; oct <= 5; oct++) {
    for (let n = 0; n < 12; n++) {
      const midi = (oct + 1) * 12 + n;
      if (midi >= 36 && midi <= 72)
        out.push({ midi, label:`${NOTE_NAMES[n]}${oct}`, black: NOTE_NAMES[n].length > 1 });
    }
  }
  return out;
})();

function labelToMidi(label) {
  const m = label.match(/^([A-G](?:#|b)?)(\d)$/);
  if (!m) return null;
  const chroma = NOTE_NAMES.indexOf(m[1]);
  return chroma < 0 ? null : (parseInt(m[2], 10) + 1) * 12 + chroma;
}

// Recommended recording pitches (every 3 semitones across oud range)
const REC_NOTES = [
  { midi:36, label:"C2"  }, { midi:39, label:"Eb2" }, { midi:42, label:"F#2" },
  { midi:45, label:"A2"  }, { midi:48, label:"C3"  }, { midi:51, label:"Eb3" },
  { midi:54, label:"F#3" }, { midi:57, label:"A3"  }, { midi:60, label:"C4"  },
  { midi:63, label:"Eb4" }, { midi:66, label:"F#4" }, { midi:69, label:"A4"  },
  { midi:72, label:"C5"  },
];

const FORMAT_ROWS = [
  ["A2.mp3",  "A2  (MIDI 45)"],
  ["Bb3.wav", "Bb3 (MIDI 58)"],
  ["C#4.ogg", "C#4 (MIDI 61)"],
  ["Ab2.mp3", "Ab2 (MIDI 44)"],
  ["57.mp3",  "A3  — MIDI αριθμός"],
];

const AUDIO_MODES = [
  { val:"custom",    icon:"🎙", label:"Custom Samples",   desc:"Δικές σου ηχογραφήσεις ούτι" },
  { val:"karplus",   icon:"🎸", label:"Karplus-Strong",   desc:"Προσομοίωση πλήκτρου χορδής" },
  { val:"soundfont", icon:"🎵", label:"CDN Samples",      desc:"Banjo bank (internet)" },
  { val:"synth",     icon:"🎛", label:"Synth",            desc:"Απλός ταλαντωτής" },
];

// ── Shared styles ─────────────────────────────────────────────────────────────
const CARD_SX = {
  bgcolor:"background.paper", border:"1px solid", borderColor:"divider",
  borderRadius:1.5, p:2.5,
};
const SECTION_LABEL_SX = {
  fontSize:"0.57rem", fontWeight:700, letterSpacing:"0.13em",
  textTransform:"uppercase", color:"rgba(201,169,110,0.45)",
  display:"block", mb:1.25,
};

export default function CustomSamplesPanel({ audioMode, onModeChange, onCountChange }) {
  const [samplesInfo,  setSamplesInfo]  = useState(() => getCustomSamplesInfo());
  const [folderName,   setFolderName]   = useState(null);
  const [savedName,    setSavedName]    = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [loadResult,   setLoadResult]   = useState(null);
  const [dragging,     setDragging]     = useState(false);
  const [previewMidi,  setPreviewMidi]  = useState(null);
  const inputRef     = useRef(null);
  const stopWatchRef = useRef(null);
  const dirHandleRef = useRef(null);
  const [fsaOk]      = useState(isFSASupported);

  useEffect(() => {
    getSavedFolderName().then(name => setSavedName(name));
  }, []);

  // ── Load files into audio engine ──────────────────────────────────────────
  const loadFiles = useCallback(async (files) => {
    if (!files?.length) return;
    setLoading(true); setLoadResult(null);
    try {
      const res  = await loadCustomSamples(files);
      const info = getCustomSamplesInfo();
      setLoadResult({ loaded: res.loaded, failed: res.failed });
      setSamplesInfo(info);
      onCountChange?.(info.count);
      if (info.ready) onModeChange?.("custom");
    } catch (e) {
      setLoadResult({ loaded:0, failed:[String(e)] });
    } finally {
      setLoading(false);
    }
  }, [onModeChange]);

  const startWatch = useCallback((handle) => {
    stopWatchRef.current?.();
    dirHandleRef.current = handle;
    stopWatchRef.current = watchFolder(handle, loadFiles, 3000);
  }, [loadFiles]);

  const handleOpenFolder = useCallback(async () => {
    setLoading(true);
    try {
      const r = await pickSampleFolder();
      if (!r) { setLoading(false); return; }
      setFolderName(r.name); setSavedName(r.name);
      await loadFiles(r.files);
      startWatch(r.handle);
    } catch (e) {
      setLoadResult({ loaded:0, failed:[`Σφάλμα: ${e.message}`] });
      setLoading(false);
    }
  }, [loadFiles, startWatch]);

  const handleReconnect = useCallback(async () => {
    setLoading(true);
    try {
      const r = await reconnectSavedFolder();
      if (!r) {
        setLoadResult({ loaded:0, failed:["Δεν δόθηκε άδεια. Δοκίμασε «Άνοιξε Φάκελο»."] });
        setLoading(false); return;
      }
      setFolderName(r.name);
      await loadFiles(r.files);
      startWatch(r.handle);
    } catch (e) {
      setLoadResult({ loaded:0, failed:[`Σφάλμα: ${e.message}`] }); setLoading(false);
    }
  }, [loadFiles, startWatch]);

  const handleDisconnect = useCallback(async () => {
    stopWatchRef.current?.(); stopWatchRef.current = null; dirHandleRef.current = null;
    clearCustomSamples(); await clearSavedFolder();
    setFolderName(null); setSavedName(null);
    setSamplesInfo(getCustomSamplesInfo()); setLoadResult(null);
    onCountChange?.(0);
    onModeChange?.("karplus");
  }, [onModeChange]);

  const handleReload = useCallback(async () => {
    if (!dirHandleRef.current) return;
    setLoading(true);
    const files = await readAudioFilesFromHandle(dirHandleRef.current);
    await loadFiles(files);
  }, [loadFiles]);

  const handlePreview = useCallback((midi) => {
    setPreviewMidi(midi);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    playNote(ctx, midi, ctx.currentTime, 0.7, "oud", audioMode === "custom" ? "custom" : "karplus");
    setTimeout(() => setPreviewMidi(null), 700);
  }, [audioMode]);

  useEffect(() => () => stopWatchRef.current?.(), []);

  const loadedMidis = new Set(samplesInfo.notes.map(labelToMidi).filter(Boolean));
  const coverage    = Math.round((loadedMidis.size / OUD_RANGE.length) * 100);
  const isConnected = !!folderName;
  const hasSamples  = samplesInfo.ready;

  return (
    <Box sx={{ p:3, maxWidth:1100, mx:"auto" }}>

      {/* ── Page title ── */}
      <Box sx={{ mb:3 }}>
        <Typography sx={{ fontSize:"1.5rem", fontWeight:300, color:"primary.light", lineHeight:1.2 }}>
          Samples Ούτι
        </Typography>
        <Typography sx={{ fontSize:"0.75rem", color:"text.secondary", mt:0.5 }}>
          Φόρτωσε δικές σου ηχογραφήσεις για τον πιο ρεαλιστικό ήχο
        </Typography>
      </Box>

      <Grid container spacing={2.5}>

        {/* ══════════════════════════════════════════
            LEFT COLUMN — Upload + Coverage
            ══════════════════════════════════════════ */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display:"flex", flexDirection:"column", gap:2 }}>

            {/* ── Folder connection ── */}
            <Box sx={CARD_SX}>
              <Typography sx={SECTION_LABEL_SX}>Σύνδεση Φακέλου</Typography>

              {/* Connected banner */}
              {isConnected && (
                <Box sx={{
                  display:"flex", alignItems:"center", gap:1,
                  bgcolor:"rgba(106,176,76,0.08)", border:"1px solid rgba(106,176,76,0.3)",
                  borderRadius:1, px:1.25, py:1, mb:1.5,
                }}>
                  <Box sx={{ width:7, height:7, borderRadius:"50%", bgcolor:"#6ab04c",
                    boxShadow:"0 0 7px #6ab04c", flexShrink:0 }}/>
                  <Box sx={{ flex:1, overflow:"hidden" }}>
                    <Typography sx={{ fontSize:"0.72rem", color:"#6ab04c", fontWeight:600,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {folderName}
                    </Typography>
                    <Typography sx={{ fontSize:"0.6rem", color:"text.secondary" }}>
                      Συνδεδεμένος · παρακολουθείται αυτόματα
                    </Typography>
                  </Box>
                  <Tooltip title="Επαναφόρτωση">
                    <Box onClick={handleReload} sx={{ p:0.5, cursor:"pointer", color:"text.secondary",
                      borderRadius:0.5, "&:hover":{ color:"primary.main" }, display:"flex" }}>
                      <RefreshIcon sx={{ fontSize:16 }}/>
                    </Box>
                  </Tooltip>
                  <Tooltip title="Αποσύνδεση">
                    <Box onClick={handleDisconnect} sx={{ p:0.5, cursor:"pointer", color:"text.secondary",
                      borderRadius:0.5, "&:hover":{ color:"error.main" }, display:"flex" }}>
                      <FolderOffIcon sx={{ fontSize:16 }}/>
                    </Box>
                  </Tooltip>
                </Box>
              )}

              {/* Reconnect prompt */}
              {!isConnected && savedName && fsaOk && (
                <Box sx={{
                  display:"flex", alignItems:"center", gap:1.25,
                  bgcolor:"rgba(201,169,110,0.06)", border:"1px dashed rgba(201,169,110,0.3)",
                  borderRadius:1, px:1.25, py:1, mb:1.5,
                }}>
                  <Box sx={{ flex:1 }}>
                    <Typography sx={{ fontSize:"0.7rem", color:"primary.main", fontWeight:600 }}>
                      {savedName}
                    </Typography>
                    <Typography sx={{ fontSize:"0.6rem", color:"text.secondary" }}>
                      Αποθηκευμένος — κάνε reconnect
                    </Typography>
                  </Box>
                  <Button size="small" variant="outlined" onClick={handleReconnect}
                    startIcon={<RefreshIcon sx={{ fontSize:"12px !important" }}/>}
                    sx={{ fontSize:"0.65rem", py:0.4, px:1,
                      borderColor:"rgba(201,169,110,0.4)", color:"primary.main",
                      "&:hover":{ borderColor:"primary.main" } }}>
                    Σύνδεση
                  </Button>
                </Box>
              )}

              {/* Action buttons */}
              <Box sx={{ display:"flex", gap:1 }}>
                {fsaOk && (
                  <Button fullWidth variant="outlined" onClick={handleOpenFolder}
                    disabled={loading}
                    startIcon={<FolderOpenIcon/>}
                    sx={{ fontSize:"0.7rem", py:0.75,
                      borderColor:"rgba(201,169,110,0.45)", color:"primary.main",
                      "&:hover":{ borderColor:"primary.main", bgcolor:"rgba(201,169,110,0.06)" } }}>
                    {isConnected ? "Αλλαγή φακέλου" : "Άνοιξε Φάκελο"}
                  </Button>
                )}
                <Button fullWidth={!fsaOk} variant="outlined"
                  onClick={() => inputRef.current?.click()} disabled={loading}
                  startIcon={<UploadFileIcon/>}
                  sx={{ fontSize:"0.7rem", py:0.75,
                    borderColor:"rgba(201,169,110,0.28)", color:"text.secondary",
                    "&:hover":{ borderColor:"rgba(201,169,110,0.5)", color:"primary.main" } }}>
                  {fsaOk ? "Αρχεία" : "Φόρτωσε αρχεία"}
                </Button>
              </Box>
              <input ref={inputRef} type="file" multiple
                accept=".mp3,.wav,.ogg,.flac,.aac,.m4a,audio/*"
                style={{ display:"none" }}
                onChange={e => loadFiles(e.target.files)}/>

              {/* Drag zone */}
              {!isConnected && (
                <Box onDrop={e => { e.preventDefault(); setDragging(false); loadFiles(e.dataTransfer.files); }}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  sx={{
                    mt:1.25, border:"1.5px dashed",
                    borderColor: dragging ? "primary.main" : "rgba(201,169,110,0.2)",
                    borderRadius:1, py:2, textAlign:"center", transition:"all 0.15s",
                    bgcolor: dragging ? "rgba(201,169,110,0.06)" : "transparent",
                  }}>
                  <Typography sx={{ fontSize:"0.68rem", color:"text.disabled" }}>
                    ή σύρε αρχεία εδώ — MP3 · WAV · OGG · FLAC
                  </Typography>
                </Box>
              )}

              {/* Loading */}
              {loading && (
                <LinearProgress sx={{ mt:1.25, borderRadius:1, height:3,
                  bgcolor:"rgba(201,169,110,0.1)",
                  "& .MuiLinearProgress-bar":{ bgcolor:"primary.main" } }}/>
              )}

              {/* Result */}
              {loadResult && !loading && (
                <Box sx={{ mt:1 }}>
                  {loadResult.loaded > 0 && (
                    <Typography sx={{ fontSize:"0.68rem", color:"#6ab04c" }}>
                      ✓ {loadResult.loaded} νότ{loadResult.loaded===1?"α":"ες"} φορτώθηκαν
                    </Typography>
                  )}
                  {loadResult.failed?.slice(0,4).map((f,i) => (
                    <Typography key={i} sx={{ fontSize:"0.62rem", color:"error.main", lineHeight:1.5 }}>
                      ✗ {f}
                    </Typography>
                  ))}
                  {(loadResult.failed?.length??0) > 4 && (
                    <Typography sx={{ fontSize:"0.6rem", color:"text.disabled" }}>
                      +{loadResult.failed.length-4} ακόμη
                    </Typography>
                  )}
                </Box>
              )}

              {!fsaOk && (
                <Typography sx={{ mt:1.25, fontSize:"0.62rem", color:"text.disabled", lineHeight:1.6 }}>
                  ⚠ Ο φάκελος δεν αποθηκεύεται σε αυτό το browser.
                  Χρησιμοποίησε Chrome ή Edge για αποθήκευση μεταξύ sessions.
                </Typography>
              )}
            </Box>

            {/* ── Coverage keyboard ── */}
            <Box sx={CARD_SX}>
              <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:1.5 }}>
                <Typography sx={{ ...SECTION_LABEL_SX, mb:0 }}>Κάλυψη Νοτών C2–C5</Typography>
                {hasSamples && (
                  <Chip label={`${samplesInfo.count} νότες · ${coverage}%`}
                    size="small" sx={{
                      height:18, fontSize:"0.6rem",
                      bgcolor:"rgba(201,169,110,0.12)", color:"primary.main",
                      border:"1px solid rgba(201,169,110,0.3)",
                    }}/>
                )}
              </Box>

              {/* Piano-style coverage display */}
              <Box sx={{ display:"flex", flexWrap:"wrap", gap:"2.5px",
                p:1, bgcolor:"rgba(0,0,0,0.3)", borderRadius:1, mb:1.25 }}>
                {OUD_RANGE.map(({ midi, label, black }) => {
                  const has = loadedMidis.has(midi);
                  const isPrev = previewMidi === midi;
                  return (
                    <Tooltip key={midi} title={label} placement="top" arrow>
                      <Box onClick={() => hasSamples && handlePreview(midi)}
                        sx={{
                          width: black ? 10 : 13,
                          height: black ? 16 : 22,
                          borderRadius:"2px",
                          bgcolor: isPrev ? "#fff" : has ? "#c9a96e"
                            : black ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)",
                          border:"1px solid",
                          borderColor: isPrev ? "#fff" : has ? "#8a6415"
                            : "rgba(255,255,255,0.08)",
                          transition:"all 0.1s",
                          cursor: hasSamples ? "pointer" : "default",
                          flexShrink:0,
                          "&:hover": hasSamples ? {
                            bgcolor: has ? "#e8c87a" : "rgba(255,255,255,0.12)",
                            transform:"scaleY(1.05)",
                          } : {},
                        }}/>
                    </Tooltip>
                  );
                })}
              </Box>

              <Box sx={{ display:"flex", gap:2, flexWrap:"wrap" }}>
                {[
                  ["#c9a96e","Φορτώθηκε (κλικ → άκουσε)"],
                  ["rgba(255,255,255,0.06)","Pitch-shift από κοντινή"],
                ].map(([bg,label]) => (
                  <Box key={label} sx={{ display:"flex", alignItems:"center", gap:0.6 }}>
                    <Box sx={{ width:10, height:10, bgcolor:bg, borderRadius:"2px",
                      border:"1px solid rgba(201,169,110,0.15)" }}/>
                    <Typography sx={{ fontSize:"0.6rem", color:"text.secondary" }}>{label}</Typography>
                  </Box>
                ))}
              </Box>

              {!hasSamples && (
                <Typography sx={{ mt:1.5, fontSize:"0.65rem", color:"text.disabled",
                  textAlign:"center", fontStyle:"italic" }}>
                  Φόρτωσε samples για να δεις την κάλυψη
                </Typography>
              )}
            </Box>

          </Box>
        </Grid>

        {/* ══════════════════════════════════════════
            RIGHT COLUMN — Guide + Audio mode
            ══════════════════════════════════════════ */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display:"flex", flexDirection:"column", gap:2 }}>

            {/* ── Audio mode selector ── */}
            <Box sx={CARD_SX}>
              <Typography sx={SECTION_LABEL_SX}>Λειτουργία Ήχου</Typography>
              <Box sx={{ display:"flex", flexDirection:"column", gap:0.75 }}>
                {AUDIO_MODES.map(({ val, icon, label, desc }) => {
                  const active = audioMode === val;
                  const isCustom = val === "custom";
                  const disabled = isCustom && !hasSamples;
                  return (
                    <Box key={val}
                      onClick={() => !disabled && onModeChange?.(val)}
                      sx={{
                        display:"flex", alignItems:"center", gap:1.25,
                        px:1.5, py:1, borderRadius:1, border:"1px solid",
                        borderColor: active ? "primary.main" : "divider",
                        bgcolor: active ? "rgba(201,169,110,0.1)" : "transparent",
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.4 : 1,
                        transition:"all 0.12s",
                        "&:hover": disabled ? {} : { borderColor:"rgba(201,169,110,0.5)" },
                      }}>
                      <Typography sx={{ fontSize:"1rem", lineHeight:1 }}>{icon}</Typography>
                      <Box sx={{ flex:1 }}>
                        <Typography sx={{
                          fontSize:"0.72rem", fontWeight: active ? 600 : 400,
                          color: active ? "primary.light" : "text.primary", lineHeight:1.2,
                        }}>
                          {label}
                          {isCustom && hasSamples && (
                            <Chip label={`${samplesInfo.count} νότες`} size="small" sx={{
                              ml:0.75, height:15, fontSize:"0.55rem",
                              bgcolor:"rgba(201,169,110,0.15)", color:"primary.main",
                            }}/>
                          )}
                        </Typography>
                        <Typography sx={{ fontSize:"0.6rem", color:"text.secondary", lineHeight:1.3 }}>
                          {desc}
                          {isCustom && !hasSamples && " — φόρτωσε πρώτα αρχεία"}
                        </Typography>
                      </Box>
                      {active && (
                        <Box sx={{ width:6, height:6, borderRadius:"50%", bgcolor:"primary.main" }}/>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* ── Recording guide ── */}
            <Box sx={CARD_SX}>
              <Typography sx={SECTION_LABEL_SX}>Οδηγός Ηχογράφησης</Typography>

              <Typography sx={{ fontSize:"0.68rem", color:"text.secondary", mb:1.5, lineHeight:1.7 }}>
                Ηχογράφησε κάθε νότα ξεχωριστά, <strong style={{color:"#c9a96e"}}>χωρίς
                reverb ή effects</strong>. Ξεκίνα το πλήκτρο αμέσως μετά την αρχή του αρχείου.
                Η διάρκεια δεν έχει σημασία — η εφαρμογή κόβει αυτόματα.
              </Typography>

              {/* Recommended notes grid */}
              <Typography sx={{ fontSize:"0.6rem", color:"rgba(201,169,110,0.5)",
                fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", mb:0.75 }}>
                Συνιστώμενες νότες (κάθε 3 ημιτόνια = 13 αρχεία)
              </Typography>
              <Box sx={{ display:"flex", flexWrap:"wrap", gap:0.5, mb:1.5 }}>
                {REC_NOTES.map(({ midi, label }) => (
                  <Chip key={midi} label={label} size="small"
                    onClick={() => handlePreview(midi)}
                    icon={<PlayArrowIcon sx={{ fontSize:"10px !important" }}/>}
                    sx={{
                      height:22, fontSize:"0.63rem", cursor:"pointer",
                      fontFamily:"Ubuntu Mono, monospace",
                      bgcolor: loadedMidis.has(midi)
                        ? "rgba(201,169,110,0.18)" : "rgba(255,255,255,0.04)",
                      color: loadedMidis.has(midi) ? "primary.main" : "text.secondary",
                      border:"1px solid",
                      borderColor: loadedMidis.has(midi)
                        ? "rgba(201,169,110,0.4)" : "rgba(255,255,255,0.08)",
                      "& .MuiChip-icon":{ color:"inherit" },
                      "&:hover":{ borderColor:"primary.main", color:"primary.main" },
                    }}/>
                ))}
              </Box>

              <Divider sx={{ borderColor:"divider", my:1.5 }}/>

              {/* Format guide */}
              <Typography sx={{ fontSize:"0.6rem", color:"rgba(201,169,110,0.5)",
                fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", mb:0.75 }}>
                Ονοματολογία αρχείων
              </Typography>
              <Box sx={{ bgcolor:"rgba(0,0,0,0.25)", borderRadius:1, p:1.25, mb:1 }}>
                {FORMAT_ROWS.map(([ex, note]) => (
                  <Box key={ex} sx={{ display:"flex", gap:1.5, mb:0.4 }}>
                    <Typography sx={{
                      fontFamily:"Ubuntu Mono, monospace", fontSize:"0.67rem",
                      color:"primary.main", minWidth:80,
                    }}>{ex}</Typography>
                    <Typography sx={{ fontSize:"0.63rem", color:"text.secondary" }}>
                      → {note}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Typography sx={{ fontSize:"0.62rem", color:"text.disabled", lineHeight:1.7 }}>
                Αποδεκτές μορφές: <strong style={{color:"rgba(201,169,110,0.6)"}}>MP3 · WAV · OGG · FLAC · AAC · M4A</strong><br/>
                Pitch-shift έως <strong style={{color:"rgba(201,169,110,0.6)"}}>±8 ημιτόνια</strong> από κοντινότερη νότα.<br/>
                Με 13 νότες καλύπτεις ολόκληρη την έκταση του ούτι με max ±1.5 ημιτόνιο error.
              </Typography>
            </Box>

          </Box>
        </Grid>

      </Grid>
    </Box>
  );
}

import { useState, useMemo } from "react";
import {
  Box, Typography, Paper, Grid, LinearProgress, Chip,
  Select, MenuItem, ListSubheader,
} from "@mui/material";
import { MAQAMAT, getMaqamsByTier } from "../utils/maqamat";
import MaqamTablature from "./MaqamTablature";

const NOTE_NAMES_QT = [
  "C","C↑","C#","D↓","D","D↑","D#","Eb↓",
  "E","E↑","F↓","F","F#↓","F#","G↓","G",
  "G↑","G#","Ab↓","Ab","A↑","Bb↓","Bb","B↓",
];

const TIER_LABELS = {
  1:"Tier 1 — Universal", 2:"Tier 2 — Very Common",
  3:"Tier 3 — Common", 4:"Tier 4 — Regional", 5:"Tier 5 — Rare",
};

const TEMPLATES = [
  { key:"rast", label:"Rast", color:"#6ab04c" },
  { key:"usaq", label:"Uşak", color:"#5a8fa0" },
];

const SEYIR_LABEL = { ascending:"↗ Ανοδικό", descending:"↘ Καθοδικό", mixed:"↕ Μικτό" };
const SEYIR_COLOR = { ascending:"#6ab04c", descending:"#d4882a", mixed:"#c9a96e" };
const DEGREE_LABELS = ["I","♭II","II","♭III","III","IV","♯IV","V","♭VI","VI","♭VII","VII","VIII"];

function seyirLineColor(v) { return v>0?"#6ab04c":v<0?"#d4882a":"rgba(201,169,110,0.2)"; }

const LABEL_SX = {
  fontSize:"0.58rem", fontWeight:600, letterSpacing:"0.12em",
  textTransform:"uppercase", color:"rgba(201,169,110,0.5)",
  display:"block",
};
const CARD = {
  p:2, bgcolor:"background.paper", border:"1px solid",
  borderColor:"divider", borderRadius:1,
};

export default function MaqamPanel({ notes, detectedMaqam, seyirPath, onMaqamOverride, tuning, instrument, audioMode="auto" }) {
  const [overrideKey, setOverrideKey] = useState("");
  const maqamsByTier = useMemo(()=>getMaqamsByTier(),[]);

  const histogram = useMemo(()=>{
    const h=Array(24).fill(0);
    if(notes.length>0){
      const total=notes.reduce((s,n)=>s+(n.duration||0.1),0);
      for(const note of notes){
        const bin=Math.round(((note.midi%12)*2+(note.microtonalOffset||0)/50))%24;
        h[bin]+=(note.duration||0.1)/total;
      }
      const mx=Math.max(...h,0.001);
      return h.map(v=>v/mx);
    }
    return h;
  },[notes]);

  const handleOverride=(key)=>{
    setOverrideKey(key);
    if(key&&MAQAMAT[key]){
      const m=MAQAMAT[key];
      onMaqamOverride({ key, name:m.name, description:m.description,
        intervals:m.intervals, confidence:1.0,
        seyirDirection:m.seyir.type, manualOverride:true });
    } else { onMaqamOverride && onMaqamOverride(null); }
  };

  const activeKey = overrideKey||detectedMaqam?.key||"";
  const activeMaqam = activeKey&&MAQAMAT[activeKey]?MAQAMAT[activeKey]:null;

  return (
    <Box sx={{ p:2.5, pb:5, overflowY:"auto", height:"100%" }}>

      {/* Title */}
      <Box sx={{mb:2}}>
        <Typography variant="h5" sx={{ color:"primary.light", fontWeight:300, letterSpacing:"0.04em", mb:0.2 }}>
          Ανάλυση Μακάμ
        </Typography>
        <Typography variant="caption" sx={{ color:"text.secondary", fontSize:"0.68rem" }}>
          Επίλεξε μακάμ ή ηχογράψε για αυτόματη ανίχνευση
        </Typography>
      </Box>

      {/* ── SELECTOR BAR ── */}
      <Paper sx={{ ...CARD, mb:2, borderColor:"rgba(201,169,110,0.22)", p:1.5 }}>
        <Box sx={{ display:"flex", alignItems:"center", gap:2, flexWrap:"wrap" }}>

          {/* Templates */}
          <Box sx={{ display:"flex", alignItems:"center", gap:0.75, flexShrink:0 }}>
            <Typography sx={{ ...LABEL_SX, mr:0.25, fontSize:"0.56rem" }}>Πρότυπα</Typography>
            {TEMPLATES.map(t=>(
              <Box key={t.key} onClick={()=>handleOverride(activeKey===t.key?"":t.key)} sx={{
                px:1.25, py:0.35, borderRadius:0.75, border:"1px solid", cursor:"pointer",
                userSelect:"none", transition:"all 0.13s",
                borderColor: activeKey===t.key ? t.color : "rgba(201,169,110,0.2)",
                bgcolor:      activeKey===t.key ? `${t.color}1e` : "transparent",
                color:        activeKey===t.key ? t.color : "text.secondary",
                fontSize:"0.72rem", fontWeight: activeKey===t.key?600:400,
                "&:hover":{ borderColor:t.color, color:t.color, bgcolor:`${t.color}12` },
              }}>{t.label}</Box>
            ))}
          </Box>

          {/* Separator */}
          <Box sx={{ width:"1px", height:26, bgcolor:"divider", display:{xs:"none",sm:"block"}, flexShrink:0 }}/>

          {/* Full select */}
          <Select value={activeKey} displayEmpty size="small" onChange={e=>handleOverride(e.target.value)}
            sx={{
              flex:1, minWidth:180, fontSize:"0.78rem", fontWeight:500,
              bgcolor:"background.default",
              "& .MuiOutlinedInput-notchedOutline":{ borderColor:"rgba(201,169,110,0.2)" },
              "&:hover .MuiOutlinedInput-notchedOutline":{ borderColor:"primary.main" },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline":{ borderColor:"primary.main" },
            }}
            MenuProps={{ PaperProps:{ sx:{ maxHeight:400, bgcolor:"#15110a" } } }}
          >
            <MenuItem value="" sx={{ fontSize:"0.74rem", color:"text.secondary", fontStyle:"italic" }}>
              — Επίλεξε μακάμ —
            </MenuItem>
            {Object.entries(maqamsByTier).map(([tier,maqams])=>[
              <ListSubheader key={`t${tier}`} sx={{
                fontSize:"0.57rem", letterSpacing:"0.12em", textTransform:"uppercase",
                color:"rgba(201,169,110,0.45)", bgcolor:"#15110a",
                lineHeight:"26px", fontWeight:600,
              }}>{TIER_LABELS[tier]}</ListSubheader>,
              ...maqams.map(m=>(
                <MenuItem key={m.key} value={m.key} sx={{
                  fontSize:"0.74rem", pl:2, display:"flex", gap:1,
                  color: activeKey===m.key?"primary.light":"text.primary",
                  bgcolor: activeKey===m.key?"rgba(201,169,110,0.07)":"transparent",
                }}>
                  <span style={{flex:1}}>{m.name}</span>
                  {m.family&&m.family!==m.name&&(
                    <Typography component="span" sx={{ fontSize:"0.58rem", color:"text.secondary" }}>
                      {m.family}
                    </Typography>
                  )}
                </MenuItem>
              )),
            ])}
          </Select>

          {/* Badges */}
          {activeMaqam&&(
            <Box sx={{ display:"flex", gap:0.6, flexWrap:"wrap", alignItems:"center" }}>
              <Chip label={SEYIR_LABEL[activeMaqam.seyir?.type]||"—"} size="small" sx={{
                height:19, fontSize:"0.6rem",
                bgcolor:`${SEYIR_COLOR[activeMaqam.seyir?.type]||"#c9a96e"}18`,
                color: SEYIR_COLOR[activeMaqam.seyir?.type]||"text.secondary",
                border:"1px solid",
                borderColor:`${SEYIR_COLOR[activeMaqam.seyir?.type]||"#c9a96e"}44`,
              }}/>
              {activeMaqam.tradition?.slice(0,2).map(t=>(
                <Chip key={t} label={t} size="small" sx={{
                  height:18, fontSize:"0.58rem",
                  bgcolor:"rgba(201,169,110,0.08)", color:"primary.main",
                  border:"1px solid rgba(201,169,110,0.18)",
                }}/>
              ))}
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── INFO + HISTOGRAM ROW ── */}
      <Grid container spacing={2} sx={{mb:2}}>

        {/* Info card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...CARD, height:"100%" }}>
            <Typography sx={{ ...LABEL_SX, mb:1.25 }}>
              {detectedMaqam&&!detectedMaqam.manualOverride ? "Ανιχνεύθηκε" : "Πληροφορίες"}
            </Typography>

            {activeMaqam ? (
              <>
                <Typography sx={{
                  color:"primary.light", fontWeight:300,
                  fontSize:"1.45rem", letterSpacing:"0.05em", lineHeight:1.2, mb:0.75,
                }}>
                  {activeMaqam.name}
                </Typography>

                {detectedMaqam&&!detectedMaqam.manualOverride&&(
                  <Box sx={{ display:"flex", alignItems:"center", gap:1, mb:1.25 }}>
                    <Typography variant="caption" sx={{ color:"text.secondary", minWidth:55, fontSize:"0.63rem" }}>
                      Βεβαιότητα
                    </Typography>
                    <LinearProgress variant="determinate" value={(detectedMaqam.confidence||0)*100}
                      sx={{ flex:1, borderRadius:2, height:4, bgcolor:"background.default",
                        "& .MuiLinearProgress-bar":{ bgcolor:"primary.main" } }}/>
                    <Typography variant="caption" sx={{ color:"primary.light", minWidth:26, fontSize:"0.63rem" }}>
                      {Math.round((detectedMaqam.confidence||0)*100)}%
                    </Typography>
                  </Box>
                )}

                <Typography variant="caption" sx={{
                  color:"text.secondary", display:"block",
                  lineHeight:1.7, fontSize:"0.68rem", mb:1.5,
                }}>
                  {activeMaqam.description}
                </Typography>

                <Typography sx={{ ...LABEL_SX, mb:0.75 }}>Κλίμακα</Typography>
                <Box sx={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
                  {activeMaqam.intervals.map((cents,i)=>{
                    const isRoot=cents===0||cents===1200;
                    const isDom=cents===activeMaqam.dominant;
                    const isChar=activeMaqam.characteristic?.includes(cents)&&!isRoot&&!isDom;
                    const col=isRoot?"#e8c87a":isDom?"#d4882a":isChar?"#6ab04c":"rgba(201,169,110,0.38)";
                    return (
                      <Box key={i} sx={{
                        border:"1px solid", borderColor:`${col}44`, borderRadius:0.75,
                        px:0.7, py:0.3, bgcolor:"background.default",
                        display:"flex", flexDirection:"column", alignItems:"center",
                      }}>
                        <Typography sx={{ fontSize:"0.54rem", color:col, fontWeight:600, lineHeight:1.1 }}>
                          {DEGREE_LABELS[i]||i}
                        </Typography>
                        <Typography sx={{ fontSize:"0.58rem", color:"text.secondary", fontFamily:"'Ubuntu Mono',monospace", lineHeight:1.2 }}>
                          {cents}¢
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>

                {activeMaqam.jins?.length>0&&(
                  <Box sx={{mt:1.25}}>
                    <Typography sx={{ ...LABEL_SX, mb:0.6 }}>Jins</Typography>
                    <Box sx={{ display:"flex", gap:0.5, flexWrap:"wrap" }}>
                      {activeMaqam.jins.map((j,i)=>(
                        <Chip key={i} label={`${j.name} @${j.root}¢`} size="small" sx={{
                          height:17, fontSize:"0.57rem",
                          bgcolor:"rgba(90,143,160,0.12)", color:"#5a8fa0",
                          border:"1px solid rgba(90,143,160,0.28)",
                        }}/>
                      ))}
                    </Box>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ textAlign:"center", py:5 }}>
                <Typography sx={{ fontSize:"2rem", mb:1, opacity:0.3 }}>𝄞</Typography>
                <Typography variant="caption" sx={{ color:"text.secondary", fontSize:"0.68rem" }}>
                  Επίλεξε μακάμ για πληροφορίες
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Histogram + Seyir */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Paper sx={CARD}>
                <Typography sx={{ ...LABEL_SX, mb:1.25 }}>Μικροτονικό Histogram</Typography>
                <Box sx={{ display:"flex", alignItems:"flex-end", height:72, gap:"1.5px" }}>
                  {histogram.map((val,i)=>{
                    const inMaqam=activeMaqam?.intervals
                      ?activeMaqam.intervals.some(c=>Math.abs(c-i*50)<60):false;
                    return (
                      <Box key={i} sx={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1, height:"100%", justifyContent:"flex-end" }}>
                        <Box sx={{
                          width:"100%", height:`${Math.max(2,val*100)}%`,
                          bgcolor: inMaqam?"primary.main":"rgba(201,169,110,0.07)",
                          border:"1px solid",
                          borderColor: inMaqam?"rgba(201,169,110,0.45)":"rgba(201,169,110,0.1)",
                          borderRadius:"2px 2px 0 0",
                          transition:"height 0.3s",
                        }}/>
                        {i%4===0&&(
                          <Typography sx={{
                            fontSize:"0.44rem", color:"text.secondary", mt:0.25,
                            whiteSpace:"nowrap", writingMode:"vertical-rl",
                            transform:"rotate(180deg)", height:20,
                          }}>{NOTE_NAMES_QT[i]}</Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Paper>
            </Grid>

            {seyirPath.length>0&&(
              <Grid item xs={12}>
                <Paper sx={CARD}>
                  <Typography sx={{ ...LABEL_SX, mb:0.75 }}>Σέιρ (Melodic Path)</Typography>
                  <svg width="100%" height="52" style={{display:"block"}}>
                    <line x1="0" y1="26" x2="100%" y2="26" stroke="rgba(201,169,110,0.12)" strokeWidth="1" strokeDasharray="4 3"/>
                    {seyirPath.map((v,i)=>{
                      if(i===0) return null;
                      const prev=seyirPath[i-1];
                      return <line key={i}
                        x1={`${((i-1)/(seyirPath.length-1))*100}%`} y1={26-(prev||0)*20}
                        x2={`${(i/(seyirPath.length-1))*100}%`} y2={26-(v||0)*20}
                        stroke={seyirLineColor(v)} strokeWidth="2" strokeLinecap="round"/>;
                    })}
                  </svg>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>

      {/* ── FRETBOARD ── */}
      {activeMaqam&&(
        <Paper sx={{ ...CARD, borderColor:"rgba(201,169,110,0.25)" }}>
          <Box sx={{ display:"flex", alignItems:"baseline", gap:1.5, mb:1.5, pb:1, borderBottom:"1px solid", borderColor:"divider" }}>
            <Typography sx={{ ...LABEL_SX, mb:0 }}>Ταμπλατούρα</Typography>
            <Typography sx={{ color:"primary.light", fontWeight:300, fontSize:"0.95rem", letterSpacing:"0.04em" }}>
              {activeMaqam.name}
            </Typography>
          </Box>
          <MaqamTablature
            audioMode={audioMode}
            maqam={activeMaqam}
            tuning={tuning}
            instrument={instrument}
          />
        </Paper>
      )}
    </Box>
  );
}

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Box, Button, Typography, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Slider,
  Chip, IconButton, Tooltip,
} from "@mui/material";
import AddIcon         from "@mui/icons-material/Add";
import EditIcon        from "@mui/icons-material/Edit";
import DeleteIcon      from "@mui/icons-material/Delete";
import CloseIcon       from "@mui/icons-material/Close";
import PlayArrowIcon   from "@mui/icons-material/PlayArrow";
import StopIcon        from "@mui/icons-material/Stop";
import MusicNoteIcon   from "@mui/icons-material/MusicNote";
import TableChartIcon  from "@mui/icons-material/TableChart";
import ViewColumnIcon  from "@mui/icons-material/ViewColumn";
import SaveAltIcon     from "@mui/icons-material/SaveAlt";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { INSTRUMENTS, getAllPositions, midiToName } from "../utils/instruments";
import { playNote }    from "../utils/audioEngine";
import { detectMaqam } from "../utils/maqamDetection";

// ── Constants ────────────────────────────────────────────────────────────────
const ORNAMENTS = {
  none:           { label:"None",         symbol:"" },
  slide_up:       { label:"Slide up",     symbol:"/" },
  slide_down:     { label:"Slide down",   symbol:"\\" },
  hammer_on:      { label:"Hammer-on",    symbol:"h" },
  pull_off:       { label:"Pull-off",     symbol:"p" },
  vibrato:        { label:"Vibrato",      symbol:"~" },
  trill:          { label:"Trill",        symbol:"tr" },
  grace:          { label:"Grace note",   symbol:"gr" },
  microtone_bend: { label:"¼-tone bend",  symbol:"mb" },
};
const DURATION_OPTIONS = [
  { label:"Whole",   value:4,    symbol:"𝅝" },
  { label:"Half",    value:2,    symbol:"𝅗𝅥" },
  { label:"Quarter", value:1,    symbol:"♩" },
  { label:"8th",     value:0.5,  symbol:"♪" },
  { label:"16th",    value:0.25, symbol:"𝅘𝅥𝅯" },
];
const BEATS_PER_MEASURE = 4;
const PIXELS_PER_BEAT   = 80;
const STRING_SPACING    = 36;
const HEADER_HEIGHT     = 40;

// ── Staff helpers ─────────────────────────────────────────────────────────────
const NOTE_LETTERS = ["C","D","E","F","G","A","B"];
const DIATONIC_MAP = [0,0,1,1,2,3,3,4,4,5,5,6];
const ACCID_MAP    = [0,1,0,1,0,0,1,0,1,0,1,0];
function midiToStaff(midi) {
  const n = midi % 12, oct = Math.floor(midi/12)-1;
  return { pos: DIATONIC_MAP[n] + oct*7 - 28, accidental: ACCID_MAP[n]?"♯":"",
           letter: NOTE_LETTERS[DIATONIC_MAP[n]], octave: oct };
}
function staffPosToY(pos, staffTop, ls) {
  return staffTop + (2 - pos) * (ls/2) + 4*ls;
}
function getLedgerLines(pos) {
  const l=[];
  if(pos<=0)  for(let p=0;  p>=pos-1; p-=2) if(p%2===0) l.push(p);
  if(pos>=12) for(let p=12; p<=pos+1; p+=2) l.push(p);
  return l;
}

// ── Full-neck position assignment ─────────────────────────────────────────────
// Distributes notes across ALL strings trying to:
//  1. Use the actual string/fret from the note if set
//  2. Prefer notes that continue on the same string for legato
//  3. Prefer mid-range frets (not all open, not all high)
//  4. Spread load across strings so each gets used
function buildOptimalPositions(notes, tuning, instrument) {
  const fps   = INSTRUMENTS[instrument]?.fretPositions ?? [];
  const nStr  = tuning.strings.length;
  const TOL   = 35;

  // For each note get all valid positions
  const allPos = notes.map(n => {
    const mf = (n.midi || n.midiRounded || 60) + (n.microtonalOffset||0)/100;
    const positions = [];
    for (let s = 0; s < nStr; s++) {
      const open = tuning.strings[s].midi;
      const cFrom = (mf - open) * 100;
      if (cFrom < -TOL || cFrom > (fps[fps.length-1]??1200) + TOL) continue;
      for (let f = 0; f < fps.length; f++) {
        if (Math.abs(fps[f] - cFrom) <= TOL) {
          // Score: prefer mid-fret (fret index 4-12 = frets 1-3 on oud)
          const fretScore = Math.abs(f - 8);   // 0 = perfect at fret 2
          positions.push({ string:s, fretIdx:f, fretScore });
          break; // one per string (lowest fret on that string)
        }
      }
    }
    return { note:n, positions };
  });

  // Greedy assignment: keep running string usage count, prefer underused strings
  const stringUse = new Array(nStr).fill(0);
  return allPos.map(({ note, positions }, i) => {
    // If note already has a valid explicit position, honour it
    if (note.string != null && note.fret != null) {
      const s = note.string;
      const f = note.fret;
      if (s >= 0 && s < nStr) {
        stringUse[s]++;
        return { ...note, string:s, fret:f };
      }
    }
    if (positions.length === 0) return note;

    // Score each candidate: balance string use + fret comfort + continuity
    const prevNote = i > 0 ? notes[i-1] : null;
    const best = positions.reduce((bst, p) => {
      let score = stringUse[p.string] * 3;      // penalty for overused string
      score += p.fretScore * 0.5;                // prefer mid frets
      if (prevNote && prevNote.string === p.string) score -= 1.5; // slight legato bonus
      return score < bst.score ? { ...p, score } : bst;
    }, { ...positions[0], score: Infinity });

    stringUse[best.string]++;
    // Convert fretIdx to display fret number (on oud: fretIdx 4 = fret 1, etc.)
    // For display in tab we use the fretIdx directly (matches instruments.js fretPositions)
    return { ...note, string: best.string, fret: best.fretIdx };
  });
}

// ── Save helpers ──────────────────────────────────────────────────────────────
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function saveAsJSON(notes, tuning, instrument, detectedMaqam, tempo) {
  const data = {
    version: "maqamtab-v8",
    instrument, tempo,
    tuning: { id: tuning.id, name: tuning.name },
    maqam: detectedMaqam
      ? { key: detectedMaqam.key, name: detectedMaqam.name,
          confidence: detectedMaqam.confidence, seyir: detectedMaqam.seyirDirection }
      : null,
    notes: notes.map(n => ({
      time: +n.time.toFixed(4),
      duration: +n.duration.toFixed(4),
      midi: n.midiRounded,
      microtonalOffset: n.microtonalOffset || 0,
      velocity: n.velocity || 80,
      string: n.string,
      fret: n.fret,
      ornament: n.ornament || null,
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
  const name = (detectedMaqam?.name ?? "tab").toLowerCase().replace(/\s+/g,"-");
  downloadBlob(blob, `maqamtab-${name}-${Date.now()}.json`);
}

function buildMusicXMLString(notes, tuning, instrument, detectedMaqam, tempo) {
  const divisions = 4;
  const bpm = tempo;

  // Map notes to measures
  const beatsPerMeasure = 4;
  const beatDur = 60 / bpm;
  const measureDur = beatsPerMeasure * beatDur;

  // Build measure list
  const maxTime = notes.length > 0
    ? Math.max(...notes.map(n => n.time + n.duration)) : 4;
  const numMeasures = Math.ceil(maxTime / measureDur) + 1;
  const measures = Array.from({ length: numMeasures }, () => []);
  notes.forEach(n => {
    const m = Math.floor(n.time / measureDur);
    if (m < numMeasures) measures[m].push(n);
  });

  // MIDI to MusicXML step/alter/octave
  const STEPS = ["C","C","D","D","E","F","F","G","G","A","A","B"];
  const ALTERS= [0,1,0,1,0,0,1,0,1,0,1,0];
  function noteXML(n) {
    const midi = Math.round(n.midi || n.midiRounded);
    const step  = STEPS[midi % 12];
    const alter = ALTERS[midi % 12];
    const oct   = Math.floor(midi / 12) - 1;
    const dur   = Math.round((n.duration / beatDur) * divisions);
    const type  = dur >= 16?"whole":dur>=8?"half":dur>=4?"quarter":dur>=2?"eighth":"16th";
    const tech  = n.fret != null && n.string != null
      ? `<technical><string>${n.string+1}</string><fret>${n.fret}</fret></technical>` : "";
    return `        <note>
          <pitch><step>${step}</step>${alter?`<alter>${alter}</alter>`:""}
          <octave>${oct}</octave></pitch>
          <duration>${dur}</duration>
          <type>${type}</type>
          ${tech}
        </note>`;
  }

  const maqamTitle = detectedMaqam?.name ?? "MaqamTAB";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${maqamTitle}</work-title></work>
  <identification>
    <encoding><software>MaqamTAB v8</software></encoding>
  </identification>
  <part-list>
    <score-part id="P1"><part-name>${instrument} — ${tuning.name}</part-name></score-part>
  </part-list>
  <part id="P1">
${measures.map((mnotes, mi) => `    <measure number="${mi+1}">
${mi===0?`      <attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <direction placement="above">
        <direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${bpm}</per-minute></metronome></direction-type>
      </direction>`:""}
${mnotes.length>0 ? mnotes.map(noteXML).join("\n") : `        <note><rest/><duration>${divisions*4}</duration><type>whole</type></note>`}
    </measure>`).join("\n")}
  </part>
</score-partwise>`;
  return xml;
}

function saveAsMusicXML(notes, tuning, instrument, detectedMaqam, tempo) {
  const xml  = buildMusicXMLString(notes, tuning, instrument, detectedMaqam, tempo);
  const blob = new Blob([xml], { type:"application/xml" });
  const name = (detectedMaqam?.name ?? "tab").toLowerCase().replace(/\s+/g,"-");
  downloadBlob(blob, `maqamtab-${name}-${Date.now()}.musicxml`);
}

// ── File System Access API save ───────────────────────────────────────────────
async function saveToFileSystem(notes, tuning, instrument, detectedMaqam, tempo, format) {
  const name = (detectedMaqam?.name ?? "tab").toLowerCase().replace(/\s+/g,"-");
  const isJson = format === "json";
  const opts = {
    suggestedName: `maqamtab-${name}.${isJson?"json":"musicxml"}`,
    types: [{ description: isJson?"JSON Tab":"MusicXML",
      accept: { [isJson?"application/json":"application/xml"]: [isJson?".json":".musicxml"] } }],
  };
  try {
    const handle = await window.showSaveFilePicker(opts);
    const writable = await handle.createWritable();
    let content = "";
    if (isJson) {
      const data = {
        version:"maqamtab-v8", instrument, tempo,
        tuning:{ id:tuning.id, name:tuning.name },
        maqam: detectedMaqam
          ? { key:detectedMaqam.key, name:detectedMaqam.name,
              confidence:detectedMaqam.confidence, seyir:detectedMaqam.seyirDirection } : null,
        notes: notes.map(n => ({
          time:+n.time.toFixed(4), duration:+n.duration.toFixed(4),
          midi:n.midiRounded, microtonalOffset:n.microtonalOffset||0,
          velocity:n.velocity||80, string:n.string, fret:n.fret, ornament:n.ornament||null,
        })),
      };
      content = JSON.stringify(data, null, 2);
    } else {
      content = buildMusicXMLString(notes, tuning, instrument, detectedMaqam, tempo);
    }
    await writable.write(content);
    await writable.close();
    return true;
  } catch (e) {
    if (e.name === "AbortError") return false;
    return false;
  }
}

// ── Staff SVG ─────────────────────────────────────────────────────────────────
function StaffSVG({ notes, tempo, selectedNote, onSelectNote, onEdit, onStaffClick, svgRef, totalWidth, playheadX }) {
  const LS=10, ST=22, NR=7;
  const H = ST + 4*LS + NR*7 + 30;
  const tx = t => 70 + (t * tempo/60) * PIXELS_PER_BEAT;
  return (
    <svg ref={svgRef} width={totalWidth} height={H}
      style={{ display:"block", cursor:"crosshair" }} onClick={onStaffClick}>
      <rect width={totalWidth} height={H} fill="#0a0805"/>
      <text x={10} y={ST+3.6*LS+4} fontSize="44" fill="#c9a96e" opacity="0.65"
        fontFamily="serif" style={{ userSelect:"none" }}>𝄞</text>
      <text x={50} y={ST+1.5*LS+4} fontSize="15" fill="#9a8870"
        fontFamily="Ubuntu,sans-serif" fontWeight="700">4</text>
      <text x={50} y={ST+3.5*LS+4} fontSize="15" fill="#9a8870"
        fontFamily="Ubuntu,sans-serif" fontWeight="700">4</text>
      {[0,1,2,3,4].map(i=>(
        <line key={i} x1={0} y1={ST+i*LS} x2={totalWidth} y2={ST+i*LS}
          stroke="rgba(201,169,110,0.22)" strokeWidth={1}/>
      ))}
      {Array.from({length:Math.ceil(totalWidth/(BEATS_PER_MEASURE*PIXELS_PER_BEAT))+2},(_,m)=>{
        const x=70+m*BEATS_PER_MEASURE*PIXELS_PER_BEAT;
        return <line key={m} x1={x} y1={ST} x2={x} y2={ST+4*LS}
          stroke="rgba(201,169,110,0.18)" strokeWidth={1}/>;
      })}
      {notes.map((note,idx)=>{
        const x=tx(note.time);
        const inf=midiToStaff(Math.round(note.midi||note.midiRounded));
        const y=staffPosToY(inf.pos,ST,LS);
        const sel=selectedNote===idx;
        const col=sel?"#e8c87a":"#c9a96e";
        const beats=(note.duration*tempo)/60;
        const isOpen=beats>=2, isWhole=beats>=4;
        const stemUp=inf.pos<6;
        const sLen=3.5*LS;
        const sx=stemUp?x+NR-1:x-NR+1;
        const ledgers=getLedgerLines(inf.pos);
        const flag8=beats<=0.5&&beats>0.25;
        const flag16=beats<=0.25;
        return (
          <g key={note.id||idx} style={{cursor:"pointer"}}
            onClick={e=>{e.stopPropagation();onSelectNote(sel?null:idx);}}
            onDoubleClick={e=>{e.stopPropagation();onEdit(idx);}}>
            {ledgers.map(lp=>{
              const ly=staffPosToY(lp,ST,LS);
              return <line key={lp} x1={x-NR-4} y1={ly} x2={x+NR+4} y2={ly}
                stroke={sel?"#e8c87a":"rgba(201,169,110,0.45)"} strokeWidth={1.2}/>;
            })}
            {inf.accidental&&(
              <text x={x-NR-8} y={y+4} fontSize="11" fill={sel?"#e8c87a":"#d4882a"}
                fontFamily="serif" textAnchor="middle">{inf.accidental}</text>
            )}
            {isWhole
              ?<ellipse cx={x} cy={y} rx={NR} ry={NR*0.62} fill="none" stroke={col} strokeWidth="1.5"/>
              :<ellipse cx={x} cy={y} rx={NR} ry={NR*0.62}
                fill={isOpen?"none":col} stroke={col} strokeWidth={isOpen?"1.5":"1"}/>}
            {!isWhole&&<line x1={sx} y1={y} x2={sx} y2={stemUp?y-sLen:y+sLen} stroke={col} strokeWidth={1.2}/>}
            {flag8&&<path d={stemUp
              ?`M${sx} ${y-sLen} C${sx+14} ${y-sLen+8},${sx+12} ${y-sLen+20},${sx+2} ${y-sLen+26}`
              :`M${sx} ${y+sLen} C${sx+14} ${y+sLen-8},${sx+12} ${y+sLen-20},${sx+2} ${y+sLen-26}`}
              fill="none" stroke={col} strokeWidth="1.2"/>}
            {flag16&&<>
              <path d={stemUp
                ?`M${sx} ${y-sLen} C${sx+14} ${y-sLen+8},${sx+12} ${y-sLen+20},${sx+2} ${y-sLen+26}`
                :`M${sx} ${y+sLen} C${sx+14} ${y+sLen-8},${sx+12} ${y+sLen-20},${sx+2} ${y+sLen-26}`}
                fill="none" stroke={col} strokeWidth="1.2"/>
              <path d={stemUp
                ?`M${sx} ${y-sLen+10} C${sx+14} ${y-sLen+18},${sx+12} ${y-sLen+30},${sx+2} ${y-sLen+36}`
                :`M${sx} ${y+sLen-10} C${sx+14} ${y+sLen-18},${sx+12} ${y+sLen-30},${sx+2} ${y+sLen-36}`}
                fill="none" stroke={col} strokeWidth="1.2"/>
            </>}
            <text x={x} y={y+(stemUp?26:-18)} fontSize="8"
              fill={sel?"#e8c87a":"rgba(201,169,110,0.4)"}
              textAnchor="middle" fontFamily="Ubuntu Mono,monospace">
              {inf.letter}{inf.octave}
            </text>
            {Math.abs(note.microtonalOffset||0)>10&&(
              <text x={x} y={y+(stemUp?36:-28)} fontSize="7"
                fill="#d4882a" textAnchor="middle" fontFamily="Ubuntu Mono,monospace">
                {note.microtonalOffset>0?"+":""}{note.microtonalOffset.toFixed(0)}¢
              </text>
            )}
          </g>
        );
      })}
      {playheadX>0&&(
        <line x1={playheadX} y1={0} x2={playheadX} y2={H}
          stroke="#e8c87a" strokeWidth={1.5} opacity={0.7} strokeDasharray="4 3"/>
      )}
    </svg>
  );
}

// ── Tab SVG ───────────────────────────────────────────────────────────────────
function TabSVG({ notes, tuning, tempo, selectedNote, onSelectNote, onSvgClick, onEdit, svgRef, totalWidth, playheadX }) {
  const sc = tuning.strings.length;
  const H  = HEADER_HEIGHT + sc * STRING_SPACING + 20;
  const tx = t => 60 + (t*tempo/60) * PIXELS_PER_BEAT;
  const sy = i => HEADER_HEIGHT + i * STRING_SPACING + STRING_SPACING/2;
  return (
    <svg ref={svgRef} width={totalWidth} height={H}
      style={{ display:"block", cursor:"crosshair" }} onClick={onSvgClick}>
      <rect width={totalWidth} height={H} fill="#0d0a05"/>
      <text x={18} y={HEADER_HEIGHT+(sc*STRING_SPACING)/2+4}
        textAnchor="middle" fill="#c9a96e" fontSize="12"
        fontFamily="Ubuntu,sans-serif" fontWeight="700"
        transform={`rotate(-90,18,${HEADER_HEIGHT+(sc*STRING_SPACING)/2+4})`}>TAB</text>
      {Array.from({length:Math.ceil(totalWidth/(BEATS_PER_MEASURE*PIXELS_PER_BEAT))+2},(_,m)=>{
        const x=60+m*BEATS_PER_MEASURE*PIXELS_PER_BEAT;
        return (<g key={m}>
          <line x1={x} y1={HEADER_HEIGHT-4} x2={x} y2={H-14}
            stroke="rgba(201,169,110,0.2)" strokeWidth={m===0?2:1}/>
          {m>0&&<text x={x+3} y={HEADER_HEIGHT-12} fill="#9a8870" fontSize="9"
            fontFamily="Ubuntu Mono,monospace">{m+1}</text>}
        </g>);
      })}
      {Array.from({length:Math.ceil(totalWidth/PIXELS_PER_BEAT)+2},(_,b)=>(
        <line key={b} x1={60+b*PIXELS_PER_BEAT} y1={HEADER_HEIGHT}
          x2={60+b*PIXELS_PER_BEAT} y2={H-14}
          stroke="rgba(201,169,110,0.05)" strokeWidth={1} strokeDasharray="2 4"/>
      ))}
      {tuning.strings.map((s,i)=>{
        const isCourseEdge = tuning.expanded && s.subIdx===0 && s.courseGroup>0;
        return (<g key={i}>
          {isCourseEdge&&(
            <line x1={36} y1={sy(i)-STRING_SPACING/2+3} x2={totalWidth-8} y2={sy(i)-STRING_SPACING/2+3}
              stroke="rgba(201,169,110,0.1)" strokeWidth="1" strokeDasharray="4 4"/>
          )}
          <line x1={36} y1={sy(i)} x2={totalWidth-8} y2={sy(i)}
            stroke={tuning.expanded&&s.subIdx===0?"rgba(201,169,110,0.32)":"rgba(201,169,110,0.18)"}
            strokeWidth={tuning.expanded&&s.subIdx===0?1.2:0.7}/>
          {(!tuning.expanded||s.subIdx===0)&&(
            <text x={32} y={sy(i)+4} textAnchor="end" fill="#9a8870" fontSize="10"
              fontFamily="Ubuntu Mono,monospace">{s.name}</text>
          )}
        </g>);
      })}
      {notes.map((note,idx)=>{
        const x=tx(note.time);
        const y=sy(note.string);
        const w=Math.max(22,(note.duration*tempo/60)*PIXELS_PER_BEAT-4);
        const sel=selectedNote===idx;
        const orn=note.ornament?ORNAMENTS[note.ornament]:null;
        const fs=String(note.fret??0);
        const bw=fs.length>1?22:18;
        return (
          <g key={note.id||idx} style={{cursor:"pointer"}}
            onClick={e=>{e.stopPropagation();onSelectNote(sel?null:idx);}}
            onDoubleClick={e=>{e.stopPropagation();onEdit(idx);}}>
            <rect x={x} y={y-2} width={w} height={4} rx={2}
              fill={sel?"rgba(232,200,122,0.4)":"rgba(201,169,110,0.12)"}/>
            <rect x={x-bw/2} y={y-10} width={bw} height={20} rx={4}
              fill={sel?"#c9a96e":"#1a1408"}
              stroke={sel?"#e8c87a":"rgba(201,169,110,0.4)"} strokeWidth={sel?2:1}/>
            <text x={x} y={y+4.5} textAnchor="middle"
              fill={sel?"#0d0a05":"#e8c87a"}
              fontSize="10" fontFamily="Ubuntu Mono,monospace" fontWeight="700">{fs}</text>
            {orn?.symbol&&(
              <text x={x} y={y-14} fontSize="9" fill="#d4882a" textAnchor="middle">{orn.symbol}</text>
            )}
            {Math.abs(note.microtonalOffset||0)>10&&(
              <text x={x} y={y+24} fontSize="7.5" fill="#a04830"
                textAnchor="middle" fontFamily="Ubuntu Mono,monospace">
                {note.microtonalOffset>0?"+":""}{note.microtonalOffset.toFixed(0)}¢
              </text>
            )}
          </g>
        );
      })}
      {playheadX>0&&(
        <line x1={playheadX} y1={0} x2={playheadX} y2={H}
          stroke="#e8c87a" strokeWidth={1.5} opacity={0.8} strokeDasharray="4 3"/>
      )}
    </svg>
  );
}

// ── Maqam Banner ──────────────────────────────────────────────────────────────
function MaqamBanner({ maqam, onDismiss }) {
  if (!maqam) return null;
  const conf = Math.round((maqam.confidence||0)*100);
  const seyirColor = maqam.seyirDirection==="ascending"?"#6ab04c"
    :maqam.seyirDirection==="descending"?"#d4882a":"#5a8fa0";
  const seyirLabel = maqam.seyirDirection==="ascending"?"↗ Ανοδικό"
    :maqam.seyirDirection==="descending"?"↘ Καθοδικό":"↕ Μικτό";
  return (
    <Box sx={{
      display:"flex", alignItems:"center", gap:2, px:2.5, py:1,
      bgcolor:"rgba(201,169,110,0.06)", borderBottom:"1px solid rgba(201,169,110,0.15)",
      flexShrink:0, flexWrap:"wrap",
    }}>
      <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
        <Typography sx={{ fontSize:"0.6rem", color:"text.secondary",
          textTransform:"uppercase", letterSpacing:"0.1em" }}>
          Ανιχνεύθηκε μακάμ
        </Typography>
        <Typography sx={{ fontSize:"1rem", fontWeight:300, color:"primary.light" }}>
          {maqam.name}
        </Typography>
      </Box>
      {/* Confidence bar */}
      <Box sx={{ display:"flex", alignItems:"center", gap:0.75 }}>
        <Box sx={{ width:60, height:5, bgcolor:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" }}>
          <Box sx={{
            width:`${conf}%`, height:"100%",
            bgcolor: conf>=70?"#6ab04c":conf>=45?"#d4882a":"#a04830",
            borderRadius:3, transition:"width 0.4s",
          }}/>
        </Box>
        <Typography sx={{ fontSize:"0.62rem", fontFamily:"Ubuntu Mono,monospace",
          color:"primary.main" }}>{conf}%</Typography>
      </Box>
      <Chip label={seyirLabel} size="small" sx={{
        height:18, fontSize:"0.6rem",
        bgcolor:`${seyirColor}22`, color:seyirColor,
        border:`1px solid ${seyirColor}55`,
      }}/>
      {maqam.intervals && (
        <Typography sx={{ fontSize:"0.62rem", fontFamily:"Ubuntu Mono,monospace",
          color:"text.secondary" }}>
          {maqam.intervals.join(" · ")}¢
        </Typography>
      )}
      <IconButton size="small" onClick={onDismiss}
        sx={{ ml:"auto", color:"text.disabled", p:0.25, "&:hover":{ color:"text.secondary" } }}>
        <CloseIcon sx={{ fontSize:13 }}/>
      </IconButton>
    </Box>
  );
}

// ── Main TabEditor ─────────────────────────────────────────────────────────────
export default function TabEditor({
  notes, tuning, instrument, selectedNote, onSelectNote,
  onNoteUpdate, onNoteDelete, onNoteAdd, tempo, audioMode="auto",
  detectedMaqam: externalMaqam, onMaqamDetected,
}) {
  const [editingNote,  setEditingNote]  = useState(null);
  const [viewMode,     setViewMode]     = useState("both");
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [playheadX,    setPlayheadX]    = useState(0);
  const [localMaqam,   setLocalMaqam]   = useState(null);  // from local detection
  const [maqamDismiss, setMaqamDismiss] = useState(false);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [fullNeck,     setFullNeck]     = useState(true);   // use optimal positions

  const svgRef      = useRef(null);
  const staffSvgRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rafRef      = useRef(null);

  // ── Optimal note positions (full-neck) ────────────────────────────────────
  const displayNotes = useMemo(() => {
    if (!fullNeck || notes.length === 0) return notes;
    return buildOptimalPositions(notes, tuning, instrument);
  }, [notes, tuning, instrument, fullNeck]);

  // ── Auto-detect maqam when notes change ──────────────────────────────────
  useEffect(() => {
    if (notes.length < 4) { setLocalMaqam(null); return; }
    const timer = setTimeout(() => {
      try {
        const result = detectMaqam(notes);
        if (result) {
          setLocalMaqam(result);
          setMaqamDismiss(false);
          onMaqamDetected?.(result);
        }
      } catch (e) { /* detection failed gracefully */ }
    }, 600);
    return () => clearTimeout(timer);
  }, [notes]);

  const shownMaqam = externalMaqam || localMaqam;

  const totalDuration = notes.length>0
    ? Math.max(...notes.map(n=>n.time+(n.duration||0.5)),4) : 4;
  const measures   = Math.ceil((totalDuration*tempo/60)/BEATS_PER_MEASURE);
  const totalWidth = Math.max(800, measures*BEATS_PER_MEASURE*PIXELS_PER_BEAT+120);
  const timeToX    = t => 60+(t*tempo/60)*PIXELS_PER_BEAT;

  // ── Playback ──────────────────────────────────────────────────────────────
  const startPlayback = useCallback(() => {
    let ctx = audioCtxRef.current;
    if (!ctx || ctx.state==="closed") {
      const C = window.AudioContext||window.webkitAudioContext;
      if (!C) return;
      ctx = new C(); audioCtxRef.current = ctx;
    }
    if (ctx.state==="suspended") ctx.resume();
    const now = ctx.currentTime;
    displayNotes.forEach(n => {
      const mf = (n.midi||n.midiRounded)+(n.microtonalOffset||0)/100;
      playNote(ctx, mf, now+n.time, n.duration||0.5, instrument, audioMode);
    });
    setIsPlaying(true);
    const start=performance.now(), total=totalDuration+0.5;
    const tick=()=>{
      const el=(performance.now()-start)/1000;
      if(el>=total){setIsPlaying(false);setPlayheadX(0);return;}
      setPlayheadX(timeToX(el));
      rafRef.current=requestAnimationFrame(tick);
    };
    rafRef.current=requestAnimationFrame(tick);
  }, [displayNotes, tempo, totalDuration, instrument, audioMode]);

  const stopPlayback = useCallback(()=>{
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsPlaying(false); setPlayheadX(0);
    if(audioCtxRef.current){audioCtxRef.current.close();audioCtxRef.current=null;}
  },[]);

  useEffect(()=>()=>{
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    if(audioCtxRef.current) audioCtxRef.current.close();
  },[]);

  // ── SVG click handlers ────────────────────────────────────────────────────
  const handleSvgClick = e => {
    if (!svgRef.current) return;
    const rect=svgRef.current.getBoundingClientRect();
    const x=e.clientX-rect.left, y=e.clientY-rect.top;
    const time=((x-60)/PIXELS_PER_BEAT)*(60/tempo);
    const si=Math.round((y-HEADER_HEIGHT-STRING_SPACING/2)/STRING_SPACING);
    if(si<0||si>=tuning.strings.length||time<0) return;
    if(notes.some(n=>Math.abs(timeToX(n.time)-x)<16&&n.string===si)) return;
    const om=tuning.strings[si].midi;
    onNoteAdd({id:`note_${Date.now()}`,time,duration:(60/tempo)*0.5,
      midi:om,midiRounded:om,microtonalOffset:0,string:si,fret:0,velocity:80,ornament:null});
  };
  const handleStaffClick = e => {
    if(!staffSvgRef.current) return;
    const rect=staffSvgRef.current.getBoundingClientRect();
    const x=e.clientX-rect.left;
    const time=((x-70)/PIXELS_PER_BEAT)*(60/tempo);
    if(time<0) return;
    if(notes.some(n=>Math.abs(timeToX(n.time)-x)<16)) return;
    const defaultMidi=tuning.strings[0].midi;
    onNoteAdd({id:`note_${Date.now()}`,time,duration:(60/tempo)*0.5,
      midi:defaultMidi,midiRounded:defaultMidi,microtonalOffset:0,
      string:0,fret:0,velocity:80,ornament:null});
  };

  const openEdit = idx => setEditingNote({...notes[idx], idx});

  // ── Save handlers ─────────────────────────────────────────────────────────
  const hasFSA = typeof window !== "undefined" && "showSaveFilePicker" in window;
  const handleSave = async (fmt) => {
    setSaveMenuOpen(false);
    if (hasFSA) {
      const ok = await saveToFileSystem(displayNotes, tuning, instrument, shownMaqam, tempo, fmt);
      if (!ok) {
        // fallback to download
        fmt==="json"
          ? saveAsJSON(displayNotes, tuning, instrument, shownMaqam, tempo)
          : saveAsMusicXML(displayNotes, tuning, instrument, shownMaqam, tempo);
      }
    } else {
      fmt==="json"
        ? saveAsJSON(displayNotes, tuning, instrument, shownMaqam, tempo)
        : saveAsMusicXML(displayNotes, tuning, instrument, shownMaqam, tempo);
    }
  };

  const VIEW_OPTIONS = [
    { key:"tab",   icon:<TableChartIcon sx={{fontSize:14}}/>, label:"Tab only" },
    { key:"both",  icon:<ViewColumnIcon sx={{fontSize:14}}/>, label:"Tab + Staff" },
    { key:"staff", icon:<MusicNoteIcon  sx={{fontSize:14}}/>, label:"Staff only" },
  ];

  return (
    <Box sx={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden" }}>

      {/* ── Toolbar ── */}
      <Paper square variant="outlined" sx={{
        display:"flex", alignItems:"center", gap:1, px:2, py:0.75,
        bgcolor:"background.paper", borderLeft:0, borderRight:0, borderTop:0, flexShrink:0,
        flexWrap:"wrap",
      }}>

        {/* Play/Stop */}
        <Tooltip title={isPlaying?"Stop":"Play"}>
          <span>
            <IconButton size="small" onClick={isPlaying?stopPlayback:startPlayback}
              disabled={notes.length===0}
              sx={{
                bgcolor:isPlaying?"rgba(192,57,43,0.12)":"rgba(74,138,90,0.12)",
                color:isPlaying?"error.main":"success.main",
                border:"1px solid",
                borderColor:isPlaying?"error.dark":"success.dark",
                "&:hover":{bgcolor:isPlaying?"rgba(192,57,43,0.22)":"rgba(74,138,90,0.22)"},
                mr:0.5,
              }}>
              {isPlaying?<StopIcon sx={{fontSize:16}}/>:<PlayArrowIcon sx={{fontSize:16}}/>}
            </IconButton>
          </span>
        </Tooltip>

        {/* Add note */}
        <Button size="small" variant="outlined" startIcon={<AddIcon/>}
          onClick={()=>onNoteAdd({
            id:`note_${Date.now()}`,
            time:notes.length>0?Math.max(...notes.map(n=>n.time+(n.duration||0.5))):0,
            duration:60/tempo*0.5, midi:tuning.strings[0].midi,
            midiRounded:tuning.strings[0].midi, microtonalOffset:0,
            string:0, fret:0, velocity:80, ornament:null,
          })}
          sx={{fontSize:"0.7rem",borderColor:"divider",color:"text.primary"}}>
          Νότα
        </Button>

        {selectedNote!==null&&<>
          <Button size="small" variant="outlined" startIcon={<EditIcon/>}
            onClick={()=>openEdit(selectedNote)}
            sx={{fontSize:"0.7rem",borderColor:"primary.dark",color:"primary.main"}}>
            Edit
          </Button>
          <Button size="small" variant="outlined" startIcon={<DeleteIcon/>}
            onClick={()=>{onNoteDelete(selectedNote);onSelectNote(null);}}
            sx={{fontSize:"0.7rem",borderColor:"error.dark",color:"error.main"}}>
            Delete
          </Button>
        </>}

        {/* Full-neck toggle */}
        <Tooltip title={fullNeck?"Βέλτιστη κατανομή χορδών (ενεργό)":"Κλικ για βέλτιστη κατανομή"}>
          <Box onClick={()=>setFullNeck(v=>!v)} sx={{
            display:"flex", alignItems:"center", gap:0.5, px:1, py:0.4,
            borderRadius:0.75, border:"1px solid", cursor:"pointer",
            borderColor:fullNeck?"primary.main":"divider",
            bgcolor:fullNeck?"rgba(201,169,110,0.1)":"transparent",
            transition:"all 0.12s", "&:hover":{borderColor:"primary.dark"},
          }}>
            <AutoFixHighIcon sx={{fontSize:13, color:fullNeck?"primary.main":"text.secondary"}}/>
            <Typography sx={{fontSize:"0.65rem",
              color:fullNeck?"primary.main":"text.secondary"}}>
              Full neck
            </Typography>
          </Box>
        </Tooltip>

        {/* Save menu */}
        <Box sx={{ position:"relative" }}>
          <Button size="small" variant="outlined"
            startIcon={<SaveAltIcon sx={{fontSize:13}}/>}
            disabled={notes.length===0}
            onClick={()=>setSaveMenuOpen(v=>!v)}
            sx={{fontSize:"0.7rem",borderColor:"divider",color:"text.secondary",
              "&:hover":{borderColor:"primary.dark",color:"primary.main"}}}>
            Αποθήκευση
          </Button>
          {saveMenuOpen&&(
            <Paper sx={{
              position:"absolute", top:"110%", left:0, zIndex:999,
              border:"1px solid", borderColor:"divider", minWidth:160,
              bgcolor:"background.paper", overflow:"hidden",
            }}>
              {[
                {fmt:"json",    label:"📄 JSON (.json)",         desc:"Πλήρη δεδομένα"},
                {fmt:"musicxml",label:"🎼 MusicXML (.musicxml)", desc:"MuseScore / Finale"},
              ].map(({fmt,label,desc})=>(
                <Box key={fmt} onClick={()=>handleSave(fmt)} sx={{
                  px:1.5, py:1, cursor:"pointer",
                  "&:hover":{bgcolor:"rgba(201,169,110,0.08)"},
                  borderBottom:"1px solid rgba(201,169,110,0.1)",
                }}>
                  <Typography sx={{fontSize:"0.72rem",color:"text.primary"}}>{label}</Typography>
                  <Typography sx={{fontSize:"0.58rem",color:"text.secondary"}}>{desc}</Typography>
                </Box>
              ))}
              <Box onClick={()=>setSaveMenuOpen(false)} sx={{
                px:1.5, py:0.6, cursor:"pointer", textAlign:"right",
                "&:hover":{bgcolor:"rgba(255,255,255,0.03)"},
              }}>
                <Typography sx={{fontSize:"0.6rem",color:"text.disabled"}}>κλείσιμο</Typography>
              </Box>
            </Paper>
          )}
        </Box>

        {/* Right side: view + stats */}
        <Box sx={{ml:"auto",display:"flex",alignItems:"center",gap:0.5}}>
          {VIEW_OPTIONS.map(v=>(
            <Tooltip key={v.key} title={v.label}>
              <IconButton size="small" onClick={()=>setViewMode(v.key)} sx={{
                p:0.5, color:viewMode===v.key?"primary.main":"text.secondary",
                bgcolor:viewMode===v.key?"rgba(201,169,110,0.1)":"transparent",
                border:"1px solid",borderColor:viewMode===v.key?"primary.dark":"divider",
              }}>{v.icon}</IconButton>
            </Tooltip>
          ))}
          <Typography variant="caption" sx={{color:"text.secondary",ml:1,whiteSpace:"nowrap"}}>
            {notes.length} νότες · {measures} μέτρα
          </Typography>
        </Box>
      </Paper>

      {/* ── Maqam banner ── */}
      {!maqamDismiss && shownMaqam && (
        <MaqamBanner maqam={shownMaqam} onDismiss={()=>setMaqamDismiss(true)}/>
      )}

      {/* ── Score area ── */}
      <Box sx={{flex:1, overflow:"auto", display:"flex", flexDirection:"column"}}>
        {(viewMode==="staff"||viewMode==="both")&&(
          <Box sx={{borderBottom:"1px solid",borderColor:"divider"}}>
            <StaffSVG notes={displayNotes} tempo={tempo} selectedNote={selectedNote}
              onSelectNote={onSelectNote} onEdit={openEdit}
              onStaffClick={handleStaffClick} svgRef={staffSvgRef}
              totalWidth={totalWidth} playheadX={playheadX}/>
          </Box>
        )}
        {(viewMode==="tab"||viewMode==="both")&&(
          <TabSVG notes={displayNotes} tuning={tuning} tempo={tempo}
            selectedNote={selectedNote}
            onSelectNote={onSelectNote} onSvgClick={handleSvgClick}
            onEdit={openEdit} svgRef={svgRef}
            totalWidth={totalWidth} playheadX={playheadX}/>
        )}
      </Box>

      {editingNote&&(
        <NoteEditDialog note={editingNote} tuning={tuning} instrument={instrument}
          tempo={tempo} audioMode={audioMode}
          onUpdate={u=>{onNoteUpdate(editingNote.idx,u);setEditingNote(null);}}
          onClose={()=>setEditingNote(null)}/>
      )}
    </Box>
  );
}

// ── Note Edit Dialog ───────────────────────────────────────────────────────────
function NoteEditDialog({ note, tuning, instrument, tempo, audioMode, onUpdate, onClose }) {
  const [fret, setFret] = useState(note.fret??0);
  const [str,  setStr]  = useState(note.string??0);
  const [orn,  setOrn]  = useState(note.ornament||"none");
  const [mto,  setMto]  = useState(note.microtonalOffset||0);
  const [dur,  setDur]  = useState(note.duration||(60/tempo*0.5));

  const allPos     = getAllPositions(note.midi||note.midiRounded, tuning, instrument);
  const openMidi   = tuning.strings[str]?.midi??note.midiRounded;
  const derivedMidi= openMidi + fret + mto/100;
  const staffInf   = midiToStaff(Math.round(derivedMidi));

  const preview = () => {
    const C=window.AudioContext||window.webkitAudioContext;
    if(!C) return;
    const ctx=new C();
    playNote(ctx, derivedMidi, ctx.currentTime, dur, instrument, audioMode);
    setTimeout(()=>ctx.close(),(dur+1.5)*1000);
  };
  const apply = () => {
    const nm=openMidi+fret;
    onUpdate({fret,string:str,midi:nm+mto/100,midiRounded:nm,
      microtonalOffset:mto,duration:dur,ornament:orn==="none"?null:orn});
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{sx:{bgcolor:"background.paper",backgroundImage:"none"}}}>
      <DialogTitle sx={{display:"flex",justifyContent:"space-between",alignItems:"center",pb:1}}>
        <Typography sx={{color:"primary.light",fontSize:"0.9rem",fontFamily:"Ubuntu,sans-serif",fontWeight:500}}>
          Edit — {midiToName(Math.round(derivedMidi))}
          {staffInf.accidental&&<span style={{color:"#d4882a"}}> {staffInf.accidental}</span>}
        </Typography>
        <Box sx={{display:"flex",gap:0.5}}>
          <Tooltip title="Preview">
            <IconButton size="small" onClick={preview}
              sx={{color:"success.main",border:"1px solid",borderColor:"success.dark"}}>
              <PlayArrowIcon sx={{fontSize:14}}/>
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small"/></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{display:"flex",flexDirection:"column",gap:2,pt:1}}>
        <FormControl size="small" fullWidth>
          <InputLabel sx={{fontSize:"0.75rem"}}>Χορδή</InputLabel>
          <Select value={str} label="Χορδή" onChange={e=>setStr(+e.target.value)} sx={{fontSize:"0.75rem"}}>
            {tuning.strings.map((s,i)=>(
              <MenuItem key={i} value={i} sx={{fontSize:"0.75rem"}}>{i+1}: {s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label="Τάστο" type="number" size="small" value={fret}
          onChange={e=>setFret(Math.max(0,+e.target.value))} inputProps={{min:0,max:24}}
          InputLabelProps={{sx:{fontSize:"0.75rem"}}}
          sx={{"& .MuiInputBase-input":{fontSize:"0.75rem",fontFamily:"Ubuntu Mono,monospace"}}}/>
        {allPos.length>1&&(
          <Box>
            <Typography variant="caption" sx={{color:"text.secondary",display:"block",mb:0.5}}>
              Εναλλακτικές θέσεις
            </Typography>
            <Box sx={{display:"flex",flexWrap:"wrap",gap:0.5}}>
              {allPos.map((p,i)=>(
                <Chip key={i} label={`Τ${p.fret} Χ${p.string+1}`} size="small"
                  onClick={()=>{setStr(p.string);setFret(p.fret);}}
                  variant={p.string===str&&p.fret===fret?"filled":"outlined"}
                  sx={{fontSize:"0.65rem",fontFamily:"Ubuntu Mono,monospace",
                    bgcolor:p.string===str&&p.fret===fret?"primary.main":"transparent",
                    borderColor:"primary.dark",
                    color:p.string===str&&p.fret===fret?"background.default":"primary.main",
                    cursor:"pointer"}}/>
              ))}
            </Box>
          </Box>
        )}
        <Box>
          <Typography variant="caption" sx={{color:"text.secondary",display:"block",mb:0.75}}>Διάρκεια</Typography>
          <Box sx={{display:"flex",gap:0.5,flexWrap:"wrap",mb:1}}>
            {DURATION_OPTIONS.map(d=>{
              const sv=d.value*(60/tempo);
              const active=Math.abs(dur-sv)<0.01;
              return (
                <Box key={d.value} onClick={()=>setDur(sv)} sx={{
                  px:1,py:0.5,borderRadius:1,cursor:"pointer",border:"1px solid",
                  borderColor:active?"primary.main":"divider",
                  bgcolor:active?"rgba(201,169,110,0.12)":"background.default",
                  display:"flex",flexDirection:"column",alignItems:"center",minWidth:42,
                }}>
                  <Typography sx={{fontSize:"1rem",lineHeight:1,color:active?"primary.main":"text.secondary"}}>{d.symbol}</Typography>
                  <Typography sx={{fontSize:"0.55rem",color:active?"primary.main":"text.secondary"}}>{d.label}</Typography>
                </Box>
              );
            })}
          </Box>
          <TextField label="Διάρκεια (s)" type="number" size="small" value={dur.toFixed(3)}
            onChange={e=>setDur(Math.max(0.05,+e.target.value))} inputProps={{min:0.05,max:8,step:0.05}}
            InputLabelProps={{sx:{fontSize:"0.75rem"}}}
            sx={{"& .MuiInputBase-input":{fontSize:"0.75rem"}}}/>
        </Box>
        <FormControl size="small" fullWidth>
          <InputLabel sx={{fontSize:"0.75rem"}}>Στολίδι</InputLabel>
          <Select value={orn} label="Στολίδι" onChange={e=>setOrn(e.target.value)} sx={{fontSize:"0.75rem"}}>
            {Object.entries(ORNAMENTS).map(([k,v])=>(
              <MenuItem key={k} value={k} sx={{fontSize:"0.75rem"}}>{v.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box>
          <Box sx={{display:"flex",justifyContent:"space-between",mb:0.5}}>
            <Typography variant="caption" sx={{color:"text.secondary"}}>Μικροτονική απόκλιση</Typography>
            <Typography variant="caption" sx={{color:"primary.main",fontFamily:"Ubuntu Mono,monospace"}}>
              {mto>0?"+":""}{mto}¢
            </Typography>
          </Box>
          <Slider value={mto} min={-50} max={50} onChange={(_,v)=>setMto(v)} size="small"
            marks={[{value:-50,label:"−50¢"},{value:0,label:"0"},{value:50,label:"+50¢"}]}
            sx={{color:"primary.main","& .MuiSlider-markLabel":{fontSize:"0.6rem"}}}/>
        </Box>
        <Box sx={{bgcolor:"background.default",borderRadius:1,border:"1px solid",borderColor:"divider",p:1}}>
          <Typography variant="caption" sx={{color:"text.secondary",display:"block",mb:0.5}}>Προεπισκόπηση παρτιτούρας</Typography>
          <svg width="100%" height="62" style={{display:"block"}}>
            <rect width="100%" height="62" fill="#0a0805"/>
            {[8,18,28,38,48].map((y,i)=>(
              <line key={i} x1={20} y1={y} x2="100%" y2={y} stroke="rgba(201,169,110,0.2)" strokeWidth={1}/>
            ))}
            {(()=>{
              const y=Math.max(4,Math.min(55,staffPosToY(staffInf.pos,8,10)));
              return <ellipse cx={70} cy={y} rx={7} ry={4.3} fill="#c9a96e" stroke="#e8c87a" strokeWidth={1}/>;
            })()}
            <text x={92} y={32} fontSize="10" fill="#9a8870" fontFamily="Ubuntu,sans-serif">
              {staffInf.letter}{staffInf.accidental}{staffInf.octave}
            </text>
          </svg>
        </Box>
      </DialogContent>
      <DialogActions sx={{px:3,pb:2}}>
        <Button onClick={onClose} size="small" sx={{color:"text.secondary",fontFamily:"Ubuntu,sans-serif"}}>Ακύρωση</Button>
        <Button onClick={apply} variant="contained" size="small"
          sx={{bgcolor:"success.main","&:hover":{bgcolor:"success.dark"},fontFamily:"Ubuntu,sans-serif"}}>
          ✓ Εφαρμογή
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * MaqamTAB Audio Engine — v3
 *
 * Four-layer audio system:
 *
 *  1. CUSTOM SAMPLES — user uploads their own oud recordings (MP3/WAV/OGG)
 *                      Named by note: A2.mp3, Bb2.mp3, B2.mp3 ... or A2.wav etc.
 *                      Also accepts: A-2.mp3, a2.mp3, 57.mp3 (MIDI number)
 *                      Pitch-shifted ±6 semitones from nearest loaded sample.
 *
 *  2. CDN SAMPLES    — gleitz/midi-js-soundfonts banjo bank (plucked strings,
 *                      closest free GM sound to oud). Requires internet.
 *
 *  3. KARPLUS-STRONG — Physical modelling. Very good plucked string offline.
 *
 *  4. SYNTH FALLBACK — Filtered triangle oscillator. Always works.
 *
 * Public API:
 *   loadCustomSamples(fileList)   → Promise<{ loaded, failed, notes }>
 *   clearCustomSamples()
 *   getCustomSamplesInfo()        → { count, notes: string[] }
 *   loadSoundfont(instrument)     → Promise<bool>
 *   isSoundfontReady(instrument)  → bool
 *   playNote(ctx, midi, t, dur, instrument, audioMode)
 *   playScale(scaleNotes, dur, instrument, audioMode) → { ctx, totalDuration }
 *   playSequence(events, instrument, audioMode)       → { ctx }
 */

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTE NAME ↔ MIDI UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

const NOTE_NAMES_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const NOTE_NAMES_FLAT  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];

function midiToName(midi) {
  const oct  = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES_SHARP[midi % 12];
  return `${name}${oct}`;
}

// Parse a filename stem → MIDI note number (or null)
// Supports: A2, Bb3, C#4, Ab2, A-2, a2, 57 (MIDI number), etc.
function parseSampleFilename(stem) {
  const s = stem.trim();

  // Pure MIDI number: "57", "60"
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return n >= 0 && n <= 127 ? n : null;
  }

  // Note name patterns: A2, Bb3, C#4, Ab2, A-2, Db4, F#3
  const m = s.match(/^([A-Ga-g])(#|b|♭)?[-_]?(-?\d)$/);
  if (!m) return null;

  const letter = m[1].toUpperCase();
  const acc    = m[2] || "";
  const oct    = parseInt(m[3], 10);

  let chroma = NOTE_NAMES_SHARP.indexOf(letter);
  if (chroma === -1) return null;

  if (acc === "#") chroma += 1;
  if (acc === "b" || acc === "♭") chroma -= 1;
  chroma = ((chroma % 12) + 12) % 12;

  const midi = (oct + 1) * 12 + chroma;
  return midi >= 0 && midi <= 127 ? midi : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. CUSTOM SAMPLE BANK
// ═══════════════════════════════════════════════════════════════════════════

// Stores decoded AudioBuffers keyed by MIDI integer
const CUSTOM_BANK = new Map();   // midi → AudioBuffer

/**
 * Load user-selected audio files into the custom bank.
 * Accepts File objects (from <input type="file"> or drag-and-drop).
 *
 * Returns { loaded: number, failed: string[], notes: string[] }
 */
export async function loadCustomSamples(fileList) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const files = Array.from(fileList);
  const failed = [];
  const loaded = [];

  await Promise.all(files.map(async (file) => {
    const supported = /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(file.name);
    if (!supported) { failed.push(file.name + " (unsupported format)"); return; }

    // Parse note from filename (strip extension)
    const stem = file.name.replace(/\.[^.]+$/, "");
    const midi = parseSampleFilename(stem);
    if (midi === null) {
      failed.push(file.name + " (cannot parse note name)");
      return;
    }

    try {
      const arrayBuf  = await file.arrayBuffer();
      const audioBuf  = await ctx.decodeAudioData(arrayBuf);
      CUSTOM_BANK.set(midi, audioBuf);
      loaded.push(midiToName(midi));
    } catch (e) {
      failed.push(file.name + " (decode error: " + e.message + ")");
    }
  }));

  // Don't close ctx — keep for future decoding if needed
  return {
    loaded: loaded.length,
    failed,
    notes: [...CUSTOM_BANK.keys()].sort((a,b) => a-b).map(midiToName),
  };
}

export function clearCustomSamples() {
  CUSTOM_BANK.clear();
}

export function getCustomSamplesInfo() {
  const keys = [...CUSTOM_BANK.keys()].sort((a,b) => a-b);
  return {
    count: keys.length,
    notes: keys.map(midiToName),
    ready: keys.length > 0,
  };
}

// Find nearest loaded MIDI note in CUSTOM_BANK within maxDistance semitones
function nearestCustomMidi(targetMidi, maxDistance = 8) {
  if (CUSTOM_BANK.size === 0) return null;
  let best = null, bestDist = Infinity;
  for (const midi of CUSTOM_BANK.keys()) {
    const dist = Math.abs(midi - targetMidi);
    if (dist < bestDist) { bestDist = dist; best = midi; }
  }
  return bestDist <= maxDistance ? best : null;
}

function playCustomNote(ctx, midiFloat, startTime, duration) {
  const nearest = nearestCustomMidi(Math.round(midiFloat));
  if (nearest === null) return false;
  const buf = CUSTOM_BANK.get(nearest);
  if (!buf) return false;

  const playbackRate = Math.pow(2, (midiFloat - nearest) / 12);
  const src  = ctx.createBufferSource();
  const gain = ctx.createGain();
  // Warm EQ for oud
  const lp   = ctx.createBiquadFilter();
  const body = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 5500; lp.Q.value = 0.7;
  body.type = "peaking"; body.frequency.value = 280; body.Q.value = 1.4; body.gain.value = 3.5;

  src.buffer = buf;
  src.playbackRate.value = playbackRate;
  src.loop = false;

  const decayTime = Math.min(duration * 1.5, 5.0);
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(0.82, startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime);

  src.connect(lp); lp.connect(body); body.connect(gain); gain.connect(ctx.destination);
  src.start(startTime);
  src.stop(startTime + decayTime + 0.1);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. CDN SAMPLE BANK (gleitz/midi-js-soundfonts)
// ═══════════════════════════════════════════════════════════════════════════

const CDN_BASE     = "https://gleitz.github.io/midi-js-soundfonts";
const CDN_BANKS    = {
  oud: [
    `${CDN_BASE}/FluidR3_GM/banjo-mp3`,
    `${CDN_BASE}/MusyngKite/acoustic_guitar_nylon-mp3`,
  ],
  saz: [
    `${CDN_BASE}/FluidR3_GM/banjo-mp3`,
    `${CDN_BASE}/MusyngKite/acoustic_guitar_nylon-mp3`,
  ],
};

const CDN_CACHE    = new Map();   // url → AudioBuffer | "loading" | "error"
const CDN_STATE    = {};          // instrument key → { ready, base }

const SHARP_NAMES  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
function midiToCDNName(midi) {
  return `${SHARP_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

async function fetchCDNSample(ctx, base, midi) {
  const url = `${base}/${midiToCDNName(midi)}.mp3`;
  if (CDN_CACHE.get(url) instanceof AudioBuffer) return CDN_CACHE.get(url);
  if (CDN_CACHE.get(url) === "loading") {
    return new Promise(res => {
      const t = setInterval(() => {
        const v = CDN_CACHE.get(url);
        if (v instanceof AudioBuffer) { clearInterval(t); res(v); }
        else if (v === "error")       { clearInterval(t); res(null); }
      }, 60);
    });
  }
  if (CDN_CACHE.get(url) === "error") return null;
  CDN_CACHE.set(url, "loading");
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    const ab  = await r.arrayBuffer();
    const buf = await ctx.decodeAudioData(ab);
    CDN_CACHE.set(url, buf);
    return buf;
  } catch {
    CDN_CACHE.set(url, "error");
    return null;
  }
}

async function preWarmCDN(ctx, instrument) {
  const key   = instrument === "saz" ? "saz" : "oud";
  if (CDN_STATE[key]?.ready) return;
  const banks = CDN_BANKS[key];
  for (const base of banks) {
    const test = await fetchCDNSample(ctx, base, 69); // A4
    if (test) {
      CDN_STATE[key] = { ready: true, base };
      const pre = [36,40,43,45,48,50,52,55,57,60,62,65,67,69,72];
      pre.forEach(m => fetchCDNSample(ctx, base, m));
      return;
    }
  }
  CDN_STATE[key] = { ready: false };
}

function playCDNNote(ctx, instrument, midiFloat, startTime, duration) {
  const key   = instrument === "saz" ? "saz" : "oud";
  const state = CDN_STATE[key];
  if (!state?.ready) return false;

  const midi  = Math.max(24, Math.min(84, Math.round(midiFloat)));
  const url   = `${state.base}/${midiToCDNName(midi)}.mp3`;
  const buf   = CDN_CACHE.get(url);
  if (!(buf instanceof AudioBuffer)) {
    fetchCDNSample(ctx, state.base, midi);
    return false;
  }

  const src  = ctx.createBufferSource();
  const gain = ctx.createGain();
  const lp   = ctx.createBiquadFilter();
  const body = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 5000; lp.Q.value = 0.7;
  body.type = "peaking"; body.frequency.value = 280; body.Q.value = 1.2; body.gain.value = 3;

  src.buffer = buf;
  src.playbackRate.value = Math.pow(2, (midiFloat - midi) / 12);

  const decay = Math.min(duration * 1.4, 4.0);
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(0.75, startTime + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + decay);

  src.connect(lp); lp.connect(body); body.connect(gain); gain.connect(ctx.destination);
  src.start(startTime);
  src.stop(startTime + decay + 0.1);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. KARPLUS-STRONG PHYSICAL MODELLING
// ═══════════════════════════════════════════════════════════════════════════

function playKarplusStrong(ctx, midiFloat, startTime, duration) {
  const freq      = midiToFreq(midiFloat);
  const sr        = ctx.sampleRate;
  const delayLen  = Math.max(2, Math.round(sr / freq));
  const noiseLen  = Math.min(delayLen, Math.round(sr * 0.018));

  const noiseBuf  = ctx.createBuffer(1, noiseLen, sr);
  const nd        = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    nd[i] = (Math.random() * 2 - 1) * 0.5
           + Math.sin((i / noiseLen) * Math.PI) * 0.5;
  }

  const src     = ctx.createBufferSource();
  src.buffer    = noiseBuf;

  const delay   = ctx.createDelay(1.0);
  delay.delayTime.value = delayLen / sr;

  const lp      = ctx.createBiquadFilter();
  lp.type       = "lowpass";
  lp.frequency.value = freq * 3.5;
  lp.Q.value    = 0.5;

  const fb      = ctx.createGain();
  fb.gain.value = 0.995 - (freq / 10000) * 0.05;

  const body    = ctx.createBiquadFilter();
  body.type     = "peaking";
  body.frequency.value = 300;
  body.Q.value  = 1.5;
  body.gain.value = 4;

  const out     = ctx.createGain();
  const totalDecay = Math.min(duration * 1.8, 3.5);
  out.gain.setValueAtTime(0.45, startTime);
  out.gain.exponentialRampToValueAtTime(0.001, startTime + totalDecay);

  src.connect(delay);
  delay.connect(lp);
  lp.connect(fb); fb.connect(delay);
  lp.connect(out); out.connect(body); body.connect(ctx.destination);

  src.start(startTime);
  src.stop(startTime + 0.025);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. SYNTH FALLBACK
// ═══════════════════════════════════════════════════════════════════════════

function playSynthNote(ctx, midiFloat, startTime, duration) {
  const freq  = midiToFreq(midiFloat);
  const decay = Math.min(duration * 0.9, 2.5);
  const osc   = ctx.createOscillator();
  const gain  = ctx.createGain();
  const lp    = ctx.createBiquadFilter();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, startTime);
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(2400, startTime);
  lp.frequency.exponentialRampToValueAtTime(600, startTime + decay);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.3, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + decay);
  osc.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + decay + 0.05);
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

export async function loadSoundfont(instrument = "oud") {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    await preWarmCDN(ctx, instrument);
    const key = instrument === "saz" ? "saz" : "oud";
    return CDN_STATE[key]?.ready === true;
  } catch { return false; }
}

export function isSoundfontReady(instrument = "oud") {
  const key = instrument === "saz" ? "saz" : "oud";
  return CDN_STATE[key]?.ready === true;
}

/**
 * Play a single note.
 *
 * audioMode:
 *   "custom"    → custom samples → karplus fallback
 *   "soundfont" → CDN samples   → karplus fallback
 *   "karplus"   → Karplus-Strong only
 *   "synth"     → triangle oscillator only
 *   "auto"      → custom (if loaded) → CDN (if ready) → karplus
 */
export function playNote(ctx, midiFloat, startTime, duration = 0.5, instrument = "oud", audioMode = "auto") {
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  switch (audioMode) {
    case "synth":
      playSynthNote(ctx, midiFloat, startTime, duration);
      return;

    case "karplus":
      playKarplusStrong(ctx, midiFloat, startTime, duration);
      return;

    case "custom":
      if (playCustomNote(ctx, midiFloat, startTime, duration)) return;
      playKarplusStrong(ctx, midiFloat, startTime, duration);
      return;

    case "soundfont": {
      const key = instrument === "saz" ? "saz" : "oud";
      if (CDN_STATE[key]?.ready) {
        if (playCDNNote(ctx, instrument, midiFloat, startTime, duration)) return;
      } else {
        preWarmCDN(ctx, instrument);
      }
      playKarplusStrong(ctx, midiFloat, startTime, duration);
      return;
    }

    case "auto":
    default: {
      if (CUSTOM_BANK.size > 0) {
        if (playCustomNote(ctx, midiFloat, startTime, duration)) return;
      }
      const key = instrument === "saz" ? "saz" : "oud";
      if (CDN_STATE[key]?.ready) {
        if (playCDNNote(ctx, instrument, midiFloat, startTime, duration)) return;
      }
      playKarplusStrong(ctx, midiFloat, startTime, duration);
    }
  }
}

function makeCtx() {
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  const ctx = new C();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function playSequence(events, instrument = "oud", audioMode = "auto") {
  const ctx = makeCtx();
  if (!ctx) return null;
  const now = ctx.currentTime;
  events.forEach(ev => {
    playNote(ctx, ev.midiFloat ?? ev.midi ?? 60, now + (ev.time ?? 0), ev.duration ?? 0.5, instrument, audioMode);
  });
  return { ctx };
}

export function playScale(scaleNotes, noteDuration = 0.45, instrument = "oud", audioMode = "auto") {
  const ctx = makeCtx();
  if (!ctx) return null;
  const now = ctx.currentTime;
  let t = 0.05;
  scaleNotes.forEach(n => {
    playNote(ctx, n.midiFloat, now + t, noteDuration, instrument, audioMode);
    t += noteDuration;
  });
  return { ctx, totalDuration: t + 0.5 };
}

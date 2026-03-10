/**
 * MaqamTAB Audio Engine
 *
 * Δύο modes:
 *  1. SOUNDFONT  — φορτώνει πραγματικά samples ούτι/σαζ από το CDN του WebAudioFont
 *                  (απαιτεί σύνδεση internet, ~300-600 KB ανά όργανο)
 *  2. SYNTH      — fallback triangle oscillator, δουλεύει πάντα χωρίς network
 *
 * WebAudioFont instrument IDs που χρησιμοποιούμε:
 *   Oud  → 0490_Vintage_Dreams_Waves_sf2 (plucked strings, oud-like)
 *   Saz  → 0250_Vintage_Dreams_Waves_sf2 (sitar-like, closest to saz)
 *
 * API:
 *   playNote(ctx, midiFloat, startTime, duration, instrument?)
 *   playSequence(events, instrument?)  → { ctx, stop() }
 *   playScale(scaleNotes, noteDuration?, instrument?)  → { ctx, stop() }
 *   loadSoundfont(instrument)          → Promise<bool>
 *   isSoundfontReady(instrument)       → bool
 */

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ── Soundfont state ──────────────────────────────────────────────────────────

const SF_CACHE = {};   // instrument → { player, loading, ready }

// WebAudioFont URLs — these are pre-rendered sample banks (one JS file per instrument)
// Each file defines a global variable like window._tone_0490_...
// We use a small "piano-like" and a "plucked string" bank that approximate oud/saz.
const SF_CONFIG = {
  oud: {
    // Acoustic guitar (nylon) — closest broadly available soundfont to oud timbre
    url: "https://surikov.github.io/webaudiofontdata/sound/0250_Aspirin_sf2_file.js",
    varName: "_tone_0250_Aspirin_sf2_file",
  },
  saz: {
    // Sitar — closest available to saz/baglama
    url: "https://surikov.github.io/webaudiofontdata/sound/0490_Aspirin_sf2_file.js",
    varName: "_tone_0490_Aspirin_sf2_file",
  },
};

// Dynamically load a soundfont script
function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = url;
    s.onload  = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/**
 * Pre-load soundfont for an instrument.
 * Returns true if loaded OK, false if failed (will fall back to synth).
 */
export async function loadSoundfont(instrument = "oud") {
  const key = instrument === "saz" ? "saz" : "oud";
  if (SF_CACHE[key]?.ready) return true;
  if (SF_CACHE[key]?.loading) {
    // wait for existing load
    return new Promise(res => {
      const t = setInterval(() => {
        if (SF_CACHE[key]?.ready !== undefined && !SF_CACHE[key]?.loading) {
          clearInterval(t); res(SF_CACHE[key].ready);
        }
      }, 100);
    });
  }
  SF_CACHE[key] = { loading: true, ready: false };
  try {
    const cfg = SF_CONFIG[key];
    await loadScript(cfg.url);
    const fontData = window[cfg.varName];
    if (!fontData) throw new Error("Font var not found: " + cfg.varName);
    SF_CACHE[key] = { loading: false, ready: true, fontData };
    return true;
  } catch (e) {
    console.warn("Soundfont load failed, using synth fallback:", e.message);
    SF_CACHE[key] = { loading: false, ready: false };
    return false;
  }
}

export function isSoundfontReady(instrument = "oud") {
  const key = instrument === "saz" ? "saz" : "oud";
  return SF_CACHE[key]?.ready === true;
}

// ── Soundfont playback ───────────────────────────────────────────────────────

function playSoundfontNote(ctx, fontData, midiNote, startTime, duration, gain = 0.8) {
  const midi = Math.round(midiNote);
  // Find the closest zone in the font
  const zones = fontData.zones || [];
  let zone = zones.find(z => z.keyRangeLow <= midi && z.keyRangeHigh >= midi);
  if (!zone) zone = zones.reduce((best, z) => {
    const d = Math.min(Math.abs(z.keyRangeLow - midi), Math.abs(z.keyRangeHigh - midi));
    const bd = Math.min(Math.abs(best.keyRangeLow - midi), Math.abs(best.keyRangeHigh - midi));
    return d < bd ? z : best;
  }, zones[0]);
  if (!zone) return;

  const buf = zone.buffer || (() => {
    // decode on first use
    const pcm = zone.sample;
    const ab = ctx.createBuffer(1, pcm.length, zone.sampleRate || 44100);
    ab.getChannelData(0).set(Float32Array.from(pcm, v => v / 32768));
    zone.buffer = ab;
    return ab;
  })();

  const src  = ctx.createBufferSource();
  const gn   = ctx.createGain();
  src.buffer = buf;
  // Pitch-shift: root note of the zone vs target midi
  const rootNote = zone.rootNote || (zone.keyRangeLow + zone.keyRangeHigh) / 2;
  src.playbackRate.value = Math.pow(2, (midiNote - rootNote) / 12);
  src.loop = false;

  const decay = Math.min(duration * 0.9, 3.0);
  gn.gain.setValueAtTime(gain, startTime);
  gn.gain.exponentialRampToValueAtTime(0.001, startTime + decay);

  src.connect(gn);
  gn.connect(ctx.destination);
  src.start(startTime);
  src.stop(startTime + decay + 0.05);
}

// ── Synth fallback ───────────────────────────────────────────────────────────

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

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Play a single note.
 * @param {AudioContext} ctx
 * @param {number} midiFloat
 * @param {number} startTime
 * @param {number} duration
 * @param {string} instrument  "oud" | "saz"
 * @param {string} audioMode   "soundfont" | "synth" (default: auto)
 */
export function playNote(ctx, midiFloat, startTime, duration = 0.5, instrument = "oud", audioMode = "auto") {
  if (!ctx) return;
  const key = instrument === "saz" ? "saz" : "oud";
  const useSf = audioMode !== "synth" && SF_CACHE[key]?.ready && SF_CACHE[key]?.fontData;
  if (useSf) {
    playSoundfontNote(ctx, SF_CACHE[key].fontData, midiFloat, startTime, duration);
  } else {
    playSynthNote(ctx, midiFloat, startTime, duration);
  }
}

function makeContext() {
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  const ctx = new C();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/**
 * Play a sequence of note events.
 * events: [{ midiFloat, time, duration }]
 */
export function playSequence(events, instrument = "oud", audioMode = "auto") {
  const ctx = makeContext();
  if (!ctx) return null;
  const now = ctx.currentTime;
  events.forEach(ev => {
    playNote(ctx, ev.midiFloat ?? ev.midi ?? 60, now + (ev.time ?? 0), ev.duration ?? 0.5, instrument, audioMode);
  });
  return { ctx };
}

/**
 * Play a maqam scale ascending.
 * scaleNotes: [{ midiFloat }]
 */
export function playScale(scaleNotes, noteDuration = 0.45, instrument = "oud", audioMode = "auto") {
  const ctx = makeContext();
  if (!ctx) return null;
  const now = ctx.currentTime;
  let t = 0.05;
  scaleNotes.forEach(note => {
    playNote(ctx, note.midiFloat, now + t, noteDuration, instrument, audioMode);
    t += noteDuration;
  });
  return { ctx };
}

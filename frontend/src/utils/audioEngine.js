/**
 * MaqamTAB Audio Engine — clean pluck synthesizer
 * Simple attack-decay envelope on a filtered oscillator.
 * Reliable across all browsers without physical modelling artifacts.
 */

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Play a single plucked note.
 * @param {AudioContext} ctx
 * @param {number} midiFloat - MIDI with microtonal fraction
 * @param {number} startTime - AudioContext time
 * @param {number} duration  - note duration in seconds
 */
export function playNote(ctx, midiFloat, startTime, duration) {
  if (!ctx) return;
  const freq = midiToFreq(midiFloat);
  const decay = Math.min(duration * 0.9, 2.5);

  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  const lp   = ctx.createBiquadFilter();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, startTime);

  lp.type = "lowpass";
  lp.frequency.setValueAtTime(2400, startTime);
  lp.frequency.exponentialRampToValueAtTime(600, startTime + decay);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.3, startTime + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + decay);

  osc.connect(lp);
  lp.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + decay + 0.05);
}

/**
 * Play an array of note events sequentially.
 * Each event: { midiFloat, time, duration }
 * Returns { ctx, totalDuration }
 */
export function playSequence(events) {
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  const ctx = new C();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  let maxEnd = 0;
  events.forEach(ev => {
    playNote(ctx, ev.midiFloat ?? ev.midi ?? 60, now + (ev.time ?? 0), ev.duration ?? 0.5);
    maxEnd = Math.max(maxEnd, (ev.time ?? 0) + (ev.duration ?? 0.5) + 2.5);
  });
  return { ctx, totalDuration: maxEnd };
}

/**
 * Play a maqam scale ascending.
 * @param {Array}  scaleNotes  - array of { midiFloat } objects
 * @param {number} noteDuration - seconds per note
 */
export function playScale(scaleNotes, noteDuration = 0.45) {
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  const ctx = new C();
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  let t = 0.05;
  scaleNotes.forEach(note => {
    playNote(ctx, note.midiFloat, now + t, noteDuration);
    t += noteDuration;
  });
  return { ctx, totalDuration: t + 0.2 };
}

// Seyir-aware Maqam Detection
// Uses both pitch-class histogram AND melodic contour/direction analysis

import { MAQAMAT, SEYIR_PATTERNS, pitchClassMatch } from "./maqamat.js";

/**
 * Detect maqam from a sequence of notes
 * @param {Array} notes - [{midi, time, duration, frequency}]
 * @param {number} rootHint - optional MIDI root hint (from lowest note or known tonic)
 * @returns {object} - {name, confidence, seyirDirection, seyirPath, scores}
 */
export function detectMaqam(notes, rootHint = null) {
  if (!notes || notes.length < 4) return null;

  // 1. Build pitch class histogram (microtonal, per 10-cent bins)
  const histogram = buildMicrotonalHistogram(notes);

  // 2. Analyze seyir (melodic direction/journey)
  const seyirAnalysis = analyzeSeyir(notes);

  // 3. Try each possible root
  const candidates = [];
  const possibleRoots = rootHint !== null
    ? [rootHint % 12]
    : getPossibleRoots(notes);

  for (const root of possibleRoots) {
    for (const [maqamKey, maqam] of Object.entries(MAQAMAT)) {
      const score = scoreMaqam(maqam, histogram, seyirAnalysis, root, notes);
      candidates.push({
        key: maqamKey,
        maqam,
        root,
        score,
        seyirMatch: score.seyirScore,
      });
    }
  }

  // Sort by total score
  candidates.sort((a, b) => b.score.total - a.score.total);

  if (candidates.length === 0) return null;

  const best = candidates[0];
  const confidence = Math.min(0.99, best.score.total / 100);

  return {
    key: best.key,
    name: best.maqam.name,
    name: best.maqam.name,
    description: best.maqam.description,
    root: best.root,
    confidence,
    intervals: best.maqam.intervals,
    seyirDirection: best.maqam.seyir.type,
    seyirPath: seyirAnalysis.contour,
    top3: candidates.slice(0, 3).map(c => ({
      name: c.maqam.name,
      confidence: Math.min(0.99, c.score.total / 100),
    })),
  };
}

/**
 * Build microtonal pitch-class histogram
 * Bins every 10 cents (120 bins per octave)
 */
function buildMicrotonalHistogram(notes) {
  const bins = new Array(120).fill(0);
  const totalDuration = notes.reduce((s, n) => s + (n.duration || 0.1), 0);

  for (const note of notes) {
    // Convert MIDI to pitch class in cents (0-1200)
    const centsInOctave = ((note.midi % 12) * 100 + ((note.midi % 1) * 100)) % 1200;
    const binIdx = Math.round(centsInOctave / 10) % 120;
    const weight = (note.duration || 0.1) / totalDuration;
    bins[binIdx] += weight;

    // Add small gaussian spread for microtonal uncertainty
    for (let d = 1; d <= 2; d++) {
      const spread = weight * 0.3 * (1 / d);
      bins[(binIdx + d) % 120] += spread;
      bins[(binIdx - d + 120) % 120] += spread;
    }
  }

  // Normalize
  const max = Math.max(...bins, 0.001);
  return bins.map(b => b / max);
}

/**
 * Analyze melodic seyir (contour, register usage, direction)
 */
function analyzeSeyir(notes) {
  if (notes.length < 2) return { type: "ascending", contour: [], score: {} };

  const times = notes.map(n => n.time);
  const pitches = notes.map(n => n.midi);
  const durations = notes.map(n => n.duration || 0.1);
  const totalDur = durations.reduce((a, b) => a + b, 0);

  const minPitch = Math.min(...pitches);
  const maxPitch = Math.max(...pitches);
  const range = maxPitch - minPitch;

  if (range === 0) return { type: "mixed", contour: [], score: { ascending: 0.33, descending: 0.33, mixed: 0.34 } };

  // Normalize pitches to 0-1
  const normPitches = pitches.map(p => (p - minPitch) / range);

  // Split melody into thirds of total duration
  const third = totalDur / 3;
  let t = 0;
  const thirds = [[], [], []];
  for (let i = 0; i < notes.length; i++) {
    const d = durations[i];
    const section = Math.min(2, Math.floor(t / third));
    thirds[section].push(normPitches[i]);
    t += d;
  }

  const avgThird = thirds.map(arr =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0.5
  );

  // Build contour
  const contour = [];
  for (let i = 1; i < normPitches.length; i++) {
    const diff = normPitches[i] - normPitches[i - 1];
    if (Math.abs(diff) < 0.05) contour.push(0);
    else if (diff > 0) contour.push(1);
    else contour.push(-1);
  }

  // Seyir type scoring
  const ascending = Math.max(0,
    (avgThird[0] < 0.4 ? 1 : 0) * 2 +  // starts low
    (avgThird[2] > 0.5 ? 1 : 0) * 1.5 + // peaks late
    (contour.filter(x => x === 1).length / contour.length) * 1
  );

  const descending = Math.max(0,
    (avgThird[0] > 0.6 ? 1 : 0) * 2 +   // starts high
    (avgThird[2] < 0.4 ? 1 : 0) * 1.5 + // resolves low
    (contour.filter(x => x === -1).length / contour.length) * 1
  );

  const mixed = Math.max(0,
    (Math.abs(avgThird[0] - avgThird[2]) < 0.2 ? 1 : 0) * 2 + // similar start/end
    (avgThird[1] > avgThird[0] && avgThird[1] > avgThird[2] ? 1 : 0) * 1.5 // arch shape
  );

  const total = ascending + descending + mixed + 0.001;

  // Register usage - where does the melody spend most time?
  const lowerDensity = normPitches.filter(p => p < 0.33).length / normPitches.length;
  const midDensity = normPitches.filter(p => p >= 0.33 && p < 0.67).length / normPitches.length;
  const upperDensity = normPitches.filter(p => p >= 0.67).length / normPitches.length;

  // Dominant pitch region (weighted average around modal density peaks)
  let dominantCents = 0;
  if (notes.length > 0) {
    let sumCentsWeight = 0;
    let sumWeight = 0;
    for (const n of notes) {
      const cents = ((n.midi % 12) * 100) % 1200;
      const w = n.duration || 0.1;
      sumCentsWeight += cents * w;
      sumWeight += w;
    }
    dominantCents = sumCentsWeight / sumWeight;
  }

  return {
    type: ascending > descending && ascending > mixed ? "ascending" :
          descending > ascending && descending > mixed ? "descending" : "mixed",
    contour,
    avgThird,
    lowerDensity,
    midDensity,
    upperDensity,
    dominantCents,
    score: {
      ascending: ascending / total,
      descending: descending / total,
      mixed: mixed / total,
    },
  };
}

/**
 * Score a maqam against the observed material
 */
function scoreMaqam(maqam, histogram, seyirAnalysis, root, notes) {
  const rootCents = (root * 100) % 1200;

  // 1. Pitch class match score (0-50)
  let pcScore = 0;
  for (const interval of maqam.intervals) {
    const targetBin = Math.round(((rootCents + interval) % 1200) / 10) % 120;
    // Check nearby bins (±2 = ±20 cents tolerance)
    let best = 0;
    for (let d = -2; d <= 2; d++) {
      const bin = (targetBin + d + 120) % 120;
      best = Math.max(best, histogram[bin]);
    }
    pcScore += best;
  }
  pcScore = (pcScore / maqam.intervals.length) * 50;

  // 2. Characteristic interval bonus (0-20)
  let charScore = 0;
  for (const charInterval of maqam.characteristic) {
    const targetBin = Math.round(((rootCents + charInterval) % 1200) / 10) % 120;
    let present = 0;
    for (let d = -2; d <= 2; d++) {
      const bin = (targetBin + d + 120) % 120;
      present = Math.max(present, histogram[bin]);
    }
    charScore += present * 2;
  }
  charScore = Math.min(20, charScore * (20 / (maqam.characteristic.length * 2)));

  // 3. Non-scale pitch penalty (0 to -10)
  let penalty = 0;
  const scaleSet = new Set(maqam.intervals.map(i => Math.round(((rootCents + i) % 1200) / 10)));
  for (let bin = 0; bin < 120; bin++) {
    if (histogram[bin] > 0.1) {
      let inScale = false;
      for (let d = -2; d <= 2; d++) {
        if (scaleSet.has((bin + d + 120) % 120)) { inScale = true; break; }
      }
      if (!inScale) penalty += histogram[bin] * 5;
    }
  }
  penalty = Math.min(10, penalty);

  // 4. Seyir match score (0-20)
  let seyirScore = 0;
  const mSeyir = maqam.seyir.type;
  const oSeyir = seyirAnalysis.type;

  if (mSeyir === oSeyir) seyirScore = 20;
  else if (mSeyir === "mixed" || oSeyir === "mixed") seyirScore = 10;
  else seyirScore = 5;

  // Bonus for matching register/dominant
  if (maqam.seyir.dominantRegion) {
    const [lo, hi] = maqam.seyir.dominantRegion;
    const observedDom = ((seyirAnalysis.dominantCents - rootCents + 1200) % 1200);
    if (observedDom >= lo - 50 && observedDom <= hi + 50) seyirScore += 5;
  }

  // Bonus for start register matching
  if (maqam.seyir.start === "lower" && seyirAnalysis.avgThird[0] < 0.4) seyirScore += 3;
  if (maqam.seyir.start === "upper" && seyirAnalysis.avgThird[0] > 0.6) seyirScore += 3;

  const total = Math.max(0, pcScore + charScore - penalty + seyirScore);

  return { total, pcScore, charScore, penalty, seyirScore };
}

/**
 * Find most likely roots from note distribution
 */
function getPossibleRoots(notes) {
  // Low notes weighted more as likely tonics
  const pitchWeights = {};
  for (const note of notes) {
    const pc = Math.round(note.midi) % 12;
    const weight = note.duration || 0.1;
    pitchWeights[pc] = (pitchWeights[pc] || 0) + weight;

    // First and last notes bonus
    if (notes.indexOf(note) === 0 || notes.indexOf(note) === notes.length - 1) {
      pitchWeights[pc] = (pitchWeights[pc] || 0) + weight * 2;
    }
  }

  return Object.entries(pitchWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([pc]) => parseInt(pc));
}

/**
 * Quantize note timings
 * @param {Array} notes
 * @param {number} tempo - BPM
 * @param {string} grid - "1/4", "1/8", "1/16", "1/32"
 */
export function quantizeNotes(notes, tempo, grid) {
  const beatDuration = 60 / tempo;
  const gridValues = {
    "1/4": beatDuration,
    "1/8": beatDuration / 2,
    "1/16": beatDuration / 4,
    "1/32": beatDuration / 8,
  };
  const gridDur = gridValues[grid] || beatDuration / 2;

  return notes.map(note => ({
    ...note,
    time: Math.round(note.time / gridDur) * gridDur,
    duration: Math.max(gridDur * 0.5, Math.round(note.duration / gridDur) * gridDur),
  }));
}

/**
 * Advanced onset detection from audio data
 * @param {Float32Array} audioData - raw audio samples
 * @param {number} sampleRate
 * @returns {Array} onsets in seconds
 */
export function detectOnsets(audioData, sampleRate) {
  const frameSize = 1024;
  const hopSize = 256;
  const onsets = [];

  let prevSpectralFlux = 0;
  const fluxHistory = [];

  for (let i = 0; i + frameSize < audioData.length; i += hopSize) {
    const frame = audioData.slice(i, i + frameSize);

    // Compute spectral flux (simplified)
    let flux = 0;
    for (let j = 1; j < frame.length; j++) {
      const diff = Math.abs(frame[j]) - Math.abs(frame[j - 1]);
      flux += Math.max(0, diff);
    }
    flux /= frameSize;

    fluxHistory.push(flux);

    // Detect peak in flux
    if (fluxHistory.length > 10) {
      const recent = fluxHistory.slice(-10);
      const mean = recent.reduce((a, b) => a + b) / recent.length;
      const threshold = mean * 1.5;

      if (flux > threshold && flux > prevSpectralFlux) {
        const time = i / sampleRate;
        if (onsets.length === 0 || time - onsets[onsets.length - 1] > 0.05) {
          onsets.push(time);
        }
      }
    }
    prevSpectralFlux = flux;
  }

  return onsets;
}

/**
 * Pitch detection using autocorrelation (YIN algorithm simplified)
 */
export function detectPitch(frame, sampleRate) {
  const minPeriod = Math.floor(sampleRate / 2000); // ~2000 Hz max
  const maxPeriod = Math.floor(sampleRate / 50);   // ~50 Hz min

  // Compute difference function
  const d = new Float32Array(maxPeriod);
  for (let tau = 0; tau < maxPeriod; tau++) {
    let sum = 0;
    for (let j = 0; j + tau < frame.length; j++) {
      const diff = frame[j] - frame[j + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }

  // Cumulative mean normalized difference
  const cmnd = new Float32Array(maxPeriod);
  cmnd[0] = 1;
  let sum = 0;
  for (let tau = 1; tau < maxPeriod; tau++) {
    sum += d[tau];
    cmnd[tau] = tau * d[tau] / (sum || 0.001);
  }

  // Find first minimum below threshold
  const threshold = 0.1;
  for (let tau = minPeriod; tau < maxPeriod; tau++) {
    if (cmnd[tau] < threshold) {
      // Parabolic interpolation for better accuracy
      if (tau > 0 && tau < maxPeriod - 1) {
        const s0 = cmnd[tau - 1], s1 = cmnd[tau], s2 = cmnd[tau + 1];
        const adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0));
        const betterTau = tau + adjustment;
        return sampleRate / betterTau;
      }
      return sampleRate / tau;
    }
  }

  return null;
}

import { midiToFrequency, midiToNote } from "../pitch-analysis.js";

const PRESETS = {
  gentle: { acquireClarity: 0.76, sustainClarity: 0.6, dropoutGraceMs: 220 },
  balanced: { acquireClarity: 0.84, sustainClarity: 0.68, dropoutGraceMs: 150 },
  exact: { acquireClarity: 0.89, sustainClarity: 0.76, dropoutGraceMs: 90 },
};

export function createPitchStabilizer({ stability = 0.7, assist = "gentle" } = {}) {
  let amount = clamp(stability, 0, 1);
  let preset = PRESETS[assist] || PRESETS.gentle;
  let history = [];
  let smoothedMidi = null;
  let lastPitchedAt = -Infinity;
  let lastUpdateAt = null;
  let lastFrame = null;
  let voiced = false;
  let acquireFrames = 0;
  let pendingJump = null;

  function reset() {
    history = [];
    smoothedMidi = null;
    lastPitchedAt = -Infinity;
    lastUpdateAt = null;
    lastFrame = null;
    voiced = false;
    acquireFrames = 0;
    pendingJump = null;
  }

  function setStability(next) {
    amount = clamp(next, 0, 1);
  }

  function setAssist(next) {
    preset = PRESETS[next] || PRESETS.gentle;
    acquireFrames = 0;
  }

  function push(frame, atMs = performance.now()) {
    const clarityFloor = voiced ? preset.sustainClarity : preset.acquireClarity;
    if (!Number.isFinite(frame?.midi) || frame.clarity < clarityFloor) {
      acquireFrames = 0;
      if (atMs - lastPitchedAt <= preset.dropoutGraceMs) return lastFrame;
      voiced = false;
      return null;
    }

    if (!voiced) {
      acquireFrames += 1;
      if (acquireFrames < 2) return null;
      voiced = true;
    }

    const candidate = stabilizeOctave(frame.midi, frame.clarity, atMs);
    history.push({ atMs, midi: candidate });
    const historyMs = 45 + amount * 85;
    history = history.filter((sample) => atMs - sample.atMs <= historyMs).slice(-7);
    const medianMidi = median(history.map((sample) => sample.midi));
    const deltaMs = lastUpdateAt === null ? 1000 : Math.max(1, atMs - lastUpdateAt);
    const timeConstantMs = 30 + amount * 80;
    const alpha = 1 - Math.exp(-deltaMs / timeConstantMs);
    smoothedMidi = smoothedMidi === null ? medianMidi : smoothedMidi + (medianMidi - smoothedMidi) * alpha;
    lastPitchedAt = atMs;
    lastUpdateAt = atMs;
    lastFrame = {
      ...frame,
      rawMidi: frame.midi,
      midi: smoothedMidi,
      frequency: midiToFrequency(smoothedMidi),
      note: midiToNote(smoothedMidi),
      stabilized: true,
    };
    return lastFrame;
  }

  function stabilizeOctave(midi, clarity, atMs) {
    if (!Number.isFinite(smoothedMidi) || Math.abs(midi - smoothedMidi) <= 7) {
      pendingJump = null;
      return midi;
    }
    const candidates = [midi - 24, midi - 12, midi + 12, midi + 24];
    const corrected = candidates.reduce((best, value) =>
      Math.abs(value - smoothedMidi) < Math.abs(best - smoothedMidi) ? value : best,
    );
    if (Math.abs(corrected - smoothedMidi) <= 2) return corrected;

    const consistent = pendingJump && Math.abs(pendingJump.midi - midi) <= 1 && atMs - pendingJump.startedAt <= 150;
    pendingJump = consistent
      ? { ...pendingJump, count: pendingJump.count + 1 }
      : { midi, count: 1, startedAt: atMs };
    if (pendingJump.count >= 3 && clarity >= 0.88) {
      pendingJump = null;
      history = [];
      return midi;
    }
    return smoothedMidi;
  }

  return { push, reset, setAssist, setStability };
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

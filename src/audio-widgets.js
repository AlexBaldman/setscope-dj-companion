import { midiToFrequency, midiToNote } from "./pitch-analysis.js";

export const tunerPresets = {
  chromatic: {
    label: "Chromatic",
    targets: [48, 57, 64, 69],
  },
  guitar: {
    label: "Guitar",
    targets: [40, 45, 50, 55, 59, 64],
  },
  bass: {
    label: "Bass",
    targets: [28, 33, 38, 43],
  },
  voice: {
    label: "Voice",
    targets: [48, 52, 55, 57, 60, 64, 67, 69],
  },
};

export function centsFromMidiTarget(midi, targetMidi) {
  return (midi - targetMidi) * 100;
}

export function formatTarget(midi) {
  return {
    frequency: midiToFrequency(midi),
    label: midiToNote(midi),
    midi,
  };
}

export function analyzeLevel(buffer, gain = 1) {
  if (!buffer?.length) return { rms: 0, peak: 0 };
  let sum = 0;
  let peak = 0;
  for (const sample of buffer) {
    const value = Math.max(-1, Math.min(1, sample * gain));
    sum += value * value;
    peak = Math.max(peak, Math.abs(value));
  }
  return {
    rms: Math.sqrt(sum / buffer.length),
    peak,
  };
}

export function findZeroCrossingIndex(buffer, threshold = 0.012) {
  if (!buffer?.length) return 0;
  for (let index = 1; index < buffer.length; index += 1) {
    if (buffer[index - 1] < 0 && buffer[index] >= 0 && Math.abs(buffer[index]) >= threshold) {
      return index;
    }
  }
  return 0;
}

export function loadPracticeStats(storageKey, now = new Date()) {
  const dayKey = toDayKey(now);
  const fallback = { dayKey, dailyLocks: 0, streak: 0, lastLockedAt: null };
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (!parsed) return fallback;
    return {
      ...fallback,
      ...parsed,
      dailyLocks: parsed.dayKey === dayKey ? Number(parsed.dailyLocks) || 0 : 0,
      dayKey,
      streak: Number(parsed.streak) || 0,
    };
  } catch {
    return fallback;
  }
}

export function savePracticeStats(storageKey, stats) {
  localStorage.setItem(storageKey, JSON.stringify(stats));
}

function toDayKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

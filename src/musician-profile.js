import { createMusicianProfile } from "./contracts/musician-profile.js";

export const MUSICIAN_PROFILE_STORAGE_KEY = "setscope-musician-profile-v1";

export const practiceStages = Object.freeze([
  "calibrate",
  "hear",
  "predict",
  "perform",
  "diagnose",
  "prescribe",
  "transfer",
]);

const INTERVAL_NAMES = Object.freeze({
  0: "Unison",
  1: "Minor 2nd",
  2: "Major 2nd",
  3: "Minor 3rd",
  4: "Major 3rd",
  5: "Perfect 4th",
  6: "Tritone",
  7: "Perfect 5th",
  8: "Minor 6th",
  9: "Major 6th",
  10: "Minor 7th",
  11: "Major 7th",
  12: "Octave",
});

export function loadMusicianProfile(storage = localStorage) {
  try {
    const stored = JSON.parse(storage.getItem(MUSICIAN_PROFILE_STORAGE_KEY) || "null");
    if (stored) return createMusicianProfile(stored);
  } catch {
    // Fall through to the legacy profile migration.
  }
  return migrateLegacyPitchProfile(storage);
}

export function saveMusicianProfile(profile, storage = localStorage) {
  const normalized = createMusicianProfile(profile);
  storage.setItem(MUSICIAN_PROFILE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function calibrateMusicianProfile(profile, frame, { sourceLabel = "unknown", now = new Date() } = {}) {
  if (!Number.isFinite(frame?.midi) || !Number.isFinite(frame?.clarity) || frame.clarity < 0.5) {
    throw new Error("stable_pitch_required");
  }
  const centerMidi = Math.max(36, Math.min(76, Math.round(frame.midi)));
  return createMusicianProfile({
    ...profile,
    revision: Number(profile?.revision || 0) + 1,
    centerMidi,
    lowMidi: centerMidi - 5,
    highMidi: centerMidi + 5,
    detector: {
      stability: profile?.detector?.stability ?? 0.7,
      clarityFloor: Math.max(0.5, Math.min(0.9, frame.clarity - 0.12)),
    },
    calibration: {
      status: "calibrated",
      sourceLabel,
      sampleCount: 1,
      meanClarity: frame.clarity,
      updatedAt: now,
      method: "stable-center",
      rangeStatus: "estimated",
      boundaries: {
        low: { confirmed: false, midi: centerMidi - 5, confirmationCount: 0, confidence: 0, samples: [] },
        high: { confirmed: false, midi: centerMidi + 5, confirmationCount: 0, confidence: 0, samples: [] },
      },
    },
  });
}

export function confirmMusicianBoundary(profile, boundary, frame, { now = new Date() } = {}) {
  if (profile.calibration.status !== "calibrated") throw new Error("center_calibration_required");
  if (!["low", "high"].includes(boundary)) throw new Error("invalid_boundary");
  if (!Number.isFinite(frame?.midi) || !Number.isFinite(frame?.clarity) || frame.clarity < profile.detector.clarityFloor) {
    throw new Error("stable_pitch_required");
  }
  const midi = Math.round(frame.midi);
  const distance = midi - profile.centerMidi;
  if (boundary === "low" && (distance > -2 || distance < -18)) throw new Error("low_boundary_out_of_range");
  if (boundary === "high" && (distance < 2 || distance > 18)) throw new Error("high_boundary_out_of_range");
  const previous = profile.calibration.boundaries[boundary];
  const capturedAt = new Date(now).toISOString();
  const samples = [
    ...(previous.samples || []),
    { midi: frame.midi, clarity: frame.clarity, capturedAt },
  ].slice(-5);
  const sampleMidis = samples.map((sample) => sample.midi).sort((left, right) => left - right);
  const medianMidi = Math.round(sampleMidis[Math.floor(sampleMidis.length / 2)]);
  const spread = sampleMidis.at(-1) - sampleMidis[0];
  const confirmationCount = Number(previous.confirmationCount || 0) + 1;
  const meanClarity = samples.reduce((total, sample) => total + sample.clarity, 0) / samples.length;
  const consistency = Math.max(0, 1 - spread / 3);
  const confidence = Math.min(1, confirmationCount / 3 * 0.6 + meanClarity * 0.25 + consistency * 0.15);
  const boundaries = {
    ...profile.calibration.boundaries,
    [boundary]: {
      confirmed: confirmationCount >= 2 && spread <= 2,
      midi: medianMidi,
      clarity: meanClarity,
      confidence,
      confirmationCount,
      samples,
      updatedAt: now,
    },
  };
  return createMusicianProfile({
    ...profile,
    revision: Number(profile.revision || 0) + 1,
    lowMidi: boundary === "low" ? medianMidi : profile.lowMidi,
    highMidi: boundary === "high" ? medianMidi : profile.highMidi,
    calibration: {
      ...profile.calibration,
      boundaries,
      rangeStatus: boundaries.low.confirmed && boundaries.high.confirmed ? "confirmed" : "estimated",
      updatedAt: now,
    },
  });
}

export function updateMusicianStability(profile, stability) {
  return createMusicianProfile({
    ...profile,
    revision: Number(profile.revision || 0) + 1,
    detector: { ...profile.detector, stability },
  });
}

export function recordPracticeResult(profile, {
  accuracy,
  centerMidi = profile.centerMidi,
  diagnosis,
  intervalResults = [],
  eligibleForMastery = true,
  modeId,
  stableLock = false,
  now = new Date(),
} = {}) {
  if (!eligibleForMastery) return createMusicianProfile(profile);
  return createMusicianProfile({
    ...profile,
    revision: Number(profile.revision || 0) + 1,
    practice: {
      ...profile.practice,
      sessions: profile.practice.sessions + 1,
      stableLocks: profile.practice.stableLocks + (stableLock ? 1 : 0),
      lastAccuracy: Number.isFinite(accuracy) ? accuracy : profile.practice.lastAccuracy,
      lastMode: modeId || profile.practice.lastMode,
      lastPracticedAt: now,
      lastDiagnosis: diagnosis || profile.practice.lastDiagnosis,
      intervalHistory: recordIntervalHistory(profile.practice.intervalHistory, intervalResults, centerMidi, now),
    },
  });
}

export function createPracticePrescription(profile) {
  if (profile.calibration.status !== "calibrated") {
    return prescription("calibrate", "Find your center", "Choose an input, hold one easy note, then calibrate.");
  }
  if (profile.calibration.rangeStatus !== "confirmed") {
    return prescription("calibrate", "Confirm your span", "In Audio Lab, save one comfortable low and high note. Stop if either feels strained.");
  }
  if (profile.practice.stableLocks === 0) {
    return prescription("hear", "Hear the center", "Play or sing the center note, then hold it in Audio Lab.");
  }
  if (profile.practice.sessions < 2) {
    return prescription("predict", "Name the landing", "Hear the target internally before making the sound.");
  }
  if (profile.practice.lastAccuracy === null) {
    return prescription("perform", "Make a first pass", "Run an easy round inside your calibrated range.");
  }
  if (profile.practice.lastAccuracy < 60) {
    const direction = profile.practice.lastDiagnosis.code;
    const detail = direction === "high"
      ? "Most voiced misses landed high. Approach the target from below at Gentle speed."
      : direction === "low"
        ? "Most voiced misses landed low. Support the note, then approach from above."
        : direction === "silent"
          ? "The detector lost the note. Use a steadier source and check input level."
          : "Use Gentle assist and compare each landing against the center line.";
    return prescription("diagnose", "Slow the motion", detail);
  }
  if (profile.practice.lastAccuracy < 82) {
    const mission = createIntervalMission(profile);
    return prescription("prescribe", `Repeat ${mission.shortLabel}`, mission.detail);
  }
  const mission = createIntervalMission(profile);
  if (mission.attempts < 5 || mission.mastery < 72) {
    return prescription("prescribe", `Build ${mission.shortLabel}`, mission.detail);
  }
  return prescription("transfer", "Bring it to music", "Use the calibrated range with a track, instrument, or set mission.");
}

export function createIntervalMission(profile, { drill = "adaptive" } = {}) {
  const history = profile.practice.intervalHistory || {};
  const preferred = drill === "steps"
    ? 2
    : drill === "leaps"
      ? 5
      : chooseWeakInterval(history);
  const direction = preferred < 0 ? "down" : preferred > 0 ? "up" : "hold";
  const semitones = Math.abs(preferred);
  const stat = history[String(preferred)] || emptyIntervalStat();
  const mastery = intervalMastery(stat);
  const shortLabel = intervalShortLabel(preferred);
  const detail = stat.attempts
    ? `${intervalName(preferred)} ${direction}; ${mastery}% mastery from ${stat.attempts} landings. Hear it first, then sing it.`
    : `${intervalName(preferred)} ${direction}. Hear the distance from center, predict the landing, then sing it.`;
  return {
    interval: preferred,
    semitones,
    direction,
    name: intervalName(preferred),
    shortLabel,
    attempts: stat.attempts,
    mastery,
    confidence: Math.min(100, Math.round(stat.attempts / 6 * 100)),
    detail,
  };
}

export function intervalHistorySummary(profile, limit = 6) {
  return Object.entries(profile.practice.intervalHistory || {})
    .map(([interval, stat]) => ({
      interval: Number(interval),
      label: intervalShortLabel(Number(interval)),
      name: intervalName(Number(interval)),
      attempts: stat.attempts,
      mastery: intervalMastery(stat),
      biasCents: Math.round(stat.biasCents),
    }))
    .sort((left, right) => right.attempts - left.attempts || left.mastery - right.mastery)
    .slice(0, Math.max(1, limit));
}

export function intervalMastery(stat = {}) {
  const attempts = Number(stat.attempts || 0);
  if (!attempts) return 0;
  const accuracy = (Number(stat.hits || 0) + Number(stat.near || 0) * 0.5) / attempts;
  const precision = Math.max(0, 1 - Number(stat.meanAbsCents || 0) / 200);
  const confidence = Math.min(1, attempts / 6);
  return Math.round((accuracy * 0.68 + precision * 0.32) * confidence * 100);
}

export function intervalName(interval) {
  return INTERVAL_NAMES[Math.abs(Number(interval) || 0)] || `${Math.abs(Number(interval) || 0)} semitones`;
}

export function intervalShortLabel(interval) {
  const value = Number(interval) || 0;
  if (value === 0) return "P1";
  const labels = ["P1", "m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7", "P8"];
  return `${value > 0 ? "↑" : "↓"}${labels[Math.abs(value)] || Math.abs(value)}`;
}

export function musicianProfileTargets(profile) {
  const values = [
    profile.lowMidi,
    Math.round((profile.lowMidi + profile.centerMidi) / 2),
    profile.centerMidi,
    Math.round((profile.centerMidi + profile.highMidi) / 2),
    profile.highMidi,
  ];
  return [...new Set(values.map((value) => Math.round(value)))];
}

function migrateLegacyPitchProfile(storage) {
  try {
    const legacy = JSON.parse(storage.getItem("setscope-pitch-profile-v1") || "null");
    if (legacy) {
      const centerMidi = Number.isFinite(legacy.personalCenter) ? legacy.personalCenter : 48;
      return createMusicianProfile({
        centerMidi,
        lowMidi: centerMidi - 5,
        highMidi: centerMidi + 5,
        detector: { stability: legacy.stability },
        calibration: {
          status: legacy.register === "personal" ? "calibrated" : "needed",
          method: legacy.register === "personal" ? "stable-center" : "none",
          sourceLabel: legacy.register === "personal" ? "legacy" : "",
          rangeStatus: "estimated",
        },
      });
    }
  } catch {
    // Use the validated default.
  }
  return createMusicianProfile();
}

function recordIntervalHistory(history, results, centerMidi, now) {
  const next = structuredClone(history || {});
  for (const result of Array.isArray(results) ? results : []) {
    if (!result || result.outcome === "pending" || !Number.isFinite(result.targetMidi)) continue;
    const measuredInterval = Number.isFinite(result.intervalSemitones)
      ? result.intervalSemitones
      : result.targetMidi - centerMidi;
    const interval = Math.max(-12, Math.min(12, Math.round(measuredInterval)));
    const key = String(interval);
    const previous = next[key] || emptyIntervalStat();
    const attempts = previous.attempts + 1;
    const absCents = Number.isFinite(result.signedDistance) ? Math.abs(result.signedDistance * 100) : 200;
    const biasCents = Number.isFinite(result.signedDistance) ? result.signedDistance * 100 : previous.biasCents;
    const hit = result.outcome === "hit";
    next[key] = {
      attempts,
      hits: previous.hits + (hit ? 1 : 0),
      near: previous.near + (result.outcome === "near" ? 1 : 0),
      misses: previous.misses + (result.outcome === "miss" ? 1 : 0),
      meanAbsCents: runningMean(previous.meanAbsCents, previous.attempts, absCents),
      biasCents: runningMean(previous.biasCents, previous.attempts, biasCents),
      streak: hit ? previous.streak + 1 : 0,
      bestStreak: Math.max(previous.bestStreak, hit ? previous.streak + 1 : 0),
      lastPracticedAt: now,
    };
  }
  return next;
}

function chooseWeakInterval(history) {
  const candidates = [2, -2, 3, -3, 5, -5, 0];
  const practiced = candidates
    .map((interval) => ({ interval, stat: history[String(interval)] || emptyIntervalStat() }))
    .sort((left, right) => intervalMastery(left.stat) - intervalMastery(right.stat)
      || left.stat.attempts - right.stat.attempts);
  return practiced[0]?.interval ?? 2;
}

function emptyIntervalStat() {
  return {
    attempts: 0,
    hits: 0,
    near: 0,
    misses: 0,
    meanAbsCents: 0,
    biasCents: 0,
    streak: 0,
    bestStreak: 0,
    lastPracticedAt: null,
  };
}

function runningMean(previousMean, previousCount, value) {
  return (Number(previousMean || 0) * previousCount + value) / (previousCount + 1);
}

function prescription(stage, title, detail) {
  return {
    stage,
    stageIndex: practiceStages.indexOf(stage),
    title,
    detail,
  };
}

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
        low: { confirmed: false, midi: centerMidi - 5 },
        high: { confirmed: false, midi: centerMidi + 5 },
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
  const boundaries = {
    ...profile.calibration.boundaries,
    [boundary]: {
      confirmed: true,
      midi,
      clarity: frame.clarity,
      updatedAt: now,
    },
  };
  return createMusicianProfile({
    ...profile,
    revision: Number(profile.revision || 0) + 1,
    lowMidi: boundary === "low" ? midi : profile.lowMidi,
    highMidi: boundary === "high" ? midi : profile.highMidi,
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

export function recordPracticeResult(profile, { accuracy, diagnosis, modeId, stableLock = false, now = new Date() } = {}) {
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
    return prescription("prescribe", "Repeat the weak step", "Hold the center, then practice one neighboring note.");
  }
  return prescription("transfer", "Bring it to music", "Use the calibrated range with a track, instrument, or set mission.");
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

function prescription(stage, title, detail) {
  return {
    stage,
    stageIndex: practiceStages.indexOf(stage),
    title,
    detail,
  };
}

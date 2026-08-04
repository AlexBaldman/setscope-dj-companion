import assert from "node:assert/strict";
import { createMusicianProfile, validateMusicianProfile } from "../src/contracts/musician-profile.js";
import {
  calibrateMusicianProfile,
  confirmMusicianBoundary,
  createIntervalMission,
  createPracticePrescription,
  intervalHistorySummary,
  loadMusicianProfile,
  musicianProfileTargets,
  recordPracticeResult,
  saveMusicianProfile,
} from "../src/musician-profile.js";

const storage = new Map();
const localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
};

const initial = loadMusicianProfile(localStorage);
assert.equal(initial.calibration.status, "needed");
assert.equal(createPracticePrescription(initial).stage, "calibrate");

const calibrated = calibrateMusicianProfile(initial, { midi: 51.2, clarity: 0.91 }, {
  sourceLabel: "mic",
  now: new Date("2026-07-22T12:00:00.000Z"),
});
assert.equal(createIntervalMission(calibrated).interval, 2, "new learners should begin with an ascending whole step");
assert.equal(calibrated.centerMidi, 51);
assert.deepEqual([calibrated.lowMidi, calibrated.highMidi], [46, 56]);
assert.equal(calibrated.calibration.status, "calibrated");
assert.equal(calibrated.calibration.rangeStatus, "estimated");
assert.equal(validateMusicianProfile(calibrated).valid, true);
assert.deepEqual(musicianProfileTargets(calibrated), [46, 49, 51, 54, 56]);
const lowConfirmed = confirmMusicianBoundary(calibrated, "low", { midi: 45.8, clarity: 0.88 });
assert.equal(lowConfirmed.lowMidi, 46);
assert.equal(lowConfirmed.calibration.boundaries.low.confirmed, false);
const lowRepeated = confirmMusicianBoundary(lowConfirmed, "low", { midi: 46.1, clarity: 0.9 });
assert.equal(lowRepeated.calibration.boundaries.low.confirmed, true);
assert.equal(lowConfirmed.calibration.rangeStatus, "estimated");
const highCaptured = confirmMusicianBoundary(lowRepeated, "high", { midi: 57.1, clarity: 0.9 });
assert.equal(highCaptured.calibration.rangeStatus, "estimated");
const bounded = confirmMusicianBoundary(highCaptured, "high", { midi: 56.9, clarity: 0.92 });
assert.equal(bounded.highMidi, 57);
assert.equal(bounded.calibration.rangeStatus, "confirmed");
assert.equal(createPracticePrescription(bounded).stage, "hear");
const inconsistentLow = confirmMusicianBoundary(
  confirmMusicianBoundary(calibrated, "low", { midi: 45, clarity: 0.9 }),
  "low",
  { midi: 48, clarity: 0.9 },
);
assert.equal(inconsistentLow.calibration.boundaries.low.confirmed, false, "widely spread captures must remain provisional");
saveMusicianProfile(bounded, localStorage);
assert.equal(loadMusicianProfile(localStorage).centerMidi, 51);

const heard = recordPracticeResult(bounded, { accuracy: 100, modeId: "audio-lab", stableLock: true });
assert.equal(createPracticePrescription(heard).stage, "predict");
const struggling = recordPracticeResult(heard, {
  accuracy: 42,
  centerMidi: bounded.centerMidi,
  intervalResults: [
    { intervalSemitones: 2, targetMidi: 53, outcome: "hit", signedDistance: 0.08 },
    { intervalSemitones: -2, targetMidi: 51, outcome: "near", signedDistance: -0.4 },
  ],
  modeId: "pitch-gates",
});
assert.equal(createPracticePrescription(struggling).stage, "diagnose");
assert.equal(intervalHistorySummary(struggling).length, 2);
assert.equal(createIntervalMission(struggling, { drill: "steps" }).interval, 2);
const guided = recordPracticeResult(struggling, {
  accuracy: 100,
  eligibleForMastery: false,
  intervalResults: [{ intervalSemitones: 5, targetMidi: 56, outcome: "hit", signedDistance: 0 }],
  modeId: "pitch-gates",
});
assert.deepEqual(guided, struggling, "guided and demo activity must not promote the learner profile");

storage.clear();
localStorage.setItem("setscope-pitch-profile-v1", JSON.stringify({
  register: "personal",
  personalCenter: 43,
  stability: 0.8,
}));
const migrated = loadMusicianProfile(localStorage);
assert.equal(migrated.centerMidi, 43);
assert.equal(migrated.calibration.status, "calibrated");
assert.equal(createMusicianProfile(migrated).schemaVersion, 3);

assert.throws(
  () => calibrateMusicianProfile(initial, { midi: null, clarity: 0.2 }),
  /stable_pitch_required/,
);
assert.throws(
  () => confirmMusicianBoundary(calibrated, "low", { midi: 52, clarity: 0.9 }),
  /low_boundary_out_of_range/,
);
assert.throws(
  () => confirmMusicianBoundary(calibrated, "low", { midi: 46, clarity: 0.49 }),
  /stable_pitch_required/,
);

console.log("Musician profile checks passed");

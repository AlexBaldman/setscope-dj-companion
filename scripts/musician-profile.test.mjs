import assert from "node:assert/strict";
import { createMusicianProfile, validateMusicianProfile } from "../src/contracts/musician-profile.js";
import {
  calibrateMusicianProfile,
  confirmMusicianBoundary,
  createPracticePrescription,
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
assert.equal(calibrated.centerMidi, 51);
assert.deepEqual([calibrated.lowMidi, calibrated.highMidi], [46, 56]);
assert.equal(calibrated.calibration.status, "calibrated");
assert.equal(calibrated.calibration.rangeStatus, "estimated");
assert.equal(validateMusicianProfile(calibrated).valid, true);
assert.deepEqual(musicianProfileTargets(calibrated), [46, 49, 51, 54, 56]);
const lowConfirmed = confirmMusicianBoundary(calibrated, "low", { midi: 45.8, clarity: 0.88 });
assert.equal(lowConfirmed.lowMidi, 46);
assert.equal(lowConfirmed.calibration.rangeStatus, "estimated");
const bounded = confirmMusicianBoundary(lowConfirmed, "high", { midi: 57.1, clarity: 0.9 });
assert.equal(bounded.highMidi, 57);
assert.equal(bounded.calibration.rangeStatus, "confirmed");
assert.equal(createPracticePrescription(bounded).stage, "hear");
saveMusicianProfile(bounded, localStorage);
assert.equal(loadMusicianProfile(localStorage).centerMidi, 51);

const heard = recordPracticeResult(bounded, { accuracy: 100, modeId: "audio-lab", stableLock: true });
assert.equal(createPracticePrescription(heard).stage, "predict");
const struggling = recordPracticeResult(heard, { accuracy: 42, modeId: "pitch-gates" });
assert.equal(createPracticePrescription(struggling).stage, "diagnose");

storage.clear();
localStorage.setItem("setscope-pitch-profile-v1", JSON.stringify({
  register: "personal",
  personalCenter: 43,
  stability: 0.8,
}));
const migrated = loadMusicianProfile(localStorage);
assert.equal(migrated.centerMidi, 43);
assert.equal(migrated.calibration.status, "calibrated");
assert.equal(createMusicianProfile(migrated).schemaVersion, 2);

assert.throws(
  () => calibrateMusicianProfile(initial, { midi: null, clarity: 0.2 }),
  /stable_pitch_required/,
);
assert.throws(
  () => confirmMusicianBoundary(calibrated, "low", { midi: 52, clarity: 0.9 }),
  /low_boundary_out_of_range/,
);

console.log("Musician profile checks passed");

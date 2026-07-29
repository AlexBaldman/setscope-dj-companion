import assert from "node:assert/strict";
import { createPracticeLevelFromFrames } from "../src/pitch-gates/audio-level.js";

const frames = Array.from({ length: 32 }, (_, index) => ({
  atSec: index * 0.22,
  midi: [60, 60, 62, 64, 64, 67, 65, 62][index % 8],
  clarity: 0.82 + (index % 3) * 0.04,
}));
const level = createPracticeLevelFromFrames(frames, {
  focus: "melody",
  fileName: "practice.wav",
  durationSec: 12,
});

assert.equal(level.status, "ready");
assert.equal(level.focusLabel, "Lead contour");
assert.equal(level.targetMidiSequence.length, 12);
assert(level.confidence > 0.6 && level.confidence <= 0.86);
assert(level.targetMidiSequence.every(Number.isFinite));
assert.match(level.detail, /not isolated stems/i);

const sparse = createPracticeLevelFromFrames([
  { atSec: 0, midi: 48, clarity: 0.9 },
  { atSec: 1, midi: 50, clarity: 0.9 },
  { atSec: 2, midi: 52, clarity: 0.9 },
], { focus: "bass" });
assert.equal(sparse.status, "insufficient");
assert.deepEqual(sparse.targetMidiSequence, []);
assert.equal(sparse.focusLabel, "Bass contour");

console.log("Pitch audio-level checks passed");

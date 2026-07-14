import assert from "node:assert/strict";

import { createPitchStabilizer } from "../src/pitch-gates/pitch-filter.js";

const stabilizer = createPitchStabilizer({ assist: "gentle", stability: 0.7 });
assert.equal(stabilizer.push(frame(57, 0.95), 0), null, "voice acquisition should reject one isolated frame");
let output = stabilizer.push(frame(57.1, 0.95), 50);
assert(Number.isFinite(output?.midi), "two clear frames should acquire voice");

const steady = [];
for (let index = 0; index < 12; index += 1) {
  const noisyMidi = 57 + (index % 2 === 0 ? 0.18 : -0.18);
  output = stabilizer.push(frame(noisyMidi, 0.94), 100 + index * 50);
  steady.push(output.midi);
}
assert(standardDeviation(steady.slice(4)) < 0.08, "steady-note output should reject small frame noise");

const beforeOctaveSlip = output.midi;
output = stabilizer.push(frame(69, 0.96), 720);
assert(Math.abs(output.midi - beforeOctaveSlip) < 1, "a single octave slip should not move the stable pitch");
assert(stabilizer.push(null, 820), "a short dropout should retain the stable pitch");
assert.equal(stabilizer.push(null, 1000), null, "a dropout beyond the assist grace should release pitch");

stabilizer.reset();
stabilizer.setAssist("exact");
assert.equal(stabilizer.push(frame(60, 0.8), 0), null, "Exact assist should reject weak acquisition");

console.log("Pitch filter checks passed");

function frame(midi, clarity) {
  return { midi, frequency: 440, clarity, note: "A4", timestamp: 0 };
}

function standardDeviation(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

import assert from "node:assert/strict";

import { createPitchGatesChallenge, validatePitchGatesChallenge } from "../src/pitch-gates/challenge.js";
import {
  advancePitchGatesTo,
  applyPitchInput,
  createPitchGatesRun,
  hashPitchGatesRun,
  pausePitchGatesRun,
  projectPitchGate,
  resumePitchGatesRun,
} from "../src/pitch-gates/reducer.js";
import { createPitchGatesReplay, replayPitchGates } from "../src/pitch-gates/replay.js";

const challenge = createPitchGatesChallenge({ seed: 424242, register: "mid", speed: "groove", totalGates: 12 });
assert.equal(validatePitchGatesChallenge(challenge).valid, true);
assert.deepEqual(
  createPitchGatesChallenge({ seed: 424242, register: "mid", speed: "groove", totalGates: 12 }),
  challenge,
  "the same seed must produce the same challenge",
);
assert.notDeepEqual(
  createPitchGatesChallenge({ seed: 99 }).gates.map((gate) => gate.targetMidi),
  challenge.gates.map((gate) => gate.targetMidi),
  "different seeds should alter the gate sequence",
);
assert.equal(challenge.gates[0].targetMidi, challenge.config.centerMidi, "onboarding begins on the comfortable center");
assert.equal(challenge.gates[1].targetMidi, challenge.config.centerMidi, "the first success is reinforced before movement");
assert(challenge.gates.every((gate) => gate.targetMidi >= challenge.config.rangeMinMidi && gate.targetMidi <= challenge.config.rangeMaxMidi));
assert(challenge.gates.slice(1).every((gate, index) => Math.abs(gate.targetMidi - challenge.gates[index].targetMidi) <= 3), "onboarding motion must remain stepwise");

const personalChallenge = createPitchGatesChallenge({ seed: 12, register: "personal", centerMidi: 50, assist: "gentle" });
assert.equal(personalChallenge.config.centerMidi, 50);
assert.equal(personalChallenge.gates[0].tolerance, 1.05);

const trace = challenge.gates.map((gate, index) => {
  if (index === 1) return { atMs: gate.evaluateAtMs - 20, midi: gate.targetMidi + 3, clarity: 0.95 };
  if (index === 4) return { atMs: gate.evaluateAtMs - 20, midi: gate.targetMidi + gate.tolerance * 1.2, clarity: 0.95 };
  return { atMs: gate.evaluateAtMs - 20, midi: gate.targetMidi, clarity: 0.95 };
});

const runs = [30, 60, 120].map((framesPerSecond) => simulate(challenge, trace, framesPerSecond));
const hashes = runs.map(hashPitchGatesRun);
assert.equal(new Set(hashes).size, 1, `render schedules must agree: ${hashes.join(", ")}`);
assert.deepEqual(runs[0].gateResults, runs[1].gateResults);
assert.deepEqual(runs[1].events, runs[2].events);
assert.equal(runs[0].status, "complete");
assert.equal(runs[0].endReason, "all-gates-resolved");
assert.equal(runs[0].events.some((event) => event.type === "near"), true);
assert.equal(runs[0].events.some((event) => event.type === "miss"), true);
assert.equal(runs[0].events.some((event) => event.type === "recovery"), true);

const replay = createPitchGatesReplay(runs[0]);
const replayed = replayPitchGates(replay);
assert.equal(replayed.matches, true);
assert.equal(replayed.hash, hashes[0]);
assert.deepEqual(replayed.run.gateResults, runs[0].gateResults);

const initial = createPitchGatesRun(challenge);
const withInput = applyPitchInput(initial, trace[0]);
assert.equal(initial.inputs.length, 0, "input application must not mutate the prior run");
assert.equal(withInput.inputs.length, 1);
const advanced = advancePitchGatesTo(withInput, challenge.gates[0].evaluateAtMs);
assert.equal(withInput.resolved, 0, "time advancement must not mutate the prior run");
assert.equal(advanced.resolved, 1);

const firstGate = challenge.gates[0];
const projected = projectPitchGate(
  { ...initial, elapsedMs: firstGate.evaluateAtMs },
  firstGate,
  { startX: 900, hitX: 110 },
);
assert.equal(projected, 110, "the gate reaches the scoring line at its fixed evaluation time");

const oneGate = createPitchGatesChallenge({ seed: 7, totalGates: 1, speed: "easy" });
const boundaryGate = oneGate.gates[0];
let boundaryRun = createPitchGatesRun(oneGate);
boundaryRun = applyPitchInput(boundaryRun, {
  atMs: boundaryGate.evaluateAtMs,
  midi: boundaryGate.targetMidi + boundaryGate.tolerance,
  clarity: 1,
});
boundaryRun = advancePitchGatesTo(boundaryRun, boundaryGate.evaluateAtMs);
assert.equal(boundaryRun.gateResults[0].outcome, "hit", "the tolerance boundary should be inclusive");
assert.equal(hashPitchGatesRun(advancePitchGatesTo(boundaryRun, boundaryGate.evaluateAtMs - 500)), hashPitchGatesRun(boundaryRun));

const lostInputRun = advancePitchGatesTo(createPitchGatesRun(oneGate), boundaryGate.evaluateAtMs);
assert.equal(lostInputRun.gateResults[0].outcome, "miss", "missing input should resolve as a miss without throwing");

let windowedRun = createPitchGatesRun(oneGate);
for (const offset of [-200, -150, -100, -50]) {
  windowedRun = applyPitchInput(windowedRun, { atMs: boundaryGate.evaluateAtMs + offset, midi: boundaryGate.targetMidi, clarity: 0.95 });
}
windowedRun = applyPitchInput(windowedRun, { atMs: boundaryGate.evaluateAtMs, midi: boundaryGate.targetMidi + 5, clarity: 0.95 });
windowedRun = advancePitchGatesTo(windowedRun, boundaryGate.evaluateAtMs);
assert.equal(windowedRun.gateResults[0].outcome, "hit", "one noisy crossing frame must not erase a stable scoring window");

const pauseAt = boundaryGate.evaluateAtMs - 100;
const paused = pausePitchGatesRun(createPitchGatesRun(oneGate), pauseAt);
assert.equal(paused.status, "paused");
assert.equal(advancePitchGatesTo(paused, boundaryGate.evaluateAtMs + 100), paused, "paused runs should not advance");
const resumed = resumePitchGatesRun(paused);
assert.equal(resumed.status, "running");
assert.equal(resumed.events.at(-1).type, "resume");
let resumedCompletion = applyPitchInput(resumed, {
  atMs: boundaryGate.evaluateAtMs,
  midi: boundaryGate.targetMidi,
  clarity: 1,
});
resumedCompletion = advancePitchGatesTo(resumedCompletion, boundaryGate.evaluateAtMs);
assert.equal(replayPitchGates(createPitchGatesReplay(resumedCompletion)).matches, true, "pause and resume must survive replay");

console.log("Pitch Gates engine checks passed");

function simulate(challengeDefinition, inputs, framesPerSecond) {
  let run = createPitchGatesRun(challengeDefinition);
  inputs.forEach((input) => {
    run = applyPitchInput(run, input);
  });
  const frameMs = 1000 / framesPerSecond;
  const finishAt = challengeDefinition.gates.at(-1).evaluateAtMs + frameMs;
  for (let now = 0; now <= finishAt && run.status === "running"; now += frameMs) {
    run = advancePitchGatesTo(run, now);
  }
  if (run.status === "running") run = advancePitchGatesTo(run, finishAt);
  return run;
}

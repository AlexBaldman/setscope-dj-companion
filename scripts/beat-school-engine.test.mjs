import assert from "node:assert/strict";
import {
  BEAT_SCHOOL_LANES,
  beatSchoolStepMs,
  createBeatSchoolChallenge,
  validateBeatSchoolChallenge,
} from "../src/beat-school/challenge.js";
import {
  createBeatSchoolRun,
  evaluateBeatSchoolPass,
  hashBeatSchoolRun,
  reduceBeatSchool,
  targetsForBeatSchoolRun,
} from "../src/beat-school/reducer.js";
import { createBeatSchoolReplay, replayBeatSchool } from "../src/beat-school/replay.js";

const challenge = createBeatSchoolChallenge({ seed: 4242 });
assert.equal(validateBeatSchoolChallenge(challenge).valid, true);
assert.deepEqual(createBeatSchoolChallenge({ seed: 4242 }), challenge);
assert.equal(BEAT_SCHOOL_LANES.length, 4);

let run = createBeatSchoolRun(challenge);
run = reduceBeatSchool(run, { type: "set-phase", phase: "imitate", atMs: 1000 });
const stepMs = beatSchoolStepMs(challenge);
for (const target of challenge.pattern) {
  run = reduceBeatSchool(run, {
    type: "hit",
    lane: target.lane,
    atMs: 1000 + target.step * stepMs + 18,
    velocity: target.velocity - 0.04,
    sourceKind: "touch",
  });
}
const evaluation = evaluateBeatSchoolPass(run);
assert.equal(evaluation.accuracy, 100);
assert(evaluation.pocket > 80);
assert.equal(evaluation.timingBias, "centered");

run = reduceBeatSchool(run, { type: "complete-pass", atMs: 4000 });
assert.equal(run.passes.length, 1);
assert.equal(run.repairTarget.reason, "centered");
run = reduceBeatSchool(run, { type: "set-phase", phase: "repair", atMs: 5000 });
assert.equal(targetsForBeatSchoolRun(run).length, 4);
assert(targetsForBeatSchoolRun(run).every((target) => target.lane === run.repairTarget.lane));

run = reduceBeatSchool(run, { type: "set-phase", phase: "remix", atMs: 7000 });
run = reduceBeatSchool(run, { type: "hit", lane: "clap", atMs: 7000 + stepMs * 6.1, velocity: 0.75, sourceKind: "keyboard" });
assert.equal(run.remixPattern.clap[6], 0.75);
run = reduceBeatSchool(run, { type: "set-phase", phase: "save", atMs: 10000 });
run = reduceBeatSchool(run, { type: "save" });
assert.equal(run.status, "saved");

const replay = createBeatSchoolReplay(run);
const replayed = replayBeatSchool(replay);
assert.equal(replayed.matches, true);
assert.equal(replayed.hash, hashBeatSchoolRun(run));
assert.deepEqual(replayed.run.remixPattern, run.remixPattern);

const silent = createBeatSchoolRun(challenge);
const silentEvaluation = evaluateBeatSchoolPass({
  ...silent,
  phase: "perform",
  phaseStartMs: 0,
});
assert.equal(silentEvaluation.score, 0);
assert.equal(silentEvaluation.timingBias, "silent");

console.log("Beat School engine checks passed");

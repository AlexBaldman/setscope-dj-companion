import assert from "node:assert/strict";
import { createSampleId } from "../src/rhythm-roulette/catalog.js";
import { createRhythmRouletteChallenge, validateRhythmRouletteChallenge } from "../src/rhythm-roulette/challenge.js";
import {
  createRhythmRouletteRun,
  hashRhythmRouletteRun,
  reduceRhythmRoulette,
  rhythmChallengeBonus,
  rhythmPatternDensity,
  rhythmRecordVariety,
  scoreRhythmGroove,
  scoreRhythmRoulette,
} from "../src/rhythm-roulette/reducer.js";
import { createRhythmRouletteReplay, replayRhythmRoulette } from "../src/rhythm-roulette/replay.js";

const challenge = createRhythmRouletteChallenge({ seed: 424242 });
assert.equal(validateRhythmRouletteChallenge(challenge).valid, true);
assert.deepEqual(createRhythmRouletteChallenge({ seed: 424242 }), challenge);
assert.notDeepEqual(createRhythmRouletteChallenge({ seed: 7 }).records, challenge.records);

for (let seed = 1; seed <= 256; seed += 1) {
  const generated = createRhythmRouletteChallenge({ seed });
  assert.equal(new Set(generated.records.map((record) => record.id)).size, 3);
}

const initial = createRhythmRouletteRun(challenge);
assert.equal(rhythmPatternDensity(initial.pattern), 10);
assert.equal(rhythmRecordVariety(initial), 3);
assert.equal(scoreRhythmGroove(initial.pattern), 50);

const selectedId = createSampleId(challenge.records[2].id, "kick");
const selected = reduceRhythmRoulette(initial, { type: "select-sample", sampleId: selectedId });
const toggled = reduceRhythmRoulette(selected, { type: "toggle-step", laneId: "kick", step: 5 });
assert.equal(initial.selectedSampleId === selected.selectedSampleId, false, "selection must not mutate the prior run");
assert.equal(selected.pattern.kick[5], null, "step edits must not mutate the prior run");
assert.equal(toggled.pattern.kick[5], selectedId);

const invalid = reduceRhythmRoulette(toggled, { type: "toggle-step", laneId: "missing", step: 99 });
assert.equal(invalid, toggled, "invalid actions should be identity-preserving no-ops");

const loose = reduceRhythmRoulette(toggled, { type: "auto-flip" });
assert.equal(rhythmPatternDensity(loose.pattern), 16);
const cleared = reduceRhythmRoulette(loose, { type: "clear" });
assert.equal(rhythmPatternDensity(cleared.pattern), 0);

const bonuses = Object.fromEntries(["dusty-pocket", "backbeat-tax", "three-record-rule", "late-swing"].map((id) => {
  const run = createRhythmRouletteRun({ ...challenge, rule: { ...challenge.rule, id } });
  return [id, rhythmChallengeBonus(run)];
}));
assert.deepEqual(bonuses, { "dusty-pocket": 320, "backbeat-tax": 360, "three-record-rule": 420, "late-swing": 70 });

const saved = reduceRhythmRoulette(toggled, { type: "save" });
const replay = createRhythmRouletteReplay(saved);
const replayed = replayRhythmRoulette(replay);
assert.equal(replayed.matches, true);
assert.equal(replayed.hash, hashRhythmRouletteRun(saved));
assert.deepEqual(replayed.run.pattern, saved.pattern);
assert.equal(scoreRhythmRoulette(replayed.run), scoreRhythmRoulette(saved));

console.log("Rhythm Roulette engine checks passed");

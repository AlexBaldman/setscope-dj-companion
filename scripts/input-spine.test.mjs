import assert from "node:assert/strict";
import {
  createInputMapping,
  createLatencyProfile,
  mappingMatchesObservation,
  normalizeInputMappings,
  validateInputMapping,
  validateLatencyProfile,
  validateMusicalAction,
} from "../src/contracts/input-timing.js";
import { createMusicalClock, createSemanticInputSpine } from "../src/input-spine.js";

const clock = createMusicalClock({ bpm: 120, beatsPerBar: 4, stepsPerBeat: 4, originTimeMs: 1000 });
assert.deepEqual(clock.positionAt(1000), { bar: 1, beat: 1, step: 1, tick: 0, absoluteBeat: 0, phase: 0 });
assert.deepEqual(clock.positionAt(1750), { bar: 1, beat: 2, step: 3, tick: 480, absoluteBeat: 1.5, phase: 0.5 });
assert.equal(clock.timeAt({ bar: 2, beat: 1, step: 1 }), 3000);

const observation = {
  observationId: "obs-1",
  sessionId: "session-1",
  sourceId: "nanoKEY",
  sourceKind: "midi",
  timestampMs: 1770,
  provenance: "performed",
  message: { type: "note-on", channel: 1, note: 36, velocity: 0.8 },
};
const mapping = createInputMapping({
  mappingId: "kick-map",
  action: "kick",
  observation,
  createdAt: "test",
});
assert.equal(validateInputMapping(mapping).valid, true);
assert.equal(mappingMatchesObservation(mapping, { ...observation, message: { ...observation.message, velocity: 0.2 } }), true);
assert.equal(mappingMatchesObservation(mapping, { ...observation, message: { ...observation.message, note: 38 } }), false);

const legacy = normalizeInputMappings([{
  action: "snare",
  sourceId: "maschine",
  message: { type: "note-on", channel: 10, note: 38, velocity: 1 },
}]);
assert.equal(legacy.length, 1);
assert.equal(legacy[0].gesture.velocity, undefined);
assert.equal(legacy[0].gesture.note, 38);

const profile = createLatencyProfile({
  profileId: "manual",
  sourceId: "*",
  inputLatencyMs: 12,
  outputLatencyMs: 8,
  jitterMs: 3,
  confidence: 0.25,
  method: "manual",
  updatedAt: "test",
});
assert.equal(validateLatencyProfile(profile).valid, true);

const spine = createSemanticInputSpine({
  sessionId: "session-1",
  clock,
  mappings: [mapping],
  latencyProfiles: [profile],
});
const receipt = spine.receive(observation, { receivedAtMs: 1775, audioTimeSec: 0.77 });
assert.equal(validateMusicalAction(receipt).valid, true);
assert.equal(receipt.action, "kick");
assert.equal(receipt.correctedAtMs, 1750);
assert.equal(receipt.position.absoluteBeat, 1.5);
assert.equal(receipt.intensity, 0.8);
assert.equal(receipt.timing.confidence, 0.25);
assert.equal(spine.receive({ ...observation, message: { ...observation.message, note: 40 } }), null);

clock.setTempo(60, 4000);
assert.equal(clock.positionAt(5000).beat, 2);
clock.restart(6000);
assert.equal(clock.positionAt(6000).absoluteBeat, 0);

console.log("Input timing spine checks passed");

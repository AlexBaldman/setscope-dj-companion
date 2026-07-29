import assert from "node:assert/strict";
import { createInputMapping } from "../src/contracts/input-timing.js";
import { createBeatSchoolMappings } from "../src/beat-school/input-mappings.js";
import {
  INPUT_MAPPINGS_STORAGE_KEY,
  LATENCY_PROFILE_STORAGE_KEY,
  LEGACY_INPUT_MAPPINGS_STORAGE_KEY,
  isLatencyProfileTrusted,
  loadInputMappings,
  loadLatencyProfile,
  saveInputMappings,
  saveLatencyProfile,
} from "../src/input-profile-store.js";

const values = new Map();
const storage = {
  getItem(key) {
    return values.get(key) || null;
  },
  setItem(key, value) {
    values.set(key, String(value));
  },
};
const learnedKick = createInputMapping({
  mappingId: "learned-kick",
  action: "kick",
  observation: {
    sourceId: "sensel",
    sourceKind: "midi",
    message: { type: "note-on", note: 48 },
  },
});
const learnedHat = createInputMapping({
  mappingId: "learned-hat",
  action: "closed-hat",
  observation: {
    sourceId: "maschine",
    sourceKind: "midi",
    message: { type: "note-on", note: 50 },
  },
});
const transport = createInputMapping({
  mappingId: "transport",
  action: "transport-toggle",
  observation: {
    sourceId: "maschine",
    sourceKind: "midi",
    message: { type: "control-change", controller: 20 },
  },
});

values.set(LEGACY_INPUT_MAPPINGS_STORAGE_KEY, JSON.stringify([learnedKick]));
assert.equal(loadInputMappings(storage)[0].mappingId, "learned-kick");
assert(values.has(INPUT_MAPPINGS_STORAGE_KEY), "legacy mappings should migrate to the current key");
assert.equal(saveInputMappings([learnedKick, learnedHat, transport], storage).length, 3);

const beatMappings = createBeatSchoolMappings(loadInputMappings(storage));
assert.equal(beatMappings[0].action, "beat-pad:kick");
assert.equal(beatMappings[1].action, "beat-pad:hat");
assert(!beatMappings.some(({ mappingId }) => mappingId === "transport"));
assert(beatMappings.some(({ mappingId }) => mappingId === "midi-kick"));

const savedLatency = saveLatencyProfile({
  profileId: "manual",
  sourceId: "*",
  inputLatencyMs: 12,
  outputLatencyMs: 8,
  confidence: 0.25,
}, storage);
assert.equal(savedLatency.inputLatencyMs, 12);
assert(values.has(LATENCY_PROFILE_STORAGE_KEY));
assert.equal(loadLatencyProfile(storage).outputLatencyMs, 8);
assert.equal(isLatencyProfileTrusted(savedLatency), false);

const tapLatency = saveLatencyProfile({
  profileId: "tap",
  sourceId: "*",
  inputLatencyMs: 24,
  jitterMs: 18,
  sampleCount: 8,
  confidence: 0.68,
  method: "tap",
}, storage);
assert.equal(isLatencyProfileTrusted(tapLatency), true);
assert.equal(isLatencyProfileTrusted({ ...tapLatency, sampleCount: 3 }), false);

console.log("Input profile store checks passed");

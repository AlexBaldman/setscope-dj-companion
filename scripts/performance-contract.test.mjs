import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  PERFORMANCE_EVENT_V2,
  QUARANTINED_METADATA_V1,
  createPerformanceEventV2,
  validatePerformanceEventV2,
} from "../src/contracts/performance-event.js";
import {
  migratePerformanceEventV1,
  normalizePerformanceMetadata,
} from "../src/migrations/performance-event-v1.js";

const legacy = JSON.parse(await readFile("scripts/fixtures/performance-event-v1.json", "utf8"));
const migrated = migratePerformanceEventV1(legacy);

assert.equal(migrated.schemaVersion, PERFORMANCE_EVENT_V2);
assert.equal(migrated.modeId, legacy.modeId);
assert.equal(migrated.observation.trackContext.trackId, legacy.trackId);
assert.equal(migrated.result.score, legacy.score);
assert.equal(migrated.details.register, "Mid");
assert.equal(migrated.assistance.level, "demo");
assert.equal(migrated.assistance.eligibleForMastery, false);
assert.deepEqual(validatePerformanceEventV2(migrated), { valid: true, errors: [] });
assert.deepEqual(normalizePerformanceMetadata(migrated), migrated);
assert.deepEqual(migratePerformanceEventV1(legacy), migrated, "legacy migration must be deterministic");

const live = createPerformanceEventV2({
  modeId: "audio-lab",
  sourceLabel: "microphone",
  score: 92,
  calibration: { status: "calibrated", values: { latencyMs: 18 } },
  inference: { confidence: 0.92, analyzerVersion: "pitchy-4" },
});
assert.equal(live.assistance.eligibleForMastery, false);
assert.equal(live.calibration.values.latencyMs, 18);
assert.equal(live.inference.confidence, 0.92);
assert.equal(validatePerformanceEventV2(live).valid, true);

const explicitlyEligible = createPerformanceEventV2({
  modeId: "audio-lab",
  sourceLabel: "microphone",
  score: 100,
  assistance: { level: "none", eligibleForMastery: true },
  calibration: { status: "calibrated" },
});
assert.equal(explicitlyEligible.assistance.eligibleForMastery, true);

const malformed = { ...migrated, result: { score: "loud", streak: 2 } };
const quarantined = normalizePerformanceMetadata(malformed);
assert.equal(quarantined.schemaVersion, QUARANTINED_METADATA_V1);
assert.equal(quarantined.kind, "quarantined");
assert.equal(quarantined.errors.some((error) => error.includes("result.score")), true);
assert.equal("details" in quarantined, false, "quarantine must not silently expose malformed evidence");

const genericMetadata = { modeId: "note", labels: ["review"] };
assert.deepEqual(normalizePerformanceMetadata(genericMetadata), genericMetadata);

console.log("Performance contract checks passed");

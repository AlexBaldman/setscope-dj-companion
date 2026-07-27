import assert from "node:assert/strict";
import { createMusicianProfile } from "../src/contracts/musician-profile.js";
import {
  createSkillLedger,
  deriveSkillGraph,
  loadSkillLedger,
  recordSkillEvidence,
} from "../src/skill-graph.js";

const values = new Map();
const storage = {
  getItem(key) {
    return values.get(key) || null;
  },
  setItem(key, value) {
    values.set(key, String(value));
  },
};

const initialGraph = deriveSkillGraph({
  profile: createMusicianProfile(),
  ledger: createSkillLedger(),
});
assert.equal(initialGraph.focus.id, "signal", "an uncalibrated learner should establish a signal first");

const calibrated = createMusicianProfile({
  calibration: {
    status: "calibrated",
    method: "stable-center",
    rangeStatus: "estimated",
  },
  practice: {
    intervalHistory: {
      2: {
        attempts: 4,
        hits: 3,
        near: 1,
        misses: 0,
        meanAbsCents: 24,
        biasCents: 8,
      },
    },
  },
});

recordSkillEvidence({
  modeId: "pitch-gates",
  score: 900,
  trackId: "track-1",
  createdAt: "2026-07-27T12:00:00.000Z",
  assistance: { level: "none", eligibleForMastery: true },
  details: { accuracy: 84 },
}, "event-pitch", storage);
recordSkillEvidence({
  modeId: "rhythm-roulette",
  score: 980,
  trackId: "track-1",
  createdAt: "2026-07-27T12:05:00.000Z",
  assistance: { level: "none", eligibleForMastery: true },
  details: {
    scoreBreakdown: { constraint: 360, pocket: 400, originality: 280 },
  },
}, "event-rhythm", storage);
recordSkillEvidence({
  modeId: "audio-lab",
  score: 100,
  trackId: "track-1",
  createdAt: "2026-07-27T12:10:00.000Z",
  assistance: { level: "demo", eligibleForMastery: false },
  details: { clarity: 98, cents: 2, stableHold: true },
}, "event-guided", storage);
recordSkillEvidence({
  modeId: "pitch-gates",
  score: 999,
  createdAt: "2026-07-27T12:15:00.000Z",
  assistance: { level: "demo", eligibleForMastery: false },
  details: { accuracy: 100 },
}, "event-demo", storage);
recordSkillEvidence({
  modeId: "pitch-gates",
  score: 100,
  createdAt: "2026-07-27T12:20:00.000Z",
  assistance: { level: "none", eligibleForMastery: true },
  details: { accuracy: 100 },
}, "event-pitch", storage);

const ledger = loadSkillLedger(storage);
assert.equal(ledger.receipts.length, 4, "event receipts should be deduplicated");
const graph = deriveSkillGraph({ profile: calibrated, ledger });
assert.equal(graph.trustedEvidence, 2);
assert.equal(graph.guidedEvidence, 2);
assert.equal(graph.nodes.find((node) => node.id === "pitch").level, 84);
assert.equal(graph.nodes.find((node) => node.id === "rhythm").level, 83);
assert.equal(graph.nodes.find((node) => node.id === "signal").level, 0, "guided signal work must not promote level");
assert.equal(graph.nodes.find((node) => node.id === "transfer").evidenceCount, 2);
assert(graph.nodes.find((node) => node.id === "ear").level > 0);

console.log("Skill graph checks passed");

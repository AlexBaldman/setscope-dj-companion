import assert from "node:assert/strict";

const values = new Map();
let failSkillWrite = true;
globalThis.localStorage = {
  getItem(key) {
    return values.get(key) ?? null;
  },
  setItem(key, value) {
    if (failSkillWrite && key === "setscope-skill-ledger-v1") throw new Error("simulated_skill_write_failure");
    values.set(key, String(value));
  },
  removeItem(key) {
    values.delete(key);
  },
};

const track = {
  id: "track-completion",
  time: "01:20",
  title: "Commit Groove",
};
const { createPracticeMission } = await import("../src/session-spine.js");
const mission = createPracticeMission({
  id: "mission-completion",
  modeId: "beat-school",
  track,
  createdAt: "2026-07-27T12:00:00.000Z",
});
values.set("setscope-draft-v1", JSON.stringify({
  tracks: [track],
  audioEvents: [],
  captureLog: [],
  practiceMissions: [mission],
}));

const {
  createBeatSchoolCompletionEvent,
  persistPerformanceEvent,
  recoverPerformanceCompletion,
} = await import("../src/performance-events.js");
const metadata = createBeatSchoolCompletionEvent({
  challenge: { id: "beat-commit", lessonId: "backbeat-1", seed: 17, bpm: 94, title: "Commit Beat" },
  score: 92,
  accuracy: 94,
  pocket: 88,
  dynamics: 90,
  timingBias: "centered",
  replayHash: "commit-replay",
  replayActionCount: 16,
  trackId: track.id,
  time: track.time,
});

assert.throws(
  () => persistPerformanceEvent(metadata, { missionId: mission.id }),
  /simulated_skill_write_failure/,
);
const partialDraft = JSON.parse(values.get("setscope-draft-v1"));
assert.equal(partialDraft.audioEvents.length, 1, "the canonical event should commit once");
assert.equal(partialDraft.practiceMissions[0].status, "complete", "mission closure should share the draft write");
assert(values.has("setscope-pending-completion-v1"), "the write-ahead record should survive a partial failure");

failSkillWrite = false;
const recovered = recoverPerformanceCompletion();
assert.equal(recovered.id, partialDraft.audioEvents[0].id);
const recoveredDraft = JSON.parse(values.get("setscope-draft-v1"));
const skillLedger = JSON.parse(values.get("setscope-skill-ledger-v1"));
assert.equal(recoveredDraft.audioEvents.length, 1, "recovery should not duplicate the event");
assert.equal(skillLedger.receipts.length, 1, "recovery should project skill evidence once");
assert.equal(skillLedger.receipts[0].eventId, recovered.id);
assert.equal(values.has("setscope-pending-completion-v1"), false, "successful recovery should clear the journal");
assert.equal(recoverPerformanceCompletion(), null, "a cleared journal should be a no-op");

values.set("setscope-pending-completion-v1", "{broken");
assert.equal(recoverPerformanceCompletion(), null, "a malformed journal should be quarantined as a failed recovery");
assert.equal(values.has("setscope-pending-completion-v1"), false, "a malformed journal should not block future saves");

console.log("Performance completion checks passed");

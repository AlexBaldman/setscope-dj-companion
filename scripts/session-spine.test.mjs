import assert from "node:assert/strict";
import {
  completePracticeMission,
  createPracticeMission,
  deriveSessionSpine,
} from "../src/session-spine.js";

const track = {
  artist: "K.M. Session Band",
  bpm: 94,
  confidence: 91,
  id: "track-1",
  key: "9A",
  needsReview: false,
  time: "00:00",
  title: "Warm Up The Room",
};

const baseDraft = {
  recognitionSessionId: "session-1",
  recognitionStartedAt: "2026-07-27T12:00:00.000Z",
  tracks: [track],
  audioEvents: [],
  practiceMissions: [],
};

const firstMove = deriveSessionSpine(baseDraft, track);
assert.equal(firstMove.nextMove.modeId, "pitch-gates");
assert.equal(firstMove.stats.captured, 1);

const mission = createPracticeMission({
  id: "mission-1",
  sessionId: "session-1",
  track,
  modeId: firstMove.nextMove.modeId,
  prompt: firstMove.nextMove.prompt,
  createdAt: "2026-07-27T12:05:00.000Z",
});
const armed = deriveSessionSpine({ ...baseDraft, practiceMissions: [mission] }, track);
assert.equal(armed.nextMove.action, "Resume");
assert.equal(armed.nextMove.missionId, mission.id);

const completed = completePracticeMission(
  mission,
  { id: "event-1" },
  "2026-07-27T12:08:00.000Z",
);
const afterPitch = deriveSessionSpine({
  ...baseDraft,
  practiceMissions: [completed],
  audioEvents: [{
    id: "event-1",
    trackId: track.id,
    metadata: { modeId: "pitch-gates" },
  }],
}, track);
assert.equal(afterPitch.nextMove.modeId, "rhythm-roulette");
assert.equal(afterPitch.stats.practiced, 1);
assert.equal(afterPitch.stats.missionsCompleted, 1);

const reviewTrack = { ...track, confidence: 62, needsReview: true };
assert.equal(deriveSessionSpine({ ...baseDraft, tracks: [reviewTrack] }, reviewTrack).nextMove.modeId, "audio-lab");

console.log("Session spine checks passed");

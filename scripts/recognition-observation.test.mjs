import assert from "node:assert/strict";
import {
  createRecognitionObservation,
  validateRecognitionObservation,
} from "../src/contracts/recognition-observation.js";

const webObservation = createRecognitionObservation({
  observationId: "observation_web_001",
  requestId: "recognition_web_001",
  sessionId: "session_web_001",
  outcome: "matched",
  provenance: "inference",
  provider: "audd",
  startedAt: "2026-07-22T10:00:00.000Z",
  completedAt: "2026-07-22T10:00:01.250Z",
  setElapsedMs: 64000,
  latencyMs: 1250,
  audio: { durationMs: 8000, mimeType: "audio/webm", size: 48211, hasData: true },
});

assert.equal(validateRecognitionObservation(webObservation).valid, true);
assert.equal(webObservation.schemaVersion, 1);
assert.equal(webObservation.audio.size, 48211);
assert.equal(JSON.stringify(webObservation).includes("bytes"), false);

const shazamKitObservation = createRecognitionObservation({
  ...webObservation,
  observationId: "observation_ios_001",
  requestId: "recognition_ios_001",
  sessionId: "session_ios_001",
  provider: "shazamkit",
  provenance: "inference",
  audio: { durationMs: 6000, mimeType: "audio/pcm", size: 0, hasData: false },
});

assert.equal(validateRecognitionObservation(shazamKitObservation).valid, true);
assert.equal(shazamKitObservation.provider, "shazamkit");
assert.equal(shazamKitObservation.audio.hasData, false, "native adapters need not upload raw audio");

assert.throws(() => createRecognitionObservation({
  observationId: "bad",
  requestId: "bad",
}), /invalid_recognition_observation/);

console.log("Recognition observation contract checks passed");

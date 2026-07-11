import assert from "node:assert/strict";
import { createListeningSession, normalizeListeningCadence } from "../src/listening-session.js";

assert.equal(normalizeListeningCadence("30000"), 30000);
assert.equal(normalizeListeningCadence("nope"), 15000);

let stoppedTracks = 0;
let captures = 0;
let recognitions = 0;
let inFlight = 0;
let maxInFlight = 0;
const phases = [];

const session = createListeningSession({
  acquireStream: async () => ({
    getTracks: () => [{ stop: () => { stoppedTracks += 1; } }],
  }),
  captureWindow: async () => {
    captures += 1;
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    return { payload: { dataUrl: "window" } };
  },
  recognize: async () => {
    recognitions += 1;
    inFlight -= 1;
    return { artist: "Test Artist", title: `Match ${recognitions}` };
  },
  onMatch: () => session.stop(),
  onState: (state) => phases.push(state.phase),
});

assert.equal(await session.start({ cadenceMs: 8000, windowMs: 1000 }), true);
await new Promise((resolve) => setTimeout(resolve, 10));
assert.equal(session.isActive(), false);
assert.equal(captures, 1);
assert.equal(recognitions, 1);
assert.equal(maxInFlight, 1);
assert.equal(stoppedTracks, 1);
assert(phases.includes("capturing"));
assert(phases.includes("recognizing"));
assert.equal(session.getState().matchCount, 1);
assert.equal(session.getState().phase, "idle");

let retryClock = 0;
let failedCaptures = 0;
let retryTrackStops = 0;
const retrySession = createListeningSession({
  acquireStream: async () => ({
    getTracks: () => [{ stop: () => { retryTrackStops += 1; } }],
  }),
  captureWindow: async () => {
    failedCaptures += 1;
    throw new Error("temporary_capture_failure");
  },
  recognize: async () => ({ title: "unreachable" }),
  maxConsecutiveErrors: 2,
  now: () => {
    retryClock += 9000;
    return retryClock;
  },
});

assert.equal(await retrySession.start({ cadenceMs: 8000 }), true);
await new Promise((resolve) => setTimeout(resolve, 10));
assert.equal(retrySession.isActive(), false);
assert.equal(failedCaptures, 2);
assert.equal(retryTrackStops, 1);
assert.equal(retrySession.getState().phase, "error");
assert.equal(retrySession.getState().errorCount, 2);

console.log("Listening session checks passed");

import assert from "node:assert/strict";
import {
  buildPracticeHref,
  buildSetReturnHref,
  missionForMode,
  mountPracticeContext,
  resolvePracticeContext,
} from "../src/practice-context.js";

const track = {
  artist: "K.M. Session Band",
  bpm: 94,
  id: "track / one",
  key: "9A",
  time: "00:00",
  title: "Warm Up The Room",
};
const draft = { tracks: [track] };

const href = buildPracticeHref("rhythm-roulette", track, "Build this pocket");
assert.equal(href.startsWith("./rhythm-roulette.html?"), true);
assert.equal(new URL(href, "http://setscope.local").searchParams.get("track"), track.id);
assert.equal(new URL(href, "http://setscope.local").searchParams.get("mission"), "Build this pocket");

const missionDraft = {
  tracks: [track],
  practiceMissions: [{
    id: "mission-1",
    modeId: "rhythm-roulette",
    prompt: "Stored session mission",
    status: "active",
    trackId: track.id,
  }],
};
const missionHref = buildPracticeHref("rhythm-roulette", track, "URL fallback", "mission-1");
const missionResolved = resolvePracticeContext({
  draft: missionDraft,
  modeId: "rhythm-roulette",
  search: new URL(missionHref, "http://setscope.local").search,
});
assert.equal(missionResolved.mission, "Stored session mission");
assert.equal(missionResolved.missionId, "mission-1");

const resolved = resolvePracticeContext({
  draft,
  modeId: "rhythm-roulette",
  search: new URL(href, "http://setscope.local").search,
});
assert.equal(resolved.track, track);
assert.equal(resolved.mission, "Build this pocket");
assert.equal(resolvePracticeContext({ draft, modeId: "audio-lab", search: "?track=missing" }), null);
assert.equal(missionForMode("audio-lab", track).includes("9A"), true);

const returnHref = buildSetReturnHref(track, "event-123");
const returnUrl = new URL(returnHref, "http://setscope.local");
assert.equal(returnUrl.searchParams.get("track"), track.id);
assert.equal(returnUrl.searchParams.get("event"), "event-123");

const missionReturnUrl = new URL(buildSetReturnHref(track, "event-123", "mission-1"), "http://setscope.local");
assert.equal(missionReturnUrl.searchParams.get("missionId"), "mission-1");

const storedDraft = {
  ...missionDraft,
  audioEvents: [],
  captureLog: [],
};
const storage = new Map([["setscope-draft-v1", JSON.stringify(storedDraft)]]);
globalThis.localStorage = {
  getItem(key) {
    return storage.get(key) || null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
};
const mounted = mountPracticeContext("rhythm-roulette", {
  draft: storedDraft,
  root: {
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  },
  search: new URL(missionHref, "http://setscope.local").search,
});
mounted.markComplete({ id: "result-1", trackId: track.id });
const completedDraft = JSON.parse(storage.get("setscope-draft-v1"));
assert.equal(completedDraft.practiceMissions[0].status, "complete");
assert.equal(completedDraft.practiceMissions[0].resultEventId, "result-1");

console.log("Practice context checks passed");

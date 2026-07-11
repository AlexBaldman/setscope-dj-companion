import assert from "node:assert/strict";
import {
  buildPracticeHref,
  buildSetReturnHref,
  missionForMode,
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

console.log("Practice context checks passed");

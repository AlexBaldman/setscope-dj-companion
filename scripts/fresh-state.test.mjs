import assert from "node:assert/strict";

const values = new Map();
globalThis.localStorage = {
  getItem(key) {
    return values.get(key) ?? null;
  },
  setItem(key, value) {
    values.set(key, String(value));
  },
  removeItem(key) {
    values.delete(key);
  },
};

const { addTrack, prepareDemoSet, seedDemoTracks, state } = await import("../src/state.js");
assert.equal(state.tracks.length, 1);
assert.equal(state.tracks[0].placeholder, true);
assert.equal(state.tracks[0].title, "Listening for first track");
assert(!state.tracks.some((track) => track.title === "Warm Up The Room"), "fresh state must not silently load story fixtures");

addTrack({ title: "My audio", artist: "Local file", confidence: 64 });
assert.equal(state.tracks.length, 1, "real audio should replace the empty starter moment");
assert.equal(state.tracks[0].title, "My audio");
assert.equal(state.tracks[0].placeholder, false);

state.tracks = [];
assert.equal(prepareDemoSet(), true);
const demoTracks = seedDemoTracks();
assert.equal(demoTracks.length, 4);
assert(demoTracks.every((track) => !track.placeholder));

console.log("Fresh session checks passed");

import assert from "node:assert/strict";

const storage = new Map();
globalThis.localStorage = {
  getItem(key) {
    return storage.get(key) ?? null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
};

const { persistAudioEvent, state } = await import("../src/state.js");
const editedDraft = structuredClone(state);
editedDraft.tracks.push({
  id: "latest-track-edit",
  time: "42:18",
  title: "Concurrent Edit Must Survive",
});
localStorage.setItem("setscope-draft-v1", JSON.stringify(editedDraft));

persistAudioEvent({
  type: "instrument",
  title: "Pitch Gates run",
  detail: "Regression check",
});

const savedDraft = JSON.parse(localStorage.getItem("setscope-draft-v1"));
assert.equal(savedDraft.tracks.some((track) => track.id === "latest-track-edit"), true);
assert.equal(savedDraft.audioEvents[0].title, "Pitch Gates run");
assert.equal(state.audioEvents[0].title, "Pitch Gates run");

console.log("State persistence checks passed");

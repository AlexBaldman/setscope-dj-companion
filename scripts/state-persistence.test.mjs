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

const { addTrack, normalizeTrack, persist, persistAudioEvent, state, uiState } = await import("../src/state.js");
const incompleteTrack = { title: "Pure input" };
const normalizedTrack = normalizeTrack(incompleteTrack);
assert.equal(incompleteTrack.tags, undefined);
assert.deepEqual(normalizedTrack.tags, []);

uiState.query = "ephemeral query";
uiState.reviewOnly = true;
uiState.signalFilter = "analysis";
uiState.archiveList = [{ id: "server-only" }];
persist();
const durableOnly = JSON.parse(localStorage.getItem("setscope-draft-v1"));
assert.equal(durableOnly.schema, "setscope.set-draft");
assert.equal(durableOnly.schemaVersion, 2);
assert.deepEqual(durableOnly.practiceMissions, []);
assert.equal("query" in durableOnly, false);
assert.equal("reviewOnly" in durableOnly, false);
assert.equal("signalFilter" in durableOnly, false);
assert.equal("archiveList" in durableOnly, false);

const beforeAddCount = durableOnly.tracks.length;
addTrack({ title: "Command persistence" });
const afterCommand = JSON.parse(localStorage.getItem("setscope-draft-v1"));
assert.equal(durableOnly.tracks[0].placeholder, true);
assert.equal(afterCommand.tracks.length, beforeAddCount, "the first real track should replace the starter moment");
assert.equal(afterCommand.tracks[0].title, "Command persistence");
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

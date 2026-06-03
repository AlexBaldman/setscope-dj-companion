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

const { midiToFrequency, midiToNote, frequencyToMidi, isPitchedFrame } = await import("../src/pitch-analysis.js");
const { createPitchGatesCompletionEvent, persistPerformanceEvent } = await import("../src/performance-events.js");
const { state } = await import("../src/state.js");

assert.equal(midiToNote(69), "A4");
assert.equal(Math.round(midiToFrequency(69)), 440);
assert.equal(Math.round(frequencyToMidi(440)), 69);
assert.equal(isPitchedFrame({ frequency: 440, midi: 69 }), true);
assert.equal(isPitchedFrame({ frequency: null, midi: null }), false);

const event = createPitchGatesCompletionEvent({
  sourceLabel: "DEMO",
  register: "Mid",
  speed: "rush",
  score: 2760,
  streak: 12,
  resolved: 12,
  totalGates: 12,
  lives: 3,
});

persistPerformanceEvent(event);

const savedDraft = JSON.parse(localStorage.getItem("setscope-draft-v1"));
assert.equal(savedDraft.audioEvents[0].title, "Pitch Gates run");
assert.equal(savedDraft.audioEvents[0].type, "instrument");
assert.equal(savedDraft.audioEvents[0].metadata.modeId, "pitch-gates");
assert.equal(savedDraft.audioEvents[0].metadata.details.speed, "rush");
assert.equal(state.audioEvents[0].metadata.score, 2760);

persistPerformanceEvent({
  kind: "performance",
  modeId: "audio-lab",
  score: 97,
  sourceLabel: "DEMO",
  details: {
    game: "Audio Lab",
    note: "A4",
    frequency: "440.0",
    clarity: 97,
  },
  evidence: {
    summary: "DEMO / A4 / 440.0 Hz / 97%",
  },
});

const labDraft = JSON.parse(localStorage.getItem("setscope-draft-v1"));
assert.equal(labDraft.audioEvents[0].title, "Audio Lab run");
assert.equal(labDraft.audioEvents[0].type, "analysis");
assert.equal(labDraft.audioEvents[0].metadata.modeId, "audio-lab");

console.log("Audio toolbelt checks passed");

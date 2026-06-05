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
const { analyzeLevel, centsFromMidiTarget, findZeroCrossingIndex, tunerPresets } = await import("../src/audio-widgets.js");
const { createPitchGatesCompletionEvent, persistPerformanceEvent } = await import("../src/performance-events.js");
const { audioEventsForTrack, state } = await import("../src/state.js");

assert.equal(midiToNote(69), "A4");
assert.equal(Math.round(midiToFrequency(69)), 440);
assert.equal(Math.round(frequencyToMidi(440)), 69);
assert.equal(isPitchedFrame({ frequency: 440, midi: 69 }), true);
assert.equal(isPitchedFrame({ frequency: null, midi: null }), false);
assert.equal(Math.round(centsFromMidiTarget(69.08, 69)), 8);
assert.equal(tunerPresets.guitar.targets.includes(40), true);
assert.equal(Math.round(analyzeLevel(new Float32Array([0, 0.5, -0.5, 1]), 1).peak * 100), 100);
assert.equal(findZeroCrossingIndex(new Float32Array([-0.1, -0.02, 0.2, 0.1])), 2);

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
  trackId: "track-123",
  time: "12:34",
  details: {
    game: "Audio Lab",
    note: "A4",
    frequency: "440.0",
    clarity: 97,
    cents: 0,
    targetNote: "A4",
    stableHold: true,
    inputGain: 1,
    scopeGain: 2,
    timeScale: 1,
    triggerScope: true,
    rms: 44,
    peak: 88,
    dailyLocks: 3,
    streak: 7,
    trackTitle: "Attached Groove",
  },
  evidence: {
    summary: "DEMO / A4 / 440.0 Hz / 97%",
  },
});

const labDraft = JSON.parse(localStorage.getItem("setscope-draft-v1"));
assert.equal(labDraft.audioEvents[0].title, "Audio Lab run");
assert.equal(labDraft.audioEvents[0].type, "analysis");
assert.equal(labDraft.audioEvents[0].trackId, "track-123");
assert.equal(labDraft.audioEvents[0].time, "12:34");
assert.equal(labDraft.audioEvents[0].metadata.modeId, "audio-lab");
assert.equal(labDraft.audioEvents[0].metadata.details.stableHold, true);
assert.equal(labDraft.audioEvents[0].metadata.details.targetNote, "A4");
assert.equal(labDraft.audioEvents[0].metadata.details.triggerScope, true);
assert.equal(audioEventsForTrack("track-123")[0].title, "Audio Lab run");
assert.equal(audioEventsForTrack({ id: "missing-track" }).length, 0);

console.log("Audio toolbelt checks passed");

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
const { createPitchGatesCompletionEvent, createRhythmRouletteCompletionEvent, persistPerformanceEvent } = await import("../src/performance-events.js");
const { createSetCoachModel } = await import("../src/set-coach.js");
const { createDjMentorModel, createDjMoveCard } = await import("../src/dj-mentor.js");
const {
  appendSelectedTrackNote,
  audioEventsForTrack,
  toggleAudioEventLabel,
  getAudioEventById,
  promoteAudioEventToTrackNotes,
  reassignAudioEvent,
  state,
  visibleTracks,
} = await import("../src/state.js");

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

const rouletteEvent = createRhythmRouletteCompletionEvent({
  bpm: 94,
  groove: 41,
  patternDensity: 13,
  records: [{ artist: "Test Artist", bpm: 94, era: "1970s", title: "Blind Pull" }],
  savedLoops: 1,
  score: 1440,
});
assert.equal(rouletteEvent.modeId, "rhythm-roulette");
assert.equal(rouletteEvent.details.game, "Rhythm Roulette");
assert.equal(rouletteEvent.evidence.summary.includes("Blind Pull"), true);

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

const firstTrack = state.tracks[0];
persistPerformanceEvent({
  kind: "performance",
  modeId: "audio-lab",
  score: 100,
  sourceLabel: "DEMO",
  trackId: firstTrack.id,
  time: firstTrack.time,
  details: {
    game: "Audio Lab",
    note: "E4",
    targetNote: "E4",
    cents: 0,
    stableHold: true,
    rms: 40,
    peak: 76,
    preset: "Guitar",
  },
  evidence: {
    summary: "DEMO / E4 to E4 / locked",
  },
});

const attachedEvent = state.audioEvents[0];
assert.equal(getAudioEventById(attachedEvent.id).trackId, firstTrack.id);
assert.equal(promoteAudioEventToTrackNotes(attachedEvent.id).notes.includes("Toolbelt note"), true);
assert.equal(promoteAudioEventToTrackNotes("missing-event"), null);
const reassigned = reassignAudioEvent(attachedEvent.id, state.tracks[1].id);
assert.equal(reassigned.trackId, state.tracks[1].id);
assert.equal(reassigned.time, state.tracks[1].time);
assert.deepEqual(toggleAudioEventLabel(attachedEvent.id, "practice").labels, ["practice"]);
state.signalFilter = "practice";
assert.equal(visibleTracks().some((track) => track.id === state.tracks[1].id), true);
assert.deepEqual(toggleAudioEventLabel(attachedEvent.id, "practice").labels, []);
assert.equal(visibleTracks().some((track) => track.id === state.tracks[1].id), false);
state.signalFilter = "all";

const coach = createSetCoachModel();
assert.equal(Number.isFinite(coach.readinessScore), true);
assert.equal(coach.stats.trackCount, state.tracks.length);
assert.equal(coach.actions.length > 0, true);
assert.equal(coach.prompts.length, 3);
assert.equal(coach.actions.some((action) => action.action === "review" || action.action === "signals" || action.action === "practice"), true);

const mentor = createDjMentorModel(state.tracks[1]);
assert.equal(mentor.selectedTrackId, state.tracks[1].id);
assert.equal(Boolean(mentor.whyItWorks), true);
assert.equal(Boolean(mentor.practiceMission), true);
assert.equal(Boolean(mentor.digPrompt), true);
assert.equal(mentor.actions.some((action) => action.action === "mentor-note"), true);
const moveCard = createDjMoveCard(attachedEvent);
assert.equal(Boolean(moveCard.why), true);
assert.equal(Boolean(moveCard.practice), true);
assert.equal(appendSelectedTrackNote("Practice this mentor mission").notes.includes("DJ Mentor: Practice this mentor mission"), true);

console.log("Audio toolbelt checks passed");

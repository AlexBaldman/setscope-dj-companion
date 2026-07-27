import { createControlObservation, parseMidiMessage } from "./contracts/midi-observation.js";
import { createInputMapping } from "./contracts/input-timing.js";
import { createMusicalClock, createSemanticInputSpine } from "./input-spine.js";
import { createBeatSchoolAudioEngine } from "./beat-school/audio-engine.js";
import { BEAT_SCHOOL_LANES, beatSchoolStepMs, createBeatSchoolChallenge } from "./beat-school/challenge.js";
import {
  BEAT_SCHOOL_PHASES,
  createBeatSchoolRun,
  latestBeatSchoolScore,
  reduceBeatSchool,
  targetsForBeatSchoolRun,
} from "./beat-school/reducer.js";
import { createBeatSchoolReplay } from "./beat-school/replay.js";
import {
  createBeatSchoolCompletionEvent,
  persistPerformanceEvent,
} from "./performance-events.js";
import { mountPracticeContext } from "./practice-context.js";

const seed = Number(new URLSearchParams(location.search).get("seed")) || 27;
const challenge = createBeatSchoolChallenge({ seed });
const audio = createBeatSchoolAudioEngine();
const practice = mountPracticeContext("beat-school");
const sessionId = `beat-school-${Date.now().toString(36)}`;
const clock = createMusicalClock({ bpm: challenge.bpm, originTimeMs: performance.now() });
const spine = createSemanticInputSpine({
  sessionId,
  clock,
  mappings: createDefaultMappings(),
  latencyProfiles: readLatencyProfiles(),
});

let run = createBeatSchoolRun(challenge);
let busy = false;
let observationCursor = 0;
let timers = [];
let lastSource = "Touch pads";
let savedEvent = null;

const elements = {
  action: document.querySelector("#lessonAction"),
  demo: document.querySelector("#demoRun"),
  midi: document.querySelector("#midiConnect"),
  status: document.querySelector("#inputStatus"),
  track: document.querySelector("#stepTrack"),
  phaseEyebrow: document.querySelector("#phaseEyebrow"),
  title: document.querySelector("#lessonTitle"),
  coachLine: document.querySelector("#coachLine"),
  coachHeading: document.querySelector("#coachHeading"),
  coachDetail: document.querySelector("#coachDetail"),
  moveHeading: document.querySelector("#moveHeading"),
  moveDetail: document.querySelector("#moveDetail"),
  receiptHeading: document.querySelector("#receiptHeading"),
  receiptDetail: document.querySelector("#receiptDetail"),
  needle: document.querySelector("#timingNeedle"),
  bpm: document.querySelector("#bpmValue"),
  score: document.querySelector("#scoreValue"),
  accuracy: document.querySelector("#accuracyValue"),
  pocket: document.querySelector("#pocketValue"),
};

renderStepTrack();
wirePads();
elements.action.addEventListener("click", handleLessonAction);
elements.demo.addEventListener("click", runDemoLesson);
elements.midi.addEventListener("click", connectMidi);
window.addEventListener("keydown", handleKeyDown);
render();

function wirePads() {
  document.querySelectorAll("[data-lane]").forEach((pad) => {
    pad.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      pad.setPointerCapture?.(event.pointerId);
      receivePad(pad.dataset.lane, pointerVelocity(event, pad), "touch", "touch-pads");
    });
  });
}

function handleKeyDown(event) {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  const lane = BEAT_SCHOOL_LANES.find((item) => item.key.toLowerCase() === event.key.toLowerCase());
  if (!lane) return;
  event.preventDefault();
  receivePad(lane.id, 0.82, "keyboard", "computer-keys");
}

function receivePad(lane, velocity, sourceKind, sourceId, timestampMs = performance.now()) {
  const observation = createControlObservation({
    observationId: `${sessionId}-${++observationCursor}`,
    sessionId,
    sourceId,
    sourceKind,
    protocol: sourceKind,
    timestampMs,
    message: { type: "pad-trigger", control: lane, value: velocity, velocity },
  });
  receiveObservation(observation);
}

function receiveObservation(observation) {
  const action = spine.receive(observation, { receivedAtMs: performance.now(), audioTimeSec: audio.currentTime });
  if (!action) return;
  const lane = action.action.replace("beat-pad:", "");
  lastSource = sourceLabel(action.sourceKind);
  audio.playPad(lane, { velocity: action.intensity });
  flashPad(lane);
  elements.status.textContent = `${lastSource.toUpperCase()} / ${lane.toUpperCase()}`;
  if (["imitate", "repair", "perform", "remix"].includes(run.phase) && run.status === "active") {
    run = reduceBeatSchool(run, {
      type: "hit",
      lane,
      atMs: action.correctedAtMs,
      velocity: action.intensity,
      sourceKind: action.sourceKind,
    });
  }
}

async function handleLessonAction() {
  if (busy) return;
  if (run.phase === "save") {
    saveRun(false);
    return;
  }
  if (run.status === "result") {
    const next = BEAT_SCHOOL_PHASES[BEAT_SCHOOL_PHASES.indexOf(run.phase) + 1];
    setPhase(next);
    render();
    return;
  }
  if (run.phase === "hear" || run.phase === "watch") {
    await playReference(run.phase === "watch");
    setPhase(run.phase === "hear" ? "watch" : "imitate");
    render();
    return;
  }
  await capturePass();
}

async function playReference(showTargets) {
  busy = true;
  render();
  const leadMs = 140;
  const startMs = performance.now() + leadMs;
  const durationMs = beatSchoolStepMs(challenge) * 16;
  audio.playPattern(challenge.pattern, {
    startTime: audio.currentTime + leadMs / 1000,
    stepDurationSec: beatSchoolStepMs(challenge) / 1000,
  });
  animatePattern(startMs, challenge.pattern, showTargets);
  await wait(durationMs + leadMs + 80);
  busy = false;
}

async function capturePass() {
  busy = true;
  const leadMs = 600;
  const startMs = performance.now() + leadMs;
  const durationMs = beatSchoolStepMs(challenge) * 16;
  run = reduceBeatSchool(run, { type: "set-phase", phase: run.phase, atMs: startMs });
  clock.restart(startMs);
  render();
  const targets = targetsForBeatSchoolRun(run);
  if (run.phase === "imitate" || run.phase === "repair") {
    audio.playPattern(targets, {
      startTime: audio.currentTime + leadMs / 1000,
      stepDurationSec: beatSchoolStepMs(challenge) / 1000,
    });
  }
  animatePattern(startMs, targets, run.phase !== "perform");
  await wait(durationMs + leadMs + 120);
  if (run.phase === "remix") {
    setPhase("save");
  } else {
    run = reduceBeatSchool(run, { type: "complete-pass" });
  }
  busy = false;
  render();
}

function setPhase(phase) {
  clearTimers();
  run = reduceBeatSchool(run, { type: "set-phase", phase, atMs: performance.now() });
}

function animatePattern(startMs, pattern, showTargets) {
  clearTimers();
  const stepMs = beatSchoolStepMs(challenge);
  for (let step = 0; step < 16; step += 1) {
    timers.push(setTimeout(() => {
      document.querySelectorAll(".beat-step").forEach((node) => node.classList.toggle("playing", Number(node.dataset.step) === step));
      if (!showTargets) return;
      pattern.filter((event) => event.step === step).forEach((event) => flashPad(event.lane));
    }, Math.max(0, startMs + step * stepMs - performance.now())));
  }
}

function render() {
  const result = latestBeatSchoolScore(run);
  const phaseIndex = BEAT_SCHOOL_PHASES.indexOf(run.phase);
  document.querySelectorAll("[data-phase]").forEach((node, index) => {
    node.classList.toggle("active", node.dataset.phase === run.phase);
    node.classList.toggle("done", index < phaseIndex);
    node.disabled = true;
  });
  elements.bpm.textContent = challenge.bpm;
  elements.score.textContent = run.passes.length ? result.score : "--";
  elements.accuracy.textContent = run.passes.length ? `${Math.round(result.accuracy)}%` : "--";
  elements.pocket.textContent = run.passes.length ? Math.round(result.pocket) : "--";
  elements.phaseEyebrow.textContent = `${run.phase.toUpperCase()} / ${phaseTag(run.phase)}`;
  elements.coachLine.textContent = phaseCoach(run.phase);
  elements.action.textContent = actionLabel();
  elements.action.disabled = busy || run.status === "saved";
  elements.demo.disabled = busy;
  renderTargets();
  renderCoach(result);
}

function renderCoach(result) {
  if (!run.passes.length) {
    elements.coachHeading.textContent = "Listen first";
    elements.coachDetail.textContent = "The backbeat lands on beats two and four. Let your hands learn its shape before speed matters.";
    elements.needle.style.left = "50%";
  } else {
    const direction = result.timingBias === "early" ? "Rushing the beat" : result.timingBias === "late" ? "Behind the beat" : result.timingBias === "silent" ? "No matched hits" : "Centered pocket";
    elements.coachHeading.textContent = direction;
    elements.coachDetail.textContent = `${Math.abs(Math.round(result.meanSignedErrorMs))} ms ${result.timingBias === "centered" ? "from center" : result.timingBias}. ${result.missed} missed and ${result.extraHits} extra.`;
    elements.needle.style.left = `${Math.max(4, Math.min(96, 50 + result.meanSignedErrorMs / 2.6))}%`;
  }
  elements.moveHeading.textContent = moveHeading(run.phase);
  elements.moveDetail.textContent = moveDetail(run.phase);
  if (savedEvent) {
    elements.receiptHeading.textContent = `${latestBeatSchoolScore(run).score} point run saved`;
    elements.receiptDetail.textContent = `${lastSource} performance added as rhythm evidence.`;
  }
}

function renderStepTrack() {
  elements.track.innerHTML = Array.from({ length: 16 }, (_, step) => (
    `<span class="beat-step ${step % 4 === 0 ? "beat" : ""}" data-step="${step}" aria-label="Step ${step + 1}"></span>`
  )).join("");
}

function renderTargets() {
  const targetSteps = new Set(targetsForBeatSchoolRun(run).map((target) => target.step));
  document.querySelectorAll(".beat-step").forEach((node) => {
    node.classList.toggle("target", ["watch", "imitate", "repair"].includes(run.phase) && targetSteps.has(Number(node.dataset.step)));
  });
}

async function connectMidi() {
  if (!navigator.requestMIDIAccess) {
    elements.status.textContent = "MIDI NOT SUPPORTED";
    return;
  }
  try {
    const access = await navigator.requestMIDIAccess({ sysex: false });
    let count = 0;
    access.inputs.forEach((input) => {
      count += 1;
      input.onmidimessage = (event) => {
        const observation = parseMidiMessage(event.data, {
          observationId: `${sessionId}-${++observationCursor}`,
          sessionId,
          sourceId: input.id,
          timestampMs: performance.now(),
        });
        if (observation?.message.type === "note-on") receiveObservation(observation);
      };
    });
    elements.status.textContent = count ? `MIDI READY / ${count}` : "MIDI / NO INPUT";
    elements.midi.textContent = count ? "MIDI connected" : "Rescan MIDI";
  } catch {
    elements.status.textContent = "MIDI BLOCKED";
  }
}

function runDemoLesson() {
  if (busy) return;
  run = createBeatSchoolRun(challenge);
  ["imitate", "repair", "perform"].forEach((phase, passIndex) => {
    run = reduceBeatSchool(run, { type: "set-phase", phase, atMs: 0 });
    targetsForBeatSchoolRun(run).forEach((target, index) => {
      run = reduceBeatSchool(run, {
        type: "hit",
        lane: target.lane,
        atMs: target.step * beatSchoolStepMs(challenge) + (passIndex - 1) * 8 + index % 2,
        velocity: target.velocity,
        sourceKind: "demo",
      });
    });
    run = reduceBeatSchool(run, { type: "complete-pass" });
  });
  run = reduceBeatSchool(run, { type: "set-phase", phase: "remix", atMs: 0 });
  challenge.pattern.forEach((target) => {
    run = reduceBeatSchool(run, { type: "hit", lane: target.lane, atMs: target.step * beatSchoolStepMs(challenge), velocity: target.velocity, sourceKind: "demo" });
  });
  run = reduceBeatSchool(run, { type: "set-phase", phase: "save", atMs: 0 });
  lastSource = "Demo";
  saveRun(true);
}

function saveRun(assisted) {
  if (savedEvent) return savedEvent;
  run = reduceBeatSchool(run, { type: "save" });
  const result = latestBeatSchoolScore(run);
  const replay = createBeatSchoolReplay(run);
  const event = createBeatSchoolCompletionEvent({
    challenge,
    ...result,
    replayHash: replay.expectedHash,
    replayActionCount: replay.actions.length,
    sourceLabel: lastSource,
    trackId: practice.track?.id || "",
    time: practice.track?.time || "--:--",
    mission: practice.mission || "",
    assisted,
  });
  savedEvent = persistPerformanceEvent(event);
  practice.markComplete(savedEvent);
  render();
  return savedEvent;
}

function createDefaultMappings() {
  const mappings = [];
  for (const lane of BEAT_SCHOOL_LANES) {
    for (const sourceKind of ["touch", "keyboard", "demo"]) {
      mappings.push(createInputMapping({
        mappingId: `${sourceKind}-${lane.id}`,
        action: `beat-pad:${lane.id}`,
        sourceScope: "any",
        observation: { sourceKind, message: { type: "pad-trigger", control: lane.id } },
        createdAt: "built-in",
      }));
    }
  }
  const midiNotes = { kick: 36, snare: 38, hat: 42, clap: 39 };
  for (const [lane, note] of Object.entries(midiNotes)) {
    mappings.push(createInputMapping({
      mappingId: `midi-${lane}`,
      action: `beat-pad:${lane}`,
      sourceScope: "any",
      observation: { sourceKind: "midi", message: { type: "note-on", note } },
      createdAt: "built-in",
    }));
  }
  return mappings;
}

function readLatencyProfiles() {
  try {
    const profile = JSON.parse(localStorage.getItem("setscope-latency-profile-v1") || "null");
    return profile ? [profile] : [];
  } catch {
    return [];
  }
}

function flashPad(lane) {
  const pad = document.querySelector(`[data-lane="${lane}"]`);
  if (!pad) return;
  pad.classList.add("active");
  setTimeout(() => pad.classList.remove("active"), 95);
}

function pointerVelocity(event, pad) {
  if (Number.isFinite(event.pressure) && event.pressure > 0) return Math.max(0.35, event.pressure);
  const rect = pad.getBoundingClientRect();
  return Math.max(0.45, Math.min(1, 1 - (event.clientY - rect.top) / rect.height * 0.3));
}

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
  document.querySelectorAll(".beat-step").forEach((node) => node.classList.remove("playing"));
}

function wait(ms) {
  return new Promise((resolve) => {
    timers.push(setTimeout(resolve, ms));
  });
}

function actionLabel() {
  if (busy) return run.phase === "hear" || run.phase === "watch" ? "Playing..." : "Get ready...";
  if (run.status === "result") {
    const next = BEAT_SCHOOL_PHASES[BEAT_SCHOOL_PHASES.indexOf(run.phase) + 1];
    return next === "repair" ? "Repair weak spot" : next === "perform" ? "Perform solo" : "Build a remix";
  }
  return {
    hear: "Hear groove",
    watch: "Watch the pads",
    imitate: "Imitate the beat",
    repair: "Repair the pocket",
    perform: "Perform solo",
    remix: "Record remix",
    save: run.status === "saved" ? "Run saved" : "Save run",
  }[run.phase];
}

function phaseTag(phase) {
  return { hear: "reference", watch: "shape", imitate: "guided", repair: "focus", perform: "memory", remix: "create", save: "receipt" }[phase];
}

function phaseCoach(phase) {
  return {
    hear: "Listen for the kick and snare conversation.",
    watch: "Connect each sound to a color and pad.",
    imitate: "Play with the reference. Accuracy comes before speed.",
    repair: "Repeat the move that needs the most attention.",
    perform: "Own the bar without target flashes.",
    remix: "Use all four pads to make the pattern yours.",
    save: "Keep the receipt and bring the pocket into a set.",
  }[phase];
}

function moveHeading(phase) {
  return { hear: "Reference pass", watch: "Visual pass", imitate: "Supported copy", repair: "Weak-spot loop", perform: "One-bar test", remix: "Free pattern", save: "Evidence ready" }[phase];
}

function moveDetail(phase) {
  return {
    hear: "Tap any pad to explore. Press Hear groove when you are ready.",
    watch: "The timeline and pads will light with the reference beat.",
    imitate: "You get the reference sound and visual targets for one bar.",
    repair: "Only the least secure lane repeats. Keep the motion loose.",
    perform: "One bar, no target flashes. Trust the shape you learned.",
    remix: "Record a fresh one-bar idea. Every hit snaps to the grid.",
    save: "Save this run as evidence in your musician skill graph.",
  }[phase];
}

function sourceLabel(kind) {
  return { touch: "Touch pads", keyboard: "Keyboard", midi: "MIDI", demo: "Demo" }[kind] || "Controller";
}

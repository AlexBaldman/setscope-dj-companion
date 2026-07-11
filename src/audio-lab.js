import { createAudioInputSession } from "./audio-session.js";
import {
  analyzeLevel,
  centsFromMidiTarget,
  findZeroCrossingIndex,
  formatTarget,
  loadPracticeStats,
  savePracticeStats,
  tunerPresets,
} from "./audio-widgets.js";
import { createPerformanceEvent, persistPerformanceEvent } from "./performance-events.js";
import { createPitchAnalyzer, isPitchedFrame, midiToFrequency, midiToNote } from "./pitch-analysis.js";
import { mountPracticeContext } from "./practice-context.js";

const bufferLength = 2048;
const draftStorageKey = "setscope-draft-v1";
const practiceStorageKey = "setscope-audio-lab-practice-v1";
const canvas = document.querySelector("#scopeCanvas");
const practiceContext = mountPracticeContext("audio-lab");
const context = canvas.getContext("2d");
const scopeBuffer = new Float32Array(bufferLength);
const audioSession = createAudioInputSession({
  bufferLength,
  onEnded: () => {
    currentFrame = null;
    renderFrame();
    setAudioStatus("INPUT OFF", false);
  },
});
const pitchAnalyzer = createPitchAnalyzer({ bufferLength });

const els = {
  audioStatus: document.querySelector("#audioStatus"),
  centValue: document.querySelector("#centValue"),
  clarityValue: document.querySelector("#clarityValue"),
  freezeScopeBtn: document.querySelector("#freezeScopeBtn"),
  gainControl: document.querySelector("#gainControl"),
  gainValue: document.querySelector("#gainValue"),
  holdDetail: document.querySelector("#holdDetail"),
  holdMeter: document.querySelector("#holdMeter"),
  holdStatus: document.querySelector("#holdStatus"),
  inputGainControl: document.querySelector("#inputGainControl"),
  inputGainValue: document.querySelector("#inputGainValue"),
  liveHz: document.querySelector("#liveHz"),
  liveMidi: document.querySelector("#liveMidi"),
  liveNote: document.querySelector("#liveNote"),
  peakMeter: document.querySelector("#peakMeter"),
  peakValue: document.querySelector("#peakValue"),
  practiceDetail: document.querySelector("#practiceDetail"),
  practiceStatus: document.querySelector("#practiceStatus"),
  rmsMeter: document.querySelector("#rmsMeter"),
  rmsValue: document.querySelector("#rmsValue"),
  snapshotDetail: document.querySelector("#snapshotDetail"),
  snapshotStatus: document.querySelector("#snapshotStatus"),
  sourceLabel: document.querySelector("#sourceLabel"),
  targetNote: document.querySelector("#targetNote"),
  targetControl: document.querySelector(".target-control"),
  timeScaleControl: document.querySelector("#timeScaleControl"),
  timeScaleValue: document.querySelector("#timeScaleValue"),
  trackAttachSelect: document.querySelector("#trackAttachSelect"),
  triggerScopeBtn: document.querySelector("#triggerScopeBtn"),
  tuningMeter: document.querySelector("#tuningMeter"),
};

const targetHoldMs = 2000;
const targetToleranceCents = 8;
const dailyGoal = 5;
let animationId;
let selectedDemoMidi = 57;
let activePreset = "chromatic";
let targetMidi = 57;
let inputGain = 1;
let scopeGain = 2;
let timeScale = 1;
let scopeFrozen = false;
let triggerScope = false;
let holdStartedAt = null;
let holdLocked = false;
let lastLevel = { rms: 0, peak: 0 };
let practiceStats = loadPracticeStats(practiceStorageKey);
let currentFrame = null;

resizeCanvas();
renderTargetButtons();
populateTrackAttachSelect(practiceContext.track?.id);
drawScope();
renderFrame();
renderPractice();

document.querySelector("#toneBtn").addEventListener("click", () => useDemoTone());
document.querySelector("#micBtn").addEventListener("click", () => useMicrophone());
document.querySelector("#shareBtn").addEventListener("click", () => useSharedAudio());
document.querySelector("#fileBtn").addEventListener("click", () => document.querySelector("#audioFileInput").click());
document.querySelector("#audioFileInput").addEventListener("change", (event) => useAudioFile(event.target.files[0]));
document.querySelector("#stopAudioBtn").addEventListener("click", stopAudio);
document.querySelector("#logSnapshotBtn").addEventListener("click", logSnapshot);
els.freezeScopeBtn.addEventListener("click", toggleFreezeScope);
els.triggerScopeBtn.addEventListener("click", toggleTriggerScope);
els.inputGainControl.addEventListener("input", () => {
  inputGain = Number(els.inputGainControl.value);
  els.inputGainValue.textContent = `${inputGain.toFixed(1)}x`;
});
els.gainControl.addEventListener("input", () => {
  scopeGain = Number(els.gainControl.value);
  els.gainValue.textContent = `${scopeGain}x`;
});
els.timeScaleControl.addEventListener("input", () => {
  timeScale = Number(els.timeScaleControl.value);
  els.timeScaleValue.textContent = `${timeScale}x`;
});
document.querySelectorAll("[data-demo-midi]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedDemoMidi = Number(button.dataset.demoMidi);
    setActive(document.querySelectorAll("[data-demo-midi]"), button);
    audioSession.setDemoFrequency(selectedDemoMidi);
  });
});
document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    activePreset = button.dataset.preset;
    setActive(document.querySelectorAll("[data-preset]"), button);
    const preset = tunerPresets[activePreset];
    targetMidi = preset.targets.includes(targetMidi) ? targetMidi : preset.targets[0];
    renderTargetButtons();
  });
});
window.addEventListener("resize", () => {
  resizeCanvas();
  drawScope();
});

async function useMicrophone() {
  try {
    await audioSession.useMicrophone();
    startAnalysis("MIC READY");
  } catch {
    setAudioStatus("MIC BLOCKED", false);
  }
}

async function useSharedAudio() {
  try {
    await audioSession.useSharedAudio();
    startAnalysis("SHARED READY");
  } catch (error) {
    setAudioStatus(error.message === "shared_audio_missing" ? "NO AUDIO SHARED" : "SHARE ENDED", false);
  }
}

async function useAudioFile(file) {
  if (!file) return;
  try {
    await audioSession.useAudioFile(file);
    startAnalysis("FILE READY");
  } catch {
    setAudioStatus("FILE ERROR", false);
  }
}

async function useDemoTone() {
  try {
    await audioSession.useDemoTone({ midi: selectedDemoMidi });
    startAnalysis("DEMO READY");
  } catch {
    stopAudio();
    setAudioStatus("DEMO ERROR", false);
  }
}

function startAnalysis(status) {
  pitchAnalyzer.reset();
  setAudioStatus(status, true);
  startAnimation();
}

function stopAudio() {
  audioSession.stop();
  currentFrame = null;
  lastLevel = { rms: 0, peak: 0 };
  setAudioStatus("INPUT OFF", false);
  renderFrame();
  drawScope();
}

function startAnimation() {
  if (animationId) return;
  animationId = requestAnimationFrame(update);
}

function update() {
  animationId = null;
  const frame = pitchAnalyzer.readFrame(audioSession);
  currentFrame = isPitchedFrame(frame) ? frame : null;
  renderFrame();
  updateHoldState();
  if (!scopeFrozen) drawScope();
  if (audioSession.isActive()) {
    animationId = requestAnimationFrame(update);
  }
}

function renderFrame() {
  const source = audioSession.getSourceLabel();
  els.sourceLabel.textContent = source.toUpperCase();
  if (!currentFrame) {
    els.liveNote.textContent = "--";
    els.liveHz.textContent = "--";
    els.liveMidi.textContent = "--";
    els.clarityValue.textContent = "--";
    els.centValue.textContent = "--";
    els.rmsValue.textContent = "--";
    els.peakValue.textContent = "--";
    renderLevelMeter(lastLevel);
    els.tuningMeter.style.setProperty("--needle", "50%");
    resetHold();
    return;
  }
  const roundedMidi = Math.round(currentFrame.midi);
  const cents = centsFromMidiTarget(currentFrame.midi, targetMidi);
  els.liveNote.textContent = midiToNote(roundedMidi);
  els.liveHz.textContent = currentFrame.frequency.toFixed(1);
  els.liveMidi.textContent = String(roundedMidi);
  els.clarityValue.textContent = `${Math.round(currentFrame.clarity * 100)}%`;
  els.centValue.textContent = `${cents > 0 ? "+" : ""}${Math.round(cents)}`;
  els.rmsValue.textContent = `${Math.round(lastLevel.rms * 100)}%`;
  els.peakValue.textContent = `${Math.round(lastLevel.peak * 100)}%`;
  els.tuningMeter.style.setProperty("--needle", `${Math.max(4, Math.min(96, 50 + cents / 2))}%`);
}

function drawScope() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#07100c";
  context.fillRect(0, 0, width, height);
  drawCenterLine(width, height);

  const analyser = audioSession.getAnalyser();
  if (!analyser) {
    drawIdleTrace(width, height);
    return;
  }
  analyser.getFloatTimeDomainData(scopeBuffer);
  lastLevel = analyzeLevel(scopeBuffer, inputGain);
  renderLevelMeter(lastLevel);
  const sampleCount = Math.max(256, Math.floor(scopeBuffer.length / timeScale));
  const triggerIndex = triggerScope ? findZeroCrossingIndex(scopeBuffer) : 0;
  const maxStart = Math.max(0, scopeBuffer.length - sampleCount);
  const startIndex = Math.min(triggerIndex, maxStart);
  context.strokeStyle = currentFrame ? "#7ef7ae" : "rgba(126, 247, 174, 0.42)";
  context.lineWidth = 2;
  context.beginPath();
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = scopeBuffer[startIndex + index] || 0;
    const x = (index / (sampleCount - 1)) * width;
    const y = height / 2 + sample * inputGain * scopeGain * (height * 0.22);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
}

function drawIdleTrace(width, height) {
  context.strokeStyle = "rgba(126, 247, 174, 0.28)";
  context.lineWidth = 2;
  context.beginPath();
  for (let index = 0; index < 96; index += 1) {
    const x = (index / 95) * width;
    const y = height / 2 + Math.sin(index / 4) * 8;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
}

function drawCenterLine(width, height) {
  context.strokeStyle = "rgba(126, 247, 174, 0.14)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, height / 2);
  context.lineTo(width, height / 2);
  context.stroke();
}

function logSnapshot() {
  if (!currentFrame) {
    els.snapshotStatus.textContent = "Need signal";
    els.snapshotDetail.textContent = "Start demo, mic, shared audio, or a file first.";
    return;
  }
  const sourceLabel = audioSession.getSourceLabel();
  const note = midiToNote(Math.round(currentFrame.midi));
  const frequency = currentFrame.frequency.toFixed(1);
  const clarity = Math.round(currentFrame.clarity * 100);
  const cents = Math.round(centsFromMidiTarget(currentFrame.midi, targetMidi));
  const attachedTrack = getAttachedTrack();
  const savedEvent = persistPerformanceEvent(createPerformanceEvent({
    modeId: "audio-lab",
    score: holdLocked ? 100 : clarity,
    streak: practiceStats.streak,
    sourceLabel,
    trackId: attachedTrack?.id || "",
    time: attachedTrack?.time || "--:--",
    details: {
      game: "Audio Lab",
      note,
      frequency,
      clarity,
      cents,
      targetNote: midiToNote(targetMidi),
      targetFrequency: midiToFrequency(targetMidi).toFixed(1),
      stableHold: holdLocked,
      preset: tunerPresets[activePreset].label,
      inputGain,
      scopeGain,
      timeScale,
      triggerScope,
      rms: Math.round(lastLevel.rms * 100),
      peak: Math.round(lastLevel.peak * 100),
      dailyLocks: practiceStats.dailyLocks,
      streak: practiceStats.streak,
      trackTitle: attachedTrack?.title || "",
      mission: practiceContext.mission,
    },
    evidence: {
      summary: `${sourceLabel.toUpperCase()} / ${note} to ${midiToNote(targetMidi)} / ${frequency} Hz / ${clarity}%${attachedTrack ? ` / ${attachedTrack.title}` : ""}`,
    },
  }));
  practiceContext.markComplete(savedEvent);
  els.snapshotStatus.textContent = "Logged";
  els.snapshotDetail.textContent = `${note} -> ${midiToNote(targetMidi)} / ${frequency} Hz / ${clarity}%${attachedTrack ? ` / ${attachedTrack.time}` : ""}`;
}

function updateHoldState(now = performance.now()) {
  if (!currentFrame) return;
  const cents = centsFromMidiTarget(currentFrame.midi, targetMidi);
  const stable = Math.abs(cents) <= targetToleranceCents;
  if (!stable) {
    holdStartedAt = null;
    holdLocked = false;
    renderHold(0, "Find target", `Aim for ${midiToNote(targetMidi)} within ${targetToleranceCents} cents`);
    return;
  }
  holdStartedAt = holdStartedAt || now;
  const progress = Math.min(1, (now - holdStartedAt) / targetHoldMs);
  const nextLocked = progress >= 1;
  if (nextLocked && !holdLocked) recordPracticeLock();
  holdLocked = nextLocked;
  renderHold(progress, holdLocked ? "Locked" : "Hold steady", `${Math.round(progress * 100)}% stable on ${midiToNote(targetMidi)}`);
}

function resetHold() {
  holdStartedAt = null;
  holdLocked = false;
  renderHold(0, "Hold target", `Within ${targetToleranceCents} cents for ${targetHoldMs / 1000} seconds`);
}

function renderHold(progress, status, detail) {
  els.holdMeter.style.setProperty("--hold", `${Math.round(progress * 100)}%`);
  els.holdStatus.textContent = status;
  els.holdDetail.textContent = detail;
}

function toggleFreezeScope() {
  scopeFrozen = !scopeFrozen;
  els.freezeScopeBtn.classList.toggle("active", scopeFrozen);
  els.freezeScopeBtn.setAttribute("aria-pressed", String(scopeFrozen));
  els.freezeScopeBtn.textContent = scopeFrozen ? "Live scope" : "Freeze";
  if (!scopeFrozen) drawScope();
}

function toggleTriggerScope() {
  triggerScope = !triggerScope;
  els.triggerScopeBtn.classList.toggle("active", triggerScope);
  els.triggerScopeBtn.setAttribute("aria-pressed", String(triggerScope));
  els.triggerScopeBtn.textContent = triggerScope ? "Free run" : "Trigger";
}

function renderTargetButtons() {
  const preset = tunerPresets[activePreset] || tunerPresets.chromatic;
  els.targetControl.innerHTML = preset.targets
    .map((midi) => {
      const target = formatTarget(midi);
      return `<button class="${midi === targetMidi ? "active" : ""}" data-target-midi="${midi}" title="${target.frequency.toFixed(1)} Hz">${target.label}</button>`;
    })
    .join("");
  els.targetControl.querySelectorAll("[data-target-midi]").forEach((button) => {
    button.addEventListener("click", () => {
      targetMidi = Number(button.dataset.targetMidi);
      setActive(els.targetControl.querySelectorAll("[data-target-midi]"), button);
      els.targetNote.textContent = midiToNote(targetMidi);
      resetHold();
    });
  });
  els.targetNote.textContent = midiToNote(targetMidi);
  resetHold();
}

function renderLevelMeter(level) {
  const rms = Math.min(100, Math.round(level.rms * 100));
  const peak = Math.min(100, Math.round(level.peak * 100));
  els.rmsMeter.style.setProperty("--rms", `${rms}%`);
  els.peakMeter.style.setProperty("--peak", `${peak}%`);
  if (!currentFrame) {
    els.rmsValue.textContent = rms ? `${rms}%` : "--";
    els.peakValue.textContent = peak ? `${peak}%` : "--";
  }
}

function recordPracticeLock() {
  practiceStats.dailyLocks += 1;
  practiceStats.streak += 1;
  practiceStats.lastLockedAt = new Date().toISOString();
  savePracticeStats(practiceStorageKey, practiceStats);
  renderPractice();
}

function renderPractice() {
  const daily = Math.min(practiceStats.dailyLocks, dailyGoal);
  els.practiceStatus.textContent = `Daily ${daily}/${dailyGoal}`;
  els.practiceDetail.textContent = `Streak ${practiceStats.streak} / ${dailyGoal - daily > 0 ? `${dailyGoal - daily} locks to goal` : "daily goal complete"}`;
}

function populateTrackAttachSelect(selectedTrackId = "") {
  const draft = readDraft();
  const tracks = Array.isArray(draft?.tracks) ? draft.tracks : [];
  els.trackAttachSelect.innerHTML = `<option value="">Set timeline</option>`;
  tracks.slice(0, 60).forEach((track) => {
    const option = document.createElement("option");
    option.value = track.id || "";
    option.textContent = `${track.time || "--:--"} / ${track.title || "Untitled track"}`;
    option.selected = track.id === selectedTrackId;
    els.trackAttachSelect.appendChild(option);
  });
}

function getAttachedTrack() {
  const id = els.trackAttachSelect.value;
  if (!id) return null;
  const tracks = readDraft()?.tracks || [];
  return tracks.find((track) => track.id === id) || null;
}

function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(draftStorageKey) || "null");
  } catch {
    return null;
  }
}

function setAudioStatus(text, active) {
  els.audioStatus.textContent = text;
  els.audioStatus.classList.toggle("active", active);
}

function setActive(buttons, activeButton) {
  buttons.forEach((button) => button.classList.toggle("active", button === activeButton));
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  canvas.width = Math.floor(bounds.width * (window.devicePixelRatio || 1));
  canvas.height = Math.floor(bounds.height * (window.devicePixelRatio || 1));
}

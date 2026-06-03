import { createAudioInputSession } from "./audio-session.js";
import { createPerformanceEvent, persistPerformanceEvent } from "./performance-events.js";
import { createPitchAnalyzer, isPitchedFrame, midiToFrequency, midiToNote } from "./pitch-analysis.js";

const bufferLength = 2048;
const canvas = document.querySelector("#scopeCanvas");
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
  liveHz: document.querySelector("#liveHz"),
  liveMidi: document.querySelector("#liveMidi"),
  liveNote: document.querySelector("#liveNote"),
  snapshotDetail: document.querySelector("#snapshotDetail"),
  snapshotStatus: document.querySelector("#snapshotStatus"),
  sourceLabel: document.querySelector("#sourceLabel"),
  targetNote: document.querySelector("#targetNote"),
  timeScaleControl: document.querySelector("#timeScaleControl"),
  timeScaleValue: document.querySelector("#timeScaleValue"),
  tuningMeter: document.querySelector("#tuningMeter"),
};

const targetHoldMs = 2000;
const targetToleranceCents = 8;
let animationId;
let selectedDemoMidi = 57;
let targetMidi = 57;
let scopeGain = 2;
let timeScale = 1;
let scopeFrozen = false;
let holdStartedAt = null;
let holdLocked = false;
let currentFrame = null;

resizeCanvas();
drawScope();
renderFrame();

document.querySelector("#toneBtn").addEventListener("click", () => useDemoTone());
document.querySelector("#micBtn").addEventListener("click", () => useMicrophone());
document.querySelector("#shareBtn").addEventListener("click", () => useSharedAudio());
document.querySelector("#fileBtn").addEventListener("click", () => document.querySelector("#audioFileInput").click());
document.querySelector("#audioFileInput").addEventListener("change", (event) => useAudioFile(event.target.files[0]));
document.querySelector("#stopAudioBtn").addEventListener("click", stopAudio);
document.querySelector("#logSnapshotBtn").addEventListener("click", logSnapshot);
els.freezeScopeBtn.addEventListener("click", toggleFreezeScope);
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
document.querySelectorAll("[data-target-midi]").forEach((button) => {
  button.addEventListener("click", () => {
    targetMidi = Number(button.dataset.targetMidi);
    setActive(document.querySelectorAll("[data-target-midi]"), button);
    els.targetNote.textContent = midiToNote(targetMidi);
    resetHold();
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
    els.tuningMeter.style.setProperty("--needle", "50%");
    resetHold();
    return;
  }
  const roundedMidi = Math.round(currentFrame.midi);
  const cents = centsFromTarget(currentFrame.midi, targetMidi);
  els.liveNote.textContent = midiToNote(roundedMidi);
  els.liveHz.textContent = currentFrame.frequency.toFixed(1);
  els.liveMidi.textContent = String(roundedMidi);
  els.clarityValue.textContent = `${Math.round(currentFrame.clarity * 100)}%`;
  els.centValue.textContent = `${cents > 0 ? "+" : ""}${Math.round(cents)}`;
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
  const sampleCount = Math.max(256, Math.floor(scopeBuffer.length / timeScale));
  context.strokeStyle = currentFrame ? "#7ef7ae" : "rgba(126, 247, 174, 0.42)";
  context.lineWidth = 2;
  context.beginPath();
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = scopeBuffer[index] || 0;
    const x = (index / (sampleCount - 1)) * width;
    const y = height / 2 + sample * scopeGain * (height * 0.22);
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
  const cents = Math.round(centsFromTarget(currentFrame.midi, targetMidi));
  persistPerformanceEvent(createPerformanceEvent({
    modeId: "audio-lab",
    score: holdLocked ? 100 : clarity,
    sourceLabel,
    details: {
      game: "Audio Lab",
      note,
      frequency,
      clarity,
      cents,
      targetNote: midiToNote(targetMidi),
      targetFrequency: midiToFrequency(targetMidi).toFixed(1),
      stableHold: holdLocked,
      scopeGain,
      timeScale,
    },
    evidence: {
      summary: `${sourceLabel.toUpperCase()} / ${note} to ${midiToNote(targetMidi)} / ${frequency} Hz / ${clarity}%`,
    },
  }));
  els.snapshotStatus.textContent = "Logged";
  els.snapshotDetail.textContent = `${note} -> ${midiToNote(targetMidi)} / ${frequency} Hz / ${clarity}%`;
}

function updateHoldState(now = performance.now()) {
  if (!currentFrame) return;
  const cents = centsFromTarget(currentFrame.midi, targetMidi);
  const stable = Math.abs(cents) <= targetToleranceCents;
  if (!stable) {
    holdStartedAt = null;
    holdLocked = false;
    renderHold(0, "Find target", `Aim for ${midiToNote(targetMidi)} within ${targetToleranceCents} cents`);
    return;
  }
  holdStartedAt = holdStartedAt || now;
  const progress = Math.min(1, (now - holdStartedAt) / targetHoldMs);
  holdLocked = progress >= 1;
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

function centsFromTarget(midi, target) {
  return (midi - target) * 100;
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

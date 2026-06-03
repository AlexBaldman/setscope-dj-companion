import { createAudioInputSession } from "./audio-session.js";
import { createPerformanceEvent, persistPerformanceEvent } from "./performance-events.js";
import { createPitchAnalyzer, isPitchedFrame, midiToNote } from "./pitch-analysis.js";

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
  liveHz: document.querySelector("#liveHz"),
  liveMidi: document.querySelector("#liveMidi"),
  liveNote: document.querySelector("#liveNote"),
  snapshotDetail: document.querySelector("#snapshotDetail"),
  snapshotStatus: document.querySelector("#snapshotStatus"),
  sourceLabel: document.querySelector("#sourceLabel"),
  tuningMeter: document.querySelector("#tuningMeter"),
};

let animationId;
let selectedDemoMidi = 57;
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
document.querySelectorAll("[data-demo-midi]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedDemoMidi = Number(button.dataset.demoMidi);
    setActive(document.querySelectorAll("[data-demo-midi]"), button);
    audioSession.setDemoFrequency(selectedDemoMidi);
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
  drawScope();
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
    return;
  }
  const roundedMidi = Math.round(currentFrame.midi);
  const cents = (currentFrame.midi - roundedMidi) * 100;
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

  const analyser = audioSession.getAnalyser();
  if (!analyser) {
    drawIdleTrace(width, height);
    return;
  }
  analyser.getFloatTimeDomainData(scopeBuffer);
  context.strokeStyle = currentFrame ? "#7ef7ae" : "rgba(126, 247, 174, 0.42)";
  context.lineWidth = 2;
  context.beginPath();
  scopeBuffer.forEach((sample, index) => {
    const x = (index / (scopeBuffer.length - 1)) * width;
    const y = height / 2 + sample * (height * 0.42);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
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

function logSnapshot() {
  const sourceLabel = audioSession.getSourceLabel();
  const note = currentFrame ? midiToNote(Math.round(currentFrame.midi)) : "--";
  const frequency = currentFrame ? currentFrame.frequency.toFixed(1) : "--";
  const clarity = currentFrame ? Math.round(currentFrame.clarity * 100) : 0;
  persistPerformanceEvent(createPerformanceEvent({
    modeId: "audio-lab",
    score: clarity,
    sourceLabel,
    details: {
      game: "Audio Lab",
      note,
      frequency,
      clarity,
    },
    evidence: {
      summary: `${sourceLabel.toUpperCase()} / ${note} / ${frequency} Hz / ${clarity}%`,
    },
  }));
  els.snapshotStatus.textContent = "Logged";
  els.snapshotDetail.textContent = `${note} / ${frequency} Hz / ${clarity}%`;
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

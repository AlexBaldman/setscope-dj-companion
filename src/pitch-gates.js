import { createAudioInputSession } from "./audio-session.js";
import { createPitchGatesCompletionEvent, persistPerformanceEvent } from "./performance-events.js";
import { createPitchAnalyzer, isPitchedFrame, midiToNote } from "./pitch-analysis.js";
import { mountPracticeContext } from "./practice-context.js";
import { createPitchGatesChallenge } from "./pitch-gates/challenge.js";
import {
  advancePitchGatesTo,
  applyPitchInput,
  createPitchGatesRun,
  getNextPitchGate,
  projectPitchGate,
} from "./pitch-gates/reducer.js";
import { createPitchGatesReplay } from "./pitch-gates/replay.js";

const practiceContext = mountPracticeContext("pitch-gates");
const canvas = document.querySelector("#pitchGameCanvas");
const context = canvas.getContext("2d");
const els = {
  audioStatus: document.querySelector("#audioStatus"),
  bestScore: document.querySelector("#bestScore"),
  gateCount: document.querySelector("#gateCount"),
  hitLog: document.querySelector("#hitLog"),
  liveClarity: document.querySelector("#liveClarity"),
  liveHz: document.querySelector("#liveHz"),
  liveNote: document.querySelector("#liveNote"),
  lives: document.querySelector("#lives"),
  overlayStatus: document.querySelector("#overlayStatus"),
  rangeLabel: document.querySelector("#rangeLabel"),
  readyOverlay: document.querySelector("#readyOverlay"),
  score: document.querySelector("#score"),
  streak: document.querySelector("#streak"),
  targetNote: document.querySelector("#targetNote"),
  tuningMeter: document.querySelector("#tuningMeter"),
};

const registers = {
  low: { base: 45, label: "Low" },
  mid: { base: 57, label: "Mid" },
  high: { base: 69, label: "High" },
};
const totalGates = 12;
const bufferLength = 2048;

const audioSession = createAudioInputSession({
  bufferLength,
  onEnded: () => {
    currentFrame = null;
    updatePitchReadout();
    setAudioStatus("INPUT OFF", false);
  },
});
const pitchAnalyzer = createPitchAnalyzer({ bufferLength });
let animationId;
let register = "mid";
let speed = "groove";
let currentFrame = null;
let game = createPitchGatesRun(createPitchGatesChallenge({ register, speed, totalGates }));
game = { ...game, status: "idle" };
let orbY = 180;
let roundClock = null;
let consumedEventCount = 0;
let roundSaved = false;
let lastInputSampleAt = -Infinity;
let lastInputHadPitch = false;

els.bestScore.textContent = formatScore(Number(localStorage.getItem("setscope-pitch-best") || 0));
resizeCanvas();
drawFrame();
renderGame();

document.querySelector("#micBtn").addEventListener("click", () => useMicrophone());
document.querySelector("#shareBtn").addEventListener("click", () => useSharedAudio());
document.querySelector("#toneBtn").addEventListener("click", () => useDemoTone());
document.querySelector("#fileBtn").addEventListener("click", () => document.querySelector("#audioFileInput").click());
document.querySelector("#audioFileInput").addEventListener("change", (event) => useAudioFile(event.target.files[0]));
document.querySelector("#stopAudioBtn").addEventListener("click", () => stopAudio());
document.querySelector("#startRoundBtn").addEventListener("click", startRound);
document.querySelectorAll("[data-register]").forEach((button) => {
  button.addEventListener("click", () => {
    if (game.status === "running") return;
    register = button.dataset.register;
    setActive(document.querySelectorAll("[data-register]"), button);
    els.rangeLabel.textContent = registers[register].label;
    syncDemoToneToTarget();
    if (game.status !== "running") drawFrame();
  });
});
document.querySelectorAll("[data-speed]").forEach((button) => {
  button.addEventListener("click", () => {
    if (game.status === "running") return;
    speed = button.dataset.speed;
    setActive(document.querySelectorAll("[data-speed]"), button);
  });
});
window.addEventListener("resize", () => {
  resizeCanvas();
  drawFrame();
});

async function useMicrophone() {
  try {
    await audioSession.useMicrophone();
    pitchAnalyzer.reset();
    setAudioStatus("MIC READY", true);
    startAnimation();
  } catch {
    setAudioStatus("MIC BLOCKED", false);
  }
}

async function useSharedAudio() {
  try {
    await audioSession.useSharedAudio();
    pitchAnalyzer.reset();
    setAudioStatus("SHARED READY", true);
    startAnimation();
  } catch (error) {
    setAudioStatus(error.message === "shared_audio_missing" ? "NO AUDIO SHARED" : "SHARE ENDED", false);
  }
}

async function useAudioFile(file) {
  if (!file) return;
  try {
    await audioSession.useAudioFile(file);
    pitchAnalyzer.reset();
    setAudioStatus("FILE READY", true);
    startAnimation();
  } catch {
    setAudioStatus("FILE ERROR", false);
  }
}

async function useDemoTone() {
  try {
    await audioSession.useDemoTone({ midi: registers[register].base });
    pitchAnalyzer.reset();
    setAudioStatus("DEMO READY", true);
    startAnimation();
  } catch {
    stopAudio();
    setAudioStatus("DEMO ERROR", false);
  }
}

function stopAudio() {
  audioSession.stop();
  currentFrame = null;
  updatePitchReadout();
  setAudioStatus("INPUT OFF", false);
}

function startRound() {
  const challenge = createPitchGatesChallenge({ seed: Date.now(), register, speed, totalGates });
  game = createPitchGatesRun(challenge);
  roundClock = createRoundClock();
  consumedEventCount = 0;
  roundSaved = false;
  lastInputSampleAt = -Infinity;
  lastInputHadPitch = false;
  orbY = canvas.clientHeight / 2;
  els.readyOverlay.classList.add("hidden");
  appendLog("ROUND", `${registers[register].label} / ${speed}`);
  syncDemoToneToTarget();
  renderGame();
  startAnimation();
}

function startAnimation() {
  if (animationId) return;
  animationId = requestAnimationFrame(update);
}

function update(now) {
  animationId = null;
  readPitch();
  if (game.status === "running") {
    const elapsedMs = readRoundClock(now);
    const hasPitch = Boolean(currentFrame);
    if (elapsedMs - lastInputSampleAt >= 50 || hasPitch !== lastInputHadPitch) {
      game = applyPitchInput(game, {
        atMs: elapsedMs,
        midi: currentFrame?.midi ?? null,
        clarity: currentFrame?.clarity ?? 0,
      });
      lastInputSampleAt = elapsedMs;
      lastInputHadPitch = hasPitch;
    }
    game = advancePitchGatesTo(game, elapsedMs);
    consumeDomainEvents();
    if (game.status !== "running") endRound();
  }
  drawFrame();
  if (game.status === "running" || audioSession.isActive()) {
    animationId = requestAnimationFrame(update);
  }
}

function readPitch() {
  const frame = pitchAnalyzer.readFrame(audioSession);
  currentFrame = isPitchedFrame(frame) ? frame : null;
  updatePitchReadout();
}

function endRound() {
  if (roundSaved) return;
  roundSaved = true;
  const best = Math.max(Number(localStorage.getItem("setscope-pitch-best") || 0), game.score);
  localStorage.setItem("setscope-pitch-best", String(best));
  els.bestScore.textContent = formatScore(best);
  els.overlayStatus.textContent = `Score ${formatScore(game.score)} / streak ${game.bestStreak}`;
  els.readyOverlay.classList.remove("hidden");
  const replay = createPitchGatesReplay(game);
  const performanceEvent = createPitchGatesCompletionEvent({
    sourceLabel: audioSession.getSourceLabel(),
    register: registers[register].label,
    speed,
    score: game.score,
    streak: game.bestStreak,
    resolved: game.resolved,
    totalGates,
    lives: game.lives,
    trackId: practiceContext.track?.id || "",
    time: practiceContext.track?.time || "--:--",
    trackTitle: practiceContext.track?.title || "",
    mission: practiceContext.mission,
    challengeId: game.challenge.id,
    seed: game.challenge.seed,
    replayHash: replay.expectedHash,
    replayActionCount: replay.actions.length,
    endReason: game.endReason,
  });
  const savedEvent = persistPerformanceEvent(performanceEvent);
  practiceContext.markComplete(savedEvent);
  appendPerformanceLog(performanceEvent);
  renderGame();
}

function drawFrame() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = window.devicePixelRatio || 1;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  drawGrid(width, height);
  drawGates(height);
  drawOrb(height);
}

function drawGrid(width, height) {
  const lowMidi = registers[register].base - 2;
  for (let index = 0; index < 16; index += 1) {
    const midi = lowMidi + index;
    const y = midiToY(midi, height);
    context.strokeStyle = index % 2 === 0 ? "rgba(244,239,230,0.09)" : "rgba(244,239,230,0.04)";
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
    if ([0, 4, 7, 12].includes(index)) {
      context.fillStyle = "rgba(244,239,230,0.34)";
      context.font = "11px ui-monospace, SFMono-Regular, monospace";
      context.fillText(midiToNote(lowMidi + index), 12, y - 5);
    }
  }
}

function drawGates(height) {
  game.challenge.gates.forEach((gate) => {
    const x = projectPitchGate(game, gate, {
      startX: canvas.clientWidth + 44,
      hitX: orbX() + 10,
    });
    if (x === null) return;
    const result = game.gateResults[gate.index];
    const targetY = midiToY(gate.targetMidi, height);
    const gapHeight = speed === "easy" ? 70 : speed === "rush" ? 45 : 56;
    context.fillStyle = result.outcome === "hit" ? "#75d7b6" : result.outcome !== "pending" ? "#ec6f7e" : "#f0ad4e";
    context.fillRect(x, 0, 27, Math.max(0, targetY - gapHeight / 2));
    context.fillRect(x, targetY + gapHeight / 2, 27, height - targetY);
    context.fillStyle = "rgba(15,14,12,0.9)";
    context.font = "bold 11px ui-monospace, SFMono-Regular, monospace";
    context.fillText(midiToNote(gate.targetMidi), x - 1, targetY + 4);
  });
}

function drawOrb(height) {
  const targetY = currentFrame ? midiToY(currentFrame.midi, height) : height / 2;
  orbY += (targetY - orbY) * 0.28;
  context.beginPath();
  context.fillStyle = currentFrame ? "#6ec6ff" : "rgba(110,198,255,0.46)";
  context.shadowColor = currentFrame ? "#6ec6ff" : "transparent";
  context.shadowBlur = currentFrame ? 18 : 0;
  context.arc(orbX(), orbY, 13, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
}

function renderGame() {
  els.score.textContent = formatScore(game.score);
  els.streak.textContent = String(game.streak).padStart(2, "0");
  els.lives.textContent = String(game.lives);
  els.gateCount.textContent = `${game.resolved}/${totalGates}`;
  const nextGate = getNextPitchGate(game);
  els.targetNote.textContent = nextGate ? midiToNote(nextGate.targetMidi) : midiToNote(registers[register].base);
}

function updatePitchReadout() {
  if (!currentFrame) {
    els.liveNote.textContent = "--";
    els.liveHz.textContent = "--";
    els.liveClarity.textContent = "--";
    els.tuningMeter.style.setProperty("--needle", "50%");
    return;
  }
  const roundedMidi = Math.round(currentFrame.midi);
  const cents = (currentFrame.midi - roundedMidi) * 100;
  els.liveNote.textContent = midiToNote(roundedMidi);
  els.liveHz.textContent = currentFrame.frequency.toFixed(1);
  els.liveClarity.textContent = `${Math.round(currentFrame.clarity * 100)}%`;
  els.tuningMeter.style.setProperty("--needle", `${Math.max(4, Math.min(96, 50 + cents / 2))}%`);
}

function appendLog(status, text) {
  const entry = document.createElement("div");
  entry.className = `hit-item ${status.toLowerCase()}`;
  entry.innerHTML = `<strong>${status}</strong><span>${text}</span>`;
  els.hitLog.prepend(entry);
  while (els.hitLog.children.length > 7) els.hitLog.lastElementChild.remove();
}

function appendPerformanceLog(event) {
  appendLog("RUN", `${event.sourceLabel} / ${event.score} pts / streak ${event.streak}`);
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const bounds = canvas.getBoundingClientRect();
  canvas.width = Math.floor(bounds.width * ratio);
  canvas.height = Math.floor(bounds.height * ratio);
}

function midiToY(midi, height) {
  const lowMidi = registers[register].base - 2;
  const highMidi = lowMidi + 15;
  const normalized = (midi - lowMidi) / (highMidi - lowMidi);
  return height - 28 - normalized * (height - 56);
}

function orbX() {
  return Math.min(108, canvas.clientWidth * 0.2);
}

function syncDemoToneToTarget() {
  const nextGate = getNextPitchGate(game);
  const targetMidi = nextGate?.targetMidi ?? registers[register].base;
  audioSession.setDemoFrequency(targetMidi);
}

function consumeDomainEvents() {
  const events = game.events.slice(consumedEventCount);
  consumedEventCount = game.events.length;
  events.forEach((event) => {
    if (event.type === "hit") appendLog("HIT", `${midiToNote(event.targetMidi)} +${event.points}`);
    if (event.type === "near") appendLog("NEAR", midiToNote(event.targetMidi));
    if (event.type === "miss") appendLog("MISS", midiToNote(event.targetMidi));
    if (event.type === "recovery") appendLog("RECOVER", midiToNote(event.targetMidi));
  });
  if (events.some((event) => ["hit", "near", "miss"].includes(event.type))) syncDemoToneToTarget();
  renderGame();
}

function createRoundClock() {
  const audioContext = audioSession.getAudioContext();
  if (audioContext && audioSession.isActive()) {
    return { type: "audio", context: audioContext, originMs: audioContext.currentTime * 1000 };
  }
  return { type: "performance", originMs: performance.now() };
}

function readRoundClock(fallbackNow = performance.now()) {
  if (roundClock?.type === "audio") return Math.max(0, roundClock.context.currentTime * 1000 - roundClock.originMs);
  return Math.max(0, fallbackNow - (roundClock?.originMs || fallbackNow));
}

function formatScore(score) {
  return String(score).padStart(4, "0");
}

function setAudioStatus(text, active) {
  els.audioStatus.textContent = text;
  els.audioStatus.classList.toggle("active", active);
}

function setActive(buttons, activeButton) {
  buttons.forEach((button) => button.classList.toggle("active", button === activeButton));
}

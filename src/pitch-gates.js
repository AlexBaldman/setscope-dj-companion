import { createAudioInputSession } from "./audio-session.js";
import { createPitchGatesCompletionEvent, persistPerformanceEvent } from "./performance-events.js";
import { createPitchAnalyzer, isPitchedFrame, midiToNote } from "./pitch-analysis.js";
import {
  calibrateMusicianProfile,
  createPracticePrescription,
  loadMusicianProfile,
  recordPracticeResult,
  saveMusicianProfile,
  updateMusicianStability,
} from "./musician-profile.js";
import { mountPracticeContext } from "./practice-context.js";
import { createPitchGatesChallenge } from "./pitch-gates/challenge.js";
import { createPitchStabilizer } from "./pitch-gates/pitch-filter.js";
import {
  advancePitchGatesTo,
  applyPitchInput,
  createPitchGatesRun,
  getNextPitchGate,
  projectPitchGate,
} from "./pitch-gates/reducer.js";
import { createPitchGatesReplay } from "./pitch-gates/replay.js";
import { diagnosePitchGateResults } from "./pitch-gates/diagnosis.js";

const practiceContext = mountPracticeContext("pitch-gates");
const canvas = document.querySelector("#pitchGameCanvas");
const context = canvas.getContext("2d");
const els = {
  audioStatus: document.querySelector("#audioStatus"),
  bestScore: document.querySelector("#bestScore"),
  comfortNote: document.querySelector("#comfortNote"),
  diagnosisStatus: document.querySelector("#diagnosisStatus"),
  gateCount: document.querySelector("#gateCount"),
  hitLog: document.querySelector("#hitLog"),
  liveClarity: document.querySelector("#liveClarity"),
  liveCents: document.querySelector("#liveCents"),
  liveHz: document.querySelector("#liveHz"),
  liveNote: document.querySelector("#liveNote"),
  lives: document.querySelector("#lives"),
  overlayStatus: document.querySelector("#overlayStatus"),
  pitchCanvasStatus: document.querySelector("#pitchCanvasStatus"),
  pitchGuide: document.querySelector("#pitchGuide"),
  profileDetail: document.querySelector("#profileDetail"),
  profileBounds: document.querySelector("#profileBounds"),
  profileRange: document.querySelector("#profileRange"),
  profileStage: document.querySelector("#profileStage"),
  rangeLabel: document.querySelector("#rangeLabel"),
  readyOverlay: document.querySelector("#readyOverlay"),
  score: document.querySelector("#score"),
  streak: document.querySelector("#streak"),
  stabilityValue: document.querySelector("#stabilityValue"),
  startRoundBtn: document.querySelector("#startRoundBtn"),
  targetNote: document.querySelector("#targetNote"),
  tuningMeter: document.querySelector("#tuningMeter"),
};

const registers = {
  low: { center: 48, label: "Low" },
  mid: { center: 55, label: "Mid" },
  high: { center: 64, label: "High" },
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
const pitchAnalyzer = createPitchAnalyzer({ bufferLength, minClarity: 0.58 });
let musicianProfile = loadMusicianProfile();
const savedProfile = readPitchProfile();
const pitchStabilizer = createPitchStabilizer({ stability: savedProfile.stability, assist: savedProfile.assist });
let animationId;
let register = savedProfile.register;
let personalCenter = musicianProfile.calibration.status === "calibrated" ? musicianProfile.centerMidi : savedProfile.personalCenter;
let speed = savedProfile.speed;
let assist = savedProfile.assist;
let currentFrame = null;
let game = createPitchGatesRun(createChallenge());
game = { ...game, status: "idle" };
let orbY = 180;
let roundClock = null;
let consumedEventCount = 0;
let roundSaved = false;
let lastInputSampleAt = -Infinity;
let lastInputHadPitch = false;
let pitchTrail = [];
let lastAccessibleStatus = "";

document.body.dataset.phase = "idle";

els.bestScore.textContent = formatScore(Number(localStorage.getItem("setscope-pitch-best") || 0));
syncSettingsUI();
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
    persistPitchProfile();
    syncSettingsUI();
    syncDemoToneToTarget();
    if (game.status !== "running") drawFrame();
  });
});
document.querySelectorAll("[data-speed]").forEach((button) => {
  button.addEventListener("click", () => {
    if (game.status === "running") return;
    speed = button.dataset.speed;
    setActive(document.querySelectorAll("[data-speed]"), button);
    persistPitchProfile();
  });
});
document.querySelectorAll("[data-assist]").forEach((button) => {
  button.addEventListener("click", () => {
    if (game.status === "running") return;
    assist = button.dataset.assist;
    pitchStabilizer.setAssist(assist);
    setActive(document.querySelectorAll("[data-assist]"), button);
    persistPitchProfile();
  });
});
document.querySelector("#captureComfortBtn").addEventListener("click", captureComfortNote);
document.querySelector("#stabilityInput").addEventListener("input", (event) => {
  const stability = Number(event.target.value);
  els.stabilityValue.textContent = String(stability);
  pitchStabilizer.setStability(stability / 100);
  savedProfile.stability = stability / 100;
  musicianProfile = saveMusicianProfile(updateMusicianStability(musicianProfile, stability / 100));
  persistPitchProfile();
  renderMusicianProfile();
});
window.addEventListener("resize", () => {
  resizeCanvas();
  drawFrame();
});

async function useMicrophone() {
  try {
    await audioSession.useMicrophone();
    pitchAnalyzer.reset();
    pitchStabilizer.reset();
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
    pitchStabilizer.reset();
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
    pitchStabilizer.reset();
    setAudioStatus("FILE READY", true);
    startAnimation();
  } catch {
    setAudioStatus("FILE ERROR", false);
  }
}

async function useDemoTone() {
  try {
    await audioSession.useDemoTone({ midi: getCenterMidi() });
    pitchAnalyzer.reset();
    pitchStabilizer.reset();
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
  pitchTrail = [];
  updatePitchReadout();
  setAudioStatus("INPUT OFF", false);
}

function startRound() {
  if (!audioSession.isActive()) return;
  const challenge = createChallenge(Date.now());
  game = createPitchGatesRun(challenge);
  roundClock = createRoundClock();
  consumedEventCount = 0;
  roundSaved = false;
  lastInputSampleAt = -Infinity;
  lastInputHadPitch = false;
  pitchTrail = [];
  orbY = canvas.clientHeight / 2;
  els.readyOverlay.classList.add("hidden");
  document.body.dataset.phase = "active";
  els.startRoundBtn.disabled = true;
  els.startRoundBtn.textContent = "Round active";
  appendLog("ROUND", `${getRangeLabel()} / ${speed} / ${assist}`);
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
  currentFrame = pitchStabilizer.push(isPitchedFrame(frame) ? frame : null, frame.timestamp);
  if (currentFrame) {
    pitchTrail.push(currentFrame.midi);
    if (pitchTrail.length > 48) pitchTrail.shift();
  }
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
  document.body.dataset.phase = "result";
  els.startRoundBtn.disabled = false;
  els.startRoundBtn.textContent = "Play again";
  const replay = createPitchGatesReplay(game);
  const hits = game.gateResults.filter((result) => result.outcome === "hit").length;
  const accuracy = Math.round((hits / totalGates) * 100);
  const diagnosis = diagnosePitchGateResults(game.gateResults);
  musicianProfile = saveMusicianProfile(recordPracticeResult(musicianProfile, {
    accuracy,
    diagnosis,
    modeId: "pitch-gates",
  }));
  const prescription = createPracticePrescription(musicianProfile);
  const performanceEvent = createPitchGatesCompletionEvent({
    sourceLabel: audioSession.getSourceLabel(),
    register: getRangeLabel(),
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
    profileId: musicianProfile.profileId,
    profileRevision: musicianProfile.revision,
    accuracy,
    practiceStage: prescription.stage,
    diagnosis,
  });
  const savedEvent = persistPerformanceEvent(performanceEvent);
  practiceContext.markComplete(savedEvent);
  appendPerformanceLog(performanceEvent);
  appendLog("COACH", diagnosis.detail);
  els.diagnosisStatus.textContent = diagnosis.detail;
  renderMusicianProfile();
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
  drawPitchTrail(height);
  drawOrb(height);
}

function drawGrid(width, height) {
  const { lowMidi, highMidi } = getDisplayRange();
  const lineCount = Math.round(highMidi - lowMidi) + 1;
  for (let index = 0; index < lineCount; index += 1) {
    const midi = lowMidi + index;
    const y = midiToY(midi, height);
    context.strokeStyle = index % 2 === 0 ? "rgba(244,239,230,0.14)" : "rgba(244,239,230,0.065)";
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
    if (index % 3 === 0 || index === lineCount - 1) {
      context.fillStyle = "rgba(244,239,230,0.56)";
      context.font = "12px ui-monospace, SFMono-Regular, monospace";
      context.fillText(midiToNote(lowMidi + index), 12, y - 5);
    }
  }
}

function drawPitchTrail(height) {
  if (pitchTrail.length < 2) return;
  context.beginPath();
  pitchTrail.forEach((midi, index) => {
    const x = orbX() - Math.min(82, (pitchTrail.length - 1 - index) * 2.2);
    const y = midiToY(midi, height);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = "rgba(96,199,255,0.58)";
  context.lineWidth = 3;
  context.lineCap = "round";
  context.stroke();
  context.lineWidth = 1;
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
    const gapHeight = assist === "gentle" ? 82 : assist === "exact" ? 48 : 64;
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
  els.targetNote.textContent = nextGate ? midiToNote(nextGate.targetMidi) : midiToNote(getCenterMidi());
  renderAccessiblePitchStatus();
}

function updatePitchReadout() {
  if (!currentFrame) {
    els.liveNote.textContent = "--";
    els.liveHz.textContent = "--";
    els.liveCents.textContent = "--";
    els.liveClarity.textContent = "--";
    els.tuningMeter.style.setProperty("--needle", "50%");
    els.pitchGuide.textContent = "LISTEN";
    els.pitchGuide.className = "pitch-guide";
    renderAccessiblePitchStatus();
    return;
  }
  const roundedMidi = Math.round(currentFrame.midi);
  const cents = (currentFrame.midi - roundedMidi) * 100;
  els.liveNote.textContent = midiToNote(roundedMidi);
  els.liveHz.textContent = currentFrame.frequency.toFixed(1);
  els.liveCents.textContent = `${cents > 0 ? "+" : ""}${Math.round(cents)}¢`;
  els.liveClarity.textContent = `${Math.round(currentFrame.clarity * 100)}%`;
  els.tuningMeter.style.setProperty("--needle", `${Math.max(4, Math.min(96, 50 + cents / 2))}%`);
  updatePitchGuide();
  renderAccessiblePitchStatus();
}

function updatePitchGuide() {
  const target = getNextPitchGate(game)?.targetMidi ?? getCenterMidi();
  const distance = currentFrame.midi - target;
  const tolerance = getNextPitchGate(game)?.tolerance ?? 0.7;
  els.pitchGuide.textContent = Math.abs(distance) <= tolerance ? "CENTERED" : distance < 0 ? "A LITTLE LOW" : "A LITTLE HIGH";
  els.pitchGuide.className = `pitch-guide ${Math.abs(distance) <= tolerance ? "centered" : "searching"}`;
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
  const { lowMidi, highMidi } = getDisplayRange();
  const normalized = (midi - lowMidi) / (highMidi - lowMidi);
  return height - 28 - normalized * (height - 56);
}

function orbX() {
  return Math.min(108, canvas.clientWidth * 0.2);
}

function syncDemoToneToTarget() {
  const nextGate = game.status === "running" ? getNextPitchGate(game) : null;
  const targetMidi = nextGate?.targetMidi ?? getCenterMidi();
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
  if (game.status !== "running") {
    document.body.dataset.phase = active ? "ready" : "idle";
    els.startRoundBtn.disabled = !active;
    els.startRoundBtn.textContent = active ? "Start round" : "Choose input";
  }
  if (game.status === "idle" && !els.readyOverlay.classList.contains("hidden")) {
    els.overlayStatus.textContent = active ? `${text} / START ROUND` : text === "INPUT OFF" ? "CHOOSE AN INPUT" : text;
  }
}

function renderAccessiblePitchStatus() {
  const target = getNextPitchGate(game)?.targetMidi ?? getCenterMidi();
  const phase = document.body.dataset.phase || "idle";
  const live = currentFrame ? `${midiToNote(Math.round(currentFrame.midi))}, ${els.pitchGuide.textContent.toLowerCase()}` : "no stable note detected";
  const text = `${phase}. Target ${midiToNote(target)}. ${live}. Gate ${game.resolved} of ${totalGates}. ${game.lives} lives remaining.`;
  if (text !== lastAccessibleStatus) {
    els.pitchCanvasStatus.textContent = text;
    lastAccessibleStatus = text;
  }
}

function setActive(buttons, activeButton) {
  buttons.forEach((button) => button.classList.toggle("active", button === activeButton));
}

function createChallenge(seed = 1) {
  return createPitchGatesChallenge({ seed, register, speed, assist, centerMidi: getCenterMidi(), totalGates });
}

function getCenterMidi() {
  return register === "personal" ? personalCenter : registers[register].center;
}

function getRangeLabel() {
  return register === "personal" ? "My range" : registers[register].label;
}

function getDisplayRange() {
  const config = game?.challenge?.config;
  if (config?.centerMidi === getCenterMidi()) return { lowMidi: config.rangeMinMidi, highMidi: config.rangeMaxMidi };
  return { lowMidi: getCenterMidi() - 6, highMidi: getCenterMidi() + 6 };
}

function captureComfortNote() {
  if (game.status === "running") return;
  if (!currentFrame) {
    appendLog("VOICE", "Hold a comfortable note first");
    return;
  }
  musicianProfile = saveMusicianProfile(calibrateMusicianProfile(musicianProfile, currentFrame, {
    sourceLabel: audioSession.getSourceLabel(),
  }));
  personalCenter = musicianProfile.centerMidi;
  register = "personal";
  savedProfile.stability = musicianProfile.detector.stability;
  pitchStabilizer.setStability(savedProfile.stability);
  persistPitchProfile();
  syncSettingsUI();
  appendLog("PROFILE", `${midiToNote(personalCenter)} center / safe span saved`);
  syncDemoToneToTarget();
  drawFrame();
}

function syncSettingsUI() {
  document.querySelectorAll("[data-register]").forEach((button) => button.classList.toggle("active", button.dataset.register === register));
  document.querySelector("#captureComfortBtn").classList.toggle("active", register === "personal");
  document.querySelectorAll("[data-speed]").forEach((button) => button.classList.toggle("active", button.dataset.speed === speed));
  document.querySelectorAll("[data-assist]").forEach((button) => button.classList.toggle("active", button.dataset.assist === assist));
  document.querySelector("#stabilityInput").value = String(Math.round(savedProfile.stability * 100));
  els.stabilityValue.textContent = String(Math.round(savedProfile.stability * 100));
  els.comfortNote.textContent = midiToNote(getCenterMidi());
  els.rangeLabel.textContent = getRangeLabel();
  renderMusicianProfile();
  renderGame();
}

function renderMusicianProfile() {
  const prescription = createPracticePrescription(musicianProfile);
  els.profileRange.textContent = musicianProfile.calibration.status === "calibrated"
    ? `${midiToNote(musicianProfile.lowMidi)} to ${midiToNote(musicianProfile.highMidi)}`
    : "Not calibrated";
  els.profileStage.textContent = prescription.stage.toUpperCase();
  els.profileBounds.textContent = musicianProfile.calibration.rangeStatus.toUpperCase();
  els.profileDetail.textContent = prescription.detail;
  document.querySelector("#captureComfortBtn").textContent = musicianProfile.calibration.status === "calibrated"
    ? "Recalibrate"
    : "Calibrate";
}

function readPitchProfile() {
  try {
    const value = JSON.parse(localStorage.getItem("setscope-pitch-profile-v1") || "{}");
    return {
      register: ["low", "mid", "high", "personal"].includes(value.register) ? value.register : "low",
      personalCenter: Number.isFinite(value.personalCenter) ? value.personalCenter : 48,
      speed: ["easy", "groove", "rush"].includes(value.speed) ? value.speed : "easy",
      assist: ["gentle", "balanced", "exact"].includes(value.assist) ? value.assist : "gentle",
      stability: Number.isFinite(value.stability) ? Math.max(0, Math.min(1, value.stability)) : musicianProfile.detector.stability,
    };
  } catch {
    return { register: "low", personalCenter: 48, speed: "easy", assist: "gentle", stability: musicianProfile.detector.stability };
  }
}

function persistPitchProfile() {
  savedProfile.register = register;
  savedProfile.personalCenter = personalCenter;
  savedProfile.speed = speed;
  savedProfile.assist = assist;
  localStorage.setItem("setscope-pitch-profile-v1", JSON.stringify(savedProfile));
}

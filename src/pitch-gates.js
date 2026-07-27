import { createAudioInputSession } from "./audio-session.js";
import { createPitchGatesCompletionEvent, persistPerformanceEvent } from "./performance-events.js";
import { createPitchAnalyzer, isPitchedFrame, midiToNote } from "./pitch-analysis.js";
import {
  calibrateMusicianProfile,
  createIntervalMission,
  createPracticePrescription,
  intervalHistorySummary,
  intervalShortLabel,
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
  pausePitchGatesRun,
  projectPitchGate,
  resumePitchGatesRun,
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
  hudDirection: document.querySelector("#hudDirection"),
  hudInterval: document.querySelector("#hudInterval"),
  hudLiveNote: document.querySelector("#hudLiveNote"),
  hudProgress: document.querySelector("#hudProgress"),
  hudSignal: document.querySelector("#hudSignal"),
  hudTargetNote: document.querySelector("#hudTargetNote"),
  intervalHistory: document.querySelector("#intervalHistory"),
  intervalMastery: document.querySelector("#intervalMastery"),
  intervalMasteryFill: document.querySelector("#intervalMasteryFill"),
  intervalMission: document.querySelector("#intervalMission"),
  intervalMissionDetail: document.querySelector("#intervalMissionDetail"),
  liveClarity: document.querySelector("#liveClarity"),
  liveCents: document.querySelector("#liveCents"),
  liveHz: document.querySelector("#liveHz"),
  liveNote: document.querySelector("#liveNote"),
  lives: document.querySelector("#lives"),
  overlayStatus: document.querySelector("#overlayStatus"),
  overlayTitle: document.querySelector("#overlayTitle"),
  outcomeFlash: document.querySelector("#outcomeFlash"),
  pitchCanvasStatus: document.querySelector("#pitchCanvasStatus"),
  pitchGuide: document.querySelector("#pitchGuide"),
  pauseRoundBtn: document.querySelector("#pauseRoundBtn"),
  profileDetail: document.querySelector("#profileDetail"),
  profileBounds: document.querySelector("#profileBounds"),
  profileRange: document.querySelector("#profileRange"),
  profileStage: document.querySelector("#profileStage"),
  rangeLabel: document.querySelector("#rangeLabel"),
  readyOverlay: document.querySelector("#readyOverlay"),
  resultAccuracy: document.querySelector("#resultAccuracy"),
  resultFocus: document.querySelector("#resultFocus"),
  resultGrade: document.querySelector("#resultGrade"),
  resultNext: document.querySelector("#resultNext"),
  resultRecap: document.querySelector("#resultRecap"),
  restartRoundBtn: document.querySelector("#restartRoundBtn"),
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
let drill = savedProfile.drill;
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
let feedbackPulse = null;
let preRollActive = false;
let countdownTimers = [];

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
els.pauseRoundBtn.addEventListener("click", toggleRoundPause);
els.restartRoundBtn.addEventListener("click", startRound);
document.querySelectorAll("[data-register]").forEach((button) => {
  button.addEventListener("click", () => {
    if (isRoundInProgress()) return;
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
    if (isRoundInProgress()) return;
    speed = button.dataset.speed;
    setActive(document.querySelectorAll("[data-speed]"), button);
    persistPitchProfile();
  });
});
document.querySelectorAll("[data-assist]").forEach((button) => {
  button.addEventListener("click", () => {
    if (isRoundInProgress()) return;
    assist = button.dataset.assist;
    pitchStabilizer.setAssist(assist);
    setActive(document.querySelectorAll("[data-assist]"), button);
    persistPitchProfile();
  });
});
document.querySelectorAll("[data-drill]").forEach((button) => {
  button.addEventListener("click", () => {
    if (isRoundInProgress()) return;
    drill = button.dataset.drill;
    setActive(document.querySelectorAll("[data-drill]"), button);
    persistPitchProfile();
    syncSettingsUI();
    game = { ...createPitchGatesRun(createChallenge()), status: "idle" };
    drawFrame();
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
  if (game.status === "running" && !preRollActive) pauseRound();
  clearPreRoll();
  audioSession.stop();
  currentFrame = null;
  pitchTrail = [];
  updatePitchReadout();
  setAudioStatus("INPUT OFF", false);
}

function startRound() {
  if (!audioSession.isActive()) return;
  clearPreRoll();
  const challenge = createChallenge(Date.now());
  game = createPitchGatesRun(challenge);
  roundClock = null;
  consumedEventCount = 0;
  roundSaved = false;
  lastInputSampleAt = -Infinity;
  lastInputHadPitch = false;
  pitchTrail = [];
  feedbackPulse = null;
  preRollActive = true;
  orbY = canvas.clientHeight / 2;
  els.resultRecap.hidden = true;
  els.overlayTitle.textContent = "3";
  els.overlayStatus.textContent = "BREATHE IN / FIND THE CENTER";
  els.readyOverlay.classList.remove("hidden");
  document.body.dataset.phase = "countdown";
  els.startRoundBtn.disabled = true;
  els.startRoundBtn.textContent = "Get ready";
  els.pauseRoundBtn.hidden = false;
  els.pauseRoundBtn.disabled = true;
  els.pauseRoundBtn.textContent = "Pause";
  els.restartRoundBtn.hidden = false;
  els.restartRoundBtn.disabled = false;
  const mission = createIntervalMission(musicianProfile, { drill });
  appendLog("READY", `${mission.shortLabel} / ${getRangeLabel()} / ${assist}`);
  syncDemoToneToTarget();
  renderGame();
  startAnimation();
  countdownTimers = [
    window.setTimeout(() => { els.overlayTitle.textContent = "2"; }, 700),
    window.setTimeout(() => {
      els.overlayTitle.textContent = "1";
      els.overlayStatus.textContent = "HEAR IT BEFORE YOU SING IT";
    }, 1400),
    window.setTimeout(beginRound, 2100),
  ];
}

function beginRound() {
  if (!preRollActive || game.status !== "running") return;
  countdownTimers = [];
  preRollActive = false;
  roundClock = createRoundClock(game.elapsedMs);
  els.readyOverlay.classList.add("hidden");
  document.body.dataset.phase = "active";
  els.startRoundBtn.textContent = "Round active";
  els.pauseRoundBtn.disabled = false;
  appendLog("ROUND", `${getRangeLabel()} / ${speed} / ${assist}`);
}

function startAnimation() {
  if (animationId) return;
  animationId = requestAnimationFrame(update);
}

function update(now) {
  animationId = null;
  readPitch();
  if (game.status === "running" && !preRollActive) {
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
  els.pauseRoundBtn.hidden = true;
  els.restartRoundBtn.hidden = true;
  const replay = createPitchGatesReplay(game);
  const resolvedResults = game.gateResults.filter((result) => result.outcome !== "pending");
  const scoredResults = resolvedResults.filter((result) => ["hit", "near", "miss"].includes(result.outcome));
  const hits = scoredResults.filter((result) => result.outcome === "hit").length;
  const near = scoredResults.filter((result) => result.outcome === "near").length;
  const accuracy = Math.round(((hits + near * 0.5) / Math.max(1, scoredResults.length)) * 100);
  const diagnosis = diagnosePitchGateResults(game.gateResults);
  const sourceLabel = audioSession.getSourceLabel();
  const enoughSignal = scoredResults.length >= Math.max(4, Math.ceil(resolvedResults.length * 0.6));
  const eligibleForMastery = sourceLabel === "MIC" && assist !== "gentle" && enoughSignal;
  musicianProfile = saveMusicianProfile(recordPracticeResult(musicianProfile, {
    accuracy,
    centerMidi: game.challenge.config.centerMidi,
    diagnosis,
    eligibleForMastery,
    intervalResults: game.gateResults,
    modeId: "pitch-gates",
  }));
  const prescription = createPracticePrescription(musicianProfile);
  const focusGate = game.challenge.gates.find((gate) => gate.intervalSemitones !== 0) || game.challenge.gates[0];
  els.overlayTitle.textContent = game.endReason === "all-gates-resolved" ? "ROUND COMPLETE" : "RECOVERY STOP";
  els.resultGrade.textContent = gradeForAccuracy(accuracy);
  els.resultAccuracy.textContent = `${accuracy}%`;
  els.resultFocus.textContent = intervalShortLabel(focusGate?.intervalSemitones || 0);
  els.resultNext.textContent = eligibleForMastery
    ? prescription.detail
    : !enoughSignal
      ? "Signal was too sparse for mastery. Check input, sustain the note, and try again."
      : "Guided result only. Use Mic with Balanced or Exact assist to add mastery evidence.";
  els.resultRecap.hidden = false;
  const performanceEvent = createPitchGatesCompletionEvent({
    sourceLabel,
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
    eligibleForMastery,
  });
  const savedEvent = persistPerformanceEvent(performanceEvent, { missionId: practiceContext.missionId });
  practiceContext.markSaved(savedEvent);
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
  drawTargetCorridor(width, height);
  if (preRollActive) drawPreviewGate(width, height);
  drawGates(height);
  drawPitchTrail(height);
  drawOrb(height);
}

function drawPreviewGate(width, height) {
  const gate = getNextPitchGate(game);
  if (!gate) return;
  const targetY = midiToY(gate.targetMidi, height);
  const x = width * 0.72;
  const gapHeight = assist === "gentle" ? 82 : assist === "exact" ? 48 : 64;
  context.globalAlpha = 0.58;
  context.fillStyle = "#f0ad4e";
  context.fillRect(x, 0, 24, Math.max(0, targetY - gapHeight / 2));
  context.fillRect(x, targetY + gapHeight / 2, 24, height - targetY);
  context.globalAlpha = 1;
}

function drawTargetCorridor(width, height) {
  const gate = getNextPitchGate(game);
  if (!gate) return;
  const targetY = midiToY(gate.targetMidi, height);
  const corridorHeight = assist === "gentle" ? 54 : assist === "exact" ? 28 : 40;
  context.fillStyle = "rgba(117, 215, 182, 0.1)";
  context.fillRect(0, targetY - corridorHeight / 2, width, corridorHeight);
  context.strokeStyle = "rgba(117, 215, 182, 0.58)";
  context.setLineDash([7, 7]);
  context.beginPath();
  context.moveTo(0, targetY);
  context.lineTo(width, targetY);
  context.stroke();
  context.setLineDash([]);
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
    context.fillStyle = result.outcome === "hit"
      ? "#75d7b6"
      : result.outcome === "unvoiced"
        ? "#60c7ff"
        : result.outcome !== "pending"
          ? "#ec6f7e"
          : "#f0ad4e";
    context.fillRect(x, 0, 27, Math.max(0, targetY - gapHeight / 2));
    context.fillRect(x, targetY + gapHeight / 2, 27, height - targetY);
    context.fillStyle = "rgba(15,14,12,0.9)";
    context.font = "bold 11px ui-monospace, SFMono-Regular, monospace";
    context.fillText(intervalShortLabel(gate.intervalSemitones), x - 1, targetY + 4);
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
  if (feedbackPulse && performance.now() - feedbackPulse.at < 700) {
    const age = (performance.now() - feedbackPulse.at) / 700;
    context.globalAlpha = 1 - age;
    context.strokeStyle = feedbackPulse.color;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(orbX(), orbY, 18 + age * 24, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;
    context.lineWidth = 1;
  }
}

function renderGame() {
  els.score.textContent = formatScore(game.score);
  els.streak.textContent = String(game.streak).padStart(2, "0");
  els.lives.textContent = String(game.lives);
  els.gateCount.textContent = `${game.resolved}/${totalGates}`;
  const nextGate = getNextPitchGate(game);
  els.targetNote.textContent = nextGate ? midiToNote(nextGate.targetMidi) : midiToNote(getCenterMidi());
  els.hudTargetNote.textContent = els.targetNote.textContent;
  els.hudInterval.textContent = nextGate
    ? `${intervalShortLabel(nextGate.intervalSemitones)} / ${intervalDirection(nextGate.intervalSemitones)}`
    : "ROUND / COMPLETE";
  els.hudProgress.style.width = `${Math.round(game.resolved / totalGates * 100)}%`;
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
    els.hudLiveNote.textContent = "--";
    els.hudSignal.textContent = audioSession.isActive() ? "No lock" : "Input off";
    els.hudDirection.textContent = "LISTEN";
    els.hudDirection.dataset.state = "listen";
    syncLaunchSteps(audioSession.isActive());
    renderAccessiblePitchStatus();
    return;
  }
  const roundedMidi = Math.round(currentFrame.midi);
  const cents = (currentFrame.midi - roundedMidi) * 100;
  els.liveNote.textContent = midiToNote(roundedMidi);
  els.hudLiveNote.textContent = els.liveNote.textContent;
  const octaveCorrected = Number.isFinite(currentFrame.rawMidi) && Math.abs(currentFrame.rawMidi - currentFrame.midi) >= 7;
  els.hudSignal.textContent = octaveCorrected ? "Octave check" : "Signal locked";
  els.liveHz.textContent = currentFrame.frequency.toFixed(1);
  els.liveCents.textContent = `${cents > 0 ? "+" : ""}${Math.round(cents)}¢`;
  els.liveClarity.textContent = `${Math.round(currentFrame.clarity * 100)}%`;
  els.tuningMeter.style.setProperty("--needle", `${Math.max(4, Math.min(96, 50 + cents / 2))}%`);
  updatePitchGuide();
  syncLaunchSteps(true);
  renderAccessiblePitchStatus();
}

function updatePitchGuide() {
  const target = getNextPitchGate(game)?.targetMidi ?? getCenterMidi();
  const distance = currentFrame.midi - target;
  const tolerance = getNextPitchGate(game)?.tolerance ?? 0.7;
  els.pitchGuide.textContent = Math.abs(distance) <= tolerance ? "CENTERED" : distance < 0 ? "A LITTLE LOW" : "A LITTLE HIGH";
  els.pitchGuide.className = `pitch-guide ${Math.abs(distance) <= tolerance ? "centered" : "searching"}`;
  els.hudDirection.textContent = Math.abs(distance) <= tolerance ? "HOLD" : distance < 0 ? "RAISE" : "LOWER";
  els.hudDirection.dataset.state = Math.abs(distance) <= tolerance ? "hold" : "move";
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
    if (event.type === "hit") {
      appendLog("HIT", `${midiToNote(event.targetMidi)} +${event.points}`);
      showOutcome("HIT", "#75d7b6");
    }
    if (event.type === "near") {
      appendLog("NEAR", `${midiToNote(event.targetMidi)} +${event.points}`);
      showOutcome("NEAR", "#f0ad4e");
    }
    if (event.type === "miss") {
      appendLog("MISS", midiToNote(event.targetMidi));
      showOutcome("MISS", "#ec6f7e");
    }
    if (event.type === "unvoiced") {
      appendLog("SIGNAL", "No stable note / life protected");
      showOutcome("NO LOCK", "#60c7ff");
    }
    if (event.type === "recovery") appendLog("RECOVER", midiToNote(event.targetMidi));
  });
  if (events.some((event) => ["hit", "near", "miss", "unvoiced"].includes(event.type))) syncDemoToneToTarget();
  renderGame();
}

function showOutcome(label, color) {
  feedbackPulse = { at: performance.now(), color };
  els.outcomeFlash.textContent = label;
  els.outcomeFlash.dataset.outcome = label.toLowerCase();
  els.outcomeFlash.classList.remove("show");
  requestAnimationFrame(() => els.outcomeFlash.classList.add("show"));
}

function createRoundClock(elapsedMs = 0) {
  const audioContext = audioSession.getAudioContext();
  if (audioContext && audioSession.isActive()) {
    return { type: "audio", context: audioContext, originMs: audioContext.currentTime * 1000 - elapsedMs };
  }
  return { type: "performance", originMs: performance.now() - elapsedMs };
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
  syncLaunchSteps(active);
}

function toggleRoundPause() {
  if (game.status === "paused") {
    game = resumePitchGatesRun(game);
    roundClock = createRoundClock(game.elapsedMs);
    els.pauseRoundBtn.textContent = "Pause";
    els.readyOverlay.classList.add("hidden");
    document.body.dataset.phase = "active";
    appendLog("RESUME", `Gate ${game.resolved + 1}`);
    startAnimation();
    return;
  }
  pauseRound();
}

function pauseRound() {
  if (game.status !== "running" || preRollActive) return;
  game = advancePitchGatesTo(game, readRoundClock());
  consumeDomainEvents();
  if (game.status !== "running") {
    endRound();
    return;
  }
  game = pausePitchGatesRun(game, game.elapsedMs);
  els.pauseRoundBtn.textContent = "Resume";
  els.overlayTitle.textContent = "PAUSED";
  els.overlayStatus.textContent = "YOUR PLACE IS SAVED";
  els.resultRecap.hidden = true;
  els.readyOverlay.classList.remove("hidden");
  document.body.dataset.phase = "paused";
  appendLog("PAUSE", `Gate ${game.resolved + 1}`);
}

function clearPreRoll() {
  countdownTimers.forEach((timer) => window.clearTimeout(timer));
  countdownTimers = [];
  preRollActive = false;
}

function syncLaunchSteps(inputReady) {
  document.querySelectorAll("[data-launch-step]").forEach((step) => {
    const key = step.dataset.launchStep;
    const complete = key === "input"
      ? inputReady
      : key === "center"
        ? Boolean(currentFrame)
        : game.status === "running" && !preRollActive;
    step.classList.toggle("complete", complete);
  });
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
  buttons.forEach((button) => {
    const active = button === activeButton;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function createChallenge(seed = 1) {
  const mission = createIntervalMission(musicianProfile, { drill });
  const usesPersonalRange = register === "personal" && musicianProfile.calibration.status === "calibrated";
  return createPitchGatesChallenge({
    seed,
    register,
    speed,
    assist,
    centerMidi: getCenterMidi(),
    drill,
    focusInterval: mission.interval,
    rangeMinMidi: usesPersonalRange ? musicianProfile.lowMidi : undefined,
    rangeMaxMidi: usesPersonalRange ? musicianProfile.highMidi : undefined,
    totalGates,
  });
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
  if (isRoundInProgress()) return;
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

function isRoundInProgress() {
  return preRollActive || game.status === "running" || game.status === "paused";
}

function syncSettingsUI() {
  document.querySelectorAll("[data-register]").forEach((button) => button.classList.toggle("active", button.dataset.register === register));
  document.querySelector("#captureComfortBtn").classList.toggle("active", register === "personal");
  document.querySelectorAll("[data-speed]").forEach((button) => button.classList.toggle("active", button.dataset.speed === speed));
  document.querySelectorAll("[data-assist]").forEach((button) => button.classList.toggle("active", button.dataset.assist === assist));
  document.querySelectorAll("[data-drill]").forEach((button) => {
    const active = button.dataset.drill === drill;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
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
  const mission = createIntervalMission(musicianProfile, { drill });
  els.intervalMission.textContent = `${mission.shortLabel} / ${mission.name}`;
  els.intervalMastery.textContent = mission.attempts ? `${mission.mastery}%` : "NEW";
  els.intervalMasteryFill.style.width = `${mission.mastery}%`;
  els.intervalMissionDetail.textContent = mission.detail;
  const history = intervalHistorySummary(musicianProfile);
  els.intervalHistory.innerHTML = history.length
    ? history.map((item) => `<span title="${item.name}; ${item.biasCents > 0 ? "+" : ""}${item.biasCents} cents bias"><b>${item.label}</b>${item.mastery}%</span>`).join("")
    : '<span class="empty-history">Your interval map lights up after eligible rounds.</span>';
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
      drill: ["adaptive", "steps", "leaps"].includes(value.drill) ? value.drill : "adaptive",
      stability: Number.isFinite(value.stability) ? Math.max(0, Math.min(1, value.stability)) : musicianProfile.detector.stability,
    };
  } catch {
    return { register: "low", personalCenter: 48, speed: "easy", assist: "gentle", drill: "adaptive", stability: musicianProfile.detector.stability };
  }
}

function persistPitchProfile() {
  savedProfile.register = register;
  savedProfile.personalCenter = personalCenter;
  savedProfile.speed = speed;
  savedProfile.assist = assist;
  savedProfile.drill = drill;
  localStorage.setItem("setscope-pitch-profile-v1", JSON.stringify(savedProfile));
}

function intervalDirection(interval) {
  if (interval > 0) return "UP";
  if (interval < 0) return "DOWN";
  return "HOLD";
}

function gradeForAccuracy(accuracy) {
  if (accuracy >= 95) return "A+";
  if (accuracy >= 85) return "A";
  if (accuracy >= 72) return "B";
  if (accuracy >= 58) return "C";
  return "BUILD";
}

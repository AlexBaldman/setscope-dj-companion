import { PitchDetector } from "./vendor/pitchy.js";
import { logAudioEvent, persist } from "./state.js";

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
const speeds = {
  easy: { pixelsPerSecond: 82, tolerance: 0.62 },
  groove: { pixelsPerSecond: 112, tolerance: 0.48 },
  rush: { pixelsPerSecond: 148, tolerance: 0.38 },
};
const scaleSteps = [0, 2, 4, 5, 7, 9, 12];
const totalGates = 12;
const bufferLength = 2048;

let audioContext;
let analyser;
let detector;
let inputStream;
let sourceNode;
let playbackElement;
let playbackUrl;
let toneOscillator;
let toneGain;
let animationId;
let timeDomainBuffer = new Float32Array(bufferLength);
let register = "mid";
let speed = "groove";
let sourceLabel = "none";
let currentPitch = null;
let game = createGame();

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
    register = button.dataset.register;
    setActive(document.querySelectorAll("[data-register]"), button);
    els.rangeLabel.textContent = registers[register].label;
    syncDemoToneToTarget();
    if (!game.running) drawFrame();
  });
});
document.querySelectorAll("[data-speed]").forEach((button) => {
  button.addEventListener("click", () => {
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
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    await attachStream(stream, "MIC");
  } catch {
    setAudioStatus("MIC BLOCKED", false);
  }
}

async function useSharedAudio() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
      preferCurrentTab: true,
      systemAudio: "include",
    });
    if (!stream.getAudioTracks().length) {
      stream.getTracks().forEach((track) => track.stop());
      setAudioStatus("NO AUDIO SHARED", false);
      return;
    }
    await attachStream(stream, "SHARED");
  } catch {
    setAudioStatus("SHARE ENDED", false);
  }
}

async function attachStream(stream, label) {
  stopAudio();
  audioContext = new AudioContext();
  await audioContext.resume();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = bufferLength;
  detector = PitchDetector.forFloat32Array(bufferLength);
  inputStream = stream;
  sourceNode = audioContext.createMediaStreamSource(stream);
  sourceNode.connect(analyser);
  inputStream.getTracks().forEach((track) => {
    track.addEventListener("ended", () => stopAudio());
  });
  sourceLabel = label;
  setAudioStatus(`${label} READY`, true);
  startAnimation();
}

async function useAudioFile(file) {
  if (!file) return;
  try {
    stopAudio();
    audioContext = new AudioContext();
    await audioContext.resume();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = bufferLength;
    detector = PitchDetector.forFloat32Array(bufferLength);
    playbackUrl = URL.createObjectURL(file);
    playbackElement = new Audio(playbackUrl);
    playbackElement.loop = true;
    sourceNode = audioContext.createMediaElementSource(playbackElement);
    sourceNode.connect(analyser);
    sourceNode.connect(audioContext.destination);
    sourceLabel = "FILE";
    await playbackElement.play();
    setAudioStatus("FILE READY", true);
    startAnimation();
  } catch {
    setAudioStatus("FILE ERROR", false);
  }
}

async function useDemoTone() {
  try {
    stopAudio();
    audioContext = new AudioContext();
    await audioContext.resume();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = bufferLength;
    detector = PitchDetector.forFloat32Array(bufferLength);
    toneOscillator = audioContext.createOscillator();
    toneGain = audioContext.createGain();
    toneOscillator.type = "sine";
    toneGain.gain.value = 0;
    toneOscillator.frequency.value = midiToFrequency(registers[register].base);
    toneOscillator.connect(analyser);
    analyser.connect(toneGain);
    toneGain.connect(audioContext.destination);
    toneOscillator.start();
    sourceNode = toneOscillator;
    sourceLabel = "DEMO";
    setAudioStatus("DEMO READY", true);
    startAnimation();
  } catch {
    stopAudio();
    setAudioStatus("DEMO ERROR", false);
  }
}

function stopAudio() {
  inputStream?.getTracks().forEach((track) => track.stop());
  playbackElement?.pause();
  toneOscillator?.stop();
  if (playbackUrl) URL.revokeObjectURL(playbackUrl);
  sourceNode?.disconnect();
  toneGain?.disconnect();
  audioContext?.close();
  inputStream = null;
  sourceNode = null;
  playbackElement = null;
  playbackUrl = null;
  toneOscillator = null;
  toneGain = null;
  audioContext = null;
  analyser = null;
  detector = null;
  currentPitch = null;
  sourceLabel = "none";
  updatePitchReadout();
  setAudioStatus("INPUT OFF", false);
}

function startRound() {
  game = createGame();
  game.running = true;
  game.lastFrameAt = performance.now();
  game.nextGateAt = 0;
  els.readyOverlay.classList.add("hidden");
  appendLog("ROUND", `${registers[register].label} / ${speed}`);
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
  if (game.running) {
    const deltaSeconds = Math.min(0.06, (now - game.lastFrameAt) / 1000);
    game.lastFrameAt = now;
    advanceGame(deltaSeconds);
  }
  drawFrame();
  if (game.running || analyser) {
    animationId = requestAnimationFrame(update);
  }
}

function readPitch() {
  if (!analyser || !detector || !audioContext) {
    currentPitch = null;
    updatePitchReadout();
    return;
  }
  analyser.getFloatTimeDomainData(timeDomainBuffer);
  const [frequency, clarity] = detector.findPitch(timeDomainBuffer, audioContext.sampleRate);
  if (!Number.isFinite(frequency) || clarity < 0.82 || frequency < 45 || frequency > 1600) {
    currentPitch = null;
  } else {
    const midi = frequencyToMidi(frequency);
    currentPitch = { frequency, clarity, midi };
  }
  updatePitchReadout();
}

function advanceGame(deltaSeconds) {
  const boardWidth = canvas.clientWidth;
  game.elapsed += deltaSeconds;
  if (game.spawned < totalGates && game.elapsed >= game.nextGateAt) {
    game.gates.push(createGate(boardWidth + 44, game.spawned));
    game.spawned += 1;
    game.nextGateAt += speed === "easy" ? 2.35 : speed === "rush" ? 1.45 : 1.82;
    syncDemoToneToTarget();
  }
  const movement = speeds[speed].pixelsPerSecond * deltaSeconds;
  game.gates.forEach((gate) => {
    gate.x -= movement;
    if (!gate.evaluated && gate.x <= orbX() + 10) {
      scoreGate(gate);
    }
  });
  game.gates = game.gates.filter((gate) => gate.x > -80);
  if (game.resolved >= totalGates && game.gates.length === 0) {
    endRound();
  }
}

function scoreGate(gate) {
  gate.evaluated = true;
  game.resolved += 1;
  const distance = currentPitch ? Math.abs(currentPitch.midi - gate.targetMidi) : Infinity;
  const passed = distance <= speeds[speed].tolerance;
  gate.passed = passed;
  if (passed) {
    game.streak += 1;
    game.bestStreak = Math.max(game.bestStreak, game.streak);
    game.score += 100 + game.streak * 20;
    appendLog("HIT", `${midiToNote(gate.targetMidi)} +${100 + game.streak * 20}`);
  } else {
    game.streak = 0;
    game.lives -= 1;
    appendLog("MISS", midiToNote(gate.targetMidi));
  }
  syncDemoToneToTarget();
  renderGame();
  if (game.lives <= 0) endRound();
}

function endRound() {
  if (!game.running) return;
  game.running = false;
  const best = Math.max(Number(localStorage.getItem("setscope-pitch-best") || 0), game.score);
  localStorage.setItem("setscope-pitch-best", String(best));
  els.bestScore.textContent = formatScore(best);
  els.overlayStatus.textContent = `Score ${formatScore(game.score)} / streak ${game.bestStreak}`;
  els.readyOverlay.classList.remove("hidden");
  logAudioEvent({
    type: "instrument",
    time: "--:--",
    title: "Pitch Gates run",
    detail: `${sourceLabel} / ${registers[register].label} / ${game.score} pts / streak ${game.bestStreak}`,
  });
  persist();
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
  game.gates.forEach((gate) => {
    const targetY = midiToY(gate.targetMidi, height);
    const gapHeight = speed === "easy" ? 70 : speed === "rush" ? 45 : 56;
    context.fillStyle = gate.passed ? "#75d7b6" : gate.evaluated ? "#ec6f7e" : "#f0ad4e";
    context.fillRect(gate.x, 0, 27, Math.max(0, targetY - gapHeight / 2));
    context.fillRect(gate.x, targetY + gapHeight / 2, 27, height - targetY);
    context.fillStyle = "rgba(15,14,12,0.9)";
    context.font = "bold 11px ui-monospace, SFMono-Regular, monospace";
    context.fillText(midiToNote(gate.targetMidi), gate.x - 1, targetY + 4);
  });
}

function drawOrb(height) {
  const targetY = currentPitch ? midiToY(currentPitch.midi, height) : height / 2;
  game.orbY += (targetY - game.orbY) * 0.28;
  context.beginPath();
  context.fillStyle = currentPitch ? "#6ec6ff" : "rgba(110,198,255,0.46)";
  context.shadowColor = currentPitch ? "#6ec6ff" : "transparent";
  context.shadowBlur = currentPitch ? 18 : 0;
  context.arc(orbX(), game.orbY, 13, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
}

function renderGame() {
  els.score.textContent = formatScore(game.score);
  els.streak.textContent = String(game.streak).padStart(2, "0");
  els.lives.textContent = String(game.lives);
  els.gateCount.textContent = `${game.resolved}/${totalGates}`;
  const nextGate = game.gates.find((gate) => !gate.evaluated);
  els.targetNote.textContent = nextGate ? midiToNote(nextGate.targetMidi) : midiToNote(registers[register].base);
}

function updatePitchReadout() {
  if (!currentPitch) {
    els.liveNote.textContent = "--";
    els.liveHz.textContent = "--";
    els.liveClarity.textContent = "--";
    els.tuningMeter.style.setProperty("--needle", "50%");
    return;
  }
  const roundedMidi = Math.round(currentPitch.midi);
  const cents = (currentPitch.midi - roundedMidi) * 100;
  els.liveNote.textContent = midiToNote(roundedMidi);
  els.liveHz.textContent = currentPitch.frequency.toFixed(1);
  els.liveClarity.textContent = `${Math.round(currentPitch.clarity * 100)}%`;
  els.tuningMeter.style.setProperty("--needle", `${Math.max(4, Math.min(96, 50 + cents / 2))}%`);
}

function appendLog(status, text) {
  const entry = document.createElement("div");
  entry.className = `hit-item ${status.toLowerCase()}`;
  entry.innerHTML = `<strong>${status}</strong><span>${text}</span>`;
  els.hitLog.prepend(entry);
  while (els.hitLog.children.length > 7) els.hitLog.lastElementChild.remove();
}

function createGame() {
  return {
    bestStreak: 0,
    elapsed: 0,
    gates: [],
    lastFrameAt: 0,
    lives: 3,
    nextGateAt: 0.35,
    orbY: 180,
    resolved: 0,
    running: false,
    score: 0,
    spawned: 0,
    streak: 0,
  };
}

function createGate(x, index) {
  const step = scaleSteps[(index * 3 + Math.floor(Math.random() * scaleSteps.length)) % scaleSteps.length];
  return { x, targetMidi: registers[register].base + step, evaluated: false, passed: false };
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

function frequencyToMidi(frequency) {
  return 69 + 12 * Math.log2(frequency / 440);
}

function midiToNote(midi) {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const rounded = Math.round(midi);
  return `${notes[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`;
}

function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function syncDemoToneToTarget() {
  if (!toneOscillator || !audioContext) return;
  const nextGate = game.gates.find((gate) => !gate.evaluated);
  const targetMidi = nextGate?.targetMidi ?? registers[register].base;
  toneOscillator.frequency.setTargetAtTime(midiToFrequency(targetMidi), audioContext.currentTime, 0.025);
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

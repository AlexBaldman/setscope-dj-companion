import { createRhythmRouletteCompletionEvent, persistPerformanceEvent } from "./performance-events.js";
import { mountPracticeContext } from "./practice-context.js";

const practiceContext = mountPracticeContext("rhythm-roulette");
const canvas = document.querySelector("#rouletteSceneCanvas");
const context = canvas.getContext("2d");
const els = {
  bestRouletteScore: document.querySelector("#bestRouletteScore"),
  challengeBadge: document.querySelector("#challengeBadge"),
  blindDigBtn: document.querySelector("#blindDigBtn"),
  clearBeatBtn: document.querySelector("#clearBeatBtn"),
  crateReceipt: document.querySelector("#crateReceipt"),
  currentSampleReadout: document.querySelector("#currentSampleReadout"),
  digOverlay: document.querySelector("#digOverlay"),
  grooveScore: document.querySelector("#grooveScore"),
  missionDetail: document.querySelector("#missionDetail"),
  missionTitle: document.querySelector("#missionTitle"),
  playBeatBtn: document.querySelector("#playBeatBtn"),
  pullCount: document.querySelector("#pullCount"),
  recordPulls: document.querySelector("#recordPulls"),
  rouletteBpm: document.querySelector("#rouletteBpm"),
  rouletteStatus: document.querySelector("#rouletteStatus"),
  sampleBank: document.querySelector("#sampleBank"),
  saveRouletteBtn: document.querySelector("#saveRouletteBtn"),
  sequencerGrid: document.querySelector("#sequencerGrid"),
  surpriseBeatBtn: document.querySelector("#surpriseBeatBtn"),
};

const recordCrate = [
  {
    artist: "The Borough Committee",
    bpm: 92,
    color: "#f4aa3e",
    era: "1974 soul library",
    mood: "dusty horn stab",
    title: "Sidewalk Sermon",
  },
  {
    artist: "Mercury Palm Unit",
    bpm: 98,
    color: "#60c7ff",
    era: "1983 boogie 12 inch",
    mood: "rubber bass",
    title: "Chrome Rooftop",
  },
  {
    artist: "Tanya Bellairs",
    bpm: 86,
    color: "#ed6382",
    era: "1971 private press",
    mood: "warm vocal chop",
    title: "Raincoat Letters",
  },
  {
    artist: "Harbor City Youth Ensemble",
    bpm: 104,
    color: "#6fddb1",
    era: "1978 school jazz",
    mood: "loose drum break",
    title: "Gymnasium Strut",
  },
  {
    artist: "Kite Radio Orchestra",
    bpm: 78,
    color: "#b7db63",
    era: "1969 soundtrack",
    mood: "spooky flute phrase",
    title: "The Alley Turns",
  },
  {
    artist: "Delford Metro Line",
    bpm: 112,
    color: "#b682ff",
    era: "1988 club dub",
    mood: "neon chord hit",
    title: "Transfer Ticket",
  },
  {
    artist: "North End Drum Co.",
    bpm: 96,
    color: "#ff7a59",
    era: "1976 percussion LP",
    mood: "conga room",
    title: "Five Flights Up",
  },
  {
    artist: "Celeste Vega",
    bpm: 88,
    color: "#ffe169",
    era: "1981 latin soul",
    mood: "sunlit piano loop",
    title: "Mirrors By The Bar",
  },
];

const lanes = [
  { id: "kick", label: "Kick", tone: "kick" },
  { id: "snare", label: "Snare", tone: "snare" },
  { id: "hat", label: "Hat", tone: "hat" },
  { id: "chop", label: "Chop", tone: "chop" },
];
const challenges = [
  {
    id: "dusty-pocket",
    title: "Dusty pocket",
    detail: "Keep the loop under 18 hits and let the gaps do work.",
    bonus(patternData) {
      return patternDensity(patternData) <= 18 ? 320 : 80;
    },
  },
  {
    id: "backbeat-tax",
    title: "Backbeat tax",
    detail: "Snare has to own beats 2 and 4.",
    bonus(patternData) {
      return patternData.snare[4] && patternData.snare[12] ? 360 : 40;
    },
  },
  {
    id: "three-record-rule",
    title: "Three-record rule",
    detail: "Use chops from every mystery pull before saving.",
    bonus(patternData) {
      return recordVariety(patternData) >= 3 ? 420 : 60;
    },
  },
  {
    id: "late-swing",
    title: "Late swing",
    detail: "Make at least two off-grid-feeling hits on 4, 8, 12, or 16.",
    bonus(patternData) {
      return [3, 7, 11, 15].filter((step) => patternData.kick[step] || patternData.chop[step]).length >= 2 ? 380 : 70;
    },
  },
];
const steps = 16;
const bestKey = "setscope-roulette-best";
const savedKey = "setscope-roulette-saved";
let audioContext;
let pulledRecords = [];
let selectedSample = null;
let pattern = createEmptyPattern();
let currentChallenge = challenges[0];
let currentStep = -1;
let playTimer;
let savedLoops = Number(localStorage.getItem(savedKey) || 0);

els.bestRouletteScore.textContent = formatScore(Number(localStorage.getItem(bestKey) || 0));
resizeCanvas();
renderAll();
drawScene();

els.blindDigBtn.addEventListener("click", blindDig);
els.surpriseBeatBtn.addEventListener("click", autoFlipBeat);
els.playBeatBtn.addEventListener("click", togglePlay);
els.clearBeatBtn.addEventListener("click", clearBeat);
els.saveRouletteBtn.addEventListener("click", saveRun);
window.addEventListener("resize", () => {
  resizeCanvas();
  drawScene();
});

function blindDig() {
  stopBeat();
  pulledRecords = shuffle(recordCrate).slice(0, 3);
  currentChallenge = shuffle(challenges)[0];
  const averageBpm = Math.round(pulledRecords.reduce((sum, record) => sum + record.bpm, 0) / pulledRecords.length);
  selectedSample = createSample(pulledRecords[0], lanes[0]);
  pattern = createStarterPattern();
  els.digOverlay.classList.add("hidden");
  els.rouletteStatus.textContent = "RECORDS PULLED";
  els.rouletteStatus.classList.add("active");
  els.missionTitle.textContent = "Flip the surprise stack";
  els.missionDetail.textContent = `${currentChallenge.detail} Pulls: ${pulledRecords[0].title}, ${pulledRecords[1].title}, ${pulledRecords[2].title}.`;
  els.rouletteBpm.textContent = averageBpm;
  renderAll();
  drawScene();
}

function autoFlipBeat() {
  ensurePulledRecords();
  pattern = createStarterPattern(true);
  els.missionTitle.textContent = "Beat rouletted";
  els.missionDetail.textContent = `The machine sketched a loop. ${currentChallenge.detail}`;
  renderAll();
  drawScene();
}

function clearBeat() {
  stopBeat();
  pattern = createEmptyPattern();
  currentStep = -1;
  els.missionTitle.textContent = "Fresh grid";
  els.missionDetail.textContent = "Pick a pad, click steps, and make the mystery records talk to each other.";
  renderAll();
  drawScene();
}

function togglePlay() {
  ensurePulledRecords();
  if (playTimer) {
    stopBeat();
    return;
  }
  startBeat();
}

function startBeat() {
  ensureAudioContext();
  currentStep = -1;
  els.playBeatBtn.textContent = "Stop";
  els.rouletteStatus.textContent = "LOOPING";
  tick();
  const bpm = Number(els.rouletteBpm.textContent) || 92;
  playTimer = window.setInterval(tick, (60 / bpm / 4) * 1000);
}

function stopBeat() {
  if (playTimer) window.clearInterval(playTimer);
  playTimer = null;
  currentStep = -1;
  els.playBeatBtn.textContent = "Play";
  if (pulledRecords.length) els.rouletteStatus.textContent = "BEAT READY";
  renderSequencer();
}

function tick() {
  currentStep = (currentStep + 1) % steps;
  lanes.forEach((lane) => {
    const cell = pattern[lane.id][currentStep];
    if (cell) playSample(cell.sample, lane, currentStep);
  });
  renderSequencer();
  drawScene();
}

function saveRun() {
  ensurePulledRecords();
  const score = scorePattern();
  const challengeBonus = currentChallenge.bonus(pattern);
  const best = Math.max(Number(localStorage.getItem(bestKey) || 0), score);
  localStorage.setItem(bestKey, String(best));
  savedLoops += 1;
  localStorage.setItem(savedKey, String(savedLoops));
  els.bestRouletteScore.textContent = formatScore(best);
  els.grooveScore.textContent = String(scoreGroove()).padStart(2, "0");
  const savedEvent = persistPerformanceEvent(
    createRhythmRouletteCompletionEvent({
      bpm: Number(els.rouletteBpm.textContent) || 92,
      challenge: currentChallenge.title,
      challengeBonus,
      groove: scoreGroove(),
      patternDensity: patternDensity(),
      records: pulledRecords,
      savedLoops,
      score,
      trackId: practiceContext.track?.id || "",
      time: practiceContext.track?.time || "--:--",
      trackTitle: practiceContext.track?.title || "",
      mission: practiceContext.mission,
    }),
  );
  practiceContext.markComplete(savedEvent);
  els.rouletteStatus.textContent = "RUN SAVED";
  els.missionTitle.textContent = "Loop logged";
  els.missionDetail.textContent = `${currentChallenge.title} bonus: +${challengeBonus}. This blind crate flip is now in the SetScope toolbelt event timeline.`;
  document.body.classList.add("roulette-saved");
  window.setTimeout(() => document.body.classList.remove("roulette-saved"), 700);
  renderAll();
}

function renderAll() {
  els.pullCount.textContent = `${pulledRecords.length}/3`;
  els.grooveScore.textContent = String(scoreGroove()).padStart(2, "0");
  els.challengeBadge.textContent = currentChallenge.title;
  renderRecords();
  renderCurrentSample();
  renderCrateReceipt();
  renderSampleBank();
  renderSequencer();
}

function renderRecords() {
  if (!pulledRecords.length) {
    els.recordPulls.innerHTML = `<div class="empty-pulls">Mask on. No records pulled yet.</div>`;
    return;
  }
  els.recordPulls.innerHTML = pulledRecords
    .map(
      (record, index) => `
        <article class="record-card" style="--record-color: ${record.color}">
          <div class="pixel-sleeve" aria-hidden="true"><span></span><i></i></div>
          <div>
            <span>Pull ${index + 1}</span>
            <strong>${escapeHtml(record.title)}</strong>
            <em>${escapeHtml(record.artist)}</em>
            <small>${escapeHtml(record.era)} / ${record.bpm} BPM</small>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderSampleBank() {
  if (!pulledRecords.length) {
    els.sampleBank.innerHTML = `<button class="sample-pad empty" disabled>Pull records to unlock pads</button>`;
    return;
  }
  els.sampleBank.innerHTML = pulledRecords
    .flatMap((record) => lanes.map((lane) => createSample(record, lane)))
    .map((sample) => {
      const active = selectedSample?.id === sample.id;
      return `
        <button class="sample-pad ${active ? "active" : ""}" data-sample-id="${escapeHtml(sample.id)}">
          <span>${escapeHtml(sample.lane.label)}</span>
          <strong>${escapeHtml(sample.label)}</strong>
          <em>${escapeHtml(sample.record.mood)}</em>
        </button>
      `;
    })
    .join("");
  els.sampleBank.querySelectorAll("[data-sample-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedSample = findSample(button.dataset.sampleId);
      renderCurrentSample();
      renderSampleBank();
    });
  });
}

function renderCurrentSample() {
  if (!selectedSample) {
    els.currentSampleReadout.textContent = pulledRecords.length ? "Choose a pad, then paint the grid." : "Pull records to load the pad bank.";
    return;
  }
  els.currentSampleReadout.textContent = `${selectedSample.label} / ${selectedSample.record.mood} / ${selectedSample.record.era}`;
}

function renderCrateReceipt() {
  if (!pulledRecords.length) {
    els.crateReceipt.textContent = "No receipt yet.";
    return;
  }
  const density = patternDensity();
  const variety = recordVariety(pattern);
  const bonus = currentChallenge.bonus(pattern);
  els.crateReceipt.innerHTML = `
    <p><span>Constraint</span><strong>${escapeHtml(currentChallenge.title)}</strong></p>
    <p><span>Hits</span><strong>${density}/64</strong></p>
    <p><span>Records used</span><strong>${variety}/3</strong></p>
    <p><span>Bonus</span><strong>+${bonus}</strong></p>
  `;
}

function renderSequencer() {
  els.sequencerGrid.innerHTML = lanes
    .map(
      (lane) => `
        <div class="lane-label">${lane.label}</div>
        ${Array.from({ length: steps }, (_, step) => renderStepButton(lane, step)).join("")}
      `,
    )
    .join("");
  els.sequencerGrid.querySelectorAll("[data-lane]").forEach((button) => {
    button.addEventListener("click", () => toggleStep(button.dataset.lane, Number(button.dataset.step)));
  });
}

function renderStepButton(lane, step) {
  const cell = pattern[lane.id][step];
  const current = step === currentStep;
  return `
    <button
      class="step-cell ${cell ? "filled" : ""} ${current ? "current" : ""}"
      data-lane="${lane.id}"
      data-step="${step}"
      title="${lane.label} step ${step + 1}"
      style="${cell ? `--cell-color: ${cell.sample.record.color}` : ""}"
    >
      ${cell ? cell.sample.short : ""}
    </button>
  `;
}

function toggleStep(laneId, step) {
  ensurePulledRecords();
  if (!selectedSample) selectedSample = createSample(pulledRecords[0], lanes.find((lane) => lane.id === laneId));
  const sample = selectedSample.lane.id === laneId ? selectedSample : createSample(selectedSample.record, lanes.find((lane) => lane.id === laneId));
  pattern[laneId][step] = pattern[laneId][step] ? null : { sample };
  els.missionTitle.textContent = "Grid cooking";
  els.missionDetail.textContent = "Every lit square is a chop from the blind pull. Keep it sparse enough to swing.";
  renderAll();
  drawScene();
}

function playSample(sample, lane, step) {
  ensureAudioContext();
  const now = audioContext.currentTime;
  if (lane.tone === "kick") playKick(now, sample.record.bpm);
  if (lane.tone === "snare") playSnare(now);
  if (lane.tone === "hat") playHat(now);
  if (lane.tone === "chop") playChop(now, sample.record.bpm, step);
}

function playKick(now, bpm) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(92 + (bpm % 12), now);
  osc.frequency.exponentialRampToValueAtTime(42, now + 0.16);
  gain.gain.setValueAtTime(0.9, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain).connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.22);
}

function playSnare(now) {
  const noise = createNoiseBuffer(0.13);
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  source.buffer = noise;
  filter.type = "bandpass";
  filter.frequency.value = 1300;
  gain.gain.setValueAtTime(0.28, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  source.connect(filter).connect(gain).connect(audioContext.destination);
  source.start(now);
}

function playHat(now) {
  const noise = createNoiseBuffer(0.045);
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  source.buffer = noise;
  filter.type = "highpass";
  filter.frequency.value = 5200;
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  source.connect(filter).connect(gain).connect(audioContext.destination);
  source.start(now);
}

function playChop(now, bpm, step) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  const notes = [0, 3, 5, 7, 10, 12];
  osc.type = "sawtooth";
  osc.frequency.value = 146.83 * 2 ** ((notes[(step + bpm) % notes.length]) / 12);
  filter.type = "lowpass";
  filter.frequency.value = 900 + (bpm % 5) * 120;
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(filter).connect(gain).connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

function createNoiseBuffer(duration) {
  const length = Math.max(1, Math.floor(audioContext.sampleRate * duration));
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

function createStarterPattern(loose = false) {
  const next = createEmptyPattern();
  const kickSteps = loose ? [0, 3, 8, 11] : [0, 8];
  const snareSteps = [4, 12];
  const hatSteps = loose ? [2, 4, 6, 10, 12, 14] : [2, 6, 10, 14];
  const chopSteps = loose ? [1, 7, 9, 15] : [1, 9];
  fillLane(next, "kick", kickSteps, 0);
  fillLane(next, "snare", snareSteps, 1);
  fillLane(next, "hat", hatSteps, 2);
  fillLane(next, "chop", chopSteps, 0);
  return next;
}

function fillLane(next, laneId, stepList, recordIndex) {
  const lane = lanes.find((item) => item.id === laneId);
  const record = pulledRecords[recordIndex % pulledRecords.length];
  stepList.forEach((step) => {
    next[laneId][step] = { sample: createSample(record, lane) };
  });
}

function createEmptyPattern() {
  return Object.fromEntries(lanes.map((lane) => [lane.id, Array.from({ length: steps }, () => null)]));
}

function createSample(record, lane) {
  return {
    id: `${record.title}-${lane.id}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label: `${record.title.split(" ")[0]} ${lane.label}`,
    lane,
    record,
    short: record.title.slice(0, 1).toUpperCase(),
  };
}

function findSample(id) {
  return pulledRecords.flatMap((record) => lanes.map((lane) => createSample(record, lane))).find((sample) => sample.id === id) || null;
}

function ensurePulledRecords() {
  if (!pulledRecords.length) blindDig();
}

function ensureAudioContext() {
  audioContext ||= new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
}

function scorePattern() {
  const density = patternDensity();
  return Math.round(density * 34 + recordVariety(pattern) * 220 + scoreGroove() * 55 + currentChallenge.bonus(pattern));
}

function scoreGroove(patternData = pattern) {
  const activeSteps = Object.values(patternData).flat().filter(Boolean).length;
  const backbeat = [4, 12].filter((step) => patternData.snare[step]).length;
  const swing = [3, 7, 11, 15].filter((step) => patternData.kick[step] || patternData.chop[step]).length;
  return Math.min(99, activeSteps * 3 + backbeat * 10 + swing * 7);
}

function patternDensity(patternData = pattern) {
  return Object.values(patternData).flat().filter(Boolean).length;
}

function recordVariety(patternData = pattern) {
  return new Set(
    Object.values(patternData)
      .flat()
      .filter(Boolean)
      .map((cell) => cell.sample.record.title),
  ).size;
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 760;
  const height = canvas.clientHeight || 430;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawScene() {
  const width = canvas.clientWidth || 760;
  const height = canvas.clientHeight || 430;
  const unit = Math.max(4, Math.floor(Math.min(width, height) / 82));
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);
  drawPixelBackground(width, height, unit);
  drawCrates(width, height, unit);
  drawProducer(width, height, unit);
  drawPulledRecords(width, height, unit);
  drawBeatLights(width, height, unit);
  drawChallengePoster(width, unit);
}

function drawPixelBackground(width, height, unit) {
  context.fillStyle = "#15171c";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#202a2d";
  context.fillRect(0, height * 0.6, width, height * 0.4);
  context.fillStyle = "#293034";
  for (let x = 0; x < width; x += unit * 8) {
    context.fillRect(x, height * 0.6, unit * 4, unit);
  }
  context.fillStyle = "#f4aa3e";
  context.fillRect(unit * 4, unit * 5, unit * 30, unit * 5);
  context.fillStyle = "#101113";
  context.font = `${unit * 3}px ui-monospace, monospace`;
  context.fillText("USED RECORDS", unit * 6, unit * 9);
  context.fillStyle = "#60c7ff";
  context.fillRect(width - unit * 24, unit * 6, unit * 18, unit * 8);
  context.fillStyle = "#101113";
  context.fillText("BREAKS", width - unit * 22, unit * 11);
}

function drawCrates(width, height, unit) {
  const baseY = height - unit * 20;
  for (let crate = 0; crate < 4; crate += 1) {
    const x = unit * 5 + crate * unit * 25;
    context.fillStyle = ["#6fddb1", "#ed6382", "#f4aa3e", "#60c7ff"][crate];
    context.fillRect(x, baseY + (crate % 2) * unit * 3, unit * 21, unit * 13);
    context.fillStyle = "#101113";
    context.fillRect(x + unit * 2, baseY + unit * 3 + (crate % 2) * unit * 3, unit * 17, unit * 2);
    for (let record = 0; record < 8; record += 1) {
      context.fillRect(x + unit * 2 + record * unit * 2, baseY - unit * 3 + (crate % 2) * unit * 3, unit, unit * 8);
    }
  }
}

function drawProducer(width, height, unit) {
  const x = width * 0.52;
  const y = height * 0.37;
  context.fillStyle = "#3f2620";
  context.fillRect(x - unit * 4, y - unit * 8, unit * 8, unit * 8);
  context.fillStyle = "#f1b27d";
  context.fillRect(x - unit * 5, y - unit * 7, unit * 10, unit * 10);
  context.fillStyle = "#101113";
  context.fillRect(x - unit * 6, y - unit * 4, unit * 12, unit * 3);
  context.fillStyle = "#ffe169";
  context.fillRect(x - unit * 2, y - unit * 3, unit * 4, unit);
  context.fillStyle = "#ed6382";
  context.fillRect(x - unit * 7, y + unit * 4, unit * 14, unit * 13);
  context.fillStyle = "#60c7ff";
  context.fillRect(x - unit * 11, y + unit * 6, unit * 5, unit * 13);
  context.fillRect(x + unit * 6, y + unit * 6, unit * 5, unit * 13);
  context.fillStyle = "#101113";
  context.fillRect(x - unit * 8, y + unit * 17, unit * 6, unit * 13);
  context.fillRect(x + unit * 2, y + unit * 17, unit * 6, unit * 13);
}

function drawPulledRecords(width, height, unit) {
  const startX = width - unit * 34;
  const startY = height - unit * 28;
  pulledRecords.forEach((record, index) => {
    const x = startX + index * unit * 10;
    context.fillStyle = record.color;
    context.fillRect(x, startY - index * unit * 4, unit * 8, unit * 8);
    context.fillStyle = "#101113";
    context.fillRect(x + unit * 2, startY + unit * 2 - index * unit * 4, unit * 4, unit * 4);
  });
}

function drawBeatLights(width, height, unit) {
  const y = unit * 18;
  const x = unit * 6;
  for (let step = 0; step < steps; step += 1) {
    const active = Object.values(pattern).some((lane) => lane[step]);
    context.fillStyle = step === currentStep ? "#ffe169" : active ? "#6fddb1" : "#343840";
    context.fillRect(x + step * unit * 3, y, unit * 2, unit * 2);
  }
}

function drawChallengePoster(width, unit) {
  context.fillStyle = "#101113";
  context.fillRect(width - unit * 35, unit * 17, unit * 29, unit * 9);
  context.fillStyle = "#ffe169";
  context.fillRect(width - unit * 34, unit * 18, unit * 27, unit * 2);
  context.fillStyle = "#f5efe4";
  context.font = `${unit * 2}px ui-monospace, monospace`;
  context.fillText(currentChallenge.title.toUpperCase().slice(0, 18), width - unit * 33, unit * 24);
}

function shuffle(items) {
  return [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function formatScore(value) {
  return String(Math.max(0, Number(value) || 0)).padStart(4, "0");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

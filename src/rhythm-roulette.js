import { createRhythmRouletteCompletionEvent, persistPerformanceEvent } from "./performance-events.js";
import { mountPracticeContext } from "./practice-context.js";
import { createRhythmRouletteAudioEngine } from "./rhythm-roulette/audio-engine.js";
import { RHYTHM_LANES, RHYTHM_STEPS, resolveSample, samplesForChallenge } from "./rhythm-roulette/catalog.js";
import { createRhythmRouletteChallenge } from "./rhythm-roulette/challenge.js";
import {
  createRhythmRouletteRun,
  hashRhythmRouletteRun,
  reduceRhythmRoulette,
  rhythmChallengeBonus,
  rhythmPatternDensity,
  rhythmRecordVariety,
  scoreRhythmGroove,
  scoreRhythmRoulette,
} from "./rhythm-roulette/reducer.js";
import { createRhythmRouletteReplay } from "./rhythm-roulette/replay.js";
import { createRhythmRouletteScene } from "./rhythm-roulette/scene.js";

const practiceContext = mountPracticeContext("rhythm-roulette");
const canvas = document.querySelector("#rouletteSceneCanvas");
const scene = createRhythmRouletteScene(canvas);
const audioEngine = createRhythmRouletteAudioEngine();
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
  rouletteA11yStatus: document.querySelector("#rouletteA11yStatus"),
  sampleBank: document.querySelector("#sampleBank"),
  saveRouletteBtn: document.querySelector("#saveRouletteBtn"),
  sequencerGrid: document.querySelector("#sequencerGrid"),
  surpriseBeatBtn: document.querySelector("#surpriseBeatBtn"),
};

const bestKey = "setscope-roulette-best";
const savedKey = "setscope-roulette-saved";
let run = null;
let currentStep = -1;
let playTimer;
let savedLoops = Number(localStorage.getItem(savedKey) || 0);

document.body.dataset.phase = "idle";

els.bestRouletteScore.textContent = formatScore(Number(localStorage.getItem(bestKey) || 0));
scene.resize();
renderAll();
drawScene();

els.blindDigBtn.addEventListener("click", blindDig);
els.surpriseBeatBtn.addEventListener("click", autoFlipBeat);
els.playBeatBtn.addEventListener("click", togglePlay);
els.clearBeatBtn.addEventListener("click", clearBeat);
els.saveRouletteBtn.addEventListener("click", saveRun);
els.sequencerGrid.addEventListener("click", (event) => {
  const button = event.target.closest?.("[data-lane]");
  if (button) toggleStep(button.dataset.lane, Number(button.dataset.step));
});
window.addEventListener("resize", () => {
  scene.resize();
  drawScene();
});
window.addEventListener("pagehide", () => audioEngine.close());

function blindDig() {
  stopBeat();
  run = createRhythmRouletteRun(createRhythmRouletteChallenge({ seed: createSeed() }));
  els.digOverlay.classList.add("hidden");
  els.rouletteStatus.textContent = "RECORDS PULLED";
  els.rouletteStatus.classList.add("active");
  document.body.dataset.phase = "ready";
  els.missionTitle.textContent = "Flip the surprise stack";
  els.missionDetail.textContent = `${run.challenge.rule.detail} Pulls: ${run.challenge.records.map((record) => record.title).join(", ")}.`;
  renderAll();
  drawScene();
  return run;
}

function autoFlipBeat() {
  ensureRun();
  run = reduceRhythmRoulette(run, { type: "auto-flip" });
  els.missionTitle.textContent = "Beat rouletted";
  els.missionDetail.textContent = `The machine sketched a loop. ${run.challenge.rule.detail}`;
  renderAll();
  drawScene();
}

function clearBeat() {
  stopBeat();
  if (run) run = reduceRhythmRoulette(run, { type: "clear" });
  els.missionTitle.textContent = "Fresh grid";
  els.missionDetail.textContent = "Pick a pad, click steps, and make the mystery records talk to each other.";
  renderAll();
  drawScene();
}

function togglePlay() {
  ensureRun();
  if (playTimer) stopBeat();
  else startBeat();
}

function startBeat() {
  currentStep = -1;
  els.playBeatBtn.textContent = "Stop";
  els.rouletteStatus.textContent = "LOOPING";
  document.body.dataset.phase = "active";
  tick();
  playTimer = window.setInterval(tick, (60 / run.challenge.bpm / 4) * 1000);
  renderAccessibleStatus();
}

function stopBeat() {
  if (playTimer) window.clearInterval(playTimer);
  playTimer = null;
  currentStep = -1;
  els.playBeatBtn.textContent = "Play";
  if (run) els.rouletteStatus.textContent = "BEAT READY";
  if (run && document.body.dataset.phase === "active") document.body.dataset.phase = "ready";
  renderSequencer();
  renderAccessibleStatus();
}

function tick() {
  currentStep = (currentStep + 1) % RHYTHM_STEPS;
  RHYTHM_LANES.forEach((lane) => {
    const sample = resolveSample(run.challenge, run.pattern[lane.id][currentStep]);
    if (sample) audioEngine.play(sample, currentStep);
  });
  renderSequencer();
  drawScene();
}

function saveRun() {
  ensureRun();
  run = reduceRhythmRoulette(run, { type: "save" });
  const score = scoreRhythmRoulette(run);
  const groove = scoreRhythmGroove(run.pattern);
  const challengeBonus = rhythmChallengeBonus(run);
  const replay = createRhythmRouletteReplay(run);
  const replayHash = hashRhythmRouletteRun(run);
  const best = Math.max(Number(localStorage.getItem(bestKey) || 0), score);
  localStorage.setItem(bestKey, String(best));
  savedLoops += 1;
  localStorage.setItem(savedKey, String(savedLoops));
  els.bestRouletteScore.textContent = formatScore(best);
  els.grooveScore.textContent = String(groove).padStart(2, "0");
  const savedEvent = persistPerformanceEvent(
    createRhythmRouletteCompletionEvent({
      bpm: run.challenge.bpm,
      challenge: run.challenge.rule.title,
      challengeBonus,
      groove,
      patternDensity: rhythmPatternDensity(run.pattern),
      records: run.challenge.records,
      savedLoops,
      score,
      trackId: practiceContext.track?.id || "",
      time: practiceContext.track?.time || "--:--",
      trackTitle: practiceContext.track?.title || "",
      mission: practiceContext.mission,
      challengeId: run.challenge.id,
      seed: run.challenge.seed,
      replayHash,
      replayActionCount: replay.actions.length,
      endReason: "run-saved",
    }),
  );
  practiceContext.markComplete(savedEvent);
  els.rouletteStatus.textContent = "RUN SAVED";
  document.body.dataset.phase = "saved";
  els.missionTitle.textContent = "Loop logged";
  els.missionDetail.textContent = `${run.challenge.rule.title} bonus: +${challengeBonus}. This blind crate flip is now in the SetScope toolbelt event timeline.`;
  document.body.classList.add("roulette-saved");
  window.setTimeout(() => document.body.classList.remove("roulette-saved"), 700);
  renderAll();
}

function renderAll() {
  els.pullCount.textContent = `${run?.challenge.records.length || 0}/3`;
  els.grooveScore.textContent = String(run ? scoreRhythmGroove(run.pattern) : 0).padStart(2, "0");
  els.challengeBadge.textContent = run?.challenge.rule.title || "Needle drop";
  els.rouletteBpm.textContent = run?.challenge.bpm || "--";
  els.surpriseBeatBtn.disabled = !run;
  els.playBeatBtn.disabled = !run;
  els.clearBeatBtn.disabled = !run;
  els.saveRouletteBtn.disabled = !run;
  renderRecords();
  renderCurrentSample();
  renderCrateReceipt();
  renderSampleBank();
  renderSequencer();
  renderAccessibleStatus();
}

function renderRecords() {
  if (!run) {
    els.recordPulls.innerHTML = `<div class="empty-pulls">Mask on. No records pulled yet.</div>`;
    return;
  }
  els.recordPulls.innerHTML = run.challenge.records.map((record, index) => `
    <article class="record-card" style="--record-color: ${record.color}">
      <div class="pixel-sleeve" aria-hidden="true"><span></span><i></i></div>
      <div><span>Pull ${index + 1}</span><strong>${escapeHtml(record.title)}</strong><em>${escapeHtml(record.artist)}</em><small>${escapeHtml(record.era)} / ${record.bpm} BPM</small></div>
    </article>
  `).join("");
}

function renderSampleBank() {
  if (!run) {
    els.sampleBank.innerHTML = `<button class="sample-pad empty" disabled>Pull records to unlock pads</button>`;
    return;
  }
  els.sampleBank.innerHTML = samplesForChallenge(run.challenge).map((sample) => `
    <button class="sample-pad ${run.selectedSampleId === sample.id ? "active" : ""}" data-sample-id="${escapeHtml(sample.id)}">
      <span>${escapeHtml(sample.lane.label)}</span><strong>${escapeHtml(sample.label)}</strong><em>${escapeHtml(sample.record.mood)}</em>
    </button>
  `).join("");
  els.sampleBank.querySelectorAll("[data-sample-id]").forEach((button) => {
    button.addEventListener("click", () => {
      run = reduceRhythmRoulette(run, { type: "select-sample", sampleId: button.dataset.sampleId });
      renderCurrentSample();
      renderSampleBank();
    });
  });
}

function renderCurrentSample() {
  const sample = run ? resolveSample(run.challenge, run.selectedSampleId) : null;
  els.currentSampleReadout.textContent = sample
    ? `${sample.label} / ${sample.record.mood} / ${sample.record.era}`
    : run ? "Choose a pad, then paint the grid." : "Pull records to load the pad bank.";
}

function renderCrateReceipt() {
  if (!run) {
    els.crateReceipt.textContent = "No receipt yet.";
    return;
  }
  els.crateReceipt.innerHTML = `
    <p><span>Constraint</span><strong>${escapeHtml(run.challenge.rule.title)}</strong></p>
    <p><span>Hits</span><strong>${rhythmPatternDensity(run.pattern)}/64</strong></p>
    <p><span>Records used</span><strong>${rhythmRecordVariety(run)}/3</strong></p>
    <p><span>Bonus</span><strong>+${rhythmChallengeBonus(run)}</strong></p>
  `;
}

function renderSequencer() {
  if (els.sequencerGrid.querySelectorAll("[data-lane]").length !== RHYTHM_LANES.length * RHYTHM_STEPS) {
    els.sequencerGrid.innerHTML = RHYTHM_LANES.map((lane) => `
      <div class="lane-label">${lane.label}</div>
      ${Array.from({ length: RHYTHM_STEPS }, (_, step) => renderStepButton(lane, step)).join("")}
    `).join("");
  }
  RHYTHM_LANES.forEach((lane) => {
    for (let step = 0; step < RHYTHM_STEPS; step += 1) {
      const button = els.sequencerGrid.querySelector(`[data-lane="${lane.id}"][data-step="${step}"]`);
      const sample = run ? resolveSample(run.challenge, run.pattern[lane.id][step]) : null;
      button.classList.toggle("filled", Boolean(sample));
      button.classList.toggle("current", step === currentStep);
      button.textContent = sample?.short || "";
      button.style.setProperty("--cell-color", sample?.record.color || "transparent");
      button.setAttribute("aria-pressed", String(Boolean(sample)));
      button.setAttribute("aria-label", `${lane.label} step ${step + 1}${sample ? `, ${sample.label}` : ", empty"}${step === currentStep ? ", playing" : ""}`);
    }
  });
}

function renderStepButton(lane, step) {
  const sample = run ? resolveSample(run.challenge, run.pattern[lane.id][step]) : null;
  return `<button class="step-cell ${sample ? "filled" : ""} ${step === currentStep ? "current" : ""}" data-lane="${lane.id}" data-step="${step}" title="${lane.label} step ${step + 1}" aria-pressed="${Boolean(sample)}" style="${sample ? `--cell-color: ${sample.record.color}` : ""}">${sample?.short || ""}</button>`;
}

function renderAccessibleStatus() {
  if (!run) {
    els.rouletteA11yStatus.textContent = "Mask on. Pull three records to begin.";
    return;
  }
  const hits = rhythmPatternDensity(run.pattern);
  const playback = playTimer ? `Playing step ${currentStep + 1} of ${RHYTHM_STEPS}.` : "Playback stopped.";
  els.rouletteA11yStatus.textContent = `${run.challenge.records.length} records pulled. ${hits} active steps. Mission score ${scoreRhythmGroove(run.pattern)}. ${playback}`;
}

function toggleStep(laneId, step) {
  ensureRun();
  run = reduceRhythmRoulette(run, { type: "toggle-step", laneId, step });
  els.missionTitle.textContent = "Grid cooking";
  els.missionDetail.textContent = "Every lit square is a chop from the blind pull. Keep it sparse enough to swing.";
  renderAll();
  drawScene();
}

function ensureRun() {
  return run || blindDig();
}

function drawScene() {
  scene.draw({ challenge: run?.challenge, pattern: run?.pattern, currentStep });
}

function createSeed() {
  if (globalThis.crypto?.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0];
  return Date.now() >>> 0;
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

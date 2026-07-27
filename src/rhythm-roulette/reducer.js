import { createSampleId, RHYTHM_LANES, RHYTHM_STEPS, resolveSample } from "./catalog.js";
import { validateRhythmRouletteChallenge } from "./challenge.js";

export const RHYTHM_RUN_VERSION = 1;

export function createRhythmRouletteRun(challenge) {
  const validation = validateRhythmRouletteChallenge(challenge);
  if (!validation.valid) throw new Error(`invalid_rhythm_roulette_challenge:${validation.errors.join(",")}`);
  const selectedSampleId = createSampleId(challenge.records[0].id, RHYTHM_LANES[0].id);
  return {
    schema: "setscope.rhythm-roulette.run",
    schemaVersion: RHYTHM_RUN_VERSION,
    challenge: structuredClone(challenge),
    pattern: createEmptyPattern(),
    selectedSampleId,
    assisted: false,
    playerEdits: 0,
    status: "editing",
    actions: [],
    events: [{ type: "dig", seed: challenge.seed }],
  };
}

export function reduceRhythmRoulette(run, action) {
  if (!run || !action?.type) return run;
  let next = structuredClone(run);
  if (action.type === "select-sample" && resolveSample(next.challenge, action.sampleId)) {
    next.selectedSampleId = action.sampleId;
  } else if (action.type === "toggle-step") {
    if (!toggleStep(next, action)) return run;
  } else if (action.type === "auto-flip") {
    next.pattern = createStarterPattern(next.challenge, { loose: true });
    next.assisted = true;
    next.playerEdits = 0;
    next.status = "editing";
  } else if (action.type === "clear") {
    next.pattern = createEmptyPattern();
    next.assisted = false;
    next.playerEdits = 0;
    next.status = "editing";
  } else if (action.type === "save") {
    next.status = "saved";
  } else {
    return run;
  }
  next.actions.push(normalizeAction(action));
  next.events.push({ type: action.type });
  return next;
}

export function createEmptyPattern() {
  return Object.fromEntries(RHYTHM_LANES.map((lane) => [lane.id, Array.from({ length: RHYTHM_STEPS }, () => null)]));
}

export function createStarterPattern(challenge, { loose = false } = {}) {
  const pattern = createEmptyPattern();
  fillLane(pattern, challenge, "kick", loose ? [0, 3, 8, 11] : [0, 8], 0);
  fillLane(pattern, challenge, "snare", [4, 12], 1);
  fillLane(pattern, challenge, "hat", loose ? [2, 4, 6, 10, 12, 14] : [2, 6, 10, 14], 2);
  fillLane(pattern, challenge, "chop", loose ? [1, 7, 9, 15] : [1, 9], 0);
  return pattern;
}

export function scoreRhythmRoulette(run) {
  const breakdown = scoreRhythmBreakdown(run);
  return breakdown.constraint + breakdown.pocket + breakdown.originality;
}

export function scoreRhythmBreakdown(run) {
  return {
    constraint: rhythmChallengeBonus(run),
    pocket: scoreRhythmGroove(run.pattern) * 5,
    originality: rhythmRecordVariety(run) * 100 + Math.min(100, Number(run.playerEdits || 0) * 10),
  };
}

export function scoreRhythmGroove(pattern) {
  const activeSteps = rhythmPatternDensity(pattern);
  const backbeat = [4, 12].filter((step) => pattern.snare[step]).length;
  const anchors = [0, 8].filter((step) => pattern.kick[step]).length;
  const syncopation = [3, 7, 11, 15].filter((step) => pattern.kick[step] || pattern.chop[step]).length;
  const pocketDensity = activeSteps >= 8 && activeSteps <= 20
    ? 30
    : Math.max(0, 30 - Math.abs(activeSteps - 14) * 3);
  return Math.min(100, pocketDensity + backbeat * 12 + anchors * 10 + syncopation * 7);
}

export function rhythmPatternDensity(pattern) {
  return Object.values(pattern).flat().filter(Boolean).length;
}

export function rhythmRecordVariety(run) {
  return new Set(Object.values(run.pattern).flat().filter(Boolean).map((sampleId) => String(sampleId).split(":")[0])).size;
}

export function rhythmChallengeBonus(run) {
  const id = run.challenge.rule.id;
  if (!rhythmChallengeStatus(run).passed) return 0;
  if (id === "dusty-pocket") return 320;
  if (id === "backbeat-tax") return 360;
  if (id === "three-record-rule") return 420;
  if (id === "late-swing") return 380;
  return 0;
}

export function rhythmChallengeStatus(run) {
  const id = run.challenge.rule.id;
  const density = rhythmPatternDensity(run.pattern);
  if (id === "dusty-pocket") {
    const passed = density >= 8 && density <= 18;
    return {
      passed,
      current: density,
      target: 8,
      progress: density > 18 ? 100 : Math.min(100, Math.round(density / 8 * 100)),
      detail: density > 18 ? `${density} hits / trim to 18` : `${density} hits / build 8-18`,
    };
  }
  if (id === "backbeat-tax") {
    const current = [4, 12].filter((step) => run.pattern.snare[step]).length;
    return { passed: current === 2, current, target: 2, progress: current * 50, detail: `${current}/2 backbeats` };
  }
  if (id === "three-record-rule") {
    const current = rhythmRecordVariety(run);
    return { passed: current >= 3, current, target: 3, progress: Math.round(current / 3 * 100), detail: `${current}/3 records used` };
  }
  if (id === "late-swing") {
    const current = [3, 7, 11, 15].filter((step) => run.pattern.kick[step] || run.pattern.chop[step]).length;
    return { passed: current >= 2, current, target: 2, progress: Math.min(100, current * 50), detail: `${current}/2 late hits` };
  }
  return { passed: false, current: 0, target: 1, progress: 0, detail: "Mission unavailable" };
}

export function hashRhythmRouletteRun(run) {
  const source = JSON.stringify({
    challengeId: run.challenge.id,
    pattern: run.pattern,
    score: scoreRhythmRoulette(run),
    status: run.status,
  });
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function toggleStep(run, action) {
  const lane = RHYTHM_LANES.find((item) => item.id === action.laneId);
  const step = Number(action.step);
  if (!lane || !Number.isInteger(step) || step < 0 || step >= RHYTHM_STEPS) return false;
  const selected = resolveSample(run.challenge, run.selectedSampleId) || resolveSample(run.challenge, createSampleId(run.challenge.records[0].id, lane.id));
  const sampleId = createSampleId(selected.record.id, lane.id);
  run.pattern[lane.id][step] = run.pattern[lane.id][step] ? null : sampleId;
  run.playerEdits = Number(run.playerEdits || 0) + 1;
  run.status = "editing";
  return true;
}

function fillLane(pattern, challenge, laneId, steps, recordIndex) {
  const record = challenge.records[recordIndex % challenge.records.length];
  const sampleId = createSampleId(record.id, laneId);
  steps.forEach((step) => { pattern[laneId][step] = sampleId; });
}

function normalizeAction(action) {
  return {
    type: action.type,
    ...(action.sampleId ? { sampleId: action.sampleId } : {}),
    ...(action.laneId ? { laneId: action.laneId } : {}),
    ...(Number.isInteger(action.step) ? { step: action.step } : {}),
  };
}

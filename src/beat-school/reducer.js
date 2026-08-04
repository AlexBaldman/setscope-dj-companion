import {
  BEAT_SCHOOL_LANES,
  BEAT_SCHOOL_STEPS,
  beatSchoolStepMs,
  validateBeatSchoolChallenge,
} from "./challenge.js";

export const BEAT_SCHOOL_RUN_VERSION = 1;
export const BEAT_SCHOOL_PHASES = ["hear", "watch", "imitate", "repair", "perform", "remix", "save"];

const WINDOWS = { imitate: 145, repair: 115, perform: 90 };

export function createBeatSchoolRun(challenge) {
  const validation = validateBeatSchoolChallenge(challenge);
  if (!validation.valid) throw new Error(`invalid_beat_school_challenge:${validation.errors.join(",")}`);
  return {
    schema: "setscope.beat-school.run",
    schemaVersion: BEAT_SCHOOL_RUN_VERSION,
    challenge: structuredClone(challenge),
    phase: "hear",
    phaseStartMs: 0,
    currentHits: [],
    passes: [],
    repairTarget: null,
    remixPattern: Object.fromEntries(BEAT_SCHOOL_LANES.map((lane) => [lane.id, Array(BEAT_SCHOOL_STEPS).fill(0)])),
    status: "ready",
    actions: [],
  };
}

export function reduceBeatSchool(run, action) {
  if (!run || !action?.type) return run;
  const next = structuredClone(run);
  if (action.type === "set-phase" && BEAT_SCHOOL_PHASES.includes(action.phase)) {
    next.phase = action.phase;
    next.phaseStartMs = finite(action.atMs, 0);
    next.currentHits = [];
    next.status = action.phase === "save" ? "result" : "active";
  } else if (action.type === "hit" && isPlayablePhase(next.phase)) {
    if (finite(action.atMs, 0) < next.phaseStartMs) return run;
    const lane = BEAT_SCHOOL_LANES.find((item) => item.id === action.lane);
    if (!lane) return run;
    const hit = {
      lane: lane.id,
      atMs: finite(action.atMs, 0),
      velocity: clamp(action.velocity, 0, 1),
      sourceKind: String(action.sourceKind || "unknown"),
    };
    next.currentHits.push(hit);
    if (next.phase === "remix") addRemixHit(next, hit);
  } else if (action.type === "complete-pass" && ["imitate", "repair", "perform"].includes(next.phase)) {
    const evaluation = evaluateBeatSchoolPass(next);
    next.passes.push(evaluation);
    next.repairTarget = chooseRepairTarget(evaluation);
    next.status = "result";
  } else if (action.type === "save" && next.phase === "save") {
    next.status = "saved";
  } else {
    return run;
  }
  next.actions.push(normalizeAction(action));
  return next;
}

export function targetsForBeatSchoolRun(run) {
  if (run.phase !== "repair" || !run.repairTarget) return structuredClone(run.challenge.pattern);
  const velocity = run.repairTarget.velocity || 0.85;
  const stepWithinBeat = run.repairTarget.step % run.challenge.stepsPerBeat;
  return Array.from({ length: run.challenge.beatsPerBar }, (_, beat) => ({
    lane: run.repairTarget.lane,
    step: beat * run.challenge.stepsPerBeat + stepWithinBeat,
    velocity,
  }));
}

export function evaluateBeatSchoolPass(run) {
  const targets = targetsForBeatSchoolRun(run);
  const stepMs = beatSchoolStepMs(run.challenge);
  const windowMs = WINDOWS[run.phase] || WINDOWS.perform;
  const usedHits = new Set();
  const targetResults = targets.map((target) => {
    const targetAtMs = run.phaseStartMs + target.step * stepMs;
    let bestIndex = -1;
    let bestError = Number.POSITIVE_INFINITY;
    run.currentHits.forEach((hit, index) => {
      if (usedHits.has(index) || hit.lane !== target.lane) return;
      const error = hit.atMs - targetAtMs;
      if (Math.abs(error) < Math.abs(bestError)) {
        bestError = error;
        bestIndex = index;
      }
    });
    if (bestIndex < 0 || Math.abs(bestError) > windowMs) {
      return { ...target, targetAtMs, hit: false, errorMs: null, velocityError: null };
    }
    usedHits.add(bestIndex);
    const hit = run.currentHits[bestIndex];
    return {
      ...target,
      targetAtMs,
      hit: true,
      errorMs: round(bestError),
      velocityError: round(hit.velocity - target.velocity, 3),
      sourceKind: hit.sourceKind,
    };
  });
  const matched = targetResults.filter((result) => result.hit);
  const extraHits = Math.max(0, run.currentHits.length - usedHits.size);
  const accuracy = targets.length ? matched.length / targets.length * 100 : 0;
  const meanAbsErrorMs = mean(matched.map((result) => Math.abs(result.errorMs)));
  const meanSignedErrorMs = mean(matched.map((result) => result.errorMs));
  const pocket = matched.length ? clamp(100 - meanAbsErrorMs * 0.72 - extraHits * 5, 0, 100) : 0;
  const dynamics = matched.length
    ? clamp(100 - mean(matched.map((result) => Math.abs(result.velocityError))) * 125, 0, 100)
    : 0;
  const score = Math.round(accuracy * 0.52 + pocket * 0.34 + dynamics * 0.14);
  return {
    phase: run.phase,
    score,
    accuracy: round(accuracy),
    pocket: round(pocket),
    dynamics: round(dynamics),
    meanAbsErrorMs: round(meanAbsErrorMs),
    meanSignedErrorMs: round(meanSignedErrorMs),
    timingBias: timingBias(meanSignedErrorMs, matched.length),
    matched: matched.length,
    missed: targets.length - matched.length,
    extraHits,
    windowMs,
    targetResults,
  };
}

export function latestBeatSchoolScore(run) {
  return run.passes.at(-1) || {
    score: 0,
    accuracy: 0,
    pocket: 0,
    dynamics: 0,
    meanSignedErrorMs: 0,
    timingBias: "waiting",
  };
}

export function hashBeatSchoolRun(run) {
  const source = JSON.stringify({
    challengeId: run.challenge.id,
    phase: run.phase,
    passes: run.passes,
    remixPattern: run.remixPattern,
    status: run.status,
  });
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function addRemixHit(run, hit) {
  const stepMs = beatSchoolStepMs(run.challenge);
  const step = Math.max(0, Math.min(BEAT_SCHOOL_STEPS - 1, Math.round((hit.atMs - run.phaseStartMs) / stepMs)));
  run.remixPattern[hit.lane][step] = Math.max(run.remixPattern[hit.lane][step], hit.velocity);
}

function chooseRepairTarget(evaluation) {
  const missed = evaluation.targetResults.find((target) => !target.hit);
  if (missed) return { lane: missed.lane, step: missed.step, velocity: missed.velocity, reason: "missed" };
  const leastPrecise = [...evaluation.targetResults]
    .filter((target) => target.hit)
    .sort((left, right) => Math.abs(right.errorMs) - Math.abs(left.errorMs))[0];
  return leastPrecise
    ? { lane: leastPrecise.lane, step: leastPrecise.step, velocity: leastPrecise.velocity, reason: evaluation.timingBias }
    : null;
}

function timingBias(meanSignedErrorMs, count) {
  if (!count) return "silent";
  if (meanSignedErrorMs < -24) return "early";
  if (meanSignedErrorMs > 24) return "late";
  return "centered";
}

function isPlayablePhase(phase) {
  return ["imitate", "repair", "perform", "remix"].includes(phase);
}

function normalizeAction(action) {
  return {
    type: action.type,
    ...(action.phase ? { phase: action.phase } : {}),
    ...(action.lane ? { lane: action.lane } : {}),
    ...(Number.isFinite(Number(action.atMs)) ? { atMs: Number(action.atMs) } : {}),
    ...(Number.isFinite(Number(action.velocity)) ? { velocity: Number(action.velocity) } : {}),
    ...(action.sourceKind ? { sourceKind: String(action.sourceKind) } : {}),
  };
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, finite(value, minimum)));
}

function mean(values) {
  const finiteValues = values.map(Number).filter(Number.isFinite);
  return finiteValues.length ? finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length : 0;
}

function round(value, places = 1) {
  const scale = 10 ** places;
  return Math.round(Number(value || 0) * scale) / scale;
}

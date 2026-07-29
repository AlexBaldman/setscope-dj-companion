import { validatePitchGatesChallenge } from "./challenge.js";
import { PITCH_MATCH_MODES, signedPitchDistance } from "./pitch-matching.js";

export const PITCH_GATES_RUN_V1 = "setscope.pitch-gates.run.v1";

export function createPitchGatesRun(challenge, { lives } = {}) {
  const validation = validatePitchGatesChallenge(challenge);
  if (!validation.valid) throw new Error(`invalid_pitch_gates_challenge: ${validation.errors.join("; ")}`);
  const defaultLives = challenge.config.assist === "gentle" ? 6 : challenge.config.assist === "balanced" ? 4 : 3;
  const initialLives = Math.max(1, Math.floor(Number(lives) || defaultLives));
  return {
    schemaVersion: PITCH_GATES_RUN_V1,
    challenge,
    status: "running",
    endReason: null,
    elapsedMs: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    initialLives,
    lives: initialLives,
    resolved: 0,
    inputs: [],
    gateResults: challenge.gates.map((gate) => ({
      gateId: gate.id,
      fromMidi: Number.isFinite(gate.fromMidi) ? gate.fromMidi : challenge.config.centerMidi,
      targetMidi: gate.targetMidi,
      intervalSemitones: Number.isFinite(gate.intervalSemitones) ? gate.intervalSemitones : gate.targetMidi - challenge.config.centerMidi,
      outcome: "pending",
      distance: null,
      signedDistance: null,
    })),
    events: [],
  };
}

export function applyPitchInput(run, { atMs, midi = null, clarity = 0 } = {}) {
  if (run.status !== "running") return run;
  const timestamp = Math.max(0, finiteOr(atMs, run.elapsedMs));
  const input = {
    atMs: timestamp,
    midi: Number.isFinite(midi) ? midi : null,
    clarity: clamp(finiteOr(clarity, 0), 0, 1),
  };
  const next = copyRun(run);
  const previous = next.inputs[next.inputs.length - 1];
  if (previous && previous.atMs === input.atMs) next.inputs[next.inputs.length - 1] = input;
  else next.inputs.push(input);
  next.inputs.sort((left, right) => left.atMs - right.atMs);
  return next;
}

export function advancePitchGatesTo(run, targetMs) {
  if (run.status !== "running") return run;
  const nextTime = Math.max(run.elapsedMs, finiteOr(targetMs, run.elapsedMs));
  let next = copyRun(run);
  next.elapsedMs = nextTime;

  for (const gate of next.challenge.gates) {
    if (next.status !== "running" || gate.evaluateAtMs > nextTime) break;
    const result = next.gateResults[gate.index];
    if (result.outcome !== "pending") continue;
    next = evaluateGate(next, gate);
  }

  if (next.status === "running" && next.resolved === next.challenge.gates.length) {
    next.status = "complete";
    next.endReason = "all-gates-resolved";
    next = appendEvent(next, "complete", {
      atMs: next.challenge.gates[next.challenge.gates.length - 1].evaluateAtMs,
      score: next.score,
      bestStreak: next.bestStreak,
    });
  }
  return next;
}

export function finishPitchGatesRun(run, reason = "stopped") {
  if (run.status !== "running") return run;
  let next = copyRun(run);
  next.status = reason === "all-gates-resolved" ? "complete" : "abandoned";
  next.endReason = reason;
  next = appendEvent(next, "complete", { score: next.score, bestStreak: next.bestStreak, reason });
  return next;
}

export function pausePitchGatesRun(run, atMs = run.elapsedMs) {
  const advanced = advancePitchGatesTo(run, atMs);
  if (advanced.status !== "running") return advanced;
  let next = copyRun(advanced);
  next.status = "paused";
  next = appendEvent(next, "pause", { atMs: next.elapsedMs });
  return next;
}

export function resumePitchGatesRun(run) {
  if (run.status !== "paused") return run;
  let next = copyRun(run);
  next.status = "running";
  next = appendEvent(next, "resume", { atMs: next.elapsedMs });
  return next;
}

export function getNextPitchGate(run) {
  const index = run.gateResults.findIndex((result) => result.outcome === "pending");
  return index >= 0 ? run.challenge.gates[index] : null;
}

export function projectPitchGate(run, gate, { startX, hitX, endX = -80 } = {}) {
  if (run.elapsedMs < gate.spawnAtMs || run.elapsedMs > gate.removeAtMs) return null;
  if (run.elapsedMs <= gate.evaluateAtMs) {
    const progress = ratio(run.elapsedMs, gate.spawnAtMs, gate.evaluateAtMs);
    return startX + (hitX - startX) * progress;
  }
  const progress = ratio(run.elapsedMs, gate.evaluateAtMs, gate.removeAtMs);
  return hitX + (endX - hitX) * progress;
}

export function hashPitchGatesRun(run) {
  const payload = JSON.stringify({
    schemaVersion: run.schemaVersion,
    challengeId: run.challenge.id,
    status: run.status,
    endReason: run.endReason,
    score: run.score,
    bestStreak: run.bestStreak,
    lives: run.lives,
    resolved: run.resolved,
    gateResults: run.gateResults,
    events: run.events,
  });
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function evaluateGate(run, gate) {
  const input = representativeInputAt(run.inputs, gate.evaluateAtMs);
  const signedDistance = signedPitchDistance(
    input?.midi,
    gate.targetMidi,
    run.challenge.config.pitchMatchMode || PITCH_MATCH_MODES.exactOctave,
  );
  const octaveDistance = Number.isFinite(input?.midi)
    ? Math.round((input.midi - gate.targetMidi - (signedDistance || 0)) / 12)
    : null;
  const octaveEvidence = run.challenge.config.pitchMatchMode ? { octaveDistance } : {};
  const distance = Number.isFinite(signedDistance) ? Math.abs(signedDistance) : Infinity;
  const outcome = !Number.isFinite(input?.midi)
    ? "unvoiced"
    : distance <= gate.tolerance
      ? "hit"
      : distance <= gate.tolerance * 1.75
        ? "near"
        : "miss";
  let next = copyRun(run);
  next.resolved += 1;
  next.gateResults[gate.index] = {
    gateId: gate.id,
    fromMidi: Number.isFinite(gate.fromMidi) ? gate.fromMidi : run.challenge.config.centerMidi,
    targetMidi: gate.targetMidi,
    intervalSemitones: Number.isFinite(gate.intervalSemitones) ? gate.intervalSemitones : gate.targetMidi - run.challenge.config.centerMidi,
    outcome,
    distance: Number.isFinite(distance) ? distance : null,
    signedDistance,
    ...octaveEvidence,
  };

  if (outcome === "hit") {
    const recovered = next.gateResults[gate.index - 1]?.outcome === "miss";
    next.streak += 1;
    next.bestStreak = Math.max(next.bestStreak, next.streak);
    const points = 100 + next.streak * 20;
    next.score += points;
    next = appendEvent(next, "hit", { atMs: gate.evaluateAtMs, gateId: gate.id, targetMidi: gate.targetMidi, distance, signedDistance, ...octaveEvidence, points });
    if (recovered) next = appendEvent(next, "recovery", { atMs: gate.evaluateAtMs, gateId: gate.id, targetMidi: gate.targetMidi });
  } else if (outcome === "near") {
    next.streak = 0;
    const points = 35;
    next.score += points;
    next = appendEvent(next, "near", {
      atMs: gate.evaluateAtMs,
      gateId: gate.id,
      targetMidi: gate.targetMidi,
      distance,
      signedDistance,
      ...octaveEvidence,
      points,
    });
  } else if (outcome === "unvoiced") {
    next.streak = 0;
    next = appendEvent(next, "unvoiced", {
      atMs: gate.evaluateAtMs,
      gateId: gate.id,
      targetMidi: gate.targetMidi,
      distance: null,
      signedDistance: null,
    });
  } else {
    next.streak = 0;
    next.lives -= 1;
    next = appendEvent(next, outcome, {
      atMs: gate.evaluateAtMs,
      gateId: gate.id,
      targetMidi: gate.targetMidi,
      distance: Number.isFinite(distance) ? distance : null,
      signedDistance,
      ...octaveEvidence,
    });
    if (next.lives <= 0) {
      next.status = "complete";
      next.endReason = "out-of-lives";
      next = appendEvent(next, "complete", {
        atMs: gate.evaluateAtMs,
        score: next.score,
        bestStreak: next.bestStreak,
        reason: next.endReason,
      });
    }
  }
  return next;
}

function appendEvent(run, type, values) {
  const next = copyRun(run);
  next.events.push({ sequence: next.events.length + 1, type, atMs: next.elapsedMs, ...values });
  return next;
}

function representativeInputAt(inputs, atMs, lookbackMs = 220) {
  const recent = inputs.filter((input) => input.atMs <= atMs && input.atMs >= atMs - lookbackMs);
  const pitched = recent.filter((input) => Number.isFinite(input.midi) && input.clarity >= 0.35);
  if (pitched.length === 0) return null;
  const sorted = [...pitched].sort((left, right) => left.midi - right.midi);
  return sorted[Math.floor(sorted.length / 2)];
}

function copyRun(run) {
  return {
    ...run,
    inputs: [...run.inputs],
    gateResults: run.gateResults.map((result) => ({ ...result })),
    events: run.events.map((event) => ({ ...event })),
  };
}

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function ratio(value, start, end) {
  return clamp((value - start) / (end - start), 0, 1);
}

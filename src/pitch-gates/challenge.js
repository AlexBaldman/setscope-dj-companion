export const PITCH_GATES_CHALLENGE_V1 = "setscope.pitch-gates.challenge.v1";

const REGISTER_BASES = { low: 45, mid: 57, high: 69 };
const SPEEDS = {
  easy: { leadTimeMs: 7200, removeDelayMs: 1000, spawnIntervalMs: 2350, tolerance: 0.62 },
  groove: { leadTimeMs: 5400, removeDelayMs: 760, spawnIntervalMs: 1820, tolerance: 0.48 },
  rush: { leadTimeMs: 4100, removeDelayMs: 580, spawnIntervalMs: 1450, tolerance: 0.38 },
};
const SCALE_STEPS = [0, 2, 4, 5, 7, 9, 12];

export function createPitchGatesChallenge({ seed = 1, register = "mid", speed = "groove", totalGates = 12 } = {}) {
  const normalizedSeed = normalizeSeed(seed);
  const normalizedRegister = REGISTER_BASES[register] ? register : "mid";
  const normalizedSpeed = SPEEDS[speed] ? speed : "groove";
  const count = Math.max(1, Math.min(64, Math.floor(Number(totalGates) || 12)));
  const config = SPEEDS[normalizedSpeed];
  const random = createSeededRandom(normalizedSeed);
  const baseMidi = REGISTER_BASES[normalizedRegister];

  const gates = Array.from({ length: count }, (_, index) => {
    const randomStep = Math.floor(random() * SCALE_STEPS.length);
    const step = SCALE_STEPS[(index * 3 + randomStep) % SCALE_STEPS.length];
    const spawnAtMs = 350 + index * config.spawnIntervalMs;
    const evaluateAtMs = spawnAtMs + config.leadTimeMs;
    return {
      id: `gate-${String(index + 1).padStart(2, "0")}`,
      index,
      targetMidi: baseMidi + step,
      spawnAtMs,
      evaluateAtMs,
      removeAtMs: evaluateAtMs + config.removeDelayMs,
      tolerance: config.tolerance,
    };
  });

  return {
    schemaVersion: PITCH_GATES_CHALLENGE_V1,
    id: `pitch-gates-${normalizedRegister}-${normalizedSpeed}-${normalizedSeed}`,
    version: 1,
    seed: normalizedSeed,
    skillIds: ["pitch-center", "stable-hold", "anticipation"],
    config: {
      register: normalizedRegister,
      speed: normalizedSpeed,
      baseMidi,
      totalGates: count,
    },
    gates,
  };
}

export function validatePitchGatesChallenge(challenge) {
  const errors = [];
  if (!challenge || typeof challenge !== "object" || Array.isArray(challenge)) return { valid: false, errors: ["challenge must be an object"] };
  if (challenge.schemaVersion !== PITCH_GATES_CHALLENGE_V1) errors.push("unsupported challenge schema");
  if (!Number.isInteger(challenge.seed)) errors.push("seed must be an integer");
  if (!challenge.config || !REGISTER_BASES[challenge.config.register]) errors.push("register is not supported");
  if (!challenge.config || !SPEEDS[challenge.config.speed]) errors.push("speed is not supported");
  if (!Array.isArray(challenge.gates) || challenge.gates.length === 0) errors.push("gates must be a non-empty array");
  challenge.gates?.forEach((gate, index) => {
    if (!Number.isFinite(gate.targetMidi)) errors.push(`gates[${index}].targetMidi must be finite`);
    if (!Number.isFinite(gate.spawnAtMs) || !Number.isFinite(gate.evaluateAtMs)) errors.push(`gates[${index}] timing must be finite`);
    if (!(gate.spawnAtMs < gate.evaluateAtMs && gate.evaluateAtMs < gate.removeAtMs)) errors.push(`gates[${index}] timing must be ordered`);
  });
  return { valid: errors.length === 0, errors };
}

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeSeed(seed) {
  const number = Number(seed);
  return Number.isFinite(number) ? Math.floor(number) >>> 0 : 1;
}

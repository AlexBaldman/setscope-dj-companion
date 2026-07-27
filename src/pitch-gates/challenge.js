export const PITCH_GATES_CHALLENGE_V2 = "setscope.pitch-gates.challenge.v2";

const REGISTER_CENTERS = { low: 48, mid: 55, high: 64 };
const SPEEDS = {
  easy: { leadTimeMs: 7600, removeDelayMs: 1100, spawnIntervalMs: 2500 },
  groove: { leadTimeMs: 5700, removeDelayMs: 820, spawnIntervalMs: 1900 },
  rush: { leadTimeMs: 4300, removeDelayMs: 620, spawnIntervalMs: 1500 },
};
const ASSISTS = {
  gentle: { tolerance: 1.05 },
  balanced: { tolerance: 0.7 },
  exact: { tolerance: 0.42 },
};
const DRILLS = new Set(["journey", "adaptive", "steps", "leaps"]);
const PHRASE_OFFSETS = [-5, -3, -1, 0, 2, 4, 5];

export function createPitchGatesChallenge({
  seed = 1,
  register = "low",
  speed = "easy",
  assist = "gentle",
  centerMidi,
  drill = "journey",
  focusInterval = 2,
  rangeMinMidi,
  rangeMaxMidi,
  totalGates = 12,
} = {}) {
  const normalizedSeed = normalizeSeed(seed);
  const normalizedRegister = register === "personal" || REGISTER_CENTERS[register] ? register : "low";
  const normalizedSpeed = SPEEDS[speed] ? speed : "easy";
  const normalizedAssist = ASSISTS[assist] ? assist : "gentle";
  const normalizedDrill = DRILLS.has(drill) ? drill : "journey";
  const count = Math.max(1, Math.min(64, Math.floor(Number(totalGates) || 12)));
  const config = SPEEDS[normalizedSpeed];
  const random = createSeededRandom(normalizedSeed);
  const fallbackCenter = REGISTER_CENTERS[normalizedRegister] || REGISTER_CENTERS.low;
  const normalizedCenter = clamp(Number.isFinite(centerMidi) ? centerMidi : fallbackCenter, 36, 76);
  const normalizedRangeMin = clamp(Number.isFinite(rangeMinMidi) ? rangeMinMidi : normalizedCenter - 6, 24, normalizedCenter);
  const normalizedRangeMax = clamp(Number.isFinite(rangeMaxMidi) ? rangeMaxMidi : normalizedCenter + 6, normalizedCenter, 88);
  const normalizedFocus = clamp(
    Math.round(Number(focusInterval) || 0),
    Math.ceil(normalizedRangeMin - normalizedCenter),
    Math.floor(normalizedRangeMax - normalizedCenter),
  );
  const phrase = normalizedDrill === "journey"
    ? createStepwisePhrase(count, random)
    : createIntervalPhrase(count, normalizedFocus);

  const gates = phrase.map((offset, index) => {
    const spawnAtMs = 350 + index * config.spawnIntervalMs;
    const evaluateAtMs = spawnAtMs + config.leadTimeMs;
    const previousOffset = index === 0 ? 0 : phrase[index - 1];
    return {
      id: `gate-${String(index + 1).padStart(2, "0")}`,
      index,
      fromMidi: normalizedCenter + previousOffset,
      targetMidi: normalizedCenter + offset,
      intervalSemitones: offset - previousOffset,
      spawnAtMs,
      evaluateAtMs,
      removeAtMs: evaluateAtMs + config.removeDelayMs,
      tolerance: ASSISTS[normalizedAssist].tolerance,
    };
  });

  return {
    schemaVersion: PITCH_GATES_CHALLENGE_V2,
    id: `pitch-gates-${normalizedRegister}-${normalizedDrill}-${normalizedFocus}-${normalizedSpeed}-${normalizedAssist}-${Math.round(normalizedCenter * 10)}-${normalizedSeed}`,
    version: 2,
    seed: normalizedSeed,
    skillIds: ["pitch-center", "stable-hold", "interval-hearing", "anticipation", `interval-${normalizedFocus}`],
    config: {
      register: normalizedRegister,
      drill: normalizedDrill,
      focusInterval: normalizedFocus,
      speed: normalizedSpeed,
      assist: normalizedAssist,
      centerMidi: normalizedCenter,
      rangeMinMidi: normalizedRangeMin,
      rangeMaxMidi: normalizedRangeMax,
      totalGates: count,
    },
    gates,
  };
}

export function validatePitchGatesChallenge(challenge) {
  const errors = [];
  if (!challenge || typeof challenge !== "object" || Array.isArray(challenge)) return { valid: false, errors: ["challenge must be an object"] };
  if (challenge.schemaVersion !== PITCH_GATES_CHALLENGE_V2) errors.push("unsupported challenge schema");
  if (!Number.isInteger(challenge.seed)) errors.push("seed must be an integer");
  if (!challenge.config || !(challenge.config.register === "personal" || REGISTER_CENTERS[challenge.config.register])) errors.push("register is not supported");
  if (!challenge.config || !SPEEDS[challenge.config.speed]) errors.push("speed is not supported");
  if (!challenge.config || !ASSISTS[challenge.config.assist]) errors.push("assist is not supported");
  if (!challenge.config || !DRILLS.has(challenge.config.drill || "journey")) errors.push("drill is not supported");
  if (!Number.isFinite(challenge.config?.centerMidi)) errors.push("centerMidi must be finite");
  if (!Array.isArray(challenge.gates) || challenge.gates.length === 0) errors.push("gates must be a non-empty array");
  challenge.gates?.forEach((gate, index) => {
    if (!Number.isFinite(gate.targetMidi)) errors.push(`gates[${index}].targetMidi must be finite`);
    if (gate.targetMidi < challenge.config.rangeMinMidi || gate.targetMidi > challenge.config.rangeMaxMidi) errors.push(`gates[${index}] is outside the playable range`);
    if (!Number.isFinite(gate.spawnAtMs) || !Number.isFinite(gate.evaluateAtMs)) errors.push(`gates[${index}] timing must be finite`);
    if (!(gate.spawnAtMs < gate.evaluateAtMs && gate.evaluateAtMs < gate.removeAtMs)) errors.push(`gates[${index}] timing must be ordered`);
  });
  return { valid: errors.length === 0, errors };
}

function createIntervalPhrase(count, focusInterval) {
  const phrase = [];
  for (let index = 0; index < count; index += 1) {
    if (index < 2 || index % 2 === 1) phrase.push(0);
    else phrase.push(focusInterval);
  }
  return phrase;
}

function createStepwisePhrase(count, random) {
  const centerIndex = PHRASE_OFFSETS.indexOf(0);
  const phrase = [];
  let scaleIndex = centerIndex;
  for (let index = 0; index < count; index += 1) {
    if (index === 0 || index === 1) scaleIndex = centerIndex;
    else if (index === 2) scaleIndex = centerIndex + (random() < 0.5 ? -1 : 1);
    else {
      const direction = random() < 0.5 ? -1 : 1;
      scaleIndex = clamp(scaleIndex + direction, 0, PHRASE_OFFSETS.length - 1);
    }
    phrase.push(PHRASE_OFFSETS[scaleIndex]);
  }
  return phrase;
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

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export const BEAT_SCHOOL_CHALLENGE_VERSION = 1;
export const BEAT_SCHOOL_LANES = [
  { id: "kick", label: "Kick", key: "A", color: "#ffb23f" },
  { id: "snare", label: "Snare", key: "S", color: "#ff5f89" },
  { id: "hat", label: "Hat", key: "D", color: "#59d7ff" },
  { id: "clap", label: "Clap", key: "F", color: "#73e0ad" },
];
export const BEAT_SCHOOL_STEPS = 16;

export function createBeatSchoolChallenge({ seed = 1 } = {}) {
  const normalizedSeed = normalizeSeed(seed);
  const random = createSeededRandom(normalizedSeed);
  const bpm = [88, 92, 96, 100][Math.floor(random() * 4)];
  const kickVariation = random() > 0.5 ? 10 : 11;
  return {
    schema: "setscope.beat-school.challenge",
    schemaVersion: BEAT_SCHOOL_CHALLENGE_VERSION,
    id: `beat-school-${normalizedSeed}`,
    seed: normalizedSeed,
    lessonId: "pocket-foundations-1",
    title: "Backbeat Blueprint",
    bpm,
    beatsPerBar: 4,
    stepsPerBeat: 4,
    bars: 1,
    pattern: [
      event("kick", 0, 0.94),
      event("kick", 3, 0.68),
      event("snare", 4, 0.9),
      event("kick", 8, 0.88),
      event("kick", kickVariation, 0.66),
      event("snare", 12, 0.94),
    ],
  };
}

export function validateBeatSchoolChallenge(challenge) {
  const errors = [];
  if (challenge?.schema !== "setscope.beat-school.challenge") errors.push("invalid schema");
  if (challenge?.schemaVersion !== BEAT_SCHOOL_CHALLENGE_VERSION) errors.push("unsupported version");
  if (!Number.isInteger(challenge?.seed)) errors.push("seed required");
  if (!Number.isFinite(challenge?.bpm) || challenge.bpm < 30 || challenge.bpm > 300) errors.push("invalid bpm");
  if (!Array.isArray(challenge?.pattern) || !challenge.pattern.length) errors.push("pattern required");
  for (const target of challenge?.pattern || []) {
    if (!BEAT_SCHOOL_LANES.some((lane) => lane.id === target.lane)) errors.push("invalid lane");
    if (!Number.isInteger(target.step) || target.step < 0 || target.step >= BEAT_SCHOOL_STEPS) errors.push("invalid step");
  }
  return { valid: errors.length === 0, errors };
}

export function beatSchoolStepMs(challenge) {
  return 60000 / challenge.bpm / challenge.stepsPerBeat;
}

export function createSeededRandom(seed) {
  let value = normalizeSeed(seed) || 1;
  return () => {
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function event(lane, step, velocity) {
  return { lane, step, velocity };
}

function normalizeSeed(seed) {
  const number = Number(seed);
  return Number.isFinite(number) ? Math.abs(Math.trunc(number)) >>> 0 : 1;
}

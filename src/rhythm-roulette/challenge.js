import { RECORD_CRATE, RHYTHM_CHALLENGES } from "./catalog.js";

export const RHYTHM_CHALLENGE_VERSION = 1;

export function createRhythmRouletteChallenge({ seed = 1 } = {}) {
  const normalizedSeed = normalizeSeed(seed);
  const random = createSeededRandom(normalizedSeed);
  const records = shuffleWithRandom(RECORD_CRATE, random).slice(0, 3).map((record) => ({ ...record }));
  const challenge = RHYTHM_CHALLENGES[Math.floor(random() * RHYTHM_CHALLENGES.length)];
  return {
    schema: "setscope.rhythm-roulette.challenge",
    schemaVersion: RHYTHM_CHALLENGE_VERSION,
    id: `roulette-${normalizedSeed}`,
    seed: normalizedSeed,
    bpm: Math.round(records.reduce((sum, record) => sum + record.bpm, 0) / records.length),
    rule: { ...challenge },
    records,
  };
}

export function validateRhythmRouletteChallenge(challenge) {
  const errors = [];
  if (challenge?.schema !== "setscope.rhythm-roulette.challenge") errors.push("invalid schema");
  if (challenge?.schemaVersion !== RHYTHM_CHALLENGE_VERSION) errors.push("unsupported version");
  if (!Number.isInteger(challenge?.seed)) errors.push("seed required");
  if (!Array.isArray(challenge?.records) || challenge.records.length !== 3) errors.push("three records required");
  if (!challenge?.rule?.id) errors.push("rule required");
  return { valid: errors.length === 0, errors };
}

export function createSeededRandom(seed) {
  let value = normalizeSeed(seed) || 1;
  return () => {
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRandom(items, random) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function normalizeSeed(seed) {
  const number = Number(seed);
  return Number.isFinite(number) ? Math.abs(Math.trunc(number)) >>> 0 : 1;
}

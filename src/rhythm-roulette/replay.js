import { createRhythmRouletteRun, hashRhythmRouletteRun, reduceRhythmRoulette } from "./reducer.js";

export const RHYTHM_REPLAY_VERSION = 1;

export function createRhythmRouletteReplay(run) {
  return {
    schema: "setscope.rhythm-roulette.replay",
    schemaVersion: RHYTHM_REPLAY_VERSION,
    challenge: structuredClone(run.challenge),
    actions: structuredClone(run.actions),
    expectedHash: hashRhythmRouletteRun(run),
  };
}

export function replayRhythmRoulette(replay) {
  if (replay?.schema !== "setscope.rhythm-roulette.replay" || replay?.schemaVersion !== RHYTHM_REPLAY_VERSION) {
    throw new Error("invalid_rhythm_roulette_replay");
  }
  const run = replay.actions.reduce((current, action) => reduceRhythmRoulette(current, action), createRhythmRouletteRun(replay.challenge));
  const hash = hashRhythmRouletteRun(run);
  return { run, hash, matches: hash === replay.expectedHash };
}

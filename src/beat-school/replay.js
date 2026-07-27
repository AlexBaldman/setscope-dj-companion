import { createBeatSchoolRun, hashBeatSchoolRun, reduceBeatSchool } from "./reducer.js";

export const BEAT_SCHOOL_REPLAY_VERSION = 1;

export function createBeatSchoolReplay(run) {
  return {
    schema: "setscope.beat-school.replay",
    schemaVersion: BEAT_SCHOOL_REPLAY_VERSION,
    challenge: structuredClone(run.challenge),
    actions: structuredClone(run.actions),
    expectedHash: hashBeatSchoolRun(run),
  };
}

export function replayBeatSchool(replay) {
  if (replay?.schema !== "setscope.beat-school.replay" || replay?.schemaVersion !== BEAT_SCHOOL_REPLAY_VERSION) {
    throw new Error("invalid_beat_school_replay");
  }
  const run = replay.actions.reduce((current, action) => reduceBeatSchool(current, action), createBeatSchoolRun(replay.challenge));
  const hash = hashBeatSchoolRun(run);
  return { run, hash, matches: hash === replay.expectedHash };
}

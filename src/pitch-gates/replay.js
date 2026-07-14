import {
  applyPitchInput,
  advancePitchGatesTo,
  createPitchGatesRun,
  finishPitchGatesRun,
  hashPitchGatesRun,
  pausePitchGatesRun,
  resumePitchGatesRun,
} from "./reducer.js";

export const PITCH_GATES_REPLAY_V1 = "setscope.pitch-gates.replay.v1";

export function createPitchGatesReplay(run) {
  return {
    schemaVersion: PITCH_GATES_REPLAY_V1,
    challenge: run.challenge,
    initialLives: run.initialLives,
    actions: [
      ...run.inputs.map((input) => ({ type: "pitch-input", ...input })),
      ...run.events
        .filter((event) => event.type === "pause" || event.type === "resume")
        .map((event) => ({ type: event.type, atMs: event.atMs })),
    ].sort((left, right) => left.atMs - right.atMs),
    finalElapsedMs: run.elapsedMs,
    terminal: { status: run.status, endReason: run.endReason },
    expectedHash: hashPitchGatesRun(run),
  };
}

export function replayPitchGates(replay) {
  if (replay?.schemaVersion !== PITCH_GATES_REPLAY_V1) throw new Error("invalid_pitch_gates_replay");
  let run = createPitchGatesRun(replay.challenge, { lives: replay.initialLives });
  for (const action of replay.actions) {
    if (action.type === "pitch-input") run = applyPitchInput(run, action);
    if (action.type === "pause") run = pausePitchGatesRun(run, action.atMs);
    if (action.type === "resume") run = resumePitchGatesRun(run);
  }
  run = advancePitchGatesTo(run, replay.finalElapsedMs);
  if (run.status === "running" && replay.terminal?.status === "abandoned") {
    run = finishPitchGatesRun(run, replay.terminal.endReason);
  }
  return { run, hash: hashPitchGatesRun(run), matches: hashPitchGatesRun(run) === replay.expectedHash };
}

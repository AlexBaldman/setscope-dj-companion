import { persistAudioEvent } from "./state.js";

export function createPerformanceEvent({ modeId, status = "complete", score = 0, streak = 0, sourceLabel = "none", details = {}, evidence = {} } = {}) {
  return {
    kind: "performance",
    modeId: modeId || "unknown-mode",
    status,
    score: Number(score) || 0,
    streak: Number(streak) || 0,
    sourceLabel,
    details,
    evidence,
    createdAt: new Date().toISOString(),
  };
}

export function createPitchGatesCompletionEvent({ sourceLabel, register, speed, score, streak, resolved, totalGates, lives } = {}) {
  return createPerformanceEvent({
    modeId: "pitch-gates",
    score,
    streak,
    sourceLabel,
    details: {
      game: "Pitch Gates",
      register,
      speed,
      resolved,
      totalGates,
      lives,
    },
    evidence: {
      summary: `${sourceLabel} / ${register} / ${score} pts / streak ${streak}`,
    },
  });
}

export function persistPerformanceEvent(event) {
  persistAudioEvent({
    type: audioEventTypeForMode(event.modeId),
    time: "--:--",
    title: event.details?.game ? `${event.details.game} run` : "Performance run",
    detail: event.evidence?.summary || `${event.sourceLabel} / ${event.score} pts / streak ${event.streak}`,
    metadata: event,
  });
}

function audioEventTypeForMode(modeId) {
  if (modeId === "pitch-gates") return "instrument";
  if (modeId === "audio-lab") return "analysis";
  return "learning";
}

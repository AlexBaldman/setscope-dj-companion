import { persistAudioEvent } from "./state.js";

export function createPerformanceEvent({
  modeId,
  status = "complete",
  score = 0,
  streak = 0,
  sourceLabel = "none",
  trackId = "",
  time = "--:--",
  details = {},
  evidence = {},
} = {}) {
  return {
    kind: "performance",
    modeId: modeId || "unknown-mode",
    status,
    score: Number(score) || 0,
    streak: Number(streak) || 0,
    sourceLabel,
    trackId,
    time,
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

export function createRhythmRouletteCompletionEvent({ bpm, records = [], score, groove, patternDensity, savedLoops } = {}) {
  const recordLine = records.map((record) => record.title).filter(Boolean).join(" + ");
  return createPerformanceEvent({
    modeId: "rhythm-roulette",
    score,
    streak: groove,
    sourceLabel: "Blind crate pull",
    details: {
      game: "Rhythm Roulette",
      bpm,
      groove,
      patternDensity,
      savedLoops,
      records: records.map((record) => ({
        artist: record.artist,
        bpm: record.bpm,
        era: record.era,
        title: record.title,
      })),
    },
    evidence: {
      summary: `${recordLine || "No records"} / ${bpm || "--"} BPM / ${score || 0} pts`,
    },
  });
}

export function persistPerformanceEvent(event) {
  persistAudioEvent({
    type: audioEventTypeForMode(event.modeId),
    trackId: event.trackId,
    time: event.time || "--:--",
    title: event.details?.game ? `${event.details.game} run` : "Performance run",
    detail: event.evidence?.summary || `${event.sourceLabel} / ${event.score} pts / streak ${event.streak}`,
    metadata: event,
  });
}

function audioEventTypeForMode(modeId) {
  if (modeId === "pitch-gates") return "instrument";
  if (modeId === "audio-lab") return "analysis";
  if (modeId === "rhythm-roulette") return "learning";
  return "learning";
}

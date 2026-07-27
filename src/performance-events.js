import { persistAudioEvent } from "./state.js";
import { createPerformanceEventV2, QUARANTINED_METADATA_V1 } from "./contracts/performance-event.js";
import { normalizePerformanceMetadata } from "./migrations/performance-event-v1.js";

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
  assistance = {},
} = {}) {
  return createPerformanceEventV2({
    modeId,
    status,
    score,
    streak,
    sourceLabel,
    trackId,
    time,
    details,
    evidence,
    assistance,
  });
}

export function createPitchGatesCompletionEvent({
  sourceLabel,
  register,
  speed,
  score,
  streak,
  resolved,
  totalGates,
  lives,
  trackId = "",
  time = "--:--",
  trackTitle = "",
  mission = "",
  challengeId = "",
  seed = 0,
  replayHash = "",
  replayActionCount = 0,
  endReason = "",
  profileId = "",
  profileRevision = 0,
  accuracy = 0,
  practiceStage = "",
  diagnosis = {},
  eligibleForMastery = false,
} = {}) {
  return createPerformanceEvent({
    modeId: "pitch-gates",
    score,
    streak,
    sourceLabel,
    trackId,
    time,
    details: {
      game: "Pitch Gates",
      register,
      speed,
      resolved,
      totalGates,
      lives,
      trackTitle,
      mission,
      challengeId,
      seed,
      replayHash,
      replayActionCount,
      endReason,
      profileId,
      profileRevision,
      accuracy,
      practiceStage,
      diagnosis,
    },
    evidence: {
      summary: `${sourceLabel} / ${register} / ${score} pts / streak ${streak}`,
    },
    assistance: {
      level: eligibleForMastery ? "none" : sourceLabel === "DEMO" ? "demo" : "guided",
      eligibleForMastery,
      values: { speed, register },
    },
  });
}

export function createRhythmRouletteCompletionEvent({
  bpm,
  challenge,
  challengeBonus,
  records = [],
  score,
  groove,
  patternDensity,
  savedLoops,
  trackId = "",
  time = "--:--",
  trackTitle = "",
  mission = "",
  challengeId = "",
  seed = 0,
  replayHash = "",
  replayActionCount = 0,
  endReason = "",
  assisted = false,
  playerEdits = 0,
  scoreBreakdown = {},
} = {}) {
  const recordLine = records.map((record) => record.title).filter(Boolean).join(" + ");
  return createPerformanceEvent({
    modeId: "rhythm-roulette",
    score,
    streak: groove,
    sourceLabel: "Blind crate pull",
    trackId,
    time,
    details: {
      game: "Rhythm Roulette",
      bpm,
      challenge,
      challengeBonus,
      groove,
      patternDensity,
      savedLoops,
      records: records.map((record) => ({
        artist: record.artist,
        bpm: record.bpm,
        era: record.era,
        title: record.title,
      })),
      trackTitle,
      mission,
      challengeId,
      seed,
      replayHash,
      replayActionCount,
      endReason,
      assisted,
      playerEdits,
      scoreBreakdown,
    },
    evidence: {
      summary: `${recordLine || "No records"} / ${bpm || "--"} BPM / ${score || 0} pts`,
    },
    assistance: {
      level: assisted ? "guided" : "none",
      eligibleForMastery: !assisted,
      values: { playerEdits },
    },
  });
}

export function persistPerformanceEvent(event) {
  const metadata = normalizePerformanceMetadata(event);
  if (metadata?.schemaVersion === QUARANTINED_METADATA_V1) {
    return persistAudioEvent({
      type: "learning",
      labels: ["review"],
      title: "Quarantined performance event",
      detail: metadata.errors.join(" / "),
      metadata,
    });
  }
  return persistAudioEvent({
    type: audioEventTypeForMode(metadata.modeId),
    labels: labelsForMode(metadata.modeId),
    trackId: metadata.trackId,
    time: metadata.time || "--:--",
    title: metadata.details?.game ? `${metadata.details.game} run` : "Performance run",
    detail: metadata.evidence?.summary || `${metadata.sourceLabel} / ${metadata.score} pts / streak ${metadata.streak}`,
    metadata,
  });
}

function labelsForMode(modeId) {
  if (modeId === "audio-lab") return ["practice", "tuning"];
  if (modeId === "rhythm-roulette") return ["practice", "sample"];
  return ["practice"];
}

function audioEventTypeForMode(modeId) {
  if (modeId === "pitch-gates") return "instrument";
  if (modeId === "audio-lab") return "analysis";
  if (modeId === "rhythm-roulette") return "learning";
  return "learning";
}

import { commitCompletion, recoverPendingCompletion } from "./completion-commit.js";
import { commitAudioEvent, persistAudioEvent } from "./state.js";
import { createPerformanceEventV2, QUARANTINED_METADATA_V1 } from "./contracts/performance-event.js";
import { normalizePerformanceMetadata } from "./migrations/performance-event-v1.js";
import { recordSkillEvidence } from "./skill-graph.js";
import { uid } from "./utils.js";

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
  calibration = {},
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
    calibration,
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

export function createBeatSchoolCompletionEvent({
  challenge,
  score,
  accuracy,
  pocket,
  dynamics,
  timingBias,
  meanSignedErrorMs,
  replayHash,
  replayActionCount,
  sourceLabel = "Touch pads",
  trackId = "",
  time = "--:--",
  mission = "",
  assisted = false,
  calibrationProfile = {},
  timingEligible = false,
} = {}) {
  return createPerformanceEvent({
    modeId: "beat-school",
    score,
    sourceLabel,
    trackId,
    time,
    details: {
      game: "Beat School",
      lessonId: challenge?.lessonId || "",
      challengeId: challenge?.id || "",
      seed: challenge?.seed || 0,
      bpm: challenge?.bpm || 0,
      accuracy,
      pocket,
      dynamics,
      timingBias,
      meanSignedErrorMs,
      replayHash,
      replayActionCount,
      mission,
      timingConfidence: calibrationProfile.confidence || 0,
      timingMethod: calibrationProfile.method || "manual",
      timingJitterMs: calibrationProfile.jitterMs || 0,
    },
    evidence: {
      summary: `${challenge?.title || "Beat lesson"} / ${score || 0} pts / ${timingBias || "waiting"} pocket`,
    },
    assistance: {
      level: assisted ? "demo" : timingEligible ? "none" : "guided",
      eligibleForMastery: !assisted && timingEligible,
      values: { assisted, timingEligible },
    },
    calibration: {
      status: timingEligible ? "calibrated" : "degraded",
      values: {
        profileId: calibrationProfile.profileId || "",
        method: calibrationProfile.method || "manual",
        confidence: calibrationProfile.confidence || 0,
        jitterMs: calibrationProfile.jitterMs || 0,
        sampleCount: calibrationProfile.sampleCount || 0,
      },
    },
  });
}

export function persistPerformanceEvent(event, { missionId = "", storage = globalThis.localStorage } = {}) {
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
  const createdAt = metadata.createdAt || new Date().toISOString();
  const audioEvent = {
    id: uid(),
    type: audioEventTypeForMode(metadata.modeId),
    labels: labelsForMode(metadata.modeId),
    trackId: metadata.trackId,
    time: metadata.time || "--:--",
    title: metadata.details?.game ? `${metadata.details.game} run` : "Performance run",
    detail: metadata.evidence?.summary || `${metadata.sourceLabel} / ${metadata.score} pts / streak ${metadata.streak}`,
    metadata,
    createdAt,
  };
  return commitCompletion(
    {
      audioEvent,
      metadata,
      missionId,
      createdAt,
    },
    completionDependencies(storage),
  );
}

export function recoverPerformanceCompletion(storage = globalThis.localStorage) {
  try {
    return recoverPendingCompletion(completionDependencies(storage));
  } catch {
    return null;
  }
}

function completionDependencies(storage) {
  return {
    storage,
    commitDraft: (audioEvent, missionId, targetStorage) => commitAudioEvent(audioEvent, missionId, targetStorage),
    commitSkill: recordSkillEvidence,
  };
}

function labelsForMode(modeId) {
  if (modeId === "audio-lab") return ["practice", "tuning"];
  if (modeId === "rhythm-roulette") return ["practice", "sample"];
  if (modeId === "beat-school") return ["practice", "rhythm"];
  return ["practice"];
}

function audioEventTypeForMode(modeId) {
  if (modeId === "pitch-gates") return "instrument";
  if (modeId === "audio-lab") return "analysis";
  if (modeId === "rhythm-roulette") return "learning";
  return "learning";
}

recoverPerformanceCompletion();

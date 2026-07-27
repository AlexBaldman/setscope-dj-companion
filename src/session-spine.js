import { practiceSurfaces } from "./product-manifest.js";

export const PRACTICE_MISSION_SCHEMA = "setscope.practice-mission";
export const PRACTICE_MISSION_VERSION = 1;

const MODE_LABELS = Object.freeze(Object.fromEntries(
  practiceSurfaces.map(({ id, label }) => [id, label]),
));

export function createPracticeMission({
  id,
  sessionId,
  track,
  modeId,
  prompt,
  source = "next-move",
  createdAt = new Date().toISOString(),
} = {}) {
  if (!id || !track?.id || !MODE_LABELS[modeId]) throw new Error("practice_mission_fields_required");
  return {
    schema: PRACTICE_MISSION_SCHEMA,
    schemaVersion: PRACTICE_MISSION_VERSION,
    id,
    sessionId: sessionId || "",
    trackId: track.id,
    trackTime: track.time || "--:--",
    trackTitle: track.title || "Untitled track",
    modeId,
    prompt: prompt?.trim() || defaultMissionPrompt(modeId, track),
    source,
    status: "active",
    resultEventId: "",
    createdAt,
    completedAt: "",
  };
}

export function normalizePracticeMission(mission = {}) {
  const source = mission && typeof mission === "object" && !Array.isArray(mission) ? mission : {};
  return {
    schema: PRACTICE_MISSION_SCHEMA,
    schemaVersion: PRACTICE_MISSION_VERSION,
    id: text(source.id),
    sessionId: text(source.sessionId),
    trackId: text(source.trackId),
    trackTime: text(source.trackTime, "--:--"),
    trackTitle: text(source.trackTitle, "Untitled track"),
    modeId: MODE_LABELS[source.modeId] ? source.modeId : "pitch-gates",
    prompt: text(source.prompt),
    source: text(source.source, "next-move"),
    status: source.status === "complete" ? "complete" : "active",
    resultEventId: text(source.resultEventId),
    createdAt: text(source.createdAt),
    completedAt: text(source.completedAt),
  };
}

export function completePracticeMission(mission, event, completedAt = new Date().toISOString()) {
  return {
    ...normalizePracticeMission(mission),
    status: "complete",
    resultEventId: event?.id || mission?.resultEventId || "",
    completedAt,
  };
}

export function deriveSessionSpine(draft = {}, selectedTrack = null, { skillGraph = null } = {}) {
  const tracks = Array.isArray(draft.tracks) ? draft.tracks : [];
  const events = Array.isArray(draft.audioEvents) ? draft.audioEvents : [];
  const missions = (Array.isArray(draft.practiceMissions) ? draft.practiceMissions : []).map(normalizePracticeMission);
  const track = selectedTrack || tracks[0] || null;
  const trackMissions = track ? missions.filter((mission) => mission.trackId === track.id) : [];
  const completedModes = completedModesForTrack(track, events, trackMissions);
  const activeMission = trackMissions.find((mission) => mission.status === "active") || null;
  const nextMove = activeMission ? moveFromMission(activeMission, track) : recommendMove(track, completedModes, skillGraph);
  const completed = missions.filter((mission) => mission.status === "complete").length;
  const practicedTrackIds = new Set([
    ...missions.filter((mission) => mission.status === "complete").map((mission) => mission.trackId),
    ...events.filter((event) => event.metadata?.modeId).map((event) => event.trackId),
  ].filter(Boolean));

  return {
    sessionId: draft.recognitionSessionId || "",
    startedAt: draft.recognitionStartedAt || "",
    nextMove,
    stats: {
      captured: tracks.length,
      practiced: practicedTrackIds.size,
      missionsCompleted: completed,
      activeMissions: missions.length - completed,
    },
  };
}

export function modeLabel(modeId) {
  return MODE_LABELS[modeId] || "Practice";
}

function recommendMove(track, completedModes, skillGraph) {
  if (!track) {
    return {
      modeId: "",
      eyebrow: "Start the session",
      title: "Catch the first record",
      detail: "Listen or import audio to give the session a musical center.",
      prompt: "",
      action: "Listen",
      missionId: "",
    };
  }
  if (track.needsReview || Number(track.confidence) < 80) {
    return buildMove("audio-lab", track, {
      eyebrow: "Verify the moment",
      title: "Put the signal on the bench",
      detail: "A cleaner read will make every later note and practice result more trustworthy.",
      prompt: `Capture the cleanest stable signal around ${track.title}, compare it with the ${track.key || "open"} key tag, and save one evidence-backed read.`,
    });
  }
  if (skillGraph?.focus?.id === "signal" && skillGraph.focus.evidenceCount === 0) {
    return buildMove("audio-lab", track, {
      eyebrow: "Establish your signal",
      title: "Find a comfortable center",
      detail: "A stable starting note gives every pitch mission a playable home base.",
      prompt: `Use Audio Lab to find one comfortable stable note, set your center, and attach the cleanest read to ${track.title}.`,
    });
  }
  if (!completedModes.has("pitch-gates")) {
    return buildMove("pitch-gates", track, {
      eyebrow: "Hear the record",
      title: "Lock onto the hook",
      detail: "Turn recognition into ear training while this set moment is still fresh.",
      prompt: `Find a comfortable note from the hook of ${track.title}, hold its center, and finish one controlled Pitch Gates run.`,
    });
  }
  if (!completedModes.has("rhythm-roulette")) {
    const tempo = Number(track.bpm) ? `${track.bpm} BPM` : "set-tempo";
    return buildMove("rhythm-roulette", track, {
      eyebrow: "Flip the pocket",
      title: "Answer the record with a beat",
      detail: "Translate what you heard into rhythm, arrangement, and player choices.",
      prompt: `Build a ${tempo} flip that could sit beside ${track.title}, make at least four deliberate pad edits, and save the pocket.`,
    });
  }
  if (!completedModes.has("audio-lab")) {
    return buildMove("audio-lab", track, {
      eyebrow: "Read the signal",
      title: "Inspect what your ears found",
      detail: "Connect pitch and groove practice to measurable audio evidence.",
      prompt: `Capture one stable signal from ${track.title}, compare pitch and level, and attach the cleanest snapshot to this set moment.`,
    });
  }
  return skillMove(track, skillGraph?.focus);
}

function skillMove(track, focus) {
  if (focus?.modeId === "rhythm-roulette") {
    return buildMove("rhythm-roulette", track, {
      eyebrow: "Skill focus / Rhythm",
      title: "Deepen the pocket",
      detail: `${focus.confidence}% confidence / ${focus.level}% level. Build more trusted rhythm evidence.`,
      prompt: `Make a fresh unassisted flip beside ${track.title}; clear the constraint and improve pocket or originality.`,
    });
  }
  if (focus?.modeId === "audio-lab") {
    return buildMove("audio-lab", track, {
      eyebrow: "Skill focus / Signal",
      title: "Strengthen the read",
      detail: `${focus.confidence}% confidence / ${focus.level}% level. Add a stable, precise signal receipt.`,
      prompt: `Capture a stable hold from ${track.title}, center it cleanly, and save trustworthy signal evidence.`,
    });
  }
  return buildMove("pitch-gates", track, {
    eyebrow: `Skill focus / ${focus?.label || "Pitch"}`,
    title: focus?.id === "transfer" ? "Bring the skill back to music" : "Beat your cleanest take",
    detail: focus
      ? `${focus.confidence}% confidence / ${focus.level}% level. The graph is choosing the next useful repetition.`
      : "This moment has a full evidence trail. Repeat it with less assistance or a tighter register.",
    prompt: `Replay the hook mission for ${track.title} with a steadier hold and improve the last trustworthy score.`,
  });
}

function moveFromMission(mission, track) {
  return {
    modeId: mission.modeId,
    eyebrow: "Mission armed",
    title: modeLabel(mission.modeId),
    detail: mission.prompt,
    prompt: mission.prompt,
    action: "Resume",
    missionId: mission.id,
    trackId: track?.id || mission.trackId,
  };
}

function buildMove(modeId, track, copy) {
  return {
    ...copy,
    modeId,
    action: "Start",
    missionId: "",
    trackId: track.id,
  };
}

function completedModesForTrack(track, events, missions) {
  const modes = new Set(missions.filter((mission) => mission.status === "complete").map((mission) => mission.modeId));
  if (!track) return modes;
  events
    .filter((event) => event.trackId === track.id && event.metadata?.modeId)
    .forEach((event) => modes.add(event.metadata.modeId));
  return modes;
}

function defaultMissionPrompt(modeId, track) {
  return `Complete one ${modeLabel(modeId)} run for ${track.title || "this set moment"}.`;
}

function text(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

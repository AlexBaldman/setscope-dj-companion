import { audioEventLabels, audioEventsForTrack, normalizeTrack, state } from "./state.js";

export function createSetCoachModel() {
  const tracks = state.tracks.map(normalizeTrack);
  const events = state.audioEvents || [];
  const reviewTracks = tracks.filter((track) => track.needsReview);
  const tracksWithSignals = tracks.filter((track) => audioEventsForTrack(track, 100).length > 0);
  const labeledEvents = events.filter((event) => audioEventLabels(event).length > 0);
  const bpms = tracks.map((track) => Number(track.bpm)).filter(Boolean);
  const transitions = [...new Set(tracks.map((track) => track.transition).filter(Boolean))];
  const avgConfidence = average(tracks.map((track) => Number(track.confidence)).filter(Boolean));
  const signalCoverage = tracks.length ? tracksWithSignals.length / tracks.length : 0;
  const labelCoverage = events.length ? labeledEvents.length / events.length : 0;
  const reviewRatio = tracks.length ? reviewTracks.length / tracks.length : 0;
  const transitionCoverage = tracks.length ? Math.min(1, transitions.length / Math.max(3, tracks.length)) : 0;
  const readinessScore = clamp(
    Math.round(avgConfidence * 0.36 + signalCoverage * 24 + labelCoverage * 18 + transitionCoverage * 14 - reviewRatio * 18),
    8,
    99,
  );

  return {
    actions: buildCoachActions({ events, labeledEvents, reviewTracks, tracks, tracksWithSignals }),
    bpmRange: bpms.length ? `${Math.min(...bpms)}-${Math.max(...bpms)}` : "--",
    grade: coachGrade(readinessScore),
    prompts: buildCreativePrompts({ bpms, events, reviewTracks, tracks, transitions }),
    readinessScore,
    stats: {
      eventCount: events.length,
      labelCount: labeledEvents.length,
      reviewCount: reviewTracks.length,
      signalTracks: tracksWithSignals.length,
      trackCount: tracks.length,
      transitionCount: transitions.length,
    },
  };
}

function buildCoachActions({ events, labeledEvents, reviewTracks, tracks, tracksWithSignals }) {
  const unlabeledEvent = events.find((event) => !audioEventLabels(event).length);
  const actions = [];
  if (reviewTracks.length) {
    actions.push({
      action: "review",
      button: "Open review",
      detail: `${reviewTracks[0].time} / ${reviewTracks[0].artist}`,
      title: `Review ${reviewTracks[0].title}`,
      trackId: reviewTracks[0].id,
    });
  }
  if (unlabeledEvent) {
    actions.push({
      action: "label-event",
      button: "Label signal",
      detail: `${unlabeledEvent.time} / ${unlabeledEvent.type}`,
      eventId: unlabeledEvent.id,
      title: "Give the newest signal a job",
    });
  }
  if (tracksWithSignals.length) {
    actions.push({
      action: "signals",
      button: "Show signals",
      detail: `${tracksWithSignals.length}/${tracks.length} tracks have toolbelt evidence`,
      title: "Study the signal-rich moments",
    });
  }
  if (labeledEvents.length < events.length && events.length > 1) {
    actions.push({
      action: "label-event",
      button: "Triage labels",
      detail: `${events.length - labeledEvents.length} signals still unlabeled`,
      eventId: events.find((event) => !audioEventLabels(event).length)?.id || "",
      title: "Turn activity into searchable memory",
    });
  }
  actions.push({
    action: "practice",
    button: "Play gates",
    detail: "Jump to the pitch-control arcade trainer",
    title: "Warm up your ears",
  });
  return actions.slice(0, 3);
}

function buildCreativePrompts({ bpms, events, reviewTracks, tracks, transitions }) {
  const prompts = [];
  const range = bpms.length ? Math.max(...bpms) - Math.min(...bpms) : 0;
  if (range >= 10) prompts.push("Try a tempo-story pass: mark where the room climbs, settles, and snaps back.");
  else prompts.push("The BPM lane is tight. Listen for texture changes instead of tempo drama.");
  if (transitions.length <= 2) prompts.push("Add one deliberate contrast transition so the set has a visible move.");
  else prompts.push("Transitions already have range. Pick the one that deserves a breakdown note.");
  if (events.length) prompts.push("Promote one toolbelt signal into track notes so the archive remembers why it mattered.");
  else prompts.push("Run one provider test or Audio Lab snapshot to seed the evidence board.");
  if (reviewTracks.length) prompts.push(`Start with ${reviewTracks[0].title}; it is the fastest confidence win.`);
  else if (tracks.length) prompts.push(`Use ${tracks[0].title} as the opener benchmark and score every later blend against it.`);
  return prompts.slice(0, 3);
}

function coachGrade(score) {
  if (score >= 86) return "Headliner";
  if (score >= 70) return "Crate ready";
  if (score >= 54) return "Studio pass";
  return "Dig mode";
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

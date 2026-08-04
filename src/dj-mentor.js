import { audioEventLabels, audioEventsForTrack, getSelectedTrack, normalizeTrack, state } from "./state.js";

export function createDjMentorModel(track = getSelectedTrack()) {
  const selected = track && !track.placeholder ? normalizeTrack(track) : null;
  const tracks = state.tracks.filter((item) => !item.placeholder).map(normalizeTrack);
  const events = selected ? audioEventsForTrack(selected, 100) : [];
  const bpm = Number(selected?.bpm) || 0;
  const energy = energyBand(selected, events);
  const storyBeat = storyBeatForTrack(selected, tracks);
  const transitionMove = transitionLanguage(selected?.transition);
  const whyItWorks = selected
    ? `${selected.title} works as a ${storyBeat.toLowerCase()} because ${transitionMove.reason} ${textureReason(selected)}`
    : "Load or recognize a track to get mentor notes.";
  const practiceMission = selected
    ? practiceForTrack(selected, transitionMove, events)
    : "Run one recognition or Audio Lab snapshot, then turn it into a practice mission.";
  const digPrompt = selected
    ? digForTrack(selected)
    : "Start by tagging one unknown gem, one break, and one blendable cut.";

  return {
    actions: selected ? mentorActions({ digPrompt, practiceMission, selected }) : [],
    digPrompt,
    energy,
    move: transitionMove.label,
    practiceMission,
    practiceTools: selected ? practiceToolsForTrack(selected, practiceMission) : [],
    selectedTrackId: selected?.id || "",
    storyBeat,
    whyItWorks,
  };
}

export function createDjMoveCard(event) {
  const track = event?.trackId ? state.tracks.find((item) => item.id === event.trackId) : getSelectedTrack();
  const mentor = createDjMentorModel(track);
  const labels = audioEventLabels(event);
  return {
    detail: labels.length ? `${labels.join(", ")} signal` : `${event?.type || "toolbelt"} signal`,
    dig: mentor.digPrompt,
    move: mentor.move,
    practice: mentor.practiceMission,
    storyBeat: mentor.storyBeat,
    why: event ? `${event.title} is evidence for this moment: ${mentor.whyItWorks}` : mentor.whyItWorks,
  };
}

function mentorActions({ digPrompt, practiceMission, selected }) {
  return [
    {
      action: "mentor-note",
      button: "Add note",
      detail: "Save this mentor read to track notes",
      note: `${practiceMission} ${digPrompt}`,
      title: "Commit the mentor read",
      trackId: selected.id,
    },
    {
      action: "signals",
      button: "Evidence",
      detail: "Filter the timeline to signal-backed tracks",
      title: "Check the evidence trail",
      trackId: selected.id,
    },
  ];
}

function practiceToolsForTrack(track, pitchMission) {
  const bpm = Number(track.bpm) || 0;
  const key = track.key && track.key !== "-" ? track.key : "Open";
  return [
    {
      detail: "Hook reps",
      id: "pitch-gates",
      label: "Pitch",
      mission: pitchMission,
    },
    {
      detail: bpm ? `${bpm} BPM` : "Set pocket",
      id: "rhythm-roulette",
      label: "Flip",
      mission: `Build a ${bpm ? `${bpm} BPM` : "set-tempo"} flip that could lead into ${track.title}, then save the strongest pocket.`,
    },
    {
      detail: `Key ${key}`,
      id: "audio-lab",
      label: "Lab",
      mission: `Capture a stable signal from ${track.title}, compare it with the ${key} key tag, and log the cleanest read.`,
    },
  ];
}

function storyBeatForTrack(track, tracks) {
  if (!track) return "No needle down";
  const index = tracks.findIndex((item) => item.id === track.id);
  if (index <= 0) return "Opener";
  if (index >= tracks.length - 1) return "Closer";
  const percent = tracks.length > 1 ? index / (tracks.length - 1) : 0;
  if (percent < 0.34) return "Lift";
  if (percent < 0.67) return "Left turn";
  return "Peak setup";
}

function transitionLanguage(transition = "Blend") {
  const normalized = transition.toLowerCase();
  if (normalized.includes("cut")) {
    return {
      label: "Clean cut",
      reason: "a hard contrast can make the room notice the next pocket immediately.",
    };
  }
  if (normalized.includes("echo")) {
    return {
      label: "Echo handoff",
      reason: "the tail can clear space while the next groove takes over.",
    };
  }
  if (normalized.includes("loop")) {
    return {
      label: "Loop tease",
      reason: "a repeated fragment lets the crowd recognize the idea before the full record lands.",
    };
  }
  if (normalized.includes("backspin")) {
    return {
      label: "Reset move",
      reason: "the rewind creates punctuation before a new energy lane.",
    };
  }
  return {
    label: "Blend pocket",
    reason: "the shared tempo lane gives the DJ room to sell texture instead of shock.",
  };
}

function textureReason(track) {
  const texture = track.texture || "open groove";
  const era = track.era || "unknown era";
  return `The ${texture.toLowerCase()} texture and ${era.toLowerCase()} lane give the transition a story, not just a timestamp.`;
}

function practiceForTrack(track, transitionMove, events) {
  if (events.some((event) => event.type === "instrument")) {
    return `Sing or tap the hook of ${track.title}, then replay the ${transitionMove.label.toLowerCase()} until the entry feels automatic.`;
  }
  if ((track.tags || []).includes("break")) {
    return `Count the break in ${track.title} for 16 bars and call the drop before it arrives.`;
  }
  return `Practice a 30-second ${transitionMove.label.toLowerCase()} into ${track.title} and label where the room should feel the handoff.`;
}

function digForTrack(track) {
  if ((track.tags || []).includes("sample source")) {
    return `Dig for two records from the same source family as ${track.title}.`;
  }
  if (track.label && track.label !== "Unknown label" && track.label !== "Unverified") {
    return `Pull three more ${track.label} records and tag which one could sit before this.`;
  }
  return `Find one earlier record and one later record that explain why ${track.title} feels familiar.`;
}

function energyBand(track, events) {
  const bpm = Number(track?.bpm) || 0;
  const confidence = Number(track?.confidence) || 0;
  const signalBoost = Math.min(12, events.length * 4);
  const score = Math.round((bpm ? Math.min(100, bpm) : 70) * 0.42 + confidence * 0.46 + signalBoost);
  if (score >= 86) return "Peak heat";
  if (score >= 72) return "Room lift";
  if (score >= 58) return "Pocket";
  return "Digging";
}

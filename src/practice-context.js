import { migrateSetDraft, serializeSetDraft } from "./contracts/set-draft.js";
import { completePracticeMission } from "./session-spine.js";

const DRAFT_STORAGE_KEY = "setscope-draft-v1";

export const practiceToolPaths = {
  "audio-lab": "./audio-lab.html",
  "pitch-gates": "./pitch-gates.html",
  "rhythm-roulette": "./rhythm-roulette.html",
  "beat-school": "./beat-school.html",
};

export function buildPracticeHref(modeId, track, mission = "", missionId = "") {
  const path = practiceToolPaths[modeId];
  const trackId = typeof track === "string" ? track : track?.id;
  if (!path || !trackId) return path || "./index.html";
  const params = new URLSearchParams({ track: trackId });
  if (mission.trim()) params.set("mission", mission.trim());
  if (missionId) params.set("missionId", missionId);
  return `${path}?${params.toString()}`;
}

export function buildSetReturnHref(track, eventId = "", missionId = "") {
  const trackId = typeof track === "string" ? track : track?.id;
  const params = new URLSearchParams();
  if (trackId) params.set("track", trackId);
  if (eventId) params.set("event", eventId);
  if (missionId) params.set("missionId", missionId);
  const query = params.toString();
  return `./index.html${query ? `?${query}` : ""}`;
}

export function missionForMode(modeId, track) {
  const title = track?.title || "this set moment";
  if (modeId === "pitch-gates") {
    return `Find the hook in ${title}, then hold its center through a clean handoff.`;
  }
  if (modeId === "rhythm-roulette") {
    const tempo = Number(track?.bpm) ? `${track.bpm} BPM` : "the set tempo";
    return `Build a ${tempo} flip that could sit beside ${title} without crowding its pocket.`;
  }
  if (modeId === "beat-school") {
    const tempo = Number(track?.bpm) ? `${track.bpm} BPM` : "the set tempo";
    return `Practice a clean backbeat near ${tempo}, then bring that pocket back to ${title}.`;
  }
  if (modeId === "audio-lab") {
    const key = track?.key && track.key !== "-" ? ` against the ${track.key} key tag` : "";
    return `Capture one stable signal from ${title}${key}, then log the cleanest read.`;
  }
  return `Practice one deliberate move from ${title} and save the result.`;
}

export function resolvePracticeContext({ modeId, search = "", draft = null } = {}) {
  const params = new URLSearchParams(search);
  const trackId = params.get("track");
  const tracks = Array.isArray(draft?.tracks) ? draft.tracks : [];
  const track = tracks.find((item) => item.id === trackId);
  if (!track) return null;
  const missionId = params.get("missionId") || "";
  const storedMission = (Array.isArray(draft?.practiceMissions) ? draft.practiceMissions : [])
    .find((mission) => mission.id === missionId && mission.trackId === track.id && mission.modeId === modeId);
  return {
    mission: storedMission?.prompt || params.get("mission")?.trim() || missionForMode(modeId, track),
    missionId: storedMission?.id || missionId,
    modeId,
    track,
  };
}

export function readPracticeDraft(storage = globalThis.localStorage) {
  try {
    return JSON.parse(storage?.getItem(DRAFT_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export function mountPracticeContext(
  modeId,
  {
    draft = readPracticeDraft(),
    root = globalThis.document,
    search = globalThis.location?.search || "",
  } = {},
) {
  const context = resolvePracticeContext({ modeId, search, draft });
  const host = root?.querySelector?.("[data-practice-context]");
  if (!context) {
    return {
      mission: "",
      modeId,
      track: null,
      markComplete() {},
    };
  }

  const setReturnHref = buildSetReturnHref(context.track, "", context.missionId);
  updateReturnLinks(root, setReturnHref);
  if (host) {
    host.hidden = false;
    host.dataset.state = "armed";
    setText(host, "[data-context-time]", context.track.time || "--:--");
    setText(host, "[data-context-track]", context.track.title || "Untitled track");
    setText(host, "[data-context-artist]", context.track.artist || "Unknown artist");
    setText(host, "[data-context-mission]", context.mission);
    setText(host, "[data-context-status]", "Assignment armed");
  }

  return {
    ...context,
    markComplete(event) {
      completeStoredPracticeMission(context.missionId, event);
      const trackId = event?.trackId || context.track.id;
      const href = buildSetReturnHref(trackId, event?.id, context.missionId);
      updateReturnLinks(root, href);
      if (!host) return;
      host.dataset.state = "saved";
      setText(host, "[data-context-status]", event?.trackId ? "Run attached" : "Run logged");
    },
  };
}

function completeStoredPracticeMission(missionId, event, storage = globalThis.localStorage) {
  if (!missionId || !storage) return null;
  try {
    const draft = migrateSetDraft(JSON.parse(storage.getItem(DRAFT_STORAGE_KEY) || "null"));
    const index = draft.practiceMissions.findIndex((mission) => mission.id === missionId);
    if (index < 0) return null;
    const completed = completePracticeMission(draft.practiceMissions[index], event);
    draft.practiceMissions[index] = completed;
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(serializeSetDraft(draft)));
    return completed;
  } catch {
    return null;
  }
}

function updateReturnLinks(root, href) {
  root?.querySelectorAll?.("[data-set-return]").forEach((link) => {
    link.href = href;
  });
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (node) node.textContent = value;
}

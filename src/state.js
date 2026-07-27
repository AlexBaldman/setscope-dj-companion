import { cloneDemoTracks, demoTracks } from "./fixtures.js";
import { randomColors, toSeconds, uid } from "./utils.js";
import { normalizePerformanceMetadata } from "./migrations/performance-event-v1.js";
import { migrateSetDraft, serializeSetDraft } from "./contracts/set-draft.js";
import {
  completePracticeMission as closePracticeMission,
  createPracticeMission,
  normalizePracticeMission,
} from "./session-spine.js";

const STORAGE_KEY = "setscope-draft-v1";

const loadedState = loadState();
export const state = hydrateState(loadedState);
if (!state.recognitionSessionId) state.recognitionSessionId = uid();
if (!state.recognitionStartedAt) state.recognitionStartedAt = new Date().toISOString();
export const uiState = {
  query: "",
  reviewOnly: false,
  signalFilter: "all",
  archiveList: [],
  archiveQuery: "",
};

let selectedId = state.tracks[0]?.id;

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { tracks: cloneDemoTracks(uid) };
  try {
    const parsed = JSON.parse(saved);
    return parsed.tracks?.length ? parsed : { tracks: cloneDemoTracks(uid) };
  } catch {
    return { tracks: cloneDemoTracks(uid) };
  }
}

export function hydrateState(nextState) {
  const draft = migrateSetDraft(nextState);
  const demoByTitle = new Map(demoTracks.map((track) => [track.title, track]));
  draft.tracks = draft.tracks.map((track) => normalizeTrack({
    ...(demoByTitle.get(track?.title) || {}),
    ...(track && typeof track === "object" ? track : {}),
    id: track?.id || uid(),
  }));
  draft.audioEvents = draft.audioEvents
    .filter((event) => event && typeof event === "object" && !Array.isArray(event))
    .map((event) => ({
      ...event,
      metadata: normalizePerformanceMetadata(event.metadata),
    }));
  draft.practiceMissions = draft.practiceMissions
    .filter((mission) => mission && typeof mission === "object" && !Array.isArray(mission))
    .map(normalizePracticeMission);
  return draft;
}

export function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeSetDraft(state)));
}

export function getSelectedId() {
  return selectedId;
}

export function setSelectedId(id) {
  selectedId = id;
}

export function getSelectedTrack() {
  const track = state.tracks.find((item) => item.id === selectedId) || state.tracks[0];
  selectedId = track?.id;
  return track;
}

export function normalizeTrack(track) {
  const source = track && typeof track === "object" ? track : {};
  const needsReview = "needsReview" in source ? Boolean(source.needsReview) : (source.confidence || 0) < 85;
  return {
    ...source,
    tags: Array.isArray(source.tags) ? [...source.tags] : [],
    era: source.era || "Unknown era",
    label: source.label || "Unknown label",
    source: source.source || "Unverified",
    texture: source.texture || "Open groove",
    lineage: source.lineage || "Needs crate notes",
    why: source.why || "Add transition notes after review.",
    notes: source.notes || "No notes yet.",
    status: source.status || (source.confidence >= 85 && !needsReview ? "matched" : "review"),
    needsReview,
  };
}

export function visibleTracks() {
  const query = uiState.query.trim().toLowerCase();
  return state.tracks.map(normalizeTrack).filter((track) => {
    const searchable = [track.title, track.artist, track.era, track.label, track.source, track.transition, ...track.tags]
      .join(" ")
      .toLowerCase();
    const queryMatch = !query || searchable.includes(query);
    const reviewMatch = !uiState.reviewOnly || track.needsReview;
    const signalMatch = trackMatchesSignalFilter(track, uiState.signalFilter);
    return queryMatch && reviewMatch && signalMatch;
  });
}

export function audioEventsForTrack(trackOrId, limit = 6) {
  const id = typeof trackOrId === "string" ? trackOrId : trackOrId?.id;
  if (!id) return [];
  return state.audioEvents
    .filter((event) => event.trackId === id)
    .slice(0, limit);
}

export function getAudioEventById(id) {
  return state.audioEvents.find((event) => event.id === id) || null;
}

export function audioEventLabels(event) {
  if (Array.isArray(event?.labels)) return event.labels;
  if (Array.isArray(event?.metadata?.labels)) return event.metadata.labels;
  return [];
}

export function toggleAudioEventLabel(eventId, label) {
  const event = getAudioEventById(eventId);
  if (!event || !label) return null;
  const labels = new Set(audioEventLabels(event));
  if (labels.has(label)) labels.delete(label);
  else labels.add(label);
  event.labels = [...labels];
  event.metadata = {
    ...(event.metadata || {}),
    labels: event.labels,
  };
  persist();
  return event;
}

export function reassignAudioEvent(eventId, trackId) {
  const event = getAudioEventById(eventId);
  if (!event) return null;
  const track = state.tracks.find((item) => item.id === trackId);
  event.trackId = track?.id || "";
  event.time = track?.time || "--:--";
  event.metadata = {
    ...(event.metadata || {}),
    trackId: event.trackId,
    time: event.time,
  };
  persist();
  return event;
}

export function promoteAudioEventToTrackNotes(eventId) {
  const event = getAudioEventById(eventId);
  const track = event?.trackId ? state.tracks.find((item) => item.id === event.trackId) : null;
  if (!event || !track) return null;
  normalizeTrackInPlace(track);
  const note = formatAudioEventNote(event);
  if (!track.notes.includes(note)) {
    track.notes = `${track.notes.trim()}\n\n${note}`.trim();
  }
  selectedId = track.id;
  persist();
  return track;
}

export function appendSelectedTrackNote(note) {
  const track = getSelectedTrack();
  if (!track || !note) return null;
  normalizeTrackInPlace(track);
  const mentorNote = `DJ Mentor: ${note}`;
  if (!track.notes.includes(mentorNote)) {
    track.notes = `${track.notes.trim()}\n\n${mentorNote}`.trim();
  }
  persist();
  return track;
}

export function armPracticeMission({ modeId, track = getSelectedTrack(), prompt = "", source = "next-move" } = {}) {
  if (!track?.id) return null;
  const active = state.practiceMissions.find(
    (mission) => mission.trackId === track.id && mission.modeId === modeId && mission.status === "active",
  );
  if (active) return active;
  const mission = createPracticeMission({
    id: uid(),
    sessionId: state.recognitionSessionId,
    track,
    modeId,
    prompt,
    source,
  });
  state.practiceMissions.unshift(mission);
  state.practiceMissions = state.practiceMissions.slice(0, 50);
  persist();
  return mission;
}

export function completePracticeMission(missionId, event) {
  if (!missionId) return null;
  const latest = hydrateState(loadState());
  const index = latest.practiceMissions.findIndex((mission) => mission.id === missionId);
  if (index < 0) return null;
  const completed = closePracticeMission(latest.practiceMissions[index], event);
  latest.practiceMissions[index] = completed;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeSetDraft(latest)));
  state.practiceMissions = latest.practiceMissions;
  return completed;
}

export function addTrack(track = {}) {
  const created = {
    id: uid(),
    time: track.time || nextTimecode(),
    title: track.title || "Unidentified groove",
    artist: track.artist || "Listening source",
    bpm: track.bpm || 0,
    key: track.key || "-",
    transition: track.transition || "Blend",
    tags: Array.isArray(track.tags) ? [...track.tags] : [],
    confidence: track.confidence || 61,
    wave: track.wave || 50,
    colors: track.colors || randomColors(),
    era: track.era || "Unknown era",
    label: track.label || "Unverified",
    source: track.source || "Audio capture",
    texture: track.texture || "Open groove",
    lineage: track.lineage || "Waiting for metadata enrichment",
    why: track.why || "Captured into the timeline for follow-up listening.",
    status: track.status || "review",
    needsReview: track.needsReview ?? true,
    notes:
      track.notes ||
      "Captured from the set. Add recognition provider data, release context, samples, label info, and DJ transition notes here.",
  };
  state.tracks.push(created);
  selectedId = created.id;
  persist();
  return created;
}

export function upsertRecognizedTrack(match) {
  const requestId = match.observation?.requestId || match.transaction?.requestId || "";
  const priorCapture = requestId ? state.captureLog.find((entry) => entry.requestId === requestId) : null;
  if (priorCapture) {
    const priorTrack = state.tracks.find((track) => track.id === priorCapture.trackId);
    if (priorTrack) selectedId = priorTrack.id;
    return priorTrack || null;
  }
  const existing = state.tracks.find((track) => track.time === match.time && track.title === match.title);
  const next = normalizeTrack({
    ...match,
    id: existing?.id || uid(),
    status: match.status || ((match.confidence || 0) >= 85 ? "matched" : "review"),
    needsReview: match.needsReview ?? (match.confidence || 0) < 85,
  });
  if (existing) {
    Object.assign(existing, next);
    selectedId = existing.id;
  } else {
    state.tracks.push(next);
    selectedId = next.id;
  }
  sortTracks();
  logCapture(match, selectedId);
  persist();
  return next;
}

export function tagSelectedTrack(tag) {
  const track = state.tracks.find((item) => item.id === selectedId);
  if (!track || !tag) return false;
  normalizeTrackInPlace(track);
  if (track.tags.includes(tag)) {
    track.tags = track.tags.filter((item) => item !== tag);
    appendAudioEvent({
      type: "tag",
      trackId: track.id,
      time: track.time,
      title: "Tag removed",
      detail: `${tag} / ${track.title}`,
    });
    persist();
    return true;
  }
  track.tags.push(tag);
  appendAudioEvent({
    type: "tag",
    trackId: track.id,
    time: track.time,
    title: "Crate tag",
    detail: `${tag} / ${track.title}`,
  });
  persist();
  return true;
}

export function findNearbyDuplicate(track = getSelectedTrack()) {
  if (!track) return null;
  const title = normalizeMatchText(track.title);
  const artist = normalizeMatchText(track.artist);
  const trackSeconds = toSeconds(track.time);
  return state.tracks
    .filter((item) => item.id !== track.id)
    .filter((item) => normalizeMatchText(item.title) === title && normalizeMatchText(item.artist) === artist)
    .map((item) => ({ item, distance: Math.abs(toSeconds(item.time) - trackSeconds) }))
    .filter((candidate) => candidate.distance <= 90)
    .sort((left, right) => left.distance - right.distance)[0]?.item || null;
}

export function mergeSelectedDuplicate() {
  const selected = getSelectedTrack();
  const duplicate = findNearbyDuplicate(selected);
  if (!selected || !duplicate) return null;
  const keeper = toSeconds(selected.time) <= toSeconds(duplicate.time) ? selected : duplicate;
  const removed = keeper.id === selected.id ? duplicate : selected;
  normalizeTrackInPlace(keeper);
  normalizeTrackInPlace(removed);
  keeper.tags = [...new Set([...keeper.tags, ...removed.tags])];
  keeper.confidence = Math.max(Number(keeper.confidence) || 0, Number(removed.confidence) || 0);
  keeper.status = keeper.status === "matched" || removed.status === "matched" ? "matched" : keeper.status;
  keeper.needsReview = Boolean(keeper.needsReview && removed.needsReview);
  if (removed.notes && removed.notes !== keeper.notes) {
    keeper.notes = `${keeper.notes}\n\nMerged review note: ${removed.notes}`;
  }
  state.captureLog.forEach((entry) => {
    if (entry.trackId === removed.id) entry.trackId = keeper.id;
  });
  state.audioEvents.forEach((event) => {
    if (event.trackId === removed.id) event.trackId = keeper.id;
  });
  state.tracks = state.tracks.filter((track) => track.id !== removed.id);
  selectedId = keeper.id;
  appendAudioEvent({
    type: "merge",
    trackId: keeper.id,
    time: keeper.time,
    title: "Duplicate merged",
    detail: `${keeper.title} / removed ${removed.time}`,
  });
  persist();
  return { keeper, removed };
}

export function sortTracksInPlace() {
  sortTracks();
  persist();
}

export function saveSelectedTrack(fields) {
  const track = state.tracks.find((item) => item.id === selectedId);
  if (!track) return false;
  Object.assign(track, {
    title: fields.title.trim() || "Untitled track",
    artist: fields.artist.trim() || "Unknown artist",
    time: fields.time.trim() || "00:00",
    bpm: Number(fields.bpm) || 0,
    key: fields.key.trim() || "-",
    transition: fields.transition,
    needsReview: false,
    status: "matched",
    notes: fields.notes.trim() || "No notes yet.",
  });
  persist();
  return true;
}

export function setSelectedTransition(transition) {
  const track = state.tracks.find((item) => item.id === selectedId);
  if (!track) return false;
  track.transition = transition;
  track.needsReview = false;
  track.status = "matched";
  persist();
  return true;
}

function logCapture(match, trackId) {
  const observation = match.observation || {};
  state.captureLog.unshift({
    trackId,
    time: match.time,
    title: match.title,
    artist: match.artist,
    provider: match.provider || "setscope-stub",
    confidence: match.confidence,
    status: match.status || (match.needsReview ? "review" : "matched"),
    requestId: observation.requestId || match.transaction?.requestId || "",
    outcome: observation.outcome || match.status || "unknown",
    provenance: observation.provenance || (match.provider === "setscope-stub" ? "story" : "inference"),
    capturedAt: new Date().toISOString(),
  });
  state.captureLog = state.captureLog.slice(0, 24);
  appendAudioEvent({
    type: "recognition",
    trackId,
    time: match.time,
    title: match.title,
    detail: `${match.artist} / ${match.provider || "setscope-stub"} / ${match.confidence || 0}%`,
    metadata: {
      requestId: observation.requestId || match.transaction?.requestId || "",
      outcome: observation.outcome || match.status || "unknown",
      provenance: observation.provenance || (match.provider === "setscope-stub" ? "story" : "inference"),
      latencyMs: observation.latencyMs,
    },
  });
}

export function logRecognitionObservation(observation = {}) {
  if (!observation.requestId || state.captureLog.some((entry) => entry.requestId === observation.requestId)) return false;
  const labels = {
    cancelled: ["Capture cancelled", "The audio window was stopped"],
    invalid: ["Invalid window", "The signal receipt could not be validated"],
    provider_error: ["Provider unavailable", "Recognition can retry this window"],
    unmatched: ["No match found", "Try a cleaner or longer window"],
  };
  const [title, artist] = labels[observation.outcome] || ["Recognition receipt", "Review this window"];
  state.captureLog.unshift({
    trackId: "",
    time: formatReceiptTime(observation.setElapsedMs),
    title,
    artist,
    provider: observation.provider || "unknown-provider",
    confidence: 0,
    status: observation.outcome || "invalid",
    requestId: observation.requestId,
    outcome: observation.outcome || "invalid",
    provenance: observation.provenance || "inference",
    capturedAt: observation.completedAt || new Date().toISOString(),
  });
  state.captureLog = state.captureLog.slice(0, 24);
  persist();
  return true;
}

function formatReceiptTime(milliseconds) {
  const totalSeconds = Math.floor(Math.max(0, Number(milliseconds) || 0) / 1000);
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export function logAudioEvent(event) {
  const created = appendAudioEvent(event);
  persist();
  return created;
}

export function persistAudioEvent(event) {
  const latest = hydrateState(loadState());
  const created = createAudioEvent(event);
  latest.audioEvents = [created, ...(Array.isArray(latest.audioEvents) ? latest.audioEvents : [])].slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeSetDraft(latest)));
  state.audioEvents = latest.audioEvents;
  return created;
}

function createAudioEvent(event) {
  return {
    id: uid(),
    type: event.type || "note",
    labels: Array.isArray(event.labels) ? event.labels : Array.isArray(event.metadata?.labels) ? event.metadata.labels : [],
    trackId: event.trackId || "",
    time: event.time || "--:--",
    title: event.title || "Audio event",
    detail: event.detail || "",
    metadata: event.metadata || null,
    createdAt: new Date().toISOString(),
  };
}

function trackMatchesSignalFilter(track, filter) {
  if (!filter || filter === "all") return true;
  const events = audioEventsForTrack(track, 100);
  if (filter === "with-events") return events.length > 0;
  return events.some((event) => event.type === filter || event.metadata?.modeId === filter || audioEventLabels(event).includes(filter));
}

function formatAudioEventNote(event) {
  const details = event.metadata?.details || {};
  const parts = [
    details.note && details.targetNote ? `${details.note} to ${details.targetNote}` : "",
    Number.isFinite(details.cents) ? `${details.cents > 0 ? "+" : ""}${details.cents} cents` : "",
    details.stableHold ? "stable lock" : "",
    Number.isFinite(details.rms) ? `RMS ${details.rms}%` : "",
    Number.isFinite(details.peak) ? `peak ${details.peak}%` : "",
    details.preset ? `${details.preset} preset` : "",
  ].filter(Boolean);
  const signal = parts.length ? parts.join(" / ") : event.detail;
  return `Toolbelt note (${event.title}, ${event.time}): ${signal}`;
}

export function nextTimecode() {
  const last = state.tracks[state.tracks.length - 1];
  const seconds = last ? toSeconds(last.time) + 240 : 0;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function resetForNewSet() {
  state.archiveId = null;
  state.captureLog = [];
  state.audioEvents = [];
  state.practiceMissions = [];
  state.recognitionCursor = 0;
  state.recognitionSessionId = uid();
  state.recognitionStartedAt = new Date().toISOString();
  uiState.archiveList = [];
  state.tracks = [];
  selectedId = undefined;
  persist();
}

function appendAudioEvent(event) {
  const created = createAudioEvent(event);
  state.audioEvents.unshift(created);
  state.audioEvents = state.audioEvents.slice(0, 100);
  return created;
}

function normalizeTrackInPlace(track) {
  Object.assign(track, normalizeTrack(track));
  return track;
}

function sortTracks() {
  state.tracks.sort((a, b) => toSeconds(a.time) - toSeconds(b.time));
}

function normalizeMatchText(value) {
  return String(value || "").trim().toLowerCase();
}

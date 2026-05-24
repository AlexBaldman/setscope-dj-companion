import { cloneDemoTracks, demoTracks } from "./fixtures.js";
import { randomColors, toSeconds, uid } from "./utils.js";

const STORAGE_KEY = "setscope-draft-v1";

export const state = hydrateState(loadState());
state.skin = state.skin || "vinyl";
state.query = state.query || "";
state.reviewOnly = state.reviewOnly || false;
state.recognitionCursor = state.recognitionCursor || 0;
state.captureLog = state.captureLog || [];
state.audioEvents = state.audioEvents || [];
state.archiveId = state.archiveId || null;
state.archiveList = state.archiveList || [];

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
  const demoByTitle = new Map(demoTracks.map((track) => [track.title, track]));
  nextState.tracks = nextState.tracks.map((track) => ({
    ...(demoByTitle.get(track.title) || {}),
    ...track,
    id: track.id || uid(),
  }));
  return nextState;
}

export function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  track.tags = Array.isArray(track.tags) ? track.tags : [];
  track.era = track.era || "Unknown era";
  track.label = track.label || "Unknown label";
  track.source = track.source || "Unverified";
  track.texture = track.texture || "Open groove";
  track.lineage = track.lineage || "Needs crate notes";
  track.why = track.why || "Add transition notes after review.";
  track.status = track.status || (track.confidence >= 85 && !track.needsReview ? "matched" : "review");
  track.needsReview = "needsReview" in track ? Boolean(track.needsReview) : (track.confidence || 0) < 85;
  return track;
}

export function visibleTracks() {
  const query = state.query.trim().toLowerCase();
  return state.tracks.filter((track) => {
    normalizeTrack(track);
    const searchable = [track.title, track.artist, track.era, track.label, track.source, track.transition, ...track.tags]
      .join(" ")
      .toLowerCase();
    const queryMatch = !query || searchable.includes(query);
    const reviewMatch = !state.reviewOnly || track.needsReview;
    return queryMatch && reviewMatch;
  });
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
    tags: Array.isArray(track.tags) ? track.tags : [],
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
  return created;
}

export function upsertRecognizedTrack(match) {
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
  sortTracksInPlace();
  logCapture(match, selectedId);
  return next;
}

export function tagSelectedTrack(tag) {
  const track = state.tracks.find((item) => item.id === selectedId);
  if (!track || !tag) return false;
  normalizeTrack(track);
  if (track.tags.includes(tag)) {
    track.tags = track.tags.filter((item) => item !== tag);
    logAudioEvent({
      type: "tag",
      trackId: track.id,
      time: track.time,
      title: "Tag removed",
      detail: `${tag} / ${track.title}`,
    });
    return true;
  }
  track.tags.push(tag);
  logAudioEvent({
    type: "tag",
    trackId: track.id,
    time: track.time,
    title: "Crate tag",
    detail: `${tag} / ${track.title}`,
  });
  return true;
}

export function sortTracksInPlace() {
  state.tracks.sort((a, b) => toSeconds(a.time) - toSeconds(b.time));
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
  return true;
}

export function setSelectedTransition(transition) {
  const track = state.tracks.find((item) => item.id === selectedId);
  if (!track) return false;
  track.transition = transition;
  track.needsReview = false;
  track.status = "matched";
  return true;
}

export function logCapture(match, trackId) {
  state.captureLog.unshift({
    trackId,
    time: match.time,
    title: match.title,
    artist: match.artist,
    provider: match.provider || "setscope-stub",
    confidence: match.confidence,
    status: match.status || (match.needsReview ? "review" : "matched"),
    capturedAt: new Date().toISOString(),
  });
  state.captureLog = state.captureLog.slice(0, 24);
  logAudioEvent({
    type: "recognition",
    trackId,
    time: match.time,
    title: match.title,
    detail: `${match.artist} / ${match.provider || "setscope-stub"} / ${match.confidence || 0}%`,
  });
}

export function logAudioEvent(event) {
  state.audioEvents.unshift({
    id: uid(),
    type: event.type || "note",
    trackId: event.trackId || "",
    time: event.time || "--:--",
    title: event.title || "Audio event",
    detail: event.detail || "",
    createdAt: new Date().toISOString(),
  });
  state.audioEvents = state.audioEvents.slice(0, 100);
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
  state.recognitionCursor = 0;
  state.archiveList = [];
  state.tracks = [];
  selectedId = undefined;
}

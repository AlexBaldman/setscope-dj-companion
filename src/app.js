import { getApiHealth, getProviderDiagnostics } from "./api.js";
import { importAudio } from "./audio.js";
import { els } from "./dom.js";
import { buildPracticeHref } from "./practice-context.js";
import { createCockpitWorkspace, mountResponsiveDisclosures } from "./cockpit-workspace.js";
import { applySkin, createRenderer, makeBars } from "./render.js";
import { nearestTrackFromMap } from "./set-map.js";
import {
  addTrack as addStateTrack,
  appendSelectedTrackNote,
  armPracticeMission,
  getAudioEventById,
  getSelectedTrack,
  mergeSelectedDuplicate,
  nextTimecode,
  promoteAudioEventToTrackNotes,
  reassignAudioEvent,
  saveSelectedTrack,
  setSelectedId,
  setSelectedTransition,
  sortTracksInPlace,
  state,
  tagSelectedTrack,
  toggleAudioEventLabel,
  uiState,
} from "./state.js";
import { createWorkflows } from "./workflows.js";
import { showToast } from "./utils.js";

let workflows;
let selectedAudioEventId = "";
const cockpitWorkspace = createCockpitWorkspace();
mountResponsiveDisclosures();
const sessionMenu = document.querySelector(".session-menu");
const compactCockpit = window.matchMedia("(max-width: 959px)");
if (compactCockpit.matches) sessionMenu.open = false;
compactCockpit.addEventListener("change", (event) => { sessionMenu.open = !event.matches; });
sessionMenu.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => { if (compactCockpit.matches) sessionMenu.open = false; });
});

const renderer = createRenderer(els, {
  onSelectTrack(id) {
    if (!id) return;
    setSelectedId(id);
    renderer.render();
    if (cockpitWorkspace.isNarrow()) cockpitWorkspace.select("intel", { reveal: true });
  },
  onOpenAudioEvent(id) {
    openAudioEvent(id);
  },
  onLoadArchivedSet(id) {
    workflows.loadArchivedSet(id);
  },
  onCoachAction(dataset) {
    runCoachAction(dataset);
  },
});

workflows = createWorkflows(els, {
  render: renderer.render,
  renderArchiveList: renderer.renderArchiveList,
  applySkin: (skin) => applySkin(els, skin),
  showToast: (message) => showToast(els, message),
});

async function refreshApiStatus() {
  try {
    const health = await getApiHealth();
    els.apiStatus.textContent = health.ok ? providerShortLabel(health.provider) : "API ?";
    renderProviderStatus(health.recognition);
    refreshProviderDiagnostics();
    await workflows.refreshArchiveList();
  } catch {
    els.apiStatus.textContent = "Local";
    renderProviderStatus();
    renderer.renderArchiveList();
  }
}

function renderProviderStatus(recognition = {}) {
  const activeProvider = recognition.activeProvider || "setscope-stub";
  const webProvider = providerById(recognition.providers, activeProvider);
  const auddProvider = providerById(recognition.providers, "audd");
  els.providerName.textContent = webProvider?.label || providerShortLabel(activeProvider);
  els.providerMode.textContent = recognition.mode || "Local demo fallback";
  els.providerWeb.textContent = auddProvider?.configured ? "AudD live" : "Stub";
  els.providerSetup.textContent = auddProvider?.configured ? "Ready" : "Token needed";
  els.providerSample.textContent = `${recognition.sampleSeconds || 8}s`;
  els.providerNative.textContent = recognition.native?.target || "ShazamKit";
  els.chainInput.textContent = "Mic/Sample";
  els.chainRecognizer.textContent = auddProvider?.configured ? "AudD" : "Stub";
}

async function refreshProviderDiagnostics() {
  try {
    const diagnostics = await getProviderDiagnostics();
    const auddCheck = diagnostics.checks?.find((check) => check.id === "audd-token");
    if (auddCheck) {
      els.providerSetup.textContent = auddCheck.status === "pass" ? "Ready" : "Token needed";
    }
  } catch {
    els.providerSetup.textContent = "Offline";
  }
}

function providerById(providers = [], id) {
  return providers.find((provider) => provider.id === id);
}

function providerShortLabel(provider) {
  if (provider === "audd") return "AudD";
  if (provider === "setscope-stub") return "Stub";
  if (provider === "setscope-static") return "Demo";
  return provider || "API on";
}

function saveSelected() {
  const saved = saveSelectedTrack({
    title: els.editTitle.value,
    artist: els.editArtist.value,
    time: els.editTime.value,
    bpm: els.editBpm.value,
    key: els.editKey.value,
    transition: els.editTransition.value,
    notes: els.editNotes.value,
  });
  if (!saved) return;
  renderer.render();
  showToast(els, "Track saved");
}

function addManualTrack() {
  addStateTrack();
  renderer.render();
}

function sortTracks() {
  sortTracksInPlace();
  renderer.render();
  showToast(els, "Timeline sorted");
}

function tagTransition(transition) {
  if (!setSelectedTransition(transition)) return;
  renderer.render();
  showToast(els, `${transition} tagged`);
}

function tagCrateMoment(tag) {
  if (!tagSelectedTrack(tag)) return;
  renderer.render();
  showToast(els, `${tag} tagged`);
}

function mergeDuplicateMoment() {
  const merged = mergeSelectedDuplicate();
  if (!merged) return;
  renderer.render();
  showToast(els, "Duplicate merged");
}

function selectFromSetMap(event) {
  const nearest = nearestTrackFromMap(els.setMapCanvas, event, state.tracks);
  if (!nearest) return;
  setSelectedId(nearest.id);
  renderer.render();
}

function openAudioEvent(id) {
  selectedAudioEventId = id;
  const event = getAudioEventById(id);
  if (event?.trackId) setSelectedId(event.trackId);
  renderer.render();
  renderer.renderEventDetail(event);
}

function closeAudioEvent() {
  selectedAudioEventId = "";
  renderer.renderEventDetail(null);
}

function reassignSelectedAudioEvent() {
  if (!selectedAudioEventId) return;
  const event = reassignAudioEvent(selectedAudioEventId, els.eventTrackSelect.value);
  if (!event) return;
  if (event.trackId) setSelectedId(event.trackId);
  renderer.render();
  renderer.renderEventDetail(getAudioEventById(selectedAudioEventId));
  showToast(els, event.trackId ? "Event attached" : "Event unattached");
}

function promoteSelectedAudioEvent() {
  if (!selectedAudioEventId) return;
  const track = promoteAudioEventToTrackNotes(selectedAudioEventId);
  if (!track) {
    showToast(els, "Attach event first");
    return;
  }
  renderer.render();
  renderer.renderEventDetail(getAudioEventById(selectedAudioEventId));
  showToast(els, "Signal added to notes");
}

function setSignalFilter(filter) {
  uiState.signalFilter = filter || "all";
  renderer.renderTimeline();
}

function toggleSelectedEventLabel(label) {
  if (!selectedAudioEventId) return;
  const event = toggleAudioEventLabel(selectedAudioEventId, label);
  if (!event) return;
  renderer.render();
  renderer.renderEventDetail(getAudioEventById(selectedAudioEventId));
  showToast(els, event.labels.includes(label) ? `${label} label` : `${label} removed`);
}

function runCoachAction(dataset) {
  const action = dataset.coachAction;
  if (action === "review") {
    uiState.reviewOnly = true;
    uiState.signalFilter = "all";
    if (dataset.trackId) setSelectedId(dataset.trackId);
    renderer.render();
    if (cockpitWorkspace.isNarrow()) cockpitWorkspace.select("timeline", { reveal: true });
    showToast(els, "Review lane armed");
    return;
  }
  if (action === "signals") {
    uiState.reviewOnly = false;
    uiState.signalFilter = "with-events";
    renderer.render();
    if (cockpitWorkspace.isNarrow()) cockpitWorkspace.select("timeline", { reveal: true });
    showToast(els, "Signal lane open");
    return;
  }
  if (action === "label-event") {
    if (dataset.coachEventId) openAudioEvent(dataset.coachEventId);
    showToast(els, "Pick the label that makes it searchable");
    return;
  }
  if (action === "mentor-note") {
    if (dataset.trackId) setSelectedId(dataset.trackId);
    const track = appendSelectedTrackNote(dataset.mentorNote);
    if (!track) return;
    renderer.render();
    showToast(els, "Mentor note saved");
    return;
  }
  if (action === "practice") {
    window.location.href = buildPracticeHref("pitch-gates", getSelectedTrack());
  }
}

function launchNextMove() {
  const track = getSelectedTrack();
  const modeId = els.nextMoveBtn.dataset.modeId;
  if (!track || !modeId) return;
  const mission = armPracticeMission({
    modeId,
    track,
    prompt: els.nextMoveBtn.dataset.mission,
  });
  if (!mission) return;
  window.location.href = buildPracticeHref(modeId, track, mission.prompt, mission.id);
}

function readRouteContext() {
  const params = new URLSearchParams(window.location.search);
  const trackId = params.get("track") || "";
  const eventId = params.get("event") || "";
  if (trackId && state.tracks.some((track) => track.id === trackId)) {
    setSelectedId(trackId);
  }
  return {
    eventId,
    hasContext: params.has("track") || params.has("event") || params.has("mission") || params.has("missionId"),
  };
}

function clearRouteContext() {
  const url = new URL(window.location.href);
  url.searchParams.delete("track");
  url.searchParams.delete("event");
  url.searchParams.delete("mission");
  url.searchParams.delete("missionId");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

document.querySelector("#saveTrackBtn").addEventListener("click", saveSelected);
document.querySelector("#addTrackBtn").addEventListener("click", addManualTrack);
document.querySelector("#sortBtn").addEventListener("click", sortTracks);
document.querySelector("#importBtn").addEventListener("click", () => els.audioInput.click());
document.querySelector("#audioInput").addEventListener("change", (event) => {
  importAudio(event.target.files[0], {
    addTrack(track) {
      addStateTrack(track);
      renderer.render();
    },
    nextTimecode,
    setLength(value) {
      els.setLength.textContent = value;
    },
    setEngineStatus(value) {
      els.engineStatus.textContent = value;
    },
    showToast(message) {
      showToast(els, message);
    },
  });
});
document.querySelector("#demoBtn").addEventListener("click", workflows.runDemo);
els.listenBtn.addEventListener("click", workflows.toggleListening);
els.workspaceListenBtn.addEventListener("click", workflows.toggleListening);
document.querySelector("#providerTestBtn").addEventListener("click", workflows.testProviderWithSample);
document.querySelector("#archiveBtn").addEventListener("click", workflows.archiveSet);
document.querySelector("#exportBtn").addEventListener("click", workflows.exportData);
document.querySelector("#newSetBtn").addEventListener("click", workflows.newSet);
document.querySelector("#copySetlistBtn").addEventListener("click", workflows.copySetlist);
document.querySelector("#mergeDuplicateBtn").addEventListener("click", mergeDuplicateMoment);
document.querySelector("#closeEventDrawerBtn").addEventListener("click", closeAudioEvent);
document.querySelector("#reassignEventBtn").addEventListener("click", reassignSelectedAudioEvent);
document.querySelector("#promoteEventBtn").addEventListener("click", promoteSelectedAudioEvent);
els.nextMoveBtn.addEventListener("click", launchNextMove);

els.timelineSearch.addEventListener("input", (event) => {
  uiState.query = event.target.value;
  renderer.renderTimeline();
});
els.reviewToggle.addEventListener("click", () => {
  uiState.reviewOnly = !uiState.reviewOnly;
  renderer.renderTimeline();
});
els.signalFilterButtons.forEach((button) => {
  button.addEventListener("click", () => setSignalFilter(button.dataset.signalFilter));
});
els.eventLabelButtons.forEach((button) => {
  button.addEventListener("click", () => toggleSelectedEventLabel(button.dataset.eventLabel));
});
els.skinButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applySkin(els, button.dataset.skin);
    showToast(els, `${button.textContent} skin`);
  });
});
els.padButtons.forEach((button) => {
  button.addEventListener("click", () => tagTransition(button.dataset.padTransition));
});
els.tagButtons.forEach((button) => {
  button.addEventListener("click", () => tagCrateMoment(button.dataset.quickTag));
});
els.setMapCanvas.addEventListener("click", selectFromSetMap);
window.addEventListener("resize", renderer.renderTimeline);
window.addEventListener("beforeunload", () => workflows.stopListening({ announce: false }));

makeBars(els);
const routeContext = readRouteContext();
refreshApiStatus();
applySkin(els, state.skin);
renderer.render();
if (routeContext.eventId && getAudioEventById(routeContext.eventId)) {
  openAudioEvent(routeContext.eventId);
  showToast(els, "Practice run attached");
}
if (routeContext.hasContext) clearRouteContext();

// Touch selected state during startup so missing hydrated ids surface early in checks.
getSelectedTrack();

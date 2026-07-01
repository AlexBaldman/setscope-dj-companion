import { getApiHealth, getProviderDiagnostics } from "./api.js";
import { importAudio } from "./audio.js";
import { els } from "./dom.js";
import { applySkin, createRenderer, makeBars } from "./render.js";
import { nearestTrackFromMap } from "./set-map.js";
import {
  addTrack as addStateTrack,
  appendSelectedTrackNote,
  getAudioEventById,
  getSelectedTrack,
  mergeSelectedDuplicate,
  nextTimecode,
  persist,
  promoteAudioEventToTrackNotes,
  reassignAudioEvent,
  saveSelectedTrack,
  setSelectedId,
  setSelectedTransition,
  sortTracksInPlace,
  state,
  tagSelectedTrack,
  toggleAudioEventLabel,
} from "./state.js";
import { createWorkflows } from "./workflows.js";
import { showToast } from "./utils.js";

let workflows;
let selectedAudioEventId = "";

const renderer = createRenderer(els, {
  onSelectTrack(id) {
    if (!id) return;
    setSelectedId(id);
    renderer.render();
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
  state.signalFilter = filter || "all";
  renderer.renderTimeline();
  persist();
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
    state.reviewOnly = true;
    state.signalFilter = "all";
    if (dataset.trackId) setSelectedId(dataset.trackId);
    renderer.render();
    showToast(els, "Review lane armed");
    return;
  }
  if (action === "signals") {
    state.reviewOnly = false;
    state.signalFilter = "with-events";
    renderer.render();
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
    window.location.href = "./pitch-gates.html";
  }
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
document.querySelector("#listenBtn").addEventListener("click", workflows.startListening);
document.querySelector("#providerTestBtn").addEventListener("click", workflows.testProviderWithSample);
document.querySelector("#archiveBtn").addEventListener("click", workflows.archiveSet);
document.querySelector("#exportBtn").addEventListener("click", workflows.exportData);
document.querySelector("#newSetBtn").addEventListener("click", workflows.newSet);
document.querySelector("#copySetlistBtn").addEventListener("click", workflows.copySetlist);
document.querySelector("#mergeDuplicateBtn").addEventListener("click", mergeDuplicateMoment);
document.querySelector("#closeEventDrawerBtn").addEventListener("click", closeAudioEvent);
document.querySelector("#reassignEventBtn").addEventListener("click", reassignSelectedAudioEvent);
document.querySelector("#promoteEventBtn").addEventListener("click", promoteSelectedAudioEvent);

els.timelineSearch.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderer.renderTimeline();
  persist();
});
els.reviewToggle.addEventListener("click", () => {
  state.reviewOnly = !state.reviewOnly;
  renderer.renderTimeline();
  persist();
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

makeBars(els);
refreshApiStatus();
applySkin(els, state.skin);
renderer.render();

// Touch selected state during startup so missing hydrated ids surface early in checks.
getSelectedTrack();

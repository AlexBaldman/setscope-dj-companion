import { getApiHealth, getProviderDiagnostics } from "./api.js";
import { importAudio } from "./audio.js";
import { els } from "./dom.js";
import { applySkin, createRenderer, makeBars } from "./render.js";
import { nearestTrackFromMap } from "./set-map.js";
import {
  addTrack as addStateTrack,
  getSelectedTrack,
  nextTimecode,
  persist,
  saveSelectedTrack,
  setSelectedId,
  setSelectedTransition,
  sortTracksInPlace,
  state,
} from "./state.js";
import { createWorkflows } from "./workflows.js";
import { showToast } from "./utils.js";

let workflows;

const renderer = createRenderer(els, {
  onSelectTrack(id) {
    if (!id) return;
    setSelectedId(id);
    renderer.render();
  },
  onLoadArchivedSet(id) {
    workflows.loadArchivedSet(id);
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

function selectFromSetMap(event) {
  const nearest = nearestTrackFromMap(els.setMapCanvas, event, state.tracks);
  if (!nearest) return;
  setSelectedId(nearest.id);
  renderer.render();
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
els.skinButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applySkin(els, button.dataset.skin);
    showToast(els, `${button.textContent} skin`);
  });
});
els.padButtons.forEach((button) => {
  button.addEventListener("click", () => tagTransition(button.dataset.padTransition));
});
els.setMapCanvas.addEventListener("click", selectFromSetMap);
window.addEventListener("resize", renderer.renderTimeline);

makeBars(els);
refreshApiStatus();
applySkin(els, state.skin);
renderer.render();

// Touch selected state during startup so missing hydrated ids surface early in checks.
getSelectedTrack();

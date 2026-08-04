import { listSets, loadSet, recognizeWindow, saveSet } from "./api.js";
import { captureAudioWindow, createSampleAudioPayload } from "./capture.js";
import { createListeningSession, normalizeListeningCadence } from "./listening-session.js";
import {
  addTrack,
  hydrateState,
  logRecognitionObservation,
  nextTimecode,
  normalizeTrack,
  persist,
  resetForNewSet,
  setSelectedId,
  state,
  uiState,
  upsertRecognizedTrack,
} from "./state.js";
import { toSeconds } from "./utils.js";
import { uid } from "./utils.js";

export function createWorkflows(els, { render, renderArchiveList, applySkin, showToast }) {
  let demoTimer = null;
  let archiveSearchTimer = null;
  let archiveRequest = 0;
  const savedCadence = normalizeListeningCadence(localStorage.getItem("setscope-listening-cadence"));
  els.cadenceSelect.value = String(savedCadence);
  els.archiveSearch?.addEventListener("input", () => {
    window.clearTimeout(archiveSearchTimer);
    archiveSearchTimer = window.setTimeout(refreshArchiveList, 180);
  });

  const listeningSession = createListeningSession({
    acquireStream: () => navigator.mediaDevices.getUserMedia({ audio: true }),
    captureWindow: captureAudioWindow,
    recognize: async ({ payload }, { signal }) => requestRecognition(payload, { signal }),
    onMatch(match) {
      upsertRecognizedTrack(match);
      render();
      showToast(`${match.artist} - ${match.title}`);
    },
    onError(_error, sessionState) {
      showToast(`Recognition retry ${sessionState.consecutiveErrors}/3`);
    },
    onObservation(observation) {
      logRecognitionObservation(observation);
      render();
      if (observation?.outcome === "unmatched") showToast("No match in this window");
    },
    onState: renderListeningState,
  });
  renderListeningState(listeningSession.getState());

  async function refreshArchiveList() {
    const request = ++archiveRequest;
    const query = els.archiveSearch?.value.trim() || "";
    uiState.archiveQuery = query;
    try {
      const archive = await listSets(query);
      if (request !== archiveRequest) return;
      uiState.archiveList = archive.sets || [];
      renderArchiveList();
    } catch {
      if (request !== archiveRequest) return;
      uiState.archiveList = [];
      renderArchiveList();
    }
  }

  async function requestRecognition(audio, { signal, demoMode = false } = {}) {
    const requestId = uid();
    const windowSeconds = Math.max(1, Math.round(Number(audio?.durationMs || 0) / 1000) || 8);
    const sessionStartedAtMs = Date.parse(state.recognitionStartedAt || new Date().toISOString());
    const captureStartedAtMs = Number(audio?.captureStartedAtMs);
    const observedAtMs = Number.isFinite(captureStartedAtMs) ? captureStartedAtMs : Date.now();
    const payload = await recognizeWindow({
      audio,
      cursor: state.recognitionCursor,
      requestId,
      sessionId: state.recognitionSessionId,
      setElapsedMs: Math.max(0, observedAtMs - sessionStartedAtMs),
      signal,
      windowSeconds,
      demoMode,
    });
    state.recognitionCursor = payload.cursor || state.recognitionCursor + 1;
    return payload;
  }

  function runLocalDemoFallback() {
    window.clearInterval(demoTimer);
    let index = 0;
    els.engineStatus.textContent = "Listening";
    setSelectedId(state.tracks[index]?.id);
    render();
    demoTimer = window.setInterval(() => {
      index += 1;
      if (index >= state.tracks.length) {
        window.clearInterval(demoTimer);
        els.engineStatus.textContent = "Set logged";
        showToast("Demo complete");
        return;
      }
      setSelectedId(state.tracks[index].id);
      render();
    }, 1800);
  }

  function runDemo() {
    stopListening({ announce: false });
    window.clearInterval(demoTimer);
    let captures = 0;
    els.engineStatus.textContent = "Recognizing";
    showToast("Recognition stub started");
    demoTimer = window.setInterval(async () => {
      try {
        const result = await requestRecognition(undefined, { demoMode: true });
        if (result.observation?.outcome !== "matched") {
          logRecognitionObservation(result.observation);
          render();
          throw new Error(result.observation?.outcome || "recognition_failed");
        }
        const match = { ...result.match, observation: result.observation, transaction: result.transaction };
        upsertRecognizedTrack(match);
        render();
        captures += 1;
        els.engineStatus.textContent = match.needsReview ? "Review match" : "Matched";
        showToast(`${match.artist} - ${match.title}`);
        if (captures >= 4) {
          window.clearInterval(demoTimer);
          els.engineStatus.textContent = "Set logged";
        }
      } catch {
        window.clearInterval(demoTimer);
        showToast("Using local demo");
        runLocalDemoFallback();
      }
    }, 1400);
  }

  async function toggleListening() {
    if (listeningSession.isActive()) {
      stopListening();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast("Mic capture unavailable");
      return;
    }
    if (!globalThis.MediaRecorder) {
      showToast("Recorder unavailable");
      return;
    }
    window.clearInterval(demoTimer);
    try {
      const cadenceMs = normalizeListeningCadence(els.cadenceSelect.value);
      localStorage.setItem("setscope-listening-cadence", String(cadenceMs));
      await listeningSession.start({ cadenceMs, windowMs: 8000 });
      showToast("Live listening started");
    } catch (error) {
      showToast(error?.name === "NotAllowedError" ? "Mic permission needed" : "Mic capture unavailable");
    }
  }

  function stopListening({ announce = true } = {}) {
    const stopped = listeningSession.stop();
    if (stopped && announce) showToast("Live listening stopped");
  }

  function renderListeningState(sessionState) {
    const labels = {
      capturing: "Capturing",
      error: "Needs attention",
      idle: "Off air",
      recognizing: "Matching",
      requesting: "Connecting",
      waiting: "Listening",
    };
    const details = {
      capturing: `Window ${sessionState.cycleCount} / 8s sample`,
      error: sessionState.lastError || "Recognition paused",
      idle: sessionState.stoppedAt ? "Session stopped" : "Ready for the room",
      recognizing: "Reading the current track",
      requesting: "Waiting for microphone",
      waiting: `Next pass / ${Math.round(sessionState.cadenceMs / 1000)}s cadence`,
    };
    els.liveTransport.dataset.state = sessionState.phase;
    els.liveStatus.textContent = labels[sessionState.phase] || "Off air";
    els.liveDetail.textContent = details[sessionState.phase] || "Ready for the room";
    els.liveWindows.textContent = String(sessionState.cycleCount || 0);
    els.liveMatches.textContent = String(sessionState.matchCount || 0);
    [els.listenBtn, els.workspaceListenBtn].forEach((button) => {
      button.setAttribute("aria-pressed", String(sessionState.active));
      button.title = sessionState.active ? "Stop listening" : "Start listening";
    });
    els.listenLabel.textContent = sessionState.active ? "Stop" : "Listen";
    els.workspaceListenLabel.textContent = sessionState.active ? "Stop" : "Listen";
    els.cadenceSelect.disabled = sessionState.active;
    document.body.dataset.listening = sessionState.active ? "active" : "idle";
    els.engineStatus.textContent = labels[sessionState.phase] || "Idle";
  }

  async function testProviderWithSample() {
    try {
      els.engineStatus.textContent = "Testing";
      showToast("Testing provider");
      const payload = await createSampleAudioPayload(8000);
      const result = await requestRecognition(payload);
      if (result.observation?.outcome !== "matched") {
        logRecognitionObservation(result.observation);
        render();
        throw new Error(result.observation?.outcome || "recognition_failed");
      }
      const match = { ...result.match, observation: result.observation, transaction: result.transaction };
      upsertRecognizedTrack({
        ...match,
        notes: `${match.notes} Sample-provider test captured with generated audio.`,
      });
      render();
      els.engineStatus.textContent = match.needsReview ? "Review match" : "Matched";
      showToast(`${match.provider || "Provider"} test logged`);
    } catch {
      els.engineStatus.textContent = "Idle";
      showToast("Provider test failed");
    }
  }

  function buildSetPayload() {
    return {
      id: state.archiveId,
      name: document.querySelector("#setTitle").textContent,
      exportedAt: new Date().toISOString(),
      skin: state.skin,
      summary: {
        bpmRange: els.summaryBpm.textContent,
        reviewCount: Number(els.summaryReview.textContent) || 0,
        dominantEra: els.summaryEra.textContent,
        dominantMove: els.summaryMove.textContent,
      },
      captureLog: state.captureLog,
      audioEvents: state.audioEvents,
      tracks: state.tracks,
    };
  }

  function exportData() {
    const payload = buildSetPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "setscope-dj-set.json";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Set exported");
  }

  async function archiveSet() {
    try {
      if (!state.archiveId) {
        state.archiveId = `set_${uid()}`;
        persist();
      }
      const payload = buildSetPayload();
      const result = await saveSet(payload);
      state.archiveId = result.set.id;
      persist();
      await refreshArchiveList();
      showToast("Set archived");
    } catch {
      showToast("Archive API unavailable");
    }
  }

  async function loadArchivedSet(id) {
    if (!id) return;
    stopListening({ announce: false });
    try {
      const payload = await loadSet(id);
      const set = payload.set;
      state.archiveId = set.id;
      state.skin = set.skin || state.skin;
      state.captureLog = set.captureLog || [];
      document.querySelector("#setTitle").textContent = set.name || "Untitled set";
      const hydrated = hydrateState({ tracks: set.tracks || [], audioEvents: set.audioEvents || [] });
      state.audioEvents = hydrated.audioEvents;
      state.tracks = hydrated.tracks;
      setSelectedId(state.tracks[0]?.id);
      persist();
      applySkin(state.skin);
      render();
      showToast("Set loaded");
    } catch {
      showToast("Could not load set");
    }
  }

  async function copySetlist() {
    const title = document.querySelector("#setTitle").textContent;
    const lines = state.tracks
      .map(normalizeTrack)
      .sort((a, b) => toSeconds(a.time) - toSeconds(b.time))
      .map((track) => `${track.time}  ${track.artist} - ${track.title}  [${track.bpm || "--"} BPM / ${track.transition}]`);
    const text = [`${title} - SetScope notes`, "", ...lines, "", `Review flags: ${state.tracks.filter((track) => normalizeTrack(track).needsReview).length}`].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      showToast("Setlist copied");
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      showToast("Setlist copied");
    }
  }

  function newSet() {
    stopListening({ announce: false });
    resetForNewSet();
    addTrack({
      time: "00:00",
      title: "Listening for first track",
      artist: "Unknown source",
      bpm: 0,
      confidence: 0,
      key: "-",
      transition: "Blend",
      era: "New capture",
      label: "Unverified",
      source: "Mic/import",
      texture: "Listening",
      lineage: "Waiting for first match",
      why: "A blank first moment keeps the set ready for immediate correction once recognition starts.",
      status: "unknown",
      needsReview: true,
      notes:
        "Start with a mic capture, imported audio, or manual entry. The archive stores a timestamped track log with analysis fields.",
    });
    render();
    refreshArchiveList();
    showToast("New set ready");
  }

  return {
    archiveSet,
    copySetlist,
    exportData,
    loadArchivedSet,
    newSet,
    refreshArchiveList,
    runDemo,
    stopListening,
    testProviderWithSample,
    toggleListening,
  };
}

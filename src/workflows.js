import { listSets, loadSet, recognizeWindow, saveSet } from "./api.js";
import { captureAudioWindow, createSampleAudioPayload } from "./capture.js";
import {
  addTrack,
  hydrateState,
  nextTimecode,
  normalizeTrack,
  persist,
  resetForNewSet,
  setSelectedId,
  state,
  upsertRecognizedTrack,
} from "./state.js";
import { toSeconds } from "./utils.js";

export function createWorkflows(els, { render, renderArchiveList, applySkin, showToast }) {
  let demoTimer = null;

  async function refreshArchiveList() {
    try {
      const archive = await listSets();
      state.archiveList = archive.sets || [];
      renderArchiveList();
    } catch {
      state.archiveList = [];
      renderArchiveList();
    }
  }

  async function requestRecognition(audio) {
    const windowSeconds = Math.max(1, Math.round(Number(audio?.durationMs || 0) / 1000) || 8);
    const payload = await recognizeWindow({
      audio,
      cursor: state.recognitionCursor,
      windowSeconds,
      tracks: state.tracks,
    });
    state.recognitionCursor = payload.cursor || state.recognitionCursor + 1;
    return payload.match;
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
    window.clearInterval(demoTimer);
    let captures = 0;
    els.engineStatus.textContent = "Recognizing";
    showToast("Recognition stub started");
    demoTimer = window.setInterval(async () => {
      try {
        const match = await requestRecognition();
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

  async function startListening() {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast("Mic capture unavailable");
      return;
    }
    if (!globalThis.MediaRecorder) {
      showToast("Recorder unavailable");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const windowMs = 8000;
      const maxWindows = 3;
      showToast("Listening from mic");
      for (let index = 0; index < maxWindows; index += 1) {
        els.engineStatus.textContent = `Window ${index + 1}/${maxWindows}`;
        const { payload } = await captureAudioWindow(stream, windowMs);
        const match = await requestRecognition(payload);
        upsertRecognizedTrack(match);
        render();
        els.engineStatus.textContent = match.needsReview ? "Review match" : "Matched";
        showToast(`${match.artist} - ${match.title}`);
      }
      els.engineStatus.textContent = "Set logged";
    } catch {
      showToast("Mic permission needed");
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  }

  async function testProviderWithSample() {
    try {
      els.engineStatus.textContent = "Testing";
      showToast("Testing provider");
      const payload = await createSampleAudioPayload(8000);
      const match = await requestRecognition(payload);
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
    try {
      const payload = await loadSet(id);
      const set = payload.set;
      state.archiveId = set.id;
      state.skin = set.skin || state.skin;
      state.captureLog = set.captureLog || [];
      state.audioEvents = set.audioEvents || [];
      state.tracks = hydrateState({ tracks: set.tracks || [] }).tracks;
      setSelectedId(state.tracks[0]?.id);
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
    startListening,
    testProviderWithSample,
  };
}

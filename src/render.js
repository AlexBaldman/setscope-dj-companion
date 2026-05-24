import { drawSetMap } from "./set-map.js";
import {
  getSelectedId,
  getSelectedTrack,
  normalizeTrack,
  persist,
  state,
  visibleTracks,
} from "./state.js";
import { compactEra, escapeHtml, mode } from "./utils.js";

export function makeBars(els) {
  els.waveBars.innerHTML = "";
  Array.from({ length: 28 }).forEach((_, index) => {
    const bar = document.createElement("span");
    const height = 18 + ((index * 17) % 42);
    bar.style.height = `${height}px`;
    bar.style.animationDelay = `${index * 38}ms`;
    els.waveBars.appendChild(bar);
  });
}

export function applySkin(els, skin) {
  state.skin = skin;
  document.body.dataset.skin = skin;
  els.skinButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.skin === skin);
  });
  persist();
}

export function createRenderer(els, handlers) {
  function render() {
    const track = getSelectedTrack();
    if (!track) return;
    renderTimeline();
    renderInspector(track);
    renderNow(track);
    renderCaptureLog();
    persist();
  }

  function renderTimeline() {
    els.timeline.innerHTML = "";
    const tracks = visibleTracks();
    tracks.forEach((track) => {
      const row = document.createElement("button");
      row.className = `track-row ${track.id === getSelectedId() ? "active" : ""} ${track.needsReview ? "needs-review" : ""}`;
      row.style.setProperty("--wave", `${track.wave || 50}%`);
      row.innerHTML = `
        <div class="timecode">${track.time}</div>
        <div class="track-main">
          <div class="track-name">${escapeHtml(track.title)}</div>
          <div class="artist-name">${escapeHtml(track.artist)}</div>
          <div class="track-detail">${escapeHtml(track.era)} / ${escapeHtml(track.label)}</div>
          <div class="mini-wave"></div>
        </div>
        <div class="tag bpm">${track.bpm} BPM</div>
        <div class="tag">${escapeHtml(track.transition)}</div>
      `;
      row.addEventListener("click", () => handlers.onSelectTrack(track.id));
      els.timeline.appendChild(row);
    });
    if (!tracks.length) {
      els.timeline.innerHTML = `<div class="info-block"><p>No tracks match this view.</p></div>`;
    }
    els.timelineCount.textContent = `${tracks.length}/${state.tracks.length} tracks`;
    const progress = Math.min(100, Math.max(8, state.tracks.length * 13));
    els.progressFill.style.width = `${progress}%`;
    els.reviewToggle.classList.toggle("active", state.reviewOnly);
    els.timelineSearch.value = state.query;
    renderSummary();
    drawSetMap(els.setMapCanvas, state.tracks.map(normalizeTrack), getSelectedId());
  }

  function renderInspector(track) {
    normalizeTrack(track);
    const colors = setTrackColors(track);
    els.artwork.style.setProperty("--art-a", colors[0]);
    els.artwork.style.setProperty("--art-b", colors[1]);
    els.artwork.style.setProperty("--art-c", colors[2]);
    els.intelTitle.textContent = track.title;
    els.intelSummary.textContent = track.notes;
    els.momentList.innerHTML = `
      <li>${track.time} entry with ${track.transition.toLowerCase()} transition</li>
      <li>${track.bpm} BPM, Camelot ${track.key}</li>
      <li>${track.confidence || 76}% recognition confidence</li>
    `;
    els.dnaGrid.innerHTML = `
      <div class="dna-row"><span>Era</span><strong>${escapeHtml(track.era)}</strong></div>
      <div class="dna-row"><span>Lineage</span><strong>${escapeHtml(track.lineage)}</strong></div>
      <div class="dna-row"><span>Why</span><strong>${escapeHtml(track.why)}</strong></div>
    `;
    els.factLabel.textContent = track.label;
    els.factSource.textContent = track.source;
    els.factTexture.textContent = track.texture;
    els.factStatus.textContent = formatStatus(track.status, track.needsReview);
    els.editTitle.value = track.title;
    els.editArtist.value = track.artist;
    els.editTime.value = track.time;
    els.editBpm.value = track.bpm;
    els.editKey.value = track.key;
    els.editTransition.value = track.transition;
    els.editNotes.value = track.notes;
  }

  function renderNow(track) {
    normalizeTrack(track);
    els.nowTitle.textContent = track.title;
    els.nowArtist.textContent = track.artist;
    els.nowBpm.textContent = track.bpm;
    els.nowKey.textContent = track.key;
    els.nowConfidence.textContent = `${track.confidence || 0}%`;
    els.recordLabel.textContent = `${track.bpm || "--"} BPM`;
  }

  function renderSummary() {
    const tracks = state.tracks.map(normalizeTrack);
    const bpms = tracks.map((track) => Number(track.bpm)).filter(Boolean);
    const transitions = mode(tracks.map((track) => track.transition));
    const eras = tracks.map((track) => track.era).filter(Boolean);
    els.summaryBpm.textContent = bpms.length ? `${Math.min(...bpms)}-${Math.max(...bpms)}` : "--";
    els.summaryReview.textContent = tracks.filter((track) => track.needsReview).length;
    els.summaryEra.textContent = eras.length ? compactEra(eras) : "--";
    els.summaryMove.textContent = transitions || "--";
  }

  function renderCaptureLog() {
    const items = state.captureLog.slice(0, 6);
    if (!items.length) {
      els.captureLog.innerHTML = `<p>No recognition captures yet.</p>`;
      return;
    }
    els.captureLog.innerHTML = items
      .map(
        (item) => `
          <button class="capture-item" data-capture-id="${escapeHtml(item.trackId || "")}">
            <div class="capture-badge">${escapeHtml(item.time || "--:--")}</div>
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.artist)} / ${escapeHtml(item.provider || "local")}</span>
            </div>
            <div class="capture-score">${escapeHtml(item.status || "review")}</div>
          </button>
        `,
      )
      .join("");
    els.captureLog.querySelectorAll("[data-capture-id]").forEach((button) => {
      button.addEventListener("click", () => handlers.onSelectTrack(button.dataset.captureId));
    });
  }

  function renderArchiveList() {
    const sets = state.archiveList.slice(0, 6);
    if (!sets.length) {
      els.archiveList.innerHTML = `<p>No archived sets yet.</p>`;
      return;
    }
    els.archiveList.innerHTML = sets
      .map(
        (set) => `
          <button class="archive-item" data-set-id="${escapeHtml(set.id)}">
            <div>
              <strong>${escapeHtml(set.name || "Untitled set")}</strong>
              <span>${set.trackCount || 0} tracks / ${escapeHtml(formatArchiveDate(set.updatedAt))}</span>
            </div>
            <div class="capture-score">Load</div>
          </button>
        `,
      )
      .join("");
    els.archiveList.querySelectorAll("[data-set-id]").forEach((button) => {
      button.addEventListener("click", () => handlers.onLoadArchivedSet(button.dataset.setId));
    });
  }

  return { render, renderTimeline, renderArchiveList };
}

function setTrackColors(track) {
  const colors = track.colors || ["#f0ad4e", "#75d7b6", "#ec6f7e"];
  document.documentElement.style.setProperty("--label-a", colors[0]);
  document.documentElement.style.setProperty("--label-b", colors[1]);
  document.documentElement.style.setProperty("--label-c", colors[2]);
  return colors;
}

function formatArchiveDate(value) {
  if (!value) return "unsaved";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatStatus(status, needsReview) {
  if (status === "matched") return "Matched";
  if (status === "unknown") return "Unknown";
  if (status === "review" || needsReview) return "Review";
  return "Locked";
}

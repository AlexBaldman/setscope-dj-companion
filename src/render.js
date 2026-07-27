import { drawSetMap } from "./set-map.js";
import { createDjMentorModel, createDjMoveCard } from "./dj-mentor.js";
import { buildPracticeHref } from "./practice-context.js";
import { createSetCoachModel } from "./set-coach.js";
import { deriveSessionSpine, modeLabel } from "./session-spine.js";
import {
  audioEventLabels,
  audioEventsForTrack,
  getSelectedId,
  getSelectedTrack,
  findNearbyDuplicate,
  normalizeTrack,
  persist,
  state,
  uiState,
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
    renderAudioEvents();
  }

  function renderTimeline() {
    els.timeline.innerHTML = "";
    const tracks = visibleTracks();
    tracks.forEach((track) => {
      const events = audioEventsForTrack(track, 3);
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
          ${renderTrackEventStrip(events)}
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
    els.reviewToggle.classList.toggle("active", uiState.reviewOnly);
    els.signalFilterButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.signalFilter === uiState.signalFilter);
    });
    els.timelineSearch.value = uiState.query;
    renderSummary();
    renderSetCoach();
    renderDjMentor();
    renderSessionSpine();
    drawSetMap(els.setMapCanvas, state.tracks.map(normalizeTrack), getSelectedId());
  }

  function renderSessionSpine() {
    const track = getSelectedTrack();
    const session = deriveSessionSpine(state, track);
    const move = session.nextMove;
    els.nextMoveEyebrow.textContent = move.eyebrow;
    els.nextMoveTitle.textContent = move.title;
    els.nextMoveDetail.textContent = move.detail;
    els.nextMoveMode.textContent = move.modeId ? modeLabel(move.modeId) : "Listen";
    els.nextMoveAction.textContent = move.action;
    els.nextMoveTrack.textContent = track?.title || "Catch the first record";
    els.sessionCaptured.textContent = session.stats.captured;
    els.sessionPracticed.textContent = session.stats.practiced;
    els.sessionCompleted.textContent = session.stats.missionsCompleted;
    els.nextMoveBtn.disabled = !move.modeId;
    els.nextMoveBtn.dataset.modeId = move.modeId;
    els.nextMoveBtn.dataset.mission = move.prompt;
    els.nextMoveBtn.dataset.missionId = move.missionId;
    els.nextMoveBtn.dataset.trackId = move.trackId || "";
  }

  function renderInspector(track) {
    normalizeTrack(track);
    const colors = setTrackColors(track);
    els.artwork.style.setProperty("--art-a", colors[0]);
    els.artwork.style.setProperty("--art-b", colors[1]);
    els.artwork.style.setProperty("--art-c", colors[2]);
    els.intelTitle.textContent = track.title;
    els.intelSummary.textContent = track.notes;
    const trackEvents = audioEventsForTrack(track, 5);
    els.momentList.innerHTML = `
      <li>${track.time} entry with ${track.transition.toLowerCase()} transition</li>
      <li>${track.bpm} BPM, Camelot ${track.key}</li>
      <li>${track.confidence || 76}% recognition confidence</li>
      <li><span class="evidence-kind" data-kind="${escapeHtml(track.observation?.provenance || (track.provider === "setscope-stub" ? "story" : "inference"))}">${escapeHtml(formatEvidenceKind(track.observation?.provenance || (track.provider === "setscope-stub" ? "story" : "inference")))}</span> ${escapeHtml(track.observation?.outcome || track.status || "review")}</li>
      ${renderTrackToolbeltMoments(trackEvents)}
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
    renderTrackTags(track);
    renderDuplicateReview(track);
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
    els.workspaceNowTitle.textContent = track.title;
    els.workspaceNowArtist.textContent = track.artist;
    els.nowBpm.textContent = track.bpm;
    els.nowKey.textContent = track.key;
    els.nowConfidence.textContent = `${track.confidence || 0}%`;
    renderConfidenceMeter(track.confidence || 0);
    els.recordLabel.textContent = `${track.bpm || "--"} BPM`;
    els.padButtons.forEach((button) => {
      const active = button.dataset.padTransition === track.transition;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
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

  function renderSetCoach() {
    const coach = createSetCoachModel();
    els.coachScore.textContent = coach.readinessScore;
    els.coachGrade.textContent = coach.grade;
    els.coachReviewCount.textContent = coach.stats.reviewCount;
    els.coachSignalCount.textContent = `${coach.stats.signalTracks}/${coach.stats.trackCount}`;
    els.coachLabelCount.textContent = `${coach.stats.labelCount}/${coach.stats.eventCount}`;
    els.coachBpmRange.textContent = coach.bpmRange;
    els.coachActionList.innerHTML = coach.actions
      .map(
        (action) => `
          <button class="coach-action" data-coach-action="${escapeHtml(action.action)}" data-track-id="${escapeHtml(action.trackId || "")}" data-coach-event-id="${escapeHtml(action.eventId || "")}">
            <span>${escapeHtml(action.title)}</span>
            <strong>${escapeHtml(action.detail)}</strong>
            <i>${escapeHtml(action.button)}</i>
          </button>
        `,
      )
      .join("");
    els.coachPromptList.innerHTML = coach.prompts
      .map((prompt) => `<p>${escapeHtml(prompt)}</p>`)
      .join("");
    els.coachActionList.querySelectorAll("[data-coach-action]").forEach((button) => {
      button.addEventListener("click", () => handlers.onCoachAction(button.dataset));
    });
  }

  function renderDjMentor() {
    const track = getSelectedTrack();
    const mentor = createDjMentorModel(track);
    els.mentorStoryBeat.textContent = mentor.storyBeat;
    els.mentorEnergy.textContent = mentor.energy;
    els.mentorMove.textContent = mentor.move;
    els.mentorWhy.textContent = mentor.whyItWorks;
    els.mentorPractice.textContent = mentor.practiceMission;
    els.mentorDig.textContent = mentor.digPrompt;
    els.mentorToolRack.innerHTML = mentor.practiceTools
      .map(
        (tool) => `
          <a class="mentor-tool" data-practice-tool="${escapeHtml(tool.id)}" href="${escapeHtml(buildPracticeHref(tool.id, track, tool.mission))}" aria-label="${escapeHtml(`${tool.label}: ${tool.mission}`)}">
            <span>${escapeHtml(tool.label)}</span>
            <strong>${escapeHtml(tool.detail)}</strong>
          </a>
        `,
      )
      .join("");
    els.mentorActionList.innerHTML = mentor.actions
      .map(
        (action) => `
          <button class="mentor-action" data-coach-action="${escapeHtml(action.action)}" data-track-id="${escapeHtml(action.trackId || "")}" data-mentor-note="${escapeHtml(action.note || "")}">
            <span>${escapeHtml(action.title)}</span>
            <strong>${escapeHtml(action.detail)}</strong>
            <i>${escapeHtml(action.button)}</i>
          </button>
        `,
      )
      .join("");
    els.mentorActionList.querySelectorAll("[data-coach-action]").forEach((button) => {
      button.addEventListener("click", () => handlers.onCoachAction(button.dataset));
    });
  }

  function renderCaptureLog() {
    const items = state.captureLog.slice(0, 6);
    if (!items.length) {
      els.captureLog.innerHTML = `<p>No signal receipts yet.</p>`;
      return;
    }
    els.captureLog.innerHTML = items
      .map(
        (item) => `
          <button class="capture-item" ${item.trackId ? `data-capture-id="${escapeHtml(item.trackId)}"` : "disabled"} data-outcome="${escapeHtml(item.outcome || item.status || "unknown")}">
            <div class="capture-badge">${escapeHtml(item.time || "--:--")}</div>
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.artist)} / ${escapeHtml(item.provider || "local")}</span>
              <small class="evidence-kind" data-kind="${escapeHtml(item.provenance || "inference")}">${escapeHtml(formatEvidenceKind(item.provenance || "inference"))}</small>
            </div>
            <div class="capture-score">${escapeHtml(formatReceiptOutcome(item.outcome || item.status))}</div>
          </button>
        `,
      )
      .join("");
    els.captureLog.querySelectorAll("[data-capture-id]").forEach((button) => {
      button.addEventListener("click", () => handlers.onSelectTrack(button.dataset.captureId));
    });
  }

  function formatReceiptOutcome(outcome) {
    return {
      cancelled: "cancelled",
      invalid: "invalid",
      matched: "matched",
      provider_error: "retry",
      unmatched: "no match",
    }[outcome] || outcome || "review";
  }

  function renderAudioEvents() {
    const events = state.audioEvents.slice(0, 5);
    if (!events.length) {
      els.audioEventLog.innerHTML = `<p>No toolbelt events yet.</p>`;
      return;
    }
    els.audioEventLog.innerHTML = events
      .map(
        (event) => `
          <button class="event-item ${event.trackId ? "attached" : ""}" data-event-id="${escapeHtml(event.id)}" data-event-track-id="${escapeHtml(event.trackId || "")}">
            <div class="event-type">${escapeHtml(event.type)}</div>
            <div>
              <strong>${escapeHtml(event.title)}</strong>
              <span>${escapeHtml(event.time)} / ${escapeHtml(event.detail)}</span>
              ${renderEventMetadata(event)}
            </div>
          </button>
        `,
      )
      .join("");
    els.audioEventLog.querySelectorAll("[data-event-id]").forEach((button) => {
      button.addEventListener("click", () => handlers.onOpenAudioEvent(button.dataset.eventId));
    });
  }

  function renderEventDetail(event) {
    const open = Boolean(event);
    els.eventDrawer.classList.toggle("open", open);
    els.eventDrawer.setAttribute("aria-hidden", String(!open));
    if (!event) {
      els.eventDrawerKicker.textContent = "Toolbelt event";
      els.eventDrawerTitle.textContent = "No event selected";
      els.eventDrawerMeta.innerHTML = "";
      els.eventDrawerBody.textContent = "Select a toolbelt event to inspect its signal.";
      renderEventMentorCard(null);
      renderEventLabelButtons(null);
      renderEventTrackOptions(null);
      return;
    }
    els.eventDrawerKicker.textContent = `${event.type || "event"} / ${event.time || "--:--"}`;
    els.eventDrawerTitle.textContent = event.title || "Toolbelt event";
    els.eventDrawerBody.textContent = formatEventDrawerBody(event);
    els.eventDrawerMeta.innerHTML = renderEventDetailGrid(event);
    renderEventMentorCard(event);
    renderEventLabelButtons(event);
    renderEventTrackOptions(event);
  }

  function renderArchiveList() {
    const sets = uiState.archiveList.slice(0, 20);
    if (els.archiveCount) {
      els.archiveCount.textContent = uiState.archiveQuery
        ? `${sets.length} found`
        : `${sets.length} saved`;
    }
    if (!sets.length) {
      els.archiveList.innerHTML = `<p>${uiState.archiveQuery ? "No matching sets." : "No archived sets yet."}</p>`;
      return;
    }
    els.archiveList.innerHTML = sets
      .map(
        (set) => `
          <button class="archive-item" data-set-id="${escapeHtml(set.id)}">
            <div>
              <strong>${escapeHtml(set.name || "Untitled set")}</strong>
              <span>${set.trackCount || 0} tracks / ${escapeHtml(formatArchiveDate(set.updatedAt))}</span>
              ${renderArchiveMatches(set.matches)}
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

  function renderArchiveMatches(matches) {
    if (!Array.isArray(matches) || !matches.length) return "";
    return `<div class="archive-match-strip">${matches
      .map((match) => `<i><b>${escapeHtml(match.label)}</b>${escapeHtml(match.value)}</i>`)
      .join("")}</div>`;
  }

  return { render, renderTimeline, renderArchiveList, renderEventDetail };

  function renderConfidenceMeter(confidence) {
    const activeBars = Math.round(Math.max(0, Math.min(100, confidence)) / 12.5);
    els.nowConfidenceMeter?.querySelectorAll("i").forEach((bar, index) => {
      bar.classList.toggle("active", index < activeBars);
      bar.classList.toggle("hot", index >= 6 && index < activeBars);
    });
  }

  function renderTrackTags(track) {
    normalizeTrack(track);
    if (!track.tags.length) {
      els.tagList.innerHTML = `<p>No crate tags yet.</p>`;
    } else {
      els.tagList.innerHTML = track.tags
        .map((tag) => `<span class="crate-tag">${escapeHtml(tag)}</span>`)
        .join("");
    }
    els.tagButtons.forEach((button) => {
      button.classList.toggle("active", track.tags.includes(button.dataset.quickTag));
    });
  }

  function renderDuplicateReview(track) {
    const duplicate = findNearbyDuplicate(track);
    els.duplicatePanel.hidden = !duplicate;
    if (!duplicate) return;
    els.duplicateText.textContent = `${duplicate.time} / ${duplicate.title} may be the same captured moment.`;
  }

  function renderEventTrackOptions(event) {
    els.eventTrackSelect.innerHTML = `<option value="">Unattached</option>`;
    state.tracks.map(normalizeTrack).forEach((track) => {
      const option = document.createElement("option");
      option.value = track.id;
      option.textContent = `${track.time} / ${track.title}`;
      option.selected = event?.trackId === track.id;
      els.eventTrackSelect.appendChild(option);
    });
  }

  function renderEventLabelButtons(event) {
    const labels = new Set(audioEventLabels(event));
    els.eventLabelButtons.forEach((button) => {
      button.classList.toggle("active", labels.has(button.dataset.eventLabel));
    });
  }

  function renderEventMentorCard(event) {
    els.eventMentorCard.hidden = !event;
    if (!event) {
      els.eventMentorCard.innerHTML = "";
      return;
    }
    const card = createDjMoveCard(event);
    els.eventMentorCard.innerHTML = `
      <span>DJ move card / ${escapeHtml(card.storyBeat)}</span>
      <strong>${escapeHtml(card.move)}</strong>
      <p>${escapeHtml(card.why)}</p>
      <div><b>Practice</b><em>${escapeHtml(card.practice)}</em></div>
      <div><b>Dig</b><em>${escapeHtml(card.dig)}</em></div>
    `;
  }
}

function renderTrackEventStrip(events) {
  if (!events.length) return "";
  return `
    <div class="track-event-strip" aria-label="Attached toolbelt events">
      ${events.map((event) => `<span class="event-chip ${escapeHtml(event.type)}">${escapeHtml(shortEventLabel(event))}</span>`).join("")}
    </div>
  `;
}

function renderTrackToolbeltMoments(events) {
  if (!events.length) return `<li class="moment-muted">No attached toolbelt signals yet</li>`;
  return `
    <li class="moment-toolbelt">
      <strong>Toolbelt signals</strong>
      <div class="moment-event-list">
        ${events
          .map(
            (event) => `
              <span>
                <b>${escapeHtml(shortEventLabel(event))}</b>
                ${escapeHtml(formatEventSignal(event))}
              </span>
            `,
          )
          .join("")}
      </div>
    </li>
  `;
}

function renderEventMetadata(event) {
  const details = event.metadata?.details || {};
  const chips = [
    details.note && details.targetNote ? `${details.note} to ${details.targetNote}` : "",
    Number.isFinite(details.cents) ? `${details.cents > 0 ? "+" : ""}${details.cents} cents` : "",
    details.stableHold ? "locked" : "",
    Number.isFinite(details.rms) ? `RMS ${details.rms}%` : "",
    Number.isFinite(details.peak) ? `peak ${details.peak}%` : "",
    ...audioEventLabels(event),
  ].filter(Boolean);
  if (!chips.length) return "";
  return `<div class="event-meta-strip">${chips.map((chip) => `<i>${escapeHtml(chip)}</i>`).join("")}</div>`;
}

function renderEventDetailGrid(event) {
  const details = event.metadata?.details || {};
  const rows = [
    ["Type", event.type],
    ["Track time", event.time],
    ["Source", event.metadata?.sourceLabel || details.sourceLabel || event.metadata?.sourceLabel],
    ["Mode", event.metadata?.modeId],
    ["Score", event.metadata?.score],
    ["Note", details.note],
    ["Target", details.targetNote],
    ["Cents", Number.isFinite(details.cents) ? `${details.cents > 0 ? "+" : ""}${details.cents}` : ""],
    ["Stable", details.stableHold ? "Yes" : ""],
    ["RMS", Number.isFinite(details.rms) ? `${details.rms}%` : ""],
    ["Peak", Number.isFinite(details.peak) ? `${details.peak}%` : ""],
    ["Preset", details.preset],
    ["Assignment", details.trackTitle],
    ["Mission", details.mission],
    ["Labels", audioEventLabels(event).join(", ")],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");
  return rows
    .map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");
}

function formatEventDrawerBody(event) {
  const details = event.metadata?.details || {};
  if (event.metadata?.modeId === "audio-lab") {
    const pitch = details.note && details.targetNote ? `${details.note} aimed at ${details.targetNote}` : details.note || "Pitch signal";
    const stability = details.stableHold ? "held steady enough to lock" : "not locked yet";
    const level = [Number.isFinite(details.rms) ? `RMS ${details.rms}%` : "", Number.isFinite(details.peak) ? `peak ${details.peak}%` : ""]
      .filter(Boolean)
      .join(", ");
    return `${pitch}; ${stability}${level ? `; ${level}` : ""}. ${event.detail || ""}`.trim();
  }
  if (event.metadata?.modeId === "pitch-gates") {
    return `Pitch Gates run with ${event.metadata.score || 0} points and streak ${event.metadata.streak || 0}. ${event.detail || ""}`.trim();
  }
  if (event.metadata?.modeId === "rhythm-roulette") {
    return `${details.challenge || "Rhythm Roulette"} flip at ${details.bpm || "--"} BPM with groove ${details.groove || 0}. ${event.detail || ""}`.trim();
  }
  return event.detail || event.metadata?.evidence?.summary || "No extra metadata captured yet.";
}

function shortEventLabel(event) {
  if (event.metadata?.modeId === "audio-lab") return "Lab";
  if (event.metadata?.modeId === "pitch-gates") return "Arcade";
  if (event.metadata?.modeId === "rhythm-roulette") return "Flip";
  if (event.type === "recognition") return "ID";
  if (event.type === "tag") return "Tag";
  return event.type || "Event";
}

function formatEventSignal(event) {
  const details = event.metadata?.details;
  if (!details) return event.detail || event.title;
  if (event.metadata?.modeId === "audio-lab") {
    const pitch = details.note && details.targetNote ? `${details.note} to ${details.targetNote}` : details.note || "pitch";
    const cents = Number.isFinite(details.cents) ? `, ${details.cents > 0 ? "+" : ""}${details.cents} cents` : "";
    const hold = details.stableHold ? ", stable lock" : "";
    return `${pitch}${cents}${hold}`;
  }
  if (event.metadata?.modeId === "pitch-gates") {
    return `${details.score || event.metadata.score || 0} pts, streak ${details.streak || event.metadata.streak || 0}`;
  }
  return event.detail || event.title;
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

function formatEvidenceKind(kind) {
  const labels = {
    "internal-digital": "Internal digital",
    inference: "Inferred",
    measured: "Measured",
    model: "Model",
    mapping: "Mapping",
    story: "Demo story",
  };
  return labels[kind] || "Inferred";
}

export async function getApiHealth() {
  if (isStaticDeployment()) return staticHealth();
  const response = await fetch("/api/health");
  if (!response.ok) throw new Error("health_check_failed");
  return response.json();
}

export async function getProviderDiagnostics() {
  if (isStaticDeployment()) {
    return {
      ok: true,
      checks: [
        { id: "audd-token", status: "info", detail: "Server recognition is available in the local app." },
        { id: "capture-window", status: "pass", detail: "Browser audio tools are ready." },
      ],
    };
  }
  const response = await fetch("/api/providers/diagnostics");
  if (!response.ok) throw new Error("provider_diagnostics_failed");
  return response.json();
}

export async function recognizeWindow({
  audio,
  cursor,
  requestId,
  sessionId,
  setElapsedMs,
  signal,
  windowSeconds = 12,
  demoMode = false,
}) {
  if (isStaticDeployment()) throw new Error("static_demo_recognition");
  const body = audio?.blob instanceof Blob ? audio.blob : new Blob([], { type: audio?.mimeType || "application/octet-stream" });
  const response = await fetch("/api/recognize", {
    method: "POST",
    headers: {
      "content-type": body.type || "application/octet-stream",
      "x-setscope-cursor": String(cursor || 0),
      "x-setscope-request-id": requestId,
      "x-setscope-session-id": sessionId || "",
      "x-setscope-set-elapsed-ms": String(setElapsedMs || 0),
      "x-setscope-window-ms": String(Math.max(1000, Number(audio?.durationMs || windowSeconds * 1000))),
      "x-setscope-demo": demoMode ? "1" : "0",
    },
    body,
    signal,
  });
  if (!response.ok) throw new Error("recognition_failed");
  return response.json();
}

export async function analyzeSet(tracks) {
  if (isStaticDeployment()) {
    const bpms = tracks.map((track) => Number(track.bpm)).filter((bpm) => Number.isFinite(bpm) && bpm > 0);
    return {
      trackCount: tracks.length,
      bpmRange: bpms.length ? `${Math.min(...bpms)}-${Math.max(...bpms)}` : "--",
      reviewCount: tracks.filter((track) => track.needsReview).length,
    };
  }
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tracks }),
  });
  if (!response.ok) throw new Error("analysis_failed");
  return response.json();
}

export async function saveSet(set) {
  if (isStaticDeployment()) return saveStaticSet(set);
  const response = await fetch("/api/sets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ set }),
  });
  if (!response.ok) throw new Error("save_set_failed");
  return response.json();
}

export async function listSets(query = "") {
  if (isStaticDeployment()) return listStaticSets(query);
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  const response = await fetch(`/api/sets${params.size ? `?${params}` : ""}`);
  if (!response.ok) throw new Error("list_sets_failed");
  return response.json();
}

export async function loadSet(id) {
  if (isStaticDeployment()) {
    const set = readStaticSets().find((item) => item.id === id);
    if (!set) throw new Error("load_set_failed");
    return { set };
  }
  const response = await fetch(`/api/sets/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error("load_set_failed");
  return response.json();
}

export async function getJournal() {
  if (isStaticDeployment()) {
    const edited = localStorage.getItem(STATIC_JOURNAL_KEY);
    if (edited) return { markdown: edited };
    const response = await fetch(new URL("../docs/DEV_JOURNAL.md", import.meta.url));
    if (!response.ok) throw new Error("get_journal_failed");
    return { markdown: await response.text() };
  }
  const response = await fetch("/api/journal");
  if (!response.ok) throw new Error("get_journal_failed");
  return response.json();
}

export async function saveJournal(markdown) {
  if (isStaticDeployment()) {
    localStorage.setItem(STATIC_JOURNAL_KEY, markdown);
    return { ok: true, updatedAt: new Date().toISOString(), storage: "browser" };
  }
  const response = await fetch("/api/journal", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ markdown }),
  });
  if (!response.ok) throw new Error("save_journal_failed");
  return response.json();
}

const STATIC_ARCHIVE_KEY = "setscope-pages-archive-v1";
const STATIC_JOURNAL_KEY = "setscope-pages-journal-v1";

export function isStaticDeployment() {
  return typeof window !== "undefined"
    && (window.location.hostname.endsWith(".github.io")
      || new URLSearchParams(window.location.search).has("static-demo"));
}

function staticHealth() {
  return {
    ok: true,
    provider: "setscope-static",
    recognition: {
      activeProvider: "setscope-static",
      mode: "Pages demo / browser-local archive",
      sampleSeconds: 8,
      providers: [
        { id: "setscope-static", label: "On-device Demo", configured: true, available: true, role: "Static demo" },
        { id: "audd", label: "AudD", configured: false, available: false, role: "Local server recognition" },
      ],
      native: { target: "ShazamKit", status: "Planned iOS adapter" },
    },
  };
}

function saveStaticSet(input) {
  const sets = readStaticSets();
  const now = new Date().toISOString();
  const id = input.id || `set_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const previous = sets.find((set) => set.id === id);
  const saved = {
    ...structuredClone(input),
    id,
    name: String(input.name || "Untitled set").slice(0, 240),
    savedAt: previous?.savedAt || now,
    updatedAt: now,
    tracks: Array.isArray(input.tracks) ? structuredClone(input.tracks) : [],
    audioEvents: Array.isArray(input.audioEvents) ? structuredClone(input.audioEvents) : [],
    captureLog: Array.isArray(input.captureLog) ? structuredClone(input.captureLog) : [],
  };
  const next = sets.filter((set) => set.id !== id);
  next.unshift(saved);
  localStorage.setItem(STATIC_ARCHIVE_KEY, JSON.stringify(next.slice(0, 100)));
  return {
    ok: true,
    set: {
      id,
      name: saved.name,
      updatedAt: saved.updatedAt,
      trackCount: saved.tracks.length,
    },
  };
}

function listStaticSets(query) {
  const terms = tokenizeSearch(query);
  const sets = readStaticSets()
    .filter((set) => {
      const text = collectSearchText(set).toLocaleLowerCase();
      return terms.every((term) => text.includes(term));
    })
    .map((set) => ({
      id: set.id,
      name: set.name,
      updatedAt: set.updatedAt,
      trackCount: set.tracks?.length || 0,
      matches: terms.length ? staticSearchMatches(set, terms) : [],
    }));
  return { query: String(query || ""), sets };
}

function readStaticSets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STATIC_ARCHIVE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function tokenizeSearch(query) {
  return String(query || "")
    .normalize("NFKC")
    .match(/[\p{L}\p{N}]+/gu)
    ?.slice(0, 8)
    .map((term) => term.toLocaleLowerCase()) || [];
}

function collectSearchText(value, depth = 0) {
  if (depth > 8 || value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map((item) => collectSearchText(item, depth + 1)).join(" ");
  if (typeof value === "object") return Object.values(value).map((item) => collectSearchText(item, depth + 1)).join(" ");
  return "";
}

function staticSearchMatches(set, terms) {
  const candidates = [
    ...(set.tracks || []).map((track) => ({
      label: "Track",
      value: [track.artist, track.title].filter(Boolean).join(" - "),
      text: collectSearchText(track).toLocaleLowerCase(),
    })),
    ...(set.audioEvents || []).map((event) => ({
      label: "Practice",
      value: event.title || event.metadata?.modeId || event.type || "Saved evidence",
      text: collectSearchText(event).toLocaleLowerCase(),
    })),
    ...(set.captureLog || []).map((receipt) => ({
      label: "Signal",
      value: receipt.title || receipt.artist || receipt.outcome || receipt.provider || "Recognition receipt",
      text: collectSearchText(receipt).toLocaleLowerCase(),
    })),
  ];
  const matches = candidates
    .map((candidate) => ({ ...candidate, score: terms.filter((term) => candidate.text.includes(term)).length }))
    .filter((candidate) => candidate.score > 0 && candidate.value)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ label, value }) => ({ label, value }));
  return matches.length ? matches : [{ label: "Set", value: set.name || "Set metadata" }];
}

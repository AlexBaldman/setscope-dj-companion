export async function getApiHealth() {
  const response = await fetch("/api/health");
  if (!response.ok) throw new Error("health_check_failed");
  return response.json();
}

export async function getProviderDiagnostics() {
  const response = await fetch("/api/providers/diagnostics");
  if (!response.ok) throw new Error("provider_diagnostics_failed");
  return response.json();
}

export async function recognizeWindow({ audio, cursor, signal, tracks, windowSeconds = 12 }) {
  const response = await fetch("/api/recognize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ audio, cursor, tracks, windowSeconds }),
    signal,
  });
  if (!response.ok) throw new Error("recognition_failed");
  return response.json();
}

export async function analyzeSet(tracks) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tracks }),
  });
  if (!response.ok) throw new Error("analysis_failed");
  return response.json();
}

export async function saveSet(set) {
  const response = await fetch("/api/sets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ set }),
  });
  if (!response.ok) throw new Error("save_set_failed");
  return response.json();
}

export async function listSets() {
  const response = await fetch("/api/sets");
  if (!response.ok) throw new Error("list_sets_failed");
  return response.json();
}

export async function loadSet(id) {
  const response = await fetch(`/api/sets/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error("load_set_failed");
  return response.json();
}

export async function getJournal() {
  const response = await fetch("/api/journal");
  if (!response.ok) throw new Error("get_journal_failed");
  return response.json();
}

export async function saveJournal(markdown) {
  const response = await fetch("/api/journal", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ markdown }),
  });
  if (!response.ok) throw new Error("save_journal_failed");
  return response.json();
}

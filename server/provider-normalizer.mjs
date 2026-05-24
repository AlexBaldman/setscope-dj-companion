import { assertNormalizedMatch } from "./provider-schema.mjs";

export function normalizeProviderMatch(raw) {
  raw = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const title = cleanText(raw.title);
  const artist = cleanText(raw.artist);
  const confidence = normalizeConfidence(raw.confidence ?? raw.score ?? raw.matchScore ?? 0);
  const status = normalizeStatus(raw.status, { title, artist, confidence });
  return assertNormalizedMatch({
    time: raw.time || "00:00",
    title: title || "Unknown track",
    artist: artist || "Unknown artist",
    bpm: normalizeBpm(raw.bpm ?? raw.tempo),
    key: raw.key || "-",
    transition: raw.transition || "Blend",
    confidence,
    wave: clampNumber(raw.wave, 0, 100, 50),
    colors: Array.isArray(raw.colors) ? raw.colors : ["#f0ad4e", "#75d7b6", "#ec6f7e"],
    era: raw.era || "Unknown era",
    label: raw.label || "Unverified",
    source: raw.source || "Recognition provider",
    texture: raw.texture || "Open groove",
    lineage: raw.lineage || "Needs crate notes",
    why: raw.why || "Provider match needs context review.",
    provider: raw.provider || "unknown-provider",
    status,
    needsReview: "needsReview" in raw ? Boolean(raw.needsReview) : status !== "matched",
    notes: raw.notes || "Recognized from the set. Add context notes after review.",
    raw: raw.raw || raw,
  });
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value, { title, artist, confidence }) {
  if (["matched", "review", "unknown"].includes(value)) return value;
  if (!title || !artist) return "unknown";
  if (confidence >= 85) return "matched";
  return "review";
}

function normalizeConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const scaled = numeric > 0 && numeric <= 1 ? numeric * 100 : numeric;
  return Math.round(clampNumber(scaled, 0, 100, 0));
}

function normalizeBpm(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.round(clampNumber(numeric, 40, 220, 0));
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

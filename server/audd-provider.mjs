import { normalizeProviderMatch } from "./provider-normalizer.mjs";

const AUDD_ENDPOINT = "https://api.audd.io/";
const DEFAULT_RETURN_FIELDS = "apple_music,spotify";

export function isAudDConfigured(env = process.env) {
  return Boolean(getAudDToken(env));
}

export async function recognizeWithAudD({ audio, fetchImpl = fetch, env = process.env, signal } = {}) {
  const token = getAudDToken(env);
  if (!token) return null;
  if (!audio?.bytes?.byteLength) return null;

  const mimeType = audio.mimeType || "audio/webm";
  const form = new FormData();
  form.set("api_token", token);
  form.set("return", env.AUDD_RETURN || DEFAULT_RETURN_FIELDS);
  form.set("audio", new Blob([audio.bytes], { type: mimeType }), `setscope-window.${extensionForMimeType(mimeType)}`);

  const timeoutMs = normalizeTimeout(env.AUDD_TIMEOUT_MS);
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  let response;
  try {
    response = await fetchImpl(AUDD_ENDPOINT, {
      method: "POST",
      body: form,
      signal: requestSignal,
    });
  } catch (error) {
    if (timeoutSignal.aborted && !signal?.aborted) throw new Error("audd_timeout", { cause: error });
    if (signal?.aborted) throw new Error("recognition_cancelled", { cause: error });
    throw error;
  }

  if (!response.ok) {
    throw new Error(`audd_http_${response.status}`);
  }

  const payload = await response.json();
  return mapAudDResult(payload, { audio });
}

function normalizeTimeout(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1000 && parsed <= 60000 ? parsed : 10000;
}

export function mapAudDResult(payload = {}, { audio } = {}) {
  const result = payload.result;
  if (!result) {
    return normalizeProviderMatch({
      title: "",
      artist: "",
      confidence: 0,
      provider: "audd",
      status: "unknown",
      source: "AudD",
      why: "AudD did not return a track for this audio window.",
      notes: "Try a longer or cleaner capture window, then review manually.",
      raw: {
        provider: "audd",
        status: payload.status,
        error: payload.error,
      },
    });
  }

  const artist = result.artist || result.apple_music?.artistName || result.spotify?.artists?.[0]?.name;
  const title = result.title || result.apple_music?.name || result.spotify?.name;

  return normalizeProviderMatch({
    title,
    artist,
    album: result.album,
    label: result.label || result.apple_music?.recordLabel || "AudD match",
    releaseDate: result.release_date,
    source: result.song_link || "AudD",
    confidence: result.score ?? result.confidence,
    provider: "audd",
    era: inferEra(result.release_date),
    texture: "Provider match",
    lineage: buildLineage(result),
    why: "AudD matched the captured audio window against its music-recognition catalog.",
    notes: "Review BPM, transition, and crate context after recognition.",
    raw: {
      provider: "audd",
      status: payload.status,
      result,
    },
  });
}

function getAudDToken(env) {
  return env.AUDD_API_TOKEN || env.AUDD_TOKEN || "";
}

function extensionForMimeType(mimeType) {
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "m4a";
  return "webm";
}

function inferEra(releaseDate) {
  const year = Number(String(releaseDate || "").slice(0, 4));
  if (!Number.isFinite(year) || year <= 0) return "Unknown era";
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

function buildLineage(result) {
  const parts = [result.album, result.label, result.release_date].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Needs crate notes";
}

import { normalizeProviderMatch } from "./provider-normalizer.mjs";

const AUDD_ENDPOINT = "https://api.audd.io/";
const DEFAULT_RETURN_FIELDS = "apple_music,spotify";

export function isAudDConfigured(env = process.env) {
  return Boolean(getAudDToken(env));
}

export async function recognizeWithAudD({ audio, fetchImpl = fetch, env = process.env } = {}) {
  const token = getAudDToken(env);
  if (!token) return null;
  if (!audio?.dataUrl) return null;

  const file = decodeDataUrl(audio.dataUrl, audio.mimeType);
  const form = new FormData();
  form.set("api_token", token);
  form.set("return", env.AUDD_RETURN || DEFAULT_RETURN_FIELDS);
  form.set("audio", new Blob([file.buffer], { type: file.mimeType }), file.filename);

  const response = await fetchImpl(AUDD_ENDPOINT, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(`audd_http_${response.status}`);
  }

  const payload = await response.json();
  return mapAudDResult(payload, { audio });
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
    confidence: result.score ?? result.confidence ?? 92,
    provider: "audd",
    status: "matched",
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

function decodeDataUrl(dataUrl, fallbackMimeType = "audio/webm") {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) {
    throw new Error("invalid_audio_data_url");
  }
  const mimeType = match[1] || fallbackMimeType || "audio/webm";
  const isBase64 = Boolean(match[2]);
  const body = match[3] || "";
  const buffer = isBase64 ? Buffer.from(body, "base64") : Buffer.from(decodeURIComponent(body));
  return {
    buffer,
    mimeType,
    filename: `setscope-window.${extensionForMimeType(mimeType)}`,
  };
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

import { demoTracks as recognitionFixtures } from "../src/fixtures.js";
import { isAudDConfigured, recognizeWithAudD } from "./audd-provider.mjs";
import { normalizeProviderMatch } from "./provider-normalizer.mjs";

export { normalizeProviderMatch };

export function recognizeFromStub({ cursor = 0 } = {}) {
  const index = Number(cursor || 0);
  const raw = recognitionFixtures[index % recognitionFixtures.length];
  return {
    cursor: index + 1,
    detectedAt: new Date().toISOString(),
    match: normalizeProviderMatch({
      ...raw,
      confidence: Math.max(72, raw.confidence - (index % 3) * 2),
      provider: raw.provider || "setscope-stub",
      raw: {
        fixtureIndex: index % recognitionFixtures.length,
      },
    }),
  };
}

export function analyzeTracks(tracks) {
  const bpms = tracks.map((track) => Number(track.bpm)).filter(Boolean);
  return {
    trackCount: tracks.length,
    bpmRange: bpms.length ? [Math.min(...bpms), Math.max(...bpms)] : null,
    reviewCount: tracks.filter((track) => track.needsReview).length,
    recommendation:
      "Prioritize review flags, then enrich high-confidence matches with release/source lineage.",
  };
}

export async function recognizeAudioWindow({ cursor = 0, audio, metadata } = {}) {
  const audioMetadata = sanitizeAudioMetadata(audio);
  const shouldUseAudD = isAudDConfigured() && audioMetadata.hasData;
  const result = shouldUseAudD
    ? await recognizeFromConfiguredProvider({ audio, metadata, audioMetadata, cursor })
    : recognizeFromStub({ cursor });

  return {
    ...result,
    audio: audioMetadata,
    metadata: metadata || {},
    match: {
      ...result.match,
      raw: {
        ...result.match.raw,
        audio: audioMetadata,
        metadata: metadata || {},
      },
    },
  };
}

export function getRecognitionProviderLabel() {
  return isAudDConfigured() ? "audd" : "setscope-stub";
}

export function getRecognitionProviderStatus() {
  const auddConfigured = isAudDConfigured();
  const activeProvider = getRecognitionProviderLabel();
  return {
    activeProvider,
    mode: auddConfigured ? "Live web recognition" : "Local demo fallback",
    sampleSeconds: 8,
    providers: [
      {
        id: "setscope-stub",
        label: "SetScope Stub",
        configured: true,
        available: true,
        role: "Local demo",
      },
      {
        id: "audd",
        label: "AudD",
        configured: auddConfigured,
        available: auddConfigured,
        role: "Web recognition",
      },
      {
        id: "shazamkit",
        label: "ShazamKit",
        configured: false,
        available: false,
        role: "iOS native target",
      },
    ],
    native: {
      target: "ShazamKit",
      status: "Planned iOS adapter",
    },
  };
}

export function getRecognitionDiagnostics() {
  const status = getRecognitionProviderStatus();
  const audd = status.providers.find((provider) => provider.id === "audd");
  return {
    ok: true,
    activeProvider: status.activeProvider,
    checkedAt: new Date().toISOString(),
    checks: [
      {
        id: "local-api",
        label: "Local API",
        status: "pass",
        detail: "Server is responding.",
      },
      {
        id: "audd-token",
        label: "AudD token",
        status: audd?.configured ? "pass" : "warn",
        detail: audd?.configured ? "Configured in server environment." : "Add AUDD_API_TOKEN to .env for live web recognition.",
      },
      {
        id: "capture-window",
        label: "Capture window",
        status: "pass",
        detail: `${status.sampleSeconds}s browser audio windows are ready for provider submission.`,
      },
      {
        id: "ios-native",
        label: "iOS native",
        status: "planned",
        detail: `${status.native.target} adapter slot is reserved for the future iOS app.`,
      },
    ],
  };
}

function sanitizeAudioMetadata(audio = {}) {
  return {
    durationMs: Number(audio.durationMs || 0),
    mimeType: typeof audio.mimeType === "string" ? audio.mimeType : "",
    size: Number(audio.size || 0),
    hasData: typeof audio.dataUrl === "string" && audio.dataUrl.length > 0,
  };
}

async function recognizeFromConfiguredProvider({ audio, metadata, audioMetadata, cursor }) {
  try {
    const match = await recognizeWithAudD({ audio });
    if (match) {
      return {
        cursor: Number(cursor || 0) + 1,
        detectedAt: new Date().toISOString(),
        match,
      };
    }
  } catch (error) {
    return {
      cursor: Number(cursor || 0) + 1,
      detectedAt: new Date().toISOString(),
      match: normalizeProviderMatch({
        title: "",
        artist: "",
        confidence: 0,
        provider: "audd",
        status: "unknown",
        source: "AudD",
        why: "The AudD provider request failed before a usable match came back.",
        notes: "Check the AudD token, network access, and captured-audio format.",
        raw: {
          provider: "audd",
          error: error instanceof Error ? error.message : "unknown_error",
          audio: audioMetadata,
          metadata: metadata || {},
        },
      }),
    };
  }

  return recognizeFromStub({ cursor });
}

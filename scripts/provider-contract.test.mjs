import assert from "node:assert/strict";
import { isAudDConfigured, mapAudDResult } from "../server/audd-provider.mjs";
import { assertNormalizedMatch, validateNormalizedMatch } from "../server/provider-schema.mjs";
import {
  getRecognitionDiagnostics,
  getRecognitionProviderStatus,
  normalizeProviderMatch,
  recognizeAudioWindow,
} from "../server/recognition-provider.mjs";

const scoreMatch = normalizeProviderMatch({
  title: "  Clean Title ",
  artist: " Artist Name ",
  score: 0.87,
  tempo: 96.4,
  wave: 200,
  provider: "contract-test",
  raw: { providerId: "abc" },
});

assert.equal(scoreMatch.title, "Clean Title");
assert.equal(scoreMatch.artist, "Artist Name");
assert.equal(scoreMatch.confidence, 87);
assert.equal(scoreMatch.bpm, 96);
assert.equal(scoreMatch.wave, 100);
assert.equal(scoreMatch.status, "matched");
assert.equal(scoreMatch.needsReview, false);
assert.deepEqual(scoreMatch.raw, { providerId: "abc" });
assert.equal(validateNormalizedMatch(scoreMatch).valid, true);

const missingArtist = normalizeProviderMatch({
  title: "Mystery Break",
  confidence: 99,
  bpm: -20,
  provider: "contract-test",
});

assert.equal(missingArtist.artist, "Unknown artist");
assert.equal(missingArtist.bpm, 0);
assert.equal(missingArtist.status, "unknown");
assert.equal(missingArtist.needsReview, true);

const noisyNumbers = normalizeProviderMatch({
  title: "Loud Record",
  artist: "Limiter",
  confidence: 180,
  bpm: 500,
  wave: -10,
});

assert.equal(noisyNumbers.confidence, 100);
assert.equal(noisyNumbers.bpm, 220);
assert.equal(noisyNumbers.wave, 0);
assert.equal(noisyNumbers.provider, "unknown-provider");

const explicitReview = normalizeProviderMatch({
  title: "Borderline",
  artist: "Detector",
  confidence: 99,
  status: "review",
});

assert.equal(explicitReview.status, "review");
assert.equal(explicitReview.needsReview, true);

const audioResult = await recognizeAudioWindow({
  requestId: "provider_contract_001",
  cursor: 0,
  audio: {
    bytes: Buffer.from("abc123"),
    durationMs: 4000,
    mimeType: "audio/webm",
    size: 1234,
  },
  metadata: { windowSeconds: 4 },
});

assert.equal(audioResult.audio.hasData, true);
assert.equal(audioResult.audio.durationMs, 4000);
assert.equal(audioResult.match.raw.audio.hasData, true);
assert.equal(audioResult.match.raw.audio.bytes, undefined);
assert.equal(audioResult.match.raw.metadata.windowSeconds, 4);
assert.equal(audioResult.observation.requestId, "provider_contract_001");
assert.equal(audioResult.observation.schema, "setscope.recognition-observation");
assert.equal(audioResult.observation.schemaVersion, 1);
assert.equal(audioResult.observation.outcome, "matched");
assert.equal(audioResult.observation.provenance, process.env.AUDD_API_TOKEN ? "inference" : "story");
assert.equal(typeof audioResult.observation.latencyMs, "number");

assert.equal(isAudDConfigured({}), false);
assert.equal(isAudDConfigured({ AUDD_API_TOKEN: "token" }), true);

const auddMatch = mapAudDResult({
  status: "success",
  result: {
    artist: "The Test Pressings",
    title: "Needle Drop",
    album: "Contract Grooves",
    label: "Spec Records",
    release_date: "1994-04-01",
    song_link: "https://example.test/song",
  },
});

assert.equal(auddMatch.provider, "audd");
assert.equal(auddMatch.title, "Needle Drop");
assert.equal(auddMatch.artist, "The Test Pressings");
assert.equal(auddMatch.era, "1990s");
assert.equal(auddMatch.confidence, 0);
assert.equal(auddMatch.status, "review");
assert.equal(auddMatch.needsReview, true);
assert.equal(auddMatch.transition, "Unknown");
assert.equal(auddMatch.raw.result.label, "Spec Records");

const scoredAudDMatch = mapAudDResult({
  status: "success",
  result: {
    artist: "The Test Pressings",
    title: "Needle Drop",
    score: 0.91,
  },
});
assert.equal(scoredAudDMatch.confidence, 91);
assert.equal(scoredAudDMatch.status, "matched");
assert.equal(scoredAudDMatch.needsReview, false);

const auddMiss = mapAudDResult({ status: "success", result: null });

assert.equal(auddMiss.provider, "audd");
assert.equal(auddMiss.status, "unknown");
assert.equal(auddMiss.needsReview, true);
assert.equal(auddMiss.raw.dataUrl, undefined);

const providerStatus = getRecognitionProviderStatus();

assert.equal(providerStatus.activeProvider, process.env.AUDD_API_TOKEN ? "audd" : "setscope-stub");
assert.equal(providerStatus.sampleSeconds, 8);
assert.equal(providerStatus.providers.some((provider) => provider.id === "shazamkit"), true);
assert.equal(providerStatus.native.target, "ShazamKit");

const diagnostics = getRecognitionDiagnostics();

assert.equal(diagnostics.ok, true);
assert.equal(diagnostics.activeProvider, providerStatus.activeProvider);
assert.equal(diagnostics.checks.some((check) => check.id === "audd-token"), true);
assert.equal(diagnostics.checks.some((check) => check.id === "match-schema"), true);
assert.equal(diagnostics.checks.some((check) => check.status === "planned"), true);

const invalidMatch = validateNormalizedMatch({
  title: "",
  artist: "Artist",
  time: "00:00",
  provider: "bad-provider",
  status: "maybe",
  confidence: 400,
  bpm: -1,
  needsReview: "no",
  raw: null,
});

assert.equal(invalidMatch.valid, false);
assert.throws(() => assertNormalizedMatch({}), /invalid_normalized_match/);

console.log("Provider contract checks passed");

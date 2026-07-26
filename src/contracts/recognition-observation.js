export const RECOGNITION_OBSERVATION_SCHEMA = "setscope.recognition-observation";
export const RECOGNITION_OBSERVATION_VERSION = 1;

export const recognitionOutcomes = Object.freeze([
  "matched",
  "unmatched",
  "provider_error",
  "cancelled",
  "invalid",
]);

export const recognitionProvenance = Object.freeze([
  "inference",
  "story",
  "measured",
  "user",
]);

export function createRecognitionObservation(input = {}) {
  const startedAt = normalizeTimestamp(input.startedAt);
  const completedAt = normalizeTimestamp(input.completedAt || startedAt);
  const observation = {
    schema: RECOGNITION_OBSERVATION_SCHEMA,
    schemaVersion: RECOGNITION_OBSERVATION_VERSION,
    observationId: normalizeId(input.observationId),
    requestId: normalizeId(input.requestId),
    sessionId: normalizeId(input.sessionId, { allowEmpty: true }),
    outcome: recognitionOutcomes.includes(input.outcome) ? input.outcome : "invalid",
    provenance: recognitionProvenance.includes(input.provenance) ? input.provenance : "inference",
    provider: normalizeText(input.provider, "unknown-provider"),
    startedAt,
    completedAt,
    setElapsedMs: finiteNonNegative(input.setElapsedMs),
    latencyMs: finiteNonNegative(input.latencyMs),
    retryable: Boolean(input.retryable),
    audio: normalizeAudio(input.audio),
  };
  if (input.errorCode) observation.errorCode = normalizeText(input.errorCode, "recognition_failed");
  return assertRecognitionObservation(observation);
}

export function validateRecognitionObservation(observation) {
  const errors = [];
  if (observation?.schema !== RECOGNITION_OBSERVATION_SCHEMA) errors.push("invalid schema");
  if (observation?.schemaVersion !== RECOGNITION_OBSERVATION_VERSION) errors.push("invalid schemaVersion");
  if (!isId(observation?.observationId)) errors.push("invalid observationId");
  if (!isId(observation?.requestId)) errors.push("invalid requestId");
  if (observation?.sessionId && !isId(observation.sessionId)) errors.push("invalid sessionId");
  if (!recognitionOutcomes.includes(observation?.outcome)) errors.push("invalid outcome");
  if (!recognitionProvenance.includes(observation?.provenance)) errors.push("invalid provenance");
  if (typeof observation?.provider !== "string" || !observation.provider.trim()) errors.push("invalid provider");
  if (!isTimestamp(observation?.startedAt)) errors.push("invalid startedAt");
  if (!isTimestamp(observation?.completedAt)) errors.push("invalid completedAt");
  if (!isFiniteNonNegative(observation?.setElapsedMs)) errors.push("invalid setElapsedMs");
  if (!isFiniteNonNegative(observation?.latencyMs)) errors.push("invalid latencyMs");
  if (typeof observation?.retryable !== "boolean") errors.push("invalid retryable");
  if (!observation?.audio || typeof observation.audio !== "object") {
    errors.push("invalid audio");
  } else {
    if (!isFiniteNonNegative(observation.audio.durationMs)) errors.push("invalid audio.durationMs");
    if (!isFiniteNonNegative(observation.audio.size)) errors.push("invalid audio.size");
    if (typeof observation.audio.mimeType !== "string") errors.push("invalid audio.mimeType");
    if (typeof observation.audio.hasData !== "boolean") errors.push("invalid audio.hasData");
  }
  if (observation?.errorCode !== undefined && typeof observation.errorCode !== "string") errors.push("invalid errorCode");
  return { valid: errors.length === 0, errors };
}

export function assertRecognitionObservation(observation) {
  const result = validateRecognitionObservation(observation);
  if (!result.valid) throw new Error(`invalid_recognition_observation: ${result.errors.join(", ")}`);
  return observation;
}

function normalizeAudio(audio = {}) {
  return {
    durationMs: finiteNonNegative(audio.durationMs),
    mimeType: normalizeText(audio.mimeType, ""),
    size: finiteNonNegative(audio.size),
    hasData: Boolean(audio.hasData),
  };
}

function normalizeId(value, { allowEmpty = false } = {}) {
  const text = String(value || "").trim();
  if (allowEmpty && !text) return "";
  return text;
}

function normalizeText(value, fallback) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function finiteNonNegative(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
}

function normalizeTimestamp(value) {
  const parsed = new Date(value || Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function isId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,120}$/.test(value);
}

function isTimestamp(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isFiniteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

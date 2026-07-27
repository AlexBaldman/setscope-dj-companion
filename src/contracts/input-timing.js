export const INPUT_MAPPING_SCHEMA = "setscope.input-mapping";
export const INPUT_MAPPING_VERSION = 1;
export const LATENCY_PROFILE_SCHEMA = "setscope.latency-profile";
export const LATENCY_PROFILE_VERSION = 1;
export const MUSICAL_ACTION_SCHEMA = "setscope.musical-action";
export const MUSICAL_ACTION_VERSION = 1;

export function createInputMapping({
  mappingId,
  action,
  observation,
  sourceScope = "device",
  createdAt,
} = {}) {
  return {
    schema: INPUT_MAPPING_SCHEMA,
    schemaVersion: INPUT_MAPPING_VERSION,
    mappingId: String(mappingId || `mapping_${Date.now().toString(36)}`),
    action: String(action || ""),
    sourceId: sourceScope === "any" ? "*" : String(observation?.sourceId || ""),
    sourceKind: String(observation?.sourceKind || "midi"),
    gesture: createGestureSignature(observation?.message),
    createdAt: createdAt || new Date().toISOString(),
  };
}

export function normalizeInputMappings(value) {
  if (!Array.isArray(value)) return [];
  return value.map((mapping, index) => {
    if (mapping?.schema === INPUT_MAPPING_SCHEMA) return {
      ...mapping,
      gesture: { ...mapping.gesture },
    };
    return createInputMapping({
      mappingId: mapping?.mappingId || `legacy_mapping_${index + 1}`,
      action: mapping?.action,
      observation: {
        sourceId: mapping?.sourceId,
        sourceKind: mapping?.sourceKind || "midi",
        message: mapping?.message,
      },
      createdAt: mapping?.createdAt || "legacy",
    });
  }).filter((mapping) => validateInputMapping(mapping).valid);
}

export function validateInputMapping(mapping) {
  const errors = [];
  if (mapping?.schema !== INPUT_MAPPING_SCHEMA) errors.push("invalid schema");
  if (mapping?.schemaVersion !== INPUT_MAPPING_VERSION) errors.push("invalid schemaVersion");
  if (!mapping?.mappingId) errors.push("mappingId required");
  if (!mapping?.action) errors.push("action required");
  if (!mapping?.sourceId) errors.push("sourceId required");
  if (!mapping?.gesture?.type) errors.push("gesture type required");
  return { valid: errors.length === 0, errors };
}

export function mappingMatchesObservation(mapping, observation) {
  if (!validateInputMapping(mapping).valid || !observation?.message) return false;
  if (mapping.sourceId !== "*" && mapping.sourceId !== observation.sourceId) return false;
  if (mapping.sourceKind && mapping.sourceKind !== observation.sourceKind) return false;
  const signature = createGestureSignature(observation.message);
  return Object.entries(mapping.gesture).every(([key, value]) => signature[key] === value);
}

export function createLatencyProfile(input = {}) {
  return {
    schema: LATENCY_PROFILE_SCHEMA,
    schemaVersion: LATENCY_PROFILE_VERSION,
    profileId: String(input.profileId || `latency_${Date.now().toString(36)}`),
    sourceId: String(input.sourceId || "*"),
    inputLatencyMs: clamp(input.inputLatencyMs, 0, 500),
    outputLatencyMs: clamp(input.outputLatencyMs, 0, 500),
    jitterMs: clamp(input.jitterMs, 0, 500),
    sampleCount: Math.max(0, Math.floor(Number(input.sampleCount) || 0)),
    confidence: clamp(input.confidence, 0, 1),
    method: ["manual", "tap", "loopback"].includes(input.method) ? input.method : "manual",
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
}

export function validateLatencyProfile(profile) {
  const errors = [];
  if (profile?.schema !== LATENCY_PROFILE_SCHEMA) errors.push("invalid schema");
  if (profile?.schemaVersion !== LATENCY_PROFILE_VERSION) errors.push("invalid schemaVersion");
  if (!profile?.profileId) errors.push("profileId required");
  if (!profile?.sourceId) errors.push("sourceId required");
  for (const field of ["inputLatencyMs", "outputLatencyMs", "jitterMs", "confidence"]) {
    if (!Number.isFinite(profile?.[field])) errors.push(`${field} must be finite`);
  }
  return { valid: errors.length === 0, errors };
}

export function createMusicalAction({
  actionId,
  sessionId,
  action,
  observation,
  receivedAtMs,
  correctedAtMs,
  audioTimeSec = null,
  position,
  latencyProfile,
} = {}) {
  return {
    schema: MUSICAL_ACTION_SCHEMA,
    schemaVersion: MUSICAL_ACTION_VERSION,
    actionId: String(actionId || `action_${Date.now().toString(36)}`),
    sessionId: String(sessionId || observation?.sessionId || ""),
    action: String(action || ""),
    observationId: String(observation?.observationId || ""),
    sourceId: String(observation?.sourceId || ""),
    sourceKind: String(observation?.sourceKind || ""),
    sourceTimestampMs: finite(observation?.timestampMs, 0),
    receivedAtMs: finite(receivedAtMs, observation?.timestampMs || 0),
    correctedAtMs: finite(correctedAtMs, observation?.timestampMs || 0),
    audioTimeSec: Number.isFinite(Number(audioTimeSec)) ? Number(audioTimeSec) : null,
    intensity: observationIntensity(observation?.message),
    position: { ...position },
    timing: {
      inputLatencyMs: latencyProfile?.inputLatencyMs || 0,
      outputLatencyMs: latencyProfile?.outputLatencyMs || 0,
      jitterMs: latencyProfile?.jitterMs || 0,
      confidence: latencyProfile?.confidence || 0,
      method: latencyProfile?.method || "manual",
    },
    provenance: observation?.provenance || "performed",
  };
}

export function validateMusicalAction(receipt) {
  const errors = [];
  if (receipt?.schema !== MUSICAL_ACTION_SCHEMA) errors.push("invalid schema");
  if (receipt?.schemaVersion !== MUSICAL_ACTION_VERSION) errors.push("invalid schemaVersion");
  if (!receipt?.actionId) errors.push("actionId required");
  if (!receipt?.action) errors.push("action required");
  if (!receipt?.observationId) errors.push("observationId required");
  if (!receipt?.sourceId) errors.push("sourceId required");
  if (!Number.isFinite(receipt?.correctedAtMs)) errors.push("correctedAtMs must be finite");
  if (!Number.isFinite(receipt?.position?.absoluteBeat)) errors.push("musical position required");
  return { valid: errors.length === 0, errors };
}

export function createGestureSignature(message = {}) {
  const signature = { type: String(message.type || "") };
  for (const key of ["channel", "note", "controller", "program", "control", "reportId"]) {
    if (message[key] !== undefined) signature[key] = message[key];
  }
  return signature;
}

function observationIntensity(message = {}) {
  for (const key of ["velocity", "pressure", "value"]) {
    if (Number.isFinite(message[key])) return clamp(Math.abs(message[key]), 0, 1);
  }
  return 1;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, finite(value, 0)));
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

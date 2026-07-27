export const RESONANCE_EXPERIMENT_SCHEMA = "setscope.resonance-experiment";
export const RESONANCE_EXPERIMENT_VERSION = 1;
export const RESONANCE_RESULT_SCHEMA = "setscope.resonance-result";
export const RESONANCE_RESULT_VERSION = 1;

const MEDIUMS = new Set(["solid-plate", "granular-on-plate", "fluid-surface"]);
const RESULT_SOURCES = new Set(["measured", "simulated", "artistic"]);

export function createResonanceExperiment(input = {}) {
  return {
    schema: RESONANCE_EXPERIMENT_SCHEMA,
    schemaVersion: RESONANCE_EXPERIMENT_VERSION,
    experimentId: String(input.experimentId || `resonance_${Date.now().toString(36)}`),
    sessionId: String(input.sessionId || ""),
    medium: input.medium || "solid-plate",
    geometry: {
      shape: input.geometry?.shape || "square",
      widthM: finiteOrNull(input.geometry?.widthM),
      heightM: finiteOrNull(input.geometry?.heightM),
      depthM: finiteOrNull(input.geometry?.depthM),
      thicknessM: finiteOrNull(input.geometry?.thicknessM),
    },
    material: {
      name: String(input.material?.name || ""),
      densityKgM3: finiteOrNull(input.material?.densityKgM3),
      youngsModulusPa: finiteOrNull(input.material?.youngsModulusPa),
      poissonRatio: finiteOrNull(input.material?.poissonRatio),
      viscosityPaS: finiteOrNull(input.material?.viscosityPaS),
      surfaceTensionNM: finiteOrNull(input.material?.surfaceTensionNM),
    },
    boundary: {
      support: input.boundary?.support || "center-clamped",
      drivePosition: pointOrNull(input.boundary?.drivePosition),
    },
    excitation: {
      waveform: input.excitation?.waveform || "sine",
      frequencyHz: finiteOrNull(input.excitation?.frequencyHz),
      amplitude: finiteOrNull(input.excitation?.amplitude),
      amplitudeUnit: input.excitation?.amplitudeUnit || "normalized",
      durationMs: finiteOrNull(input.excitation?.durationMs),
    },
    requestedOutputs: Array.isArray(input.requestedOutputs) ? [...new Set(input.requestedOutputs.map(String))] : ["mode-shape"],
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

export function validateResonanceExperiment(experiment) {
  const errors = [];
  if (experiment?.schema !== RESONANCE_EXPERIMENT_SCHEMA) errors.push("invalid schema");
  if (experiment?.schemaVersion !== RESONANCE_EXPERIMENT_VERSION) errors.push("invalid schemaVersion");
  if (!experiment?.experimentId) errors.push("experimentId required");
  if (!MEDIUMS.has(experiment?.medium)) errors.push("invalid medium");
  if (!experiment?.geometry?.shape) errors.push("geometry shape required");
  if (!Number.isFinite(experiment?.excitation?.frequencyHz) || experiment.excitation.frequencyHz <= 0) errors.push("positive excitation frequency required");
  if (!Array.isArray(experiment?.requestedOutputs) || !experiment.requestedOutputs.length) errors.push("requestedOutputs required");
  return { valid: errors.length === 0, errors };
}

export function createResonanceResult(input = {}) {
  return {
    schema: RESONANCE_RESULT_SCHEMA,
    schemaVersion: RESONANCE_RESULT_VERSION,
    resultId: String(input.resultId || `resonance_result_${Date.now().toString(36)}`),
    experimentId: String(input.experimentId || ""),
    source: input.source || "simulated",
    model: {
      name: String(input.model?.name || ""),
      version: String(input.model?.version || ""),
      assumptions: Array.isArray(input.model?.assumptions) ? input.model.assumptions.map(String) : [],
    },
    resonancesHz: numericList(input.resonancesHz),
    observedFrequencyHz: finiteOrNull(input.observedFrequencyHz),
    confidence: clamp01(input.confidence),
    artifacts: Array.isArray(input.artifacts) ? input.artifacts.map(normalizeArtifact) : [],
    metrics: input.metrics && typeof input.metrics === "object" ? { ...input.metrics } : {},
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

export function validateResonanceResult(result) {
  const errors = [];
  if (result?.schema !== RESONANCE_RESULT_SCHEMA) errors.push("invalid schema");
  if (result?.schemaVersion !== RESONANCE_RESULT_VERSION) errors.push("invalid schemaVersion");
  if (!result?.resultId) errors.push("resultId required");
  if (!result?.experimentId) errors.push("experimentId required");
  if (!RESULT_SOURCES.has(result?.source)) errors.push("invalid source");
  if (!Array.isArray(result?.artifacts)) errors.push("artifacts must be an array");
  if (result?.source === "simulated" && !result?.model?.name) errors.push("simulated results require a model name");
  return { valid: errors.length === 0, errors };
}

function normalizeArtifact(artifact) {
  return {
    kind: String(artifact?.kind || "image"),
    uri: String(artifact?.uri || ""),
    mediaType: String(artifact?.mediaType || ""),
    label: String(artifact?.label || ""),
  };
}

function numericList(values) {
  return Array.isArray(values) ? values.map(Number).filter(Number.isFinite) : [];
}

function pointOrNull(point) {
  if (!point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) return null;
  return { x: Number(point.x), y: Number(point.y) };
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp01(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : null;
}

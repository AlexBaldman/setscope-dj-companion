export const PERFORMANCE_EVENT_V2 = "setscope.performance-event.v2";
export const QUARANTINED_METADATA_V1 = "setscope.quarantined-metadata.v1";

const PERFORMANCE_STATUSES = new Set(["complete", "incomplete", "abandoned", "error"]);
const CALIBRATION_STATUSES = new Set(["unknown", "not-required", "calibrated", "degraded"]);
const ASSISTANCE_LEVELS = new Set(["none", "hint", "guided", "demo"]);

export function createPerformanceEventV2({
  modeId,
  status = "complete",
  score = 0,
  streak = 0,
  sourceLabel = "none",
  trackId = "",
  time = "--:--",
  details = {},
  evidence = {},
  inference = {},
  assistance = {},
  calibration = {},
  createdAt = new Date().toISOString(),
} = {}) {
  const normalizedSource = textOr(sourceLabel, "none");
  const assistanceLevel = assistance.level || (normalizedSource.toLowerCase() === "demo" ? "demo" : "none");
  const normalizedScore = finiteOr(score, 0);
  const normalizedStreak = finiteOr(streak, 0);

  return {
    schemaVersion: PERFORMANCE_EVENT_V2,
    kind: "performance",
    modeId: textOr(modeId, "unknown-mode"),
    status: PERFORMANCE_STATUSES.has(status) ? status : "complete",
    score: normalizedScore,
    streak: normalizedStreak,
    sourceLabel: normalizedSource,
    trackId: textOr(trackId, ""),
    time: textOr(time, "--:--"),
    details: plainObject(details),
    evidence: {
      ...plainObject(evidence),
      summary: textOr(evidence.summary, ""),
    },
    observation: {
      sourceLabel: normalizedSource,
      trackContext: {
        trackId: textOr(trackId, ""),
        time: textOr(time, "--:--"),
      },
      capturedAt: textOr(createdAt, new Date().toISOString()),
    },
    inference: {
      confidence: finiteOrNull(inference.confidence),
      analyzerVersion: textOr(inference.analyzerVersion, "unknown"),
      values: plainObject(inference.values),
    },
    result: {
      score: normalizedScore,
      streak: normalizedStreak,
      values: plainObject(details),
    },
    assistance: {
      level: ASSISTANCE_LEVELS.has(assistanceLevel) ? assistanceLevel : "none",
      eligibleForMastery:
        typeof assistance.eligibleForMastery === "boolean"
          ? assistance.eligibleForMastery
          : false,
      values: plainObject(assistance.values),
    },
    calibration: {
      status: CALIBRATION_STATUSES.has(calibration.status) ? calibration.status : "unknown",
      values: plainObject(calibration.values),
    },
    createdAt: textOr(createdAt, new Date().toISOString()),
  };
}

export function validatePerformanceEventV2(event) {
  const errors = [];
  if (!isPlainObject(event)) return { valid: false, errors: ["event must be an object"] };
  if (event.schemaVersion !== PERFORMANCE_EVENT_V2) errors.push(`schemaVersion must be ${PERFORMANCE_EVENT_V2}`);
  if (event.kind !== "performance") errors.push("kind must be performance");
  requireText(event, "modeId", errors);
  if (!PERFORMANCE_STATUSES.has(event.status)) errors.push("status is not supported");
  requireFinite(event, "score", errors);
  requireFinite(event, "streak", errors);
  requireText(event, "sourceLabel", errors);
  requireText(event, "time", errors);
  requireIsoDate(event, "createdAt", errors);
  requireObject(event, "details", errors);
  requireObject(event, "evidence", errors);
  requireObject(event, "observation", errors);
  requireObject(event, "inference", errors);
  requireObject(event, "result", errors);
  requireObject(event, "assistance", errors);
  requireObject(event, "calibration", errors);

  if (isPlainObject(event.observation)) {
    requireText(event.observation, "sourceLabel", errors, "observation.");
    requireIsoDate(event.observation, "capturedAt", errors, "observation.");
    requireObject(event.observation, "trackContext", errors, "observation.");
  }
  if (isPlainObject(event.result)) {
    requireFinite(event.result, "score", errors, "result.");
    requireFinite(event.result, "streak", errors, "result.");
  }
  if (isPlainObject(event.assistance)) {
    if (!ASSISTANCE_LEVELS.has(event.assistance.level)) errors.push("assistance.level is not supported");
    if (typeof event.assistance.eligibleForMastery !== "boolean") {
      errors.push("assistance.eligibleForMastery must be boolean");
    }
  }
  if (isPlainObject(event.calibration) && !CALIBRATION_STATUSES.has(event.calibration.status)) {
    errors.push("calibration.status is not supported");
  }
  return { valid: errors.length === 0, errors };
}

export function assertPerformanceEventV2(event) {
  const result = validatePerformanceEventV2(event);
  if (!result.valid) throw new Error(`invalid_performance_event_v2: ${result.errors.join("; ")}`);
  return event;
}

export function quarantineMetadata(metadata, errors) {
  return {
    schemaVersion: QUARANTINED_METADATA_V1,
    kind: "quarantined",
    originalSchemaVersion: textOr(metadata?.schemaVersion, "unversioned"),
    errors: Array.isArray(errors) ? errors.map(String) : [String(errors || "invalid metadata")],
    receivedAt: new Date().toISOString(),
  };
}

function finiteOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function textOr(value, fallback) {
  return typeof value === "string" ? value : fallback;
}

function plainObject(value) {
  return isPlainObject(value) ? { ...value } : {};
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireText(object, field, errors, prefix = "") {
  if (typeof object[field] !== "string" || object[field].trim() === "") errors.push(`${prefix}${field} must be non-empty text`);
}

function requireFinite(object, field, errors, prefix = "") {
  if (!Number.isFinite(object[field])) errors.push(`${prefix}${field} must be finite`);
}

function requireObject(object, field, errors, prefix = "") {
  if (!isPlainObject(object[field])) errors.push(`${prefix}${field} must be an object`);
}

function requireIsoDate(object, field, errors, prefix = "") {
  if (typeof object[field] !== "string" || !Number.isFinite(Date.parse(object[field]))) {
    errors.push(`${prefix}${field} must be an ISO date`);
  }
}

export const MUSICIAN_PROFILE_SCHEMA = "setscope.musician-profile";
export const MUSICIAN_PROFILE_VERSION = 3;

export function createMusicianProfile(input = {}) {
  const centerMidi = clampFinite(input.centerMidi, 48, 36, 76);
  const lowMidi = clampFinite(input.lowMidi, centerMidi - 5, 24, centerMidi);
  const highMidi = clampFinite(input.highMidi, centerMidi + 5, centerMidi, 88);
  const profile = {
    schema: MUSICIAN_PROFILE_SCHEMA,
    schemaVersion: MUSICIAN_PROFILE_VERSION,
    profileId: normalizeId(input.profileId || "musician_local_001"),
    revision: Math.max(1, Math.round(Number(input.revision) || 1)),
    centerMidi,
    lowMidi,
    highMidi,
    detector: {
      stability: clampFinite(input.detector?.stability, 0.7, 0, 1),
      clarityFloor: clampFinite(input.detector?.clarityFloor, 0.58, 0.4, 0.98),
    },
    calibration: {
      status: input.calibration?.status === "calibrated" ? "calibrated" : "needed",
      sourceLabel: normalizeText(input.calibration?.sourceLabel, ""),
      sampleCount: finiteNonNegative(input.calibration?.sampleCount),
      meanClarity: clampFinite(input.calibration?.meanClarity, 0, 0, 1),
      updatedAt: normalizeTimestamp(input.calibration?.updatedAt),
      method: input.calibration?.method === "stable-center" ? "stable-center" : "none",
      rangeStatus: input.calibration?.rangeStatus === "confirmed" ? "confirmed" : "estimated",
      boundaries: {
        low: normalizeBoundary(input.calibration?.boundaries?.low, lowMidi),
        high: normalizeBoundary(input.calibration?.boundaries?.high, highMidi),
      },
    },
    practice: {
      sessions: finiteNonNegative(input.practice?.sessions),
      stableLocks: finiteNonNegative(input.practice?.stableLocks),
      lastAccuracy: input.practice?.lastAccuracy === null || input.practice?.lastAccuracy === undefined
        ? null
        : clampFinite(input.practice.lastAccuracy, 0, 0, 100),
      lastMode: normalizeText(input.practice?.lastMode, ""),
      lastPracticedAt: normalizeTimestamp(input.practice?.lastPracticedAt),
      lastDiagnosis: normalizeDiagnosis(input.practice?.lastDiagnosis),
      intervalHistory: normalizeIntervalHistory(input.practice?.intervalHistory),
    },
  };
  return assertMusicianProfile(profile);
}

export function validateMusicianProfile(profile) {
  const errors = [];
  if (profile?.schema !== MUSICIAN_PROFILE_SCHEMA) errors.push("invalid schema");
  if (profile?.schemaVersion !== MUSICIAN_PROFILE_VERSION) errors.push("invalid schemaVersion");
  if (typeof profile?.profileId !== "string" || profile.profileId.length < 8) errors.push("invalid profileId");
  if (!Number.isInteger(profile?.revision) || profile.revision < 1) errors.push("invalid revision");
  if (!isMidi(profile?.centerMidi) || !isMidi(profile?.lowMidi) || !isMidi(profile?.highMidi)) errors.push("invalid MIDI range");
  if (profile?.lowMidi > profile?.centerMidi || profile?.centerMidi > profile?.highMidi) errors.push("unordered MIDI range");
  if (!inRange(profile?.detector?.stability, 0, 1)) errors.push("invalid detector.stability");
  if (!inRange(profile?.detector?.clarityFloor, 0.4, 0.98)) errors.push("invalid detector.clarityFloor");
  if (!["needed", "calibrated"].includes(profile?.calibration?.status)) errors.push("invalid calibration.status");
  if (!["none", "stable-center"].includes(profile?.calibration?.method)) errors.push("invalid calibration.method");
  if (!["estimated", "confirmed"].includes(profile?.calibration?.rangeStatus)) errors.push("invalid calibration.rangeStatus");
  if (!isBoundary(profile?.calibration?.boundaries?.low) || !isBoundary(profile?.calibration?.boundaries?.high)) errors.push("invalid calibration boundaries");
  if (profile?.calibration?.rangeStatus === "confirmed"
    && (!profile.calibration.boundaries.low.confirmed || !profile.calibration.boundaries.high.confirmed)) {
    errors.push("confirmed range requires both boundaries");
  }
  if (!Number.isFinite(profile?.practice?.sessions) || profile.practice.sessions < 0) errors.push("invalid practice.sessions");
  if (!isIntervalHistory(profile?.practice?.intervalHistory)) errors.push("invalid practice.intervalHistory");
  return { valid: errors.length === 0, errors };
}

export function assertMusicianProfile(profile) {
  const result = validateMusicianProfile(profile);
  if (!result.valid) throw new Error(`invalid_musician_profile: ${result.errors.join(", ")}`);
  return profile;
}

function normalizeId(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

function normalizeText(value, fallback) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function normalizeTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeBoundary(boundary = {}, fallbackMidi) {
  const legacyBoundary = boundary.confirmationCount === undefined && !Array.isArray(boundary.samples);
  const legacyCount = legacyBoundary && boundary.confirmed ? 2 : 0;
  const samples = Array.isArray(boundary.samples)
    ? boundary.samples.map(normalizeBoundarySample).filter(Boolean).slice(-5)
    : [];
  const confirmationCount = Math.max(samples.length, finiteNonNegative(boundary.confirmationCount) || legacyCount);
  return {
    confirmed: Boolean(boundary.confirmed),
    midi: clampFinite(boundary.midi, fallbackMidi, 0, 127),
    clarity: clampFinite(boundary.clarity, 0, 0, 1),
    confidence: clampFinite(boundary.confidence, confirmationCount >= 2 ? 0.75 : confirmationCount ? 0.4 : 0, 0, 1),
    confirmationCount,
    samples,
    updatedAt: normalizeTimestamp(boundary.updatedAt),
  };
}

function normalizeBoundarySample(sample) {
  if (!Number.isFinite(Number(sample?.midi)) || !Number.isFinite(Number(sample?.clarity))) return null;
  return {
    midi: clampFinite(sample.midi, 0, 0, 127),
    clarity: clampFinite(sample.clarity, 0, 0, 1),
    capturedAt: normalizeTimestamp(sample.capturedAt),
  };
}

function normalizeIntervalHistory(history) {
  if (!history || typeof history !== "object" || Array.isArray(history)) return {};
  return Object.fromEntries(
    Object.entries(history)
      .map(([key, value]) => [normalizeIntervalKey(key), normalizeIntervalStat(value)])
      .filter(([key]) => key !== null),
  );
}

function normalizeIntervalKey(key) {
  const interval = Number(key);
  return Number.isInteger(interval) && interval >= -12 && interval <= 12 ? String(interval) : null;
}

function normalizeIntervalStat(value = {}) {
  const attempts = finiteNonNegative(value.attempts);
  const hits = Math.min(attempts, finiteNonNegative(value.hits));
  const near = Math.min(attempts - hits, finiteNonNegative(value.near));
  const misses = Math.max(0, attempts - hits - near);
  return {
    attempts,
    hits,
    near,
    misses,
    meanAbsCents: clampFinite(value.meanAbsCents, 0, 0, 2400),
    biasCents: clampFinite(value.biasCents, 0, -2400, 2400),
    streak: finiteNonNegative(value.streak),
    bestStreak: finiteNonNegative(value.bestStreak),
    lastPracticedAt: normalizeTimestamp(value.lastPracticedAt),
  };
}

function normalizeDiagnosis(diagnosis = {}) {
  return {
    code: ["high", "low", "mixed", "silent", "centered"].includes(diagnosis.code) ? diagnosis.code : "",
    biasCents: Number.isFinite(Number(diagnosis.biasCents)) ? Math.round(Number(diagnosis.biasCents)) : 0,
    detail: normalizeText(diagnosis.detail, ""),
  };
}

function finiteNonNegative(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
}

function clampFinite(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  return Math.max(minimum, Math.min(maximum, Number.isFinite(parsed) ? parsed : fallback));
}

function isMidi(value) {
  return Number.isFinite(value) && value >= 0 && value <= 127;
}

function inRange(value, minimum, maximum) {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function isBoundary(boundary) {
  return Boolean(boundary)
    && typeof boundary.confirmed === "boolean"
    && isMidi(boundary.midi)
    && inRange(boundary.clarity, 0, 1)
    && inRange(boundary.confidence, 0, 1)
    && Number.isInteger(boundary.confirmationCount)
    && Array.isArray(boundary.samples);
}

function isIntervalHistory(history) {
  return Boolean(history)
    && typeof history === "object"
    && !Array.isArray(history)
    && Object.entries(history).every(([key, value]) => normalizeIntervalKey(key) !== null
      && Number.isInteger(value.attempts)
      && value.attempts >= 0
      && value.hits + value.near + value.misses === value.attempts
      && Number.isFinite(value.meanAbsCents)
      && Number.isFinite(value.biasCents));
}

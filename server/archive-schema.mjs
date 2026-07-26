import { migrateSetDraft, validateSetDraft } from "../src/contracts/set-draft.js";

export class ArchiveValidationError extends Error {
  constructor(issues) {
    super("invalid_set");
    this.name = "ArchiveValidationError";
    this.statusCode = 422;
    this.code = "invalid_set";
    this.details = { issues };
  }
}

export function normalizeArchiveSet(input) {
  const issues = validateArchiveEnvelope(input);
  if (issues.length) throw new ArchiveValidationError(issues);

  const draft = migrateSetDraft(input);
  const draftValidation = validateSetDraft(draft);
  if (!draftValidation.ok) throw new ArchiveValidationError(draftValidation.errors);

  return {
    ...draft,
    id: optionalText(input.id, 160) || null,
    name: optionalText(input.name, 240) || "Untitled set",
    exportedAt: optionalText(input.exportedAt, 80) || null,
    summary: normalizeSummary(input.summary),
  };
}

function validateArchiveEnvelope(input) {
  const issues = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) return ["set must be an object"];
  if (!Array.isArray(input.tracks)) issues.push("tracks must be an array");
  if (Array.isArray(input.tracks) && input.tracks.length > 5000) issues.push("tracks exceeds 5000 items");
  if (Array.isArray(input.audioEvents) && input.audioEvents.length > 10000) issues.push("audioEvents exceeds 10000 items");
  if (Array.isArray(input.captureLog) && input.captureLog.length > 10000) issues.push("captureLog exceeds 10000 items");
  validateObjectItems(input.tracks, "tracks", issues);
  validateObjectItems(input.audioEvents, "audioEvents", issues);
  validateObjectItems(input.captureLog, "captureLog", issues);
  if (input.id != null && typeof input.id !== "string") issues.push("id must be a string");
  if (input.name != null && typeof input.name !== "string") issues.push("name must be a string");
  if (typeof input.id === "string" && input.id.length > 160) issues.push("id exceeds 160 characters");
  if (typeof input.name === "string" && input.name.length > 240) issues.push("name exceeds 240 characters");
  return issues;
}

function validateObjectItems(items, field, issues) {
  if (!Array.isArray(items)) return;
  if (items.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    issues.push(`${field} must contain objects`);
  }
}

function normalizeSummary(summary) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return {};
  return {
    bpmRange: optionalText(summary.bpmRange, 80),
    reviewCount: finiteNonNegative(summary.reviewCount),
    dominantEra: optionalText(summary.dominantEra, 160),
    dominantMove: optionalText(summary.dominantMove, 160),
  };
}

function optionalText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function finiteNonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

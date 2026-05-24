const MATCH_STATUSES = new Set(["matched", "review", "unknown"]);

export function validateNormalizedMatch(match) {
  const errors = [];
  if (!match || typeof match !== "object" || Array.isArray(match)) {
    return { valid: false, errors: ["match must be an object"] };
  }
  requireText(match, "time", errors);
  requireText(match, "title", errors);
  requireText(match, "artist", errors);
  requireText(match, "provider", errors);
  if (!MATCH_STATUSES.has(match.status)) {
    errors.push("status must be matched, review, or unknown");
  }
  if (!Number.isFinite(match.confidence) || match.confidence < 0 || match.confidence > 100) {
    errors.push("confidence must be from 0 to 100");
  }
  if (!Number.isFinite(match.bpm) || (match.bpm !== 0 && (match.bpm < 40 || match.bpm > 220))) {
    errors.push("bpm must be 0 or from 40 to 220");
  }
  if (typeof match.needsReview !== "boolean") {
    errors.push("needsReview must be boolean");
  }
  if (!match.raw || typeof match.raw !== "object" || Array.isArray(match.raw)) {
    errors.push("raw must be an object");
  }
  return { valid: errors.length === 0, errors };
}

export function assertNormalizedMatch(match) {
  const result = validateNormalizedMatch(match);
  if (!result.valid) {
    throw new Error(`invalid_normalized_match: ${result.errors.join("; ")}`);
  }
  return match;
}

function requireText(object, field, errors) {
  if (typeof object[field] !== "string" || object[field].trim() === "") {
    errors.push(`${field} must be non-empty text`);
  }
}

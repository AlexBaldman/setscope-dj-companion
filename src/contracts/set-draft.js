export const SET_DRAFT_SCHEMA = "setscope.set-draft";
export const SET_DRAFT_VERSION = 2;

export function migrateSetDraft(input = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  return {
    schema: SET_DRAFT_SCHEMA,
    schemaVersion: SET_DRAFT_VERSION,
    skin: typeof source.skin === "string" && source.skin ? source.skin : "vinyl",
    recognitionSessionId: typeof source.recognitionSessionId === "string" && source.recognitionSessionId ? source.recognitionSessionId : "",
    recognitionStartedAt: typeof source.recognitionStartedAt === "string" && source.recognitionStartedAt ? source.recognitionStartedAt : "",
    recognitionCursor: finiteNonNegative(source.recognitionCursor),
    archiveId: typeof source.archiveId === "string" && source.archiveId ? source.archiveId : null,
    captureLog: cloneArray(source.captureLog),
    audioEvents: cloneArray(source.audioEvents),
    practiceMissions: cloneArray(source.practiceMissions),
    tracks: cloneArray(source.tracks),
  };
}

export function serializeSetDraft(input) {
  return migrateSetDraft(input);
}

export function validateSetDraft(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) errors.push("draft must be an object");
  if (input?.schema !== SET_DRAFT_SCHEMA) errors.push("unknown draft schema");
  if (input?.schemaVersion !== SET_DRAFT_VERSION) errors.push("unsupported draft version");
  if (!Array.isArray(input?.tracks)) errors.push("tracks must be an array");
  if (!Array.isArray(input?.captureLog)) errors.push("captureLog must be an array");
  if (!Array.isArray(input?.audioEvents)) errors.push("audioEvents must be an array");
  if (!Array.isArray(input?.practiceMissions)) errors.push("practiceMissions must be an array");
  if (typeof input?.recognitionSessionId !== "string") errors.push("recognitionSessionId must be text");
  if (typeof input?.recognitionStartedAt !== "string") errors.push("recognitionStartedAt must be text");
  return { ok: errors.length === 0, errors };
}

function cloneArray(value) {
  return Array.isArray(value) ? structuredClone(value) : [];
}

function finiteNonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

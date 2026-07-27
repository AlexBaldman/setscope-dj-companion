export const PENDING_COMPLETION_STORAGE_KEY = "setscope-pending-completion-v1";

export function commitCompletion(
  completion,
  {
    storage = globalThis.localStorage,
    commitDraft,
    commitSkill,
  } = {},
) {
  assertDependencies(storage, commitDraft, commitSkill);
  if (storage.getItem(PENDING_COMPLETION_STORAGE_KEY)) {
    recoverPendingCompletion({ storage, commitDraft, commitSkill });
  }
  const pending = normalizeCompletion(completion);
  storage.setItem(PENDING_COMPLETION_STORAGE_KEY, JSON.stringify(pending));
  return applyPendingCompletion(pending, { storage, commitDraft, commitSkill });
}

export function recoverPendingCompletion({
  storage = globalThis.localStorage,
  commitDraft,
  commitSkill,
} = {}) {
  assertDependencies(storage, commitDraft, commitSkill);
  const raw = storage.getItem(PENDING_COMPLETION_STORAGE_KEY);
  if (!raw) return null;
  let pending;
  try {
    pending = normalizeCompletion(JSON.parse(raw));
  } catch (error) {
    clearPending(storage);
    throw new Error(`invalid_pending_completion:${error.message}`);
  }
  return applyPendingCompletion(pending, { storage, commitDraft, commitSkill });
}

function applyPendingCompletion(pending, { storage, commitDraft, commitSkill }) {
  const savedEvent = commitDraft(pending.audioEvent, pending.missionId, storage);
  commitSkill(pending.metadata, pending.audioEvent.id, storage);
  clearPending(storage);
  return savedEvent;
}

function normalizeCompletion(value = {}) {
  if (!value.audioEvent?.id || !value.metadata?.modeId) {
    throw new Error("completion_commit_fields_required");
  }
  return {
    schema: "setscope.completion-commit",
    schemaVersion: 1,
    commitId: String(value.commitId || value.audioEvent.id),
    missionId: String(value.missionId || ""),
    audioEvent: structuredClone(value.audioEvent),
    metadata: structuredClone(value.metadata),
    createdAt: String(value.createdAt || new Date().toISOString()),
  };
}

function clearPending(storage) {
  if (typeof storage.removeItem === "function") storage.removeItem(PENDING_COMPLETION_STORAGE_KEY);
  else storage.setItem(PENDING_COMPLETION_STORAGE_KEY, "");
}

function assertDependencies(storage, commitDraft, commitSkill) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
    throw new Error("completion_storage_required");
  }
  if (typeof commitDraft !== "function" || typeof commitSkill !== "function") {
    throw new Error("completion_commit_dependencies_required");
  }
}

import { existsSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { createSetScopeDatabase, resolveDataDirectory } from "./database.mjs";
import { HttpRequestError } from "./json.mjs";

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{8,100}$/;

export function createRecognitionStore(root, { maxEntries = 500, database: sharedDatabase } = {}) {
  const dataDirectory = resolveDataDirectory(root);
  const ownsDatabase = !sharedDatabase;
  const database = sharedDatabase || createSetScopeDatabase(root);
  database.exec(`
    CREATE TABLE IF NOT EXISTS recognition_transactions (
      request_id TEXT PRIMARY KEY,
      committed_at TEXT NOT NULL,
      value_json TEXT NOT NULL
    )
  `);
  migrateJsonLedger(database, dataDirectory);

  const pending = new Map();
  const findStatement = database.prepare("SELECT value_json FROM recognition_transactions WHERE request_id = ?");
  const insertStatement = database.prepare("INSERT OR IGNORE INTO recognition_transactions (request_id, committed_at, value_json) VALUES (?, ?, ?)");
  const pruneStatement = database.prepare(`
    DELETE FROM recognition_transactions
    WHERE request_id NOT IN (
      SELECT request_id FROM recognition_transactions ORDER BY committed_at DESC, rowid DESC LIMIT ?
    )
  `);

  async function execute(requestId, operation) {
    assertRequestId(requestId);
    if (pending.has(requestId)) return pending.get(requestId);
    const task = executeUnlocked(requestId, operation);
    pending.set(requestId, task);
    try {
      return await task;
    } finally {
      pending.delete(requestId);
    }
  }

  async function executeUnlocked(requestId, operation) {
    const existing = find(requestId);
    if (existing) return { value: existing, replayed: true };
    const value = await operation();
    database.exec("BEGIN IMMEDIATE");
    try {
      const inserted = insertStatement.run(requestId, new Date().toISOString(), JSON.stringify(value));
      pruneStatement.run(Math.max(1, Number(maxEntries) || 500));
      database.exec("COMMIT");
      if (inserted.changes) return { value, replayed: false };
      return { value: find(requestId), replayed: true };
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  function find(requestId) {
    const row = findStatement.get(requestId);
    return row ? JSON.parse(row.value_json) : null;
  }

  return {
    execute,
    close: () => {
      if (ownsDatabase) database.close();
    },
    count: () => Number(database.prepare("SELECT COUNT(*) AS count FROM recognition_transactions").get().count),
  };
}

function migrateJsonLedger(database, dataDirectory) {
  const legacyPath = join(dataDirectory, "recognition-transactions.json");
  if (!existsSync(legacyPath)) return;
  const parsed = JSON.parse(readFileSync(legacyPath, "utf8"));
  const insert = database.prepare("INSERT OR IGNORE INTO recognition_transactions (request_id, committed_at, value_json) VALUES (?, ?, ?)");
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const entry of Array.isArray(parsed.entries) ? parsed.entries : []) {
      if (!REQUEST_ID_PATTERN.test(entry?.requestId || "")) continue;
      insert.run(entry.requestId, entry.committedAt || new Date().toISOString(), JSON.stringify(entry.value));
    }
    database.exec("COMMIT");
    renameSync(legacyPath, `${legacyPath}.migrated`);
  } catch (error) {
    database.exec("ROLLBACK");
    throw new Error("recognition_store_migration_failed", { cause: error });
  }
}

export function assertRequestId(requestId) {
  if (typeof requestId !== "string" || !REQUEST_ID_PATTERN.test(requestId)) {
    throw new HttpRequestError(400, "invalid_request_id");
  }
  return requestId;
}

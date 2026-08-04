import { existsSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { createSetScopeDatabase, resolveDataDirectory } from "./database.mjs";
import { HttpRequestError } from "./json.mjs";

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{8,100}$/;

export function createRecognitionStore(root, { maxEntries = 500, database: sharedDatabase } = {}) {
  const dataDirectory = resolveDataDirectory(root);
  const ownsDatabase = !sharedDatabase;
  const database = sharedDatabase || createSetScopeDatabase(root);
  migrateRecognitionTable(database);
  migrateJsonLedger(database, dataDirectory);

  const pending = new Map();
  const findStatement = database.prepare("SELECT value_json FROM recognition_transactions WHERE owner_id = ? AND request_id = ?");
  const insertStatement = database.prepare("INSERT OR IGNORE INTO recognition_transactions (owner_id, request_id, committed_at, value_json) VALUES (?, ?, ?, ?)");
  const pruneStatement = database.prepare(`
    DELETE FROM recognition_transactions
    WHERE rowid NOT IN (
      SELECT rowid FROM recognition_transactions ORDER BY committed_at DESC, rowid DESC LIMIT ?
    )
  `);

  async function execute(requestId, operation, ownerId = "local") {
    assertRequestId(requestId);
    const normalizedOwnerId = assertOwnerId(ownerId);
    const pendingKey = `${normalizedOwnerId}\0${requestId}`;
    if (pending.has(pendingKey)) return pending.get(pendingKey);
    const task = executeUnlocked(normalizedOwnerId, requestId, operation);
    pending.set(pendingKey, task);
    try {
      return await task;
    } finally {
      pending.delete(pendingKey);
    }
  }

  async function executeUnlocked(ownerId, requestId, operation) {
    const existing = find(ownerId, requestId);
    if (existing) return { value: existing, replayed: true };
    const value = await operation();
    database.exec("BEGIN IMMEDIATE");
    try {
      const inserted = insertStatement.run(ownerId, requestId, new Date().toISOString(), JSON.stringify(value));
      pruneStatement.run(Math.max(1, Number(maxEntries) || 500));
      database.exec("COMMIT");
      if (inserted.changes) return { value, replayed: false };
      return { value: find(ownerId, requestId), replayed: true };
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  function find(ownerId, requestId) {
    const row = findStatement.get(ownerId, requestId);
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
  const insert = database.prepare("INSERT OR IGNORE INTO recognition_transactions (owner_id, request_id, committed_at, value_json) VALUES (?, ?, ?, ?)");
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const entry of Array.isArray(parsed.entries) ? parsed.entries : []) {
      if (!REQUEST_ID_PATTERN.test(entry?.requestId || "")) continue;
      insert.run("local", entry.requestId, entry.committedAt || new Date().toISOString(), JSON.stringify(entry.value));
    }
    database.exec("COMMIT");
    renameSync(legacyPath, `${legacyPath}.migrated`);
  } catch (error) {
    database.exec("ROLLBACK");
    throw new Error("recognition_store_migration_failed", { cause: error });
  }
}

function migrateRecognitionTable(database) {
  const existing = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'recognition_transactions'").get();
  if (!existing) {
    createRecognitionTable(database);
    return;
  }
  const columns = database.prepare("PRAGMA table_info(recognition_transactions)").all();
  if (columns.some((column) => column.name === "owner_id")) return;
  database.exec("BEGIN IMMEDIATE");
  try {
    database.exec("ALTER TABLE recognition_transactions RENAME TO recognition_transactions_legacy_ownerless");
    createRecognitionTable(database);
    database.exec(`
      INSERT INTO recognition_transactions (owner_id, request_id, committed_at, value_json)
      SELECT 'local', request_id, committed_at, value_json
      FROM recognition_transactions_legacy_ownerless
    `);
    database.exec("DROP TABLE recognition_transactions_legacy_ownerless");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw new Error("recognition_owner_migration_failed", { cause: error });
  }
}

function createRecognitionTable(database) {
  database.exec(`
    CREATE TABLE recognition_transactions (
      owner_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      committed_at TEXT NOT NULL,
      value_json TEXT NOT NULL,
      PRIMARY KEY (owner_id, request_id)
    )
  `);
}

export function assertRequestId(requestId) {
  if (typeof requestId !== "string" || !REQUEST_ID_PATTERN.test(requestId)) {
    throw new HttpRequestError(400, "invalid_request_id");
  }
  return requestId;
}

function assertOwnerId(ownerId) {
  const value = String(ownerId || "");
  if (!value || value.length > 200 || /[\0\r\n]/.test(value)) {
    throw new HttpRequestError(400, "invalid_owner_id");
  }
  return value;
}

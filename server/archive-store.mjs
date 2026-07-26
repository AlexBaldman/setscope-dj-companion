import { existsSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { normalizeArchiveSet } from "./archive-schema.mjs";
import { createSetScopeDatabase, resolveDataDirectory } from "./database.mjs";

export function createArchiveStore(root, { database: sharedDatabase } = {}) {
  const dataDirectory = resolveDataDirectory(root);
  const ownsDatabase = !sharedDatabase;
  const database = sharedDatabase || createSetScopeDatabase(root);
  database.exec(`
    CREATE TABLE IF NOT EXISTS archived_sets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      saved_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      track_count INTEGER NOT NULL,
      set_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS archived_sets_updated_at
      ON archived_sets(updated_at DESC);
    CREATE VIRTUAL TABLE IF NOT EXISTS archive_search USING fts5(
      set_id UNINDEXED,
      search_text,
      tokenize = 'unicode61 remove_diacritics 2'
    );
    CREATE TABLE IF NOT EXISTS setscope_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  migrateJsonArchive(database, dataDirectory);
  ensureArchiveSearchIndex(database);

  const listStatement = database.prepare(`
    SELECT id, name, updated_at, track_count
    FROM archived_sets
    ORDER BY updated_at DESC, rowid DESC
    LIMIT 100
  `);
  const searchStatement = database.prepare(`
    SELECT archived_sets.id, archived_sets.name, archived_sets.updated_at, archived_sets.track_count, archived_sets.set_json
    FROM archive_search
    JOIN archived_sets ON archived_sets.id = archive_search.set_id
    WHERE archive_search MATCH ?
    ORDER BY archived_sets.updated_at DESC
    LIMIT 100
  `);
  const getStatement = database.prepare("SELECT set_json FROM archived_sets WHERE id = ?");
  const savedAtStatement = database.prepare("SELECT saved_at FROM archived_sets WHERE id = ?");
  const deleteSearchStatement = database.prepare("DELETE FROM archive_search WHERE set_id = ?");
  const insertSearchStatement = database.prepare("INSERT INTO archive_search (set_id, search_text) VALUES (?, ?)");
  const saveStatement = database.prepare(`
    INSERT INTO archived_sets (id, name, saved_at, updated_at, track_count, set_json)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      updated_at = excluded.updated_at,
      track_count = excluded.track_count,
      set_json = excluded.set_json
  `);

  async function listSets({ query = "" } = {}) {
    const search = normalizeSearchQuery(query);
    const rows = search.match
      ? searchStatement.all(search.match)
      : listStatement.all();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      updatedAt: row.updated_at,
      trackCount: Number(row.track_count) || 0,
      matches: search.terms.length ? findArchiveMatches(parseStoredSet(row.set_json), search.terms) : [],
    }));
  }

  async function saveSet(incoming) {
    const normalized = normalizeArchiveSet(incoming);
    const id = normalized.id || createId();
    const now = new Date().toISOString();
    database.exec("BEGIN IMMEDIATE");
    try {
      const savedAt = savedAtStatement.get(id)?.saved_at || now;
      const saved = {
        ...normalized,
        id,
        savedAt,
        updatedAt: now,
      };
      saveStatement.run(id, saved.name, savedAt, now, saved.tracks.length, JSON.stringify(saved));
      deleteSearchStatement.run(id);
      insertSearchStatement.run(id, buildArchiveSearchText(saved));
      database.exec("COMMIT");
      return summary(saved);
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }

  async function getSet(id) {
    const row = getStatement.get(id);
    return row ? parseStoredSet(row.set_json) : null;
  }

  return {
    close: () => {
      if (ownsDatabase) database.close();
    },
    count: () => Number(database.prepare("SELECT COUNT(*) AS count FROM archived_sets").get().count),
    getSet,
    listSets,
    saveSet,
  };
}

function ensureArchiveSearchIndex(database) {
  const version = database.prepare("SELECT value FROM setscope_meta WHERE key = 'archive_search_version'").get()?.value;
  if (version === "1") return;
  const rows = database.prepare("SELECT id, set_json FROM archived_sets").all();
  const insert = database.prepare("INSERT INTO archive_search (set_id, search_text) VALUES (?, ?)");
  database.exec("BEGIN IMMEDIATE");
  try {
    database.exec("DELETE FROM archive_search");
    for (const row of rows) insert.run(row.id, buildArchiveSearchText(parseStoredSet(row.set_json)));
    database.prepare(`
      INSERT INTO setscope_meta (key, value) VALUES ('archive_search_version', '1')
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run();
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function normalizeSearchQuery(value) {
  const terms = String(value || "")
    .normalize("NFKC")
    .match(/[\p{L}\p{N}]+/gu)
    ?.slice(0, 8)
    .map((term) => term.toLocaleLowerCase()) || [];
  return {
    terms,
    match: terms.map((term) => `"${term.replaceAll('"', '""')}"*`).join(" AND "),
  };
}

function buildArchiveSearchText(set) {
  const values = [];
  collectSearchValues(set, values, 0);
  return [...new Set(values)].join(" ").slice(0, 250_000);
}

function collectSearchValues(value, output, depth) {
  if (depth > 8 || output.length > 20_000 || value == null) return;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized) output.push(normalized);
    return;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    output.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectSearchValues(item, output, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) collectSearchValues(item, output, depth + 1);
  }
}

function findArchiveMatches(set, terms) {
  const candidates = [
    ...(set.tracks || []).map((track) => ({
      label: "Track",
      value: [track.artist, track.title].filter(Boolean).join(" - "),
      search: buildArchiveSearchText(track),
    })),
    ...(set.audioEvents || []).map((event) => ({
      label: "Practice",
      value: event.title || event.metadata?.modeId || event.type || "Saved evidence",
      search: buildArchiveSearchText(event),
    })),
    ...(set.captureLog || []).map((receipt) => ({
      label: "Signal",
      value: receipt.title || receipt.artist || receipt.outcome || receipt.provider || "Recognition receipt",
      search: buildArchiveSearchText(receipt),
    })),
  ];
  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      score: terms.reduce((total, term) => total + (candidate.search.toLocaleLowerCase().includes(term) ? 1 : 0), 0),
    }))
    .filter((candidate) => candidate.score > 0 && candidate.value)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return [{ label: "Set", value: set.name || "Set metadata" }];
  return ranked.slice(0, 2).map(({ label, value }) => ({ label, value }));
}

function migrateJsonArchive(database, dataDirectory) {
  const legacyPath = join(dataDirectory, "sets.json");
  if (!existsSync(legacyPath)) return;
  try {
    const parsed = JSON.parse(readFileSync(legacyPath, "utf8"));
    const sets = Array.isArray(parsed.sets) ? parsed.sets : [];
    const insert = database.prepare(`
      INSERT OR IGNORE INTO archived_sets (id, name, saved_at, updated_at, track_count, set_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    database.exec("BEGIN IMMEDIATE");
    for (const value of sets) {
      const normalized = normalizeArchiveSet(value);
      const id = normalized.id || createId();
      const now = new Date().toISOString();
      const saved = {
        ...normalized,
        id,
        savedAt: validTimestamp(value.savedAt) || now,
        updatedAt: validTimestamp(value.updatedAt) || validTimestamp(value.savedAt) || now,
      };
      insert.run(id, saved.name, saved.savedAt, saved.updatedAt, saved.tracks.length, JSON.stringify(saved));
    }
    database.exec("COMMIT");
    renameSync(legacyPath, `${legacyPath}.migrated`);
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
      // The failure may have happened before the transaction began.
    }
    const migrationError = new Error("archive_store_migration_failed", { cause: error });
    migrationError.code = "archive_store_migration_failed";
    throw migrationError;
  }
}

function parseStoredSet(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    const archiveError = new Error("archive_read_failed", { cause: error });
    archiveError.code = "archive_read_failed";
    throw archiveError;
  }
}

function summary(set) {
  return {
    id: set.id,
    name: set.name,
    updatedAt: set.updatedAt,
    trackCount: set.tracks?.length || 0,
  };
}

function validTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
}

function createId() {
  return `set_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export function createSetScopeDatabase(root) {
  const dataDirectory = resolveDataDirectory(root);
  mkdirSync(dataDirectory, { recursive: true });
  const database = new DatabaseSync(join(dataDirectory, "setscope.sqlite"));
  database.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  return database;
}

export function resolveDataDirectory(root, env = process.env) {
  return env.SETSCOPE_DATA_DIR ? join(env.SETSCOPE_DATA_DIR) : join(root, "data");
}

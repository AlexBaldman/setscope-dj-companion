import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { createArchiveStore } from "../server/archive-store.mjs";
import { HttpRequestError, readBinary, readJson } from "../server/json.mjs";

const validRequest = requestFrom('{"ok":true}');
assert.deepEqual(await readJson(validRequest), { ok: true });

await assert.rejects(
  readJson(requestFrom("{")),
  (error) => error instanceof HttpRequestError && error.statusCode === 400 && error.code === "invalid_json",
);

const binary = await readBinary(requestFrom("audio-bytes", { "content-type": "audio/webm" }));
assert.equal(binary.bytes.toString(), "audio-bytes");
assert.equal(binary.mimeType, "audio/webm");
await assert.rejects(
  readBinary(requestFrom("nope", { "content-type": "text/plain" })),
  (error) => error instanceof HttpRequestError && error.statusCode === 415,
);
await assert.rejects(
  readJson(requestFrom('{"large":"payload"}'), { maxBytes: 8 }),
  (error) => error instanceof HttpRequestError && error.statusCode === 413 && error.code === "payload_too_large",
);
await assert.rejects(
  readJson(requestFrom("")),
  (error) => error instanceof HttpRequestError && error.statusCode === 400 && error.code === "json_body_required",
);

const root = await mkdtemp(join(tmpdir(), "setscope-archive-test-"));
try {
  const store = createArchiveStore(root);
  await assert.rejects(store.saveSet({ name: "Missing tracks" }), (error) => error.code === "invalid_set" && error.statusCode === 422);

  const searchableSet = createSet("First archive", "first-track");
  searchableSet.tracks[0] = {
    ...searchableSet.tracks[0],
    artist: "DJ Jazzy Jeff",
    title: "Summertime Routine",
    transition: "Transformer scratch",
    tags: ["golden-era", "party-rocking"],
  };
  searchableSet.audioEvents.push({
    id: "practice-evidence",
    type: "instrument",
    title: "Pitch Gates interval drill",
    labels: ["practice"],
    metadata: { modeId: "pitch-gates" },
  });
  const [first, second] = await Promise.all([
    store.saveSet(searchableSet),
    store.saveSet(createSet("Second archive", "second-track")),
  ]);
  assert.notEqual(first.id, second.id);
  const list = await store.listSets();
  assert.equal(list.length, 2, "serialized writes should preserve concurrent saves");
  assert.equal(store.count(), 2);
  const restored = await store.getSet(first.id);
  assert.equal(restored.schema, "setscope.set-draft");
  assert.equal(restored.schemaVersion, 2);
  assert.equal(restored.tracks[0].id, "first-track");
  const artistSearch = await store.listSets({ query: "jazzy summ" });
  assert.equal(artistSearch.length, 1);
  assert.equal(artistSearch[0].id, first.id);
  assert.equal(artistSearch[0].matches[0].label, "Track");
  assert.equal((await store.listSets({ query: "golden era scratch" }))[0].id, first.id);
  assert.equal((await store.listSets({ query: "interval drill" }))[0].matches[0].label, "Practice");
  assert.equal((await store.listSets({ query: "definitely absent" })).length, 0);
  assert.equal((await store.listSets({ query: '" OR *' })).length, 0, "search syntax should be tokenized safely");

  const secondConnection = createArchiveStore(root);
  const updated = await secondConnection.saveSet({ ...createSet("Updated archive", "updated-track"), id: first.id });
  assert.equal(updated.id, first.id);
  assert.equal((await store.listSets()).length, 2, "multiple SQLite connections should not lose archived sets");
  assert.equal((await store.getSet(first.id)).name, "Updated archive");
  assert.equal((await store.listSets({ query: "Jazzy" })).length, 0, "archive updates should remove stale search terms");
  assert.equal((await store.listSets({ query: "Updated archive" }))[0].id, first.id);
  secondConnection.close();
  store.close();
} finally {
  await rm(root, { recursive: true, force: true });
}

const migrationRoot = await mkdtemp(join(tmpdir(), "setscope-archive-migration-"));
try {
  await mkdir(join(migrationRoot, "data"), { recursive: true });
  const legacyPath = join(migrationRoot, "data", "sets.json");
  await writeFile(legacyPath, JSON.stringify({
    sets: [{
      ...createSet("Legacy archive", "legacy-track"),
      id: "set_legacy_001",
      savedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    }],
  }));
  const migratedStore = createArchiveStore(migrationRoot);
  assert.equal(migratedStore.count(), 1);
  assert.equal((await migratedStore.getSet("set_legacy_001")).name, "Legacy archive");
  await access(`${legacyPath}.migrated`);
  migratedStore.close();
} finally {
  await rm(migrationRoot, { recursive: true, force: true });
}

const corruptRoot = await mkdtemp(join(tmpdir(), "setscope-archive-corrupt-"));
try {
  await mkdir(join(corruptRoot, "data"), { recursive: true });
  await writeFile(join(corruptRoot, "data", "sets.json"), "not-json");
  assert.throws(() => createArchiveStore(corruptRoot), (error) => error.code === "archive_store_migration_failed");
} finally {
  await rm(corruptRoot, { recursive: true, force: true });
}

console.log("Server boundary checks passed");

function requestFrom(body, headers = {}) {
  const request = Readable.from(body ? [Buffer.from(body)] : []);
  request.headers = body ? { "content-length": String(Buffer.byteLength(body)), ...headers } : headers;
  return request;
}

function createSet(name, trackId) {
  return {
    name,
    skin: "vinyl",
    recognitionCursor: 0,
    captureLog: [],
    audioEvents: [],
    tracks: [{ id: trackId, time: "00:00", title: name, artist: "Boundary Test" }],
  };
}

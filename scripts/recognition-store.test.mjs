import assert from "node:assert/strict";
import { mkdtemp, mkdir, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRecognitionStore } from "../server/recognition-store.mjs";

const root = await mkdtemp(join(tmpdir(), "setscope-recognition-store-"));
const requestId = "recognition_test_001";
let executions = 0;
const store = createRecognitionStore(root, { maxEntries: 2 });
const operation = async () => {
  executions += 1;
  await new Promise((resolve) => setTimeout(resolve, 10));
  return { observation: { requestId }, match: { title: "One committed result" } };
};

const [first, concurrent] = await Promise.all([
  store.execute(requestId, operation),
  store.execute(requestId, operation),
]);
assert.equal(executions, 1, "concurrent duplicate requests should share one operation");
assert.deepEqual(first.value, concurrent.value);
store.close();

const restartedStore = createRecognitionStore(root, { maxEntries: 2 });
const replay = await restartedStore.execute(requestId, async () => {
  executions += 1;
  return { match: { title: "should not run" } };
});
assert.equal(executions, 1, "committed requests should replay after store recreation");
assert.equal(replay.replayed, true);
assert.equal(replay.value.match.title, "One committed result");

let secondOwnerExecutions = 0;
const secondOwner = await restartedStore.execute(requestId, async () => {
  secondOwnerExecutions += 1;
  return { match: { title: "Independent owner result" } };
}, "owner_b");
assert.equal(secondOwner.replayed, false, "request IDs should be isolated by owner");
assert.equal(secondOwnerExecutions, 1);

await restartedStore.execute("recognition_test_002", async () => ({ match: { title: "Two" } }));
await restartedStore.execute("recognition_test_003", async () => ({ match: { title: "Three" } }));
assert.equal(restartedStore.count(), 2, "the transaction ledger should remain bounded");
await assert.rejects(() => restartedStore.execute("bad id", operation), /invalid_request_id/);
restartedStore.close();

const migrationRoot = await mkdtemp(join(tmpdir(), "setscope-recognition-migration-"));
await mkdir(join(migrationRoot, "data"), { recursive: true });
const legacyPath = join(migrationRoot, "data", "recognition-transactions.json");
await writeFile(legacyPath, JSON.stringify({
  entries: [{
    requestId: "recognition_legacy_001",
    committedAt: "2026-01-01T00:00:00.000Z",
    value: { match: { title: "Migrated replay" } },
  }],
}));
const migratedStore = createRecognitionStore(migrationRoot);
const migrated = await migratedStore.execute("recognition_legacy_001", async () => ({ match: { title: "should not run" } }));
assert.equal(migrated.replayed, true);
assert.equal(migrated.value.match.title, "Migrated replay");
migratedStore.close();
await rename(`${legacyPath}.migrated`, legacyPath);

console.log("Recognition store checks passed");

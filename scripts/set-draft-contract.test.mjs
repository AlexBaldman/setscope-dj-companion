import assert from "node:assert/strict";
import {
  SET_DRAFT_SCHEMA,
  SET_DRAFT_VERSION,
  migrateSetDraft,
  serializeSetDraft,
  validateSetDraft,
} from "../src/contracts/set-draft.js";

const legacy = {
  skin: "sampler",
  recognitionCursor: 4,
  query: "temporary search",
  reviewOnly: true,
  signalFilter: "analysis",
  archiveList: [{ id: "server-cache" }],
  tracks: [{ id: "track-1", title: "Legacy Groove", tags: ["heater"] }],
  captureLog: [{ title: "Legacy Groove" }],
  audioEvents: [{ id: "event-1", type: "analysis" }],
};
const untouched = structuredClone(legacy);
const migrated = migrateSetDraft(legacy);

assert.deepEqual(legacy, untouched, "migration must not mutate legacy input");
assert.equal(migrated.schema, SET_DRAFT_SCHEMA);
assert.equal(migrated.schemaVersion, SET_DRAFT_VERSION);
assert.equal(migrated.skin, "sampler");
assert.equal(migrated.recognitionSessionId, "");
assert.equal(migrated.recognitionStartedAt, "");
assert.deepEqual(migrated.practiceMissions, []);
assert.equal(migrated.tracks[0].title, "Legacy Groove");
assert.equal("query" in migrated, false);
assert.equal("reviewOnly" in migrated, false);
assert.equal("signalFilter" in migrated, false);
assert.equal("archiveList" in migrated, false);
assert.equal(validateSetDraft(migrated).ok, true);
assert.equal(validateSetDraft({ tracks: [] }).ok, false);

const serialized = serializeSetDraft({ ...migrated, query: "do not save", archiveList: [1] });
assert.equal("query" in serialized, false);
assert.equal("archiveList" in serialized, false);
assert.notEqual(serialized.tracks, migrated.tracks);

console.log("SetDraft contract checks passed");

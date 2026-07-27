import assert from "node:assert/strict";
import {
  ROOM_SYSTEM_VERSION,
  roomManifest,
  validateRoomManifest,
} from "../src/room-system.js";

assert.equal(ROOM_SYSTEM_VERSION, 1);
assert.equal(validateRoomManifest(roomManifest).valid, true);
assert.deepEqual(
  Object.keys(roomManifest),
  ["set", "pitch", "scope", "beat", "dig", "midi", "journal"],
);
assert.equal(new Set(Object.values(roomManifest).map((room) => room.material)).size, 7);
assert(Object.values(roomManifest).every((room) => room.background.startsWith("./assets/world/")));
assert.equal(new Set(Object.values(roomManifest).map((room) => room.background)).size, 3);

console.log("Room system checks passed");

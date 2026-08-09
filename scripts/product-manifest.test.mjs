import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import {
  getProductSurface,
  labSurfaces,
  playerSurfaces,
  practiceSurfaces,
  PRODUCT_MANIFEST_VERSION,
  productSurfaces,
  publicPageFiles,
} from "../src/product-manifest.js";
import { buildPracticeHref } from "../src/practice-context.js";
import { roomManifest } from "../src/room-system.js";
import { createPracticeMission, modeLabel } from "../src/session-spine.js";

assert.equal(PRODUCT_MANIFEST_VERSION, 2);
assert.equal(productSurfaces.length, 8);
assert.equal(new Set(productSurfaces.map(({ id }) => id)).size, productSurfaces.length);
assert.equal(new Set(productSurfaces.map(({ file }) => file)).size, productSurfaces.length);
assert.equal(new Set(productSurfaces.map(({ route }) => route)).size, productSurfaces.length);
assert.deepEqual(publicPageFiles, productSurfaces.map(({ file }) => file));
assert.deepEqual(playerSurfaces.map(({ id }) => id), [
  "setscope",
  "beat-school",
  "pitch-gates",
  "rhythm-roulette",
  "audio-lab",
]);
assert.deepEqual(labSurfaces.map(({ id }) => id), [
  "midi-playground",
  "journal",
  "style-lab",
]);
assert(productSurfaces.every(({ navigationGroup }) => ["player", "labs"].includes(navigationGroup)));
assert(productSurfaces.every(({ room }) => roomManifest[room]));
assert(productSurfaces.every(({ experience }) => experience.world === "The Music Block"));
assert(productSurfaces.every(({ experience }) => experience.code && experience.place && experience.lens));
assert(productSurfaces.every(({ experience }) => experience.verbs.length === 3));
await Promise.all(publicPageFiles.map((file) => access(file)));

const track = { id: "track-manifest", time: "00:10", title: "Manifest Groove" };
assert.deepEqual(
  practiceSurfaces.map(({ id }) => id).sort(),
  ["audio-lab", "beat-school", "pitch-gates", "rhythm-roulette"],
);
for (const surface of practiceSurfaces) {
  const mission = createPracticeMission({
    id: `mission-${surface.id}`,
    modeId: surface.id,
    track,
  });
  assert.equal(mission.modeId, surface.id);
  assert.equal(modeLabel(surface.id), surface.label);
  assert(buildPracticeHref(surface.id, track).startsWith(`${surface.href}?`));
}

assert.equal(getProductSurface("missing"), null);
console.log("Product manifest checks passed");

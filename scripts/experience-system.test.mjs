import assert from "node:assert/strict";
import {
  EXPERIENCE_SYSTEM_VERSION,
  createExperienceProjection,
  renderExperienceStrip,
  validateExperienceManifest,
} from "../src/experience-system.js";
import { productSurfaces } from "../src/product-manifest.js";

assert.equal(EXPERIENCE_SYSTEM_VERSION, 1);
assert.equal(validateExperienceManifest(productSurfaces).valid, true);
assert.equal(new Set(productSurfaces.map(({ experience }) => experience.code)).size, productSurfaces.length);
assert(productSurfaces.every(({ experience }) => experience.verbs.length === 3));

const pitchSurface = productSurfaces.find(({ id }) => id === "pitch-gates");
const projection = createExperienceProjection(pitchSurface);
assert.equal(projection.place, "Vocal Arcade");
assert.equal(projection.material, "painted-cabinet");
assert.equal(projection.motion, "gate-pulse");
assert.match(renderExperienceStrip(projection), /You are here \/ The Music Block/);
assert.match(renderExperienceStrip(projection), /Center/);
assert.match(renderExperienceStrip(projection), /PITCH-03/);

const invalid = productSurfaces.map((surface, index) => index === 0
  ? { ...surface, experience: { ...surface.experience, verbs: ["Only"] } }
  : surface);
assert.equal(validateExperienceManifest(invalid).valid, false);

console.log("Experience system checks passed");

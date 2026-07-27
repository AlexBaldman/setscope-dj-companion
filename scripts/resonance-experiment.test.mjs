import assert from "node:assert/strict";
import {
  createResonanceExperiment,
  createResonanceResult,
  validateResonanceExperiment,
  validateResonanceResult,
} from "../src/contracts/resonance-experiment.js";

const plate = createResonanceExperiment({
  experimentId: "plate-1",
  medium: "granular-on-plate",
  geometry: { shape: "square", widthM: 0.3, heightM: 0.3, thicknessM: 0.0015 },
  material: { name: "aluminum", densityKgM3: 2700, youngsModulusPa: 69e9, poissonRatio: 0.33 },
  excitation: { frequencyHz: 440, amplitude: 0.25, amplitudeUnit: "g", durationMs: 5000 },
  requestedOutputs: ["mode-shape", "nodal-lines", "particle-density"],
});
assert.equal(validateResonanceExperiment(plate).valid, true);
assert.equal(plate.medium, "granular-on-plate");
assert.equal(plate.material.densityKgM3, 2700);

const fluid = createResonanceExperiment({
  experimentId: "fluid-1",
  medium: "fluid-surface",
  geometry: { shape: "circle", widthM: 0.2, heightM: 0.2, depthM: 0.008 },
  material: { name: "water", densityKgM3: 998, viscosityPaS: 0.001, surfaceTensionNM: 0.072 },
  boundary: { support: "vertical-container-drive" },
  excitation: { frequencyHz: 80, amplitude: 0.2, amplitudeUnit: "g" },
});
assert.equal(validateResonanceExperiment(fluid).valid, true);
assert.equal(fluid.geometry.depthM, 0.008);

const simulated = createResonanceResult({
  resultId: "result-1",
  experimentId: plate.experimentId,
  source: "simulated",
  model: { name: "thin-plate-eigenmode", version: "1", assumptions: ["linear response"] },
  resonancesHz: [421.2, 447.8],
  observedFrequencyHz: 440,
  confidence: 1.4,
  artifacts: [{ kind: "field", uri: "local://mode-1", mediaType: "application/x-setscope-field" }],
});
assert.equal(validateResonanceResult(simulated).valid, true);
assert.equal(simulated.confidence, 1);

const unlabeledSimulation = createResonanceResult({ experimentId: "plate-1", source: "simulated" });
assert.equal(validateResonanceResult(unlabeledSimulation).valid, false);
assert.equal(validateResonanceExperiment(createResonanceExperiment({ excitation: { frequencyHz: 0 } })).valid, false);

console.log("Resonance experiment contract checks passed");

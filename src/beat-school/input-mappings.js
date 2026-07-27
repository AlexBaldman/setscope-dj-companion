import { createInputMapping, normalizeInputMappings } from "../contracts/input-timing.js";
import { BEAT_SCHOOL_LANES } from "./challenge.js";

const ACTION_LANES = Object.freeze({
  kick: "kick",
  snare: "snare",
  hat: "hat",
  "closed-hat": "hat",
  clap: "clap",
});

export function createBeatSchoolMappings(customMappings = []) {
  return [
    ...normalizeInputMappings(customMappings).map(toBeatSchoolMapping).filter(Boolean),
    ...createDefaultBeatSchoolMappings(),
  ];
}

export function createDefaultBeatSchoolMappings() {
  const mappings = [];
  for (const lane of BEAT_SCHOOL_LANES) {
    for (const sourceKind of ["touch", "keyboard", "demo"]) {
      mappings.push(createInputMapping({
        mappingId: `${sourceKind}-${lane.id}`,
        action: `beat-pad:${lane.id}`,
        sourceScope: "any",
        observation: { sourceKind, message: { type: "pad-trigger", control: lane.id } },
        createdAt: "built-in",
      }));
    }
  }
  const midiNotes = { kick: 36, snare: 38, hat: 42, clap: 39 };
  for (const [lane, note] of Object.entries(midiNotes)) {
    mappings.push(createInputMapping({
      mappingId: `midi-${lane}`,
      action: `beat-pad:${lane}`,
      sourceScope: "any",
      observation: { sourceKind: "midi", message: { type: "note-on", note } },
      createdAt: "built-in",
    }));
  }
  return mappings;
}

function toBeatSchoolMapping(mapping) {
  const explicitLane = mapping.action.startsWith("beat-pad:") ? mapping.action.slice(9) : "";
  const lane = explicitLane || ACTION_LANES[mapping.action];
  if (!BEAT_SCHOOL_LANES.some(({ id }) => id === lane)) return null;
  return { ...mapping, action: `beat-pad:${lane}` };
}

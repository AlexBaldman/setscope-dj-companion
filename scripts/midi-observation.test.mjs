import assert from "node:assert/strict";
import {
  MIDI_OBSERVATION_SCHEMA,
  createControlObservation,
  parseMidiMessage,
  validateMidiObservation,
} from "../src/contracts/midi-observation.js";

const noteOn = parseMidiMessage([0x90, 60, 127], {
  observationId: "note-on",
  sessionId: "session-1",
  sourceId: "nanoKEY",
  timestampMs: 12.5,
});
assert.equal(noteOn.schema, MIDI_OBSERVATION_SCHEMA);
assert.deepEqual(noteOn.message, { type: "note-on", channel: 1, note: 60, velocity: 1 });
assert.equal(noteOn.provenance, "performed");
assert.equal(validateMidiObservation(noteOn).valid, true);

const velocityZero = parseMidiMessage([0x92, 48, 0], { observationId: "note-off" });
assert.equal(velocityZero.message.type, "note-off");
assert.equal(velocityZero.message.channel, 3);

const controlChange = parseMidiMessage([0xb0, 74, 64], { observationId: "cc" });
assert.equal(controlChange.message.type, "control-change");
assert.equal(controlChange.message.controller, 74);
assert.equal(controlChange.message.value, 0.504);

const centeredBend = parseMidiMessage([0xe0, 0, 64], { observationId: "bend" });
assert.equal(centeredBend.message.value, 0);
assert.equal(parseMidiMessage([0xf8], { observationId: "clock" }).message.type, "clock");

const gamepad = createControlObservation({
  observationId: "gamepad-1",
  sourceId: "gamepad-0",
  sourceKind: "gamepad",
  protocol: "gamepad",
  timestampMs: 20,
  message: { type: "gamepad-control", control: "button-0", value: 1 },
});
assert.equal(validateMidiObservation(gamepad).valid, true);
assert.equal(gamepad.provenance, "performed");

const invalid = validateMidiObservation({ schema: "wrong", timestampMs: Number.NaN });
assert.equal(invalid.valid, false);
assert(invalid.errors.length >= 4);

console.log("MIDI observation contract checks passed");

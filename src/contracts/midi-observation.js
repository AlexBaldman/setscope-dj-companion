export const MIDI_OBSERVATION_SCHEMA = "setscope.midi-observation";
export const MIDI_OBSERVATION_VERSION = 1;

export function parseMidiMessage(data, {
  observationId = "midi_observation",
  sessionId = "",
  sourceId = "midi-input",
  timestampMs = 0,
} = {}) {
  const bytes = [...(data || [])].map((value) => Number(value) & 0xff);
  if (!bytes.length) return null;
  const status = bytes[0];
  const typeNibble = status >> 4;
  const channel = (status & 0x0f) + 1;
  let message;
  if (status >= 0xf0) {
    message = systemMessage(status);
  } else if (typeNibble === 0x8 || (typeNibble === 0x9 && bytes[2] === 0)) {
    message = { type: "note-off", channel, note: bytes[1] || 0, velocity: normalize7(bytes[2]) };
  } else if (typeNibble === 0x9) {
    message = { type: "note-on", channel, note: bytes[1] || 0, velocity: normalize7(bytes[2]) };
  } else if (typeNibble === 0xa) {
    message = { type: "poly-pressure", channel, note: bytes[1] || 0, pressure: normalize7(bytes[2]) };
  } else if (typeNibble === 0xb) {
    message = { type: "control-change", channel, controller: bytes[1] || 0, value: normalize7(bytes[2]) };
  } else if (typeNibble === 0xc) {
    message = { type: "program-change", channel, program: bytes[1] || 0 };
  } else if (typeNibble === 0xd) {
    message = { type: "channel-pressure", channel, pressure: normalize7(bytes[1]) };
  } else if (typeNibble === 0xe) {
    const raw = (bytes[2] || 0) * 128 + (bytes[1] || 0);
    message = { type: "pitch-bend", channel, value: Math.max(-1, Math.min(1, (raw - 8192) / 8192)) };
  } else {
    message = { type: "unknown", channel, bytes };
  }
  return createMidiObservation({ observationId, sessionId, sourceId, timestampMs, message, bytes });
}

export function createControlObservation({
  observationId,
  sessionId = "",
  sourceId,
  sourceKind,
  protocol,
  timestampMs,
  message,
  bytes = [],
} = {}) {
  return createMidiObservation({
    observationId,
    sessionId,
    sourceId,
    sourceKind,
    protocol,
    timestampMs,
    message,
    bytes,
  });
}

export function validateMidiObservation(observation) {
  const errors = [];
  if (observation?.schema !== MIDI_OBSERVATION_SCHEMA) errors.push("invalid schema");
  if (observation?.schemaVersion !== MIDI_OBSERVATION_VERSION) errors.push("invalid schemaVersion");
  if (!observation?.observationId) errors.push("observationId required");
  if (!observation?.sourceId) errors.push("sourceId required");
  if (!["midi", "gamepad", "hid", "demo"].includes(observation?.sourceKind)) errors.push("invalid sourceKind");
  if (!Number.isFinite(observation?.timestampMs)) errors.push("timestampMs must be finite");
  if (!observation?.message?.type) errors.push("message type required");
  return { valid: errors.length === 0, errors };
}

function createMidiObservation({
  observationId,
  sessionId,
  sourceId,
  sourceKind = "midi",
  protocol = "midi-1",
  timestampMs,
  message,
  bytes,
}) {
  return {
    schema: MIDI_OBSERVATION_SCHEMA,
    schemaVersion: MIDI_OBSERVATION_VERSION,
    observationId: String(observationId || "midi_observation"),
    sessionId: String(sessionId || ""),
    sourceId: String(sourceId || "unknown-input"),
    sourceKind,
    protocol,
    timestampMs: Number(timestampMs) || 0,
    message,
    bytes,
    provenance: sourceKind === "demo" ? "generated" : "performed",
  };
}

function systemMessage(status) {
  const names = {
    0xf8: "clock",
    0xfa: "transport-start",
    0xfb: "transport-continue",
    0xfc: "transport-stop",
    0xfe: "active-sense",
    0xff: "reset",
  };
  return { type: names[status] || "system" };
}

function normalize7(value) {
  return Math.round(Math.max(0, Math.min(127, Number(value) || 0)) / 127 * 1000) / 1000;
}

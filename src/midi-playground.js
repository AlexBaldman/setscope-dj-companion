import { createControlObservation, parseMidiMessage } from "./contracts/midi-observation.js";
import {
  createInputMapping,
  createLatencyProfile,
  normalizeInputMappings,
} from "./contracts/input-timing.js";
import { createMusicalClock, createSemanticInputSpine } from "./input-spine.js";

const MAPPING_KEY = "setscope-input-mappings-v1";
const LEGACY_MAPPING_KEY = "setscope-midi-mappings-v1";
const LATENCY_KEY = "setscope-latency-profile-v1";
const sessionId = `midi_${Date.now().toString(36)}`;
const els = Object.fromEntries([
  "clockPosition",
  "connectHidBtn", "connectMidiBtn", "demoMidiBtn", "deviceSlots", "eventCount", "gestureMeter",
  "inputLatencyControl", "inputLatencyValue",
  "gestureType", "gestureValue", "inputCount", "lastEvent", "learnBtn", "learnStatus",
  "mappingAction", "mappingCount", "mappingList", "midiEventLog", "midiStatus", "padField",
  "outputLatencyControl", "outputLatencyValue",
  "portList", "portStatus", "protocolStatus", "resetClockBtn", "scanGamepadBtn", "semanticAction",
  "stopMidiBtn", "benchFound", "tempoControl", "timingConfidence",
].map((id) => [id, document.querySelector(`#${id}`)]));

const clock = createMusicalClock({ bpm: 94, originTimeMs: performance.now() });
let eventCount = 0;
let observationCursor = 0;
let midiAccess = null;
let demoTimers = [];
let gamepadTimer = null;
let learnArmed = false;
let mappings = readMappings();
let latencyProfile = readLatencyProfile();
const inputSpine = createSemanticInputSpine({
  sessionId,
  clock,
  mappings,
  latencyProfiles: [latencyProfile],
});
const ports = new Map();
const observations = [];
const seenGamepadValues = new Map();

els.demoMidiBtn.addEventListener("click", runDemo);
els.connectMidiBtn.addEventListener("click", connectMidi);
els.scanGamepadBtn.addEventListener("click", scanGamepads);
els.connectHidBtn.addEventListener("click", connectHid);
els.stopMidiBtn.addEventListener("click", stopAll);
els.learnBtn.addEventListener("click", toggleLearn);
els.tempoControl.addEventListener("change", updateTempo);
els.inputLatencyControl.addEventListener("input", updateLatencyProfile);
els.outputLatencyControl.addEventListener("input", updateLatencyProfile);
els.resetClockBtn.addEventListener("click", restartClock);
renderMappings();
renderCapabilities();
renderTimingControls();
renderClockPosition(clock.positionAt(performance.now()));

async function connectMidi() {
  if (!navigator.requestMIDIAccess) {
    setStatus("MIDI unavailable");
    return;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    bindMidiPorts();
    midiAccess.onstatechange = bindMidiPorts;
    setStatus("MIDI connected", true);
  } catch {
    setStatus("MIDI denied");
  }
}

function bindMidiPorts() {
  ports.clear();
  midiAccess?.inputs.forEach((input) => {
    input.onmidimessage = (event) => {
      const observation = parseMidiMessage(event.data, {
        observationId: nextId(),
        sessionId,
        sourceId: input.id,
        timestampMs: event.timeStamp,
      });
      if (observation) receiveObservation(observation, input.name || "MIDI input");
    };
    ports.set(input.id, { id: input.id, kind: "MIDI", name: input.name || "MIDI input", state: input.state });
  });
  renderPorts();
}

function runDemo() {
  stopDemo();
  clock.restart(performance.now());
  const sequence = [
    [0x90, 60, 42], [0x90, 64, 96], [0xb0, 1, 78], [0xe0, 0, 80],
    [0x80, 60, 0], [0x99, 36, 118], [0x99, 38, 92], [0xfa],
  ];
  sequence.forEach((bytes, index) => {
    demoTimers.push(window.setTimeout(() => {
      const observation = parseMidiMessage(bytes, {
        observationId: nextId(),
        sessionId,
        sourceId: "setscope-demo",
        timestampMs: performance.now(),
      });
      observation.sourceKind = "demo";
      observation.provenance = "generated";
      receiveObservation(observation, "SetScope Demo");
    }, index * 190));
  });
  ports.set("setscope-demo", { id: "setscope-demo", kind: "DEMO", name: "SetScope Demo", state: "connected" });
  renderPorts();
  setStatus("Demo running", true);
}

function scanGamepads() {
  const gamepads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
  gamepads.forEach((pad) => {
    const id = `gamepad-${pad.index}`;
    ports.set(id, { id, kind: "GAMEPAD", name: pad.id || id, state: pad.connected ? "connected" : "offline" });
  });
  renderPorts();
  if (!gamepadTimer) gamepadTimer = window.setInterval(pollGamepads, 50);
  setStatus(gamepads.length ? "Gamepad found" : "Gamepad scan on", Boolean(gamepads.length));
}

function pollGamepads() {
  [...(navigator.getGamepads?.() || [])].filter(Boolean).forEach((pad) => {
    pad.buttons.forEach((button, index) => emitChangedGamepad(pad, `button-${index}`, button.value));
    pad.axes.forEach((value, index) => emitChangedGamepad(pad, `axis-${index}`, value));
  });
}

function emitChangedGamepad(pad, control, value) {
  const key = `${pad.index}:${control}`;
  const previous = seenGamepadValues.get(key);
  if (previous !== undefined && Math.abs(previous - value) < 0.04) return;
  seenGamepadValues.set(key, value);
  if (previous === undefined && Math.abs(value) < 0.04) return;
  receiveObservation(createControlObservation({
    observationId: nextId(),
    sessionId,
    sourceId: `gamepad-${pad.index}`,
    sourceKind: "gamepad",
    protocol: "gamepad",
    timestampMs: performance.now(),
    message: { type: "gamepad-control", control, value },
  }), pad.id || "Gamepad");
}

async function connectHid() {
  if (!navigator.hid?.requestDevice) {
    setStatus("HID unavailable");
    return;
  }
  try {
    const devices = await navigator.hid.requestDevice({ filters: [] });
    for (const device of devices) {
      if (!device.opened) await device.open();
      const id = `hid-${device.vendorId}-${device.productId}`;
      ports.set(id, { id, kind: "HID", name: device.productName || "HID controller", state: "connected" });
      device.addEventListener("inputreport", (event) => {
        const bytes = [...new Uint8Array(event.data.buffer)];
        receiveObservation(createControlObservation({
          observationId: nextId(),
          sessionId,
          sourceId: id,
          sourceKind: "hid",
          protocol: "hid-report",
          timestampMs: performance.now(),
          bytes,
          message: { type: "hid-report", reportId: event.reportId, values: bytes.slice(0, 12) },
        }), device.productName || "HID controller");
      });
    }
    renderPorts();
    setStatus(devices.length ? "HID connected" : "No HID chosen", Boolean(devices.length));
  } catch {
    setStatus("HID cancelled");
  }
}

function receiveObservation(observation, sourceName) {
  eventCount += 1;
  let actionReceipt = null;
  if (learnArmed) saveMapping(observation);
  else actionReceipt = inputSpine.receive(observation, { receivedAtMs: performance.now() });
  observations.unshift({ ...observation, sourceName, actionReceipt });
  observations.splice(24);
  renderObservation(observation);
  if (actionReceipt) renderSemanticAction(actionReceipt);
  else renderClockPosition(clock.positionAt(observation.timestampMs));
  renderEventLog();
}

function renderObservation(observation) {
  const message = observation.message;
  els.eventCount.textContent = eventCount;
  els.lastEvent.textContent = shortType(message.type);
  els.gestureType.textContent = message.type.replaceAll("-", " ").toUpperCase();
  els.gestureValue.textContent = describeMessage(message);
  els.protocolStatus.textContent = observation.protocol.toUpperCase();
  const value = gestureStrength(message);
  els.gestureMeter.style.width = `${Math.round(value * 100)}%`;
  const pads = [...els.padField.children];
  pads.forEach((pad) => pad.classList.remove("active"));
  const note = Number(message.note);
  if (Number.isFinite(note)) pads[((note % 16) + 16) % 16]?.classList.add("active");
}

function renderEventLog() {
  els.midiEventLog.innerHTML = observations.map((item) => `
    <div class="midi-event">
      <b>${escapeHtml(shortType(item.message.type))}</b>
      <span>${escapeHtml(describeMessage(item.message))}</span>
      <small>${escapeHtml(item.sourceName)} / ${escapeHtml(item.protocol)}</small>
      ${item.actionReceipt ? `<em>${escapeHtml(item.actionReceipt.action)} / ${escapeHtml(formatPosition(item.actionReceipt.position))}</em>` : ""}
    </div>
  `).join("");
}

function renderPorts() {
  const list = [...ports.values()];
  els.inputCount.textContent = list.length;
  els.portStatus.textContent = list.length ? `${list.length} active` : "No ports";
  els.portList.innerHTML = list.length ? list.map((port) => `
    <div class="port-item"><i data-kind="${port.kind}"></i><span><strong>${escapeHtml(port.name)}</strong><small>${port.kind} / ${port.state}</small></span></div>
  `).join("") : "<p>No hardware seen yet.</p>";
  markBench(list);
}

function markBench(list) {
  let found = 0;
  const names = list.map((item) => item.name.toLowerCase());
  const matches = {
    morph: names.some((name) => name.includes("sensel") || name.includes("morph")),
    nanokey: names.some((name) => name.includes("nanokey")),
    studio: names.some((name) => name.includes("maschine studio")),
    jam: names.some((name) => name.includes("maschine jam")),
    djhero: names.some((name) => name.includes("dj hero") || name.includes("turntable")),
  };
  els.deviceSlots.querySelectorAll("[data-device-family]").forEach((slot) => {
    const connected = matches[slot.dataset.deviceFamily];
    slot.dataset.state = connected ? "found" : "waiting";
    slot.querySelector("span").textContent = connected ? "Found" : slot.dataset.deviceFamily === "djhero" ? "Probe" : "Waiting";
    if (connected) found += 1;
  });
  els.benchFound.textContent = `${found} found`;
}

function toggleLearn() {
  learnArmed = !learnArmed;
  els.learnBtn.setAttribute("aria-pressed", String(learnArmed));
  els.learnBtn.textContent = learnArmed ? "Move a control..." : "Arm next gesture";
  els.learnStatus.textContent = learnArmed ? "ARMED" : "OFF";
}

function saveMapping(observation) {
  learnArmed = false;
  const mapping = createInputMapping({
    mappingId: `${sessionId}_mapping_${Date.now().toString(36)}`,
    action: els.mappingAction.value,
    observation,
  });
  mappings = mappings.filter((candidate) => !(
    candidate.action === mapping.action
    && candidate.sourceId === mapping.sourceId
    && JSON.stringify(candidate.gesture) === JSON.stringify(mapping.gesture)
  ));
  mappings.unshift(mapping);
  mappings = mappings.slice(0, 24);
  localStorage.setItem(MAPPING_KEY, JSON.stringify(mappings));
  inputSpine.setMappings(mappings);
  renderMappings();
  els.learnBtn.setAttribute("aria-pressed", "false");
  els.learnBtn.textContent = "Arm next gesture";
  els.learnStatus.textContent = "SAVED";
}

function renderMappings() {
  els.mappingCount.textContent = `${mappings.length} map${mappings.length === 1 ? "" : "s"}`;
  els.mappingList.innerHTML = mappings.length ? mappings.map((mapping) => `
    <div><strong>${escapeHtml(mapping.action.replaceAll("-", " "))}</strong><span>${escapeHtml(describeGesture(mapping.gesture))} / ${escapeHtml(mapping.sourceId)}</span></div>
  `).join("") : "<p>No mappings saved.</p>";
}

function updateTempo() {
  const bpm = Math.max(30, Math.min(300, Number(els.tempoControl.value) || 94));
  els.tempoControl.value = bpm;
  clock.setTempo(bpm, performance.now());
  renderClockPosition(clock.positionAt(performance.now()));
}

function updateLatencyProfile() {
  latencyProfile = createLatencyProfile({
    profileId: "latency_manual_default",
    sourceId: "*",
    inputLatencyMs: Number(els.inputLatencyControl.value),
    outputLatencyMs: Number(els.outputLatencyControl.value),
    confidence: 0.25,
    method: "manual",
  });
  localStorage.setItem(LATENCY_KEY, JSON.stringify(latencyProfile));
  inputSpine.setLatencyProfiles([latencyProfile]);
  renderTimingControls();
}

function restartClock() {
  clock.restart(performance.now());
  els.semanticAction.textContent = "CLOCK RESTARTED";
  renderClockPosition(clock.positionAt(performance.now()));
}

function renderTimingControls() {
  els.inputLatencyControl.value = latencyProfile.inputLatencyMs;
  els.outputLatencyControl.value = latencyProfile.outputLatencyMs;
  els.inputLatencyValue.textContent = `${latencyProfile.inputLatencyMs} ms`;
  els.outputLatencyValue.textContent = `${latencyProfile.outputLatencyMs} ms`;
  els.timingConfidence.textContent = latencyProfile.confidence ? `${latencyProfile.method} ${Math.round(latencyProfile.confidence * 100)}%` : "UNCALIBRATED";
}

function renderSemanticAction(receipt) {
  els.semanticAction.textContent = `${receipt.action.replaceAll("-", " ").toUpperCase()} / ${Math.round(receipt.intensity * 100)}%`;
  renderClockPosition(receipt.position);
  els.learnStatus.textContent = "FIRED";
}

function renderClockPosition(position) {
  els.clockPosition.textContent = formatPosition(position);
}

function renderCapabilities() {
  els.connectMidiBtn.disabled = !navigator.requestMIDIAccess;
  els.connectHidBtn.disabled = !navigator.hid?.requestDevice;
  els.scanGamepadBtn.disabled = !navigator.getGamepads;
}

function stopAll() {
  stopDemo();
  if (gamepadTimer) window.clearInterval(gamepadTimer);
  gamepadTimer = null;
  midiAccess?.inputs.forEach((input) => { input.onmidimessage = null; });
  setStatus("Bench stopped");
}

function stopDemo() {
  demoTimers.forEach(window.clearTimeout);
  demoTimers = [];
}

function setStatus(text, active = false) {
  els.midiStatus.textContent = text.toUpperCase();
  els.midiStatus.classList.toggle("active", active);
}

function nextId() {
  observationCursor += 1;
  return `${sessionId}_${observationCursor}`;
}

function gestureStrength(message) {
  if (Number.isFinite(message.velocity)) return message.velocity;
  if (Number.isFinite(message.pressure)) return message.pressure;
  if (Number.isFinite(message.value)) return Math.abs(message.value);
  return 0.72;
}

function describeMessage(message) {
  if (message.note !== undefined) return `Note ${message.note} / ch ${message.channel} / ${Math.round((message.velocity || message.pressure || 0) * 100)}%`;
  if (message.controller !== undefined) return `CC ${message.controller} / ch ${message.channel} / ${Math.round(message.value * 100)}%`;
  if (message.control) return `${message.control} / ${Number(message.value).toFixed(2)}`;
  if (message.values) return `Report ${message.reportId} / ${message.values.slice(0, 6).join(" ")}`;
  if (message.value !== undefined) return `Ch ${message.channel} / ${Number(message.value).toFixed(2)}`;
  return message.type.replaceAll("-", " ");
}

function shortType(type) {
  return String(type || "event").replace("control-change", "CC").replace("transport-", "").toUpperCase();
}

function readMappings() {
  try {
    const current = localStorage.getItem(MAPPING_KEY);
    const legacy = localStorage.getItem(LEGACY_MAPPING_KEY);
    const value = normalizeInputMappings(JSON.parse(current || legacy || "[]"));
    if (!current && value.length) localStorage.setItem(MAPPING_KEY, JSON.stringify(value));
    return value;
  } catch {
    return [];
  }
}

function readLatencyProfile() {
  try {
    return createLatencyProfile(JSON.parse(localStorage.getItem(LATENCY_KEY) || "{}"));
  } catch {
    return createLatencyProfile({ profileId: "latency_default", sourceId: "*", confidence: 0 });
  }
}

function describeGesture(gesture = {}) {
  if (gesture.note !== undefined) return `${shortType(gesture.type)} ${gesture.note}`;
  if (gesture.controller !== undefined) return `CC ${gesture.controller}`;
  if (gesture.control) return gesture.control;
  if (gesture.reportId !== undefined) return `HID ${gesture.reportId}`;
  return shortType(gesture.type);
}

function formatPosition(position = {}) {
  return `BAR ${position.bar || 1} / BEAT ${position.beat || 1} / STEP ${position.step || 1}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
}

window.addEventListener("gamepadconnected", scanGamepads);
window.addEventListener("beforeunload", stopAll);

import { createControlObservation, parseMidiMessage } from "./contracts/midi-observation.js";

const MAPPING_KEY = "setscope-midi-mappings-v1";
const sessionId = `midi_${Date.now().toString(36)}`;
const els = Object.fromEntries([
  "connectHidBtn", "connectMidiBtn", "demoMidiBtn", "deviceSlots", "eventCount", "gestureMeter",
  "gestureType", "gestureValue", "inputCount", "lastEvent", "learnBtn", "learnStatus",
  "mappingAction", "mappingCount", "mappingList", "midiEventLog", "midiStatus", "padField",
  "portList", "portStatus", "protocolStatus", "scanGamepadBtn", "stopMidiBtn", "benchFound",
].map((id) => [id, document.querySelector(`#${id}`)]));

let eventCount = 0;
let observationCursor = 0;
let midiAccess = null;
let demoTimers = [];
let gamepadTimer = null;
let learnArmed = false;
let mappings = readMappings();
const ports = new Map();
const observations = [];
const seenGamepadValues = new Map();

els.demoMidiBtn.addEventListener("click", runDemo);
els.connectMidiBtn.addEventListener("click", connectMidi);
els.scanGamepadBtn.addEventListener("click", scanGamepads);
els.connectHidBtn.addEventListener("click", connectHid);
els.stopMidiBtn.addEventListener("click", stopAll);
els.learnBtn.addEventListener("click", toggleLearn);
renderMappings();
renderCapabilities();

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
  observations.unshift({ ...observation, sourceName });
  observations.splice(24);
  renderObservation(observation);
  renderEventLog();
  if (learnArmed) saveMapping(observation);
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
  mappings.unshift({
    action: els.mappingAction.value,
    sourceId: observation.sourceId,
    message: observation.message,
  });
  mappings = mappings.slice(0, 24);
  localStorage.setItem(MAPPING_KEY, JSON.stringify(mappings));
  renderMappings();
  els.learnBtn.setAttribute("aria-pressed", "false");
  els.learnBtn.textContent = "Arm next gesture";
  els.learnStatus.textContent = "SAVED";
}

function renderMappings() {
  els.mappingCount.textContent = `${mappings.length} map${mappings.length === 1 ? "" : "s"}`;
  els.mappingList.innerHTML = mappings.length ? mappings.map((mapping) => `
    <div><strong>${escapeHtml(mapping.action.replaceAll("-", " "))}</strong><span>${escapeHtml(shortType(mapping.message.type))} / ${escapeHtml(mapping.sourceId)}</span></div>
  `).join("") : "<p>No mappings saved.</p>";
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
    const value = JSON.parse(localStorage.getItem(MAPPING_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
}

window.addEventListener("gamepadconnected", scanGamepads);
window.addEventListener("beforeunload", stopAll);

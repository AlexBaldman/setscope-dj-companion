export const ROOM_SYSTEM_VERSION = 1;

export const roomManifest = Object.freeze({
  set: room("Listening Station", "black-lacquer", "meter-lock", "#f4aa3e", "#6fddb1", "music-block.png"),
  pitch: room("Vocal Arcade", "painted-cabinet", "gate-pulse", "#60c7ff", "#ed6382", "vocal-arcade.png"),
  scope: room("Signal Bench", "phosphor-glass", "trace-lock", "#7ef7ae", "#60c7ff", "signal-workshop.png"),
  beat: room("Beat Basement", "rubber-pads", "pad-impact", "#ffb23f", "#ff5f89", "music-block.png"),
  dig: room("Record Shop", "printed-crates", "sticker-stamp", "#f4aa3e", "#6fddb1", "music-block.png"),
  midi: room("Controller Workshop", "patch-metal", "cable-signal", "#60c7ff", "#6fddb1", "signal-workshop.png"),
  journal: room("Field Notebook", "paper-binding", "page-turn", "#e4a447", "#6fddb1", "music-block.png"),
});

export function validateRoomManifest(manifest = roomManifest) {
  const errors = [];
  for (const [id, entry] of Object.entries(manifest)) {
    if (!entry.label) errors.push(`${id}: label required`);
    if (!entry.material) errors.push(`${id}: material required`);
    if (!entry.motion) errors.push(`${id}: motion required`);
    if (!validColor(entry.accent)) errors.push(`${id}: invalid accent`);
    if (!validColor(entry.secondary)) errors.push(`${id}: invalid secondary`);
  }
  return { valid: errors.length === 0, errors };
}

export function applyRoomSystem(root = globalThis.document) {
  const host = root?.querySelector?.("[data-room]");
  if (!host) return null;
  const definition = roomManifest[host.dataset.room];
  if (!definition) return null;
  host.dataset.material = definition.material;
  host.dataset.motion = definition.motion;
  host.style.setProperty("--room-accent", definition.accent);
  host.style.setProperty("--room-accent-secondary", definition.secondary);
  return { id: host.dataset.room, ...definition };
}

export function cueRoomMotion(cue = "impact", root = globalThis.document, durationMs = 320) {
  const host = root?.querySelector?.("[data-room]");
  if (!host) return;
  host.dataset.roomCue = cue;
  globalThis.setTimeout?.(() => {
    if (host.dataset.roomCue === cue) delete host.dataset.roomCue;
  }, durationMs);
}

function room(label, material, motion, accent, secondary, background) {
  return Object.freeze({
    label,
    material,
    motion,
    accent,
    secondary,
    background: `./assets/world/${background}`,
  });
}

function validColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value || "");
}

import { getProductSurface, productSurfaces } from "./product-manifest.js";
import { roomManifest } from "./room-system.js";

export const EXPERIENCE_SYSTEM_VERSION = 1;

export function validateExperienceManifest(surfaces = productSurfaces) {
  const errors = [];
  const codes = new Set();
  for (const surface of surfaces) {
    const identity = surface.experience;
    if (!identity?.world) errors.push(`${surface.id}: world required`);
    if (!identity?.place) errors.push(`${surface.id}: place required`);
    if (!identity?.lens) errors.push(`${surface.id}: lens required`);
    if (!identity?.tagline) errors.push(`${surface.id}: tagline required`);
    if (!/^[A-Z]+-\d{2}$/.test(identity?.code || "")) errors.push(`${surface.id}: invalid station code`);
    if (codes.has(identity?.code)) errors.push(`${surface.id}: duplicate station code`);
    codes.add(identity?.code);
    if (identity?.verbs?.length !== 3 || identity.verbs.some((verb) => !verb)) {
      errors.push(`${surface.id}: three route verbs required`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function createExperienceProjection(surface, room = roomManifest[surface?.room]) {
  if (!surface?.experience || !room) return null;
  return Object.freeze({
    surfaceId: surface.id,
    roomId: surface.room,
    ...surface.experience,
    material: room.material,
    motion: room.motion,
  });
}

export function renderExperienceStrip(projection) {
  if (!projection) return "";
  const verbs = projection.verbs
    .map((verb, index) => `<span${index === 0 ? ' data-route-origin=""' : ""}>${escapeHtml(verb)}</span>`)
    .join('<i aria-hidden="true"></i>');
  return `
    <div class="experience-place">
      <span>You are here / ${escapeHtml(projection.world)}</span>
      <strong>${escapeHtml(projection.place)}</strong>
    </div>
    <div class="experience-route" aria-label="Room route: ${escapeHtml(projection.verbs.join(", "))}">
      ${verbs}
    </div>
    <div class="experience-transmission">
      <span>${escapeHtml(projection.lens)}</span>
      <strong>${escapeHtml(projection.code)}</strong>
    </div>
    <p>${escapeHtml(projection.tagline)}</p>
    <div class="experience-stamp" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
  `;
}

export function mountExperienceStrip(root = globalThis.document) {
  const host = root?.querySelector?.("[data-room]");
  const header = host?.querySelector?.(":scope > .app-header");
  if (!host || !header) return null;
  const currentId = host.querySelector?.("[data-current-tool]")?.dataset.currentTool;
  const surface = getProductSurface(currentId);
  const projection = createExperienceProjection(surface);
  if (!projection) return null;

  let strip = host.querySelector?.(":scope > [data-experience-strip]");
  if (!strip) {
    strip = root.createElement("section");
    strip.className = "experience-strip";
    strip.dataset.experienceStrip = "";
    header.insertAdjacentElement("afterend", strip);
  }
  strip.setAttribute("aria-label", `${projection.place} identity`);
  strip.dataset.station = projection.code;
  strip.innerHTML = renderExperienceStrip(projection);
  return projection;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

import {
  labSurfaces,
  playerSurfaces,
  productSurfaces,
} from "./product-manifest.js";

export const tools = productSurfaces;

export function renderToolRack(container = document.querySelector("[data-tool-rack]"), currentId = container?.dataset.currentTool) {
  if (!container) return;
  const labsActive = labSurfaces.some(({ id }) => id === currentId);
  container.innerHTML = `
    ${playerSurfaces.map((tool) => renderToolLink(tool, currentId)).join("")}
    <details class="tool-labs" ${labsActive ? "open" : ""}>
      <summary class="tool-labs-summary ${labsActive ? "active" : ""}">
        <span>Labs</span>
        <strong>Workshop</strong>
      </summary>
      <div class="tool-labs-items">
        ${labSurfaces.map((tool) => renderToolLink(tool, currentId)).join("")}
      </div>
    </details>
  `;
  requestAnimationFrame(() => {
    const active = container.querySelector('[aria-current="page"]')
      || container.querySelector(".tool-labs-summary.active");
    active?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
  });
}

function contextualToolHref(tool, currentId) {
  if (currentId === "setscope" || !tool.practiceCapable) return tool.href;
  const trackId = new URLSearchParams(window.location.search).get("track");
  if (!trackId) return tool.href;
  const params = new URLSearchParams({ track: trackId });
  return `${tool.href}?${params.toString()}`;
}

function renderToolLink(tool, currentId) {
  const active = tool.id === currentId;
  return `
    <a class="tool-rack-item ${active ? "active" : ""}" href="${contextualToolHref(tool, currentId)}" ${active ? 'aria-current="page"' : ""}>
      <span>${tool.shortLabel}</span>
      <strong>${tool.category}</strong>
    </a>
  `;
}

document.querySelectorAll("[data-tool-rack]").forEach((container) => {
  renderToolRack(container, container.dataset.currentTool);
});

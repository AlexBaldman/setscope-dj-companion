import { productSurfaces } from "./product-manifest.js";

export const tools = productSurfaces;

export function renderToolRack(container = document.querySelector("[data-tool-rack]"), currentId = container?.dataset.currentTool) {
  if (!container) return;
  container.innerHTML = tools
    .map((tool) => {
      const active = tool.id === currentId;
      const href = contextualToolHref(tool, currentId);
      return `
        <a class="tool-rack-item ${active ? "active" : ""}" href="${href}" aria-current="${active ? "page" : "false"}">
          <span>${tool.shortLabel}</span>
          <strong>${tool.category}</strong>
        </a>
      `;
    })
    .join("");
}

function contextualToolHref(tool, currentId) {
  if (currentId === "setscope" || tool.id === "journal") return tool.href;
  const trackId = new URLSearchParams(window.location.search).get("track");
  if (!trackId) return tool.href;
  const params = new URLSearchParams({ track: trackId });
  return `${tool.href}?${params.toString()}`;
}

document.querySelectorAll("[data-tool-rack]").forEach((container) => {
  renderToolRack(container, container.dataset.currentTool);
});

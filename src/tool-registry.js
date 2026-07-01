export const tools = [
  {
    id: "setscope",
    label: "SetScope",
    shortLabel: "Set",
    href: "./index.html",
    category: "Companion",
    status: "MVP",
  },
  {
    id: "pitch-gates",
    label: "Pitch Gates",
    shortLabel: "Arcade",
    href: "./pitch-gates.html",
    category: "Ear Game",
    status: "Playable",
  },
  {
    id: "audio-lab",
    label: "Audio Lab",
    shortLabel: "Lab",
    href: "./audio-lab.html",
    category: "Bench Tool",
    status: "Live",
  },
  {
    id: "rhythm-roulette",
    label: "Rhythm Roulette",
    shortLabel: "Dig",
    href: "./rhythm-roulette.html",
    category: "Beat Game",
    status: "Playable",
  },
  {
    id: "journal",
    label: "Dev Journal",
    shortLabel: "Journal",
    href: "./journal.html",
    category: "Docs",
    status: "Editable",
  },
];

export function renderToolRack(container = document.querySelector("[data-tool-rack]"), currentId = container?.dataset.currentTool) {
  if (!container) return;
  container.innerHTML = tools
    .map((tool) => {
      const active = tool.id === currentId;
      return `
        <a class="tool-rack-item ${active ? "active" : ""}" href="${tool.href}" aria-current="${active ? "page" : "false"}">
          <span>${tool.shortLabel}</span>
          <strong>${tool.category}</strong>
        </a>
      `;
    })
    .join("");
}

document.querySelectorAll("[data-tool-rack]").forEach((container) => {
  renderToolRack(container, container.dataset.currentTool);
});

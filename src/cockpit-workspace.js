export const COCKPIT_WORKSPACES = ["signal", "timeline", "intel"];
const STORAGE_KEY = "setscope-cockpit-workspace";

export function normalizeCockpitWorkspace(value, fallback = "timeline") {
  return COCKPIT_WORKSPACES.includes(value) ? value : fallback;
}

export function createCockpitWorkspace({
  root = document.body,
  buttons = document.querySelectorAll("[data-cockpit-workspace]"),
  panels = document.querySelectorAll("[data-workspace-panel]"),
  nav = document.querySelector("#cockpitWorkspaceNav"),
  storage = globalThis.localStorage,
  media = globalThis.matchMedia?.("(max-width: 959px)"),
} = {}) {
  let current = normalizeCockpitWorkspace(readStoredWorkspace(storage));

  function isNarrow() {
    return Boolean(media?.matches);
  }

  function select(workspace, { store = true, reveal = false } = {}) {
    current = normalizeCockpitWorkspace(workspace, current);
    root.dataset.cockpitWorkspace = current;
    buttons.forEach((button) => {
      const active = button.dataset.cockpitWorkspace === current;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.setAttribute("aria-hidden", String(isNarrow() && panel.dataset.workspacePanel !== current));
    });
    if (store) writeStoredWorkspace(storage, current);
    if (reveal && isNarrow()) nav?.scrollIntoView?.({ block: "start", behavior: "auto" });
    return current;
  }

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => select(button.dataset.cockpitWorkspace, { reveal: true }));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      const nextButton = buttons[nextIndex];
      select(nextButton.dataset.cockpitWorkspace, { reveal: true });
      nextButton.focus?.();
    });
  });
  media?.addEventListener?.("change", () => select(current, { store: false }));
  select(current, { store: false });

  return {
    get current() {
      return current;
    },
    isNarrow,
    select,
  };
}

export function mountResponsiveDisclosures({
  elements = document.querySelectorAll("[data-responsive-disclosure]"),
  storage = globalThis.localStorage,
  media = globalThis.matchMedia?.("(max-width: 959px)"),
  storageKey = "setscope-signal-disclosures",
} = {}) {
  let openIds = readOpenIds(storage, storageKey);

  function apply() {
    elements.forEach((element) => {
      element.open = media?.matches ? openIds.has(element.id) : true;
    });
  }

  elements.forEach((element) => {
    element.addEventListener("toggle", () => {
      if (!media?.matches) return;
      if (element.open) openIds.add(element.id);
      else openIds.delete(element.id);
      writeOpenIds(storage, storageKey, openIds);
    });
  });
  media?.addEventListener?.("change", apply);
  apply();

  return { apply };
}

function readStoredWorkspace(storage) {
  try {
    return storage?.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeStoredWorkspace(storage, workspace) {
  try {
    storage?.setItem(STORAGE_KEY, workspace);
  } catch {
    // Workspace choice is optional UI state.
  }
}

function readOpenIds(storage, key) {
  try {
    const value = JSON.parse(storage?.getItem(key) || "[]");
    return new Set(Array.isArray(value) ? value.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

function writeOpenIds(storage, key, ids) {
  try {
    storage?.setItem(key, JSON.stringify([...ids]));
  } catch {
    // Disclosure preferences are optional UI state.
  }
}

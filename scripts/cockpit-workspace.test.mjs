import assert from "node:assert/strict";
import { createCockpitWorkspace, normalizeCockpitWorkspace } from "../src/cockpit-workspace.js";

assert.equal(normalizeCockpitWorkspace("intel"), "intel");
assert.equal(normalizeCockpitWorkspace("missing"), "timeline");

const storageValues = new Map([["setscope-cockpit-workspace", "signal"]]);
const storage = {
  getItem(key) { return storageValues.get(key) || null; },
  setItem(key, value) { storageValues.set(key, value); },
};
const root = { dataset: {} };
const buttons = ["signal", "timeline", "intel"].map(createButton);
const panels = ["signal", "timeline", "intel"].map(createPanel);
let revealCount = 0;
const nav = { scrollIntoView() { revealCount += 1; } };
const media = { matches: true, addEventListener() {} };
const workspace = createCockpitWorkspace({ root, buttons, panels, nav, storage, media });

assert.equal(workspace.current, "signal");
assert.equal(root.dataset.cockpitWorkspace, "signal");
assert.equal(panels[0].attributes.get("aria-hidden"), "false");
assert.equal(panels[1].attributes.get("aria-hidden"), "true");

workspace.select("intel", { reveal: true });
assert.equal(workspace.current, "intel");
assert.equal(storageValues.get("setscope-cockpit-workspace"), "intel");
assert.equal(buttons[2].attributes.get("aria-selected"), "true");
assert.equal(buttons[2].tabIndex, 0);
assert.equal(revealCount, 1);

media.matches = false;
workspace.select("timeline");
assert(panels.every((panel) => panel.attributes.get("aria-hidden") === "false"));
workspace.select("intel", { reveal: true });
assert.equal(revealCount, 1, "desktop workspace changes should not force scrolling");

let prevented = false;
buttons[2].listeners.keydown({ key: "ArrowRight", preventDefault() { prevented = true; } });
assert.equal(workspace.current, "signal");
assert.equal(buttons[0].focused, true);
assert.equal(prevented, true);

console.log("Cockpit workspace checks passed");

function createButton(workspace) {
  return createElement({ cockpitWorkspace: workspace });
}

function createPanel(workspace) {
  return createElement({ workspacePanel: workspace });
}

function createElement(dataset) {
  const classes = new Set();
  const attributes = new Map();
  return {
    dataset,
    attributes,
    tabIndex: 0,
    focused: false,
    listeners: {},
    classList: { toggle(name, active) { active ? classes.add(name) : classes.delete(name); } },
    addEventListener(name, listener) { this.listeners[name] = listener; },
    focus() { this.focused = true; },
    setAttribute(name, value) { attributes.set(name, value); },
  };
}

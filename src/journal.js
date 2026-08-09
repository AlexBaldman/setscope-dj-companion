import { getJournal, saveJournal } from "./api.js";

const MINIMUM_TITLE_SIZE = 10;

const state = {
  markdown: "",
  entries: [],
  index: 0,
  paper: "notebook",
};

const els = {
  body: document.body,
  entryList: document.querySelector("#entryList"),
  entryTitle: document.querySelector("#entryTitle"),
  entryBody: document.querySelector("#entryBody"),
  markdownSource: document.querySelector("#markdownSource"),
  sourcePanel: document.querySelector("#sourcePanel"),
  saveStatus: document.querySelector("#saveStatus"),
  page: document.querySelector("#page"),
  pageNumber: document.querySelector("#pageNumber"),
  paperButtons: document.querySelectorAll("[data-paper]"),
};

if (window.matchMedia("(max-width: 520px)").matches) els.sourcePanel.open = false;

function parseJournal(markdown) {
  const lines = markdown.split("\n");
  const title = lines[0]?.startsWith("# ") ? lines[0] : "# SetScope Dev Journal";
  const entries = [];
  let current = null;

  lines.slice(1).forEach((line) => {
    if (line.startsWith("## ")) {
      if (current) entries.push(current);
      current = { title: line.replace(/^## /, "").trim(), body: [] };
      return;
    }
    if (current) current.body.push(line);
  });
  if (current) entries.push(current);

  return {
    title,
    entries: entries.map((entry) => ({
      title: entry.title,
      body: entry.body.join("\n").trim(),
    })),
  };
}

function serializeJournal() {
  const body = state.entries
    .map((entry) => `## ${entry.title.trim() || "Untitled Entry"}\n\n${entry.body.trim()}`)
    .join("\n\n");
  return `# SetScope Dev Journal\n\n${body}\n`;
}

async function loadJournal() {
  try {
    const payload = await getJournal();
    state.markdown = payload.markdown;
    const parsed = parseJournal(payload.markdown);
    state.entries = parsed.entries;
    state.index = Math.min(state.index, Math.max(0, state.entries.length - 1));
    render();
    setStatus("Loaded");
  } catch {
    setStatus("API unavailable");
  }
}

function render() {
  renderEntryList();
  renderPage();
  state.markdown = serializeJournal();
  els.markdownSource.value = state.markdown;
}

function renderEntryList() {
  els.entryList.innerHTML = state.entries
    .map(
      (entry, index) => `
        <button class="entry-card ${index === state.index ? "active" : ""}" data-index="${index}">
          <strong>${escapeHtml(entry.title)}</strong>
          <span>${escapeHtml(entry.body.split("\n").find(Boolean) || "No notes yet")}</span>
        </button>
      `,
    )
    .join("");
  els.entryList.querySelectorAll("[data-index]").forEach((button) => {
    button.addEventListener("click", () => turnTo(Number(button.dataset.index)));
  });
}

function renderPage() {
  const entry = state.entries[state.index] || { title: "No entries", body: "" };
  els.pageNumber.textContent = `Page ${state.index + 1} / ${Math.max(1, state.entries.length)}`;
  els.entryTitle.value = entry.title;
  els.entryBody.value = entry.body;
  fitEntryTitle();
}

function fitEntryTitle() {
  const maximum = window.innerWidth <= 520 ? 28 : window.innerWidth <= 880 ? 38 : 54;
  let size = maximum;
  els.entryTitle.style.fontSize = `${size}px`;
  while (els.entryTitle.scrollWidth > els.entryTitle.clientWidth + 1 && size > MINIMUM_TITLE_SIZE) {
    size -= 1;
    els.entryTitle.style.fontSize = `${size}px`;
  }
}

function commitCurrentEntry() {
  const entry = state.entries[state.index];
  if (!entry) return;
  entry.title = els.entryTitle.value;
  entry.body = els.entryBody.value;
  state.markdown = serializeJournal();
  els.markdownSource.value = state.markdown;
  renderEntryList();
}

function turnTo(index) {
  commitCurrentEntry();
  state.index = Math.max(0, Math.min(index, state.entries.length - 1));
  els.page.classList.add("turning");
  window.setTimeout(() => {
    renderPage();
    renderEntryList();
    els.page.classList.remove("turning");
  }, 170);
}

function moveEntry(direction) {
  commitCurrentEntry();
  const nextIndex = state.index + direction;
  if (nextIndex < 0 || nextIndex >= state.entries.length) return;
  const [entry] = state.entries.splice(state.index, 1);
  state.entries.splice(nextIndex, 0, entry);
  state.index = nextIndex;
  render();
  setStatus("Reordered");
}

async function save() {
  commitCurrentEntry();
  try {
    await saveJournal(state.markdown);
    setStatus("Saved");
  } catch {
    setStatus("Save failed");
  }
}

function applySourceEdit() {
  const parsed = parseJournal(els.markdownSource.value);
  state.entries = parsed.entries;
  state.index = Math.min(state.index, Math.max(0, state.entries.length - 1));
  render();
  setStatus("Source edited");
}

function setPaper(paper) {
  state.paper = paper;
  els.body.dataset.paper = paper;
  els.paperButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.paper === paper);
  });
}

function setStatus(text) {
  els.saveStatus.textContent = text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.querySelector("#prevBtn").addEventListener("click", () => turnTo(state.index - 1));
document.querySelector("#nextBtn").addEventListener("click", () => turnTo(state.index + 1));
document.querySelector("#saveBtn").addEventListener("click", save);
document.querySelector("#refreshBtn").addEventListener("click", loadJournal);
document.querySelector("#moveUpBtn").addEventListener("click", () => moveEntry(-1));
document.querySelector("#moveDownBtn").addEventListener("click", () => moveEntry(1));
els.entryTitle.addEventListener("input", () => {
  fitEntryTitle();
  commitCurrentEntry();
});
els.entryBody.addEventListener("input", commitCurrentEntry);
els.markdownSource.addEventListener("change", applySourceEdit);
els.paperButtons.forEach((button) => {
  button.addEventListener("click", () => setPaper(button.dataset.paper));
});
window.addEventListener("resize", fitEntryTitle);

loadJournal();

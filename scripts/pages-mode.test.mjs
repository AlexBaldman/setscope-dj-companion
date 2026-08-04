import assert from "node:assert/strict";

const values = new Map();
globalThis.window = { location: { hostname: "alexbaldman.github.io" } };
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  removeItem: (key) => values.delete(key),
  setItem: (key, value) => values.set(key, String(value)),
};
globalThis.fetch = async (url) => {
  if (String(url).endsWith("/runtime-config.json")) {
    return new Response(JSON.stringify({ schemaVersion: 1, apiBaseUrl: "" }), { status: 200 });
  }
  assert(String(url).endsWith("/docs/DEV_JOURNAL.md"));
  return new Response("# SetScope Dev Journal\n\n## Published\n\nStatic journal fixture.\n", { status: 200 });
};

const {
  getApiHealth,
  getJournal,
  isStaticDeployment,
  listSets,
  loadSet,
  saveJournal,
  saveSet,
} = await import("../src/api.js");

assert.equal(isStaticDeployment(), true);
assert.equal((await getApiHealth()).provider, "setscope-static");

const saved = await saveSet({
  name: "Pages crate",
  tracks: [{
    id: "pages-track",
    title: "Golden Era Search",
    artist: "Browser Local",
    tags: ["scratch"],
  }],
  audioEvents: [{
    id: "pages-practice",
    type: "instrument",
    title: "Interval drill",
    labels: ["practice"],
  }],
});
assert.equal(saved.set.trackCount, 1);
assert.equal((await loadSet(saved.set.id)).set.name, "Pages crate");

const trackSearch = await listSets("golden scratch");
assert.equal(trackSearch.sets.length, 1);
assert.equal(trackSearch.sets[0].matches[0].label, "Track");
const practiceSearch = await listSets("interval");
assert.equal(practiceSearch.sets[0].matches[0].label, "Practice");
assert.equal((await listSets("absent phrase")).sets.length, 0);

assert.match((await getJournal()).markdown, /Static journal fixture/);
await saveJournal("# SetScope Dev Journal\n\n## Edited\n\nSaved in this browser.\n");
assert.match((await getJournal()).markdown, /Saved in this browser/);

console.log("GitHub Pages mode checks passed");

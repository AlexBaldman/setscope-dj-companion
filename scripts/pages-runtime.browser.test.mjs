import assert from "node:assert/strict";
import { createServer } from "node:http";
import { join } from "node:path";
import { chromium } from "playwright";
import { serveStatic } from "../server/static.mjs";
import { productSurfaces } from "../src/product-manifest.js";

const root = join(process.cwd(), "dist");
const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  await serveStatic(root, url, response);
});
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const port = server.address().port;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const problems = [];
page.on("console", (message) => {
  if (message.type() === "error") problems.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => problems.push(`page: ${error.message}`));
page.on("response", (response) => {
  if (response.status() >= 400) problems.push(`HTTP ${response.status()}: ${response.url()}`);
});

try {
  for (const surface of productSurfaces) {
    const response = await page.goto(
      `http://127.0.0.1:${port}${surface.route}?static-demo=1`,
      { waitUntil: "networkidle" },
    );
    assert.equal(response?.status(), 200, `${surface.id} should load from the Pages artifact`);
    assert.equal(
      await page.locator("[data-tool-rack] .tool-rack-item").count(),
      productSurfaces.length,
      `${surface.id} should render the complete shared tool rack`,
    );
    assert.deepEqual(
      await page.locator("img").evaluateAll((images) => images
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.src)),
      [],
      `${surface.id} should load every image asset`,
    );
  }

  await page.goto(`http://127.0.0.1:${port}/?static-demo=1`, { waitUntil: "networkidle" });
  await page.locator("#apiStatus").waitFor();
  assert.equal((await page.locator("#apiStatus").textContent())?.trim(), "Demo");
  assert.equal((await page.locator("#nowTitle").textContent())?.trim(), "Listening for first track");
  assert.equal(await page.getByText("Palm Trees At Noon", { exact: true }).count(), 0, "story fixtures should require explicit demo activation");
  await page.locator("#demoBtn").click();
  await page.waitForFunction(() => {
    const draft = JSON.parse(localStorage.getItem("setscope-draft-v1") || "{}");
    return draft.tracks?.some((track) => track.title === "Palm Trees At Noon");
  });

  await page.locator("#archiveBtn").click();
  await page.waitForFunction(() => document.querySelector("#toast")?.textContent === "Set archived");
  assert.equal(await page.locator("#archiveList [data-set-id]").count(), 1);
  await page.locator("#archiveSearch").fill("Palm Trees");
  await page.waitForFunction(() => document.querySelector("#archiveCount")?.textContent === "1 found");
  assert.match((await page.locator(".archive-match-strip").textContent()) || "", /Palm Trees At Noon/);

  await page.goto(`http://127.0.0.1:${port}${getRoute("journal")}?static-demo=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#saveStatus")?.textContent === "Loaded");
  assert((await page.locator("#entryList .entry-card").count()) > 5);

  await page.goto(`http://127.0.0.1:${port}${getRoute("midi-playground")}?static-demo=1`, { waitUntil: "networkidle" });
  await page.locator("#demoMidiBtn").click();
  await page.waitForFunction(() => Number(document.querySelector("#eventCount")?.textContent) >= 4);
  assert.equal(await page.locator("#padField > i").count(), 16);
  assert((await page.locator("#midiEventLog .midi-event").count()) >= 4);
  assert.equal(await page.locator("#clockPosition").count(), 1);
  assert.deepEqual(problems, []);
  console.log("GitHub Pages browser checks passed");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

function getRoute(id) {
  const route = productSurfaces.find((surface) => surface.id === id)?.route;
  if (!route) throw new Error(`unknown_product_surface:${id}`);
  return route;
}

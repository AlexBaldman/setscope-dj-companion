import assert from "node:assert/strict";
import { createServer } from "node:http";
import { join } from "node:path";
import { chromium } from "playwright";
import { serveStatic } from "../server/static.mjs";

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

try {
  await page.goto(`http://127.0.0.1:${port}/?static-demo=1`, { waitUntil: "networkidle" });
  await page.locator("#apiStatus").waitFor();
  assert.equal((await page.locator("#apiStatus").textContent())?.trim(), "Demo");

  await page.locator("#archiveBtn").click();
  await page.waitForFunction(() => document.querySelector("#toast")?.textContent === "Set archived");
  assert.equal(await page.locator("#archiveList [data-set-id]").count(), 1);
  await page.locator("#archiveSearch").fill("Palm Trees");
  await page.waitForFunction(() => document.querySelector("#archiveCount")?.textContent === "1 found");
  assert.match((await page.locator(".archive-match-strip").textContent()) || "", /Palm Trees At Noon/);

  await page.goto(`http://127.0.0.1:${port}/journal.html?static-demo=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#saveStatus")?.textContent === "Loaded");
  assert((await page.locator("#entryList .entry-card").count()) > 5);
  assert.deepEqual(problems, []);
  console.log("GitHub Pages browser checks passed");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

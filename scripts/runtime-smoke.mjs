import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const artifactDir = process.env.RUNTIME_ARTIFACT_DIR || (await mkdtemp(join(tmpdir(), "setscope-runtime-")));
const desktopViewport = { width: 1440, height: 1100 };
const mobileViewport = { width: 390, height: 844 };
const failures = [];

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (error) {
  throw new Error(`Playwright could not launch Chromium. Run "npx playwright install chromium" if this is a fresh machine. ${error.message}`);
}

try {
  await runDesktopFlow();
  await runMobileOverflowPass();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Runtime smoke failed. Artifacts: ${artifactDir}`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Runtime smoke passed. Artifacts: ${artifactDir}`);

async function runDesktopFlow() {
  const context = await browser.newContext({ viewport: desktopViewport });
  const page = await context.newPage();
  const logs = captureRuntimeProblems(page, "desktop");
  await verifySetScope(page);
  await verifyRhythmRoulette(page);
  await verifyPitchGates(page);
  await verifyAudioLab(page);
  await verifyJournal(page);
  collectRuntimeProblems(logs);
  await context.close();
}

async function runMobileOverflowPass() {
  const context = await browser.newContext({ viewport: mobileViewport });
  const page = await context.newPage();
  const logs = captureRuntimeProblems(page, "mobile");
  const routes = [
    ["setscope-mobile", "/"],
    ["roulette-mobile", "/rhythm-roulette.html"],
    ["pitch-gates-mobile", "/pitch-gates.html"],
    ["audio-lab-mobile", "/audio-lab.html"],
    ["journal-mobile", "/journal.html"],
  ];
  for (const [label, path] of routes) {
    await goto(page, path);
    await auditPage(page, label);
  }
  collectRuntimeProblems(logs);
  await context.close();
}

async function verifySetScope(page) {
  await goto(page, "/");
  await expectVisible(page, "#djMentorPanel", "SetScope DJ Mentor panel");
  await expectVisible(page, "#setCoachPanel", "SetScope coach panel");
  await page.locator("#mentorActionList [data-coach-action=\"mentor-note\"]").click();
  await expectText(page, "#toast", "Mentor note saved", "mentor note toast");
  await auditPage(page, "setscope-desktop");
}

async function verifyRhythmRoulette(page) {
  await goto(page, "/rhythm-roulette.html");
  await expectVisible(page, "#rouletteSceneCanvas", "Rhythm Roulette scene canvas");
  await page.locator("#blindDigBtn").click();
  await expectCount(page, ".record-card", 3, "Rhythm Roulette mystery pulls");
  await expectCount(page, ".sample-pad:not(.empty)", 12, "Rhythm Roulette sample pads");
  await expectCount(page, ".step-cell", 64, "Rhythm Roulette beat grid");
  await page.locator("#surpriseBeatBtn").click();
  await page.locator("#saveRouletteBtn").click();
  await expectText(page, "#rouletteStatus", "RUN SAVED", "Rhythm Roulette save status");
  const savedEvent = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("setscope-draft-v1") || "{}").audioEvents?.some((event) => event.metadata?.modeId === "rhythm-roulette"),
  );
  assert(savedEvent, "Rhythm Roulette should persist a learning event");
  await auditPage(page, "roulette-desktop");
}

async function verifyPitchGates(page) {
  await goto(page, "/pitch-gates.html");
  await expectVisible(page, "#pitchGameCanvas", "Pitch Gates canvas");
  await page.locator("#startRoundBtn").click();
  const overlayHidden = await page.locator("#readyOverlay").evaluate((node) => node.classList.contains("hidden"));
  assert(overlayHidden, "Pitch Gates should hide ready overlay after starting a round");
  await auditPage(page, "pitch-gates-desktop");
}

async function verifyAudioLab(page) {
  await goto(page, "/audio-lab.html");
  await expectVisible(page, "#scopeCanvas", "Audio Lab scope canvas");
  await page.locator("#freezeScopeBtn").click();
  await page.locator("#triggerScopeBtn").click();
  await expectText(page, "#sourceLabel", "NONE", "Audio Lab initial source label");
  await auditPage(page, "audio-lab-desktop");
}

async function verifyJournal(page) {
  await goto(page, "/journal.html");
  await expectVisible(page, "#page", "Journal page");
  await page.locator("[data-paper=\"graph\"]").click();
  const paper = await page.locator("body").getAttribute("data-paper");
  assert(paper === "graph", "Journal should switch to graph paper");
  await auditPage(page, "journal-desktop");
}

async function goto(page, path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
}

async function auditPage(page, label) {
  await page.screenshot({ fullPage: true, path: join(artifactDir, `${label}.png`) });
  const result = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const brokenImages = [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.currentSrc || image.src);
    return {
      brokenImages,
      duplicateIds: [...new Set(duplicateIds)],
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      title: document.title,
    };
  });
  assert(!result.overflowX, `${label} should not have horizontal overflow`);
  assert(result.duplicateIds.length === 0, `${label} should not have duplicate ids: ${result.duplicateIds.join(", ")}`);
  assert(result.brokenImages.length === 0, `${label} should not have broken images: ${result.brokenImages.join(", ")}`);
}

async function expectVisible(page, selector, label) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: "visible", timeout: 5000 });
  assert((await locator.count()) > 0, `${label} should exist`);
}

async function expectText(page, selector, text, label) {
  await page.locator(selector).waitFor({ state: "visible", timeout: 5000 });
  const content = (await page.locator(selector).textContent()) || "";
  assert(content.includes(text), `${label} should include "${text}", saw "${content}"`);
}

async function expectCount(page, selector, expected, label) {
  const count = await page.locator(selector).count();
  assert(count === expected, `${label} expected ${expected}, saw ${count}`);
}

function captureRuntimeProblems(page, label) {
  const problems = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      problems.push(`${label} console ${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    problems.push(`${label} page error: ${error.message}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      problems.push(`${label} HTTP ${response.status()}: ${response.url()}`);
    }
  });
  return problems;
}

function collectRuntimeProblems(problems) {
  failures.push(...problems);
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
